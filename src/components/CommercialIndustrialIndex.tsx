import React from 'react';
import { IndustrialMarketingProspeccaoView } from './CommercialIndustrialViews';
import { IndustrialClientesB2BView } from './CommercialIndustrialClientes';
import { IndustrialOrcamentosView } from './CommercialIndustrialViewsPart2';
import { IndustrialPedidosVendaView, IndustrialCarteiraPedidosView } from './CommercialIndustrialViewsPart3';
import { IndustrialPosVendaSACView } from './CommercialIndustrialPosVenda';
import {
  IndustrialEngenhariaDashboardView,
  IndustrialDesenvolvimentoProdutosView,
  IndustrialFichaTecnicaView,
  IndustrialControleRevisoesView,
  IndustrialUnidadesMedidaView
} from './EngineeringIndustrialViews';

function checkUserPerm(user: any, permKey: string, db?: any): boolean {
  if (!permKey) return true;
  if (!user) return true;

  // 1. Telas revogadas especificamente para este usuário (deniedScreens)
  if (Array.isArray(user.deniedScreens) && (user.deniedScreens.includes(permKey) || user.deniedScreens.includes(permKey.replace('access', '').toLowerCase()))) {
    return false;
  }

  // 2. Telas liberadas especificamente para este usuário (allowedScreens)
  // Permite que um usuário tenha telas diferentes dos demais membros do mesmo grupo
  if (Array.isArray(user.allowedScreens) && (user.allowedScreens.includes(permKey) || user.allowedScreens.includes(permKey.replace('access', '').toLowerCase()))) {
    return true;
  }

  // 3. Exceções individuais ou permissões customizadas do usuário
  if (user.individualExceptions && typeof user.individualExceptions === 'object') {
    if (user.individualExceptions[permKey] === false) return false;
    if (user.individualExceptions[permKey] === true) return true;
  }
  if (user.customPermissions && typeof user.customPermissions === 'object') {
    if (user.customPermissions[permKey] === false) return false;
    if (user.customPermissions[permKey] === true) return true;
  }

  // 4. Permissões explícitas no cadastro do usuário (override direto)
  if (user.permissions && typeof user.permissions === 'object') {
    if (user.permissions[permKey] === false) return false;
    if (user.permissions[permKey] === true) return true;
  }

  // 5. Respeito ao Grupo de Acesso (RBAC)
  const groupId = user.groupId || user.accessGroupId;
  const accessGroups = db?.accessGroups || (typeof window !== 'undefined' && (window as any).__MOTOR_DESK_DB__?.accessGroups);
  if (groupId && Array.isArray(accessGroups)) {
    const matchedGroup = accessGroups.find((g: any) => g.id === groupId && g.active !== false);
    if (matchedGroup && matchedGroup.permissions) {
      if (matchedGroup.permissions[permKey] === false) return false;
      if (matchedGroup.permissions[permKey] === true) return true;
    }
  }

  // 6. Administrador / QA
  if (user.role === 'admin' || user.role === 'qa') {
    if (user.permissions && user.permissions[permKey] === false) return false;
    return true;
  }

  // 7. Módulos agregadores gerais liberados
  if (user.permissions) {
    if (user.permissions.accessCommercial === true && permKey.startsWith('accessCommercial')) return true;
    if (user.permissions.accessProduction === true && (permKey.startsWith('accessEngineering') || permKey.startsWith('accessProduction'))) return true;
    if (user.permissions.accessEngineering === true && permKey.startsWith('accessEngineering')) return true;
  }
  return true;
}

function AccessDeniedView({ title, permKey }: { title: string; permKey: string }) {
  return (
    <div className="p-8 my-8 max-w-lg mx-auto bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-center space-y-3 shadow-xs">
      <div className="text-3xl">🔒</div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        Acesso Restrito: {title}
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        O seu perfil ou grupo de acesso atual não possui permissão para acessar este módulo (<code className="font-mono text-amber-700 dark:text-amber-400 font-bold">{permKey}</code>).
      </p>
      <div className="text-[11px] text-slate-400">
        Solicite ao administrador da empresa para habilitar esta opção nas configurações de Grupos de Acesso (RBAC).
      </div>
    </div>
  );
}

// =========================================================================
// VIEWS DO MÓDULO COMERCIAL INDUSTRIAL
// =========================================================================

export function WrappedCommercialMarketingView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialMarketing', props.db)) {
    return <AccessDeniedView title="Marketing & Prospecção B2B" permKey="accessCommercialMarketing" />;
  }
  return <IndustrialMarketingProspeccaoView {...props} />;
}

export function WrappedCommercialClientesView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessClients', props.db)) {
    return <AccessDeniedView title="Clientes Industriais & Contas B2B" permKey="accessClients" />;
  }
  return <IndustrialClientesB2BView {...props} />;
}

export function WrappedCommercialOrcamentosView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialBudgets', props.db)) {
    return <AccessDeniedView title="Orçamentos Fabris & Cotações" permKey="accessCommercialBudgets" />;
  }
  return <IndustrialOrcamentosView {...props} />;
}

export function WrappedCommercialPedidosView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialOrders', props.db)) {
    return <AccessDeniedView title="Pedidos de Venda Fabris" permKey="accessCommercialOrders" />;
  }
  return <IndustrialPedidosVendaView {...props} />;
}

export function WrappedCommercialCarteiraView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialBacklog', props.db)) {
    return <AccessDeniedView title="Carteira de Pedidos (Backlog)" permKey="accessCommercialBacklog" />;
  }
  return <IndustrialCarteiraPedidosView {...props} />;
}

export function WrappedCommercialPosVendaView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialAfterSales', props.db)) {
    return <AccessDeniedView title="Pós-Venda & SAC Técnico" permKey="accessCommercialAfterSales" />;
  }
  return <IndustrialPosVendaSACView {...props} />;
}

// =========================================================================
// VIEWS DO MÓDULO ENGENHARIA INDUSTRIAL
// =========================================================================

export function WrappedEngenhariaDashboardView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessEngineering', props.db)) {
    return <AccessDeniedView title="Dashboard Engenharia & P&D" permKey="accessEngineering" />;
  }
  return <IndustrialEngenhariaDashboardView {...props} />;
}

export function WrappedEngenhariaProdutosView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessEngineering', props.db)) {
    return <AccessDeniedView title="Desenvolvimento de Novos Produtos" permKey="accessEngineering" />;
  }
  return <IndustrialDesenvolvimentoProdutosView {...props} />;
}

export function WrappedEngenhariaFichaTecnicaView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessEngineering', props.db)) {
    return <AccessDeniedView title="Ficha Técnica de Processo" permKey="accessEngineering" />;
  }
  return <IndustrialFichaTecnicaView {...props} />;
}

import {
  SolidWorksCADIntegrationView,
  type SolidWorksIntegrationProps
} from './SolidWorksCADIntegrationView';

export { SolidWorksCADIntegrationView };

export function WrappedSolidWorksIntegrationView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessEngineering', props.db)) {
    return <AccessDeniedView title="Integração CAD SolidWorks" permKey="accessEngineering" />;
  }
  return <SolidWorksCADIntegrationView {...props} />;
}

export function WrappedEngenhariaRevisoesView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessBillOfMaterials', props.db)) {
    return <AccessDeniedView title="Controle de Revisões & ECN" permKey="accessBillOfMaterials" />;
  }
  return <IndustrialControleRevisoesView {...props} />;
}

export function WrappedEngenhariaUnidadesView(props: any) {
  return <IndustrialUnidadesMedidaView />;
}

// =========================================================================
// RECURSOS ALINHADOS DE VENDAS & RETENÇÃO (ZACARIAS ALIGNMENT)
// =========================================================================
export * from './ZacariasAlignmentFeatures';
