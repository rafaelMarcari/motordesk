/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — MOTOR CENTRAL DE CÁLCULO DE COMISSÕES & FOLHA DE PAGAMENTO
 * Gestão de percentuais de comissão, acumulativos de vendas/serviços e sugestão para Contas a Pagar
 */

import { User, AccountPayable, AppDatabase } from '../types';

export interface EmployeeCommissionSummary {
  user: User;
  period: string; // YYYY-MM
  jobTitle: string;
  baseSalary: number;
  commissionPercent: number;
  commissionType: string;
  
  // Totais apurados
  salesCount: number;
  salesTotal: number;
  salesVolume?: number; // Alias
  servicesCount: number;
  servicesTotal: number;
  servicesVolume?: number; // Alias
  representedCount: number;
  representedTotal: number;
  totalVolume: number; // Soma de vendas + serviços + representada
  totalVolumeEligible: number; // Sinônimo para compatibilidade de visualização
  
  // Comissões calculadas
  salesCommission: number;
  servicesCommission: number;
  representedCommission: number;
  totalCommission: number;
  
  // Total geral sugerido (Salário Base + Comissões)
  suggestedTotalPayout: number;
  suggestedPayout: number; // Alias

  // Status de pagamentos já lançados no Contas a Pagar para este período
  alreadyScheduledAmount: number;
  alreadyPaidAmount: number;
  pendingBalance: number;
  payables: AccountPayable[];

  // Extrato de itens que compuseram a apuração
  items: {
    id: string;
    type: 'venda' | 'servico' | 'representada';
    documentNumber: string;
    date: string;
    clientName: string;
    grossAmount: number;
    commissionRate: number;
    commissionAmount: number;
  }[];
}

/**
 * Calcula o resumo de comissões e produção de um colaborador em um dado período (ex: '2026-09')
 */
export function calculateEmployeeCommission(
  user: User,
  db: AppDatabase,
  period: string = '2026-09'
): EmployeeCommissionSummary {
  const jobTitle = user.jobTitle || (user.role === 'admin' ? 'Gerente Geral' : user.role === 'mecanico' ? 'Mecânico Técnico' : user.role === 'atendente' ? 'Consultor Comercial' : 'Operador');
  const baseSalary = Number(user.baseSalary || 0);
  const commissionPercent = Number(user.commissionPercent || 0);
  const rawCommType = user.commissionType || (user.role === 'mecanico' ? 'servicos' : user.role === 'atendente' ? 'vendas' : 'ambos');
  const commissionType = rawCommType === 'sales' ? 'vendas' : rawCommType === 'services' ? 'servicos' : rawCommType === 'all' ? 'ambos' : rawCommType;

  const items: EmployeeCommissionSummary['items'] = [];

  let salesCount = 0;
  let salesTotal = 0;
  let salesCommission = 0;

  let servicesCount = 0;
  let servicesTotal = 0;
  let servicesCommission = 0;

  let representedCount = 0;
  let representedTotal = 0;
  let representedCommission = 0;

  // 1. Apura Vendas Comerciais do Balcão
  if (commissionType === 'vendas' || commissionType === 'ambos') {
    const matchingSales = (db.sales || []).filter(sale => {
      const matchUser = (sale.createdBy === user.username || (sale as any).sellerId === user.id || (sale as any).salespersonId === user.id);
      const matchPeriod = ((sale as any).date || sale.createdAt || '').startsWith(period);
      const notCanceled = (sale as any).status !== 'canceled' && sale.paymentStatus !== 'canceled';
      return matchUser && matchPeriod && notCanceled;
    });

    matchingSales.forEach(sale => {
      salesCount++;
      const gross = Number(sale.totalAmount || 0);
      salesTotal += gross;
      const rate = commissionPercent;
      const comm = (gross * rate) / 100;
      salesCommission += comm;

      items.push({
        id: sale.id,
        type: 'venda',
        documentNumber: sale.code || `PDV-${sale.id.slice(0, 5)}`,
        date: (sale as any).date || sale.createdAt?.slice(0, 10) || '',
        clientName: sale.clientName || 'Consumidor Balcão',
        grossAmount: gross,
        commissionRate: rate,
        commissionAmount: comm
      });
    });
  }

  // 2. Apura Serviços de Ordens de Serviço
  if (commissionType === 'servicos' || commissionType === 'ambos') {
    const matchingOS = (db.serviceOrders || []).filter(os => {
      const matchMechanic = os.mechanicId === user.id || (os as any).assignedMechanicId === user.id || (os as any).createdBy === user.username;
      const matchPeriod = ((os as any).closedAt || os.completedAt || os.createdAt || '').startsWith(period);
      const completed = os.status === 'completed' || (os as any).status === 'paid';
      return matchMechanic && matchPeriod && completed;
    });

    matchingOS.forEach(os => {
      servicesCount++;
      // Base da comissão de OS: itens do tipo serviço ou valor total
      const serviceItems = (os.items || []).filter(i => i.type === 'service');
      const serviceValue = serviceItems.length > 0 
        ? serviceItems.reduce((acc, s) => acc + (Number(s.unitPrice || 0) * Number(s.quantity || 1)), 0)
        : (os.items || []).reduce((acc, s) => acc + (Number(s.unitPrice || 0) * Number(s.quantity || 1)), 0);
      
      servicesTotal += serviceValue;
      const rate = commissionPercent;
      const comm = (serviceValue * rate) / 100;
      servicesCommission += comm;

      items.push({
        id: os.id,
        type: 'servico',
        documentNumber: (os as any).code || `OS-${os.id.slice(0, 5)}`,
        date: (os as any).closedAt?.slice(0, 10) || os.completedAt?.slice(0, 10) || os.createdAt?.slice(0, 10) || '',
        clientName: (os as any).clientName || 'Cliente Oficina',
        grossAmount: serviceValue,
        commissionRate: rate,
        commissionAmount: comm
      });
    });
  }

  // 3. Apura Pedidos de Representada
  if (commissionType === 'representada' || commissionType === 'ambos') {
    const matchingRepOrders = (db.representativeOrders || []).filter(ro => {
      const matchUser = ro.salespersonId === user.id || ro.createdBy === user.username;
      const matchPeriod = (ro.orderDate || ro.createdAt || '').startsWith(period);
      return matchUser && matchPeriod && ro.status !== 'canceled';
    });

    matchingRepOrders.forEach(ro => {
      representedCount++;
      const gross = Number(ro.totalOrderAmount || ro.totalAmount || 0);
      representedTotal += gross;
      const rate = Number(ro.commissionPercentage || ro.commissionRatePercent || commissionPercent);
      const comm = Number(ro.commissionAmount || (gross * rate) / 100);
      representedCommission += comm;

      items.push({
        id: ro.id,
        type: 'representada',
        documentNumber: ro.orderNumber || ro.code || `REP-${ro.id.slice(0, 5)}`,
        date: ro.orderDate?.slice(0, 10) || ro.createdAt?.slice(0, 10) || '',
        clientName: ro.clientName || 'Cliente Representada',
        grossAmount: gross,
        commissionRate: rate,
        commissionAmount: comm
      });
    });
  }

  const totalCommission = salesCommission + servicesCommission + representedCommission;
  const suggestedTotalPayout = baseSalary + totalCommission;
  const totalVolume = salesTotal + servicesTotal + representedTotal;

  // 4. Busca Contas a Pagar já lançadas para este funcionário neste período
  const userPayables = (db.accountsPayable || []).filter(ap => {
    const isEmpMatch = ap.employeeId === user.id || (ap.supplierName && ap.supplierName.toLowerCase().includes(user.name.toLowerCase()));
    const isPeriodMatch = ap.commissionMonthRef === period || (ap.dueDate || '').startsWith(period);
    const isSalOrComm = (ap.category || '').toLowerCase().includes('salário') || (ap.category || '').toLowerCase().includes('comiss');
    return isEmpMatch && (isPeriodMatch || isSalOrComm);
  });

  const alreadyScheduledAmount = userPayables.reduce((acc, p) => acc + Number(p.totalAmount || p.amount || 0), 0);
  const alreadyPaidAmount = userPayables.filter(p => p.status === 'paid').reduce((acc, p) => acc + Number(p.totalAmount || p.amount || 0), 0);
  const pendingBalance = Math.max(0, suggestedTotalPayout - alreadyPaidAmount);

  return {
    user,
    period,
    jobTitle,
    baseSalary,
    commissionPercent,
    commissionType,
    salesCount,
    salesTotal,
    salesVolume: salesTotal,
    servicesCount,
    servicesTotal,
    servicesVolume: servicesTotal,
    representedCount,
    representedTotal,
    totalVolume,
    totalVolumeEligible: totalVolume,
    salesCommission,
    servicesCommission,
    representedCommission,
    totalCommission,
    suggestedTotalPayout,
    suggestedPayout: suggestedTotalPayout,
    alreadyScheduledAmount,
    alreadyPaidAmount,
    pendingBalance,
    payables: userPayables,
    items
  };
}

/**
 * Cria um objeto AccountPayable para lançamento automático da folha/comissão
 */
export function createPayrollPayable(params: {
  user: User;
  amount: number;
  period: string;
  type: 'salary' | 'commission' | 'total';
  dueDate?: string;
  notes?: string;
}): AccountPayable {
  const { user, amount, period, type, dueDate, notes } = params;
  const now = new Date().toISOString();
  const yearMonth = period || now.slice(0, 7);
  const due = dueDate || `${yearMonth}-28`;

  const typeDesc = type === 'salary' 
    ? `Salário Fixo Ref. ${yearMonth}` 
    : type === 'commission' 
    ? `Comissões de Vendas/Serviços Ref. ${yearMonth}` 
    : `Folha de Pagamento Completa (Salário + Comissões) Ref. ${yearMonth}`;

  return {
    id: `cp-payroll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: `FOLHA-${yearMonth.replace('-', '')}-${user.id.slice(-4).toUpperCase()}`,
    supplierId: user.id,
    supplierName: `${user.name} (${user.jobTitle || 'Colaborador'})`,
    description: `${typeDesc} - ${user.name}`,
    category: 'Salários & Comissões',
    nature: 'expense',
    classification: 'fixed',
    periodicity: 'monthly',
    isRecurring: true,
    origin: 'salary',
    totalAmount: amount,
    amount: amount,
    paidAmount: 0,
    remainingAmount: amount,
    issueDate: now.slice(0, 10),
    dueDate: due,
    status: 'pending',
    installments: [
      {
        id: `inst-${Date.now()}-1`,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: amount,
        paidAmount: 0,
        dueDate: due,
        status: 'pending',
        paymentMethod: user.pixKey ? 'PIX' : 'Transferência Bancária',
        receiptNotes: `Lançamento de Folha/Comissão - ${user.name}`
      }
    ],
    companyId: user.companyId || 'comp-1',
    notes: notes || `Chave PIX: ${user.pixKey || 'Não informada'} | Banco: ${user.bankName || 'Não informado'} | Cargo: ${user.jobTitle || 'Geral'}`,
    employeeId: user.id,
    employeeName: user.name,
    commissionMonthRef: yearMonth,
    createdAt: now,
    updatedAt: now
  };
}
