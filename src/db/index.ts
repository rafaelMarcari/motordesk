import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
    
    // Resolve host or Unix socket path for Cloud SQL
    let instanceName = process.env.INSTANCE_CONNECTION_NAME || 'centered-repeater-4x4wp:us-east1:ai-studio-482bfc36';
    let host = process.env.SQL_HOST || '';

    if (!host && instanceName) {
      host = `/cloudsql/${instanceName}`;
    } else if (host && !host.startsWith('/') && host.includes(':')) {
      host = `/cloudsql/${host}`;
    }

    const isUnixSocket = Boolean(host && host.startsWith('/'));

    const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'ai_studio_app_user';
    const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;
    const database = process.env.SQL_DB_NAME || 'cloud_sql_production_database';

    const poolConfig: pg.PoolConfig = {
      host: host || 'localhost',
      user,
      password,
      database,
      max: 10,
      connectionTimeoutMillis: 15000,
    };

    if (!isUnixSocket) {
      poolConfig.port = port;
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const getDbInstance = () => {
  try {
    const pool = createPool();
    return drizzle(pool, { schema });
  } catch (err) {
    console.error('Failed to initialize Drizzle DB instance:', err);
    return null;
  }
};

export const ensureAppStoreTableExists = async (): Promise<boolean> => {
  try {
    const pool = createPool();
    // First check if table exists to avoid permission denied on schema public for non-admin users
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

export const checkDatabaseHealth = async (): Promise<{ connected: boolean; database?: string; error?: string }> => {
  try {
    const pool = createPool();
    const result = await pool.query("SELECT current_database(), current_user, version();");
    const dbName = result.rows[0]?.current_database || process.env.SQL_DB_NAME || 'cloud_sql_production_database';
    await ensureAppStoreTableExists();
    return { connected: true, database: dbName };
  } catch (err: any) {
    console.error("Database health check failed:", err.message);
    return { connected: false, error: err.message };
  }
};
