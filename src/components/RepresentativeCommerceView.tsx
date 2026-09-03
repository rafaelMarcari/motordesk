/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — MÓDULO COMÉRCIO REPRESENTANTE
 * Gestão de fábricas representadas, emissão e espelho de pedidos para fábrica,
 * conferência de faturamento, controle e conciliação de comissões.
 */

import React, { useState, useMemo } from 'react';
import { 
  AppDatabase, 
  User, 
  RepresentedCompany, 
  RepresentativeOrder, 
  RepresentativeOrderItem, 
  RepresentativeCommission,
  AccountReceivable
} from '../types';
import { 
  Building, 
  ShoppingBag, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Send, 
  Plus, 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Download, 
  Share2, 
  Check, 
  AlertCircle,
  Building2,
  FileCheck,
  Percent,
  X
} from 'lucide-react';
import { buildWhatsAppLink } from '../utils/notificationEngine';

interface RepresentativeCommerceViewProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: User;
  activeCompanyId: string;
}

export const RepresentativeCommerceView: React.FC<RepresentativeCommerceViewProps> = ({
  db,
  setDb,
  currentUser,
  activeCompanyId
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'principals' | 'commissions' | 'reconciliation'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showNewPrincipalModal, setShowNewPrincipalModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<RepresentativeOrder | null>(null);

  // Principals list
  const principals = useMemo(() => {
    return (db.representedCompanies || []).filter(p => (p.companyId || 'comp-1') === activeCompanyId);
  }, [db.representedCompanies, activeCompanyId]);

  // Orders list
  const orders = useMemo(() => {
    return (db.representativeOrders || []).filter(o => {
      const matchComp = (o.companyId || 'comp-1') === activeCompanyId;
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch = !searchTerm || 
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.representedName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchComp && matchStatus && matchSearch;
    });
  }, [db.representativeOrders, activeCompanyId, statusFilter, searchTerm]);

  // Commissions list
  const commissions = useMemo(() => {
    return (db.representativeCommissions || []).filter(c => (c.companyId || 'comp-1') === activeCompanyId);
  }, [db.representativeCommissions, activeCompanyId]);

  // Summary KPI Calculations
  const stats = useMemo(() => {
    const totalOrdersAmount = orders.reduce((acc, o) => acc + (o.totalOrderAmount || 0), 0);
    const totalCommissionsExpected = orders.reduce((acc, o) => acc + (o.estimatedTotalCommission || 0), 0);
    const totalCommissionsReceived = commissions.filter(c => c.status === 'received').reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
    const totalCommissionsPending = totalCommissionsExpected - totalCommissionsReceived;

    return {
      totalOrdersAmount,
      totalCommissionsExpected,
      totalCommissionsReceived,
      totalCommissionsPending: totalCommissionsPending > 0 ? totalCommissionsPending : 0
    };
  }, [orders, commissions]);

  // Form states for New Principal
  const [principalForm, setPrincipalForm] = useState({
    tradeName: '',
    corporateName: '',
    cnpj: '',
    contactName: '',
    email: '',
    phone: '',
    defaultCommissionPercentage: 5,
    leadTimeDays: 7
  });

  // Form states for New Order
  const [orderForm, setOrderForm] = useState({
    principalId: '',
    clientId: '',
    clientName: '',
    clientCnpjCpf: '',
    clientPhone: '',
    paymentTerms: '28/42/56 dias',
    carrier: '',
    notes: '',
    items: [
      {
        id: 'item-1',
        productCode: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        commissionPercentage: 5,
        commissionAmount: 0
      }
    ]
  });

  // Create Principal Handler
  const handleSavePrincipal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalForm.tradeName.trim()) {
      alert('Informe o Nome Fantasia da fábrica representada.');
      return;
    }

    const newP: RepresentedCompany = {
      id: `prin-${Date.now()}`,
      companyId: activeCompanyId,
      corporateName: principalForm.corporateName || principalForm.tradeName,
      tradeName: principalForm.tradeName,
      cnpj: principalForm.cnpj,
      contactPerson: principalForm.contactName,
      email: principalForm.email,
      phone: principalForm.phone,
      whatsapp: principalForm.phone,
      defaultCommissionPercentage: Number(principalForm.defaultCommissionPercentage) || 5,
      commissionPaymentRule: 'UPON_INVOICE',
      commissionPaymentTerms: `${Number(principalForm.leadTimeDays) || 30} dias`,
      active: true,
      createdAt: new Date().toISOString()
    };

    setDb(prev => ({
      ...prev,
      representedCompanies: [...(prev.representedCompanies || []), newP]
    }));

    setShowNewPrincipalModal(false);
    setPrincipalForm({
      tradeName: '',
      corporateName: '',
      cnpj: '',
      contactName: '',
      email: '',
      phone: '',
      defaultCommissionPercentage: 5,
      leadTimeDays: 7
    });
  };

  // Add Item to Order Form
  const handleAddItemToOrder = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}`,
          productCode: '',
          productName: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          commissionPercentage: 5,
          commissionAmount: 0
        }
      ]
    }));
  };

  // Update item field
  const handleUpdateOrderItem = (index: number, field: string, value: any) => {
    setOrderForm(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };
      
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const commPct = Number(item.commissionPercentage) || 0;

      item.totalPrice = qty * price;
      item.commissionAmount = (item.totalPrice * commPct) / 100;
      
      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  // Save Order Handler
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const principal = principals.find(p => p.id === orderForm.principalId);
    if (!principal) {
      alert('Selecione uma fábrica representada.');
      return;
    }
    if (!orderForm.clientName.trim()) {
      alert('Informe o nome ou razão social do cliente comprador.');
      return;
    }

    const totalAmount = orderForm.items.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
    const totalComm = orderForm.items.reduce((acc, i) => acc + (i.commissionAmount || 0), 0);
    const orderNum = `PED-${Date.now().toString().slice(-6)}`;

    const newOrder: RepresentativeOrder = {
      id: `rep-ord-${Date.now()}`,
      companyId: activeCompanyId,
      orderNumber: orderNum,
      orderDate: new Date().toISOString().substring(0, 10),
      representedId: principal.id,
      representedName: principal.tradeName,
      clientId: orderForm.clientId || `cli-${Date.now()}`,
      clientName: orderForm.clientName,
      clientCnpjCpf: orderForm.clientCnpjCpf,
      status: 'sent_to_factory',
      paymentCondition: orderForm.paymentTerms || '30 dias',
      carrierName: orderForm.carrier,
      freightType: 'CIF',
      notes: orderForm.notes,
      items: orderForm.items.map(item => ({
        id: item.id || `item-${Date.now()}-${Math.random()}`,
        description: item.productName || 'Produto',
        quantity: Number(item.quantity) || 1,
        tablePrice: Number(item.unitPrice) || 0,
        discountPercentage: 0,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        commissionPercentage: Number(item.commissionPercentage) || 5,
        commissionAmount: Number(item.commissionAmount) || 0
      })),
      subtotal: totalAmount,
      totalDiscount: 0,
      totalOrderAmount: totalAmount,
      estimatedTotalCommission: totalComm,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Auto-create Commission record in 'receivable'
    const newCommission: RepresentativeCommission = {
      id: `comm-${Date.now()}`,
      companyId: activeCompanyId,
      representedId: principal.id,
      representedName: principal.tradeName,
      orderId: newOrder.id,
      orderNumber: orderNum,
      factoryInvoiceNumber: 'PENDENTE',
      clientId: newOrder.clientId,
      clientName: orderForm.clientName,
      invoicedAmount: totalAmount,
      commissionPercentage: totalAmount > 0 ? (totalComm / totalAmount) * 100 : 5,
      commissionAmount: totalComm,
      status: 'receivable',
      expectedPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      notes: `Gerada automaticamente pelo pedido ${orderNum}`,
      createdAt: new Date().toISOString()
    };

    setDb(prev => ({
      ...prev,
      representativeOrders: [newOrder, ...(prev.representativeOrders || [])],
      representativeCommissions: [newCommission, ...(prev.representativeCommissions || [])]
    }));

    setShowNewOrderModal(false);
  };

  // Dispatch Order Summary via WhatsApp to Principal Factory
  const handleSendOrderToFactoryWhatsApp = (order: RepresentativeOrder) => {
    const principal = principals.find(p => p.id === order.representedId);
    const itemsSummary = order.items
      .map(i => `• ${i.quantity}x ${i.description} (R$ ${Number(i.unitPrice).toFixed(2)}) = R$ ${Number(i.totalPrice).toFixed(2)}`)
      .join('\n');

    const msg = `*PEDIDO DE COMPRA - REPRESENTAÇÃO COMERCIAL*\n\n` +
      `🏢 *Fábrica:* ${order.representedName}\n` +
      `📋 *Pedido nº:* ${order.orderNumber}\n` +
      `📅 *Data:* ${new Date(order.orderDate).toLocaleDateString('pt-BR')}\n` +
      `👤 *Cliente:* ${order.clientName} (CNPJ/CPF: ${order.clientCnpjCpf || 'Não informado'})\n` +
      `💳 *Condição:* ${order.paymentCondition || 'Padrão'}\n\n` +
      `📦 *Itens Solicitados:*\n${itemsSummary}\n\n` +
      `💰 *Total Faturável:* R$ ${Number(order.totalOrderAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
      `Favor acusar recebimento e confirmar previsão de faturamento.\n\n` +
      `Representante: *${currentUser.name}*`;

    const url = buildWhatsAppLink(principal?.phone || '', msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Settle commission -> Generate account receivable / cash inflow
  const handleSettleCommission = (commission: RepresentativeCommission) => {
    if (window.confirm(`Confirmar recebimento da comissão de R$ ${commission.commissionAmount.toFixed(2)} da fábrica ${commission.representedName}?`)) {
      // Create Account Receivable in 'paid' status
      const newRec: AccountReceivable = {
        id: `rec-comm-${Date.now()}`,
        code: `COM-${commission.orderNumber}`,
        companyId: activeCompanyId,
        clientId: commission.representedId,
        clientName: `Comissão: ${commission.representedName}`,
        title: `Comissão Fábrica: ${commission.representedName} - Pedido ${commission.orderNumber}`,
        totalAmount: commission.commissionAmount,
        paidAmount: commission.commissionAmount,
        remainingAmount: 0,
        installmentsCount: 1,
        installments: [],
        dueDate: new Date().toISOString().substring(0, 10),
        status: 'paid',
        paymentMethod: 'pix',
        createdAt: new Date().toISOString()
      };

      setDb(prev => ({
        ...prev,
        accountsReceivable: [newRec, ...(prev.accountsReceivable || [])],
        representativeCommissions: (prev.representativeCommissions || []).map(c => {
          if (c.id === commission.id) {
            return {
              ...c,
              status: 'received' as const,
              actualPaymentDate: new Date().toISOString().substring(0, 10)
            };
          }
          return c;
        })
      }));

      alert('Comissão liquidada com sucesso e integrada ao Fluxo de Caixa!');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in" id="representative-commerce-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight font-display">Comércio Representante</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Fábricas & Comissões
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Emissão de pedidos para fábricas parceiras, conferência de faturamento e controle integrado de comissões
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPrincipalModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Fábrica
          </button>
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido de Fábrica
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Vendas Representadas (Total)</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            R$ {stats.totalOrdersAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{orders.length} pedidos emitidos</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Comissões Previstas</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            R$ {stats.totalCommissionsExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Total a comissionar</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Comissões Recebidas</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            R$ {stats.totalCommissionsReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-600/80 font-medium mt-0.5 block">Liquidadas em caixa</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Comissões Pendentes</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            R$ {stats.totalCommissionsPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-amber-600/80 font-medium mt-0.5 block">A receber das fábricas</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pedidos Emitidos ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('principals')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'principals' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Fábricas Parceiras ({principals.length})
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'commissions' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Controle de Comissões ({commissions.length})
        </button>
      </div>

      {/* TAB 1: ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, pedido ou fábrica..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Todos os Status</option>
              <option value="enviado">Enviado</option>
              <option value="confirmado">Confirmado</option>
              <option value="faturado_total">Faturado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-xs">Nenhum pedido de representação encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nº Pedido</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Fábrica</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-right">Comissão (%)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-600">{order.orderNumber}</td>
                      <td className="p-3 text-slate-500">{new Date(order.orderDate).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 font-semibold text-slate-800">{order.representedName}</td>
                      <td className="p-3 text-slate-700">{order.clientName}</td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        R$ {Number(order.totalOrderAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-emerald-600 font-semibold">
                        R$ {Number(order.estimatedTotalCommission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({order.totalOrderAmount > 0 ? ((order.estimatedTotalCommission / order.totalOrderAmount) * 100).toFixed(1) : '5.0'}%)
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleSendOrderToFactoryWhatsApp(order)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition"
                            title="Enviar espelho para a fábrica no WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
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
      )}

      {/* TAB 2: PRINCIPALS (FÁBRICAS) */}
      {activeTab === 'principals' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {principals.map(p => (
            <div key={p.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">{p.tradeName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {p.defaultCommissionPercentage}% Comis.
                </span>
              </div>
              <p className="text-xs text-slate-500">{p.corporateName}</p>
              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <div>CNPJ: <strong>{p.cnpj || 'Não informado'}</strong></div>
                <div>Contato: <strong>{p.contactPerson || 'Comercial'}</strong></div>
                <div>Telefone: <strong>{p.phone || p.whatsapp || '-'}</strong></div>
                <div>Condições: <strong>{p.commissionPaymentTerms || p.commercialConditions || 'Padrão'}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: COMMISSIONS CONTROL */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Comissões de Representação Comercial</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Fábrica</th>
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Valor Pedido</th>
                  <th className="p-3 text-right">Comissão</th>
                  <th className="p-3">Previsão Pgto</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Liquidação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{c.representedName}</td>
                    <td className="p-3 font-mono text-blue-600">{c.orderNumber}</td>
                    <td className="p-3 text-slate-700">{c.clientName}</td>
                    <td className="p-3 text-right text-slate-600">
                      R$ {Number(c.invoicedAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      R$ {Number(c.commissionAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-slate-500">
                      {c.expectedPaymentDate ? new Date(c.expectedPaymentDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status === 'received' ? 'RECEBIDA' : 'A RECEBER'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {c.status !== 'received' ? (
                        <button
                          onClick={() => handleSettleCommission(c)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition"
                        >
                          Liquidar
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Pago
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA FÁBRICA REPRESENTADA */}
      {showNewPrincipalModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Cadastrar Fábrica Representada</h3>
              <button onClick={() => setShowNewPrincipalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrincipal} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Nome Fantasia da Fábrica *</label>
                <input
                  type="text"
                  required
                  value={principalForm.tradeName}
                  onChange={e => setPrincipalForm(prev => ({ ...prev, tradeName: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  placeholder="Ex: Tramontina Ferramentas"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600">Razão Social</label>
                <input
                  type="text"
                  value={principalForm.corporateName}
                  onChange={e => setPrincipalForm(prev => ({ ...prev, corporateName: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600">CNPJ</label>
                  <input
                    type="text"
                    value={principalForm.cnpj}
                    onChange={e => setPrincipalForm(prev => ({ ...prev, cnpj: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Comissão Padrão (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={principalForm.defaultCommissionPercentage}
                    onChange={e => setPrincipalForm(prev => ({ ...prev, defaultCommissionPercentage: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={principalForm.phone}
                    onChange={e => setPrincipalForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">E-mail Comercial</label>
                  <input
                    type="email"
                    value={principalForm.email}
                    onChange={e => setPrincipalForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewPrincipalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Salvar Fábrica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PEDIDO DE REPRESENTAÇÃO */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Emitir Pedido para Fábrica Representada</h3>
              <button onClick={() => setShowNewOrderModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Fábrica Representada *</label>
                  <select
                    required
                    value={orderForm.principalId}
                    onChange={e => setOrderForm(prev => ({ ...prev, principalId: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Selecione a fábrica parceira...</option>
                    {principals.map(p => (
                      <option key={p.id} value={p.id}>{p.tradeName} ({p.defaultCommissionPercentage}%)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Cliente Comprador *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome ou Razão Social do Comprador"
                    value={orderForm.clientName}
                    onChange={e => setOrderForm(prev => ({ ...prev, clientName: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600">CNPJ/CPF Cliente</label>
                  <input
                    type="text"
                    value={orderForm.clientCnpjCpf}
                    onChange={e => setOrderForm(prev => ({ ...prev, clientCnpjCpf: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Telefone Cliente</label>
                  <input
                    type="text"
                    value={orderForm.clientPhone}
                    onChange={e => setOrderForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Condição de Pagamento</label>
                  <input
                    type="text"
                    value={orderForm.paymentTerms}
                    onChange={e => setOrderForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Itens do Pedido</span>
                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {orderForm.items.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <label className="text-[10px] text-slate-500">Produto / Descrição</label>
                        <input
                          type="text"
                          required
                          placeholder="Descrição da peça ou insumo"
                          value={item.productName}
                          onChange={e => handleUpdateOrderItem(idx, 'productName', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500">Qtd</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={e => handleUpdateOrderItem(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500">Preço Unit. (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.unitPrice}
                          onChange={e => handleUpdateOrderItem(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                      <div className="col-span-3 text-right">
                        <label className="text-[10px] text-slate-500 block">Subtotal</label>
                        <span className="font-bold text-slate-800">
                          R$ {(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Confirmar e Gerar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
