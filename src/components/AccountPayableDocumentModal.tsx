/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MODAL DE VISUALIZAÇÃO E DOWNLOAD DE DOCUMENTOS (BOLETOS, NOTAS FISCAIS E ANEXOS DO CONTAS A PAGAR)
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Paperclip,
  Eye,
  FileCheck,
  Upload,
  AlertCircle,
  FileCode,
  Tag,
  ExternalLink,
  Receipt,
  Layers,
  ChevronRight
} from 'lucide-react';
import { AccountPayable, AccountInstallment, AccountPayableAttachment, CompanyInfo, User } from '../types';
import { getBankMetadata, generateBarcodeSvg } from '../utils/boletoEngine';
import { generatePdfFromElement } from '../utils/pdfGenerator';

interface AccountPayableDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: AccountPayable | null;
  companyInfo?: CompanyInfo;
  currentUser?: User;
  onAddAttachment?: (payableId: string, attachment: AccountPayableAttachment) => void;
  onDeleteAttachment?: (payableId: string, attachmentId: string) => void;
}

export default function AccountPayableDocumentModal({
  isOpen,
  onClose,
  payable,
  companyInfo,
  currentUser,
  onAddAttachment,
  onDeleteAttachment
}: AccountPayableDocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'boleto' | 'nfe' | 'attachments'>('boleto');
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AccountPayableAttachment | null>(null);

  // New attachment upload state
  const [newAttName, setNewAttName] = useState('');
  const [newAttType, setNewAttType] = useState<'boleto' | 'nfe' | 'receipt' | 'invoice' | 'other'>('boleto');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Synchronize default tab on open
  React.useEffect(() => {
    if (payable) {
      if (payable.attachments && payable.attachments.length > 0 && !payable.boletoBarcode && !payable.boletoLinhaDigitavel && !payable.nfeNumber) {
        setActiveTab('attachments');
      } else if (payable.nfeNumber || payable.nfeAccessKey) {
        setActiveTab('nfe');
      } else {
        setActiveTab('boleto');
      }
      setSelectedInstallmentIndex(0);
      setPreviewAttachment(null);
    }
  }, [payable]);

  if (!isOpen || !payable) return null;

  const installments = payable.installments || [];
  const currentInstallment = installments[selectedInstallmentIndex] || installments[0] || {
    id: 'inst-default',
    installmentNumber: 1,
    totalInstallments: 1,
    amount: payable.totalAmount,
    paidAmount: payable.paidAmount,
    dueDate: payable.dueDate,
    status: payable.status
  };

  // Determine current boleto data (from installment or main payable)
  const currentBarcode = currentInstallment.boletoBarcode || payable.boletoBarcode || '34191090080000012345000000000000000000000000';
  const currentLinhaDigitavel = currentInstallment.boletoLinhaDigitavel || payable.boletoLinhaDigitavel || '34191.09008 00000.123450 00000.000000 1 98760000045000';
  const bankName = currentInstallment.boletoBankName || payable.boletoBankName || 'Itaú Unibanco';
  
  // Extract bank code if possible
  const bankCode = currentLinhaDigitavel.slice(0, 3) || '341';
  const bankMeta = getBankMetadata(bankCode);

  // Barcode SVG
  const barcodeSvg = generateBarcodeSvg(currentBarcode);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const docName = activeTab === 'nfe' 
        ? `NFe_${payable.nfeNumber || payable.code}_${payable.supplierName.replace(/\s+/g, '_')}.pdf`
        : `Boleto_${payable.code}_Parc${currentInstallment.installmentNumber}_${payable.supplierName.replace(/\s+/g, '_')}.pdf`;
      
      await generatePdfFromElement('payable-printable-doc-area', docName, 'portrait');
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const newAttachment: AccountPayableAttachment = {
        id: `att-${Date.now()}`,
        name: newAttName.trim() || file.name,
        type: newAttType,
        fileUrl: result,
        fileType: file.type,
        fileSize: sizeFormatted,
        uploadedAt: new Date().toISOString(),
        uploadedByName: currentUser?.name || 'Operador Financeiro',
        dueDate: currentInstallment.dueDate,
        amount: currentInstallment.amount,
        installmentNumber: currentInstallment.installmentNumber
      };

      if (onAddAttachment) {
        onAddAttachment(payable.id, newAttachment);
      }

      setNewAttName('');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onerror = () => {
      alert('Erro ao carregar arquivo.');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const attachments = payable.attachments || [];

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-xs overflow-hidden animate-fade-in print:bg-white print:p-0 print:m-0 print:static print:overflow-visible"
      id="modal-payable-documents"
    >
      {/* Top Header & Actions Toolbar */}
      <header className="print:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Documentos & Boletos • {payable.code}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                payable.status === 'paid' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : payable.status === 'partially_paid'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {payable.status === 'paid' ? 'Quitada' : payable.status === 'partially_paid' ? 'Parcialmente Paga' : 'Pendente'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {payable.supplierName} • Total: R$ {payable.totalAmount.toFixed(2)} • {installments.length} Parcela(s)
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-semibold">
          <button
            type="button"
            id="tab-btn-boleto"
            onClick={() => { setActiveTab('boleto'); setPreviewAttachment(null); }}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'boleto' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Boletos Bancários ({installments.length})
          </button>
          <button
            type="button"
            id="tab-btn-nfe"
            onClick={() => { setActiveTab('nfe'); setPreviewAttachment(null); }}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'nfe' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Nota Fiscal / DANFE {payable.nfeNumber ? `#${payable.nfeNumber}` : ''}
          </button>
          <button
            type="button"
            id="tab-btn-attachments"
            onClick={() => { setActiveTab('attachments'); }}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'attachments' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" /> Anexos & Arquivos ({attachments.length})
          </button>
        </div>

        {/* Actions (Download / Print / Close) */}
        <div className="flex items-center gap-2">
          {activeTab === 'boleto' && (
            <button
              type="button"
              id="btn-copy-linha-digitavel"
              onClick={() => handleCopy(currentLinhaDigitavel, 'linha')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar Linha Digitável do Boleto"
            >
              {copiedField === 'linha' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedField === 'linha' ? 'Copiada!' : 'Copiar Linha'}</span>
            </button>
          )}

          {activeTab === 'nfe' && payable.nfeAccessKey && (
            <button
              type="button"
              id="btn-copy-nfe-key"
              onClick={() => handleCopy(payable.nfeAccessKey!, 'nfe-key')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar Chave de Acesso SEFAZ"
            >
              {copiedField === 'nfe-key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedField === 'nfe-key' ? 'Chave Copiada!' : 'Copiar Chave NF-e'}</span>
            </button>
          )}

          <button
            type="button"
            id="btn-download-doc-pdf"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            title="Baixar Documento em PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar em PDF'}</span>
          </button>

          <button
            type="button"
            id="btn-print-doc"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Imprimir Documento"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            id="btn-close-doc-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Fechar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-slate-900/60 print:bg-white print:p-0">
        
        {/* TAB 1: BOLETOS BANCÁRIOS */}
        {activeTab === 'boleto' && (
          <div className="w-full max-w-4xl space-y-4">
            
            {/* Installment Selector Pill Bar (if multiple installments) */}
            {installments.length > 1 && (
              <div className="print:hidden bg-slate-800/90 border border-slate-700 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-slate-200">Selecione o Boleto da Parcela:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {installments.map((inst, idx) => {
                    const isSelected = idx === selectedInstallmentIndex;
                    const isPaid = inst.status === 'paid';
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => setSelectedInstallmentIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <span>Parcela {inst.installmentNumber}/{inst.totalInstallments}</span>
                        <span className="font-mono">(R$ {inst.amount.toFixed(2)})</span>
                        {isPaid ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Paga</span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded">Aberta</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document Render Sheet */}
            <div 
              id="payable-printable-doc-area"
              ref={printRef}
              className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 space-y-6"
            >
              {/* Boleto Bank Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-10 rounded-lg flex items-center justify-center font-black text-sm border shadow-xs"
                    style={{ backgroundColor: bankMeta.color, color: bankMeta.textColor }}
                  >
                    {bankMeta.code}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 tracking-tight">{bankMeta.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">Linha Digitável: {currentLinhaDigitavel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-slate-400 block">Comprovante de Cobrança</span>
                  <span className="text-sm font-mono font-bold text-slate-800">
                    Parcela {currentInstallment.installmentNumber} de {currentInstallment.totalInstallments}
                  </span>
                </div>
              </div>

              {/* Status Header Alert */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                currentInstallment.status === 'paid'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Status da Parcela: <strong>{currentInstallment.status === 'paid' ? 'QUITADA / PAGA' : 'EM ABERTO / AGUARDANDO PAGAMENTO'}</strong>
                  </span>
                  {currentInstallment.paymentDate && (
                    <span className="text-slate-600 font-mono">
                      (Pago em: {new Date(currentInstallment.paymentDate).toLocaleDateString('pt-BR')} via {currentInstallment.paymentMethod || 'PIX'})
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm font-black">
                  R$ {currentInstallment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Boleto Data Grid */}
              <div className="border border-slate-900 rounded-lg overflow-hidden text-xs">
                {/* Row 1: Beneficiário & Vencimento */}
                <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-900">
                  <div className="md:col-span-3 p-2.5 border-b md:border-b-0 md:border-r border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Beneficiário (Credor / Fornecedor)</span>
                    <span className="font-bold text-slate-900 text-sm block">{payable.supplierName}</span>
                    <span className="text-slate-500 font-mono text-[11px]">Categoria: {payable.category} • Ref: {payable.code}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Vencimento</span>
                    <span className="font-bold text-rose-700 text-sm font-mono block">
                      {new Date(currentInstallment.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Row 2: Documento, Aceite, Processamento e Valor */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-900">
                  <div className="p-2.5 border-r border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Número do Documento</span>
                    <span className="font-mono font-semibold text-slate-800">{payable.nfeNumber ? `NF ${payable.nfeNumber}` : payable.code}</span>
                  </div>
                  <div className="p-2.5 border-r border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Espécie Doc. / Moeda</span>
                    <span className="font-semibold text-slate-800">DM / R$ Real</span>
                  </div>
                  <div className="p-2.5 border-r border-slate-900">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Data Processamento</span>
                    <span className="font-mono text-slate-800">{new Date(payable.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Valor do Documento</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      R$ {currentInstallment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Row 3: Instruções & Demonstrativo */}
                <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-900">
                  <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r border-slate-900 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Instruções de Responsabilidade do Beneficiário</span>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      • Pagável em qualquer agência bancária, internet banking ou correspondente bancário até o vencimento.
                    </p>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      • Referente à despesa operacional <strong>{payable.description}</strong>.
                    </p>
                    {payable.notes && (
                      <p className="text-slate-600 text-[11px] font-mono bg-slate-50 p-1.5 rounded border border-slate-200">
                        Observação: {payable.notes}
                      </p>
                    )}
                  </div>
                  <div className="p-2.5 space-y-2 bg-slate-50">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">(-) Desconto / Abatimento</span>
                      <span className="font-mono text-slate-700 text-xs">R$ 0,00</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">(+) Juros / Multa</span>
                      <span className="font-mono text-slate-700 text-xs">R$ 0,00</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">(=) Valor Cobrado</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        R$ {currentInstallment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 4: Pagador (Sacado - Empresa do Sistema) */}
                <div className="p-3 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Pagador (Sacado / Devedor)</span>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-0.5">
                    <span className="font-bold text-slate-900">{companyInfo?.tradeName || companyInfo?.name || 'MotorDesk Auto Center'}</span>
                    <span className="text-slate-600 font-mono text-xs">CNPJ: {companyInfo?.cnpj || '12.345.678/0001-90'}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {companyInfo?.address || 'Av. das Nações Unidas, 1200 - São Paulo/SP'}
                  </p>
                </div>
              </div>

              {/* Barcode Render Section */}
              <div className="pt-3 border-t-2 border-dashed border-slate-300">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div 
                    className="w-full max-w-md h-16 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                  />
                  <span className="font-mono text-xs text-slate-700 font-bold tracking-widest text-center">
                    {currentBarcode}
                  </span>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                <span>MotorDesk ERP Financeiro • Autenticação Mecânica / Ficha de Compensação</span>
                <span className="font-mono">Emitido em: {new Date().toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NOTA FISCAL / DANFE */}
        {activeTab === 'nfe' && (
          <div className="w-full max-w-4xl space-y-4">
            <div 
              id="payable-printable-doc-area"
              ref={printRef}
              className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 space-y-6"
            >
              {/* DANFE Header */}
              <div className="border-2 border-slate-900 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="space-y-1">
                  <span className="text-xs uppercase font-extrabold text-slate-400 block tracking-wider">Emitente / Fornecedor</span>
                  <h3 className="font-black text-base text-slate-900">{payable.supplierName}</h3>
                  <p className="text-xs text-slate-600 font-mono">Categoria: {payable.category}</p>
                </div>

                <div className="text-center border-y md:border-y-0 md:border-x-2 border-slate-900 py-3 md:py-0 px-2 space-y-0.5">
                  <span className="text-xs font-black uppercase text-slate-900 block">DANFE</span>
                  <span className="text-[10px] text-slate-500 block">Documento Auxiliar da Nota Fiscal Eletrônica</span>
                  <div className="flex justify-center gap-3 text-xs font-mono font-bold mt-1">
                    <span>Nº: {payable.nfeNumber || '5502'}</span>
                    <span>Série: {payable.nfeSeries || '1'}</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold inline-block mt-1">
                    0 - ENTRADA
                  </span>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Chave de Acesso SEFAZ</span>
                  <span className="font-mono text-xs font-bold text-slate-900 block break-all">
                    {payable.nfeAccessKey || '35260812345678000190550010000055021000055024'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    Consulta de autenticidade no portal oficial da SEFAZ
                  </span>
                </div>
              </div>

              {/* Destinatário (Nossa Oficina) */}
              <div className="border border-slate-900 rounded-lg p-3 text-xs space-y-1 bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Destinatário / Remetente (Oficina)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nome / Razão Social</span>
                    <span className="font-bold text-slate-800">{companyInfo?.tradeName || companyInfo?.name || 'MotorDesk Auto Center'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CNPJ</span>
                    <span className="font-mono font-semibold text-slate-800">{companyInfo?.cnpj || '12.345.678/0001-90'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Data de Emissão</span>
                    <span className="font-mono text-slate-800">{new Date(payable.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {/* Duplicatas / Fatura de Cobrança */}
              <div className="border border-slate-900 rounded-lg p-3 text-xs space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Fatura / Duplicatas de Cobrança</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {installments.map((inst) => (
                    <div key={inst.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Dup. #{inst.installmentNumber}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                          inst.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {inst.status === 'paid' ? 'Paga' : 'Aberta'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] font-mono mt-1">Venc: {inst.dueDate}</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">R$ {inst.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totalizadores da Nota Fiscal */}
              <div className="border border-slate-900 rounded-lg p-4 bg-slate-900 text-white grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-xs text-slate-400 uppercase block font-semibold">Valor dos Produtos</span>
                  <span className="text-base font-mono font-bold">R$ {payable.totalAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase block font-semibold">Total de Despesas / Frete</span>
                  <span className="text-base font-mono font-bold text-slate-300">R$ 0,00</span>
                </div>
                <div>
                  <span className="text-xs text-rose-400 uppercase block font-bold">Valor Total da NF-e</span>
                  <span className="text-lg font-mono font-black text-rose-400">R$ {payable.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Dados Adicionais */}
              <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Informações Complementares</span>
                <p className="text-slate-700 leading-relaxed">{payable.description}</p>
                {payable.notes && <p className="text-slate-500 font-mono text-[11px]">{payable.notes}</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANEXOS & COMPROVANTES */}
        {activeTab === 'attachments' && (
          <div className="w-full max-w-4xl space-y-4">
            {/* Upload Box */}
            <div className="print:hidden bg-slate-800/90 border border-slate-700 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-rose-400" /> Anexar Novo Arquivo (PDF, Imagem, Boleto ou Comprovante)
                </h4>
                <span className="text-[11px] text-slate-400">Formatos: PDF, PNG, JPG, XML (Máx. 10MB)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nome do Anexo (Ex: Boleto Bradesco Parcela 1)"
                  value={newAttName}
                  onChange={e => setNewAttName(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-rose-500"
                />

                <select
                  value={newAttType}
                  onChange={e => setNewAttType(e.target.value as any)}
                  className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-rose-500"
                >
                  <option value="boleto">Boleto Bancário</option>
                  <option value="nfe">Nota Fiscal / DANFE</option>
                  <option value="receipt">Comprovante de Pagamento</option>
                  <option value="invoice">Fatura / Recibo</option>
                  <option value="other">Outros Documentos</option>
                </select>

                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg,.xml,.csv"
                    className="hidden"
                    id="file-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Enviando...' : 'Selecionar Arquivo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Attachments List */}
            {attachments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200 space-y-2">
                <Paperclip className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600 text-sm">Nenhum arquivo anexado a este lançamento.</p>
                <p className="text-xs text-slate-400">Você pode anexar boletos em PDF, imagens de comprovantes de pagamento ou arquivos de NF-e.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachments.map((att) => (
                  <div 
                    key={att.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-300 transition shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          {att.type === 'boleto' ? (
                            <Receipt className="w-5 h-5" />
                          ) : att.type === 'nfe' ? (
                            <FileCode className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate" title={att.name}>{att.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {att.fileSize || '350 KB'} • {new Date(att.uploadedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase shrink-0">
                        {att.type === 'boleto' ? 'Boleto' : att.type === 'nfe' ? 'NF-e' : att.type === 'receipt' ? 'Comprovante' : 'Doc'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">Por: {att.uploadedByName || 'Operador'}</span>
                      <div className="flex items-center gap-2">
                        {att.fileUrl && (
                          <a
                            href={att.fileUrl}
                            download={att.name}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer text-[11px]"
                            title="Baixar Arquivo Original"
                          >
                            <Download className="w-3 h-3 text-slate-600" /> Baixar
                          </a>
                        )}
                        {onDeleteAttachment && (
                          <button
                            type="button"
                            onClick={() => onDeleteAttachment(payable.id, att.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Excluir Anexo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
