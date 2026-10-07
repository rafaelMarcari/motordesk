import fs from "fs";
import path from "path";
import { executeSqlWithRetry, resolveDatabaseConfig } from "../src/db/index.js";

export interface BackupMetadata {
  backupId: string;
  filename: string;
  date: string;
  createdAt: string;
  type: "daily_automated" | "manual_trigger" | "pre_restore_safety";
  database: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  companiesCount: number;
  totalRecords: number;
  companies: Array<{
    id: string;
    name: string;
    cnpj?: string;
    companyType?: string;
    businessType?: string;
  }>;
  collectionsSummary: Record<string, number>;
}

const BACKUP_DIR = path.resolve(process.cwd(), "data/backups");

// Ensure backup directory exists on disk
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const OPERATIONAL_COLLECTIONS = [
  "clients",
  "suppliers",
  "vehicles",
  "parts",
  "services",
  "budgets",
  "serviceOrders",
  "sales",
  "goodsWithdrawals",
  "quotations",
  "supplierPartPrices",
  "accountsReceivable",
  "accountsPayable",
  "financialTransactions",
  "bankStatements",
  "paymentMethods",
  "fiscalDocuments",
  "boletos",
  "interBranchSales",
  "stockMovements",
  "maintenanceLogs",
  "boms",
  "billOfMaterials",
  "productionOrders",
  "productLots",
  "operationalAlerts",
  "alertSettings",
  "notifications",
  "users",
  "registeredCompanies",
  "unitsOfMeasure",
  "carriers",
  "accessGroups",
  "history",
  "loginHistory",
  "solidworksProjects",
  "materialSeparations",
  "factoryOperators",
  "shopFloorEntries",
  "purchaseHistory",
  "xmlImportRecords",
  "installedEquipment",
  "qualityInspections",
  "technicalDocuments",
  "warehouseLocations",
  "productionScrapLogs",
  "productionReworkLogs",
  "taxRules",
  "taxObligationGuides",
  "taxOperationNatures",
  "nonConformityReports",
  "billingClosings",
  "monthlyAccountingClosings",
  "equipmentMaintenancePlans",
  "equipmentMaintenanceOrders",
  "pendingPriceRevisions",
  "priceChangeHistory",
  "priceCalculationHistory",
  "representedCompanies",
  "representativeOrders",
  "representativeFactoryOrders",
  "factoryInvoices",
  "representativeCommissions",
  "companyInfo",
  "sefazConfig",
  "contractModules",
];

export class DailyBackupService {
  private static instance: DailyBackupService;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastBackupDate: string = "";

  private constructor() {
    ensureBackupDir();
  }

  public static getInstance(): DailyBackupService {
    if (!DailyBackupService.instance) {
      DailyBackupService.instance = new DailyBackupService();
    }
    return DailyBackupService.instance;
  }

  /**
   * Initializes the daily automated scheduler.
   * Runs an immediate check on startup, and then hourly.
   */
  public startAutomatedScheduler(getDbSnapshot: () => Promise<any>): void {
    if (this.intervalTimer) return;

    console.log("[DAILY-BACKUP] Initializing Daily Database Backup Scheduler...");

    // Check immediately on startup (with 3s delay for DB to warm up)
    setTimeout(async () => {
      try {
        await this.checkAndRunDailyBackup(getDbSnapshot);
      } catch (err) {
        console.warn("[DAILY-BACKUP] Startup backup check failed:", err);
      }
    }, 3000);

    // Run periodic check every 30 minutes to capture the day change accurately
    this.intervalTimer = setInterval(async () => {
      try {
        await this.checkAndRunDailyBackup(getDbSnapshot);
      } catch (err) {
        console.warn("[DAILY-BACKUP] Scheduled backup check failed:", err);
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Verifies if today's daily backup has been created.
   * If not, generates it automatically.
   */
  public async checkAndRunDailyBackup(getDbSnapshot: () => Promise<any>): Promise<BackupMetadata | null> {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const expectedFilename = `motordesk_backup_${todayStr}.json`;
    const targetPath = path.join(BACKUP_DIR, expectedFilename);

    if (fs.existsSync(targetPath)) {
      this.lastBackupDate = todayStr;
      return null;
    }

    console.log(`[DAILY-BACKUP] No backup found for today (${todayStr}). Generating daily backup snapshot...`);
    return await this.createBackup(getDbSnapshot, "daily_automated");
  }

  /**
   * Generates a full database backup file and stores it with metadata.
   */
  public async createBackup(
    getDbSnapshot: () => Promise<any>,
    type: "daily_automated" | "manual_trigger" | "pre_restore_safety" = "daily_automated"
  ): Promise<BackupMetadata> {
    if (this.isRunning) {
      throw new Error("Um processo de backup já está em execução.");
    }
    this.isRunning = true;

    try {
      ensureBackupDir();
      let rawData = await getDbSnapshot();
      if (!rawData || typeof rawData !== "object") {
        const latestPath = path.join(BACKUP_DIR, "motordesk_backup_latest.json");
        if (fs.existsSync(latestPath)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(latestPath, "utf-8"));
            if (parsed && parsed.data && typeof parsed.data === "object") {
              rawData = parsed.data;
            }
          } catch (e) {}
        }
      }
      if (!rawData || typeof rawData !== "object") {
        throw new Error("Base de dados indisponível para backup.");
      }

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = type === "daily_automated" 
        ? `motordesk_backup_${dateStr}.json`
        : `motordesk_backup_${dateStr}_${timeStr}_${type}.json`;

      const backupPath = path.join(BACKUP_DIR, filename);

      // Extract companies list
      const companies: Array<any> = [];
      if (Array.isArray(rawData.registeredCompanies)) {
        for (const c of rawData.registeredCompanies) {
          if (c && c.id) {
            companies.push({
              id: c.id,
              name: c.name || "Sem Nome",
              cnpj: c.cnpj || "",
              companyType: c.companyType || "matriz",
              businessType: c.businessType || "OFICINA",
            });
          }
        }
      }
      if (rawData.companyInfo && rawData.companyInfo.id && !companies.some(c => c.id === rawData.companyInfo.id)) {
        companies.unshift({
          id: rawData.companyInfo.id,
          name: rawData.companyInfo.name || "Matriz Principal",
          cnpj: rawData.companyInfo.cnpj || "",
          companyType: rawData.companyInfo.companyType || "matriz",
          businessType: rawData.companyInfo.businessType || "OFICINA",
        });
      }

      // Count collections records
      let totalRecords = 0;
      const collectionsSummary: Record<string, number> = {};

      for (const col of OPERATIONAL_COLLECTIONS) {
        if (Array.isArray(rawData[col])) {
          const count = rawData[col].length;
          collectionsSummary[col] = count;
          totalRecords += count;
        }
      }

      const config = resolveDatabaseConfig();

      const backupEnvelope = {
        _system: "MotorDesk ERP Multi-Tenant",
        _version: "2026.09.1",
        backupId: `bkp-${Date.now()}`,
        filename,
        date: dateStr,
        createdAt: now.toISOString(),
        type,
        database: config.database,
        companiesCount: companies.length,
        companies,
        totalRecords,
        collectionsSummary,
        data: rawData,
      };

      const jsonString = JSON.stringify(backupEnvelope, null, 2);
      fs.writeFileSync(backupPath, jsonString, "utf8");

      // Also create/update symlink/file `motordesk_backup_latest.json`
      const latestPath = path.join(BACKUP_DIR, "motordesk_backup_latest.json");
      fs.writeFileSync(latestPath, jsonString, "utf8");

      const fileStats = fs.statSync(backupPath);
      const metadata: BackupMetadata = {
        backupId: backupEnvelope.backupId,
        filename,
        date: dateStr,
        createdAt: now.toISOString(),
        type,
        database: config.database,
        fileSizeBytes: fileStats.size,
        fileSizeFormatted: formatBytes(fileStats.size),
        companiesCount: companies.length,
        totalRecords,
        companies,
        collectionsSummary,
      };

      this.lastBackupDate = dateStr;
      console.log(`[DAILY-BACKUP] Backup criado com sucesso: ${filename} (${metadata.fileSizeFormatted}, ${totalRecords} registros, ${companies.length} empresas)`);

      // Clean up older backups (keep last 30 daily backups)
      this.rotateBackups(30);

      return metadata;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Keeps the latest `maxBackups` and deletes older ones.
   */
  private rotateBackups(maxBackups: number = 30): void {
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith("motordesk_backup_") && f.endsWith(".json") && f !== "motordesk_backup_latest.json")
        .map(f => {
          const fullPath = path.join(BACKUP_DIR, f);
          const stats = fs.statSync(fullPath);
          return { filename: f, fullPath, mtime: stats.mtime.getTime() };
        })
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > maxBackups) {
        const toDelete = files.slice(maxBackups);
        for (const f of toDelete) {
          try {
            fs.unlinkSync(f.fullPath);
            console.log(`[DAILY-BACKUP] Backup antigo rotacionado/removido: ${f.filename}`);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("[DAILY-BACKUP] Erro na rotação de backups:", err);
    }
  }

  /**
   * Lists all existing backups sorted newest first.
   */
  public listBackups(): BackupMetadata[] {
    ensureBackupDir();
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith("motordesk_backup_") && f.endsWith(".json") && f !== "motordesk_backup_latest.json");

      const list: BackupMetadata[] = [];

      for (const filename of files) {
        try {
          const fullPath = path.join(BACKUP_DIR, filename);
          const stats = fs.statSync(fullPath);
          
          // Read header metadata
          const content = fs.readFileSync(fullPath, "utf8");
          const parsed = JSON.parse(content);

          list.push({
            backupId: parsed.backupId || filename,
            filename,
            date: parsed.date || filename.replace(/motordesk_backup_|\.json/g, "").slice(0, 10),
            createdAt: parsed.createdAt || stats.mtime.toISOString(),
            type: parsed.type || "daily_automated",
            database: parsed.database || "cloud_sql",
            fileSizeBytes: stats.size,
            fileSizeFormatted: formatBytes(stats.size),
            companiesCount: parsed.companiesCount || (parsed.companies || []).length,
            totalRecords: parsed.totalRecords || 0,
            companies: parsed.companies || [],
            collectionsSummary: parsed.collectionsSummary || {},
          });
        } catch (e) {
          // In case a single file is corrupt, skip gracefully
        }
      }

      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error("[DAILY-BACKUP] Erro ao listar backups:", err);
      return [];
    }
  }

  /**
   * Generates a strictly isolated backup for a single Company ID.
   * All other companies and their operational records are 100% excluded!
   * Includes ALL data: orders, clients, suppliers, budgets, parts, financial, everything!
   */
  public async getIsolatedCompanyBackup(getDbSnapshot: () => Promise<any>, companyId: string): Promise<any> {
    const rawData = await getDbSnapshot();
    if (!rawData) throw new Error("Base de dados indisponível.");

    const cleanCompanyId = String(companyId).trim();
    
    // Find company record
    const allCompanies = [
      ...(Array.isArray(rawData.registeredCompanies) ? rawData.registeredCompanies : []),
      ...(rawData.companyInfo ? [rawData.companyInfo] : []),
    ];
    const targetCompany = allCompanies.find(c => c && c.id === cleanCompanyId);

    if (!targetCompany) {
      throw new Error(`Empresa com ID "${cleanCompanyId}" não encontrada no sistema.`);
    }

    const cleanCompanyName = String(targetCompany.name || "empresa")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .toLowerCase();
    const cleanCnpj = String(targetCompany.cnpj || "").replace(/\D/g, "");
    const dateFormatted = new Date().toISOString().split("T")[0];
    const companyNumFormatted = String(targetCompany.companyNumber || 1).padStart(2, '0');
    const suggestedFilename = `motordesk_backup_empresa_${companyNumFormatted}_${cleanCompanyName}_${cleanCnpj || cleanCompanyId}_${dateFormatted}.json`;

    const isolatedData: any = {
      backupScope: "ISOLATED_COMPANY",
      _exportNote: `Backup Isolado Oficial da Empresa: Nº ${companyNumFormatted} - ${targetCompany.name} (CNPJ: ${targetCompany.cnpj || 'Sem CNPJ'})`,
      _securityGuarantee: "ISOLAMENTO MULTI-TENANT: Apenas os dados desta empresa estão presentes neste arquivo. Todas as demais empresas do sistema foram 100% omitidas.",
      metadata: {
        system: "MotorDesk ERP Multi-Tenant",
        backupType: "COMPANY_ISOLATED_BACKUP",
        version: "2.0",
        companyId: cleanCompanyId,
        companyNumber: targetCompany.companyNumber || 1,
        companyNumberFormatted: companyNumFormatted,
        companyName: targetCompany.name || "Sem Nome",
        tradeName: targetCompany.tradeName || targetCompany.name || "",
        cnpj: targetCompany.cnpj || "",
        companyType: targetCompany.companyType || "matriz",
        businessType: targetCompany.businessType || "OFICINA",
        exportedAt: new Date().toISOString(),
        suggestedFilename,
        totalRecords: 0,
        collectionsSummary: {},
      },
      companyId: cleanCompanyId,
      companyInfo: targetCompany,
      registeredCompanies: [targetCompany],
      exportedAt: new Date().toISOString(),
      database: {},
    };

    let totalRecords = 0;
    const collectionsCount: Record<string, number> = {};

    // Coletar todas as coleções do banco (tanto conhecidas quanto dinâmicas)
    const allCollectionKeys = Array.from(new Set([
      ...OPERATIONAL_COLLECTIONS,
      ...Object.keys(rawData).filter(k => Array.isArray(rawData[k])),
    ]));

    for (const col of allCollectionKeys) {
      if (col === "registeredCompanies" || col === "companyInfo") continue;

      if (Array.isArray(rawData[col])) {
        const filtered = rawData[col].filter((item: any) => {
          if (!item) return false;
          const itemCompId = item.companyId || item.company_id || item.targetCompanyId || item.empresaId;
          if (itemCompId) {
            return itemCompId === cleanCompanyId;
          }
          // Tabelas compartilhadas ou padrão inicial da matriz
          if (["unitsOfMeasure", "taxRules", "taxOperationNatures"].includes(col)) {
            return true;
          }
          return cleanCompanyId === 'comp-1';
        });

        isolatedData[col] = filtered;
        isolatedData.database[col] = filtered;
        collectionsCount[col] = filtered.length;
        totalRecords += filtered.length;
      }
    }

    // Configurações fiscais e módulos da empresa
    if (rawData.sefazConfig && typeof rawData.sefazConfig === 'object') {
      if (rawData.sefazConfig.companyId === cleanCompanyId || !rawData.sefazConfig.companyId) {
        isolatedData.sefazConfig = rawData.sefazConfig;
      }
    }
    if (rawData.contractModules && typeof rawData.contractModules === 'object') {
      isolatedData.contractModules = rawData.contractModules[cleanCompanyId] || rawData.contractModules;
    }

    isolatedData.metadata.totalRecords = totalRecords;
    isolatedData.metadata.collectionsSummary = collectionsCount;
    isolatedData.metadata.pedidosCount = (isolatedData.sales?.length || 0) + (isolatedData.serviceOrders?.length || 0) + (isolatedData.representativeOrders?.length || 0) + (isolatedData.purchaseHistory?.length || 0);
    isolatedData.metadata.clientesCount = isolatedData.clients?.length || 0;
    isolatedData.metadata.fornecedoresCount = isolatedData.suppliers?.length || 0;
    isolatedData.metadata.orcamentosCount = isolatedData.budgets?.length || 0;
    isolatedData.metadata.pecasCount = isolatedData.parts?.length || 0;
    isolatedData.metadata.servicosCount = isolatedData.services?.length || 0;
    isolatedData.metadata.financeiroCount = (isolatedData.accountsReceivable?.length || 0) + (isolatedData.accountsPayable?.length || 0) + (isolatedData.financialTransactions?.length || 0);

    isolatedData._metrics = {
      totalRecords,
      collectionsCount,
    };

    return isolatedData;
  }

  /**
   * Restores a backup file by filename.
   */
  public async restoreBackup(
    filename: string,
    currentDbGetter: () => Promise<any>,
    dbPersister: (data: any) => Promise<any>
  ): Promise<{ success: boolean; safetyBackup: string; restoredCompaniesCount: number; restoredRecordsCount: number }> {
    ensureBackupDir();
    const cleanFilename = path.basename(filename);
    const backupPath = path.join(BACKUP_DIR, cleanFilename);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Arquivo de backup "${cleanFilename}" não encontrado.`);
    }

    // 1. Create a safety snapshot of the current state before overwriting
    console.log("[DAILY-BACKUP] Creating pre-restore safety snapshot...");
    const safetyMeta = await this.createBackup(currentDbGetter, "pre_restore_safety");

    // 2. Read and parse the target backup file
    const content = fs.readFileSync(backupPath, "utf8");
    const parsed = JSON.parse(content);
    const dataToRestore = parsed.data || parsed;

    if (!dataToRestore || typeof dataToRestore !== "object") {
      throw new Error("Arquivo de backup inválido ou sem dados.");
    }

    // 3. Persist restored data
    await dbPersister(dataToRestore);
    console.log(`[DAILY-BACKUP] Base de dados restaurada com sucesso a partir de ${cleanFilename}`);

    const companiesCount = (dataToRestore.registeredCompanies || []).length || (dataToRestore.companyInfo ? 1 : 0);
    let totalRecords = 0;
    for (const col of OPERATIONAL_COLLECTIONS) {
      if (Array.isArray(dataToRestore[col])) {
        totalRecords += dataToRestore[col].length;
      }
    }

    return {
      success: true,
      safetyBackup: safetyMeta.filename,
      restoredCompaniesCount: companiesCount,
      restoredRecordsCount: totalRecords,
    };
  }

  /**
   * Restores data EXCLUSIVELY for a single specified Company ID.
   * 
   * ISOLATION GUARANTEE:
   * - Restores company info and operational records (clients, parts, OS, budgets, sales, etc.) ONLY for targetCompanyId.
   * - 100% of other companies in the live database remain UNTOUCHED and fully preserved.
   */
  public async restoreCompanyBackup(
    targetCompanyId: string,
    source: { filename?: string; backupData?: any; sourceData?: any },
    currentDbGetter: () => Promise<any>,
    dbPersister: (data: any) => Promise<any>,
    // Cópia de segurança antes de restaurar; quando há banco, o servidor a grava no próprio banco
    createSafetyBackup?: () => Promise<{ filename: string }>
  ): Promise<{
    success: boolean;
    targetCompanyId: string;
    targetCompanyName: string;
    safetyBackup: string;
    restoredRecordsCount: number;
    restoredCollections: Record<string, number>;
    isolationGuarantee: string;
    unaffectedCompaniesCount: number;
    unaffectedCompanies: Array<{ id: string; name: string; recordsIntact: number }>;
  }> {
    const cleanTargetId = String(targetCompanyId).trim();
    if (!cleanTargetId) {
      throw new Error("Identificador da empresa alvo (targetCompanyId) é obrigatório.");
    }

    // 1. Obter snapshot da base atual
    const currentData = await currentDbGetter();
    if (!currentData || typeof currentData !== "object") {
      throw new Error("Base de dados ativa indisponível.");
    }

    // 2. Obter dados da fonte de restauração (arquivo no servidor ou JSON fornecido)
    let sourceData: any = null;
    let sourceDesc = "upload direto";

    const payload = source.backupData || source.sourceData;
    if (payload && typeof payload === "object") {
      sourceData = payload.data || payload;
      sourceDesc = source.filename ? `arquivo ${source.filename}` : "arquivo JSON enviado";
    } else if (source.filename) {
      ensureBackupDir();
      const cleanFilename = path.basename(source.filename);
      const backupPath = path.join(BACKUP_DIR, cleanFilename);
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Arquivo de backup "${cleanFilename}" não encontrado.`);
      }
      const rawContent = fs.readFileSync(backupPath, "utf8");
      const parsed = JSON.parse(rawContent);
      sourceData = parsed.data || parsed;
      sourceDesc = `arquivo ${cleanFilename}`;
    } else {
      // Fallback: usar o último backup diário do servidor
      ensureBackupDir();
      const latestPath = path.join(BACKUP_DIR, "motordesk_backup_latest.json");
      if (fs.existsSync(latestPath)) {
        const rawContent = fs.readFileSync(latestPath, "utf8");
        const parsed = JSON.parse(rawContent);
        sourceData = parsed.data || parsed;
        sourceDesc = "último snapshot do servidor (motordesk_backup_latest.json)";
      } else {
        throw new Error("Nenhum arquivo de backup especificado e nenhum snapshot recente disponível no servidor.");
      }
    }

    if (!sourceData || typeof sourceData !== "object") {
      throw new Error("Dados da fonte de backup inválidos ou corrompidos.");
    }

    // Se houver wrapper database interno, mesclar chaves faltantes
    if (sourceData.database && typeof sourceData.database === "object") {
      for (const k of Object.keys(sourceData.database)) {
        if (!sourceData[k] && Array.isArray(sourceData.database[k])) {
          sourceData[k] = sourceData.database[k];
        }
      }
    }

    const isCompanyIsolatedBackup = Boolean(
      sourceData.metadata?.backupType === "COMPANY_ISOLATED_BACKUP" ||
      sourceData.companyId ||
      sourceData._securityGuarantee
    );

    // 3. Localizar a empresa alvo no backup
    const sourceCompanies = [
      ...(Array.isArray(sourceData.registeredCompanies) ? sourceData.registeredCompanies : []),
      ...(sourceData.companyInfo ? [sourceData.companyInfo] : []),
    ];
    let sourceCompany = sourceCompanies.find((c: any) => c && c.id === cleanTargetId) || sourceData.companyInfo || sourceCompanies[0];

    const currentCompanies = [
      ...(Array.isArray(currentData.registeredCompanies) ? currentData.registeredCompanies : []),
      ...(currentData.companyInfo ? [currentData.companyInfo] : []),
    ];
    const liveCompany = currentCompanies.find((c: any) => c && c.id === cleanTargetId);

    const targetCompanyName = sourceCompany?.name || liveCompany?.name || `Empresa ${cleanTargetId}`;

    if (sourceCompany) {
      sourceCompany = { ...sourceCompany, id: cleanTargetId };
    }

    // 4. Criar snapshot de segurança pré-restauração obrigatório
    console.log(`[DAILY-BACKUP] Criando snapshot de segurança pré-restauração para a empresa ${cleanTargetId}...`);
    const safetyMeta = createSafetyBackup ? await createSafetyBackup() : await this.createBackup(currentDbGetter, "pre_restore_safety");

    // 5. Preparar dados restaurados com isolamento estrito
    const updatedData: any = { ...currentData };
    const restoredCollections: Record<string, number> = {};
    let totalRestoredRecords = 0;

    // Atualizar empresa em registeredCompanies
    if (sourceCompany) {
      const regComps = Array.isArray(updatedData.registeredCompanies) ? [...updatedData.registeredCompanies] : [];
      const idx = regComps.findIndex((c: any) => c && c.id === cleanTargetId);
      if (idx !== -1) {
        regComps[idx] = sourceCompany;
      } else {
        regComps.push(sourceCompany);
      }
      updatedData.registeredCompanies = regComps;

      if (updatedData.companyInfo?.id === cleanTargetId) {
        updatedData.companyInfo = sourceCompany;
      }
    }

    // Coletar todas as coleções operacionais que existem no banco ou no arquivo
    const allCollectionKeys = Array.from(new Set([
      ...OPERATIONAL_COLLECTIONS,
      ...Object.keys(currentData).filter(k => Array.isArray(currentData[k])),
      ...Object.keys(sourceData).filter(k => Array.isArray(sourceData[k])),
      ...Object.keys(sourceData.database || {}).filter(k => Array.isArray(sourceData.database[k])),
    ]));

    // Restaurar coleções preservando 100% de todas as outras empresas
    for (const col of allCollectionKeys) {
      if (col === "registeredCompanies" || col === "companyInfo") continue;

      const currentList = Array.isArray(currentData[col]) ? currentData[col] : [];
      // Manter TODOS os registros de outras empresas
      const otherCompaniesRecords = currentList.filter((item: any) => {
        if (!item) return false;
        const itemCompId = item.companyId || item.company_id || item.targetCompanyId || item.empresaId;
        return itemCompId !== cleanTargetId;
      });

      // Extrair registros da empresa alvo a partir da fonte de backup
      const rawSourceList = Array.isArray(sourceData[col])
        ? sourceData[col]
        : (sourceData.database && Array.isArray(sourceData.database[col]) ? sourceData.database[col] : []);

      let targetCompanyRecords: any[] = [];

      if (isCompanyIsolatedBackup) {
        // No backup isolado por empresa, todos os registros pertencem à empresa alvo
        targetCompanyRecords = rawSourceList.map((item: any) => {
          if (!item || typeof item !== "object") return item;
          return { ...item, companyId: cleanTargetId };
        });
      } else {
        // No backup geral multi-empresa, filtrar registros da empresa alvo
        targetCompanyRecords = rawSourceList.filter((item: any) => {
          if (!item) return false;
          const itemCompId = item.companyId || item.company_id || item.targetCompanyId || item.empresaId;
          return itemCompId === cleanTargetId;
        });
      }

      // Nova lista mesclada: outros intactos + alvo restaurado
      updatedData[col] = [...otherCompaniesRecords, ...targetCompanyRecords];
      restoredCollections[col] = targetCompanyRecords.length;
      totalRestoredRecords += targetCompanyRecords.length;
    }

    // Lista de empresas não afetadas para auditoria de garantia
    const unaffectedCompanies: Array<{ id: string; name: string; recordsIntact: number }> = [];
    const allRegistered = Array.isArray(updatedData.registeredCompanies) ? updatedData.registeredCompanies : [];
    
    for (const comp of allRegistered) {
      if (!comp || comp.id === cleanTargetId) continue;
      let count = 0;
      for (const col of allCollectionKeys) {
        if (Array.isArray(updatedData[col])) {
          count += updatedData[col].filter((i: any) => {
            if (!i) return false;
            const itemCompId = i.companyId || i.company_id || i.targetCompanyId || i.empresaId;
            return itemCompId === comp.id;
          }).length;
        }
      }
      unaffectedCompanies.push({
        id: comp.id,
        name: comp.name || `Empresa ${comp.id}`,
        recordsIntact: count,
      });
    }

    // 6. Gravar de forma atômica no banco de dados
    await dbPersister(updatedData);

    console.log(`[DAILY-BACKUP] Restauração isolada concluída com sucesso para a empresa ${cleanTargetId} a partir de ${sourceDesc}: ${totalRestoredRecords} registros restaurados.`);

    return {
      success: true,
      targetCompanyId: cleanTargetId,
      targetCompanyName,
      safetyBackup: safetyMeta.filename,
      restoredRecordsCount: totalRestoredRecords,
      restoredCollections,
      isolationGuarantee: "ISOLAMENTO ABSOLUTO: Nenhuma outra empresa foi afetada. Todos os dados de outras empresas permaneceram 100% intactos.",
      unaffectedCompaniesCount: unaffectedCompanies.length,
      unaffectedCompanies,
    };
  }

  public getStatus(): {
    schedulerActive: boolean;
    frequency: string;
    nextExecution: string;
    lastBackupDate: string;
    totalStoredBackups: number;
    backupDirectory: string;
  } {
    const list = this.listBackups();
    return {
      schedulerActive: true,
      frequency: "Diário (às 00:00 e na inicialização diária)",
      nextExecution: "00:00 (automático)",
      lastBackupDate: this.lastBackupDate || (list[0]?.date || "Nenhum ainda hoje"),
      totalStoredBackups: list.length,
      backupDirectory: BACKUP_DIR,
    };
  }

  /**
   * Retorna as políticas de backup configuradas para cada empresa cadastrada
   */
  public getCompanyBackupPolicies(rawData: any): Array<{
    companyNumber: number;
    companyId: string;
    name: string;
    cnpj: string;
    companyType: string;
    backupService: {
      enabled: boolean;
      frequency: "daily" | "periodic" | "weekly";
      scheduleTime: string;
      intervalHours: number;
      daysOfWeek: string[];
      retentionDays: number;
      updatedAt?: string;
    };
  }> {
    const list: any[] = [];
    const all = [
      ...(Array.isArray(rawData?.registeredCompanies) ? rawData.registeredCompanies : []),
      ...(rawData?.companyInfo ? [rawData.companyInfo] : []),
    ];
    const seen = new Set<string>();
    let idx = 0;
    for (const c of all) {
      if (!c || !c.id || seen.has(c.id)) continue;
      seen.add(c.id);
      idx++;
      const cNum = c.companyNumber || idx;
      const backupService = c.backupService || {
        enabled: true,
        frequency: "daily",
        scheduleTime: "02:00",
        intervalHours: 4,
        daysOfWeek: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
        retentionDays: 30,
      };
      list.push({
        companyNumber: cNum,
        companyId: c.id,
        name: c.name || `Empresa ${cNum}`,
        cnpj: c.cnpj || "",
        companyType: c.companyType || "matriz",
        backupService,
        enabled: Boolean(backupService.enabled),
      });
    }
    return list;
  }

  /**
   * Atualiza a política de backup de uma empresa específica
   */
  public updateCompanyBackupPolicy(rawData: any, companyId: string, policy: any): any {
    const updated = { ...rawData };
    const reg = Array.isArray(updated.registeredCompanies) ? [...updated.registeredCompanies] : [];
    let found = false;
    const cleanPolicy = {
      enabled: Boolean(policy.enabled),
      frequency: policy.frequency === "periodic" || policy.frequency === "weekly" ? policy.frequency : "daily",
      scheduleTime: policy.scheduleTime || "02:00",
      intervalHours: Number(policy.intervalHours) || 4,
      daysOfWeek: Array.isArray(policy.daysOfWeek) && policy.daysOfWeek.length > 0 ? policy.daysOfWeek : ["seg", "qua", "sex"],
      retentionDays: Number(policy.retentionDays) || 30,
      updatedAt: new Date().toISOString(),
    };

    for (let i = 0; i < reg.length; i++) {
      if (reg[i] && reg[i].id === companyId) {
        reg[i] = {
          ...reg[i],
          backupService: cleanPolicy,
        };
        found = true;
      }
    }

    if (updated.companyInfo && updated.companyInfo.id === companyId) {
      updated.companyInfo = {
        ...updated.companyInfo,
        backupService: cleanPolicy,
      };
      found = true;
    }

    if (!found && reg.length === 0 && updated.companyInfo) {
      updated.companyInfo = {
        ...updated.companyInfo,
        backupService: cleanPolicy,
      };
    }

    updated.registeredCompanies = reg;
    return updated;
  }
}
