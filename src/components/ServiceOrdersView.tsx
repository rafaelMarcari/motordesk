/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Wrench, 
  Check, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Plus, 
  MessageSquare,
  Clipboard,
  X,
  Send,
  ShieldCheck,
  AlertTriangle,
  FileText,
  RotateCcw,
  HelpCircle,
  Package,
  Calendar,
  RefreshCw,
  CreditCard,
  Percent,
  Receipt,
  Sparkles,
  Printer,
  Pause,
  Play,
  Filter,
  Phone,
  ExternalLink,
  Car,
  Trash2,
  FileCheck2,
  ShieldAlert
} from 'lucide-react';
import { ServiceOrder, OSItem, Part, Service, SystemNotification, MaintenanceLog, AccountReceivable, AccountInstallment, FinancialTransaction, Client, PaymentMethodOption, WorkshopStatus, FiscalDocument, BoletoDocument, CompanyInfo } from '../types';
import { AppDatabase, INITIAL_PAYMENT_METHODS } from '../data/mockData';
import WarrantyAlertBanner from './WarrantyAlertBanner';
import ShareDocumentModal from './ShareDocumentModal';
import ManagerApprovalModal from './ManagerApprovalModal';
import PreTransmissionReviewModal, { PreTransmissionDocData } from './PreTransmissionReviewModal';
import OperationResultModal from './OperationResultModal';
import { getPartStockDetails } from '../utils/stockUtils';
import { syncServiceOrdersWithBudgets, checkVehicleWarrantyStatus } from '../utils/serviceOrderUtils';

interface ServiceOrdersViewProps {
  db: AppDatabase;
  currentUser: any;
  onSaveServiceOrders: (os: ServiceOrder[]) => void;
  onSaveParts: (parts: Part[]) => void;
  onSaveMaintenanceLogs?: (logs: MaintenanceLog[]) => void;
  onSaveCompanyInfo?: (companyInfo: CompanyInfo) => void;
  onSaveReceivables?: (
    receivables: AccountReceivable[], 
    clients: Client[], 
    financialTransactions: FinancialTransaction[], 
    notifications: SystemNotification[],
    paymentMethods?: PaymentMethodOption[]
  ) => void;
  onSaveFiscalDocuments?: (fiscalDocuments: FiscalDocument[]) => void;
  onSaveBoletos?: (boletos: BoletoDocument[]) => void;
  onAddNotification?: (notification: SystemNotification) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string, metadata?: any) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

export default function ServiceOrdersView({ db, currentUser, onSaveServiceOrders, onSaveParts, onSaveMaintenanceLogs, onSaveCompanyInfo, onSaveReceivables, onSaveFiscalDocuments, onSaveBoletos, onAddNotification, onAddHistoryLog, setUnsavedTask }: ServiceOrdersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);

  // Accounts Receivable / Finalization Payment Modal State
  const [isFinishingModalOpen, setIsFinishingModalOpen] = useState(false);
  const [finishingOS, setFinishingOS] = useState<ServiceOrder | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Cartão de Crédito');
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [interestRatePercent, setInterestRatePercent] = useState<number>(3.5);
  const [firstDueDate, setFirstDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [markPaidImmediately, setMarkPaidImmediately] = useState<boolean>(false);
  const [finishingNotes, setFinishingNotes] = useState<string>('');
  const [finishFiscalOption, setFinishFiscalOption] = useState<'immediate' | 'monthly_batch'>('immediate');
  const [emitNfeOnFinish, setEmitNfeOnFinish] = useState<boolean>(true);
  const [emitBoletoOnFinish, setEmitBoletoOnFinish] = useState<boolean>(true);

  // Pre-Transmission Review Modal State
  const [preTxData, setPreTxData] = useState<PreTransmissionDocData | null>(null);
  const [pendingTxAction, setPendingTxAction] = useState<(() => Promise<void> | void) | null>(null);

  // Custom Payment Method Sub-form State
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState<boolean>(false);
  const [newPmName, setNewPmName] = useState<string>('');
  const [newPmType, setNewPmType] = useState<'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_slip' | 'custom'>('credit_card');
  const [newPmRate, setNewPmRate] = useState<number>(2.5);
  const [newPmMaxInst, setNewPmMaxInst] = useState<number>(12);

  // OS Interaction Fields
  const [technicalRecommendations, setTechnicalRecommendations] = useState('');
  const [notes, setNotes] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [techRecsError, setTechRecsError] = useState(false);

  // Operation Result Modal State
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Service Periodicity & Revision Dates
  const [serviceDate, setServiceDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [nextDueKm, setNextDueKm] = useState<number | ''>('');

  // Manager Approval Modal State
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);

  // Postponing / Reactivation States
  const [reactivatingItem, setReactivatingItem] = useState<OSItem | null>(null);
  const [reactivatePrice, setReactivatePrice] = useState<number>(0);
  const [reactivateNotes, setReactivateNotes] = useState<string>('');
  const [postponingItemId, setPostponingItemId] = useState<string | null>(null);
  const [postponeReason, setPostponeReason] = useState<string>('');

  // Mechanic OS Closure Modal State
  const [isMechanicCloseModalOpen, setIsMechanicCloseModalOpen] = useState(false);
  const [mechanicClosingOS, setMechanicClosingOS] = useState<ServiceOrder | null>(null);
  const [closureType, setClosureType] = useState<'TOTAL' | 'PARCIAL'>('TOTAL');
  const [mechanicNotes, setMechanicNotes] = useState('');

  // Suggestion Form fields (RN006)
  const [suggestionType, setSuggestionType] = useState<'part' | 'service'>('part');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [suggestionQty, setSuggestionQty] = useState<number>(1);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Share Modal State (WhatsApp & Email)
  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    os: ServiceOrder | null;
  }>({ isOpen: false, os: null });

  // Workshop Traffic Light Monitor State
  const [isWorkshopMonitorOpen, setIsWorkshopMonitorOpen] = useState(false);
  const [workshopFilter, setWorkshopFilter] = useState<'all' | 'gray' | 'yellow' | 'red' | 'green' | 'blue'>('all');
  const [editingPauseOS, setEditingPauseOS] = useState<ServiceOrder | null>(null);
  const [pauseReasonInput, setPauseReasonInput] = useState('');
  const [monitorSearchQuery, setMonitorSearchQuery] = useState('');

  // Deposit Payment Modal State
  const [depositModalOS, setDepositModalOS] = useState<ServiceOrder | null>(null);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<string>('PIX');

  const activeCompanyId = currentUser?.companyId || db.companyInfo?.id || 'comp-1';
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to register deposit payment
  const handleRegisterDeposit = (os: ServiceOrder, paymentMethod: string = 'PIX') => {
    const totalVal = os.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const depositAmt = os.requiredDepositAmount || (totalVal * ((os.requiredDepositPercentage || 30) / 100));
    
    const updatedOS: ServiceOrder = {
      ...os,
      isDepositPaid: true,
      depositPaidAmount: depositAmt,
      depositPaidAt: new Date().toISOString(),
      depositPaymentMethod: paymentMethod
    };

    const updatedList = db.serviceOrders.map(item => item.id === os.id ? updatedOS : item);
    onSaveServiceOrders(updatedList);
    if (selectedOS?.id === os.id) {
      setSelectedOS(updatedOS);
    }

    onAddHistoryLog(
      'service_order',
      'Sinal de Entrada Quitado',
      `Confirmado recebimento do sinal de R$ ${depositAmt.toFixed(2)} (${os.requiredDepositPercentage || 30}%) para a OS #${os.id} via ${paymentMethod}. Execução liberada.`,
      os.clientId,
      os.vehicleId,
      { osId: os.id, depositAmt, paymentMethod }
    );

    setSuccessMsg(`Sinal de R$ ${depositAmt.toFixed(2)} recebido com sucesso via ${paymentMethod}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Helper to determine traffic light status for an OS
  const getOSWorkshopColor = (os: ServiceOrder): WorkshopStatus => {
    if (os.workshopStatus) {
      if ((os.workshopStatus as string) === 'red') return 'green'; // Former red mapped to green (Em Andamento)
      return os.workshopStatus;
    }
    if (os.status === 'completed') return 'blue'; // Completed mapped to blue (Liberado)
    if (os.status === 'executing') return 'green'; // Executing mapped to green (Em Andamento)
    return 'gray';
  };

  // Filter cars in the active workshop monitor (Scoped to company, active colors, blue daily reset)
  const activeWorkshopOrders = db.serviceOrders.filter(os => {
    const osCompany = os.companyId || 'comp-1';
    if (osCompany !== activeCompanyId) return false;
    if (os.status === 'canceled') return false;

    const color = getOSWorkshopColor(os);
    
    // Blue/Liberado logic: cleared daily if isGreenCleared is true OR if updated date is before today
    if (color === 'blue') {
      if (os.isGreenCleared) return false;
      if (os.workshopStatusUpdatedAt && os.workshopStatusUpdatedAt < todayStr) return false;
    }

    return true;
  });

  // Handler to update traffic light status
  const handleSetWorkshopStatus = (osId: string, newStatus: WorkshopStatus, reason?: string, forceOverrideDeposit: boolean = false) => {
    const targetOS = db.serviceOrders.find(o => o.id === osId);
    if (!targetOS) return;

    // Normalizing legacy 'red' to 'green'
    const effectiveStatus = (newStatus as string) === 'red' ? 'green' : newStatus;

    // Check if deposit is required before starting execution (green / em andamento)
    if (
      effectiveStatus === 'green' &&
      !forceOverrideDeposit &&
      (targetOS.paymentRequirementMode === 'ADVANCE_DEPOSIT' || targetOS.paymentRequirementMode === 'FULL_ADVANCE') &&
      !targetOS.isDepositPaid &&
      (db.alertSettings?.requireDepositToExecuteOS !== false)
    ) {
      setDepositModalOS(targetOS);
      return;
    }

    const updatedOrders = db.serviceOrders.map(os => {
      if (os.id === osId) {
        let updatedCoreStatus = os.status;
        if (effectiveStatus === 'green') updatedCoreStatus = 'executing';
        if (effectiveStatus === 'gray') updatedCoreStatus = 'pending';
        if (effectiveStatus === 'blue') updatedCoreStatus = 'completed';

        return {
          ...os,
          workshopStatus: effectiveStatus,
          workshopStatusUpdatedAt: todayStr,
          pauseReason: effectiveStatus === 'yellow' ? (reason || os.pauseReason || 'Falta de Peça') : undefined,
          status: updatedCoreStatus,
          isGreenCleared: effectiveStatus === 'blue' ? false : os.isGreenCleared
        };
      }
      return os;
    });

    onSaveServiceOrders(updatedOrders);

    // Sync selected OS if open
    if (selectedOS && selectedOS.id === osId) {
      const synced = updatedOrders.find(o => o.id === osId);
      if (synced) setSelectedOS(synced);
    }

    // Log history
    const statusTextMap: Record<string, string> = {
      gray: 'OS Não Iniciada - Sinalizador Cinza (Aguardando início dos trabalhos)',
      yellow: `OS Pausada - Sinalizador Amarelo (${reason || targetOS.pauseReason || 'Falta de peça / aprovação'})`,
      green: 'Reparo em Andamento - Sinalizador Verde (Manutenção ativa no box)',
      blue: 'Carro Liberado para Busca - Sinalizador Azul (Serviço concluído)'
    };

    onAddHistoryLog(
      'service_order',
      `Semáforo da Oficina Atualizado: ${effectiveStatus.toUpperCase()}`,
      `O status no semáforo da OS ${osId} foi alterado para: ${statusTextMap[effectiveStatus] || effectiveStatus}. Atualizado por: ${currentUser?.name || 'Mecânico'}`,
      targetOS.clientId,
      targetOS.vehicleId
    );

    setSuccessMsg(`Sinalizador da OS #${osId} atualizado para ${effectiveStatus.toUpperCase()}.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Clear blue (liberados) status daily
  const handleClearGreenOrders = () => {
    const updated = db.serviceOrders.map(os => {
      const color = getOSWorkshopColor(os);
      if (color === 'blue') {
        return {
          ...os,
          isGreenCleared: true,
          workshopStatusUpdatedAt: todayStr
        };
      }
      return os;
    });

    onSaveServiceOrders(updated);
    setSuccessMsg('🧹 Painel zerado para os veículos liberados (Verde). Mantidos veículos em andamento, pausados e não iniciados.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Count pending manager approval requests across system
  const pendingApprovalsCount = db.serviceOrders.reduce((count, os) => {
    return count + os.items.filter(i => i.priceChangeApproval && i.priceChangeApproval.status === 'pending').length;
  }, 0);

  // Setup suggestion selections
  useEffect(() => {
    if (isSuggesting) {
      if (db.parts.length > 0 && !selectedPartId) setSelectedPartId(db.parts[0].id);
      if (db.services.length > 0 && !selectedServiceId) setSelectedServiceId(db.services[0].id);
    }
  }, [isSuggesting, db]);

  // Sync edits on selected OS change
  useEffect(() => {
    if (selectedOS) {
      setTechnicalRecommendations(selectedOS.technicalRecommendations || '');
      setNotes(selectedOS.notes || '');
      setTechRecsError(false);

      const srvDate = selectedOS.serviceDate || new Date().toISOString().split('T')[0];
      setServiceDate(srvDate);

      if (selectedOS.nextDueDate) {
        setNextDueDate(selectedOS.nextDueDate);
      } else {
        const d = new Date(srvDate);
        d.setMonth(d.getMonth() + 6);
        setNextDueDate(d.toISOString().split('T')[0]);
      }

      if (selectedOS.nextDueKm !== undefined) {
        setNextDueKm(selectedOS.nextDueKm);
      } else {
        const veh = db.vehicles.find(v => v.id === selectedOS.vehicleId);
        setNextDueKm(veh?.currentKm ? veh.currentKm + 10000 : '');
      }
    }
  }, [selectedOS?.id]);

  // Auto-sync Service Orders with linked Budgets
  useEffect(() => {
    if (db.serviceOrders && db.budgets) {
      const { updatedOrders, hasChanges } = syncServiceOrdersWithBudgets(db.serviceOrders, db.budgets);
      if (hasChanges) {
        onSaveServiceOrders(updatedOrders);
        if (selectedOS) {
          const syncedActiveOS = updatedOrders.find(o => o.id === selectedOS.id);
          if (syncedActiveOS) setSelectedOS(syncedActiveOS);
        }
      }
    }
  }, [db.serviceOrders, db.budgets]);

  // Quick preset helper for adding months to nextDueDate
  const handleAddMonthsToDueDate = (months: number) => {
    const base = serviceDate ? new Date(serviceDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setNextDueDate(base.toISOString().split('T')[0]);
  };

  const isFormDirty = selectedOS && (
    technicalRecommendations !== (selectedOS.technicalRecommendations || '') ||
    notes !== (selectedOS.notes || '') ||
    serviceDate !== (selectedOS.serviceDate || '') ||
    nextDueDate !== (selectedOS.nextDueDate || '') ||
    (nextDueKm !== '' ? Number(nextDueKm) : undefined) !== selectedOS.nextDueKm
  );

  const handleCloseDetails = () => {
    setSelectedOS(null);
    setIsSuggesting(false);
    setReactivatingItem(null);
    setPostponingItemId(null);
    setErrorMsg('');
    setUnsavedTask(null);
  };

  const getClientName = (id: string) => db.clients.find(c => c.id === id)?.name || 'Cliente Desconhecido';
  const getVehiclePlate = (id: string) => db.vehicles.find(v => v.id === id)?.plate || 'S/P';
  const getVehicleDesc = (id: string) => {
    const v = db.vehicles.find(veh => veh.id === id);
    return v ? `${v.brand} ${v.model} (${v.year})` : 'Veículo Desconhecido';
  };
  const getMechanicName = (id: string) => db.users.find(u => u.id === id)?.name || 'Mecânico Não Atribuído';

  const getOSTotal = (osItems: OSItem[]) => {
    // Count all active execution items (pending, executing, or completed), excluding postponed or canceled items
    return osItems
      .filter(item => item.status !== 'postponed' && item.status !== 'canceled')
      .reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Mark an item as Postponed / Deferred ("Cliente resolveu não fazer neste momento")
  const handleMarkItemPostponed = (itemId: string) => {
    if (!selectedOS) return;
    const target = selectedOS.items.find(i => i.id === itemId);
    if (!target) return;

    const updatedItems = selectedOS.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'postponed' as const,
          originalUnitPrice: item.originalUnitPrice || item.unitPrice,
          serviceNotes: postponeReason || item.serviceNotes || 'Cliente optou por não realizar este item neste momento.'
        };
      }
      return item;
    });

    const updatedOS: ServiceOrder = { ...selectedOS, items: updatedItems };
    const updatedOSList = db.serviceOrders.map(o => o.id === selectedOS.id ? updatedOS : o);

    onSaveServiceOrders(updatedOSList);
    setSelectedOS(updatedOS);

    onAddHistoryLog(
      'service_order',
      'Item Adiado a Pedido do Cliente',
      `O item "${target.name}" na OS ${selectedOS.id} foi marcado como ADIADO (não será feito no momento). Motivo/Observação: ${postponeReason || 'Decisão do cliente'}.`,
      selectedOS.clientId,
      selectedOS.vehicleId
    );

    setSuccessMsg(`O item "${target.name}" foi registrado como Adiado (Não fazer agora).`);
    setTimeout(() => setSuccessMsg(''), 3500);
    setPostponingItemId(null);
    setPostponeReason('');
  };

  // Open modal to Reactivate a postponed item ("quando for realizado")
  const handleOpenReactivateModal = (item: OSItem) => {
    // Look up current catalog price in parts or services to check if catalog price changed
    let catalogPrice = item.unitPrice;
    if (item.type === 'part') {
      const part = db.parts.find(p => p.id === item.itemId);
      if (part) catalogPrice = part.price;
    } else {
      const service = db.services.find(s => s.id === item.itemId);
      if (service) catalogPrice = service.price;
    }

    setReactivatingItem(item);
    setReactivatePrice(catalogPrice);
    setReactivateNotes(item.serviceNotes || '');
  };

  // Confirm Reactivation of Postponed Item
  const handleConfirmReactivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS || !reactivatingItem) return;

    const originalPrice = reactivatingItem.originalUnitPrice ?? reactivatingItem.unitPrice;
    const isPriceChanged = Math.abs(reactivatePrice - originalPrice) > 0.01;

    if (isPriceChanged) {
      // PRICE CHANGED -> Requires Manager Approval!
      const updatedItems = selectedOS.items.map(item => {
        if (item.id === reactivatingItem.id) {
          return {
            ...item,
            status: 'postponed' as const, // Keeps postponed until manager approves!
            serviceNotes: reactivateNotes,
            priceChangeApproval: {
              id: `appr-${Date.now()}`,
              osId: selectedOS.id,
              itemId: item.id,
              itemName: item.name,
              originalPrice: originalPrice,
              requestedNewPrice: reactivatePrice,
              requestedAt: new Date().toISOString(),
              requestedBy: currentUser.name || 'Atendente',
              status: 'pending' as const,
              serviceNotes: reactivateNotes
            }
          };
        }
        return item;
      });

      const updatedOS: ServiceOrder = { ...selectedOS, items: updatedItems };
      const updatedOSList = db.serviceOrders.map(o => o.id === selectedOS.id ? updatedOS : o);

      onSaveServiceOrders(updatedOSList);
      setSelectedOS(updatedOS);

      onAddHistoryLog(
        'service_order',
        'Solicitada Aprovação do Gerente para Alteração de Valor em Item Adiado',
        `Tentativa de reativar o item "${reactivatingItem.name}" na OS ${selectedOS.id} com alteração de preço de R$ ${originalPrice.toFixed(2)} para R$ ${reactivatePrice.toFixed(2)}. Solicitante: ${currentUser.name}. Aguardando Gerente.`,
        selectedOS.clientId,
        selectedOS.vehicleId,
        {
          osId: selectedOS.id,
          itemId: reactivatingItem.id,
          originalPrice,
          newPrice: reactivatePrice
        }
      );

      if (onAddNotification) {
        onAddNotification({
          id: `notif-price-appr-${Date.now()}`,
          type: 'price_approval_required',
          title: 'Aprovação do Gerente Solicitada (Alteração de Valor)',
          message: `O item adiado "${reactivatingItem.name}" na OS #${selectedOS.id} teve alteração de valor de R$ ${originalPrice.toFixed(2)} para R$ ${reactivatePrice.toFixed(2)}. Liberação requer aprovação do Gerente.`,
          date: new Date().toISOString(),
          read: false,
          metadata: {
            serviceOrderId: selectedOS.id,
            itemId: reactivatingItem.id,
            itemName: reactivatingItem.name,
            originalPrice,
            newPrice: reactivatePrice,
            priceDifference: reactivatePrice - originalPrice
          }
        });
      }

      setSuccessMsg('⚠️ Solicitação enviada ao Gerente! Como houve alteração no valor da peça/item, a execução só é liberada mediante aprovação na sessão do Gerente.');
      setTimeout(() => setSuccessMsg(''), 6000);
    } else {
      // PRICE UNCHANGED -> Immediately reactivate to executing!
      const updatedItems = selectedOS.items.map(item => {
        if (item.id === reactivatingItem.id) {
          return {
            ...item,
            status: 'executing' as const,
            unitPrice: originalPrice,
            totalPrice: originalPrice * item.quantity,
            serviceNotes: reactivateNotes,
            priceChangeApproval: undefined
          };
        }
        return item;
      });

      const updatedOS: ServiceOrder = { ...selectedOS, items: updatedItems };
      const updatedOSList = db.serviceOrders.map(o => o.id === selectedOS.id ? updatedOS : o);

      onSaveServiceOrders(updatedOSList);
      setSelectedOS(updatedOS);

      onAddHistoryLog(
        'service_order',
        'Item Adiado Reativado com Sucesso',
        `O item "${reactivatingItem.name}" foi reativado para execução na OS ${selectedOS.id} mantendo o valor original de R$ ${originalPrice.toFixed(2)}.`,
        selectedOS.clientId,
        selectedOS.vehicleId
      );

      setSuccessMsg(`O item "${reactivatingItem.name}" foi reativado para execução!`);
      setTimeout(() => setSuccessMsg(''), 3500);
    }

    setReactivatingItem(null);
  };

  // Registered or Default Payment Methods
  const activePaymentMethods = db.paymentMethods || INITIAL_PAYMENT_METHODS;

  // Open finishing modal for OS
  const openFinishingModal = (os: ServiceOrder) => {
    setFinishingOS(os);
    const defaultPm = activePaymentMethods.find(pm => pm.name.toLowerCase().includes('crédito') || pm.name.toLowerCase().includes('credito')) || activePaymentMethods[0];
    const initialPmName = defaultPm ? defaultPm.name : 'Cartão de Crédito';
    const initialRate = defaultPm?.defaultInterestRatePercent ?? 3.5;
    
    setSelectedPaymentMethod(initialPmName);
    setInterestRatePercent(initialRate);
    setInstallmentsCount(3);
    setFirstDueDate(new Date().toISOString().split('T')[0]);
    setMarkPaidImmediately(false);
    setFinishingNotes('');
    setIsAddingPaymentMethod(false);
    setIsFinishingModalOpen(true);
  };

  // Handle changing payment method in modal
  const handleSelectPaymentMethod = (pmName: string) => {
    setSelectedPaymentMethod(pmName);
    const pmObj = activePaymentMethods.find(p => p.name === pmName);
    if (pmObj) {
      if (pmObj.defaultInterestRatePercent !== undefined) {
        setInterestRatePercent(pmObj.defaultInterestRatePercent);
      }
      if (pmObj.type === 'pix' || pmObj.type === 'cash') {
        setInstallmentsCount(1);
        setMarkPaidImmediately(true);
      } else if (pmObj.type === 'debit_card') {
        setInstallmentsCount(1);
        setMarkPaidImmediately(false);
      } else {
        setMarkPaidImmediately(false);
      }
    }
  };

  // Handle adding custom payment method directly
  const handleSaveNewPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmName.trim()) {
      setErrorMsg('Informe o nome da forma de pagamento.');
      return;
    }

    const newPm: PaymentMethodOption = {
      id: `pm-${Date.now()}`,
      name: newPmName.trim(),
      type: newPmType,
      defaultInterestRatePercent: newPmRate,
      maxInstallments: newPmMaxInst,
      active: true
    };

    const updatedPms = [...activePaymentMethods, newPm];
    
    // Save payment methods to DB
    if (onSaveReceivables) {
      onSaveReceivables(
        db.accountsReceivable || [],
        db.clients || [],
        db.financialTransactions || [],
        db.notifications || [],
        updatedPms
      );
    }

    setSelectedPaymentMethod(newPm.name);
    setInterestRatePercent(newPmRate);
    setInstallmentsCount(Math.min(3, newPmMaxInst));
    setIsAddingPaymentMethod(false);
    setNewPmName('');
    setSuccessMsg(`Forma de pagamento "${newPm.name}" cadastrada com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Calculations for Finishing OS
  const finishingSubtotal = finishingOS ? getOSTotal(finishingOS.items) : 0;
  const finishingInterestAmount = Math.round((finishingSubtotal * (interestRatePercent / 100)) * 100) / 100;
  const finishingTotalAmount = finishingSubtotal + finishingInterestAmount;

  // Generate Installment Schedule Preview
  const finishingInstallmentsSchedule = React.useMemo(() => {
    if (!finishingTotalAmount || installmentsCount <= 0) return [];
    const list = [];
    const startDate = firstDueDate ? new Date(firstDueDate) : new Date();

    const baseAmount = Math.floor((finishingTotalAmount / installmentsCount) * 100) / 100;
    const remainder = Math.round((finishingTotalAmount - baseAmount * installmentsCount) * 100) / 100;

    for (let i = 1; i <= installmentsCount; i++) {
      const instDueDate = new Date(startDate);
      instDueDate.setMonth(instDueDate.getMonth() + (i - 1));

      const amount = i === 1 ? baseAmount + remainder : baseAmount;

      list.push({
        installmentNumber: i,
        dueDate: instDueDate.toISOString().split('T')[0],
        amount
      });
    }

    return list;
  }, [finishingTotalAmount, installmentsCount, firstDueDate]);

  // Execute Finish OS & Create Account Receivable
  const handleConfirmFinishingAndReceivable = () => {
    if (!finishingOS) return;

    if (finishingTotalAmount <= 0) {
      setErrorMsg('Não é possível gerar Contas a Receber para uma OS sem valor ou itens executados.');
      return;
    }

    const client = db.clients.find(c => c.id === finishingOS.clientId);

    // Pre-transmission review modal check
    if (finishFiscalOption === 'immediate' && (emitNfeOnFinish || emitBoletoOnFinish) && !preTxData) {
      const existingDocs = db.fiscalDocuments || [];
      const nfeNumber = existingDocs.length + 101;
      const nfeCode = `NFE-${String(nfeNumber).padStart(6, '0')}`;
      const accessKey = `352607${String(Date.now()).slice(-8)}${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;

      const draftReview: PreTransmissionDocData = {
        type: emitNfeOnFinish ? 'nfe' : 'boleto',
        title: `Conferência Pré-Transmissão: Encerramento da OS #${finishingOS.id}`,
        nfeCode: emitNfeOnFinish ? nfeCode : undefined,
        nfeTypeLabel: 'NF-e 4.00 (Serviços e Peças Automotive)',
        companyName: db.companyInfo?.tradeName || db.companyInfo?.name || 'Oficina Mecânica',
        companyCnpj: db.companyInfo?.cnpj || '00.000.000/0001-91',
        clientName: client?.name || 'Cliente Desconhecido',
        clientCpfCnpj: client?.cpf || client?.cpfCnpj || '000.000.000-00',
        clientAddress: 'Endereço cadastrado na ficha do cliente',
        cfop: db.sefazConfig?.defaultProductCfop || '5.102',
        totalProducts: finishingSubtotal * 0.6,
        totalServices: finishingSubtotal * 0.4,
        totalTaxes: Math.round(finishingTotalAmount * 0.08 * 100) / 100,
        totalAmount: finishingTotalAmount,
        draftAccessKey: accessKey,
        items: finishingOS.items.map(item => ({
          id: item.id,
          code: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          type: item.type === 'service' ? 'service' : 'part',
          icmsRatePercent: db.sefazConfig?.defaultIcmsRatePercent || 18,
          issRatePercent: db.sefazConfig?.defaultIssRatePercent || 5
        })),
        boletoCode: emitBoletoOnFinish ? `BOL-${new Date().getFullYear()}-001` : undefined,
        bankName: 'Itaú Unibanco (341)',
        bankCode: '341',
        barcodeNumber: `34191.${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} 1 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        dueDate: finishingInstallmentsSchedule[0]?.dueDate || firstDueDate,
        payerName: client?.name || 'Cliente Desconhecido',
        payerCpfCnpj: client?.cpf || '000.000.000-00'
      };

      setPreTxData(draftReview);
      setPendingTxAction(() => () => {
        executeActualOSFinalization();
      });
      setIsFinishingModalOpen(false);
      return;
    }

    executeActualOSFinalization();
  };

  const executeActualOSFinalization = () => {
    if (!finishingOS) return;
    const client = db.clients.find(c => c.id === finishingOS.clientId);
    const existingReceivables = db.accountsReceivable || [];
    const codeNumber = existingReceivables.length + 1;
    const codeStr = `CR-${new Date().getFullYear()}-${String(codeNumber).padStart(3, '0')}`;

    // Generate Installment records
    const installments: AccountInstallment[] = finishingInstallmentsSchedule.map(item => ({
      id: `parc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${item.installmentNumber}`,
      installmentNumber: item.installmentNumber,
      totalInstallments: installmentsCount,
      amount: item.amount,
      paidAmount: markPaidImmediately ? item.amount : 0,
      dueDate: item.dueDate,
      status: markPaidImmediately ? 'paid' : 'pending',
      paymentDate: markPaidImmediately ? new Date().toISOString().split('T')[0] : undefined,
      paymentMethod: selectedPaymentMethod,
      receiptNotes: markPaidImmediately ? 'Quitado no encerramento da OS' : undefined
    }));

    // Credit limit check
    const clientLimit = client?.maxCreditLimit !== undefined ? client.maxCreditLimit : 3000;
    const currentDebt = client?.currentDebt || 0;
    const projectedDebt = currentDebt + finishingTotalAmount;
    const limitExceeded = !markPaidImmediately && projectedDebt > clientLimit;

    // Build Account Receivable Object
    const newReceivable: AccountReceivable = {
      id: `rec-${Date.now()}`,
      code: codeStr,
      clientId: finishingOS.clientId,
      clientName: client?.name || 'Cliente Desconhecido',
      clientCpf: client?.cpf,
      serviceOrderId: finishingOS.id,
      budgetId: finishingOS.budgetId,
      title: `OS ${finishingOS.id} - ${getVehicleDesc(finishingOS.vehicleId)}`,
      originalAmount: finishingSubtotal,
      interestRatePercent: interestRatePercent,
      interestAmount: finishingInterestAmount,
      paymentMethod: selectedPaymentMethod,
      totalAmount: finishingTotalAmount,
      paidAmount: markPaidImmediately ? finishingTotalAmount : 0,
      remainingAmount: markPaidImmediately ? 0 : finishingTotalAmount,
      status: markPaidImmediately ? 'paid' : (limitExceeded ? 'blocked_credit_limit' : 'pending'),
      installmentsCount: installmentsCount,
      dueDate: finishingInstallmentsSchedule[0]?.dueDate || firstDueDate,
      createdAt: new Date().toISOString(),
      installments: installments,
      creditLimitExceeded: limitExceeded,
      creditLimitAttempted: limitExceeded ? projectedDebt : undefined,
      notes: finishingNotes.trim() ? finishingNotes : `Gerado na conclusão da OS ${finishingOS.id}. Forma: ${selectedPaymentMethod} (${installmentsCount}x)${interestRatePercent > 0 ? ` com ${interestRatePercent}% de juros da maquininha.` : '.'}`,
      billingType: finishFiscalOption,
      billingMonth: new Date().toISOString().substring(0, 7)
    };

    // Generate Fiscal Document (NF-e/NFS-e) if immediate option selected
    let createdNfe: FiscalDocument | undefined = undefined;
    if (finishFiscalOption === 'immediate' && emitNfeOnFinish) {
      const existingDocs = db.fiscalDocuments || [];
      const nfeNumber = existingDocs.length + 101;
      const nfeCode = `NFE-${String(nfeNumber).padStart(6, '0')}`;
      const accessKey = `352607${String(Date.now()).slice(-8)}${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;

      createdNfe = {
        id: `nfe-${Date.now()}`,
        code: nfeCode,
        type: 'nfe_product',
        status: 'authorized',
        accessKey,
        protocolNumber: `13526${Math.floor(10000000 + Math.random() * 90000000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        issuedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        companyId: currentUser.companyId || 'company-001',
        companyName: db.companyInfo?.tradeName || db.companyInfo?.name || 'Oficina Mecânica',
        companyCnpj: db.companyInfo?.cnpj || '00.000.000/0001-91',
        clientId: finishingOS.clientId,
        clientName: client?.name || 'Cliente Desconhecido',
        clientCpfCnpj: client?.cpf || client?.cpfCnpj || '000.000.000-00',
        serviceOrderId: finishingOS.id,
        budgetId: finishingOS.budgetId,
        receivableId: newReceivable.id,
        receivableCode: codeStr,
        cfop: db.sefazConfig?.defaultProductCfop || '5.102',
        totalProducts: finishingSubtotal * 0.6,
        totalServices: finishingSubtotal * 0.4,
        totalTaxes: Math.round(finishingTotalAmount * 0.08 * 100) / 100,
        totalAmount: finishingTotalAmount,
        items: finishingOS.items.map(item => ({
          id: item.id,
          code: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          type: item.type === 'service' ? 'service' : 'part',
          cfop: item.type === 'service' ? (db.sefazConfig?.defaultServiceCfop || '5.933') : (db.sefazConfig?.defaultProductCfop || '5.102')
        })),
        sefazStatusMessage: '100 - Autorizado o uso da NF-e',
        environment: db.sefazConfig?.environment || 'homologation'
      };

      newReceivable.nfeId = createdNfe.id;
      newReceivable.nfeCode = createdNfe.code;
      newReceivable.nfeStatus = 'authorized';
      newReceivable.nfeAccessKey = createdNfe.accessKey;

      if (onSaveFiscalDocuments) {
        onSaveFiscalDocuments([createdNfe, ...existingDocs]);
      }
    } else if (finishFiscalOption === 'monthly_batch') {
      newReceivable.nfeStatus = 'draft';
    }

    // Generate Boleto Document if immediate option selected
    let createdBoleto: BoletoDocument | undefined = undefined;
    if (finishFiscalOption === 'immediate' && emitBoletoOnFinish) {
      const existingBoletos = db.boletos || [];
      const bolNumber = existingBoletos.length + 1;
      const boletoCode = `BOL-${new Date().getFullYear()}-${String(bolNumber).padStart(3, '0')}`;
      const barcodeNumber = `34191.${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} 1 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

      createdBoleto = {
        id: `bol-${Date.now()}`,
        code: boletoCode,
        bankCode: '341',
        bankName: 'Itaú Unibanco',
        barcodeNumber,
        pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${finishingTotalAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
        pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${finishingTotalAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
        payerName: client?.name || 'Cliente Desconhecido',
        payerCpfCnpj: client?.cpf || '000.000.000-00',
        amount: finishingTotalAmount,
        dueDate: finishingInstallmentsSchedule[0]?.dueDate || firstDueDate,
        issueDate: new Date().toISOString().split('T')[0],
        status: markPaidImmediately ? 'paid' : 'registered',
        companyId: currentUser.companyId || 'company-001',
        serviceOrderId: finishingOS.id,
        receivableId: newReceivable.id,
        nfeAccessKey: createdNfe?.accessKey
      };

      newReceivable.boletoId = createdBoleto.id;
      newReceivable.boletoCode = createdBoleto.code;
      newReceivable.boletoStatus = markPaidImmediately ? 'paid' : 'registered';
      newReceivable.boletoBarcode = createdBoleto.barcodeNumber;

      if (onSaveBoletos) {
        onSaveBoletos([createdBoleto, ...existingBoletos]);
      }
    }

    // Update Client Debt if unpaid
    const updatedClients = db.clients.map(c => {
      if (c.id === finishingOS.clientId) {
        return {
          ...c,
          currentDebt: markPaidImmediately ? (c.currentDebt || 0) : ((c.currentDebt || 0) + finishingTotalAmount)
        };
      }
      return c;
    });

    // Create Financial Transaction if paid immediately
    const currentTransactions = db.financialTransactions || [];
    let updatedTransactions = [...currentTransactions];

    if (markPaidImmediately) {
      const newTx: FinancialTransaction = {
        id: `tx-${Date.now()}`,
        type: 'income',
        category: 'Serviços & Peças (OS)',
        description: `Recebimento OS ${finishingOS.id} (${selectedPaymentMethod}) - ${client?.name || ''}`,
        amount: finishingTotalAmount,
        date: new Date().toISOString(),
        paymentMethod: selectedPaymentMethod,
        referenceId: finishingOS.id,
        clientId: finishingOS.clientId,
        createdByName: currentUser.name || 'Atendente/Mecânico'
      };
      updatedTransactions = [newTx, ...updatedTransactions];
    }

    // Build System Notification
    let updatedNotifications = db.notifications || [];
    const newNotif: SystemNotification = {
      id: `notif-os-finish-${Date.now()}`,
      type: 'service_order_created',
      title: '✅ OS Concluída e Contas a Receber Gerado',
      message: `A OS ${finishingOS.id} de ${client?.name || 'Cliente'} foi concluída (Total: R$ ${finishingTotalAmount.toFixed(2)} em ${installmentsCount}x via ${selectedPaymentMethod}). Contas a Receber ${codeStr} gerado.`,
      date: new Date().toISOString(),
      read: false,
      metadata: {
        serviceOrderId: finishingOS.id,
        clientId: finishingOS.clientId,
        clientName: client?.name,
        receivableId: newReceivable.id
      }
    };
    updatedNotifications = [newNotif, ...updatedNotifications];

    // Update OS List
    const updatedOSList = db.serviceOrders.map(os => {
      if (os.id === finishingOS.id) {
        return {
          ...os,
          status: 'completed' as const,
          completedAt: os.completedAt || new Date().toISOString(),
          paymentStatus: markPaidImmediately ? ('paid' as const) : ('pending' as const)
        };
      }
      return os;
    });

    // Save Receivables, Clients, Transactions, Notifications
    const updatedReceivablesList = [newReceivable, ...existingReceivables.filter(r => r.serviceOrderId !== finishingOS.id)];

    if (onSaveReceivables) {
      onSaveReceivables(
        updatedReceivablesList,
        updatedClients,
        updatedTransactions,
        updatedNotifications,
        activePaymentMethods
      );
    }

    // Save OS List
    onSaveServiceOrders(updatedOSList);

    // Maintenance Logs for Periodic Items
    if (onSaveMaintenanceLogs) {
      const vehicle = db.vehicles.find(v => v.id === finishingOS.vehicleId);
      const currentKm = vehicle?.currentKm || 0;
      const newLogs: MaintenanceLog[] = [];

      const effectiveServiceDate = finishingOS.serviceDate || serviceDate || new Date().toISOString().split('T')[0];
      const effectiveNextDueDate = finishingOS.nextDueDate || nextDueDate || (() => {
        const d = new Date(effectiveServiceDate);
        d.setMonth(d.getMonth() + 6);
        return d.toISOString().split('T')[0];
      })();
      const effectiveNextDueKm = finishingOS.nextDueKm ?? (nextDueKm !== '' ? Number(nextDueKm) : (currentKm + 10000));

      finishingOS.items.forEach(item => {
        if (item.type === 'service') {
          const srv = db.services.find(s => s.id === item.itemId);
          if (srv && (srv.isPeriodic || srv.maintenanceControl?.enabled)) {
            const ctrl = srv.maintenanceControl;
            const intervalKm = ctrl?.defaultIntervalKm || 10000;

            newLogs.push({
              id: `maint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              vehicleId: finishingOS.vehicleId,
              clientId: finishingOS.clientId,
              serviceOrderId: finishingOS.id,
              serviceDate: effectiveServiceDate,
              serviceKm: currentKm,
              category: ctrl?.category || 'oil_change',
              itemDescription: srv.name,
              nextDueKm: effectiveNextDueKm || (currentKm + intervalKm),
              nextDueDate: effectiveNextDueDate,
              notes: ctrl?.recommendedInstructions || `Realizado em OS ${finishingOS.id}`
            });
          }
        } else if (item.type === 'part') {
          const prt = db.parts.find(p => p.id === item.itemId);
          if (prt && (prt.isPeriodic || prt.maintenanceControl?.enabled)) {
            const ctrl = prt.maintenanceControl;
            const intervalKm = ctrl?.defaultIntervalKm || 10000;

            newLogs.push({
              id: `maint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              vehicleId: finishingOS.vehicleId,
              clientId: finishingOS.clientId,
              serviceOrderId: finishingOS.id,
              serviceDate: effectiveServiceDate,
              serviceKm: currentKm,
              category: ctrl?.category || 'oil_change',
              itemDescription: prt.name,
              nextDueKm: effectiveNextDueKm || (currentKm + intervalKm),
              nextDueDate: effectiveNextDueDate,
              notes: `Item trocado em OS ${finishingOS.id}`
            });
          }
        }
      });

      if (newLogs.length > 0) {
        onSaveMaintenanceLogs([...newLogs, ...(db.maintenanceLogs || [])]);
      }
    }

    // Write History Log
    onAddHistoryLog(
      'service_order',
      'OS Concluída & Contas a Receber Lançado',
      `Ordem de Serviço ${finishingOS.id} concluída. Contas a Receber ${codeStr} gerado no valor de R$ ${finishingTotalAmount.toFixed(2)} (${installmentsCount}x via ${selectedPaymentMethod}${interestRatePercent > 0 ? ` com ${interestRatePercent}% juros de maquininha` : ''}).`,
      finishingOS.clientId,
      finishingOS.vehicleId,
      { osId: finishingOS.id, receivableCode: codeStr, amount: finishingTotalAmount }
    );

    // Sync active selection
    const synced = updatedOSList.find(o => o.id === finishingOS.id);
    if (synced) setSelectedOS(synced);

    setIsFinishingModalOpen(false);
    setFinishingOS(null);

    setSuccessMsg(`🎉 OS ${finishingOS.id} CONCLUÍDA! Contas a Receber #${codeStr} gerado com sucesso (${installmentsCount}x de R$ ${(finishingTotalAmount / installmentsCount).toFixed(2)}).`);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // Open Mechanic Closure Modal
  const openMechanicClosureModal = (os: ServiceOrder) => {
    setMechanicClosingOS(os);
    const postponedCount = os.items.filter(i => i.status === 'postponed').length;
    setClosureType(postponedCount > 0 ? 'PARCIAL' : 'TOTAL');
    setMechanicNotes(os.technicalRecommendations || os.notes || '');
    setIsMechanicCloseModalOpen(true);
  };

  // Confirm OS Closure by Mechanic (emits notification for Attendant/Finance)
  const handleConfirmMechanicClosure = () => {
    if (!mechanicClosingOS) return;

    const osId = mechanicClosingOS.id;
    const client = db.clients.find(c => c.id === mechanicClosingOS.clientId);
    const clientName = client?.name || 'Cliente';

    const updatedOSList = db.serviceOrders.map(os => {
      if (os.id === osId) {
        return {
          ...os,
          status: 'completed' as const,
          completionType: closureType,
          mechanicClosureNotes: mechanicNotes,
          completedAt: new Date().toISOString()
        };
      }
      return os;
    });

    onSaveServiceOrders(updatedOSList);

    // Generate periodic maintenance logs
    if (onSaveMaintenanceLogs) {
      const vehicle = db.vehicles.find(v => v.id === mechanicClosingOS.vehicleId);
      const currentKm = vehicle?.currentKm || 0;
      const newLogs: MaintenanceLog[] = [];

      const effectiveServiceDate = mechanicClosingOS.serviceDate || serviceDate || new Date().toISOString().split('T')[0];
      const effectiveNextDueDate = mechanicClosingOS.nextDueDate || nextDueDate || (() => {
        const d = new Date(effectiveServiceDate);
        d.setMonth(d.getMonth() + 6);
        return d.toISOString().split('T')[0];
      })();
      const effectiveNextDueKm = mechanicClosingOS.nextDueKm ?? (nextDueKm !== '' ? Number(nextDueKm) : (currentKm + 10000));

      mechanicClosingOS.items.forEach(item => {
        if (item.type === 'service') {
          const srv = db.services.find(s => s.id === item.itemId);
          if (srv && (srv.isPeriodic || srv.maintenanceControl?.enabled)) {
            const ctrl = srv.maintenanceControl;
            const intervalKm = ctrl?.defaultIntervalKm || 10000;

            newLogs.push({
              id: `maint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              vehicleId: mechanicClosingOS.vehicleId,
              clientId: mechanicClosingOS.clientId,
              serviceOrderId: mechanicClosingOS.id,
              serviceDate: effectiveServiceDate,
              serviceKm: currentKm,
              category: ctrl?.category || 'oil_change',
              itemDescription: srv.name,
              nextDueKm: effectiveNextDueKm || (currentKm + intervalKm),
              nextDueDate: effectiveNextDueDate,
              notes: ctrl?.recommendedInstructions || `Realizado em OS ${mechanicClosingOS.id}`
            });
          }
        } else if (item.type === 'part') {
          const prt = db.parts.find(p => p.id === item.itemId);
          if (prt && (prt.isPeriodic || prt.maintenanceControl?.enabled)) {
            const ctrl = prt.maintenanceControl;
            const intervalKm = ctrl?.defaultIntervalKm || 10000;

            newLogs.push({
              id: `maint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              vehicleId: mechanicClosingOS.vehicleId,
              clientId: mechanicClosingOS.clientId,
              serviceOrderId: mechanicClosingOS.id,
              serviceDate: effectiveServiceDate,
              serviceKm: currentKm,
              category: ctrl?.category || 'oil_change',
              itemDescription: prt.name,
              nextDueKm: effectiveNextDueKm || (currentKm + intervalKm),
              nextDueDate: effectiveNextDueDate,
              notes: `Item trocado em OS ${mechanicClosingOS.id}`
            });
          }
        }
      });

      if (newLogs.length > 0) {
        onSaveMaintenanceLogs([...newLogs, ...(db.maintenanceLogs || [])]);
      }
    }

    // Write History Log
    onAddHistoryLog(
      'service_order',
      `OS Encerrada pelo Mecânico (${closureType})`,
      `A Ordem de Serviço ${osId} foi encerrada pelo mecânico ${currentUser?.name || 'Mecânico'} (Encerramento ${closureType}). ${mechanicNotes ? `Obs: ${mechanicNotes}. ` : ''}Aguardando faturamento financeiro pelo Atendente.`,
      mechanicClosingOS.clientId,
      mechanicClosingOS.vehicleId,
      { osId, completionType: closureType }
    );

    // Emit System Notification for Attendant & other profiles
    if (onAddNotification) {
      onAddNotification({
        id: `notif-os-close-${osId}-${Date.now()}`,
        type: 'os_closed_by_mechanic',
        title: `🚨 OS #${osId} Encerrada pelo Mecânico (${closureType})`,
        message: `A Ordem de Serviço #${osId} do cliente ${clientName} foi encerrada pelo mecânico ${currentUser?.name || 'Mecânico'} (Conclusão ${closureType}). Pronta para faturamento e acerto financeiro na seção do Atendente.`,
        date: new Date().toISOString(),
        read: false,
        metadata: {
          serviceOrderId: osId,
          completionType: closureType,
          clientId: mechanicClosingOS.clientId,
          clientName: clientName,
          mechanicName: currentUser?.name
        }
      });
    }

    // Sync active selection
    const synced = updatedOSList.find(o => o.id === osId);
    if (synced) setSelectedOS(synced);

    setIsMechanicCloseModalOpen(false);
    setMechanicClosingOS(null);

    // Auto prompt PDF Printer / Customizer whenever OS is completed/finalized!
    if (synced) {
      setShareModalData({ isOpen: true, os: synced });
    }

    setSuccessMsg(`✅ OS #${osId} encerrada como ${closureType}! Abrindo tela para Imprimir em PDF / Enviar ao Cliente.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Change core OS status (pending -> executing -> completed)
  const handleUpdateStatus = (osId: string, newStatus: ServiceOrder['status']) => {
    const targetOS = db.serviceOrders.find(os => os.id === osId);
    if (!targetOS) return;

    if (newStatus === 'completed') {
      openMechanicClosureModal(targetOS);
      return;
    }

    const updated = db.serviceOrders.map(os => {
      if (os.id === osId) {
        const up: ServiceOrder = { 
          ...os, 
          status: newStatus,
          startedAt: newStatus === 'executing' ? new Date().toISOString() : os.startedAt
        };
        
        let logTitle = '';
        let logDesc = '';
        if (newStatus === 'executing') {
          logTitle = 'OS Iniciada (Em Execução)';
          logDesc = `A Ordem de Serviço ${osId} entrou em fase de execução ativa pelo mecânico ${getMechanicName(os.mechanicId)}.`;
        } else if (newStatus === 'canceled') {
          logTitle = 'OS Cancelada';
          logDesc = `A Ordem de Serviço ${osId} foi cancelada.`;
        }

        onAddHistoryLog('service_order', logTitle, logDesc, os.clientId, os.vehicleId, { osId, status: newStatus });
        return up;
      }
      return os;
    });

    onSaveServiceOrders(updated);
    
    const synced = updated.find(o => o.id === osId);
    if (synced) setSelectedOS(synced);

    setSuccessMsg(`Status da OS #${osId} atualizado com sucesso.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Save recommendations, notes & periodicity dates (RF010)
  const executeSaveDetails = () => {
    if (!selectedOS) return { success: false };

    const updated = db.serviceOrders.map(os => {
      if (os.id === selectedOS.id) {
        return {
          ...os,
          technicalRecommendations,
          notes,
          serviceDate,
          nextDueDate,
          nextDueKm: nextDueKm !== '' ? Number(nextDueKm) : undefined
        };
      }
      return os;
    });

    onSaveServiceOrders(updated);
    onAddHistoryLog(
      'service_order',
      'Laudo Técnico e Datas de Periodicidade Atualizados',
      `Mecânico atualizou notas e datas da OS ${selectedOS.id} (Data do Serviço: ${serviceDate}, Próxima Revisão: ${nextDueDate})`,
      selectedOS.clientId,
      selectedOS.vehicleId
    );

    // Sync state
    const synced = updated.find(o => o.id === selectedOS.id);
    if (synced) setSelectedOS(synced);

    return { success: true };
  };

  const handleSaveDetails = () => {
    if (!technicalRecommendations || !technicalRecommendations.trim()) {
      setTechRecsError(true);
      const el = document.getElementById('tech-recs-input');
      if (el) {
        el.focus();
      }
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Campo Obrigatório Não Preenchido',
        message: 'O campo "Recomendações técnicas para a entrega ao cliente *" é obrigatório. Por favor, digite as recomendações técnicas antes de salvar.'
      });
      return;
    }

    setTechRecsError(false);
    const res = executeSaveDetails();
    if (res.success) {
      setSuccessMsg('Recomendações técnicas e notas da OS salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setUnsavedTask(null);
      setResultModal({
        isOpen: true,
        type: 'success',
        title: 'Operação Realizada com Sucesso',
        message: `As recomendações técnicas (RF010) e datas de manutenção da Ordem de Serviço #${selectedOS?.id} foram salvas com sucesso!`
      });
    }
  };

  // Unsaved changes reporting
  useEffect(() => {
    if (selectedOS && isFormDirty) {
      setUnsavedTask({
        type: 'os',
        saveCallback: () => { executeSaveDetails(); },
        discardCallback: () => {
          setTechnicalRecommendations(selectedOS.technicalRecommendations || '');
          setNotes(selectedOS.notes || '');
        }
      });
    } else {
      setUnsavedTask(null);
    }
  }, [selectedOS, technicalRecommendations, notes, isFormDirty]);

  // Mechanic Suggestion (RN006)
  const handleAddSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOS) return;
    if (suggestionQty <= 0) {
      setErrorMsg('Quantidade deve ser maior que zero.');
      return;
    }

    let suggestionName = '';
    let suggestionPrice = 0;

    if (suggestionType === 'part') {
      const part = db.parts.find(p => p.id === selectedPartId);
      if (!part) return;
      
      // Stock warning (since it's a suggestion, we don't block, but warn if critical)
      if (part.stock < suggestionQty) {
        setErrorMsg(`Alerta: Quantidade sugerida (${suggestionQty}) é maior que o estoque atual (${part.stock}).`);
      }
      suggestionName = part.name;
      suggestionPrice = part.price;
    } else {
      const service = db.services.find(s => s.id === selectedServiceId);
      if (!service) return;
      suggestionName = service.name;
      suggestionPrice = service.price;
    }

    const newSuggestionItem: OSItem = {
      id: `os-sug-${Date.now()}`,
      type: suggestionType,
      itemId: suggestionType === 'part' ? selectedPartId : selectedServiceId,
      name: suggestionName,
      quantity: suggestionQty,
      unitPrice: suggestionPrice,
      totalPrice: suggestionQty * suggestionPrice,
      status: 'pending', // Pending approval
      source: 'mechanic_suggestion'
    };

    const updatedOSItems = [...selectedOS.items, newSuggestionItem];
    const updatedOS: ServiceOrder = {
      ...selectedOS,
      items: updatedOSItems
    };

    const updatedServiceOrders = db.serviceOrders.map(o => o.id === selectedOS.id ? updatedOS : o);
    onSaveServiceOrders(updatedServiceOrders);
    setSelectedOS(updatedOS);

    onAddHistoryLog(
      'service_order',
      'Nova Sugestão de Serviço (RN006)',
      `O mecânico ${getMechanicName(selectedOS.mechanicId)} identificou a necessidade e sugeriu incluir o item "${suggestionName}" (${suggestionQty} un) à OS ${selectedOS.id}.`,
      selectedOS.clientId,
      selectedOS.vehicleId
    );

    setSuccessMsg('Sugestão do mecânico registrada na OS como Pendente!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setIsSuggesting(false);
    setSuggestionQty(1);
    setErrorMsg('');
    
    // Force immediate sync
    const fresh = updatedServiceOrders.find(o => o.id === selectedOS.id);
    if (fresh) setSelectedOS(fresh);
  };

  // Approve or Reject suggestion (RN006)
  const handleDecisionOnSuggestion = (itemId: string, decision: 'approved' | 'rejected') => {
    if (!selectedOS) return;

    const targetItem = selectedOS.items.find(i => i.id === itemId);
    if (!targetItem) return;

    // If approved and it is a part, check and deduct stock
    if (decision === 'approved' && targetItem.type === 'part') {
      const part = db.parts.find(p => p.id === targetItem.itemId);
      if (part && part.stock < targetItem.quantity) {
        setErrorMsg(`Não foi possível aprovar: Estoque insuficiente de ${part.name} (${part.stock} un disponíveis).`);
        return;
      }
      
      // Deduct stock
      if (part) {
        const updatedParts = db.parts.map(p => 
          p.id === part.id 
            ? { ...p, stock: Math.max(0, p.stock - targetItem.quantity) } 
            : p
        );
        onSaveParts(updatedParts);
      }
    }

    const updatedItems = selectedOS.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: decision === 'approved' ? ('executing' as const) : ('canceled' as const)
        };
      }
      return item;
    });

    const updatedOS: ServiceOrder = {
      ...selectedOS,
      items: updatedItems
    };

    const updatedServiceOrders = db.serviceOrders.map(o => o.id === selectedOS.id ? updatedOS : o);
    onSaveServiceOrders(updatedServiceOrders);
    setSelectedOS(updatedOS);

    onAddHistoryLog(
      'service_order',
      `Sugestão do Mecânico ${decision === 'approved' ? 'Aprovada' : 'Recusada'}`,
      `A sugestão de "${targetItem.name}" feita pelo mecânico para a OS ${selectedOS.id} foi ${decision === 'approved' ? 'AUTORIZADA' : 'REJEITADA'} pelo cliente/atendimento.`,
      selectedOS.clientId,
      selectedOS.vehicleId
    );

    setSuccessMsg(`A sugestão foi ${decision === 'approved' ? 'aprovada e adicionada' : 'rejeitada e arquivada'}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
    setErrorMsg('');
  };

  // Register payment (RF012)
  const handleRegisterPayment = (osId: string) => {
    const updated = db.serviceOrders.map(os => {
      if (os.id === osId) {
        const up: ServiceOrder = { ...os, paymentStatus: 'paid' };
        onAddHistoryLog('payment', 'Pagamento Registrado', `Recebimento confirmado referente à Ordem de Serviço ${osId}. Valor: R$ ${getOSTotal(os.items).toFixed(2)}.`, os.clientId, os.vehicleId, { amount: getOSTotal(os.items) });
        return up;
      }
      return os;
    });

    onSaveServiceOrders(updated);
    
    const synced = updated.find(o => o.id === osId);
    if (synced) setSelectedOS(synced);

    setSuccessMsg('Pagamento recebido e quitado no sistema!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Filter OS list
  const filteredOS = db.serviceOrders.filter(os => {
    const cName = getClientName(os.clientId).toLowerCase();
    const vPlate = getVehiclePlate(os.vehicleId).toLowerCase();
    const query = searchQuery.toLowerCase();
    return os.id.toLowerCase().includes(query) ||
           cName.includes(query) ||
           vPlate.includes(query);
  });

  return (
    <div className="space-y-6 animate-fade-in" id="os-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Ordens de Serviço (Execução)</h1>
          <p className="text-sm text-slate-500">Execução técnica, controle de pagamentos, adiamento de itens e monitor da oficina.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Workshop Monitor Button */}
          <button
            id="btn-open-workshop-monitor"
            type="button"
            onClick={() => setIsWorkshopMonitorOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer border border-slate-700"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <span>Monitor da Oficina (Semáforo) 🚦</span>
            <span className="bg-amber-400 text-slate-950 text-[11px] font-extrabold px-2 py-0.5 rounded-full ml-1">
              {activeWorkshopOrders.length}
            </span>
          </button>

          {/* Manager Approval Button / Banner */}
          {pendingApprovalsCount > 0 && (
            <button
              id="btn-open-manager-approval-panel"
              type="button"
              onClick={() => setIsManagerModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 border border-amber-400 cursor-pointer animate-pulse"
            >
              <ShieldCheck className="w-5 h-5 text-slate-950" />
              <span>Sessão do Gerente: {pendingApprovalsCount} Aprovação(ões) Pendente(s)</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Manager Approval Alert Banner */}
      {pendingApprovalsCount > 0 && (
        <div id="manager-approval-banner-global" className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 font-bold border border-amber-200 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">
                Aviso de Gerência: Reativação de Itens com Alteração de Valor
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Existe(m) <strong>{pendingApprovalsCount} item(ns) adiado(s)</strong> que o cliente decidiu realizar e teve alteração de preço. A liberação do item na Ordem de Serviço requer aprovação do Gerente.
              </p>
            </div>
          </div>
          <button
            id="btn-open-manager-approval-banner"
            type="button"
            onClick={() => setIsManagerModalOpen(true)}
            className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer"
          >
            Analisar na Sessão do Gerente
          </button>
        </div>
      )}

      {/* Pending Invoicing Banner for Attendants / Admins / Finance */}
      {(() => {
        const pendingInvoicingOS = db.serviceOrders.filter(os => os.status === 'completed' && os.paymentStatus === 'pending');
        if (pendingInvoicingOS.length === 0) return null;

        return (
          <div id="pending-invoicing-banner-global" className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800 font-bold border border-emerald-200 flex-shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 text-sm">
                  Sessão do Atendente: {pendingInvoicingOS.length} Ordem(ns) de Serviço Encerrada(s) Aguardando Faturamento
                </p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  A execução técnica foi encerrada pelo mecânico. Cabe ao Atendente faturar, definir o parcelamento e lançar no Financeiro.
                </p>
              </div>
            </div>
            <button
              id="btn-filter-pending-invoicing"
              type="button"
              onClick={() => {
                const firstPending = pendingInvoicingOS[0];
                if (firstPending) {
                  openFinishingModal(firstPending);
                }
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition whitespace-nowrap cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" /> Faturar OS Pendente #{pendingInvoicingOS[0].id}
            </button>
          </div>
        );
      })()}

      {/* Notifications */}
      {successMsg && (
        <div id="os-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div id="os-error-alert" className="p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100 animate-slide-up">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* OS DETAILS PANEL */}
      {selectedOS && (
        <div className="bg-white p-6 rounded-xl border border-indigo-150 shadow-md space-y-6 animate-slide-up" id="os-details-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              {db.companyInfo?.logoUrl && (
                <div className="w-24 h-12 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  <img src={db.companyInfo.logoUrl} alt={db.companyInfo.name} className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <div>
                <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-sm font-semibold uppercase tracking-wider font-mono border border-purple-150">
                  OS-{selectedOS.id}
                </span>
                <h3 className="font-semibold text-slate-800 font-display text-lg mt-1">Execução & Controle de OS</h3>
              </div>
              <button
                id={`btn-share-os-details-${selectedOS.id}`}
                type="button"
                onClick={() => setShareModalData({ isOpen: true, os: selectedOS })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer ml-2"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                <span>Imprimir PDF / Enviar</span>
              </button>
            </div>
            <button id="btn-close-os-details" onClick={handleCloseDetails} className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* OS Header Metadata */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Veículo e Cliente</h4>
                
                <div className="text-xs space-y-1">
                  <p className="text-slate-500 font-medium">Cliente:</p>
                  <p className="font-bold text-slate-800 text-sm">{getClientName(selectedOS.clientId)}</p>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-500 font-medium">Veículo:</p>
                  <p className="font-semibold text-slate-800">{getVehicleDesc(selectedOS.vehicleId)}</p>
                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    <p className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded w-fit uppercase font-bold">
                      Placa: {getVehiclePlate(selectedOS.vehicleId)}
                    </p>
                    {selectedOS.serviceDate && (
                      <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1" title="Data do Serviço">
                        <Calendar className="w-3 h-3 text-indigo-600" /> {selectedOS.serviceDate}
                      </span>
                    )}
                    {selectedOS.nextDueDate && (
                      <span className="font-mono text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1" title="Data da Próxima Revisão / Troca">
                        <Clock className="w-3 h-3 text-amber-600" /> Próx: {selectedOS.nextDueDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-500 font-medium">Mecânico Atribuído:</p>
                  <p className="font-semibold text-slate-800">{getMechanicName(selectedOS.mechanicId)}</p>
                </div>

                {/* Semáforo da Oficina (Cinza, Amarelo, Verde, Azul) */}
                <div className="border-t border-slate-200/50 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      Semáforo da Oficina 🚦
                    </p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      getOSWorkshopColor(selectedOS) === 'gray' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                      getOSWorkshopColor(selectedOS) === 'yellow' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      getOSWorkshopColor(selectedOS) === 'green' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold' :
                      'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
                    }`}>
                      {getOSWorkshopColor(selectedOS) === 'gray' ? '⚪ Cinza: Não Iniciada' :
                       getOSWorkshopColor(selectedOS) === 'yellow' ? '🟡 Amarelo: Pausada' :
                       getOSWorkshopColor(selectedOS) === 'green' ? '🟢 Verde: Em Andamento' :
                       '🔵 Azul: Liberado'}
                    </span>
                  </div>

                  {/* Significado explicativo da cor selecionada */}
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 space-y-0.5">
                    <p className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">Significado do Sinalizador:</p>
                    <p className="italic">
                      {getOSWorkshopColor(selectedOS) === 'gray' && '⚪ Veículo recepcionado na oficina, aguardando o mecânico iniciar os trabalhos.'}
                      {getOSWorkshopColor(selectedOS) === 'yellow' && '🟡 Manutenção paralisada por falta de peças no estoque, aprovação do cliente ou serviço externo.'}
                      {getOSWorkshopColor(selectedOS) === 'green' && '🟢 Veículo em manutenção ativa no box pelo mecânico (troca do antigo vermelho para verde).' }
                      {getOSWorkshopColor(selectedOS) === 'blue' && '🔵 Serviços e testes concluídos, veículo higienizado e liberado para entrega ao cliente (troca do verde para azul).'}
                    </p>
                  </div>

                  {/* Traffic Light Quick Switch Buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetWorkshopStatus(selectedOS.id, 'gray')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        getOSWorkshopColor(selectedOS) === 'gray' 
                          ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-400' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="OS recepcionado, aguardando início do trabalho do mecânico"
                    >
                      <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-500"></span>
                      Cinza
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingPauseOS(selectedOS);
                        setPauseReasonInput(selectedOS.pauseReason || 'Falta de Peça');
                      }}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        getOSWorkshopColor(selectedOS) === 'yellow' 
                          ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-300' 
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                      title="OS pausada por falta de peça, aprovação ou serviço externo"
                    >
                      <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500 animate-pulse"></span>
                      Amarelo
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetWorkshopStatus(selectedOS.id, 'green')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        getOSWorkshopColor(selectedOS) === 'green' 
                          ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title="Veículo em manutenção ativa no box (Em Andamento)"
                    >
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></span>
                      Verde
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetWorkshopStatus(selectedOS.id, 'blue')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        getOSWorkshopColor(selectedOS) === 'blue' 
                          ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300' 
                          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                      }`}
                      title="Serviços concluídos, veículo liberado para o cliente buscar"
                    >
                      <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600"></span>
                      Azul
                    </button>
                  </div>

                  {selectedOS.pauseReason && getOSWorkshopColor(selectedOS) === 'yellow' && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex justify-between items-center">
                      <span><strong className="font-bold">Motivo da Pausa:</strong> {selectedOS.pauseReason}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPauseOS(selectedOS);
                          setPauseReasonInput(selectedOS.pauseReason || '');
                        }}
                        className="text-[10px] text-amber-800 font-bold underline hover:text-amber-950 ml-2"
                      >
                        Alterar
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200/50 pt-3 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progresso & Controle</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOS.status === 'pending' && (
                      <button 
                        id="btn-start-os-exec"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'executing')} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition"
                      >
                        Iniciar Execução
                      </button>
                    )}

                    {selectedOS.status === 'executing' && (
                      <button 
                        id="btn-complete-os-exec"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'completed')} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition"
                      >
                        Finalizar OS
                      </button>
                    )}

                    {selectedOS.status !== 'completed' && selectedOS.status !== 'canceled' && (
                      <button 
                        id="btn-cancel-os-exec"
                        onClick={() => handleUpdateStatus(selectedOS.id, 'canceled')} 
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold px-3 py-1.5 rounded transition"
                      >
                        Cancelar OS
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200/50 pt-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Financeiro & Pagamento (RF012)</p>

                  {/* Regra de Cobrança / Sinal de Entrada */}
                  {(() => {
                    const reqMode = selectedOS.paymentRequirementMode || 'ADVANCE_DEPOSIT';
                    const reqPct = selectedOS.requiredDepositPercentage || 30;
                    const totalVal = selectedOS.items.reduce((s, i) => s + i.totalPrice, 0);
                    const reqAmt = selectedOS.requiredDepositAmount || (totalVal * (reqPct / 100));

                    if (reqMode === 'AFTER_COMPLETION') {
                      return (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                          <p className="font-bold text-slate-800 flex items-center justify-between">
                            <span>Regra: 100% Pós-Pago</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">Na Entrega</span>
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            Pagamento integral de R$ {totalVal.toFixed(2)} devido após a conclusão dos serviços.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className={`p-2.5 rounded-xl border space-y-1.5 text-xs ${
                        selectedOS.isDepositPaid 
                          ? 'bg-emerald-50/70 border-emerald-200' 
                          : 'bg-amber-50/80 border-amber-200'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className={selectedOS.isDepositPaid ? 'text-emerald-950' : 'text-amber-950'}>
                            {reqMode === 'FULL_ADVANCE' ? 'Regra: 100% Antecipado' : `Regra: Sinal de Entrada (${reqPct}%)`}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            selectedOS.isDepositPaid 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          }`}>
                            {selectedOS.isDepositPaid ? '✓ Sinal Confirmado' : 'Aguardando Sinal'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600">
                          Valor do Sinal Exigido: <strong className="font-mono text-slate-900">R$ {reqAmt.toFixed(2)}</strong>
                        </p>

                        {selectedOS.isDepositPaid ? (
                          <p className="text-[10px] text-emerald-800 font-medium">
                            Sinal quitado em {selectedOS.depositPaidAt ? new Date(selectedOS.depositPaidAt).toLocaleDateString('pt-BR') : 'data recente'} via {selectedOS.depositPaymentMethod || 'PIX'}.
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRegisterDeposit(selectedOS, 'PIX')}
                            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <DollarSign className="w-4 h-4" /> Registrar Quitação do Sinal (R$ {reqAmt.toFixed(2)})
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-medium">Estado Global da OS:</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      selectedOS.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {selectedOS.paymentStatus === 'paid' ? 'Quitado' : 'Aguardando Pagamento'}
                    </span>
                  </div>

                  {(() => {
                    const assocRec = (db.accountsReceivable || []).find(r => r.serviceOrderId === selectedOS.id);
                    if (assocRec) {
                      return (
                        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{assocRec.code}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              assocRec.status === 'paid' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : assocRec.status === 'blocked_credit_limit' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {assocRec.status === 'paid' ? 'Quitado' : assocRec.status === 'blocked_credit_limit' ? 'Bloqueado p/ Limite' : `${assocRec.installmentsCount}x Pendente`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Forma: <strong>{assocRec.paymentMethod || 'Não informada'}</strong> ({assocRec.installmentsCount}x)
                            {assocRec.interestRatePercent ? ` (+${assocRec.interestRatePercent}% juros)` : ''}
                          </p>
                          <p className="text-[11px] font-bold text-emerald-800">
                            Total: R$ {assocRec.totalAmount.toFixed(2)} (Pago: R$ {assocRec.paidAmount.toFixed(2)})
                          </p>
                          <button
                            type="button"
                            onClick={() => openFinishingModal(selectedOS)}
                            className="w-full mt-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 py-1 rounded transition text-center cursor-pointer"
                          >
                            Reconfigurar Contas a Receber
                          </button>
                        </div>
                      );
                    }
                    if (selectedOS.status === 'completed') {
                      return (
                        <button 
                          id="btn-confirm-payment"
                          onClick={() => openFinishingModal(selectedOS)} 
                          className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <DollarSign className="w-4 h-4" /> Gerar / Configurar Contas a Receber
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* OS Items Execution & Suggestions */}
            <div className="lg:col-span-2 space-y-5">
              {/* ACTIVE WARRANTY ALERT & RETURN CLAIM BANNER FOR THIS VEHICLE */}
              {selectedOS.vehicleId && (
                <WarrantyAlertBanner
                  vehicleId={selectedOS.vehicleId}
                  serviceOrders={db.serviceOrders}
                  customerComplaint={selectedOS.customerComplaint || selectedOS.notes}
                  isWarrantyReturn={selectedOS.isWarrantyReturn}
                  warrantyOriginOSId={selectedOS.warrantyOriginOSId}
                  onToggleWarrantyReturn={(isRet, originId) => {
                    const updatedOS: ServiceOrder = {
                      ...selectedOS,
                      isWarrantyReturn: isRet,
                      warrantyOriginOSId: originId,
                      notes: isRet && originId && !selectedOS.notes.includes('[RETORNO EM GARANTIA]')
                        ? `[RETORNO EM GARANTIA DA OS #${originId}]: ${selectedOS.notes.replace(/^\[RETORNO EM GARANTIA[^\]]*\]:\s*/, '')}`
                        : selectedOS.notes
                    };
                    setSelectedOS(updatedOS);
                    const updatedList = db.serviceOrders.map(o => o.id === selectedOS.id ? updatedOS : o);
                    onSaveServiceOrders(updatedList);
                  }}
                />
              )}

              {/* Item suggestions notification info (RN006) */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl space-y-1.5 text-xs text-indigo-950">
                <p className="font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4 text-indigo-600 animate-pulse" /> 
                  Regra de Negócio (RN006): Sugestões de novos serviços durante execução
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Durante a execução da OS, o mecânico pode identificar problemas ocultos (ex: filtros entupidos, velas gastas). Ele pode registrar essa sugestão, que fica pendente de aprovação do cliente antes de ser incorporada e ter as peças deduzidas do estoque.
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peças e Mão de Obra Autorizadas</p>
                  {selectedOS.status === 'executing' && !isSuggesting && (
                    <button 
                      id="btn-open-suggestion-form"
                      onClick={() => setIsSuggesting(true)} 
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Sugerir Novo Item (RN006)
                    </button>
                  )}
                </div>

                {/* Mechanic Suggestion Builder */}
                {isSuggesting && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-slide-up" id="suggestion-builder-panel">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                      <p className="text-xs font-bold text-amber-900 uppercase">Inserir Nova Sugestão de Diagnóstico</p>
                      <button id="btn-close-suggestion-form" onClick={() => setIsSuggesting(false)} className="text-amber-500 hover:text-amber-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddSuggestion} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" id="form-suggestion">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                        <select 
                          id="sug-type-select"
                          value={suggestionType}
                          onChange={e => setSuggestionType(e.target.value as 'part' | 'service')}
                          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-white"
                        >
                          <option value="part">Peça (Estoque)</option>
                          <option value="service">Mão de Obra</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Item sugerido</label>
                        {suggestionType === 'part' ? (
                          <select 
                            id="sug-item-select"
                            value={selectedPartId}
                            onChange={e => setSelectedPartId(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-white"
                          >
                            {db.parts.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (R$ {p.price.toFixed(2)})</option>
                            ))}
                          </select>
                        ) : (
                          <select 
                            id="sug-item-select"
                            value={selectedServiceId}
                            onChange={e => setSelectedServiceId(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-white"
                          >
                            {db.services.map(s => (
                              <option key={s.id} value={s.id}>{s.name} (R$ {s.price.toFixed(2)})</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div className="w-16">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Qtd</label>
                          <input 
                            id="sug-qty-input"
                            type="number" 
                            value={suggestionQty}
                            onChange={e => setSuggestionQty(Number(e.target.value))}
                            min="1"
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <button 
                          id="btn-save-suggestion"
                          type="submit" 
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition flex-1 h-8"
                        >
                          Adicionar
                        </button>
                      </div>
                    </form>

                    {/* Stock availability indicator for suggested part */}
                    {suggestionType === 'part' && selectedPartId && (() => {
                      const part = db.parts.find(p => p.id === selectedPartId);
                      if (!part) return null;
                      const details = getPartStockDetails(part, db.budgets, db.serviceOrders);
                      return (
                        <div className="mt-2 p-2 bg-white rounded-lg border border-amber-200 text-xs space-y-1" id="stock-availability-breakdown-so">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-amber-950 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-amber-600" />
                              Disponibilidade de Estoque ({part.code}):
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Estoque físico total no galpão">
                                Físico: <strong>{details.totalStock}</strong> un
                              </span>
                              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Reservado em orçamentos">
                                Reservado: <strong>{details.reservedStock}</strong> un
                              </span>
                              <span className={`px-2 py-0.5 rounded font-bold border ${
                                details.availableStock > 0 
                                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200' 
                                  : 'text-rose-800 bg-rose-50 border-rose-200'
                              }`}>
                                Disponível: <strong>{details.availableStock}</strong> un
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="border border-slate-150 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse" id="os-items-table">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                        <th className="p-3">Item / Informação Pertinente</th>
                        <th className="p-3">Qtd</th>
                        <th className="p-3">Preço Unit.</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Status / Origem</th>
                        <th className="p-3 text-right">Ações & Aditamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedOS.items.map(item => {
                        const isPendingApproval = item.priceChangeApproval && item.priceChangeApproval.status === 'pending';

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 ${
                            item.status === 'postponed' ? 'bg-amber-50/30 font-medium' :
                            item.source === 'mechanic_suggestion' && item.status === 'pending' ? 'bg-indigo-50/30' : ''
                          }`}>
                            <td className="p-3">
                              <p className="font-semibold text-slate-850">{item.name}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-slate-400 uppercase tracking-wide font-mono">
                                  {item.type === 'part' ? 'PEÇA' : 'MÃO DE OBRA'}
                                </span>
                                {item.originalUnitPrice && item.originalUnitPrice !== item.unitPrice && (
                                  <span className="text-[9px] font-mono text-slate-500 line-through">
                                    Orig: R$ {item.originalUnitPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              {/* Campo de Texto Livre com Informação Pertinente ao Serviço */}
                              {item.serviceNotes && (
                                <div className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 flex items-start gap-1">
                                  <FileText className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                                  <span><strong>Obs/Inf. Serviço:</strong> {item.serviceNotes}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-semibold">{item.quantity}</td>
                            <td className="p-3 text-slate-500">R$ {item.unitPrice.toFixed(2)}</td>
                            <td className="p-3 font-bold text-slate-900">
                              R$ {item.totalPrice.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${
                                  item.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  item.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  item.status === 'executing' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse' :
                                  item.status === 'postponed' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                                  'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                  {item.status === 'pending' ? 'Pendente' :
                                   item.status === 'executing' ? 'Em execução' :
                                   item.status === 'completed' ? 'Concluído' :
                                   item.status === 'postponed' ? 'Adiado (Não fazer agora)' : 'Cancelado'}
                                </span>

                                {isPendingApproval && (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 animate-pulse" title="Aguardando liberação do Gerente para novo valor">
                                    ⏳ Aguardando Gerente (Novo: R$ {item.priceChangeApproval?.requestedNewPrice.toFixed(2)})
                                  </span>
                                )}
                                
                                <span className="text-[8px] text-slate-400 font-medium">
                                  {item.source === 'budget' ? 'Origem: Orçamento' : 'Origem: Sugestão Mecânico'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex flex-wrap gap-1.5 justify-end items-center">
                                {/* Action for Mechanic Suggestions */}
                                {item.source === 'mechanic_suggestion' && item.status === 'pending' && (
                                  <>
                                    <button 
                                      id={`btn-approve-sug-${item.id}`}
                                      type="button"
                                      onClick={() => handleDecisionOnSuggestion(item.id, 'approved')}
                                      className="bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 text-[10px] cursor-pointer"
                                    >
                                      Aprovar
                                    </button>
                                    <button 
                                      id={`btn-reject-sug-${item.id}`}
                                      type="button"
                                      onClick={() => handleDecisionOnSuggestion(item.id, 'rejected')}
                                      className="bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 px-2 py-1 rounded border border-rose-200 text-[10px] cursor-pointer"
                                    >
                                      Recusar
                                    </button>
                                  </>
                                )}

                                {/* Action to Postpone item if client resolves not to do it now */}
                                {(item.status === 'executing' || item.status === 'pending') && (
                                  <button
                                    id={`btn-postpone-item-${item.id}`}
                                    type="button"
                                    onClick={() => setPostponingItemId(item.id)}
                                    className="bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition flex items-center gap-1"
                                    title="Cliente resolveu não fazer este item neste momento"
                                  >
                                    <Clock className="w-3 h-3 text-slate-500" /> Adiar (Não Fazer Agora)
                                  </button>
                                )}

                                {/* Action to Reactivate a Postponed Item when performed later */}
                                {item.status === 'postponed' && (
                                  <button
                                    id={`btn-reactivate-item-${item.id}`}
                                    type="button"
                                    onClick={() => handleOpenReactivateModal(item)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
                                    title="Reativar e Realizar Item Adiado"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Realizar / Reativar Item
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold text-sm bg-slate-50/50">
                        <td colSpan={3} className="p-3 text-right text-slate-500">Valor Total Ativo da OS:</td>
                        <td colSpan={3} className="p-3 text-indigo-600 text-base font-display">
                          R$ {getOSTotal(selectedOS.items).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Controle de Periodicidade & Datas de Revisão Preventiva */}
              <div className="bg-indigo-50/40 p-5 rounded-xl border border-indigo-150 space-y-4" id="os-periodicity-panel">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2 text-indigo-950">
                    <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 font-display">Controle de Periodicidade & Revisão Preventiva</h4>
                      <p className="text-[11px] text-slate-500">Data de execução do serviço e agendamento para a próxima manutenção do veículo.</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-indigo-600" />
                    Revisão Programada
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Data do Serviço */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1" htmlFor="os-service-date-input">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Data do Serviço *
                    </label>
                    <input 
                      id="os-service-date-input"
                      type="date"
                      value={serviceDate}
                      onChange={e => setServiceDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400">Data da realização do serviço na oficina.</p>
                  </div>

                  {/* Data da Próxima Revisão */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1" htmlFor="os-next-due-date-input">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Próxima Revisão / Troca *
                    </label>
                    <input 
                      id="os-next-due-date-input"
                      type="date"
                      value={nextDueDate}
                      onChange={e => setNextDueDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    {/* Interval Presets */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[9px] text-slate-400 font-medium">Atalhos:</span>
                      <button 
                        id="btn-preset-3m"
                        type="button" 
                        onClick={() => handleAddMonthsToDueDate(3)}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 hover:border-indigo-300 px-1.5 py-0.5 rounded transition cursor-pointer"
                      >
                        +3 meses
                      </button>
                      <button 
                        id="btn-preset-6m"
                        type="button" 
                        onClick={() => handleAddMonthsToDueDate(6)}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 hover:border-indigo-300 px-1.5 py-0.5 rounded transition cursor-pointer"
                      >
                        +6 meses
                      </button>
                      <button 
                        id="btn-preset-12m"
                        type="button" 
                        onClick={() => handleAddMonthsToDueDate(12)}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 hover:border-indigo-300 px-1.5 py-0.5 rounded transition cursor-pointer"
                      >
                        +1 ano
                      </button>
                    </div>
                  </div>

                  {/* Próxima KM Prevista */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1" htmlFor="os-next-due-km-input">
                      <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                      KM Próxima Revisão
                    </label>
                    <input 
                      id="os-next-due-km-input"
                      type="number"
                      value={nextDueKm}
                      onChange={e => setNextDueKm(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Ex: 50000"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Quilometragem prevista do hodômetro.</p>
                  </div>
                </div>
              </div>

              {/* Technical Recommendations (RF010) */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-150 space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Clipboard className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Laudo Técnico e Recomendações (RF010)</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase" htmlFor="tech-recs-input">Recomendações técnicas para a entrega ao cliente *</label>
                    <textarea 
                      id="tech-recs-input"
                      value={technicalRecommendations}
                      onChange={e => {
                        setTechnicalRecommendations(e.target.value);
                        if (e.target.value.trim()) setTechRecsError(false);
                      }}
                      placeholder="Ex: Identificado desgaste parcial na correia dentada, recomendável trocar preventivamente em até 10.000km. Freios dianteiros substituídos e regulados com sucesso."
                      rows={3.5}
                      className={`w-full text-xs px-3 py-2 border rounded-lg bg-white transition ${
                        techRecsError 
                          ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50 text-red-900 font-medium' 
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase" htmlFor="tech-notes-input">Notas adicionais / Controle interno</label>
                    <input 
                      id="tech-notes-input"
                      type="text" 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ex: Veículo entregue limpo. Peças antigas colocadas em caixa no porta-malas."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      id="btn-save-os-tech"
                      onClick={handleSaveDetails} 
                      disabled={!isFormDirty}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
                    >
                      Salvar Laudo & Datas de Periodicidade
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OS MASTER LISTING */}
      {!selectedOS && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="os-list-panel">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="os-search-input"
                type="text" 
                placeholder="Buscar por código de OS, cliente ou placa..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="os-table">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                  <th className="p-4">Código OS</th>
                  <th className="p-4">Cliente / Proprietário</th>
                  <th className="p-4">Veículo</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Valor Ativo</th>
                  <th className="p-4">Estado Execução</th>
                  <th className="p-4">Faturamento</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredOS.map(os => (
                  <tr key={os.id} className="hover:bg-slate-50/50 transition duration-150" id={`os-row-${os.id}`}>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-bold text-slate-800 uppercase">OS-{os.id}</span>
                        {os.isWarrantyReturn && (
                          <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-3 h-3 text-amber-700" /> Retorno Garantia
                          </span>
                        )}
                        {os.status === 'completed' && checkVehicleWarrantyStatus(os.vehicleId, db.serviceOrders).hasActiveWarranty && (
                          <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Em Garantia
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{getClientName(os.clientId)}</td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-700">{getVehicleDesc(os.vehicleId)}</p>
                        <p className="font-mono text-xs text-slate-400 uppercase">{getVehiclePlate(os.vehicleId)}</p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 text-xs font-medium">
                      {getMechanicName(os.mechanicId)}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      R$ {getOSTotal(os.items).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        os.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        os.status === 'executing' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        os.status === 'canceled' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {os.status === 'pending' ? 'Pendente' :
                         os.status === 'executing' ? 'Em Execução' :
                         os.status === 'completed' ? 'Concluída' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        os.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {os.paymentStatus === 'paid' ? 'Paga' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5">
                      <button 
                        id={`btn-share-os-${os.id}`}
                        type="button"
                        onClick={() => setShareModalData({ isOpen: true, os })} 
                        className="text-emerald-600 hover:text-emerald-800 font-medium hover:bg-emerald-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs"
                        title="Enviar por WhatsApp / E-mail"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar
                      </button>
                      <button 
                        id={`btn-view-os-${os.id}`}
                        onClick={() => setSelectedOS(os)} 
                        className="text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Entrar / Executar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share OS Modal (WhatsApp / E-mail) */}
      {shareModalData.os && (
        <ShareDocumentModal
          isOpen={shareModalData.isOpen}
          onClose={() => setShareModalData({ isOpen: false, os: null })}
          type="service_order"
          docId={`OS-${shareModalData.os.id}`}
          client={db.clients.find(c => c.id === shareModalData.os?.clientId)}
          vehicle={db.vehicles.find(v => v.id === shareModalData.os?.vehicleId)}
          items={shareModalData.os.items.filter(i => i.status !== 'canceled').map(i => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            status: i.status
          }))}
          totalValue={getOSTotal(shareModalData.os.items)}
          companyInfo={db.companyInfo}
          notes={shareModalData.os.notes}
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
                [docType || 'service_order']: orientation
              }
            };
            onSaveCompanyInfo?.(updatedCompany);
          }}
        />
      )}

      {/* Modal para Adiar Item (Quando o cliente decide não fazer agora) */}
      {postponingItemId && selectedOS && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="modal-postpone-item">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base font-display flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" /> Adiar Item da Ordem de Serviço
              </h3>
              <button 
                type="button" 
                onClick={() => setPostponingItemId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Informe a razão ou observação referente à decisão do cliente em não realizar este item no momento. O item continuará registrado no histórico do orçamento e da OS com o valor original.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase block" htmlFor="postpone-reason-textarea">
                Informações Pertinentes ao Serviço / Motivo *
              </label>
              <textarea
                id="postpone-reason-textarea"
                rows={3}
                value={postponeReason}
                onChange={e => setPostponeReason(e.target.value)}
                placeholder="Ex: Cliente optou por adiar a troca das pastilhas traseiras para a próxima revisão em 3 meses."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostponingItemId(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-postpone-item"
                type="button"
                onClick={() => handleMarkItemPostponed(postponingItemId)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
              >
                Confirmar Aditamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Reativar / Realizar Item Adiado (Verifica alteração de preço para aprovação do gerente) */}
      {reactivatingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="modal-reactivate-item">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-display">
                    Realizar / Reativar Item Adiado
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">Item: {reactivatingItem.name}</p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setReactivatingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReactivation} className="space-y-4" id="form-reactivate-item">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Preço Unit. Original (Adiado)</span>
                  <p className="font-bold text-slate-700 text-sm">
                    R$ {(reactivatingItem.originalUnitPrice ?? reactivatingItem.unitPrice).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Quantidade</span>
                  <p className="font-bold text-slate-800 text-sm">{reactivatingItem.quantity} un</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block" htmlFor="reactivate-price-input">
                  Novo Valor Unitário no Momento da Realização (R$) *
                </label>
                <input
                  id="reactivate-price-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={reactivatePrice}
                  onChange={e => setReactivatePrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-indigo-950 p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
                  required
                />
              </div>

              {/* MENSAGEM / ALERTA DE ALTERAÇÃO DE PREÇO MEDIANTE APROVAÇÃO DO GERENTE */}
              {Math.abs(reactivatePrice - (reactivatingItem.originalUnitPrice ?? reactivatingItem.unitPrice)) > 0.01 && (
                <div id="price-change-warning-box" className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5 text-xs text-amber-950 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span>⚠️ ATENÇÃO: HOUVE ALTERAÇÃO NO VALOR DO ITEM!</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    O valor unitário foi alterado de <strong>R$ {(reactivatingItem.originalUnitPrice ?? reactivatingItem.unitPrice).toFixed(2)}</strong> para <strong>R$ {reactivatePrice.toFixed(2)}</strong>.
                  </p>
                  <p className="text-[11px] font-bold text-amber-800 bg-amber-100 p-2 rounded-lg border border-amber-200">
                    🔒 Conforme regra do sistema, a liberação da execução deste item somente é permitida MEDIANTE APROVAÇÃO DO GERENTE! Uma notificação será enviada para a sessão dele.
                  </p>
                </div>
              )}

              {/* CAMPO DE TEXTO LIVRE PARA INFORMAÇÃO PERTINENTE AO SERVIÇO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block" htmlFor="reactivate-notes-textarea">
                  Informação Pertinente ao Serviço (Texto Livre)
                </label>
                <textarea
                  id="reactivate-notes-textarea"
                  rows={3}
                  value={reactivateNotes}
                  onChange={e => setReactivateNotes(e.target.value)}
                  placeholder="Ex: Cliente autorizou a realização da troca do componente agora. Tabela do fornecedor foi reajustada neste mês."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReactivatingItem(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-reactivation"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {Math.abs(reactivatePrice - (reactivatingItem.originalUnitPrice ?? reactivatingItem.unitPrice)) > 0.01 
                    ? 'Enviar para Aprovação do Gerente' 
                    : 'Confirmar e Liberar para Execução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR OS & CONFIGURAR CONTAS A RECEBER */}
      {isFinishingModalOpen && finishingOS && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    Finalizar OS {finishingOS.id} & Gerar Contas a Receber
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cliente: <span className="text-slate-200 font-semibold">{getClientName(finishingOS.clientId)}</span> | Veículo: <span className="text-slate-200 font-semibold">{getVehicleDesc(finishingOS.vehicleId)}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFinishingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Financial Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Valor Subtotal da OS</span>
                  <span className="text-lg font-extrabold text-slate-800">
                    R$ {finishingSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Soma de peças e serviços</span>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                    <Percent className="w-3 h-3 text-amber-600" /> Juros / Acréscimo Maquininha
                  </span>
                  <span className="text-lg font-extrabold text-amber-900">
                    + R$ {finishingInterestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700 block mt-0.5">
                    ({interestRatePercent}% aplicado)
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Valor Total a Receber</span>
                  <span className="text-xl font-black text-emerald-900">
                    R$ {finishingTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">
                    {installmentsCount}x de R$ {(finishingTotalAmount / (installmentsCount || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" /> Forma de Pagamento Cadastrada
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingPaymentMethod(!isAddingPaymentMethod)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isAddingPaymentMethod ? 'Cancelar Cadastro' : 'Cadastrar Nova Forma de Pagamento'}
                  </button>
                </div>

                {/* Inline New Payment Method Form */}
                {isAddingPaymentMethod && (
                  <form onSubmit={handleSaveNewPaymentMethod} className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-xl space-y-3 animate-fade-in">
                    <p className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> Cadastrar Nova Opção de Forma de Pagamento
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block">Nome (Ex: Pix 2x, Maquininha Stone)</label>
                        <input
                          type="text"
                          value={newPmName}
                          onChange={e => setNewPmName(e.target.value)}
                          placeholder="Ex: Cartão Mercado Pago"
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block">Tipo</label>
                        <select
                          value={newPmType}
                          onChange={e => setNewPmType(e.target.value as any)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="credit_card">Cartão de Crédito</option>
                          <option value="debit_card">Cartão de Débito</option>
                          <option value="pix">PIX</option>
                          <option value="cash">Dinheiro</option>
                          <option value="bank_slip">Boleto Bancário</option>
                          <option value="custom">Outro / Customizado</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block">Taxa Padrão de Juros (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={newPmRate}
                          onChange={e => setNewPmRate(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingPaymentMethod(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Salvar e Selecionar
                      </button>
                    </div>
                  </form>
                )}

                {/* Payment Method Select */}
                <select
                  value={selectedPaymentMethod}
                  onChange={e => handleSelectPaymentMethod(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-indigo-500 shadow-xs"
                >
                  {activePaymentMethods.map(pm => (
                    <option key={pm.id} value={pm.name}>
                      {pm.name} {pm.defaultInterestRatePercent ? `(${pm.defaultInterestRatePercent}% taxa padrão)` : '(0% taxa)'}
                    </option>
                  ))}
                </select>

                {/* Interest Rate & Presets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Taxa de Juros / Maquininha (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={interestRatePercent}
                        onChange={e => setInterestRatePercent(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-sm font-bold text-indigo-950 p-2.5 pr-8 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                      <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Atalhos:</span>
                      {[0, 1.5, 2.5, 3.5, 5.0, 7.5, 10].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setInterestRatePercent(rate)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                            interestRatePercent === rate 
                              ? 'bg-indigo-600 text-white border-indigo-600' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Número de Parcelas
                    </label>
                    <select
                      value={installmentsCount}
                      onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)}
                      className="w-full text-sm font-bold p-2.5 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-indigo-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          {num}x {num === 1 ? '(À vista / Parcela única)' : `de R$ ${(finishingTotalAmount / num).toFixed(2)}`}
                        </option>
                      ))}
                    </select>

                    <div className="mt-3">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Data do 1º Vencimento
                      </label>
                      <input
                        type="date"
                        value={firstDueDate}
                        onChange={e => setFirstDueDate(e.target.value)}
                        className="w-full text-xs font-medium p-2 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Immediate Settlement Checkbox */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={markPaidImmediately}
                      onChange={e => setMarkPaidImmediately(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Marcar como Pago Imediatamente (Quitação no Ato / Entrada no Caixa)
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Ao marcar esta opção, o Contas a Receber é gravado como <strong>QUITADO</strong> e uma transação de receita entra automaticamente no Fluxo de Caixa.
                      </span>
                    </div>
                  </label>

                  {/* Fiscal Document & Boleto Integration Controls */}
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-indigo-600" /> Opção de Faturamento & Emissão Fiscal:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Regra SEFAZ / Financeiro
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                        finishFiscalOption === 'immediate'
                          ? 'bg-white border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                          : 'bg-indigo-50/40 border-indigo-200 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="finishFiscalOption"
                          value="immediate"
                          checked={finishFiscalOption === 'immediate'}
                          onChange={() => setFinishFiscalOption('immediate')}
                          className="mt-0.5 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                            ⚡ Emissão Imediata
                          </span>
                          <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                            Emitir Nota Fiscal (NF-e/NFS-e) e Boleto no ato de encerramento da OS.
                          </span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                        finishFiscalOption === 'monthly_batch'
                          ? 'bg-white border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                          : 'bg-indigo-50/40 border-indigo-200 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="finishFiscalOption"
                          value="monthly_batch"
                          checked={finishFiscalOption === 'monthly_batch'}
                          onChange={() => setFinishFiscalOption('monthly_batch')}
                          className="mt-0.5 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                            📅 Acumular p/ Fim do Mês
                          </span>
                          <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                            Acumular e faturar tudo de uma vez no lote mensal no Módulo Fiscal.
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Sub-options for Immediate Emission */}
                    {finishFiscalOption === 'immediate' ? (
                      <div className="pt-2 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-indigo-200 text-xs font-medium text-slate-800 hover:bg-indigo-50/30 transition">
                          <input
                            type="checkbox"
                            checked={emitNfeOnFinish}
                            onChange={e => setEmitNfeOnFinish(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 rounded border-slate-300"
                          />
                          <span>🧾 Transmitir NF-e / NFS-e Imediata</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-indigo-200 text-xs font-medium text-slate-800 hover:bg-indigo-50/30 transition">
                          <input
                            type="checkbox"
                            checked={emitBoletoOnFinish}
                            onChange={e => setEmitBoletoOnFinish(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 rounded border-slate-300"
                          />
                          <span>📄 Gerar Boleto + PIX Automático</span>
                        </label>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-indigo-100 flex items-center gap-2 text-[11px] font-semibold text-indigo-900 bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Este título ficará disponível no <strong>Módulo Fiscal &gt; Faturamento Mensal</strong> para emissão unificada no fim do mês.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Schedule Table Preview */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Receipt className="w-4 h-4 text-slate-500" /> Cronograma de Parcelas Geradas ({finishingInstallmentsSchedule.length}x)
                </p>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">Parcela</th>
                        <th className="p-2.5">Vencimento</th>
                        <th className="p-2.5">Valor (R$)</th>
                        <th className="p-2.5">Forma / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {finishingInstallmentsSchedule.map(inst => (
                        <tr key={inst.installmentNumber} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">
                            {inst.installmentNumber}ª Parcela ({inst.installmentNumber}/{installmentsCount})
                          </td>
                          <td className="p-2.5 text-slate-700 font-mono">
                            {inst.dueDate.split('-').reverse().join('/')}
                          </td>
                          <td className="p-2.5 font-bold text-emerald-700">
                            R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              markPaidImmediately 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {selectedPaymentMethod} - {markPaidImmediately ? 'Quitado' : 'Aguardando Vencimento'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observações Adicionais */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observações do Lançamento Financeiro (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={finishingNotes}
                  onChange={e => setFinishingNotes(e.target.value)}
                  placeholder="Ex: Pagamento parcelado em 3x no cartão de crédito da empresa. Comprovante entregue ao cliente."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsFinishingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFinishingAndReceivable}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Concluir OS & Confirmar Contas a Receber (R$ {finishingTotalAmount.toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MECHANIC CLOSURE MODAL */}
      {isMechanicCloseModalOpen && mechanicClosingOS && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="mechanic-closure-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold font-display text-lg">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <h3>Encerrar Execução da OS #{mechanicClosingOS.id}</h3>
              </div>
              <button 
                id="btn-close-mechanic-modal"
                onClick={() => { setIsMechanicCloseModalOpen(false); setMechanicClosingOS(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <p className="font-semibold text-slate-800">Cliente: <span className="font-normal">{getClientName(mechanicClosingOS.clientId)}</span></p>
                <p className="font-semibold text-slate-800">Veículo: <span className="font-normal">{getVehicleDesc(mechanicClosingOS.vehicleId)} ({getVehiclePlate(mechanicClosingOS.vehicleId)})</span></p>
                <p className="font-semibold text-indigo-700 mt-1">Valor Total Ativo: R$ {getOSTotal(mechanicClosingOS.items).toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Tipo de Encerramento da OS *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label 
                    onClick={() => setClosureType('TOTAL')}
                    className={`p-3 rounded-xl border-2 cursor-pointer flex items-start gap-2.5 transition ${
                      closureType === 'TOTAL' 
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="closureType" 
                      value="TOTAL" 
                      checked={closureType === 'TOTAL'}
                      onChange={() => setClosureType('TOTAL')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Encerramento TOTAL</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Todos os serviços e peças autorizados foram executados.</p>
                    </div>
                  </label>

                  <label 
                    onClick={() => setClosureType('PARCIAL')}
                    className={`p-3 rounded-xl border-2 cursor-pointer flex items-start gap-2.5 transition ${
                      closureType === 'PARCIAL' 
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-semibold' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="closureType" 
                      value="PARCIAL" 
                      checked={closureType === 'PARCIAL'}
                      onChange={() => setClosureType('PARCIAL')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-amber-950">Encerramento PARCIAL</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Parte dos serviços foi feita e alguns itens foram adiados/cancelados.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-[11px] uppercase block" htmlFor="mechanic-notes-input">
                  Observações Finais do Mecânico
                </label>
                <textarea 
                  id="mechanic-notes-input"
                  rows={3}
                  value={mechanicNotes}
                  onChange={e => setMechanicNotes(e.target.value)}
                  placeholder="Ex: Veículo testado em rodagem. Nível de óleo e fluido de freio ok. Pronto para faturamento e entrega."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-150 text-[11px] text-indigo-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p>
                  Ao confirmar, a OS é marcada como concluída e uma <strong>notificação com alerta pop-up</strong> será exibida imediatamente na tela do Atendente e demais perfis para realizar o faturamento financeiro.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                id="btn-cancel-mechanic-modal"
                type="button"
                onClick={() => { setIsMechanicCloseModalOpen(false); setMechanicClosingOS(null); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                id="btn-confirm-mechanic-modal"
                type="button"
                onClick={handleConfirmMechanicClosure}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> Confirmar Encerramento da OS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORKSHOP MONITOR MODAL (SEMÁFORO) */}
      {isWorkshopMonitorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-50 animate-fade-in" id="workshop-monitor-modal">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            {/* Monitor Header */}
            <div className="p-4 md:p-6 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                    Monitor da Oficina & Semáforo de Reparos 🚦
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Acompanhamento em tempo real dos veículos dentro da oficina. Status e cores atualizados para toda a equipe.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  id="btn-clear-green-daily"
                  type="button"
                  onClick={handleClearGreenOrders}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Limpa os veículos liberados (Azul) mantendo os demais no painel diariamente"
                >
                  <Trash2 className="w-3.5 h-3.5 text-blue-100" />
                  <span>Zerar Liberados de Hoje (Azuis) 🧹</span>
                </button>
                <button
                  id="btn-close-workshop-monitor"
                  type="button"
                  onClick={() => setIsWorkshopMonitorOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Toolbar & Search */}
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Traffic Light Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setWorkshopFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    workshopFilter === 'all' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Todos ({activeWorkshopOrders.length})
                </button>

                <button
                  type="button"
                  onClick={() => setWorkshopFilter('gray')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    workshopFilter === 'gray' 
                      ? 'bg-slate-700 text-white border border-slate-500' 
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span>Cinza: Não Iniciada ({activeWorkshopOrders.filter(o => getOSWorkshopColor(o) === 'gray').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkshopFilter('yellow')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    workshopFilter === 'yellow' 
                      ? 'bg-amber-500 text-slate-950 font-extrabold' 
                      : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Amarelo: Pausada ({activeWorkshopOrders.filter(o => getOSWorkshopColor(o) === 'yellow').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkshopFilter('green')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    workshopFilter === 'green' 
                      ? 'bg-emerald-600 text-white font-bold' 
                      : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Verde: Em Andamento ({activeWorkshopOrders.filter(o => getOSWorkshopColor(o) === 'green').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkshopFilter('blue')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    workshopFilter === 'blue' 
                      ? 'bg-blue-600 text-white font-bold' 
                      : 'bg-slate-800/80 text-blue-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  <span>Azul: Liberado ({activeWorkshopOrders.filter(o => getOSWorkshopColor(o) === 'blue').length})</span>
                </button>
              </div>

              {/* Search input in monitor */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="input-monitor-search"
                  type="text"
                  placeholder="Placa, modelo, cliente..."
                  value={monitorSearchQuery}
                  onChange={e => setMonitorSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Monitor Cards Content */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-950/40" id="workshop-monitor-cards-container">
              {/* DEMONSTRATIVO E LEGENDA EXPLICATIVA DAS CORES DO SEMÁFORO */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Demonstrativo & Significados do Semáforo da Oficina
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">Padrão Otimizado</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Cinza */}
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-300 shrink-0"></span>
                      <span>⚪ Cinza: Não Iniciada</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Veículo recepcionado no pátio com Ordem de Serviço criada, aguardando liberação do box e início do mecânico.
                    </p>
                  </div>

                  {/* Amarelo */}
                  <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse border border-amber-300 shrink-0"></span>
                      <span>🟡 Amarelo: Pausada</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Serviço suspenso por falta de peças no estoque, aguardando aprovação de novos itens pelo cliente ou retífica.
                    </p>
                  </div>

                  {/* Verde (Substitui Vermelho para Em Andamento) */}
                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-300 shrink-0"></span>
                      <span>🟢 Verde: Em Andamento</span>
                    </div>
                    <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                      Veículo em reparo ativo no elevador pelo mecânico (troca do antigo vermelho para verde para melhor visualização).
                    </p>
                  </div>

                  {/* Azul (Substitui Verde para Liberado) */}
                  <div className="bg-blue-950/30 border border-blue-500/30 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-blue-300">
                      <span className="w-3 h-3 rounded-full bg-blue-400 border border-blue-300 shrink-0"></span>
                      <span>🔵 Azul: Liberado / Pronto</span>
                    </div>
                    <p className="text-[11px] text-blue-200/80 leading-relaxed">
                      Manutenção e testes de qualidade concluídos. Veículo pronto e liberado para entrega ao cliente (troca de verde para azul).
                    </p>
                  </div>
                </div>
              </div>
              {(() => {
                let displayList = activeWorkshopOrders;

                if (workshopFilter !== 'all') {
                  displayList = displayList.filter(o => getOSWorkshopColor(o) === workshopFilter);
                }

                if (monitorSearchQuery) {
                  const q = monitorSearchQuery.toLowerCase();
                  displayList = displayList.filter(o => {
                    const plate = getVehiclePlate(o.vehicleId).toLowerCase();
                    const desc = getVehicleDesc(o.vehicleId).toLowerCase();
                    const client = getClientName(o.clientId).toLowerCase();
                    return o.id.toLowerCase().includes(q) || plate.includes(q) || desc.includes(q) || client.includes(q);
                  });
                }

                if (displayList.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
                      <Car className="w-12 h-12 mx-auto text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">Nenhum veículo encontrado nesta categoria de semáforo.</p>
                      <p className="text-xs text-slate-500">Alterne o filtro acima ou crie uma nova Ordem de Serviço na oficina.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayList.map(os => {
                      const color = getOSWorkshopColor(os);
                      const clientObj = db.clients.find(c => c.id === os.clientId);
                      const vehicleObj = db.vehicles.find(v => v.id === os.vehicleId);
                      const activeItemsCount = os.items.filter(i => i.status !== 'canceled').length;

                      // Format phone for WhatsApp link
                      const rawPhone = clientObj?.phone || '';
                      const cleanPhone = rawPhone.replace(/\D/g, '');
                      const whatsappUrl = cleanPhone 
                        ? `https://wa.me/55${cleanPhone}?text=Olá%20${encodeURIComponent(clientObj?.name || 'Cliente')},%20informamos%20sobre%20seu%20veículo%20${encodeURIComponent(vehicleObj?.model || 'veículo')}%20na%20oficina.` 
                        : null;

                      return (
                        <div 
                          key={os.id} 
                          className={`rounded-2xl border p-5 transition flex flex-col justify-between space-y-4 shadow-lg relative ${
                            color === 'gray' ? 'bg-slate-900/90 border-slate-800' :
                            color === 'yellow' ? 'bg-slate-900/95 border-amber-500/50 ring-1 ring-amber-500/30' :
                            color === 'green' ? 'bg-slate-900/95 border-emerald-500/50 ring-1 ring-emerald-500/30' :
                            'bg-slate-900/95 border-blue-500/50 ring-1 ring-blue-500/30'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Card Header: License Plate & Semáforo Status */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              {/* License Plate Style */}
                              <div className="bg-white border-2 border-slate-800 text-slate-900 rounded-lg px-3 py-1 font-mono font-extrabold text-sm shadow-sm flex items-center gap-1.5">
                                <span className="text-[9px] bg-blue-700 text-white px-1 rounded uppercase tracking-tighter">BR</span>
                                <span>{getVehiclePlate(os.vehicleId) || 'SEM PLACA'}</span>
                              </div>

                              {/* Traffic Light Status Badge */}
                              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs ${
                                color === 'gray' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                                color === 'yellow' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' :
                                color === 'green' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              }`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                  color === 'gray' ? 'bg-slate-400' :
                                  color === 'yellow' ? 'bg-amber-400 animate-pulse' :
                                  color === 'green' ? 'bg-emerald-400' :
                                  'bg-blue-400'
                                }`}></span>
                                {color === 'gray' ? 'Cinza (Não Iniciada)' :
                                 color === 'yellow' ? 'Amarelo (Pausada)' :
                                 color === 'green' ? 'Verde (Em Andamento)' :
                                 'Azul (Liberado)'}
                              </span>
                            </div>

                            {/* Vehicle & Client Info */}
                            <div className="space-y-1.5">
                              <h3 className="font-bold text-base text-white font-display">
                                {vehicleObj ? `${vehicleObj.brand} ${vehicleObj.model}` : 'Veículo'}
                              </h3>
                              <p className="text-xs text-slate-400 flex items-center gap-2">
                                <span>Ano: {vehicleObj?.year || 'N/I'}</span>
                                <span>•</span>
                                <span>Cor: {vehicleObj?.color || 'N/I'}</span>
                              </p>

                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800/80 mt-2 space-y-1">
                                <p className="text-xs text-slate-300 flex items-center justify-between">
                                  <span><strong>Cliente:</strong> {getClientName(os.clientId)}</span>
                                  {whatsappUrl && (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1"
                                      title="Conversar no WhatsApp"
                                    >
                                      <MessageSquare className="w-3 h-3 text-emerald-400" /> WhatsApp
                                    </a>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center justify-between">
                                  <span>OS #{os.id} • Mecânico: {getMechanicName(os.mechanicId)}</span>
                                  <span className="text-indigo-400 font-medium">{activeItemsCount} item(ns)</span>
                                </p>
                              </div>
                            </div>

                            {/* Pause Reason Warning if Yellow */}
                            {color === 'yellow' && (
                              <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-amber-200 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-amber-300">
                                  <span className="flex items-center gap-1">
                                    <Pause className="w-3.5 h-3.5 text-amber-400" /> Motivo da Pausa:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPauseOS(os);
                                      setPauseReasonInput(os.pauseReason || '');
                                    }}
                                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                                  >
                                    Alterar
                                  </button>
                                </div>
                                <p className="text-xs text-amber-100 italic">
                                  "{os.pauseReason || 'Falta de Peça / Aguardando Retorno'}"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Interactive Traffic Light Selector Bar */}
                          <div className="space-y-3 pt-3 border-t border-slate-800">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                              Alterar Sinalizador da Oficina:
                            </span>
                            <div className="grid grid-cols-4 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetWorkshopStatus(os.id, 'gray')}
                                className={`py-1.5 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                                  color === 'gray' 
                                    ? 'bg-slate-700 text-white ring-2 ring-slate-400' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                                Cinza
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPauseOS(os);
                                  setPauseReasonInput(os.pauseReason || 'Falta de Peça');
                                }}
                                className={`py-1.5 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                                  color === 'yellow' 
                                    ? 'bg-amber-500 text-slate-950 font-extrabold ring-2 ring-amber-300' 
                                    : 'bg-slate-800 text-amber-400 hover:bg-amber-950/60'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                                Amarelo
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetWorkshopStatus(os.id, 'green')}
                                className={`py-1.5 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                                  color === 'green' 
                                    ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400' 
                                    : 'bg-slate-800 text-emerald-400 hover:bg-emerald-950/60'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                                Verde
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetWorkshopStatus(os.id, 'blue')}
                                className={`py-1.5 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                                  color === 'blue' 
                                    ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400' 
                                    : 'bg-slate-800 text-blue-400 hover:bg-blue-950/60'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                                Azul
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOS(os);
                                setIsWorkshopMonitorOpen(false);
                              }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-200" />
                              <span>Abrir / Executar OS #{os.id}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE REASON MODAL (SEMAFORO AMARELO) */}
      {editingPauseOS && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="pause-reason-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold font-display">
                <Pause className="w-5 h-5 text-amber-500" />
                <h3>Informar Motivo da Pausa (Semáforo Amarelo)</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPauseOS(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Veículo: <strong>{getVehicleDesc(editingPauseOS.vehicleId)} ({getVehiclePlate(editingPauseOS.vehicleId)})</strong> — OS #{editingPauseOS.id}
            </p>

            {/* Quick Reason Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Selecione ou digite o motivo da pausa:
              </label>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'Falta de Peça',
                  'Aguardando Retorno / Autorização do Cliente',
                  'Aguardando Serviço Terceirizado / Retífica',
                  'Falta de Ferramenta Especial',
                  'Aguardando Lavagem / Polimento',
                  'Aguardando Liberação de Box'
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPauseReasonInput(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                      pauseReasonInput === preset
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={pauseReasonInput}
                onChange={e => setPauseReasonInput(e.target.value)}
                placeholder="Especifique o motivo da pausa do reparo..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPauseOS(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSetWorkshopStatus(editingPauseOS.id, 'yellow', pauseReasonInput || 'Falta de Peça');
                  setEditingPauseOS(null);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-md cursor-pointer flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Confirmar Semáforo Amarelo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal da Sessão do Gerente (Aprovação de Alteração de Valores) */}
      <ManagerApprovalModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        db={db}
        currentUser={currentUser}
        onSaveServiceOrders={onSaveServiceOrders}
        onAddHistoryLog={onAddHistoryLog}
        onAddNotification={onAddNotification}
      />

      {/* MODAL DE ADVERTÊNCIA DE SINAL DE ENTRADA DO PÁTIO/OFICINA */}
      {depositModalOS && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="deposit-requirement-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-amber-200 animate-slide-up">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <ShieldAlert className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base font-display">Sinal de Entrada Exigido</h3>
                <p className="text-xs text-slate-500">Regra de Pagamento do Cliente / Oficina</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
              <p className="font-semibold text-amber-950">
                A Ordem de Serviço <strong>#{depositModalOS.id}</strong> exige a confirmação do pagamento do sinal antes de mover o veículo para "Em Andamento" (Verde):
              </p>
              <div className="bg-white p-3 rounded-lg border border-amber-200/80 space-y-1.5">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Modo Configurado:</span>
                  <span className="font-bold text-amber-800 uppercase">
                    {depositModalOS.paymentRequirementMode === 'FULL_ADVANCE' ? '100% Antecipado' : `Sinal de ${depositModalOS.requiredDepositPercentage || 30}%`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm border-t border-slate-100 pt-1.5">
                  <span>Sinal de Entrada:</span>
                  <span className="text-emerald-700 font-mono">
                    R$ {(depositModalOS.requiredDepositAmount || (depositModalOS.items.reduce((s,i) => s + i.totalPrice, 0) * 0.3)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Forma de Recebimento do Sinal:
              </label>
              <select
                value={depositPaymentMethod}
                onChange={e => setDepositPaymentMethod(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-medium bg-slate-50 text-slate-800"
              >
                <option value="PIX">PIX (Sincronização Imediata)</option>
                <option value="Dinheiro">Dinheiro em Espécie</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleRegisterDeposit(depositModalOS, depositPaymentMethod);
                  handleSetWorkshopStatus(depositModalOS.id, 'green', undefined, true);
                  setDepositModalOS(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <DollarSign className="w-4 h-4" /> Confirmar Pagamento do Sinal & Iniciar Manutenção
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSetWorkshopStatus(depositModalOS.id, 'green', undefined, true);
                  setDepositModalOS(null);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-2 rounded-xl transition text-center cursor-pointer"
              >
                Iniciar Mesmo Sem Sinal (Exceção Especial de Gerência)
              </button>

              <button
                type="button"
                onClick={() => setDepositModalOS(null)}
                className="w-full text-slate-400 hover:text-slate-600 text-xs py-1 text-center cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRE-TRANSMISSION REVIEW MODAL */}
      {preTxData && (
        <PreTransmissionReviewModal
          isOpen={!!preTxData}
          onClose={() => {
            setPreTxData(null);
            setPendingTxAction(null);
          }}
          data={preTxData}
          sefazConfig={db.sefazConfig}
          companyInfo={db.companyInfo}
          onConfirmTransmission={async () => {
            if (pendingTxAction) {
              await pendingTxAction();
            }
          }}
        />
      )}

      {/* OPERATION RESULT MODAL (SUCCESS / ERROR WITH OK BUTTON) */}
      <OperationResultModal
        isOpen={resultModal.isOpen}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        onClose={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
