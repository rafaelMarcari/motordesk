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

import { User, UserRole, UserPermissions, AccessGroup, AppDatabase, HistoryEntry } from '../types';
import { normalizeUserPermissions } from './businessSegmentation';

export const ALL_PERMISSION_KEYS: Array<{
  key: keyof UserPermissions;
  label: string;
  category: 'dashboard' | 'sales' | 'fiscal' | 'purchasing_stock' | 'financial' | 'industrial' | 'admin' | 'operations';
  description: string;
}> = [
  // Dashboard & Geral
  { key: 'accessDashboard', label: 'Painel / Dashboard Principal', category: 'dashboard', description: 'Permite visualizar o painel gerencial de indicadores' },
  { key: 'accessNotifications', label: 'Notificações & Alertas', category: 'dashboard', description: 'Permite receber e visualizar notificações do sistema' },
  
  // Vendas Balcão & Atendimento
  { key: 'accessSales', label: 'Acesso Vendas Balcão / PDV', category: 'sales', description: 'Permite acessar a tela de vendas de peças e balcão' },
  { key: 'restrictToOwnSales', label: 'Restringir a Vendas Próprias', category: 'sales', description: 'Restringe o operador a visualizar somente suas próprias vendas' },
  { key: 'accessWithdrawals', label: 'Entregas & Retiradas de Balcão', category: 'sales', description: 'Permite gerenciar pedidos de retirada e despacho de mercadorias' },
  { key: 'accessCarriers', label: 'Transportadoras & Logística', category: 'sales', description: 'Permite cadastrar e consultar transportadoras parceiras' },
  { key: 'accessBudgets', label: 'Orçamentos Comerciais', category: 'sales', description: 'Permite acessar o módulo de orçamentos' },
  { key: 'canEditBudgets', label: 'Editar Orçamentos Abertos', category: 'sales', description: 'Permite alterar itens, peças e valores de orçamentos' },
  { key: 'budgetApprove', label: 'Aprovar / Converter Orçamentos', category: 'sales', description: 'Permite aprovar e converter orçamento em OS ou Venda' },
  
  // Operações de Oficina
  { key: 'accessServiceOrders', label: 'Ordens de Serviço (OS)', category: 'operations', description: 'Permite acessar e tramitar ordens de serviço' },
  { key: 'accessClients', label: 'Cadastro de Clientes & CRM', category: 'operations', description: 'Permite visualizar e cadastrar clientes' },
  { key: 'accessVehicles', label: 'Cadastro de Veículos & Frota', category: 'operations', description: 'Permite cadastrar e consultar veículos' },
  { key: 'accessServices', label: 'Tabela de Serviços & Mão de Obra', category: 'operations', description: 'Permite consultar catálogo de serviços' },
  { key: 'canCustomizePdf', label: 'Personalizar Layout de PDF', category: 'operations', description: 'Permite customizar cabeçalhos e campos de impressão PDF' },

  // Peças, Estoque & Compras
  { key: 'accessParts', label: 'Catálogo de Peças & Estoque', category: 'purchasing_stock', description: 'Permite consultar saldo e catálogo de autopeças' },
  { key: 'accessUnitsOfMeasure', label: 'Unidades de Medida & Dimensões', category: 'purchasing_stock', description: 'Permite acessar módulo de unidades de medida (UN, KG, M, M²)' },
  { key: 'unitsOfMeasureCreate', label: 'Cadastrar Unidades de Medida', category: 'purchasing_stock', description: 'Permite criar novas unidades de medida métricas' },
  { key: 'unitsOfMeasureEdit', label: 'Editar Unidades de Medida', category: 'purchasing_stock', description: 'Permite alterar fatores e fórmulas de unidades' },
  { key: 'canViewOtherStoresStock', label: 'Consultar Estoque de Outras Filiais', category: 'purchasing_stock', description: 'Permite visualizar inventário de outras lojas da rede' },
  { key: 'canSellOtherStoresStock', label: 'Vender com Estoque de Outra Loja', category: 'purchasing_stock', description: 'Permite emitir vendas puxando peças de outra filial' },
  { key: 'accessQuotations', label: 'Cotações com Fornecedores', category: 'purchasing_stock', description: 'Permite criar e gerenciar cotações de autopeças' },
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
  { key: 'fiscalGenerateGuides', label: 'Gerar Obrigações & Guias Fiscais (GNRE/DARE)', category: 'fiscal', description: 'Permite gerar guias de ICMS-ST, FCP e DIFAL' },
  { key: 'fiscalCancelGuides', label: 'Cancelar Guias Fiscais', category: 'fiscal', description: 'Permite estornar guias de recolhimento tributário' },
  { key: 'accessTaxObligationsReport', label: 'Relatório de Obrigações e Guias Fiscais', category: 'fiscal', description: 'Visualizar e exportar relatórios de tributos apurados' },
  { key: 'fiscalXml', label: 'Download de XMLs Oficiais', category: 'fiscal', description: 'Permite baixar XMLs de distribuição autorizados' },
  { key: 'fiscalReprint', label: 'Reimprimir DANFE / Documentos Fiscais', category: 'fiscal', description: 'Permite reimpressão de DANFEs e cupons fiscais' },
  { key: 'fiscalConfig', label: 'Configuração Fiscal & Certificado A1', category: 'fiscal', description: 'Permite configurar alíquotas, CNAE e certificado digital' },

  // Módulo Financeiro & Cobrança
  { key: 'accessAccountsReceivable', label: 'Contas a Receber & Cobrança', category: 'financial', description: 'Permite consultar e baixar títulos a receber' },
  { key: 'accessAccountsPayable', label: 'Contas a Pagar & Despesas', category: 'financial', description: 'Permite lançar e quitar contas a pagar' },
  { key: 'accessFinancial', label: 'Fluxo de Caixa & Extrato DRE', category: 'financial', description: 'Permite visualizar saúde financeira e DRE' },
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
  { key: 'canViewAllCompaniesHistory', label: 'Auditoria de Todas as Empresas da Rede', category: 'admin', description: 'Permite visualizar logs de todas as filiais' },
  { key: 'accessReports', label: 'Módulo Geral de Relatórios', category: 'admin', description: 'Permite acesso ao centro de relatórios' },
  { key: 'accessReportsExport', label: 'Exportar Relatórios (PDF / CSV)', category: 'admin', description: 'Permite exportar dados e relatórios em PDF/CSV' },
  { key: 'accessQAPanel', label: 'Painel de Qualidade & Engenharia QA', category: 'admin', description: 'Acesso aos testes automatizados e suíte QA' },

  // Módulo Industrial / PCP
  { key: 'accessIndustrialDashboard', label: 'Dashboard Industrial / PCP', category: 'industrial', description: 'Visão geral da produção e chão de fábrica' },
  { key: 'accessProductionOrders', label: 'Ordens de Produção (OP)', category: 'industrial', description: 'Gerenciar ordens de manufatura e fabricação' },
  { key: 'accessBillOfMaterials', label: 'Estrutura de Produtos (BOM)', category: 'industrial', description: 'Cadastrar listas técnicas de materiais' },
  { key: 'accessEquipment', label: 'Gestão de Equipamentos & Máquinas', category: 'industrial', description: 'Controle do parque de maquinários industriais' },
  { key: 'accessMaintenance', label: 'Planos de Manutenção Industrial', category: 'industrial', description: 'Gestão de manutenção preventiva e corretiva de máquinas' }
];

/**
 * Retorna as permissões efetivas consolidadas de um usuário no contexto de uma empresa específica.
 * Respeita estritamente:
 * 1. Status de ativação da conta (se desativada, todas as permissões = false)
 * 2. Permissões herdadas do Grupo de Acesso vinculado (ou role base)
 * 3. Sobrescrita de Exceções Individuais (individualExceptions)
 * 4. Privilégios de Administrador / QA
 * 5. Isolamento Multi-tenant
 */
export function getEffectivePermissions(
  user: User | string | undefined | null,
  companyId: string | undefined | null,
  db: AppDatabase
): UserPermissions {
  // Se usuário não fornecido, retorna todas as permissões como falso
  if (!user) {
    return normalizeUserPermissions({}, 'atendente');
  }

  // Se passou apenas o ID do usuário como string, busca no DB
  const userObj: User | undefined = typeof user === 'string'
    ? (db.users || []).find(u => u.id === user || u.username.toLowerCase() === user.toLowerCase())
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

  // 2. Base de permissões a partir do papel (Role)
  let basePerms = normalizeUserPermissions(userObj.permissions || {}, userObj.role || 'atendente');

  // 3. Se o usuário estiver vinculado a um Grupo de Acesso específico (AccessGroup)
  if (userObj.groupId && db.accessGroups && db.accessGroups.length > 0) {
    const matchedGroup = db.accessGroups.find(
      g => g.id === userObj.groupId && (g.active !== false) && (!g.companyId || !companyId || g.companyId === companyId)
    );
    if (matchedGroup && matchedGroup.permissions) {
      basePerms = {
        ...basePerms,
        ...matchedGroup.permissions
      };
    }
  }

  // 4. Aplicação de Exceções Individuais de Permissões (individualExceptions)
  if (userObj.individualExceptions && typeof userObj.individualExceptions === 'object') {
    Object.keys(userObj.individualExceptions).forEach(permKey => {
      const exceptionValue = userObj.individualExceptions![permKey];
      if (typeof exceptionValue === 'boolean') {
        (basePerms as any)[permKey] = exceptionValue;
      }
    });
  }

  // 5. Tratamento de Administrador Máximo / Validador QA
  if (userObj.role === 'admin' || userObj.username.toLowerCase() === 'validador' || userObj.username.toLowerCase() === 'admin') {
    basePerms.accessDashboard = true;
    basePerms.accessSales = true;
    basePerms.accessWithdrawals = true;
    basePerms.accessCarriers = true;
    basePerms.accessClients = true;
    basePerms.accessVehicles = true;
    basePerms.accessParts = true;
    basePerms.accessServices = true;
    basePerms.accessBudgets = true;
    basePerms.accessServiceOrders = true;
    basePerms.accessHistory = true;
    basePerms.accessReports = true;
    basePerms.accessUserManagement = true;
    basePerms.accessAccessGroups = true;
    basePerms.accessGroupsCreate = true;
    basePerms.accessGroupsEdit = true;
    basePerms.accessGroupsDelete = true;
    basePerms.accessQAPanel = true;
    basePerms.accessQuotations = true;
    basePerms.accessPurchasing = true;
    basePerms.accessPurchasingOrders = true;
    basePerms.accessPurchasingApprove = true;
    basePerms.accessAccountsReceivable = true;
    basePerms.accessAccountsPayable = true;
    basePerms.accessFinancial = true;
    basePerms.accessFiscal = true;
    basePerms.fiscalView = true;
    basePerms.fiscalConference = true;
    basePerms.fiscalEmit = true;
    basePerms.fiscalTransmit = true;
    basePerms.fiscalCancel = true;
    basePerms.fiscalGenerateGuides = true;
    basePerms.fiscalCancelGuides = true;
    basePerms.accessTaxObligationsReport = true;
    basePerms.accessUnitsOfMeasure = true;
    basePerms.unitsOfMeasureCreate = true;
    basePerms.unitsOfMeasureEdit = true;
    basePerms.unitsOfMeasureToggleActive = true;
    basePerms.financialBillingClosing = true;
    basePerms.financialReopenClosing = true;
    basePerms.financialReconciliation = true;
    basePerms.financialUnreconcile = true;
    basePerms.authorizeCreditLimitBypass = true;
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
  | 'FISCAL_TRANSMIT' 
  | 'FISCAL_CANCEL' 
  | 'GUIDE_GENERATED' 
  | 'GUIDE_PAID' 
  | 'GUIDE_CANCELED' 
  | 'CREDIT_BYPASS' 
  | 'CLOSING_REOPENED'
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
