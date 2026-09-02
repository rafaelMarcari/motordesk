/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  Settings, 
  X, 
  CheckCheck, 
  AlertTriangle, 
  FileText, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Trash2,
  Sliders,
  ShieldCheck,
  Package,
  ShoppingBag,
  DollarSign,
  CreditCard,
  Building2,
  ExternalLink,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  CalendarClock
} from 'lucide-react';
import { SystemNotification, AlertSettings, BusinessType, User } from '../types';

interface NotificationsModalProps {
  notifications: SystemNotification[];
  alertSettings: AlertSettings;
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onSaveAlertSettings: (newSettings: AlertSettings) => void;
  businessType?: BusinessType;
  currentUser?: User | null;
  onNavigateToView?: (viewId: string, recordId?: string) => void;
}

export default function NotificationsModal({
  notifications,
  alertSettings,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onClearNotifications,
  onSaveAlertSettings,
  businessType = 'OFICINA',
  currentUser,
  onNavigateToView
}: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [filterType, setFilterType] = useState<string>('all');

  const isCommerce = businessType === 'COMERCIO';
  const isWorkshop = businessType === 'OFICINA';
  const isHybrid = businessType === 'OFICINA_COMERCIO' || (!isCommerce && !isWorkshop);

  // Form settings state
  const [enableLowStock, setEnableLowStock] = useState(alertSettings.enableLowStockAlerts ?? true);
  const [enableStockReservedExp, setEnableStockReservedExp] = useState(alertSettings.enableStockReservedExpirationAlerts ?? true);
  const [validityDays, setValidityDays] = useState(alertSettings.defaultBudgetValidityDays || 10);
  const [enableDormantStock, setEnableDormantStock] = useState(alertSettings.enableDormantStockAlerts ?? true);
  const [dormantStockDays, setDormantStockDays] = useState(alertSettings.dormantStockDaysThreshold || 60);

  // Workshop-specific alert states
  const [enableSOCreated, setEnableSOCreated] = useState(alertSettings.enableServiceOrderCreatedAlerts ?? true);
  const [enableBudgetConverted, setEnableBudgetConverted] = useState(alertSettings.enableBudgetConvertedAlerts ?? true);

  // Commerce-specific alert states
  const [enableSalesCreated, setEnableSalesCreated] = useState(alertSettings.enableSalesCreatedAlerts ?? true);
  const [enableBudgetConvertedToSale, setEnableBudgetConvertedToSale] = useState(alertSettings.enableBudgetConvertedToSaleAlerts ?? true);
  const [enableCreditLimit, setEnableCreditLimit] = useState(alertSettings.enableCreditLimitAlerts ?? true);

  // Shared budget created alert
  const [enableBudgetCreated, setEnableBudgetCreated] = useState(alertSettings.enableBudgetCreatedAlerts ?? true);

  // Financial & Due Date Alert states (Faturas a vencer / Contas a pagar)
  const [enableReceivableDue, setEnableReceivableDue] = useState(alertSettings.enableReceivableDueAlerts ?? true);
  const [receivableNoticeDays, setReceivableNoticeDays] = useState(alertSettings.receivableDueNoticeDays ?? 3);
  const [enablePayableDue, setEnablePayableDue] = useState(alertSettings.enablePayableDueAlerts ?? true);
  const [payableNoticeDays, setPayableNoticeDays] = useState(alertSettings.payableDueNoticeDays ?? 5);
  const [showFinancialDashboard, setShowFinancialDashboard] = useState(alertSettings.showFinancialAlertsOnDashboard ?? true);
  const [showFinancialModule, setShowFinancialModule] = useState(alertSettings.showFinancialAlertsInModule ?? true);

  // Payment policy state
  const [paymentMode, setPaymentMode] = useState<string>(alertSettings.defaultPaymentRequirementMode || 'ADVANCE_DEPOSIT');
  const [depositPct, setDepositPct] = useState<number>(alertSettings.defaultDepositPercentage || 30);
  const [requireDepositExecute, setRequireDepositExecute] = useState<boolean>(alertSettings.requireDepositToExecuteOS ?? true);
  const [allowClientOverride, setAllowClientOverride] = useState<boolean>(alertSettings.allowPerClientPaymentOverride ?? true);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AlertSettings = {
      ...alertSettings,
      enableLowStockAlerts: enableLowStock,
      enableStockReservedExpirationAlerts: enableStockReservedExp,
      defaultBudgetValidityDays: Math.max(1, Number(validityDays) || 10),
      enableDormantStockAlerts: enableDormantStock,
      dormantStockDaysThreshold: Math.max(1, Number(dormantStockDays) || 60),

      // Workshop
      enableServiceOrderCreatedAlerts: enableSOCreated,
      enableBudgetConvertedAlerts: enableBudgetConverted,

      // Commerce
      enableSalesCreatedAlerts: enableSalesCreated,
      enableBudgetConvertedToSaleAlerts: enableBudgetConvertedToSale,
      enableCreditLimitAlerts: enableCreditLimit,

      // Common
      enableBudgetCreatedAlerts: enableBudgetCreated,

      // Financial Due Alerts
      enableReceivableDueAlerts: enableReceivableDue,
      receivableDueNoticeDays: Math.max(1, Number(receivableNoticeDays) || 3),
      enablePayableDueAlerts: enablePayableDue,
      payableDueNoticeDays: Math.max(1, Number(payableNoticeDays) || 5),
      showFinancialAlertsOnDashboard: showFinancialDashboard,
      showFinancialAlertsInModule: showFinancialModule,

      // Payment Policies
      defaultPaymentRequirementMode: paymentMode as any,
      defaultDepositPercentage: Math.min(100, Math.max(0, Number(depositPct) || 30)),
      requireDepositToExecuteOS: requireDepositExecute,
      allowPerClientPaymentOverride: allowClientOverride
    };

    onSaveAlertSettings(updated);
    setSaveSuccessMsg('Configurações de alerta atualizadas com sucesso para o seu segmento!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Filter list of notifications based on active tab/filter and segment
  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'stock') return n.type === 'stock_low' || n.type === 'stock_expired';
    if (filterType === 'financial') return n.type === 'receivable_due' || n.type === 'payable_due' || n.type === 'credit_limit_exceeded';
    if (filterType === 'budgets') return n.type === 'budget_created' || n.type === 'budget_converted' || n.type === 'budget_converted_to_sale';
    if (filterType === 'sales') return n.type === 'sale_created' || n.type === 'budget_converted_to_sale';
    if (filterType === 'so') return n.type === 'service_order_created' || n.type === 'os_closed_by_mechanic' || n.type === 'budget_converted';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenNotificationRecord = (notif: SystemNotification) => {
    if (!onNavigateToView) return;

    if (notif.type === 'receivable_due') {
      onNavigateToView('accounts_receivable', notif.metadata?.receivableId);
    } else if (notif.type === 'payable_due') {
      onNavigateToView('accounts_payable', notif.metadata?.payableId);
    } else if (notif.type === 'credit_limit_exceeded') {
      onNavigateToView(isCommerce ? 'sales' : 'accounts_receivable', notif.metadata?.clientId);
    } else if (notif.type === 'sale_created' || notif.type === 'budget_converted_to_sale') {
      onNavigateToView('sales', notif.metadata?.saleId);
    } else if (notif.type === 'budget_created' || notif.type === 'budget_converted') {
      onNavigateToView('budgets', notif.metadata?.budgetId);
    } else if (notif.type === 'service_order_created' || notif.type === 'os_closed_by_mechanic') {
      onNavigateToView('serviceOrders', notif.metadata?.serviceOrderId);
    } else if (notif.type === 'stock_low' || notif.type === 'stock_expired') {
      onNavigateToView('parts', notif.metadata?.partId);
    } else if (notif.type === 'price_approval_required') {
      onNavigateToView('quotations');
    } else {
      onNavigateToView('dashboard');
    }
    onClose();
  };

  const getIconForType = (type: SystemNotification['type'], metadata?: any) => {
    switch (type) {
      case 'stock_low':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'stock_expired':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'receivable_due':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'payable_due':
        return <TrendingDown className="w-4 h-4 text-rose-600" />;
      case 'credit_limit_exceeded':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case 'sale_created':
      case 'budget_converted_to_sale':
        return <ShoppingBag className="w-4 h-4 text-indigo-600" />;
      case 'budget_created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'service_order_created':
      case 'os_closed_by_mechanic':
        return <Wrench className="w-4 h-4 text-indigo-600" />;
      case 'budget_converted':
        return metadata?.conversionType === 'PARCIAL' ? (
          <CheckCircle2 className="w-4 h-4 text-purple-600" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        );
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getBadgeForType = (type: SystemNotification['type'], metadata?: any) => {
    switch (type) {
      case 'stock_low':
        return <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Estoque Baixo</span>;
      case 'stock_expired':
        return <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Reserva Expirada</span>;
      case 'receivable_due':
        return <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Fatura a Vencer</span>;
      case 'payable_due':
        return <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Conta a Pagar</span>;
      case 'credit_limit_exceeded':
        return <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Limite de Crédito</span>;
      case 'sale_created':
        return <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Venda Balcão</span>;
      case 'budget_converted_to_sale':
        return <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Convertido em Venda</span>;
      case 'budget_created':
        return <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Novo Orçamento</span>;
      case 'service_order_created':
        return <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Nova OS</span>;
      case 'os_closed_by_mechanic':
        return <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">OS Concluída</span>;
      case 'budget_converted':
        return metadata?.conversionType === 'PARCIAL' ? (
          <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono uppercase">Conversão PARCIAL</span>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono uppercase">Conversão TOTAL</span>
        );
      default:
        return <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Sistema</span>;
    }
  };

  return (
    <div id="notifications-modal-overlay" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border relative ${
              isCommerce 
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : isWorkshop
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800 font-display">
                  Central de Alertas & Notificações
                </h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                  isCommerce 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : isWorkshop
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-teal-100 text-teal-800 border border-teal-200'
                }`}>
                  {isCommerce ? '🛍️ Comércio & Autopeças' : isWorkshop ? '🔧 Oficina Mecânica' : '⚡ Centro Automotivo Integrado'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCommerce 
                  ? 'Alertas de reposição de estoque, vendas balcão, orçamentos, faturas e limite de crédito.'
                  : isWorkshop
                    ? 'Alertas de ordens de serviço, pátio, estoque de peças, orçamentos e vencimento de faturas.'
                    : 'Alertas unificados de pátio de oficina, vendas balcão, reposição de estoque e faturamento.'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-notifications-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-3 gap-4">
          <button
            id="btn-tab-notifications-list"
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Bell className="w-4 h-4" /> Notificações ({notifications.length})
          </button>

          <button
            id="btn-tab-alert-settings"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sliders className="w-4 h-4" /> Configuração de Alertas do Segmento
          </button>
        </div>

        {/* Tab 1: Notifications List */}
        {activeTab === 'notifications' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Action Bar & Filters adapted per segment */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  id="filter-all-notifs"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  id="filter-unread-notifs"
                  onClick={() => setFilterType('unread')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'unread' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Não Lidas ({unreadCount})
                </button>
                <button
                  id="filter-stock-notifs"
                  onClick={() => setFilterType('stock')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'stock' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Estoque & Peças
                </button>
                <button
                  id="filter-financial-notifs"
                  onClick={() => setFilterType('financial')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'financial' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Financeiro & Faturas
                </button>

                {/* Segment specific filters */}
                {(isWorkshop || isHybrid) && (
                  <button
                    id="filter-so-notifs"
                    onClick={() => setFilterType('so')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      filterType === 'so' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Ordens de Serviço
                  </button>
                )}

                {(isCommerce || isHybrid) && (
                  <button
                    id="filter-sales-notifs"
                    onClick={() => setFilterType('sales')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      filterType === 'sales' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Vendas Balcão
                  </button>
                )}

                <button
                  id="filter-budgets-notifs"
                  onClick={() => setFilterType('budgets')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'budgets' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isCommerce ? 'Orçamentos Balcão' : 'Orçamentos'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    id="btn-mark-all-read"
                    onClick={onMarkAllAsRead}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Marcar Lidas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    id="btn-clear-all-notifs"
                    onClick={onClearNotifications}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Nenhum alerta registrado nesta categoria para o seu segmento.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    id={`notification-item-${notif.id}`}
                    className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                      notif.read
                        ? 'bg-white border-slate-200 opacity-85'
                        : 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-3xs shrink-0 mt-0.5">
                        {getIconForType(notif.type, notif.metadata)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-800">{notif.title}</h4>
                            {getBadgeForType(notif.type, notif.metadata)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(notif.date).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                        {/* Metadata badges */}
                        {notif.metadata?.conversionType && (
                          <div className="pt-0.5">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                              notif.metadata.conversionType === 'TOTAL'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}>
                              Status da Conversão: {notif.metadata.conversionType} ({notif.metadata.itemsCount || 0} de {notif.metadata.totalItemsCount || 0} itens aprovados)
                            </span>
                          </div>
                        )}

                        {notif.metadata?.dueDate && (
                          <div className="pt-0.5 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Vencimento: <strong>{notif.metadata.dueDate}</strong></span>
                            {notif.metadata?.amount && (
                              <span className="text-emerald-700 font-bold">
                                Valor: {notif.metadata.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button: Abrir Registro */}
                    {onNavigateToView && (
                      <button
                        id={`btn-open-notif-record-${notif.id}`}
                        onClick={() => handleOpenNotificationRecord(notif)}
                        className="shrink-0 p-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="Abrir Registro no Módulo"
                      >
                        <span className="hidden sm:inline">Abrir</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Alert Settings Form customized by Business Segment */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  Parâmetros e Regras de Alertas Operacionais
                </h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                  isCommerce 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : isWorkshop 
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-teal-100 text-teal-800 border border-teal-200'
                }`}>
                  {isCommerce ? 'Segmento: Comércio & Autopeças' : isWorkshop ? 'Segmento: Oficina Mecânica' : 'Segmento: Centro Automotivo Integrado'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isCommerce
                  ? 'Configure as notificações para vendas de balcão, reposição de estoque comercial, faturamento e faturas a vencer.'
                  : isWorkshop
                    ? 'Configure as notificações para ordens de serviço, pátio de mecânica, estoque de aplicação e cobrança da oficina.'
                    : 'Configure todos os parâmetros de alertas tanto para a área comercial de autopeças quanto para a oficina mecânica.'}
              </p>
            </div>

            {saveSuccessMsg && (
              <div id="alert-settings-success-msg" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fade-in">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {saveSuccessMsg}
              </div>
            )}

            {/* SEÇÃO 1: ESTOQUE & REPOSIÇÃO */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Package className="w-4 h-4 text-rose-600" />
                {isCommerce ? '1. Estoque & Reposição Comercial de Autopeças' : '1. Peças & Controle de Estoque'}
              </h4>

              <div className="grid grid-cols-1 gap-3">
                {/* Toggle: Low Stock */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label htmlFor="chk-enable-low-stock" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Alerta de Estoque Baixo / Ponto de Pedido
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Emitir alerta automático quando a quantidade disponível de uma peça for igual ou menor ao Estoque Mínimo cadastrado.
                    </p>
                  </div>
                  <input
                    id="chk-enable-low-stock"
                    type="checkbox"
                    checked={enableLowStock}
                    onChange={e => setEnableLowStock(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* Toggle: Stock Expiration / Validity */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label htmlFor="chk-enable-stock-exp" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Alerta de Validade de Orçamento & Liberação de Reserva de Peças
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {isCommerce
                        ? 'Quando o prazo do orçamento balcão expirar sem ser faturado em venda, liberar os itens reservados de volta ao estoque disponível e notificar.'
                        : 'Quando o prazo do orçamento vencer sem virar OS, liberar os itens reservados de volta ao estoque disponível da oficina e emitir aviso.'}
                    </p>
                  </div>
                  <input
                    id="chk-enable-stock-exp"
                    type="checkbox"
                    checked={enableStockReservedExp}
                    onChange={e => setEnableStockReservedExp(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* Prazo de Validade de Orçamentos */}
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-150 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label htmlFor="input-validity-days" className="text-xs font-bold text-indigo-950 block">
                      Prazo Padrão de Validade de Orçamentos ({isCommerce ? 'Comerciais Balcão' : 'Técnicos'})
                    </label>
                    <p className="text-[11px] text-slate-600">
                      Número de dias para expiração automática da reserva de peças vinculada à proposta.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-validity-days"
                      type="number"
                      min={1}
                      max={90}
                      value={validityDays}
                      onChange={e => setValidityDays(Math.max(1, Number(e.target.value)))}
                      className="w-20 p-2 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-900 text-center"
                      required
                    />
                    <span className="text-xs text-slate-500 font-medium">dias</span>
                  </div>
                </div>

                {/* Toggle: Dormant Stock / Capital Parado (Comércio & Oficina) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-dormant-stock" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                        Alerta de Produtos Parados / Sem Giro (Capital Imobilizado)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Identificar autopeças e itens de prateleira sem nenhuma movimentação ou venda nos últimos dias.
                      </p>
                    </div>
                    <input
                      id="chk-enable-dormant-stock"
                      type="checkbox"
                      checked={enableDormantStock}
                      onChange={e => setEnableDormantStock(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  {enableDormantStock && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4 animate-fade-in">
                      <span className="text-xs text-slate-600 font-medium">Avisar quando o produto estiver sem giro há mais de:</span>
                      <div className="flex items-center gap-2">
                        <select
                          id="select-dormant-days"
                          value={dormantStockDays}
                          onChange={e => setDormantStockDays(Number(e.target.value))}
                          className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                        >
                          <option value={30}>30 dias</option>
                          <option value={60}>60 dias (Padrão)</option>
                          <option value={90}>90 dias</option>
                          <option value={180}>180 dias</option>
                          <option value={365}>1 ano</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: OPERAÇÃO ESPECÍFICA (COMÉRCIO vs OFICINA) */}
            {isCommerce && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2 border-b border-amber-200 pb-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  2. Vendas Balcão & Ponto de Venda (PDV)
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-sales-created" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                        Alerta de Nova Venda Balcão / PDV
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Notificar gestores e caixas quando uma nova venda direta de peças for finalizada.
                      </p>
                    </div>
                    <input
                      id="chk-enable-sales-created"
                      type="checkbox"
                      checked={enableSalesCreated}
                      onChange={e => setEnableSalesCreated(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-budget-created-comm" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Alerta de Novo Orçamento Comercial
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Notificar a equipe de vendas quando um vendedor criar uma nova proposta/cotação de balcão.
                      </p>
                    </div>
                    <input
                      id="chk-enable-budget-created-comm"
                      type="checkbox"
                      checked={enableBudgetCreated}
                      onChange={e => setEnableBudgetCreated(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-budget-converted-sale" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Alerta de Conversão de Orçamento para Venda Balcão
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Notificar faturamento imediato quando o cliente aprovar o orçamento comercial no caixa.
                      </p>
                    </div>
                    <input
                      id="chk-enable-budget-converted-sale"
                      type="checkbox"
                      checked={enableBudgetConvertedToSale}
                      onChange={e => setEnableBudgetConvertedToSale(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-credit-limit" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                        Alerta Preventivo de Limite de Crédito de Clientes
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Alertar quando um cliente tentar realizar compras a prazo/faturado acima do limite cadastrado.
                      </p>
                    </div>
                    <input
                      id="chk-enable-credit-limit"
                      type="checkbox"
                      checked={enableCreditLimit}
                      onChange={e => setEnableCreditLimit(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {isWorkshop && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-200 pb-1.5">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  2. Pátio de Serviços & Ordens de Serviço (OS)
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-so-created-ws" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                        Alerta de Nova Ordem de Serviço (OS)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Notificar os mecânicos e consultores quando um novo veículo der entrada no pátio com OS aberta.
                      </p>
                    </div>
                    <input
                      id="chk-enable-so-created-ws"
                      type="checkbox"
                      checked={enableSOCreated}
                      onChange={e => setEnableSOCreated(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-budget-created-ws" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Alerta de Novo Orçamento Técnico
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Notificar quando o consultor técnico finalizar a cotação de peças e mão de obra.
                      </p>
                    </div>
                    <input
                      id="chk-enable-budget-created-ws"
                      type="checkbox"
                      checked={enableBudgetCreated}
                      onChange={e => setEnableBudgetCreated(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-budget-converted-ws" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Alerta de Conversão de Orçamento para OS (Total / Parcial)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Identificar e destacar nos avisos se a conversão do orçamento aprovado pelo cliente foi TOTAL ou PARCIAL.
                      </p>
                    </div>
                    <input
                      id="chk-enable-budget-converted-ws"
                      type="checkbox"
                      checked={enableBudgetConverted}
                      onChange={e => setEnableBudgetConverted(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {isHybrid && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-2 border-b border-teal-200 pb-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  2. Operações de Balcão e Pátio (Centro Automotivo Integrado)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">Alerta de Nova OS no Pátio</span>
                    <input
                      type="checkbox"
                      checked={enableSOCreated}
                      onChange={e => setEnableSOCreated(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">Alerta de Nova Venda Balcão</span>
                    <input
                      type="checkbox"
                      checked={enableSalesCreated}
                      onChange={e => setEnableSalesCreated(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">Alerta de Novo Orçamento</span>
                    <input
                      type="checkbox"
                      checked={enableBudgetCreated}
                      onChange={e => setEnableBudgetCreated(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">Conversão de Orçamento</span>
                    <input
                      type="checkbox"
                      checked={enableBudgetConverted}
                      onChange={e => setEnableBudgetConverted(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO 3: FINANCEIRO & VENCIMENTO DE FATURAS (COM DIAS DE ANTECEDÊNCIA CONFIGURÁVEIS) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                3. Alertas Financeiros & Vencimento de Faturas / Contas
              </h4>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                {/* Contas a Receber (Faturas a vencer com antecedência X) */}
                <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-rec-due" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <CalendarClock className="w-4 h-4 text-emerald-600" />
                        Alerta de Contas a Receber / Faturas de Clientes a Vencer
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Disparar notificações preventivas no sistema antes do vencimento de títulos e boletos de clientes.
                      </p>
                    </div>
                    <input
                      id="chk-enable-rec-due"
                      type="checkbox"
                      checked={enableReceivableDue}
                      onChange={e => setEnableReceivableDue(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  {enableReceivableDue && (
                    <div className="pt-2 border-t border-emerald-100 flex items-center justify-between gap-4 animate-fade-in">
                      <label htmlFor="input-rec-notice-days" className="text-xs font-semibold text-emerald-900">
                        Começar a notificar com antecedência de:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="input-rec-notice-days"
                          type="number"
                          min={1}
                          max={30}
                          value={receivableNoticeDays}
                          onChange={e => setReceivableNoticeDays(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 p-1.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-950 text-center"
                        />
                        <span className="text-xs text-emerald-800 font-medium">dias antes</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contas a Pagar (Duplicatas de fornecedores a vencer com antecedência Y) */}
                <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="chk-enable-pay-due" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <TrendingDown className="w-4 h-4 text-rose-600" />
                        Alerta de Contas a Pagar / Fornecedores & Despesas a Vencer
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Disparar avisos antes do vencimento de duplicatas de compras de peças e contas da empresa.
                      </p>
                    </div>
                    <input
                      id="chk-enable-pay-due"
                      type="checkbox"
                      checked={enablePayableDue}
                      onChange={e => setEnablePayableDue(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  {enablePayableDue && (
                    <div className="pt-2 border-t border-emerald-100 flex items-center justify-between gap-4 animate-fade-in">
                      <label htmlFor="input-pay-notice-days" className="text-xs font-semibold text-emerald-900">
                        Começar a notificar com antecedência de:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="input-pay-notice-days"
                          type="number"
                          min={1}
                          max={30}
                          value={payableNoticeDays}
                          onChange={e => setPayableNoticeDays(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 p-1.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-950 text-center"
                        />
                        <span className="text-xs text-emerald-800 font-medium">dias antes</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Exibição no Dashboard e Módulos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-lg border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={showFinancialDashboard}
                      onChange={e => setShowFinancialDashboard(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Exibir alertas e cards no Painel / Dashboard</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-lg border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={showFinancialModule}
                      onChange={e => setShowFinancialModule(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Exibir banners no Financeiro e Contas</span>
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: POLÍTICA DE COBRANÇA / SINAL (ADAPTADA POR SEGMENTO) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                {isCommerce ? '4. Política Comercial de Pagamento & Encomendas de Peças' : '4. Política de Cobrança & Sinal da Oficina'}
              </h4>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="text-xs font-semibold text-slate-800 block">
                  {isCommerce 
                    ? 'Regra Padrão para Vendas e Peças Sob Encomenda:' 
                    : 'Modo Padrão de Cobrança de Serviços Mecânicos:'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition flex items-start gap-2 ${
                    paymentMode === 'AFTER_COMPLETION' 
                      ? 'bg-white border-indigo-600 text-indigo-950 shadow-xs ring-1 ring-indigo-600' 
                      : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="paymentRequirementMode"
                      value="AFTER_COMPLETION"
                      checked={paymentMode === 'AFTER_COMPLETION'}
                      onChange={e => setPaymentMode(e.target.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold block text-slate-800">
                        {isCommerce ? '1. Na Entrega / Faturado' : '1. Pós-Pago (100%)'}
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        {isCommerce ? 'Recebe integral na entrega do produto ou a prazo' : 'Recebe integral na entrega do veículo'}
                      </span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition flex items-start gap-2 ${
                    paymentMode === 'ADVANCE_DEPOSIT' 
                      ? 'bg-white border-indigo-600 text-indigo-950 shadow-xs ring-1 ring-indigo-600' 
                      : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="paymentRequirementMode"
                      value="ADVANCE_DEPOSIT"
                      checked={paymentMode === 'ADVANCE_DEPOSIT'}
                      onChange={e => setPaymentMode(e.target.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold block text-slate-800">
                        {isCommerce ? '2. Sinal de Encomenda' : '2. Sinal de Entrada'}
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        {isCommerce ? 'Exige % de sinal para encomendar a peça' : 'Exige % de sinal antes para liberar execução'}
                      </span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition flex items-start gap-2 ${
                    paymentMode === 'FULL_ADVANCE' 
                      ? 'bg-white border-indigo-600 text-indigo-950 shadow-xs ring-1 ring-indigo-600' 
                      : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="paymentRequirementMode"
                      value="FULL_ADVANCE"
                      checked={paymentMode === 'FULL_ADVANCE'}
                      onChange={e => setPaymentMode(e.target.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold block text-slate-800">3. 100% Antecipado</span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        {isCommerce ? 'Exige pagamento integral antes do pedido' : 'Exige pagamento integral antes de iniciar'}
                      </span>
                    </div>
                  </label>
                </div>

                {paymentMode === 'ADVANCE_DEPOSIT' && (
                  <div className="p-3 bg-white rounded-lg border border-indigo-200 space-y-1.5 animate-fade-in">
                    <label htmlFor="input-deposit-pct" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Porcentagem Padrão de Sinal / Entrada:</span>
                      <span className="text-indigo-700 font-mono font-bold text-sm">{depositPct}%</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="input-deposit-pct"
                        type="number"
                        min={5}
                        max={90}
                        step={5}
                        value={depositPct}
                        onChange={e => setDepositPct(Number(e.target.value))}
                        className="w-20 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 text-center"
                      />
                      <input
                        type="range"
                        min={5}
                        max={90}
                        step={5}
                        value={depositPct}
                        onChange={e => setDepositPct(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Exemplo: Em um valor de R$ 1.000,00, o sinal exigido será de R$ {(1000 * (depositPct/100)).toFixed(2)}. Restante na entrega/conclusão.
                    </p>
                  </div>
                )}

                <div className="space-y-2 pt-1 border-t border-slate-200">
                  {isWorkshop && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireDepositExecute}
                        onChange={e => setRequireDepositExecute(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      <span>Alertar/Bloquear início do serviço no semáforo se o sinal exigir pagamento e estiver pendente</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowClientOverride}
                      onChange={e => setAllowClientOverride(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 rounded"
                    />
                    <span>Permitir configurar regras de pagamento e limites de crédito personalizados por cliente</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                id="btn-save-alert-settings-submit"
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Salvar Configurações de Alerta
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
