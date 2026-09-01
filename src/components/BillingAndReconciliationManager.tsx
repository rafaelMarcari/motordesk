/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, Calendar, Clock, CheckCircle2, AlertTriangle, X, 
  FileText, ArrowRight, ShieldCheck, Lock, Unlock, RotateCcw,
  Printer, QrCode, Copy, Search, Filter, Layers, ShoppingBag,
  Wrench, Building2, User, CreditCard, ChevronRight, Eye,
  Sparkles, CheckSquare, Square, RefreshCw, Landmark, ArrowUpRight
} from 'lucide-react';
import { 
  BillingClosingOrder, 
  BillingClosingItem, 
  AccountReceivable, 
  Client, 
  User as AppUser, 
  CommercialSale, 
  ServiceOrder, 
  BoletoDocument, 
  BankStatement, 
  BankStatementItem, 
  FinancialTransaction, 
  HistoryEntry,
  SystemNotification
} from '../types';
import { AppDatabase } from '../data/mockData';
import BoletoPrintModal from './BoletoPrintModal';
import { buildBoletoDocument } from '../utils/boletoEngine';

interface BillingAndReconciliationManagerProps {
  db: AppDatabase;
  currentUser: AppUser;
  activeSubTab?: 'closings' | 'pending' | 'reconciliation' | 'credit_risk';
  onSaveDatabaseUpdates: (updates: Partial<AppDatabase>, auditLog?: { type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system'; title: string; description: string; clientId?: string; vehicleId?: string }) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function BillingAndReconciliationManager({
  db,
  currentUser,
  activeSubTab = 'closings',
  onSaveDatabaseUpdates,
  onNavigateToTab
}: BillingAndReconciliationManagerProps) {
  const [tab, setTab] = useState<'closings' | 'pending' | 'reconciliation' | 'credit_risk'>(activeSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Notifications / Feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modals
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isBoletoModalOpen, setIsBoletoModalOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [isCreditBypassModalOpen, setIsCreditBypassModalOpen] = useState(false);

  // Selected State
  const [selectedClosing, setSelectedClosing] = useState<BillingClosingOrder | null>(null);
  const [selectedClosingForReopen, setSelectedClosingForReopen] = useState<BillingClosingOrder | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [selectedClientForManualClosing, setSelectedClientForManualClosing] = useState<string>('');
  const [selectedPendingSaleIds, setSelectedPendingSaleIds] = useState<Set<string>>(new Set());
  const [customClosingDueDate, setCustomClosingDueDate] = useState<string>('');
  const [customDiscountAmount, setCustomDiscountAmount] = useState<string>('0');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Reconciliation Selection State
  const [selectedBankItem, setSelectedBankItem] = useState<BankStatementItem | null>(null);
  const [selectedReceivableForReconciliation, setSelectedReceivableForReconciliation] = useState<string>('');

  // Credit Limit Bypass Modal State
  const [clientForCreditAdjust, setClientForCreditAdjust] = useState<Client | null>(null);
  const [newCreditLimitVal, setNewCreditLimitVal] = useState<string>('');
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState<string>('');

  const clients = db.clients || [];
  const closings = db.billingClosings || [];
  const sales = db.sales || [];
  const serviceOrders = db.serviceOrders || [];
  const receivables = db.accountsReceivable || [];
  const bankStatements = db.bankStatements || [];
  const boletos = db.boletos || [];
  const registeredCompanies = db.registeredCompanies || (db.companyInfo ? [db.companyInfo] : []);

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Permissions Check
  const isAdminOrManager = currentUser.role === 'admin' || currentUser.permissions.financialBillingClosing === true;
  const canReopen = currentUser.role === 'admin' || currentUser.permissions.financialReopenClosing === true;
  const canReconcile = currentUser.role === 'admin' || currentUser.permissions.financialReconciliation === true;
  const canBypassCredit = currentUser.role === 'admin' || currentUser.permissions.authorizeCreditLimitBypass === true;

  // 1. GATHER ALL UNCONSOLIDATED ACCUMULATED SALES AND OS
  const eligiblePendingItems = useMemo(() => {
    const items: Array<{
      id: string;
      code: string;
      originType: 'SALE' | 'SERVICE_ORDER';
      companyId: string;
      clientId: string;
      clientName: string;
      clientCpfCnpj?: string;
      date: string;
      subtotal: number;
      discount: number;
      totalAmount: number;
      sellerName: string;
      paymentMethod: string;
      paymentCondition: string;
      financialStatus: string;
      billingClosureId?: string;
      itemsSummary: string;
      vehiclePlate?: string;
    }> = [];

    // Filter Sales
    sales.forEach(sale => {
      const isAccumulatedOrPending = 
        sale.accumulateForBilling === true || 
        sale.billingPolicy === 'CONSOLIDATED_PERIOD' ||
        sale.financialStatus === 'PENDENTE_FATURAMENTO' ||
        sale.financialStatus === 'ACUMULADA' ||
        sale.billingStatus === 'AWAITING_CONSOLIDATION' ||
        sale.billingStatus === 'pending_billing' ||
        sale.paymentMethod?.toLowerCase().includes('faturad') ||
        sale.paymentMethod?.toLowerCase().includes('a prazo');

      // Rule: Can only be included if NOT already in an active closure
      const isNotInActiveClosure = !sale.billingClosureId && !sale.consolidatedBillingId;
      const isNotCanceled = sale.paymentStatus !== 'canceled' && sale.financialStatus !== 'CANCELADA';

      if (isAccumulatedOrPending && isNotInActiveClosure && isNotCanceled) {
        const client = clients.find(c => c.id === sale.clientId);
        items.push({
          id: sale.id,
          code: sale.code,
          originType: 'SALE',
          companyId: sale.companyId || 'comp-1',
          clientId: sale.clientId,
          clientName: client?.name || sale.clientName || 'Cliente Balcão',
          clientCpfCnpj: client?.cpfCnpj || client?.cpf || sale.clientCpfCnpj,
          date: sale.createdAt?.substring(0, 10) || new Date().toISOString().substring(0, 10),
          subtotal: sale.subtotal || sale.totalAmount,
          discount: sale.discount || 0,
          totalAmount: sale.totalAmount,
          sellerName: sale.createdBy || 'Vendedor Balcão',
          paymentMethod: sale.paymentMethod || 'Faturado',
          paymentCondition: sale.paymentCondition || 'Faturamento Consolidado',
          financialStatus: sale.financialStatus || 'ACUMULADA',
          billingClosureId: sale.billingClosureId,
          itemsSummary: sale.items?.map(i => `${i.quantity}x ${i.partName}`).join(', ') || 'Peças/Produtos'
        });
      }
    });

    // Filter Service Orders
    serviceOrders.forEach(os => {
      const isAccumulatedOrPending = 
        os.accumulateForBilling === true ||
        os.billingPolicy === 'CONSOLIDATED_PERIOD' ||
        os.financialStatus === 'PENDENTE_FATURAMENTO' ||
        os.financialStatus === 'ACUMULADA' ||
        os.billingStatus === 'AWAITING_CONSOLIDATION' ||
        os.billingStatus === 'pending_billing';

      const isCompleted = os.status === 'completed';
      const isNotInActiveClosure = !os.billingClosureId && !os.consolidatedBillingId;
      const isNotPaidDirectly = os.paymentStatus !== 'paid' || isAccumulatedOrPending;

      if (isAccumulatedOrPending && isCompleted && isNotInActiveClosure && isNotPaidDirectly) {
        const client = clients.find(c => c.id === os.clientId);
        const vehicle = (db.vehicles || []).find(v => v.id === os.vehicleId);
        const totalOS = os.items?.reduce((sum, item) => sum + (item.totalPrice || (item.unitPrice * item.quantity)), 0) || 0;

        items.push({
          id: os.id,
          code: `OS-${os.id.slice(-4).toUpperCase()}`,
          originType: 'SERVICE_ORDER',
          companyId: os.companyId || 'comp-1',
          clientId: os.clientId,
          clientName: client?.name || 'Cliente Oficina',
          clientCpfCnpj: client?.cpfCnpj || client?.cpf,
          date: (os.completedAt || os.createdAt)?.substring(0, 10) || new Date().toISOString().substring(0, 10),
          subtotal: totalOS,
          discount: 0,
          totalAmount: totalOS,
          sellerName: os.mechanicId || 'Consultor Técnico',
          paymentMethod: 'Faturado',
          paymentCondition: 'Faturamento Mensal/Periódico',
          financialStatus: os.financialStatus || 'ACUMULADA',
          billingClosureId: os.billingClosureId,
          itemsSummary: os.items?.map(i => i.name).join(', ') || 'Serviços Mecânicos',
          vehiclePlate: vehicle ? `${vehicle.plate} (${vehicle.model})` : undefined
        });
      }
    });

    return items;
  }, [sales, serviceOrders, clients, db.vehicles]);

  // Filtered Pending Items
  const filteredPendingItems = useMemo(() => {
    return eligiblePendingItems.filter(item => {
      if (companyFilter !== 'all' && item.companyId !== companyFilter) return false;
      if (clientFilter !== 'all' && item.clientId !== clientFilter) return false;
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesClient = item.clientName.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesItems = item.itemsSummary.toLowerCase().includes(q);
        if (!matchesClient && !matchesCode && !matchesItems) return false;
      }
      return true;
    });
  }, [eligiblePendingItems, companyFilter, clientFilter, startDate, endDate, searchQuery]);

  // Filtered Closings
  const filteredClosings = useMemo(() => {
    return closings.filter(c => {
      if (companyFilter !== 'all' && c.companyId !== companyFilter) return false;
      if (clientFilter !== 'all' && c.clientId !== clientFilter) return false;
      if (statusFilter !== 'all') {
        const isMatch = (statusFilter === 'ABERTO' && (c.status === 'ABERTO' || c.status === 'open')) ||
          (statusFilter === 'FECHADO' && (c.status === 'FECHADO' || c.status === 'FATURADO' || c.status === 'closed')) ||
          (statusFilter === 'PAGO' && (c.status === 'PAGO' || c.paymentStatus === 'paid' || c.status === 'paid')) ||
          (statusFilter === 'CANCELADO' && (c.status === 'CANCELADO' || c.status === 'canceled'));
        if (!isMatch) return false;
      }
      if (startDate && c.closingDate < startDate) return false;
      if (endDate && c.closingDate > endDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesClient = c.clientName.toLowerCase().includes(q);
        const matchesCode = c.code.toLowerCase().includes(q);
        if (!matchesClient && !matchesCode) return false;
      }
      return true;
    });
  }, [closings, companyFilter, clientFilter, statusFilter, startDate, endDate, searchQuery]);

  // Clients with pending items count
  const clientsWithPendingSales = useMemo(() => {
    const map = new Map<string, { client: Client; items: typeof eligiblePendingItems; total: number }>();
    eligiblePendingItems.forEach(item => {
      const client = clients.find(c => c.id === item.clientId);
      if (!client) return;
      const current = map.get(item.clientId) || { client, items: [], total: 0 };
      current.items.push(item);
      current.total += item.totalAmount;
      map.set(item.clientId, current);
    });
    return Array.from(map.values());
  }, [eligiblePendingItems, clients]);

  // 2. TRIGGER MANUAL CLOSING PREVIEW
  const handleOpenManualClosingPreview = (targetClientId?: string) => {
    const clientId = targetClientId || selectedClientForManualClosing || (clientsWithPendingSales[0]?.client.id);
    if (!clientId) {
      setErrorMsg('Selecione um cliente para gerar o fechamento de faturamento.');
      return;
    }

    const client = clients.find(c => c.id === clientId);
    if (!client) {
      setErrorMsg('Cliente selecionado não encontrado.');
      return;
    }

    const clientItems = eligiblePendingItems.filter(i => i.clientId === clientId);
    if (clientItems.length === 0) {
      setErrorMsg(`Não existem vendas ou OS pendentes de faturamento para ${client.name}.`);
      return;
    }

    setSelectedClientForManualClosing(clientId);
    // By default select all client items
    setSelectedPendingSaleIds(new Set(clientItems.map(i => i.id)));

    // Calculate default due date (e.g. 10th of next month or 7 days from now)
    const now = new Date();
    let defaultDue = new Date();
    if (client.billingDueDaysAfter) {
      defaultDue.setDate(now.getDate() + client.billingDueDaysAfter);
    } else if (client.billingDueDayOfMonth) {
      defaultDue = new Date(now.getFullYear(), now.getMonth() + 1, client.billingDueDayOfMonth);
    } else {
      defaultDue.setDate(now.getDate() + 10);
    }
    setCustomClosingDueDate(defaultDue.toISOString().substring(0, 10));
    setCustomDiscountAmount('0');
    setCustomNotes(`Faturamento consolidado referente às ordens e vendas do ciclo.`);
    setIsPreviewModalOpen(true);
  };

  // 3. CONFIRM & GENERATE CONSOLIDATED CLOSING
  const handleConfirmGenerateClosing = () => {
    const client = clients.find(c => c.id === selectedClientForManualClosing);
    if (!client) return;

    const itemsToInclude = eligiblePendingItems.filter(i => 
      i.clientId === selectedClientForManualClosing && selectedPendingSaleIds.has(i.id)
    );

    if (itemsToInclude.length === 0) {
      setErrorMsg('Selecione ao menos 1 venda/OS para incorporar no fechamento.');
      return;
    }

    const subtotal = itemsToInclude.reduce((sum, item) => sum + item.totalAmount, 0);
    const discount = parseFloat(customDiscountAmount) || 0;
    const totalAmount = Math.max(0, subtotal - discount);

    const nextNumber = (closings.length || 0) + 1;
    const closingCode = `FCH-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
    const closingId = `closing-${Date.now()}`;
    const todayStr = new Date().toISOString().substring(0, 10);

    // Calculate period start and end
    const dates = itemsToInclude.map(i => i.date).sort();
    const periodStart = dates[0] || todayStr;
    const periodEnd = dates[dates.length - 1] || todayStr;

    // Generated AccountReceivable (Título Financeiro Consolidado)
    const receivableNumber = (receivables.length || 0) + 101;
    const receivableCode = `TIT-CONS-${String(receivableNumber).padStart(5, '0')}`;
    const receivableId = `rec-${Date.now()}`;

    // Boleto Bancário Consolidado
    const boletoNumber = (boletos.length || 0) + 1;
    const boletoCode = `BOL-${new Date().getFullYear()}-${String(boletoNumber).padStart(3, '0')}`;
    const barcodeNumber = `34191.${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} 1 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const boletoId = `bol-${Date.now()}`;

    const newBoleto: BoletoDocument = {
      id: boletoId,
      code: boletoCode,
      companyId: client.companyId || currentUser.companyId || 'comp-1',
      payerName: client.name,
      payerCpfCnpj: client.cpfCnpj || client.cpf || '',
      receivableId: receivableId,
      bankName: 'Banco Itaú Unibanco (341)',
      bankCode: '341',
      agency: '0452',
      account: '98450-2',
      wallet: '109',
      nossoNumero: String(Math.floor(10000000 + Math.random() * 90000000)),
      barcodeNumber,
      pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020126580014BR.GOV.BCB.PIX0136${boletoId}520400005303986540${totalAmount.toFixed(2)}5802BR5925${encodeURIComponent(client.name)}6009SAO_PAULO62070503***6304`,
      pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136${boletoId}520400005303986540${totalAmount.toFixed(2)}5802BR5925${encodeURIComponent(client.name)}6009SAO_PAULO62070503***6304`,
      issueDate: todayStr,
      dueDate: customClosingDueDate || todayStr,
      amount: totalAmount,
      status: 'registered',
      instructions: `Faturamento consolidado ${closingCode} (${itemsToInclude.length} vendas/OS). Não receber após 30 dias do vencimento.`
    };

    const newReceivable: AccountReceivable = {
      id: receivableId,
      code: receivableCode,
      companyId: client.companyId || currentUser.companyId || 'comp-1',
      clientId: client.id,
      clientName: client.name,
      clientCpf: client.cpfCnpj || client.cpf,
      title: `Faturamento Consolidado ${closingCode} (${itemsToInclude.length} vendas)`,
      notes: `Fechamento periódico ${periodStart} até ${periodEnd} para ${client.name}`,
      totalAmount: totalAmount,
      remainingAmount: totalAmount,
      paidAmount: 0,
      dueDate: customClosingDueDate || todayStr,
      status: 'pending',
      paymentMethod: client.preferredPaymentMethod || 'Boleto Bancário',
      boletoId: boletoId,
      boletoCode: boletoCode,
      boletoBarcode: barcodeNumber,
      boletoStatus: 'registered',
      installmentsCount: 1,
      installments: [
        {
          id: `inst-${Date.now()}-1`,
          installmentNumber: 1,
          totalInstallments: 1,
          dueDate: customClosingDueDate || todayStr,
          amount: totalAmount,
          paidAmount: 0,
          status: 'pending',
          paymentMethod: client.preferredPaymentMethod || 'Boleto'
        }
      ],
      createdAt: todayStr
    };

    const closingItems: BillingClosingItem[] = itemsToInclude.map(item => ({
      id: `item-${Date.now()}-${item.id}`,
      originType: item.originType,
      originId: item.id,
      originCode: item.code,
      documentDate: item.date,
      description: item.itemsSummary,
      subtotal: item.subtotal,
      discount: item.discount,
      amount: item.totalAmount,
      sellerName: item.sellerName,
      paymentMethod: item.paymentMethod,
      paymentCondition: item.paymentCondition,
      vehiclePlate: item.vehiclePlate,
      itemsSummary: item.itemsSummary
    }));

    const newClosing: BillingClosingOrder = {
      id: closingId,
      code: closingCode,
      companyId: client.companyId || currentUser.companyId || 'comp-1',
      clientId: client.id,
      clientName: client.name,
      clientCpfCnpj: client.cpfCnpj || client.cpf,
      periodicity: client.billingPeriodicity || 'MENSAL',
      periodStart,
      periodEnd,
      periodStartDate: periodStart,
      periodEndDate: periodEnd,
      closingDate: todayStr,
      dueDate: customClosingDueDate || todayStr,
      salesCount: itemsToInclude.filter(i => i.originType === 'SALE').length,
      serviceOrdersCount: itemsToInclude.filter(i => i.originType === 'SERVICE_ORDER').length,
      subtotal,
      discountAmount: discount,
      totalAmount,
      paymentMethod: client.preferredPaymentMethod || 'Boleto Bancário',
      paymentCondition: 'Faturamento Consolidado',
      paymentStatus: 'pending',
      status: 'FATURADO',
      accountReceivableId: receivableId,
      accountReceivableCode: receivableCode,
      receivableId: receivableId,
      receivableCode: receivableCode,
      boletoId: boletoId,
      boletoBarcode: barcodeNumber,
      pixTxId: `PIX-TX-${Date.now()}`,
      notes: customNotes,
      items: closingItems,
      linkedSaleIds: itemsToInclude.filter(i => i.originType === 'SALE').map(i => i.id),
      linkedSaleCodes: itemsToInclude.filter(i => i.originType === 'SALE').map(i => i.code),
      linkedServiceOrderIds: itemsToInclude.filter(i => i.originType === 'SERVICE_ORDER').map(i => i.id),
      linkedServiceOrderCodes: itemsToInclude.filter(i => i.originType === 'SERVICE_ORDER').map(i => i.code),
      createdAt: todayStr,
      createdByName: currentUser.name,
      closedBy: currentUser.name,
      closedAt: new Date().toISOString()
    };

    // Update Sales status
    const updatedSales = sales.map(sale => {
      if (selectedPendingSaleIds.has(sale.id)) {
        return {
          ...sale,
          financialStatus: 'FATURADA' as const,
          billingStatus: 'CONSOLIDATED' as const,
          billingClosureId: closingId,
          consolidatedBillingId: closingId,
          consolidatedBillingCode: closingCode,
          accountReceivableId: receivableId,
          receivableId: receivableId
        };
      }
      return sale;
    });

    // Update Service Orders status
    const updatedServiceOrders = serviceOrders.map(os => {
      if (selectedPendingSaleIds.has(os.id)) {
        return {
          ...os,
          financialStatus: 'FATURADA' as const,
          billingStatus: 'CONSOLIDATED' as const,
          billingClosureId: closingId,
          consolidatedBillingId: closingId,
          consolidatedBillingCode: closingCode,
          accountReceivableId: receivableId,
          receivableId: receivableId
        };
      }
      return os;
    });

    // Save to Database
    onSaveDatabaseUpdates({
      billingClosings: [newClosing, ...closings],
      accountsReceivable: [newReceivable, ...receivables],
      boletos: [newBoleto, ...boletos],
      sales: updatedSales,
      serviceOrders: updatedServiceOrders
    }, {
      type: 'payment',
      title: 'Fechamento Consolidado Criado',
      description: `Fechamento ${closingCode} gerado com sucesso para ${client.name}. Total: R$ ${totalAmount.toFixed(2)} (${itemsToInclude.length} itens vinculados ao título ${receivableCode}).`,
      clientId: client.id
    });

    setIsPreviewModalOpen(false);
    setSelectedClosing(newClosing);
    setSuccessMsg(`Fechamento ${closingCode} e Título ${receivableCode} gerados com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // 4. REOPEN BILLING CLOSING WITH MANDATORY AUDIT JUSTIFICATION
  const handleConfirmReopenClosing = () => {
    if (!selectedClosingForReopen) return;
    if (!reopenReason.trim() || reopenReason.trim().length < 10) {
      setErrorMsg('A justificativa de reabertura é obrigatória (mínimo de 10 caracteres).');
      return;
    }

    const closing = selectedClosingForReopen;
    const client = clients.find(c => c.id === closing.clientId);

    // Rollback linked Sales to PENDENTE_FATURAMENTO / ACUMULADA
    const updatedSales = sales.map(sale => {
      if (sale.billingClosureId === closing.id || sale.consolidatedBillingId === closing.id) {
        return {
          ...sale,
          financialStatus: 'PENDENTE_FATURAMENTO' as const,
          billingStatus: 'AWAITING_CONSOLIDATION' as const,
          billingClosureId: undefined,
          consolidatedBillingId: undefined,
          consolidatedBillingCode: undefined,
          accountReceivableId: undefined,
          receivableId: undefined
        };
      }
      return sale;
    });

    // Rollback linked Service Orders
    const updatedServiceOrders = serviceOrders.map(os => {
      if (os.billingClosureId === closing.id || os.consolidatedBillingId === closing.id) {
        return {
          ...os,
          financialStatus: 'PENDENTE_FATURAMENTO' as const,
          billingStatus: 'AWAITING_CONSOLIDATION' as const,
          billingClosureId: undefined,
          consolidatedBillingId: undefined,
          consolidatedBillingCode: undefined,
          accountReceivableId: undefined,
          receivableId: undefined
        };
      }
      return os;
    });

    // Remove or Cancel the generated AccountReceivable
    const updatedReceivables = receivables.filter(rec => 
      rec.id !== closing.accountReceivableId && rec.id !== closing.receivableId
    );

    // Cancel Boleto if exists
    const updatedBoletos = boletos.map(bol => {
      if (bol.id === closing.boletoId || bol.receivableId === closing.accountReceivableId) {
        return {
          ...bol,
          status: 'canceled' as const,
          instructions: `[CANCELADO] Fechamento ${closing.code} reaberto por ${currentUser.name}.`
        };
      }
      return bol;
    });

    // Update Closing status
    const updatedClosings = closings.map(c => {
      if (c.id === closing.id) {
        return {
          ...c,
          status: 'CANCELADO' as const,
          reopenedBy: currentUser.name,
          reopenedAt: new Date().toISOString(),
          reopenReason: reopenReason.trim(),
          notes: `${c.notes ? c.notes + ' | ' : ''}Reaberto por ${currentUser.name} em ${new Date().toLocaleString('pt-BR')}: "${reopenReason.trim()}"`
        };
      }
      return c;
    });

    // Save and register in Audit History
    onSaveDatabaseUpdates({
      billingClosings: updatedClosings,
      accountsReceivable: updatedReceivables,
      boletos: updatedBoletos,
      sales: updatedSales,
      serviceOrders: updatedServiceOrders
    }, {
      type: 'user_activity',
      title: `Reabertura de Fechamento Consolidado (${closing.code})`,
      description: `O usuário ${currentUser.name} reabriu o fechamento ${closing.code} do cliente ${closing.clientName}. Justificativa: "${reopenReason.trim()}". As vendas retornaram para PENDENTE_FATURAMENTO e o título ${closing.accountReceivableCode || ''} foi estornado.`,
      clientId: closing.clientId
    });

    setIsReopenModalOpen(false);
    setSelectedClosingForReopen(null);
    setReopenReason('');
    setSuccessMsg(`Fechamento ${closing.code} reaberto com sucesso! As vendas retornaram ao status Pendente de Faturamento.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // 5. RECONCILIATION IDENTIFICATION: Banco → Título → Fechamento → Vendas Vinculadas
  const handleReconcileBankItem = () => {
    if (!selectedBankItem || !selectedReceivableForReconciliation) {
      setErrorMsg('Selecione o lançamento do extrato e o título a ser conciliado.');
      return;
    }

    const rec = receivables.find(r => r.id === selectedReceivableForReconciliation);
    if (!rec) return;

    // Find linked closing if it is a consolidated title
    const linkedClosing = closings.find(c => c.accountReceivableId === rec.id || c.receivableId === rec.id);

    // Update Bank Statement Item
    const updatedStatements = bankStatements.map(stmt => ({
      ...stmt,
      items: stmt.items.map(item => {
        if (item.id === selectedBankItem.id) {
          return {
            ...item,
            reconciled: true,
            reconciledAt: new Date().toISOString(),
            reconciledBy: currentUser.name,
            reconciledAccountReceivableId: rec.id,
            reconciledBillingClosingId: linkedClosing?.id,
            notes: `Conciliado com ${rec.code} (${rec.clientName})`
          };
        }
        return item;
      })
    }));

    // Update Receivable status to PAID
    const updatedReceivables = receivables.map(r => {
      if (r.id === rec.id) {
        return {
          ...r,
          status: 'paid' as const,
          remainingAmount: 0,
          paidAmount: r.totalAmount,
          paidDate: selectedBankItem.date,
          reconciledAt: new Date().toISOString(),
          reconciledBy: currentUser.name
        };
      }
      return r;
    });

    // If linked to a closing, mark closing and all linked sales as PAGA
    let updatedClosings = closings;
    let updatedSales = sales;
    let updatedServiceOrders = serviceOrders;

    if (linkedClosing) {
      updatedClosings = closings.map(c => {
        if (c.id === linkedClosing.id) {
          return {
            ...c,
            status: 'PAGO' as const,
            paymentStatus: 'paid' as const
          };
        }
        return c;
      });

      updatedSales = sales.map(sale => {
        if (sale.billingClosureId === linkedClosing.id || sale.consolidatedBillingId === linkedClosing.id) {
          return {
            ...sale,
            financialStatus: 'PAGA' as const,
            paymentStatus: 'paid' as const
          };
        }
        return sale;
      });

      updatedServiceOrders = serviceOrders.map(os => {
        if (os.billingClosureId === linkedClosing.id || os.consolidatedBillingId === linkedClosing.id) {
          return {
            ...os,
            financialStatus: 'PAGA' as const,
            paymentStatus: 'paid' as const
          };
        }
        return os;
      });
    }

    // Save Updates
    onSaveDatabaseUpdates({
      bankStatements: updatedStatements,
      accountsReceivable: updatedReceivables,
      billingClosings: updatedClosings,
      sales: updatedSales,
      serviceOrders: updatedServiceOrders
    }, {
      type: 'payment',
      title: 'Conciliação Bancária Confirmada',
      description: `Lançamento bancário de R$ ${selectedBankItem.amount.toFixed(2)} conciliado com o título ${rec.code} (${rec.clientName}). Vendas e fechamentos vinculados foram marcados como PAGOS.`,
      clientId: rec.clientId
    });

    setIsReconciliationModalOpen(false);
    setSelectedBankItem(null);
    setSelectedReceivableForReconciliation('');
    setSuccessMsg('Conciliação bancária de ponta a ponta realizada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // 6. CREDIT LIMIT ADJUSTMENT & BYPASS LOG
  const handleSaveCreditLimitAdjustment = () => {
    if (!clientForCreditAdjust) return;
    const newLimit = parseFloat(newCreditLimitVal);
    if (isNaN(newLimit) || newLimit < 0) {
      setErrorMsg('Informe um valor de limite de crédito válido.');
      return;
    }

    if (!creditAdjustmentReason.trim()) {
      setErrorMsg('A justificativa da alteração de crédito é obrigatória.');
      return;
    }

    const updatedClients = clients.map(c => {
      if (c.id === clientForCreditAdjust.id) {
        return {
          ...c,
          maxCreditLimit: newLimit,
          notes: `${c.notes ? c.notes + ' | ' : ''}Limite ajustado para R$ ${newLimit.toFixed(2)} por ${currentUser.name} em ${new Date().toLocaleDateString('pt-BR')}: "${creditAdjustmentReason.trim()}"`
        };
      }
      return c;
    });

    onSaveDatabaseUpdates({
      clients: updatedClients
    }, {
      type: 'user_activity',
      title: `Ajuste de Limite de Crédito (${clientForCreditAdjust.name})`,
      description: `Limite de crédito ajustado de R$ ${(clientForCreditAdjust.maxCreditLimit || 0).toFixed(2)} para R$ ${newLimit.toFixed(2)} pelo usuário ${currentUser.name}. Motivo: "${creditAdjustmentReason.trim()}".`,
      clientId: clientForCreditAdjust.id
    });

    setIsCreditBypassModalOpen(false);
    setClientForCreditAdjust(null);
    setCreditAdjustmentReason('');
    setSuccessMsg(`Limite de crédito de ${clientForCreditAdjust.name} atualizado para R$ ${newLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // KPI Calculations
  const totalPendingAmount = eligiblePendingItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalClosingsAmount = closings.filter(c => c.status !== 'CANCELADO').reduce((sum, c) => sum + c.totalAmount, 0);
  const totalClosingsPaidAmount = closings.filter(c => c.status === 'PAGO' || c.paymentStatus === 'paid').reduce((sum, c) => sum + c.totalAmount, 0);

  // Bank Statement Items Pending Reconciliation
  const bankItemsUnreconciled = useMemo(() => {
    const items: BankStatementItem[] = [];
    bankStatements.forEach(stmt => {
      stmt.items.forEach(item => {
        if (!item.reconciled && item.type === 'CREDIT') {
          items.push(item);
        }
      });
    });
    return items;
  }, [bankStatements]);

  const totalBankPendingReconciliation = bankItemsUnreconciled.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6" id="billing-reconciliation-manager">
      {/* Top Header & Quick SubTabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Faturamento Consolidado & Crédito
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            Gestão de Fechamentos, Vendas Acumuladas & Conciliação
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de ponta a ponta: Venda → Fechamento → Título → Cobrança → Pagamento → Conciliação
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-generate-closing-now-top"
            type="button"
            onClick={() => handleOpenManualClosingPreview()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Clock className="w-4 h-4" /> Gerar Fechamento Agora
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="billing-kpis">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Pendente de Faturamento</p>
            <p className="text-lg font-bold text-amber-600 font-mono">
              R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500">{eligiblePendingItems.length} vendas/OS acumuladas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Fechamentos Consolidados</p>
            <p className="text-lg font-bold text-indigo-600 font-mono">
              R$ {totalClosingsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500">{closings.length} ordens geradas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Recebido de Fechamentos</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">
              R$ {totalClosingsPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500">Títulos liquidados no banco</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Aguardando Conciliação</p>
            <p className="text-lg font-bold text-blue-600 font-mono">
              R$ {totalBankPendingReconciliation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500">{bankItemsUnreconciled.length} créditos no extrato</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="billing-success-msg" className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div id="billing-error-msg" className="p-4 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center justify-between border border-rose-200 animate-slide-up">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" id="billing-tabs-navigation">
        <button
          id="btn-subtab-closings"
          type="button"
          onClick={() => setTab('closings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            tab === 'closings'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Fechamentos Consolidados
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
            {closings.length}
          </span>
        </button>

        <button
          id="btn-subtab-pending"
          type="button"
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            tab === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" /> Vendas & OS Pendentes de Faturamento
          {eligiblePendingItems.length > 0 && (
            <span className="bg-white/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              {eligiblePendingItems.length}
            </span>
          )}
        </button>

        <button
          id="btn-subtab-reconciliation"
          type="button"
          onClick={() => setTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            tab === 'reconciliation'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" /> Conciliação Bancária (Ponta a Ponta)
          {bankItemsUnreconciled.length > 0 && (
            <span className="bg-white/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              {bankItemsUnreconciled.length}
            </span>
          )}
        </button>

        <button
          id="btn-subtab-credit-risk"
          type="button"
          onClick={() => setTab('credit_risk')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            tab === 'credit_risk'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Limites de Crédito & Risco Comercial
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3" id="billing-filter-bar">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, código..." 
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div>
          <select 
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Todos os Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select 
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Todas as Empresas</option>
            {registeredCompanies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            placeholder="Data Início"
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div>
          <input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            placeholder="Data Fim"
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: FECHAMENTOS CONSOLIDADOS */}
      {/* ========================================================= */}
      {tab === 'closings' && (
        <div className="space-y-4" id="tab-content-closings">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Histórico de Fechamentos Consolidados ({filteredClosings.length})
              </h3>
              <span className="text-xs text-slate-500">
                Uma venda só pode participar de um único fechamento ativo
              </span>
            </div>

            {filteredClosings.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold">Nenhum fechamento consolidado encontrado.</p>
                <p className="text-xs text-slate-400 mt-1">Gere um fechamento para agrupar as vendas acumuladas dos clientes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Período de Corte</th>
                      <th className="px-4 py-3">Itens / Vendas</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-right">Desconto</th>
                      <th className="px-4 py-3 text-right">Total Faturado</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClosings.map(closing => {
                      const isPaid = closing.status === 'PAGO' || closing.paymentStatus === 'paid';
                      const isCanceled = closing.status === 'CANCELADO';
                      const isFaturado = closing.status === 'FATURADO' || closing.status === 'FECHADO';

                      return (
                        <tr key={closing.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            {closing.code}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{closing.clientName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{closing.clientCpfCnpj || 'Sem documento'}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {closing.periodStart} → {closing.periodEnd}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                              {(closing.salesCount || 0) + (closing.serviceOrdersCount || 0)} itens
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            R$ {(closing.subtotal || closing.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600">
                            {closing.discountAmount ? `- R$ ${closing.discountAmount.toFixed(2)}` : 'R$ 0,00'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            R$ {closing.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {closing.dueDate}
                          </td>
                          <td className="px-4 py-3">
                            {isPaid ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> PAGO
                              </span>
                            ) : isCanceled ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <X className="w-3 h-3" /> REABERTO / CANC.
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> FATURADO
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Visualizar / Detalhes */}
                              <button
                                title="Ver Detalhamento do Fechamento e Vendas"
                                onClick={() => setSelectedClosing(closing)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Boleto Consolidado */}
                              <button
                                title="Visualizar Boleto Bancário Consolidado"
                                onClick={() => {
                                  setSelectedClosing(closing);
                                  setIsBoletoModalOpen(true);
                                }}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* Reabertura de Fechamento */}
                              {!isCanceled && (
                                <button
                                  title="Reabrir Fechamento (Estornar Título e Devolver Vendas)"
                                  onClick={() => {
                                    setSelectedClosingForReopen(closing);
                                    setIsReopenModalOpen(true);
                                  }}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
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
      )}

      {/* ========================================================= */}
      {/* TAB 2: VENDAS E OS PENDENTES DE FATURAMENTO / ACUMULADAS */}
      {/* ========================================================= */}
      {tab === 'pending' && (
        <div className="space-y-4" id="tab-content-pending">
          {/* Card de Ação Rápida por Cliente */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Clientes com Vendas Acumuladas Prontas para Faturamento
            </h3>

            {clientsWithPendingSales.length === 0 ? (
              <p className="text-xs text-slate-400">Não há clientes com saldo acumulado pendente de faturamento no momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {clientsWithPendingSales.map(({ client, items, total }) => (
                  <div key={client.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">{client.name}</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {items.length} {items.length === 1 ? 'venda' : 'vendas'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Regra: {client.billingPeriodicity || 'MENSAL'} | Vencimento: Dia {client.billingDueDayOfMonth || '10'}
                      </p>
                      <p className="text-sm font-bold text-emerald-700 font-mono mt-1.5">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenManualClosingPreview(client.id)}
                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Gerar Fechamento Agora
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de Vendas Individuais Pendentes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Vendas e OS Pendentes ({filteredPendingItems.length})
              </h3>
            </div>

            {filteredPendingItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold">Nenhuma venda pendente de faturamento encontrada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Origem</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Itens / Descrição</th>
                      <th className="px-4 py-3">Vendedor/Consultor</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3">Status Financeiro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPendingItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {item.code}
                        </td>
                        <td className="px-4 py-3">
                          {item.originType === 'SALE' ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold text-[10px]">
                              Venda Balcão
                            </span>
                          ) : (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold text-[10px]">
                              Ordem de Serviço
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {item.date}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{item.clientName}</div>
                          {item.vehiclePlate && (
                            <div className="text-[10px] text-slate-400 font-mono">{item.vehiclePlate}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={item.itemsSummary}>
                          {item.itemsSummary}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.sellerName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDENTE_FATURAMENTO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CONCILIAÇÃO BANCÁRIA DE PONTA A PONTA */}
      {/* ========================================================= */}
      {tab === 'reconciliation' && (
        <div className="space-y-4" id="tab-content-reconciliation">
          {/* Banner Explicativo do Pipeline */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-blue-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2.5 py-1 rounded-full border border-blue-400/30 inline-flex items-center gap-1.5 mb-2">
                  <Landmark className="w-3.5 h-3.5" /> Pipeline de Rastreabilidade Financeira
                </span>
                <h3 className="text-lg font-bold">Conciliação de Ponta a Ponta</h3>
                <p className="text-xs text-blue-200 mt-1">
                  <strong>Banco (Extrato)</strong> → <strong>Título Consolidado</strong> → <strong>Fechamento</strong> → <strong>Vendas Vinculadas</strong>
                </p>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-xs">
                <span className="text-blue-200">Créditos a Conciliar:</span>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  R$ {totalBankPendingReconciliation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Itens do Extrato Bancário */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                Lançamentos do Extrato Bancário (OFX / API)
              </h3>
            </div>

            {bankItemsUnreconciled.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">Todos os créditos bancários estão 100% conciliados!</p>
                <p className="text-xs text-slate-400 mt-1">Novas entradas aparecerão automaticamente com a importação de extratos OFX.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Descrição no Extrato</th>
                      <th className="px-4 py-3 text-right">Valor Creditado</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Conciliar com Título</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankItemsUnreconciled.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">{item.date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.description}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          + R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pendente Conciliação
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBankItem(item);
                              setIsReconciliationModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3 h-3" /> Conciliar Pagamento
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: GESTÃO DE LIMITE DE CRÉDITO & RISCO COMERCIAL */}
      {/* ========================================================= */}
      {tab === 'credit_risk' && (
        <div className="space-y-4" id="tab-content-credit-risk">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Painel de Limites de Crédito e Exposição por Cliente
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendas a prazo são bloqueadas automaticamente se o limite for excedido
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3 text-right">Limite de Crédito</th>
                    <th className="px-4 py-3 text-right">Crédito Utilizado</th>
                    <th className="px-4 py-3 text-right">Crédito Disponível</th>
                    <th className="px-4 py-3">Comprometimento</th>
                    <th className="px-4 py-3">Status de Risco</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map(client => {
                    const limit = client.maxCreditLimit !== undefined ? client.maxCreditLimit : 3000;
                    
                    // Calculate used credit = open receivables + pending unconsolidated sales
                    const clientOpenReceivables = receivables
                      .filter(r => r.clientId === client.id && r.status === 'pending')
                      .reduce((sum, r) => sum + r.remainingAmount, 0);

                    const clientPendingSales = eligiblePendingItems
                      .filter(i => i.clientId === client.id)
                      .reduce((sum, i) => sum + i.totalAmount, 0);

                    const usedCredit = clientOpenReceivables + clientPendingSales;
                    const availableCredit = limit - usedCredit;
                    const percentUsed = limit > 0 ? (usedCredit / limit) * 100 : (usedCredit > 0 ? 100 : 0);

                    const isExceeded = availableCredit < 0;
                    const isHighRisk = percentUsed >= 80 && !isExceeded;

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {client.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {client.cpfCnpj || client.cpf || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
                          R$ {usedCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${availableCredit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          R$ {availableCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                isExceeded ? 'bg-rose-500' : isHighRisk ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            {percentUsed.toFixed(0)}% comprometido
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isExceeded ? (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> LIMITE EXCEDIDO
                            </span>
                          ) : isHighRisk ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> ATENÇÃO (&gt;80%)
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> CRÉDITO REGULAR
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setClientForCreditAdjust(client);
                              setNewCreditLimitVal(String(limit));
                              setCreditAdjustmentReason('');
                              setIsCreditBypassModalOpen(true);
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Ajustar Limite
                          </button>
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

      {/* ========================================================= */}
      {/* MODAL 1: PRÉ-VISUALIZAÇÃO INTERATIVA DO FECHAMENTO */}
      {/* ========================================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-preview-closing">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-emerald-100">
                  Conferência Pré-Faturamento
                </span>
                <h3 className="text-lg font-bold font-display mt-1">
                  Pré-visualização do Fechamento Consolidado
                </h3>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Client & Period Header Box */}
              {(() => {
                const client = clients.find(c => c.id === selectedClientForManualClosing);
                const itemsToInclude = eligiblePendingItems.filter(i => 
                  i.clientId === selectedClientForManualClosing && selectedPendingSaleIds.has(i.id)
                );
                const subtotal = itemsToInclude.reduce((sum, i) => sum + i.totalAmount, 0);
                const discount = parseFloat(customDiscountAmount) || 0;
                const totalAmount = Math.max(0, subtotal - discount);

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Cliente</span>
                        <span className="font-bold text-slate-800 text-xs block truncate">{client?.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{client?.cpfCnpj || client?.cpf}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Quantidade de Vendas</span>
                        <span className="font-bold text-indigo-700 text-sm font-mono block">
                          {itemsToInclude.length} selecionadas
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Subtotal Bruto</span>
                        <span className="font-bold text-slate-800 text-sm font-mono block">
                          R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Total Faturado</span>
                        <span className="font-bold text-emerald-700 text-base font-mono block">
                          R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Due Date & Discount Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Data de Vencimento *</label>
                        <input 
                          type="date"
                          value={customClosingDueDate}
                          onChange={e => setCustomClosingDueDate(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 font-mono font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Desconto Comercial (R$)</label>
                        <input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={customDiscountAmount}
                          onChange={e => setCustomDiscountAmount(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Observações do Faturamento</label>
                        <input 
                          type="text"
                          value={customNotes}
                          onChange={e => setCustomNotes(e.target.value)}
                          placeholder="Instruções para o boleto..."
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Vendas que serão incorporadas */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">
                          Vendas e OS a serem incorporadas no Fechamento:
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Desmarque para adiar uma venda para o próximo ciclo
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 text-center w-10">
                                <input 
                                  type="checkbox"
                                  checked={selectedPendingSaleIds.size === eligiblePendingItems.filter(i => i.clientId === selectedClientForManualClosing).length}
                                  onChange={e => {
                                    const clientItems = eligiblePendingItems.filter(i => i.clientId === selectedClientForManualClosing);
                                    if (e.target.checked) {
                                      setSelectedPendingSaleIds(new Set(clientItems.map(i => i.id)));
                                    } else {
                                      setSelectedPendingSaleIds(new Set());
                                    }
                                  }}
                                />
                              </th>
                              <th className="px-3 py-2">Código</th>
                              <th className="px-3 py-2">Data</th>
                              <th className="px-3 py-2">Descrição</th>
                              <th className="px-3 py-2 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {eligiblePendingItems
                              .filter(i => i.clientId === selectedClientForManualClosing)
                              .map(item => {
                                const isSelected = selectedPendingSaleIds.has(item.id);
                                return (
                                  <tr key={item.id} className={isSelected ? 'bg-emerald-50/30' : 'bg-slate-50/50 text-slate-400'}>
                                    <td className="px-3 py-2 text-center">
                                      <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          const next = new Set(selectedPendingSaleIds);
                                          if (next.has(item.id)) {
                                            next.delete(item.id);
                                          } else {
                                            next.add(item.id);
                                          }
                                          setSelectedPendingSaleIds(next);
                                        }}
                                      />
                                    </td>
                                    <td className="px-3 py-2 font-mono font-bold">{item.code}</td>
                                    <td className="px-3 py-2 font-mono">{item.date}</td>
                                    <td className="px-3 py-2 truncate max-w-xs">{item.itemsSummary}</td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                                      R$ {item.totalAmount.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-generate-closing"
                onClick={handleConfirmGenerateClosing}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar e Gerar Faturamento Consolidado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: REABERTURA DE FECHAMENTO COM AUDITORIA */}
      {/* ========================================================= */}
      {isReopenModalOpen && selectedClosingForReopen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-reopen-closing">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-rose-200">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-base">Reabertura de Fechamento Consolidado</h3>
              </div>
              <button onClick={() => setIsReopenModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Ação de Controle Estrito:
                </p>
                <p>Ao reabrir o fechamento <strong>{selectedClosingForReopen.code}</strong>:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800">
                  <li>O título financeiro consolidado gerado será estornado/cancelado.</li>
                  <li>Todas as vendas vinculadas voltarão ao status <strong>PENDENTE_FATURAMENTO</strong>.</li>
                  <li>A operação será registrada na <strong>Trilha de Auditoria Imutável</strong>.</li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Justificativa Obrigatória da Reabertura * (mínimo 10 caracteres)
                </label>
                <textarea 
                  rows={3}
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="Ex: Necessidade de retificação no percentual de desconto acordado com o cliente..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-reopen-closing"
                onClick={handleConfirmReopenClosing}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" /> Confirmar Reabertura e Estorno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: BOLETO CONSOLIDADO OFICIAL FEBRABAN + PIX */}
      {/* ========================================================= */}
      {isBoletoModalOpen && selectedClosing && (() => {
        const client = clients.find(c => c.id === selectedClosing.clientId);
        const foundBoleto = boletos.find(b => b.id === selectedClosing.boletoId || b.receivableId === selectedClosing.accountReceivableId || b.receivableId === selectedClosing.receivableId);
        const consolidatedBoleto: BoletoDocument = foundBoleto || buildBoletoDocument({
          receivable: {
            id: selectedClosing.accountReceivableId || selectedClosing.receivableId || `rec-${Date.now()}`,
            code: selectedClosing.accountReceivableCode || `TIT-${selectedClosing.code}`,
            companyId: selectedClosing.companyId || currentUser.companyId || 'comp-1',
            clientId: selectedClosing.clientId,
            clientName: selectedClosing.clientName,
            clientCpf: client?.cpfCnpj || client?.cpf,
            title: `Faturamento Consolidado ${selectedClosing.code}`,
            totalAmount: selectedClosing.totalAmount,
            paidAmount: 0,
            remainingAmount: selectedClosing.totalAmount,
            dueDate: selectedClosing.dueDate,
            status: 'pending',
            paymentMethod: 'Boleto Bancário',
            installmentsCount: 1,
            installments: [],
            createdAt: selectedClosing.createdAt || selectedClosing.closingDate || new Date().toISOString().split('T')[0]
          },
          companyInfo: db.companyInfo,
          client,
          bankConfig: db.companyInfo?.bankBoletoConfig,
          pixConfig: db.companyInfo?.pixConfig,
          instructions: `Faturamento Consolidado ${selectedClosing.code} (${selectedClosing.items?.length || 0} lançamentos). Cobrar juros de 1% ao mês após vencimento.`
        });

        return (
          <BoletoPrintModal
            isOpen={isBoletoModalOpen}
            onClose={() => setIsBoletoModalOpen(false)}
            boleto={consolidatedBoleto}
            companyInfo={db.companyInfo}
            bankConfig={db.companyInfo?.bankBoletoConfig}
            pixConfig={db.companyInfo?.pixConfig}
          />
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL 4: CONCILIAÇÃO BANCÁRIA COM TÍTULO */}
      {/* ========================================================= */}
      {isReconciliationModalOpen && selectedBankItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-reconcile-item">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-blue-200">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                <h3 className="font-bold text-base">Conciliar Lançamento Bancário</h3>
              </div>
              <button onClick={() => setIsReconciliationModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs space-y-1">
                <span className="text-[10px] text-blue-600 font-bold uppercase">Lançamento Identificado</span>
                <p className="font-bold text-slate-800">{selectedBankItem.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-slate-600">Data: {selectedBankItem.date}</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    R$ {selectedBankItem.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Vincular ao Título a Receber / Fechamento Consolidado *
                </label>
                <select
                  value={selectedReceivableForReconciliation}
                  onChange={e => setSelectedReceivableForReconciliation(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 font-semibold"
                  required
                >
                  <option value="">-- Selecione o Título Correspondente --</option>
                  {receivables.filter(r => r.status === 'pending').map(r => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.clientName} (R$ {r.remainingAmount.toFixed(2)} - Venc: {r.dueDate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsReconciliationModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReconcileBankItem}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar Conciliação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: AJUSTE E LIBERAÇÃO DE LIMITE DE CRÉDITO */}
      {/* ========================================================= */}
      {isCreditBypassModalOpen && clientForCreditAdjust && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-adjust-credit-limit">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-indigo-200">
            <div className="p-5 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-base">Ajuste Gerencial de Limite de Crédito</h3>
              </div>
              <button onClick={() => setIsCreditBypassModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-800 text-sm block">{clientForCreditAdjust.name}</span>
                <span className="text-[11px] text-slate-500 font-mono block">Doc: {clientForCreditAdjust.cpfCnpj || clientForCreditAdjust.cpf}</span>
                <span className="text-[11px] text-slate-600 block pt-1">
                  Limite Atual: <strong>R$ {(clientForCreditAdjust.maxCreditLimit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Novo Limite de Crédito Aprovado (R$) *
                </label>
                <input 
                  type="number"
                  step="100"
                  min="0"
                  value={newCreditLimitVal}
                  onChange={e => setNewCreditLimitVal(e.target.value)}
                  className="w-full text-sm font-mono font-bold p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Justificativa da Alteração / Parecer de Crédito *
                </label>
                <textarea 
                  rows={3}
                  value={creditAdjustmentReason}
                  onChange={e => setCreditAdjustmentReason(e.target.value)}
                  placeholder="Ex: Análise de balanço e histórico positivo de pontualidade..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCreditBypassModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCreditLimitAdjustment}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4" /> Salvar Novo Limite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
