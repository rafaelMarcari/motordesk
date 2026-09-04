/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — TELA DE CONCILIAÇÃO INTELIGENTE 1:N (RepresentativeReconciliationView)
 * Painel com badges de confiança, apuração de comissões, divergências e geração para o Contas a Receber
 */

import React, { useState } from 'react';
import {
  ReconciliationResultItem,
  ReconciliationStatus,
  RepresentedCompany,
  RepresentativeOrder,
  RepresentativeFactoryOrder,
  FactoryInvoice,
  FactoryBillingImport,
  AppDatabase,
  User,
  CompanyInfo,
  AccountReceivable,
} from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Printer,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Check,
  Layers,
  HelpCircle,
  UploadCloud,
} from 'lucide-react';
import { ReconciliationMirrorModal } from './representative/ReconciliationMirrorModal';
import { RepresentativeImportModal } from './representative/RepresentativeImportModal';
import { runRepresentativeReconciliation } from '../utils/representativeUtils';

interface RepresentativeReconciliationViewProps {
  reconciliationItems: ReconciliationResultItem[];
  representedCompanies: RepresentedCompany[];
  orders: RepresentativeOrder[];
  factoryOrders?: RepresentativeFactoryOrder[];
  factoryInvoices?: FactoryInvoice[];
  user: User;
  currentCompany?: CompanyInfo;
  db: AppDatabase;
  onConfirmReconciliationItem: (item: ReconciliationResultItem) => void;
  onImportCompleted: (importRecord: FactoryBillingImport, rawData: Record<string, any>[], columnMapping: Record<string, string>) => void;
}

export const RepresentativeReconciliationView: React.FC<RepresentativeReconciliationViewProps> = ({
  reconciliationItems,
  representedCompanies,
  orders,
  factoryOrders = [],
  factoryInvoices = [],
  user,
  currentCompany,
  db,
  onConfirmReconciliationItem,
  onImportCompleted,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [representedFilter, setRepresentedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Espelho
  const [mirrorItem, setMirrorItem] = useState<ReconciliationResultItem | null>(null);

  // Modal de Importação
  const [showImportModal, setShowImportModal] = useState(false);

  // Filtros
  const filteredItems = reconciliationItems.filter(item => {
    const matchesSearch =
      (item.representativeOrderNumber && item.representativeOrderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.clientCnpjCpf && item.clientCnpjCpf.includes(searchTerm)) ||
      item.invoices.some(inv => inv.invoiceNumber.includes(searchTerm)) ||
      item.factoryOrders.some(fo => fo.factoryOrderNumber.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Totais para os 5 cards de status solicitados
  const countConciliado = reconciliationItems.filter(r => r.status === 'CONCILIADO').length;
  const countParcial = reconciliationItems.filter(r => r.status === 'PARCIAL').length;
  const countNaoFaturado = reconciliationItems.filter(r => r.status === 'NAO_FATURADO').length;
  const countDivergencia = reconciliationItems.filter(r => r.status === 'DIVERGENCIA').length;
  const countSemPedido = reconciliationItems.filter(r => r.status === 'FATURAMENTO_SEM_PEDIDO').length;

  const totalInvoicedSum = reconciliationItems.reduce((acc, it) => acc + it.totalInvoicedAmount, 0);
  const totalCommissionSum = reconciliationItems.reduce((acc, it) => acc + it.confirmedCommission, 0);

  const getStatusBadge = (status: ReconciliationStatus) => {
    switch (status) {
      case 'CONCILIADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> CONCILIADO
          </span>
        );
      case 'PARCIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> PARCIAL
          </span>
        );
      case 'NAO_FATURADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> NÃO FATURADO
          </span>
        );
      case 'DIVERGENCIA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-400">
            <AlertCircle className="w-3.5 h-3.5 text-rose-700" /> DIVERGÊNCIA
          </span>
        );
      case 'FATURAMENTO_SEM_PEDIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" /> SEM PEDIDO
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Match Alto</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Match Médio</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Match Baixo</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">Sem Match</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Conciliação Inteligente 1:N
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Confronto automatizado entre pedidos registrados no MotorDesk e relatórios de faturamento/NF-e da representada.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <UploadCloud className="w-4 h-4" />
            Importar Planilha de Faturamento
          </button>
        </div>
      </div>

      {/* 5 Cards de Status Solicitados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Conciliado */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'CONCILIADO' ? 'all' : 'CONCILIADO')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'CONCILIADO'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Conciliados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{countConciliado}</div>
          <span className="text-[10px] text-emerald-600 font-medium">100% Batimento Perfeito</span>
        </div>

        {/* Parcial */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'PARCIAL' ? 'all' : 'PARCIAL')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'PARCIAL'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Parciais</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{countParcial}</div>
          <span className="text-[10px] text-amber-600 font-medium">Faturamento menor que pedido</span>
        </div>

        {/* Não Faturados */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'NAO_FATURADO' ? 'all' : 'NAO_FATURADO')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'NAO_FATURADO'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Não Faturados</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{countNaoFaturado}</div>
          <span className="text-[10px] text-rose-600 font-medium">Sem emissão na fábrica</span>
        </div>

        {/* Divergências */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'DIVERGENCIA' ? 'all' : 'DIVERGENCIA')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'DIVERGENCIA'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Divergências</span>
            <AlertCircle className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-2xl font-black text-rose-800 mt-1">{countDivergencia}</div>
          <span className="text-[10px] text-rose-700 font-medium">Valores ou itens divergentes</span>
        </div>

        {/* Sem Pedido */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'FATURAMENTO_SEM_PEDIDO' ? 'all' : 'FATURAMENTO_SEM_PEDIDO')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'FATURAMENTO_SEM_PEDIDO'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Sem Pedido</span>
            <HelpCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{countSemPedido}</div>
          <span className="text-[10px] text-purple-600 font-medium">NF na planilha sem pedido</span>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por pedido MotorDesk, cliente, NF-e ou pedido da fábrica..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="all">Todos os Status</option>
            <option value="CONCILIADO">Conciliados (100%)</option>
            <option value="PARCIAL">Parciais</option>
            <option value="NAO_FATURADO">Não Faturados</option>
            <option value="DIVERGENCIA">Divergências</option>
            <option value="FATURAMENTO_SEM_PEDIDO">Faturamento Sem Pedido</option>
          </select>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Nenhum item na fila de conciliação</p>
            <p className="text-xs text-slate-400 mt-1">
              Importe uma planilha de faturamento da fábrica para processar a conciliação automática 1:N.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Pedido MotorDesk</th>
                  <th className="px-4 py-3">Cliente / Comprador</th>
                  <th className="px-4 py-3 text-right">Valor Pedido</th>
                  <th className="px-4 py-3">Pedidos Fábrica (1:N)</th>
                  <th className="px-4 py-3">Notas Fiscais (NF-e)</th>
                  <th className="px-4 py-3 text-right">Total Faturado</th>
                  <th className="px-4 py-3 text-right">Saldo / Dif.</th>
                  <th className="px-4 py-3 text-right">Comissão R$</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Pedido MotorDesk */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-indigo-700 font-mono">
                        {item.representativeOrderNumber || <span className="text-slate-400 italic">Sem Pedido</span>}
                      </div>
                      <div className="mt-0.5">{getConfidenceBadge(item.confidenceLevel)}</div>
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 max-w-xs truncate">{item.clientName}</div>
                      {item.clientCnpjCpf && (
                        <div className="text-[11px] text-slate-400 font-mono">{item.clientCnpjCpf}</div>
                      )}
                    </td>

                    {/* Valor do Pedido */}
                    <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                      R$ {item.orderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Pedidos Fábrica 1:N */}
                    <td className="px-4 py-3">
                      {item.factoryOrders.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.factoryOrders.map((fo, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-800">
                              #{fo.factoryOrderNumber}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* NF-e 1:N */}
                    <td className="px-4 py-3">
                      {item.invoices.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.invoices.map((inv, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-mono text-emerald-800">
                              NF {inv.invoiceNumber}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Total Faturado */}
                    <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                      R$ {item.totalInvoicedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Saldo / Diferença */}
                    <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                      item.difference === 0 ? 'text-emerald-600' : item.difference < 0 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      R$ {item.difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Comissão Calculada */}
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      R$ {item.confirmedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Botão Ver Espelho */}
                        <button
                          onClick={() => setMirrorItem(item)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors flex items-center gap-1"
                          title="Visualizar e Imprimir Espelho da Conciliação"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Espelho
                        </button>

                        {/* Botão Confirmar Conciliação e Liberar para Contas a Receber */}
                        <button
                          onClick={() => onConfirmReconciliationItem(item)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors flex items-center gap-1"
                          title="Confirmar batimento e gerar título no Contas a Receber"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirmar
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Espelho da Conciliação */}
      {mirrorItem && (
        <ReconciliationMirrorModal
          item={mirrorItem}
          representedCompany={representedCompanies[0]}
          currentCompany={currentCompany}
          onClose={() => setMirrorItem(null)}
        />
      )}

      {/* Modal de Importação de Planilha */}
      {showImportModal && (
        <RepresentativeImportModal
          representedCompanies={representedCompanies}
          user={user}
          db={db}
          onClose={() => setShowImportModal(false)}
          onImportComplete={(imp, raw, mapping) => {
            onImportCompleted(imp, raw, mapping);
            setShowImportModal(false);
          }}
        />
      )}

    </div>
  );
};
