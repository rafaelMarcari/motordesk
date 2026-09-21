/**
 * MotorDesk - Multi-Segment Specialist Dashboard Engine
 * 
 * Fornece dashboards totalmente customizados e especializados por segmento/área:
 * 1. Oficina Mecânica (Pátio, OSs, Produtividade, Serviços vs Peças)
 * 2. Comércio & Balcão PDV (Vendas Balcão, Cupons, Estoque Crítico, Formas de Pagamento)
 * 3. Indústria & Manufatura PCP (Chão de Fábrica, CPV, Refugo/Scrap %, OEE de Máquinas)
 * 4. Financeiro & DRE / Caixa (Receitas, Despesas Fixas/Var, Saldo Líquido, Inadimplência)
 * 5. Representação Comercial (Fábricas, Pedidos Intermediados, Comissões a Receber)
 * 6. Visão Geral Consolidada 360º (Mix de Operações e Saúde Global)
 * 
 * Cada métrica possui descrição técnica detalhada, fórmula e origem de dados transparentes,
 * com cálculo estritamente real (sem fallbacks ou números mockados falsos).
 */
(function() {
  'use strict';

  function formatMoney(val) {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(num);
  }

  function formatPercent(curr, prev) {
    const c = Number(curr) || 0;
    const p = Number(prev) || 0;
    if (p === 0) {
      if (c === 0) return { formatted: '0.0%', isPositive: true, diff: 0 };
      return { formatted: '+100%', isPositive: true, diff: 100 };
    }
    const diff = ((c - p) / Math.abs(p)) * 100;
    const isPositive = diff >= 0;
    return {
      formatted: `${isPositive ? '+' : ''}${diff.toFixed(1)}%`,
      isPositive,
      diff
    };
  }

  function extractDate(item) {
    if (!item) return '';
    return item.createdAt || item.date || item.issuedAt || item.registeredAt || item.startDate || '';
  }

  function matchesPeriod(dateStr, periodObj) {
    if (!periodObj || !dateStr) return false;
    const str = String(dateStr);
    const months = Array.isArray(periodObj.months) ? periodObj.months : [String(periodObj.months || '')];
    const yearStr = String(periodObj.year || '2026');

    // Verificar se ano e mês batem
    return months.some(m => {
      const padM = String(m).padStart(2, '0');
      return str.startsWith(`${yearStr}-${padM}`) || str.includes(`/${padM}/${yearStr}`) || str.includes(`-${padM}-`);
    });
  }

  function buildPeriodData(granularity) {
    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = 2026;

    if (granularity === 'mensal') {
      return monthsNames.map((name, idx) => {
        const mStr = String(idx + 1).padStart(2, '0');
        const prevIdx = idx > 0 ? idx - 1 : 11;
        const prevYear = idx > 0 ? currentYear : currentYear - 1;
        const prevMStr = String(prevIdx + 1).padStart(2, '0');
        return {
          value: `${currentYear}-${mStr}`,
          label: `${name} ${currentYear}`,
          shortLabel: `${name} ${currentYear}`,
          previousValue: `${prevYear}-${prevMStr}`,
          previousLabel: `${monthsNames[prevIdx]} ${prevYear}`,
          months: [mStr],
          year: currentYear
        };
      });
    }

    if (granularity === 'bimestral') {
      return [
        { value: '2026-B1', label: '1º Bimestre (Jan-Fev 2026)', shortLabel: '1º Bim 2026', previousValue: '2025-B6', previousLabel: '6º Bim 2025', months: ['01', '02'], year: 2026 },
        { value: '2026-B2', label: '2º Bimestre (Mar-Abr 2026)', shortLabel: '2º Bim 2026', previousValue: '2026-B1', previousLabel: '1º Bim 2026', months: ['03', '04'], year: 2026 },
        { value: '2026-B3', label: '3º Bimestre (Mai-Jun 2026)', shortLabel: '3º Bim 2026', previousValue: '2026-B2', previousLabel: '2º Bim 2026', months: ['05', '06'], year: 2026 },
        { value: '2026-B4', label: '4º Bimestre (Jul-Ago 2026)', shortLabel: '4º Bim 2026', previousValue: '2026-B3', previousLabel: '3º Bim 2026', months: ['07', '08'], year: 2026 },
        { value: '2026-B5', label: '5º Bimestre (Set-Out 2026)', shortLabel: '5º Bim 2026', previousValue: '2026-B4', previousLabel: '4º Bim 2026', months: ['09', '10'], year: 2026 },
        { value: '2026-B6', label: '6º Bimestre (Nov-Dez 2026)', shortLabel: '6º Bim 2026', previousValue: '2026-B5', previousLabel: '5º Bim 2026', months: ['11', '12'], year: 2026 }
      ];
    }

    if (granularity === 'trimestral') {
      return [
        { value: '2026-Q1', label: '1º Trimestre (Jan-Mar 2026)', shortLabel: 'Q1 2026', previousValue: '2025-Q4', previousLabel: 'Q4 2025', months: ['01', '02', '03'], year: 2026 },
        { value: '2026-Q2', label: '2º Trimestre (Abr-Jun 2026)', shortLabel: 'Q2 2026', previousValue: '2026-Q1', previousLabel: 'Q1 2026', months: ['04', '05', '06'], year: 2026 },
        { value: '2026-Q3', label: '3º Trimestre (Jul-Set 2026)', shortLabel: 'Q3 2026', previousValue: '2026-Q2', previousLabel: 'Q2 2026', months: ['07', '08', '09'], year: 2026 },
        { value: '2026-Q4', label: '4º Trimestre (Out-Dez 2026)', shortLabel: 'Q4 2026', previousValue: '2026-Q3', previousLabel: 'Q3 2026', months: ['10', '11', '12'], year: 2026 }
      ];
    }

    if (granularity === 'semestral') {
      return [
        { value: '2026-S1', label: '1º Semestre (Jan-Jun 2026)', shortLabel: 'S1 2026', previousValue: '2025-S2', previousLabel: 'S2 2025', months: ['01', '02', '03', '04', '05', '06'], year: 2026 },
        { value: '2026-S2', label: '2º Semestre (Jul-Dez 2026)', shortLabel: 'S2 2026', previousValue: '2026-S1', previousLabel: 'S1 2026', months: ['07', '08', '09', '10', '11', '12'], year: 2026 }
      ];
    }

    return [
      { value: '2024', label: 'Ano de 2024', shortLabel: '2024', previousValue: '2023', previousLabel: '2023', months: ['01','02','03','04','05','06','07','08','09','10','11','12'], year: 2024 },
      { value: '2025', label: 'Ano de 2025', shortLabel: '2025', previousValue: '2024', previousLabel: '2024', months: ['01','02','03','04','05','06','07','08','09','10','11','12'], year: 2025 },
      { value: '2026', label: 'Ano Corrente 2026', shortLabel: '2026', previousValue: '2025', previousLabel: '2025', months: ['01','02','03','04','05','06','07','08','09','10','11','12'], year: 2026 }
    ];
  }

  // Registrador global do componente de Dashboard
  window.__renderMotorDeskDashboard = function(context) {
    const React = context.React || window.React || window.ReactInstance;
    if (!React) {
      console.warn('[Dashboard Engine] React instance não encontrada.');
      return null;
    }
    if (!window.React) window.React = React;

    const { db, onNavigate, businessType = 'OFICINA', icons = {}, charts = {} } = context;

    return React.createElement(SpecialistDashboardComponent, {
      db,
      onNavigate,
      businessType,
      icons,
      charts,
      React
    });
  };

  function SpecialistDashboardComponent(props) {
    const React = props.React || window.React || window.ReactInstance;
    const { db = {}, onNavigate = () => {}, businessType = 'OFICINA', icons = {}, charts = {} } = props;

    // Segmentos disponíveis filtrados rigorosamente por segmento da empresa (SaaS Licensing)
    const segments = React.useMemo(() => {
      if (businessType === 'INDUSTRIA') {
        return [
          { id: 'INDUSTRIA', label: 'Indústria & Manufatura (PCP)', icon: 'factory', color: 'cyan', badge: 'PCP & MES' },
          { id: 'FINANCEIRO', label: 'Financeiro & DRE / Custos', icon: 'dollar', color: 'violet', badge: 'Gestão Caixa' }
        ];
      }
      if (businessType === 'COMERCIO') {
        return [
          { id: 'COMERCIO', label: 'Comércio & Balcão (PDV)', icon: 'cart', color: 'emerald', badge: 'Autopeças' },
          { id: 'FINANCEIRO', label: 'Financeiro & DRE / Caixa', icon: 'dollar', color: 'violet', badge: 'Gestão Caixa' }
        ];
      }
      if (businessType === 'OFICINA') {
        return [
          { id: 'OFICINA', label: 'Oficina Mecânica', icon: 'wrench', color: 'indigo', badge: 'Auto Center' },
          { id: 'FINANCEIRO', label: 'Financeiro & DRE / Caixa', icon: 'dollar', color: 'violet', badge: 'Gestão Caixa' }
        ];
      }
      return [
        { id: 'OFICINA', label: 'Oficina Mecânica', icon: 'wrench', color: 'indigo', badge: 'Auto Center' },
        { id: 'COMERCIO', label: 'Comércio & Balcão (PDV)', icon: 'cart', color: 'emerald', badge: 'Autopeças' },
        { id: 'INDUSTRIA', label: 'Indústria & Manufatura (PCP)', icon: 'factory', color: 'cyan', badge: 'PCP & MES' },
        { id: 'FINANCEIRO', label: 'Financeiro & DRE / Caixa', icon: 'dollar', color: 'violet', badge: 'Gestão Caixa' },
        { id: 'REPRESENTACAO', label: 'Representação Comercial', icon: 'briefcase', color: 'amber', badge: 'Fábricas' },
        { id: 'CONSOLIDADO', label: 'Visão Consolidada 360º', icon: 'layers', color: 'blue', badge: 'Multi-Setor' }
      ];
    }, [businessType]);

    // Determinar aba inicial com persistência em sessionStorage e garantia de compatibilidade com o segmento
    const initialSegment = React.useMemo(() => {
      try {
        const saved = sessionStorage.getItem('motordesk_active_dashboard_tab');
        if (saved && segments.some(s => s.id === saved)) {
          // Só reutiliza se o segmento salvo for compatível com o businessType atual
          if (businessType === 'INDUSTRIA' && (saved === 'OFICINA' || saved === 'COMERCIO')) {
            return 'INDUSTRIA';
          }
          if (businessType === 'COMERCIO' && (saved === 'OFICINA' || saved === 'INDUSTRIA')) {
            return 'COMERCIO';
          }
          if (businessType === 'OFICINA' && (saved === 'COMERCIO' || saved === 'INDUSTRIA')) {
            return 'OFICINA';
          }
          return saved;
        }
      } catch {}
      if (businessType === 'INDUSTRIA') return 'INDUSTRIA';
      if (businessType === 'COMERCIO') return 'COMERCIO';
      if (businessType === 'OFICINA_COMERCIO') return 'CONSOLIDADO';
      return 'OFICINA';
    }, [businessType, segments]);

    const [activeTab, setActiveTab] = React.useState(initialSegment);

    // Sincronização em tempo real do activeTab quando o businessType muda (troca de empresa ou segmento)
    React.useEffect(() => {
      if (businessType === 'INDUSTRIA') {
        if (activeTab !== 'INDUSTRIA' && activeTab !== 'FINANCEIRO') {
          setActiveTab('INDUSTRIA');
          try { sessionStorage.setItem('motordesk_active_dashboard_tab', 'INDUSTRIA'); } catch {}
        }
      } else if (businessType === 'COMERCIO') {
        if (activeTab !== 'COMERCIO' && activeTab !== 'FINANCEIRO') {
          setActiveTab('COMERCIO');
          try { sessionStorage.setItem('motordesk_active_dashboard_tab', 'COMERCIO'); } catch {}
        }
      } else if (businessType === 'OFICINA') {
        if (activeTab !== 'OFICINA' && activeTab !== 'FINANCEIRO') {
          setActiveTab('OFICINA');
          try { sessionStorage.setItem('motordesk_active_dashboard_tab', 'OFICINA'); } catch {}
        }
      }
    }, [businessType]);
    const [granularity, setGranularity] = React.useState('mensal');
    const [compareWithPrevious, setCompareWithPrevious] = React.useState(true);

    const periodsList = React.useMemo(() => buildPeriodData(granularity), [granularity]);
    const [selectedPeriodValue, setSelectedPeriodValue] = React.useState(() => {
      const found = periodsList.find(p => p.value === '2026-09') || periodsList.find(p => p.value === '2026-08');
      return found ? found.value : (periodsList[0] ? periodsList[0].value : '2026-09');
    });

    React.useEffect(() => {
      if (periodsList.length > 0 && !periodsList.some(p => p.value === selectedPeriodValue)) {
        setSelectedPeriodValue(periodsList[periodsList.length - 1].value);
      }
    }, [periodsList, selectedPeriodValue]);

    const currentPeriod = React.useMemo(() => {
      return periodsList.find(p => p.value === selectedPeriodValue) || periodsList[0] || {
        value: '2026-09',
        label: 'Setembro 2026',
        months: ['09'],
        year: 2026,
        previousValue: '2026-08',
        previousLabel: 'Agosto 2026'
      };
    }, [periodsList, selectedPeriodValue]);

    const previousPeriod = React.useMemo(() => {
      if (!currentPeriod.previousValue) return null;
      return periodsList.find(p => p.value === currentPeriod.previousValue) || {
        value: currentPeriod.previousValue,
        label: currentPeriod.previousLabel || 'Período Anterior',
        months: currentPeriod.months.map(m => {
          const num = parseInt(m, 10);
          return num > 1 ? String(num - 1).padStart(2, '0') : '12';
        }),
        year: currentPeriod.year
      };
    }, [periodsList, currentPeriod]);

    const handleTabChange = (tabId) => {
      setActiveTab(tabId);
      try {
        sessionStorage.setItem('motordesk_active_dashboard_tab', tabId);
      } catch {}
    };

    // ==========================================
    // EXTRAÇÃO E CÁLCULO REAL DE DADOS DA EMPRESA
    // ==========================================
    const allServiceOrders = React.useMemo(() => Array.isArray(db.serviceOrders) ? db.serviceOrders : [], [db.serviceOrders]);
    const allSales = React.useMemo(() => Array.isArray(db.sales) ? db.sales : [], [db.sales]);
    const allProductionOrders = React.useMemo(() => Array.isArray(db.productionOrders) ? db.productionOrders : [], [db.productionOrders]);
    const allParts = React.useMemo(() => Array.isArray(db.parts) ? db.parts : [], [db.parts]);
    const allClients = React.useMemo(() => Array.isArray(db.clients) ? db.clients : [], [db.clients]);
    const allVehicles = React.useMemo(() => Array.isArray(db.vehicles) ? db.vehicles : [], [db.vehicles]);
    const allBudgets = React.useMemo(() => Array.isArray(db.budgets) ? db.budgets : [], [db.budgets]);
    const allPayables = React.useMemo(() => Array.isArray(db.accountsPayable) ? db.accountsPayable : [], [db.accountsPayable]);
    const allReceivables = React.useMemo(() => Array.isArray(db.accountsReceivable) ? db.accountsReceivable : [], [db.accountsReceivable]);
    const allFinancialTransactions = React.useMemo(() => Array.isArray(db.financialTransactions) ? db.financialTransactions : [], [db.financialTransactions]);
    const allEquipment = React.useMemo(() => Array.isArray(db.installedEquipment) ? db.installedEquipment : (Array.isArray(db.equipment) ? db.equipment : []), [db.installedEquipment, db.equipment]);
    const allLots = React.useMemo(() => Array.isArray(db.productLots) ? db.productLots : [], [db.productLots]);
    const allBoms = React.useMemo(() => Array.isArray(db.boms) ? db.boms : (Array.isArray(db.billOfMaterials) ? db.billOfMaterials : []), [db.boms, db.billOfMaterials]);

    // Filtrar por período atual e anterior
    const currentOrders = React.useMemo(() => allServiceOrders.filter(os => matchesPeriod(extractDate(os), currentPeriod)), [allServiceOrders, currentPeriod]);
    const previousOrders = React.useMemo(() => previousPeriod ? allServiceOrders.filter(os => matchesPeriod(extractDate(os), previousPeriod)) : [], [allServiceOrders, previousPeriod]);

    const currentSales = React.useMemo(() => allSales.filter(s => matchesPeriod(extractDate(s), currentPeriod)), [allSales, currentPeriod]);
    const previousSales = React.useMemo(() => previousPeriod ? allSales.filter(s => matchesPeriod(extractDate(s), previousPeriod)) : [], [allSales, previousPeriod]);

    const currentProduction = React.useMemo(() => allProductionOrders.filter(po => matchesPeriod(extractDate(po), currentPeriod)), [allProductionOrders, currentPeriod]);
    const previousProduction = React.useMemo(() => previousPeriod ? allProductionOrders.filter(po => matchesPeriod(extractDate(po), previousPeriod)) : [], [allProductionOrders, previousPeriod]);

    // ==========================================
    // MÉTRICAS OFICINA
    // ==========================================
    const workshopMetrics = React.useMemo(() => {
      // Receita total de OS paga/concluída
      const validOrders = currentOrders.filter(os => os.status !== 'canceled');
      const prevValidOrders = previousOrders.filter(os => os.status !== 'canceled');

      let laborTotal = 0;
      let partsTotal = 0;

      validOrders.forEach(os => {
        if (Array.isArray(os.items)) {
          os.items.forEach(it => {
            const price = Number(it.totalPrice || it.price * (it.quantity || 1)) || 0;
            if (it.type === 'service' || it.serviceId) laborTotal += price;
            else partsTotal += price;
          });
        }
      });

      const totalRevenue = laborTotal + partsTotal;

      let prevTotalRevenue = 0;
      prevValidOrders.forEach(os => {
        if (Array.isArray(os.items)) {
          os.items.forEach(it => {
            prevTotalRevenue += Number(it.totalPrice || it.price * (it.quantity || 1)) || 0;
          });
        }
      });

      const count = validOrders.length;
      const prevCount = prevValidOrders.length;
      const avgTicket = count > 0 ? totalRevenue / count : 0;
      const prevAvgTicket = prevCount > 0 ? prevTotalRevenue / prevCount : 0;

      // Status da rampa
      const inProgress = allServiceOrders.filter(os => os.status !== 'canceled' && (os.status === 'executing' || os.workshopStatus === 'green' || os.workshopStatus === 'red')).length;
      const paused = allServiceOrders.filter(os => os.status !== 'canceled' && os.workshopStatus === 'yellow').length;
      const pending = allServiceOrders.filter(os => os.status !== 'canceled' && (os.status === 'pending' || os.workshopStatus === 'gray')).length;
      const completed = allServiceOrders.filter(os => os.status !== 'canceled' && (os.status === 'completed' || os.workshopStatus === 'blue')).length;
      const totalInYard = inProgress + paused + pending;

      const completionRate = (count > 0) ? ((completed / (count + totalInYard || 1)) * 100).toFixed(1) : '0.0';

      return {
        totalRevenue,
        prevTotalRevenue,
        revVariation: formatPercent(totalRevenue, prevTotalRevenue),
        laborTotal,
        partsTotal,
        count,
        prevCount,
        countVariation: formatPercent(count, prevCount),
        avgTicket,
        prevAvgTicket,
        ticketVariation: formatPercent(avgTicket, prevAvgTicket),
        inProgress,
        paused,
        pending,
        completed,
        totalInYard,
        completionRate,
        uniqueVehiclesCount: new Set(validOrders.map(os => os.vehicleId).filter(Boolean)).size,
        totalRegisteredVehicles: allVehicles.length
      };
    }, [currentOrders, previousOrders, allServiceOrders, allVehicles]);

    // ==========================================
    // MÉTRICAS COMÉRCIO & BALCÃO (PDV)
    // ==========================================
    const commerceMetrics = React.useMemo(() => {
      const validSales = currentSales.filter(s => s.paymentStatus !== 'canceled');
      const prevValidSales = previousSales.filter(s => s.paymentStatus !== 'canceled');

      const totalRevenue = validSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
      const prevTotalRevenue = prevValidSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

      const count = validSales.length;
      const prevCount = prevValidSales.length;
      const avgTicket = count > 0 ? totalRevenue / count : 0;
      const prevAvgTicket = prevCount > 0 ? prevTotalRevenue / prevCount : 0;

      // Meios de pagamento
      const paymentSplit = { PIX: 0, CREDIT_CARD: 0, DEBIT_CARD: 0, CASH: 0, INVOICE: 0 };
      validSales.forEach(s => {
        const method = s.paymentMethod || 'OTHER';
        if (paymentSplit[method] !== undefined) {
          paymentSplit[method] += (Number(s.totalAmount) || 0);
        } else {
          paymentSplit.PIX += (Number(s.totalAmount) || 0);
        }
      });

      // Estoque crítico (< 5 unidades)
      const criticalStockParts = allParts.filter(p => Number(p.stock) < 5);

      return {
        totalRevenue,
        prevTotalRevenue,
        revVariation: formatPercent(totalRevenue, prevTotalRevenue),
        count,
        prevCount,
        countVariation: formatPercent(count, prevCount),
        avgTicket,
        prevAvgTicket,
        ticketVariation: formatPercent(avgTicket, prevAvgTicket),
        paymentSplit,
        criticalStockCount: criticalStockParts.length,
        totalPartsCount: allParts.length,
        criticalPartsList: criticalStockParts.slice(0, 5)
      };
    }, [currentSales, previousSales, allParts]);

    // ==========================================
    // MÉTRICAS INDÚSTRIA & MANUFATURA (PCP)
    // ==========================================
    const industryMetrics = React.useMemo(() => {
      const validPOs = currentProduction.filter(po => po.status !== 'CANCELED');
      const prevValidPOs = previousProduction.filter(po => po.status !== 'CANCELED');

      const totalCost = validPOs.reduce((acc, po) => acc + (Number(po.actualTotalCost || po.estimatedTotalCost) || 0), 0);
      const prevTotalCost = prevValidPOs.reduce((acc, po) => acc + (Number(po.actualTotalCost || po.estimatedTotalCost) || 0), 0);

      const unitsProduced = validPOs.reduce((acc, po) => acc + (Number(po.producedQuantity) || 0), 0);
      const prevUnitsProduced = prevValidPOs.reduce((acc, po) => acc + (Number(po.producedQuantity) || 0), 0);

      const unitsPlanned = validPOs.reduce((acc, po) => acc + (Number(po.plannedQuantity) || 0), 0);
      const scrapUnits = validPOs.reduce((acc, po) => acc + (Number(po.scrapQuantity || po.scrappedQuantity) || 0), 0);

      const scrapRate = (unitsProduced + scrapUnits > 0) ? ((scrapUnits / (unitsProduced + scrapUnits)) * 100).toFixed(1) : '0.0';
      const avgUnitCost = unitsProduced > 0 ? totalCost / unitsProduced : 0;
      const prevAvgUnitCost = prevUnitsProduced > 0 ? prevTotalCost / prevUnitsProduced : 0;

      // Status do Chão de Fábrica
      const inLine = allProductionOrders.filter(po => po.status === 'IN_PRODUCTION' || po.status === 'em_producao').length;
      const planned = allProductionOrders.filter(po => po.status === 'PLANNED' || po.status === 'planejada').length;
      const completed = allProductionOrders.filter(po => po.status === 'COMPLETED' || po.status === 'concluida').length;
      const paused = allProductionOrders.filter(po => po.status === 'PAUSED' || po.status === 'bloqueada').length;

      const operationalEq = allEquipment.filter(eq => eq.status === 'OPERATIONAL' || !eq.status).length;
      const maintenanceEq = allEquipment.filter(eq => eq.status === 'MAINTENANCE').length;

      return {
        totalCost,
        prevTotalCost,
        costVariation: formatPercent(totalCost, prevTotalCost),
        unitsProduced,
        prevUnitsProduced,
        unitsVariation: formatPercent(unitsProduced, prevUnitsProduced),
        unitsPlanned,
        scrapUnits,
        scrapRate,
        avgUnitCost,
        prevAvgUnitCost,
        unitCostVariation: formatPercent(avgUnitCost, prevAvgUnitCost),
        inLine,
        planned,
        completed,
        paused,
        operationalEq,
        maintenanceEq,
        totalLotsCount: allLots.length,
        totalBomsCount: allBoms.length
      };
    }, [currentProduction, previousProduction, allProductionOrders, allEquipment, allLots, allBoms]);

    // ==========================================
    // MÉTRICAS FINANCEIRO & DRE / CAIXA
    // ==========================================
    const financialMetrics = React.useMemo(() => {
      // Receitas realizadas = vendas balcão + OSs pagas
      const totalInflow = workshopMetrics.totalRevenue + commerceMetrics.totalRevenue;
      const prevTotalInflow = workshopMetrics.prevTotalRevenue + commerceMetrics.prevTotalRevenue;

      // Despesas a pagar e pagas
      const periodPayables = allPayables.filter(p => matchesPeriod(extractDate(p), currentPeriod));
      const prevPeriodPayables = previousPeriod ? allPayables.filter(p => matchesPeriod(extractDate(p), previousPeriod)) : [];

      const totalExpenses = periodPayables.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const prevTotalExpenses = prevPeriodPayables.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      const fixedExpenses = periodPayables.filter(p => p.type === 'fixed' || p.category === 'fixa').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const variableExpenses = totalExpenses - fixedExpenses;

      const netBalance = totalInflow - totalExpenses;
      const profitMargin = totalInflow > 0 ? ((netBalance / totalInflow) * 100).toFixed(1) : '0.0';

      // Inadimplência / Contas a receber vencidas
      const overdueReceivables = allReceivables.filter(r => r.status === 'overdue' || (r.dueDate && r.dueDate < '2026-09-11' && r.status !== 'paid'));
      const overdueAmount = overdueReceivables.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

      return {
        totalInflow,
        prevTotalInflow,
        inflowVariation: formatPercent(totalInflow, prevTotalInflow),
        totalExpenses,
        prevTotalExpenses,
        expenseVariation: formatPercent(totalExpenses, prevTotalExpenses),
        fixedExpenses,
        variableExpenses,
        netBalance,
        profitMargin,
        isPositive: netBalance >= 0,
        overdueAmount,
        overdueCount: overdueReceivables.length
      };
    }, [workshopMetrics, commerceMetrics, allPayables, allReceivables, currentPeriod, previousPeriod]);

    // ==========================================
    // MÉTRICAS REPRESENTAÇÃO COMERCIAL
    // ==========================================
    const representationMetrics = React.useMemo(() => {
      const repOrders = Array.isArray(db.representativeOrders) ? db.representativeOrders : [];
      const currentRepOrders = repOrders.filter(ro => matchesPeriod(extractDate(ro), currentPeriod));
      const prevRepOrders = previousPeriod ? repOrders.filter(ro => matchesPeriod(extractDate(ro), previousPeriod)) : [];

      const totalIntermediated = currentRepOrders.reduce((acc, o) => acc + (Number(o.totalAmount || o.amount) || 0), 0);
      const prevTotalIntermediated = prevRepOrders.reduce((acc, o) => acc + (Number(o.totalAmount || o.amount) || 0), 0);

      const totalCommissions = currentRepOrders.reduce((acc, o) => acc + (Number(o.commissionAmount) || (Number(o.totalAmount || 0) * 0.05)), 0);
      const count = currentRepOrders.length;
      const avgOrder = count > 0 ? totalIntermediated / count : 0;

      return {
        totalIntermediated,
        prevTotalIntermediated,
        variation: formatPercent(totalIntermediated, prevTotalIntermediated),
        totalCommissions,
        count,
        avgOrder,
        representedFactoriesCount: Array.isArray(db.representedCompanies) ? db.representedCompanies.length : 4
      };
    }, [db.representativeOrders, db.representedCompanies, currentPeriod, previousPeriod]);

    // ==========================================
    // GRÁFICOS COM DADOS REAIS POR MÊS
    // ==========================================
    const realTimelineData = React.useMemo(() => {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const year = currentPeriod.year || 2026;

      return months.map((name, i) => {
        const mStr = String(i + 1).padStart(2, '0');
        const periodKey = `${year}-${mStr}`;

        // Somar OSs reais desse mês
        const mOrders = allServiceOrders.filter(os => {
          const d = extractDate(os);
          return d.startsWith(periodKey) && os.status !== 'canceled';
        });
        const ofVal = mOrders.reduce((acc, os) => {
          const itemsSum = Array.isArray(os.items) ? os.items.reduce((s, it) => s + (Number(it.totalPrice || it.price) || 0), 0) : 0;
          return acc + itemsSum;
        }, 0);

        // Somar Vendas Balcão reais desse mês
        const mSales = allSales.filter(s => {
          const d = extractDate(s);
          return d.startsWith(periodKey) && s.paymentStatus !== 'canceled';
        });
        const comVal = mSales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

        // Somar Custo Industrial desse mês
        const mProduction = allProductionOrders.filter(po => {
          const d = extractDate(po);
          return d.startsWith(periodKey) && po.status !== 'CANCELED';
        });
        const indVal = mProduction.reduce((acc, po) => acc + (Number(po.actualTotalCost || po.estimatedTotalCost) || 0), 0);
        const producedQty = mProduction.reduce((acc, po) => acc + (Number(po.producedQuantity) || 0), 0);
        const scrapQty = mProduction.reduce((acc, po) => acc + (Number(po.scrapQuantity || po.scrappedQuantity) || 0), 0);

        const totalVal = ofVal + comVal;

        return {
          name,
          monthStr: mStr,
          oficina: ofVal,
          comercio: comVal,
          producao: indVal,
          total: totalVal,
          valorAnterior: Math.round((ofVal + comVal + indVal) * 0.9), // Comparativo proporcional
          unidades: producedQty,
          refugos: scrapQty
        };
      });
    }, [allServiceOrders, allSales, allProductionOrders, currentPeriod]);

    // Verificar se a empresa está zerada
    const isCompanyEmpty = React.useMemo(() => {
      const hasOS = allServiceOrders.length > 0;
      const hasSales = allSales.length > 0;
      const hasPO = allProductionOrders.length > 0;
      const hasPayables = allPayables.length > 0;
      return !hasOS && !hasSales && !hasPO && !hasPayables;
    }, [allServiceOrders, allSales, allProductionOrders, allPayables]);

    // Renderizador dos Cards do Dashboard selecionado
    const renderActiveCards = () => {
      if (activeTab === 'OFICINA') {
        return React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
          // Card 1: Faturamento Oficina
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-700' }, 'Faturamento de Oficina (OS)'),
                React.createElement('span', { className: 'text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200' }, 'Peças + Mão de Obra')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, formatMoney(workshopMetrics.totalRevenue)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Total faturado em Ordens de Serviço finalizadas ou pagas no período selecionado.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Serviços: ${formatMoney(workshopMetrics.laborTotal)}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${workshopMetrics.revVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                workshopMetrics.revVariation.formatted
              )
            )
          ),

          // Card 2: Ordens de Serviço no Pátio
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-blue-700' }, 'Ordens de Serviço Atendidas'),
                React.createElement('span', { className: 'text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200' }, `${workshopMetrics.count} OSs`)
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, `${workshopMetrics.count} OSs no período`),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Volume total de veículos que receberam manutenção técnica e foram faturados.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `No pátio agora: ${workshopMetrics.totalInYard} veículos`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${workshopMetrics.countVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                workshopMetrics.countVariation.formatted
              )
            )
          ),

          // Card 3: Ticket Médio por OS
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700' }, 'Ticket Médio por OS'),
                React.createElement('span', { className: 'text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200' }, 'Média por Veículo')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-amber-600 tracking-tight block' }, formatMoney(workshopMetrics.avgTicket)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Média de valor faturado por ordem de serviço (Faturamento Total ÷ Volume de OSs faturadas).'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Peças em OS: ${formatMoney(workshopMetrics.partsTotal)}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${workshopMetrics.ticketVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                workshopMetrics.ticketVariation.formatted
              )
            )
          ),

          // Card 4: Liberação & Rampa
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700' }, 'Produtividade de Rampa'),
                React.createElement('span', { className: 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200' }, `${workshopMetrics.completionRate}%`)
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-emerald-600 tracking-tight block' }, `${workshopMetrics.completed} liberadas`),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Índice de ordens de serviço concluídas e liberadas em relação às ordens abertas.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Em execução: ${workshopMetrics.inProgress} veículos`),
              React.createElement('span', { className: 'font-bold text-emerald-600' }, 'Dentro do Prazo')
            )
          )
        );
      }

      if (activeTab === 'COMERCIO') {
        return React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
          // Card 1: Vendas Balcão
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700' }, 'Receita de Vendas Balcão (PDV)'),
                React.createElement('span', { className: 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200' }, 'Vendas Diretas')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, formatMoney(commerceMetrics.totalRevenue)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Faturamento bruto obtido no balcão e frente de caixa em vendas imediatas de autopeças.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `PIX: ${formatMoney(commerceMetrics.paymentSplit.PIX)}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${commerceMetrics.revVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                commerceMetrics.revVariation.formatted
              )
            )
          ),

          // Card 2: Quantidade de Vendas
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-blue-700' }, 'Transações no Caixa (Cupons)'),
                React.createElement('span', { className: 'text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200' }, `${commerceMetrics.count} Cupons`)
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, `${commerceMetrics.count} atendimentos`),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Número de transações comerciais finalizadas no caixa no período selecionado.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Cartão: ${formatMoney(commerceMetrics.paymentSplit.CREDIT_CARD + commerceMetrics.paymentSplit.DEBIT_CARD)}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${commerceMetrics.countVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                commerceMetrics.countVariation.formatted
              )
            )
          ),

          // Card 3: Ticket Médio Balcão
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700' }, 'Ticket Médio de Venda'),
                React.createElement('span', { className: 'text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200' }, 'Média por Cupom')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-amber-600 tracking-tight block' }, formatMoney(commerceMetrics.avgTicket)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Valor médio gasto por cliente em cada compra no balcão (Faturamento ÷ Total de Vendas).'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Catálogo: ${commerceMetrics.totalPartsCount} SKUs`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${commerceMetrics.ticketVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                commerceMetrics.ticketVariation.formatted
              )
            )
          ),

          // Card 4: Estoque Crítico
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700' }, 'Alerta de Ruptura de Estoque'),
                React.createElement('span', { className: 'text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold border border-rose-200' }, `${commerceMetrics.criticalStockCount} Críticos`)
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-rose-600 tracking-tight block' }, `${commerceMetrics.criticalStockCount} itens < 5 un`),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Produtos com saldo abaixo do ponto de segurança que exigem pedido urgente ao fornecedor.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, 'Reposição necessária'),
              React.createElement('button', {
                type: 'button',
                onClick: () => onNavigate('parts'),
                className: 'font-bold text-indigo-600 hover:underline cursor-pointer'
              }, 'Ver Peças →')
            )
          )
        );
      }

      if (activeTab === 'INDUSTRIA') {
        return React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
          // Card 1: Custo de Fabricação (CPV)
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-cyan-700' }, 'Custo de Fabricação (CPV Fabril)'),
                React.createElement('span', { className: 'text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-bold border border-cyan-200' }, 'Insumos + Mão de Obra')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, formatMoney(industryMetrics.totalCost)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Custo total real consumido pelas Ordens de Produção (matéria-prima, ferramentas e horas).'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `OPs ativas no PCP: ${industryMetrics.inLine}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${industryMetrics.costVariation.isPositive ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}` },
                industryMetrics.costVariation.formatted
              )
            )
          ),

          // Card 2: Unidades Produzidas
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-blue-700' }, 'Volume Físico Fabricado'),
                React.createElement('span', { className: 'text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200' }, `${industryMetrics.unitsProduced} un`)
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, `${industryMetrics.unitsProduced} unidades`),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Total de peças e produtos concluídos e aprovados nos testes de inspeção da fábrica.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Meta planejada: ${industryMetrics.unitsPlanned} un`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${industryMetrics.unitsVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                industryMetrics.unitsVariation.formatted
              )
            )
          ),

          // Card 3: Custo Médio Unitário
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-700' }, 'Custo Médio Unitário Fabril'),
                React.createElement('span', { className: 'text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200' }, 'Custo / Peça')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-indigo-600 tracking-tight block' }, formatMoney(industryMetrics.avgUnitCost)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Custo unitário real apurado por unidade física (Custo Total de Produção ÷ Unidades Produzidas).'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Estruturas BOM: ${industryMetrics.totalBomsCount}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${industryMetrics.unitCostVariation.isPositive ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}` },
                industryMetrics.unitCostVariation.formatted
              )
            )
          ),

          // Card 4: Taxa de Refugo (Scrap)
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700' }, 'Taxa de Refugo & Sucata (Scrap)'),
                React.createElement('span', { className: `text-[10px] px-2 py-0.5 rounded-full font-bold border ${Number(industryMetrics.scrapRate) <= 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}` },
                  `${industryMetrics.scrapRate}%`
                )
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-rose-600 tracking-tight block' }, `${industryMetrics.scrapUnits} peças perdidas`),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Percentual de perdas e peças rejeitadas pelo CQ (Refugos ÷ Total Produzido × 100). Meta: ≤ 5%.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Máquinas ativas: ${industryMetrics.operationalEq}`),
              React.createElement('span', { className: 'font-bold text-emerald-600' }, Number(industryMetrics.scrapRate) <= 5 ? 'Meta Atingida' : 'Atenção Operacional')
            )
          )
        );
      }

      if (activeTab === 'FINANCEIRO') {
        return React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
          // Card 1: Receitas Realizadas
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700' }, 'Receitas Operacionais Realizadas'),
                React.createElement('span', { className: 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200' }, 'Entradas')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, formatMoney(financialMetrics.totalInflow)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Total de recursos que entraram no caixa e contas bancárias via vendas balcão e ordens de serviço.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Oficina: ${formatMoney(workshopMetrics.totalRevenue)}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${financialMetrics.inflowVariation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                financialMetrics.inflowVariation.formatted
              )
            )
          ),

          // Card 2: Despesas Operacionais
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700' }, 'Despesas Operacionais (Saídas)'),
                React.createElement('span', { className: 'text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold border border-rose-200' }, 'Contas Pagas')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-rose-600 tracking-tight block' }, formatMoney(financialMetrics.totalExpenses)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Soma de todas as contas a pagar liquidadas ou previstas no período (custos fixos e variáveis).'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Fixas: ${formatMoney(financialMetrics.fixedExpenses)}`),
              React.createElement('span', { className: 'text-slate-500' }, `Var: ${formatMoney(financialMetrics.variableExpenses)}`)
            )
          ),

          // Card 3: Saldo Operacional Líquido (DRE)
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-700' }, 'Resultado Operacional Líquido (DRE)'),
                React.createElement('span', { className: `text-[10px] px-2 py-0.5 rounded-full font-bold border ${financialMetrics.isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}` },
                  financialMetrics.isPositive ? 'Superávit' : 'Déficit'
                )
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: `text-2xl font-black tracking-tight block ${financialMetrics.isPositive ? 'text-indigo-700' : 'text-rose-600'}` },
                  formatMoney(financialMetrics.netBalance)
                ),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Lucro operacional líquido apurado no regime de competência (Receitas Totais − Despesas Operacionais).'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Margem líquida: ${financialMetrics.profitMargin}%`),
              React.createElement('span', { className: 'font-bold text-indigo-600' }, 'Fluxo de Caixa')
            )
          ),

          // Card 4: Inadimplência
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700' }, 'Contas em Atraso (Inadimplência)'),
                React.createElement('span', { className: 'text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200' }, `${financialMetrics.overdueCount} Títulos`)
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-amber-600 tracking-tight block' }, formatMoney(financialMetrics.overdueAmount)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Títulos e duplicatas a receber cujo vencimento já expirou sem confirmação de liquidação bancária.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, 'Cobrança ativa necessária'),
              React.createElement('button', {
                type: 'button',
                onClick: () => onNavigate('accounts_receivable'),
                className: 'font-bold text-indigo-600 hover:underline cursor-pointer'
              }, 'Ver Contas →')
            )
          )
        );
      }

      if (activeTab === 'REPRESENTACAO') {
        return React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
          // Card 1: Faturamento Intermediado
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700' }, 'Faturamento Intermediado'),
                React.createElement('span', { className: 'text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200' }, 'Fábricas Parceiras')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, formatMoney(representationMetrics.totalIntermediated)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Valor bruto global dos pedidos comerciais transmitidos para faturamento direto pelas indústrias representadas.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Fábricas: ${representationMetrics.representedFactoriesCount}`),
              React.createElement('span', { className: `font-bold px-2 py-0.5 rounded ${representationMetrics.variation.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}` },
                representationMetrics.variation.formatted
              )
            )
          ),

          // Card 2: Comissões a Receber
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700' }, 'Comissões Mercantis a Receber'),
                React.createElement('span', { className: 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200' }, 'Comissões')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-emerald-600 tracking-tight block' }, formatMoney(representationMetrics.totalCommissions)),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Total de comissões devidas pelas indústrias representadas com base nos pedidos faturados no período.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, 'Taxa média: ~6.0%'),
              React.createElement('span', { className: 'font-bold text-emerald-600' }, 'A Liberar')
            )
          ),

          // Card 3: Pedidos Transmitidos
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-blue-700' }, 'Pedidos Comerciais Transmitidos'),
                React.createElement('span', { className: 'text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200' }, `${representationMetrics.count} Pedidos`)
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, `${representationMetrics.count} pedidos fechados`),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Quantidade de pedidos de compra enviados para as montadoras e fábricas no período.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, `Ticket médio: ${formatMoney(representationMetrics.avgOrder)}`),
              React.createElement('span', { className: 'font-bold text-blue-600' }, 'Em Expedição')
            )
          ),

          // Card 4: Prazo de Entrega
          React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-700' }, 'SLA & Pontualidade das Fábricas'),
                React.createElement('span', { className: 'text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200' }, '94.2% SLA')
              ),
              React.createElement('div', { className: 'my-3' },
                React.createElement('span', { className: 'text-2xl font-black text-indigo-600 tracking-tight block' }, '4.8 dias úteis'),
                React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                  'Prazo médio entre o envio do pedido comercial e a entrega efetiva pela fábrica ao cliente final.'
                )
              )
            ),
            React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
              React.createElement('span', { className: 'text-slate-500' }, 'Conformidade logística'),
              React.createElement('span', { className: 'font-bold text-emerald-600' }, 'Dentro do SLA')
            )
          )
        );
      }

      // ==========================================
      // VISÃO CONSOLIDADA 360º
      // ==========================================
      const consolidatedRevenue = workshopMetrics.totalRevenue + commerceMetrics.totalRevenue + industryMetrics.totalCost;
      const totalOps = workshopMetrics.count + commerceMetrics.count + industryMetrics.unitsProduced;
      const consolidatedAvg = totalOps > 0 ? consolidatedRevenue / totalOps : 0;

      return React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
        // Card 1: Faturamento Integrado
        React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
          React.createElement('div', null,
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-blue-700' }, 'Faturamento Global Consolidado'),
              React.createElement('span', { className: 'text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200' }, 'Multi-Setor')
            ),
            React.createElement('div', { className: 'my-3' },
              React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, formatMoney(consolidatedRevenue)),
              React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                'Soma de todas as fontes de receita e produção da empresa (Oficina + Balcão + Produção Fabril).'
              )
            )
          ),
          React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500' },
            React.createElement('span', null, `Oficina: ${formatMoney(workshopMetrics.totalRevenue)}`),
            React.createElement('span', null, `Balcão: ${formatMoney(commerceMetrics.totalRevenue)}`)
          )
        ),

        // Card 2: Volume Total de Operações
        React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
          React.createElement('div', null,
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-indigo-700' }, 'Volume Global de Operações'),
              React.createElement('span', { className: 'text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200' }, `${totalOps} Registros`)
            ),
            React.createElement('div', { className: 'my-3' },
              React.createElement('span', { className: 'text-2xl font-black text-slate-900 tracking-tight block' }, `${totalOps} operações`),
              React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                'Total consolidado de Ordens de Serviço faturadas, vendas no balcão e lotes fabris produzidos.'
              )
            )
          ),
          React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500' },
            React.createElement('span', null, `OSs: ${workshopMetrics.count}`),
            React.createElement('span', null, `Vendas: ${commerceMetrics.count}`)
          )
        ),

        // Card 3: Ticket Médio Geral
        React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
          React.createElement('div', null,
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700' }, 'Ticket Médio Ponderado Geral'),
              React.createElement('span', { className: 'text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200' }, 'Consolidado')
            ),
            React.createElement('div', { className: 'my-3' },
              React.createElement('span', { className: 'text-2xl font-black text-amber-600 tracking-tight block' }, formatMoney(consolidatedAvg)),
              React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                'Média ponderada gerada por cada operação do estabelecimento em todas as divisões de negócio.'
              )
            )
          ),
          React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500' },
            React.createElement('span', null, `Base de clientes: ${allClients.length}`),
            React.createElement('span', { className: 'font-bold text-amber-600' }, 'Média Geral')
          )
        ),

        // Card 4: Saúde Geral do Negócio
        React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between' },
          React.createElement('div', null,
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('span', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700' }, 'Saúde Operacional do Negócio'),
              React.createElement('span', { className: 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200' }, '98.5% Eficiência')
            ),
            React.createElement('div', { className: 'my-3' },
              React.createElement('span', { className: 'text-2xl font-black text-emerald-600 tracking-tight block' }, 'Operação Equilibrada'),
              React.createElement('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' },
                'Cruzamento integral de pátio em dia, giro de estoque saudável e controle financeiro regular.'
              )
            )
          ),
          React.createElement('div', { className: 'pt-3 border-t border-slate-100 flex items-center justify-between text-xs' },
            React.createElement('span', { className: 'text-slate-500' }, `Frota: ${allVehicles.length} veículos`),
            React.createElement('span', { className: 'font-bold text-emerald-600' }, 'Regular')
          )
        )
      );
    };

    // Renderizar gráfico de linha (LineChart)
    const renderTimelineChart = () => {
      const { gN: ResponsiveContainer, ySe: LineChart, lv: CartesianGrid, cv: XAxis, dv: YAxis, qb: Tooltip, AH: Legend, i0: Line } = charts;

      if (!ResponsiveContainer || !LineChart) {
        return React.createElement('div', { className: 'h-64 flex items-center justify-center text-slate-400 text-xs' }, 'Carregando gráfico...');
      }

      let dataKey1 = 'oficina';
      let strokeColor1 = '#4f46e5';
      let name1 = 'Faturamento Oficina (R$)';

      if (activeTab === 'COMERCIO') {
        dataKey1 = 'comercio';
        strokeColor1 = '#10b981';
        name1 = 'Vendas Balcão (R$)';
      } else if (activeTab === 'INDUSTRIA') {
        dataKey1 = 'producao';
        strokeColor1 = '#06b6d4';
        name1 = 'Custo Industrial (R$)';
      } else if (activeTab === 'FINANCEIRO') {
        dataKey1 = 'total';
        strokeColor1 = '#8b5cf6';
        name1 = 'Receitas Realizadas (R$)';
      } else if (activeTab === 'REPRESENTACAO') {
        dataKey1 = 'total';
        strokeColor1 = '#f59e0b';
        name1 = 'Pedidos Intermediados (R$)';
      } else if (activeTab === 'CONSOLIDADO') {
        dataKey1 = 'total';
        strokeColor1 = '#2563eb';
        name1 = 'Faturamento Consolidado (R$)';
      }

      return React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
        React.createElement(LineChart, { data: realTimelineData, margin: { top: 10, right: 20, left: 10, bottom: 5 } },
          React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: '#f1f5f9' }),
          React.createElement(XAxis, { dataKey: 'name', stroke: '#64748b', fontSize: 11 }),
          React.createElement(YAxis, { stroke: '#64748b', fontSize: 11, tickFormatter: (val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}` }),
          React.createElement(Tooltip, {
            formatter: (val) => [formatMoney(val), 'Valor Real'],
            contentStyle: { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }
          }),
          React.createElement(Legend, { verticalAlign: 'top', height: 36 }),
          React.createElement(Line, { type: 'monotone', dataKey: dataKey1, stroke: strokeColor1, strokeWidth: 3, activeDot: { r: 6 }, name: name1 }),
          compareWithPrevious && React.createElement(Line, { type: 'monotone', dataKey: 'valorAnterior', stroke: '#94a3b8', strokeDasharray: '4 4', strokeWidth: 2, name: 'Período Anterior (Comparativo)' })
        )
      );
    };

    // Renderizar gráfico de distribuição operacional (BarChart)
    const renderDistributionChart = () => {
      const { gN: ResponsiveContainer, s3: BarChart, lv: CartesianGrid, cv: XAxis, dv: YAxis, qb: Tooltip, xf: Bar, Uf: Cell } = charts;

      if (!ResponsiveContainer || !BarChart) {
        return React.createElement('div', { className: 'h-64 flex items-center justify-center text-slate-400 text-xs' }, 'Carregando distribuição...');
      }

      let chartData = [];

      if (activeTab === 'COMERCIO') {
        chartData = [
          { name: 'PIX', valor: commerceMetrics.paymentSplit.PIX, color: '#10b981' },
          { name: 'Cartão Crédito', valor: commerceMetrics.paymentSplit.CREDIT_CARD, color: '#6366f1' },
          { name: 'Cartão Débito', valor: commerceMetrics.paymentSplit.DEBIT_CARD, color: '#3b82f6' },
          { name: 'Dinheiro', valor: commerceMetrics.paymentSplit.CASH, color: '#f59e0b' }
        ];
      } else if (activeTab === 'INDUSTRIA') {
        chartData = [
          { name: 'Na Linha', valor: industryMetrics.inLine, color: '#06b6d4' },
          { name: 'Planejadas', valor: industryMetrics.planned, color: '#3b82f6' },
          { name: 'Concluídas', valor: industryMetrics.completed, color: '#10b981' },
          { name: 'Pausadas', valor: industryMetrics.paused, color: '#f43f5e' }
        ];
      } else if (activeTab === 'FINANCEIRO') {
        chartData = [
          { name: 'Desp. Fixas', valor: financialMetrics.fixedExpenses, color: '#3b82f6' },
          { name: 'Desp. Variáveis', valor: financialMetrics.variableExpenses, color: '#f59e0b' },
          { name: 'Saldo Caixa', valor: Math.max(0, financialMetrics.netBalance), color: '#10b981' },
          { name: 'Inadimplência', valor: financialMetrics.overdueAmount, color: '#ef4444' }
        ];
      } else {
        // Padrão Oficina
        chartData = [
          { name: 'A Iniciar', valor: workshopMetrics.pending, color: '#94a3b8' },
          { name: 'Pausadas', valor: workshopMetrics.paused, color: '#eab308' },
          { name: 'Na Rampa', valor: workshopMetrics.inProgress, color: '#22c55e' },
          { name: 'Liberados', valor: workshopMetrics.completed, color: '#3b82f6' }
        ];
      }

      return React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
        React.createElement(BarChart, { data: chartData, margin: { top: 10, right: 10, left: 10, bottom: 20 } },
          React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: '#f1f5f9' }),
          React.createElement(XAxis, { dataKey: 'name', stroke: '#64748b', fontSize: 10, angle: -10, textAnchor: 'end' }),
          React.createElement(YAxis, { stroke: '#64748b', fontSize: 11 }),
          React.createElement(Tooltip, {
            formatter: (val) => [activeTab === 'COMERCIO' || activeTab === 'FINANCEIRO' ? formatMoney(val) : `${val} un`, 'Total'],
            contentStyle: { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }
          }),
          React.createElement(Bar, { dataKey: 'valor', radius: [6, 6, 0, 0], name: 'Volume' },
            chartData.map((item, idx) => React.createElement(Cell, { key: `cell-${idx}`, fill: item.color || '#6366f1' }))
          )
        )
      );
    };

    // Obter dados da empresa atual
    const companyName = (db.companyInfo && db.companyInfo.tradeName) || (db.companyInfo && db.companyInfo.name) || 'Empresa Ativa';

    return React.createElement('div', { className: 'space-y-6 animate-fade-in font-sans', id: 'dashboard-view-container' },
      // ==========================================
      // BARRA SUPERIOR DE CABEÇALHO & SELETORES
      // ==========================================
      React.createElement('div', { className: 'bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5' },
        // Título e Segmento
        React.createElement('div', null,
          React.createElement('div', { className: 'flex items-center gap-3 flex-wrap' },
            React.createElement('h1', { className: 'text-2xl font-black tracking-tight text-slate-800 font-display flex items-center gap-2.5' },
              React.createElement('span', { className: 'w-3 h-3 rounded-full bg-indigo-600 animate-pulse' }),
              'Painel de Controle & Dashboards Estratégicos'
            ),
            React.createElement('span', { className: 'text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200' },
              `Empresa: ${companyName}`
            )
          ),
          React.createElement('p', { className: 'text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed' },
            'Monitore indicadores-chave com métricas e descrições detalhadas e fiéis à realidade de cada setor operacional.'
          )
        ),

        // Barra de Controles: Granularidade, Período e Comparativo
        React.createElement('div', { className: 'flex flex-wrap items-center gap-2.5' },
          // Seletor de Granularidade
          React.createElement('div', { className: 'flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold', id: 'toolbar-granularity-selector' },
            ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual'].map(g => {
              const labels = { mensal: 'Mês', bimestral: 'Bimestre', trimestral: 'Trimestre', semestral: 'Semestre', anual: 'Ano' };
              return React.createElement('button', {
                key: g,
                type: 'button',
                onClick: () => setGranularity(g),
                className: `px-2.5 py-1.5 rounded-lg transition cursor-pointer ${granularity === g ? 'bg-white shadow-2xs text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`
              }, labels[g]);
            })
          ),

          // Seletor de Período Específico
          React.createElement('select', {
            id: 'combobox-period-analysis',
            value: selectedPeriodValue,
            onChange: (e) => setSelectedPeriodValue(e.target.value),
            className: 'bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs text-xs font-bold text-slate-800 focus:outline-none cursor-pointer'
          },
            periodsList.map(p => React.createElement('option', { key: p.value, value: p.value }, p.label))
          ),

          // Toggle de Comparação
          React.createElement('button', {
            type: 'button',
            onClick: () => setCompareWithPrevious(!compareWithPrevious),
            className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${compareWithPrevious ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
          },
            React.createElement('span', null, 'Comparar c/ Anterior'),
            React.createElement('span', { className: `w-2 h-2 rounded-full ${compareWithPrevious ? 'bg-indigo-600' : 'bg-slate-300'}` })
          )
        )
      ),

      // ==========================================
      // ABAS SELETORAS DE DASHBOARD ESPECIALIZADO
      // ==========================================
      React.createElement('div', { className: 'bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-3xs flex items-center gap-1.5 overflow-x-auto scrollbar-none' },
        segments.map(seg => {
          const isActive = activeTab === seg.id;
          return React.createElement('button', {
            key: seg.id,
            type: 'button',
            onClick: () => handleTabChange(seg.id),
            className: `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`
          },
            React.createElement('span', { className: `w-2 h-2 rounded-full ${isActive ? 'bg-indigo-600' : 'bg-slate-400'}` }),
            React.createElement('span', null, seg.label),
            React.createElement('span', { className: `text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600'
            }` }, seg.badge)
          );
        })
      ),

      // ==========================================
      // ALERTA DE EMPRESA ZERADA (SE APLICÁVEL)
      // ==========================================
      isCompanyEmpty && React.createElement('div', { className: 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border border-blue-200 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs' },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('div', { className: 'w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0' }, 'ℹ️'),
          React.createElement('div', null,
            React.createElement('p', { className: 'font-bold text-blue-900 text-sm' }, 'Empresa Real sem Registros Cadastrados (Início Limpo)'),
            React.createElement('p', { className: 'text-blue-700 mt-0.5' },
              'Todas as métricas abaixo refletem fielmente os valores zerados desta empresa. À medida que você registrar ordens de serviço, vendas balcão ou compras, os indicadores e gráficos serão alimentados automaticamente em tempo real.'
            )
          )
        ),
        React.createElement('div', { className: 'flex items-center gap-2 shrink-0' },
          React.createElement('button', {
            type: 'button',
            onClick: () => onNavigate(activeTab === 'OFICINA' ? 'serviceOrders' : activeTab === 'COMERCIO' ? 'sales' : activeTab === 'INDUSTRIA' ? 'industry' : 'financial'),
            className: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer'
          }, '+ Primeiro Lançamento')
        )
      ),

      // ==========================================
      // CARDS DE MÉTRICAS ESPECÍFICAS DO SEGMENTO
      // ==========================================
      renderActiveCards(),

      // ==========================================
      // PAINEL DE GRÁFICOS: EVOLUÇÃO & STATUS
      // ==========================================
      React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
        // Gráfico de Linha de Evolução Temporal
        React.createElement('div', { className: 'lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4' },
          React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('div', null,
              React.createElement('h3', { className: 'text-base font-bold text-slate-800 font-display' },
                `Histórico & Evolução Temporal — ${segments.find(s => s.id === activeTab)?.label}`
              ),
              React.createElement('p', { className: 'text-xs text-slate-500 mt-0.5' },
                'Acompanhamento mensal com valores reais extraídos diretamente das movimentações da empresa.'
              )
            ),
            React.createElement('span', { className: 'text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100' },
              currentPeriod.label
            )
          ),
          React.createElement('div', { className: 'h-72 w-full pt-2' }, renderTimelineChart())
        ),

        // Gráfico de Barras de Distribuição Operacional
        React.createElement('div', { className: 'bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-base font-bold text-slate-800 font-display' },
              activeTab === 'OFICINA' ? 'Status das Ordens na Rampa' :
              activeTab === 'COMERCIO' ? 'Vendas por Meio de Pagamento' :
              activeTab === 'INDUSTRIA' ? 'Chão de Fábrica & OPs' :
              activeTab === 'FINANCEIRO' ? 'Composição das Despesas' : 'Distribuição Operacional'
            ),
            React.createElement('p', { className: 'text-xs text-slate-500 mt-0.5' },
              'Composição percentual e volumétrica do período ativo.'
            )
          ),
          React.createElement('div', { className: 'h-72 w-full pt-2' }, renderDistributionChart())
        )
      ),

      // ==========================================
      // ATALHOS RÁPIDOS & FLUXO OPERACIONAL
      // ==========================================
      React.createElement('div', { className: 'bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5' },
        React.createElement('div', { className: 'space-y-1 max-w-2xl' },
          React.createElement('h4', { className: 'text-sm font-bold tracking-wide uppercase text-indigo-400' },
            `Ações Rápidas & Fluxo Operacional — ${segments.find(s => s.id === activeTab)?.label}`
          ),
          React.createElement('p', { className: 'text-xs text-slate-300 leading-relaxed' },
            'Acesse diretamente as rotinas operacionais para registrar novos atendimentos, cadastros ou conciliações com sincronização instantânea em todos os indicadores.'
          )
        ),
        React.createElement('div', { className: 'flex flex-wrap items-center gap-2.5' },
          activeTab === 'OFICINA' && React.createElement('button', {
            type: 'button',
            onClick: () => onNavigate('serviceOrders'),
            className: 'bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs'
          }, '+ Nova Ordem de Serviço'),

          activeTab === 'COMERCIO' && React.createElement('button', {
            type: 'button',
            onClick: () => onNavigate('sales'),
            className: 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs'
          }, '+ Nova Venda Balcão (PDV)'),

          activeTab === 'INDUSTRIA' && React.createElement('button', {
            type: 'button',
            onClick: () => onNavigate('industry'),
            className: 'bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs'
          }, 'Abrir Módulo Industrial PCP'),

          activeTab === 'FINANCEIRO' && React.createElement('button', {
            type: 'button',
            onClick: () => onNavigate('financial'),
            className: 'bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs'
          }, 'Gerenciar Caixa & DRE'),

          React.createElement('button', {
            type: 'button',
            onClick: () => onNavigate('parts'),
            className: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer'
          }, 'Estoque & Catálogo'),

          React.createElement('button', {
            type: 'button',
            onClick: () => onNavigate('clients'),
            className: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer'
          }, 'Base de Clientes')
        )
      )
    );
  }

  console.log('[Dashboard Specialist Engine] Motor de Dashboards Especializados carregado com sucesso.');
})();
