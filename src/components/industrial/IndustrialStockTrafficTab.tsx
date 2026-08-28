/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Boxes, Search, AlertTriangle, CheckCircle2, XCircle, ShoppingCart, 
  ArrowUpRight, Filter
} from 'lucide-react';
import { Part, ProductionOrder } from '../../types';

interface IndustrialStockTrafficTabProps {
  parts: Part[];
  productionOrders: ProductionOrder[];
  onNavigateToPurchasing?: () => void;
}

export const IndustrialStockTrafficTab: React.FC<IndustrialStockTrafficTabProps> = ({
  parts,
  productionOrders,
  onNavigateToPurchasing
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL');

  // Calculate allocated/reserved parts from active OPs
  const stockAnalysis = parts.map(part => {
    const physicalStock = part.stockQuantity || 0;
    const minStock = part.minStock || 10;
    
    // Sum reserved across active OPs
    let reservedInOps = 0;
    productionOrders.forEach(op => {
      if (op.status === 'PLANNED' || op.status === 'SEPARATION' || op.status === 'IN_PRODUCTION') {
        // Approximate requirement
        reservedInOps += Math.round((op.plannedQuantity || 10) * 0.2);
      }
    });
    
    // Normalise
    const reserved = Math.min(physicalStock, reservedInOps);
    const availableReal = Math.max(0, physicalStock - reserved);

    let trafficStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
    if (availableReal <= 0 || physicalStock === 0) {
      trafficStatus = 'CRITICAL';
    } else if (availableReal <= minStock) {
      trafficStatus = 'WARNING';
    }

    return {
      part,
      physicalStock,
      reserved,
      availableReal,
      minStock,
      trafficStatus
    };
  });

  const filteredItems = stockAnalysis.filter(item => {
    const name = (item.part.name || '').toLowerCase();
    const code = (item.part.code || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = name.includes(search) || code.includes(search);

    const matchesStatus = statusFilter === 'ALL' || item.trafficStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const criticalCount = stockAnalysis.filter(i => i.trafficStatus === 'CRITICAL').length;
  const warningCount = stockAnalysis.filter(i => i.trafficStatus === 'WARNING').length;
  const healthyCount = stockAnalysis.filter(i => i.trafficStatus === 'HEALTHY').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Crítico / Ruptura</span>
            <span className="text-2xl font-bold text-rose-900">{criticalCount} itens</span>
            <span className="text-[11px] text-rose-700 block mt-0.5">Saldo insuficiente para OPs</span>
          </div>
          <XCircle className="w-8 h-8 text-rose-500" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Atenção / Ponto de Pedido</span>
            <span className="text-2xl font-bold text-amber-900">{warningCount} itens</span>
            <span className="text-[11px] text-amber-700 block mt-0.5">Abaixo do estoque de segurança</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Estoque Regular</span>
            <span className="text-2xl font-bold text-emerald-900">{healthyCount} itens</span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">Saldo seguro e disponível</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por código ou descrição do insumo..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
          >
            <option value="ALL">Todos os Níveis de Semáforo</option>
            <option value="CRITICAL">🔴 Apenas Críticos</option>
            <option value="WARNING">🟡 Apenas Atenção</option>
            <option value="HEALTHY">🟢 Apenas Regulares</option>
          </select>

          {onNavigateToPurchasing && (
            <button
              onClick={onNavigateToPurchasing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <ShoppingCart className="w-4 h-4" /> Sugestões MRP
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Código / Descrição</th>
                <th className="p-3.5">Estoque Físico</th>
                <th className="p-3.5">Reservado OPs</th>
                <th className="p-3.5">Disponível Real</th>
                <th className="p-3.5">Ponto Pedido</th>
                <th className="p-3.5 text-right">Ação Sugerida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const isCrit = item.trafficStatus === 'CRITICAL';
                const isWarn = item.trafficStatus === 'WARNING';

                return (
                  <tr key={item.part.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCrit ? 'bg-rose-100 text-rose-800' :
                        isWarn ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          isCrit ? 'bg-rose-600' : isWarn ? 'bg-amber-500' : 'bg-emerald-600'
                        }`} />
                        {isCrit ? 'Crítico' : isWarn ? 'Atenção' : 'Regular'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{item.part.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.part.code} • Local: {item.part.location || 'A-01'}</div>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-700">
                      {item.physicalStock} {item.part.unitOfMeasure || 'UN'}
                    </td>

                    <td className="p-3.5 text-amber-700 font-semibold">
                      {item.reserved} {item.part.unitOfMeasure || 'UN'}
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      {item.availableReal} {item.part.unitOfMeasure || 'UN'}
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {item.minStock} {item.part.unitOfMeasure || 'UN'}
                    </td>

                    <td className="p-3.5 text-right">
                      {(isCrit || isWarn) && onNavigateToPurchasing ? (
                        <button
                          onClick={onNavigateToPurchasing}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1"
                        >
                          Comprar <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Estoque Ok</span>
                      )}
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
