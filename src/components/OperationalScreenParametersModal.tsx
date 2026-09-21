import React, { useState } from 'react';
import {
  Sliders,
  Monitor,
  CheckCircle2,
  Save,
  X,
  Building2,
  DollarSign,
  Percent,
  Clock,
  Layout,
  FileSpreadsheet,
  Layers,
  Palette,
  Eye,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { AppDatabase, User, CompanyInfo } from '../types';

export interface OperationalScreenParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  db?: AppDatabase;
  currentUser?: User;
  companyInfo?: CompanyInfo;
  onSave?: (info: any) => void;
  onSaveCompanyInfo?: (info: CompanyInfo) => void;
  onAddHistoryLog?: (entry: any) => void;
}

export function OperationalScreenParametersModal({
  isOpen,
  onClose,
  db,
  currentUser,
  companyInfo,
  onSave,
  onSaveCompanyInfo,
  onAddHistoryLog
}: OperationalScreenParametersModalProps) {
  // Divisão explícita solicitada pelo usuário:
  // 1. "Parâmetros de Operacional"
  // 2. "Parâmetros de Tela"
  const [activeTab, setActiveTab] = useState<'operacional' | 'tela'>('operacional');

  // Parâmetros Operacionais (com persistência em localStorage)
  const [defaultInterestPct, setDefaultInterestPct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('motordesk_operational_params');
      if (saved) return JSON.parse(saved).defaultInterestPct ?? 1.0;
    } catch {}
    return 1.0;
  });
  const [defaultFinePct, setDefaultFinePct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('motordesk_operational_params');
      if (saved) return JSON.parse(saved).defaultFinePct ?? 2.0;
    } catch {}
    return 2.0;
  });
  const [defaultDueDays, setDefaultDueDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('motordesk_operational_params');
      if (saved) return JSON.parse(saved).defaultDueDays ?? 30;
    } catch {}
    return 30;
  });
  const [minRetailMarginPct, setMinRetailMarginPct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('motordesk_operational_params');
      if (saved) return JSON.parse(saved).minRetailMarginPct ?? 30.0;
    } catch {}
    return 30.0;
  });
  const [minWholesaleMarginPct, setMinWholesaleMarginPct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('motordesk_operational_params');
      if (saved) return JSON.parse(saved).minWholesaleMarginPct ?? 25.0;
    } catch {}
    return 25.0;
  });
  const [blockOverdueClients, setBlockOverdueClients] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('motordesk_operational_params');
      if (saved) return JSON.parse(saved).blockOverdueClients ?? true;
    } catch {}
    return true;
  });
  const [autoSefazTransmit, setAutoSefazTransmit] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('motordesk_operational_params');
      if (saved) return JSON.parse(saved).autoSefazTransmit ?? true;
    } catch {}
    return true;
  });
  const [defaultFiscalModel, setDefaultFiscalModel] = useState<'55' | '65' | 'NFS-e'>('55');

  // Parâmetros de Tela / Exibição (com persistência em localStorage)
  const [tableDensity, setTableDensity] = useState<'compact' | 'normal' | 'comfortable'>('compact');
  const [showTopCompanyBanner, setShowTopCompanyBanner] = useState<boolean>(true);
  const [enableHighContrast, setEnableHighContrast] = useState<boolean>(true);
  const [showTotalsFooterAlways, setShowTotalsFooterAlways] = useState<boolean>(true);
  const [fontSizeScale, setFontSizeScale] = useState<'sm' | 'md' | 'lg'>('sm');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = () => {
    const currentUserName = currentUser?.name || 'Administrador';
    const operationalParams = {
      defaultInterestPct,
      defaultFinePct,
      defaultDueDays,
      minRetailMarginPct,
      minWholesaleMarginPct,
      blockOverdueClients,
      autoSefazTransmit,
      defaultFiscalModel,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserName
    };

    const screenParams = {
      tableDensity,
      showTopCompanyBanner,
      enableHighContrast,
      showTotalsFooterAlways,
      fontSizeScale,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserName
    };

    try {
      localStorage.setItem('motordesk_operational_params', JSON.stringify(operationalParams));
      localStorage.setItem('motordesk_screen_params', JSON.stringify(screenParams));
      window.dispatchEvent(new CustomEvent('motordesk_params_updated', { detail: { operationalParams, screenParams } }));
    } catch {}

    const currentCompany = companyInfo || db?.companyInfo;
    const saveCb = onSaveCompanyInfo || onSave;
    if (saveCb && currentCompany) {
      saveCb({
        ...currentCompany,
        operationalSettings: operationalParams as any,
        screenSettings: screenParams as any
      });
    }

    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'UPDATE_SYSTEM_PARAMETERS',
        description: `Parâmetros do sistema atualizados por ${currentUserName}: Divisão Operacional e Tela persistida.`,
        user: currentUserName,
        date: new Date().toISOString()
      });
    }

    setSaveSuccessMsg('Parâmetros Operacionais e de Tela salvos e aplicados com sucesso!');
    setTimeout(() => {
      setSaveSuccessMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wider">
                Configuração de Parâmetros do Sistema
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Divisão: Parâmetros de Operacional vs. Parâmetros de Tela
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ABAS DIVIDIDAS CONFORME SOLICITADO: OPERACIONAL | TELA */}
        <div className="bg-slate-100 px-4 pt-2 border-b border-slate-300 flex items-center gap-2">
          <button
            type="button"
            id="tab-param-operacional"
            onClick={() => setActiveTab('operacional')}
            className={`px-4 py-2 rounded-t-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'operacional'
                ? 'bg-white text-indigo-900 border-slate-300 border-b-white -mb-px shadow-2xs'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-600 border-transparent'
            }`}
          >
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>Parâmetros de Operacional</span>
          </button>

          <button
            type="button"
            id="tab-param-tela"
            onClick={() => setActiveTab('tela')}
            className={`px-4 py-2 rounded-t-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'tela'
                ? 'bg-white text-indigo-900 border-slate-300 border-b-white -mb-px shadow-2xs'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-600 border-transparent'
            }`}
          >
            <Monitor className="w-4 h-4 text-sky-600" />
            <span>Parâmetros de Tela</span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA SELECIONADA */}
        <div className="p-5 max-h-[460px] overflow-y-auto text-xs space-y-4">
          {activeTab === 'operacional' ? (
            /* ABA 1: PARÂMETROS OPERACIONAIS */
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 font-medium">
                Regras de negócio, políticas de cobrança, margens comerciais e transmissão fiscal automatizada.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Juros de Mora ao Mês (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={defaultInterestPct}
                    onChange={(e) => setDefaultInterestPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500">Aplicado após o vencimento do título.</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Multa por Atraso (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={defaultFinePct}
                    onChange={(e) => setDefaultFinePct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500">Multa única compensatória.</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Margem Mínima no Varejo (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={minRetailMarginPct}
                    onChange={(e) => setMinRetailMarginPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-500">Alerta se preço de venda ficar abaixo da margem.</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Margem Mínima no Atacado (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={minWholesaleMarginPct}
                    onChange={(e) => setMinWholesaleMarginPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-500">Piso para pedidos frotistas e corporativos.</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blockOverdueClients}
                    onChange={(e) => setBlockOverdueClients(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Bloquear faturamento de clientes com títulos vencidos</span>
                    <span className="text-[10.5px] text-slate-500">Exige autorização do setor financeiro para liberação de novas OSs ou vendas.</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSefazTransmit}
                    onChange={(e) => setAutoSefazTransmit(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Transmissão automática imediata para SEFAZ ao faturar</span>
                    <span className="text-[10.5px] text-slate-500">Gera autorização e XML homologado sem necessidade de lote manual.</span>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            /* ABA 2: PARÂMETROS DE TELA */
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-950 font-medium">
                Preferências de layout, densidade de tabelas, contraste, posicionamento de logos e visibilidade de colunas.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Densidade da Tabela
                  </label>
                  <select
                    value={tableDensity}
                    onChange={(e) => setTableDensity(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                  >
                    <option value="compact">Compacto ERP (Padrão Wareline)</option>
                    <option value="normal">Normal (Espaçamento Padrão)</option>
                    <option value="comfortable">Amplo / Confortável</option>
                  </select>
                  <span className="text-[10px] text-slate-500">Ajusta o padding vertical de cada linha da grid.</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Escala de Fonte
                  </label>
                  <select
                    value={fontSizeScale}
                    onChange={(e) => setFontSizeScale(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                  >
                    <option value="sm">11px / 12px (Alta Densidade)</option>
                    <option value="md">13px / 14px (Médio)</option>
                    <option value="lg">15px / 16px (Grande)</option>
                  </select>
                  <span className="text-[10px] text-slate-500">Tamanho padrão para dados numéricos e tabelas.</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTopCompanyBanner}
                    onChange={(e) => setShowTopCompanyBanner(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Exibir Logo da Empresa e Logo do Software no Canto Superior Direito</span>
                    <span className="text-[10.5px] text-slate-500">Mantém co-branding da empresa cliente e do MotorDesk ERP sempre visíveis no topo.</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTotalsFooterAlways}
                    onChange={(e) => setShowTotalsFooterAlways(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Rodapé de totalizadores fixo em todas as tabelas</span>
                    <span className="text-[10.5px] text-slate-500">Exibe saldo, juros, multas, descontos e total de títulos sem rolar a página.</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableHighContrast}
                    onChange={(e) => setEnableHighContrast(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Modo Alto Contraste de Status (Amarelo, Azul, Verde, Vermelho)</span>
                    <span className="text-[10.5px] text-slate-500">Destaca títulos a receber, parciais, recebidos e vencidos com badges visuais nítidos.</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {saveSuccessMsg && (
          <div className="mx-4 mb-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Rodapé com Botão Salvar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            Operador: <strong className="text-slate-700">{currentUser.name}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Parâmetros</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
