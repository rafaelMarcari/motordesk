/**
 * MotorDesk - Exportar as listas das telas (todos os segmentos)
 *
 * Acima de cada tabela da área de trabalho (e da linha do tempo do Histórico/Auditoria) aparece "Exportar" com PDF, Excel (.xlsx), CSV, Word (.docx), JSON,
 * XML e Imprimir. Exporta o que está na tela (com os filtros e a ordenação aplicados), sem a coluna de ações.
 * Os arquivos levam o nome, o CNPJ e o logo da empresa. PDF, Excel, Word, JSON e XML usam o motor de
 * exportação dos relatórios (report-exporter-bundle.js); CSV e impressão são gerados aqui (CSV limpo, com
 * ";" e acentos para o Excel em português, sem linhas de comentário).
 * Liberação por usuário: "Exportar dados das telas" (administradores já têm).
 * A tela de Relatórios mantém o próprio botão "Exportar Relatório".
 */
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const user = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; } };
  const companyId = () => { try { const u = user() || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  const empresa = () => (window.__mdEmpresaAtiva && window.__mdEmpresaAtiva.id === companyId() ? window.__mdEmpresaAtiva : null);
  const limpa = (t) => String(t == null ? '' : t).replace(/[▲▼↕⇅↑↓⬍]/g, '').replace(/\s+/g, ' ').trim();
  const COLUNA_ACOES = /^(a[cç][oõ]es|a[cç][aã]o|op[cç][oõ]es|#)$/i;
  const nomeArquivo = (t) => (String(t || 'lista').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'lista') + '_' + new Date().toISOString().slice(0, 10);

  const FORMATOS = [
    ['PDF', 'PDF', 'Documento para imprimir ou enviar', '#dc2626', '#fef2f2'],
    ['XLSX', 'Excel', 'Planilha (.xlsx)', '#047857', '#ecfdf5'],
    ['CSV', 'CSV', 'Texto separado por ";" (abre no Excel)', '#0f766e', '#f0fdfa'],
    ['DOCX', 'Word', 'Documento editável (.docx)', '#1d4ed8', '#eff6ff'],
    ['JSON', 'JSON', 'Dados para integrações', '#7c3aed', '#f5f3ff'],
    ['XML', 'XML', 'Dados estruturados', '#b45309', '#fffbeb'],
    ['PRINT', 'Imprimir', 'Só esta lista, com o logo', '#334155', '#f1f5f9'],
  ];

  function estilos() {
    if (document.getElementById('md-exp-style')) return;
    const s = document.createElement('style');
    s.id = 'md-exp-style';
    s.textContent = [
      '.md-exp-barra{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin:0 0 6px;font-family:inherit}',
      '.md-exp-barra .qt{font-size:11.5px;color:#94a3b8}',
      '.md-exp-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:7px;border:1px solid #cbd5e1;background:#fff;color:#334155;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s}',
      '.md-exp-btn:hover{background:#f8fafc;border-color:#94a3b8}.md-exp-btn:focus-visible{outline:2px solid #6366f1;outline-offset:2px}.md-exp-btn svg{width:14px;height:14px;color:#64748b}',
      '#md-exp-menu{position:fixed;z-index:10080;width:264px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.18);padding:6px;font-family:inherit}',
      '#md-exp-menu .tt{padding:6px 8px 8px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #f1f5f9;margin-bottom:4px}',
      '#md-exp-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:0;border-radius:8px;background:none;cursor:pointer;text-align:left;font:inherit;color:#0f172a}',
      '#md-exp-menu button:hover,#md-exp-menu button:focus-visible{background:#f8fafc;outline:none}',
      '#md-exp-menu .ic{width:34px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0}',
      '#md-exp-menu .nm{display:block;font-size:12.5px;font-weight:600}#md-exp-menu .ds{display:block;font-size:11px;color:#64748b}',
      '#md-exp-aviso{position:fixed;right:20px;bottom:20px;z-index:10090;background:#0f172a;color:#fff;font-size:12.5px;padding:10px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(15,23,42,.3);max-width:360px}',
      '#md-exp-aviso.erro{background:#b91c1c}',
      '@media print{.md-exp-barra{display:none !important}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  let avisoTimer = null;
  function aviso(msg, erro) {
    let a = document.getElementById('md-exp-aviso');
    if (!a) { a = document.createElement('div'); a.id = 'md-exp-aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
    a.textContent = msg; a.className = erro ? 'erro' : '';
    clearTimeout(avisoTimer); avisoTimer = setTimeout(() => a.remove(), erro ? 6000 : 3500);
  }

  // ---------------------------------------------------------------- leitura da tabela
  const visivel = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  function textoCelula(td) {
    const campo = td.querySelector('input:not([type=checkbox]):not([type=hidden]), select, textarea');
    if (campo && !limpa(td.innerText)) return limpa(campo.tagName === 'SELECT' ? (campo.options[campo.selectedIndex] || {}).text : campo.value);
    return limpa(td.innerText);
  }
  // Histórico / Auditoria: linha do tempo em cartões (id="history-entry-…"), cada um com tipo, empresa, título,
  // data e hora, descrição e os rótulos "Usuário Responsável:", "Veículo:" e "Cliente:"
  const HIST_COLS = ['Tipo', 'Empresa', 'Ocorrência', 'Data e hora', 'Descrição', 'Responsável', 'Veículo', 'Cliente'];
  const itensHistorico = (lista) => [...lista.children].filter((c) => /^history-entry-/.test(c.id || ''));
  function lerHistorico(lista) {
    const columns = HIST_COLS.map((label, k) => ({ key: 'c' + k, label }));
    const rows = itensHistorico(lista).filter(visivel).map((it) => {
      const l = it.innerText.split('\n').map(limpa).filter(Boolean);
      const iResp = l.findIndex((x) => /^Usu[aá]rio Respons[aá]vel:?$/i.test(x));
      const fim = iResp >= 0 ? iResp : l.length;
      const rot = (re) => { const x = l.find((y) => re.test(y)); return x ? limpa(x.replace(re, '')) : ''; };
      return { c0: l[0] || '', c1: l[1] || '', c2: l[2] || '', c3: l[3] || '', c4: l.slice(4, fim).filter((x) => !/^(Ve[ií]culo|Cliente):/i.test(x)).join(' '), c5: iResp >= 0 ? (l[iResp + 1] || '') : '', c6: rot(/^Ve[ií]culo:\s*/i), c7: rot(/^Cliente:\s*/i) };
    });
    return { columns, rows };
  }
  function lerTabela(tab) {
    if (tab.tagName !== 'TABLE') return lerHistorico(tab);
    const linhasCab = tab.tHead ? [...tab.tHead.rows] : [];
    const cab = linhasCab.length ? linhasCab[linhasCab.length - 1] : null;
    if (!cab) return null;
    const ths = [...cab.cells];
    if (ths.some((c) => c.colSpan > 1)) return null;
    const usar = ths.map((c, i) => ({ i, label: limpa(c.innerText) })).filter((c) => c.label && !COLUNA_ACOES.test(c.label));
    if (usar.length < 2) return null;
    const columns = usar.map((c, k) => ({ key: 'c' + k, label: c.label }));
    const rows = [];
    for (const body of tab.tBodies) {
      for (const tr of body.rows) {
        if (!visivel(tr) || tr.cells.length !== ths.length || [...tr.cells].some((c) => c.colSpan > 1)) continue;
        const o = {};
        usar.forEach((c, k) => { o['c' + k] = textoCelula(tr.cells[c.i]); });
        if (Object.values(o).some(Boolean)) rows.push(o);
      }
    }
    return { columns, rows };
  }
  // Tabela de dados: cabeçalho simples com ao menos duas colunas com nome (fora "Ações")
  function cabecalhoValido(tab) {
    const cab = tab.tHead && tab.tHead.rows.length ? tab.tHead.rows[tab.tHead.rows.length - 1] : null;
    if (!cab || [...cab.cells].some((c) => c.colSpan > 1)) return false;
    return [...cab.cells].filter((c) => { const t = limpa(c.textContent); return t && !COLUNA_ACOES.test(t); }).length >= 2;
  }
  // Contagem leve (sem medir cada linha): roda a cada ciclo
  function contarLinhas(tab) {
    if (tab.tagName !== 'TABLE') return itensHistorico(tab).length;
    const cab = tab.tHead && tab.tHead.rows.length ? tab.tHead.rows[tab.tHead.rows.length - 1] : null;
    if (!cab) return 0;
    const nc = cab.cells.length;
    let n = 0;
    for (const body of tab.tBodies) for (const tr of body.rows) if (tr.cells.length === nc && ![...tr.cells].some((c) => c.colSpan > 1) && tr.style.display !== 'none' && !tr.hidden) n++;
    return n;
  }
  function tituloDa(tab) {
    const main = document.getElementById('workspace-main-content');
    const antes = (h) => h && (h.compareDocumentPosition(tab) & Node.DOCUMENT_POSITION_FOLLOWING);
    let secao = '';
    for (let el = tab.parentElement; el && el !== main && !secao; el = el.parentElement) {
      const hs = [...el.querySelectorAll('h1,h2,h3,h4')].filter(antes);
      if (hs.length) secao = limpa(hs[hs.length - 1].innerText);
    }
    const tela = main ? limpa((main.querySelector('h1') || main.querySelector('h2') || {}).innerText || '') : '';
    return { titulo: secao || tela || 'Lista', subtitulo: tela && tela !== secao ? tela : '' };
  }

  // Logo convertido em PNG (o PDF só aceita PNG/JPEG) e medido em mm para caber no cabeçalho
  let logoCache = { src: '', png: null };
  function logoPng(src) {
    if (!src) return Promise.resolve(null);
    if (logoCache.src === src) return Promise.resolve(logoCache.png);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = img.naturalWidth || 300; cv.height = img.naturalHeight || 100;
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          const prop = cv.width / cv.height;
          const w = prop >= 44 / 16 ? 44 : 16 * prop, h = prop >= 44 / 16 ? 44 / prop : 16;
          logoCache = { src, png: { url: cv.toDataURL('image/png'), w, h } };
        } catch (e) { logoCache = { src, png: null }; }
        resolve(logoCache.png);
      };
      img.onerror = () => { logoCache = { src, png: null }; resolve(null); };
      // logo informado por endereço (https://…): carrega com CORS para poder entrar no PDF; se o site não permitir, sai sem logo
      if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }

  async function montarDados(tab) {
    const dados = lerTabela(tab);
    if (!dados || !dados.rows.length) throw new Error('Não há linhas para exportar nesta lista.');
    const t = tituloDa(tab);
    const e = empresa() || {};
    const u = user() || {};
    const logo = await logoPng(e.logo);
    return {
      title: t.titulo,
      subtitle: t.subtitulo,
      category: 'LISTA',
      companyName: e.nome || e.razaoSocial || 'MotorDesk',
      companyDoc: e.cnpj || '',
      period: 'Dados exibidos na tela',
      generatedBy: u.name || u.username || 'Usuário',
      generatedAt: new Date().toLocaleString('pt-BR'),
      summaryCards: [],
      columns: dados.columns,
      rows: dados.rows,
      logoDataUrl: logo ? logo.url : '',
      logoW: logo ? logo.w : 0,
      logoH: logo ? logo.h : 0,
      _logoOriginal: e.logo || '',
    };
  }

  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 400);
  }
  function csv(d) {
    const cel = (v) => { const s = String(v == null ? '' : v); return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const linhas = [d.columns.map((c) => cel(c.label)).join(';')].concat(d.rows.map((r) => d.columns.map((c) => cel(r[c.key])).join(';')));
    baixar(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), nomeArquivo(d.title) + '.csv');
  }
  function imprimir(d) {
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    const doc = fr.contentDocument;
    doc.open();
    doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(d.title) + '</title><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:18px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:12px}' +
      'header img{max-height:46px;max-width:180px;object-fit:contain}h1{font-size:17px;margin:0}.emp{font-size:12px;color:#475569;margin-top:2px}.meta{font-size:11px;color:#64748b;margin-bottom:8px}' +
      'table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f1f5f9;text-align:left;padding:5px 6px;border-bottom:1px solid #cbd5e1}td{padding:4px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}tr:nth-child(even) td{background:#f8fafc}' +
      '@page{margin:12mm}</style></head><body><header><div><h1>' + esc(d.title) + '</h1><div class="emp">' + esc(d.companyName) + (d.companyDoc ? ' · CNPJ ' + esc(d.companyDoc) : '') + '</div></div>' +
      (d._logoOriginal ? '<img src="' + esc(d._logoOriginal) + '" alt="">' : '') + '</header>' +
      '<div class="meta">' + (d.subtitle ? esc(d.subtitle) + ' · ' : '') + d.rows.length + ' registro(s) · Emitido em ' + esc(d.generatedAt) + ' por ' + esc(d.generatedBy) + '</div>' +
      '<table><thead><tr>' + d.columns.map((c) => '<th>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>' +
      d.rows.map((r) => '<tr>' + d.columns.map((c) => '<td>' + esc(r[c.key]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></body></html>');
    doc.close();
    const ir = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {} setTimeout(() => fr.remove(), 1500); };
    const img = doc.querySelector('img');
    if (img && !img.complete) { img.onload = ir; img.onerror = ir; } else setTimeout(ir, 50);
  }

  async function exportar(tab, formato) {
    try {
      const d = await montarDados(tab);
      if (formato === 'CSV') csv(d);
      else if (formato === 'PRINT') imprimir(d);
      else {
        if (!window.ReportExporterBundle || !window.ReportExporterBundle.executeReportExport) throw new Error('O módulo de exportação ainda está carregando. Tente de novo em instantes.');
        await window.ReportExporterBundle.executeReportExport(formato, d);
      }
      if (formato !== 'PRINT') aviso(d.rows.length + ' registro(s) exportado(s) em ' + (FORMATOS.find((f) => f[0] === formato) || [])[1] + '.');
    } catch (err) {
      aviso(err.message || 'Não foi possível exportar.', true);
    }
  }

  // ---------------------------------------------------------------- menu
  let menu = null;
  function fecharMenu() { if (menu) { const b = menu._botao; menu.remove(); menu = null; document.removeEventListener('mousedown', fora, true); document.removeEventListener('keydown', tecla, true); if (b) { b.setAttribute('aria-expanded', 'false'); } } }
  function fora(e) { if (menu && !menu.contains(e.target) && e.target !== menu._botao && !menu._botao.contains(e.target)) fecharMenu(); }
  function tecla(e) {
    if (!menu) return;
    if (e.key === 'Escape') { const b = menu._botao; fecharMenu(); if (b) b.focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const itens = [...menu.querySelectorAll('button')];
      const i = itens.indexOf(document.activeElement);
      itens[(i + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length].focus();
    }
  }
  function abrirMenu(botao, tab) {
    if (menu && menu._botao === botao) { fecharMenu(); return; }
    fecharMenu();
    menu = document.createElement('div');
    menu.id = 'md-exp-menu';
    menu.setAttribute('role', 'menu');
    menu._botao = botao;
    menu.innerHTML = '<div class="tt">Exportar esta lista</div>' + FORMATOS.map(([f, nome, desc, cor, fundo]) =>
      '<button type="button" role="menuitem" data-f="' + f + '"><span class="ic" style="color:' + cor + ';background:' + fundo + '">' + (f === 'PRINT' ? '⎙' : f === 'XLSX' ? 'XLS' : f === 'DOCX' ? 'DOC' : f) + '</span><span><span class="nm">' + nome + '</span><span class="ds">' + desc + '</span></span></button>').join('');
    menu.addEventListener('click', (e) => { const b = e.target.closest('button[data-f]'); if (!b) return; fecharMenu(); exportar(tab, b.dataset.f); });
    document.body.appendChild(menu);
    const r = botao.getBoundingClientRect();
    const alto = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.style.top = (r.bottom + 6 + alto > window.innerHeight ? Math.max(8, r.top - alto - 6) : r.bottom + 6) + 'px';
    botao.setAttribute('aria-expanded', 'true');
    setTimeout(() => { document.addEventListener('mousedown', fora, true); document.addEventListener('keydown', tecla, true); }, 0);
    menu.querySelector('button').focus();
  }

  // ---------------------------------------------------------------- botões nas tabelas
  const ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const barras = new Set();
  const ancoraDe = (tab) => (tab.tagName === 'TABLE' ? tab.closest('.overflow-x-auto, .overflow-auto, .overflow-x-scroll') || tab : tab);

  function ciclo() {
    if (!document.body) return;
    const main = document.getElementById('workspace-main-content');
    const e = empresa();
    const pode = Boolean(main && user() && e && e.podeExportar);
    // barras de tabelas que sumiram (ou sem permissão)
    for (const b of [...barras]) {
      if (!pode || !b.isConnected || !b._tab || !b._tab.isConnected || !visivel(b._tab)) { b.remove(); barras.delete(b); if (b._tab) delete b._tab.dataset.mdExp; }
    }
    if (!pode) { fecharMenu(); return; }
    estilos();
    const historicos = [...new Set([...main.querySelectorAll('[id^="history-entry-"]')].map((x) => x.parentElement))];
    for (const tab of [...main.querySelectorAll('table'), ...historicos]) {
      if (tab.dataset.mdExp || tab.closest('#reports-view-container, [data-md-sem-exportar], .md-exp-barra') || !visivel(tab)) continue;
      if (tab.tagName === 'TABLE' && !cabecalhoValido(tab)) continue;
      const ancora = ancoraDe(tab);
      if (!ancora.parentElement || !main.contains(ancora)) continue;
      const barra = document.createElement('div');
      barra.className = 'md-exp-barra';
      barra._tab = tab;
      barra.innerHTML = '<span class="qt"></span><button type="button" class="md-exp-btn" aria-haspopup="menu" aria-expanded="false">' + ICONE + 'Exportar</button>';
      barra.querySelector('button').addEventListener('click', (ev) => abrirMenu(ev.currentTarget, tab));
      ancora.parentElement.insertBefore(barra, ancora);
      tab.dataset.mdExp = '1';
      barras.add(barra);
    }
    // contagem de linhas e posição (o React pode ter movido a tabela)
    for (const b of barras) {
      const n = contarLinhas(b._tab);
      const q = b.querySelector('.qt');
      const txt = n === 1 ? '1 registro' : n + ' registros';
      if (q.textContent !== txt) q.textContent = txt;
      const ancora = ancoraDe(b._tab);
      if (ancora.previousElementSibling !== b && ancora.parentElement) ancora.parentElement.insertBefore(b, ancora);
    }
  }

  window.MotorDeskExportarTabela = (tab, formato) => exportar(tab, formato || 'PDF');
  setInterval(ciclo, 1200);
  window.addEventListener('md-empresa-ativa', ciclo);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ciclo); else ciclo();
})();
