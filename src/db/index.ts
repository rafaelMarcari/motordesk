import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import fs from 'fs';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPoolsMap: Map<string, pg.Pool> | undefined;
}

if (!global._postgresPoolsMap) {
  global._postgresPoolsMap = new Map<string, pg.Pool>();
}

export interface DbConfig {
  host: string;
  port: number;
  isUnixSocket: boolean;
  user: string;
  password?: string;
  database: string;
  instanceName: string;
}

export function resolveDatabaseConfig(overrideDb?: string): DbConfig {
  // Suporte a DATABASE_URL / NEON_DATABASE_URL completa (padrão Neon Postgres)
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;
  if (connectionString) {
    try {
      const parsedUrl = new URL(connectionString);
      return {
        host: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432,
        isUnixSocket: false,
        user: decodeURIComponent(parsedUrl.username || ''),
        password: decodeURIComponent(parsedUrl.password || ''),
        database: overrideDb || parsedUrl.pathname.replace(/^\//, '') || 'neondb',
        instanceName: '',
      };
    } catch (e) {
      console.warn('[MotorDesk DB] Erro ao interpretar DATABASE_URL, aplicando fallback de variáveis individuais:', e);
    }
  }

  const instanceName = process.env.INSTANCE_CONNECTION_NAME || 'centered-repeater-4x4wp:us-east1:ai-studio-482bfc36';
  let rawHost = process.env.SQL_HOST || process.env.PGHOST || '';
  const port = process.env.SQL_PORT || process.env.PGPORT ? parseInt(process.env.SQL_PORT || process.env.PGPORT || '5432', 10) : 5432;

  // Search order for unix sockets on Cloud Run & AI Studio environments
  const socketCandidates = [
    `/cloudsql/${instanceName}`,      // Standard Google Cloud Run volume
    `/app/cloudsql/${instanceName}`,  // AI Studio container mount
    rawHost,
    rawHost.replace('/app/cloudsql/', '/cloudsql/'),
    rawHost.replace('/cloudsql/', '/app/cloudsql/'),
  ].filter(Boolean);

  let resolvedHost = '';
  let isUnixSocket = false;

  for (const candidate of socketCandidates) {
    if (candidate.startsWith('/')) {
      try {
        if (fs.existsSync(candidate)) {
          resolvedHost = candidate;
          isUnixSocket = true;
          break;
        }
      } catch (e) {}
    }
  }

  if (!resolvedHost) {
    if (rawHost && !rawHost.startsWith('/')) {
      // TCP hostname / IP / Neon host (ex: ep-cool-leaf-123456.us-east-2.aws.neon.tech)
      resolvedHost = rawHost;
      isUnixSocket = false;
    } else {
      // Default to standard Cloud Run socket
      resolvedHost = `/cloudsql/${instanceName}`;
      isUnixSocket = true;
    }
  }

  const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || process.env.PGUSER || 'ai_studio_app_user';
  const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.PGPASSWORD;
  const database = overrideDb || process.env.SQL_DB_NAME || process.env.PGDATABASE || 'cloud_sql_production_database';

  return {
    host: resolvedHost,
    port,
    isUnixSocket,
    user,
    password,
    database,
    instanceName,
  };
}

export function isDatabaseSocketAvailable(targetDb?: string): boolean {
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

export const createPool = (targetDb?: string): pg.Pool => {
  const pools = global._postgresPoolsMap!;
  const config = resolveDatabaseConfig(targetDb);
  const poolKey = `${config.user}@${config.database}#${config.host}`;

  let existing = pools.get(poolKey);
  if (!existing) {
    const poolConfig: pg.PoolConfig = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      min: 3, // Mantém permanentemente no mínimo 3 conexões ativas e aquecidas no pool
      max: 30, // Suporte robusto a múltiplos navegadores, abas e computadores simultâneos
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 300000, // 5 minutos antes de reciclar conexões ociosas
      maxUses: 10000,
      keepAlive: true, // Ativa keepAlive TCP a nível de socket
      keepAliveInitialDelayMillis: 2000, // Envia keepAlive após 2 segundos
      allowExitOnIdle: false, // JAMAIS desliga ou sai em ociosidade - conexão sempre aberta
    };

    if (!config.isUnixSocket) {
      poolConfig.port = config.port;
      // Para conexões TCP externas (ex: Neon Postgres, AWS RDS, Supabase), ativar SSL automaticamente
      const isLocalhost = config.host === 'localhost' || config.host === '127.0.0.1' || config.host.startsWith('192.168.') || config.host.startsWith('10.');
      const explicitSsl = process.env.PGSSLMODE || process.env.SQL_SSL;
      if (explicitSsl === 'require' || explicitSsl === 'true' || (!isLocalhost && !config.host.startsWith('/'))) {
        poolConfig.ssl = {
          rejectUnauthorized: false,
        };
      }
    }

    existing = new Pool(poolConfig);

    existing.on('error', (err: any) => {
      console.warn(`[MotorDesk DB_POOL] Client socket event on ${config.database}: ${err.message} (${err.code || 'NO_CODE'})`);
      // Não descarta o pool inteiro por erro transiente de um socket ocioso; o pool recria o cliente automaticamente
    });

    pools.set(poolKey, existing);
  }

  return existing;
};

// Gerenciador global de Heartbeat / Keep-Alive para manter o banco permanentemente ativo
let keepAliveTimer: NodeJS.Timeout | null = null;

export function startDatabaseKeepAlive(intervalMs = 15000): void {
  if (keepAliveTimer) return;

  keepAliveTimer = setInterval(async () => {
    try {
      const config = resolveDatabaseConfig();
      if (config.isUnixSocket && !fs.existsSync(config.host)) {
        return; // Silent when unix socket is not mounted
      }
      const res = await executeSqlWithRetry('SELECT 1 AS heartbeat, NOW() as current_time;', [], config.database, 2);
      if (process.env.DEBUG_DB_HEARTBEAT === 'true') {
        console.log(`[MotorDesk DB Heartbeat] Conexão ativa mantida aberta com sucesso: ${res.rows[0]?.current_time}`);
      }
    } catch (err: any) {
      if (process.env.DEBUG_DB_HEARTBEAT === 'true') {
        console.warn(`[MotorDesk DB Heartbeat] Alerta de reconexão: ${err.message}. Restaurando pool...`);
      }
    }
  }, intervalMs);

  // Mantém o timer permanentemente ativo para nunca fechar a conexão com o banco de dados
  console.log(`[MotorDesk DB Heartbeat] Heartbeat configurado a cada ${intervalMs / 1000}s.`);
}

/**
 * Aquece imediatamente a conexão do banco na inicialização do servidor.
 * Garante que quando o usuário acessar de outro navegador ou outro computador,
 * a conexão já estará 100% pronta e com latência mínima.
 */
export async function warmUpDatabaseConnection(targetDb?: string): Promise<boolean> {
  try {
    const config = resolveDatabaseConfig(targetDb);
    if (config.isUnixSocket && !fs.existsSync(config.host)) {
      console.log(`[MotorDesk DB] Socket Unix (${config.host}) não montado. Operando em modo de alta resiliência com cache persistente.`);
      return false;
    }
    console.log(`[MotorDesk DB] Aquecendo conexão persistente com o banco ${config.database}...`);
    const pool = createPool(config.database);
    
    // Executa verificação imediata
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS warm_check;');
    } finally {
      client.release();
    }
    
    // Inicia o heartbeat automático
    startDatabaseKeepAlive(20000);
    console.log(`[MotorDesk DB] Conexão persistente com ${config.database} aquecida e mantida permanentemente aberta.`);
    return true;
  } catch (err: any) {
    console.warn(`[MotorDesk DB] Aviso ao pré-aquecer conexão: ${err.message}`);
    return false;
  }
}

export function purgePool(targetDb?: string): void {
  const pools = global._postgresPoolsMap!;
  const config = resolveDatabaseConfig(targetDb);
  const poolKey = `${config.user}@${config.database}#${config.host}`;
  const existing = pools.get(poolKey);
  if (existing) {
    pools.delete(poolKey);
    existing.end().catch(() => {});
  }
}

export const getDbInstance = (targetDb?: string) => {
  try {
    const pool = createPool(targetDb);
    return drizzle(pool, { schema });
  } catch (err) {
    console.error('Failed to initialize Drizzle DB instance:', err);
    return null;
  }
};

export function extractPgErrorDetails(err: any) {
  const cause = err?.cause || err;
  return {
    code: cause?.code || err?.code || 'UNKNOWN_ERROR',
    message: cause?.message || err?.message || 'Erro desconhecido',
    detail: cause?.detail || null,
    hint: cause?.hint || null,
    schema: cause?.schema || null,
    table: cause?.table || null,
    column: cause?.column || null,
    constraint: cause?.constraint || null,
    sqlState: cause?.code || null,
    routine: cause?.routine || null,
  };
}

/**
 * Execute SQL with automatic retry and disposal of broken socket clients (EPIPE / ECONNRESET)
 */
export async function executeSqlWithRetry<T extends pg.QueryResultRow = any>(
  queryText: string,
  params: any[] = [],
  targetDb?: string,
  maxRetries = 5
): Promise<pg.QueryResult<T>> {
  const config = resolveDatabaseConfig(targetDb);
  if (config.isUnixSocket && !fs.existsSync(config.host)) {
    const err: any = new Error(`Socket Unix não encontrado em ${config.host}`);
    err.code = 'ENOENT';
    throw err;
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    const pool = createPool(targetDb);
    let client: pg.PoolClient | null = null;
    try {
      client = await pool.connect();
      const res = await client.query<T>(queryText, params);
      return res;
    } catch (err: any) {
      const isBrokenSocket =
        err?.code === 'EPIPE' ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ECONNREFUSED' ||
        err?.code === '57P01' ||
        err?.code === 'ETIMEDOUT' ||
        String(err?.message || '').toLowerCase().includes('epipe') ||
        String(err?.message || '').toLowerCase().includes('reset') ||
        String(err?.message || '').toLowerCase().includes('socket') ||
        String(err?.message || '').toLowerCase().includes('closed') ||
        String(err?.message || '').toLowerCase().includes('connection terminated');

      if (client) {
        try {
          // Passing true destroys the broken client so it is removed from pool
          client.release(true);
        } catch (e) {}
        client = null;
      }

      if (isBrokenSocket && attempt <= maxRetries) {
        // Purge pool immediately on broken socket to eliminate any dead socket descriptors
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
        } catch (e) {}
      }
    }
  }
  throw new Error('Max retries exceeded for SQL query');
}

export const ensureAppStoreTableExists = async (targetDb?: string): Promise<boolean> => {
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
  } catch (err: any) {
    console.warn("Warning checking/creating app_store table in Cloud SQL:", err.message);
    return false;
  }
};

export const checkDatabaseHealth = async (targetDb?: string): Promise<{
  connected: boolean;
  database?: string;
  databaseUser?: string;
  databaseHost?: string;
  appStoreTable?: boolean;
  appStoreRecord?: boolean;
  appStoreDataSize?: number;
  appStoreUpdatedAt?: string;
  error?: any;
}> => {
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
        code: 'ENOENT',
        message: `Socket Unix não montado em ${config.host} (Modo de resiliência ativo)`,
      },
    };
  }
  try {
    const result = await executeSqlWithRetry("SELECT current_database(), current_user, version();", [], config.database);
    const dbName = result.rows[0]?.current_database || config.database;
    const dbUser = result.rows[0]?.current_user || config.user;

    // Check app_store table and motordesk_main record existence
    const tableCheck = await executeSqlWithRetry(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_store';`,
      [],
      config.database
    );
    const appStoreTableExists = tableCheck.rows.length > 0;

    let appStoreRecordExists = false;
    let appStoreDataSize = 0;
    let appStoreUpdatedAt: string | undefined;

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
      appStoreUpdatedAt,
    };
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.error("Database health check failed:", pgErr);
    return {
      connected: false,
      database: config.database,
      databaseUser: config.user,
      databaseHost: config.host,
      appStoreTable: false,
      appStoreRecord: false,
      error: pgErr,
    };
  }
};


