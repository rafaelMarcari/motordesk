/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, Search, Filter, CheckCircle2, AlertTriangle, XCircle, 
  Eye, FileText, ArrowRight, GitCommit, Check, X, User as UserIcon
} from 'lucide-react';
import { ProductLot, Part, ProductionOrder, User } from '../../types';

interface IndustrialLotsTabProps {
  productLots: ProductLot[];
  parts: Part[];
  productionOrders: ProductionOrder[];
  currentUser: User;
  onUpdateLotStatus: (lotId: string, status: ProductLot['status'], qcNotes?: string) => void;
}

export const IndustrialLotsTab: React.FC<IndustrialLotsTabProps> = ({
  productLots,
  parts,
  productionOrders,
  currentUser,
  onUpdateLotStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLot, setSelectedLot] = useState<ProductLot | null>(null);
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcDecision, setQcDecision] = useState<'APROVADO' | 'QUARENTENA' | 'REJEITADO'>('APROVADO');
  const [qcNotes, setQcNotes] = useState('');

  const filteredLots = productLots.filter(lot => {
    const lotNum = (lot.lotNumber || lot.code || '').toLowerCase();
    const prdName = (lot.productName || lot.partName || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = lotNum.includes(search) || prdName.includes(search);

    const matchesStatus = statusFilter === 'ALL' || lot.status === statusFilter ||
      (statusFilter === 'APROVADO' && (lot.status as any) === 'approved') ||
      (statusFilter === 'QUARENTENA' && (lot.status as any) === 'quarantine') ||
      (statusFilter === 'REJEITADO' && (lot.status as any) === 'rejected');

    return matchesSearch && matchesStatus;
  });

  const handleQcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    onUpdateLotStatus(selectedLot.id, qcDecision as any, qcNotes);
    setShowQcModal(false);
    setQcNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por número de lote ou produto..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="p-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
        >
          <option value="ALL">Todos os Laudos CQ</option>
          <option value="APROVADO">Aprovados</option>
          <option value="QUARENTENA">Em Quarentena</option>
          <option value="REJEITADO">Rejeitados</option>
        </select>
      </div>

      {/* Lots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLots.map(lot => {
          const isApproved = lot.status === 'APROVADO' || (lot.status as any) === 'approved';
          const isQuarantine = lot.status === 'QUARENTENA' || (lot.status as any) === 'quarantine';
          const isRejected = lot.status === 'REJEITADO' || (lot.status as any) === 'rejected';

          return (
            <div 
              key={lot.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {lot.lotNumber || lot.code}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                    isApproved ? 'bg-emerald-100 text-emerald-800' :
                    isQuarantine ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {isApproved && <CheckCircle2 className="w-3 h-3" />}
                    {isQuarantine && <AlertTriangle className="w-3 h-3" />}
                    {isRejected && <XCircle className="w-3 h-3" />}
                    {lot.status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
                  {lot.productName || lot.partName}
                </h4>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs my-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Saldo do Lote</span>
                    <span className="font-bold text-slate-900">{lot.initialQuantity || lot.currentQuantity || 0} {lot.unit || 'UN'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Data Fabricação</span>
                    <span className="font-semibold text-slate-700">{lot.manufacturingDate || lot.createdAt?.split('T')[0] || 'N/A'}</span>
                  </div>
                </div>

                {lot.qcNotes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                    <span className="font-bold">Laudo CQ:</span> {lot.qcNotes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                <button
                  onClick={() => setSelectedLot(lot)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Genealogia
                </button>

                <button
                  onClick={() => {
                    setSelectedLot(lot);
                    setQcDecision(isApproved ? 'APROVADO' : isQuarantine ? 'QUARENTENA' : 'REJEITADO');
                    setShowQcModal(true);
                  }}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Inspecionar CQ
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lot Genealogy / Traceability Modal */}
      {selectedLot && !showQcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500">Árvore de Rastreabilidade & Genealogia</span>
                <h3 className="text-base font-bold text-slate-900">{selectedLot.lotNumber || selectedLot.code}</h3>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Tree */}
            <div className="space-y-3 relative pl-4 border-l-2 border-indigo-200 my-4 text-xs">
              <div className="relative">
                <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase">1. Origem de Matéria-Prima & Fornecedor</div>
                  <div className="font-semibold text-slate-900">Nota Fiscal de Entrada e Lote MP Fornecedor</div>
                  <div className="text-slate-500 text-[11px]">Certificado de Qualidade ISO 9001 anexado</div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-amber-700 uppercase">2. Ordem de Fabricação / OP</div>
                  <div className="font-semibold text-slate-900">{selectedLot.productionOrderCode || 'OP-2025-0012'}</div>
                  <div className="text-slate-500 text-[11px]">Apontamento de Usinagem, Montagem e Bancada CQ</div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">3. Lote de Produto Acabado & Liberação CQ</div>
                  <div className="font-bold text-slate-900">{selectedLot.lotNumber || selectedLot.code}</div>
                  <div className="text-slate-600 text-[11px]">Status: {selectedLot.status} | Saldo: {selectedLot.currentQuantity || selectedLot.initialQuantity} {selectedLot.unit || 'UN'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedLot(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QC Inspection Modal */}
      {showQcModal && selectedLot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                Laudo de Inspeção do Controle de Qualidade
              </h3>
              <button
                onClick={() => setShowQcModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQcSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Decisão do Inspetor CQ</label>
                <select
                  value={qcDecision}
                  onChange={e => setQcDecision(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-bold"
                >
                  <option value="APROVADO">APROVADO (Liberado para Expedição/Uso)</option>
                  <option value="QUARENTENA">QUARENTENA (Aguardando Reteste/Análise)</option>
                  <option value="REJEITADO">REJEITADO (Sucatear ou Retrabalhar)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parecer Técnico / Notas do CQ</label>
                <textarea
                  rows={3}
                  value={qcNotes}
                  onChange={e => setQcNotes(e.target.value)}
                  placeholder="Ex: Amostragem visual e dimensional em conformidade com norma técnica..."
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQcModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Salvar Laudo CQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
