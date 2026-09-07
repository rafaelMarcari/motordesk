/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — APURAÇÃO CONTÁBIL MENSAL & ACUMULADOR DE PEDIDOS X DESPESAS
 * Responsável por totalizar pedidos, abater despesas em tempo real e processar o encerramento mensal (virada de mês).
 */

import { AppDatabase, MonthlyAccountingClosing, FinancialTransaction, CommercialSale, ServiceOrder, AccountPayable } from '../types';
import { enrichPayableWithDimensions } from './financialUtils';

export interface AccountingOrderItem {
  id: string;
  code: string;
  date: string;
  type: 'sale' | 'service_order' | 'income_tx';
  typeLabel: string;
  clientName: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  status?: string;
}

export interface AccountingExpenseItem {
  id: string;
  code: string;
  date: string;
  category: string;
  classification: 'fixed' | 'variable';
  supplierOrFavored: string;
  description: string;
  amount: number;
  status: 'settled' | 'pending' | 'direct';
}

export interface MonthlyAccountingMetrics {
  period: string; // YYYY-MM
  periodLabel: string;
  isClosed: boolean;
  closingData?: MonthlyAccountingClosing;
  // Receitas (Pedidos)
  totalOrdersAmount: number;
  ordersCount: number;
  salesAmount: number;
  serviceOrdersAmount: number;
  otherRevenuesAmount: number;
  ordersList: AccountingOrderItem[];
  // Despesas (Abatimentos)
  totalExpensesAmount: number;
  expensesCount: number;
  fixedExpensesAmount: number;
  variableExpensesAmount: number;
  expensesList: AccountingExpenseItem[];
  // Resultado / Saldo Contábil
  netBalance: number; // Receitas - Despesas
  expenseAbsorptionRate: number; // % abatido
  profitMarginPercent: number; // % margem líquida
  averageOrderTicket: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Retorna o rótulo amigável da competência (ex: '2026-09' -> 'Setembro de 2026')
 */
export function formatPeriodLabel(period: string): string {
  if (!period || !period.includes('-')) return period;
  const [yearStr, monthStr] = period.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} de ${yearStr}`;
}

/**
 * Retorna o próximo período contábil (ex: '2026-09' -> '2026-10', '2026-12' -> '2027-01')
 */
export function getNextPeriod(period: string): string {
  if (!period || !period.includes('-')) return '2026-10';
  let [year, month] = period.split('-').map(Number);
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Retorna o período contábil anterior (ex: '2026-09' -> '2026-08', '2026-01' -> '2025-12')
 */
export function getPreviousPeriod(period: string): string {
  if (!period || !period.includes('-')) return '2026-08';
  let [year, month] = period.split('-').map(Number);
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Calcula todas as métricas contábeis de um mês (competência).
 * Se o mês estiver encerrado, respeita os valores congelados do encerramento oficial.
 * Se estiver aberto, computa dinamicamente todos os pedidos acumulados e despesas abatidas.
 */
export function calculateMonthlyAccountingMetrics(
  period: string,
  db: AppDatabase
): MonthlyAccountingMetrics {
  const periodLabel = formatPeriodLabel(period);
  const closings = db.monthlyAccountingClosings || [];
  const closedRecord = closings.find(c => c.period === period && c.status === 'closed');

  // Se já está encerrado, retorna os dados oficiais congelados do encerramento
  if (closedRecord) {
    return {
      period,
      periodLabel,
      isClosed: true,
      closingData: closedRecord,
      totalOrdersAmount: closedRecord.totalOrdersAmount,
      ordersCount: closedRecord.ordersCount,
      salesAmount: closedRecord.salesAmount,
      serviceOrdersAmount: closedRecord.serviceOrdersAmount,
      otherRevenuesAmount: closedRecord.otherRevenuesAmount,
      ordersList: [], // Arquivado
      totalExpensesAmount: closedRecord.totalExpensesAmount,
      expensesCount: closedRecord.expensesCount,
      fixedExpensesAmount: closedRecord.fixedExpensesAmount,
      variableExpensesAmount: closedRecord.variableExpensesAmount,
      expensesList: [], // Arquivado
      netBalance: closedRecord.netBalance,
      expenseAbsorptionRate: closedRecord.expenseAbsorptionRate,
      profitMarginPercent: closedRecord.profitMarginPercent,
      averageOrderTicket: closedRecord.ordersCount > 0 ? (closedRecord.totalOrdersAmount / closedRecord.ordersCount) : 0
    };
  }

  // Competência Aberta: Computa pedidos e despesas em tempo real
  const ordersList: AccountingOrderItem[] = [];
  const expensesList: AccountingExpenseItem[] = [];

  let salesAmount = 0;
  let serviceOrdersAmount = 0;
  let otherRevenuesAmount = 0;

  // 1. Vendas Balcão (Pedidos de Balcão)
  const sales: CommercialSale[] = db.sales || [];
  sales.forEach(sale => {
    const saleDate = sale.createdAt || '';
    if (saleDate.startsWith(period)) {
      const amt = Number(sale.totalAmount || 0);
      salesAmount += amt;
      ordersList.push({
        id: sale.id,
        code: sale.code || `VEN-${sale.id.slice(-4)}`,
        date: saleDate,
        type: 'sale',
        typeLabel: 'Venda Balcão (Peças)',
        clientName: sale.clientName || 'Consumidor Balcão',
        description: `Venda de ${sale.items?.length || 1} itens/peças`,
        amount: amt,
        paymentMethod: sale.paymentMethod || 'À Vista',
        status: sale.paymentStatus === 'paid' ? 'Paga' : sale.paymentStatus === 'canceled' ? 'Cancelada' : 'Pendente'
      });
    }
  });

  // 2. Ordens de Serviço (Serviços e Peças aplicadas)
  const serviceOrders: ServiceOrder[] = db.serviceOrders || [];
  serviceOrders.forEach(so => {
    const osDate = so.completedAt || so.createdAt || '';
    // Considera OS que foram concluídas/faturadas ou criadas no período
    if (osDate.startsWith(period) && so.status !== 'canceled') {
      const amt = (so.items || []).reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
      const client = (db.clients || []).find(c => c.id === so.clientId);
      const vehicle = (db.vehicles || []).find(v => v.id === so.vehicleId);

      serviceOrdersAmount += amt;
      ordersList.push({
        id: so.id,
        code: `OS #${so.id}`,
        date: osDate,
        type: 'service_order',
        typeLabel: 'Ordem de Serviço',
        clientName: client?.name || 'Cliente Oficina',
        description: `${vehicle?.plate || 'Veículo'} - ${so.customerComplaint || so.notes || 'Serviços mecânicos'}`,
        amount: amt,
        paymentMethod: so.paymentStatus === 'paid' ? 'Pago' : 'A Prazo / OS',
        status: so.status === 'completed' ? 'Concluída' : 'Em Execução'
      });
    }
  });

  // 3. Transações de Entrada no Caixa que não sejam duplicatas de venda/OS
  const financialTx: FinancialTransaction[] = db.financialTransactions || [];
  financialTx.forEach(tx => {
    const txDate = tx.date || '';
    if (txDate.startsWith(period)) {
      if (tx.type === 'income') {
        // Se não possui referência direta com venda ou OS já somada
        const isLinkedToKnown = ordersList.some(o => o.id === tx.referenceId || o.code === tx.referenceId);
        if (!isLinkedToKnown) {
          const amt = Number(tx.amount || 0);
          otherRevenuesAmount += amt;
          ordersList.push({
            id: tx.id,
            code: `LANC-${tx.id.slice(-4)}`,
            date: txDate,
            type: 'income_tx',
            typeLabel: 'Receita Caixa',
            clientName: tx.category || 'Receita Diversa',
            description: tx.description,
            amount: amt,
            paymentMethod: tx.paymentMethod || 'Caixa',
            status: 'Liquidada'
          });
        }
      } else if (tx.type === 'expense') {
        // Lançamento de despesa no caixa
        const isFixed = tx.category.toLowerCase().includes('aluguel') ||
                        tx.category.toLowerCase().includes('salário') ||
                        tx.category.toLowerCase().includes('energia') ||
                        tx.category.toLowerCase().includes('internet') ||
                        tx.classification === 'fixed';
        expensesList.push({
          id: tx.id,
          code: `DSP-${tx.id.slice(-4)}`,
          date: txDate,
          category: tx.category,
          classification: isFixed ? 'fixed' : 'variable',
          supplierOrFavored: tx.supplierId || 'Despesa Operacional',
          description: tx.description,
          amount: Number(tx.amount || 0),
          status: 'direct'
        });
      }
    }
  });

  // 4. Contas a Pagar do Mês
  const payables: AccountPayable[] = (db.accountsPayable || []).map(enrichPayableWithDimensions);
  payables.forEach(ap => {
    const dueDate = ap.dueDate || ap.createdAt || '';
    if (dueDate.startsWith(period)) {
      // Evita duplicar se já foi inserido via financialTransactions
      const alreadyInList = expensesList.some(e => e.id === ap.id || e.code === ap.code || e.code === ap.nfeNumber);
      if (!alreadyInList) {
        const isFixed = ap.classification === 'fixed';
        const amt = Number(ap.totalAmount || 0);
        expensesList.push({
          id: ap.id,
          code: ap.code || ap.nfeNumber || `CP-${ap.id.slice(-4)}`,
          date: dueDate,
          category: ap.category || 'Fornecedores',
          classification: isFixed ? 'fixed' : 'variable',
          supplierOrFavored: ap.supplierName || 'Fornecedor',
          description: ap.description || 'Conta a Pagar',
          amount: amt,
          status: ap.status === 'paid' ? 'settled' : 'pending'
        });
      }
    }
  });

  // Totais Acumulados
  const totalOrdersAmount = salesAmount + serviceOrdersAmount + otherRevenuesAmount;
  const ordersCount = ordersList.length;

  let fixedExpensesAmount = 0;
  let variableExpensesAmount = 0;

  expensesList.forEach(exp => {
    if (exp.classification === 'fixed') {
      fixedExpensesAmount += exp.amount;
    } else {
      variableExpensesAmount += exp.amount;
    }
  });

  const totalExpensesAmount = fixedExpensesAmount + variableExpensesAmount;
  const expensesCount = expensesList.length;

  // Saldo Contábil do Mês (Receita - Despesas)
  const netBalance = totalOrdersAmount - totalExpensesAmount;

  // Taxa de absorção (quanto das receitas foram abatidas por despesas)
  const expenseAbsorptionRate = totalOrdersAmount > 0
    ? Number(((totalExpensesAmount / totalOrdersAmount) * 100).toFixed(1))
    : 0;

  // Margem Líquida
  const profitMarginPercent = totalOrdersAmount > 0
    ? Number(((netBalance / totalOrdersAmount) * 100).toFixed(1))
    : 0;

  const averageOrderTicket = ordersCount > 0
    ? Number((totalOrdersAmount / ordersCount).toFixed(2))
    : 0;

  return {
    period,
    periodLabel,
    isClosed: false,
    totalOrdersAmount,
    ordersCount,
    salesAmount,
    serviceOrdersAmount,
    otherRevenuesAmount,
    ordersList: ordersList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    totalExpensesAmount,
    expensesCount,
    fixedExpensesAmount,
    variableExpensesAmount,
    expensesList: expensesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    netBalance,
    expenseAbsorptionRate,
    profitMarginPercent,
    averageOrderTicket
  };
}
