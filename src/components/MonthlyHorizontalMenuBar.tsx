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

      {/* 2. ALERTA DE PENDÊNCIAS DO MÊS ANTERIOR (QUANDO O MÊS SELECIONADO É UM MÊS ESPECÍFICO) */}
      {selectedMonth !== 'ALL' && previousMonthInfo && (
        <>
          {previousMonthInfo.pendingCount > 0 ? (
            <div
              id="previous-month-pending-alert"
              className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-300 font-mono">
                      PENDÊNCIAS DO MÊS ANTERIOR ({previousMonthInfo.label})
                    </span>
                    <span className="font-extrabold text-sm text-slate-900">
                      Existem <span className="text-rose-700 underline">{previousMonthInfo.pendingCount} {previousMonthInfo.pendingCount === 1 ? labelSingular : labelPlural}</span> não quitados!
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold mt-1">
                    Saldo total pendente de {previousMonthInfo.label}:{' '}
                    <span className="font-black text-rose-700 text-sm">
                      {formatMoney(previousMonthInfo.pendingAmount)}
                    </span>
                    . Verifique essas contas para não acumular inadimplência ou juros.
                  </p>
                </div>
              </div>

              {/* Ações para resolver pendências do mês anterior */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  id="btn-view-previous-month"
                  type="button"
                  onClick={() => {
                    if (onViewPreviousMonth) {
                      onViewPreviousMonth(previousMonthInfo.key);
                    } else {
                      onSelectMonth(previousMonthInfo.key);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border-2 border-amber-400 text-slate-900 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <span>👁️ Ver Contas de {previousMonthInfo.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {onRolloverPending && (
                  <button
                    id="btn-rollover-previous-month"
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja prorrogar o vencimento das ${previousMonthInfo.pendingCount} contas pendentes de ${previousMonthInfo.label} para o mês selecionado (${selectedMonthInfo?.label})?`)) {
                        onRolloverPending(previousMonthInfo.key, previousMonthInfo.pendingItems);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs border border-amber-600"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>⚡ Prorrogar para {selectedMonthInfo?.shortLabel}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              id="previous-month-clean-badge"
              className="bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Mês anterior ({previousMonthInfo.label}) <span className="text-emerald-700 font-black">100% regularizado</span>: Nenhuma pendência em aberto transitada para {selectedMonthInfo?.label}.
                </span>
              </div>
              <span className="text-[11px] font-mono font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                Regular
              </span>
            </div>
          )}
        </>
      )}

      {/* 3. ESTADO VISUAL QUANDO O MÊS ESTÁ ZERADO DE INFORMAÇÕES */}
      {selectedMonth !== 'ALL' && selectedMonthInfo && selectedMonthInfo.totalCount === 0 && (
        <div
          id="empty-month-state-card"
          className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3 shadow-xs animate-in fade-in duration-200"
        >
          <div className="w-12 h-12 bg-amber-100 border-2 border-amber-300 text-amber-800 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-xs font-black">
            🗓️
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900 uppercase">
              Início de Mês Zerado — {selectedMonthInfo.label}
            </h3>
            <p className="text-xs text-slate-600 font-medium max-w-md mx-auto mt-1">
              O mês de <span className="font-bold text-slate-800">{selectedMonthInfo.label}</span> ainda não possui nenhum {labelSingular} registrado na competência de {dateFilterField === 'due' ? 'vencimento' : 'emissão'}.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-center gap-3">
            {onQuickNewItem && (
              <button
                id="btn-empty-month-create"
                type="button"
                onClick={() => onQuickNewItem(selectedMonth)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-sm cursor-pointer transition hover:scale-102"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Lançamento para {selectedMonthInfo.label}</span>
              </button>
            )}
            <button
              id="btn-empty-month-view-all"
              type="button"
              onClick={() => onSelectMonth('ALL')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition border border-slate-300"
            >
              Ver Todos os Meses
            </button>
          </div>
        </div>
      )}

      {/* 4. RESUMO DOS TOTAIS DA COMPETÊNCIA SELECIONADA */}
      {selectedMonthInfo && selectedMonthInfo.totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5">
            <span className="text-[10px] font-black uppercase text-slate-500 block">Total do Mês ({selectedMonthInfo.label})</span>
            <span className="text-sm font-black text-slate-900 block mt-0.5">{formatMoney(selectedMonthInfo.totalAmount)}</span>
            <span className="text-[10px] text-slate-500 font-bold">{selectedMonthInfo.totalCount} {selectedMonthInfo.totalCount === 1 ? 'registro' : 'registros'}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
            <span className="text-[10px] font-black uppercase text-emerald-700 block">Total {isReceivable ? 'Recebido' : 'Pago'}</span>
            <span className="text-sm font-black text-emerald-800 block mt-0.5">{formatMoney(selectedMonthInfo.paidAmount)}</span>
            <span className="text-[10px] text-emerald-600 font-bold">{selectedMonthInfo.paidCount} quitados</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
            <span className="text-[10px] font-black uppercase text-amber-800 block">A {isReceivable ? 'Receber' : 'Pagar'} (A Vencer)</span>
            <span className="text-sm font-black text-amber-900 block mt-0.5">{formatMoney(selectedMonthInfo.pendingAmount - selectedMonthInfo.overdueAmount)}</span>
            <span className="text-[10px] text-amber-700 font-bold">{selectedMonthInfo.pendingCount - selectedMonthInfo.overdueCount} em aberto</span>
          </div>
          <div className={`rounded-xl p-2.5 border ${selectedMonthInfo.overdueCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-black uppercase block ${selectedMonthInfo.overdueCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Vencidos no Mês</span>
            <span className={`text-sm font-black block mt-0.5 ${selectedMonthInfo.overdueCount > 0 ? 'text-rose-800' : 'text-slate-700'}`}>{formatMoney(selectedMonthInfo.overdueAmount)}</span>
            <span className={`text-[10px] font-bold ${selectedMonthInfo.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{selectedMonthInfo.overdueCount} atrasados</span>
          </div>
        </div>
      )}
    </div>
  );
}
