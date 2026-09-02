/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MOTOR CENTRAL DE SEGURANÇA, RBAC & GESTÃO DE ACESSOS (RBAC v2.0)
 * 
 * Implementa a resolução hierárquica de permissões:
 * 1. Status ativo do usuário (se inativo, todas as permissões são false)
 * 2. Permissões padrão do nível/papel funcional (UserRole)
 * 3. Permissões do Grupo de Acesso vinculado (AccessGroup)
 * 4. Exceções individuais por usuário (individualExceptions override explícito)
 * 5. Super-Admin bypass (para role 'admin' e usuário validador)
 * 6. Isolamento estrito Multi-tenant por companyId
 */

import { User, UserRole, UserPermissions, AccessGroup, AppDatabase, HistoryEntry, CompanyInfo, BusinessType, OperationalAlcada } from '../types';
import { normalizeUserPermissions, isModuleAllowedForBusinessType } from './businessSegmentation';

export const ALL_PERMISSION_KEYS: Array<{
  key: keyof UserPermissions;
  label: string;
  category: 'dashboard' | 'sales' | 'fiscal' | 'purchasing_stock' | 'financial' | 'industrial' | 'admin' | 'operations';
  description: string;
}> = [
  // Dashboard & Geral
  { key: 'accessDashboard', label: 'Painel / Dashboard Principal', category: 'dashboard', description: 'Permite visualizar o painel gerencial de indicadores' },
  { key: 'exportDashboard', label: 'Exportar Relatórios do Dashboard', category: 'dashboard', description: 'Permite exportar dados e gráficos do dashboard' },
  { key: 'accessNotifications', label: 'Notificações & Alertas', category: 'dashboard', description: 'Permite receber e visualizar notificações do sistema' },
  
  // Vendas Balcão & Atendimento
  { key: 'accessSales', label: 'Acesso Vendas Balcão / PDV', category: 'sales', description: 'Permite acessar a tela de vendas de peças e balcão' },
  { key: 'salesCreate', label: 'Criar / Faturar Venda Balcão', category: 'sales', description: 'Permite emitir e concluir novas vendas no balcão' },
  { key: 'salesCancel', label: 'Cancelar / Estornar Venda Balcão', category: 'sales', description: 'Permite cancelar vendas e estornar movimentações de estoque' },
  { key: 'restrictToOwnSales', label: 'Restringir a Vendas Próprias', category: 'sales', description: 'Restringe o operador a visualizar somente suas próprias vendas' },
  { key: 'accessWithdrawals', label: 'Entregas & Retiradas de Balcão', category: 'sales', description: 'Permite gerenciar pedidos de retirada e despacho de mercadorias' },
  { key: 'accessCarriers', label: 'Transportadoras & Logística', category: 'sales', description: 'Permite cadastrar e consultar transportadoras parceiras' },
  { key: 'carriersCreate', label: 'Cadastrar Transportadoras', category: 'sales', description: 'Permite incluir novas empresas de transporte' },
  { key: 'carriersEdit', label: 'Editar Transportadoras', category: 'sales', description: 'Permite alterar dados de transportadoras' },
  { key: 'carriersDelete', label: 'Excluir Transportadoras', category: 'sales', description: 'Permite remover transportadoras cadastradas' },
  { key: 'accessBudgets', label: 'Orçamentos Comerciais', category: 'sales', description: 'Permite acessar o módulo de orçamentos' },
  { key: 'budgetsCreate', label: 'Criar Orçamentos', category: 'sales', description: 'Permite elaborar novas propostas comerciais' },
  { key: 'budgetsEdit', label: 'Editar Orçamentos Abertos', category: 'sales', description: 'Permite alterar itens, peças e valores de orçamentos' },
  { key: 'budgetsApprove', label: 'Aprovar / Converter Orçamentos', category: 'sales', description: 'Permite aprovar e converter orçamento em OS ou Venda' },
  { key: 'budgetsCancel', label: 'Cancelar / Reprovar Orçamentos', category: 'sales', description: 'Permite cancelar propostas de orçamentos' },
  { key: 'budgetsApplyDiscount', label: 'Aplicar Descontos em Orçamento/Venda', category: 'sales', description: 'Permite conceder descontos dentro da alçada estabelecida' },
  { key: 'canEditBudgets', label: 'Editar Orçamentos (Legado/Atalho)', category: 'sales', description: 'Permite alterar itens e dados de orçamentos' },
  
  // Operações de Oficina & Pátio
  { key: 'accessServiceOrders', label: 'Ordens de Serviço (OS)', category: 'operations', description: 'Permite acessar e tramitar ordens de serviço' },
  { key: 'serviceOrdersCreate', label: 'Criar Ordens de Serviço', category: 'operations', description: 'Permite abrir novas ordens de serviço no pátio' },
  { key: 'serviceOrdersEdit', label: 'Editar Ordens de Serviço', category: 'operations', description: 'Permite adicionar peças, laudos e serviços na OS' },
  { key: 'serviceOrdersComplete', label: 'Concluir / Faturar Ordens de Serviço', category: 'operations', description: 'Permite finalizar reparos e enviar para cobrança' },
  { key: 'serviceOrdersCancel', label: 'Cancelar Ordens de Serviço', category: 'operations', description: 'Permite cancelar OS com registro de justificativa' },
  { key: 'serviceOrdersReopen', label: 'Reabrir Ordens de Serviço Concluídas', category: 'operations', description: 'Permite reabrir OS já finalizada para correções' },
  { key: 'serviceOrdersAssignMechanic', label: 'Alocar / Trocar Mecânico Responsável', category: 'operations', description: 'Permite atribuir técnicos e mecânicos à OS' },
  { key: 'accessClients', label: 'Cadastro de Clientes & CRM', category: 'operations', description: 'Permite visualizar e cadastrar clientes' },
  { key: 'clientsCreate', label: 'Cadastrar Novos Clientes', category: 'operations', description: 'Permite registrar novos clientes PF e PJ' },
  { key: 'clientsEdit', label: 'Editar Dados de Clientes', category: 'operations', description: 'Permite atualizar dados cadastrais e endereços' },
  { key: 'clientsDelete', label: 'Excluir Clientes', category: 'operations', description: 'Permite remover cadastros de clientes sem histórico' },
  { key: 'accessVehicles', label: 'Cadastro de Veículos & Frota', category: 'operations', description: 'Permite cadastrar e consultar veículos' },
  { key: 'vehiclesCreate', label: 'Cadastrar Novos Veículos', category: 'operations', description: 'Permite registrar novos veículos na frota' },
  { key: 'vehiclesEdit', label: 'Editar Dados de Veículos', category: 'operations', description: 'Permite atualizar km, dados e histórico veicular' },
  { key: 'vehiclesDelete', label: 'Excluir Veículos', category: 'operations', description: 'Permite remover veículos da base de dados' },
  { key: 'accessServices', label: 'Tabela de Serviços & Mão de Obra', category: 'operations', description: 'Permite consultar catálogo de serviços' },
  { key: 'servicesCreate', label: 'Cadastrar Serviços', category: 'operations', description: 'Permite incluir novos serviços na tabela' },
  { key: 'servicesEdit', label: 'Editar Serviços & Preço Hora', category: 'operations', description: 'Permite atualizar valores de mão de obra e tempos' },
  { key: 'servicesDelete', label: 'Excluir Serviços', category: 'operations', description: 'Permite remover serviços da tabela padrão' },
  { key: 'canCustomizePdf', label: 'Personalizar Layout de PDF', category: 'operations', description: 'Permite customizar cabeçalhos e campos de impressão PDF' },

  // Peças, Estoque & Compras
  { key: 'accessParts', label: 'Catálogo de Peças & Estoque', category: 'purchasing_stock', description: 'Permite consultar saldo e catálogo de autopeças' },
  { key: 'partsCreate', label: 'Cadastrar Novas Peças', category: 'purchasing_stock', description: 'Permite cadastrar novos itens no inventário' },
  { key: 'partsEdit', label: 'Editar Peças & Precificação', category: 'purchasing_stock', description: 'Permite alterar preços, NCM e custos de peças' },
  { key: 'partsDelete', label: 'Excluir Peças do Estoque', category: 'purchasing_stock', description: 'Permite remover itens do cadastro' },
  { key: 'partsImportXml', label: 'Importar XML de Compra (NF-e)', category: 'purchasing_stock', description: 'Permite alimentar estoque via arquivo XML de fornecedor' },
  { key: 'partsAdjustStock', label: 'Ajuste Manual de Inventário', category: 'purchasing_stock', description: 'Permite retificar saldos físicos de peças' },
  { key: 'accessUnitsOfMeasure', label: 'Unidades de Medida & Dimensões', category: 'purchasing_stock', description: 'Permite acessar módulo de unidades de medida (UN, KG, M, M²)' },
  { key: 'unitsOfMeasureCreate', label: 'Cadastrar Unidades de Medida', category: 'purchasing_stock', description: 'Permite criar novas unidades de medida métricas' },
  { key: 'unitsOfMeasureEdit', label: 'Editar Unidades de Medida', category: 'purchasing_stock', description: 'Permite alterar fatores e fórmulas de unidades' },
  { key: 'canViewOtherStoresStock', label: 'Consultar Estoque de Outras Filiais', category: 'purchasing_stock', description: 'Permite visualizar inventário de outras lojas da rede' },
  { key: 'canSellOtherStoresStock', label: 'Vender com Estoque de Outra Loja', category: 'purchasing_stock', description: 'Permite emitir vendas puxando peças de outra filial' },
  { key: 'accessQuotations', label: 'Cotações com Fornecedores', category: 'purchasing_stock', description: 'Permite criar e gerenciar cotações de autopeças' },
  { key: 'quotationsCreate', label: 'Criar Tomada de Preços', category: 'purchasing_stock', description: 'Permite abrir cotações multi-fornecedor' },
  { key: 'quotationsApprove', label: 'Aprovar / Fechar Cotação', category: 'purchasing_stock', description: 'Permite aprovar compras respeitando a alçada em R$' },
  { key: 'accessPurchasing', label: 'Módulo de Compras & Suprimentos', category: 'purchasing_stock', description: 'Acesso completo ao painel de compras' },
  { key: 'accessPurchasingOrders', label: 'Gerar Pedidos de Compra', category: 'purchasing_stock', description: 'Permite gerar ordens de compra oficiais para fornecedores' },
  { key: 'accessPurchasingApprove', label: 'Aprovar Pedidos de Compra', category: 'purchasing_stock', description: 'Permite aprovação de despesas e pedidos de compra' },
  { key: 'accessStockReports', label: 'Relatórios de Estoque & Ponto de Pedido', category: 'purchasing_stock', description: 'Visualizar relatórios de reposição e giro de peças' },

  // Módulo Fiscal & Tributário
  { key: 'accessFiscal', label: 'Acesso Módulo Fiscal SEFAZ', category: 'fiscal', description: 'Acesso geral ao painel e conferência fiscal' },
  { key: 'fiscalView', label: 'Visualizar Documentos Fiscais', category: 'fiscal', description: 'Permite consultar NF-e, NFC-e e NFS-e emitidas' },
  { key: 'fiscalConference', label: 'Conferência Fiscal Pré-Emissão', category: 'fiscal', description: 'Permite auditar e validar notas na fila de conferência' },
  { key: 'fiscalEmit', label: 'Emitir Documentos Fiscais (NFC-e/NF-e)', category: 'fiscal', description: 'Permite autorizar e gerar documentos fiscais' },
  { key: 'fiscalTransmit', label: 'Transmitir Lotes para a SEFAZ', category: 'fiscal', description: 'Permite envio de lotes de notas fiscais à SEFAZ' },
  { key: 'fiscalCancel', label: 'Cancelar NF-e / NFC-e Autorizadas', category: 'fiscal', description: 'Permite solicitar cancelamento de notas com justificativa' },
  { key: 'fiscalInutilize', label: 'Inutilizar Numeração Fiscal', category: 'fiscal', description: 'Permite homologar quebra de numeração na SEFAZ' },
  { key: 'fiscalGenerateGuides', label: 'Gerar Obrigações & Guias Fiscais (GNRE/DARE)', category: 'fiscal', description: 'Permite gerar guias de ICMS-ST, FCP e DIFAL' },
  { key: 'fiscalCancelGuides', label: 'Cancelar Guias Fiscais', category: 'fiscal', description: 'Permite estornar guias de recolhimento tributário' },
  { key: 'accessTaxObligationsReport', label: 'Relatório de Obrigações e Guias Fiscais', category: 'fiscal', description: 'Visualizar e exportar relatórios de tributos apurados' },
  { key: 'fiscalXml', label: 'Download de XMLs Oficiais', category: 'fiscal', description: 'Permite baixar XMLs de distribuição autorizados' },
  { key: 'fiscalReprint', label: 'Reimprimir DANFE / Documentos Fiscais', category: 'fiscal', description: 'Permite reimpressão de DANFEs e cupons fiscais' },
  { key: 'fiscalConfig', label: 'Configuração Fiscal & Certificado A1', category: 'fiscal', description: 'Permite configurar alíquotas, CNAE e certificado digital' },

  // Módulo Financeiro & Cobrança
  { key: 'accessAccountsReceivable', label: 'Contas a Receber & Cobrança', category: 'financial', description: 'Permite consultar e baixar títulos a receber' },
  { key: 'accountsReceivableCreate', label: 'Lançar Títulos a Receber', category: 'financial', description: 'Permite criar faturas e cobranças manuais' },
  { key: 'accountsReceivableSettle', label: 'Liquidar / Baixar Títulos a Receber', category: 'financial', description: 'Permite registrar recebimento de pagamentos' },
  { key: 'accountsReceivableCancel', label: 'Cancelar / Estornar Títulos a Receber', category: 'financial', description: 'Permite estornar faturas e recebimentos' },
  { key: 'accountsReceivableGenerateBoleto', label: 'Gerar Boletos & PIX Dinâmico', category: 'financial', description: 'Permite emitir cobranças bancárias' },
  { key: 'accessAccountsPayable', label: 'Contas a Pagar & Despesas', category: 'financial', description: 'Permite lançar e quitar contas a pagar' },
  { key: 'accountsPayableCreate', label: 'Lançar Contas a Pagar', category: 'financial', description: 'Permite registrar despesas e duplicatas de fornecedores' },
  { key: 'accountsPayableSettle', label: 'Pagar / Baixar Contas a Pagar', category: 'financial', description: 'Permite quitar débitos da empresa' },
  { key: 'accountsPayableCancel', label: 'Cancelar / Estornar Pagamentos', category: 'financial', description: 'Permite anular lançamentos de contas a pagar' },
  { key: 'accountsPayableImportXml', label: 'Importar Boletos & NF-e em Despesas', category: 'financial', description: 'Permite carregar títulos a partir de notas fiscais' },
  { key: 'accessFinancial', label: 'Fluxo de Caixa & Extrato DRE', category: 'financial', description: 'Permite visualizar saúde financeira e DRE' },
  { key: 'financialExport', label: 'Exportar Relatórios Financeiros', category: 'financial', description: 'Permite baixar relatórios de fluxo de caixa e DRE' },
  { key: 'accessBoletos', label: 'Emissão de Boletos & PIX Dinâmico', category: 'financial', description: 'Permite gerar boletos bancários com QR Code PIX' },
  { key: 'boletoGenerate', label: 'Gerar Novos Boletos', category: 'financial', description: 'Permite registrar boletos de cobrança' },
  { key: 'financialBillingClosing', label: 'Fechamento de Faturamento Consolidado', category: 'financial', description: 'Permite consolidar vendas acumuladas em fechamento de fatura' },
  { key: 'financialReopenClosing', label: 'Reabrir Fechamento Financeiro', category: 'financial', description: 'Permite reverter faturamento consolidado com justificativa' },
  { key: 'financialReconciliation', label: 'Conciliação Bancária com Extrato', category: 'financial', description: 'Permite conciliar lançamentos com extrato bancário' },
  { key: 'financialUnreconcile', label: 'Desfazer Conciliação Bancária', category: 'financial', description: 'Permite desfazer conciliação com registro de auditoria' },
  { key: 'authorizeCreditLimitBypass', label: 'Autorizar Venda Acima do Limite de Crédito', category: 'financial', description: 'Permite autorizar operações que ultrapassam limite do cliente' },
  { key: 'accessFinancialReports', label: 'Relatórios Financeiros Avançados', category: 'financial', description: 'Permite emitir relatórios analíticos financeiros' },

  // Administração & Grupos de Acesso
  { key: 'accessUserManagement', label: 'Gestão de Usuários & Segurança', category: 'admin', description: 'Permite cadastrar e gerenciar usuários do sistema' },
  { key: 'accessAccessGroups', label: 'Gestão de Grupos de Acesso (RBAC)', category: 'admin', description: 'Permite criar e gerenciar grupos de permissão' },
  { key: 'accessGroupsCreate', label: 'Criar Grupos de Acesso', category: 'admin', description: 'Permite criar novos grupos de perfil' },
  { key: 'accessGroupsEdit', label: 'Editar Permissões de Grupos', category: 'admin', description: 'Permite alterar a matriz de permissões de grupos' },
  { key: 'accessGroupsDelete', label: 'Excluir / Inativar Grupos de Acesso', category: 'admin', description: 'Permite desativar grupos de acesso' },
  { key: 'accessHistory', label: 'Trilha de Auditoria & Logs', category: 'admin', description: 'Permite auditar histórico completo de ações operacionais' },
  { key: 'historyExport', label: 'Exportar Trilha de Auditoria (CSV/PDF)', category: 'admin', description: 'Permite exportar logs de segurança' },
  { key: 'canViewAllCompaniesHistory', label: 'Auditoria de Todas as Empresas da Rede', category: 'admin', description: 'Permite visualizar logs de todas as filiais' },
  { key: 'accessReports', label: 'Módulo Geral de Relatórios', category: 'admin', description: 'Permite acesso ao centro de relatórios' },
  { key: 'reportsExport', label: 'Exportar Relatórios Gerais (PDF / CSV)', category: 'admin', description: 'Permite exportar dados e relatórios em PDF/CSV' },
  { key: 'accessQAPanel', label: 'Painel de Qualidade & Engenharia QA', category: 'admin', description: 'Acesso aos testes automatizados e suíte QA' },

  // Módulo Industrial / PCP
  { key: 'accessIndustrialDashboard', label: 'Dashboard Industrial / PCP', category: 'industrial', description: 'Visão geral da produção e chão de fábrica' },
  { key: 'accessProductionOrders', label: 'Ordens de Produção (OP)', category: 'industrial', description: 'Gerenciar ordens de manufatura e fabricação' },
  { key: 'accessBillOfMaterials', label: 'Estrutura de Produtos (BOM)', category: 'industrial', description: 'Cadastrar listas técnicas de materiais' },
  { key: 'accessEquipment', label: 'Gestão de Equipamentos & Máquinas', category: 'industrial', description: 'Controle do parque de maquinários industriais' },
  { key: 'accessMaintenance', label: 'Planos de Manutenção Industrial', category: 'industrial', description: 'Gestão de manutenção preventiva e corretiva de máquinas' }
];

/**
 * Retorna as alçadas operacionais padrão com base no papel funcional (Role)
 */
export function getDefaultAlcadasForRole(role: UserRole): OperationalAlcada {
  switch (role) {
    case 'admin':
      return {
        maxDiscountPercent: 100,
        maxPurchaseApprovalAmount: 999999999,
        maxCreditBypassAmount: 999999999,
        maxAccountsPayableSettleAmount: 999999999,
        canCancelInvoices: true,
        canReopenServiceOrders: true,
        canReopenFinancialClosings: true,
        canBypassCreditLimit: true
      };
    case 'gerente':
      return {
        maxDiscountPercent: 20,
        maxPurchaseApprovalAmount: 50000,
        maxCreditBypassAmount: 10000,
        maxAccountsPayableSettleAmount: 25000,
        canCancelInvoices: true,
        canReopenServiceOrders: true,
        canReopenFinancialClosings: true,
        canBypassCreditLimit: true
      };
    case 'financeiro':
      return {
        maxDiscountPercent: 10,
        maxPurchaseApprovalAmount: 20000,
        maxCreditBypassAmount: 5000,
        maxAccountsPayableSettleAmount: 50000,
        canCancelInvoices: true,
        canReopenServiceOrders: false,
        canReopenFinancialClosings: true,
        canBypassCreditLimit: true
      };
    case 'atendente':
      return {
        maxDiscountPercent: 5,
        maxPurchaseApprovalAmount: 0,
        maxCreditBypassAmount: 0,
        maxAccountsPayableSettleAmount: 0,
        canCancelInvoices: false,
        canReopenServiceOrders: false,
        canReopenFinancialClosings: false,
        canBypassCreditLimit: false
      };
    case 'estoquista':
      return {
        maxDiscountPercent: 0,
        maxPurchaseApprovalAmount: 5000,
        maxCreditBypassAmount: 0,
        maxAccountsPayableSettleAmount: 0,
        canCancelInvoices: false,
        canReopenServiceOrders: false,
        canReopenFinancialClosings: false,
        canBypassCreditLimit: false
      };
    case 'mecanico':
      return {
        maxDiscountPercent: 0,
        maxPurchaseApprovalAmount: 0,
        maxCreditBypassAmount: 0,
        maxAccountsPayableSettleAmount: 0,
        canCancelInvoices: false,
        canReopenServiceOrders: false,
        canReopenFinancialClosings: false,
        canBypassCreditLimit: false
      };
    case 'qa':
      return {
        maxDiscountPercent: 100,
        maxPurchaseApprovalAmount: 999999999,
        maxCreditBypassAmount: 999999999,
        maxAccountsPayableSettleAmount: 999999999,
        canCancelInvoices: true,
        canReopenServiceOrders: true,
        canReopenFinancialClosings: true,
        canBypassCreditLimit: true
      };
    default:
      return {
        maxDiscountPercent: 0,
        maxPurchaseApprovalAmount: 0,
        maxCreditBypassAmount: 0,
        maxAccountsPayableSettleAmount: 0,
        canCancelInvoices: false,
        canReopenServiceOrders: false,
        canReopenFinancialClosings: false,
        canBypassCreditLimit: false
      };
  }
}

/**
 * Retorna as alçadas operacionais efetivas consolidadas de um usuário no contexto de uma empresa.
 * Respeita estritamente:
 * 1. Status de ativação da conta (se desativada, todas as alçadas = 0 / false)
 * 2. Alçadas padrão do Role
 * 3. Alçadas do Grupo de Acesso (AccessGroup)
 * 4. Sobrescrita de Exceções Individuais de Alçada (customAlcadas)
 * 5. Contrato e Licenciamento da Empresa
 */
export function getEffectiveAlcadas(
  user: User | string | undefined | null,
  companyId: string | undefined | null,
  db?: AppDatabase | null
): OperationalAlcada {
  if (!user) {
    return getDefaultAlcadasForRole('atendente');
  }

  const userObj: User | undefined = typeof user === 'string'
    ? (db?.users || []).find(u => u.id === user || u.username.toLowerCase() === user.toLowerCase())
    : user;

  if (!userObj) {
    return getDefaultAlcadasForRole('atendente');
  }

  if (userObj.active === false) {
    return {
      maxDiscountPercent: 0,
      maxPurchaseApprovalAmount: 0,
      maxCreditBypassAmount: 0,
      maxAccountsPayableSettleAmount: 0,
      canCancelInvoices: false,
      canReopenServiceOrders: false,
      canReopenFinancialClosings: false,
      canBypassCreditLimit: false
    };
  }

  // 1. Base por Role
  let effectiveAlcadas = getDefaultAlcadasForRole(userObj.role || 'atendente');

  // 2. Grupo de Acesso
  const groupId = userObj.groupId || userObj.accessGroupId;
  if (groupId && db?.accessGroups && db.accessGroups.length > 0) {
    const matchedGroup = db.accessGroups.find(
      g => g.id === groupId && (g.active !== false) && (!g.companyId || !companyId || g.companyId === companyId)
    );
    if (matchedGroup?.alcadas) {
      effectiveAlcadas = {
        ...effectiveAlcadas,
        ...matchedGroup.alcadas
      };
    }
  }

  // 3. Alçadas diretas do usuário
  if (userObj.alcadas) {
    effectiveAlcadas = {
      ...effectiveAlcadas,
      ...userObj.alcadas
    };
  }

  // 4. Exceções individuais customizadas
  if (userObj.customAlcadas) {
    effectiveAlcadas = {
      ...effectiveAlcadas,
      ...userObj.customAlcadas
    };
  }

  // 5. Admin / QA Override
  if (userObj.role === 'admin' || userObj.username.toLowerCase() === 'validador' || userObj.username.toLowerCase() === 'admin') {
    effectiveAlcadas = {
      maxDiscountPercent: 100,
      maxPurchaseApprovalAmount: 999999999,
      maxCreditBypassAmount: 999999999,
      maxAccountsPayableSettleAmount: 999999999,
      canCancelInvoices: true,
      canReopenServiceOrders: true,
      canReopenFinancialClosings: true,
      canBypassCreditLimit: true
    };
  }

  return effectiveAlcadas;
}

/**
 * Valida se um operador possui alçada para realizar uma operação financeira ou crítica.
 */
export function checkOperationalAlcada(
  user: User | string | undefined | null,
  params: {
    action: 'discount' | 'purchase' | 'credit_bypass' | 'payable_settle' | 'cancel_invoice' | 'reopen_os' | 'reopen_closing';
    value?: number;
  },
  companyId: string | undefined | null,
  db?: AppDatabase | null
): { allowed: boolean; reason?: string; requiredRole?: string; maxAllowed?: number } {
  const alcadas = getEffectiveAlcadas(user, companyId, db);

  switch (params.action) {
    case 'discount': {
      const discountVal = Number(params.value || 0);
      const maxAllowed = alcadas.maxDiscountPercent ?? 0;
      if (discountVal > maxAllowed) {
        return {
          allowed: false,
          maxAllowed,
          requiredRole: maxAllowed >= 20 ? 'Administrador' : 'Gerente / Administrador',
          reason: `Desconto de ${discountVal.toFixed(1)}% ultrapassa o limite da sua alçada operacional (Máximo autorizado: ${maxAllowed}%). Operação requer autorização de Gerente ou Administrador.`
        };
      }
      return { allowed: true, maxAllowed };
    }

    case 'purchase': {
      const purchaseVal = Number(params.value || 0);
      const maxAllowed = alcadas.maxPurchaseApprovalAmount ?? 0;
      if (purchaseVal > maxAllowed) {
        return {
          allowed: false,
          maxAllowed,
          requiredRole: 'Gerente / Diretor',
          reason: `Valor da compra (R$ ${purchaseVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede a alçada permitida (R$ ${maxAllowed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Requer aprovação de nível superior.`
        };
      }
      return { allowed: true, maxAllowed };
    }

    case 'credit_bypass': {
      const bypassVal = Number(params.value || 0);
      const maxAllowed = alcadas.maxCreditBypassAmount ?? 0;
      if (!alcadas.canBypassCreditLimit || (maxAllowed > 0 && bypassVal > maxAllowed)) {
        return {
          allowed: false,
          maxAllowed,
          requiredRole: 'Gerente Financeiro / Administrador',
          reason: `Cliente sem limite de crédito suficiente. Sua alçada não permite liberação direta de excesso de crédito (Tolerância máxima: R$ ${maxAllowed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
        };
      }
      return { allowed: true, maxAllowed };
    }

    case 'payable_settle': {
      const settleVal = Number(params.value || 0);
      const maxAllowed = alcadas.maxAccountsPayableSettleAmount ?? 0;
      if (maxAllowed > 0 && settleVal > maxAllowed) {
        return {
          allowed: false,
          maxAllowed,
          requiredRole: 'Financeiro Chefe / Administrador',
          reason: `Liquidação de despesa (R$ ${settleVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede a alçada diária permitida de R$ ${maxAllowed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
        };
      }
      return { allowed: true, maxAllowed };
    }

    case 'cancel_invoice': {
      if (!alcadas.canCancelInvoices) {
        return {
          allowed: false,
          requiredRole: 'Responsável Fiscal / Administrador',
          reason: 'Seu perfil de acesso não possui alçada para cancelamento de documentos fiscais autorizados na SEFAZ.'
        };
      }
      return { allowed: true };
    }

    case 'reopen_os': {
      if (!alcadas.canReopenServiceOrders) {
        return {
          allowed: false,
          requiredRole: 'Gerente da Oficina / Administrador',
          reason: 'A reabertura de Ordens de Serviço concluídas exige perfil de Gerente ou Administrador.'
        };
      }
      return { allowed: true };
    }

    case 'reopen_closing': {
      if (!alcadas.canReopenFinancialClosings) {
        return {
          allowed: false,
          requiredRole: 'Gerente Financeiro / Administrador',
          reason: 'Estorno de fechamento de faturamento consolidado exige alçada gerencial financeira.'
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Validação abrangente de ação operacional que unifica:
 * 1. Licenciamento da Empresa
 * 2. Permissão RBAC do Operador
 * 3. Alçada Operacional
 */
export function validateOperationalAction(
  user: User | string | undefined | null,
  actionKey: keyof UserPermissions,
  companyId: string | undefined | null,
  db: AppDatabase,
  contextData?: {
    actionType?: 'discount' | 'purchase' | 'credit_bypass' | 'payable_settle' | 'cancel_invoice' | 'reopen_os' | 'reopen_closing';
    value?: number;
  }
): { allowed: boolean; reason?: string } {
  // 1. Permissão RBAC e Licenciamento
  const hasPerm = hasUserPermission(user, actionKey, companyId, db);
  if (!hasPerm) {
    return {
      allowed: false,
      reason: `Acesso negado: Você não possui a permissão '${actionKey}' ou o módulo correspondente não está contratado para sua empresa.`
    };
  }

  // 2. Alçada Operacional se informada
  if (contextData?.actionType) {
    const alcadaCheck = checkOperationalAlcada(user, {
      action: contextData.actionType,
      value: contextData.value
    }, companyId, db);

    if (!alcadaCheck.allowed) {
      return {
        allowed: false,
        reason: alcadaCheck.reason
      };
    }
  }

  return { allowed: true };
}

/**
 * Verifica se um módulo está efetivamente contratado pela empresa (SaaS Licensing)
 * Respeita a hierarquia:
 * 1. Segmentação do Tenant (isModuleAllowedForBusinessType)
 * 2. Módulos Globais / Assinatura da Empresa (company.globalModules ou company.modules)
 */
export function isModuleContractedForCompany(
  permissionKey: string,
  company?: CompanyInfo | null,
  businessType?: BusinessType | string | null
): boolean {
  if (permissionKey === 'accessUserManagement') {
    return true;
  }

  const effectiveBusinessType = (businessType || company?.businessType || 'OFICINA') as BusinessType;

  // 1. Centralized Segmentation Check
  if (!isModuleAllowedForBusinessType(permissionKey, effectiveBusinessType)) {
    return false;
  }

  // 2. Company Subscription / Global Modules Check (Contract source of truth)
  if (company?.globalModules && typeof company.globalModules === 'object') {
    if (company.globalModules[permissionKey] !== undefined) {
      return Boolean(company.globalModules[permissionKey]);
    }
  }

  // 3. Fallback to company.modules (legacy/alternative map) if present
  if (company?.modules && typeof company.modules === 'object') {
    const rawModules = company.modules as any;
    const modMap: Record<string, boolean | undefined> = {
      accessDashboard: rawModules.dashboard,
      accessSales: rawModules.sales,
      accessWithdrawals: rawModules.withdrawals,
      accessCarriers: rawModules.carriers,
      accessBudgets: rawModules.budgets,
      accessServiceOrders: rawModules.serviceOrders,
      accessClients: rawModules.clients,
      accessVehicles: rawModules.vehicles,
      accessParts: rawModules.inventory,
      accessUnitsOfMeasure: rawModules.unitsOfMeasure,
      accessServices: rawModules.services,
      accessQuotations: rawModules.quotations,
      accessFinancial: rawModules.financial,
      accessAccountsReceivable: rawModules.financial,
      accessAccountsPayable: rawModules.financial,
      accessFiscal: rawModules.fiscal,
      accessHistory: rawModules.history,
      accessReports: rawModules.reports,
      accessProduction: rawModules.production ?? rawModules.industry,
      accessIndustrialDashboard: rawModules.production ?? rawModules.industry,
      accessQAPanel: rawModules.qaPanel,
    };
    if (modMap[permissionKey] !== undefined) {
      return Boolean(modMap[permissionKey]);
    }
  }

  return true;
}

export function getEffectivePermissions(
  user: User | string | undefined | null,
  companyId: string | undefined | null,
  db?: AppDatabase | null
): UserPermissions {
  // Se usuário não fornecido, retorna todas as permissões como falso
  if (!user) {
    return normalizeUserPermissions({}, 'atendente');
  }

  // Se passou apenas o ID do usuário como string, busca no DB
  const userObj: User | undefined = typeof user === 'string'
    ? (db?.users || []).find(u => u.id === user || u.username.toLowerCase() === user.toLowerCase())
    : user;

  if (!userObj) {
    return normalizeUserPermissions({}, 'atendente');
  }

  // 1. Verificação de status ativo: Se o usuário estiver inativo, bloqueia todas as ações
  if (userObj.active === false) {
    const disabledPerms: any = {};
    ALL_PERMISSION_KEYS.forEach(p => {
      disabledPerms[p.key] = false;
    });
    return disabledPerms as UserPermissions;
  }

  // 2. Base de permissões a partir do papel (Role) e permissões explícitas do usuário
  let basePerms = normalizeUserPermissions(userObj.permissions || {}, userObj.role || 'atendente');

  // 3. Se o usuário estiver vinculado a um Grupo de Acesso específico (AccessGroup)
  const groupId = userObj.groupId || userObj.accessGroupId;
  if (groupId && db?.accessGroups && db.accessGroups.length > 0) {
    const matchedGroup = db.accessGroups.find(
      g => g.id === groupId && (g.active !== false) && (!g.companyId || !companyId || g.companyId === companyId)
    );
    if (matchedGroup && matchedGroup.permissions) {
      basePerms = {
        ...basePerms,
        ...matchedGroup.permissions
      };
    }
  }

  // 4. Aplicação de Exceções Individuais de Permissões (individualExceptions ou customPermissions)
  if (userObj.individualExceptions && typeof userObj.individualExceptions === 'object') {
    Object.keys(userObj.individualExceptions).forEach(permKey => {
      const exceptionValue = userObj.individualExceptions![permKey];
      if (typeof exceptionValue === 'boolean') {
        (basePerms as any)[permKey] = exceptionValue;
      }
    });
  }

  if (userObj.customPermissions && typeof userObj.customPermissions === 'object') {
    Object.keys(userObj.customPermissions).forEach(permKey => {
      const customVal = (userObj.customPermissions as any)[permKey];
      if (typeof customVal === 'boolean') {
        (basePerms as any)[permKey] = customVal;
      }
    });
  }

  // 5. CAMADA DE LICENCIAMENTO E CONTRATO SAAS (CT-LIC-11 a CT-LIC-18)
  // Regra Inviolável: Nenhum usuário, inclusive Admin/Master, acessa módulo não contratado pela empresa.
  // Hierarquia: Contrato da Empresa -> Segmentação -> Grupo RBAC -> Usuário -> Permissão Efetiva
  const targetCompany = (db?.registeredCompanies && db.registeredCompanies.length > 0)
    ? (db.registeredCompanies.find(c => c.id === companyId) || db.registeredCompanies.find(c => c.id === (typeof user === 'object' ? user?.companyId : undefined)) || db.companyInfo)
    : db?.companyInfo;

  if (targetCompany) {
    const effectiveBt = targetCompany.businessType || 'OFICINA';
    ALL_PERMISSION_KEYS.forEach(pKey => {
      if (pKey.key === 'accessUserManagement' || pKey.key === 'accessQAPanel') {
        return; // Ferramentas centrais de administração e testes
      }
      const isContracted = isModuleContractedForCompany(pKey.key, targetCompany, effectiveBt);
      if (!isContracted) {
        (basePerms as any)[pKey.key] = false;
      }
    });

    // Bloqueio em cascata de sub-permissões quando o módulo pai não está contratado
    if (!isModuleContractedForCompany('accessFiscal', targetCompany, effectiveBt)) {
      basePerms.fiscalView = false;
      basePerms.fiscalConference = false;
      basePerms.fiscalEmit = false;
      basePerms.fiscalTransmit = false;
      basePerms.fiscalCancel = false;
      basePerms.fiscalInutilize = false;
      basePerms.fiscalGenerateGuides = false;
      basePerms.fiscalCancelGuides = false;
      basePerms.accessTaxObligationsReport = false;
    }
    if (!isModuleContractedForCompany('accessFinancial', targetCompany, effectiveBt)) {
      basePerms.financialBillingClosing = false;
      basePerms.financialReopenClosing = false;
      basePerms.financialReconciliation = false;
      basePerms.financialUnreconcile = false;
      basePerms.financialExport = false;
    }
    if (!isModuleContractedForCompany('accessProduction', targetCompany, effectiveBt)) {
      basePerms.accessIndustrialDashboard = false;
      basePerms.accessManufacturing = false;
      basePerms.accessProductionOrders = false;
      basePerms.accessBillOfMaterials = false;
      basePerms.accessProductStructure = false;
      basePerms.createProductStructure = false;
      basePerms.editProductStructure = false;
      basePerms.approveProductStructure = false;
      basePerms.accessIndustrialStock = false;
      basePerms.accessIndustrialPurchasing = false;
      basePerms.accessIndustrialCosts = false;
      basePerms.accessLots = false;
      basePerms.accessProductionReports = false;
      basePerms.accessIndustrialReports = false;
      basePerms.accessCommercialReports = false;
      basePerms.accessMaintenance = false;
      basePerms.createMaintenance = false;
      basePerms.editMaintenance = false;
      basePerms.approveMaintenance = false;
      basePerms.accessEquipment = false;
      basePerms.accessIndustrialAudit = false;
      basePerms.productionOrderCreate = false;
      basePerms.productionOrderEdit = false;
      basePerms.productionOrderApprove = false;
      basePerms.productionOrderCancel = false;
      basePerms.productionOrderComplete = false;
      basePerms.bomCreate = false;
      basePerms.bomEdit = false;
    }
  }

  return basePerms;
}

/**
 * Verifica se um usuário possui uma permissão específica de forma segura.
 */
export function hasUserPermission(
  user: User | string | undefined | null,
  permissionKey: keyof UserPermissions,
  companyId: string | undefined | null,
  db: AppDatabase
): boolean {
  if (!user) return false;
  const effective = getEffectivePermissions(user, companyId, db);
  return Boolean(effective[permissionKey]);
}

export type SecurityAuditAction = 
  | 'GROUP_CREATED' 
  | 'GROUP_UPDATED' 
  | 'GROUP_DELETED' 
  | 'GROUP_ASSIGNED' 
  | 'EXCEPTION_APPLIED' 
  | 'USER_PERMISSIONS_OVERRIDDEN'
  | 'USER_UPDATED'
  | 'ALCADA_OVERRIDDEN'
  | 'ALCADA_UPDATED'
  | 'LICENSE_MODULE_MODIFIED'
  | 'MODULE_CONTRACT_CHANGED'
  | 'LICENSE_ACTIVATED'
  | 'LICENSE_DEACTIVATED'
  | 'FISCAL_TRANSMIT' 
  | 'FISCAL_CANCEL' 
  | 'GUIDE_GENERATED' 
  | 'GUIDE_PAID' 
  | 'GUIDE_CANCELED' 
  | 'CREDIT_BYPASS' 
  | 'CLOSING_REOPENED'
  | 'OS_REOPENED'
  | 'DISCOUNT_AUTHORIZED'
  | 'PURCHASE_APPROVED'
  | string;

/**
 * Cria uma entrada estruturada de auditoria para operações de segurança, RBAC e fiscais.
 */
export function createSecurityAuditLog(params: {
  userId: string;
  userName: string;
  companyId: string;
  action: SecurityAuditAction;
  title: string;
  description: string;
  targetRecordId?: string;
  previousValue?: string | object;
  newValue?: string | object;
  justification?: string;
}): HistoryEntry {
  const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  let formattedDetails = params.description;
  if (params.justification) {
    formattedDetails += ` | Justificativa: "${params.justification}"`;
  }
  if (params.previousValue || params.newValue) {
    formattedDetails += ` | De: [${typeof params.previousValue === 'object' ? JSON.stringify(params.previousValue) : params.previousValue}] -> Para: [${typeof params.newValue === 'object' ? JSON.stringify(params.newValue) : params.newValue}]`;
  }

  return {
    id: `log-sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: dateStr,
    timestamp: dateStr,
    type: 'system',
    title: `[RBAC / AUDIT] ${params.title}`,
    description: `${formattedDetails} (Operador: ${params.userName} [ID: ${params.userId}])`,
    clientId: 'N/A',
    vehicleId: 'N/A',
    companyId: params.companyId,
    userId: params.userId,
    userName: params.userName,
    action: params.action,
    justification: params.justification,
    targetRecordId: params.targetRecordId,
    previousValue: params.previousValue,
    newValue: params.newValue
  };
}
