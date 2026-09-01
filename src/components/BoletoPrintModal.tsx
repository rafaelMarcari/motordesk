/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MODAL DE VISUALIZAÇÃO E IMPRESSÃO OFICIAL DE BOLETO BANCÁRIO (A4 & PIX HÍBRIDO)
 * Padrão Nacional FEBRABAN, Banco Central do Brasil e Normativas Bancárias.
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  QrCode as QrIcon,
  Building2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Info,
  CheckCircle2,
  Ban,
  DollarSign,
  Layers,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { BoletoDocument, CompanyInfo, Client, BankBoletoConfig, PixConfig, BillingClosingOrder, User } from '../types';
import { getBankMetadata, generateBarcodeSvg, generateFebrabanBoletoCodes } from '../utils/boletoEngine';
import { generatePdfFromElement } from '../utils/pdfGenerator';

interface BoletoPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  boleto: BoletoDocument | null;
  companyInfo?: CompanyInfo;
  client?: Client;
  bankConfig?: BankBoletoConfig;
  pixConfig?: PixConfig;
  consolidatedClosing?: BillingClosingOrder;
  currentUser?: User;
  onRegisterBoleto?: (boleto: BoletoDocument) => void;
  onCancelBoleto?: (boleto: BoletoDocument, reason: string) => void;
  onSettleBoleto?: (boleto: BoletoDocument) => void;
}

export default function BoletoPrintModal({
  isOpen,
  onClose,
  boleto,
  companyInfo,
  client,
  bankConfig,
  pixConfig,
  consolidatedClosing,
  currentUser,
  onRegisterBoleto,
  onCancelBoleto,
  onSettleBoleto
}: BoletoPrintModalProps) {
  const [copiedType, setCopiedType] = useState<'barcode' | 'pix' | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'boleto' | 'extrato'>('boleto');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !boleto) return null;

  const bankMeta = getBankMetadata(boleto.bankCode || bankConfig?.bankCode);
  const hasActiveBank = Boolean(bankConfig && bankConfig.active);
  const isSimulation = boleto.status === 'simulated' || (!hasActiveBank && boleto.status !== 'paid');

  // Dados do Beneficiário
  const beneficiaryName = companyInfo?.tradeName || companyInfo?.name || 'MotorDesk Auto Center & Autopeças';
  const beneficiaryCnpj = companyInfo?.cnpj || '12.345.678/0001-90';
  const beneficiaryAddress = `${companyInfo?.address || 'Av. Paulista, 1000'} - ${companyInfo?.city || 'São Paulo'}/${companyInfo?.state || 'SP'}`;
  const beneficiaryAgencyAccount = `${boleto.agency || bankConfig?.agencyNumber || '0452'} / ${boleto.account || bankConfig?.accountNumber || '98450-2'}`;

  // Dados do Pagador (Sacado)
  const payerName = boleto.payerName || client?.name || 'Cliente';
  const payerCpfCnpj = boleto.payerCpfCnpj || client?.cpfCnpj || client?.cpf || '000.000.000-00';
  const payerAddress = client?.address || 'Endereço do Pagador Não Informado';

  // Código de Barras e Linha Digitável
  const barcodeSvg = useMemo(() => {
    return generateBarcodeSvg(boleto.barcodeNumber);
  }, [boleto.barcodeNumber]);

  // Handler de Cópia
  const handleCopyText = (text: string, type: 'barcode' | 'pix') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Handler de Impressão Direta
  const handlePrint = () => {
    window.print();
  };

  // Handler de Download de PDF
  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromElement(
        'boleto-printable-area',
        `Boleto_${boleto.code}_${beneficiaryName.replace(/\s+/g, '_')}.pdf`,
        'portrait'
      );
    } catch (error) {
      console.error('Erro ao gerar PDF do boleto:', error);
      // Fallback para impressão nativa
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Status Badge Label
  const getStatusBadge = () => {
    switch (boleto.status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Boleto Liquidado / Pago
          </span>
        );
      case 'registered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Boleto Registrado no Banco
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Ban className="w-3.5 h-3.5 text-rose-600" /> Cobrança Cancelada
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Título Vencido
          </span>
        );
      case 'simulated':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
            <Info className="w-3.5 h-3.5 text-amber-600" /> Não Registrado (Simulação)
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-xs overflow-hidden animate-fade-in print:bg-white print:p-0 print:m-0 print:static print:overflow-visible"
      id="modal-boleto-print"
    >
      {/* ========================================================================= */}
      {/* SCREEN HEADER & ACTION TOOLBAR (HIDDEN IN PRINT) */}
      {/* ========================================================================= */}
      <header className="print:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-xs"
            style={{ backgroundColor: bankMeta.color, color: bankMeta.textColor, borderColor: 'rgba(255,255,255,0.2)' }}
          >
            {bankMeta.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-slate-100 flex items-center gap-2">
                Boleto Bancário {bankMeta.shortName} • #{boleto.code}
              </h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Nosso Número: {boleto.nossoNumero || '109/8492041-8'} • Vencimento: {boleto.dueDate} • Valor: R$ {boleto.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {consolidatedClosing && (
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-semibold mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('boleto')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'boleto' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                📄 Boleto Bancário
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('extrato')}
                className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'extrato' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Extrato Vendas ({consolidatedClosing.salesCount || consolidatedClosing.items?.length || 0})
              </button>
            </div>
          )}

          {/* Copiar Linha Digitável */}
          <button
            type="button"
            onClick={() => handleCopyText(boleto.barcodeNumber, 'barcode')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Copiar Linha Digitável do Boleto"
          >
            {copiedType === 'barcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedType === 'barcode' ? 'Copiado!' : 'Copiar Linha'}</span>
          </button>

          {/* Copiar Pix se Híbrido */}
          {boleto.pixCopiaECola && (
            <button
              type="button"
              onClick={() => handleCopyText(boleto.pixCopiaECola!, 'pix')}
              className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700 text-indigo-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar Código Pix Copia e Cola"
            >
              {copiedType === 'pix' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <QrIcon className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{copiedType === 'pix' ? 'Pix Copiado!' : 'Copiar Pix'}</span>
            </button>
          )}

          {/* Salvar PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Salvar como PDF A4"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{isGeneratingPdf ? 'Gerando...' : 'Salvar PDF'}</span>
          </button>

          {/* Imprimir A4 */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Imprimir em Papel A4"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Boleto</span>
          </button>

          {/* Botão Registrar no Banco (se simulado) */}
          {boleto.status === 'simulated' && onRegisterBoleto && (
            <button
              type="button"
              onClick={() => onRegisterBoleto(boleto)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Efetuar Registro Bancário da Cobrança"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Registrar no Banco</span>
            </button>
          )}

          {/* Botão Liquidar / Baixar Título */}
          {boleto.status !== 'paid' && boleto.status !== 'canceled' && onSettleBoleto && (
            <button
              type="button"
              onClick={() => onSettleBoleto(boleto)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Confirmar Liquidação Manual deste Boleto"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Confirmar Pagamento</span>
            </button>
          )}

          {/* Botão Cancelar Cobrança */}
          {boleto.status !== 'canceled' && boleto.status !== 'paid' && onCancelBoleto && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
              title="Cancelar este Boleto"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          )}

          {/* Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
            title="Fechar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT / DOCUMENT CANVAS */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60 flex justify-center print:p-0 print:bg-white print:overflow-visible">
        
        {/* Container A4 Padronizado */}
        <div
          id="boleto-printable-area"
          ref={printContainerRef}
          className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-[10mm] sm:p-[12mm] shadow-2xl rounded-xl print:rounded-none print:shadow-none print:p-[5mm] print:m-0 print:w-full print:max-w-none text-[11px] font-sans leading-tight border border-slate-200 print:border-none flex flex-col justify-between"
          style={{ boxSizing: 'border-box' }}
        >
          {/* TAB 1: BOLETO FEBRABAN COMPLETO */}
          {activeTab === 'boleto' && (
            <div className="space-y-6">
              
              {/* Tarja de Aviso se for Boleto em Simulação / Sem Registro */}
              {isSimulation && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-amber-900 text-xs font-medium print:border print:border-amber-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>BOLETO NÃO REGISTRADO — SIMULAÇÃO / HOMOLOGAÇÃO:</strong> O documento reflete o layout oficial FEBRABAN para conferência.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-amber-200/80 px-2 py-0.5 rounded font-bold">
                    Sem Registro Bancário
                  </span>
                </div>
              )}

              {/* ================================================================= */}
              {/* PARTE 1: RECIBO DO SACADO / PAGADOR (CANHOTO SUPERIOR) */}
              {/* ================================================================= */}
              <div className="border border-slate-400 rounded-xs overflow-hidden">
                {/* Header Canhoto */}
                <div className="bg-slate-100 border-b border-slate-400 px-3 py-1.5 flex items-center justify-between font-bold text-[10px] uppercase text-slate-700">
                  <span>Recibo do Pagador</span>
                  <span>{bankMeta.name} • Código {bankMeta.code}-{bankMeta.dv}</span>
                </div>

                {/* Grid de Dados do Recibo do Pagador */}
                <div className="grid grid-cols-12 divide-x divide-y divide-slate-300 text-[10px]">
                  <div className="col-span-8 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Beneficiário</span>
                    <span className="font-bold text-slate-900">{beneficiaryName}</span>
                    <span className="text-slate-600 block text-[9px]">CNPJ: {beneficiaryCnpj}</span>
                  </div>
                  <div className="col-span-4 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Agência / Código Beneficiário</span>
                    <span className="font-bold text-slate-900 font-mono">{beneficiaryAgencyAccount}</span>
                  </div>

                  <div className="col-span-8 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Pagador</span>
                    <span className="font-bold text-slate-900">{payerName}</span>
                    <span className="text-slate-600 block text-[9px]">CPF/CNPJ: {payerCpfCnpj}</span>
                  </div>
                  <div className="col-span-4 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Vencimento</span>
                    <span className="font-black text-slate-900 text-[11px] font-mono">{boleto.dueDate}</span>
                  </div>

                  <div className="col-span-4 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Número do Documento</span>
                    <span className="font-mono text-slate-800">{boleto.code}</span>
                  </div>
                  <div className="col-span-4 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Nosso Número</span>
                    <span className="font-mono text-slate-800 font-bold">{boleto.nossoNumero || '109/8492041-8'}</span>
                  </div>
                  <div className="col-span-4 p-1.5 bg-slate-50">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Valor do Documento</span>
                    <span className="font-black text-slate-900 text-[12px] font-mono">
                      R$ {boleto.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Autenticação Mecânica Canhoto */}
                <div className="p-1.5 bg-slate-50 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                  <span>Autenticação Mecânica</span>
                  <span>{boleto.id} • MotorDesk Banking Core v2.4</span>
                </div>
              </div>

              {/* ================================================================= */}
              {/* LINHA DE CORTE PONTILHADA */}
              {/* ================================================================= */}
              <div className="relative my-4 text-center">
                <div className="border-b-2 border-dashed border-slate-400 w-full" />
                <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white px-3 text-[9px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
                  ✂ Corte na linha pontilhada
                </span>
              </div>

              {/* ================================================================= */}
              {/* PARTE 2: FICHA DE COMPENSAÇÃO (CORPO PRINCIPAL DO BOLETO) */}
              {/* ================================================================= */}
              <div className="border border-slate-900 rounded-xs overflow-hidden">
                
                {/* TOPO DA FICHA: LOGO DO BANCO | CÓDIGO DO BANCO-DV | LINHA DIGITÁVEL */}
                <div className="border-b-2 border-slate-900 flex items-center divide-x-2 divide-slate-900 bg-white">
                  <div className="px-3 py-2 flex items-center gap-2 min-w-[170px]">
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs shadow-xs"
                      style={{ backgroundColor: bankMeta.color, color: bankMeta.textColor }}
                    >
                      {bankMeta.code}
                    </div>
                    <span className="font-black text-slate-900 text-sm tracking-tight">
                      {bankMeta.shortName}
                    </span>
                  </div>

                  <div className="px-4 py-2 text-center font-black text-lg text-slate-900 min-w-[80px]">
                    {bankMeta.code}-{bankMeta.dv}
                  </div>

                  <div className="px-3 py-2 flex-1 text-right font-mono font-bold text-[12px] text-slate-900 tracking-wider">
                    {boleto.barcodeNumber}
                  </div>
                </div>

                {/* GRID PRINCIPAL DE DADOS DA FICHA DE COMPENSAÇÃO */}
                <div className="grid grid-cols-12 divide-x divide-y divide-slate-400 text-[10px]">
                  
                  {/* Linha 1: Local de Pagamento e Vencimento */}
                  <div className="col-span-9 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Local de Pagamento</span>
                    <span className="font-bold text-slate-900">PAGÁVEL EM QUALQUER BANCO OU CORRESPONDENTE ATÉ O VENCIMENTO</span>
                  </div>
                  <div className="col-span-3 p-1.5 bg-slate-50">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Vencimento</span>
                    <span className="font-black text-slate-900 text-[12px] font-mono block text-right">
                      {boleto.dueDate}
                    </span>
                  </div>

                  {/* Linha 2: Beneficiário e Agência/Código */}
                  <div className="col-span-9 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Beneficiário</span>
                    <span className="font-bold text-slate-900 block">{beneficiaryName}</span>
                    <span className="text-slate-600 block text-[9px]">{beneficiaryAddress} • CNPJ: {beneficiaryCnpj}</span>
                  </div>
                  <div className="col-span-3 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Agência / Código Beneficiário</span>
                    <span className="font-mono font-bold text-slate-900 block text-right">{beneficiaryAgencyAccount}</span>
                  </div>

                  {/* Linha 3: Dados do Documento */}
                  <div className="col-span-2 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Data do Documento</span>
                    <span className="font-mono text-slate-800">{boleto.issueDate}</span>
                  </div>
                  <div className="col-span-3 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Número do Documento</span>
                    <span className="font-mono text-slate-800 font-bold">{boleto.code}</span>
                  </div>
                  <div className="col-span-2 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Espécie Doc.</span>
                    <span className="font-bold text-slate-800">DM</span>
                  </div>
                  <div className="col-span-1 p-1.5 text-center">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Aceite</span>
                    <span className="font-bold text-slate-800">N</span>
                  </div>
                  <div className="col-span-1 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Data Process.</span>
                    <span className="font-mono text-slate-800">{boleto.issueDate}</span>
                  </div>
                  <div className="col-span-3 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Nosso Número</span>
                    <span className="font-mono font-black text-slate-900 block text-right">{boleto.nossoNumero || '109/8492041-8'}</span>
                  </div>

                  {/* Linha 4: Informações de Carteira e Valor */}
                  <div className="col-span-2 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Uso do Banco</span>
                    <span className="font-mono text-slate-800">000</span>
                  </div>
                  <div className="col-span-2 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Carteira</span>
                    <span className="font-mono text-slate-800 font-bold">{boleto.wallet || '109'}</span>
                  </div>
                  <div className="col-span-2 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Espécie Moeda</span>
                    <span className="font-bold text-slate-800">R$</span>
                  </div>
                  <div className="col-span-1 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Quantidade</span>
                    <span className="font-mono text-slate-800">-</span>
                  </div>
                  <div className="col-span-2 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Valor Moeda</span>
                    <span className="font-mono text-slate-800">-</span>
                  </div>
                  <div className="col-span-3 p-1.5 bg-slate-50">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">(=) Valor do Documento</span>
                    <span className="font-black text-slate-900 text-[13px] font-mono block text-right">
                      R$ {boleto.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Linha 5: Instruções e Campos de Desconto/Deduções/Acréscimos */}
                  <div className="col-span-9 row-span-5 p-2 space-y-1.5 bg-white">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">
                      Instruções de Responsabilidade do Beneficiário (Texto de responsabilidade do cedente)
                    </span>
                    <div className="font-mono text-[9.5px] text-slate-800 leading-relaxed whitespace-pre-line border border-slate-200 p-2 rounded bg-slate-50/50">
                      {boleto.instructions || [
                        'Sr. Caixa, não receber após 30 dias do vencimento.',
                        `Após o vencimento cobrar juros de mora de ${boleto.interestRate || 1}% ao mês e multa de ${boleto.fineRate || 2}%.`,
                        consolidatedClosing ? `Cobrança consolidada do Fechamento ${consolidatedClosing.code}.` : `Referente à transação ${boleto.code}.`,
                        'Pagável em qualquer canal bancário, app, internet banking ou lotérica até o vencimento.'
                      ].join('\n')}
                    </div>

                    {/* SEÇÃO PIX HÍBRIDO EMBUTIDA */}
                    {boleto.pixQrCodeUrl && (
                      <div className="mt-2 p-2 bg-indigo-50/70 border border-indigo-200 rounded flex items-center gap-3">
                        <img
                          src={boleto.pixQrCodeUrl}
                          alt="QR Code Pix"
                          className="w-16 h-16 bg-white p-0.5 border border-indigo-200 rounded shrink-0"
                        />
                        <div className="flex-1 text-[9px] text-indigo-900 space-y-1">
                          <span className="font-bold flex items-center gap-1 text-indigo-950">
                            <QrIcon className="w-3.5 h-3.5 text-indigo-600" /> Pagamento Instantâneo via PIX Integrado
                          </span>
                          <p className="text-slate-600 text-[8.5px]">
                            Abra o app do seu banco e aponte a câmera para o QR Code acima para quitar imediatamente.
                          </p>
                          {boleto.pixCopiaECola && (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[8px] text-slate-500 truncate max-w-[200px]">
                                {boleto.pixCopiaECola}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Campos Laterais Direitos */}
                  <div className="col-span-3 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">(-) Desconto / Abatimento</span>
                    <span className="font-mono text-slate-700 block text-right">-</span>
                  </div>
                  <div className="col-span-3 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">(-) Outras Deduções</span>
                    <span className="font-mono text-slate-700 block text-right">-</span>
                  </div>
                  <div className="col-span-3 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">(+) Mora / Multa</span>
                    <span className="font-mono text-slate-700 block text-right">-</span>
                  </div>
                  <div className="col-span-3 p-1.5">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">(+) Outros Acréscimos</span>
                    <span className="font-mono text-slate-700 block text-right">-</span>
                  </div>
                  <div className="col-span-3 p-1.5 bg-slate-50">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">(=) Valor Cobrado</span>
                    <span className="font-black text-slate-900 text-[13px] font-mono block text-right">
                      R$ {boleto.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Linha 6: Dados do Pagador (Sacado) */}
                  <div className="col-span-12 p-2 bg-slate-50/70">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">Pagador (Sacado)</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-0.5">
                      <span className="font-bold text-slate-900 text-[11px]">{payerName}</span>
                      <span className="font-mono text-slate-700 font-bold">CPF/CNPJ: {payerCpfCnpj}</span>
                    </div>
                    <span className="text-slate-600 block text-[9.5px] mt-0.5">{payerAddress}</span>
                    
                    <div className="flex items-center justify-between text-[8px] text-slate-500 pt-1 mt-1 border-t border-slate-200">
                      <span>Sacador / Avalista: Não Aplicável</span>
                      <span className="font-mono">Cód. Baixa: 00</span>
                    </div>
                  </div>
                </div>

                {/* RODAPÉ DA FICHA: CÓDIGO DE BARRAS FEBRABAN EM SVG & AUTENTICAÇÃO MECÂNICA */}
                <div className="p-3 bg-white border-t border-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-auto flex-1 max-w-[420px]">
                    <div
                      className="w-full overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                    />
                    <div className="font-mono text-[9px] text-center text-slate-600 mt-1 tracking-widest">
                      {boleto.barcodeNumber}
                    </div>
                  </div>

                  <div className="text-right text-[8px] text-slate-500 font-mono shrink-0">
                    <span className="block font-bold uppercase text-slate-700">Ficha de Compensação</span>
                    <span>Autenticação Mecânica no Verso</span>
                    <span className="block text-[7.5px] text-slate-400 mt-0.5">Válido em todo território nacional</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EXTRATO ANALÍTICO DE VENDAS VINCULADAS (QUANDO FECHAMENTO CONSOLIDADO) */}
          {activeTab === 'extrato' && consolidatedClosing && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-xs font-bold uppercase text-indigo-600">Demonstrativo Analítico Anexo</span>
                <h3 className="text-base font-black text-slate-900">
                  Extrato de Vendas e Ordens de Serviço do Fechamento {consolidatedClosing.code}
                </h3>
                <p className="text-xs text-slate-500">
                  Cliente: <strong>{consolidatedClosing.clientName}</strong> • Fechamento: {consolidatedClosing.closingDate} • Vencimento: {consolidatedClosing.dueDate}
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2">Item / Ref.</th>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Descrição da Operação</th>
                      <th className="px-3 py-2 text-right">Valor Bruto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {consolidatedClosing.items && consolidatedClosing.items.length > 0 ? (
                      consolidatedClosing.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-900">{item.originCode || `#${idx + 1}`}</td>
                          <td className="px-3 py-2 text-slate-600">{item.documentDate || consolidatedClosing.closingDate}</td>
                          <td className="px-3 py-2 text-slate-700 font-sans">{item.description}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400 font-sans">
                          {consolidatedClosing.salesCount} vendas totalizando R$ {consolidatedClosing.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-slate-700 uppercase">
                        Total Consolidado do Boleto:
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700 font-black text-sm">
                        R$ {consolidatedClosing.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Informações de Cobrança:</span>
                <p>
                  Este boleto substitui as faturas individuais das compras realizadas no período. Ao efetuar o pagamento do valor consolidado, todas as ordens e vendas acima listadas serão automaticamente baixadas como liquidadas.
                </p>
              </div>
            </div>
          )}

          {/* Rodapé do Documento */}
          <footer className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
            <span>MotorDesk Automotive ERP • Módulo de Cobrança & Boletos FEBRABAN</span>
            <span className="font-mono">Autenticação: {boleto.id}</span>
          </footer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {/* ========================================================================= */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cancelar Cobrança Bancária</h3>
                <p className="text-xs text-slate-500">Boleto #{boleto.code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Ao cancelar este boleto, ele será invalidado para pagamento no sistema e o registro de cancelamento será gravado na trilha de auditoria.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo do Cancelamento <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ex: Acordo direto com cliente, renegociação de valores ou emissão duplicada..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCancelBoleto) {
                    onCancelBoleto(boleto, cancelReason || 'Cancelamento solicitado pelo operador');
                  }
                  setCancelModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
