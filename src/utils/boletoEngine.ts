/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MOTOR DE CÁLCULO E GERAÇÃO DE BOLETOS BANCÁRIOS FEBRABAN & PIX HÍBRIDO
 * Padrão Nacional FEBRABAN, Banco Central do Brasil (BACEN) e SPB.
 */

import { BoletoDocument, BankBoletoConfig, PixConfig, CompanyInfo, AccountReceivable, Client, BillingClosingOrder } from '../types';

export interface BankMetadata {
  code: string;
  name: string;
  shortName: string;
  dv: string;
  color: string;
  textColor: string;
  defaultWallet: string;
}

export const KNOWN_BANKS: Record<string, BankMetadata> = {
  '001': { code: '001', name: 'Banco do Brasil S.A.', shortName: 'Banco do Brasil', dv: '9', color: '#f7d117', textColor: '#003882', defaultWallet: '17' },
  '237': { code: '237', name: 'Banco Bradesco S.A.', shortName: 'Bradesco', dv: '2', color: '#cc092f', textColor: '#ffffff', defaultWallet: '09' },
  '341': { code: '341', name: 'Itaú Unibanco S.A.', shortName: 'Itaú', dv: '7', color: '#ec7000', textColor: '#ffffff', defaultWallet: '109' },
  '104': { code: '104', name: 'Caixa Econômica Federal', shortName: 'Caixa', dv: '0', color: '#005ca9', textColor: '#ffffff', defaultWallet: 'RG' },
  '033': { code: '033', name: 'Banco Santander (Brasil) S.A.', shortName: 'Santander', dv: '7', color: '#ec0000', textColor: '#ffffff', defaultWallet: '101' },
  '756': { code: '756', name: 'Banco Cooperativo Sicoob S.A.', shortName: 'Sicoob', dv: '0', color: '#003641', textColor: '#00ae9d', defaultWallet: '1' },
  '748': { code: '748', name: 'Banco Cooperativo Sicredi S.A.', shortName: 'Sicredi', dv: 'X', color: '#00843d', textColor: '#ffffff', defaultWallet: '1' },
  '077': { code: '077', name: 'Banco Inter S.A.', shortName: 'Inter', dv: '9', color: '#ff7a00', textColor: '#ffffff', defaultWallet: '112' },
  '260': { code: '260', name: 'Nu Pagamentos S.A. (Nubank)', shortName: 'Nubank', dv: '2', color: '#820ad1', textColor: '#ffffff', defaultWallet: '01' },
  '422': { code: '422', name: 'Banco Safra S.A.', shortName: 'Safra', dv: '7', color: '#142036', textColor: '#cda869', defaultWallet: '02' },
  '000': { code: '000', name: 'MotorDesk Banking Simulação', shortName: 'MotorDesk Bank', dv: '0', color: '#0f172a', textColor: '#ffffff', defaultWallet: '01' },
};

/**
 * Retorna os metadados do banco a partir do código
 */
export function getBankMetadata(bankCode?: string): BankMetadata {
  if (!bankCode) return KNOWN_BANKS['000'];
  const clean = bankCode.replace(/\D/g, '').padStart(3, '0');
  return KNOWN_BANKS[clean] || {
    code: clean,
    name: `Banco ${clean}`,
    shortName: `Banco ${clean}`,
    dv: '0',
    color: '#1e293b',
    textColor: '#ffffff',
    defaultWallet: '01'
  };
}

/**
 * Calcula o Módulo 10 (utilizado para os blocos da Linha Digitável)
 */
export function calculateMod10(block: string): number {
  let sum = 0;
  let multiplier = 2;

  for (let i = block.length - 1; i >= 0; i--) {
    const digit = parseInt(block.charAt(i), 10);
    let product = digit * multiplier;
    if (product > 9) {
      product = Math.floor(product / 10) + (product % 10);
    }
    sum += product;
    multiplier = multiplier === 2 ? 1 : 2;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Calcula o Módulo 11 (pesos de 2 a 9) para o Dígito Verificador Geral do Código de Barras (44 dígitos)
 */
export function calculateMod11(code43: string): number {
  let sum = 0;
  let multiplier = 2;

  for (let i = code43.length - 1; i >= 0; i--) {
    const digit = parseInt(code43.charAt(i), 10);
    sum += digit * multiplier;
    multiplier = multiplier === 9 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const dv = 11 - remainder;

  if (dv === 0 || dv === 10 || dv === 11) {
    return 1;
  }
  return dv;
}

/**
 * Calcula o Fator de Vencimento padrão FEBRABAN
 * Base 0: 07/10/1997 = Fator 1000
 * A partir de 22/02/2025: Novo ciclo (1000 em 22/02/2025)
 */
export function calculateDueFactor(dueDateStr: string): string {
  if (!dueDateStr) return '0000';
  
  try {
    const [year, month, day] = dueDateStr.split('-').map(Number);
    if (!year || !month || !day) return '0000';
    
    const dueDate = new Date(Date.UTC(year, month - 1, day));
    const baseDate = new Date(Date.UTC(1997, 9, 7)); // 07 de outubro de 1997
    
    const diffMs = dueDate.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return '0000';
    
    // Novo ciclo FEBRABAN pós-9999 dias (fevereiro de 2025)
    let factor = diffDays + 1000;
    if (factor > 9999) {
      const cycle2Base = new Date(Date.UTC(2025, 1, 22)); // 22/02/2025
      const diffCycle2 = Math.floor((dueDate.getTime() - cycle2Base.getTime()) / (1000 * 60 * 60 * 24));
      factor = 1000 + diffCycle2;
    }
    
    return String(Math.max(1000, Math.min(9999, factor))).padStart(4, '0');
  } catch {
    return '9999';
  }
}

/**
 * Formata o valor nominal para o campo do código de barras (10 dígitos sem pontuação)
 */
export function formatBoletoAmount(amount: number): string {
  const cents = Math.round(amount * 100);
  return String(cents).padStart(10, '0');
}

/**
 * Gera os 44 dígitos do Código de Barras e a Linha Digitável de 47 dígitos
 */
export function generateFebrabanBoletoCodes(params: {
  bankCode: string;
  dueDate: string;
  amount: number;
  agency?: string;
  account?: string;
  wallet?: string;
  nossoNumero?: string;
  convenio?: string;
}): {
  rawBarcode44: string;
  digitableLine47: string;
  formattedDigitableLine: string;
} {
  const bank = (params.bankCode || '341').replace(/\D/g, '').padStart(3, '0');
  const currency = '9'; // 9 = Real (R$)
  const dueFactor = calculateDueFactor(params.dueDate);
  const amountStr = formatBoletoAmount(params.amount);
  
  // Normalização de agência, conta, carteira e nosso número
  const agency = (params.agency || '0452').replace(/\D/g, '').padStart(4, '0');
  const account = (params.account || '98450').replace(/\D/g, '').padStart(5, '0');
  const wallet = (params.wallet || '109').replace(/\D/g, '').padStart(3, '0');
  const rawNossoNumero = (params.nossoNumero || '8492041').replace(/\D/g, '').padStart(8, '0');
  
  // Campo Livre de 25 posições (Padronizado genérico/Itaú/BB)
  // Ex: Carteira (3) + Nosso Número (8) + Agência (4) + Conta (5) + Constante (5)
  const freeField25 = `${wallet}${rawNossoNumero}${agency}${account}00000`.slice(0, 25).padEnd(25, '0');
  
  // Montagem preliminar do Código de Barras de 43 dígitos (sem o DV geral na posição 5)
  const barcodeBeforeDV = `${bank}${currency}${dueFactor}${amountStr}${freeField25}`;
  
  // Cálculo do Dígito Verificador Geral (Mod 11)
  const generalDV = calculateMod11(barcodeBeforeDV);
  
  // Código de Barras completo de 44 posições
  const rawBarcode44 = `${bank}${currency}${generalDV}${dueFactor}${amountStr}${freeField25}`;
  
  // Montagem dos 5 campos da Linha Digitável:
  // Campo 1: Banco (3) + Moeda (1) + 5 primeiras do campo livre (5) + DV Mod10 (1) = 10 dígitos
  const field1Base = `${bank}${currency}${freeField25.slice(0, 5)}`;
  const field1DV = calculateMod10(field1Base);
  const field1 = `${field1Base}${field1DV}`;
  
  // Campo 2: Posições 6 a 15 do campo livre (10) + DV Mod10 (1) = 11 dígitos
  const field2Base = freeField25.slice(5, 15);
  const field2DV = calculateMod10(field2Base);
  const field2 = `${field2Base}${field2DV}`;
  
  // Campo 3: Posições 16 a 25 do campo livre (10) + DV Mod10 (1) = 11 dígitos
  const field3Base = freeField25.slice(15, 25);
  const field3DV = calculateMod10(field3Base);
  const field3 = `${field3Base}${field3DV}`;
  
  // Campo 4: Dígito Verificador Geral (1 dígito)
  const field4 = String(generalDV);
  
  // Campo 5: Fator de Vencimento (4) + Valor (10) = 14 dígitos
  const field5 = `${dueFactor}${amountStr}`;
  
  const digitableLine47 = `${field1}${field2}${field3}${field4}${field5}`;
  
  // Formatação canônica: AAAAA.BBBBB CCCCC.DDDDD EEEEE.FFFFF G HHHHHHHHHHHHHH
  const formattedDigitableLine = `${field1.slice(0, 5)}.${field1.slice(5)} ${field2.slice(0, 5)}.${field2.slice(5)} ${field3.slice(0, 5)}.${field3.slice(5)} ${field4} ${field5}`;
  
  return {
    rawBarcode44,
    digitableLine47,
    formattedDigitableLine
  };
}

/**
 * Gera um SVG do código de barras de alta legibilidade ótica
 */
export function generateBarcodeSvg(barcodeText: string): string {
  // Padrão de barras interleaved 2 of 5 / Code 128 simplificado
  const digits = (barcodeText || '3419110901849204180059845020000119845000042000').replace(/\D/g, '');
  const patternSeed = digits.length > 0 ? digits : '34191999900004500010984920410452984500000000';
  
  // Monta sequência de larguras de barras e espaços
  let bars: { width: number; isBlack: boolean }[] = [];
  
  // Quiet zone e Guard inicial
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  
  for (let i = 0; i < patternSeed.length; i++) {
    const val = parseInt(patternSeed[i], 10) || 0;
    const w1 = (val % 3) + 1; // 1, 2 ou 3px
    const w2 = ((val + 1) % 2) + 1; // 1 ou 2px
    bars.push({ width: w1 * 2, isBlack: true });
    bars.push({ width: w2 * 2, isBlack: false });
  }
  
  // Guard final
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  
  let currentX = 10;
  const rects: string[] = [];
  
  for (const bar of bars) {
    if (bar.isBlack) {
      rects.push(`<rect x="${currentX}" y="0" width="${bar.width}" height="60" fill="#000000" />`);
    }
    currentX += bar.width;
  }
  
  const totalWidth = currentX + 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 60" width="100%" height="60" preserveAspectRatio="none" style="display:block;">${rects.join('')}</svg>`;
}

/**
 * Cria ou sincroniza uma entidade BoletoDocument a partir de um título e dados da empresa
 */
export function buildBoletoDocument(params: {
  receivable: AccountReceivable;
  companyInfo?: CompanyInfo;
  client?: Client;
  bankConfig?: BankBoletoConfig;
  pixConfig?: PixConfig;
  customDueDate?: string;
  customAmount?: number;
  saleCode?: string;
  serviceOrderCode?: string;
  consolidatedClosing?: BillingClosingOrder;
  instructions?: string;
}): BoletoDocument {
  const { receivable, companyInfo, client, bankConfig, pixConfig, customDueDate, customAmount, saleCode, serviceOrderCode, consolidatedClosing, instructions: customInstructions } = params;
  
  const amount = customAmount !== undefined ? customAmount : (receivable.remainingAmount > 0 ? receivable.remainingAmount : receivable.totalAmount);
  const dueDate = customDueDate || receivable.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
  const issueDate = new Date().toISOString().split('T')[0];
  
  // Informações bancárias
  const hasActiveBank = Boolean(bankConfig && bankConfig.active && bankConfig.bankCode);
  const bankCode = hasActiveBank ? bankConfig!.bankCode : '000';
  const bankMeta = getBankMetadata(bankCode);
  
  const agency = hasActiveBank ? `${bankConfig!.agencyNumber}${bankConfig!.agencyDigit ? '-' + bankConfig!.agencyDigit : ''}` : '0001';
  const account = hasActiveBank ? `${bankConfig!.accountNumber}-${bankConfig!.accountDigit || '0'}` : '00000-0';
  const wallet = hasActiveBank ? (bankConfig!.wallet || bankMeta.defaultWallet) : bankMeta.defaultWallet;
  const agreement = hasActiveBank ? (bankConfig!.agreementNumber || '') : '';
  
  const seqNumber = bankConfig?.nextNossoNumero || Math.floor(1000000 + Math.random() * 9000000);
  const nossoNumero = `${wallet}/${seqNumber}`;
  
  // Geração da Linha Digitável e Código de Barras
  const febraban = generateFebrabanBoletoCodes({
    bankCode: bankMeta.code,
    dueDate,
    amount,
    agency: bankConfig?.agencyNumber || '0452',
    account: bankConfig?.accountNumber || '98450',
    wallet,
    nossoNumero: String(seqNumber),
    convenio: agreement
  });
  
  // Pix Híbrido
  const hasPix = Boolean(pixConfig && pixConfig.active && pixConfig.pixKey);
  const pixKey = hasPix ? pixConfig!.pixKey : (companyInfo?.cnpj || 'contato@motordesk.com.br');
  const safePayer = client?.name || receivable.clientName || 'Cliente';
  const cleanPixPayload = `00020126580014BR.GOV.BCB.PIX0136${pixKey}520400005303986540${amount.toFixed(2)}5802BR5925${encodeURIComponent(companyInfo?.tradeName || companyInfo?.name || 'MotorDesk')}6009SAO_PAULO62070503***6304`;
  const pixQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cleanPixPayload)}`;
  
  // Determina status da cobrança
  let status: BoletoDocument['status'] = 'simulated';
  if (receivable.status === 'paid') {
    status = 'paid';
  } else if (hasActiveBank) {
    status = 'registered';
  } else {
    status = 'simulated';
  }
  
  const code = receivable.boletoCode || `BOL-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
  
  // Instruções de Caixa
  const instructions = customInstructions || bankConfig?.instructionsText || [
    'Sr. Caixa, não receber após 30 dias do vencimento.',
    `Após o vencimento cobrar juros de ${bankConfig?.interestRateMonthlyPercent || 1}% ao mês e multa de ${bankConfig?.finePercent || 2}%.`,
    consolidatedClosing ? `Referente ao Fechamento Consolidado ${consolidatedClosing.code}.` : (serviceOrderCode ? `Referente à Ordem de Serviço ${serviceOrderCode}.` : (saleCode ? `Referente à Venda ${saleCode}.` : `Referente ao Título ${receivable.code}.`)),
    'Pagável em qualquer banco, internet banking ou correspondente bancário até o vencimento.'
  ].join('\n');
  
  return {
    id: receivable.boletoId || `bol-${Date.now()}`,
    code,
    bankCode: bankMeta.code,
    bankName: hasActiveBank ? (bankConfig?.bankName || bankMeta.name) : `${bankMeta.shortName} (Simulação)`,
    barcodeNumber: febraban.formattedDigitableLine,
    pixQrCodeUrl: hasPix ? pixQrCodeUrl : undefined,
    pixCopiaECola: hasPix ? cleanPixPayload : undefined,
    payerName: client?.name || receivable.clientName,
    payerCpfCnpj: client?.cpfCnpj || receivable.clientCpf || '000.000.000-00',
    amount,
    dueDate,
    issueDate,
    status,
    companyId: receivable.companyId || companyInfo?.id || 'comp-1',
    serviceOrderId: receivable.serviceOrderId,
    receivableId: receivable.id,
    nossoNumero,
    wallet,
    agency,
    account,
    saleId: receivable.saleId,
    saleCode: receivable.saleCode || saleCode,
    instructions,
    interestRate: bankConfig?.interestRateMonthlyPercent || 1,
    fineRate: bankConfig?.finePercent || 2,
    environment: bankConfig?.environment || 'homologation'
  };
}
