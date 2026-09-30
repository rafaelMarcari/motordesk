import { AppDatabase } from '../data/mockData';

export function mergeDatabases(localDb: AppDatabase, remoteDb: AppDatabase): AppDatabase {
  if (!localDb) return remoteDb;
  if (!remoteDb) return localDb;

  return {
    ...localDb,
    ...remoteDb,
    companyInfo: remoteDb.companyInfo || localDb.companyInfo,
    registeredCompanies: (remoteDb.registeredCompanies && remoteDb.registeredCompanies.length > 0)
      ? remoteDb.registeredCompanies
      : localDb.registeredCompanies,
    users: (remoteDb.users && remoteDb.users.length > 0)
      ? remoteDb.users
      : localDb.users,
    clients: (remoteDb.clients && remoteDb.clients.length > 0)
      ? remoteDb.clients
      : localDb.clients,
    vehicles: (remoteDb.vehicles && remoteDb.vehicles.length > 0)
      ? remoteDb.vehicles
      : localDb.vehicles,
    parts: (remoteDb.parts && remoteDb.parts.length > 0)
      ? remoteDb.parts
      : localDb.parts,
    services: (remoteDb.services && remoteDb.services.length > 0)
      ? remoteDb.services
      : localDb.services,
    budgets: (remoteDb.budgets && remoteDb.budgets.length > 0)
      ? remoteDb.budgets
      : localDb.budgets,
    serviceOrders: (remoteDb.serviceOrders && remoteDb.serviceOrders.length > 0)
      ? remoteDb.serviceOrders
      : localDb.serviceOrders,
    sales: (remoteDb.sales && remoteDb.sales.length > 0)
      ? remoteDb.sales
      : localDb.sales,
    history: (remoteDb.history && remoteDb.history.length > 0)
      ? remoteDb.history
      : localDb.history,
    notifications: (remoteDb.notifications && remoteDb.notifications.length > 0)
      ? remoteDb.notifications
      : localDb.notifications,
    accountsReceivable: (remoteDb.accountsReceivable && remoteDb.accountsReceivable.length > 0)
      ? remoteDb.accountsReceivable
      : localDb.accountsReceivable,
    accountsPayable: (remoteDb.accountsPayable && remoteDb.accountsPayable.length > 0)
      ? remoteDb.accountsPayable
      : localDb.accountsPayable,
    financialTransactions: (remoteDb.financialTransactions && remoteDb.financialTransactions.length > 0)
      ? remoteDb.financialTransactions
      : localDb.financialTransactions,
  };
}
