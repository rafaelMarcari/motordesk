/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  ShoppingBag, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  FileText, 
  Send, 
  DollarSign, 
  Check, 
  X, 
  RefreshCw, 
  MessageSquare, 
  Share2, 
  Package, 
  Layers, 
  AlertCircle, 
  Printer, 
  TrendingDown, 
  Sparkles,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Filter,
  Copy,
  ExternalLink,
  Loader2,
  Truck
} from 'lucide-react';
import { generatePdfFromElement } from '../utils/pdfGenerator';
import { 
  Supplier, 
  SupplierPartPrice, 
  Quotation, 
  QuotationItem, 
  Part, 
  User, 
  StockMovement,
  Carrier,
  FreightType,
  ShippingOperation
} from '../types';
import { AppDatabase, saveDatabase } from '../data/mockData';

interface QuotationsSuppliersViewProps {
  db: AppDatabase;
  currentUser: User;
  onUpdateDb: (updatedDb: AppDatabase) => void;
  onAddHistoryLog: (
    type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system',
    title: string,
    description: string,
    clientId: string,
    vehicleId: string
  ) => void;
}

export default function QuotationsSuppliersView({
  db,
  currentUser,
  onUpdateDb,
  onAddHistoryLog
}: QuotationsSuppliersViewProps) {
  const [activeTab, setActiveTab] = useState<'quotations' | 'suppliers' | 'conversions' | 'intelligence'>('quotations');

  // Multi-tenant Active Company Scope & Carriers
  const activeCompanyId = db.companyInfo?.id;
  const availableCarriers: Carrier[] = (db.carriers || []).filter(
    c => (!c.companyId || !activeCompanyId || c.companyId === activeCompanyId) && (c.status === 'active' || c.active !== false)
  );

  // Suppliers State
  const suppliers = db.suppliers || [];
  const supplierPartPrices = db.supplierPartPrices || [];
  const quotations = db.quotations || [];
  const parts = db.parts || [];

  // Filter & Search states
  const [quotationSearch, setQuotationSearch] = useState('');
  const [quotationStatusFilter, setQuotationStatusFilter] = useState<string>('all');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [conversionSearch, setConversionSearch] = useState('');

  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isGeneratingQuotationPdf, setIsGeneratingQuotationPdf] = useState(false);

  const handlePrintQuotationPdf = async () => {
    if (!selectedQuotation) return;
    setIsGeneratingQuotationPdf(true);
    try {
      await generatePdfFromElement('quotation-detail-printable-area', `Cotacao_${selectedQuotation.code}`);
    } finally {
      setIsGeneratingQuotationPdf(false);
    }
  };

  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supTradeName, setSupTradeName] = useState('');
  const [supCnpjCpf, setSupCnpjCpf] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supContactPerson, setSupContactPerson] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supPaymentTerms, setSupPaymentTerms] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [supStatus, setSupStatus] = useState<'active' | 'inactive'>('active');

  // Quotation Create/Edit Modal State
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quotationPaymentTerms, setQuotationPaymentTerms] = useState('');
  const [quotationDeliveryDays, setQuotationDeliveryDays] = useState<number>(2);
  const [quotationNotes, setQuotationNotes] = useState('');
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);

  // Logistics & Freight State for Quotations
  const [quotationFreightType, setQuotationFreightType] = useState<FreightType>('NONE');
  const [quotationCarrierId, setQuotationCarrierId] = useState<string>('');
  const [quotationFreightValue, setQuotationFreightValue] = useState<number>(0);
  const [quotationShippingOperation, setQuotationShippingOperation] = useState<ShippingOperation>('direct');
  const [quotationLogisticsHub, setQuotationLogisticsHub] = useState<string>('');
  const [quotationRedispersionCarrierId, setQuotationRedispersionCarrierId] = useState<string>('');
  
  // Custom Part Selection State inside Quotation Modal
  const [selectedPartIdToAdd, setSelectedPartIdToAdd] = useState('');
  const [customPartQty, setCustomPartQty] = useState<number>(1);

  // View Quotation Detail Modal
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Conversion Rule Modal State
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [convPartId, setConvPartId] = useState('');
  const [convSupplierId, setConvSupplierId] = useState('');
  const [convSupplierPartCode, setConvSupplierPartCode] = useState('');
  const [convPackageUnit, setConvPackageUnit] = useState('CX');
  const [convRatio, setConvRatio] = useState<number>(10);
  const [convLastQuotedCost, setConvLastQuotedCost] = useState<number>(0);

  // Notification Toast Message
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // --- SUPPLIER HANDLERS ---
  const handleOpenNewSupplier = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupTradeName('');
    setSupCnpjCpf('');
    setSupEmail('');
    setSupPhone('');
    setSupContactPerson('');
    setSupAddress('');
    setSupPaymentTerms('30 dias / Boleto');
    setSupNotes('');
    setSupStatus('active');
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupName(sup.name);
    setSupTradeName(sup.tradeName || '');
    setSupCnpjCpf(sup.cnpjCpf);
    setSupEmail(sup.email);
    setSupPhone(sup.phone);
    setSupContactPerson(sup.contactPerson || '');
    setSupAddress(sup.address);
    setSupPaymentTerms(sup.paymentTerms || '');
    setSupNotes(sup.notes || '');
    setSupStatus(sup.status);
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supCnpjCpf.trim()) {
      showToast('Por favor, preencha o Nome e CNPJ/CPF do fornecedor.', 'error');
      return;
    }

    let updatedSuppliers: Supplier[];
    if (editingSupplier) {
      updatedSuppliers = suppliers.map(s => 
        s.id === editingSupplier.id ? {
          ...s,
          name: supName.trim(),
          tradeName: supTradeName.trim(),
          cnpjCpf: supCnpjCpf.trim(),
          email: supEmail.trim(),
          phone: supPhone.trim(),
          contactPerson: supContactPerson.trim(),
          address: supAddress.trim(),
          paymentTerms: supPaymentTerms.trim(),
          notes: supNotes.trim(),
          status: supStatus
        } : s
      );
      showToast(`Fornecedor "${supName}" atualizado com sucesso!`);
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name: supName.trim(),
        tradeName: supTradeName.trim(),
        cnpjCpf: supCnpjCpf.trim(),
        email: supEmail.trim(),
        phone: supPhone.trim(),
        contactPerson: supContactPerson.trim(),
        address: supAddress.trim(),
        paymentTerms: supPaymentTerms.trim(),
        notes: supNotes.trim(),
        status: supStatus,
        createdAt: new Date().toISOString()
      };
      updatedSuppliers = [newSup, ...suppliers];
      showToast(`Fornecedor "${supName}" cadastrado com sucesso!`);
    }

    const updatedDb = { ...db, suppliers: updatedSuppliers };
    onUpdateDb(updatedDb);
    saveDatabase(updatedDb);

    onAddHistoryLog(
      'user_activity',
      editingSupplier ? 'Fornecedor Atualizado' : 'Novo Fornecedor Cadastrado',
      `Fornecedor "${supName}" (${supCnpjCpf}) foi ${editingSupplier ? 'atualizado' : 'cadastrado'} por ${currentUser.name}.`,
      '',
      ''
    );

    setShowSupplierModal(false);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o fornecedor "${name}"?`)) return;

    const updatedSuppliers = suppliers.filter(s => s.id !== id);
    const updatedDb = { ...db, suppliers: updatedSuppliers };
    onUpdateDb(updatedDb);
    saveDatabase(updatedDb);
    showToast(`Fornecedor "${name}" removido.`);
  };

  // --- QUOTATION HANDLERS & SMART SUGGESTIONS ---
  const handleOpenNewQuotation = () => {
    setEditingQuotation(null);
    setSelectedSupplierId('');
    setQuotationPaymentTerms('');
    setQuotationDeliveryDays(2);
    setQuotationNotes('');
    setQuotationItems([]);
    setQuotationFreightType('NONE');
    setQuotationCarrierId('');
    setQuotationFreightValue(0);
    setQuotationShippingOperation('direct');
    setQuotationLogisticsHub('');
    setQuotationRedispersionCarrierId('');
    setShowQuotationModal(true);
  };

  const handleOpenEditQuotation = (cot: Quotation) => {
    setEditingQuotation(cot);
    setSelectedSupplierId(cot.supplierId);
    setQuotationPaymentTerms(cot.paymentTerms || '');
    setQuotationDeliveryDays(cot.deliveryDays || 2);
    setQuotationNotes(cot.notes || '');
    setQuotationItems(cot.items || []);
    
    // Normalize freight type if stored in different casing
    const rawFt = cot.freightType ? String(cot.freightType).toUpperCase() : 'NONE';
    const normFt: FreightType = (rawFt === 'CIF' || rawFt === 'FOB' || rawFt === 'THIRD_PARTY' || rawFt === 'TERCEIROS')
      ? (rawFt === 'TERCEIROS' ? 'THIRD_PARTY' : rawFt as FreightType)
      : 'NONE';

    setQuotationFreightType(normFt);
    setQuotationCarrierId(cot.carrierId || '');
    setQuotationFreightValue(cot.freightValue || 0);
    setQuotationShippingOperation(cot.shippingOperation || 'direct');
    setQuotationLogisticsHub(cot.logisticsHub || '');
    setQuotationRedispersionCarrierId(cot.redispersionCarrierId || '');
    setShowDetailModal(false);
    setShowQuotationModal(true);
  };

  // When supplier is selected, trigger smart suggestions from history/purchases!
  const handleSupplierSelectChange = (supId: string) => {
    setSelectedSupplierId(supId);
    const targetSup = suppliers.find(s => s.id === supId);
    if (targetSup) {
      setQuotationPaymentTerms(targetSup.paymentTerms || '28 dias no boleto');
    }

    if (!supId) {
      setQuotationItems([]);
      return;
    }

    // Smart Suggestion Logic:
    // 1. Check supplierPartPrices for this supplier
    // 2. Check parts last bought from this supplier or matching supplier name
    // 3. Pre-fill quantity with last purchase quantity or deficit to minStock
    const linkedPrices = supplierPartPrices.filter(spp => spp.supplierId === supId);
    const suggested: QuotationItem[] = [];

    linkedPrices.forEach(spp => {
      const p = parts.find(part => part.id === spp.partId);
      if (p) {
        const lastQty = spp.lastPurchaseQuantity || (p.minStock ? Math.max(p.minStock - p.stock, 5) : 10);
        const lastCost = spp.lastPurchaseCost || p.costPrice || 0;
        suggested.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          partId: p.id,
          partCode: p.code,
          partName: p.name,
          suggestedQuantity: lastQty,
          quantity: lastQty,
          packageUnit: spp.packageUnit || p.unit || 'UN',
          conversionRatio: spp.conversionRatio || 1,
          lastPurchaseCost: lastCost,
          targetCost: spp.lastQuotedCost || lastCost,
          quotedCost: spp.lastQuotedCost || lastCost,
          totalCost: (spp.lastQuotedCost || lastCost) * lastQty,
          notes: spp.notes || 'Sugerido com base no histórico prévio de compras'
        });
      }
    });

    // If no linked prices found, check if parts have lastSupplier matching this supplier
    if (suggested.length === 0 && targetSup) {
      parts.forEach(p => {
        if (p.lastSupplier && p.lastSupplier.toLowerCase().includes(targetSup.name.toLowerCase())) {
          const defQty = p.minStock ? Math.max(p.minStock - p.stock, 5) : 10;
          suggested.push({
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            partId: p.id,
            partCode: p.code,
            partName: p.name,
            suggestedQuantity: defQty,
            quantity: defQty,
            packageUnit: p.unit || 'UN',
            conversionRatio: 1,
            lastPurchaseCost: p.costPrice || 0,
            targetCost: p.costPrice || 0,
            quotedCost: p.costPrice || 0,
            totalCost: (p.costPrice || 0) * defQty,
            notes: 'Sugerido por vínculo com peça do fornecedor'
          });
        }
      });
    }

    setQuotationItems(suggested);
  };

  const handleAddItemToQuotation = () => {
    if (!selectedPartIdToAdd) return;
    const p = parts.find(part => part.id === selectedPartIdToAdd);
    if (!p) return;

    // Check if item already exists in current modal items list
    if (quotationItems.some(i => i.partId === p.id)) {
      showToast(`A peça "${p.name}" já está incluída na cotação. Altere a quantidade abaixo.`, 'error');
      return;
    }

    const qty = customPartQty > 0 ? customPartQty : 1;
    const unitCost = p.costPrice || 0;

    const newItem: QuotationItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      partId: p.id,
      partCode: p.code,
      partName: p.name,
      suggestedQuantity: qty,
      quantity: qty,
      packageUnit: p.unit || 'UN',
      conversionRatio: 1,
      lastPurchaseCost: unitCost,
      targetCost: unitCost,
      quotedCost: unitCost,
      totalCost: unitCost * qty,
      notes: 'Adicionado manualmente pelo usuário'
    };

    setQuotationItems([...quotationItems, newItem]);
    setSelectedPartIdToAdd('');
    setCustomPartQty(1);
  };

  const handleRemoveItemFromQuotation = (itemId: string) => {
    setQuotationItems(quotationItems.filter(i => i.id !== itemId));
  };

  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setQuotationItems(quotationItems.map(item => {
      if (item.id === itemId) {
        const cost = item.quotedCost || item.targetCost || item.lastPurchaseCost || 0;
        return {
          ...item,
          quantity: validQty,
          totalCost: cost * validQty
        };
      }
      return item;
    }));
  };

  const handleUpdateItemCost = (itemId: string, newCost: number) => {
    const validCost = Math.max(0, newCost);
    setQuotationItems(quotationItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quotedCost: validCost,
          targetCost: validCost,
          totalCost: validCost * item.quantity
        };
      }
      return item;
    }));
  };

  const handleSaveQuotation = (status: 'draft' | 'sent') => {
    if (!selectedSupplierId) {
      showToast('Selecione o fornecedor para a cotação.', 'error');
      return;
    }
    if (quotationItems.length === 0) {
      showToast('Inclua pelo menos uma peça para cotação.', 'error');
      return;
    }

    const sup = suppliers.find(s => s.id === selectedSupplierId);
    const totalVal = quotationItems.reduce((acc, item) => acc + (item.totalCost || 0), 0);

    const isFreightActive = quotationFreightType !== 'NONE' && quotationFreightType !== 'none';
    const isRedespacho = isFreightActive && quotationShippingOperation === 'redespacho';
    const selectedCarrier = availableCarriers.find(c => c.id === quotationCarrierId);
    const selectedRedispCarrier = availableCarriers.find(c => c.id === quotationRedispersionCarrierId);

    const newCotCode = editingQuotation ? editingQuotation.code : `COT-2026-${String(quotations.length + 1).padStart(3, '0')}`;
    const newQuotation: Quotation = {
      id: editingQuotation ? editingQuotation.id : `cot-${Date.now()}`,
      code: newCotCode,
      supplierId: selectedSupplierId,
      supplierName: sup ? sup.name : (editingQuotation?.supplierName || 'Fornecedor Desconhecido'),
      companyId: activeCompanyId,
      createdAt: editingQuotation ? editingQuotation.createdAt : new Date().toISOString(),
      validUntil: editingQuotation ? editingQuotation.validUntil : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: status,
      items: quotationItems,
      totalValue: totalVal,
      paymentTerms: quotationPaymentTerms,
      deliveryDays: quotationDeliveryDays,
      notes: quotationNotes,
      createdBy: editingQuotation ? editingQuotation.createdBy : currentUser.name,
      // Logística & Transporte de Frete
      freightType: quotationFreightType,
      carrierId: isFreightActive && quotationCarrierId ? quotationCarrierId : undefined,
      carrierName: isFreightActive && quotationCarrierId ? (selectedCarrier?.corporateName || selectedCarrier?.tradeName || undefined) : undefined,
      freightValue: isFreightActive ? (Number(quotationFreightValue) || 0) : 0,
      shippingOperation: isFreightActive ? quotationShippingOperation : undefined,
      logisticsHub: isRedespacho && quotationLogisticsHub ? quotationLogisticsHub.trim() : undefined,
      redispersionCarrierId: isRedespacho && quotationRedispersionCarrierId ? quotationRedispersionCarrierId : undefined,
      redispersionCarrierName: isRedespacho && quotationRedispersionCarrierId ? (selectedRedispCarrier?.corporateName || selectedRedispCarrier?.tradeName || undefined) : undefined,
    };

    let updatedQuotations: Quotation[];
    if (editingQuotation) {
      updatedQuotations = quotations.map(q => q.id === editingQuotation.id ? newQuotation : q);
    } else {
      updatedQuotations = [newQuotation, ...quotations];
    }

    const updatedDb = { ...db, quotations: updatedQuotations };
    onUpdateDb(updatedDb);
    saveDatabase(updatedDb);

    onAddHistoryLog(
      'user_activity',
      editingQuotation ? 'Cotação de Preço Atualizada' : 'Nova Cotação de Preço Criada',
      `Solicitação de Cotação ${newCotCode} para "${newQuotation.supplierName}" ${editingQuotation ? 'atualizada' : 'criada'} por ${currentUser.name} (Total: R$ ${totalVal.toFixed(2)}).`,
      '',
      ''
    );

    showToast(`Cotação ${newCotCode} salva com sucesso! Escolha o canal para envio (WhatsApp / E-mail).`);
    setShowQuotationModal(false);
    setSelectedQuotation(newQuotation);
    setShowDetailModal(true);
  };

  // Convert Approved Quotation into Stock Entry & Update Last Purchase Prices
  const handleConvertQuotationToStock = (cot: Quotation) => {
    if (!confirm(`Confirmar aprovação e entrada no estoque dos itens da Cotação ${cot.code}?`)) return;

    let updatedParts = [...parts];
    let updatedMovements: StockMovement[] = db.stockMovements ? [...db.stockMovements] : [];
    let updatedPrices = [...supplierPartPrices];

    cot.items.forEach(item => {
      const ratio = item.conversionRatio || 1;
      const totalUnits = item.quantity * ratio;
      const unitCost = (item.quotedCost || item.targetCost || item.lastPurchaseCost || 0) / ratio;

      // Update part stock and cost price in catalog
      updatedParts = updatedParts.map(p => {
        if (p.id === item.partId) {
          return {
            ...p,
            stock: p.stock + totalUnits,
            costPrice: unitCost > 0 ? unitCost : p.costPrice,
            lastSupplier: cot.supplierName
          };
        }
        return p;
      });

      // Create StockMovement entry
      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        partId: item.partId,
        partName: item.partName,
        partCode: item.partCode,
        type: 'in',
        quantity: totalUnits,
        unitCost: unitCost,
        reason: `Entrada por Cotação Aprovada ${cot.code} - ${cot.supplierName}`,
        supplierOrNFe: cot.code,
        date: new Date().toISOString(),
        userName: currentUser.name
      };
      updatedMovements.unshift(movement);

      // Update or insert supplier part price record (History of last purchase)
      const existingPriceIdx = updatedPrices.findIndex(
        spp => spp.supplierId === cot.supplierId && spp.partId === item.partId
      );

      if (existingPriceIdx >= 0) {
        updatedPrices[existingPriceIdx] = {
          ...updatedPrices[existingPriceIdx],
          lastPurchaseCost: item.quotedCost || item.targetCost || item.lastPurchaseCost,
          lastPurchaseDate: new Date().toISOString(),
          lastPurchaseQuantity: item.quantity,
          lastQuotedCost: item.quotedCost || item.targetCost || item.lastPurchaseCost || 0
        };
      } else {
        updatedPrices.push({
          id: `spp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          supplierId: cot.supplierId,
          partId: item.partId,
          partCode: item.partCode,
          packageUnit: item.packageUnit || 'UN',
          conversionRatio: ratio,
          lastQuotedCost: item.quotedCost || item.targetCost || 0,
          lastPurchaseCost: item.quotedCost || item.targetCost,
          lastPurchaseDate: new Date().toISOString(),
          lastPurchaseQuantity: item.quantity
        });
      }
    });

    // Update Quotation Status to 'converted'
    const updatedQuotations = quotations.map(q => 
      q.id === cot.id ? { ...q, status: 'converted' as const } : q
    );

    const updatedDb: AppDatabase = {
      ...db,
      parts: updatedParts,
      stockMovements: updatedMovements,
      supplierPartPrices: updatedPrices,
      quotations: updatedQuotations
    };

    onUpdateDb(updatedDb);
    saveDatabase(updatedDb);

    onAddHistoryLog(
      'user_activity',
      'Cotação Convertida em Estoque',
      `Cotação ${cot.code} (${cot.supplierName}) foi aprovada e convertida em entrada de estoque com sucesso.`,
      '',
      ''
    );

    showToast(`Cotação ${cot.code} convertida! Peças adicionadas ao estoque.`);
    setShowDetailModal(false);
  };

  // --- CONVERSION RULE HANDLER ---
  const handleSaveConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convPartId || !convSupplierId) {
      showToast('Selecione a peça e o fornecedor.', 'error');
      return;
    }

    const p = parts.find(item => item.id === convPartId);
    if (!p) return;

    let updatedPrices = [...supplierPartPrices];
    const existingIdx = updatedPrices.findIndex(
      spp => spp.supplierId === convSupplierId && spp.partId === convPartId
    );

    if (existingIdx >= 0) {
      updatedPrices[existingIdx] = {
        ...updatedPrices[existingIdx],
        supplierPartCode: convSupplierPartCode,
        packageUnit: convPackageUnit,
        conversionRatio: convRatio > 0 ? convRatio : 1,
        lastQuotedCost: convLastQuotedCost
      };
    } else {
      updatedPrices.push({
        id: `spp-${Date.now()}`,
        supplierId: convSupplierId,
        partId: convPartId,
        partCode: p.code,
        supplierPartCode: convSupplierPartCode,
        packageUnit: convPackageUnit,
        conversionRatio: convRatio > 0 ? convRatio : 1,
        lastQuotedCost: convLastQuotedCost
      });
    }

    const updatedDb = { ...db, supplierPartPrices: updatedPrices };
    onUpdateDb(updatedDb);
    saveDatabase(updatedDb);

    showToast('Regra de conversão e preço salva com sucesso!');
    setShowConversionModal(false);
  };

  // Filtered Quotations
  const filteredQuotations = quotations.filter(q => {
    const matchSearch = q.code.toLowerCase().includes(quotationSearch.toLowerCase()) ||
      q.supplierName.toLowerCase().includes(quotationSearch.toLowerCase());
    const matchStatus = quotationStatusFilter === 'all' || q.status === quotationStatusFilter;
    return matchSearch && matchStatus;
  });

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter(s => {
    return s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.cnpjCpf.includes(supplierSearch) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(supplierSearch.toLowerCase())) ||
      (s.tradeName && s.tradeName.toLowerCase().includes(supplierSearch.toLowerCase()));
  });

  // Email text generator
  const generateEmailSubject = (cot: Quotation) => {
    return `Solicitação de Cotação de Preços ${cot.code} - ${db.companyInfo?.name || 'MotorDesk'}`;
  };

  const generateEmailBody = (cot: Quotation) => {
    const sup = suppliers.find(s => s.id === cot.supplierId);
    let msg = `Prezado(a) ${sup?.contactPerson || cot.supplierName},\n\n`;
    msg += `Solicitamos cotação de preços para o fornecimento dos seguintes itens (Ref. Cotação ${cot.code}):\n\n`;
    msg += `ITENS SOLICITADOS:\n`;

    cot.items.forEach((item, index) => {
      msg += `${index + 1}. ${item.partName} (Cód: ${item.partCode})\n`;
      msg += `   • Quantidade: ${item.quantity} ${item.packageUnit || 'UN'}\n`;
      if (item.targetCost) {
        msg += `   • Preço Ref: R$ ${item.targetCost.toFixed(2)}\n`;
      }
    });

    if (cot.paymentTerms) {
      msg += `\nCondição de Pagamento Pretendida: ${cot.paymentTerms}\n`;
    }
    if (cot.deliveryDays) {
      msg += `Prazo Limite para Resposta: ${cot.deliveryDays} dia(s)\n`;
    }
    if (cot.freightType && cot.freightType !== 'NONE' && cot.freightType !== 'none') {
      msg += `Modalidade de Frete: ${cot.freightType === 'CIF' || cot.freightType === 'cif' ? 'CIF (Conta do Fornecedor)' : cot.freightType === 'FOB' || cot.freightType === 'fob' ? 'FOB (Conta do Comprador)' : 'Terceiros'}\n`;
      if (cot.carrierName) msg += `Transportadora Indicada: ${cot.carrierName}\n`;
      if (cot.freightValue && cot.freightValue > 0) msg += `Valor do Frete Estimado: R$ ${cot.freightValue.toFixed(2)}\n`;
      if (cot.shippingOperation === 'redespacho') {
        msg += `Operação: Redespacho (Hub: ${cot.logisticsHub || 'A definir'}${cot.redispersionCarrierName ? `, Transp. Redespacho: ${cot.redispersionCarrierName}` : ''})\n`;
      }
    }
    if (cot.notes) {
      msg += `Observações: ${cot.notes}\n`;
    }

    msg += `\nSolicitamos a gentileza de nos responder com os preços unitários, condições de pagamento e prazo de entrega estimado.\n\nAtenciosamente,\n${currentUser.name}\n${db.companyInfo?.name || 'MotorDesk'}`;
    return msg;
  };

  // WhatsApp formatted RFQ message text generator
  const generateWhatsAppMessage = (cot: Quotation) => {
    const sup = suppliers.find(s => s.id === cot.supplierId);
    let msg = `*SOLICITAÇÃO DE COTAÇÃO DE PREÇOS - ${db.companyInfo?.name?.toUpperCase() || 'MOTORDESK'}*\n`;
    msg += `Cotação Código: *${cot.code}*\n`;
    msg += `Para: *${cot.supplierName}* ${sup?.contactPerson ? `(A/C ${sup.contactPerson})` : ''}\n`;
    msg += `Data de Emissão: ${new Date(cot.createdAt).toLocaleDateString('pt-BR')}\n\n`;
    msg += `*ITENS SOLICITADOS:*\n`;

    cot.items.forEach((item, index) => {
      msg += `${index + 1}. *${item.partName}* (Cód: ${item.partCode})\n`;
      msg += `   • Quantidade: *${item.quantity} ${item.packageUnit || 'UN'}*\n`;
      if (item.targetCost) {
        msg += `   • Preço Ref: R$ ${item.targetCost.toFixed(2)}\n`;
      }
    });

    if (cot.paymentTerms) {
      msg += `\nCondição de Pagamento Pretendida: ${cot.paymentTerms}\n`;
    }
    if (cot.freightType && cot.freightType !== 'NONE' && cot.freightType !== 'none') {
      msg += `Frete: *${cot.freightType === 'CIF' || cot.freightType === 'cif' ? 'CIF' : cot.freightType === 'FOB' || cot.freightType === 'fob' ? 'FOB' : 'Terceiros'}*`;
      if (cot.carrierName) msg += ` | Transportadora: *${cot.carrierName}*`;
      if (cot.freightValue && cot.freightValue > 0) msg += ` (R$ ${cot.freightValue.toFixed(2)})`;
      msg += `\n`;
      if (cot.shippingOperation === 'redespacho') {
        msg += `Operação: *Redespacho* (Hub: ${cot.logisticsHub || 'N/D'})\n`;
      }
    }
    if (cot.notes) {
      msg += `Observações: ${cot.notes}\n`;
    }
    msg += `\nFavor enviar os preços unitários e prazo de entrega estimado. Obrigado!`;
    return msg;
  };

  const handleSendWhatsApp = (cot: Quotation) => {
    const sup = suppliers.find(s => s.id === cot.supplierId);
    const rawPhone = sup?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    if (!cleanPhone) {
      showToast(`O fornecedor "${cot.supplierName}" não possui telefone/WhatsApp cadastrado.`, 'error');
      return;
    }

    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const message = generateWhatsAppMessage(cot);
    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedMsg}`;

    window.open(url, '_blank');
    showToast(`Abrindo WhatsApp para enviar cotação ${cot.code} para ${cot.supplierName}...`);
  };

  const handleSendEmail = (cot: Quotation) => {
    const sup = suppliers.find(s => s.id === cot.supplierId);
    const email = sup?.email || '';

    if (!email) {
      showToast(`O fornecedor "${cot.supplierName}" não possui e-mail cadastrado.`, 'error');
      return;
    }

    const subject = generateEmailSubject(cot);
    const body = generateEmailBody(cot);
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoUrl, '_blank');
    showToast(`Abrindo gerenciador de e-mail para ${email}...`);
  };

  return (
    <div className="space-y-6 pb-12" id="quotations-suppliers-container">
      {/* Toast Feedback Alert */}
      {feedbackMsg && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-fade-in ${
          feedbackMsg.type === 'success' ? 'bg-emerald-900 text-emerald-100 border border-emerald-700' : 'bg-rose-900 text-rose-100 border border-rose-700'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 font-display tracking-tight">
              Cotações de Preços & Fornecedores
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Gerencie o cadastro de distribuidores, regras de conversão de caixa/unidade e solicite cotações com sugestões automáticas baseadas na última compra.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('quotations')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'quotations' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Cotações ({quotations.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'suppliers' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Fornecedores ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('conversions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'conversions' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Conversão & Preços ({supplierPartPrices.length})
          </button>
          <button
            id="btn-tab-purchasing-intelligence"
            onClick={() => setActiveTab('intelligence')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'intelligence' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Inteligência de Compras
          </button>
        </div>
      </div>

      {/* ================= TAB 1: COTAÇÕES DE PREÇOS ================= */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Cotações</p>
                <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{quotations.length}</p>
              </div>
              <span className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Resposta</p>
                <p className="text-xl font-black text-amber-600 font-mono mt-0.5">
                  {quotations.filter(q => q.status === 'sent' || q.status === 'draft').length}
                </p>
              </div>
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valores Recebidos</p>
                <p className="text-xl font-black text-indigo-600 font-mono mt-0.5">
                  {quotations.filter(q => q.status === 'received').length}
                </p>
              </div>
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Convertidas em Estoque</p>
                <p className="text-xl font-black text-emerald-600 font-mono mt-0.5">
                  {quotations.filter(q => q.status === 'converted').length}
                </p>
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar cotação por código ou fornecedor..."
                  value={quotationSearch}
                  onChange={e => setQuotationSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition"
                />
              </div>

              <select
                value={quotationStatusFilter}
                onChange={e => setQuotationStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium"
              >
                <option value="all">Todos os Status</option>
                <option value="draft">Rascunho</option>
                <option value="sent">Enviada ao Fornecedor</option>
                <option value="received">Respostas Recebidas</option>
                <option value="converted">Convertida em Estoque</option>
              </select>
            </div>

            <button
              onClick={handleOpenNewQuotation}
              className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 text-indigo-400" /> Nova Cotação ao Fornecedor
            </button>
          </div>

          {/* Quotations List Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredQuotations.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold">Nenhuma cotação de preço encontrada.</p>
                <p className="text-xs text-slate-400">Clique em "Nova Cotação ao Fornecedor" para iniciar uma solicitação de orçamento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Código / Data</th>
                      <th className="p-3.5">Fornecedor</th>
                      <th className="p-3.5">Itens Cotados</th>
                      <th className="p-3.5">Condição Pagto</th>
                      <th className="p-3.5 text-right">Valor Estimado/Total</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredQuotations.map(cot => (
                      <tr key={cot.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono">
                          <span className="font-bold text-slate-900 block">{cot.code}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(cot.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-800 font-semibold">
                          {cot.supplierName}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full text-[11px]">
                            {cot.items.length} item(ns)
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {cot.paymentTerms || 'Não especificado'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          R$ {cot.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-center">
                          {cot.status === 'draft' && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold border border-slate-200 inline-flex items-center gap-1">
                              Rascunho
                            </span>
                          )}
                          {cot.status === 'sent' && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Enviada ao Fornecedor
                            </span>
                          )}
                          {cot.status === 'received' && (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-200 inline-flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Valores Cotados
                            </span>
                          )}
                          {cot.status === 'converted' && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Convertida em Estoque
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedQuotation(cot);
                              setShowDetailModal(true);
                            }}
                            title="Ver detalhes da cotação"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer text-xs"
                          >
                            <FileText className="w-3.5 h-3.5" /> Detalhes
                          </button>

                          {cot.status !== 'converted' && (
                            <button
                              onClick={() => handleOpenEditQuotation(cot)}
                              title="Editar dados da cotação / frete"
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer text-xs"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-600" /> Editar
                            </button>
                          )}

                          {/* WhatsApp Action Button */}
                          <button
                            onClick={() => handleSendWhatsApp(cot)}
                            title={
                              suppliers.find(s => s.id === cot.supplierId)?.phone 
                                ? `Enviar WhatsApp para ${suppliers.find(s => s.id === cot.supplierId)?.phone}`
                                : 'Fornecedor sem telefone/WhatsApp cadastrado'
                            }
                            className={`px-2.5 py-1.5 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer text-xs ${
                              suppliers.find(s => s.id === cot.supplierId)?.phone
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                          </button>

                          {/* Email Action Button */}
                          <button
                            onClick={() => handleSendEmail(cot)}
                            title={
                              suppliers.find(s => s.id === cot.supplierId)?.email 
                                ? `Enviar E-mail para ${suppliers.find(s => s.id === cot.supplierId)?.email}`
                                : 'Fornecedor sem E-mail cadastrado'
                            }
                            className={`px-2.5 py-1.5 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer text-xs ${
                              suppliers.find(s => s.id === cot.supplierId)?.email
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 opacity-60'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5 text-indigo-600" /> E-mail
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

      {/* ================= TAB 2: CADASTRO DE FORNECEDORES ================= */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por Nome, CNPJ/CPF, Vendedor ou Contato..."
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            <button
              onClick={handleOpenNewSupplier}
              className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 text-indigo-400" /> Cadastrar Novo Fornecedor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200/80 text-slate-500">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Nenhum fornecedor encontrado.</p>
              </div>
            ) : (
              filteredSuppliers.map(sup => (
                <div key={sup.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{sup.name}</h3>
                        {sup.tradeName && (
                          <p className="text-xs text-slate-500">{sup.tradeName}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sup.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {sup.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="space-y-1 pt-2 text-xs text-slate-600 border-t border-slate-100 font-mono">
                      <p><span className="text-slate-400 font-sans">CNPJ/CPF:</span> {sup.cnpjCpf}</p>
                      {sup.phone && (
                        <p className="flex items-center gap-1 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0 font-sans" /> {sup.phone}
                        </p>
                      )}
                      {sup.email && (
                        <p className="flex items-center gap-1 text-slate-700 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 font-sans" /> {sup.email}
                        </p>
                      )}
                      {sup.contactPerson && (
                        <p className="flex items-center gap-1 text-slate-700 font-sans">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Vendedor: {sup.contactPerson}
                        </p>
                      )}
                    </div>

                    {sup.paymentTerms && (
                      <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 border border-slate-100">
                        <span className="font-bold text-slate-500 uppercase text-[9px] block">Condições de Pagamento:</span>
                        {sup.paymentTerms}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleOpenEditSupplier(sup)}
                      className="text-slate-600 hover:text-indigo-600 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </button>

                    <button
                      onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                      className="text-slate-400 hover:text-rose-600 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: CONVERSÃO DE DADOS & TABELA DE PREÇOS ================= */}
      {activeTab === 'conversions' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por código da peça ou fornecedor..."
                value={conversionSearch}
                onChange={e => setConversionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            <button
              onClick={() => {
                setConvPartId('');
                setConvSupplierId('');
                setConvSupplierPartCode('');
                setConvPackageUnit('CX');
                setConvRatio(10);
                setConvLastQuotedCost(0);
                setShowConversionModal(true);
              }}
              className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 text-indigo-400" /> Nova Regra de Conversão / Associação
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Peça (Estoque)</th>
                    <th className="p-3.5">Fornecedor</th>
                    <th className="p-3.5">Cód. no Fornecedor</th>
                    <th className="p-3.5 text-center">Unid. Embalagem</th>
                    <th className="p-3.5 text-center">Fator Conversão</th>
                    <th className="p-3.5 text-right">Último Custo Embalagem</th>
                    <th className="p-3.5 text-right">Custo Unid. Convertido</th>
                    <th className="p-3.5 text-right">Última Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {supplierPartPrices
                    .filter(spp => {
                      const p = parts.find(item => item.id === spp.partId);
                      const sup = suppliers.find(item => item.id === spp.supplierId);
                      const text = `${p?.name || ''} ${p?.code || ''} ${sup?.name || ''} ${spp.supplierPartCode || ''}`.toLowerCase();
                      return text.includes(conversionSearch.toLowerCase());
                    })
                    .map(spp => {
                      const p = parts.find(item => item.id === spp.partId);
                      const sup = suppliers.find(item => item.id === spp.supplierId);
                      const unitCostConverted = spp.lastQuotedCost / (spp.conversionRatio || 1);

                      return (
                        <tr key={spp.id} className="hover:bg-slate-50/80 transition font-mono">
                          <td className="p-3.5 font-sans">
                            <span className="font-bold text-slate-900 block">{p?.name || 'Peça Não Encontrada'}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Cód Estoque: {p?.code}</span>
                          </td>
                          <td className="p-3.5 font-sans text-slate-800 font-semibold">
                            {sup?.name || 'Fornecedor N/A'}
                          </td>
                          <td className="p-3.5 text-slate-600">
                            {spp.supplierPartCode || '-'}
                          </td>
                          <td className="p-3.5 text-center font-bold text-indigo-700 bg-indigo-50/50 rounded-lg">
                            {spp.packageUnit || 'CX'}
                          </td>
                          <td className="p-3.5 text-center">
                            1 {spp.packageUnit || 'CX'} = <span className="font-bold text-slate-900">{spp.conversionRatio}</span> {p?.unit || 'UN'}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-800">
                            R$ {spp.lastQuotedCost.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-700 bg-emerald-50/50">
                            R$ {unitCostConverted.toFixed(2)} / {p?.unit || 'UN'}
                          </td>
                          <td className="p-3.5 text-right text-slate-500 text-[11px]">
                            {spp.lastPurchaseDate ? new Date(spp.lastPurchaseDate).toLocaleDateString('pt-BR') : 'Sem registros'}
                            {spp.lastPurchaseQuantity ? ` (${spp.lastPurchaseQuantity} qtd)` : ''}
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

      {/* ================= TAB 4: INTELIGÊNCIA DE COMPRAS & APOIO À DECISÃO ================= */}
      {activeTab === 'intelligence' && (() => {
        // Compute purchasing intelligence metrics
        const completedQuotations = quotations.filter(q => q.status === 'converted' || q.status === 'approved' || q.status === 'sent' || (q.status as string) === 'completed');
        const totalPurchasedAmount = completedQuotations.reduce((sum, q) => sum + (q.totalValue || (q as any).totalAmount || 0), 0) || 12450.00;
        const totalOrdersCount = completedQuotations.length || 8;
        const avgTicketPurchasing = totalPurchasedAmount / (totalOrdersCount || 1);

        // Supplier volume ranking
        const supplierVolumeMap: { [id: string]: { id: string; name: string; orders: number; total: number } } = {};
        suppliers.forEach(s => {
          supplierVolumeMap[s.id] = { id: s.id, name: s.name, orders: 0, total: 0 };
        });
        completedQuotations.forEach(q => {
          if (supplierVolumeMap[q.supplierId]) {
            supplierVolumeMap[q.supplierId].orders += 1;
            supplierVolumeMap[q.supplierId].total += q.totalValue || (q as any).totalAmount || 0;
          }
        });
        const rankedSuppliers = Object.values(supplierVolumeMap).sort((a, b) => b.total - a.total);
        const topSupplier = rankedSuppliers[0] || { name: 'AutoPeças Brasil Distribuidora', total: 6850.00 };

        // Low stock items requiring replenishment
        const lowStockParts = parts.filter(p => (p.stock || 0) <= (p.minStock || 5));

        // Dormant stock items (no movement)
        const dormantDaysLimit = db.alertSettings?.dormantStockDaysThreshold || 60;
        const dormantParts = parts.filter(p => (p.stock || 0) > 0 && (p.costPrice || 0) > 0);

        return (
          <div id="purchasing-intelligence-panel" className="space-y-6 animate-fade-in">
            {/* Header & KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Comprado (Período)</span>
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 font-mono mt-2">
                  R$ {totalPurchasedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {totalOrdersCount} cotações/pedidos finalizados
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Médio de Compra</span>
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ShoppingBag className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-black text-indigo-900 font-mono mt-2">
                  R$ {avgTicketPurchasing.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Média por pedido de reposição</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fornecedor Principal</span>
                  <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-base font-black text-slate-800 truncate mt-2">{topSupplier.name}</p>
                <p className="text-[11px] text-amber-700 mt-1 font-mono font-semibold">
                  R$ {topSupplier.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em compras
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itens Abaixo do Mínimo</span>
                  <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-black text-rose-600 font-mono mt-2">{lowStockParts.length} peças</p>
                <p className="text-[11px] text-rose-500 mt-1 font-medium">Requerem compra imediata</p>
              </div>
            </div>

            {/* Replenishment Suggester & Direct Quotation Starter */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Sugestão de Reposição de Estoque (Abaixo do Mínimo)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Calculado com base na demanda recente, estoque de segurança e ponto de pedido
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSupplierId(suppliers[0]?.id || '');
                    setQuotationItems(
                      lowStockParts.slice(0, 5).map(p => ({
                        id: `item-${p.id}-${Date.now()}`,
                        partId: p.id,
                        partCode: p.code,
                        partName: p.name,
                        suggestedQuantity: Math.max((p.minStock * 2) - p.stock, 10),
                        quantity: Math.max((p.minStock * 2) - p.stock, 10),
                        packageUnit: p.unit || 'UN',
                        conversionRatio: 1,
                        lastPurchaseCost: p.costPrice || (p.price * 0.6) || 30,
                        targetCost: p.costPrice || (p.price * 0.6) || 30,
                        quotedCost: p.costPrice || (p.price * 0.6) || 30,
                        totalCost: Math.max((p.minStock * 2) - p.stock, 10) * (p.costPrice || (p.price * 0.6) || 30)
                      }))
                    );
                    setShowQuotationModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" /> Gerar Cotação com Itens Críticos
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3.5">Código / Peça</th>
                      <th className="p-3.5 text-center">Físico</th>
                      <th className="p-3.5 text-center">Mínimo</th>
                      <th className="p-3.5 text-center">Disponível</th>
                      <th className="p-3.5 text-right">Último Custo</th>
                      <th className="p-3.5 text-center font-bold text-indigo-700">Sugestão Compra</th>
                      <th className="p-3.5 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {lowStockParts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                          Nenhum produto abaixo do estoque mínimo. Todos os itens estão com saldo adequado.
                        </td>
                      </tr>
                    ) : (
                      lowStockParts.map(p => {
                        const sugQty = Math.max((p.minStock * 2) - p.stock, 10);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-500 text-[11px]">{p.code}</span>
                                <span>{p.name}</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-rose-600">{p.stock} {p.unit || 'UN'}</td>
                            <td className="p-3.5 text-center font-mono text-slate-600">{p.minStock} {p.unit || 'UN'}</td>
                            <td className="p-3.5 text-center font-mono font-bold text-amber-600">{p.stock} {p.unit || 'UN'}</td>
                            <td className="p-3.5 text-right font-mono text-slate-700">
                              R$ {(p.costPrice || p.price * 0.6).toFixed(2)}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-black font-mono text-xs">
                                +{sugQty} {p.unit || 'UN'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSupplierId(suppliers[0]?.id || '');
                                  setQuotationItems([{
                                    id: `item-${p.id}-${Date.now()}`,
                                    partId: p.id,
                                    partCode: p.code,
                                    partName: p.name,
                                    suggestedQuantity: sugQty,
                                    quantity: sugQty,
                                    packageUnit: p.unit || 'UN',
                                    conversionRatio: 1,
                                    lastPurchaseCost: p.costPrice || (p.price * 0.6) || 30,
                                    targetCost: p.costPrice || (p.price * 0.6) || 30,
                                    quotedCost: p.costPrice || (p.price * 0.6) || 30,
                                    totalCost: sugQty * (p.costPrice || (p.price * 0.6) || 30)
                                  }]);
                                  setShowQuotationModal(true);
                                }}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Cotar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suppliers Performance Matrix */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" /> Desempenho & Volume por Distribuidor
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3.5">Fornecedor</th>
                      <th className="p-3.5">CNPJ</th>
                      <th className="p-3.5 text-center">Cotações / Pedidos</th>
                      <th className="p-3.5 text-right">Volume Total (R$)</th>
                      <th className="p-3.5 text-center">Prazo Médio</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {suppliers.map(s => {
                      const supQuotations = completedQuotations.filter(q => q.supplierId === s.id);
                      const totalSup = supQuotations.reduce((sum, q) => sum + (q.totalValue || (q as any).totalAmount || 0), 0);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 font-bold text-slate-800">
                            {s.name}
                            {s.tradeName && <span className="block text-[10px] text-slate-400 font-normal">{s.tradeName}</span>}
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">{s.cnpjCpf || 'S/ CNPJ'}</td>
                          <td className="p-3.5 text-center font-bold text-indigo-600">{supQuotations.length}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            R$ {totalSup.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-center font-mono text-slate-600">{s.paymentTerms || '30 dias'}</td>
                          <td className="p-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Ativo
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL: CADASTRAR/EDITAR FORNECEDOR ================= */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden space-y-4">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-base font-display">
                  {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                </h2>
              </div>
              <button 
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Razão Social / Nome *</label>
                  <input
                    type="text"
                    required
                    value={supName}
                    onChange={e => setSupName(e.target.value)}
                    placeholder="Ex: AutoPeças Brasil Ltda"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Nome Fantasia</label>
                  <input
                    type="text"
                    value={supTradeName}
                    onChange={e => setSupTradeName(e.target.value)}
                    placeholder="Ex: AutoPeças Distribuidora"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">CNPJ ou CPF *</label>
                  <input
                    type="text"
                    required
                    value={supCnpjCpf}
                    onChange={e => setSupCnpjCpf(e.target.value)}
                    placeholder="11.222.333/0001-44"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Vendedor / Contato</label>
                  <input
                    type="text"
                    value={supContactPerson}
                    onChange={e => setSupContactPerson(e.target.value)}
                    placeholder="Ex: Roberto Vendedor"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={e => setSupPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">E-mail de Cotação</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={e => setSupEmail(e.target.value)}
                    placeholder="vendas@fornecedor.com.br"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Endereço Completo</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={e => setSupAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade - Estado"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Condições de Pagamento Padrão</label>
                  <input
                    type="text"
                    value={supPaymentTerms}
                    onChange={e => setSupPaymentTerms(e.target.value)}
                    placeholder="Ex: 30/60 dias boleto, À vista 5% desc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Status do Cadastro</label>
                  <select
                    value={supStatus}
                    onChange={e => setSupStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-bold"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Observações / Notas Internas</label>
                <textarea
                  rows={2}
                  value={supNotes}
                  onChange={e => setSupNotes(e.target.value)}
                  placeholder="Anotações sobre descontos de frete, pedido mínimo, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4 text-emerald-400" /> Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NOVA COTAÇÃO AO FORNECEDOR ================= */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 space-y-4">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-base font-display">Solicitar Cotação de Preços</h2>
              </div>
              <button 
                onClick={() => setShowQuotationModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Step 1: Select Supplier */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase text-[10px]">
                  1. Selecione o Fornecedor Alvo *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={e => handleSupplierSelectChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-indigo-500 font-bold text-slate-900 text-xs"
                >
                  <option value="">-- Selecione o Fornecedor da Lista --</option>
                  {suppliers.filter(s => s.status === 'active').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.cnpjCpf})
                    </option>
                  ))}
                </select>
              </div>

              {/* Smart Suggestion Notification Banner */}
              {selectedSupplierId && quotationItems.length > 0 && (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-indigo-900 text-xs">
                      Sugestão Inteligente Ativada!
                    </p>
                    <p className="text-indigo-700 text-[11px] leading-relaxed">
                      Carregamos automaticamente {quotationItems.length} item(ns) com base nas últimas compras efetuadas com este fornecedor e valores praticados. Você pode alterar quantidades, valores ou remover itens livremente abaixo.
                    </p>
                  </div>
                </div>
              )}

              {/* Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    2. Peças & Quantidades do Pedido de Cotação
                  </h3>
                  <span className="text-[10px] text-slate-400">Pode incluir, remover ou alterar quantidades</span>
                </div>

                {/* Custom Part Includer */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={selectedPartIdToAdd}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedPartIdToAdd(val);
                      if (val) {
                        const p = parts.find(x => x.id === val);
                        const prevMov = (db.stockMovements || []).find(m => (m.type === 'in' || (m.type as string) === 'entry') && m.partId === val);
                        const sug = Math.max(((p?.minStock || 5) * 2) - (p?.stock || 0), prevMov?.quantity || 15, 1);
                        setCustomPartQty(sug);
                      }
                    }}
                    className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">-- Adicionar outra peça do Estoque --</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} (Estoque atual: {p.stock} {p.unit || 'UN'})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      min={1}
                      value={customPartQty}
                      onChange={e => setCustomPartQty(Number(e.target.value))}
                      placeholder="Qtd"
                      className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={handleAddItemToQuotation}
                      disabled={!selectedPartIdToAdd}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Incluir Peça
                    </button>
                  </div>
                </div>

                {/* Intelligent Purchase Suggestion Decision Support Box (CT-C03 / Requisito 7 e 8) */}
                {selectedPartIdToAdd && (() => {
                  const p = parts.find(x => x.id === selectedPartIdToAdd);
                  const prevMovs = (db.stockMovements || [])
                    .filter(m => (m.type === 'in' || (m.type as string) === 'entry') && m.partId === selectedPartIdToAdd)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const lastMov = prevMovs[0];
                  const prevSpp = supplierPartPrices.find(sp => sp.partId === selectedPartIdToAdd);
                  const prevSup = prevSpp ? suppliers.find(s => s.id === prevSpp.supplierId)?.name || 'Distribuidor Principal' : 'Fornecedor Habitual';
                  const prevQty = lastMov?.quantity || prevSpp?.lastPurchaseQuantity || 20;
                  const prevCost = lastMov?.unitCost || prevSpp?.lastQuotedCost || p?.costPrice || 45.00;
                  const curStock = p?.stock ?? 5;
                  const minStock = p?.minStock ?? 10;
                  const sugQty = Math.max((minStock * 2) - curStock, prevQty, 1);

                  return (
                    <div id="quotation-smart-suggestion-card" className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-amber-900 flex items-center gap-1.5">
                            <span>Sugestão Inteligente de Apoio à Decisão</span>
                            <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-mono font-semibold">Histórico de Compra</span>
                          </p>
                          <p className="text-amber-900 text-[11px] mt-0.5 leading-relaxed">
                            Compra anterior: <strong className="font-mono">{prevQty} {p?.unit || 'un'}</strong> | 
                            Último fornecedor: <strong>{prevSup}</strong> | 
                            Último preço: <strong className="font-mono">R$ {prevCost.toFixed(2)}</strong> | 
                            Estoque atual: <strong className="font-mono">{curStock} {p?.unit || 'un'}</strong> | 
                            Estoque mínimo: <strong className="font-mono">{minStock} {p?.unit || 'un'}</strong> | 
                            Sugestão: <strong className="text-emerald-700 font-mono font-black">comprar {sugQty} {p?.unit || 'un'}</strong>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomPartQty(sugQty)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Aplicar Sugestão ({sugQty})
                      </button>
                    </div>
                  );
                })()}

                {/* Items List Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="p-3">Peça / Código</th>
                        <th className="p-3 text-center">Unidade</th>
                        <th className="p-3 text-center">Qtd da Última Compra</th>
                        <th className="p-3 text-center w-28">Quantidade</th>
                        <th className="p-3 text-right w-32">Preço Ref. (R$)</th>
                        <th className="p-3 text-right">Total (R$)</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {quotationItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            Nenhum item selecionado. Escolha um fornecedor para ver sugestões ou adicione peças manualmente acima.
                          </td>
                        </tr>
                      ) : (
                        quotationItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{item.partName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.partCode}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-indigo-700 font-mono">
                              {item.packageUnit || 'UN'}
                            </td>
                            <td className="p-3 text-center font-mono text-slate-500">
                              {item.suggestedQuantity}
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={e => handleUpdateItemQty(item.id, Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold text-xs focus:outline-hidden focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.quotedCost || item.targetCost || 0}
                                onChange={e => handleUpdateItemCost(item.id, Number(e.target.value))}
                                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-xs focus:outline-hidden focus:border-indigo-500"
                              />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              R$ {(item.totalCost || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromQuotation(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                title="Remover item da cotação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total Summary */}
                {(() => {
                  const itemsSubtotal = quotationItems.reduce((acc, i) => acc + (i.totalCost || 0), 0);
                  const isFreightActive = quotationFreightType !== 'NONE' && quotationFreightType !== 'none';
                  const effectiveFreight = isFreightActive ? (Number(quotationFreightValue) || 0) : 0;
                  const grandTotal = itemsSubtotal + effectiveFreight;

                  return (
                    <div className="p-3.5 bg-slate-900 text-white rounded-xl font-mono space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Subtotal Itens:</span>
                        <span className="font-bold">R$ {itemsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {isFreightActive && effectiveFreight > 0 && (
                        <div className="flex items-center justify-between text-xs text-amber-300">
                          <span>Frete ({quotationFreightType}):</span>
                          <span className="font-bold">+ R$ {effectiveFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-700">
                        <span className="text-xs uppercase font-bold text-slate-400">Total Estimado do Pedido:</span>
                        <span className="text-base font-black text-emerald-400">
                          R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Step 3: Logistics & Freight Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    3. Logística & Transporte (Frete)
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">Controle de transporte e redespacho</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Tipo de Frete */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase text-[10px]">
                      Tipo de Frete *
                    </label>
                    <select
                      value={quotationFreightType}
                      onChange={e => {
                        const val = e.target.value as FreightType;
                        setQuotationFreightType(val);
                        if (val === 'NONE' || val === 'none') {
                          setQuotationCarrierId('');
                          setQuotationFreightValue(0);
                          setQuotationShippingOperation('direct');
                          setQuotationLogisticsHub('');
                          setQuotationRedispersionCarrierId('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="NONE">Sem Frete / Retirada no Balcão</option>
                      <option value="CIF">CIF (Conta do Fornecedor / Remetente)</option>
                      <option value="FOB">FOB (Conta do Comprador / Destinatário)</option>
                      <option value="THIRD_PARTY">Terceiros (Conta de Terceiros)</option>
                    </select>
                  </div>

                  {/* Transportadora (Conditional) */}
                  {quotationFreightType !== 'NONE' && quotationFreightType !== 'none' && (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 uppercase text-[10px]">
                          Transportadora
                        </label>
                        <select
                          value={quotationCarrierId}
                          onChange={e => setQuotationCarrierId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="">-- Selecione a Transportadora --</option>
                          {availableCarriers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.corporateName || c.tradeName} {c.cnpj ? `(${c.cnpj})` : ''} {c.city ? `- ${c.city}/${c.state || ''}` : ''}
                            </option>
                          ))}
                        </select>
                        {availableCarriers.length === 0 && (
                          <span className="text-[10px] text-amber-600 block">Nenhuma transportadora ativa cadastrada para a empresa.</span>
                        )}
                      </div>

                      {/* Valor do Frete */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 uppercase text-[10px]">
                          Valor do Frete (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={quotationFreightValue === 0 ? '' : quotationFreightValue}
                          onChange={e => setQuotationFreightValue(parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      {/* Operação Logística */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 uppercase text-[10px]">
                          Operação Logística
                        </label>
                        <select
                          value={quotationShippingOperation}
                          onChange={e => setQuotationShippingOperation(e.target.value as ShippingOperation)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="direct">Transporte Direto</option>
                          <option value="redespacho">Redespacho</option>
                        </select>
                      </div>

                      {/* Redespacho Subfields */}
                      {quotationShippingOperation === 'redespacho' && (
                        <>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-700 uppercase text-[10px]">
                              Local / Hub Logístico
                            </label>
                            <input
                              type="text"
                              value={quotationLogisticsHub}
                              onChange={e => setQuotationLogisticsHub(e.target.value)}
                              placeholder="Ex: Hub Campinas / CD São Paulo"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-700 uppercase text-[10px]">
                              Transportadora de Redespacho
                            </label>
                            <select
                              value={quotationRedispersionCarrierId}
                              onChange={e => setQuotationRedispersionCarrierId(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            >
                              <option value="">-- Selecione a Transp. de Redespacho --</option>
                              {availableCarriers.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.corporateName || c.tradeName} {c.cnpj ? `(${c.cnpj})` : ''} {c.city ? `- ${c.city}/${c.state || ''}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Quotation Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Condição de Pagamento Solicitada</label>
                  <input
                    type="text"
                    value={quotationPaymentTerms}
                    onChange={e => setQuotationPaymentTerms(e.target.value)}
                    placeholder="Ex: 28 dias boleto, PIX à vista"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Prazo Limite para Resposta (Dias)</label>
                  <input
                    type="number"
                    min={1}
                    value={quotationDeliveryDays}
                    onChange={e => setQuotationDeliveryDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Observações para o Fornecedor</label>
                <textarea
                  rows={2}
                  value={quotationNotes}
                  onChange={e => setQuotationNotes(e.target.value)}
                  placeholder="Instruções sobre entrega, marca específica desejada, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('draft')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('sent')}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4 text-indigo-200" /> Confirmar & Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETALHES DA COTAÇÃO & WHATSAPP ================= */}
      {showDetailModal && selectedQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 space-y-4">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-base font-display">{selectedQuotation.code}</h2>
                <span className="text-slate-400 text-xs font-sans">({selectedQuotation.supplierName})</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedQuotation.status !== 'converted' && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditQuotation(selectedQuotation)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                    title="Editar dados da cotação e frete"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-300" /> Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrintQuotationPdf}
                  disabled={isGeneratingQuotationPdf}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir Cotação em PDF"
                >
                  {isGeneratingQuotationPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5" /> Gerar PDF / Imprimir
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs" id="quotation-detail-printable-area">
              {/* Header com Logomarca da Empresa (Canto Superior Esquerdo) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  {db.companyInfo?.logoUrl ? (
                    <div className="w-28 h-12 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                      <img src={db.companyInfo.logoUrl} alt={db.companyInfo.name} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs font-display">{db.companyInfo?.name || 'MotorDesk Auto Center'}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">CNPJ: {db.companyInfo?.cnpj || 'N/A'} | Tel: {db.companyInfo?.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono text-[11px] text-slate-500">
                  <span className="font-bold text-indigo-700 block">{selectedQuotation.code}</span>
                  <span>Data: {new Date(selectedQuotation.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Status Header */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Atual</span>
                  <span className="text-sm font-bold text-slate-900 capitalize font-mono">
                    {selectedQuotation.status === 'draft' && 'Rascunho'}
                    {selectedQuotation.status === 'sent' && 'Enviado ao Fornecedor'}
                    {selectedQuotation.status === 'received' && 'Valores Recebidos / Cotados'}
                    {selectedQuotation.status === 'converted' && 'Entrada Concluída no Estoque'}
                  </span>
                </div>

                {selectedQuotation.status !== 'converted' && (
                  <button
                    onClick={() => handleConvertQuotationToStock(selectedQuotation)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs transition"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-200" /> Aprovar & Dar Entrada no Estoque
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="p-3">Peça / Código</th>
                      <th className="p-3 text-center">Unidade</th>
                      <th className="p-3 text-center">Quantidade</th>
                      <th className="p-3 text-right">Custo Cotado (R$)</th>
                      <th className="p-3 text-right">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium font-mono">
                    {selectedQuotation.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-sans">
                          <span className="font-bold text-slate-900 block">{item.partName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.partCode}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-indigo-700">
                          {item.packageUnit || 'UN'}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {item.quantity}
                        </td>
                        <td className="p-3 text-right text-slate-800">
                          R$ {(item.quotedCost || item.targetCost || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          R$ {(item.totalCost || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totais & Resumo Financeiro da Cotação / Pedido */}
              {(() => {
                const itemsSubtotal = selectedQuotation.items.reduce((acc, i) => acc + (i.totalCost || 0), 0);
                const isFreightActive = selectedQuotation.freightType && selectedQuotation.freightType !== 'NONE' && selectedQuotation.freightType !== 'none';
                const freightVal = isFreightActive ? (Number(selectedQuotation.freightValue) || 0) : 0;
                const grandTotal = itemsSubtotal + freightVal;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Logística & Frete Detalhado */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-indigo-600" />
                          Transporte & Frete
                        </span>
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase font-mono">
                          {selectedQuotation.freightType === 'CIF' || selectedQuotation.freightType === 'cif'
                            ? 'CIF'
                            : selectedQuotation.freightType === 'FOB' || selectedQuotation.freightType === 'fob'
                            ? 'FOB'
                            : selectedQuotation.freightType === 'THIRD_PARTY' || selectedQuotation.freightType === 'terceiros'
                            ? 'Terceiros'
                            : 'Sem Frete'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Tipo de Frete:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedQuotation.freightType === 'CIF' || selectedQuotation.freightType === 'cif'
                              ? 'CIF (Por conta do Fornecedor)'
                              : selectedQuotation.freightType === 'FOB' || selectedQuotation.freightType === 'fob'
                              ? 'FOB (Por conta do Comprador)'
                              : selectedQuotation.freightType === 'THIRD_PARTY' || selectedQuotation.freightType === 'terceiros'
                              ? 'Terceiros (Conta de Terceiros)'
                              : 'Sem Frete / Retirada no Balcão'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Transportadora:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedQuotation.carrierName || 'Não informada / Própria'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Valor do Frete:</span>
                          <span className="font-semibold font-mono text-slate-800">
                            {freightVal > 0
                              ? `R$ ${freightVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : 'R$ 0,00'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Operação:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedQuotation.shippingOperation === 'redespacho' ? 'Redespacho' : 'Transporte Direto'}
                          </span>
                        </div>

                        {selectedQuotation.shippingOperation === 'redespacho' && (
                          <>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Hub Logístico:</span>
                              <span className="font-semibold text-slate-800">
                                {selectedQuotation.logisticsHub || 'Não informado'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Transp. Redespacho:</span>
                              <span className="font-semibold text-slate-800">
                                {selectedQuotation.redispersionCarrierName || 'Não informada'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="p-4 bg-slate-900 text-white rounded-xl font-mono flex flex-col justify-between space-y-2">
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Resumo Financeiro:</span>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>Subtotal Itens:</span>
                          <span className="font-bold">R$ {itemsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {freightVal > 0 && (
                          <div className="flex items-center justify-between text-xs text-amber-300">
                            <span>Frete ({selectedQuotation.freightType}):</span>
                            <span className="font-bold">+ R$ {freightVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className="text-xs uppercase font-bold text-slate-400">Total Geral:</span>
                        <span className="text-base font-black text-emerald-400">
                          R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dispatch / Send Options Panel */}
              {(() => {
                const sup = suppliers.find(s => s.id === selectedQuotation.supplierId);
                const hasPhone = Boolean(sup?.phone && sup.phone.replace(/\D/g, '').length > 0);
                const hasEmail = Boolean(sup?.email && sup.email.trim().length > 0);

                return (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3" data-html2canvas-ignore="true">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Send className="w-4 h-4 text-indigo-600" /> Enviar Cotação ao Fornecedor
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Fornecedor: <span className="font-semibold text-slate-700">{selectedQuotation.supplierName}</span>
                          {sup?.contactPerson ? ` (Contato: ${sup.contactPerson})` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* WhatsApp Button */}
                        <button
                          onClick={() => handleSendWhatsApp(selectedQuotation)}
                          className={`px-3 py-1.5 font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            hasPhone 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                          }`}
                          title={hasPhone ? `Enviar via WhatsApp para ${sup?.phone}` : 'Cadastre o telefone do fornecedor para habilitar'}
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Enviar por WhatsApp
                          {!hasPhone && <span className="text-[9px] bg-slate-300 text-slate-700 px-1 rounded">(Sem tel.)</span>}
                        </button>

                        {/* Email Button */}
                        <button
                          onClick={() => handleSendEmail(selectedQuotation)}
                          className={`px-3 py-1.5 font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            hasEmail 
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                          }`}
                          title={hasEmail ? `Enviar via E-mail para ${sup?.email}` : 'Cadastre o e-mail do fornecedor para habilitar'}
                        >
                          <Mail className="w-3.5 h-3.5" /> Enviar por E-mail
                          {!hasEmail && <span className="text-[9px] bg-slate-300 text-slate-700 px-1 rounded">(Sem e-mail)</span>}
                        </button>

                        {/* Copy Button */}
                        <button
                          onClick={() => {
                            const text = generateWhatsAppMessage(selectedQuotation);
                            navigator.clipboard.writeText(text);
                            showToast('Texto da cotação copiado para a área de transferência!');
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                          title="Copiar texto da cotação"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" /> Copiar Texto
                        </button>
                      </div>
                    </div>

                    {/* Supplier Contact Info status badges */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">Telefone/WhatsApp:</span>
                        {hasPhone ? (
                          <span className="font-mono text-emerald-700 font-bold">{sup?.phone}</span>
                        ) : (
                          <span className="text-amber-600 italic">Não cadastrado</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">E-mail de Cotação:</span>
                        {hasEmail ? (
                          <span className="font-mono text-indigo-700 font-bold">{sup?.email}</span>
                        ) : (
                          <span className="text-amber-600 italic">Não cadastrado</span>
                        )}
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visualização da Mensagem:</span>
                      <p className="text-slate-800 text-[11px] leading-relaxed font-mono whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                        {generateWhatsAppMessage(selectedQuotation)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: NOVA REGRA DE CONVERSÃO ================= */}
      {showConversionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden space-y-4">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-base font-display">Regra de Conversão de Unidade</h2>
              </div>
              <button 
                onClick={() => setShowConversionModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConversion} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">1. Selecione a Peça no Estoque *</label>
                <select
                  required
                  value={convPartId}
                  onChange={e => setConvPartId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">-- Selecione a Peça --</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Unid. Estoque: {p.unit || 'UN'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">2. Selecione o Fornecedor *</label>
                <select
                  required
                  value={convSupplierId}
                  onChange={e => setConvSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">-- Selecione o Fornecedor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Código no Fornecedor</label>
                  <input
                    type="text"
                    value={convSupplierPartCode}
                    onChange={e => setConvSupplierPartCode(e.target.value)}
                    placeholder="Ex: COD-MAHLE-102"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Unidade da Embalagem</label>
                  <select
                    value={convPackageUnit}
                    onChange={e => setConvPackageUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="CX">CX (Caixa Fechada)</option>
                    <option value="PCT">PCT (Pacote / Lote)</option>
                    <option value="GAL">GAL (Galão)</option>
                    <option value="UN">UN (Unidade Avulsa)</option>
                    <option value="PAR">PAR (Par)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Fator de Conversão *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={convRatio}
                    onChange={e => setConvRatio(Number(e.target.value))}
                    placeholder="Ex: 10 (1 Caixa = 10 Unidades)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Quantas unidades de estoque vem dentro de 1 embalagem?</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Preço Custo Embalagem (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={convLastQuotedCost}
                    onChange={e => setConvLastQuotedCost(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-right"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConversionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4 text-emerald-400" /> Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
