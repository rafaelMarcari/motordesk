import { AppDatabase, STORAGE_KEY, INITIAL_COMPANY_INFO, INITIAL_COMPANIES, INITIAL_USERS, INITIAL_CLIENTS, INITIAL_VEHICLES, INITIAL_PARTS, INITIAL_STOCK_MOVEMENTS, INITIAL_SERVICES, INITIAL_BUDGETS, INITIAL_SERVICE_ORDERS, INITIAL_HISTORY, INITIAL_TEST_CASES, INITIAL_NOTIFICATIONS, INITIAL_ALERT_SETTINGS, INITIAL_SUPPLIERS, INITIAL_SUPPLIER_PART_PRICES, INITIAL_QUOTATIONS, INITIAL_ACCOUNTS_RECEIVABLE, INITIAL_ACCOUNTS_PAYABLE, INITIAL_FINANCIAL_TRANSACTIONS, INITIAL_PAYMENT_METHODS, INITIAL_MAINTENANCE_LOGS, INITIAL_FISCAL_DOCUMENTS, INITIAL_BOLETOS, INITIAL_INTER_BRANCH_SALES, INITIAL_SEFAZ_CONFIG, INITIAL_TAX_OPERATION_NATURES, INITIAL_TAX_RULES, INITIAL_XML_IMPORT_RECORDS } from '../data/mockData';
import { CompanyInfo } from '../types';
import api from './api';

export interface IDataProvider {
  getDatabase(): Promise<AppDatabase>;
  saveDatabase(db: AppDatabase): Promise<void>;
  saveDatabaseImmediate(db: AppDatabase): Promise<void>;
  getCompanies(): Promise<CompanyInfo[]>;
  syncLocalToCloud(): Promise<{ synced: boolean; count?: number }>;
}

export class ApiPostgresProvider implements IDataProvider {
  private pendingSaveTimer: any = null;
  private pendingSaveDb: AppDatabase | null = null;
  private isSaving: boolean = false;

  async getDatabase(): Promise<AppDatabase> {
    const startTime = Date.now();
    let lastError: any = null;

    // 1. Tenta obter os dados oficiais diretamente do backend Cloud SQL
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await api.get('/api/db');
        if (res.status === 200 && res.data) {
          const body = res.data;
          if (body.success && body.data) {
            const companyCount = (body.data.registeredCompanies || []).length;
            const userCount = (body.data.users || []).length;
            console.log(`[COMPANY_LOAD] Cloud SQL database loaded in ${Date.now() - startTime}ms (${companyCount} companies, ${userCount} users, source: ${body.source})`);

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

    // 2. Se a API Cloud SQL não respondeu, recupera do cache local persistente
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          console.warn(`[COMPANY_LOAD] Using local cache fallback after Cloud SQL timeout (${Date.now() - startTime}ms)`);
          return parsed;
        }
      } catch (err) {}
    }

    console.warn(`[COMPANY_LOAD] Using initial default structure (${Date.now() - startTime}ms)`);
    return this.getDefaultDb();
  }

  async saveDatabase(db: AppDatabase): Promise<void> {
    // 1. Gravação local instantânea para zero latência
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn("[ApiPostgresProvider] Erro ao salvar no LocalStorage:", e);
    }

    // 2. Agendamento com debounce (300ms) para evitar saturação de requisições de 800KB
    this.pendingSaveDb = db;
    if (this.pendingSaveTimer) {
      clearTimeout(this.pendingSaveTimer);
    }

    this.pendingSaveTimer = setTimeout(() => {
      this.flushPendingSave();
    }, 300);
  }

  async saveDatabaseImmediate(db: AppDatabase): Promise<void> {
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

    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await api.post('/api/db', payload);
          if (res.status === 200 && res.data?.success) {
            console.log(`[DB_POST] Successfully synced database with Cloud SQL in ${Date.now() - startTime}ms (source: ${res.data.source})`);
            break;
          }
        } catch (err: any) {
          if (attempt === 3) {
            console.warn("[ApiPostgresProvider] Sincronização em segundo plano falhou após 3 tentativas:", err.message);
          } else {
            await new Promise((r) => setTimeout(r, 200 * attempt));
          }
        }
      }
    } finally {
      this.isSaving = false;
      // Se houver uma nova gravação enfileirada enquanto a anterior salvava, despacha
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
