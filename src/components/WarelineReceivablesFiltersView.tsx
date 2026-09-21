import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  Plus,
  Save,
  Trash2,
  Printer,
  X,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Building2,
  ChevronDown,
  CreditCard,
  Layers,
  HelpCircle,
  Wrench,
  Receipt,
  FileCheck,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { AppDatabase, User, AccountReceivable, Client } from '../types';
import { MonthlyHorizontalMenuBar } from './MonthlyHorizontalMenuBar';

export interface WarelineReceivablesFiltersViewProps {
  db: AppDatabase;
  currentUser: User;
  onSaveReceivables: (receivables: AccountReceivable[]) => void;
  onSaveFiscalDocuments?: (docs: any[]) => void;
  onSaveBoletos?: (boletos: any[]) => void;
  onSaveDatabaseUpdates?: (updates: Partial<AppDatabase>) => void;
  onAddHistoryLog?: (entry: any) => void;
  setUnsavedTask?: (val: boolean) => void;
  onNavigate?: (view: string) => void;
}

export type ReceivableTabType =
  | 'ALL'
  | 'OS_SERVICOS'
  | 'VENDA_PECAS'
  | 'FROTAS_PJ'
  | 'FATURAMENTO_INDUSTRIA'
  | 'DUPLICATAS'
  | 'BOLETOS'
  | 'CARTAO_TEF'
  | 'ADIANTAMENTO'
  | 'CHEQUES'
  | 'OUTROS';

export type SearchRadioType =
  | 'receiptNo'
  | 'docNo'
  | 'code'
  | 'client'
  | 'installmentValue'
  | 'totalValue'
  | 'observation';

export function WarelineReceivablesFiltersView({
  db,
  currentUser,
  onSaveReceivables,
  onAddHistoryLog,
  onNavigate
}: WarelineReceivablesFiltersViewProps) {
  // Segmento Selecionado para adaptar abas (Oficina, Comércio ou Indústria)
  const detectedSegment = useMemo<'OFICINA' | 'COMERCIO' | 'INDUSTRIA'>(() => {
    const bType = (db.companyInfo?.businessType || '').toUpperCase();
    if (bType.includes('IND')) return 'INDUSTRIA';
    if (bType.includes('COM') || bType.includes('AUTOPEC') || bType.includes('VAREJO')) return 'COMERCIO';
    if (bType.includes('OFI') || bType.includes('MEC') || bType.includes('AUTO')) return 'OFICINA';
    
    try {
      const storedComp = localStorage.getItem('motordesk_active_company');
      if (storedComp) {
        const parsed = JSON.parse(storedComp);
        const seg = (parsed.businessType || parsed.segment || '').toUpperCase();
        if (seg.includes('IND')) return 'INDUSTRIA';
        if (seg.includes('COM') || seg.includes('AUTOPEC')) return 'COMERCIO';
        if (seg.includes('OFI') || seg.includes('MEC')) return 'OFICINA';
      }
    } catch(e) {}

    if (currentUser?.segment) {
      const seg = currentUser.segment.toUpperCase();
      if (seg.includes('IND')) return 'INDUSTRIA';
      if (seg.includes('COM')) return 'COMERCIO';
      if (seg.includes('OFI')) return 'OFICINA';
    }

    return 'OFICINA';
  }, [db.companyInfo, currentUser]);

  const [activeSegment, setActiveSegment] = useState<'OFICINA' | 'COMERCIO' | 'INDUSTRIA'>(detectedSegment);

  useEffect(() => {
    setActiveSegment(detectedSegment);
    setActiveTab('ALL');
  }, [detectedSegment]);
  // Aba ativa conforme segmento
  const [activeTab, setActiveTab] = useState<ReceivableTabType>('ALL');

  // Filtros de Status (Checkboxes coloridos)
  const [statusPending, setStatusPending] = useState(true);   // A Receber (amarelo)
  const [statusPartial, setStatusPartial] = useState(true);   // Recebidas Parciais (azul)
  const [statusPaid, setStatusPaid] = useState(true);         // Recebidas (verde)

  // Ordenação e Pesquisa
  const [searchRadio, setSearchRadio] = useState<SearchRadioType>('client');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros de Período
  const [periodType, setPeriodType] = useState('Personalizado');
  const [periodFilterField, setPeriodFilterField] = useState<'emission' | 'due' | 'receipt'>('due');
  
  // Datas padrão: Mês atual
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  const [dateStart, setDateStart] = useState(firstDay);
  const [dateEnd, setDateEnd] = useState(lastDay);

  // Competência Mensal Horizontal (JAN/2026, FEV/2026...) no estilo do print
  const currentYear = new Date().getFullYear();
  const currentMonthNumber = String(new Date().getMonth() + 1).padStart(2, '0');
  const [selectedMonth, setSelectedMonth] = useState<string>(`${currentYear}-${currentMonthNumber}`);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    if (monthKey === 'ALL') {
      setDateStart('');
      setDateEnd('');
    } else {
      const [yStr, mStr] = monthKey.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const start = `${yStr}-${mStr}-01`;
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      setDateStart(start);
      setDateEnd(end);
    }
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    if (selectedMonth !== 'ALL') {
      const parts = selectedMonth.split('-');
      const newMonthKey = `${year}-${parts[1] || '01'}`;
      handleSelectMonth(newMonthKey);
    }
  };

  const handleRolloverPending = (prevMonthKey: string, itemsToRollover: any[]) => {
    if (!itemsToRollover.length) return;
    const targetDueDate = selectedMonth !== 'ALL' ? `${selectedMonth}-10` : todayStr;
    const updated = receivables.map(r => {
      if (itemsToRollover.some(it => it.id === r.id)) {
        return {
          ...r,
          dueDate: targetDueDate,
          notes: (r.notes ? r.notes + ' | ' : '') + `Prorrogado de ${prevMonthKey} para ${selectedMonth}`
        };
      }
      return r;
    });
    onSaveReceivables(updated);
    if (onAddHistoryLog) {
      onAddHistoryLog({
        id: 'hist_' + Date.now(),
        type: 'FINANCIAL_ROLLOVER',
        title: 'Prorrogação de Títulos a Receber',
        description: `Prorrogados ${itemsToRollover.length} títulos pendentes de ${prevMonthKey} para competência de vencimento em ${selectedMonth}`,
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'Administrador',
        date: todayStr,
        timestamp: new Date().toISOString()
      });
    }
    alert(`Sucesso! ${itemsToRollover.length} títulos pendentes tiveram o vencimento prorrogado para ${targetDueDate}.`);
  };

  const handleQuickNewForMonth = (monthKey: string) => {
    const targetDate = `${monthKey}-10`;
    setNewTitle(prev => ({
      ...prev,
      dueDate: targetDate,
      emissionDate: targetDate
    }));
    setShowNewModal(true);
  };

  // Seleção e modal de baixa/recebimento
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [showNewModal, setShowNewModal] = useState(false);

  // Formulário de Novo Título
  const [newTitle, setNewTitle] = useState({
    clientName: '',
    clientId: '',
    docNumber: '',
    category: 'Venda de Peças / O.S.',
    amount: 150,
    dueDate: todayStr,
    emissionDate: todayStr,
    installment: '01/01',
    notes: ''
  });

  const receivables: AccountReceivable[] = db.accountsReceivable || [];

  // Filtragem dinâmica dos dados
  const filteredList = useMemo(() => {
    return receivables.filter(item => {
      // 1. Filtro de Aba Pertinente por Segmento
      const cat = (item.category || '').toUpperCase();
      const desc = (item.description || '').toUpperCase();
      const method = (item.paymentMethod || '').toUpperCase();

      if (activeTab === 'OS_SERVICOS') {
        if (!cat.includes('SERVIÇO') && !cat.includes('SERVICO') && !cat.includes('O.S.') && !desc.includes('ORDEM') && !desc.includes('MÃO DE OBRA')) return false;
      } else if (activeTab === 'VENDA_PECAS') {
        if (!cat.includes('PEÇA') && !cat.includes('PECA') && !cat.includes('BALCÃO') && !desc.includes('PEÇA') && !desc.includes('PRODUTO')) return false;
      } else if (activeTab === 'FROTAS_PJ') {
        if (!cat.includes('FROTA') && !cat.includes('PJ') && !cat.includes('CONTRATO') && !desc.includes('FROTA') && !desc.includes('FATURAMENTO')) return false;
      } else if (activeTab === 'FATURAMENTO_INDUSTRIA') {
        if (!cat.includes('INDÚSTRIA') && !cat.includes('INDUSTRIA') && !cat.includes('PRODUÇÃO') && !cat.includes('NF-E') && !desc.includes('LOTE') && !desc.includes('OP-')) return false;
      } else if (activeTab === 'DUPLICATAS') {
        if (!cat.includes('DUPLICATA') && !method.includes('DUPLICATA') && !desc.includes('DUPLICATA')) return false;
      } else if (activeTab === 'BOLETOS') {
        if (!method.includes('BOLETO') && !item.boletoCode && !desc.includes('BOLETO')) return false;
      } else if (activeTab === 'CARTAO_TEF') {
        if (!method.includes('CART') && !method.includes('TEF') && !method.includes('PIX') && !desc.includes('CART') && !desc.includes('PIX')) return false;
      } else if (activeTab === 'ADIANTAMENTO') {
        if (!cat.includes('ADIANTAMENTO') && !cat.includes('SINAL') && !desc.includes('ADIANTAMENTO') && !desc.includes('SINAL')) return false;
      } else if (activeTab === 'CHEQUES') {
        if (!method.includes('CHEQUE') && !desc.includes('CHEQUE')) return false;
      } else if (activeTab === 'OUTROS') {
        if (cat.includes('PEÇA') || cat.includes('SERVIÇO') || method.includes('BOLETO') || method.includes('PIX')) return false;
      }

      // 2. Filtro de Status
      const isPaid = item.status === 'paid' || (item.remainingAmount !== undefined && item.remainingAmount <= 0);
      const isPartial = item.status === 'partial' || (item.paidAmount && item.paidAmount > 0 && item.remainingAmount && item.remainingAmount > 0);
      const isPending = !isPaid && !isPartial;

      if (isPaid && !statusPaid) return false;
      if (isPartial && !statusPartial) return false;
      if (isPending && !statusPending) return false;

      // 3. Filtro de Período e Competência Mensal
      const refDate = periodFilterField === 'emission' ? (item.date || item.createdAt || '') : periodFilterField === 'due' ? (item.dueDate || '') : (item.paidAt || item.date || '');
      if (selectedMonth !== 'ALL') {
        if (!refDate || !refDate.startsWith(selectedMonth)) return false;
      } else {
        if (dateStart && refDate && refDate < dateStart) return false;
        if (dateEnd && refDate && refDate > dateEnd) return false;
      }

      // 4. Pesquisa e Ordenação
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (searchRadio === 'client') {
          return (item.clientName || '').toLowerCase().includes(q);
        } else if (searchRadio === 'docNo') {
          return (item.invoiceNumber || item.documentNumber || item.id || '').toLowerCase().includes(q);
        } else if (searchRadio === 'code') {
          return (item.id || '').toLowerCase().includes(q) || (item.clientId || '').toLowerCase().includes(q);
        } else if (searchRadio === 'receiptNo') {
          return (item.receiptNumber || item.id || '').toLowerCase().includes(q);
        } else if (searchRadio === 'installmentValue') {
          return (item.amount || 0).toString().includes(q);
        } else if (searchRadio === 'totalValue') {
          return (item.amount || 0).toString().includes(q);
        } else if (searchRadio === 'observation') {
          return (item.description || item.notes || '').toLowerCase().includes(q);
        }
      }

      return true;
    });
  }, [receivables, activeTab, statusPending, statusPartial, statusPaid, periodFilterField, dateStart, dateEnd, searchQuery, searchRadio, selectedMonth]);

  // Cálculos dos Totais da Tabela
  const totals = useMemo(() => {
    return filteredList.reduce(
      (acc, item) => {
        const amt = Number(item.amount) || 0;
        const paid = Number(item.paidAmount) || (item.status === 'paid' ? amt : 0);
        const rem = item.remainingAmount !== undefined ? Number(item.remainingAmount) : (amt - paid > 0 ? amt - paid : 0);
        const juros = Number(item.interest) || 0;
        const multa = Number(item.fine) || 0;
        const desc = Number(item.discount) || 0;
        const glosa = Number(item.glosa) || 0;
        const imp = Number(item.taxWithholding) || 0;

        acc.totalParcela += amt;
        acc.totalRecebido += paid;
        acc.totalJuros += juros;
        acc.totalMulta += multa;
        acc.totalDescontos += desc;
        acc.totalGlosa += glosa;
        acc.totalImpostos += imp;
        acc.totalSaldo += rem;
        return acc;
      },
      {
        totalParcela: 0,
        totalRecebido: 0,
        totalJuros: 0,
        totalMulta: 0,
        totalDescontos: 0,
        totalGlosa: 0,
        totalImpostos: 0,
        totalSaldo: 0
      }
    );
  }, [filteredList]);

  // Ações da Toolbar
  const handleBaixar = (item: AccountReceivable) => {
    setSelectedReceivableId(item.id);
    setPaymentAmount(item.remainingAmount !== undefined ? item.remainingAmount : item.amount);
    setShowPaymentModal(true);
  };

  const confirmBaixa = () => {
    if (!selectedReceivableId) return;
    const updated = receivables.map(r => {
      if (r.id === selectedReceivableId) {
        const curPaid = Number(r.paidAmount || 0) + Number(paymentAmount);
        const rem = Math.max(0, Number(r.amount) - curPaid);
        return {
          ...r,
          paidAmount: curPaid,
          remainingAmount: rem,
          status: rem === 0 ? ('paid' as const) : ('partial' as const),
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod
        };
      }
      return r;
    });

    onSaveReceivables(updated);
    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'RECEIVABLE_PAYMENT',
        description: `Recebimento de R$ ${paymentAmount.toFixed(2)} registrado no título #${selectedReceivableId}.`,
        user: currentUser?.name || 'Administrador',
        date: new Date().toISOString()
      });
    }
    setShowPaymentModal(false);
  };

  const handleCreateTitle = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `rec-${Date.now()}`;
    const entry: AccountReceivable = {
      id: newId,
      clientName: newTitle.clientName || 'Cliente Geral',
      clientId: newTitle.clientId || 'cli-1',
      invoiceNumber: newTitle.docNumber || `NF-${Math.floor(1000 + Math.random() * 9000)}`,
      category: newTitle.category,
      amount: Number(newTitle.amount),
      remainingAmount: Number(newTitle.amount),
      paidAmount: 0,
      dueDate: newTitle.dueDate,
      date: newTitle.emissionDate,
      status: 'pending',
      installment: newTitle.installment,
      description: newTitle.notes || `${newTitle.category} - Doc ${newTitle.docNumber}`
    };

    onSaveReceivables([entry, ...receivables]);
    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'CREATE_RECEIVABLE',
        description: `Título a receber #${newId} no valor de R$ ${entry.amount.toFixed(2)} criado.`,
        user: currentUser?.name || 'Administrador',
        date: new Date().toISOString()
      });
    }
    setShowNewModal(false);
  };

  const handleDeleteSelected = () => {
    if (!selectedReceivableId) {
      alert('Selecione uma linha na tabela para excluir.');
      return;
    }
    if (confirm('Deseja realmente excluir o título a receber selecionado?')) {
      const updated = receivables.filter(r => r.id !== selectedReceivableId);
      onSaveReceivables(updated);
      setSelectedReceivableId(null);
    }
  };

  return (
    <div className="space-y-3 font-sans text-slate-800" id="view-wareline-receivables">
      {/* 1. TOPO ESTILO ERP HOSPITAL WARELINE (Conforme Screenshot 3) */}
      <div className="bg-slate-100 border border-slate-300 rounded-t-lg shadow-2xs">
        {/* Barra de Título Superior do Sistema */}
        <div className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">💵</span>
            <span className="font-bold text-slate-800">Financeiro Profissional - MotorDesk ERP (Módulo Contas a Receber)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="font-bold text-slate-700">
              OPERADOR: <span className="text-emerald-700 font-extrabold">{(currentUser?.name || 'Administrador').toUpperCase()}</span>
            </span>
            <span className="font-bold text-slate-700">
              SEGMENTO: <span className="text-indigo-700 font-extrabold">{activeSegment}</span>
            </span>
          </div>
        </div>

        {/* Barra de Ferramentas / Botões de Ação do Módulo */}
        <div className="p-2 bg-slate-50 flex flex-wrap items-center gap-1.5 border-b border-slate-300">
          <button
            id="btn-rec-novo"
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Novo</span>
          </button>
          <button
            id="btn-rec-salvar"
            type="button"
            onClick={() => alert('Alterações nos títulos a receber salvas no banco com sucesso!')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-blue-600" />
            <span>Salvar</span>
          </button>
          <button
            id="btn-rec-excluir"
            type="button"
            onClick={handleDeleteSelected}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Excluir</span>
          </button>
          <button
            id="btn-rec-imprimir"
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Imprimir</span>
          </button>
          <button
            id="btn-rec-fechar"
            type="button"
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Fechar</span>
          </button>
          <span className="w-px h-5 bg-slate-300 mx-1" />
          <button
            id="btn-rec-im"
            type="button"
            onClick={() => alert('Integração Municipal / IM sincronizada com a prefeitura.')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>IM</span>
          </button>
          <button
            id="btn-rec-baixar-toolbar"
            type="button"
            onClick={() => {
              const sel = receivables.find(r => r.id === selectedReceivableId) || filteredList[0];
              if (sel) handleBaixar(sel);
              else alert('Nenhum título selecionado para baixa.');
            }}
            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Baixar</span>
          </button>
          <button
            id="btn-rec-boletos"
            type="button"
            onClick={() => {
              setActiveTab('BOLETOS');
            }}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
            <span>Boletos</span>
          </button>
          <button
            id="btn-rec-solver"
            type="button"
            onClick={() => alert('Solver Financeiro: Reconciliação automática de recebíveis executada sem divergências.')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-cyan-600" />
            <span>Solver</span>
          </button>
          <button
            id="btn-rec-documentos"
            type="button"
            onClick={() => alert('Repositório de documentos fiscais e comprovantes de recebimento aberto.')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Documentos</span>
          </button>
        </div>

        {/* 2. SUB-ABAS DE TÍTULOS PERTINENTES AO SEGUIMENTO */}
        <div className="bg-slate-200/80 px-2 pt-1 flex items-center justify-between gap-2 overflow-x-auto border-b border-slate-300 select-none text-[11px] font-semibold">
          <div className="flex items-center gap-1 overflow-x-auto">
            {activeSegment === 'OFICINA' && [
              { id: 'ALL', label: 'Todos os Recebíveis' },
              { id: 'OS_SERVICOS', label: 'O.S. / Serviços Mecânicos' },
              { id: 'VENDA_PECAS', label: 'Venda de Peças Balcão' },
              { id: 'FROTAS_PJ', label: 'Frotas & PJ' },
              { id: 'BOLETOS', label: 'Boletos Bancários' },
              { id: 'CARTAO_TEF', label: 'Cartão / TEF / Pix' },
              { id: 'ADIANTAMENTO', label: 'Sinal / Adiantamento O.S.' },
              { id: 'CHEQUES', label: 'Renegociação de Cheques' },
              { id: 'OUTROS', label: 'Outros Títulos' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ReceivableTabType)}
                className={`px-3 py-1.5 rounded-t-md whitespace-nowrap transition cursor-pointer border-t border-x ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 font-bold border-slate-400 border-b-white -mb-px shadow-3xs'
                    : 'bg-slate-200 hover:bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {activeSegment === 'COMERCIO' && [
              { id: 'ALL', label: 'Todos os Recebíveis' },
              { id: 'VENDA_PECAS', label: 'Venda Balcão / PDV' },
              { id: 'FROTAS_PJ', label: 'Faturamento PJ / Atacado' },
              { id: 'DUPLICATAS', label: 'Duplicatas Mercantis' },
              { id: 'BOLETOS', label: 'Boletos Bancários' },
              { id: 'CARTAO_TEF', label: 'Cartão & Pix' },
              { id: 'ADIANTAMENTO', label: 'Adiantamento de Clientes' },
              { id: 'CHEQUES', label: 'Cheques' },
              { id: 'OUTROS', label: 'Outros Títulos' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ReceivableTabType)}
                className={`px-3 py-1.5 rounded-t-md whitespace-nowrap transition cursor-pointer border-t border-x ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 font-bold border-slate-400 border-b-white -mb-px shadow-3xs'
                    : 'bg-slate-200 hover:bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {activeSegment === 'INDUSTRIA' && [
              { id: 'ALL', label: 'Todos os Recebíveis' },
              { id: 'FATURAMENTO_INDUSTRIA', label: 'Faturamento Industrial (NF-e 5.101)' },
              { id: 'DUPLICATAS', label: 'Duplicatas Industriais / Carteira' },
              { id: 'FROTAS_PJ', label: 'Contratos Fornecimento B2B' },
              { id: 'BOLETOS', label: 'Cobrança Bancária CNAB' },
              { id: 'ADIANTAMENTO', label: 'Sinal / Adiantamento Produção' },
              { id: 'OUTROS', label: 'Outros Recebíveis' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ReceivableTabType)}
                className={`px-3 py-1.5 rounded-t-md whitespace-nowrap transition cursor-pointer border-t border-x ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 font-bold border-slate-400 border-b-white -mb-px shadow-3xs'
                    : 'bg-slate-200 hover:bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}

          </div>

          {/* Filtro Rápido de Seguimento */}
          <div className="flex items-center gap-1.5 pl-2 pb-1 shrink-0 text-[10px]">
            <span className="text-slate-500 font-bold uppercase">Seguimento Ativo:</span>
            <select
              value={activeSegment}
              onChange={e => {
                setActiveSegment(e.target.value as any);
                setActiveTab('ALL');
              }}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-700 cursor-pointer shadow-3xs"
            >
              <option value="OFICINA">Oficina Mecânica</option>
              <option value="COMERCIO">Comércio / Autopeças</option>
              <option value="INDUSTRIA">Indústria / Manufatura</option>
            </select>
          </div>
        </div>
      </div>

      {/* BARRA DE MENU HORIZONTAL POR MÊS DO ANO ESTILO DO PRINT COM ALERTA DE PENDÊNCIAS DO MÊS ANTERIOR */}
      <div className="bg-slate-50 p-2.5 sm:p-3 border-x border-b border-slate-300 shadow-2xs">
        <MonthlyHorizontalMenuBar
          type="receivable"
          items={receivables}
          selectedMonth={selectedMonth}
          onSelectMonth={handleSelectMonth}
          selectedYear={selectedYear}
          onSelectYear={handleSelectYear}
          dateFilterField={periodFilterField === 'due' ? 'due' : periodFilterField === 'emission' ? 'emission' : 'receipt'}
          onChangeDateFilterField={(f) => {
            setPeriodFilterField(f);
          }}
          onQuickNewItem={handleQuickNewForMonth}
          onRolloverPending={handleRolloverPending}
          onViewPreviousMonth={handleSelectMonth}
        />
      </div>

      {/* 3. GRID PRINCIPAL DAS CONTAS A RECEBER */}
      <div className="bg-white border border-slate-300 rounded-b-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-200 text-slate-700 sticky top-0 z-10 select-none border-b border-slate-300 text-[11px] font-bold">
              <tr>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Recebt</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Par</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Fil</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Tip</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Documen</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Códi</th>
                <th className="p-1.5 border-r border-slate-300 min-w-[180px]">Cliente</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Emissão</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Vencimento</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Valor da Parcela</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Dt.Ult.</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Recebido</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Juros</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Multa</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Descontos</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Glosa</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Impostos</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Saldo</th>
                <th className="p-1.5 border-r border-slate-300 text-center whitespace-nowrap">Status</th>
                <th className="p-1.5 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px] font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={20} className="p-8 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">🗓️</span>
                      <span className="font-extrabold text-sm text-slate-800">
                        {selectedMonth !== 'ALL'
                          ? `Início de mês zerado — Nenhum título cadastrado em ${selectedMonth}`
                          : 'Nenhum título a receber encontrado com os filtros selecionados.'}
                      </span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {selectedMonth !== 'ALL'
                          ? `Você pode iniciar os lançamentos deste mês clicando no botão abaixo.`
                          : 'Ajuste os filtros de pesquisa ou período para exibir registros.'}
                      </p>
                      {selectedMonth !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => handleQuickNewForMonth(selectedMonth)}
                          className="mt-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Cadastrar Primeiro Título para {selectedMonth}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isSelected = selectedReceivableId === item.id;
                  const amt = Number(item.amount) || 0;
                  const paid = Number(item.paidAmount) || (item.status === 'paid' ? amt : 0);
                  const rem = item.remainingAmount !== undefined ? Number(item.remainingAmount) : Math.max(0, amt - paid);
                  const isPending = rem > 0 && paid === 0;
                  const isPartial = paid > 0 && rem > 0;
                  const isPaid = rem === 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedReceivableId(item.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-950 font-bold'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      <td className="p-1.5 border-r border-slate-200 text-slate-700">{item.receiptNumber || item.id.slice(-5)}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center">{item.installment || '01/01'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center text-slate-500">01</td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-bold text-indigo-700">
                        {item.paymentMethod === 'BOLETO' ? 'BOL' : item.category?.includes('CONVENIO') ? 'CONV' : 'NF'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-800 font-semibold">{item.invoiceNumber || item.documentNumber || '-'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-500">{item.clientId?.slice(-4) || '0001'}</td>
                      <td className="p-1.5 border-r border-slate-200 font-sans font-medium text-slate-800 truncate max-w-[200px]" title={item.clientName}>
                        {item.clientName || 'Cliente Consumidor'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-600">{item.date ? item.date.slice(0, 10) : '-'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-rose-700 font-bold">{item.dueDate ? item.dueDate.slice(0, 10) : '-'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-right font-bold text-slate-900">
                        {amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-500">{item.paidAt ? item.paidAt.slice(0, 10) : '-'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-right text-emerald-700 font-bold">
                        {paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-right text-slate-600">
                        {(Number(item.interest) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-right text-slate-600">
                        {(Number(item.fine) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-right text-slate-600">
                        {(Number(item.discount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-right text-slate-600">
                        {(Number(item.glosa) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-right text-slate-600">
                        {(Number(item.taxWithholding) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-right font-black text-rose-700">
                        {rem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-sans">
                        {isPaid ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            RECEBIDO
                          </span>
                        ) : isPartial ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                            PARCIAL
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                            A RECEBER
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-center font-sans">
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBaixar(item);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition cursor-pointer shadow-3xs"
                          >
                            Baixar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* LINHA DE TOTALIZADORES DO RODAPÉ (Conforme valores em Screenshot 3) */}
            <tfoot className="bg-slate-200/90 font-mono text-slate-900 font-bold text-[11px] border-t-2 border-slate-400">
              <tr>
                <td colSpan={9} className="p-1.5 text-right uppercase tracking-wider font-sans text-slate-700">
                  Total Geral ({filteredList.length} títulos):
                </td>
                <td className="p-1.5 text-right border-r border-slate-300 font-black">
                  {totals.totalParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 border-r border-slate-300"></td>
                <td className="p-1.5 text-right border-r border-slate-300 text-emerald-800">
                  {totals.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 text-right border-r border-slate-300">
                  {totals.totalJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 text-right border-r border-slate-300">
                  {totals.totalMulta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 text-right border-r border-slate-300">
                  {totals.totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 text-right border-r border-slate-300">
                  {totals.totalGlosa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 text-right border-r border-slate-300">
                  {totals.totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 text-right border-r border-slate-300 font-black text-rose-800">
                  {totals.totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="p-1.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 4. PAINEL DE CONTROLE INFERIOR: STATUS, ORDENAÇÃO E PERÍODO (Conforme Screenshot 3) */}
        <div className="p-3 bg-slate-100 border-t border-slate-300 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start select-none">
          {/* Coluna 1: Opções e Checkboxes de Status */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => alert('Opções adicionais de lote: Cancelamento, alteração de vencimento em massa e exportação.')}
                className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-3xs cursor-pointer"
              >
                Opções
              </button>
              <button
                type="button"
                onClick={() => alert('Filtros avançados: Vendedor, Centro de Custo e Plano de Contas.')}
                className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-3xs cursor-pointer"
              >
                Mais Filtros
              </button>
            </div>

            {/* Checkboxes de Status com Cores Oficiais */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer shadow-3xs">
                <input
                  type="checkbox"
                  checked={statusPending}
                  onChange={(e) => setStatusPending(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>A Receber</span>
              </label>

              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold cursor-pointer shadow-3xs">
                <input
                  type="checkbox"
                  checked={statusPartial}
                  onChange={(e) => setStatusPartial(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Recebidas Parciais</span>
              </label>

              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold cursor-pointer shadow-3xs">
                <input
                  type="checkbox"
                  checked={statusPaid}
                  onChange={(e) => setStatusPaid(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Recebidas</span>
              </label>
            </div>
          </div>

          {/* Coluna 2: Ordenação e Pesquisa (Radio buttons conforme Screenshot 3) */}
          <div className="lg:col-span-5 bg-white p-2.5 rounded-lg border border-slate-300 shadow-3xs">
            <div className="text-[11px] font-bold text-slate-600 mb-1">Ordenação e Pesquisa</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-[10.5px] font-semibold text-slate-700 mb-2">
              {[
                { id: 'receiptNo', label: 'Nº Recebimento' },
                { id: 'docNo', label: 'Nº Documento' },
                { id: 'code', label: 'Código' },
                { id: 'client', label: 'Cliente' },
                { id: 'installmentValue', label: 'Valor Parcela' },
                { id: 'totalValue', label: 'Valor Total' },
                { id: 'observation', label: 'Observação' }
              ].map(r => (
                <label key={r.id} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="recSearchRadio"
                    checked={searchRadio === r.id}
                    onChange={() => setSearchRadio(r.id as SearchRadioType)}
                    className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digitar termo para busca imediata..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Coluna 3: Filtros de Período (Conforme Screenshot 3) */}
          <div className="lg:col-span-3 bg-white p-2.5 rounded-lg border border-slate-300 shadow-3xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Período</span>
              <div className="flex items-center gap-1">
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value)}
                  className="text-[10.5px] font-semibold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 cursor-pointer"
                >
                  <option value="Personalizado">Personalizado</option>
                  <option value="Hoje">Hoje</option>
                  <option value="Este Mes">Este Mês</option>
                  <option value="Ano">Este Ano</option>
                </select>
                <select
                  value={periodFilterField}
                  onChange={(e) => setPeriodFilterField(e.target.value as any)}
                  className="text-[10.5px] font-semibold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 cursor-pointer text-indigo-700"
                >
                  <option value="emission">Emissão</option>
                  <option value="due">Vencimento</option>
                  <option value="receipt">Recebimento</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-2 py-1 text-[11px] font-mono bg-slate-50 border border-slate-300 rounded"
              />
              <span className="text-slate-500 text-[11px] font-bold">Até</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-2 py-1 text-[11px] font-mono bg-slate-50 border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE BAIXA DE RECEBIMENTO */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Baixar Título a Receber</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor a Receber (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg text-emerald-700 bg-emerald-50/50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Forma de Recebimento:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="PIX">PIX (Instantâneo)</option>
                  <option value="BOLETO">Boleto Bancário Liquidado</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="TRANSFERENCIA">Transferência Bancária (TED/DOC)</option>
                  <option value="DINHEIRO">Dinheiro / Espécie</option>
                  <option value="CHEQUE">Cheque Compensado</option>
                </select>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                O valor será creditado no Caixa Geral da empresa e o título receberá quitação contábil automática.
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmBaixa}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow-md"
                >
                  Confirmar Baixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO TÍTULO */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Novo Título a Receber</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTitle} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente / Razão Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo ou Razão Social do cliente"
                    value={newTitle.clientName}
                    onChange={(e) => setNewTitle({ ...newTitle, clientName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nº Documento / NF / O.S.</label>
                  <input
                    type="text"
                    placeholder="NF-00123 / OS-99"
                    value={newTitle.docNumber}
                    onChange={(e) => setNewTitle({ ...newTitle, docNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={newTitle.category}
                    onChange={(e) => setNewTitle({ ...newTitle, category: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="O.S. / Serviços Mecânicos">O.S. / Serviços Mecânicos</option>
                    <option value="Venda de Peças / Balcão">Venda de Peças / Balcão</option>
                    <option value="Faturamento PJ / Frotas">Faturamento PJ / Frotas</option>
                    <option value="Faturamento Industrial">Faturamento Industrial (NF-e)</option>
                    <option value="Duplicatas">Duplicata Mercantil / Cobrança</option>
                    <option value="Adiantamento">Sinal / Adiantamento de Cliente</option>
                    <option value="Boletos">Boleto Bancário / CNAB</option>
                    <option value="Cartão / Pix">Cartão de Crédito / Pix</option>
                    <option value="Outros">Outros Títulos</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTitle.amount}
                    onChange={(e) => setNewTitle({ ...newTitle, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parcela</label>
                  <input
                    type="text"
                    value={newTitle.installment}
                    onChange={(e) => setNewTitle({ ...newTitle, installment: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Emissão *</label>
                  <input
                    type="date"
                    required
                    value={newTitle.emissionDate}
                    onChange={(e) => setNewTitle({ ...newTitle, emissionDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={newTitle.dueDate}
                    onChange={(e) => setNewTitle({ ...newTitle, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-rose-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações:</label>
                <input
                  type="text"
                  placeholder="Informações adicionais do título"
                  value={newTitle.notes}
                  onChange={(e) => setNewTitle({ ...newTitle, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded cursor-pointer shadow-md"
                >
                  Criar Título
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
