/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Factory, Search, Plus, Filter, Eye, Play, Check, X, 
  AlertCircle, Clock, AlertTriangle, Boxes, CheckCircle2,
  TrendingUp, RefreshCw, ChevronRight, User, Calendar
} from 'lucide-react';
import { ProductionOrder, BillOfMaterials, Part, ProductLot, User as UserType, ProductionScrapLog, ProductionReworkLog } from '../../types';

interface IndustrialProductionOrdersTabProps {
  productionOrders: ProductionOrder[];
  boms: BillOfMaterials[];
  parts: Part[];
  productLots: ProductLot[];
  currentUser: UserType;
  onUpdateOpStatus: (opId: string, newStatus: ProductionOrder['status']) => void;
  onCreateOp: (newOp: Partial<ProductionOrder>) => void;
  onRegisterProgress: (opId: string, producedQty: number, scrapQty: number, scrapReason?: string, reworkHours?: number, notes?: string) => void;
}

export const IndustrialProductionOrdersTab: React.FC<IndustrialProductionOrdersTabProps> = ({
  productionOrders,
  boms,
  parts,
  productLots,
  currentUser,
  onUpdateOpStatus,
  onCreateOp,
  onRegisterProgress
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedOp, setSelectedOp] = useState<ProductionOrder | null>(null);

  // Modal States
  const [showNewOpModal, setShowNewOpModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Form states for New OP
  const [newOpBomId, setNewOpBomId] = useState('');
  const [newOpPlannedQty, setNewOpPlannedQty] = useState<number>(50);
  const [newOpPriority, setNewOpPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [newOpDeadline, setNewOpDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newOpNotes, setNewOpNotes] = useState('');

  // Form states for Progress Pointing
  const [pointingProducedQty, setPointingProducedQty] = useState<number>(0);
  const [pointingScrapQty, setPointingScrapQty] = useState<number>(0);
  const [pointingScrapReason, setPointingScrapReason] = useState<string>('Perda técnica de corte');
  const [pointingReworkHours, setPointingReworkHours] = useState<number>(0);
  const [pointingNotes, setPointingNotes] = useState<string>('');

  const filteredOrders = productionOrders.filter(op => {
    const code = (op.code || '').toLowerCase();
    const product = (op.finishedProductName || op.finishedPartName || '').toLowerCase();
    const lot = (op.lotNumber || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = code.includes(search) || product.includes(search) || lot.includes(search);

    const matchesStatus = statusFilter === 'ALL' || op.status === statusFilter || 
      (statusFilter === 'IN_PRODUCTION' && (op.status as any) === 'em_producao') ||
      (statusFilter === 'PLANNED' && (op.status as any) === 'planejada') ||
      (statusFilter === 'COMPLETED' && (op.status as any) === 'concluida');

    const matchesPriority = priorityFilter === 'ALL' || op.priority === priorityFilter || (op.priority as any)?.toUpperCase() === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateOpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedBom = boms.find(b => b.id === newOpBomId);
    if (!selectedBom) {
      alert('Selecione uma estrutura de produto (BOM).');
      return;
    }

    const opCount = productionOrders.length + 1;
    const year = new Date().getFullYear();
    const code = `OP-${year}-${String(opCount).padStart(4, '0')}`;
    const lotNumber = `LOTE-${(selectedBom.finishedProductCode || 'PRD').replace(/[^a-zA-Z0-9]/g, '')}-${year}-${String(Math.floor(100 + Math.random() * 900))}`;

    const newOp: Partial<ProductionOrder> = {
      code,
      billOfMaterialsId: selectedBom.id,
      finishedProductPartId: selectedBom.finishedProductPartId || selectedBom.finishedPartId,
      finishedProductName: selectedBom.finishedProductName || selectedBom.name || selectedBom.finishedPartName,
      finishedProductCode: selectedBom.finishedProductCode || selectedBom.code,
      plannedQuantity: Number(newOpPlannedQty),
      producedQuantity: 0,
      scrapQuantity: 0,
      status: 'PLANNED',
      priority: newOpPriority as any,
      lotNumber: lotNumber,
      plannedStartDate: new Date().toISOString().split('T')[0],
      plannedEndDate: newOpDeadline,
      scheduledDate: newOpDeadline,
      estimatedUnitCost: selectedBom.totalUnitCost,
      estimatedTotalCost: (selectedBom.totalUnitCost || 0) * Number(newOpPlannedQty),
      notes: newOpNotes,
      routingStages: [
        { id: `stg-${Date.now()}-1`, sequence: 1, workCenterName: 'Corte e Usinagem', description: 'Corte de perfis e usinagem base', estimatedMinutes: 45, status: 'pendente' },
        { id: `stg-${Date.now()}-2`, sequence: 2, workCenterName: 'Montagem de Conjuntos', description: 'Montagem mecânica e fixação', estimatedMinutes: 60, status: 'pendente' },
        { id: `stg-${Date.now()}-3`, sequence: 3, workCenterName: 'Bancada de Teste & CQ', description: 'Inspeção final e ensaio de conformidade', estimatedMinutes: 30, status: 'pendente' }
      ]
    };

    onCreateOp(newOp);
    setShowNewOpModal(false);
    setNewOpPlannedQty(50);
    setNewOpNotes('');
  };

  const handlePointingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp) return;

    onRegisterProgress(
      selectedOp.id,
      Number(pointingProducedQty),
      Number(pointingScrapQty),
      pointingScrapReason,
      Number(pointingReworkHours),
      pointingNotes
    );

    setShowProgressModal(false);
    setPointingProducedQty(0);
    setPointingScrapQty(0);
    setPointingReworkHours(0);
    setPointingNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header Filters & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, produto ou lote..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PLANNED">Planejada</option>
            <option value="SEPARATION">Em Separação</option>
            <option value="IN_PRODUCTION">Em Produção</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="p-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
          >
            <option value="ALL">Todas as Prioridades</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </div>

        <button
          onClick={() => setShowNewOpModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Nova Ordem de Produção (OP)
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Código / Lote</th>
                <th className="p-3.5">Produto Acabado</th>
                <th className="p-3.5">Progresso / Qtd</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Prioridade</th>
                <th className="p-3.5">Prazo de Entrega</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(op => {
                const produced = op.producedQuantity || 0;
                const planned = op.plannedQuantity || 1;
                const percent = Math.min(100, Math.round((produced / planned) * 100));

                const isCompleted = op.status === 'COMPLETED' || (op.status as any) === 'concluida';
                const isInProduction = op.status === 'IN_PRODUCTION' || (op.status as any) === 'em_producao';
                const isPlanned = op.status === 'PLANNED' || (op.status as any) === 'planejada';

                return (
                  <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">{op.code}</div>
                      <div className="font-mono text-[10px] text-slate-500">{op.lotNumber || 'Lote Pendente'}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{op.finishedProductName || op.finishedPartName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{op.finishedProductCode}</div>
                    </td>

                    <td className="p-3.5 min-w-[160px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-700">{produced} / {planned} un</span>
                        <span className="font-bold text-slate-500">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {(op.scrapQuantity || (op as any).scrappedQuantity || 0) > 0 && (
                        <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">
                          Refugo: {op.scrapQuantity || (op as any).scrappedQuantity} un
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' :
                        isInProduction ? 'bg-amber-100 text-amber-800' :
                        isPlanned ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {op.status}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        op.priority === 'URGENT' || (op.priority as any) === 'critica' ? 'bg-rose-100 text-rose-800' :
                        op.priority === 'HIGH' || (op.priority as any) === 'alta' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {op.priority}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-600">
                      {op.scheduledDate || op.plannedEndDate || 'Sem prazo'}
                    </td>

                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedOp(op)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] cursor-pointer"
                      >
                        Ver Dossiê
                      </button>

                      {isPlanned && (
                        <button
                          onClick={() => onUpdateOpStatus(op.id, 'IN_PRODUCTION')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Iniciar
                        </button>
                      )}

                      {isInProduction && (
                        <button
                          onClick={() => {
                            setSelectedOp(op);
                            setShowProgressModal(true);
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Apontar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* OP Details Modal */}
      {selectedOp && !showProgressModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {selectedOp.code}
                  </span>
                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Lote: {selectedOp.lotNumber || 'A Gerar'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedOp.finishedProductName || selectedOp.finishedPartName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* OP Summary */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Planejado</span>
                <span className="font-bold text-slate-900">{selectedOp.plannedQuantity} un</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Produzido</span>
                <span className="font-bold text-emerald-700">{selectedOp.producedQuantity || 0} un</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Refugo / Sucata</span>
                <span className="font-bold text-rose-700">{selectedOp.scrapQuantity || (selectedOp as any).scrappedQuantity || 0} un</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Custo Estimado</span>
                <span className="font-bold text-slate-900">R$ {((selectedOp.estimatedUnitCost || 0) * selectedOp.plannedQuantity).toFixed(2)}</span>
              </div>
            </div>

            {/* Routing Stages */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Roteiro de Produção & Centros de Trabalho
              </h4>
              <div className="space-y-2">
                {(selectedOp.routingStages || []).map((stage, idx) => (
                  <div key={stage.id || idx} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                        {stage.sequence || idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{stage.workCenterName}</div>
                        <div className="text-slate-500 text-[11px]">{stage.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">{stage.estimatedMinutes} min</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        stage.status === 'concluido' || stage.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        stage.status === 'em_andamento' || stage.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {stage.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedOp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Fechar
              </button>

              {selectedOp.status !== 'COMPLETED' && (
                <button
                  onClick={() => setShowProgressModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" /> Apontar Produção / Refugo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Pointing Modal */}
      {showProgressModal && selectedOp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Apontamento de Chão de Fábrica</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedOp.code} - {selectedOp.finishedProductName || selectedOp.finishedPartName}</span>
              </div>
              <button
                onClick={() => setShowProgressModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePointingSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qtd Aprovada (+ un)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pointingProducedQty}
                    onChange={e => setPointingProducedQty(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Refugo / Sucata (un)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pointingScrapQty}
                    onChange={e => setPointingScrapQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-bold text-rose-700"
                  />
                </div>
              </div>

              {pointingScrapQty > 0 && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Motivo do Refugo</label>
                  <input
                    type="text"
                    value={pointingScrapReason}
                    onChange={e => setPointingScrapReason(e.target.value)}
                    placeholder="Ex: Apara fora de tolerância, trinca no ensaio..."
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Horas de Retrabalho (se houver)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={pointingReworkHours}
                  onChange={e => setPointingReworkHours(Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Observações do Apontamento</label>
                <textarea
                  rows={2}
                  value={pointingNotes}
                  onChange={e => setPointingNotes(e.target.value)}
                  placeholder="Informações do operador, máquina ou turno..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Salvar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New OP Modal */}
      {showNewOpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Factory className="w-5 h-5 text-indigo-600" />
                Abrir Nova Ordem de Produção (OP)
              </h3>
              <button
                onClick={() => setShowNewOpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOpSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Estrutura do Produto (BOM)</label>
                <select
                  value={newOpBomId}
                  onChange={e => setNewOpBomId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione uma BOM ativa...</option>
                  {boms.map(bom => (
                    <option key={bom.id} value={bom.id}>
                      {bom.code || bom.finishedProductCode} - {bom.name || bom.finishedProductName || bom.finishedPartName} ({bom.version || 'v1.0'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qtd Planejada (unidades)</label>
                  <input
                    type="number"
                    min="1"
                    value={newOpPlannedQty}
                    onChange={e => setNewOpPlannedQty(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioridade</label>
                  <select
                    value={newOpPriority}
                    onChange={e => setNewOpPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Prazo de Entrega Planejado</label>
                <input
                  type="date"
                  value={newOpDeadline}
                  onChange={e => setNewOpDeadline(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Instruções de Produção / Observações</label>
                <textarea
                  rows={2}
                  value={newOpNotes}
                  onChange={e => setNewOpNotes(e.target.value)}
                  placeholder="Lote prioritário, cliente de exportação..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOpModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Criar Ordem de Produção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
