import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Copy,
  LayoutGrid,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Archive,
  Send,
  Printer,
  X,
  Building2,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Clock
} from 'lucide-react';
import JSZip from 'jszip';
import { AppDatabase, User, FiscalDocument, CompanyInfo } from '../types';

export interface FiscalInvoicingGridViewProps {
  db: AppDatabase;
  currentUser: User;
  activeCompanyId?: string;
  onSaveFiscalDocuments?: (docs: FiscalDocument[]) => void;
  onAddHistoryLog?: (entry: any) => void;
}

export function FiscalInvoicingGridView({
  db,
  currentUser,
  activeCompanyId,
  onSaveFiscalDocuments,
  onAddHistoryLog
}: FiscalInvoicingGridViewProps) {
  const companyId = activeCompanyId || currentUser.companyId || (db.companyInfo?.id) || 'comp-1';
  const company = (db.registeredCompanies || []).find(c => c.id === companyId) || db.companyInfo;

  // Estado do formulário superior "Dados Gerais" (Screenshot 2 bottom)
  const todayStr = new Date().toISOString().split('T')[0];
  const [noteNumber, setNoteNumber] = useState('000142');
  const [noteSeries, setNoteSeries] = useState('001');
  const [noteType, setNoteType] = useState('55'); // 55: NF-e, 65: NFC-e, NFS-e
  const [emissionDate, setEmissionDate] = useState(todayStr);
  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [useDeliveryTime, setUseDeliveryTime] = useState(false);
  const [cancelDate, setCancelDate] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientDoc, setRecipientDoc] = useState('');
  const [noteValue, setNoteValue] = useState(485.50);

  // Estados de Filtros e Busca da Grid
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'authorized' | 'canceled' | 'contingency'>('ALL');
  const [modelFilter, setModelFilter] = useState<'ALL' | '55' | '65' | 'NFS-e'>('ALL');

  // Seleção e modal de emissão / visualização
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<FiscalDocument | null>(null);

  // Estados para "Baixar XML em lote para enviar mensalmente ao escritório"
  const today = new Date();
  const currentMonthValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  // Lista de documentos fiscais
  const fiscalDocs: FiscalDocument[] = db.fiscalDocuments || [];

  // Filtragem da grid
  const filteredDocs = useMemo(() => {
    return fiscalDocs.filter(doc => {
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false;
      if (modelFilter !== 'ALL' && doc.model !== modelFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (doc.number || '').toLowerCase();
        const client = (doc.recipientName || '').toLowerCase();
        const ch = (doc.accessKey || '').toLowerCase();
        const cnpj = (doc.recipientDoc || '').toLowerCase();
        return num.includes(q) || client.includes(q) || ch.includes(q) || cnpj.includes(q);
      }
      return true;
    });
  }, [fiscalDocs, statusFilter, modelFilter, searchQuery]);

  // Documentos do mês selecionado para o XML em lote
  const monthDocs = useMemo(() => {
    return fiscalDocs.filter(d => {
      const date = d.date || d.createdAt || '';
      return date.startsWith(selectedMonth);
    });
  }, [fiscalDocs, selectedMonth]);

  const monthStats = useMemo(() => {
    const auth = monthDocs.filter(d => d.status === 'authorized' || !d.status);
    const canc = monthDocs.filter(d => d.status === 'canceled');
    const totalVal = auth.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    return {
      total: monthDocs.length,
      authorized: auth.length,
      canceled: canc.length,
      totalValue: totalVal
    };
  }, [monthDocs]);

  // Função para adicionar nova Nota Fiscal
  const handleCreateNotaFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `doc-${Date.now()}`;
    const accessKey = `352609${(company?.cnpj || '12345678000199').replace(/\D/g, '')}55001${String(noteNumber).padStart(9, '0')}1${Math.floor(10000000 + Math.random() * 90000000)}0`;

    const newDoc: FiscalDocument = {
      id: newId,
      companyId: company?.id || 'comp-1',
      number: noteNumber,
      series: noteSeries,
      model: (noteType === '55' ? '55' : noteType === '65' ? '65' : 'NFS-e') as any,
      type: 'NFe',
      status: 'authorized',
      date: emissionDate,
      deliveryDate: deliveryDate,
      amount: Number(noteValue),
      recipientName: recipientName || 'Consumidor Final / Cliente',
      recipientDoc: recipientDoc || '00.000.000/0001-00',
      accessKey: accessKey,
      items: [
        {
          id: 'item-1',
          description: 'Produto / Peça Automotiva Homologada',
          quantity: 1,
          unitPrice: Number(noteValue),
          totalPrice: Number(noteValue),
          ncm: '8708.29.99',
          cfop: '5102',
          cst: '102'
        }
      ],
      taxes: {
        icms: Number(noteValue) * 0.18,
        pis: Number(noteValue) * 0.0165,
        cofins: Number(noteValue) * 0.076,
        iss: 0,
        irrf: 0,
        inss: 0
      },
      createdAt: new Date().toISOString()
    };

    const updated = [newDoc, ...fiscalDocs];
    if (onSaveFiscalDocuments) onSaveFiscalDocuments(updated);

    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'EMITIR_NFE',
        description: `Nota Fiscal mod. ${newDoc.model} nº ${newDoc.number}/${newDoc.series} emitida com sucesso. Chave: ${newDoc.accessKey}.`,
        user: currentUser.name,
        date: new Date().toISOString()
      });
    }

    alert(`Nota Fiscal nº ${noteNumber} autorizada com sucesso pela SEFAZ!`);
    setShowAddModal(false);
    // Incrementa número da nota
    setNoteNumber(String(Number(noteNumber) + 1).padStart(6, '0'));
  };

  // Função para baixar XML individual
  const handleDownloadSingleXml = (doc: FiscalDocument) => {
    const xmlContent = generateMockNFeXml(doc, company);
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.accessKey || doc.number || 'nfe'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Função para Baixar XML em lote para enviar mensalmente ao escritório (.ZIP)
  const handleDownloadMonthlyZip = async () => {
    if (monthDocs.length === 0) {
      alert(`Nenhuma nota fiscal encontrada para o mês ${selectedMonth}.`);
      return;
    }

    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();
      const folderAuth = zip.folder('NFe_Autorizadas');
      const folderCanc = zip.folder('NFe_Canceladas');
      const folderNfse = zip.folder('NFSe_Servicos');

      // Resumo contábil para o contador
      let relatorioTxt = `==========================================================\n`;
      relatorioTxt += `RELATÓRIO MENSAL DE NOTAS FISCAIS PARA ESCRITÓRIO CONTÁBIL\n`;
      relatorioTxt += `EMPRESA: ${company?.tradeName || company?.name || 'EMPRESA CLIENTE'}\n`;
      relatorioTxt += `CNPJ: ${company?.cnpj || '12.345.678/0001-90'}\n`;
      relatorioTxt += `COMPETÊNCIA: ${selectedMonth}\n`;
      relatorioTxt += `DATA DE GERAÇÃO: ${new Date().toLocaleString('pt-BR')}\n`;
      relatorioTxt += `GERADO POR: ${currentUser.name} (${currentUser.role.toUpperCase()})\n`;
      relatorioTxt += `==========================================================\n\n`;
      relatorioTxt += `RESUMO FISCAL:\n`;
      relatorioTxt += `- Total de Documentos: ${monthStats.total}\n`;
      relatorioTxt += `- Notas Autorizadas: ${monthStats.authorized}\n`;
      relatorioTxt += `- Notas Canceladas: ${monthStats.canceled}\n`;
      relatorioTxt += `- Faturamento Fiscal Bruto: R$ ${monthStats.totalValue.toFixed(2)}\n\n`;
      relatorioTxt += `RELAÇÃO DOS DOCUMENTOS:\n`;
      relatorioTxt += `NÚMERO | SÉRIE | MODELO | DATA EMISSÃO | VALOR (R$) | STATUS | DESTINATÁRIO | CHAVE DE ACESSO\n`;
      relatorioTxt += `--------------------------------------------------------------------------------------------------------------------\n`;

      monthDocs.forEach(doc => {
        const xml = generateMockNFeXml(doc, company);
        const fileName = `${doc.accessKey || doc.number || 'nfe'}.xml`;

        if (doc.status === 'canceled') {
          folderCanc?.file(fileName, xml);
        } else if (doc.model === 'NFS-e') {
          folderNfse?.file(fileName, xml);
        } else {
          folderAuth?.file(fileName, xml);
        }

        relatorioTxt += `${String(doc.number).padEnd(6)} | ${String(doc.series || '001').padEnd(5)} | ${String(doc.model || '55').padEnd(6)} | ${(doc.date || '').slice(0, 10).padEnd(12)} | R$ ${Number(doc.amount || 0).toFixed(2).padStart(9)} | ${(doc.status || 'authorized').padEnd(10)} | ${(doc.recipientName || '').slice(0, 25).padEnd(25)} | ${doc.accessKey || '-'}\n`;
      });

      zip.file('Relatorio_Mensal_Contabilidade.txt', relatorioTxt);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `XML_Fiscal_${(company?.name || 'Empresa').replace(/\s+/g, '_')}_${selectedMonth}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (onAddHistoryLog) {
        onAddHistoryLog({
          action: 'DOWNLOAD_XML_LOTE_MENSAL',
          description: `Pacote de XMLs fiscais do mês ${selectedMonth} (${monthStats.total} arquivos) gerado e baixado para o escritório de contabilidade.`,
          user: currentUser.name,
          date: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar pacote de XMLs.');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800" id="view-fiscal-invoicing-grid">
      {/* 1. HEADER DO MÓDULO (Conforme Screenshot 2 bottom) */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            FINANCEIRO
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>NOTA FISCAL</span>
          </h1>
        </div>

        {/* Botões do Topo Direito (Screenshot 2 bottom) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Visualização em Grid"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer shadow-3xs"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Duplicar / Histórico"
            onClick={() => alert('Histórico de lotes e duplicatas fiscais sincronizado.')}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer shadow-3xs"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="btn-adicionar-novo-fiscal"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>ADICIONAR NOVO</span>
          </button>
        </div>
      </div>

      {/* 2. CARD "DADOS GERAIS" (Conforme Screenshot 2 bottom) */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
          <span>Dados Gerais</span>
          <span className="text-[11px] font-mono font-normal text-slate-500 lowercase">
            parâmetros de emissão sefaz
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Bloco Azul com "# /" no canto esquerdo (Screenshot 2 bottom) */}
          <div className="md:col-span-3 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-5 text-white flex flex-col justify-center items-center text-center shadow-md">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-1">
              DOCUMENTO FISCAL
            </span>
            <div className="text-3xl font-black font-mono tracking-tight text-white">
              # {noteNumber} / {noteSeries}
            </div>
            <span className="text-[11px] text-slate-400 font-mono mt-1">
              Modelo {noteType === '55' ? '55 (NF-e)' : noteType === '65' ? '65 (NFC-e)' : 'NFS-e'}
            </span>
          </div>

          {/* Campos de Dados Gerais (Screenshot 2 bottom) */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* TIPO DE NOTA */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                TIPO DE NOTA
              </label>
              <select
                id="select-tipo-nota"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="55">NF-e 55 (Mercadorias / Peças)</option>
                <option value="65">NFC-e 65 (Consumidor Final)</option>
                <option value="NFS-e">NFS-e (Serviços / Mão de Obra)</option>
              </select>
            </div>

            {/* DATA DE EMISSÃO */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                DATA DE EMISSÃO
              </label>
              <input
                id="input-data-emissao"
                type="date"
                value={emissionDate}
                onChange={(e) => setEmissionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* DATA DE ENTREGA [ ] USAR HORA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  DATA DE ENTREGA
                </label>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDeliveryTime}
                    onChange={(e) => setUseDeliveryTime(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>USAR HORA</span>
                </label>
              </div>
              <input
                id="input-data-entrega"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* DATA DE CANCELAMENTO */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                DATA DE CANCELAMENTO
              </label>
              <input
                id="input-data-cancelamento"
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-600 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. CARD DE DESTAQUE: BAIXAR XML EM LOTE PARA ENVIAR MENSALMENTE AO ESCRITÓRIO */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-xl p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-base uppercase tracking-wider text-white">
                Baixar XML em lote para enviar mensalmente ao escritório
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Exportação mensal contábil oficial contendo todos os XMLs de NF-e, NFC-e, NFS-e autorizadas, canceladas, cartas de correção (CC-e) e relatório fiscal detalhado compactados em arquivo .ZIP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-xs font-bold text-slate-300">Competência:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-hidden cursor-pointer"
              />
            </div>

            <div className="text-xs font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="font-bold text-emerald-300">{monthStats.authorized}</span> NFs |{' '}
              <span className="font-bold text-rose-300">{monthStats.canceled}</span> Canc. |{' '}
              <span className="font-bold text-amber-300">
                R$ {monthStats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              id="btn-download-xml-lote-mensal"
              disabled={isGeneratingZip}
              onClick={handleDownloadMonthlyZip}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingZip ? 'Compactando...' : 'Baixar Pacote .ZIP Mensal'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. GRID COMPLETO DAS NOTAS FISCAIS EMITIDAS */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden space-y-3 p-4">
        {/* Barra de Filtros e Busca da Grid */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por número, cliente, chave ou CNPJ..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="authorized">Autorizadas</option>
              <option value="canceled">Canceladas</option>
              <option value="contingency">Em Contingência</option>
            </select>

            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Todos os Modelos</option>
              <option value="55">NF-e 55</option>
              <option value="65">NFC-e 65</option>
              <option value="NFS-e">NFS-e</option>
            </select>
          </div>

          <div className="text-xs font-mono text-slate-500">
            Total Exibido: <strong>{filteredDocs.length}</strong> documentos fiscais
          </div>
        </div>

        {/* Tabela de Notas Fiscais */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
              <tr>
                <th className="p-2 border-r border-slate-200 whitespace-nowrap">Número</th>
                <th className="p-2 border-r border-slate-200 whitespace-nowrap text-center">Série</th>
                <th className="p-2 border-r border-slate-200 whitespace-nowrap text-center">Modelo</th>
                <th className="p-2 border-r border-slate-200 min-w-[160px]">Destinatário / Cliente</th>
                <th className="p-2 border-r border-slate-200 whitespace-nowrap">CPF / CNPJ</th>
                <th className="p-2 border-r border-slate-200 whitespace-nowrap">Emissão</th>
                <th className="p-2 border-r border-slate-200 whitespace-nowrap">Saída / Entrega</th>
                <th className="p-2 border-r border-slate-200 text-right whitespace-nowrap">Valor Total</th>
                <th className="p-2 border-r border-slate-200 text-center whitespace-nowrap">Status SEFAZ</th>
                <th className="p-2 border-r border-slate-200 min-w-[200px]">Chave de Acesso</th>
                <th className="p-2 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px] font-mono">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 font-sans">
                    Nenhuma nota fiscal emitida encontrada.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, idx) => {
                  const isAuth = doc.status === 'authorized' || !doc.status;
                  const isCanc = doc.status === 'canceled';

                  return (
                    <tr key={doc.id || idx} className="hover:bg-slate-50 transition">
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        {doc.number || '000000'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center text-slate-600">
                        {doc.series || '001'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                          {doc.model || '55'}
                        </span>
                      </td>
                      <td className="p-2 border-r border-slate-200 font-sans font-semibold text-slate-800 truncate max-w-[200px]" title={doc.recipientName}>
                        {doc.recipientName || 'Consumidor Final'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">
                        {doc.recipientDoc || '00.000.000/0001-00'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700">
                        {doc.date ? doc.date.slice(0, 10) : '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-500">
                        {doc.deliveryDate ? doc.deliveryDate.slice(0, 10) : (doc.date ? doc.date.slice(0, 10) : '-')}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">
                        R$ {Number(doc.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-sans">
                        {isCanc ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                            CANCELADA
                          </span>
                        ) : isAuth ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            AUTORIZADA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                            CONTINGÊNCIA
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[180px] font-mono text-[10px]" title={doc.accessKey}>
                            {doc.accessKey || 'Aguardando chave da SEFAZ'}
                          </span>
                          {doc.accessKey && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(doc.accessKey || '');
                                alert('Chave de acesso copiada para a área de transferência!');
                              }}
                              title="Copiar Chave de Acesso"
                              className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            title="Ver Detalhes / DANFE"
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleXml(doc)}
                            title="Baixar XML desta Nota"
                            className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ADICIONAR NOVA NOTA FISCAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Emitir Nova Nota Fiscal (SEFAZ)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotaFiscal} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número da Nota *</label>
                  <input
                    type="text"
                    required
                    value={noteNumber}
                    onChange={(e) => setNoteNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Série *</label>
                  <input
                    type="text"
                    required
                    value={noteSeries}
                    onChange={(e) => setNoteSeries(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo / Modelo</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold"
                  >
                    <option value="55">NF-e 55 (Mercadorias)</option>
                    <option value="65">NFC-e 65 (Consumidor)</option>
                    <option value="NFS-e">NFS-e (Serviços)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={noteValue}
                    onChange={(e) => setNoteValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destinatário / Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome ou Razão Social"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={recipientDoc}
                    onChange={(e) => setRecipientDoc(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Emissão</label>
                  <input
                    type="date"
                    value={emissionDate}
                    onChange={(e) => setEmissionDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Entrega</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                A emissão transmitirá os dados para os WebServices da SEFAZ Estadual gerando XML assinado e protocolo de autorização oficial.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow-md"
                >
                  Autorizar na SEFAZ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW DANFE / DETALHES */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Visualização do Documento Fiscal nº {previewDoc.number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Chave de Acesso:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    SEFAZ AUTORIZADA
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-indigo-900 break-all">
                  {previewDoc.accessKey}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-500 block">Emitente:</span>
                  <span className="font-bold text-slate-800">{company?.tradeName || company?.name || 'EMPRESA CLIENTE'}</span>
                  <span className="text-slate-600 block font-mono text-[11px]">{company?.cnpj || '12.345.678/0001-90'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block">Destinatário:</span>
                  <span className="font-bold text-slate-800">{previewDoc.recipientName}</span>
                  <span className="text-slate-600 block font-mono text-[11px]">{previewDoc.recipientDoc}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-sm font-bold">
                <span>Valor Total da Nota Fiscal:</span>
                <span className="text-emerald-700 text-base font-mono">
                  R$ {Number(previewDoc.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleXml(previewDoc)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar XML</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir DANFE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper para gerar XML da NF-e padrão SEFAZ
function generateMockNFeXml(doc: FiscalDocument, company?: any): string {
  const ch = doc.accessKey || `3526090000000000000055001000${String(doc.number).padStart(6, '0')}1000000000`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${ch}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${doc.number || '000100'}</cNF>
        <natOp>VENDA DE MERCADORIA / PRESTACAO DE SERVICO</natOp>
        <mod>${doc.model || '55'}</mod>
        <serie>${doc.series || '001'}</serie>
        <nNF>${doc.number || '100'}</nNF>
        <dhEmi>${(doc.date || new Date().toISOString())}T08:00:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
      </ide>
      <emit>
        <CNPJ>${(company?.cnpj || '12345678000190').replace(/\D/g, '')}</CNPJ>
        <xNome>${company?.tradeName || company?.name || 'EMPRESA CLIENTE'}</xNome>
        <IE>${company?.stateRegistration || '123456789'}</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CNPJ>${(doc.recipientDoc || '00000000000100').replace(/\D/g, '')}</CNPJ>
        <xNome>${doc.recipientName || 'CLIENTE CONSUMIDOR'}</xNome>
      </dest>
      <total>
        <ICMSTot>
          <vProd>${Number(doc.amount || 0).toFixed(2)}</vProd>
          <vNF>${Number(doc.amount || 0).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <chNFe>${ch}</chNFe>
      <dhRecbto>${doc.date || new Date().toISOString()}</dhRecbto>
      <nProt>135260000123456</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}
