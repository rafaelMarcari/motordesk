/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — CONTADOR ACUMULADOR MENSAL DE PEDIDOS & ABATIMENTO DE DESPESAS
 * Atende à regra contábil de competência mensal: acumulação progressiva de pedidos,
 * lançamento de despesas que abatem o saldo e encerramento com virada de mês zerando o contador.
 */

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CheckCircle,
  FileText,
  Printer,
  RefreshCw,
  AlertCircle,
  DollarSign,
  PieChart,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Tag,
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react';
import {
  AppDatabase,
  MonthlyAccountingClosing,
  User,
  FinancialTransaction,
  CommercialSale,
  ServiceOrder,
  AccountPayable,
  HistoryEntry
} from '../types';
import {
  calculateMonthlyAccountingMetrics,
  formatPeriodLabel,
  getNextPeriod,
  getPreviousPeriod,
  MonthlyAccountingMetrics
} from '../utils/accountingUtils';

interface MonthlyAccountingPanelProps {
  db: AppDatabase;
  currentUser: User;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  onAddTransaction?: (tx: Omit<FinancialTransaction, 'id' | 'createdByName'>) => void;
  onAddSale?: (sale: any) => void;
}

export function MonthlyAccountingPanel({
  db,
  currentUser,
  onUpdateDb,
  onAddTransaction,
  onAddSale
}: MonthlyAccountingPanelProps) {
  // Competência ativa do sistema (ex: '2026-09')
  const activePeriod = db.activeAccountingPeriod || '2026-09';
  // Período atualmente selecionado para visualização na tela
  const [selectedPeriod, setSelectedPeriod] = useState<string>(activePeriod);
  // Aba ativa: 'overview' | 'orders' | 'expenses' | 'history'
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'expenses' | 'history'>('overview');

  // Modais
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Estados dos Modais Rápidos
  const [quickOrderForm, setQuickOrderForm] = useState({
    clientName: 'Cliente Balcão / Empresa',
    type: 'sale' as 'sale' | 'service_order' | 'income',
    description: 'Venda de peças e insumos automotivos',
    amount: 1500,
    paymentMethod: 'PIX'
  });

  const [quickExpenseForm, setQuickExpenseForm] = useState({
    supplierOrFavored: 'Distribuidora de Peças Automotivas',
    category: 'Peças & Insumos',
    classification: 'variable' as 'fixed' | 'variable',
    description: 'Reposição de estoque de pastilhas e discos',
    amount: 850,
    paymentMethod: 'Transferência / PIX'
  });

  // Lista de competências disponíveis (histórico + período atual + próximos)
  const availablePeriods = useMemo(() => {
    const periodsSet = new Set<string>();
    // Adiciona o mês ativo
    periodsSet.add(activePeriod);
    // Adiciona o mês selecionado
    periodsSet.add(selectedPeriod);
    // Adiciona meses do histórico de encerramentos
    (db.monthlyAccountingClosings || []).forEach(c => periodsSet.add(c.period));
    // Adiciona meses com vendas ou transações
    (db.sales || []).forEach(s => {
      const d = s.createdAt;
      if (d && d.length >= 7) periodsSet.add(d.slice(0, 7));
    });
    (db.financialTransactions || []).forEach(t => {
      if (t.date && t.date.length >= 7) periodsSet.add(t.date.slice(0, 7));
    });

    return Array.from(periodsSet).sort().reverse();
  }, [activePeriod, selectedPeriod, db.monthlyAccountingClosings, db.sales, db.financialTransactions]);

  // Calcula as métricas contábeis para a competência visualizada
  const metrics: MonthlyAccountingMetrics = useMemo(() => {
    return calculateMonthlyAccountingMetrics(selectedPeriod, db);
  }, [selectedPeriod, db]);

  // Verifica se o usuário tem permissão para fechar ou reabrir
  const canManageClosings = currentUser.role === 'admin' || currentUser.role === 'gerente';

  // Handler para avançar ou recuar mês
  const handlePrevMonth = () => {
    const prev = getPreviousPeriod(selectedPeriod);
    setSelectedPeriod(prev);
  };

  const handleNextMonth = () => {
    const next = getNextPeriod(selectedPeriod);
    setSelectedPeriod(next);
  };

  // Handler para executar o Encerramento Mensal e virar o mês
  const handleConfirmMonthlyClosing = () => {
    if (!canManageClosings) {
      setNotificationMsg({ text: 'Apenas administradores e gerentes podem realizar o encerramento contábil.', type: 'error' });
      return;
    }

    const nextPeriod = getNextPeriod(selectedPeriod);
    const closingRecord: MonthlyAccountingClosing = {
      id: `mac-${selectedPeriod}-${Date.now().toString().slice(-4)}`,
      companyId: db.companyInfo?.id || 'comp-1',
      period: selectedPeriod,
      periodLabel: formatPeriodLabel(selectedPeriod),
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedByName: currentUser.name,
      closedByUserId: currentUser.id,
      totalOrdersAmount: metrics.totalOrdersAmount,
      ordersCount: metrics.ordersCount,
      salesAmount: metrics.salesAmount,
      serviceOrdersAmount: metrics.serviceOrdersAmount,
      otherRevenuesAmount: metrics.otherRevenuesAmount,
      totalExpensesAmount: metrics.totalExpensesAmount,
      expensesCount: metrics.expensesCount,
      fixedExpensesAmount: metrics.fixedExpensesAmount,
      variableExpensesAmount: metrics.variableExpensesAmount,
      netBalance: metrics.netBalance,
      profitMarginPercent: metrics.profitMarginPercent,
      expenseAbsorptionRate: metrics.expenseAbsorptionRate,
      notes: closingNotes || `Encerramento da competência ${formatPeriodLabel(selectedPeriod)} efetuado com sucesso.`
    };

    onUpdateDb(prev => {
      const existingClosings = prev.monthlyAccountingClosings || [];
      const updatedClosings = [
        closingRecord,
        ...existingClosings.filter(c => c.period !== selectedPeriod)
      ];

      // Atualiza histórico de auditoria
      const newHistory: HistoryEntry[] = [
        {
          id: `hist-close-${Date.now()}`,
          type: 'system',
          title: 'Encerramento Contábil Mensal',
          description: `Encerramento do mês ${formatPeriodLabel(selectedPeriod)} concluído. Receitas: R$ ${metrics.totalOrdersAmount.toFixed(2)}, Despesas: R$ ${metrics.totalExpensesAmount.toFixed(2)}, Saldo: R$ ${metrics.netBalance.toFixed(2)}. Nova competência aberta: ${formatPeriodLabel(nextPeriod)}.`,
          date: new Date().toISOString(),
          userName: currentUser.name,
          action: 'ENCERRAMENTO_CONTABIL_MENSAL'
        },
        ...(prev.history || [])
      ];

      return {
        ...prev,
        monthlyAccountingClosings: updatedClosings,
        activeAccountingPeriod: nextPeriod,
        history: newHistory
      };
    });

    setIsClosingModalOpen(false);
    setClosingNotes('');
    // Altera a visualização para a nova competência que acabou de ser aberta zerada!
    setSelectedPeriod(nextPeriod);

    setNotificationMsg({
      text: `Encerramento de ${formatPeriodLabel(selectedPeriod)} concluído! A competência virou para ${formatPeriodLabel(nextPeriod)} com o contador ZERADO para o novo mês.`,
      type: 'success'
    });
  };

  // Handler para reabrir mês (gerentes/admin)
  const handleReopenMonth = (periodToReopen: string) => {
    if (!canManageClosings) return;

    onUpdateDb(prev => {
      const updated = (prev.monthlyAccountingClosings || []).filter(c => c.period !== periodToReopen);
      return {
        ...prev,
        monthlyAccountingClosings: updated,
        activeAccountingPeriod: periodToReopen
      };
    });

    setSelectedPeriod(periodToReopen);
    setNotificationMsg({
      text: `Competência ${formatPeriodLabel(periodToReopen)} reaberta para ajustes e lançamentos adicionais.`,
      type: 'info'
    });
  };

  // Lançamento rápido de pedido para teste/operação
  const handleAddQuickOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickOrderForm.amount <= 0) return;

    const dateStr = `${selectedPeriod}-10T14:30:00.000Z`;

    if (quickOrderForm.type === 'sale') {
      const newSale: CommercialSale = {
        id: `sale-quick-${Date.now()}`,
        code: `VEN-${Date.now().toString().slice(-4)}`,
        companyId: db.companyInfo?.id || 'comp-1',
        clientId: 'cli-balcao',
        clientName: quickOrderForm.clientName,
        createdAt: dateStr,
        createdBy: currentUser.id || 'usr-admin',
        items: [
          {
            id: `item-${Date.now()}`,
            partId: 'p-1',
            partCode: 'PC-GEN',
            partName: quickOrderForm.description,
            quantity: 1,
            unitPrice: quickOrderForm.amount,
            discount: 0,
            totalPrice: quickOrderForm.amount
          }
        ],
        subtotal: quickOrderForm.amount,
        discount: 0,
        totalAmount: quickOrderForm.amount,
        paymentMethod: quickOrderForm.paymentMethod,
        paymentStatus: 'paid'
      };

      onUpdateDb(prev => ({
        ...prev,
        sales: [newSale, ...(prev.sales || [])]
      }));
    } else if (quickOrderForm.type === 'service_order') {
      const newOS: ServiceOrder = {
        id: `os-${Date.now().toString().slice(-4)}`,
        budgetId: 'b-quick',
        companyId: db.companyInfo?.id || 'comp-1',
        clientId: 'cli-quick',
        vehicleId: 'veh-quick',
        mechanicId: currentUser.id || 'usr-1',
        status: 'completed',
        createdAt: dateStr,
        completedAt: dateStr,
        serviceDate: dateStr.split('T')[0],
        customerComplaint: quickOrderForm.description,
        items: [
          {
            id: `osi-${Date.now()}`,
            type: 'service',
            itemId: 'srv-1',
            name: quickOrderForm.description,
            quantity: 1,
            unitPrice: quickOrderForm.amount,
            totalPrice: quickOrderForm.amount,
            status: 'completed',
            source: 'mechanic_suggestion'
          }
        ],
        notes: `OS gerada via apuração contábil por ${currentUser.name}. Cliente: ${quickOrderForm.clientName}.`,
        technicalRecommendations: 'Manutenção preventiva periódica em dia.',
        paymentStatus: 'paid'
      };

      onUpdateDb(prev => ({
        ...prev,
        serviceOrders: [newOS, ...(prev.serviceOrders || [])]
      }));
    } else {
      const newTx: FinancialTransaction = {
        id: `tx-inc-${Date.now()}`,
        type: 'income',
        category: 'Receita Operacional',
        description: `${quickOrderForm.clientName} - ${quickOrderForm.description}`,
        amount: quickOrderForm.amount,
        date: dateStr,
        paymentMethod: quickOrderForm.paymentMethod,
        createdByName: currentUser.name
      };

      onUpdateDb(prev => ({
        ...prev,
        financialTransactions: [newTx, ...(prev.financialTransactions || [])]
      }));
    }

    setIsQuickOrderModalOpen(false);
    setNotificationMsg({
      text: `Pedido de R$ ${quickOrderForm.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} acumulado com sucesso no contador do mês!`,
      type: 'success'
    });
  };

  // Lançamento rápido de despesa para teste/operação (abater no valor)
  const handleAddQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickExpenseForm.amount <= 0) return;

    const dateStr = `${selectedPeriod}-12T10:00:00.000Z`;

    const newTx: FinancialTransaction = {
      id: `tx-exp-${Date.now()}`,
      type: 'expense',
      category: quickExpenseForm.category,
      classification: quickExpenseForm.classification,
      description: `${quickExpenseForm.supplierOrFavored} - ${quickExpenseForm.description}`,
      amount: quickExpenseForm.amount,
      date: dateStr,
      paymentMethod: quickExpenseForm.paymentMethod,
      supplierId: quickExpenseForm.supplierOrFavored,
      createdByName: currentUser.name
    };

    onUpdateDb(prev => ({
      ...prev,
      financialTransactions: [newTx, ...(prev.financialTransactions || [])]
    }));

    setIsQuickExpenseModalOpen(false);
    setNotificationMsg({
      text: `Despesa de R$ ${quickExpenseForm.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} lançada e abatida do saldo contábil!`,
      type: 'success'
    });
  };

  return (
    <div className="space-y-6" id="monthly-accounting-panel">
      {/* Notificação Temporária */}
      {notificationMsg && (
        <div
          id="accounting-notification-banner"
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition duration-200 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : notificationMsg.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
            {notificationMsg.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {notificationMsg.type === 'info' && <Info className="w-5 h-5 text-indigo-600 shrink-0" />}
            <span>{notificationMsg.text}</span>
          </div>
          <button
            id="close-accounting-notification-btn"
            onClick={() => setNotificationMsg(null)}
            className="text-xs font-bold px-2 py-1 bg-white/70 hover:bg-white rounded-md transition"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra Superior de Controle de Competência & Navegação Mensal */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Calculator className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Apuração Contábil Mensal — Contador & Abatimento de Despesas
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Regime de competência: pedidos vão se acumulando no contador de valor e as despesas lançadas abatem o saldo. Ao virar o mês, o encerramento zera o contador para o próximo mês.
          </p>
        </div>

        {/* Seletor do Mês / Competência */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="prev-month-btn"
              onClick={handlePrevMonth}
              title="Mês Anterior"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 text-center">
              <span className="text-xs font-semibold text-slate-500 block leading-tight">Competência</span>
              <span className="text-sm font-bold text-slate-900 block leading-tight">
                {formatPeriodLabel(selectedPeriod)}
              </span>
            </div>

            <button
              id="next-month-btn"
              onClick={handleNextMonth}
              title="Próximo Mês"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Badge de Status da Competência */}
          {metrics.isClosed ? (
            <span
              id="status-closed-badge"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Mês Encerrado
            </span>
          ) : (
            <span
              id="status-open-badge"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              Competência Aberta
            </span>
          )}

          {/* Botão de Encerramento ou Reabertura */}
          {!metrics.isClosed ? (
            <button
              id="open-closing-modal-btn"
              onClick={() => setIsClosingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition duration-150"
            >
              <Lock className="w-3.5 h-3.5" />
              Encerrar Mês & Virar Competência
            </button>
          ) : (
            canManageClosings && (
              <button
                id="reopen-month-btn"
                onClick={() => handleReopenMonth(selectedPeriod)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition duration-150"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                Reabrir Competência
              </button>
            )
          )}
        </div>
      </div>

      {/* Banner Informativo se o Mês Estiver Encerrado */}
      {metrics.isClosed && metrics.closingData && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" id="closed-month-banner">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Competência Oficialmente Encerrada e Congelada</h4>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md">
                  Auditado
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Encerrado em {new Date(metrics.closingData.closedAt || '').toLocaleString('pt-BR')} por{' '}
                <strong className="text-white">{metrics.closingData.closedByName || 'Gerente'}</strong>.
                {metrics.closingData.notes && ` Observações: "${metrics.closingData.notes}"`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
              Saldo Líquido Apurado: <strong className="text-emerald-400">R$ {metrics.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        </div>
      )}

      {/* GRANDE DISPLAY DO CONTADOR CONTÁBIL (LIVE LEDGER CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="accounting-live-counter-cards">
        {/* CARD 1: CONTADOR ACUMULADOR DE PEDIDOS (RECEITAS) */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden" id="orders-accumulator-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                  Contador de Pedidos
                </span>
                <span className="text-[11px] text-slate-500">Receitas brutas acumuladas</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-lg">
              {metrics.ordersCount} {metrics.ordersCount === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight" id="orders-accumulated-value">
              R$ {metrics.totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ticket Médio Contábil: <strong className="text-slate-700">R$ {metrics.averageOrderTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>

          <div className="pt-3 border-t border-emerald-100 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Vendas Balcão</span>
              <strong className="text-slate-700 font-mono">R$ {metrics.salesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Ordens de Serviço</span>
              <strong className="text-slate-700 font-mono">R$ {metrics.serviceOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Outras Entradas</span>
              <strong className="text-slate-700 font-mono">R$ {metrics.otherRevenuesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          {!metrics.isClosed && (
            <div className="mt-4 pt-3 border-t border-emerald-100 flex justify-end">
              <button
                id="add-quick-order-btn"
                onClick={() => setIsQuickOrderModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Lançar Pedido no Mês
              </button>
            </div>
          )}
        </div>

        {/* CARD 2: DESPESAS LANÇADAS & ABATIDAS (SAÍDAS) */}
        <div className="bg-gradient-to-br from-rose-50/60 to-white border border-rose-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden" id="expenses-abatidas-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                <ArrowDownRight className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
                  Despesas Abatidas
                </span>
                <span className="text-[11px] text-slate-500">Saídas deduzidas no mês</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-lg">
              {metrics.expensesCount} {metrics.expensesCount === 1 ? 'despesa' : 'despesas'}
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl font-black text-rose-600 font-mono tracking-tight" id="expenses-abated-value">
              - R$ {metrics.totalExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Taxa de Absorção: <strong className="text-rose-700">{metrics.expenseAbsorptionRate}% da receita</strong>
            </p>
          </div>

          <div className="pt-3 border-t border-rose-100 grid grid-cols-2 gap-2 text-center text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Despesas Fixas (Estrutura)</span>
              <strong className="text-slate-700 font-mono">R$ {metrics.fixedExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Despesas Variáveis (Operação)</span>
              <strong className="text-slate-700 font-mono">R$ {metrics.variableExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          {!metrics.isClosed && (
            <div className="mt-4 pt-3 border-t border-rose-100 flex justify-end">
              <button
                id="add-quick-expense-btn"
                onClick={() => setIsQuickExpenseModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100/70 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Lançar Despesa para Abater
              </button>
            </div>
          )}
        </div>

        {/* CARD 3: SALDO CONTÁBIL LÍQUIDO APURADO (RESULTADO) */}
        <div className={`border rounded-2xl p-5 shadow-xs relative overflow-hidden ${
          metrics.netBalance >= 0
            ? 'bg-gradient-to-br from-indigo-50/50 to-white border-indigo-200/80'
            : 'bg-gradient-to-br from-amber-50/50 to-white border-amber-200/80'
        }`} id="net-balance-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl ${metrics.netBalance >= 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                <DollarSign className="w-5 h-5" />
              </span>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider block ${metrics.netBalance >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
                  Saldo Contábil Apurado
                </span>
                <span className="text-[11px] text-slate-500">Resultado líquido do mês</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 text-xs font-extrabold rounded-lg ${
              metrics.netBalance >= 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {metrics.netBalance >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>

          <div className="my-2">
            <div className={`text-3xl font-black font-mono tracking-tight ${
              metrics.netBalance >= 0 ? 'text-indigo-900' : 'text-amber-700'
            }`} id="net-balance-value">
              {metrics.netBalance >= 0 ? '+' : ''} R$ {metrics.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Margem Líquida da Competência: <strong className={metrics.profitMarginPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {metrics.profitMarginPercent > 0 ? '+' : ''}{metrics.profitMarginPercent}%
              </strong>
            </p>
          </div>

          {/* Barra de Absorção Contábil */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span>Taxa de Absorção de Custos</span>
              <span>{metrics.expenseAbsorptionRate}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.expenseAbsorptionRate, 100)}%` }}
                title={`Despesas Abatidas: ${metrics.expenseAbsorptionRate}%`}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.max(0, 100 - metrics.expenseAbsorptionRate)}%` }}
                title={`Margem Líquida Restante: ${Math.max(0, 100 - metrics.expenseAbsorptionRate).toFixed(1)}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Despesas Abatidas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Saldo Líquido
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO DE CONTEÚDO */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 px-5 pt-3 flex flex-wrap gap-2">
          <button
            id="tab-overview-btn"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Visão Geral & Composição do Saldo
          </button>

          <button
            id="tab-orders-btn"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            Pedidos Acumulados ({metrics.ordersCount})
          </button>

          <button
            id="tab-expenses-btn"
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            Despesas Abatidas ({metrics.expensesCount})
          </button>

          <button
            id="tab-history-btn"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Histórico de Meses Encerrados ({(db.monthlyAccountingClosings || []).length})
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="p-5">
          {/* ABA 1: VISÃO GERAL & COMPOSIÇÃO */}
          {activeTab === 'overview' && (
            <div className="space-y-6" id="overview-tab-content">
              {/* Resumo do ciclo contábil */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-500" />
                  Como funciona o ciclo contábil mensal no MotorDesk:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block mb-1">1. Acumulador de Pedidos (+)</strong>
                    Cada Venda de Balcão e Ordem de Serviço concluída no mês soma automaticamente no contador contábil de receitas.
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block mb-1">2. Abatimento de Despesas (-)</strong>
                    Ao lançar despesas fixas (aluguel, salários) e variáveis (peças, compras), elas abatem imediatamente do montante de receitas.
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 block mb-1">3. Virada de Mês & Reset (0)</strong>
                    Ao encerrar a competência, o balanço é arquivado e congelado. O sistema avança para o próximo mês com o contador ZERADO.
                  </div>
                </div>
              </div>

              {/* Tabela de Conciliação Contábil */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">
                  Demonstrativo de Resultado da Competência ({formatPeriodLabel(selectedPeriod)})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Conta Contábil / Classificação</th>
                        <th className="p-3 text-center">Registros</th>
                        <th className="p-3 text-right">Valor Total (R$)</th>
                        <th className="p-3 text-right">% Receita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {/* Receitas */}
                      <tr className="bg-emerald-50/30 font-semibold">
                        <td className="p-3 text-emerald-900 flex items-center gap-1.5">
                          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                          (+) RECEITA BRUTA DE PEDIDOS
                        </td>
                        <td className="p-3 text-center font-mono">{metrics.ordersCount}</td>
                        <td className="p-3 text-right font-mono text-emerald-700">
                          R$ {metrics.totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700">100,0%</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600">• Vendas de Peças e Balcão (PDV)</td>
                        <td className="p-3 text-center text-slate-400 font-mono">-</td>
                        <td className="p-3 text-right font-mono">
                          R$ {metrics.salesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {metrics.totalOrdersAmount > 0 ? ((metrics.salesAmount / metrics.totalOrdersAmount) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600">• Ordens de Serviço (Mão de Obra e Peças de Pátio)</td>
                        <td className="p-3 text-center text-slate-400 font-mono">-</td>
                        <td className="p-3 text-right font-mono">
                          R$ {metrics.serviceOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {metrics.totalOrdersAmount > 0 ? ((metrics.serviceOrdersAmount / metrics.totalOrdersAmount) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      {metrics.otherRevenuesAmount > 0 && (
                        <tr>
                          <td className="p-3 pl-8 text-slate-600">• Outras Receitas Operacionais / Caixa</td>
                          <td className="p-3 text-center text-slate-400 font-mono">-</td>
                          <td className="p-3 text-right font-mono">
                            R$ {metrics.otherRevenuesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500">
                            {((metrics.otherRevenuesAmount / metrics.totalOrdersAmount) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      )}

                      {/* Despesas */}
                      <tr className="bg-rose-50/30 font-semibold">
                        <td className="p-3 text-rose-900 flex items-center gap-1.5">
                          <ArrowDownRight className="w-4 h-4 text-rose-600" />
                          (-) DESPESAS & CUSTOS ABATIDOS
                        </td>
                        <td className="p-3 text-center font-mono">{metrics.expensesCount}</td>
                        <td className="p-3 text-right font-mono text-rose-700">
                          - R$ {metrics.totalExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-700">
                          {metrics.expenseAbsorptionRate}%
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600">• Despesas Fixas (Aluguel, Salários, Concessionárias)</td>
                        <td className="p-3 text-center text-slate-400 font-mono">-</td>
                        <td className="p-3 text-right font-mono">
                          - R$ {metrics.fixedExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {metrics.totalOrdersAmount > 0 ? ((metrics.fixedExpensesAmount / metrics.totalOrdersAmount) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-8 text-slate-600">• Despesas Variáveis (Fornecedores de Peças, Insumos, Frete)</td>
                        <td className="p-3 text-center text-slate-400 font-mono">-</td>
                        <td className="p-3 text-right font-mono">
                          - R$ {metrics.variableExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {metrics.totalOrdersAmount > 0 ? ((metrics.variableExpensesAmount / metrics.totalOrdersAmount) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>

                      {/* Saldo Líquido Final */}
                      <tr className="bg-slate-100 font-bold text-sm">
                        <td className="p-3.5 text-slate-900 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-indigo-600" />
                          (=) SALDO CONTÁBIL LÍQUIDO APURADO
                        </td>
                        <td className="p-3.5 text-center font-mono text-slate-500">-</td>
                        <td className={`p-3.5 text-right font-mono text-base ${
                          metrics.netBalance >= 0 ? 'text-indigo-900' : 'text-amber-700'
                        }`}>
                          {metrics.netBalance >= 0 ? '+' : ''} R$ {metrics.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-3.5 text-right font-mono ${
                          metrics.profitMarginPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {metrics.profitMarginPercent}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: PEDIDOS ACUMULADOS */}
          {activeTab === 'orders' && (
            <div className="space-y-4" id="orders-tab-content">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Pedidos e Receitas que Alimentam o Contador ({formatPeriodLabel(selectedPeriod)})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Total acumulado: <strong className="text-emerald-700 font-mono">R$ {metrics.totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({metrics.ordersCount} itens somados)
                  </p>
                </div>

                {!metrics.isClosed && (
                  <button
                    id="add-order-tab-btn"
                    onClick={() => setIsQuickOrderModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Adicionar Pedido no Mês
                  </button>
                )}
              </div>

              {metrics.ordersList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                  Nenhum pedido ou receita acumulada nesta competência até o momento.
                  {!metrics.isClosed && (
                    <div className="mt-2">
                      <button
                        onClick={() => setIsQuickOrderModalOpen(true)}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Clique aqui para lançar o primeiro pedido do mês
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs" id="accounting-orders-table">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Cliente / Favorecido</th>
                        <th className="p-3">Descrição dos Itens / Serviços</th>
                        <th className="p-3">Meio</th>
                        <th className="p-3 text-right">Valor Somado (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {metrics.ordersList.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition" id={`order-row-${order.id}`}>
                          <td className="p-3 font-mono text-slate-500">
                            {order.date ? new Date(order.date).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{order.code}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              order.type === 'sale'
                                ? 'bg-blue-100 text-blue-800'
                                : order.type === 'service_order'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {order.typeLabel}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">{order.clientName}</td>
                          <td className="p-3 text-slate-600 max-w-xs truncate" title={order.description}>
                            {order.description}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{order.paymentMethod || 'Dinheiro'}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">
                            + R$ {order.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: DESPESAS ABATIDAS */}
          {activeTab === 'expenses' && (
            <div className="space-y-4" id="expenses-tab-content">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Despesas Lançadas que Abatem o Saldo ({formatPeriodLabel(selectedPeriod)})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Total abatido: <strong className="text-rose-600 font-mono">- R$ {metrics.totalExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({metrics.expensesCount} lançamentos)
                  </p>
                </div>

                {!metrics.isClosed && (
                  <button
                    id="add-expense-tab-btn"
                    onClick={() => setIsQuickExpenseModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Lançar Despesa para Abater
                  </button>
                )}
              </div>

              {metrics.expensesList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                  Nenhuma despesa abatida registrada para este mês.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs" id="accounting-expenses-table">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Data / Venc.</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Classificação</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Fornecedor / Favorecido</th>
                        <th className="p-3">Descrição da Despesa</th>
                        <th className="p-3 text-right">Valor Abatido (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {metrics.expensesList.map(expense => (
                        <tr key={expense.id} className="hover:bg-slate-50/60 transition" id={`expense-row-${expense.id}`}>
                          <td className="p-3 font-mono text-slate-500">
                            {expense.date ? new Date(expense.date).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="p-3 font-mono text-slate-700">{expense.code}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              expense.classification === 'fixed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {expense.classification === 'fixed' ? 'Fixa' : 'Variável'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">{expense.category}</td>
                          <td className="p-3 text-slate-600">{expense.supplierOrFavored}</td>
                          <td className="p-3 text-slate-600 max-w-xs truncate" title={expense.description}>
                            {expense.description}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-600">
                            - R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 4: HISTÓRICO DE MESES ENCERRADOS */}
          {activeTab === 'history' && (
            <div className="space-y-4" id="history-tab-content">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Histórico de Encerramentos Mensais Gravados
                </h4>
                <p className="text-xs text-slate-500">
                  Ao virar o mês, o balanço de cada competência é auditado e congelado com o saldo final apurado.
                </p>
              </div>

              {(db.monthlyAccountingClosings || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                  Nenhum mês encerrado registrado ainda.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs" id="monthly-closings-history-table">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Competência</th>
                        <th className="p-3">Data do Encerramento</th>
                        <th className="p-3">Responsável</th>
                        <th className="p-3 text-right">Pedidos Somados (R$)</th>
                        <th className="p-3 text-right">Despesas Abatidas (R$)</th>
                        <th className="p-3 text-right">Saldo Líquido (R$)</th>
                        <th className="p-3 text-right">Margem</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(db.monthlyAccountingClosings || []).map(closing => (
                        <tr
                          key={closing.id}
                          className={`hover:bg-slate-50/60 transition ${
                            selectedPeriod === closing.period ? 'bg-indigo-50/40 font-medium' : ''
                          }`}
                          id={`closing-row-${closing.id}`}
                        >
                          <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            {closing.periodLabel}
                          </td>
                          <td className="p-3 text-slate-500 font-mono">
                            {closing.closedAt ? new Date(closing.closedAt).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="p-3 text-slate-700">{closing.closedByName || 'Gerente'}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">
                            R$ {closing.totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-600">
                            - R$ {closing.totalExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${
                            closing.netBalance >= 0 ? 'text-indigo-900' : 'text-amber-700'
                          }`}>
                            R$ {closing.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-700">
                            {closing.profitMarginPercent}%
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedPeriod(closing.period);
                                setActiveTab('overview');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                            >
                              Ver Balanço
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE ENCERRAMENTO DO MÊS COM VIRADA DE COMPETÊNCIA */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" id="closing-modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            {/* Cabeçalho do Modal */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Lock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Encerramento Contábil do Mês & Virada</h3>
                  <span className="text-xs text-slate-300">Competência: {formatPeriodLabel(selectedPeriod)}</span>
                </div>
              </div>
              <button
                id="close-closing-modal-x"
                onClick={() => setIsClosingModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Balanço de Fechamento */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Mês que será encerrado:</span>
                  <strong className="text-slate-800 font-mono">{formatPeriodLabel(selectedPeriod)} ({selectedPeriod})</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total de Pedidos Somados (+):</span>
                  <strong className="text-emerald-700 font-mono">R$ {metrics.totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total de Despesas Abatidas (-):</span>
                  <strong className="text-rose-700 font-mono">- R$ {metrics.totalExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-800">Saldo Contábil Líquido Final:</span>
                  <span className={`font-mono text-base ${metrics.netBalance >= 0 ? 'text-indigo-900' : 'text-amber-700'}`}>
                    R$ {metrics.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Informação sobre a Virada de Mês e Zeramento */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">Virada de Mês & Contador Zerado:</strong>
                  Ao confirmar, o mês de <strong>{formatPeriodLabel(selectedPeriod)}</strong> será arquivado com contas fechadas e a competência avançará para <strong>{formatPeriodLabel(getNextPeriod(selectedPeriod))}</strong> com o contador <strong>ZERADO (R$ 0,00)</strong> para os novos pedidos e despesas do próximo mês.
                </div>
              </div>

              {/* Observações do Encerramento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas / Observações do Fechamento Contábil
                </label>
                <textarea
                  id="closing-notes-input"
                  rows={2}
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  placeholder="Ex: Todas as notas e pagamentos de fornecedores conferidos e conciliados pelo financeiro..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Responsável */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Operador responsável: <strong>{currentUser.name}</strong> ({currentUser.role})</span>
                <span>Data/Hora: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                id="cancel-closing-btn"
                onClick={() => setIsClosingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                id="confirm-closing-btn"
                onClick={handleConfirmMonthlyClosing}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition duration-150 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Encerramento e Virar Mês
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO: LANÇAR PEDIDO NO MÊS (ACUMULAR NO CONTADOR) */}
      {isQuickOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" id="quick-order-modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Lançar Pedido no Mês (Acumular no Contador)</h3>
              </div>
              <button
                onClick={() => setIsQuickOrderModalOpen(false)}
                className="text-emerald-100 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuickOrder} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Pedido</label>
                <select
                  value={quickOrderForm.type}
                  onChange={e => setQuickOrderForm({ ...quickOrderForm, type: e.target.value as any })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="sale">Venda Balcão (Peças & Insumos)</option>
                  <option value="service_order">Ordem de Serviço (Mecânica / Elétrica)</option>
                  <option value="income">Receita Avulsa de Caixa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente / Solicitante</label>
                <input
                  type="text"
                  required
                  value={quickOrderForm.clientName}
                  onChange={e => setQuickOrderForm({ ...quickOrderForm, clientName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Nome do cliente ou frota..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição do Pedido</label>
                <input
                  type="text"
                  required
                  value={quickOrderForm.description}
                  onChange={e => setQuickOrderForm({ ...quickOrderForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Troca de pastilhas, filtros e óleo motor..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor do Pedido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={quickOrderForm.amount}
                    onChange={e => setQuickOrderForm({ ...quickOrderForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Meio de Pagamento</label>
                  <select
                    value={quickOrderForm.paymentMethod}
                    onChange={e => setQuickOrderForm({ ...quickOrderForm, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  >
                    <option value="PIX">PIX Dinâmico</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto Bancário</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickOrderModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Somar ao Contador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO: LANÇAR DESPESA PARA ABATER */}
      {isQuickExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" id="quick-expense-modal-backdrop">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-rose-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Lançar Despesa (Abater do Saldo)</h3>
              </div>
              <button
                onClick={() => setIsQuickExpenseModalOpen(false)}
                className="text-rose-100 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuickExpense} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classificação</label>
                  <select
                    value={quickExpenseForm.classification}
                    onChange={e => setQuickExpenseForm({ ...quickExpenseForm, classification: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="variable">Variável (Peças / Operação)</option>
                    <option value="fixed">Fixa (Estrutural / Aluguel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={quickExpenseForm.category}
                    onChange={e => setQuickExpenseForm({ ...quickExpenseForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  >
                    <option value="Peças & Insumos">Peças & Insumos</option>
                    <option value="Aluguel & Imóvel">Aluguel & Imóvel</option>
                    <option value="Salários & Folha">Salários & Folha</option>
                    <option value="Energia & Água">Energia & Água</option>
                    <option value="Frete & Logística">Frete & Logística</option>
                    <option value="Impostos & Tributos">Impostos & Tributos</option>
                    <option value="Outras Despesas">Outras Despesas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fornecedor / Favorecido</label>
                <input
                  type="text"
                  required
                  value={quickExpenseForm.supplierOrFavored}
                  onChange={e => setQuickExpenseForm({ ...quickExpenseForm, supplierOrFavored: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Distribuidora Brasil de Autopeças..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  value={quickExpenseForm.description}
                  onChange={e => setQuickExpenseForm({ ...quickExpenseForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Pagamento de faturas de peças para motor..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da Despesa (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quickExpenseForm.amount}
                  onChange={e => setQuickExpenseForm({ ...quickExpenseForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-rose-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickExpenseModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  Abater do Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
