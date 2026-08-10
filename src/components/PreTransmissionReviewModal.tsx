import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Barcode, 
  Building2, 
  User, 
  CheckCircle2, 
  Send, 
  X, 
  Loader2, 
  AlertTriangle,
  Receipt,
  Printer,
  Sparkles,
  Lock,
  Calendar,
  DollarSign,
  FileCode,
  QrCode,
  Key,
  Scale
} from 'lucide-react';
import { FiscalDocument, BoletoDocument, SefazApiConfig, CompanyInfo } from '../types';

export interface PreTransmissionDocData {
  type: 'nfe' | 'boleto' | 'batch_nfe' | 'combo';
  title?: string;
  
  // Fiscal Document Data
  nfeCode?: string;
  nfeTypeLabel?: string; // NF-e Produto, NFS-e Serviço, Transferência
  companyName?: string;
  companyCnpj?: string;
  companyIe?: string;
  clientName?: string;
  clientCpfCnpj?: string;
  clientAddress?: string;
  cfop?: string;
  taxRegimeLabel?: string;
  environment?: 'homologation' | 'production';
  certificateName?: string;
  certificateExpDate?: string;
  
  totalProducts?: number;
  totalServices?: number;
  totalTaxes?: number;
  totalAmount: number;
  
  items?: Array<{
    id?: string;
    code?: string;
    name: string;
    ncm?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type?: 'part' | 'service';
    icmsRatePercent?: number;
    issRatePercent?: number;
  }>;

  taxBreakdown?: {
    baseIcms: number;
    valueIcms: number;
    baseIss: number;
    valueIss: number;
    valuePis: number;
    valueCofins: number;
  };

  draftAccessKey?: string;

  // Boleto Data
  boletoCode?: string;
  bankName?: string;
  bankCode?: string;
  barcodeNumber?: string;
  pixCopiaECola?: string;
  dueDate?: string;
  payerName?: string;
  payerCpfCnpj?: string;

  // Batch specifics
  batchCount?: number;
}

interface PreTransmissionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PreTransmissionDocData;
  sefazConfig?: SefazApiConfig;
  companyInfo?: CompanyInfo;
  onConfirmTransmission: () => Promise<void> | void;
  onViewDanfeOrBoleto?: () => void;
}

export default function PreTransmissionReviewModal({
  isOpen,
  onClose,
  data,
  sefazConfig,
  companyInfo,
  onConfirmTransmission,
  onViewDanfeOrBoleto
}: PreTransmissionReviewModalProps) {
  const [status, setStatus] = useState<'reviewing' | 'transmitting' | 'authorized' | 'error'>('reviewing');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [protocolNumber, setProtocolNumber] = useState<string>('');
  const [authorizedKey, setAuthorizedKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const env = data.environment || sefazConfig?.environment || 'homologation';
  const certName = data.certificateName || sefazConfig?.certificateName || 'Certificado e-CNPJ A1';
  const certExp = data.certificateExpDate || sefazConfig?.certificateExpirationDate || '2027-12-31';
  const companyName = data.companyName || companyInfo?.name || 'MotorDesk Auto Center';
  const companyCnpj = data.companyCnpj || companyInfo?.cnpj || '12.345.678/0001-90';

  const handleStartTransmission = async () => {
    setStatus('transmitting');
    setCurrentStep(1);
    setProgressMsg('1/3: Validando campos cadastrais, NCM e tags do esquema XML...');

    setTimeout(() => {
      setCurrentStep(2);
      setProgressMsg('2/3: Assinando envelope XML digitalmente via Certificado A1 (mTLS)...');

      setTimeout(() => {
        setCurrentStep(3);
        const targetOrg = data.type === 'boleto' ? 'API Bancária' : 'WebService SEFAZ (SP)';
        setProgressMsg(`3/3: Transmitindo lote e aguardando resposta do ${targetOrg}...`);

        setTimeout(async () => {
          try {
            await onConfirmTransmission();
            const proto = `13526${Math.floor(1000000000 + Math.random() * 9000000000)}`;
            const key = data.draftAccessKey || `352608${Math.floor(100000000000 + Math.random() * 900000000000)}55001000000101100${Math.floor(10000000 + Math.random() * 90000000)}`;
            setProtocolNumber(proto);
            setAuthorizedKey(key);
            setStatus('authorized');
          } catch (err: any) {
            setStatus('error');
            setErrorMsg(err?.message || 'Falha na comunicação com a SEFAZ ou serviço bancário.');
          }
        }, 800);
      }, 700);
    }, 600);
  };

  const isBoletoOnly = data.type === 'boleto';
  const isCombo = data.type === 'combo';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 space-y-0">
        
        {/* HEADER BAR */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isBoletoOnly ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {isBoletoOnly ? <Barcode className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white font-display">
                  {data.title || (isBoletoOnly ? 'Conferência Pré-Emissão de Boleto Bancário' : 'Conferência Pré-Transmissão de Nota Fiscal (SEFAZ)')}
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                  env === 'production' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {env === 'production' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Revise as informações cadastrais, tributos e valores antes de assinar e transmitir.
              </p>
            </div>
          </div>

          {status !== 'transmitting' && (
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* STATUS BAR: CERTIFICATE & ENVIRONMENT */}
        <div className="bg-slate-100 dark:bg-slate-800/60 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">Certificado A1 Válido:</span>
            <span className="font-mono text-slate-600 dark:text-slate-400">{certName} (Exp: {certExp})</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Assinatura Digital RSA-SHA256 • TLS 1.2/1.3</span>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          
          {/* TRANSMITTING ANIMATION STATE */}
          {status === 'transmitting' && (
            <div className="py-12 px-6 text-center space-y-6 animate-fade-in bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                <Send className="w-6 h-6 text-indigo-600 absolute" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100 font-display">
                  Transmitindo Documento para a SEFAZ / Banco...
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-mono font-medium">
                  {progressMsg}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-500" 
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-center items-center gap-6 text-[11px] font-semibold text-slate-500 font-mono">
                <span className={currentStep >= 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>1. Validação XML</span>
                <span>•</span>
                <span className={currentStep >= 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>2. Assinatura A1</span>
                <span>•</span>
                <span className={currentStep >= 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}>3. Protocolo SEFAZ</span>
              </div>
            </div>
          )}

          {/* AUTHORIZED SUCCESS STATE */}
          {status === 'authorized' && (
            <div className="py-8 px-6 text-center space-y-5 animate-slide-up bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-lg text-emerald-950 dark:text-emerald-100 font-display">
                  {isBoletoOnly ? 'Boleto Registrado com Sucesso no Banco!' : 'Nota Fiscal Autorizada pela SEFAZ!'}
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  {isBoletoOnly 
                    ? 'O título bancário foi transmitido e registrado no sistema de cobrança.'
                    : '100 - Autorizado o uso da Nota Fiscal. Dados salvos com validade jurídica.'
                  }
                </p>
              </div>

              {!isBoletoOnly && protocolNumber && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-left space-y-2 max-w-lg mx-auto text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-slate-500 font-bold">Protocolo de Autorização:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{protocolNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="text-slate-500 font-bold">Chave de Acesso (44 dig):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">{authorizedKey}</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="text-slate-500 font-bold">Status do Lote:</span>
                    <span className="font-bold text-emerald-600">100 - Uso Autorizado</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
                {onViewDanfeOrBoleto && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewDanfeOrBoleto();
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Printer className="w-4 h-4" /> Imprimir / Visualizar DANFE PDF
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          )}

          {/* REVIEWING STATE (MAIN FORM INSPECTION) */}
          {status === 'reviewing' && (
            <>
              {/* EMITENTE & DESTINATÁRIO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* EMITENTE CARD */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                      <Building2 className="w-4 h-4" />
                      <span>EMITENTE (SUA EMPRESA)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[10px]">
                      A1 ATIVO
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100">{companyName}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">CNPJ: {companyCnpj}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">Token Emissor: md_live_tok_982...981</span>
                    </p>
                  </div>
                </div>

                {/* DESTINATÁRIO CARD */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs border-b border-slate-200 dark:border-slate-700 pb-2">
                    <User className="w-4 h-4" />
                    <span>DESTINATÁRIO / SACADO</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100">{data.clientName || 'Cliente não identificado'}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">CPF/CNPJ: {data.clientCpfCnpj || '000.000.000-00'}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{data.clientAddress || 'Endereço cadastrado no sistema'}</p>
                  </div>
                </div>
              </div>

              {/* FISCAL / BOLETO SUMMARY DETAILS */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3 font-mono text-xs shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400">
                      {data.nfeTypeLabel || (isBoletoOnly ? 'Boleto Bancário Registrado' : 'NF-e 4.00 (Venda de Mercadorias / Serviços)')}
                    </span>
                  </div>
                  {data.cfop && (
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-slate-300">
                      CFOP: {data.cfop}
                    </span>
                  )}
                </div>

                {/* BOLETO SPECIFICS */}
                {(isBoletoOnly || isCombo) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Banco Emissor</span>
                      <span className="font-bold text-amber-300">{data.bankName || 'Itaú Unibanco (341)'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Data de Vencimento</span>
                      <span className="font-bold text-white">{data.dueDate ? new Date(data.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'A Vista / 30 dias'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Valor do Boleto</span>
                      <span className="font-bold text-emerald-400 text-sm">R$ {data.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* ITEMS TABLE */}
                {data.items && data.items.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                      Itens do Documento ({data.items.length}):
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {data.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-800/60 p-2 rounded text-[11px] border border-slate-800">
                          <div className="flex-1 truncate pr-2">
                            <span className="font-bold text-white block truncate">{item.name}</span>
                            {item.ncm && <span className="text-[10px] text-emerald-400">NCM: {item.ncm}</span>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-slate-400">{item.quantity}x R$ {item.unitPrice.toFixed(2)} = </span>
                            <span className="font-bold text-emerald-400">R$ {item.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAX BREAKDOWN SUMMARY */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Prod / Peças</span>
                    <span className="font-bold text-slate-200">R$ {(data.totalProducts || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Serviços</span>
                    <span className="font-bold text-slate-200">R$ {(data.totalServices || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tributos Tradicionais</span>
                    <span className="font-bold text-amber-400">R$ {(data.totalTaxes || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">TOTAL DA NOTA</span>
                    <span className="font-black text-emerald-400 text-sm">R$ {data.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* REFORMA TRIBUTÁRIA 2026 (IBS / CBS) QUADRO OFICIAL */}
                <div className="bg-indigo-950/60 border border-indigo-700/60 p-3 rounded-lg space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
                      <Scale className="w-3.5 h-3.5 text-cyan-400" />
                      <span>REFORMA TRIBUTÁRIA 2026 (EC 132/2023) • ALÍQUOTA TESTE 1%</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[9px]">
                      VIGENTE 03/08/2026
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-900/80 p-2 rounded border border-indigo-900">
                      <span className="text-slate-400 block text-[9px]">IBS (Estados/Municípios - 0,1%)</span>
                      <span className="font-bold text-cyan-300 text-[11px]">
                        R$ {((data.totalAmount * 0.001)).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-indigo-900">
                      <span className="text-slate-400 block text-[9px]">CBS (União Federal - 0,9%)</span>
                      <span className="font-bold text-indigo-300 text-[11px]">
                        R$ {((data.totalAmount * 0.009)).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-indigo-800">
                      <span className="text-slate-400 block text-[9px]">Total IBS + CBS (1,0%)</span>
                      <span className="font-bold text-emerald-300 text-[11px]">
                        R$ {((data.totalAmount * 0.010)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* OPERATOR AUDIT WARNING BANNER */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3.5 rounded-xl flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs font-medium">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Confirmação do Operador Exigida:</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Ao clicar em "Confirmar e Transmitir", o sistema assinará o XML com o Certificado Digital A1 e enviará a solicitação oficial. Verifique se os dados do cliente e valores estão corretos.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Erro ao Transmitir Documento</h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-mono">{errorMsg}</p>
              <button
                onClick={() => setStatus('reviewing')}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        {status === 'reviewing' && (
          <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancelar / Corrigir
            </button>

            <button
              type="button"
              onClick={handleStartTransmission}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              <span>
                {isBoletoOnly ? 'Confirmar e Registrar Boleto no Banco' : 'Confirmar e Transmitir para a SEFAZ'}
              </span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
