import React, { useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

export interface MonthInfo {
  key: string; // '2026-01'
  label: string; // 'JAN/2026'
  shortLabel: string; // 'JAN'
  monthIndex: number; // 0 to 11
  year: number;
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  paidCount: number;
  paidAmount: number;
  overdueCount: number;
  overdueAmount: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface MonthlyHorizontalMenuBarProps {
  type: 'receivable' | 'payable';
  items: any[];
  selectedMonth: string; // 'YYYY-MM' ou 'ALL'
  onSelectMonth: (monthKey: string) => void;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  dateFilterField: 'due' | 'emission' | 'receipt' | 'payment';
  onChangeDateFilterField?: (field: any) => void;
  onQuickNewItem?: (targetMonth: string) => void;
  onRolloverPending?: (previousMonthKey: string, itemsToRollover: any[]) => void;
  onViewPreviousMonth?: (previousMonthKey: string) => void;
}

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const MONTH_ABBR = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

export function MonthlyHorizontalMenuBar({
  type,
  items,
  selectedMonth,
  onSelectMonth,
  selectedYear,
  onSelectYear,
  dateFilterField,
  onChangeDateFilterField,
  onQuickNewItem,
  onRolloverPending,
  onViewPreviousMonth
}: MonthlyHorizontalMenuBarProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const currentMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  const isReceivable = type === 'receivable';
  const labelSingular = isReceivable ? 'título a receber' : 'conta a pagar';
  const labelPlural = isReceivable ? 'títulos a receber' : 'contas a pagar';
  const labelAction = isReceivable ? 'recebimento' : 'pagamento';

  // Helper para obter a data relevante do item conforme o campo selecionado
  const getItemDate = (item: any): string => {
    if (dateFilterField === 'due') {
      return item.dueDate || item.date || item.createdAt || '';
    }
    if (dateFilterField === 'emission') {
      return item.emissionDate || item.date || item.createdAt || '';
    }
    // receipt / payment
    return item.paidAt || item.paymentDate || item.date || '';
  };

  // Helper para checar se item está pendente
  const isItemPending = (item: any): boolean => {
    const isPaid = item.status === 'paid' || (item.remainingAmount !== undefined && Number(item.remainingAmount) <= 0);
    return !isPaid;
  };

  // Helper para checar se item está vencido
  const isItemOverdue = (item: any): boolean => {
    if (!isItemPending(item)) return false;
    const due = item.dueDate || '';
    if (!due) return false;
    const todayStr = today.toISOString().split('T')[0];
    return due < todayStr;
  };

  // Obter valor pendente
  const getItemRemaining = (item: any): number => {
    if (item.remainingAmount !== undefined) return Number(item.remainingAmount) || 0;
    const amt = Number(item.amount) || 0;
    const paid = Number(item.paidAmount) || 0;
    return Math.max(0, amt - paid);
  };

  // Construir sumário dos 12 meses para o ano selecionado
  const monthsData = useMemo<MonthInfo[]>(() => {
    return Array.from({ length: 12 }).map((_, idx) => {
      const monthNumber = String(idx + 1).padStart(2, '0');
      const key = `${selectedYear}-${monthNumber}`;
      const label = `${MONTH_ABBR[idx]}/${selectedYear}`;
      const shortLabel = MONTH_ABBR[idx];

      const isCurrent = selectedYear === currentYear && idx === currentMonthIndex;
      const isPast = selectedYear < currentYear || (selectedYear === currentYear && idx < currentMonthIndex);
      const isFuture = selectedYear > currentYear || (selectedYear === currentYear && idx > currentMonthIndex);

      let totalCount = 0;
      let totalAmount = 0;
      let pendingCount = 0;
      let pendingAmount = 0;
      let paidCount = 0;
      let paidAmount = 0;
      let overdueCount = 0;
      let overdueAmount = 0;

      items.forEach(item => {
        const d = getItemDate(item);
        if (d && d.startsWith(key)) {
          totalCount += 1;
          const amt = Number(item.amount) || 0;
          totalAmount += amt;

          const rem = getItemRemaining(item);
          if (rem > 0) {
            pendingCount += 1;
            pendingAmount += rem;
            if (isItemOverdue(item)) {
              overdueCount += 1;
              overdueAmount += rem;
            }
          } else {
            paidCount += 1;
            paidAmount += amt;
          }
        }
      });

      return {
        key,
        label,
        shortLabel,
        monthIndex: idx,
        year: selectedYear,
        totalCount,
        totalAmount,
        pendingCount,
        pendingAmount,
        paidCount,
        paidAmount,
        overdueCount,
        overdueAmount,
        isCurrent,
        isPast,
        isFuture
      };
    });
  }, [items, selectedYear, dateFilterField, currentYear, currentMonthIndex]);

  // Cálculos do Mês Selecionado e Mês Anterior
  const selectedMonthInfo = useMemo(() => {
    if (selectedMonth === 'ALL') return null;
    return monthsData.find(m => m.key === selectedMonth) || null;
  }, [monthsData, selectedMonth]);

  // Identificar chave e dados do mês anterior
  const previousMonthInfo = useMemo(() => {
    if (selectedMonth === 'ALL') return null;
    const [yStr, mStr] = selectedMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);

    let prevY = y;
    let prevM = m - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY = y - 1;
    }
    const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
    const prevLabel = `${MONTH_ABBR[prevM - 1]}/${prevY}`;

    // Buscar pendências do mês anterior em todo o banco
    const pendingItemsFromPrevMonth: any[] = [];
    let totalPendingAmount = 0;

    items.forEach(item => {
      const d = getItemDate(item);
      if (d && d.startsWith(prevKey)) {
        const rem = getItemRemaining(item);
        if (rem > 0) {
          pendingItemsFromPrevMonth.push(item);
          totalPendingAmount += rem;
        }
      }
    });

    return {
      key: prevKey,
      label: prevLabel,
      monthIndex: prevM - 1,
      year: prevY,
      pendingItems: pendingItemsFromPrevMonth,
      pendingCount: pendingItemsFromPrevMonth.length,
      pendingAmount: totalPendingAmount
    };
  }, [selectedMonth, items, dateFilterField]);

  // Formatação monetária
  const formatMoney = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div className="space-y-3 select-none" id="monthly-horizontal-menu-container">
      {/* 1. BARRA PRINCIPAL ESTILO DO PRINT (FUNDO LARANJA / AMBER COM PÍLULAS AMARELAS DE ALTO CONTRASTE) */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 p-2.5 sm:p-3 rounded-2xl shadow-md border-2 border-amber-500 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 pb-2 mb-2 border-b border-orange-400/40">
          {/* Título da Barra Horizontal com Navegação de Ano */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-xl border border-white/20">
              <Calendar className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="font-black text-xs uppercase tracking-wider text-white">
                Cronograma Mensal ({isReceivable ? 'Recebimentos' : 'Pagamentos'})
              </span>
            </div>

            {/* Seletor de Ano com Alto Contraste */}
            <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/25">
              <button
                id="btn-year-prev"
                type="button"
                onClick={() => onSelectYear(selectedYear - 1)}
                title="Ano Anterior"
                className="px-2 py-1 hover:bg-white/20 text-amber-200 hover:text-white rounded-lg transition font-bold text-xs flex items-center cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{selectedYear - 1}</span>
              </button>
              <span className="px-3 py-1 font-black text-xs text-amber-300 font-mono tracking-wider">
                {selectedYear}
              </span>
              <button
                id="btn-year-next"
                type="button"
                onClick={() => onSelectYear(selectedYear + 1)}
                title="Próximo Ano"
                className="px-2 py-1 hover:bg-white/20 text-amber-200 hover:text-white rounded-lg transition font-bold text-xs flex items-center cursor-pointer"
              >
                <span>{selectedYear + 1}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Campo Base de Filtragem (Vencimento vs Emissão) */}
          <div className="flex items-center gap-1.5 self-end md:self-auto text-xs bg-black/25 px-2.5 py-1 rounded-xl border border-white/20">
            <span className="text-[11px] font-bold text-orange-100 uppercase">Filtrar por:</span>
            <button
              type="button"
              onClick={() => onChangeDateFilterField && onChangeDateFilterField('due')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition ${
                dateFilterField === 'due'
                  ? 'bg-amber-300 text-slate-950 shadow-xs'
                  : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              Vencimento
            </button>
            <button
              type="button"
              onClick={() => onChangeDateFilterField && onChangeDateFilterField('emission')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition ${
                dateFilterField === 'emission'
                  ? 'bg-amber-300 text-slate-950 shadow-xs'
                  : 'text-amber-100 hover:bg-white/10'
              }`}
            >
              Emissão
            </button>
          </div>
        </div>

        {/* FILEIRA HORIZONTAL DE BOTÕES ESTILO PÍLULA (IGUAL AO PRINT) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {/* Pílula: TODOS OS MESES */}
          <button
            id="month-pill-all"
            type="button"
            onClick={() => onSelectMonth('ALL')}
            className={`shrink-0 px-4 py-2 rounded-full font-black text-xs md:text-sm tracking-wide uppercase transition cursor-pointer flex items-center gap-1.5 shadow-sm border-2 ${
              selectedMonth === 'ALL'
                ? 'bg-slate-950 text-amber-300 border-white ring-2 ring-amber-400 scale-105 shadow-md'
                : 'bg-amber-300 hover:bg-yellow-200 text-slate-950 border-amber-400 hover:scale-102'
            }`}
          >
            <span>TODOS OS MESES</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/20 rounded-full font-mono">
              {items.length}
            </span>
          </button>

          {/* Pílulas de cada Mês (JAN/2026, FEV/2026, etc) */}
          {monthsData.map((m) => {
            const isSelected = selectedMonth === m.key;
            const hasPending = m.pendingCount > 0;
            const isOverdue = m.overdueCount > 0;

            return (
              <button
                key={m.key}
                id={`month-pill-${m.key}`}
                type="button"
                onClick={() => onSelectMonth(m.key)}
                className={`relative shrink-0 px-4 py-2 rounded-full font-black text-xs md:text-sm tracking-wide uppercase transition cursor-pointer flex items-center gap-2 shadow-sm border-2 ${
                  isSelected
                    ? 'bg-slate-950 text-amber-300 border-white ring-2 ring-amber-400 scale-105 shadow-md z-10'
                    : 'bg-amber-300 hover:bg-yellow-200 text-slate-950 border-amber-400 hover:scale-102'
                }`}
                title={`Clique para visualizar ${m.label} (${m.totalCount} lançamentos)`}
              >
                <span>{m.label}</span>

                {/* Badge de Quantidade de Lançamentos */}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950'
                      : m.totalCount === 0
                      ? 'bg-slate-800/20 text-slate-900'
                      : 'bg-slate-950 text-amber-300'
                  }`}
                >
                  {m.totalCount}
                </span>

                {/* Indicador de Mês Atual */}
                {m.isCurrent && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black font-sans uppercase tracking-tighter ${
                      isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    ATUAL
                  </span>
                )}

                {/* Ponto indicador de alerta para pendências/vencidas */}
                {isOverdue && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-white animate-pulse"
                    title={`${m.overdueCount} títulos vencidos`}
                  />
                )}
                {!isOverdue && hasPending && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-600 border border-white"
                    title={`${m.pendingCount} títulos em aberto`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
