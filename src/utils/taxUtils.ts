/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - MOTOR DE REGRAS FISCAIS & TABELAS TRIBUTÁRIAS OFICIAIS
 */

import { Part, Service, Client, CompanyInfo, TaxOperationNature, TaxRule, FiscalDocumentItem } from '../types';

// ==========================================
// 1. TABELAS OFICIAIS DA LEGISLAÇÃO BRASILEIRA
// ==========================================

export interface NcmOption {
  code: string;
  description: string;
  defaultCest?: string;
  unit: string;
}

export const OFFICIAL_NCMS: NcmOption[] = [
  { code: '8708.29.99', description: 'Partes e acessórios de carroçarias para veículos automóveis', defaultCest: '10.001.00', unit: 'UN' },
  { code: '8708.30.90', description: 'Freios e suas partes (pastilhas, discos, tambores, cilindros)', defaultCest: '10.002.00', unit: 'JG' },
  { code: '8708.80.00', description: 'Sistemas de suspensão e suas partes (amortecedores, molas, pivôs)', defaultCest: '10.003.00', unit: 'UN' },
  { code: '2710.19.32', description: 'Óleos lubrificantes para motores de combustão interna', defaultCest: '06.001.00', unit: 'L' },
  { code: '8421.23.00', description: 'Filtros de óleo mineral para motores de ignição por faísca ou compressão', defaultCest: '10.004.00', unit: 'UN' },
  { code: '8421.31.00', description: 'Filtros de ar de admissão para motores de combustão interna', defaultCest: '10.005.00', unit: 'UN' },
  { code: '8421.29.90', description: 'Filtros de combustível para motores a diesel ou gasolina', defaultCest: '10.006.00', unit: 'UN' },
  { code: '8511.10.00', description: 'Velas de ignição para motores de combustão interna', defaultCest: '10.007.00', unit: 'JG' },
  { code: '4011.10.00', description: 'Pneumáticos novos de borracha dos tipos utilizados em automóveis de passageiros', defaultCest: '16.001.00', unit: 'UN' },
  { code: '8507.10.10', description: 'Acumuladores elétricos de chumbo do tipo utilizado para arranque dos motores a pistão', defaultCest: '10.008.00', unit: 'UN' },
  { code: '8483.50.00', description: 'Volantes e polias, incluídas as polias para acoplamento por correia', defaultCest: '10.009.00', unit: 'UN' },
  { code: '8708.93.00', description: 'Embreagens e suas partes para veículos automotores', defaultCest: '10.010.00', unit: 'KIT' },
  { code: '8512.20.11', description: 'Faróis e lanternas para veículos automotores', defaultCest: '10.011.00', unit: 'UN' },
  { code: '8409.91.90', description: 'Partes reconhecíveis como destinadas a motores a pistão de ignição por faísca', defaultCest: '10.012.00', unit: 'UN' }
];

export interface CestOption {
  code: string;
  description: string;
  segment: string;
}

export const OFFICIAL_CESTS: CestOption[] = [
  { code: '10.001.00', description: 'Acessórios e partes de veículos automotores', segment: 'Autopeças ST' },
  { code: '10.002.00', description: 'Guarnições de freio montadas, discos e tambores de freio', segment: 'Autopeças ST' },
  { code: '10.003.00', description: 'Amortecedores de suspensão e molas helicoidais', segment: 'Autopeças ST' },
  { code: '06.001.00', description: 'Óleos lubrificantes em recipientes de até 20 litros', segment: 'Combustíveis e Lubrificantes ST' },
  { code: '10.004.00', description: 'Filtros de óleo, ar e combustível para veículos', segment: 'Autopeças ST' },
  { code: '16.001.00', description: 'Pneumáticos, câmaras de ar e protetores de borracha', segment: 'Pneumáticos ST' },
  { code: '10.008.00', description: 'Baterias elétricas de chumbo-ácido', segment: 'Autopeças ST' }
];

export interface CfopOption {
  code: string;
  description: string;
  scope: 'estadual' | 'interestadual';
  type: 'entrada' | 'saida';
  category: string;
}

export const OFFICIAL_CFOPS: CfopOption[] = [
  { code: '5.102', description: 'Venda de mercadoria adquirida ou recebida de terceiros (Dentro do Estado)', scope: 'estadual', type: 'saida', category: 'Vendas' },
  { code: '6.102', description: 'Venda de mercadoria adquirida de terceiros (Fora do Estado)', scope: 'interestadual', type: 'saida', category: 'Vendas' },
  { code: '5.405', description: 'Venda de mercadoria com Substituição Tributária (ST) retida anteriormente', scope: 'estadual', type: 'saida', category: 'Vendas ST' },
  { code: '6.405', description: 'Venda de mercadoria sujeita a ST destinada a não contribuinte fora do Estado', scope: 'interestadual', type: 'saida', category: 'Vendas ST' },
  { code: '5.933', description: 'Prestação de serviço tributado pelo ISSQN (Oficina Mecânica)', scope: 'estadual', type: 'saida', category: 'Serviços' },
  { code: '6.933', description: 'Prestação de serviço fora do município/estado tributado pelo ISSQN', scope: 'interestadual', type: 'saida', category: 'Serviços' },
  { code: '5.915', description: 'Remessa de mercadoria ou bem para conserto ou reparo', scope: 'estadual', type: 'saida', category: 'Remessas' },
  { code: '6.915', description: 'Remessa para conserto ou reparo fora do Estado', scope: 'interestadual', type: 'saida', category: 'Remessas' },
  { code: '5.916', description: 'Retorno de mercadoria recebida para conserto ou reparo', scope: 'estadual', type: 'saida', category: 'Remessas' },
  { code: '5.202', description: 'Devolução de compra para comercialização', scope: 'estadual', type: 'saida', category: 'Devoluções' },
  { code: '6.202', description: 'Devolução de compra para comercialização fora do Estado', scope: 'interestadual', type: 'saida', category: 'Devoluções' },
  { code: '5.152', description: 'Transferência de mercadoria adquirida de terceiros entre filiais', scope: 'estadual', type: 'saida', category: 'Transferências' },
  { code: '6.152', description: 'Transferência entre filiais fora do Estado', scope: 'interestadual', type: 'saida', category: 'Transferências' },
  { code: '1.102', description: 'Compra para comercialização (Entrada de fornecedor interno)', scope: 'estadual', type: 'entrada', category: 'Compras' },
  { code: '2.102', description: 'Compra para comercialização (Entrada de fornecedor externo)', scope: 'interestadual', type: 'entrada', category: 'Compras' }
];

export interface CstCsosnOption {
  code: string;
  description: string;
  regime: 'simples' | 'normal' | 'ambos';
}

export const OFFICIAL_CST_CSOSN: CstCsosnOption[] = [
  // Simples Nacional (CSOSN)
  { code: '101', description: 'CSOSN 101 - Tributada pelo Simples Nacional com permissão de crédito', regime: 'simples' },
  { code: '102', description: 'CSOSN 102 - Tributada pelo Simples Nacional sem permissão de crédito', regime: 'simples' },
  { code: '103', description: 'CSOSN 103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta', regime: 'simples' },
  { code: '201', description: 'CSOSN 201 - Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por ST', regime: 'simples' },
  { code: '202', description: 'CSOSN 202 - Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por ST', regime: 'simples' },
  { code: '400', description: 'CSOSN 400 - Não tributada pelo Simples Nacional', regime: 'simples' },
  { code: '500', description: 'CSOSN 500 - ICMS cobrado anteriormente por substituição tributária (ST) ou por antecipação', regime: 'simples' },
  { code: '900', description: 'CSOSN 900 - Outros (Simples Nacional)', regime: 'simples' },
  
  // Lucro Presumido / Real (CST ICMS)
  { code: '00', description: 'CST 00 - Tributada integralmente', regime: 'normal' },
  { code: '10', description: 'CST 10 - Tributada e com cobrança do ICMS por substituição tributária', regime: 'normal' },
  { code: '20', description: 'CST 20 - Com redução de base de cálculo', regime: 'normal' },
  { code: '40', description: 'CST 40 - Isenta', regime: 'normal' },
  { code: '41', description: 'CST 41 - Não tributada', regime: 'normal' },
  { code: '60', description: 'CST 60 - ICMS cobrado anteriormente por substituição tributária', regime: 'normal' },
  { code: '90', description: 'CST 90 - Outros', regime: 'normal' }
];

export interface PisCofinsCstOption {
  code: string;
  description: string;
}

export const OFFICIAL_PIS_COFINS_CST: PisCofinsCstOption[] = [
  { code: '01', description: '01 - Operação Tributável com Alíquota Básica' },
  { code: '02', description: '02 - Operação Tributável com Alíquota Diferenciada' },
  { code: '04', description: '04 - Operação Tributável Monofásica - Revenda a Alíquota Zero' },
  { code: '06', description: '06 - Operação Tributável a Alíquota Zero' },
  { code: '07', description: '07 - Operação Isenta da Contribuição' },
  { code: '08', description: '08 - Operação Sem Incidência da Contribuição' },
  { code: '49', description: '49 - Outras Operações de Saída' },
  { code: '99', description: '99 - Outras Operações' }
];

export interface OrigemMercadoriaOption {
  code: string;
  description: string;
}

export const OFFICIAL_ORIGENS: OrigemMercadoriaOption[] = [
  { code: '0', description: '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8' },
  { code: '1', description: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
  { code: '2', description: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
  { code: '3', description: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40%' },
  { code: '4', description: '4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos' },
  { code: '5', description: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%' },
  { code: '6', description: '6 - Estrangeira - Importação direta, sem similar nacional, constante em lista do CAMEX' },
  { code: '7', description: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional' },
  { code: '8', description: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' }
];

export interface IbgeCityOption {
  code: string;
  name: string;
  uf: string;
}

export const OFFICIAL_IBGE_CITIES: IbgeCityOption[] = [
  { code: '3550308', name: 'São Paulo', uf: 'SP' },
  { code: '3509502', name: 'Campinas', uf: 'SP' },
  { code: '3549805', name: 'São José dos Campos', uf: 'SP' },
  { code: '3548906', name: 'São Carlos', uf: 'SP' },
  { code: '3304557', name: 'Rio de Janeiro', uf: 'RJ' },
  { code: '3106200', name: 'Belo Horizonte', uf: 'MG' },
  { code: '4106902', name: 'Curitiba', uf: 'PR' },
  { code: '4314902', name: 'Porto Alegre', uf: 'RS' },
  { code: '5300108', name: 'Brasília', uf: 'DF' },
  { code: '2927408', name: 'Salvador', uf: 'BA' },
  { code: '2304400', name: 'Fortaleza', uf: 'CE' },
  { code: '5208707', name: 'Goiânia', uf: 'GO' }
];

export interface CnaeOption {
  code: string;
  description: string;
}

export const OFFICIAL_CNAES: CnaeOption[] = [
  { code: '4520-0/01', description: 'Serviços de manutenção e reparação mecânica de veículos automotores' },
  { code: '4520-0/02', description: 'Serviços de lanternagem ou funilaria e pintura de veículos automotores' },
  { code: '4520-0/03', description: 'Serviços de manutenção e reparação elétrica de veículos automotores' },
  { code: '4520-0/04', description: 'Serviços de alinhamento e balanceamento de veículos automotores' },
  { code: '4530-7/03', description: 'Comércio a varejo de peças e acessórios novos para veículos automotores' },
  { code: '4530-7/04', description: 'Comércio a varejo de peças e acessórios usados para veículos automotores' }
];

// ==========================================
// 2. MOTOR DE RESOLUÇÃO TRIBUTÁRIA INTELIGENTE
// ==========================================

export interface ResolvedTaxBreakdown {
  cfop: string;
  icmsCstOrCsosn: string;
  icmsRatePercent: number;
  icmsAmount: number;
  pisCst: string;
  pisRatePercent: number;
  pisAmount: number;
  cofinsCst: string;
  cofinsRatePercent: number;
  cofinsAmount: number;
  ipiCst: string;
  ipiRatePercent: number;
  ipiAmount: number;
  fcpRatePercent: number;
  fcpAmount: number;
  difalRatePercent: number;
  difalAmount: number;
  issRatePercent: number;
  issAmount: number;
  
  // Reforma Tributária 2026 (EC 132/2023 - IBS & CBS)
  ibsRatePercent: number;
  ibsAmount: number;
  cbsRatePercent: number;
  cbsAmount: number;
  totalIbsCbsAmount: number;
  cstIbsCbs: string;
  
  totalTaxesAmount: number;
  appliedRuleName?: string;
  taxNotes: string[];
}

/**
 * Motor de Regras Fiscais que combina:
 * - Tipo de item (Peça vs Serviço)
 * - Dados da Empresa (CRT, UF Origem)
 * - Dados do Cliente (UF Destino, Consumidor Final, Indicador IE)
 * - Natureza da Operação escolhida
 * - Matriz de Regras Tributárias cadastradas no ERP
 */
export function resolveItemTributacao(
  item: { name: string; price: number; quantity: number; ncm?: string; itemType?: 'part' | 'service'; partRef?: Part; serviceRef?: Service },
  nature: TaxOperationNature,
  company: CompanyInfo,
  client?: Client,
  taxRules?: TaxRule[]
): ResolvedTaxBreakdown {
  const isInterstate = !!(client?.uf && company?.uf && client.uf.toUpperCase() !== company.uf.toUpperCase());
  const itemTotal = (item.price || 0) * (item.quantity || 1);
  const isService = item.itemType === 'service' || !!item.serviceRef;

  // 1. CFOP Resolution
  let resolvedCfop = isInterstate ? nature.cfopInterstate : nature.cfopInternal;

  // 2. Default Values based on Company CRT
  const isSimples = !company.crt || company.crt === '1';
  let icmsCstOrCsosn = isSimples ? '102' : '00';
  let icmsRate = isSimples ? 0 : 18;
  let pisCst = '01';
  let pisRate = isSimples ? 0 : 1.65;
  let cofinsCst = '01';
  let cofinsRate = isSimples ? 0 : 7.6;
  let ipiCst = '99';
  let ipiRate = 0;
  let fcpRate = 0;
  let difalRate = 0;
  let issRate = 0;
  let ruleName = 'Regra Padrão do Regime Tributário';
  const notes: string[] = [];

  // Check specific Part or Service tax defaults
  if (isService) {
    issRate = item.serviceRef?.issRatePercent ?? 5.0;
    resolvedCfop = isInterstate ? '6.933' : '5.933';
    notes.push(`Serviço Municipal LC 116 (Cód: ${item.serviceRef?.municipalServiceCode || '14.01'}) - ISS ${issRate}%`);
  } else if (item.partRef) {
    if (item.partRef.icmsCstOrCsosn) icmsCstOrCsosn = item.partRef.icmsCstOrCsosn;
    if (item.partRef.icmsRatePercent !== undefined) icmsRate = item.partRef.icmsRatePercent;
    if (item.partRef.pisCst) pisCst = item.partRef.pisCst;
    if (item.partRef.pisRatePercent !== undefined) pisRate = item.partRef.pisRatePercent;
    if (item.partRef.cofinsCst) cofinsCst = item.partRef.cofinsCst;
    if (item.partRef.cofinsRatePercent !== undefined) cofinsRate = item.partRef.cofinsRatePercent;
    if (item.partRef.ipiCst) ipiCst = item.partRef.ipiCst;
    if (item.partRef.ipiRatePercent !== undefined) ipiRate = item.partRef.ipiRatePercent;

    if (item.partRef.cest || icmsCstOrCsosn === '500' || icmsCstOrCsosn === '60') {
      if (nature.code === 'NAT-01') resolvedCfop = isInterstate ? '6.405' : '5.405';
      notes.push(`Substituição Tributária (ST) detectada - CEST: ${item.partRef.cest || '10.001.00'}`);
    }
  }

  // 3. Tax Rules Engine Matrix Evaluation
  if (taxRules && taxRules.length > 0) {
    const matchedRule = taxRules.find(r => {
      if (!r.active) return false;
      const matchUfOrig = r.ufOrigin === '*' || (company.uf && r.ufOrigin.toUpperCase() === company.uf.toUpperCase());
      const matchUfDest = r.ufDestination === '*' || (client?.uf && r.ufDestination.toUpperCase() === client.uf.toUpperCase());
      const matchNcm = !r.ncmCode || r.ncmCode === '*' || (item.ncm && r.ncmCode === item.ncm);
      const matchNature = !r.natureId || r.natureId === nature.id;
      return matchUfOrig && matchUfDest && matchNcm && matchNature;
    });

    if (matchedRule) {
      ruleName = matchedRule.name;
      if (matchedRule.cfop) resolvedCfop = matchedRule.cfop;
      if (matchedRule.icmsCstOrCsosn) icmsCstOrCsosn = matchedRule.icmsCstOrCsosn;
      if (matchedRule.icmsRatePercent !== undefined) icmsRate = matchedRule.icmsRatePercent;
      if (matchedRule.pisCst) pisCst = matchedRule.pisCst;
      if (matchedRule.pisRatePercent !== undefined) pisRate = matchedRule.pisRatePercent;
      if (matchedRule.cofinsCst) cofinsCst = matchedRule.cofinsCst;
      if (matchedRule.cofinsRatePercent !== undefined) cofinsRate = matchedRule.cofinsRatePercent;
      if (matchedRule.ipiCst) ipiCst = matchedRule.ipiCst;
      if (matchedRule.ipiRatePercent !== undefined) ipiRate = matchedRule.ipiRatePercent;
      if (matchedRule.fcpRatePercent) fcpRate = matchedRule.fcpRatePercent;
      if (matchedRule.difalRatePercent) difalRate = matchedRule.difalRatePercent;
      notes.push(`Regra tributária aplicada: "${matchedRule.name}"`);
    }
  }

  // 4. Interstate DIFAL Check
  if (isInterstate && !isService && client?.isConsumidorFinal !== false && client?.indicadorIe === '9') {
    if (!difalRate) difalRate = 6.0; // Ex: DIFAL padrão de alíquota interna 18% - alíquota inter 12% = 6%
    notes.push(`Operação Interestadual para Consumidor Final Não Contribuinte -> Aplicação de DIFAL (${difalRate}%)`);
  }

  // 5. Reforma Tributária 2026 (IBS / CBS - Alíquota Teste 1,0%)
  const ibsRatePercent = 0.1; // 0,1% Alíquota Teste IBS em vigor desde 03/08/2026
  const cbsRatePercent = 0.9; // 0,9% Alíquota Teste CBS em vigor desde 03/08/2026
  const ibsAmount = Number(((itemTotal * ibsRatePercent) / 100).toFixed(2));
  const cbsAmount = Number(((itemTotal * cbsRatePercent) / 100).toFixed(2));
  const totalIbsCbsAmount = Number((ibsAmount + cbsAmount).toFixed(2));
  const cstIbsCbs = '01 - Operação Tributada Integralmente';

  notes.push(`Reforma Tributária (2026): IBS (${ibsRatePercent}%) R$ ${ibsAmount.toFixed(2)} + CBS (${cbsRatePercent}%) R$ ${cbsAmount.toFixed(2)}`);

  // 6. Calculate Taxes Amounts
  const icmsAmount = isService ? 0 : Number(((itemTotal * icmsRate) / 100).toFixed(2));
  const pisAmount = isSimples ? 0 : Number(((itemTotal * pisRate) / 100).toFixed(2));
  const cofinsAmount = isSimples ? 0 : Number(((itemTotal * cofinsRate) / 100).toFixed(2));
  const ipiAmount = isService ? 0 : Number(((itemTotal * ipiRate) / 100).toFixed(2));
  const fcpAmount = Number(((itemTotal * fcpRate) / 100).toFixed(2));
  const difalAmount = Number(((itemTotal * difalRate) / 100).toFixed(2));
  const issAmount = isService ? Number(((itemTotal * issRate) / 100).toFixed(2)) : 0;

  const totalTaxesAmount = Number((icmsAmount + pisAmount + cofinsAmount + ipiAmount + fcpAmount + difalAmount + issAmount + totalIbsCbsAmount).toFixed(2));

  return {
    cfop: resolvedCfop,
    icmsCstOrCsosn,
    icmsRatePercent: icmsRate,
    icmsAmount,
    pisCst,
    pisRatePercent: pisRate,
    pisAmount,
    cofinsCst,
    cofinsRatePercent: cofinsRate,
    cofinsAmount,
    ipiCst,
    ipiRatePercent: ipiRate,
    ipiAmount,
    fcpRatePercent: fcpRate,
    fcpAmount,
    difalRatePercent: difalRate,
    difalAmount,
    issRatePercent: issRate,
    issAmount,
    ibsRatePercent,
    ibsAmount,
    cbsRatePercent,
    cbsAmount,
    totalIbsCbsAmount,
    cstIbsCbs,
    totalTaxesAmount,
    appliedRuleName: ruleName,
    taxNotes: notes
  };
}

// ==========================================
// 3. SEFAZ XML GENERATOR & PARSER HELPERS
// ==========================================

export function parseXmlNFeString(xmlString: string) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    const infNFe = doc.querySelector('infNFe');
    const accessKey = infNFe?.getAttribute('Id')?.replace('NFe', '') || `352608${Math.floor(Math.random() * 1000000000000000000).toString().padStart(38, '0')}`;
    
    const nNF = doc.querySelector('nNF')?.textContent || '1042';
    const serie = doc.querySelector('serie')?.textContent || '1';
    const dhEmi = doc.querySelector('dhEmi')?.textContent || new Date().toISOString();
    
    const emit = doc.querySelector('emit');
    const supplierName = emit?.querySelector('xNome')?.textContent || 'Fornecedor Auto Peças Brasil Ltda';
    const supplierCnpj = emit?.querySelector('CNPJ')?.textContent || '98.765.432/0001-10';
    const supplierIe = emit?.querySelector('IE')?.textContent || '112.334.556.778';

    const dest = doc.querySelector('dest');
    const recipientName = dest?.querySelector('xNome')?.textContent || 'MotorDesk Auto Center';
    const recipientCnpj = dest?.querySelector('CNPJ')?.textContent || '12.345.678/0001-90';

    const vNF = parseFloat(doc.querySelector('vNF')?.textContent || '0');
    const vProd = parseFloat(doc.querySelector('vProd')?.textContent || '0');
    const vICMS = parseFloat(doc.querySelector('vICMS')?.textContent || '0');
    const vIPI = parseFloat(doc.querySelector('vIPI')?.textContent || '0');
    const vPIS = parseFloat(doc.querySelector('vPIS')?.textContent || '0');
    const vCOFINS = parseFloat(doc.querySelector('vCOFINS')?.textContent || '0');

    const detList = Array.from(doc.querySelectorAll('det'));
    const items = detList.map(det => {
      const prod = det.querySelector('prod');
      return {
        cProd: prod?.querySelector('cProd')?.textContent || 'PEC-101',
        xProd: prod?.querySelector('xProd')?.textContent || 'Item Sem Descrição',
        ncm: prod?.querySelector('NCM')?.textContent || '8708.29.99',
        cest: prod?.querySelector('CEST')?.textContent || '10.001.00',
        cfop: prod?.querySelector('CFOP')?.textContent || '5.102',
        uCom: prod?.querySelector('uCom')?.textContent || 'UN',
        qCom: parseFloat(prod?.querySelector('qCom')?.textContent || '1'),
        vUnCom: parseFloat(prod?.querySelector('vUnCom')?.textContent || '0'),
        vProd: parseFloat(prod?.querySelector('vProd')?.textContent || '0')
      };
    });

    return {
      success: true,
      accessKey,
      nfeNumber: nNF,
      series: serie,
      issueDate: dhEmi.split('T')[0],
      supplierName,
      supplierCnpj,
      supplierIe,
      recipientName,
      recipientCnpj,
      totalAmount: vNF || items.reduce((acc, i) => acc + i.vProd, 0),
      totalProductsAmount: vProd || items.reduce((acc, i) => acc + i.vProd, 0),
      icmsAmount: vICMS,
      ipiAmount: vIPI,
      pisAmount: vPIS,
      cofinsAmount: vCOFINS,
      items
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Falha ao processar a estrutura do XML'
    };
  }
}
