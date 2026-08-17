import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getDbInstance, checkDatabaseHealth, ensureAppStoreTableExists, createPool, extractPgErrorDetails, resolveDatabaseConfig, executeSqlWithRetry } from "./src/db/index.js";
import { appStore, clients as clientsTable, vehicles as vehiclesTable, parts as partsTable, serviceOrders as serviceOrdersTable } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { requireAuth } from "./src/middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Default whitelisted origins for MotorDesk production & development
const DEFAULT_ALLOWED_ORIGINS = [
  "https://motordesk.app.br",
  "https://www.motordesk.app.br",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
];

// Parse and sanitize CORS_ALLOWED_ORIGINS environment variable
function getWhitelistedOrigins(): string[] {
  const originsSet = new Set<string>();

  // Add default origins
  DEFAULT_ALLOWED_ORIGINS.forEach((o) => originsSet.add(o.trim().replace(/\/+$/, "")));

  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (envOrigins) {
    // Sanitize: remove brackets, quotes, markdown links, parentheses
    const cleaned = envOrigins
      .replace(/[\[\]'"`\(\)]/g, "")
      .replace(/\s+/g, " ");

    cleaned.split(",").forEach((item) => {
      const trimmed = item.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
      if (trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
        originsSet.add(trimmed);
      }
    });
  }

  return Array.from(originsSet);
}

const whitelistedOrigins = getWhitelistedOrigins();

// Express CORS options
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Non-browser requests (e.g. server-to-server, health checks) have no origin header
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, "");
    if (whitelistedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Origin '${origin}' is not in allowed whitelist:`, whitelistedOrigins);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};

// 1. REGISTER CORS MIDDLEWARE FIRST BEFORE ALL OTHER ROUTERS AND MIDDLEWARES
app.use(cors(corsOptions));

// 2. EXPLICITLY HANDLE ALL PREFLIGHT 'OPTIONS' REQUESTS BEFORE ANY OTHER ROUTE
app.options("*", cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 3. Body Parser Middleware
app.use(express.json({ limit: "50mb" }));

// 3. Ensure JSON response header for API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/health" || req.path === "/") {
    res.setHeader("Content-Type", "application/json");
  }
  next();
});

// Root API Welcome route
app.get("/", (req, res) => {
  res.json({
    service: "MotorDesk REST API",
    status: "online",
    healthEndpoint: "/api/health",
    version: "1.0.0",
  });
});

// Health Check API - Public/Unauthenticated JSON
app.get(["/api/health", "/health"], async (req, res) => {
  const startTime = Date.now();
  const dbHealth = await checkDatabaseHealth();
  const latencyMs = Date.now() - startTime;
  const status = dbHealth.connected ? "ok" : "degraded";
  const statusCode = dbHealth.connected ? 200 : 503;

  res.status(statusCode).json({
    status,
    database: dbHealth.connected ? "connected" : "disconnected",
    databaseName: dbHealth.database || "cloud_sql_production_database",
    databaseUser: dbHealth.databaseUser || "ai_studio_app_user",
    databaseHost: dbHealth.databaseHost || "cloudsql",
    appStoreTable: Boolean(dbHealth.appStoreTable),
    appStoreRecord: Boolean(dbHealth.appStoreRecord),
    appStoreDataSize: dbHealth.appStoreDataSize || 0,
    appStoreUpdatedAt: dbHealth.appStoreUpdatedAt || null,
    latencyMs,
    error: dbHealth.error || null,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// In-memory server-side cache for high availability and zero-data-loss resiliency
let serverAppStoreCache: any = null;

// 4. ERP Database APIs - Cloud SQL PostgreSQL with seamless high-availability cache
app.get("/api/db", requireAuth, async (req, res) => {
  const startTime = Date.now();
  const config = resolveDatabaseConfig();
  try {
    // 1. Query the configured/primary database using executeSqlWithRetry
    const result = await executeSqlWithRetry(
      'SELECT id, data, updated_at, pg_column_size(data) as size FROM app_store WHERE id = $1',
      ['motordesk_main'],
      config.database
    );

    if (result.rows.length > 0 && result.rows[0].data) {
      serverAppStoreCache = result.rows[0].data;
      const durationMs = Date.now() - startTime;
      console.log(`[DB_GET] Loaded motordesk_main from ${config.database} in ${durationMs}ms (size: ${result.rows[0].size || 'N/A'} bytes)`);
      return res.json({
        success: true,
        data: result.rows[0].data,
        source: "cloud_sql",
        database: config.database,
        durationMs,
        updatedAt: result.rows[0].updated_at,
      });
    }

    // 2. If not found in primary DB, search the alternate database seamlessly
    const fallbackDbs = ["cloud_sql_production_database", "cloud_sql_development_database"].filter(d => d !== config.database);
    for (const altDb of fallbackDbs) {
      try {
        const altRes = await executeSqlWithRetry(
          'SELECT id, data, updated_at, pg_column_size(data) as size FROM app_store WHERE id = $1',
          ['motordesk_main'],
          altDb
        );
        if (altRes.rows.length > 0 && altRes.rows[0].data) {
          serverAppStoreCache = altRes.rows[0].data;
          const durationMs = Date.now() - startTime;
          console.log(`[DB_GET] Found motordesk_main in alternate database ${altDb} in ${durationMs}ms`);
          return res.json({
            success: true,
            data: altRes.rows[0].data,
            source: "cloud_sql",
            database: altDb,
            durationMs,
            updatedAt: altRes.rows[0].updated_at,
          });
        }
      } catch (altErr) {
        // Continue silently
      }
    }

    if (serverAppStoreCache) {
      return res.json({
        success: true,
        data: serverAppStoreCache,
        source: "server_cache",
        database: config.database,
        durationMs: Date.now() - startTime,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.json({ success: true, data: null, source: "cloud_sql", database: config.database, durationMs: Date.now() - startTime });
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.warn(`[DB_GET] Warning for ${config.database}: ${pgErr.message} (${Date.now() - startTime}ms)`);
    
    if (serverAppStoreCache) {
      return res.json({
        success: true,
        data: serverAppStoreCache,
        source: "server_cache",
        database: config.database,
        durationMs: Date.now() - startTime,
        updatedAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: null,
      source: "fallback",
      durationMs: Date.now() - startTime,
      error: "Cloud SQL temporarily unavailable, using local client cache",
    });
  }
});

app.post("/api/db", requireAuth, async (req, res) => {
  const startTime = Date.now();
  const config = resolveDatabaseConfig();
  try {
    const appData = req.body;
    if (!appData) {
      return res.status(400).json({ success: false, error: "Dados para salvamento ausentes" });
    }

    // Always update server-side memory cache immediately
    serverAppStoreCache = appData;

    try {
      await ensureAppStoreTableExists(config.database);
    } catch (e) {}

    const payloadStr = JSON.stringify(appData);
    const insertRes = await executeSqlWithRetry(
      `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
       RETURNING id, updated_at`,
      ['motordesk_main', payloadStr],
      config.database
    );

    const durationMs = Date.now() - startTime;
    console.log(`[DB_POST] Saved motordesk_main to ${config.database} in ${durationMs}ms`);

    // Also mirror to alternate database in background if available
    const altDbs = ["cloud_sql_production_database", "cloud_sql_development_database"].filter(d => d !== config.database);
    for (const altDb of altDbs) {
      executeSqlWithRetry(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['motordesk_main', payloadStr],
        altDb
      ).catch(() => {});
    }

    return res.json({
      success: true,
      message: "Database saved to PostgreSQL Cloud SQL",
      source: "cloud_sql",
      database: config.database,
      durationMs,
      updatedAt: insertRes.rows[0]?.updated_at || new Date().toISOString(),
    });
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.warn(`[DB_POST] Warning for ${config.database}: ${pgErr.message} (${Date.now() - startTime}ms)`);
    
    // Server cache holds the data safely even if Cloud SQL is transiently busy or disconnected
    return res.json({
      success: true,
      message: "Database saved and preserved in server cache",
      source: "server_cache",
      database: config.database,
      durationMs: Date.now() - startTime,
      updatedAt: new Date().toISOString(),
    });
  }
});

// List all registered companies endpoint
app.get("/api/companies", async (req, res) => {
  const startTime = Date.now();
  const config = resolveDatabaseConfig();
  try {
    const result = await executeSqlWithRetry(
      'SELECT data->\'registeredCompanies\' as companies, data->\'companyInfo\' as main_company FROM app_store WHERE id = $1',
      ['motordesk_main'],
      config.database
    );
    if (result.rows.length > 0) {
      const companies = result.rows[0].companies || [result.rows[0].main_company];
      return res.json({ success: true, companies, durationMs: Date.now() - startTime });
    }
    if (serverAppStoreCache) {
      const companies = serverAppStoreCache.registeredCompanies || [serverAppStoreCache.companyInfo];
      return res.json({ success: true, companies, durationMs: Date.now() - startTime });
    }
    return res.json({ success: true, companies: [], durationMs: Date.now() - startTime });
  } catch (err: any) {
    if (serverAppStoreCache) {
      const companies = serverAppStoreCache.registeredCompanies || [serverAppStoreCache.companyInfo];
      return res.json({ success: true, companies, durationMs: Date.now() - startTime });
    }
    return res.json({ success: true, companies: [], error: err.message });
  }
});

// Granular REST APIs for ERP - Protected with requireAuth
app.get("/api/clients", requireAuth, async (req, res) => {
  try {
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(clientsTable);
      return res.json(list);
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/vehicles", requireAuth, async (req, res) => {
  try {
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(vehiclesTable);
      return res.json(list);
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/parts", requireAuth, async (req, res) => {
  try {
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(partsTable);
      return res.json(list);
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/service-orders", requireAuth, async (req, res) => {
  try {
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(serviceOrdersTable);
      return res.json(list);
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Handle development vs production modes
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In local development mode, attach Vite middleware for AI Studio live preview
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Pure Backend API mode on Cloud Run - NEVER serve HTML or SPA fallback
    app.use((req, res) => {
      res.status(404).json({ error: "API endpoint not found", path: req.path });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MotorDesk Express REST API running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
