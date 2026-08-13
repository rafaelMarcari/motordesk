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
  Ban
} from 'lucide-react';
import { AppDatabase } from '../data/mockData';
import {
  CommercialSale,
  CommercialSaleItem,
  Client,
  Part,
  CompanyInfo,
  User,
  FiscalDocument
} from '../types';

interface SalesViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  currentUser: User;
  currentCompany: CompanyInfo;
  isFiscalEnabled?: boolean;
}

export const SalesView: React.FC<SalesViewProps> = ({
  db,
  onUpdateDb,
  currentUser,
  currentCompany,
  isFiscalEnabled = true
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

  // History Filter State
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatus, setHistoryStatus] = useState<string>('all');

  // Receipt Modal State
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<CommercialSale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

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

  // Sales for Current Company
  const companySales = useMemo(() => {
    return (db.sales || []).filter(s => s.companyId === currentCompany.id);
  }, [db.sales, currentCompany.id]);

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
    const total = cartSubtotal - saleDiscount;
    return total > 0 ? total : 0;
  }, [cartSubtotal, saleDiscount]);

  // Add Item to Cart
  const handleAddToCart = (part: Part) => {
    if (part.stock <= 0) {
      alert(`O produto "${part.name}" está com estoque zerado!`);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.partId === part.id);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + 1;
        if (newQty > part.stock) {
          alert(`Quantidade solicitada excede o estoque disponível (${part.stock} un).`);
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
        let newQty = field === 'quantity' ? Math.max(1, value) : item.quantity;

        if (field === 'quantity' && partObj && newQty > partObj.stock) {
          alert(`Quantidade máxima disponível em estoque: ${partObj.stock}`);
          newQty = partObj.stock;
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

  // Finalize Sale
  const handleFinalizeSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('O carrinho de compras está vazio. Adicione produtos para prosseguir.');
      return;
    }

    let clientName = 'Consumidor Final (Balcão)';
    let clientCpfCnpj = '';
    let resolvedClientId = 'walk-in';

    if (selectedClientId !== 'walk-in') {
      const foundClient = availableClients.find(c => c.id === selectedClientId);
      if (foundClient) {
        resolvedClientId = foundClient.id;
        clientName = foundClient.name;
        clientCpfCnpj = foundClient.cpf || foundClient.cpfCnpj || '';
      }
    } else {
      if (customClientName.trim()) clientName = customClientName.trim();
      if (customClientCpf.trim()) clientCpfCnpj = customClientCpf.trim();
    }

    const saleCode = `VEN-${new Date().getFullYear()}-${String((db.sales?.length || 0) + 1).padStart(4, '0')}`;
    const saleId = 'sale-' + Date.now();
    const nowIso = new Date().toISOString();

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
      paymentStatus: 'paid',
      installmentsCount: installments,
      notes: saleNotes,
      createdBy: `${currentUser.name} (${currentUser.role})`
    };

    onUpdateDb(prev => {
      // 1. Deduct Stock and Record Stock Movements
      const updatedParts = prev.parts.map(p => {
        const cartItem = cart.find(ci => ci.partId === p.id);
        if (cartItem) {
          const newQty = Math.max(0, p.stock - cartItem.quantity);
          return { ...p, stock: newQty };
        }
        return p;
      });

      const newStockMovements = cart.map(ci => ({
        id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        partId: ci.partId,
        partName: ci.partName,
        partCode: ci.partCode,
        type: 'out' as const,
        quantity: ci.quantity,
        date: nowIso,
        reason: 'sales' as const,
        description: `Venda Comercial Direta #${saleCode} - Cliente: ${clientName}`,
        userName: currentUser.name,
        companyId: currentCompany.id
      }));

      // 2. Record Financial Transaction (Receita / Caixa)
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

      // 3. Optional Fiscal Document (NFC-e)
      let newFiscalDoc: FiscalDocument | null = null;
      if (isFiscalEnabled && autoEmitFiscal) {
        newFiscalDoc = {
          id: 'fisc-' + Date.now(),
          code: 'NFCe-' + String((prev.fiscalDocuments?.length || 0) + 101),
          type: 'nfe_product',
          status: 'authorized',
          accessKey: `3526${Date.now()}1234567890123456789012345678`,
          protocolNumber: `1352600${Math.floor(10000000 + Math.random() * 90000000)}`,
          issueDate: nowIso.split('T')[0],
          issuedAt: nowIso.replace('T', ' ').split('.')[0],
          companyId: currentCompany.id,
          companyName: currentCompany.name,
          companyCnpj: currentCompany.cnpj,
          clientName,
          clientCpfCnpj,
          cfop: '5.102',
          totalAmount: cartTotalAmount,
          totalProducts: cartTotalAmount,
          totalServices: 0,
          totalTaxes: cartTotalAmount * 0.18,
          items: cart.map(ci => ({
            id: 'fitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
            code: ci.partCode,
            name: ci.partName,
            ncm: ci.ncm || '8708.99.90',
            quantity: ci.quantity,
            unitPrice: ci.unitPrice,
            totalPrice: ci.totalPrice,
            type: 'part' as const
          })),
          sefazStatusMessage: 'Autorizado o uso da NFC-e',
          environment: 'homologation'
        };
        newSale.fiscalDocumentId = newFiscalDoc.id;
        newSale.fiscalAccessKey = newFiscalDoc.accessKey;
      }

      const existingSales = prev.sales || [];
      const existingMovements = prev.stockMovements || [];
      const existingFinancials = prev.financialTransactions || [];
      const existingFiscals = prev.fiscalDocuments || [];

      return {
        ...prev,
        parts: updatedParts,
        sales: [newSale, ...existingSales],
        stockMovements: [...newStockMovements, ...existingMovements],
        financialTransactions: [newFinancialTx, ...existingFinancials],
        fiscalDocuments: newFiscalDoc ? [newFiscalDoc, ...existingFiscals] : existingFiscals
      };
    });

    // Reset Form
    setCart([]);
    setSaleDiscount(0);
    setSaleNotes('');
    setSelectedClientId('walk-in');
    setCustomClientName('');
    setCustomClientCpf('');

    // Open Receipt for the new sale
    setSelectedSaleForReceipt(newSale);
    setShowReceiptModal(true);
    setSaleSuccessMessage(`Venda #${saleCode} finalizada com sucesso no valor de R$ ${cartTotalAmount.toFixed(2)}!`);
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
      // Restore stock
      const updatedParts = prev.parts.map(p => {
        const item = sale.items.find(i => i.partId === p.id);
        if (item) {
          return { ...p, stock: p.stock + item.quantity };
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

      // Stock movement record
      const restoreMovements = sale.items.map(item => ({
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
      }));

      return {
        ...prev,
        parts: updatedParts,
        sales: updatedSales,
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
            <h2 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Histórico de Vendas Comercial ({filteredHistory.length})
            </h2>

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
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map(sale => {
                    const isCanceled = sale.paymentStatus === 'canceled';
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
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all inline-flex items-center gap-1"
                            title="Visualizar Comprovante / Impressão"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Comprovante
                          </button>

                          {!isCanceled && (
                            <button
                              type="button"
                              onClick={() => handleCancelSale(sale)}
                              className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all inline-flex items-center gap-1"
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

      {/* RECEIPT MODAL */}
      {showReceiptModal && selectedSaleForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Comprovante de Venda #{selectedSaleForReceipt.code}</span>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs text-slate-800">
              <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-0.5">
                <div className="font-bold text-sm text-slate-900">{currentCompany.name}</div>
                <div className="text-[11px] text-slate-500">CNPJ: {currentCompany.cnpj}</div>
                <div className="text-[10px] text-slate-400">{currentCompany.address}</div>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Data/Hora:</span>
                  <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold">{selectedSaleForReceipt.clientName}</span>
                </div>
                {selectedSaleForReceipt.clientCpfCnpj && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CPF/CNPJ:</span>
                    <span>{selectedSaleForReceipt.clientCpfCnpj}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Atendente:</span>
                  <span>{selectedSaleForReceipt.createdBy}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold uppercase text-[10px] text-slate-500">Itens Comprados:</div>
                {selectedSaleForReceipt.items.map(i => (
                  <div key={i.id} className="flex justify-between items-start text-[11px]">
                    <div>
                      <div className="font-bold text-slate-800">{i.partName}</div>
                      <div className="text-[10px] text-slate-400">
                        {i.quantity} x R$ {i.unitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="font-bold text-slate-800">R$ {i.totalPrice.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>R$ {selectedSaleForReceipt.subtotal.toFixed(2)}</span>
                </div>
                {selectedSaleForReceipt.discount > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Desconto:</span>
                    <span>- R$ {selectedSaleForReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-300 text-slate-900">
                  <span>VALOR TOTAL:</span>
                  <span className="text-emerald-700">R$ {selectedSaleForReceipt.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                  <span>Forma Pagto:</span>
                  <span>
                    {selectedSaleForReceipt.paymentMethod}{' '}
                    {selectedSaleForReceipt.installmentsCount && selectedSaleForReceipt.installmentsCount > 1
                      ? `(${selectedSaleForReceipt.installmentsCount}x)`
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => handlePrintReceiptWindow(selectedSaleForReceipt)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir Comprovante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
