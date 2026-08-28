/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  BarChart3, PieChart, Layers, Boxes, Clock
} from 'lucide-react';
import { ProductionOrder, BillOfMaterials } from '../../types';

interface IndustrialCostAnalysisTabProps {
  productionOrders: ProductionOrder[];
  boms: BillOfMaterials[];
}

export const IndustrialCostAnalysisTab: React.FC<IndustrialCostAnalysisTabProps> = ({
  productionOrders,
  boms
}) => {
  // Aggregate costs across completed and in-progress OPs
  let totalEstimatedCost = 0;
  let totalActualCost = 0;
  let totalScrapCost = 0;
  let totalReworkCost = 0;

  productionOrders.forEach(op => {
    const plannedQty = op.plannedQuantity || 1;
    const producedQty = op.producedQuantity || 0;
    const scrapQty = op.scrapQuantity || (op as any).scrappedQuantity || 0;
    const unitCost = op.estimatedUnitCost || 45.0;

    const opEstimated = plannedQty * unitCost;
    const scrapLoss = scrapQty * (unitCost * 0.7);
    const reworkLoss = ((op as any).reworkHours || 0) * 35.0; // R$35/h
    const opActual = (producedQty * unitCost) + scrapLoss + reworkLoss;

    totalEstimatedCost += opEstimated;
    totalActualCost += (op.status === 'COMPLETED' || op.status === 'IN_PRODUCTION') ? opActual : opEstimated;
    totalScrapCost += scrapLoss;
    totalReworkCost += reworkLoss;
  });

  const costVariance = totalActualCost - totalEstimatedCost;
  const costVariancePercent = totalEstimatedCost > 0 
    ? ((costVariance / totalEstimatedCost) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Cost KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Custo Total Previsto (BOM)</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">R$ {totalEstimatedCost.toFixed(2)}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Orçado pelas estruturas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Custo Realizado (Apontamentos)</span>
          <span className="text-2xl font-bold text-indigo-700 mt-1 block">R$ {totalActualCost.toFixed(2)}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Incluindo perdas e retrabalho</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Perdas por Refugo (Sucata)</span>
          <span className="text-2xl font-bold text-rose-600 mt-1 block">R$ {totalScrapCost.toFixed(2)}</span>
          <span className="text-[11px] text-rose-700 mt-0.5 block">Matéria-prima descartada</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Desvio Financeiro Geral</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-2xl font-bold ${costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {costVariance > 0 ? `+${costVariancePercent}%` : `${costVariancePercent}%`}
            </span>
            {costVariance > 0 ? (
              <TrendingUp className="w-5 h-5 text-rose-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {costVariance > 0 ? `R$ +${costVariance.toFixed(2)} acima` : `R$ ${costVariance.toFixed(2)} economizado`}
          </span>
        </div>
      </div>

      {/* Breakdown per OP Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Demonstrativo de Custos por Ordem de Produção
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Ordem (OP) / Produto</th>
                <th className="p-3.5">Qtd Produzida</th>
                <th className="p-3.5">Custo Previsto</th>
                <th className="p-3.5">Custo Realizado</th>
                <th className="p-3.5">Perda de Sucata</th>
                <th className="p-3.5">Desvio</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productionOrders.map(op => {
                const plannedQty = op.plannedQuantity || 1;
                const producedQty = op.producedQuantity || 0;
                const scrapQty = op.scrapQuantity || (op as any).scrappedQuantity || 0;
                const unitCost = op.estimatedUnitCost || 45.0;

                const opEstimated = plannedQty * unitCost;
                const scrapLoss = scrapQty * (unitCost * 0.7);
                const opActual = (producedQty * unitCost) + scrapLoss;
                const variance = opActual - opEstimated;

                return (
                  <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">{op.code}</div>
                      <div className="font-medium text-slate-700">{op.finishedProductName || op.finishedPartName}</div>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-800">
                      {producedQty} / {plannedQty} un
                    </td>

                    <td className="p-3.5 font-medium text-slate-600">
                      R$ {opEstimated.toFixed(2)}
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      R$ {opActual.toFixed(2)}
                    </td>

                    <td className="p-3.5 text-rose-600 font-semibold">
                      {scrapLoss > 0 ? `R$ ${scrapLoss.toFixed(2)}` : 'R$ 0,00'}
                    </td>

                    <td className="p-3.5">
                      <span className={`font-bold ${variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {variance > 0 ? `+ R$ ${variance.toFixed(2)}` : `- R$ ${Math.abs(variance).toFixed(2)}`}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        op.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        op.status === 'IN_PRODUCTION' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {op.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
