/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — MODAL DE IMPORTAÇÃO DE PLANILHA E MAPEAMENTO DE COLUNAS
 */

import React, { useState, useRef } from 'react';
import {
  RepresentedCompany,
  RepresentedCompanyColumnLayout,
  FactoryBillingImport,
  AppDatabase,
  User,
} from '../../types';
import {
  parseCsvText,
  autoDetectColumnMapping,
  parseNfeXml,
} from '../../utils/representativeUtils';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Save,
  ArrowRight,
  Eye,
  FileText,
} from 'lucide-react';

interface RepresentativeImportModalProps {
  representedCompanies: RepresentedCompany[];
  selectedRepresentedId?: string;
  user: User;
  db: AppDatabase;
  onClose: () => void;
  onImportComplete: (importRecord: FactoryBillingImport, rawData: Record<string, any>[], columnMapping: Record<string, string>) => void;
}

export const RepresentativeImportModal: React.FC<RepresentativeImportModalProps> = ({
  representedCompanies,
  selectedRepresentedId,
  user,
  db,
  onClose,
  onImportComplete,
}) => {
  const [representedId, setRepresentedId] = useState<string>(
    selectedRepresentedId || (representedCompanies[0]?.id || '')
  );
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'csv' | 'xlsx' | 'xml'>('csv');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [saveLayout, setSaveLayout] = useState<boolean>(true);
  const [layoutName, setLayoutName] = useState<string>('Padrão da Fábrica');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega layout salvo da representada se existir
  React.useEffect(() => {
    if (representedId && db.representedCompanyLayouts) {
      const saved = db.representedCompanyLayouts.find(l => l.representedCompanyId === representedId);
      if (saved && saved.columnMapping) {
        setColumnMapping(saved.columnMapping as any);
        if (saved.layoutName) setLayoutName(saved.layoutName);
      }
    }
  }, [representedId, db.representedCompanyLayouts]);

  const handleProcessTextContent = (content: string, name: string) => {
    setErrorMsg('');
    try {
      if (name.toLowerCase().endsWith('.xml') || content.trim().startsWith('<?xml') || content.trim().startsWith('<nfeProc')) {
        // XML de NF-e
        const parsedNfe = parseNfeXml(content);
        if (!parsedNfe) {
          setErrorMsg('Não foi possível ler os dados da NF-e no XML.');
          return;
        }
        setFileType('xml');
        setFileName(name);
        const headersList = ['Numero_NF', 'Chave_NFe', 'Data_Emissao', 'Valor_Total', 'Cliente_Nome', 'Cliente_CNPJ'];
        const rowData = [{
          Numero_NF: parsedNfe.number,
          Chave_NFe: parsedNfe.accessKey,
          Data_Emissao: parsedNfe.issueDate,
          Valor_Total: parsedNfe.totalAmount,
          Cliente_Nome: parsedNfe.recipientName,
          Cliente_CNPJ: parsedNfe.recipientCnpj,
        }];
        setHeaders(headersList);
        setRows(rowData);
        setColumnMapping({
          invoiceNumber: 'Numero_NF',
          invoiceDate: 'Data_Emissao',
          invoicedAmount: 'Valor_Total',
          clientName: 'Cliente_Nome',
          clientCnpj: 'Cliente_CNPJ',
        });
        return;
      }

      // CSV / TSV / Linhas coladas
      const { headers: parsedHeaders, rows: parsedRows } = parseCsvText(content);
      if (parsedHeaders.length === 0 || parsedRows.length === 0) {
        setErrorMsg('Arquivo vazio ou formato não reconhecido.');
        return;
      }

      setFileType('csv');
      setFileName(name);
      setHeaders(parsedHeaders);
      setRows(parsedRows);

      // Auto-detecção de mapeamento
      const autoMap = autoDetectColumnMapping(parsedHeaders);
      setColumnMapping(prev => ({ ...prev, ...autoMap }));
    } catch (err: any) {
      setErrorMsg(`Erro ao processar arquivo: ${err.message}`);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleProcessTextContent(content, file.name);
    };
    reader.readAsText(file, 'ISO-8859-1'); // Suporta caracteres pt-BR de planilhas Excel/CSV
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    handleProcessTextContent(pasteText, 'dados_colados.csv');
    setShowPasteBox(false);
  };

  const handleExecuteImport = () => {
    if (!representedId) {
      setErrorMsg('Selecione a empresa representada.');
      return;
    }
    if (rows.length === 0) {
      setErrorMsg('Nenhum dado importado para conciliação.');
      return;
    }

    const represented = representedCompanies.find(r => r.id === representedId);

    const importRecord: FactoryBillingImport = {
      id: `IMP-${Date.now()}`,
      companyId: user.companyId || 'default',
      representedCompanyId: representedId,
      representedCompanyName: represented?.tradeName || represented?.corporateName || 'Representada',
      fileName: fileName || 'faturamento_importado.csv',
      fileType,
      importedAt: new Date().toISOString(),
      importedBy: user.name || user.username,
      rowsCount: rows.length,
      status: 'imported',
      rawData: rows,
      columnMapping,
      createdAt: new Date().toISOString(),
    };

    onImportComplete(importRecord, rows, columnMapping);
  };

  // Carregar dados de exemplo do cenário (CT-REP-REAL-01 e 02)
  const handleLoadDemoScenario = () => {
    const demoCsv = `Pedido_Fabrica;Pedido_MotorDesk;Cliente;CNPJ;Numero_NF;Data_Faturamento;Valor_Faturado;Perc_Comissao
45871;REP-000123;Auto Peças Silva & Filhos Ltda;12.345.678/0001-90;8921;2026-09-02;8000.00;5.0
45872;REP-000123;Auto Peças Silva & Filhos Ltda;12.345.678/0001-90;8922;2026-09-03;7000.00;5.0
45873;REP-000123;Auto Peças Silva & Filhos Ltda;12.345.678/0001-90;8923;2026-09-04;5000.00;5.0`;

    handleProcessTextContent(demoCsv, 'faturamento_fabrica_abc_setembro.csv');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">
              Importação de Planilha de Faturamento da Fábrica
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Seleção da Representada */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Selecione a Empresa Representada (Fábrica)
            </label>
            <select
              value={representedId}
              onChange={(e) => setRepresentedId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Selecione uma representada...</option>
              {representedCompanies.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.tradeName || comp.corporateName} (CNPJ: {comp.cnpj}) — Comissão: {comp.defaultCommissionPercentage}%
                </option>
              ))}
            </select>
          </div>

          {/* 2. Upload ou Colar Planilha */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Arquivo de Faturamento (XLSX, CSV ou XML de NF-e)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLoadDemoScenario}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md transition-colors"
                >
                  ⚡ Carregar Cenário de Teste (Fábrica ABC 1:N)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteBox(!showPasteBox)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md transition-colors"
                >
                  {showPasteBox ? 'Ocultar Colagem' : 'Colar Dados Manualmente'}
                </button>
              </div>
            </div>

            {showPasteBox ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <textarea
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Cole aqui o conteúdo copiado da planilha (com cabeçalhos na primeira linha)..."
                  className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Processar Dados Colados
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xml"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  {fileName ? `Arquivo carregado: ${fileName}` : 'Clique para selecionar ou arraste a planilha para cá'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos aceitos: CSV, TXT (separado por vírgula ou ponto e vírgula), XLSX ou XML de NF-e
                </p>
              </div>
            )}
          </div>

          {/* 3. Mapeador Inteligente de Colunas */}
          {headers.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">
                    3. Mapeamento de Colunas ({headers.length} colunas detectadas na planilha)
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  {rows.length} linha{rows.length === 1 ? '' : 's'} pronta{rows.length === 1 ? '' : 's'} para conciliação
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                
                {/* Pedido Fábrica */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº Pedido da Fábrica:
                  </label>
                  <select
                    value={columnMapping.factoryOrderNumber || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, factoryOrderNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">(Não mapear / Ausente)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Pedido MotorDesk */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº Pedido MotorDesk (ex: REP-000123):
                  </label>
                  <select
                    value={columnMapping.representativeOrderNumber || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, representativeOrderNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">(Não mapear / Ausente)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Cliente / Razão Social */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cliente / Razão Social:
                  </label>
                  <select
                    value={columnMapping.clientName || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, clientName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">(Não mapear / Ausente)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* CNPJ / CPF */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ / CPF do Cliente:
                  </label>
                  <select
                    value={columnMapping.clientCnpj || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, clientCnpj: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">(Não mapear / Ausente)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Número NF-e */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número da Nota Fiscal (NF-e):
                  </label>
                  <select
                    value={columnMapping.invoiceNumber || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">(Não mapear / Ausente)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Data Faturamento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do Faturamento:
                  </label>
                  <select
                    value={columnMapping.invoiceDate || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">(Não mapear / Ausente)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Valor Faturado */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1">
                    Valor Faturado (Total do Item/NF) *:
                  </label>
                  <select
                    value={columnMapping.invoicedAmount || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, invoicedAmount: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-300 bg-indigo-50/50 font-bold text-indigo-900"
                  >
                    <option value="">(Selecione a coluna de valor...)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* % Comissão */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    % Comissão (Opcional):
                  </label>
                  <select
                    value={columnMapping.commissionRate || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, commissionRate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">(Padrão da representada)</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Salvar Layout */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="saveLayout"
                  checked={saveLayout}
                  onChange={(e) => setSaveLayout(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="saveLayout" className="text-xs text-slate-700 cursor-pointer">
                  Salvar este mapeamento de colunas como modelo padrão para futuras planilhas desta representada
                </label>
              </div>

              {/* 4. Pré-Visualização das Primeiras Linhas */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Pré-Visualização dos Dados (Primeiros registros)
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-48 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        {headers.map(h => (
                          <th key={h} className="px-3 py-2 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {headers.map(h => (
                            <td key={h} className="px-3 py-2 whitespace-nowrap text-slate-600">
                              {String(r[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!representedId || rows.length === 0 || !columnMapping.invoicedAmount}
            onClick={handleExecuteImport}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md transition-colors"
          >
            <span>Executar Conciliação Inteligente 1:N</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
