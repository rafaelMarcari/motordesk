/**
 * MotorDesk - Gerenciador Universal de Extração de Relatórios
 * Formatos suportados: PDF, DOCX (Word), XLSX (Excel), XLS, CSV, JSON, XML, Impressão.
 */

(function () {
  'use strict';

  console.log('[MotorDesk] Inicializando Gerenciador Universal de Extração de Relatórios...');

  // Estilos CSS para menus suspensos e toasts de exportação
  const styleEl = document.createElement('style');
  styleEl.id = 'motordesk-report-export-styles';
  styleEl.textContent = `
    .mdesk-export-dropdown {
      position: relative;
      display: inline-block;
      vertical-align: middle;
    }
    .mdesk-export-menu-panel {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      width: 290px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      padding: 6px;
      z-index: 99999;
      animation: mdeskFadeIn 0.15s ease-out;
      font-family: inherit;
    }
    @keyframes mdeskFadeIn {
      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .mdesk-export-header {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mdesk-export-header-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .mdesk-export-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 9999px;
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #e0e7ff;
    }
    .mdesk-export-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 7px 10px;
      border-radius: 10px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s;
    }
    .mdesk-export-item:hover {
      background: #f8fafc;
    }
    .mdesk-export-item-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mdesk-export-icon-box {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .mdesk-export-info {
      display: flex;
      flex-direction: column;
    }
    .mdesk-export-name {
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.2;
    }
    .mdesk-export-desc {
      font-size: 10px;
      color: #64748b;
      margin-top: 1px;
    }
    .mdesk-export-ext {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .mdesk-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 100000;
      animation: mdeskSlideUp 0.2s ease-out;
    }
    @keyframes mdeskSlideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(styleEl);

  function showToast(message, isError = false) {
    const existing = document.getElementById('mdesk-active-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'mdesk-active-toast';
    toast.className = 'mdesk-toast';
    if (isError) {
      toast.style.background = '#991b1b';
    }
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${isError 
          ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' 
          : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
        }
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
  }

  // Extrai dados estruturados a partir do contexto da tela de relatório
  function extractReportDataFromDom(container) {
    const reportElem = container || document.getElementById('reports-view-container') || document.body;

    // Título do Relatório
    let title = 'Relatório Gerencial & Operacional';
    const h1 = reportElem.querySelector('h1');
    const h2 = reportElem.querySelector('h2');
    const h3 = reportElem.querySelector('h3');
    if (h1 && h1.textContent.trim()) {
      title = h1.textContent.trim();
    } else if (h2 && h2.textContent.trim()) {
      title = h2.textContent.trim();
    } else if (h3 && h3.textContent.trim()) {
      title = h3.textContent.trim();
    }

    // Subtítulo / Segmento
    let subtitle = '';
    const subP = reportElem.querySelector('p.text-sm, p.text-xs, p.text-slate-500');
    if (subP) {
      subtitle = subP.textContent.trim();
    }

    // Período se especificado
    let period = '';
    const dateInputs = reportElem.querySelectorAll('input[type="date"]');
    if (dateInputs.length >= 2) {
      const dtStart = dateInputs[0].value;
      const dtEnd = dateInputs[1].value;
      if (dtStart || dtEnd) {
        period = `${dtStart || 'Início'} até ${dtEnd || 'Hoje'}`;
      }
    }

    // Identificação da Empresa Ativa
    let companyName = 'MotorDesk ERP';
    let companyDoc = '';
    try {
      const storedComp = localStorage.getItem('motordesk_company') || localStorage.getItem('motordesk_current_company');
      if (storedComp) {
        const parsed = JSON.parse(storedComp);
        if (parsed.name) companyName = parsed.name;
        if (parsed.cnpj) companyDoc = parsed.cnpj;
      }
    } catch (e) {}

    // Resumos Executivos (KPI Cards)
    const summaryCards = [];
    // Encontrar cartões com métricas
    const cardElements = reportElem.querySelectorAll('.bg-slate-50, .bg-white, .rounded-xl, .rounded-2xl');
    cardElements.forEach(card => {
      // Procurar se tem um número em destaque e um label
      const bigNumber = card.querySelector('.text-2xl, .text-3xl, .text-xl, .font-extrabold, .font-bold');
      const label = card.querySelector('.text-xs, .text-slate-400, .text-slate-500, .uppercase');
      if (bigNumber && label && !card.querySelector('table')) {
        const valText = bigNumber.textContent.trim();
        const lblText = label.textContent.trim();
        if (lblText && valText && lblText.length < 35 && valText.length < 25 && !lblText.includes('Relatório')) {
          if (!summaryCards.some(c => c.label === lblText)) {
            summaryCards.push({ label: lblText, value: valText });
          }
        }
      }
    });

    // Colunas e Linhas de Dados
    const columns = [];
    const rows = [];

    // Tentar extrair de <table>
    const table = reportElem.querySelector('table');
    if (table) {
      const ths = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
      ths.forEach((th, idx) => {
        const label = th.textContent.trim().replace(/\s+/g, ' ');
        if (label && !label.toLowerCase().includes('ação') && !label.toLowerCase().includes('acoes')) {
          columns.push({
            key: `col_${idx}`,
            label: label,
            align: 'left'
          });
        }
      });

      const bodyRows = table.querySelectorAll('tbody tr');
      bodyRows.forEach((tr, rIdx) => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= columns.length) {
          const rowObj = {};
          columns.forEach((col, cIdx) => {
            const td = tds[cIdx];
            if (td) {
              rowObj[col.key] = td.textContent.trim().replace(/\s+/g, ' ');
            }
          });
          rows.push(rowObj);
        }
      });
    }

    // Se nenhuma tabela HTML direta foi encontrada, verificar listas estruturadas (ex: Curva ABC, Mecânicos, Itens)
    if (rows.length === 0) {
      const listItems = reportElem.querySelectorAll('.divide-y > div, ul > li, .space-y-3 > div.flex');
      if (listItems.length > 0) {
        columns.push({ key: 'item', label: 'Descrição / Item' });
        columns.push({ key: 'detail', label: 'Detalhe / Categoria' });
        columns.push({ key: 'value', label: 'Valor / Total' });

        listItems.forEach(item => {
          const textSpans = item.querySelectorAll('span, p, div');
          if (textSpans.length >= 2) {
            rows.push({
              item: textSpans[0].textContent.trim(),
              detail: textSpans[1] ? textSpans[1].textContent.trim() : '',
              value: textSpans[textSpans.length - 1] ? textSpans[textSpans.length - 1].textContent.trim() : ''
            });
          }
        });
      }
    }

    // Fallback se não tiver registros
    if (columns.length === 0) {
      columns.push({ key: 'param', label: 'Parâmetro' });
      columns.push({ key: 'val', label: 'Valor do Indicador' });
      summaryCards.forEach(c => {
        rows.push({ param: c.label, val: c.value });
      });
    }

    return {
      title,
      subtitle: subtitle || 'Relatório Analítico & Gerencial',
      category: 'GERENCIAL',
      companyName,
      companyDoc,
      period: period || 'Consolidado Atual',
      generatedBy: 'Operador do Sistema',
      generatedAt: new Date().toLocaleString('pt-BR'),
      summaryCards: summaryCards.slice(0, 6),
      columns,
      rows,
      elementIdToCapture: reportElem.id || 'reports-view-container'
    };
  }

  // Cria o componente visual de Dropdown para exportação em múltiplos formatos
  function createExportDropdown(targetContainer, alignRight = true) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mdesk-export-dropdown no-print';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-2 cursor-pointer shadow-xs';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Exportar Relatório</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    const menu = document.createElement('div');
    menu.className = 'mdesk-export-menu-panel';
    menu.style.display = 'none';

    menu.innerHTML = `
      <div class="mdesk-export-header">
        <span class="mdesk-export-header-title">Opções de Extração</span>
        <span class="mdesk-export-badge">Multi-Formato</span>
      </div>

      <div style="padding: 4px 0;">
        <!-- PDF -->
        <button type="button" class="mdesk-export-item" data-format="PDF">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2;">PDF</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Documento PDF</span>
              <span class="mdesk-export-desc">Vetorial A4 diagramado</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #fee2e2; color: #991b1b;">.PDF</span>
        </button>

        <!-- DOCX (Word) -->
        <button type="button" class="mdesk-export-item" data-format="DOCX">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe;">DOC</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Microsoft Word</span>
              <span class="mdesk-export-desc">Editável .docx com tabelas</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #dbeafe; color: #1e40af;">.DOCX</span>
        </button>

        <!-- XLSX (Excel) -->
        <button type="button" class="mdesk-export-item" data-format="XLSX">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #ecfdf5; color: #059669; border: 1px solid #d1fae5;">XLS</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Planilha Excel (.xlsx)</span>
              <span class="mdesk-export-desc">Formatação corporativa rica</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #d1fae5; color: #065f46;">.XLSX</span>
        </button>

        <!-- XLS Legado -->
        <button type="button" class="mdesk-export-item" data-format="XLS">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1;">XLS</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Excel Legado (.xls)</span>
              <span class="mdesk-export-desc">Compatibilidade máxima ERP</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #ccfbf1; color: #115e59;">.XLS</span>
        </button>

        <!-- CSV -->
        <button type="button" class="mdesk-export-item" data-format="CSV">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;">CSV</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Arquivo CSV</span>
              <span class="mdesk-export-desc">Delimitador ponto e vírgula UTF-8</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #fef3c7; color: #92400e;">.CSV</span>
        </button>

        <div style="border-top: 1px solid #f1f5f9; margin: 4px 0;"></div>

        <!-- JSON -->
        <button type="button" class="mdesk-export-item" data-format="JSON">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #f5f3ff; color: #7c3aed; border: 1px solid #ede9fe;">{ }</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Exportação JSON</span>
              <span class="mdesk-export-desc">Integração BI e APIs</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #ede9fe; color: #5b21b6;">.JSON</span>
        </button>

        <!-- XML -->
        <button type="button" class="mdesk-export-item" data-format="XML">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5;">&lt;/&gt;</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Documento XML</span>
              <span class="mdesk-export-desc">Intercâmbio B2B / Fiscal</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #ffedd5; color: #9a3412;">.XML</span>
        </button>

        <!-- Impressão -->
        <button type="button" class="mdesk-export-item" data-format="PRINT">
          <div class="mdesk-export-item-left">
            <div class="mdesk-export-icon-box" style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0;">PRT</div>
            <div class="mdesk-export-info">
              <span class="mdesk-export-name">Imprimir Relatório</span>
              <span class="mdesk-export-desc">Diálogo direto de impressão</span>
            </div>
          </div>
          <span class="mdesk-export-ext" style="background: #f1f5f9; color: #334155;">PRINT</span>
        </button>
      </div>
    `;

    // Toggle do menu
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        menu.style.display = 'none';
      }
    });

    // Clique nas opções de exportação
    menu.querySelectorAll('.mdesk-export-item').forEach(itemBtn => {
      itemBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        menu.style.display = 'none';
        const format = this.getAttribute('data-format');
        await doExport(format);
      });
    });

    async function doExport(format) {
      if (!window.ReportExporterBundle) {
        showToast('Módulo de exportação ainda carregando...', true);
        return;
      }

      showToast(`Preparando arquivo ${format}...`);

      try {
        const reportData = extractReportDataFromDom(document.getElementById('reports-view-container'));
        await window.ReportExporterBundle.executeReportExport(format, reportData);
        showToast(`Relatório em ${format} exportado com sucesso!`);
      } catch (err) {
        console.error('Erro na exportação:', err);
        showToast(`Falha ao exportar em ${format}. Tente outro formato.`, true);
      }
    }

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    return wrapper;
  }

  // Observador contínuo para injetar o botão nas telas de relatórios
  function checkAndEnhanceReportButtons() {
    // 1. Relatórios Gerenciais (COe) onde fica `#btn-export-reports-pdf`
    const oldPdfBtn = document.getElementById('btn-export-reports-pdf');
    if (oldPdfBtn && !oldPdfBtn.parentElement.querySelector('.mdesk-export-dropdown')) {
      const parent = oldPdfBtn.parentElement;
      const dropdown = createExportDropdown(parent);
      // Inserir ao lado do botão existente ou substituí-lo
      parent.appendChild(dropdown);
      // Mudar estilo do botão antigo para secundário para que trabalhem juntos
      oldPdfBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
      oldPdfBtn.classList.add('bg-slate-100', 'hover:bg-slate-200', 'text-slate-700', 'border', 'border-slate-300');
    }

    // 2. Relatórios Industriais / OEE (onde tem botão "Imprimir Relatório Oficial")
    const printBtns = document.querySelectorAll('button');
    printBtns.forEach(pBtn => {
      if (pBtn.textContent.includes('Imprimir Relatório Oficial') && !pBtn.parentElement.querySelector('.mdesk-export-dropdown')) {
        const dropdown = createExportDropdown(pBtn.parentElement);
        pBtn.parentElement.appendChild(dropdown);
      }
    });
  }

  // Iniciar verificação periódica e observador de mutações
  const observer = new MutationObserver(() => {
    checkAndEnhanceReportButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(checkAndEnhanceReportButtons, 1500);

  console.log('[MotorDesk] Gerenciador Universal de Extração de Relatórios pronto.');
})();
