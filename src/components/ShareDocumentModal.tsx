/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Building2, 
  User, 
  Car, 
  FileText,
  Send,
  Printer,
  Sparkles,
  Phone,
  CheckCircle,
  SlidersHorizontal,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  Edit3,
  CreditCard,
  FileCheck2,
  Loader2,
  Download,
  Receipt,
  Lock
} from 'lucide-react';
import { Client, Vehicle, CompanyInfo } from '../types';
import { generatePdfFromElement } from '../utils/pdfGenerator';

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface PrintableItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status?: string;
  ncm?: string;
  fiscalCode?: string;
}

export interface PaymentDetails {
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentDate: string;
  receiptCode?: string;
  notes?: string;
}

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'budget' | 'service_order' | 'quotation' | 'receipt';
  docId: string;
  client?: Client;
  vehicle?: Vehicle;
  items: PrintableItem[];
  totalValue: number;
  companyInfo?: CompanyInfo;
  notes?: string;
  currentUserRole?: string;
  canCustomizePdf?: boolean;
  paymentDetails?: PaymentDetails;
}

export default function ShareDocumentModal({
  isOpen,
  onClose,
  type,
  docId,
  client,
  vehicle,
  items: initialItems,
  totalValue: initialTotalValue,
  companyInfo,
  notes: initialNotes,
  currentUserRole = 'admin',
  canCustomizePdf = true,
  paymentDetails
}: ShareDocumentModalProps) {
  const [copied, setCopied] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Check if current user is QA or has explicit permission to customize PDF
  const isQA = currentUserRole === 'qa' || canCustomizePdf;

  // Customization State
  const defaultDocTypeLabel = type === 'budget' 
    ? 'Orçamento' 
    : type === 'service_order' 
    ? 'Ordem de Serviço' 
    : type === 'quotation' 
    ? 'Cotação' 
    : 'Comprovante de Pagamento';
  
  const [customDocTitle, setCustomDocTitle] = useState(defaultDocTypeLabel);
  const [customCompanyName, setCustomCompanyName] = useState(companyInfo?.name || 'MotorDesk Auto Center & Oficina Mecânica');
  const [customCompanyCnpj, setCustomCompanyCnpj] = useState(companyInfo?.cnpj || '12.345.678/0001-90');
  const [customCompanyPhone, setCustomCompanyPhone] = useState(companyInfo?.phone || '(11) 3344-5566');
  const [customCompanyAddress, setCustomCompanyAddress] = useState(companyInfo?.address || 'Av. das Nações Unidas, 1200 - SP');
  const [customNotes, setCustomNotes] = useState(initialNotes || '');
  const [customPixKey, setCustomPixKey] = useState(companyInfo?.cnpj || '12.345.678/0001-90 (Chave PIX CNPJ)');
  const [customWarrantyTerms, setCustomWarrantyTerms] = useState('Garantia legal de 90 dias para peças e serviços conforme o Artigo 26 do Código de Defesa do Consumidor. Proposta válida por 10 dias.');
  const [watermarkText, setWatermarkText] = useState('');

  // Toggles for Sections (Show/Hide)
  const [visibility, setVisibility] = useState({
    showLogo: true,
    showCompanyHeader: true,
    showClientInfo: true,
    showVehicleInfo: true,
    showUnitPrices: true,
    showStatusCol: true,
    showFiscalInfo: true,
    showNotes: true,
    showSignatureField: true,
    showPixField: true,
    showWarrantyTerms: true,
  });

  // Custom Key-Value Fields Added by User
  const [customFields, setCustomFields] = useState<CustomField[]>([
    { id: 'f-1', label: 'Validade do Documento', value: '10 Dias a contar da data de emissão' },
    { id: 'f-2', label: 'Forma de Pagamento', value: 'PIX, Cartão até 10x ou Boleto Bancário' }
  ]);

  // Editable Items List for the Printout
  const [printableItems, setPrintableItems] = useState<PrintableItem[]>(initialItems);

  // New Custom Field Form State
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // New Custom Line Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Reset/Sync state when modal opens or props change
  useEffect(() => {
    setCustomDocTitle(
      type === 'budget' 
        ? 'Orçamento' 
        : type === 'service_order' 
        ? 'Ordem de Serviço' 
        : type === 'quotation' 
        ? 'Cotação' 
        : 'Comprovante de Pagamento'
    );
    setCustomCompanyName(companyInfo?.name || 'MotorDesk Auto Center & Oficina Mecânica');
    setCustomCompanyCnpj(companyInfo?.cnpj || '12.345.678/0001-90');
    setCustomCompanyPhone(companyInfo?.phone || '(11) 3344-5566');
    setCustomCompanyAddress(companyInfo?.address || 'Av. das Nações Unidas, 1200 - SP');
    setCustomNotes(initialNotes || '');
    setPrintableItems(initialItems);
    if (!isQA) {
      setIsCustomizerOpen(false);
    }
  }, [isOpen, type, companyInfo, initialNotes, initialItems, isQA]);

  if (!isOpen) return null;

  // Calculate printable total
  const calculatedTotalValue = printableItems.reduce((acc, item) => acc + (item.totalPrice || (item.quantity * item.unitPrice)), 0);

  // Handlers for Custom Fields
  const handleAddCustomField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;
    setCustomFields([
      ...customFields,
      { id: `f-${Date.now()}`, label: newFieldLabel.trim(), value: newFieldValue.trim() }
    ]);
    setNewFieldLabel('');
    setNewFieldValue('');
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  // Handlers for Items
  const handleAddCustomItem = () => {
    if (!newItemName.trim()) return;
    const qty = Number(newItemQty) || 1;
    const price = Number(newItemPrice) || 0;
    const newItem: PrintableItem = {
      id: `pi-${Date.now()}`,
      name: newItemName.trim(),
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
      status: 'approved'
    };
    setPrintableItems([...printableItems, newItem]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setPrintableItems(printableItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PrintableItem, val: any) => {
    const updated = [...printableItems];
    const item = { ...updated[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      item.totalPrice = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }
    updated[index] = item;
    setPrintableItems(updated);
  };

  // Presets
  const applyQaPreset = () => {
    setWatermarkText('HOMOLOGAÇÃO QA - TESTE');
    setCustomDocTitle(`RELATÓRIO QA - ${defaultDocTypeLabel.toUpperCase()}`);
    setVisibility({
      showLogo: true,
      showCompanyHeader: true,
      showClientInfo: true,
      showVehicleInfo: true,
      showUnitPrices: true,
      showStatusCol: true,
      showFiscalInfo: true,
      showNotes: true,
      showSignatureField: true,
      showPixField: true,
      showWarrantyTerms: true
    });
  };

  const applySimplifiedPreset = () => {
    setWatermarkText('');
    setCustomDocTitle(defaultDocTypeLabel);
    setVisibility({
      showLogo: true,
      showCompanyHeader: true,
      showClientInfo: true,
      showVehicleInfo: true,
      showUnitPrices: false, // Oculta coluna unitária
      showStatusCol: false,
      showFiscalInfo: false,
      showNotes: true,
      showSignatureField: true,
      showPixField: true,
      showWarrantyTerms: false
    });
  };

  const resetCustomization = () => {
    setWatermarkText('');
    setCustomDocTitle(defaultDocTypeLabel);
    setCustomCompanyName(companyInfo?.name || 'MotorDesk Auto Center & Oficina Mecânica');
    setCustomNotes(initialNotes || '');
    setPrintableItems(initialItems);
    setVisibility({
      showLogo: true,
      showCompanyHeader: true,
      showClientInfo: true,
      showVehicleInfo: true,
      showUnitPrices: true,
      showStatusCol: true,
      showFiscalInfo: true,
      showNotes: true,
      showSignatureField: true,
      showPixField: true,
      showWarrantyTerms: true
    });
  };

  // Clean client phone for WhatsApp
  const getCleanPhone = (phoneStr?: string) => {
    if (!phoneStr) return '';
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  };

  const clientPhoneClean = getCleanPhone(client?.phone);

  // Formatted items for WhatsApp/Email
  const itemsFormattedText = printableItems.map(
    item => `• ${item.name} (${item.quantity}x R$ ${item.unitPrice.toFixed(2)}) = R$ ${item.totalPrice.toFixed(2)}`
  ).join('\n');

  const rawWhatsappText = (type === 'receipt' || paymentDetails) ? `*${customCompanyName.toUpperCase()}*
CNPJ: ${customCompanyCnpj} | Tel: ${customCompanyPhone}
----------------------------------------
Olá, *${client?.name || 'Cliente'}*! 🚗

Segue o seu *${customDocTitle}*:
📋 *Código/Título:* ${docId}
${paymentDetails ? `💵 *Valor Pago Agora:* R$ ${paymentDetails.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
💳 *Forma de Pagamento:* ${paymentDetails.paymentMethod}
📅 *Data do Recebimento:* ${paymentDetails.paymentDate}
📉 *Saldo Restante:* ${paymentDetails.remainingAmount <= 0.01 ? 'TOTALMENTE QUITADO ✅' : `R$ ${paymentDetails.remainingAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}` : ''}
${vehicle ? `\n🚘 *Veículo:* ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - Placa: ${vehicle.plate}` : ''}

*DETALHAMENTO DOS ITENS E PARCELAS:*
${itemsFormattedText}

💰 *VALOR TOTAL PROCESSADO:* R$ ${calculatedTotalValue.toFixed(2)}
${customNotes ? `\n📝 *Observações:* ${customNotes}` : ''}

Agradecemos a preferência! Dúvidas, fale conosco: ${customCompanyPhone}

_Comprovante emitido via MotorDesk System._` : `*${customCompanyName.toUpperCase()}*
CNPJ: ${customCompanyCnpj} | Tel: ${customCompanyPhone}
----------------------------------------
Olá, *${client?.name || 'Cliente'}*! 🚗

Segue o resumo do seu *${customDocTitle}*:
📋 *Código:* ${docId}
🚘 *Veículo:* ${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : 'N/A'}
🔢 *Placa:* ${vehicle?.plate || 'N/A'}

*DETALHAMENTO DOS ITENS E SERVIÇOS:*
${itemsFormattedText}

💰 *VALOR TOTAL:* R$ ${calculatedTotalValue.toFixed(2)}
${customNotes ? `\n📝 *Observações:* ${customNotes}` : ''}
${visibility.showPixField ? `\n💳 *Chave PIX para Pagamento:* ${customPixKey}` : ''}

Dúvidas ou confirmações, fale conosco pelo WhatsApp: ${customCompanyPhone}

_Relatório emitido via MotorDesk System._`;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${clientPhoneClean}&text=${encodeURIComponent(rawWhatsappText)}`;

  const emailSubject = `${customDocTitle} ${docId} - ${customCompanyName}`;
  const emailBody = (type === 'receipt' || paymentDetails)
    ? `Olá ${client?.name || 'Cliente'},\n\nConfirmamos o recebimento do seu pagamento referente ao título ${docId}:\n\nValor Pago: R$ ${(paymentDetails?.paidAmount || calculatedTotalValue).toFixed(2)}\nForma de Pagamento: ${paymentDetails?.paymentMethod || 'PIX'}\nData: ${paymentDetails?.paymentDate || new Date().toLocaleDateString('pt-BR')}\nSaldo Restante: R$ ${(paymentDetails?.remainingAmount || 0).toFixed(2)}\n\nDETALHAMENTO DOS ITENS:\n${itemsFormattedText}\n\nAtenciosamente,\n${customCompanyName}\nTel: ${customCompanyPhone}`
    : `Olá ${client?.name || 'Cliente'},\n\nAgradecemos a preferência! Segue o detalhamento do seu ${customDocTitle}:\n\nCódigo: ${docId}\nVeículo: ${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : 'N/A'}\nPlaca: ${vehicle?.plate || 'N/A'}\n\nDETALHAMENTO DOS ITENS:\n${itemsFormattedText}\n\nVALOR TOTAL: R$ ${calculatedTotalValue.toFixed(2)}\n${customNotes ? `\nObservações: ${customNotes}` : ''}\n\nAtenciosamente,\n${customCompanyName}\nTel: ${customCompanyPhone}`;
  const mailtoUrl = `mailto:${client?.email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(rawWhatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState(false);

  const handlePrintReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const fileName = `${customDocTitle.replace(/\s+/g, '_')}_${docId}`;
      const success = await generatePdfFromElement('printable-report-area', fileName);
      if (success) {
        setPdfSuccessToast(true);
        setTimeout(() => setPdfSuccessToast(false), 4500);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in" id="share-document-modal-overlay">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]" id="share-document-modal-content">
        
        {/* CABEÇALHO PRINCIPAL DO MODAL */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded">
                  {customDocTitle}
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold">#{docId}</span>
                {canCustomizePdf && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Personalizador Ativo
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold font-display text-white mt-0.5">
                Relatório, Personalização de Layout & Impressão PDF
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Abrir/Fechar Painel de Personalização */}
            {canCustomizePdf ? (
              <button
                id="btn-toggle-pdf-customizer"
                type="button"
                onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
                className={`font-bold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer border ${
                  isCustomizerOpen 
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs' 
                    : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{isCustomizerOpen ? 'Ocultar Editor' : 'Personalizar Layout PDF'}</span>
              </button>
            ) : null}

            {/* Botão Imprimir em PDF */}
            <button
              id="btn-print-report-header"
              type="button"
              onClick={handlePrintReport}
              disabled={isGeneratingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Gerar e Baixar PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Gerar / Imprimir PDF</span>
                </>
              )}
            </button>

            <button
              id="btn-close-share-modal"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL (Com Split se Customizer Estiver Aberto) */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* PAINEL DE PERSONALIZAÇÃO (CUSTOMIZER PAINEL - LADO ESQUERDO/TOPO) */}
          {isCustomizerOpen && (
            <div className="w-full lg:w-80 bg-slate-50 p-4 space-y-4 no-print shrink-0 border-b lg:border-b-0 border-slate-200 text-xs overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Editor & Campos do PDF
                </span>
              </div>

              {/* Botões de Presets Rápidos */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Modelos Prontos:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setWatermarkText('');
                      setCustomDocTitle(defaultDocTypeLabel.toUpperCase());
                    }}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded font-bold text-[10px] text-left transition flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" /> Preset Oficial Padrão
                  </button>
                  <button
                    type="button"
                    onClick={applySimplifiedPreset}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded font-bold text-[10px] text-left transition flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-indigo-600 shrink-0" /> Layout Simplificado
                  </button>
                </div>
                <button
                  type="button"
                  onClick={resetCustomization}
                  className="w-full p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                </button>
              </div>

              {/* VISIBILIDADE DAS SEÇÕES */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block border-b border-slate-100 pb-1">
                  Exibir / Ocultar Seções do PDF:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showLogo} onChange={e => setVisibility({...visibility, showLogo: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Logomarca (Canto Sup. Esq.)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showCompanyHeader} onChange={e => setVisibility({...visibility, showCompanyHeader: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Dados da Oficina (CNPJ/Tel)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showClientInfo} onChange={e => setVisibility({...visibility, showClientInfo: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Dados do Cliente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showVehicleInfo} onChange={e => setVisibility({...visibility, showVehicleInfo: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Veículo e Placa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showUnitPrices} onChange={e => setVisibility({...visibility, showUnitPrices: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Valores Unitários</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showStatusCol} onChange={e => setVisibility({...visibility, showStatusCol: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Coluna Status dos Itens</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showFiscalInfo} onChange={e => setVisibility({...visibility, showFiscalInfo: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Classificação Fiscal (NCM / LC 116)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showNotes} onChange={e => setVisibility({...visibility, showNotes: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Observações Técnicas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showPixField} onChange={e => setVisibility({...visibility, showPixField: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Chave PIX e Pagamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showWarrantyTerms} onChange={e => setVisibility({...visibility, showWarrantyTerms: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Termos de Garantia / CDC</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showSignatureField} onChange={e => setVisibility({...visibility, showSignatureField: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Campo de Assinaturas</span>
                  </label>
                </div>
              </div>

              {/* EDITAR TÍTULO E TEXTOS */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block border-b border-slate-100 pb-1">
                  Alterar Títulos e Textos:
                </span>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">Título do Documento:</label>
                  <input
                    type="text"
                    value={customDocTitle}
                    onChange={e => setCustomDocTitle(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">Nome da Empresa Exibida:</label>
                  <input
                    type="text"
                    value={customCompanyName}
                    onChange={e => setCustomCompanyName(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">Marca D'água (Ex: QA HOMOLOGAÇÃO):</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={e => setWatermarkText(e.target.value)}
                    placeholder="Deixe em branco para sem marca d'água"
                    className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 bg-amber-50/50"
                  />
                </div>
              </div>

              {/* INCLUIR CAMPOS PERSONALIZADOS */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block border-b border-slate-100 pb-1 flex items-center justify-between">
                  <span>Adicionar Campo Customizado:</span>
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                </span>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Nome do Campo (Ex: Chave PIX, Garantia)"
                    value={newFieldLabel}
                    onChange={e => setNewFieldLabel(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded"
                  />
                  <textarea
                    rows={2}
                    placeholder="Conteúdo / Valor do Campo"
                    value={newFieldValue}
                    onChange={e => setNewFieldValue(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition cursor-pointer"
                  >
                    + Incluir Campo no PDF
                  </button>
                </div>

                {customFields.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">Campos Incluídos:</span>
                    {customFields.map(field => (
                      <div key={field.id} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 text-[10px]">
                        <div className="truncate mr-2">
                          <strong className="text-slate-800">{field.label}:</strong> {field.value}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="text-rose-600 hover:text-rose-800 p-0.5 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* EDITAR ITENS IMPRESSOS */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block border-b border-slate-100 pb-1">
                  Incluir Novo Item na Lista:
                </span>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Descrição da Peça / Serviço"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] text-slate-500">Qtd:</label>
                      <input
                        type="number"
                        value={newItemQty}
                        onChange={e => setNewItemQty(Number(e.target.value))}
                        className="w-full text-xs p-1 border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500">Valor Unit (R$):</label>
                      <input
                        type="number"
                        value={newItemPrice}
                        onChange={e => setNewItemPrice(Number(e.target.value))}
                        className="w-full text-xs p-1 border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition cursor-pointer"
                  >
                    + Adicionar Item ao Relatório
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ÁREA IMPRIMÍVEL DO RELATÓRIO (PDF REPORT PREVIEW) */}
          <div className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto relative" id="printable-report-area">
            
            {/* MARCA D'ÁGUA QA (Se Ativa) */}
            {watermarkText && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
                <span className="text-4xl sm:text-6xl font-black text-rose-500/15 uppercase tracking-widest transform -rotate-30 select-none border-4 border-dashed border-rose-500/20 p-6 rounded-2xl">
                  {watermarkText}
                </span>
              </div>
            )}

            {/* BANNER / CABEÇALHO DO DOCUMENTO COM LOGO NO CANTO SUPERIOR ESQUERDO */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col sm:flex-row items-start justify-between gap-4">
              {/* Canto Superior Esquerdo: Logo da Empresa */}
              <div className="flex items-center gap-3">
                {visibility.showLogo && companyInfo?.logoUrl ? (
                  <div className="w-28 sm:w-36 h-16 bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img 
                      src={companyInfo.logoUrl} 
                      alt={`Logo ${customCompanyName}`} 
                      className="max-h-full max-w-full object-contain" 
                    />
                  </div>
                ) : visibility.showLogo ? (
                  <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold shadow-2xs">
                    <Building2 className="w-7 h-7" />
                  </div>
                ) : null}
                
                {visibility.showCompanyHeader && (
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight font-display">{customCompanyName}</h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">CNPJ: {customCompanyCnpj}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-indigo-600" /> {customCompanyPhone}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{customCompanyAddress}</p>
                  </div>
                )}
              </div>

              {/* Canto Superior Direito: Código e Tipo de Documento */}
              <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0 w-full sm:w-auto">
                <span className="text-xs uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md inline-block">
                  {customDocTitle}
                </span>
                <p className="font-mono text-sm font-bold text-slate-900 mt-1">#{docId}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* DADOS DO CLIENTE & VEÍCULO */}
            {(visibility.showClientInfo || visibility.showVehicleInfo) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {visibility.showClientInfo && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-600" /> Informações do Cliente
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{client?.name || 'Cliente Não Informado'}</p>
                    {(client?.cpfCnpj || client?.cpf) && <p className="text-slate-500 font-mono text-[11px]">CPF/CNPJ: {client?.cpfCnpj || client?.cpf}</p>}
                    {client?.phone && <p className="text-slate-600">Tel/WhatsApp: {client.phone}</p>}
                    {client?.email && <p className="text-slate-600">E-mail: {client.email}</p>}
                    {client?.address && <p className="text-slate-500 text-[11px]">{client.address}</p>}
                  </div>
                )}

                {visibility.showVehicleInfo && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-indigo-600" /> Informações do Veículo
                    </span>
                    {vehicle ? (
                      <>
                        <p className="font-bold text-slate-900 text-sm">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
                        <p className="font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded text-[11px] inline-block uppercase mt-0.5">
                          Placa: {vehicle.plate}
                        </p>
                        {(vehicle.currentKm || vehicle.km) && <p className="text-slate-600 text-[11px] mt-0.5">Quilometragem: {vehicle.currentKm || vehicle.km} km</p>}
                      </>
                    ) : (
                      <p className="text-slate-400 italic">Veículo não cadastrado no documento</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RESUMO DO COMPROVANTE DE PAGAMENTO (Se for emissão de recibo de quitação) */}
            {paymentDetails && (
              <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-4 text-emerald-950 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl font-bold shrink-0">
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Recibo Eletrônico de Quitação</span>
                      <h4 className="font-bold text-slate-900 text-base leading-tight">Comprovante de Pagamento Efetuado</h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full shadow-2xs">
                    {paymentDetails.receiptCode || `REC-${docId}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor Pago Agora</span>
                    <p className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                      R$ {paymentDetails.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Forma de Pagamento</span>
                    <p className="font-bold text-slate-800 text-xs mt-0.5">
                      {paymentDetails.paymentMethod}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Data do Recebimento</span>
                    <p className="font-mono text-slate-800 text-xs mt-0.5">
                      {paymentDetails.paymentDate}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Saldo Restante Título</span>
                    <p className={`font-mono font-bold text-xs mt-0.5 ${paymentDetails.remainingAmount <= 0.01 ? 'text-emerald-600 font-extrabold' : 'text-amber-600'}`}>
                      {paymentDetails.remainingAmount <= 0.01 ? 'TOTALMENTE QUITADO ✅' : `R$ ${paymentDetails.remainingAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TABELA DE ITENS DO DOCUMENTO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
                  <FileText className="w-4 h-4 text-indigo-600" /> Detalhamento de Itens e Mão de Obra
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Total: R$ {calculatedTotalValue.toFixed(2)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Descrição do Item / Serviço</th>
                      <th className="p-3 text-center">Qtd</th>
                      {visibility.showUnitPrices && <th className="p-3 text-right">Unitário (R$)</th>}
                      <th className="p-3 text-right">Total (R$)</th>
                      {visibility.showStatusCol && printableItems.some(i => i.status) && <th className="p-3 text-center">Status</th>}
                      {isCustomizerOpen && <th className="p-3 text-center no-print">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {printableItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">
                          {isCustomizerOpen ? (
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                              className="w-full p-1 border border-slate-200 rounded text-xs"
                            />
                          ) : (
                            <div>
                              <div>{item.name}</div>
                              {visibility.showFiscalInfo && (item.ncm || item.fiscalCode) && (
                                <span className="inline-block mt-0.5 text-[9px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                  NCM/Fiscal: {item.ncm || item.fiscalCode}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {isCustomizerOpen ? (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                              className="w-14 p-1 border border-slate-200 rounded text-xs text-center"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        {visibility.showUnitPrices && (
                          <td className="p-3 text-right font-mono text-slate-600">
                            {isCustomizerOpen ? (
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={e => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                                className="w-20 p-1 border border-slate-200 rounded text-xs text-right"
                              />
                            ) : (
                              `R$ ${item.unitPrice.toFixed(2)}`
                            )}
                          </td>
                        )}
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          R$ {(item.totalPrice || (item.quantity * item.unitPrice)).toFixed(2)}
                        </td>
                        {visibility.showStatusCol && printableItems.some(i => i.status) && (
                          <td className="p-3 text-center">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              item.status === 'approved' || item.status === 'executed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              item.status === 'postponed' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              item.status === 'rejected' || item.status === 'canceled' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {item.status === 'approved' ? 'Aprovado' :
                               item.status === 'executed' ? 'Executado' :
                               item.status === 'postponed' ? 'Adiado' :
                               item.status === 'rejected' ? 'Recusado' : 'Pendente'}
                            </span>
                          </td>
                        )}
                        {isCustomizerOpen && (
                          <td className="p-3 text-center no-print">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                              title="Remover Item da Impressão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="font-bold text-xs bg-slate-50 border-t border-slate-200">
                      <td colSpan={visibility.showUnitPrices ? 3 : 2} className="p-3 text-right uppercase text-slate-500">Valor Total do {customDocTitle}:</td>
                      <td className="p-3 text-right font-mono text-emerald-700 text-sm font-bold">R$ {calculatedTotalValue.toFixed(2)}</td>
                      {visibility.showStatusCol && printableItems.some(i => i.status) && <td></td>}
                      {isCustomizerOpen && <td></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* CAMPOS ADICIONAIS PERSONALIZADOS (Se houver) */}
            {customFields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {customFields.map(field => (
                  <div key={field.id} className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-0.5">
                    <span className="font-bold text-[10px] uppercase text-indigo-900 block">{field.label}:</span>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap">{field.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* OBSERVAÇÕES E RECOMENDAÇÕES TÉCNICAS */}
            {visibility.showNotes && customNotes && (
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900 block">
                  Observações e Recomendações Técnicas:
                </span>
                <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">{customNotes}</p>
              </div>
            )}

            {/* PAGAMENTO E CHAVE PIX */}
            {visibility.showPixField && (
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    Chave PIX para Pagamento / Faturamento:
                  </span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{customPixKey}</p>
                </div>
                <span className="text-[10px] text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-200 font-semibold">
                  Envie o comprovante via WhatsApp
                </span>
              </div>
            )}

            {/* TERMOS DE GARANTIA */}
            {visibility.showWarrantyTerms && (
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 leading-relaxed">
                <strong className="text-slate-700 block mb-0.5">Termos e Condições de Garantia:</strong>
                <p>{customWarrantyTerms}</p>
              </div>
            )}

            {/* CAMPO DE ASSINATURAS (CLIENTE E TÉCNICO) */}
            {visibility.showSignatureField && (
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-b border-slate-400 w-4/5 mx-auto mb-1"></div>
                  <span className="font-bold text-slate-800 block">{client?.name || 'Assinatura do Cliente'}</span>
                  <span className="text-[10px] text-slate-400">De acordo com orçamentos e serviços</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-4/5 mx-auto mb-1"></div>
                  <span className="font-bold text-slate-800 block">{customCompanyName}</span>
                  <span className="text-[10px] text-slate-400">Responsável Técnico / Atendimento</span>
                </div>
              </div>
            )}

            {/* MENSAGEM FORMATADA PARA COPIA/WHATSAPP */}
            <div className="space-y-2 pt-2 no-print border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Texto Formatado para WhatsApp e E-mail
                </label>

                <button
                  id="btn-copy-formatted-text"
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-150 cursor-pointer transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Texto Copiado!' : 'Copiar Texto'}
                </button>
              </div>

              <textarea
                readOnly
                rows={4}
                value={rawWhatsappText}
                className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 focus:outline-hidden resize-none"
              />
            </div>

            {/* BOTOES DE AÇÃO DIRETA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 no-print">
              <a
                id="btn-send-whatsapp-link"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md cursor-pointer text-center"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar via WhatsApp
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                id="btn-send-email-link"
                href={mailtoUrl}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md cursor-pointer text-center"
              >
                <Mail className="w-4 h-4" />
                Enviar via E-mail
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                id="btn-print-report-body"
                type="button"
                onClick={handlePrintReport}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md cursor-pointer text-center"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>Gerando Arquivo PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Baixar PDF / Imprimir</span>
                  </>
                )}
              </button>
            </div>

            {pdfSuccessToast && (
              <div className="bg-emerald-500 text-white text-xs font-bold p-3 rounded-xl shadow-lg flex items-center justify-between animate-fade-in no-print">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Arquivo PDF gerado e baixado com sucesso!</span>
                </div>
                <span className="text-[10px] bg-emerald-600 px-2 py-0.5 rounded">Download Concluído</span>
              </div>
            )}

          </div>
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 no-print shrink-0">
          <div className="flex items-center gap-2">
            <span>Oficina: <strong>{customCompanyName}</strong></span>
            {isQA && <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">Modo Edição QA Liberado</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
