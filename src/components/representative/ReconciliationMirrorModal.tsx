/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — ESPELHO DA CONCILIAÇÃO 1:N (IMPRIMÍVEL E DETALHADO)
 */

import React from 'react';
import { ReconciliationResultItem, RepresentedCompany, CompanyInfo } from '../../types';
import { Printer, X, CheckCircle2, AlertTriangle, AlertCircle, Building2, FileText, ArrowDown, DollarSign } from 'lucide-react';

interface ReconciliationMirrorModalProps {
  item: ReconciliationResultItem;
  representedCompany?: RepresentedCompany;
  currentCompany?: CompanyInfo;
  onClose: () => void;
}

export const ReconciliationMirrorModal: React.FC<ReconciliationMirrorModalProps> = ({
  item,
  representedCompany,
  currentCompany,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'CONCILIADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> CONCILIADO (100%)
          </span>
        );
      case 'PARCIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> PARCIALMENTE FATURADO
          </span>
        );
      case 'NAO_FATURADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600" /> NÃO FATURADO
          </span>
        );
      case 'DIVERGENCIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600" /> DIVERGÊNCIA DE VALOR
          </span>
        );
      case 'FATURAMENTO_SEM_PEDIDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <AlertCircle className="w-4 h-4 text-purple-600" /> FATURAMENTO SEM PEDIDO NO SISTEMA
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 print:border-none print:shadow-none">
        
        {/* Top Header - Oculto na impressão */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">Espelho da Conciliação de Pedido e Faturamento</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir Espelho
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível */}
        <div className="p-8 space-y-6 print:p-0">
          
          {/* Cabeçalho Oficial do Documento */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  MotorDesk — Representação Comercial
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-1">
                  Espelho Analítico de Conciliação
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Rastreamento 1:N — Pedido Cliente × Pedidos da Fábrica × Notas Fiscais × Comissão
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Data de Emissão:</div>
                <div className="text-sm font-semibold text-slate-800">
                  {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </div>
                <div className="mt-2">{getStatusBadge()}</div>
              </div>
            </div>

            {/* Identificação das Partes */}
            <div className="grid grid-cols-2 gap-4 mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Empresa Representada / Fábrica</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {representedCompany?.tradeName || representedCompany?.corporateName || 'Fábrica Representada'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  CNPJ: {representedCompany?.cnpj || 'Não informado'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Cliente Comprador</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">{item.clientName}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  CNPJ/CPF: {item.clientCnpjCpf || 'Não informado'}
                </div>
              </div>
            </div>
          </div>

          {/* Árvore Hierárquica 1:N */}
          <div className="space-y-6">
            
            {/* 1. Pedido MotorDesk Pai */}
            <div className="relative pl-6 border-l-2 border-indigo-500">
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
              <div className="flex justify-between items-center bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                <div>
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">1. Pedido MotorDesk</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {item.representativeOrderNumber || 'Sem Pedido Registrado'}
                  </div>
                  <div className="text-xs text-slate-500">Valor Negociado com o Cliente</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Total do Pedido</div>
                  <div className="text-xl font-black text-indigo-900">
                    R$ {item.orderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Seta indicativa */}
            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-5 h-5" />
            </div>

            {/* 2. Pedidos Gerados pela Fábrica (1:N) */}
            <div className="relative pl-6 border-l-2 border-amber-500">
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
              <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                      2. Pedidos Internos da Representada ({item.factoryOrders.length} pedido{item.factoryOrders.length === 1 ? '' : 's'})
                    </span>
                    <p className="text-xs text-slate-500">Desdobramentos ou pedidos parciais criados pela fábrica</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Subtotal Fábrica: </span>
                    <span className="text-sm font-bold text-slate-800">
                      R$ {item.factoryOrders.reduce((sum, fo) => sum + fo.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {item.factoryOrders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {item.factoryOrders.map((fo, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200 text-xs">
                        <div className="font-bold text-slate-800">Pedido Fábrica #{fo.factoryOrderNumber}</div>
                        <div className="text-slate-500 mt-1">Valor: <strong className="text-slate-700">R$ {fo.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                        {fo.status && <div className="text-slate-400 capitalize mt-0.5">Status: {fo.status}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-white p-3 rounded-lg border border-slate-200">
                    Nenhum número de pedido interno da fábrica informado.
                  </div>
                )}
              </div>
            </div>

            {/* Seta indicativa */}
            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-5 h-5" />
            </div>

            {/* 3. Notas Fiscais Eletrônicas (NF-e 1:N) */}
            <div className="relative pl-6 border-l-2 border-emerald-500">
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                      3. Faturamento & NF-e ({item.invoices.length} nota{item.invoices.length === 1 ? '' : 's'})
                    </span>
                    <p className="text-xs text-slate-500">Documentos fiscais emitidos pela representada</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Total Efetivamente Faturado: </span>
                    <span className="text-base font-black text-emerald-900">
                      R$ {item.totalInvoicedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {item.invoices.length > 0 ? (
                  <div className="space-y-2">
                    {item.invoices.map((inv, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="font-bold text-slate-800">NF-e #{inv.invoiceNumber}</span>
                            <span className="text-slate-500 ml-2">Data: {inv.invoiceDate}</span>
                          </div>
                        </div>
                        <div className="text-right font-bold text-slate-800">
                          R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-white p-3 rounded-lg border border-slate-200">
                    Nenhuma nota fiscal vinculada até o momento.
                  </div>
                )}
              </div>
            </div>

            {/* Seta indicativa */}
            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-5 h-5" />
            </div>

            {/* 4. Quadro de Apuração e Comissão */}
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold">Apuração Financeira & Comissão</h3>
                </div>
                <span className="text-xs text-slate-400">
                  Alíquota Contratual: <strong className="text-white">{item.commissionPercentage}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-slate-800/80">
                  <div className="text-xs text-slate-400 uppercase">Valor Pedido</div>
                  <div className="text-sm font-bold text-white mt-1">
                    R$ {item.orderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/80">
                  <div className="text-xs text-slate-400 uppercase">Total Faturado</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    R$ {item.totalInvoicedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/80">
                  <div className="text-xs text-slate-400 uppercase">Saldo / Diferença</div>
                  <div className={`text-sm font-bold mt-1 ${item.difference === 0 ? 'text-emerald-400' : item.difference < 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    R$ {item.difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/30">
                  <div className="text-xs text-emerald-400 uppercase font-semibold">Comissão Confirmada</div>
                  <div className="text-base font-black text-emerald-300 mt-1">
                    R$ {item.confirmedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {item.notes && (
                <div className="mt-4 p-3 rounded-lg bg-slate-800 text-xs text-slate-300">
                  <strong>Observações Técnicas:</strong> {item.notes}
                </div>
              )}
            </div>

          </div>

          {/* Assinaturas para Conferência */}
          <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs text-slate-500">
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">
                Conferência do Representante Comercial
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Assinatura / Carimbo</div>
            </div>
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">
                Aprovação Financeira / Auditoria
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Assinatura / Carimbo</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
