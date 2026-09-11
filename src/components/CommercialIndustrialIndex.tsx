import React from 'react';
import { IndustrialMarketingProspeccaoView } from './CommercialIndustrialViews';
import { IndustrialOrcamentosView } from './CommercialIndustrialViewsPart2';
import { IndustrialPedidosVendaView, IndustrialCarteiraPedidosView } from './CommercialIndustrialViewsPart3';
import { IndustrialPosVendaSACView } from './CommercialIndustrialPosVenda';

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

export function WrappedCommercialMarketingView(props: any) {
  if (!checkUserPerm(props.currentUser, 'accessCommercialMarketing')) {
    return <AccessDeniedView title="Marketing & Prospecção B2B" permKey="accessCommercialMarketing" />;
  }
  return <IndustrialMarketingProspeccaoView {...props} />;
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
