import { AppDatabase } from '../data/mockData';
import { CompanyInfo, User, Client, Vehicle, Part, Service, Budget, ServiceOrder, HistoryEntry, Supplier, SupplierPartPrice, Quotation, AccountReceivable, AccountPayable, FinancialTransaction, PaymentMethodOption, MaintenanceLog, FiscalDocument, BoletoDocument, InterBranchSaleLogistics, StockMovement, SystemNotification, TestCase, TaxOperationNature, TaxRule, XmlImportRecord, CommercialSale, Carrier, GoodsWithdrawalOrder, UnitOfMeasure } from '../types';
import { normalizeBusinessType } from './businessSegmentation';

function mergeList<T extends Record<string, any>>(
  existingList: T[] | undefined,
  incomingList: T[] | undefined,
  primaryKey: string = 'id',
  secondaryKey?: string
): T[] {
  const map = new Map<string, T>();

  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (!item) continue;
      const key = item[primaryKey] || (secondaryKey ? item[secondaryKey] : null);
      if (key) {
        map.set(String(key).trim().toLowerCase(), item);
      }
    }
  }

  if (Array.isArray(incomingList)) {
    for (const item of incomingList) {
      if (!item) continue;
      const key = item[primaryKey] || (secondaryKey ? item[secondaryKey] : null);
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

export function mergeDatabases(existing: AppDatabase, incoming: AppDatabase): AppDatabase {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const mergedRegisteredCompanies = mergeList<CompanyInfo>(existing.registeredCompanies, incoming.registeredCompanies, 'id', 'cnpj').map(c => ({
    ...c,
    businessType: normalizeBusinessType(c.businessType)
  }));
  const rawActiveCompany = incoming.companyInfo || existing.companyInfo || (mergedRegisteredCompanies.length > 0 ? mergedRegisteredCompanies[0] : undefined);
  const activeCompany = rawActiveCompany ? {
    ...rawActiveCompany,
    businessType: normalizeBusinessType(rawActiveCompany.businessType)
  } : undefined;

  return {
    ...existing,
    ...incoming,
    companyInfo: activeCompany as any,
    registeredCompanies: mergedRegisteredCompanies,
    users: mergeList<User>(existing.users, incoming.users, 'id', 'username'),
    clients: mergeList<Client>(existing.clients, incoming.clients, 'id', 'cpf'),
    vehicles: mergeList<Vehicle>(existing.vehicles, incoming.vehicles, 'id', 'plate'),
    parts: mergeList<Part>(existing.parts, incoming.parts, 'id', 'code'),
    services: mergeList<Service>(existing.services, incoming.services, 'id'),
    budgets: mergeList<Budget>(existing.budgets, incoming.budgets, 'id'),
    serviceOrders: mergeList<ServiceOrder>(existing.serviceOrders, incoming.serviceOrders, 'id'),
    history: mergeList<HistoryEntry>(existing.history, incoming.history, 'id'),
    suppliers: mergeList<Supplier>(existing.suppliers, incoming.suppliers, 'id', 'cnpj'),
    supplierPartPrices: mergeList<SupplierPartPrice>(existing.supplierPartPrices, incoming.supplierPartPrices, 'id'),
    quotations: mergeList<Quotation>(existing.quotations, incoming.quotations, 'id'),
    accountsReceivable: mergeList<AccountReceivable>(existing.accountsReceivable, incoming.accountsReceivable, 'id'),
    accountsPayable: mergeList<AccountPayable>(existing.accountsPayable, incoming.accountsPayable, 'id'),
    financialTransactions: mergeList<FinancialTransaction>(existing.financialTransactions, incoming.financialTransactions, 'id'),
    paymentMethods: mergeList<PaymentMethodOption>(existing.paymentMethods, incoming.paymentMethods, 'id', 'type'),
    maintenanceLogs: mergeList<MaintenanceLog>(existing.maintenanceLogs, incoming.maintenanceLogs, 'id'),
    fiscalDocuments: mergeList<FiscalDocument>(existing.fiscalDocuments, incoming.fiscalDocuments, 'id'),
    boletos: mergeList<BoletoDocument>(existing.boletos, incoming.boletos, 'id'),
    sales: mergeList<CommercialSale>(existing.sales, incoming.sales, 'id'),
    goodsWithdrawals: mergeList<GoodsWithdrawalOrder>(existing.goodsWithdrawals, incoming.goodsWithdrawals, 'id'),
    carriers: mergeList<Carrier>(existing.carriers, incoming.carriers, 'id'),
    unitsOfMeasure: mergeList<UnitOfMeasure>(existing.unitsOfMeasure, incoming.unitsOfMeasure, 'id', 'acronym'),
    interBranchSales: mergeList<InterBranchSaleLogistics>(existing.interBranchSales, incoming.interBranchSales, 'id'),
    stockMovements: mergeList<StockMovement>(existing.stockMovements, incoming.stockMovements, 'id'),
    notifications: mergeList<SystemNotification>(existing.notifications, incoming.notifications, 'id'),
    testCases: mergeList<TestCase>(existing.testCases, incoming.testCases, 'id'),
    taxOperationNatures: mergeList<TaxOperationNature>(existing.taxOperationNatures, incoming.taxOperationNatures, 'id', 'code'),
    taxRules: mergeList<TaxRule>(existing.taxRules, incoming.taxRules, 'id'),
    xmlImportRecords: mergeList<XmlImportRecord>(existing.xmlImportRecords, incoming.xmlImportRecords, 'id'),
    globalModules: { ...(existing.globalModules || {}), ...(incoming.globalModules || {}) },
    alertSettings: (incoming.alertSettings || existing.alertSettings) ? { ...(existing.alertSettings || {}), ...(incoming.alertSettings || {}) } as any : undefined,
    sefazConfig: (incoming.sefazConfig || existing.sefazConfig) ? { ...(existing.sefazConfig || {}), ...(incoming.sefazConfig || {}) } as any : undefined,
    landingContent: incoming.landingContent || existing.landingContent,
  };
}
