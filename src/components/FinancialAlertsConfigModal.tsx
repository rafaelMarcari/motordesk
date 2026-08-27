import React, { useState } from 'react';
import { Bell, Clock, Calendar, ShieldCheck, DollarSign, Package, TrendingUp, Check, X, AlertTriangle } from 'lucide-react';
import { AlertSettings, User } from '../types';

interface FinancialAlertsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AlertSettings;
  currentUser: User;
  onSave: (newSettings: AlertSettings) => void;
}

export const FinancialAlertsConfigModal: React.FC<FinancialAlertsConfigModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  currentUser,
  onSave,
}) => {
  const [formData, setFormData] = useState<AlertSettings>({
    ...currentSettings,
    enableReceivableDueAlerts: currentSettings.enableReceivableDueAlerts ?? true,
    receivableDueNoticeDays: currentSettings.receivableDueNoticeDays ?? 3,
    enablePayableDueAlerts: currentSettings.enablePayableDueAlerts ?? true,
    payableDueNoticeDays: currentSettings.payableDueNoticeDays ?? 5,
    showFinancialAlertsOnDashboard: currentSettings.showFinancialAlertsOnDashboard ?? true,
    showFinancialAlertsInModule: currentSettings.showFinancialAlertsInModule ?? true,
    financialAlertFrequency: currentSettings.financialAlertFrequency ?? 'daily',
    enableDormantStockAlerts: currentSettings.enableDormantStockAlerts ?? true,
    dormantStockDaysThreshold: currentSettings.dormantStockDaysThreshold ?? 60,
    enableCostIncreaseAlerts: currentSettings.enableCostIncreaseAlerts ?? true,
    costIncreaseThresholdPercent: currentSettings.costIncreaseThresholdPercent ?? 10,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Parâmetros de Alertas & Notificações</h2>
              <p className="text-xs text-slate-300">
                Configure os gatilhos e dias de antecedência para contas a vencer, compras e estoque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Parâmetros Atualizados com Sucesso!</h3>
            <p className="text-sm text-slate-500">As novas regras de alerta já estão ativas em todo o sistema.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Bloco 1: Contas a Receber & A Pagar */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Alertas de Contas a Receber e a Pagar</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contas a Receber */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Contas a Receber
                    </label>
                    <input
                      type="checkbox"
                      checked={formData.enableReceivableDueAlerts}
                      onChange={(e) => setFormData({ ...formData, enableReceivableDueAlerts: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Avisar com antecedência de:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        disabled={!formData.enableReceivableDueAlerts}
                        value={formData.receivableDueNoticeDays}
                        onChange={(e) => setFormData({ ...formData, receivableDueNoticeDays: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-20 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="text-xs text-slate-500">dias antes do vencimento</span>
                    </div>
                  </div>
                </div>

                {/* Contas a Pagar */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Contas a Pagar
                    </label>
                    <input
                      type="checkbox"
                      checked={formData.enablePayableDueAlerts}
                      onChange={(e) => setFormData({ ...formData, enablePayableDueAlerts: e.target.checked })}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Avisar com antecedência de:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        disabled={!formData.enablePayableDueAlerts}
                        value={formData.payableDueNoticeDays}
                        onChange={(e) => setFormData({ ...formData, payableDueNoticeDays: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-20 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="text-xs text-slate-500">dias antes do vencimento</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Exibição e Frequência */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Locais de Exibição & Frequência</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.showFinancialAlertsOnDashboard}
                    onChange={(e) => setFormData({ ...formData, showFinancialAlertsOnDashboard: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Painel Dashboard</p>
                    <p className="text-[11px] text-slate-500">Exibir resumo de vencimentos na visão geral</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.showFinancialAlertsInModule}
                    onChange={(e) => setFormData({ ...formData, showFinancialAlertsInModule: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Banner no Módulo</p>
                    <p className="text-[11px] text-slate-500">Exibir aviso no topo de Contas a Receber/Pagar</p>
                  </div>
                </label>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Frequência de Checagem
                  </label>
                  <select
                    value={formData.financialAlertFrequency}
                    onChange={(e) => setFormData({ ...formData, financialAlertFrequency: e.target.value as any })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="daily">Diária (Ao abrir)</option>
                    <option value="realtime">Tempo Real</option>
                    <option value="always">Sempre Ativo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bloco 3: Alertas de Compras & Estoque */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
                <Package className="w-4 h-4 text-amber-600" />
                <span>Alertas de Estoque & Variação de Custos</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Capital Parado (Sem Giro) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Produtos sem Giro (Capital Parado)
                    </label>
                    <input
                      type="checkbox"
                      checked={formData.enableDormantStockAlerts}
                      onChange={(e) => setFormData({ ...formData, enableDormantStockAlerts: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Considerar parado após:
                    </label>
                    <select
                      disabled={!formData.enableDormantStockAlerts}
                      value={formData.dormantStockDaysThreshold}
                      onChange={(e) => setFormData({ ...formData, dormantStockDaysThreshold: parseInt(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="30">30 dias sem movimentação</option>
                      <option value="60">60 dias sem movimentação (Recomendado)</option>
                      <option value="90">90 dias sem movimentação</option>
                      <option value="180">180 dias sem movimentação (Crítico)</option>
                      <option value="365">365 dias sem movimentação (Obsoleto)</option>
                    </select>
                  </div>
                </div>

                {/* Variação de Custo de Aquisição */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      Aumento no Custo de Compra
                    </label>
                    <input
                      type="checkbox"
                      checked={formData.enableCostIncreaseAlerts}
                      onChange={(e) => setFormData({ ...formData, enableCostIncreaseAlerts: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Alertar se custo subir mais de:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        disabled={!formData.enableCostIncreaseAlerts}
                        value={formData.costIncreaseThresholdPercent}
                        onChange={(e) => setFormData({ ...formData, costIncreaseThresholdPercent: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-20 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="text-xs text-slate-500">% em relação à compra anterior</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé / Ações */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Salvo e auditado por: {currentUser.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Parâmetros
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
