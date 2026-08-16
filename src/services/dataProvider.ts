import { AppDatabase, STORAGE_KEY, INITIAL_COMPANY_INFO, INITIAL_COMPANIES, INITIAL_USERS, INITIAL_CLIENTS, INITIAL_VEHICLES, INITIAL_PARTS, INITIAL_STOCK_MOVEMENTS, INITIAL_SERVICES, INITIAL_BUDGETS, INITIAL_SERVICE_ORDERS, INITIAL_HISTORY, INITIAL_TEST_CASES, INITIAL_NOTIFICATIONS, INITIAL_ALERT_SETTINGS, INITIAL_SUPPLIERS, INITIAL_SUPPLIER_PART_PRICES, INITIAL_QUOTATIONS, INITIAL_ACCOUNTS_RECEIVABLE, INITIAL_ACCOUNTS_PAYABLE, INITIAL_FINANCIAL_TRANSACTIONS, INITIAL_PAYMENT_METHODS, INITIAL_MAINTENANCE_LOGS, INITIAL_FISCAL_DOCUMENTS, INITIAL_BOLETOS, INITIAL_INTER_BRANCH_SALES, INITIAL_SEFAZ_CONFIG, INITIAL_TAX_OPERATION_NATURES, INITIAL_TAX_RULES, INITIAL_XML_IMPORT_RECORDS } from '../data/mockData';
import api from './api';

export interface IDataProvider {
  getDatabase(): Promise<AppDatabase>;
  saveDatabase(db: AppDatabase): Promise<void>;
  syncLocalToCloud(): Promise<{ synced: boolean; count?: number }>;
}

export class LocalStorageProvider implements IDataProvider {
  async getDatabase(): Promise<AppDatabase> {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Failed to parse LocalStorage database:", e);
      }
    }
    const defaultDb = this.getDefaultDb();
    this.saveDatabase(defaultDb);
    return defaultDb;
  }

  async saveDatabase(db: AppDatabase): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  async syncLocalToCloud(): Promise<{ synced: boolean }> {
    return { synced: false };
  }

  private getDefaultDb(): AppDatabase {
    let cachedLanding: any;
    try {
      const saved = localStorage.getItem('motordesk_landing_content_v2');
      if (saved) cachedLanding = JSON.parse(saved);
    } catch (e) {}

    return {
      landingContent: cachedLanding,
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

export class ApiPostgresProvider implements IDataProvider {
  async getDatabase(): Promise<AppDatabase> {
    let lastError: any = null;
    // Tenta até 3 vezes obter os dados oficiais do Cloud SQL antes de recorrer a cache
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await api.get('/api/db');
        if (res.status === 200 && res.data) {
          const body = res.data;
          if (body.success && body.data) {
            // Servidor/Cloud SQL é a ÚNICA fonte de verdade oficial.
            // Sincroniza LocalStorage como cache espelho para performance e resiliência.
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(body.data));
            } catch (e) {
              console.warn("[ApiPostgresProvider] Não foi possível atualizar cache no LocalStorage:", e);
            }
            return body.data;
          }
        }
        throw new Error(res.data?.error || res.data?.message || 'Resposta inválida da API do Banco Centralizado');
      } catch (e: any) {
        lastError = e;
        console.warn(`[ApiPostgresProvider] Tentativa ${attempt}/3 de carregar banco falhou:`, e?.response?.data || e.message);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 200 * attempt));
        }
      }
    }

    console.warn("[ApiPostgresProvider] Não foi possível obter dados do servidor backend após tentativas, buscando cache local:", lastError?.response?.data || lastError?.message);

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (err) {}
    }
    return this.getDefaultDb();
  }

  async saveDatabase(db: AppDatabase): Promise<void> {
    // REGRA 3: Gravação oficial diretamente no PostgreSQL Cloud SQL com retry de resiliência
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await api.post('/api/db', db);
        if (res.status === 200 && res.data?.success) {
          // REGRA 3: O LocalStorage SOMENTE é atualizado DEPOIS que o servidor confirmar HTTP 200 e success: true
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          } catch (e) {
            console.warn("[ApiPostgresProvider] Não foi possível atualizar cache no LocalStorage após gravação:", e);
          }
          return;
        }
        throw new Error(res.data?.error || res.data?.message || 'Falha na confirmação de gravação no PostgreSQL Cloud SQL');
      } catch (e: any) {
        lastError = e;
        if (attempt < 2) {
          console.warn(`[ApiPostgresProvider] Tentativa ${attempt}/2 de salvar no Cloud SQL falhou, tentando novamente...`);
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    }

    console.error("[ApiPostgresProvider] Erro ao persistir dados no PostgreSQL Cloud SQL:", lastError?.response?.data || lastError?.message);
    const errMsg = lastError?.response?.data?.message || lastError?.response?.data?.error || lastError?.message || 'Falha na gravação do PostgreSQL.';
    throw new Error(`[Cloud SQL Error] Não foi possível salvar os dados no PostgreSQL: ${errMsg}`);
  }

  async syncLocalToCloud(): Promise<{ synced: boolean; count?: number }> {
    try {
      const localDataStr = localStorage.getItem(STORAGE_KEY);
      if (localDataStr) {
        const localDb = JSON.parse(localDataStr);
        await this.saveDatabase(localDb);
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
