/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, Download, Filter, Calendar, BarChart2, TrendingUp, Clock, AlertTriangle, Search, Percent, Printer, Loader2 } from 'lucide-react';
import { AppDatabase } from '../data/mockData';
import { generatePdfFromElement } from '../utils/pdfGenerator';

interface ReportsViewProps {
  db: AppDatabase;
}

export default function ReportsView({ db }: ReportsViewProps) {
  const [reportType, setReportType] = useState<'billing' | 'popular_services' | 'mechanics' | 'budget_vs_effective'>('billing');
  
  // Custom period filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Compute Client names and vehicles helper
  const getClientName = (id: string) => db.clients.find(c => c.id === id)?.name || 'Cliente';
  const getVehiclePlate = (id: string) => db.vehicles.find(v => v.id === id)?.plate || 'S/P';

  // REPORT 1: billing list (only completed and paid)
  const billingLogs = db.serviceOrders
    .filter(os => os.paymentStatus === 'paid')
    .map(os => {
      const osTotal = os.items.reduce((sum, item) => sum + item.totalPrice, 0);
      return {
        id: os.id,
        client: getClientName(os.clientId),
        plate: getVehiclePlate(os.vehicleId),
        date: os.completedAt || os.createdAt,
        total: osTotal,
        method: osIdToPaymentMethod(os.id)
      };
    });

  function osIdToPaymentMethod(osId: string) {
    if (osId === 'os-1') return 'PIX';
    return 'Cartão de Crédito';
  }

  const grandBillingTotal = billingLogs.reduce((sum, b) => sum + b.total, 0);

  // REPORT 2: popular services/parts ranking
  const itemPopularity: { [name: string]: { name: string; type: string; qty: number; revenue: number } } = {};
  
  // Feed approved items from budgets and service orders
  db.serviceOrders.forEach(os => {
    os.items.forEach(item => {
      if (item.status === 'completed' || item.status === 'executing') {
        if (!itemPopularity[item.name]) {
          itemPopularity[item.name] = { name: item.name, type: item.type, qty: 0, revenue: 0 };
        }
        itemPopularity[item.name].qty += item.quantity;
        itemPopularity[item.name].revenue += item.totalPrice;
      }
    });
  });

  const popularItems = Object.values(itemPopularity).sort((a, b) => b.qty - a.qty);

  // REPORT 3: mechanics productivity
  const mechanicStats: { [id: string]: { name: string; pending: number; executing: number; completed: number; revenue: number } } = {};
  
  // Initialize
  db.users.filter(u => u.role === 'mecanico' || u.role === 'admin').forEach(u => {
    mechanicStats[u.id] = { name: u.name, pending: 0, executing: 0, completed: 0, revenue: 0 };
  });

  db.serviceOrders.forEach(os => {
    const mechId = os.mechanicId || 'usr-3';
    if (!mechanicStats[mechId]) {
      mechanicStats[mechId] = { name: 'Mecânico Terc.', pending: 0, executing: 0, completed: 0, revenue: 0 };
    }
    
    if (os.status === 'pending') mechanicStats[mechId].pending += 1;
    else if (os.status === 'executing') mechanicStats[mechId].executing += 1;
    else if (os.status === 'completed') {
      mechanicStats[mechId].completed += 1;
      const osTotal = os.items.reduce((sum, item) => sum + item.totalPrice, 0);
      mechanicStats[mechId].revenue += osTotal;
    }
  });

  const mechanicsRanking = Object.values(mechanicStats);

  // REPORT 4: Budget vs Effective calculations (Orçado vs Efetivado por Cliente e por Período)
  const getBudgetVsEffectiveData = () => {
    const clientsMap: {
      [clientId: string]: {
        clientName: string;
        budgetCount: number;
        totalBudgeted: number;
        totalEffective: number;
        totalPostponed: number;
        totalRejected: number;
      };
    } = {};

    // Initialize map with clients that have budgets
    db.clients.forEach(c => {
      clientsMap[c.id] = {
        clientName: c.name,
        budgetCount: 0,
        totalBudgeted: 0,
        totalEffective: 0,
        totalPostponed: 0,
        totalRejected: 0,
      };
    });

    // Process budgets
    db.budgets.forEach(b => {
      const bDate = b.createdAt.substring(0, 10);
      // Filter by period
      if (startDate && bDate < startDate) return;
      if (endDate && bDate > endDate) return;

      const clientEntry = clientsMap[b.clientId] || {
        clientName: getClientName(b.clientId),
        budgetCount: 0,
        totalBudgeted: 0,
        totalEffective: 0,
        totalPostponed: 0,
        totalRejected: 0,
      };

      clientEntry.budgetCount += 1;

      b.items.forEach(item => {
        // Total budgeted is everything proposed originally
        clientEntry.totalBudgeted += item.totalPrice;

        if (item.status === 'approved') {
          clientEntry.totalEffective += item.totalPrice;
        } else if (item.status === 'postponed') {
          clientEntry.totalPostponed += item.totalPrice;
        } else if (item.status === 'rejected') {
          clientEntry.totalRejected += item.totalPrice;
        } else {
          // 'pending' item counts as budgeted but not yet effective
        }
      });

      clientsMap[b.clientId] = clientEntry;
    });

    // Convert to list and filter
    return Object.entries(clientsMap)
      .map(([id, data]) => ({
        clientId: id,
        ...data,
        conversionRate: data.totalBudgeted > 0 ? (data.totalEffective / data.totalBudgeted) * 100 : 0
      }))
      .filter(row => {
        if (clientSearch && !row.clientName.toLowerCase().includes(clientSearch.toLowerCase())) {
          return false;
        }
        return row.budgetCount > 0;
      });
  };

  const budgetVsEffectiveRows = getBudgetVsEffectiveData();
  const totalPeriodBudgeted = budgetVsEffectiveRows.reduce((sum, r) => sum + r.totalBudgeted, 0);
  const totalPeriodEffective = budgetVsEffectiveRows.reduce((sum, r) => sum + r.totalEffective, 0);
  const totalPeriodPostponed = budgetVsEffectiveRows.reduce((sum, r) => sum + r.totalPostponed, 0);
  const averagePeriodConversion = totalPeriodBudgeted > 0 ? (totalPeriodEffective / totalPeriodBudgeted) * 100 : 0;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrintReportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromElement('reports-view-container', `Relatorio_${reportType}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="reports-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Relatórios Operacionais</h1>
          <p className="text-sm text-slate-500">Geração simplificada de relatórios analíticos para faturamento e produtividade (RF015).</p>
        </div>
        <button
          id="btn-export-reports-pdf"
          type="button"
          onClick={handlePrintReportPdf}
          disabled={isGeneratingPdf}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-2 cursor-pointer shadow-xs shrink-0 no-print"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Gerando PDF...</span>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 text-indigo-200" />
              <span>Gerar PDF do Relatório</span>
            </>
          )}
        </button>
      </div>

      {/* Selector */}
      <div className="flex border-b border-slate-150 gap-4 overflow-x-auto pb-0.5" id="report-type-selector">
        <button 
          id="btn-rep-billing"
          onClick={() => setReportType('billing')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            reportType === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Relatório de Faturamento
        </button>
        <button 
          id="btn-rep-popular"
          onClick={() => setReportType('popular_services')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            reportType === 'popular_services' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Serviços/Peças Populares
        </button>
        <button 
          id="btn-rep-mechanics"
          onClick={() => setReportType('mechanics')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            reportType === 'mechanics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Produtividade por Mecânico
        </button>
        <button 
          id="btn-rep-budget-vs-effective"
          onClick={() => setReportType('budget_vs_effective')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            reportType === 'budget_vs_effective' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Orçado vs. Efetivado (Conversão)
        </button>
      </div>

      {/* REPORT 1: BILLING LIST */}
      {reportType === 'billing' && (
        <div className="space-y-4" id="rep-billing-panel">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block">Total Recebido Confirmado</span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                R$ {grandBillingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 mt-1 block font-medium">Lançamentos quitados no caixa</span>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Quantidade de Recebimentos</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">{billingLogs.length} transações</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Apenas ordens de serviço concluídas</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-slate-400" /> Detalhamento de Faturamento Realizado
              </h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4">Cód OS</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Placa</th>
                  <th className="p-4">Data Liberação</th>
                  <th className="p-4">Meio de Pagto (RF012)</th>
                  <th className="p-4 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {billingLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum faturamento confirmado no caixa.</td>
                  </tr>
                ) : (
                  billingLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/20">
                      <td className="p-4 font-mono font-bold">OS-{log.id}</td>
                      <td className="p-4 font-semibold text-slate-800">{log.client}</td>
                      <td className="p-4 font-mono font-bold uppercase text-slate-600">{log.plate}</td>
                      <td className="p-4 text-slate-500">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono text-[10px]">
                          {log.method}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 text-right">R$ {log.total.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: POPULAR ITEMS RANKING */}
      {reportType === 'popular_services' && (
        <div className="space-y-4" id="rep-popular-panel">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ranking de Demandas (Peças & Mão de Obra)</h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4">Posição</th>
                  <th className="p-4">Item (Peça/Serviço)</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4 text-center">Quantidade de Saídas</th>
                  <th className="p-4 text-right">Receita Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {popularItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum item faturado no momento.</td>
                  </tr>
                ) : (
                  popularItems.map((item, idx) => (
                    <tr key={item.name} className="hover:bg-slate-50/20">
                      <td className="p-4 font-bold text-slate-400"># {idx + 1}</td>
                      <td className="p-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          item.type === 'part' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {item.type === 'part' ? 'PEÇA' : 'MÃO DE OBRA'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold">{item.qty} un</td>
                      <td className="p-4 font-bold text-slate-900 text-right">R$ {item.revenue.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: MECHANICS PRODUCTIVITY */}
      {reportType === 'mechanics' && (
        <div className="space-y-4" id="rep-mechanics-panel">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Atividade Técnica por Mecânico</h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4">Mecânico</th>
                  <th className="p-4 text-center">OS Pendentes</th>
                  <th className="p-4 text-center">OS em Execução</th>
                  <th className="p-4 text-center">OS Concluídas</th>
                  <th className="p-4 text-right">Mão de Obra Entregue (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {mechanicsRanking.map(stat => (
                  <tr key={stat.name} className="hover:bg-slate-50/20">
                    <td className="p-4 font-semibold text-slate-800">{stat.name}</td>
                    <td className="p-4 text-center text-amber-600 font-bold">{stat.pending}</td>
                    <td className="p-4 text-center text-indigo-600 font-bold">{stat.executing}</td>
                    <td className="p-4 text-center text-emerald-600 font-bold">{stat.completed}</td>
                    <td className="p-4 font-bold text-slate-900 text-right">R$ {stat.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 4: BUDGET VS EFFECTIVE (ORÇADO VS EFETIVADO POR CLIENTE E PERÍODO) */}
      {reportType === 'budget_vs_effective' && (
        <div className="space-y-4 text-xs" id="rep-budget-vs-effective-panel">
          {/* Filters Panel */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              {/* Date Start */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5" htmlFor="rep-start-date">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Data Inicial
                </label>
                <input 
                  id="rep-start-date"
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Date End */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5" htmlFor="rep-end-date">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Data Final
                </label>
                <input 
                  id="rep-end-date"
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Client Search */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5" htmlFor="rep-client-search">
                  <Search className="w-3.5 h-3.5 text-slate-400" /> Buscar Cliente
                </label>
                <input 
                  id="rep-client-search"
                  type="text" 
                  placeholder="Nome do cliente..." 
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <button
              id="btn-clear-rep-filters"
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); setClientSearch(''); }}
              className="bg-white hover:bg-slate-100 text-slate-600 font-semibold text-xs px-4 py-2 border border-slate-200 rounded-lg transition shrink-0"
            >
              Limpar Filtros
            </button>
          </div>

          {/* Performance KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Budgeted */}
            <div className="bg-indigo-50/50 border border-indigo-100 p-4.5 rounded-xl space-y-1">
              <span className="text-[9px] font-bold uppercase text-indigo-600 block tracking-wider">Total Orçado</span>
              <span className="text-xl font-black text-indigo-900 block font-mono">
                R$ {totalPeriodBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-indigo-500 block">Propostas comerciais geradas no período</span>
            </div>

            {/* Total Effective */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-4.5 rounded-xl space-y-1">
              <span className="text-[9px] font-bold uppercase text-emerald-600 block tracking-wider">Total Efetivado (OS)</span>
              <span className="text-xl font-black text-emerald-900 block font-mono">
                R$ {totalPeriodEffective.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 block">Itens convertidos em execução mecânica</span>
            </div>

            {/* Total Postponed */}
            <div className="bg-amber-50/50 border border-amber-100 p-4.5 rounded-xl space-y-1">
              <span className="text-[9px] font-bold uppercase text-amber-600 block tracking-wider">Total Adiado (Fazer Depois)</span>
              <span className="text-xl font-black text-amber-900 block font-mono">
                R$ {totalPeriodPostponed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-amber-600 block">Oportunidades salvas para futuros contatos</span>
            </div>

            {/* Conversion Rate */}
            <div className="bg-blue-50/50 border border-blue-100 p-4.5 rounded-xl space-y-1">
              <span className="text-[9px] font-bold uppercase text-blue-600 block tracking-wider">Taxa de Conversão</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-blue-900 block font-mono">
                  {averagePeriodConversion.toFixed(1)}%
                </span>
                <TrendingUp className="w-4 h-4 text-blue-600 inline self-center" />
              </div>
              <span className="text-[10px] text-blue-500 block">Percentual de aprovação comercial</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-150 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-500" /> Conversão Detalhada por Cliente e Período
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Mostrando {budgetVsEffectiveRows.length} clientes com atividade</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/50 font-bold text-slate-400">
                  <th className="p-4 text-xs font-bold text-slate-600">Cliente</th>
                  <th className="p-4 text-center">Qtd Orç.</th>
                  <th className="p-4 text-right">Valor Orçado</th>
                  <th className="p-4 text-right">Valor Efetivado (OS)</th>
                  <th className="p-4 text-right">Valor Adiado (Futuro)</th>
                  <th className="p-4 text-right">Valor Recusado</th>
                  <th className="p-4 text-right" style={{ width: '180px' }}>Taxa de Conversão (Aprovação)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {budgetVsEffectiveRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhum orçamento pendente ou aprovado foi encontrado no período selecionado.
                    </td>
                  </tr>
                ) : (
                  budgetVsEffectiveRows.map(row => (
                    <tr key={row.clientId} className="hover:bg-slate-50/20 text-xs">
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 text-sm">{row.clientName}</p>
                        <p className="text-[10px] text-slate-400">ID: {row.clientId}</p>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-750">{row.budgetCount}</td>
                      <td className="p-4 text-right font-mono font-medium text-slate-600">
                        R$ {row.totalBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-600">
                        R$ {row.totalEffective.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-amber-600">
                        R$ {row.totalPostponed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-400">
                        R$ {row.totalRejected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full ${
                                row.conversionRate >= 70 ? 'bg-emerald-500' :
                                row.conversionRate >= 40 ? 'bg-amber-400' : 'bg-indigo-500'
                              }`} 
                              style={{ width: `${Math.min(100, row.conversionRate)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-right w-11">{row.conversionRate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
