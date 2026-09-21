/**
 * MOTOR DESK - UNIVERSAL SORTABLE TABLES ENGINE
 * 
 * Atende ao requisito do usuário:
 * "nas telas que apresentam informações ter uma flechinha para ordenar pelo campo selecionado"
 * 
 * Funcionalidades:
 * 1. Observa dinamicamente a injeção e re-renderização de tabelas em todas as telas
 * 2. Adiciona flechinhas indicadoras (▲ / ▼) interativas nos cabeçalhos <th>
 * 3. Ordenação inteligente: Moeda R$, Datas (BR e ISO), Números/Códigos e Texto Alfabético
 * 4. Mantém integridade de eventos e handlers do React
 */

(function () {
  'use strict';

  function parseCellVal(text) {
    if (!text) return '';
    const clean = text.trim();

    // 1. Tratamento de Moeda Brasileira: R$ 1.250,50 ou R$ -50,00
    if (/^R\$\s*[-+]?[\d.,]+/i.test(clean)) {
      const numStr = clean.replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
      const val = parseFloat(numStr);
      if (!isNaN(val)) return val;
    }

    // 2. Tratamento de Percentual: 15% ou 15,5%
    if (/^[-+]?[\d.,]+%/i.test(clean)) {
      const val = parseFloat(clean.replace('%', '').replace(',', '.'));
      if (!isNaN(val)) return val;
    }

    // 3. Tratamento de Códigos com #: #1002 ou #OP-SW-01
    if (/^#\d+$/.test(clean)) {
      const val = parseInt(clean.replace('#', ''), 10);
      if (!isNaN(val)) return val;
    }

    // 4. Tratamento de Datas: DD/MM/YYYY ou DD/MM/YYYY às HH:mm
    const dateBrMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(?:às\s+)?(\d{1,2}):(\d{1,2}))?/);
    if (dateBrMatch) {
      const day = parseInt(dateBrMatch[1], 10);
      const month = parseInt(dateBrMatch[2], 10) - 1;
      const year = parseInt(dateBrMatch[3], 10);
      const hours = dateBrMatch[4] ? parseInt(dateBrMatch[4], 10) : 0;
      const minutes = dateBrMatch[5] ? parseInt(dateBrMatch[5], 10) : 0;
      const dateObj = new Date(year, month, day, hours, minutes);
      if (!isNaN(dateObj.getTime())) return dateObj.getTime();
    }

    // 5. Tratamento de Datas ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const dateObj = new Date(clean);
      if (!isNaN(dateObj.getTime())) return dateObj.getTime();
    }

    // 6. Números decimais ou inteiros simples
    if (/^[-+]?[\d.,]+$/.test(clean) && !isNaN(Number(clean.replace(',', '.')))) {
      return parseFloat(clean.replace(',', '.'));
    }

    return clean.toLowerCase();
  }

  function sortTable(table, colIndex, direction) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length <= 1) return;

    // Não reordenar se houver apenas linhas de "Nenhum registro encontrado"
    if (rows.length === 1 && rows[0].querySelector('td[colspan]')) return;

    rows.sort((rowA, rowB) => {
      const cellA = rowA.children[colIndex];
      const cellB = rowB.children[colIndex];
      if (!cellA || !cellB) return 0;

      const valA = parseCellVal(cellA.textContent);
      const valB = parseCellVal(cellB.textContent);

      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return direction === 'asc'
        ? strA.localeCompare(strB, 'pt-BR', { numeric: true, sensitivity: 'base' })
        : strB.localeCompare(strA, 'pt-BR', { numeric: true, sensitivity: 'base' });
    });

    // Reanexa linhas na ordem correta
    rows.forEach(row => tbody.appendChild(row));
  }

  function enhanceTable(table) {
    if (table.dataset.sortEnhanced === 'true') return;
    table.dataset.sortEnhanced = 'true';

    const thead = table.querySelector('thead');
    if (!thead) return;

    const headerCells = thead.querySelectorAll('th');
    headerCells.forEach((th, colIndex) => {
      const headerText = th.textContent.trim().toLowerCase();
      // Não ordenar colunas de ações, botões ou seleções
      if (headerText === 'ações' || headerText === 'ação' || headerText === 'opções' || headerText === '' || headerText === 'sel') {
        return;
      }

      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      th.title = 'Clique para ordenar com flechinha (crescente/decrescente)';

      // Evita duplicar o ícone
      let arrowSpan = th.querySelector('.universal-sort-arrow');
      if (!arrowSpan) {
        arrowSpan = document.createElement('span');
        arrowSpan.className = 'universal-sort-arrow ml-1.5 inline-block text-[10px] text-slate-400 font-bold transition-transform';
        arrowSpan.innerHTML = ' ↕';
        th.appendChild(arrowSpan);
      }

      th.addEventListener('click', function (e) {
        // Se o clique foi em um botão ou input interno, ignora
        if (e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('input'))) {
          return;
        }

        const currentDir = th.dataset.sortDir || 'none';
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';

        // Reseta as flechinhas das outras colunas da mesma tabela
        headerCells.forEach(otherTh => {
          if (otherTh !== th) {
            otherTh.dataset.sortDir = 'none';
            const otherArrow = otherTh.querySelector('.universal-sort-arrow');
            if (otherArrow) {
              otherArrow.innerHTML = ' ↕';
              otherArrow.className = 'universal-sort-arrow ml-1.5 inline-block text-[10px] text-slate-300 font-normal';
            }
          }
        });

        // Atualiza a coluna clicada
        th.dataset.sortDir = newDir;
        if (newDir === 'asc') {
          arrowSpan.innerHTML = ' ▲';
          arrowSpan.className = 'universal-sort-arrow ml-1.5 inline-block text-[11px] text-indigo-600 font-extrabold';
        } else {
          arrowSpan.innerHTML = ' ▼';
          arrowSpan.className = 'universal-sort-arrow ml-1.5 inline-block text-[11px] text-indigo-600 font-extrabold';
        }

        sortTable(table, colIndex, newDir);
      });
    });
  }

  function scanAndEnhanceAllTables() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      try {
        enhanceTable(table);
      } catch (err) {
        // Silencioso para não interromper rendering
      }
    });
  }

  // Inicialização e Observador de Mutações para SPA
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndEnhanceAllTables);
  } else {
    scanAndEnhanceAllTables();
  }

  const observer = new MutationObserver(mutations => {
    let hasTables = false;
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (node.tagName === 'TABLE' || (node.querySelector && node.querySelector('table'))) {
              hasTables = true;
              break;
            }
          }
        }
      }
      if (hasTables) break;
    }
    if (hasTables) {
      scanAndEnhanceAllTables();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Disparo periódico leve para garantir que tabelas recém-carregadas por state recebam a flechinha
  setInterval(scanAndEnhanceAllTables, 1500);

  console.log('[MOTOR DESK] Universal Table Sorter com flechinhas inicializado com sucesso.');
})();
