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
  ArrowUpRight,
  ClipboardList,
  Edit3,
  CheckSquare,
  Square,
  RotateCcw,
  Split,
  ChevronDown,
  Info
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

  // Modal 1: Romaneio & Conferência de Separação (Picking Editável)
  const [separationModalOrder, setSeparationModalOrder] = useState<GoodsWithdrawalOrder | null>(null);
  const [editableItems, setEditableItems] = useState<GoodsWithdrawalItem[]>([]);
  const [separationNotes, setSeparationNotes] = useState('');

  // Modal 2: Liberação / Retirada Balcão (com suporte a retirada parcial)
  const [releaseModalOrder, setReleaseModalOrder] = useState<GoodsWithdrawalOrder | null>(null);
  const [releaseMode, setReleaseMode] = useState<'total' | 'partial'>('total');
  const [partialWithdrawQuantities, setPartialWithdrawQuantities] = useState<{ [itemId: string]: number }>({});
  const [partialResidualDeliveries, setPartialResidualDeliveries] = useState<{ [itemId: string]: number }>({});
  const [collectedByName, setCollectedByName] = useState('');
  const [collectedByDocument, setCollectedByDocument] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  // Modal 3: Despacho para Transporte (com suporte a residual de entrega)
  const [dispatchModalOrder, setDispatchModalOrder] = useState<GoodsWithdrawalOrder | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [dispatchTrackingCode, setDispatchTrackingCode] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Modal 4: Visualização & Impressão Especializada do Romaneio
  const [romaneioModalOrder, setRomaneioModalOrder] = useState<GoodsWithdrawalOrder | null>(null);
  const [romaneioTab, setRomaneioTab] = useState<'separation' | 'delivery' | 'timeline'>('separation');

  // Status counts for operational chips
  const counts = useMemo(() => {
    return {
      all: withdrawals.length,
      aguardando: withdrawals.filter(w => w.status === 'AGUARDANDO_SEPARACAO').length,
      emSeparacao: withdrawals.filter(w => w.status === 'EM_SEPARACAO').length,
      parcialSeparado: withdrawals.filter(w => w.status === 'PARCIALMENTE_SEPARADO').length,
      prontoRetirada: withdrawals.filter(w => w.status === 'PRONTO_RETIRADA').length,
      prontoEntrega: withdrawals.filter(w => w.status === 'PRONTO_ENTREGA').length,
      parcialRetirado: withdrawals.filter(w => w.status === 'PARCIALMENTE_RETIRADO').length,
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

  // Action: Abrir Modal de Romaneio & Separação Operacional (Editável)
  const handleOpenSeparationModal = (order: GoodsWithdrawalOrder) => {
    setSeparationModalOrder(order);
    // Clonar itens com campos inicializados se necessário
    const itemsCopy: GoodsWithdrawalItem[] = order.items.map(item => {
      const partObj = (db.parts || []).find(p => p.id === item.partId);
      return {
        ...item,
        location: item.location || partObj?.location || 'Estoque Geral',
        unit: item.unit || partObj?.unit || 'UN',
        quantitySeparated: item.quantitySeparated !== undefined ? item.quantitySeparated : item.quantitySold,
        quantityReleased: item.quantityReleased || 0,
        quantityForDelivery: item.quantityForDelivery !== undefined 
          ? item.quantityForDelivery 
          : (order.type === 'ENTREGA' ? Math.max(0, item.quantitySold - (item.quantityReleased || 0)) : 0),
        isConferred: item.isConferred || false,
        divergenceNotes: item.divergenceNotes || '',
        missingQuantity: item.missingQuantity || 0,
        replacementPartName: item.replacementPartName || ''
      };
    });
    setEditableItems(itemsCopy);
    setSeparationNotes(order.notes || '');
  };

  // Action: Atualizar campos no item do Romaneio
  const handleUpdateItemField = (itemId: string, field: keyof GoodsWithdrawalItem, value: any) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-validações de limites numéricos
      if (field === 'quantitySeparated') {
        const val = Math.max(0, Math.min(item.quantitySold, Number(value) || 0));
        updated.quantitySeparated = val;
      }
      if (field === 'quantityForDelivery') {
        const maxDelivery = Math.max(0, item.quantitySold - (item.quantityReleased || 0));
        const val = Math.max(0, Math.min(maxDelivery, Number(value) || 0));
        updated.quantityForDelivery = val;
      }
      if (field === 'missingQuantity') {
        const val = Math.max(0, Math.min(item.quantitySold, Number(value) || 0));
        updated.missingQuantity = val;
      }
      return updated;
    }));
  };

  // Action: Separar Tudo (1-clique)
  const handleSeparateAll = () => {
    setEditableItems(prev => prev.map(item => ({
      ...item,
      quantitySeparated: item.quantitySold,
      isConferred: true,
      conferredAt: new Date().toISOString(),
      conferredBy: currentUser.name
    })));
  };

  // Action: Marcar todos conferidos
  const handleToggleAllConferred = () => {
    const allConferred = editableItems.every(i => i.isConferred);
    setEditableItems(prev => prev.map(item => ({
      ...item,
      isConferred: !allConferred,
      conferredAt: !allConferred ? new Date().toISOString() : undefined,
      conferredBy: !allConferred ? currentUser.name : undefined
    })));
  };

  // Action: Salvar Romaneio de Separação Operacional
  const handleSaveSeparation = () => {
    if (!separationModalOrder) return;

    let allSeparated = true;
    let anySeparated = false;
    let totalMissing = 0;

    editableItems.forEach(item => {
      if (item.quantitySeparated < item.quantitySold) {
        allSeparated = false;
      }
      if (item.quantitySeparated > 0) {
        anySeparated = true;
      }
      if (item.missingQuantity && item.missingQuantity > 0) {
        totalMissing += item.missingQuantity;
      }
    });

    let newStatus: WithdrawalStatus = 'EM_SEPARACAO';
    let actionLabel = 'Romaneio de Separação Atualizado';
    let desc = `Conferência operacional atualizada pelo operador ${currentUser.name}.`;

    // Preservar se já foi parcialmente retirado
    const hasAlreadyReleased = editableItems.some(i => (i.quantityReleased || 0) > 0);
    const hasPendingDelivery = editableItems.some(i => (i.quantityForDelivery || 0) > 0);

    if (hasAlreadyReleased && hasPendingDelivery) {
      newStatus = 'PARCIALMENTE_RETIRADO';
      actionLabel = 'Separação e Destinos Validados';
      desc = 'Romaneio com saldo parcial de entrega residual verificado e conferido.';
    } else if (allSeparated) {
      newStatus = separationModalOrder.type === 'BALCAO' ? 'PRONTO_RETIRADA' : 'PRONTO_ENTREGA';
      actionLabel = 'Separação Concluída (100%)';
      desc = separationModalOrder.type === 'BALCAO' 
        ? 'Todos os itens foram conferidos e estão prontos no balcão de retirada.' 
        : 'Todos os itens foram conferidos e estão prontos na doca de expedição aguardando transporte.';
    } else if (anySeparated) {
      newStatus = 'PARCIALMENTE_SEPARADO';
      actionLabel = 'Separação Parcial';
      desc = totalMissing > 0 
        ? `Itens parcialmente separados. Registrada divergência/falta de ${totalMissing} unidade(s).` 
        : 'Itens parcialmente separados no estoque. Aguardando conclusão dos demais produtos.';
    }

    const updatedHistory = [
      ...separationModalOrder.history,
      createHistoryEvent(newStatus, actionLabel, desc)
    ];

    const updatedOrder: GoodsWithdrawalOrder = {
      ...separationModalOrder,
      items: editableItems,
      status: newStatus,
      separatedAt: allSeparated ? new Date().toISOString() : separationModalOrder.separatedAt,
      assignedOperator: separationModalOrder.assignedOperator || currentUser.name,
      notes: separationNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
      history: updatedHistory
    };

    saveUpdatedOrder(updatedOrder);
    setSeparationModalOrder(null);
  };

  // Action: Abrir Modal de Liberação / Retirada Balcão (Suporte Total e Parcial)
  const handleOpenReleaseModal = (order: GoodsWithdrawalOrder) => {
    // Verificar se a empresa exige nota fiscal autorizada antes da liberação física
    const linkedSale = (db.sales || []).find(s => s.id === order.saleId || s.code === order.saleCode);
    const requireFiscalAuth = currentCompany?.requireAuthorizedFiscalBeforeRelease || db.companyInfo?.requireAuthorizedFiscalBeforeRelease;
    
    if (requireFiscalAuth && linkedSale && linkedSale.fiscalStatus !== 'authorized') {
      const confirmProceed = window.confirm(
        `⚠️ TRAVA FISCAL ATIVA: A empresa está configurada para exigir autorização fiscal da SEFAZ antes da liberação física da mercadoria.\n\nA venda #${linkedSale.code} está com status fiscal "${linkedSale.fiscalStatus || 'pendente'}".\n\nDeseja abrir a tela mesmo assim para conferência?`
      );
      if (!confirmProceed) return;
    }

    setReleaseModalOrder(order);
    setReleaseMode('total');
    setCollectedByName(order.clientName);
    setCollectedByDocument(order.clientDocument || '');
    setReleaseNotes('');

    // Preencher quantidades para retirada
    const initialWithdraw: { [itemId: string]: number } = {};
    const initialResidual: { [itemId: string]: number } = {};

    order.items.forEach(item => {
      const remainingToWithdraw = Math.max(0, item.quantitySold - (item.quantityReleased || 0));
      initialWithdraw[item.id] = remainingToWithdraw;
      initialResidual[item.id] = 0;
    });

    setPartialWithdrawQuantities(initialWithdraw);
    setPartialResidualDeliveries(initialResidual);
  };

  // Action: Confirmar Retirada Balcão (Baixa Física Definitiva apenas do que foi retirado!)
  const handleConfirmRelease = () => {
    if (!releaseModalOrder) return;
    if (!collectedByName.trim()) {
      alert('Por favor, informe o nome de quem está retirando a mercadoria.');
      return;
    }

    const now = new Date().toISOString();
    const isPartial = releaseMode === 'partial';

    // 1. Process physical stock deduction and release reservation ONLY for items being collected now
    const currentParts = [...(db.parts || [])];
    const newStockMovements: StockMovement[] = [...(db.stockMovements || [])];

    let totalUnitsWithdrawnNow = 0;
    let totalResidualForDelivery = 0;
    let anyItemStillPending = false;

    const updatedItems: GoodsWithdrawalItem[] = releaseModalOrder.items.map(item => {
      const availableToWithdraw = Math.max(0, item.quantitySold - (item.quantityReleased || 0));
      const qtyWithdrawnNow = isPartial 
        ? Math.max(0, Math.min(availableToWithdraw, Number(partialWithdrawQuantities[item.id] || 0)))
        : availableToWithdraw;

      const residualDelivery = isPartial
        ? Math.max(0, Math.min(availableToWithdraw - qtyWithdrawnNow, Number(partialResidualDeliveries[item.id] || (availableToWithdraw - qtyWithdrawnNow))))
        : 0;

      totalUnitsWithdrawnNow += qtyWithdrawnNow;
      totalResidualForDelivery += residualDelivery;

      const newReleased = (item.quantityReleased || 0) + qtyWithdrawnNow;
      const remainingReserved = Math.max(0, item.quantitySold - newReleased);

      if (remainingReserved > 0) {
        anyItemStillPending = true;
      }

      // Deduct physical stock for the units actually withdrawn
      if (qtyWithdrawnNow > 0) {
        const partIndex = currentParts.findIndex(p => p.id === item.partId);
        if (partIndex >= 0) {
          const p = currentParts[partIndex];
          const previousStock = p.stock;
          const previousReserved = p.reservedStock || 0;

          // Deduct physical stock and deduct reserved stock
          const newStock = Math.max(0, previousStock - qtyWithdrawnNow);
          const newReserved = Math.max(0, previousReserved - qtyWithdrawnNow);

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
            quantity: qtyWithdrawnNow,
            date: now,
            reason: 'sales',
            description: `Saída Física por Retirada no Balcão (${isPartial ? 'Parcial' : 'Total'}) - Pedido ${releaseModalOrder.code}, Venda ${releaseModalOrder.saleCode} - Retirado por: ${collectedByName.trim()}`,
            userName: currentUser.name,
            companyId: currentCompany?.id || db.companyInfo?.id || 'comp-1'
          };
          newStockMovements.unshift(movement);
        }
      }

      return {
        ...item,
        quantityReleased: newReleased,
        quantityWithdrawn: newReleased,
        quantityReserved: remainingReserved,
        quantityForDelivery: residualDelivery > 0 ? residualDelivery : (item.quantityForDelivery || 0)
      };
    });

    if (totalUnitsWithdrawnNow === 0) {
      alert('Nenhuma quantidade foi selecionada para retirada.');
      return;
    }

    // 2. Determinar novo status
    const newStatus: WithdrawalStatus = anyItemStillPending ? 'PARCIALMENTE_RETIRADO' : 'RETIRADO';
    const actionLabel = isPartial || anyItemStillPending ? 'Retirada Parcial no Balcão' : 'Retirada Balcão Concluída';
    const desc = isPartial || anyItemStillPending
      ? `Retirada parcial de ${totalUnitsWithdrawnNow} un por ${collectedByName.trim()}${collectedByDocument ? ` (Doc: ${collectedByDocument})` : ''}. Saldo residual de ${totalResidualForDelivery} un destinado para entrega/expedição posterior.`
      : `Mercadoria entregue no balcão para ${collectedByName.trim()}${collectedByDocument ? ` (Doc: ${collectedByDocument})` : ''}. Baixa física definitiva de estoque executada.`;

    const updatedHistory = [
      ...releaseModalOrder.history,
      createHistoryEvent(newStatus, actionLabel, desc)
    ];

    const updatedOrder: GoodsWithdrawalOrder = {
      ...releaseModalOrder,
      items: updatedItems,
      status: newStatus,
      collectedByName: collectedByName.trim(),
      collectedByDocument: collectedByDocument.trim() || undefined,
      notes: releaseNotes.trim() ? `${releaseModalOrder.notes ? releaseModalOrder.notes + ' | ' : ''}${releaseNotes.trim()}` : releaseModalOrder.notes,
      releasedAt: now,
      deliveredAt: !anyItemStillPending ? now : undefined,
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

  // Action: Abrir Modal de Despacho para Transporte (Entrega Residual / Total)
  const handleOpenDispatchModal = (order: GoodsWithdrawalOrder) => {
    setDispatchModalOrder(order);
    setSelectedCarrierId(order.carrierId || (db.carriers && db.carriers[0]?.id) || '');
    setDispatchTrackingCode(order.trackingCode || '');
    setDispatchNotes('');
  };

  // Action: Confirmar Despacho para Transportadora (Baixa física residual)
  const handleConfirmDispatch = () => {
    if (!dispatchModalOrder) return;

    const carrier = (db.carriers || []).find(c => c.id === selectedCarrierId);
    const carrierName = carrier ? (carrier.tradeName || carrier.corporateName) : dispatchModalOrder.carrierName || 'Transportadora Parceira';
    const now = new Date().toISOString();

    // 1. Process physical stock deduction only for residual items dispatched for delivery
    const currentParts = [...(db.parts || [])];
    const newStockMovements: StockMovement[] = [...(db.stockMovements || [])];

    const updatedItems = dispatchModalOrder.items.map(item => {
      const remainingReserved = item.quantityReserved || 0;
      const qtyToDeduct = remainingReserved; // Tudo o que ainda estava reservado sai para transporte

      if (qtyToDeduct > 0) {
        const partIndex = currentParts.findIndex(p => p.id === item.partId);
        if (partIndex >= 0) {
          const p = currentParts[partIndex];
          const previousStock = p.stock;
          const previousReserved = p.reservedStock || 0;

          const newStock = Math.max(0, previousStock - qtyToDeduct);
          const newReserved = Math.max(0, previousReserved - qtyToDeduct);

          currentParts[partIndex] = {
            ...p,
            stock: newStock,
            reservedStock: newReserved
          };

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
      }

      return {
        ...item,
        quantityReserved: 0,
        quantityDelivered: 0
      };
    });

    // 2. Update order status to SAIU_PARA_ENTREGA
    const updatedHistory = [
      ...dispatchModalOrder.history,
      createHistoryEvent(
        'SAIU_PARA_ENTREGA',
        'Despacho para Transportadora',
        `Volumes coletados/despachados via ${carrierName}${dispatchTrackingCode ? ` (Rastreio: ${dispatchTrackingCode})` : ''}. Baixa física de estoque concluída.`
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

  // Action: Abrir Modal de Visualização & Impressão de Romaneio
  const handleOpenRomaneioModal = (order: GoodsWithdrawalOrder, initialTab: 'separation' | 'delivery' = 'separation') => {
    setRomaneioModalOrder(order);
    setRomaneioTab(initialTab);
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
          label: 'Separação Parcial',
          color: 'bg-orange-50 text-orange-700 border-orange-200/80',
          dot: 'bg-orange-500'
        };
      case 'SEPARADO':
        return {
          label: 'Separado (Conferido)',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500'
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
      case 'PARCIALMENTE_RETIRADO':
        return {
          label: 'Parcialmente Retirado',
          color: 'bg-purple-50 text-purple-700 border-purple-200/80',
          dot: 'bg-purple-500'
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
              Retirada, Separação e Romaneios de Entrega
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
              Picking & Expedição Operacional
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestão operacional de romaneio de separação, conferência de estoque, retirada parcial no balcão e romaneio residual de entrega.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              id="btn-goto-sales-from-withdrawal"
              onClick={() => onNavigate('sales')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Store className="w-4 h-4 text-emerald-600" /> Balcão / Vendas
            </button>
          )}
          {onNavigate && (
            <button
              id="btn-goto-parts-from-withdrawal"
              onClick={() => onNavigate('parts')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Package className="w-4 h-4 text-indigo-600" /> Estoque de Peças
            </button>
          )}
        </div>
      </div>

      {/* Aviso Operacional de Empresa com Expedição Desativada */}
      {!currentCompany?.enableWithdrawalAndDelivery && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-xs animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                Fluxo de Expedição Inativo para esta Empresa ({currentCompany?.name || 'Comércio'})
              </h3>
              <span className="text-[10px] bg-amber-200/80 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                Venda Pronta Entrega
              </span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Esta empresa está operando no modo <strong>Venda Balcão Imediata</strong>. Quando uma venda é salva no caixa/PDV, a baixa física é efetuada imediatamente no estoque e a mercadoria é entregue ao cliente sem gerar pedidos pendentes nesta fila.
            </p>
            <p className="text-[11px] text-amber-700">
              Para utilizar a esteira logística de separação (picking), conferência e romaneios de entrega, ative a opção <strong>"Habilitar Expedição (Retirada & Entrega)"</strong> nas configurações da empresa em <em>Gestão de Usuários &rarr; Parâmetros da Empresa</em>.
            </p>
          </div>
        </div>
      )}

      {/* Operational Stage KPI Filters */}
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Sep. Parcial</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-orange-900">{counts.parcialSeparado}</span>
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
          onClick={() => setStatusFilter('PARCIALMENTE_RETIRADO')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'PARCIALMENTE_RETIRADO'
              ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
              : 'bg-white text-slate-700 border-purple-200 hover:border-purple-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Parcial Retirado</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold font-display text-purple-900">{counts.parcialRetirado}</span>
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
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
                Fila de Expedição e Romaneios ({filteredWithdrawals.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Clique em um pedido para ver romaneio e auditoria
            </span>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Nenhum pedido de retirada/entrega encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de busca ou aguarde novas vendas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
              {filteredWithdrawals.map(order => {
                const badge = getStatusBadge(order.status);
                const isSelected = selectedOrder?.id === order.id;
                
                const totalSold = order.items.reduce((sum, i) => sum + i.quantitySold, 0);
                const totalSeparated = order.items.reduce((sum, i) => sum + (i.quantitySeparated || 0), 0);
                const totalReleased = order.items.reduce((sum, i) => sum + (i.quantityReleased || 0), 0);
                const totalForDelivery = order.items.reduce((sum, i) => sum + (i.quantityForDelivery || 0), 0);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 transition cursor-pointer hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {order.code}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Venda: #{order.saleCode}
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
                        <span className="font-bold text-slate-800 truncate">
                          {order.clientName}
                        </span>
                        {order.clientPhone && (
                          <span className="text-slate-400 text-[11px] hidden sm:inline">
                            • {order.clientPhone}
                          </span>
                        )}
                        {order.assignedOperator && (
                          <span className="text-indigo-600 text-[11px] font-medium hidden md:inline">
                            • Resp: {order.assignedOperator}
                          </span>
                        )}
                      </div>

                      {/* Romaneio Metrics Bar (Vendido, Separado, Retirado, Entrega) */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
                          Vendido: <strong>{totalSold} un</strong>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-semibold ${totalSeparated >= totalSold ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          Separado: <strong>{totalSeparated}/{totalSold} un</strong>
                        </span>
                        {totalReleased > 0 && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-semibold border border-purple-200">
                            Retirado: <strong>{totalReleased} un</strong>
                          </span>
                        )}
                        {totalForDelivery > 0 && (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md font-semibold border border-teal-200">
                            P/ Entrega: <strong>{totalForDelivery} un</strong>
                          </span>
                        )}
                        {order.carrierName && (
                          <span className="text-slate-400 truncate text-[10px]">
                            • Transp: {order.carrierName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                      {/* Romaneio Quick View Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenRomaneioModal(order, 'separation')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Visualizar Romaneio Completo"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-indigo-600" /> Romaneio
                      </button>

                      {order.status === 'AGUARDANDO_SEPARACAO' && (
                        <button
                          type="button"
                          onClick={() => handleStartSeparation(order)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" /> Iniciar
                        </button>
                      )}

                      {(order.status === 'EM_SEPARACAO' || order.status === 'PARCIALMENTE_SEPARADO') && (
                        <button
                          type="button"
                          onClick={() => handleOpenSeparationModal(order)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Conferir
                        </button>
                      )}

                      {(order.status === 'PRONTO_RETIRADA' || order.status === 'PARCIALMENTE_RETIRADO') && (
                        <button
                          type="button"
                          onClick={() => handleOpenReleaseModal(order)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Liberar Balcão
                        </button>
                      )}

                      {(order.status === 'PRONTO_ENTREGA' || (order.status === 'PARCIALMENTE_RETIRADO' && totalForDelivery > 0)) && (
                        <button
                          type="button"
                          onClick={() => handleOpenDispatchModal(order)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" /> Despachar
                        </button>
                      )}

                      {order.status === 'SAIU_PARA_ENTREGA' && (
                        <button
                          type="button"
                          onClick={() => handleMarkDelivered(order)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Entregue
                        </button>
                      )}

                      {/* Dropdown / Print Direct */}
                      <button
                        type="button"
                        onClick={() => handleOpenRomaneioModal(order, totalForDelivery > 0 && order.status === 'PARCIALMENTE_RETIRADO' ? 'delivery' : 'separation')}
                        title="Imprimir Romaneio"
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Romaneio Operacional</span>
                  <h3 className="font-display font-extrabold text-slate-800 text-base">{selectedOrder.code}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenSeparationModal(selectedOrder)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Editar Conferência e Separação"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRomaneioModal(selectedOrder, 'separation')}
                    className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                  </button>
                </div>
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

              {/* Metrics Summary Pill Group */}
              <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div className="p-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Vendido</span>
                  <span className="font-extrabold text-slate-800 text-xs">
                    {selectedOrder.items.reduce((s, i) => s + i.quantitySold, 0)}
                  </span>
                </div>
                <div className="p-1.5 border-l border-slate-200">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Separado</span>
                  <span className="font-extrabold text-blue-700 text-xs">
                    {selectedOrder.items.reduce((s, i) => s + (i.quantitySeparated || 0), 0)}
                  </span>
                </div>
                <div className="p-1.5 border-l border-slate-200">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Retirado</span>
                  <span className="font-extrabold text-purple-700 text-xs">
                    {selectedOrder.items.reduce((s, i) => s + (i.quantityReleased || 0), 0)}
                  </span>
                </div>
                <div className="p-1.5 border-l border-slate-200">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">P/ Entrega</span>
                  <span className="font-extrabold text-teal-700 text-xs">
                    {selectedOrder.items.reduce((s, i) => s + (i.quantityForDelivery || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Client & Destination Info */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
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
                    <span className="text-slate-500 font-medium">Última Retirada por:</span>
                    <span className="font-bold text-purple-800">{selectedOrder.collectedByName}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Itens do Romaneio</span>
                  <span className="text-slate-400 text-[11px] font-normal">
                    {selectedOrder.items.length} itens
                  </span>
                </span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs max-h-48 overflow-y-auto">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={item.id} className="p-2.5 bg-white flex items-center justify-between gap-2">
                      <div className="space-y-0.5 pr-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-400">#{String(idx + 1).padStart(2, '0')}</span>
                          <p className="font-semibold text-slate-800 text-[11px] truncate">{item.partName}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.partCode} {item.location ? `• Local: ${item.location}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 text-[11px]">
                        <span className="font-bold text-slate-800 block">
                          {item.quantitySeparated || 0} / {item.quantitySold} un
                        </span>
                        <div className="flex items-center gap-1 text-[10px] justify-end">
                          {(item.quantityReleased || 0) > 0 && (
                            <span className="text-purple-600 font-semibold">{item.quantityReleased} ret.</span>
                          )}
                          {(item.quantityForDelivery || 0) > 0 && (
                            <span className="text-teal-600 font-semibold">{item.quantityForDelivery} ent.</span>
                          )}
                          {item.isConferred && (
                            <span className="text-emerald-600 font-bold">✓</span>
                          )}
                        </div>
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
                <div className="space-y-3 max-h-40 overflow-y-auto pl-2 border-l-2 border-slate-200 ml-1.5">
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
              <p className="text-xs font-medium text-slate-600">Selecione um pedido na lista ao lado para ver o romaneio operacional e o histórico completo.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ROMANEIO & CONFERÊNCIA DE SEPARAÇÃO (PICKING OPERACIONAL EDITÁVEL) */}
      {separationModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-4xl w-full p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-5 animate-slide-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-display">
                    Romaneio de Separação & Conferência Operacional
                  </h3>
                  <p className="text-xs text-slate-500">
                    Romaneio: {separationModalOrder.code} | Venda #{separationModalOrder.saleCode} | Cliente: {separationModalOrder.clientName}
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

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Ações Rápidas:</span>
                <button
                  type="button"
                  onClick={handleSeparateAll}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Separar Tudo (100%)
                </button>
                <button
                  type="button"
                  onClick={handleToggleAllConferred}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Alternar Conferência [✓]
                </button>
              </div>

              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Regra:</span> A quantidade vendida é imutável. O operador ajusta a separação física e destinação.
              </div>
            </div>

            {/* Editable Separation Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-3 text-center w-12">Seq</th>
                    <th className="p-3">Código / Produto</th>
                    <th className="p-3">Local Estoque</th>
                    <th className="p-3 text-center">Vendido</th>
                    <th className="p-3 text-center">Separado</th>
                    <th className="p-3 text-center">Retirada Balcão</th>
                    <th className="p-3 text-center">Entrega Residual</th>
                    <th className="p-3 text-center">Conferido</th>
                    <th className="p-3">Divergência / Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editableItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 text-center font-mono font-bold text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-800">{item.partName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Cód: {item.partCode}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-mono">
                          {item.location || 'Estoque'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                          {item.quantitySold} un
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={item.quantitySold}
                          value={item.quantitySeparated}
                          onChange={(e) => handleUpdateItemField(item.id, 'quantitySeparated', e.target.value)}
                          className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-indigo-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-purple-700">
                          {item.quantityReleased || 0} un
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={Math.max(0, item.quantitySold - (item.quantityReleased || 0))}
                          value={item.quantityForDelivery || 0}
                          onChange={(e) => handleUpdateItemField(item.id, 'quantityForDelivery', e.target.value)}
                          className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-teal-700 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemField(item.id, 'isConferred', !item.isConferred)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            item.isConferred 
                              ? 'bg-emerald-100 text-emerald-700 font-bold' 
                              : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {item.isConferred ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.divergenceNotes || ''}
                          onChange={(e) => handleUpdateItemField(item.id, 'divergenceNotes', e.target.value)}
                          placeholder="Ex: Falta de 1 un / lote substituto"
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* General Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Observações Gerais do Romaneio
              </label>
              <textarea
                value={separationNotes}
                onChange={(e) => setSeparationNotes(e.target.value)}
                placeholder="Observações da equipe de estoque, doca de expedição ou orientações ao cliente..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" /> Salvar Romaneio de Separação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR RETIRADA NO BALCÃO (SUPORTE A RETIRADA PARCIAL E BAIXA FÍSICA) */}
      {releaseModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-xl w-full p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4 animate-slide-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-display">
                    Liberação de Retirada no Balcão
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedido: {releaseModalOrder.code} | Venda #{releaseModalOrder.saleCode}
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

            {/* Mode Selector: Total vs Parcial */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setReleaseMode('total')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  releaseMode === 'total' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Retirada Total (Todos os Itens)
              </button>
              <button
                type="button"
                onClick={() => setReleaseMode('partial')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  releaseMode === 'partial' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Split className="w-4 h-4" /> Retirada Parcial (Parte Balcão / Parte Entrega)
              </button>
            </div>

            {/* Stock Policy Notice */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Baixa Física Conforme Retirada:
              </p>
              <p className="text-[11px] text-emerald-800 leading-snug">
                Apenas as unidades retiradas agora serão baixadas do saldo físico e liberadas da reserva. 
                {releaseMode === 'partial' ? ' O saldo não retirado permanecerá reservado no estoque para o romaneio de entrega residual.' : ''}
              </p>
            </div>

            {/* Items Quantity Selection */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5 text-center">Vendido</th>
                    <th className="p-2.5 text-center">Já Retirado</th>
                    <th className="p-2.5 text-center">Retirar Agora</th>
                    {releaseMode === 'partial' && (
                      <th className="p-2.5 text-center">Saldo Entrega</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {releaseModalOrder.items.map(item => {
                    const remainingToWithdraw = Math.max(0, item.quantitySold - (item.quantityReleased || 0));
                    const withdrawNow = releaseMode === 'total' 
                      ? remainingToWithdraw 
                      : (partialWithdrawQuantities[item.id] ?? remainingToWithdraw);
                    const residualDelivery = remainingToWithdraw - withdrawNow;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <p className="font-semibold text-slate-800">{item.partName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.partCode}</p>
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-700">
                          {item.quantitySold}
                        </td>
                        <td className="p-2.5 text-center font-bold text-purple-700">
                          {item.quantityReleased || 0}
                        </td>
                        <td className="p-2.5 text-center">
                          {releaseMode === 'total' ? (
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                              {remainingToWithdraw} un
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={remainingToWithdraw}
                              value={withdrawNow}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(remainingToWithdraw, Number(e.target.value) || 0));
                                setPartialWithdrawQuantities({
                                  ...partialWithdrawQuantities,
                                  [item.id]: val
                                });
                                setPartialResidualDeliveries({
                                  ...partialResidualDeliveries,
                                  [item.id]: remainingToWithdraw - val
                                });
                              }}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-emerald-700 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          )}
                        </td>
                        {releaseMode === 'partial' && (
                          <td className="p-2.5 text-center">
                            <span className={`font-bold px-2 py-1 rounded ${residualDelivery > 0 ? 'bg-teal-50 text-teal-700' : 'text-slate-400'}`}>
                              {residualDelivery} un
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Recipient Details */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <Check className="w-4 h-4" /> Confirmar Retirada e Baixar Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DESPACHO PARA TRANSPORTADORA (ENTREGA RESIDUAL / TOTAL) */}
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
                    Despacho de Romaneio de Entrega
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedido: {dispatchModalOrder.code} | Venda #{dispatchModalOrder.saleCode}
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
                <ShieldCheck className="w-4 h-4 text-teal-600" /> Baixa Física Residual de Entrega:
              </p>
              <p className="text-[11px] text-teal-800">
                Ao registrar o despacho, os itens e quantidades destinados à entrega saem da empresa e o <strong>estoque físico correspondente é baixado definitivamente</strong>.
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

      {/* MODAL 4: VISUALIZAÇÃO E IMPRESSÃO ESPECIALIZADA DO ROMANEIO (SEPARAÇÃO VS ENTREGA RESIDUAL) */}
      {romaneioModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-3xl w-full p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-2xl space-y-5 animate-slide-up max-h-[92vh] overflow-y-auto">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Visualização e Impressão de Romaneio
                </h2>
                <p className="text-xs text-slate-500">
                  Pedido: {romaneioModalOrder.code} | Venda #{romaneioModalOrder.saleCode}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Imprimir Documento
                </button>
                <button
                  type="button"
                  onClick={() => setRomaneioModalOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sub-tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRomaneioTab('separation')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  romaneioTab === 'separation' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> 📋 Romaneio de Separação (Picking Completo)
              </button>
              <button
                type="button"
                onClick={() => setRomaneioTab('delivery')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  romaneioTab === 'delivery' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-4 h-4" /> 🚚 Romaneio de Entrega Residual
              </button>
              <button
                type="button"
                onClick={() => setRomaneioTab('timeline')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  romaneioTab === 'timeline' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4" /> 📜 Histórico de Movimentações
              </button>
            </div>

            {/* DOCUMENT BODY 1: ROMANEIO DE SEPARAÇÃO (PICKING GERAL) */}
            {romaneioTab === 'separation' && (
              <div className="border border-slate-300 rounded-xl p-5 space-y-4 text-xs bg-white print:border-none print:p-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{currentCompany?.name || db.companyInfo?.name || 'MotorDesk'}</h3>
                    <p className="text-[11px] text-slate-500">CNPJ: {currentCompany?.cnpj || db.companyInfo?.cnpj || '12.345.678/0001-90'}</p>
                    <p className="text-[11px] text-slate-500">{currentCompany?.address || db.companyInfo?.address || 'São Paulo - SP'}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-[10px] uppercase">
                      ROMANEIO DE SEPARAÇÃO / PICKING
                    </span>
                    <p className="font-mono font-extrabold text-sm text-slate-900 mt-1">{romaneioModalOrder.code}</p>
                    <p className="text-[11px] text-slate-500">Venda: #{romaneioModalOrder.saleCode}</p>
                    <p className="text-[10px] text-slate-400">Emissão: {new Date(romaneioModalOrder.createdAt).toLocaleDateString()} {new Date(romaneioModalOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-700">DADOS DO CLIENTE / SOLICITANTE:</p>
                    <p className="font-semibold text-slate-900 mt-1">{romaneioModalOrder.clientName}</p>
                    {romaneioModalOrder.clientDocument && <p className="text-slate-600">Doc: {romaneioModalOrder.clientDocument}</p>}
                    {romaneioModalOrder.clientPhone && <p className="text-slate-600">Telefone: {romaneioModalOrder.clientPhone}</p>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">DADOS DA OPERAÇÃO:</p>
                    <p className="font-semibold text-slate-900 mt-1">
                      Tipo: {romaneioModalOrder.type === 'BALCAO' ? '🏪 Retirada Balcão' : '🚚 Entrega'}
                    </p>
                    <p className="text-slate-600">Separador: {romaneioModalOrder.assignedOperator || currentUser.name}</p>
                    {romaneioModalOrder.notes && <p className="text-slate-600 text-[11px]">Obs: {romaneioModalOrder.notes}</p>}
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <p className="font-bold text-slate-700 mb-2">RELAÇÃO DE ITENS PARA SEPARAÇÃO FÍSICA:</p>
                  <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                        <th className="p-2 border border-slate-200 text-center w-10">Seq</th>
                        <th className="p-2 border border-slate-200">Código</th>
                        <th className="p-2 border border-slate-200">Descrição do Produto</th>
                        <th className="p-2 border border-slate-200">Local Estoque</th>
                        <th className="p-2 border border-slate-200 text-center">Vendido</th>
                        <th className="p-2 border border-slate-200 text-center">Separado</th>
                        <th className="p-2 border border-slate-200 text-center">Retirado</th>
                        <th className="p-2 border border-slate-200 text-center">Entrega</th>
                        <th className="p-2 border border-slate-200 text-center">Conferido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {romaneioModalOrder.items.map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-200 font-mono text-center font-bold text-slate-400">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="p-2 border border-slate-200 font-mono text-[11px]">{item.partCode}</td>
                          <td className="p-2 border border-slate-200 font-medium">
                            {item.partName}
                            {item.divergenceNotes && (
                              <p className="text-[10px] text-amber-700 mt-0.5">Obs: {item.divergenceNotes}</p>
                            )}
                          </td>
                          <td className="p-2 border border-slate-200 font-mono text-[11px]">
                            {item.location || 'Geral'}
                          </td>
                          <td className="p-2 border border-slate-200 text-center font-bold">{item.quantitySold} un</td>
                          <td className="p-2 border border-slate-200 text-center font-bold text-indigo-700">{item.quantitySeparated || item.quantitySold} un</td>
                          <td className="p-2 border border-slate-200 text-center text-purple-700 font-semibold">{item.quantityReleased || 0} un</td>
                          <td className="p-2 border border-slate-200 text-center text-teal-700 font-semibold">{item.quantityForDelivery || 0} un</td>
                          <td className="p-2 border border-slate-200 text-center">
                            {item.isConferred ? (
                              <span className="text-emerald-600 font-extrabold text-sm">✓</span>
                            ) : (
                              <div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div>
                            )}
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
                    <p className="text-[10px] font-bold text-slate-700">Responsável pela Separação</p>
                    <p className="text-[9px] text-slate-400">{romaneioModalOrder.assignedOperator || currentUser.name}</p>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-400 w-4/5 mx-auto h-4"></div>
                    <p className="text-[10px] font-bold text-slate-700">Conferente / Responsável do Estoque</p>
                    <p className="text-[9px] text-slate-400">Assinatura legível e Carimbo</p>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENT BODY 2: ROMANEIO DE ENTREGA RESIDUAL */}
            {romaneioTab === 'delivery' && (
              <div className="border border-slate-300 rounded-xl p-5 space-y-4 text-xs bg-white print:border-none print:p-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{currentCompany?.name || db.companyInfo?.name || 'MotorDesk'}</h3>
                    <p className="text-[11px] text-slate-500">CNPJ: {currentCompany?.cnpj || db.companyInfo?.cnpj || '12.345.678/0001-90'}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded font-bold text-[10px] uppercase">
                      ROMANEIO DE ENTREGA RESIDUAL
                    </span>
                    <p className="font-mono font-extrabold text-sm text-slate-900 mt-1">{romaneioModalOrder.code}-ENT</p>
                    <p className="text-[11px] text-slate-500">Venda: #{romaneioModalOrder.saleCode}</p>
                    <p className="text-[10px] text-slate-400">Emissão: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {/* Logistics Header Box */}
                <div className="grid grid-cols-2 gap-4 bg-teal-50/50 p-3 rounded-lg border border-teal-200">
                  <div>
                    <p className="font-bold text-slate-700">DESTINATÁRIO & ENDEREÇO DE ENTREGA:</p>
                    <p className="font-bold text-slate-900 mt-1">{romaneioModalOrder.clientName}</p>
                    {romaneioModalOrder.clientDocument && <p className="text-slate-600">Doc: {romaneioModalOrder.clientDocument}</p>}
                    {romaneioModalOrder.clientPhone && <p className="text-slate-600">Telefone: {romaneioModalOrder.clientPhone}</p>}
                    <p className="text-slate-700 font-medium mt-1">
                      Endereço: {romaneioModalOrder.shippingAddress || 'Endereço cadastrado no cliente'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">TRANSPORTE & LOGÍSTICA:</p>
                    <p className="text-slate-800 mt-1">
                      Transportadora: <strong>{romaneioModalOrder.carrierName || 'Frota Própria / Portador'}</strong>
                    </p>
                    {romaneioModalOrder.trackingCode && (
                      <p className="text-slate-700 font-mono font-semibold">
                        Código de Rastreio: {romaneioModalOrder.trackingCode}
                      </p>
                    )}
                    <p className="text-slate-600 mt-1">
                      Status da Entrega: <strong className="text-teal-700">{getStatusBadge(romaneioModalOrder.status).label}</strong>
                    </p>
                  </div>
                </div>

                {/* Delivery Items Table (Residual Only) */}
                <div>
                  <p className="font-bold text-slate-700 mb-2">ITENS DESTINADOS À ENTREGA (SALDO RESIDUAL):</p>
                  {romaneioModalOrder.items.filter(i => (i.quantityForDelivery || 0) > 0 || (romaneioModalOrder.type === 'ENTREGA' && (i.quantitySold - (i.quantityReleased || 0)) > 0)).length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500">
                      Não há itens pendentes para entrega neste pedido (mercadoria 100% retirada no balcão).
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                          <th className="p-2 border border-slate-200 text-center w-10">Seq</th>
                          <th className="p-2 border border-slate-200">Código</th>
                          <th className="p-2 border border-slate-200">Descrição do Produto</th>
                          <th className="p-2 border border-slate-200 text-center">Qtd p/ Entrega</th>
                          <th className="p-2 border border-slate-200 text-center">Unidade</th>
                          <th className="p-2 border border-slate-200 text-center">Conferido [ ✓ ]</th>
                        </tr>
                      </thead>
                      <tbody>
                        {romaneioModalOrder.items
                          .filter(i => (i.quantityForDelivery || 0) > 0 || (romaneioModalOrder.type === 'ENTREGA' && (i.quantitySold - (i.quantityReleased || 0)) > 0))
                          .map((item, idx) => {
                            const qtyDelivery = item.quantityForDelivery || Math.max(0, item.quantitySold - (item.quantityReleased || 0));
                            return (
                              <tr key={item.id} className="border-b border-slate-200">
                                <td className="p-2 border border-slate-200 font-mono text-center font-bold text-slate-400">
                                  {String(idx + 1).padStart(2, '0')}
                                </td>
                                <td className="p-2 border border-slate-200 font-mono text-[11px]">{item.partCode}</td>
                                <td className="p-2 border border-slate-200 font-medium">{item.partName}</td>
                                <td className="p-2 border border-slate-200 text-center font-extrabold text-teal-800 text-sm">
                                  {qtyDelivery}
                                </td>
                                <td className="p-2 border border-slate-200 text-center font-semibold text-slate-500">
                                  {item.unit || 'UN'}
                                </td>
                                <td className="p-2 border border-slate-200 text-center">
                                  <div className="w-4 h-4 border border-slate-400 mx-auto rounded-xs"></div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Canhoto de Recebimento & Assinatura do Cliente */}
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 space-y-3 mt-4">
                  <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                    COMPROVANTE DE RECEBIMENTO DE MERCADORIA
                  </p>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    Declaro que recebi os produtos constantes neste Romaneio de Entrega Residual em perfeitas condições de uso e embalagem.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-700">Data e Hora:</p>
                      <div className="border-b border-slate-400 h-6 mt-1"></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-700">Nome Legível do Recebedor:</p>
                      <div className="border-b border-slate-400 h-6 mt-1"></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-700">Documento (RG/CPF) e Assinatura:</p>
                      <div className="border-b border-slate-400 h-6 mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENT BODY 3: HISTÓRICO & AUDITORIA */}
            {romaneioTab === 'timeline' && (
              <div className="border border-slate-200 rounded-xl p-5 space-y-4 text-xs bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Linha do Tempo de Movimentações e Auditoria</h3>
                    <p className="text-[11px] text-slate-500">Histórico completo de picking, conferência, retiradas parciais e despachos</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-indigo-700">
                    {romaneioModalOrder.history.length} eventos registrados
                  </span>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-indigo-200 ml-2 py-2">
                  {romaneioModalOrder.history.map((h, idx) => (
                    <div key={h.id || idx} className="relative pl-4 space-y-1">
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{h.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{h.description}</p>
                      <p className="text-slate-400 text-[10px] font-medium">Operador: {h.userName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
