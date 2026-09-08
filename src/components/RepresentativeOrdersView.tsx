/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — TELA DE PEDIDOS DE REPRESENTAÇÃO COMERCIAL (RepresentativeOrdersView)
 * - Navegação Mensal estilo Procfy (Correr pelos meses < SET/2026 >)
 * - Cards de Resumo & Comparativo de Faturamento, Comissões e Indexação 1:N
 * - Campo de Indexador / Chave de Ligação entre Pedido Enviado e Recebido da Fábrica
 * - Alerta Visual com Cor Especial para pedidos sem vínculo / necessitando análise
 * - Visão de Confronto com a Planilha da Representada (Pedido, Cliente, Valores, Impostos)
 * - Desdobramento 1:N (um pedido enviado faturado em múltiplos pedidos/notas pela fábrica)
 * - Atalhos diretos para Contas a Pagar e Contas a Receber
 */

import React, { useState, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  UserCheck,
  Layers,
  Calendar,
  Link2,
  Unlink,
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  UploadCloud,
  Check,
  RefreshCw,
  HelpCircle,
  Percent,
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
  onNavigateToView?: (viewId: any) => void;
  onNavigateToTab?: (tabId: string) => void;
}

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const MONTH_ABBR = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

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
  onNavigateToView,
  onNavigateToTab,
}) => {
  // 1. Controle de Competência / Correr pelos Meses
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState<'month' | 'all'>('month');

  // Sub-abas internas da visão de pedidos
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'spreadsheet_confrontation' | 'monthly_comparison'>('orders');

  // Filtros de busca e status
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [representedFilter, setRepresentedFilter] = useState<string>('all');
  const [onlyNeedsReview, setOnlyNeedsReview] = useState(false);

  // Expansão de itens na lista
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Modal Novo Pedido Enviado
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRepresentedId, setSelectedRepresentedId] = useState(representedCompanies[0]?.id || '');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('28/56 dias direto com a fábrica');
  const [carrierName, setCarrierName] = useState('');
  const [freightType, setFreightType] = useState<'CIF' | 'FOB'>('CIF');
  const [customIndexCode, setCustomIndexCode] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [items, setItems] = useState([
    { description: 'Amortecedores Dianteiros Pressurizados', quantity: 20, tablePrice: 400, discountPercentage: 0, commissionPercentage: 5 },
    { description: 'Kits de Pastilhas de Freio Cerâmica', quantity: 35, tablePrice: 200, discountPercentage: 0, commissionPercentage: 5 },
  ]);

  // Modal Rápido de Indexação / Ligar Pedido (1:N)
  const [indexingModalOrder, setIndexingModalOrder] = useState<RepresentativeOrder | null>(null);
  const [indexingFactoryOrderNumber, setIndexingFactoryOrderNumber] = useState('');
  const [indexingInvoiceNumber, setIndexingInvoiceNumber] = useState('');
  const [indexingAmount, setIndexingAmount] = useState<number>(0);
  const [indexingTaxesAmount, setIndexingTaxesAmount] = useState<number>(0);
  const [indexingExpectedPaymentDate, setIndexingExpectedPaymentDate] = useState('');
  const [indexingNotes, setIndexingNotes] = useState('');

  // Estado para planilha de confronto interativa
  const [confrontationRows, setConfrontationRows] = useState<Array<{
    id: string;
    factoryOrderNumber: string;
    indexCode?: string;
    internalOrderNumber?: string;
    clientName: string;
    clientCnpj: string;
    grossAmount: number;
    taxesAmount: number;
    netAmount: number;
    expectedDate: string;
    commissionPercent: number;
    commissionAmount: number;
    status: 'INDEXADO' | 'PENDENTE_ANALISE' | 'DIVERGENCIA';
  }>>(() => [
    {
      id: 'row-1',
      factoryOrderNumber: '45871',
      indexCode: 'IND-2026-081',
      internalOrderNumber: 'REP-000123',
      clientName: 'Auto Peças Silva & Filhos Ltda',
      clientCnpj: '12.345.678/0001-90',
      grossAmount: 8000,
      taxesAmount: 960,
      netAmount: 7040,
      expectedDate: '2026-09-30',
      commissionPercent: 5,
      commissionAmount: 400,
      status: 'INDEXADO',
    },
    {
      id: 'row-2',
      factoryOrderNumber: '45872',
      indexCode: 'IND-2026-081',
      internalOrderNumber: 'REP-000123',
      clientName: 'Auto Peças Silva & Filhos Ltda',
      clientCnpj: '12.345.678/0001-90',
      grossAmount: 7000,
      taxesAmount: 840,
      netAmount: 6160,
      expectedDate: '2026-10-05',
      commissionPercent: 5,
      commissionAmount: 350,
      status: 'INDEXADO',
    },
    {
      id: 'row-3',
      factoryOrderNumber: '45873',
      indexCode: 'IND-2026-081',
      internalOrderNumber: 'REP-000123',
      clientName: 'Auto Peças Silva & Filhos Ltda',
      clientCnpj: '12.345.678/0001-90',
      grossAmount: 5000,
      taxesAmount: 600,
      netAmount: 4400,
      expectedDate: '2026-10-10',
      commissionPercent: 5,
      commissionAmount: 250,
      status: 'INDEXADO',
    },
    {
      id: 'row-4',
      factoryOrderNumber: '46102',
      indexCode: '',
      internalOrderNumber: '',
      clientName: 'Centro Automotivo Paulista S/A',
      clientCnpj: '44.555.666/0001-11',
      grossAmount: 14500,
      taxesAmount: 1740,
      netAmount: 12760,
      expectedDate: '2026-10-15',
      commissionPercent: 6,
      commissionAmount: 870,
      status: 'PENDENTE_ANALISE', // Sem pedido associado!
    },
  ]);

  // Navegação pelos meses
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleGoToCurrentMonth = () => {
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth() + 1);
    setViewMode('month');
  };

  // Filtro de pedidos pela competência (ano/mês)
  const monthString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const periodOrders = useMemo(() => {
    if (viewMode === 'all') return orders;
    return orders.filter(o => {
      const d = o.orderDate || o.createdAt || '';
      return d.startsWith(monthString);
    });
  }, [orders, viewMode, monthString]);

  // Verificação de indexação para cada pedido
  const isOrderLinkedToFactory = (order: RepresentativeOrder): boolean => {
    const hasNumbers = order.factoryOrderNumbers && order.factoryOrderNumbers.length > 0;
    const hasSingleNumber = Boolean(order.factoryOrderNumber && order.factoryOrderNumber.trim());
    const hasFactoryOrders = factoryOrders.some(fo => fo.representativeOrderId === order.id);
    return Boolean(hasNumbers || hasSingleNumber || hasFactoryOrders);
  };

  // Pedidos que necessitam de análise (sem número da fábrica vinculado)
  const ordersNeedingReview = useMemo(() => {
    return periodOrders.filter(o => !isOrderLinkedToFactory(o) || o.needsIndexingReview);
  }, [periodOrders, factoryOrders]);

  // Lista final filtrada
  const filteredOrders = useMemo(() => {
    return periodOrders.filter(order => {
      const isLinked = isOrderLinkedToFactory(order);

      if (onlyNeedsReview && isLinked && !order.needsIndexingReview) {
        return false;
      }

      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.indexCode && order.indexCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.clientCnpjCpf && order.clientCnpjCpf.includes(searchTerm)) ||
        order.representedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.factoryOrderNumbers && order.factoryOrderNumbers.some(n => n.includes(searchTerm)));

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesRepresented = representedFilter === 'all' || order.representedId === representedFilter;

      return matchesSearch && matchesStatus && matchesRepresented;
    });
  }, [periodOrders, onlyNeedsReview, searchTerm, statusFilter, representedFilter, factoryOrders]);

  // Métricas do Mês / Procfy Style
  const metrics = useMemo(() => {
    const totalOrdersCount = periodOrders.length;
    const totalExpectedAmount = periodOrders.reduce((sum, o) => sum + (o.totalOrderAmount || 0), 0);
    const totalEstimatedCommission = periodOrders.reduce((sum, o) => sum + (o.estimatedTotalCommission || 0), 0);

    // Soma faturada pelas fábricas no período
    let totalInvoicedByFactory = 0;
    let totalInvoicedCommission = 0;

    periodOrders.forEach(order => {
      const linkedFos = factoryOrders.filter(fo => fo.representativeOrderId === order.id);
      if (linkedFos.length > 0) {
        const sumFos = linkedFos.reduce((acc, fo) => acc + fo.totalValue, 0);
        totalInvoicedByFactory += sumFos;
        const commRate = order.commissionPercentage || 5;
        totalInvoicedCommission += (sumFos * commRate) / 100;
      } else if (order.status === 'invoiced_total' || order.status === 'commission_received') {
        totalInvoicedByFactory += order.totalOrderAmount;
        totalInvoicedCommission += (order.estimatedTotalCommission || 0);
      }
    });

    const invoicedPercent = totalExpectedAmount > 0 ? Math.min(100, Math.round((totalInvoicedByFactory / totalExpectedAmount) * 100)) : 0;
    const commissionPercent = totalEstimatedCommission > 0 ? Math.min(100, Math.round((totalInvoicedCommission / totalEstimatedCommission) * 100)) : 0;

    const unlinkedCount = ordersNeedingReview.length;
    const linkedCount = totalOrdersCount - unlinkedCount;

    return {
      totalOrdersCount,
      totalExpectedAmount,
      totalInvoicedByFactory,
      invoicedPercent,
      totalEstimatedCommission,
      totalInvoicedCommission,
      commissionPercent,
      unlinkedCount,
      linkedCount,
    };
  }, [periodOrders, factoryOrders, ordersNeedingReview]);

  // Submeter Criação de Pedido com Indexador
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const represented = representedCompanies.find(r => r.id === selectedRepresentedId);
    const client = clients.find(c => c.id === selectedClientId);

    if (!represented || !client) {
      alert('Selecione a empresa representada e o cliente.');
      return;
    }

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

    const orderSeq = String(orders.length + 123).padStart(6, '0');
    const orderNumber = `REP-${orderSeq}`;
    const generatedIndexCode = customIndexCode.trim() || `IND-${selectedYear}-${orderSeq.slice(-3)}`;

    const newOrder: RepresentativeOrder = {
      id: `REP-ORD-${Date.now()}`,
      companyId: user.companyId || 'default',
      orderNumber,
      code: orderNumber,
      indexCode: generatedIndexCode, // Chave de indexação enviada à fábrica
      representedId: represented.id,
      representedName: represented.tradeName || represented.corporateName,
      clientId: client.id,
      clientName: client.name,
      clientCnpjCpf: client.cpfCnpj || client.cpf || client.document || '',
      orderDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-05`,
      paymentCondition,
      carrierName,
      freightType,
      items: orderItems,
      subtotal,
      totalDiscount: 0,
      totalOrderAmount: subtotal,
      taxesAmount: subtotal * 0.12, // Estimativa padrão
      commissionPercentage: represented.defaultCommissionPercentage || 5,
      commissionAmount: estimatedTotalCommission,
      estimatedTotalCommission,
      status: 'sent_to_factory',
      factoryOrderNumbers: [], // Começa sem pedido da fábrica vinculado!
      needsIndexingReview: true, // Requer análise quando a fábrica faturar!
      notes: orderNotes,
      createdBy: user.name || user.username,
      createdAt: new Date().toISOString(),
    };

    onSaveOrder(newOrder);
    setShowCreateModal(false);

    // Reseta form
    setCustomIndexCode('');
    setOrderNotes('');
  };

  // Abertura do Modal de Indexação Rápida
  const handleOpenIndexingModal = (order: RepresentativeOrder) => {
    setIndexingModalOrder(order);
    setIndexingFactoryOrderNumber(order.factoryOrderNumber || '');
    setIndexingInvoiceNumber(order.factoryInvoiceNumber || '');
    setIndexingAmount(order.totalOrderAmount || 0);
    setIndexingTaxesAmount(order.taxesAmount || (order.totalOrderAmount * 0.12));
    setIndexingExpectedPaymentDate(new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10));
    setIndexingNotes('');
  };

  // Salvar Indexação e Desdobramento (1:N)
  const handleSaveIndexingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexingModalOrder || !indexingFactoryOrderNumber.trim()) {
      alert('Informe o número do pedido emitido pela representada.');
      return;
    }

    const order = indexingModalOrder;
    const cleanFoNumber = indexingFactoryOrderNumber.trim();

    // 1. Cria o registro de RepresentativeFactoryOrder
    const newFo: RepresentativeFactoryOrder = {
      id: `FO-${Date.now()}`,
      companyId: order.companyId,
      representativeOrderId: order.id,
      representativeOrderNumber: order.orderNumber,
      representedCompanyId: order.representedId,
      representedCompanyName: order.representedName,
      factoryOrderNumber: cleanFoNumber,
      indexCode: order.indexCode,
      orderDate: new Date().toISOString().substring(0, 10),
      customer: order.clientName,
      customerCnpjCpf: order.clientCnpjCpf,
      totalValue: indexingAmount || order.totalOrderAmount,
      taxesAmount: indexingTaxesAmount,
      invoiceNumber: indexingInvoiceNumber.trim(),
      expectedPaymentDate: indexingExpectedPaymentDate,
      commissionPercentage: order.commissionPercentage || 5,
      commissionAmount: ((indexingAmount || order.totalOrderAmount) * (order.commissionPercentage || 5)) / 100,
      status: 'invoiced',
      observations: indexingNotes,
      createdAt: new Date().toISOString(),
    };

    if (onAddFactoryOrder) {
      onAddFactoryOrder(newFo);
    }

    // 2. Atualiza o Pedido Pai
    const updatedNumbers = Array.from(new Set([...(order.factoryOrderNumbers || []), cleanFoNumber]));
    const updatedOrder: RepresentativeOrder = {
      ...order,
      factoryOrderNumbers: updatedNumbers,
      factoryOrderNumber: cleanFoNumber,
      factoryInvoiceNumber: indexingInvoiceNumber.trim() || order.factoryInvoiceNumber,
      status: order.status === 'sent_to_factory' ? 'factory_order_generated' : order.status,
      needsIndexingReview: false, // Indexado com sucesso!
      updatedAt: new Date().toISOString(),
    };

    onSaveOrder(updatedOrder);

    // 3. Atualiza linha correspondente na planilha de confronto se existir
    setConfrontationRows(prev =>
      prev.map(row => {
        if (row.factoryOrderNumber === cleanFoNumber || (row.clientCnpj && row.clientCnpj === order.clientCnpjCpf)) {
          return {
            ...row,
            internalOrderNumber: order.orderNumber,
            indexCode: order.indexCode,
            status: 'INDEXADO',
          };
        }
        return row;
      })
    );

    setIndexingModalOrder(null);
  };

  // Compartilhamento via WhatsApp
  const handleShareWhatsApp = (order: RepresentativeOrder) => {
    const text = `*PEDIDO DE REPRESENTAÇÃO ${order.orderNumber}*\n` +
      `Indexador: ${order.indexCode || 'Sem indexador'}\n` +
      `Representada: ${order.representedName}\n` +
      `Cliente: ${order.clientName} (${order.clientCnpjCpf})\n` +
      `Valor Total: R$ ${order.totalOrderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `Condição: ${order.paymentCondition}\n` +
      `Pedidos Fábrica (1:N): ${order.factoryOrderNumbers?.join(', ') || 'Aguardando faturamento'}\n\n` +
      `Itens Solicitados:\n` +
      order.items.map(it => `• ${it.quantity}x ${it.description} - R$ ${it.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n');

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in" id="representative-orders-container">

      {/* ======================================================== */}
      {/* 1. TOPO / CABEÇALHO COM NAVEGADOR DE MESES (ESTILO PROCFY) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          
          {/* Título e Subtítulo */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Comércio & Representações Comerciais
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-indigo-600" />
              Pedidos Realizados & Conciliação de Faturamento
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Indexação do pedido enviado ao faturado da representada (1:N), conferência de impostos e apuração de comissões por competência mensal.
            </p>
          </div>

          {/* Seletor Central de Meses / "Correr pelos Meses" Procfy Style */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-xs px-1 py-0.5">
              <button
                onClick={handlePrevMonth}
                title="Mês Anterior"
                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-4 py-1 text-center min-w-[130px]">
                <span className="text-xs font-black text-slate-900 tracking-wider font-mono">
                  {MONTH_ABBR[selectedMonth - 1]} / {selectedYear}
                </span>
                <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">
                  {MONTH_NAMES[selectedMonth - 1]}
                </div>
              </div>

              <button
                onClick={handleNextMonth}
                title="Próximo Mês"
                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleGoToCurrentMonth}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'month' && selectedMonth === (currentDate.getMonth() + 1) && selectedYear === currentDate.getFullYear()
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Mês Atual
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'all' ? 'month' : 'all')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {viewMode === 'all' ? 'Ver Somente Mês' : 'Todos os Meses'}
            </button>

            {/* Botão Novo Pedido */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido Enviado
            </button>
          </div>

        </div>

        {/* ======================================================== */}
        {/* 2. CARDS SUPERIORES DE COMPARATIVOS & PROJEÇÃO (PROCFY)    */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          
          {/* Card 1: Resultado Previsto no Mês (Faturamento Fábricas) */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm border border-indigo-900/40 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                  Faturamento Previsto ({MONTH_ABBR[selectedMonth - 1]})
                </span>
                <div className="text-2xl font-black tracking-tight text-white mt-1 font-mono">
                  R$ {metrics.totalExpectedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Barra de Progresso Faturado pela Fábrica */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                <span>Faturado: R$ {metrics.totalInvoicedByFactory.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="font-bold text-emerald-400">{metrics.invoicedPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.invoicedPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-indigo-900/60 mt-3">
              <span>{metrics.totalOrdersCount} pedidos emitidos</span>
              <span className="text-indigo-300 font-semibold">1:N Desdobramentos</span>
            </div>
          </div>

          {/* Card 2: Previsão de Comissões da Representada */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Comissões Previstas
                </span>
                <div className="text-2xl font-black tracking-tight text-slate-900 mt-1 font-mono">
                  R$ {metrics.totalEstimatedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Barra de Progresso de Comissões */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                <span>Confirmado: R$ {metrics.totalInvoicedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="font-bold text-emerald-600">{metrics.commissionPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.commissionPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3 border-t border-slate-100 mt-3">
              <span>Taxa média: ~5% a 7%</span>
              <span className="text-emerald-600 font-bold">Direto da Fábrica</span>
            </div>
          </div>

          {/* Card 3: Indexação 1:N & Alerta Crítico (Cor Especial de Atenção) */}
          <div className={`p-5 rounded-2xl border transition-all ${
            metrics.unlinkedCount > 0
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-300/60 text-amber-950 shadow-sm'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  metrics.unlinkedCount > 0 ? 'text-amber-800 font-black' : 'text-slate-500'
                }`}>
                  Status de Indexação
                </span>
                <div className="text-2xl font-black tracking-tight mt-1 font-mono">
                  {metrics.linkedCount} / {metrics.totalOrdersCount}
                </div>
              </div>
              <div className={`p-2 rounded-xl border ${
                metrics.unlinkedCount > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {metrics.unlinkedCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
              </div>
            </div>

            {metrics.unlinkedCount > 0 ? (
              <div className="mt-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-200/90 text-amber-950 border border-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                  {metrics.unlinkedCount} {metrics.unlinkedCount === 1 ? 'pedido necessita análise' : 'pedidos necessitam análise'}
                </div>
                <p className="text-[11px] text-amber-800/90 mt-1.5 font-medium leading-tight">
                  Sem número da representada cadastrado. Ligue o pedido recebido ao enviado.
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  100% Indexados
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Todos os pedidos enviados possuem correspondência na fábrica.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-amber-200/60 mt-3 flex justify-between items-center text-[10px]">
              <button
                onClick={() => setOnlyNeedsReview(!onlyNeedsReview)}
                className="font-bold underline cursor-pointer hover:opacity-80"
              >
                {onlyNeedsReview ? 'Ver Todos os Pedidos' : 'Filtrar Não Indexados'}
              </button>
              <span className="font-mono font-bold">1 Enviado : N Recebidos</span>
            </div>
          </div>

          {/* Card 4: Atalhos para Contas a Pagar & Receber */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Integração Financeira
              </span>
              <p className="text-xs text-slate-600 mt-1">
                Conecte o faturamento das representadas diretamente aos módulos de tesouraria.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => onNavigateToView ? onNavigateToView('accounts_payable') : alert('Abra o menu lateral Contas a Pagar')}
                className="flex flex-col items-start p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors text-left cursor-pointer group"
                title="Acessar Módulo Contas a Pagar"
              >
                <div className="flex items-center justify-between w-full">
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  <span className="text-[10px] font-bold text-rose-600 group-hover:underline">Acessar &rarr;</span>
                </div>
                <span className="text-xs font-black mt-1">Contas a Pagar</span>
                <span className="text-[10px] text-rose-700/80">Despesas & Fretes</span>
              </button>

              <button
                onClick={() => onNavigateToView ? onNavigateToView('accounts_receivable') : alert('Abra o menu lateral Contas a Receber')}
                className="flex flex-col items-start p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors text-left cursor-pointer group"
                title="Acessar Módulo Contas a Receber"
              >
                <div className="flex items-center justify-between w-full">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-600 group-hover:underline">Acessar &rarr;</span>
                </div>
                <span className="text-xs font-black mt-1">Contas a Receber</span>
                <span className="text-[10px] text-emerald-700/80">Comissões da Fábrica</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 mt-2 text-center">
              Continuidade com Contas a Pagar ativa
            </div>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. SUB-ABAS DE NAVEGAÇÃO INTERNA                          */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Pedidos Realizados & Indexação ({filteredOrders.length})
        </button>

        <button
          onClick={() => setActiveSubTab('spreadsheet_confrontation')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'spreadsheet_confrontation'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Confronto de Planilha da Representada ({confrontationRows.length} linhas)
        </button>

        <button
          onClick={() => setActiveSubTab('monthly_comparison')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'monthly_comparison'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-600" />
          Comparativos Mensais & Contas
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. CONTEÚDO DA SUB-ABA 1: PEDIDOS REALIZADOS & INDEXAÇÃO  */}
      {/* ======================================================== */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Toolbar de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Nº do pedido (REP-000123), indexador (IND-...), pedido fábrica, cliente ou CNPJ..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="all">Todos os Status</option>
                <option value="sent_to_factory">Enviado à Fábrica</option>
                <option value="factory_order_generated">Pedido Fábrica Gerado</option>
                <option value="invoiced_partial">Faturado Parcial</option>
                <option value="invoiced_total">Faturado Total</option>
                <option value="commission_pending">Comissão a Receber</option>
                <option value="commission_received">Comissão Recebida</option>
              </select>

              <select
                value={representedFilter}
                onChange={(e) => setRepresentedFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="all">Todas as Fábricas</option>
                {representedCompanies.map(r => (
                  <option key={r.id} value={r.id}>{r.tradeName || r.corporateName}</option>
                ))}
              </select>

              <button
                onClick={() => setOnlyNeedsReview(!onlyNeedsReview)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  onlyNeedsReview
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
                title="Destacar apenas pedidos que não têm o número da representada informado"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {onlyNeedsReview ? 'Exibindo: Necessitam Análise' : 'Filtrar Sem Indexador'}
              </button>
            </div>
          </div>

          {/* Lista de Pedidos com Relação 1:N e Destaque Visual */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Nenhum pedido encontrado na competência selecionada</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Utilize o navegador no topo para selecionar outro mês ou clique em "Novo Pedido Enviado" para cadastrar.
                </p>
                <button
                  onClick={() => setViewMode('all')}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-xl"
                >
                  Ver Todos os Meses
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const isExpanded = expandedOrderId === order.id;
                  const isLinked = isOrderLinkedToFactory(order);
                  const needsReview = !isLinked || order.needsIndexingReview;
                  const linkedFactoryOrders = factoryOrders.filter(fo => fo.representativeOrderId === order.id);

                  return (
                    <div
                      key={order.id}
                      className={`transition-all ${
                        needsReview
                          ? 'bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-50/90'
                          : 'hover:bg-slate-50/60 border-l-4 border-l-indigo-500'
                      }`}
                    >
                      <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        
                        {/* Identificação Principal do Pedido */}
                        <div className="space-y-2 flex-1">
                          
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Número do Pedido Enviado */}
                            <span className="text-base font-black text-slate-900 font-mono tracking-wider">
                              {order.orderNumber}
                            </span>

                            {/* Chave de Indexação (Campo Chave solicitado pelo usuário) */}
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-slate-100 text-slate-800 border border-slate-300" title="Chave de indexação enviada à representada">
                              <Link2 className="w-3 h-3 text-indigo-600" />
                              Indexador: <strong className="text-indigo-700">{order.indexCode || 'IND-PENDENTE'}</strong>
                            </div>

                            {/* Badge de Alerta Visual quando FALTA o número da fábrica (Regra do Usuário) */}
                            {needsReview ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-200 text-amber-950 border border-amber-400 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-900" />
                                ⚠️ NECESSITA ANÁLISE — PEDIDO NÃO INDEXADO À REPRESENTADA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                INDEXADO ({order.factoryOrderNumbers?.length || 1} faturamentos)
                              </span>
                            )}

                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {order.orderDate}
                            </span>
                          </div>

                          {/* Dados do Cliente e Representada */}
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              {order.clientName}
                              <span className="text-slate-400 font-normal">({order.clientCnpjCpf})</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              Fábrica / Representada: <strong className="text-slate-800">{order.representedName}</strong>
                            </div>

                            <div className="text-slate-500">
                              Condição: <span className="font-semibold text-slate-700">{order.paymentCondition}</span>
                            </div>
                          </div>

                          {/* Desdobramentos da Representada (Relação 1:N) */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              Pedidos da Fábrica Recebidos (1:N):
                            </span>

                            {order.factoryOrderNumbers && order.factoryOrderNumbers.length > 0 ? (
                              order.factoryOrderNumbers.map((foNum, idx) => {
                                const foDetail = linkedFactoryOrders.find(f => f.factoryOrderNumber === foNum);
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono text-xs font-semibold"
                                  >
                                    #{foNum}
                                    {foDetail && (
                                      <span className="text-slate-500 font-normal">
                                        (R$ {foDetail.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                      </span>
                                    )}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-amber-700 font-medium italic">
                                Nenhum pedido emitido pela representada foi associado ainda.
                              </span>
                            )}
                          </div>

                        </div>

                        {/* Valores e Botões de Ação */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between xl:justify-end gap-4 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                          
                          {/* Bloco Financeiro */}
                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-slate-500 block">Valor do Pedido</span>
                            <div className="text-lg font-black text-slate-900 font-mono">
                              R$ {order.totalOrderAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-emerald-600 font-bold">
                              Comissão: R$ {order.estimatedTotalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({order.commissionPercentage || 5}%)
                            </div>
                          </div>

                          {/* Botões de Ação */}
                          <div className="flex items-center gap-2">
                            
                            {/* BOTÃO CHAVE: LIGAR / INDEXAR PEDIDO DA REPRESENTADA */}
                            <button
                              onClick={() => handleOpenIndexingModal(order)}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                needsReview
                                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black ring-2 ring-amber-400'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                              }`}
                              title="Ligar número do pedido emitido pela representada (1:N)"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              {needsReview ? '⚡ Ligar Pedido Fábrica' : '+ Desdobramento 1:N'}
                            </button>

                            <button
                              onClick={() => handleShareWhatsApp(order)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                              title="Compartilhar espelho com cliente ou representada via WhatsApp"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                              title={isExpanded ? 'Recolher detalhes' : 'Expandir itens e desdobramentos'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                        </div>

                      </div>

                      {/* DETALHES EXPANDIDOS (Itens, Desdobramentos 1:N, Impostos) */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 bg-white border-t border-slate-100 space-y-4">
                          
                          {/* Desdobramentos 1:N Cadastrados da Fábrica */}
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-indigo-600" />
                                Desdobramento de Faturamento pela Representada (Relação 1:N)
                              </h4>
                              <button
                                onClick={() => handleOpenIndexingModal(order)}
                                className="px-3 py-1 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                + Adicionar Outro Pedido da Fábrica
                              </button>
                            </div>

                            {linkedFactoryOrders.length === 0 ? (
                              <div className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-dashed border-slate-300 text-center">
                                Nenhum pedido detalhado cadastrado. Clique em <strong>"⚡ Ligar Pedido Fábrica"</strong> para cadastrar o número emitido pela fábrica e desdobrar o faturamento.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                {linkedFactoryOrders.map(fo => (
                                  <div key={fo.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-mono font-bold text-indigo-700 text-sm">#{fo.factoryOrderNumber}</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">Faturado</span>
                                    </div>
                                    <div className="text-slate-600">
                                      Valor: <strong className="text-slate-900 font-mono">R$ {fo.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                    </div>
                                    <div className="text-slate-500 text-[11px]">
                                      Impostos Destacados: R$ {(fo.taxesAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    {fo.invoiceNumber && (
                                      <div className="text-slate-500 text-[11px]">
                                        NF-e: <strong className="text-slate-700 font-mono">{fo.invoiceNumber}</strong>
                                      </div>
                                    )}
                                    <div className="text-emerald-600 font-semibold text-[11px] pt-1 border-t border-slate-100">
                                      Comissão: R$ {((fo.totalValue * (order.commissionPercentage || 5)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Tabela de Itens do Pedido Enviado */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Itens do Pedido Enviado ({order.items.length})
                            </h4>
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                              <table className="w-full text-left">
                                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="px-3 py-2">Item / Descrição</th>
                                    <th className="px-3 py-2 text-center">Qtd</th>
                                    <th className="px-3 py-2 text-right">Preço Unit.</th>
                                    <th className="px-3 py-2 text-right">Total Item</th>
                                    <th className="px-3 py-2 text-right">% Com.</th>
                                    <th className="px-3 py-2 text-right">Comissão Prevista</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {order.items.map((it, i) => (
                                    <tr key={i}>
                                      <td className="px-3 py-2 font-medium text-slate-800">{it.description}</td>
                                      <td className="px-3 py-2 text-center text-slate-600">{it.quantity}</td>
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

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CONTEÚDO DA SUB-ABA 2: CONFRONTO COM PLANILHA          */}
      {/* ======================================================== */}
      {activeSubTab === 'spreadsheet_confrontation' && (
        <div className="space-y-4">
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Confronto de Planilhas Recebidas das Representadas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confronte as colunas: Pedido, Cliente, Valores, Impostos e Previsão a Receber. Identifique desdobramentos parciais e ligue pedidos sem código.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => alert('Para importar nova planilha de faturamento, utilize o botão "Importar Faturamento" no painel principal ou cole novos dados.')}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 inline mr-1" />
                  Importar Nova Planilha
                </button>
              </div>
            </div>

            {/* Tabela no formato da Planilha da Representada solicitada pelo usuário */}
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Pedido Fábrica</th>
                    <th className="px-4 py-3">Indexador / Pedido Enviado</th>
                    <th className="px-4 py-3">Cliente Comprador</th>
                    <th className="px-4 py-3 text-right">Valor Faturado</th>
                    <th className="px-4 py-3 text-right">Impostos Retidos</th>
                    <th className="px-4 py-3 text-right">Valor Líquido</th>
                    <th className="px-4 py-3 text-center">Previsão Pgto</th>
                    <th className="px-4 py-3 text-right">Comissão Prevista</th>
                    <th className="px-4 py-3 text-center">Ação / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {confrontationRows.map(row => {
                    const isUnlinked = row.status === 'PENDENTE_ANALISE' || !row.internalOrderNumber;

                    return (
                      <tr
                        key={row.id}
                        className={isUnlinked ? 'bg-amber-50/80 font-medium' : 'hover:bg-slate-50/70'}
                      >
                        {/* Pedido Fábrica */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          #{row.factoryOrderNumber}
                        </td>

                        {/* Pedido Enviado / Indexador */}
                        <td className="px-4 py-3 font-mono">
                          {row.internalOrderNumber ? (
                            <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {row.internalOrderNumber} ({row.indexCode})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-200 px-2 py-0.5 rounded text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-amber-900" />
                              Não informado na planilha
                            </span>
                          )}
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{row.clientName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{row.clientCnpj}</div>
                        </td>

                        {/* Valor Faturado */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          R$ {row.grossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Impostos */}
                        <td className="px-4 py-3 text-right font-mono text-rose-700">
                          R$ {row.taxesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Valor Líquido */}
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          R$ {row.netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Previsão Pgto */}
                        <td className="px-4 py-3 text-center text-slate-600 font-medium">
                          {row.expectedDate}
                        </td>

                        {/* Comissão */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          R$ {row.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({row.commissionPercent}%)</span>
                        </td>

                        {/* Status / Ação para Ligar */}
                        <td className="px-4 py-3 text-center">
                          {isUnlinked ? (
                            <button
                              onClick={() => {
                                const target = orders.find(o => o.clientCnpjCpf === row.clientCnpj) || orders[0];
                                if (target) {
                                  handleOpenIndexingModal(target);
                                  setIndexingFactoryOrderNumber(row.factoryOrderNumber);
                                  setIndexingAmount(row.grossAmount);
                                  setIndexingTaxesAmount(row.taxesAmount);
                                }
                              }}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs shadow-xs cursor-pointer"
                              title="Ligar esta linha de faturamento a um pedido enviado do MotorDesk"
                            >
                              ⚡ Ligar Pedido
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Indexado
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CONTEÚDO DA SUB-ABA 3: COMPARATIVOS MENSAIS & CONTAS    */}
      {/* ======================================================== */}
      {activeSubTab === 'monthly_comparison' && (
        <div className="space-y-4">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Comparativo Mensal de Pedidos e Projeção Financeira
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Evolução de pedidos enviados, valores faturados pelas representadas e fluxo de comissões nos últimos meses.
              </p>
            </div>

            {/* Barras Comparativas dos Últimos 6 Meses */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { month: 'MAI/26', expected: 65000, invoiced: 62000, comm: 3100, active: false },
                { month: 'JUN/26', expected: 72000, invoiced: 70000, comm: 3500, active: false },
                { month: 'JUL/26', expected: 80000, invoiced: 78000, comm: 3900, active: false },
                { month: 'AGO/26', expected: 83000, invoiced: 81000, comm: 4050, active: false },
                { month: 'SET/26', expected: metrics.totalExpectedAmount || 85000, invoiced: metrics.totalInvoicedByFactory || 78000, comm: metrics.totalEstimatedCommission || 4250, active: true },
                { month: 'OUT/26', expected: 90000, invoiced: 35000, comm: 4500, active: false },
              ].map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedMonth(idx + 5);
                    setActiveSubTab('orders');
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    m.active
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-700 block">{m.month}</span>
                  <div className="text-xs font-black text-slate-900 mt-2 font-mono">
                    R$ {(m.expected / 1000).toFixed(1)}k
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    Com.: R$ {(m.comm).toFixed(0)}
                  </span>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (m.invoiced / m.expected) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo Integrado com Contas a Pagar e Contas a Receber */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                    Contas a Pagar do Período
                  </span>
                  <button
                    onClick={() => onNavigateToView && onNavigateToView('accounts_payable')}
                    className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                  >
                    Ver Contas a Pagar &rarr;
                  </button>
                </div>
                <p className="text-xs text-rose-800">
                  Despesas de fretes terceirizados, impostos e obrigações do mês vinculadas a este faturamento.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    Contas a Receber (Comissões)
                  </span>
                  <button
                    onClick={() => onNavigateToView && onNavigateToView('accounts_receivable')}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Ver Contas a Receber &rarr;
                  </button>
                </div>
                <p className="text-xs text-emerald-800">
                  Títulos gerados automaticamente a partir da conciliação dos pedidos confirmados pelas fábricas.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL DE INDEXAÇÃO RÁPIDA & DESDOBRAMENTO 1:N          */}
      {/* ======================================================== */}
      {indexingModalOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-scale-in">
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-indigo-600" />
                  Indexar Pedido da Representada (1:N)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vincular número de pedido emitido pela representada ao pedido enviado MotorDesk.
                </p>
              </div>
              <button
                onClick={() => setIndexingModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Pedido MotorDesk:</span>
                <strong className="font-mono text-slate-900">{indexingModalOrder.orderNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chave Indexadora:</span>
                <strong className="font-mono text-indigo-700">{indexingModalOrder.indexCode || 'Sem indexador'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <strong className="text-slate-900">{indexingModalOrder.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Representada:</span>
                <strong className="text-slate-900">{indexingModalOrder.representedName}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveIndexingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número do Pedido Emitido pela Representada / Fábrica *:
                </label>
                <input
                  type="text"
                  required
                  value={indexingFactoryOrderNumber}
                  onChange={(e) => setIndexingFactoryOrderNumber(e.target.value)}
                  placeholder="Ex: 45871 (código gerado internamente pela fábrica)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Este número será usado para confronto automático com a planilha da representada.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número da NF-e (se faturado):
                  </label>
                  <input
                    type="text"
                    value={indexingInvoiceNumber}
                    onChange={(e) => setIndexingInvoiceNumber(e.target.value)}
                    placeholder="Ex: 8921"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Faturado (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={indexingAmount || ''}
                    onChange={(e) => setIndexingAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Impostos Destacados (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={indexingTaxesAmount || ''}
                    onChange={(e) => setIndexingTaxesAmount(parseFloat(e.target.value) || 0)}
                    placeholder="ICMS, ST, IPI"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono text-rose-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previsão de Pagamento:
                  </label>
                  <input
                    type="date"
                    value={indexingExpectedPaymentDate}
                    onChange={(e) => setIndexingExpectedPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações de Desdobramento / Faturamento:
                </label>
                <input
                  type="text"
                  value={indexingNotes}
                  onChange={(e) => setIndexingNotes(e.target.value)}
                  placeholder="Ex: Faturamento parcial correspondente ao lote 1"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIndexingModalOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  Confirmar Vínculo & Indexação
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL NOVO PEDIDO ENVIADO COM CHAVE DE INDEXAÇÃO       */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 space-y-5 animate-scale-in">
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Novo Pedido de Representação Comercial
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registre o pedido enviado à fábrica com código de indexação para conferência de faturamento.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Empresa Representada (Fábrica) *:
                  </label>
                  <select
                    value={selectedRepresentedId}
                    onChange={(e) => setSelectedRepresentedId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cliente Comprador *:
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
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

              {/* Campo Específico de Chave de Indexação solicitado pelo usuário */}
              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200">
                <label className="block text-xs font-black text-indigo-900 mb-1 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                  Chave de Indexação / Cód. Pedido Enviado à Representada:
                </label>
                <input
                  type="text"
                  value={customIndexCode}
                  onChange={(e) => setCustomIndexCode(e.target.value)}
                  placeholder={`Ex: IND-${selectedYear}-081 (Deixe em branco para gerar automático)`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-white font-mono font-bold text-slate-900"
                />
                <span className="text-[11px] text-indigo-700 mt-1 block">
                  💡 Este código serve para indexar este pedido no pedido emitido e faturado pela representada quando a planilha de faturamento chegar.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condição de Pagamento:</label>
                  <input
                    type="text"
                    value={paymentCondition}
                    onChange={(e) => setPaymentCondition(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Frete:</label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="CIF">CIF (Fábrica paga o frete)</option>
                    <option value="FOB">FOB (Cliente paga o frete)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transportadora:</label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    placeholder="Nome da transportadora"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Itens do Pedido
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-slate-50">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].description = e.target.value;
                            setItems(copy);
                          }}
                          placeholder="Descrição da peça / item"
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg"
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
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-center"
                        />
                      </div>
                      <div className="col-span-2">
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
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-right"
                        />
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-slate-900">
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
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
