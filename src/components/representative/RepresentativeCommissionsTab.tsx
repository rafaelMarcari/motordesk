/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — ABA DE GESTÃO DE COMISSÕES DE REPRESENTAÇÃO COMERCIAL
 * Fluxo de status: PREVISTA -> CONFIRMADA -> A_RECEBER -> RECEBIDA -> EM_ATRASO / DIVERGENTE
 */

import React, { useState } from 'react';
import {
  RepresentativeCommission,
  RepresentativeCommissionStatus,
  RepresentedCompany,
  AccountReceivable,
  AppDatabase,
  User,
} from '../../types';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
  Printer,
  Calendar,
  Building2,
} from 'lucide-react';

interface RepresentativeCommissionsTabProps {
  commissions: RepresentativeCommission[];
  representedCompanies: RepresentedCompany[];
  user: User;
  db: AppDatabase;
  onSettleCommission: (commissionId: string, receivedAmount: number, paymentDate: string) => void;
  onSendToReceivable: (commissionId: string, dueDate: string) => void;
}

export const RepresentativeCommissionsTab: React.FC<RepresentativeCommissionsTabProps> = ({
  commissions,
  representedCompanies,
  user,
  db,
  onSettleCommission,
  onSendToReceivable,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [representedFilter, setRepresentedFilter] = useState<string>('all');

  const filteredCommissions = commissions.filter(c => {
    const repName = c.representedCompanyName || c.representedName || '';
    const invNum = c.invoiceNumber || c.factoryInvoiceNumber || '';
    const repId = c.representedCompanyId || c.representedId || '';

    const matchesSearch =
      c.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invNum.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesRepresented = representedFilter === 'all' || repId === representedFilter;

    return matchesSearch && matchesStatus && matchesRepresented;
  });

  const getCommAmount = (c: RepresentativeCommission) =>
    c.confirmedCommissionAmount || c.confirmedAmount || c.commissionAmount || 0;

  const totalCommissions = filteredCommissions.reduce((acc, c) => acc + getCommAmount(c), 0);
  const totalReceived = filteredCommissions.filter(c => c.status === 'RECEBIDA').reduce((acc, c) => acc + getCommAmount(c), 0);
  const totalPending = filteredCommissions.filter(c => c.status === 'A_RECEBER' || c.status === 'CONFIRMADA').reduce((acc, c) => acc + getCommAmount(c), 0);

  const getStatusBadge = (status: RepresentativeCommissionStatus) => {
    switch (status) {
      case 'PREVISTA':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">Prevista</span>;
      case 'CONFIRMADA':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">Confirmada</span>;
      case 'A_RECEBER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">A Receber</span>;
      case 'RECEBIDA':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">Recebida</span>;
      case 'EM_ATRASO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 font-bold">Em Atraso</span>;
      case 'DIVERGENTE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-400">Divergente</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Total de Comissões Filtradas</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400">{filteredCommissions.length} lançamentos registrados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase">Comissões Recebidas (Pagas)</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-emerald-600 font-medium">Baixadas com sucesso no caixa</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-amber-600 uppercase">A Receber / Em Aberto</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-amber-600 font-medium">Aguardando pagamento da representada</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por pedido, representada ou NF..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="all">Todos os Status</option>
            <option value="PREVISTA">Prevista</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="A_RECEBER">A Receber</option>
            <option value="RECEBIDA">Recebida</option>
            <option value="EM_ATRASO">Em Atraso</option>
            <option value="DIVERGENTE">Divergente</option>
          </select>

          <select
            value={representedFilter}
            onChange={(e) => setRepresentedFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="all">Todas as Representadas</option>
            {representedCompanies.map(r => (
              <option key={r.id} value={r.id}>{r.tradeName || r.corporateName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredCommissions.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma comissão encontrada</p>
            <p className="text-xs text-slate-400 mt-1">As comissões são geradas automaticamente a partir dos pedidos de representação.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Pedido MotorDesk</th>
                  <th className="px-4 py-3">Empresa Representada</th>
                  <th className="px-4 py-3">Base de Cálculo</th>
                  <th className="px-4 py-3 text-center">% Com.</th>
                  <th className="px-4 py-3 text-right">Comissão R$</th>
                  <th className="px-4 py-3 text-center">Prev. Pagamento</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCommissions.map(comm => {
                  const repName = comm.representedCompanyName || comm.representedName || 'Representada';
                  const invNum = comm.invoiceNumber || comm.factoryInvoiceNumber;
                  const commVal = comm.confirmedCommissionAmount || comm.confirmedAmount || comm.commissionAmount || 0;
                  const payDate = comm.paymentDate || comm.actualPaymentDate || comm.expectedPaymentDate || '-';
                  const baseAmount = comm.invoicedAmount || comm.orderAmount || 0;

                  return (
                    <tr key={comm.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-bold text-indigo-700 font-mono">
                        {comm.orderNumber}
                        {invNum && (
                          <span className="block text-[10px] text-slate-400 font-normal">NF: {invNum}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {repName}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        R$ {baseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {comm.commissionPercentage}%
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700 text-sm">
                        R$ {commVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {payDate}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(comm.status as RepresentativeCommissionStatus)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {comm.status === 'CONFIRMADA' && (
                            <button
                              onClick={() => onSendToReceivable(comm.id, comm.expectedPaymentDate || new Date().toISOString().substring(0, 10))}
                              className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200"
                              title="Gerar título no Contas a Receber"
                            >
                              Liberar p/ Receber
                            </button>
                          )}
                          {(comm.status === 'A_RECEBER' || comm.status === 'CONFIRMADA') && (
                            <button
                              onClick={() => onSettleCommission(comm.id, commVal, new Date().toISOString().substring(0, 10))}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200"
                              title="Registrar pagamento recebido"
                            >
                              Dar Baixa
                            </button>
                          )}
                          {comm.status === 'RECEBIDA' && (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pago em {payDate}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
