/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — RELATÓRIOS ESTATÍSTICOS & MATRIZ ANALÍTICA DE REPRESENTAÇÃO COMERCIAL
 * Pedido × Faturamento × NF × Comissão × Recebimento
 */

import React, { useState } from 'react';
import {
  RepresentativeOrder,
  RepresentativeCommission,
  RepresentedCompany,
  ReconciliationResultItem,
  AppDatabase,
  User,
} from '../../types';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  Building2,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

interface RepresentativeReportsTabProps {
  orders: RepresentativeOrder[];
  commissions: RepresentativeCommission[];
  representedCompanies: RepresentedCompany[];
  reconciliationItems: ReconciliationResultItem[];
  user: User;
  db: AppDatabase;
}

export const RepresentativeReportsTab: React.FC<RepresentativeReportsTabProps> = ({
  orders,
  commissions,
  representedCompanies,
  reconciliationItems,
  user,
  db,
}) => {
  const [selectedRepresentedId, setSelectedRepresentedId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredOrders = orders.filter(o => {
    if (selectedRepresentedId !== 'all' && o.representedId !== selectedRepresentedId) return false;
    if (startDate && o.orderDate < startDate) return false;
    if (endDate && o.orderDate > endDate) return false;
    return true;
  });

  // Métricas
  const totalVolumeOrders = filteredOrders.reduce((sum, o) => sum + o.totalOrderAmount, 0);
  const totalVolumeCommissions = filteredOrders.reduce((sum, o) => sum + o.estimatedTotalCommission, 0);

  const handleExportCsv = () => {
    const headers = [
      'Pedido_MotorDesk',
      'Data_Pedido',
      'Empresa_Representada',
      'Cliente',
      'CNPJ_CPF',
      'Valor_Pedido',
      'Pedidos_Fabrica',
      'Notas_Fiscais',
      'Valor_Faturado',
      'Diferenca',
      'Perc_Comissao',
      'Comissao_R$',
      'Status_Conciliacao',
    ];

    const rows = reconciliationItems.map(item => [
      item.representativeOrderNumber || '',
      item.orderAmount.toString(),
      item.clientName || '',
      item.clientCnpjCpf || '',
      item.orderAmount.toString(),
      item.factoryOrders.map(fo => fo.factoryOrderNumber).join(' / '),
      item.invoices.map(inv => inv.invoiceNumber).join(' / '),
      item.totalInvoicedAmount.toString(),
      item.difference.toString(),
      item.commissionPercentage.toString(),
      item.confirmedCommission.toString(),
      item.status,
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_representacao_motordesk_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Matriz Analítica de Pedidos × Faturamento × Comissões
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rastreamento de ponta a ponta: do pedido inicial do cliente ao faturamento da representada e recebimento.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Representada:</label>
          <select
            value={selectedRepresentedId}
            onChange={(e) => setSelectedRepresentedId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
          >
            <option value="all">Todas as Representadas</option>
            {representedCompanies.map(r => (
              <option key={r.id} value={r.id}>{r.tradeName || r.corporateName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Data Início:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Data Fim:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
          />
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Volume Total Negociado</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            R$ {totalVolumeOrders.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400">{filteredOrders.length} pedidos</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase">Comissões Projetadas</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            R$ {totalVolumeCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-emerald-600 font-medium">Margem média calculada</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-indigo-600 uppercase">Itens Conciliados</span>
          <div className="text-xl font-black text-indigo-700 mt-1">
            {reconciliationItems.filter(r => r.status === 'CONCILIADO').length}
          </div>
          <span className="text-xs text-indigo-600 font-medium">Faturamento 100% conferido</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-amber-600 uppercase">Faturamento Parcial</span>
          <div className="text-xl font-black text-amber-700 mt-1">
            {reconciliationItems.filter(r => r.status === 'PARCIAL').length}
          </div>
          <span className="text-xs text-amber-600 font-medium">Com saldo pendente na fábrica</span>
        </div>
      </div>

      {/* Matriz Completa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-xs uppercase text-slate-700 bg-slate-50">
          Detalhamento Linha a Linha (Rastreabilidade Ponta a Ponta)
        </div>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Pedido MotorDesk</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5 text-right">Valor Negociado</th>
                <th className="px-4 py-2.5">Pedidos da Fábrica</th>
                <th className="px-4 py-2.5">Notas Fiscais (NF-e)</th>
                <th className="px-4 py-2.5 text-right">Total Faturado</th>
                <th className="px-4 py-2.5 text-right">Saldo</th>
                <th className="px-4 py-2.5 text-right">Comissão R$</th>
                <th className="px-4 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {reconciliationItems.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-indigo-700">{it.representativeOrderNumber || 'SEM PEDIDO'}</td>
                  <td className="px-4 py-2.5 font-sans font-medium text-slate-800">{it.clientName}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                    R$ {it.orderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    {it.factoryOrders.map(f => `#${f.factoryOrderNumber}`).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    {it.invoices.map(inv => `NF ${inv.invoiceNumber}`).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-slate-900">
                    R$ {it.totalInvoicedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-bold ${it.difference === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    R$ {it.difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                    R$ {it.confirmedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-center font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {it.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
