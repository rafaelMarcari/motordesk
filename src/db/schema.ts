import { pgTable, text, timestamp, integer, serial, jsonb, boolean, real } from 'drizzle-orm/pg-core';

// Main KV / App database state store in PostgreSQL
export const appStore = pgTable('app_store', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table with Firebase UID support
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(),
  username: text('username').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  passwordHash: text('password_hash'),
  companyId: text('company_id'),
  permissions: jsonb('permissions').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Clients table
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cpf: text('cpf').notNull(),
  cpfCnpj: text('cpf_cnpj'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  companyId: text('company_id'),
  maxCreditLimit: real('max_credit_limit'),
  currentDebt: real('current_debt'),
  paymentModeOverride: text('payment_mode_override'),
  depositPercentageOverride: real('deposit_percentage_override'),
  stateRegistration: text('state_registration'),
  indicadorIe: text('indicador_ie'),
  isConsumidorFinal: boolean('is_consumidor_final'),
  ibgeCityCode: text('ibge_city_code'),
  uf: text('uf'),
  createdAt: text('created_at'),
});

// Vehicles table
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  plate: text('plate').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  color: text('color'),
  companyId: text('company_id'),
  currentKm: integer('current_km'),
  km: integer('km'),
  createdAt: text('created_at'),
});

// Parts table
export const parts = pgTable('parts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  stock: integer('stock').notNull().default(0),
  price: real('price').notNull().default(0),
  companyId: text('company_id'),
  costPrice: real('cost_price'),
  minStock: integer('min_stock'),
  category: text('category'),
  location: text('location'),
  unit: text('unit'),
  lastSupplier: text('last_supplier'),
  isPeriodic: boolean('is_periodic'),
  maintenanceControl: jsonb('maintenance_control'),
  isCrossSell: boolean('is_cross_sell'),
  crossSellItems: jsonb('cross_sell_items'),
  ncm: text('ncm'),
  cest: text('cest'),
  origem: text('origem'),
  icmsCstOrCsosn: text('icms_cst_or_csosn'),
  pisCst: text('pis_cst'),
  cofinsCst: text('cofins_cst'),
  ipiCst: text('ipi_cst'),
  icmsRatePercent: real('icms_rate_percent'),
  pisRatePercent: real('pis_rate_percent'),
  cofinsRatePercent: real('cofins_rate_percent'),
  ipiRatePercent: real('ipi_rate_percent'),
  fcpRatePercent: real('fcp_rate_percent'),
});

// Service Orders table
export const serviceOrders = pgTable('service_orders', {
  id: text('id').primaryKey(),
  budgetId: text('budget_id'),
  clientId: text('client_id').notNull(),
  vehicleId: text('vehicle_id').notNull(),
  mechanicId: text('mechanic_id'),
  companyId: text('company_id'),
  createdAt: text('created_at'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  serviceDate: text('service_date'),
  nextDueDate: text('next_due_date'),
  nextDueKm: integer('next_due_km'),
  status: text('status').notNull(),
  completionType: text('completion_type'),
  mechanicClosureNotes: text('mechanic_closure_notes'),
  paymentStatus: text('payment_status'),
  technicalRecommendations: text('technical_recommendations'),
  items: jsonb('items'),
  notes: text('notes'),
  customerComplaint: text('customer_complaint'),
  workshopStatus: text('workshop_status'),
  pauseReason: text('pause_reason'),
  workshopStatusUpdatedAt: text('workshop_status_updated_at'),
  paymentRequirementMode: text('payment_requirement_mode'),
  requiredDepositAmount: real('required_deposit_amount'),
  depositPaidAmount: real('deposit_paid_amount'),
  isDepositPaid: boolean('is_deposit_paid'),
});

// Budgets table
export const budgets = pgTable('budgets', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  vehicleId: text('vehicle_id').notNull(),
  companyId: text('company_id'),
  validityDays: integer('validity_days'),
  createdAt: text('created_at'),
  items: jsonb('items'),
  status: text('status').notNull(),
  notes: text('notes'),
  customerComplaint: text('customer_complaint'),
});

// Companies table
export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tradeName: text('trade_name'),
  cnpj: text('cnpj').notNull(),
  businessType: text('business_type').default('OFICINA'),
  modules: jsonb('modules'),
  companyType: text('company_type'),
  parentMatrizId: text('parent_matriz_id'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  address: text('address'),
  logoUrl: text('logo_url'),
  welcomeMessage: text('welcome_message'),
  registeredAt: text('registered_at'),
  subscriptionStatus: text('subscription_status'),
  startDate: text('start_date'),
  expirationDate: text('expiration_date'),
  monthlyFee: real('monthly_fee'),
  paymentStatus: text('payment_status'),
  lastPaymentDate: text('last_payment_date'),
  legalRepresentativeName: text('legal_representative_name'),
  legalRepresentativeCpf: text('legal_representative_cpf'),
  userLimit: integer('user_limit').default(5),
  additionalUserPrice: real('additional_user_price').default(29.90),
  globalModules: jsonb('global_modules'),
  contractModules: jsonb('contract_modules'),
  notes: text('notes'),
});

// Sales table (Commercial sales)
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  clientId: text('client_id').notNull(),
  clientName: text('client_name').notNull(),
  clientCpfCnpj: text('client_cpf_cnpj'),
  companyId: text('company_id').notNull(),
  createdAt: text('created_at').notNull(),
  items: jsonb('items').notNull(),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull(),
  totalAmount: real('total_amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull(),
  installmentsCount: integer('installments_count'),
  receivableId: text('receivable_id'),
  fiscalDocumentId: text('fiscal_document_id'),
  fiscalAccessKey: text('fiscal_access_key'),
  notes: text('notes'),
  createdBy: text('created_by'),
});

// Accounts Receivable table
export const accountsReceivable = pgTable('accounts_receivable', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  clientId: text('client_id').notNull(),
  clientName: text('client_name').notNull(),
  companyId: text('company_id'),
  serviceOrderId: text('service_order_id'),
  title: text('title').notNull(),
  totalAmount: real('total_amount').notNull(),
  paidAmount: real('paid_amount').notNull(),
  remainingAmount: real('remaining_amount').notNull(),
  status: text('status').notNull(),
  dueDate: text('due_date'),
  createdAt: text('created_at'),
  installments: jsonb('installments'),
});

