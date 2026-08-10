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
  PauseCircle,
  PlayCircle
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
  CartesianGrid 
} from 'recharts';
import { AppDatabase } from '../data/mockData';

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ db, onNavigate }: DashboardViewProps) {
  // Selected month for analysis (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');

  // Compute KPIs
  const totalClients = db.clients.length;
  const totalVehicles = db.vehicles.length;
  const totalBudgets = db.budgets.length;

  // Carros dentro da oficina ainda com o reparo em andamento ou pendente
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

  // Breakdown of cars inside workshop
  const greenCount = db.serviceOrders.filter(os => os.status !== 'canceled' && (os.workshopStatus === 'green' || os.workshopStatus === 'red' || (os.status === 'executing' && os.workshopStatus !== 'yellow' && os.workshopStatus !== 'blue'))).length;
  const yellowCount = db.serviceOrders.filter(os => os.status !== 'canceled' && os.workshopStatus === 'yellow').length;
  const grayCount = db.serviceOrders.filter(os => os.status !== 'canceled' && (os.workshopStatus === 'gray' || (os.status === 'pending' && !os.workshopStatus))).length;
  const blueCount = db.serviceOrders.filter(os => os.status !== 'canceled' && (os.workshopStatus === 'blue' || (os.status === 'completed' && !os.workshopStatus))).length;

  // Filter service orders for selected month
  const monthOrders = db.serviceOrders.filter(os => {
    const osDate = os.serviceDate || os.startedAt || os.createdAt || '';
    return osDate.startsWith(selectedMonth);
  });

  // Unique vehicles serviced in the selected month
  const uniqueVehiclesInMonth = new Set(monthOrders.map(os => os.vehicleId)).size;

  // Total revenue in selected month
  const monthRevenue = monthOrders
    .filter(os => os.paymentStatus === 'paid')
    .reduce((sum, os) => {
      const osTotal = os.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0);
      return sum + osTotal;
    }, 0);

  // Overall Total Revenue
  const totalRevenue = db.serviceOrders
    .filter(os => os.paymentStatus === 'paid')
    .reduce((sum, os) => {
      const osTotal = os.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0);
      return sum + osTotal;
    }, 0);

  // Check low stock
  const lowStockParts = db.parts.filter(part => part.stock < 5);

  // Portuguese Month Labels for Combobox
  const MONTH_OPTIONS = [
    { value: '2026-07', label: 'Julho 2026 (Mês Atual)' },
    { value: '2026-06', label: 'Junho 2026' },
    { value: '2026-05', label: 'Maio 2026' },
    { value: '2026-04', label: 'Abril 2026' },
    { value: '2026-03', label: 'Março 2026' },
    { value: '2026-02', label: 'Fevereiro 2026' },
    { value: '2026-01', label: 'Janeiro 2026' },
    { value: '2025-12', label: 'Dezembro 2025' }
  ];

  const selectedMonthLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  // Chart 1: Faturamento mensal
  const billingData = [
    { name: 'Jan', faturamento: 4200 },
    { name: 'Fev', faturamento: 5800 },
    { name: 'Mar', faturamento: 6100 },
    { name: 'Abr', faturamento: 7400 },
    { name: 'Mai', faturamento: 8200 },
    { name: 'Jun', faturamento: 9500 },
    { name: 'Jul', faturamento: totalRevenue }
  ];

  // Chart 2: Ordens de Serviço por Status
  const osByStatus = [
    { name: 'Pendentes (Cinza)', Qtd: grayCount },
    { name: 'Pausadas (Amarelo)', Qtd: yellowCount },
    { name: 'Em Execução (Verde)', Qtd: greenCount },
    { name: 'Liberados (Azul)', Qtd: blueCount }
  ];

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-view-container">
      {/* Welcome Title & Month Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Dashboard da Oficina
          </h1>
          <p className="text-sm text-slate-500">Resumo operacional, monitor de reparos na oficina e métricas por mês.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Analysis Selector Combobox */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Mês de Análise:</span>
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

          <button 
            id="btn-quick-new-budget"
            onClick={() => onNavigate('budgets')} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition shadow-2xs"
          >
            <FileText className="w-4 h-4" /> Novo Orçamento
          </button>
          <button 
            id="btn-quick-qa-portfolio"
            onClick={() => onNavigate('qa')} 
            className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-emerald-700 transition shadow-2xs"
          >
            <TrendingUp className="w-4 h-4" /> Portfólio QA (PRD/Testes)
          </button>
        </div>
      </div>

      {/* Featured Operational Highlight Cards: Workshop In-Progress & Selected Month Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Carros na Oficina com Reparo em Andamento */}
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
              Sinalizador da Oficina: ⚪ Cinza, 🟡 Amarelo, 🟢 Verde (Em Andamento), 🔵 Azul (Liberado)
            </p>
            <button
              id="btn-goto-workshop-monitor-dashboard"
              onClick={() => onNavigate('serviceOrders')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1 shadow-sm"
            >
              Abrir Monitor 🚦 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: Total de Veículos no Mês Selecionado (Combobox Analysis) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4" id="kpi-month-vehicles-analysis">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Análise Mensal da Oficina</span>
                <h3 className="text-sm font-bold text-slate-800">{selectedMonthLabel}</h3>
              </div>
            </div>

            {/* Combobox inline selector */}
            <div className="flex items-center gap-1">
              <select
                id="select-kpi-month-combobox"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium">Total de Veículos no Mês:</span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-extrabold text-slate-900 font-display">{uniqueVehiclesInMonth}</h2>
                <span className="text-xs text-indigo-600 font-semibold">{monthOrders.length} OSs geradas</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium">Faturamento do Mês:</span>
              <div className="flex items-baseline gap-1">
                <h2 className="text-2xl font-bold text-emerald-600 font-display">
                  R$ {monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-0.5"
            >
              Ver Ordens <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* General KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clientes */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-clients">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clientes Cadastrados</span>
            <h3 className="text-2xl font-bold text-slate-800">{totalClients}</h3>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Base de clientes
            </span>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Total Veículos na Frota */}
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

        {/* Orçamentos Criados */}
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

        {/* Faturamento Confirmado Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between" id="kpi-revenue">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Faturamento Acumulado</span>
            <h3 className="text-2xl font-bold text-slate-800">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[10px] text-emerald-500 font-medium">Apenas OS Pagas</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid Charts & Alert Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing Evolution */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4" id="billing-chart-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 font-display">Evolução Mensal do Faturamento</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-medium">Ano Corrente (2026)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={billingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(value) => `R$${value}`} />
                <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']} />
                <Line type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OS Status Distribution */}
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
      </div>

      {/* Stock Alerts & Quick Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4" id="stock-alerts-panel">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-800 font-display">Alertas de Estoque Baixo</h3>
          </div>
          <p className="text-xs text-slate-500">Itens com quantidade menor que 5 unidades no estoque.</p>
          
          {lowStockParts.length === 0 ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-lg text-center font-medium">
              Excelente! Todas as peças estão com níveis adequados em estoque.
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

        {/* Flow & Portfólio QA Overview */}
        <div className="bg-indigo-900/5 p-5 rounded-xl border border-indigo-50 space-y-3" id="quick-overview-panel">
          <div className="flex items-center gap-2 text-indigo-800">
            <Wrench className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-indigo-950 font-display">Mapeamento de Fluxo de Serviço</h3>
          </div>
          <div className="flex items-center flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">Cliente</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">Atendimento</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 font-medium">Orçamento</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium font-bold">Semáforo da Oficina 🚦</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium">Ordem de Serviço</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-medium">Pagamento & Histórico</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Painel atualizado com o <strong>Monitor da Oficina (Semáforo)</strong> e <strong>Análise por Mês via Combobox</strong>.
          </p>
          <div className="pt-2">
            <button 
              id="btn-nav-to-qa-from-widget"
              onClick={() => onNavigate('qa')} 
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
            >
              Verificar Matriz de Rastreabilidade e PRD <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

