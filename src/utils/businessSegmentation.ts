/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK - CENTRALIZED BUSINESS SEGMENTATION SERVICE & LOGIC
 * Segmentação centralizada por tipo de negócio (OFICINA, COMERCIO, OFICINA_COMERCIO)
 */

import { BusinessType, CompanyInfo, User, UserPermissions, UserRole, ViewID } from '../types';

export const WORKSHOP_EXCLUSIVE_VIEWS: ViewID[] = [
  'vehicles',
  'services',
  'budgets',
  'serviceOrders',
  'quotations',
];

export const COMMERCE_EXCLUSIVE_VIEWS: ViewID[] = [
  'sales',
  'withdrawals',
  'carriers',
];

export const WORKSHOP_EXCLUSIVE_PERMISSIONS: (keyof UserPermissions | string)[] = [
  'accessVehicles',
  'accessServices',
  'accessBudgets',
  'accessServiceOrders',
  'accessQuotations',
];

export const COMMERCE_EXCLUSIVE_PERMISSIONS: (keyof UserPermissions | string)[] = [
  'accessSales',
  'accessWithdrawals',
  'accessCarriers',
];

/**
 * Normaliza de forma centralizada e retrocompatível o conjunto de permissões do usuário.
 * Corrige registros legados do Cloud SQL onde novos campos (como accessSales) estavam undefined.
 */
export function normalizeUserPermissions(
  permissions?: Partial<UserPermissions> | null,
  role?: UserRole | string | null
): UserPermissions {
  const normalizedRole = (role || 'atendente').toLowerCase();

  // Definições de fallback por perfil funcional
  let defaultAccessSales = true;
  let defaultAccessCarriers = true;
  let defaultAccessBudgets = true;
  let defaultAccessServiceOrders = true;
  let defaultAccessClients = true;
  let defaultAccessVehicles = true;
  let defaultAccessParts = true;
  let defaultAccessServices = true;
  let defaultAccessReports = false;
  let defaultAccessUserManagement = false;
  let defaultCanCustomizePdf = false;
  let defaultAccessQuotations = false;
  let defaultAccessReceivable = false;
  let defaultAccessPayable = false;
  let defaultAccessFinancial = false;
  let defaultAccessFiscal = false;

  switch (normalizedRole) {
    case 'admin':
      defaultAccessSales = true;
      defaultAccessCarriers = true;
      defaultAccessBudgets = true;
      defaultAccessServiceOrders = true;
      defaultAccessClients = true;
      defaultAccessVehicles = true;
      defaultAccessParts = true;
      defaultAccessServices = true;
      defaultAccessReports = true;
      defaultAccessUserManagement = true;
      defaultCanCustomizePdf = true;
      defaultAccessQuotations = true;
      defaultAccessReceivable = true;
      defaultAccessPayable = true;
      defaultAccessFinancial = true;
      defaultAccessFiscal = true;
      break;
    case 'qa':
      defaultAccessSales = true;
      defaultAccessCarriers = true;
      defaultAccessBudgets = true;
      defaultAccessServiceOrders = true;
      defaultAccessClients = true;
      defaultAccessVehicles = true;
      defaultAccessParts = true;
      defaultAccessServices = true;
      defaultAccessReports = true;
      defaultAccessUserManagement = true;
      defaultCanCustomizePdf = true;
      defaultAccessQuotations = true;
      defaultAccessReceivable = true;
      defaultAccessPayable = true;
      defaultAccessFinancial = true;
      defaultAccessFiscal = true;
      break;
    case 'atendente':
      defaultAccessSales = true;
      defaultAccessCarriers = true;
      defaultAccessBudgets = true;
      defaultAccessServiceOrders = false;
      defaultAccessClients = true;
      defaultAccessVehicles = true;
      defaultAccessParts = false;
      defaultAccessServices = false;
      defaultAccessReports = true;
      defaultAccessUserManagement = false;
      defaultCanCustomizePdf = true;
      defaultAccessQuotations = false;
      defaultAccessReceivable = true;
      defaultAccessPayable = false;
      defaultAccessFinancial = false;
      defaultAccessFiscal = true;
      break;
    case 'mecanico':
      defaultAccessSales = false;
      defaultAccessCarriers = false;
      defaultAccessBudgets = false;
      defaultAccessServiceOrders = true;
      defaultAccessClients = false;
      defaultAccessVehicles = false;
      defaultAccessParts = true;
      defaultAccessServices = true;
      defaultAccessReports = false;
      defaultAccessUserManagement = false;
      defaultCanCustomizePdf = false;
      defaultAccessQuotations = false;
      defaultAccessReceivable = false;
      defaultAccessPayable = false;
      defaultAccessFinancial = false;
      defaultAccessFiscal = false;
      break;
    default:
      defaultAccessSales = true;
      defaultAccessCarriers = true;
      break;
  }

  return {
    accessDashboard: permissions?.accessDashboard !== undefined ? Boolean(permissions.accessDashboard) : true,
    accessSales: permissions?.accessSales !== undefined ? Boolean(permissions.accessSales) : defaultAccessSales,
    accessWithdrawals: permissions?.accessWithdrawals !== undefined ? Boolean(permissions.accessWithdrawals) : defaultAccessSales,
    accessCarriers: permissions?.accessCarriers !== undefined ? Boolean(permissions.accessCarriers) : defaultAccessCarriers,
    accessClients: permissions?.accessClients !== undefined ? Boolean(permissions.accessClients) : defaultAccessClients,
    accessVehicles: permissions?.accessVehicles !== undefined ? Boolean(permissions.accessVehicles) : defaultAccessVehicles,
    accessParts: permissions?.accessParts !== undefined ? Boolean(permissions.accessParts) : defaultAccessParts,
    accessServices: permissions?.accessServices !== undefined ? Boolean(permissions.accessServices) : defaultAccessServices,
    accessBudgets: permissions?.accessBudgets !== undefined ? Boolean(permissions.accessBudgets) : defaultAccessBudgets,
    accessServiceOrders: permissions?.accessServiceOrders !== undefined ? Boolean(permissions.accessServiceOrders) : defaultAccessServiceOrders,
    accessHistory: permissions?.accessHistory !== undefined ? Boolean(permissions.accessHistory) : true,
    accessReports: permissions?.accessReports !== undefined ? Boolean(permissions.accessReports) : defaultAccessReports,
    accessUserManagement: permissions?.accessUserManagement !== undefined ? Boolean(permissions.accessUserManagement) : defaultAccessUserManagement,
    accessQAPanel: permissions?.accessQAPanel !== undefined ? Boolean(permissions.accessQAPanel) : true,
    accessQuotations: permissions?.accessQuotations !== undefined ? Boolean(permissions.accessQuotations) : defaultAccessQuotations,
    accessNotifications: permissions?.accessNotifications !== undefined ? Boolean(permissions.accessNotifications) : true,
    accessAccountsReceivable: permissions?.accessAccountsReceivable !== undefined ? Boolean(permissions.accessAccountsReceivable) : defaultAccessReceivable,
    accessAccountsPayable: permissions?.accessAccountsPayable !== undefined ? Boolean(permissions.accessAccountsPayable) : defaultAccessPayable,
    accessFinancial: permissions?.accessFinancial !== undefined ? Boolean(permissions.accessFinancial) : defaultAccessFinancial,
    accessFiscal: permissions?.accessFiscal !== undefined ? Boolean(permissions.accessFiscal) : defaultAccessFiscal,
    canEditBudgets: permissions?.canEditBudgets !== undefined ? Boolean(permissions.canEditBudgets) : (normalizedRole !== 'mecanico'),
    canCustomizePdf: permissions?.canCustomizePdf !== undefined ? Boolean(permissions.canCustomizePdf) : defaultCanCustomizePdf,
    canViewOtherStoresStock: permissions?.canViewOtherStoresStock !== undefined ? Boolean(permissions.canViewOtherStoresStock) : true,
    canSellOtherStoresStock: permissions?.canSellOtherStoresStock !== undefined ? Boolean(permissions.canSellOtherStoresStock) : (normalizedRole === 'admin' || normalizedRole === 'qa'),
    canViewAllCompaniesHistory: permissions?.canViewAllCompaniesHistory !== undefined ? Boolean(permissions.canViewAllCompaniesHistory) : (normalizedRole === 'admin' || normalizedRole === 'qa'),
  };
}

/**
 * Normaliza o objeto de usuário completo, garantindo permissões válidas e tipadas.
 */
export function normalizeUser(user: User): User {
  if (!user) return user;
  return {
    ...user,
    permissions: normalizeUserPermissions(user.permissions, user.role),
  };
}

/**
 * Normaliza e padroniza qualquer valor recebido de tipo de negócio para o enum canônico BusinessType.
 * Trata variações de maiúsculas/minúsculas, acentuação ("COMÉRCIO", "Comércio") e sinônimos.
 */
export function normalizeBusinessType(type?: string | null): BusinessType {
  if (!type) return 'OFICINA';
  const clean = String(type)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (clean === 'COMERCIO' || clean === 'COMERCIO / AUTOPECAS' || clean === 'LOJA' || clean === 'BALCAO') {
    return 'COMERCIO';
  }
  if (clean === 'OFICINA_COMERCIO' || clean === 'OFICINA + COMERCIO' || clean === 'HIBRIDO' || clean === 'OFICINA_E_COMERCIO') {
    return 'OFICINA_COMERCIO';
  }
  if (clean === 'SERVICOS' || clean === 'SERVICO') {
    return 'SERVICOS';
  }
  if (clean === 'OUTROS' || clean === 'OUTRO') {
    return 'OUTROS';
  }
  return 'OFICINA';
}

/**
 * Retorna o tipo de negócio oficial da empresa ativa, com normalização completa e retrocompatibilidade
 */
export function getBusinessType(company?: CompanyInfo | null): BusinessType {
  if (!company || !company.businessType) {
    return 'OFICINA';
  }
  return normalizeBusinessType(company.businessType);
}

/**
 * Verifica se a empresa atende operações de oficina mecânica (Ordem de Serviço, Veículos, etc.)
 * Retorna true para 'OFICINA' e 'OFICINA_COMERCIO'
 */
export function isWorkshopBusiness(businessType?: BusinessType | string | null): boolean {
  const norm = normalizeBusinessType(businessType);
  return norm === 'OFICINA' || norm === 'OFICINA_COMERCIO';
}

/**
 * Verifica se a empresa atende operações de comércio / balcão / PDV (Vendas rápidas, Balcão)
 * Retorna true para 'COMERCIO' e 'OFICINA_COMERCIO'
 */
export function isCommerceBusiness(businessType?: BusinessType | string | null): boolean {
  const norm = normalizeBusinessType(businessType);
  return norm === 'COMERCIO' || norm === 'OFICINA_COMERCIO';
}

/**
 * Verifica se é estritamente uma oficina mecânica tradicional (sem PDV de comércio puro)
 */
export function isPureWorkshop(businessType?: BusinessType | string | null): boolean {
  const norm = normalizeBusinessType(businessType);
  return norm === 'OFICINA';
}

/**
 * Verifica se é estritamente um comércio de autopeças/balcão (sem OS nem veículos)
 */
export function isPureCommerce(businessType?: BusinessType | string | null): boolean {
  const norm = normalizeBusinessType(businessType);
  return norm === 'COMERCIO';
}

/**
 * Verifica se é um modelo híbrido (Oficina Mecânica + Comércio Balcão)
 */
export function isHybridBusiness(businessType?: BusinessType | string | null): boolean {
  const norm = normalizeBusinessType(businessType);
  return norm === 'OFICINA_COMERCIO';
}

/**
 * Determina se uma View específica é compatível e permitida para o segmento de negócio
 */
export function isViewAllowedForBusinessType(
  viewId: ViewID,
  businessType?: BusinessType | string | null
): boolean {
  const type = normalizeBusinessType(businessType);

  if (type === 'COMERCIO') {
    if (WORKSHOP_EXCLUSIVE_VIEWS.includes(viewId)) {
      return false;
    }
    return true;
  }

  if (type === 'OFICINA') {
    if (COMMERCE_EXCLUSIVE_VIEWS.includes(viewId)) {
      return false;
    }
    return true;
  }

  // OFICINA_COMERCIO ou outros suportam todas as telas
  return true;
}

/**
 * Determina se uma chave de módulo/permissão é permitida para o segmento
 */
export function isModuleAllowedForBusinessType(
  permissionKey: string,
  businessType?: BusinessType | string | null
): boolean {
  const type = businessType || 'OFICINA';

  if (type === 'COMERCIO') {
    if (WORKSHOP_EXCLUSIVE_PERMISSIONS.includes(permissionKey)) {
      return false;
    }
  }

  if (type === 'OFICINA') {
    if (COMMERCE_EXCLUSIVE_PERMISSIONS.includes(permissionKey)) {
      return false;
    }
  }

  return true;
}

/**
 * Retorna lista de todas as ViewIDs liberadas para um segmento
 */
export function getAvailableViewsForBusinessType(businessType?: BusinessType | string | null): ViewID[] {
  const allViews: ViewID[] = [
    'dashboard',
    'sales',
    'withdrawals',
    'carriers',
    'clients',
    'vehicles',
    'parts',
    'quotations',
    'services',
    'budgets',
    'serviceOrders',
    'accounts_receivable',
    'accounts_payable',
    'financial',
    'fiscal',
    'history',
    'reports',
    'users',
    'profile',
    'qa_panel',
    'data_migration',
  ];

  return allViews.filter(v => isViewAllowedForBusinessType(v, businessType));
}

/**
 * Retorna a View padrão / segura de redirecionamento caso o usuário tente acessar rota bloqueada
 */
export function getFallbackViewForBusinessType(
  businessType?: BusinessType | string | null,
  userPermissions?: UserPermissions
): ViewID {
  if (userPermissions?.accessDashboard !== false) {
    return 'dashboard';
  }
  if (isCommerceBusiness(businessType) && userPermissions?.accessSales !== false) {
    return 'sales';
  }
  if (isWorkshopBusiness(businessType) && userPermissions?.accessServiceOrders !== false) {
    return 'serviceOrders';
  }
  return 'clients';
}

/**
 * Metadados visuais do segmento (rótulo amigável, cor de badge e descrição)
 */
export function getSegmentMetadata(businessType?: BusinessType | string | null) {
  switch (businessType) {
    case 'COMERCIO':
      return {
        label: 'Comércio & Autopeças',
        shortLabel: 'Comércio',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
        activePillClass: 'bg-emerald-600 text-white',
        description: 'Vendas de Balcão (PDV), Estoque de Peças, Caixa e Emissão Fiscal.',
        isWorkshop: false,
        isCommerce: true,
      };
    case 'OFICINA_COMERCIO':
      return {
        label: 'Oficina + Comércio Híbrido',
        shortLabel: 'Oficina + Loja',
        badgeClass: 'bg-amber-500/10 text-amber-800 border-amber-300',
        activePillClass: 'bg-amber-600 text-white',
        description: 'Estrutura Completa: Ordens de Serviço, Veículos e Vendas de Balcão integradas.',
        isWorkshop: true,
        isCommerce: true,
      };
    case 'OFICINA':
    default:
      return {
        label: 'Oficina Mecânica',
        shortLabel: 'Oficina',
        badgeClass: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
        activePillClass: 'bg-indigo-600 text-white',
        description: 'Ordens de Serviço, Veículos, Checklists, Orçamentos, Mecânicos e Serviços.',
        isWorkshop: true,
        isCommerce: false,
      };
  }
}

/**
 * Retorna a orientação salva para um tipo de documento/empresa no banco de dados Cloud SQL
 */
export function getCompanyReportOrientation(
  company?: CompanyInfo | null,
  docType?: string
): 'portrait' | 'landscape_2ways' {
  if (!company) return 'portrait';

  if (docType && company.reportCustomOrientations && company.reportCustomOrientations[docType]) {
    const custom = company.reportCustomOrientations[docType];
    if (custom === 'portrait' || custom === 'landscape_2ways') {
      return custom;
    }
  }

  if (company.reportPageOrientation === 'landscape_2ways') {
    return 'landscape_2ways';
  }

  return 'portrait';
}
