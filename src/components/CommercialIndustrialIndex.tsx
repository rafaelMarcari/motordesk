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

function checkUserPerm(user: any, permKey: string): boolean {
  if (!permKey) return true;
  if (!user) return true;
  if (user.role === 'admin' || user.role === 'qa') {
    if (user.permissions && user.permissions[permKey] === false) return false;
    return true;
  }
  if (user.permissions) {
    if (user.permissions[permKey] === false) return false;
    if (user.permissions[permKey] === true) return true;
    if (user.permissions.accessCommercial === true) return true;
    if (user.permissions.accessProduction === true) return true;
    if (user.permissions.accessEngineering === true) return true;
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
  if (!checkUserPerm(props.currentUser, 'accessCommercialMarketing')) {
    return <AccessDeniedView title="Marketing & Prospecção B2B" permKey="accessCommercialMarketing" />;
  }
  return <IndustrialMarketingProspeccaoView {...props} />;
}

export function WrappedCommercialClientesView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessClients')) {
    return <AccessDeniedView title="Clientes Industriais & Contas B2B" permKey="accessClients" />;
  }
  return <IndustrialClientesB2BView {...props} />;
}

export function WrappedCommercialOrcamentosView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialBudgets')) {
    return <AccessDeniedView title="Orçamentos Fabris & Cotações" permKey="accessCommercialBudgets" />;
  }
  return <IndustrialOrcamentosView {...props} />;
}

export function WrappedCommercialPedidosView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialOrders')) {
    return <AccessDeniedView title="Pedidos de Venda Fabris" permKey="accessCommercialOrders" />;
  }
  return <IndustrialPedidosVendaView {...props} />;
}

export function WrappedCommercialCarteiraView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialBacklog')) {
    return <AccessDeniedView title="Carteira de Pedidos (Backlog)" permKey="accessCommercialBacklog" />;
  }
  return <IndustrialCarteiraPedidosView {...props} />;
}

export function WrappedCommercialPosVendaView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialAfterSales')) {
    return <AccessDeniedView title="Pós-Venda & SAC Técnico" permKey="accessCommercialAfterSales" />;
  }
  return <IndustrialPosVendaSACView {...props} />;
}

// =========================================================================
// VIEWS DO MÓDULO ENGENHARIA INDUSTRIAL
// =========================================================================

export function WrappedEngenhariaDashboardView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessEngineering')) {
    return <AccessDeniedView title="Dashboard Engenharia & P&D" permKey="accessEngineering" />;
  }
  return <IndustrialEngenhariaDashboardView {...props} />;
}

export function WrappedEngenhariaProdutosView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessEngineering')) {
    return <AccessDeniedView title="Desenvolvimento de Novos Produtos" permKey="accessEngineering" />;
  }
  return <IndustrialDesenvolvimentoProdutosView {...props} />;
}

export function WrappedEngenhariaFichaTecnicaView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessEngineering')) {
    return <AccessDeniedView title="Ficha Técnica de Processo" permKey="accessEngineering" />;
  }
  return <IndustrialFichaTecnicaView {...props} />;
}

export function WrappedEngenhariaRevisoesView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessBillOfMaterials')) {
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
