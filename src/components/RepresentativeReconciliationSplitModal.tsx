/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — CONCILIAÇÃO DE PLANILHA DA REPRESENTADA EM TELA DIVIDIDA (SPLIT SCREEN)
 * Comparação inteligente linha a linha entre arquivo da representada (Excel/CSV) e pedidos internos.
 * Identificação por cores:
 *   - Verde: 100% Conciliado (Auto-selecionado)
 *   - Amarelo: Divergência de Valores / Alíquotas
 *   - Vermelho: Não Encontrado no Sistema (Mantido para próxima importação)
 * Saída condicional mediante conclusão com inserção de detalhe/justificativa.
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Download, 
  Save, 
  Clock, 
  ArrowRight, 
  Split, 
  Building2, 
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Square,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppDatabase, PendingReconciliationRow, RepresentedCompany, RepresentativeOrder, AccountPayable } from '../types';
import { normalizeCode, normalizeDocument, autoDetectColumnMapping } from '../utils/representativeUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  currentUser?: any;
  currentCompanyId?: string;
  onSaveDb?: (updatedDb: AppDatabase) => void;
  onSaveFullDatabase?: (updatedDb: AppDatabase) => void;
  onSavePayables?: (newPayables: AccountPayable[], newTransactions: any[]) => void;
  onAddHistoryLog?: (type: string, title: string, description: string, referenceId?: string, customerId?: string) => void;
  onSuccessMessage?: (msg: string) => void;
}

export interface AnalyzedSpreadsheetRow {
  id: string;
  sourceRowNumber: number;
  // Campos da Planilha da Representada
  orderNumber: string;
  invoiceNumber: string;
  clientName: string;
  clientDocument: string;
  billedAmount: number;
  commissionRate: number;
  commissionAmount: number;
  orderDate: string;

  // Classificação da Conciliação
  matchStatus: 'MATCHED' | 'DIVERGENT' | 'NOT_FOUND';
  selected: boolean; // Auto-selecionado se MATCHED
  discrepancyMessage?: string;
  divergenceAmount?: number;

  // Registro Interno Correspondente
  matchedOrder?: {
    id: string;
    code: string;
    clientName: string;
    amount: number;
    commissionExpected: number;
    status: string;
    source: 'rep_order' | 'sale' | 'service_order';
  };

  // Se já veio como pendência de importação anterior
  isCarriedOverFromPrevious?: boolean;
  previousPendingId?: string;
}

export const RepresentativeReconciliationSplitModal: React.FC<Props> = ({
  isOpen,
  onClose,
  db,
  currentUser,
  currentCompanyId = 'comp-1',
  onSaveDb,
  onSaveFullDatabase,
  onSavePayables,
  onAddHistoryLog,
  onSuccessMessage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados locais
  const [selectedRepresentedId, setSelectedRepresentedId] = useState<string>(() => {
    return db.representedCompanies?.[0]?.id || 'rep-1';
  });
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<AnalyzedSpreadsheetRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MATCHED' | 'DIVERGENT' | 'NOT_FOUND'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal de Conclusão com Detalhe
  const [isConclusionModalOpen, setIsConclusionModalOpen] = useState(false);
  const [conclusionDetail, setConclusionDetail] = useState('');
  const [generatePayableCommission, setGeneratePayableCommission] = useState(true);
  const [conclusionError, setConclusionError] = useState('');

  // Empresas representadas disponíveis
  const representedCompanies = useMemo(() => {
    return db.representedCompanies || [
      { id: 'rep-1', name: 'Bosch Automotive Brasil', commissionRateDefault: 5.0 },
      { id: 'rep-2', name: 'Nakata Amortecedores & Suspensão', commissionRateDefault: 4.5 },
      { id: 'rep-3', name: 'Magneti Marelli Cofap', commissionRateDefault: 6.0 }
    ];
  }, [db.representedCompanies]);

  const activeRepresented = representedCompanies.find(r => r.id === selectedRepresentedId) || representedCompanies[0];
  const representedName = (activeRepresented as any)?.name || (activeRepresented as any)?.tradeName || (activeRepresented as any)?.corporateName || 'Representada';
  const defaultCommissionRate = (activeRepresented as any)?.commissionRateDefault || (activeRepresented as any)?.defaultCommissionPercentage || 5.0;

  // Carrega pendências salvas de importações anteriores
  const savedPendingRows = useMemo(() => {
    return (db.pendingReconciliationRows || []).filter(p => 
      p.status === 'PENDING' && 
      (!p.representedCompanyId || p.representedCompanyId === selectedRepresentedId)
    );
  }, [db.pendingReconciliationRows, selectedRepresentedId]);

  // Função interna de cruzamento com banco de dados
  const analyzeRowsAgainstDatabase = (rawList: any[], isFromSaved: boolean = false): AnalyzedSpreadsheetRow[] => {
    const internalRepOrders = db.representativeOrders || [];
    const internalSales = db.sales || [];
    const internalOS = db.serviceOrders || [];

    return rawList.map((item, idx) => {
      const orderNum = String(item.orderNumber || item.pedido || item.numero || '').trim();
      const invoiceNum = String(item.invoiceNumber || item.nf || item.nota || '').trim();
      const clientName = String(item.clientName || item.cliente || item.razao || 'Cliente não informado').trim();
      const clientDoc = normalizeDocument(item.clientDocument || item.cnpj || item.cpf);
      const billed = Number(item.billedAmount || item.valor || item.total || 0);
      const rate = Number(item.commissionRate || item.taxaComissao || activeRepresented?.commissionRateDefault || 5.0);
      const commAmt = Number(item.commissionAmount || item.comissao || (billed * rate) / 100);
      const date = String(item.orderDate || item.data || new Date().toISOString().slice(0, 10));

      const normOrder = normalizeCode(orderNum);
      const normInvoice = normalizeCode(invoiceNum);

      // Busca correspondência nos pedidos de representação
      let matchedOrder: AnalyzedSpreadsheetRow['matchedOrder'] | undefined;

      const foundRep = internalRepOrders.find(ro => {
        const roNum = normalizeCode(ro.orderNumber || ro.code);
        const roFactory = normalizeCode(ro.factoryOrderNumber);
        return (normOrder && (roNum === normOrder || roFactory === normOrder)) ||
               (normInvoice && normalizeCode((ro as any).invoiceNumber) === normInvoice);
      });

      if (foundRep) {
        matchedOrder = {
          id: foundRep.id,
          code: foundRep.orderNumber || foundRep.code || `REP-${foundRep.id.slice(0, 4)}`,
          clientName: foundRep.clientName,
          amount: Number(foundRep.totalAmount || 0),
          commissionExpected: Number(foundRep.commissionAmount || (foundRep.totalAmount * (foundRep.commissionRatePercent || rate) / 100)),
          status: foundRep.status,
          source: 'rep_order'
        };
      } else {
        // Tenta achar em Vendas Balcão
        const foundSale = internalSales.find(s => {
          const sCode = normalizeCode(s.code);
          return (normOrder && sCode.includes(normOrder)) || (normInvoice && normalizeCode(s.nfeNumber) === normInvoice);
        });

        if (foundSale) {
          matchedOrder = {
            id: foundSale.id,
            code: foundSale.code || `PDV-${foundSale.id.slice(0, 4)}`,
            clientName: foundSale.clientName || 'Consumidor Balcão',
            amount: Number(foundSale.totalAmount || 0),
            commissionExpected: (Number(foundSale.totalAmount || 0) * rate) / 100,
            status: foundSale.status,
            source: 'sale'
          };
        }
      }

      // Avalia Status do Cruzamento
      let matchStatus: 'MATCHED' | 'DIVERGENT' | 'NOT_FOUND' = 'NOT_FOUND';
      let discrepancyMessage: string | undefined;
      let divergenceAmount: number | undefined;

      if (matchedOrder) {
        const valDiff = Math.abs(matchedOrder.amount - billed);
        const commDiff = Math.abs(matchedOrder.commissionExpected - commAmt);

        if (valDiff < 0.50 && commDiff < 0.50) {
          matchStatus = 'MATCHED';
        } else {
          matchStatus = 'DIVERGENT';
          divergenceAmount = commDiff > 0.50 ? (commAmt - matchedOrder.commissionExpected) : (billed - matchedOrder.amount);
          discrepancyMessage = commDiff > 0.50 
            ? `Diferença na comissão: R$ ${commDiff.toFixed(2)} (Planilha: R$ ${commAmt.toFixed(2)} vs Sistema: R$ ${matchedOrder.commissionExpected.toFixed(2)})`
            : `Diferença no faturamento bruto: R$ ${valDiff.toFixed(2)}`;
        }
      } else {
        matchStatus = 'NOT_FOUND';
        discrepancyMessage = 'Pedido não localizado no banco de dados do MotorDesk';
      }

      return {
        id: item.id || `rec-row-${Date.now()}-${idx}`,
        sourceRowNumber: item.sourceRowNumber || (idx + 1),
        orderNumber: orderNum,
        invoiceNumber: invoiceNum,
        clientName,
        clientDocument: clientDoc,
        billedAmount: billed,
        commissionRate: rate,
        commissionAmount: commAmt,
        orderDate: date,
        matchStatus,
        selected: matchStatus === 'MATCHED', // Auto-selecionado se 100% conciliado!
        discrepancyMessage,
        divergenceAmount,
        matchedOrder,
        isCarriedOverFromPrevious: isFromSaved,
        previousPendingId: item.previousPendingId || (isFromSaved ? item.id : undefined)
      };
    });
  };

  // Carrega planilha de exemplo/demonstração
  const handleLoadDemoSpreadsheet = () => {
    const demoItems = [
      { sourceRowNumber: 1, orderNumber: 'REP-2026-001', invoiceNumber: '001452', clientName: 'Auto Center Brasil Express Ltda', billedAmount: 3450.00, commissionRate: 5.0, commissionAmount: 172.50, orderDate: '2026-09-02' },
      { sourceRowNumber: 2, orderNumber: 'REP-2026-002', invoiceNumber: '001453', clientName: 'Retífica & Mecânica São Paulo', billedAmount: 1890.00, commissionRate: 5.0, commissionAmount: 94.50, orderDate: '2026-09-03' },
      { sourceRowNumber: 3, orderNumber: 'REP-2026-003', invoiceNumber: '001454', clientName: 'Oficina Padrão de Pneus e Rodas', billedAmount: 5200.00, commissionRate: 4.5, commissionAmount: 234.00, orderDate: '2026-09-05' },
      { sourceRowNumber: 4, orderNumber: 'PED-FAB-9921', invoiceNumber: '001455', clientName: 'Carretas & Frotas do Sul Eireli', billedAmount: 8900.00, commissionRate: 5.0, commissionAmount: 445.00, orderDate: '2026-09-06' },
      { sourceRowNumber: 5, orderNumber: 'REP-2026-999', invoiceNumber: '001456', clientName: 'Distribuidora Nova Aliança Peças', billedAmount: 2400.00, commissionRate: 5.0, commissionAmount: 120.00, orderDate: '2026-09-07' },
      { sourceRowNumber: 6, orderNumber: 'PED-EXT-778', invoiceNumber: '001457', clientName: 'Mecânica Diesel São Cristovão', billedAmount: 4150.00, commissionRate: 5.0, commissionAmount: 207.50, orderDate: '2026-09-08' }
    ];

    // Inclui pendências salvas de rodadas anteriores se houver
    const carried = savedPendingRows.map(sp => ({
      id: sp.id,
      sourceRowNumber: sp.rawRowIndex || 99,
      orderNumber: sp.orderNumber || '',
      invoiceNumber: sp.invoiceNumber || '',
      clientName: sp.clientName || 'Cliente Pendente Anterior',
      billedAmount: sp.billedAmount,
      commissionRate: sp.commissionRatePercent || 5.0,
      commissionAmount: sp.commissionAmount,
      orderDate: sp.orderDate || '',
      isFromSaved: true,
      previousPendingId: sp.id
    }));

    const analyzed = analyzeRowsAgainstDatabase([...demoItems, ...carried]);
    setRows(analyzed);
    setFileName('Relatorio_Faturamento_Bosch_Set2026.xlsx (Demonstração)');
    if (onSuccessMessage) {
      onSuccessMessage(`Planilha de demonstração carregada com ${analyzed.length} linhas analisadas!`);
    }
  };

  // Upload e Parsing do arquivo Excel / CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          alert('O arquivo importado não possui linhas de dados.');
          return;
        }

        // Detecta mapeamento inteligente das colunas
        const headers = Object.keys(jsonRows[0]);
        const mapping = autoDetectColumnMapping(headers);

        const mappedList = jsonRows.map((r, i) => {
          return {
            sourceRowNumber: i + 1,
            orderNumber: r[mapping.factoryOrderNumber] || r[mapping.representativeOrderNumber] || r['Pedido'] || r['PEDIDO'] || r['Ordem'] || '',
            invoiceNumber: r[mapping.invoiceNumber] || r['NF'] || r['Nota'] || r['Fatura'] || '',
            clientName: r[mapping.clientName] || r['Cliente'] || r['Razao'] || r['Destinatario'] || 'Cliente não informado',
            clientDocument: r[mapping.clientCnpj] || r['CNPJ'] || r['CPF'] || '',
            billedAmount: parseFloat(String(r[mapping.invoicedAmount] || r['Valor'] || r['Total'] || 0).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
            commissionRate: parseFloat(String(r[mapping.commissionRate] || r['Comissao%'] || r['%'] || defaultCommissionRate).replace(',', '.')) || 5,
            commissionAmount: 0,
            orderDate: r[mapping.invoiceDate] || r['Data'] || new Date().toISOString().slice(0, 10)
          };
        });

        // Adiciona pendências salvas de rodadas anteriores
        const carried = savedPendingRows.map(sp => ({
          id: sp.id,
          sourceRowNumber: sp.rawRowIndex || 99,
          orderNumber: sp.orderNumber || '',
          invoiceNumber: sp.invoiceNumber || '',
          clientName: sp.clientName || 'Pendente de Importação Anterior',
          billedAmount: sp.billedAmount,
          commissionRate: sp.commissionRatePercent || 5.0,
          commissionAmount: sp.commissionAmount,
          orderDate: sp.orderDate || '',
          isFromSaved: true,
          previousPendingId: sp.id
        }));

        const analyzed = analyzeRowsAgainstDatabase([...mappedList, ...carried]);
        setRows(analyzed);

        if (onSuccessMessage) {
          onSuccessMessage(`Arquivo ${file.name} importado: ${analyzed.length} linhas cruzadas com sucesso!`);
        }
      } catch (err) {
        console.error('Erro ao ler arquivo Excel:', err);
        alert('Não foi possível processar este arquivo. Verifique o formato (.xlsx, .xls ou .csv).');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Toggle de seleção de linha individual
  const toggleRowSelect = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  // Selecionar / Desmarcar todos os visíveis
  const toggleSelectAll = (select: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected: select })));
  };

  // Totais e estatísticas do cruzamento
  const stats = useMemo(() => {
    const total = rows.length;
    const matched = rows.filter(r => r.matchStatus === 'MATCHED');
    const divergent = rows.filter(r => r.matchStatus === 'DIVERGENT');
    const notFound = rows.filter(r => r.matchStatus === 'NOT_FOUND');
    const selected = rows.filter(r => r.selected);

    const totalBilled = rows.reduce((acc, r) => acc + r.billedAmount, 0);
    const totalCommission = rows.reduce((acc, r) => acc + r.commissionAmount, 0);
    const selectedCommission = selected.reduce((acc, r) => acc + r.commissionAmount, 0);

    return {
      total,
      matchedCount: matched.length,
      divergentCount: divergent.length,
      notFoundCount: notFound.length,
      selectedCount: selected.length,
      totalBilled,
      totalCommission,
      selectedCommission
    };
  }, [rows]);

  // Filtros de busca e status
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = !searchTerm || 
        r.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.matchedOrder?.code || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStat = filterStatus === 'ALL' || r.matchStatus === filterStatus;
      return matchSearch && matchStat;
    });
  }, [rows, searchTerm, filterStatus]);

  // Abrir Modal de Conclusão com Detalhe
  const handleOpenConclusion = () => {
    if (rows.length === 0) {
      alert('Importe ou carregue uma planilha antes de concluir a conciliação.');
      return;
    }
    setConclusionError('');
    setIsConclusionModalOpen(true);
  };

  // Executar a Conclusão da Conciliação com Validação Estrita do Detalhe
  const handleConfirmConclusion = () => {
    if (!conclusionDetail.trim() || conclusionDetail.trim().length < 5) {
      setConclusionError('O preenchimento do detalhe/justificativa de conciliação é obrigatório (mínimo 5 caracteres).');
      return;
    }

    const now = new Date().toISOString();
    const selectedRows = rows.filter(r => r.selected);
    const unselectedOrNotFoundRows = rows.filter(r => !r.selected || r.matchStatus === 'NOT_FOUND');

    // 1. Linhas não selecionadas ou não encontradas:
    // "caso não encontre manter os registros para próxima importação e analisar novamente"
    const newPendingList: PendingReconciliationRow[] = unselectedOrNotFoundRows.map((r, i) => ({
      id: r.previousPendingId || `pend-rec-${Date.now()}-${i}`,
      companyId: currentCompanyId,
      representedCompanyId: selectedRepresentedId,
      representedCompanyName: activeRepresented.name,
      sourceFileName: fileName,
      importedAt: now,
      rawRowIndex: r.sourceRowNumber,
      orderNumber: r.orderNumber,
      invoiceNumber: r.invoiceNumber,
      clientName: r.clientName,
      clientDocument: r.clientDocument,
      billedAmount: r.billedAmount,
      commissionRatePercent: r.commissionRate,
      commissionAmount: r.commissionAmount,
      orderDate: r.orderDate,
      matchStatus: r.matchStatus,
      matchedOrderId: r.matchedOrder?.id,
      matchedOrderNumber: r.matchedOrder?.code,
      matchedOrderAmount: r.matchedOrder?.amount,
      discrepancyReason: r.discrepancyMessage,
      divergenceAmount: r.divergenceAmount,
      status: 'PENDING'
    }));

    // Mantém outras pendências de outras representadas que não estavam nesta tela
    const otherRepresentedPending = (db.pendingReconciliationRows || []).filter(p => 
      p.representedCompanyId && p.representedCompanyId !== selectedRepresentedId && p.status === 'PENDING'
    );

    const updatedPending = [...otherRepresentedPending, ...newPendingList];

    // 2. Atualiza status dos pedidos internos conciliados
    const updatedRepOrders = (db.representativeOrders || []).map(ro => {
      const match = selectedRows.find(sr => sr.matchedOrder?.id === ro.id);
      if (match) {
        return {
          ...ro,
          status: 'invoiced' as const,
          factoryOrderNumber: match.orderNumber || ro.factoryOrderNumber,
          factoryOrderNumbers: match.orderNumber ? [match.orderNumber, ...(ro.factoryOrderNumbers || [])] : ro.factoryOrderNumbers,
          notes: `${ro.notes || ''} [Conciliado em ${now.slice(0, 10)}: ${conclusionDetail.trim()}]`
        };
      }
      return ro;
    });

    // 3. Se marcado, gera lançamento no Contas a Pagar / Receber da comissão da Representada
    let updatedPayables = db.accountsPayable || [];
    if (generatePayableCommission && stats.selectedCommission > 0) {
      const newPayable: AccountPayable = {
        id: `cp-comm-${Date.now()}`,
        code: `COM-REP-${now.slice(0, 7).replace('-', '')}-${selectedRepresentedId.slice(-3)}`,
        supplierId: selectedRepresentedId,
        supplierName: `Comissão a Receber/Repassar - ${representedName}`,
        description: `Comissão de Vendas Faturadas (${selectedRows.length} pedidos) - ${conclusionDetail.trim()}`,
        category: 'Salários & Comissões',
        nature: 'expense',
        classification: 'variable',
        periodicity: 'monthly',
        totalAmount: stats.selectedCommission,
        amount: stats.selectedCommission,
        paidAmount: 0,
        remainingAmount: stats.selectedCommission,
        issueDate: now.slice(0, 10),
        dueDate: `${now.slice(0, 7)}-28`,
        status: 'pending',
        installments: [
          {
            id: `inst-${Date.now()}-1`,
            installmentNumber: 1,
            totalInstallments: 1,
            amount: stats.selectedCommission,
            paidAmount: 0,
            dueDate: `${now.slice(0, 7)}-28`,
            status: 'pending',
            paymentMethod: 'Transferência Bancária',
            receiptNotes: `Comissão da representada ${representedName}`
          }
        ],
        companyId: currentCompanyId,
        notes: `Detalhe da Conciliação: ${conclusionDetail.trim()} | Arquivo: ${fileName}`,
        representedCompanyId: selectedRepresentedId,
        createdAt: now,
        updatedAt: now
      };
      updatedPayables = [newPayable, ...updatedPayables];
    }

    // 4. Registra na trilha de auditoria
    const auditEntry: any = {
      id: `hist-rec-${Date.now()}`,
      type: 'financial',
      title: 'Conciliação de Planilha da Representada',
      description: `Conciliação concluída para ${representedName}. ${selectedRows.length} linhas conciliadas (R$ ${stats.selectedCommission.toFixed(2)} comissões). ${newPendingList.length} mantidas pendentes para próxima importação. Detalhe: ${conclusionDetail.trim()}`,
      action: 'CONCILIACAO_PLANILHA_REPRESENTADA',
      userId: currentUser?.id || 'usr-1',
      userName: currentUser?.name || 'Operador Financeiro',
      companyId: currentCompanyId,
      date: now.slice(0, 10),
      timestamp: now,
      orderId: selectedRows[0]?.orderNumber
    };

    const updatedHistory = [auditEntry, ...(db.history || [])];

    const updatedDb: AppDatabase = {
      ...db,
      pendingReconciliationRows: updatedPending,
      representativeOrders: updatedRepOrders,
      accountsPayable: updatedPayables,
      history: updatedHistory
    };

    if (onSaveFullDatabase) {
      onSaveFullDatabase(updatedDb);
    } else if (onSaveDb) {
      onSaveDb(updatedDb);
    }

    if (onSavePayables && updatedPayables.length > 0) {
      onSavePayables(updatedPayables, db.financialTransactions || []);
    }

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'financial',
        'Conciliação da Representada',
        `Conciliado ${selectedRows.length} itens para ${representedName}. Justificativa: ${conclusionDetail.trim()}`
      );
    }

    setIsConclusionModalOpen(false);
    onClose();

    if (onSuccessMessage) {
      onSuccessMessage(`Conciliação concluída com sucesso! ${selectedRows.length} pedidos baixados e ${newPendingList.length} registros salvos para a próxima importação.`);
    }
  };

  // Exportar Relatório de Divergências para Excel/CSV
  const handleExportComparison = () => {
    if (rows.length === 0) return;
    const exportData = rows.map(r => ({
      'Linha': r.sourceRowNumber,
      'Pedido Fábrica': r.orderNumber,
      'NF': r.invoiceNumber,
      'Cliente Planilha': r.clientName,
      'Valor Faturado (R$)': r.billedAmount,
      '% Comissão': r.commissionRate,
      'Comissão Informada (R$)': r.commissionAmount,
      'Status Conciliação': r.matchStatus === 'MATCHED' ? '100% Conciliado' : r.matchStatus === 'DIVERGENT' ? 'Divergência' : 'Não Encontrado',
      'Pedido Interno MotorDesk': r.matchedOrder?.code || 'N/A',
      'Cliente Interno': r.matchedOrder?.clientName || 'N/A',
      'Valor Interno (R$)': r.matchedOrder?.amount || 0,
      'Comissão Esperada (R$)': r.matchedOrder?.commissionExpected || 0,
      'Divergência / Observação': r.discrepancyMessage || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Conciliação');
    XLSX.writeFile(wb, `Conciliacao_${representedName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-7xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho Principal do Modal */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Conciliação de Planilha da Representada
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
                  Tela Dividida (Split Screen)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Importe o arquivo Excel da fábrica, cruze linha a linha com os pedidos internos e salve pendências para a próxima importação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Fechar Conciliação"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Controles: Seletor de Representada, Upload e Demonstração */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor da Representada */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Representada:</label>
              <select
                value={selectedRepresentedId}
                onChange={(e) => {
                  setSelectedRepresentedId(e.target.value);
                  setRows([]);
                  setFileName('');
                }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {representedCompanies.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Comissão Padrão: {r.commissionRateDefault || 5}%)</option>
                ))}
              </select>
            </div>

            {/* Input oculto para carregar arquivo */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
            />

            {/* Botão de Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importar Planilha (.xlsx, .csv)
            </button>

            {/* Botão de Demonstração Rápida */}
            <button
              onClick={handleLoadDemoSpreadsheet}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Carregar Planilha de Exemplo (Demo)
            </button>

            {fileName && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                📄 {fileName}
              </span>
            )}
          </div>

          {/* Ações de Conclusão e Exportação */}
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <button
                onClick={handleExportComparison}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Análise
              </button>
            )}

            <button
              onClick={handleOpenConclusion}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white" />
              Concluir Conciliação com Detalhe
            </button>
          </div>
        </div>

        {/* Barra de Estatísticas e Filtros */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Contadores Visuais por Cor */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'ALL' 
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Todos ({stats.total})
            </button>

            <button
              onClick={() => setFilterStatus('MATCHED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterStatus === 'MATCHED' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              🟢 100% Conciliados ({stats.matchedCount})
            </button>

            <button
              onClick={() => setFilterStatus('DIVERGENT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterStatus === 'DIVERGENT' 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              🟡 Divergentes ({stats.divergentCount})
            </button>

            <button
              onClick={() => setFilterStatus('NOT_FOUND')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterStatus === 'NOT_FOUND' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              🔴 Não Encontrados ({stats.notFoundCount})
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar pedido, NF ou cliente..."
                className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
              />
            </div>

            {/* Atalhos de Seleção */}
            {rows.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <button
                  onClick={() => toggleSelectAll(true)}
                  className="hover:text-emerald-600 font-medium px-1"
                >
                  Marcar Todos
                </button>
                <span>•</span>
                <button
                  onClick={() => toggleSelectAll(false)}
                  className="hover:text-rose-600 font-medium px-1"
                >
                  Desmarcar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ÁREA DE TELA DIVIDIDA (SPLIT SCREEN WORKBENCH) */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4">
          {rows.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Nenhuma planilha importada para conciliação
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6">
                Clique no botão <strong>Importar Planilha</strong> para enviar o arquivo da representada (.xlsx ou .csv) ou use <strong>Carregar Planilha de Exemplo</strong> para testar a conciliação instantânea.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  Importar Arquivo (.xlsx / .csv)
                </button>
                <button
                  onClick={handleLoadDemoSpreadsheet}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Carregar Planilha Demo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Cabeçalho Dividido Fixo (Split Header) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sticky top-0 z-10">
                {/* Título Planilha Esquerda */}
                <div className="bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>PLANILHA A: Arquivo Importado da Representada</span>
                  </div>
                  <span className="text-[11px] font-normal opacity-90">
                    Faturamento & Comissões Informadas
                  </span>
                </div>

                {/* Título Planilha Direita */}
                <div className="bg-sky-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>PLANILHA B: Pedidos Internos no Sistema MotorDesk</span>
                  </div>
                  <span className="text-[11px] font-normal opacity-90">
                    Registros do Sistema Local
                  </span>
                </div>
              </div>

              {/* Linhas Emparelhadas da Tela Dividida */}
              {filteredRows.map((row) => {
                const isMatched = row.matchStatus === 'MATCHED';
                const isDivergent = row.matchStatus === 'DIVERGENT';
                const isNotFound = row.matchStatus === 'NOT_FOUND';

                // Cores de fundo e borda baseadas na regra de negócio
                const rowBgClass = isMatched 
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  : isDivergent 
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                  : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100';

                return (
                  <div 
                    key={row.id} 
                    className={`rounded-xl border p-3 transition-all ${rowBgClass} shadow-sm`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      
                      {/* LADO ESQUERDO: PLANILHA DA REPRESENTADA */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleRowSelect(row.id)}
                          className="mt-0.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                          title={row.selected ? "Desmarcar linha" : "Marcar linha para conciliação"}
                        >
                          {row.selected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-black/30 text-[10px] font-mono border border-current/20">
                                #{row.sourceRowNumber}
                              </span>
                              Pedido: {row.orderNumber || 'S/N'}
                              {row.invoiceNumber && (
                                <span className="text-[11px] font-normal opacity-80">
                                  (NF: {row.invoiceNumber})
                                </span>
                              )}
                            </span>

                            <div className="text-right">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                R$ {row.billedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                                Comis ({row.commissionRate}%): R$ {row.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs truncate font-medium">
                            {row.clientName}
                          </div>

                          {row.isCarriedOverFromPrevious && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">
                              <Clock className="w-3 h-3" />
                              Mantido de Importação Anterior
                            </div>
                          )}
                        </div>
                      </div>

                      {/* LADO DIREITO: PEDIDO INTERNO MOTOR DESK */}
                      <div className="border-t lg:border-t-0 lg:border-l border-current/20 pt-2 lg:pt-0 lg:pl-4 flex items-start justify-between gap-3">
                        {row.matchedOrder ? (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-xs flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 text-[10px] font-mono">
                                  MOTOR DESK
                                </span>
                                {row.matchedOrder.code}
                              </span>

                              <div className="text-right">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  R$ {row.matchedOrder.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold">
                                  Comis Esperada: R$ {row.matchedOrder.commissionExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs truncate font-medium">
                              {row.matchedOrder.clientName}
                            </div>

                            {/* Alerta de Divergência se houver */}
                            {isDivergent && row.discrepancyMessage && (
                              <div className="mt-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                {row.discrepancyMessage}
                              </div>
                            )}

                            {isMatched && (
                              <div className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                Pedido 100% Compatível e Conciliado
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 py-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              Não Encontrado nos Pedidos Internos
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              Este registro da planilha não possui correspondência automática no sistema. Será mantido para a próxima importação caso não associado manualmente.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com Resumo de Seleção e Ação de Concluir */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Linhas Selecionadas: </span>
              <span className="font-bold text-slate-900 dark:text-white">{stats.selectedCount} de {stats.total}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Comissão Selecionada para Baixa: </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                R$ {stats.selectedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleOpenConclusion}
              disabled={rows.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Concluir Conciliação com Detalhe
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE CONCLUSÃO COM INSERÇÃO OBRIGATÓRIA DE DETALHE */}
      {isConclusionModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Concluir Conciliação da Representada
                </h3>
                <p className="text-xs text-slate-500">
                  {representedName}
                </p>
              </div>
            </div>

            {/* Resumo dos registros selecionados vs pendentes */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Linhas Conciliadas / Selecionadas:</span>
                <span className="font-bold text-emerald-600">{stats.selectedCount} pedidos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total de Comissão a Efetivar:</span>
                <span className="font-bold text-emerald-600">R$ {stats.selectedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Registros mantidos para próxima importação:</span>
                <span className="font-bold text-amber-600">{stats.total - stats.selectedCount} pedidos</span>
              </div>
            </div>

            {/* Campo Obrigatório: Detalhe / Justificativa de Fechamento */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Detalhe / Justificativa da Conciliação <span className="text-rose-500">* (Obrigatório)</span>:
              </label>
              <textarea
                value={conclusionDetail}
                onChange={(e) => {
                  setConclusionDetail(e.target.value);
                  setConclusionError('');
                }}
                rows={3}
                placeholder="Ex: Conciliação quinzenal de Setembro/2026. Lote conferido conforme extrato bancário com abatimento de R$ 45 de devolução autorizado pela gerência."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {conclusionError && (
                <p className="mt-1 text-xs text-rose-500 font-semibold">{conclusionError}</p>
              )}
            </div>

            {/* Opção para Gerar Conta a Pagar / Receber da Comissão */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generatePayableCommission}
                  onChange={(e) => setGeneratePayableCommission(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Lançar título no <strong>Contas a Pagar / Financeiro</strong> para controle de comissão
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsConclusionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Voltar à Análise
              </button>
              <button
                onClick={handleConfirmConclusion}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors"
              >
                Confirmar Conclusão & Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
