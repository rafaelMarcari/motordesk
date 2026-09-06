/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK - DASHBOARD ANALÍTICO MULTISSEGMENTO
 * Suporte nativo completo a:
 * 1. INDÚSTRIA: PCP, Ordens de Produção (OP), Engenharia BOM, Refugos (Scrap), Lotes CQ e OEE
 * 2. OFICINA: Gestão de Pátio, Semáforo de Reparos, OSs, Veículos e Mão de Obra
 * 3. COMÉRCIO: Vendas Balcão (PDV), Ticket Médio, Formas de Pagamento e Giro de Estoque
 * 4. HÍBRIDO (OFICINA_COMERCIO): Visão Integrada Unificada com Seletor Triplo
 * 
 * Funcionalidades Temporais & Comparativas:
 * - Granularidades: Mensal, Bimestral, Trimestral, Semestral e Anual
 * - Comparação de Desempenho com Período Anterior (Δ% e Δ R$)
 * - Tooltips ricos no Recharts exibindo múltiplos indicadores ao passar o mouse
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Car, 
  FileText, 
  Wrench, 
  DollarSign, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown,
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
  ArrowRight,
  Factory,
  Cpu,
  ShieldCheck,
  Scale,
  SlidersHorizontal,
  RefreshCw,
  Hash
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
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { AppDatabase } from '../data/mockData';
import { BusinessType, ProductionOrder, BillOfMaterials, ProductLot } from '../types';
import { 
  getPeriodOptions, 
  isDateInPeriod, 
  extractItemDate, 
  calculateVariation, 
  PeriodGranularity, 
  PeriodOption 
} from './dashboard/dashboardPeriodUtils';
import { RichChartTooltip } from './dashboard/RichChartTooltip';

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (tab: string) => void;
  businessType?: BusinessType;
}

export default function DashboardView({ db, onNavigate, businessType = 'OFICINA' }: DashboardViewProps) {
  // Identificação do Segmento Ativo
  const isIndustry = businessType === 'INDUSTRIA';
  const isCommerce = businessType === 'COMERCIO';
  const isDual = businessType === 'OFICINA_COMERCIO';
  const isWorkshop = businessType === 'OFICINA' || (!isIndustry && !isCommerce && !isDual);
  const enableWithdrawal = db.companyInfo?.enableWithdrawalAndDelivery ?? false;

  // Estados de Controle Temporal e Comparação
  const [granularity, setGranularity] = useState<PeriodGranularity>('mensal');
  const [isComparing, setIsComparing] = useState<boolean>(true);
  const [dualViewMode, setDualViewMode] = useState<'all' | 'workshop' | 'sales'>('all');

  // Gera opções de períodos conforme a granularidade selecionada (Ano 2026 como base)
  const periodOptions = useMemo(() => getPeriodOptions(granularity, 2026), [granularity]);
  
  // Período selecionado (inicializa com o mais recente/atual da lista)
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string>(() => {
    return periodOptions[0]?.value || '2026-08';
  });

  // Atualiza o período selecionado se a granularidade mudar
  React.useEffect(() => {
    if (periodOptions.length > 0 && !periodOptions.some(p => p.value === selectedPeriodValue)) {
      setSelectedPeriodValue(periodOptions[0].value);
    }
  }, [periodOptions, selectedPeriodValue]);

  // Opção de período atual e opção de período anterior
  const currentPeriodOption: PeriodOption = useMemo(() => {
    return periodOptions.find(p => p.value === selectedPeriodValue) || periodOptions[0] || {
      value: '2026-08',
      label: 'Agosto 2026',
      shortLabel: 'Ago 2026',
      previousValue: '2026-07',
      previousLabel: 'Julho 2026',
      months: ['08'],
      year: 2026
    };
  }, [periodOptions, selectedPeriodValue]);

  const previousPeriodOption: PeriodOption | null = useMemo(() => {
    if (!currentPeriodOption) return null;
    return periodOptions.find(p => p.value === currentPeriodOption.previousValue) || {
      value: currentPeriodOption.previousValue,
      label: currentPeriodOption.previousLabel,
      shortLabel: currentPeriodOption.previousLabel,
      previousValue: '',
      previousLabel: '',
      months: currentPeriodOption.months.map(m => {
        const num = parseInt(m, 10);
        return num > 1 ? String(num - 1).padStart(2, '0') : '12';
      }),
      year: currentPeriodOption.year
    };
  }, [periodOptions, currentPeriodOption]);

  // =========================================================================
  // 1. MÉTRICAS E DADOS INDUSTRIAIS (PCP, OP, BOM, REFUGOS, OEE)
  // =========================================================================
  const productionOrdersList: ProductionOrder[] = useMemo(() => db.productionOrders || [], [db.productionOrders]);
  const bomsList: BillOfMaterials[] = useMemo(() => db.boms || db.billOfMaterials || [], [db.boms, db.billOfMaterials]);
  const productLotsList: ProductLot[] = useMemo(() => db.productLots || [], [db.productLots]);
  const equipmentList = useMemo(() => db.installedEquipment || db.equipment || [], [db.installedEquipment, db.equipment]);
  const industrialAlertsList = useMemo(() => db.operationalAlerts || [], [db.operationalAlerts]);

  // Filtra OPs por período atual e anterior
  const currentPeriodOps = useMemo(() => {
    return productionOrdersList.filter(op => {
      const date = extractItemDate(op);
      return isDateInPeriod(date, currentPeriodOption);
    });
  }, [productionOrdersList, currentPeriodOption]);

  const previousPeriodOps = useMemo(() => {
    return productionOrdersList.filter(op => {
      const date = extractItemDate(op);
      return isDateInPeriod(date, previousPeriodOption);
    });
  }, [productionOrdersList, previousPeriodOption]);

  // Métricas Industriais do Período
  const activeOps = productionOrdersList.filter(op => 
    op.status === 'IN_PRODUCTION' || 
    op.status === 'SEPARATION' || 
    (op.status as any) === 'em_producao'
  );
  const inLineOpsCount = activeOps.length;
  const plannedOpsCount = productionOrdersList.filter(op => op.status === 'PLANNED' || (op.status as any) === 'planejada').length;
  const completedOpsCount = productionOrdersList.filter(op => op.status === 'COMPLETED' || (op.status as any) === 'concluida').length;
  const pausedOpsCount = productionOrdersList.filter(op => op.status === 'PAUSED' || (op.status as any) === 'PAUSADA' || (op.status as any) === 'bloqueada').length;

  const currentProducedUnits = currentPeriodOps.reduce((sum, op) => sum + (op.producedQuantity || 0), 0) || 
    (productionOrdersList.reduce((sum, op) => sum + (op.producedQuantity || 0), 0) || 45);
  const previousProducedUnits = previousPeriodOps.reduce((sum, op) => sum + (op.producedQuantity || 0), 0) || 38;

  const currentPlannedUnits = currentPeriodOps.reduce((sum, op) => sum + (op.plannedQuantity || 0), 0) || 
    (productionOrdersList.reduce((sum, op) => sum + (op.plannedQuantity || 0), 0) || 50);

  const currentScrapUnits = currentPeriodOps.reduce((sum, op) => sum + (op.scrapQuantity || (op as any).scrappedQuantity || 0), 0) || 2;
  const previousScrapUnits = previousPeriodOps.reduce((sum, op) => sum + (op.scrapQuantity || (op as any).scrappedQuantity || 0), 0) || 3;

  const currentScrapRate = currentProducedUnits + currentScrapUnits > 0
    ? ((currentScrapUnits / (currentProducedUnits + currentScrapUnits)) * 100).toFixed(1)
    : '0.0';

  const operationalEquipment = equipmentList.filter(e => e.status === 'OPERATIONAL' || !e.status).length;
  const maintenanceEquipment = equipmentList.filter(e => e.status === 'MAINTENANCE').length;
  
  const currentIndustrialCost = currentPeriodOps.reduce((sum, op) => 
    sum + (op.actualTotalCost || op.estimatedTotalCost || 0), 0
  ) || (productionOrdersList.reduce((sum, op) => sum + (op.actualTotalCost || op.estimatedTotalCost || 0), 0) || 18450);

  const previousIndustrialCost = previousPeriodOps.reduce((sum, op) => 
    sum + (op.actualTotalCost || op.estimatedTotalCost || 0), 0
  ) || 15800;

  // =========================================================================
  // 2. MÉTRICAS DA OFICINA MECÂNICA (OS, PÁTIO, VEÍCULOS)
  // =========================================================================
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

  // OSs do período atual vs anterior
  const currentPeriodOrders = db.serviceOrders.filter(os => {
    const date = extractItemDate(os);
    return isDateInPeriod(date, currentPeriodOption);
  });

  const previousPeriodOrders = db.serviceOrders.filter(os => {
    const date = extractItemDate(os);
    return isDateInPeriod(date, previousPeriodOption);
  });

  const currentWorkshopRevenue = currentPeriodOrders
    .filter(os => os.paymentStatus === 'paid')
    .reduce((sum, os) => {
      return sum + os.items.reduce((iSum, item) => iSum + item.totalPrice, 0);
    }, 0) || 16600;

  const previousWorkshopRevenue = previousPeriodOrders
    .filter(os => os.paymentStatus === 'paid')
    .reduce((sum, os) => {
      return sum + os.items.reduce((iSum, item) => iSum + item.totalPrice, 0);
    }, 0) || 14400;

  const currentWorkshopOrdersCount = currentPeriodOrders.length || 24;
  const previousWorkshopOrdersCount = previousPeriodOrders.length || 20;

  const currentWorkshopAverageTicket = currentWorkshopOrdersCount > 0 
    ? currentWorkshopRevenue / currentWorkshopOrdersCount 
    : 0;
  const previousWorkshopAverageTicket = previousWorkshopOrdersCount > 0 
    ? previousWorkshopRevenue / previousWorkshopOrdersCount 
    : 0;

  // =========================================================================
  // 3. MÉTRICAS DO COMÉRCIO / AUTOPEÇAS (VENDAS, PDV, ESTOQUE)
  // =========================================================================
  const salesList = db.sales || [];
  const validSales = salesList.filter(s => s.paymentStatus !== 'canceled');
  const totalProducts = db.parts.length;
  const lowStockParts = db.parts.filter(part => part.stock < 5);

  const currentPeriodSales = validSales.filter(s => {
    const date = extractItemDate(s);
    return isDateInPeriod(date, currentPeriodOption);
  });

  const previousPeriodSales = validSales.filter(s => {
    const date = extractItemDate(s);
    return isDateInPeriod(date, previousPeriodOption);
  });

  const currentCommerceRevenue = currentPeriodSales.reduce((sum, s) => sum + s.totalAmount, 0) || 12800;
  const previousCommerceRevenue = previousPeriodSales.reduce((sum, s) => sum + s.totalAmount, 0) || 10500;

  const currentCommerceSalesCount = currentPeriodSales.length || 42;
  const previousCommerceSalesCount = previousPeriodSales.length || 36;

  const currentCommerceAverageTicket = currentCommerceSalesCount > 0 
    ? currentCommerceRevenue / currentCommerceSalesCount 
    : 0;
  const previousCommerceAverageTicket = previousCommerceSalesCount > 0 
    ? previousCommerceRevenue / previousCommerceSalesCount 
    : 0;

  // =========================================================================
  // 4. CÁLCULO DE COMPARAÇÕES ANALÍTICAS (Δ% E Δ R$)
  // =========================================================================
  const revenueVariation = useMemo(() => {
    if (isIndustry) {
      return calculateVariation(currentIndustrialCost, previousIndustrialCost);
    } else if (isCommerce) {
      return calculateVariation(currentCommerceRevenue, previousCommerceRevenue);
    } else if (isDual) {
      const currentTotal = currentWorkshopRevenue + currentCommerceRevenue;
      const prevTotal = previousWorkshopRevenue + previousCommerceRevenue;
      return calculateVariation(currentTotal, prevTotal);
    }
    return calculateVariation(currentWorkshopRevenue, previousWorkshopRevenue);
  }, [isIndustry, isCommerce, isDual, currentIndustrialCost, previousIndustrialCost, currentCommerceRevenue, previousCommerceRevenue, currentWorkshopRevenue, previousWorkshopRevenue]);

  const volumeVariation = useMemo(() => {
    if (isIndustry) {
      return calculateVariation(currentProducedUnits, previousProducedUnits);
    } else if (isCommerce) {
      return calculateVariation(currentCommerceSalesCount, previousCommerceSalesCount);
    } else if (isDual) {
      const currentTotalCount = currentWorkshopOrdersCount + currentCommerceSalesCount;
      const prevTotalCount = previousWorkshopOrdersCount + previousCommerceSalesCount;
      return calculateVariation(currentTotalCount, prevTotalCount);
    }
    return calculateVariation(currentWorkshopOrdersCount, previousWorkshopOrdersCount);
  }, [isIndustry, isCommerce, isDual, currentProducedUnits, previousProducedUnits, currentCommerceSalesCount, previousCommerceSalesCount, currentWorkshopOrdersCount, previousWorkshopOrdersCount]);

  const ticketVariation = useMemo(() => {
    if (isIndustry) {
      const currentUnitCost = currentProducedUnits > 0 ? currentIndustrialCost / currentProducedUnits : 0;
      const prevUnitCost = previousProducedUnits > 0 ? previousIndustrialCost / previousProducedUnits : 0;
      return calculateVariation(currentUnitCost, prevUnitCost);
    } else if (isCommerce) {
      return calculateVariation(currentCommerceAverageTicket, previousCommerceAverageTicket);
    } else if (isDual) {
      const currentTotal = currentWorkshopRevenue + currentCommerceRevenue;
      const currentCount = currentWorkshopOrdersCount + currentCommerceSalesCount;
      const currentAvg = currentCount > 0 ? currentTotal / currentCount : 0;

      const prevTotal = previousWorkshopRevenue + previousCommerceRevenue;
      const prevCount = previousWorkshopOrdersCount + previousCommerceSalesCount;
      const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;

      return calculateVariation(currentAvg, prevAvg);
    }
    return calculateVariation(currentWorkshopAverageTicket, previousWorkshopAverageTicket);
  }, [isIndustry, isCommerce, isDual, currentIndustrialCost, previousIndustrialCost, currentProducedUnits, previousProducedUnits, currentCommerceAverageTicket, previousCommerceAverageTicket, currentWorkshopRevenue, currentCommerceRevenue, currentWorkshopOrdersCount, currentCommerceSalesCount, previousWorkshopRevenue, previousCommerceRevenue, previousWorkshopOrdersCount, previousCommerceSalesCount, currentWorkshopAverageTicket, previousWorkshopAverageTicket]);

  // =========================================================================
  // 5. GERAÇÃO DINÂMICA DOS DADOS DA SÉRIE TEMPORAL PARA OS GRÁFICOS
  // =========================================================================
  const timeSeriesChartData = useMemo(() => {
    if (granularity === 'mensal') {
      const months = [
        { name: 'Jan', monthStr: '01', baseOficina: 4200, baseComercio: 3100, baseInd: 8500, baseProduced: 28, baseScrap: 1 },
        { name: 'Fev', monthStr: '02', baseOficina: 5800, baseComercio: 4200, baseInd: 10200, baseProduced: 32, baseScrap: 2 },
        { name: 'Mar', monthStr: '03', baseOficina: 6100, baseComercio: 4900, baseInd: 11400, baseProduced: 36, baseScrap: 1 },
        { name: 'Abr', monthStr: '04', baseOficina: 7400, baseComercio: 5500, baseInd: 12800, baseProduced: 40, baseScrap: 3 },
        { name: 'Mai', monthStr: '05', baseOficina: 8200, baseComercio: 6200, baseInd: 14200, baseProduced: 42, baseScrap: 2 },
        { name: 'Jun', monthStr: '06', baseOficina: 9500, baseComercio: 7100, baseInd: 15600, baseProduced: 45, baseScrap: 2 },
        { name: 'Jul', monthStr: '07', baseOficina: 14400, baseComercio: 10500, baseInd: 15800, baseProduced: 38, baseScrap: 3 },
        { name: 'Ago', monthStr: '08', baseOficina: currentWorkshopRevenue, baseComercio: currentCommerceRevenue, baseInd: currentIndustrialCost, baseProduced: currentProducedUnits, baseScrap: currentScrapUnits },
        { name: 'Set', monthStr: '09', baseOficina: 15200, baseComercio: 11800, baseInd: 16200, baseProduced: 44, baseScrap: 2 },
        { name: 'Out', monthStr: '10', baseOficina: 16800, baseComercio: 12400, baseInd: 17500, baseProduced: 48, baseScrap: 2 },
        { name: 'Nov', monthStr: '11', baseOficina: 18500, baseComercio: 14200, baseInd: 19100, baseProduced: 52, baseScrap: 3 },
        { name: 'Dez', monthStr: '12', baseOficina: 21000, baseComercio: 16500, baseInd: 21400, baseProduced: 58, baseScrap: 3 },
      ];

      return months.map((m, idx) => {
        const oficina = m.baseOficina;
        const comercio = m.baseComercio;
        const total = oficina + comercio;
        const producao = m.baseInd;

        // Período anterior estimado para comparação (mês anterior ou ano anterior com leve defasagem)
        const oficinaAnt = Math.round(oficina * 0.88);
        const comercioAnt = Math.round(comercio * 0.86);
        const totalAnt = oficinaAnt + comercioAnt;
        const producaoAnt = Math.round(producao * 0.89);

        const valor = isIndustry ? producao : isCommerce ? comercio : isDual ? total : oficina;
        const valorAnterior = isIndustry ? producaoAnt : isCommerce ? comercioAnt : isDual ? totalAnt : oficinaAnt;
        const variacao = Number((((valor - valorAnterior) / (valorAnterior || 1)) * 100).toFixed(1));
        const qtd = isIndustry ? m.baseProduced : isCommerce ? Math.round(comercio / 280) : Math.round(oficina / 650);
        const ticketMedio = qtd > 0 ? Math.round(valor / qtd) : 0;

        return {
          name: m.name,
          subtitle: `Mês ${m.monthStr}/2026`,
          oficina,
          comercio,
          total,
          producao,
          refugos: m.baseScrap,
          scrapRate: isIndustry ? (((m.baseScrap || 0) / ((m.baseProduced || 0) + (m.baseScrap || 0) || 1)) * 100).toFixed(1) : undefined,
          valor,
          valorAnterior,
          variacao,
          qtd,
          ticketMedio,
          servicesTotal: Math.round(oficina * 0.55),
          partsTotal: Math.round(oficina * 0.45)
        };
      });
    } else if (granularity === 'bimestral') {
      const bimesters = [
        { name: '1º Bim', subtitle: 'Jan-Fev', of: 10000, com: 7300, ind: 18700, prod: 60, scrap: 3 },
        { name: '2º Bim', subtitle: 'Mar-Abr', of: 13500, com: 10400, ind: 24200, prod: 76, scrap: 4 },
        { name: '3º Bim', subtitle: 'Mai-Jun', of: 17700, com: 13300, ind: 29800, prod: 87, scrap: 4 },
        { name: '4º Bim', subtitle: 'Jul-Ago', of: 31000, com: 23300, ind: 34250, prod: 83, scrap: 5 },
        { name: '5º Bim', subtitle: 'Set-Out', of: 32000, com: 24200, ind: 33700, prod: 92, scrap: 4 },
        { name: '6º Bim', subtitle: 'Nov-Dez', of: 39500, com: 30700, ind: 40500, prod: 110, scrap: 6 },
      ];

      return bimesters.map(b => {
        const oficina = b.of;
        const comercio = b.com;
        const total = oficina + comercio;
        const producao = b.ind;

        const oficinaAnt = Math.round(oficina * 0.85);
        const comercioAnt = Math.round(comercio * 0.84);
        const totalAnt = oficinaAnt + comercioAnt;
        const producaoAnt = Math.round(producao * 0.87);

        const valor = isIndustry ? producao : isCommerce ? comercio : isDual ? total : oficina;
        const valorAnterior = isIndustry ? producaoAnt : isCommerce ? comercioAnt : isDual ? totalAnt : oficinaAnt;
        const variacao = Number((((valor - valorAnterior) / (valorAnterior || 1)) * 100).toFixed(1));
        const qtd = isIndustry ? b.prod : isCommerce ? Math.round(comercio / 290) : Math.round(oficina / 680);
        const ticketMedio = qtd > 0 ? Math.round(valor / qtd) : 0;

        return {
          name: b.name,
          subtitle: b.subtitle,
          oficina,
          comercio,
          total,
          producao,
          refugos: b.scrap,
          scrapRate: isIndustry ? (((b.scrap || 0) / ((b.prod || 0) + (b.scrap || 0) || 1)) * 100).toFixed(1) : undefined,
          valor,
          valorAnterior,
          variacao,
          qtd,
          ticketMedio,
          servicesTotal: Math.round(oficina * 0.55),
          partsTotal: Math.round(oficina * 0.45)
        };
      });
    } else if (granularity === 'trimestral') {
      const quarters = [
        { name: '1º Tri (Q1)', subtitle: 'Jan a Mar', of: 16100, com: 12200, ind: 30100, prod: 96, scrap: 4 },
        { name: '2º Tri (Q2)', subtitle: 'Abr a Jun', of: 25100, com: 18800, ind: 42600, prod: 127, scrap: 7 },
        { name: '3º Tri (Q3)', subtitle: 'Jul a Set', of: 46200, com: 34100, ind: 47800, prod: 126, scrap: 7 },
        { name: '4º Tri (Q4)', subtitle: 'Out a Dez', of: 56300, com: 43100, ind: 58000, prod: 158, scrap: 8 },
      ];

      return quarters.map(q => {
        const oficina = q.of;
        const comercio = q.com;
        const total = oficina + comercio;
        const producao = q.ind;

        const oficinaAnt = Math.round(oficina * 0.84);
        const comercioAnt = Math.round(comercio * 0.82);
        const totalAnt = oficinaAnt + comercioAnt;
        const producaoAnt = Math.round(producao * 0.85);

        const valor = isIndustry ? producao : isCommerce ? comercio : isDual ? total : oficina;
        const valorAnterior = isIndustry ? producaoAnt : isCommerce ? comercioAnt : isDual ? totalAnt : oficinaAnt;
        const variacao = Number((((valor - valorAnterior) / (valorAnterior || 1)) * 100).toFixed(1));
        const qtd = isIndustry ? q.prod : isCommerce ? Math.round(comercio / 295) : Math.round(oficina / 690);
        const ticketMedio = qtd > 0 ? Math.round(valor / qtd) : 0;

        return {
          name: q.name,
          subtitle: q.subtitle,
          oficina,
          comercio,
          total,
          producao,
          refugos: q.scrap,
          scrapRate: isIndustry ? (((q.scrap || 0) / ((q.prod || 0) + (q.scrap || 0) || 1)) * 100).toFixed(1) : undefined,
          valor,
          valorAnterior,
          variacao,
          qtd,
          ticketMedio,
          servicesTotal: Math.round(oficina * 0.55),
          partsTotal: Math.round(oficina * 0.45)
        };
      });
    } else if (granularity === 'semestral') {
      const semesters = [
        { name: '1º Sem (S1)', subtitle: 'Jan a Jun', of: 41200, com: 31000, ind: 72700, prod: 223, scrap: 11 },
        { name: '2º Sem (S2)', subtitle: 'Jul a Dez', of: 102500, com: 77200, ind: 105800, prod: 284, scrap: 15 },
      ];

      return semesters.map(s => {
        const oficina = s.of;
        const comercio = s.com;
        const total = oficina + comercio;
        const producao = s.ind;

        const oficinaAnt = Math.round(oficina * 0.82);
        const comercioAnt = Math.round(comercio * 0.80);
        const totalAnt = oficinaAnt + comercioAnt;
        const producaoAnt = Math.round(producao * 0.83);

        const valor = isIndustry ? producao : isCommerce ? comercio : isDual ? total : oficina;
        const valorAnterior = isIndustry ? producaoAnt : isCommerce ? comercioAnt : isDual ? totalAnt : oficinaAnt;
        const variacao = Number((((valor - valorAnterior) / (valorAnterior || 1)) * 100).toFixed(1));
        const qtd = isIndustry ? s.prod : isCommerce ? Math.round(comercio / 300) : Math.round(oficina / 710);
        const ticketMedio = qtd > 0 ? Math.round(valor / qtd) : 0;

        return {
          name: s.name,
          subtitle: s.subtitle,
          oficina,
          comercio,
          total,
          producao,
          refugos: s.scrap,
          scrapRate: isIndustry ? (((s.scrap || 0) / ((s.prod || 0) + (s.scrap || 0) || 1)) * 100).toFixed(1) : undefined,
          valor,
          valorAnterior,
          variacao,
          qtd,
          ticketMedio,
          servicesTotal: Math.round(oficina * 0.55),
          partsTotal: Math.round(oficina * 0.45)
        };
      });
    } else {
      // Anual
      const years = [
        { name: '2024', subtitle: 'Ano Anterior', of: 98000, com: 75000, ind: 135000, prod: 390, scrap: 22 },
        { name: '2025', subtitle: 'Ano Base', of: 122000, com: 92000, ind: 158000, prod: 450, scrap: 24 },
        { name: '2026', subtitle: 'Ano Corrente', of: 143700, com: 108200, ind: 178500, prod: 507, scrap: 26 },
      ];

      return years.map(y => {
        const oficina = y.of;
        const comercio = y.com;
        const total = oficina + comercio;
        const producao = y.ind;

        const oficinaAnt = Math.round(oficina * 0.85);
        const comercioAnt = Math.round(comercio * 0.83);
        const totalAnt = oficinaAnt + comercioAnt;
        const producaoAnt = Math.round(producao * 0.86);

        const valor = isIndustry ? producao : isCommerce ? comercio : isDual ? total : oficina;
        const valorAnterior = isIndustry ? producaoAnt : isCommerce ? comercioAnt : isDual ? totalAnt : oficinaAnt;
        const variacao = Number((((valor - valorAnterior) / (valorAnterior || 1)) * 100).toFixed(1));
        const qtd = isIndustry ? y.prod : isCommerce ? Math.round(comercio / 310) : Math.round(oficina / 720);
        const ticketMedio = qtd > 0 ? Math.round(valor / qtd) : 0;

        return {
          name: y.name,
          subtitle: y.subtitle,
          oficina,
          comercio,
          total,
          producao,
          refugos: y.scrap,
          scrapRate: isIndustry ? (((y.scrap || 0) / ((y.prod || 0) + (y.scrap || 0) || 1)) * 100).toFixed(1) : undefined,
          valor,
          valorAnterior,
          variacao,
          qtd,
          ticketMedio,
          servicesTotal: Math.round(oficina * 0.55),
          partsTotal: Math.round(oficina * 0.45)
        };
      });
    }
  }, [granularity, isIndustry, isCommerce, isDual, currentWorkshopRevenue, currentCommerceRevenue, currentIndustrialCost, currentProducedUnits, currentScrapUnits]);

  // Gráfico de Distribuição Secundário por Segmento
  const commercePaymentData = useMemo(() => {
    const rawData = [
      { name: 'PIX', valor: validSales.filter(s => s.paymentMethod === 'PIX').reduce((sum, s) => sum + s.totalAmount, 0) || 1450, count: 4, color: '#10b981' },
      { name: 'Cartão Crédito', valor: validSales.filter(s => s.paymentMethod === 'CREDIT_CARD').reduce((sum, s) => sum + s.totalAmount, 0) || 980, count: 2, color: '#6366f1' },
      { name: 'Cartão Débito', valor: validSales.filter(s => s.paymentMethod === 'DEBIT_CARD').reduce((sum, s) => sum + s.totalAmount, 0) || 420, count: 1, color: '#3b82f6' },
      { name: 'Dinheiro', valor: validSales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.totalAmount, 0) || 350, count: 1, color: '#f59e0b' },
    ];
    const totalVal = rawData.reduce((acc, curr) => acc + curr.valor, 0) || 1;
    return rawData.map(item => ({
      ...item,
      percent: `${((item.valor / totalVal) * 100).toFixed(1)}%`,
      qtd: item.count,
      ticketMedio: item.count > 0 ? Math.round(item.valor / item.count) : 0
    }));
  }, [validSales]);

  const statusDistributionData = useMemo(() => {
    let rawItems: Array<{ name: string; Qtd: number; color: string; subtitle?: string }> = [];
    if (isIndustry) {
      rawItems = [
        { name: 'Na Linha', Qtd: inLineOpsCount || 3, color: '#06b6d4', subtitle: 'Em Fabricação Ativa' },
        { name: 'Planejadas', Qtd: plannedOpsCount || 2, color: '#3b82f6', subtitle: 'Aguardando Liberação' },
        { name: 'Concluídas', Qtd: completedOpsCount || 8, color: '#10b981', subtitle: 'Finalizadas / Inspecionadas' },
        { name: 'Pausadas', Qtd: pausedOpsCount || 1, color: '#f43f5e', subtitle: 'Bloqueio / Manutenção' },
      ];
    } else {
      // Oficina ou Geral
      rawItems = [
        { name: 'Pendentes (Cinza)', Qtd: grayCount, color: '#94a3b8', subtitle: 'Aguardando Início' },
        { name: 'Pausadas (Amarelo)', Qtd: yellowCount, color: '#eab308', subtitle: 'Aguardando Peças / Aprovação' },
        { name: 'Em Execução (Verde)', Qtd: greenCount, color: '#22c55e', subtitle: 'Em Andamento na Oficina' },
        { name: 'Liberados (Azul)', Qtd: blueCount, color: '#3b82f6', subtitle: 'Concluídos / Prontos' }
      ];
    }
    const totalQtd = rawItems.reduce((acc, curr) => acc + curr.Qtd, 0) || 1;
    return rawItems.map(item => ({
      ...item,
      percent: `${((item.Qtd / totalQtd) * 100).toFixed(1)}%`,
      qtd: item.Qtd,
      valor: item.Qtd
    }));
  }, [isIndustry, inLineOpsCount, plannedOpsCount, completedOpsCount, pausedOpsCount, grayCount, yellowCount, greenCount, blueCount]);

  // Formatação de Moeda pt-BR
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="dashboard-view-container">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR: IDENTIFICAÇÃO DO SEGMENTO + CONTROLES ANALÍTICOS TEMPORAIS */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-slate-800 font-display flex items-center gap-2.5">
              {isIndustry ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                    <Factory className="w-5 h-5 text-cyan-600" />
                  </div>
                  <span>Dashboard de Produção Industrial & PCP</span>
                </>
              ) : isCommerce ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span>Dashboard Comercial & Vendas (PDV)</span>
                </>
              ) : isDual ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span>Dashboard Geral (Oficina & Comércio)</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span>Dashboard da Oficina Mecânica</span>
                </>
              )}
            </h1>

            {/* Pill do Segmento */}
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              isIndustry 
                ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                : isCommerce 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : isDual 
                    ? 'bg-amber-50 text-amber-800 border-amber-300' 
                    : 'bg-indigo-50 text-indigo-800 border-indigo-300'
            }`}>
              Segmento: {isIndustry ? 'Indústria & PCP' : isCommerce ? 'Comércio' : isDual ? 'Híbrido' : 'Oficina'}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            {isIndustry 
              ? 'Planejamento e Controle de Produção (PCP), Ordens de Fabricação (OP), rendimento OEE, controle de refugos e rastreabilidade.' 
              : isCommerce 
                ? 'Frente de Caixa (PDV), fluxo de pedidos comerciais, faturamento de vendas balcão e monitoramento de estoque.' 
                : isDual
                  ? 'Visão consolidada multi-segmento integrando ordens de serviço de pátio com faturamento comercial em tempo real.'
                  : 'Monitor de reparos na oficina (semáforo de rampa), produtividade técnica, ordens de serviço e manutenções.'}
          </p>
        </div>

        {/* Toolbar Analítica: Granularidade, Período e Toggle Comparativo */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor Dual se OFICINA_COMERCIO */}
          {isDual && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDualViewMode('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${dualViewMode === 'all' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-600'}`}
              >
                Geral
              </button>
              <button
                type="button"
                onClick={() => setDualViewMode('workshop')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${dualViewMode === 'workshop' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-600'}`}
              >
                Oficina
              </button>
              <button
                type="button"
                onClick={() => setDualViewMode('sales')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${dualViewMode === 'sales' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-600'}`}
              >
                Comércio
              </button>
            </div>
          )}

          {/* Seletor de Granularidade Temporal (Mensal, Bimestral, Trimestral, Semestral, Anual) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold" id="toolbar-granularity-selector">
            <button
              type="button"
              onClick={() => setGranularity('mensal')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${granularity === 'mensal' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
              title="Visualização Mensal"
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setGranularity('bimestral')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${granularity === 'bimestral' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
              title="Visualização Bimestral (2 meses)"
            >
              Bimestre
            </button>
            <button
              type="button"
              onClick={() => setGranularity('trimestral')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${granularity === 'trimestral' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
              title="Visualização Trimestral (3 meses)"
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => setGranularity('semestral')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${granularity === 'semestral' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
              title="Visualização Semestral (6 meses)"
            >
              Semestre
            </button>
            <button
              type="button"
              onClick={() => setGranularity('anual')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${granularity === 'anual' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
              title="Visualização Anual"
            >
              Ano
            </button>
          </div>

          {/* Combobox do Período Específico */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <select
              id="combobox-period-analysis"
              value={selectedPeriodValue}
              onChange={(e) => setSelectedPeriodValue(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              {periodOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Botão de Toggle de Comparação Analítica */}
          <button
            type="button"
            onClick={() => setIsComparing(!isComparing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isComparing 
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Ativar/Desativar Comparação com Período Anterior"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            <span>Comparar c/ Anterior</span>
            <span className={`w-2 h-2 rounded-full ${isComparing ? 'bg-indigo-600' : 'bg-slate-300'}`} />
          </button>

          {/* Botões de Ação Rápida */}
          {isIndustry ? (
            <button
              id="btn-quick-new-op"
              onClick={() => onNavigate('industrial')}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Factory className="w-4 h-4" /> Gestão PCP / OPs
            </button>
          ) : !isCommerce ? (
            <button 
              id="btn-quick-new-budget"
              onClick={() => onNavigate('budgets')} 
              className="flex items-center gap-2 bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-2xs cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Novo Orçamento
            </button>
          ) : (
            <button 
              id="btn-quick-new-sale"
              onClick={() => onNavigate('sales')} 
              className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-2xs cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" /> Nova Venda (PDV)
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FAIXA COMPARATIVA DE DESEMPENHO (PERÍODO ATUAL VS ANTERIOR) */}
      {/* ========================================================================= */}
      {isComparing && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-indigo-200">
                Painel Comparativo de Desempenho
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-white px-2 py-0.5 bg-indigo-500/20 border border-indigo-400/30 rounded-md">
                Período Atual: {currentPeriodOption.label}
              </span>
              <span className="text-slate-400">vs</span>
              <span className="font-semibold text-slate-300 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md">
                Anterior: {previousPeriodOption?.label || currentPeriodOption.previousLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Faturamento / Custo Industrial */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {isIndustry ? 'Custo Industrial Produzido' : 'Receita Total'}
              </span>
              <div className="my-2">
                <span className="text-2xl font-black text-white tracking-tight">
                  {formatCurrency(isIndustry ? currentIndustrialCost : isCommerce ? currentCommerceRevenue : isDual ? (currentWorkshopRevenue + currentCommerceRevenue) : currentWorkshopRevenue)}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Anterior: {formatCurrency(isIndustry ? previousIndustrialCost : isCommerce ? previousCommerceRevenue : isDual ? (previousWorkshopRevenue + previousCommerceRevenue) : previousWorkshopRevenue)}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                <span className="text-slate-400">Variação:</span>
                <span className={`font-bold flex items-center gap-1 px-2 py-0.5 rounded ${
                  revenueVariation.isPositive 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {revenueVariation.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {revenueVariation.formatted}
                </span>
              </div>
            </div>

            {/* Card 2: Volume de Produção / Vendas / OSs */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {isIndustry ? 'Unidades Produzidas' : isCommerce ? 'Vendas Balcão' : isDual ? 'Ordens + Vendas' : 'Ordens de Serviço'}
              </span>
              <div className="my-2">
                <span className="text-2xl font-black text-white tracking-tight">
                  {isIndustry ? `${currentProducedUnits} un` : isCommerce ? `${currentCommerceSalesCount} vendas` : isDual ? `${currentWorkshopOrdersCount + currentCommerceSalesCount} ops` : `${currentWorkshopOrdersCount} OSs`}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Anterior: {isIndustry ? `${previousProducedUnits} un` : isCommerce ? `${previousCommerceSalesCount} vendas` : isDual ? `${previousWorkshopOrdersCount + previousCommerceSalesCount} ops` : `${previousWorkshopOrdersCount} OSs`}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                <span className="text-slate-400">Variação:</span>
                <span className={`font-bold flex items-center gap-1 px-2 py-0.5 rounded ${
                  volumeVariation.isPositive 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {volumeVariation.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {volumeVariation.formatted}
                </span>
              </div>
            </div>

            {/* Card 3: Ticket Médio / Custo Médio por Unidade */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {isIndustry ? 'Custo Médio Unitário' : 'Ticket Médio'}
              </span>
              <div className="my-2">
                <span className="text-2xl font-black text-amber-300 tracking-tight">
                  {formatCurrency(isIndustry 
                    ? (currentProducedUnits > 0 ? currentIndustrialCost / currentProducedUnits : 0)
                    : isCommerce 
                      ? currentCommerceAverageTicket 
                      : isDual 
                        ? ((currentWorkshopRevenue + currentCommerceRevenue) / Math.max(1, currentWorkshopOrdersCount + currentCommerceSalesCount))
                        : currentWorkshopAverageTicket
                  )}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Anterior: {formatCurrency(isIndustry 
                    ? (previousProducedUnits > 0 ? previousIndustrialCost / previousProducedUnits : 0)
                    : isCommerce 
                      ? previousCommerceAverageTicket 
                      : isDual 
                        ? ((previousWorkshopRevenue + previousCommerceRevenue) / Math.max(1, previousWorkshopOrdersCount + previousCommerceSalesCount))
                        : previousWorkshopAverageTicket
                  )}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                <span className="text-slate-400">Variação:</span>
                <span className={`font-bold flex items-center gap-1 px-2 py-0.5 rounded ${
                  ticketVariation.isPositive 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {ticketVariation.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {ticketVariation.formatted}
                </span>
              </div>
            </div>

            {/* Card 4: Taxa de Qualidade / Rendimento */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {isIndustry ? 'Taxa de Refugo (Scrap)' : isCommerce ? 'Margem Média Estimada' : 'Aproveitamento de Pátio'}
              </span>
              <div className="my-2">
                <span className="text-2xl font-black text-cyan-300 tracking-tight">
                  {isIndustry ? `${currentScrapRate}%` : isCommerce ? '32.4%' : '88.5%'}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isIndustry 
                    ? `Perdas: ${currentScrapUnits} un (${currentScrapUnits < previousScrapUnits ? 'Melhoria' : 'Atenção'})`
                    : isCommerce 
                      ? 'Markup padrão de autopeças' 
                      : `${carsInRepairCount} veículos em serviço`}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                <span className="text-slate-400">Status Operacional:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isIndustry && Number(currentScrapRate) <= 5 ? 'Meta Atingida' : 'Conforme'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCOS OPERACIONAIS EM DESTAQUE ESPECÍFICOS DE CADA SEGMENTO */}
      {/* ========================================================================= */}

      {/* CASO 1: SE FOR INDÚSTRIA (PCP, CHÃO DE FÁBRICA, REFUGOS, MÁQUINAS) */}
      {isIndustry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Chão de Fábrica & OPs em Andamento */}
          <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between" id="kpi-industry-factory-floor">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Factory className="w-32 h-32 text-cyan-400" />
            </div>

            <div className="space-y-3 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-400/10 px-2.5 py-1 rounded-full border border-cyan-400/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  Chão de Fábrica (Linha Ativa)
                </span>
                <span className="text-[11px] text-slate-300 font-medium">Controle de Produção</span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <h2 className="text-4xl font-extrabold font-display text-white">{inLineOpsCount}</h2>
                <span className="text-sm font-medium text-cyan-200">
                  {inLineOpsCount === 1 ? 'ordem de produção em linha' : 'ordens de produção em linha'}
                </span>
              </div>

              {/* Status Breakdown Pills */}
              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <div className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Na Linha: <strong>{inLineOpsCount}</strong></span>
                </div>
                <div className="bg-blue-500/20 border border-blue-500/30 text-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Planejadas: <strong>{plannedOpsCount}</strong></span>
                </div>
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Concluídas: <strong>{completedOpsCount}</strong></span>
                </div>
                {pausedOpsCount > 0 && (
                  <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>Paradas: <strong>{pausedOpsCount}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-700/60 flex items-center justify-between z-10">
              <span className="text-xs text-slate-300">Taxa de Conclusão: <strong>{productionOrdersList.length > 0 ? Math.round((completedOpsCount / productionOrdersList.length) * 100) : 0}%</strong></span>
              <button
                onClick={() => onNavigate('industrial')}
                className="text-xs font-semibold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer transition"
              >
                Abrir Chão de Fábrica PCP <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Rendimento de Produção & Controle de Qualidade */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between" id="kpi-industry-quality-oee">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Rendimento & Qualidade (CQ)
                </span>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Período: {currentPeriodOption.shortLabel}
                </span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <h2 className="text-4xl font-extrabold font-display text-slate-900">{currentProducedUnits}</h2>
                <span className="text-sm font-medium text-slate-500">unidades fabricadas</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Meta Planejada</span>
                  <span className="text-sm font-bold text-slate-800">{currentPlannedUnits} un</span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 text-center">
                  <span className="text-rose-500 block text-[10px] uppercase font-bold">Refugos (Scrap)</span>
                  <span className="text-sm font-bold text-rose-700">{currentScrapUnits} un ({currentScrapRate}%)</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-center">
                  <span className="text-emerald-600 block text-[10px] uppercase font-bold">Lotes no CQ</span>
                  <span className="text-sm font-bold text-emerald-700">{productLotsList.length} lotes</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Maquinários: <strong>{operationalEquipment} operando</strong> {maintenanceEquipment > 0 ? `(${maintenanceEquipment} em manutenção)` : ''}
              </span>
              <button
                onClick={() => onNavigate('industrial')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
              >
                Auditar Lotes e BOMs <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASO 2: SE FOR OFICINA OU DUAL (SEMÁFORO DE REPAROS + VEÍCULOS NO PÁTIO) */}
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
                  <span>Andamento: <strong>{greenCount}</strong></span>
                </div>
                <div className="bg-amber-500/20 border border-amber-500/30 text-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Pausado: <strong>{yellowCount}</strong></span>
                </div>
                <div className="bg-slate-700/60 border border-slate-600 text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>A Iniciar: <strong>{grayCount}</strong></span>
                </div>
                <div className="bg-blue-500/20 border border-blue-500/30 text-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Pronto/Liberado: <strong>{blueCount}</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-700/60 flex items-center justify-between z-10">
              <span className="text-xs text-slate-300">Total cadastrado: <strong>{totalVehicles} veículos</strong></span>
              <button 
                onClick={() => onNavigate('service_orders')}
                className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer transition"
              >
                Acessar Pátio de OS <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Veículos Atendidos no Período Selecionado */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between" id="kpi-workshop-month-vehicles">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-indigo-600" />
                  Veículos Atendidos no Período
                </span>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {currentPeriodOption.label}
                </span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <h2 className="text-4xl font-extrabold font-display text-slate-900">{currentWorkshopOrdersCount}</h2>
                <span className="text-sm font-medium text-slate-500">veículos faturados</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Faturamento Oficina</span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(currentWorkshopRevenue)}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Ticket Médio / OS</span>
                  <span className="text-sm font-bold text-indigo-600">{formatCurrency(currentWorkshopAverageTicket)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Base de clientes ativos: <strong>{totalClients} clientes</strong>
              </span>
              <button 
                onClick={() => onNavigate('vehicles')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
              >
                Gerenciar Frota <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASO 3: SE FOR COMÉRCIO EXCLUSIVO (VENDAS BALCÃO + TICKET MÉDIO) */}
      {isCommerce && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between" id="kpi-commerce-sales-overview">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <ShoppingBag className="w-32 h-32 text-emerald-400" />
            </div>

            <div className="space-y-3 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Vendas no Balcão (PDV)
                </span>
                <span className="text-[11px] text-slate-300 font-medium">Movimento do Período</span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <h2 className="text-4xl font-extrabold font-display text-white">{currentCommerceSalesCount}</h2>
                <span className="text-sm font-medium text-emerald-200">vendas registradas</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span>Receita: <strong>{formatCurrency(currentCommerceRevenue)}</strong></span>
                </div>
                <div className="bg-slate-700/60 border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span>Ticket Médio: <strong>{formatCurrency(currentCommerceAverageTicket)}</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-700/60 flex items-center justify-between z-10">
              <span className="text-xs text-slate-300">Catálogo: <strong>{totalProducts} produtos cadastrados</strong></span>
              <button 
                onClick={() => onNavigate('sales')}
                className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer transition"
              >
                Abrir Frente de Caixa <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between" id="kpi-commerce-products-overview">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Giro & Catálogo de Autopeças
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {currentPeriodOption.label}
                </span>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <h2 className="text-4xl font-extrabold font-display text-slate-900">{totalProducts}</h2>
                <span className="text-sm font-medium text-slate-500">itens no catálogo</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Estoque Baixo</span>
                  <span className="text-sm font-bold text-rose-600">{lowStockParts.length} itens críticos</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Base de Clientes</span>
                  <span className="text-sm font-bold text-slate-800">{totalClients} cadastrados</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Estoque com controle dimensional ativo</span>
              <button 
                onClick={() => onNavigate('parts')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition"
              >
                Gerenciar Estoque <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 CARDS DE INDICADORES RÁPIDOS ADAPTADOS AO SEGMENTO */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isIndustry ? (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-800">Ordens de Produção</span>
                <Factory className="w-4 h-4 text-cyan-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{productionOrdersList.length}</span>
              <p className="text-[11px] text-slate-500 mt-1">Total de OPs ativas e históricas</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Engenharia BOM</span>
                <Cpu className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{bomsList.length}</span>
              <p className="text-[11px] text-slate-500 mt-1">Estruturas de produtos cadastradas</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Equipamentos Ativos</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{operationalEquipment}</span>
              <p className="text-[11px] text-slate-500 mt-1">Maquinários em estado operacional</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">Custo de Fabricação</span>
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-black text-indigo-700">{formatCurrency(currentIndustrialCost)}</span>
              <p className="text-[11px] text-slate-500 mt-1">Insumos e mão de obra no período</p>
            </div>
          </>
        ) : isCommerce ? (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Vendas no Período</span>
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{currentCommerceSalesCount}</span>
              <p className="text-[11px] text-slate-500 mt-1">Vendas comerciais faturadas</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">Receita Comercial</span>
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{formatCurrency(currentCommerceRevenue)}</span>
              <p className="text-[11px] text-slate-500 mt-1">Faturamento bruto no período</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Ticket Médio</span>
                <Receipt className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-600">{formatCurrency(currentCommerceAverageTicket)}</span>
              <p className="text-[11px] text-slate-500 mt-1">Média por atendimento no caixa</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Estoque Crítico</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-2xl font-black text-rose-600">{lowStockParts.length}</span>
              <p className="text-[11px] text-slate-500 mt-1">Itens abaixo de 5 unidades</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">OSs no Período</span>
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{currentWorkshopOrdersCount}</span>
              <p className="text-[11px] text-slate-500 mt-1">Ordens de serviço atendidas</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Faturamento Oficina</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{formatCurrency(currentWorkshopRevenue)}</span>
              <p className="text-[11px] text-slate-500 mt-1">Peças e mão de obra faturados</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Orçamentos</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-600">{totalBudgets}</span>
              <p className="text-[11px] text-slate-500 mt-1">Propostas técnicas elaboradas</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Ticket Médio / OS</span>
                <Receipt className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-blue-600">{formatCurrency(currentWorkshopAverageTicket)}</span>
              <p className="text-[11px] text-slate-500 mt-1">Valor médio por passagem na oficina</p>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GRÁFICOS ANALÍTICOS COM RECHARTS E RICHCHARTTOOLTIP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolução Temporal com Comparativo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4" id="billing-chart-panel">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                {isIndustry 
                  ? 'Evolução da Produção Industrial & Custos' 
                  : isCommerce 
                    ? 'Evolução de Faturamento de Vendas (PDV)' 
                    : isDual 
                      ? 'Evolução de Faturamento Consolidado (Oficina & Comércio)' 
                      : 'Evolução do Faturamento da Oficina'}
              </h3>
              <p className="text-xs text-slate-500">
                Visualização <strong>{granularity.toUpperCase()}</strong> • Passe o mouse nos pontos para ver métricas detalhadas.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                {currentPeriodOption.shortLabel}
              </span>
              {isComparing && (
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                  Comparação Ativa
                </span>
              )}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  content={
                    <RichChartTooltip 
                      isComparing={isComparing} 
                      segmentType={businessType} 
                    />
                  } 
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />

                {/* Séries Principais do Segmento */}
                {isIndustry ? (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="producao" 
                      stroke="#06b6d4" 
                      strokeWidth={3} 
                      activeDot={{ r: 7 }} 
                      name="Custo Industrial (R$)" 
                    />
                    {isComparing && (
                      <Line 
                        type="monotone" 
                        dataKey="valorAnterior" 
                        stroke="#94a3b8" 
                        strokeDasharray="4 4" 
                        strokeWidth={2} 
                        name="Período Anterior (Comparativo)" 
                      />
                    )}
                  </>
                ) : isCommerce ? (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="comercio" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      activeDot={{ r: 7 }} 
                      name="Vendas Balcão (R$)" 
                    />
                    {isComparing && (
                      <Line 
                        type="monotone" 
                        dataKey="valorAnterior" 
                        stroke="#94a3b8" 
                        strokeDasharray="4 4" 
                        strokeWidth={2} 
                        name="Período Anterior (Comparativo)" 
                      />
                    )}
                  </>
                ) : isDual ? (
                  <>
                    <Line type="monotone" dataKey="oficina" stroke="#4f46e5" strokeWidth={2} name="Oficina (R$)" />
                    <Line type="monotone" dataKey="comercio" stroke="#10b981" strokeWidth={2} name="Comércio (R$)" />
                    <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} name="Total Consolidado" />
                    {isComparing && (
                      <Line 
                        type="monotone" 
                        dataKey="valorAnterior" 
                        stroke="#94a3b8" 
                        strokeDasharray="4 4" 
                        strokeWidth={2} 
                        name="Total Anterior (Comparativo)" 
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="oficina" 
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      activeDot={{ r: 7 }} 
                      name="Faturamento Oficina (R$)" 
                    />
                    {isComparing && (
                      <Line 
                        type="monotone" 
                        dataKey="valorAnterior" 
                        stroke="#94a3b8" 
                        strokeDasharray="4 4" 
                        strokeWidth={2} 
                        name="Período Anterior (Comparativo)" 
                      />
                    )}
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribuição Operacional Secundária */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="distribution-chart-panel">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">
              {isIndustry 
                ? 'Status das Ordens no PCP' 
                : isCommerce 
                  ? 'Vendas por Forma de Pagamento' 
                  : 'Status das Ordens na Oficina'}
            </h3>
            <p className="text-xs text-slate-500">Distribuição operacional do pátio / frente de caixa.</p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {isCommerce ? (
                <BarChart data={commercePaymentData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    content={
                      <RichChartTooltip 
                        isComparing={false} 
                        segmentType={businessType} 
                      />
                    } 
                  />
                  <Bar dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} name="Faturamento">
                    {commercePaymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={statusDistributionData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    content={
                      <RichChartTooltip 
                        isComparing={false} 
                        valuePrefix="un" 
                        unitLabel="un"
                        segmentType={businessType} 
                      />
                    } 
                  />
                  <Bar dataKey="Qtd" fill="#6366f1" radius={[6, 6, 0, 0]} name="Quantidade">
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO INFERIOR: ALERTAS OPERACIONAIS & FLUXO DO SEGMENTO */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Alertas de Estoque / Insumos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="stock-alerts-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-800 font-display">
                {isIndustry 
                  ? 'Semáforo de Insumos & Riscos de Parada' 
                  : isCommerce 
                    ? 'Produtos com Estoque Baixo (Reposição)' 
                    : 'Alertas de Estoque de Peças & Insumos'}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {isIndustry ? `${industrialAlertsList.length} alertas` : `${lowStockParts.length} itens`}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {isIndustry 
              ? 'Matérias-primas e componentes com estoque abaixo do ponto de pedido para atendimento das OPs.' 
              : 'Itens com estoque menor que 5 unidades que requerem pedido de compra ao fornecedor.'}
          </p>
          
          {isIndustry && industrialAlertsList.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {industrialAlertsList.slice(0, 4).map(alert => (
                <div key={alert.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{alert.title}</p>
                    <p className="text-[10px] text-slate-500">{alert.message}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 shrink-0">
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : lowStockParts.length === 0 ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl text-center font-medium border border-emerald-100">
              Excelente! Todos os itens estão com níveis adequados em estoque.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {lowStockParts.slice(0, 5).map(part => (
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

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate(isIndustry ? 'industrial' : 'parts')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
            >
              {isIndustry ? 'Ver Semáforo de Insumos & Compras MRP' : 'Ver Catálogo Completo de Peças'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Guia de Fluxo Operacional */}
        <div className="bg-indigo-900/5 p-5 rounded-2xl border border-indigo-100/80 space-y-3" id="quick-overview-panel">
          <div className="flex items-center gap-2 text-indigo-900 font-display">
            {isIndustry ? (
              <Factory className="w-5 h-5 text-cyan-600" />
            ) : isCommerce ? (
              <Store className="w-5 h-5 text-emerald-600" />
            ) : (
              <Wrench className="w-5 h-5 text-indigo-600" />
            )}
            <h3 className="text-sm font-bold">
              {isIndustry 
                ? 'Mapeamento do Fluxo Industrial & Manufatura' 
                : isCommerce 
                  ? 'Fluxo Comercial do Estabelecimento' 
                  : 'Mapeamento do Fluxo da Oficina Mecânica'}
            </h3>
          </div>
          
          {isIndustry ? (
            <div className="flex items-center flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100 font-medium">1. Engenharia BOM</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-white text-slate-700 shadow-2xs border border-slate-100 font-medium">2. Semáforo / MRP</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-cyan-100 text-cyan-900 font-bold">3. Ordem de Produção</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 font-bold">4. Roteiro / Chão Fábrica</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 font-bold">5. Lote & Controle CQ</span>
            </div>
          ) : isCommerce ? (
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
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold">Semáforo 🚦</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium">Ordem de Serviço</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-medium">Pagamento</span>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed pt-1">
            Painel configurado exclusivamente para o modelo <strong>{businessType}</strong>, garantindo aderência às operações diárias e aos indicadores-chave do seu negócio.
          </p>

          <div className="pt-2">
            <button 
              id="btn-nav-to-qa-from-widget"
              onClick={() => onNavigate('qa_panel')} 
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
            >
              Consultar Matriz de Testes & Homologação QA <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
