/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemNotification {
  id: string;
  type: 'stock_low' | 'budget_created' | 'service_order_created' | 'budget_converted' | 'stock_expired' | 'credit_limit_exceeded' | 'price_approval_required' | 'os_closed_by_mechanic' | 'receivable_due' | 'payable_due' | 'sale_created' | 'budget_converted_to_sale' | 'system';
  title: string;
  message: string;
  date: string;
  read: boolean;
  companyId?: string;
  metadata?: {
    partId?: string;
    partName?: string;
    budgetId?: string;
    serviceOrderId?: string;
    saleId?: string;
    conversionType?: 'TOTAL' | 'PARCIAL';
    completionType?: 'TOTAL' | 'PARCIAL';
    itemsCount?: number;
    totalItemsCount?: number;
    availableStock?: number;
    minStock?: number;
    releasedItemsCount?: number;
    clientId?: string;
    clientName?: string;
    supplierId?: string;
    supplierName?: string;
    creditLimit?: number;
    currentDebt?: number;
    attemptedAmount?: number;
    receivableId?: string;
    payableId?: string;
    amount?: number;
    dueDate?: string;
    daysDiff?: number;
    originalPrice?: number;
    newPrice?: number;
    priceDifference?: number;
    itemId?: string;
    itemName?: string;
    approvalRequestId?: string;
    mechanicName?: string;
  };
}

export type PaymentRequirementMode = 'AFTER_COMPLETION' | 'ADVANCE_DEPOSIT' | 'FULL_ADVANCE';

export interface AlertSettings {
  enableLowStockAlerts: boolean; // Alerta de estoque baixo
  enableBudgetCreatedAlerts: boolean; // Alerta quando um orçamento é feito
  enableServiceOrderCreatedAlerts: boolean; // Alerta quando uma OS é feita (Oficina)
  enableSalesCreatedAlerts?: boolean; // Alerta quando uma nova venda balcão é feita (Comércio)
  enableBudgetConvertedAlerts: boolean; // Alerta quando orçamento vira OS (Oficina)
  enableBudgetConvertedToSaleAlerts?: boolean; // Alerta quando orçamento vira Venda Balcão (Comércio)
  enableStockReservedExpirationAlerts: boolean; // Alerta quando os itens de um orçamento expirado voltam ao estoque
  defaultBudgetValidityDays: number; // Prazo padrão de validade de orçamentos (ex: 10 dias)

  // Política / Regra de Cobrança e Recebimento da Oficina / Comércio
  defaultPaymentRequirementMode?: PaymentRequirementMode; // 'AFTER_COMPLETION' (100% no encerramento) | 'ADVANCE_DEPOSIT' (Sinal %) | 'FULL_ADVANCE' (100% Antecipado)
  defaultDepositPercentage?: number; // % padrão de sinal/entrada (ex: 30%, 50%)
  requireDepositToExecuteOS?: boolean; // Bloquear/Alertar no semáforo se o sinal de entrada não foi pago antes de iniciar
  allowPerClientPaymentOverride?: boolean; // Permite regra de pagamento customizada por cliente

  // Alertas Financeiros, de Compras e Estoque Gerencial
  enableReceivableDueAlerts?: boolean; // Alerta de contas a receber a vencer
  receivableDueNoticeDays?: number; // Dias de antecedência (padrão: 3 dias)
  enablePayableDueAlerts?: boolean; // Alerta de contas a pagar a vencer
  payableDueNoticeDays?: number; // Dias de antecedência (padrão: 5 dias)
  showFinancialAlertsOnDashboard?: boolean; // Exibir avisos de vencimento no Dashboard
  showFinancialAlertsInModule?: boolean; // Exibir banners nos módulos financeiro e contas a pagar/receber
  financialAlertFrequency?: 'daily' | 'realtime' | 'always'; // Frequência da verificação
  enableDormantStockAlerts?: boolean; // Alerta de produtos sem movimentação (capital parado)
  dormantStockDaysThreshold?: number; // Limite de dias sem giro (ex: 30, 60, 90, 180, 365)
  enableCostIncreaseAlerts?: boolean; // Alerta de aumento significativo no custo de aquisição
  costIncreaseThresholdPercent?: number; // % de variação para disparar alerta (ex: 10%)
  enableCreditLimitAlerts?: boolean; // Alerta de limite de crédito excedido em vendas a prazo
}

export type UserRole = 'admin' | 'gerente' | 'consultor' | 'atendente' | 'mecanico' | 'estoquista' | 'financeiro' | 'qa';

export type BusinessType = "OFICINA" | "COMERCIO" | "INDUSTRIA" | "OFICINA_COMERCIO" | "SERVICOS" | "OUTROS";

export type UnitCategory = 'QUANTIDADE' | 'COMPRIMENTO' | 'AREA' | 'VOLUME' | 'MASSA' | 'TEMPO' | 'OUTROS';

export type UnitCalculationType = 'SIMPLES' | 'LINEAR' | 'AREA' | 'VOLUME';

export interface ItemDimensionData {
  calculationType: UnitCalculationType;
  length?: number;
  width?: number;
  height?: number;
  unitLength?: string;
  unitWidth?: string;
  unitHeight?: string;
  piecesCount?: number;
  unitAcronym?: string;
  calculatedQuantity?: number;
  formulaDescription?: string;
}

export interface UnitOfMeasure {
  id: string;
  name: string; // Ex: Metro quadrado, Quilograma, Unidade
  acronym: string; // Ex: M², KG, UN, L, M³
  code?: string; // Código/Sigla
  category: UnitCategory; // QUANTIDADE, AREA, VOLUME, etc.
  calculationType: UnitCalculationType; // SIMPLES, LINEAR, AREA, VOLUME
  conversionFactor?: number; // Fator multiplicador em relação à unidade base (padrão: 1.0)
  decimalPlaces: number; // 0 a 4 (ex: UN -> 0, KG -> 3, M² -> 3, M³ -> 3)
  active: boolean;
  isGlobal?: boolean; // Unidade padrão do sistema (disponível a todos) ou criada pela empresa
  companyId?: string; // ID da empresa proprietária (se personalizada)
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ViewID = 
  | 'dashboard' 
  | 'sales'
  | 'withdrawals'
  | 'fiscal_conference'
  | 'carriers'
  | 'units_of_measure'
  | 'clients' 
  | 'vehicles' 
  | 'parts' 
  | 'quotations'
  | 'accounts_receivable'
  | 'accounts_payable'
  | 'financial'
  | 'fiscal'
  | 'tax_obligations'
  | 'access_groups'
  | 'notifications_engine'
  | 'representative_commerce'
  | 'services' 
  | 'budgets' 
  | 'serviceOrders' 
  | 'history' 
  | 'reports' 
  | 'users' 
  | 'profile' 
  | 'qa_panel'
  | 'data_migration'
  | 'industry';

export interface CompanyModules {
  sales: boolean;
  withdrawals?: boolean;
  serviceOrders: boolean;
  vehicles: boolean;
  inventory: boolean;
  financial: boolean;
  fiscal: boolean;
  billing: boolean;
  industry?: boolean;
  production?: boolean;
}

export function getDefaultModulesForBusinessType(type: BusinessType = "OFICINA"): CompanyModules {
  switch (type) {
    case "COMERCIO":
      return {
        sales: true,
        serviceOrders: false,
        vehicles: false,
        inventory: true,
        financial: true,
        fiscal: true,
        billing: true,
        industry: false,
        production: false,
      };
    case "INDUSTRIA":
      return {
        sales: true,
        serviceOrders: false,
        vehicles: false,
        inventory: true,
        financial: true,
        fiscal: true,
        billing: true,
        industry: true,
        production: true,
      };
    case "OFICINA":
    case "OFICINA_COMERCIO":
    default:
      return {
        sales: true,
        serviceOrders: true,
        vehicles: true,
        inventory: true,
        financial: true,
        fiscal: true,
        billing: true,
        industry: type === 'OFICINA_COMERCIO',
        production: type === 'OFICINA_COMERCIO',
      };
  }
}

/**
 * Interface para armazenar dados cadastrais da empresa/oficina contratante do MotorDesk.
 * Inclui canal oficial de WhatsApp, CNPJ e endereço para emissão de orçamentos e Ordens de Serviço.
 */
export interface CompanyInfo {
  id: string;
  name: string; // Nome Fantasia ou Razão Social da Oficina/Empresa
  tradeName?: string; // Nome Fantasia da Oficina/Empresa
  businessType?: BusinessType; // Segmento de negócio da empresa ("OFICINA", "COMERCIO", etc.)
  modules?: CompanyModules; // Módulos ativados/desativados para esta empresa
  cnpj: string; // CNPJ da Empresa
  phone: string; // Telefone Fixo de Contato
  whatsapp: string; // WhatsApp Oficial de Atendimento da Oficina (com DDD)
  email: string; // E-mail da Oficina
  address: string; // Endereço Completo
  city?: string;
  state?: string;
  logoUrl?: string; // URL da Logomarca (Opcional)
  welcomeMessage?: string; // Mensagem Padrão de Envio de Orçamentos
  registeredAt: string; // Data de Cadastro da Empresa
  
  // Matriz / Filial (Estrutura de Rede de Lojas)
  companyType?: 'matriz' | 'filial'; // Define se a empresa é Matriz (Sede) ou Filial
  parentMatrizId?: string; // ID da empresa Matriz vinculada (caso seja Filial)

  // Módulo SaaS & Assinatura de Licença
  subscriptionStatus?: 'active' | 'blocked' | 'overdue' | 'trial';
  startDate?: string; // Data de Início do Uso (YYYY-MM-DD)
  expirationDate?: string; // Data de Término / Validade da Assinatura (YYYY-MM-DD)
  monthlyFee?: number; // Valor da Mensalidade (R$)
  lastPaymentDate?: string; // Data do Último Pagamento Realizado
  paymentStatus?: 'paid' | 'pending' | 'overdue'; // Status do Pagamento
  notes?: string; // Observações da Contratação

  // Responsável Legal & Contrato de Prestação de Serviços (SaaS) - CONTRATANTE (Cliente/Tenant)
  legalRepresentativeName?: string; // Nome do Responsável Legal / Proprietário conforme legislação
  legalRepresentativeCpf?: string; // CPF do Responsável Legal / Proprietário
  legalRepresentativeRg?: string; // RG do Responsável Legal / Proprietário
  legalRepresentativePhone?: string; // Telefone do Responsável Legal / Proprietário
  legalRepresentativeEmail?: string; // E-mail do Responsável Legal / Proprietário
  legalRepresentativeAddress?: string; // Endereço Completo do Responsável Legal / Proprietário
  signedContractUrl?: string; // Base64 ou URL do arquivo do Contrato Assinado
  signedContractFileName?: string; // Nome do Arquivo do Contrato Assinado
  signedContractDate?: string; // Data de Envio/Assinatura do Contrato Assinado
  contractStatus?: 'pending' | 'signed'; // Status do Contrato ('pending' | 'signed')

  // Dados da CONTRATADA (Fornecedor / Desenvolvedor / Contratado)
  providerCompanyName?: string; // Razão Social / Nome da Contratada
  providerCnpj?: string; // CNPJ da Contratada
  providerAddress?: string; // Endereço Completo da Contratada
  providerLegalRepName?: string; // Nome do Responsável Legal da Contratada
  providerLegalRepCpf?: string; // CPF do Responsável Legal da Contratada
  providerLegalRepRg?: string; // RG/Cargo do Responsável Legal da Contratada
  providerEmail?: string; // E-mail da Contratada
  providerPhone?: string; // Telefone/WhatsApp da Contratada

  // Precificação Modular do Plano e Módulos Opcionais
  basePlanFee?: number; // Preço Base do Plano Básico de Funcionamento (R$)
  customNegotiatedDiscount?: number; // Desconto Negociado / Ajuste (R$)
  optionalModulePrices?: { [key: string]: number }; // Tabela de Preços Personalizada por Módulo Opcional

  // Suporte Técnico & Canais de Atendimento
  supportWhatsapp?: string; // Número do WhatsApp do Suporte Técnico (com DDD)
  supportBusinessHours?: string; // Período Comercial de Atendimento (ex: Seg a Sex 08h-18h, Sáb 08h-12h)
  supportChannelsText?: string; // Descrição dos Canais (WhatsApp, Telefone, Teams, Meet)

  // Histórico de Aditivos Contratuais (Inclusão/Alteração de Módulos)
  contractAddendums?: Array<{
    id: string;
    date: string;
    addedModules: string[]; // Lista de chaves dos módulos adicionados neste aditivo
    addedModuleNames?: string[]; // Nomes dos módulos adicionados
    previousMonthlyFee: number;
    additionalMonthlyFee: number;
    newTotalMonthlyFee: number;
    notes?: string;
    signedByClient?: boolean;
    signedDate?: string;
  }>;

  // Matriz de Liberação de Módulos por Perfil para esta Empresa
  levelPermissions?: { [key in UserRole]?: UserPermissions };
  // Liberação / Bloqueio Global de Módulos desta Empresa
  globalModules?: { [key: string]: boolean };

  // CONFIGURAÇÃO DE ORIENTAÇÃO DE IMPRESSÃO DE RELATÓRIOS (QA CONTROLLED)
  reportPageOrientation?: 'portrait' | 'landscape_2ways'; // 'portrait' (Retrato 1 Via) ou 'landscape_2ways' (Paisagem 2 Vias Iguais na mesma página)
  reportCustomOrientations?: {
    budget?: 'portrait' | 'landscape_2ways';
    service_order?: 'portrait' | 'landscape_2ways';
    sale?: 'portrait' | 'landscape_2ways';
    receipt?: 'portrait' | 'landscape_2ways';
  };

  // CONFIGURAÇÃO BANCÁRIA, BOLETOS E PIX
  bankBoletoConfig?: BankBoletoConfig;
  pixConfig?: PixConfig;

  // DADOS FISCAIS DO EMITENTE (ARQUITETURA MOTOR DESK FISCAL)
  stateRegistration?: string; // Inscrição Estadual (IE)
  cityRegistration?: string;  // Inscrição Municipal (IM)
  cnaeCode?: string;         // CNAE Principal (Ex: 4520-0/01 Oficina Mecânica)
  crt?: '1' | '2' | '3';      // CRT: 1-Simples Nacional, 2-Simples Excesso, 3-Lucro Presumido/Real
  taxRegime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  taxRegimeLabel?: string;    // Rótulo amigável do regime tributário
  ibgeCityCode?: string;     // Código do Município IBGE (Ex: 3550308)
  uf?: string;               // Sigla do Estado (Ex: SP, RJ, MG)
  bacenCountryCode?: string; // Código do País BACEN (Ex: 1058 - Brasil)
  
  // CERTIFICADO DIGITAL & AMBIENTE SEFAZ
  certificateType?: 'A1' | 'A3';
  certificateExpirationDate?: string;
  certificateFileName?: string;
  sefazEnvironment?: 'homologation' | 'production';

  // SEQUÊNCIAS DE NUMERAÇÃO DE DOCUMENTOS FISCAIS
  nfeSeries?: string;
  nextNfeNumber?: number;
  nfseSeries?: string;
  nextNfseNumber?: number;
  nfceSeries?: string;
  nextNfceNumber?: number;

  // Configuração Fiscal Isolada por Empresa
  sefazConfig?: SefazApiConfig;

  // Habilitação e Modelos Fiscais
  habilitarNfce?: boolean;
  habilitarNfe?: boolean;
  habilitarNfse?: boolean;
  defaultFiscalModel?: 'nfce' | 'nfe' | 'none';
  exigirFiscalConference?: boolean; // Se true, vendas vão para a Fila de Conferência Fiscal antes da transmissão
  requireAuthorizedFiscalBeforeRelease?: boolean; // Se true, bloqueia saída física na retirada/expedição se nota não estiver autorizada

  // Configuração de Reserva de Estoque em Orçamentos
  budgetStockReservationMode?: 'none' | 'reserve_while_valid'; // Opção A: none, Opção B: reserve_while_valid
  budgetStockReservationValidityDays?: number; // 1, 3, 5, 7, 10, 15, 30 ou personalizado

  // Módulo de Logística, Retirada e Entrega por Empresa
  enableWithdrawalAndDelivery?: boolean; // Habilita esteira de picking, separação e romaneios de entrega

  // Operação Multiloja / Rede
  enableInterStoreSales?: boolean; // Permite venda de produtos pertencentes a outra loja/filial
  interStorePaymentMode?: 'PURCHASE_STORE_ONLY' | 'FULFILLMENT_STORE_ONLY' | 'BOTH';
  interStoreFulfillmentMode?: 'pickup_at_stock_store' | 'transfer_to_origin_store' | 'allow_customer_choice';

  // Taxa de Implantação e Treinamento do Sistema
  hasImplementationFee?: boolean; // Se true, foi cobrada taxa de implantação/treinamento
  implementationFee?: number; // Valor negociado da taxa de implantação (R$)

  // Comércio Representante / Representação Comercial
  enableRepresentativeCommerce?: boolean; // Habilita fluxo comercial para representantes (Fábricas, Pedidos, Conferência, Comissões)
}

export interface UserPermissions {
  accessDashboard: boolean;
  accessClients: boolean;
  accessVehicles: boolean;
  accessParts: boolean;
  accessServices: boolean;
  accessBudgets: boolean;
  accessServiceOrders: boolean;
  accessHistory: boolean;
  accessReports: boolean;
  accessUserManagement: boolean;
  accessQAPanel: boolean;
  accessSales?: boolean;
  accessWithdrawals?: boolean;
  accessCarriers?: boolean;
  accessQuotations?: boolean;
  accessNotifications?: boolean;
  accessAccountsReceivable?: boolean;
  accessAccountsPayable?: boolean;
  accessFinancial?: boolean;
  accessFiscal?: boolean;

  // Permissões Específicas Fiscais / NFC-e / NF-e
  nfceView?: boolean;
  nfceEmit?: boolean;
  nfceCancel?: boolean;
  nfceReprint?: boolean;
  nfceXml?: boolean;
  nfceConfig?: boolean;
  accessBoletos?: boolean;
  accessSefaz?: boolean;
  accessUnitsOfMeasure?: boolean; // Acesso ao módulo de Unidades de Medida
  unitsOfMeasureCreate?: boolean; // Permissão para cadastrar novas unidades de medida
  unitsOfMeasureEdit?: boolean; // Permissão para editar unidades existentes
  unitsOfMeasureToggleActive?: boolean; // Permissão para ativar/desativar unidades

  // Permissões Granulares - Módulo de Orçamentos
  budgetView?: boolean;
  budgetCreate?: boolean;
  budgetEdit?: boolean;
  budgetApprove?: boolean;
  budgetCancel?: boolean;
  budgetConvert?: boolean;
  budgetConfig?: boolean;

  // Permissões Granulares - Módulo Fiscal
  fiscalView?: boolean;
  fiscalConference?: boolean;
  fiscalEmit?: boolean;
  fiscalCancel?: boolean;
  fiscalConfig?: boolean;
  fiscalReprint?: boolean;
  fiscalXml?: boolean;

  // Permissões Granulares - Módulo Boletos
  boletoView?: boolean;
  boletoGenerate?: boolean;
  boletoReprint?: boolean;
  boletoConfig?: boolean;

  // Permissões Granulares - Módulo PIX
  pixView?: boolean;
  pixConfig?: boolean;
  pixGenerate?: boolean;

  // Permissões Granulares - Módulo SEFAZ / Certificado A1
  sefazView?: boolean;
  sefazTest?: boolean;
  sefazConfig?: boolean;

  // Permissões Granulares - Módulo Financeiro & Crédito
  financialView?: boolean;
  financialEntry?: boolean;
  financialConfig?: boolean;
  financialBillingClosing?: boolean; // Permite realizar fechamentos de faturamento consolidado
  financialReopenClosing?: boolean;  // Permite reabrir fechamento de faturamento consolidado
  financialReconciliation?: boolean; // Permite realizar e desfazer conciliação bancária
  financialUnreconcile?: boolean;    // Permite desfazer conciliações bancárias com justificativa
  authorizeCreditLimitBypass?: boolean; // Permite autorizar faturamento acima do limite de crédito
  accessBillingReports?: boolean; // Permite visualizar relatórios de vendas pendentes e faturamentos consolidados

  // Permissões Granulares - Relatórios Gerenciais & Operacionais
  accessFinancialReports?: boolean; // Permite visualizar relatórios financeiros (A Receber, A Pagar, Compromissos, Inadimplência)
  accessPurchasingReports?: boolean; // Permite visualizar relatórios de compras (Histórico, Peças Mais Usadas, Produto x Fornecedor, Fornecedores)
  accessStockReports?: boolean; // Permite visualizar relatórios de estoque (Posição, Reposição, Capital Parado)
  accessReportsExport?: boolean; // Permite exportar relatórios para PDF e CSV/Excel
  accessFinancialAlertsConfig?: boolean; // Permite configurar prazos e parâmetros de alertas financeiros

  // Permissões Granulares - Módulo Industrial (PCP, Produção, BOM, Lotes, Manutenção de Equipamentos, Compras)
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

  canEditBudgets?: boolean; // Permissão para editar orçamentos existentes (adicionar itens e alterar dados)
  canCustomizePdf?: boolean; // Permissão para personalizar e editar layout de campos no PDF
  canViewOtherStoresStock?: boolean; // Permissão para visualizar estoque de outras lojas/filiais da rede
  canSellOtherStoresStock?: boolean; // Permissão para realizar venda / OS com peças do estoque de outras lojas/filiais
  canViewAllCompaniesHistory?: boolean; // Permissão para visualizar histórico e auditoria de todas as empresas
  restrictToOwnSales?: boolean; // Se ativo (true), o vendedor/usuário só visualiza seus próprios pedidos de venda. Se inativo (false), visualiza todos os pedidos da empresa.

  // Permissões Granulares Fiscais Expandidas
  fiscalViewNfe?: boolean;
  fiscalCreateNfe?: boolean;
  fiscalEditNfe?: boolean;
  fiscalTransmit?: boolean;
  fiscalDownloadXml?: boolean;
  fiscalViewDanfe?: boolean;
  fiscalGenerateGuides?: boolean;
  fiscalCancelGuides?: boolean;
  fiscalConsultSefaz?: boolean;

  // Permissões Granulares de Compras e Estoque Expandidas
  accessPurchasing?: boolean;
  accessPurchasingViewStock?: boolean;
  accessPurchasingMinStock?: boolean;
  accessPurchasingQuotations?: boolean;
  accessPurchasingSuppliers?: boolean;
  accessPurchasingOrders?: boolean;
  accessPurchasingApprove?: boolean;

  // Permissões de Grupos de Acesso & Relatório de Obrigações
  accessTaxObligationsReport?: boolean;
  accessAccessGroups?: boolean;
  accessGroupsCreate?: boolean;
  accessGroupsEdit?: boolean;
  accessGroupsDelete?: boolean;

  // Granulares RBAC v2 Matrix (AGENTS.md)
  exportDashboard?: boolean;
  salesCreate?: boolean;
  salesCancel?: boolean;
  budgetsCreate?: boolean;
  budgetsEdit?: boolean;
  budgetsApprove?: boolean;
  budgetsCancel?: boolean;
  budgetsConvert?: boolean;
  budgetsApplyDiscount?: boolean;
  serviceOrdersCreate?: boolean;
  serviceOrdersEdit?: boolean;
  serviceOrdersComplete?: boolean;
  serviceOrdersCancel?: boolean;
  serviceOrdersReopen?: boolean;
  serviceOrdersAssignMechanic?: boolean;
  clientsCreate?: boolean;
  clientsEdit?: boolean;
  clientsDelete?: boolean;
  vehiclesCreate?: boolean;
  vehiclesEdit?: boolean;
  vehiclesDelete?: boolean;
  partsCreate?: boolean;
  partsEdit?: boolean;
  partsDelete?: boolean;
  partsImportXml?: boolean;
  partsAdjustStock?: boolean;
  fiscalInutilize?: boolean;
  financialExport?: boolean;
  accountsReceivableCreate?: boolean;
  accountsReceivableSettle?: boolean;
  accountsReceivableCancel?: boolean;
  accountsReceivableGenerateBoleto?: boolean;
  accountsReceivableReopen?: boolean;
  accountsPayableCreate?: boolean;
  accountsPayableSettle?: boolean;
  accountsPayableCancel?: boolean;
  accountsPayableImportXml?: boolean;
  carriersCreate?: boolean;
  carriersEdit?: boolean;
  carriersDelete?: boolean;
  reportsExport?: boolean;
  historyExport?: boolean;
  servicesCreate?: boolean;
  servicesEdit?: boolean;
  servicesDelete?: boolean;
  quotationsCreate?: boolean;
  quotationsApprove?: boolean;
  quotationsReject?: boolean;

  // Permissões Granulares - Módulo Motor Central de Notificações
  accessNotificationEngine?: boolean;
  accessNotificationsEngine?: boolean;
  notificationTemplatesEdit?: boolean;
  notificationRulesEdit?: boolean;
  notificationSendManual?: boolean;

  // Permissões Granulares - Módulo Comércio Representante
  accessRepresentativeCommerce?: boolean;
  representativeOrdersCreate?: boolean;
  representativeOrdersEdit?: boolean;
  representativeOrdersCancel?: boolean;
  representativeOrdersExport?: boolean;
  representativeReconcile?: boolean;
  representativeCommissionsManage?: boolean;
}

export interface OperationalAlcada {
  maxDiscountPercent?: number; // % máximo de desconto que o operador pode conceder sem alçada superior (ex: 5, 10, 15)
  maxPurchaseApprovalAmount?: number; // R$ valor máximo para aprovação de pedidos de compra/cotações
  maxCreditBypassAmount?: number; // R$ valor máximo de tolerância para liberação de venda com limite estourado
  maxAccountsPayableSettleAmount?: number; // R$ valor máximo para liquidação direta de título a pagar
  canCancelInvoices?: boolean; // Pode cancelar notas fiscais autorizadas na SEFAZ
  canReopenServiceOrders?: boolean; // Pode reabrir ordens de serviço concluídas/faturadas
  canReopenFinancialClosings?: boolean; // Pode estornar fechamentos financeiros consolidados
  canBypassCreditLimit?: boolean; // Pode autorizar pedidos com crédito bloqueado
}

export interface AccessGroup {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  description: string;
  active: boolean;
  isSystemDefault?: boolean;
  permissions: UserPermissions;
  alcadas?: OperationalAlcada;
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  color?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  passwordHash: string; // Storing as plaintext/simulated hash for simple demo settings
  permissions: UserPermissions;
  alcadas?: OperationalAlcada; // Alçadas operacionais diretas ou herdadas
  customAlcadas?: Partial<OperationalAlcada>; // Exceções individuais de alçadas
  companyId?: string; // ID da empresa/oficina à qual o usuário pertence
  groupId?: string; // ID do Grupo de Acesso vinculado
  accessGroupId?: string; // Compatibilidade de Grupo de Acesso
  groupName?: string; // Nome do Grupo de Acesso
  individualExceptions?: { [permissionKey: string]: boolean }; // Exceções individuais (override explícito de permissões)
  customPermissions?: Partial<UserPermissions>; // Permissões customizadas
  active?: boolean; // Status ativo do usuário (padrão true)
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  cpfCnpj?: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  companyId?: string;
  maxCreditLimit?: number; // Limite de Crédito Aprovado em R$
  currentDebt?: number; // Dívida Ativa Acumulada em R$
  paymentModeOverride?: 'DEFAULT' | 'AFTER_COMPLETION' | 'ADVANCE_DEPOSIT' | 'FULL_ADVANCE'; // Política de Pagamento para este cliente
  depositPercentageOverride?: number; // % de sinal específico deste cliente (ex: 20%, 30%, 50%)
  
  // ATRIBUTOS FISCAIS DO CLIENTE
  stateRegistration?: string; // Inscrição Estadual (IE)
  indicadorIe?: '1' | '2' | '9'; // 1-Contribuinte ICMS, 2-Isento, 9-Não Contribuinte
  isConsumidorFinal?: boolean; // Se é Consumidor Final (padrão true)
  ibgeCityCode?: string; // Código do Município IBGE
  uf?: string; // UF de destino (ex: SP, RJ, MG)

  // POLÍTICA DE FATURAMENTO E CONDIÇÕES DE PAGAMENTO DO CLIENTE
  billingPolicy?: 'PER_SALE' | 'CONSOLIDATED_PERIOD'; // 'PER_SALE' (Faturamento por venda) | 'CONSOLIDATED_PERIOD' (Faturamento consolidado por período)
  paymentConditionType?: 'A_VISTA' | 'A_PRAZO' | '7_DIAS' | '14_DIAS' | '21_DIAS' | '28_DIAS' | '30_DIAS' | '30_60' | '30_60_90' | 'CUSTOM';
  customPaymentTermsDays?: number[]; // Ex: [30, 60, 90] ou [7, 14]
  billingPeriodicity?: 'DIARIO' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'DATA_ESPECIFICA';
  billingClosingDay?: number; // Ex: dia 25 do mês ou dia da semana (5 = Sexta-feira)
  billingClosingDayOfWeek?: number; // 1 = Segunda, ..., 5 = Sexta
  billingClosingDayOfMonth?: number; // Ex: dia 30
  billingDueDaysAfter?: number; // Ex: 7 dias após o fechamento
  billingDueDayOfMonth?: number; // Ex: dia 10 do mês seguinte
  defaultPaymentMethod?: string;
  preferredPaymentMethod?: string; // Ex: 'Boleto Bancário', 'PIX', 'Transferência', 'Dinheiro', 'Cartão'
  blockIfOverdue?: boolean; // Bloquear novas vendas se tiver títulos vencidos
  notes?: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  plate: string; // Placa
  brand: string;
  model: string;
  year: number;
  color: string;
  createdAt: string;
  companyId?: string;
  currentKm?: number; // Quilometragem atual do veículo
  km?: number;
}

export interface CrossSellItem {
  id: string;
  type: 'service' | 'part';
  itemId: string;
  name: string;
  defaultQuantity: number;
}

export type ItemBusinessType = 'produto_acabado' | 'materia_prima' | 'componente' | 'insumo' | 'mercadoria_revenda' | 'peca_veicular';

export interface Part {
  id: string;
  name: string;
  code: string;
  stock: number;
  stockQuantity?: number; // Compatibilidade de saldo de estoque
  reservedStock?: number; // Saldo de estoque físico reservado por vendas pendentes de retirada/entrega
  separatedStock?: number; // Saldo em processo de separação física
  dispatchedStock?: number; // Saldo despachado
  deliveredStock?: number; // Saldo entregue
  inProductionStock?: number; // Saldo em processo de produção através de OPs abertas
  price: number; // Preço de Venda
  salePrice?: number; // Compatibilidade de Preço de Venda
  purchasePrice?: number; // Preço de compra compatível
  companyId?: string;
  costPrice?: number; // Preço de Custo / Compra
  minStock?: number; // Alerta de Estoque Mínimo
  category?: string; // Categoria (Freios, Suspensão, Óleos, Estrutura Metálica, Motorização, etc.)
  location?: string; // Localização no Galpão/Prateleira
  unit?: string; // Unidade de Medida Sigla (UN, CX, L, KG, M, M², M³)
  unitOfMeasure?: string; // Compatibilidade de Sigla da unidade
  unitOfMeasureId?: string; // Referência para a Unidade de Medida configurada
  unitName?: string; // Nome descritivo da unidade (ex: Metro Linear, Metro Quadrado)
  dimensions?: ItemDimensionData; // Dimensões para cálculo geométrico (comprimento, largura, altura)
  lastSupplier?: string; // Nome ou CNPJ do Fornecedor da NFe
  isPeriodic?: boolean; // Se o produto/peça é periódico (óleo, filtro, pneu, etc.)
  maintenanceControl?: ServiceMaintenanceControl;
  isCrossSell?: boolean; // Se possui venda casada (serviço ou produto vinculado)
  crossSellItems?: CrossSellItem[]; // Lista de itens casados automaticamente
  
  // PARÂMETROS INDUSTRIAIS (BOM / MANUFATURA)
  itemType?: ItemBusinessType; // Classificação do item na indústria
  unitCommercial?: string; // Unidade Comercial lida do XML (ex: CX, ROLO, CHAPA)
  unitTrib?: string; // Unidade Tributável do XML (ex: UN, KG)
  conversionFactorTrib?: number; // Fator de conversão uCom -> uTrib
  uomOrigin?: 'MANUAL' | 'NF_E_IMPORT' | 'SYSTEM'; // Origem do cadastro de unidade
  hasBom?: boolean; // Se é produto acabado com estrutura de composição
  bomId?: string; // ID da BOM ativa
  leadTimeDays?: number; // Prazo de fornecimento ou ciclo de produção em dias
  currentLotNumber?: string; // Lote ativo em estoque

  // CLASSIFICAÇÃO FISCAL DO PRODUTO (ARQUITETURA MOTOR DESK FISCAL)
  ncm?: string; // Código NCM Fiscal (Ex: 8708.29.99)
  cest?: string; // Código CEST (Substituição Tributária)
  origem?: string; // Origem da Mercadoria: 0-Nacional, 1-Importação Direta, 2-Estrangeira Interna, 3-Nacional >40% Import
  exTipi?: string; // Exceção da TIPI (caso exista)
  anpCode?: string; // Código ANP (para óleos / combustíveis)
  cBenef?: string; // Código do Benefício Fiscal Estadual

  // TRIBUTAÇÃO PADRÃO DO PRODUTO (CST / CSOSN / ALÍQUOTAS)
  icmsCstOrCsosn?: string; // CST (00, 20, 40, 60) ou CSOSN (101, 102, 500)
  pisCst?: string; // CST de PIS (01, 49, 07, 08)
  cofinsCst?: string; // CST de COFINS (01, 49, 07, 08)
  ipiCst?: string; // CST de IPI (50, 99)
  icmsRatePercent?: number; // Alíquota ICMS %
  pisRatePercent?: number; // Alíquota PIS %
  cofinsRatePercent?: number; // Alíquota COFINS %
  ipiRatePercent?: number; // Alíquota IPI %
  fcpRatePercent?: number; // Alíquota FCP %
}

export interface StockMovement {
  id: string;
  partId: string;
  partName: string;
  partCode: string;
  companyId?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unitCost?: number;
  reason: string; // Ex: "Importação NFe #1042", "Consumo OP-2026-001", "Entrada Produção Acabada OP-2026-001"
  description?: string;
  lotNumber?: string;
  productionOrderId?: string;
  operatorName?: string;
  userName?: string;
  supplierOrNFe?: string;
  sourceDocument?: string; // "NFe #1042", "OP-001", "Venda #V-100"
  date?: string;
  timestamp?: string;
}

/**
 * ============================================================================
 * ESTRUTURAS DO MÓDULO INDUSTRIAL (BOM, OP, LOTES, CUSTOS & RASTREABILIDADE)
 * ============================================================================
 */

export interface BomItem {
  id?: string;
  componentPartId?: string;
  componentPartName?: string;
  componentPartCode?: string;
  rawPartId?: string; // Compatibilidade com componentes
  rawPartName?: string;
  rawPartCode?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  isMandatory?: boolean; // Componente obrigatório ou opcional
  lossPercentage?: number; // Percentual de perda técnica (%)
  scrapRatePercent?: number; // Compatibilidade
  effectiveQuantity?: number; // Quantidade necessária considerando perda
  substitutePartId?: string; // Componente substituto alternativo
  substitutePartName?: string;
  usageSequence?: number; // Sequência de utilização na linha
  stockLocation?: string; // Localização de almoxarifado/prateleira
  notes?: string;
}

export interface BomRevision {
  id: string;
  bomId: string;
  revisionNumber: string; // Ex: "01", "02", "03"
  reason: string; // Motivo da alteração/revisão
  author: string; // Autor da revisão
  date: string; // Data ISO
  items: BomItem[]; // Snapshot dos itens nesta revisão
  standardBatchQuantity?: number;
  estimatedCycleTimeMinutes?: number;
  laborCost?: number;
  indirectCost?: number;
  totalUnitCost: number;
  changesSummary?: string;
  status: 'active' | 'archived' | 'draft';
}

export interface BillOfMaterials {
  id: string;
  companyId?: string;
  code?: string;
  name?: string;
  unit?: string;
  standardBatchQuantity?: number;
  estimatedCycleTimeMinutes?: number;
  finishedProductPartId?: string;
  finishedPartId?: string;
  finishedProductName?: string;
  finishedPartName?: string;
  finishedProductCode?: string;
  version: string; // Ex: "v1.0", "v2.1", "Rev 01"
  revisions?: BomRevision[];
  active: boolean;
  items: BomItem[];
  laborCost?: number; // Custo de Mão de Obra prevista por unidade
  laborCostPerUnit?: number; // Compatibilidade
  indirectCost?: number; // Custos Indiretos de Fabricação (CIF)
  overheadCostPerUnit?: number; // Compatibilidade
  totalMaterialCost?: number;
  materialsCostPerUnit?: number; // Compatibilidade
  totalUnitCost: number; // Custo previsto unitário (Material + MO + CIF)
  suggestedSalePrice?: number;
  estimatedProductionHours?: number;
  validityDate?: string;
  technicalDocs?: Array<{ name: string; url?: string; type?: string }>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductionOrderStatus = 
  | 'PLANEJADA' 
  | 'LIBERADA' 
  | 'EM_PRODUCAO' 
  | 'PAUSADA' 
  | 'CONCLUIDA' 
  | 'CANCELADA'
  | 'PLANNED'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'SEPARATION'
  | 'COMPLETED'
  | 'PAUSED'
  | 'CANCELED'
  | 'planned' 
  | 'approved' 
  | 'in_progress' 
  | 'completed' 
  | 'canceled'
  | 'planejada' 
  | 'liberada' 
  | 'em_producao' 
  | 'pausada' 
  | 'concluida' 
  | 'cancelada';

export interface MaterialConsumptionLog {
  id: string;
  productionOrderId: string;
  partId: string;
  partName: string;
  partCode: string;
  unit: string;
  plannedQuantity: number;
  consumedQuantity: number;
  returnedQuantity: number;
  lossQuantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber?: string;
  operatorName: string;
  timestamp: string;
  companyId: string;
  notes?: string;
}

export interface ProductionOrderMaterial {
  partId: string;
  partName: string;
  partCode: string;
  unit: string;
  plannedQuantity: number;
  reservedQuantity?: number;
  separatedQuantity?: number;
  consumedQuantity: number;
  returnedQuantity: number;
  lossQuantity: number;
  unitCost: number;
  availableStock: number;
  physicalStock?: number;
  availabilityStatus: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT'; // 🟢 🟡 🔴
  shortageQuantity: number;
  lotNumber?: string;
  isSubstitute?: boolean;
  originalPartId?: string;
  changeJustification?: string;
}

export interface ProductionScrapLog {
  id: string;
  productionOrderId: string;
  productionOrderCode: string;
  partId: string;
  partName: string;
  partCode?: string;
  quantity: number;
  unit?: string;
  scrapType?: 'CORTE' | 'QUEBRA' | 'DEFEITO' | 'ERRO_PRODUCAO' | 'AJUSTE' | 'OUTRO' | string;
  reason: string;
  unitCost?: number;
  totalCost?: number;
  operatorName?: string;
  reportedBy?: string;
  date?: string;
  timestamp?: string;
  companyId?: string;
  notes?: string;
}

export interface ProductionReworkLog {
  id: string;
  productionOrderId: string;
  productionOrderCode: string;
  stageName?: string;
  reworkReason?: string;
  reason?: string;
  additionalHours?: number;
  hoursSpent?: number;
  laborHourlyRate?: number;
  additionalLaborCost?: number;
  additionalMaterialsCost?: number;
  totalAdditionalCost?: number;
  responsibleOperator?: string;
  technicianName?: string;
  approvedBy?: string;
  date?: string;
  timestamp?: string;
  companyId?: string;
  additionalMaterials?: Array<{ partId: string; partName: string; quantity: number; unitCost: number; unit?: string }>;
  notes?: string;
}

export interface InstalledEquipment {
  id: string;
  companyId?: string;
  serialNumber: string; // Número de Série Único
  code?: string; // Código de Patrimônio / Tag
  tag?: string; // Tag compatível
  name: string; // Nome do Equipamento
  manufacturer?: string; // Fabricante do Equipamento
  model?: string; // Modelo do Equipamento
  location?: string; // Setor / Linha de Produção
  productId?: string; // Vínculo ao Produto Fabricado
  productName?: string;
  clientId?: string; // Cliente proprietário/locatário
  clientName?: string;
  city?: string;
  uf?: string;
  installationAddress?: string;
  manufactureDate?: string; // Data de Fabricação
  installationDate: string; // Data de Instalação
  warrantyExpirationDate: string; // Data Limite da Garantia
  isUnderWarranty?: boolean;
  technicalResponsible?: string; // Responsável Técnico
  status: 'OPERATIONAL' | 'STOPPED' | 'MAINTENANCE' | 'DECOMMISSIONED' | string; // Em Operação, Parado, Em Manutenção, Desativado
  runningHours?: number; // Horas de Funcionamento acumuladas
  operatingHours?: number; // Horas operadas acumuladas (compatibilidade)
  operationCycles?: number; // Ciclos de Operação acumulados
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenancePlanId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EquipmentMaintenancePlan {
  id: string;
  companyId?: string;
  name: string; // Ex: "Plano Preventivo Trimestral - Prensa Hidráulica"
  description?: string; // Descrição detalhada do plano
  equipmentModel?: string;
  periodicityType: 'DAYS' | 'MONTHS' | 'HOURS' | 'CYCLES' | 'CUSTOM' | string;
  intervalValue: number; // Ex: 90 dias, 500 horas, 1000 ciclos
  periodicityDays?: number; // Periodicidade em dias (compatibilidade)
  periodicityHours?: number; // Periodicidade em horas (compatibilidade)
  defaultChecklist?: Array<{
    id: string;
    description: string;
    category: 'LIMPEZA' | 'LUBRIFICACAO' | 'ELETRICA' | 'MECANICA' | 'APERTO' | 'DESGASTE' | 'TESTE_OPERACIONAL' | 'CALIBRACAO' | 'OUTROS' | string;
  }>;
  checklist?: any[]; // Checklist genérico compatível
  recommendedParts?: Array<{
    partId: string;
    partName: string;
    defaultQty: number;
    unit?: string;
  }>;
  active: boolean;
  notes?: string;
}

export interface MaintenanceChecklistItem {
  id: string;
  description?: string;
  item?: string; // Descrição compatível
  category?: 'LIMPEZA' | 'LUBRIFICACAO' | 'ELETRICA' | 'MECANICA' | 'APERTO' | 'DESGASTE' | 'TESTE_OPERACIONAL' | 'CALIBRACAO' | 'OUTROS' | string;
  checked?: boolean;
  completed?: boolean;
  status?: 'CONFORME' | 'NAO_CONFORME' | 'AJUSTADO' | 'NAO_APLICAVEL' | string;
  observations?: string;
}

export interface MaintenanceReplacedPart {
  id: string;
  partId: string;
  partName: string;
  partCode?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  replacementReason: 'DESGASTE_NATURAL' | 'FALHA_PREMATURA' | 'QUEBRA' | 'PREVENTIVA' | 'OUTRO' | string;
  stockDeducted?: boolean;
}

export interface ComponentWearRecord {
  id: string;
  componentName: string;
  wearLevel: 'NORMAL' | 'ATENCAO' | 'DESGASTE_LEVE' | 'DESGASTE_MODERADO' | 'DESGASTE_CRITICO' | 'NECESSITA_SUBSTITUICAO' | string;
  percentage: number; // 0 a 100%
  estimatedRemainingHours?: number;
  observations?: string;
}

export interface EquipmentMaintenanceOrder {
  id: string;
  companyId?: string;
  code: string; // Ex: "OM-2026-001"
  equipmentId: string;
  equipmentName: string;
  equipmentTag?: string; // Tag do equipamento
  serialNumber?: string;
  clientId?: string;
  clientName?: string;
  installationAddress?: string;
  type: 'PREVENTIVA' | 'CORRETIVA' | 'INSPECAO' | 'VISITA_TECNICA' | 'GARANTIA' | 'PREDITIVA' | string;
  status: 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'APROVADA' | 'CANCELADA' | 'ABERTA' | 'EM_EXECUCAO' | string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'EMERGENCIAL' | 'CRITICA' | 'NORMAL' | string;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  actualDurationMinutes?: number;
  description?: string;
  technicalNotes?: string;
  closingNotes?: string;
  rootCause?: string;
  checklist?: MaintenanceChecklistItem[];
  replacedParts?: MaintenanceReplacedPart[];
  wearRecords?: ComponentWearRecord[];
  laborHours?: number;
  laborHourlyRate?: number;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  executorTechnicianName?: string;
  assignedTechnician?: string;
  reportResponsibleName?: string;
  approverName?: string;
  isApproved?: boolean;
  approvedAt?: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseSuggestion {
  partId: string;
  partName: string;
  partCode: string;
  unit: string;
  currentStock: number;
  minStock: number;
  reservedStock: number;
  availableStock: number;
  monthlyAverageConsumption: number;
  plannedProductionDemand: number;
  suggestedQuantity: number;
  lastPurchaseSupplier?: string;
  lastPurchasePrice?: number;
  lastPurchaseDate?: string;
  lowestHistoricalPrice?: number;
  urgency: 'CRITICA' | 'ALTA' | 'NORMAL';
  reason: string;
}

export interface PurchaseHistoryItem {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  partId: string;
  partName: string;
  partCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  paymentCondition?: string;
  documentNumber?: string;
  companyId?: string;
}

export interface ProductionOrder {
  id: string;
  companyId?: string;
  code: string; // Ex: "OP-2026-001"
  finishedProductPartId?: string;
  finishedPartId?: string; // Compatibilidade
  finishedProductName?: string;
  finishedPartName?: string;
  productName?: string;
  finishedProductCode?: string;
  bomId?: string;
  billOfMaterialsId?: string; // Compatibilidade
  bomVersion?: string;
  status: ProductionOrderStatus;
  priority?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE' | 'low' | 'medium' | 'high' | 'urgent' | string;
  plannedQuantity: number;
  targetQuantity?: number;
  producedQuantity: number;
  lostQuantity?: number;
  scrapQuantity?: number;
  scrappedQuantity?: number;
  unit?: string;
  unitOfMeasure?: string;
  lotNumber?: string; // Lote gerado para o produto acabado
  lotExpirationDate?: string;
  responsibleOperator?: string;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  assignedTo?: string;
  operatorName?: string; // Compatibilidade
  customerName?: string; // Compatibilidade
  originType?: 'MANUAL' | 'SALE_ORDER' | 'BUDGET' | 'REPLENISHMENT' | string;
  originReferenceId?: string; // ID da Venda ou Orçamento originador
  commercialSaleCode?: string; // Compatibilidade
  commercialBudgetId?: string; // Compatibilidade
  clientName?: string; // Cliente vinculado à encomenda
  routingStages?: Array<{
    id: string;
    sequence: number;
    name?: string;
    workCenter?: string;
    workCenterName?: string;
    description?: string;
    standardMinutes?: number;
    estimatedMinutes?: number;
    actualMinutes?: number;
    completedAt?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'pendente' | 'em_andamento' | 'concluido' | string;
    operatorName?: string;
  }>;
  allocatedMaterials?: any[];
  scheduledDate?: string;
  startDate?: string;
  endDate?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Custos Industriais (Previsto vs Realizado)
  unitEstimatedCost?: number;
  estimatedUnitCost?: number; // Compatibilidade
  estimatedTotalCost?: number; // Compatibilidade
  plannedMaterialCost?: number;
  plannedLaborCost?: number;
  plannedIndirectCost?: number;
  plannedTotalCost?: number;
  actualMaterialCost?: number;
  actualLaborCost?: number;
  actualIndirectCost?: number;
  actualTotalCost?: number;
  totalEstimatedCost?: number;
  costDeviationAmount?: number; // Desvio em R$ (actual - planned)
  costDeviationPercentage?: number; // Desvio em %
  
  materials?: ProductionOrderMaterial[];
  consumptionLogs?: MaterialConsumptionLog[];
  observations?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductLot {
  id: string;
  companyId?: string;
  lotNumber: string;
  code?: string; // Código compatível
  partId: string;
  partName: string;
  productName?: string;
  partCode?: string;
  itemType?: 'materia_prima' | 'produto_acabado' | 'componente' | string;
  unit?: string;
  unitOfMeasure?: string;
  supplierName?: string;
  supplierCnpj?: string;
  supplierLotNumber?: string; // Compatibilidade
  storageLocation?: string; // Compatibilidade
  originNfeKey?: string;
  originNfeNumber?: string;
  originProductionOrderId?: string; // Se gerado por OP
  productionOrderId?: string; // Compatibilidade
  productionOrderCode?: string;
  entryDate?: string;
  manufactureDate?: string;
  manufacturingDate?: string;
  expirationDate?: string;
  initialQuantity: number;
  consumedQuantity?: number;
  remainingQuantity?: number;
  reservedQuantity?: number; // Saldo de lote reservado
  currentQuantity?: number;
  availableQuantity?: number; // Saldo de lote disponível
  unitCost?: number;
  status?: 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'QUARANTINE' | 'ativo' | 'quarentena' | 'esgotado' | 'expirado' | 'APROVADO' | 'REJEITADO' | 'QUARENTENA' | string;
  qualityStatus?: 'approved' | 'quarantine' | 'rejected' | 'aprovado' | 'rejeitado' | 'APPROVED' | 'REJECTED' | 'QUARANTINE' | string;
  qualityInspectionStatus?: string; // Compatibilidade
  qcStatus?: 'approved' | 'quarantine' | 'rejected' | 'aprovado' | 'rejeitado' | string;
  qcNotes?: string; // Parecer do controle de qualidade
  inspectedBy?: string;
  destinationSales?: Array<{
    saleId: string;
    saleCode: string;
    clientName: string;
    nfeKey?: string;
    quantity: number;
    date: string;
  }>;
  destinationProductionOrders?: Array<{
    productionOrderId: string;
    productionOrderCode: string;
    quantity: number;
    date: string;
  }>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommercialDemandVsIndustrialCapacity {
  partId: string;
  partName: string;
  partCode: string;
  unit: string;
  pendingSalesOrdersCount: number;
  orderedQuantity: number; // Total demandado por pedidos de clientes
  physicalStock: number; // Estoque físico
  reservedStock: number; // Estoque reservado para pedidos já faturados
  availableStock: number; // Saldo disponível imediato
  inProductionQuantity: number; // Em produção em OPs abertas
  netBalance: number; // (Disponível + Em Produção) - Demandado
  additionalProductionNeeded: number; // Necessidade real de produzir
  leadTimeDays: number;
  status: 'ADEQUATE' | 'IN_PRODUCTION' | 'CRITICAL_DEFICIT';
  actionPlan: {
    issue: string; // Problema
    impact: string; // Impacto
    action: string; // Ação recomendada
  };
}

export interface OperationalAlert {
  id: string;
  companyId: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'HIGH' | 'LOW' | 'critica' | 'atencao' | 'info' | string;
  category?: 
    | 'STOCK_CRITICAL' 
    | 'OP_OVERDUE' 
    | 'RAW_MATERIAL_SHORTAGE' 
    | 'ORDER_DELAYED' 
    | 'BUDGET_EXPIRING' 
    | 'CLIENT_INACTIVE' 
    | 'MARGIN_BELOW_MIN' 
    | 'COST_OVERRUN' 
    | 'LOT_EXPIRING' 
    | 'PURCHASE_REQUIRED'
    | string;
  type?: string;
  title: string;
  detail?: string;
  description?: string;
  message?: string;
  impact?: string;
  recommendedAction?: string;
  suggestedAction?: string;
  entityType?: string;
  entityId?: string;
  entityCode?: string;
  referenceId?: string;
  referenceType?: 'OP' | 'PART' | 'SALE' | 'BUDGET' | 'LOT' | string;
  createdAt: string;
  resolved?: boolean;
}

export interface NFeItem {
  cProd: string;
  xProd: string;
  ncm?: string;
  cest?: string;
  origem?: string;
  icmsCstOrCsosn?: string;
  pisCst?: string;
  cofinsCst?: string;
  ipiCst?: string;
  uCom?: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  matchedPartId?: string;
  action: 'update_stock' | 'create_new' | 'ignore';
  suggestedSalePrice?: number;
}

export interface NFeImportData {
  nNF: string;
  serie?: string;
  emitente: string;
  cnpjEmitente: string;
  destinatario?: string;
  cnpjDestinatario?: string;
  dhEmi: string;
  vNF: number;
  items: NFeItem[];
  isCnpjValid?: boolean;
  cnpjMismatchWarning?: string;
}

export type MaintenanceCategory = 'oil_change' | 'tire_change' | 'tire_alignment_balance' | 'general_maintenance' | 'none';

export interface ServiceMaintenanceControl {
  enabled: boolean;
  category: MaintenanceCategory;
  defaultIntervalKm: number; // Ex: 10000 km (óleo), 10000 km (balanceamento), 40000 km (pneus)
  defaultIntervalDays: number; // Ex: 180 dias (6 meses), 365 dias (1 ano)
  specificationsLabel?: string; // Ex: "Especificação/Viscosidade do Óleo" ou "Medida e Posição dos Pneus"
  recommendedInstructions?: string; // Observações técnicas / checklist do serviço
}

export interface Service {
  id: string;
  name: string;
  standardHours: number;
  price: number;
  companyId?: string;
  category?: string; // Categoria do serviço (Troca de Óleo, Pneus e Rodas, Freios, Injeção, etc.)
  isPeriodic?: boolean; // Se o serviço é periódico (troca de óleo, pneu, alinhamento/balanceamento)
  maintenanceControl?: ServiceMaintenanceControl;

  // DADOS FISCAIS DE SERVIÇO (EMISSÃO NFS-e)
  municipalServiceCode?: string; // Código do Serviço Municipal (LC 116/2003 - Ex: 14.01 Manutenção de veículos)
  cnaeCode?: string;             // Código CNAE Fiscal (Ex: 4520-0/01)
  issRatePercent?: number;       // Alíquota ISS % (Ex: 2% a 5%)
  issCst?: string;               // CST / Situação Tributária ISS
  retentionIss?: boolean;        // Se retém ISS na fonte
  retentionInss?: boolean;       // Se retém INSS na fonte
  retentionIr?: boolean;         // Se retém IR (Imposto de Renda)
  retentionCsll?: boolean;       // Se retém CSLL
  retentionPis?: boolean;        // Se retém PIS
  retentionCofins?: boolean;     // Se retém COFINS
}

/**
 * NATUREZA DA OPERAÇÃO (CFOP ENGINE)
 * Cadastro oficial do motivo fiscal da movimentação (Venda, Remessa, Devolução, Conserto, etc.)
 */
export interface TaxOperationNature {
  id: string;
  code: string;               // Ex: NAT-01, NAT-02
  description: string;        // Ex: Venda de Peças / Consumidor Final
  cfopInternal: string;       // CFOP Estadual (Ex: 5.102, 5.405, 5.933)
  cfopInterstate: string;     // CFOP Interestadual (Ex: 6.102, 6.405, 6.933)
  generatesFinancial: boolean; // Sim: gera Conta a Receber / Faturamento
  movesStock: boolean;         // Sim: reduz saldo de estoque de peças
  docType: '0' | '1';         // 0-Entrada, 1-Saída
  nfePurpose: '1' | '2' | '3' | '4'; // 1-NF Normal, 2-NF Complementar, 3-NF de Ajuste, 4-NF de Devolução
  notes?: string;
}

/**
 * MOTOR DE REGRAS TRIBUTÁRIAS (TAX ENGINE MATRIX)
 * Matriz configurável por UF Origem x UF Destino x Regime x NCM x Natureza da Operação.
 * Bypassa alteração produto a produto ao mudar regras de impostos.
 */
export interface TaxRule {
  id: string;
  name: string;                // Ex: "Regra Padrão Peças SP -> SP (Simples Nacional)"
  ufOrigin: string;            // SP ou '*' (Todas)
  ufDestination: string;       // SP ou '*' (Todas)
  taxRegime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'all';
  ncmCode?: string;            // NCM específico ou '*' (Geral)
  natureId?: string;           // ID da Natureza da Operação vinculada
  cfop: string;                // CFOP resolvido
  icmsCstOrCsosn: string;      // CST (00, 20, 40, 60) ou CSOSN (102, 500)
  icmsRatePercent: number;     // Alíquota ICMS %
  pisCst: string;              // CST PIS (01, 49, 07, 08)
  pisRatePercent: number;      // Alíquota PIS %
  cofinsCst: string;           // CST COFINS (01, 49, 07, 08)
  cofinsRatePercent: number;   // Alíquota COFINS %
  ipiCst?: string;             // CST IPI (50, 99)
  ipiRatePercent?: number;     // Alíquota IPI %
  fcpRatePercent?: number;     // Fundo de Combate à Pobreza %
  difalRatePercent?: number;   // Alíquota DIFAL (nas vendas interestaduais)
  active: boolean;
  notes?: string;
}

/**
 * IMPORTAÇÃO DE XML DE ENTRADA (NFe / NFCe / CTe)
 * Armazena o XML bruto, cabeçalhos, fornecedor, protocolos e tributos calculados.
 */
export interface XmlImportItem {
  cProd: string;
  xProd: string;
  ncm: string;
  cest?: string;
  cfop: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  icmsCstOrCsosn?: string;
  vICMS?: number;
  vIPI?: number;
  vPIS?: number;
  vCOFINS?: number;
  matchedPartId?: string;
  actionTaken?: 'stock_updated' | 'part_created' | 'ignored';
}

export interface XmlImportRecord {
  id: string;
  accessKey: string;            // Chave SEFAZ 44 dígitos
  nfeNumber: string;            // Número da NFe
  series: string;               // Série
  issueDate: string;            // Data de emissão YYYY-MM-DD
  supplierName: string;         // Nome / Razão Social do Fornecedor
  supplierCnpj: string;         // CNPJ Fornecedor
  supplierIe?: string;          // Inscrição Estadual do Fornecedor
  recipientName: string;        // Destinatário (Oficina)
  recipientCnpj: string;        // CNPJ da Oficina
  totalProductsAmount: number;  // Valor Total dos Produtos
  totalAmount: number;          // Valor Total da NF
  icmsAmount: number;           // Valor ICMS da NF
  ipiAmount: number;            // Valor IPI da NF
  pisAmount: number;            // Valor PIS da NF
  cofinsAmount: number;         // Valor COFINS da NF
  freightAmount?: number;       // Valor do Frete
  discountAmount?: number;      // Valor de Desconto
  protocolNumber?: string;      // Protocolo de Autorização SEFAZ
  xmlContent: string;           // XML bruto formatado
  items: XmlImportItem[];
  itemsCount: number;
  importedAt: string;           // Data e Hora do Upload/Processamento
  status: 'imported' | 'stock_synced' | 'canceled';
  notes?: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  clientId: string;
  companyId?: string;
  serviceOrderId?: string;
  serviceId?: string;
  serviceName?: string;
  itemDescription?: string;
  category: MaintenanceCategory;
  serviceDate?: string; // YYYY-MM-DD
  performedDate?: string; // YYYY-MM-DD
  serviceKm?: number; // Quilometragem no momento da troca
  performedKm?: number;
  nextDueKm: number; // Quilometragem prevista para a próxima manutenção
  nextDueDate: string; // Data prevista para a próxima manutenção (YYYY-MM-DD)
  specifications?: string; // Ex: "5W30 Sintético Mobil Super 3000"
  notes?: string;
  status?: 'ok' | 'due_soon' | 'overdue';
  recordedBy?: string;
  createdAt?: string;
}

export type BudgetItemType = 'part' | 'service';

export interface PriceChangeApproval {
  id: string;
  osId: string;
  companyId?: string;
  budgetId?: string;
  itemId: string;
  itemName: string;
  originalPrice: number;
  requestedNewPrice: number;
  requestedAt: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  serviceNotes?: string;
  managerNotes?: string;
}

export interface BudgetItem {
  id: string;
  type: BudgetItemType;
  itemId: string; // references part or service id
  name: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number; // Preço unitário original (quando foi orçado/adiado)
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'postponed'; // RN005: items recusados permanecem no historico
  unit?: string; // Sigla da unidade de medida (ex: UN, M², KG)
  unitOfMeasureId?: string; // ID da unidade de medida
  unitName?: string; // Nome da unidade de medida
  dimensions?: ItemDimensionData; // Dados de cálculo dimensional (comprimento, largura, altura, etc.)
  calculatedQuantity?: number; // Quantidade calculada real
  serviceNotes?: string; // Campo de texto livre com informação pertinente ao serviço/item
  reservationAgreement?: string; // Combinado/acordo com o cliente sobre a reserva de estoque
  priceChangeApproval?: PriceChangeApproval;
  isWarrantyCovered?: boolean; // Se este item/serviço específico é coberto por garantia (sem custo)
  warrantyNotes?: string; // Observações da cobertura em garantia
}

export interface Budget {
  id: string;
  clientId: string;
  vehicleId?: string; // Opcional para orçamentos de balcão / comércio
  companyId?: string;
  validityDays: number; // RN004: validade configurável
  createdAt: string;
  items: BudgetItem[];
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'expired';
  notes: string;
  customerComplaint?: string; // Reclamado / Queixa do cliente ao abrir o orçamento
  isWarrantyReturn?: boolean; // Marcação de atendimento de retorno em garantia
  warrantyOriginOSId?: string; // ID da OS anterior em garantia
  warrantyDays?: number; // Período de garantia estipulado
  stockReservationNotes?: string; // Observações sobre o combinado de reserva de estoque de peças
  paymentRequirementMode?: PaymentRequirementMode; // Regra de recebimento estipulada para este orçamento
  requiredDepositPercentage?: number; // % do sinal de entrada exigido
  requiredDepositAmount?: number; // R$ valor calculado do sinal de entrada

  // Suporte Multissegmento e Rastreabilidade de Conversão
  segmentType?: BusinessType; // 'OFICINA' | 'COMERCIO' | 'OFICINA_COMERCIO'
  saleId?: string; // ID da Venda Comercial gerada na aprovação/conversão
  serviceOrderId?: string; // ID da Ordem de Serviço gerada na aprovação/conversão
  isStockReserved?: boolean; // Se gerou reserva ativa de peças
  stockReservationStatus?: 'ACTIVE' | 'RELEASED' | 'TRANSFERRED' | 'EXPIRED' | 'CONVERTED' | 'NONE'; // Status da reserva
  reservationExpiresAt?: string; // Data ISO da expiração da reserva
}

export interface OSItem {
  id: string;
  type: BudgetItemType;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number; // Preço unitário original quando o item foi adiado
  totalPrice: number;
  status: 'pending' | 'executing' | 'completed' | 'canceled' | 'postponed';
  source: 'budget' | 'mechanic_suggestion'; // RN006: mecanico sugere novos itens
  unit?: string; // Sigla da unidade de medida (ex: UN, M², KG)
  unitOfMeasureId?: string; // ID da unidade de medida
  unitName?: string; // Nome da unidade de medida
  dimensions?: ItemDimensionData; // Dados de cálculo dimensional
  calculatedQuantity?: number; // Quantidade calculada real
  serviceNotes?: string; // Campo de texto livre com informação pertinente ao serviço/item
  priceChangeApproval?: PriceChangeApproval;
  isWarrantyCovered?: boolean; // Se este item/serviço específico é coberto por garantia
  warrantyNotes?: string; // Observações da cobertura em garantia
}

export type WorkshopStatus = 'gray' | 'yellow' | 'green' | 'blue' | 'red';

export interface ServiceOrder {
  id: string;
  budgetId: string;
  clientId: string;
  vehicleId: string;
  mechanicId: string; // User ID of the mechanic assigned or suggesting
  createdAt: string;
  companyId?: string;
  startedAt?: string;
  completedAt?: string;
  serviceDate?: string; // Data da realização do serviço (YYYY-MM-DD)
  nextDueDate?: string; // Data prevista para a próxima revisão / troca (YYYY-MM-DD)
  nextDueKm?: number; // Quilometragem prevista para a próxima revisão
  status: 'pending' | 'executing' | 'completed' | 'canceled';
  completionType?: 'TOTAL' | 'PARCIAL'; // Encerramento TOTAL ou PARCIAL pelo mecânico
  mechanicClosureNotes?: string; // Observações do encerramento pelo mecânico
  paymentStatus: 'pending' | 'paid'; // RF012
  technicalRecommendations: string; // RF010
  items: OSItem[];
  notes: string;
  customerComplaint?: string; // Reclamado / Queixa do cliente ao trazer o veículo
  isWarrantyReturn?: boolean; // Se a OS foi aberta devido a retorno/reincidência em garantia
  warrantyOriginOSId?: string; // ID da OS de origem em garantia
  warrantyDays?: number; // Garantia em dias (padrão 90)
  // Semáforo de Reparos da Oficina (Novo Padrão Visual):
  // 'gray' (Cinza: Não Iniciada) | 'yellow' (Amarelo: Pausada) | 'green' (Verde: Em Andamento) | 'blue' (Azul: Liberado)
  workshopStatus?: WorkshopStatus;
  pauseReason?: string; // Motivo da pausa (ex: "Falta de peça", "Aguardando retorno do cliente", etc.)
  workshopStatusUpdatedAt?: string; // YYYY-MM-DD ou ISO string
  isGreenCleared?: boolean; // Se o status liberado/azul foi zerado para a lista diária
  paymentRequirementMode?: PaymentRequirementMode; // 'AFTER_COMPLETION' | 'ADVANCE_DEPOSIT' | 'FULL_ADVANCE'
  requiredDepositPercentage?: number; // % ex: 30% ou 50%
  requiredDepositAmount?: number; // R$ valor do sinal necessário
  depositPaidAmount?: number; // R$ valor do sinal efetivamente quitado
  isDepositPaid?: boolean; // Se o sinal exigido foi pago
  depositPaidAt?: string; // Data da confirmação do sinal
  depositPaymentMethod?: string; // Método do sinal (PIX, Cartão, Dinheiro)
  // Faturamento Consolidado & Financeiro
  financialStatus?: FinancialSaleStatus; // 'PENDENTE_FATURAMENTO' | 'ACUMULADA' | 'FATURADA' | 'PAGA' | 'CANCELADA'
  billingPolicy?: 'PER_SALE' | 'CONSOLIDATED_PERIOD';
  billingStatus?: 'NONE' | 'AWAITING_CONSOLIDATION' | 'CONSOLIDATED' | 'INVOICED' | 'PAID' | 'pending_billing' | 'billed';
  accumulateForBilling?: boolean;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  billingClosureId?: string; // Vínculo com fechamento consolidado
  consolidatedBillingId?: string;
  consolidatedBillingCode?: string;
  accountReceivableId?: string;
  receivableId?: string;
  creditLimitExceeded?: boolean;
  creditLimitAttempted?: number;
  creditLimitApprovedBy?: string;
  creditLimitBypassReason?: string;
  creditLimitApprovedAt?: string;
}

export interface HistoryEntry {
  id: string;
  vehicleId?: string;
  clientId?: string;
  companyId?: string;
  type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system' | string;
  title: string;
  description: string;
  date: string;
  timestamp?: string;
  userId?: string;
  userName?: string;
  action?: string;
  justification?: string;
  targetRecordId?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: any; // total values, item counts, etc.
}

export interface TestCase {
  id: string;
  code: string; // CT001, CT002...
  requirement: string; // RF001, RN001...
  title: string;
  category: 'Funcional' | 'Regra de Negócio' | 'Permissões' | 'Fluxo Principal' | 'Logística' | 'Fiscal' | 'Multiloja' | 'Segurança & Arquitetura' | 'Compras' | 'Estoque' | 'Financeiro' | 'Segurança & RBAC' | 'Multiempresa' | string;
  preConditions: string;
  steps: string[];
  expectedResult: string;
  status: 'passed' | 'failed' | 'pending';
  comments?: string;
}

/**
 * Interface para representar os resultados da conversão e sanitização de dados legados no módulo QA.
 */
export interface MigrationSampleDiff {
  entityType: 'Cliente' | 'Veículo' | 'Peça' | 'Ordem de Serviço';
  legacyRaw: Record<string, any>;
  motorDeskConverted: Record<string, any>;
  adjustmentsMade: string[];
}

export interface DataMigrationReport {
  timestamp: string;
  sourceName: string;
  totalRecordsProcessed: number;
  clientsConverted: number;
  vehiclesConverted: number;
  partsConverted: number;
  serviceOrdersConverted: number;
  sanitizationStats: {
    cpfsFormatted: number;
    phonesFormatted: number;
    platesConvertedToMercosul: number;
    pricesCalculated: number;
    missingFieldsDefaulted: number;
  };
  convertedData: {
    clients: Client[];
    vehicles: Vehicle[];
    parts: Part[];
    serviceOrders: ServiceOrder[];
  };
  sampleBeforeAfter: MigrationSampleDiff[];
}

export type FreightType = 'cif' | 'fob' | 'none' | 'CIF' | 'FOB' | 'NONE' | 'THIRD_PARTY' | 'terceiros' | 'SEM_FRETE' | 'DESTINATARIO_FOB' | 'EMITENTE_CIF' | 'PROPRIO_EMITENTE' | 'PROPRIO_DESTINATARIO' | 'SEM_OCORRENCIA';
export type ShippingOperation = 'normal' | 'direct' | 'redespacho' | 'DIRETA' | 'REDESPACHO';

export interface Carrier {
  id: string;
  companyId: string;
  corporateName: string; // Razão Social
  tradeName?: string; // Nome Fantasia
  cnpj: string; // CNPJ ou CPF
  stateRegistration?: string; // Inscrição Estadual (IE)
  rntrc?: string; // Registro Nacional de Transportadores Rodoviários de Cargas (ANTT)
  phone: string; // Telefone Fixo
  cellphone?: string; // Telefone Celular
  whatsapp?: string; // WhatsApp
  email: string; // E-mail
  contactName?: string; // Nome do Contato / Responsável
  cep: string; // CEP
  street: string; // Logradouro
  number: string; // Número
  complement?: string; // Complemento
  neighborhood: string; // Bairro
  city: string; // Cidade
  state: string; // UF
  internalCode?: string; // Código Interno (Ex: TR-001)
  code?: string;
  notes?: string; // Observações gerais
  active: boolean; // Ativo / Inativo
  status?: 'active' | 'inactive'; // Status auxiliar
  supportsRedispersion?: boolean; // Suporta operação de redespacho
  shippingOperations?: Array<'normal' | 'redespacho' | 'direct'>; // Tipos de operação suportados
  defaultFreightType?: FreightType; // Modalidade padrão de frete
  logisticsHub?: string; // Ponto / Hub de apoio logístico
  trackingUrl?: string; // URL / Portal de Rastreamento de Cargas
  createdAt: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string; // Nome / Razão Social
  tradeName?: string; // Nome Fantasia
  cnpjCpf: string;
  cnpj?: string; // Compatibilidade de CNPJ
  email: string;
  phone: string;
  companyId?: string;
  contactPerson?: string; // Contato / Vendedor
  address: string;
  paymentTerms?: string; // Ex: 30 dias, PIX à vista, 3x Cartão
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export interface SupplierPartPrice {
  id: string;
  supplierId: string;
  partId: string;
  partCode: string;
  companyId?: string;
  supplierPartCode?: string; // Código do produto no fornecedor
  supplierPartName?: string; // Nome no fornecedor
  packageUnit?: string; // CX, PCT, UN, GAL, L
  conversionRatio: number; // Fator de conversão para unidades de estoque (ex: 1 CX = 10 UN)
  lastQuotedCost: number; // Valor da última cotação
  lastPurchaseCost?: number; // Preço de custo na última compra efetiva
  lastPurchaseDate?: string;
  lastPurchaseQuantity?: number;
  notes?: string;
}

export interface QuotationItem {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  suggestedQuantity: number; // Quantidade sugerida baseada na última compra / estoque
  quantity: number; // Quantidade real solicitada
  packageUnit?: string; // CX, UN, PCT
  conversionRatio?: number; // Fator de conversão (ex: 10 UN por CX)
  lastPurchaseCost?: number; // Preço unitário da última compra
  targetCost?: number; // Preço alvo / estimado
  quotedCost?: number; // Preço retornado pelo fornecedor
  totalCost?: number; // Valor total do item
  notes?: string;
}

export interface Quotation {
  id: string;
  code: string; // Ex: COT-2026-001
  supplierId: string;
  supplierName: string;
  companyId?: string;
  createdAt: string;
  validUntil?: string;
  status: 'draft' | 'sent' | 'received' | 'approved' | 'rejected' | 'converted';
  items: QuotationItem[];
  totalValue: number;
  paymentTerms?: string;
  deliveryDays?: number;
  notes?: string;
  createdBy: string; // Nome do usuário solicitante
  // Logística & Transporte de Frete
  freightType?: FreightType;
  carrierId?: string;
  carrierName?: string;
  freightValue?: number;
  shippingOperation?: ShippingOperation;
  logisticsHub?: string;
  redispersionCarrierId?: string;
  redispersionCarrierName?: string;
}

export interface PaymentMethodOption {
  id: string;
  name: string; // Ex: "PIX", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Crediário"
  type: 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_slip' | 'custom';
  defaultInterestRatePercent?: number; // Taxa padrão de juros / maquininha (%) ex: 2.5%
  maxInstallments?: number; // Máximo de parcelas permitidas (ex: 12)
  active: boolean;
  notes?: string;
}

export interface PaymentSplit {
  id: string;
  form: string; // 'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'BOLETO' | 'TRANSFERENCIA' | 'A_PRAZO' | 'FATURADO'
  formLabel: string; // Ex: "PIX", "Cartão de Crédito"
  amount: number;
  installments?: number;
  cardBrand?: string; // 'Visa', 'Mastercard', 'Elo', 'Hipercard', 'Amex'
  cardType?: 'DEBITO' | 'CREDITO';
  cardAcquirer?: string; // 'Cielo', 'Rede', 'Stone', 'PagBank', 'Getnet', 'Sicredi'
  cardFeePercent?: number; // Taxa % maquininha
  cardFeeAmount?: number; // R$ Taxa descontada
  netAmount?: number; // R$ Líquido a receber
  dueDate?: string;
  notes?: string;
  boletoId?: string;
  pixTxId?: string;
}

export interface BillingClosingItem {
  id: string;
  originType: 'SALE' | 'SERVICE_ORDER' | 'PRODUCTION';
  originId: string;
  originCode: string;
  documentDate: string;
  description: string;
  subtotal?: number;
  discount?: number;
  amount: number;
  sellerName?: string;
  paymentMethod?: string;
  paymentCondition?: string;
  vehiclePlate?: string;
  itemsSummary?: string;
}

export interface BillingClosingOrder {
  id: string;
  code: string; // Ex: FCH-2026-0001
  companyId: string;
  clientId: string;
  clientName: string;
  clientCpfCnpj?: string;
  periodicity?: 'DIARIO' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'DATA_ESPECIFICA';
  periodStart?: string; // YYYY-MM-DD
  periodEnd?: string; // YYYY-MM-DD
  periodStartDate?: string;
  periodEndDate?: string;
  closingDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  linkedSaleIds?: string[];
  linkedSaleCodes?: string[];
  linkedServiceOrderIds?: string[];
  linkedServiceOrderCodes?: string[];
  salesCount: number;
  serviceOrdersCount?: number;
  subtotal?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod?: string; // Ex: 'Boleto Bancário', 'PIX', 'Faturado', 'A Prazo'
  paymentCondition?: string;
  paymentStatus?: 'pending' | 'paid' | 'overdue' | 'canceled';
  status: 'ABERTO' | 'FECHADO' | 'FATURADO' | 'PAGO' | 'CANCELADO' | 'open' | 'closed' | 'paid' | 'canceled';
  accountReceivableId?: string;
  accountReceivableCode?: string;
  receivableId?: string;
  receivableCode?: string;
  boletoId?: string;
  boletoBarcode?: string;
  pixTxId?: string;
  notes?: string;
  items?: BillingClosingItem[];
  createdAt?: string;
  createdByName?: string;
  closedBy?: string;
  closedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  reopenReason?: string;
}

export interface BankStatementItem {
  id: string;
  fitId?: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reconciled?: boolean;
  reconciledAt?: string;
  reconciledBy?: string;
  reconciledAccountReceivableId?: string;
  reconciledBillingClosingId?: string;
  notes?: string;
}

export interface BankStatement {
  id: string;
  companyId: string;
  bankName: string;
  accountNumber: string;
  agency?: string;
  startDate?: string;
  endDate?: string;
  importedAt: string;
  importedByName: string;
  fileName: string;
  items: BankStatementItem[];
}

export interface BankStatementEntry {
  id: string;
  companyId: string;
  bankName: string; // Ex: "Banco do Brasil", "Itaú", "Sicoob", "Bradesco"
  accountNumber: string;
  transactionDate: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT'; // Entrada (+) ou Saída (-)
  reconciliationStatus: 'PENDENTE' | 'CONCILIADO' | 'CONCILIADO_PARCIAL' | 'DIVERGENTE';
  reconciledReceivableId?: string;
  reconciledReceivableCode?: string;
  reconciledPayableId?: string;
  reconciledPayableCode?: string;
  reconciledTransactionId?: string;
  reconciledAmount?: number;
  reconciledBy?: string;
  reconciledAt?: string;
  reconcileNotes?: string;
  unreconcileReason?: string;
  fitId?: string; // Identificador único da transação OFX/banco
}

export interface AccountPayableAttachment {
  id: string;
  name: string;
  type: 'boleto' | 'nfe' | 'receipt' | 'invoice' | 'contract' | 'other';
  fileUrl?: string; // Data URL / Base64 / Blob URL
  fileType?: string; // Ex: 'application/pdf', 'image/png', 'application/xml'
  fileSize?: string; // Ex: '350 KB'
  uploadedAt: string;
  uploadedByName?: string;
  nfeAccessKey?: string;
  nfeNumber?: string;
  nfeSeries?: string;
  barcode?: string;
  linhaDigitavel?: string;
  bankName?: string;
  dueDate?: string;
  amount?: number;
  installmentNumber?: number;
  notes?: string;
}

export interface AccountInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  paymentDate?: string;
  paymentMethod?: string; // PIX, Cartão, Dinheiro, Boleto, TED, Transferência
  receiptNotes?: string;
  // Integração de Boleto & Documentos por Parcela
  nfeNumber?: string;
  boletoBarcode?: string;
  boletoLinhaDigitavel?: string;
  boletoBankName?: string;
  boletoOurNumber?: string; // Nosso Número
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  paymentReceiptUrl?: string;
  paymentReceiptName?: string;
  paidAt?: string;
  bankAccount?: string;
}

export interface AccountReceivable {
  id: string;
  code: string; // Ex: CR-2026-001
  clientId: string;
  clientName: string;
  companyId?: string;
  clientCpf?: string;
  serviceOrderId?: string;
  budgetId?: string;
  title: string; // Ex: OS-001 - Troca de Pastilhas de Freio
  originalAmount?: number; // Valor original bruto da OS (sem juros)
  interestRatePercent?: number; // Taxa de juros / maquininha aplicada (%)
  interestAmount?: number; // Valor do acréscimo de juros (R$)
  paymentMethod?: string; // Forma de pagamento selecionada (PIX, Dinheiro, Cartão, etc.)
  totalAmount: number; // Valor total final com acréscimo
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'blocked_credit_limit' | 'approved_by_manager';
  installmentsCount: number;
  dueDate: string;
  createdAt: string;
  installments: AccountInstallment[];
  creditLimitExceeded?: boolean;
  creditLimitAttempted?: number;
  managerApproval?: {
    approvedBy: string;
    approvedAt: string;
    notes?: string;
  };
  notes?: string;
  // Linkages to NF-e, Boleto and Sale
  saleId?: string;
  saleCode?: string;
  billingType?: 'immediate' | 'monthly_batch' | 'consolidated_closing';
  billingMonth?: string; // Ex: "2026-07"
  isConsolidated?: boolean;
  consolidatedBillingId?: string;
  consolidatedBillingCode?: string;
  linkedSaleIds?: string[];
  linkedSaleCodes?: string[];
  linkedServiceOrderIds?: string[];
  linkedServiceOrderCodes?: string[];
  paymentSplits?: PaymentSplit[];
  reconciliationStatus?: 'PENDENTE' | 'CONCILIADO' | 'CONCILIADO_PARCIAL';
  reconciliationDate?: string;
  reconciledBy?: string;
  nfeId?: string;
  nfeCode?: string;
  nfeStatus?: 'authorized' | 'draft' | 'transmitting' | 'rejected' | 'canceled' | 'pending';
  nfeAccessKey?: string;
  nfeRejectionReason?: string;
  boletoId?: string;
  boletoCode?: string;
  boletoStatus?: 'registered' | 'paid' | 'overdue' | 'canceled' | 'simulated';
  boletoBarcode?: string;
  boletoNossoNumero?: string;
}

export interface AccountPayable {
  id: string;
  code: string; // Ex: CP-2026-001
  supplierId?: string;
  supplierName: string;
  companyId?: string;
  quotationId?: string;
  description: string; // Ex: Compra de Óleo Lubrificante - NFe #4012
  category: string; // Peças / Fornecedor, Ferramentas, Aluguel, Energia, Salários, Impostos
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  installments: AccountInstallment[];
  notes?: string;
  // Integração de Documentos, Boletos e NF-e
  attachments?: AccountPayableAttachment[];
  nfeAccessKey?: string; // Chave de acesso 44 dígitos
  nfeNumber?: string;
  nfeSeries?: string;
  nfeIssueDate?: string;
  nfeXmlContent?: string;
  boletoBarcode?: string;
  boletoLinhaDigitavel?: string;
  boletoBankName?: string;
  paymentCondition?: string; // Ex: '1x Boleto À Vista', '3x Boletos', '30/60/90'
  documentType?: 'boleto' | 'nfe' | 'fatura' | 'recibo' | 'contrato' | 'diversos';
}

export interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense'; // Entrada (+) ou Saída (-)
  category: string;
  description: string;
  amount: number;
  date: string;
  companyId?: string;
  paymentMethod?: string;
  referenceId?: string; // ID da Conta a Receber/Pagar ou OS
  clientId?: string;
  supplierId?: string;
  createdByName: string;
}

export interface FiscalDocumentItem {
  id: string;
  code: string;
  name: string;
  ncm?: string;
  cest?: string;
  unit?: string;
  cstCsosn?: string;
  pisCst?: string;
  cofinsCst?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'part' | 'service';
  cfop?: string;
  icmsRatePercent?: number; // % ICMS
  issRatePercent?: number;  // % ISS (para serviços)
  
  // Reforma Tributária 2026 (EC 132/2023)
  ibsRatePercent?: number;  // % IBS (Imposto sobre Bens e Serviços - Alíquota Teste ex: 0,1%)
  ibsAmount?: number;       // R$ Valor IBS
  cbsRatePercent?: number;  // % CBS (Contribuição sobre Bens e Serviços - Alíquota Teste ex: 0,9%)
  cbsAmount?: number;       // R$ Valor CBS
  cstIbsCbs?: string;       // CST IBS/CBS (Ex: "01 - Operação Tributada Integralmente")
}

export interface FiscalDocument {
  id: string;
  code: string; // Ex: NFE-000104
  type: 'nfe_product' | 'nfse_service' | 'nfe_transfer' | 'nfe_order_delivery' | 'nfce_retail';
  status: 'draft' | 'transmitting' | 'authorized' | 'rejected' | 'canceled' | 'cce_issued' | 'error' | 'denied';
  accessKey: string; // Chave de acesso SEFAZ (44 dígitos)
  protocolNumber?: string; // Protocolo de autorização SEFAZ
  issueDate: string; // YYYY-MM-DD
  issuedAt: string; // YYYY-MM-DD HH:mm:ss
  createdAt?: string;
  companyId: string;
  companyName: string;
  companyCnpj: string;
  operationNature?: string; // Natureza da Operação (ex: "VENDA DE MERCADORIA ADQ. DE TERCEIROS")
  additionalNotes?: string; // Informações Complementares de interesse do contribuinte
  paymentMethod?: string; // Meio de Pagamento (PIX, Dinheiro, Cartão)
  targetBranchId?: string;
  targetBranchName?: string;
  targetBranchCnpj?: string;
  clientId?: string;
  clientName?: string;
  clientCpfCnpj?: string;
  clientAddress?: string;
  clientUf?: string;
  clientCity?: string;
  serviceOrderId?: string;
  budgetId?: string;
  saleId?: string;
  saleCode?: string;
  receivableId?: string;
  receivableCode?: string;
  cfop: string; // Ex: '5.102' (Venda), '5.152' (Transferência de mercadoria), '5.923' (Remessa)
  totalProducts: number;
  totalServices: number;
  totalTaxes: number;
  
  // Detalhamento de impostos
  icmsBase?: number;
  icmsAmount?: number;
  icmsStBase?: number;
  icmsStAmount?: number;
  fcpAmount?: number;
  difalUfDestAmount?: number;
  difalUfRemetAmount?: number;
  pisAmount?: number;
  cofinsAmount?: number;
  issAmount?: number;
  taxObligationGuideIds?: string[];
  hasAttachedTaxObligations?: boolean;
  difalValue?: number;
  fcpValue?: number;
  icmsStValue?: number;
  
  // Totais da Reforma Tributária 2026
  totalIbs?: number;        // R$ Total IBS
  totalCbs?: number;        // R$ Total CBS
  totalIbsCbs?: number;     // R$ Total IBS + CBS (Alíquota Teste 1,0%)
  ibsTaxValue?: number;
  cbsTaxValue?: number;
  
  totalAmount: number;
  items: FiscalDocumentItem[];
  cceNotes?: string; // Carta de Correção Eletrônica
  sefazStatusMessage: string; // Ex: "100 - Autorizado o uso da NF-e"
  rejectionCode?: string;     // Ex: "208", "778"
  rejectionReason?: string;   // Mensagem detalhada de rejeição
  xmlContent?: string;
  xmlSent?: string;           // XML de Envio assinado
  xmlAuthorized?: string;     // XML de Distribuição com protocolo
  
  // Dados de Modelo e Emissão
  docModel?: '55' | '65' | 'NFS-e'; // 55 = NF-e, 65 = NFC-e
  nfeNumber?: number;
  series?: string;
  qrCodeUrl?: string;         // URL QR Code NFC-e
  qrCodePayload?: string;     // Payload QR Code
  
  // Cancelamento
  cancellationProtocol?: string;
  cancellationJustification?: string;
  cancellationDate?: string;
  
  // Transportadora & Frete
  carrierId?: string;
  carrierName?: string;
  carrierCnpjCpf?: string;
  freightType?: FreightType;
  freightValue?: number;
  shippingOperation?: ShippingOperation;
  logisticsHub?: string;
  redispersionCarrierName?: string;
  
  // Auditoria e Ambiente
  environment: 'homologation' | 'production';
  securityLog?: string[];
  logisticsOption?: 'WAIT_TRANSFER_AT_BUYSTORE' | 'PAY_BUYSTORE_PICKUP_STOCKSTORE';
  transferNfeId?: string;
  salesNfeId?: string;
}

export interface BankBoletoConfig {
  bankCode: string; // Ex: '001', '341', '237', '104', '033', '756' (Sicoob), '748' (Sicredi), '077' (Inter), '260' (Nubank)
  bankName: string;
  agencyNumber: string;
  agencyDigit?: string;
  accountNumber: string;
  accountDigit: string;
  wallet: string; // Carteira (ex: '09', '17', '109', '112')
  agreementNumber?: string; // Convênio / Código do Cedente / Beneficiário
  nextNossoNumero: number; // Sequencial do nosso número
  documentType?: 'DM' | 'DS' | 'RC' | 'NP'; // Espécie do Documento
  modality?: string; // 'com_registro' | 'sem_registro'
  acceptance?: 'A' | 'N'; // Aceite (A - Sim, N - Não)
  interestRateMonthlyPercent?: number; // Juros de mora % ao mês
  finePercent?: number; // Multa por atraso %
  discountDays?: number; // Dias de desconto por antecipação
  discountPercent?: number; // Desconto por antecipação %
  protestDays?: number; // Dias para protesto/baixa
  instructionsText?: string; // Instruções impressas no boleto
  environment: 'homologation' | 'production';
  apiClientId?: string;
  apiClientSecret?: string;
  apiScope?: string;
  certificateFileName?: string;
  active: boolean;
}

export interface PixConfig {
  institutionName: string;
  pixKey: string;
  keyType: 'cnpj' | 'cpf' | 'email' | 'phone' | 'evp';
  environment: 'homologation' | 'production';
  apiClientId?: string;
  apiClientSecret?: string;
  accountIdentifier?: string;
  active: boolean;
}

export interface BoletoDocument {
  id: string;
  code: string; // Ex: BOL-2026-001
  bankCode: string; // Ex: '001' (BB), '341' (Itaú), '237' (Bradesco), '104' (Caixa)
  bankName: string;
  barcodeNumber: string; // Linha digitável de 47 dígitos
  pixQrCodeUrl?: string;
  pixCopiaECola?: string;
  payerName: string;
  payerCpfCnpj: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  status: 'registered' | 'paid' | 'overdue' | 'canceled' | 'simulated';
  companyId: string;
  serviceOrderId?: string;
  receivableId?: string;
  nfeAccessKey?: string;
  nossoNumero?: string;
  wallet?: string;
  agency?: string;
  account?: string;
  saleId?: string;
  saleCode?: string;
  instructions?: string;
  interestRate?: number;
  fineRate?: number;
  environment?: 'homologation' | 'production';
}

export interface InterBranchSaleLogistics {
  id: string;
  saleId: string;
  originStoreId: string;
  originStoreName: string;
  stockStoreId: string;
  stockStoreName: string;
  partId: string;
  partName: string;
  partCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  logisticsOption: 'WAIT_TRANSFER_AT_BUYSTORE' | 'PAY_BUYSTORE_PICKUP_STOCKSTORE';
  transferNfeId?: string;
  salesNfeId?: string;
  transferStatus: 'pending_nfe' | 'nfe_issued' | 'in_transit' | 'received_at_store' | 'picked_up_by_client';
  pickupQrCode?: string;
  createdAt: string;
  clientName?: string;
  clientCpfCnpj?: string;
}

export interface SefazApiConfig {
  environment: 'homologation' | 'production';
  uf: string;
  certificateStatus: 'A1_ACTIVE' | 'EXPIRED' | 'NOT_CONFIGURED' | 'VALID_ACTIVE';
  certificateName?: string;
  certificateExpirationDate?: string;
  autoTransmit?: boolean;
  taxRegime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  stateRegistration?: string; // Inscrição Estadual (IE)
  cityRegistration?: string;  // Inscrição Municipal (IM)
  cnaeCode?: string;         // CNAE Fiscal Principal
  nfeSeries?: string;
  nextNfeNumber?: number;
  nfseSeries?: string;
  nextNfseNumber?: number;
  nfceSeries?: string;
  nextNfceNumber?: number;
  cscTokenId?: string;
  cscSecretKey?: string;
  defaultProductCfop?: string;
  defaultServiceCfop?: string;
  defaultIssRatePercent?: number;
  defaultIcmsRatePercent?: number;
  defaultFinishMode?: 'immediate' | 'monthly_batch';
  
  // Reforma Tributária 2026 (IBS / CBS)
  defaultIbsRatePercent?: number; // Alíquota teste IBS % (Padrão: 0,1%)
  defaultCbsRatePercent?: number; // Alíquota teste CBS % (Padrão: 0,9%)
  
  // Configuração do Emissor / Token do Cliente
  clientApiToken?: string;        // Token de API do Cliente (Chave do Emissor / FocusNFe / Nuvem Fiscal / e-Notas)
  
  // Certificado Digital A1 (.pfx/.p12)
  pfxCertificateFileName?: string;
  pfxCertificatePassword?: string;
  pfxCertificateUploadDate?: string;
  pfxCertificateSubjectCnpj?: string;

  // Checklist de Homologação & Ativação de Produção
  homologationStatus?: 'not_configured' | 'homologating' | 'homologated' | 'error';
  homologationChecklist?: {
    companyConfigured?: boolean;
    cnpjValidated?: boolean;
    ieValidated?: boolean;
    imConfigured?: boolean;
    taxRegimeConfigured?: boolean;
    certA1Valid?: boolean;
    fiscalProviderConnected?: boolean;
    sefazStatusOk?: boolean;
    nfeTested?: boolean;
    nfceTested?: boolean;
    nfseTested?: boolean;
    cancelTested?: boolean;
    rejectionTested?: boolean;
    danfeTested?: boolean;
    xmlTested?: boolean;
    boletoTested?: boolean;
    pixTested?: boolean;
    permissionsReviewed?: boolean;
  };
  productionRequested?: boolean;
  productionApprovedAt?: string;
  productionApprovedBy?: string;
  productionCredentialsConfigured?: boolean;

  // Modo de Comunicação e WebServices Oficiais Diretos
  communicationMode?: 'direct_sefaz_sp' | 'custom_gateway';
  
  // Endpoints Oficiais SEFAZ SP (NF-e 4.00 e NFC-e 4.00)
  directSefazSpConfig?: {
    // NF-e Homologação SP
    nfeAutorizacaoHml?: string;
    nfeRetAutorizacaoHml?: string;
    nfeStatusServicoHml?: string;
    nfeRecepcaoEventoHml?: string;
    nfeInutilizacaoHml?: string;
    // NF-e Produção SP
    nfeAutorizacaoProd?: string;
    nfeRetAutorizacaoProd?: string;
    nfeStatusServicoProd?: string;
    nfeRecepcaoEventoProd?: string;
    nfeInutilizacaoProd?: string;
    // NFC-e Homologação SP
    nfceAutorizacaoHml?: string;
    nfceStatusServicoHml?: string;
    nfceQrCodeHml?: string;
    // NFC-e Produção SP
    nfceAutorizacaoProd?: string;
    nfceStatusServicoProd?: string;
    nfceQrCodeProd?: string;
  };

  // Endpoints Oficiais NFS-e Municipal (São Paulo / ADN Nacional / ABRASF)
  municipalNfseConfig?: {
    standard?: 'sp_capital' | 'adn_nacional' | 'abrasf_v2' | 'ginfes' | 'custom';
    homologationUrl?: string;
    productionUrl?: string;
    cityHallName?: string;
    customHeaders?: string;
  };

  // Gateway de API Particular (Focus NFe / Nuvem Fiscal / PlugNotas)
  customGatewayConfig?: {
    enabled?: boolean;
    provider?: 'focus_nfe' | 'nuvem_fiscal' | 'plug_notas' | 'speed_gov' | 'generic_rest';
    apiUrl?: string;
    apiKey?: string;
    environment?: 'homologation' | 'production';
  };
}

export interface CommercialSaleItem {
  id: string;
  partId: string;
  partName: string;
  partCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  unit?: string;
  unitOfMeasureId?: string;
  unitName?: string;
  dimensions?: ItemDimensionData;
  calculatedQuantity?: number;
  ncm?: string;
}

export type FinancialSaleStatus = 
  | 'PENDENTE_FATURAMENTO' 
  | 'ACUMULADA' 
  | 'FATURADA' 
  | 'PAGA' 
  | 'CANCELADA';

export interface CommercialSale {
  id: string;
  code: string; // Ex: VEN-2026-0001
  clientId: string;
  clientName: string;
  clientCpfCnpj?: string;
  companyId: string;
  createdAt: string;
  items: CommercialSaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string; // Ex: "PIX", "Dinheiro", "Cartão de Crédito", "A Prazo", "Faturado", "Múltiplas Formas"
  paymentStatus: 'paid' | 'pending' | 'canceled';
  financialStatus?: FinancialSaleStatus; // Status financeiro formal da venda
  installmentsCount?: number;
  receivableId?: string;
  accountReceivableId?: string; // Título financeiro relacionado
  // POLÍTICA DE FATURAMENTO DA VENDA
  billingPolicy?: 'PER_SALE' | 'CONSOLIDATED_PERIOD';
  billingStatus?: 'NONE' | 'AWAITING_CONSOLIDATION' | 'CONSOLIDATED' | 'INVOICED' | 'PAID' | 'pending_billing' | 'billed';
  accumulateForBilling?: boolean;
  paymentConditionType?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  billingClosureId?: string; // Vínculo com fechamento consolidado
  consolidatedBillingId?: string;
  consolidatedBillingCode?: string;
  paymentSplits?: PaymentSplit[];
  paymentCondition?: string; // Ex: "À Vista", "30 dias", "30/60 dias", "Faturamento Semanal"
  // Gestão de Limite de Crédito
  creditLimitExceeded?: boolean;
  creditLimitAttempted?: number;
  creditLimitApprovedBy?: string;
  creditLimitBypassReason?: string;
  creditLimitApprovedAt?: string;
  fiscalDocumentId?: string;
  fiscalAccessKey?: string;
  fiscalStatus?: 'pending' | 'authorized' | 'rejected' | 'canceled' | 'pending_conference' | 'ready_for_emission' | 'ready_for_transmission' | 'emit_later' | 'transmitting' | 'error_transmission';
  fiscalModelChoice?: '65' | '55' | 'NFS-e' | 'none' | 'emit_later';
  fiscalRejectionReason?: string;
  nfeNumber?: string;
  nfeSeries?: string;
  boletoId?: string;
  boletoCode?: string;
  boletoStatus?: 'registered' | 'paid' | 'overdue' | 'canceled';
  boletoBarcode?: string;
  notes?: string;
  createdBy: string;
  budgetId?: string; // Rastreabilidade do Orçamento de Origem convertido
  // Logística & Transporte de Frete
  freightType?: FreightType;
  carrierId?: string;
  carrierName?: string;
  freightValue?: number;
  shippingOperation?: ShippingOperation;
  logisticsHub?: string;
  redispersionCarrierId?: string;
  redispersionCarrierName?: string;
}

export type WithdrawalType = 'BALCAO' | 'ENTREGA';

export type WithdrawalStatus = 
  | 'AGUARDANDO_SEPARACAO' 
  | 'EM_SEPARACAO' 
  | 'PARCIALMENTE_SEPARADO' 
  | 'SEPARADO'
  | 'PRONTO_RETIRADA' 
  | 'PRONTO_ENTREGA' 
  | 'PARCIALMENTE_RETIRADO' 
  | 'SAIU_PARA_ENTREGA' 
  | 'ENTREGUE' 
  | 'RETIRADO' 
  | 'CANCELADO';

export interface GoodsWithdrawalItem {
  id: string;
  partId: string;
  partName: string;
  partCode: string;
  location?: string;            // Localização de estoque (ex: Corredor A - Prateleira 3)
  quantitySold: number;         // Quantidade original vendida (imutável no romaneio)
  quantityReserved: number;     // Quantidade física ainda reservada
  quantitySeparated: number;    // Quantidade separada pelo operador de picking
  quantityReleased: number;     // Quantidade retirada no balcão pelo cliente (baixa física executada)
  quantityWithdrawn?: number;   // Sinônimo operacional de quantityReleased
  quantityForDelivery?: number; // Quantidade residual destinada para entrega/expedição
  quantityDelivered?: number;   // Quantidade entregue no destino final
  unitPrice: number;
  totalPrice: number;
  unit?: string;                // UN, PC, L, CX, etc.
  unitName?: string;
  dimensions?: ItemDimensionData;
  isConferred?: boolean;        // Item conferido no picking [✓]
  conferredAt?: string;
  conferredBy?: string;
  divergenceNotes?: string;     // Observações de divergência / falta
  missingQuantity?: number;     // Quantidade em falta identificada
  replacementPartName?: string; // Nome de peça substituta autorizada
}

export interface GoodsWithdrawalHistoryEvent {
  id: string;
  status: WithdrawalStatus;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  quantityMoved?: number;
}

export interface GoodsWithdrawalOrder {
  id: string;
  code: string; // Ex: RET-2026-0001
  saleId: string;
  saleCode: string;
  companyId: string;
  clientId: string;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  type: WithdrawalType;
  status: WithdrawalStatus;
  items: GoodsWithdrawalItem[];
  createdAt: string;
  updatedAt: string;
  separatedAt?: string;
  releasedAt?: string;
  deliveredAt?: string;
  collectedByName?: string;
  collectedByDocument?: string;
  carrierId?: string;
  carrierName?: string;
  shippingAddress?: string;
  trackingCode?: string;
  deliveryNotes?: string;
  notes?: string;
  assignedOperator?: string;
  history: GoodsWithdrawalHistoryEvent[];
}

// ==========================================
// MÓDULO DE OBRIGAÇÕES E GUIAS FISCAIS
// ==========================================

export type TaxObligationType = 
  | 'ICMS_ST'    // Substituição Tributária Estadual
  | 'FCP'        // Fundo de Combate à Pobreza
  | 'DIFAL'      // Diferencial de Alíquota Interestadual (EC 87/15)
  | 'GNRE'       // Guia Nacional de Recolhimento de Tributos Estaduais
  | 'DARE'       // Documento de Arrecadação de Receitas Estaduais (ex: DARE-SP)
  | 'DAE'        // Documento de Arrecadação Estadual (ex: DAE-MG, DAE-BA)
  | 'SUFRAMA'    // Taxa de Controle de Incentivos Fiscais / PIN Suframa
  | 'OTHER';     // Outras obrigações tributárias e taxas

export type TaxObligationStatus = 
  | 'PENDENTE'              // Identificada pelo motor, aguardando geração de guia
  | 'CALCULADA'             // Base e alíquota consolidadas
  | 'GERADA'                // Guia gerada com código de barras / linha digitável
  | 'AGUARDANDO_PAGAMENTO'  // Guia emitida aguardando liquidação bancária
  | 'PAGA'                  // Guia quitada com autenticação bancária
  | 'VENCIDA'               // Data de vencimento ultrapassada
  | 'CANCELADA'             // Guia cancelada ou estornada
  | 'REJEITADA';            // Guia rejeitada pelo órgão arrecadador

export interface TaxCalculationMemoryStep {
  label: string;
  formula: string;
  value: number | string;
  detail?: string;
}

export interface TaxCalculationMemory {
  steps: TaxCalculationMemoryStep[];
  legalBasis: string;
  description: string;
  ufOrigin: string;
  ufDestination: string;
  cfop: string;
  ncm: string;
  isInterstate: boolean;
  isFinalConsumer: boolean;
  recipientIeIndicator: string;
  protocolAgreement?: string; // Protocolo / Convênio ICMS (ex: "Convênio ICMS 142/18", "Protocolo ICMS 41/08")
}

export interface TaxObligationGuide {
  id: string;
  companyId: string;
  fiscalDocumentId?: string;
  invoiceKey?: string; // Chave de Acesso da NF-e (44 dígitos)
  nfeNumber?: string | number;
  nfeSeries?: string;
  saleId?: string;
  saleCode?: string;
  serviceOrderId?: string;
  obligationType: TaxObligationType;
  obligationName: string; // Ex: "ICMS-ST Interestadual", "FCP Destino", "DIFAL Consumidor Final"
  authority: string; // UF Favorecida (ex: 'SP', 'RJ', 'MG', 'BA', 'AM')
  revenueCode: string; // Código de Receita Oficial (ex: '10008-0' ICMS-ST, '10010-2' DIFAL, '10012-9' FCP, '046-2' DARE)
  calculationBase: number; // Base de Cálculo em R$
  rate: number; // Alíquota aplicada em %
  calculatedAmount: number; // Valor apurado da obrigação em R$
  fineAmount?: number; // Multa em R$
  interestAmount?: number; // Juros de mora em R$
  totalAmount: number; // Valor Total da Guia (Principal + Acréscimos)
  dueDate: string; // Data de Vencimento YYYY-MM-DD
  issueDate?: string; // Data de Emissão YYYY-MM-DD
  guideNumber: string; // Número de controle da Guia / Nosso Número
  barcode: string; // Código de Barras FEBRABAN
  digitLine: string; // Linha Digitável formatada
  qrCode?: string; // Payload QR Code
  pixCopyPaste?: string; // Código PIX Copia e Cola EMV
  status: TaxObligationStatus;
  generatedAt?: string; // Timestamp de geração
  generatedBy?: string; // Usuário que gerou
  paidAt?: string; // Timestamp de liquidação
  paidBy?: string; // Usuário que baixou
  paymentMethod?: string;
  bankAuthentication?: string; // Autenticação bancária / comprovante
  canceledAt?: string; // Timestamp de cancelamento
  canceledBy?: string;
  cancellationReason?: string; // Justificativa obrigatória de cancelamento
  documentFileReference?: string;
  calculationMemory?: TaxCalculationMemory;
  clientName?: string;
  clientCpfCnpj?: string;
  clientStateRegistration?: string;
  notes?: string;
  auditInfo?: {
    createdAt: string;
    createdBy: string;
    lastUpdatedAt?: string;
    lastUpdatedBy?: string;
    changeLogs?: Array<{ timestamp: string; user: string; action: string; details: string }>;
  };
}

export interface AppDatabase {
  companyInfo?: CompanyInfo;
  registeredCompanies?: CompanyInfo[];
  users: User[];
  accessGroups?: AccessGroup[];
  clients: Client[];
  vehicles: Vehicle[];
  parts: Part[];
  sales?: CommercialSale[];
  goodsWithdrawals?: GoodsWithdrawalOrder[];
  carriers?: Carrier[];
  stockMovements?: StockMovement[];
  services: Service[];
  budgets: Budget[];
  serviceOrders: ServiceOrder[];
  history: HistoryEntry[];
  testCases: TestCase[];
  notifications?: SystemNotification[];
  alertSettings?: AlertSettings;
  suppliers?: Supplier[];
  supplierPartPrices?: SupplierPartPrice[];
  quotations?: Quotation[];
  accountsReceivable?: AccountReceivable[];
  accountsPayable?: AccountPayable[];
  financialTransactions?: FinancialTransaction[];
  billingClosings?: BillingClosingOrder[];
  bankStatements?: BankStatement[];
  bankStatementEntries?: BankStatementEntry[];
  paymentMethods?: PaymentMethodOption[];
  maintenanceLogs?: MaintenanceLog[];
  fiscalDocuments?: FiscalDocument[];
  taxObligationGuides?: TaxObligationGuide[];
  boletos?: BoletoDocument[];
  interBranchSales?: InterBranchSaleLogistics[];
  sefazConfig?: SefazApiConfig;
  taxOperationNatures?: TaxOperationNature[];
  taxRules?: TaxRule[];
  xmlImportRecords?: XmlImportRecord[];
  unitsOfMeasure?: UnitOfMeasure[];
  boms?: BillOfMaterials[];
  billOfMaterials?: BillOfMaterials[];
  productionOrders?: ProductionOrder[];
  productLots?: ProductLot[];
  operationalAlerts?: OperationalAlert[];
  installedEquipment?: InstalledEquipment[];
  equipment?: InstalledEquipment[];
  equipmentMaintenancePlans?: EquipmentMaintenancePlan[];
  maintenancePlans?: EquipmentMaintenancePlan[];
  equipmentMaintenanceOrders?: EquipmentMaintenanceOrder[];
  productionScrapLogs?: ProductionScrapLog[];
  productionReworkLogs?: ProductionReworkLog[];
  purchaseHistory?: PurchaseHistoryItem[];
  bomRevisions?: BomRevision[];
  landingContent?: any;
  globalModules?: { [key: string]: boolean };
  loginHistory?: { username: string; name: string; role: string; lastAccess: string }[];
  levelPermissions?: any;

  // Motor Central de Notificações
  notificationRules?: NotificationRule[];
  notificationTemplates?: NotificationTemplate[];
  notificationAuditLogs?: NotificationAuditLog[];
  notificationEngineSettings?: NotificationEngineSettings;

  // Comércio Representante
  representedCompanies?: RepresentedCompany[];
  representativeOrders?: RepresentativeOrder[];
  representativeCommissions?: RepresentativeCommission[];
  representativeReconciliations?: RepresentativeReconciliation[];
}

// ==========================================
// MOTOR CENTRAL DE NOTIFICAÇÕES (Tipos e Modelos)
// ==========================================

export type NotificationChannel = 'system' | 'whatsapp' | 'email';

export type NotificationCriticality = 'normal' | 'atencao' | 'urgente' | 'critico';

export type NotificationTriggerType = 
  | 'receivable_pre_due'     // Fatura a receber prestes a vencer (D-X)
  | 'receivable_due_today'   // Fatura a receber vence hoje (D0)
  | 'receivable_overdue'     // Fatura a receber vencida (D+X)
  | 'payable_pre_due'        // Conta a pagar prestes a vencer (D-X)
  | 'payable_due_today'      // Conta a pagar vence hoje (D0)
  | 'payable_overdue'        // Conta a pagar vencida (D+X)
  | 'low_stock'              // Estoque abaixo do mínimo
  | 'budget_expiring'        // Orçamento vencendo validade
  | 'budget_approved'        // Orçamento aprovado pelo cliente
  | 'so_created'             // Ordem de Serviço aberta
  | 'so_waiting_parts'       // OS aguardando peças
  | 'so_completed'           // OS finalizada
  | 'sale_created'           // Venda balcão emitida
  | 'cash_flow_negative'     // Saldo projetado negativo
  | 'rep_order_sent'         // Pedido enviado para fábrica
  | 'rep_commission_due'     // Comissão de representação a receber
  | 'daily_summary'          // Resumo financeiro diário
  | 'custom';

export type NotificationRecipientType = 'client' | 'supplier' | 'financial' | 'manager' | 'admin' | 'stock' | 'mechanic';

export interface NotificationRule {
  id: string;
  companyId: string;
  name: string;
  triggerType: NotificationTriggerType;
  daysOffset: number; // -3 para 3 dias antes, 0 para no dia, +1, +5 para atraso
  channels: NotificationChannel[]; // ['system', 'whatsapp', 'email']
  templateId: string;
  active: boolean;
  recipients: NotificationRecipientType[];
  criticality: NotificationCriticality;
  escalateAfterDays?: number; // Ex: se atraso > 5 dias, escalar para gerente
  escalateTo?: 'manager' | 'admin';
}

export interface NotificationTemplate {
  id: string;
  companyId?: string; // se undefined, template padrão global
  code: string; // Ex: 'RECEIVABLE_PRE_DUE_3D', 'RECEIVABLE_DUE_TODAY', 'RECEIVABLE_OVERDUE_5D', 'PAYABLE_PRE_DUE', etc.
  name: string;
  triggerType: NotificationTriggerType;
  channel: NotificationChannel;
  emailSubject?: string;
  body: string; // Suporta variáveis: {cliente_nome}, {fornecedor_nome}, {valor_total}, {data_vencimento}, {dias_atraso}, {codigo_documento}, {link_fatura_pix}, {empresa_nome}, {telefone_contato}
  isSystemDefault?: boolean;
}

export interface NotificationAuditLog {
  id: string;
  companyId: string;
  date: string;
  channel: NotificationChannel;
  recipientType: 'client' | 'supplier' | 'internal' | 'custom';
  recipientName: string;
  recipientContact: string; // Telefone/WhatsApp ou E-mail
  sourceDocType: 'receivable' | 'payable' | 'budget' | 'service_order' | 'sale' | 'rep_order' | 'daily_summary' | 'stock' | 'system';
  sourceDocId?: string;
  sourceDocCode?: string;
  subject?: string;
  messageContent: string;
  criticality: NotificationCriticality;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'simulated';
  operatorId?: string;
  operatorName: string; // Ou 'Sistema Automático'
  linkUrl?: string;
  notes?: string;
}

export interface NotificationEngineSettings {
  enabled: boolean;
  enableWhatsApp: boolean;
  enableEmail: boolean;
  enableInApp: boolean;
  groupDailySameRecipient: boolean; // Agrupamento Consolidado (Digest) para não enviar 10 mensagens
  autoEscalateOverdue: boolean; // Escalonar após X dias
  escalateOverdueDaysThreshold: number; // Padrão: 5 dias
  dailySummarySendTime?: string; // Ex: "08:00"
  dailySummaryRecipients?: string[]; // IDs ou papéis que recebem o resumo diário
}

// ==========================================
// COMÉRCIO REPRESENTANTE (Tipos e Modelos)
// ==========================================

export interface RepresentedCompany {
  id: string;
  companyId: string; // Tenant ID
  corporateName: string; // Razão Social da Fábrica
  tradeName: string; // Nome Fantasia
  cnpj: string;
  contactPerson: string;
  email: string;
  phone: string;
  whatsapp: string;
  defaultCommissionPercentage: number; // Ex: 5%
  commissionPaymentRule: 'UPON_INVOICE' | 'UPON_CUSTOMER_PAYMENT' | 'MONTHLY_FIXED_DAY'; // No faturamento, Na liquidação da duplicata, Dia fixo
  commissionPaymentTerms?: string; // Ex: "Até dia 15 do mês seguinte ao faturamento"
  priceTableNotes?: string;
  commercialConditions?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RepresentativeOrderItem {
  id: string;
  partId?: string;
  code?: string;
  description: string;
  quantity: number;
  tablePrice: number;
  discountPercentage: number;
  unitPrice: number;
  totalPrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  invoicedQuantity?: number;
  invoicedUnitPrice?: number;
  invoicedTotalPrice?: number;
  reconciliationStatus?: 'matched' | 'divergent_value' | 'not_invoiced' | 'partial';
}

export type RepresentativeOrderStatus = 
  | 'draft'               // Rascunho
  | 'sent_to_factory'     // Enviado à Fábrica
  | 'factory_confirmed'   // Confirmado pela Fábrica
  | 'invoiced_partial'    // Faturado Parcial
  | 'invoiced_total'      // Faturado Total
  | 'canceled';           // Cancelado

export interface RepresentativeOrder {
  id: string;
  companyId: string; // Tenant
  orderNumber: string; // Ex: 'PREP-2026-001'
  representedId: string; // ID da Representada
  representedName: string;
  clientId: string; // Cliente final comprador
  clientName: string;
  clientCnpjCpf: string;
  orderDate: string;
  estimatedDeliveryDate?: string;
  paymentCondition: string; // Ex: 28/56 dias direto com a fábrica
  carrierName?: string;
  freightType?: 'CIF' | 'FOB';
  items: RepresentativeOrderItem[];
  subtotal: number;
  totalDiscount: number;
  totalOrderAmount: number;
  estimatedTotalCommission: number;
  factoryInvoiceNumber?: string;
  factoryInvoiceDate?: string;
  status: RepresentativeOrderStatus;
  notes?: string;
  sentAt?: string;
  confirmedAt?: string;
  invoicedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RepresentativeCommission {
  id: string;
  companyId: string;
  representedId: string;
  representedName: string;
  orderId: string;
  orderNumber: string;
  factoryInvoiceNumber: string;
  clientId: string;
  clientName: string;
  invoicedAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  expectedPaymentDate: string;
  actualPaymentDate?: string;
  status: 'to_be_invoiced' | 'receivable' | 'received' | 'disputed_glosa';
  financialReceivableId?: string; // Se vinculado ao Contas a Receber
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RepresentativeReconciliation {
  id: string;
  companyId: string;
  fileName: string;
  importedAt: string;
  representedId: string;
  representedName: string;
  totalRecords: number;
  matchedCount: number;
  divergentCount: number;
  pendingCount: number;
  reconciliationItems: Array<{
    id: string;
    orderNumber: string;
    clientCnpj: string;
    clientName?: string;
    factoryInvoiceNumber: string;
    factoryInvoiceDate: string;
    orderAmount: number;
    invoicedAmount: number;
    difference: number;
    orderCommission: number;
    invoicedCommission: number;
    status: 'matched' | 'divergent_value' | 'pending' | 'unmatched';
    notes?: string;
  }>;
}

export type Company = CompanyInfo;

