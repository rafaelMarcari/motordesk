/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MODAL DE BAIXA E PAGAMENTO DE PARCELAS / BOLETOS (CONTAS A PAGAR)
 */

import React, { useState, useRef } from 'react';
import {
  X,
  CheckCircle2,
  DollarSign,
  Calendar,
  CreditCard,
  Building2,
  Receipt,
  Upload,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Percent,
  Check
} from 'lucide-react';
import { AccountPayable, AccountInstallment, User, CompanyInfo, AccountPayableAttachment } from '../types';

interface AccountPayableSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: AccountPayable | null;
  currentUser?: User;
  companyInfo?: CompanyInfo;
  onConfirmPayment: (
    payableId: string,
    paymentData: {
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
  ) => void;
}

export default function AccountPayableSettleModal({
  isOpen,
  onClose,
  payable,
  currentUser,
  companyInfo,
  onConfirmPayment
}: AccountPayableSettleModalProps) {
  if (!isOpen || !payable) return null;

  const installments = payable.installments || [];
  
  // Find first unpaid installment
  const firstUnpaid = installments.find(inst => inst.status !== 'paid') || installments[0];

  const [paymentMode, setPaymentMode] = useState<'installment' | 'total'>('installment');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(firstUnpaid?.id || '');
  
  const selectedInstallment = installments.find(inst => inst.id === selectedInstallmentId) || firstUnpaid || {
    id: 'inst-1',
    installmentNumber: 1,
    totalInstallments: 1,
    amount: payable.remainingAmount,
    paidAmount: 0,
    dueDate: payable.dueDate,
    status: 'pending'
  };

  const [amountPaid, setAmountPaid] = useState<number>(
    paymentMode === 'installment' ? selectedInstallment.amount : payable.remainingAmount
  );
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [bankAccount, setBankAccount] = useState<string>('Conta Corrente Itaú 0341');
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  
  // Receipt attachment
  const [receiptFile, setReceiptFile] = useState<AccountPayableAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync amount when installment selection changes
  const handleSelectInstallment = (inst: AccountInstallment) => {
    setSelectedInstallmentId(inst.id);
    setPaymentMode('installment');
    setAmountPaid(inst.amount - (inst.paidAmount || 0));
  };

  const handleToggleMode = (mode: 'installment' | 'total') => {
    setPaymentMode(mode);
    if (mode === 'total') {
      setAmountPaid(payable.remainingAmount);
    } else {
      setAmountPaid(selectedInstallment.amount - (selectedInstallment.paidAmount || 0));
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    setIsUploading(true);
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const sizeFormatted = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      setReceiptFile({
        id: `rec-${Date.now()}`,
        name: file.name,
        type: 'receipt',
        fileUrl: result,
        fileType: file.type,
        fileSize: sizeFormatted,
        uploadedAt: new Date().toISOString(),
        uploadedByName: currentUser?.name || 'Operador Financeiro',
        amount: amountPaid,
        installmentNumber: selectedInstallment.installmentNumber
      });
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Erro ao carregar comprovante.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    onConfirmPayment(payable.id, {
      mode: paymentMode,
      installmentId: paymentMode === 'installment' ? selectedInstallment.id : undefined,
      installmentNumber: paymentMode === 'installment' ? selectedInstallment.installmentNumber : undefined,
      amountPaid: Number(amountPaid),
      paymentDate,
      paymentMethod,
      bankAccount,
      receiptNotes: receiptNotes.trim(),
      receiptAttachment: receiptFile || undefined
    });

    onClose();
  };

  // Calculate totals
  const totalPaidCount = installments.filter(inst => inst.status === 'paid').length;
  const totalPendingCount = installments.length - totalPaidCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Baixa / Pagamento de Despesa • {payable.code}
              </h3>
              <p className="text-xs text-slate-400">
                {payable.supplierName} • Saldo em Aberto: <strong className="text-rose-400 font-mono">R$ {payable.remainingAmount.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Section 1: Visual Installment Breakdown Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" /> Acompanhamento de Parcelas ({totalPaidCount} de {installments.length} Pagas)
              </label>
              <span className="text-xs text-slate-500 font-mono">
                Total Geral: R$ {payable.totalAmount.toFixed(2)}
              </span>
            </div>

            {/* Installment Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {installments.map((inst) => {
                const isPaid = inst.status === 'paid';
                const isSelected = selectedInstallmentId === inst.id && paymentMode === 'installment';
                const isOverdue = !isPaid && new Date(inst.dueDate + 'T23:59:59Z') < new Date();

                return (
                  <div
                    key={inst.id}
                    onClick={() => !isPaid && handleSelectInstallment(inst)}
                    className={`p-3 rounded-2xl border transition text-xs flex flex-col justify-between space-y-2 cursor-pointer ${
                      isPaid
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 opacity-90'
                        : isSelected
                        ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-rose-950 shadow-xs'
                        : isOverdue
                        ? 'bg-red-50 border-red-300 text-red-950 hover:border-red-400'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        Parcela {inst.installmentNumber}/{inst.totalInstallments}
                      </span>
                      {isPaid ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                          <Check className="w-3 h-3" /> PAGA
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                          VENCIDA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                          EM ABERTO
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between items-baseline font-mono">
                        <span className="text-[11px] text-slate-500">Valor:</span>
                        <span className="font-bold text-slate-900">R$ {inst.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline font-mono text-[11px]">
                        <span className="text-slate-500">Vencimento:</span>
                        <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                          {inst.dueDate ? new Date(inst.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                    </div>

                    {isPaid ? (
                      <div className="pt-1.5 border-t border-emerald-200 text-[10px] text-emerald-800 font-mono">
                        Pago em {inst.paymentDate ? new Date(inst.paymentDate).toLocaleDateString('pt-BR') : '-'} ({inst.paymentMethod || 'PIX'})
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-rose-700">
                        <span>{isSelected ? 'Selecionada para Baixa' : 'Clique para Pagar'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Mode Selector (Parcela vs Quitação Total) */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleToggleMode('installment')}
              className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMode === 'installment'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Baixar Parcela Específica (Parc. {selectedInstallment.installmentNumber})
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('total')}
              className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMode === 'total'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" /> Quitar Saldo Restante Total (R$ {payable.remainingAmount.toFixed(2)})
            </button>
          </div>

          {/* Section 3: Payment Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            
            {/* Valor Pago */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Valor do Pagamento (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountPaid}
                  onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Data do Pagamento */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Data do Pagamento *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-rose-500 focus:bg-white"
              />
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Forma de Saída *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-rose-500 focus:bg-white"
              >
                <option value="PIX">PIX Bancário</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="TED/DOC">Transferência Bancária / TED</option>
                <option value="Cartão de Crédito">Cartão de Crédito Corporativo</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Dinheiro">Dinheiro / Caixa Físico</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* Conta Bancária */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Conta Bancária / Caixa de Saída
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={e => setBankAccount(e.target.value)}
                placeholder="Ex: Itaú Agência 1234 Conta 56789-0"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-rose-500 focus:bg-white"
              />
            </div>

            {/* Comprovante de Pagamento Upload */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Comprovante Bancário
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleReceiptUpload}
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer truncate"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">
                  {receiptFile ? receiptFile.name : 'Anexar Comprovante (PDF/Img)'}
                </span>
              </button>
            </div>
          </div>

          {/* Observações / Autenticação */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Observações / Código de Autenticação Bancária
            </label>
            <input
              type="text"
              value={receiptNotes}
              onChange={e => setReceiptNotes(e.target.value)}
              placeholder="Ex: Autenticação Internet Banking Itaú #89410294. Pago com desconto pontualidade."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-rose-500 focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Gera movimentação automática no Fluxo de Caixa / DRE</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Dar Baixa (R$ {amountPaid.toFixed(2)})</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
