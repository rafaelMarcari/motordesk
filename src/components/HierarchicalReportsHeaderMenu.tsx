import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  ChevronRight,
  Printer,
  Download,
  FileSpreadsheet,
  X,
  Filter,
  Search,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  PieChart,
  Layers,
  ChevronDown
} from 'lucide-react';
import { AppDatabase, User } from '../types';

export interface HierarchicalReportsHeaderMenuProps {
  db: AppDatabase;
  currentUser: User;
  onNavigate?: (view: string) => void;
  className?: string;
}

export interface ReportItem {
  id: string;
  category: string;
  title: string;
  description: string;
  type: 'payable' | 'receivable' | 'cashflow' | 'dre' | 'clients' | 'production' | 'general';
}

export function HierarchicalReportsHeaderMenu({
  db,
  currentUser,
  onNavigate,
  className = ''
}: HierarchicalReportsHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estrutura de Relatórios conforme Screenshot 1
  const reportCategories = [
    {
      id: 'contas_pagar',
      label: 'Contas a Pagar',
      items: [
        { id: 'ap_geral', category: 'Contas a Pagar', title: 'Relação Geral de Contas a Pagar', description: 'Todos os títulos pendentes, parciais e vencidos organizados por data', type: 'payable' as const },
        { id: 'ap_pagas', category: 'Contas a Pagar', title: 'Contas Pagas no Período', description: 'Histórico de liquidação financeira com descontos e juros', type: 'payable' as const },
        { id: 'ap_fornecedor', category: 'Contas a Pagar', title: 'Extrato por Fornecedor / Prestador', description: 'Consolidação de compras e serviços por credor', type: 'payable' as const },
        { id: 'ap_vencimento', category: 'Contas a Pagar', title: 'Previsão de Desembolsos por Vencimento', description: 'Cronograma de saídas futuras de caixa', type: 'payable' as const }
      ]
    },
    {
      id: 'contas_receber',
      label: 'Contas a Receber',
      items: [
        { id: 'ar_aberto', category: 'Contas a Receber', title: 'Relação Geral de Contas a Receber', description: 'Títulos a vencer e vencidos organizados por cliente e vencimento', type: 'receivable' as const },
        { id: 'ar_recebidos', category: 'Contas a Receber', title: 'Contas Recebidas no Período', description: 'Demonstrativo de entradas e quitações', type: 'receivable' as const },
        { id: 'ar_aging', category: 'Contas a Receber', title: 'Inadimplência & Aging de Títulos', description: 'Faixas de atraso (0-30, 31-60, 61-90, 90+ dias)', type: 'receivable' as const },
        { id: 'ar_cliente', category: 'Contas a Receber', title: 'Posição Consolidada por Cliente & Limite de Crédito', description: 'Faturamento acumulado e limite de crédito', type: 'receivable' as const }
      ]
    },
    {
      id: 'banco_caixa',
      label: 'Banco/Caixa',
      items: [
        { id: 'bc_extrato', category: 'Banco/Caixa', title: 'Extrato Bancário Consolidado', description: 'Movimentações de todas as contas e aplicações', type: 'cashflow' as const },
        { id: 'bc_livro_caixa', category: 'Banco/Caixa', title: 'Livro Caixa Diário', description: 'Entradas e saídas de numerário no balcão', type: 'cashflow' as const },
        { id: 'bc_conciliacao', category: 'Banco/Caixa', title: 'Conciliação de Saldos Bancários', description: 'Confronto entre extrato bancário e ERP', type: 'cashflow' as const }
      ]
    },
    {
      id: 'controle',
      label: 'Controle',
      items: [
        { id: 'ct_dre', category: 'Controle', title: 'DRE Gerencial Consolidado', description: 'Receitas brutas, custos operacionais e margem líquida', type: 'dre' as const },
        { id: 'ct_centros', category: 'Controle', title: 'Demonstrativo por Centro de Custos', description: 'Alocação de despesas por departamento', type: 'dre' as const },
        { id: 'ct_rentabilidade', category: 'Controle', title: 'Rentabilidade por Linha de Negócio', description: 'Margem de contribuição por serviço e produto', type: 'dre' as const }
      ]
    },
    {
      id: 'curva_abc_estrategica',
      label: 'Curva ABC & Rentabilidade',
      items: [
        { id: 'gr_curva_abc', category: 'Curva ABC & Rentabilidade', title: 'Curva ABC de Clientes & Margem de Contribuição', description: 'Classificação de Pareto (80/20) com faturamento, margem e ticket médio', type: 'clients' as const },
        { id: 'gr_rentabilidade_prod', category: 'Curva ABC & Rentabilidade', title: 'Rentabilidade Real por Produto / Serviço / OP', description: 'Receita vs custo de matéria-prima e mão de obra direta com margem líquida', type: 'dre' as const }
      ]
    },
    {
      id: 'produtividade_equipe',
      label: 'Produtividade & Mão de Obra',
      items: [
        { id: 'pe_rendimento', category: 'Produtividade & Mão de Obra', title: 'Produtividade da Equipe & Eficiência de Mão de Obra', description: 'Horas apontadas vs horas faturadas, produtividade horária e comissões', type: 'production' as const },
        { id: 'pe_giro_estoque', category: 'Produtividade & Mão de Obra', title: 'Giro de Estoque & Itens Críticos de Reposição', description: 'Itens com baixo giro, ruptura iminente e capital imobilizado no almoxarifado', type: 'general' as const }
      ]
    },
    {
      id: 'contabilizacao',
      label: 'Contabilização',
      items: [
        { id: 'cb_resumo', category: 'Contabilização', title: 'Resumo Contábil Mensal', description: 'Lançamentos de débito e crédito sintetizados', type: 'general' as const },
        { id: 'cb_export', category: 'Contabilização', title: 'Exportação SPED Contábil / Fiscal', description: 'Arquivo estruturado para escritórios de contabilidade', type: 'general' as const }
      ]
    },
    {
      id: 'gerenciais',
      label: 'Gerenciais',
      items: [
        { id: 'gr_curva_abc', category: 'Gerenciais', title: 'Curva ABC de Clientes e Faturamento', description: 'Classificação 80/20 dos maiores clientes', type: 'clients' as const },
        { id: 'gr_indicadores', category: 'Gerenciais', title: 'Painel de Indicadores Operacionais e EBITDA', description: 'KPIs financeiros consolidados', type: 'dre' as const }
      ]
    },
    {
      id: 'documentos',
      label: 'Documentos',
      items: [
        { id: 'dc_boletos', category: 'Documentos', title: 'Relação de Boletos Bancários Registrados', description: 'Listagem com linhas digitáveis e status de liquidação', type: 'receivable' as const },
        { id: 'dc_recibos', category: 'Documentos', title: 'Relação de Recibos Emitidos', description: 'Histórico de comprovantes emitidos para clientes', type: 'receivable' as const }
      ]
    }
  ];

  // Gerador de Impressão / PDF Oficial
  const handleExportPDF = (report: ReportItem) => {
    const company = db.companyInfo?.tradeName || db.companyInfo?.name || 'EMPRESA CLIENTE';
    let tableHtml = '';
    if (report.type === 'payable') {
      const list = db.accountsPayable || [];
      tableHtml = `<table><thead><tr><th>#</th><th>Fornecedor</th><th>Doc / NF</th><th>Vencimento</th><th>Valor (R$)</th><th>Status</th></tr></thead><tbody>` +
        list.map((p, idx) => `<tr><td>${idx + 1}</td><td>${p.supplierName || '-'}</td><td>${p.invoiceNumber || p.id || '-'}</td><td>${p.dueDate || '-'}</td><td style="text-align:right">R$ ${(Number(p.amount) || 0).toFixed(2)}</td><td>${(p.status || '').toUpperCase()}</td></tr>`).join('') + `</tbody></table>`;
    } else if (report.type === 'receivable') {
      const list = db.accountsReceivable || [];
      tableHtml = `<table><thead><tr><th>#</th><th>Cliente</th><th>Doc / NF</th><th>Vencimento</th><th>Valor (R$)</th><th>Status</th></tr></thead><tbody>` +
        list.map((r, idx) => `<tr><td>${idx + 1}</td><td>${r.clientName || '-'}</td><td>${r.invoiceNumber || r.id || '-'}</td><td>${r.dueDate || '-'}</td><td style="text-align:right">R$ ${(Number(r.amount) || 0).toFixed(2)}</td><td>${(r.status || '').toUpperCase()}</td></tr>`).join('') + `</tbody></table>`;
    } else {
      tableHtml = `<p>Demonstrativo gerado a partir da base operacional do sistema. Total: ${(db.transactions || []).length} movimentações no período.</p>`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${report.title} - ${company}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 800; margin: 0; color: #0f172a; }
            h2 { font-size: 15px; font-weight: 600; margin: 4px 0 16px 0; color: #4338ca; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 700; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${company}</h1>
          <h2>Relatório Oficial: ${report.title}</h2>
          <div class="meta">
            <strong>Categoria:</strong> ${report.category} | <strong>Emissão:</strong> ${new Date().toLocaleString('pt-BR')} | <strong>Operador:</strong> ${currentUser.name} (${currentUser.role.toUpperCase()})
          </div>
          ${tableHtml}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  // Gerador de Exportação em Excel / CSV
  const handleExportXLSX = (report: ReportItem) => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    if (report.type === 'payable') {
      headers = ['Fornecedor', 'Documento', 'Categoria', 'Vencimento', 'Valor (R$)', 'Pago (R$)', 'Saldo (R$)', 'Status'];
      rows = (db.accountsPayable || []).map(p => [
        p.supplierName || '',
        p.invoiceNumber || p.id || '',
        p.category || '',
        p.dueDate || '',
        (Number(p.amount) || 0).toFixed(2),
        (Number(p.paidAmount) || 0).toFixed(2),
        (p.remainingAmount !== undefined ? p.remainingAmount : ((Number(p.amount) || 0) - (Number(p.paidAmount) || 0))).toFixed(2),
        p.status || ''
      ]);
    } else if (report.type === 'receivable') {
      headers = ['Cliente', 'Documento', 'Categoria', 'Vencimento', 'Valor (R$)', 'Recebido (R$)', 'Saldo (R$)', 'Status'];
      rows = (db.accountsReceivable || []).map(r => [
        r.clientName || '',
        r.invoiceNumber || r.id || '',
        r.category || '',
        r.dueDate || '',
        (Number(r.amount) || 0).toFixed(2),
        (Number(r.paidAmount) || 0).toFixed(2),
        (r.remainingAmount !== undefined ? r.remainingAmount : ((Number(r.amount) || 0) - (Number(r.paidAmount) || 0))).toFixed(2),
        r.status || ''
      ]);
    } else {
      headers = ['Descrição', 'Tipo', 'Categoria', 'Valor (R$)', 'Data', 'Conta'];
      rows = (db.transactions || []).map(t => [
        t.description || '',
        t.type || '',
        t.category || '',
        (Number(t.amount) || 0).toFixed(2),
        t.date || '',
        t.account || ''
      ]);
    }
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `${report.id}_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef} id="menu-aba-relatorios">
      {/* BOTÃO PRINCIPAL "RELATÓRIOS" (Estilo Screenshot 1) */}
      <button
        type="button"
        id="btn-menu-relatorios"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50/90 hover:bg-indigo-100 text-indigo-950 text-[13px] font-bold transition border border-indigo-200/90 shadow-2xs cursor-pointer select-none"
        title="Aba de Relatórios do Sistema"
      >
        <FileText className="w-4 h-4 text-indigo-600" />
        <span className="uppercase tracking-wider">Relatórios</span>
        <ChevronDown className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />
      </button>

      {/* DROPDOWN MULTINÍVEL EM CASCATA (Exatamente como Screenshot 1) */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 bg-slate-100 border border-slate-300 rounded-lg shadow-xl z-50 py-1.5 text-sm select-none animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            Relatórios do Sistema
          </div>

          <div className="divide-y divide-slate-200/60">
            {reportCategories.map(cat => {
              const isHovered = activeSubMenu === cat.id;

              return (
                <div
                  key={cat.id}
                  className="relative"
                  onMouseEnter={() => setActiveSubMenu(cat.id)}
                >
                  <button
                    type="button"
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition cursor-pointer text-[13.5px] ${
                      isHovered
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-800 hover:bg-slate-200 font-medium'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <ChevronRight className={`w-4 h-4 ${isHovered ? 'text-white' : 'text-slate-400'}`} />
                  </button>

                  {/* SUBMENU CASCATA LATERAL (Estilo Windows/ERP Screenshot 1) */}
                  {isHovered && (
                    <div
                      className="absolute left-full top-0 ml-1 w-80 bg-white border border-slate-300 rounded-lg shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                      onMouseLeave={() => setActiveSubMenu(null)}
                    >
                      <div className="px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50/70 border-b border-slate-100">
                        {cat.label}
                      </div>
                      <div className="py-1">
                        {cat.items.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedReport(item);
                              setIsOpen(false);
                              setActiveSubMenu(null);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-900 transition flex flex-col gap-0.5 cursor-pointer"
                          >
                            <span className="font-bold text-slate-900 text-[13.5px]">{item.title}</span>
                            <span className="text-[11.5px] text-slate-500 line-clamp-1">{item.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO E EXPORTAÇÃO DO RELATÓRIO SELECIONADO */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Header do Modal */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">{selectedReport.title}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Categoria: {selectedReport.category}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Relatório */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">Parâmetros de Geração:</span>
                  <span className="text-slate-600">{selectedReport.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportPDF(selectedReport)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-3xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportXLSX(selectedReport)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-3xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-3xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Tabela Prévia de Dados */}
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] sticky top-0">
                    <tr>
                      <th className="p-2 border-r border-slate-200">Registro</th>
                      <th className="p-2 border-r border-slate-200">Referência / Documento</th>
                      <th className="p-2 border-r border-slate-200">Data</th>
                      <th className="p-2 border-r border-slate-200 text-right">Valor (R$)</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {selectedReport.type === 'payable' ? (
                      (db.accountsPayable || []).slice(0, 10).map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 font-sans font-medium">{p.supplierName}</td>
                          <td className="p-2 border-r border-slate-200">{p.invoiceNumber || '-'}</td>
                          <td className="p-2 border-r border-slate-200">{p.dueDate || '-'}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-bold">
                            {(Number(p.amount) || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : selectedReport.type === 'receivable' ? (
                      (db.accountsReceivable || []).slice(0, 10).map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 font-sans font-medium">{r.clientName}</td>
                          <td className="p-2 border-r border-slate-200">{r.invoiceNumber || '-'}</td>
                          <td className="p-2 border-r border-slate-200">{r.dueDate || '-'}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-bold text-emerald-700">
                            {(Number(r.amount) || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      (db.transactions || []).slice(0, 10).map((t, i) => (
                        <tr key={t.id || i} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 font-sans font-medium">{t.description}</td>
                          <td className="p-2 border-r border-slate-200">{t.category}</td>
                          <td className="p-2 border-r border-slate-200">{t.date}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-bold">
                            {(Number(t.amount) || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                              {t.type}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer shadow-3xs"
                >
                  Fechar Relatório
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
