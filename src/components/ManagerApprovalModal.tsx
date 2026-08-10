/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  FileText, 
  User, 
  Clock, 
  Wrench,
  Check
} from 'lucide-react';
import { ServiceOrder, OSItem, PriceChangeApproval, SystemNotification } from '../types';
import { AppDatabase } from '../data/mockData';

interface ManagerApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  currentUser: any;
  onSaveServiceOrders: (serviceOrders: ServiceOrder[]) => void;
  onAddHistoryLog: (
    type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system',
    title: string,
    description: string,
    clientId: string,
    vehicleId: string,
    metadata?: any
  ) => void;
  onAddNotification?: (notification: SystemNotification) => void;
}

export default function ManagerApprovalModal({
  isOpen,
  onClose,
  db,
  currentUser,
  onSaveServiceOrders,
  onAddHistoryLog,
  onAddNotification
}: ManagerApprovalModalProps) {
  const [managerNotes, setManagerNotes] = useState<{ [key: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Collect all pending price change approval requests from all service orders
  const pendingRequests: Array<{
    os: ServiceOrder;
    item: OSItem;
    approval: PriceChangeApproval;
    clientName: string;
    vehicleDesc: string;
  }> = [];

  db.serviceOrders.forEach(os => {
    os.items.forEach(item => {
      if (item.priceChangeApproval && item.priceChangeApproval.status === 'pending') {
        const client = db.clients.find(c => c.id === os.clientId);
        const vehicle = db.vehicles.find(v => v.id === os.vehicleId);
        pendingRequests.push({
          os,
          item,
          approval: item.priceChangeApproval,
          clientName: client?.name || 'Cliente Desconhecido',
          vehicleDesc: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'Veículo Desconhecido'
        });
      }
    });
  });

  const handleApprove = (osId: string, itemId: string) => {
    const note = managerNotes[itemId] || '';
    
    const updatedOSList = db.serviceOrders.map(os => {
      if (os.id !== osId) return os;

      const updatedItems = os.items.map(item => {
        if (item.id !== itemId || !item.priceChangeApproval) return item;

        const newUnitPrice = item.priceChangeApproval.requestedNewPrice;
        const newTotalPrice = newUnitPrice * item.quantity;

        return {
          ...item,
          unitPrice: newUnitPrice,
          totalPrice: newTotalPrice,
          status: 'executing' as const, // Liberado para execução!
          priceChangeApproval: {
            ...item.priceChangeApproval,
            status: 'approved' as const,
            approvedBy: currentUser.name || 'Gerente',
            approvedAt: new Date().toISOString(),
            managerNotes: note
          }
        };
      });

      return {
        ...os,
        items: updatedItems
      };
    });

    const targetOS = db.serviceOrders.find(o => o.id === osId);
    const targetItem = targetOS?.items.find(i => i.id === itemId);

    onSaveServiceOrders(updatedOSList);

    if (targetOS && targetItem && targetItem.priceChangeApproval) {
      const orig = targetItem.priceChangeApproval.originalPrice;
      const req = targetItem.priceChangeApproval.requestedNewPrice;

      onAddHistoryLog(
        'service_order',
        'Alteração de Preço Aprovada pelo Gerente',
        `O Gerente ${currentUser.name} APROVOU a reativação do item "${targetItem.name}" na OS ${osId} com novo valor de R$ ${req.toFixed(2)} (Valor original anterior: R$ ${orig.toFixed(2)}). ${note ? `Obs: ${note}` : ''}`,
        targetOS.clientId,
        targetOS.vehicleId,
        {
          osId,
          itemId,
          originalPrice: orig,
          approvedPrice: req,
          approvedBy: currentUser.name
        }
      );

      if (onAddNotification) {
        onAddNotification({
          id: `notif-appr-${Date.now()}`,
          type: 'system',
          title: 'Alteração de Preço Liberada pelo Gerente',
          message: `O item "${targetItem.name}" da OS #${osId} foi liberado com o novo valor de R$ ${req.toFixed(2)}.`,
          date: new Date().toISOString(),
          read: false,
          metadata: {
            serviceOrderId: osId,
            itemId,
            newPrice: req
          }
        });
      }
    }

    setSuccessMsg('Alteração de preço aprovada com sucesso! O item foi liberado para execução.');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleReject = (osId: string, itemId: string) => {
    const note = managerNotes[itemId] || '';

    const updatedOSList = db.serviceOrders.map(os => {
      if (os.id !== osId) return os;

      const updatedItems = os.items.map(item => {
        if (item.id !== itemId || !item.priceChangeApproval) return item;

        // Reverts to original price and remains postponed
        return {
          ...item,
          unitPrice: item.priceChangeApproval.originalPrice,
          totalPrice: item.priceChangeApproval.originalPrice * item.quantity,
          status: 'postponed' as const,
          priceChangeApproval: {
            ...item.priceChangeApproval,
            status: 'rejected' as const,
            approvedBy: currentUser.name || 'Gerente',
            approvedAt: new Date().toISOString(),
            managerNotes: note || 'Rejeitado pelo Gerente - Manter valor original ou item adiado.'
          }
        };
      });

      return {
        ...os,
        items: updatedItems
      };
    });

    const targetOS = db.serviceOrders.find(o => o.id === osId);
    const targetItem = targetOS?.items.find(i => i.id === itemId);

    onSaveServiceOrders(updatedOSList);

    if (targetOS && targetItem) {
      onAddHistoryLog(
        'service_order',
        'Alteração de Preço Recusada pelo Gerente',
        `O Gerente ${currentUser.name} REJEITOU a alteração de preço para o item "${targetItem.name}" na OS ${osId}. O item permanece adiado com o valor original de R$ ${targetItem.priceChangeApproval?.originalPrice.toFixed(2)}.`,
        targetOS.clientId,
        targetOS.vehicleId
      );
    }

    setSuccessMsg('Solicitação de alteração de preço rejeitada. O item retornou ao valor original.');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="manager-approval-modal-overlay">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" id="manager-approval-modal-content">
        
        {/* Header */}
        <div className="bg-amber-600 text-white p-5 flex items-center justify-between border-b border-amber-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-amber-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase bg-amber-800/40 text-amber-100 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  Sessão do Gerente
                </span>
                <span className="text-xs text-amber-100 font-medium">
                  {pendingRequests.length} solicitação(ões) pendente(s)
                </span>
              </div>
              <h2 className="text-lg font-bold font-display text-white mt-0.5">
                Aprovação de Alteração de Preço (Item Adiado / Reativado)
              </h2>
            </div>
          </div>

          <button
            id="btn-close-manager-modal"
            type="button"
            onClick={onClose}
            className="text-amber-100 hover:text-white p-1.5 rounded-lg hover:bg-amber-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {successMsg && (
            <div id="manager-approval-success-alert" className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2 border border-emerald-200">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <p className="font-semibold">{successMsg}</p>
            </div>
          )}

          {pendingRequests.length === 0 ? (
            <div className="py-12 text-center space-y-3" id="no-pending-approvals-msg">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Nenhuma aprovação pendente</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há solicitações de alteração de preço para itens adiados aguardando a liberação do gerente no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-150">
                <strong>Regra de Aprovação do Gerente:</strong> Quando o cliente decide realizar um item que havia sido adiado anteriormente, e há variação no valor da peça ou serviço, a liberação da execução e atualização do valor na Ordem de Serviço somente é autorizada mediante a sua aprovação.
              </p>

              {pendingRequests.map(({ os, item, approval, clientName, vehicleDesc }) => {
                const diff = approval.requestedNewPrice - approval.originalPrice;
                const isIncrease = diff > 0;

                return (
                  <div key={`${os.id}-${item.id}`} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs" id={`approval-card-${os.id}-${item.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">
                          OS #{os.id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 mt-1">
                          Item: <span className="text-indigo-900 font-display">{item.name}</span> ({item.quantity}x)
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-medium block">Solicitado por: {approval.requestedBy}</span>
                        <span className="text-[10px] text-slate-400">{new Date(approval.requestedAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-medium block">Cliente & Veículo</span>
                        <p className="font-bold text-slate-800">{clientName}</p>
                        <p className="text-[11px] text-slate-600">{vehicleDesc}</p>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-medium block">Preço Original do Item Adiado</span>
                        <p className="font-bold text-slate-700 text-sm">R$ {approval.originalPrice.toFixed(2)}</p>
                        <span className="text-[10px] text-slate-400">Valor acordado no orçamento inicial</span>
                      </div>

                      <div className={`p-2.5 rounded-lg border space-y-1 ${isIncrease ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className="text-[10px] text-slate-500 font-medium block">Novo Valor Solicitado</span>
                        <p className={`font-bold text-sm ${isIncrease ? 'text-amber-900' : 'text-emerald-900'}`}>
                          R$ {approval.requestedNewPrice.toFixed(2)}
                        </p>
                        <span className={`text-[10px] font-bold ${isIncrease ? 'text-amber-700' : 'text-emerald-700'}`}>
                          Diferença: {isIncrease ? '+' : ''}R$ {diff.toFixed(2)} ({isIncrease ? 'Aumento' : 'Redução'})
                        </span>
                      </div>
                    </div>

                    {/* Service Free Text Notes / Informações Pertinentes */}
                    {(approval.serviceNotes || item.serviceNotes) && (
                      <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-950 space-y-1">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" /> Informações Pertinentes do Serviço / Observações:
                        </span>
                        <p className="italic text-slate-700">{approval.serviceNotes || item.serviceNotes}</p>
                      </div>
                    )}

                    {/* Manager Decision Input */}
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block" htmlFor={`manager-note-${item.id}`}>
                        Observação do Gerente (Opcional):
                      </label>
                      <input 
                        id={`manager-note-${item.id}`}
                        type="text"
                        placeholder="Ex: Aprovado reajuste devido ao aumento na tabela de fornecedores de amortecedores."
                        value={managerNotes[item.id] || ''}
                        onChange={e => setManagerNotes({ ...managerNotes, [item.id]: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          id={`btn-reject-approval-${item.id}`}
                          type="button"
                          onClick={() => handleReject(os.id, item.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-2 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" /> Rejeitar (Manter Original R$ {approval.originalPrice.toFixed(2)})
                        </button>

                        <button
                          id={`btn-approve-approval-${item.id}`}
                          type="button"
                          onClick={() => handleApprove(os.id, item.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" /> Aprovar Novo Valor (R$ {approval.requestedNewPrice.toFixed(2)}) & Liberar Item
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end text-xs text-slate-500">
          <button
            id="btn-close-manager-modal-footer"
            type="button"
            onClick={onClose}
            className="font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
}
