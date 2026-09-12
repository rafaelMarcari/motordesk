import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { getDbInstance, checkDatabaseHealth, ensureAppStoreTableExists, createPool, extractPgErrorDetails, resolveDatabaseConfig, executeSqlWithRetry } from "./src/db/index.js";
import { appStore, clients as clientsTable, vehicles as vehiclesTable, parts as partsTable, serviceOrders as serviceOrdersTable } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { requireAuth } from "./src/middleware/auth.js";
import { requireContractedModule } from "./src/middleware/contractGuard.js";
import { isCompanyActive } from "./src/utils/securityUtils.js";
import { fiscalBackendService } from "./server/fiscalProviderService.js";

dotenv.config();

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
  if (req.path.startsWith("/api") || req.path === "/health") {
    res.setHeader("Content-Type", "application/json");
  }
  next();
});

// 4. Middleware de Segurança Corporativa: Revogação Imediata de Acesso para Colaboradores Demitidos
app.use((req: any, res: any, next: any) => {
  if (!req.path.startsWith("/api") || req.path === "/api/health" || req.path === "/health") {
    return next();
  }
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

// Root API Welcome route (only for non-HTML API requests)
app.get("/", (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    return next();
  }
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
    nameClean.includes('INDUSTRIA') ||
    nameClean.includes('METALURGICA') ||
    nameClean.includes('FABRICACAO') ||
    nameClean.includes('MANUFATURA') ||
    nameClean.includes('USINAGEM')
  ) {
    return 'INDUSTRIA';
  }
  if (
    clean === 'COMERCIO' || 
    clean === 'LOJA' || 
    clean === 'BALCAO' || 
    clean === 'AUTOPECAS' || 
    clean === 'DISTRIBUIDORA' ||
    nameClean.includes('DISTRIBUIDORA') ||
    nameClean.includes('AUTO PECAS') ||
    nameClean.includes('AUTOPECAS')
  ) {
    return 'COMERCIO';
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
    'productLots',
    'operationalAlerts',
  ];

  // Empresas demo originais com dados de exemplo de demonstração
  const demoCompanyIds = new Set(['comp-1', 'comp-2', 'comp-4', 'comp-5']);

  // Identificar todas as empresas cadastradas
  const registered = Array.isArray(db.registeredCompanies) ? db.registeredCompanies : [];
  const registeredIds = new Set(registered.map((c: any) => c?.id).filter(Boolean));
  if (db.companyInfo?.id) registeredIds.add(db.companyInfo.id);

  // Empresas reais criadas por usuários:
  // Qualquer empresa cujo ID não seja do conjunto demo
  const createdRealCompanyIds = new Set<string>();
  for (const id of registeredIds) {
    if (!demoCompanyIds.has(id)) {
      createdRealCompanyIds.add(id);
    }
  }

  const sanitized: any = { ...db };

  for (const col of operationalCollections) {
    const rawList = Array.isArray(db[col]) ? db[col] : [];

    sanitized[col] = rawList
      .map((item: any) => {
        if (!item) return null;
        // Se o registro não possuir companyId explícito, crava estritamente como pertencente à demo comp-1
        // para que JAMAIS seja considerado compartilhado ou vaze para empresas novas criadas!
        const compId = item.companyId || 'comp-1';
        return { ...item, companyId: compId };
      })
      .filter((item: any) => {
        if (!item) return false;
        // Exigência direta do usuário:
        // "agora precisa garantir que todas as empresas criadas venham zeradas, sem registros algum, de clientes, fornecedor nada, são dados reais de empresas reais"
        // Qualquer registro legado residual atribuído a empresas criadas é removido na sanitização base
        // para assegurar que comecem 100% zeradas para uso com dados reais.
        if (createdRealCompanyIds.has(item.companyId)) {
          // Se for dado que veio de um teste antigo em comp-178... limpar para zerar
          if (item.companyId.startsWith('comp-178') || item.companyId.startsWith('comp-test') || item.companyId.startsWith('comp-sync')) {
            return false;
          }
        }
        return true;
      });
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
      allowedCompanyIds: ['*'],
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
        canViewAllCompaniesHistory: true, restrictToOwnSales: false
      }
    };
    usersList.unshift(admin);
  } else {
    admin.isTerminated = false;
    admin.contractEndDate = '';
    admin.status = 'active';
    admin.isActive = true;
    admin.allowedCompanyIds = ['*'];
    if (!admin.passwordHash || admin.passwordHash === 'Donatelo@123') {
      admin.passwordHash = 'admin123';
    }
  }
  sanitized.users = usersList;

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
          if (u.id.includes(prev.companyId) || (prev.id.startsWith('usr-adm-') || prev.id.startsWith('usr-qa-') || prev.id === 'usr-1')) {
            safeCompanyId = prev.companyId;
          }
        }
        usersMap.set(u.id, {
          ...prev,
          ...u,
          companyId: safeCompanyId,
          allowedCompanyIds: u.allowedCompanyIds || (prev ? prev.allowedCompanyIds : undefined)
        });
      }
    }
  }
  const mergedUsers = Array.from(usersMap.values());

  // Garantia absoluta: Usuário admin master (usr-1) deve sempre existir, estar ativo e possuir senha admin123
  let adminInMerged = mergedUsers.find((u: any) => u && u.username && u.username.toLowerCase() === 'admin');
  if (!adminInMerged) {
    adminInMerged = {
      id: 'usr-1',
      username: 'admin',
      name: 'Carlos Santos (Gerente)',
      role: 'admin',
      passwordHash: 'admin123',
      companyId: 'comp-1',
      allowedCompanyIds: ['*'],
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
        canViewAllCompaniesHistory: true, restrictToOwnSales: false
      }
    };
    mergedUsers.unshift(adminInMerged);
  } else {
    adminInMerged.isTerminated = false;
    adminInMerged.contractEndDate = '';
    adminInMerged.status = 'active';
    adminInMerged.isActive = true;
    adminInMerged.allowedCompanyIds = ['*'];
    if (!adminInMerged.passwordHash || adminInMerged.passwordHash === 'Donatelo@123') {
      adminInMerged.passwordHash = 'admin123';
    }
  }

  // Regra de Desligamento / Demissão de Usuários:
  // Se o campo de data de término de contrato estiver preenchido, revogar TODOS os acessos ao sistema
  const sanitizedUsers = mergedUsers.map((u: any) => {
    // Admin master nunca pode ser desativado
    if (u.username && u.username.toLowerCase() === 'admin') {
      return {
        ...u,
        isTerminated: false,
        contractEndDate: '',
        isActive: true,
        status: 'active',
        passwordHash: u.passwordHash === 'Donatelo@123' ? 'admin123' : (u.passwordHash || 'admin123')
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
    fiscalDocuments: mergeEntityCollection(existing.fiscalDocuments, incoming.fiscalDocuments, 'id'),
    boletos: mergeEntityCollection(existing.boletos, incoming.boletos, 'id'),
    interBranchSales: mergeEntityCollection(existing.interBranchSales, incoming.interBranchSales, 'id'),
    stockMovements: mergeEntityCollection(existing.stockMovements, incoming.stockMovements, 'id'),
    notifications: mergeEntityCollection(existing.notifications, incoming.notifications, 'id'),
    testCases: mergeEntityCollection(existing.testCases, incoming.testCases, 'id'),
    taxOperationNatures: mergeEntityCollection(existing.taxOperationNatures, incoming.taxOperationNatures, 'id'),
    taxRules: mergeEntityCollection(existing.taxRules, incoming.taxRules, 'id'),
    xmlImportRecords: mergeEntityCollection(existing.xmlImportRecords, incoming.xmlImportRecords, 'id'),
    loginHistory: mergeEntityCollection(existing.loginHistory, incoming.loginHistory, 'lastAccess', 'username'),
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
  context: { userId: string; companyId: string; userRole: string }
): any {
  if (!db || typeof db !== 'object') return db;

  const { userId, companyId: reqCompanyId, userRole } = context;

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
    'productLots',
    'operationalAlerts',
    'history',
    'notifications',
    'carriers',
    'taxObligationGuides',
  ];

  const allUsers = Array.isArray(db.users) ? db.users : [];
  const reqUser = allUsers.find((u: any) => u && (u.id === userId || (u.username && u.username.toLowerCase() === userId?.toLowerCase())));

  const isGlobalMaster = (userId === 'usr-1' || userId?.toLowerCase() === 'admin' || (reqUser && (reqUser.id === 'usr-1' || reqUser.username?.toLowerCase() === 'admin')));
  const hasWildcard = Array.isArray(reqUser?.allowedCompanyIds) && reqUser.allowedCompanyIds.includes('*');

  const isMasterAdmin = isGlobalMaster && (reqCompanyId === 'all' || !reqCompanyId);

  // Se for Administrador Master global sem empresa específica selecionada (modo all), retorna base sanitizada
  if (isMasterAdmin) {
    return db;
  }

  // Identifica a empresa ativa
  let targetCompanyId = reqCompanyId && reqCompanyId !== 'all' ? reqCompanyId : '';
  if (!targetCompanyId) {
    if (reqUser && reqUser.companyId) {
      targetCompanyId = reqUser.companyId;
    } else if (db.companyInfo?.id) {
      targetCompanyId = db.companyInfo.id;
    } else {
      targetCompanyId = 'comp-1';
    }
  }

  const allRegistered = Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0
    ? db.registeredCompanies
    : (db.companyInfo ? [db.companyInfo] : [{ id: 'comp-1', name: 'MotorDesk' }]);

  let allowedCompanies: any[] = [];
  if (isGlobalMaster || hasWildcard) {
    allowedCompanies = allRegistered;
  } else if (Array.isArray(reqUser?.allowedCompanyIds) && reqUser.allowedCompanyIds.length > 0) {
    const allowedSet = new Set([...reqUser.allowedCompanyIds, reqUser.companyId || targetCompanyId]);
    allowedCompanies = allRegistered.filter((c: any) => allowedSet.has(c.id));
    if (allowedCompanies.length === 0) {
      allowedCompanies = allRegistered.filter((c: any) => c.id === targetCompanyId);
    }
  } else {
    allowedCompanies = allRegistered.filter((c: any) => c.id === targetCompanyId);
    if (allowedCompanies.length === 0 && db.companyInfo) {
      allowedCompanies = [db.companyInfo];
    }
  }

  // Isolamento estrito de usuários:
  // "os usuários de uma empresa em hipotese alguma pode ver usuários, ou qualquer outro dado de outra empresa"
  const isolatedUsers = allUsers.filter((u: any) => {
    if (!u) return false;
    const uComp = u.companyId || 'comp-1';
    // Se o usuário pertence à empresa requisitada
    if (uComp === targetCompanyId) return true;
    // Se o usuário tem autorização explícita para esta empresa em allowedCompanyIds
    if (Array.isArray(u.allowedCompanyIds) && (u.allowedCompanyIds.includes(targetCompanyId) || u.allowedCompanyIds.includes('*'))) {
      return true;
    }
    // O usuário admin master é mantido para fins de integridade do sistema
    if (u.id === 'usr-1' || u.username?.toLowerCase() === 'admin') {
      return true;
    }
    // Usuários de qualquer outra empresa são terminantemente omitidos!
    return false;
  });

  const isolated: any = {
    ...db,
    registeredCompanies: allowedCompanies,
    users: isolatedUsers,
  };

  const currentCompany = allRegistered.find((c: any) => c.id === targetCompanyId) || db.companyInfo;
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
  const sseMsg = `event: db_update\ndata: ${dataString}\n\n`;
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
  const { userId, companyId: reqCompanyId, userRole } = extractUserContext(req);
  const config = resolveDatabaseConfig();

  try {
    // 1. Query the configured/primary database using executeSqlWithRetry
    const result = await executeSqlWithRetry(
      'SELECT id, data, updated_at, pg_column_size(data) as size FROM app_store WHERE id = $1',
      ['motordesk_main'],
      config.database
    );

    if (result.rows.length > 0 && result.rows[0].data) {
      const data = sanitizeAndIsolateCompanies(result.rows[0].data);
      serverAppStoreCache = data;
      const isolatedData = isolateDatabaseForContext(data, { userId, companyId: reqCompanyId, userRole });
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
          const isolatedData = isolateDatabaseForContext(data, { userId, companyId: reqCompanyId, userRole });
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
      const isolatedData = isolateDatabaseForContext(serverAppStoreCache, { userId, companyId: reqCompanyId, userRole });
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
  const origin = req.headers.origin || "*";
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform, no-store");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Content-Encoding", "identity");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Cache-Control, Pragma, Authorization, X-Requested-With, Content-Type, Accept, X-Company-Id, X-User-Id, X-User-Role");
  res.flushHeaders?.();

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
  }, 10000);

  req.on("close", () => {
    clearInterval(keepAliveTimer);
    sseSubscribers.delete(res);
    console.log(`[REALTIME-SSE] Machine disconnected from stream. Remaining active: ${sseSubscribers.size}`);
  });
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

    const isolatedResponseData = isolateDatabaseForContext(mergedData, { userId, companyId: inCompanyId, userRole });

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

    const users = (currentData?.users || []).filter((u: any) => (u.companyId || 'comp-1') === companyId);
    const userLimit = company?.userLimit || 5;
    const additionalUserPrice = company?.additionalUserPrice !== undefined ? company.additionalUserPrice : 29.90;
    const extraUsers = Math.max(0, userLimit - 5);
    const extraUsersFee = extraUsers * additionalUserPrice;

    return res.json({
      success: true,
      companyId,
      companyName: company?.name || "Empresa",
      userLimit,
      currentUsersCount: users.length,
      availableSlots: Math.max(0, userLimit - users.length),
      isLimitReached: users.length >= userLimit,
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

// Handle development vs production modes
async function startServer() {
  // Serve static assets from dist and public
  app.use(express.static(path.resolve(process.cwd(), "dist")));
  app.use(express.static(path.resolve(process.cwd(), "public")));

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MotorDesk Express REST API running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
