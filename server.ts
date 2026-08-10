import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { getDbInstance, checkDatabaseHealth } from "./src/db/index.js";
import { appStore, clients as clientsTable, vehicles as vehiclesTable, parts as partsTable, serviceOrders as serviceOrdersTable } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { requireAuth } from "./src/middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Configurable CORS for Production (Vercel frontend) and Local Dev
const defaultOrigins = [
  "https://motordesk.app.br",
  "https://www.motordesk.app.br",
  "https://motordesk.ai.studio",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
];

if (process.env.CORS_ALLOWED_ORIGINS) {
  process.env.CORS_ALLOWED_ORIGINS.split(",").forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !defaultOrigins.includes(trimmed)) {
      defaultOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from Vercel frontend (motordesk.app.br), local dev, and all valid clients
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));

// Ensure JSON response header for all API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/') {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// Root API Welcome route
app.get("/", (req, res) => {
  res.json({
    service: "MotorDesk REST API",
    status: "online",
    healthEndpoint: "/api/health",
    version: "1.0.0"
  });
});

// Health Check API with real PostgreSQL connectivity test
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
    environment: process.env.NODE_ENV || "development"
  });
});

// ERP API Routes
app.get("/api/db", async (req, res) => {
  try {
    const db = getDbInstance();
    if (db) {
      const records = await db.select().from(appStore).where(eq(appStore.id, "motordesk_main"));
      if (records.length > 0) {
        return res.json({ success: true, data: records[0].data });
      }
    }
    return res.json({ success: true, data: null });
  } catch (err: any) {
    console.error("Error loading database state from PostgreSQL Cloud SQL:", err);
    return res.status(500).json({ error: "Failed to load database from Cloud SQL", details: err.message });
  }
});

app.post("/api/db", async (req, res) => {
  try {
    const db = getDbInstance();
    const appData = req.body;
    if (db && appData) {
      await db.insert(appStore)
        .values({
          id: "motordesk_main",
          data: appData,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: appStore.id,
          set: {
            data: appData,
            updatedAt: new Date()
          }
        });
      return res.json({ success: true, message: "Database saved to PostgreSQL Cloud SQL" });
    }
    return res.status(503).json({ success: false, message: "PostgreSQL database instance unavailable" });
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
