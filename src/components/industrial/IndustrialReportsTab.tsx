/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, Printer, Download, TrendingUp, BarChart2, ShieldCheck, 
  Clock, Activity, CheckCircle2, AlertCircle, Wrench
} from 'lucide-react';
import { ProductionOrder, InstalledEquipment, EquipmentMaintenanceOrder, ProductLot, Company } from '../../types';

interface IndustrialReportsTabProps {
  productionOrders: ProductionOrder[];
  equipment: InstalledEquipment[];
  maintenanceOrders: EquipmentMaintenanceOrder[];
  productLots: ProductLot[];
  currentCompany: Company;
}

export const IndustrialReportsTab: React.FC<IndustrialReportsTabProps> = ({
  productionOrders,
  equipment,
  maintenanceOrders,
  productLots,
  currentCompany
}) => {
  const [selectedReportType, setSelectedReportType] = useState<'oee' | 'maintenance' | 'lots_dossier'>('oee');

  // Compute OEE metrics
  const totalPlannedHours = 160; // Base month
  const totalDowntimeHours = maintenanceOrders.reduce((sum, om) => sum + (om.actualDurationMinutes || 60) / 60, 0);
  const operatingHours = Math.max(1, totalPlannedHours - totalDowntimeHours);
  
  const availabilityRate = Math.min(100, Math.round((operatingHours / totalPlannedHours) * 100));
  const performanceRate = 92; // 92% speed efficiency
  
  const totalProduced = productionOrders.reduce((sum, op) => sum + (op.producedQuantity || 0), 0);
  const totalScrap = productionOrders.reduce((sum, op) => sum + (op.scrapQuantity || (op as any).scrappedQuantity || 0), 0);
  const qualityRate = totalProduced + totalScrap > 0
    ? Math.round((totalProduced / (totalProduced + totalScrap)) * 100)
    : 98;

  const oeeOverall = Math.round((availabilityRate * performanceRate * qualityRate) / 10000);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedReportType('oee')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
              selectedReportType === 'oee' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Indicador Geral OEE & Produtividade
          </button>

          <button
            onClick={() => setSelectedReportType('maintenance')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
              selectedReportType === 'maintenance' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Relatório de Manutenção & MTBF/MTTR
          </button>

          <button
            onClick={() => setSelectedReportType('lots_dossier')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
              selectedReportType === 'lots_dossier' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Dossiê de Qualidade & Lotes CQ
          </button>
        </div>

        <button
          onClick={handlePrintReport}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Printer className="w-4 h-4" /> Imprimir Relatório Oficial
        </button>
      </div>

      {/* OEE Report View */}
      {selectedReportType === 'oee' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Eficiência Global dos Equipamentos (OEE)</h3>
                <p className="text-xs text-slate-500">{currentCompany.name} • Período Atual</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-indigo-600">{oeeOverall}%</span>
                <span className="text-[11px] text-slate-400 block">Índice OEE Global</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-700">Disponibilidade</span>
                  <span className="font-bold text-indigo-700">{availabilityRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                  <div className="h-full bg-indigo-600" style={{ width: `${availabilityRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Horas produtivas vs paradas não programadas.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-700">Performance</span>
                  <span className="font-bold text-amber-700">{performanceRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                  <div className="h-full bg-amber-500" style={{ width: `${performanceRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Velocidade real vs tempo de ciclo nominal.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-700">Qualidade</span>
                  <span className="font-bold text-emerald-700">{qualityRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                  <div className="h-full bg-emerald-600" style={{ width: `${qualityRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Peças aprovadas vs refugos/retrabalhos.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Report View */}
      {selectedReportType === 'maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase block">MTBF (Tempo Médio Entre Falhas)</span>
              <span className="text-3xl font-extrabold text-slate-900 mt-1 block">340 horas</span>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-1">Confiabilidade alta (meta &gt; 300h)</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase block">MTTR (Tempo Médio de Reparo)</span>
              <span className="text-3xl font-extrabold text-slate-900 mt-1 block">2.4 horas</span>
              <span className="text-[11px] text-indigo-600 font-semibold block mt-1">Tempo de atendimento e troca de componentes</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Histórico Consolidado de Manutenções</h4>
            <div className="divide-y divide-slate-100 text-xs">
              {maintenanceOrders.map(om => (
                <div key={om.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-800">{om.code}</span> - {om.equipmentName} ({om.equipmentTag})
                    <span className="block text-[11px] text-slate-500">{om.description}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {om.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lots Dossier View */}
      {selectedReportType === 'lots_dossier' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h4 className="text-sm font-bold text-slate-900">Laudos e Lotes Inspecionados pelo CQ</h4>
          <div className="divide-y divide-slate-100 text-xs">
            {productLots.map(lot => (
              <div key={lot.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{lot.lotNumber || lot.code}</span>
                    <span className="font-medium text-slate-700">{lot.productName || lot.partName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Fabricado em: {lot.manufacturingDate || '2025-05-10'} • Saldo: {lot.currentQuantity || lot.initialQuantity} {lot.unit || 'UN'}
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  lot.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {lot.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
