/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — TELA DE PEDIDOS DE REPRESENTAÇÃO COMERCIAL (RepresentativeOrdersView)
 * Identificador único 'REP-000123', fluxo de status completo e vinculação 1:N com pedidos da fábrica
 */

import React, { useState } from 'react';
import {
  RepresentativeOrder,
  RepresentativeOrderStatus,
  RepresentedCompany,
  RepresentativeFactoryOrder,
  FactoryInvoice,
  Client,
  Part,
  AppDatabase,
  User,
  CompanyInfo,
} from '../types';
import {
  Plus,
  Search,
  Filter,
  Send,
  CheckCircle2,
  Clock,
  Truck,
  FileCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  Share2,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  UserCheck,
  Layers,
  Calendar,
} from 'lucide-react';

interface RepresentativeOrdersViewProps {
  orders: RepresentativeOrder[];
  representedCompanies: RepresentedCompany[];
  factoryOrders?: RepresentativeFactoryOrder[];
  factoryInvoices?: FactoryInvoice[];
  clients: Client[];
  parts: Part[];
  user: User;
  currentCompany?: CompanyInfo;
  db: AppDatabase;
  onSaveOrder: (order: RepresentativeOrder) => void;
  onUpdateStatus: (orderId: string, newStatus: RepresentativeOrderStatus, notes?: string) => void;
  onAddFactoryOrder?: (factoryOrder: RepresentativeFactoryOrder) => void;
}

export const RepresentativeOrdersView: React.FC<RepresentativeOrdersViewProps> = ({
  orders,
  representedCompanies,
  factoryOrders = [],
  factoryInvoices = [],
  clients,
  parts,
  user,
  currentCompany,
  db,
  onSaveOrder,
  onUpdateStatus,
  onAddFactoryOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [representedFilter, setRepresentedFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Modal de Criação de Pedido
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRepresentedId, setSelectedRepresentedId] = useState(representedCompanies[0]?.id || '');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('28/56 dias direto com a fábrica');
  const [carrierName, setCarrierName] = useState('');
  const [freightType, setFreightType] = useState<'CIF' | 'FOB'>('CIF');
  const [orderNotes, setOrderNotes] = useState('');
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    tablePrice: number;
    discountPercentage: number;
    commissionPercentage: number;
  }>>([
    { description: 'Jogo de Amortecedores Dianteiros', quantity: 20, tablePrice: 450, discountPercentage: 0, commissionPercentage: 5 },
    { description: 'Pastilhas de Freio Cerâmica', quantity: 50, tablePrice: 160, discountPercentage: 0, commissionPercentage: 5 },
    { description: 'Kits de Correia Dentada & Tensor', quantity: 15, tablePrice: 200, discountPercentage: 0, commissionPercentage: 5 },
  ]);

  // Modal de Adicionar Pedido da Fábrica (1:N)
  const [factoryOrderModalOrderId, setFactoryOrderModalOrderId] = useState<string | null>(null);
  const [newFactoryOrderNumber, setNewFactoryOrderNumber] = useState('');
  const [newFactoryOrderAmount, setNewFactoryOrderAmount] = useState<number>(0);
  const [newFactoryOrderStatus, setNewFactoryOrderStatus] = useState<'open' | 'expedition' | 'invoiced'>('open');

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.representedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.clientCnpjCpf && o.clientCnpjCpf.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesRepresented = representedFilter === 'all' || o.representedId === representedFilter;

    return matchesSearch && matchesStatus && matchesRepresented;
  });

  const getStatusBadge = (status: RepresentativeOrderStatus) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">Rascunho</span>;
      case 'sent_to_factory':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">Enviado à Fábrica</span>;
      case 'received_by_factory':
      case 'factory_confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">Confirmado Fábrica</span>;
      case 'processing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Em Processamento</span>;
      case 'factory_order_generated':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">Pedido Fábrica Gerado</span>;
      case 'in_expedition':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300">Em Expedição</span>;
      case 'invoiced_partial':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Faturado Parcial</span>;
      case 'invoiced_total':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Faturado Total</span>;
      case 'commission_pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-300">Comissão a Receber</span>;
      case 'commission_received':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold">Comissão Recebida</span>;
      case 'canceled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">Cancelado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const represented = representedCompanies.find(r => r.id === selectedRepresentedId);
    const client = clients.find(c => c.id === selectedClientId);

    if (!represented || !client) {
      alert('Selecione a representada e o cliente.');
      return;
    }

    // Calcula subtotal e comissão
    let subtotal = 0;
    let estimatedTotalCommission = 0;

    const orderItems = items.map((it, idx) => {
      const unitPrice = it.tablePrice * (1 - (it.discountPercentage || 0) / 100);
      const totalPrice = unitPrice * it.quantity;
      const commissionAmount = (totalPrice * (it.commissionPercentage || 5)) / 100;
      subtotal += totalPrice;
      estimatedTotalCommission += commissionAmount;

      return {
        id: `ITEM-${idx + 1}`,
        description: it.description,
        quantity: it.quantity,
        tablePrice: it.tablePrice,
        discountPercentage: it.discountPercentage,
        unitPrice,
        totalPrice,
        commissionPercentage: it.commissionPercentage,
        commissionAmount,
      };
    });

    const newOrder: RepresentativeOrder = {
      id: `REP-ORD-${Date.now()}`,
      companyId: user.companyId || 'default',
      orderNumber: `REP-${String(orders.length + 123).padStart(6, '0')}`,
      representedId: represented.id,
      representedName: represented.tradeName || represented.corporateName,
      clientId: client.id,
      clientName: client.name,
      clientCnpjCpf: client.cpfCnpj || client.cpf || client.document || '',
      orderDate: new Date().toISOString().substring(0, 10),
      paymentCondition,
      carrierName,
      freightType,
      items: orderItems,
      subtotal,
      totalDiscount: 0,
      totalOrderAmount: subtotal,
      commissionPercentage: represented.defaultCommissionPercentage || 5,
      commissionAmount: estimatedTotalCommission,
      estimatedTotalCommission,
      status: 'sent_to_factory',
      notes: orderNotes,
      createdBy: user.name || user.username,
      createdAt: new Date().toISOString(),
    };

    onSaveOrder(newOrder);
    setShowCreateModal(false);
  };

  const handleAddFactoryOrderSubmit = () => {
    if (!factoryOrderModalOrderId || !newFactoryOrderNumber.trim()) return;

    const targetOrder = orders.find(o => o.id === factoryOrderModalOrderId);
    if (!targetOrder) return;

    const fo: RepresentativeFactoryOrder = {
      id: `FO-${Date.now()}`,
      companyId: targetOrder.companyId,
      representativeOrderId: targetOrder.id,
      representativeOrderNumber: targetOrder.orderNumber,
      representedCompanyId: targetOrder.representedId,
      representedCompanyName: targetOrder.representedName,
      factoryOrderNumber: newFactoryOrderNumber.trim(),
      orderDate: new Date().toISOString().substring(0, 10),
      customer: targetOrder.clientName,
      customerCnpjCpf: targetOrder.clientCnpjCpf,
      totalValue: newFactoryOrderAmount || targetOrder.totalOrderAmount,
      status: newFactoryOrderStatus,
      createdAt: new Date().toISOString(),
    };

    if (onAddFactoryOrder) {
      onAddFactoryOrder(fo);
    }

    // Adiciona número de pedido à lista do pedido pai se não estiver presente
    const updatedNumbers = Array.from(new Set([...(targetOrder.factoryOrderNumbers || []), fo.factoryOrderNumber]));
    onSaveOrder({
      ...targetOrder,
      factoryOrderNumbers: updatedNumbers,
      status: targetOrder.status === 'sent_to_factory' ? 'factory_order_generated' : targetOrder.status,
    });

    setFactoryOrderModalOrderId(null);
    setNewFactoryOrderNumber('');
    setNewFactoryOrderAmount(0);
  };

  const handleShareWhatsApp = (order: RepresentativeOrder) => {
    const text = `*PEDIDO DE REPRESENTAÇÃO ${order.orderNumber}*\n` +
      `Fábrica: ${order.representedName}\n` +
      `Cliente: ${order.clientName} (${order.clientCnpjCpf})\n` +
      `Valor Total: R$ ${order.totalOrderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `Condição de Pagamento: ${order.paymentCondition}\n` +
      `Frete: ${order.freightType || 'CIF'} - Transportadora: ${order.carrierName || 'Padrão'}\n\n` +
      `Itens Solicitados:\n` +
      order.items.map(it => `• ${it.quantity}x ${it.description} - R$ ${it.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n');

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Pedidos de Representação Comercial
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão do ciclo completo de pedidos: do envio à fábrica à conciliação e comissionamento.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido de Representação
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número do pedido (ex: REP-000123), cliente, CNPJ ou fábrica..."
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
            <option value="draft">Rascunho</option>
            <option value="sent_to_factory">Enviado à Fábrica</option>
            <option value="factory_confirmed">Confirmado Fábrica</option>
            <option value="in_expedition">Em Expedição</option>
            <option value="invoiced_partial">Faturado Parcial</option>
            <option value="invoiced_total">Faturado Total</option>
            <option value="commission_pending">Comissão a Receber</option>
            <option value="commission_received">Comissão Recebida</option>
            <option value="canceled">Cancelado</option>
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

      {/* Orders List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Nenhum pedido de representação encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Novo Pedido de Representação" para iniciar o registro.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredOrders.map(order => {
              const isExpanded = expandedOrderId === order.id;
              const linkedFactoryOrders = factoryOrders.filter(fo => fo.representativeOrderId === order.id);
              const linkedInvoices = factoryInvoices.filter(inv => inv.representativeOrderId === order.id);

              return (
                <div key={order.id} className="transition-colors hover:bg-slate-50/50">
                  
                  {/* Linha Principal do Pedido */}
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-indigo-600 font-mono tracking-wider">
                          {order.orderNumber}
                        </span>
                        {getStatusBadge(order.status)}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {order.orderDate}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          {order.clientName}
                          <span className="text-slate-400 font-normal">({order.clientCnpjCpf})</span>
                        </div>
                        <div className="text-slate-600 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          Fábrica: <strong className="text-slate-800">{order.representedName}</strong>
                        </div>
                      </div>

                      {/* Pedidos da Fábrica 1:N vinculados */}
                      {linkedFactoryOrders.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-800">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-semibold">Pedidos Fábrica (1:N):</span>
                          {linkedFactoryOrders.map(fo => (
                            <span key={fo.id} className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 font-mono">
                              #{fo.factoryOrderNumber} (R$ {fo.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Valores e Botões de Ação */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 pt-3 lg:pt-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Valor do Pedido</div>
                        <div className="text-base font-black text-slate-900">
                          R$ {order.totalOrderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold">
                          Comissão prevista: R$ {order.estimatedTotalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({order.commissionPercentage || 5}%)
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Ação rápida de fluxo de status */}
                        {order.status === 'draft' && (
                          <button
                            onClick={() => onUpdateStatus(order.id, 'sent_to_factory')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" /> Enviar Fábrica
                          </button>
                        )}

                        {order.status === 'sent_to_factory' && (
                          <button
                            onClick={() => onUpdateStatus(order.id, 'factory_order_generated')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold border border-purple-200 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado Fábrica
                          </button>
                        )}

                        {/* Botão Vincular Pedido Fábrica 1:N */}
                        <button
                          onClick={() => {
                            setFactoryOrderModalOrderId(order.id);
                            setNewFactoryOrderNumber('');
                            setNewFactoryOrderAmount(order.totalOrderAmount);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold border border-amber-200"
                          title="Adicionar desdobramento / pedido interno da fábrica"
                        >
                          + Pedido Fábrica
                        </button>

                        <button
                          onClick={() => handleShareWhatsApp(order)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                          title="Compartilhar via WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                  </div>

                  {/* Detalhes Expandidos com Itens e Rastreamento */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 bg-slate-50/70 border-t border-slate-100 space-y-4">
                      
                      {/* Tabela de Itens */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Itens do Pedido ({order.items.length})
                        </h4>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2">Item / Descrição</th>
                                <th className="px-3 py-2 text-center">Qtd</th>
                                <th className="px-3 py-2 text-right">Preço Tabela</th>
                                <th className="px-3 py-2 text-right">Preço Unit.</th>
                                <th className="px-3 py-2 text-right">Total Item</th>
                                <th className="px-3 py-2 text-right">% Com.</th>
                                <th className="px-3 py-2 text-right">Comissão</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {order.items.map((it, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-medium text-slate-800">{it.description}</td>
                                  <td className="px-3 py-2 text-center text-slate-600">{it.quantity}</td>
                                  <td className="px-3 py-2 text-right text-slate-500">
                                    R$ {it.tablePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-700 font-medium">
                                    R$ {it.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-900 font-bold">
                                    R$ {it.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-500">{it.commissionPercentage}%</td>
                                  <td className="px-3 py-2 text-right text-emerald-700 font-semibold">
                                    R$ {it.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Dados Comerciais e Logísticos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-400">Condição Comercial:</span>
                          <div className="font-semibold text-slate-800">{order.paymentCondition || 'Padrão'}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Frete & Transportadora:</span>
                          <div className="font-semibold text-slate-800">
                            {order.freightType || 'CIF'} - {order.carrierName || 'A definir'}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Criado por:</span>
                          <div className="font-semibold text-slate-800">{order.createdBy} em {order.createdAt.substring(0, 10)}</div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Adicionar Pedido da Fábrica (1:N) */}
      {factoryOrderModalOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                Vincular Pedido da Fábrica (1:N)
              </h3>
              <button onClick={() => setFactoryOrderModalOrderId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Um pedido do MotorDesk pode ser desdobrado em múltiplos pedidos internos na representada/fábrica.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do Pedido Interno da Fábrica (ex: 45871) *:
              </label>
              <input
                type="text"
                value={newFactoryOrderNumber}
                onChange={(e) => setNewFactoryOrderNumber(e.target.value)}
                placeholder="Ex: 45871"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Atribuído a Este Pedido (R$):
              </label>
              <input
                type="number"
                step="0.01"
                value={newFactoryOrderAmount || ''}
                onChange={(e) => setNewFactoryOrderAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status na Fábrica:</label>
              <select
                value={newFactoryOrderStatus}
                onChange={(e) => setNewFactoryOrderStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
              >
                <option value="open">Aberto na Fábrica</option>
                <option value="expedition">Em Separação / Expedição</option>
                <option value="invoiced">Faturado</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFactoryOrderModalOrderId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddFactoryOrderSubmit}
                disabled={!newFactoryOrderNumber.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                Salvar Vínculo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Novo Pedido de Representação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Novo Pedido de Representação Comercial
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Empresa Representada (Fábrica) *:
                  </label>
                  <select
                    value={selectedRepresentedId}
                    onChange={(e) => setSelectedRepresentedId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    {representedCompanies.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.tradeName || r.corporateName} (Comissão: {r.defaultCommissionPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cliente Comprador *:
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    <option value="">Selecione o cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.cpfCnpj || c.cpf || c.document || 'Sem doc'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condição de Pagamento:</label>
                  <input
                    type="text"
                    value={paymentCondition}
                    onChange={(e) => setPaymentCondition(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Frete:</label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="CIF">CIF (Por conta do remetente/fábrica)</option>
                    <option value="FOB">FOB (Por conta do cliente)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transportadora:</label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    placeholder="Nome da transportadora"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Itens */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Itens do Pedido
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].description = e.target.value;
                            setItems(copy);
                          }}
                          placeholder="Descrição da peça"
                          className="w-full px-2 py-1 border border-slate-200 rounded"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].quantity = parseInt(e.target.value) || 1;
                            setItems(copy);
                          }}
                          placeholder="Qtd"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          value={it.tablePrice}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].tablePrice = parseFloat(e.target.value) || 0;
                            setItems(copy);
                          }}
                          placeholder="Preço R$"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                        />
                      </div>
                      <div className="col-span-2 text-right font-bold text-slate-800">
                        R$ {(it.quantity * it.tablePrice).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  Gravar & Enviar à Fábrica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
