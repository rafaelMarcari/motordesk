/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MÓDULO DE CONTAS A PAGAR, GESTÃO DE BOLETOS, NOTAS FISCAIS E BAIXAS DE PARCELAS
 */

import React, { useState, useRef, useMemo } from 'react';
import { 
  Plus, Search, DollarSign, AlertCircle, CheckCircle, 
  CreditCard, Calendar, X, FileText, ArrowDownRight, Tag, Eye,
  Upload, Paperclip, Receipt, FileCode, Check, Copy, Download,
  Layers, Clock, ArrowRight, ShieldCheck, ChevronDown, ChevronUp,
  FileCheck, Printer, FileSpreadsheet, CheckSquare, Square, Trash2,
  FolderPlus, UserCheck, Calculator, Sparkles, CheckCheck
} from 'lucide-react';
import { 
  AccountPayable, 
  AccountInstallment, 
  AccountPayableAttachment, 
  Supplier, 
  User, 
  FinancialTransaction,
  ExpenseCategoryItem 
} from '../types';
import { AppDatabase } from '../data/mockData';
import { getBankMetadata } from '../utils/boletoEngine';
import { calculateEmployeeCommission } from '../utils/commissionEngine';
import AccountPayableDocumentModal from './AccountPayableDocumentModal';
import AccountPayableSettleModal from './AccountPayableSettleModal';
import { RepresentativeReconciliationSplitModal } from './RepresentativeReconciliationSplitModal';

interface AccountsPayableViewProps {
  db: AppDatabase;
  currentUser: User;
  onSavePayables: (payables: AccountPayable[], transactions: FinancialTransaction[], categories?: ExpenseCategoryItem[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
  onSaveFullDatabase?: (updatedDb: AppDatabase) => void;
}

export default function AccountsPayableView({
  db,
  currentUser,
  onSavePayables,
  onAddHistoryLog,
  setUnsavedTask,
  onSaveFullDatabase
}: AccountsPayableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_paid' | 'paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<AccountPayable | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isSplitReconciliationOpen, setIsSplitReconciliationOpen] = useState(false);

  // Multi-Selection & Batch Payment State
  const [selectedPayableIds, setSelectedPayableIds] = useState<string[]>([]);
  const [isBatchPayModalOpen, setIsBatchPayModalOpen] = useState(false);
  const [batchPayDate, setBatchPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchPaymentMethod, setBatchPaymentMethod] = useState('PIX');
  const [batchBankAccount, setBatchBankAccount] = useState('Conta Corrente Principal');
  const [batchReceiptNotes, setBatchReceiptNotes] = useState('');

  // Category Management State
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategoryItem | null>(null);

  // New Payable Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [supplierCnpj, setSupplierCnpj] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Peças / Fornecedores');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Employee Selection for Payroll / Commission
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  // Fiscal & Boleto Extra Fields
  const [nfeNumber, setNfeNumber] = useState('');
  const [nfeSeries, setNfeSeries] = useState('1');
  const [nfeAccessKey, setNfeAccessKey] = useState('');
  const [boletoLinhaDigitavel, setBoletoLinhaDigitavel] = useState('');
  const [boletoBarcode, setBoletoBarcode] = useState('');
  const [boletoBankName, setBoletoBankName] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('');
  const [formAttachments, setFormAttachments] = useState<AccountPayableAttachment[]>([]);
  const [customInstallments, setCustomInstallments] = useState<AccountInstallment[]>([]);

  // Expanded Row IDs (for viewing installments inline in table)
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const xmlFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const payables = db.accountsPayable || [];
  const suppliers = db.suppliers || [];

  // Dynamic Categories (from db or system defaults)
  const categoriesList: ExpenseCategoryItem[] = useMemo(() => {
    if (db.expenseCategories && db.expenseCategories.length > 0) {
      return db.expenseCategories;
    }
    return [
      { id: 'cat-pecas', name: 'Peças / Fornecedores', color: '#3b82f6', isSystemDefault: true },
      { id: 'cat-salarios', name: 'Salários & Comissões', color: '#10b981', isSystemDefault: true },
      { id: 'cat-aluguel', name: 'Aluguel do Imóvel', color: '#8b5cf6', isSystemDefault: true },
      { id: 'cat-energia', name: 'Energia / Água / Internet', color: '#f59e0b', isSystemDefault: true },
      { id: 'cat-ferramentas', name: 'Ferramentas & Equipamentos', color: '#6366f1', isSystemDefault: true },
      { id: 'cat-impostos', name: 'Impostos & Taxas', color: '#ef4444', isSystemDefault: true },
      { id: 'cat-marketing', name: 'Marketing & Anúncios', color: '#ec4899', isSystemDefault: true },
      { id: 'cat-manutencao', name: 'Manutenção da Oficina', color: '#14b8a6', isSystemDefault: true },
      { id: 'cat-outras', name: 'Outras Despesas', color: '#64748b', isSystemDefault: true }
    ];
  }, [db.expenseCategories]);

  // Active Company Employees
  const activeEmployees = useMemo(() => {
    const userCompany = currentUser.companyId || 'comp-1';
    return (db.users || []).filter(u => u.active !== false && (!u.companyId || u.companyId === userCompany));
  }, [db.users, currentUser.companyId]);

  // Commission Calculation for Selected Employee
  const selectedEmployeeCommissionData = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const emp = activeEmployees.find(u => u.id === selectedEmployeeId);
    if (!emp) return null;
    const currentMonth = new Date().toISOString().slice(0, 7);
    return calculateEmployeeCommission(emp, db, currentMonth);
  }, [selectedEmployeeId, activeEmployees, db]);

  // Helper to toggle expanded row
  const toggleRowExpansion = (id: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter List
  const filteredPayables = payables.filter(item => {
    const matchesSearch = item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.nfeNumber && item.nfeNumber.includes(searchQuery)) ||
      (item.boletoLinhaDigitavel && item.boletoLinhaDigitavel.includes(searchQuery));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCat;
  });

  // Calculate Totals
  const totalPayable = payables.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPaid = payables.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalRemaining = payables.reduce((sum, item) => sum + item.remainingAmount, 0);

  // Selected Payables Sum
  const selectedPayablesSum = useMemo(() => {
    return payables
      .filter(p => selectedPayableIds.includes(p.id))
      .reduce((sum, p) => sum + (p.remainingAmount > 0 ? p.remainingAmount : p.totalAmount), 0);
  }, [payables, selectedPayableIds]);

  const resetForm = () => {
    setSupplierId('');
    setSupplierNameInput('');
    setSupplierCnpj('');
    setDescription('');
    setCategory('Peças / Fornecedores');
    setTotalAmount('');
    setInstallmentsCount('1');
    setFirstDueDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSelectedEmployeeId('');
    setNfeNumber('');
    setNfeSeries('1');
    setNfeAccessKey('');
    setBoletoLinhaDigitavel('');
    setBoletoBarcode('');
    setBoletoBankName('');
    setPaymentCondition('');
    setFormAttachments([]);
    setCustomInstallments([]);
    setErrorMsg('');
    setIsFormOpen(false);
    setUnsavedTask(null);
  };

  // Category Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const exists = categoriesList.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase());
    if (exists) {
      setErrorMsg('Esta categoria já existe!');
      return;
    }
    const newCat: ExpenseCategoryItem = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      color: newCategoryColor || '#3b82f6',
      isSystemDefault: false,
      companyId: currentUser.companyId || 'comp-1'
    };
    const updatedCategories = [...categoriesList, newCat];
    onSavePayables(payables, db.financialTransactions || [], updatedCategories);
    setNewCategoryName('');
    setIsNewCategoryModalOpen(false);
    setCategory(newCat.name);
    setCategoryFilter(newCat.name);
    setSuccessMsg(`Categoria "${newCat.name}" cadastrada com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const updatedCategories = categoriesList.filter(c => c.id !== categoryToDelete.id);
    const updatedPayables = payables.map(p => p.category === categoryToDelete.name ? { ...p, category: 'Outras Despesas' } : p);
    onSavePayables(updatedPayables, db.financialTransactions || [], updatedCategories);
    if (categoryFilter === categoryToDelete.name) {
      setCategoryFilter('all');
    }
    setSuccessMsg(`Categoria "${categoryToDelete.name}" removida. Títulos foram reclassificados.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setCategoryToDelete(null);
  };

  // Batch Payment Execution
  const handleConfirmBatchPayment = () => {
    if (selectedPayableIds.length === 0) return;
    const dateToUse = batchPayDate || new Date().toISOString().split('T')[0];
    const methodToUse = batchPaymentMethod || 'PIX';

    const selectedPayables = payables.filter(p => selectedPayableIds.includes(p.id));
    const totalLiquidated = selectedPayables.reduce((acc, p) => acc + (p.remainingAmount > 0 ? p.remainingAmount : p.totalAmount), 0);

    const updatedPayables = payables.map(p => {
      if (!selectedPayableIds.includes(p.id)) return p;
      const updatedInstallments = (p.installments || []).map(inst => ({
        ...inst,
        paidAmount: inst.amount,
        status: 'paid' as const,
        paymentDate: dateToUse,
        paymentMethod: methodToUse,
        receiptNotes: batchReceiptNotes || `Baixa em lote via ${methodToUse} (${currentUser.name})`
      }));

      return {
        ...p,
        paidAmount: p.totalAmount,
        remainingAmount: 0,
        status: 'paid' as const,
        installments: updatedInstallments
      };
    });

    const newTransactions: FinancialTransaction[] = selectedPayables.map(p => ({
      id: `ft-batch-${Date.now()}-${p.id}`,
      type: 'expense',
      category: p.category || 'Despesas Diversas',
      description: `Baixa em Lote: ${p.code} - ${p.supplierName} (${p.description})`,
      amount: p.remainingAmount > 0 ? p.remainingAmount : p.totalAmount,
      date: dateToUse,
      companyId: p.companyId || currentUser.companyId || 'comp-1',
      paymentMethod: methodToUse,
      referenceId: p.id,
      supplierId: p.supplierId,
      createdByName: currentUser.name
    }));

    const updatedTransactions = [...newTransactions, ...(db.financialTransactions || [])];
    onSavePayables(updatedPayables, updatedTransactions, categoriesList);

    onAddHistoryLog(
      'payment',
      'Pagamento em Lote Realizado',
      `Liquidadas ${selectedPayableIds.length} contas a pagar via ${methodToUse}. Total: R$ ${totalLiquidated.toFixed(2)}.`,
      '',
      ''
    );

    setSelectedPayableIds([]);
    setIsBatchPayModalOpen(false);
    setSuccessMsg(`Sucesso: ${selectedPayableIds.length} títulos quitados via ${methodToUse} (Total R$ ${totalLiquidated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})!`);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleOpenNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // Generate Installments Schedule
  const generateInstallments = (total: number, count: number, startDateStr: string): AccountInstallment[] => {
    const list: AccountInstallment[] = [];
    const baseAmount = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - baseAmount * count) * 100) / 100;

    const startDate = new Date(startDateStr);

    for (let i = 1; i <= count; i++) {
      const instDueDate = new Date(startDate);
      instDueDate.setMonth(instDueDate.getMonth() + (i - 1));

      const amount = i === 1 ? baseAmount + remainder : baseAmount;

      list.push({
        id: `parc-p-${Date.now()}-${i}`,
        installmentNumber: i,
        totalInstallments: count,
        amount: amount,
        paidAmount: 0,
        dueDate: instDueDate.toISOString().split('T')[0],
        status: 'pending',
        boletoLinhaDigitavel: boletoLinhaDigitavel || undefined,
        boletoBarcode: boletoBarcode || undefined,
        boletoBankName: boletoBankName || undefined
      });
    }

    return list;
  };

  // XML NF-e File Parser
  const handleXmlImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const xmlContent = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
          setErrorMsg('O arquivo fornecido não é um XML de NF-e válido.');
          return;
        }

        // 1. Supplier Name & CNPJ
        let supName = '';
        let supCnpj = '';
        const emitEl = xmlDoc.querySelector('emit');
        if (emitEl) {
          supName = emitEl.querySelector('xNome')?.textContent || emitEl.querySelector('xFant')?.textContent || '';
          supCnpj = emitEl.querySelector('CNPJ')?.textContent || emitEl.querySelector('CPF')?.textContent || '';
        }

        // 2. Invoice Number, Series & Access Key
        const ideEl = xmlDoc.querySelector('ide');
        let nNF = ideEl?.querySelector('nNF')?.textContent || '';
        let serie = ideEl?.querySelector('serie')?.textContent || '1';
        
        const infNFeEl = xmlDoc.querySelector('infNFe');
        let accessKey = infNFeEl?.getAttribute('Id')?.replace(/\D/g, '') || '';

        // 3. Total Amount
        const vNF = xmlDoc.querySelector('total ICMSTot vNF')?.textContent || '0';
        const totalVal = parseFloat(vNF) || 0;

        // 4. Duplicate Installments (<cobr><dup>)
        const dupEls = xmlDoc.querySelectorAll('cobr dup');
        const extractedInstallments: AccountInstallment[] = [];

        if (dupEls.length > 0) {
          dupEls.forEach((dup, idx) => {
            const nDup = dup.querySelector('nDup')?.textContent || String(idx + 1);
            const dVenc = dup.querySelector('dVenc')?.textContent || new Date().toISOString().split('T')[0];
            const vDup = parseFloat(dup.querySelector('vDup')?.textContent || '0') || (totalVal / dupEls.length);

            extractedInstallments.push({
              id: `parc-xml-${Date.now()}-${idx + 1}`,
              installmentNumber: idx + 1,
              totalInstallments: dupEls.length,
              amount: vDup,
              paidAmount: 0,
              dueDate: dVenc,
              status: 'pending',
              nfeNumber: nNF
            });
          });
        }

        // Apply Extracted Data to Form
        if (supName) setSupplierNameInput(supName);
        if (supCnpj) setSupplierCnpj(supCnpj);
        if (nNF) setNfeNumber(nNF);
        if (serie) setNfeSeries(serie);
        if (accessKey) setNfeAccessKey(accessKey);
        if (totalVal > 0) setTotalAmount(totalVal.toFixed(2));
        setDescription(`Compra de Peças / Insumos - NF-e #${nNF} (${supName})`);
        setCategory('Peças / Fornecedores');

        if (extractedInstallments.length > 0) {
          setInstallmentsCount(String(extractedInstallments.length));
          setFirstDueDate(extractedInstallments[0].dueDate);
          setCustomInstallments(extractedInstallments);
          setPaymentCondition(`${extractedInstallments.length}x Duplicatas NF-e`);
        }

        // Add XML file to attachments
        const xmlAttachment: AccountPayableAttachment = {
          id: `att-xml-${Date.now()}`,
          name: file.name,
          type: 'nfe',
          fileSize: `${Math.round(file.size / 1024)} KB`,
          uploadedAt: new Date().toISOString(),
          uploadedByName: currentUser.name,
          nfeNumber: nNF,
          nfeAccessKey: accessKey,
          amount: totalVal
        };

        setFormAttachments(prev => [xmlAttachment, ...prev]);
        setSuccessMsg(`XML da NF-e #${nNF} importado com sucesso! Dados do fornecedor e ${extractedInstallments.length || 1} duplicata(s) carregados.`);
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err) {
        console.error('Erro ao ler XML:', err);
        setErrorMsg('Falha ao processar arquivo XML.');
      }
    };

    reader.readAsText(file);
  };

  // Linha Digitável Parser (Detect Bank & Due Date)
  const handleLinhaDigitavelChange = (val: string) => {
    setBoletoLinhaDigitavel(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 3) {
      const bankCode = clean.slice(0, 3);
      const meta = getBankMetadata(bankCode);
      setBoletoBankName(meta.name);
    }
  };

  // General Attachment Upload in Form
  const handleFormAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      const sizeFormatted = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      const newAtt: AccountPayableAttachment = {
        id: `att-form-${Date.now()}`,
        name: file.name,
        type: file.name.toLowerCase().includes('nfe') || file.name.toLowerCase().includes('danfe') ? 'nfe' : 'boleto',
        fileUrl: result,
        fileType: file.type,
        fileSize: sizeFormatted,
        uploadedAt: new Date().toISOString(),
        uploadedByName: currentUser.name
      };

      setFormAttachments(prev => [...prev, newAtt]);
    };

    reader.readAsDataURL(file);
  };

  // Save New Payable
  const handleSavePayable = (e: React.FormEvent) => {
    e.preventDefault();
    let nameToUse = supplierNameInput.trim();
    if (supplierId) {
      const sup = suppliers.find(s => s.id === supplierId);
      if (sup) nameToUse = sup.name;
    }

    if (!nameToUse) {
      setErrorMsg('Informe o nome do Fornecedor ou Beneficiário.');
      return;
    }

    const val = parseFloat(totalAmount);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    const numInstallments = parseInt(installmentsCount) || 1;
    const newCode = `CP-${new Date().getFullYear()}-${String(payables.length + 1).padStart(3, '0')}`;
    
    // Use custom installments if loaded from XML, otherwise generate
    const finalInstallments = customInstallments.length > 0 && customInstallments.length === numInstallments
      ? customInstallments
      : generateInstallments(val, numInstallments, firstDueDate);

    const newPayable: AccountPayable = {
      id: `cp-${Date.now()}`,
      code: newCode,
      supplierId: supplierId || undefined,
      supplierName: nameToUse,
      description: description.trim() || `Despesa com ${category}`,
      category: category,
      totalAmount: val,
      paidAmount: 0,
      remainingAmount: val,
      status: 'pending',
      dueDate: finalInstallments[finalInstallments.length - 1].dueDate,
      createdAt: new Date().toISOString(),
      installments: finalInstallments,
      notes: notes.trim() ? notes : undefined,
      nfeNumber: nfeNumber.trim() || undefined,
      nfeSeries: nfeSeries.trim() || undefined,
      nfeAccessKey: nfeAccessKey.trim() || undefined,
      boletoLinhaDigitavel: boletoLinhaDigitavel.trim() || undefined,
      boletoBarcode: boletoBarcode.trim() || undefined,
      boletoBankName: boletoBankName.trim() || undefined,
      paymentCondition: paymentCondition.trim() || (numInstallments > 1 ? `${numInstallments}x Parcelado` : '1x À Vista / Boleto'),
      attachments: formAttachments.length > 0 ? formAttachments : undefined,
      employeeId: selectedEmployeeId || undefined,
      employeeName: selectedEmployeeId ? (activeEmployees.find(u => u.id === selectedEmployeeId)?.name) : undefined,
      commissionMonthRef: selectedEmployeeId ? new Date().toISOString().slice(0, 7) : undefined
    };

    const updatedPayablesList = [newPayable, ...payables];
    onSavePayables(updatedPayablesList, db.financialTransactions || [], categoriesList);
    onAddHistoryLog(
      'payment', 
      'Conta a Pagar Lançada', 
      `Título de despesa ${newCode} no valor de R$ ${val.toFixed(2)} registrado (${category} - ${nameToUse}).`, 
      '', 
      ''
    );

    setSuccessMsg(`Conta a pagar ${newCode} cadastrada com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    resetForm();
  };

  // Open Settle Modal
  const openSettleModal = (item: AccountPayable) => {
    setSelectedPayable(item);
    setIsPayModalOpen(true);
  };

  // Open Document Modal (Boleto / DANFE / PDF)
  const openDocModal = (item: AccountPayable) => {
    setSelectedPayable(item);
    setIsDocModalOpen(true);
  };

  // Open Detail Modal
  const openDetailModal = (item: AccountPayable) => {
    setSelectedPayable(item);
    setIsDetailModalOpen(true);
  };

  // Execute Payment from Settle Modal
  const handleConfirmPayment = (
    payableId: string,
    data: {
      mode: 'installment' | 'total';
      installmentId?: string;
      installmentNumber?: number;
      amountPaid: number;
      paymentDate: string;
      paymentMethod: string;
      bankAccount?: string;
      receiptNotes?: string;
      receiptAttachment?: AccountPayableAttachment;
    }
  ) => {
    const target = payables.find(p => p.id === payableId);
    if (!target) return;

    let updatedInstallments = [...target.installments];
    let remainingToApply = data.amountPaid;

    if (data.mode === 'installment' && data.installmentId) {
      // Settle specific installment
      updatedInstallments = updatedInstallments.map(inst => {
        if (inst.id === data.installmentId) {
          return {
            ...inst,
            paidAmount: inst.amount,
            status: 'paid' as const,
            paymentDate: data.paymentDate,
            paymentMethod: data.paymentMethod,
            receiptNotes: data.receiptNotes,
            paymentReceiptUrl: data.receiptAttachment?.fileUrl,
            paidAt: new Date().toISOString()
          };
        }
        return inst;
      });
    } else {
      // Sequential distribution across unpaid installments
      updatedInstallments = updatedInstallments.map(inst => {
        if (remainingToApply <= 0 || inst.status === 'paid') return inst;

        const instRemaining = inst.amount - inst.paidAmount;
        if (remainingToApply >= instRemaining) {
          remainingToApply -= instRemaining;
          return {
            ...inst,
            paidAmount: inst.amount,
            status: 'paid' as const,
            paymentDate: data.paymentDate,
            paymentMethod: data.paymentMethod,
            receiptNotes: data.receiptNotes,
            paidAt: new Date().toISOString()
          };
        } else {
          const partial = inst.paidAmount + remainingToApply;
          remainingToApply = 0;
          return {
            ...inst,
            paidAmount: partial,
            status: 'partially_paid' as const,
            paymentDate: data.paymentDate,
            paymentMethod: data.paymentMethod,
            receiptNotes: data.receiptNotes
          };
        }
      });
    }

    const newTotalPaid = updatedInstallments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
    const newRemaining = Math.max(0, target.totalAmount - newTotalPaid);
    const allPaid = updatedInstallments.every(inst => inst.status === 'paid');
    const newStatus = allPaid || newRemaining <= 0.01 ? 'paid' : 'partially_paid';

    // Append receipt attachment to payable if provided
    let newAttachments = target.attachments || [];
    if (data.receiptAttachment) {
      newAttachments = [...newAttachments, data.receiptAttachment];
    }

    const updatedPayable: AccountPayable = {
      ...target,
      paidAmount: newTotalPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      installments: updatedInstallments,
      attachments: newAttachments
    };

    const updatedList = payables.map(p => p.id === payableId ? updatedPayable : p);

    // Register Financial Transaction in Cash Flow
    const newTransaction: FinancialTransaction = {
      id: `ft-${Date.now()}`,
      type: 'expense',
      category: target.category,
      description: `Pagamento ${data.installmentNumber ? `Parc. ${data.installmentNumber}` : 'Despesa'} ${target.code} - ${target.supplierName}`,
      amount: data.amountPaid,
      date: new Date(data.paymentDate).toISOString(),
      paymentMethod: data.paymentMethod,
      referenceId: target.id,
      supplierId: target.supplierId,
      createdByName: currentUser.name
    };

    const updatedTransactions = [newTransaction, ...(db.financialTransactions || [])];

    onSavePayables(updatedList, updatedTransactions);
    onAddHistoryLog(
      'payment',
      'Pagamento de Despesa Registrado',
      `Baixa de R$ ${data.amountPaid.toFixed(2)} (${data.paymentMethod}) no título ${target.code} (${target.supplierName}).`,
      '',
      ''
    );

    setSuccessMsg(`Pagamento de R$ ${data.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} efetuado e registrado nas despesas!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Add Attachment to existing payable
  const handleAddAttachment = (payableId: string, attachment: AccountPayableAttachment) => {
    const updatedList = payables.map(p => {
      if (p.id === payableId) {
        const atts = p.attachments || [];
        return {
          ...p,
          attachments: [...atts, attachment]
        };
      }
      return p;
    });

    onSavePayables(updatedList, db.financialTransactions || []);
    if (selectedPayable && selectedPayable.id === payableId) {
      setSelectedPayable(updatedList.find(p => p.id === payableId) || null);
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = (payableId: string, attachmentId: string) => {
    const updatedList = payables.map(p => {
      if (p.id === payableId) {
        const atts = (p.attachments || []).filter(a => a.id !== attachmentId);
        return {
          ...p,
          attachments: atts
        };
      }
      return p;
    });

    onSavePayables(updatedList, db.financialTransactions || []);
    if (selectedPayable && selectedPayable.id === payableId) {
      setSelectedPayable(updatedList.find(p => p.id === payableId) || null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="accounts-payable-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display flex items-center gap-2">
            <ArrowDownRight className="w-6 h-6 text-rose-600" />
            Contas a Pagar & Gestão de Boletos
          </h1>
          <p className="text-sm text-slate-500">
            Controle integrado de despesas, importação de XML de NF-e, visualização/download de boletos em PDF e baixa detalhada de parcelas.
          </p>
        </div>
        {!isFormOpen && (
          <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2.5">
            <button
              id="btn-open-reconciliation"
              type="button"
              onClick={() => setIsSplitReconciliationOpen(true)}
              className="flex items-center justify-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Conciliar Planilha da Representada</span>
            </button>
            <button 
              id="btn-add-payable"
              type="button"
              onClick={handleOpenNewForm} 
              className="flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lançar Conta a Pagar / Importar NF-e
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="payables-kpis">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Despesas Lançadas</p>
            <p className="text-lg font-bold text-slate-800 font-mono">
              R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Despesas Pagas</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Saldo Restante a Pagar</p>
            <p className="text-lg font-bold text-rose-600 font-mono">
              R$ {totalRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="payables-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl flex items-center gap-2 border border-emerald-200 animate-slide-up">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* FORM SECTION (LANÇAMENTO & IMPORTAÇÃO DE XML / BOLETOS) */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-xl animate-slide-up space-y-6" id="payable-form-panel">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 font-display text-base">
                Lançamento de Despesa, Importação de XML & Boletos
              </h3>
            </div>
            <button 
              id="btn-close-payable-form"
              onClick={resetForm} 
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div id="payable-error-alert" className="p-4 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <p className="font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Quick Import Box: XML de NF-e */}
          <div className="bg-gradient-to-r from-rose-50/70 to-indigo-50/70 p-4 rounded-2xl border border-rose-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Importar XML da Nota Fiscal (NF-e de Compra)
                </h4>
                <p className="text-xs text-slate-500">
                  Carrega automaticamente o fornecedor, CNPJ, valor total, número da nota e duplicatas/parcelas de cobrança.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <input
                type="file"
                ref={xmlFileInputRef}
                onChange={handleXmlImport}
                accept=".xml"
                className="hidden"
                id="xml-nfe-input"
              />
              <button
                type="button"
                onClick={() => xmlFileInputRef.current?.click()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" /> Selecionar XML NF-e
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSavePayable} className="grid grid-cols-1 md:grid-cols-2 gap-4" id="form-payable">
            
            {/* Fornecedor */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fornecedor / Favorecido *</label>
              {suppliers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select 
                    id="payable-supplier-select"
                    value={supplierId}
                    onChange={e => {
                      setSupplierId(e.target.value);
                      const selectedSup = suppliers.find(s => s.id === e.target.value);
                      if (selectedSup) {
                        setSupplierNameInput(selectedSup.name);
                        setSupplierCnpj(selectedSup.cnpjCpf || '');
                      }
                    }}
                    className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-medium"
                  >
                    <option value="">-- Selecione do Cadastro de Fornecedores --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.cnpjCpf})</option>
                    ))}
                  </select>

                  <input 
                    type="text"
                    value={supplierNameInput}
                    onChange={e => { setSupplierNameInput(e.target.value); setSupplierId(''); }}
                    placeholder="Ou digite o nome do Fornecedor / Empresa"
                    className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-medium"
                    required
                  />
                </div>
              ) : (
                <input 
                  id="payable-supplier-input"
                  type="text" 
                  value={supplierNameInput}
                  onChange={e => setSupplierNameInput(e.target.value)}
                  placeholder="Nome da empresa ou fornecedor (Ex: Enel Energia, AutoPeças Brasil)" 
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-medium"
                  required
                />
              )}
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Categoria da Despesa *</label>
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(true)}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Nova Categoria
                </button>
              </div>
              <select 
                id="payable-category-select"
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  if (!e.target.value.toLowerCase().includes('salário') && !e.target.value.toLowerCase().includes('comiss')) {
                    setSelectedEmployeeId('');
                  }
                }}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-semibold"
              >
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* SELEÇÃO DE COLABORADOR & CÁLCULO DE COMISSÃO / FOLHA */}
            {(category.toLowerCase().includes('salário') || category.toLowerCase().includes('comiss')) && (
              <div className="col-span-1 md:col-span-2 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in" id="employee-payroll-box">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        Vincular Colaborador / Vendedor & Apuração de Comissões
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        O sistema apura automaticamente o volume do mês ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}) e sugere os valores para pagamento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Selecionar Colaborador *</label>
                    <select
                      id="payable-employee-select"
                      value={selectedEmployeeId}
                      onChange={e => {
                        const empId = e.target.value;
                        setSelectedEmployeeId(empId);
                        const emp = activeEmployees.find(u => u.id === empId);
                        if (emp) {
                          setSupplierNameInput(emp.name);
                          const commData = calculateEmployeeCommission(emp, db, new Date().toISOString().slice(0, 7));
                          const suggested = commData.suggestedTotalPayout > 0 ? commData.suggestedTotalPayout : (emp.baseSalary || 0);
                          if (suggested > 0) setTotalAmount(suggested.toFixed(2));
                          setDescription(`Pagamento Salário / Comissões - ${emp.name} (${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`);
                          setNotes(`Beneficiário: ${emp.name} | Cargo: ${emp.jobTitle || emp.role} | PIX: ${emp.pixKey || 'Não cadastrado'} (${emp.pixKeyType || 'Chave'}) ${emp.bankName ? `| Banco: ${emp.bankName} Ag: ${emp.bankAgency} CC: ${emp.bankAccount}` : ''}`);
                        }
                      }}
                      className="w-full text-xs px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-hidden focus:border-emerald-600 font-semibold text-slate-800"
                    >
                      <option value="">-- Escolha um colaborador --</option>
                      {activeEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.jobTitle || emp.role.toUpperCase()}) - {emp.commissionPercent || 0}% comissão
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedEmployeeCommissionData && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1 font-sans">
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Cargo / Perfil:</span>
                        <span className="font-bold text-slate-800">{selectedEmployeeCommissionData.user.jobTitle || selectedEmployeeCommissionData.user.role}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Salário Base:</span>
                        <span className="font-mono font-bold text-slate-800">R$ {selectedEmployeeCommissionData.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Comissão Cadastrada:</span>
                        <span className="font-bold text-emerald-700">{selectedEmployeeCommissionData.commissionPercent}% (Base: {selectedEmployeeCommissionData.commissionType})</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Volume Produzido no Mês:</span>
                        <span className="font-mono font-semibold text-slate-700">R$ {selectedEmployeeCommissionData.totalVolumeEligible.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-900 pt-1 border-t border-slate-100">
                        <span>Comissão Acumulada no Mês:</span>
                        <span className="font-mono text-emerald-700 text-sm">R$ {selectedEmployeeCommissionData.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sugestões de Valor com 1 Clique */}
                {selectedEmployeeCommissionData && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-emerald-900 uppercase">Sugestões de Pagamento (Clique para preencher o valor):</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTotalAmount(selectedEmployeeCommissionData.totalCommission.toFixed(2));
                          setDescription(`Pagamento de Comissões - ${selectedEmployeeCommissionData.user.name} (${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Usar Somente Comissão: R$ {selectedEmployeeCommissionData.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </button>

                      {selectedEmployeeCommissionData.baseSalary > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTotalAmount(selectedEmployeeCommissionData.baseSalary.toFixed(2));
                            setDescription(`Pagamento de Salário Base - ${selectedEmployeeCommissionData.user.name} (${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          Usar Salário Base: R$ {selectedEmployeeCommissionData.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setTotalAmount(selectedEmployeeCommissionData.suggestedTotalPayout.toFixed(2));
                          setDescription(`Salário Base + Comissões - ${selectedEmployeeCommissionData.user.name} (${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Usar Total Geral Sugerido: R$ {selectedEmployeeCommissionData.suggestedTotalPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Descrição da Conta *</label>
              <input 
                id="payable-description-input"
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Lote de Amortecedores e Óleo NFe #5502" 
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-medium"
                required
              />
            </div>

            {/* Valor Total */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Valor Total (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input 
                  id="payable-amount-input"
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="850.00" 
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-mono font-bold text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Parcelamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Parcelamento & Boletos *</label>
              <select 
                id="payable-installments-select"
                value={installmentsCount}
                onChange={e => {
                  setInstallmentsCount(e.target.value);
                  setCustomInstallments([]);
                }}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-semibold"
              >
                <option value="1">1x Parcela Única / Boleto À Vista</option>
                <option value="2">2x Parcelado (2 Boletos)</option>
                <option value="3">3x Parcelado (3 Boletos)</option>
                <option value="4">4x Parcelado (4 Boletos)</option>
                <option value="5">5x Parcelado (5 Boletos)</option>
                <option value="6">6x Parcelado (6 Boletos)</option>
                <option value="12">12x Parcelado (12 Boletos)</option>
              </select>
            </div>

            {/* Vencimento da 1ª Parcela */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vencimento da 1ª Parcela *</label>
              <input 
                id="payable-due-date-input"
                type="date" 
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-mono font-semibold"
                required
              />
            </div>

            {/* Linha Digitável do Boleto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Linha Digitável do Boleto (47/48 dígitos)</span>
                {boletoBankName && <span className="text-rose-600 font-semibold">{boletoBankName}</span>}
              </label>
              <input 
                id="payable-linha-digitavel-input"
                type="text" 
                value={boletoLinhaDigitavel}
                onChange={e => handleLinhaDigitavelChange(e.target.value)}
                placeholder="Ex: 34191.09008 00000.123450 00000.000000 1 98760000045000" 
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-mono"
              />
            </div>

            {/* Dados Fiscais da NF-e (Opcional) */}
            <div className="space-y-1.5 sm:col-span-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block">Número da NF-e</label>
                <input
                  type="text"
                  value={nfeNumber}
                  onChange={e => setNfeNumber(e.target.value)}
                  placeholder="Ex: 5502"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block">Série</label>
                <input
                  type="text"
                  value={nfeSeries}
                  onChange={e => setNfeSeries(e.target.value)}
                  placeholder="1"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block">Chave de Acesso (44 dígitos)</label>
                <input
                  type="text"
                  value={nfeAccessKey}
                  onChange={e => setNfeAccessKey(e.target.value.replace(/\D/g, ''))}
                  placeholder="3526071234567800019055001..."
                  maxLength={44}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            {/* Anexos (PDFs de Boletos, Imagens, Recibos) */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-rose-500" /> Anexos de Boletos e Notas Fiscais (PDF / Imagem)
                </label>
                <input
                  type="file"
                  ref={attachmentInputRef}
                  onChange={handleFormAttachmentUpload}
                  accept=".pdf,.png,.jpg,.jpeg,.xml"
                  className="hidden"
                  id="doc-attachment-input"
                />
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" /> Anexar Arquivo
                </button>
              </div>

              {formAttachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formAttachments.map((att, idx) => (
                    <div key={att.id || idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({att.fileSize || 'PDF'})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Nenhum arquivo anexado ainda. Você pode anexar boletos em PDF para visualização e download posterior.
                </p>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Observações Gerais</label>
              <input 
                id="payable-notes-input"
                type="text" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Boleto com 5% de desconto para pagamento até o dia 05." 
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 font-medium"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3 col-span-1 md:col-span-2">
              <button 
                id="btn-save-payable-submit"
                type="submit" 
                className="bg-rose-600 text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-rose-700 transition cursor-pointer shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Salvar Conta a Pagar
              </button>
              <button 
                id="btn-cancel-payable"
                type="button" 
                onClick={resetForm} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-5 py-3 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MAIN TABLE & CONTROLS */}
      {!isFormOpen && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden" id="payables-list-panel">
          
          {/* SPREADSHEET-STYLE CATEGORY TABS ("como se fosse um título de planilha") */}
          <div className="border-b border-slate-200 bg-slate-100/90 px-3 pt-2.5 flex items-center gap-1.5 overflow-x-auto select-none" id="payable-spreadsheet-tabs">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-t-2 shrink-0 cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white text-rose-700 border-rose-600 shadow-xs'
                  : 'bg-slate-200/70 hover:bg-white/70 text-slate-600 border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Todas as Despesas</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 font-mono text-slate-700">
                {payables.length}
              </span>
            </button>

            {categoriesList.map(cat => {
              const isSelected = categoryFilter === cat.name;
              const catPayables = payables.filter(p => p.category === cat.name);
              const catTotal = catPayables.reduce((acc, p) => acc + (p.remainingAmount > 0 ? p.remainingAmount : p.totalAmount), 0);

              return (
                <div
                  key={cat.id}
                  className={`group relative flex items-center rounded-t-xl transition border-t-2 shrink-0 ${
                    isSelected
                      ? 'bg-white text-slate-900 border-rose-600 shadow-xs'
                      : 'bg-slate-200/70 hover:bg-white/70 text-slate-600 border-transparent'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(cat.name)}
                    className="px-3 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#64748b' }}
                    />
                    <span className="whitespace-nowrap">{cat.name}</span>
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 font-mono text-slate-700">
                      {catPayables.length}
                    </span>
                    {catTotal > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 hidden lg:inline">
                        R$ {catTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </button>

                  {/* Botão de excluir categoria customizada */}
                  {!cat.isSystemDefault && (
                    <button
                      type="button"
                      title={`Remover categoria "${cat.name}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToDelete(cat);
                      }}
                      className="pr-2 text-slate-400 hover:text-rose-600 opacity-60 hover:opacity-100 transition p-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Cadastrar Nova Aba/Categoria */}
            <button
              type="button"
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-white/80 rounded-t-xl transition flex items-center gap-1.5 border-t-2 border-transparent shrink-0 cursor-pointer"
              title="Cadastrar Nova Categoria de Despesa"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Nova Categoria</span>
            </button>
          </div>

          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="payable-search-input"
                type="text" 
                placeholder="Buscar por fornecedor, código (CP-001), NF-e ou descrição..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                id="payable-category-filter"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition font-semibold"
              >
                <option value="all">Todas as Categorias</option>
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>

              <select
                id="payable-status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition font-semibold"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="partially_paid">Parcialmente Pagas</option>
                <option value="paid">Quitadas</option>
              </select>
            </div>
          </div>

          {/* BARRA DE AÇÃO EM LOTE PARA SELEÇÃO & PAGAMENTO */}
          {selectedPayableIds.length > 0 && (
            <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in" id="batch-selection-bar">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedPayableIds.length}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {selectedPayableIds.length} conta(s) selecionada(s)
                  </p>
                  <p className="text-xs text-rose-700 font-mono font-bold">
                    Total Selecionado: R$ {selectedPayablesSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchPayModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Fazer Pagamento das Selecionadas ({selectedPayableIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayableIds([])}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Desmarcar Todas
                </button>
              </div>
            </div>
          )}

          {/* Payables Table */}
          {filteredPayables.length === 0 ? (
            <div className="p-12 text-center text-slate-400" id="payables-empty-state">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600 text-sm">Nenhuma conta a pagar encontrada com os filtros atuais.</p>
              <p className="text-xs text-slate-400">Clique no botão "Lançar Conta a Pagar" para registrar novas despesas ou boletos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="payables-table">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        aria-label="Selecionar todas as contas visíveis"
                        checked={filteredPayables.length > 0 && filteredPayables.every(p => selectedPayableIds.includes(p.id))}
                        onChange={e => {
                          if (e.target.checked) {
                            const visibleIds = filteredPayables.map(p => p.id);
                            setSelectedPayableIds(Array.from(new Set([...selectedPayableIds, ...visibleIds])));
                          } else {
                            const visibleIds = new Set(filteredPayables.map(p => p.id));
                            setSelectedPayableIds(selectedPayableIds.filter(id => !visibleIds.has(id)));
                          }
                        }}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Código / Fornecedor</th>
                    <th className="p-4">Despesa & Documentos</th>
                    <th className="p-4">Parcelamento & Status</th>
                    <th className="p-4">Valor Total</th>
                    <th className="p-4">Pago / Saldo</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredPayables.map(item => {
                    const isPaid = item.status === 'paid';
                    const isPartial = item.status === 'partially_paid';
                    const isExpanded = Boolean(expandedRowIds[item.id]);

                    const installments = item.installments || [];
                    const paidCount = installments.filter(inst => inst.status === 'paid').length;
                    const totalInst = installments.length || 1;

                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-slate-50/60 transition duration-150" id={`payable-row-${item.id}`}>
                          
                          {/* Checkbox de Seleção */}
                          <td className="p-4 align-top text-center">
                            <input
                              type="checkbox"
                              aria-label={`Selecionar conta ${item.code}`}
                              checked={selectedPayableIds.includes(item.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedPayableIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedPayableIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                            />
                          </td>

                          {/* Código & Fornecedor */}
                          <td className="p-4 align-top">
                            <p className="font-mono text-xs font-black text-rose-600">{item.code}</p>
                            <p className="font-bold text-slate-900 text-sm">{item.supplierName}</p>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Criado em: {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </td>

                          {/* Categoria, Descrição, Tags de Documento & Vínculo de Colaborador */}
                          <td className="p-4 align-top space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md">
                                <Tag className="w-3 h-3 text-slate-400" /> {item.category}
                              </span>

                              {item.employeeName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold rounded-md">
                                  <UserCheck className="w-3 h-3 text-emerald-600" /> Colaborador: {item.employeeName}
                                </span>
                              )}

                              {item.nfeNumber && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold rounded-md">
                                  <FileCode className="w-3 h-3" /> NF-e #{item.nfeNumber}
                                </span>
                              )}

                              {(item.boletoLinhaDigitavel || item.boletoBarcode) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-md">
                                  <Receipt className="w-3 h-3" /> Boleto {item.boletoBankName ? `(${item.boletoBankName})` : ''}
                                </span>
                              )}

                              {item.attachments && item.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-md">
                                  <Paperclip className="w-3 h-3" /> {item.attachments.length} Anexo(s)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600">{item.description}</p>
                          </td>

                          {/* Parcelamento & Status das Parcelas */}
                          <td className="p-4 align-top space-y-2">
                            {/* Visual Progress Pill */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">
                                {paidCount} de {totalInst} Parcela(s) Paga(s)
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-500">
                                {Math.round((paidCount / totalInst) * 100)}%
                              </span>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  isPaid ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.round((paidCount / totalInst) * 100))}%` }}
                              />
                            </div>

                            {/* Individual Installment Status Chips */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {installments.map((inst) => {
                                const isInstPaid = inst.status === 'paid';
                                const isInstOverdue = !isInstPaid && new Date(inst.dueDate + 'T23:59:59Z') < new Date();

                                return (
                                  <span
                                    key={inst.id}
                                    title={`Parcela ${inst.installmentNumber}: R$ ${inst.amount.toFixed(2)} - Venc: ${inst.dueDate}${isInstPaid ? ` (Pago via ${inst.paymentMethod || 'PIX'})` : ''}`}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                                      isInstPaid
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : isInstOverdue
                                        ? 'bg-red-50 text-red-800 border-red-300 animate-pulse'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    <span>P{inst.installmentNumber}:</span>
                                    {isInstPaid ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    ) : (
                                      <span>R$ {inst.amount.toFixed(0)}</span>
                                    )}
                                  </span>
                                );
                              })}

                              {installments.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpansion(item.id)}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold ml-1 flex items-center cursor-pointer"
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Valor Total */}
                          <td className="p-4 align-top font-mono font-bold text-slate-900 text-sm">
                            R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Pago / Saldo Restante */}
                          <td className="p-4 align-top font-mono text-xs">
                            <p className="text-emerald-600 font-bold">
                              Pago: R$ {item.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className={`font-bold ${item.remainingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              Resta: R$ {item.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </td>

                          {/* Botões de Ação */}
                          <td className="p-4 align-top text-right space-y-1.5">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              
                              {/* Botão Pagar / Baixar Parcela */}
                              {!isPaid && (
                                <button
                                  id={`btn-settle-payable-${item.id}`}
                                  onClick={() => openSettleModal(item)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Baixar Parcela / Pagar Conta"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Pagar Parcela
                                </button>
                              )}

                              {/* Botão Visualizar Documentos / Baixar PDF */}
                              <button
                                id={`btn-view-doc-${item.id}`}
                                onClick={() => openDocModal(item)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition text-xs flex items-center gap-1 cursor-pointer"
                                title="Visualizar Boleto, DANFE e Baixar em PDF"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-600" /> Documentos / PDF
                              </button>

                              {/* Detalhes do Registro */}
                              <button
                                id={`btn-view-details-${item.id}`}
                                onClick={() => openDetailModal(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Ver Detalhes do Registro"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED SUB-ROW FOR DETAILED INSTALLMENTS */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={6} className="p-4 pl-8 border-b border-slate-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-rose-500" /> Detalhamento das Parcelas ({item.code})
                                </h4>
                                <span className="text-xs text-slate-500 font-mono">
                                  {installments.length} parcela(s) vinculadas
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {installments.map((inst) => {
                                  const isInstPaid = inst.status === 'paid';
                                  const isInstOverdue = !isInstPaid && new Date(inst.dueDate + 'T23:59:59Z') < new Date();

                                  return (
                                    <div
                                      key={inst.id}
                                      className={`p-3 rounded-2xl border text-xs flex flex-col justify-between space-y-1.5 ${
                                        isInstPaid
                                          ? 'bg-emerald-50/60 border-emerald-200'
                                          : isInstOverdue
                                          ? 'bg-red-50/60 border-red-200'
                                          : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between font-bold">
                                        <span>Parcela {inst.installmentNumber} de {inst.totalInstallments}</span>
                                        {isInstPaid ? (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 font-bold">
                                            <Check className="w-2.5 h-2.5" /> Paga
                                          </span>
                                        ) : isInstOverdue ? (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">
                                            Vencida
                                          </span>
                                        ) : (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                                            Em Aberto
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex justify-between font-mono text-slate-700">
                                        <span>Valor:</span>
                                        <span className="font-bold">R$ {inst.amount.toFixed(2)}</span>
                                      </div>

                                      <div className="flex justify-between font-mono text-slate-500 text-[11px]">
                                        <span>Vencimento:</span>
                                        <span>{new Date(inst.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}</span>
                                      </div>

                                      {isInstPaid ? (
                                        <div className="pt-1 border-t border-emerald-200 text-[10px] text-emerald-800 font-mono">
                                          Pago em {inst.paymentDate ? new Date(inst.paymentDate).toLocaleDateString('pt-BR') : '-'} ({inst.paymentMethod || 'PIX'})
                                        </div>
                                      ) : (
                                        <div className="pt-1 border-t border-slate-100 flex justify-end">
                                          <button
                                            type="button"
                                            onClick={() => openSettleModal(item)}
                                            className="text-rose-600 hover:text-rose-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                          >
                                            Dar Baixa <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: VISUALIZADOR DE DOCUMENTOS, BOLETOS & DOWNLOAD PDF */}
      <AccountPayableDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => { setIsDocModalOpen(false); setSelectedPayable(null); }}
        payable={selectedPayable}
        companyInfo={db.companyInfo}
        currentUser={currentUser}
        onAddAttachment={handleAddAttachment}
        onDeleteAttachment={handleDeleteAttachment}
      />

      {/* MODAL: BAIXA E PAGAMENTO DE PARCELAS */}
      <AccountPayableSettleModal
        isOpen={isPayModalOpen}
        onClose={() => { setIsPayModalOpen(false); setSelectedPayable(null); }}
        payable={selectedPayable}
        currentUser={currentUser}
        companyInfo={db.companyInfo}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* MODAL: DETALHES GERAIS DO REGISTRO */}
      {isDetailModalOpen && selectedPayable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-payable-details">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Detalhamento de Despesa • {selectedPayable.code}
                </h3>
                <p className="text-xs text-slate-500">{selectedPayable.description} ({selectedPayable.supplierName})</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex justify-between text-xs font-mono">
                <div>Valor Total: <strong className="text-slate-900">R$ {selectedPayable.totalAmount.toFixed(2)}</strong></div>
                <div className="text-emerald-600 font-bold">Pago: R$ {selectedPayable.paidAmount.toFixed(2)}</div>
                <div className="text-rose-600 font-bold">Resta: R$ {selectedPayable.remainingAmount.toFixed(2)}</div>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                {selectedPayable.installments.map(inst => (
                  <div key={inst.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-700">Parcela {inst.installmentNumber} de {inst.totalInstallments}</p>
                      <p className="text-slate-400 font-mono text-[11px]">Vencimento: {inst.dueDate}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-800">R$ {inst.amount.toFixed(2)}</p>
                      {inst.status === 'paid' ? (
                        <p className="text-emerald-600 font-bold text-[11px] flex items-center gap-1 justify-end">
                          <Check className="w-3 h-3" /> Paga ({inst.paymentMethod})
                        </p>
                      ) : (
                        <p className="text-rose-600 font-bold text-[11px]">Em Aberto</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openDocModal(selectedPayable);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Abrir Documentos & Boletos PDF
              </button>

              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PAGAMENTO EM LOTE */}
      {isBatchPayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-batch-payment">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Liquidar Contas Selecionadas</h3>
                  <p className="text-xs text-slate-500">Baixa coletiva de {selectedPayableIds.length} título(s) no Contas a Pagar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Títulos Selecionados:</span>
                <span className="font-bold text-slate-900">{selectedPayableIds.length} conta(s)</span>
              </div>
              <div className="flex justify-between items-center text-emerald-900 font-bold text-sm pt-1 border-t border-emerald-200">
                <span>Valor Total a Pagar:</span>
                <span className="font-mono text-base text-emerald-700">
                  R$ {selectedPayablesSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Data do Pagamento *</label>
                  <input
                    type="date"
                    value={batchPayDate}
                    onChange={e => setBatchPayDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Forma de Pagamento *</label>
                  <select
                    value={batchPaymentMethod}
                    onChange={e => setBatchPaymentMethod(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="PIX">PIX Instantâneo</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Transferência (TED)">Transferência (TED/DOC)</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro (Caixa Físico)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Conta Bancária de Saída</label>
                <select
                  value={batchBankAccount}
                  onChange={e => setBatchBankAccount(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Conta Corrente Principal">Conta Corrente Principal (Banco Itaú / Santander)</option>
                  <option value="Conta Digital Inter / Nubank">Conta Digital PJ (Inter / Cora)</option>
                  <option value="Caixa Físico da Oficina">Caixa Físico (Balcão)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Observações do Comprovante</label>
                <input
                  type="text"
                  value={batchReceiptNotes}
                  onChange={e => setBatchReceiptNotes(e.target.value)}
                  placeholder="Ex: Pagamento lote autorizado pela gerência via PIX"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchPayModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                Confirmar Baixa em Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA CATEGORIA (ABA DE PLANILHA) */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-new-category">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-800 text-sm">Nova Categoria de Despesa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Nome da Categoria / Título *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Seguros & Licenças, Combustível, TI & Softwares"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-rose-500"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Cor da Aba / Identificador</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={e => setNewCategoryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs text-slate-500 font-mono">{newCategoryColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CATEGORIA */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-delete-category">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Remover Categoria?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja remover a categoria <strong>"{categoryToDelete.name}"</strong>? As contas vinculadas serão reclassificadas como "Outras Despesas".
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPLIT-SCREEN DE CONCILIAÇÃO DA REPRESENTADA (EXCEL) */}
      {isSplitReconciliationOpen && (
        <RepresentativeReconciliationSplitModal
          db={db}
          currentUser={currentUser}
          isOpen={isSplitReconciliationOpen}
          onClose={() => setIsSplitReconciliationOpen(false)}
          onSavePayables={(newPayables, newTransactions) => {
            onSavePayables(newPayables, newTransactions, categoriesList);
          }}
          onSaveFullDatabase={onSaveFullDatabase}
          onAddHistoryLog={onAddHistoryLog}
        />
      )}

    </div>
  );
}
