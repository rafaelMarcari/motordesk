import React, { useState, useMemo } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  FileText, 
  Receipt, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  DollarSign,
  Barcode
} from 'lucide-react';

export interface BoletoClientReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: any;
  boleto: any;
  nfe?: any;
  client?: any;
  companyInfo?: any;
  alertSettings?: any;
  onAddHistoryLog?: (type: string, title: string, details: string, clientId?: string, documentId?: string) => void;
  onSendBatch?: (receivables: any[]) => void;
  allUpcomingReceivables?: any[];
}

export function BoletoClientReminderModal({
  isOpen,
  onClose,
  receivable,
  boleto,
  nfe,
  client,
  companyInfo,
  alertSettings,
  onAddHistoryLog,
  allUpcomingReceivables,
}: BoletoClientReminderModalProps) {
  if (!isOpen || !receivable) return null;

  const defaultTemplate = alertSettings?.boletoDueMessageTemplate || 
    "Olá {cliente}, lembramos que o seu boleto referente ao documento {documento} no valor de R$ {valor} vence em {vencimento}.\n\nSeguem em anexo a 2ª via do boleto bancário para pagamento {anexo_nf}.\n\nLinha digitável: {linha_digitavel}\n\nEm caso de dúvidas, favor responder a esta mensagem. Agradecemos a parceria!\n{empresa}";

  const companyName = companyInfo?.tradeName || companyInfo?.name || "Nossa Empresa";
  const clientName = client?.name || receivable?.clientName || "Cliente";
  const clientPhone = client?.phone || client?.cellphone || client?.whatsapp || "";
  const clientEmail = client?.email || "";
  const docNumber = receivable?.code || receivable?.title || "DOC-01";
  const dueDate = receivable?.dueDate || boleto?.dueDate || "";
  const remainingValue = (receivable?.remainingAmount ?? receivable?.totalAmount ?? boleto?.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const barcode = boleto?.barcodeNumber || boleto?.linhaDigitavel || receivable?.boletoBarcode || "34191.09008 00000.123450 00000.000000 1 98760000045000";
  const hasNfe = !!nfe;

  // Compute days until due date
  const daysDiff = useMemo(() => {
    if (!dueDate) return null;
    const parts = dueDate.includes('-') ? dueDate.split('-') : dueDate.split('/');
    let dDate: Date;
    if (dueDate.includes('-')) {
      dDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      dDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = dDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }, [dueDate]);

  // Replace placeholders in template
  const initialMessage = useMemo(() => {
    return defaultTemplate
      .replace(/{cliente}/g, clientName)
      .replace(/{documento}/g, docNumber)
      .replace(/{valor}/g, remainingValue)
      .replace(/{vencimento}/g, dueDate)
      .replace(/{linha_digitavel}/g, barcode)
      .replace(/{empresa}/g, companyName)
      .replace(/{anexo_nf}/g, hasNfe ? "e a Nota Fiscal Eletrônica (DANFE)" : "");
  }, [defaultTemplate, clientName, docNumber, remainingValue, dueDate, barcode, companyName, hasNfe]);

  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);
  const [includeBoleto, setIncludeBoleto] = useState(alertSettings?.attachBoletoPdf ?? true);
  const [includeNfe, setIncludeNfe] = useState(hasNfe && (alertSettings?.attachInvoiceDanfe ?? true));
  const [sentSuccess, setSentSuccess] = useState(false);

  const cleanPhone = clientPhone.replace(/\D/g, '');
  const formattedPhoneForWa = cleanPhone.length >= 10 ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    const waUrl = formattedPhoneForWa
      ? `https://api.whatsapp.com/send?phone=${formattedPhoneForWa}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    
    window.open(waUrl, '_blank');
    
    if (onAddHistoryLog) {
      onAddHistoryLog(
        "notification",
        "Lembrete de Boleto Enviado via WhatsApp",
        `Mensagem de cobrança preventiva do título ${docNumber} (vencimento: ${dueDate}, valor: R$ ${remainingValue}) enviada ao cliente ${clientName}. Anexos: ${includeBoleto ? 'Boleto' : ''} ${includeNfe ? '+ NF-e' : ''}`,
        client?.id || receivable?.clientId,
        docNumber
      );
    }
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`Lembrete de Vencimento: Boleto Bancário #${docNumber} - ${companyName}`);
    const body = encodeURIComponent(message);
    const mailtoUrl = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');

    if (onAddHistoryLog) {
      onAddHistoryLog(
        "notification",
        "Lembrete de Boleto Enviado via E-mail",
        `Mensagem de cobrança preventiva do título ${docNumber} enviada para ${clientEmail || 'cliente'} (${clientName}).`,
        client?.id || receivable?.clientId,
        docNumber
      );
    }
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Notificação & Lembrete de Boleto ao Cliente
              </h2>
              <p className="text-xs text-slate-300">
                Aviso preventivo com 2ª via do boleto e nota fiscal vinculada
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status and Client info summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Dados do Cliente:</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">{clientName}</p>
              <div className="text-xs text-slate-500 space-y-0.5">
                {clientPhone && (
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {clientPhone}
                  </p>
                )}
                {clientEmail && (
                  <p className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {clientEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Título #{docNumber}
                </span>
                {daysDiff !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    daysDiff < 0 ? 'bg-rose-100 text-rose-700' :
                    daysDiff === 0 ? 'bg-amber-100 text-amber-800 font-extrabold' :
                    daysDiff <= 3 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {daysDiff < 0 ? `Vencido há ${Math.abs(daysDiff)} dias` :
                     daysDiff === 0 ? 'VENCE HOJE' :
                     `Vence em ${daysDiff} dias`}
                  </span>
                )}
              </div>
              <p className="text-lg font-mono font-bold text-emerald-600">R$ {remainingValue}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Vencimento: <strong className="text-slate-700">{dueDate}</strong>
              </p>
            </div>
          </div>

          {/* Anexos vinculados */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>📎</span> Documentos em Anexo para o Cliente:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-emerald-400 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeBoleto}
                  onChange={e => setIncludeBoleto(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Boleto Bancário (2ª Via)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{barcode ? `Cód: ${barcode.slice(0, 18)}...` : 'Linha digitável inclusa'}</p>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition ${
                hasNfe 
                  ? 'bg-white border-slate-200 hover:border-indigo-400 cursor-pointer' 
                  : 'bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed'
              }`}>
                <input
                  type="checkbox"
                  checked={includeNfe}
                  disabled={!hasNfe}
                  onChange={e => setIncludeNfe(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">Nota Fiscal (DANFE & XML)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {hasNfe ? `NF-e #${nfe.code || nfe.nfeCode || '101'} vinculada` : 'Nenhuma NF-e emitida para este título'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Message preview and editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>💬</span> Mensagem ao Cliente (Configurável):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans leading-relaxed text-slate-800"
              placeholder="Digite a mensagem personalizada..."
            />
            <p className="text-[11px] text-slate-400">
              💡 Dica: Você pode editar o texto antes de enviar. As variáveis {'{cliente}'}, {'{valor}'}, {'{vencimento}'} e {'{linha_digitavel}'} já foram preenchidas.
            </p>
          </div>

          {sentSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Notificação registrada no histórico com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>

            {clientEmail && (
              <button
                type="button"
                onClick={handleSendEmail}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Mail className="w-4 h-4" />
                <span>Enviar E-mail</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Enviar WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default BoletoClientReminderModal;
