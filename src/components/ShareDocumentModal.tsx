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
  Lock,
  Scissors,
  Layers,
  Columns
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
  type: 'budget' | 'service_order' | 'quotation' | 'receipt' | 'sale';
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
  onSaveCompanyOrientation?: (orientation: 'portrait' | 'landscape_2ways', docType?: string) => void;
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
  paymentDetails,
  onSaveCompanyOrientation
}: ShareDocumentModalProps) {
  const [copied, setCopied] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Check if current user is QA
  const isQA = currentUserRole === 'qa';

  // Customization State
  const defaultDocTypeLabel = type === 'budget' 
    ? 'Orçamento' 
    : type === 'service_order' 
    ? 'Ordem de Serviço' 
    : type === 'quotation' 
    ? 'Cotação' 
    : type === 'sale'
    ? 'Comprovante de Venda / Balcão'
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

  // Page Orientation Configuration (Persisted in PostgreSQL Cloud SQL via companyInfo, with localStorage fallback)
  const orientationStorageKey = `motordesk_doc_orientation_${companyInfo?.id || 'default'}_${type}`;
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape_2ways'>(() => {
    if (companyInfo?.reportCustomOrientations?.[type]) {
      const compOrient = companyInfo.reportCustomOrientations[type];
      return compOrient === 'landscape_2ways' ? 'landscape_2ways' : 'portrait';
    }
    if (companyInfo?.reportPageOrientation === 'landscape_2ways') return 'landscape_2ways';
    const saved = localStorage.getItem(orientationStorageKey);
    if (saved === 'portrait' || saved === 'landscape_2ways') return saved;
    return 'portrait';
  });

  const handleOrientationChange = (newOrientation: 'portrait' | 'landscape_2ways') => {
    if (!isQA) return;
    setPageOrientation(newOrientation);
    localStorage.setItem(orientationStorageKey, newOrientation);
    localStorage.setItem(`motordesk_doc_orientation_${companyInfo?.id || 'default'}`, newOrientation);
    if (onSaveCompanyOrientation) {
      onSaveCompanyOrientation(newOrientation, type);
    }
  };

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
    { id: 'f-2', label: 'Prazo Estimado de Execução', value: '2 dias úteis após aprovação' },
  ]);

  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Custom Editable Items Table
  const [printableItems, setPrintableItems] = useState<PrintableItem[]>(
    initialItems && initialItems.length > 0 ? initialItems : [
      { name: 'Item / Peça / Mão de Obra de Exemplo', quantity: 1, unitPrice: initialTotalValue || 0, totalPrice: initialTotalValue || 0 }
    ]
  );

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Recalculate total value based on items
  const calculatedTotalValue = printableItems.reduce((sum, item) => sum + (item.totalPrice || (item.quantity * item.unitPrice)), 0);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setPrintableItems(initialItems);
    }
  }, [initialItems]);

  if (!isOpen) return null;

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;
    setCustomFields([
      ...customFields,
      { id: `cf-${Date.now()}`, label: newFieldLabel.trim(), value: newFieldValue.trim() }
    ]);
    setNewFieldLabel('');
    setNewFieldValue('');
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const handleAddCustomItem = () => {
    if (!newItemName.trim()) return;
    const price = Number(newItemPrice) || 0;
    const qty = Number(newItemQty) || 1;
    setPrintableItems([
      ...printableItems,
      {
        id: `item-${Date.now()}`,
        name: newItemName.trim(),
        quantity: qty,
        unitPrice: price,
        totalPrice: qty * price,
        status: 'approved'
      }
    ]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setPrintableItems(printableItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: 'name' | 'quantity' | 'unitPrice', val: any) => {
    const updated = [...printableItems];
    const item = { ...updated[index] };
    if (field === 'name') item.name = val;
    if (field === 'quantity') {
      item.quantity = Number(val) || 0;
      item.totalPrice = item.quantity * item.unitPrice;
    }
    if (field === 'unitPrice') {
      item.unitPrice = Number(val) || 0;
      item.totalPrice = item.quantity * item.unitPrice;
    }
    updated[index] = item;
    setPrintableItems(updated);
  };

  const applySimplifiedPreset = () => {
    setVisibility({
      showLogo: true,
      showCompanyHeader: true,
      showClientInfo: true,
      showVehicleInfo: true,
      showUnitPrices: false,
      showStatusCol: false,
      showFiscalInfo: false,
      showNotes: false,
      showSignatureField: false,
      showPixField: true,
      showWarrantyTerms: false,
    });
  };

  const resetCustomization = () => {
    setCustomDocTitle(defaultDocTypeLabel);
    setCustomCompanyName(companyInfo?.name || 'MotorDesk Auto Center & Oficina Mecânica');
    setCustomCompanyCnpj(companyInfo?.cnpj || '12.345.678/0001-90');
    setCustomCompanyPhone(companyInfo?.phone || '(11) 3344-5566');
    setCustomCompanyAddress(companyInfo?.address || 'Av. das Nações Unidas, 1200 - SP');
    setCustomNotes(initialNotes || '');
    setWatermarkText('');
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
      showWarrantyTerms: true,
    });
    setPrintableItems(initialItems || []);
  };

  // Build formatted text for WhatsApp/Email
  const clientPhoneClean = client?.phone?.replace(/\D/g, '') || '';
  
  const itemsFormattedText = printableItems.map((item, idx) => 
    `${idx + 1}. ${item.name} (${item.quantity}x) - R$ ${(item.totalPrice || (item.quantity * item.unitPrice)).toFixed(2)}`
  ).join('\n');

  const rawWhatsappText = (type === 'receipt' || paymentDetails) ? `*${customCompanyName.toUpperCase()}*
*RECIBO DE PAGAMENTO #${paymentDetails?.receiptCode || `REC-${docId}`}*

Olá *${client?.name || 'Cliente'}*, segue a confirmação do seu pagamento:

📋 *Documento Vinculado:* ${customDocTitle} #${docId}
💰 *Valor Pago Agora:* R$ ${(paymentDetails?.paidAmount || calculatedTotalValue).toFixed(2)}
💳 *Forma de Pagamento:* ${paymentDetails?.paymentMethod || 'PIX'}
📅 *Data:* ${paymentDetails?.paymentDate || new Date().toLocaleDateString('pt-BR')}
⚖️ *Saldo Restante:* R$ ${(paymentDetails?.remainingAmount || 0).toFixed(2)}

*ITENS QUITADOS / SERVIÇOS:*
${itemsFormattedText}

Dúvidas? Entre em contato pelo WhatsApp: ${customCompanyPhone}
_Recibo eletrônico gerado pelo sistema MotorDesk._` : `*${customCompanyName.toUpperCase()}*
*${customDocTitle.toUpperCase()} Nº ${docId}*

Olá *${client?.name || 'Cliente'}*!
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
      const fileName = `${customDocTitle.replace(/\s+/g, '_')}_${docId}_${pageOrientation === 'landscape_2ways' ? '2_VIAS' : '1_VIA'}`;
      const orientationParam = pageOrientation === 'landscape_2ways' ? 'landscape' : 'portrait';
      const success = await generatePdfFromElement('printable-report-area', fileName, orientationParam);
      if (success) {
        setPdfSuccessToast(true);
        setTimeout(() => setPdfSuccessToast(false), 4500);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Render a Single Via Block
  const renderSingleVia = (viaLabel?: string, isCompact?: boolean) => {
    return (
      <div className={`space-y-3 relative ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
        {/* Via Identifier Header (if Landscape 2-way mode) */}
        {viaLabel && (
          <div className="bg-slate-800 text-white px-2.5 py-1 rounded-md flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-mono">
            <span>{viaLabel}</span>
            <span className="text-slate-400 text-[9px]">#{docId} • {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        )}

        {/* CABEÇALHO DO DOCUMENTO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-800 pb-3 gap-3">
          <div className="flex items-center gap-3">
            {visibility.showLogo && (
              <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                {companyInfo?.logoUrl ? (
                  <img src={companyInfo.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-indigo-400" />
                )}
              </div>
            )}
            
            {visibility.showCompanyHeader && (
              <div>
                <h3 className={`font-bold text-slate-900 ${isCompact ? 'text-xs' : 'text-sm sm:text-base'} leading-tight font-display`}>
                  {customCompanyName}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">CNPJ: {customCompanyCnpj}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5 text-indigo-600" /> {customCompanyPhone}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">{customCompanyAddress}</p>
              </div>
            )}
          </div>

          {/* Canto Superior Direito: Código e Tipo de Documento */}
          <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-200 pt-1.5 sm:pt-0 w-full sm:w-auto">
            <span className="text-[11px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded inline-block font-mono">
              {customDocTitle}
            </span>
            <p className="font-mono text-xs sm:text-sm font-bold text-slate-900 mt-0.5">#{docId}</p>
            <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* DADOS DO CLIENTE & VEÍCULO */}
        {(visibility.showClientInfo || visibility.showVehicleInfo) && (
          <div className={`grid ${isCompact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-2.5'}`}>
            {visibility.showClientInfo && (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-0.5 shadow-2xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-600" /> Informações do Cliente
                </span>
                <p className="font-bold text-slate-900 text-xs">{client?.name || 'Cliente Não Informado'}</p>
                {(client?.cpfCnpj || client?.cpf) && <p className="text-slate-500 font-mono text-[10px]">CPF/CNPJ: {client?.cpfCnpj || client?.cpf}</p>}
                {client?.phone && <p className="text-slate-600 text-[10px]">Tel/WhatsApp: {client.phone}</p>}
                {client?.address && <p className="text-slate-500 text-[9px] truncate">{client.address}</p>}
              </div>
            )}

            {visibility.showVehicleInfo && (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-0.5 shadow-2xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Car className="w-3 h-3 text-indigo-600" /> Informações do Veículo
                </span>
                {vehicle ? (
                  <>
                    <p className="font-bold text-slate-900 text-xs">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
                    <p className="font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-150 px-1.5 py-0.2 rounded text-[10px] inline-block uppercase mt-0.5">
                      Placa: {vehicle.plate}
                    </p>
                    {(vehicle.currentKm || vehicle.km) && <p className="text-slate-600 text-[10px] mt-0.5">KM: {vehicle.currentKm || vehicle.km} km</p>}
                  </>
                ) : (
                  <p className="text-slate-400 italic text-[10px]">Veículo não cadastrado no documento</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* RESUMO DO COMPROVANTE DE PAGAMENTO (Se for quitação) */}
        {paymentDetails && (
          <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-2.5 text-emerald-950 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-1 border-b border-emerald-200/80 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-emerald-800">Recibo de Quitação</span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-white text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                {paymentDetails.receiptCode || `REC-${docId}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-white p-1.5 rounded border border-emerald-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Valor Pago</span>
                <p className="font-mono font-bold text-emerald-700 text-xs mt-0.5">
                  R$ {paymentDetails.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="bg-white p-1.5 rounded border border-emerald-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Forma / Data</span>
                <p className="font-bold text-slate-800 text-[10px] mt-0.5 truncate">
                  {paymentDetails.paymentMethod} • {paymentDetails.paymentDate}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TABELA DE ITENS DO DOCUMENTO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 font-display">
              <FileText className="w-3 h-3 text-indigo-600" /> Detalhamento dos Itens
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
              Total: R$ {calculatedTotalValue.toFixed(2)}
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9px]">
                <tr>
                  <th className="p-2">Item / Descrição</th>
                  <th className="p-2 text-center">Qtd</th>
                  {visibility.showUnitPrices && <th className="p-2 text-right">Unitário</th>}
                  <th className="p-2 text-right">Total</th>
                  {visibility.showStatusCol && printableItems.some(i => i.status) && <th className="p-2 text-center">Status</th>}
                  {isCustomizerOpen && !isCompact && <th className="p-2 text-center no-print">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {printableItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-2 font-semibold text-slate-900">
                      {isCustomizerOpen && !isCompact ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                          className="w-full p-1 border border-slate-200 rounded text-[10px]"
                        />
                      ) : (
                        <div>
                          <div className="truncate max-w-[200px]">{item.name}</div>
                          {visibility.showFiscalInfo && (item.ncm || item.fiscalCode) && (
                            <span className="inline-block text-[8px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 rounded">
                              NCM: {item.ncm || item.fiscalCode}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-center font-mono font-bold">
                      {isCustomizerOpen && !isCompact ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-10 p-0.5 border border-slate-200 rounded text-[10px] text-center"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    {visibility.showUnitPrices && (
                      <td className="p-2 text-right font-mono text-slate-600">
                        {isCustomizerOpen && !isCompact ? (
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={e => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                            className="w-16 p-0.5 border border-slate-200 rounded text-[10px] text-right"
                          />
                        ) : (
                          `R$ ${item.unitPrice.toFixed(2)}`
                        )}
                      </td>
                    )}
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      R$ {(item.totalPrice || (item.quantity * item.unitPrice)).toFixed(2)}
                    </td>
                    {visibility.showStatusCol && printableItems.some(i => i.status) && (
                      <td className="p-2 text-center">
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {item.status === 'approved' ? 'Aprovado' : item.status === 'executed' ? 'Executado' : 'Pendente'}
                        </span>
                      </td>
                    )}
                    {isCustomizerOpen && !isCompact && (
                      <td className="p-2 text-center no-print">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-bold text-[10px] bg-slate-50 border-t border-slate-200">
                  <td colSpan={visibility.showUnitPrices ? 3 : 2} className="p-2 text-right uppercase text-slate-500">
                    Valor Total:
                  </td>
                  <td className="p-2 text-right font-mono text-emerald-700 text-xs font-extrabold">
                    R$ {calculatedTotalValue.toFixed(2)}
                  </td>
                  {visibility.showStatusCol && printableItems.some(i => i.status) && <td></td>}
                  {isCustomizerOpen && !isCompact && <td></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CAMPOS ADICIONAIS PERSONALIZADOS */}
        {customFields.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            {customFields.map(field => (
              <div key={field.id} className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 space-y-0.2">
                <span className="font-bold uppercase text-indigo-900 block">{field.label}:</span>
                <p className="text-slate-800 font-medium whitespace-pre-wrap truncate">{field.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* OBSERVAÇÕES TÉCNICAS */}
        {visibility.showNotes && customNotes && (
          <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 text-[10px] text-amber-950 space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-amber-900 block text-[9px]">
              Observações / Recomendações:
            </span>
            <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">{customNotes}</p>
          </div>
        )}

        {/* PAGAMENTO E CHAVE PIX */}
        {visibility.showPixField && (
          <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 text-[10px] text-emerald-950 flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[9px] uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-emerald-700" />
                Chave PIX Pagamento:
              </span>
              <p className="font-mono font-bold text-slate-900 text-[11px] mt-0.2">{customPixKey}</p>
            </div>
            <span className="text-[9px] text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold shrink-0">
              Comprovante via WhatsApp
            </span>
          </div>
        )}

        {/* TERMOS DE GARANTIA */}
        {visibility.showWarrantyTerms && (
          <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-500 leading-relaxed">
            <strong className="text-slate-700 block mb-0.2">Garantia:</strong>
            <p>{customWarrantyTerms}</p>
          </div>
        )}

        {/* CAMPO DE ASSINATURAS */}
        {visibility.showSignatureField && (
          <div className="pt-5 grid grid-cols-2 gap-4 text-center text-[10px]">
            <div>
              <div className="border-b border-slate-400 w-4/5 mx-auto mb-1"></div>
              <span className="font-bold text-slate-800 block truncate">{client?.name || 'Assinatura do Cliente'}</span>
              <span className="text-[8px] text-slate-400">De acordo com serviços</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-4/5 mx-auto mb-1"></div>
              <span className="font-bold text-slate-800 block truncate">{customCompanyName}</span>
              <span className="text-[8px] text-slate-400">Responsável Técnico</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in" id="share-document-modal-overlay">
      <style>{`
        @media print {
          @page {
            size: ${pageOrientation === 'landscape_2ways' ? 'landscape' : 'portrait'};
            margin: 6mm;
          }
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
            padding: 8px !important;
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

      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" id="share-document-modal-content">
        
        {/* CABEÇALHO PRINCIPAL DO MODAL */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-800 no-print shrink-0">
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
                <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 font-mono">
                  {pageOrientation === 'landscape_2ways' ? '📑 2 Vias (Paisagem)' : '📄 1 Via (Retrato)'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold font-display text-white mt-0.5">
                Relatório, Personalização de Layout & Impressão PDF
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Abrir/Fechar Painel de Personalização */}
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

            {/* Botão Imprimir em PDF */}
            <button
              id="btn-print-report-header"
              type="button"
              onClick={handlePrintReport}
              disabled={isGeneratingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </>
              )}
            </button>

            <button
              id="btn-close-share-modal-header"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL COM SCROLL INTERNO COMPLETO */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 bg-slate-100/70">
          
          {/* PAINEL LATERAL ESQUERDO: EDITOR E PERSONALIZADOR (Se Aberto) */}
          {isCustomizerOpen && (
            <div className="lg:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 no-print shadow-xs animate-scale-up overflow-y-auto max-h-[78vh]" id="pdf-customizer-sidebar">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" /> Ferramentas de Layout PDF
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                  {isQA ? 'Modo QA Ativo' : 'Visualização'}
                </span>
              </div>

              {/* SELEÇÃO DA ORIENTAÇÃO DA PÁGINA (EXCLUSIVO QA) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5 text-indigo-600" />
                    Orientação e Vias da Página:
                  </span>
                  {isQA ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Permissão QA OK
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Bloqueado (Apenas QA)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Opção Retrato (1 Via) */}
                  <button
                    type="button"
                    disabled={!isQA}
                    onClick={() => handleOrientationChange('portrait')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pageOrientation === 'portrait'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 text-indigo-950 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    } ${!isQA ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <FileText className={`w-4 h-4 ${pageOrientation === 'portrait' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {pageOrientation === 'portrait' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">Retrato</span>
                      <span className="text-[9px] text-slate-500">1 Via Completa Vertical</span>
                    </div>
                  </button>

                  {/* Opção Paisagem (2 Vias Idênticas) */}
                  <button
                    type="button"
                    disabled={!isQA}
                    onClick={() => handleOrientationChange('landscape_2ways')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      pageOrientation === 'landscape_2ways'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 text-indigo-950 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    } ${!isQA ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <Columns className={`w-4 h-4 ${pageOrientation === 'landscape_2ways' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {pageOrientation === 'landscape_2ways' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold leading-tight">Paisagem</span>
                      <span className="text-[9px] text-slate-500">2 Vias Iguais (Corte ✂)</span>
                    </div>
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  {isQA ? (
                    '✨ Como usuário QA, sua escolha de orientação será memorizada e aplicada automaticamente em todos os relatórios desta categoria para o cliente.'
                  ) : (
                    '🔒 A orientação da página é configurada exclusivamente pelo usuário do time QA e é aplicada automaticamente.'
                  )}
                </p>
              </div>

              {/* PRESETS RÁPIDOS */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block border-b border-slate-100 pb-1">
                  Modelos Prontos:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setWatermarkText('');
                      setCustomDocTitle(defaultDocTypeLabel);
                    }}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded font-bold text-[10px] text-left transition flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" /> Preset Padrão
                  </button>
                  <button
                    type="button"
                    onClick={applySimplifiedPreset}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded font-bold text-[10px] text-left transition flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-indigo-600 shrink-0" /> Simplificado
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
                  Exibir / Ocultar Seções:
                </span>
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showLogo} onChange={e => setVisibility({...visibility, showLogo: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Logomarca (Canto Sup. Esq.)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={visibility.showCompanyHeader} onChange={e => setVisibility({...visibility, showCompanyHeader: e.target.checked})} className="rounded text-indigo-600" />
                    <span>Dados da Empresa (CNPJ/Tel)</span>
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
                    <span>Classificação Fiscal (NCM)</span>
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
                    <span>Termos de Garantia</span>
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
                  <label className="text-[10px] text-slate-500 font-semibold">Marca D'água:</label>
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
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition cursor-pointer"
                  >
                    + Adicionar Item ao PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAINEL CENTRAL/DIREITO: ÁREA DO DOCUMENTO IMPRESSO (A4 RETRATO OU PAISAGEM COM 2 VIAS) */}
          <div className={`${isCustomizerOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`} id="printable-preview-column">
            
            {/* ÁREA EFETIVA DE IMPRESSÃO (TARGET PARA JSPDF E IMPRESSÃO) */}
            <div 
              id="printable-report-area" 
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-lg text-slate-800 relative overflow-hidden"
            >
              {/* Marca D'água Opcional */}
              {watermarkText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-10 rotate-[-35deg]">
                  <span className="text-6xl sm:text-8xl font-black uppercase text-slate-900 tracking-widest font-mono text-center">
                    {watermarkText}
                  </span>
                </div>
              )}

              {/* RENDERIZAÇÃO CONFORME A ORIENTAÇÃO SELECIONADA */}
              {pageOrientation === 'portrait' ? (
                /* MODO RETRATO: 1 VIA COMPLETA VERTICAL */
                renderSingleVia()
              ) : (
                /* MODO PAISAGEM: 2 VIAS IGUAIS LADO A LADO COM LINHA DE CORTE */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  {/* 1ª VIA: ESTABELECIMENTO / CONTROLE INTERNO */}
                  <div className="space-y-2 pr-0 md:pr-4">
                    {renderSingleVia('1ª VIA • ESTABELECIMENTO / CONTROLE', true)}
                  </div>

                  {/* LINHA DIVISÓRIA DE CORTE COM TESOURA */}
                  <div className="hidden md:flex flex-col items-center justify-center absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="h-full border-l-2 border-dashed border-slate-300 relative flex items-center justify-center">
                      <span className="bg-white p-1 rounded-full border border-slate-300 text-slate-500 shadow-2xs text-[10px] flex items-center gap-1 font-mono">
                        <Scissors className="w-3 h-3 text-slate-600" />
                        <span className="text-[8px] uppercase">Corte</span>
                      </span>
                    </div>
                  </div>

                  {/* 2ª VIA: CLIENTE / CONSUMIDOR */}
                  <div className="space-y-2 pl-0 md:pl-4 border-t md:border-t-0 border-dashed border-slate-300 pt-4 md:pt-0">
                    {renderSingleVia('2ª VIA • CLIENTE / CONSUMIDOR', true)}
                  </div>
                </div>
              )}
            </div>

            {/* MENSAGEM FORMATADA PARA WHATSAPP / E-MAIL */}
            <div className="space-y-2 pt-2 no-print bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Texto Formatado para Envio Instantâneo
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
                rows={3}
                value={rawWhatsappText}
                className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 focus:outline-hidden resize-none"
              />
            </div>

            {/* BOTÕES DE AÇÃO DIRETA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 no-print">
              <a
                id="btn-send-whatsapp-link"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-xs cursor-pointer text-center"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar via WhatsApp
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                id="btn-send-email-link"
                href={mailtoUrl}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-xs cursor-pointer text-center"
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
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-xs cursor-pointer text-center"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>Gerando Arquivo PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Baixar PDF ({pageOrientation === 'landscape_2ways' ? '2 Vias Paisagem' : '1 Via Retrato'})</span>
                  </>
                )}
              </button>
            </div>

            {pdfSuccessToast && (
              <div className="bg-emerald-500 text-white text-xs font-bold p-3 rounded-xl shadow-lg flex items-center justify-between animate-fade-in no-print">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Arquivo PDF ({pageOrientation === 'landscape_2ways' ? 'Paisagem 2 Vias' : 'Retrato 1 Via'}) gerado com sucesso!</span>
                </div>
                <span className="text-[10px] bg-emerald-600 px-2 py-0.5 rounded">Download Concluído</span>
              </div>
            )}

          </div>
        </div>

        {/* RODAPÉ DO MODAL (SEMPRE VISÍVEL COM BOTÕES FORA DO SCROLL) */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 no-print shrink-0">
          <div className="flex items-center gap-2">
            <span>Empresa: <strong>{customCompanyName}</strong></span>
            {isQA ? (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                Configurador de Orientação QA Liberado
              </span>
            ) : (
              <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                Orientação Oficial Fixada pelo QA
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs cursor-pointer transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
