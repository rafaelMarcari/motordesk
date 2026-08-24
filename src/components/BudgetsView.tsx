/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Check, 
  X, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Wrench, 
  Package, 
  Eye,
  Settings,
  MessageSquare,
  Send,
  Pencil,
  Printer,
  Clock,
  Info,
  AlertTriangle,
  Calendar,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { Budget, BudgetItem, Client, Vehicle, Part, Service, ServiceOrder, OSItem, SystemNotification, CompanyInfo, CommercialSale, CommercialSaleItem, BusinessType } from '../types';
import { AppDatabase } from '../data/mockData';
import ShareDocumentModal from './ShareDocumentModal';
import { getPartStockDetails, getReservingBudgetsForPart, ReservingBudgetInfo } from '../utils/stockUtils';
import { syncServiceOrdersWithBudgets } from '../utils/serviceOrderUtils';
import WarrantyAlertBanner from './WarrantyAlertBanner';

interface BudgetsViewProps {
  db: AppDatabase;
  currentUser: any;
  businessType?: BusinessType;
  currentCompany?: CompanyInfo;
  onNavigate?: (view: string) => void;
  onSaveBudgets: (budgets: Budget[]) => void;
  onSaveServiceOrders: (os: ServiceOrder[]) => void;
  onSaveSales?: (sales: CommercialSale[]) => void;
  onUpdateDb?: (db: AppDatabase) => void;
  onSaveCompanyInfo?: (companyInfo: CompanyInfo) => void;
  onAddNotification?: (notification: SystemNotification) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string, metadata?: any) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

export default function BudgetsView({ 
  db, 
  currentUser, 
  businessType = 'OFICINA',
  currentCompany,
  onNavigate,
  onSaveBudgets, 
  onSaveServiceOrders, 
  onSaveSales,
  onUpdateDb,
  onSaveCompanyInfo, 
  onAddNotification, 
  onAddHistoryLog, 
  setUnsavedTask 
}: BudgetsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [viewingBudget, setViewingBudget] = useState<Budget | null>(null);
  const [isApprovalSimOpen, setIsApprovalSimOpen] = useState(false);

  // Check role & user permissions
  const canEditBudgets = currentUser?.role === 'admin' || currentUser?.permissions?.canEditBudgets !== false;

  // Active Company Reservation Settings
  const activeCompany = currentCompany || db.companyInfo;
  const reservationMode = activeCompany?.budgetStockReservationMode || 'none';
  const defaultValidityDays = activeCompany?.budgetStockReservationValidityDays || 10;

  // Segment detection
  const isCommerceOnly = businessType === 'COMERCIO';
  const isHybrid = businessType === 'OFICINA_COMERCIO';
  const isWorkshopOnly = businessType === 'OFICINA';

  // Form Fields
  const [budgetType, setBudgetType] = useState<'OFICINA' | 'COMERCIO'>(isCommerceOnly ? 'COMERCIO' : 'OFICINA');
  const [clientId, setClientId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [validityDays, setValidityDays] = useState<number>(defaultValidityDays);
  const [notes, setNotes] = useState('');
  const [customerComplaint, setCustomerComplaint] = useState('');
  const [isWarrantyReturn, setIsWarrantyReturn] = useState(false);
  const [warrantyOriginOSId, setWarrantyOriginOSId] = useState<string | undefined>(undefined);
  
  // Current Budget Items Builder
  const [items, setItems] = useState<BudgetItem[]>([]);
  
  // Item Addition State
  const [addingType, setAddingType] = useState<'part' | 'service'>('part');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [addingQty, setAddingQty] = useState<number>(1);

  // Partial Approval States
  const [simApprovedItems, setSimApprovedItems] = useState<{ [itemId: string]: 'approved' | 'postponed' | 'rejected' }>({});
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>('');
  const [simBillingMode, setSimBillingMode] = useState<'pay_after' | 'pay_now'>('pay_after');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Conversion Loading / Lock state
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Stock Reservation Warning Modal State
  const [reservationModalData, setReservationModalData] = useState<{
    isOpen: boolean;
    part: Part;
    addingQty: number;
    totalRequestedQty: number;
    availableStock: number;
    totalReservedInOthers: number;
    reservingBudgets: ReservingBudgetInfo[];
    clientAgreementNote: string;
    pendingItemToInsert: BudgetItem;
    crossSellItemsToInsert?: BudgetItem[];
    crossSellAddedNames?: string[];
  } | null>(null);

  // Share Modal State (WhatsApp & Email)
  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    budget: Budget | null;
  }>({ isOpen: false, budget: null });

  // Auto-select first client/vehicle/part/service when launching form
  useEffect(() => {
    if (isFormOpen && !editingBudgetId) {
      if (db.clients.length > 0 && !clientId) {
        setClientId(db.clients[0].id);
      }
      if (db.parts.length > 0 && !selectedPartId) {
        setSelectedPartId(db.parts[0].id);
      }
      if (db.services.length > 0 && !selectedServiceId) {
        setSelectedServiceId(db.services[0].id);
      }
      setBudgetType(isCommerceOnly ? 'COMERCIO' : 'OFICINA');
      setValidityDays(defaultValidityDays);
    }
  }, [isFormOpen, db, editingBudgetId, isCommerceOnly, defaultValidityDays]);

  // Sync vehicle list on client change
  useEffect(() => {
    if (clientId && !editingBudgetId && budgetType === 'OFICINA') {
      const clientVehicles = db.vehicles.filter(v => v.clientId === clientId);
      if (clientVehicles.length > 0) {
        setVehicleId(clientVehicles[0].id);
      } else {
        setVehicleId('');
      }
    }
  }, [clientId, db.vehicles, editingBudgetId, budgetType]);

  // Check dirty state
  const isFormDirty = clientId !== '' || items.length > 0 || notes.trim() !== '';

  const resetForm = () => {
    setEditingBudgetId(null);
    setClientId('');
    setVehicleId('');
    setBudgetType(isCommerceOnly ? 'COMERCIO' : 'OFICINA');
    setValidityDays(defaultValidityDays);
    setNotes('');
    setCustomerComplaint('');
    setIsWarrantyReturn(false);
    setWarrantyOriginOSId(undefined);
    setItems([]);
    setAddingQty(1);
    setErrorMsg('');
    setIsFormOpen(false);
    setUnsavedTask(null);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (budget: Budget) => {
    if (!canEditBudgets) {
      setErrorMsg('Seu perfil de usuário não possui permissão para editar orçamentos existentes. Solicite liberação ao Administrador.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    setErrorMsg('');
    setEditingBudgetId(budget.id);
    setBudgetType(budget.segmentType === 'COMERCIO' || !budget.vehicleId ? 'COMERCIO' : 'OFICINA');
    setClientId(budget.clientId);
    setVehicleId(budget.vehicleId || '');
    setValidityDays(budget.validityDays);
    setNotes(budget.notes || '');
    setCustomerComplaint(budget.customerComplaint || '');
    setIsWarrantyReturn(budget.isWarrantyReturn || false);
    setWarrantyOriginOSId(budget.warrantyOriginOSId);
    setItems(budget.items.map(item => ({ ...item })));
    setIsFormOpen(true);
    if (viewingBudget) setViewingBudget(null);
  };

  // Helper to commit item insertion to builder
  const applyItemInsertion = (
    newItem: BudgetItem,
    crossSellItems: BudgetItem[] = [],
    crossSellNames: string[] = []
  ) => {
    let newItemsList = [...items];

    const existingIdx = newItemsList.findIndex(i => i.type === newItem.type && i.itemId === newItem.itemId);
    if (existingIdx > -1) {
      const updatedQty = newItemsList[existingIdx].quantity + newItem.quantity;
      newItemsList[existingIdx] = {
        ...newItemsList[existingIdx],
        quantity: updatedQty,
        totalPrice: updatedQty * newItemsList[existingIdx].unitPrice,
        reservationAgreement: newItem.reservationAgreement || newItemsList[existingIdx].reservationAgreement
      };
    } else {
      newItemsList.push(newItem);
    }

    crossSellItems.forEach(cs => {
      const idx = newItemsList.findIndex(i => i.type === cs.type && i.itemId === cs.itemId);
      if (idx > -1) {
        newItemsList[idx].quantity += cs.quantity;
        newItemsList[idx].totalPrice = newItemsList[idx].quantity * newItemsList[idx].unitPrice;
      } else {
        newItemsList.push(cs);
      }
    });

    setItems(newItemsList);

    if (crossSellNames.length > 0) {
      setSuccessMsg(`✨ Venda Casada! Foram vinculados automaticamente: ${crossSellNames.join(', ')}.`);
      setTimeout(() => setSuccessMsg(''), 4500);
    } else if (newItem.reservationAgreement) {
      setSuccessMsg(`✅ Item adicionado! Combinado comercial sobre a reserva de estoque registrado com sucesso.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }

    setErrorMsg('');
    setAddingQty(1);
  };

  // Confirm agreement in stock reservation warning modal
  const handleConfirmReservationAgreement = () => {
    if (!reservationModalData) return;
    const { pendingItemToInsert, crossSellItemsToInsert, crossSellAddedNames, clientAgreementNote } = reservationModalData;

    const itemWithAgreement: BudgetItem = {
      ...pendingItemToInsert,
      reservationAgreement: clientAgreementNote.trim() || 'Cliente ciente da reserva de estoque em outro orçamento.'
    };

    applyItemInsertion(itemWithAgreement, crossSellItemsToInsert, crossSellAddedNames);
    setReservationModalData(null);
  };

  // Add Item to Builder
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (addingQty <= 0) {
      setErrorMsg('A quantidade deve ser maior que zero.');
      return;
    }

    if (addingType === 'part') {
      const part = db.parts.find(p => p.id === selectedPartId);
      if (!part) return;

      const existingInBuilder = items
        .filter(item => item.type === 'part' && item.itemId === part.id)
        .reduce((sum, item) => sum + item.quantity, 0);

      const totalRequestedQty = existingInBuilder + addingQty;

      // Check total physical stock
      if (part.stock < totalRequestedQty) {
        setErrorMsg(`Estoque físico total insuficiente (${part.stock} un.). Não é possível adicionar ${totalRequestedQty} un.`);
        return;
      }

      // Find active reservations in other budgets
      const reservingBudgets = getReservingBudgetsForPart(
        part.id,
        db.budgets,
        db.serviceOrders,
        db.clients,
        db.vehicles,
        editingBudgetId || undefined
      );

      const totalReservedInOthers = reservingBudgets.reduce((sum, b) => sum + b.quantity, 0);
      const availableStock = Math.max(0, part.stock - totalReservedInOthers);

      const newItem: BudgetItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'part',
        itemId: part.id,
        name: part.name,
        quantity: addingQty,
        unitPrice: part.price,
        totalPrice: addingQty * part.price,
        status: 'pending',
        unit: part.unit || 'UN',
        unitOfMeasureId: part.unitOfMeasureId,
        unitName: part.unitName,
        dimensions: part.dimensions
      };

      // Venda Casada
      const crossSellItemsToInsert: BudgetItem[] = [];
      const crossSellAddedNames: string[] = [];
      if (part.isCrossSell && part.crossSellItems && part.crossSellItems.length > 0) {
        part.crossSellItems.forEach(cs => {
          if (cs.type === 'service') {
            const srv = db.services.find(s => s.id === cs.itemId);
            if (srv) {
              crossSellItemsToInsert.push({
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: 'service',
                itemId: srv.id,
                name: srv.name,
                quantity: cs.defaultQuantity,
                unitPrice: srv.price,
                totalPrice: cs.defaultQuantity * srv.price,
                status: 'pending'
              });
              crossSellAddedNames.push(srv.name);
            }
          } else if (cs.type === 'part') {
            const linkedPart = db.parts.find(p => p.id === cs.itemId);
            if (linkedPart) {
              crossSellItemsToInsert.push({
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: 'part',
                itemId: linkedPart.id,
                name: linkedPart.name,
                quantity: cs.defaultQuantity,
                unitPrice: linkedPart.price,
                totalPrice: cs.defaultQuantity * linkedPart.price,
                status: 'pending'
              });
              crossSellAddedNames.push(linkedPart.name);
            }
          }
        });
      }

      // Trigger seller warning modal if other active budgets hold reservations AND available stock is low or insufficient
      if (reservingBudgets.length > 0 && (availableStock < totalRequestedQty || availableStock <= (part.minStock ?? 5))) {
        setReservationModalData({
          isOpen: true,
          part,
          addingQty,
          totalRequestedQty,
          availableStock,
          totalReservedInOthers,
          reservingBudgets,
          clientAgreementNote: `Cliente informado de que a peça possui ${totalReservedInOthers} un. reservada(s) no(s) orçamento(s) ${reservingBudgets.map(b => '#' + b.budgetId).join(', ')}. Ciente de que a liberação/faturamento do estoque ocorre após o vencimento do prazo de validade configurado (${validityDays} dias).`,
          pendingItemToInsert: newItem,
          crossSellItemsToInsert,
          crossSellAddedNames
        });
        return;
      }

      applyItemInsertion(newItem, crossSellItemsToInsert, crossSellAddedNames);
    } else {
      const service = db.services.find(s => s.id === selectedServiceId);
      if (!service) return;

      const existingIdx = items.findIndex(item => item.type === 'service' && item.itemId === service.id);
      if (existingIdx > -1) {
        const updated = [...items];
        updated[existingIdx].quantity += addingQty;
        updated[existingIdx].totalPrice = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
        setItems(updated);
      } else {
        const newItem: BudgetItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'service',
          itemId: service.id,
          name: service.name,
          quantity: addingQty,
          unitPrice: service.price,
          totalPrice: addingQty * service.price,
          status: 'pending'
        };
        setItems([...items, newItem]);
      }
      setErrorMsg('');
      setAddingQty(1);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateItemQty = (id: string, newQty: number) => {
    if (newQty <= 0) return;
    setItems(items.map(item => item.id === id ? { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice } : item));
  };

  const handleUpdateUnitPrice = (id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setItems(items.map(item => item.id === id ? { ...item, unitPrice: newPrice, totalPrice: item.quantity * newPrice } : item));
  };

  const getBudgetTotal = (budgetItems: BudgetItem[]) => {
    return budgetItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Core save budget action
  const executeSave = () => {
    const isBalcao = budgetType === 'COMERCIO' || isCommerceOnly;
    if (!clientId) {
      return { success: false, message: 'Selecione um Cliente.' };
    }
    if (!isBalcao && !vehicleId) {
      return { success: false, message: 'Selecione um Veículo para orçamentos da Oficina.' };
    }
    if (items.length === 0) {
      return { success: false, message: 'Adicione pelo menos um item (Peça ou Serviço) ao orçamento.' };
    }

    const reservationNotesList = items
      .filter(item => item.type === 'part' && !!item.reservationAgreement)
      .map(item => `${item.name}: ${item.reservationAgreement}`);

    const stockReservationNotes = reservationNotesList.length > 0
      ? reservationNotesList.join(' | ')
      : undefined;

    const initialReservationStatus = reservationMode === 'reserve_while_valid' ? 'ACTIVE' : 'NONE';
    const targetCompanyId = activeCompany?.id || db.companyInfo?.id || 'comp-1';

    if (editingBudgetId) {
      const existingBudget = db.budgets.find(b => b.id === editingBudgetId);
      if (!existingBudget) {
        return { success: false, message: 'Orçamento a ser editado não foi encontrado.' };
      }

      // Ensure item status: if budget is approved/partially_approved, make sure new items added are 'approved' by default
      const processedItems = items.map(item => {
        if ((existingBudget.status === 'approved' || existingBudget.status === 'partially_approved') && item.status === 'pending') {
          return { ...item, status: 'approved' as const };
        }
        return item;
      });

      const targetClient = db.clients.find(c => c.id === clientId);
      const calcMode = (targetClient?.paymentModeOverride && targetClient.paymentModeOverride !== 'DEFAULT')
        ? targetClient.paymentModeOverride
        : (db.alertSettings?.defaultPaymentRequirementMode || 'ADVANCE_DEPOSIT');

      const calcPct = calcMode === 'FULL_ADVANCE'
        ? 100
        : calcMode === 'ADVANCE_DEPOSIT'
        ? (targetClient?.depositPercentageOverride || db.alertSettings?.defaultDepositPercentage || 30)
        : 0;

      const totalAmount = getBudgetTotal(processedItems);
      const calcDepositAmt = Math.round(totalAmount * (calcPct / 100) * 100) / 100;

      const updatedBudget: Budget = {
        ...existingBudget,
        clientId,
        vehicleId: isBalcao ? (vehicleId || '') : vehicleId,
        validityDays,
        items: processedItems,
        segmentType: budgetType,
        companyId: existingBudget.companyId || targetCompanyId,
        notes,
        customerComplaint,
        isWarrantyReturn,
        warrantyOriginOSId,
        stockReservationStatus: existingBudget.stockReservationStatus || initialReservationStatus,
        stockReservationNotes: stockReservationNotes || existingBudget.stockReservationNotes,
        paymentRequirementMode: calcMode,
        requiredDepositPercentage: calcPct,
        requiredDepositAmount: calcDepositAmt
      };

      const updatedBudgets = db.budgets.map(b => b.id === editingBudgetId ? updatedBudget : b);
      onSaveBudgets(updatedBudgets);

      // Check if an OS linked to this budget already exists
      const existingOS = db.serviceOrders.find(os => os.budgetId === editingBudgetId);
      if (existingOS) {
        // Sync items with OS
        const updatedOSItems: OSItem[] = processedItems
          .filter(item => item.status === 'approved' || existingBudget.status === 'approved' || item.status === 'pending')
          .map(item => {
            const existingOSItem = existingOS.items.find(i => i.itemId === item.itemId && i.type === item.type);
            if (existingOSItem) {
              return {
                ...existingOSItem,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                status: existingOSItem.status === 'canceled' ? 'pending' : existingOSItem.status
              };
            }
            return {
              id: `os-it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              type: item.type,
              itemId: item.itemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              status: 'pending',
              source: 'budget'
            };
          });

        const updatedOSList = db.serviceOrders.map(os => {
          if (os.id === existingOS.id) {
            return {
              ...os,
              clientId,
              vehicleId: isBalcao ? '' : vehicleId,
              items: updatedOSItems
            };
          }
          return os;
        });

        onSaveServiceOrders(updatedOSList);

        if (onAddNotification) {
          onAddNotification({
            id: `notif-os-sync-${existingOS.id}-${Date.now()}`,
            type: 'service_order_created',
            title: `Ordem de Serviço #${existingOS.id} Sincronizada`,
            message: `A OS #${existingOS.id} foi atualizada com os novos serviços/peças inseridos no Orçamento #${editingBudgetId}.`,
            date: new Date().toISOString(),
            read: false,
            metadata: {
              serviceOrderId: existingOS.id,
              budgetId: editingBudgetId
            }
          });
        }
      }

      onAddHistoryLog(
        'budget',
        'Orçamento Editado / Atualizado',
        `Orçamento #${editingBudgetId} foi editado por ${currentUser?.name || 'Usuário'}. Novos itens e serviços foram inseridos. Novo total: R$ ${getBudgetTotal(processedItems).toFixed(2)}`,
        clientId,
        vehicleId || 'N/A',
        { total: getBudgetTotal(processedItems) }
      );

      return { success: true, budget: updatedBudget, isEdit: true };
    }

    const targetClient = db.clients.find(c => c.id === clientId);
    const calcMode = (targetClient?.paymentModeOverride && targetClient.paymentModeOverride !== 'DEFAULT')
      ? targetClient.paymentModeOverride
      : (db.alertSettings?.defaultPaymentRequirementMode || 'ADVANCE_DEPOSIT');

    const calcPct = calcMode === 'FULL_ADVANCE'
      ? 100
      : calcMode === 'ADVANCE_DEPOSIT'
      ? (targetClient?.depositPercentageOverride || db.alertSettings?.defaultDepositPercentage || 30)
      : 0;

    const totalAmount = getBudgetTotal(items);
    const calcDepositAmt = Math.round(totalAmount * (calcPct / 100) * 100) / 100;

    const newBudget: Budget = {
      id: `orc-${Date.now()}`,
      clientId,
      vehicleId: isBalcao ? (vehicleId || '') : vehicleId,
      validityDays,
      createdAt: new Date().toISOString(),
      items,
      status: 'pending',
      segmentType: budgetType,
      companyId: targetCompanyId,
      stockReservationStatus: initialReservationStatus,
      notes,
      customerComplaint,
      isWarrantyReturn,
      warrantyOriginOSId,
      stockReservationNotes,
      paymentRequirementMode: calcMode,
      requiredDepositPercentage: calcPct,
      requiredDepositAmount: calcDepositAmt
    };

    const updatedBudgets = [...db.budgets, newBudget];
    onSaveBudgets(updatedBudgets);
    onAddHistoryLog('budget', 'Orçamento Criado', `Orçamento ${newBudget.id} (${budgetType}) gerado com ${items.length} itens. Validade: ${validityDays} dias. Reserva: ${reservationMode === 'reserve_while_valid' ? 'Ativa' : 'Sem Reserva'}. Total: R$ ${getBudgetTotal(items).toFixed(2)}`, clientId, vehicleId || 'N/A', { total: getBudgetTotal(items) });
    
    // Notification for budget created
    if (onAddNotification && (db.alertSettings?.enableBudgetCreatedAlerts ?? true)) {
      onAddNotification({
        id: `notif-bud-${newBudget.id}-${Date.now()}`,
        type: 'budget_created',
        title: 'Novo Orçamento Criado',
        message: `Orçamento #${newBudget.id} no valor de R$ ${getBudgetTotal(items).toFixed(2)} gerado com ${items.length} item(ns). Validade: ${validityDays} dias.`,
        date: new Date().toISOString(),
        read: false,
        metadata: {
          budgetId: newBudget.id,
          itemsCount: items.length
        }
      });
    }

    return { success: true, budget: newBudget, isEdit: false };
  };

  // Convert Budget to Commercial Sale (PDV Balcão / Vendas)
  const handleConvertToSale = (budget: Budget) => {
    if (convertingId) return;
    if (budget.saleId) {
      setErrorMsg(`Este orçamento já foi convertido na Venda #${budget.saleId}.`);
      return;
    }

    const partItems = budget.items.filter(i => i.type === 'part');
    if (partItems.length === 0 && budget.items.length > 0) {
      setErrorMsg('Este orçamento contém apenas serviços. Para serviços de oficina, converta em Ordem de Serviço (OS).');
      return;
    }

    setConvertingId(budget.id);
    const saleId = `venda-${Date.now().toString().slice(-6)}`;
    const saleCompanyId = budget.companyId || activeCompany?.id || db.companyInfo?.id || 'comp-1';
    const saleItems: CommercialSaleItem[] = partItems.map(item => {
      const p = db.parts.find(part => part.id === item.itemId);
      return {
        id: `sale-it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        partId: item.itemId,
        partCode: p?.code || '',
        partName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        totalPrice: item.totalPrice,
        unit: item.unit || p?.unit || 'UN',
        unitOfMeasureId: item.unitOfMeasureId || p?.unitOfMeasureId,
        unitName: item.unitName || p?.unitName,
        dimensions: item.dimensions || p?.dimensions,
        ncm: p?.ncm || '8708.99.90'
      };
    });

    const subtotal = saleItems.reduce((s, i) => s + i.totalPrice, 0);
    const client = db.clients.find(c => c.id === budget.clientId);

    const newSale: CommercialSale = {
      id: saleId,
      code: `VEN-${Date.now().toString().slice(-4)}`,
      companyId: saleCompanyId,
      budgetId: budget.id,
      clientId: budget.clientId || 'cli-consumidor',
      clientName: client?.name || 'Cliente Balcão',
      items: saleItems,
      subtotal,
      discount: 0,
      totalAmount: subtotal,
      paymentMethod: 'PIX',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || 'admin',
      notes: `Convertido do Orçamento #${budget.id}. ${budget.notes || ''}`
    };

    // Update budget: transfer reservation directly to sale (status CONVERTED)
    const updatedBudget: Budget = {
      ...budget,
      status: 'approved',
      saleId,
      stockReservationStatus: 'CONVERTED',
      items: budget.items.map(i => ({ ...i, status: 'approved' }))
    };

    const updatedBudgets = db.budgets.map(b => b.id === budget.id ? updatedBudget : b);
    const updatedSales = [...(db.sales || []), newSale];

    if (onUpdateDb) {
      onUpdateDb({
        ...db,
        budgets: updatedBudgets,
        sales: updatedSales
      });
    } else {
      onSaveBudgets(updatedBudgets);
      if (onSaveSales) onSaveSales(updatedSales);
    }

    onAddHistoryLog(
      'budget',
      'Orçamento Convertido em Venda Balcão',
      `Orçamento #${budget.id} foi convertido com sucesso na Venda Comercial #${saleId}. Reserva de estoque transferida para a venda. Total: R$ ${subtotal.toFixed(2)}`,
      budget.clientId,
      budget.vehicleId || 'N/A',
      { budgetId: budget.id, saleId, total: subtotal }
    );

    if (onAddNotification) {
      onAddNotification({
        id: `notif-conv-sale-${budget.id}-${Date.now()}`,
        type: 'budget_converted',
        title: 'Orçamento Convertido em Venda',
        message: `Orçamento #${budget.id} foi convertido com sucesso na Venda #${saleId}. Total: R$ ${subtotal.toFixed(2)}.`,
        date: new Date().toISOString(),
        read: false,
        metadata: { budgetId: budget.id, saleId }
      });
    }

    setSuccessMsg(`Orçamento #${budget.id} convertido com sucesso na Venda #${saleId}! A reserva de estoque foi transferida para a venda.`);
    setTimeout(() => {
      setSuccessMsg('');
      setConvertingId(null);
    }, 4500);

    if (viewingBudget && viewingBudget.id === budget.id) {
      setViewingBudget(updatedBudget);
    }
  };

  // Convert Budget to Service Order (OS Oficina)
  const handleConvertToOS = (budget: Budget) => {
    if (convertingId) return;
    if (budget.serviceOrderId || db.serviceOrders.some(os => os.budgetId === budget.id)) {
      const existingOS = db.serviceOrders.find(os => os.budgetId === budget.id);
      setErrorMsg(`Este orçamento já possui uma Ordem de Serviço gerada (#${existingOS?.id || budget.serviceOrderId}).`);
      return;
    }

    setConvertingId(budget.id);
    const updatedBudget: Budget = {
      ...budget,
      status: 'approved',
      stockReservationStatus: 'CONVERTED',
      items: budget.items.map(i => ({ ...i, status: 'approved' }))
    };

    const createdOS = generateServiceOrder(updatedBudget);
    if (createdOS) {
      const finalBudget: Budget = {
        ...updatedBudget,
        serviceOrderId: createdOS.id
      };
      const updatedBudgets = db.budgets.map(b => b.id === budget.id ? finalBudget : b);
      onSaveBudgets(updatedBudgets);
      if (viewingBudget && viewingBudget.id === budget.id) {
        setViewingBudget(finalBudget);
      }
      setSuccessMsg(`Orçamento #${budget.id} convertido com sucesso na Ordem de Serviço #${createdOS.id}!`);
      setTimeout(() => {
        setSuccessMsg('');
        setConvertingId(null);
      }, 4500);
    } else {
      setConvertingId(null);
    }
  };

  // Convert Budget to Sale (Parts) + OS (Services) for Hybrid Businesses
  const handleConvertToSaleAndOS = (budget: Budget) => {
    if (convertingId) return;
    const partItems = budget.items.filter(i => i.type === 'part');
    const serviceItems = budget.items.filter(i => i.type === 'service');

    if (partItems.length === 0) {
      handleConvertToOS(budget);
      return;
    }
    if (serviceItems.length === 0) {
      handleConvertToSale(budget);
      return;
    }

    setConvertingId(budget.id);
    const saleId = `venda-${Date.now().toString().slice(-6)}`;
    const saleCompanyId = budget.companyId || activeCompany?.id || db.companyInfo?.id || 'comp-1';
    const saleItems: CommercialSaleItem[] = partItems.map(item => {
      const p = db.parts.find(part => part.id === item.itemId);
      return {
        id: `sale-it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        partId: item.itemId,
        partCode: p?.code || '',
        partName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        totalPrice: item.totalPrice
      };
    });

    const saleSubtotal = saleItems.reduce((s, i) => s + i.totalPrice, 0);
    const client = db.clients.find(c => c.id === budget.clientId);

    const newSale: CommercialSale = {
      id: saleId,
      code: `VEN-${Date.now().toString().slice(-4)}`,
      companyId: saleCompanyId,
      budgetId: budget.id,
      clientId: budget.clientId || 'cli-consumidor',
      clientName: client?.name || 'Cliente Balcão',
      items: saleItems,
      subtotal: saleSubtotal,
      discount: 0,
      totalAmount: saleSubtotal,
      paymentMethod: 'PIX',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || 'admin',
      notes: `Peças convertidas do Orçamento Híbrido #${budget.id}.`
    };

    // Create OS for services
    const osItems: OSItem[] = serviceItems.map(item => ({
      id: `os-it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'service',
      itemId: item.itemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      status: 'pending',
      source: 'budget'
    }));

    const osId = `os-${Date.now().toString().slice(-4)}`;
    const newOS: ServiceOrder = {
      id: osId,
      budgetId: budget.id,
      clientId: budget.clientId,
      vehicleId: budget.vehicleId || '',
      mechanicId: db.users.find(u => u.role === 'mecanico')?.id || currentUser?.id || 'usr-3',
      createdAt: new Date().toISOString(),
      status: 'pending',
      paymentStatus: 'pending',
      paymentRequirementMode: 'AFTER_COMPLETION',
      requiredDepositPercentage: 0,
      requiredDepositAmount: 0,
      depositPaidAmount: 0,
      isDepositPaid: false,
      technicalRecommendations: '',
      customerComplaint: budget.customerComplaint || budget.notes,
      items: osItems,
      notes: `Mão de obra convertida do Orçamento Híbrido #${budget.id}. Peças faturadas na Venda #${saleId}.`
    };

    const updatedBudget: Budget = {
      ...budget,
      status: 'approved',
      saleId,
      serviceOrderId: osId,
      stockReservationStatus: 'CONVERTED',
      items: budget.items.map(i => ({ ...i, status: 'approved' }))
    };

    const updatedBudgets = db.budgets.map(b => b.id === budget.id ? updatedBudget : b);
    const updatedSales = [...(db.sales || []), newSale];
    const updatedOSList = [...(db.serviceOrders || []), newOS];

    if (onUpdateDb) {
      onUpdateDb({
        ...db,
        budgets: updatedBudgets,
        sales: updatedSales,
        serviceOrders: updatedOSList
      });
    } else {
      onSaveBudgets(updatedBudgets);
      if (onSaveSales) onSaveSales(updatedSales);
      onSaveServiceOrders(updatedOSList);
    }

    onAddHistoryLog(
      'budget',
      'Orçamento Convertido em Venda + OS',
      `Orçamento Híbrido #${budget.id} foi convertido na Venda #${saleId} (Peças: R$ ${saleSubtotal.toFixed(2)}) e na OS #${osId} (Serviços: R$ ${getBudgetTotal(serviceItems).toFixed(2)}).`,
      budget.clientId,
      budget.vehicleId || 'N/A',
      { budgetId: budget.id, saleId, serviceOrderId: osId }
    );

    setSuccessMsg(`Conversão Híbrida concluída! Gerada a Venda #${saleId} (Peças) e a Ordem de Serviço #${osId} (Mão de obra).`);
    setTimeout(() => {
      setSuccessMsg('');
      setConvertingId(null);
    }, 5000);

    if (viewingBudget && viewingBudget.id === budget.id) {
      setViewingBudget(updatedBudget);
    }
  };

  const handleSaveBudget = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = executeSave();
    if (!res.success) {
      setErrorMsg(res.message || '');
      return;
    }
    setSuccessMsg(res.isEdit ? `Orçamento #${editingBudgetId} atualizado com sucesso!` : 'Orçamento gerado com sucesso em estado Pendente!');
    setTimeout(() => setSuccessMsg(''), 3500);
    if (res.budget) {
      setShareModalData({ isOpen: true, budget: res.budget });
    }
    resetForm();
  };

  // Unsaved changes handler
  useEffect(() => {
    if (isFormOpen && isFormDirty) {
      setUnsavedTask({
        type: 'budget',
        saveCallback: () => { executeSave(); },
        discardCallback: () => { resetForm(); }
      });
    } else {
      setUnsavedTask(null);
    }
  }, [isFormOpen, clientId, vehicleId, items, validityDays, notes]);

  // Launch Customer Approval Simulator
  const launchApprovalSimulator = (budget: Budget) => {
    setViewingBudget(budget);
    
    // Default mechanic selection to first mechanic or current user
    const mechanics = db.users.filter(u => u.role === 'mecanico' || u.role === 'admin');
    if (mechanics.length > 0) {
      setSelectedMechanicId(mechanics[0].id);
    } else {
      setSelectedMechanicId(currentUser?.id || 'usr-3');
    }

    // Initialize all items as approved in simulator by default ('approved')
    const initial: { [key: string]: 'approved' | 'postponed' | 'rejected' } = {};
    budget.items.forEach(item => {
      initial[item.id] = (item.status as any) || 'approved';
    });
    setSimApprovedItems(initial);
    setIsApprovalSimOpen(true);
  };

  const setSimItemDecision = (itemId: string, decision: 'approved' | 'postponed' | 'rejected') => {
    setSimApprovedItems(prev => ({
      ...prev,
      [itemId]: decision
    }));
  };

  // Generate Service Order (OS) from Approved Budget (RF008)
  const generateServiceOrder = (budget: Budget, assignedMechanicId?: string, paymentMode: 'pay_now' | 'pay_after' = 'pay_after'): ServiceOrder | null => {
    // RN003: OS only after approved/partially approved
    if (budget.status !== 'approved' && budget.status !== 'partially_approved') {
      setErrorMsg('Regra de Negócio Violada (RN003): Somente é possível gerar Ordem de Serviço para orçamentos aprovados ou parcialmente aprovados.');
      return null;
    }

    // Check if OS already exists for this budget
    const osExists = db.serviceOrders.some(os => os.budgetId === budget.id);
    if (osExists) {
      setErrorMsg('Já existe uma Ordem de Serviço gerada para este orçamento.');
      return null;
    }

    // Filter approved items (or non-rejected items if budget is fully approved)
    const approvedItems = budget.items.filter(item => item.status === 'approved' || (budget.status === 'approved' && item.status !== 'rejected' && item.status !== 'postponed'));
    if (approvedItems.length === 0) {
      setErrorMsg('Não há itens aprovados neste orçamento para gerar uma OS.');
      return null;
    }

    // Create OS items
    const osItems: OSItem[] = approvedItems.map(item => ({
      id: `os-it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: item.type,
      itemId: item.itemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      status: 'pending',
      source: 'budget'
    }));

    // Find assigned mechanic or default mechanic
    const mechanicIdToUse = assignedMechanicId || selectedMechanicId || db.users.find(u => u.role === 'mecanico')?.id || currentUser?.id || 'usr-3';

    const client = db.clients.find(c => c.id === budget.clientId);
    const reqMode = budget.paymentRequirementMode || (
      (client?.paymentModeOverride && client.paymentModeOverride !== 'DEFAULT')
        ? client.paymentModeOverride
        : (db.alertSettings?.defaultPaymentRequirementMode || 'ADVANCE_DEPOSIT')
    );

    const reqPct = reqMode === 'FULL_ADVANCE'
      ? 100
      : reqMode === 'ADVANCE_DEPOSIT'
      ? (budget.requiredDepositPercentage || client?.depositPercentageOverride || db.alertSettings?.defaultDepositPercentage || 30)
      : 0;

    const osTotal = osItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const reqAmt = Math.round(osTotal * (reqPct / 100) * 100) / 100;
    const isDepositAlreadyPaid = paymentMode === 'pay_now' || reqMode === 'AFTER_COMPLETION';

    const newOS: ServiceOrder = {
      id: `os-${Date.now().toString().slice(-4)}`, // clean short readable ID
      budgetId: budget.id,
      clientId: budget.clientId,
      vehicleId: budget.vehicleId,
      mechanicId: mechanicIdToUse,
      createdAt: new Date().toISOString(),
      status: 'pending',
      paymentStatus: paymentMode === 'pay_now' ? 'paid' : 'pending',
      paymentRequirementMode: reqMode,
      requiredDepositPercentage: reqPct,
      requiredDepositAmount: reqAmt,
      depositPaidAmount: isDepositAlreadyPaid ? reqAmt : 0,
      isDepositPaid: isDepositAlreadyPaid,
      depositPaidAt: isDepositAlreadyPaid ? new Date().toISOString() : undefined,
      technicalRecommendations: '',
      customerComplaint: budget.customerComplaint || budget.notes,
      isWarrantyReturn: budget.isWarrantyReturn,
      warrantyOriginOSId: budget.warrantyOriginOSId,
      items: osItems,
      notes: `Ordem de serviço gerada a partir do orçamento ${budget.id}. Regra de Cobrança: ${reqMode === 'AFTER_COMPLETION' ? '100% Pós-Pago' : reqMode === 'ADVANCE_DEPOSIT' ? `Sinal de ${reqPct}% (R$ ${reqAmt.toFixed(2)})` : '100% Antecipado'}. ${budget.notes || ''}`
    };

    const updatedOSList = [...db.serviceOrders, newOS];
    onSaveServiceOrders(updatedOSList);

    const conversionType: 'TOTAL' | 'PARCIAL' = approvedItems.length === budget.items.length ? 'TOTAL' : 'PARCIAL';

    onAddHistoryLog(
      'service_order',
      `Ordem de Serviço Gerada & Liberada (${conversionType})`,
      `Ordem de Serviço ${newOS.id} iniciada com sucesso a partir dos itens aprovados do orçamento ${budget.id}. Conversão: ${conversionType} (${approvedItems.length} de ${budget.items.length} itens aprovados). OS atribuída ao mecânico.`,
      budget.clientId,
      budget.vehicleId,
      { osId: newOS.id, total: getBudgetTotal(approvedItems), conversionType }
    );

    // Notifications for OS conversion & creation
    if (onAddNotification) {
      if (db.alertSettings?.enableBudgetConvertedAlerts ?? true) {
        onAddNotification({
          id: `notif-conv-${budget.id}-${Date.now()}`,
          type: 'budget_converted',
          title: `Orçamento Convertido em OS (${conversionType})`,
          message: `Orçamento #${budget.id} foi convertido na Ordem de Serviço #${newOS.id} (${approvedItems.length} de ${budget.items.length} itens aprovados) e liberado ao mecânico.`,
          date: new Date().toISOString(),
          read: false,
          metadata: {
            budgetId: budget.id,
            serviceOrderId: newOS.id,
            conversionType,
            itemsCount: approvedItems.length,
            totalItemsCount: budget.items.length
          }
        });
      }

      if (db.alertSettings?.enableServiceOrderCreatedAlerts ?? true) {
        onAddNotification({
          id: `notif-os-${newOS.id}-${Date.now()}`,
          type: 'service_order_created',
          title: 'Nova Ordem de Serviço Liberada ao Mecânico',
          message: `Ordem de Serviço #${newOS.id} liberada ao mecânico para início dos trabalhos. Total: R$ ${getBudgetTotal(approvedItems).toFixed(2)}.`,
          date: new Date().toISOString(),
          read: false,
          metadata: {
            serviceOrderId: newOS.id,
            budgetId: budget.id
          }
        });
      }
    }

    // Update parts inventory levels for approved parts
    const updatedParts = [...db.parts];
    approvedItems.forEach(item => {
      if (item.type === 'part') {
        const partIdx = updatedParts.findIndex(p => p.id === item.itemId);
        if (partIdx > -1) {
          updatedParts[partIdx].stock = Math.max(0, updatedParts[partIdx].stock - item.quantity);
        }
      }
    });

    return newOS;
  };

  // Finalize Customer decision (Total or Partial Approval) and release OS
  const submitCustomerDecision = () => {
    if (!viewingBudget) return;

    const updatedItems = viewingBudget.items.map(item => ({
      ...item,
      status: simApprovedItems[item.id] || 'approved'
    }));

    const approvedCount = updatedItems.filter(item => item.status === 'approved').length;
    const postponedCount = updatedItems.filter(item => item.status === 'postponed').length;
    const rejectedCount = updatedItems.filter(item => item.status === 'rejected').length;
    const totalCount = updatedItems.length;

    let finalStatus: Budget['status'] = 'rejected';
    if (approvedCount === totalCount) {
      finalStatus = 'approved';
    } else if (approvedCount > 0) {
      finalStatus = 'partially_approved';
    } else if (postponedCount > 0) {
      finalStatus = 'pending'; // mantém pendente de execução/revisão
    }

    const updatedBudget: Budget = {
      ...viewingBudget,
      items: updatedItems,
      status: finalStatus
    };

    const updatedBudgets = db.budgets.map(b => b.id === viewingBudget.id ? updatedBudget : b);
    onSaveBudgets(updatedBudgets);

    // Check if connected OS exists
    const existingOS = db.serviceOrders.find(os => os.budgetId === viewingBudget.id);
    let createdOS: ServiceOrder | null = null;

    if (existingOS) {
      // Sync connected OS if one exists
      const { updatedOrders, hasChanges } = syncServiceOrdersWithBudgets(db.serviceOrders, updatedBudgets);
      if (hasChanges) {
        onSaveServiceOrders(updatedOrders);
      }
    } else if (finalStatus === 'approved' || finalStatus === 'partially_approved') {
      // AUTOMATICALLY generate and release the Service Order for the mechanic with agreed billing mode!
      createdOS = generateServiceOrder(updatedBudget, selectedMechanicId, simBillingMode);
    }

    const assignedMechObj = db.users.find(u => u.id === selectedMechanicId);
    const mechName = assignedMechObj ? assignedMechObj.name : 'Mecânico responsável';

    // Write permanent history entries (RN005 & RN007)
    let desc = '';
    let logTitle = '';
    if (finalStatus === 'approved') {
      logTitle = 'Orçamento Aprovado & OS Liberada';
      desc = `Orçamento ${viewingBudget.id} foi TOTALMENTE APROVADO pelo cliente. Valor total: R$ ${getBudgetTotal(updatedItems).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Ordem de Serviço liberada ao mecânico ${mechName}.`;
    } else if (finalStatus === 'partially_approved') {
      logTitle = 'Orçamento Aprovado Parcialmente & OS Liberada';
      const approvedVal = updatedItems.filter(i => i.status === 'approved').reduce((s, i) => s + i.totalPrice, 0);
      const postponedVal = updatedItems.filter(i => i.status === 'postponed').reduce((s, i) => s + i.totalPrice, 0);
      const rejectedVal = updatedItems.filter(i => i.status === 'rejected').reduce((s, i) => s + i.totalPrice, 0);
      desc = `Orçamento ${viewingBudget.id} foi PARCIALMENTE APROVADO. Fazer Agora: R$ ${approvedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Deixar para Depois: R$ ${postponedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Recusado: R$ ${rejectedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. OS gerada com os itens aprovados e liberada ao mecânico ${mechName}.`;
    } else if (finalStatus === 'pending' && postponedCount > 0) {
      logTitle = 'Orçamento Postergado';
      const postponedVal = updatedItems.filter(i => i.status === 'postponed').reduce((s, i) => s + i.totalPrice, 0);
      desc = `Orçamento ${viewingBudget.id} teve todos ou parte de seus itens postergados ("Deixar para outro momento") pelo cliente. Valor pendente: R$ ${postponedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Nenhuma OS foi aberta.`;
    } else {
      logTitle = 'Orçamento Recusado';
      desc = `Orçamento ${viewingBudget.id} foi TOTALMENTE RECUSADO pelo cliente. Valor recusado: R$ ${getBudgetTotal(updatedItems).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Nenhuma OS foi aberta.`;
    }

    onAddHistoryLog(
      'budget', 
      logTitle, 
      desc, 
      viewingBudget.clientId, 
      viewingBudget.vehicleId,
      { status: finalStatus, budgetId: viewingBudget.id } as any
    );

    setViewingBudget(updatedBudget);
    setIsApprovalSimOpen(false);

    if (createdOS) {
      setSuccessMsg(`Decisão registrada com sucesso! Ordem de Serviço #${createdOS.id} GERADA e LIBERADA para o mecânico ${mechName} iniciar os trabalhos.`);
    } else if (existingOS) {
      setSuccessMsg(`Decisão registrada! Os itens da Ordem de Serviço #${existingOS.id} foram sincronizados com o mecânico.`);
    } else {
      setSuccessMsg(`Decisão de recusa/adiamento do orçamento #${viewingBudget.id} gravada com sucesso no histórico.`);
    }

    setTimeout(() => setSuccessMsg(''), 5500);
  };

  // Mappers
  const getClientName = (id: string) => db.clients.find(c => c.id === id)?.name || 'Cliente Desconhecido';
  const getVehiclePlate = (id: string) => db.vehicles.find(v => v.id === id)?.plate || 'S/P';
  const getVehicleDesc = (id: string) => {
    const v = db.vehicles.find(veh => veh.id === id);
    return v ? `${v.brand} ${v.model} (${v.year})` : 'Veículo Desconhecido';
  };

  const filteredBudgets = db.budgets.filter(b => {
    const cName = getClientName(b.clientId).toLowerCase();
    const vPlate = getVehiclePlate(b.vehicleId).toLowerCase();
    const q = searchQuery.toLowerCase();
    return b.id.toLowerCase().includes(q) || cName.includes(q) || vPlate.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in" id="budgets-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Orçamentos e Orçamentos Parciais</h1>
          <p className="text-sm text-slate-500">Geração de orçamentos, aprovação parcial e originação de OS (RF006, RF007, RF008, RF009).</p>
        </div>
        {!isFormOpen && !viewingBudget && (
          <button 
            id="btn-add-budget"
            onClick={openNewForm} 
            className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> Novo Orçamento
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="budget-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div id="budget-error-alert" className="p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100 animate-slide-up">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* NEW/EDIT BUDGET FORM */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md animate-slide-up" id="budget-form-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-semibold text-slate-800 font-display text-base flex items-center gap-2">
              {editingBudgetId ? (
                <>
                  <Pencil className="w-4 h-4 text-indigo-600" />
                  Editar Orçamento #{editingBudgetId}
                </>
              ) : (
                'Criar Novo Orçamento'
              )}
            </h3>
            <button id="btn-close-budget-form" onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: Client & Vehicle select */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Atendimento</h4>
                
                {/* Segment Selector (Hybrid / Multi-segment) */}
                {isHybrid && (
                  <div className="space-y-1.5" id="budget-segment-selector">
                    <label className="text-xs font-semibold text-slate-600">Tipo / Segmento do Orçamento *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBudgetType('OFICINA')}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                          budgetType === 'OFICINA'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" /> Oficina
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetType('COMERCIO')}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                          budgetType === 'COMERCIO'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Balcão / Peças
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="budget-client-select">Cliente *</label>
                  <select 
                    id="budget-client-select"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {db.clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="budget-vehicle-select">
                    Veículo {budgetType === 'COMERCIO' ? '(Opcional no Balcão)' : '*'}
                  </label>
                  <select 
                    id="budget-vehicle-select"
                    value={vehicleId}
                    onChange={e => setVehicleId(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    disabled={!clientId}
                  >
                    <option value="">{budgetType === 'COMERCIO' ? '-- Sem vínculo com veículo (Venda Balcão) --' : '-- Selecione o Veículo --'}</option>
                    {db.vehicles.filter(v => v.clientId === clientId).map(v => (
                      <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>
                    ))}
                  </select>
                  {budgetType === 'OFICINA' && db.vehicles.filter(v => v.clientId === clientId).length === 0 && clientId && (
                    <p className="text-[10px] text-rose-500 font-medium">Este cliente não possui veículos cadastrados! Cadastre um veículo para gerar orçamento de oficina.</p>
                  )}
                </div>

                {/* Reservation Mode Badge indicator */}
                <div className="p-2.5 rounded-lg border text-xs flex items-center justify-between bg-white border-slate-200">
                  <span className="text-slate-500 font-medium">Política de Reserva:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    reservationMode === 'reserve_while_valid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {reservationMode === 'reserve_while_valid' ? `Reserva Ativa (${validityDays}d)` : 'Sem Reserva'}
                  </span>
                </div>

                {/* ACTIVE WARRANTY ALERT & RETURN CLAIM BANNER */}
                {vehicleId && (
                  <WarrantyAlertBanner
                    vehicleId={vehicleId}
                    serviceOrders={db.serviceOrders}
                    customerComplaint={notes}
                    isWarrantyReturn={isWarrantyReturn}
                    warrantyOriginOSId={warrantyOriginOSId}
                    onToggleWarrantyReturn={(isRet, originId) => {
                      setIsWarrantyReturn(isRet);
                      setWarrantyOriginOSId(originId);
                      if (isRet && originId && !notes.includes('[RETORNO EM GARANTIA]')) {
                        setNotes(`[RETORNO EM GARANTIA DA OS #${originId}]: ${notes.replace(/^\[RETORNO EM GARANTIA[^\]]*\]:\s*/, '')}`);
                      }
                    }}
                  />
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="budget-validity-input">Validade do Orçamento (Dias) *</label>
                  <input 
                    id="budget-validity-input"
                    type="number" 
                    value={validityDays}
                    onChange={e => setValidityDays(Number(e.target.value))}
                    min="1"
                    max="90"
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1" htmlFor="budget-notes-input">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Informações Pertinentes ao Atendimento / Observações
                  </label>
                  <textarea 
                    id="budget-notes-input"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Espaço livre para digitar qualquer informação pertinente ao atendimento, peças ou relato do cliente..."
                    rows={3}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Right side: Items details & Builder */}
            <div className="lg:col-span-2 space-y-4">
              {/* Item Adder Widget */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">Adicionar Peças ou Serviços</h4>
                
                <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" id="form-add-budget-item">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase" htmlFor="item-type-select">Tipo</label>
                    <select 
                      id="item-type-select"
                      value={addingType}
                      onChange={e => setAddingType(e.target.value as 'part' | 'service')}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white font-medium"
                    >
                      <option value="part">Peça (Estoque)</option>
                      <option value="service">Serviço (Mão de Obra)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase" htmlFor="item-select">Item Selecionado</label>
                    {addingType === 'part' ? (
                      <select 
                        id="item-select"
                        value={selectedPartId}
                        onChange={e => setSelectedPartId(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                      >
                        {db.parts
                          .filter(p => {
                            const canSellOther = currentUser?.permissions?.canSellOtherStoresStock ?? (currentUser?.role === 'admin' || currentUser?.role === 'qa');
                            if (!canSellOther && currentUser?.companyId) {
                              if (p.companyId && p.companyId !== currentUser.companyId) {
                                return false;
                              }
                            }
                            return true;
                          })
                          .map(p => {
                            const companyList = db.registeredCompanies && db.registeredCompanies.length > 0 ? db.registeredCompanies : [db.companyInfo];
                            const partComp = companyList.find(c => c.id === (p.companyId || db.companyInfo?.id || 'comp-1')) || db.companyInfo;
                            const storeLabel = partComp ? ` [${partComp.companyType === 'filial' ? '🏬' : '🏢'} ${partComp.name}]` : '';
                            return (
                              <option key={p.id} value={p.id}>{p.name} (Código: {p.code}{storeLabel} | Estoque: {p.stock} un | R$ {p.price.toFixed(2)})</option>
                            );
                          })}
                      </select>
                    ) : (
                      <select 
                        id="item-select"
                        value={selectedServiceId}
                        onChange={e => setSelectedServiceId(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                      >
                        {db.services.map(s => (
                          <option key={s.id} value={s.id}>{s.name} (Tempo: {s.standardHours}h | R$ {s.price.toFixed(2)})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="space-y-1 w-20">
                      <label className="text-[10px] font-bold text-slate-500 uppercase" htmlFor="item-qty-input">Quant.</label>
                      <input 
                        id="item-qty-input"
                        type="number" 
                        value={addingQty}
                        onChange={e => setAddingQty(Number(e.target.value))}
                        min="1"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white"
                      />
                    </div>
                    <button 
                      id="btn-add-item-to-list"
                      type="submit" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded transition flex-1 h-9"
                    >
                      Incluir
                    </button>
                  </div>
                </form>

                {/* Live Stock Availability Breakdown */}
                {addingType === 'part' && selectedPartId && (() => {
                  const part = db.parts.find(p => p.id === selectedPartId);
                  if (!part) return null;
                  const details = getPartStockDetails(part, db.budgets, db.serviceOrders);
                  return (
                    <div className="mt-3 p-2.5 bg-white rounded-lg border border-indigo-150 text-xs space-y-1.5 animate-fade-in" id="stock-availability-breakdown-budget">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-indigo-600" />
                          Estoque do Item ({part.code}):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Quantidade física total no almoxarifado">
                            Total: <strong>{details.totalStock}</strong> un
                          </span>
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Quantidade reservada em outros orçamentos válidos">
                            Reservado: <strong>{details.reservedStock}</strong> un
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold border ${
                            details.availableStock > 0 
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200' 
                              : 'text-rose-800 bg-rose-50 border-rose-200'
                          }`} title="Quantidade livre para venda e reserva imediata">
                            Disponível: <strong>{details.availableStock}</strong> un
                          </span>
                        </div>
                      </div>
                      {addingQty > details.availableStock && (
                        <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Atenção: A quantidade desejada ({addingQty} un) excede o estoque disponível ({details.availableStock} un). Serão necessárias peças adicionais para suprir a reserva.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Items List Builder */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse" id="budget-items-builder-table">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 font-bold text-slate-500">
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Descrição do Item</th>
                      <th className="p-3">Qtd</th>
                      <th className="p-3">Preço Unit.</th>
                      <th className="p-3">Total</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          Nenhum item adicionado ao orçamento ainda. Use o painel acima para incluir peças e serviços.
                        </td>
                      </tr>
                    ) : (
                      items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-3 uppercase font-semibold text-[10px]">
                            {item.type === 'part' ? (
                              <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1 w-fit">
                                <Package className="w-3 h-3" /> Peça
                              </span>
                            ) : (
                              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 w-fit">
                                <Wrench className="w-3 h-3" /> Serviço
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            <div>{item.name}</div>
                            {item.reservationAgreement && (
                              <div className="mt-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded px-2 py-0.5 inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Combinado: {item.reservationAgreement}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-semibold">
                            <input 
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleUpdateItemQty(item.id, Number(e.target.value))}
                              className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white text-center font-bold"
                            />
                          </td>
                          <td className="p-3 text-slate-500">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">R$</span>
                              <input 
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={e => handleUpdateUnitPrice(item.id, Number(e.target.value))}
                                className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white text-right font-medium"
                              />
                            </div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">R$ {item.totalPrice.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <button 
                              id={`btn-remove-item-${item.id}`}
                              type="button" 
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-slate-100 bg-slate-50/50 font-bold text-sm text-slate-800">
                        <td colSpan={4} className="p-3 text-right">Valor Total Estimado:</td>
                        <td colSpan={2} className="p-3 text-indigo-600 text-lg">
                          R$ {getBudgetTotal(items).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button 
                  id="btn-save-budget-submit"
                  type="button" 
                  onClick={() => handleSaveBudget()} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition"
                >
                  Salvar Orçamento Pendente
                </button>
                <button 
                  id="btn-cancel-budget-form"
                  type="button" 
                  onClick={resetForm} 
                  className="bg-slate-150 hover:bg-slate-200 text-slate-600 font-semibold text-sm px-6 py-2.5 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL FOR CUSTOMER DECISION (TOTAL/PARTIAL APPROVAL) */}
      {isApprovalSimOpen && viewingBudget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="customer-approval-simulator-modal">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800 font-display text-base">
                  Registrar Decisão do Cliente & Liberar OS ao Mecânico
                </h3>
              </div>
              <button id="btn-close-simulator" onClick={() => setIsApprovalSimOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100/40">
              <p>
                O atendente registra aqui a resposta do cliente (Aprovação Total ou Parcial). Os itens marcados como <strong>"Fazer Agora"</strong> farão parte da Ordem de Serviço, enquanto os recusados ou postergados permanecem no histórico do veículo (RN005).
              </p>
              <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Ao gravar, a Ordem de Serviço será LIBERADA AUTOMATICAMENTE para o mecânico iniciar a execução dos serviços aprovados.
              </p>
            </div>

            {/* MECHANIC SELECTION */}
            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-150 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                    Mecânico Responsável p/ Início dos Trabalhos:
                  </label>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    A Ordem de Serviço será gerada e liberada para este profissional na oficina.
                  </p>
                </div>
                <select
                  id="select-mechanic-decision"
                  value={selectedMechanicId}
                  onChange={(e) => setSelectedMechanicId(e.target.value)}
                  className="bg-white border border-indigo-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-hidden focus:border-indigo-500 shadow-2xs cursor-pointer min-w-[200px]"
                >
                  {db.users.filter(u => u.role === 'mecanico' || u.role === 'admin').map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role === 'mecanico' ? 'Mecânico' : 'Administrador'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aprovação Individual de Itens:</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-approve-all-items"
                    onClick={() => {
                      const updated: { [key: string]: 'approved' | 'postponed' | 'rejected' } = {};
                      viewingBudget.items.forEach(i => updated[i.id] = 'approved');
                      setSimApprovedItems(updated);
                    }}
                    className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded transition cursor-pointer"
                  >
                    ✓ Aprovar Todos (Total)
                  </button>
                  <button
                    type="button"
                    id="btn-postpone-all-items"
                    onClick={() => {
                      const updated: { [key: string]: 'approved' | 'postponed' | 'rejected' } = {};
                      viewingBudget.items.forEach(i => updated[i.id] = 'postponed');
                      setSimApprovedItems(updated);
                    }}
                    className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded transition cursor-pointer"
                  >
                    ⏱ Adiar Todos
                  </button>
                  <button
                    type="button"
                    id="btn-reject-all-items"
                    onClick={() => {
                      const updated: { [key: string]: 'approved' | 'postponed' | 'rejected' } = {};
                      viewingBudget.items.forEach(i => updated[i.id] = 'rejected');
                      setSimApprovedItems(updated);
                    }}
                    className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded transition cursor-pointer"
                  >
                    ✕ Recusar Todos
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg max-h-72 overflow-y-auto">
                {viewingBudget.items.map(item => {
                  const currentDecision = simApprovedItems[item.id] || 'approved';
                  return (
                    <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs hover:bg-slate-50/30">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                            item.type === 'part' ? 'bg-amber-55/10 text-amber-700' : 'bg-blue-55/10 text-blue-700'
                          }`}>
                            {item.type === 'part' ? 'PEÇA' : 'MÃO DE OBRA'}
                          </span>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Quantidade: {item.quantity} x R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1.5">
                        <p className="font-bold text-slate-800 text-sm">R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        
                        {/* 3-Way Toggle Button Group */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/50 p-0.5">
                          <button
                            type="button"
                            id={`btn-decision-now-${item.id}`}
                            onClick={() => setSimItemDecision(item.id, 'approved')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                              currentDecision === 'approved' 
                                ? 'bg-emerald-600 text-white shadow-3xs' 
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            Fazer Agora
                          </button>
                          <button
                            type="button"
                            id={`btn-decision-later-${item.id}`}
                            onClick={() => setSimItemDecision(item.id, 'postponed')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                              currentDecision === 'postponed' 
                                ? 'bg-amber-500 text-white shadow-3xs' 
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            Fazer Depois
                          </button>
                          <button
                            type="button"
                            id={`btn-decision-reject-${item.id}`}
                            onClick={() => setSimItemDecision(item.id, 'rejected')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                              currentDecision === 'rejected' 
                                ? 'bg-rose-600 text-white shadow-3xs' 
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Indicators */}
            <div className="p-4 bg-slate-50 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-150">
              <div className="text-xs space-y-1">
                <p className="text-slate-500">Valor Total Estimado: <span className="font-bold text-slate-700">R$ {getBudgetTotal(viewingBudget.items).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                <p className="text-slate-500">
                  Aprovado (Fazer Agora): <span className="font-bold text-emerald-600">R$ {
                    viewingBudget.items.filter(i => simApprovedItems[i.id] === 'approved').reduce((s, i) => s + i.totalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  }</span>
                </p>
                <p className="text-slate-500">
                  Adiado (Deixar p/ Depois): <span className="font-bold text-amber-600">R$ {
                    viewingBudget.items.filter(i => simApprovedItems[i.id] === 'postponed').reduce((s, i) => s + i.totalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  }</span>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block font-medium">Resultado do Orçamento:</span>
                <span className="font-bold text-sm text-slate-800 uppercase font-mono">
                  {viewingBudget.items.filter(i => simApprovedItems[i.id] === 'approved').length === viewingBudget.items.length ? (
                    <span className="text-emerald-600">Aprovação Integral</span>
                  ) : viewingBudget.items.filter(i => simApprovedItems[i.id] === 'approved').length > 0 ? (
                    <span className="text-amber-500">Aprovação Parcial (RF009)</span>
                  ) : viewingBudget.items.filter(i => simApprovedItems[i.id] === 'postponed').length > 0 ? (
                    <span className="text-blue-500">Todos Itens Postergados</span>
                  ) : (
                    <span className="text-rose-500">Recusa Integral</span>
                  )}
                </span>
              </div>
            </div>

            {/* Acordo Financeiro & Faturamento */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3">
              <label className="text-xs font-bold text-indigo-900 uppercase flex items-center justify-between">
                <span>Condição Financeira & Faturamento da O.S.</span>
                <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-mono font-medium">Acordo Comercial</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-billing-pay-now"
                  onClick={() => setSimBillingMode('pay_now')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    simBillingMode === 'pay_now' 
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'bg-white/50 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${simBillingMode === 'pay_now' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                    {simBillingMode === 'pay_now' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">💳 Faturar / Receber Agora</span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">Cliente efetua o pagamento antecipado / entrada antes de liberar os serviços.</span>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-billing-pay-after"
                  onClick={() => setSimBillingMode('pay_after')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    simBillingMode === 'pay_after' 
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'bg-white/50 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${simBillingMode === 'pay_after' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                    {simBillingMode === 'pay_after' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">🛠️ Pagar / Negociar Após os Serviços</span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">O mecânico realiza os serviços e o cliente acerta ao retirar o veículo.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                id="btn-confirm-sim"
                onClick={submitCustomerDecision} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                Gravar Decisão e Liberar OS ao Mecânico
              </button>
              <button 
                id="btn-cancel-sim"
                onClick={() => setIsApprovalSimOpen(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm px-5 py-2.5 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEWING SELECTED BUDGET DETAILS */}
      {viewingBudget && !isApprovalSimOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md space-y-6 animate-slide-up" id="budget-details-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              {db.companyInfo?.logoUrl && (
                <div className="w-24 h-12 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  <img src={db.companyInfo.logoUrl} alt={db.companyInfo.name} className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <div>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-sm font-semibold uppercase tracking-wider font-mono">
                  {viewingBudget.id}
                </span>
                <h3 className="font-semibold text-slate-800 font-display text-lg mt-1">Detalhes do Orçamento</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                id={`btn-print-pdf-budget-${viewingBudget.id}`}
                type="button"
                onClick={() => setShareModalData({ isOpen: true, budget: viewingBudget })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir em PDF / Enviar
              </button>
              <button id="btn-close-details" onClick={() => setViewingBudget(null)} className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Cliente e Atendimento</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <p className="text-sm font-semibold text-slate-800">{getClientName(viewingBudget.clientId)}</p>
                <p className="text-xs text-slate-500">Veículo: <span className="font-semibold text-slate-700">{getVehicleDesc(viewingBudget.vehicleId)}</span></p>
                <p className="text-xs text-slate-500">Placa: <span className="font-mono font-semibold bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-800">{getVehiclePlate(viewingBudget.vehicleId)}</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status & Validade (RN004)</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Estado:</span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    viewingBudget.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    viewingBudget.status === 'partially_approved' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    viewingBudget.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    {viewingBudget.status === 'pending' ? 'Pendente' :
                     viewingBudget.status === 'approved' ? 'Aprovado Integral' :
                     viewingBudget.status === 'partially_approved' ? 'Aprovado Parcial (RF009)' :
                     viewingBudget.status === 'rejected' ? 'Recusado' : 'Expirado'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Validade Configurada: <span className="font-semibold text-slate-700">{viewingBudget.validityDays} dias</span> de vigência comercial.</p>
                {viewingBudget.notes && (
                  <p className="text-xs text-slate-400 leading-relaxed italic border-t border-slate-200/50 pt-2">" {viewingBudget.notes} "</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Itens do Orçamento:</p>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse" id="budget-view-items-table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Quantidade</th>
                    <th className="p-3">Preço Unitário</th>
                    <th className="p-3">Preço Total</th>
                    <th className="p-3">Status do Item (RN005)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingBudget.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/30">
                      <td className="p-3">
                        <span className="font-semibold font-mono text-[10px] uppercase">
                          {item.type === 'part' ? 'PEÇA' : 'MÃO DE OBRA'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        <div>{item.name}</div>
                        {item.reservationAgreement && (
                          <div className="mt-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded px-2 py-1 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Acordo de Reserva: {item.reservationAgreement}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{item.quantity}</td>
                      <td className="p-3 text-slate-400">R$ {item.unitPrice.toFixed(2)}</td>
                      <td className="p-3 font-bold text-slate-800">R$ {item.totalPrice.toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          item.status === 'approved' ? 'bg-emerald-55/10 text-emerald-700 border border-emerald-100' :
                          item.status === 'postponed' ? 'bg-amber-55/10 text-amber-700 border border-amber-100' :
                          item.status === 'rejected' ? 'bg-rose-55/10 text-rose-700 border border-rose-100' :
                          'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>
                          {item.status === 'approved' ? 'Aprovado (Fazer Agora)' :
                           item.status === 'postponed' ? 'Adiado (Fazer Depois)' :
                           item.status === 'rejected' ? 'Recusado' : 'Pendente de avaliação'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold text-sm bg-slate-50/50">
                    <td colSpan={4} className="p-3 text-right text-slate-500">Total do Orçamento:</td>
                    <td colSpan={2} className="p-3 text-indigo-600 text-base">R$ {getBudgetTotal(viewingBudget.items).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons inside Details */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Linked Converted Documents */}
              {viewingBudget.saleId && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  Venda #{viewingBudget.saleId}
                </span>
              )}
              {viewingBudget.serviceOrderId && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold font-mono">
                  <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                  OS #{viewingBudget.serviceOrderId}
                </span>
              )}

              {/* Conversion Buttons */}
              {!viewingBudget.saleId && viewingBudget.items.some(i => i.type === 'part') && (
                <button
                  id={`btn-convert-to-sale-${viewingBudget.id}`}
                  type="button"
                  onClick={() => handleConvertToSale(viewingBudget)}
                  disabled={convertingId === viewingBudget.id}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Converter itens de peças deste orçamento em uma Venda Comercial Balcão (Transfere reserva)"
                >
                  <ShoppingBag className="w-4 h-4" /> Converter em Venda
                </button>
              )}

              {!viewingBudget.serviceOrderId && (!isCommerceOnly || viewingBudget.items.some(i => i.type === 'service')) && (
                <button
                  id={`btn-convert-to-os-${viewingBudget.id}`}
                  type="button"
                  onClick={() => handleConvertToOS(viewingBudget)}
                  disabled={convertingId === viewingBudget.id}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Converter este orçamento em uma Ordem de Serviço na Oficina"
                >
                  <Wrench className="w-4 h-4" /> Converter em OS
                </button>
              )}

              {isHybrid && !viewingBudget.saleId && !viewingBudget.serviceOrderId && viewingBudget.items.some(i => i.type === 'part') && viewingBudget.items.some(i => i.type === 'service') && (
                <button
                  id={`btn-convert-to-hybrid-${viewingBudget.id}`}
                  type="button"
                  onClick={() => handleConvertToSaleAndOS(viewingBudget)}
                  disabled={convertingId === viewingBudget.id}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Converter peças em Venda e serviços em Ordem de Serviço simultaneamente"
                >
                  <Sparkles className="w-4 h-4" /> Converter em Venda + OS
                </button>
              )}

              {canEditBudgets && (
                <button
                  id={`btn-edit-budget-details-${viewingBudget.id}`}
                  type="button"
                  onClick={() => openEditForm(viewingBudget)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </button>
              )}

              <button
                id={`btn-share-budget-details-${viewingBudget.id}`}
                type="button"
                onClick={() => setShareModalData({ isOpen: true, budget: viewingBudget })}
                className="bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-4 h-4" /> Enviar WhatsApp / E-mail
              </button>

              {viewingBudget.status === 'pending' && (
                <button 
                  id="btn-simulate-decision-details"
                  onClick={() => launchApprovalSimulator(viewingBudget)} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" /> Registrar Decisão do Cliente
                </button>
              )}
            </div>
            
            <button id="btn-back-to-list" onClick={() => setViewingBudget(null)} className="text-slate-500 hover:text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer">
              Voltar para Listagem
            </button>
          </div>
        </div>
      )}

      {/* BUDGETS LIST TABLE */}
      {!isFormOpen && !viewingBudget && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="budgets-list-panel">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="budget-search-input"
                type="text" 
                placeholder="Buscar por código de orçamento, cliente ou placa..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>
            {/* Status of company reservation policy */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <span>Política de Reserva:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                reservationMode === 'reserve_while_valid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {reservationMode === 'reserve_while_valid' ? `Reserva Ativa (${defaultValidityDays}d)` : 'Sem Reserva'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="budgets-table">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                  <th className="p-4">Código</th>
                  <th className="p-4">Segmento</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Veículo</th>
                  <th className="p-4">Emissão</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Reserva Estoque</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Ações & Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredBudgets.map(budget => {
                  const hasOS = !!budget.serviceOrderId || db.serviceOrders.some(os => os.budgetId === budget.id);
                  const hasSale = !!budget.saleId || (db.sales && db.sales.some(s => s.budgetId === budget.id));
                  const hasParts = budget.items.some(i => i.type === 'part');
                  const hasServices = budget.items.some(i => i.type === 'service');
                  const isBalcao = budget.segmentType === 'COMERCIO' || !budget.vehicleId;

                  return (
                    <tr key={budget.id} className="hover:bg-slate-50/50 transition duration-150" id={`budget-row-${budget.id}`}>
                      <td className="p-4 font-mono text-xs font-bold text-indigo-600 uppercase">
                        #{budget.id}
                      </td>
                      <td className="p-4">
                        {isBalcao ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <ShoppingBag className="w-3 h-3" /> Balcão
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Wrench className="w-3 h-3" /> Oficina
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{getClientName(budget.clientId)}</td>
                      <td className="p-4">
                        {budget.vehicleId ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-700 text-xs">{getVehicleDesc(budget.vehicleId)}</p>
                            <p className="font-mono text-[11px] text-slate-400 uppercase">{getVehiclePlate(budget.vehicleId)}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Venda Balcão (S/ Veículo)</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-mono">
                        {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        R$ {getBudgetTotal(budget.items).toFixed(2)}
                      </td>
                      <td className="p-4">
                        {/* Reservation status badge */}
                        {budget.stockReservationStatus === 'CONVERTED' ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            ✓ Convertido
                          </span>
                        ) : budget.stockReservationStatus === 'ACTIVE' || (reservationMode === 'reserve_while_valid' && budget.status === 'pending' && budget.stockReservationStatus !== 'NONE' && budget.stockReservationStatus !== 'EXPIRED') ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Reserva Ativa
                          </span>
                        ) : budget.stockReservationStatus === 'EXPIRED' ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Expirado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                            Sem Reserva
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded block w-fit ${
                            budget.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            budget.status === 'partially_approved' ? 'bg-amber-50 text-amber-700 border border-amber-100 font-bold' :
                            budget.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {budget.status === 'pending' ? 'Pendente' :
                             budget.status === 'approved' ? 'Aprovado' :
                             budget.status === 'partially_approved' ? 'Parcial' :
                             budget.status === 'rejected' ? 'Recusado' : 'Expirado'}
                          </span>
                          {hasSale && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-mono font-bold uppercase px-1.5 py-0.5 rounded border border-emerald-200 block w-fit">
                              Venda #{budget.saleId || 'OK'}
                            </span>
                          )}
                          {hasOS && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-mono font-bold uppercase px-1.5 py-0.5 rounded border border-indigo-200 block w-fit">
                              OS #{budget.serviceOrderId || 'OK'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* Quick Conversion Buttons */}
                          {!hasSale && hasParts && (
                            <button
                              id={`btn-table-convert-sale-${budget.id}`}
                              type="button"
                              onClick={() => handleConvertToSale(budget)}
                              disabled={convertingId === budget.id}
                              className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-bold px-2 py-1 rounded text-xs border border-emerald-200 transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Converter em Venda Balcão"
                            >
                              <ShoppingBag className="w-3 h-3" /> Venda
                            </button>
                          )}

                          {!hasOS && (hasServices || !isCommerceOnly) && (
                            <button
                              id={`btn-table-convert-os-${budget.id}`}
                              type="button"
                              onClick={() => handleConvertToOS(budget)}
                              disabled={convertingId === budget.id}
                              className="text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 font-bold px-2 py-1 rounded text-xs border border-indigo-200 transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Converter em Ordem de Serviço"
                            >
                              <Wrench className="w-3 h-3" /> OS
                            </button>
                          )}

                          {budget.status === 'pending' && (
                            <button 
                              id={`btn-decision-budget-${budget.id}`}
                              type="button"
                              onClick={() => launchApprovalSimulator(budget)} 
                              className="text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 font-semibold p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs border border-slate-300 shadow-2xs cursor-pointer"
                              title="Registrar decisão do cliente"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Decisão
                            </button>
                          )}

                          {canEditBudgets && (
                            <button 
                              id={`btn-edit-budget-${budget.id}`}
                              onClick={() => openEditForm(budget)} 
                              className="text-amber-600 hover:text-amber-800 font-medium hover:bg-amber-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs"
                              title="Editar informações e itens do orçamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button 
                            id={`btn-share-budget-${budget.id}`}
                            type="button"
                            onClick={() => setShareModalData({ isOpen: true, budget })} 
                            className="text-emerald-600 hover:text-emerald-800 font-medium hover:bg-emerald-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs"
                            title="Enviar por WhatsApp / E-mail"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            id={`btn-view-budget-${budget.id}`}
                            onClick={() => setViewingBudget(budget)} 
                            className="text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs"
                            title="Ver detalhes completos do orçamento"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share Document Modal (WhatsApp / E-mail) */}
      {shareModalData.budget && (
        <ShareDocumentModal
          isOpen={shareModalData.isOpen}
          onClose={() => setShareModalData({ isOpen: false, budget: null })}
          type="budget"
          docId={shareModalData.budget.id}
          client={db.clients.find(c => c.id === shareModalData.budget?.clientId)}
          vehicle={db.vehicles.find(v => v.id === shareModalData.budget?.vehicleId)}
          items={shareModalData.budget.items.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            status: i.status
          }))}
          totalValue={getBudgetTotal(shareModalData.budget.items)}
          companyInfo={db.companyInfo}
          notes={shareModalData.budget.notes}
          currentUserRole={currentUser?.role}
          canCustomizePdf={currentUser?.permissions?.canCustomizePdf ?? true}
          onSaveCompanyOrientation={(orientation, docType) => {
            if (currentUser?.role !== 'qa' && currentUser?.role !== 'admin') return;
            if (!db.companyInfo) return;
            const updatedCompany = {
              ...db.companyInfo,
              reportPageOrientation: orientation,
              reportCustomOrientations: {
                ...(db.companyInfo.reportCustomOrientations || {}),
                [docType || 'budget']: orientation
              }
            };
            onSaveCompanyInfo?.(updatedCompany);
          }}
        />
      )}

      {/* MODAL DE ALERTA DE ESTOQUE RESERVADO E COMBINADO COM O CLIENTE */}
      {reservationModalData && reservationModalData.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-reservation-warning">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-amber-200 shadow-2xl overflow-hidden animate-scale-up space-y-0">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 text-amber-100 px-2 py-0.5 rounded">
                    Alerta de Estoque Reservado & Saldo Insuficiente
                  </span>
                  <h3 className="font-bold font-display text-lg mt-1 text-white">
                    Reserva em Outro Orçamento Ativo
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    A peça "{reservationModalData.part.name}" ({reservationModalData.part.code}) possui reserva(s) pendente(s).
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReservationModalData(null)}
                className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Stock Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Estoque Físico Total</span>
                  <span className="font-mono font-bold text-slate-800 text-sm block">{reservationModalData.part.stock} un</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-amber-600 block">Reservado Outros</span>
                  <span className="font-mono font-bold text-amber-700 text-sm block">{reservationModalData.totalReservedInOthers} un</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 block">Disponível Imediato</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm block">{reservationModalData.availableStock} un</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 block">Solicitado Agora</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm block">{reservationModalData.totalRequestedQty} un</span>
                </div>
              </div>

              {/* List of conflicting budgets */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Orçamentos Ativos que Estão Reservando esta Peça ({reservationModalData.reservingBudgets.length})
                </h4>
                <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-amber-200 bg-amber-100/50 text-amber-900 font-bold">
                        <th className="p-2.5">Código Orçamento</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Veículo</th>
                        <th className="p-2.5">Qtd. Reservada</th>
                        <th className="p-2.5">Data Vencimento</th>
                        <th className="p-2.5">Prazo Restante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 text-slate-800">
                      {reservationModalData.reservingBudgets.map(b => (
                        <tr key={b.budgetId} className="hover:bg-amber-100/30">
                          <td className="p-2.5 font-mono font-bold text-indigo-700">#{b.budgetId}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{b.clientName}</td>
                          <td className="p-2.5 text-slate-600">{b.vehicleInfo}</td>
                          <td className="p-2.5 font-bold text-amber-800">{b.quantity} un</td>
                          <td className="p-2.5 font-mono text-slate-700">{b.expirationDate}</td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold text-[11px] border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" />
                              {b.daysRemaining}d {b.hoursRemaining}h
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Explanatory Rule Banner */}
              <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 text-xs space-y-1.5">
                <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  Instruções para o Vendedor Explicar ao Cliente:
                </p>
                <p className="text-indigo-800 leading-relaxed">
                  Informe ao cliente que esta peça está sob reserva temporária em outro atendimento. 
                  <strong> Regra de Liberação Automática do Sistema:</strong> Caso o outro orçamento expire após o prazo de validade configurado ({validityDays} dias / datas acima), a reserva é cancelada automaticamente e a peça retorna 100% disponível ao estoque para faturamento imediato neste orçamento.
                </p>
              </div>

              {/* Agreement Notes Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between" htmlFor="reservation-agreement-textarea">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Combinado / Acordo Comercial com o Cliente *
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Será registrado neste orçamento</span>
                </label>
                <textarea
                  id="reservation-agreement-textarea"
                  rows={3}
                  value={reservationModalData.clientAgreementNote}
                  onChange={e => setReservationModalData({ ...reservationModalData, clientAgreementNote: e.target.value })}
                  placeholder="Ex: Explicado ao cliente sobre a reserva no Orçamento #orc-xxx. Cliente concordou em aguardar o vencimento da reserva ou aprovar assim que liberado..."
                  className="w-full text-xs p-3 border border-amber-300 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white font-medium shadow-2xs"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  id="btn-cancel-reservation-modal"
                  type="button"
                  onClick={() => setReservationModalData(null)}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Ajustar Quantidade / Cancelar
                </button>
                <button
                  id="btn-confirm-reservation-modal"
                  type="button"
                  onClick={handleConfirmReservationAgreement}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Confirmar & Inserir Item com o Combinado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
