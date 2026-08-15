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
  const instanceName = process.env.INSTANCE_CONNECTION_NAME || 'centered-repeater-4x4wp:us-east1:ai-studio-482bfc36';
  let host = process.env.SQL_HOST || '';
  const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;

  // Potential unix socket directories to search
  const candidates: string[] = [];

  if (host) {
    candidates.push(host);
    if (host.startsWith('/app/cloudsql/')) {
      candidates.push(host.replace('/app/cloudsql/', '/cloudsql/'));
    }
    if (host.startsWith('/cloudsql/')) {
      candidates.push(host.replace('/cloudsql/', '/app/cloudsql/'));
    }
  }

  if (instanceName) {
    candidates.push(`/cloudsql/${instanceName}`);
    candidates.push(`/app/cloudsql/${instanceName}`);
  }

  let resolvedHost = host;
  let isUnixSocket = false;

  // Search existing socket paths on filesystem
  for (const candidate of candidates) {
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

  if (!isUnixSocket) {
    if (resolvedHost.startsWith('/')) {
      // Default to standard Cloud Run socket mount path if no directory was matched on disk
      resolvedHost = `/cloudsql/${instanceName}`;
      isUnixSocket = true;
    } else if (resolvedHost.includes(':')) {
      resolvedHost = `/cloudsql/${resolvedHost}`;
      isUnixSocket = true;
    }
  }

  const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'ai_studio_app_user';
  const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;
  const database = overrideDb || process.env.SQL_DB_NAME || 'cloud_sql_production_database';

  return {
    host: resolvedHost || 'localhost',
    port,
    isUnixSocket,
    user,
    password,
    database,
    instanceName,
  };
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
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 2000,
    };

    if (!config.isUnixSocket) {
      poolConfig.port = config.port;
    }

    existing = new Pool(poolConfig);

    existing.on('error', (err: any) => {
      console.warn(`[MotorDesk Cloud SQL Pool Warning for ${config.database}]:`, err.message);
    });

    pools.set(poolKey, existing);
  }

  return existing;
};

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
export async function executeSqlWithRetry<T = any>(
  queryText: string,
  params: any[] = [],
  targetDb?: string,
  maxRetries = 4
): Promise<pg.QueryResult<T>> {
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
        console.warn(`[MotorDesk DB] Socket connection error (${err.code || err.message}), reconnecting attempt ${attempt}/${maxRetries}...`);
        if (attempt >= 2) {
          // Purge stale pool to eliminate any other dead sockets in queue
          purgePool(targetDb);
        }
        await new Promise((r) => setTimeout(r, 150 * attempt));
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


