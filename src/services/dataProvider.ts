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

export class ApiPostgresProvider implements IDataProvider {
  async getDatabase(): Promise<AppDatabase> {
    try {
      const res = await api.get('/api/db');
      if (res.status === 200 && res.data) {
        const body = res.data;
        if (body.success && body.data) {
          // Cloud SQL PostgreSQL é a ÚNICA fonte de verdade oficial.
          // Atualiza o cache do LocalStorage APENAS após resposta confirmada do servidor.
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(body.data));
          } catch (e) {
            console.warn("[ApiPostgresProvider] Não foi possível atualizar cache de leitura no LocalStorage:", e);
          }
          return body.data;
        } else if (body.success && body.data === null) {
          // Banco conectado no PostgreSQL, porém sem registros ainda: semeia estrutura inicial no PostgreSQL
          const defaultDb = this.getDefaultDb();
          await this.saveDatabase(defaultDb);
          return defaultDb;
        }
      }
      throw new Error(res.data?.error || res.data?.message || 'Resposta inválida da API do PostgreSQL Cloud SQL');
    } catch (e: any) {
      console.warn("[ApiPostgresProvider] Não foi possível obter dados remotos do PostgreSQL Cloud SQL, usando cache local / dados padrão:", e?.response?.data || e.message);

      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (err) {}
      }
      return this.getDefaultDb();
    }
  }

  async saveDatabase(db: AppDatabase): Promise<void> {
    // REGRA 3: Gravação oficial diretamente no PostgreSQL Cloud SQL
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
      console.error("[ApiPostgresProvider] Erro ao persistir dados no PostgreSQL Cloud SQL:", e?.response?.data || e.message);
      // REGRA 3: Se o PostgreSQL falhar, NÃO atualizar LocalStorage!
      // Lança o erro para que o chamador/usuário seja notificado de que os dados NÃO foram salvos.
      const errMsg = e?.response?.data?.message || e?.response?.data?.error || e.message || 'Falha na gravação do PostgreSQL.';
      throw new Error(`[Cloud SQL Error] Não foi possível salvar os dados no PostgreSQL: ${errMsg}`);
    }
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
