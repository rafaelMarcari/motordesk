import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  UserCheck,
  CreditCard,
  DollarSign,
  QrCode,
  FileText,
  Filter,
  PackageCheck,
  Building2,
  ArrowRight,
  RefreshCw,
  Ban,
  Truck,
  ShieldCheck,
  X
} from 'lucide-react';
import { AppDatabase } from '../data/mockData';
import {
  CommercialSale,
  CommercialSaleItem,
  Client,
  Part,
  CompanyInfo,
  User,
  FiscalDocument,
  Carrier,
  FreightType,
  ShippingOperation,
  SefazApiConfig,
  GoodsWithdrawalOrder,
  GoodsWithdrawalItem,
  GoodsWithdrawalHistoryEvent
} from '../types';
import ShareDocumentModal from './ShareDocumentModal';
import FiscalConferenceModal from './FiscalConferenceModal';
import { FiscalEmissionResult } from '../services/fiscalProvider';

interface SalesViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  currentUser: User;
  currentCompany: CompanyInfo;
  isFiscalEnabled?: boolean;
  onSaveCompanyInfo?: (company: CompanyInfo) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  db,
  onUpdateDb,
  currentUser,
  currentCompany,
  isFiscalEnabled = true,
  onSaveCompanyInfo
}) => {
  const [activeTab, setActiveTab] = useState<'nova_venda' | 'historico'>('nova_venda');

  // New Sale State
  const [selectedClientId, setSelectedClientId] = useState<string>('walk-in');
  const [customClientName, setCustomClientName] = useState<string>('');
  const [customClientCpf, setCustomClientCpf] = useState<string>('');
  const [partSearchTerm, setPartSearchTerm] = useState<string>('');
  const [cart, setCart] = useState<CommercialSaleItem[]>([]);
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [installments, setInstallments] = useState<number>(1);
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [autoEmitFiscal, setAutoEmitFiscal] = useState<boolean>(true);

  // Logistics & Freight State
  const [freightType, setFreightType] = useState<FreightType>('NONE');
  const [carrierId, setCarrierId] = useState<string>('');
  const [freightValue, setFreightValue] = useState<number>(0);
  const [shippingOperation, setShippingOperation] = useState<ShippingOperation>('direct');
  const [logisticsHub, setLogisticsHub] = useState<string>('');
  const [redispersionCarrierId, setRedispersionCarrierId] = useState<string>('');

  // History Filter State
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatus, setHistoryStatus] = useState<string>('all');

  // Receipt Modal State
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<CommercialSale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Fiscal Conference & Emission Modal State (Phase 2)
  const [selectedSaleForFiscal, setSelectedSaleForFiscal] = useState<CommercialSale | null>(null);
  const [showFiscalModal, setShowFiscalModal] = useState<boolean>(false);
  const [showFiscalChoiceModal, setShowFiscalChoiceModal] = useState<boolean>(false);
  const [lastFinalizedSale, setLastFinalizedSale] = useState<CommercialSale | null>(null);

  // Success Notification Banner / Modal
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

  // Filter Parts available in active company
  const availableParts = useMemo(() => {
    return db.parts.filter(p => !p.companyId || p.companyId === currentCompany.id);
  }, [db.parts, currentCompany.id]);

  const filteredParts = useMemo(() => {
    if (!partSearchTerm.trim()) return availableParts;
    const term = partSearchTerm.toLowerCase();
    return availableParts.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        (p.code && p.code.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
  }, [availableParts, partSearchTerm]);

  // Clients
  const availableClients = useMemo(() => {
    return db.clients.filter(c => !c.companyId || c.companyId === currentCompany.id);
  }, [db.clients, currentCompany.id]);

  // Carriers
  const availableCarriers = useMemo(() => {
    return (db.carriers || []).filter(c => (!c.companyId || c.companyId === currentCompany.id) && c.status === 'active');
  }, [db.carriers, currentCompany.id]);

  // Sales for Current Company (with seller permission restriction support)
  const isRestrictedToOwnSales = Boolean(currentUser.permissions?.restrictToOwnSales);

  const companySales = useMemo(() => {
    const allCompanySales = (db.sales || []).filter(s => s.companyId === currentCompany.id);
    if (!isRestrictedToOwnSales) {
      return allCompanySales;
    }
    const currentName = (currentUser.name || '').trim().toLowerCase();
    const currentUsername = (currentUser.username || '').trim().toLowerCase();
    return allCompanySales.filter(s => {
      if (!s.createdBy) return false;
      const createdByLower = s.createdBy.toLowerCase();
      return (
        (currentName && createdByLower.includes(currentName)) ||
        (currentUsername && createdByLower.includes(currentUsername))
      );
    });
  }, [db.sales, currentCompany.id, isRestrictedToOwnSales, currentUser.name, currentUser.username]);

  const filteredHistory = useMemo(() => {
    return companySales.filter(sale => {
      const matchesSearch =
        sale.code.toLowerCase().includes(historySearch.toLowerCase()) ||
        sale.clientName.toLowerCase().includes(historySearch.toLowerCase());
      const matchesStatus = historyStatus === 'all' || sale.paymentStatus === historyStatus;
      return matchesSearch && matchesStatus;
    });
  }, [companySales, historySearch, historyStatus]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const cartTotalAmount = useMemo(() => {
    const freight = (freightType === 'CIF' || freightType === 'FOB') ? (freightValue || 0) : 0;
    const total = cartSubtotal - saleDiscount + freight;
    return total > 0 ? total : 0;
  }, [cartSubtotal, saleDiscount, freightType, freightValue]);

  // Add Item to Cart
  const handleAddToCart = (part: Part) => {
    const availableStock = Math.max(0, part.stock - (part.reservedStock || 0));
    if (availableStock <= 0) {
      alert(`O produto "${part.name}" não possui saldo disponível em estoque (Físico: ${part.stock}, Reservado: ${part.reservedStock || 0})!`);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.partId === part.id);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + 1;
        if (newQty > availableStock) {
          alert(`Quantidade solicitada (${newQty}) excede o estoque disponível livre (${availableStock} un).`);
          return prev;
        }
        const updated = [...prev];
        const unitPrice = existing.unitPrice;
        const discount = existing.discount;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          totalPrice: (unitPrice - discount) * newQty
        };
        return updated;
      } else {
        const itemDiscount = 0;
        return [
          ...prev,
          {
            id: 'sitem-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            partId: part.id,
            partName: part.name,
            partCode: part.code || 'PRD-' + part.id,
            quantity: 1,
            unitPrice: part.price,
            discount: itemDiscount,
            totalPrice: part.price - itemDiscount,
            unit: part.unit || 'UN',
            ncm: '8708.99.90'
          }
        ];
      }
    });
  };

  // Update Cart Item Quantity or Discount
  const handleUpdateCartItem = (itemId: string, field: 'quantity' | 'discount' | 'unitPrice', value: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;

        const partObj = db.parts.find(p => p.id === item.partId);
        const availableStock = partObj ? Math.max(0, partObj.stock - (partObj.reservedStock || 0)) : 9999;
        let newQty = field === 'quantity' ? Math.max(1, value) : item.quantity;

        if (field === 'quantity' && partObj && newQty > availableStock) {
          alert(`Quantidade máxima disponível para venda (livre de reservas): ${availableStock}`);
          newQty = Math.max(1, availableStock);
        }

        const newUnitPrice = field === 'unitPrice' ? Math.max(0, value) : item.unitPrice;
        const newDiscount = field === 'discount' ? Math.max(0, value) : item.discount;
        const lineTotal = Math.max(0, (newUnitPrice - newDiscount) * newQty);

        return {
          ...item,
          quantity: newQty,
          unitPrice: newUnitPrice,
          discount: newDiscount,
          totalPrice: lineTotal
        };
      })
    );
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Trigger Sale Finalization
  const handleFinalizeSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('O carrinho de compras está vazio. Adicione produtos para prosseguir.');
      return;
    }

    executeFinalizeSale();
  };

  // Execute Sale Creation & Database persistence (Atomic single execution)
  const executeFinalizeSale = () => {
    let clientName = 'Consumidor Final (Balcão)';
    let clientCpfCnpj = '';
    let resolvedClientId = 'walk-in';
    const selectedClientObj = selectedClientId !== 'walk-in' ? availableClients.find(c => c.id === selectedClientId) : undefined;

    if (selectedClientId !== 'walk-in') {
      if (selectedClientObj) {
        resolvedClientId = selectedClientObj.id;
        clientName = selectedClientObj.name;
        clientCpfCnpj = selectedClientObj.cpf || selectedClientObj.cpfCnpj || '';
      }
    } else {
      if (customClientName.trim()) clientName = customClientName.trim();
      if (customClientCpf.trim()) clientCpfCnpj = customClientCpf.trim();
    }

    const saleCode = `VEN-${new Date().getFullYear()}-${String((db.sales?.length || 0) + 1).padStart(4, '0')}`;
    const saleId = 'sale-' + Date.now();
    const nowIso = new Date().toISOString();

    const selectedCarrierObj = availableCarriers.find(c => c.id === carrierId);
    const selectedRedispersionCarrierObj = availableCarriers.find(c => c.id === redispersionCarrierId);

    const isCreditOrBoleto = paymentMethod === 'A Prazo' || paymentMethod === 'Boleto' || paymentMethod === 'Crediário';

    const newSale: CommercialSale = {
      id: saleId,
      code: saleCode,
      clientId: resolvedClientId,
      clientName,
      clientCpfCnpj,
      companyId: currentCompany.id,
      createdAt: nowIso,
      items: cart,
      subtotal: cartSubtotal,
      discount: saleDiscount,
      totalAmount: cartTotalAmount,
      paymentMethod,
      paymentStatus: isCreditOrBoleto ? 'pending' : 'paid',
      fiscalStatus: 'pending_conference',
      installmentsCount: installments,
      notes: saleNotes,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      freightType,
      carrierId: carrierId || undefined,
      carrierName: selectedCarrierObj ? (selectedCarrierObj.corporateName || selectedCarrierObj.tradeName) : undefined,
      freightValue: freightValue > 0 ? freightValue : undefined,
      shippingOperation: freightType !== 'NONE' ? shippingOperation : undefined,
      logisticsHub: (freightType !== 'NONE' && shippingOperation === 'redespacho') ? logisticsHub : undefined,
      redispersionCarrierId: (freightType !== 'NONE' && shippingOperation === 'redespacho') ? redispersionCarrierId : undefined,
      redispersionCarrierName: (freightType !== 'NONE' && shippingOperation === 'redespacho' && selectedRedispersionCarrierObj)
        ? (selectedRedispersionCarrierObj.corporateName || selectedRedispersionCarrierObj.tradeName)
        : undefined
    };

    // Criar Título de Contas a Receber Integrado
    const receivableId = 'cr-' + Date.now();
    const installmentValue = cartTotalAmount / Math.max(1, installments);
    const generatedInstallments = Array.from({ length: Math.max(1, installments) }, (_, idx) => {
      const dueD = new Date(Date.now() + (idx + 1) * 30 * 86400000).toISOString().split('T')[0];
      return {
        id: `inst-${Date.now()}-${idx + 1}`,
        installmentNumber: idx + 1,
        totalInstallments: Math.max(1, installments),
        amount: installmentValue,
        paidAmount: isCreditOrBoleto ? 0 : installmentValue,
        dueDate: dueD,
        status: (isCreditOrBoleto ? 'pending' : 'paid') as 'pending' | 'paid',
        paymentMethod,
        paymentDate: isCreditOrBoleto ? undefined : nowIso.split('T')[0]
      };
    });

    const newReceivable: any = {
      id: receivableId,
      code: `CR-${saleCode}`,
      saleId,
      saleCode,
      clientId: resolvedClientId,
      clientName,
      clientCpf: clientCpfCnpj,
      companyId: currentCompany.id,
      title: `Venda Comercial #${saleCode} - ${clientName}`,
      totalAmount: cartTotalAmount,
      paidAmount: isCreditOrBoleto ? 0 : cartTotalAmount,
      remainingAmount: isCreditOrBoleto ? cartTotalAmount : 0,
      status: (isCreditOrBoleto ? 'pending' : 'paid') as any,
      paymentMethod,
      installmentsCount: installments,
      dueDate: generatedInstallments[0]?.dueDate || nowIso.split('T')[0],
      createdAt: nowIso,
      installments: generatedInstallments,
      nfeStatus: 'pending',
      notes: `Gerado automaticamente pela Venda #${saleCode}`
    };

    newSale.receivableId = receivableId;

    // Criar Ordem de Retirada / Expedição (GoodsWithdrawalOrder com Romaneio)
    const withdrawalId = 'gwo-' + Date.now();
    const withdrawalCode = `RET-${saleCode}`;
    const withdrawalItems: GoodsWithdrawalItem[] = cart.map(ci => {
      const partObj = db.parts.find(p => p.id === ci.partId);
      return {
        id: 'gwi-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        partId: ci.partId,
        partCode: ci.partCode,
        partName: ci.partName,
        location: partObj?.location || 'Estoque Geral',
        unit: ci.unit || partObj?.unit || 'UN',
        quantitySold: ci.quantity,
        quantityReserved: ci.quantity,
        quantitySeparated: 0,
        quantityReleased: 0,
        quantityWithdrawn: 0,
        quantityForDelivery: freightType !== 'NONE' ? ci.quantity : 0,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        isConferred: false
      };
    });

    const newWithdrawalOrder: GoodsWithdrawalOrder = {
      id: withdrawalId,
      code: withdrawalCode,
      saleId,
      saleCode: String(saleCode),
      clientId: resolvedClientId,
      clientName,
      clientDocument: clientCpfCnpj,
      clientPhone: selectedClientObj?.phone,
      shippingAddress: (freightType !== 'NONE' && selectedClientObj?.address) ? `${selectedClientObj.address}` : undefined,
      companyId: currentCompany.id,
      type: freightType === 'NONE' ? 'BALCAO' : 'ENTREGA',
      status: 'AGUARDANDO_SEPARACAO',
      carrierId: freightType !== 'NONE' ? carrierId : undefined,
      carrierName: (freightType !== 'NONE' && selectedCarrierObj) ? (selectedCarrierObj.corporateName || selectedCarrierObj.tradeName) : undefined,
      items: withdrawalItems,
      history: [
        {
          id: 'gwh-' + Date.now(),
          status: 'AGUARDANDO_SEPARACAO',
          action: 'Venda Concluída',
          timestamp: nowIso,
          userId: currentUser.id,
          userName: currentUser.name,
          description: `Pedido de expedição gerado automaticamente pela Venda #${saleCode}. Itens reservados no estoque.`
        }
      ],
      notes: saleNotes || undefined,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    onUpdateDb(prev => {
      // 1. Reservar Estoque (NÃO baixar fisicamente no momento da venda)
      const updatedParts = prev.parts.map(p => {
        const cartItem = cart.find(ci => ci.partId === p.id);
        if (cartItem) {
          const currentReserved = p.reservedStock || 0;
          return {
            ...p,
            reservedStock: currentReserved + cartItem.quantity
          };
        }
        return p;
      });

      // 2. Record Financial Transaction (Receita / Caixa se não for a prazo)
      const newFinancialTx = {
        id: 'ft-' + Date.now(),
        type: 'income' as const,
        category: 'Venda de Produtos / Peças',
        description: `Venda Balcão #${saleCode} - ${clientName}`,
        amount: cartTotalAmount,
        date: nowIso,
        paymentMethod,
        referenceId: saleId,
        clientId: resolvedClientId !== 'walk-in' ? resolvedClientId : undefined,
        createdByName: currentUser.name,
        companyId: currentCompany.id
      };

      const existingSales = prev.sales || [];
      const existingFinancials = prev.financialTransactions || [];
      const existingReceivables = prev.accountsReceivable || [];
      const existingWithdrawals = prev.goodsWithdrawals || [];

      return {
        ...prev,
        parts: updatedParts,
        sales: [newSale, ...existingSales],
        accountsReceivable: [newReceivable, ...existingReceivables],
        goodsWithdrawals: [newWithdrawalOrder, ...existingWithdrawals],
        financialTransactions: isCreditOrBoleto ? existingFinancials : [newFinancialTx, ...existingFinancials]
      };
    });

    // Save newly created sale reference
    setLastFinalizedSale(newSale);

    // Reset Form
    setCart([]);
    setSaleDiscount(0);
    setSaleNotes('');
    setSelectedClientId('walk-in');
    setCustomClientName('');
    setCustomClientCpf('');
    setFreightType('NONE');
    setCarrierId('');
    setFreightValue(0);
    setShippingOperation('direct');
    setLogisticsHub('');
    setRedispersionCarrierId('');

    // Open Fiscal Post-Sale Decision Modal if fiscal enabled
    if (isFiscalEnabled) {
      setShowFiscalChoiceModal(true);
    } else {
      setSelectedSaleForReceipt(newSale);
      setShowReceiptModal(true);
      setSaleSuccessMessage(`Venda #${saleCode} finalizada com sucesso!`);
    }
  };

  // Post-Sale Fiscal Actions
  const handleChoiceEmitNow = () => {
    if (!lastFinalizedSale) return;
    setShowFiscalChoiceModal(false);

    // Atualiza status fiscal para ready_for_emission
    onUpdateDb(prev => ({
      ...prev,
      sales: (prev.sales || []).map(s => {
        if (s.id === lastFinalizedSale.id) {
          return { ...s, fiscalStatus: 'ready_for_emission' as const };
        }
        return s;
      })
    }));

    setSelectedSaleForFiscal({ ...lastFinalizedSale, fiscalStatus: 'ready_for_emission' });
    setShowFiscalModal(true);
    setSaleSuccessMessage(`Venda #${lastFinalizedSale.code} criada! Abrindo tela de conferência fiscal...`);
  };

  const handleChoiceSendToConference = () => {
    if (!lastFinalizedSale) return;
    setShowFiscalChoiceModal(false);

    onUpdateDb(prev => ({
      ...prev,
      sales: (prev.sales || []).map(s => {
        if (s.id === lastFinalizedSale.id) {
          return { ...s, fiscalStatus: 'pending_conference' as const };
        }
        return s;
      })
    }));

    setSaleSuccessMessage(`✅ Venda #${lastFinalizedSale.code} finalizada com sucesso e enviada para a Fila de Conferência Fiscal.`);
  };

  const handleChoiceEmitLater = () => {
    if (!lastFinalizedSale) return;
    setShowFiscalChoiceModal(false);

    onUpdateDb(prev => ({
      ...prev,
      sales: (prev.sales || []).map(s => {
        if (s.id === lastFinalizedSale.id) {
          return { ...s, fiscalStatus: 'emit_later' as const };
        }
        return s;
      })
    }));

    setSelectedSaleForReceipt(lastFinalizedSale);
    setShowReceiptModal(true);
    setSaleSuccessMessage(`✅ Venda #${lastFinalizedSale.code} finalizada! A Nota Fiscal foi registrada como "Emitir Depois" para emissão posterior.`);
  };

  // Cancel Sale
  const handleCancelSale = (sale: CommercialSale) => {
    if (sale.paymentStatus === 'canceled') return;

    if (
      !window.confirm(
        `Tem certeza que deseja CANCELAR a Venda #${sale.code}? O estoque dos produtos será reeditado e devolvido automaticamente.`
      )
    ) {
      return;
    }

    onUpdateDb(prev => {
      const withdrawalOrder = (prev.goodsWithdrawals || []).find(w => w.saleId === sale.id);
      const isAlreadyPhysicallyDeducted = withdrawalOrder && (withdrawalOrder.status === 'RETIRADO' || withdrawalOrder.status === 'ENTREGUE');

      // Restore stock (either reserved or physical)
      const updatedParts = prev.parts.map(p => {
        const item = sale.items.find(i => i.partId === p.id);
        if (item) {
          if (isAlreadyPhysicallyDeducted) {
            return { ...p, stock: p.stock + item.quantity };
          } else {
            return { ...p, reservedStock: Math.max(0, (p.reservedStock || 0) - item.quantity) };
          }
        }
        return p;
      });

      // Update sale status
      const updatedSales = (prev.sales || []).map(s => {
        if (s.id === sale.id) {
          return { ...s, paymentStatus: 'canceled' as const };
        }
        return s;
      });

      // Update withdrawal status if exists
      const updatedWithdrawals = (prev.goodsWithdrawals || []).map(w => {
        if (w.saleId === sale.id) {
          return {
            ...w,
            status: 'CANCELADO' as const,
            updatedAt: new Date().toISOString(),
            history: [
              ...w.history,
              {
                id: 'gwh-' + Date.now(),
                status: 'CANCELADO' as const,
                action: 'Venda Cancelada',
                timestamp: new Date().toISOString(),
                userId: currentUser.id,
                userName: currentUser.name,
                description: 'Venda vinculada foi cancelada. Reserva de estoque liberada.'
              }
            ]
          };
        }
        return w;
      });

      // Stock movement record only if physical stock was restored
      const restoreMovements = isAlreadyPhysicallyDeducted ? sale.items.map(item => ({
        id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        partId: item.partId,
        partName: item.partName,
        partCode: item.partCode || 'PRD-' + item.partId,
        type: 'in' as const,
        quantity: item.quantity,
        date: new Date().toISOString(),
        reason: 'adjustment' as const,
        description: `Devolução por Cancelamento de Venda #${sale.code}`,
        userName: currentUser.name,
        companyId: currentCompany.id
      })) : [];

      return {
        ...prev,
        parts: updatedParts,
        sales: updatedSales,
        goodsWithdrawals: updatedWithdrawals,
        stockMovements: [...restoreMovements, ...(prev.stockMovements || [])]
      };
    });
  };

  // Print Receipt HTML
  const handlePrintReceiptWindow = (sale: CommercialSale) => {
    try {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Comprovante de Venda #${sale.code}</title>
            <style>
              body { font-family: monospace, sans-serif; padding: 20px; color: #1e293b; max-width: 400px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #0f172a; padding-bottom: 12px; margin-bottom: 12px; }
              .title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
              .sub { font-size: 11px; color: #475569; margin-top: 4px; }
              .info { font-size: 11px; margin-bottom: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
              th, td { text-align: left; padding: 4px 0; }
              th { border-bottom: 1px solid #0f172a; }
              .num { text-align: right; }
              .total-box { border-top: 2px dashed #0f172a; padding-top: 8px; font-size: 12px; font-weight: bold; }
              .footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${currentCompany.name}</div>
              <div class="sub">CNPJ: ${currentCompany.cnpj}</div>
              <div class="sub">${currentCompany.address}</div>
              <div class="sub">Tel/WhatsApp: ${currentCompany.whatsapp || currentCompany.phone}</div>
            </div>

            <div class="info">
              <div><strong>COMPROVANTE DE VENDA DE MERCADORIAS</strong></div>
              <div>Código: <strong>#${sale.code}</strong></div>
              <div>Data/Hora: ${new Date(sale.createdAt).toLocaleString('pt-BR')}</div>
              <div>Cliente: ${sale.clientName}</div>
              ${sale.clientCpfCnpj ? `<div>CPF/CNPJ: ${sale.clientCpfCnpj}</div>` : ''}
              <div>Vendedor: ${sale.createdBy}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Qtd/Item</th>
                  <th class="num">Unit (R$)</th>
                  <th class="num">Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${sale.items
                  .map(
                    item => `
                  <tr>
                    <td colspan="3"><strong>${item.partCode ? `[${item.partCode}] ` : ''}${item.partName}</strong></td>
                  </tr>
                  <tr>
                    <td>${item.quantity} ${item.unit || 'UN'}</td>
                    <td class="num">${item.unitPrice.toFixed(2)}</td>
                    <td class="num">${item.totalPrice.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <div class="total-box">
              <div style="display: flex; justify-content: space-between;">
                <span>Subtotal:</span>
                <span>R$ ${sale.subtotal.toFixed(2)}</span>
              </div>
              ${
                sale.discount > 0
                  ? `
                <div style="display: flex; justify-content: space-between; color: #dc2626;">
                  <span>Desconto:</span>
                  <span>- R$ ${sale.discount.toFixed(2)}</span>
                </div>
              `
                  : ''
              }
              ${
                sale.freightType && sale.freightType !== 'NONE'
                  ? `
                <div style="display: flex; justify-content: space-between; color: #2563eb;">
                  <span>Frete (${sale.freightType}):</span>
                  <span>${sale.freightValue ? `R$ ${sale.freightValue.toFixed(2)}` : 'Incluso'}</span>
                </div>
                ${sale.carrierName ? `<div style="font-size: 10px; font-weight: normal; color: #475569;">Transportadora: ${sale.carrierName}</div>` : ''}
                ${sale.shippingOperation === 'redespacho' ? `<div style="font-size: 9px; font-weight: normal; color: #475569;">Redespacho: ${sale.redispersionCarrierName || 'Sim'} (Hub: ${sale.logisticsHub || 'N/A'})</div>` : ''}
              `
                  : ''
              }
              <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 4px;">
                <span>TOTAL PAGO:</span>
                <span>R$ ${sale.totalAmount.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; font-weight: normal;">
                <span>Forma de Pagamento:</span>
                <span>${sale.paymentMethod} ${sale.installmentsCount && sale.installmentsCount > 1 ? `(${sale.installmentsCount}x)` : ''}</span>
              </div>
              ${
                sale.fiscalAccessKey
                  ? `
                <div style="margin-top: 8px; font-size: 10px; font-weight: normal; word-break: break-all;">
                  <strong>NFC-e Emitida:</strong><br/>
                  ${sale.fiscalAccessKey}
                </div>
              `
                  : ''
              }
            </div>

            <div class="footer">
              Obrigado pela preferência!<br/>
              Sistema de Gestão Comercial MotorDesk
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 300);
              }
            </script>
          </body>
          </html>
        `);
        printWin.document.close();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="sales-module-container">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
                Vendas & Frente de Caixa
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Balcão / Direct Sale
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Venda direta de produtos e peças com baixa automática no estoque, caixa e emissão fiscal.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('nova_venda')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'nova_venda'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            Nova Venda (Caixa)
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'historico'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Histórico ({companySales.length})
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {saleSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-medium animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saleSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaleSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* TAB 1: NOVA VENDA */}
      {activeTab === 'nova_venda' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Catalog Search */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  Catálogo de Produtos em Estoque
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {availableParts.length} produtos disponíveis
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar peça por nome, código SKU ou marca..."
                  value={partSearchTerm}
                  onChange={e => setPartSearchTerm(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Parts Table */}
              <div className="max-h-[500px] overflow-y-auto border border-slate-100 rounded-xl">
                {filteredParts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum produto localizado para "{partSearchTerm}".
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="p-3">Código/Peça</th>
                        <th className="p-3">Estoque</th>
                        <th className="p-3 text-right">Preço Unit.</th>
                        <th className="p-3 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredParts.map(part => {
                        const inCartQty = cart.find(ci => ci.partId === part.id)?.quantity || 0;
                        const isOut = part.stock <= 0;
                        return (
                          <tr key={part.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{part.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>SKU: {part.code}</span>
                                {part.category && <span>• Categoria: {part.category}</span>}
                              </div>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  isOut
                                    ? 'bg-red-100 text-red-700'
                                    : part.stock <= (part.minStock || 2)
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {part.stock} {part.unit || 'UN'}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              R$ {part.price.toFixed(2)}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleAddToCart(part)}
                                disabled={isOut}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto transition-all ${
                                  isOut
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : inCartQty > 0
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                {inCartQty > 0 ? `Adicionado (${inCartQty})` : 'Adicionar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Cart & Form */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleFinalizeSale} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  Carrinho de Compras ({cart.length} itens)
                </h2>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar
                  </button>
                )}
              </div>

              {/* Cart Items Table */}
              {cart.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Seu carrinho de vendas está vazio.</p>
                  <p className="text-[11px] text-slate-400">
                    Selecione produtos no catálogo ao lado para adicionar ao pedido.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-800">{item.partName}</div>
                          <div className="text-[10px] text-slate-400">SKU: {item.partCode}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Remover Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center pt-1 border-t border-slate-200/50">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold uppercase block">Qtd</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateCartItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full text-xs p-1 border border-slate-200 rounded-md bg-white font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold uppercase block">Preço Unit</label>
                          <div className="text-xs font-semibold text-slate-700 py-1">
                            R$ {item.unitPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <label className="text-[10px] text-slate-500 font-semibold uppercase block">Subtotal</label>
                          <div className="text-xs font-bold text-emerald-700 py-1">
                            R$ {item.totalPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Client Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Identificação do Cliente
                </label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white font-medium"
                >
                  <option value="walk-in">Consumidor Final (Venda sem Cadastro)</option>
                  {availableClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.cpf || c.cpfCnpj ? `(${c.cpf || c.cpfCnpj})` : ''}
                    </option>
                  ))}
                </select>

                {selectedClientId === 'walk-in' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Nome do Cliente (Opcional)"
                      value={customClientName}
                      onChange={e => setCustomClientName(e.target.value)}
                      className="text-xs p-2 border border-slate-200 rounded-lg bg-slate-50/50"
                    />
                    <input
                      type="text"
                      placeholder="CPF / CNPJ na Nota (Opcional)"
                      value={customClientCpf}
                      onChange={e => setCustomClientCpf(e.target.value)}
                      className="text-xs p-2 border border-slate-200 rounded-lg bg-slate-50/50"
                    />
                  </div>
                )}
              </div>

              {/* Transporte, Logística & Frete */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    Transporte & Logística
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">opcional</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Tipo de Frete</label>
                    <select
                      value={freightType}
                      onChange={e => setFreightType(e.target.value as FreightType)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-medium"
                    >
                      <option value="NONE">Sem Frete (Retirada Balcão)</option>
                      <option value="CIF">CIF (Frete por Conta do Emitente / Loja)</option>
                      <option value="FOB">FOB (Frete por Conta do Destinatário / Cliente)</option>
                      <option value="THIRD_PARTY">Terceiros (Conta de Terceiros)</option>
                    </select>
                  </div>

                  {freightType !== 'NONE' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">Valor do Frete (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={freightValue || ''}
                        onChange={e => setFreightValue(parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-medium font-mono"
                      />
                    </div>
                  )}
                </div>

                {freightType !== 'NONE' && (
                  <div className="space-y-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100 animate-fade-in">
                    <div>
                      <label className="text-[10px] text-slate-600 font-bold block mb-1">Transportadora Principal</label>
                      <select
                        value={carrierId}
                        onChange={e => setCarrierId(e.target.value)}
                        className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white font-medium"
                      >
                        <option value="">Selecione uma transportadora cadastrada...</option>
                        {availableCarriers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.corporateName} {c.tradeName ? `(${c.tradeName})` : ''} - {c.city}/{c.state}
                          </option>
                        ))}
                      </select>
                      {availableCarriers.length === 0 && (
                        <p className="text-[10px] text-amber-600 mt-1">
                          Nenhuma transportadora cadastrada no menu lateral "Transportadoras".
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-600 font-bold block mb-1">Operação Logística</label>
                        <select
                          value={shippingOperation}
                          onChange={e => setShippingOperation(e.target.value as ShippingOperation)}
                          className="w-full text-xs p-1.5 border border-blue-200 rounded-lg bg-white font-medium"
                        >
                          <option value="direct">Transporte Normal / Direto</option>
                          <option value="redespacho">Redespacho (Troca de Transportadora)</option>
                        </select>
                      </div>

                      {shippingOperation === 'redespacho' && (
                        <div>
                          <label className="text-[10px] text-slate-600 font-bold block mb-1">Ponto / Hub Logístico</label>
                          <input
                            type="text"
                            placeholder="Ex: CD São Paulo / Hub Barueri"
                            value={logisticsHub}
                            onChange={e => setLogisticsHub(e.target.value)}
                            className="w-full text-xs p-1.5 border border-blue-200 rounded-lg bg-white"
                          />
                        </div>
                      )}
                    </div>

                    {shippingOperation === 'redespacho' && (
                      <div className="pt-1">
                        <label className="text-[10px] text-slate-600 font-bold block mb-1">Transportadora de Redespacho</label>
                        <select
                          value={redispersionCarrierId}
                          onChange={e => setRedispersionCarrierId(e.target.value)}
                          className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white font-medium"
                        >
                          <option value="">Selecione a transportadora de redespacho...</option>
                          {availableCarriers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.corporateName} {c.tradeName ? `(${c.tradeName})` : ''} - {c.city}/{c.state}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  Pagamento & Desconto
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Forma de Pagamento</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-medium"
                    >
                      <option value="PIX">PIX (Instantâneo)</option>
                      <option value="Dinheiro">Dinheiro (Espécie)</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Boleto">Boleto Bancário</option>
                      <option value="A Prazo">A Prazo / Fiado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Desconto Global (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={saleDiscount || ''}
                      onChange={e => setSaleDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-medium"
                    />
                  </div>
                </div>

                {paymentMethod === 'Cartão de Crédito' && (
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Parcelamento</label>
                    <select
                      value={installments}
                      onChange={e => setInstallments(parseInt(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-medium"
                    >
                      {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                        <option key={n} value={n}>
                          {n}x de R$ {(cartTotalAmount / n).toFixed(2)} {n === 1 ? '(À Vista)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Fiscal Auto Emit Toggle */}
                {isFiscalEnabled && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700">Emitir NFC-e Automaticamente</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoEmitFiscal}
                      onChange={e => setAutoEmitFiscal(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300"
                    />
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal dos Itens:</span>
                  <span>R$ {cartSubtotal.toFixed(2)}</span>
                </div>
                {saleDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Desconto Aplicado:</span>
                    <span>- R$ {saleDiscount.toFixed(2)}</span>
                  </div>
                )}
                {freightType !== 'NONE' && freightValue > 0 && (
                  <div className="flex justify-between text-xs text-blue-400">
                    <span>Frete ({freightType}):</span>
                    <span>+ R$ {freightValue.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-800">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-emerald-400 font-display">R$ {cartTotalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Finalize Button */}
              <button
                type="submit"
                disabled={cart.length === 0}
                className={`w-full py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                  cart.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalizar Venda & Emitir Comprovante
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: HISTÓRICO DE VENDAS */}
      {activeTab === 'historico' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Histórico de Vendas Comercial ({filteredHistory.length})
              </h2>
              {isRestrictedToOwnSales ? (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-3xs" title="Restrição ativa no perfil do operador">
                  🔒 Somente Meus Pedidos ({currentUser.name})
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1" title="Acesso completo a todas as vendas da empresa">
                  🏢 Todas as Vendas da Empresa
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código ou cliente..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50"
                />
              </div>

              <select
                value={historyStatus}
                onChange={e => setHistoryStatus(e.target.value)}
                className="text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50/50 font-medium"
              >
                <option value="all">Todos os Status</option>
                <option value="paid">Pagas / Concluídas</option>
                <option value="canceled">Canceladas</option>
              </select>
            </div>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhuma venda registrada até o momento para esta empresa.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Código / Data</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Itens</th>
                    <th className="p-3">Pagamento</th>
                    <th className="p-3">Nota Fiscal</th>
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map(sale => {
                    const isCanceled = sale.paymentStatus === 'canceled';
                    const hasNfe = !!(sale.fiscalDocumentId || sale.fiscalAccessKey || sale.fiscalStatus === 'authorized');
                    const isNfePending = !hasNfe && !isCanceled;

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">#{sale.code}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(sale.createdAt).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(sale.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {sale.createdBy && (
                            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]" title={`Vendedor: ${sale.createdBy}`}>
                              👤 {sale.createdBy}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{sale.clientName}</div>
                          {sale.clientCpfCnpj && (
                            <div className="text-[10px] text-slate-400">{sale.clientCpfCnpj}</div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px]">
                            {sale.items.reduce((sum, i) => sum + i.quantity, 0)} itens
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium text-slate-700">{sale.paymentMethod}</div>
                          {sale.installmentsCount && sale.installmentsCount > 1 && (
                            <div className="text-[10px] text-slate-400">{sale.installmentsCount}x parcelas</div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {hasNfe ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold inline-flex items-center gap-1">
                              🧾 {sale.nfeNumber || 'NF-e'} Autorizada
                            </span>
                          ) : isNfePending ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
                              ⏱️ NF-e Pendente
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800 whitespace-nowrap">
                          R$ {sale.totalAmount.toFixed(2)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {isCanceled ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold inline-flex items-center gap-1">
                              <Ban className="w-3 h-3" /> CANCELADA
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> PAGA
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSaleForReceipt(sale);
                              setShowReceiptModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Visualizar Comprovante / Impressão"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Comprovante
                          </button>

                          {!isCanceled && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSaleForFiscal(sale);
                                setShowFiscalModal(true);
                              }}
                              disabled={currentUser.permissions?.fiscalEmit === false}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                                currentUser.permissions?.fiscalEmit === false
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : hasNfe
                                  ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              }`}
                              title={
                                currentUser.permissions?.fiscalEmit === false
                                  ? 'Sem permissão de emissão fiscal'
                                  : hasNfe
                                  ? 'Reimprimir / Consultar DANFE'
                                  : 'Emitir Nota Fiscal (NF-e / NFC-e em Homologação)'
                              }
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              {hasNfe ? 'DANFE / NF-e' : 'Emitir NF-e'}
                            </button>
                          )}

                          {!isCanceled && (
                            <button
                              type="button"
                              onClick={() => handleCancelSale(sale)}
                              className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="Cancelar Venda e Devolver Estoque"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT / SHARE DOCUMENT MODAL (OFFICIAL DOCUMENT & PRINT ENGINE) */}
      {showReceiptModal && selectedSaleForReceipt && (
        <ShareDocumentModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          type="sale"
          docId={selectedSaleForReceipt.code || selectedSaleForReceipt.id}
          client={
            selectedSaleForReceipt.clientId && selectedSaleForReceipt.clientId !== 'walk-in'
              ? db.clients.find(c => c.id === selectedSaleForReceipt.clientId)
              : {
                  id: 'walk-in',
                  name: selectedSaleForReceipt.clientName || 'Consumidor Final',
                  cpf: selectedSaleForReceipt.clientCpfCnpj || '000.000.000-00',
                  cpfCnpj: selectedSaleForReceipt.clientCpfCnpj || '',
                  phone: '',
                  email: '',
                  address: '',
                  createdAt: selectedSaleForReceipt.createdAt || new Date().toISOString(),
                  companyId: currentCompany.id
                }
          }
          items={selectedSaleForReceipt.items.map(i => ({
            name: i.partName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            status: 'concluido'
          }))}
          totalValue={selectedSaleForReceipt.totalAmount}
          companyInfo={currentCompany}
          notes={selectedSaleForReceipt.notes}
          currentUserRole={currentUser.role}
          canCustomizePdf={currentUser.permissions.canCustomizePdf ?? true}
          paymentDetails={{
            paidAmount: selectedSaleForReceipt.totalAmount,
            remainingAmount: 0,
            paymentMethod: selectedSaleForReceipt.paymentMethod,
            paymentDate: selectedSaleForReceipt.createdAt,
            receiptCode: selectedSaleForReceipt.code,
            notes: selectedSaleForReceipt.installmentsCount && selectedSaleForReceipt.installmentsCount > 1
              ? `Parcelado em ${selectedSaleForReceipt.installmentsCount}x`
              : undefined
          }}
          onSaveCompanyOrientation={(orientation, docType) => {
            if (currentUser.role !== 'qa' && currentUser.role !== 'admin') return;
            if (!currentCompany) return;
            const updatedCompany: CompanyInfo = {
              ...currentCompany,
              reportPageOrientation: orientation,
              reportCustomOrientations: {
                ...(currentCompany.reportCustomOrientations || {}),
                [docType || 'sale']: orientation
              }
            };
            onSaveCompanyInfo?.(updatedCompany);
          }}
        />
      )}

      {/* FISCAL CONFERENCE & TRANSMISSION MODAL (PHASE 2 HOMOLOGATION) */}
      {showFiscalModal && selectedSaleForFiscal && (
        <FiscalConferenceModal
          isOpen={showFiscalModal}
          onClose={() => {
            setShowFiscalModal(false);
            setSelectedSaleForFiscal(null);
          }}
          company={currentCompany}
          client={
            selectedSaleForFiscal.clientId && selectedSaleForFiscal.clientId !== 'walk-in'
              ? db.clients.find(c => c.id === selectedSaleForFiscal.clientId)
              : null
          }
          clientName={selectedSaleForFiscal.clientName}
          clientCpfCnpj={selectedSaleForFiscal.clientCpfCnpj}
          saleId={selectedSaleForFiscal.id}
          saleCode={selectedSaleForFiscal.code}
          paymentMethod={selectedSaleForFiscal.paymentMethod}
          installmentsCount={selectedSaleForFiscal.installmentsCount}
          freightType={selectedSaleForFiscal.freightType || 'SEM_FRETE'}
          carrierId={selectedSaleForFiscal.carrierId}
          carrierName={selectedSaleForFiscal.carrierName}
          freightValue={selectedSaleForFiscal.freightValue || 0}
          shippingOperation={selectedSaleForFiscal.shippingOperation || 'DIRETA'}
          logisticsHub={selectedSaleForFiscal.logisticsHub}
          redispersionCarrierName={selectedSaleForFiscal.redispersionCarrierName}
          notes={selectedSaleForFiscal.notes}
          items={selectedSaleForFiscal.items.map(i => {
            const foundPart = db.parts.find(p => p.id === i.partId);
            return {
              id: i.partId || `part-${Date.now()}`,
              code: i.partCode || foundPart?.code || 'P-01',
              name: i.partName || foundPart?.name || 'Peça Automotiva',
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
              ncm: foundPart?.ncm || '8708.29.99',
              cest: foundPart?.cest || '',
              type: 'part' as const
            };
          })}
          sefazConfig={db.sefazConfig || {
            environment: 'homologation',
            certificateStatus: 'VALID_ACTIVE',
            certificateName: 'Certificado A1 Homologação e-CNPJ',
            certificateExpirationDate: '2027-12-31',
            nextNfeNumber: 101,
            nextNfceNumber: 501,
            nextNfseNumber: 201,
            nfeSeries: '1',
            cscTokenId: '000001',
            cscSecretKey: 'TESTE-HOMOLOGACAO-CSC-TOKEN',
            uf: currentCompany.uf || 'SP'
          }}
          taxRules={db.taxRules || []}
          carriers={db.carriers || []}
          onEmissionComplete={(res) => {
            onUpdateDb(prev => {
              const existingFiscDocs = prev.fiscalDocuments || [];
              const docIndex = existingFiscDocs.findIndex(d => d.id === res.fiscalDocument.id || d.accessKey === res.accessKey);
              let updatedFiscDocs: FiscalDocument[];
              if (docIndex >= 0) {
                updatedFiscDocs = [...existingFiscDocs];
                updatedFiscDocs[docIndex] = res.fiscalDocument;
              } else {
                updatedFiscDocs = [res.fiscalDocument, ...existingFiscDocs];
              }

              // Update sale with fiscal reference
              const updatedSales = (prev.sales || []).map(s => {
                if (s.id === selectedSaleForFiscal.id) {
                  return {
                    ...s,
                    fiscalDocumentId: res.fiscalDocument.id,
                    fiscalAccessKey: res.accessKey,
                    fiscalStatus: (res.success ? 'authorized' : 'rejected') as any,
                    nfeNumber: res.fiscalDocument.code
                  };
                }
                return s;
              });

              // Update associated account receivable
              const updatedReceivables = (prev.accountsReceivable || []).map(r => {
                if (r.saleId === selectedSaleForFiscal.id || r.code === `CR-${selectedSaleForFiscal.code}`) {
                  return {
                    ...r,
                    nfeId: res.fiscalDocument.id,
                    nfeCode: res.fiscalDocument.code,
                    nfeStatus: (res.success ? 'authorized' : 'rejected') as any,
                    nfeAccessKey: res.accessKey
                  };
                }
                return r;
              });

              // Increment next nfe number in config
              const updatedSefazConfig: SefazApiConfig = {
                ...(prev.sefazConfig || {
                  environment: 'homologation',
                  certificateStatus: 'VALID_ACTIVE',
                  uf: currentCompany.uf || 'SP'
                }),
                nextNfeNumber: (prev.sefazConfig?.nextNfeNumber || 101) + 1
              };

              return {
                ...prev,
                fiscalDocuments: updatedFiscDocs,
                sales: updatedSales,
                accountsReceivable: updatedReceivables,
                sefazConfig: updatedSefazConfig
              };
            });

            if (res.success) {
              setSaleSuccessMessage(`✅ NF-e ${res.fiscalDocument.code} autorizada pela SEFAZ! Chave: ${res.accessKey}`);
            }
          }}
        />
      )}

      {/* DIALOG DE ESCOLHA: EMISSÃO FISCAL PÓS-VENDA (3 OPÇÕES CONTROLADAS) */}
      {showFiscalChoiceModal && lastFinalizedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" id="modal-fiscal-choice">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                  🧾
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Venda #{lastFinalizedSale.code} Concluída</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o fluxo de emissão fiscal para esta venda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFiscalChoiceModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Venda e Financeiro Registrados
                  </span>
                  <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                    R$ {lastFinalizedSale.totalAmount.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Estoque atualizado e título criado no Contas a Receber. A venda não será duplicada.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* OPÇÃO 1: EMITIR NOTA AGORA */}
                <button
                  type="button"
                  id="btn-emit-nfe-now"
                  onClick={handleChoiceEmitNow}
                  className="w-full text-left p-3.5 rounded-xl border-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-2">
                      <span>⚡</span> EMITIR NOTA AGORA
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                      Conferência Direta
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Abre imediatamente a tela de conferência tributária (CFOP, ICMS, IBS/CBS) para validação e transmissão à SEFAZ.
                  </p>
                </button>

                {/* OPÇÃO 2: ENVIAR PARA CONFERÊNCIA */}
                <button
                  type="button"
                  id="btn-send-to-conference"
                  onClick={handleChoiceSendToConference}
                  className="w-full text-left p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
                      <span>⚖️</span> ENVIAR PARA CONFERÊNCIA
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                      Fila Operacional
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Marca a venda como <strong>Pendente de Conferência</strong> na fila fiscal para auditoria posterior pelo encarregado.
                  </p>
                </button>

                {/* OPÇÃO 3: EMITIR DEPOIS */}
                <button
                  type="button"
                  id="btn-emit-nfe-later"
                  onClick={handleChoiceEmitLater}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                      <span>⏱️</span> EMITIR DEPOIS
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Status: Emitir Depois
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Fecha o fluxo e permite imprimir o comprovante de venda. A NF-e poderá ser emitida posteriormente no Contas a Receber ou no Painel Fiscal.
                  </p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowFiscalChoiceModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
