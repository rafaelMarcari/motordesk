/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Search, DollarSign, AlertCircle, CheckCircle, 
  CreditCard, Calendar, X, FileText, ArrowDownRight, Tag, Eye
} from 'lucide-react';
import { AccountPayable, AccountInstallment, Supplier, User, FinancialTransaction } from '../types';
import { AppDatabase } from '../data/mockData';

interface AccountsPayableViewProps {
  db: AppDatabase;
  currentUser: User;
  onSavePayables: (payables: AccountPayable[], transactions: FinancialTransaction[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

export default function AccountsPayableView({
  db,
  currentUser,
  onSavePayables,
  onAddHistoryLog,
  setUnsavedTask
}: AccountsPayableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_paid' | 'paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<AccountPayable | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New Payable Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierNameInput, setSupplierNameInput] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Peças / Fornecedores');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const payables = db.accountsPayable || [];
  const suppliers = db.suppliers || [];

  const CATEGORIES = [
    'Peças / Fornecedores',
    'Aluguel do Imóvel',
    'Energia / Água / Internet',
    'Ferramentas & Equipamentos',
    'Salários & Comissões',
    'Impostos & Taxas',
    'Marketing & Anúncios',
    'Manutenção da Oficina',
    'Outras Despesas'
  ];

  // Filter List
  const filteredPayables = payables.filter(item => {
    const matchesSearch = item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCat;
  });

  // Calculate Totals
  const totalPayable = payables.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPaid = payables.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalRemaining = payables.reduce((sum, item) => sum + item.remainingAmount, 0);

  const resetForm = () => {
    setSupplierId('');
    setSupplierNameInput('');
    setDescription('');
    setCategory('Peças / Fornecedores');
    setTotalAmount('');
    setInstallmentsCount('1');
    setFirstDueDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setErrorMsg('');
    setIsFormOpen(false);
    setUnsavedTask(null);
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
        status: 'pending'
      });
    }

    return list;
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
    const newInstallments = generateInstallments(val, numInstallments, firstDueDate);

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
      dueDate: newInstallments[newInstallments.length - 1].dueDate,
      createdAt: new Date().toISOString(),
      installments: newInstallments,
      notes: notes.trim() ? notes : undefined
    };

    const updatedPayablesList = [newPayable, ...payables];
    onSavePayables(updatedPayablesList, db.financialTransactions || []);
    onAddHistoryLog('payment', 'Conta a Pagar Lançada', `Título de despesa ${newCode} no valor de R$ ${val.toFixed(2)} registrado (${category}).`, '', '');

    setSuccessMsg(`Conta a pagar ${newCode} cadastrada com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    resetForm();
  };

  // Open Payment Modal
  const openPayModal = (item: AccountPayable) => {
    setSelectedPayable(item);
    setPaymentAmount(String(item.remainingAmount));
    setPaymentMethod('PIX');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setIsPayModalOpen(true);
  };

  // Execute Payment
  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;

    const amountToAbate = parseFloat(paymentAmount);
    if (isNaN(amountToAbate) || amountToAbate <= 0) {
      setErrorMsg('Informe um valor de pagamento maior que zero.');
      return;
    }

    if (amountToAbate > selectedPayable.remainingAmount + 0.01) {
      setErrorMsg(`O valor informado (R$ ${amountToAbate.toFixed(2)}) ultrapassa o saldo restante (R$ ${selectedPayable.remainingAmount.toFixed(2)}).`);
      return;
    }

    const newPaidAmount = selectedPayable.paidAmount + amountToAbate;
    const newRemainingAmount = Math.max(0, selectedPayable.totalAmount - newPaidAmount);
    const newStatus = newRemainingAmount <= 0.01 ? 'paid' : 'partially_paid';

    // Abate installments sequentially
    let remainingToDistribute = amountToAbate;
    const updatedInstallments = selectedPayable.installments.map(inst => {
      if (remainingToDistribute <= 0) return inst;

      const instRemaining = inst.amount - inst.paidAmount;
      if (instRemaining <= 0) return inst;

      if (remainingToDistribute >= instRemaining) {
        remainingToDistribute -= instRemaining;
        return {
          ...inst,
          paidAmount: inst.amount,
          status: 'paid' as const,
          paymentDate: paymentDate,
          paymentMethod: paymentMethod
        };
      } else {
        const partialPaid = inst.paidAmount + remainingToDistribute;
        remainingToDistribute = 0;
        return {
          ...inst,
          paidAmount: partialPaid,
          status: 'partially_paid' as const,
          paymentDate: paymentDate,
          paymentMethod: paymentMethod
        };
      }
    });

    const updatedPayable: AccountPayable = {
      ...selectedPayable,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      installments: updatedInstallments
    };

    const updatedPayablesList = payables.map(p => p.id === selectedPayable.id ? updatedPayable : p);

    // Create Financial Transaction (Cash Flow Expense Entry)
    const newTransaction: FinancialTransaction = {
      id: `ft-${Date.now()}`,
      type: 'expense',
      category: selectedPayable.category,
      description: `Pagamento ${selectedPayable.code} - ${selectedPayable.supplierName}`,
      amount: amountToAbate,
      date: new Date(paymentDate).toISOString(),
      paymentMethod: paymentMethod,
      referenceId: selectedPayable.id,
      supplierId: selectedPayable.supplierId,
      createdByName: currentUser.name
    };

    const updatedTransactions = [newTransaction, ...(db.financialTransactions || [])];

    onSavePayables(updatedPayablesList, updatedTransactions);
    onAddHistoryLog('payment', 'Pagamento de Despesa Registrado', `Saída de R$ ${amountToAbate.toFixed(2)} via ${paymentMethod} referente ao título ${selectedPayable.code} (${selectedPayable.supplierName}).`, '', '');

    setSuccessMsg(`Pagamento de R$ ${amountToAbate.toLocaleString('pt-BR', {minimumFractionDigits: 2})} registrado nas despesas com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setIsPayModalOpen(false);
    setSelectedPayable(null);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="accounts-payable-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display flex items-center gap-2">
            <ArrowDownRight className="w-6 h-6 text-rose-600" />
            Contas a Pagar & Despesas
          </h1>
          <p className="text-sm text-slate-500">
            Controle de boletos, contas de fornecedores, impostos e despesas operacionais da oficina.
          </p>
        </div>
        {!isFormOpen && (
          <button 
            id="btn-add-payable"
            onClick={handleOpenNewForm} 
            className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-rose-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Lançar Conta a Pagar
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="payables-kpis">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Despesas Lançadas</p>
            <p className="text-lg font-bold text-slate-800 font-mono">
              R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Despesas Pagas</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">A Pagar (Saldo Devedor Perto do Vencimento)</p>
            <p className="text-lg font-bold text-rose-600 font-mono">
              R$ {totalRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="payables-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-200 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Form Section */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-md animate-slide-up" id="payable-form-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-semibold text-slate-800 font-display text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-600" />
              Lançamento de Despesa / Conta a Pagar
            </h3>
            <button 
              id="btn-close-payable-form"
              onClick={resetForm} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div id="payable-error-alert" className="mb-4 p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSavePayable} className="grid grid-cols-1 md:grid-cols-2 gap-4" id="form-payable">
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="payable-supplier-select">Fornecedor / Favorecido *</label>
              {suppliers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select 
                    id="payable-supplier-select"
                    value={supplierId}
                    onChange={e => {
                      setSupplierId(e.target.value);
                      const selectedSup = suppliers.find(s => s.id === e.target.value);
                      if (selectedSup) setSupplierNameInput(selectedSup.name);
                    }}
                    className="text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition"
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
                    className="text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition"
                  />
                </div>
              ) : (
                <input 
                  id="payable-supplier-input"
                  type="text" 
                  value={supplierNameInput}
                  onChange={e => setSupplierNameInput(e.target.value)}
                  placeholder="Nome da empresa ou fornecedor (Ex: Enel Energia, AutoPeças Brasil)" 
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition"
                  required
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="payable-category-select">Categoria da Despesa *</label>
              <select 
                id="payable-category-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="payable-description-input">Descrição da Conta *</label>
              <input 
                id="payable-description-input"
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Lote de Amortecedores e Óleo NFe #5502" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="payable-amount-input">Valor Total (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">R$</span>
                <input 
                  id="payable-amount-input"
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="850.00" 
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition font-mono font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="payable-installments-select">Parcelamento *</label>
              <select 
                id="payable-installments-select"
                value={installmentsCount}
                onChange={e => setInstallmentsCount(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition font-medium"
              >
                <option value="1">1x Parcela Única / Boleto À Vista</option>
                <option value="2">2x Parcelado</option>
                <option value="3">3x Parcelado</option>
                <option value="6">6x Parcelado</option>
                <option value="12">12x Parcelado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="payable-due-date-input">Vencimento da 1ª Parcela *</label>
              <input 
                id="payable-due-date-input"
                type="date" 
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="payable-notes-input">Observações</label>
              <input 
                id="payable-notes-input"
                type="text" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Código de barras do boleto enviado no e-mail" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition"
              />
            </div>

            <div className="pt-2 flex gap-3 col-span-1 md:col-span-2">
              <button 
                id="btn-save-payable-submit"
                type="submit" 
                className="bg-rose-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-rose-700 transition"
              >
                Lançar Conta a Pagar
              </button>
              <button 
                id="btn-cancel-payable"
                type="button" 
                onClick={resetForm} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold px-5 py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table & Controls */}
      {!isFormOpen && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="payables-list-panel">
          {/* Controls Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="payable-search-input"
                type="text" 
                placeholder="Buscar por fornecedor, código (CP-001) ou descrição..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                id="payable-category-filter"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition font-medium"
              >
                <option value="all">Todas as Categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                id="payable-status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 transition font-medium"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="partially_paid">Parcialmente Pagas</option>
                <option value="paid">Quitadas</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredPayables.length === 0 ? (
            <div className="p-8 text-center text-slate-400" id="payables-empty-state">
              Nenhuma conta a pagar encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="payables-table">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                    <th className="p-4">Código / Fornecedor</th>
                    <th className="p-4">Categoria & Descrição</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4">Valor Total</th>
                    <th className="p-4">Pago / Saldo</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredPayables.map(item => {
                    const isPaid = item.status === 'paid';
                    const isPartial = item.status === 'partially_paid';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition duration-150" id={`payable-row-${item.id}`}>
                        <td className="p-4">
                          <p className="font-mono text-xs font-bold text-rose-600">{item.code}</p>
                          <p className="font-semibold text-slate-800 text-sm">{item.supplierName}</p>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md mb-1">
                            <Tag className="w-3 h-3 text-slate-400" /> {item.category}
                          </span>
                          <p className="text-xs text-slate-600">{item.description}</p>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> {item.dueDate}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-semibold text-slate-800">
                          R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          <p className="text-emerald-600 font-semibold">
                            Pago: R$ {item.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`font-semibold ${item.remainingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            Resta: R$ {item.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="p-4">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> Quitada
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                              Parcialmente Paga
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-full border border-rose-100">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {!isPaid && (
                            <button
                              id={`btn-pay-payable-${item.id}`}
                              onClick={() => openPayModal(item)}
                              className="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 font-semibold px-2.5 py-1 rounded-md transition text-xs border border-rose-200 inline-flex items-center gap-1"
                              title="Pagar / Abater Despesa"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Pagar Conta
                            </button>
                          )}

                          <button
                            id={`btn-view-payable-details-${item.id}`}
                            onClick={() => { setSelectedPayable(item); setIsDetailModalOpen(true); }}
                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-medium px-2 py-1 rounded-md transition text-xs inline-flex items-center gap-1"
                            title="Ver Detalhes do Parcelamento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Pagar Conta / Abater */}
      {isPayModalOpen && selectedPayable && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-pay-payable">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-600" />
                Registrar Pagamento de Despesa
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 mb-4 text-xs space-y-1">
              <p><span className="font-semibold text-slate-700">Título:</span> {selectedPayable.code} - {selectedPayable.description}</p>
              <p><span className="font-semibold text-slate-700">Favorecido:</span> {selectedPayable.supplierName}</p>
              <div className="flex justify-between font-mono pt-1 text-slate-800">
                <span>Valor Total: R$ {selectedPayable.totalAmount.toFixed(2)}</span>
                <span className="text-emerald-600">Pago: R$ {selectedPayable.paidAmount.toFixed(2)}</span>
                <span className="text-rose-600 font-bold">Resta a Pagar: R$ {selectedPayable.remainingAmount.toFixed(2)}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleExecutePayment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Valor Efetivamente Pago (R$) *</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    max={selectedPayable.remainingAmount}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 font-mono font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Forma de Saída *</label>
                  <select 
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full text-sm mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Transferência / TED">Transferência / TED</option>
                    <option value="Cartão de Crédito">Cartão de Crédito Corporativo</option>
                    <option value="Dinheiro">Dinheiro (Caixa Interno)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Data do Pagamento *</label>
                  <input 
                    type="date" 
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full text-sm mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detalhes do Parcelamento */}
      {isDetailModalOpen && selectedPayable && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-payable-details">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Detalhamento de Despesa - {selectedPayable.code}
                </h3>
                <p className="text-xs text-slate-500">{selectedPayable.description} ({selectedPayable.supplierName})</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex justify-between text-xs font-mono">
                <div>Valor Total: R$ {selectedPayable.totalAmount.toFixed(2)}</div>
                <div className="text-emerald-600 font-bold">Pago: R$ {selectedPayable.paidAmount.toFixed(2)}</div>
                <div className="text-rose-600 font-bold">Resta: R$ {selectedPayable.remainingAmount.toFixed(2)}</div>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {selectedPayable.installments.map(inst => (
                  <div key={inst.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-700">Parcela {inst.installmentNumber} / {inst.totalInstallments}</p>
                      <p className="text-slate-400 font-mono">Vencimento: {inst.dueDate}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-800">R$ {inst.amount.toFixed(2)}</p>
                      {inst.status === 'paid' ? (
                        <p className="text-emerald-600 font-semibold text-[11px]">Pago ({inst.paymentMethod})</p>
                      ) : (
                        <p className="text-rose-600 text-[11px]">Pendente</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
