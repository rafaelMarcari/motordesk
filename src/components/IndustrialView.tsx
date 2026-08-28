/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK - MÓDULO DE GESTÃO INDUSTRIAL & PCP
 * Módulos: PCP, BOM (Engenharia de Produto), Ordens de Produção (OP), Rastreabilidade de Lotes CQ,
 * Semáforo de Insumos, Manutenção de Equipamentos, Compras MRP, Análise de Custos e Relatórios OEE.
 */

import React, { useState, useMemo } from 'react';
import { 
  Factory, Layers, Cpu, Package, AlertCircle, CheckCircle2, Clock, 
  Search, Plus, Filter, Eye, ArrowRight, Play, Check, X, Printer,
  FileText, ShieldCheck, TrendingUp, BarChart3, AlertTriangle, 
  Boxes, RefreshCw, Hash, Calendar, User, ChevronRight, Download,
  Wrench, ShoppingCart, DollarSign, Activity
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
  BusinessType,
  InstalledEquipment,
  EquipmentMaintenancePlan,
  EquipmentMaintenanceOrder,
  ProductionScrapLog,
  ProductionReworkLog
} from '../types';

import { IndustrialDashboardTab } from './industrial/IndustrialDashboardTab';
import { IndustrialBomTab } from './industrial/IndustrialBomTab';
import { IndustrialProductionOrdersTab } from './industrial/IndustrialProductionOrdersTab';
import { IndustrialLotsTab } from './industrial/IndustrialLotsTab';
import { IndustrialStockTrafficTab } from './industrial/IndustrialStockTrafficTab';
import { IndustrialMaintenanceTab } from './industrial/IndustrialMaintenanceTab';
import { IndustrialPurchasingTab } from './industrial/IndustrialPurchasingTab';
import { IndustrialCostAnalysisTab } from './industrial/IndustrialCostAnalysisTab';
import { IndustrialReportsTab } from './industrial/IndustrialReportsTab';

interface IndustrialViewProps {
  db: AppDatabase;
  currentUser: UserType;
  currentCompany?: CompanyInfo;
  onUpdateDb: (updater: AppDatabase | ((prev: AppDatabase) => AppDatabase)) => void;
  onAddHistoryLog?: (type: any, action: string, details: string, id?: string, num?: string, metadata?: any) => void;
  onNavigateToView?: (viewId: any) => void;
}

export type IndustrialTabType = 
  | 'pcp_dashboard' 
  | 'boms' 
  | 'production_orders' 
  | 'lots' 
  | 'stock_traffic' 
  | 'equipment_maintenance' 
  | 'purchasing_suggestions' 
  | 'cost_analysis' 
  | 'industrial_reports';

export default function IndustrialView({
  db,
  currentUser,
  currentCompany = { 
    id: 'comp-01', 
    name: 'Matriz Industrial', 
    cnpj: '12.345.678/0001-90', 
    tradeName: 'MotorDesk Indústria', 
    city: 'São Paulo', 
    state: 'SP',
    phone: '(11) 3456-7890',
    whatsapp: '(11) 98765-4321',
    email: 'contato@motordesk.com.br',
    address: 'Av. Industrial, 1000 - Galpão 4',
    registeredAt: '2026-01-01'
  },
  onUpdateDb,
  onAddHistoryLog,
  onNavigateToView
}: IndustrialViewProps) {
  const [activeTab, setActiveTab] = useState<IndustrialTabType>('pcp_dashboard');

  // Derived Collections
  const boms: BillOfMaterials[] = useMemo(() => db.boms || db.billOfMaterials || [], [db.boms, db.billOfMaterials]);
  const productionOrders: ProductionOrder[] = useMemo(() => db.productionOrders || [], [db.productionOrders]);
  const productLots: ProductLot[] = useMemo(() => db.productLots || [], [db.productLots]);
  const alerts: OperationalAlert[] = useMemo(() => db.operationalAlerts || [], [db.operationalAlerts]);
  const parts: Part[] = useMemo(() => db.parts || [], [db.parts]);
  const equipment: InstalledEquipment[] = useMemo(() => db.installedEquipment || [], [db.installedEquipment]);
  const maintenancePlans: EquipmentMaintenancePlan[] = useMemo(() => db.equipmentMaintenancePlans || [], [db.equipmentMaintenancePlans]);
  const maintenanceOrders: EquipmentMaintenanceOrder[] = useMemo(() => db.equipmentMaintenanceOrders || [], [db.equipmentMaintenanceOrders]);
  const quotations = useMemo(() => db.quotations || [], [db.quotations]);
  const suppliers = useMemo(() => db.suppliers || [], [db.suppliers]);
  const purchaseHistory = useMemo(() => db.purchaseHistory || [], [db.purchaseHistory]);
  const clients = useMemo(() => db.clients || [], [db.clients]);

  // Handlers for Data Mutations

  // 1. Save or Create BOM
  const handleSaveBom = (newBom: BillOfMaterials) => {
    onUpdateDb(prev => {
      const existingBoms = prev.boms || prev.billOfMaterials || [];
      const updated = [newBom, ...existingBoms.filter(b => b.id !== newBom.id)];
      return {
        ...prev,
        boms: updated,
        billOfMaterials: updated
      };
    });

    onAddHistoryLog?.(
      'CONFIG',
      'Estrutura BOM Cadastrada',
      `Estrutura ${newBom.code} (${newBom.name || newBom.finishedProductName}) cadastrada com ${newBom.items?.length || 0} componentes.`,
      newBom.id,
      newBom.code
    );
  };

  // 2. Create Production Order (OP)
  const handleCreateOp = (newOpData: Partial<ProductionOrder>) => {
    const opId = `op-${Date.now()}`;
    const fullOp: ProductionOrder = {
      id: opId,
      code: newOpData.code || `OP-${Date.now()}`,
      billOfMaterialsId: newOpData.billOfMaterialsId || '',
      finishedProductPartId: newOpData.finishedProductPartId || '',
      finishedProductName: newOpData.finishedProductName || 'Produto',
      finishedProductCode: newOpData.finishedProductCode || 'PRD',
      plannedQuantity: newOpData.plannedQuantity || 10,
      producedQuantity: 0,
      scrapQuantity: 0,
      status: 'PLANNED',
      priority: newOpData.priority || 'NORMAL',
      lotNumber: newOpData.lotNumber,
      plannedStartDate: newOpData.plannedStartDate || new Date().toISOString().split('T')[0],
      plannedEndDate: newOpData.plannedEndDate,
      scheduledDate: newOpData.scheduledDate,
      estimatedUnitCost: newOpData.estimatedUnitCost || 50,
      estimatedTotalCost: newOpData.estimatedTotalCost || 500,
      notes: newOpData.notes,
      routingStages: newOpData.routingStages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdateDb(prev => ({
      ...prev,
      productionOrders: [fullOp, ...(prev.productionOrders || [])]
    }));

    onAddHistoryLog?.(
      'SERVICE_ORDER',
      'Ordem de Produção Aberta',
      `OP ${fullOp.code} aberta para fabricação de ${fullOp.plannedQuantity} un de ${fullOp.finishedProductName}.`,
      fullOp.id,
      fullOp.code
    );
  };

  // 3. Update OP Status
  const handleUpdateOpStatus = (opId: string, newStatus: ProductionOrder['status']) => {
    onUpdateDb(prev => {
      const ops = (prev.productionOrders || []).map(op => {
        if (op.id === opId) {
          return {
            ...op,
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
        }
        return op;
      });
      return { ...prev, productionOrders: ops };
    });

    onAddHistoryLog?.(
      'SERVICE_ORDER',
      'Status da OP Atualizado',
      `Ordem de Produção alterada para status ${newStatus}.`,
      opId
    );
  };

  // 4. Register Production Progress & Pointing
  const handleRegisterProgress = (
    opId: string, 
    producedQty: number, 
    scrapQty: number, 
    scrapReason?: string, 
    reworkHours?: number, 
    notes?: string
  ) => {
    onUpdateDb(prev => {
      const targetOp = (prev.productionOrders || []).find(op => op.id === opId);
      if (!targetOp) return prev;

      const newProduced = (targetOp.producedQuantity || 0) + producedQty;
      const newScrap = (targetOp.scrapQuantity || (targetOp as any).scrappedQuantity || 0) + scrapQty;
      const isCompleted = newProduced >= targetOp.plannedQuantity;
      const newStatus = isCompleted ? 'COMPLETED' : 'IN_PRODUCTION';

      const updatedOps = (prev.productionOrders || []).map(op => {
        if (op.id === opId) {
          return {
            ...op,
            producedQuantity: newProduced,
            scrapQuantity: newScrap,
            status: newStatus as any,
            actualEndDate: isCompleted ? new Date().toISOString().split('T')[0] : op.actualEndDate,
            notes: notes ? `${op.notes ? op.notes + ' | ' : ''}${notes}` : op.notes,
            updatedAt: new Date().toISOString()
          };
        }
        return op;
      });

      // Scrap log
      let newScrapLogs = prev.productionScrapLogs || [];
      if (scrapQty > 0) {
        const scrapEntry: ProductionScrapLog = {
          id: `scrap-${Date.now()}`,
          productionOrderId: targetOp.id,
          productionOrderCode: targetOp.code,
          partId: targetOp.finishedProductPartId || '',
          partName: targetOp.finishedProductName,
          quantity: scrapQty,
          reason: scrapReason || 'Perda de usinagem/ajuste',
          reportedBy: currentUser.name || 'Operador',
          timestamp: new Date().toISOString()
        };
        newScrapLogs = [scrapEntry, ...newScrapLogs];
      }

      // Rework log
      let newReworkLogs = prev.productionReworkLogs || [];
      if (reworkHours && reworkHours > 0) {
        const reworkEntry: ProductionReworkLog = {
          id: `rework-${Date.now()}`,
          productionOrderId: targetOp.id,
          productionOrderCode: targetOp.code,
          hoursSpent: reworkHours,
          reason: notes || 'Ajuste de tolerância e rebarbação',
          technicianName: currentUser.name || 'Mecânico',
          timestamp: new Date().toISOString()
        };
        newReworkLogs = [reworkEntry, ...newReworkLogs];
      }

      // If completed, generate ProductLot and update finished product stock
      let updatedLots = prev.productLots || [];
      let updatedParts = prev.parts || [];

      if (isCompleted && targetOp.lotNumber) {
        const existingLot = updatedLots.find(l => l.lotNumber === targetOp.lotNumber);
        if (!existingLot) {
          const generatedLot: ProductLot = {
            id: `lot-${Date.now()}`,
            lotNumber: targetOp.lotNumber,
            code: targetOp.lotNumber,
            partId: targetOp.finishedProductPartId || '',
            partName: targetOp.finishedProductName || 'Produto Acabado',
            productName: targetOp.finishedProductName,
            productionOrderId: targetOp.id,
            productionOrderCode: targetOp.code,
            initialQuantity: newProduced,
            currentQuantity: newProduced,
            unit: 'UN',
            status: 'APROVADO',
            manufacturingDate: new Date().toISOString().split('T')[0],
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            qcNotes: 'Inspecionado e liberado pelo CQ na conclusão da OP.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          updatedLots = [generatedLot, ...updatedLots];
        }

        // Increase finished part stock
        if (targetOp.finishedProductPartId) {
          updatedParts = updatedParts.map(p => {
            if (p.id === targetOp.finishedProductPartId) {
              return {
                ...p,
                stockQuantity: (p.stockQuantity || 0) + producedQty,
                updatedAt: new Date().toISOString()
              };
            }
            return p;
          });
        }
      }

      return {
        ...prev,
        productionOrders: updatedOps,
        productionScrapLogs: newScrapLogs,
        productionReworkLogs: newReworkLogs,
        productLots: updatedLots,
        parts: updatedParts
      };
    });

    onAddHistoryLog?.(
      'SERVICE_ORDER',
      'Apontamento de Chão de Fábrica',
      `Apontamento na OP ${opId}: +${producedQty} un aprovadas, ${scrapQty} un refugo.`,
      opId
    );
  };

  // 5. Update Product Lot QC Status
  const handleUpdateLotStatus = (lotId: string, status: ProductLot['status'], qcNotes?: string) => {
    onUpdateDb(prev => {
      const lots = (prev.productLots || []).map(l => {
        if (l.id === lotId) {
          return {
            ...l,
            status,
            qcNotes: qcNotes || l.qcNotes,
            updatedAt: new Date().toISOString()
          };
        }
        return l;
      });
      return { ...prev, productLots: lots };
    });

    onAddHistoryLog?.(
      'QUALITY_AUDIT',
      'Inspeção de Lote CQ',
      `Lote inspecionado com parecer: ${status}. ${qcNotes || ''}`,
      lotId
    );
  };

  // 6. Save Installed Equipment
  const handleSaveEquipment = (newEq: InstalledEquipment) => {
    onUpdateDb(prev => ({
      ...prev,
      installedEquipment: [newEq, ...(prev.installedEquipment || [])]
    }));

    onAddHistoryLog?.(
      'CONFIG',
      'Equipamento Cadastrado',
      `Ativo ${newEq.name} (TAG: ${newEq.tag}) registrado no parque fabril.`,
      newEq.id,
      newEq.tag
    );
  };

  // 7. Save Maintenance Order (OM)
  const handleSaveMaintenanceOrder = (newOm: EquipmentMaintenanceOrder) => {
    onUpdateDb(prev => ({
      ...prev,
      equipmentMaintenanceOrders: [newOm, ...(prev.equipmentMaintenanceOrders || [])]
    }));

    onAddHistoryLog?.(
      'SERVICE_ORDER',
      'Ordem de Manutenção Emitida',
      `OM ${newOm.code} emitida para ${newOm.equipmentName} (${newOm.type}).`,
      newOm.id,
      newOm.code
    );
  };

  // 8. Complete Maintenance Order & Deduct Parts
  const handleCompleteMaintenanceOrder = (
    omId: string, 
    replacedParts: { partId: string; quantity: number }[], 
    notes: string
  ) => {
    onUpdateDb(prev => {
      const oms = (prev.equipmentMaintenanceOrders || []).map(om => {
        if (om.id === omId) {
          return {
            ...om,
            status: 'APROVADA' as any,
            completionDate: new Date().toISOString().split('T')[0],
            closingNotes: notes,
            replacedParts: replacedParts.map((rp, idx) => {
              const p = (prev.parts || []).find(part => part.id === rp.partId);
              const uCost = p?.costPrice || 25;
              return {
                id: `rp-${Date.now()}-${idx}`,
                partId: rp.partId,
                partName: p?.name || 'Peça Substituída',
                partCode: p?.code || 'COD',
                quantity: rp.quantity,
                unit: p?.unitOfMeasure || 'UN',
                unitCost: uCost,
                totalCost: rp.quantity * uCost,
                replacementReason: 'DESGASTE_NATURAL',
                stockDeducted: true
              };
            }),
            updatedAt: new Date().toISOString()
          };
        }
        return om;
      });

      // Deduct replaced parts from stock
      let partsList = prev.parts || [];
      replacedParts.forEach(rp => {
        if (rp.partId && rp.quantity > 0) {
          partsList = partsList.map(p => {
            if (p.id === rp.partId) {
              return {
                ...p,
                stockQuantity: Math.max(0, (p.stockQuantity || 0) - rp.quantity),
                updatedAt: new Date().toISOString()
              };
            }
            return p;
          });
        }
      });

      return {
        ...prev,
        equipmentMaintenanceOrders: oms,
        parts: partsList
      };
    });

    onAddHistoryLog?.(
      'SERVICE_ORDER',
      'Manutenção Concluída',
      `Ordem de manutenção ${omId} encerrada com laudo técnico e baixa de peças do almoxarifado.`,
      omId
    );
  };

  // 9. Generate Quotation from MRP
  const handleCreateQuotationFromMrp = (partId: string, suggestedQuantity: number) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const count = quotations.length + 1;
    const year = new Date().getFullYear();
    const code = `COT-MRP-${year}-${String(count).padStart(3, '0')}`;

    const newQuotation = {
      id: `quot-mrp-${Date.now()}`,
      code,
      date: new Date().toISOString().split('T')[0],
      status: 'ABERTA',
      items: [
        {
          partId: part.id,
          partName: part.name,
          partCode: part.code,
          quantity: suggestedQuantity,
          unitPrice: part.costPrice || 10,
          totalPrice: (part.costPrice || 10) * suggestedQuantity
        }
      ],
      totalAmount: (part.costPrice || 10) * suggestedQuantity,
      notes: `Gerado automaticamente pelo motor MRP industrial para atendimento de demanda de OPs.`
    };

    onUpdateDb(prev => ({
      ...prev,
      quotations: [newQuotation as any, ...(prev.quotations || [])]
    }));

    onAddHistoryLog?.(
      'CONFIG',
      'Cotação MRP Gerada',
      `Cotação ${code} criada com sugestão de compra de ${suggestedQuantity} ${part.unitOfMeasure || 'UN'} de ${part.name}.`,
      newQuotation.id,
      code
    );

    if (onNavigateToView) {
      onNavigateToView('quotations');
    } else {
      alert(`Cotação ${code} gerada com sucesso para ${part.name}!`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Factory className="w-3.5 h-3.5" /> Módulo Industrial & PCP
            </span>
            <span className="text-xs text-slate-400 font-mono">v3.2 Produção & Chão de Fábrica</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Planejamento & Controle da Produção</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Engenharia de Produto (BOM), Ordens de Fabricação, Rastreabilidade CQ, Semáforo de Insumos e Gestão de Ativos.
          </p>
        </div>

        {/* Global Action Shortcut */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('production_orders')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Play className="w-4 h-4" /> Nova Ordem de Produção
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 text-xs scrollbar-thin">
        <button
          onClick={() => setActiveTab('pcp_dashboard')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'pcp_dashboard' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Factory className="w-4 h-4" /> Painel PCP
        </button>

        <button
          onClick={() => setActiveTab('boms')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'boms' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> Estruturas (BOM)
        </button>

        <button
          onClick={() => setActiveTab('production_orders')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'production_orders' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" /> Ordens de Produção (OP)
        </button>

        <button
          onClick={() => setActiveTab('lots')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'lots' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Rastreabilidade & Lotes
        </button>

        <button
          onClick={() => setActiveTab('stock_traffic')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'stock_traffic' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" /> Semáforo de Insumos
        </button>

        <button
          onClick={() => setActiveTab('equipment_maintenance')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'equipment_maintenance' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" /> Manutenção & Ativos
        </button>

        <button
          onClick={() => setActiveTab('purchasing_suggestions')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'purchasing_suggestions' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Sugestões MRP
        </button>

        <button
          onClick={() => setActiveTab('cost_analysis')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'cost_analysis' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Análise de Custos
        </button>

        <button
          onClick={() => setActiveTab('industrial_reports')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === 'industrial_reports' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" /> Relatórios & OEE
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'pcp_dashboard' && (
        <IndustrialDashboardTab
          productionOrders={productionOrders}
          boms={boms}
          alerts={alerts}
          parts={parts}
          equipment={equipment}
          maintenanceOrders={maintenanceOrders}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
        />
      )}

      {activeTab === 'boms' && (
        <IndustrialBomTab
          boms={boms}
          parts={parts}
          currentUser={currentUser}
          onSelectBomForOp={(bom) => {
            setActiveTab('production_orders');
          }}
          onSaveBom={handleSaveBom}
        />
      )}

      {activeTab === 'production_orders' && (
        <IndustrialProductionOrdersTab
          productionOrders={productionOrders}
          boms={boms}
          parts={parts}
          productLots={productLots}
          currentUser={currentUser}
          onUpdateOpStatus={handleUpdateOpStatus}
          onCreateOp={handleCreateOp}
          onRegisterProgress={handleRegisterProgress}
        />
      )}

      {activeTab === 'lots' && (
        <IndustrialLotsTab
          productLots={productLots}
          parts={parts}
          productionOrders={productionOrders}
          currentUser={currentUser}
          onUpdateLotStatus={handleUpdateLotStatus}
        />
      )}

      {activeTab === 'stock_traffic' && (
        <IndustrialStockTrafficTab
          parts={parts}
          productionOrders={productionOrders}
          onNavigateToPurchasing={() => setActiveTab('purchasing_suggestions')}
        />
      )}

      {activeTab === 'equipment_maintenance' && (
        <IndustrialMaintenanceTab
          equipment={equipment}
          maintenancePlans={maintenancePlans}
          maintenanceOrders={maintenanceOrders}
          parts={parts}
          clients={clients}
          currentUser={currentUser}
          onSaveEquipment={handleSaveEquipment}
          onSaveMaintenanceOrder={handleSaveMaintenanceOrder}
          onCompleteMaintenanceOrder={handleCompleteMaintenanceOrder}
        />
      )}

      {activeTab === 'purchasing_suggestions' && (
        <IndustrialPurchasingTab
          parts={parts}
          productionOrders={productionOrders}
          quotations={quotations}
          suppliers={suppliers}
          purchaseHistory={purchaseHistory}
          onCreateQuotationFromMrp={handleCreateQuotationFromMrp}
        />
      )}

      {activeTab === 'cost_analysis' && (
        <IndustrialCostAnalysisTab
          productionOrders={productionOrders}
          boms={boms}
        />
      )}

      {activeTab === 'industrial_reports' && (
        <IndustrialReportsTab
          productionOrders={productionOrders}
          equipment={equipment}
          maintenanceOrders={maintenanceOrders}
          productLots={productLots}
          currentCompany={currentCompany as any}
        />
      )}
    </div>
  );
}
