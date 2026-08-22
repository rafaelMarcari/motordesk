/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Car, 
  FileText, 
  Wrench, 
  DollarSign, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  Package,
  Calendar,
  Activity,
  ChevronRight,
  Clock,
  ShoppingBag,
  CreditCard,
  Receipt,
  Store,
  Layers,
  Truck,
  Boxes,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AppDatabase } from '../data/mockData';
import { BusinessType } from '../types';

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (tab: string) => void;
  businessType?: BusinessType;
}

export default function DashboardView({ db, onNavigate, businessType = 'OFICINA' }: DashboardViewProps) {
  // Helper to generate dynamic month options (current month + previous 11 months)
  const generateDynamicMonthOptions = () => {
    const options = [];
    const now = new Date();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      const value = `${year}-${monthStr}`;
      const isCurrent = i === 0;
      const label = `${monthNames[monthIndex]} ${year}${isCurrent ? ' (Mês Atual)' : ''}`;
      options.push({ value, label });
    }
    return options;
  };

  const MONTH_OPTIONS = React.useMemo(() => generateDynamicMonthOptions(), []);
  const currentIsoMonth = MONTH_OPTIONS[0]?.value || new Date().toISOString().slice(0, 7);

  // Selected month for analysis (YYYY-MM), dynamically defaulting to current month
  const [selectedMonth, setSelectedMonth] = useState<string>(currentIsoMonth);
  const [dualViewMode, setDualViewMode] = useState<'all' | 'workshop' | 'sales'>('all');

  const isWorkshop = businessType === 'OFICINA';
  const isCommerce = businessType === 'COMERCIO';
  const isDual = businessType === 'OFICINA_COMERCIO';

  // 1. WORKSHOP METRICS & KPIS
  const totalClients = db.clients.length;
  const totalVehicles = db.vehicles.length;
  const totalBudgets = db.budgets.length;

  const workshopOrders = db.serviceOrders.filter(os => 
    os.status !== 'canceled' && 
    (
      os.status === 'executing' || 
      os.status === 'pending' || 
      os.workshopStatus === 'green' || 
      os.workshopStatus === 'yellow' || 
      os.workshopStatus === 'gray' ||
      os.workshopStatus === 'red'
    ) &&
    os.workshopStatus !== 'blue'
  );
  
  const carsInRepairCount = workshopOrders.length;

  const greenCount = db.serviceOrders.filter(os => os.status !== 'canceled' && (os.workshopStatus === 'green' || os.workshopStatus === 'red' || (os.status === 'executing' && os.workshopStatus !== 'yellow' && os.workshopStatus !== 'blue'))).length;
  const yellowCount = db.serviceOrders.filter(os => os.status !== 'canceled' && os.workshopStatus === 'yellow').length;
  const grayCount = db.serviceOrders.filter(os => os.status !== 'canceled' && (os.workshopStatus === 'gray' || (os.status === 'pending' && !os.workshopStatus))).length;
  const blueCount = db.serviceOrders.filter(os => os.status !== 'canceled' && (os.workshopStatus === 'blue' || (os.status === 'completed' && !os.workshopStatus))).length;

  const monthOrders = db.serviceOrders.filter(os => {
    const osDate = os.serviceDate || os.startedAt || os.createdAt || '';
    return osDate.startsWith(selectedMonth);
  });

  const uniqueVehiclesInMonth = new Set(monthOrders.map(os => os.vehicleId)).size;

  const monthWorkshopRevenue = monthOrders
    .filter(os => os.paymentStatus === 'paid')
    .reduce((sum, os) => {
      const osTotal = os.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0);
      return sum + osTotal;
    }, 0);

  const totalWorkshopRevenue = db.serviceOrders
    .filter(os => os.paymentStatus === 'paid')
    .reduce((sum, os) => {
      const osTotal = os.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0);
      return sum + osTotal;
    }, 0);

  // 2. COMMERCE / RETAIL METRICS & KPIS
  const salesList = db.sales || [];
  const validSales = salesList.filter(s => s.paymentStatus !== 'canceled');
  const totalSalesCount = validSales.length;
  const totalCommerceRevenue = validSales.reduce((sum, s) => sum + s.totalAmount, 0);

  const monthSales = validSales.filter(s => (s.createdAt || '').startsWith(selectedMonth));
  const monthSalesCount = monthSales.length;
  const monthCommerceRevenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const averageTicket = monthSalesCount > 0 ? (monthCommerceRevenue / monthSalesCount) : 0;
  const totalProducts = db.parts.length;

  // Check low stock
  const lowStockParts = db.parts.filter(part => part.stock < 5);

  // Withdrawal & Delivery operational metrics
  const withdrawalsList = db.goodsWithdrawals || [];
  const wAguardando = withdrawalsList.filter(w => w.status === 'AGUARDANDO_SEPARACAO').length;
  const wEmSeparacao = withdrawalsList.filter(w => w.status === 'EM_SEPARACAO').length;
  const wParcial = withdrawalsList.filter(w => w.status === 'PARCIALMENTE_SEPARADO').length;
  const wProntoRetirada = withdrawalsList.filter(w => w.status === 'PRONTO_RETIRADA').length;
  const wProntoEntrega = withdrawalsList.filter(w => w.status === 'PRONTO_ENTREGA').length;
  const wSaiuEntrega = withdrawalsList.filter(w => w.status === 'SAIU_PARA_ENTREGA').length;
  const wEntregues = withdrawalsList.filter(w => w.status === 'RETIRADO' || w.status === 'ENTREGUE').length;

  const selectedMonthLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  // Chart data: Monthly billing
  const billingData = [
    { name: 'Jan', oficina: 4200, comercio: 3100, total: 7300 },
    { name: 'Fev', oficina: 5800, comercio: 4200, total: 10000 },
    { name: 'Mar', oficina: 6100, comercio: 4900, total: 11000 },
    { name: 'Abr', oficina: 7400, comercio: 5500, total: 12900 },
    { name: 'Mai', oficina: 8200, comercio: 6200, total: 14400 },
    { name: 'Jun', oficina: 9500, comercio: 7100, total: 16600 },
    { 
      name: 'Jul', 
      oficina: monthWorkshopRevenue || totalWorkshopRevenue, 
      comercio: monthCommerceRevenue || totalCommerceRevenue,
      total: (monthWorkshopRevenue || totalWorkshopRevenue) + (monthCommerceRevenue || totalCommerceRevenue)
    }
  ];

  // Chart: OS Status Distribution
  const osByStatus = [
    { name: 'Pendentes (Cinza)', Qtd: grayCount },
    { name: 'Pausadas (Amarelo)', Qtd: yellowCount },
    { name: 'Em Execução (Verde)', Qtd: greenCount },
    { name: 'Liberados (Azul)', Qtd: blueCount }
  ];

  // Chart: Sales by Payment Method
  const paymentMethodData = [
    { name: 'PIX', valor: validSales.filter(s => s.paymentMethod === 'PIX').reduce((sum, s) => sum + s.totalAmount, 0) || 1450, count: validSales.filter(s => s.paymentMethod === 'PIX').length || 4 },
    { name: 'Cartão Crédito', valor: validSales.filter(s => s.paymentMethod === 'CREDIT_CARD').reduce((sum, s) => sum + s.totalAmount, 0) || 980, count: validSales.filter(s => s.paymentMethod === 'CREDIT_CARD').length || 2 },
    { name: 'Cartão Débito', valor: validSales.filter(s => s.paymentMethod === 'DEBIT_CARD').reduce((sum, s) => sum + s.totalAmount, 0) || 420, count: validSales.filter(s => s.paymentMethod === 'DEBIT_CARD').length || 1 },
    { name: 'Dinheiro', valor: validSales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.totalAmount, 0) || 350, count: validSales.filter(s => s.paymentMethod === 'CASH').length || 1 },
  ];

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-view-container">
      {/* Welcome Title & Month Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display flex items-center gap-2">
              {isCommerce ? (
                <>
                  <Store className="w-6 h-6 text-indigo-600" />
                  Dashboard Comercial & Vendas
                </>
              ) : isDual ? (
                <>
                  <Layers className="w-6 h-6 text-indigo-600" />
                  Dashboard Geral (Oficina & Comércio)
                </>
              ) : (
                <>
                  <Wrench className="w-6 h-6 text-indigo-600" />
                  Dashboard da Oficina
                </>
              )}
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
              Segmento: {businessType}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isCommerce 
              ? 'Resumo comercial, frente de caixa (PDV), faturamento em vendas e controle de estoque.' 
              : isDual
              ? 'Visão integrada operacional da oficina e vendas comerciais no balcão.'
              : 'Resumo operacional, monitor de reparos na oficina (semáforo) e métricas de serviço.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dual mode selector if OFICINA_COMERCIO */}
          {isDual && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDualViewMode('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${dualViewMode === 'all' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-600'}`}
              >
                Geral
              </button>
              <button
                type="button"
                onClick={() => setDualViewMode('workshop')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${dualViewMode === 'workshop' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-600'}`}
              >
                Oficina
              </button>
              <button
                type="button"
                onClick={() => setDualViewMode('sales')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${dualViewMode === 'sales' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-600'}`}
              >
                Comércio
              </button>
            </div>
          )}

          {/* Month Analysis Selector Combobox */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Mês:</span>
            <select
              id="combobox-month-analysis"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {MONTH_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Quick Action Buttons according to business type */}
          {!isCommerce && (
            <button 
              id="btn-quick-new-budget"
              onClick={() => onNavigate('budgets')} 
              className="flex items-center gap-2 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition shadow-2xs cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Novo Orçamento
            </button>
          )}

          {!isWorkshop && (
            <button 
              id="btn-quick-new-sale"
              onClick={() => onNavigate('sales')} 
              className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-emerald-700 transition shadow-2xs cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" /> Frente de Caixa / Venda
            </button>
          )}

          <button 
            id="btn-quick-qa-portfolio"
            onClick={() => onNavigate('qa_panel')} 
            className="flex items-center gap-2 bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-slate-900 transition shadow-2xs cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" /> QA & Testes
          </button>
        </div>
      </div>

      {/* FEATURED OPERATIONAL HIGHLIGHT CARDS */}
      {/* 1. SE FOR OFICINA: SEMÁFORO DE REPAROS + ANÁLISE DE VEÍCULOS */}
      {(isWorkshop || (isDual && dualViewMode !== 'sales')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Carros na Oficina com Reparo em Andamento (Semáforo) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between" id="kpi-workshop-in-repair">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Wrench className="w-32 h-32 text-white" />
            </div>

            <div className="space-y-3 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Dentro da Oficina (Na Rampa)
                </span>
                <span className="text-[11px] text-slate-300 font-medium">Semáforo de Reparos</span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <h2 className="text-4xl font-extrabold font-display text-white">{carsInRepairCount}</h2>
                <span className="text-sm font-medium text-slate-300">
                  {carsInRepairCount === 1 ? 'veículo em serviço' : 'veículos em serviço'}
                </span>
              </div>

              {/* Status Breakdown Pills */}
              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{greenCount} em andamento (Verde)</span>
                </div>
                <div className="bg-amber-500/20 border border-amber-500/30 text-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{yellowCount} pausados (Amarelo)</span>
                </div>
                <div className="bg-slate-500/20 border border-slate-400/30 text-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span>{grayCount} não iniciados (Cinza)</span>
                </div>
                <div className="bg-blue-500/20 border border-blue-400/30 text-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>{blueCount} liberados (Azul)</span>
                </div>
              </div>
            </div>

            <div className="pt-5 z-10 border-t border-slate-700/60 mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-300">
                Sinalizador: ⚪ Cinza, 🟡 Amarelo, 🟢 Verde (Em Andamento), 🔵 Azul (Liberado)
              </p>
              <button
                id="btn-goto-workshop-monitor-dashboard"
                onClick={() => onNavigate('serviceOrders')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                Abrir Monitor 🚦 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Total de Veículos no Mês Selecionado */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4" id="kpi-month-vehicles-analysis">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Atendimento Mensal da Oficina</span>
                  <h3 className="text-sm font-bold text-slate-800">{selectedMonthLabel}</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Veículos Atendidos:</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-extrabold text-slate-900 font-display">{uniqueVehiclesInMonth}</h2>
                  <span className="text-xs text-indigo-600 font-semibold">{monthOrders.length} OSs geradas</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Faturamento em OSs:</span>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-2xl font-bold text-emerald-600 font-display">
                    R$ {monthWorkshopRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Total acumulado de veículos atendidos na oficina no período.
              </span>
              <button
                id="btn-goto-os-from-month-kpi"
                onClick={() => onNavigate('serviceOrders')}
                className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
              >
                Ver Ordens <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SE FOR COMÉRCIO: VENDAS & BALCÃO (PDV) + TICKET MÉDIO */}
      {(isCommerce || (isDual && dualViewMode !== 'workshop')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Desempenho de Vendas e PDV */}
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between" id="kpi-commerce-sales-highlight">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <ShoppingBag className="w-32 h-32 text-white" />
            </div>

            <div className="space-y-3 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Frente de Caixa & Balcão (PDV)
                </span>
                <span className="text-[11px] text-slate-300 font-medium">Mês: {selectedMonthLabel}</span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <h2 className="text-4xl font-extrabold font-display text-white">
                  R$ {monthCommerceRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <span className="text-sm font-medium text-emerald-300">
                  {monthSalesCount} {monthSalesCount === 1 ? 'venda realizada' : 'vendas realizadas'}
                </span>
              </div>

              {/* Status Breakdown Pills */}
              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ticket Médio: R$ {averageTicket.toFixed(2)}</span>
                </div>
                <div className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <Package className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{totalProducts} Produtos no Catálogo</span>
                </div>
                <div className="bg-amber-500/20 border border-amber-500/30 text-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>{validSales.length} Vendas Acumuladas</span>
                </div>
              </div>
            </div>

            <div className="pt-5 z-10 border-t border-slate-700/60 mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-300">
                Frente de Caixa Rápido com Emissão de Recibos e NFC-e Fiscal
              </p>
              <button
                id="btn-goto-sales-pdv-dashboard"
                onClick={() => onNavigate('sales')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                Abrir Frente de Caixa <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Análise Comercial Mensal */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4" id="kpi-commerce-month-analysis">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Desempenho Comercial</span>
                  <h3 className="text-sm font-bold text-slate-800">{selectedMonthLabel}</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Vendas Concluídas:</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-extrabold text-slate-900 font-display">{monthSalesCount}</h2>
                  <span className="text-xs text-emerald-600 font-semibold">no mês</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Faturamento Total Geral:</span>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-2xl font-bold text-emerald-600 font-display">
                    R$ {totalCommerceRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                Movimentação financeira em vendas a pronta entrega e balcão.
              </span>
              <button
                id="btn-goto-sales-list-from-kpi"
                onClick={() => onNavigate('sales')}
                className="text-xs text-emerald-600 font-bold hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
              >
                Ver Vendas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. QUADRO OPERACIONAL: RETIRADA E ENTREGA DE MERCADORIAS (COMÉRCIO & HÍBRIDO) */}
      {(isCommerce || (isDual && dualViewMode !== 'workshop')) && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="kpi-withdrawal-operational-panel">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base font-display flex items-center gap-2">
                  Retirada e Entrega de Mercadorias
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhe as mercadorias vendidas que ainda precisam ser separadas, retiradas ou entregues.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit">
              {withdrawalsList.length} pedidos no fluxo
            </span>
          </div>

          {/* Operational Stage Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* 1. Aguardando Separação */}
            <div 
              onClick={() => onNavigate('withdrawals')}
              className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Aguardando</span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-extrabold text-amber-950 font-display">{wAguardando}</span>
                <p className="text-[11px] text-amber-800 font-medium">Aguardando separação</p>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded text-center block">
                Separar →
              </span>
            </div>

            {/* 2. Em Separação */}
            <div 
              onClick={() => onNavigate('withdrawals')}
              className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Em Separação</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-extrabold text-blue-950 font-display">{wEmSeparacao}</span>
                <p className="text-[11px] text-blue-800 font-medium">Em processo</p>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded text-center block">
                Continuar →
              </span>
            </div>

            {/* 3. Parcialmente Separado */}
            <div 
              onClick={() => onNavigate('withdrawals')}
              className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Pendências</span>
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-extrabold text-orange-950 font-display">{wParcial}</span>
                <p className="text-[11px] text-orange-800 font-medium">Parcial separado</p>
              </div>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded text-center block">
                Ver pendências →
              </span>
            </div>

            {/* 4. Pronto para Retirada */}
            <div 
              onClick={() => onNavigate('withdrawals')}
              className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">P/ Retirada</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-extrabold text-emerald-950 font-display">{wProntoRetirada}</span>
                <p className="text-[11px] text-emerald-800 font-medium">Pronto no balcão</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-center block">
                Ver pedidos →
              </span>
            </div>

            {/* 5. Pronto para Entrega */}
            <div 
              onClick={() => onNavigate('withdrawals')}
              className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-300 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">P/ Despacho</span>
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-extrabold text-teal-950 font-display">{wProntoEntrega}</span>
                <p className="text-[11px] text-teal-800 font-medium">Aguardando coleta</p>
              </div>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded text-center block">
                Despachar →
              </span>
            </div>

            {/* 6. Saiu para Entrega */}
            <div 
              onClick={() => onNavigate('withdrawals')}
              className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Em Trânsito</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-extrabold text-indigo-950 font-display">{wSaiuEntrega}</span>
                <p className="text-[11px] text-indigo-800 font-medium">Saiu p/ entrega</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded text-center block">
                Acompanhar →
              </span>
            </div>

            {/* 7. Entregues Hoje / Concluídos */}
            <div 
              onClick={() => onNavigate('withdrawals')}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Concluídos</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="my-2">
                <span className="text-2xl font-extrabold text-slate-800 font-display">{wEntregues}</span>
                <p className="text-[11px] text-slate-600 font-medium">Retirados/Entregues</p>
              </div>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded text-center block">
                Ver histórico →
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-500" />
              Gestão de separação física (picking), romaneios e comprovantes com baixa definitiva de estoque.
            </span>
            <button
              id="btn-goto-withdrawals-from-dashboard"
              onClick={() => onNavigate('withdrawals')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>VER FILA DE RETIRADA E ENTREGA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* GENERAL KPI GRID ADAPTED TO BUSINESS TYPE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clientes */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-clients">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clientes Cadastrados</span>
            <h3 className="text-2xl font-bold text-slate-800">{totalClients}</h3>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Base ativa
            </span>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Se Oficina -> Frota de Veículos / Se Comércio -> Catálogo de Produtos */}
        {!isCommerce ? (
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-vehicles">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Frota de Veículos</span>
              <h3 className="text-2xl font-bold text-slate-800">{totalVehicles}</h3>
              <span className="text-[10px] text-slate-400 font-medium">Veículos cadastrados</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
              <Car className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-products">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Produtos no Estoque</span>
              <h3 className="text-2xl font-bold text-slate-800">{totalProducts}</h3>
              <span className="text-[10px] text-slate-400 font-medium">Itens no catálogo</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Card 3: Se Oficina -> Orçamentos / Se Comércio -> Vendas Concluídas */}
        {!isCommerce ? (
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-budgets">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Orçamentos</span>
              <h3 className="text-2xl font-bold text-slate-800">{totalBudgets}</h3>
              <span className="text-[10px] text-indigo-500 font-medium">Validade controlada</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-sales-count">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vendas Realizadas</span>
              <h3 className="text-2xl font-bold text-slate-800">{totalSalesCount}</h3>
              <span className="text-[10px] text-emerald-500 font-medium">Frente de caixa</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Faturamento Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-revenue">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isCommerce ? 'Faturamento Vendas' : isDual ? 'Faturamento Total' : 'Faturamento OSs'}
            </span>
            <h3 className="text-2xl font-bold text-slate-800">
              R$ {(isCommerce ? totalCommerceRevenue : isDual ? (totalWorkshopRevenue + totalCommerceRevenue) : totalWorkshopRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-emerald-500 font-medium">Receita confirmada</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* GRID CHARTS & STATUS DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing Evolution Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4" id="billing-chart-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 font-display">
              {isCommerce ? 'Evolução Mensal das Vendas' : isDual ? 'Evolução de Faturamento (Oficina & Comércio)' : 'Evolução Mensal do Faturamento'}
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-medium">Ano Corrente (2026)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={billingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(value) => `R$${value}`} />
                <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
                {isCommerce ? (
                  <Line type="monotone" dataKey="comercio" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} name="Vendas Comércio" />
                ) : isDual ? (
                  <>
                    <Line type="monotone" dataKey="oficina" stroke="#4f46e5" strokeWidth={2} name="Oficina" />
                    <Line type="monotone" dataKey="comercio" stroke="#10b981" strokeWidth={2} name="Comércio" />
                    <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} name="Total Geral" />
                  </>
                ) : (
                  <Line type="monotone" dataKey="oficina" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} name="Oficina" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status / Category Distribution Chart */}
        {!isCommerce ? (
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4" id="os-status-panel">
            <h3 className="text-sm font-semibold text-slate-800 font-display">Status das Ordens na Oficina</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={osByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(value: any) => [value, 'OS']} />
                  <Bar dataKey="Qtd" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4" id="sales-payment-methods-panel">
            <h3 className="text-sm font-semibold text-slate-800 font-display">Vendas por Forma de Pagamento</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']} />
                  <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* STOCK ALERTS & WORKFLOW GUIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4" id="stock-alerts-panel">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-800 font-display">
              {isCommerce ? 'Produtos com Estoque Baixo (Reposição)' : 'Alertas de Estoque de Peças'}
            </h3>
          </div>
          <p className="text-xs text-slate-500">Itens com quantidade menor que 5 unidades no estoque.</p>
          
          {lowStockParts.length === 0 ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-lg text-center font-medium">
              Excelente! Todos os itens estão com níveis adequados em estoque.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {lowStockParts.map(part => (
                <div key={part.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-800">{part.name}</p>
                      <p className="text-[10px] text-slate-400">Código: {part.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-500">{part.stock} un</p>
                    <p className="text-[10px] text-slate-400">R$ {part.price.toFixed(2)}/un</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow Overview */}
        <div className="bg-indigo-900/5 p-5 rounded-xl border border-indigo-50 space-y-3" id="quick-overview-panel">
          <div className="flex items-center gap-2 text-indigo-800">
            {isCommerce ? <Store className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            <h3 className="text-sm font-semibold text-indigo-950 font-display">
              {isCommerce ? 'Fluxo Comercial do Estabelecimento' : 'Mapeamento de Fluxo de Oficina'}
            </h3>
          </div>
          
          {isCommerce ? (
            <div className="flex items-center flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">Cliente</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">Balcão / PDV</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-medium">Produtos</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 font-bold">PIX / Cartão</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium">Comprovante / Cupom</span>
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">Cliente</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">Atendimento</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 font-medium">Orçamento</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium font-bold">Semáforo 🚦</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium">Ordem de Serviço</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-medium">Pagamento</span>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Painel configurado exclusivamente para o modelo <strong>{businessType}</strong>, garantindo visualização limpa e aderente às operações do negócio.
          </p>
          <div className="pt-2">
            <button 
              id="btn-nav-to-qa-from-widget"
              onClick={() => onNavigate('qa_panel')} 
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
            >
              Verificar Matriz de Testes e Homologação QA <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
