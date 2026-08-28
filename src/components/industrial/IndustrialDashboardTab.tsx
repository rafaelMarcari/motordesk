/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Factory, AlertTriangle, AlertCircle, CheckCircle2, Clock, 
  TrendingUp, Boxes, Cpu, ChevronRight, ShieldCheck, ArrowRight
} from 'lucide-react';
import { 
  ProductionOrder, OperationalAlert, BillOfMaterials, Part, 
  InstalledEquipment, EquipmentMaintenanceOrder 
} from '../../types';

interface IndustrialDashboardTabProps {
  productionOrders: ProductionOrder[];
  boms: BillOfMaterials[];
  alerts: OperationalAlert[];
  parts: Part[];
  equipment: InstalledEquipment[];
  maintenanceOrders: EquipmentMaintenanceOrder[];
  onNavigateTab: (tabId: string) => void;
  onResolveAlert?: (alertId: string) => void;
}

export const IndustrialDashboardTab: React.FC<IndustrialDashboardTabProps> = ({
  productionOrders,
  boms,
  alerts,
  parts,
  equipment,
  maintenanceOrders,
  onNavigateTab,
  onResolveAlert
}) => {
  // KPIs
  const totalOps = productionOrders.length;
  const inProductionOps = productionOrders.filter(op => op.status === 'IN_PRODUCTION' || op.status === 'SEPARATION' || (op.status as any) === 'em_producao').length;
  const plannedOps = productionOrders.filter(op => op.status === 'PLANNED' || (op.status as any) === 'planejada').length;
  const completedOps = productionOrders.filter(op => op.status === 'COMPLETED' || (op.status as any) === 'concluida').length;
  
  const totalPlannedUnits = productionOrders.reduce((sum, op) => sum + (op.plannedQuantity || 0), 0);
  const totalProducedUnits = productionOrders.reduce((sum, op) => sum + (op.producedQuantity || 0), 0);
  const totalScrapUnits = productionOrders.reduce((sum, op) => sum + (op.scrapQuantity || (op as any).scrappedQuantity || 0), 0);
  
  const scrapRate = totalProducedUnits + totalScrapUnits > 0 
    ? ((totalScrapUnits / (totalProducedUnits + totalScrapUnits)) * 100).toFixed(1)
    : '0.0';

  const operationalEquipmentCount = equipment.filter(e => e.status === 'OPERATIONAL').length;
  const maintenanceEquipmentCount = equipment.filter(e => e.status === 'MAINTENANCE').length;
  const openMaintenanceCount = maintenanceOrders.filter(o => o.status !== 'APROVADA' && (o.status as any) !== 'concluida').length;

  const criticalAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="space-y-6">
      {/* Top Alert Banner if any critical alert exists */}
      {criticalAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Alertas Operacionais & Risco de Parada ({criticalAlerts.length})</span>
            </div>
            <button
              onClick={() => onNavigateTab('stock_traffic')}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              Ver Semáforo de Insumos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="bg-white p-3 rounded-lg border border-amber-200 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">{alert.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alert.severity === 'critica' || alert.severity === 'CRITICAL' 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-2 leading-relaxed">{alert.message}</p>
                </div>
                {alert.suggestedAction && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-indigo-700 font-medium flex items-center justify-between">
                    <span>💡 {alert.suggestedAction}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total de OPs</span>
            <Factory className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalOps}</div>
          <div className="text-[11px] text-slate-500 mt-1">{plannedOps} planejadas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Em Produção</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{inProductionOps}</div>
          <div className="text-[11px] text-slate-500 mt-1">Chão de fábrica ativo</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{completedOps}</div>
          <div className="text-[11px] text-slate-500 mt-1">Lotes gerados</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Volume Produzido</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">{totalProducedUnits}</div>
          <div className="text-[11px] text-slate-500 mt-1">de {totalPlannedUnits} planejados</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Taxa de Refugo</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{scrapRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1">{totalScrapUnits} un sucateadas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Equipamentos</span>
            <Cpu className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-600">{operationalEquipmentCount}/{equipment.length || 3}</div>
          <div className="text-[11px] text-slate-500 mt-1">{openMaintenanceCount} OMs ativas</div>
        </div>
      </div>

      {/* Factory Floor & Quick Nav Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Production Orders Summary */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-4 h-4 text-slate-700" />
              Ordens de Produção em Destaque
            </h3>
            <button
              onClick={() => onNavigateTab('production_orders')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Ver Todas as OPs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {productionOrders.slice(0, 4).map(op => {
              const produced = op.producedQuantity || 0;
              const planned = op.plannedQuantity || 1;
              const percent = Math.min(100, Math.round((produced / planned) * 100));

              return (
                <div key={op.id} className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{op.code}</span>
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[280px]">
                        {op.finishedProductName || op.finishedPartName}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      op.status === 'COMPLETED' || (op.status as any) === 'concluida'
                        ? 'bg-emerald-100 text-emerald-800'
                        : op.status === 'IN_PRODUCTION' || (op.status as any) === 'em_producao'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}>
                      {op.status}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1.5">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progresso: {produced} / {planned} un ({percent}%)</span>
                    <span>Prazo: {op.scheduledDate || op.plannedEndDate || 'Sem prazo'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Quick Industrial Modules Navigation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Acesso Rápido PCP & Engenharia
            </h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => onNavigateTab('boms')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800">Estruturas de Produto (BOM)</div>
                  <div className="text-slate-500 text-[11px]">{boms.length} estruturas ativas</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('lots')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800">Rastreabilidade & Lotes</div>
                  <div className="text-slate-500 text-[11px]">Genealogia e laudos CQ</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('equipment_maintenance')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800">Equipamentos & Manutenção</div>
                  <div className="text-slate-500 text-[11px]">{equipment.length} ativos instalados</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('purchasing_suggestions')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800">Sugestões de Compras (MRP)</div>
                  <div className="text-slate-500 text-[11px]">Ponto de pedido e demanda OPs</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>MotorDesk Industrial PCP</span>
            <span className="font-mono">v3.2</span>
          </div>
        </div>
      </div>
    </div>
  );
};
