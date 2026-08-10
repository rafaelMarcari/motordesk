/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Package
} from 'lucide-react';
import { SystemNotification, AlertSettings } from '../types';

interface NotificationsModalProps {
  notifications: SystemNotification[];
  alertSettings: AlertSettings;
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onSaveAlertSettings: (newSettings: AlertSettings) => void;
}

export default function NotificationsModal({
  notifications,
  alertSettings,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onClearNotifications,
  onSaveAlertSettings
}: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [filterType, setFilterType] = useState<string>('all');

  // Form settings state
  const [enableLowStock, setEnableLowStock] = useState(alertSettings.enableLowStockAlerts);
  const [enableBudgetCreated, setEnableBudgetCreated] = useState(alertSettings.enableBudgetCreatedAlerts);
  const [enableSOCreated, setEnableSOCreated] = useState(alertSettings.enableServiceOrderCreatedAlerts);
  const [enableBudgetConverted, setEnableBudgetConverted] = useState(alertSettings.enableBudgetConvertedAlerts);
  const [enableStockReservedExp, setEnableStockReservedExp] = useState(alertSettings.enableStockReservedExpirationAlerts);
  const [validityDays, setValidityDays] = useState(alertSettings.defaultBudgetValidityDays || 10);
  
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
      enableLowStockAlerts: enableLowStock,
      enableBudgetCreatedAlerts: enableBudgetCreated,
      enableServiceOrderCreatedAlerts: enableSOCreated,
      enableBudgetConvertedAlerts: enableBudgetConverted,
      enableStockReservedExpirationAlerts: enableStockReservedExp,
      defaultBudgetValidityDays: Number(validityDays) || 10,
      defaultPaymentRequirementMode: paymentMode as any,
      defaultDepositPercentage: Number(depositPct) || 30,
      requireDepositToExecuteOS: requireDepositExecute,
      allowPerClientPaymentOverride: allowClientOverride
    };
    onSaveAlertSettings(updated);
    setSaveSuccessMsg('Configurações salvas com sucesso!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'stock') return n.type === 'stock_low' || n.type === 'stock_expired';
    if (filterType === 'budgets') return n.type === 'budget_created' || n.type === 'budget_converted';
    if (filterType === 'so') return n.type === 'service_order_created' || n.type === 'budget_converted';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIconForType = (type: SystemNotification['type'], metadata?: any) => {
    switch (type) {
      case 'stock_low':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'stock_expired':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'budget_created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'service_order_created':
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
      case 'budget_created':
        return <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Novo Orçamento</span>;
      case 'service_order_created':
        return <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Nova OS</span>;
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
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                Central de Alertas & Notificações
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhe o status do estoque, reservas de orçamentos e conversões em OS
              </p>
            </div>
          </div>

          <button
            id="btn-close-notifications-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
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
            <Sliders className="w-4 h-4" /> Configuração de Alertas
          </button>
        </div>

        {/* Tab 1: Notifications List */}
        {activeTab === 'notifications' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Action Bar & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  id="filter-all-notifs"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  id="filter-unread-notifs"
                  onClick={() => setFilterType('unread')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'unread' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Não Lidas ({unreadCount})
                </button>
                <button
                  id="filter-stock-notifs"
                  onClick={() => setFilterType('stock')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'stock' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Estoque
                </button>
                <button
                  id="filter-budgets-notifs"
                  onClick={() => setFilterType('budgets')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'budgets' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Orçamentos
                </button>
                <button
                  id="filter-so-notifs"
                  onClick={() => setFilterType('so')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filterType === 'so' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ordens de Serviço
                </button>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    id="btn-mark-all-read"
                    onClick={onMarkAllAsRead}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-md transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Marcar Lidas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    id="btn-clear-all-notifs"
                    onClick={onClearNotifications}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-md transition"
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
                <p className="text-xs text-slate-500 font-medium">Nenhum alerta registrado no momento.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border transition flex items-start gap-3 ${
                      notif.read
                        ? 'bg-white border-slate-200 opacity-80'
                        : 'bg-indigo-50/30 border-indigo-200 shadow-2xs'
                    }`}
                  >
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-3xs shrink-0 mt-0.5">
                      {getIconForType(notif.type, notif.metadata)}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800">{notif.title}</h4>
                          {getBadgeForType(notif.type, notif.metadata)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(notif.date).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                      {/* Display metadata info if available */}
                      {notif.metadata?.conversionType && (
                        <div className="pt-1">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                            notif.metadata.conversionType === 'TOTAL'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-purple-100 text-purple-900 border border-purple-200'
                          }`}>
                            Status da Conversão: {notif.metadata.conversionType} ({notif.metadata.itemsCount || 0} de {notif.metadata.totalItemsCount || 0} itens aprovados)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Alert Settings Form */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                Parâmetros e Regras de Alertas do Sistema
              </h3>
              <p className="text-xs text-slate-500">
                Ative ou desative as notificações automáticas de estoque, validade de orçamentos e conversão em Ordens de Serviço.
              </p>
            </div>

            {saveSuccessMsg && (
              <div id="alert-settings-success-msg" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {saveSuccessMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Toggle 1: Low Stock */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label htmlFor="chk-enable-low-stock" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <Package className="w-4 h-4 text-rose-600" />
                    Alerta de Estoque Baixo
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Emitir alerta automático quando a quantidade disponível de uma peça for igual ou menor ao seu Estoque Mínimo.
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

              {/* Toggle 2: Stock Expiration / Validity */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label htmlFor="chk-enable-stock-exp" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Alerta de Validade de Orçamento & Expiração de Reserva
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Quando o prazo do orçamento vencer sem virar OS, liberar os itens reservados de volta ao estoque disponível e emitir aviso.
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

              {/* Toggle 3: Budget Created */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label htmlFor="chk-enable-budget-created" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Alerta de Novo Orçamento
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Notificar o sistema sempre que um novo orçamento for criado e salvo no balcão.
                  </p>
                </div>
                <input
                  id="chk-enable-budget-created"
                  type="checkbox"
                  checked={enableBudgetCreated}
                  onChange={e => setEnableBudgetCreated(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Toggle 4: Service Order Created */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label htmlFor="chk-enable-so-created" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    Alerta de Nova Ordem de Serviço (OS)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Notificar os mecânicos e gestores quando uma nova Ordem de Serviço for gerada.
                  </p>
                </div>
                <input
                  id="chk-enable-so-created"
                  type="checkbox"
                  checked={enableSOCreated}
                  onChange={e => setEnableSOCreated(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Toggle 5: Budget Converted */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label htmlFor="chk-enable-budget-converted" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Alerta de Conversão de Orçamento para OS (Total / Parcial)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Identificar e destacar nos avisos se a conversão do orçamento foi TOTAL ou PARCIAL.
                  </p>
                </div>
                <input
                  id="chk-enable-budget-converted"
                  type="checkbox"
                  checked={enableBudgetConverted}
                  onChange={e => setEnableBudgetConverted(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Setting: Validity Days */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-150 space-y-2">
                <label htmlFor="input-validity-days" className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                  Prazo Padrão de Validade de Orçamentos (Dias)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="input-validity-days"
                    type="number"
                    min={1}
                    max={90}
                    value={validityDays}
                    onChange={e => setValidityDays(Number(e.target.value))}
                    className="w-24 p-2 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-900"
                    required
                  />
                  <span className="text-xs text-slate-600">
                    Após este período, o orçamento expira e os itens reservados voltam a ficar disponíveis para venda no estoque.
                  </span>
                </div>
              </div>

              {/* Setting: Payment Policy & Deposit (Sinal de Entrada / Cobrança) */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Política de Cobrança & Sinal da Oficina (Antes / Depois do Serviço)
                  </h4>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-emerald-900 block">
                    Modo Padrão de Cobrança de Serviços:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition flex items-start gap-2 ${
                      paymentMode === 'AFTER_COMPLETION' 
                        ? 'bg-white border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500' 
                        : 'bg-emerald-50/40 border-emerald-200 text-slate-700 hover:bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="paymentRequirementMode"
                        value="AFTER_COMPLETION"
                        checked={paymentMode === 'AFTER_COMPLETION'}
                        onChange={e => setPaymentMode(e.target.value)}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <div>
                        <span className="font-bold block text-slate-800">1. Pós-Pago (100%)</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">Recebe integral na conclusão/entrega do serviço</span>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition flex items-start gap-2 ${
                      paymentMode === 'ADVANCE_DEPOSIT' 
                        ? 'bg-white border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500' 
                        : 'bg-emerald-50/40 border-emerald-200 text-slate-700 hover:bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="paymentRequirementMode"
                        value="ADVANCE_DEPOSIT"
                        checked={paymentMode === 'ADVANCE_DEPOSIT'}
                        onChange={e => setPaymentMode(e.target.value)}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <div>
                        <span className="font-bold block text-slate-800">2. Sinal de Entrada</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">Exige % de sinal antes para liberar execução</span>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition flex items-start gap-2 ${
                      paymentMode === 'FULL_ADVANCE' 
                        ? 'bg-white border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500' 
                        : 'bg-emerald-50/40 border-emerald-200 text-slate-700 hover:bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="paymentRequirementMode"
                        value="FULL_ADVANCE"
                        checked={paymentMode === 'FULL_ADVANCE'}
                        onChange={e => setPaymentMode(e.target.value)}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <div>
                        <span className="font-bold block text-slate-800">3. 100% Antecipado</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">Exige pagamento integral antes de iniciar</span>
                      </div>
                    </label>
                  </div>
                </div>

                {paymentMode === 'ADVANCE_DEPOSIT' && (
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 space-y-1.5 animate-fade-in">
                    <label htmlFor="input-deposit-pct" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Porcentagem Padrão de Sinal / Entrada:</span>
                      <span className="text-emerald-700 font-mono">{depositPct}%</span>
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
                        className="w-20 p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                      />
                      <input
                        type="range"
                        min={5}
                        max={90}
                        step={5}
                        value={depositPct}
                        onChange={e => setDepositPct(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Exemplo: Em um serviço de R$ 1.000,00, o sinal exigido será de R$ {(1000 * (depositPct/100)).toFixed(2)}. Restante no término.
                    </p>
                  </div>
                )}

                <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireDepositExecute}
                      onChange={e => setRequireDepositExecute(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Alertar/Bloquear início do serviço na oficina no semáforo se o sinal exigir pagamento e estiver pendente</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowClientOverride}
                      onChange={e => setAllowClientOverride(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Permitir configurar regras de pagamento personalizadas individualmente por cliente (no cadastro do cliente)</span>
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
