/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK — MÓDULO DE OBRIGAÇÕES E GUIAS FISCAIS (GNRE / DARE / DAE)
 * 
 * Avaliação contextual dinâmica de obrigações tributárias:
 * - ICMS-ST (Substituição Tributária Estadual)
 * - DIFAL (Diferencial de Alíquota EC 87/15)
 * - FCP (Fundo de Combate à Pobreza)
 * - Zona Franca de Manaus / Suframa PIN
 * - Geração de Guias Oficiais com Código de Barras FEBRABAN, Linha Digitável e PIX Copia-e-Cola
 * - Memória de Cálculo Passo a Passo com Base Legal e Protocolos/Convênios
 * - Baixa e Liquidação Bancária, Cancelamento com Justificativa e Auditoria
 */

import React, { useState, useMemo } from 'react';
import { 
  TaxObligationGuide, 
  TaxObligationType, 
  TaxObligationStatus, 
  CompanyInfo, 
  Client, 
  Part, 
  User, 
  AppDatabase, 
  HistoryEntry,
  TaxCalculationMemory
} from '../types';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Ban, 
  Download, 
  Printer, 
  QrCode, 
  Copy, 
  Calculator, 
  DollarSign, 
  ArrowRight, 
  Building, 
  MapPin, 
  ShieldCheck, 
  BookOpen, 
  Info,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Landmark,
  FileCheck
} from 'lucide-react';
import { 
  identifyTaxObligations, 
  STATE_TAX_TABLE, 
  AUTO_PARTS_MVA_TABLE 
} from '../utils/taxObligationEngine';
import { createSecurityAuditLog } from '../utils/securityUtils';

interface TaxObligationsViewProps {
  db: AppDatabase;
  currentUser?: User;
  currentCompany?: CompanyInfo;
  onSaveDatabase: (updatedDb: AppDatabase) => void;
  onNavigate?: (view: string) => void;
}

export const TaxObligationsView: React.FC<TaxObligationsViewProps> = ({
  db,
  currentUser,
  currentCompany,
  onSaveDatabase,
  onNavigate
}) => {
  // Filtros de listagem
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [authorityFilter, setAuthorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modais
  const [selectedGuideForView, setSelectedGuideForView] = useState<TaxObligationGuide | null>(null);
  const [selectedGuideForSettle, setSelectedGuideForSettle] = useState<TaxObligationGuide | null>(null);
  const [selectedGuideForCancel, setSelectedGuideForCancel] = useState<TaxObligationGuide | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Estados de Liquidação / Pagamento
  const [settleAuthCode, setSettleAuthCode] = useState<string>('');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<string>('PIX');

  // Estados de Cancelamento
  const [cancellationJustification, setCancellationJustification] = useState<string>('');

  // Estados do Simulador / Gerador de Guia
  const [simOriginUf, setSimOriginUf] = useState<string>(currentCompany?.uf || 'SP');
  const [simDestUf, setSimDestUf] = useState<string>('RJ');
  const [simClientId, setSimClientId] = useState<string>('');
  const [simRecipientType, setSimRecipientType] = useState<'contributor' | 'final_consumer'>('contributor');
  const [simSelectedParts, setSimSelectedParts] = useState<Array<{ partId: string; quantity: number; unitPrice: number }>>([
    { partId: db.parts?.[0]?.id || 'p-1', quantity: 2, unitPrice: db.parts?.[0]?.salePrice || 150.0 }
  ]);
  const [simNfeNumber, setSimNfeNumber] = useState<string>('105');

  // Filtragem de Guias do Tenant
  const allGuides: TaxObligationGuide[] = useMemo(() => {
    const rawGuides = db.taxObligationGuides || [];
    if (!currentCompany?.id) return rawGuides;
    return rawGuides.filter(g => !g.companyId || g.companyId === currentCompany.id);
  }, [db.taxObligationGuides, currentCompany]);

  const filteredGuides = useMemo(() => {
    return allGuides.filter(guide => {
      if (statusFilter !== 'ALL' && guide.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && guide.obligationType !== typeFilter) return false;
      if (authorityFilter !== 'ALL' && guide.authority !== authorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = guide.guideNumber?.toLowerCase().includes(q);
        const matchInvoice = guide.invoiceKey?.toLowerCase().includes(q) || guide.nfeNumber?.toString().includes(q);
        const matchClient = guide.clientName?.toLowerCase().includes(q) || guide.clientCpfCnpj?.includes(q);
        const matchName = guide.obligationName?.toLowerCase().includes(q);
        if (!matchNumber && !matchInvoice && !matchClient && !matchName) return false;
      }
      return true;
    });
  }, [allGuides, statusFilter, typeFilter, authorityFilter, searchQuery]);

  // Indicadores Numéricos
  const kpis = useMemo(() => {
    const totalCount = allGuides.length;
    const pendingCount = allGuides.filter(g => g.status === 'PENDENTE' || g.status === 'AGUARDANDO_PAGAMENTO' || g.status === 'GERADA').length;
    const paidCount = allGuides.filter(g => g.status === 'PAGA').length;
    const totalAmount = allGuides.reduce((acc, g) => acc + (g.totalAmount || 0), 0);
    const pendingAmount = allGuides
      .filter(g => g.status === 'PENDENTE' || g.status === 'AGUARDANDO_PAGAMENTO' || g.status === 'GERADA')
      .reduce((acc, g) => acc + (g.totalAmount || 0), 0);
    const paidAmount = allGuides
      .filter(g => g.status === 'PAGA')
      .reduce((acc, g) => acc + (g.totalAmount || 0), 0);
    const stAmount = allGuides.filter(g => g.obligationType === 'ICMS_ST').reduce((acc, g) => acc + g.totalAmount, 0);
    const difalAmount = allGuides.filter(g => g.obligationType === 'DIFAL').reduce((acc, g) => acc + g.totalAmount, 0);
    const fcpAmount = allGuides.filter(g => g.obligationType === 'FCP').reduce((acc, g) => acc + g.totalAmount, 0);

    return {
      totalCount,
      pendingCount,
      paidCount,
      totalAmount,
      pendingAmount,
      paidAmount,
      stAmount,
      difalAmount,
      fcpAmount
    };
  }, [allGuides]);

  // Lista de UFs disponíveis
  const availableUfs = useMemo(() => Object.keys(STATE_TAX_TABLE), []);

  // Cálculo da simulação atual
  const simulationResult = useMemo(() => {
    if (!isSimulatorOpen) return null;

    const matchedClient = db.clients?.find(c => c.id === simClientId);
    const clientForCalc: Client = matchedClient || {
      id: 'sim-client',
      name: 'Cliente Simulação Fiscal',
      cpf: '33.444.555/0001-99',
      email: 'fiscal@cliente.com.br',
      phone: '(11) 99999-8888',
      address: `Avenida Principal, 500 - Capital / ${simDestUf}`,
      uf: simDestUf,
      indicadorIe: simRecipientType === 'contributor' ? '1' : '9',
      isConsumidorFinal: simRecipientType === 'final_consumer',
      createdAt: '',
      companyId: currentCompany?.id || 'comp-1'
    };

    const itemsForCalc = simSelectedParts.map(sp => {
      const part = db.parts?.find(p => p.id === sp.partId);
      return {
        id: sp.partId,
        code: part?.code || 'PEC-001',
        name: part?.name || 'Peça Automotiva',
        ncm: part?.ncm || '8708.29.99',
        cest: part?.cest || '10.001.00',
        cfop: simOriginUf === simDestUf ? '5.405' : '6.401',
        quantity: sp.quantity,
        unitPrice: sp.unitPrice,
        totalPrice: sp.quantity * sp.unitPrice,
        type: 'part' as const
      };
    });

    const companyForCalc: CompanyInfo = currentCompany || {
      id: 'comp-1',
      name: 'MotorDesk Matriz',
      cnpj: '12.345.678/0001-90',
      uf: simOriginUf,
      crt: '1',
      taxRegime: 'simples_nacional',
      address: 'Rua Principal, 100',
      phone: '(11) 3333-4444',
      whatsapp: '11999998888',
      email: 'fiscal@motordesk.com.br',
      registeredAt: new Date().toISOString()
    };

    return identifyTaxObligations({
      company: { ...companyForCalc, uf: simOriginUf },
      client: clientForCalc,
      clientUf: simDestUf,
      items: itemsForCalc,
      nfeNumber: simNfeNumber,
      nfeSeries: '1',
      invoiceKey: `3526081234567800019055001000000${simNfeNumber.padStart(3, '0')}1009837260`
    });
  }, [
    isSimulatorOpen,
    simOriginUf,
    simDestUf,
    simClientId,
    simRecipientType,
    simSelectedParts,
    simNfeNumber,
    db.clients,
    db.parts,
    currentCompany
  ]);

  // Copiar para clipboard com feedback
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Salvar Guia Gerada a partir da Simulação
  const handleSaveSimulatedGuides = () => {
    if (!simulationResult || simulationResult.guides.length === 0) return;

    const newGuides = [...(db.taxObligationGuides || [])];
    const newLogs: HistoryEntry[] = [];

    simulationResult.guides.forEach(g => {
      newGuides.unshift(g);
      newLogs.unshift(
        createSecurityAuditLog({
          userId: currentUser?.id || 'usr-validador',
          userName: currentUser?.name || 'Validador QA',
          companyId: currentCompany?.id || 'comp-1',
          action: 'GUIDE_GENERATED',
          title: `Guia Fiscal Gerada (${g.obligationType})`,
          description: `Guia ${g.guideNumber} gerada no valor de R$ ${g.totalAmount.toFixed(2)} para SEFAZ/${g.authority} vinculada à NF-e ${g.nfeNumber || 'S/N'}.`,
          targetRecordId: g.id,
          newValue: { guideNumber: g.guideNumber, amount: g.totalAmount, authority: g.authority }
        })
      );
    });

    const updatedDb: AppDatabase = {
      ...db,
      taxObligationGuides: newGuides,
      history: [...newLogs, ...(db.history || [])]
    };

    onSaveDatabase(updatedDb);
    setIsSimulatorOpen(false);
  };

  // Liquidação de Guia
  const handleConfirmSettle = () => {
    if (!selectedGuideForSettle) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedGuides = (db.taxObligationGuides || []).map(g => {
      if (g.id === selectedGuideForSettle.id) {
        return {
          ...g,
          status: 'PAGA' as TaxObligationStatus,
          paidAt: now,
          paidBy: currentUser?.name || 'Administrador',
          paymentMethod: settlePaymentMethod,
          bankAuthentication: settleAuthCode || `AUTH-BANCO-${Date.now().toString().slice(-6)}`
        };
      }
      return g;
    });

    const auditLog = createSecurityAuditLog({
      userId: currentUser?.id || 'usr-validador',
      userName: currentUser?.name || 'Validador QA',
      companyId: currentCompany?.id || 'comp-1',
      action: 'GUIDE_PAID',
      title: `Liquidação de Guia Fiscal ${selectedGuideForSettle.guideNumber}`,
      description: `Guia no valor de R$ ${selectedGuideForSettle.totalAmount.toFixed(2)} marcada como PAGA via ${settlePaymentMethod}. Autenticação: ${settleAuthCode || 'Gerada Automática'}.`,
      targetRecordId: selectedGuideForSettle.id,
      previousValue: selectedGuideForSettle.status,
      newValue: 'PAGA'
    });

    onSaveDatabase({
      ...db,
      taxObligationGuides: updatedGuides,
      history: [auditLog, ...(db.history || [])]
    });

    setSelectedGuideForSettle(null);
    setSettleAuthCode('');
  };

  // Cancelamento de Guia
  const handleConfirmCancel = () => {
    if (!selectedGuideForCancel || !cancellationJustification.trim()) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedGuides = (db.taxObligationGuides || []).map(g => {
      if (g.id === selectedGuideForCancel.id) {
        return {
          ...g,
          status: 'CANCELADA' as TaxObligationStatus,
          canceledAt: now,
          canceledBy: currentUser?.name || 'Administrador',
          cancellationReason: cancellationJustification
        };
      }
      return g;
    });

    const auditLog = createSecurityAuditLog({
      userId: currentUser?.id || 'usr-validador',
      userName: currentUser?.name || 'Validador QA',
      companyId: currentCompany?.id || 'comp-1',
      action: 'GUIDE_CANCELED',
      title: `Cancelamento de Guia Fiscal ${selectedGuideForCancel.guideNumber}`,
      description: `Guia estornada/cancelada. Motivo: "${cancellationJustification}".`,
      targetRecordId: selectedGuideForCancel.id,
      previousValue: selectedGuideForCancel.status,
      newValue: 'CANCELADA',
      justification: cancellationJustification
    });

    onSaveDatabase({
      ...db,
      taxObligationGuides: updatedGuides,
      history: [auditLog, ...(db.history || [])]
    });

    setSelectedGuideForCancel(null);
    setCancellationJustification('');
  };

  // Cores de Status
  const getStatusBadge = (status: TaxObligationStatus) => {
    switch (status) {
      case 'PAGA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Quitada / Paga
          </span>
        );
      case 'AGUARDANDO_PAGAMENTO':
      case 'GERADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" /> Aguardando Pgto
          </span>
        );
      case 'VENCIDA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Vencida
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            <Ban className="w-3.5 h-3.5" /> Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <FileText className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  const getTypeBadge = (type: TaxObligationType) => {
    switch (type) {
      case 'ICMS_ST':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">ICMS-ST</span>;
      case 'DIFAL':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">DIFAL EC 87/15</span>;
      case 'FCP':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300">FCP Destino</span>;
      case 'SUFRAMA':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">PIN Suframa</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Principal com Breadcrumbs e Ações */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Landmark className="w-4 h-4" /> Módulo Fiscal & SEFAZ Nacional
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            Obrigações e Guias Fiscais
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              GNRE / DARE / DAE
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Motor de apuração contextual de ICMS-ST, DIFAL Partilha, FCP e retenções tributárias. Emissão de guias oficiais integradas ao XML das notas fiscais.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Calculator className="w-4 h-4" />
            Apurar & Gerar Nova Guia
          </button>
        </div>
      </div>

      {/* Alerta de Feedback de Cópia */}
      {copyFeedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{copyFeedback} copiado com sucesso!</span>
        </div>
      )}

      {/* Grid de KPIs & Indicadores de Obrigações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Apurado (Geral)</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            R$ {kpis.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>{kpis.totalCount} guias registradas no período</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Aguardando Pagamento</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            R$ {kpis.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>{kpis.pendingCount} títulos a recolher</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Liquidado (Pago)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            R$ {kpis.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>{kpis.paidCount} guias quitadas com autenticação</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">ICMS-ST + DIFAL + FCP</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">ST:</span>
              <span>R$ {kpis.stAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">DIFAL:</span>
              <span>R$ {kpis.difalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">FCP:</span>
              <span>R$ {kpis.fcpAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número da guia, NF-e, cliente, CPF/CNPJ..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</option>
              <option value="PAGA">Paga / Liquidada</option>
              <option value="GERADA">Gerada</option>
              <option value="VENCIDA">Vencida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="ICMS_ST">ICMS-ST</option>
              <option value="DIFAL">DIFAL EC 87/15</option>
              <option value="FCP">FCP Destino</option>
              <option value="SUFRAMA">PIN Suframa</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">UF Favorecida:</span>
            <select
              value={authorityFilter}
              onChange={(e) => setAuthorityFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Todas as UFs</option>
              {availableUfs.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Principal de Guias Fiscais */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Guia / Número</th>
                <th className="py-3.5 px-4">Tipo & Favorecido</th>
                <th className="py-3.5 px-4">NF-e Vinculada</th>
                <th className="py-3.5 px-4">Destinatário</th>
                <th className="py-3.5 px-4">Base & Alíquota</th>
                <th className="py-3.5 px-4">Valor Total</th>
                <th className="py-3.5 px-4">Vencimento</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300 font-normal">
              {filteredGuides.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhuma guia ou obrigação tributária encontrada</p>
                    <p className="text-xs text-slate-400 mt-1">Utilize o botão "Apurar & Gerar Nova Guia" para calcular impostos de uma operação.</p>
                  </td>
                </tr>
              ) : (
                filteredGuides.map(guide => (
                  <tr key={guide.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <div>{guide.guideNumber}</div>
                          <span className="text-[10px] text-slate-400 font-sans">Receita: {guide.revenueCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {getTypeBadge(guide.obligationType)}
                        <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          {guide.authority}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {guide.nfeNumber ? (
                        <div className="text-slate-900 dark:text-slate-200">
                          NF-e #{guide.nfeNumber} (Série {guide.nfeSeries || '1'})
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Avulsa / Pré-emissão</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="truncate max-w-[180px] font-medium text-slate-900 dark:text-white">
                        {guide.clientName || 'Consumidor'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{guide.clientCpfCnpj || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 dark:text-slate-200 font-medium">
                        R$ {guide.calculationBase.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">Aliq: {guide.rate.toFixed(1)}%</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      R$ {guide.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{guide.dueDate}</div>
                      <div className="text-[10px] text-slate-400">Emissão: {guide.issueDate || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(guide.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedGuideForView(guide)}
                          title="Visualizar Guia & Memória de Cálculo"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>

                        {guide.status !== 'PAGA' && guide.status !== 'CANCELADA' && (
                          <button
                            onClick={() => setSelectedGuideForSettle(guide)}
                            title="Registrar Baixa / Pagamento"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {guide.status !== 'CANCELADA' && (
                          <button
                            onClick={() => setSelectedGuideForCancel(guide)}
                            title="Cancelar Guia"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: SIMULADOR & APURAÇÃO DE OBRIGAÇÕES FISCAIS                          */}
      {/* ========================================================================= */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Motor de Apuração de Obrigações & Guias Fiscais
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Avaliação contextual (Origem × Destino × Perfil Destinatário × NCM/CEST)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Contexto da Operação */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" /> 1. Contexto Territorial & Perfil da Operação
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      UF Origem (Emitente)
                    </label>
                    <select
                      value={simOriginUf}
                      onChange={(e) => setSimOriginUf(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                    >
                      {availableUfs.map(uf => (
                        <option key={uf} value={uf}>{uf} - {STATE_TAX_TABLE[uf].guideFormat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      UF Destino (Favorecido)
                    </label>
                    <select
                      value={simDestUf}
                      onChange={(e) => setSimDestUf(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                    >
                      {availableUfs.map(uf => (
                        <option key={uf} value={uf}>{uf} - {STATE_TAX_TABLE[uf].guideFormat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Perfil Destinatário
                    </label>
                    <select
                      value={simRecipientType}
                      onChange={(e) => setSimRecipientType(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                    >
                      <option value="contributor">Contribuinte ICMS (Revenda / ST)</option>
                      <option value="final_consumer">Consumidor Final Não Contribuinte (DIFAL)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Número da NF-e
                    </label>
                    <input
                      type="text"
                      value={simNfeNumber}
                      onChange={(e) => setSimNfeNumber(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Itens da Operação */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> 2. Peças & Mercadorias na Operação
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const firstPart = db.parts?.[0];
                      if (firstPart) {
                        setSimSelectedParts([...simSelectedParts, { partId: firstPart.id, quantity: 1, unitPrice: firstPart.salePrice }]);
                      }
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Peça
                  </button>
                </div>

                <div className="space-y-2">
                  {simSelectedParts.map((sp, idx) => {
                    const part = db.parts?.find(p => p.id === sp.partId);
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex-1">
                          <select
                            value={sp.partId}
                            onChange={(e) => {
                              const newPart = db.parts?.find(p => p.id === e.target.value);
                              const updated = [...simSelectedParts];
                              updated[idx].partId = e.target.value;
                              if (newPart) updated[idx].unitPrice = newPart.salePrice;
                              setSimSelectedParts(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                          >
                            {(db.parts || []).map(p => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name} (NCM: {p.ncm || '8708.29.99'} | CEST: {p.cest || '10.001.00'})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            value={sp.quantity}
                            onChange={(e) => {
                              const updated = [...simSelectedParts];
                              updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                              setSimSelectedParts(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-center"
                            placeholder="Qtd"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            step="0.01"
                            value={sp.unitPrice}
                            onChange={(e) => {
                              const updated = [...simSelectedParts];
                              updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                              setSimSelectedParts(updated);
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-right"
                            placeholder="Valor R$"
                          />
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 w-24 text-right">
                          R$ {(sp.quantity * sp.unitPrice).toFixed(2)}
                        </div>
                        {simSelectedParts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSimSelectedParts(simSelectedParts.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resultado da Apuração */}
              {simulationResult && (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> 3. Obrigações Identificadas pelo Motor
                    </h4>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Total a Recolher: R$ {simulationResult.totalObligationsAmount.toFixed(2)}
                    </span>
                  </div>

                  {simulationResult.guides.length === 0 ? (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Operação sem obrigações de guias avulsas (operação interna ou produtos não sujeitos a ST/DIFAL).
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {simulationResult.guides.map((g, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getTypeBadge(g.obligationType)}
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{g.obligationName}</span>
                              <span className="text-xs text-slate-400">Receita: {g.revenueCode}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-bold text-slate-900 dark:text-white">
                                R$ {g.totalAmount.toFixed(2)}
                              </div>
                              <span className="text-[10px] text-slate-400">Vencimento: {g.dueDate}</span>
                            </div>
                          </div>

                          {/* Memória de Cálculo Passo a Passo */}
                          {g.calculationMemory && (
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Memória de Cálculo Oficial & Base Legal:
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                {g.calculationMemory.legalBasis}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {g.calculationMemory.steps.map((step, sIdx) => (
                                  <div key={sIdx} className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded border border-slate-100 dark:border-slate-700 flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400">{step.label}:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{step.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dados da Guia (Linha Digitável & PIX) */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-100/70 dark:bg-slate-900/50 p-2 rounded-lg font-mono">
                            <div className="truncate max-w-md text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400 select-none">Linha: </span>{g.digitLine}
                            </div>
                            <button
                              onClick={() => handleCopyToClipboard(g.digitLine, 'Linha Digitável')}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-sans text-xs"
                            >
                              <Copy className="w-3 h-3" /> Copiar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancelar
              </button>

              {simulationResult && simulationResult.guides.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveSimulatedGuides}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  Salvar e Emitir {simulationResult.guides.length} Guia(s) Oficial(is)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DA GUIA, MEMÓRIA DE CÁLCULO E PIX                         */}
      {/* ========================================================================= */}
      {selectedGuideForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Documento de Arrecadação — {selectedGuideForView.obligationName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedGuideForView(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Cabeçalho da Guia */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Número da Guia</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">{selectedGuideForView.guideNumber}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">UF Favorecida</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{selectedGuideForView.authority}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Código Receita</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">{selectedGuideForView.revenueCode}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Valor Total</span>
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    R$ {selectedGuideForView.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Memória de Cálculo */}
              {selectedGuideForView.calculationMemory && (
                <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-500" /> Memória de Cálculo Passo a Passo
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">CFOP: {selectedGuideForView.calculationMemory.cfop}</span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Base Legal: </span>
                    {selectedGuideForView.calculationMemory.legalBasis}
                  </div>

                  <div className="space-y-1.5">
                    {selectedGuideForView.calculationMemory.steps.map((step, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{step.label}</div>
                          <div className="text-[10px] text-slate-400">{step.formula}</div>
                        </div>
                        <span className="font-bold font-mono text-slate-900 dark:text-white">{step.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Código de Barras & PIX */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-500" /> Pagamento Bancário & PIX
                </h4>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Linha Digitável FEBRABAN</span>
                  <div className="flex items-center justify-between gap-2 mt-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs font-medium">
                    <span className="truncate">{selectedGuideForView.digitLine}</span>
                    <button
                      onClick={() => handleCopyToClipboard(selectedGuideForView.digitLine, 'Linha Digitável')}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-sans text-xs shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                </div>

                {selectedGuideForView.pixCopyPaste && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">PIX Copia e Cola EMV</span>
                    <div className="flex items-center justify-between gap-2 mt-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs font-medium">
                      <span className="truncate max-w-lg">{selectedGuideForView.pixCopyPaste}</span>
                      <button
                        onClick={() => handleCopyToClipboard(selectedGuideForView.pixCopyPaste!, 'Código PIX')}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-sans text-xs shrink-0"
                      >
                        <Copy className="w-3 h-3" /> Copiar PIX
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status de Liquidação */}
              {selectedGuideForView.status === 'PAGA' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Guia Quitada em {selectedGuideForView.paidAt} por {selectedGuideForView.paidBy}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {selectedGuideForView.bankAuthentication}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setSelectedGuideForView(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR LIQUIDAÇÃO / PAGAMENTO                                    */}
      {/* ========================================================================= */}
      {selectedGuideForSettle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" /> Registrar Pagamento de Guia Fiscal
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirmar liquidação bancária da guia <strong className="text-slate-800 dark:text-slate-200">{selectedGuideForSettle.guideNumber}</strong> no valor de <strong className="text-emerald-600 font-bold">R$ {selectedGuideForSettle.totalAmount.toFixed(2)}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento</label>
                <select
                  value={settlePaymentMethod}
                  onChange={(e) => setSettlePaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
                >
                  <option value="PIX">PIX QR Code / Copia e Cola</option>
                  <option value="DEBITO_CONTA">Débito em Conta Corrente</option>
                  <option value="BOLETO_BANCARIO">Convênio Bancário FEBRABAN</option>
                  <option value="GUIA_AVULSA">Pagamento no Caixa / Agência</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Código de Autenticação Bancária</label>
                <input
                  type="text"
                  value={settleAuthCode}
                  onChange={(e) => setSettleAuthCode(e.target.value)}
                  placeholder="Ex: AUTH-ITAU-998822-001"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedGuideForSettle(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmSettle}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow"
              >
                Confirmar Liquidação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CANCELAMENTO DE GUIA FISCAL COM JUSTIFICATIVA                       */}
      {/* ========================================================================= */}
      {selectedGuideForCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
              <Ban className="w-5 h-5" /> Cancelar Guia Fiscal
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              O cancelamento da guia <strong className="text-slate-800 dark:text-slate-200">{selectedGuideForCancel.guideNumber}</strong> exige justificativa formal para auditoria fiscal.
            </p>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Justificativa do Cancelamento (Obrigatório)
              </label>
              <textarea
                value={cancellationJustification}
                onChange={(e) => setCancellationJustification(e.target.value)}
                placeholder="Informe o motivo (Ex: Cancelamento da NF-e vinculada, devolução de mercadoria, retificação de base de cálculo)..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedGuideForCancel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Voltar
              </button>
              <button
                disabled={!cancellationJustification.trim()}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
