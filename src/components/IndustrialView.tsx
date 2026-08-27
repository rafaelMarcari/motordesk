/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK - MÓDULO DE GESTÃO INDUSTRIAL & PCP
 * Foco: PCP, BOM (Estrutura do Produto), Ordens de Produção (OP), Rastreabilidade por Lotes e Estoque Operacional
 */

import React, { useState, useMemo } from 'react';
import { 
  Factory, Layers, Cpu, Package, AlertCircle, CheckCircle2, Clock, 
  Search, Plus, Filter, Eye, ArrowRight, Play, Check, X, Printer,
  FileText, ShieldCheck, TrendingUp, BarChart3, AlertTriangle, 
  Boxes, RefreshCw, Hash, Calendar, User, ChevronRight, Download
} from 'lucide-react';
import { AppDatabase } from '../data/mockData';
import { 
  BillOfMaterials, 
  ProductionOrder, 
  ProductLot, 
  OperationalAlert, 
  User as UserType, 
  Part, 
  CompanyInfo, 
  BusinessType
} from '../types';

interface IndustrialViewProps {
  db: AppDatabase;
  currentUser: UserType;
  currentCompany?: CompanyInfo;
  onUpdateDb: (updater: AppDatabase | ((prev: AppDatabase) => AppDatabase)) => void;
  onAddHistoryLog?: (type: any, action: string, details: string, id?: string, num?: string, metadata?: any) => void;
  onNavigateToView?: (viewId: any) => void;
}

export default function IndustrialView({
  db,
  currentUser,
  currentCompany,
  onUpdateDb,
  onAddHistoryLog,
  onNavigateToView
}: IndustrialViewProps) {
  const [activeTab, setActiveTab] = useState<'pcp_dashboard' | 'boms' | 'production_orders' | 'lots' | 'stock_traffic'>('pcp_dashboard');
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedBom, setSelectedBom] = useState<BillOfMaterials | null>(null);
  const [selectedOp, setSelectedOp] = useState<ProductionOrder | null>(null);
  const [selectedLot, setSelectedLot] = useState<ProductLot | null>(null);
  
  // Modal States
  const [showNewOpModal, setShowNewOpModal] = useState(false);
  const [showNewBomModal, setShowNewBomModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressProducedQty, setProgressProducedQty] = useState<number>(0);
  const [progressScrapQty, setProgressScrapQty] = useState<number>(0);
  const [progressNotes, setProgressNotes] = useState<string>('');

  // Form states for New OP
  const [newOpBomId, setNewOpBomId] = useState('');
  const [newOpPlannedQty, setNewOpPlannedQty] = useState<number>(100);
  const [newOpPriority, setNewOpPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [newOpDeadline, setNewOpDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newOpNotes, setNewOpNotes] = useState('');

  // Form states for New BOM
  const [newBomName, setNewBomName] = useState('');
  const [newBomCode, setNewBomCode] = useState('');
  const [newBomFinishedPartId, setNewBomFinishedPartId] = useState('');
  const [newBomStandardBatch, setNewBomStandardBatch] = useState<number>(100);
  const [newBomCycleMinutes, setNewBomCycleMinutes] = useState<number>(45);
  const [newBomLaborCost, setNewBomLaborCost] = useState<number>(15.50);
  const [newBomOverheadCost, setNewBomOverheadCost] = useState<number>(8.20);
  const [newBomItems, setNewBomItems] = useState<{ rawPartId: string; quantity: number; unit: string; scrapRatePercent: number }[]>([
    { rawPartId: '', quantity: 1, unit: 'UN', scrapRatePercent: 2 }
  ]);

  // Derived Scoped Collections
  const boms: BillOfMaterials[] = useMemo(() => db.boms || db.billOfMaterials || [], [db.boms, db.billOfMaterials]);
  const productionOrders: ProductionOrder[] = useMemo(() => db.productionOrders || [], [db.productionOrders]);
  const productLots: ProductLot[] = useMemo(() => db.productLots || [], [db.productLots]);
  const alerts: OperationalAlert[] = useMemo(() => db.operationalAlerts || [], [db.operationalAlerts]);
  const parts: Part[] = useMemo(() => db.parts || [], [db.parts]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalOps = productionOrders.length;
    const inProduction = productionOrders.filter(op => op.status === 'IN_PRODUCTION' || op.status === 'SEPARATION').length;
    const planned = productionOrders.filter(op => op.status === 'PLANNED').length;
    const completed = productionOrders.filter(op => op.status === 'COMPLETED').length;
    
    const totalPlannedUnits = productionOrders.reduce((sum, op) => sum + op.plannedQuantity, 0);
    const totalProducedUnits = productionOrders.reduce((sum, op) => sum + op.producedQuantity, 0);
    const totalScrapUnits = productionOrders.reduce((sum, op) => sum + op.scrapQuantity, 0);
    const scrapRate = totalProducedUnits + totalScrapUnits > 0 
      ? ((totalScrapUnits / (totalProducedUnits + totalScrapUnits)) * 100).toFixed(1)
      : '0.0';

    return {
      totalOps,
      inProduction,
      planned,
      completed,
      totalPlannedUnits,
      totalProducedUnits,
      totalScrapUnits,
      scrapRate,
      activeAlertsCount: alerts.filter(a => !a.resolved).length
    };
  }, [productionOrders, alerts]);

  // Operational Stock Analysis for traffic light
  const stockTraffic = useMemo(() => {
    return parts.map(part => {
      const physical = part.stockQuantity || 0;
      const reserved = part.reservedStock || 0;
      const separated = part.separatedStock || 0;
      const dispatched = part.dispatchedStock || 0;
      const delivered = part.deliveredStock || 0;
      const available = physical - reserved;
      
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (available <= 0) status = 'critical';
      else if (available < (part.minStock || 5)) status = 'warning';

      return {
        ...part,
        physical,
        reserved,
        separated,
        dispatched,
        delivered,
        available,
        status
      };
    });
  }, [parts]);

  // Handle OP Status Transitions
  const handleUpdateOpStatus = (opId: string, newStatus: ProductionOrder['status']) => {
    const op = productionOrders.find(o => o.id === opId);
    if (!op) return;

    const now = new Date().toISOString();
    const updatedOps = productionOrders.map(o => {
      if (o.id === opId) {
        return {
          ...o,
          status: newStatus,
          startDate: newStatus === 'IN_PRODUCTION' && !o.startDate ? now : o.startDate,
          endDate: newStatus === 'COMPLETED' ? now : o.endDate,
          updatedAt: now
        };
      }
      return o;
    });

    onUpdateDb(prev => ({
      ...prev,
      productionOrders: updatedOps
    }));

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'order',
        `Ordem de Produção ${op.code} atualizada`,
        `Status alterado para "${newStatus}" pelo operador ${currentUser.name}.`,
        op.id,
        op.code
      );
    }

    if (selectedOp?.id === opId) {
      setSelectedOp(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Handle Registering Production Output (Apontamento de Produção)
  const handleRegisterProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp) return;

    const newProduced = (selectedOp.producedQuantity || 0) + Number(progressProducedQty);
    const newScrap = (selectedOp.scrapQuantity || 0) + Number(progressScrapQty);
    const isCompleted = newProduced >= selectedOp.plannedQuantity;

    const now = new Date().toISOString();
    const lotNumber = `LOTE-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    // Create or update generated lot if completed
    let updatedLots = [...productLots];
    if (isCompleted || progressProducedQty > 0) {
      const newLot: ProductLot = {
        id: `lot-${Date.now()}`,
        lotNumber: lotNumber,
        partId: selectedOp.finishedPartId,
        partName: selectedOp.finishedPartName,
        productionOrderId: selectedOp.id,
        productionOrderCode: selectedOp.code,
        manufactureDate: now.split('T')[0],
        initialQuantity: Number(progressProducedQty),
        currentQuantity: Number(progressProducedQty),
        unit: 'UN',
        qualityStatus: 'APPROVED',
        inspectedBy: currentUser.name,
        companyId: selectedOp.companyId,
        createdAt: now
      };
      updatedLots.push(newLot);
    }

    // Update OP
    const updatedOps = productionOrders.map(o => {
      if (o.id === selectedOp.id) {
        return {
          ...o,
          producedQuantity: newProduced,
          scrapQuantity: newScrap,
          status: isCompleted ? ('COMPLETED' as const) : o.status,
          endDate: isCompleted ? now : o.endDate,
          updatedAt: now
        };
      }
      return o;
    });

    // Update finished part stock and raw material deductions
    const updatedParts = parts.map(p => {
      if (p.id === selectedOp.finishedPartId) {
        return {
          ...p,
          stockQuantity: (p.stockQuantity || 0) + Number(progressProducedQty)
        };
      }
      return p;
    });

    onUpdateDb(prev => ({
      ...prev,
      productionOrders: updatedOps,
      productLots: updatedLots,
      parts: updatedParts
    }));

    onAddHistoryLog(
      'order',
      `Apontamento de Produção na OP ${selectedOp.code}`,
      `Registrado +${progressProducedQty} unidades produzidas e ${progressScrapQty} refugos por ${currentUser.name}. Lote gerado: ${lotNumber}.`,
      selectedOp.id,
      selectedOp.code
    );

    setShowProgressModal(false);
    setProgressProducedQty(0);
    setProgressScrapQty(0);
    setProgressNotes('');
    if (selectedOp) {
      setSelectedOp(prev => prev ? { ...prev, producedQuantity: newProduced, scrapQuantity: newScrap, status: isCompleted ? 'COMPLETED' : prev.status } : null);
    }
  };

  // Create New OP
  const handleCreateOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpBomId || newOpPlannedQty <= 0) {
      alert('Selecione uma BOM e defina a quantidade planejada.');
      return;
    }

    const bom = boms.find(b => b.id === newOpBomId);
    if (!bom) return;

    const opCount = productionOrders.length + 1;
    const opCode = `OP-${new Date().getFullYear()}-${String(opCount).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const newOp: ProductionOrder = {
      id: `op-${Date.now()}`,
      code: opCode,
      billOfMaterialsId: bom.id,
      finishedPartId: bom.finishedPartId,
      finishedPartName: bom.finishedPartName,
      plannedQuantity: Number(newOpPlannedQty),
      producedQuantity: 0,
      scrapQuantity: 0,
      unit: bom.unit || 'UN',
      status: 'PLANNED',
      priority: newOpPriority,
      scheduledDate: newOpDeadline,
      assignedOperatorId: currentUser.id,
      assignedOperatorName: currentUser.name,
      notes: newOpNotes,
      unitEstimatedCost: bom.totalUnitCost,
      totalEstimatedCost: (bom.totalUnitCost || 0) * Number(newOpPlannedQty),
      companyId: currentCompany?.id || 'comp-5',
      createdAt: now,
      updatedAt: now
    };

    onUpdateDb(prev => ({
      ...prev,
      productionOrders: [newOp, ...(prev.productionOrders || [])]
    }));

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'order',
        `Nova Ordem de Produção Criada: ${opCode}`,
        `OP planejada para fabricação de ${newOpPlannedQty}x ${bom.finishedPartName || bom.name}. Prioridade: ${newOpPriority}.`,
        newOp.id,
        newOp.code
      );
    }

    setShowNewOpModal(false);
    setNewOpPlannedQty(100);
    setNewOpNotes('');
  };

  // Create New BOM
  const handleCreateBom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBomName.trim() || !newBomFinishedPartId) {
      alert('Nome da BOM e Produto Acabado são obrigatórios.');
      return;
    }

    const finishedPart = parts.find(p => p.id === newBomFinishedPartId);
    const calculatedItems = newBomItems
      .filter(item => item.rawPartId && item.quantity > 0)
      .map(item => {
        const rawPart = parts.find(p => p.id === item.rawPartId);
        const unitCost = rawPart?.costPrice || rawPart?.salePrice || 10;
        const totalCost = unitCost * item.quantity * (1 + (item.scrapRatePercent / 100));
        return {
          rawPartId: item.rawPartId,
          rawPartName: rawPart?.name || 'Insumo',
          rawPartCode: rawPart?.code || 'INS-01',
          quantity: Number(item.quantity),
          unit: item.unit,
          scrapRatePercent: Number(item.scrapRatePercent),
          unitCost: unitCost,
          totalCost: totalCost
        };
      });

    const materialsCost = calculatedItems.reduce((sum, it) => sum + it.totalCost, 0);
    const totalUnitCost = materialsCost + Number(newBomLaborCost) + Number(newBomOverheadCost);
    const now = new Date().toISOString();

    const newBomObj: BillOfMaterials = {
      id: `bom-${Date.now()}`,
      code: newBomCode.trim() || `BOM-${Date.now().toString().slice(-4)}`,
      name: newBomName.trim(),
      finishedPartId: newBomFinishedPartId,
      finishedPartName: finishedPart?.name || newBomName.trim(),
      version: '1.0',
      active: true,
      standardBatchQuantity: Number(newBomStandardBatch),
      unit: finishedPart?.unit || 'UN',
      estimatedCycleTimeMinutes: Number(newBomCycleMinutes),
      laborCostPerUnit: Number(newBomLaborCost),
      overheadCostPerUnit: Number(newBomOverheadCost),
      materialsCostPerUnit: materialsCost,
      totalUnitCost: totalUnitCost,
      items: calculatedItems,
      companyId: currentCompany?.id || 'comp-5',
      createdAt: now,
      updatedAt: now
    };

    onUpdateDb(prev => ({
      ...prev,
      boms: [newBomObj, ...(prev.boms || prev.billOfMaterials || [])],
      billOfMaterials: [newBomObj, ...(prev.boms || prev.billOfMaterials || [])]
    }));

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'system',
        `Nova Estrutura BOM Criada: ${newBomObj.name}`,
        `Cadastrada engenharia do produto com ${calculatedItems.length} insumos e custo unitário R$ ${totalUnitCost.toFixed(2)}.`,
        newBomObj.id,
        newBomObj.code
      );
    }

    setShowNewBomModal(false);
    setNewBomName('');
    setNewBomCode('');
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6" id="industrial-management-view">
      {/* HEADER WITH SEGMENT BADGE */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-mono">
              <Factory className="w-3.5 h-3.5" /> SEGMENTO INDUSTRIAL & PCP
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-300 text-xs font-medium">{currentCompany?.name || 'Planta Industrial'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Planejamento & Controle da Produção (PCP)
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Gestão integrada de Engenharia de Produto (BOM), Ordens de Produção (OP), Rastreabilidade de Lotes e Controle de Estoque Operacional.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNewOpModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-sm cursor-pointer"
            id="btn-new-production-order"
          >
            <Plus className="w-4 h-4" /> Nova Ordem de Produção (OP)
          </button>
          <button
            type="button"
            onClick={() => setShowNewBomModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
            id="btn-new-bom"
          >
            <Layers className="w-4 h-4 text-indigo-400" /> Nova Estrutura (BOM)
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2" id="industrial-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('pcp_dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'pcp_dashboard'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Painel PCP & KPIs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('production_orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'production_orders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" /> Ordens de Produção ({productionOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('boms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'boms'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> Estrutura do Produto (BOM) ({boms.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lots')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'lots'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Rastreabilidade por Lotes ({productLots.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stock_traffic')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'stock_traffic'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" /> Estoque Operacional & Semáforo
        </button>
      </div>

      {/* 1. PCP DASHBOARD TAB */}
      {activeTab === 'pcp_dashboard' && (
        <div className="space-y-6 animate-fade-in" id="tab-pcp-dashboard">
          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">OPs em Execução</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Play className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 font-mono">{kpis.inProduction}</div>
              <p className="text-[11px] text-slate-400">Das {kpis.totalOps} OPs cadastradas na planta</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Unidades Produzidas</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 font-mono">{kpis.totalProducedUnits.toLocaleString('pt-BR')}</div>
              <p className="text-[11px] text-emerald-600 font-medium">Meta planejada: {kpis.totalPlannedUnits.toLocaleString('pt-BR')} un</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Índice de Refugo / Scrap</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-600 font-mono">{kpis.scrapRate}%</div>
              <p className="text-[11px] text-slate-400">{kpis.totalScrapUnits} peças rejeitadas na qualidade</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Alertas Operacionais</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 font-mono">{kpis.activeAlertsCount}</div>
              <p className="text-[11px] text-slate-400">Gargalos e insumos em ponto de pedido</p>
            </div>
          </div>

          {/* ACTIVE ALERTS LIST */}
          {alerts.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alertas Ativos de PCP & Estoque Crítico
                </h3>
                <span className="text-[11px] text-slate-400">Ação imediata recomendada</span>
              </div>

              <div className="space-y-2">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 text-xs ${
                      alert.severity === 'CRITICAL' ? 'bg-rose-50/70 border-rose-200 text-rose-800' :
                      alert.severity === 'HIGH' ? 'bg-amber-50/70 border-amber-200 text-amber-800' :
                      'bg-blue-50/70 border-blue-200 text-blue-800'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase tracking-wide">{alert.title}</span>
                        <span className="text-[10px] font-mono opacity-80">{alert.createdAt.split('T')[0]}</span>
                      </div>
                      <p className="opacity-90 leading-relaxed">{alert.description}</p>
                      {alert.recommendedAction && (
                        <p className="text-[11px] font-semibold mt-1">💡 Ação: {alert.recommendedAction}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateDb(prev => ({
                          ...prev,
                          operationalAlerts: (prev.operationalAlerts || []).filter(a => a.id !== alert.id)
                        }));
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 shrink-0 cursor-pointer"
                      title="Marcar como resolvido"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE PRODUCTION LINE OVERVIEW */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                <Factory className="w-4 h-4 text-indigo-600" />
                Linhas de Produção em Andamento
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('production_orders')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Ver Todas as OPs <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productionOrders.slice(0, 6).map(op => {
                const progress = op.plannedQuantity > 0 
                  ? Math.min(100, Math.round(((op.producedQuantity || 0) / op.plannedQuantity) * 100))
                  : 0;

                return (
                  <div key={op.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                        {op.code}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        op.status === 'IN_PRODUCTION' ? 'bg-amber-100 text-amber-800' :
                        op.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        op.status === 'SEPARATION' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {op.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{op.finishedPartName}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Prazo: {op.scheduledDate || 'S/D'}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Progresso: {op.producedQuantity} / {op.plannedQuantity} {op.unit}</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`} 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Resp: {op.assignedOperatorName || 'N/A'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOp(op);
                          setShowProgressModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        Apontar <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. PRODUCTION ORDERS TAB */}
      {activeTab === 'production_orders' && (
        <div className="space-y-4 animate-fade-in" id="tab-production-orders">
          {/* SEARCH & FILTERS */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por código da OP, produto acabado ou operador..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-sans"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PLANNED">Planejadas (PLANNED)</option>
                <option value="SEPARATION">Em Separação</option>
                <option value="IN_PRODUCTION">Em Produção</option>
                <option value="QUALITY_CHECK">Inspeção de Qualidade</option>
                <option value="COMPLETED">Concluídas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>

              <button
                type="button"
                onClick={() => setShowNewOpModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Nova OP
              </button>
            </div>
          </div>

          {/* PRODUCTION ORDERS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Código OP</th>
                    <th className="p-3.5">Produto Acabado</th>
                    <th className="p-3.5">Qtd Planejada</th>
                    <th className="p-3.5">Produzido / Refugo</th>
                    <th className="p-3.5">Progresso</th>
                    <th className="p-3.5">Prazo</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {productionOrders
                    .filter(op => {
                      if (statusFilter !== 'ALL' && op.status !== statusFilter) return false;
                      if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        return (
                          op.code.toLowerCase().includes(term) ||
                          op.finishedPartName.toLowerCase().includes(term) ||
                          (op.assignedOperatorName && op.assignedOperatorName.toLowerCase().includes(term))
                        );
                      }
                      return true;
                    })
                    .map(op => {
                      const progress = op.plannedQuantity > 0 
                        ? Math.min(100, Math.round(((op.producedQuantity || 0) / op.plannedQuantity) * 100))
                        : 0;

                      return (
                        <tr key={op.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3.5 font-mono font-bold text-slate-800">
                            {op.code}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{op.finishedPartName}</div>
                            <span className="text-[10px] text-slate-400">Operador: {op.assignedOperatorName || 'N/A'}</span>
                          </td>
                          <td className="p-3.5 font-mono font-medium">
                            {op.plannedQuantity} {op.unit}
                          </td>
                          <td className="p-3.5 font-mono">
                            <span className="text-emerald-600 font-bold">{op.producedQuantity || 0}</span>
                            {op.scrapQuantity ? <span className="text-rose-500 font-bold"> / -{op.scrapQuantity}</span> : null}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">{progress}%</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {op.scheduledDate || 'S/D'}
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              op.status === 'IN_PRODUCTION' ? 'bg-amber-100 text-amber-800' :
                              op.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              op.status === 'SEPARATION' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {op.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOp(op);
                                setShowProgressModal(true);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-[11px] transition cursor-pointer"
                              title="Registrar Apontamento de Produção"
                            >
                              Apontar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOp(op);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition cursor-pointer"
                              title="Ver Detalhes da OP"
                            >
                              <Eye className="w-3.5 h-3.5 inline" />
                            </button>
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

      {/* 3. BOMS (BILL OF MATERIALS) TAB */}
      {activeTab === 'boms' && (
        <div className="space-y-4 animate-fade-in" id="tab-boms">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display">Engenharia de Produto & Estruturas (BOM)</h3>
              <p className="text-xs text-slate-500">Composição dos insumos, custos de mão de obra e tempos padrão de fabricação.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewBomModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova BOM
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boms.map(bom => (
              <div key={bom.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {bom.code}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    v{bom.version} ATIVA
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{bom.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Produto Acabado: <strong>{bom.finishedPartName}</strong></p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Lote Padrão:</span>
                    <span className="font-mono font-bold text-slate-800">{bom.standardBatchQuantity} {bom.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tempo de Ciclo:</span>
                    <span className="font-mono">{bom.estimatedCycleTimeMinutes} min</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="font-semibold">Custo Unitário Total:</span>
                    <span className="font-mono font-bold text-emerald-700">R$ {bom.totalUnitCost.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Insumos & Componentes:</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {(bom.items || []).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="truncate max-w-[160px] text-slate-700">{it.rawPartName}</span>
                        <span className="font-mono text-slate-500 shrink-0">{it.quantity} {it.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewOpBomId(bom.id);
                    setShowNewOpModal(true);
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 text-amber-400" /> Gerar OP a partir desta BOM
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. LOTS & TRACEABILITY TAB */}
      {activeTab === 'lots' && (
        <div className="space-y-4 animate-fade-in" id="tab-lots">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 font-display">Rastreabilidade Operacional por Lotes</h3>
            <p className="text-xs text-slate-500">Histórico de fabricação, inspeção de qualidade e destino de cada lote produzido.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Número do Lote</th>
                  <th className="p-3.5">Produto</th>
                  <th className="p-3.5">Origem (OP)</th>
                  <th className="p-3.5">Data Fabricação</th>
                  <th className="p-3.5">Saldo / Qtd Inicial</th>
                  <th className="p-3.5">Qualidade</th>
                  <th className="p-3.5">Inspetor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {productLots.map(lot => (
                  <tr key={lot.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {lot.lotNumber}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {lot.partName}
                    </td>
                    <td className="p-3.5 font-mono text-indigo-600">
                      {lot.productionOrderCode || 'Estoque Inicial'}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {lot.manufactureDate}
                    </td>
                    <td className="p-3.5 font-mono font-bold">
                      {lot.currentQuantity} / {lot.initialQuantity} {lot.unit}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        lot.qualityStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        lot.qualityStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {lot.qualityStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {lot.inspectedBy || 'Engenharia'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. STOCK TRAFFIC LIGHT TAB */}
      {activeTab === 'stock_traffic' && (
        <div className="space-y-4 animate-fade-in" id="tab-stock-traffic">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 font-display">Semáforo de Estoque Operacional Real</h3>
            <p className="text-xs text-slate-500">Diferenciação clara entre Físico, Reservado, Separado, Disponível e Expedido.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Código / Item</th>
                  <th className="p-3.5">Físico</th>
                  <th className="p-3.5">Reservado</th>
                  <th className="p-3.5">Separado</th>
                  <th className="p-3.5">Disponível Real</th>
                  <th className="p-3.5">Mínimo</th>
                  <th className="p-3.5">Semáforo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {stockTraffic.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <span className="text-[10px] font-mono text-slate-400">{item.code}</span>
                    </td>
                    <td className="p-3.5 font-mono font-medium">
                      {item.physical} {item.unit || 'UN'}
                    </td>
                    <td className="p-3.5 font-mono text-amber-600 font-medium">
                      {item.reserved} {item.unit || 'UN'}
                    </td>
                    <td className="p-3.5 font-mono text-indigo-600 font-medium">
                      {item.separated} {item.unit || 'UN'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {item.available} {item.unit || 'UN'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {item.minStock || 5}
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit ${
                        item.status === 'ok' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'ok' ? 'bg-emerald-500' :
                          item.status === 'warning' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`} />
                        {item.status === 'ok' ? 'Regular' : item.status === 'warning' ? 'Ponto de Pedido' : 'Crítico'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA ORDEM DE PRODUÇÃO (OP) */}
      {showNewOpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-new-op">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-500" />
                Criar Nova Ordem de Produção (OP)
              </h3>
              <button 
                type="button"
                onClick={() => setShowNewOpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOp} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Estrutura do Produto (BOM) *</label>
                <select
                  value={newOpBomId}
                  onChange={e => setNewOpBomId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs"
                >
                  <option value="">Selecione a Engenharia / BOM...</option>
                  {boms.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.finishedPartName} (v{b.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qtd Planejada *</label>
                  <input
                    type="number"
                    min="1"
                    value={newOpPlannedQty}
                    onChange={e => setNewOpPlannedQty(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioridade</label>
                  <select
                    value={newOpPriority}
                    onChange={e => setNewOpPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Data Limite de Entrega / Prazo</label>
                <input
                  type="date"
                  value={newOpDeadline}
                  onChange={e => setNewOpDeadline(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Observações do PCP</label>
                <textarea
                  rows={2}
                  value={newOpNotes}
                  onChange={e => setNewOpNotes(e.target.value)}
                  placeholder="Instruções de usinagem, tratamento térmico ou inspeção..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOpModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Planejar OP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APONTAMENTO DE PRODUÇÃO */}
      {showProgressModal && selectedOp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-op-progress">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-display">Apontamento de Produção</h3>
                <p className="text-xs text-slate-400">OP {selectedOp.code} — {selectedOp.finishedPartName}</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowProgressModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterProgress} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span>Qtd Planejada:</span>
                  <span className="font-mono font-bold">{selectedOp.plannedQuantity} {selectedOp.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Já Produzido:</span>
                  <span className="font-mono text-emerald-600 font-bold">{selectedOp.producedQuantity} {selectedOp.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo a Produzir:</span>
                  <span className="font-mono text-amber-600 font-bold">
                    {Math.max(0, selectedOp.plannedQuantity - (selectedOp.producedQuantity || 0))} {selectedOp.unit}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qtd Produzida (Neste Lote) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedOp.plannedQuantity - (selectedOp.producedQuantity || 0)}
                    value={progressProducedQty}
                    onChange={e => setProgressProducedQty(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Refugo / Perda (Scrap)</label>
                  <input
                    type="number"
                    min="0"
                    value={progressScrapQty}
                    onChange={e => setProgressScrapQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Observações do Operador</label>
                <textarea
                  rows={2}
                  value={progressNotes}
                  onChange={e => setProgressNotes(e.target.value)}
                  placeholder="Apontamento de lote, máquina, operador..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Salvar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
