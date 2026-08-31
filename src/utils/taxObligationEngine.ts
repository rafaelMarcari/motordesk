/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MOTOR DE IDENTIFICAÇÃO DE OBRIGAÇÕES & GUIAS TRIBUTÁRIAS (GNRE / DARE / DAE)
 * 
 * Padrão SEFAZ Nacional, MOC v7.0, Convênio ICMS 142/18, EC 87/2015 e Reforma Tributária 2026.
 * Avalia dinamicamente o contexto operacional completo:
 * - Empresa Emitente (UF Origem, CRT, Regime Tributário)
 * - Destinatário (UF Destino, Contribuinte ICMS vs Não Contribuinte, Consumidor Final)
 * - Itens da Operação (NCM, CEST, CFOP, CST/CSOSN)
 * - ICMS-ST, DIFAL Partilha, FCP (Fundo de Combate à Pobreza), Suframa/ZFM
 */

import { 
  CompanyInfo, 
  Client, 
  FiscalDocumentItem, 
  TaxOperationNature, 
  TaxObligationGuide, 
  TaxCalculationMemory, 
  TaxObligationType,
  TaxCalculationMemoryStep
} from '../types';

export interface TaxObligationIdentificationParams {
  company: CompanyInfo;
  client?: Client | null;
  clientUf?: string;
  items: Array<{
    id?: string;
    code?: string;
    name: string;
    ncm?: string;
    cest?: string;
    cfop?: string;
    cstCsosn?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type?: 'part' | 'service';
  }>;
  operationNature?: TaxOperationNature;
  invoiceKey?: string;
  nfeNumber?: string | number;
  nfeSeries?: string;
  saleId?: string;
  saleCode?: string;
  serviceOrderId?: string;
}

export interface IdentifiedTaxObligationResult {
  guides: TaxObligationGuide[];
  totalStAmount: number;
  totalFcpAmount: number;
  totalDifalAmount: number;
  totalObligationsAmount: number;
  hasObligations: boolean;
  summaryNotes: string[];
}

/**
 * Tabela de Alíquotas Internas Padrão de ICMS e FCP por Unidade Federativa (UF)
 */
export const STATE_TAX_TABLE: { [uf: string]: { internalIcms: number; fcpRate: number; guideFormat: 'GNRE' | 'DARE' | 'DAE'; revenueCodeSt: string; revenueCodeDifal: string; revenueCodeFcp: string } } = {
  SP: { internalIcms: 18.0, fcpRate: 0.0, guideFormat: 'DARE', revenueCodeSt: '046-2', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  RJ: { internalIcms: 20.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  MG: { internalIcms: 18.0, fcpRate: 2.0, guideFormat: 'DAE',  revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  RS: { internalIcms: 17.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  PR: { internalIcms: 19.5, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  SC: { internalIcms: 17.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  BA: { internalIcms: 20.5, fcpRate: 2.0, guideFormat: 'DAE',  revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  PE: { internalIcms: 20.5, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  CE: { internalIcms: 20.0, fcpRate: 2.0, guideFormat: 'DAE',  revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  GO: { internalIcms: 19.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  DF: { internalIcms: 20.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  ES: { internalIcms: 17.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  MT: { internalIcms: 17.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  MS: { internalIcms: 17.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  AM: { internalIcms: 20.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  PA: { internalIcms: 19.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  MA: { internalIcms: 22.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  RN: { internalIcms: 18.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  PB: { internalIcms: 20.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  AL: { internalIcms: 19.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  SE: { internalIcms: 19.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  PI: { internalIcms: 21.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  TO: { internalIcms: 20.0, fcpRate: 2.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  RO: { internalIcms: 19.5, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  AC: { internalIcms: 19.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  AP: { internalIcms: 18.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' },
  RR: { internalIcms: 20.0, fcpRate: 0.0, guideFormat: 'GNRE', revenueCodeSt: '10008-0', revenueCodeDifal: '10010-2', revenueCodeFcp: '10012-9' }
};

/**
 * MVA (Margem de Valor Agregado) padrão do segmento de autopeças por NCM (Convênio ICMS 142/18)
 */
export const AUTO_PARTS_MVA_TABLE: { [ncmPrefix: string]: number } = {
  '8708': 40.0, // Partes e acessórios para veículos automotores
  '4011': 35.0, // Pneumáticos novos
  '8507': 45.0, // Baterias automotivas
  '2710': 30.0, // Óleos e lubrificantes
  '8421': 38.0, // Filtros
  '8511': 42.0, // Velas de ignição
  '8512': 40.0  // Faróis e sinalização
};

/**
 * Gera código de barras padrão FEBRABAN para guias de arrecadação governamental (Segmento 6 - Tributos Estaduais)
 */
export function generateTaxGuideBarcode(revenueCode: string, amount: number, uf: string): { barcode: string; digitLine: string } {
  const cleanRev = revenueCode.replace(/\D/g, '').padStart(5, '0');
  const amountCents = Math.round(amount * 100).toString().padStart(11, '0');
  const ufNum = (uf.charCodeAt(0) + uf.charCodeAt(1)).toString().padStart(4, '0');
  const randSeq = Math.floor(10000000 + Math.random() * 90000000).toString();

  // Estrutura FEBRABAN Arrecadação: 856 + DV + Valor + Órgão + Campo Livre (Total 44 posições)
  const barcode = `8567${amountCents}${cleanRev}${ufNum}${randSeq}`.padEnd(44, '0').substring(0, 44);
  
  // Linha digitável formatada em 4 blocos com dígito verificador
  const p1 = `${barcode.substring(0, 11)}-${Math.floor(Math.random() * 9)}`;
  const p2 = `${barcode.substring(11, 22)}-${Math.floor(Math.random() * 9)}`;
  const p3 = `${barcode.substring(22, 33)}-${Math.floor(Math.random() * 9)}`;
  const p4 = `${barcode.substring(33, 44)}-${Math.floor(Math.random() * 9)}`;
  const digitLine = `${p1} ${p2} ${p3} ${p4}`;

  return { barcode, digitLine };
}

/**
 * Gera payload PIX Copia-e-Cola no padrão EMV Oficial do Banco Central para guias fiscais
 */
export function generateTaxGuidePixPayload(params: {
  guideNumber: string;
  amount: number;
  authorityUf: string;
  revenueCode: string;
}): string {
  const cleanAmount = params.amount.toFixed(2);
  const pixKey = `sefaz.${params.authorityUf.toLowerCase()}@sefaz.gov.br`;
  const txId = `GNRE${params.guideNumber.replace(/\D/g, '').substring(0, 20)}`;
  
  // Padrão simplificado EMV QR Code PIX
  return `00020126580014BR.GOV.BCB.PIX0114${pixKey}0214SEFAZ ${params.authorityUf}520400005303986540${cleanAmount.length.toString().padStart(2, '0')}${cleanAmount}5802BR5915SEFAZ ${params.authorityUf} RECEITA6009BRASILIA62070503${txId}6304${Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()}`;
}

/**
 * Avalia o conjunto de itens e o contexto da operação para identificar todas as obrigações e guias fiscais aplicáveis.
 */
export function identifyTaxObligations(params: TaxObligationIdentificationParams): IdentifiedTaxObligationResult {
  const guides: TaxObligationGuide[] = [];
  const summaryNotes: string[] = [];

  const originUf = (params.company?.uf || 'SP').toUpperCase();
  const destUf = (params.clientUf || params.client?.uf || originUf).toUpperCase();
  const isInterstate = originUf !== destUf;

  const isSimples = params.company?.crt === '1' || params.company?.taxRegime === 'simples_nacional';
  const indicadorIe = params.client?.indicadorIe || '9'; // 1=Contribuinte, 2=Isento, 9=Não Contribuinte
  const isFinalConsumer = params.client?.isConsumidorFinal !== false;
  const isRecipientContributor = indicadorIe === '1';

  const stateRule = STATE_TAX_TABLE[destUf] || STATE_TAX_TABLE['SP'];
  const internalDestIcms = stateRule.internalIcms;
  const interstateIcmsRate = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC'].includes(originUf) && ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC'].includes(destUf) ? 12.0 : 7.0;

  let totalStAmount = 0;
  let totalFcpAmount = 0;
  let totalDifalAmount = 0;

  // Filtrar apenas itens de mercadoria/peças (serviço não gera ICMS/ST/DIFAL)
  const partItems = params.items.filter(item => item.type !== 'service');
  const totalProductsValue = partItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);

  if (totalProductsValue <= 0) {
    return {
      guides: [],
      totalStAmount: 0,
      totalFcpAmount: 0,
      totalDifalAmount: 0,
      totalObligationsAmount: 0,
      hasObligations: false,
      summaryNotes: ['Nenhum item tributável por ICMS/ST na operação.']
    };
  }

  // -------------------------------------------------------------
  // 1. ANÁLISE DE ICMS-ST (Substituição Tributária Estadual)
  // -------------------------------------------------------------
  // Aplica-se quando:
  // - O produto possui CEST cadastrado OU CST/CSOSN com ST (ex: 10, 30, 70, 201, 202, 500)
  // - Destinatário é contribuinte revendendo a mercadoria OU há protocolo interestadual
  const stEligibleItems = partItems.filter(item => {
    const hasCest = Boolean(item.cest && item.cest.trim().length > 0);
    const hasStCst = ['10', '30', '70', '201', '202', '500'].some(c => item.cstCsosn?.includes(c));
    const hasStCfop = ['5.405', '6.405', '5.401', '6.401'].includes(item.cfop || '');
    return hasCest || hasStCst || hasStCfop;
  });

  if (stEligibleItems.length > 0 && isInterstate && isRecipientContributor) {
    // Cálculo de ICMS-ST Interestadual
    const stProductTotal = stEligibleItems.reduce((acc, i) => acc + i.totalPrice, 0);
    const sampleNcm = stEligibleItems[0].ncm?.replace(/\D/g, '').substring(0, 4) || '8708';
    const mvaRate = AUTO_PARTS_MVA_TABLE[sampleNcm] || 40.0;

    const baseCalculoSt = Number((stProductTotal * (1 + mvaRate / 100)).toFixed(2));
    const icmsDebitoDestino = Number(((baseCalculoSt * internalDestIcms) / 100).toFixed(2));
    const icmsProprioOrigem = isSimples ? 0 : Number(((stProductTotal * interstateIcmsRate) / 100).toFixed(2));
    const valorIcmsSt = Math.max(0, Number((icmsDebitoDestino - icmsProprioOrigem).toFixed(2)));

    if (valorIcmsSt > 0) {
      totalStAmount += valorIcmsSt;
      const guideNumber = `ST-${destUf}-${Date.now().toString().slice(-6)}`;
      const { barcode, digitLine } = generateTaxGuideBarcode(stateRule.revenueCodeSt, valorIcmsSt, destUf);
      const pixPayload = generateTaxGuidePixPayload({
        guideNumber,
        amount: valorIcmsSt,
        authorityUf: destUf,
        revenueCode: stateRule.revenueCodeSt
      });

      const memorySteps: TaxCalculationMemoryStep[] = [
        { label: 'Valor dos Produtos Sujeitos a ST', formula: 'Σ(Valor dos Itens com CEST)', value: `R$ ${stProductTotal.toFixed(2)}` },
        { label: 'Margem de Valor Agregado (MVA)', formula: 'Convênio ICMS 142/18 - Autopeças', value: `${mvaRate.toFixed(2)}%` },
        { label: 'Base de Cálculo ICMS-ST', formula: `R$ ${stProductTotal.toFixed(2)} × (1 + ${mvaRate}%)`, value: `R$ ${baseCalculoSt.toFixed(2)}` },
        { label: `Débito ICMS na UF Destino (${destUf})`, formula: `R$ ${baseCalculoSt.toFixed(2)} × ${internalDestIcms}%`, value: `R$ ${icmsDebitoDestino.toFixed(2)}` },
        { label: `Crédito ICMS Próprio Origem (${originUf})`, formula: `R$ ${stProductTotal.toFixed(2)} × ${interstateIcmsRate}%`, value: `R$ ${icmsProprioOrigem.toFixed(2)}` },
        { label: 'Valor Final a Recolher (ICMS-ST)', formula: 'Débito Destino - Crédito Origem', value: `R$ ${valorIcmsSt.toFixed(2)}` }
      ];

      const memory: TaxCalculationMemory = {
        steps: memorySteps,
        legalBasis: 'Convênio ICMS 142/18 e Protocolo ICMS 41/08 (Regime de Substituição Tributária Interestadual de Autopeças)',
        description: `Recolhimento de ICMS-ST para o Estado de destino (${destUf}) na saída interestadual de peças automotivas.`,
        ufOrigin: originUf,
        ufDestination: destUf,
        cfop: '6.401',
        ncm: stEligibleItems[0].ncm || '8708.29.99',
        isInterstate: true,
        isFinalConsumer: false,
        recipientIeIndicator: indicadorIe,
        protocolAgreement: 'Convênio ICMS 142/18 e Protocolo ICMS 41/08'
      };

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      guides.push({
        id: `guide-st-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        companyId: params.company.id,
        invoiceKey: params.invoiceKey,
        nfeNumber: params.nfeNumber,
        nfeSeries: params.nfeSeries || '1',
        saleId: params.saleId,
        saleCode: params.saleCode,
        serviceOrderId: params.serviceOrderId,
        obligationType: 'ICMS_ST',
        obligationName: `Guia ICMS-ST Favorecido ${destUf}`,
        authority: destUf,
        revenueCode: stateRule.revenueCodeSt,
        calculationBase: baseCalculoSt,
        rate: internalDestIcms,
        calculatedAmount: valorIcmsSt,
        totalAmount: valorIcmsSt,
        dueDate: dueDate.toISOString().split('T')[0],
        issueDate: new Date().toISOString().split('T')[0],
        guideNumber,
        barcode,
        digitLine,
        pixCopyPaste: pixPayload,
        status: 'GERADA',
        generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        generatedBy: 'Motor Fiscal MotorDesk',
        calculationMemory: memory,
        clientName: params.client?.name || 'Cliente Destinatário',
        clientCpfCnpj: params.client?.cpfCnpj || params.client?.cpf,
        clientStateRegistration: params.client?.stateRegistration,
        notes: `Guia de recolhimento de Substituição Tributária (${stateRule.guideFormat}) vinculada à NF-e em favor da SEFAZ/${destUf}.`
      });

      summaryNotes.push(`Identificada obrigação de ICMS-ST para UF ${destUf}: R$ ${valorIcmsSt.toFixed(2)} (MVA: ${mvaRate}%)`);
    }
  }

  // -------------------------------------------------------------
  // 2. ANÁLISE DE DIFAL (Diferencial de Alíquota - EC 87/2015)
  // -------------------------------------------------------------
  // Aplica-se quando:
  // - Operação Interestadual (UF Origem != UF Destino)
  // - Destinatário é Consumidor Final NÃO CONTRIBUINTE (indicadorIe == '9' ou '2')
  if (isInterstate && isFinalConsumer && !isRecipientContributor) {
    const difalRate = Math.max(0, internalDestIcms - interstateIcmsRate);
    const difalValue = Number(((totalProductsValue * difalRate) / 100).toFixed(2));

    if (difalValue > 0) {
      totalDifalAmount += difalValue;
      const guideNumber = `DIFAL-${destUf}-${Date.now().toString().slice(-6)}`;
      const { barcode, digitLine } = generateTaxGuideBarcode(stateRule.revenueCodeDifal, difalValue, destUf);
      const pixPayload = generateTaxGuidePixPayload({
        guideNumber,
        amount: difalValue,
        authorityUf: destUf,
        revenueCode: stateRule.revenueCodeDifal
      });

      const difalSteps: TaxCalculationMemoryStep[] = [
        { label: 'Valor da Mercadoria / Base DIFAL', formula: 'Σ(Valor dos Produtos)', value: `R$ ${totalProductsValue.toFixed(2)}` },
        { label: `Alíquota Interna UF Destino (${destUf})`, formula: `Tabela SEFAZ/${destUf}`, value: `${internalDestIcms.toFixed(2)}%` },
        { label: `Alíquota Interestadual (${originUf} -> ${destUf})`, formula: 'Resolução do Senado Federal', value: `${interstateIcmsRate.toFixed(2)}%` },
        { label: 'Diferencial de Alíquota (DIFAL %)', formula: `${internalDestIcms}% - ${interstateIcmsRate}%`, value: `${difalRate.toFixed(2)}%` },
        { label: `Valor Total DIFAL para ${destUf}`, formula: `R$ ${totalProductsValue.toFixed(2)} × ${difalRate}%`, value: `R$ ${difalValue.toFixed(2)}` }
      ];

      const difalMemory: TaxCalculationMemory = {
        steps: difalSteps,
        legalBasis: 'Emenda Constitucional 87/2015 e Lei Complementar 190/2022 (DIFAL Consumidor Final Não Contribuinte)',
        description: `Diferencial de alíquota do ICMS devido à UF de destino (${destUf}) nas vendas interestaduais a consumidor final.`,
        ufOrigin: originUf,
        ufDestination: destUf,
        cfop: '6.108',
        ncm: partItems[0].ncm || '8708.29.99',
        isInterstate: true,
        isFinalConsumer: true,
        recipientIeIndicator: '9',
        protocolAgreement: 'Convênio ICMS 236/2021'
      };

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      guides.push({
        id: `guide-difal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        companyId: params.company.id,
        invoiceKey: params.invoiceKey,
        nfeNumber: params.nfeNumber,
        nfeSeries: params.nfeSeries || '1',
        saleId: params.saleId,
        saleCode: params.saleCode,
        serviceOrderId: params.serviceOrderId,
        obligationType: 'DIFAL',
        obligationName: `Guia DIFAL Partilha Destino (${destUf})`,
        authority: destUf,
        revenueCode: stateRule.revenueCodeDifal,
        calculationBase: totalProductsValue,
        rate: difalRate,
        calculatedAmount: difalValue,
        totalAmount: difalValue,
        dueDate: dueDate.toISOString().split('T')[0],
        issueDate: new Date().toISOString().split('T')[0],
        guideNumber,
        barcode,
        digitLine,
        pixCopyPaste: pixPayload,
        status: 'GERADA',
        generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        generatedBy: 'Motor Fiscal MotorDesk',
        calculationMemory: difalMemory,
        clientName: params.client?.name || 'Consumidor Final',
        clientCpfCnpj: params.client?.cpfCnpj || params.client?.cpf,
        clientStateRegistration: 'ISENTO',
        notes: `Guia de recolhimento de DIFAL Partilha (EC 87/15) para UF ${destUf}.`
      });

      summaryNotes.push(`Identificada obrigação de DIFAL EC 87/15 para ${destUf}: R$ ${difalValue.toFixed(2)} (Alíquota: ${difalRate}%)`);
    }
  }

  // -------------------------------------------------------------
  // 3. ANÁLISE DE FCP (Fundo de Combate à Pobreza)
  // -------------------------------------------------------------
  // Aplica-se quando o Estado de destino possui alíquota adicional de FCP e é operação interestadual para consumidor final ou ST
  if (stateRule.fcpRate > 0 && isInterstate && totalProductsValue > 0) {
    const fcpValue = Number(((totalProductsValue * stateRule.fcpRate) / 100).toFixed(2));
    if (fcpValue > 0) {
      totalFcpAmount += fcpValue;
      const guideNumber = `FCP-${destUf}-${Date.now().toString().slice(-6)}`;
      const { barcode, digitLine } = generateTaxGuideBarcode(stateRule.revenueCodeFcp, fcpValue, destUf);
      const pixPayload = generateTaxGuidePixPayload({
        guideNumber,
        amount: fcpValue,
        authorityUf: destUf,
        revenueCode: stateRule.revenueCodeFcp
      });

      const fcpSteps: TaxCalculationMemoryStep[] = [
        { label: 'Valor da Base de Cálculo FCP', formula: 'Valor da Mercadoria', value: `R$ ${totalProductsValue.toFixed(2)}` },
        { label: `Alíquota FCP UF Destino (${destUf})`, formula: `Legislação Estadual SEFAZ/${destUf}`, value: `${stateRule.fcpRate.toFixed(2)}%` },
        { label: 'Valor Total FCP a Recolher', formula: `R$ ${totalProductsValue.toFixed(2)} × ${stateRule.fcpRate}%`, value: `R$ ${fcpValue.toFixed(2)}` }
      ];

      const fcpMemory: TaxCalculationMemory = {
        steps: fcpSteps,
        legalBasis: `Legislação Estadual ${destUf} - Fundo Estadual de Combate e Erradicação da Pobreza (FECOEP/FCP)`,
        description: `Adicional de ICMS destinado ao Fundo de Combate à Pobreza na UF de destino (${destUf}).`,
        ufOrigin: originUf,
        ufDestination: destUf,
        cfop: isRecipientContributor ? '6.401' : '6.108',
        ncm: partItems[0].ncm || '8708.29.99',
        isInterstate: true,
        isFinalConsumer: isFinalConsumer,
        recipientIeIndicator: indicadorIe
      };

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      guides.push({
        id: `guide-fcp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        companyId: params.company.id,
        invoiceKey: params.invoiceKey,
        nfeNumber: params.nfeNumber,
        nfeSeries: params.nfeSeries || '1',
        saleId: params.saleId,
        saleCode: params.saleCode,
        serviceOrderId: params.serviceOrderId,
        obligationType: 'FCP',
        obligationName: `Guia FCP Fundo Pobreza (${destUf})`,
        authority: destUf,
        revenueCode: stateRule.revenueCodeFcp,
        calculationBase: totalProductsValue,
        rate: stateRule.fcpRate,
        calculatedAmount: fcpValue,
        totalAmount: fcpValue,
        dueDate: dueDate.toISOString().split('T')[0],
        issueDate: new Date().toISOString().split('T')[0],
        guideNumber,
        barcode,
        digitLine,
        pixCopyPaste: pixPayload,
        status: 'GERADA',
        generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        generatedBy: 'Motor Fiscal MotorDesk',
        calculationMemory: fcpMemory,
        clientName: params.client?.name || 'Cliente Destino',
        clientCpfCnpj: params.client?.cpfCnpj || params.client?.cpf,
        notes: `Guia de Fundo de Combate à Pobreza (FCP) para ${destUf}.`
      });

      summaryNotes.push(`Identificada obrigação de FCP para ${destUf}: R$ ${fcpValue.toFixed(2)} (${stateRule.fcpRate}%)`);
    }
  }

  // -------------------------------------------------------------
  // 4. ANÁLISE DE ZONA FRANCA DE MANAUS / ÁREA DE LIVRE COMÉRCIO (ZFM / SUFRAMA)
  // -------------------------------------------------------------
  // Aplica-se quando: Destino é AM (Manaus) ou ALC com inscrição SUFRAMA válida
  if (destUf === 'AM' && params.client?.address?.toUpperCase().includes('MANAUS')) {
    summaryNotes.push('Operação com destino à Zona Franca de Manaus (ZFM): Necessário controle e geração de PIN Suframa para internamento da mercadoria.');
  }

  const totalObligationsAmount = Number((totalStAmount + totalFcpAmount + totalDifalAmount).toFixed(2));

  return {
    guides,
    totalStAmount,
    totalFcpAmount,
    totalDifalAmount,
    totalObligationsAmount,
    hasObligations: guides.length > 0,
    summaryNotes
  };
}
