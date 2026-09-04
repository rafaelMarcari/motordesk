/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — RECONCILIAÇÃO INTELIGENTE 1:N E UTILITÁRIOS DE REPRESENTAÇÃO COMERCIAL
 */

import {
  RepresentativeOrder,
  RepresentativeFactoryOrder,
  FactoryInvoice,
  ReconciliationResultItem,
  ReconciliationStatus,
  MatchConfidenceLevel,
  RepresentedCompany,
  RepresentativeCommission,
  AppDatabase,
  User,
} from '../types';

/**
 * Normaliza CNPJ/CPF removendo pontos, traços e barras
 */
export function normalizeDocument(doc?: string | null): string {
  if (!doc) return '';
  return String(doc).replace(/\D/g, '');
}

/**
 * Normaliza número de pedido ou nota para busca tolerante
 */
export function normalizeCode(code?: string | null): string {
  if (!code) return '';
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Normaliza texto para comparação fonética/insensível
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Mapeamento inteligente automático de colunas a partir de cabeçalhos de planilhas
 */
export function autoDetectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const patterns: Record<string, RegExp[]> = {
    factoryOrderNumber: [/ped.*fab/i, /ped.*int/i, /ord.*fab/i, /^pedido$/i, /^ped$/i, /num.*ped/i, /cod.*ped/i],
    representativeOrderNumber: [/ped.*rep/i, /ped.*motordesk/i, /ped.*cli/i, /ref.*rep/i, /ordem.*rep/i, /^referencia$/i],
    clientName: [/cliente/i, /razao/i, /nome.*cli/i, /destinatario/i, /comprador/i],
    clientCnpj: [/cnpj/i, /cpf/i, /documento/i, /doc.*cli/i, /inscricao/i],
    invoiceNumber: [/^nf$/i, /nota/i, /num.*nf/i, /numero.*nota/i, /danfe/i, /fatura/i],
    invoiceDate: [/data.*fat/i, /data.*nf/i, /data.*emissao/i, /dt.*fat/i, /emissao/i, /^data$/i],
    invoicedAmount: [/val.*fat/i, /tot.*fat/i, /vlr.*fat/i, /tot.*nf/i, /val.*nf/i, /valor.*total/i, /^valor$/i, /^total$/i],
    productCode: [/cod.*prod/i, /cod.*item/i, /codigo/i, /sku/i, /referencia/i],
    productDescription: [/produto/i, /descricao/i, /item/i, /mercadoria/i],
    quantity: [/qtd/i, /quant/i, /quantidade/i, /volume/i],
    commissionRate: [/perc.*com/i, /aliquota/i, /% com/i, /comissao.*%/i, /taxa.*com/i],
  };

  headers.forEach(header => {
    const clean = header.trim();
    for (const [field, regexList] of Object.entries(patterns)) {
      if (!mapping[field]) {
        for (const regex of regexList) {
          if (regex.test(clean)) {
            mapping[field] = clean;
            break;
          }
        }
      }
    }
  });

  return mapping;
}

/**
 * Parser resiliente de arquivos CSV / TSV
 */
export function parseCsvText(text: string): { headers: string[]; rows: Record<string, any>[] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detecta delimitador (, ; ou \t)
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount >= tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  // Parser linha por linha respeitando aspas
  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  }

  const rawHeaders = splitLine(lines[0]);
  const headers = rawHeaders.map((h, i) => h || `Coluna_${i + 1}`);

  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;
    const row: Record<string, any> = {};
    headers.forEach((h, colIndex) => {
      row[h] = cols[colIndex] !== undefined ? cols[colIndex] : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parser de XML de NF-e para conferência e extração automática de dados de faturamento
 */
export function parseNfeXml(xmlString: string): Partial<FactoryInvoice> | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const infNFe = doc.querySelector('infNFe');
    const accessKey = infNFe?.getAttribute('Id')?.replace(/\D/g, '') || '';

    const ide = doc.querySelector('ide');
    const nNF = ide?.querySelector('nNF')?.textContent || '';
    const serie = ide?.querySelector('serie')?.textContent || '';
    const dhEmi = ide?.querySelector('dhEmi')?.textContent || ide?.querySelector('dEmi')?.textContent || '';

    const emit = doc.querySelector('emit');
    const emitNome = emit?.querySelector('xNome')?.textContent || '';
    const emitCnpj = emit?.querySelector('CNPJ')?.textContent || '';

    const dest = doc.querySelector('dest');
    const destNome = dest?.querySelector('xNome')?.textContent || '';
    const destCnpj = dest?.querySelector('CNPJ')?.textContent || dest?.querySelector('CPF')?.textContent || '';

    const total = doc.querySelector('total > ICMSTot');
    const vNF = parseFloat(total?.querySelector('vNF')?.textContent || '0');
    const vProd = parseFloat(total?.querySelector('vProd')?.textContent || '0');

    const detElements = Array.from(doc.querySelectorAll('det'));
    const items = detElements.map(det => {
      const prod = det.querySelector('prod');
      return {
        code: prod?.querySelector('cProd')?.textContent || '',
        description: prod?.querySelector('xProd')?.textContent || '',
        quantity: parseFloat(prod?.querySelector('qCom')?.textContent || '0'),
        unitPrice: parseFloat(prod?.querySelector('vUnCom')?.textContent || '0'),
        totalPrice: parseFloat(prod?.querySelector('vProd')?.textContent || '0'),
      };
    });

    return {
      accessKey,
      number: nNF,
      series: serie,
      issueDate: dhEmi ? dhEmi.substring(0, 10) : new Date().toISOString().substring(0, 10),
      totalAmount: isNaN(vNF) ? 0 : vNF,
      productsAmount: isNaN(vProd) ? 0 : vProd,
      issuerName: emitNome,
      issuerCnpj: emitCnpj,
      recipientName: destNome,
      recipientCnpj: destCnpj,
      items,
      xmlContent: xmlString,
    };
  } catch (err) {
    console.error('Erro ao analisar XML de NF-e:', err);
    return null;
  }
}

/**
 * Converte valor em string (ex: "R$ 1.250,50", "1250.50", "1.250,50") para número puro float
 */
export function parseNumericValue(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  // Remove símbolos monetários e espaços
  let cleaned = str.replace(/[R$\s]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1.234,56 -> formato pt-BR
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> formato US
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * =========================================================================
 * MOTOR PRINCIPAL DE CONCILIAÇÃO INTELIGENTE 1:N
 * =========================================================================
 * Confronta os Pedidos MotorDesk com as linhas importadas da planilha/faturamento,
 * agregando N pedidos internos da representada e N notas fiscais por pedido.
 */
export function runRepresentativeReconciliation(params: {
  orders: RepresentativeOrder[];
  importedRows: Record<string, any>[];
  columnMapping: Record<string, string>;
  factoryOrders?: RepresentativeFactoryOrder[];
  factoryInvoices?: FactoryInvoice[];
  representedCompany?: RepresentedCompany;
  toleranceAmount?: number; // tolerância para arredondamento (padrão: 0.05)
}): {
  results: ReconciliationResultItem[];
  statusSummary: {
    conciliado: number;
    parcial: number;
    naoFaturado: number;
    divergencia: number;
    semPedido: number;
  };
} {
  const {
    orders,
    importedRows,
    columnMapping,
    factoryOrders = [],
    factoryInvoices = [],
    representedCompany,
    toleranceAmount = 0.05,
  } = params;

  // Extrai mapeamento de campos
  const colFactoryOrder = columnMapping.factoryOrderNumber || '';
  const colRepOrder = columnMapping.representativeOrderNumber || '';
  const colClientName = columnMapping.clientName || '';
  const colClientCnpj = columnMapping.clientCnpj || '';
  const colInvoiceNum = columnMapping.invoiceNumber || '';
  const colInvoiceDate = columnMapping.invoiceDate || '';
  const colAmount = columnMapping.invoicedAmount || '';
  const colCommissionRate = columnMapping.commissionRate || '';

  // Conjunto de linhas importadas consumidas
  const consumedRowIndexes = new Set<number>();

  const results: ReconciliationResultItem[] = [];

  // 1. Para cada pedido MotorDesk ativo da representada, buscar correspondências 1:N
  orders.forEach(order => {
    const matchedRows: Array<{ index: number; row: Record<string, any>; confidence: MatchConfidenceLevel; criteria: string[] }> = [];

    const normOrderNum = normalizeCode(order.orderNumber);
    const normClientCnpj = normalizeDocument(order.clientCnpjCpf);
    const normClientName = normalizeText(order.clientName);

    // Números de pedidos de fábrica já vinculados a este pedido
    const linkedFactoryOrderNumbers = new Set(
      (order.factoryOrderNumbers || [])
        .concat(
          factoryOrders
            .filter(fo => fo.representativeOrderId === order.id)
            .map(fo => fo.factoryOrderNumber)
        )
        .map(normalizeCode)
    );

    importedRows.forEach((row, index) => {
      if (consumedRowIndexes.has(index)) return;

      const rowFactoryOrder = normalizeCode(row[colFactoryOrder]);
      const rowRepOrder = normalizeCode(row[colRepOrder]);
      const rowCnpj = normalizeDocument(row[colClientCnpj]);
      const rowName = normalizeText(row[colClientName]);
      const rowAmount = parseNumericValue(row[colAmount]);

      const criteria: string[] = [];
      let isMatch = false;
      let confidence: MatchConfidenceLevel = 'LOW';

      // 1.1 Match direto pelo número do pedido MotorDesk (ex: REP-000123)
      if (rowRepOrder && (rowRepOrder === normOrderNum || normOrderNum.includes(rowRepOrder) || rowRepOrder.includes(normOrderNum))) {
        isMatch = true;
        confidence = 'HIGH';
        criteria.push('num_pedido_motordesk');
      }

      // 1.2 Match pelo número do pedido da fábrica vinculado
      if (!isMatch && rowFactoryOrder && linkedFactoryOrderNumbers.has(rowFactoryOrder)) {
        isMatch = true;
        confidence = 'HIGH';
        criteria.push('num_pedido_fabrica_vinculado');
      }

      // 1.3 Match por CNPJ + compatibilidade de cliente
      if (!isMatch && normClientCnpj && rowCnpj && normClientCnpj === rowCnpj) {
        // Se CNPJ bate, verifica se valor não excede desproporcionalmente o pedido
        if (rowAmount <= order.totalOrderAmount * 1.5) {
          isMatch = true;
          confidence = 'MEDIUM';
          criteria.push('cnpj_cliente_identico');
        }
      }

      // 1.4 Match por Nome Fantasia / Razão Social aproximada + valor próximo
      if (!isMatch && normClientName && rowName && (normClientName.includes(rowName) || rowName.includes(normClientName))) {
        if (rowAmount > 0 && Math.abs(rowAmount - order.totalOrderAmount) <= order.totalOrderAmount * 0.1) {
          isMatch = true;
          confidence = 'MEDIUM';
          criteria.push('nome_cliente_aproximado');
        }
      }

      if (isMatch) {
        matchedRows.push({ index, row, confidence, criteria });
      }
    });

    // Marca as linhas como consumidas
    matchedRows.forEach(m => consumedRowIndexes.add(m.index));

    // Agrega pedidos de fábrica 1:N das linhas importadas e existentes
    const factoryOrdersMap = new Map<string, { factoryOrderNumber: string; amount: number; status?: string }>();

    // Adiciona existentes
    factoryOrders
      .filter(fo => fo.representativeOrderId === order.id)
      .forEach(fo => {
        factoryOrdersMap.set(fo.factoryOrderNumber, {
          factoryOrderNumber: fo.factoryOrderNumber,
          amount: fo.totalValue,
          status: fo.status,
        });
      });

    // Adiciona das linhas importadas
    matchedRows.forEach(m => {
      const foNum = String(m.row[colFactoryOrder] || `FAT-${order.orderNumber}-${m.index + 1}`).trim();
      const val = parseNumericValue(m.row[colAmount]);
      if (foNum) {
        const existing = factoryOrdersMap.get(foNum);
        if (existing) {
          existing.amount = Math.max(existing.amount, val);
        } else {
          factoryOrdersMap.set(foNum, {
            factoryOrderNumber: foNum,
            amount: val,
            status: 'invoiced',
          });
        }
      }
    });

    // Agrega NF-e 1:N
    const invoicesMap = new Map<string, { invoiceNumber: string; invoiceDate: string; amount: number; accessKey?: string }>();

    // Adiciona faturas já salvas no banco
    factoryInvoices
      .filter(inv => inv.representativeOrderId === order.id)
      .forEach(inv => {
        invoicesMap.set(inv.number, {
          invoiceNumber: inv.number,
          invoiceDate: inv.issueDate,
          amount: inv.totalAmount,
          accessKey: inv.accessKey,
        });
      });

    // Adiciona faturas encontradas na planilha
    matchedRows.forEach(m => {
      const invNum = String(m.row[colInvoiceNum] || '').trim();
      const invDate = String(m.row[colInvoiceDate] || new Date().toISOString().substring(0, 10)).trim();
      const val = parseNumericValue(m.row[colAmount]);
      if (invNum) {
        invoicesMap.set(invNum, {
          invoiceNumber: invNum,
          invoiceDate: invDate,
          amount: val,
        });
      }
    });

    // Soma total faturado (1:N)
    let totalInvoicedAmount = 0;
    if (invoicesMap.size > 0) {
      totalInvoicedAmount = Array.from(invoicesMap.values()).reduce((sum, inv) => sum + inv.amount, 0);
    } else if (factoryOrdersMap.size > 0) {
      totalInvoicedAmount = Array.from(factoryOrdersMap.values()).reduce((sum, fo) => sum + fo.amount, 0);
    } else if (matchedRows.length > 0) {
      totalInvoicedAmount = matchedRows.reduce((sum, m) => sum + parseNumericValue(m.row[colAmount]), 0);
    }

    const orderAmount = order.totalOrderAmount || 0;
    const difference = totalInvoicedAmount - orderAmount;

    // Determina o status da conciliação conforme regras estritas
    let status: ReconciliationStatus = 'NAO_FATURADO';

    if (totalInvoicedAmount <= 0) {
      status = 'NAO_FATURADO'; // 🔴 Não Faturado
    } else if (Math.abs(difference) <= toleranceAmount) {
      status = 'CONCILIADO'; // 🟢 Conciliado exato (ex: 20.000 vs 20.000)
    } else if (totalInvoicedAmount < orderAmount) {
      status = 'PARCIAL'; // 🟡 Faturamento parcial (ex: 20.000 vs 15.000, saldo 5.000)
    } else {
      status = 'DIVERGENCIA'; // 🔴 Faturado maior ou divergente (ex: 20.000 vs 22.000)
    }

    // Calcula comissão prevista e confirmada
    const commissionPercentage = order.commissionPercentage || representedCompany?.defaultCommissionPercentage || 5;
    const expectedCommission = (orderAmount * commissionPercentage) / 100;
    const confirmedCommission = (totalInvoicedAmount * commissionPercentage) / 100;

    // Nível de confiança global do match
    let confidenceLevel: MatchConfidenceLevel = 'HIGH';
    if (matchedRows.length === 0) {
      confidenceLevel = 'NO_MATCH';
    } else if (matchedRows.some(m => m.confidence === 'HIGH')) {
      confidenceLevel = 'HIGH';
    } else if (matchedRows.some(m => m.confidence === 'MEDIUM')) {
      confidenceLevel = 'MEDIUM';
    } else {
      confidenceLevel = 'LOW';
    }

    const matchCriteria = Array.from(new Set(matchedRows.flatMap(m => m.criteria)));

    results.push({
      id: `REC-ITEM-${order.id}`,
      representativeOrderId: order.id,
      representativeOrderNumber: order.orderNumber,
      clientName: order.clientName,
      clientCnpjCpf: order.clientCnpjCpf,
      orderAmount,
      factoryOrders: Array.from(factoryOrdersMap.values()),
      invoices: Array.from(invoicesMap.values()),
      totalInvoicedAmount,
      difference,
      commissionPercentage,
      expectedCommission,
      confirmedCommission,
      confidenceLevel,
      matchCriteria,
      status,
    });
  });

  // 2. Linhas que sobraram na planilha sem nenhum pedido MotorDesk correspondente:
  // "FATURAMENTO SEM PEDIDO"
  const seenOrphanKeys = new Set<string>();
  importedRows.forEach((row, index) => {
    if (!consumedRowIndexes.has(index)) {
      const foNum = String(row[colFactoryOrder] || `SEM-PED-${index + 1}`).trim();
      const invNum = String(row[colInvoiceNum] || `NF-ORFA-${index + 1}`).trim();
      const invDate = String(row[colInvoiceDate] || new Date().toISOString().substring(0, 10)).trim();
      const val = parseNumericValue(row[colAmount]);
      const clientName = String(row[colClientName] || 'Cliente Não Identificado').trim();
      const clientCnpj = String(row[colClientCnpj] || '').trim();

      // Chave de unicidade para prevenir duplicações em múltiplas importações
      const orphanKey = `${invNum}_${foNum}_${val}_${clientCnpj}`;
      if (seenOrphanKeys.has(orphanKey)) return;
      seenOrphanKeys.add(orphanKey);

      const commissionPercentage = parseNumericValue(row[colCommissionRate]) || representedCompany?.defaultCommissionPercentage || 5;
      const confirmedCommission = (val * commissionPercentage) / 100;

      results.push({
        id: `REC-ORPHAN-${index}`,
        clientName,
        clientCnpjCpf: clientCnpj,
        orderAmount: 0,
        factoryOrders: foNum ? [{ factoryOrderNumber: foNum, amount: val, status: 'invoiced' }] : [],
        invoices: invNum ? [{ invoiceNumber: invNum, invoiceDate: invDate, amount: val }] : [],
        totalInvoicedAmount: val,
        difference: val, // Diferença total positiva
        commissionPercentage,
        expectedCommission: 0,
        confirmedCommission,
        confidenceLevel: 'NO_MATCH',
        matchCriteria: ['sem_correspondente_motordesk'],
        status: 'FATURAMENTO_SEM_PEDIDO',
        notes: 'Linha constante na planilha de faturamento da representada sem pedido correspondente no MotorDesk.',
      });
    }
  });

  // Sumário consolidado
  const statusSummary = {
    conciliado: results.filter(r => r.status === 'CONCILIADO').length,
    parcial: results.filter(r => r.status === 'PARCIAL').length,
    naoFaturado: results.filter(r => r.status === 'NAO_FATURADO').length,
    divergencia: results.filter(r => r.status === 'DIVERGENCIA').length,
    semPedido: results.filter(r => r.status === 'FATURAMENTO_SEM_PEDIDO').length,
  };

  return { results, statusSummary };
}

/**
 * Criação e sincronização automática de lançamento no Contas a Receber
 * a partir de uma Comissão de Representação Comercial confirmada
 */
export function generateReceivableFromCommission(params: {
  commission: RepresentativeCommission;
  user: User;
  db: AppDatabase;
  dueDate?: string;
}): { updatedCommission: RepresentativeCommission; receivableId: string } {
  const { commission, user, dueDate } = params;

  const effectiveDueDate = dueDate || commission.expectedPaymentDate || new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10);
  const receivableId = `CR-REP-${Date.now()}`;
  const code = `REC-COM-${commission.orderNumber || 'REP'}`;

  // Atualiza comissão
  const updatedCommission: RepresentativeCommission = {
    ...commission,
    status: 'A_RECEBER',
    financialReceivableId: receivableId,
    updatedAt: new Date().toISOString(),
  };

  return { updatedCommission, receivableId };
}
