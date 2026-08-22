/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Store, 
  UserCheck, 
  AlertCircle, 
  Printer, 
  ChevronRight, 
  ArrowRight, 
  Check, 
  X, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Eye, 
  Play, 
  Send,
  Boxes,
  ShieldCheck,
  History,
  AlertTriangle,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { AppDatabase } from '../data/mockData';
import { 
  GoodsWithdrawalOrder, 
  GoodsWithdrawalItem, 
  GoodsWithdrawalHistoryEvent, 
  WithdrawalStatus, 
  WithdrawalType, 
  User as AppUser, 
  CompanyInfo, 
  StockMovement,
  Part
} from '../types';

interface WithdrawalViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  currentUser: AppUser;
  currentCompany?: CompanyInfo;
  onNavigate?: (tab: string) => void;
}

export default function WithdrawalView({
  db,
  onUpdateDb,
  currentUser,
  currentCompany,
  onNavigate
}: WithdrawalViewProps) {
  const companyId = currentCompany?.id || db.companyInfo?.id || 'comp-1';

  // Filter orders by active company
  const withdrawals: GoodsWithdrawalOrder[] = useMemo(() => {
    const list = db.goodsWithdrawals || [];
    return list.filter(w => !w.companyId || w.companyId === companyId);
  }, [db.goodsWithdrawals, companyId]);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<GoodsWithdrawalOrder | null>(null);

  // Modals
  const [separationModalOrder, setSeparationModalOrder] = useState<GoodsWithdrawalOrder | null>(null);
  const [tempSeparatedQuantities, setTempSeparatedQuantities] = useState<{ [itemId: string]: number }>({});
  
  const [releaseModalOrder, setReleaseModalOrder] = useState<GoodsWithdrawalOrder | null>(null);
  const [collectedByName, setCollectedByName] = useState('');
  const [collectedByDocument, setCollectedByDocument] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  const [dispatchModalOrder, setDispatchModalOrder] = useState<GoodsWithdrawalOrder | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [dispatchTrackingCode, setDispatchTrackingCode] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [printDocOrder, setPrintDocOrder] = useState<GoodsWithdrawalOrder | null>(null);

  // Status counts for operational chips
  const counts = useMemo(() => {
    return {
      all: withdrawals.length,
      aguardando: withdrawals.filter(w => w.status === 'AGUARDANDO_SEPARACAO').length,
      emSeparacao: withdrawals.filter(w => w.status === 'EM_SEPARACAO').length,
      parcial: withdrawals.filter(w => w.status === 'PARCIALMENTE_SEPARADO').length,
      prontoRetirada: withdrawals.filter(w => w.status === 'PRONTO_RETIRADA').length,
      prontoEntrega: withdrawals.filter(w => w.status === 'PRONTO_ENTREGA').length,
      saiuEntrega: withdrawals.filter(w => w.status === 'SAIU_PARA_ENTREGA').length,
      concluidos: withdrawals.filter(w => w.status === 'RETIRADO' || w.status === 'ENTREGUE').length,
    };
  }, [withdrawals]);

  // Filtered List
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      // Search
      const matchesSearch = 
        w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.saleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.carrierName && w.carrierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (w.trackingCode && w.trackingCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        w.items.some(i => i.partName.toLowerCase().includes(searchTerm.toLowerCase()) || i.partCode.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status
      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'CONCLUIDOS' && (w.status === 'RETIRADO' || w.status === 'ENTREGUE')) ||
        w.status === statusFilter;

      // Type
      const matchesType = 
        typeFilter === 'ALL' ||
        w.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [withdrawals, searchTerm, statusFilter, typeFilter]);

  // Helper to append history
  const createHistoryEvent = (status: WithdrawalStatus, action: string, description: string): GoodsWithdrawalHistoryEvent => ({
    id: `he-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status,
    action,
    description,
    userId: currentUser.id,
    userName: currentUser.name,
    timestamp: new Date().toISOString()
  });

  // Action: Iniciar Separação
  const handleStartSeparation = (order: GoodsWithdrawalOrder) => {
    const updatedHistory = [
      ...order.history,
      createHistoryEvent('EM_SEPARACAO', 'Início de Separação', `Operador ${currentUser.name} iniciou o processo de separação física dos itens.`)
    ];

    const updatedOrder: GoodsWithdrawalOrder = {
      ...order,
      status: 'EM_SEPARACAO',
      assignedOperator: currentUser.name,
      updatedAt: new Date().toISOString(),
      history: updatedHistory
    };

    saveUpdatedOrder(updatedOrder);
  };

  // Action: Abrir Modal de Separação
  const handleOpenSeparationModal = (order: GoodsWithdrawalOrder) => {
    setSeparationModalOrder(order);
    const initialQty: { [itemId: string]: number } = {};
    order.items.forEach(item => {
      initialQty[item.id] = item.quantitySeparated || item.quantitySold; // Default fill to sold for quick 1-click
    });
    setTempSeparatedQuantities(initialQty);
  };

  // Action: Salvar Separação de Itens
  const handleSaveSeparation = () => {
    if (!separationModalOrder) return;

    let allSeparated = true;
    let anySeparated = false;

    const updatedItems = separationModalOrder.items.map(item => {
      const sepQty = Math.max(0, Math.min(item.quantitySold, Number(tempSeparatedQuantities[item.id] || 0)));
      if (sepQty < item.quantitySold) {
        allSeparated = false;
      }
      if (sepQty > 0) {
        anySeparated = true;
      }
      return {
        ...item,
        quantitySeparated: sepQty
      };
    });

    let newStatus: WithdrawalStatus = 'EM_SEPARACAO';
    let actionLabel = 'Atualização de Separação';
    let desc = 'Contagem de itens separada atualizada.';

    if (allSeparated) {
      newStatus = separationModalOrder.type === 'BALCAO' ? 'PRONTO_RETIRADA' : 'PRONTO_ENTREGA';
      actionLabel = 'Separação Concluída';
      desc = separationModalOrder.type === 'BALCAO' 
        ? 'Todos os itens foram separados e estão prontos no balcão de retirada.' 
        : 'Todos os itens foram separados e estão na doca de expedição aguardando transporte.';
    } else if (anySeparated) {
      newStatus = 'PARCIALMENTE_SEPARADO';
      actionLabel = 'Separação Parcial';
      desc = 'Itens parcialmente separados. Aguardando conclusão dos demais produtos.';
    }

    const updatedHistory = [
      ...separationModalOrder.history,
      createHistoryEvent(newStatus, actionLabel, desc)
    ];

    const updatedOrder: GoodsWithdrawalOrder = {
      ...separationModalOrder,
      items: updatedItems,
      status: newStatus,
      separatedAt: allSeparated ? newStatus === 'PRONTO_RETIRADA' || newStatus === 'PRONTO_ENTREGA' ? new Date().toISOString() : separationModalOrder.separatedAt : undefined,
      assignedOperator: separationModalOrder.assignedOperator || currentUser.name,
      updatedAt: new Date().toISOString(),
      history: updatedHistory
    };

    saveUpdatedOrder(updatedOrder);
    setSeparationModalOrder(null);
  };

  // Action: Abrir Modal de Liberação / Retirada Balcão
  const handleOpenReleaseModal = (order: GoodsWithdrawalOrder) => {
    setReleaseModalOrder(order);
    setCollectedByName(order.clientName);
    setCollectedByDocument('');
    setReleaseNotes('');
  };

  // Action: Confirmar Retirada Balcão (Baixa Física Definitiva do Estoque)
  const handleConfirmRelease = () => {
    if (!releaseModalOrder) return;
    if (!collectedByName.trim()) {
      alert('Por favor, informe o nome de quem está retirando a mercadoria.');
      return;
    }

    const now = new Date().toISOString();

    // 1. Process physical stock deduction and release reservation
    const currentParts = [...(db.parts || [])];
    const newStockMovements: StockMovement[] = [...(db.stockMovements || [])];

    releaseModalOrder.items.forEach(item => {
      const partIndex = currentParts.findIndex(p => p.id === item.partId);
      if (partIndex >= 0) {
        const p = currentParts[partIndex];
        const previousStock = p.stock;
        const previousReserved = p.reservedStock || 0;
        const qtyToDeduct = item.quantitySold;

        // Deduct physical stock and deduct reserved stock
        const newStock = Math.max(0, previousStock - qtyToDeduct);
        const newReserved = Math.max(0, previousReserved - qtyToDeduct);

        currentParts[partIndex] = {
          ...p,
          stock: newStock,
          reservedStock: newReserved
        };

        // Create StockMovement record
        const movement: StockMovement = {
          id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          partId: p.id,
          partName: p.name,
          partCode: p.code || 'PRD-' + p.id,
          type: 'out',
          quantity: qtyToDeduct,
          date: now,
          reason: 'sales',
          description: `Saída Física por Retirada no Balcão (Pedido ${releaseModalOrder.code}, Venda ${releaseModalOrder.saleCode}) - Retirado por: ${collectedByName.trim()}`,
          userName: currentUser.name,
          companyId: currentCompany?.id || db.companyInfo?.id || 'comp-1'
        };
        newStockMovements.unshift(movement);
      }
    });

    // 2. Update order status to RETIRADO
    const updatedItems = releaseModalOrder.items.map(item => ({
      ...item,
      quantityReserved: 0,
      quantityReleased: item.quantitySold
    }));

    const updatedHistory = [
      ...releaseModalOrder.history,
      createHistoryEvent(
        'RETIRADO',
        'Retirada Balcão Concluída',
        `Mercadoria entregue no balcão para ${collectedByName.trim()}${collectedByDocument ? ` (Doc: ${collectedByDocument})` : ''}. Baixa física definitiva de estoque executada.`
      )
    ];

    const updatedOrder: GoodsWithdrawalOrder = {
      ...releaseModalOrder,
      items: updatedItems,
      status: 'RETIRADO',
      collectedByName: collectedByName.trim(),
      collectedByDocument: collectedByDocument.trim() || undefined,
      notes: releaseNotes.trim() ? `${releaseModalOrder.notes ? releaseModalOrder.notes + ' | ' : ''}${releaseNotes.trim()}` : releaseModalOrder.notes,
      releasedAt: now,
      deliveredAt: now,
      updatedAt: now,
      history: updatedHistory
    };

    // 3. Save database
    onUpdateDb(prev => {
      const updatedWithdrawals = (prev.goodsWithdrawals || []).map(w => 
        w.id === updatedOrder.id ? updatedOrder : w
      );
      return {
        ...prev,
        parts: currentParts,
        stockMovements: newStockMovements,
        goodsWithdrawals: updatedWithdrawals
      };
    });

    setReleaseModalOrder(null);
    setSelectedOrder(updatedOrder);
  };

  // Action: Abrir Modal de Despacho para Transporte
  const handleOpenDispatchModal = (order: GoodsWithdrawalOrder) => {
    setDispatchModalOrder(order);
    setSelectedCarrierId(order.carrierId || (db.carriers && db.carriers[0]?.id) || '');
    setDispatchTrackingCode(order.trackingCode || '');
    setDispatchNotes('');
  };

  // Action: Confirmar Despacho para Transportadora (Baixa Física Definitiva do Estoque)
  const handleConfirmDispatch = () => {
    if (!dispatchModalOrder) return;

    const carrier = (db.carriers || []).find(c => c.id === selectedCarrierId);
    const carrierName = carrier ? (carrier.tradeName || carrier.corporateName) : dispatchModalOrder.carrierName || 'Transportadora Parceira';
    const now = new Date().toISOString();

    // 1. Process physical stock deduction and release reservation
    const currentParts = [...(db.parts || [])];
    const newStockMovements: StockMovement[] = [...(db.stockMovements || [])];

    dispatchModalOrder.items.forEach(item => {
      const partIndex = currentParts.findIndex(p => p.id === item.partId);
      if (partIndex >= 0) {
        const p = currentParts[partIndex];
        const previousStock = p.stock;
        const previousReserved = p.reservedStock || 0;
        const qtyToDeduct = item.quantitySold;

        // Deduct physical stock and deduct reserved stock
        const newStock = Math.max(0, previousStock - qtyToDeduct);
        const newReserved = Math.max(0, previousReserved - qtyToDeduct);

        currentParts[partIndex] = {
          ...p,
          stock: newStock,
          reservedStock: newReserved
        };

        // Create StockMovement record
        const movement: StockMovement = {
          id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          partId: p.id,
          partName: p.name,
          partCode: p.code || 'PRD-' + p.id,
          type: 'out',
          quantity: qtyToDeduct,
          date: now,
          reason: 'sales',
          description: `Saída Física por Despacho de Transporte (Pedido ${dispatchModalOrder.code}, Venda ${dispatchModalOrder.saleCode}) - Transp: ${carrierName}${dispatchTrackingCode ? `, Rastreio: ${dispatchTrackingCode}` : ''}`,
          userName: currentUser.name,
          companyId: currentCompany?.id || db.companyInfo?.id || 'comp-1'
        };
        newStockMovements.unshift(movement);
      }
    });

    // 2. Update order status to SAIU_PARA_ENTREGA
    const updatedItems = dispatchModalOrder.items.map(item => ({
      ...item,
      quantityReserved: 0,
      quantityReleased: item.quantitySold
    }));

    const updatedHistory = [
      ...dispatchModalOrder.history,
      createHistoryEvent(
        'SAIU_PARA_ENTREGA',
        'Despacho para Transportadora',
        `Volumes coletados/despachados via ${carrierName}${dispatchTrackingCode ? ` (Rastreio: ${dispatchTrackingCode})` : ''}. Baixa física definitiva de estoque executada.`
      )
    ];

    const updatedOrder: GoodsWithdrawalOrder = {
      ...dispatchModalOrder,
      items: updatedItems,
      status: 'SAIU_PARA_ENTREGA',
      carrierId: selectedCarrierId || dispatchModalOrder.carrierId,
      carrierName: carrierName,
      trackingCode: dispatchTrackingCode.trim() || dispatchModalOrder.trackingCode,
      notes: dispatchNotes.trim() ? `${dispatchModalOrder.notes ? dispatchModalOrder.notes + ' | ' : ''}${dispatchNotes.trim()}` : dispatchModalOrder.notes,
      releasedAt: now,
      updatedAt: now,
      history: updatedHistory
    };

    // 3. Save database
    onUpdateDb(prev => {
      const updatedWithdrawals = (prev.goodsWithdrawals || []).map(w => 
        w.id === updatedOrder.id ? updatedOrder : w
      );
      return {
        ...prev,
        parts: currentParts,
        stockMovements: newStockMovements,
        goodsWithdrawals: updatedWithdrawals
      };
    });

    setDispatchModalOrder(null);
    setSelectedOrder(updatedOrder);
  };

  // Action: Marcar como Entregue no destino final
  const handleMarkDelivered = (order: GoodsWithdrawalOrder) => {
    const now = new Date().toISOString();
    const updatedHistory = [
      ...order.history,
      createHistoryEvent(
        'ENTREGUE',
        'Entrega Concluída',
        `Confirmação de recebimento no endereço do destinatário realizada com sucesso.`
      )
    ];

    const updatedOrder: GoodsWithdrawalOrder = {
      ...order,
      status: 'ENTREGUE',
      deliveredAt: now,
      updatedAt: now,
      history: updatedHistory
    };

    saveUpdatedOrder(updatedOrder);
    setSelectedOrder(updatedOrder);
  };

  // Generic Save Helper
  const saveUpdatedOrder = (updatedOrder: GoodsWithdrawalOrder) => {
    onUpdateDb(prev => {
      const updatedWithdrawals = (prev.goodsWithdrawals || []).map(w => 
        w.id === updatedOrder.id ? updatedOrder : w
      );
      return {
        ...prev,
        goodsWithdrawals: updatedWithdrawals
      };
    });

    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
  };

  // Helper Badge Color & Label
  const getStatusBadge = (status: WithdrawalStatus) => {
    switch (status) {
      case 'AGUARDANDO_SEPARACAO':
        return {
          label: 'Aguardando Separação',
          color: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500'
        };
      case 'EM_SEPARACAO':
        return {
          label: 'Em Separação',
          color: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-500'
        };
      case 'PARCIALMENTE_SEPARADO':
        return {
          label: 'Parcialmente Separado',
          color: 'bg-orange-50 text-orange-700 border-orange-200/80',
          dot: 'bg-orange-500'
        };
      case 'PRONTO_RETIRADA':
        return {
          label: 'Pronto p/ Retirada',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500'
        };
      case 'PRONTO_ENTREGA':
        return {
          label: 'Pronto p/ Despacho',
          color: 'bg-teal-50 text-teal-700 border-teal-200/80',
          dot: 'bg-teal-500'
        };
      case 'SAIU_PARA_ENTREGA':
        return {
          label: 'Saiu p/ Entrega',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          dot: 'bg-indigo-500'
        };
      case 'RETIRADO':
        return {
          label: 'Retirado no Balcão',
          color: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-500'
        };
      case 'ENTREGUE':
        return {
          label: 'Entregue no Destino',
          color: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-500'
        };
      default:
        return {
          label: status,
          color: 'bg-slate-50 text-slate-600 border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="withdrawal-view-container">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display flex items-center gap-2.5">
              <Boxes className="w-6 h-6 text-indigo-600" />
              Retirada e Entrega de Mercadorias
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
              Expedição & Logística
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Controle integrado de reserva de estoque, separação física (picking), retirada em balcão e despacho por transportadora.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              id="btn-goto-sales-from-withdrawal"
              onClick={() => onNavigate('sales')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Store className="w-4 h-4 text-emerald-600" /> Frente de Caixa / Vendas
            </button>
          )}
          {onNavigate && (
            <button
              id="btn-goto-parts-from-withdrawal"
              onClick={() => onNavigate('parts')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Package className="w-4 h-4 text-indigo-600" /> Consultar Estoque
            </button>
          )}
        </div>
      </div>

      {/* Operational Stage KPI Filters (Clean Horizontal Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Todos</span>
          <span className="text-xl font-extrabold font-display mt-1">{counts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('AGUARDANDO_SEPARACAO')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'AGUARDANDO_SEPARACAO'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-700 border-amber-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Aguardando</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-amber-900">{counts.aguardando}</span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('EM_SEPARACAO')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'EM_SEPARACAO'
              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
              : 'bg-white text-slate-700 border-blue-200 hover:border-blue-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Em Separação</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-blue-900">{counts.emSeparacao}</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PARCIALMENTE_SEPARADO')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'PARCIALMENTE_SEPARADO'
              ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
              : 'bg-white text-slate-700 border-orange-200 hover:border-orange-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Pendências</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-orange-900">{counts.parcial}</span>
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PRONTO_RETIRADA')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'PRONTO_RETIRADA'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
              : 'bg-white text-slate-700 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">P/ Retirada</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-emerald-900">{counts.prontoRetirada}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PRONTO_ENTREGA')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'PRONTO_ENTREGA'
              ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
              : 'bg-white text-slate-700 border-teal-200 hover:border-teal-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">P/ Despacho</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-teal-900">{counts.prontoEntrega}</span>
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('SAIU_PARA_ENTREGA')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'SAIU_PARA_ENTREGA'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
              : 'bg-white text-slate-700 border-indigo-200 hover:border-indigo-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Em Trânsito</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-indigo-900">{counts.saiuEntrega}</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CONCLUIDOS')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'CONCLUIDOS'
              ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Concluídos</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-slate-800">{counts.concluidos}</span>
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-withdrawals"
            type="text"
            placeholder="Buscar por código, venda, cliente, transportadora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${typeFilter === 'ALL' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'}`}
            >
              Todos Tipos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('BALCAO')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${typeFilter === 'BALCAO' ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-500'}`}
            >
              <Store className="w-3.5 h-3.5" /> Retirada Balcão
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('ENTREGA')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${typeFilter === 'ENTREGA' ? 'bg-white shadow-2xs text-indigo-700' : 'text-slate-500'}`}
            >
              <Truck className="w-3.5 h-3.5" /> Entrega
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Table & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List Table (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Fila de Expedição ({filteredWithdrawals.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Clique em um pedido para ver detalhes e timeline
            </span>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Nenhum pedido de retirada/entrega encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de busca ou aguarde novas vendas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
              {filteredWithdrawals.map(order => {
                const badge = getStatusBadge(order.status);
                const isSelected = selectedOrder?.id === order.id;
                const totalItemsCount = order.items.reduce((sum, i) => sum + i.quantitySold, 0);
                const separatedCount = order.items.reduce((sum, i) => sum + (i.quantitySeparated || 0), 0);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 transition cursor-pointer hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {order.code}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          • Venda: {order.saleCode}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          order.type === 'BALCAO' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {order.type === 'BALCAO' ? <Store className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                          {order.type === 'BALCAO' ? 'Balcão' : 'Entrega'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800 truncate">
                          {order.clientName}
                        </span>
                        {order.clientPhone && (
                          <span className="text-slate-400 text-[11px] hidden sm:inline">
                            {order.clientPhone}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>
                          {order.items.length} {order.items.length === 1 ? 'produto' : 'produtos'} ({separatedCount}/{totalItemsCount} separados)
                        </span>
                        {order.carrierName && (
                          <span className="text-slate-400 truncate">
                            • Transp: {order.carrierName}
                          </span>
                        )}
                        <span className="text-slate-400">
                          • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons right in the list item */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                      {order.status === 'AGUARDANDO_SEPARACAO' && (
                        <button
                          type="button"
                          onClick={() => handleStartSeparation(order)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" /> Iniciar Separação
                        </button>
                      )}

                      {(order.status === 'EM_SEPARACAO' || order.status === 'PARCIALMENTE_SEPARADO') && (
                        <button
                          type="button"
                          onClick={() => handleOpenSeparationModal(order)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Conferir Itens
                        </button>
                      )}

                      {order.status === 'PRONTO_RETIRADA' && (
                        <button
                          type="button"
                          onClick={() => handleOpenReleaseModal(order)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Confirmar Retirada
                        </button>
                      )}

                      {order.status === 'PRONTO_ENTREGA' && (
                        <button
                          type="button"
                          onClick={() => handleOpenDispatchModal(order)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" /> Despachar Carga
                        </button>
                      )}

                      {order.status === 'SAIU_PARA_ENTREGA' && (
                        <button
                          type="button"
                          onClick={() => handleMarkDelivered(order)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Entrega
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPrintDocOrder(order)}
                        title="Imprimir Romaneio / Comprovante"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Order Detail & Operational Timeline (1 col on lg) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detalhes do Pedido</span>
                  <h3 className="font-display font-extrabold text-slate-800 text-base">{selectedOrder.code}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPrintDocOrder(selectedOrder)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${getStatusBadge(selectedOrder.status).color}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${getStatusBadge(selectedOrder.status).dot}`}></span>
                  <span className="text-xs font-bold">{getStatusBadge(selectedOrder.status).label}</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">
                  {selectedOrder.type === 'BALCAO' ? 'Retirada Loja' : 'Expedição Transportadora'}
                </span>
              </div>

              {/* Client & Destination Info */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Cliente:</span>
                  <span className="font-bold text-slate-800">{selectedOrder.clientName}</span>
                </div>
                {selectedOrder.clientPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Telefone:</span>
                    <span className="text-slate-700">{selectedOrder.clientPhone}</span>
                  </div>
                )}
                {selectedOrder.shippingAddress && (
                  <div className="space-y-0.5 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium block">Endereço de Entrega:</span>
                    <span className="text-slate-700 block">{selectedOrder.shippingAddress}</span>
                  </div>
                )}
                {selectedOrder.carrierName && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Transportadora:</span>
                    <span className="font-bold text-indigo-700">{selectedOrder.carrierName}</span>
                  </div>
                )}
                {selectedOrder.trackingCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Código Rastreio:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedOrder.trackingCode}</span>
                  </div>
                )}
                {selectedOrder.collectedByName && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Retirado por:</span>
                    <span className="font-bold text-emerald-800">{selectedOrder.collectedByName}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Itens Vendidos</span>
                  <span className="text-slate-400 text-[11px] font-normal">
                    {selectedOrder.items.length} itens
                  </span>
                </span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="p-2.5 bg-white flex items-center justify-between">
                      <div className="space-y-0.5 pr-2">
                        <p className="font-semibold text-slate-800 text-[11px] leading-tight">{item.partName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Cód: {item.partCode}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800 block text-xs">
                          {item.quantitySeparated || 0} / {item.quantitySold} un
                        </span>
                        <span className="text-[10px] text-slate-400">
                          R$ {item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" /> Histórico Operacional
                </span>
                <div className="space-y-3 max-h-44 overflow-y-auto pl-2 border-l-2 border-slate-200 ml-1.5">
                  {selectedOrder.history.map((h, i) => (
                    <div key={h.id || i} className="relative pl-3 space-y-0.5">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white"></div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-800">{h.action}</p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">{h.description}</p>
                      <p className="text-[9px] text-slate-400 font-medium">Por: {h.userName}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2 my-auto">
              <Boxes className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-600">Selecione um pedido na lista ao lado para ver os detalhes da expedição e a timeline de separação.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: SEPARAÇÃO DE ITENS (PICKING) */}
      {separationModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-lg w-full p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-display">
                    Conferência e Separação de Itens
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedido: {separationModalOrder.code} (Venda {separationModalOrder.saleCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSeparationModalOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confira as quantidades físicas separadas no estoque para cada item do pedido.
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-3">
              {separationModalOrder.items.map(item => (
                <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800">{item.partName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Cód: {item.partCode} | Vendido: {item.quantitySold} un</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] text-slate-500 font-medium">Separado:</label>
                    <input
                      type="number"
                      min={0}
                      max={item.quantitySold}
                      value={tempSeparatedQuantities[item.id] ?? item.quantitySold}
                      onChange={(e) => setTempSeparatedQuantities({
                        ...tempSeparatedQuantities,
                        [item.id]: Number(e.target.value)
                      })}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-center focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400">/ {item.quantitySold}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSeparationModalOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSeparation}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" /> Salvar Separação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR RETIRADA NO BALCÃO (EXECUTA BAIXA FÍSICA) */}
      {releaseModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-display">
                    Confirmar Retirada no Balcão
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedido: {releaseModalOrder.code} (Venda {releaseModalOrder.saleCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReleaseModalOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Baixa Definitiva de Estoque:
              </p>
              <p className="text-[11px] text-emerald-800">
                Ao confirmar a retirada, a quantidade reservada será liberada e o <strong>estoque físico será baixado definitivamente</strong> com movimentação de saída rastreada.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Nome de quem está retirando *
                </label>
                <input
                  type="text"
                  value={collectedByName}
                  onChange={(e) => setCollectedByName(e.target.value)}
                  placeholder="Nome completo do cliente ou portador"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Documento (RG / CPF)
                </label>
                <input
                  type="text"
                  value={collectedByDocument}
                  onChange={(e) => setCollectedByDocument(e.target.value)}
                  placeholder="Número do documento para recibo"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Observações de Entrega (Opcional)
                </label>
                <input
                  type="text"
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Ex: Entregue lacrado com cupom fiscal..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReleaseModalOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRelease}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" /> Confirmar Entrega e Baixar Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DESPACHO PARA TRANSPORTADORA (EXECUTA BAIXA FÍSICA) */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-display">
                    Despacho para Transportadora
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedido: {dispatchModalOrder.code} (Venda {dispatchModalOrder.saleCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" /> Baixa Definitiva de Estoque:
              </p>
              <p className="text-[11px] text-teal-800">
                Ao registrar a coleta/despacho, a mercadoria sai da empresa e o <strong>estoque físico é baixado definitivamente</strong>.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Transportadora Responsável
                </label>
                <select
                  value={selectedCarrierId}
                  onChange={(e) => setSelectedCarrierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Selecione uma transportadora...</option>
                  {(db.carriers || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.corporateName} {c.code ? `(${c.code})` : ''} - {c.city}/{c.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Código de Rastreio (Tracking)
                </label>
                <input
                  type="text"
                  value={dispatchTrackingCode}
                  onChange={(e) => setDispatchTrackingCode(e.target.value)}
                  placeholder="Ex: JAD-SP-99201"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Observações de Expedição (Opcional)
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Ex: Coleta efetuada às 14h, 2 volumes com DANFE..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Truck className="w-4 h-4" /> Registrar Despacho e Baixar Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ROMANEIO DE SEPARAÇÃO / COMPROVANTE DE ENTREGA IMPRESSO */}
      {printDocOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-2xl w-full p-8 rounded-2xl border border-slate-300 shadow-2xl space-y-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Romaneio de Expedição & Comprovante de Retirada
                </h2>
                <p className="text-xs text-slate-500">Documento operacional interno de conferência e entrega</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Imprimir Documento
                </button>
                <button
                  type="button"
                  onClick={() => setPrintDocOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="border border-slate-300 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{currentCompany?.name || db.companyInfo?.name || 'MotorDesk'}</h3>
                  <p className="text-[11px] text-slate-500">CNPJ: {currentCompany?.cnpj || db.companyInfo?.cnpj || '12.345.678/0001-90'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-extrabold text-sm text-slate-900">{printDocOrder.code}</p>
                  <p className="text-[11px] text-slate-500">Venda: {printDocOrder.saleCode}</p>
                  <p className="text-[10px] text-slate-400">Emissão: {new Date(printDocOrder.createdAt).toLocaleDateString()} {new Date(printDocOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-slate-700">DADOS DO CLIENTE / DESTINATÁRIO:</p>
                  <p className="font-semibold text-slate-900 mt-1">{printDocOrder.clientName}</p>
                  {printDocOrder.clientPhone && <p className="text-slate-600">Telefone: {printDocOrder.clientPhone}</p>}
                  {printDocOrder.shippingAddress && <p className="text-slate-600 mt-0.5">Endereço: {printDocOrder.shippingAddress}</p>}
                </div>
                <div>
                  <p className="font-bold text-slate-700">MODALIDADE DE EXPEDIÇÃO:</p>
                  <p className="font-semibold text-slate-900 mt-1">
                    {printDocOrder.type === 'BALCAO' ? '🏪 Retirada no Balcão' : '🚚 Entrega via Transportadora'}
                  </p>
                  {printDocOrder.carrierName && <p className="text-slate-600">Transportadora: {printDocOrder.carrierName}</p>}
                  {printDocOrder.trackingCode && <p className="text-slate-600 font-mono">Rastreio: {printDocOrder.trackingCode}</p>}
                  {printDocOrder.assignedOperator && <p className="text-slate-600">Separador: {printDocOrder.assignedOperator}</p>}
                </div>
              </div>

              {/* Items List */}
              <div>
                <p className="font-bold text-slate-700 mb-2">RELAÇÃO DE PRODUTOS E VOLUMES:</p>
                <table className="w-full text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                      <th className="p-2 border border-slate-200">Cód</th>
                      <th className="p-2 border border-slate-200">Descrição do Produto</th>
                      <th className="p-2 border border-slate-200 text-center">Qtd Vendida</th>
                      <th className="p-2 border border-slate-200 text-center">Qtd Separada</th>
                      <th className="p-2 border border-slate-200 text-center">Conferido [ ✓ ]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printDocOrder.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-200 font-mono text-[10px]">{item.partCode}</td>
                        <td className="p-2 border border-slate-200 font-medium">{item.partName}</td>
                        <td className="p-2 border border-slate-200 text-center font-bold">{item.quantitySold} un</td>
                        <td className="p-2 border border-slate-200 text-center font-bold text-indigo-700">{item.quantitySeparated || item.quantitySold} un</td>
                        <td className="p-2 border border-slate-200 text-center">
                          <div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200">
                <div className="text-center space-y-1">
                  <div className="border-b border-slate-400 w-4/5 mx-auto h-4"></div>
                  <p className="text-[10px] font-bold text-slate-700">Responsável pela Separação / Estoque</p>
                  <p className="text-[9px] text-slate-400">{printDocOrder.assignedOperator || currentUser.name}</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="border-b border-slate-400 w-4/5 mx-auto h-4"></div>
                  <p className="text-[10px] font-bold text-slate-700">Recebedor / Cliente / Transportador</p>
                  <p className="text-[9px] text-slate-400">Assinatura legível e Documento</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
