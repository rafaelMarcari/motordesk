/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - TELA DE CONFERÊNCIA FISCAL PRÉ-TRANSMISSÃO (FASE 2)
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Building, 
  User, 
  Truck, 
  Layers, 
  HelpCircle, 
  Printer, 
  Copy, 
  Loader2, 
  Barcode, 
  QrCode,
  Lock,
  Ban
} from 'lucide-react';
import { 
  CompanyInfo, 
  Client, 
  FiscalDocument, 
  SefazApiConfig, 
  TaxRule, 
  FreightType, 
  ShippingOperation,
  Carrier,
  TaxOperationNature
} from '../types';
import { fiscalProvider, FiscalEmissionResult } from '../services/fiscalProvider';
import { resolveItemTributacao, OFFICIAL_CFOPS } from '../utils/taxUtils';

export interface FiscalConferenceItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
  ncm?: string;
  cfop?: string;
  cest?: string;
  cstCsosn?: string;
  unit?: string;
  type?: 'part' | 'service';
}

interface FiscalConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyInfo;
  client?: Client | null;
  clientName?: string;
  clientCpfCnpj?: string;
  clientAddress?: string;
  clientCity?: string;
  clientUf?: string;
  items: FiscalConferenceItem[];
  docType?: 'nfe_product' | 'nfce_retail' | 'nfse_service';
  saleId?: string;
  saleCode?: string;
  paymentMethod?: string;
  installmentsCount?: number;
  freightType?: FreightType;
  carrierId?: string;
  carrierName?: string;
  carrierCnpjCpf?: string;
  freightValue?: number;
  shippingOperation?: ShippingOperation;
  logisticsHub?: string;
  redispersionCarrierName?: string;
  notes?: string;
  sefazConfig: SefazApiConfig;
  taxRules?: TaxRule[];
  carriers?: Carrier[];
  onEmissionComplete: (result: FiscalEmissionResult) => void;
  onAddHistoryLog?: (
    type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system',
    title: string,
    description: string,
    clientId: string,
    vehicleId: string,
    metadata?: any
  ) => void;
}

export default function FiscalConferenceModal({
  isOpen,
  onClose,
  company,
  client,
  clientName,
  clientCpfCnpj,
  clientAddress,
  clientCity,
  clientUf,
  items: initialItems,
  docType = 'nfe_product',
  saleId,
  saleCode,
  paymentMethod,
  installmentsCount,
  freightType: initialFreightType = 'SEM_FRETE',
  carrierId: initialCarrierId,
  carrierName: initialCarrierName,
  carrierCnpjCpf: initialCarrierCnpjCpf,
  freightValue: initialFreightValue = 0,
  shippingOperation: initialShippingOp = 'DIRETA',
  logisticsHub,
  redispersionCarrierName,
  notes,
  sefazConfig,
  taxRules = [],
  carriers = [],
  onEmissionComplete,
  onAddHistoryLog
}: FiscalConferenceModalProps) {
  const [selectedDocType, setSelectedDocType] = useState<'nfe_product' | 'nfce_retail' | 'nfse_service'>(docType);
  const [editableItems, setEditableItems] = useState<FiscalConferenceItem[]>(initialItems);
  const [freightType, setFreightType] = useState<FreightType>(initialFreightType);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>(initialCarrierId || '');
  const [freightValue, setFreightValue] = useState<number>(initialFreightValue);
  const [simulateRejection, setSimulateRejection] = useState<boolean>(false);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [transmissionResult, setTransmissionResult] = useState<FiscalEmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Destinatário
  const recipientName = clientName || client?.name || 'Consumidor Final';
  const recipientDoc = simulateRejection ? '00.000.000/0000-00' : (clientCpfCnpj || client?.cpf || client?.cpfCnpj || '000.000.000-00');
  const recipientAddr = clientAddress || client?.address || 'Av. das Nações, 500';
  const recipientCity = clientCity || 'São Paulo';
  const recipientUf = clientUf || client?.uf || 'SP';

  // Transportadora selecionada
  const activeCarrier = carriers.find(c => c.id === selectedCarrierId);
  const resolvedCarrierName = activeCarrier?.corporateName || activeCarrier?.tradeName || initialCarrierName || '';
  const resolvedCarrierCnpj = activeCarrier?.cnpj || initialCarrierCnpjCpf || '';

  // Cálculos Tributários dos Itens
  const calculatedItems = useMemo(() => {
    let subtotalProd = 0;
    let subtotalServ = 0;
    let totIcms = 0;
    let totPis = 0;
    let totCofins = 0;
    let totIss = 0;
    let totIbs = 0;
    let totCbs = 0;
    let totTaxes = 0;

    const defaultNature: TaxOperationNature = {
      id: 'NAT-01',
      code: 'NAT-01',
      description: 'Venda de Mercadorias / Prestação de Serviços',
      cfopInternal: selectedDocType === 'nfse_service' ? '5.933' : '5.102',
      cfopInterstate: selectedDocType === 'nfse_service' ? '6.933' : '6.102',
      generatesFinancial: true,
      movesStock: true,
      docType: '1',
      nfePurpose: '1'
    };

    const recipientClientObj: Client = client || {
      id: 'c1',
      name: recipientName,
      cpf: recipientDoc,
      email: '',
      phone: '',
      address: recipientAddr,
      uf: recipientUf,
      createdAt: '',
      companyId: company.id
    };

    const processed = editableItems.map(item => {
      const isService = item.type === 'service' || selectedDocType === 'nfse_service';
      const resolved = resolveItemTributacao(
        {
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity,
          ncm: item.ncm,
          itemType: isService ? 'service' : 'part',
          partRef: !isService ? ({ id: item.id, name: item.name, code: item.code, price: item.unitPrice, cost: item.unitPrice * 0.6, stock: 10, minStock: 1, category: 'Peças', ncm: item.ncm, cest: item.cest } as any) : undefined,
          serviceRef: isService ? ({ id: item.id, name: item.name, code: item.code, price: item.unitPrice, standardHours: 1, category: 'Mecânica' } as any) : undefined
        },
        defaultNature,
        company,
        recipientClientObj,
        taxRules
      );

      const itemTotal = item.totalPrice || (item.quantity * item.unitPrice);
      if (isService) {
        subtotalServ += itemTotal;
        totIss += resolved.issAmount;
      } else {
        subtotalProd += itemTotal;
        totIcms += resolved.icmsAmount;
      }

      totPis += resolved.pisAmount;
      totCofins += resolved.cofinsAmount;
      totIbs += resolved.ibsAmount;
      totCbs += resolved.cbsAmount;
      totTaxes += resolved.totalTaxesAmount;

      return {
        ...item,
        cfop: item.cfop || resolved.cfop || (isService ? '5.933' : '5.102'),
        ncm: item.ncm || (isService ? '0000.00.00' : '8708.29.99'),
        resolvedIcms: resolved.icmsAmount,
        resolvedPis: resolved.pisAmount,
        resolvedCofins: resolved.cofinsAmount,
        resolvedIss: resolved.issAmount,
        resolvedIbs: resolved.ibsAmount,
        resolvedCbs: resolved.cbsAmount,
        resolvedTaxesTotal: resolved.totalTaxesAmount
      };
    });

    const totalDocAmount = subtotalProd + subtotalServ + (freightType !== 'SEM_FRETE' && freightType !== 'none' ? freightValue : 0);

    return {
      items: processed,
      subtotalProd,
      subtotalServ,
      totIcms,
      totPis,
      totCofins,
      totIss,
      totIbs,
      totCbs,
      totTaxes,
      totalDocAmount
    };
  }, [editableItems, selectedDocType, client, company, taxRules, freightType, freightValue, recipientName, recipientDoc, recipientAddr, recipientUf]);

  // Validação Prévia de Pendências Obrigatórias
  const validationInconsistencies = useMemo(() => {
    const list: string[] = [];
    if (!company.cnpj) list.push('CNPJ da empresa emitente não informado.');
    if (!company.stateRegistration && selectedDocType !== 'nfse_service') list.push('Inscrição Estadual da empresa emitente não configurada.');
    if (editableItems.length === 0) list.push('Nenhum item adicionado à nota.');
    
    editableItems.forEach((it, idx) => {
      if (selectedDocType !== 'nfse_service' && (!it.ncm || it.ncm.trim() === '')) {
        list.push(`Item ${idx + 1} (${it.name}): NCM obrigatório não informado.`);
      }
    });

    if (freightType !== 'SEM_FRETE' && !resolvedCarrierName) {
      list.push('Modalidade com frete selecionada, mas nenhuma transportadora vinculada.');
    }

    return list;
  }, [company, selectedDocType, editableItems, freightType, resolvedCarrierName]);

  // Transmissão Fiscal
  const handleTransmit = async () => {
    setIsTransmitting(true);
    setErrorMessage(null);

    try {
      let res: FiscalEmissionResult;
      const params = {
        company,
        client,
        clientName: recipientName,
        clientCpfCnpj: recipientDoc,
        clientAddress: recipientAddr,
        clientCity: recipientCity,
        clientUf: recipientUf,
        items: calculatedItems.items,
        docType: selectedDocType,
        saleId,
        saleCode,
        paymentMethod,
        installmentsCount,
        freightType,
        carrierId: selectedCarrierId,
        carrierName: resolvedCarrierName,
        carrierCnpjCpf: resolvedCarrierCnpj,
        freightValue: freightType !== 'SEM_FRETE' ? freightValue : 0,
        shippingOperation: initialShippingOp,
        logisticsHub,
        redispersionCarrierName,
        notes,
        sefazConfig,
        taxRules,
        environment: 'homologation' as const
      };

      if (selectedDocType === 'nfce_retail') {
        res = await fiscalProvider.emitirNFCe(params);
      } else if (selectedDocType === 'nfse_service') {
        res = await fiscalProvider.emitirNFSe(params);
      } else {
        res = await fiscalProvider.emitirNFe(params);
      }

      setTransmissionResult(res);
      onEmissionComplete(res);

      if (onAddHistoryLog) {
        onAddHistoryLog(
          'system',
          res.success ? `NF-e Autorizada em Homologação (${res.code})` : `NF-e Rejeitada na SEFAZ (${res.rejectionCode || 'ERRO'})`,
          `Emissão SEFAZ Homologação. Status: ${res.sefazStatusMessage}. Chave: ${res.accessKey}. Total: R$ ${res.totalAmount.toFixed(2)}`,
          client?.id || 'c1',
          'vehicle-system',
          { accessKey: res.accessKey, protocol: res.protocolNumber }
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado na transmissão fiscal.');
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-3xs">
                <Lock className="w-3 h-3 text-amber-400" /> AMBIENTE DE HOMOLOGAÇÃO (SEFAZ TESTES)
              </span>
              <span className="text-slate-400 text-xs font-mono">
                {saleCode ? `Venda: #${saleCode}` : 'Emissão Direta'}
              </span>
            </div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Conferência Fiscal Pré-Transmissão
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* TIPO DE DOCUMENTO FISCAL */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-200 block">Tipo de Documento Fiscal a Emitir:</span>
              <span className="text-[11px] text-slate-500">Selecione o modelo apropriado para a operação comercial</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDocType('nfe_product')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  selectedDocType === 'nfe_product'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> NF-e (Modelo 55 - Produtos)
              </button>

              <button
                type="button"
                onClick={() => setSelectedDocType('nfce_retail')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  selectedDocType === 'nfce_retail'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" /> NFC-e (Modelo 65 - Consumidor)
              </button>

              <button
                type="button"
                onClick={() => setSelectedDocType('nfse_service')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  selectedDocType === 'nfse_service'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Building className="w-3.5 h-3.5" /> NFS-e (Serviços)
              </button>
            </div>
          </div>

          {/* DADOS DE EMISSOR E DESTINATÁRIO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Emitente */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 dark:text-slate-100">1. Empresa Emitente</span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-800 dark:text-slate-200">{company.tradeName || company.name}</div>
                <div>CNPJ: <span className="font-mono">{company.cnpj || '00.000.000/0001-91'}</span> | IE: <span className="font-mono">{company.stateRegistration || '123.456.789.110'}</span></div>
                <div>Regime: <span className="font-bold text-indigo-600">{company.taxRegime === 'simples_nacional' ? 'Simples Nacional' : 'Lucro Presumido/Real'}</span> | UF: {company.uf || 'SP'}</div>
              </div>
            </div>

            {/* Destinatário */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">2. Destinatário / Tomador</span>
                </div>
                {simulateRejection && (
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">
                    Simulação Rejeição Ativa
                  </span>
                )}
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-800 dark:text-slate-200">{recipientName}</div>
                <div>CPF/CNPJ: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{recipientDoc}</span></div>
                <div>Endereço: {recipientAddr} - {recipientCity}/{recipientUf}</div>
              </div>
            </div>
          </div>

          {/* FRETE & TRANSPORTADORA */}
          {selectedDocType !== 'nfse_service' && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-900 dark:text-slate-100">3. Logística & Transporte da NF-e</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Modalidade de Frete</label>
                  <select
                    value={freightType}
                    onChange={e => setFreightType(e.target.value as FreightType)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="SEM_FRETE">9 - Sem Frete (Retirada Balcão)</option>
                    <option value="CIF">0 - CIF (Frete por Conta do Emitente)</option>
                    <option value="FOB">1 - FOB (Frete por Conta do Destinatário)</option>
                    <option value="TERCEIROS">2 - Frete por Conta de Terceiros</option>
                  </select>
                </div>

                {freightType !== 'SEM_FRETE' && (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Transportadora Cadastrada</label>
                      <select
                        value={selectedCarrierId}
                        onChange={e => setSelectedCarrierId(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-medium"
                      >
                        <option value="">Selecione a transportadora...</option>
                        {carriers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.corporateName || c.tradeName} ({c.cnpj || 'Sem doc'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Valor do Frete (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={freightValue}
                        onChange={e => setFreightValue(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-bold"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TABELA DE ITENS COM TRIBUTOS E REFORMA TRIBUTÁRIA 2026 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                4. Itens & Parametrização Fiscal Individual
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                IBS (0,1%) + CBS (0,9%) aplicados conforme Reforma Tributária 2026
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                  <tr>
                    <th className="p-3">Item / Código</th>
                    <th className="p-3">NCM</th>
                    <th className="p-3">CFOP</th>
                    <th className="p-3 text-center">Qtd</th>
                    <th className="p-3 text-right">Unitário</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">ICMS / ISS</th>
                    <th className="p-3 text-right">IBS (0,1%) + CBS (0,9%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {calculatedItems.items.map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{it.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{it.code}</div>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {it.ncm}
                      </td>
                      <td className="p-3 font-mono font-semibold text-indigo-600">
                        {it.cfop}
                      </td>
                      <td className="p-3 text-center font-bold">
                        {it.quantity}
                      </td>
                      <td className="p-3 text-right">
                        R$ {it.unitPrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                        R$ {(it.totalPrice || (it.quantity * it.unitPrice)).toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                        R$ {((it.resolvedIcms || 0) + (it.resolvedIss || 0)).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        R$ {((it.resolvedIbs || 0) + (it.resolvedCbs || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RESUMO TRIBUTÁRIO & TOTAIS */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">Subtotal Produtos</span>
                <span className="font-bold text-sm">R$ {calculatedItems.subtotalProd.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">ICMS + PIS/COFINS</span>
                <span className="font-bold text-sm">R$ {(calculatedItems.totIcms + calculatedItems.totPis + calculatedItems.totCofins).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-emerald-400 text-[10px] block uppercase">IBS + CBS (Reforma 2026)</span>
                <span className="font-bold text-sm text-emerald-300">R$ {(calculatedItems.totIbs + calculatedItems.totCbs).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">Tributos Totais Aprox.</span>
                <span className="font-bold text-sm text-amber-300">R$ {calculatedItems.totTaxes.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-right border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 shrink-0 w-full md:w-auto">
              <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">Valor Total da Operação</span>
              <span className="text-2xl font-black text-white">R$ {calculatedItems.totalDocAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* AVISOS DE INCONSISTÊNCIA SE HOUVER */}
          {validationInconsistencies.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Pendências de Preenchimento Detectadas:</span>
              </div>
              <ul className="list-disc list-inside text-amber-700 dark:text-amber-300 space-y-0.5 pl-2">
                {validationInconsistencies.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* FEEDBACK DE TRANSMISSÃO */}
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {transmissionResult && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              transmissionResult.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {transmissionResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Ban className="w-5 h-5 text-red-600" />}
                <span>Status SEFAZ: {transmissionResult.sefazStatusMessage}</span>
              </div>
              <div className="font-mono text-[11px] space-y-1">
                <div>Chave: <span className="font-bold">{transmissionResult.accessKey}</span></div>
                {transmissionResult.protocolNumber && <div>Protocolo: <span className="font-bold">{transmissionResult.protocolNumber}</span></div>}
                {transmissionResult.rejectionReason && <div className="text-red-700 font-bold">Motivo Rejeição: {transmissionResult.rejectionReason}</div>}
              </div>
            </div>
          )}

          {/* SIMULADOR DE TESTE DE REJEIÇÃO SEFAZ (AUDITORIA FASE 2) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                🧪 Teste de Auditoria: Simular Rejeição SEFAZ (Teste Obrigatório 4)
              </span>
              <p className="text-[11px] text-slate-500">
                Altera temporariamente o CNPJ do destinatário para "00.000.000/0000-00" para validar a captura de rejeição código 208 pela SEFAZ.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulateRejection}
                onChange={e => setSimulateRejection(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-slate-500 text-[11px] flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            Certificado Digital A1 ativo. Transmissão 100% isolada em Homologação.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex-1 sm:flex-none"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleTransmit}
              disabled={isTransmitting || validationInconsistencies.length > 0}
              className={`px-5 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md flex-1 sm:flex-none text-white ${
                validationInconsistencies.length > 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : simulateRejection
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isTransmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Transmitindo SEFAZ...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {simulateRejection ? 'Transmitir e Validar Rejeição SEFAZ' : 'Transmitir em Homologação SEFAZ'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
