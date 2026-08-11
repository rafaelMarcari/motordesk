import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getDbInstance, checkDatabaseHealth, ensureAppStoreTableExists } from "./src/db/index.js";
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
  const dbHealth = await checkDatabaseHealth();
  const status = dbHealth.connected ? "ok" : "degraded";
  const statusCode = dbHealth.connected ? 200 : 503;

  res.status(statusCode).json({
    status,
    database: dbHealth.connected ? "connected" : "disconnected",
    databaseName: dbHealth.database || "cloud_sql_production_database",
    error: dbHealth.error || null,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// 4. ERP Database APIs - Cloud SQL PostgreSQL ONLY (No file backup, No fallback store)
app.get("/api/db", requireAuth, async (req, res) => {
  try {
    await ensureAppStoreTableExists();
    const db = getDbInstance();
    if (db) {
      const records = await db.select().from(appStore).where(eq(appStore.id, "motordesk_main"));
      if (records.length > 0 && records[0].data) {
        return res.json({ success: true, data: records[0].data, source: "cloud_sql" });
      }
    }
    return res.json({ success: true, data: null, source: "cloud_sql" });
  } catch (err: any) {
    console.error("Error loading database state from PostgreSQL Cloud SQL:", err);
    return res.status(500).json({ error: "Failed to load database from Cloud SQL", details: err.message });
  }
});

app.post("/api/db", requireAuth, async (req, res) => {
  try {
    const appData = req.body;
    if (!appData) {
      return res.status(400).json({ success: false, error: "Dados para salvamento ausentes" });
    }

    await ensureAppStoreTableExists();
    const db = getDbInstance();

    if (!db) {
      return res.status(503).json({ success: false, error: "Conexão com PostgreSQL Cloud SQL indisponível" });
    }

    await db.insert(appStore)
      .values({
        id: "motordesk_main",
        data: appData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appStore.id,
        set: {
          data: appData,
          updatedAt: new Date(),
        },
      });

    return res.json({
      success: true,
      message: "Database saved to PostgreSQL Cloud SQL",
      source: "cloud_sql",
    });
  } catch (err: any) {
    console.error("Error saving database state to PostgreSQL Cloud SQL:", err);
    return res.status(500).json({ error: "Failed to save database to Cloud SQL", details: err.message });
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
