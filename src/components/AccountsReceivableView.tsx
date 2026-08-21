/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Search, DollarSign, AlertTriangle, CheckCircle, ShieldCheck, 
  CreditCard, Calendar, UserCheck, X, FileText, ArrowUpRight, Lock, Eye,
  TrendingUp, TrendingDown, PieChart, Clock, ShieldAlert, ArrowRight, Filter, CheckCircle2, AlertCircle,
  Printer, MessageSquare, Copy, QrCode
} from 'lucide-react';
import { AccountReceivable, AccountInstallment, Client, User, SystemNotification, FinancialTransaction, Vehicle, FiscalDocument, BoletoDocument } from '../types';
import { AppDatabase, INITIAL_PAYMENT_METHODS } from '../data/mockData';
import ShareDocumentModal from './ShareDocumentModal';
import PreTransmissionReviewModal, { PreTransmissionDocData } from './PreTransmissionReviewModal';

interface AccountsReceivableViewProps {
  db: AppDatabase;
  currentUser: User;
  onSaveReceivables: (receivables: AccountReceivable[], clients: Client[], transactions: FinancialTransaction[], notifications: SystemNotification[]) => void;
  onSaveFiscalDocuments?: (fiscalDocuments: FiscalDocument[]) => void;
  onSaveBoletos?: (boletos: BoletoDocument[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

export default function AccountsReceivableView({
  db,
  currentUser,
  onSaveReceivables,
  onSaveFiscalDocuments,
  onSaveBoletos,
  onAddHistoryLog,
  setUnsavedTask
}: AccountsReceivableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_paid' | 'paid' | 'blocked_credit_limit'>('all');
  const [activeTab, setActiveTab] = useState<'titles' | 'unexpected_analysis'>('titles');
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountReceivable | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBoletoForView, setSelectedBoletoForView] = useState<BoletoDocument | null>(null);
  const [selectedDocForDanfe, setSelectedDocForDanfe] = useState<FiscalDocument | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Helper to download XML
  const handleDownloadXml = (doc: FiscalDocument) => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${doc.accessKey}" versao="4.00">
    <ide>
      <cUF>35</cUF>
      <cNF>${Math.floor(10000000 + Math.random() * 90000000)}</cNF>
      <natOp>VENDA DE MERCADORIAS E SERVICOS</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>${doc.code.replace(/\D/g, '') || '101'}</nNF>
      <dhEmi>${doc.issuedAt || new Date().toISOString()}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <tpAmb>${doc.environment === 'production' ? '1' : '2'}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>MotorDesk ERP 4.0</verProc>
    </ide>
    <emit>
      <CNPJ>${(doc.companyCnpj || '00000000000100').replace(/\D/g, '')}</CNPJ>
      <xNome>${doc.companyName}</xNome>
      <xFant>${doc.companyName}</xFant>
      <IE>123456789</IE>
      <CRT>1</CRT>
    </emit>
    <dest>
      <CPF>${(doc.clientCpfCnpj || '00000000000').replace(/\D/g, '')}</CPF>
      <xNome>${doc.clientName}</xNome>
      <indIEDest>9</indIEDest>
    </dest>
    <total>
      <ICMSTot>
        <vProd>${(doc.totalProducts || doc.totalAmount).toFixed(2)}</vProd>
        <vNF>${doc.totalAmount.toFixed(2)}</vNF>
        <vTotTrib>${(doc.totalTaxes || 0).toFixed(2)}</vTotTrib>
      </ICMSTot>
    </total>
    <protNFe versao="4.00">
      <infProt>
        <tpAmb>${doc.environment === 'production' ? '1' : '2'}</tpAmb>
        <verAplic>SP_NFE_PL_009</verAplic>
        <chNFe>${doc.accessKey}</chNFe>
        <dhRecbto>${doc.issuedAt || new Date().toISOString()}</dhRecbto>
        <nProt>${doc.protocolNumber || '135260012345678'}</nProt>
        <digVal>zT6XbV+4nKp9...</digVal>
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso da NF-e</xMotivo>
      </infProt>
    </protNFe>
  </infNFe>
</NFe>`;
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe-${doc.code}-${doc.accessKey}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Pre-Transmission Modal State
  const [preTxData, setPreTxData] = useState<PreTransmissionDocData | null>(null);
  const [pendingTxAction, setPendingTxAction] = useState<(() => Promise<void> | void) | null>(null);

  // Quick Emit NF-e for title with Pre-transmission review
  const handleQuickEmitNfe = (item: AccountReceivable) => {
    const existingDocs = db.fiscalDocuments || [];
    const nfeNumber = existingDocs.length + 101;
    const nfeCode = `NFE-${String(nfeNumber).padStart(6, '0')}`;
    const accessKey = `352607${String(Date.now()).slice(-8)}${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;

    const draftData: PreTransmissionDocData = {
      type: 'nfe',
      title: `Conferência Pré-Transmissão: NF-e para Título #${item.code}`,
      nfeCode,
      nfeTypeLabel: 'NF-e 4.00 (Venda de Peças e Serviços)',
      companyName: db.companyInfo?.tradeName || db.companyInfo?.name || 'Oficina Mecânica',
      companyCnpj: db.companyInfo?.cnpj || '00.000.000/0001-91',
      clientName: item.clientName,
      clientCpfCnpj: item.clientCpf || '000.000.000-00',
      clientAddress: 'Endereço cadastrado na ficha do cliente',
      cfop: '5.102',
      totalProducts: item.totalAmount * 0.6,
      totalServices: item.totalAmount * 0.4,
      totalTaxes: Math.round(item.totalAmount * 0.08 * 100) / 100,
      totalAmount: item.totalAmount,
      draftAccessKey: accessKey,
      items: [
        {
          id: `item-${Date.now()}`,
          code: item.code,
          name: item.title,
          quantity: 1,
          unitPrice: item.totalAmount,
          totalPrice: item.totalAmount,
          type: 'service',
          icmsRatePercent: 18,
          issRatePercent: 5
        }
      ]
    };

    setPreTxData(draftData);
    setPendingTxAction(() => () => {
      const createdNfe: FiscalDocument = {
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
        clientId: item.clientId,
        clientName: item.clientName,
        clientCpfCnpj: item.clientCpf,
        serviceOrderId: item.serviceOrderId,
        budgetId: item.budgetId,
        receivableId: item.id,
        receivableCode: item.code,
        cfop: '5.102',
        totalProducts: item.totalAmount * 0.6,
        totalServices: item.totalAmount * 0.4,
        totalTaxes: Math.round(item.totalAmount * 0.08 * 100) / 100,
        totalAmount: item.totalAmount,
        items: [
          {
            id: `item-${Date.now()}`,
            code: item.code,
            name: item.title,
            quantity: 1,
            unitPrice: item.totalAmount,
            totalPrice: item.totalAmount,
            type: 'service',
            cfop: '5.933'
          }
        ],
        sefazStatusMessage: '100 - Autorizado o uso da NF-e',
        environment: db.sefazConfig?.environment || 'homologation'
      };

      if (onSaveFiscalDocuments) {
        onSaveFiscalDocuments([createdNfe, ...existingDocs]);
      }

      const updatedReceivable: AccountReceivable = {
        ...item,
        nfeId: createdNfe.id,
        nfeCode: createdNfe.code,
        nfeStatus: 'authorized',
        nfeAccessKey: createdNfe.accessKey
      };

      const updatedReceivablesList = (db.accountsReceivable || []).map(r => r.id === item.id ? updatedReceivable : r);
      onSaveReceivables(updatedReceivablesList, db.clients || [], db.financialTransactions || [], db.notifications || []);
      onAddHistoryLog('user_activity', 'NF-e Emitida no Contas a Receber', `NF-e ${createdNfe.code} emitida com sucesso para o título ${item.code} (${item.clientName}).`, item.clientId, '');

      setSuccessMsg(`NF-e ${createdNfe.code} gerada e autorizada para o título ${item.code}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    });
  };

  // Quick Generate Boleto for title with Pre-transmission review
  const handleQuickGenerateBoleto = (item: AccountReceivable) => {
    const existingBoletos = db.boletos || [];
    const bolNumber = existingBoletos.length + 1;
    const boletoCode = `BOL-${new Date().getFullYear()}-${String(bolNumber).padStart(3, '0')}`;
    const barcodeNumber = `34191.${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} 1 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const draftData: PreTransmissionDocData = {
      type: 'boleto',
      title: `Conferência Pré-Emissão: Boleto Bancário #${boletoCode}`,
      boletoCode,
      bankName: 'Itaú Unibanco (341)',
      bankCode: '341',
      barcodeNumber,
      dueDate: item.dueDate,
      payerName: item.clientName,
      payerCpfCnpj: item.clientCpf || '000.000.000-00',
      totalAmount: item.remainingAmount > 0 ? item.remainingAmount : item.totalAmount,
      companyName: db.companyInfo?.tradeName || db.companyInfo?.name || 'Oficina Mecânica',
      companyCnpj: db.companyInfo?.cnpj || '00.000.000/0001-91'
    };

    setPreTxData(draftData);
    setPendingTxAction(() => () => {
      const createdBoleto: BoletoDocument = {
        id: `bol-${Date.now()}`,
        code: boletoCode,
        bankCode: '341',
        bankName: 'Itaú Unibanco',
        barcodeNumber,
        pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${item.remainingAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
        pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${item.remainingAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
        payerName: item.clientName,
        payerCpfCnpj: item.clientCpf || '000.000.000-00',
        amount: item.remainingAmount > 0 ? item.remainingAmount : item.totalAmount,
        dueDate: item.dueDate,
        issueDate: new Date().toISOString().split('T')[0],
        status: item.status === 'paid' ? 'paid' : 'registered',
        companyId: currentUser.companyId || 'company-001',
        serviceOrderId: item.serviceOrderId,
        receivableId: item.id,
        nfeAccessKey: item.nfeAccessKey
      };

      if (onSaveBoletos) {
        onSaveBoletos([createdBoleto, ...existingBoletos]);
      }

      const updatedReceivable: AccountReceivable = {
        ...item,
        boletoId: createdBoleto.id,
        boletoCode: createdBoleto.code,
        boletoStatus: createdBoleto.status,
        boletoBarcode: createdBoleto.barcodeNumber
      };

      const updatedReceivablesList = (db.accountsReceivable || []).map(r => r.id === item.id ? updatedReceivable : r);
      onSaveReceivables(updatedReceivablesList, db.clients || [], db.financialTransactions || [], db.notifications || []);
      onAddHistoryLog('user_activity', 'Boleto Gerado no Contas a Receber', `Boleto ${createdBoleto.code} gerado com sucesso para o título ${item.code} (${item.clientName}).`, item.clientId, '');

      setSuccessMsg(`Boleto ${createdBoleto.code} registrado para o título ${item.code}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    });
  };

  // PDF Receipt & Share Modal State
  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    docId: string;
    client?: Client;
    vehicle?: Vehicle;
    items: { name: string; quantity: number; unitPrice: number; totalPrice: number; status?: string }[];
    totalValue: number;
    notes?: string;
    paymentDetails?: {
      paidAmount: number;
      remainingAmount: number;
      paymentMethod: string;
      paymentDate: string;
      receiptCode?: string;
    };
  }>({
    isOpen: false,
    docId: '',
    items: [],
    totalValue: 0
  });

  // New Receivable Form State
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [interestRatePercent, setInterestRatePercent] = useState('0');
  const [selectedFormPaymentMethod, setSelectedFormPaymentMethod] = useState('Cartão de Crédito');
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Payment Abatement State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('all');

  // Manager Approval State
  const [approvalNotes, setApprovalNotes] = useState('');

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const receivables = db.accountsReceivable || [];
  const clients = db.clients || [];

  const isManager = currentUser.role === 'admin' || currentUser.username === 'admin';

  // Filter list
  const filteredReceivables = receivables.filter(item => {
    const matchesSearch = item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && item.status === statusFilter;
  });

  // Calculate Summary Totals
  const totalReceivable = receivables.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPaid = receivables.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalRemaining = receivables.reduce((sum, item) => sum + item.remainingAmount, 0);
  const blockedCount = receivables.filter(r => r.status === 'blocked_credit_limit').length;

  // Analytics for Unexpected Values & Zero Default Scenario (Tela Dividida)
  const todayStr = new Date().toISOString().split('T')[0];

  const allInstallments = receivables.flatMap(r => {
    return (r.installments || []).map(inst => {
      const isOverdue = inst.status === 'overdue' || (inst.status !== 'paid' && inst.dueDate < todayStr);
      const daysOverdue = isOverdue ? Math.max(0, Math.floor((new Date(todayStr).getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
      return {
        receivableId: r.id,
        receivableCode: r.code,
        receivableTitle: r.title,
        clientId: r.clientId,
        clientName: r.clientName,
        paymentMethod: r.paymentMethod,
        receivableStatus: r.status,
        rawReceivable: r,
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        totalInstallments: inst.totalInstallments,
        amount: inst.amount,
        paidAmount: inst.paidAmount,
        remainingAmount: inst.amount - inst.paidAmount,
        dueDate: inst.dueDate,
        status: inst.status,
        isOverdue,
        daysOverdue
      };
    });
  });

  const totalExpectedContracted = receivables.reduce((sum, item) => sum + item.totalAmount, 0);
  const expectedDueToDate = allInstallments.filter(i => i.dueDate <= todayStr).reduce((sum, i) => sum + i.amount, 0);
  const expectedFutureDue = allInstallments.filter(i => i.dueDate > todayStr).reduce((sum, i) => sum + i.amount, 0);

  const actualPaidToDate = allInstallments.reduce((sum, i) => sum + i.paidAmount, 0);
  const unexpectedMissingOverdue = allInstallments.filter(i => i.isOverdue).reduce((sum, i) => sum + i.remainingAmount, 0);
  const unexpectedBlockedLimit = receivables.filter(r => r.status === 'blocked_credit_limit').reduce((sum, r) => sum + r.remainingAmount, 0);
  const totalUnexpectedDivergence = unexpectedMissingOverdue + unexpectedBlockedLimit;

  const collectionRate = expectedDueToDate > 0 ? Math.min(100, (actualPaidToDate / expectedDueToDate) * 100) : 100;
  const defaultRate = expectedDueToDate > 0 ? (unexpectedMissingOverdue / expectedDueToDate) * 100 : 0;

  const resetForm = () => {
    setClientId('');
    setTitle('');
    setTotalAmount('');
    setInstallmentsCount('3');
    setFirstDueDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setErrorMsg('');
    setIsFormOpen(false);
    setUnsavedTask(null);
  };

  // Open New Form
  const handleOpenNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // Generate Installment Schedule
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
        id: `parc-${Date.now()}-${i}`,
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

  // Save New Receivable Title
  const handleSaveReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg('Selecione um cliente.');
      return;
    }
    const rawVal = parseFloat(totalAmount);
    if (isNaN(rawVal) || rawVal <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    const rate = parseFloat(interestRatePercent) || 0;
    const interestAmt = Math.round((rawVal * (rate / 100)) * 100) / 100;
    const val = rawVal + interestAmt;

    const client = clients.find(c => c.id === clientId);
    if (!client) {
      setErrorMsg('Cliente não encontrado.');
      return;
    }

    const numInstallments = parseInt(installmentsCount) || 1;
    const clientLimit = client.maxCreditLimit !== undefined ? client.maxCreditLimit : 3000;
    const currentDebt = client.currentDebt || 0;
    const projectedDebt = currentDebt + val;
    const limitExceeded = projectedDebt > clientLimit;

    const newCode = `CR-${new Date().getFullYear()}-${String(receivables.length + 1).padStart(3, '0')}`;
    const newInstallments = generateInstallments(val, numInstallments, firstDueDate);

    const newReceivable: AccountReceivable = {
      id: `cr-${Date.now()}`,
      code: newCode,
      clientId: client.id,
      clientName: client.name,
      clientCpf: client.cpf,
      title: title.trim() || `Lançamento de Contas a Receber (${numInstallments}x)`,
      originalAmount: rawVal,
      interestRatePercent: rate,
      interestAmount: interestAmt,
      paymentMethod: selectedFormPaymentMethod,
      totalAmount: val,
      paidAmount: 0,
      remainingAmount: val,
      status: limitExceeded ? 'blocked_credit_limit' : 'pending',
      installmentsCount: numInstallments,
      dueDate: newInstallments[newInstallments.length - 1].dueDate,
      createdAt: new Date().toISOString(),
      installments: newInstallments,
      creditLimitExceeded: limitExceeded,
      creditLimitAttempted: projectedDebt,
      notes: notes.trim() ? notes : limitExceeded ? `Atenção: Limite do cliente (R$ ${clientLimit.toFixed(2)}) excedido. Aguardando liberação do gerente.` : undefined
    };

    // Update Client Debt
    const updatedClients = clients.map(c => 
      c.id === client.id 
        ? { ...c, currentDebt: (c.currentDebt || 0) + val }
        : c
    );

    let updatedNotifications = db.notifications || [];
    if (limitExceeded) {
      const newNotif: SystemNotification = {
        id: `notif-credit-${Date.now()}`,
        type: 'credit_limit_exceeded',
        title: '⚠️ Alerta de Limite de Crédito Excedido',
        message: `O cliente ${client.name} possui limite de R$ ${clientLimit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}, porém a nova venda de R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})} elevou a dívida para R$ ${projectedDebt.toLocaleString('pt-BR', {minimumFractionDigits: 2})}. Requer liberação do Gerente.`,
        date: new Date().toISOString(),
        read: false,
        metadata: {
          clientId: client.id,
          clientName: client.name,
          creditLimit: clientLimit,
          currentDebt: currentDebt,
          attemptedAmount: val,
          receivableId: newReceivable.id
        }
      };
      updatedNotifications = [newNotif, ...updatedNotifications];
    }

    const updatedReceivables = [newReceivable, ...receivables];
    onSaveReceivables(updatedReceivables, updatedClients, db.financialTransactions || [], updatedNotifications);
    onAddHistoryLog('payment', 'Título a Receber Lançado', `Título ${newCode} no valor de R$ ${val.toFixed(2)} cadastrado para o cliente ${client.name}.${limitExceeded ? ' [BLOQUEADO: LIMITE EXCEDIDO]' : ''}`, client.id, '');

    if (limitExceeded) {
      setSuccessMsg(`Título cadastrado! ⚠️ ALERTA: O limite de crédito foi excedido (R$ ${projectedDebt.toFixed(2)} / R$ ${clientLimit.toFixed(2)}). Requer liberação do Gerente.`);
    } else {
      setSuccessMsg(`Título ${newCode} cadastrado com sucesso!`);
    }

    setTimeout(() => setSuccessMsg(''), 5000);
    resetForm();
  };

  // Open Payment / Abatement Modal
  const openPayModal = (item: AccountReceivable) => {
    setSelectedReceivable(item);
    setPaymentAmount(String(item.remainingAmount));
    setPaymentMethod('PIX');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReceiptNotes('');
    setSelectedInstallmentId('all');
    setErrorMsg('');
    setIsPayModalOpen(true);
  };

  // Submit Payment / Abatement ("Abater da Dívida")
  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    const amountToAbate = parseFloat(paymentAmount);
    if (isNaN(amountToAbate) || amountToAbate <= 0) {
      setErrorMsg('Informe um valor de pagamento maior que zero.');
      return;
    }

    if (amountToAbate > selectedReceivable.remainingAmount + 0.01) {
      setErrorMsg(`O valor informado (R$ ${amountToAbate.toFixed(2)}) ultrapassa o saldo devedor atual (R$ ${selectedReceivable.remainingAmount.toFixed(2)}).`);
      return;
    }

    // Update Receivable Record
    const newPaidAmount = selectedReceivable.paidAmount + amountToAbate;
    const newRemainingAmount = Math.max(0, selectedReceivable.totalAmount - newPaidAmount);
    const newStatus = newRemainingAmount <= 0.01 ? 'paid' : 'partially_paid';

    // Abate installments sequentially or specific
    let remainingToDistribute = amountToAbate;
    const updatedInstallments = selectedReceivable.installments.map(inst => {
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

    const updatedReceivable: AccountReceivable = {
      ...selectedReceivable,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: selectedReceivable.status === 'blocked_credit_limit' && newStatus === 'paid' ? 'paid' : (selectedReceivable.status === 'blocked_credit_limit' ? 'blocked_credit_limit' : newStatus),
      installments: updatedInstallments
    };

    const updatedReceivablesList = receivables.map(r => r.id === selectedReceivable.id ? updatedReceivable : r);

    // Update Client Debt
    const updatedClients = clients.map(c => 
      c.id === selectedReceivable.clientId 
        ? { ...c, currentDebt: Math.max(0, (c.currentDebt || 0) - amountToAbate) }
        : c
    );

    // Create Financial Transaction (Cash Flow Entry)
    const newTransaction: FinancialTransaction = {
      id: `ft-${Date.now()}`,
      type: 'income',
      category: 'Contas a Receber',
      description: `Recebimento/Abatimento ${selectedReceivable.code} - ${selectedReceivable.clientName}`,
      amount: amountToAbate,
      date: new Date(paymentDate).toISOString(),
      paymentMethod: paymentMethod,
      referenceId: selectedReceivable.id,
      clientId: selectedReceivable.clientId,
      createdByName: currentUser.name
    };

    const updatedTransactions = [newTransaction, ...(db.financialTransactions || [])];

    onSaveReceivables(updatedReceivablesList, updatedClients, updatedTransactions, db.notifications || []);
    onAddHistoryLog('payment', 'Pagamento/Abatimento Registrado', `Recebimento de R$ ${amountToAbate.toFixed(2)} via ${paymentMethod} referente ao título ${selectedReceivable.code}. Saldo restante: R$ ${newRemainingAmount.toFixed(2)}.`, selectedReceivable.clientId, '');

    setSuccessMsg(`Pagamento de R$ ${amountToAbate.toLocaleString('pt-BR', {minimumFractionDigits: 2})} abatido com sucesso! Saldo em caixa atualizado.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setIsPayModalOpen(false);

    // Automatically open Payment Receipt PDF Share Modal
    const targetClient = clients.find(c => c.id === selectedReceivable.clientId);
    const targetVehicle = (db.vehicles || []).find(v => v.clientId === selectedReceivable.clientId);

    setShareModalData({
      isOpen: true,
      docId: selectedReceivable.code,
      client: targetClient,
      vehicle: targetVehicle,
      items: updatedInstallments.map(i => ({
        name: `Parcela ${i.installmentNumber}/${i.totalInstallments} (Vencimento: ${i.dueDate})`,
        quantity: 1,
        unitPrice: i.amount,
        totalPrice: i.paidAmount,
        status: i.status === 'paid' ? 'approved' : i.status === 'partially_paid' ? 'executed' : 'pending'
      })),
      totalValue: amountToAbate,
      notes: receiptNotes || `Comprovante de Pagamento/Abatimento do Título ${selectedReceivable.code}`,
      paymentDetails: {
        paidAmount: amountToAbate,
        remainingAmount: newRemainingAmount,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        receiptCode: `REC-${Date.now().toString().slice(-6)}`
      }
    });

    setSelectedReceivable(null);
  };

  // Open Manager Approval Modal
  const openManagerModal = (item: AccountReceivable) => {
    setSelectedReceivable(item);
    setApprovalNotes('');
    setErrorMsg('');
    setIsManagerModalOpen(true);
  };

  // Execute Manager Approval
  const handleManagerApprove = () => {
    if (!selectedReceivable) return;
    if (!isManager) {
      setErrorMsg('Apenas Gerentes e Administradores possuem permissão para liberar vendas bloqueadas.');
      return;
    }

    const updatedReceivable: AccountReceivable = {
      ...selectedReceivable,
      status: selectedReceivable.paidAmount > 0 ? 'partially_paid' : 'approved_by_manager',
      creditLimitExceeded: false,
      managerApproval: {
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString(),
        notes: approvalNotes.trim() ? approvalNotes : 'Venda analisada e liberada pelo gerente responsável.'
      }
    };

    const updatedReceivablesList = receivables.map(r => r.id === selectedReceivable.id ? updatedReceivable : r);

    onSaveReceivables(updatedReceivablesList, clients, db.financialTransactions || [], db.notifications || []);
    onAddHistoryLog('user_activity', 'Venda Liberada pelo Gerente', `O gerente ${currentUser.name} analisou e liberou a venda do título ${selectedReceivable.code} (Cliente ${selectedReceivable.clientName}).`, selectedReceivable.clientId, '');

    setSuccessMsg(`Venda do título ${selectedReceivable.code} LIBERADA pelo gerente com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setIsManagerModalOpen(false);
    setSelectedReceivable(null);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="accounts-receivable-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Contas a Receber & Gestão de Crédito
          </h1>
          <p className="text-sm text-slate-500">
            Controle de parcelamentos, abatimento de dívidas e autorização de limite de crédito por cliente.
          </p>
        </div>
        {!isFormOpen && (
          <button 
            id="btn-add-receivable"
            onClick={handleOpenNewForm} 
            className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Novo Título a Receber
          </button>
        )}
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" id="receivables-tabs-bar">
        <button
          id="tab-btn-titles"
          type="button"
          onClick={() => setActiveTab('titles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'titles'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Títulos & Gestão de Baixas
        </button>

        <button
          id="tab-btn-unexpected-values"
          type="button"
          onClick={() => setActiveTab('unexpected_analysis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'unexpected_analysis'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Análise de Valores Não Esperados & Inadimplência (Tela Dividida)
          {unexpectedMissingOverdue > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
              R$ {unexpectedMissingOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          )}
        </button>
      </div>

      {/* TELA DIVIDIDA: ANÁLISE DE VALORES NÃO ESPERADOS */}
      {activeTab === 'unexpected_analysis' && (
        <div className="space-y-6 animate-fade-in" id="unexpected-values-split-screen">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-indigo-700/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-full border border-indigo-400/30 inline-flex items-center gap-1.5 mb-2">
                  <PieChart className="w-3.5 h-3.5 text-indigo-300" />
                  Módulo de Inteligência Financeira & Gestão de Risco
                </span>
                <h2 className="text-xl font-bold font-display text-white">
                  Análise Comparativa: Fluxo Esperado (Sem Inadimplência) vs. Realizado
                </h2>
                <p className="text-xs text-indigo-200/80 mt-1 max-w-3xl leading-relaxed">
                  Visão comparativa em tela dividida para mapear o que realmente deveria ter entrado no caixa (cenário 100% adimplente) em contraste com o dinheiro que efetivamente entrou e os valores não esperados (em atraso ou bloqueados).
                </p>
              </div>

              <div className="flex flex-col items-end justify-center bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 shrink-0">
                <span className="text-[10px] text-indigo-200 uppercase font-semibold">Taxa de Arrecadação Efetiva</span>
                <span className={`text-2xl font-black font-mono ${collectionRate >= 90 ? 'text-emerald-400' : collectionRate >= 70 ? 'text-amber-300' : 'text-rose-400'}`}>
                  {collectionRate.toFixed(1)}%
                </span>
                <span className="text-[10px] text-indigo-200/70">Inadimplência Ativa: {defaultRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Esperado Contratado (100%)</span>
              <p className="text-xl font-extrabold text-slate-800 font-mono mt-1">R$ {totalExpectedContracted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Soma contratada de todos os títulos</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Esperado Vencido até Hoje</span>
              <p className="text-xl font-extrabold text-blue-900 font-mono mt-1">R$ {expectedDueToDate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">O que devia ter entrado até o momento</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Realizado Efetivo em Caixa</span>
              <p className="text-xl font-extrabold text-emerald-600 font-mono mt-1">R$ {actualPaidToDate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Dinheiro realmente arrecadado</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-300 bg-rose-50/30 shadow-xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Valores Não Esperados / Faltantes
              </span>
              <p className="text-xl font-extrabold text-rose-600 font-mono mt-1">R$ {totalUnexpectedDivergence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-rose-700 font-medium mt-0.5">Deficit por atraso e bloqueios</p>
            </div>
          </div>

          {/* SPLIT SCREEN LAYOUT (TELA DIVIDIDA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="split-screen-container">
            
            {/* LEFT COLUMN: CENÁRIO IDEAL - O QUE DEVERIA ENTRAR NO CAIXA */}
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-emerald-800 text-white p-4 border-b border-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-700 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">FLUXO ESPERADO (0% INADIMPLÊNCIA)</h3>
                    <p className="text-[11px] text-emerald-200/90">O que realmente deveria entrar no caixa no cenário ideal</p>
                  </div>
                </div>
                <span className="bg-emerald-900/80 text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-700/50">
                  Cenário Teórico
                </span>
              </div>

              <div className="p-4 bg-emerald-50/50 border-b border-emerald-100/60 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Vencidos até Hoje (Devia ter entrado)</span>
                    <p className="text-base font-bold text-slate-800 font-mono mt-0.5">R$ {expectedDueToDate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">A Vencer Futuramente</span>
                    <p className="text-base font-bold text-indigo-600 font-mono mt-0.5">R$ {expectedFutureDue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {/* Table of expected installments */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Cronograma Teórico de Entradas de Caixa:
                </h4>
                <div className="border border-slate-150 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="p-2.5">Cód / Cliente</th>
                        <th className="p-2.5">Vencimento</th>
                        <th className="p-2.5">Parcela</th>
                        <th className="p-2.5 text-right">Valor Esperado</th>
                        <th className="p-2.5 text-center">Status Teórico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {allInstallments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">Nenhum título cadastrado.</td>
                        </tr>
                      ) : (
                        allInstallments.map((inst, idx) => (
                          <tr key={`exp-${inst.receivableId}-${inst.installmentId}-${idx}`} className="hover:bg-slate-50/80">
                            <td className="p-2.5">
                              <span className="font-mono font-bold text-indigo-600 text-[11px] block">{inst.receivableCode}</span>
                              <span className="text-[11px] text-slate-600 truncate max-w-[120px] block" title={inst.clientName}>{inst.clientName}</span>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-600">{new Date(inst.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="p-2.5 font-semibold text-slate-500">{inst.installmentNumber}/{inst.totalInstallments}</td>
                            <td className="p-2.5 text-right font-bold font-mono text-slate-800">R$ {inst.amount.toFixed(2)}</td>
                            <td className="p-2.5 text-center">
                              <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                100% Entrado no Caixa
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CENÁRIO REAL & VALORES NÃO ESPERADOS */}
            <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-rose-900 text-white p-4 border-b border-rose-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-800 rounded-lg">
                    <ShieldAlert className="w-5 h-5 text-rose-200" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">FLUXO REALIZADO & VALORES NÃO ESPERADOS</h3>
                    <p className="text-[11px] text-rose-200/90">Divergências, inadimplência e bloqueios ocorridos</p>
                  </div>
                </div>
                <span className="bg-rose-950/80 text-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-800/50">
                  Cenário Real & Anomalias
                </span>
              </div>

              <div className="p-4 bg-rose-50/50 border-b border-rose-100/60 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-emerald-200">
                    <span className="text-[10px] font-semibold text-emerald-700 uppercase">Realizado Efetivo em Caixa</span>
                    <p className="text-base font-bold text-emerald-600 font-mono mt-0.5">R$ {actualPaidToDate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-rose-200">
                    <span className="text-[10px] font-semibold text-rose-700 uppercase">Divergência / Não Entrou</span>
                    <p className="text-base font-bold text-rose-600 font-mono mt-0.5">R$ {totalUnexpectedDivergence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Warning Banner */}
                {totalUnexpectedDivergence > 0 ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 flex items-start gap-2 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Alerta de Divergência de Caixa:</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        O caixa deixou de arrecadar <strong>R$ {unexpectedMissingOverdue.toFixed(2)}</strong> em parcelas em atraso e possui <strong>R$ {unexpectedBlockedLimit.toFixed(2)}</strong> em vendas bloqueadas por limite de crédito.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Nenhuma divergência detectada. Todos os valores esperados até o momento foram honrados!
                  </div>
                )}
              </div>

              {/* Table of unexpected/missing values */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  Detalhamento dos Valores Não Esperados & Inadimplência:
                </h4>
                <div className="border border-slate-150 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="p-2.5">Cód / Cliente</th>
                        <th className="p-2.5">Vencimento</th>
                        <th className="p-2.5">Dias Atraso</th>
                        <th className="p-2.5 text-right">Valor em Risco</th>
                        <th className="p-2.5 text-center">Motivo da Anomalia</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {allInstallments.filter(i => i.isOverdue || i.receivableStatus === 'blocked_credit_limit').length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-emerald-600 font-medium bg-emerald-50/20">
                            🎉 Excelente! Não há inadimplência nem bloqueios de crédito pendentes.
                          </td>
                        </tr>
                      ) : (
                        allInstallments
                          .filter(i => i.isOverdue || i.receivableStatus === 'blocked_credit_limit')
                          .map((inst, idx) => (
                            <tr key={`unexp-${inst.receivableId}-${inst.installmentId}-${idx}`} className="hover:bg-rose-50/30">
                              <td className="p-2.5">
                                <span className="font-mono font-bold text-indigo-600 text-[11px] block">{inst.receivableCode}</span>
                                <span className="text-[11px] text-slate-600 truncate max-w-[110px] block" title={inst.clientName}>{inst.clientName}</span>
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-600">{new Date(inst.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                              <td className="p-2.5">
                                {inst.daysOverdue > 0 ? (
                                  <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded text-[10px]">
                                    +{inst.daysOverdue} dias
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">-</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-bold font-mono text-rose-700">R$ {inst.remainingAmount.toFixed(2)}</td>
                              <td className="p-2.5 text-center">
                                {inst.receivableStatus === 'blocked_credit_limit' ? (
                                  <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                                    Bloqueio de Crédito
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                                    Inadimplente ({inst.installmentNumber}/{inst.totalInstallments})
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right">
                                {inst.receivableStatus === 'blocked_credit_limit' ? (
                                  <button
                                    id={`btn-unexp-approve-${inst.receivableId}`}
                                    onClick={() => openManagerModal(inst.rawReceivable)}
                                    className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded transition"
                                  >
                                    Liberar
                                  </button>
                                ) : (
                                  <button
                                    id={`btn-unexp-pay-${inst.receivableId}`}
                                    onClick={() => openPayModal(inst.rawReceivable)}
                                    className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded transition"
                                  >
                                    Dar Baixa
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="receivables-kpis">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Vendas / Títulos</p>
            <p className="text-lg font-bold text-slate-800 font-mono">
              R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Abatido / Recebido</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Saldo Pendente (Dívida Total)</p>
            <p className="text-lg font-bold text-amber-600 font-mono">
              R$ {totalRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className={`bg-white p-4 rounded-xl border shadow-xs flex items-center gap-4 ${blockedCount > 0 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
          <div className={`p-3 rounded-lg ${blockedCount > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Bloqueados por Crédito</p>
            <p className={`text-lg font-bold font-mono ${blockedCount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {blockedCount} {blockedCount === 1 ? 'venda' : 'vendas'}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="receivables-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-200 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Form Section */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-md animate-slide-up" id="receivable-form-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-semibold text-slate-800 font-display text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Lançamento de Título a Receber (Parcelado / Venda)
            </h3>
            <button 
              id="btn-close-receivable-form"
              onClick={resetForm} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div id="receivable-error-alert" className="mb-4 p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSaveReceivable} className="grid grid-cols-1 md:grid-cols-2 gap-4" id="form-receivable">
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="receivable-client-select">Cliente *</label>
              <select 
                id="receivable-client-select"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                required
              >
                <option value="">-- Selecione o Cliente --</option>
                {clients.map(c => {
                  const limit = c.maxCreditLimit !== undefined ? c.maxCreditLimit : 3000;
                  const debt = c.currentDebt || 0;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cpf}) - Limite: R$ {limit.toFixed(2)} | Dívida Atual: R$ {debt.toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="receivable-title-input">Descrição / Título da Venda *</label>
              <input 
                id="receivable-title-input"
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: OS-2026-004 - Troca de Embreagem e Óleo" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="receivable-amount-input">Valor Original (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">R$</span>
                <input 
                  id="receivable-amount-input"
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="1250.00" 
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Forma de Pagamento Cadastrada</label>
              <select
                value={selectedFormPaymentMethod}
                onChange={e => {
                  setSelectedFormPaymentMethod(e.target.value);
                  const pms = db.paymentMethods || INITIAL_PAYMENT_METHODS;
                  const found = pms.find(p => p.name === e.target.value);
                  if (found && found.defaultInterestRatePercent !== undefined) {
                    setInterestRatePercent(String(found.defaultInterestRatePercent));
                  }
                }}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 font-medium bg-white"
              >
                {(db.paymentMethods || INITIAL_PAYMENT_METHODS).map(pm => (
                  <option key={pm.id} value={pm.name}>
                    {pm.name} {pm.defaultInterestRatePercent ? `(${pm.defaultInterestRatePercent}% taxa)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Taxa Juros / Maquininha (%)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={interestRatePercent}
                onChange={e => setInterestRatePercent(e.target.value)}
                placeholder="3.5" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="receivable-installments-select">Condição / Parcelamento *</label>
              <select 
                id="receivable-installments-select"
                value={installmentsCount}
                onChange={e => setInstallmentsCount(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-medium"
              >
                <option value="1">1x À vista / Parcela Única</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
                <option value="5">5x</option>
                <option value="6">6x</option>
                <option value="10">10x</option>
                <option value="12">12x</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="receivable-due-date-input">Vencimento da 1ª Parcela *</label>
              <input 
                id="receivable-due-date-input"
                type="date" 
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="receivable-notes-input">Observações do Lançamento</label>
              <input 
                id="receivable-notes-input"
                type="text" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Pagamento acordado em boleto bancário" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div className="pt-2 flex gap-3 col-span-1 md:col-span-2">
              <button 
                id="btn-save-receivable-submit"
                type="submit" 
                className="bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                Cadastrar e Lançar Título
              </button>
              <button 
                id="btn-cancel-receivable"
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
        <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="receivables-list-panel">
          {/* Controls Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="receivable-search-input"
                type="text" 
                placeholder="Buscar por cliente, código (CR-001) ou título..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Filtrar por Status:</span>
              <select
                id="receivable-status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 transition font-medium"
              >
                <option value="all">Todos os Títulos</option>
                <option value="pending">Pendentes</option>
                <option value="partially_paid">Parcialmente Pagos</option>
                <option value="paid">Quitados</option>
                <option value="blocked_credit_limit">Bloqueados (Crédito Excedido)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredReceivables.length === 0 ? (
            <div className="p-8 text-center text-slate-400" id="receivables-empty-state">
              Nenhum título a receber encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="receivables-table">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                    <th className="p-4">Código / Cliente</th>
                    <th className="p-4">Descrição / Venda</th>
                    <th className="p-4">Condição</th>
                    <th className="p-4">Valor Total</th>
                    <th className="p-4">Pago / Saldo</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredReceivables.map(item => {
                    const isBlocked = item.status === 'blocked_credit_limit';
                    const isPaid = item.status === 'paid';
                    const isPartial = item.status === 'partially_paid';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition duration-150" id={`receivable-row-${item.id}`}>
                        <td className="p-4">
                          <p className="font-mono text-xs font-bold text-indigo-600">{item.code}</p>
                          <p className="font-semibold text-slate-800 text-sm">{item.clientName}</p>
                          {item.clientCpf && <p className="text-[11px] text-slate-400 font-mono">CPF: {item.clientCpf}</p>}
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-slate-800 max-w-xs">{item.title}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> Vencimento: {item.dueDate}
                          </p>
                          {/* Badges and Quick Actions for NF-e & Boleto */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.nfeCode ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                  🧾 {item.nfeCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const foundDoc = (db.fiscalDocuments || []).find(d => d.id === item.nfeId || d.code === item.nfeCode || d.accessKey === item.nfeAccessKey);
                                    const fallbackDoc: FiscalDocument = foundDoc || {
                                      id: item.nfeId || `nfe-${Date.now()}`,
                                      code: item.nfeCode || 'NFE-000101',
                                      type: 'nfe_product',
                                      status: 'authorized',
                                      accessKey: item.nfeAccessKey || `352607${Date.now()}12345678901234567890`,
                                      protocolNumber: `1352600${Math.floor(10000000 + Math.random() * 90000000)}`,
                                      issueDate: item.dueDate || new Date().toISOString().split('T')[0],
                                      issuedAt: `${item.dueDate || new Date().toISOString().split('T')[0]} 10:00:00`,
                                      companyId: item.companyId || currentUser.companyId || 'company-001',
                                      companyName: db.companyInfo?.tradeName || db.companyInfo?.name || 'Oficina Mecânica',
                                      companyCnpj: db.companyInfo?.cnpj || '00.000.000/0001-91',
                                      clientId: item.clientId,
                                      clientName: item.clientName,
                                      clientCpfCnpj: item.clientCpf,
                                      receivableId: item.id,
                                      receivableCode: item.code,
                                      cfop: '5.102',
                                      sefazStatusMessage: '100 - Autorizado o uso da NF-e',
                                      totalAmount: item.totalAmount,
                                      totalProducts: item.totalAmount,
                                      totalServices: 0,
                                      totalTaxes: item.totalAmount * 0.08,
                                      items: [
                                        {
                                          id: `fitem-${Date.now()}`,
                                          code: item.code,
                                          name: item.title,
                                          quantity: 1,
                                          unitPrice: item.totalAmount,
                                          totalPrice: item.totalAmount,
                                          type: 'part' as const
                                        }
                                      ],
                                      environment: db.sefazConfig?.environment || 'homologation'
                                    };
                                    setSelectedDocForDanfe(fallbackDoc);
                                  }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition cursor-pointer"
                                  title="Visualizar / Reimprimir DANFE"
                                >
                                  DANFE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const foundDoc = (db.fiscalDocuments || []).find(d => d.id === item.nfeId || d.code === item.nfeCode || d.accessKey === item.nfeAccessKey);
                                    if (foundDoc) {
                                      handleDownloadXml(foundDoc);
                                    } else {
                                      handleDownloadXml({
                                        id: item.nfeId || `nfe-${Date.now()}`,
                                        code: item.nfeCode || 'NFE-000101',
                                        type: 'nfe_product',
                                        status: 'authorized',
                                        accessKey: item.nfeAccessKey || `352607${Date.now()}12345678901234567890`,
                                        protocolNumber: `135260012345678`,
                                        issueDate: item.dueDate || new Date().toISOString().split('T')[0],
                                        issuedAt: `${item.dueDate || new Date().toISOString().split('T')[0]} 10:00:00`,
                                        companyId: item.companyId || currentUser.companyId || 'company-001',
                                        companyName: db.companyInfo?.tradeName || db.companyInfo?.name || 'Oficina Mecânica',
                                        companyCnpj: db.companyInfo?.cnpj || '00.000.000/0001-91',
                                        clientName: item.clientName,
                                        clientCpfCnpj: item.clientCpf,
                                        cfop: '5.102',
                                        sefazStatusMessage: '100 - Autorizado o uso da NF-e',
                                        totalProducts: item.totalAmount,
                                        totalServices: 0,
                                        totalTaxes: item.totalAmount * 0.08,
                                        totalAmount: item.totalAmount,
                                        items: [],
                                        environment: db.sefazConfig?.environment || 'homologation'
                                      });
                                    }
                                  }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                  title="Baixar XML Oficial da NF-e"
                                >
                                  XML
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickEmitNfe(item)}
                                disabled={currentUser.permissions?.fiscalEmit === false}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                                  currentUser.permissions?.fiscalEmit === false
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-800 border-slate-200 cursor-pointer'
                                }`}
                                title={
                                  currentUser.permissions?.fiscalEmit === false
                                    ? 'Sem permissão para emitir NF-e'
                                    : 'Emitir NF-e para este Contas a Receber'
                                }
                              >
                                🧾 Emitir NF-e
                              </button>
                            )}

                            {item.boletoCode ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  📄 {item.boletoCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const foundBoleto = (db.boletos || []).find(b => b.id === item.boletoId || b.code === item.boletoCode);
                                    const fallbackBoleto: BoletoDocument = foundBoleto || {
                                      id: item.boletoId || `bol-${Date.now()}`,
                                      code: item.boletoCode || 'BOL-001',
                                      bankCode: '341',
                                      bankName: 'Itaú Unibanco',
                                      barcodeNumber: item.boletoBarcode || '34191.09008 00000.123456 78901.234567 1 90000000010000',
                                      pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${item.remainingAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
                                      pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${item.remainingAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
                                      payerName: item.clientName,
                                      payerCpfCnpj: item.clientCpf || '000.000.000-00',
                                      amount: item.remainingAmount > 0 ? item.remainingAmount : item.totalAmount,
                                      dueDate: item.dueDate,
                                      issueDate: new Date().toISOString().split('T')[0],
                                      status: item.status === 'paid' ? 'paid' : 'registered',
                                      companyId: item.companyId || currentUser.companyId || 'company-001',
                                      receivableId: item.id
                                    };
                                    setSelectedBoletoForView(fallbackBoleto);
                                  }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition cursor-pointer"
                                  title="Visualizar / Reimprimir Boleto"
                                >
                                  Ver / Imprimir
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickGenerateBoleto(item)}
                                disabled={currentUser.permissions?.boletoGenerate === false}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                                  currentUser.permissions?.boletoGenerate === false
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800 border-slate-200 cursor-pointer'
                                }`}
                                title={
                                  currentUser.permissions?.boletoGenerate === false
                                    ? 'Sem permissão para gerar Boleto'
                                    : 'Gerar Boleto para este Contas a Receber'
                                }
                              >
                                📄 Gerar Boleto
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600">
                          {item.installmentsCount}x parcela(s)
                        </td>
                        <td className="p-4 font-mono font-semibold text-slate-800">
                          R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          <p className="text-emerald-600 font-semibold">
                            Pago: R$ {item.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`font-semibold ${item.remainingAmount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            Resta: R$ {item.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="p-4">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full border border-rose-200 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" /> Limite Excedido
                            </span>
                          ) : isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> Quitado
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                              Parcialmente Pago
                            </span>
                          ) : item.status === 'approved_by_manager' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                              <ShieldCheck className="w-3.5 h-3.5" /> Liberado p/ Gerente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          {/* Botão de Emitir Comprovante em PDF / WhatsApp */}
                          <button
                            id={`btn-receipt-pdf-${item.id}`}
                            onClick={() => {
                              const itemClient = clients.find(c => c.id === item.clientId);
                              const itemVehicle = (db.vehicles || []).find(v => v.clientId === item.clientId);
                              setShareModalData({
                                isOpen: true,
                                docId: item.code,
                                client: itemClient,
                                vehicle: itemVehicle,
                                items: (item.installments || []).map(inst => ({
                                  name: `Parcela ${inst.installmentNumber}/${inst.totalInstallments} (Vencimento: ${inst.dueDate})`,
                                  quantity: 1,
                                  unitPrice: inst.amount,
                                  totalPrice: inst.paidAmount,
                                  status: inst.status === 'paid' ? 'approved' : inst.status === 'partially_paid' ? 'executed' : 'pending'
                                })),
                                totalValue: item.paidAmount > 0 ? item.paidAmount : item.totalAmount,
                                notes: item.notes || `Comprovante de pagamento do título ${item.code}`,
                                paymentDetails: {
                                  paidAmount: item.paidAmount > 0 ? item.paidAmount : item.totalAmount,
                                  remainingAmount: item.remainingAmount,
                                  paymentMethod: item.paymentMethod || 'PIX',
                                  paymentDate: item.dueDate,
                                  receiptCode: `REC-${item.code}`
                                }
                              });
                            }}
                            className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 font-semibold px-2 py-1 rounded-md transition text-xs border border-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                            title="Emitir Comprovante de Pagamento em PDF / WhatsApp"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Comprovante PDF</span>
                          </button>

                          {isBlocked ? (
                            <button
                              id={`btn-manager-approve-${item.id}`}
                              onClick={() => openManagerModal(item)}
                              className="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 font-semibold px-2.5 py-1 rounded-md transition text-xs border border-rose-200 inline-flex items-center gap-1 cursor-pointer"
                              title="Analisar e Liberar pelo Gerente"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Analisar / Liberar
                            </button>
                          ) : !isPaid ? (
                            <button
                              id={`btn-abate-payment-${item.id}`}
                              onClick={() => openPayModal(item)}
                              className="text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 font-semibold px-2.5 py-1 rounded-md transition text-xs border border-indigo-200 inline-flex items-center gap-1 cursor-pointer"
                              title="Baixar / Abater Pagamento"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Abater Pagamento
                            </button>
                          ) : null}

                          <button
                            id={`btn-view-details-${item.id}`}
                            onClick={() => { setSelectedReceivable(item); setIsDetailModalOpen(true); }}
                            className="text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 font-medium px-2 py-1 rounded-md transition text-xs inline-flex items-center gap-1 cursor-pointer"
                            title="Ver Detalhes do Título"
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

      {/* MODAL 1: Abater Pagamento / Baixa de Parcelas */}
      {isPayModalOpen && selectedReceivable && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-payment-abatement">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Registrar Pagamento / Abater Dívida
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 mb-4 text-xs space-y-1">
              <p><span className="font-semibold text-slate-700">Título:</span> {selectedReceivable.code} - {selectedReceivable.title}</p>
              <p><span className="font-semibold text-slate-700">Cliente:</span> {selectedReceivable.clientName}</p>
              <div className="flex justify-between font-mono pt-1 text-slate-800">
                <span>Valor Total: R$ {selectedReceivable.totalAmount.toFixed(2)}</span>
                <span className="text-emerald-600">Pago: R$ {selectedReceivable.paidAmount.toFixed(2)}</span>
                <span className="text-amber-600 font-bold">Saldo Devedor: R$ {selectedReceivable.remainingAmount.toFixed(2)}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleExecutePayment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Valor Pago a Abater (R$) *</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    max={selectedReceivable.remainingAmount}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 font-mono font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Forma de Pagamento *</label>
                  <select 
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full text-sm mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro em Espécie</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Transferência">Transferência Bancária</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Data do Pagamento *</label>
                  <input 
                    type="date" 
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full text-sm mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Observações / Recibo</label>
                <input 
                  type="text" 
                  value={receiptNotes}
                  onChange={e => setReceiptNotes(e.target.value)}
                  placeholder="Ex: Comprovante PIX id_89123891" 
                  className="w-full text-sm mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                />
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  Confirmar e Abater Dívida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Análise e Liberação pelo Gerente */}
      {isManagerModalOpen && selectedReceivable && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-manager-approval">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-4">
              <h3 className="font-bold text-rose-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                Análise e Liberação do Gerente (Limite Excedido)
              </h3>
              <button onClick={() => setIsManagerModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200 mb-4 space-y-2">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Alerta de Limite de Crédito Superado
              </p>
              <p>
                A venda/título <span className="font-bold font-mono">{selectedReceivable.code}</span> (Valor: R$ {selectedReceivable.totalAmount.toFixed(2)}) ultrapassou o limite cadastrado para o cliente <span className="font-bold">{selectedReceivable.clientName}</span>.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <label className="text-xs font-semibold text-slate-600">Justificativa / Nota de Liberação do Gerente</label>
              <textarea 
                rows={3}
                value={approvalNotes}
                onChange={e => setApprovalNotes(e.target.value)}
                placeholder="Ex: Venda analisada pelo Gerente Carlos Santos. Cliente em dia com histórico confiável. Liberado sob responsabilidade."
                className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button 
                type="button" 
                onClick={() => setIsManagerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
              >
                Manter Bloqueado
              </button>
              <button 
                type="button" 
                onClick={handleManagerApprove}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1"
              >
                <ShieldCheck className="w-4 h-4" /> Aprovar e Liberar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Detalhes do Parcelamento */}
      {isDetailModalOpen && selectedReceivable && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-receivable-details">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Detalhamento de Parcelas - {selectedReceivable.code}
                </h3>
                <p className="text-xs text-slate-500">{selectedReceivable.title} ({selectedReceivable.clientName})</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex justify-between text-xs font-mono">
                <div>Valor Total: R$ {selectedReceivable.totalAmount.toFixed(2)}</div>
                <div className="text-emerald-600 font-bold">Pago: R$ {selectedReceivable.paidAmount.toFixed(2)}</div>
                <div className="text-amber-600 font-bold">Saldo: R$ {selectedReceivable.remainingAmount.toFixed(2)}</div>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {selectedReceivable.installments.map(inst => (
                  <div key={inst.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-700">Parcela {inst.installmentNumber} / {inst.totalInstallments}</p>
                      <p className="text-slate-400 font-mono">Vencimento: {inst.dueDate}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-800">R$ {inst.amount.toFixed(2)}</p>
                      {inst.status === 'paid' ? (
                        <p className="text-emerald-600 font-semibold text-[11px]">Quitada ({inst.paymentMethod})</p>
                      ) : inst.status === 'partially_paid' ? (
                        <p className="text-amber-600 font-semibold text-[11px]">Pago Parcial: R$ {inst.paidAmount.toFixed(2)}</p>
                      ) : (
                        <p className="text-slate-400 text-[11px]">Pendente</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedReceivable.managerApproval && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Autorizado pelo Gerente {selectedReceivable.managerApproval.approvedBy}
                  </p>
                  <p className="italic">"{selectedReceivable.managerApproval.notes}"</p>
                  <p className="text-[10px] text-blue-600 font-mono">{new Date(selectedReceivable.managerApproval.approvedAt).toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
              <button
                id={`btn-receipt-details-${selectedReceivable.id}`}
                onClick={() => {
                  const itemClient = clients.find(c => c.id === selectedReceivable.clientId);
                  const itemVehicle = (db.vehicles || []).find(v => v.clientId === selectedReceivable.clientId);
                  setShareModalData({
                    isOpen: true,
                    docId: selectedReceivable.code,
                    client: itemClient,
                    vehicle: itemVehicle,
                    items: (selectedReceivable.installments || []).map(inst => ({
                      name: `Parcela ${inst.installmentNumber}/${inst.totalInstallments} (Vencimento: ${inst.dueDate})`,
                      quantity: 1,
                      unitPrice: inst.amount,
                      totalPrice: inst.paidAmount,
                      status: inst.status === 'paid' ? 'approved' : inst.status === 'partially_paid' ? 'executed' : 'pending'
                    })),
                    totalValue: selectedReceivable.paidAmount > 0 ? selectedReceivable.paidAmount : selectedReceivable.totalAmount,
                    notes: selectedReceivable.notes || `Comprovante de pagamento do título ${selectedReceivable.code}`,
                    paymentDetails: {
                      paidAmount: selectedReceivable.paidAmount > 0 ? selectedReceivable.paidAmount : selectedReceivable.totalAmount,
                      remainingAmount: selectedReceivable.remainingAmount,
                      paymentMethod: selectedReceivable.paymentMethod || 'PIX',
                      paymentDate: selectedReceivable.dueDate,
                      receiptCode: `REC-${selectedReceivable.code}`
                    }
                  });
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-white" />
                <MessageSquare className="w-4 h-4 text-emerald-200" />
                <span>Emitir Comprovante PDF / Whats</span>
              </button>

              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
              >
                Fechar
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

      {/* BOLETO VISUALIZER / REPRINT MODAL */}
      {selectedBoletoForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-boleto-view">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base border border-emerald-100">
                  📄
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Boleto Bancário Híbrido (Boleto + PIX)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedBoletoForView.bankName || 'Banco Emissor'} • #{selectedBoletoForView.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBoletoForView(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* Status Header */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Boleto Registrado e Válido para Pagamento</span>
                </div>
                <span className="font-bold font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Vencimento: {selectedBoletoForView.dueDate}
                </span>
              </div>

              {/* Payer and Value Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sacado / Pagador</span>
                  <span className="font-bold text-slate-800">{selectedBoletoForView.payerName}</span>
                  <span className="text-slate-500 block font-mono text-[11px]">CPF/CNPJ: {selectedBoletoForView.payerCpfCnpj}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Valor do Documento</span>
                  <span className="font-black text-slate-900 text-lg font-mono">
                    R$ {selectedBoletoForView.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Barcode / Linha Digitável */}
              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-semibold uppercase tracking-wide">Linha Digitável (Código de Barras)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedBoletoForView.barcodeNumber, 'barcode')}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2.5 py-1 rounded font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedText === 'barcode' ? 'Copiado!' : 'Copiar Linha'}
                  </button>
                </div>
                <div className="font-mono text-xs text-amber-300 tracking-wider break-all bg-slate-950/80 p-2 rounded border border-slate-800">
                  {selectedBoletoForView.barcodeNumber}
                </div>
              </div>

              {/* PIX QR Code if Hybrid */}
              {selectedBoletoForView.pixQrCodeUrl && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={selectedBoletoForView.pixQrCodeUrl}
                    alt="QR Code Pix"
                    className="w-24 h-24 rounded-lg bg-white p-1 border border-indigo-200 shrink-0"
                  />
                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <span className="text-xs font-bold text-indigo-900 flex items-center justify-center sm:justify-start gap-1">
                      <QrCode className="w-4 h-4 text-indigo-600" /> Pix Copia e Cola Integrado
                    </span>
                    <p className="text-[11px] text-indigo-700">
                      O cliente pode pagar instantaneamente escaneando o QR Code ou colando o código Pix.
                    </p>
                    {selectedBoletoForView.pixCopiaECola && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(selectedBoletoForView.pixCopiaECola || '', 'pix')}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedText === 'pix' ? 'Pix Copiado!' : 'Copiar Código Pix'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Emissão segura MotorDesk Banking
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Imprimir Boleto
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBoletoForView(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DANFE / NF-e VISUALIZER MODAL */}
      {selectedDocForDanfe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-danfe-view">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base border border-indigo-100">
                  🧾
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Documento Auxiliar da Nota Fiscal Eletrônica (DANFE)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedDocForDanfe.code} • Status: {selectedDocForDanfe.status === 'authorized' ? 'Autorizada pela SEFAZ' : selectedDocForDanfe.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocForDanfe(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
              {/* SEFAZ Protocol & Access Key */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900">Protocolo de Autorização SEFAZ</span>
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    {selectedDocForDanfe.protocolNumber || '135260012345678'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 uppercase font-bold block mb-0.5">Chave de Acesso (44 dígitos)</span>
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-200">
                    <span className="font-mono text-xs text-slate-800 font-bold break-all">
                      {selectedDocForDanfe.accessKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedDocForDanfe.accessKey, 'danfeKey')}
                      className="ml-2 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded text-[11px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedText === 'danfeKey' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Emitente & Destinatário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Emitente</span>
                  <p className="font-bold text-slate-800">{selectedDocForDanfe.companyName}</p>
                  <p className="font-mono text-slate-500 text-[11px]">CNPJ: {selectedDocForDanfe.companyCnpj}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Destinatário / Consumidor</span>
                  <p className="font-bold text-slate-800">{selectedDocForDanfe.clientName || 'Consumidor Final'}</p>
                  <p className="font-mono text-slate-500 text-[11px]">CPF/CNPJ: {selectedDocForDanfe.clientCpfCnpj || 'Não Informado'}</p>
                </div>
              </div>

              {/* Totais */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Tributos Totais Aprox.</span>
                  <span className="font-mono font-semibold text-slate-700">R$ {(selectedDocForDanfe.totalTaxes || 0).toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Valor Total da NF-e</span>
                  <span className="font-mono font-black text-slate-900 text-lg">
                    R$ {selectedDocForDanfe.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Ambiente: {selectedDocForDanfe.environment === 'production' ? 'Produção Nacional' : 'Homologação (Sem Valor Fiscal)'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadXml(selectedDocForDanfe)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> Baixar XML
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Imprimir DANFE
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocForDanfe(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARE / PRINT PDF RECEIPT MODAL */}
      {shareModalData.isOpen && (
        <ShareDocumentModal
          isOpen={shareModalData.isOpen}
          onClose={() => setShareModalData({ ...shareModalData, isOpen: false })}
          type="receipt"
          docId={shareModalData.docId}
          client={shareModalData.client}
          vehicle={shareModalData.vehicle}
          items={shareModalData.items}
          totalValue={shareModalData.totalValue}
          companyInfo={db.companyInfo}
          notes={shareModalData.notes}
          currentUserRole={currentUser?.role}
          canCustomizePdf={currentUser?.role === 'qa' || currentUser?.permissions?.canCustomizePdf}
          paymentDetails={shareModalData.paymentDetails}
        />
      )}
    </div>
  );
}
