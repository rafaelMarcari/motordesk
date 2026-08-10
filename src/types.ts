/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemNotification {
  id: string;
  type: 'stock_low' | 'budget_created' | 'service_order_created' | 'budget_converted' | 'stock_expired' | 'credit_limit_exceeded' | 'price_approval_required' | 'os_closed_by_mechanic' | 'system';
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
    conversionType?: 'TOTAL' | 'PARCIAL';
    completionType?: 'TOTAL' | 'PARCIAL';
    itemsCount?: number;
    totalItemsCount?: number;
    availableStock?: number;
    minStock?: number;
    releasedItemsCount?: number;
    clientId?: string;
    clientName?: string;
    creditLimit?: number;
    currentDebt?: number;
    attemptedAmount?: number;
    receivableId?: string;
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
  enableServiceOrderCreatedAlerts: boolean; // Alerta quando uma OS é feita
  enableBudgetConvertedAlerts: boolean; // Alerta quando orçamento vira OS (Total/Parcial)
  enableStockReservedExpirationAlerts: boolean; // Alerta quando os itens de um orçamento expirado voltam ao estoque
  defaultBudgetValidityDays: number; // Prazo padrão de validade de orçamentos (ex: 10 dias)

  // Política / Regra de Cobrança e Recebimento da Oficina
  defaultPaymentRequirementMode?: PaymentRequirementMode; // 'AFTER_COMPLETION' (100% no encerramento) | 'ADVANCE_DEPOSIT' (Sinal %) | 'FULL_ADVANCE' (100% Antecipado)
  defaultDepositPercentage?: number; // % padrão de sinal/entrada (ex: 30%, 50%)
  requireDepositToExecuteOS?: boolean; // Bloquear/Alertar no semáforo se o sinal de entrada não foi pago antes de iniciar
  allowPerClientPaymentOverride?: boolean; // Permite regra de pagamento customizada por cliente
}

export type UserRole = 'admin' | 'atendente' | 'mecanico' | 'qa';

/**
 * Interface para armazenar dados cadastrais da empresa/oficina contratante do MotorDesk.
 * Inclui canal oficial de WhatsApp, CNPJ e endereço para emissão de orçamentos e Ordens de Serviço.
 */
export interface CompanyInfo {
  id: string;
  name: string; // Nome Fantasia ou Razão Social da Oficina
  tradeName?: string; // Nome Fantasia da Oficina
  cnpj: string; // CNPJ da Empresa
  phone: string; // Telefone Fixo de Contato
  whatsapp: string; // WhatsApp Oficial de Atendimento da Oficina (com DDD)
  email: string; // E-mail da Oficina
  address: string; // Endereço Completo
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

  // Responsável Legal & Contrato de Prestação de Serviços (SaaS)
  legalRepresentativeName?: string; // Nome do Responsável Legal conforme legislação
  legalRepresentativeCpf?: string; // CPF do Responsável Legal
  signedContractUrl?: string; // Base64 ou URL do arquivo do Contrato Assinado
  signedContractFileName?: string; // Nome do Arquivo do Contrato Assinado
  signedContractDate?: string; // Data de Envio/Assinatura do Contrato Assinado
  contractStatus?: 'pending' | 'signed'; // Status do Contrato ('pending' | 'signed')

  // Matriz de Liberação de Módulos por Perfil para esta Empresa
  levelPermissions?: { [key in UserRole]?: UserPermissions };
  // Liberação / Bloqueio Global de Módulos desta Empresa
  globalModules?: { [key: string]: boolean };

  // DADOS FISCAIS DO EMITENTE (ARQUITETURA MOTOR DESK FISCAL)
  stateRegistration?: string; // Inscrição Estadual (IE)
  cityRegistration?: string;  // Inscrição Municipal (IM)
  cnaeCode?: string;         // CNAE Principal (Ex: 4520-0/01 Oficina Mecânica)
  crt?: '1' | '2' | '3';      // CRT: 1-Simples Nacional, 2-Simples Excesso, 3-Lucro Presumido/Real
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
  accessQuotations?: boolean;
  accessNotifications?: boolean;
  accessAccountsReceivable?: boolean;
  accessAccountsPayable?: boolean;
  accessFinancial?: boolean;
  accessFiscal?: boolean;
  canEditBudgets?: boolean; // Permissão para editar orçamentos existentes (adicionar itens e alterar dados)
  canCustomizePdf?: boolean; // Permissão para personalizar e editar layout de campos no PDF
  canViewOtherStoresStock?: boolean; // Permissão para visualizar estoque de outras lojas/filiais da rede
  canSellOtherStoresStock?: boolean; // Permissão para realizar venda / OS com peças do estoque de outras lojas/filiais
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string; // Storing as plaintext/simulated hash for simple demo settings
  permissions: UserPermissions;
  companyId?: string; // ID da empresa/oficina à qual o usuário pertence
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

export interface Part {
  id: string;
  name: string;
  code: string;
  stock: number;
  price: number; // Preço de Venda
  companyId?: string;
  costPrice?: number; // Preço de Custo / Compra
  minStock?: number; // Alerta de Estoque Mínimo
  category?: string; // Categoria (Freios, Suspensão, Óleos, Filtros, Elétrica, Motor, etc.)
  location?: string; // Localização no Galpão/Prateleira
  unit?: string; // Unidade de Medida (UN, CX, L, KG, PÇ, PAR)
  lastSupplier?: string; // Nome ou CNPJ do Fornecedor da NFe
  isPeriodic?: boolean; // Se o produto/peça é periódico (óleo, filtro, pneu, etc.)
  maintenanceControl?: ServiceMaintenanceControl;
  isCrossSell?: boolean; // Se possui venda casada (serviço ou produto vinculado)
  crossSellItems?: CrossSellItem[]; // Lista de itens casados automaticamente
  
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
  reason: string; // Ex: "Importação NFe #1042", "Ajuste de Inventário", "Baixa por Ordem de Serviço OS-001"
  supplierOrNFe?: string;
  date: string;
  userName: string;
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
  serviceNotes?: string; // Campo de texto livre com informação pertinente ao serviço/item
  reservationAgreement?: string; // Combinado/acordo com o cliente sobre a reserva de estoque
  priceChangeApproval?: PriceChangeApproval;
  isWarrantyCovered?: boolean; // Se este item/serviço específico é coberto por garantia (sem custo)
  warrantyNotes?: string; // Observações da cobertura em garantia
}

export interface Budget {
  id: string;
  clientId: string;
  vehicleId: string;
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
}

export interface HistoryEntry {
  id: string;
  vehicleId: string;
  clientId: string;
  companyId?: string;
  type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system';
  title: string;
  description: string;
  date: string;
  userId: string;
  userName: string;
  metadata?: any; // total values, item counts, etc.
}

export interface TestCase {
  id: string;
  code: string; // CT001, CT002...
  requirement: string; // RF001, RN001...
  title: string;
  category: 'Funcional' | 'Regra de Negócio' | 'Permissões' | 'Fluxo Principal';
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

export interface Supplier {
  id: string;
  name: string; // Nome / Razão Social
  tradeName?: string; // Nome Fantasia
  cnpjCpf: string;
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

export interface AccountInstallment {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  paymentDate?: string;
  paymentMethod?: string; // PIX, Cartão, Dinheiro, Boleto
  receiptNotes?: string;
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
  // Linkages to NF-e and Boleto
  billingType?: 'immediate' | 'monthly_batch';
  billingMonth?: string; // Ex: "2026-07"
  nfeId?: string;
  nfeCode?: string;
  nfeStatus?: 'authorized' | 'draft' | 'transmitting' | 'rejected' | 'canceled';
  nfeAccessKey?: string;
  boletoId?: string;
  boletoCode?: string;
  boletoStatus?: 'registered' | 'paid' | 'overdue' | 'canceled';
  boletoBarcode?: string;
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
  type: 'nfe_product' | 'nfse_service' | 'nfe_transfer' | 'nfe_order_delivery';
  status: 'draft' | 'transmitting' | 'authorized' | 'rejected' | 'canceled' | 'cce_issued';
  accessKey: string; // Chave de acesso SEFAZ (44 dígitos)
  protocolNumber?: string; // Protocolo de autorização SEFAZ
  issueDate: string; // YYYY-MM-DD
  issuedAt: string; // YYYY-MM-DD HH:mm:ss
  companyId: string;
  companyName: string;
  companyCnpj: string;
  targetBranchId?: string;
  targetBranchName?: string;
  targetBranchCnpj?: string;
  clientId?: string;
  clientName?: string;
  clientCpfCnpj?: string;
  serviceOrderId?: string;
  budgetId?: string;
  receivableId?: string;
  receivableCode?: string;
  cfop: string; // Ex: '5.102' (Venda), '5.152' (Transferência de mercadoria), '5.923' (Remessa)
  totalProducts: number;
  totalServices: number;
  totalTaxes: number;
  
  // Totais da Reforma Tributária 2026
  totalIbs?: number;        // R$ Total IBS
  totalCbs?: number;        // R$ Total CBS
  totalIbsCbs?: number;     // R$ Total IBS + CBS (Alíquota Teste 1,0%)
  
  totalAmount: number;
  items: FiscalDocumentItem[];
  cceNotes?: string; // Carta de Correção Eletrônica
  sefazStatusMessage: string; // Ex: "100 - Autorizado o uso da NF-e"
  xmlContent?: string;
  environment: 'homologation' | 'production';
  logisticsOption?: 'WAIT_TRANSFER_AT_BUYSTORE' | 'PAY_BUYSTORE_PICKUP_STOCKSTORE';
  transferNfeId?: string;
  salesNfeId?: string;
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
  status: 'registered' | 'paid' | 'overdue' | 'canceled';
  companyId: string;
  serviceOrderId?: string;
  receivableId?: string;
  nfeAccessKey?: string;
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
  certificateStatus: 'A1_ACTIVE' | 'EXPIRED' | 'NOT_CONFIGURED';
  certificateName: string;
  certificateExpirationDate: string;
  autoTransmit: boolean;
  taxRegime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  stateRegistration?: string; // Inscrição Estadual (IE)
  cityRegistration?: string;  // Inscrição Municipal (IM)
  cnaeCode?: string;         // CNAE Fiscal Principal
  nfeSeries?: string;
  nextNfeNumber?: number;
  nfseSeries?: string;
  nextNfseNumber?: number;
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
}


