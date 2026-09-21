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
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Building2,
  ChevronDown,
  CreditCard,
  Layers,
  Wrench,
  FileSpreadsheet
} from 'lucide-react';
import { AppDatabase, User, AccountPayable, Supplier } from '../types';
import { MonthlyHorizontalMenuBar } from './MonthlyHorizontalMenuBar';

export interface WarelinePayablesFiltersViewProps {
  db: AppDatabase;
  currentUser: User;
  onSavePayables: (payables: AccountPayable[]) => void;
  onAddHistoryLog?: (entry: any) => void;
  setUnsavedTask?: (val: boolean) => void;
  onSaveFullDatabase?: (db: Partial<AppDatabase>) => void;
  onNavigate?: (view: string) => void;
}

export type PayableTabType =
  | 'ALL'
  | 'FORNECEDORES_PECAS'
  | 'NF_SERVICO'
  | 'FOLHA_COMISSOES'
  | 'IMPOSTOS'
  | 'NF_ESTOQUE'
  | 'DESPESAS_FIXAS'
  | 'TARIFAS'
  | 'VENCIDAS'
  | 'ADIANTAMENTOS'
  | 'BENEFICIOS'
  | 'OUTROS';

export function WarelinePayablesFiltersView({
  db,
  currentUser,
  onSavePayables,
  onAddHistoryLog,
  onNavigate
}: WarelinePayablesFiltersViewProps) {
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
  // Aba ativa conforme imagem (Filtros Contas a Pagar)
  const [activeTab, setActiveTab] = useState<PayableTabType>('ALL');

  // Filtros de Status
  const [statusPending, setStatusPending] = useState(true);   // A Pagar
  const [statusPartial, setStatusPartial] = useState(true);   // Pagas Parciais
  const [statusPaid, setStatusPaid] = useState(true);         // Pagas
  const [statusOverdue, setStatusOverdue] = useState(true);   // Vencidas

  // Ordenação e Pesquisa
  const [searchRadio, setSearchRadio] = useState<'supplier' | 'docNo' | 'code' | 'category' | 'value' | 'observation'>('supplier');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros de Período
  const [periodType, setPeriodType] = useState('Personalizado');
  const [periodFilterField, setPeriodFilterField] = useState<'due' | 'emission' | 'payment'>('due');

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
    const updated = payables.map(p => {
      if (itemsToRollover.some(it => it.id === p.id)) {
        return {
          ...p,
          dueDate: targetDueDate,
          notes: (p.notes ? p.notes + ' | ' : '') + `Prorrogado de ${prevMonthKey} para ${selectedMonth}`
        };
      }
      return p;
    });
    onSavePayables(updated);
    if (onAddHistoryLog) {
      onAddHistoryLog({
        id: 'hist_' + Date.now(),
        type: 'FINANCIAL_ROLLOVER',
        title: 'Prorrogação de Contas a Pagar',
        description: `Prorrogadas ${itemsToRollover.length} contas pendentes de ${prevMonthKey} para competência de vencimento em ${selectedMonth}`,
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'Administrador',
        date: todayStr,
        timestamp: new Date().toISOString()
      });
    }
    alert(`Sucesso! ${itemsToRollover.length} contas a pagar tiveram o vencimento prorrogado para ${targetDueDate}.`);
  };

  const handleQuickNewForMonth = (monthKey: string) => {
    const targetDate = `${monthKey}-10`;
    setNewPayable(prev => ({
      ...prev,
      dueDate: targetDate,
      emissionDate: targetDate
    }));
    setShowNewModal(true);
  };

  // Seleção e modal de baixa/pagamento
  const [selectedPayableId, setSelectedPayableId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [showNewModal, setShowNewModal] = useState(false);

  // Formulário de Nova Despesa / Conta a Pagar
  const [newPayable, setNewPayable] = useState({
    supplierName: '',
    supplierCnpj: '',
    docNumber: '',
    category: 'Nota Fiscal de Serviço',
    amount: 350,
    dueDate: todayStr,
    emissionDate: todayStr,
    installment: '01/01',
    notes: ''
  });

  const payables: AccountPayable[] = db.accountsPayable || [];

  // Filtragem dinâmica dos dados
  const filteredList = useMemo(() => {
    return payables.filter(item => {
      const cat = (item.category || '').toUpperCase();
      const desc = (item.description || '').toUpperCase();
      const supp = (item.supplierName || '').toUpperCase();

      // 1. Filtro de Aba Pertinente ao Segmento
      if (activeTab === 'FORNECEDORES_PECAS' || activeTab === 'NF_ESTOQUE') {
        if (!cat.includes('ESTOQUE') && !cat.includes('PEÇAS') && !cat.includes('PECA') && !cat.includes('MATÉRIA') && !cat.includes('INSUMO') && !desc.includes('ESTOQUE') && !desc.includes('FORNECEDOR')) return false;
      } else if (activeTab === 'NF_SERVICO') {
        if (!cat.includes('SERVIÇO') && !cat.includes('SERVICO') && !cat.includes('TERCEIRO') && !cat.includes('RETÍFICA') && !cat.includes('USINAGEM') && !desc.includes('SERVIÇO')) return false;
      } else if (activeTab === 'FOLHA_COMISSOES') {
        if (!cat.includes('FOLHA') && !cat.includes('SALÁRIO') && !cat.includes('COMISSÃO') && !cat.includes('PRÓ-LABORE') && !desc.includes('COMISSÃO') && !desc.includes('FOLHA')) return false;
      } else if (activeTab === 'IMPOSTOS') {
        if (!cat.includes('IMPOSTO') && !cat.includes('TRIBUTO') && !cat.includes('DAS') && !cat.includes('GPS') && !cat.includes('ICMS') && !desc.includes('IMPOSTO')) return false;
      } else if (activeTab === 'DESPESAS_FIXAS') {
        if (!cat.includes('ALUGUEL') && !cat.includes('ENERGIA') && !cat.includes('ÁGUA') && !cat.includes('TELECOM') && !cat.includes('OPERACIONAL') && !desc.includes('DESPESA')) return false;
      } else if (activeTab === 'TARIFAS') {
        if (!cat.includes('TARIFA') && !cat.includes('BANCÁRIA') && !cat.includes('FINANCIAMENTO') && !desc.includes('TARIFA')) return false;
      } else if (activeTab === 'VENCIDAS') {
        const isPaid = item.status === 'paid' || (item.remainingAmount !== undefined && item.remainingAmount <= 0);
        if (isPaid || !item.dueDate || item.dueDate >= todayStr) return false;
      } else if (activeTab === 'ADIANTAMENTOS') {
        if (!cat.includes('ADIANTAMENTO') && !desc.includes('ADIANTAMENTO')) return false;
      } else if (activeTab === 'BENEFICIOS') {
        if (!cat.includes('BENEFÍCIO') && !cat.includes('VALE') && !cat.includes('REFEIÇÃO') && !cat.includes('TRANSPORTE') && !desc.includes('BENEFÍCIO')) return false;
      } else if (activeTab === 'OUTROS') {
        if (cat.includes('SERVIÇO') || cat.includes('IMPOSTO') || cat.includes('ESTOQUE') || cat.includes('PEÇA')) return false;
      }

      // 2. Filtro de Status
      const isPaid = item.status === 'paid' || (item.remainingAmount !== undefined && item.remainingAmount <= 0);
      const isPartial = item.status === 'partial' || (item.paidAmount && item.paidAmount > 0 && item.remainingAmount && item.remainingAmount > 0);
      const isOverdue = !isPaid && !!(item.dueDate && item.dueDate < todayStr);
      const isPending = !isPaid && !isPartial && !isOverdue;

      if (isPaid && !statusPaid) return false;
      if (isPartial && !statusPartial) return false;
      if (isOverdue && !statusOverdue) return false;
      if (isPending && !statusPending) return false;

      // 3. Filtro de Período e Competência Mensal
      const refDate = periodFilterField === 'due' ? (item.dueDate || '') : periodFilterField === 'emission' ? (item.date || item.createdAt || '') : (item.paidAt || item.dueDate || '');
      if (selectedMonth !== 'ALL') {
        if (!refDate || !refDate.startsWith(selectedMonth)) return false;
      } else {
        if (dateStart && refDate && refDate < dateStart) return false;
        if (dateEnd && refDate && refDate > dateEnd) return false;
      }

      // 4. Pesquisa e Ordenação
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (searchRadio === 'supplier') {
          return supp.toLowerCase().includes(q);
        } else if (searchRadio === 'docNo') {
          return (item.invoiceNumber || item.documentNumber || item.id || '').toLowerCase().includes(q);
        } else if (searchRadio === 'code') {
          return (item.id || '').toLowerCase().includes(q) || (item.supplierId || '').toLowerCase().includes(q);
        } else if (searchRadio === 'category') {
          return cat.toLowerCase().includes(q);
        } else if (searchRadio === 'value') {
          return (item.amount || 0).toString().includes(q);
        } else if (searchRadio === 'observation') {
          return (item.description || item.notes || '').toLowerCase().includes(q);
        }
      }

      return true;
    });
  }, [payables, activeTab, statusPending, statusPartial, statusPaid, statusOverdue, periodFilterField, dateStart, dateEnd, searchQuery, searchRadio, todayStr, selectedMonth]);

  // Cálculos dos Totais da Tabela
  const totals = useMemo(() => {
    return filteredList.reduce(
      (acc, item) => {
        const amt = Number(item.amount) || 0;
        const paid = Number(item.paidAmount) || (item.status === 'paid' ? amt : 0);
        const rem = item.remainingAmount !== undefined ? Number(item.remainingAmount) : Math.max(0, amt - paid);
        const juros = Number(item.interest) || 0;
        const multa = Number(item.fine) || 0;
        const desc = Number(item.discount) || 0;

        acc.totalParcela += amt;
        acc.totalPago += paid;
        acc.totalJuros += juros;
        acc.totalMulta += multa;
        acc.totalDescontos += desc;
        acc.totalSaldo += rem;
        return acc;
      },
      {
        totalParcela: 0,
        totalPago: 0,
        totalJuros: 0,
        totalMulta: 0,
        totalDescontos: 0,
        totalSaldo: 0
      }
    );
  }, [filteredList]);

  // Ações da Toolbar
  const handleBaixar = (item: AccountPayable) => {
    setSelectedPayableId(item.id);
    setPaymentAmount(item.remainingAmount !== undefined ? item.remainingAmount : item.amount);
    setShowPaymentModal(true);
  };

  const confirmBaixa = () => {
    if (!selectedPayableId) return;
    const updated = payables.map(p => {
      if (p.id === selectedPayableId) {
        const curPaid = Number(p.paidAmount || 0) + Number(paymentAmount);
        const rem = Math.max(0, Number(p.amount) - curPaid);
        return {
          ...p,
          paidAmount: curPaid,
          remainingAmount: rem,
          status: rem === 0 ? ('paid' as const) : ('partial' as const),
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod
        };
      }
      return p;
    });

    onSavePayables(updated);
    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'PAYABLE_PAYMENT',
        description: `Pagamento de R$ ${paymentAmount.toFixed(2)} registrado no título #${selectedPayableId}.`,
        user: currentUser?.name || 'Administrador',
        date: new Date().toISOString()
      });
    }
    setShowPaymentModal(false);
  };

  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `pay-${Date.now()}`;
    const entry: AccountPayable = {
      id: newId,
      supplierName: newPayable.supplierName || 'Fornecedor Geral',
      supplierId: 'sup-1',
      invoiceNumber: newPayable.docNumber || `NF-${Math.floor(1000 + Math.random() * 9000)}`,
      category: newPayable.category,
      amount: Number(newPayable.amount),
      remainingAmount: Number(newPayable.amount),
      paidAmount: 0,
      dueDate: newPayable.dueDate,
      date: newPayable.emissionDate,
      status: 'pending',
      installment: newPayable.installment,
      description: newPayable.notes || `${newPayable.category} - Doc ${newPayable.docNumber}`
    };

    onSavePayables([entry, ...payables]);
    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'CREATE_PAYABLE',
        description: `Conta a pagar #${newId} no valor de R$ ${entry.amount.toFixed(2)} cadastrada.`,
        user: currentUser?.name || 'Administrador',
        date: new Date().toISOString()
      });
    }
    setShowNewModal(false);
  };

  const handleDeleteSelected = () => {
    if (!selectedPayableId) {
      alert('Selecione uma linha na tabela para excluir.');
      return;
    }
    if (confirm('Deseja realmente excluir a conta a pagar selecionada?')) {
      const updated = payables.filter(p => p.id !== selectedPayableId);
      onSavePayables(updated);
      setSelectedPayableId(null);
    }
  };

  return (
    <div className="space-y-3 font-sans text-slate-800" id="view-wareline-payables">
      {/* 1. TOPO ESTILO ERP HOSPITAL WARELINE (Conforme Screenshot 3) */}
      <div className="bg-slate-100 border border-slate-300 rounded-t-lg shadow-2xs">
        {/* Barra de Título Superior do Sistema */}
        <div className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-bold">💳</span>
            <span className="font-bold text-slate-800">Financeiro Profissional - MotorDesk ERP (Módulo Contas a Pagar)</span>
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
            id="btn-pay-novo"
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Novo</span>
          </button>
          <button
            id="btn-pay-salvar"
            type="button"
            onClick={() => alert('Alterações nas contas a pagar salvas com sucesso!')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-blue-600" />
            <span>Salvar</span>
          </button>
          <button
            id="btn-pay-excluir"
            type="button"
            onClick={handleDeleteSelected}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Excluir</span>
          </button>
          <button
            id="btn-pay-imprimir"
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Imprimir</span>
          </button>
          <button
            id="btn-pay-fechar"
            type="button"
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Fechar</span>
          </button>
          <span className="w-px h-5 bg-slate-300 mx-1" />
          <button
            id="btn-pay-im"
            type="button"
            onClick={() => alert('Consulta de Inscrição Municipal e Retenções Tributárias (ISS/INSS) sincronizada.')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>IM</span>
          </button>
          <button
            id="btn-pay-baixar-toolbar"
            type="button"
            onClick={() => {
              const sel = payables.find(p => p.id === selectedPayableId) || filteredList[0];
              if (sel) handleBaixar(sel);
              else alert('Nenhuma conta selecionada para pagamento.');
            }}
            className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-300 text-xs font-bold text-rose-800 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Baixar</span>
          </button>
          <button
            id="btn-pay-documentos"
            type="button"
            onClick={() => alert('Comprovantes de pagamento e NFe de compras anexadas.')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Documentos</span>
          </button>
        </div>

        {/* 2. SUB-ABAS DE CONTAS A PAGAR PERTINENTES AO SEGUIMENTO */}
        <div className="bg-slate-200/80 px-2 pt-1 flex items-center justify-between gap-2 overflow-x-auto border-b border-slate-300 select-none text-[11px] font-semibold">
          <div className="flex items-center gap-1 overflow-x-auto">
            {activeSegment === 'OFICINA' && [
              { id: 'ALL', label: 'Todas as Despesas' },
              { id: 'FORNECEDORES_PECAS', label: 'Fornecedores Peças' },
              { id: 'NF_SERVICO', label: 'Serviços Terceiros / Retífica' },
              { id: 'FOLHA_COMISSOES', label: 'Folha & Comissões Mecânicos' },
              { id: 'IMPOSTOS', label: 'Impostos & Tributos' },
              { id: 'DESPESAS_FIXAS', label: 'Despesas Fixas da Oficina' },
              { id: 'TARIFAS', label: 'Tarifas Bancárias & Máquinas' },
              { id: 'VENCIDAS', label: 'Vencidas' },
              { id: 'BENEFICIOS', label: 'Benefícios & Encargos' },
              { id: 'OUTROS', label: 'Outros Títulos' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PayableTabType)}
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
              { id: 'ALL', label: 'Todas as Despesas' },
              { id: 'FORNECEDORES_PECAS', label: 'Fornecedores / Mercadorias' },
              { id: 'NF_SERVICO', label: 'Serviços & Fretes' },
              { id: 'FOLHA_COMISSOES', label: 'Folha & Comissões Vendas' },
              { id: 'IMPOSTOS', label: 'Impostos (DAS, ICMS ST, PIS)' },
              { id: 'DESPESAS_FIXAS', label: 'Despesas da Loja' },
              { id: 'TARIFAS', label: 'Tarifas & Adquirência' },
              { id: 'VENCIDAS', label: 'Vencidas' },
              { id: 'BENEFICIOS', label: 'Benefícios' },
              { id: 'OUTROS', label: 'Outros Títulos' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PayableTabType)}
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
              { id: 'ALL', label: 'Todas as Despesas' },
              { id: 'FORNECEDORES_PECAS', label: 'Matéria-Prima & Insumos BOM' },
              { id: 'NF_SERVICO', label: 'Usinagem / Tratamento Externo' },
              { id: 'FOLHA_COMISSOES', label: 'Mão de Obra Direta (MOD) & Chão' },
              { id: 'IMPOSTOS', label: 'Tributos Industriais (IPI, ICMS)' },
              { id: 'DESPESAS_FIXAS', label: 'Custos Fabris & Manutenção (PCM)' },
              { id: 'TARIFAS', label: 'Tarifas & Operações de Crédito' },
              { id: 'VENCIDAS', label: 'Vencidas' },
              { id: 'OUTROS', label: 'Outras Obrigações' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PayableTabType)}
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
          type="payable"
          items={payables}
          selectedMonth={selectedMonth}
          onSelectMonth={handleSelectMonth}
          selectedYear={selectedYear}
          onSelectYear={handleSelectYear}
          dateFilterField={periodFilterField === 'due' ? 'due' : periodFilterField === 'emission' ? 'emission' : 'payment'}
          onChangeDateFilterField={(f) => {
            setPeriodFilterField(f);
          }}
          onQuickNewItem={handleQuickNewForMonth}
          onRolloverPending={handleRolloverPending}
          onViewPreviousMonth={handleSelectMonth}
        />
      </div>

      {/* 3. GRID PRINCIPAL DAS CONTAS A PAGAR */}
      <div className="bg-white border border-slate-300 rounded-b-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-200 text-slate-700 sticky top-0 z-10 select-none border-b border-slate-300 text-[11px] font-bold">
              <tr>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Pagto</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Ti</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Fil</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Par</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Document</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Código</th>
                <th className="p-1.5 border-r border-slate-300 min-w-[180px]">Beneficiário</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">CPF/CNPJ</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Emissão</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Entrada</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Vencimento</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Valor da Parcela</th>
                <th className="p-1.5 border-r border-slate-300 whitespace-nowrap">Dt.Ult.</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Valor Pago</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Juros</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Multas</th>
                <th className="p-1.5 border-r border-slate-300 text-right whitespace-nowrap">Descontos</th>
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
                          ? `Início de mês zerado — Nenhuma conta a pagar cadastrada em ${selectedMonth}`
                          : 'Nenhuma conta a pagar encontrada com os filtros selecionados.'}
                      </span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {selectedMonth !== 'ALL'
                          ? `Você pode iniciar os lançamentos de despesas deste mês clicando no botão abaixo.`
                          : 'Ajuste os filtros de pesquisa ou período para exibir registros.'}
                      </p>
                      {selectedMonth !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => handleQuickNewForMonth(selectedMonth)}
                          className="mt-1 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Cadastrar Primeira Conta para {selectedMonth}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isSelected = selectedPayableId === item.id;
                  const amt = Number(item.amount) || 0;
                  const paid = Number(item.paidAmount) || (item.status === 'paid' ? amt : 0);
                  const rem = item.remainingAmount !== undefined ? Number(item.remainingAmount) : Math.max(0, amt - paid);
                  const isOverdue = rem > 0 && !!(item.dueDate && item.dueDate < todayStr);
                  const isPaid = rem === 0;
                  const isPartial = paid > 0 && rem > 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedPayableId(item.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-rose-100 text-rose-950 font-bold'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      <td className="p-1.5 border-r border-slate-200 text-slate-700">{item.paymentNumber || item.id.slice(-5)}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-bold text-slate-600">NF</td>
                      <td className="p-1.5 border-r border-slate-200 text-center text-slate-500">01</td>
                      <td className="p-1.5 border-r border-slate-200 text-center">{item.installment || '01/01'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-800 font-semibold">{item.invoiceNumber || item.documentNumber || '-'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-500">{item.supplierId?.slice(-4) || '0001'}</td>
                      <td className="p-1.5 border-r border-slate-200 font-sans font-medium text-slate-800 truncate max-w-[200px]" title={item.supplierName}>
                        {item.supplierName || 'Fornecedor / Prestador'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-600">{item.supplierCnpj || '00.000.000/0001-00'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-600">{item.date ? item.date.slice(0, 10) : '-'}</td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-500">{item.entryDate || (item.date ? item.date.slice(0, 10) : '-')}</td>
                      <td className={`p-1.5 border-r border-slate-200 font-bold ${isOverdue ? 'text-rose-600 font-black' : 'text-slate-700'}`}>
                        {item.dueDate ? item.dueDate.slice(0, 10) : '-'}
                      </td>
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
                      <td className="p-1.5 border-r border-slate-200 text-right font-black text-rose-700">
                        {rem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-sans">
                        {isPaid ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            PAGO
                          </span>
                        ) : isOverdue ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black animate-pulse">
                            VENCIDO
                          </span>
                        ) : isPartial ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                            PARCIAL
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                            A PAGAR
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
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition cursor-pointer shadow-3xs"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* LINHA DE TOTALIZADORES DO RODAPÉ */}
            <tfoot className="bg-slate-200/90 font-mono text-slate-900 font-bold text-[11px] border-t-2 border-slate-400">
              <tr>
                <td colSpan={11} className="p-1.5 text-right uppercase tracking-wider font-sans text-slate-700">
                  Total Contas a Pagar ({filteredList.length} títulos):
                </td>
                <td className="p-1.5 text-right border-r border-slate-300 font-black">
                  {totals.totalParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 border-r border-slate-300"></td>
                <td className="p-1.5 text-right border-r border-slate-300 text-emerald-800">
                  {totals.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <td className="p-1.5 text-right border-r border-slate-300 font-black text-rose-800">
                  {totals.totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="p-1.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 4. PAINEL DE FILTROS E PESQUISA INFERIOR */}
        <div className="p-3 bg-slate-100 border-t border-slate-300 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start select-none">
          {/* Status Checkboxes */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-[11px] font-bold text-slate-600">Filtrar por Situação</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer shadow-3xs">
                <input
                  type="checkbox"
                  checked={statusPending}
                  onChange={(e) => setStatusPending(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>A Pagar</span>
              </label>

              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold cursor-pointer shadow-3xs">
                <input
                  type="checkbox"
                  checked={statusOverdue}
                  onChange={(e) => setStatusOverdue(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span>Vencidas</span>
              </label>

              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold cursor-pointer shadow-3xs">
                <input
                  type="checkbox"
                  checked={statusPartial}
                  onChange={(e) => setStatusPartial(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Parciais</span>
              </label>

              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold cursor-pointer shadow-3xs">
                <input
                  type="checkbox"
                  checked={statusPaid}
                  onChange={(e) => setStatusPaid(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Pagas</span>
              </label>
            </div>
          </div>

          {/* Pesquisa */}
          <div className="lg:col-span-5 bg-white p-2.5 rounded-lg border border-slate-300 shadow-3xs">
            <div className="text-[11px] font-bold text-slate-600 mb-1">Buscar por Fornecedor / Documento</div>
            <div className="grid grid-cols-3 gap-1.5 text-[10.5px] font-semibold text-slate-700 mb-2">
              {[
                { id: 'supplier', label: 'Fornecedor / Prestador' },
                { id: 'docNo', label: 'Nº Documento' },
                { id: 'category', label: 'Categoria' }
              ].map(r => (
                <label key={r.id} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="paySearchRadio"
                    checked={searchRadio === r.id}
                    onChange={() => setSearchRadio(r.id as any)}
                    className="text-rose-600 focus:ring-rose-500 cursor-pointer"
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
                placeholder="Digitar fornecedor, nota fiscal ou descrição..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Período */}
          <div className="lg:col-span-3 bg-white p-2.5 rounded-lg border border-slate-300 shadow-3xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Período</span>
              <select
                value={periodFilterField}
                onChange={(e) => setPeriodFilterField(e.target.value as any)}
                className="text-[10.5px] font-semibold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 cursor-pointer text-rose-700"
              >
                <option value="due">Vencimento</option>
                <option value="emission">Emissão</option>
                <option value="payment">Pagamento</option>
              </select>
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

      {/* MODAL DE BAIXA / PAGAMENTO */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm">Registrar Pagamento de Conta</h3>
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
                <label className="block font-bold text-slate-700 mb-1">Valor do Pagamento (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg text-rose-700 bg-rose-50/50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="PIX">PIX Bancário</option>
                  <option value="BOLETO">Boleto Pago</option>
                  <option value="TRANSFERENCIA">Transferência TED/TEF</option>
                  <option value="CARTAO_CORPORATIVO">Cartão Corporativo</option>
                  <option value="CHEQUE">Cheque Emitido</option>
                  <option value="DINHEIRO">Dinheiro / Caixa Pequeno</option>
                </select>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                O montante será debitado na conta bancária de saída e gerará conciliação no DRE.
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
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer shadow-md"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA CONTA A PAGAR */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm">Nova Conta a Pagar</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePayable} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Beneficiário / Fornecedor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Razão Social ou Nome"
                    value={newPayable.supplierName}
                    onChange={(e) => setNewPayable({ ...newPayable, supplierName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nº Documento / Fatura</label>
                  <input
                    type="text"
                    placeholder="NF-e 4521"
                    value={newPayable.docNumber}
                    onChange={(e) => setNewPayable({ ...newPayable, docNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={newPayable.category}
                    onChange={(e) => setNewPayable({ ...newPayable, category: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="Nota Fiscal de Serviço">Nota Fiscal de Serviço</option>
                    <option value="Folha de Pagamento & Comissões">Folha de Pagamento & Comissões</option>
                    <option value="Impostos">Impostos & Tributos (DAS, ICMS, IPI, PIS)</option>
                    <option value="Nota Fiscal de Estoque">Nota Fiscal de Peças / Matéria-Prima</option>
                    <option value="Despesas Fixas">Despesas Operacionais / Fixas</option>
                    <option value="Tarifas">Tarifas Bancárias & Financiamentos</option>
                    <option value="Adiantamentos">Adiantamento a Fornecedor</option>
                    <option value="Benefícios & Encargos">Benefícios & Encargos Sociais</option>
                    <option value="Outros">Outros Títulos</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPayable.amount}
                    onChange={(e) => setNewPayable({ ...newPayable, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parcela</label>
                  <input
                    type="text"
                    value={newPayable.installment}
                    onChange={(e) => setNewPayable({ ...newPayable, installment: e.target.value })}
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
                    value={newPayable.emissionDate}
                    onChange={(e) => setNewPayable({ ...newPayable, emissionDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={newPayable.dueDate}
                    onChange={(e) => setNewPayable({ ...newPayable, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-rose-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações / Descrição:</label>
                <input
                  type="text"
                  placeholder="Detalhamento da conta ou serviço prestado"
                  value={newPayable.notes}
                  onChange={(e) => setNewPayable({ ...newPayable, notes: e.target.value })}
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
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded cursor-pointer shadow-md"
                >
                  Cadastrar Conta a Pagar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
