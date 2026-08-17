import { AppDatabase, STORAGE_KEY, INITIAL_COMPANY_INFO, INITIAL_COMPANIES, INITIAL_USERS, INITIAL_CLIENTS, INITIAL_VEHICLES, INITIAL_PARTS, INITIAL_STOCK_MOVEMENTS, INITIAL_SERVICES, INITIAL_BUDGETS, INITIAL_SERVICE_ORDERS, INITIAL_HISTORY, INITIAL_TEST_CASES, INITIAL_NOTIFICATIONS, INITIAL_ALERT_SETTINGS, INITIAL_SUPPLIERS, INITIAL_SUPPLIER_PART_PRICES, INITIAL_QUOTATIONS, INITIAL_ACCOUNTS_RECEIVABLE, INITIAL_ACCOUNTS_PAYABLE, INITIAL_FINANCIAL_TRANSACTIONS, INITIAL_PAYMENT_METHODS, INITIAL_MAINTENANCE_LOGS, INITIAL_FISCAL_DOCUMENTS, INITIAL_BOLETOS, INITIAL_INTER_BRANCH_SALES, INITIAL_SEFAZ_CONFIG, INITIAL_TAX_OPERATION_NATURES, INITIAL_TAX_RULES, INITIAL_XML_IMPORT_RECORDS } from '../data/mockData';
import { CompanyInfo } from '../types';
import api from './api';

export interface IDataProvider {
  getDatabase(): Promise<AppDatabase>;
  saveDatabase(db: AppDatabase): Promise<void>;
  saveDatabaseImmediate(db: AppDatabase): Promise<void>;
  getCompanies(): Promise<CompanyInfo[]>;
  syncLocalToCloud(): Promise<{ synced: boolean; count?: number }>;
  setDataMergedCallback?(cb: (mergedDb: AppDatabase) => void): void;
}

export class ApiPostgresProvider implements IDataProvider {
  private pendingSaveTimer: any = null;
  private pendingSaveDb: AppDatabase | null = null;
  private isSaving: boolean = false;
  private onDataMergedCallback?: (mergedDb: AppDatabase) => void;

  setDataMergedCallback(cb: (mergedDb: AppDatabase) => void) {
    this.onDataMergedCallback = cb;
  }

  async getDatabase(): Promise<AppDatabase> {
    const startTime = Date.now();
    console.log(`[TRACE-PERSISTENCE] GET /api/db START (time: ${new Date().toISOString()})`);
    let lastError: any = null;

    // 1. Tenta obter os dados oficiais diretamente do backend Cloud SQL
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await api.get('/api/db');
        if (res.status === 200 && res.data) {
          const body = res.data;
          if (body.success && body.data) {
            const empresas = (body.data.registeredCompanies || []).length;
            const usuarios = (body.data.users || []).length;
            const clientes = (body.data.clients || []).length;
            const veiculos = (body.data.vehicles || []).length;
            const pecas = (body.data.parts || []).length;
            const companyId = body.data.companyInfo?.id || 'none';
            const updatedAt = body.updatedAt || new Date().toISOString();

            console.log(`[TRACE-PERSISTENCE] GET /api/db\ncompanyId=${companyId}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nupdatedAt=${updatedAt}\nsource=${body.source}\nlatencyMs=${Date.now() - startTime}`);

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(body.data));
            } catch (e) {}

            return body.data;
          }
        }
      } catch (e: any) {
        lastError = e;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 150 * attempt));
        }
      }
    }

    console.warn(`[TRACE-PERSISTENCE] GET /api/db ERROR after 3 attempts: ${lastError?.message || 'Unknown'}`);

    // 2. Se a API Cloud SQL não respondeu, recupera do cache local persistente
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          console.warn(`[TRACE-PERSISTENCE] Using local storage fallback after Cloud SQL timeout (${Date.now() - startTime}ms)`);
          return parsed;
        }
      } catch (err) {}
    }

    console.warn(`[TRACE-PERSISTENCE] Using initial default structure (${Date.now() - startTime}ms)`);
    return this.getDefaultDb();
  }

  async saveDatabase(db: AppDatabase): Promise<void> {
    const clientCount = (db.clients || []).length;
    const companyCount = (db.registeredCompanies || []).length;
    console.log(`[TRACE-PERSISTENCE] SAVE_DATABASE (debounced 300ms): clients=${clientCount}, companies=${companyCount}`);

    // 1. Gravação local instantânea para resiliência temporária
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn("[TRACE-PERSISTENCE] Erro ao salvar no LocalStorage:", e);
    }

    // 2. Agendamento com debounce (300ms)
    this.pendingSaveDb = db;
    if (this.pendingSaveTimer) {
      clearTimeout(this.pendingSaveTimer);
    }

    this.pendingSaveTimer = setTimeout(() => {
      this.flushPendingSave();
    }, 300);
  }

  async saveDatabaseImmediate(db: AppDatabase): Promise<void> {
    const clientCount = (db.clients || []).length;
    const companyCount = (db.registeredCompanies || []).length;
    console.log(`[TRACE-PERSISTENCE] SAVE_DATABASE_IMMEDIATE: clients=${clientCount}, companies=${companyCount}`);

    if (this.pendingSaveTimer) {
      clearTimeout(this.pendingSaveTimer);
      this.pendingSaveTimer = null;
    }
    this.pendingSaveDb = db;
    await this.flushPendingSave();
  }

  private async flushPendingSave(): Promise<void> {
    if (!this.pendingSaveDb || this.isSaving) return;

    const payload = this.pendingSaveDb;
    this.pendingSaveDb = null;
    this.isSaving = true;
    const startTime = Date.now();
    const payloadSize = JSON.stringify(payload).length;
    const empresas = (payload.registeredCompanies || []).length;
    const usuarios = (payload.users || []).length;
    const clientes = (payload.clients || []).length;
    const veiculos = (payload.vehicles || []).length;
    const pecas = (payload.parts || []).length;
    const companyId = payload.companyInfo?.id || 'none';

    console.log(`[TRACE-PERSISTENCE] POST /api/db\ncompanyId=${companyId}\npayloadSize=${payloadSize}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nupdatedAt=${new Date().toISOString()}`);

    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await api.post('/api/db', payload);
          if (res.status === 200 && res.data?.success) {
            console.log(`[TRACE-PERSISTENCE] POST /api/db SUCCESS: database=${res.data.database}, source=${res.data.source}, updatedAt=${res.data.updatedAt}, duration=${Date.now() - startTime}ms`);
            
            // If server returned merged data, update cache and notify UI
            if (res.data.data) {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.data));
              } catch (e) {}
              if (this.onDataMergedCallback) {
                this.onDataMergedCallback(res.data.data);
              }
            }
            break;
          }
        } catch (err: any) {
          console.warn(`[TRACE-PERSISTENCE] POST /api/db ERROR (attempt ${attempt}/3):`, err.message);
          if (attempt === 3) {
            console.error("[TRACE-PERSISTENCE] POST /api/db FAILED permanently after 3 attempts:", err.message);
          } else {
            await new Promise((r) => setTimeout(r, 200 * attempt));
          }
        }
      }
    } finally {
      this.isSaving = false;
      if (this.pendingSaveDb) {
        this.flushPendingSave();
      }
    }
  }

  async getCompanies(): Promise<CompanyInfo[]> {
    try {
      const res = await api.get('/api/companies');
      if (res.data?.success && Array.isArray(res.data.companies)) {
        return res.data.companies;
      }
    } catch (e) {}

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed.registeredCompanies || (parsed.companyInfo ? [parsed.companyInfo] : []);
      } catch (e) {}
    }
    return INITIAL_COMPANIES;
  }

  async syncLocalToCloud(): Promise<{ synced: boolean; count?: number }> {
    try {
      const localDataStr = localStorage.getItem(STORAGE_KEY);
      if (localDataStr) {
        const localDb = JSON.parse(localDataStr);
        await this.saveDatabaseImmediate(localDb);
        return { synced: true, count: localDb.clients?.length || 0 };
      }
    } catch (e) {
      console.error("[ApiPostgresProvider] Falha ao sincronizar cache local com Cloud SQL:", e);
    }
    return { synced: false };
  }

  private getDefaultDb(): AppDatabase {
    return {
      globalModules: {
        accessDashboard: true,
        accessClients: true,
        accessVehicles: true,
        accessParts: true,
        accessQuotations: true,
        accessServices: true,
        accessBudgets: true,
        accessServiceOrders: true,
        accessAccountsReceivable: true,
        accessAccountsPayable: true,
        accessFinancial: true,
        accessFiscal: true,
        accessHistory: true,
        accessReports: true,
        accessUserManagement: true,
      },
      loginHistory: [],
      companyInfo: INITIAL_COMPANY_INFO,
      registeredCompanies: INITIAL_COMPANIES,
      users: INITIAL_USERS,
      clients: INITIAL_CLIENTS,
      vehicles: INITIAL_VEHICLES,
      parts: INITIAL_PARTS,
      stockMovements: INITIAL_STOCK_MOVEMENTS,
      services: INITIAL_SERVICES,
      budgets: INITIAL_BUDGETS,
      serviceOrders: INITIAL_SERVICE_ORDERS,
      history: INITIAL_HISTORY,
      testCases: INITIAL_TEST_CASES,
      notifications: INITIAL_NOTIFICATIONS,
      alertSettings: INITIAL_ALERT_SETTINGS,
      suppliers: INITIAL_SUPPLIERS,
      supplierPartPrices: INITIAL_SUPPLIER_PART_PRICES,
      quotations: INITIAL_QUOTATIONS,
      accountsReceivable: INITIAL_ACCOUNTS_RECEIVABLE,
      accountsPayable: INITIAL_ACCOUNTS_PAYABLE,
      financialTransactions: INITIAL_FINANCIAL_TRANSACTIONS,
      paymentMethods: INITIAL_PAYMENT_METHODS,
      maintenanceLogs: INITIAL_MAINTENANCE_LOGS,
      fiscalDocuments: INITIAL_FISCAL_DOCUMENTS,
      boletos: INITIAL_BOLETOS,
      interBranchSales: INITIAL_INTER_BRANCH_SALES,
      sefazConfig: INITIAL_SEFAZ_CONFIG,
      taxOperationNatures: INITIAL_TAX_OPERATION_NATURES,
      taxRules: INITIAL_TAX_RULES,
      xmlImportRecords: INITIAL_XML_IMPORT_RECORDS,
    };
  }
}

// Master Data Provider Manager singleton
export const dataProvider: IDataProvider = new ApiPostgresProvider();
