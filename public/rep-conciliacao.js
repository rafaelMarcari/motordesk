/**
 * MotorDesk - Conciliação de Pedidos da Representação
 *
 *  - Pedidos: informar o número que a representada devolve depois de digitar o pedido no sistema dela
 *    (um pedido pode virar vários na representada).
 *  - Importar planilha: a planilha de fechamento (XLSX, XLS, CSV) é lida no navegador, as colunas são
 *    reconhecidas e o servidor cruza com os pedidos. A prévia mostra, por cores, o que fechou, o que é
 *    parcial, o que só foi recebido, divergências, sugestões e linhas sem pedido. Nada é gravado até
 *    a confirmação.
 *  - Histórico das conciliações confirmadas.
 * Regras e permissões são conferidas no servidor (/api/representacao).
 */
(function () {
  'use strict';

  const API = '/api/representacao';
  const XLSX_SRC = '/vendor/xlsx-0.20.3.full.min.js';

  const STATUS = {
    conciliado: ['Conciliado', '#047857', '#d1fae5', '#f0fdf4'],
    parcial: ['Faturado parcial', '#b45309', '#fef3c7', '#fffbeb'],
    recebido: ['Recebido, sem faturar', '#1d4ed8', '#dbeafe', '#eff6ff'],
    divergente: ['Divergência', '#b91c1c', '#fee2e2', '#fef2f2'],
    sugestao: ['Sugestão — conferir', '#6d28d9', '#ede9fe', '#f5f3ff'],
    nao_consta: ['Não consta na planilha', '#475569', '#e2e8f0', '#f8fafc'],
  };
  const METODO = {
    numero_representada: 'pelo nº da representada',
    nosso_numero: 'pelo nº do nosso pedido',
    mesmo_pedido_representada: 'mesmo pedido da representada',
    sugestao: 'cliente e valores',
    manual: 'vínculo manual',
  };
  const SITUACAO_PEDIDO = {
    CONCILIADO: ['Conciliado', '#047857', '#d1fae5'],
    PARCIAL: ['Faturado parcial', '#b45309', '#fef3c7'],
    RECEBIDO: ['Recebido, sem faturar', '#1d4ed8', '#dbeafe'],
    DIVERGENTE: ['Divergência', '#b91c1c', '#fee2e2'],
  };
  const CAMPOS = [
    ['pedidoRepresentada', 'Nº do pedido na representada', [/(ped|ordem).*(fab|repres|forn|interno|sistema)/, /^(n|no|nr|num|numero)?\s*(do\s*)?ped(ido)?$/, /^pedido\s*(n|no|nr|numero)?$/, /^ov$|ordem de venda/]],
    ['nossoPedido', 'Nº do nosso pedido (MotorDesk)', [/(seu|vosso|nosso)\s*ped/, /ped.*(cliente|representante|vendedor|compra|motordesk)/, /ped.*rep(r|$)/, /^(oc|ordem de compra)$/, /^ref(erencia)?\b/]],
    ['cliente', 'Cliente', [/cliente|razao|destinat|comprador|^nome/]],
    ['documento', 'CNPJ/CPF do cliente', [/cnpj|cpf|documento/]],
    ['dataPedido', 'Data do pedido', [/(data|dt).*(ped|digit|entrada)/, /^data$/]],
    ['valorPedido', 'Valor do pedido', [/(val|vlr|total).*ped/, /^(valor|total|vlr)$/]],
    ['notaFiscal', 'Nº da nota fiscal', [/^(n|no|nr|num|numero)?\s*(da\s*)?(nf|nfe|nota|nota fiscal|danfe)$/, /^nf\b|nota fiscal|^nota$/]],
    ['dataFaturamento', 'Data do faturamento', [/(data|dt).*(fat|nf|nota|emiss)/, /faturad[oa] em|emissao/]],
    ['valorFaturado', 'Valor faturado', [/(val|vlr|total).*(fat|nf|nota)/, /^faturado$|valor faturado/]],
    ['situacao', 'Situação na representada', [/situa|status|posicao|etapa/]],
  ];

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDia = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : (iso || '—'));
  const fmtData = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const user = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; } };
  const companyId = () => { try { const u = user() || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  const isMaster = (u) => u && (['admin', 'validador'].includes(String(u.username || '').toLowerCase()) || u.role === 'qa');
  const perm = (u, key) => {
    if (!u) return false;
    if (isMaster(u)) return true;
    const p = Object.assign({}, u.permissions || {}, u.individualExceptions || {}, u.customPermissions || {});
    if (p[key] === false) return false;
    return p[key] === true || u.role === 'admin';
  };
  const podeVer = (u) => perm(u, 'accessRepresentativeOrders') || perm(u, 'accessRepresentativeCommerce');
  const podeConciliar = (u) => ['representativeReconcile', 'representativeReconciliationApprove', 'representativeOrdersEdit'].some((k) => perm(u, k));

  async function api(method, path, body) {
    const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || data.success === false) throw new Error((data && data.error) || 'Erro HTTP ' + res.status);
    return data;
  }
  const syncApp = () => { try { if (window.__motorDeskSyncNow) window.__motorDeskSyncNow('representacao'); } catch (e) {} };

  let xlsxPromise = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) {
      xlsxPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = XLSX_SRC;
        s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error('Leitor de planilhas indisponível.')));
        s.onerror = () => { xlsxPromise = null; reject(new Error('Não foi possível carregar o leitor de planilhas.')); };
        document.head.appendChild(s);
      });
    }
    return xlsxPromise;
  }

  // ---------------------------------------------------------------------------
  // Estilos
  // ---------------------------------------------------------------------------
  function ensureStyles() {
    if (document.getElementById('md-rep-style')) return;
    const st = document.createElement('style');
    st.id = 'md-rep-style';
    st.textContent = [
      '#md-rep{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}',
      '#md-rep .p{background:#fff;width:100%;max-width:1320px;height:calc(100vh - 24px);display:flex;flex-direction:column;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden}',
      '#md-rep .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-bottom:1px solid #e2e8f0}',
      '#md-rep h2{margin:0;font-size:18px}#md-rep .sub{margin:2px 0 0;font-size:13px;color:#64748b}',
      '#md-rep .x{border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer}',
      '#md-rep .tabs{display:flex;gap:2px;padding:0 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;overflow-x:auto}',
      '#md-rep .tab{border:0;background:none;padding:11px 13px;font-size:13.5px;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}',
      '#md-rep .tab[aria-selected=true]{color:#4338ca;border-bottom-color:#4338ca}',
      '#md-rep .bd{padding:16px 20px;overflow:auto;flex:1}',
      '#md-rep section{margin-bottom:18px}#md-rep h3{font-size:14.5px;margin:0 0 8px}',
      '#md-rep .t{font-size:13px;color:#475569;margin:0 0 10px;line-height:1.5}',
      '#md-rep .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}',
      '#md-rep label.f{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600;color:#334155}',
      '#md-rep input,#md-rep select{font:inherit;font-size:13.5px;font-weight:400;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#0f172a;min-width:0}',
      '#md-rep input[type=checkbox]{padding:0;width:16px;height:16px;cursor:pointer}',
      '#md-rep .box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;background:#f8fafc}',
      '#md-rep .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '#md-rep .btn{border:0;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;background:#4f46e5;color:#fff}',
      '#md-rep .btn.s{background:#e2e8f0;color:#1e293b}#md-rep .btn.g{background:#047857}#md-rep .btn.sm{padding:5px 9px;font-size:12px}#md-rep .btn:disabled{opacity:.55;cursor:default}',
      '#md-rep .tw{overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px}',
      '#md-rep table{border-collapse:collapse;width:100%;font-size:12.5px}',
      '#md-rep th,#md-rep td{text-align:left;padding:7px 8px;border-bottom:1px solid #eef2f7;vertical-align:top}',
      '#md-rep th{background:#f8fafc;font-size:11.5px;color:#475569;position:sticky;top:0;z-index:1}#md-rep td.r,#md-rep th.r{text-align:right;white-space:nowrap}',
      '#md-rep .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap}',
      '#md-rep .chip{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700;margin:1px 3px 1px 0}',
      '#md-rep .chip.novo{background:#dcfce7;color:#166534}#md-rep .chip button{border:0;background:none;cursor:pointer;color:inherit;font-size:13px;line-height:1;padding:0 3px}',
      '#md-rep .numin{width:120px;padding:4px 7px;font-size:12.5px}',
      '#md-rep .msg{font-size:13px;margin-top:8px;line-height:1.5}#md-rep .ok{color:#047857}#md-rep .bad{color:#b91c1c}',
      '#md-rep .info{border:1px solid #c7d2fe;background:#eef2ff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;line-height:1.5}',
      '#md-rep .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px}',
      '#md-rep .card{border-radius:10px;padding:9px 11px;border:1px solid transparent;cursor:pointer;text-align:left;font:inherit}',
      '#md-rep .card span{display:block;font-size:11.5px;font-weight:700}#md-rep .card b{font-size:20px}#md-rep .card small{display:block;font-size:11.5px;opacity:.85}',
      '#md-rep .card[aria-pressed=true]{outline:2px solid #0f172a}',
      '#md-rep .tot{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:12px}',
      '#md-rep .tot div{border:1px solid #e2e8f0;border-radius:8px;padding:6px 9px;background:#fff}#md-rep .tot span{display:block;font-size:11px;color:#64748b}#md-rep .tot b{font-size:14px}',
      '#md-rep .muted{color:#64748b;font-size:12px}#md-rep .warn{color:#b91c1c;font-size:12px;font-weight:600}',
      '#md-rep .drop{border:2px dashed #94a3b8;border-radius:12px;padding:22px;text-align:center;cursor:pointer;background:#f8fafc}#md-rep .drop.on{border-color:#4f46e5;background:#eef2ff}',
      '#md-rep .legend{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}',
      '#md-rep .sticky-actions{position:sticky;bottom:-16px;background:#fff;border-top:1px solid #e2e8f0;padding:10px 0;margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}',
      '#md-rep .nfs div{white-space:nowrap}',
      '#md-rep .motivo{display:flex;flex-direction:column;gap:5px;min-width:230px;background:#fff;border:1px solid #fca5a5;border-radius:8px;padding:7px}',
      '#menu-btn-rep-conciliacao{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:0;background:none;color:#cbd5e1;font-size:12px;font-weight:600;letter-spacing:.02em;cursor:pointer;text-align:left}',
      '#menu-btn-rep-conciliacao:hover{background:#1e293b;color:#fff}#menu-btn-rep-conciliacao svg{width:16px;height:16px;flex-shrink:0;color:#a78bfa}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  let root = null;
  let tab = 'pedidos';
  let pedidos = [];
  let representadas = [];
  let filtro = { texto: '', representada: '', situacao: '' };
  const imp = { arquivo: '', planilhas: [], aba: '', matriz: [], cabecalho: 0, colunas: [], mapa: {}, linhas: [], opcoes: { representadaId: '', de: '', ate: '', toleranciaValor: 1, toleranciaPercentual: 0.5, vinculos: {}, ignorar: [] }, resultado: null, marcados: new Set(), filtroStatus: '', wb: null, baixasLinhas: {}, baixasPedidos: {}, soPendencias: false };

  function open(initialTab) {
    ensureStyles();
    if (root) root.remove();
    tab = initialTab || tab;
    root = document.createElement('div');
    root.id = 'md-rep';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Conciliação de Pedidos');
    const tabs = [['pedidos', 'Pedidos e nº da representada'], ['importar', 'Importar planilha de fechamento'], ['pendencias', 'Pendências'], ['historico', 'Histórico de conciliações']];
    root.innerHTML = '<div class="p"><div class="hd"><div><h2>Conciliação de Pedidos</h2><p class="sub">Pedidos enviados às representadas × pedidos recebidos e faturados por elas.</p></div><button type="button" class="x" data-act="close" aria-label="Fechar">×</button></div>' +
      '<div class="tabs" role="tablist">' + tabs.map((t) => '<button type="button" class="tab" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div class="bd" data-body></div></div>';
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    root.addEventListener('keydown', onKeyInside);
    root.addEventListener('dragover', (e) => { const d = e.target.closest && e.target.closest('.drop'); if (d) { e.preventDefault(); d.classList.add('on'); } });
    root.addEventListener('dragleave', (e) => { const d = e.target.closest && e.target.closest('.drop'); if (d) d.classList.remove('on'); });
    root.addEventListener('drop', (e) => { const d = e.target.closest && e.target.closest('.drop'); if (d) { e.preventDefault(); d.classList.remove('on'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) lerArquivo(f); } });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    render();
  }
  function close() { if (root) root.remove(); root = null; document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape' && root && !(document.activeElement && root.contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) close(); }
  const body = () => root && root.querySelector('[data-body]');

  function render() {
    if (!root) return;
    root.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (tab === 'pedidos') renderPedidos();
    else if (tab === 'importar') renderImportar();
    else if (tab === 'pendencias') renderPendencias();
    else renderHistorico();
  }

  const badge = (cor, texto) => '<span class="badge" style="color:' + cor[1] + ';background:' + cor[2] + '">' + esc(texto || cor[0]) + '</span>';
  function situacaoPedido(p) {
    if (/CANCEL/i.test(p.status)) return ['Cancelado', '#7f1d1d', '#fecaca'];
    if (p.conciliacao === 'BAIXA_MANUAL') return ['Baixa manual', '#334155', '#e2e8f0'];
    if (SITUACAO_PEDIDO[p.conciliacao]) return SITUACAO_PEDIDO[p.conciliacao];
    if (/DIGITA|RASCUNHO/i.test(p.status)) return ['Em digitação', '#475569', '#e2e8f0'];
    if (p.numerosRepresentada.length === 0) return ['Aguardando nº da representada', '#92400e', '#ffedd5'];
    return ['Recebido pela representada', '#1d4ed8', '#dbeafe'];
  }

  // ---------------------------------------------------------------------------
  // Aba: pedidos e números da representada
  // ---------------------------------------------------------------------------
  async function carregarPedidos() {
    const r = await api('GET', '/pedidos');
    pedidos = r.pedidos || [];
    representadas = r.representadas || [];
  }

  async function renderPedidos() {
    const b = body();
    b.innerHTML = '<p class="t">Carregando pedidos…</p>';
    try { await carregarPedidos(); } catch (err) { b.innerHTML = '<p class="msg bad">' + esc(err.message) + '</p>'; return; }
    if (tab !== 'pedidos' || !root) return;
    b.innerHTML = '<div class="info">Depois que a representada digitar o pedido no sistema dela, informe aqui o número que ela devolveu. ' +
      'Se o pedido foi desdobrado, informe todos os números. Na importação da planilha de fechamento esses números ligam as linhas aos pedidos automaticamente.</div>' +
      '<div class="row" style="margin-bottom:10px"><input type="search" data-f="texto" placeholder="Buscar pedido, cliente ou nº da representada" style="flex:1;min-width:220px" value="' + esc(filtro.texto) + '">' +
      '<select data-f="representada"><option value="">Todas as representadas</option>' + representadas.map((r) => '<option value="' + esc(r.id) + '"' + (filtro.representada === r.id ? ' selected' : '') + '>' + esc(r.nome) + '</option>').join('') + '</select>' +
      '<select data-f="situacao"><option value="">Todas as situações</option><option value="sem_numero">Aguardando nº da representada</option><option value="recebido">Recebido pela representada</option><option value="PARCIAL">Faturado parcial</option><option value="CONCILIADO">Conciliado</option><option value="DIVERGENTE">Divergência</option></select>' +
      '<button type="button" class="btn s" data-act="exportar-pedidos">Exportar Excel</button></div>' +
      '<div data-lista></div>';
    b.querySelector('[data-f="situacao"]').value = filtro.situacao;
    renderListaPedidos();
  }

  function pedidosFiltrados() {
    const t = norm(filtro.texto);
    return pedidos.filter((p) => {
      if (filtro.representada && p.representadaId !== filtro.representada && ('nome:' + p.representada) !== filtro.representada) return false;
      if (filtro.situacao) {
        const sem = p.numerosRepresentada.length === 0 && !p.conciliacao && !/CANCEL|DIGITA/i.test(p.status);
        if (filtro.situacao === 'sem_numero' && !sem) return false;
        if (filtro.situacao === 'recebido' && (sem || p.conciliacao || /CANCEL|DIGITA/i.test(p.status))) return false;
        if (['PARCIAL', 'CONCILIADO', 'DIVERGENTE'].includes(filtro.situacao) && p.conciliacao !== filtro.situacao) return false;
      }
      if (t && !norm([p.numero, p.cliente, p.representada, p.documento, p.numerosRepresentada.join(' ')].join(' ')).includes(t)) return false;
      return true;
    });
  }

  function renderListaPedidos() {
    const el = body() && body().querySelector('[data-lista]');
    if (!el) return;
    const lista = pedidosFiltrados();
    if (pedidos.length === 0) { el.innerHTML = '<p class="t">Nenhum pedido de representação nesta empresa. Os pedidos digitados em "Pedidos Realizados" aparecem aqui.</p>'; return; }
    if (lista.length === 0) { el.innerHTML = '<p class="t">Nenhum pedido com esses filtros.</p>'; return; }
    el.innerHTML = '<div class="tw"><table><thead><tr><th>Pedido</th><th>Data</th><th>Representada</th><th>Cliente</th><th class="r">Valor</th><th>Nº na representada</th><th class="r">Faturado</th><th>Situação</th></tr></thead><tbody>' +
      lista.map((p) => '<tr data-id="' + esc(p.id) + '"><td><b>' + esc(p.numero) + '</b></td><td>' + fmtDia(p.data) + '</td><td>' + esc(p.representada || '—') + '</td><td>' + esc(p.cliente) + '</td><td class="r">' + money(p.valor) + '</td>' +
        '<td>' + p.numerosRepresentada.map((n) => '<span class="chip">' + esc(n) + '<button type="button" data-act="rm-num" data-num="' + esc(n) + '" aria-label="Remover número ' + esc(n) + '">×</button></span>').join('') +
        (/CANCEL/i.test(p.status) ? '' : '<input class="numin" data-num-input placeholder="+ nº e Enter" aria-label="Número do pedido na representada">') + '<div class="msg" data-rowmsg style="margin:0"></div></td>' +
        '<td class="r">' + (p.faturado ? money(p.faturado) : '—') + '</td><td>' + badge(situacaoPedido(p)) + '</td></tr>').join('') +
      '</tbody></table></div><p class="muted" style="margin-top:6px">' + lista.length + ' pedido(s).</p>';
  }

  async function salvarNumeros(id, numeros, input) {
    const tr = body().querySelector('tr[data-id="' + CSS.escape(id) + '"]');
    const msg = tr && tr.querySelector('[data-rowmsg]');
    if (input) input.disabled = true;
    try {
      const r = await api('PUT', '/pedidos/' + encodeURIComponent(id) + '/numeros', { numeros });
      const p = pedidos.find((x) => x.id === id);
      if (p) { p.numerosRepresentada = r.numerosRepresentada; p.status = r.status; }
      renderListaPedidos();
      const novo = body().querySelector('tr[data-id="' + CSS.escape(id) + '"] [data-num-input]');
      if (novo && input) novo.focus();
      syncApp();
    } catch (err) {
      if (msg) { msg.className = 'msg bad'; msg.textContent = err.message; }
      if (input) input.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Aba: importar planilha
  // ---------------------------------------------------------------------------
  function renderImportar() {
    const b = body();
    const o = imp.opcoes;
    const passo1 = '<section class="box"><h3>1. Planilha de fechamento</h3>' +
      '<p class="t">Arquivo Excel (.xlsx ou .xls) ou CSV enviado pela representada com os pedidos recebidos e faturados. Pedidos desdobrados em vários pedidos ou notas são agrupados.</p>' +
      '<div class="grid" style="margin-bottom:10px"><label class="f">Representada<select data-o="representadaId"><option value="">Todas</option>' + representadas.map((r) => '<option value="' + esc(r.id) + '"' + (o.representadaId === r.id ? ' selected' : '') + '>' + esc(r.nome) + '</option>').join('') + '</select></label>' +
      '<label class="f">Pedidos de (data)<input type="date" data-o="de" value="' + esc(o.de) + '"></label><label class="f">até<input type="date" data-o="ate" value="' + esc(o.ate) + '"></label>' +
      '<label class="f">Tolerância (R$)<input type="number" min="0" step="0.01" data-o="toleranciaValor" value="' + esc(o.toleranciaValor) + '"></label><label class="f">Tolerância (%)<input type="number" min="0" step="0.1" data-o="toleranciaPercentual" value="' + esc(o.toleranciaPercentual) + '"></label></div>' +
      '<div class="drop" data-act="escolher-arquivo" tabindex="0" role="button"><b>' + (imp.arquivo ? 'Arquivo: ' + esc(imp.arquivo) : 'Clique para escolher a planilha ou arraste o arquivo para cá') + '</b><div class="muted">XLSX, XLS, ODS ou CSV</div></div>' +
      '<input type="file" data-file accept=".xlsx,.xls,.xlsm,.ods,.csv,.txt" hidden>' +
      (imp.planilhas.length > 1 ? '<label class="f" style="margin-top:10px;max-width:320px">Aba da planilha<select data-aba>' + imp.planilhas.map((n) => '<option' + (n === imp.aba ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label>' : '') +
      (imp.soPendencias ? '<div class="info" style="margin-top:10px">Conciliando somente as <b>pendências de fechamentos anteriores</b>. Para incluir uma planilha nova, escolha o arquivo acima.</div>' : '') +
      '<div class="msg" data-imsg></div></section>';
    let passo2 = '';
    if (imp.colunas.length) {
      const opts = (sel) => '<option value="">(não usar)</option>' + imp.colunas.map((c, i) => '<option value="' + i + '"' + (String(sel) === String(i) ? ' selected' : '') + '>' + esc(c || 'Coluna ' + (i + 1)) + '</option>').join('');
      const amostra = imp.linhas.slice(0, 5);
      passo2 = '<section class="box"><h3>2. Colunas da planilha</h3><p class="t">As colunas foram reconhecidas pelo cabeçalho (linha ' + (imp.cabecalho + 1) + '). Ajuste se precisar. É preciso ao menos o nº do pedido (da representada ou o nosso) ou o cliente, e o valor.</p>' +
        '<div class="grid">' + CAMPOS.map((c) => '<label class="f">' + esc(c[1]) + '<select data-map="' + c[0] + '">' + opts(imp.mapa[c[0]]) + '</select></label>').join('') + '</div>' +
        '<h3 style="margin-top:12px">Prévia (' + imp.linhas.length + ' linhas)</h3><div class="tw"><table><thead><tr>' + CAMPOS.filter((c) => imp.mapa[c[0]] !== undefined && imp.mapa[c[0]] !== '').map((c) => '<th>' + esc(c[1]) + '</th>').join('') + '</tr></thead><tbody>' +
        amostra.map((l) => '<tr>' + CAMPOS.filter((c) => imp.mapa[c[0]] !== undefined && imp.mapa[c[0]] !== '').map((c) => '<td>' + esc(l[c[0]]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
        '<div class="row" style="margin-top:12px"><button type="button" class="btn" data-act="analisar">Analisar e conciliar</button><span class="muted">Nada é gravado nesta etapa.</span></div><div class="msg" data-amsg></div></section>';
    }
    b.innerHTML = passo1 + passo2 + '<div data-resultado></div>';
    if (imp.resultado) renderResultado();
    if (representadas.length === 0) carregarPedidos().then(() => { if (tab === 'importar' && representadas.length) renderImportar(); }).catch(() => {});
  }

  async function lerArquivo(file) {
    const msg = body().querySelector('[data-imsg]');
    if (msg) { msg.className = 'msg'; msg.textContent = 'Lendo a planilha…'; }
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('Arquivo grande demais (máximo 15 MB).');
      const XLSX = await loadXlsx();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: false, codepage: 1252 });
      imp.wb = wb;
      imp.soPendencias = false;
      imp.arquivo = file.name;
      imp.planilhas = wb.SheetNames.slice();
      imp.aba = wb.SheetNames.find((n) => { const ws = wb.Sheets[n]; return ws && ws['!ref']; }) || wb.SheetNames[0];
      imp.resultado = null;
      imp.opcoes.vinculos = {};
      imp.opcoes.ignorar = [];
      prepararAba();
      renderImportar();
    } catch (err) {
      if (msg) { msg.className = 'msg bad'; msg.textContent = err.message || 'Não foi possível ler a planilha.'; }
    }
  }

  function prepararAba() {
    const XLSX = window.XLSX;
    const ws = imp.wb && imp.wb.Sheets[imp.aba];
    const matriz = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false }) : [];
    imp.matriz = matriz;
    // Cabeçalho: a linha (entre as 20 primeiras) com mais colunas reconhecidas
    let melhor = 0, pontos = -1;
    for (let i = 0; i < Math.min(20, matriz.length); i++) {
      const cels = (matriz[i] || []).map((c) => norm(c));
      const textos = cels.filter((c) => c && !/^[\d .,]+$/.test(c)).length;
      const reconhecidas = cels.filter((c) => c && CAMPOS.some((f) => f[2].some((re) => re.test(c)))).length;
      const p = reconhecidas * 10 + textos;
      if (p > pontos) { pontos = p; melhor = i; }
    }
    imp.cabecalho = melhor;
    imp.colunas = (matriz[melhor] || []).map((c) => String(c == null ? '' : c).trim());
    imp.mapa = detectarMapa(imp.colunas);
    montarLinhas();
  }

  function detectarMapa(colunas) {
    const mapa = {};
    const usadas = new Set();
    const cols = colunas.map(norm);
    // Primeiro o nosso pedido (cabeçalhos como "seu pedido" também casam com "pedido")
    const ordem = ['nossoPedido', 'pedidoRepresentada', 'documento', 'cliente', 'notaFiscal', 'dataFaturamento', 'dataPedido', 'valorFaturado', 'valorPedido', 'situacao'];
    for (const campo of ordem) {
      const def = CAMPOS.find((c) => c[0] === campo);
      for (const re of def[2]) {
        const i = cols.findIndex((c, idx) => c && !usadas.has(idx) && re.test(c));
        if (i >= 0) { mapa[campo] = String(i); usadas.add(i); break; }
      }
    }
    return mapa;
  }

  function montarLinhas() {
    const XLSX = window.XLSX;
    const linhas = [];
    for (let i = imp.cabecalho + 1; i < imp.matriz.length; i++) {
      const row = imp.matriz[i] || [];
      const l = { linha: i + 1 };
      let algum = false;
      for (const [campo] of CAMPOS) {
        const idx = imp.mapa[campo];
        if (idx === undefined || idx === '') continue;
        let v = row[Number(idx)];
        if (v instanceof Date) v = v.toISOString().slice(0, 10);
        if (typeof v === 'number' && /^data/.test(campo) && XLSX && XLSX.SSF) {
          const d = XLSX.SSF.parse_date_code(v);
          if (d) v = d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0');
        }
        l[campo] = v == null ? '' : v;
        if (String(l[campo]).trim()) algum = true;
      }
      // Linhas de total/rodapé: sem pedido, sem nota e sem cliente
      if (!algum) continue;
      if (!l.pedidoRepresentada && !l.nossoPedido && !l.notaFiscal && !l.cliente && !l.documento) continue;
      linhas.push(l);
    }
    imp.linhas = linhas;
  }

  // Linhas enviadas ao servidor: as da planilha (ou nenhuma, para conciliar só as pendências anteriores)
  const linhasEnvio = () => (imp.soPendencias ? [] : imp.linhas);
  const opcoesEnvio = () => Object.assign({}, imp.opcoes, { ignorar: Object.keys(imp.baixasLinhas).map(Number) });

  async function analisar(btn) {
    const msg = body().querySelector('[data-amsg]') || body().querySelector('[data-imsg]');
    if (!imp.soPendencias) {
      if (!imp.linhas.length) { msg.className = 'msg bad'; msg.textContent = 'Nenhuma linha com pedido, nota ou cliente nas colunas escolhidas.'; return; }
      if (!['pedidoRepresentada', 'nossoPedido', 'cliente', 'documento'].some((c) => imp.mapa[c] !== undefined && imp.mapa[c] !== '')) {
        msg.className = 'msg bad'; msg.textContent = 'Escolha a coluna do nº do pedido (da representada ou o nosso) ou a do cliente.'; return;
      }
    }
    if (btn) btn.disabled = true;
    if (msg) { msg.className = 'msg'; msg.textContent = 'Analisando…'; }
    try {
      const anterior = imp.resultado;
      imp.resultado = await api('POST', '/conciliacao/analisar', { linhas: linhasEnvio(), opcoes: opcoesEnvio() });
      // Marcados por padrão: o que fechou, parciais e recebidos; sugestões e divergências pedem conferência
      // Ao reanalisar (vínculo manual, baixa, tolerância) mantém as escolhas já feitas
      const antes = imp.marcados;
      const padrao = (p) => (anterior ? antes.has(p.id) || p.metodo === 'manual' : ['conciliado', 'parcial', 'recebido'].includes(p.status));
      imp.marcados = new Set(imp.resultado.pedidos.filter((p) => p.linhas.length && padrao(p) && !imp.baixasPedidos[p.id]).map((p) => p.id));
      if (msg) msg.textContent = '';
      renderResultado();
      const r = body().querySelector('[data-resultado]');
      if (r && !anterior) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (msg) { msg.className = 'msg bad'; msg.textContent = err.message; }
    } finally { if (btn) btn.disabled = false; }
  }

  function nfsHtml(p) {
    const ant = p.notasAnteriores.map((n) => '<div class="muted">NF ' + esc(n.numero || '—') + ' · ' + money(n.valor) + ' (conciliação anterior)</div>').join('');
    return '<div class="nfs">' + p.notas.map((n) => '<div>NF <b>' + esc(n.numero || '—') + '</b> · ' + fmtDia(n.data) + ' · ' + money(n.valor) + (n.pedidoRepresentada ? ' <span class="muted">(ped. ' + esc(n.pedidoRepresentada) + ')</span>' : '') + '</div>').join('') + ant + (p.notas.length || ant ? '' : '<span class="muted">—</span>') + '</div>';
  }

  // Formulário de motivo (baixa manual): motivos comuns + descrição
  const MOTIVOS_LINHA = ['Pedido de outro representante', 'Bonificação / amostra sem pedido', 'Linha de total ou cabeçalho da planilha', 'Já conciliado em outro fechamento', 'Outro motivo'];
  const MOTIVOS_REABRIR = ['Baixa feita por engano', 'A representada ainda vai faturar', 'Outro motivo'];
  const MOTIVOS_PEDIDO = ['Cancelado pelo cliente', 'Cancelado pela representada', 'Pedido digitado em duplicidade', 'Não será faturado pela representada', 'Outro motivo'];
  function motivoForm(tipo, chave, rotuloBotao) {
    const lista = /pedido/.test(tipo) ? MOTIVOS_PEDIDO : tipo === 'pend-reabrir' ? MOTIVOS_REABRIR : MOTIVOS_LINHA;
    return '<div class="motivo" data-motivo-form="' + tipo + '" data-chave="' + esc(chave) + '"><select data-mot="base">' + lista.map((m) => '<option>' + esc(m) + '</option>').join('') + '</select>' +
      '<input data-mot="detalhe" maxlength="250" placeholder="Descreva o motivo (obrigatório em &quot;Outro motivo&quot;)">' +
      '<div class="row"><button type="button" class="btn sm" style="background:#b91c1c" data-act="motivo-ok">' + esc(rotuloBotao || 'Dar baixa') + '</button><button type="button" class="btn s sm" data-act="motivo-cancelar">Voltar</button></div><div class="msg" data-mot-msg style="margin:0"></div></div>';
  }
  function lerMotivo(form) {
    const base = form.querySelector('[data-mot="base"]').value;
    const det = form.querySelector('[data-mot="detalhe"]').value.trim();
    if (base === 'Outro motivo' && !det) return '';
    return det ? (base === 'Outro motivo' ? det : base + ': ' + det) : base;
  }
  const tagPendente = (l) => (l.pendenteId ? '<div><span class="badge" style="color:#9a3412;background:#ffedd5">pendente desde ' + fmtDia(String(l.pendenteDesde || '').slice(0, 10)) + '</span>' + (l.pendenteArquivo ? '<div class="muted">' + esc(l.pendenteArquivo) + '</div>' : '') + '</div>' : '');

  function renderResultado() {
    const el = body().querySelector('[data-resultado]');
    const r = imp.resultado;
    if (!el || !r) return;
    const s = r.resumo;
    const card = (key, n, extra) => { const c = STATUS[key]; return '<button type="button" class="card" data-filtro="' + key + '" aria-pressed="' + (imp.filtroStatus === key) + '" style="background:' + c[2] + ';color:' + c[1] + ';border-color:' + c[1] + '33"><span>' + c[0] + '</span><b>' + n + '</b>' + (extra ? '<small>' + extra + '</small>' : '') + '</button>'; };
    const lista = r.pedidos.filter((p) => !imp.filtroStatus || p.status === imp.filtroStatus);
    const semPedido = r.linhas.filter((l) => l.status === 'sem_pedido');
    const baixadasAqui = r.linhas.filter((l) => imp.baixasLinhas[l.linha]);
    const pendAnteriores = r.linhas.filter((l) => l.pendenteId).length;
    const opcoesPedido = pedidos.length ? pedidos : r.pedidos;
    const selecionados = r.pedidos.filter((p) => imp.marcados.has(p.id));
    const podeConf = podeConciliar(user());
    el.innerHTML = '<section><h3>3. Resultado da conciliação — confira antes de confirmar</h3>' +
      '<div class="info">O que não for confirmado agora fica <b>pendente</b> e volta automaticamente na próxima importação, até ser conciliado ou receber <b>baixa manual com motivo</b>.' + (pendAnteriores ? ' Esta análise inclui <b>' + pendAnteriores + '</b> linha(s) pendente(s) de fechamentos anteriores.' : '') + '</div>' +
      '<div class="cards">' + card('conciliado', s.conciliados, 'faturado = pedido') + card('parcial', s.parciais, 'falta faturar') + card('recebido', s.recebidos, 'digitado, sem nota') +
      card('divergente', s.divergentes, 'valor ou cliente') + card('sugestao', s.sugestoes, 'vínculo por cliente/valor') + card('nao_consta', s.naoConstam, 'enviado, não veio') +
      '<button type="button" class="card" data-filtro="sem_pedido" aria-pressed="' + (imp.filtroStatus === 'sem_pedido') + '" style="background:#fee2e2;color:#991b1b;border-color:#991b1b33"><span>Linhas sem pedido</span><b>' + s.linhasSemPedido + '</b><small>na planilha, não no sistema</small></button></div>' +
      '<div class="tot"><div><span>Pedidos analisados</span><b>' + s.pedidos + '</b></div><div><span>Valor dos pedidos</span><b>' + money(s.valorPedidos) + '</b></div><div><span>Faturado pela representada</span><b>' + money(s.valorFaturado) + '</b></div><div><span>Comissão sobre o faturado</span><b>' + money(s.comissaoFaturada) + '</b></div></div>' +
      (imp.filtroStatus === 'sem_pedido' ? '' :
        '<div class="tw"><table><thead><tr><th><input type="checkbox" data-act="marcar-todos" aria-label="Marcar todos"' + (lista.filter((p) => p.linhas.length).every((p) => imp.marcados.has(p.id)) && lista.some((p) => p.linhas.length) ? ' checked' : '') + '></th><th>Situação</th><th>Pedido</th><th>Cliente / Representada</th><th class="r">Valor pedido</th><th>Nº na representada</th><th>Notas fiscais</th><th class="r">Faturado</th><th class="r">Diferença</th><th>Baixa manual</th></tr></thead><tbody>' +
        (lista.length ? lista.map((p) => {
          const c = STATUS[p.status];
          const baixa = imp.baixasPedidos[p.id];
          const sub = p.status === 'sugestao' ? '<div class="muted" style="margin-top:3px">valores: ' + esc(STATUS[p.statusValores][0]) + '</div>' : '';
          return '<tr data-pid="' + esc(p.id) + '" style="background:' + (baixa ? '#f1f5f9' : c[3]) + '"><td>' + (p.linhas.length && !baixa ? '<input type="checkbox" data-marcar="' + esc(p.id) + '"' + (imp.marcados.has(p.id) ? ' checked' : '') + ' aria-label="Confirmar pedido ' + esc(p.numero) + '">' : '') + '</td>' +
            '<td>' + badge(c) + sub + (p.metodo ? '<div class="muted" style="margin-top:3px">' + esc(METODO[p.metodo] || '') + '</div>' : '') + '</td>' +
            '<td><b>' + esc(p.numero) + '</b><div class="muted">' + fmtDia(p.data) + '</div></td>' +
            '<td>' + esc(p.cliente) + '<div class="muted">' + esc(p.representada || '') + '</div>' + p.avisos.map((a) => '<div class="warn">' + esc(a) + '</div>').join('') + '</td>' +
            '<td class="r">' + money(p.valor) + '</td>' +
            '<td>' + p.numerosRepresentada.map((n) => '<span class="chip">' + esc(n) + '</span>').join('') + p.numerosNovos.map((n) => '<span class="chip novo" title="Número novo, vindo da planilha">+ ' + esc(n) + '</span>').join('') + (p.numerosRepresentada.length + p.numerosNovos.length ? '' : '<span class="muted">—</span>') + '</td>' +
            '<td>' + nfsHtml(p) + '</td><td class="r"><b>' + money(p.faturado) + '</b></td>' +
            '<td class="r" style="color:' + (Math.abs(p.diferenca) < 0.01 ? '#047857' : '#b91c1c') + '">' + money(p.diferenca) + '</td>' +
            '<td data-slot>' + (baixa ? '<div class="warn">Baixa: ' + esc(baixa) + '</div><button type="button" class="btn s sm" data-act="desfazer-baixa-pedido" data-id="' + esc(p.id) + '">Desfazer</button>'
              : p.status === 'conciliado' || !podeConf ? '' : '<button type="button" class="btn s sm" data-act="baixa-pedido" data-id="' + esc(p.id) + '">Dar baixa</button>') + '</td></tr>';
        }).join('') : '<tr><td colspan="10" class="muted">Nenhum pedido nesta situação.</td></tr>') + '</tbody></table></div>') +
      ((semPedido.length && (!imp.filtroStatus || imp.filtroStatus === 'sem_pedido')) ?
        '<h3 style="margin-top:16px;color:#991b1b">Linhas da planilha sem pedido no MotorDesk (' + semPedido.length + ')</h3><p class="t">Vincule a um pedido (por exemplo, pedido digitado com outro número). Se realmente não houver pedido, dê baixa informando o motivo; sem isso a linha continua pendente para a próxima conciliação.</p>' +
        '<div class="tw"><table><thead><tr><th>Linha</th><th>Pedido na representada</th><th>Nosso pedido</th><th>Cliente</th><th>NF</th><th class="r">Valor faturado</th><th class="r">Valor pedido</th><th>Situação</th><th>Vincular ou dar baixa</th></tr></thead><tbody>' +
        semPedido.map((l) => '<tr data-linha="' + l.linha + '" style="background:#fef2f2"><td>' + (l.pendenteId ? '—' : l.linha) + tagPendente(l) + '</td><td>' + esc(l.pedidoRepresentada || '—') + '</td><td>' + esc(l.nossoPedido || '—') + '</td><td>' + esc(l.cliente || '') + (l.documento ? '<div class="muted">' + esc(l.documento) + '</div>' : '') + '</td><td>' + esc(l.notaFiscal || '—') + '<div class="muted">' + fmtDia(l.dataFaturamento) + '</div></td><td class="r">' + money(l.valorFaturado) + '</td><td class="r">' + (l.valorPedido ? money(l.valorPedido) : '—') + '</td><td>' + esc(l.situacao || '') + '</td>' +
          '<td data-slot><div class="row"><select data-vincular="' + l.linha + '" style="max-width:240px"><option value="">Vincular ao pedido…</option>' + opcoesPedido.filter((p) => !/CANCEL/i.test(p.status || p.statusAtual || '')).map((p) => '<option value="' + esc(p.id) + '">' + esc(p.numero + ' — ' + p.cliente + ' — ' + money(p.valor)) + '</option>').join('') + '</select>' +
          (podeConf ? '<button type="button" class="btn s sm" data-act="baixa-linha" data-linha="' + l.linha + '">Dar baixa</button>' : '') + '</div></td></tr>').join('') + '</tbody></table></div>' : '') +
      (baixadasAqui.length ? '<h3 style="margin-top:14px">Baixas manuais nesta conciliação (' + baixadasAqui.length + ')</h3><div class="tw"><table><thead><tr><th>Pedido na representada</th><th>Cliente</th><th>NF</th><th class="r">Valor</th><th>Motivo</th><th></th></tr></thead><tbody>' +
        baixadasAqui.map((l) => '<tr><td>' + esc(l.pedidoRepresentada || '—') + '</td><td>' + esc(l.cliente || '') + '</td><td>' + esc(l.notaFiscal || '—') + '</td><td class="r">' + money(l.valorFaturado || l.valorPedido) + '</td><td>' + esc(imp.baixasLinhas[l.linha]) + '</td><td><button type="button" class="btn s sm" data-act="desfazer-baixa-linha" data-linha="' + l.linha + '">Desfazer</button></td></tr>').join('') + '</tbody></table></div>' : '') +
      '<div class="legend">' + Object.keys(STATUS).map((k) => badge(STATUS[k])).join('') + '</div>' +
      '<div class="sticky-actions"><div class="muted">' + selecionados.length + ' pedido(s) marcado(s) · faturado ' + money(selecionados.reduce((t, p) => t + p.faturado, 0)) + ' · ' + Object.keys(imp.baixasPedidos).length + ' pedido(s) e ' + baixadasAqui.length + ' linha(s) com baixa</div><div class="row">' +
      '<button type="button" class="btn s" data-act="exportar-analise">Exportar análise (Excel)</button>' +
      (podeConf ? '<button type="button" class="btn g" data-act="confirmar">Confirmar conciliação</button>' : '<span class="muted">Seu usuário pode analisar, mas não confirmar.</span>') +
      '</div></div><div class="msg" data-cmsg></div></section>';
  }

  function confirmar(btn) {
    if (body().querySelector('[data-confirm-box]')) return;
    const r = imp.resultado;
    const marcados = [...imp.marcados];
    const baixasP = Object.keys(imp.baixasPedidos).length;
    const baixasL = Object.keys(imp.baixasLinhas).length;
    const pendLinhas = r.linhas.filter((l) => !imp.baixasLinhas[l.linha] && l.status !== 'ignorada' && !(l.pedidoId && imp.marcados.has(l.pedidoId))).length;
    const pendPedidos = r.pedidos.filter((p) => !imp.marcados.has(p.id) && !imp.baixasPedidos[p.id]).length;
    const box = document.createElement('div');
    box.className = 'info';
    box.setAttribute('data-confirm-box', '');
    box.innerHTML = '<b>Confirmar a conciliação?</b><ul style="margin:6px 0 0 18px;padding:0">' +
      '<li><b>' + marcados.length + '</b> pedido(s) conciliado(s): números da representada, notas, valor faturado e situação atualizados.</li>' +
      (baixasP || baixasL ? '<li><b>' + baixasP + '</b> pedido(s) e <b>' + baixasL + '</b> linha(s) com baixa manual (motivo registrado).</li>' : '') +
      '<li><b>' + pendPedidos + '</b> pedido(s) e <b>' + pendLinhas + '</b> linha(s) continuam <b>pendentes</b> e voltam na próxima conciliação.</li></ul>' +
      '<div class="row" style="margin-top:8px"><button type="button" class="btn g" data-act="confirmar-sim">Sim, confirmar</button><button type="button" class="btn s" data-act="confirmar-nao">Voltar</button></div>';
    btn.closest('.sticky-actions').after(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function confirmarSim(btn) {
    const msg = body().querySelector('[data-cmsg]');
    btn.disabled = true;
    msg.className = 'msg'; msg.textContent = 'Gravando…';
    try {
      const r = await api('POST', '/conciliacao/confirmar', {
        linhas: linhasEnvio(), opcoes: opcoesEnvio(), confirmar: [...imp.marcados], arquivo: imp.soPendencias ? 'Pendências anteriores' : imp.arquivo,
        baixasLinhas: imp.baixasLinhas, baixasPedidos: imp.baixasPedidos,
      });
      syncApp();
      const box = body().querySelector('[data-confirm-box]');
      if (box) box.remove();
      limparImportacao();
      await carregarPedidos().catch(() => {});
      tab = 'historico';
      render();
      const rs = r.conciliacao.resumo || {};
      setTimeout(() => abrirHistorico(r.conciliacao.id, 'Conciliação gravada: ' + r.conciliacao.pedidos + ' pedido(s) conciliado(s), ' + ((rs.pedidosBaixados || 0) + (rs.linhasBaixadas || 0)) + ' baixa(s) manual(is), ' + (rs.novasPendencias || 0) + ' nova(s) pendência(s).'), 50);
    } catch (err) {
      msg.className = 'msg bad'; msg.textContent = err.message;
      btn.disabled = false;
    }
  }

  function limparImportacao() {
    Object.assign(imp, { arquivo: '', planilhas: [], aba: '', matriz: [], cabecalho: 0, colunas: [], mapa: {}, linhas: [], resultado: null, marcados: new Set(), filtroStatus: '', wb: null, baixasLinhas: {}, baixasPedidos: {}, soPendencias: false });
    imp.opcoes.vinculos = {};
    imp.opcoes.ignorar = [];
  }

  // ---------------------------------------------------------------------------
  // Aba: pendências (linhas sem pedido e pedidos não conciliados, até a baixa manual)
  // ---------------------------------------------------------------------------
  async function renderPendencias(aviso) {
    const b = body();
    b.innerHTML = '<p class="t">Carregando pendências…</p>';
    let r;
    try { r = await api('GET', '/pendencias'); } catch (err) { b.innerHTML = '<p class="msg bad">' + esc(err.message) + '</p>'; return; }
    if (!root || tab !== 'pendencias') return;
    const podeConf = podeConciliar(user());
    const SIT = { parcial: STATUS.parcial, divergente: STATUS.divergente, recebido: STATUS.recebido, aguardando: ['Aguardando a representada', '#92400e', '#ffedd5'] };
    b.innerHTML = (aviso ? '<p class="msg ok">' + esc(aviso) + '</p>' : '') +
      '<div class="info">Tudo o que ainda não fechou fica aqui e entra de novo em cada conciliação. Para tirar da lista sem conciliar, dê <b>baixa manual informando o motivo</b>. ' +
      (r.linhas.length && podeConf ? '<div class="row" style="margin-top:8px"><button type="button" class="btn" data-act="conciliar-pendencias">Conciliar as pendências agora (sem planilha nova)</button><span class="muted">Útil depois de informar o nº do pedido que faltava.</span></div>' : '') + '</div>' +
      '<h3>Linhas da representada sem pedido (' + r.linhas.length + ')</h3>' +
      (r.linhas.length ? '<div class="tw"><table><thead><tr><th>Desde</th><th>Pedido na representada</th><th>Nosso pedido</th><th>Cliente</th><th>NF</th><th class="r">Valor</th><th>Baixa manual</th></tr></thead><tbody>' +
        r.linhas.map((l) => '<tr data-pend="' + esc(l.id) + '" style="background:#fef2f2"><td>' + fmtDia(String(l.desde || '').slice(0, 10)) + '<div class="muted">' + esc(l.arquivo) + '</div></td><td>' + esc(l.pedidoRepresentada || '—') + '</td><td>' + esc(l.nossoPedido || '—') + '</td><td>' + esc(l.cliente || '') + (l.documento ? '<div class="muted">' + esc(l.documento) + '</div>' : '') + '</td><td>' + esc(l.notaFiscal || '—') + '<div class="muted">' + fmtDia(l.dataFaturamento) + '</div></td><td class="r">' + money(l.valorFaturado || l.valorPedido) + '</td>' +
          '<td data-slot>' + (podeConf ? '<button type="button" class="btn s sm" data-act="pend-baixa-linha" data-id="' + esc(l.id) + '">Dar baixa</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Nenhuma linha pendente.</p>') +
      '<h3 style="margin-top:16px">Pedidos ainda não conciliados (' + r.pedidos.length + ')</h3>' +
      (r.pedidos.length ? '<div class="tw"><table><thead><tr><th>Situação</th><th>Pedido</th><th>Cliente / Representada</th><th class="r">Valor</th><th class="r">Faturado</th><th>Nº na representada</th><th>Baixa manual</th></tr></thead><tbody>' +
        r.pedidos.map((p) => { const c = SIT[p.situacao] || SIT.aguardando; return '<tr data-pped="' + esc(p.id) + '"><td>' + badge(c) + '</td><td><b>' + esc(p.numero) + '</b><div class="muted">' + fmtDia(p.data) + '</div></td><td>' + esc(p.cliente) + '<div class="muted">' + esc(p.representada) + '</div></td><td class="r">' + money(p.valor) + '</td><td class="r">' + (p.faturado ? money(p.faturado) : '—') + '</td><td>' + (p.numerosRepresentada.map((n) => '<span class="chip">' + esc(n) + '</span>').join('') || '<span class="muted">—</span>') + '</td>' +
          '<td data-slot>' + (podeConf ? '<button type="button" class="btn s sm" data-act="pend-baixa-pedido" data-id="' + esc(p.id) + '">Dar baixa</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Nenhum pedido pendente.</p>') +
      '<h3 style="margin-top:16px">Baixas manuais realizadas</h3>' +
      (r.baixadas.length ? '<div class="tw"><table><thead><tr><th>Data</th><th>Item</th><th class="r">Valor</th><th>Motivo</th><th>Usuário</th><th></th></tr></thead><tbody>' +
        r.baixadas.map((x) => '<tr data-bx="' + esc(x.id) + '"><td>' + fmtData(x.em) + '</td><td>' + esc(x.descricao) + '</td><td class="r">' + money(x.valor) + '</td><td>' + esc(x.motivo) + '</td><td>' + esc(x.por) + '</td><td data-slot>' + (x.tipo === 'pedido' && podeConf ? '<button type="button" class="btn s sm" data-act="pend-reabrir" data-id="' + esc(x.id) + '">Reabrir</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Nenhuma baixa manual.</p>');
  }

  function abrirMotivo(slot, tipo, chave, rotulo) {
    if (!slot || slot.querySelector('[data-motivo-form]')) return;
    slot.dataset.antes = slot.innerHTML;
    slot.innerHTML = motivoForm(tipo, chave, rotulo);
    const det = slot.querySelector('[data-mot="detalhe"]');
    if (det) det.focus();
  }

  async function motivoOk(btn) {
    const form = btn.closest('[data-motivo-form]');
    const msg = form.querySelector('[data-mot-msg]');
    const motivo = lerMotivo(form);
    if (!motivo) { msg.className = 'msg bad'; msg.textContent = 'Descreva o motivo.'; return; }
    const tipo = form.dataset.motivoForm;
    const chave = form.dataset.chave;
    if (tipo === 'linha') { imp.baixasLinhas[chave] = motivo; return analisar(); }
    if (tipo === 'pedido') { imp.baixasPedidos[chave] = motivo; imp.marcados.delete(chave); return renderResultado(); }
    btn.disabled = true;
    try {
      if (tipo === 'pend-linha') await api('POST', '/pendencias/linhas/' + encodeURIComponent(chave) + '/baixa', { motivo });
      else if (tipo === 'pend-pedido') await api('POST', '/pedidos/' + encodeURIComponent(chave) + '/baixa', { motivo });
      else if (tipo === 'pend-reabrir') await api('POST', '/pedidos/' + encodeURIComponent(chave) + '/reabrir', { motivo });
      syncApp();
      renderPendencias(tipo === 'pend-reabrir' ? 'Pedido reaberto: volta para as próximas conciliações.' : 'Baixa registrada com o motivo informado.');
    } catch (err) { msg.className = 'msg bad'; msg.textContent = err.message; btn.disabled = false; }
  }

  function exportar(nome, linhas) {
    const XLSX = window.XLSX;
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Conciliação');
    XLSX.writeFile(wb, nome);
  }

  async function exportarAnalise() {
    await loadXlsx();
    const r = imp.resultado;
    const linhas = r.pedidos.map((p) => ({
      'Situação': STATUS[p.status][0], 'Vínculo': METODO[p.metodo] || '', 'Pedido': p.numero, 'Data': fmtDia(p.data), 'Representada': p.representada, 'Cliente': p.cliente,
      'Valor do pedido': p.valor, 'Nº na representada': [...p.numerosRepresentada, ...p.numerosNovos].join(', '), 'Notas fiscais': p.notas.map((n) => n.numero).filter(Boolean).join(', '),
      'Faturado': p.faturado, 'Diferença': p.diferenca, 'Comissão (%)': p.comissaoPercentual, 'Comissão sobre faturado': p.comissaoFaturada, 'Avisos': p.avisos.join(' '),
    }));
    for (const l of r.linhas.filter((x) => x.status === 'sem_pedido')) {
      linhas.push({ 'Situação': 'Linha sem pedido no MotorDesk', 'Vínculo': 'linha ' + l.linha, 'Pedido': l.nossoPedido, 'Data': fmtDia(l.dataPedido), 'Representada': '', 'Cliente': l.cliente, 'Valor do pedido': l.valorPedido, 'Nº na representada': l.pedidoRepresentada, 'Notas fiscais': l.notaFiscal, 'Faturado': l.valorFaturado, 'Diferença': '', 'Comissão (%)': '', 'Comissão sobre faturado': '', 'Avisos': l.situacao });
    }
    exportar('conciliacao_' + new Date().toISOString().slice(0, 10) + '.xlsx', linhas);
  }

  // ---------------------------------------------------------------------------
  // Aba: histórico
  // ---------------------------------------------------------------------------
  async function renderHistorico() {
    const b = body();
    b.innerHTML = '<div data-hmsg></div><div data-hlista><p class="t">Carregando…</p></div><div data-hdet></div>';
    try {
      const r = await api('GET', '/conciliacao/historico');
      if (tab !== 'historico' || !root) return;
      const lista = r.historico || [];
      b.querySelector('[data-hlista]').innerHTML = lista.length ? '<div class="tw"><table><thead><tr><th>Data</th><th>Arquivo</th><th>Usuário</th><th class="r">Pedidos confirmados</th><th class="r">Faturado confirmado</th><th class="r">Linhas sem pedido</th><th></th></tr></thead><tbody>' +
        lista.map((h) => '<tr><td>' + fmtData(h.createdAt) + '</td><td>' + esc(h.arquivo) + '</td><td>' + esc(h.createdBy) + '</td><td class="r">' + (h.resumo.confirmados || 0) + '</td><td class="r">' + money(h.resumo.valorConfirmado) + '</td><td class="r">' + (h.resumo.linhasSemPedido || 0) + '</td><td><button type="button" class="btn s sm" data-act="ver-hist" data-id="' + esc(h.id) + '">Ver</button></td></tr>').join('') + '</tbody></table></div>'
        : '<p class="t">Nenhuma conciliação confirmada ainda.</p>';
    } catch (err) { b.querySelector('[data-hlista]').innerHTML = '<p class="msg bad">' + esc(err.message) + '</p>'; }
  }

  async function abrirHistorico(id, aviso) {
    const b = body();
    if (!b) return;
    if (aviso) { const m = b.querySelector('[data-hmsg]'); if (m) m.innerHTML = '<p class="msg ok">' + esc(aviso) + '</p>'; }
    const el = b.querySelector('[data-hdet]');
    if (!el) return;
    el.innerHTML = '<p class="t">Carregando…</p>';
    try {
      const { conciliacao: h } = await api('GET', '/conciliacao/historico/' + encodeURIComponent(id));
      el.innerHTML = '<section style="margin-top:14px"><h3>Conciliação de ' + fmtData(h.createdAt) + ' — ' + esc(h.arquivo) + '</h3>' +
        '<div class="tot"><div><span>Pedidos confirmados</span><b>' + h.pedidos.length + '</b></div><div><span>Faturado confirmado</span><b>' + money(h.resumo.valorConfirmado) + '</b></div><div><span>Pendentes</span><b>' + (h.pendentes || []).length + '</b></div><div><span>Linhas sem pedido</span><b>' + (h.linhasSemPedido || []).length + '</b></div></div>' +
        '<div class="tw"><table><thead><tr><th>Situação</th><th>Pedido</th><th>Cliente</th><th class="r">Valor</th><th>Notas</th><th class="r">Faturado</th><th class="r">Diferença</th></tr></thead><tbody>' +
        h.pedidos.map((p) => { const c = STATUS[p.status] || STATUS.conciliado; return '<tr style="background:' + c[3] + '"><td>' + badge(c) + '</td><td><b>' + esc(p.numero) + '</b></td><td>' + esc(p.cliente) + '</td><td class="r">' + money(p.valor) + '</td><td>' + (p.notas || []).map((n) => esc(n.numero)).filter(Boolean).join(', ') + '</td><td class="r">' + money(p.faturado) + '</td><td class="r">' + money(p.diferenca) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' +
        ((h.pendentes || []).length ? '<h3 style="margin-top:12px">Ficaram pendentes</h3><div class="tw"><table><thead><tr><th>Situação</th><th>Pedido</th><th>Cliente</th><th class="r">Valor</th></tr></thead><tbody>' + h.pendentes.map((p) => { const c = STATUS[p.status] || STATUS.nao_consta; return '<tr style="background:' + c[3] + '"><td>' + badge(c) + '</td><td>' + esc(p.numero) + '</td><td>' + esc(p.cliente) + '</td><td class="r">' + money(p.valor) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
        '</section>';
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { el.innerHTML = '<p class="msg bad">' + esc(err.message) + '</p>'; }
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------
  function onKeyInside(e) {
    const inp = e.target.closest && e.target.closest('[data-num-input]');
    if (inp && e.key === 'Enter') {
      e.preventDefault();
      const id = inp.closest('tr').dataset.id;
      const p = pedidos.find((x) => x.id === id);
      const novos = inp.value.split(/[;,\s]+/).map((s) => s.trim()).filter(Boolean);
      if (!p || !novos.length) return;
      salvarNumeros(id, [...p.numerosRepresentada, ...novos], inp);
    }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.drop')) { const f = root.querySelector('[data-file]'); if (f) f.click(); }
  }

  function onInput(e) {
    const f = e.target.dataset && e.target.dataset.f;
    if (f === 'texto') { filtro.texto = e.target.value; renderListaPedidos(); }
  }

  function onChange(e) {
    const t = e.target;
    if (t.dataset.f) { filtro[t.dataset.f] = t.value; renderListaPedidos(); return; }
    if (t.matches('[data-file]')) { const file = t.files && t.files[0]; if (file) lerArquivo(file); t.value = ''; return; }
    if (t.matches('[data-aba]')) { imp.aba = t.value; imp.resultado = null; prepararAba(); renderImportar(); return; }
    if (t.dataset.map) { imp.mapa[t.dataset.map] = t.value; imp.resultado = null; montarLinhas(); renderImportar(); return; }
    if (t.dataset.o) {
      const k = t.dataset.o;
      imp.opcoes[k] = /^tolerancia/.test(k) ? Number(t.value || 0) : t.value;
      if (imp.resultado) analisar();
      return;
    }
    if (t.dataset.marcar) { if (t.checked) imp.marcados.add(t.dataset.marcar); else imp.marcados.delete(t.dataset.marcar); renderResultado(); return; }
    if (t.dataset.act === 'marcar-todos') {
      const lista = imp.resultado.pedidos.filter((p) => p.linhas.length && (!imp.filtroStatus || p.status === imp.filtroStatus));
      lista.forEach((p) => (t.checked ? imp.marcados.add(p.id) : imp.marcados.delete(p.id)));
      renderResultado();
      return;
    }
    if (t.dataset.vincular) {
      if (!t.value) return;
      imp.opcoes.vinculos[t.dataset.vincular] = t.value;
      imp.marcados.add(t.value);
      analisar();
    }
  }

  async function onClick(e) {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { tab = tabBtn.dataset.tab; render(); return; }
    const card = e.target.closest('[data-filtro]');
    if (card) { imp.filtroStatus = imp.filtroStatus === card.dataset.filtro ? '' : card.dataset.filtro; renderResultado(); return; }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'close') return close();
    if (act === 'escolher-arquivo') { const f = root.querySelector('[data-file]'); if (f) f.click(); return; }
    if (act === 'analisar') return analisar(t);
    if (act === 'confirmar') return confirmar(t);
    if (act === 'confirmar-sim') return confirmarSim(t);
    if (act === 'confirmar-nao') { const box = t.closest('[data-confirm-box]'); if (box) box.remove(); return; }
    if (act === 'baixa-linha') return abrirMotivo(t.closest('[data-slot]'), 'linha', t.dataset.linha);
    if (act === 'baixa-pedido') return abrirMotivo(t.closest('[data-slot]'), 'pedido', t.dataset.id, 'Marcar baixa');
    if (act === 'desfazer-baixa-linha') { delete imp.baixasLinhas[t.dataset.linha]; return analisar(); }
    if (act === 'desfazer-baixa-pedido') { delete imp.baixasPedidos[t.dataset.id]; return renderResultado(); }
    if (act === 'pend-baixa-linha') return abrirMotivo(t.closest('[data-slot]'), 'pend-linha', t.dataset.id);
    if (act === 'pend-baixa-pedido') return abrirMotivo(t.closest('[data-slot]'), 'pend-pedido', t.dataset.id);
    if (act === 'pend-reabrir') return abrirMotivo(t.closest('[data-slot]'), 'pend-reabrir', t.dataset.id, 'Reabrir');
    if (act === 'motivo-ok') return motivoOk(t);
    if (act === 'motivo-cancelar') { const sl = t.closest('[data-slot]'); if (sl) sl.innerHTML = sl.dataset.antes || ''; return; }
    if (act === 'conciliar-pendencias') { limparImportacao(); imp.soPendencias = true; tab = 'importar'; render(); return analisar(); }
    if (act === 'exportar-analise') { try { await exportarAnalise(); } catch (err) { const m = body().querySelector('[data-cmsg]'); if (m) { m.className = 'msg bad'; m.textContent = err.message; } } return; }
    if (act === 'exportar-pedidos') {
      try {
        await loadXlsx();
        exportar('pedidos_representacao_' + new Date().toISOString().slice(0, 10) + '.xlsx', pedidosFiltrados().map((p) => ({ 'Pedido': p.numero, 'Data': fmtDia(p.data), 'Representada': p.representada, 'Cliente': p.cliente, 'CNPJ/CPF': p.documento, 'Valor': p.valor, 'Nº na representada': p.numerosRepresentada.join(', '), 'Faturado': p.faturado, 'Situação': situacaoPedido(p)[0] })));
      } catch (err) { alertMsg(err.message); }
      return;
    }
    if (act === 'rm-num') {
      const id = t.closest('tr').dataset.id;
      const p = pedidos.find((x) => x.id === id);
      if (p) salvarNumeros(id, p.numerosRepresentada.filter((n) => n !== t.dataset.num));
      return;
    }
    if (act === 'ver-hist') return abrirHistorico(t.dataset.id);
  }
  function alertMsg(text) { const b = body(); if (!b) return; const d = document.createElement('p'); d.className = 'msg bad'; d.textContent = text; b.prepend(d); }

  // ---------------------------------------------------------------------------
  // Item no menu lateral (logo abaixo de "Pedidos Realizados")
  // ---------------------------------------------------------------------------
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
  function injectMenu() {
    const nav = document.querySelector('#sidebar-container nav');
    const existing = document.getElementById('menu-btn-rep-conciliacao');
    const u = user();
    if (!nav || !podeVer(u)) { if (existing) existing.remove(); return; }
    ensureStyles();
    const sidebar = document.getElementById('sidebar-container');
    const collapsed = sidebar && sidebar.offsetWidth < 100;
    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'menu-btn-rep-conciliacao';
      btn.title = 'Conciliação de Pedidos';
      btn.addEventListener('click', () => open());
    }
    const html = ICON + (collapsed ? '' : '<span>CONCILIAÇÃO DE PEDIDOS</span>');
    if (btn.innerHTML !== html) btn.innerHTML = html;
    btn.style.justifyContent = collapsed ? 'center' : '';
    // Logo abaixo do item "Pedidos Realizados" (ou no fim do menu)
    const ancora = [...nav.children].find((el) => el !== btn && /pedidos realizados/i.test(el.textContent || ''));
    if (ancora) { if (ancora.nextElementSibling !== btn) ancora.after(btn); }
    else if (btn.parentElement !== nav) nav.appendChild(btn);
  }

  setInterval(injectMenu, 1000);
  window.MotorDeskOpenConciliacao = open;
})();
