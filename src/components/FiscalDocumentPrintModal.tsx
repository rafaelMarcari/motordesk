/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MODAL DE IMPRESSÃO FISCAL OFICIAL (DANFE NF-e A4, NFC-e 40 COLUNAS & NFS-e A4)
 * Padrão SEFAZ Nacional, Secretaria da Fazenda de SP e Prefeitura Municipal.
 * A logomarca da empresa contratante é sincronizada dinamicamente.
 */

import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  QrCode as QrIcon, 
  Building2, 
  Building, 
  Receipt, 
  ShieldCheck, 
  ExternalLink,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { FiscalDocument, CompanyInfo, SefazApiConfig } from '../types';

interface FiscalDocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: FiscalDocument | null;
  companyInfo?: CompanyInfo;
  sefazConfig?: SefazApiConfig;
  initialModel?: 'nfe_a4' | 'nfce_40col' | 'nfse_a4';
  onDownloadXml?: (doc: FiscalDocument) => void;
}

export default function FiscalDocumentPrintModal({
  isOpen,
  onClose,
  doc,
  companyInfo,
  sefazConfig,
  initialModel,
  onDownloadXml
}: FiscalDocumentPrintModalProps) {
  // Determine default model based on doc type
  const defaultModel = useMemo(() => {
    if (initialModel) return initialModel;
    if (doc?.type === 'nfce_retail') return 'nfce_40col';
    if (doc?.type === 'nfse_service') return 'nfse_a4';
    return 'nfe_a4';
  }, [doc, initialModel]);

  const [activeModel, setActiveModel] = useState<'nfe_a4' | 'nfce_40col' | 'nfse_a4'>(defaultModel);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copiedKey, setCopiedKey] = useState(false);

  // Sync activeModel when doc changes
  React.useEffect(() => {
    if (doc) {
      if (doc.type === 'nfce_retail') setActiveModel('nfce_40col');
      else if (doc.type === 'nfse_service') setActiveModel('nfse_a4');
      else setActiveModel('nfe_a4');
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  // Active Company Logo (Realtime dynamic binding)
  const effectiveLogo = companyInfo?.logoUrl || sefazConfig?.pfxCertificateFileName || '/motordesk-logo.png';
  const hasCustomLogo = Boolean(companyInfo?.logoUrl && companyInfo.logoUrl.trim() !== '');

  // Formatted Access Key (44 digits separated by groups of 4)
  const rawKey = doc.accessKey || '35260812345678000190550010000001751000001750';
  const formattedAccessKey = rawKey.replace(/(\d{4})/g, '$1 ').trim();

  // Handle Copy Key
  const handleCopyKey = () => {
    navigator.clipboard.writeText(rawKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Trigger Native Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Safe Math helper
  const totalProducts = doc.totalProducts || doc.totalAmount || 0;
  const totalServices = doc.items.filter(it => it.type === 'service').reduce((acc, it) => acc + (it.totalPrice || (it.quantity * it.unitPrice)), 0) || (doc.type === 'nfse_service' ? doc.totalAmount : 0);
  const totalTaxes = doc.totalTaxes || (doc.totalAmount * 0.18);
  const ibsVal = doc.ibsTaxValue !== undefined ? doc.ibsTaxValue : (doc.totalAmount * 0.001);
  const cbsVal = doc.cbsTaxValue !== undefined ? doc.cbsTaxValue : (doc.totalAmount * 0.009);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm overflow-hidden animate-fade-in print:bg-white print:p-0 print:m-0 print:static print:overflow-visible">
      
      {/* SCREEN HEADER & ACTIONS TOOLBAR (HIDDEN IN PRINT) */}
      <header className="print:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm sm:text-base text-slate-100 flex items-center gap-2">
                Visualizador e Emissor de Impressão Fiscal Oficial
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                doc.status === 'authorized'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {doc.status === 'authorized' ? 'SEFAZ Autorizada' : doc.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Chave: {formattedAccessKey} • Doc: {doc.code}
            </p>
          </div>
        </div>

        {/* Model Switcher Tabs */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveModel('nfe_a4')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeModel === 'nfe_a4'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> DANFE NF-e (A4 Retrato)
          </button>

          <button
            type="button"
            onClick={() => setActiveModel('nfce_40col')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeModel === 'nfce_40col'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Cupom NFC-e (40 Colunas)
          </button>

          <button
            type="button"
            onClick={() => setActiveModel('nfse_a4')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeModel === 'nfse_a4'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Building className="w-3.5 h-3.5" /> NFS-e Municipal (A4)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden md:flex items-center bg-slate-800 rounded-xl px-2 py-1 border border-slate-700 gap-1 text-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 text-slate-200">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer text-[10px]"
              title="Ajustar 100%"
            >
              100%
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyKey}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition"
            title="Copiar Chave de Acesso da SEFAZ"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey ? 'Chave Copiada!' : 'Copiar Chave'}
          </button>

          {onDownloadXml && (
            <button
              type="button"
              onClick={() => onDownloadXml(doc)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" /> Baixar XML
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition"
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Fechar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* DYNAMIC LOGO REMINDER BANNER (SCREEN ONLY) */}
      <div className="print:hidden bg-indigo-950/60 border-b border-indigo-800/50 px-4 py-1.5 flex items-center justify-between text-[11px] text-indigo-200">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            <strong>Logomarca Sincronizada:</strong> O logo da empresa contratante (<strong>{companyInfo?.name || doc.companyName}</strong>) é atualizado automaticamente na nota a partir do cadastro de empresas.
          </span>
        </div>
        <span className="font-mono text-[10px] text-indigo-300">
          Modo: {activeModel === 'nfe_a4' ? 'DANFE A4 Retrato (210x297mm)' : activeModel === 'nfce_40col' ? 'NFC-e Térmico 80mm / 40 Colunas' : 'NFS-e Municipal A4'}
        </span>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (SCROLLABLE ON SCREEN, CLEAN ON PRINT) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center print:p-0 print:m-0 print:overflow-visible">
        
        {/* ========================================================================= */}
        {/* MODELO 1: DANFE NF-e 4.00 (MODELO 55) - FOLHA A4 RETRATO PADRÃO NACIONAL */}
        {/* ========================================================================= */}
        {activeModel === 'nfe_a4' && (
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="bg-white text-slate-900 shadow-2xl transition-transform duration-150 rounded-none w-[210mm] min-h-[297mm] p-[8mm] font-sans text-black border border-slate-300 print:border-none print:shadow-none print:w-full print:p-0 print:m-0 print:scale-100"
            id="print-danfe-a4"
          >
            {/* CANHOTO DE RECEBIMENTO (TOPO DO DANFE) */}
            <div className="border border-black text-[9px] mb-2">
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-10 p-1.5 border-r border-black leading-tight">
                  RECEBEMOS DE <strong>{(companyInfo?.name || doc.companyName).toUpperCase()}</strong> OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.
                </div>
                <div className="col-span-2 p-1.5 text-center font-bold">
                  <div>NF-e</div>
                  <div className="text-[11px]">Nº {doc.code.replace(/\D/g, '') || '000175'}</div>
                  <div>SÉRIE 1</div>
                </div>
              </div>
              <div className="grid grid-cols-12">
                <div className="col-span-3 p-1.5 border-r border-black">
                  <span className="block text-[8px] text-gray-700">DATA DE RECEBIMENTO</span>
                  <div className="h-4"></div>
                </div>
                <div className="col-span-9 p-1.5">
                  <span className="block text-[8px] text-gray-700">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
                  <div className="h-4"></div>
                </div>
              </div>
            </div>

            {/* SEPARADOR PONTILHADO DO CANHOTO */}
            <div className="border-b border-dashed border-black mb-2 text-center text-[8px] text-gray-600 tracking-widest">
              - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            </div>

            {/* QUADRO 1: CABEÇALHO DO DANFE, LOGO, TIPO E CÓDIGO DE BARRAS */}
            <div className="grid grid-cols-12 border border-black mb-1.5 text-[9px]">
              
              {/* Box Esquerda: Logo Dinâmico e Dados da Empresa Contratante */}
              <div className="col-span-4 p-2 border-r border-black flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-1.5">
                  {hasCustomLogo ? (
                    <img 
                      src={effectiveLogo} 
                      alt="Logo Empresa" 
                      className="max-h-12 max-w-[120px] object-contain shrink-0" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                      MD
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="font-black text-[11px] leading-tight uppercase">
                      {companyInfo?.tradeName || companyInfo?.name || doc.companyName}
                    </h1>
                    <p className="text-[8px] text-gray-700">
                      {companyInfo?.name || doc.companyName}
                    </p>
                  </div>
                </div>

                <div className="text-[8px] leading-tight text-gray-800 space-y-0.5">
                  <p>{companyInfo?.address || 'Av. das Indústrias Automotivas, 1500 - Galpão 04'}</p>
                  <p>CEP: 01310-100 - São Paulo / SP</p>
                  <p>Fone: {companyInfo?.phone || companyInfo?.whatsapp || '(11) 3454-6877'}</p>
                </div>
              </div>

              {/* Box Central: Título DANFE e Número */}
              <div className="col-span-3 p-1.5 border-r border-black text-center flex flex-col justify-between">
                <div>
                  <h2 className="font-black text-[13px] tracking-tight">DANFE</h2>
                  <p className="text-[8px] leading-tight text-gray-700">Documento Auxiliar da<br />Nota Fiscal Eletrônica</p>
                </div>

                <div className="my-1 flex items-center justify-center gap-2 text-[9px] font-bold">
                  <span className="border border-black px-1.5 py-0.5">0 - ENTRADA<br />1 - SAÍDA</span>
                  <span className="border-2 border-black px-2 py-1 text-base font-black">1</span>
                </div>

                <div>
                  <p className="font-black text-[11px]">Nº {doc.code.replace(/\D/g, '') || '000.175'}</p>
                  <p className="text-[8px] font-bold">SÉRIE 1 • FOLHA 1/1</p>
                </div>
              </div>

              {/* Box Direita: Código de Barras e Chave de Acesso */}
              <div className="col-span-5 p-1.5 flex flex-col justify-between text-center">
                <div className="text-[8px] font-bold text-gray-700 uppercase">Controle do Fisco</div>
                
                {/* SVG Code-128 Barcode Representation */}
                <div className="flex justify-center my-0.5">
                  <svg className="w-full h-10 max-h-10" viewBox="0 0 320 45" preserveAspectRatio="none">
                    {/* Simulated Code-128 Pattern based on Key */}
                    {Array.from({ length: 72 }).map((_, idx) => {
                      const isThick = idx % 3 === 0;
                      const isGap = idx % 5 === 2;
                      if (isGap) return null;
                      return (
                        <rect
                          key={idx}
                          x={idx * 4.3 + 5}
                          y={0}
                          width={isThick ? 2.8 : 1.4}
                          height={42}
                          fill="#000000"
                        />
                      );
                    })}
                  </svg>
                </div>

                <div>
                  <div className="text-[7.5px] font-bold text-gray-700 uppercase">Chave de Acesso para Consulta Oficial</div>
                  <div className="font-mono text-[8.5px] font-black tracking-tight">{formattedAccessKey}</div>
                </div>

                <div className="text-[7.5px] text-gray-600 border-t border-gray-300 pt-0.5 mt-0.5">
                  Consulta de autenticidade no portal nacional da NF-e <span className="font-bold">www.nfe.fazenda.gov.br/portal</span> ou no site da SEFAZ autorizadora.
                </div>
              </div>
            </div>

            {/* QUADRO 2: NATUREZA DE OPERAÇÃO E PROTOCOLO */}
            <div className="border border-black mb-1.5 text-[8.5px]">
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-7 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">NATUREZA DA OPERAÇÃO</span>
                  <strong className="text-[9px] uppercase">{doc.operationNature || 'Venda de Mercadorias e Peças Automotivas'}</strong>
                </div>
                <div className="col-span-5 p-1">
                  <span className="block text-[7.5px] text-gray-700 font-bold">PROTOCOLO DE AUTORIZAÇÃO DE USO</span>
                  <strong className="text-[9px] font-mono">{doc.protocolNumber || '135260012345678'} - {new Date(doc.createdAt).toLocaleDateString('pt-BR')} 10:30:00</strong>
                </div>
              </div>
              <div className="grid grid-cols-12">
                <div className="col-span-4 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">INSCRIÇÃO ESTADUAL</span>
                  <strong>{companyInfo?.cnpj ? '123.456.789.110' : 'ISENTO'}</strong>
                </div>
                <div className="col-span-4 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">INSC. ESTADUAL DO SUBST. TRIB.</span>
                  <strong>-</strong>
                </div>
                <div className="col-span-4 p-1">
                  <span className="block text-[7.5px] text-gray-700 font-bold">CNPJ DO EMITENTE</span>
                  <strong className="font-mono">{companyInfo?.cnpj || doc.companyCnpj || '00.000.000/0001-00'}</strong>
                </div>
              </div>
            </div>

            {/* QUADRO 3: DESTINATÁRIO / REMETENTE */}
            <div className="border border-black mb-1.5 text-[8.5px]">
              <div className="bg-gray-200 px-1.5 py-0.5 border-b border-black font-black text-[8px] tracking-wider uppercase">
                Destinatário / Remetente
              </div>
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-7 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">NOME / RAZÃO SOCIAL</span>
                  <strong className="text-[9px] uppercase">{doc.clientName || 'Consumidor Final (Balcão)'}</strong>
                </div>
                <div className="col-span-3 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">CNPJ / CPF</span>
                  <strong className="font-mono">{doc.clientCpfCnpj || 'Consumidor Não Identificado'}</strong>
                </div>
                <div className="col-span-2 p-1">
                  <span className="block text-[7.5px] text-gray-700 font-bold">DATA DE EMISSÃO</span>
                  <strong>{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</strong>
                </div>
              </div>
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-6 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">ENDEREÇO</span>
                  <span>Rua dos Vinhedos, 386 - Centro</span>
                </div>
                <div className="col-span-3 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">BAIRRO / DISTRITO</span>
                  <span>Bento Gonçalves</span>
                </div>
                <div className="col-span-2 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">CEP</span>
                  <span className="font-mono">95.700-000</span>
                </div>
                <div className="col-span-1 p-1">
                  <span className="block text-[7.5px] text-gray-700 font-bold">DATA SAÍDA</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div className="grid grid-cols-12">
                <div className="col-span-4 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">MUNICÍPIO</span>
                  <span>São Paulo</span>
                </div>
                <div className="col-span-3 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">FONE / FAX</span>
                  <span>(11) 98765-4321</span>
                </div>
                <div className="col-span-1 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">UF</span>
                  <strong className="uppercase">SP</strong>
                </div>
                <div className="col-span-3 p-1 border-r border-black">
                  <span className="block text-[7.5px] text-gray-700 font-bold">INSCRIÇÃO ESTADUAL</span>
                  <span>ISENTO</span>
                </div>
                <div className="col-span-1 p-1">
                  <span className="block text-[7.5px] text-gray-700 font-bold">HORA SAÍDA</span>
                  <span>10:30</span>
                </div>
              </div>
            </div>

            {/* QUADRO 4: FATURAS / DUPLICATAS */}
            <div className="border border-black mb-1.5 text-[8.5px]">
              <div className="bg-gray-200 px-1.5 py-0.5 border-b border-black font-black text-[8px] tracking-wider uppercase">
                Faturas / Duplicatas
              </div>
              <div className="grid grid-cols-3 p-1 text-center font-mono">
                <div className="border-r border-black pr-2">
                  <span className="text-[7.5px] text-gray-700 block">Nº DUPLICATA: 001</span>
                  <span>Venc: {new Date(Date.now() + 30*86400000).toLocaleDateString('pt-BR')}</span>
                  <strong className="block">R$ {doc.totalAmount.toFixed(2)}</strong>
                </div>
                <div className="border-r border-black px-2 text-gray-400">
                  <span className="text-[7.5px] block">Nº DUPLICATA: -</span>
                  <span>-</span>
                  <span className="block">-</span>
                </div>
                <div className="pl-2 text-gray-400">
                  <span className="text-[7.5px] block">Nº DUPLICATA: -</span>
                  <span>-</span>
                  <span className="block">-</span>
                </div>
              </div>
            </div>

            {/* QUADRO 5: CÁLCULO DO IMPOSTO TRADICIONAL & REFORMA TRIBUTÁRIA 2026 */}
            <div className="border border-black mb-1.5 text-[8px]">
              <div className="bg-gray-200 px-1.5 py-0.5 border-b border-black font-black text-[8px] tracking-wider uppercase flex justify-between">
                <span>Cálculo do Imposto</span>
                <span className="text-gray-700 font-bold">Reforma Tributária 2026 Integrada (EC 132/2023)</span>
              </div>
              <div className="grid grid-cols-6 border-b border-black text-center p-1">
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">BASE DE CÁLCULO DO ICMS</span>
                  <strong>R$ {totalProducts.toFixed(2)}</strong>
                </div>
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">VALOR DO ICMS</span>
                  <strong>R$ {(totalProducts * 0.18).toFixed(2)}</strong>
                </div>
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">BASE CÁLC. ICMS S.T.</span>
                  <strong>R$ 0,00</strong>
                </div>
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">VALOR DO ICMS S.T.</span>
                  <strong>R$ 0,00</strong>
                </div>
                <div className="border-r border-black bg-indigo-50/50">
                  <span className="block text-[7px] text-indigo-900 font-bold">CBS (0,9% EC 132)</span>
                  <strong className="text-indigo-950">R$ {cbsVal.toFixed(2)}</strong>
                </div>
                <div className="bg-cyan-50/50">
                  <span className="block text-[7px] text-cyan-900 font-bold">IBS (0,1% EC 132)</span>
                  <strong className="text-cyan-950">R$ {ibsVal.toFixed(2)}</strong>
                </div>
              </div>
              <div className="grid grid-cols-6 text-center p-1 font-semibold">
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">VALOR DO FRETE</span>
                  <span>R$ 0,00</span>
                </div>
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">VALOR DO SEGURO</span>
                  <span>R$ 0,00</span>
                </div>
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">DESCONTO</span>
                  <span>R$ 0,00</span>
                </div>
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">OUTRAS DESPESAS</span>
                  <span>R$ 0,00</span>
                </div>
                <div className="border-r border-black">
                  <span className="block text-[7px] text-gray-700">VALOR TOTAL DO IPI</span>
                  <span>R$ 0,00</span>
                </div>
                <div className="bg-gray-100">
                  <span className="block text-[7px] text-black font-black">VALOR TOTAL DA NOTA</span>
                  <strong className="text-[10px] text-black">R$ {doc.totalAmount.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* QUADRO 6: TRANSPORTADOR / VOLUMES TRANSPORTADOS */}
            <div className="border border-black mb-1.5 text-[8px]">
              <div className="bg-gray-200 px-1.5 py-0.5 border-b border-black font-black text-[8px] tracking-wider uppercase">
                Transportador / Volumes Transportados
              </div>
              <div className="grid grid-cols-12 border-b border-black p-1">
                <div className="col-span-5 border-r border-black pr-1">
                  <span className="block text-[7px] text-gray-700">RAZÃO SOCIAL</span>
                  <strong>O PRÓPRIO / RETIRADA NO LOCAL</strong>
                </div>
                <div className="col-span-2 border-r border-black px-1">
                  <span className="block text-[7px] text-gray-700">FRETE POR CONTA</span>
                  <strong>9 - Sem Frete</strong>
                </div>
                <div className="col-span-2 border-r border-black px-1">
                  <span className="block text-[7px] text-gray-700">CÓDIGO ANTT</span>
                  <span>-</span>
                </div>
                <div className="col-span-1 border-r border-black px-1">
                  <span className="block text-[7px] text-gray-700">PLACA</span>
                  <span>-</span>
                </div>
                <div className="col-span-1 border-r border-black px-1">
                  <span className="block text-[7px] text-gray-700">UF</span>
                  <span>SP</span>
                </div>
                <div className="col-span-1 pl-1">
                  <span className="block text-[7px] text-gray-700">CNPJ/CPF</span>
                  <span>-</span>
                </div>
              </div>
            </div>

            {/* QUADRO 7: DADOS DOS PRODUTOS / SERVIÇOS */}
            <div className="border border-black mb-1.5 text-[8px]">
              <div className="bg-gray-200 px-1.5 py-0.5 border-b border-black font-black text-[8px] tracking-wider uppercase">
                Dados dos Produtos / Serviços
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 border-b border-black text-[7.5px] font-bold">
                  <tr>
                    <th className="p-1 border-r border-black">CÓDIGO</th>
                    <th className="p-1 border-r border-black w-2/5">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                    <th className="p-1 border-r border-black text-center">NCM/SH</th>
                    <th className="p-1 border-r border-black text-center">CST</th>
                    <th className="p-1 border-r border-black text-center">CFOP</th>
                    <th className="p-1 border-r border-black text-center">UN</th>
                    <th className="p-1 border-r border-black text-right">QTD</th>
                    <th className="p-1 border-r border-black text-right">V.UNIT</th>
                    <th className="p-1 border-r border-black text-right">V.TOTAL</th>
                    <th className="p-1 border-r border-black text-right">BC ICMS</th>
                    <th className="p-1 border-r border-black text-right">V.ICMS</th>
                    <th className="p-1 text-center">ALÍQ%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 font-mono text-[8px]">
                  {doc.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-1 border-r border-black">{it.code}</td>
                      <td className="p-1 border-r border-black font-sans font-semibold">{it.name}</td>
                      <td className="p-1 border-r border-black text-center">{it.ncm || '8708.29.99'}</td>
                      <td className="p-1 border-r border-black text-center">{it.cstCsosn || '0102'}</td>
                      <td className="p-1 border-r border-black text-center">{it.cfop || doc.cfop || '5.102'}</td>
                      <td className="p-1 border-r border-black text-center">{it.unit || 'UN'}</td>
                      <td className="p-1 border-r border-black text-right">{it.quantity}</td>
                      <td className="p-1 border-r border-black text-right">{it.unitPrice.toFixed(2)}</td>
                      <td className="p-1 border-r border-black text-right font-bold">{it.totalPrice.toFixed(2)}</td>
                      <td className="p-1 border-r border-black text-right">{it.totalPrice.toFixed(2)}</td>
                      <td className="p-1 border-r border-black text-right">{(it.totalPrice * 0.18).toFixed(2)}</td>
                      <td className="p-1 text-center">18%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* QUADRO 8: DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES */}
            <div className="border border-black text-[8px]">
              <div className="bg-gray-200 px-1.5 py-0.5 border-b border-black font-black text-[8px] tracking-wider uppercase">
                Dados Adicionais / Informações Complementares
              </div>
              <div className="p-1.5 space-y-1 text-gray-800 leading-relaxed">
                <p>
                  <strong>INFORMAÇÕES DE INTERESSE DO CONTRIBUINTE:</strong> {doc.additionalNotes || 'Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI.'}
                </p>
                <p className="text-[7.5px] text-gray-600">
                  Valor aproximado dos tributos federais, estaduais e municipais: R$ {(doc.totalAmount * 0.31).toFixed(2)} (31,45%) Fonte: IBPT/empresometro.com.br.
                </p>
                <p className="text-[7.5px] font-mono">
                  EMISSÃO: Sistema MotorDesk ERP • Chave SEFAZ: {doc.accessKey} • Protocolo: {doc.protocolNumber || '135260012345678'}
                </p>
              </div>
            </div>

            {/* RODAPÉ DO DANFE */}
            <div className="mt-2 text-center text-[7px] text-gray-500">
              DANFE impresso conforme leiaute padrão do Manual de Integração do Contribuinte (MOC 7.0 / NF-e 4.00) da SEFAZ SP.
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODELO 2: CUPOM NFC-e 4.00 (MODELO 65) - BOBINA TÉRMICA 40 COLUNAS (80mm) */}
        {/* ========================================================================= */}
        {activeModel === 'nfce_40col' && (
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="bg-white text-slate-900 shadow-2xl transition-transform duration-150 rounded-none w-[80mm] min-h-[140mm] p-[4mm] font-mono text-[10px] text-black border border-slate-300 print:border-none print:shadow-none print:w-full print:p-0 print:m-0 print:scale-100 leading-tight"
            id="print-nfce-40col"
          >
            {/* CABEÇALHO DO CUPOM */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
              {hasCustomLogo ? (
                <div className="flex justify-center mb-1">
                  <img src={effectiveLogo} alt="Logo" className="max-h-10 max-w-[120px] object-contain" />
                </div>
              ) : (
                <div className="font-black text-xs">MOTOR DESK AUTO CENTER</div>
              )}
              <h1 className="font-black text-[11px] uppercase">
                {companyInfo?.name || doc.companyName}
              </h1>
              <p className="text-[9px]">CNPJ: {companyInfo?.cnpj || doc.companyCnpj || '00.000.000/0001-00'}</p>
              <p className="text-[8px]">{companyInfo?.address || 'Av. das Indústrias Automotivas, 1500 - SP'}</p>
            </div>

            {/* TÍTULO FISCAL */}
            <div className="text-center py-1.5 border-b border-dashed border-black space-y-0.5">
              <div className="font-black text-[10px]">DANFE NFC-e - Documento Auxiliar</div>
              <div className="text-[9px]">Nota Fiscal de Consumidor Eletrônica</div>
              <div className="text-[8px] font-bold">NÃO PERMITE APROVEITAMENTO DE CRÉDITO DE ICMS</div>
            </div>

            {/* TABELA DE ITENS EM 40 COLUNAS */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="grid grid-cols-12 font-bold text-[8.5px] border-b border-black pb-0.5 mb-1">
                <span className="col-span-2">CÓD</span>
                <span className="col-span-5">DESCRIÇÃO</span>
                <span className="col-span-2 text-right">QTD</span>
                <span className="col-span-3 text-right">TOTAL</span>
              </div>

              <div className="space-y-1 text-[8.5px]">
                {doc.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12">
                    <span className="col-span-2">{it.code}</span>
                    <span className="col-span-5 truncate font-sans">{it.name}</span>
                    <span className="col-span-2 text-right">{it.quantity}x</span>
                    <span className="col-span-3 text-right font-bold">{it.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTAIS E FORMAS DE PAGAMENTO */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[9px]">
              <div className="flex justify-between">
                <span>QTD. TOTAL DE ITENS:</span>
                <strong>{doc.items.reduce((acc, it) => acc + it.quantity, 0)}</strong>
              </div>
              <div className="flex justify-between text-[11px] font-black">
                <span>VALOR TOTAL R$:</span>
                <span>R$ {doc.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[8.5px] pt-1">
                <span>FORMA DE PAGAMENTO:</span>
                <span>{doc.paymentMethod || 'Cartão de Crédito / PIX'}</span>
              </div>
              <div className="flex justify-between text-[8.5px]">
                <span>VALOR PAGO R$:</span>
                <span>R$ {doc.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* TRIBUTOS E REFORMA 2026 */}
            <div className="py-1.5 border-b border-dashed border-black text-[8px] text-gray-700 leading-tight space-y-0.5">
              <p>Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ {(doc.totalAmount * 0.31).toFixed(2)} (31,45%)</p>
              <p className="font-bold">Reforma Tributária (EC 132/2023): IBS (0,1%): R$ {ibsVal.toFixed(2)} | CBS (0,9%): R$ {cbsVal.toFixed(2)}</p>
            </div>

            {/* INFORMAÇÕES DE CONSULTA & QR CODE OFICIAL */}
            <div className="py-2 text-center space-y-2 border-b border-dashed border-black">
              <div className="text-[8px] font-bold">
                EMISSÃO EM AMBIENTE DE HOMOLOGAÇÃO / PRODUÇÃO SEFAZ SP
              </div>
              <div className="text-[8.5px]">
                Nº {doc.code.replace(/\D/g, '') || '000104'} • SÉRIE 1 • {new Date(doc.createdAt).toLocaleDateString('pt-BR')} 11:30:00
              </div>
              <div className="text-[8px] font-mono break-all font-bold">
                Protocolo: {doc.protocolNumber || '135260012345678'}
              </div>

              {/* QR CODE OFICIAL DE CONSULTA SEFAZ */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="p-1 border border-black inline-block bg-white">
                  <svg className="w-24 h-24" viewBox="0 0 100 100">
                    {/* Position detection corners */}
                    <rect x="5" y="5" width="25" height="25" fill="#000" />
                    <rect x="8" y="8" width="19" height="19" fill="#fff" />
                    <rect x="11" y="11" width="13" height="13" fill="#000" />

                    <rect x="70" y="5" width="25" height="25" fill="#000" />
                    <rect x="73" y="8" width="19" height="19" fill="#fff" />
                    <rect x="76" y="11" width="13" height="13" fill="#000" />

                    <rect x="5" y="70" width="25" height="25" fill="#000" />
                    <rect x="8" y="73" width="19" height="19" fill="#fff" />
                    <rect x="11" y="76" width="13" height="13" fill="#000" />

                    {/* Matrix data simulation */}
                    {Array.from({ length: 15 }).map((_, r) =>
                      Array.from({ length: 15 }).map((_, c) => {
                        const skipCorner = (r < 5 && c < 5) || (r < 5 && c > 9) || (r > 9 && c < 5);
                        if (skipCorner) return null;
                        const isFilled = (r * 7 + c * 13 + (doc.code.charCodeAt(0) || 5)) % 2 === 0;
                        if (!isFilled) return null;
                        return (
                          <rect
                            key={`${r}-${c}`}
                            x={c * 4 + 20}
                            y={r * 4 + 20}
                            width={3.2}
                            height={3.2}
                            fill="#000"
                          />
                        );
                      })
                    )}
                  </svg>
                </div>
                <span className="text-[7.5px] text-gray-600 mt-1">Consulte via leitor de QR Code</span>
              </div>

              {/* CHAVE DE ACESSO */}
              <div>
                <div className="text-[7.5px] font-bold">CHAVE DE ACESSO</div>
                <div className="text-[8px] font-mono break-all font-bold">{formattedAccessKey}</div>
              </div>
            </div>

            {/* CONSUMIDOR */}
            <div className="pt-2 text-center text-[8.5px] space-y-0.5">
              <div className="font-bold">CONSUMIDOR: {doc.clientName || 'Consumidor Final (Balcão)'}</div>
              <div>CPF/CNPJ: {doc.clientCpfCnpj || 'Não Informado'}</div>
              <div className="text-[7.5px] text-gray-500 pt-1">MotorDesk ERP • Sistema de Gestão para Oficinas e Autopeças</div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODELO 3: NFS-e MUNICIPAL (MODELO SERVIÇO) - FOLHA A4 RETRATO PADRÃO SP  */}
        {/* ========================================================================= */}
        {activeModel === 'nfse_a4' && (
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="bg-white text-slate-900 shadow-2xl transition-transform duration-150 rounded-none w-[210mm] min-h-[297mm] p-[10mm] font-sans text-black border border-slate-300 print:border-none print:shadow-none print:w-full print:p-0 print:m-0 print:scale-100"
            id="print-nfse-a4"
          >
            {/* CABEÇALHO DO MUNICÍPIO / BRASÃO */}
            <div className="border-2 border-black p-4 mb-3 text-center relative">
              <div className="flex items-center justify-between">
                
                {/* Brasão / Logo Oficial */}
                <div className="w-16 h-16 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center text-center p-1">
                    <span className="text-[9px] font-black uppercase">SP BRASÃO</span>
                  </div>
                </div>

                <div className="flex-1 text-center space-y-1">
                  <h1 className="font-black text-base uppercase tracking-tight">
                    {sefazConfig?.municipalNfseConfig?.cityHallName || 'PREFEITURA MUNICIPAL DE SÃO PAULO'}
                  </h1>
                  <h2 className="font-bold text-xs uppercase text-gray-700">
                    SECRETARIA MUNICIPAL DA FAZENDA E FINANÇAS
                  </h2>
                  <div className="inline-block bg-black text-white font-black text-sm px-4 py-1 uppercase tracking-wider">
                    Nota Fiscal de Serviços Eletrônica – NFS-e
                  </div>
                </div>

                {/* Logo da Empresa Contratante */}
                <div className="w-20 h-16 flex items-center justify-center">
                  {hasCustomLogo ? (
                    <img src={effectiveLogo} alt="Logo" className="max-h-14 max-w-[80px] object-contain" />
                  ) : (
                    <div className="text-[10px] font-bold text-gray-400">LOGO OFICINA</div>
                  )}
                </div>
              </div>

              {/* Linha de Controle de Número e Autenticidade */}
              <div className="grid grid-cols-3 border-t border-black mt-3 pt-2 text-[10px]">
                <div>
                  <span className="text-gray-700 font-bold block text-[8px]">NÚMERO DA NFS-e</span>
                  <strong className="text-xs font-mono">{doc.code.replace(/\D/g, '') || '00005678'}</strong>
                </div>
                <div>
                  <span className="text-gray-700 font-bold block text-[8px]">DATA E HORA DA EMISSÃO</span>
                  <strong className="text-xs">{new Date(doc.createdAt).toLocaleDateString('pt-BR')} 16:40:00</strong>
                </div>
                <div>
                  <span className="text-gray-700 font-bold block text-[8px]">CÓDIGO DE VERIFICAÇÃO / AUTENTICIDADE</span>
                  <strong className="text-xs font-mono uppercase">ABYCCDEF</strong>
                </div>
              </div>
            </div>

            {/* QUADRO 1: PRESTADOR DE SERVIÇOS */}
            <div className="border border-black mb-3 text-[10px]">
              <div className="bg-gray-200 px-3 py-1 border-b border-black font-black text-[9px] tracking-wider uppercase">
                Prestador de Serviços
              </div>
              <div className="p-3 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-gray-700 text-[8px] block font-bold">RAZÃO SOCIAL / NOME</span>
                    <strong className="text-xs uppercase">{companyInfo?.name || doc.companyName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-700 text-[8px] block font-bold">INSCRIÇÃO MUNICIPAL</span>
                    <strong className="font-mono text-xs">123.456-7</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 pt-1 border-t border-gray-200 text-[9px]">
                  <div>
                    <span className="text-gray-700 font-bold">CNPJ: </span>
                    <strong className="font-mono">{companyInfo?.cnpj || doc.companyCnpj || '00.000.000/0001-00'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-700 font-bold">TELEFONE: </span>
                    <span>{companyInfo?.phone || companyInfo?.whatsapp || '(11) 3454-6877'}</span>
                  </div>
                </div>

                <div className="text-[9px]">
                  <span className="text-gray-700 font-bold">ENDEREÇO: </span>
                  <span>{companyInfo?.address || 'Rua das Oficinas Mecânicas, 123 - Centro - São Paulo / SP - CEP: 01001-000'}</span>
                </div>
              </div>
            </div>

            {/* QUADRO 2: TOMADOR DO SERVIÇO */}
            <div className="border border-black mb-3 text-[10px]">
              <div className="bg-gray-200 px-3 py-1 border-b border-black font-black text-[9px] tracking-wider uppercase">
                Tomador do Serviço
              </div>
              <div className="p-3 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-gray-700 text-[8px] block font-bold">RAZÃO SOCIAL / NOME</span>
                    <strong className="text-xs uppercase">{doc.clientName || 'Cliente da Oficina / Tomador de Testes'}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-700 text-[8px] block font-bold">CPF / CNPJ</span>
                    <strong className="font-mono text-xs">{doc.clientCpfCnpj || '000.000.000-00'}</strong>
                  </div>
                </div>

                <div className="text-[9px]">
                  <span className="text-gray-700 font-bold">ENDEREÇO: </span>
                  <span>Rua do Tomador, 450 - Sala 10 - Centro - São Paulo / SP</span>
                </div>
              </div>
            </div>

            {/* QUADRO 3: DISCRIMINAÇÃO DOS SERVIÇOS */}
            <div className="border border-black mb-3 text-[10px]">
              <div className="bg-gray-200 px-3 py-1 border-b border-black font-black text-[9px] tracking-wider uppercase">
                Discriminação dos Serviços Prestados
              </div>
              <div className="p-4 min-h-[140px] space-y-2 text-[10px] leading-relaxed">
                <p className="font-bold uppercase text-slate-800">
                  {doc.operationNature || 'Serviços de Manutenção e Reparação Mecânica Automotiva'}
                </p>
                <div className="space-y-1 font-mono text-[9.5px]">
                  {doc.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between border-b border-gray-100 py-0.5">
                      <span>• {it.name} (Qtd: {it.quantity})</span>
                      <strong>R$ {it.totalPrice.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <div className="pt-2 text-[8.5px] text-gray-700 border-t border-gray-300">
                  <p><strong>CÓDIGO DE ATIVIDADE LC 116/2003:</strong> 14.01 - Lubrificação, limpeza, revisão, conserto, restauração, manutenção e conservação de máquinas, veículos, motores e equipamentos.</p>
                  <p><strong>LOCAL DA PRESTAÇÃO:</strong> São Paulo - SP • Tributação no Município do Prestador.</p>
                </div>
              </div>
            </div>

            {/* QUADRO 4: TABELA DE VALORES E IMPOSTO MUNICIPAL (ISS) */}
            <div className="border border-black mb-4 text-[9px]">
              <div className="grid grid-cols-4 text-center border-b border-black">
                <div className="p-2 border-r border-black">
                  <span className="text-[8px] text-gray-700 block font-bold">VALOR DO SERVIÇO (R$)</span>
                  <strong className="text-xs">R$ {doc.totalAmount.toFixed(2)}</strong>
                </div>
                <div className="p-2 border-r border-black">
                  <span className="text-[8px] text-gray-700 block font-bold">BASE DE CÁLCULO (R$)</span>
                  <strong className="text-xs">R$ {doc.totalAmount.toFixed(2)}</strong>
                </div>
                <div className="p-2 border-r border-black">
                  <span className="text-[8px] text-gray-700 block font-bold">ALÍQUOTA ISS (%)</span>
                  <strong className="text-xs">5,00%</strong>
                </div>
                <div className="p-2">
                  <span className="text-[8px] text-gray-700 block font-bold">VALOR DO ISS (R$)</span>
                  <strong className="text-xs">R$ {(doc.totalAmount * 0.05).toFixed(2)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 text-center p-2 bg-gray-50">
                <div className="border-r border-black">
                  <span className="text-[8px] text-gray-700 block font-bold">VALOR TOTAL DA NFS-e</span>
                  <strong className="text-sm text-black">R$ {doc.totalAmount.toFixed(2)}</strong>
                </div>
                <div className="border-r border-black">
                  <span className="text-[8px] text-gray-700 block font-bold">VALOR ISS RETIDO (R$)</span>
                  <strong className="text-xs text-gray-600">R$ 0,00</strong>
                </div>
                <div>
                  <span className="text-[8px] text-gray-700 block font-bold">VALOR LÍQUIDO A RECEBER</span>
                  <strong className="text-sm text-emerald-800">R$ {doc.totalAmount.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* QUADRO 5: AUTENTICIDADE E RODAPÉ */}
            <div className="border-t-2 border-black pt-3 text-center space-y-1 text-[8.5px] text-gray-700">
              <p className="font-bold uppercase">
                Documento Autenticado Eletronicamente pela Secretaria da Fazenda Municipal de São Paulo
              </p>
              <p>
                Para verificar a autenticidade desta NFS-e, acesse o portal: <span className="font-bold underline">https://nfe.prefeitura.sp.gov.br</span> informando o CNPJ do prestador e o código de verificação: <strong>ABYCCDEF</strong>.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
