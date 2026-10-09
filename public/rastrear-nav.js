/**
 * MotorDesk - Barra de navegação das etapas do "Rastrear Processo" (Indústria)
 *
 * Ao abrir uma etapa da esteira (botão "Abrir Tela →"), mostra no topo da tela:
 *   ◀ Anterior: <nº e descrição>  |  Etapa X de N · <etapa atual> · Voltar ao Rastrear  |  Próximo: <nº e descrição> ▶
 * A barra só aparece enquanto a pessoa está na tela aberta pela esteira; navegar por outro caminho a esconde.
 * Usa a mesma navegação do módulo Industrial (window.__mdIndNav) exposta por scripts/rastrear-navegacao.cjs.
 */
(function () {
  'use strict';

  const CHAVE = 'md_rastrear_nav';
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ler = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; } };
  const gravar = (v) => { try { if (v) sessionStorage.setItem(CHAVE, JSON.stringify(v)); else sessionStorage.removeItem(CHAVE); } catch (e) {} };
  const viewAtual = () => { try { return localStorage.getItem('motordesk_active_view') || ''; } catch (e) { return ''; } };
  // "Onde a pessoa está": tela do app + aba do módulo Industrial
  const assinatura = () => viewAtual() + '|' + (String(viewAtual()).startsWith('ind_') ? (window.__mdIndTab || '') : '');
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  // Chamado pelo botão "Abrir Tela →" da esteira (antes de navegar)
  window.__mdRastrearIniciar = (etapas, idx, ordem, produto) => {
    gravar({ etapas, idx, ordem, produto, assinatura: '' });
    registrarDestino();
  };
  // Espera a tela de destino estabilizar (a troca de departamento do módulo leva alguns instantes)
  // e memoriza onde a pessoa ficou; a barra aparece enquanto ela continuar ali.
  async function registrarDestino() {
    let anterior = '', iguais = 0;
    for (let i = 0; i < 20 && iguais < 2; i++) {
      await espera(250);
      const a = assinatura();
      iguais = a === anterior ? iguais + 1 : 0;
      anterior = a;
    }
    const v = ler();
    if (v) { v.assinatura = anterior; gravar(v); }
  }

  async function garantirModuloIndustrial() {
    if (String(viewAtual()).startsWith('ind_') && typeof window.__mdIndNav === 'function') return true;
    const b = document.getElementById('menu-btn-rastrear-processo');
    if (!b) return false;
    b.click();
    for (let i = 0; i < 20; i++) { await espera(150); if (String(viewAtual()).startsWith('ind_') && typeof window.__mdIndNav === 'function') return true; }
    return typeof window.__mdIndNav === 'function';
  }

  async function irPara(idx) {
    const v = ler();
    if (!v || !v.etapas[idx]) return;
    if (!(await garantirModuloIndustrial())) return;
    gravar({ ...v, idx, assinatura: '' });
    window.__mdIndNav(v.etapas[idx].route);
    registrarDestino();
  }

  async function voltar() {
    gravar(null);
    remover();
    if (String(viewAtual()).startsWith('ind_') && typeof window.__mdIndIrTracker === 'function') { window.__mdIndIrTracker(); return; }
    const b = document.getElementById('menu-btn-rastrear-processo');
    if (b) b.click();
  }

  function estilos() {
    if (document.getElementById('md-rastrear-nav-style')) return;
    const s = document.createElement('style');
    s.id = 'md-rastrear-nav-style';
    s.textContent = [
      '#md-rastrear-nav{position:fixed;z-index:30;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;padding:8px 14px;background:#0f172a;color:#e2e8f0;border-bottom:3px solid #f59e0b;box-shadow:0 4px 12px rgba(15,23,42,.25);font-family:inherit}',
      '#md-rastrear-nav button{font:inherit;cursor:pointer;border-radius:8px}',
      '#md-rastrear-nav .lado{display:flex;align-items:center;gap:8px;min-width:0;border:1px solid #334155;background:#1e293b;color:#e2e8f0;padding:6px 10px;text-align:left}',
      '#md-rastrear-nav .lado:hover:not(:disabled){border-color:#f59e0b;background:#27364d}#md-rastrear-nav .lado:disabled{opacity:.35;cursor:default}',
      '#md-rastrear-nav .lado.dir{justify-content:flex-end;text-align:right}',
      '#md-rastrear-nav .lado small{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#fbbf24}',
      '#md-rastrear-nav .lado b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#md-rastrear-nav .lado span.s{display:block;font-size:11.5px;color:#94a3b8}',
      '#md-rastrear-nav .lado .seta{font-size:18px;color:#fbbf24;flex-shrink:0}#md-rastrear-nav .txt{min-width:0}',
      '#md-rastrear-nav .meio{text-align:center;min-width:0}',
      '#md-rastrear-nav .meio .etq{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8}',
      '#md-rastrear-nav .meio b{display:block;font-size:13.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px;margin:0 auto}',
      '#md-rastrear-nav .volta{margin-top:4px;border:1px solid #f59e0b;background:#f59e0b;color:#0f172a;font-weight:700;font-size:12px;padding:4px 12px}',
      '@media (max-width:900px){#md-rastrear-nav{grid-template-columns:1fr 1fr}#md-rastrear-nav .meio{grid-column:1 / -1;order:-1}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  let main = null;
  let padOriginal = '';
  function remover() {
    const b = document.getElementById('md-rastrear-nav');
    if (b) b.remove();
    if (main) { main.style.paddingTop = padOriginal; main = null; }
  }

  function render(v) {
    const m = document.getElementById('workspace-main-content');
    if (!m) { remover(); return; }
    estilos();
    let bar = document.getElementById('md-rastrear-nav');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'md-rastrear-nav';
      bar.setAttribute('aria-label', 'Navegação entre as etapas do Rastrear Processo');
      bar.addEventListener('click', (e) => {
        const t = e.target.closest('button[data-acao]');
        if (!t || t.disabled) return;
        const v2 = ler();
        if (t.dataset.acao === 'voltar') voltar();
        else if (v2) irPara(v2.idx + (t.dataset.acao === 'prox' ? 1 : -1));
      });
      document.body.appendChild(bar);
    }
    const ant = v.etapas[v.idx - 1], atual = v.etapas[v.idx], prox = v.etapas[v.idx + 1];
    const lado = (e, acao, rot, dir) => '<button type="button" class="lado' + (dir ? ' dir' : '') + '" data-acao="' + acao + '"' + (e ? '' : ' disabled') + ' title="' + esc(e ? e.name + ' — ' + e.sector : '') + '">' +
      (dir ? '' : '<span class="seta" aria-hidden="true">◀</span>') + '<span class="txt"><small>' + rot + '</small><b>' + esc(e ? e.name : (dir ? 'Última etapa' : 'Primeira etapa')) + '</b>' + (e ? '<span class="s">' + esc(e.sector) + '</span>' : '') + '</span>' + (dir ? '<span class="seta" aria-hidden="true">▶</span>' : '') + '</button>';
    const html = lado(ant, 'ant', 'Anterior', false) +
      '<div class="meio"><div class="etq">Rastrear processo · etapa ' + (v.idx + 1) + ' de ' + v.etapas.length + (v.ordem ? ' · ' + esc(v.ordem) : '') + '</div><b title="' + esc(atual.name + ' — ' + atual.sector) + '">' + esc(atual.name) + ' · ' + esc(atual.sector) + '</b><button type="button" class="volta" data-acao="voltar">↩ Voltar ao Rastrear</button></div>' +
      lado(prox, 'prox', 'Próximo', true);
    if (bar._html !== html) { bar._html = html; bar.innerHTML = html; }
    // posição: no topo da área de trabalho; a área desce para a barra não cobrir o conteúdo
    const r = m.getBoundingClientRect();
    bar.style.left = Math.round(r.left) + 'px'; bar.style.width = Math.round(r.width) + 'px'; bar.style.top = Math.round(r.top) + 'px';
    if (main !== m) { if (main) main.style.paddingTop = padOriginal; main = m; padOriginal = m.style.paddingTop; }
    const alt = bar.offsetHeight + 16;
    if (m.style.paddingTop !== alt + 'px') m.style.paddingTop = alt + 'px';
  }

  function ciclo() {
    const v = ler();
    if (!v || !v.etapas || !v.etapas[v.idx] || !v.assinatura) { remover(); return; }
    if (assinatura() !== v.assinatura) { remover(); return; }
    render(v);
  }
  setInterval(ciclo, 400);
  window.addEventListener('resize', ciclo);
})();
