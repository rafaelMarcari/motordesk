/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, Download, Filter, Calendar, BarChart2, TrendingUp, Clock, 
  AlertTriangle, Search, Percent, Printer, Loader2, ShoppingBag, Wrench, 
  CreditCard, DollarSign, UserCheck, Package, Layers
} from 'lucide-react';
import { AppDatabase } from '../data/mockData';
import { BusinessType } from '../types';
import { generatePdfFromElement } from '../utils/pdfGenerator';
import { isCommerceBusiness, isWorkshopBusiness, isHybridBusiness } from '../utils/businessSegmentation';

interface ReportsViewProps {
  db: AppDatabase;
  businessType?: BusinessType;
}

export default function ReportsView({ db, businessType = 'OFICINA' }: ReportsViewProps) {
  const isCommerce = businessType === 'COMERCIO';
  const isWorkshop = businessType === 'OFICINA';
  const isDual = businessType === 'OFICINA_COMERCIO';

  const defaultReportType = isCommerce ? 'commerce_billing' : 'billing';
  const [reportType, setReportType] = useState<string>(defaultReportType);
  
  // Custom period filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Compute Client names and vehicles helper
  const getClientName = (id: string) => db.clients?.find(c => c.id === id)?.name || 'Cliente';
  const getVehiclePlate = (id: string) => db.vehicles?.find(v => v.id === id)?.plate || 'S/P';

  // --- WORKSHOP REPORTS COMPUTATION ---
  // REPORT: Workshop billing (only completed and paid OSs)
  const workshopBillingLogs = (db.serviceOrders || [])
    .filter(os => os.paymentStatus === 'paid')
    .map(os => {
      const osTotal = (os.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      return {
        id: os.id,
        client: getClientName(os.clientId),
        plate: getVehiclePlate(os.vehicleId),
        date: os.completedAt || os.createdAt,
        total: osTotal,
        method: os.id === 'os-1' ? 'PIX' : 'Cartão de Crédito'
      };
    });

  const grandWorkshopBillingTotal = workshopBillingLogs.reduce((sum, b) => sum + b.total, 0);

  // REPORT: Popular Workshop Items
  const workshopItemPopularity: { [name: string]: { name: string; type: string; qty: number; revenue: number } } = {};
  (db.serviceOrders || []).forEach(os => {
    (os.items || []).forEach(item => {
      if (item.status === 'completed' || item.status === 'executing') {
        if (!workshopItemPopularity[item.name]) {
          workshopItemPopularity[item.name] = { name: item.name, type: item.type, qty: 0, revenue: 0 };
        }
        workshopItemPopularity[item.name].qty += item.quantity || 1;
        workshopItemPopularity[item.name].revenue += item.totalPrice || 0;
      }
    });
  });
  const popularWorkshopItems = Object.values(workshopItemPopularity).sort((a, b) => b.qty - a.qty);

  // REPORT: Mechanics Productivity
  const mechanicStats: { [id: string]: { name: string; pending: number; executing: number; completed: number; revenue: number } } = {};
  (db.users || []).filter(u => u.role === 'mecanico' || u.role === 'admin').forEach(u => {
    mechanicStats[u.id] = { name: u.name, pending: 0, executing: 0, completed: 0, revenue: 0 };
  });

  (db.serviceOrders || []).forEach(os => {
    const mechId = os.mechanicId || 'usr-3';
    if (!mechanicStats[mechId]) {
      mechanicStats[mechId] = { name: 'Mecânico Terc.', pending: 0, executing: 0, completed: 0, revenue: 0 };
    }
    
    if (os.status === 'pending') mechanicStats[mechId].pending += 1;
    else if (os.status === 'executing') mechanicStats[mechId].executing += 1;
    else if (os.status === 'completed') {
      mechanicStats[mechId].completed += 1;
      const osTotal = (os.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      mechanicStats[mechId].revenue += osTotal;
    }
  });
  const mechanicsRanking = Object.values(mechanicStats);

  // REPORT: Budget vs Effective calculations
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

    (db.clients || []).forEach(c => {
      clientsMap[c.id] = {
        clientName: c.name,
        budgetCount: 0,
        totalBudgeted: 0,
        totalEffective: 0,
        totalPostponed: 0,
        totalRejected: 0,
      };
    });

    (db.budgets || []).forEach(b => {
      const bDate = (b.createdAt || '').substring(0, 10);
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

      (b.items || []).forEach(item => {
        clientEntry.totalBudgeted += item.totalPrice || 0;
        if (item.status === 'approved') {
          clientEntry.totalEffective += item.totalPrice || 0;
        } else if (item.status === 'postponed') {
          clientEntry.totalPostponed += item.totalPrice || 0;
        } else if (item.status === 'rejected') {
          clientEntry.totalRejected += item.totalPrice || 0;
        }
      });

      clientsMap[b.clientId] = clientEntry;
    });

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

  // --- COMMERCE / SALES REPORTS COMPUTATION ---
  const salesList = (db.sales || []).filter(s => s.paymentStatus !== 'canceled');
  const filteredSales = salesList.filter(s => {
    const sDate = (s.createdAt || '').substring(0, 10);
    if (startDate && sDate < startDate) return false;
    if (endDate && sDate > endDate) return false;
    if (clientSearch && s.clientName && !s.clientName.toLowerCase().includes(clientSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  const grandCommerceSalesTotal = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const averageTicket = filteredSales.length > 0 ? grandCommerceSalesTotal / filteredSales.length : 0;

  // Ranking of top selling products in Commerce
  const productPopularityMap: { [code: string]: { code: string; name: string; qty: number; revenue: number } } = {};
  filteredSales.forEach(s => {
    (s.items || []).forEach(item => {
      const key = item.partId || item.partName || item.partCode;
      if (!productPopularityMap[key]) {
        productPopularityMap[key] = { code: item.partCode || 'PROD', name: item.partName || 'Produto', qty: 0, revenue: 0 };
      }
      productPopularityMap[key].qty += item.quantity || 1;
      productPopularityMap[key].revenue += item.totalPrice || 0;
    });
  });
  const popularCommerceProducts = Object.values(productPopularityMap).sort((a, b) => b.revenue - a.revenue);

  // Sales by Operator / Seller
  const salesBySellerMap: { [sellerName: string]: { name: string; count: number; total: number } } = {};
  filteredSales.forEach(s => {
    const seller = s.createdBy || 'Atendente Balcão';
    if (!salesBySellerMap[seller]) {
      salesBySellerMap[seller] = { name: seller, count: 0, total: 0 };
    }
    salesBySellerMap[seller].count += 1;
    salesBySellerMap[seller].total += s.totalAmount || 0;
  });
  const salesBySeller = Object.values(salesBySellerMap).sort((a, b) => b.total - a.total);

  // Sales by Payment Method
  const paymentMethodMap: { [method: string]: { method: string; count: number; total: number } } = {};
  filteredSales.forEach(s => {
    const method = (s.paymentMethod || 'Dinheiro').toUpperCase();
    if (!paymentMethodMap[method]) {
      paymentMethodMap[method] = { method, count: 0, total: 0 };
    }
    paymentMethodMap[method].count += 1;
    paymentMethodMap[method].total += s.totalAmount || 0;
  });
  const salesByPaymentMethod = Object.values(paymentMethodMap).sort((a, b) => b.total - a.total);

  // Integrated Combined Total for Hybrid (Oficina + Comércio)
  const combinedRevenue = grandWorkshopBillingTotal + grandCommerceSalesTotal;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrintReportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromElement('reports-view-container', `Relatorio_${businessType}_${reportType}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="reports-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">
              Relatórios {isCommerce ? 'Comerciais & Vendas' : isWorkshop ? 'Operacionais da Oficina' : 'Integrados (Oficina & Comércio)'}
            </h1>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
              isCommerce ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              isWorkshop ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              Segmento: {businessType}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {isCommerce 
              ? 'Análise analítica de vendas de balcão (PDV), curva ABC de produtos, ticket médio e operadores.'
              : isWorkshop 
                ? 'Geração simplificada de relatórios de faturamento de ordens de serviço, produtividade técnica e conversão de orçamentos.'
                : 'Visão executiva integrada unificando faturamento de serviços automotivos e vendas de balcão.'}
          </p>
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

      {/* Segment-Aware Tab Selector */}
      <div className="flex border-b border-slate-150 gap-4 overflow-x-auto pb-0.5" id="report-type-selector">
        {/* COMMERCE SPECIFIC TABS */}
        {(isCommerce || isDual) && (
          <>
            <button 
              id="btn-rep-commerce-billing"
              onClick={() => setReportType('commerce_billing')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'commerce_billing' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Faturamento de Vendas (PDV)
            </button>
            <button 
              id="btn-rep-popular-products"
              onClick={() => setReportType('popular_products')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'popular_products' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Produtos Mais Vendidos (Curva ABC)
            </button>
            <button 
              id="btn-rep-sellers"
              onClick={() => setReportType('sellers')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'sellers' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Vendas por Operador / Vendedor
            </button>
          </>
        )}

        {/* WORKSHOP SPECIFIC TABS */}
        {(isWorkshop || isDual) && (
          <>
            <button 
              id="btn-rep-billing"
              onClick={() => setReportType('billing')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> Faturamento de OSs (Oficina)
            </button>
            <button 
              id="btn-rep-popular"
              onClick={() => setReportType('popular_services')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'popular_services' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Serviços & Peças Populares
            </button>
            <button 
              id="btn-rep-mechanics"
              onClick={() => setReportType('mechanics')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'mechanics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Produtividade por Mecânico
            </button>
            <button 
              id="btn-rep-budget-vs-effective"
              onClick={() => setReportType('budget_vs_effective')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'budget_vs_effective' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Percent className="w-3.5 h-3.5" /> Orçado vs. Efetivado (Conversão)
            </button>
          </>
        )}

        {/* DUAL COMBINED TAB */}
        {isDual && (
          <button 
            id="btn-rep-integrated-revenue"
            onClick={() => setReportType('integrated_revenue')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              reportType === 'integrated_revenue' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Receita Integrada (OS + Balcão)
          </button>
        )}
      </div>

      {/* COMMERCE REPORT 1: BILLING FROM SALES */}
      {reportType === 'commerce_billing' && (
        <div className="space-y-4" id="rep-commerce-billing-panel">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block">Faturamento Total de Vendas</span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                R$ {grandCommerceSalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 mt-1 block font-medium">Vendas confirmadas e faturadas</span>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total de Cupons / Vendas</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">{filteredSales.length} pedidos</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Balcão e PDV</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-indigo-600 block">Ticket Médio por Venda</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block">
                R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-indigo-500 mt-1 block font-medium">Média ponderada no período</span>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" /> Vendas Realizadas no Comércio
              </h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4">Cód Venda</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Vendedor</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Meio de Pagto</th>
                  <th className="p-4 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma venda registrada no período selecionado.</td>
                  </tr>
                ) : (
                  filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50/20">
                      <td className="p-4 font-mono font-bold text-emerald-700">{sale.code || `VD-${sale.id.slice(-6)}`}</td>
                      <td className="p-4 font-semibold text-slate-800">{sale.clientName || 'Consumidor Final'}</td>
                      <td className="p-4 text-slate-600">{sale.createdBy || 'Balcão'}</td>
                      <td className="p-4 text-slate-500">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                          {sale.paymentMethod || 'Dinheiro'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 text-right">
                        R$ {(sale.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMMERCE REPORT 2: POPULAR PRODUCTS (CURVA ABC) */}
      {reportType === 'popular_products' && (
        <div className="space-y-4" id="rep-popular-products-panel">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" /> Ranking e Curva ABC de Peças e Produtos Vendidos
              </h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4">Posição</th>
                  <th className="p-4">Código</th>
                  <th className="p-4">Produto / Peça</th>
                  <th className="p-4 text-center">Quantidade Vendida</th>
                  <th className="p-4 text-right">Faturamento Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {popularCommerceProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum produto faturado no momento.</td>
                  </tr>
                ) : (
                  popularCommerceProducts.map((item, idx) => (
                    <tr key={item.name + idx} className="hover:bg-slate-50/20">
                      <td className="p-4 font-bold text-slate-400"># {idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-slate-600">{item.code}</td>
                      <td className="p-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="p-4 text-center font-bold text-emerald-700">{item.qty} un</td>
                      <td className="p-4 font-bold text-slate-900 text-right">
                        R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMMERCE REPORT 3: SALES BY SELLER */}
      {reportType === 'sellers' && (
        <div className="space-y-4" id="rep-sellers-panel">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" /> Produtividade de Vendas por Operador
              </h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4">Vendedor / Operador</th>
                  <th className="p-4 text-center">Quantidade de Vendas</th>
                  <th className="p-4 text-right">Total Faturado (R$)</th>
                  <th className="p-4 text-right">Ticket Médio (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {salesBySeller.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum operador com vendas no período.</td>
                  </tr>
                ) : (
                  salesBySeller.map(seller => (
                    <tr key={seller.name} className="hover:bg-slate-50/20">
                      <td className="p-4 font-semibold text-slate-800">{seller.name}</td>
                      <td className="p-4 text-center font-bold text-indigo-600">{seller.count}</td>
                      <td className="p-4 font-bold text-emerald-700 text-right">
                        R$ {seller.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 font-medium text-slate-600 text-right">
                        R$ {(seller.total / (seller.count || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WORKSHOP REPORT 1: BILLING LIST */}
      {reportType === 'billing' && (
        <div className="space-y-4" id="rep-billing-panel">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block">Total Recebido Confirmado (OSs)</span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                R$ {grandWorkshopBillingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 mt-1 block font-medium">Lançamentos quitados no caixa da oficina</span>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Quantidade de OSs Concluídas</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">{workshopBillingLogs.length} ordens</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Apenas ordens de serviço concluídas</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-slate-400" /> Detalhamento de Faturamento Realizado por OS
              </h3>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4">Cód OS</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Placa</th>
                  <th className="p-4">Data Liberação</th>
                  <th className="p-4">Meio de Pagto</th>
                  <th className="p-4 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {workshopBillingLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum faturamento de OS confirmado no caixa.</td>
                  </tr>
                ) : (
                  workshopBillingLogs.map(log => (
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

      {/* WORKSHOP REPORT 2: POPULAR ITEMS RANKING */}
      {reportType === 'popular_services' && (
        <div className="space-y-4" id="rep-popular-panel">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ranking de Demandas da Oficina (Peças & Mão de Obra)</h3>
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
                {popularWorkshopItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum item faturado no momento.</td>
                  </tr>
                ) : (
                  popularWorkshopItems.map((item, idx) => (
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

      {/* WORKSHOP REPORT 3: MECHANICS PRODUCTIVITY */}
      {reportType === 'mechanics' && (
        <div className="space-y-4" id="rep-mechanics-panel">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
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

      {/* WORKSHOP REPORT 4: BUDGET VS EFFECTIVE */}
      {reportType === 'budget_vs_effective' && (
        <div className="space-y-4 text-xs" id="rep-budget-vs-effective-panel">
          {/* Filters Panel */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
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

            <button
              id="btn-clear-rep-filters"
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); setClientSearch(''); }}
              className="bg-white hover:bg-slate-100 text-slate-600 font-semibold text-xs px-4 py-2 border border-slate-200 rounded-lg transition shrink-0 cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>

          {/* Performance KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-indigo-50/50 border border-indigo-100 p-4.5 rounded-xl space-y-1">
              <span className="text-[9px] font-bold uppercase text-indigo-600 block tracking-wider">Total Orçado</span>
              <span className="text-xl font-black text-indigo-900 block font-mono">
                R$ {totalPeriodBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-indigo-500 block">Propostas comerciais geradas no período</span>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-4.5 rounded-xl space-y-1">
              <span className="text-[9px] font-bold uppercase text-emerald-600 block tracking-wider">Total Efetivado (OS)</span>
              <span className="text-xl font-black text-emerald-900 block font-mono">
                R$ {totalPeriodEffective.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 block">Itens convertidos em execução mecânica</span>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 p-4.5 rounded-xl space-y-1">
              <span className="text-[9px] font-bold uppercase text-amber-600 block tracking-wider">Total Adiado (Fazer Depois)</span>
              <span className="text-xl font-black text-amber-900 block font-mono">
                R$ {totalPeriodPostponed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-amber-600 block">Oportunidades salvas para futuros contatos</span>
            </div>

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
          <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
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

      {/* DUAL HYBRID REPORT: INTEGRATED REVENUE */}
      {reportType === 'integrated_revenue' && isDual && (
        <div className="space-y-4" id="rep-integrated-panel">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Faturamento Integrado Total</span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">
                R$ {combinedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-amber-700 mt-1 block font-medium">Oficina Mecânica + Vendas de Balcão</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-indigo-600 block">Faturamento Oficina (OSs)</span>
              <span className="text-2xl font-bold text-indigo-900 mt-1 block">
                R$ {grandWorkshopBillingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-indigo-500 mt-1 block">
                {combinedRevenue > 0 ? ((grandWorkshopBillingTotal / combinedRevenue) * 100).toFixed(1) : 0}% da receita
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block">Faturamento Vendas Balcão (PDV)</span>
              <span className="text-2xl font-bold text-emerald-900 mt-1 block">
                R$ {grandCommerceSalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 mt-1 block">
                {combinedRevenue > 0 ? ((grandCommerceSalesTotal / combinedRevenue) * 100).toFixed(1) : 0}% da receita
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
