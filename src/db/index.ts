import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import fs from 'fs';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _activeDbName: string | undefined;
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

export function resolveDatabaseConfig(): DbConfig {
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
  const database = global._activeDbName || process.env.SQL_DB_NAME || 'cloud_sql_production_database';

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

export const createPool = (overrideDb?: string): pg.Pool => {
  if (overrideDb && global._activeDbName !== overrideDb) {
    global._activeDbName = overrideDb;
    if (global._postgresPool) {
      global._postgresPool.end().catch(() => {});
      global._postgresPool = undefined;
    }
  }

  if (!global._postgresPool) {
    const config = resolveDatabaseConfig();

    const poolConfig: pg.PoolConfig = {
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };

    if (!config.isUnixSocket) {
      poolConfig.port = config.port;
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('[MotorDesk Cloud SQL Pool] Unexpected error on idle client:', err);
    });
  }
  return global._postgresPool;
};

export const getDbInstance = (overrideDb?: string) => {
  try {
    const pool = createPool(overrideDb);
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

export const ensureAppStoreTableExists = async (): Promise<boolean> => {
  try {
    const pool = createPool();
    const checkRes = await pool.query(`
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_store';
    `);
    if (checkRes.rows.length > 0) {
      return true;
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_store (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    return true;
  } catch (err: any) {
    console.warn("Warning checking/creating app_store table in Cloud SQL:", err.message);
    return false;
  }
};

export const checkDatabaseHealth = async (): Promise<{
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
  const config = resolveDatabaseConfig();
  try {
    const pool = createPool();
    const result = await pool.query("SELECT current_database(), current_user, version();");
    const dbName = result.rows[0]?.current_database || config.database;
    const dbUser = result.rows[0]?.current_user || config.user;

    // Check app_store table and motordesk_main record existence
    const tableCheck = await pool.query(`
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_store';
    `);
    const appStoreTableExists = tableCheck.rows.length > 0;

    let appStoreRecordExists = false;
    let appStoreDataSize = 0;
    let appStoreUpdatedAt: string | undefined;

    if (appStoreTableExists) {
      const recCheck = await pool.query(`
        SELECT id, updated_at, pg_column_size(data) as size 
        FROM app_store 
        WHERE id = 'motordesk_main';
      `);
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

