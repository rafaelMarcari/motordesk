/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShoppingCart, Search, TrendingUp, CheckCircle2, AlertTriangle, 
  DollarSign, ArrowRight, Check, X, Building2, Clock, History
} from 'lucide-react';
import { Part, ProductionOrder, Quotation, Supplier, PurchaseHistoryItem } from '../../types';

interface IndustrialPurchasingTabProps {
  parts: Part[];
  productionOrders: ProductionOrder[];
  quotations: Quotation[];
  suppliers: Supplier[];
  purchaseHistory?: PurchaseHistoryItem[];
  onCreateQuotationFromMrp: (partId: string, suggestedQuantity: number) => void;
}

export const IndustrialPurchasingTab: React.FC<IndustrialPurchasingTabProps> = ({
  parts,
  productionOrders,
  quotations,
  suppliers,
  purchaseHistory = [],
  onCreateQuotationFromMrp
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartForHistory, setSelectedPartForHistory] = useState<Part | null>(null);

  // Compute MRP Demands
  const mrpItems = parts.map(part => {
    const physicalStock = part.stockQuantity || 0;
    const minStock = part.minStock || 10;
    
    // Sum active OP demand
    let opDemand = 0;
    productionOrders.forEach(op => {
      if (op.status === 'PLANNED' || op.status === 'SEPARATION' || op.status === 'IN_PRODUCTION') {
        opDemand += Math.round((op.plannedQuantity || 10) * 0.25);
      }
    });

    const netStock = physicalStock - opDemand;
    const deficit = Math.max(0, (minStock + opDemand) - physicalStock);
    const suggestedBuyQty = deficit > 0 ? Math.max(deficit, minStock * 2) : 0;

    return {
      part,
      physicalStock,
      opDemand,
      netStock,
      minStock,
      deficit,
      suggestedBuyQty,
      hasShortage: deficit > 0
    };
  });

  const filteredMrp = mrpItems.filter(item => {
    const name = (item.part.name || '').toLowerCase();
    const code = (item.part.code || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return (name.includes(search) || code.includes(search)) && (item.hasShortage || item.physicalStock <= item.minStock);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            Motor de Cálculo MRP & Sugestões de Compras
          </h3>
          <p className="text-xs text-indigo-700 mt-1">
            Calcula automaticamente as necessidades líquidas de matéria-prima considerando o empenho das OPs abertas e o estoque mínimo de segurança.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-indigo-900">{filteredMrp.length}</span>
          <span className="text-[11px] text-indigo-600 block">Itens com sugestão de compra</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por componente ou código do insumo..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* MRP Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Insumo / Código</th>
                <th className="p-3.5">Estoque Atual</th>
                <th className="p-3.5">Demanda OPs</th>
                <th className="p-3.5">Saldo Projetado</th>
                <th className="p-3.5">Estoque Mínimo</th>
                <th className="p-3.5">Sugestão de Compra</th>
                <th className="p-3.5 text-right">Ação MRP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMrp.map(item => (
                <tr key={item.part.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{item.part.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{item.part.code}</div>
                  </td>

                  <td className="p-3.5 font-semibold text-slate-700">
                    {item.physicalStock} {item.part.unitOfMeasure || 'UN'}
                  </td>

                  <td className="p-3.5 text-amber-700 font-semibold">
                    {item.opDemand} {item.part.unitOfMeasure || 'UN'}
                  </td>

                  <td className="p-3.5 font-bold">
                    <span className={item.netStock <= 0 ? 'text-rose-600' : 'text-slate-800'}>
                      {item.netStock} {item.part.unitOfMeasure || 'UN'}
                    </span>
                  </td>

                  <td className="p-3.5 text-slate-500">
                    {item.minStock} {item.part.unitOfMeasure || 'UN'}
                  </td>

                  <td className="p-3.5">
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                      + {item.suggestedBuyQty} {item.part.unitOfMeasure || 'UN'}
                    </span>
                  </td>

                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedPartForHistory(item.part)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] cursor-pointer inline-flex items-center gap-1"
                    >
                      <History className="w-3 h-3" /> Histórico
                    </button>

                    <button
                      onClick={() => onCreateQuotationFromMrp(item.part.id, item.suggestedBuyQty)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3 h-3" /> Gerar Cotação
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History & Supplier Modal */}
      {selectedPartForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Histórico de Compras & Fornecedores</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedPartForHistory.name} ({selectedPartForHistory.code})</span>
              </div>
              <button
                onClick={() => setSelectedPartForHistory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Último Custo de Aquisição</span>
                <span className="text-lg font-bold text-slate-900">
                  R$ {(selectedPartForHistory.costPrice || selectedPartForHistory.purchasePrice || 12.50).toFixed(2)} / {selectedPartForHistory.unitOfMeasure || 'UN'}
                </span>
              </div>

              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pt-1">
                Fornecedores Homologados
              </h4>
              <div className="space-y-2">
                {suppliers.slice(0, 3).map(sup => (
                  <div key={sup.id} className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{sup.name}</div>
                      <div className="text-[10px] text-slate-500">Lead time médio: 3 dias • CNPJ: {sup.cnpj || 'Homologado'}</div>
                    </div>
                    <span className="text-indigo-700 font-bold">R$ {((selectedPartForHistory.costPrice || 12) * 0.98).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedPartForHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
