import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import * as schema from "./schema.ts";
const { Pool } = pg;
if (!global._postgresPoolsMap) {
  global._postgresPoolsMap = /* @__PURE__ */ new Map();
}
function resolveDatabaseConfig(overrideDb) {
  const instanceName = process.env.INSTANCE_CONNECTION_NAME || "centered-repeater-4x4wp:us-east1:ai-studio-482bfc36";
  let rawHost = process.env.SQL_HOST || "";
  const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
  const socketCandidates = [
    `/cloudsql/${instanceName}`,
    // Standard Google Cloud Run volume
    `/app/cloudsql/${instanceName}`,
    // AI Studio container mount
    rawHost,
    rawHost.replace("/app/cloudsql/", "/cloudsql/"),
    rawHost.replace("/cloudsql/", "/app/cloudsql/")
  ].filter(Boolean);
  let resolvedHost = "";
  let isUnixSocket = false;
  for (const candidate of socketCandidates) {
    if (candidate.startsWith("/")) {
      try {
        if (fs.existsSync(candidate)) {
          resolvedHost = candidate;
          isUnixSocket = true;
          break;
        }
      } catch (e) {
      }
    }
  }
  if (!resolvedHost) {
    if (rawHost && !rawHost.startsWith("/") && !rawHost.includes(":")) {
      resolvedHost = rawHost;
      isUnixSocket = false;
    } else {
      resolvedHost = `/cloudsql/${instanceName}`;
      isUnixSocket = true;
    }
  }
  const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || "ai_studio_app_user";
  const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;
  const database = overrideDb || process.env.SQL_DB_NAME || "cloud_sql_production_database";
  return {
    host: resolvedHost,
    port,
    isUnixSocket,
    user,
    password,
    database,
    instanceName
  };
}
function isDatabaseSocketAvailable(targetDb) {
  const config = resolveDatabaseConfig(targetDb);
  if (config.isUnixSocket) {
    try {
      return fs.existsSync(config.host);
    } catch {
      return false;
    }
  }
  return Boolean(config.host);
}
const createPool = (targetDb) => {
  const pools = global._postgresPoolsMap;
  const config = resolveDatabaseConfig(targetDb);
  const poolKey = `${config.user}@${config.database}#${config.host}`;
  let existing = pools.get(poolKey);
  if (!existing) {
    const poolConfig = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      min: 3,
      // Mantém permanentemente no mínimo 3 conexões ativas e aquecidas no pool
      max: 30,
      // Suporte robusto a múltiplos navegadores, abas e computadores simultâneos
      connectionTimeoutMillis: 1e4,
      idleTimeoutMillis: 3e5,
      // 5 minutos antes de reciclar conexões ociosas
      maxUses: 1e4,
      keepAlive: true,
      // Ativa keepAlive TCP a nível de socket
      keepAliveInitialDelayMillis: 2e3,
      // Envia keepAlive após 2 segundos
      allowExitOnIdle: false
      // JAMAIS desliga ou sai em ociosidade - conexão sempre aberta
    };
    if (!config.isUnixSocket) {
      poolConfig.port = config.port;
    }
    existing = new Pool(poolConfig);
    existing.on("error", (err) => {
      console.warn(`[MotorDesk DB_POOL] Client socket event on ${config.database}: ${err.message} (${err.code || "NO_CODE"})`);
    });
    pools.set(poolKey, existing);
  }
  return existing;
};
let keepAliveTimer = null;
function startDatabaseKeepAlive(intervalMs = 15e3) {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(async () => {
    try {
      const config = resolveDatabaseConfig();
      if (config.isUnixSocket && !fs.existsSync(config.host)) {
        return;
      }
      const res = await executeSqlWithRetry("SELECT 1 AS heartbeat, NOW() as current_time;", [], config.database, 2);
      if (process.env.DEBUG_DB_HEARTBEAT === "true") {
        console.log(`[MotorDesk DB Heartbeat] Conex\xE3o ativa mantida aberta com sucesso: ${res.rows[0]?.current_time}`);
      }
    } catch (err) {
      if (process.env.DEBUG_DB_HEARTBEAT === "true") {
        console.warn(`[MotorDesk DB Heartbeat] Alerta de reconex\xE3o: ${err.message}. Restaurando pool...`);
      }
    }
  }, intervalMs);
  console.log(`[MotorDesk DB Heartbeat] Heartbeat configurado a cada ${intervalMs / 1e3}s.`);
}
async function warmUpDatabaseConnection(targetDb) {
  try {
    const config = resolveDatabaseConfig(targetDb);
    if (config.isUnixSocket && !fs.existsSync(config.host)) {
      console.log(`[MotorDesk DB] Socket Unix (${config.host}) n\xE3o montado. Operando em modo de alta resili\xEAncia com cache persistente.`);
      return false;
    }
    console.log(`[MotorDesk DB] Aquecendo conex\xE3o persistente com o banco ${config.database}...`);
    const pool = createPool(config.database);
    const client = await pool.connect();
    try {
      await client.query("SELECT 1 AS warm_check;");
    } finally {
      client.release();
    }
    startDatabaseKeepAlive(2e4);
    console.log(`[MotorDesk DB] Conex\xE3o persistente com ${config.database} aquecida e mantida permanentemente aberta.`);
    return true;
  } catch (err) {
    console.warn(`[MotorDesk DB] Aviso ao pr\xE9-aquecer conex\xE3o: ${err.message}`);
    return false;
  }
}
function purgePool(targetDb) {
  const pools = global._postgresPoolsMap;
  const config = resolveDatabaseConfig(targetDb);
  const poolKey = `${config.user}@${config.database}#${config.host}`;
  const existing = pools.get(poolKey);
  if (existing) {
    pools.delete(poolKey);
    existing.end().catch(() => {
    });
  }
}
const getDbInstance = (targetDb) => {
  try {
    const pool = createPool(targetDb);
    return drizzle(pool, { schema });
  } catch (err) {
    console.error("Failed to initialize Drizzle DB instance:", err);
    return null;
  }
};
function extractPgErrorDetails(err) {
  const cause = err?.cause || err;
  return {
    code: cause?.code || err?.code || "UNKNOWN_ERROR",
    message: cause?.message || err?.message || "Erro desconhecido",
    detail: cause?.detail || null,
    hint: cause?.hint || null,
    schema: cause?.schema || null,
    table: cause?.table || null,
    column: cause?.column || null,
    constraint: cause?.constraint || null,
    sqlState: cause?.code || null,
    routine: cause?.routine || null
  };
}
async function executeSqlWithRetry(queryText, params = [], targetDb, maxRetries = 5) {
  const config = resolveDatabaseConfig(targetDb);
  if (config.isUnixSocket && !fs.existsSync(config.host)) {
    const err = new Error(`Socket Unix n\xE3o encontrado em ${config.host}`);
    err.code = "ENOENT";
    throw err;
  }
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    const pool = createPool(targetDb);
    let client = null;
    try {
      client = await pool.connect();
      const res = await client.query(queryText, params);
      return res;
    } catch (err) {
      const isBrokenSocket = err?.code === "EPIPE" || err?.code === "ECONNRESET" || err?.code === "ECONNREFUSED" || err?.code === "57P01" || err?.code === "ETIMEDOUT" || String(err?.message || "").toLowerCase().includes("epipe") || String(err?.message || "").toLowerCase().includes("reset") || String(err?.message || "").toLowerCase().includes("socket") || String(err?.message || "").toLowerCase().includes("closed") || String(err?.message || "").toLowerCase().includes("connection terminated");
      if (client) {
        try {
          client.release(true);
        } catch (e) {
        }
        client = null;
      }
      if (isBrokenSocket && attempt <= maxRetries) {
        purgePool(targetDb);
        const backoff = Math.min(200 * attempt, 1500);
        console.warn(`[MotorDesk DB] Socket connection error (${err.code || err.message}), reconnecting attempt ${attempt}/${maxRetries} after ${backoff}ms...`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (e) {
        }
      }
    }
  }
  throw new Error("Max retries exceeded for SQL query");
}
const ensureAppStoreTableExists = async (targetDb) => {
  try {
    const checkRes = await executeSqlWithRetry(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_store';`,
      [],
      targetDb
    );
    if (checkRes.rows.length > 0) {
      return true;
    }
    await executeSqlWithRetry(
      `CREATE TABLE IF NOT EXISTS app_store (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );`,
      [],
      targetDb
    );
    return true;
  } catch (err) {
    console.warn("Warning checking/creating app_store table in Cloud SQL:", err.message);
    return false;
  }
};
const checkDatabaseHealth = async (targetDb) => {
  const config = resolveDatabaseConfig(targetDb);
  if (config.isUnixSocket && !fs.existsSync(config.host)) {
    return {
      connected: false,
      database: config.database,
      databaseUser: config.user,
      databaseHost: config.host,
      appStoreTable: false,
      appStoreRecord: false,
      error: {
        code: "ENOENT",
        message: `Socket Unix n\xE3o montado em ${config.host} (Modo de resili\xEAncia ativo)`
      }
    };
  }
  try {
    const result = await executeSqlWithRetry("SELECT current_database(), current_user, version();", [], config.database);
    const dbName = result.rows[0]?.current_database || config.database;
    const dbUser = result.rows[0]?.current_user || config.user;
    const tableCheck = await executeSqlWithRetry(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_store';`,
      [],
      config.database
    );
    const appStoreTableExists = tableCheck.rows.length > 0;
    let appStoreRecordExists = false;
    let appStoreDataSize = 0;
    let appStoreUpdatedAt;
    if (appStoreTableExists) {
      const recCheck = await executeSqlWithRetry(
        `SELECT id, updated_at, pg_column_size(data) as size 
         FROM app_store 
         WHERE id = 'motordesk_main';`,
        [],
        config.database
      );
      if (recCheck.rows.length > 0) {
        appStoreRecordExists = true;
        appStoreDataSize = Number(recCheck.rows[0].size || 0);
        appStoreUpdatedAt = recCheck.rows[0].updated_at?.toISOString?.() || String(recCheck.rows[0].updated_at);
      }
    }
    return {
      connected: true,
      database: dbName,
      databaseUser: dbUser,
      databaseHost: config.host,
      appStoreTable: appStoreTableExists,
      appStoreRecord: appStoreRecordExists,
      appStoreDataSize,
      appStoreUpdatedAt
    };
  } catch (err) {
    const pgErr = extractPgErrorDetails(err);
    console.error("Database health check failed:", pgErr);
    return {
      connected: false,
      database: config.database,
      databaseUser: config.user,
      databaseHost: config.host,
      appStoreTable: false,
      appStoreRecord: false,
      error: pgErr
    };
  }
};
export {
  checkDatabaseHealth,
  createPool,
  ensureAppStoreTableExists,
  executeSqlWithRetry,
  extractPgErrorDetails,
  getDbInstance,
  isDatabaseSocketAvailable,
  purgePool,
  resolveDatabaseConfig,
  startDatabaseKeepAlive,
  warmUpDatabaseConnection
};
