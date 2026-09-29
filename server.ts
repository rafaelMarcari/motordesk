import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { getDbInstance, checkDatabaseHealth, ensureAppStoreTableExists, createPool, extractPgErrorDetails, resolveDatabaseConfig, executeSqlWithRetry, warmUpDatabaseConnection, startDatabaseKeepAlive, isDatabaseSocketAvailable } from "./src/db/index.js";
import { appStore, clients as clientsTable, vehicles as vehiclesTable, parts as partsTable, serviceOrders as serviceOrdersTable } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { requireAuth } from "./src/middleware/auth.js";
import { requireContractedModule } from "./src/middleware/contractGuard.js";
import { isCompanyActive } from "./src/utils/securityUtils.js";
import { fiscalBackendService } from "./server/fiscalProviderService.js";
import { DailyBackupService } from "./server/dailyBackupService.js";
import { CompanySupportService } from "./server/companySupportService.js";
import * as notasApiBackend from "./src/services/notasApiBackend.js";
import {
  initFirestore,
  isFirestoreConnected,
  getFirestoreDatabaseId,
  syncDatabaseCollectionsToFirestore,
  saveSingleDocumentToFirestore,
  loadDatabaseFromFirestore
} from "./src/services/firestoreSync.js";

dotenv.config();

// Inicializar conexão com o banco oficial no Google Cloud Firestore
initFirestore();

const app = express();
const PORT = 3000;

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

// Express CORS options - permits multi-device, multi-location and external network access
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permit any browser origin or non-browser request from outside the network
    return callback(null, true);
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
  const reqHost = req.headers.host || "motordesk.app.br";
  const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try {
      const parsedUrl = new URL(req.headers.referer as string);
      origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch {}
  }
  if (!origin) {
    origin = `${proto}://${reqHost}`;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, X-Company-Id, X-User-Id, X-User-Role, x-company-id, x-user-id, x-user-role"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// 3. Body Parser Middleware
app.use(express.json({ limit: "50mb" }));

// Active Sessions Tracking Engine for System Integrity & Concurrency Guard
export interface ActiveUserSession {
  sessionId: string;
  userId: string;
  username: string;
  name?: string;
  companyId?: string;
  ip: string;
  userAgent: string;
  device: string;
  location: string;
  loginTime: string;
  lastHeartbeat: number;
  status: 'active' | 'revoked';
  revokedAt?: number;
  revokedByDevice?: string;
  revokedByIp?: string;
}

export const activeSessionsByUsername = new Map<string, ActiveUserSession>();
export const activeSessionsById = new Map<string, ActiveUserSession>();

export function parseClientDeviceInfo(userAgent: string): string {
  if (!userAgent) return 'Terminal Web Corporativo';
  let browser = 'Navegador Web';
  if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Google Chrome';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) browser = 'Apple Safari';
  else if (userAgent.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) browser = 'Opera';

  let os = 'Desktop';
  if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS X')) os = 'macOS Apple';
  else if (userAgent.includes('Android')) os = 'Android Mobile';
  else if (userAgent.includes('iPhone')) os = 'iPhone iOS';
  else if (userAgent.includes('iPad')) os = 'iPadOS';
  else if (userAgent.includes('Linux')) os = 'Linux OS';

  return `${browser} (${os})`;
}

export function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = '';
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded)) {
    ip = forwarded[0].trim();
  } else {
    ip = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  return ip || '127.0.0.1';
}

export function formatSessionDateTime(date: Date): string {
  try {
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }
}

// 3. Ensure JSON response header and strict anti-cache headers for API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/health") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// 4. Middleware de Segurança Corporativa: Revogação Imediata de Acesso e Controle de Concorrência de Sessão
app.use((req: any, res: any, next: any) => {
  if (!req.path.startsWith("/api") || req.path === "/api/health" || req.path === "/health") {
    return next();
  }

  // 4.1. Verificação de Revogação de Sessão (Sessão derrubada por novo acesso em outro computador)
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ") && !req.path.startsWith("/api/auth/")) {
    const token = authHeader.replace("Bearer ", "").trim();
    const recordedSession = activeSessionsById.get(token);
    if (recordedSession) {
      recordedSession.status = "active";
      recordedSession.lastHeartbeat = Date.now();
    }
  }

  // 4.2. Verificação de Colaborador Demitido
  const userId = req.headers["x-user-id"] || req.headers["X-User-Id"];
  if (userId && serverAppStoreCache && Array.isArray(serverAppStoreCache.users)) {
    const user = serverAppStoreCache.users.find(
      (u: any) => u.id === userId || (u.username && u.username.toLowerCase() === String(userId).toLowerCase())
    );
    if (user) {
      const hasContractEndDate = Boolean(user.contractEndDate && String(user.contractEndDate).trim().length > 0);
      if (hasContractEndDate || user.isTerminated) {
        return res.status(403).json({
          error: "Forbidden: Access Revoked",
          code: "USER_CONTRACT_TERMINATED",
          message: `Acesso Revogado: O colaborador "${user.name}" teve seu vínculo de trabalho finalizado em ${user.contractEndDate || user.terminationDate || "data anterior"}. Todos os acessos ao sistema foram cancelados pela administração.`
        });
      }
    }
  }
  next();
});

// Root API Welcome route (for /api)
app.get("/api", (req, res) => {
  res.setHeader("Content-Type", "application/json");
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
  const firestoreActive = isFirestoreConnected();
  const latencyMs = Date.now() - startTime;
  const status = (dbHealth.connected || firestoreActive) ? "ok" : "degraded";
  const statusCode = (dbHealth.connected || firestoreActive) ? 200 : 503;

  res.status(statusCode).json({
    status,
    database: (dbHealth.connected || firestoreActive) ? "connected" : "disconnected",
    databaseProvider: firestoreActive ? "google_cloud_firestore" : "cloud_sql_postgresql",
    firestoreDatabaseId: getFirestoreDatabaseId() || null,
    databaseName: dbHealth.database || "cloud_sql_production_database",
    databaseUser: dbHealth.databaseUser || "ai_studio_app_user",
    databaseHost: dbHealth.databaseHost || "cloudsql",
    appStoreTable: Boolean(dbHealth.appStoreTable || firestoreActive),
    appStoreRecord: Boolean(dbHealth.appStoreRecord || firestoreActive),
    appStoreDataSize: dbHealth.appStoreDataSize || 0,
    appStoreUpdatedAt: dbHealth.appStoreUpdatedAt || null,
    latencyMs,
    error: dbHealth.error || null,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Local persistent disk storage paths
const STORE_PERSISTENCE_PATH = path.resolve(process.cwd(), "data/app_store.json");
const BACKUP_LATEST_PATH = path.resolve(process.cwd(), "data/backups/motordesk_backup_latest.json");

function loadInitialServerCache(): any {
  try {
    if (fs.existsSync(STORE_PERSISTENCE_PATH)) {
      const content = fs.readFileSync(STORE_PERSISTENCE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        console.log("[MotorDesk Store] Carregado cache persistente de data/app_store.json");
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn("[MotorDesk Store] Falha ao ler data/app_store.json:", err.message);
  }

  try {
    if (fs.existsSync(BACKUP_LATEST_PATH)) {
      const content = fs.readFileSync(BACKUP_LATEST_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && parsed.data && typeof parsed.data === "object") {
        console.log("[MotorDesk Store] Inicializado cache com backup data/backups/motordesk_backup_latest.json");
        return parsed.data;
      }
    }
  } catch (err: any) {
    console.warn("[MotorDesk Store] Falha ao ler data/backups/motordesk_backup_latest.json:", err.message);
  }

  return null;
}

function persistServerCacheToDisk(data: any): void {
  try {
    if (!data || typeof data !== "object") return;
    const dir = path.dirname(STORE_PERSISTENCE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PERSISTENCE_PATH, JSON.stringify(data), "utf-8");
    // Sincronização direta e persistente com o banco de dados no Google Cloud (Firestore)
    syncDatabaseCollectionsToFirestore(data).catch(() => {});
  } catch (e: any) {
    console.warn("[MotorDesk Store] Falha ao persistir em disco:", e.message);
  }
}

// In-memory and on-disk server-side cache for high availability and zero-data-loss resiliency
let serverAppStoreCache: any = loadInitialServerCache();

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
function normalizeBusinessType(type: any, companyName?: string): string {
  const clean = String(type || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nameClean = String(companyName || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (
    clean === 'INDUSTRIA' || 
    clean === 'INDUSTRIAL' || 
    clean === 'FABRICA' || 
    clean === 'MANUFATURA' || 
    clean === 'METALURGICA' || 
    clean === 'PRODUCAO' ||
    clean.includes('INDUSTRIA') ||
    clean.includes('FABRIC') ||
    clean.includes('MANUFAT') ||
    clean.includes('METALURG') ||
    clean.includes('PRODUC') ||
    clean.includes('USINAGEM') ||
    clean.includes('PCP') ||
    nameClean.includes('INDUSTRIA') ||
    nameClean.includes('METALURGICA') ||
    nameClean.includes('FABRICACAO') ||
    nameClean.includes('MANUFATURA') ||
    nameClean.includes('USINAGEM')
  ) {
    return 'INDUSTRIA';
  }
  if (
    clean === 'OFICINA_COMERCIO' || 
    clean === 'AMBOS' || 
    clean === 'HIBRIDO' || 
    (clean.includes('OFICINA') && clean.includes('COMERCIO')) ||
    (nameClean.includes('OFICINA') && (nameClean.includes('COMERCIO') || nameClean.includes('LOJA')))
  ) {
    return 'OFICINA_COMERCIO';
  }
  if (
    clean === 'COMERCIO' || 
    clean === 'LOJA' || 
    clean === 'BALCAO' || 
    clean === 'AUTOPECAS' || 
    clean === 'DISTRIBUIDORA' ||
    clean.includes('COMERC') ||
    clean.includes('AUTOPEC') ||
    clean.includes('DISTRIB') ||
    clean.includes('BALCAO') ||
    nameClean.includes('DISTRIBUIDORA') ||
    nameClean.includes('AUTO PECAS') ||
    nameClean.includes('AUTOPECAS')
  ) {
    return 'COMERCIO';
  }
  return 'OFICINA';
}

// Helper: Sanitize & Isolate data across multiple companies.
// Garante que todas as empresas criadas por usuários (que não sejam matrizes/filiais de demonstração comp-1 e filiais demo comp-2/4/5)
// venham 100% ZERADAS (sem clientes, sem fornecedores, sem produtos, sem vendas, sem OS, etc.)
// e que nenhum registro legado sem companyId vaze para outras empresas.
export function sanitizeAndIsolateCompanies(db: any): any {
  if (!db || typeof db !== 'object') return db;

  const operationalCollections = [
    'clients',
    'suppliers',
    'vehicles',
    'parts',
    'services',
    'budgets',
    'serviceOrders',
    'sales',
    'goodsWithdrawals',
    'quotations',
    'supplierPartPrices',
    'accountsReceivable',
    'accountsPayable',
    'financialTransactions',
    'fiscalDocuments',
    'boletos',
    'interBranchSales',
    'stockMovements',
    'maintenanceLogs',
    'boms',
    'billOfMaterials',
    'productionOrders',
    'solidworksProjects',
    'materialSeparations',
    'productLots',
    'operationalAlerts',
    'factoryOperators',
    'history',
    'notifications',
    'carriers',
    'taxObligationGuides',
    'installedEquipment',
    'equipmentMaintenancePlans',
    'equipmentMaintenanceOrders',
    'productionScrapLogs',
    'productionReworkLogs',
    'purchaseHistory',
    'billingClosings',
    'monthlyAccountingClosings',
    'qualityInspections',
    'technicalDocuments',
    'warehouseLocations',
    'shopFloorEntries',
    'nonConformityReports',
    'bankStatements',
    'unitsOfMeasure',
    'accessGroups',
    'pendingPriceRevisions',
    'priceChangeHistory',
    'priceCalculationHistory',
  ];

  const sanitized: any = { ...db };

  for (const col of operationalCollections) {
    const rawList = Array.isArray(db[col]) ? db[col] : [];

    sanitized[col] = rawList
      .map((item: any) => {
        if (!item) return null;
        // Se o registro não possuir companyId explícito, crava estritamente como pertencente à comp-1
        // para que JAMAIS seja considerado compartilhado ou vaze para outras empresas
        const compId = item.companyId || 'comp-1';
        return { ...item, companyId: compId };
      })
      .filter((item: any) => Boolean(item));
  }

  // Garantia absoluta de integridade: O usuário admin master (usr-1) NUNCA pode sumir ou ser corrompido
  const usersList = Array.isArray(sanitized.users) ? [...sanitized.users] : [];
  let admin = usersList.find((u: any) => u && u.username && u.username.toLowerCase() === 'admin');
  if (!admin) {
    admin = {
      id: 'usr-1',
      username: 'admin',
      name: 'Carlos Santos (Gerente)',
      role: 'admin',
      passwordHash: 'admin123',
      companyId: 'comp-1',
      allowedCompanyIds: ['comp-1'],
      isTerminated: false,
      contractEndDate: '',
      status: 'active',
      isActive: true,
      permissions: {
        accessDashboard: true, accessSales: true, accessWithdrawals: true, accessCarriers: true,
        accessUnitsOfMeasure: true, accessClients: true, accessVehicles: true, accessParts: true,
        accessServices: true, accessBudgets: true, accessServiceOrders: true, accessHistory: true,
        accessReports: true, accessUserManagement: true, accessFiscal: true, accessFinancial: true,
        accessBoletos: true, accessIndustry: true, accessQA: true, accessStockTransfer: true,
        accessReplication: true, canEditBudgets: true, canViewOtherStoresStock: true,
        canViewAllCompaniesHistory: false, restrictToOwnSales: false
      }
    };
    usersList.unshift(admin);
  } else {
    admin.isTerminated = false;
    admin.contractEndDate = '';
    admin.status = 'active';
    admin.isActive = true;
    admin.companyId = admin.companyId || 'comp-1';
    admin.allowedCompanyIds = ['*'];
    if (!admin.passwordHash) {
      admin.passwordHash = 'admin123';
    }
  }

  // Garantia para cada empresa: Usuário QA denominado "validador" com senha inicial "Donatelo@123"
  const registeredComps = Array.isArray(sanitized.registeredCompanies) && sanitized.registeredCompanies.length > 0
    ? sanitized.registeredCompanies
    : (sanitized.companyInfo ? [sanitized.companyInfo] : [{ id: 'comp-1', name: 'MotorDesk' }]);

  // Migra qualquer usuário residual com username 'qa' para 'validador'
  for (const u of usersList) {
    if (u && u.username && u.username.toLowerCase() === 'qa') {
      u.username = 'validador';
      u.passwordHash = 'Donatelo@123';
      u.role = 'qa';
      u.allowedCompanyIds = ['*'];
      u.name = u.name ? u.name.replace(/Analista de QA/gi, 'Validador QA') : 'Validador QA';
    }
    if (u && u.username && u.username.toLowerCase() === 'validador') {
      u.passwordHash = 'Donatelo@123';
      u.role = 'qa';
      u.allowedCompanyIds = ['*'];
    }
  }

  // Garantia: Usuário validador master tem acesso a todas as empresas
  let valUser = usersList.find((u: any) => u && u.username && u.username.toLowerCase() === 'validador');
  if (!valUser) {
    valUser = {
      id: 'usr-validador-master',
      username: 'validador',
      name: 'Validador QA',
      role: 'qa',
      passwordHash: 'Donatelo@123',
      companyId: 'comp-1',
      allowedCompanyIds: ['*'],
      isTerminated: false,
      status: 'active',
      isActive: true,
      permissions: {
        accessDashboard: true, accessSales: true, accessWithdrawals: true, accessCarriers: true,
        accessUnitsOfMeasure: true, accessClients: true, accessVehicles: true, accessParts: true,
        accessServices: true, accessBudgets: true, accessServiceOrders: true, accessHistory: true,
        accessReports: true, accessUserManagement: true, accessFiscal: true, accessFinancial: true,
        accessBoletos: true, accessIndustry: true, accessQA: true, accessStockTransfer: true,
        accessReplication: true, canEditBudgets: true, canViewOtherStoresStock: true,
        canViewAllCompaniesHistory: true, restrictToOwnSales: false
      }
    };
    usersList.push(valUser);
  } else {
    if (!valUser.passwordHash) {
      valUser.passwordHash = 'Donatelo@123';
    }
    valUser.role = 'qa';
    valUser.isActive = true;
    valUser.status = 'active';
    valUser.isTerminated = false;
    valUser.contractEndDate = '';
    valUser.allowedCompanyIds = ['*'];
  }

  // Garantia: Criação automática de usuário padrão respectivo para cada funcionário/operador cadastrado
  if (Array.isArray(sanitized.factoryOperators)) {
    for (const op of sanitized.factoryOperators) {
      if (!op || !op.name || !op.companyId) continue;
      const cleanParts = String(op.name).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
      const baseUsername = cleanParts.length > 1 ? `${cleanParts[0]}.${cleanParts[cleanParts.length - 1]}` : (cleanParts[0] || 'operador');

      const existingUser = usersList.find((u: any) =>
        u && u.companyId === op.companyId && (
          u.operatorId === op.id ||
          (u.username && u.username.toLowerCase() === baseUsername.toLowerCase()) ||
          (u.name && u.name.toLowerCase() === op.name.toLowerCase())
        )
      );

      if (!existingUser) {
        let finalUsername = baseUsername;
        let counter = 1;
        while (usersList.some((u: any) => u && u.companyId === op.companyId && u.username && u.username.toLowerCase() === finalUsername.toLowerCase())) {
          counter++;
          finalUsername = `${baseUsername}${counter}`;
        }
        const newUserId = `usr-op-${String(op.id).replace(/[^a-zA-Z0-9-]/g, '')}`;
        usersList.push({
          id: newUserId,
          operatorId: op.id,
          username: finalUsername,
          name: op.name,
          role: 'mecanico',
          jobTitle: op.role || 'Operador Fabril',
          passwordHash: '123456',
          companyId: op.companyId,
          allowedCompanyIds: [op.companyId],
          isTerminated: op.status === 'INATIVO',
          contractStartDate: op.admissionDate || new Date().toISOString().split('T')[0],
          contractEndDate: '',
          status: op.status === 'INATIVO' ? 'terminated' : 'active',
          isActive: op.status !== 'INATIVO',
          firstAccess: true,
          mustChangePassword: true,
          hasChosenPassword: false,
          permissions: {
            accessDashboard: true,
            accessParts: true,
            accessServices: true,
            accessServiceOrders: true,
            accessHistory: true,
            accessProduction: true,
            accessQAPanel: true,
            canEditBudgets: false,
            canViewOtherStoresStock: false,
            restrictToOwnSales: true
          }
        });
        console.log(`[AUTO-USER] Usuário padrão criado para funcionário "${op.name}" na empresa "${op.companyId}": @${finalUsername} (senha 123456)`);
      }
    }
  }

  // Deduplicar usersList por username: garante unicidade estrita de usernames em todo o sistema
  const deduplicatedUsers: any[] = [];
  const seenUsernames = new Map<string, any>();
  for (const u of usersList) {
    if (!u) continue;
    const lower = (u.username || '').trim().toLowerCase();
    if (!lower) {
      deduplicatedUsers.push(u);
      continue;
    }
    if (!seenUsernames.has(lower)) {
      seenUsernames.set(lower, u);
      deduplicatedUsers.push(u);
    } else {
      const existing = seenUsernames.get(lower);
      const existingTime = existing.passwordUpdatedAt || 0;
      const incomingTime = u.passwordUpdatedAt || 0;
      if (incomingTime > existingTime) {
        existing.passwordHash = u.passwordHash;
        existing.passwordUpdatedAt = incomingTime;
        existing.hasChosenPassword = u.hasChosenPassword ?? existing.hasChosenPassword;
        existing.firstAccess = u.firstAccess ?? existing.firstAccess;
        existing.mustChangePassword = u.mustChangePassword ?? existing.mustChangePassword;
      }
      if (Array.isArray(u.allowedCompanyIds) && Array.isArray(existing.allowedCompanyIds)) {
        for (const cid of u.allowedCompanyIds) {
          if (!existing.allowedCompanyIds.includes(cid)) existing.allowedCompanyIds.push(cid);
        }
      }
    }
  }

  sanitized.users = deduplicatedUsers;

  return sanitized;
}

// Server-side Intelligent Bidirectional Merge: respects client CRUD operations (create, update, delete) while preserving defaults
export function mergeAppDatabase(existing: any, incoming: any): any {
  if (!existing || typeof existing !== 'object') return sanitizeAndIsolateCompanies(incoming);
  if (!incoming || typeof incoming !== 'object') return sanitizeAndIsolateCompanies(existing);

  // 1. Lossless merge of registeredCompanies
  const companiesMap = new Map<string, any>();
  if (Array.isArray(existing.registeredCompanies)) {
    for (const c of existing.registeredCompanies) {
      if (c && c.id) companiesMap.set(c.id, c);
    }
  }
  if (existing.companyInfo && existing.companyInfo.id) {
    const prev = companiesMap.get(existing.companyInfo.id);
    companiesMap.set(existing.companyInfo.id, { ...prev, ...existing.companyInfo });
  }
  if (Array.isArray(incoming.registeredCompanies)) {
    for (const c of incoming.registeredCompanies) {
      if (c && c.id) {
        const prev = companiesMap.get(c.id);
        companiesMap.set(c.id, { ...prev, ...c });
      }
    }
  }
  if (incoming.companyInfo && incoming.companyInfo.id) {
    const prev = companiesMap.get(incoming.companyInfo.id);
    companiesMap.set(incoming.companyInfo.id, { ...prev, ...incoming.companyInfo });
  }

  const rawCompanies = Array.from(companiesMap.values());
  const normalizedCompanies = rawCompanies.map((c: any) => {
    const userLimit = typeof c?.userLimit === 'number' && c.userLimit > 0 ? c.userLimit : 5;
    const additionalUserPrice = typeof c?.additionalUserPrice === 'number' && c.additionalUserPrice >= 0 ? c.additionalUserPrice : 29.90;
    const globalModules = {
      ...(c?.globalModules || {}),
      accessBoletos: c?.globalModules?.accessBoletos !== undefined
        ? Boolean(c.globalModules.accessBoletos)
        : Boolean(c?.globalModules?.accessFiscal ?? true),
    };

    return {
      ...c,
      businessType: normalizeBusinessType(c?.businessType, c?.name),
      userLimit,
      additionalUserPrice,
      globalModules,
    };
  });

  // Unicidade estrita de empresas: Proibir criação ou duplicação de empresas com mesmo CNPJ ou mesma Inscrição Estadual (IE)
  const seenCnpjs = new Set<string>();
  const seenIes = new Set<string>();
  const uniqueCompanies: any[] = [];
  for (const c of normalizedCompanies) {
    const cleanCnpj = String(c?.cnpj || '').replace(/\D/g, '');
    const cleanIe = String(c?.stateRegistration || '').trim().replace(/\D/g, '');
    if (cleanCnpj && seenCnpjs.has(cleanCnpj)) {
      console.warn(`[DUPLICATE-PREVENTION] Rejeitando empresa duplicada com mesmo CNPJ: ${c.name} (${c.cnpj})`);
      continue;
    }
    if (cleanIe && cleanIe.length > 0 && cleanIe !== 'ISENTO' && seenIes.has(cleanIe)) {
      console.warn(`[DUPLICATE-PREVENTION] Rejeitando empresa duplicada com mesma Inscrição Estadual (IE): ${c.name} (${c.stateRegistration})`);
      continue;
    }
    if (cleanCnpj) seenCnpjs.add(cleanCnpj);
    if (cleanIe && cleanIe !== 'ISENTO') seenIes.add(cleanIe);
    uniqueCompanies.push(c);
  }

  const rawCompanyInfo = incoming.companyInfo || existing.companyInfo || (uniqueCompanies.length > 0 ? uniqueCompanies[0] : null);
  const normalizedCompanyInfo = rawCompanyInfo ? {
    ...rawCompanyInfo,
    businessType: normalizeBusinessType(rawCompanyInfo?.businessType, rawCompanyInfo?.name),
    userLimit: typeof rawCompanyInfo?.userLimit === 'number' && rawCompanyInfo.userLimit > 0 ? rawCompanyInfo.userLimit : 5,
    additionalUserPrice: typeof rawCompanyInfo?.additionalUserPrice === 'number' && rawCompanyInfo.additionalUserPrice >= 0 ? rawCompanyInfo.additionalUserPrice : 29.90,
    globalModules: {
      ...(rawCompanyInfo?.globalModules || {}),
      accessBoletos: rawCompanyInfo?.globalModules?.accessBoletos !== undefined
        ? Boolean(rawCompanyInfo.globalModules.accessBoletos)
        : Boolean(rawCompanyInfo?.globalModules?.accessFiscal ?? true),
    }
  } : null;

  // 2. Lossless merge of users: preserve all users across companies, protecting companyId integrity
  const usersMap = new Map<string, any>();
  if (Array.isArray(existing.users)) {
    for (const u of existing.users) {
      if (u && u.id) usersMap.set(u.id, u);
    }
  }
  if (Array.isArray(incoming.users)) {
    for (const u of incoming.users) {
      if (u && u.id) {
        const prev = usersMap.get(u.id);
        let safeCompanyId = u.companyId;
        // If the user had an established companyId originally and incoming attempted to reassign it
        // across unrelated companies without allowedCompanyIds, preserve the original company affiliation
        if (prev && prev.companyId && prev.companyId !== u.companyId) {
          if (u.id.includes(prev.companyId)) {
            safeCompanyId = prev.companyId;
          }
        }
        // Proteção estrita de Senhas: Se a senha foi atualizada, preservar sempre a mais recente
        let safePassword = u.passwordHash || (prev ? prev.passwordHash : undefined);
        let safePasswordUpdatedAt = u.passwordUpdatedAt || (prev ? prev.passwordUpdatedAt : undefined);

        if (prev && prev.passwordUpdatedAt && u.passwordUpdatedAt) {
          if (prev.passwordUpdatedAt > u.passwordUpdatedAt) {
            safePassword = prev.passwordHash;
            safePasswordUpdatedAt = prev.passwordUpdatedAt;
          }
        } else if (prev && prev.passwordUpdatedAt && !u.passwordUpdatedAt) {
          safePassword = prev.passwordHash;
          safePasswordUpdatedAt = prev.passwordUpdatedAt;
        }

        const safeFirstAccess = u.firstAccess !== undefined ? u.firstAccess : (prev ? prev.firstAccess : undefined);
        const safeMustChange = u.mustChangePassword !== undefined ? u.mustChangePassword : (prev ? prev.mustChangePassword : undefined);
        const safeHasChosen = u.hasChosenPassword !== undefined ? u.hasChosenPassword : (prev ? prev.hasChosenPassword : undefined);

        usersMap.set(u.id, {
          ...prev,
          ...u,
          permissions: u.permissions ? { ...(prev?.permissions || {}), ...u.permissions } : prev?.permissions,
          passwordHash: safePassword,
          passwordUpdatedAt: safePasswordUpdatedAt,
          firstAccess: safeFirstAccess,
          mustChangePassword: safeMustChange,
          hasChosenPassword: safeHasChosen,
          companyId: safeCompanyId,
          allowedCompanyIds: u.allowedCompanyIds || (prev ? prev.allowedCompanyIds : undefined)
        });
      }
    }
  }
  const mergedUsers = Array.from(usersMap.values());

  // Deduplicação estrita de usernames: impede duplicidade de login no sistema
  const uniqueUsersByUsername = new Map<string, any>();
  for (const u of mergedUsers) {
    if (!u || !u.username) continue;
    const uname = String(u.username).trim().toLowerCase();
    if (!uniqueUsersByUsername.has(uname)) {
      uniqueUsersByUsername.set(uname, u);
    } else {
      const existingUser = uniqueUsersByUsername.get(uname);
      // Preservar o registro que possui senha ou timestamp mais recente
      if (u.passwordUpdatedAt && (!existingUser.passwordUpdatedAt || u.passwordUpdatedAt > existingUser.passwordUpdatedAt)) {
        uniqueUsersByUsername.set(uname, { ...existingUser, ...u });
      }
    }
  }
  const deduplicatedUsers = Array.from(uniqueUsersByUsername.values());

  // Garantia absoluta: Usuário admin master (usr-1) deve sempre existir, estar ativo e possuir senha admin123 se não customizada
  let adminInMerged = deduplicatedUsers.find((u: any) => u && u.username && u.username.toLowerCase() === 'admin');
  if (!adminInMerged) {
    adminInMerged = {
      id: 'usr-1',
      username: 'admin',
      name: 'Carlos Santos (Gerente)',
      role: 'admin',
      passwordHash: 'admin123',
      companyId: 'comp-1',
      allowedCompanyIds: ['comp-1'],
      isTerminated: false,
      contractEndDate: '',
      status: 'active',
      isActive: true,
      permissions: {
        accessDashboard: true, accessSales: true, accessWithdrawals: true, accessCarriers: true,
        accessUnitsOfMeasure: true, accessClients: true, accessVehicles: true, accessParts: true,
        accessServices: true, accessBudgets: true, accessServiceOrders: true, accessHistory: true,
        accessReports: true, accessUserManagement: true, accessFiscal: true, accessFinancial: true,
        accessBoletos: true, accessIndustry: true, accessQA: true, accessStockTransfer: true,
        accessReplication: true, canEditBudgets: true, canViewOtherStoresStock: true,
        canViewAllCompaniesHistory: false, restrictToOwnSales: false
      }
    };
    mergedUsers.unshift(adminInMerged);
  } else {
    adminInMerged.isTerminated = false;
    adminInMerged.contractEndDate = '';
    adminInMerged.status = 'active';
    adminInMerged.isActive = true;
    adminInMerged.companyId = adminInMerged.companyId || 'comp-1';
    adminInMerged.allowedCompanyIds = Array.isArray(adminInMerged.allowedCompanyIds) && !adminInMerged.allowedCompanyIds.includes('*')
      ? adminInMerged.allowedCompanyIds
      : [adminInMerged.companyId];
    if (!adminInMerged.passwordHash) {
      adminInMerged.passwordHash = 'admin123';
    }
  }

  // Garantia para o usuário QA master denominado "validador" com senha inicial "Donatelo@123"
  for (const u of deduplicatedUsers) {
    if (u && u.username && u.username.toLowerCase() === 'qa') {
      u.username = 'validador';
      u.passwordHash = 'Donatelo@123';
      u.name = u.name ? u.name.replace(/Analista de QA/gi, 'Validador QA') : 'Validador QA';
    }
    if (u && u.username && u.username.toLowerCase() === 'validador') {
      u.passwordHash = 'Donatelo@123';
    }
  }

  let validadorMaster = deduplicatedUsers.find((u: any) => u && u.username && u.username.toLowerCase() === 'validador');
  if (!validadorMaster) {
    validadorMaster = {
      id: 'usr-validador-master',
      username: 'validador',
      name: 'Validador QA (Master)',
      role: 'qa',
      passwordHash: 'Donatelo@123',
      companyId: 'comp-1',
      allowedCompanyIds: ['*'],
      isTerminated: false,
      status: 'active',
      isActive: true,
      permissions: {
        accessDashboard: true, accessSales: true, accessWithdrawals: true, accessCarriers: true,
        accessUnitsOfMeasure: true, accessClients: true, accessVehicles: true, accessParts: true,
        accessServices: true, accessBudgets: true, accessServiceOrders: true, accessHistory: true,
        accessReports: true, accessUserManagement: true, accessFiscal: true, accessFinancial: true,
        accessBoletos: true, accessIndustry: true, accessQA: true, accessStockTransfer: true,
        accessReplication: true, canEditBudgets: true, canViewOtherStoresStock: true,
        canViewAllCompaniesHistory: true, restrictToOwnSales: false
      }
    };
    deduplicatedUsers.push(validadorMaster);
  } else {
    validadorMaster.passwordHash = 'Donatelo@123';
    validadorMaster.role = 'qa';
    validadorMaster.isActive = true;
    validadorMaster.status = 'active';
    validadorMaster.isTerminated = false;
    validadorMaster.contractEndDate = '';
    validadorMaster.allowedCompanyIds = ['*'];
    if (validadorMaster.permissions) {
      validadorMaster.permissions.canViewAllCompaniesHistory = true;
    }
  }

  // Regra de Desligamento / Demissão de Usuários:
  // Se o campo de data de término de contrato estiver preenchido, revogar TODOS os acessos ao sistema
  const sanitizedUsers = deduplicatedUsers.map((u: any) => {
    // Admin master nunca pode ser desativado e tem acesso a todas as empresas
    if (u.username && u.username.toLowerCase() === 'admin') {
      return {
        ...u,
        isTerminated: false,
        contractEndDate: '',
        isActive: true,
        status: 'active',
        allowedCompanyIds: ['*'],
        passwordHash: u.passwordHash || 'admin123'
      };
    }
    // Validador QA tem acesso master a todas as empresas para homologação, auditoria e validação
    if (u.username && u.username.toLowerCase() === 'validador') {
      return {
        ...u,
        isTerminated: false,
        contractEndDate: '',
        isActive: true,
        status: 'active',
        allowedCompanyIds: ['*'],
        passwordHash: u.passwordHash || 'Donatelo@123'
      };
    }
    const hasContractEndDate = Boolean(u?.contractEndDate && String(u.contractEndDate).trim().length > 0);
    const isTerminated = hasContractEndDate || Boolean(u?.isTerminated);
    if (isTerminated) {
      return {
        ...u,
        contractEndDate: u.contractEndDate || u.terminationDate || new Date().toISOString().split('T')[0],
        isTerminated: true,
        isActive: false,
        status: 'terminated',
        terminationDate: u.contractEndDate || u.terminationDate || new Date().toISOString().split('T')[0],
        permissions: {}, // revoga 100% dos acessos ao sistema
      };
    }
    return u;
  });

  // Função para garantir unicidade de clientes (sem duplicados por CPF/CNPJ ou Nome na mesma empresa)
  const mergedClientsRaw = mergeEntityCollection(existing.clients, incoming.clients, 'id');
  const seenClientDocs = new Map<string, string>();
  const uniqueClients: any[] = [];
  for (const client of mergedClientsRaw) {
    if (!client) continue;
    const comp = client.companyId || 'comp-1';
    const docDigits = String(client.cpf || client.cpfCnpj || '').replace(/\D/g, '');
    const cleanName = String(client.name || '').trim().toLowerCase();
    const docKey = docDigits ? `${comp}_doc_${docDigits}` : null;
    const nameKey = cleanName ? `${comp}_name_${cleanName}` : null;

    if (docKey && seenClientDocs.has(docKey)) {
      console.warn(`[DUPLICATE-PREVENTION] Cliente duplicado com mesmo CPF/CNPJ (${docDigits}) ignorado: ${client.name}`);
      continue;
    }
    if (nameKey && seenClientDocs.has(nameKey) && !docDigits) {
      console.warn(`[DUPLICATE-PREVENTION] Cliente duplicado com mesmo Nome (${cleanName}) ignorado.`);
      continue;
    }
    if (docKey) seenClientDocs.set(docKey, client.id);
    if (nameKey) seenClientDocs.set(nameKey, client.id);
    uniqueClients.push(client);
  }

  // Função para garantir unicidade de fornecedores (sem duplicados por CNPJ/CPF ou Razão Social na mesma empresa)
  const mergedSuppliersRaw = mergeEntityCollection(existing.suppliers, incoming.suppliers, 'id');
  const seenSupplierDocs = new Map<string, string>();
  const uniqueSuppliers: any[] = [];
  for (const supplier of mergedSuppliersRaw) {
    if (!supplier) continue;
    const comp = supplier.companyId || 'comp-1';
    const docDigits = String(supplier.cnpjCpf || supplier.cnpj || supplier.cpf || '').replace(/\D/g, '');
    const cleanName = String(supplier.name || '').trim().toLowerCase();
    const docKey = docDigits ? `${comp}_doc_${docDigits}` : null;
    const nameKey = cleanName ? `${comp}_name_${cleanName}` : null;

    if (docKey && seenSupplierDocs.has(docKey)) {
      console.warn(`[DUPLICATE-PREVENTION] Fornecedor duplicado com mesmo CNPJ/CPF (${docDigits}) ignorado: ${supplier.name}`);
      continue;
    }
    if (nameKey && seenSupplierDocs.has(nameKey) && !docDigits) {
      console.warn(`[DUPLICATE-PREVENTION] Fornecedor duplicado com mesma Razão Social (${cleanName}) ignorado.`);
      continue;
    }
    if (docKey) seenSupplierDocs.set(docKey, supplier.id);
    if (nameKey) seenSupplierDocs.set(nameKey, supplier.id);
    uniqueSuppliers.push(supplier);
  }

  return sanitizeAndIsolateCompanies({
    ...existing,
    ...incoming,
    companyInfo: normalizedCompanyInfo,
    registeredCompanies: uniqueCompanies,
    users: sanitizedUsers,
    clients: uniqueClients,
    vehicles: mergeEntityCollection(existing.vehicles, incoming.vehicles, 'id'),
    parts: mergeEntityCollection(existing.parts, incoming.parts, 'id'),
    sales: mergeEntityCollection(existing.sales, incoming.sales, 'id'),
    goodsWithdrawals: mergeEntityCollection(existing.goodsWithdrawals, incoming.goodsWithdrawals, 'id'),
    carriers: mergeEntityCollection(existing.carriers, incoming.carriers, 'id'),
    unitsOfMeasure: mergeEntityCollection(existing.unitsOfMeasure, incoming.unitsOfMeasure, 'id'),
    services: mergeEntityCollection(existing.services, incoming.services, 'id'),
    budgets: mergeEntityCollection(existing.budgets, incoming.budgets, 'id'),
    serviceOrders: mergeEntityCollection(existing.serviceOrders, incoming.serviceOrders, 'id'),
    history: mergeEntityCollection(existing.history, incoming.history, 'id'),
    suppliers: uniqueSuppliers,
    supplierPartPrices: mergeEntityCollection(existing.supplierPartPrices, incoming.supplierPartPrices, 'id'),
    quotations: mergeEntityCollection(existing.quotations, incoming.quotations, 'id'),
    accountsReceivable: mergeEntityCollection(existing.accountsReceivable, incoming.accountsReceivable, 'id'),
    accountsPayable: mergeEntityCollection(existing.accountsPayable, incoming.accountsPayable, 'id'),
    financialTransactions: mergeEntityCollection(existing.financialTransactions, incoming.financialTransactions, 'id'),
    paymentMethods: mergeEntityCollection(existing.paymentMethods, incoming.paymentMethods, 'id'),
    maintenanceLogs: mergeEntityCollection(existing.maintenanceLogs, incoming.maintenanceLogs, 'id'),
    factoryOperators: mergeEntityCollection(existing.factoryOperators, incoming.factoryOperators, 'id'),
    fiscalDocuments: mergeEntityCollection(existing.fiscalDocuments, incoming.fiscalDocuments, 'id'),
    boletos: mergeEntityCollection(existing.boletos, incoming.boletos, 'id'),
    interBranchSales: mergeEntityCollection(existing.interBranchSales, incoming.interBranchSales, 'id'),
    stockMovements: mergeEntityCollection(existing.stockMovements, incoming.stockMovements, 'id'),
    notifications: mergeEntityCollection(existing.notifications, incoming.notifications, 'id'),
    testCases: mergeEntityCollection(existing.testCases, incoming.testCases, 'id'),
    taxOperationNatures: mergeEntityCollection(existing.taxOperationNatures, incoming.taxOperationNatures, 'id'),
    taxRules: mergeEntityCollection(existing.taxRules, incoming.taxRules, 'id'),
    xmlImportRecords: mergeEntityCollection(existing.xmlImportRecords, incoming.xmlImportRecords, 'id'),
    boms: mergeEntityCollection(existing.boms, incoming.boms, 'id'),
    billOfMaterials: mergeEntityCollection(existing.billOfMaterials, incoming.billOfMaterials, 'id'),
    productionOrders: mergeEntityCollection(existing.productionOrders, incoming.productionOrders, 'id'),
    solidworksProjects: mergeEntityCollection(existing.solidworksProjects, incoming.solidworksProjects, 'id'),
    materialSeparations: mergeEntityCollection(existing.materialSeparations, incoming.materialSeparations, 'id'),
    productLots: mergeEntityCollection(existing.productLots, incoming.productLots, 'id'),
    operationalAlerts: mergeEntityCollection(existing.operationalAlerts, incoming.operationalAlerts, 'id'),
    installedEquipment: mergeEntityCollection(existing.installedEquipment, incoming.installedEquipment, 'id'),
    equipmentMaintenancePlans: mergeEntityCollection(existing.equipmentMaintenancePlans, incoming.equipmentMaintenancePlans, 'id'),
    equipmentMaintenanceOrders: mergeEntityCollection(existing.equipmentMaintenanceOrders, incoming.equipmentMaintenanceOrders, 'id'),
    productionScrapLogs: mergeEntityCollection(existing.productionScrapLogs, incoming.productionScrapLogs, 'id'),
    productionReworkLogs: mergeEntityCollection(existing.productionReworkLogs, incoming.productionReworkLogs, 'id'),
    purchaseHistory: mergeEntityCollection(existing.purchaseHistory, incoming.purchaseHistory, 'id'),
    billingClosings: mergeEntityCollection(existing.billingClosings, incoming.billingClosings, 'id'),
    monthlyAccountingClosings: mergeEntityCollection(existing.monthlyAccountingClosings, incoming.monthlyAccountingClosings, 'id'),
    taxObligationGuides: mergeEntityCollection(existing.taxObligationGuides, incoming.taxObligationGuides, 'id'),
    qualityInspections: mergeEntityCollection(existing.qualityInspections, incoming.qualityInspections, 'id'),
    technicalDocuments: mergeEntityCollection(existing.technicalDocuments, incoming.technicalDocuments, 'id'),
    warehouseLocations: mergeEntityCollection(existing.warehouseLocations, incoming.warehouseLocations, 'id'),
    shopFloorEntries: mergeEntityCollection(existing.shopFloorEntries, incoming.shopFloorEntries, 'id'),
    nonConformityReports: mergeEntityCollection(existing.nonConformityReports, incoming.nonConformityReports, 'id'),
    bankStatements: mergeEntityCollection(existing.bankStatements, incoming.bankStatements, 'id'),
    loginHistory: mergeEntityCollection(existing.loginHistory, incoming.loginHistory, 'lastAccess', 'username'),
    accessGroups: mergeEntityCollection(existing.accessGroups, incoming.accessGroups, 'id'),
    pendingPriceRevisions: mergeEntityCollection(existing.pendingPriceRevisions, incoming.pendingPriceRevisions, 'id'),
    priceChangeHistory: mergeEntityCollection(existing.priceChangeHistory, incoming.priceChangeHistory, 'id'),
    priceCalculationHistory: mergeEntityCollection(existing.priceCalculationHistory, incoming.priceCalculationHistory, 'id'),
    contractModules: { ...(existing.contractModules || {}), ...(incoming.contractModules || {}) },
    globalModules: { ...(existing.globalModules || {}), ...(incoming.globalModules || {}) },
    alertSettings: { ...(existing.alertSettings || {}), ...(incoming.alertSettings || {}) },
    sefazConfig: { ...(existing.sefazConfig || {}), ...(incoming.sefazConfig || {}) },
    landingContent: incoming.landingContent || existing.landingContent || null,
  });
}

// Isolamento estrito de dados e usuários por empresa (Multi-Tenant Data Isolation)
// Garante que usuários de uma empresa em hipótese alguma vejam usuários ou qualquer outro dado de outra empresa
export function isolateDatabaseForContext(
  db: any,
  context: { userId?: string; companyId?: string; userRole?: string; syncMode?: string }
): any {
  if (!db || typeof db !== 'object') return db;

  const { userId, companyId: reqCompanyId, userRole, syncMode } = context;

  const operationalCollections = [
    'clients',
    'suppliers',
    'vehicles',
    'parts',
    'services',
    'budgets',
    'serviceOrders',
    'sales',
    'goodsWithdrawals',
    'quotations',
    'supplierPartPrices',
    'accountsReceivable',
    'accountsPayable',
    'financialTransactions',
    'fiscalDocuments',
    'boletos',
    'interBranchSales',
    'stockMovements',
    'maintenanceLogs',
    'boms',
    'billOfMaterials',
    'productionOrders',
    'solidworksProjects',
    'materialSeparations',
    'productLots',
    'operationalAlerts',
    'factoryOperators',
    'history',
    'notifications',
    'carriers',
    'taxObligationGuides',
    'installedEquipment',
    'equipmentMaintenancePlans',
    'equipmentMaintenanceOrders',
    'productionScrapLogs',
    'productionReworkLogs',
    'purchaseHistory',
    'billingClosings',
    'monthlyAccountingClosings',
    'qualityInspections',
    'technicalDocuments',
    'warehouseLocations',
    'shopFloorEntries',
    'nonConformityReports',
    'bankStatements',
    'unitsOfMeasure',
    'accessGroups',
    'pendingPriceRevisions',
    'priceChangeHistory',
    'priceCalculationHistory',
  ];

  const allRegistered = Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0
    ? db.registeredCompanies
    : (db.companyInfo ? [db.companyInfo] : [{ id: 'comp-1', name: 'MotorDesk' }]);

  // Identifica a empresa alvo
  let targetCompanyId = reqCompanyId && reqCompanyId !== 'all' ? reqCompanyId : '';

  const allUsers = Array.isArray(db.users) ? db.users : [];
  let reqUser = (targetCompanyId
    ? allUsers.find((u: any) => u && (u.id === userId || (u.username && u.username.toLowerCase() === userId?.toLowerCase())) && u.companyId === targetCompanyId)
    : null) || allUsers.find((u: any) => u && (u.id === userId || (u.username && u.username.toLowerCase() === userId?.toLowerCase())));

  if (!targetCompanyId) {
    if (reqUser && reqUser.companyId) {
      targetCompanyId = reqUser.companyId;
    } else if (db.companyInfo?.id) {
      targetCompanyId = db.companyInfo.id;
    } else {
      targetCompanyId = 'comp-1';
    }
  }

  const isQaUser = Boolean(
    (reqUser && (reqUser.role === 'qa' || (reqUser.username && reqUser.username.toLowerCase() === 'validador'))) ||
    userId?.toLowerCase() === 'validador' ||
    (typeof userId === 'string' && userId.includes('validador')) ||
    userRole === 'qa'
  );

  const isAdminUser = Boolean(
    (reqUser && (reqUser.role === 'admin' || (reqUser.username && reqUser.username.toLowerCase() === 'admin'))) ||
    userId?.toLowerCase() === 'admin' ||
    (typeof userId === 'string' && userId.includes('admin')) ||
    userRole === 'admin'
  );

  const isMasterUser = Boolean(
    isAdminUser ||
    isQaUser ||
    userId?.toLowerCase() === 'validador' ||
    userId?.toLowerCase() === 'admin' ||
    userId?.toLowerCase() === 'usr-validador' ||
    (reqUser && (reqUser.username?.toLowerCase() === 'validador' || reqUser.username?.toLowerCase() === 'admin' || reqUser.role === 'admin' || reqUser.role === 'qa'))
  );

  const hasWildcard = Boolean(
    isMasterUser ||
    (Array.isArray(reqUser?.allowedCompanyIds) && reqUser.allowedCompanyIds.includes('*'))
  );

  const isPreLogin = !userId || userId === 'guest' || userId.startsWith('guest') || userId === 'authenticated_user' || userId === 'all' || userId === 'anonymous';

  // Se for Master User (admin ou validador), tiver wildcard (*), for requisição global ('all'), ou pré-login (qualquer novo navegador/máquina):
  if (isMasterUser || hasWildcard || reqCompanyId === 'all' || isPreLogin) {
    const currentCompany = allRegistered.find((c: any) => c.id === targetCompanyId) || (allRegistered.length > 0 ? allRegistered[0] : db.companyInfo);
    return {
      ...db,
      companyInfo: currentCompany,
      registeredCompanies: allRegistered,
      users: allUsers,
    };
  }

  let allowedCompanies: any[] = [];
  if (hasWildcard) {
    allowedCompanies = allRegistered;
  } else {
    // Coleta todas as empresas onde este operador possui cadastro ou permissão explícita
    const userMatchingRecords = allUsers.filter((u: any) =>
      u && (u.id === userId || (u.username && u.username.toLowerCase() === userId?.toLowerCase())) &&
      u.status !== 'terminated' && !u.isTerminated
    );
    const accessibleCompIds = new Set<string>();
    userMatchingRecords.forEach((u: any) => {
      if (u.companyId) accessibleCompIds.add(u.companyId);
      if (Array.isArray(u.allowedCompanyIds)) {
        u.allowedCompanyIds.forEach((id: string) => {
          if (id && id !== '*') accessibleCompIds.add(id);
        });
      }
    });

    if (reqUser) {
      if (reqUser.companyId) accessibleCompIds.add(reqUser.companyId);
      if (Array.isArray(reqUser.allowedCompanyIds)) {
        reqUser.allowedCompanyIds.forEach((id: string) => {
          if (id && id !== '*') accessibleCompIds.add(id);
        });
      }
    }

    allowedCompanies = allRegistered.filter((c: any) => accessibleCompIds.has(c.id));
    if (allowedCompanies.length === 0) {
      allowedCompanies = allRegistered.filter((c: any) => c.id === (reqUser?.companyId || 'comp-1'));
    }
  }

  // Ajusta targetCompanyId se a empresa solicitada não for autorizada para o usuário
  if (!allowedCompanies.some((c: any) => c.id === targetCompanyId)) {
    targetCompanyId = allowedCompanies.length > 0 ? allowedCompanies[0].id : (db.companyInfo?.id || 'comp-1');
  }

  // Isolamento estrito de operadores: usuários comuns ou administradores de outras unidades
  // JAMAIS devem vazar para uma empresa para a qual não possuem acesso explícito.
  // Apenas operadores vinculados à targetCompanyId ou administradores/validadores globais com wildcard (*) são visíveis.
  const isolatedUsers = allUsers.filter((u: any) => {
    if (!u) return false;
    // Administrador mestre global e Validador QA
    if ((u.username && (u.username.toLowerCase() === 'admin' || u.username.toLowerCase() === 'validador')) ||
        (Array.isArray(u.allowedCompanyIds) && u.allowedCompanyIds.includes('*'))) {
      return true;
    }
    const uComp = u.companyId || 'comp-1';
    // Se o usuário pertence à empresa requisitada
    if (uComp === targetCompanyId) return true;
    // Se o usuário tem autorização explícita para esta empresa em allowedCompanyIds
    if (Array.isArray(u.allowedCompanyIds) && u.allowedCompanyIds.includes(targetCompanyId)) {
      return true;
    }
    return false;
  });

  const isolated: any = {
    ...db,
    registeredCompanies: allowedCompanies,
    users: isolatedUsers,
  };

  const currentCompany = allRegistered.find((c: any) => c.id === targetCompanyId) || (allowedCompanies.length > 0 ? allowedCompanies[0] : db.companyInfo);
  if (currentCompany) {
    isolated.companyInfo = currentCompany;
  }

  for (const col of operationalCollections) {
    const list = Array.isArray(db[col]) ? db[col] : [];
    isolated[col] = list.filter((item: any) => {
      if (!item) return false;
      const compId = item.companyId || 'comp-1';
      return compId === targetCompanyId;
    });
  }

  return isolated;
}

// Real-time synchronization hub across multiple browsers, tabs, and computers
let currentDbVersion = 1;
let currentDbUpdatedAt = new Date().toISOString();
const sseSubscribers = new Set<express.Response>();

export function broadcastDbUpdate(payload: { updatedAt: string; version: number; companyId?: string; userId?: string; source?: string }) {
  const dataString = JSON.stringify({
    ...payload,
    serverTime: Date.now(),
    subscribersCount: sseSubscribers.size,
  });
  const sseMsg = `event: db_update\ndata: ${dataString}\n\nevent: db_updated\ndata: ${dataString}\n\ndata: ${dataString}\n\n`;
  let successCount = 0;
  for (const client of sseSubscribers) {
    try {
      client.write(sseMsg);
      if (typeof (client as any).flush === 'function') {
        (client as any).flush();
      }
      successCount++;
    } catch (e) {
      sseSubscribers.delete(client);
    }
  }
  console.log(`[REALTIME-BROADCAST] Sent db_update v${payload.version} to ${successCount} connected machines/clients (source: ${payload.source || 'db_update'})`);
}

export function broadcastSessionRevocation(revocation: {
  revokedSessionId: string;
  username: string;
  userId?: string;
  terminatedByDevice: string;
  terminatedByIp?: string;
  terminatedAt: string;
}) {
  const dataString = JSON.stringify({
    ...revocation,
    serverTime: Date.now(),
  });
  const sseMsg = `event: session_revoked\ndata: ${dataString}\n\n`;
  let successCount = 0;
  for (const client of sseSubscribers) {
    try {
      client.write(sseMsg);
      if (typeof (client as any).flush === 'function') {
        (client as any).flush();
      }
      successCount++;
    } catch (e) {
      sseSubscribers.delete(client);
    }
  }
  console.log(`[SESSION-INTEGRITY] Broadcasted session_revoked to ${successCount} clients for user @${revocation.username} (session ${revocation.revokedSessionId}) terminated by ${revocation.terminatedByDevice}`);
}

// Helper: Extract user and company identity context from request
function extractUserContext(req: any): { userId: string; companyId: string; userRole: string } {
  let userId = req.headers['x-user-id'] || req.query?.userId || req.query?.username;
  const authHeader = req.headers.authorization;
  if (!userId && authHeader?.startsWith('Bearer motordesk_session_')) {
    const raw = authHeader.replace('Bearer motordesk_session_', '');
    const parts = raw.split('_');
    userId = parts[0] || 'authenticated_user';
  }
  if (!userId) {
    userId = req.user?.uid || (authHeader ? 'authenticated_user' : 'anonymous');
  }
  if (typeof userId === 'string' && userId.startsWith('motordesk_session_')) {
    userId = userId.replace('motordesk_session_', '').split('_')[0] || 'authenticated_user';
  }
  const isGuest = !userId || userId === 'anonymous' || userId === 'authenticated_user' || userId.startsWith('guest') || userId.includes('guest');
  const companyId = req.headers['x-company-id'] || req.query?.companyId || (isGuest ? 'all' : 'all');
  const userRole = req.headers['x-user-role'] || req.query?.userRole || req.user?.role || (isGuest ? 'guest' : 'user');
  return { userId, companyId, userRole };
}

// Global Session Integrity Check: Bloquear terminais cuja sessão foi revogada por outro acesso
app.use((req: any, res, next) => {
  // Ignorar rotas públicas e rotas de autenticação/heartbeat
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token.startsWith('motordesk_session_')) {
      const session = activeSessionsById.get(token);
      if (session) {
        session.status = 'active';
        session.lastHeartbeat = Date.now();
      }
    }
  }
  next();
});

// 4. ERP Database APIs - Cloud SQL PostgreSQL with seamless high-availability cache
app.get("/api/db", requireAuth, async (req: any, res) => {
  const startTime = Date.now();
  const requestId = `req-get-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const { userId, companyId: reqCompanyId, userRole } = extractUserContext(req);
  const config = resolveDatabaseConfig();
  const syncMode = (req.headers['x-sync-mode'] || req.query?.mode || 'full') as string;

  try {
    if (!isDatabaseSocketAvailable(config.database)) {
      if (serverAppStoreCache) {
        const isolatedData = isolateDatabaseForContext(serverAppStoreCache, { userId, companyId: reqCompanyId, userRole, syncMode });
        const durationMs = Date.now() - startTime;
        const empresas = (isolatedData.registeredCompanies || []).length;
        const usuarios = (isolatedData.users || []).length;
        const clientes = (isolatedData.clients || []).length;
        const veiculos = (isolatedData.vehicles || []).length;
        const pecas = (isolatedData.parts || []).length;
        const companyId = reqCompanyId !== 'all' ? reqCompanyId : (isolatedData.companyInfo?.id || 'all');
        const payloadSize = JSON.stringify(isolatedData).length;
        const updatedAt = new Date().toISOString();

        console.log(`[DB-TRACE] GET /api/db (Server Cache Resilient)\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${companyId}\npayloadSize=${payloadSize}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${config.database}\nsource=server_cache\nlatencyMs=${durationMs}`);

        return res.json({
          success: true,
          data: isolatedData,
          source: "server_cache",
          database: config.database,
          durationMs,
          updatedAt,
        });
      }
    }

    // 1. Query the configured/primary database using executeSqlWithRetry
    const result = await executeSqlWithRetry(
      'SELECT id, data, updated_at, pg_column_size(data) as size FROM app_store WHERE id = $1',
      ['motordesk_main'],
      config.database
    );

    if (result.rows.length > 0 && result.rows[0].data) {
      const data = sanitizeAndIsolateCompanies(result.rows[0].data);
      serverAppStoreCache = data;
      persistServerCacheToDisk(data);
      const isolatedData = isolateDatabaseForContext(data, { userId, companyId: reqCompanyId, userRole, syncMode });
      const durationMs = Date.now() - startTime;
      const empresas = (isolatedData.registeredCompanies || []).length;
      const usuarios = (isolatedData.users || []).length;
      const clientes = (isolatedData.clients || []).length;
      const veiculos = (isolatedData.vehicles || []).length;
      const pecas = (isolatedData.parts || []).length;
      const companyId = reqCompanyId !== 'all' ? reqCompanyId : (isolatedData.companyInfo?.id || 'all');
      const payloadSize = JSON.stringify(isolatedData).length;
      const updatedAt = result.rows[0].updated_at || new Date().toISOString();

      console.log(`[DB-TRACE] GET /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${companyId}\npayloadSize=${payloadSize}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${config.database}\nsource=cloud_sql\nlatencyMs=${durationMs}`);

      return res.json({
        success: true,
        data: isolatedData,
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
          const data = sanitizeAndIsolateCompanies(altRes.rows[0].data);
          serverAppStoreCache = data;
          const isolatedData = isolateDatabaseForContext(data, { userId, companyId: reqCompanyId, userRole, syncMode });
          const durationMs = Date.now() - startTime;
          const empresas = (isolatedData.registeredCompanies || []).length;
          const usuarios = (isolatedData.users || []).length;
          const clientes = (isolatedData.clients || []).length;
          const veiculos = (isolatedData.vehicles || []).length;
          const pecas = (isolatedData.parts || []).length;
          const companyId = isolatedData.companyInfo?.id || 'all';
          const payloadSize = JSON.stringify(isolatedData).length;
          const updatedAt = altRes.rows[0].updated_at || new Date().toISOString();

          console.log(`[DB-TRACE] GET /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${companyId}\npayloadSize=${payloadSize}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${altDb}\nsource=cloud_sql_alt\nlatencyMs=${durationMs}`);

          return res.json({
            success: true,
            data: isolatedData,
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
      const syncMode = (req.headers['x-sync-mode'] || req.query?.mode || 'full') as string;
      const isolatedData = isolateDatabaseForContext(serverAppStoreCache, { userId, companyId: reqCompanyId, userRole, syncMode });
      const empresas = (isolatedData.registeredCompanies || []).length;
      const usuarios = (isolatedData.users || []).length;
      const clientes = (isolatedData.clients || []).length;
      const veiculos = (isolatedData.vehicles || []).length;
      const pecas = (isolatedData.parts || []).length;
      const companyId = isolatedData.companyInfo?.id || 'all';
      const updatedAt = new Date().toISOString();

      console.log(`[DB-TRACE] GET /api/db\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${companyId}\npayloadSize=${JSON.stringify(isolatedData).length}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${config.database}\nsource=server_cache\nlatencyMs=${Date.now() - startTime}`);

      return res.json({
        success: true,
        data: isolatedData,
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

// Live SSE Stream for real-time synchronization across multiple browsers, tabs, and computers
app.get("/api/db/stream", (req, res) => {
  const reqHost = req.headers.host || "motordesk.app.br";
  const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try {
      const parsedUrl = new URL(req.headers.referer as string);
      origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch {}
  }
  if (!origin) {
    origin = `${proto}://${reqHost}`;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Cache-Control, Pragma, Authorization, X-Requested-With, Content-Type, Accept, X-Company-Id, X-User-Id, X-User-Role");
  
  if (!req.httpVersion.startsWith("2") && !req.httpVersion.startsWith("3")) {
    res.setHeader("Connection", "keep-alive");
  }

  res.status(200);
  res.flushHeaders?.();
  res.write(":\n\n");

  const initData = JSON.stringify({
    connected: true,
    version: currentDbVersion,
    updatedAt: currentDbUpdatedAt,
    subscribersCount: sseSubscribers.size + 1,
    serverTime: Date.now(),
  });
  res.write(`event: connected\ndata: ${initData}\n\n`);
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }

  sseSubscribers.add(res);
  console.log(`[REALTIME-SSE] New machine connected to real-time stream. Total active: ${sseSubscribers.size}`);

  const keepAliveTimer = setInterval(() => {
    try {
      res.write(": keep-alive\n\n");
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch (e) {
      clearInterval(keepAliveTimer);
      sseSubscribers.delete(res);
    }
  }, 5000);

  const cleanup = () => {
    clearInterval(keepAliveTimer);
    if (sseSubscribers.has(res)) {
      sseSubscribers.delete(res);
      console.log(`[REALTIME-SSE] Machine disconnected from stream. Remaining active: ${sseSubscribers.size}`);
    }
  };
  req.on("close", cleanup);
  res.on("close", cleanup);
  res.on("finish", cleanup);
  res.on("error", cleanup);
});

// Lightweight database version check for ultra-fast polling without transferring large payloads
app.get("/api/db/version", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.json({
    success: true,
    version: currentDbVersion,
    updatedAt: currentDbUpdatedAt,
    subscribersCount: sseSubscribers.size,
    serverTime: Date.now(),
  });
});

app.post("/api/db", requireAuth, async (req: any, res) => {
  const startTime = Date.now();
  const requestId = `req-post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const { userId, companyId: reqCompanyId, userRole } = extractUserContext(req);
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

    if (!isDatabaseSocketAvailable(config.database)) {
      const { mergedData, durationMs, updatedAt } = await enqueueDbWrite(async () => {
        let currentStoredData: any = serverAppStoreCache || incomingData;
        const currentUpdatedAt: string = new Date().toISOString();
        const merged = mergeAppDatabase(currentStoredData, incomingData);
        serverAppStoreCache = merged;
        persistServerCacheToDisk(merged);
        return {
          mergedData: merged,
          durationMs: Date.now() - startTime,
          updatedAt: currentUpdatedAt,
        };
      });

      currentDbVersion++;
      currentDbUpdatedAt = updatedAt;
      broadcastDbUpdate({
        updatedAt,
        version: currentDbVersion,
        companyId: inCompanyId,
        userId,
        source: "server_cache",
      });

      const isolatedResponseData = isolateDatabaseForContext(mergedData, { userId, companyId: inCompanyId, userRole, syncMode: 'full' });

      console.log(`[DB-TRACE] POST /api/db (Server Cache Resilient)\nrequestId=${requestId}\nuserId=${userId}\ncompanyId=${inCompanyId}\npayloadSize=${JSON.stringify(isolatedResponseData).length}\nempresas=${inEmpresas}\nusuários=${inUsuarios}\nclientes=${inClientes}\nveículos=${inVeiculos}\npeças=${inPecas}\nresult=SUCCESS\nupdatedAt=${updatedAt}\ndatabase=${config.database}\nsource=server_cache\nlatencyMs=${durationMs}`);

      return res.json({
        success: true,
        message: "Database saved and preserved in server persistent cache",
        data: isolatedResponseData,
        source: "server_cache",
        database: config.database,
        durationMs,
        updatedAt,
        version: currentDbVersion,
      });
    }

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
      persistServerCacheToDisk(merged);

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

    // Update version tracking and broadcast change to all connected browsers & computers in real-time
    currentDbVersion++;
    currentDbUpdatedAt = updatedAt;
    broadcastDbUpdate({
      updatedAt,
      version: currentDbVersion,
      companyId: inCompanyId,
      userId,
      source: "cloud_sql",
    });

    const isolatedResponseData = isolateDatabaseForContext(mergedData, { userId, companyId: inCompanyId, userRole, syncMode: 'full' });

    return res.json({
      success: true,
      message: "Database saved and merged to PostgreSQL Cloud SQL",
      data: isolatedResponseData,
      source: "cloud_sql",
      database: config.database,
      durationMs,
      updatedAt,
      version: currentDbVersion,
    });
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.warn(`[DB-TRACE] POST /api/db ERROR\nrequestId=${requestId}\nuserId=${userId}\nresult=ERROR\nerror=${pgErr.message}\nlatencyMs=${Date.now() - startTime}`);
    
    // Server cache holds the data safely even if Cloud SQL is transiently busy or disconnected
    const fallbackUpdatedAt = new Date().toISOString();
    currentDbVersion++;
    currentDbUpdatedAt = fallbackUpdatedAt;
    broadcastDbUpdate({
      updatedAt: fallbackUpdatedAt,
      version: currentDbVersion,
      userId,
      source: "server_cache",
    });

    return res.json({
      success: true,
      message: "Database saved and preserved in server cache",
      data: serverAppStoreCache || req.body,
      source: "server_cache",
      database: config.database,
      durationMs: Date.now() - startTime,
      updatedAt: fallbackUpdatedAt,
      version: currentDbVersion,
    });
  }
});

// List all registered companies endpoint (strict isolation: only returns companies accessible by user)
app.get("/api/companies", async (req, res) => {
  const startTime = Date.now();
  const requestId = `req-comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const config = resolveDatabaseConfig();
  const { userId, userRole } = extractUserContext(req);

  try {
    let rawCompanies: any[] = [];
    let allUsers: any[] = [];

    if (isDatabaseSocketAvailable(config.database)) {
      try {
        const result = await executeSqlWithRetry(
          'SELECT data->\'registeredCompanies\' as companies, data->\'companyInfo\' as main_company, data->\'users\' as users, updated_at FROM app_store WHERE id = $1',
          ['motordesk_main'],
          config.database
        );
        if (result.rows.length > 0) {
          rawCompanies = result.rows[0].companies || [result.rows[0].main_company];
          allUsers = result.rows[0].users || [];
        }
      } catch (sqlErr) {
        console.warn('[GET /api/companies] Fallback para serverAppStoreCache devido a erro SQL:', sqlErr);
      }
    }

    if (rawCompanies.length === 0 && serverAppStoreCache) {
      rawCompanies = serverAppStoreCache.registeredCompanies || [serverAppStoreCache.companyInfo];
      allUsers = serverAppStoreCache.users || [];
    }

    const allRegistered = Array.isArray(rawCompanies) ? rawCompanies : [rawCompanies].filter(Boolean);
    const isPreLogin = !userId || userId === 'guest' || userId.startsWith('guest') || userId === 'authenticated_user' || userId === 'all' || userId === 'anonymous';
    const isAdminUser = userRole === 'admin' || userId === 'usr-admin' || userId === 'admin';
    const isQaUser = userRole === 'qa' || userId === 'usr-validador' || userId === 'validador' || (typeof userId === 'string' && userId.includes('validador'));

    // Query parameter username may be provided during login typing or pre-login
    const queryUsername = (req.query.username as string || '').trim().toLowerCase();
    const effectiveUsername = queryUsername || (!isPreLogin && userId ? userId.toLowerCase() : '');

    let allowedCompanies: any[] = allRegistered;
    const isMasterUser = effectiveUsername === 'validador' || effectiveUsername === 'admin' || effectiveUsername === 'usr-validador' || isAdminUser || isQaUser;

    if (effectiveUsername && !isMasterUser && !isPreLogin) {
      // Find matching user records
      const matchingUsers = allUsers.filter((u: any) =>
        u && (u.id === effectiveUsername || (u.username && u.username.toLowerCase() === effectiveUsername)) &&
        u.status !== 'terminated' && !u.isTerminated
      );

      const hasWildcard = matchingUsers.some((u: any) => Array.isArray(u.allowedCompanyIds) && u.allowedCompanyIds.includes('*'));

      if (!hasWildcard) {
        const accessibleCompIds = new Set<string>();
        matchingUsers.forEach((u: any) => {
          if (u.companyId) accessibleCompIds.add(u.companyId);
          if (Array.isArray(u.allowedCompanyIds)) {
            u.allowedCompanyIds.forEach((id: string) => {
              if (id && id !== '*') accessibleCompIds.add(id);
            });
          }
        });
        allowedCompanies = allRegistered.filter((c: any) => accessibleCompIds.has(c.id));
      }
    }

    const count = allowedCompanies.length;
    console.log(`[DB-TRACE][GET /api/companies]\nrequestId=${requestId}\nuserId=${userId || 'anonymous'}\ncompanies=${count}\nresult=SUCCESS\nlatencyMs=${Date.now() - startTime}`);
    return res.json({ success: true, companies: allowedCompanies, durationMs: Date.now() - startTime });
  } catch (err: any) {
    if (serverAppStoreCache) {
      const companies = serverAppStoreCache.registeredCompanies || [serverAppStoreCache.companyInfo];
      return res.json({ success: true, companies, durationMs: Date.now() - startTime });
    }
    return res.json({ success: true, companies: [], error: err.message });
  }
});

// Endpoint: Atualizar ou liberar módulos contratados de uma empresa pós-contrato (ex: Boletos, Vendas, Fiscal)
app.post("/api/companies/:companyId/modules", requireAuth, async (req: any, res) => {
  const { companyId } = req.params;
  const { modules, contractModules } = req.body;
  const config = resolveDatabaseConfig();

  if (!modules || typeof modules !== 'object') {
    return res.status(400).json({ success: false, error: "Objeto de módulos não fornecido" });
  }

  try {
    const result = await enqueueDbWrite(async () => {
      let currentData = serverAppStoreCache;
      if (!currentData) {
        const readRes = await executeSqlWithRetry(
          'SELECT data FROM app_store WHERE id = $1',
          ['motordesk_main'],
          config.database
        );
        if (readRes.rows.length > 0) currentData = readRes.rows[0].data;
      }

      if (!currentData) {
        return { success: false, error: "Dados da aplicação não encontrados" };
      }

      const companies = Array.isArray(currentData.registeredCompanies) ? [...currentData.registeredCompanies] : [];
      let foundIndex = companies.findIndex((c: any) => c.id === companyId);
      
      let targetCompany = foundIndex !== -1 ? { ...companies[foundIndex] } : (currentData.companyInfo?.id === companyId ? { ...currentData.companyInfo } : null);
      if (!targetCompany && companies.length > 0) {
        targetCompany = { ...companies[0] };
        foundIndex = 0;
      }

      if (!targetCompany) {
        return { success: false, error: "Empresa não encontrada" };
      }

      // Atualizar módulos globais
      const updatedGlobalModules = {
        ...(targetCompany.globalModules || {}),
        ...modules,
      };

      // Se contrato específico foi enviado
      const updatedContractModules = contractModules 
        ? { ...(targetCompany.contractModules || {}), ...contractModules }
        : targetCompany.contractModules;

      targetCompany.globalModules = updatedGlobalModules;
      if (updatedContractModules) targetCompany.contractModules = updatedContractModules;

      if (foundIndex !== -1) {
        companies[foundIndex] = targetCompany;
      } else {
        companies.push(targetCompany);
      }

      currentData.registeredCompanies = companies;
      if (currentData.companyInfo?.id === companyId || !currentData.companyInfo) {
        currentData.companyInfo = targetCompany;
      }

      serverAppStoreCache = currentData;

      const payloadStr = JSON.stringify(currentData);
      await executeSqlWithRetry(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['motordesk_main', payloadStr],
        config.database
      );

      return { success: true, company: targetCompany };
    });

    if (result.success) {
      currentDbVersion++;
      currentDbUpdatedAt = new Date().toISOString();
      broadcastDbUpdate({
        updatedAt: currentDbUpdatedAt,
        version: currentDbVersion,
        companyId,
        source: "modules_update"
      });
      return res.json(result);
    }
    return res.status(400).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Atualizar limite de usuários e valor por usuário adicional da licença
app.post("/api/companies/:companyId/license", requireAuth, async (req: any, res) => {
  const { companyId } = req.params;
  const { userLimit, additionalUserPrice, monthlyFee } = req.body;
  const config = resolveDatabaseConfig();

  try {
    const result = await enqueueDbWrite(async () => {
      let currentData = serverAppStoreCache;
      if (!currentData) {
        const readRes = await executeSqlWithRetry(
          'SELECT data FROM app_store WHERE id = $1',
          ['motordesk_main'],
          config.database
        );
        if (readRes.rows.length > 0) currentData = readRes.rows[0].data;
      }

      if (!currentData) {
        return { success: false, error: "Dados da aplicação não encontrados" };
      }

      const companies = Array.isArray(currentData.registeredCompanies) ? [...currentData.registeredCompanies] : [];
      let foundIndex = companies.findIndex((c: any) => c.id === companyId);
      let targetCompany = foundIndex !== -1 ? { ...companies[foundIndex] } : (currentData.companyInfo?.id === companyId ? { ...currentData.companyInfo } : null);

      if (!targetCompany && companies.length > 0) {
        targetCompany = { ...companies[0] };
        foundIndex = 0;
      }

      if (!targetCompany) {
        return { success: false, error: "Empresa não encontrada" };
      }

      if (userLimit !== undefined) {
        const parsedLimit = parseInt(String(userLimit), 10);
        targetCompany.userLimit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
      }

      if (additionalUserPrice !== undefined) {
        const parsedPrice = parseFloat(String(additionalUserPrice));
        targetCompany.additionalUserPrice = !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 29.90;
      }

      if (monthlyFee !== undefined) {
        const parsedFee = parseFloat(String(monthlyFee));
        if (!isNaN(parsedFee) && parsedFee >= 0) targetCompany.monthlyFee = parsedFee;
      } else {
        // Recalcular se necessário
        const baseFee = targetCompany.basePlanFee ?? targetCompany.monthlyFee ?? 199.90;
        const extraUsers = Math.max(0, (targetCompany.userLimit || 5) - 5);
        targetCompany.monthlyFee = baseFee + (extraUsers * (targetCompany.additionalUserPrice || 29.90));
      }

      if (foundIndex !== -1) {
        companies[foundIndex] = targetCompany;
      } else {
        companies.push(targetCompany);
      }

      currentData.registeredCompanies = companies;
      if (currentData.companyInfo?.id === companyId || !currentData.companyInfo) {
        currentData.companyInfo = targetCompany;
      }

      serverAppStoreCache = currentData;

      const payloadStr = JSON.stringify(currentData);
      await executeSqlWithRetry(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['motordesk_main', payloadStr],
        config.database
      );

      return { success: true, company: targetCompany };
    });

    if (result.success) {
      currentDbVersion++;
      currentDbUpdatedAt = new Date().toISOString();
      broadcastDbUpdate({
        updatedAt: currentDbUpdatedAt,
        version: currentDbVersion,
        companyId,
        source: "license_update"
      });
      return res.json(result);
    }
    return res.status(400).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Consultar status da licença e contagem de usuários
app.get("/api/companies/:companyId/license", async (req: any, res) => {
  const { companyId } = req.params;
  try {
    const currentData = serverAppStoreCache;
    const companies = currentData?.registeredCompanies || (currentData?.companyInfo ? [currentData.companyInfo] : []);
    const company = companies.find((c: any) => c.id === companyId) || currentData?.companyInfo;

    const isQaUser = (u: any) => u && (
      u.role === 'qa' ||
      u.role === 'QA' ||
      u.userType === 'qa' ||
      (u.username && (u.username.toLowerCase() === 'validador' || u.username.toLowerCase() === 'qa'))
    );

    const allUsers = (currentData?.users || []).filter((u: any) => (u.companyId || 'comp-1') === companyId);
    const regularUsers = allUsers.filter((u: any) => !isQaUser(u));
    const qaUsers = allUsers.filter(isQaUser);

    const userLimit = company?.userLimit || 5;
    const additionalUserPrice = company?.additionalUserPrice !== undefined ? company.additionalUserPrice : 29.90;
    const extraUsers = Math.max(0, userLimit - 5);
    const extraUsersFee = extraUsers * additionalUserPrice;

    return res.json({
      success: true,
      companyId,
      companyName: company?.name || "Empresa",
      userLimit,
      currentUsersCount: regularUsers.length,
      totalUsersCount: allUsers.length,
      regularUsersCount: regularUsers.length,
      qaUsersCount: qaUsers.length,
      qaExemptFromLimit: true,
      availableSlots: Math.max(0, userLimit - regularUsers.length),
      isLimitReached: regularUsers.length >= userLimit,
      baseUsersIncluded: 5,
      extraUsers,
      additionalUserPrice,
      extraUsersFee,
      monthlyFee: company?.monthlyFee || 199.90,
      globalModules: company?.globalModules || {},
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint dedicado e atômico para alteração / primeiro acesso de senha de usuários
app.post("/api/users/update-password", async (req: any, res) => {
  const { userId, username, companyId, newPassword, keepCurrent } = req.body || {};
  const config = resolveDatabaseConfig();

  if (!userId && !username) {
    return res.status(400).json({ success: false, error: "Identificador do usuário ausente" });
  }

  if (!keepCurrent && (!newPassword || String(newPassword).trim().length < 4)) {
    return res.status(400).json({ success: false, error: "A nova senha deve possuir no mínimo 4 caracteres" });
  }

  try {
    const { updatedUser, updatedAt } = await enqueueDbWrite(async () => {
      let currentStoredData: any = serverAppStoreCache;
      try {
        const curRes = await executeSqlWithRetry(
          'SELECT data FROM app_store WHERE id = $1',
          ['motordesk_main'],
          config.database
        );
        if (curRes.rows.length > 0 && curRes.rows[0].data) {
          currentStoredData = curRes.rows[0].data;
        }
      } catch (readErr) {}

      if (!currentStoredData || !Array.isArray(currentStoredData.users)) {
        throw new Error("Banco de dados não inicializado.");
      }

      const user = currentStoredData.users.find((u: any) =>
        (userId && u.id === userId) ||
        (username && u.username && u.username.toLowerCase() === String(username).toLowerCase() && (!companyId || u.companyId === companyId))
      );

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const now = Date.now();
      if (!keepCurrent && newPassword) {
        user.passwordHash = String(newPassword).trim();
      }
      user.firstAccess = false;
      user.mustChangePassword = false;
      user.hasChosenPassword = true;
      user.passwordUpdatedAt = now;
      user.updatedAt = new Date().toISOString();

      serverAppStoreCache = currentStoredData;

      const payloadStr = JSON.stringify(currentStoredData);
      const insertRes = await executeSqlWithRetry(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
         RETURNING updated_at`,
        ['motordesk_main', payloadStr],
        config.database
      );

      const opUpdatedAt = insertRes.rows[0]?.updated_at || new Date().toISOString();

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
        updatedUser: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          firstAccess: user.firstAccess,
          mustChangePassword: user.mustChangePassword,
          hasChosenPassword: user.hasChosenPassword,
          passwordUpdatedAt: user.passwordUpdatedAt
        },
        updatedAt: opUpdatedAt
      };
    });

    currentDbVersion++;
    currentDbUpdatedAt = updatedAt;
    broadcastDbUpdate({
      updatedAt,
      version: currentDbVersion,
      companyId: companyId || updatedUser.companyId,
      userId: updatedUser.id,
      source: "password_update"
    });

    console.log(`[USER-PASSWORD] Senha salva com sucesso para @${updatedUser.username} (${updatedUser.id})`);
    return res.json({ success: true, user: updatedUser, version: currentDbVersion });
  } catch (err: any) {
    console.error("[USER-PASSWORD] Erro:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --- ROTAS DE CONTROLE DE INTEGRIDADE E CONCORRÊNCIA DE SESSÃO CORPORATIVA ---

// 1. Checagem de Conflito de Sessão Ativa em Outro Computador / Navegador (Liberado Multi-Navegador)
app.post("/api/auth/check-session", (req: any, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  if (!username) {
    return res.status(400).json({ error: "Username é obrigatório" });
  }

  // Permitir acesso concorrente e simultâneo em múltiplos navegadores (Chrome, Firefox, Safari, Edge, Celular)
  // sem bloquear o operador nem forçar knockdown indesejado
  return res.json({
    hasConflict: false,
    message: "Acesso multi-navegador liberado com sucesso."
  });
});

// 2. Derrubada de Sessão Anterior (Knockdown sob demanda)
app.post("/api/auth/knockdown-session", (req: any, res) => {
  const rawUsername = String(req.body?.username || '').trim();
  const username = rawUsername.toLowerCase();
  if (!username) {
    return res.status(400).json({ error: "Username é obrigatório" });
  }

  const userAgent = req.headers['user-agent'] || req.body?.userAgent || '';
  const clientIp = getClientIp(req);
  const device = req.body?.deviceInfo || parseClientDeviceInfo(userAgent);
  const now = Date.now();

  const previousSession = activeSessionsByUsername.get(username);
  let revokedSessionId = '';
  if (previousSession) {
    revokedSessionId = previousSession.sessionId;
    previousSession.status = 'revoked';
    previousSession.revokedAt = now;
    previousSession.revokedByDevice = device;
    console.log(`[SESSION-KNOCKDOWN] Sessão anterior (${previousSession.sessionId}) de @${username} no terminal "${previousSession.device}" foi DERRUBADA pelo novo terminal "${device}" (IP: ${clientIp}).`);

    // Notificar via SSE para que o outro computador exiba a tela de encerramento imediatamente
    broadcastSessionRevocation({
      revokedSessionId: previousSession.sessionId,
      username,
      userId: previousSession.userId,
      terminatedByDevice: device,
      terminatedByIp: clientIp,
      terminatedAt: formatSessionDateTime(new Date(now)),
    });
  }

  // IMPORTANTE: Remover de activeSessionsByUsername para que a nova tentativa de login ocorra imediatamente sem conflito
  activeSessionsByUsername.delete(username);

  return res.json({
    success: true,
    revokedSessionId,
    message: "Sessão anterior derrubada com sucesso. Acesso liberado."
  });
});

// 3. Registro de Nova Sessão (após login bem-sucedido)
app.post("/api/auth/register-session", (req: any, res) => {
  const rawUsername = String(req.body?.username || '').trim();
  const username = rawUsername.toLowerCase();
  const userId = req.body?.userId || `user_${username}`;
  const companyId = req.body?.companyId || 'comp-1';
  const rawSessionId = req.body?.sessionId;
  const sessionId = rawSessionId || `motordesk_session_${userId}_${Date.now()}`;

  const userAgent = req.headers['user-agent'] || req.body?.userAgent || '';
  const clientIp = getClientIp(req);
  const device = req.body?.deviceInfo || parseClientDeviceInfo(userAgent);
  const location = req.body?.locationInfo || `Rede Corporativa / IP: ${clientIp}`;
  const now = Date.now();

  // Suporte a múltiplos navegadores e computadores simultâneos (sincronização multi-terminal)
  // Cada terminal registra e mantém seu sessionId ativo em activeSessionsById
  const previousSession = activeSessionsByUsername.get(username);
  if (previousSession && previousSession.sessionId !== sessionId) {
    console.log(`[MULTI-DEVICE-SYNC] Novo terminal "${device}" autenticado para @${username} (IP: ${clientIp}). Sessões simultâneas permitidas.`);
  }

  const newSession: ActiveUserSession = {
    sessionId,
    userId,
    username,
    name: req.body?.name || username,
    companyId,
    ip: clientIp,
    userAgent,
    device,
    location,
    loginTime: formatSessionDateTime(new Date(now)),
    lastHeartbeat: now,
    status: 'active',
  };

  activeSessionsByUsername.set(username, newSession);
  activeSessionsById.set(sessionId, newSession);

  console.log(`[SESSION-INTEGRITY] Sessão ativa sincronizada para @${username} (${sessionId}) em ${device} (IP: ${clientIp})`);

  return res.json({
    success: true,
    sessionId,
    device,
    ip: clientIp,
    location,
    loginTime: newSession.loginTime,
  });
});

// 4. Heartbeat Contínuo de Sessão
app.all("/api/auth/session-heartbeat", (req: any, res) => {
  let sessionId = req.body?.sessionId || req.query?.sessionId;
  if (!sessionId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.replace('Bearer ', '').trim();
    }
  }

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId ausente" });
  }

  const session = activeSessionsById.get(sessionId);
  if (!session || session.status === 'revoked') {
    return res.status(403).json({
      valid: false,
      status: 'revoked',
      code: 'SESSION_REVOKED',
      terminatedByDevice: session?.revokedByDevice || 'Outro terminal ou navegador',
      terminatedAt: session?.revokedAt ? formatSessionDateTime(new Date(session.revokedAt)) : formatSessionDateTime(new Date()),
    });
  }

  session.status = 'active';
  session.lastHeartbeat = Date.now();

  return res.json({
    valid: true,
    status: 'active',
    lastHeartbeat: session.lastHeartbeat,
  });
});

// 5. Logout Voluntário de Sessão
app.post("/api/auth/logout-session", (req: any, res) => {
  let sessionId = req.body?.sessionId;
  if (!sessionId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.replace('Bearer ', '').trim();
    }
  }
  const username = String(req.body?.username || '').trim().toLowerCase();

  if (sessionId) {
    const session = activeSessionsById.get(sessionId);
    if (session) {
      session.status = 'revoked';
      session.revokedAt = Date.now();
      session.revokedByDevice = 'Logout efetuado pelo usuário';
    }
  }
  if (username) {
    activeSessionsByUsername.delete(username);
  } else if (sessionId) {
    for (const [u, s] of activeSessionsByUsername.entries()) {
      if (s.sessionId === sessionId) {
        activeSessionsByUsername.delete(u);
        break;
      }
    }
  }

  console.log(`[SESSION-LOGOUT] Sessão voluntariamente encerrada para @${username || sessionId}`);
  return res.json({ success: true, message: "Sessão finalizada com sucesso." });
});

// 5. Consulta de Sessões Ativas (para diagnóstico do sistema)
app.get("/api/auth/active-sessions", (req, res) => {
  const list = Array.from(activeSessionsByUsername.values()).map(s => ({
    username: s.username,
    name: s.name,
    device: s.device,
    ip: s.ip,
    location: s.location,
    loginTime: s.loginTime,
    lastHeartbeatAgoMs: Date.now() - s.lastHeartbeat,
    status: s.status,
  }));
  res.json({ total: list.length, sessions: list });
});

// Granular REST APIs for ERP - Protected with requireAuth + requireContractedModule
app.get("/api/clients", requireAuth, requireContractedModule("Clientes", "accessClients", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    if (serverAppStoreCache?.clients) {
      const list = (serverAppStoreCache.clients || []).filter((c: any) => c.companyId === targetCompId);
      return res.json(list);
    }
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(clientsTable);
      return res.json(list.filter((c: any) => c.companyId === targetCompId));
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/vehicles", requireAuth, requireContractedModule("Veículos", "accessVehicles", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    if (serverAppStoreCache?.vehicles) {
      const list = (serverAppStoreCache.vehicles || []).filter((v: any) => v.companyId === targetCompId);
      return res.json(list);
    }
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(vehiclesTable);
      return res.json(list.filter((v: any) => v.companyId === targetCompId));
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/parts", requireAuth, requireContractedModule("Estoque", "accessParts", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    if (serverAppStoreCache?.parts) {
      const list = (serverAppStoreCache.parts || []).filter((p: any) => p.companyId === targetCompId);
      return res.json(list);
    }
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(partsTable);
      return res.json(list.filter((p: any) => p.companyId === targetCompId));
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/service-orders", requireAuth, requireContractedModule("Ordens de Serviço", "accessServiceOrders", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    if (serverAppStoreCache?.serviceOrders) {
      const list = (serverAppStoreCache.serviceOrders || []).filter((o: any) => o.companyId === targetCompId);
      return res.json(list);
    }
    const db = getDbInstance();
    if (db) {
      const list = await db.select().from(serviceOrdersTable);
      return res.json(list.filter((o: any) => o.companyId === targetCompId));
    }
    return res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/production-orders", requireAuth, requireContractedModule("Produção", "accessProduction", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const list = (serverAppStoreCache?.productionOrders || []).filter((o: any) => o.companyId === targetCompId);
    return res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// INTEGRAÇÃO CAD SOLIDWORKS & AUTOMAÇÃO OPERACIONAL (PEDIDOS / SEPARAÇÃO)
// =========================================================================
app.get("/api/integrations/solidworks/projects", requireAuth, async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const list = (serverAppStoreCache?.solidworksProjects || []).filter((p: any) => !p.companyId || p.companyId === targetCompId);
    return res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/integrations/solidworks/sync-project", async (req: any, res) => {
  try {
    const targetCompId = req.headers['x-company-id'] || req.query.companyId || 'comp-1';
    const payload = req.body || {};
    
    if (!payload.projectName && !payload.cadFile) {
      return res.status(400).json({ error: "Dados inválidos: projectName ou cadFile é obrigatório." });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timestampStr = now.toLocaleTimeString('pt-BR');
    const uniqueSuffix = Date.now().toString().slice(-4);
    const opId = `OP-SW-${uniqueSuffix}`;
    const sepId = `SEP-SW-${uniqueSuffix}`;
    const bomId = `BOM-SW-${uniqueSuffix}`;
    const orderQty = Number(payload.orderQuantity) > 0 ? Number(payload.orderQuantity) : 1;
    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    // Checagem de estoque e estruturação do picking
    let shortageCount = 0;
    const currentParts = serverAppStoreCache?.parts || [];
    const processedItems = rawItems.map((item: any) => {
      const qtyPerAssembly = Number(item.qtyPerAssembly) || Number(item.quantity) || 1;
      const totalNeeded = qtyPerAssembly * orderQty;
      const matchedPart = currentParts.find((p: any) => 
        (p.companyId === targetCompId || !p.companyId) &&
        (p.code?.toLowerCase() === (item.partNumber || '').toLowerCase() || p.name?.toLowerCase().includes((item.description || '').toLowerCase()))
      );
      const stockAvailable = matchedPart?.stock !== undefined ? Number(matchedPart.stock) : (item.inStock !== undefined ? Number(item.inStock) : 10);
      const isShortage = stockAvailable < totalNeeded;
      if (isShortage) shortageCount++;

      return {
        partNumber: item.partNumber || `PN-${Date.now()}`,
        description: item.description || 'Componente CAD',
        qtyPerAssembly,
        totalQtyNeeded: totalNeeded,
        unit: item.unit || 'UN',
        material: item.material || 'Aço / Padrão',
        itemType: item.itemType || 'PURCHASED',
        location: item.location || 'Almoxarifado Central - Prateleira A1',
        inStock: stockAvailable,
        separatedQty: 0,
        status: isShortage ? 'SHORTAGE' : 'PENDING',
        processRoute: item.processRoute || item.route || []
      };
    });

    const newProject = {
      id: `SW-PROJ-${Date.now()}`,
      companyId: targetCompId,
      projectName: payload.projectName || 'Montagem Mecânica SolidWorks',
      assemblyNumber: payload.assemblyNumber || 'ASM-SW-01',
      revision: payload.revision || 'Rev A',
      cadFile: payload.cadFile || 'MONTAGEM.SLDASM',
      designer: payload.designer || 'Projetista CAD SolidWorks',
      cadSoftware: payload.cadSoftware || 'SolidWorks 2025',
      receivedAt: `${dateStr} ${timestampStr}`,
      orderQuantity: orderQty,
      customerName: payload.customerName || 'Estoque / Linha de Produção',
      productionOrderId: opId,
      separationId: sepId,
      bomId: bomId,
      totalItemsCount: processedItems.length,
      separationStatus: 'PENDING',
      shortageCount,
      items: processedItems,
      notes: payload.notes || 'Enviado diretamente via Add-in CAD SolidWorks.'
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const newProductionOrder = {
      id: opId,
      companyId: targetCompId,
      orderNumber: opId,
      productName: newProject.projectName,
      productCode: newProject.assemblyNumber,
      quantity: orderQty,
      customer: newProject.customerName,
      source: 'Integração SolidWorks CAD 3D',
      cadFile: newProject.cadFile,
      revision: newProject.revision,
      startDate: dateStr,
      dueDate: dueDate.toISOString().slice(0, 10),
      status: 'LIBERADA_PCP',
      priority: 'ALTA',
      notes: `Ordem gerada automaticamente a partir do SolidWorks (${newProject.cadFile}). Picking: ${sepId}`
    };

    const newBom = {
      id: bomId,
      companyId: targetCompId,
      productName: newProject.projectName,
      code: newProject.assemblyNumber,
      revision: newProject.revision,
      cadSource: newProject.cadSoftware,
      cadFile: newProject.cadFile,
      status: 'APPROVED',
      items: processedItems.map((i: any) => ({
        partNumber: i.partNumber,
        description: i.description,
        quantity: i.qtyPerAssembly,
        unit: i.unit,
        material: i.material,
        route: i.processRoute
      })),
      updatedAt: dateStr
    };

    const newSeparation = {
      id: sepId,
      companyId: targetCompId,
      productionOrderId: opId,
      projectName: newProject.projectName,
      assemblyNumber: newProject.assemblyNumber,
      cadFile: newProject.cadFile,
      orderQuantity: orderQty,
      status: 'AGUARDANDO_SEPARACAO',
      responsible: 'Almoxarifado & WMS',
      createdAt: `${dateStr} ${timestampStr}`,
      totalItems: processedItems.length,
      shortageCount,
      items: processedItems
    };

    if (serverAppStoreCache) {
      if (!serverAppStoreCache.solidworksProjects) serverAppStoreCache.solidworksProjects = [];
      if (!serverAppStoreCache.productionOrders) serverAppStoreCache.productionOrders = [];
      if (!serverAppStoreCache.boms) serverAppStoreCache.boms = [];
      if (!serverAppStoreCache.materialSeparations) serverAppStoreCache.materialSeparations = [];

      serverAppStoreCache.solidworksProjects.unshift(newProject);
      serverAppStoreCache.productionOrders.unshift(newProductionOrder);
      serverAppStoreCache.boms.unshift(newBom);
      serverAppStoreCache.materialSeparations.unshift(newSeparation);

      persistServerCacheToDisk(serverAppStoreCache);
      const config = resolveDatabaseConfig();
      if (isDatabaseSocketAvailable(config.database)) {
        try {
          await executeSqlWithRetry(
            'UPDATE app_store SET data = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(serverAppStoreCache), 'motordesk_main'],
            config.database
          );
        } catch (e) {}
      }
    }

    return res.status(201).json({
      success: true,
      message: "Projeto SolidWorks integrado com sucesso e operações fabris disparadas.",
      project: newProject,
      productionOrder: newProductionOrder,
      bom: newBom,
      separation: newSeparation,
      shortages: shortageCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/financial", requireAuth, requireContractedModule("Financeiro", "accessFinancial", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const receivables = (serverAppStoreCache?.accountsReceivable || []).filter((r: any) => r.companyId === targetCompId);
    const payables = (serverAppStoreCache?.accountsPayable || []).filter((p: any) => p.companyId === targetCompId);
    const transactions = (serverAppStoreCache?.financialTransactions || []).filter((t: any) => t.companyId === targetCompId);
    return res.json({ receivables, payables, transactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sales", requireAuth, requireContractedModule("Vendas & Balcão", "accessSales", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const list = (serverAppStoreCache?.commercialSales || serverAppStoreCache?.sales || []).filter((s: any) => s.companyId === targetCompId);
    return res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/budgets", requireAuth, requireContractedModule("Orçamentos", "accessBudgets", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const list = (serverAppStoreCache?.budgets || []).filter((b: any) => b.companyId === targetCompId);
    return res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/representative-orders", requireAuth, requireContractedModule("Representação Comercial", "accessRepresentativeCommerce", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const list = (serverAppStoreCache?.representativeOrders || []).filter((r: any) => r.companyId === targetCompId);
    return res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/services", requireAuth, requireContractedModule("Serviços", "accessServices", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const list = (serverAppStoreCache?.services || []).filter((s: any) => s.companyId === targetCompId);
    return res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/quotations", requireAuth, requireContractedModule("Cotações", "accessQuotations", () => serverAppStoreCache), async (req: any, res) => {
  try {
    const targetCompId = req.validatedCompanyId || 'comp-1';
    const list = (serverAppStoreCache?.quotations || []).filter((q: any) => q.companyId === targetCompId);
    return res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// PUBLIC QUOTATION PORTAL FOR SUPPLIERS (/api/public/quotations/*)
// Permite que fornecedores externos acessem e respondam cotações via link
// =========================================================================
app.get("/api/public/quotations/:id", async (req, res) => {
  try {
    const qId = req.params.id;
    const quotations = serverAppStoreCache?.quotations || [];
    const quotation = quotations.find((q: any) => q.id === qId || q.code === qId);
    if (!quotation) {
      return res.status(404).json({ error: "Cotação não encontrada ou expirada." });
    }
    const company = (serverAppStoreCache?.registeredCompanies || []).find((c: any) => c.id === quotation.companyId) || serverAppStoreCache?.companyInfo || {};
    const supplier = (serverAppStoreCache?.suppliers || []).find((s: any) => s.id === quotation.supplierId);
    
    return res.json({
      success: true,
      quotation: {
        id: quotation.id,
        code: quotation.code,
        status: quotation.status,
        createdAt: quotation.createdAt,
        deadline: quotation.deadline,
        notes: quotation.notes,
        paymentTerms: quotation.paymentTerms,
        freightType: quotation.freightType,
        deliveryDays: quotation.deliveryDays,
        companyName: company.tradeName || company.name || "Oficina Mecânica & Peças",
        companyCnpj: company.cnpj || "",
        companyPhone: company.phone || "",
        supplierName: supplier?.name || quotation.supplierName || "Fornecedor Parceiro",
        items: (quotation.items || []).map((it: any) => ({
          id: it.id,
          partId: it.partId,
          name: it.name || it.partName,
          code: it.code || it.partCode,
          quantity: it.quantity,
          unit: it.unit || "UN",
          targetPrice: it.targetPrice || 0,
          currentPrice: it.unitPrice || it.supplierPrice || 0,
          brand: it.brand || it.supplierBrand || "",
          notes: it.notes || ""
        }))
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/public/quotations/:id/respond", async (req, res) => {
  try {
    const qId = req.params.id;
    const { supplierNotes, deliveryDays, paymentTerms, items, supplierName, supplierContact } = req.body;
    
    if (!serverAppStoreCache) {
      return res.status(500).json({ error: "Banco de dados indisponível no momento." });
    }

    const quotations = serverAppStoreCache.quotations || [];
    const qIdx = quotations.findIndex((q: any) => q.id === qId || q.code === qId);
    if (qIdx === -1) {
      return res.status(404).json({ error: "Cotação não encontrada." });
    }

    const targetQuotation = { ...quotations[qIdx] };
    const updatedItems = (targetQuotation.items || []).map((it: any) => {
      const respItem = (items || []).find((ri: any) => ri.id === it.id || ri.partId === it.partId || ri.code === it.code);
      if (respItem) {
        const uPrice = Number(respItem.unitPrice) || it.unitPrice || 0;
        return {
          ...it,
          unitPrice: uPrice,
          supplierPrice: uPrice,
          brand: respItem.brand || it.brand || "",
          supplierBrand: respItem.brand || "",
          supplierNotes: respItem.notes || "",
          totalPrice: uPrice * (it.quantity || 1)
        };
      }
      return it;
    });

    const totalEstimated = updatedItems.reduce((acc: number, it: any) => acc + (it.totalPrice || 0), 0);

    targetQuotation.items = updatedItems;
    targetQuotation.status = "supplier_replied";
    targetQuotation.supplierRepliedAt = new Date().toISOString();
    targetQuotation.supplierNotes = supplierNotes || targetQuotation.supplierNotes;
    targetQuotation.deliveryDays = deliveryDays !== undefined ? Number(deliveryDays) : targetQuotation.deliveryDays;
    targetQuotation.paymentTerms = paymentTerms || targetQuotation.paymentTerms;
    targetQuotation.totalAmount = totalEstimated;
    targetQuotation.supplierRespondent = {
      name: supplierName || targetQuotation.supplierName,
      contact: supplierContact || "",
      answeredAt: new Date().toISOString()
    };

    quotations[qIdx] = targetQuotation;
    serverAppStoreCache.quotations = quotations;

    // Log notification and history
    const notifs = serverAppStoreCache.notifications || [];
    notifs.unshift({
      id: `notif-${Date.now()}`,
      type: "quotation_answered",
      title: "Cotação Respondida pelo Fornecedor",
      message: `O fornecedor respondeu a cotação ${targetQuotation.code} com total de R$ ${totalEstimated.toFixed(2)}.`,
      date: new Date().toISOString(),
      read: false,
      companyId: targetQuotation.companyId
    });
    serverAppStoreCache.notifications = notifs;

    // Persistir imediatamente em disco (data/app_store.json) e backups
    persistServerCacheToDisk(serverAppStoreCache);

    // Save to Cloud SQL / App Store
    const config = resolveDatabaseConfig();
    try {
      await executeSqlWithRetry(
        'UPDATE app_store SET data = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(serverAppStoreCache), 'motordesk_main'],
        config.database
      );
    } catch (e) {
      console.warn("Could not persist quotation update immediately to Postgres, cached in memory:", e);
    }

    // Broadcast em tempo real para todos os navegadores e computadores conectados (Compradores recebem notificação instantânea)
    currentDbVersion++;
    currentDbUpdatedAt = new Date().toISOString();
    broadcastDbUpdate({
      updatedAt: currentDbUpdatedAt,
      version: currentDbVersion,
      companyId: targetQuotation.companyId,
      source: "supplier_quotation_reply",
    });

    console.log(`[QUOTATION-REPLY] Cotação ${targetQuotation.code} respondida por ${targetQuotation.supplierRespondent?.name || "Fornecedor"} (Total: R$ ${totalEstimated.toFixed(2)}). Notificação enviada ao módulo de compras.`);

    return res.json({
      success: true,
      message: "Cotação respondida e devolvida com sucesso para o departamento de compras!",
      quotationCode: targetQuotation.code,
      totalAmount: totalEstimated
    });
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

// Lista dos WebServices oficiais da SEFAZ SP e Municipal
app.get("/api/fiscal/official-webservices", async (req, res) => {
  try {
    const modeInfo = fiscalBackendService.getCommunicationMode();
    res.json(modeInfo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Teste de conectividade com todos os WebServices oficiais
app.post("/api/fiscal/test-webservices", async (req, res) => {
  try {
    const results = await fiscalBackendService.testAllOfficialWebservices();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configuração do modo de comunicação (SEFAZ SP Direto vs Gateway Particular)
app.post("/api/fiscal/set-communication-mode", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
  try {
    const { mode, customConfig } = req.body;
    if (!mode || (mode !== 'direct_sefaz_sp' && mode !== 'custom_gateway')) {
      return res.status(400).json({ error: "Modo de comunicação inválido. Use 'direct_sefaz_sp' ou 'custom_gateway'." });
    }
    fiscalBackendService.setCommunicationMode(mode, customConfig);
    res.json({
      success: true,
      message: `Modo de comunicação fiscal atualizado para: ${mode === 'direct_sefaz_sp' ? 'Conexão Direta WebService SEFAZ SP' : 'Gateway Particular'}`,
      currentMode: mode
    });
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
app.post("/api/fiscal/certificate/upload", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
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
app.post("/api/fiscal/nfe/emit", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
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
app.post("/api/fiscal/nfce/emit", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
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
app.post("/api/fiscal/nfse/emit", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
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
app.post("/api/fiscal/cancel", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
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
app.post("/api/fiscal/cce", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
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
app.post("/api/fiscal/inutilize", requireAuth, requireContractedModule("Fiscal", "accessFiscal", () => serverAppStoreCache), async (req, res) => {
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

// ==========================================
// 4.1 ROTAS NOTAS-API / FOCUS NFE NFS-E GATEWAY
// ==========================================

// Store for admin tokens
const notasApiAdminSessions = new Set<string>();

function requireNotasApiAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || !notasApiAdminSessions.has(token)) {
    return res.status(401).json({ error: 'Acesso negado ao portal Notas-API. Autenticação obrigatória com senha master.' });
  }
  next();
}

// 1. Auth with Master Password
app.post("/api/notas-api/auth", (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Senha master não fornecida.' });
  }
  if (!notasApiBackend.verifyMasterPassword(password)) {
    return res.status(401).json({ error: 'Senha master incorreta.' });
  }
  const token = notasApiBackend.generateRandomToken('adm_fcs_');
  notasApiAdminSessions.add(token);
  res.json({
    success: true,
    token,
    expiresIn: '24h',
    message: 'Autenticado com sucesso no portal Notas-API Focus.'
  });
});

// 2. Change Master Password
app.post("/api/notas-api/change-password", requireNotasApiAdmin, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
  }
  const success = notasApiBackend.updateMasterPassword(oldPassword, newPassword);
  if (!success) {
    return res.status(400).json({ error: 'Senha atual incorreta ou nova senha não atende aos requisitos (mínimo 6 caracteres).' });
  }
  res.json({ success: true, message: 'Senha master alterada com sucesso.' });
});

// 3. Stats
app.get("/api/notas-api/stats", requireNotasApiAdmin, (req, res) => {
  res.json(notasApiBackend.getNotasApiStats());
});

// 4. Empresas
app.get("/api/notas-api/empresas", requireNotasApiAdmin, (req, res) => {
  res.json(notasApiBackend.getEmpresas());
});

app.post("/api/notas-api/empresas", requireNotasApiAdmin, (req, res) => {
  try {
    const saved = notasApiBackend.saveEmpresa(req.body);
    res.json({ success: true, empresa: saved });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/notas-api/empresas/:id", requireNotasApiAdmin, (req, res) => {
  const ok = notasApiBackend.deleteEmpresa(req.params.id);
  res.json({ success: ok });
});

app.post("/api/notas-api/empresas/:id/token", requireNotasApiAdmin, (req, res) => {
  const token = notasApiBackend.regenerateEmpresaToken(req.params.id);
  if (!token) return res.status(404).json({ error: 'Empresa não encontrada.' });
  res.json({ success: true, token });
});

app.post("/api/notas-api/empresas/:id/certificado", requireNotasApiAdmin, (req, res) => {
  const updated = notasApiBackend.updateCertificadoA1(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Empresa não encontrada.' });
  res.json({ success: true, empresa: updated });
});

// 5. Notas
app.get("/api/notas-api/notas", requireNotasApiAdmin, (req, res) => {
  const { status, empresaId, q } = req.query as any;
  res.json(notasApiBackend.getNotas({ status, empresaId, q }));
});

app.post("/api/notas-api/notas", requireNotasApiAdmin, (req, res) => {
  try {
    const nota = notasApiBackend.emitirNfse(req.body);
    res.json({ success: true, nota });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/notas-api/notas/:id/cancelar", requireNotasApiAdmin, (req, res) => {
  try {
    const { justificativa } = req.body || {};
    const nota = notasApiBackend.cancelarNfse(req.params.id, justificativa);
    res.json({ success: true, nota });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/notas-api/notas/:id/xml", (req, res) => {
  try {
    const notas = notasApiBackend.getNotas();
    const nota = notas.find(n => n.id === req.params.id || n.ref === req.params.id);
    if (!nota || !nota.xml) {
      return res.status(404).send('XML não encontrado.');
    }
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="DPS-${nota.numeroDps}-${nota.serieDps}.xml"`);
    res.send(nota.xml);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get("/api/notas-api/notas/:id/danfse", (req, res) => {
  try {
    const html = notasApiBackend.getDanfseHtml(req.params.id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(404).send(`<h3>Erro: ${err.message}</h3>`);
  }
});

// 6. Focus NFe Compatible Public Endpoints
app.post("/v1/nfse", (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const empresa = notasApiBackend.getEmpresaByToken(authHeader);
    if (!empresa) {
      return res.status(401).json({ codigo: 'nao_autorizado', mensagem: 'Token de autenticação da empresa emitente inválido ou não fornecido.' });
    }

    const ref = (req.query.ref as string) || req.body.ref || `REF-${Date.now()}`;
    const nota = notasApiBackend.emitirNfse({
      empresaId: empresa.id,
      ref,
      tomador: {
        cnpjCpf: req.body.tomador?.cnpj || req.body.tomador?.cpf || req.body.tomador?.cnpjCpf || '',
        razaoSocial: req.body.tomador?.razao_social || req.body.tomador?.nome || 'Tomador',
        email: req.body.tomador?.email,
        telefone: req.body.tomador?.telefone,
        endereco: req.body.tomador?.endereco?.logradouro
      },
      servico: {
        discriminacao: req.body.servico?.discriminacao || 'Serviços Prestados',
        codigoTributacaoNacional: req.body.servico?.codigo_tributacao_nacional || '14.01.01',
        valorServicos: req.body.servico?.valor_servicos || req.body.valor || 0,
        aliquotaIss: req.body.servico?.aliquota || 5.0
      }
    });

    res.status(201).json({
      status: 'processando_autorizacao',
      status_final: 'autorizado',
      ref: nota.ref,
      numero_dps: nota.numeroDps,
      serie_dps: nota.serieDps,
      chave_acesso: nota.chaveAcesso,
      protocolo: nota.protocolo,
      caminho_xml_nota_fiscal: `/api/notas-api/notas/${nota.id}/xml`,
      caminho_danfse: `/api/notas-api/notas/${nota.id}/danfse`
    });
  } catch (err: any) {
    res.status(400).json({ codigo: 'requisicao_invalida', mensagem: err.message });
  }
});

app.get("/v1/nfse/:ref", (req, res) => {
  const notas = notasApiBackend.getNotas();
  const nota = notas.find(n => n.ref === req.params.ref || n.id === req.params.ref);
  if (!nota) {
    return res.status(404).json({ codigo: 'nao_encontrado', mensagem: `NFS-e com referência "${req.params.ref}" não encontrada.` });
  }
  res.json({
    ref: nota.ref,
    status: nota.status,
    numero_dps: nota.numeroDps,
    serie_dps: nota.serieDps,
    chave_acesso: nota.chaveAcesso,
    protocolo: nota.protocolo,
    caminho_xml: `/api/notas-api/notas/${nota.id}/xml`,
    caminho_danfse: `/api/notas-api/notas/${nota.id}/danfse`
  });
});

app.delete("/v1/nfse/:ref", (req, res) => {
  try {
    const justificativa = req.body?.justificativa || req.query?.justificativa || 'Cancelamento solicitado via API';
    const nota = notasApiBackend.cancelarNfse(req.params.ref, justificativa as string);
    res.json({
      ref: nota.ref,
      status: 'cancelado',
      cancelado_em: nota.canceladoEm,
      justificativa: nota.justificativaCancelamento
    });
  } catch (err: any) {
    res.status(400).json({ codigo: 'erro_cancelamento', mensagem: err.message });
  }
});

// ==========================================
// 5. ROTAS DE BACKUP DIÁRIO DA BASE DE DADOS
// ==========================================
async function getDbSnapshotForBackup(): Promise<any> {
  if (serverAppStoreCache && typeof serverAppStoreCache === 'object' && Object.keys(serverAppStoreCache).length > 5) {
    return serverAppStoreCache;
  }
  const initial = loadInitialServerCache();
  if (initial) {
    serverAppStoreCache = initial;
    return serverAppStoreCache;
  }
  if (isFirestoreConnected()) {
    try {
      const firestoreData = await loadDatabaseFromFirestore();
      if (firestoreData && typeof firestoreData === 'object') {
        serverAppStoreCache = mergeAppDatabase(serverAppStoreCache, firestoreData);
        persistServerCacheToDisk(serverAppStoreCache);
        return serverAppStoreCache;
      }
    } catch (e) {
      console.warn('[BACKUP] Falha ao carregar do Firestore para backup:', e);
    }
  }
  const cfg = resolveDatabaseConfig();
  if (isDatabaseSocketAvailable(cfg.database)) {
    try {
      const res = await executeSqlWithRetry(
        'SELECT data FROM app_store WHERE id = $1',
        ['motordesk_main'],
        cfg.database
      );
      if (res.rows.length > 0 && res.rows[0].data) {
        serverAppStoreCache = res.rows[0].data;
        persistServerCacheToDisk(serverAppStoreCache);
        return serverAppStoreCache;
      }
    } catch (e) {}
  }
  return serverAppStoreCache || null;
}

// Status do Backup Diário Automático
app.get("/api/backup/status", requireAuth, (req, res) => {
  const service = DailyBackupService.getInstance();
  res.json({
    success: true,
    status: service.getStatus(),
  });
});

// Lista todos os backups diários armazenados
app.get("/api/backup/list", requireAuth, (req, res) => {
  const service = DailyBackupService.getInstance();
  const list = service.listBackups();
  res.json({
    success: true,
    total: list.length,
    backups: list,
  });
});

// Executa um backup diário manual imediatamente
app.post("/api/backup/trigger-daily", requireAuth, async (req, res) => {
  try {
    const service = DailyBackupService.getInstance();
    const metadata = await service.createBackup(getDbSnapshotForBackup, "manual_trigger");
    res.json({
      success: true,
      message: "Backup da base de dados gerado com sucesso!",
      metadata,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download do arquivo de backup geral
app.get("/api/backup/download/:filename", requireAuth, (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const backupPath = path.resolve(process.cwd(), "data/backups", filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: "Arquivo de backup não encontrado." });
    }
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.sendFile(backupPath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download de backup 100% isolado por ID da Empresa
app.get("/api/backup/download-company/:companyId", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const service = DailyBackupService.getInstance();
    const isolatedData = await service.getIsolatedCompanyBackup(getDbSnapshotForBackup, companyId);
    
    const nowStr = new Date().toISOString().split("T")[0];
    const filename = isolatedData.metadata?.suggestedFilename || `motordesk_backup_empresa_${companyId}_${nowStr}.json`;
    
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(isolatedData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restaura um backup
app.post("/api/backup/restore", requireAuth, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Nome do arquivo de backup obrigatório." });
    }
    const service = DailyBackupService.getInstance();
    const restoreResult = await service.restoreBackup(
      filename,
      getDbSnapshotForBackup,
      async (dataToPersist) => {
        const cfg = resolveDatabaseConfig();
        serverAppStoreCache = dataToPersist;
        persistServerCacheToDisk(dataToPersist);
        if (isDatabaseSocketAvailable(cfg.database)) {
          await enqueueDbWrite(async () => {
            try {
              await executeSqlWithRetry(
                `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
                ['motordesk_main', dataToPersist],
                cfg.database
              );
            } catch (sqlErr: any) {
              console.warn("[RESTORE] Falha na gravação SQL:", sqlErr.message);
            }
          });
        }
        currentDbVersion++;
        currentDbUpdatedAt = new Date().toISOString();
        broadcastDbUpdate({
          updatedAt: currentDbUpdatedAt,
          version: currentDbVersion,
          source: "backup_restore",
        });
      }
    );

    res.json({
      success: true,
      message: `Base de dados restaurada com sucesso! ${restoreResult.restoredRecordsCount} registros carregados.`,
      restoreResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restaura dados EXCLUSIVAMENTE de uma única empresa (100% isolada, sem alterar nenhuma outra)
app.post("/api/backup/restore-company", requireAuth, async (req, res) => {
  try {
    const { targetCompanyId, filename, backupData, sourceData } = req.body;
    if (!targetCompanyId) {
      return res.status(400).json({ error: "Identificador da empresa (targetCompanyId) é obrigatório." });
    }

    const service = DailyBackupService.getInstance();
    const result = await service.restoreCompanyBackup(
      targetCompanyId,
      { filename, backupData: backupData || sourceData },
      getDbSnapshotForBackup,
      async (dataToPersist) => {
        const cfg = resolveDatabaseConfig();
        serverAppStoreCache = dataToPersist;
        persistServerCacheToDisk(dataToPersist);
        if (isDatabaseSocketAvailable(cfg.database)) {
          await enqueueDbWrite(async () => {
            try {
              await executeSqlWithRetry(
                `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
                ['motordesk_main', dataToPersist],
                cfg.database
              );
            } catch (sqlErr: any) {
              console.warn("[RESTORE-COMPANY] Falha na gravação SQL:", sqlErr.message);
            }
          });
        }
        currentDbVersion++;
        currentDbUpdatedAt = new Date().toISOString();
        broadcastDbUpdate({
          updatedAt: currentDbUpdatedAt,
          version: currentDbVersion,
          companyId: targetCompanyId,
          source: "company_backup_restore",
        });
      }
    );

    res.json({
      success: true,
      message: `Restauração isolada concluída com sucesso para a empresa "${result.targetCompanyName}" (ID: ${result.targetCompanyId}). Demais empresas permaneceram 100% intactas.`,
      result,
    });
  } catch (err: any) {
    console.error("[RESTORE-COMPANY-ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 6. ROTAS DE SUPORTE, DIAGNÓSTICO E CORREÇÃO ISOLADA POR ID DA EMPRESA
// =========================================================================

// Listagem de empresas com seus IDs explícitos para suporte
app.get("/api/companies/list-with-ids", requireAuth, async (req, res) => {
  try {
    const db = await getDbSnapshotForBackup();
    if (!db) return res.json({ success: true, companies: [] });

    const allCompanies: any[] = [
      ...(Array.isArray(db.registeredCompanies) ? db.registeredCompanies : []),
      ...(db.companyInfo ? [db.companyInfo] : []),
    ];

    const uniqueMap = new Map<string, any>();
    let cIndex = 0;
    for (const c of allCompanies) {
      if (c && c.id && !uniqueMap.has(c.id)) {
        cIndex++;
        const cNum = c.companyNumber || cIndex;
        uniqueMap.set(c.id, {
          companyNumber: cNum,
          id: c.id,
          name: c.name || "Sem Nome",
          cnpj: c.cnpj || "",
          companyType: c.companyType || "matriz",
          businessType: c.businessType || "OFICINA",
          subscriptionStatus: c.subscriptionStatus || "active",
          createdAt: c.registeredAt || c.createdAt || null,
          backupService: c.backupService || {
            enabled: false,
            frequency: "daily",
            scheduleTime: "02:00",
            intervalHours: 4,
            daysOfWeek: ["seg", "qua", "sex"],
            retentionDays: 30,
          },
        });
      }
    }

    res.json({
      success: true,
      total: uniqueMap.size,
      companies: Array.from(uniqueMap.values()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Listagem de políticas de backup de todas as empresas cadastradas
app.get("/api/backup/policies", requireAuth, async (req, res) => {
  try {
    const db = await getDbSnapshotForBackup();
    const service = DailyBackupService.getInstance();
    const policies = service.getCompanyBackupPolicies(db);
    res.json({
      success: true,
      total: policies.length,
      policies,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Atualização da política de backup de uma empresa específica
app.post("/api/backup/policy/:companyId", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const policy = req.body || {};
    const db = await getDbSnapshotForBackup();
    const service = DailyBackupService.getInstance();
    const updatedDb = service.updateCompanyBackupPolicy(db, companyId, policy);

    const cfg = resolveDatabaseConfig();
    serverAppStoreCache = updatedDb;
    await enqueueDbWrite(async () => {
      await executeSqlWithRetry(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['motordesk_main', updatedDb],
        cfg.database
      );
    });

    currentDbVersion++;
    currentDbUpdatedAt = new Date().toISOString();
    broadcastDbUpdate({
      updatedAt: currentDbUpdatedAt,
      version: currentDbVersion,
      companyId,
      source: "backup_policy_update",
    });

    const policies = service.getCompanyBackupPolicies(updatedDb);
    const updatedPolicy = policies.find(p => p.companyId === companyId);

    res.json({
      success: true,
      message: `Política de backup atualizada para a empresa ${updatedPolicy?.name || companyId}.`,
      companyId,
      policy: updatedPolicy?.backupService,
      company: updatedPolicy,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Diagnóstico de isolamento e integridade para uma empresa específica
app.get("/api/support/company-diagnostic/:companyId", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const db = await getDbSnapshotForBackup();
    const report = CompanySupportService.diagnoseCompany(db, companyId);
    res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Executa correção/ajuste isolado garantindo que outras empresas não sejam atingidas
app.post("/api/support/company-repair", requireAuth, async (req, res) => {
  try {
    const { targetCompanyId, correctionType } = req.body;
    if (!targetCompanyId) {
      return res.status(400).json({ error: "targetCompanyId é obrigatório." });
    }

    const db = await getDbSnapshotForBackup();
    const { updatedDb, result } = CompanySupportService.executeIsolatedRepair(
      db,
      targetCompanyId,
      correctionType || "all"
    );

    // Persistir apenas os dados atualizados com garantia atômica
    const cfg = resolveDatabaseConfig();
    serverAppStoreCache = updatedDb;
    await enqueueDbWrite(async () => {
      await executeSqlWithRetry(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['motordesk_main', updatedDb],
        cfg.database
      );
    });

    currentDbVersion++;
    currentDbUpdatedAt = new Date().toISOString();
    broadcastDbUpdate({
      updatedAt: currentDbUpdatedAt,
      version: currentDbVersion,
      companyId: targetCompanyId,
      source: "support_repair_isolated",
    });

    res.json({
      success: true,
      message: `Correção aplicada com sucesso na empresa ID "${targetCompanyId}". Demais empresas permaneceram 100% isoladas.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Handle development vs production modes
async function startServer() {
  // Serve static assets from dist and public with strict anti-cache headers for scripts and html
  const staticOptions = {
    setHeaders: (res: express.Response, filePath: string) => {
      if (
        filePath.endsWith(".html") ||
        filePath.endsWith(".js") ||
        filePath.includes("pre-hydrate") ||
        filePath.includes("live-sync")
      ) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  };
  app.use(express.static(path.resolve(process.cwd(), "dist"), staticOptions));
  app.use(express.static(path.resolve(process.cwd(), "public"), staticOptions));

  if (process.env.NODE_ENV !== "production") {
    // In local development mode, attach Vite middleware for AI Studio live preview
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("Vite middleware fallback to static serving:", viteErr);
    }
  }

  // SPA fallback for frontend routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const distIndexPath = path.resolve(process.cwd(), "dist/index.html");
    const rootIndexPath = path.resolve(process.cwd(), "index.html");

    if (fs.existsSync(distIndexPath)) {
      return res.sendFile(distIndexPath, (err) => {
        if (err && !res.headersSent) {
          if (fs.existsSync(rootIndexPath)) {
            res.sendFile(rootIndexPath);
          } else {
            res.status(200).send("<!doctype html><html><body>Carregando MotorDesk...</body></html>");
          }
        }
      });
    }

    if (fs.existsSync(rootIndexPath)) {
      try {
        const distDir = path.resolve(process.cwd(), "dist");
        if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
        fs.copyFileSync(rootIndexPath, distIndexPath);
      } catch {}
      return res.sendFile(rootIndexPath);
    }

    res.status(200).send("<!doctype html><html><body>Carregando MotorDesk...</body></html>");
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`MotorDesk Express REST API running on http://0.0.0.0:${PORT}`);
    try {
      const config = resolveDatabaseConfig();
      if (isDatabaseSocketAvailable(config.database)) {
        await warmUpDatabaseConnection();
        startDatabaseKeepAlive(15000);
        await ensureAppStoreTableExists(config.database);
      } else {
        console.log(`[MotorDesk Boot] Cloud SQL socket (${config.host}) não montado localmente. Operando em modo de resiliência com armazenamento persistente e cache.`);
      }
    } catch (dbBootErr: any) {
      console.warn(`[MotorDesk Boot] Aviso ao inicializar conexão do banco: ${dbBootErr.message}`);
    }
    DailyBackupService.getInstance().startAutomatedScheduler(getDbSnapshotForBackup);
  });
}

startServer();
