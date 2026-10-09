/**
 * MotorDesk - Site (página inicial)
 *
 *  - Seção "Dores & Soluções": cada dor do dono de oficina, loja ou fábrica, dita do jeito que ele fala, e logo
 *    embaixo o recurso do MotorDesk que a resolve; filtro por segmento. Entra antes de "Produto & Telas" e
 *    substitui a tabela "Diferenciais vs. Concorrentes". Textos no banco (landingContent.dores, via /api/landing).
 *  - Cabeçalho: cores suaves; ao rolar a página ele fica mais baixo e acompanha a rolagem, e o menu marca a
 *    seção que está na tela.
 *  - A página rola dentro do <body> (não da janela): os links do menu e os atalhos "#" rolam esse contêiner.
 */
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SEGMENTOS = [['todos', 'Todos'], ['oficina', 'Oficina'], ['comercio', 'Comércio'], ['industria', 'Indústria'], ['hibrido', 'Oficina + Comércio']];
  const NOME_SEG = { oficina: 'Oficina', comercio: 'Comércio', industria: 'Indústria', hibrido: 'Oficina + Comércio' };
  const reduzMovimento = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  const noSite = () => document.getElementById('hero') && document.getElementById('produto') && !document.getElementById('sidebar-container');
  function rolador() {
    for (let e = document.getElementById('hero'); e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 4) return e;
    }
    return document.scrollingElement || document.documentElement;
  }
  const cabecalho = () => { const h = document.getElementById('hero'); return h && h.parentElement ? h.parentElement.querySelector(':scope > header') : null; };

  function estilos() {
    if (document.getElementById('md-site-style')) return;
    const s = document.createElement('style');
    s.id = 'md-site-style';
    s.textContent = [
      // o contêiner da página tinha overflow-x:hidden, que impede o cabeçalho "sticky" de acompanhar a rolagem;
      // "clip" corta o que passa da largura sem criar um contêiner de rolagem
      '#md-site-raiz{overflow-x:clip!important}',
      // cabeçalho: tons suaves; ao rolar, mais baixo e um pouco mais escuro
      '#md-site-cab{background:rgba(15,23,42,.72)!important;border-bottom-color:rgba(148,163,184,.12)!important;transition:padding .25s ease,background-color .25s ease,box-shadow .25s ease!important}',
      '#md-site-cab > div{transition:height .25s ease!important}',
      '#md-site-cab nav a{color:#cbd5e1!important;background:transparent!important;border-color:transparent!important;box-shadow:none!important;font-weight:500!important}',
      '#md-site-cab nav a:hover{color:#fff!important;background:rgba(148,163,184,.1)!important}',
      '#md-site-cab nav a .animate-pulse{display:none!important}',
      '#md-site-cab nav a[data-md-ativo]{color:#e0e7ff!important;background:rgba(99,102,241,.16)!important;border-color:rgba(129,140,248,.28)!important;font-weight:600!important}',
      '#md-site-cab .bg-gradient-to-tr{box-shadow:none!important}',
      '#md-site-cab.md-rolado{padding-top:2px!important;padding-bottom:2px!important;background:rgba(2,6,23,.9)!important;box-shadow:0 8px 24px rgba(2,6,23,.35)}',
      '#md-site-cab.md-rolado > div{height:56px!important}',
      '#md-site-cab.md-rolado .bg-gradient-to-tr{padding:6px!important}',
      '#md-site-cab.md-rolado .bg-gradient-to-tr svg{width:18px!important;height:18px!important}',
      '#md-site-cab.md-rolado .text-xl{font-size:1.05rem!important;line-height:1.4rem!important}',
      '#md-site-cab.md-rolado span.block{display:none!important}',
      '#md-site-cab.md-rolado button,#md-site-cab.md-rolado > div > div:last-child a{padding-top:6px!important;padding-bottom:6px!important}',
      // a tabela de comparação dá lugar à seção de dores
      '#diferenciais{display:none!important}',
      // seção dores & soluções
      '#dores{padding:88px 0 96px;border-top:1px solid rgba(148,163,184,.08)}',
      '#dores .wrap{max-width:80rem;margin:0 auto;padding:0 2rem}',
      '#dores .cab{max-width:46rem;margin:0 auto 32px;text-align:center}',
      '#dores .etq{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a5b4fc;background:rgba(99,102,241,.12);border:1px solid rgba(129,140,248,.25);padding:5px 12px;border-radius:999px;margin-bottom:16px}',
      '#dores h2{font-size:clamp(1.75rem,3.2vw,2.5rem);line-height:1.15;font-weight:700;color:#fff;margin:0 0 14px;letter-spacing:-.01em}',
      '#dores .sub{color:#94a3b8;font-size:1.02rem;line-height:1.6;margin:0}',
      '#dores .filtro{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 0 32px}',
      '#dores .filtro button{font:inherit;font-size:13px;font-weight:600;color:#cbd5e1;background:rgba(30,41,59,.6);border:1px solid rgba(148,163,184,.18);border-radius:999px;padding:7px 16px;cursor:pointer;transition:background .15s,color .15s,border-color .15s}',
      '#dores .filtro button:hover{color:#fff;border-color:rgba(148,163,184,.35)}',
      '#dores .filtro button[aria-pressed="true"]{color:#0f172a;background:#e2e8f0;border-color:#e2e8f0}',
      '#dores .filtro button:focus-visible,#dores .fim a:focus-visible{outline:2px solid #818cf8;outline-offset:2px}',
      '#dores .grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}',
      '#dores .card{display:flex;flex-direction:column;background:rgba(30,41,59,.42);border:1px solid rgba(148,163,184,.14);border-radius:18px;overflow:hidden;transition:border-color .2s,transform .2s}',
      '#dores .card:hover{border-color:rgba(148,163,184,.28);transform:translateY(-2px)}',
      '#dores .dor{padding:22px 24px 18px;background:rgba(244,63,94,.05);border-bottom:1px dashed rgba(148,163,184,.18)}',
      '#dores .rem{padding:18px 24px 22px;flex:1;display:flex;flex-direction:column}',
      '#dores .rot{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}',
      '#dores .rot i{width:7px;height:7px;border-radius:50%;display:inline-block}',
      '#dores .rot.d{color:#fda4af}#dores .rot.d i{background:#fb7185}',
      '#dores .rot.r{color:#6ee7b7}#dores .rot.r i{background:#34d399}',
      '#dores .frase{margin:0;color:#f1f5f9;font-size:1.08rem;line-height:1.5;font-weight:500}',
      '#dores h3{margin:0 0 6px;color:#fff;font-size:1.05rem;font-weight:700}',
      '#dores .det{margin:0 0 14px;color:#94a3b8;font-size:.94rem;line-height:1.6}',
      '#dores .pe{margin-top:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
      '#dores .chip{font-size:11.5px;color:#cbd5e1;background:rgba(148,163,184,.1);border:1px solid rgba(148,163,184,.16);border-radius:999px;padding:3px 10px}',
      '#dores .chip.tela{color:#a5b4fc;background:rgba(99,102,241,.1);border-color:rgba(129,140,248,.22)}',
      '#dores .fim{margin-top:40px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between;padding:28px 32px;border-radius:20px;background:linear-gradient(90deg,rgba(99,102,241,.12),rgba(16,185,129,.08));border:1px solid rgba(129,140,248,.2)}',
      '#dores .fim h3{font-size:1.25rem;margin:0 0 4px}#dores .fim p{margin:0;color:#94a3b8;font-size:.96rem;max-width:40rem}',
      '#dores .fim .bts{display:flex;gap:10px;flex-wrap:wrap}',
      '#dores .fim a{font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;padding:11px 18px;transition:background .15s}',
      '#dores .fim a.pri{color:#fff;background:#4f46e5}#dores .fim a.pri:hover{background:#4338ca}',
      '#dores .fim a.sec{color:#e2e8f0;background:rgba(15,23,42,.6);border:1px solid rgba(148,163,184,.25)}#dores .fim a.sec:hover{background:rgba(30,41,59,.9)}',
      '@media (max-width:640px){#md-site-cab .font-mono{display:none!important}}',
      '@media (max-width:640px){#dores{padding:64px 0 72px}#dores .wrap{padding:0 1rem}#dores .grade{grid-template-columns:1fr}#dores .fim{padding:22px 20px}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- seção dores & soluções
  let dados = null, buscando = false, filtro = 'todos';
  function buscar() {
    if (buscando || dados) return;
    buscando = true;
    fetch('/api/landing').then((r) => r.json()).then((j) => { dados = (j && j.landingContent && j.landingContent.dores) || { itens: [] }; desenhar(); })
      .catch(() => {}).finally(() => { buscando = false; });
  }
  const combina = (it) => {
    const s = it.segmentos || [];
    if (filtro === 'todos' || s.includes('todos')) return true;
    if (filtro === 'hibrido') return s.some((x) => ['oficina', 'comercio', 'hibrido'].includes(x));
    return s.includes(filtro);
  };
  function htmlSecao() {
    const d = dados;
    const itens = (d.itens || []).filter(combina);
    return '<div class="wrap"><div class="cab"><span class="etq">' + esc(d.etiqueta || 'A dor e o remédio') + '</span>' +
      '<h2 class="font-display">' + esc(d.titulo) + '</h2><p class="sub">' + esc(d.subtitulo) + '</p></div>' +
      '<div class="filtro" role="group" aria-label="Filtrar por segmento">' + SEGMENTOS.map(([k, n]) => '<button type="button" data-seg="' + k + '" aria-pressed="' + (filtro === k) + '">' + n + '</button>').join('') + '</div>' +
      '<div class="grade">' + itens.map((it) => {
        const segs = (it.segmentos || []).includes('todos') ? ['Todos os segmentos'] : (it.segmentos || []).map((x) => NOME_SEG[x] || x);
        return '<article class="card"><div class="dor"><span class="rot d"><i></i>' + esc(d.rotuloDor || 'A dor') + '</span><p class="frase">“' + esc(it.dor) + '”</p></div>' +
          '<div class="rem"><span class="rot r"><i></i>' + esc(d.rotuloRemedio || 'O remédio') + '</span><h3>' + esc(it.remedio) + '</h3><p class="det">' + esc(it.detalhe) + '</p>' +
          '<div class="pe">' + segs.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + (it.tela ? '<span class="chip tela">Tela: ' + esc(it.tela) + '</span>' : '') + '</div></div></article>';
      }).join('') + '</div>' +
      (d.fechamentoTitulo ? '<div class="fim"><div><h3 class="font-display">' + esc(d.fechamentoTitulo) + '</h3><p>' + esc(d.fechamentoTexto) + '</p></div><div class="bts"><a class="pri" href="/motordesk">Acessar o MotorDesk</a><a class="sec" href="#contato" data-md-ir="contato">Falar com a gente</a></div></div>' : '') +
      '</div>';
  }
  function desenhar() {
    if (!noSite() || !dados || !(dados.itens || []).length) return;
    const produto = document.getElementById('produto');
    let sec = document.getElementById('dores');
    if (!sec) {
      sec = document.createElement('section');
      sec.id = 'dores';
      sec.setAttribute('aria-labelledby', 'dores-titulo');
      sec.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-seg]');
        if (!b) return;
        filtro = b.dataset.seg;
        sec._html = '';
        desenhar();
        const nb = sec.querySelector('button[data-seg="' + filtro + '"]'); if (nb) nb.focus();
      });
    }
    const html = htmlSecao();
    if (sec._html !== html) { sec._html = html; sec.innerHTML = html; const h = sec.querySelector('h2'); if (h) h.id = 'dores-titulo'; }
    if (sec.nextElementSibling !== produto) produto.parentElement.insertBefore(sec, produto);
  }

  // ---------------------------------------------------------------- cabeçalho e rolagem
  function irPara(id) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    const r = rolador();
    const cab = cabecalho();
    const topo = alvo.getBoundingClientRect().top - (r === document.scrollingElement ? 0 : r.getBoundingClientRect().top) + r.scrollTop - (cab ? 64 : 0);
    r.scrollTo({ top: Math.max(0, topo), behavior: reduzMovimento() ? 'auto' : 'smooth' });
  }
  // o menu do site usa window.scrollTo, mas quem rola é o <body>: os links "#" passam por aqui
  document.addEventListener('click', (e) => {
    if (!noSite()) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = (a.getAttribute('href') || '').slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault(); e.stopPropagation();
    irPara(id);
    marcarAtivo(id);
  }, true);

  let ativoFixo = '', fixoAte = 0;
  function marcarAtivo(fixar) {
    const cab = cabecalho();
    if (!cab) return;
    if (fixar) { ativoFixo = fixar; fixoAte = Date.now() + 900; }
    let atual = 'hero';
    if (Date.now() < fixoAte) atual = ativoFixo;
    else {
      const ids = [...cab.querySelectorAll('nav a[href^="#"]')].map((a) => a.getAttribute('href').slice(1));
      for (const id of ids) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) atual = id; }
    }
    cab.querySelectorAll('nav a[href^="#"]').forEach((a) => { if (a.getAttribute('href') === '#' + atual) a.setAttribute('data-md-ativo', ''); else a.removeAttribute('data-md-ativo'); });
  }

  let rolGuardado = null;
  function aoRolar() {
    const cab = cabecalho();
    if (!cab) return;
    const r = rolador();
    cab.classList.toggle('md-rolado', (r.scrollTop || window.scrollY || 0) > 24);
    marcarAtivo();
  }

  function ciclo() {
    if (!noSite()) return;
    estilos();
    const cab = cabecalho();
    if (cab && cab.id !== 'md-site-cab') cab.id = 'md-site-cab';
    const raiz = document.getElementById('hero').parentElement;
    if (raiz && raiz.id !== 'md-site-raiz' && !raiz.id) raiz.id = 'md-site-raiz';
    if (cab) {
      // o subtítulo antigo falava só de oficina
      const sub = [...cab.querySelectorAll('span.block')].find((x) => /Gestão de Oficina/i.test(x.textContent || ''));
      if (sub) sub.textContent = 'Oficina · Comércio · Indústria';
    }
    const r = rolador();
    if (r !== rolGuardado) {
      if (rolGuardado) (rolGuardado === document.scrollingElement ? window : rolGuardado).removeEventListener('scroll', aoRolar);
      (r === document.scrollingElement ? window : r).addEventListener('scroll', aoRolar, { passive: true });
      rolGuardado = r;
    }
    buscar();
    desenhar();
    aoRolar();
  }
  setInterval(ciclo, 800);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ciclo); else ciclo();
})();
