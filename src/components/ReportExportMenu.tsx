import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Printer, 
  ChevronDown, 
  Check, 
  Loader2,
  FileCheck
} from 'lucide-react';
import { ReportExportData, ExportFormat, executeReportExport } from '../utils/reportExporter';

interface ReportExportMenuProps {
  getData: () => ReportExportData | Promise<ReportExportData>;
  buttonLabel?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'dark';
}

export const ReportExportMenu: React.FC<ReportExportMenuProps> = ({
  getData,
  buttonLabel = 'Exportar Relatório',
  className = '',
  variant = 'primary'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [lastExported, setLastExported] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    try {
      const data = await getData();
      await executeReportExport(format, data);
      setLastExported(format);
      setTimeout(() => setLastExported(null), 3000);
      setIsOpen(false);
    } catch (error) {
      console.error(`Erro ao exportar relatório em formato ${format}:`, error);
      alert(`Falha ao exportar relatório em ${format}. Verifique os dados e tente novamente.`);
    } finally {
      setIsExporting(null);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'dark':
        return 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs';
      case 'secondary':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs';
      case 'outline':
        return 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs';
      case 'primary':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs';
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        id="btn-universal-export-menu"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting !== null}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 select-none ${getButtonStyles()}`}
        title="Exportar dados do relatório em múltiplos formatos"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            <span>Gerando {isExporting}...</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>{buttonLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Formatos de Exportação
            </span>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
              Multi-formato
            </span>
          </div>

          <div className="p-1 space-y-0.5 text-xs text-slate-700">
            {/* PDF Oficial */}
            <button
              id="btn-export-opt-pdf"
              type="button"
              onClick={() => handleExport('PDF')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">PDF Executivo</div>
                  <div className="text-[10px] text-slate-500">Documento diagramado vetorial A4</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100/70 text-rose-700">.PDF</span>
            </button>

            {/* DOCX Word */}
            <button
              id="btn-export-opt-docx"
              type="button"
              onClick={() => handleExport('DOCX')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">Microsoft Word (.docx)</div>
                  <div className="text-[10px] text-slate-500">Editável em Word, Docs e LibreOffice</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-700">.DOCX</span>
            </button>

            {/* Excel XLSX */}
            <button
              id="btn-export-opt-xlsx"
              type="button"
              onClick={() => handleExport('XLSX')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">Planilha Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-500">Formatado com colunas ajustadas</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-700">.XLSX</span>
            </button>

            {/* Excel XLS Clássico */}
            <button
              id="btn-export-opt-xls"
              type="button"
              onClick={() => handleExport('XLS')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">Excel Legado (.xls)</div>
                  <div className="text-[10px] text-slate-500">Compatibilidade máxima BI/ERP</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100/70 text-teal-700">.XLS</span>
            </button>

            {/* CSV */}
            <button
              id="btn-export-opt-csv"
              type="button"
              onClick={() => handleExport('CSV')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">Texto Tabular CSV</div>
                  <div className="text-[10px] text-slate-500">UTF-8 com delimitador ponto e vírgula</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-700">.CSV</span>
            </button>

            <div className="my-1 border-t border-slate-100"></div>

            {/* JSON / BI */}
            <button
              id="btn-export-opt-json"
              type="button"
              onClick={() => handleExport('JSON')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">Dados Estruturados JSON</div>
                  <div className="text-[10px] text-slate-500">Integração via API / Power BI</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100/70 text-violet-700">.JSON</span>
            </button>

            {/* XML Faturamento */}
            <button
              id="btn-export-opt-xml"
              type="button"
              onClick={() => handleExport('XML')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">Padrão XML</div>
                  <div className="text-[10px] text-slate-500">Intercâmbio fiscal e B2B</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100/70 text-orange-700">.XML</span>
            </button>

            {/* Impressão Direta */}
            <button
              id="btn-export-opt-print"
              type="button"
              onClick={() => handleExport('PRINT')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">Imprimir / Enviar Impressora</div>
                  <div className="text-[10px] text-slate-500">Diálogo nativo de impressão</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">PRINT</span>
            </button>
          </div>

          {lastExported && (
            <div className="mt-1 pt-2 border-t border-slate-100 px-3 flex items-center gap-1.5 text-emerald-600 text-[11px] font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Arquivo {lastExported} exportado com sucesso!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
