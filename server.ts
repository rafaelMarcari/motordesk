import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { getDbInstance, checkDatabaseHealth, ensureAppStoreTableExists, createPool, extractPgErrorDetails, resolveDatabaseConfig, executeSqlWithRetry, warmUpDatabaseConnection, startDatabaseKeepAlive, isDatabaseSocketAvailable, isRemoteDatabaseConfigured, withDbTransaction } from "./src/db/index.js";
import { appStore, clients as clientsTable, vehicles as vehiclesTable, parts as partsTable, serviceOrders as serviceOrdersTable } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { isCompanyActive } from "./src/utils/securityUtils.js";
import { fiscalBackendService } from "./server/fiscalProviderService.js";
import { DailyBackupService } from "./server/dailyBackupService.js";
import { CompanySupportService } from "./server/companySupportService.js";
import * as notasApiBackend from "./src/services/notasApiBackend.js";

dotenv.config();

// Fonte única de verdade: PostgreSQL (Neon). O Firestore não é mais lido nem gravado,
// evitando que navegadores/computadores enxerguem bases divergentes.

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

// 3.1. Mantém o cache em memória alinhado ao banco antes de qualquer rota que leia dele.
// Necessário quando há mais de uma instância/servidor: uma gravação feita em outra
// instância altera a versão no banco e o cache local é recarregado.
const ROUTES_WITHOUT_CACHE_REFRESH = new Set(["/api/db", "/api/db/version", "/api/db/stream", "/api/health", "/health"]);
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") && req.method !== "OPTIONS" && !ROUTES_WITHOUT_CACHE_REFRESH.has(req.path)) {
    await refreshServerCacheIfStale();
  }
  next();
});

// 3.2. Autenticação: identifica o usuário pela sessão (token emitido no login pelo servidor)
// e bloqueia qualquer rota /api não pública sem sessão válida.
app.use(async (req: any, res, next) => {
  await attachAuthContext(req);
  if (!isPublicApiRoute(req) && !req.authUser) {
    return res.status(401).json({
      success: false,
      code: "AUTH_REQUIRED",
      error: "Sessão expirada ou inválida. Faça login novamente.",
    });
  }
  next();
});

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

  // 4.2. Colaborador desligado: a sessão deixa de ser aceita em attachAuthContext (isUserActive)
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
  const latencyMs = Date.now() - startTime;
  const status = dbHealth.connected ? "ok" : "degraded";
  const statusCode = dbHealth.connected ? 200 : 503;

  res.status(statusCode).json({
    status,
    database: dbHealth.connected ? "connected" : "disconnected",
    databaseProvider: isRemoteDatabaseConfigured() ? "neon_postgresql" : "postgresql",
    databaseName: dbHealth.database || null,
    databaseUser: dbHealth.databaseUser || null,
    databaseHost: dbHealth.databaseHost || null,
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

// Arquivo local só é usado como armazenamento quando NÃO há banco configurado (desenvolvimento offline).
// Com o Neon configurado, o banco é a única fonte de verdade e nada é gravado em disco.
function persistServerCacheToDisk(data: any): void {
  if (hasDatabaseBackend()) return;
  try {
    if (!data || typeof data !== "object") return;
    const dir = path.dirname(STORE_PERSISTENCE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PERSISTENCE_PATH, JSON.stringify(data), "utf-8");
  } catch (e: any) {
    console.warn("[MotorDesk Store] Falha ao persistir em disco:", e.message);
  }
}

// Cache em memória: espelho somente-leitura do banco, recarregado quando a versão no banco muda
let serverAppStoreCache: any = isRemoteDatabaseConfigured() ? null : loadInitialServerCache();

// Write mutex / sequential queue to prevent async race conditions during concurrent multi-browser writes
let dbWriteQueue: Promise<any> = Promise.resolve();

function enqueueDbWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = dbWriteQueue.then(() => task(), () => task());
  dbWriteQueue = next.catch(() => {});
  return next;
}

// ============================================================================
// FONTE ÚNICA DE VERDADE: PostgreSQL (Neon) — tabela app_store, registro motordesk_main
// ----------------------------------------------------------------------------
// - Toda leitura de /api/db vem do banco (nunca de cache local).
// - Toda gravação é uma transação "SELECT ... FOR UPDATE -> merge -> UPDATE",
//   serializada no próprio banco: funciona com vários servidores/instâncias.
// - A versão é derivada de updated_at no banco, então qualquer navegador em qualquer
//   máquina detecta a mudança via /api/db/version, independente da instância que gravou.
// ============================================================================
const APP_STORE_ID = "motordesk_main";
const VERSION_SQL_COLUMNS = "(EXTRACT(EPOCH FROM updated_at) * 1000000)::bigint AS version, updated_at";

let serverCacheVersion = 0;
let lastVersionCheck: { at: number; version: number; updatedAt: string | null } | null = null;
let versionCheckInFlight: Promise<{ at: number; version: number; updatedAt: string | null }> | null = null;

function hasDatabaseBackend(): boolean {
  if (isRemoteDatabaseConfigured()) return true;
  return isDatabaseSocketAvailable(resolveDatabaseConfig().database);
}

function toIsoTimestamp(value: any): string {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function rememberDbVersion(version: number, updatedAt: string | null): void {
  lastVersionCheck = { at: Date.now(), version, updatedAt };
  currentDbVersion = version;
  if (updatedAt) currentDbUpdatedAt = updatedAt;
}

// Consulta leve (sem trafegar o JSON) da versão atual no banco, com memo curto para aliviar o polling
async function getDbVersion(maxAgeMs = 1000): Promise<{ version: number; updatedAt: string | null }> {
  if (!hasDatabaseBackend()) {
    return { version: currentDbVersion, updatedAt: currentDbUpdatedAt };
  }
  if (lastVersionCheck && Date.now() - lastVersionCheck.at < maxAgeMs) {
    return lastVersionCheck;
  }
  if (!versionCheckInFlight) {
    versionCheckInFlight = (async () => {
      const cfg = resolveDatabaseConfig();
      const result = await executeSqlWithRetry(
        `SELECT ${VERSION_SQL_COLUMNS} FROM app_store WHERE id = $1`,
        [APP_STORE_ID],
        cfg.database,
        2
      );
      const row = result.rows[0];
      rememberDbVersion(Number(row?.version) || 0, row ? toIsoTimestamp(row.updated_at) : null);
      return lastVersionCheck!;
    })().finally(() => {
      versionCheckInFlight = null;
    });
  }
  return versionCheckInFlight;
}

async function readAppStoreFromDb(): Promise<{ data: any; version: number; updatedAt: string } | null> {
  const cfg = resolveDatabaseConfig();
  const result = await executeSqlWithRetry(
    `SELECT data, ${VERSION_SQL_COLUMNS} FROM app_store WHERE id = $1`,
    [APP_STORE_ID],
    cfg.database
  );
  const row = result.rows[0];
  if (!row || !row.data) return null;

  const data = sanitizeAndIsolateCompanies(row.data);
  const version = Number(row.version) || 0;
  const updatedAt = toIsoTimestamp(row.updated_at);
  serverAppStoreCache = data;
  serverCacheVersion = version;
  rememberDbVersion(version, updatedAt);
  return { data, version, updatedAt };
}

async function refreshServerCacheIfStale(): Promise<void> {
  if (!hasDatabaseBackend()) return;
  try {
    const { version } = await getDbVersion(1500);
    if (!serverAppStoreCache || version !== serverCacheVersion) {
      await readAppStoreFromDb();
    }
  } catch (err: any) {
    console.warn(`[MotorDesk DB] Não foi possível verificar a versão do banco: ${err.message}`);
  }
}

// Erro de regra de negócio lançado dentro de uma mutação (desfaz a transação e vira resposta HTTP)
function appStoreError(message: string, httpStatus = 400): Error {
  const err: any = new Error(message);
  err.httpStatus = httpStatus;
  return err;
}

/**
 * Lê o estado atual DIRETO do banco com bloqueio de linha, aplica `mutator` e grava o resultado
 * na mesma transação. Ao final notifica todos os navegadores conectados.
 * Lança erro se o banco estiver indisponível — nunca reporta sucesso sem gravar no banco.
 */
async function mutateAppStore(
  mutator: (current: any) => any | Promise<any>,
  meta: { source: string; companyId?: string; userId?: string }
): Promise<{ data: any; version: number; updatedAt: string }> {
  const result = await enqueueDbWrite(async () => {
    if (!hasDatabaseBackend()) {
      const next = await mutator(serverAppStoreCache);
      if (!next || typeof next !== "object") throw appStoreError("Mutação inválida do banco de dados", 500);
      hashPlaintextPasswords(next);
      serverAppStoreCache = next;
      persistServerCacheToDisk(next);
      const version = Math.max(currentDbVersion + 1, Date.now() * 1000);
      const updatedAt = new Date().toISOString();
      serverCacheVersion = version;
      rememberDbVersion(version, updatedAt);
      return { data: next, version, updatedAt };
    }

    const cfg = resolveDatabaseConfig();
    return withDbTransaction(async (client) => {
      const cur = await client.query(`SELECT data FROM app_store WHERE id = $1 FOR UPDATE`, [APP_STORE_ID]);
      const current = cur.rows[0]?.data ?? null;
      const next = await mutator(current);
      if (!next || typeof next !== "object") throw appStoreError("Mutação inválida do banco de dados", 500);
      hashPlaintextPasswords(next);

      const written = await client.query(
        `INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2, clock_timestamp())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = clock_timestamp()
         RETURNING ${VERSION_SQL_COLUMNS}`,
        [APP_STORE_ID, JSON.stringify(next)]
      );
      const row = written.rows[0];
      return { data: next, version: Number(row?.version) || Date.now() * 1000, updatedAt: toIsoTimestamp(row?.updated_at) };
    }, cfg.database);
  });

  serverAppStoreCache = result.data;
  serverCacheVersion = result.version;
  rememberDbVersion(result.version, result.updatedAt);
  broadcastDbUpdate({
    updatedAt: result.updatedAt,
    version: result.version,
    companyId: meta.companyId,
    userId: meta.userId,
    source: meta.source,
  });
  return result;
}

// ============================================================================
// AUTENTICAÇÃO E AUTORIZAÇÃO NO SERVIDOR
// ----------------------------------------------------------------------------
// - Senhas são verificadas somente aqui (hash scrypt). Senhas legadas em texto puro
//   são convertidas para hash na primeira gravação/login.
// - Sessões ficam na tabela user_sessions do banco: valem em qualquer servidor/instância.
// - A identidade vem da sessão; cabeçalhos X-User-Id / X-User-Role do navegador são ignorados.
// - passwordHash nunca é enviado ao navegador.
// ============================================================================
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_CACHE_MS = 30 * 1000;
const MASTER_USERNAMES = new Set(["admin", "validador"]);
const SCRYPT_PREFIX = "scrypt$";

type SessionRecord = { userId: string; companyId: string | null; expiresAt: number };
const memorySessions = new Map<string, SessionRecord>();
const sessionCache = new Map<string, SessionRecord & { checkedAt: number }>();

// Coleções operacionais isoladas por empresa (companyId)
const TENANT_COLLECTIONS = [
  'clients', 'suppliers', 'vehicles', 'parts', 'services', 'budgets', 'serviceOrders', 'sales', 'goodsWithdrawals',
  'quotations', 'supplierPartPrices', 'accountsReceivable', 'accountsPayable', 'financialTransactions', 'fiscalDocuments',
  'boletos', 'interBranchSales', 'stockMovements', 'maintenanceLogs', 'boms', 'billOfMaterials', 'productionOrders',
  'solidworksProjects', 'materialSeparations', 'productLots', 'operationalAlerts', 'factoryOperators', 'history',
  'notifications', 'carriers', 'taxObligationGuides', 'installedEquipment', 'equipmentMaintenancePlans',
  'equipmentMaintenanceOrders', 'productionScrapLogs', 'productionReworkLogs', 'purchaseHistory', 'billingClosings',
  'monthlyAccountingClosings', 'qualityInspections', 'technicalDocuments', 'warehouseLocations', 'shopFloorEntries',
  'nonConformityReports', 'bankStatements', 'unitsOfMeasure', 'accessGroups', 'pendingPriceRevisions',
  'priceChangeHistory', 'priceCalculationHistory',
];

// Campos de contrato/licença da empresa: só o administrador mestre da plataforma altera
const PROTECTED_COMPANY_FIELDS = [
  'globalModules', 'contractModules', 'modules', 'subscriptionStatus', 'paymentStatus', 'expirationDate',
  'userLimit', 'additionalUserPrice', 'monthlyFee', 'basePlanFee', 'enableRepresentativeCommerce', 'backupService',
];

// Campos de acesso do usuário: só quem gerencia usuários altera (e nunca no próprio cadastro por /api/db)
const PROTECTED_USER_FIELDS = [
  'role', 'permissions', 'individualExceptions', 'customPermissions', 'allowedCompanyIds', 'companyId', 'groupId',
  'accessGroupId', 'isTerminated', 'contractEndDate', 'terminationDate', 'status', 'isActive', 'active', 'username',
  'passwordHash', 'passwordUpdatedAt', 'mustChangePassword', 'firstAccess', 'hasChosenPassword',
];

const PUBLIC_COMPANY_FIELDS = ['id', 'name', 'tradeName', 'businessType', 'companyType', 'logo', 'logoUrl', 'phone', 'whatsapp', 'email', 'address', 'welcomeMessage'];

function lc(v: any): string {
  return String(v || '').trim().toLowerCase();
}

function isMasterAccount(u: any): boolean {
  return Boolean(u && (MASTER_USERNAMES.has(lc(u.username)) || u.role === 'qa'));
}

function isUserActive(u: any): boolean {
  if (!u) return false;
  const hasContractEnd = Boolean(u.contractEndDate && String(u.contractEndDate).trim());
  return !(u.isTerminated || u.status === 'terminated' || u.isActive === false || u.active === false || hasContractEnd);
}

function isPasswordHashed(value: any): boolean {
  return typeof value === 'string' && value.startsWith(SCRYPT_PREFIX);
}

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}${salt}$${hash}`;
}

function verifyPassword(plain: string, stored: any): boolean {
  if (!plain || !stored || typeof stored !== 'string') return false;
  if (isPasswordHashed(stored)) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = crypto.scryptSync(plain, salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  // Legado: senha gravada em texto puro (convertida para hash na próxima gravação)
  const a = Buffer.from(stored);
  const b = Buffer.from(plain);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hashPlaintextPasswords(db: any): void {
  if (!db || !Array.isArray(db.users)) return;
  for (const u of db.users) {
    if (u && typeof u.passwordHash === 'string' && u.passwordHash && !isPasswordHashed(u.passwordHash)) {
      u.passwordHash = hashPassword(u.passwordHash);
    }
  }
}

function sanitizeUserForClient(u: any): any {
  if (!u || typeof u !== 'object') return u;
  const { passwordHash, ...rest } = u;
  return rest;
}

function pickFields(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') return null;
  const out: any = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

function allCompanyIds(db: any): string[] {
  return (Array.isArray(db?.registeredCompanies) ? db.registeredCompanies : []).map((c: any) => c?.id).filter(Boolean);
}

// Empresas em que o usuário está cadastrado (empresa principal + empresas adicionais)
function userCompanyIds(u: any, db: any): string[] {
  if (!u) return [];
  const allowed = Array.isArray(u.allowedCompanyIds) ? u.allowedCompanyIds : [];
  if (isMasterAccount(u) || allowed.includes('*')) return allCompanyIds(db);
  return [...new Set([u.companyId, ...allowed].filter((id: any) => id && id !== '*'))];
}

function findCompany(db: any, companyId: string | null | undefined): any {
  if (!companyId) return null;
  return (db?.registeredCompanies || []).find((c: any) => c?.id === companyId) ||
    (db?.companyInfo?.id === companyId ? db.companyInfo : null);
}

// Empresa efetiva da requisição: a solicitada, se o usuário tiver vínculo; senão a principal dele
function companyForUser(db: any, u: any, requestedId?: string | null): any {
  const ids = userCompanyIds(u, db);
  const target = requestedId && requestedId !== 'all' && ids.includes(requestedId) ? requestedId : (u?.companyId || ids[0]);
  return findCompany(db, target);
}

// Chave de módulo a que uma permissão pertence (ex.: fiscalEmit -> accessFiscal)
function permissionModuleKey(key: string): string {
  if (key.startsWith('access')) return key;
  const rules: Array<[RegExp, string]> = [
    [/^(fiscal|sefaz|nfe|nfce|nfse)/i, 'accessFiscal'],
    [/^(boleto|pix)/i, 'accessBoletos'],
    [/^accountsReceivable/i, 'accessAccountsReceivable'],
    [/^accountsPayable/i, 'accessAccountsPayable'],
    [/^financial/i, 'accessFinancial'],
    [/^sales/i, 'accessSales'],
    [/^(budgets|canEditBudgets)/i, 'accessBudgets'],
    [/^serviceOrders/i, 'accessServiceOrders'],
    [/^clients/i, 'accessClients'],
    [/^vehicles/i, 'accessVehicles'],
    [/^parts/i, 'accessParts'],
    [/^services/i, 'accessServices'],
    [/^quotations/i, 'accessQuotations'],
    [/^carriers/i, 'accessCarriers'],
    [/^unitsOfMeasure/i, 'accessUnitsOfMeasure'],
    [/^reports/i, 'accessReports'],
    [/^history/i, 'accessHistory'],
    [/^(production|bom)/i, 'accessProduction'],
    [/^representative/i, 'accessRepresentativeCommerce'],
  ];
  for (const [re, moduleKey] of rules) if (re.test(key)) return moduleKey;
  return key;
}

// Bloqueio explícito do módulo no contrato da empresa (mesma regra usada nas telas)
function companyBlocksKey(company: any, key: string): boolean {
  if (!company) return false;
  const gm = company.globalModules || {};
  const mm = company.modules || {};
  const cm = company.contractModules || {};
  if (gm[key] === false || mm[key] === false || cm[key] === false) return true;
  const contract = cm[key];
  if (contract && typeof contract === 'object') {
    if (contract.contracted === false || contract.status === 'canceled' || contract.status === 'suspended') return true;
    const today = new Date().toISOString().slice(0, 10);
    if ((contract.startDate && contract.startDate > today) || (contract.endDate && contract.endDate < today)) return true;
  }
  return false;
}

function companyAllowsPermission(company: any, key: string): boolean {
  if (!company) return false;
  if (company.subscriptionStatus === 'blocked' || company.subscriptionStatus === 'overdue') return false;
  return !companyBlocksKey(company, key) && !companyBlocksKey(company, permissionModuleKey(key));
}

// Permissão efetiva = empresa contratou o módulo E o usuário recebeu a permissão
function hasEffectivePermission(u: any, company: any, key: string): boolean {
  if (!u || !isUserActive(u)) return false;
  if (isMasterAccount(u)) return true;
  if (!companyAllowsPermission(company, key)) return false;
  const p = u.permissions || {};
  const ie = u.individualExceptions || {};
  const cp = u.customPermissions || {};
  if (p[key] === false || ie[key] === false || cp[key] === false) return false;
  if (p[key] === true || ie[key] === true || cp[key] === true) return true;
  // Administrador da empresa: tudo o que a empresa contratou
  return u.role === 'admin';
}

function canManageUsers(u: any, company: any): boolean {
  return isMasterAccount(u) || hasEffectivePermission(u, company, 'accessUserManagement');
}

// Remove permissões de módulos que nenhuma empresa do usuário contratou
function clampPermissionsToContract(target: any, db: any): void {
  if (!target || isMasterAccount(target)) return;
  const companies = userCompanyIds(target, db).map((id) => findCompany(db, id)).filter(Boolean);
  if (companies.length === 0) return;
  for (const field of ['permissions', 'individualExceptions', 'customPermissions']) {
    const perms = target[field];
    if (!perms || typeof perms !== 'object') continue;
    const next = { ...perms };
    for (const [key, value] of Object.entries(perms)) {
      const blockedEverywhere = companies.every((c: any) => companyBlocksKey(c, key) || companyBlocksKey(c, permissionModuleKey(key)));
      if (value === true && blockedEverywhere) {
        next[key] = false;
      }
    }
    target[field] = next;
  }
}

/**
 * Filtra o que um usuário pode gravar via POST /api/db antes do merge:
 * - registros só das empresas em que ele está cadastrado;
 * - contrato/módulos da empresa só pelo administrador mestre;
 * - usuários só por quem gerencia usuários, dentro das próprias empresas,
 *   sem conceder empresa ou módulo fora do que a empresa contratou.
 */
function guardIncomingDatabase(current: any, incoming: any, user: any, activeCompanyId: string): any {
  const db = current || {};
  const out: any = { ...incoming };
  const master = isMasterAccount(user);
  const allowed = new Set(userCompanyIds(user, db));
  const activeCompany = companyForUser(db, user, activeCompanyId);

  if (!master) {
    // 1. Dados operacionais apenas das empresas do usuário
    for (const key of TENANT_COLLECTIONS) {
      if (!Array.isArray(out[key])) continue;
      out[key] = out[key]
        .filter((r: any) => r && (!r.companyId || allowed.has(r.companyId)))
        .map((r: any) => (r.companyId ? r : { ...r, companyId: activeCompany?.id || user.companyId }));
    }

    // 2. Empresas: sem criar empresas e sem alterar contrato/licença
    const existingCompanies = new Map((db.registeredCompanies || []).map((c: any) => [c?.id, c]));
    const restoreProtected = (c: any) => {
      const prev: any = existingCompanies.get(c.id) || (db.companyInfo?.id === c.id ? db.companyInfo : null);
      if (!prev) return null;
      const safe = { ...c };
      for (const f of PROTECTED_COMPANY_FIELDS) {
        if (prev[f] === undefined) delete safe[f];
        else safe[f] = prev[f];
      }
      return safe;
    };
    if (Array.isArray(out.registeredCompanies)) {
      out.registeredCompanies = out.registeredCompanies
        .filter((c: any) => c && allowed.has(c.id))
        .map(restoreProtected)
        .filter(Boolean);
    }
    if (out.companyInfo) {
      out.companyInfo = allowed.has(out.companyInfo.id) ? restoreProtected(out.companyInfo) : null;
      if (!out.companyInfo) delete out.companyInfo;
    }
    delete out.globalModules;
    delete out.contractModules;
    delete out.landingContent;

    // 3. Configuração fiscal só com o módulo fiscal liberado
    if (!hasEffectivePermission(user, activeCompany, 'accessFiscal')) {
      delete out.sefazConfig;
      delete out.taxRules;
      delete out.taxOperationNatures;
    }
  }

  // 4. Usuários e perfis de acesso
  if (Array.isArray(out.users)) {
    const existingUsers = new Map((db.users || []).map((u: any) => [u?.id, u]));
    const manager = canManageUsers(user, activeCompany);
    const guarded: any[] = [];
    for (const u of out.users) {
      if (!u || !u.id) continue;
      const prev: any = existingUsers.get(u.id);
      let next = { ...u };

      if (u.id === user.id) {
        // Próprio cadastro: dados pessoais sim; acesso e senha não (senha só por /api/users/update-password)
        if (!prev) continue;
        for (const f of PROTECTED_USER_FIELDS) {
          if (prev[f] === undefined) delete next[f];
          else next[f] = prev[f];
        }
        guarded.push(next);
        continue;
      }

      if (!manager) continue;
      if (!master) {
        // Gestor de empresa: apenas usuários das próprias empresas; nunca contas mestres
        const targetCompanies = userCompanyIds(prev || u, db);
        if (prev && (isMasterAccount(prev) || !targetCompanies.some((id) => allowed.has(id)))) continue;
        if (!prev && (MASTER_USERNAMES.has(lc(u.username)) || !allowed.has(u.companyId))) continue;
        if (next.role === 'qa') next.role = prev?.role || 'atendente';
        if (prev && !allowed.has(prev.companyId)) next.companyId = prev.companyId;
        if (!allowed.has(next.companyId)) next.companyId = prev?.companyId || activeCompany?.id;
        // Empresas adicionais: só dentro do alcance do gestor (mantém as de fora que já existiam)
        const outsideScope = (prev?.allowedCompanyIds || []).filter((id: string) => id !== '*' && !allowed.has(id));
        const requested = (Array.isArray(next.allowedCompanyIds) ? next.allowedCompanyIds : []).filter((id: string) => id !== '*' && allowed.has(id));
        next.allowedCompanyIds = [...new Set([...outsideScope, ...requested])];
      }
      clampPermissionsToContract(next, db);
      guarded.push(next);
    }
    out.users = guarded;
  }

  if (!master && Array.isArray(out.accessGroups) && !canManageUsers(user, activeCompany)) {
    delete out.accessGroups;
  }

  return out;
}

// Remove segredos antes de enviar dados ao navegador
function stripSecretsForClient(data: any, user: any, companyId?: string): any {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };
  if (Array.isArray(out.users)) out.users = out.users.map(sanitizeUserForClient);
  if (out.sefazConfig && !hasEffectivePermission(user, companyForUser(data, user, companyId) || data.companyInfo, 'accessFiscal')) {
    out.sefazConfig = {};
  }
  return out;
}

// "Vitrine" pública para quem ainda não fez login: só o necessário para o site e a tela de login
function buildPublicShell(db: any): any {
  const shell: any = {};
  for (const [key, value] of Object.entries(db || {})) {
    if (Array.isArray(value)) shell[key] = [];
    else if (value && typeof value === 'object') shell[key] = {};
  }
  shell.companyInfo = pickFields(db?.companyInfo, PUBLIC_COMPANY_FIELDS);
  shell.landingContent = db?.landingContent || null;
  shell.registeredCompanies = [];
  shell.users = [];
  if (db?.activeAccountingPeriod) shell.activeAccountingPeriod = db.activeAccountingPeriod;
  return shell;
}

// ---- Sessões --------------------------------------------------------------
let authTablesReady: Promise<void> | null = null;
function ensureAuthTables(): Promise<void> {
  if (!hasDatabaseBackend()) return Promise.resolve();
  if (!authTablesReady) {
    const cfg = resolveDatabaseConfig();
    authTablesReady = (async () => {
      await executeSqlWithRetry(
        `CREATE TABLE IF NOT EXISTS user_sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          company_id TEXT,
          created_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL,
          user_agent TEXT,
          ip TEXT
        );`,
        [],
        cfg.database
      );
      await executeSqlWithRetry(`CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id);`, [], cfg.database);
      await executeSqlWithRetry(`DELETE FROM user_sessions WHERE expires_at < $1`, [Date.now()], cfg.database);
    })().catch((err) => {
      authTablesReady = null;
      throw err;
    });
  }
  return authTablesReady;
}

async function createSession(userId: string, companyId: string | null, req: any): Promise<{ token: string; expiresAt: number }> {
  const token = `mds_${crypto.randomBytes(32).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  if (hasDatabaseBackend()) {
    await ensureAuthTables();
    await executeSqlWithRetry(
      `INSERT INTO user_sessions (token, user_id, company_id, created_at, expires_at, user_agent, ip) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [token, userId, companyId, now, expiresAt, String(req.headers['user-agent'] || '').slice(0, 300), getClientIp(req)],
      resolveDatabaseConfig().database
    );
  } else {
    memorySessions.set(token, { userId, companyId, expiresAt });
  }
  sessionCache.set(token, { userId, companyId, expiresAt, checkedAt: now });
  return { token, expiresAt };
}

async function getSession(token: string): Promise<SessionRecord | null> {
  if (!token || !token.startsWith('mds_')) return null;
  const now = Date.now();
  const cached = sessionCache.get(token);
  if (cached && now - cached.checkedAt < SESSION_CACHE_MS) {
    return cached.expiresAt > now ? cached : null;
  }

  let session: SessionRecord | null = null;
  if (hasDatabaseBackend()) {
    await ensureAuthTables();
    const result = await executeSqlWithRetry(
      `SELECT user_id, company_id, expires_at FROM user_sessions WHERE token = $1`,
      [token],
      resolveDatabaseConfig().database,
      2
    );
    const row = result.rows[0];
    if (row) session = { userId: row.user_id, companyId: row.company_id, expiresAt: Number(row.expires_at) };
  } else {
    session = memorySessions.get(token) || null;
  }

  if (!session || session.expiresAt <= now) {
    sessionCache.delete(token);
    return null;
  }

  // Expiração deslizante: renova enquanto o usuário estiver usando o sistema
  if (session.expiresAt - now < SESSION_TTL_MS - 15 * 60 * 1000) {
    session.expiresAt = now + SESSION_TTL_MS;
    if (hasDatabaseBackend()) {
      executeSqlWithRetry(`UPDATE user_sessions SET expires_at = $2 WHERE token = $1`, [token, session.expiresAt], resolveDatabaseConfig().database, 1).catch(() => {});
    }
  }
  sessionCache.set(token, { ...session, checkedAt: now });
  return session;
}

async function deleteSession(token: string): Promise<void> {
  sessionCache.delete(token);
  memorySessions.delete(token);
  if (hasDatabaseBackend() && token) {
    await ensureAuthTables();
    await executeSqlWithRetry(`DELETE FROM user_sessions WHERE token = $1`, [token], resolveDatabaseConfig().database);
  }
}

// Encerra as outras sessões do usuário (ex.: após troca de senha)
async function deleteOtherUserSessions(userId: string, keepToken?: string): Promise<void> {
  for (const [token, s] of sessionCache) if (s.userId === userId && token !== keepToken) sessionCache.delete(token);
  for (const [token, s] of memorySessions) if (s.userId === userId && token !== keepToken) memorySessions.delete(token);
  if (hasDatabaseBackend()) {
    await ensureAuthTables();
    await executeSqlWithRetry(
      `DELETE FROM user_sessions WHERE user_id = $1 AND token <> $2`,
      [userId, keepToken || ''],
      resolveDatabaseConfig().database
    );
  }
}

function bearerToken(req: any): string {
  // Aceita o primeiro valor caso o navegador tenha enviado o cabeçalho repetido ("Bearer a, Bearer b")
  const header = String(req.headers.authorization || '').split(',')[0].trim();
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function attachAuthContext(req: any): Promise<void> {
  req.authUser = null;
  req.authSession = null;
  const token = bearerToken(req);
  if (!token.startsWith('mds_')) return;
  try {
    const session = await getSession(token);
    if (!session) return;
    if (!serverAppStoreCache) await refreshServerCacheIfStale();
    const user = (serverAppStoreCache?.users || []).find((u: any) => u && u.id === session.userId);
    if (user && isUserActive(user)) {
      req.authUser = user;
      req.authSession = { token, ...session };
    }
  } catch (err: any) {
    console.warn(`[AUTH] Falha ao validar sessão: ${err.message}`);
  }
}

// Rotas que não exigem sessão (site público, tela de login, portal do fornecedor, etc.)
function isPublicApiRoute(req: any): boolean {
  const p: string = req.path;
  const m: string = req.method;
  if (!p.startsWith('/api') || m === 'OPTIONS') return true;
  if (p === '/api' || p === '/api/health') return true;
  if (p === '/api/db' && m === 'GET') return true; // sem sessão responde apenas a vitrine pública
  if (p === '/api/db/version' || p === '/api/db/stream') return true;
  if (p === '/api/auth/login' || p === '/api/auth/login-companies') return true;
  if (['/api/auth/check-session', '/api/auth/knockdown-session', '/api/auth/register-session', '/api/auth/logout-session', '/api/auth/session-heartbeat'].includes(p)) return true;
  if ((p === '/api/landing' || p === '/api/site') && m === 'GET') return true;
  if (p === '/api/companies' && m === 'GET') return true;
  if (p.startsWith('/api/public/')) return true;
  if (p.startsWith('/api/notas-api/')) return true; // autenticação própria (requireNotasApiAdmin)
  return false;
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.authUser) {
    return res.status(401).json({ success: false, code: "AUTH_REQUIRED", error: "Sessão expirada ou inválida. Faça login novamente." });
  }
  next();
}

// Operações da plataforma (contratos, licenças, backups, suporte, site): só o administrador mestre
function requireMaster(req: any, res: any, next: any) {
  if (!req.authUser) {
    return res.status(401).json({ success: false, code: "AUTH_REQUIRED", error: "Sessão expirada ou inválida. Faça login novamente." });
  }
  if (!isMasterAccount(req.authUser)) {
    return res.status(403).json({ success: false, code: "MASTER_ONLY", error: "Operação permitida somente ao administrador da plataforma." });
  }
  next();
}

// Módulo precisa estar contratado pela empresa E liberado para o usuário
function requireContractedModule(moduleName: string, permissionKey: string, _getCache?: () => any) {
  return (req: any, res: any, next: any) => {
    if (!req.authUser) {
      return res.status(401).json({ success: false, code: "AUTH_REQUIRED", error: "Sessão expirada ou inválida. Faça login novamente." });
    }
    const { companyId } = extractUserContext(req);
    const company = companyForUser(serverAppStoreCache, req.authUser, companyId);
    if (!hasEffectivePermission(req.authUser, company, permissionKey)) {
      return res.status(403).json({
        success: false,
        code: "MODULE_NOT_ALLOWED",
        error: `Acesso negado ao módulo "${moduleName}": não contratado pela empresa ou não liberado para o seu usuário.`,
      });
    }
    req.validatedCompanyId = company?.id;
    next();
  };
}

// Limite de tentativas de login por usuário + IP
const loginAttempts = new Map<string, { count: number; firstAt: number }>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 8;

function loginThrottleKey(req: any, username: string): string {
  return `${getClientIp(req)}|${lc(username)}`;
}
function isLoginThrottled(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILURES;
}
function registerLoginFailure(key: string): void {
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() - entry.firstAt > LOGIN_WINDOW_MS) loginAttempts.set(key, { count: 1, firstAt: Date.now() });
  else entry.count++;
}

// Revisão por registro carimbada pelo servidor a cada alteração gravada.
// Cada navegador envia a base inteira ao salvar; sem isso, uma cópia antiga de um registro
// que o usuário nem alterou sobrescreveria a edição feita em outro computador.
let lastRecordRev = 0;
function nextRecordRev(): number {
  lastRecordRev = Math.max(Date.now(), lastRecordRev + 1);
  return lastRecordRev;
}

function mergeRecordWithRevision(existing: any, incoming: any): any {
  const existingRev = Number(existing?._rev) || 0;
  const hasIncomingRev = incoming?._rev !== undefined && incoming?._rev !== null;
  // Cópia desatualizada (baseada numa revisão anterior à gravada): mantém a versão do banco
  if (hasIncomingRev && existingRev > (Number(incoming._rev) || 0)) {
    return existing;
  }
  const merged = { ...existing, ...incoming };
  const { _rev: _a, ...existingBody } = existing;
  const { _rev: _b, ...mergedBody } = merged;
  if (JSON.stringify(existingBody) === JSON.stringify(mergedBody)) {
    return existing; // nada mudou
  }
  return { ...merged, _rev: nextRecordRev() };
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
          map.set(normalizedKey, mergeRecordWithRevision(existing, item));
        } else {
          map.set(normalizedKey, { ...item, _rev: nextRecordRev() } as T);
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
      u.role = 'qa';
      u.allowedCompanyIds = ['*'];
      u.name = u.name ? u.name.replace(/Analista de QA/gi, 'Validador QA') : 'Validador QA';
    }
    if (u && u.username && u.username.toLowerCase() === 'validador') {
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

  // companyInfo recebido é mesclado ao registro existente da mesma empresa (envio parcial não apaga campos)
  const incomingCompanyBase = incoming.companyInfo?.id
    ? (existing.companyInfo?.id === incoming.companyInfo.id ? existing.companyInfo : companiesMap.get(incoming.companyInfo.id)) || {}
    : {};
  const rawCompanyInfo = (incoming.companyInfo ? { ...incomingCompanyBase, ...incoming.companyInfo } : null) || existing.companyInfo || (uniqueCompanies.length > 0 ? uniqueCompanies[0] : null);
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

  // Garantia para o usuário QA master denominado "validador" (senha inicial só na criação da conta)
  for (const u of deduplicatedUsers) {
    if (u && u.username && u.username.toLowerCase() === 'qa') {
      u.username = 'validador';
      u.name = u.name ? u.name.replace(/Analista de QA/gi, 'Validador QA') : 'Validador QA';
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
    if (!validadorMaster.passwordHash) {
      validadorMaster.passwordHash = 'Donatelo@123';
    }
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

  // Somente o administrador mestre da plataforma (usuário "admin") enxerga todas as empresas.
  // O perfil "admin" de uma empresa cliente fica restrito às empresas em que está cadastrado.
  const isAdminUser = Boolean(
    (reqUser && reqUser.username && reqUser.username.toLowerCase() === 'admin') ||
    userId?.toLowerCase() === 'admin'
  );

  const isMasterUser = Boolean(
    isAdminUser ||
    isQaUser ||
    userId?.toLowerCase() === 'validador' ||
    userId?.toLowerCase() === 'usr-validador' ||
    (reqUser && (reqUser.username?.toLowerCase() === 'validador' || reqUser.role === 'qa'))
  );

  const hasWildcard = Boolean(
    isMasterUser ||
    (Array.isArray(reqUser?.allowedCompanyIds) && reqUser.allowedCompanyIds.includes('*'))
  );

  const isPreLogin = !userId || userId === 'guest' || userId.startsWith('guest') || userId === 'authenticated_user' || userId === 'all' || userId === 'anonymous';

  // Somente contas mestres (admin, validador, QA) ou com acesso '*' recebem todas as empresas.
  // Requisições sem sessão nem chegam aqui: recebem apenas a vitrine pública (buildPublicShell).
  if (isMasterUser || hasWildcard) {
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
// A identidade vem SOMENTE da sessão validada no servidor (cabeçalhos do navegador não são confiáveis).
// A empresa solicitada (X-Company-Id) só é aceita se o usuário tiver vínculo com ela.
function extractUserContext(req: any): { userId: string; companyId: string; userRole: string } {
  const user = req.authUser;
  if (!user) {
    return { userId: 'anonymous', companyId: 'all', userRole: 'guest' };
  }
  const requested = String(req.headers['x-company-id'] || req.query?.companyId || '').trim();
  const ids = userCompanyIds(user, serverAppStoreCache);
  const companyId = requested && requested !== 'all' && ids.includes(requested)
    ? requested
    : (req.authSession?.companyId && ids.includes(req.authSession.companyId) ? req.authSession.companyId : (user.companyId || ids[0] || 'comp-1'));
  return { userId: user.id, companyId, userRole: user.role || 'user' };
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
app.get("/api/db", async (req: any, res) => {
  const startTime = Date.now();
  const requestId = `req-get-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const { userId, companyId: reqCompanyId, userRole } = extractUserContext(req);
  const config = resolveDatabaseConfig();
  const syncMode = (req.headers['x-sync-mode'] || req.query?.mode || 'full') as string;

  try {
    let data: any = null;
    let version = 0;
    let updatedAt: string | null = null;
    let source = "postgres";

    if (hasDatabaseBackend()) {
      // Leitura SEMPRE direta do banco: qualquer navegador/computador recebe o mesmo estado
      const stored = await readAppStoreFromDb();
      if (stored) {
        data = stored.data;
        version = stored.version;
        updatedAt = stored.updatedAt;
      }
    } else {
      // Sem banco configurado (desenvolvimento offline): arquivo local data/app_store.json
      data = serverAppStoreCache;
      version = currentDbVersion;
      updatedAt = currentDbUpdatedAt;
      source = "local_file";
    }

    const durationMs = Date.now() - startTime;
    if (!data) {
      console.log(`[DB-TRACE] GET /api/db requestId=${requestId} userId=${userId} result=EMPTY source=${source} latencyMs=${durationMs}`);
      return res.json({ success: true, data: null, source, database: config.database, durationMs, updatedAt, version });
    }

    // Sem sessão: apenas a vitrine pública (site e tela de login), sem usuários, senhas ou dados das empresas
    if (!req.authUser) {
      return res.json({ success: true, data: buildPublicShell(data), source, public: true, durationMs, updatedAt, version });
    }

    const isolatedData = stripSecretsForClient(
      isolateDatabaseForContext(data, { userId, companyId: reqCompanyId, userRole, syncMode }),
      req.authUser,
      reqCompanyId
    );
    const companyId = reqCompanyId !== 'all' ? reqCompanyId : (isolatedData.companyInfo?.id || 'all');
    console.log(`[DB-TRACE] GET /api/db requestId=${requestId} userId=${userId} companyId=${companyId} clientes=${(isolatedData.clients || []).length} veículos=${(isolatedData.vehicles || []).length} peças=${(isolatedData.parts || []).length} version=${version} source=${source} latencyMs=${durationMs}`);

    return res.json({
      success: true,
      data: isolatedData,
      source,
      database: config.database,
      durationMs,
      updatedAt,
      version,
    });
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.warn(`[DB-TRACE] GET /api/db ERROR requestId=${requestId} userId=${userId} error=${pgErr.message} latencyMs=${Date.now() - startTime}`);

    // Não devolve dados em cache: o navegador mantém o que já tem e tenta de novo,
    // evitando que máquinas diferentes exibam versões diferentes da base.
    return res.status(503).json({
      success: false,
      data: null,
      code: "DATABASE_UNAVAILABLE",
      error: "Banco de dados indisponível no momento. Tente novamente em instantes.",
      durationMs: Date.now() - startTime,
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
// A versão vem do updated_at no banco: detecta gravações feitas por qualquer servidor/instância
app.get("/api/db/version", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const { version, updatedAt } = await getDbVersion(1000);
    res.json({
      success: true,
      version,
      updatedAt,
      subscribersCount: sseSubscribers.size,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    res.status(503).json({ success: false, code: "DATABASE_UNAVAILABLE", error: err.message });
  }
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

    console.log(`[DB-TRACE] POST /api/db requestId=${requestId} userId=${userId} companyId=${inCompanyId} empresas=${inEmpresas} usuários=${inUsuarios} clientes=${inClientes} veículos=${inVeiculos} peças=${inPecas}`);

    // Leitura do estado atual com bloqueio + merge + gravação na MESMA transação do banco:
    // duas máquinas salvando ao mesmo tempo nunca sobrescrevem uma à outra.
    // Regras de autorização aplicadas sobre o estado atual do banco, na mesma transação
    const { data: mergedData, version, updatedAt } = await mutateAppStore(
      (current) => mergeAppDatabase(current, guardIncomingDatabase(current, incomingData, req.authUser, inCompanyId)),
      { source: "db_save", companyId: inCompanyId, userId }
    );

    const durationMs = Date.now() - startTime;
    const isolatedResponseData = stripSecretsForClient(
      isolateDatabaseForContext(mergedData, { userId, companyId: inCompanyId, userRole, syncMode: 'full' }),
      req.authUser,
      inCompanyId
    );

    console.log(`[DB-TRACE] POST /api/db requestId=${requestId} result=SUCCESS version=${version} updatedAt=${updatedAt} latencyMs=${durationMs}`);

    return res.json({
      success: true,
      message: "Dados gravados no banco de dados",
      data: isolatedResponseData,
      source: hasDatabaseBackend() ? "postgres" : "local_file",
      database: config.database,
      durationMs,
      updatedAt,
      version,
    });
  } catch (err: any) {
    const pgErr = extractPgErrorDetails(err);
    console.warn(`[DB-TRACE] POST /api/db ERROR requestId=${requestId} userId=${userId} error=${pgErr.message} latencyMs=${Date.now() - startTime}`);

    // Nunca reporta sucesso sem gravar no banco: o navegador mantém os dados e tenta novamente
    return res.status(503).json({
      success: false,
      code: "DATABASE_WRITE_FAILED",
      error: "Não foi possível gravar no banco de dados. Suas alterações não foram salvas; tente novamente.",
      durationMs: Date.now() - startTime,
    });
  }
});

// List all registered companies endpoint (strict isolation: only returns companies accessible by user)
app.get("/api/companies", async (req: any, res) => {
  const startTime = Date.now();
  const requestId = `req-comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const { userId } = extractUserContext(req);

  // Lista de empresas pertence ao usuário da sessão; sem sessão não é divulgada
  // (a tela de login usa /api/auth/login-companies com o usuário digitado)
  if (!req.authUser) {
    return res.json({ success: true, companies: [], durationMs: Date.now() - startTime });
  }
  const db = serverAppStoreCache;
  const companies = userCompanyIds(req.authUser, db).map((id) => findCompany(db, id)).filter(Boolean);
  console.log(`[DB-TRACE][GET /api/companies] requestId=${requestId} userId=${userId} companies=${companies.length}`);
  return res.json({ success: true, companies, durationMs: Date.now() - startTime });
});

// Mapa em memória usado apenas sem banco configurado (desenvolvimento offline)
const userActiveCompanyMap = new Map<string, string>();

// Chave da preferência: o próprio usuário (vale para qualquer navegador/computador);
// sem usuário identificado, cai para o token da sessão.
function activeCompanyUserKey(req: any): string {
  const { userId } = extractUserContext(req);
  const uid = String(userId || '');
  const isIdentified = uid && uid !== 'anonymous' && uid !== 'authenticated_user' && !uid.includes('guest');
  if (isIdentified) return `user:${uid}`;
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  return token ? `session:${token}` : 'guest';
}

// Endpoint: Obter empresa ativa do usuário diretamente do banco
app.get("/api/companies/active", async (req: any, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const userKey = activeCompanyUserKey(req);

  try {
    let activeId: string | undefined;
    if (hasDatabaseBackend()) {
      const cfg = resolveDatabaseConfig();
      const result = await executeSqlWithRetry(
        'SELECT company_id FROM user_active_company WHERE user_key = $1',
        [userKey],
        cfg.database,
        2
      );
      activeId = result.rows[0]?.company_id;
    } else {
      activeId = userActiveCompanyMap.get(userKey);
    }
    // Fallback para primeira empresa registrada
    const companies = serverAppStoreCache?.registeredCompanies || [];
    if (!activeId || !companies.some((c: any) => c.id === activeId)) {
      activeId = companies[0]?.id || 'comp-1';
    }

    const company = companies.find((c: any) => c.id === activeId) || serverAppStoreCache?.companyInfo || { id: activeId, name: 'Empresa Ativa' };

    return res.json({
      success: true,
      activeCompanyId: activeId,
      company,
      source: "central_database"
    });
  } catch (err: any) {
    return res.json({
      success: true,
      activeCompanyId: 'comp-1',
      source: "fallback"
    });
  }
});

// Endpoint: Definir empresa ativa do usuário diretamente no banco
app.post("/api/companies/active", async (req: any, res) => {
  const { activeCompanyId } = req.body;
  const userKey = activeCompanyUserKey(req);

  if (!activeCompanyId) {
    return res.status(400).json({ success: false, error: "activeCompanyId é obrigatório" });
  }
  if (!userCompanyIds(req.authUser, serverAppStoreCache).includes(activeCompanyId)) {
    return res.status(403).json({ success: false, code: "COMPANY_NOT_ALLOWED", error: "Você não está cadastrado nesta empresa." });
  }

  try {
    if (hasDatabaseBackend()) {
      const cfg = resolveDatabaseConfig();
      await executeSqlWithRetry(
        `INSERT INTO user_active_company (user_key, company_id, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (user_key) DO UPDATE SET company_id = EXCLUDED.company_id, updated_at = NOW()`,
        [userKey, activeCompanyId],
        cfg.database
      );
    } else {
      userActiveCompanyMap.set(userKey, activeCompanyId);
    }
  } catch (err: any) {
    console.warn(`[COMPANY-STATE] Falha ao gravar empresa ativa (${userKey}): ${err.message}`);
    return res.status(503).json({ success: false, code: "DATABASE_WRITE_FAILED", error: "Não foi possível gravar a empresa ativa no banco de dados." });
  }

  // Preferência individual: não dispara recarga nos navegadores de outros usuários
  console.log(`[COMPANY-STATE] Empresa ativa de ${userKey} alterada para "${activeCompanyId}".`);

  return res.json({
    success: true,
    activeCompanyId,
    message: "Empresa ativa gravada no banco de dados"
  });
});

// Endpoint: Registrar ou atualizar empresa diretamente no banco
app.post("/api/companies/register", requireMaster, async (req: any, res) => {
  const companyData = req.body;
  if (!companyData || !companyData.name) {
    return res.status(400).json({ success: false, error: "Dados da empresa inválidos" });
  }

  const companyId = companyData.id || `comp-${Date.now()}`;
  const newCompany = {
    ...companyData,
    id: companyId,
    subscriptionStatus: companyData.subscriptionStatus || 'active',
    registeredAt: companyData.registeredAt || new Date().toISOString()
  };

  try {
    await mutateAppStore((current) => {
      const currentData = current || { registeredCompanies: [], users: [] };
      const companies = Array.isArray(currentData.registeredCompanies) ? [...currentData.registeredCompanies] : [];
      const idx = companies.findIndex((c: any) => c.id === companyId);
      if (idx !== -1) {
        companies[idx] = { ...companies[idx], ...newCompany };
      } else {
        companies.push(newCompany);
      }
      currentData.registeredCompanies = companies;
      return currentData;
    }, { source: "company_registered", companyId });

    return res.json({
      success: true,
      company: newCompany,
      message: "Empresa registrada e gravada no banco de dados"
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Obter conteúdo sincronizado do site (landing page) diretamente do banco
app.get(["/api/landing", "/api/site"], async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  let landing = serverAppStoreCache?.landingContent;
  const config = resolveDatabaseConfig();

  if (!landing && isDatabaseSocketAvailable(config.database)) {
    try {
      const result = await executeSqlWithRetry(
        'SELECT data->\'landingContent\' as landing FROM app_store WHERE id = $1',
        ['motordesk_main'],
        config.database
      );
      if (result.rows.length > 0) {
        landing = result.rows[0].landing;
      }
    } catch (e) {}
  }

  const company = serverAppStoreCache?.companyInfo || null;
  const companies = serverAppStoreCache?.registeredCompanies || [];

  return res.json({
    success: true,
    landingContent: landing || null,
    companyInfo: company,
    registeredCompanies: companies,
    source: "central_database"
  });
});

// Endpoint: Atualizar e persistir o conteúdo do site diretamente no Banco Central
app.post(["/api/landing", "/api/site"], requireMaster, async (req: any, res) => {
  const { landingContent } = req.body;
  if (!landingContent || typeof landingContent !== 'object') {
    return res.status(400).json({ success: false, error: "landingContent inválido ou ausente" });
  }

  try {
    await mutateAppStore((current) => {
      const currentData = current || {};
      currentData.landingContent = landingContent;
      return currentData;
    }, { source: "landing_content_updated" });

    console.log('[LANDING-SYNC] Conteúdo do site sincronizado com sucesso no Banco Central.');

    return res.json({
      success: true,
      message: "Conteúdo do site sincronizado com sucesso no banco de dados central",
      landingContent
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Atualizar ou liberar módulos contratados de uma empresa pós-contrato (ex: Boletos, Vendas, Fiscal)
app.post("/api/companies/:companyId/modules", requireMaster, async (req: any, res) => {
  const { companyId } = req.params;
  const { modules, contractModules } = req.body;

  if (!modules || typeof modules !== 'object') {
    return res.status(400).json({ success: false, error: "Objeto de módulos não fornecido" });
  }

  try {
    let updatedCompany: any = null;
    await mutateAppStore((currentData) => {
      if (!currentData) {
        throw appStoreError("Dados da aplicação não encontrados");
      }

      const companies = Array.isArray(currentData.registeredCompanies) ? [...currentData.registeredCompanies] : [];
      let foundIndex = companies.findIndex((c: any) => c.id === companyId);
      
      let targetCompany = foundIndex !== -1 ? { ...companies[foundIndex] } : (currentData.companyInfo?.id === companyId ? { ...currentData.companyInfo } : null);
      if (!targetCompany && companies.length > 0) {
        targetCompany = { ...companies[0] };
        foundIndex = 0;
      }

      if (!targetCompany) {
        throw appStoreError("Empresa não encontrada", 404);
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

      updatedCompany = targetCompany;
      return currentData;
    }, { source: "modules_update", companyId });

    return res.json({ success: true, company: updatedCompany });
  } catch (err: any) {
    return res.status(err.httpStatus || 500).json({ success: false, error: err.message });
  }
});

// Endpoint: Atualizar limite de usuários e valor por usuário adicional da licença
app.post("/api/companies/:companyId/license", requireMaster, async (req: any, res) => {
  const { companyId } = req.params;
  const { userLimit, additionalUserPrice, monthlyFee } = req.body;

  try {
    let updatedCompany: any = null;
    await mutateAppStore((currentData) => {
      if (!currentData) {
        throw appStoreError("Dados da aplicação não encontrados");
      }

      const companies = Array.isArray(currentData.registeredCompanies) ? [...currentData.registeredCompanies] : [];
      let foundIndex = companies.findIndex((c: any) => c.id === companyId);
      let targetCompany = foundIndex !== -1 ? { ...companies[foundIndex] } : (currentData.companyInfo?.id === companyId ? { ...currentData.companyInfo } : null);

      if (!targetCompany && companies.length > 0) {
        targetCompany = { ...companies[0] };
        foundIndex = 0;
      }

      if (!targetCompany) {
        throw appStoreError("Empresa não encontrada", 404);
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

      updatedCompany = targetCompany;
      return currentData;
    }, { source: "license_update", companyId });

    return res.json({ success: true, company: updatedCompany });
  } catch (err: any) {
    return res.status(err.httpStatus || 500).json({ success: false, error: err.message });
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
// ---- Login / sessão (senha verificada SOMENTE no servidor) -------------------
app.post("/api/auth/login", async (req: any, res) => {
  const username = lc(req.body?.username);
  const password = String(req.body?.password || '');
  const requestedCompanyId = String(req.body?.companyId || '').trim();

  if (!username || !password) {
    return res.status(400).json({ success: false, code: "MISSING_CREDENTIALS", error: "Informe usuário e senha." });
  }

  const throttleKey = loginThrottleKey(req, username);
  if (isLoginThrottled(throttleKey)) {
    return res.status(429).json({ success: false, code: "TOO_MANY_ATTEMPTS", error: "Muitas tentativas de login sem sucesso. Aguarde alguns minutos e tente novamente." });
  }

  try {
    let db = serverAppStoreCache;
    if (hasDatabaseBackend()) {
      db = (await readAppStoreFromDb())?.data || db;
    }

    const user = (db?.users || []).find((u: any) => u && lc(u.username) === username && verifyPassword(password, u.passwordHash));
    if (!user) {
      registerLoginFailure(throttleKey);
      console.warn(`[AUTH] Login recusado para @${username} (IP ${getClientIp(req)})`);
      return res.status(401).json({ success: false, code: "INVALID_CREDENTIALS", error: "Usuário ou senha incorretos. Por favor, verifique suas credenciais." });
    }

    if (!isUserActive(user)) {
      return res.status(403).json({
        success: false,
        code: "USER_TERMINATED",
        error: `Acesso Revogado: O colaborador "${user.name}" teve seu contrato de trabalho finalizado em ${user.contractEndDate || user.terminationDate || "data anterior"}. Todos os acessos ao sistema foram permanentemente revogados.`,
      });
    }

    const ids = userCompanyIds(user, db);
    if (ids.length === 0) {
      return res.status(403).json({ success: false, code: "NO_COMPANY", error: "Usuário sem empresa vinculada. Procure o administrador." });
    }
    const companyId = requestedCompanyId && ids.includes(requestedCompanyId)
      ? requestedCompanyId
      : (ids.includes(user.companyId) ? user.companyId : ids[0]);
    const company = findCompany(db, companyId);

    if (!isMasterAccount(user) && company && (company.subscriptionStatus === 'blocked' || company.subscriptionStatus === 'overdue' || company.paymentStatus === 'overdue')) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_BLOCKED",
        error: `Acesso Bloqueado por Inadimplência: A empresa "${company.name}" está com a assinatura/licença suspensa ou pagamento pendente. Por favor, entre em contato com o suporte ou gestor financeiro.`,
      });
    }

    loginAttempts.delete(throttleKey);

    // Senha legada em texto puro: converte para hash imediatamente
    if (!isPasswordHashed(user.passwordHash)) {
      await mutateAppStore((current) => current, { source: "password_hash_migration", userId: user.id })
        .catch((err) => console.warn(`[AUTH] Falha ao converter senha legada para hash: ${err.message}`));
    }

    const { token, expiresAt } = await createSession(user.id, companyId, req);

    const clientUser: any = { ...sanitizeUserForClient(user), companyId };
    if (isMasterAccount(user)) clientUser.allowedCompanyIds = ['*'];
    // Senha padrão inicial ainda não trocada: força a troca no primeiro acesso
    if (password === '123456' && user.hasChosenPassword !== true) clientUser.mustChangePassword = true;

    // Empresas do usuário (com módulos contratados) para a tela calcular as permissões efetivas já no login
    const companies = ids.map((id) => findCompany(db, id)).filter(Boolean);

    console.log(`[AUTH] Login de @${user.username} na empresa ${companyId} (IP ${getClientIp(req)})`);
    return res.json({ success: true, token, expiresAt, companyId, user: clientUser, companies });
  } catch (err: any) {
    console.error(`[AUTH] Erro no login: ${err.message}`);
    return res.status(503).json({ success: false, code: "AUTH_UNAVAILABLE", error: "Não foi possível validar o login agora. Tente novamente em instantes." });
  }
});

// Empresas do usuário digitado na tela de login (sem expor senhas nem dados de outros usuários)
app.get("/api/auth/login-companies", (req: any, res) => {
  const username = lc(req.query?.username);
  const db = serverAppStoreCache;
  const user = username ? (db?.users || []).find((u: any) => u && lc(u.username) === username && isUserActive(u)) : null;
  if (!user) {
    return res.json({ success: true, companies: [], users: [] });
  }
  const companies = userCompanyIds(user, db)
    .map((id) => findCompany(db, id))
    .filter(Boolean)
    .map((c: any) => pickFields(c, [...PUBLIC_COMPANY_FIELDS, 'subscriptionStatus']));
  return res.json({
    success: true,
    companies,
    users: [{
      id: user.id,
      username: user.username,
      companyId: user.companyId,
      allowedCompanyIds: isMasterAccount(user) ? ['*'] : (user.allowedCompanyIds || []),
      status: user.status || 'active',
    }],
  });
});

app.post("/api/auth/logout", async (req: any, res) => {
  try {
    if (req.authSession?.token) await deleteSession(req.authSession.token);
  } catch (err: any) {
    console.warn(`[AUTH] Falha ao encerrar sessão: ${err.message}`);
  }
  return res.json({ success: true });
});

app.get("/api/auth/me", (req: any, res) => {
  const { companyId } = extractUserContext(req);
  return res.json({ success: true, user: { ...sanitizeUserForClient(req.authUser), companyId }, expiresAt: req.authSession?.expiresAt });
});

// Confirma a senha do usuário logado (desbloqueio por inatividade, confirmações sensíveis)
app.post("/api/auth/verify-password", (req: any, res) => {
  const throttleKey = loginThrottleKey(req, req.authUser.username);
  if (isLoginThrottled(throttleKey)) {
    return res.status(429).json({ success: false, code: "TOO_MANY_ATTEMPTS", error: "Muitas tentativas sem sucesso. Aguarde alguns minutos." });
  }
  if (!verifyPassword(String(req.body?.password || ''), req.authUser.passwordHash)) {
    registerLoginFailure(throttleKey);
    return res.status(401).json({ success: false, code: "INVALID_PASSWORD", error: "Senha incorreta." });
  }
  loginAttempts.delete(throttleKey);
  return res.json({ success: true });
});

// Troca de senha: o próprio usuário (com a senha atual) ou quem gerencia usuários da mesma empresa
app.post("/api/users/update-password", async (req: any, res) => {
  const { userId, username, companyId, newPassword, keepCurrent, currentPassword } = req.body || {};
  const actor = req.authUser;

  if (!userId && !username) {
    return res.status(400).json({ success: false, error: "Identificador do usuário ausente" });
  }

  if (!keepCurrent && (!newPassword || String(newPassword).trim().length < 4)) {
    return res.status(400).json({ success: false, error: "A nova senha deve possuir no mínimo 4 caracteres" });
  }

  try {
    let updatedUser: any = null;
    let isSelf = false;
    const { version } = await mutateAppStore((currentStoredData) => {
      if (!currentStoredData || !Array.isArray(currentStoredData.users)) {
        throw appStoreError("Banco de dados não inicializado.", 500);
      }

      const user = currentStoredData.users.find((u: any) =>
        (userId && u.id === userId) ||
        (!userId && username && u.username && u.username.toLowerCase() === String(username).toLowerCase() && (!companyId || u.companyId === companyId))
      );

      if (!user) {
        throw appStoreError("Usuário não encontrado.", 404);
      }

      isSelf = user.id === actor.id;
      if (isSelf) {
        // Primeiro acesso (senha inicial) dispensa a senha atual; nos demais casos ela é obrigatória
        const isFirstAccess = user.mustChangePassword === true || user.firstAccess === true || user.hasChosenPassword !== true;
        if (!keepCurrent && !isFirstAccess && !verifyPassword(String(currentPassword || ''), user.passwordHash)) {
          throw appStoreError("Senha Atual Incorreta. Não foi possível autorizar a alteração.", 403);
        }
      } else {
        const actorCompany = companyForUser(currentStoredData, actor, user.companyId);
        const sharesCompany = userCompanyIds(user, currentStoredData).some((id) => userCompanyIds(actor, currentStoredData).includes(id));
        if (!canManageUsers(actor, actorCompany) || !sharesCompany || (isMasterAccount(user) && !isMasterAccount(actor))) {
          throw appStoreError("Você não tem permissão para alterar a senha deste usuário.", 403);
        }
      }

      const now = Date.now();
      if (!keepCurrent && newPassword) {
        user.passwordHash = hashPassword(String(newPassword).trim());
      }
      user.firstAccess = false;
      user.mustChangePassword = false;
      user.hasChosenPassword = true;
      user.passwordUpdatedAt = now;
      user.updatedAt = new Date().toISOString();

      updatedUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        firstAccess: user.firstAccess,
        mustChangePassword: user.mustChangePassword,
        hasChosenPassword: user.hasChosenPassword,
        passwordUpdatedAt: user.passwordUpdatedAt
      };
      return currentStoredData;
    }, { source: "password_update", companyId, userId });

    // Senha alterada: encerra as demais sessões do usuário (mantém a sessão atual de quem trocou a própria senha)
    if (!keepCurrent) {
      await deleteOtherUserSessions(updatedUser.id, isSelf ? req.authSession?.token : undefined)
        .catch((err) => console.warn(`[USER-PASSWORD] Falha ao encerrar sessões antigas: ${err.message}`));
    }

    console.log(`[USER-PASSWORD] Senha salva com sucesso para @${updatedUser.username} (${updatedUser.id})`);
    return res.json({ success: true, user: updatedUser, version });
  } catch (err: any) {
    console.error("[USER-PASSWORD] Erro:", err.message);
    return res.status(err.httpStatus || 500).json({ success: false, error: err.message });
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
app.get("/api/auth/active-sessions", requireMaster, (req, res) => {
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
    const targetCompId = extractUserContext(req).companyId;
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

    await mutateAppStore((current) => {
      const db = current || {};
      if (!db.solidworksProjects) db.solidworksProjects = [];
      if (!db.productionOrders) db.productionOrders = [];
      if (!db.boms) db.boms = [];
      if (!db.materialSeparations) db.materialSeparations = [];

      db.solidworksProjects.unshift(newProject);
      db.productionOrders.unshift(newProductionOrder);
      db.boms.unshift(newBom);
      db.materialSeparations.unshift(newSeparation);
      return db;
    }, { source: "solidworks_sync", companyId: targetCompId });

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

    let targetQuotation: any = null;
    let totalEstimated = 0;
    await mutateAppStore((current) => {
      if (!current) {
        throw appStoreError("Banco de dados indisponível no momento.", 503);
      }

      const quotations = current.quotations || [];
      const qIdx = quotations.findIndex((q: any) => q.id === qId || q.code === qId);
      if (qIdx === -1) {
        throw appStoreError("Cotação não encontrada.", 404);
      }

      targetQuotation = { ...quotations[qIdx] };
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

      totalEstimated = updatedItems.reduce((acc: number, it: any) => acc + (it.totalPrice || 0), 0);

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
      current.quotations = quotations;

      // Log notification and history
      const notifs = current.notifications || [];
      notifs.unshift({
        id: `notif-${Date.now()}`,
        type: "quotation_answered",
        title: "Cotação Respondida pelo Fornecedor",
        message: `O fornecedor respondeu a cotação ${targetQuotation.code} com total de R$ ${totalEstimated.toFixed(2)}.`,
        date: new Date().toISOString(),
        read: false,
        companyId: targetQuotation.companyId
      });
      current.notifications = notifs;
      return current;
    }, { source: "supplier_quotation_reply" });

    console.log(`[QUOTATION-REPLY] Cotação ${targetQuotation.code} respondida por ${targetQuotation.supplierRespondent?.name || "Fornecedor"} (Total: R$ ${totalEstimated.toFixed(2)}). Notificação enviada ao módulo de compras.`);

    return res.json({
      success: true,
      message: "Cotação respondida e devolvida com sucesso para o departamento de compras!",
      quotationCode: targetQuotation.code,
      totalAmount: totalEstimated
    });
  } catch (err: any) {
    res.status(err.httpStatus || 500).json({ error: err.message });
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
// Snapshot sempre lido do banco (fonte única de verdade); arquivo local apenas sem banco configurado
async function getDbSnapshotForBackup(): Promise<any> {
  if (hasDatabaseBackend()) {
    const stored = await readAppStoreFromDb();
    return stored?.data || null;
  }
  if (serverAppStoreCache && typeof serverAppStoreCache === 'object') {
    return serverAppStoreCache;
  }
  serverAppStoreCache = loadInitialServerCache();
  return serverAppStoreCache;
}

// Status do Backup Diário Automático
app.get("/api/backup/status", requireMaster, (req, res) => {
  const service = DailyBackupService.getInstance();
  res.json({
    success: true,
    status: service.getStatus(),
  });
});

// Lista todos os backups diários armazenados
app.get("/api/backup/list", requireMaster, (req, res) => {
  const service = DailyBackupService.getInstance();
  const list = service.listBackups();
  res.json({
    success: true,
    total: list.length,
    backups: list,
  });
});

// Executa um backup diário manual imediatamente
app.post("/api/backup/trigger-daily", requireMaster, async (req, res) => {
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
app.get("/api/backup/download/:filename", requireMaster, (req, res) => {
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
app.get("/api/backup/download-company/:companyId", requireMaster, async (req, res) => {
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
app.post("/api/backup/restore", requireMaster, async (req, res) => {
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
        await mutateAppStore(() => dataToPersist, { source: "backup_restore" });
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
app.post("/api/backup/restore-company", requireMaster, async (req, res) => {
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
        await mutateAppStore(() => dataToPersist, { source: "company_backup_restore", companyId: targetCompanyId });
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
app.get("/api/companies/list-with-ids", requireMaster, async (req, res) => {
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
app.get("/api/backup/policies", requireMaster, async (req, res) => {
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
app.post("/api/backup/policy/:companyId", requireMaster, async (req, res) => {
  try {
    const { companyId } = req.params;
    const policy = req.body || {};
    const service = DailyBackupService.getInstance();
    const { data: updatedDb } = await mutateAppStore(
      (current) => service.updateCompanyBackupPolicy(current, companyId, policy),
      { source: "backup_policy_update", companyId }
    );

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
app.get("/api/support/company-diagnostic/:companyId", requireMaster, async (req, res) => {
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
app.post("/api/support/company-repair", requireMaster, async (req, res) => {
  try {
    const { targetCompanyId, correctionType } = req.body;
    if (!targetCompanyId) {
      return res.status(400).json({ error: "targetCompanyId é obrigatório." });
    }

    // Correção aplicada sobre o estado atual do banco, na mesma transação da gravação
    let result: any = null;
    await mutateAppStore((current) => {
      const repair = CompanySupportService.executeIsolatedRepair(current, targetCompanyId, correctionType || "all");
      result = repair.result;
      return repair.updatedDb;
    }, { source: "support_repair_isolated", companyId: targetCompanyId });

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
      if (hasDatabaseBackend()) {
        await warmUpDatabaseConnection();
        startDatabaseKeepAlive(15000);
        await ensureAppStoreTableExists(config.database);
        await ensureAuthTables();
        const stored = await readAppStoreFromDb();
        console.log(`[MotorDesk Boot] Banco ${config.database}@${config.host} conectado como fonte única de verdade (versão ${stored?.version ?? 'vazia'}).`);
      } else {
        console.warn(`[MotorDesk Boot] Nenhum banco configurado (DATABASE_URL ausente). Usando arquivo local data/app_store.json — os dados NÃO serão compartilhados entre computadores.`);
      }
    } catch (dbBootErr: any) {
      console.warn(`[MotorDesk Boot] Aviso ao inicializar conexão do banco: ${dbBootErr.message}`);
    }
    DailyBackupService.getInstance().startAutomatedScheduler(getDbSnapshotForBackup);
  });
}

startServer();
