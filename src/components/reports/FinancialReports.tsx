import React, { useState, useMemo } from 'react';
import { 
  DollarSign, Download, Search, Filter, Calendar, Clock, AlertTriangle, 
  CheckCircle2, ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown,
  UserX, ShieldCheck, FileText, Phone, MessageSquare
} from 'lucide-react';
import { AppDatabase } from '../../data/mockData';
import { exportToCsv } from '../../utils/csvExporter';

interface FinancialReportsProps {
  db: AppDatabase;
  subType: 'financial_receivables' | 'financial_payables' | 'financial_consolidated' | 'financial_due_brackets' | 'financial_defaulters';
  startDate: string;
  endDate: string;
  searchTerm: string;
  statusFilter: string;
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  db,
  subType,
  startDate,
  endDate,
  searchTerm,
  statusFilter = 'all',
}) => {
  const receivables = db.accountsReceivable || [];
  const payables = db.accountsPayable || [];
  const clients = db.clients || [];
  const suppliers = db.suppliers || [];

  const todayStr = new Date().toISOString().substring(0, 10);
  const now = new Date().getTime();

  // Helper maps
  const clientMap = useMemo(() => {
    const map = new Map<string, any>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, any>();
    suppliers.forEach(s => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // --- REPORT 1: Accounts Receivable ---
  const filteredReceivables = useMemo(() => {
    return receivables
      .filter(r => {
        const dueDate = (r.dueDate || '').substring(0, 10);
        if (startDate && dueDate < startDate) return false;
        if (endDate && dueDate > endDate) return false;

        const isOverdue = r.status === 'pending' && dueDate < todayStr;
        const currentEffectiveStatus = isOverdue ? 'overdue' : r.status;

        if (statusFilter !== 'all') {
          if (statusFilter === 'overdue' && !isOverdue) return false;
          if (statusFilter === 'pending' && (isOverdue || r.status !== 'pending')) return false;
          if (statusFilter === 'paid' && r.status !== 'paid') return false;
        }

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const client = clientMap.get(r.clientId);
          const cName = client?.name || r.clientName || '';
          const doc = r.code || r.id;
          if (!cName.toLowerCase().includes(term) && !doc.toLowerCase().includes(term) && !(r.title || '')?.toLowerCase().includes(term)) {
            return false;
          }
        }
        return true;
      })
      .map(r => {
        const dueDate = (r.dueDate || '').substring(0, 10);
        const isOverdue = r.status === 'pending' && dueDate < todayStr;
        const daysOverdue = isOverdue ? Math.max(0, Math.floor((now - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000))) : 0;
        const client = clientMap.get(r.clientId);

        return {
          ...r,
          clientName: client?.name || r.clientName || 'Cliente',
          clientPhone: client?.phone || '',
          isOverdue,
          daysOverdue,
          balance: (r.totalAmount || (r as any).amount || 0) - (r.paidAmount || 0)
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [receivables, clientMap, startDate, endDate, statusFilter, searchTerm, todayStr, now]);

  // --- REPORT 2: Accounts Payable ---
  const filteredPayables = useMemo(() => {
    return payables
      .filter(p => {
        const dueDate = (p.dueDate || '').substring(0, 10);
        if (startDate && dueDate < startDate) return false;
        if (endDate && dueDate > endDate) return false;

        const isOverdue = p.status === 'pending' && dueDate < todayStr;
        const currentEffectiveStatus = isOverdue ? 'overdue' : p.status;

        if (statusFilter !== 'all') {
          if (statusFilter === 'overdue' && !isOverdue) return false;
          if (statusFilter === 'pending' && (isOverdue || p.status !== 'pending')) return false;
          if (statusFilter === 'paid' && p.status !== 'paid') return false;
        }

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const sup = supplierMap.get(p.supplierId || '');
          const sName = sup?.name || p.supplierName || '';
          const doc = p.code || p.id;
          if (!sName.toLowerCase().includes(term) && !doc.toLowerCase().includes(term) && !p.description?.toLowerCase().includes(term)) {
            return false;
          }
        }
        return true;
      })
      .map(p => {
        const dueDate = (p.dueDate || '').substring(0, 10);
        const isOverdue = p.status === 'pending' && dueDate < todayStr;
        const daysOverdue = isOverdue ? Math.max(0, Math.floor((now - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000))) : 0;
        const sup = supplierMap.get(p.supplierId || '');

        return {
          ...p,
          supplierName: sup?.name || p.supplierName || 'Fornecedor',
          isOverdue,
          daysOverdue,
          balance: (p.totalAmount || (p as any).amount || 0) - (p.paidAmount || 0)
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [payables, supplierMap, startDate, endDate, statusFilter, searchTerm, todayStr, now]);

  // --- KPI COMPUTATIONS ---
  const totalReceivablesExpected = filteredReceivables.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalReceivablesReceived = filteredReceivables.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.paidAmount || r.totalAmount || 0), 0);
  const totalReceivablesOverdue = filteredReceivables.filter(r => r.isOverdue).reduce((sum, r) => sum + r.balance, 0);
  const totalReceivablesPending = filteredReceivables.filter(r => r.status === 'pending' && !r.isOverdue).reduce((sum, r) => sum + r.balance, 0);
  const defaultRatePercent = totalReceivablesExpected > 0 ? (totalReceivablesOverdue / totalReceivablesExpected) * 100 : 0;

  const totalPayablesExpected = filteredPayables.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalPayablesPaid = filteredPayables.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.paidAmount || p.totalAmount || 0), 0);
  const totalPayablesOverdue = filteredPayables.filter(p => p.isOverdue).reduce((sum, p) => sum + p.balance, 0);
  const totalPayablesPending = filteredPayables.filter(p => p.status === 'pending' && !p.isOverdue).reduce((sum, p) => sum + p.balance, 0);

  // Consolidated Net Projection
  const netProjectedBalance = (totalReceivablesReceived + totalReceivablesPending) - (totalPayablesPaid + totalPayablesPending);
  const isSuperavit = netProjectedBalance >= 0;

  // --- REPORT 4: Due Brackets (0-3d, 4-7d, 8-15d, 16-30d, >30d) ---
  const dueBracketsData = useMemo(() => {
    const brackets = [
      { label: 'Vencendo Hoje', minDays: 0, maxDays: 0, recTotal: 0, recCount: 0, payTotal: 0, payCount: 0 },
      { label: 'Próximos 3 Dias', minDays: 1, maxDays: 3, recTotal: 0, recCount: 0, payTotal: 0, payCount: 0 },
      { label: 'Próximos 7 Dias', minDays: 4, maxDays: 7, recTotal: 0, recCount: 0, payTotal: 0, payCount: 0 },
      { label: 'Próximos 15 Dias', minDays: 8, maxDays: 15, recTotal: 0, recCount: 0, payTotal: 0, payCount: 0 },
      { label: 'Próximos 30 Dias', minDays: 16, maxDays: 30, recTotal: 0, recCount: 0, payTotal: 0, payCount: 0 },
      { label: 'Acima de 30 Dias', minDays: 31, maxDays: 999, recTotal: 0, recCount: 0, payTotal: 0, payCount: 0 },
    ];

    receivables.filter(r => r.status === 'pending').forEach(r => {
      const dueDate = (r.dueDate || '').substring(0, 10);
      const diffDays = Math.ceil((new Date(dueDate).getTime() - new Date(todayStr).getTime()) / (24 * 60 * 60 * 1000));
      const amount = (r.totalAmount || 0) - (r.paidAmount || 0);

      const bracket = brackets.find(b => diffDays >= b.minDays && diffDays <= b.maxDays);
      if (bracket) {
        bracket.recTotal += amount;
        bracket.recCount += 1;
      }
    });

    payables.filter(p => p.status === 'pending').forEach(p => {
      const dueDate = (p.dueDate || '').substring(0, 10);
      const diffDays = Math.ceil((new Date(dueDate).getTime() - new Date(todayStr).getTime()) / (24 * 60 * 60 * 1000));
      const amount = (p.totalAmount || 0) - (p.paidAmount || 0);

      const bracket = brackets.find(b => diffDays >= b.minDays && diffDays <= b.maxDays);
      if (bracket) {
        bracket.payTotal += amount;
        bracket.payCount += 1;
      }
    });

    return brackets;
  }, [receivables, payables, todayStr]);

  // --- REPORT 5: Defaulters (Inadimplência & Devedores) ---
  const defaultersData = useMemo(() => {
    const clientsDefaultersMap: { [id: string]: any } = {};

    filteredReceivables
      .filter(r => r.isOverdue)
      .forEach(r => {
        const client = clientMap.get(r.clientId) || { name: r.clientName, phone: '' };
        if (!clientsDefaultersMap[r.clientId]) {
          clientsDefaultersMap[r.clientId] = {
            clientId: r.clientId,
            name: client.name || r.clientName,
            phone: client.phone || r.clientPhone || '(11) 98888-0000',
            cpfCnpj: client.cpfCnpj || '000.000.000-00',
            overdueTitlesCount: 0,
            totalOverdueAmount: 0,
            maxDaysOverdue: 0,
            oldestDueDate: r.dueDate
          };
        }

        clientsDefaultersMap[r.clientId].overdueTitlesCount += 1;
        clientsDefaultersMap[r.clientId].totalOverdueAmount += r.balance;
        if (r.daysOverdue > clientsDefaultersMap[r.clientId].maxDaysOverdue) {
          clientsDefaultersMap[r.clientId].maxDaysOverdue = r.daysOverdue;
          clientsDefaultersMap[r.clientId].oldestDueDate = r.dueDate;
        }
      });

    return Object.values(clientsDefaultersMap).sort((a, b) => b.totalOverdueAmount - a.totalOverdueAmount);
  }, [filteredReceivables, clientMap]);

  // CSV Export Handler
  const handleExportCsv = () => {
    if (subType === 'financial_receivables') {
      const headers = ['Cliente', 'Documento', 'Vencimento', 'Emissão', 'Valor Total (R$)', 'Valor Recebido (R$)', 'Saldo em Aberto (R$)', 'Status', 'Dias de Atraso'];
      const rows = filteredReceivables.map(r => [
        r.clientName,
        r.code || r.id,
        r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '',
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : '',
        (r.totalAmount || 0).toFixed(2),
        (r.paidAmount || 0).toFixed(2),
        r.balance.toFixed(2),
        r.isOverdue ? 'Vencido' : r.status === 'paid' ? 'Pago' : 'A Vencer',
        r.daysOverdue
      ]);
      exportToCsv('Relatorio_Contas_a_Receber', headers, rows);
    } else if (subType === 'financial_payables') {
      const headers = ['Fornecedor', 'Documento', 'Vencimento', 'Emissão', 'Valor Total (R$)', 'Valor Pago (R$)', 'Saldo a Pagar (R$)', 'Status', 'Dias de Atraso'];
      const rows = filteredPayables.map(p => [
        p.supplierName,
        p.code || p.id,
        p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '',
        p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '',
        (p.totalAmount || 0).toFixed(2),
        (p.paidAmount || 0).toFixed(2),
        p.balance.toFixed(2),
        p.isOverdue ? 'Vencido' : p.status === 'paid' ? 'Pago' : 'A Vencer',
        p.daysOverdue
      ]);
      exportToCsv('Relatorio_Contas_a_Pagar', headers, rows);
    } else if (subType === 'financial_consolidated') {
      const headers = ['Métrica', 'Total a Receber (R$)', 'Total a Pagar (R$)', 'Saldo Líquido Projetado (R$)'];
      const rows = [
        ['Realizado (Liquidado)', totalReceivablesReceived.toFixed(2), totalPayablesPaid.toFixed(2), (totalReceivablesReceived - totalPayablesPaid).toFixed(2)],
        ['Pendente (A Vencer)', totalReceivablesPending.toFixed(2), totalPayablesPending.toFixed(2), (totalReceivablesPending - totalPayablesPending).toFixed(2)],
        ['Vencido (Atrasado)', totalReceivablesOverdue.toFixed(2), totalPayablesOverdue.toFixed(2), (totalReceivablesOverdue - totalPayablesOverdue).toFixed(2)],
        ['Consolidado Geral', totalReceivablesExpected.toFixed(2), totalPayablesExpected.toFixed(2), (totalReceivablesExpected - totalPayablesExpected).toFixed(2)],
      ];
      exportToCsv('Relatorio_Compromissos_Consolidados', headers, rows);
    } else if (subType === 'financial_defaulters') {
      const headers = ['Cliente Devedor', 'CPF/CNPJ', 'Telefone', 'Qtd Títulos Vencidos', 'Montante Total em Aberto (R$)', 'Maior Atraso (Dias)', 'Vencimento Mais Antigo'];
      const rows = defaultersData.map(d => [
        d.name,
        d.cpfCnpj,
        d.phone,
        d.overdueTitlesCount,
        d.totalOverdueAmount.toFixed(2),
        d.maxDaysOverdue,
        d.oldestDueDate ? new Date(d.oldestDueDate).toLocaleDateString('pt-BR') : ''
      ]);
      exportToCsv('Relatorio_Inadimplencia_Devedores', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between no-print">
        <span className="text-xs text-slate-500 font-medium">
          {subType === 'financial_receivables' && `${filteredReceivables.length} títulos a receber localizados`}
          {subType === 'financial_payables' && `${filteredPayables.length} títulos a pagar localizados`}
          {subType === 'financial_consolidated' && 'Visão consolidada de entradas, saídas e projeção de caixa'}
          {subType === 'financial_due_brackets' && 'Distribuição cronológica de vencimentos por janela'}
          {subType === 'financial_defaulters' && `${defaultersData.length} clientes com pendências vencidas`}
        </span>
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Exportar CSV / Excel
        </button>
      </div>

      {/* ================= VIEW 1: RECEIVABLES ================= */}
      {subType === 'financial_receivables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Recebido</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block font-mono">
                R$ {totalReceivablesReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">Títulos liquidados no caixa</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">A Vencer (Dentro do Prazo)</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block font-mono">
                R$ {totalReceivablesPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-indigo-700 mt-1 block">Recebimentos futuros previstos</span>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">Vencido (Em Atraso)</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">
                R$ {totalReceivablesOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-rose-600 mt-1 block font-semibold">
                Inadimplência: {defaultRatePercent.toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Geral Faturado</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                R$ {totalReceivablesExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">{filteredReceivables.length} títulos emitidos</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Documento</th>
                    <th className="p-3.5">Vencimento</th>
                    <th className="p-3.5 text-right">Valor Original</th>
                    <th className="p-3.5 text-right">Valor Recebido</th>
                    <th className="p-3.5 text-right font-bold text-slate-900">Saldo em Aberto</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredReceivables.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-800">
                        {row.clientName}
                        {row.clientPhone && <span className="block text-[10px] text-slate-400 font-normal">{row.clientPhone}</span>}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{row.code || row.id}</td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        R$ {(row.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-700">
                        R$ {(row.paidAmount || (row.status === 'paid' ? row.totalAmount : 0)).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        R$ {row.balance.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center">
                        {row.isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Vencido ({row.daysOverdue}d)
                          </span>
                        ) : row.status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Recebido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            A Vencer
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: PAYABLES ================= */}
      {subType === 'financial_payables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-100 border border-slate-200 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">Total Já Pago</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                R$ {totalPayablesPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Títulos quitados com fornecedores</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">A Vencer (Dentro do Prazo)</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block font-mono">
                R$ {totalPayablesPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-indigo-700 mt-1 block">Obrigações futuras provisionadas</span>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">Vencido (Atrasado)</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">
                R$ {totalPayablesOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-rose-600 mt-1 block font-medium">Requer liquidação urgente</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Geral de Despesas</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                R$ {totalPayablesExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">{filteredPayables.length} títulos lançados</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Fornecedor / Favorecido</th>
                    <th className="p-3.5">Documento</th>
                    <th className="p-3.5">Vencimento</th>
                    <th className="p-3.5 text-right">Valor Original</th>
                    <th className="p-3.5 text-right">Valor Pago</th>
                    <th className="p-3.5 text-right font-bold text-slate-900">Saldo a Pagar</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPayables.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-800">{row.supplierName}</td>
                      <td className="p-3.5 font-mono text-slate-500">{row.code || row.id}</td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        R$ {(row.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        R$ {(row.paidAmount || (row.status === 'paid' ? row.totalAmount : 0)).toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        R$ {row.balance.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center">
                        {row.isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Vencido ({row.daysOverdue}d)
                          </span>
                        ) : row.status === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Pago
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            A Pagar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: CONSOLIDATED ================= */}
      {subType === 'financial_consolidated' && (
        <div className="space-y-6">
          {/* Main Balance Banner */}
          <div className={`p-6 rounded-2xl border ${
            isSuperavit 
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
              : 'bg-rose-50/90 border-rose-200 text-rose-950'
          } flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-2xl ${isSuperavit ? 'bg-emerald-200/60 text-emerald-800' : 'bg-rose-200/60 text-rose-800'}`}>
                {isSuperavit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                  Projeção Líquida de Caixa no Período
                </span>
                <p className="text-3xl font-black font-mono">
                  R$ {netProjectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold mt-0.5">
                  Status da Empresa: <span className="underline">{isSuperavit ? 'SUPERAVITÁRIO (Saldo Positivo)' : 'DEFICITÁRIO (Atenção ao Capital de Giro)'}</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-white/70 rounded-xl border border-black/5">
                <span className="text-[10px] text-slate-500 block">Total a Receber:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  + R$ {totalReceivablesExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 bg-white/70 rounded-xl border border-black/5">
                <span className="text-[10px] text-slate-500 block">Total a Pagar:</span>
                <span className="font-bold text-rose-700 text-sm">
                  - R$ {totalPayablesExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Side by side comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bloco Contas a Receber */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> Entradas / Contas a Receber
                </h3>
                <span className="font-mono font-bold text-emerald-700">
                  R$ {totalReceivablesExpected.toFixed(2)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-600">Já Recebido em Caixa:</span>
                  <span className="font-mono font-bold text-emerald-700">R$ {totalReceivablesReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-600">A Vencer (Dentro do Prazo):</span>
                  <span className="font-mono font-bold text-indigo-700">R$ {totalReceivablesPending.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Vencido (Inadimplência):</span>
                  <span className="font-mono font-bold text-rose-600">R$ {totalReceivablesOverdue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bloco Contas a Pagar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider text-rose-800 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" /> Saídas / Contas a Pagar
                </h3>
                <span className="font-mono font-bold text-rose-700">
                  R$ {totalPayablesExpected.toFixed(2)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-600">Já Liquidado / Pago:</span>
                  <span className="font-mono font-bold text-slate-800">R$ {totalPayablesPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-600">A Pagar (Dentro do Prazo):</span>
                  <span className="font-mono font-bold text-amber-700">R$ {totalPayablesPending.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Contas em Atraso (Vencidas):</span>
                  <span className="font-mono font-bold text-rose-600">R$ {totalPayablesOverdue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: DUE BRACKETS ================= */}
      {subType === 'financial_due_brackets' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" /> Títulos a Vencer por Janela de Tempo (Aging Cronológico)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Faixa de Vencimento</th>
                    <th className="p-3.5 text-center">Títulos a Receber</th>
                    <th className="p-3.5 text-right font-bold text-emerald-800">Valor a Receber (R$)</th>
                    <th className="p-3.5 text-center">Títulos a Pagar</th>
                    <th className="p-3.5 text-right font-bold text-rose-800">Valor a Pagar (R$)</th>
                    <th className="p-3.5 text-right font-black text-slate-900">Saldo Líquido Previsto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dueBracketsData.map((bracket, idx) => {
                    const net = bracket.recTotal - bracket.payTotal;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">{bracket.label}</td>
                        <td className="p-3.5 text-center font-mono text-emerald-700">{bracket.recCount}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                          R$ {bracket.recTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-center font-mono text-rose-700">{bracket.payCount}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                          R$ {bracket.payTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`p-3.5 text-right font-mono font-black ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          R$ {net.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 5: DEFAULTERS ================= */}
      {subType === 'financial_defaulters' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Relatório de Inadimplência & Cobrança</h3>
                <p className="text-xs text-rose-700">
                  Clientes com títulos em aberto com vencimento ultrapassado. Priorize contatos de cobrança pelos maiores montantes.
                </p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">Montante Total Inadimplente</span>
              <span className="text-2xl font-black text-rose-950">
                R$ {defaultersData.reduce((sum, d) => sum + d.totalOverdueAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">CPF / CNPJ</th>
                    <th className="p-3.5">Contato / WhatsApp</th>
                    <th className="p-3.5 text-center">Títulos Vencidos</th>
                    <th className="p-3.5 text-right font-bold text-rose-700">Montante em Aberto</th>
                    <th className="p-3.5 text-center font-bold text-rose-700">Maior Atraso</th>
                    <th className="p-3.5 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {defaultersData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                        Nenhum cliente inadimplente no momento! Todos os recebíveis estão em dia.
                      </td>
                    </tr>
                  ) : (
                    defaultersData.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">{d.name}</td>
                        <td className="p-3.5 font-mono text-slate-500 text-[11px]">{d.cpfCnpj}</td>
                        <td className="p-3.5 font-mono text-slate-700">{d.phone}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-600">{d.overdueTitlesCount}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                          R$ {d.totalOverdueAmount.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center font-mono font-black text-rose-600">
                          {d.maxDaysOverdue} dias
                        </td>
                        <td className="p-3.5 text-center">
                          <a
                            href={`https://wa.me/55${d.phone.replace(/\D/g, '')}?text=Olá ${encodeURIComponent(d.name)}, notamos uma pendência financeira no valor de R$ ${d.totalOverdueAmount.toFixed(2)}. Como podemos ajudar a regularizar?`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Cobrar WhatsApp
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
