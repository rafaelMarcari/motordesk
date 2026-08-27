/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Filter, Calendar, BarChart2, TrendingUp, Clock, 
  AlertTriangle, Search, Percent, Printer, Loader2, ShoppingBag, Wrench, 
  CreditCard, DollarSign, UserCheck, Package, Layers, Factory, CheckCircle2,
  Building2, ArrowUpDown, UserX, ShieldCheck, ChevronRight
} from 'lucide-react';
import { AppDatabase } from '../data/mockData';
import { BusinessType, User } from '../types';
import { generatePdfFromElement } from '../utils/pdfGenerator';
import { exportToCsv } from '../utils/csvExporter';
import { isCommerceBusiness, isWorkshopBusiness, isHybridBusiness } from '../utils/businessSegmentation';
import { PurchasingReports } from './reports/PurchasingReports';
import { StockReports } from './reports/StockReports';
import { FinancialReports } from './reports/FinancialReports';

interface ReportsViewProps {
  db: AppDatabase;
  businessType?: BusinessType;
  currentUser?: User;
}

type MainCategory = 'segment' | 'purchasing' | 'stock' | 'financial';

export default function ReportsView({ db, businessType = 'OFICINA', currentUser }: ReportsViewProps) {
  const isCommerce = businessType === 'COMERCIO';
  const isWorkshop = businessType === 'OFICINA';
  const isDual = businessType === 'OFICINA_COMERCIO';
  const isIndustry = businessType === 'INDUSTRIA' || isDual;

  // Active Category & Active Sub-Report
  const [activeCategory, setActiveCategory] = useState<MainCategory>('segment');
  
  const defaultSegmentReport = isIndustry ? 'industrial_production' : (isCommerce ? 'commerce_billing' : 'billing');
  const [reportType, setReportType] = useState<string>(defaultSegmentReport);
  
  // Custom period and quick filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [financialStatusFilter, setFinancialStatusFilter] = useState('all');
  const [dormantCutoffDays, setDormantCutoffDays] = useState<number>(60);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Quick Date Preset Handlers
  const handleQuickPreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_90' | 'this_year' | 'clear') => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'clear') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'today') {
      const today = toDateStr(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - day);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(now));
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    } else if (preset === 'last_90') {
      const past90 = new Date();
      past90.setDate(now.getDate() - 90);
      setStartDate(toDateStr(past90));
      setEndDate(toDateStr(now));
    } else if (preset === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    }
  };

  // Compute Client names and vehicles helper
  const getClientName = (id: string) => db.clients?.find(c => c.id === id)?.name || 'Cliente';
  const getVehiclePlate = (id: string) => db.vehicles?.find(v => v.id === id)?.plate || 'S/P';

  // --- WORKSHOP REPORTS COMPUTATION ---
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

  // Popular Workshop Items
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

  // Mechanics Productivity
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

  // Budget vs Effective
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
        if (searchTerm && !row.clientName.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        return row.budgetCount > 0;
      });
  };

  const budgetVsEffectiveRows = getBudgetVsEffectiveData();
  const totalPeriodBudgeted = budgetVsEffectiveRows.reduce((sum, r) => sum + r.totalBudgeted, 0);
  const totalPeriodEffective = budgetVsEffectiveRows.reduce((sum, r) => sum + r.totalEffective, 0);
  const averagePeriodConversion = totalPeriodBudgeted > 0 ? (totalPeriodEffective / totalPeriodBudgeted) * 100 : 0;

  // --- COMMERCE / SALES REPORTS COMPUTATION ---
  const salesList = (db.sales || []).filter(s => s.paymentStatus !== 'canceled');
  const filteredSales = salesList.filter(s => {
    const sDate = (s.createdAt || '').substring(0, 10);
    if (startDate && sDate < startDate) return false;
    if (endDate && sDate > endDate) return false;
    if (searchTerm && s.clientName && !s.clientName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const grandCommerceSalesTotal = filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const averageTicket = filteredSales.length > 0 ? grandCommerceSalesTotal / filteredSales.length : 0;

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

  const handlePrintReportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromElement('reports-view-container', `Relatorio_${businessType}_${activeCategory}_${reportType}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Switch category and select appropriate default sub-report
  const handleCategorySelect = (cat: MainCategory) => {
    setActiveCategory(cat);
    if (cat === 'segment') {
      setReportType(defaultSegmentReport);
    } else if (cat === 'purchasing') {
      setReportType('purchase_history');
    } else if (cat === 'stock') {
      setReportType('stock_position_movements');
    } else if (cat === 'financial') {
      setReportType('financial_receivables');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="reports-view-container">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">
              Relatórios Gerenciais & Decisão Estratégica
            </h1>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
              isCommerce ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              isWorkshop ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              Segmento: {businessType}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centro unificado de inteligência em Compras, Estoque, Financeiro e Operação ({businessType}).
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                <span>Imprimir / Gerar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 4 Category Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <button
          type="button"
          onClick={() => handleCategorySelect('segment')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
            activeCategory === 'segment' 
              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs' 
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${activeCategory === 'segment' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {isIndustry ? <Factory className="w-4 h-4" /> : isCommerce ? <ShoppingBag className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold block">{isIndustry ? 'Industrial & PCP' : isCommerce ? 'Vendas & Balcão' : 'Oficina & OS'}</span>
              <span className="text-[10px] text-slate-400 block">Faturamento e produção</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCategorySelect('purchasing')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
            activeCategory === 'purchasing' 
              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs' 
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${activeCategory === 'purchasing' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block">Compras & Fornecedores</span>
              <span className="text-[10px] text-slate-400 block">Cotações e histórico</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCategorySelect('stock')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
            activeCategory === 'stock' 
              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs' 
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${activeCategory === 'stock' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block">Estoque & Giro</span>
              <span className="text-[10px] text-slate-400 block">Mínimos e sem giro</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCategorySelect('financial')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
            activeCategory === 'financial' 
              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs' 
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${activeCategory === 'financial' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block">Financeiro & Cobrança</span>
              <span className="text-[10px] text-slate-400 block">Receber, pagar e aging</span>
            </div>
          </div>
        </button>
      </div>

      {/* Global Filter Bar with Quick Presets */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Período:
          </span>
          <button
            type="button"
            onClick={() => handleQuickPreset('today')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('this_week')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Esta Semana
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('this_month')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Este Mês
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('last_month')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Mês Anterior
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('last_90')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Últimos 90 Dias
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('this_year')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Ano Atual
          </button>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => handleQuickPreset('clear')}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition cursor-pointer"
            >
              Limpar Datas
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, código, doc..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <span className="text-slate-400 text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Contextual filter 1: Supplier or Category */}
          {activeCategory === 'purchasing' ? (
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os Fornecedores</option>
              {(db.suppliers || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : activeCategory === 'financial' ? (
            <select
              value={financialStatusFilter}
              onChange={e => setFinancialStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Status Financeiros</option>
              <option value="pending">Apenas A Vencer (Dentro do Prazo)</option>
              <option value="overdue">Apenas Vencidos (Em Atraso)</option>
              <option value="paid">Apenas Liquidados (Pagos/Recebidos)</option>
            </select>
          ) : activeCategory === 'stock' && reportType === 'stock_dormant' ? (
            <select
              value={dormantCutoffDays}
              onChange={e => setDormantCutoffDays(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value={30}>Parados há mais de 30 dias</option>
              <option value={60}>Parados há mais de 60 dias (Padrão)</option>
              <option value={90}>Parados há mais de 90 dias</option>
              <option value={180}>Parados há mais de 180 dias</option>
              <option value={365}>Parados há mais de 1 ano</option>
            </select>
          ) : (
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as Categorias</option>
              <option value="Freios">Freios</option>
              <option value="Motor">Motor</option>
              <option value="Suspensão">Suspensão</option>
              <option value="Óleos e Fluidos">Óleos e Fluidos</option>
              <option value="Filtros">Filtros</option>
            </select>
          )}

          <div className="flex items-center justify-end text-[11px] text-slate-500 font-medium">
            Filtros Ativos: <span className="font-bold text-slate-800 ml-1">{(startDate || endDate || searchTerm || selectedSupplierId) ? 'Personalizado' : 'Tudo'}</span>
          </div>
        </div>
      </div>

      {/* Sub-Report Tabs per Category */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-0.5 no-print" id="subreport-type-selector">
        {/* CATEGORY 1: SEGMENT TABS */}
        {activeCategory === 'segment' && (
          <>
            {(isCommerce || isDual) && (
              <>
                <button 
                  onClick={() => setReportType('commerce_billing')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'commerce_billing' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Faturamento de Vendas (PDV)
                </button>
                <button 
                  onClick={() => setReportType('popular_products')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'popular_products' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" /> Produtos Mais Vendidos (Curva ABC)
                </button>
                <button 
                  onClick={() => setReportType('sellers')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'sellers' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" /> Vendas por Operador / Vendedor
                </button>
              </>
            )}

            {(isWorkshop || isDual) && (
              <>
                <button 
                  onClick={() => setReportType('billing')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" /> Faturamento de OSs (Oficina)
                </button>
                <button 
                  onClick={() => setReportType('popular_services')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'popular_services' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" /> Serviços & Peças Populares
                </button>
                <button 
                  onClick={() => setReportType('mechanics')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'mechanics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Produtividade por Mecânico
                </button>
                <button 
                  onClick={() => setReportType('budget_vs_effective')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'budget_vs_effective' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" /> Orçado vs. Efetivado (Conversão)
                </button>
              </>
            )}

            {isIndustry && (
              <>
                <button 
                  onClick={() => setReportType('industrial_production')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'industrial_production' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Factory className="w-3.5 h-3.5" /> Ordens de Produção & PCP
                </button>
                <button 
                  onClick={() => setReportType('industrial_lots')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                    reportType === 'industrial_lots' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lotes & Rastreabilidade
                </button>
              </>
            )}
          </>
        )}

        {/* CATEGORY 2: PURCHASING TABS */}
        {activeCategory === 'purchasing' && (
          <>
            <button 
              onClick={() => setReportType('purchase_history')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'purchase_history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Histórico de Compras
            </button>
            <button 
              onClick={() => setReportType('popular_purchases')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'popular_purchases' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Peças Mais Utilizadas / Compradas
            </button>
            <button 
              onClick={() => setReportType('product_vs_supplier')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'product_vs_supplier' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> Produto x Fornecedor
            </button>
            <button 
              onClick={() => setReportType('supplier_performance')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'supplier_performance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Desempenho de Fornecedores
            </button>
          </>
        )}

        {/* CATEGORY 3: STOCK TABS */}
        {activeCategory === 'stock' && (
          <>
            <button 
              onClick={() => setReportType('stock_position_movements')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'stock_position_movements' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Posição & Movimentações
            </button>
            <button 
              onClick={() => setReportType('stock_replenishment')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'stock_replenishment' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Reposição (Abaixo do Mínimo)
            </button>
            <button 
              onClick={() => setReportType('stock_dormant')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'stock_dormant' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Produtos sem Giro (Capital Parado)
            </button>
          </>
        )}

        {/* CATEGORY 4: FINANCIAL TABS */}
        {activeCategory === 'financial' && (
          <>
            <button 
              onClick={() => setReportType('financial_receivables')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'financial_receivables' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Contas a Receber
            </button>
            <button 
              onClick={() => setReportType('financial_payables')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'financial_payables' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-rose-600" /> Contas a Pagar
            </button>
            <button 
              onClick={() => setReportType('financial_consolidated')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'financial_consolidated' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Compromissos Consolidados
            </button>
            <button 
              onClick={() => setReportType('financial_due_brackets')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'financial_due_brackets' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Faixas de Vencimento
            </button>
            <button 
              onClick={() => setReportType('financial_defaulters')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                reportType === 'financial_defaulters' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-rose-600" /> Inadimplência & Cobrança
            </button>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RENDER CATEGORY 2: PURCHASING REPORTS */}
      {/* ========================================================================= */}
      {activeCategory === 'purchasing' && (
        <PurchasingReports
          db={db}
          subType={reportType as any}
          startDate={startDate}
          endDate={endDate}
          searchTerm={searchTerm}
          selectedSupplierId={selectedSupplierId}
        />
      )}

      {/* ========================================================================= */}
      {/* RENDER CATEGORY 3: STOCK REPORTS */}
      {/* ========================================================================= */}
      {activeCategory === 'stock' && (
        <StockReports
          db={db}
          subType={reportType as any}
          startDate={startDate}
          endDate={endDate}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          dormantCutoffDays={dormantCutoffDays}
        />
      )}

      {/* ========================================================================= */}
      {/* RENDER CATEGORY 4: FINANCIAL REPORTS */}
      {/* ========================================================================= */}
      {activeCategory === 'financial' && (
        <FinancialReports
          db={db}
          subType={reportType as any}
          startDate={startDate}
          endDate={endDate}
          searchTerm={searchTerm}
          statusFilter={financialStatusFilter}
        />
      )}

      {/* ========================================================================= */}
      {/* RENDER CATEGORY 1: SEGMENT REPORTS */}
      {/* ========================================================================= */}
      {activeCategory === 'segment' && (
        <>
          {/* COMMERCE REPORT 1: BILLING FROM SALES */}
          {reportType === 'commerce_billing' && (
            <div className="space-y-4" id="rep-commerce-billing-panel">
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
                        <tr key={sale.id} className="hover:bg-slate-50 transition">
                          <td className="p-4 font-mono font-bold text-indigo-600">{sale.id}</td>
                          <td className="p-4 font-medium text-slate-900">{sale.clientName || 'Consumidor Final'}</td>
                          <td className="p-4 text-slate-600">{sale.createdBy || 'Atendente Balcão'}</td>
                          <td className="p-4 text-slate-500">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {(sale.paymentMethod || 'Dinheiro').toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-900">
                            R$ {(sale.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMMERCE REPORT 2: POPULAR PRODUCTS */}
          {reportType === 'popular_products' && (
            <div className="space-y-4" id="rep-popular-products-panel">
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" /> Curva ABC de Produtos Mais Vendidos
                  </h3>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-4">Classificação</th>
                      <th className="p-4">Código</th>
                      <th className="p-4">Produto</th>
                      <th className="p-4 text-center">Qtd Vendida</th>
                      <th className="p-4 text-right">Faturamento Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {popularCommerceProducts.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="p-4 font-mono font-semibold text-slate-600">{prod.code}</td>
                        <td className="p-4 font-medium text-slate-900">{prod.name}</td>
                        <td className="p-4 text-center font-bold text-emerald-700 bg-emerald-50/30">{prod.qty} un</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">
                          R$ {prod.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMMERCE REPORT 3: SALES BY SELLER */}
          {reportType === 'sellers' && (
            <div className="space-y-4" id="rep-sellers-panel">
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" /> Desempenho por Operador / Vendedor
                  </h3>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-4">Vendedor / Operador</th>
                      <th className="p-4 text-center">Qtd Vendas</th>
                      <th className="p-4 text-right">Total Faturado</th>
                      <th className="p-4 text-right">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {salesBySeller.map((seller, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800">{seller.name}</td>
                        <td className="p-4 text-center font-bold text-indigo-600">{seller.count} vendas</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">
                          R$ {seller.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600">
                          R$ {(seller.count > 0 ? seller.total / seller.count : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORKSHOP REPORT 1: BILLING */}
          {reportType === 'billing' && (
            <div className="space-y-4" id="rep-workshop-billing-panel">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 block">Total Faturado de OSs</span>
                  <span className="text-2xl font-black text-indigo-900 mt-1 block">
                    R$ {grandWorkshopBillingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-indigo-500 mt-1 block font-medium">Ordens concluídas e pagas</span>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-5 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total de OSs Faturadas</span>
                  <span className="text-2xl font-bold text-slate-800 mt-1 block">{workshopBillingLogs.length} ordens</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Oficina mecânica</span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-4">Nº OS</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Placa</th>
                      <th className="p-4">Data Pagamento</th>
                      <th className="p-4 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {workshopBillingLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-mono font-bold text-indigo-600">{log.id}</td>
                        <td className="p-4 font-medium text-slate-900">{log.client}</td>
                        <td className="p-4 font-mono">{log.plate}</td>
                        <td className="p-4 text-slate-500">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">
                          R$ {log.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORKSHOP REPORT 2: POPULAR SERVICES & PARTS */}
          {reportType === 'popular_services' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Descrição do Serviço / Peça</th>
                      <th className="p-4 text-center">Qtd Aplicada</th>
                      <th className="p-4 text-right">Receita Total Gerada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {popularWorkshopItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.type === 'service' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {item.type === 'service' ? 'Serviço' : 'Peça'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">{item.name}</td>
                        <td className="p-4 text-center font-bold text-indigo-700">{item.qty}x</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">
                          R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORKSHOP REPORT 3: MECHANICS PRODUCTIVITY */}
          {reportType === 'mechanics' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-4">Mecânico Responsável</th>
                      <th className="p-4 text-center">OSs Pendentes</th>
                      <th className="p-4 text-center">Em Execução</th>
                      <th className="p-4 text-center">Concluídas</th>
                      <th className="p-4 text-right">Faturamento Produzido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {mechanicsRanking.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800">{m.name}</td>
                        <td className="p-4 text-center font-mono text-slate-500">{m.pending}</td>
                        <td className="p-4 text-center font-mono text-amber-600 font-bold">{m.executing}</td>
                        <td className="p-4 text-center font-mono text-emerald-600 font-bold">{m.completed}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900">
                          R$ {m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORKSHOP REPORT 4: BUDGET VS EFFECTIVE */}
          {reportType === 'budget_vs_effective' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Orçado</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                    R$ {totalPeriodBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Aprovado / Efetivado</span>
                  <span className="text-2xl font-black text-emerald-900 mt-1 block font-mono">
                    R$ {totalPeriodEffective.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-indigo-700 block">Taxa de Conversão Média</span>
                  <span className="text-2xl font-black text-indigo-900 mt-1 block font-mono">
                    {averagePeriodConversion.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-4">Cliente</th>
                      <th className="p-4 text-center">Qtd Orçamentos</th>
                      <th className="p-4 text-right">Valor Total Orçado</th>
                      <th className="p-4 text-right">Valor Efetivado</th>
                      <th className="p-4 text-center">Taxa de Conversão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {budgetVsEffectiveRows.map(row => (
                      <tr key={row.clientId} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800">{row.clientName}</td>
                        <td className="p-4 text-center font-mono">{row.budgetCount}</td>
                        <td className="p-4 text-right font-mono text-slate-700">
                          R$ {row.totalBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-700">
                          R$ {row.totalEffective.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-indigo-600">
                          {row.conversionRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDUSTRIAL REPORTS */}
          {reportType === 'industrial_production' && isIndustry && (
            <div className="space-y-4" id="rep-industrial-production-panel">
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-3">Código OP</th>
                      <th className="p-3">Produto Acabado</th>
                      <th className="p-3 text-center">Qtd Planejada</th>
                      <th className="p-3 text-center">Qtd Produzida</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3 text-right">Custo Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(db.productionOrders || []).map(op => (
                      <tr key={op.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-mono font-bold text-indigo-600">{op.code}</td>
                        <td className="p-3 font-semibold text-slate-800">{op.productName}</td>
                        <td className="p-3 text-center font-mono font-bold">{op.targetQuantity} {op.unitOfMeasure}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">{op.producedQuantity} {op.unitOfMeasure}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            op.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            op.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                            op.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {op.status === 'completed' ? 'Concluída' :
                             op.status === 'in_progress' ? 'Em Fabricação' :
                             op.status === 'approved' ? 'Liberada' : 'Rascunho'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{op.assignedTo || 'PCP Geral'}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          R$ {(op.totalEstimatedCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType === 'industrial_lots' && isIndustry && (
            <div className="space-y-4" id="rep-industrial-lots-panel">
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                      <th className="p-3">Número do Lote</th>
                      <th className="p-3">Produto Acabado</th>
                      <th className="p-3 text-center">Qtd Inicial</th>
                      <th className="p-3 text-center">Saldo Atual</th>
                      <th className="p-3">Data Fabricação</th>
                      <th className="p-3">Data Validade</th>
                      <th className="p-3">Controle de Qualidade (QC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(db.productLots || []).map(lot => (
                      <tr key={lot.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-mono font-bold text-indigo-700">{lot.lotNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{lot.productName}</td>
                        <td className="p-3 text-center font-mono">{lot.initialQuantity} {lot.unitOfMeasure}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">{lot.currentQuantity} {lot.unitOfMeasure}</td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">{lot.manufacturingDate}</td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">{lot.expirationDate || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lot.qcStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            lot.qcStatus === 'quarantine' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {lot.qcStatus === 'approved' ? 'Aprovado (QC)' :
                             lot.qcStatus === 'quarantine' ? 'Quarentena' : 'Rejeitado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
