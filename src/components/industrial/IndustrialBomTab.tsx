/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Layers, Search, Plus, Eye, ArrowRight, Play, Check, X, 
  Trash2, Copy, History, TrendingUp, AlertCircle, DollarSign, Boxes
} from 'lucide-react';
import { BillOfMaterials, Part, User } from '../../types';

interface IndustrialBomTabProps {
  boms: BillOfMaterials[];
  parts: Part[];
  currentUser: User;
  onSelectBomForOp: (bom: BillOfMaterials) => void;
  onSaveBom: (bom: BillOfMaterials) => void;
}

export const IndustrialBomTab: React.FC<IndustrialBomTabProps> = ({
  boms,
  parts,
  currentUser,
  onSelectBomForOp,
  onSaveBom
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBom, setSelectedBom] = useState<BillOfMaterials | null>(null);
  const [showNewBomModal, setShowNewBomModal] = useState(false);

  // Form states for New BOM
  const [newBomFinishedPartId, setNewBomFinishedPartId] = useState('');
  const [newBomName, setNewBomName] = useState('');
  const [newBomCode, setNewBomCode] = useState('');
  const [newBomVersion, setNewBomVersion] = useState('v1.0');
  const [newBomLaborCost, setNewBomLaborCost] = useState<number>(45.00);
  const [newBomOverheadCost, setNewBomOverheadCost] = useState<number>(20.00);
  const [newBomCycleHours, setNewBomCycleHours] = useState<number>(1.5);
  const [newBomNotes, setNewBomNotes] = useState('');
  const [newBomItems, setNewBomItems] = useState<{
    componentPartId: string;
    quantity: number;
    unit: string;
    unitCost: number;
    lossPercentage: number;
  }[]>([
    { componentPartId: '', quantity: 1, unit: 'UN', unitCost: 0, lossPercentage: 0 }
  ]);

  const filteredBoms = boms.filter(bom => {
    const name = (bom.name || bom.finishedProductName || bom.finishedPartName || '').toLowerCase();
    const code = (bom.code || bom.finishedProductCode || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  const handleAddItemRow = () => {
    setNewBomItems(prev => [
      ...prev,
      { componentPartId: '', quantity: 1, unit: 'UN', unitCost: 0, lossPercentage: 0 }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setNewBomItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemPartChange = (index: number, partId: string) => {
    const selectedPart = parts.find(p => p.id === partId);
    setNewBomItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          componentPartId: partId,
          unit: selectedPart?.unitOfMeasure || 'UN',
          unitCost: selectedPart?.costPrice || selectedPart?.purchasePrice || 10.0
        };
      }
      return item;
    }));
  };

  const handleCreateBomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPart = parts.find(p => p.id === newBomFinishedPartId);
    if (!targetPart && !newBomName) {
      alert('Selecione o produto acabado ou informe o nome da estrutura.');
      return;
    }

    const items = newBomItems.map((item, idx) => {
      const p = parts.find(part => part.id === item.componentPartId);
      const effectiveQty = item.quantity * (1 + (item.lossPercentage || 0) / 100);
      const totalCost = effectiveQty * (item.unitCost || p?.costPrice || 10);
      return {
        id: `bom-item-${Date.now()}-${idx}`,
        componentPartId: item.componentPartId,
        componentPartName: p?.name || 'Componente',
        componentPartCode: p?.code || 'COD',
        quantity: item.quantity,
        effectiveQuantity: effectiveQty,
        unit: item.unit || p?.unitOfMeasure || 'UN',
        unitCost: item.unitCost || p?.costPrice || 10,
        lossPercentage: item.lossPercentage || 0,
        totalCost: totalCost
      };
    });

    const totalMatCost = items.reduce((sum, it) => sum + (it.totalCost || 0), 0);
    const totalUnitCost = totalMatCost + Number(newBomLaborCost) + Number(newBomOverheadCost);
    const suggestedPrice = totalUnitCost * 1.6; // 60% markup

    const createdBom: BillOfMaterials = {
      id: `bom-${Date.now()}`,
      finishedProductPartId: newBomFinishedPartId,
      finishedProductName: targetPart?.name || newBomName,
      finishedProductCode: targetPart?.code || newBomCode || 'BOM-001',
      name: newBomName || targetPart?.name || 'Nova Estrutura',
      code: newBomCode || targetPart?.code || `BOM-${Math.floor(100 + Math.random() * 900)}`,
      version: newBomVersion,
      active: true,
      laborCost: Number(newBomLaborCost),
      indirectCost: Number(newBomOverheadCost),
      totalMaterialCost: totalMatCost,
      totalUnitCost: totalUnitCost,
      suggestedSalePrice: suggestedPrice,
      estimatedProductionHours: Number(newBomCycleHours),
      notes: newBomNotes,
      items: items as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveBom(createdBom);
    setShowNewBomModal(false);
    setSelectedBom(createdBom);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto, código ou versão da BOM..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <button
          onClick={() => setShowNewBomModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" /> Nova Estrutura (BOM)
        </button>
      </div>

      {/* BOM Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBoms.map(bom => {
          const itemsCount = bom.items?.length || 0;
          const unitCost = bom.totalUnitCost || 0;
          const salePrice = bom.suggestedSalePrice || unitCost * 1.5;

          return (
            <div 
              key={bom.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {bom.code || bom.finishedProductCode || 'BOM'}
                    </span>
                    <span className="ml-1.5 font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {bom.version || 'v1.0'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    bom.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {bom.active !== false ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
                  {bom.name || bom.finishedProductName || bom.finishedPartName}
                </h4>

                <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                  <Boxes className="w-3.5 h-3.5 text-slate-400" />
                  <span>{itemsCount} componentes na lista técnica</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Custo Unitário</span>
                    <span className="font-bold text-slate-900">R$ {unitCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Preço Sugerido</span>
                    <span className="font-bold text-emerald-700">R$ {salePrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedBom(bom)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Detalhes
                </button>

                <button
                  onClick={() => onSelectBomForOp(bom)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" /> Gerar OP
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOM Detail Modal */}
      {selectedBom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {selectedBom.code || selectedBom.finishedProductCode}
                  </span>
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedBom.version || 'v1.0'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedBom.name || selectedBom.finishedProductName || selectedBom.finishedPartName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBom(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cost Breakdown Cards */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Matéria-Prima</span>
                <span className="font-bold text-slate-900">R$ {(selectedBom.totalMaterialCost || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Mão de Obra (MOD)</span>
                <span className="font-bold text-slate-900">R$ {(selectedBom.laborCost || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Custos Indiretos (CIF)</span>
                <span className="font-bold text-slate-900">R$ {(selectedBom.indirectCost || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Custo Total / Un</span>
                <span className="font-bold text-indigo-700">R$ {(selectedBom.totalUnitCost || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Components List */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Lista de Componentes & Matérias-Primas ({selectedBom.items?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Componente / Insumo</th>
                      <th className="p-2.5">Qtd Base</th>
                      <th className="p-2.5">Perda (%)</th>
                      <th className="p-2.5">Qtd Efetiva</th>
                      <th className="p-2.5">Custo Unit</th>
                      <th className="p-2.5 text-right">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBom.items?.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-900">
                          {item.componentPartName || (item as any).partName || 'Item'}
                          <span className="block font-mono text-[10px] text-slate-400">
                            {item.componentPartCode || (item as any).partCode}
                          </span>
                        </td>
                        <td className="p-2.5">{item.quantity} {item.unit}</td>
                        <td className="p-2.5 text-rose-600 font-medium">{(item as any).lossPercentage || (item as any).scrapRatePercent || 0}%</td>
                        <td className="p-2.5 font-bold text-slate-800">
                          {((item as any).effectiveQuantity || item.quantity * (1 + ((item as any).lossPercentage || 0) / 100)).toFixed(2)} {item.unit}
                        </td>
                        <td className="p-2.5">R$ {((item as any).unitCost || 0).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          R$ {((item as any).totalCost || ((item as any).unitCost || 0) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedBom.notes && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                <span className="font-bold">Observações de Engenharia:</span> {selectedBom.notes}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedBom(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  const b = selectedBom;
                  setSelectedBom(null);
                  onSelectBomForOp(b);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4" /> Abrir Ordem de Produção (OP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New BOM Modal */}
      {showNewBomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Cadastrar Nova Estrutura de Produto (BOM)
              </h3>
              <button
                onClick={() => setShowNewBomModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBomSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Produto Acabado (Catálogo)</label>
                  <select
                    value={newBomFinishedPartId}
                    onChange={e => {
                      setNewBomFinishedPartId(e.target.value);
                      const p = parts.find(part => part.id === e.target.value);
                      if (p) {
                        setNewBomName(p.name);
                        setNewBomCode(`BOM-${p.code || 'PRD'}`);
                      }
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Selecione um produto do estoque...</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Código da Estrutura</label>
                  <input
                    type="text"
                    value={newBomCode}
                    onChange={e => setNewBomCode(e.target.value)}
                    placeholder="Ex: BOM-HD-200"
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Versão</label>
                  <input
                    type="text"
                    value={newBomVersion}
                    onChange={e => setNewBomVersion(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mão de Obra (R$/un)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBomLaborCost}
                    onChange={e => setNewBomLaborCost(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Custos Indiretos CIF (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBomOverheadCost}
                    onChange={e => setNewBomOverheadCost(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Items Table Form */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Matérias-Primas e Componentes</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Componente
                  </button>
                </div>

                <div className="space-y-2">
                  {newBomItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="col-span-5">
                        <select
                          value={item.componentPartId}
                          onChange={e => handleItemPartChange(index, e.target.value)}
                          required
                          className="w-full p-2 rounded border border-slate-300 text-xs"
                        >
                          <option value="">Selecione o insumo...</option>
                          {parts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.code} - {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setNewBomItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: val } : it));
                          }}
                          placeholder="Qtd"
                          required
                          className="w-full p-2 rounded border border-slate-300 text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.1"
                          value={item.lossPercentage}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setNewBomItems(prev => prev.map((it, i) => i === index ? { ...it, lossPercentage: val } : it));
                          }}
                          placeholder="% Perda"
                          className="w-full p-2 rounded border border-slate-300 text-xs text-rose-700"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitCost}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setNewBomItems(prev => prev.map((it, i) => i === index ? { ...it, unitCost: val } : it));
                          }}
                          placeholder="Custo"
                          className="w-full p-2 rounded border border-slate-300 text-xs"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        {newBomItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notas de Engenharia</label>
                <textarea
                  rows={2}
                  value={newBomNotes}
                  onChange={e => setNewBomNotes(e.target.value)}
                  placeholder="Especificações técnicas, tolerâncias..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewBomModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Salvar Estrutura BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
