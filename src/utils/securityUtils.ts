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

import { User, UserRole, UserPermissions, AccessGroup, AppDatabase, HistoryEntry, CompanyInfo, BusinessType, OperationalAlcada, ViewID } from '../types';
import { normalizeUserPermissions, isModuleAllowedForBusinessType, isViewAllowedForBusinessType, normalizeBusinessType, getDefaultGlobalModulesForBusinessType } from './businessSegmentation';

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
  { key: 'accessMaintenance', label: 'Planos de Manutenção Industrial', category: 'industrial', description: 'Gestão de manutenção preventiva e corretiva de máquinas' },

  // Motor Central de Notificações
  { key: 'accessNotificationEngine', label: 'Motor Central de Notificações', category: 'admin', description: 'Acesso e configuração do motor central de notificações multicanal' },
  { key: 'notificationTemplatesEdit', label: 'Editar Templates de Notificações', category: 'admin', description: 'Permite alterar textos e variáveis dos templates de mensagens' },
  { key: 'notificationRulesEdit', label: 'Editar Réguas de Notificação', category: 'admin', description: 'Permite configurar prazos (D-X, D0, D+X) e canais das regras' },
  { key: 'notificationSendManual', label: 'Disparo Manual de Notificações', category: 'operations', description: 'Permite enviar lembretes e mensagens manuais via WhatsApp/E-mail' },

  // Comércio Representante
  { key: 'accessRepresentativeCommerce', label: 'Comércio Representante (Fábricas & Pedidos)', category: 'sales', description: 'Acesso ao módulo de representação comercial, pedidos e comissões' },
  { key: 'accessRepresentativeOrders', label: 'Pedidos da Representada (Envio & Fábricas)', category: 'sales', description: 'Emissão, indexação e acompanhamento de pedidos enviados e recebidos da representada' },
  { key: 'representativeOrdersCreate', label: 'Criar Pedidos para Fábrica', category: 'sales', description: 'Permite registrar novos pedidos de vendas direcionados às fábricas' },
  { key: 'representativeOrdersEdit', label: 'Editar Pedidos da Representada', category: 'sales', description: 'Permite alterar itens e condições comerciais dos pedidos' },
  { key: 'representativeOrdersCancel', label: 'Cancelar Pedidos da Representada', category: 'sales', description: 'Permite cancelar pedidos emitidos para a fábrica' },
  { key: 'representativeOrdersExport', label: 'Exportar Pedidos e Resumo WhatsApp', category: 'sales', description: 'Permite gerar relatórios e resumos de pedidos para envio à fábrica' },
  { key: 'representativeReconcile', label: 'Conferência de Faturamento da Fábrica', category: 'sales', description: 'Permite importar e conciliar arquivos de faturamento das representadas' },
  { key: 'representativeCommissionsManage', label: 'Gestão e Baixa de Comissões', category: 'financial', description: 'Permite gerenciar, conferir e faturar comissões de representação' },
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

  // 5. Admin / Operador de Gestão
  if (userObj.role === 'admin') {
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
 * Verifica se a empresa está ativa e com contrato regular (não suspensa/inadimplente/bloqueada)
 * Regra: Empresa inativa/bloqueada/vencida tem ACESSO NEGADO A TUDO
 */
export function isCompanyActive(company?: CompanyInfo | null): boolean {
  if (!company) return false;
  if (company.subscriptionStatus === 'blocked' || company.subscriptionStatus === 'overdue') {
    return false;
  }
  if (company.paymentStatus === 'overdue') {
    if (company.expirationDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (company.expirationDate < today) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Verifica se um módulo está efetivamente contratado pela empresa (SaaS Licensing)
 * Respeita a hierarquia inviolável:
 * 1. Empresa Ativa (isCompanyActive)
 * 2. Segmentação do Tenant (isModuleAllowedForBusinessType)
 * 3. Contrato Explícito (company.contractModules ou company.globalModules ou company.modules)
 *
 * REGRA CRÍTICA: Nenhum perfil de usuário (nem ADMIN nem MASTER) ultrapassa o contrato.
 */
export function isModuleContractedForCompany(
  permissionKey: string,
  company?: CompanyInfo | null,
  businessType?: BusinessType | string | null
): boolean {
  const effectiveBusinessType = (businessType || company?.businessType || 'OFICINA') as BusinessType;

  // 1. Centralized Segmentation Check: módulo precisa ser compatível com o segmento da empresa
  if (!isModuleAllowedForBusinessType(permissionKey, effectiveBusinessType)) {
    return false;
  }

  // 2. Explicit Contract Modules (com status granular: active, suspended, canceled e vigência)
  if (company?.contractModules && typeof company.contractModules === 'object') {
    const contractItem = (company.contractModules as any)[permissionKey];
    if (contractItem && typeof contractItem === 'object') {
      if (contractItem.contracted === false || contractItem.status === 'canceled' || contractItem.status === 'suspended') {
        return false;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (contractItem.startDate && contractItem.startDate > today) return false;
      if (contractItem.endDate && contractItem.endDate < today) return false;
      return true;
    }
  }

  // 3. Company Subscription / Global Modules Check (Contract source of truth)
  if (company?.globalModules && typeof company.globalModules === 'object') {
    let val = company.globalModules[permissionKey];
    if (val === undefined && permissionKey === 'accessNotificationEngine') {
      val = company.globalModules['accessNotificationsEngine'];
    }
    if (val === undefined && permissionKey === 'accessNotificationsEngine') {
      val = company.globalModules['accessNotificationEngine'];
    }
    if (val === undefined && permissionKey === 'accessRepresentativeOrders') {
      val = company.globalModules['accessRepresentativeOrders'] ?? company.globalModules['accessRepresentativeCommerce'] ?? company.globalModules['representative_commerce'];
    }
    // Tratamento dinâmico de Boletos Bancários e Cobrança
    const isBoletoKey = 
      permissionKey === 'accessBoletos' || 
      permissionKey === 'boletoGenerate' || 
      permissionKey === 'boletoView' || 
      permissionKey === 'boletoReprint' || 
      permissionKey === 'boletoConfig';

    if (val === undefined && isBoletoKey) {
      if (company.globalModules['accessBoletos'] !== undefined) {
        val = company.globalModules['accessBoletos'];
      } else if (company.globalModules['boletos'] !== undefined) {
        val = company.globalModules['boletos'];
      } else if (company.globalModules['accessFiscal'] === true || company.globalModules['accessFinancial'] === true) {
        // Se a empresa possui o ecossistema Fiscal ou Financeiro contratado, boletos são liberados
        val = true;
      }
    }

    if (val !== undefined) {
      return Boolean(val);
    }
    // If company defines an explicit contract with configured modules, any omitted module is NOT contracted
    if (Object.keys(company.globalModules).length > 0) {
      // Exceção apenas para ferramentas fundamentais de gestão se não explicitadas
      if (permissionKey === 'accessDashboard' || permissionKey === 'accessUserManagement') {
        return true;
      }
      return false;
    }
  }

  // 4. Fallback to company.modules (legacy/alternative map) if present
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
      accessBoletos: rawModules.boletos ?? rawModules.accessBoletos ?? rawModules.fiscal ?? rawModules.financial,
      boletoGenerate: rawModules.boletos ?? rawModules.accessBoletos ?? rawModules.fiscal ?? rawModules.financial,
      boletoView: rawModules.boletos ?? rawModules.accessBoletos ?? rawModules.fiscal ?? rawModules.financial,
      boletoReprint: rawModules.boletos ?? rawModules.accessBoletos ?? rawModules.fiscal ?? rawModules.financial,
      boletoConfig: rawModules.boletos ?? rawModules.accessBoletos ?? rawModules.fiscal ?? rawModules.financial,
      accessHistory: rawModules.history,
      accessReports: rawModules.reports,
      accessProduction: rawModules.production ?? rawModules.industry,
      accessIndustrialDashboard: rawModules.production ?? rawModules.industry,
      accessQAPanel: rawModules.qaPanel,
      accessNotificationEngine: rawModules.notifications_engine,
      accessNotificationsEngine: rawModules.notifications_engine,
      accessRepresentativeCommerce: rawModules.representative_commerce ?? company.enableRepresentativeCommerce,
      accessRepresentativeOrders: rawModules.representative_orders ?? rawModules.representative_commerce ?? company.enableRepresentativeCommerce,
    };
    if (modMap[permissionKey] !== undefined) {
      return Boolean(modMap[permissionKey]);
    }
  }

  if ((permissionKey === 'accessRepresentativeCommerce' || permissionKey === 'accessRepresentativeOrders') && company?.enableRepresentativeCommerce === false) {
    return false;
  }

  // 5. Default business type modules fallback
  const defaultModules = getDefaultGlobalModulesForBusinessType(effectiveBusinessType);
  if (defaultModules[permissionKey] !== undefined) {
    return Boolean(defaultModules[permissionKey]);
  }

  return true;
}

export function getEffectivePermissions(
  user: User | string | undefined | null,
  companyOrId?: CompanyInfo | string | undefined | null,
  db?: AppDatabase | null
): UserPermissions {
  // Se usuário não fornecido, retorna todas as permissões como falso
  if (!user) {
    return normalizeUserPermissions({}, 'atendente');
  }

  const companyId = typeof companyOrId === 'string' ? companyOrId : companyOrId?.id;
  const directCompany = typeof companyOrId === 'object' && companyOrId !== null ? companyOrId : undefined;

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

  // 3. REGRA DO GRUPO DE ACESSO (se o usuário estiver vinculado a um Grupo de Acesso)
  const groupId = userObj.groupId || userObj.accessGroupId;
  if (groupId && db?.accessGroups && db.accessGroups.length > 0) {
    const matchedGroup = db.accessGroups.find(
      g => g.id === groupId && (g.active !== false) && (!g.companyId || !companyId || g.companyId === companyId)
    );
    if (matchedGroup && matchedGroup.permissions) {
      const groupPerms = matchedGroup.permissions;
      (Object.keys(groupPerms) as (keyof UserPermissions)[]).forEach(permKey => {
        const gVal = groupPerms[permKey];
        if (typeof gVal === 'boolean') {
          if (!gVal) {
            // Grupo de acesso revoga explicitamente
            (basePerms as any)[permKey] = false;
          } else {
            // Grupo concede, mas verifica se o usuário NÃO desmarcou individualmente
            const userExplicitFalse = (userObj.permissions && userObj.permissions[permKey] === false) ||
                                      (userObj.individualExceptions && userObj.individualExceptions[permKey] === false);
            if (!userExplicitFalse) {
              (basePerms as any)[permKey] = true;
            } else {
              (basePerms as any)[permKey] = false;
            }
          }
        }
      });
    }
  }

  // 4. REGRA: LIBERADO AO USUÁRIO (Prevalência estrita de revogações e exceções individuais do usuário)
  // Se no cadastro do operador (userObj.permissions) a tela foi desmarcada/removida,
  // ela é ESTRITAMENTE FALSE, nenhuma role ou grupo sobrepõe a remoção individual!
  if (userObj.permissions && typeof userObj.permissions === 'object') {
    (Object.keys(userObj.permissions) as (keyof UserPermissions)[]).forEach(permKey => {
      const uVal = userObj.permissions[permKey];
      if (uVal === false) {
        (basePerms as any)[permKey] = false;
      }
    });
  }

  // Aplicação de Exceções Individuais de Permissões (individualExceptions ou customPermissions)
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
  const targetCompany = directCompany || ((db?.registeredCompanies && db.registeredCompanies.length > 0)
    ? (db.registeredCompanies.find(c => c.id === companyId) || db.registeredCompanies.find(c => c.id === (typeof user === 'object' ? user?.companyId : undefined)) || db.companyInfo)
    : db?.companyInfo);

  if (targetCompany) {
    // 5.0 Se a empresa estiver suspensa ou inadimplente, revoga permissões funcionais (exceto gestão para regularização se for admin)
    if (!isCompanyActive(targetCompany)) {
      ALL_PERMISSION_KEYS.forEach(pKey => {
        if (pKey.key !== 'accessUserManagement') {
          (basePerms as any)[pKey.key] = false;
        }
      });
      return basePerms;
    }

    const effectiveBt = targetCompany.businessType || 'OFICINA';
    ALL_PERMISSION_KEYS.forEach(pKey => {
      if (pKey.key === 'accessUserManagement' || pKey.key === 'accessQAPanel') {
        if (targetCompany?.globalModules && targetCompany.globalModules[pKey.key] === false) {
          (basePerms as any)[pKey.key] = false;
        }
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
    if (!isModuleContractedForCompany('accessRepresentativeCommerce', targetCompany, effectiveBt) && !isModuleContractedForCompany('accessRepresentativeOrders', targetCompany, effectiveBt)) {
      basePerms.accessRepresentativeCommerce = false;
      basePerms.accessRepresentativeOrders = false;
      basePerms.representativeOrdersView = false;
      basePerms.representativeOrdersCreate = false;
      basePerms.representativeOrdersEdit = false;
      basePerms.representativeOrdersCancel = false;
      basePerms.representativeOrdersExport = false;
      basePerms.representativeImportView = false;
      basePerms.representativeImportCreate = false;
      basePerms.representativeReconciliationView = false;
      basePerms.representativeReconciliationApprove = false;
      basePerms.representativeCommissionView = false;
      basePerms.representativeCommissionEdit = false;
      basePerms.representativeCommissionSettle = false;
      basePerms.representativeReportsView = false;
      basePerms.representativeReportsExport = false;
      basePerms.representativeReconcile = false;
      basePerms.representativeCommissionsManage = false;
    } else {
      if (!isModuleContractedForCompany('accessRepresentativeOrders', targetCompany, effectiveBt)) {
        basePerms.accessRepresentativeOrders = false;
      }
      if (!isModuleContractedForCompany('accessRepresentativeCommerce', targetCompany, effectiveBt)) {
        basePerms.accessRepresentativeCommerce = false;
      }
    }
    if (!isModuleContractedForCompany('accessNotificationEngine', targetCompany, effectiveBt)) {
      basePerms.accessNotificationEngine = false;
      basePerms.notificationTemplatesEdit = false;
      basePerms.notificationRulesEdit = false;
      basePerms.notificationSendManual = false;
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

/**
 * Mapeamento da tela (ViewID) para a permissão raiz correspondente
 */
export const VIEW_TO_PRIMARY_PERMISSION_MAP: Record<string, keyof UserPermissions> = {
  dashboard: 'accessDashboard',
  sales: 'accessSales',
  withdrawals: 'accessWithdrawals',
  carriers: 'accessCarriers',
  clients: 'accessClients',
  vehicles: 'accessVehicles',
  parts: 'accessParts',
  units_of_measure: 'accessUnitsOfMeasure',
  services: 'accessServices',
  budgets: 'accessBudgets',
  serviceOrders: 'accessServiceOrders',
  industry: 'accessProduction',
  history: 'accessHistory',
  reports: 'accessReports',
  quotations: 'accessQuotations',
  accounts_receivable: 'accessAccountsReceivable',
  accounts_payable: 'accessAccountsPayable',
  financial: 'accessFinancial',
  fiscal: 'accessFiscal',
  fiscal_conference: 'accessFiscal',
  tax_obligations: 'accessFiscal',
  representative_commerce: 'accessRepresentativeCommerce',
  representative_orders: 'accessRepresentativeOrders',
  representative_reconciliation: 'accessRepresentativeCommerce',
  notifications_engine: 'accessNotificationEngine',
  notification_engine: 'accessNotificationEngine',
  users: 'accessUserManagement',
  access_groups: 'accessUserManagement',
  qa_panel: 'accessQAPanel',
  data_migration: 'accessQAPanel',
};

/**
 * Função ÚNICA, CENTRAL e AUTORITATIVA de decisão de acesso a uma tela (ViewID):
 * Valida estritamente os 3 pilares sem atalhos ou vazamento de escopo:
 * 1. SEGMENTO DA EMPRESA: A view é aplicável ao ramo de atuação (Oficina / Comércio / Indústria / Híbrido)?
 *    isViewAllowedForBusinessType(viewId, company.businessType)
 * 2. CONTRATO DO SAAS: O módulo foi efetivamente comprado/contratado pela empresa?
 *    isModuleContractedForCompany(permKey, company, company.businessType)
 * 3. PERMISSÕES EFETIVAS DO OPERADOR (RBAC v2.0): O usuário tem a permissão ativa após filtro do contrato?
 *    getEffectivePermissions(user, company, db)
 *
 * REGRAS CRÍTICAS:
 * - ADMIN não bypassa o contrato da empresa nem as regras de segmento.
 * - Elimina fallbacks permissivos: se !company ou !user, retorna false imediatamente.
 * - 'profile' é liberado para qualquer usuário autenticado ativo.
 */
export function canAccessView(
  company: CompanyInfo | null | undefined,
  user: User | null | undefined,
  viewId: ViewID | string,
  db?: AppDatabase | null
): boolean {
  // 0. Validações preliminares
  if (!company || !user) return false;
  if (user.active === false) return false;

  // Tela de perfil pessoal é liberada para qualquer usuário autenticado
  if (viewId === 'profile') return true;

  // 1. PRIORIDADE ABSOLUTA: A empresa está ativa e com contrato regular?
  // Se a empresa estiver suspensa, inadimplente ou bloqueada -> ACESSO NEGADO A TUDO
  // (Exceção: tela 'users' para administradores permitindo regularização/pagamento da assinatura)
  if (!isCompanyActive(company)) {
    if (viewId === 'users' && user.role === 'admin') {
      return true;
    }
    return false;
  }

  const businessType = normalizeBusinessType(company.businessType);

  // 2. Validação de SEGMENTO DA EMPRESA
  if (!isViewAllowedForBusinessType(viewId as ViewID, businessType)) {
    return false;
  }

  // Obter a permissão primária associada à View
  const permKey = VIEW_TO_PRIMARY_PERMISSION_MAP[viewId];
  if (!permKey) {
    // Se a view não tem mapeamento de permissão restritiva mas foi liberada para o segmento
    return true;
  }

  // 3. Validação de MÓDULO CONTRATADO PELA EMPRESA (Licenciamento SaaS)
  // Regra Inviolável: Nenhum perfil de usuário (nem ADMIN nem MASTER) acessa módulo não contratado.
  if (!isModuleContractedForCompany(permKey, company, businessType)) {
    return false;
  }

  // 4. Validação de PERMISSÃO EFETIVA DO USUÁRIO (RBAC v2.0 filtrado pelo contrato da empresa)
  const effectivePerms = getEffectivePermissions(user, company, db || undefined);
  if (!effectivePerms || !effectivePerms[permKey]) {
    return false;
  }

  return true;
}

/**
 * Retorna a primeira view acessível pelo usuário na empresa atual (fallback seguro)
 * Garante que o operador nunca seja redirecionado para um módulo inacessível ou não contratado.
 */
export function getSafeAccessibleFallbackView(
  company: CompanyInfo | null | undefined,
  user: User | null | undefined,
  db?: AppDatabase | null
): ViewID {
  const candidateViews: ViewID[] = [
    'dashboard',
    'sales',
    'serviceOrders',
    'budgets',
    'clients',
    'parts',
    'services',
    'representative_commerce',
    'industry',
    'financial',
    'history',
    'reports',
    'users',
    'profile'
  ];

  for (const v of candidateViews) {
    if (canAccessView(company, user, v, db)) {
      return v;
    }
  }

  return 'profile';
}

/**
 * Retorna o limite de usuários/operadores contratado para a empresa (Padrão: 5 usuários configurável)
 */
export function getCompanyUserLimit(company?: any | null): number {
  if (!company) return 5;
  const limit = Number(company.userLimit);
  return Number.isFinite(limit) && limit > 0 ? limit : 5;
}

/**
 * Retorna o valor mensal cobrado por usuário adicional acima do limite base de 5 usuários (Padrão: R$ 29,90 configurável)
 */
export function getCompanyAdditionalUserPrice(company?: any | null): number {
  if (!company) return 29.90;
  const price = Number(company.additionalUserPrice);
  return Number.isFinite(price) && price >= 0 ? price : 29.90;
}

/**
 * Calcula a mensalidade total da empresa somando o plano base, módulos opcionais e usuários adicionais contratados
 */
export function calculateCompanyTotalMonthlyFee(company?: any | null): {
  baseFee: number;
  userLimit: number;
  baseUsers: number;
  extraUsers: number;
  additionalUserPrice: number;
  extraUsersTotal: number;
  totalMonthlyFee: number;
} {
  const baseFee = Number(company?.basePlanFee ?? company?.monthlyFee ?? 199.90);
  const userLimit = getCompanyUserLimit(company);
  const baseUsers = 5;
  const extraUsers = Math.max(0, userLimit - baseUsers);
  const additionalUserPrice = getCompanyAdditionalUserPrice(company);
  const extraUsersTotal = extraUsers * additionalUserPrice;
  const totalMonthlyFee = baseFee + extraUsersTotal;

  return {
    baseFee,
    userLimit,
    baseUsers,
    extraUsers,
    additionalUserPrice,
    extraUsersTotal,
    totalMonthlyFee,
  };
}

/**
 * Valida se um novo operador pode ser cadastrado respeitando a licença da empresa
 */
export function checkCompanyUserLimit(
  company: any | undefined | null,
  currentUsersCount: number
): {
  allowed: boolean;
  userLimit: number;
  currentUsersCount: number;
  additionalUserPrice: number;
  message?: string;
} {
  const userLimit = getCompanyUserLimit(company);
  const additionalUserPrice = getCompanyAdditionalUserPrice(company);
  const allowed = currentUsersCount < userLimit;

  if (!allowed) {
    return {
      allowed: false,
      userLimit,
      currentUsersCount,
      additionalUserPrice,
      message: `Limite de operadores atingido: a licença da empresa permite até ${userLimit} usuários (atualmente ${currentUsersCount} cadastrados). Para cadastrar mais operadores, aumente o limite de usuários na Gestão de Assinatura (R$ ${additionalUserPrice.toFixed(2)} por usuário adicional).`,
    };
  }

  return {
    allowed: true,
    userLimit,
    currentUsersCount,
    additionalUserPrice,
  };
}


