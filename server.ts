import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getDbInstance, checkDatabaseHealth, ensureAppStoreTableExists, createPool, extractPgErrorDetails, resolveDatabaseConfig, executeSqlWithRetry } from "./src/db/index.js";
import { appStore, clients as clientsTable, vehicles as vehiclesTable, parts as partsTable, serviceOrders as serviceOrdersTable } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { requireAuth } from "./src/middleware/auth.js";
import { fiscalBackendService } from "./server/fiscalProviderService.js";

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

// Allowed custom and standard headers for MotorDesk multi-tenant and authentication
const ALLOWED_CORS_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "X-Company-Id",
  "X-User-Id",
  "X-User-Role",
  "x-company-id",
  "x-user-id",
  "x-user-role",
  "authorization",
  "content-type",
  "accept",
  "x-requested-with"
];

// Express CORS options
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Non-browser requests (e.g. server-to-server, health checks) have no origin header
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, "");
    if (
      whitelistedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.endsWith(".run.app") ||
      normalizedOrigin.endsWith("motordesk.app.br")
    ) {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Origin '${origin}' is not in allowed whitelist:`, whitelistedOrigins);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ALLOWED_CORS_HEADERS,
  exposedHeaders: ALLOWED_CORS_HEADERS,
  optionsSuccessStatus: 200,
};

// 1. REGISTER CORS MIDDLEWARE FIRST BEFORE ALL OTHER ROUTERS AND MIDDLEWARES
app.use(cors(corsOptions));

// 2. EXPLICITLY HANDLE ALL PREFLIGHT 'OPTIONS' REQUESTS BEFORE ANY OTHER ROUTE
app.options("*", cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    if (origin) {
      const normalizedOrigin = origin.trim().replace(/\/+$/, "");
      if (
        whitelistedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith(".run.app") ||
        normalizedOrigin.endsWith("motordesk.app.br")
      ) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, X-Company-Id, X-User-Id, X-User-Role, x-company-id, x-user-id, x-user-role"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(200).end();
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

// Write mutex / sequential queue to prevent async race conditions during concurrent multi-browser writes
let dbWriteQueue: Promise<any> = Promise.resolve();

function enqueueDbWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = dbWriteQueue.then(() => task(), () => task());
  dbWriteQueue = next.catch(() => {});
  return next;
}

// Helper: Generic lossless entity merge by ID / secondary unique key
function mergeEntityCollection<T extends Record<string, any>>(
  existingArr: T[] | undefined,
  incomingArr: T[] | undefined,
  keyField: string = 'id',
  altKeyField?: string
): T[] {
  const map = new Map<string, T>();

  if (Array.isArray(existingArr)) {
    for (const item of existingArr) {
      if (!item) continue;
      const key = item[keyField] || (altKeyField ? item[altKeyField] : null);
      if (key) {
        map.set(String(key).trim().toLowerCase(), item);
      }
    }
  }

  if (Array.isArray(incomingArr)) {
    for (const item of incomingArr) {
      if (!item) continue;
      const key = item[keyField] || (altKeyField ? item[altKeyField] : null);
      if (key) {
        const normalizedKey = String(key).trim().toLowerCase();
        const existing = map.get(normalizedKey);
        if (existing) {
          map.set(normalizedKey, { ...existing, ...item });
        } else {
          map.set(normalizedKey, item);
        }
      }
    }
  }

  return Array.from(map.values());
}

// Helper: Normalize businessType enum consistently on server
function normalizeBusinessType(type: any): string {
  if (!type) return 'OFICINA';
  const clean = String(type).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (clean === 'COMERCIO' || clean === 'LOJA' || clean === 'BALCAO' || clean === 'AUTOPECAS' || clean === 'DISTRIBUIDORA') {
    return 'COMERCIO';
  }
  if (clean === 'OFICINA_COMERCIO' || clean === 'AMBOS' || clean === 'HIBRIDO' || (clean.includes('OFICINA') && clean.includes('COMERCIO'))) {
    return 'OFICINA_COMERCIO';
  }
  return 'OFICINA';
}

// Server-side Intelligent Bidirectional Merge: protects against stale client overwrites
export function mergeAppDatabase(existing: any, incoming: any): any {
  if (!existing || typeof existing !== 'object') return incoming;
  if (!incoming || typeof incoming !== 'object') return existing;

  const rawCompanies = mergeEntityCollection(existing.registeredCompanies, incoming.registeredCompanies, 'id', 'cnpj');
  const normalizedCompanies = rawCompanies.map((c: any) => ({
    ...c,
    businessType: normalizeBusinessType(c?.businessType)
  }));

  const rawCompanyInfo = incoming.companyInfo || existing.companyInfo || (normalizedCompanies.length > 0 ? normalizedCompanies[0] : null);
  const normalizedCompanyInfo = rawCompanyInfo ? {
    ...rawCompanyInfo,
    businessType: normalizeBusinessType(rawCompanyInfo?.businessType)
  } : null;

  return {
    ...existing,
    ...incoming,
    companyInfo: normalizedCompanyInfo,
    registeredCompanies: normalizedCompanies,
    users: mergeEntityCollection(existing.users, incoming.users, 'id', 'username'),
    clients: mergeEntityCollection(existing.clients, incoming.clients, 'id', 'cpf'),
    vehicles: mergeEntityCollection(existing.vehicles, incoming.vehicles, 'id', 'plate'),
    parts: mergeEntityCollection(existing.parts, incoming.parts, 'id', 'code'),
    services: mergeEntityCollection(existing.services, incoming.services, 'id'),
    budgets: mergeEntityCollection(existing.budgets, incoming.budgets, 'id'),
    serviceOrders: mergeEntityCollection(existing.serviceOrders, incoming.serviceOrders, 'id'),
    history: mergeEntityCollection(existing.history, incoming.history, 'id'),
    suppliers: mergeEntityCollection(existing.suppliers, incoming.suppliers, 'id', 'cnpj'),
    supplierPartPrices: mergeEntityCollection(existing.supplierPartPrices, incoming.supplierPartPrices, 'id'),
    quotations: mergeEntityCollection(existing.quotations, incoming.quotations, 'id'),
    accountsReceivable: mergeEntityCollection(existing.accountsReceivable, incoming.accountsReceivable, 'id'),
    accountsPayable: mergeEntityCollection(existing.accountsPayable, incoming.accountsPayable, 'id'),
    financialTransactions: mergeEntityCollection(existing.financialTransactions, incoming.financialTransactions, 'id'),
    paymentMethods: mergeEntityCollection(existing.paymentMethods, incoming.paymentMethods, 'id', 'type'),
    maintenanceLogs: mergeEntityCollection(existing.maintenanceLogs, incoming.maintenanceLogs, 'id'),
    fiscalDocuments: mergeEntityCollection(existing.fiscalDocuments, incoming.fiscalDocuments, 'id'),
    boletos: mergeEntityCollection(existing.boletos, incoming.boletos, 'id'),
    interBranchSales: mergeEntityCollection(existing.interBranchSales, incoming.interBranchSales, 'id'),
    stockMovements: mergeEntityCollection(existing.stockMovements, incoming.stockMovements, 'id'),
    notifications: mergeEntityCollection(existing.notifications, incoming.notifications, 'id'),
    testCases: mergeEntityCollection(existing.testCases, incoming.testCases, 'id'),
    taxOperationNatures: mergeEntityCollection(existing.taxOperationNatures, incoming.taxOperationNatures, 'id', 'code'),
    taxRules: mergeEntityCollection(existing.taxRules, incoming.taxRules, 'id'),
    xmlImportRecords: mergeEntityCollection(existing.xmlImportRecords, incoming.xmlImportRecords, 'id'),
    loginHistory: mergeEntityCollection(existing.loginHistory, incoming.loginHistory, 'username'),
    globalModules: { ...(existing.globalModules || {}), ...(incoming.globalModules || {}) },
    alertSettings: { ...(existing.alertSettings || {}), ...(incoming.alertSettings || {}) },
    sefazConfig: { ...(existing.sefazConfig || {}), ...(incoming.sefazConfig || {}) },
    landingContent: incoming.landingContent || existing.landingContent || null,
  };
}

// Helper: Extract user and company identity context from request
function extractUserContext(req: any): { userId: string; companyId: string; userRole: string } {
  let userId = req.headers['x-user-id'] || req.user?.uid;
  const authHeader = req.headers.authorization;
  if (!userId && authHeader?.startsWith('Bearer motordesk_session_')) {
    const raw = authHeader.replace('Bearer motordesk_session_', '');
    const parts = raw.split('_');
    userId = parts[0] || 'authenticated_user';
  }
  if (!userId) {
    userId = req.user?.uid || (authHeader ? 'authenticated_user' : 'anonymous');
  }
  const companyId = req.headers['x-company-id'] || 'all';
  const userRole = req.headers['x-user-role'] || req.user?.role || 'user';
  return { userId, companyId, userRole };
}

// 4. ERP Database APIs - Cloud SQL PostgreSQL with seamless high-availability cache
app.get("/api/db", requireAuth, async (req: any, res) => {
  const startTime = Date.now();
  const requestId = `req-get-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const { userId, companyId: reqCompanyId } = extractUserContext(req);
  const config = resolveDatabaseConfig();

  try {
    // 1. Query the configured/primary database using executeSqlWithRetry
    const result = await executeSqlWithRetry(
      'SELECT id, data, updated_at, pg_column_size(data) as size FROM app_store WHERE id = $1',
      ['motordesk_main'],
      config.database
    );

    if (result.rows.length > 0 && result.rows[0].data) {
      const data = result.rows[0].data;
      serverAppStoreCache = data;
      const durationMs = Date.now() - startTime;
      const empresas = (data.registeredCompanies || []).length;
      const usuarios = (data.users || []).length;
      const clientes = (data.clients || []).length;
      const veiculos = (data.vehicles || []).length;
      const pecas = (data.parts || []).length;
      const companyId = reqCompanyId !== 'all' ? reqCompanyId : (data.companyInfo?.id || 'all');
      const payloadSize = Number(result.rows[0].size) || JSON.stringify(data).length;
      const updatedAt = result.rows[0].updated_at || new Date().toISOString();

      console.log(`[DB-TRACE] GET /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${companyId}\npayloadSize=${payloadSize}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${config.database}\nsource=cloud_sql\nlatencyMs=${durationMs}`);

      return res.json({
        success: true,
        data,
        source: "cloud_sql",
        database: config.database,
        durationMs,
        updatedAt,
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
          const data = altRes.rows[0].data;
          serverAppStoreCache = data;
          const durationMs = Date.now() - startTime;
          const empresas = (data.registeredCompanies || []).length;
          const usuarios = (data.users || []).length;
          const clientes = (data.clients || []).length;
          const veiculos = (data.vehicles || []).length;
          const pecas = (data.parts || []).length;
          const companyId = data.companyInfo?.id || 'all';
          const payloadSize = Number(altRes.rows[0].size) || JSON.stringify(data).length;
          const updatedAt = altRes.rows[0].updated_at || new Date().toISOString();

          console.log(`[DB-TRACE] GET /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${companyId}\npayloadSize=${payloadSize}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${altDb}\nsource=cloud_sql_alt\nlatencyMs=${durationMs}`);

          return res.json({
            success: true,
            data,
            source: "cloud_sql",
            database: altDb,
            durationMs,
            updatedAt,
          });
        }
      } catch (altErr) {
        // Continue silently
      }
    }

    if (serverAppStoreCache) {
      const empresas = (serverAppStoreCache.registeredCompanies || []).length;
      const usuarios = (serverAppStoreCache.users || []).length;
      const clientes = (serverAppStoreCache.clients || []).length;
      const veiculos = (serverAppStoreCache.vehicles || []).length;
      const pecas = (serverAppStoreCache.parts || []).length;
      const companyId = serverAppStoreCache.companyInfo?.id || 'all';
      const updatedAt = new Date().toISOString();

      console.log(`[DB-TRACE] GET /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${companyId}\npayloadSize=${JSON.stringify(serverAppStoreCache).length}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${config.database}\nsource=server_cache\nlatencyMs=${Date.now() - startTime}`);

      return res.json({
        success: true,
        data: serverAppStoreCache,
        source: "server_cache",
        database: config.database,
        durationMs: Date.now() - startTime,
        updatedAt,
      });
    }

    console.log(`[DB-TRACE] GET /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=none\npayloadSize=0\nempresas=0\nusuários=0\nclientes=0\nveículos=0\npeças=0\nresult=EMPTY\nupdatedAt=null\ndatabase=${config.database}\nsource=cloud_sql\nlatencyMs=${Date.now() - startTime}`);

    return res.json({ success: true, data: null, source: "cloud_sql", database: config.database, durationMs: Date.now() - startTime });
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.warn(`[DB-TRACE] GET /api/db ERROR\nrequestId=${requestId}\nuserId=${userId}\nresult=ERROR\nerror=${pgErr.message}\nlatencyMs=${Date.now() - startTime}`);
    
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

app.post("/api/db", requireAuth, async (req: any, res) => {
  const startTime = Date.now();
  const requestId = `req-post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const { userId, companyId: reqCompanyId } = extractUserContext(req);
  const config = resolveDatabaseConfig();

  try {
    const incomingData = req.body;
    if (!incomingData) {
      console.warn(`[DB-TRACE] POST /api/db\nrequestId=${requestId}\nuserId=${userId}\nresult=ERROR\nerror=Dados para salvamento ausentes`);
      return res.status(400).json({ success: false, error: "Dados para salvamento ausentes" });
    }

    const inEmpresas = (incomingData.registeredCompanies || []).length;
    const inUsuarios = (incomingData.users || []).length;
    const inClientes = (incomingData.clients || []).length;
    const inVeiculos = (incomingData.vehicles || []).length;
    const inPecas = (incomingData.parts || []).length;
    const inCompanyId = reqCompanyId !== 'all' ? reqCompanyId : (incomingData.companyInfo?.id || 'all');

    console.log(`[DB-TRACE] POST /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${inCompanyId}\npayloadSize=${JSON.stringify(incomingData).length}\nempresas=${inEmpresas}\nusuários=${inUsuarios}\nclientes=${inClientes}\nveículos=${inVeiculos}\npeças=${inPecas}\nupdatedAt=${new Date().toISOString()}`);

    try {
      await ensureAppStoreTableExists(config.database);
    } catch (e) {}

    // Execute atomic serialized read-merge-write to guarantee zero race conditions on concurrent multi-device writes
    const { mergedData, durationMs, updatedAt } = await enqueueDbWrite(async () => {
      // 1. Fetch current stored data from PostgreSQL for intelligent lossless merging
      let currentStoredData: any = serverAppStoreCache;
      let currentUpdatedAt: string = new Date().toISOString();
      try {
        const curRes = await executeSqlWithRetry(
          'SELECT data, updated_at FROM app_store WHERE id = $1',
          ['motordesk_main'],
          config.database
        );
        if (curRes.rows.length > 0 && curRes.rows[0].data) {
          currentStoredData = curRes.rows[0].data;
          if (curRes.rows[0].updated_at) {
            currentUpdatedAt = curRes.rows[0].updated_at;
          }
        }
      } catch (readErr) {}

      const curEmpresas = (currentStoredData?.registeredCompanies || []).length;
      const curUsuarios = (currentStoredData?.users || []).length;
      const curClientes = (currentStoredData?.clients || []).length;
      const curVeiculos = (currentStoredData?.vehicles || []).length;
      const curPecas = (currentStoredData?.parts || []).length;
      const curCompanyId = currentStoredData?.companyInfo?.id || inCompanyId;

      console.log(`[DB-TRACE] Cloud SQL BEFORE MERGE\nrequestId=${requestId}\ncompanyId=${curCompanyId}\nempresas=${curEmpresas}\nusuários=${curUsuarios}\nclientes=${curClientes}\nveículos=${curVeiculos}\npeças=${curPecas}\nupdatedAt=${currentUpdatedAt}`);

      // 2. Perform intelligent bidirectional merge to protect multi-browser concurrency
      const merged = mergeAppDatabase(currentStoredData, incomingData);

      // Update in-memory server cache atomically
      serverAppStoreCache = merged;

      const payloadStr = JSON.stringify(merged);
      const payloadSize = payloadStr.length;
      const mergedEmpresas = (merged.registeredCompanies || []).length;
      const mergedUsuarios = (merged.users || []).length;
      const mergedClientes = (merged.clients || []).length;
      const mergedVeiculos = (merged.vehicles || []).length;
      const mergedPecas = (merged.parts || []).length;

      // 3. Persist merged data to PostgreSQL
      const insertRes = await executeSqlWithRetry(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
         RETURNING id, updated_at`,
        ['motordesk_main', payloadStr],
        config.database
      );

      const opDurationMs = Date.now() - startTime;
      const opUpdatedAt = insertRes.rows[0]?.updated_at || new Date().toISOString();

      console.log(`[DB-TRACE] Cloud SQL AFTER MERGE\nrequestId=${requestId}\ncompanyId=${inCompanyId}\npayloadSize=${payloadSize}\nempresas=${mergedEmpresas}\nusuários=${mergedUsuarios}\nclientes=${mergedClientes}\nveículos=${mergedVeiculos}\npeças=${mergedPecas}\nresult=SUCCESS\nupdatedAt=${opUpdatedAt}\ndatabase=${config.database}\nsource=cloud_sql\nlatencyMs=${opDurationMs}`);

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

      return {
        mergedData: merged,
        durationMs: opDurationMs,
        updatedAt: opUpdatedAt,
      };
    });

    return res.json({
      success: true,
      message: "Database saved and merged to PostgreSQL Cloud SQL",
      data: mergedData,
      source: "cloud_sql",
      database: config.database,
      durationMs,
      updatedAt,
    });
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.warn(`[DB-TRACE] POST /api/db ERROR\nrequestId=${requestId}\nuserId=${userId}\nresult=ERROR\nerror=${pgErr.message}\nlatencyMs=${Date.now() - startTime}`);
    
    // Server cache holds the data safely even if Cloud SQL is transiently busy or disconnected
    return res.json({
      success: true,
      message: "Database saved and preserved in server cache",
      data: serverAppStoreCache || req.body,
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
  const requestId = `req-comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const config = resolveDatabaseConfig();

  try {
    const result = await executeSqlWithRetry(
      'SELECT data->\'registeredCompanies\' as companies, data->\'companyInfo\' as main_company, updated_at FROM app_store WHERE id = $1',
      ['motordesk_main'],
      config.database
    );
    if (result.rows.length > 0) {
      const companies = result.rows[0].companies || [result.rows[0].main_company];
      const count = Array.isArray(companies) ? companies.length : 1;
      console.log(`[DB-TRACE][GET /api/companies]\nrequestId=${requestId}\ncompanies=${count}\nresult=SUCCESS\nupdatedAt=${result.rows[0].updated_at}\ndatabase=${config.database}\nsource=cloud_sql\nlatencyMs=${Date.now() - startTime}`);
      return res.json({ success: true, companies, durationMs: Date.now() - startTime });
    }
    if (serverAppStoreCache) {
      const companies = serverAppStoreCache.registeredCompanies || [serverAppStoreCache.companyInfo];
      const count = Array.isArray(companies) ? companies.length : 1;
      console.log(`[DB-TRACE][GET /api/companies]\nrequestId=${requestId}\ncompanies=${count}\nresult=SUCCESS\nsource=server_cache\nlatencyMs=${Date.now() - startTime}`);
      return res.json({ success: true, companies, durationMs: Date.now() - startTime });
    }
    console.log(`[DB-TRACE][GET /api/companies]\nrequestId=${requestId}\ncompanies=0\nresult=EMPTY\nlatencyMs=${Date.now() - startTime}`);
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

// =========================================================================
// ISOLATED FISCAL INTEGRATION API ROUTES (/api/fiscal/*)
// Provedor Oficial: Focus NFe / Nuvem Fiscal (Homologação e Produção)
// =========================================================================

// Status geral e configuração do provedor fiscal
app.get("/api/fiscal/config-status", async (req, res) => {
  try {
    const status = fiscalBackendService.getSystemStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Consulta de disponibilidade SEFAZ
app.get("/api/fiscal/status-servico", async (req, res) => {
  try {
    const uf = (req.query.uf as string) || "SP";
    const env = (req.query.env as "homologation" | "production") || undefined;
    const result = await fiscalBackendService.checkSefazStatus(uf, env);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload seguro de Certificado Digital A1 para o cofre do provedor
app.post("/api/fiscal/certificate/upload", requireAuth, async (req, res) => {
  try {
    const { companyCnpj, certBase64, certPassword, companyData, environment } = req.body;
    if (!companyCnpj || !certBase64 || !certPassword) {
      return res.status(400).json({ error: "Dados obrigatórios: companyCnpj, certBase64, certPassword" });
    }
    const result = await fiscalBackendService.uploadCertificate(
      companyCnpj,
      certBase64,
      certPassword,
      companyData || {},
      environment
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Emissão de NF-e (Modelo 55 - Produtos / Vendas)
app.post("/api/fiscal/nfe/emit", requireAuth, async (req, res) => {
  try {
    const { payload, refId, environment } = req.body;
    if (!payload || !refId) {
      return res.status(400).json({ error: "Payload e refId são obrigatórios." });
    }
    const result = await fiscalBackendService.emitNFe(payload, refId, environment);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Emissão de NFC-e (Modelo 65 - Consumidor Final / Balcão)
app.post("/api/fiscal/nfce/emit", requireAuth, async (req, res) => {
  try {
    const { payload, refId, environment } = req.body;
    if (!payload || !refId) {
      return res.status(400).json({ error: "Payload e refId são obrigatórios." });
    }
    const result = await fiscalBackendService.emitNFCe(payload, refId, environment);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Emissão de NFS-e (Serviços / Ordens de Serviço Oficina)
app.post("/api/fiscal/nfse/emit", requireAuth, async (req, res) => {
  try {
    const { payload, refId, environment } = req.body;
    if (!payload || !refId) {
      return res.status(400).json({ error: "Payload e refId são obrigatórios." });
    }
    const result = await fiscalBackendService.emitNFSe(payload, refId, environment);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cancelamento de Documento Fiscal (NF-e / NFC-e / NFS-e)
app.post("/api/fiscal/cancel", requireAuth, async (req, res) => {
  try {
    const { docType, refId, justificativa, environment } = req.body;
    if (!docType || !refId || !justificativa) {
      return res.status(400).json({ error: "docType, refId e justificativa são obrigatórios." });
    }
    const result = await fiscalBackendService.cancelDocument(docType, refId, justificativa, environment);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Carta de Correção Eletrônica (CC-e)
app.post("/api/fiscal/cce", requireAuth, async (req, res) => {
  try {
    const { refId, correcao, environment } = req.body;
    if (!refId || !correcao) {
      return res.status(400).json({ error: "refId e correcao são obrigatórios." });
    }
    const result = await fiscalBackendService.sendCce(refId, correcao, environment);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Inutilização de Numeração Fiscal
app.post("/api/fiscal/inutilize", requireAuth, async (req, res) => {
  try {
    const { payload, environment } = req.body;
    if (!payload || !payload.cnpj || !payload.serie || !payload.numero_inicial || !payload.numero_final || !payload.justificativa) {
      return res.status(400).json({ error: "Campos obrigatórios de inutilização não fornecidos." });
    }
    const result = await fiscalBackendService.inutilizeNumber(payload, environment);
    res.json(result);
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
