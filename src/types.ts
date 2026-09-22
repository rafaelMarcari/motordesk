export type UserRole = 'admin' | 'gerente' | 'mecanico' | 'atendente' | 'financeiro' | 'qa' | 'estoquista' | 'vendedor' | string;

export type BusinessType = 'OFICINA' | 'COMERCIO' | 'INDUSTRIA' | 'OFICINA_COMERCIO';

export type ViewID =
  | 'dashboard'
  | 'sales'
  | 'withdrawals'
  | 'carriers'
  | 'clients'
  | 'vehicles'
  | 'parts'
  | 'units_of_measure'
  | 'services'
  | 'budgets'
  | 'serviceOrders'
  | 'industry'
  | 'history'
  | 'reports'
  | 'quotations'
  | 'accounts_receivable'
  | 'accounts_payable'
  | 'financial'
  | 'fiscal'
  | 'fiscal_conference'
  | 'fiscal_xml_extraction'
  | 'fiscal_xml'
  | 'tax_obligations'
  | 'representative_commerce'
  | 'representative_orders'
  | 'representative_reconciliation'
  | 'notifications_engine'
  | 'notification_engine'
  | 'users'
  | 'access_groups'
  | 'qa_panel'
  | 'data_migration'
  | 'commercial'
  | 'commercial_marketing'
  | 'commercial_budgets'
  | 'commercial_orders'
  | 'commercial_backlog'
  | 'commercial_after_sales'
  | 'commercial_reports'
  | 'engineering'
  | 'engineering_products'
  | 'technical_datasheet'
  | 'revision_control'
  | 'profile'
  | string;

export interface UserPermissions {
  accessDashboard?: boolean;
  exportDashboard?: boolean;
  accessNotifications?: boolean;
  accessSales?: boolean;
  salesCreate?: boolean;
  salesCancel?: boolean;
  restrictToOwnSales?: boolean;
  accessWithdrawals?: boolean;
  accessCarriers?: boolean;
  carriersCreate?: boolean;
  carriersEdit?: boolean;
  carriersDelete?: boolean;
  accessBudgets?: boolean;
  budgetsCreate?: boolean;
  budgetsEdit?: boolean;
  budgetsApprove?: boolean;
  budgetsCancel?: boolean;
  budgetsApplyDiscount?: boolean;
  canEditBudgets?: boolean;
  accessServiceOrders?: boolean;
  serviceOrdersCreate?: boolean;
  serviceOrdersEdit?: boolean;
  serviceOrdersComplete?: boolean;
  serviceOrdersCancel?: boolean;
  serviceOrdersReopen?: boolean;
  serviceOrdersAssignMechanic?: boolean;
  accessClients?: boolean;
  clientsCreate?: boolean;
  clientsEdit?: boolean;
  clientsDelete?: boolean;
  accessVehicles?: boolean;
  vehiclesCreate?: boolean;
  vehiclesEdit?: boolean;
  vehiclesDelete?: boolean;
  accessServices?: boolean;
  servicesCreate?: boolean;
  servicesEdit?: boolean;
  servicesDelete?: boolean;
  canCustomizePdf?: boolean;
  accessParts?: boolean;
  partsCreate?: boolean;
  partsEdit?: boolean;
  partsDelete?: boolean;
  partsImportXml?: boolean;
  partsAdjustStock?: boolean;
  accessUnitsOfMeasure?: boolean;
  unitsOfMeasureCreate?: boolean;
  unitsOfMeasureEdit?: boolean;
  canViewOtherStoresStock?: boolean;
  canSellOtherStoresStock?: boolean;
  accessQuotations?: boolean;
  quotationsCreate?: boolean;
  quotationsApprove?: boolean;
  accessPurchasing?: boolean;
  accessPurchasingOrders?: boolean;
  accessPurchasingApprove?: boolean;
  accessStockReports?: boolean;
  accessFiscal?: boolean;
  fiscalView?: boolean;
  fiscalConference?: boolean;
  fiscalEmit?: boolean;
  fiscalTransmit?: boolean;
  fiscalCancel?: boolean;
  fiscalInutilize?: boolean;
  fiscalGenerateGuides?: boolean;
  fiscalCancelGuides?: boolean;
  accessTaxObligationsReport?: boolean;
  fiscalXml?: boolean;
  fiscalReprint?: boolean;
  fiscalConfig?: boolean;
  accessAccountsReceivable?: boolean;
  accountsReceivableCreate?: boolean;
  accountsReceivableSettle?: boolean;
  accountsReceivableCancel?: boolean;
  accountsReceivableGenerateBoleto?: boolean;
  accessAccountsPayable?: boolean;
  accountsPayableCreate?: boolean;
  accountsPayableSettle?: boolean;
  accountsPayableCancel?: boolean;
  accountsPayableImportXml?: boolean;
  accessPriceCalculation?: boolean;
  accessRepresentativeOrders?: boolean;
  accessRepresentativeCommerce?: boolean;
  accessFiscalXml?: boolean;
  accessFiscalConference?: boolean;
  accessTaxObligations?: boolean;
  accessBackup?: boolean;
  accessFinancial?: boolean;
  financialExport?: boolean;
  accessBoletos?: boolean;
  boletoGenerate?: boolean;
  financialBillingClosing?: boolean;
  financialReopenClosing?: boolean;
  financialReconciliation?: boolean;
  financialUnreconcile?: boolean;
  authorizeCreditLimitBypass?: boolean;
  accessFinancialReports?: boolean;
  accessUserManagement?: boolean;
  accessAccessGroups?: boolean;
  accessGroupsCreate?: boolean;
  accessGroupsEdit?: boolean;
  accessGroupsDelete?: boolean;
  accessHistory?: boolean;
  historyExport?: boolean;
  canViewAllCompaniesHistory?: boolean;
  accessReports?: boolean;
  reportsExport?: boolean;
  accessQAPanel?: boolean;
  accessIndustrialDashboard?: boolean;
  accessProduction?: boolean;
  accessManufacturing?: boolean;
  accessProductionOrders?: boolean;
  accessBillOfMaterials?: boolean;
  accessProductStructure?: boolean;
  createProductStructure?: boolean;
  editProductStructure?: boolean;
  approveProductStructure?: boolean;
  accessIndustrialStock?: boolean;
  accessIndustrialPurchasing?: boolean;
  accessIndustrialCosts?: boolean;
  accessLots?: boolean;
  accessProductionReports?: boolean;
  accessIndustrialReports?: boolean;
  accessCommercialReports?: boolean;
  accessMaintenance?: boolean;
  createMaintenance?: boolean;
  editMaintenance?: boolean;
  approveMaintenance?: boolean;
  accessEquipment?: boolean;
  accessIndustrialAudit?: boolean;
  productionOrderCreate?: boolean;
  productionOrderEdit?: boolean;
  productionOrderApprove?: boolean;
  productionOrderCancel?: boolean;
  productionOrderComplete?: boolean;
  bomCreate?: boolean;
  bomEdit?: boolean;
  accessNotificationEngine?: boolean;
  notificationTemplatesEdit?: boolean;
  notificationRulesEdit?: boolean;
  notificationSendManual?: boolean;
  accessRepresentativeCommerce?: boolean;
  accessRepresentativeOrders?: boolean;
  representativeOrdersCreate?: boolean;
  representativeOrdersEdit?: boolean;
  representativeOrdersCancel?: boolean;
  representativeOrdersExport?: boolean;
  representativeReconcile?: boolean;
  representativeCommissionsManage?: boolean;
  [key: string]: boolean | undefined;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  companyId: string;
  active?: boolean;
  permissions: UserPermissions;
  groupId?: string;
  accessGroupId?: string;
  individualExceptions?: Partial<UserPermissions>;
  customPermissions?: Partial<UserPermissions>;
  allowedScreens?: string[];
  deniedScreens?: string[];
  allowedCompanyIds?: string[];
  [key: string]: any;
}

export interface AccessGroup {
  id: string;
  name: string;
  companyId?: string;
  active?: boolean;
  permissions: Partial<UserPermissions>;
  [key: string]: any;
}

export interface CompanyInfo {
  id: string;
  tradeName?: string;
  corporateName?: string;
  cnpj?: string;
  businessType?: BusinessType | string;
  subscriptionStatus?: 'active' | 'blocked' | 'overdue' | string;
  paymentStatus?: 'paid' | 'overdue' | string;
  expirationDate?: string;
  globalModules?: Record<string, boolean>;
  contractModules?: Record<string, any>;
  modules?: Record<string, any>;
  enableRepresentativeCommerce?: boolean;
  enableWithdrawalAndDelivery?: boolean;
  userLimit?: number;
  [key: string]: any;
}

export interface OperationalAlcada {
  maxDiscountPercent: number;
  maxPurchaseApprovalAmount: number;
  maxCreditBypassAmount: number;
  maxAccountsPayableSettleAmount: number;
  canCancelInvoices: boolean;
  canReopenServiceOrders: boolean;
  canReopenFinancialClosings: boolean;
  canBypassCreditLimit: boolean;
}

export interface HistoryEntry {
  id: string;
  date: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  clientId?: string;
  vehicleId?: string;
  companyId: string;
  userId: string;
  userName: string;
  action?: string;
  justification?: string;
  targetRecordId?: string;
  previousValue?: any;
  newValue?: any;
}

export interface FiscalDocument {
  id: string;
  companyId: string;
  model: string; // '55', '65', '57'
  series: string;
  number: string;
  accessKey: string;
  issueDate: string;
  xmlContent?: string;
  totalAmount: number;
  status: 'authorized' | 'canceled' | 'rejected' | 'pending';
  clientName?: string;
  clientCnpjCpf?: string;
  cStat?: string;
  xMotivo?: string;
  protocolNumber?: string;
  saleId?: string;
  [key: string]: any;
}

export interface PendingPriceRevisionItem {
  id: string;
  partId?: string;
  code: string;
  name: string;
  ncm?: string;
  cest?: string;
  unit: string;
  quantity: number;
  nfeNumber: string;
  series?: string;
  accessKey?: string;
  supplierName: string;
  supplierCnpj?: string;
  importedAt: string;
  oldCostPrice: number;
  newCostPrice: number;
  oldSalePrice: number;
  suggestedSalePrice: number;
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  appliedMarkupPct?: number;
  newSalePrice?: number;
  newWholesalePrice?: number;
  notes?: string;
  companyId?: string;
  [key: string]: any;
}

export interface PriceChangeHistoryRecord {
  id: string;
  revisionId?: string;
  partId?: string;
  code: string;
  name: string;
  nfeNumber: string;
  series?: string;
  accessKey?: string;
  supplierName: string;
  supplierCnpj?: string;
  changedAt: string;
  userId: string;
  userName: string;
  userRole?: string;
  oldCostPrice: number;
  newCostPrice: number;
  oldSalePrice: number;
  newSalePrice: number;
  oldWholesalePrice?: number;
  newWholesalePrice?: number;
  appliedMarkupPct: number;
  reason: string; // Ex: "Devido à entrada da Nota Fiscal nº 1042 do fornecedor Auto Peças Brasil Ltda"
  notes?: string;
  companyId?: string;
  [key: string]: any;
}

export interface AppDatabase {
  users?: User[];
  registeredCompanies?: CompanyInfo[];
  companyInfo?: CompanyInfo;
  accessGroups?: AccessGroup[];
  sales?: any[];
  goodsWithdrawals?: any[];
  parts?: any[];
  services?: any[];
  budgets?: any[];
  serviceOrders?: any[];
  carriers?: any[];
  clients?: any[];
  vehicles?: any[];
  fiscalDocuments?: FiscalDocument[];
  pendingPriceRevisions?: PendingPriceRevisionItem[];
  priceChangeHistory?: PriceChangeHistoryRecord[];
  representativeOrders?: any[];
  representedCompanies?: any[];
  representativeReconciliations?: any[];
  solidworksProjects?: any[];
  productionOrders?: any[];
  boms?: any[];
  materialSeparations?: any[];
  financialTransactions?: any[];
  accountsReceivable?: any[];
  accountsPayable?: any[];
  [key: string]: any;
}
