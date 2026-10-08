/**
 * MotorDesk - Transações (financeiro no formato "lançamentos do mês")
 *
 *  - Visão geral: previsto x realizado do mês, fluxo de caixa, saldo da conta, calendário e maiores gastos.
 *  - Transações: navegação por mês, recebimentos / despesas / transferências numa lista só, "Pago?" com
 *    um clique, nova transação (única, parcelada, fixa ou recorrente) e ações em lote.
 *  - Contas: contas bancárias / carteira com saldo inicial e saldo atual.
 * Usa os mesmos títulos de Contas a Receber / Contas a Pagar (o que é lançado aqui aparece lá).
 * Regras e permissões são conferidas no servidor (/api/financeiro/transacoes).
 */
(function () {
  'use strict';

  const API = '/api/financeiro';
  const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const TIPOS_CONTA = { corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Carteira / dinheiro', caixa: 'Caixa da loja', investimento: 'Investimento', cartao: 'Cartão de crédito' };
  const REPETICOES = [
    ['UNICA', 'Única'],
    ['PARCELADA', 'Parcelada'],
    ['FIXA_MENSAL', 'Fixa por um período'],
    ['FIXA_INDETERMINADA', 'Recorrente, sem data para acabar'],
    ['VARIAVEL_MENSAL', 'Recorrente, valor muda todo mês'],
  ];

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const ddmm = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '');
  const ddmmaaaa = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  const hojeISO = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
  const podeVer = (u) => ['accessAccountsReceivable', 'accessAccountsPayable', 'accessFinancial'].some((k) => perm(u, k));
  const somaMes = (mes, n) => { const [y, m] = mes.split('-').map(Number); const t = (m - 1) + n; return (y + Math.floor(t / 12)) + '-' + String(((t % 12) + 12) % 12 + 1).padStart(2, '0'); };

  async function api(method, path, body) {
    const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || data.success === false) throw new Error((data && data.error) || 'Erro HTTP ' + res.status);
    return data;
  }
  const syncApp = () => { try { if (window.__motorDeskSyncNow) window.__motorDeskSyncNow('transacoes'); } catch (e) {} };

  // ---------------------------------------------------------------------------
  // Estilos
  // ---------------------------------------------------------------------------
  function ensureStyles() {
    if (document.getElementById('md-fin-style')) return;
    const st = document.createElement('style');
    st.id = 'md-fin-style';
    st.textContent = [
      '#md-fin{position:fixed;z-index:45;background:#f4f5f7;overflow:auto;font-family:inherit;color:#1f2937;-webkit-font-smoothing:antialiased}',
      '.md-fin *{box-sizing:border-box}',
      '.md-fin .wrap{max-width:1500px;margin:0 auto;padding:18px 22px 40px}',
      '.md-fin .top{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:16px}',
      '.md-fin h1{font-size:22px;font-weight:600;margin:0;color:#374151}',
      '.md-fin .nav{display:flex;gap:4px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:3px}',
      '.md-fin .nav button{border:0;background:none;padding:7px 16px;border-radius:999px;font:inherit;font-size:13.5px;color:#4b5563;cursor:pointer}',
      '.md-fin .nav button[aria-current=page]{background:#5b5bd6;color:#fff;font-weight:600}',
      '.md-fin .grow{flex:1}',
      '.md-fin .search{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:0 10px;height:38px;min-width:220px}',
      '.md-fin .search input{border:0;outline:0;font:inherit;font-size:14px;width:100%;background:none}',
      '.md-fin .icon-btn{width:38px;height:38px;border-radius:999px;border:1px solid #d1d5db;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:#4b5563}',
      '.md-fin .icon-btn:hover{border-color:#5b5bd6;color:#5b5bd6}',
      '.md-fin .icon-btn svg{width:18px;height:18px}',
      '.md-fin .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px}',
      '.md-fin .card-h{padding:14px 16px 0}.md-fin .card-h h3{margin:0;font-size:17px;font-weight:600;color:#374151}.md-fin .card-h p{margin:2px 0 0;font-size:13px;color:#6b7280}',
      '.md-fin .card-b{padding:14px 16px}',
      '.md-fin .grid-inicio{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 330px;gap:14px}',
      '.md-fin .grid-inicio .side{grid-column:3;grid-row:1 / span 2;display:flex;flex-direction:column;gap:14px}',
      '@media (max-width:1100px){.md-fin .grid-inicio{grid-template-columns:1fr 1fr}.md-fin .grid-inicio .side{grid-column:1 / -1;grid-row:auto}}',
      '@media (max-width:720px){.md-fin .grid-inicio{grid-template-columns:1fr}}',
      '.md-fin .rings{display:flex;justify-content:space-around;gap:10px;padding:8px 0 14px}',
      '.md-fin .ring{text-align:center}',
      '.md-fin .kv{display:grid;grid-template-columns:1fr 1fr;gap:20px}',
      '.md-fin .kv h4{margin:0 0 6px;font-size:14px;color:#374151}',
      '.md-fin .kv .l{display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:3px 0}.md-fin .kv .l b{white-space:nowrap}',
      '.md-fin .kv .l.t{border-top:1px solid #e5e7eb;margin-top:4px;padding-top:7px;color:#4b5563}',
      '.md-fin .g{color:#059669}.md-fin .r{color:#e11d48}.md-fin .muted{color:#6b7280}',
      '.md-fin .conta{padding:14px 16px}',
      '.md-fin .conta-sel{display:flex;align-items:center;gap:10px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:12px}',
      '.md-fin .conta-sel .bank{width:38px;height:38px;border-radius:999px;background:#eef0f3;display:flex;align-items:center;justify-content:center;color:#6b7280}',
      '.md-fin .conta-sel select{border:0;font:inherit;font-size:18px;font-weight:600;color:#5b5bd6;background:none;flex:1;cursor:pointer;min-width:0}',
      '.md-fin .conta .l{display:flex;gap:10px;align-items:baseline;font-size:14px;padding:3px 0}',
      '.md-fin .conta .l b{font-size:18px}',
      '.md-fin .cal{padding:14px 16px}',
      '.md-fin .cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.md-fin .cal-h h3{margin:0;font-size:18px;font-weight:600;color:#374151}',
      '.md-fin .cal table{width:100%;border-collapse:collapse;text-align:center;font-size:14px}',
      '.md-fin .cal th{font-weight:500;color:#6b7280;font-size:12.5px;padding:6px 0;border-bottom:1px solid #e5e7eb}',
      '.md-fin .cal td{padding:4px 0;border-bottom:1px solid #f1f2f4}',
      '.md-fin .cal button{border:0;background:none;font:inherit;width:36px;height:36px;border-radius:999px;cursor:pointer;color:#374151;position:relative}',
      '.md-fin .cal button:hover{background:#eef0ff}.md-fin .cal button.out{color:#c4c8cf}.md-fin .cal button.hoje{border:1.5px solid #374151}',
      '.md-fin .cal .dots{position:absolute;left:0;right:0;bottom:3px;display:flex;justify-content:center;gap:2px}',
      '.md-fin .cal .dots i{width:5px;height:5px;border-radius:9px;display:block}',
      '.md-fin .legend{display:flex;gap:14px;justify-content:center;font-size:12px;color:#6b7280;margin-top:8px}.md-fin .legend i{display:inline-block;width:18px;height:4px;border-radius:4px;vertical-align:middle;margin-right:5px}',
      '.md-fin .bar{height:8px;border-radius:9px;background:#e5e7eb;overflow:hidden}.md-fin .bar i{display:block;height:100%;border-radius:9px}',
      '.md-fin .resumo{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) 330px;gap:14px;align-items:stretch;margin-bottom:14px}',
      '@media (max-width:1100px){.md-fin .resumo{grid-template-columns:1fr}}',
      '.md-fin .res-prev{padding:4px 2px}.md-fin .res-prev .lbl{font-size:14px;color:#4b5563}.md-fin .res-prev .val{font-size:22px;font-weight:600;margin:2px 0 14px}',
      '.md-fin .pb{display:grid;grid-template-columns:1fr 1fr;gap:18px}',
      '.md-fin .pb h4{margin:0 0 6px;font-size:14px;font-weight:500;color:#4b5563}',
      '.md-fin .pb .row{display:flex;justify-content:space-between;font-size:13px;margin-top:4px}',
      '.md-fin .bar-line{display:flex;align-items:center;gap:8px;font-size:12.5px}.md-fin .bar-line .bar{flex:1}',
      '.md-fin .toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:6px 0 12px}',
      '.md-fin .mes{display:flex;align-items:center;gap:8px}',
      '.md-fin .mes .lbl{background:#5b5bd6;color:#fff;border-radius:999px;padding:8px 0;width:160px;text-align:center;font-weight:500;font-size:15px;letter-spacing:.03em}',
      '.md-fin .chip{border-radius:999px;padding:7px 16px;font:inherit;font-size:14px;cursor:pointer;background:#fff;border:1px solid #d1d5db}',
      '.md-fin .chip.rec{color:#059669;border-color:#a7f3d0}.md-fin .chip.rec[aria-pressed=true]{background:#10b981;color:#fff;border-color:#10b981}',
      '.md-fin .chip.des{color:#e11d48;border-color:#fecdd3}.md-fin .chip.des[aria-pressed=true]{background:#f43f5e;color:#fff;border-color:#f43f5e}',
      '.md-fin .chip.trf{color:#5b5bd6;border-color:#c7d2fe}.md-fin .chip.trf[aria-pressed=true]{background:#5b5bd6;color:#fff;border-color:#5b5bd6}',
      '.md-fin .chip.dia{background:#eef0ff;border-color:#c7d2fe;color:#3730a3}',
      '.md-fin .btn{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer;color:#374151;display:inline-flex;align-items:center;gap:6px}',
      '.md-fin .btn:hover{border-color:#9ca3af}.md-fin .btn svg{width:16px;height:16px}',
      '.md-fin .btn.pri{background:#5b5bd6;border-color:#5b5bd6;color:#fff}.md-fin .btn.pri:hover{background:#4949c4}',
      '.md-fin .btn.danger{color:#be123c;border-color:#fecdd3}.md-fin .btn:disabled{opacity:.55;cursor:default}',
      '.md-fin .filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fafafb}',
      '.md-fin label.f{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:#4b5563}',
      '.md-fin input.i,.md-fin select.i,.md-fin textarea.i{border:1px solid #d1d5db;border-radius:7px;padding:8px 10px;font:inherit;font-size:14px;background:#fff;color:#111827;width:100%}',
      '.md-fin input.i:focus,.md-fin select.i:focus,.md-fin textarea.i:focus{outline:2px solid #c7d2fe;border-color:#5b5bd6}',
      '.md-fin .tbl-wrap{overflow-x:auto}',
      '.md-fin table.tx{width:100%;border-collapse:collapse;font-size:14px;min-width:900px}',
      '.md-fin table.tx th{text-align:left;font-weight:600;color:#374151;padding:12px 8px;border-bottom:1px solid #e5e7eb;white-space:nowrap}',
      '.md-fin table.tx th button{border:0;background:none;font:inherit;font-weight:600;color:inherit;cursor:pointer;padding:0}',
      '.md-fin table.tx td{padding:11px 8px;border-bottom:1px solid #f1f2f4;vertical-align:middle}',
      '.md-fin table.tx td.trunc.c{max-width:190px}.md-fin table.tx td.trunc{max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.md-fin table.tx tr.lin{cursor:pointer}.md-fin table.tx tr.lin:hover td{background:#fafaff}',
      '.md-fin table.tx tr.lin.sel td{background:#eef0ff}',
      '.md-fin .nova{padding:8px 10px;background:#f4f5f7}',
      '.md-fin .nova button{width:100%;border:2px dashed #8b8bf0;border-radius:8px;background:#fff;color:#5b5bd6;font:inherit;font-size:15px;padding:8px;cursor:pointer}',
      '.md-fin .nova button:hover{background:#f5f5ff}',
      '.md-fin .vazio{text-align:center;padding:46px 10px;color:#6b7280}.md-fin .vazio b{display:block;font-size:18px;color:#374151;margin-bottom:4px}',
      '.md-fin .sw{width:40px;height:22px;border-radius:999px;background:#d1d5db;border:0;position:relative;cursor:pointer;flex-shrink:0;transition:background .15s}',
      '.md-fin .sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:999px;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)}',
      '.md-fin .sw[aria-checked=true]{background:#10b981}.md-fin .sw[aria-checked=true]::after{left:21px}',
      '.md-fin .sw.des[aria-checked=true]{background:#f43f5e}.md-fin .sw:disabled{opacity:.5;cursor:default}',
      '.md-fin .sw-parcial{font-size:11px;color:#b45309;display:block}',
      '.md-fin .totais{display:flex;justify-content:flex-end;padding:14px}',
      '.md-fin .totais .box{border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;min-width:300px;box-shadow:0 1px 3px rgba(0,0,0,.05)}',
      '.md-fin .totais .l{display:flex;justify-content:space-between;gap:30px;font-size:14px;padding:2px 0}.md-fin .totais .l.t{font-size:17px;font-weight:600;margin-bottom:4px}',
      '.md-fin .lote{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;background:#eef0ff;border-bottom:1px solid #c7d2fe;font-size:14px}',
      '.md-fin .tag{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:#f1f2f4;color:#4b5563;white-space:nowrap}',
      '.md-fin .msg{font-size:13.5px;margin:8px 0;padding:9px 12px;border-radius:8px}.md-fin .msg.ok{background:#ecfdf5;color:#047857}.md-fin .msg.bad{background:#fff1f2;color:#be123c}',
      '#md-fin-drawer{position:relative;z-index:10050}',
      '.md-fin .drawer-bg{position:fixed;inset:0;background:rgba(17,24,39,.35);z-index:1}',
      '.md-fin .drawer{position:fixed;top:0;right:0;bottom:0;width:min(480px,100vw);background:#fff;z-index:2;display:flex;flex-direction:column;box-shadow:-8px 0 30px rgba(0,0,0,.12)}',
      '.md-fin .drawer .dh{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb}.md-fin .drawer .dh h2{margin:0;font-size:18px;font-weight:600}',
      '.md-fin .drawer .db{flex:1;overflow:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}',
      '.md-fin .drawer .df{padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:8px;flex-wrap:wrap}',
      '.md-fin .seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
      '.md-fin .seg button{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:9px;font:inherit;font-size:14px;cursor:pointer}',
      '.md-fin .seg button[aria-pressed=true].rec{background:#10b981;border-color:#10b981;color:#fff}.md-fin .seg button[aria-pressed=true].des{background:#f43f5e;border-color:#f43f5e;color:#fff}.md-fin .seg button[aria-pressed=true].trf{background:#5b5bd6;border-color:#5b5bd6;color:#fff}',
      '.md-fin .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.md-fin .chk{display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer}.md-fin .chk input{width:17px;height:17px}',
      '.md-fin .hint{font-size:12.5px;color:#6b7280;margin:-4px 0 0}',
      '.md-fin .aviso{font-size:13px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:8px;padding:9px 11px}',
      '.md-fin .contas-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}',
      '.md-fin .conta-card{padding:16px}.md-fin .conta-card h3{margin:0 0 2px;font-size:16px;color:#374151}.md-fin .conta-card .s{font-size:22px;font-weight:600;margin:10px 0 2px}',
      '.md-fin .top5 .it{margin:9px 0}.md-fin .top5 .it .l{display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px}',
      '.md-fin .loading{padding:60px;text-align:center;color:#6b7280}',
      '#menu-btn-fin-transacoes{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:0;background:none;color:#cbd5e1;font-size:12px;font-weight:600;letter-spacing:.02em;cursor:pointer;text-align:left}',
      '#menu-btn-fin-transacoes:hover{background:#1e293b;color:#fff}#menu-btn-fin-transacoes svg{width:16px;height:16px;flex-shrink:0;color:#34d399}',
      '#menu-btn-fin-transacoes[aria-current=page]{background:#4f46e5;color:#fff}',
    ].join('\n');
    document.head.appendChild(st);
  }

  const IC = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" width="17" height="17"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M3 10h18L12 4zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.2 0 1.2-1.3 2.2-3 2.2-1.5 0-2.7-.6-3.2-1.6M12 6.5v1.5M12 16v1.5"/></svg>',
  };

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  let root = null;
  let drawerHost = null;
  const st = {
    pagina: 'transacoes', mes: hojeISO().slice(0, 7), conta: '', dados: null, carregando: false, erro: '',
    rec: true, des: true, trf: false, busca: '', dia: '', mostrarFiltros: false,
    filtros: { categoria: '', contato: '', situacao: '', modo: '' },
    ordem: { campo: 'data', asc: true }, sel: new Set(), msg: null, drawer: null,
  };
  try { const s = JSON.parse(localStorage.getItem('md_fin_pref') || '{}'); if (s.conta) st.conta = s.conta; } catch (e) {}
  const salvarPref = () => { try { localStorage.setItem('md_fin_pref', JSON.stringify({ conta: st.conta })); } catch (e) {} };

  function posicionar() {
    if (!root) return;
    const sb = document.getElementById('sidebar-container');
    const sair = document.getElementById('btn-top-logout') || [...document.querySelectorAll('button')].find((b) => /^\s*SAIR\s*$/i.test(b.textContent || ''));
    const header = sair && (sair.closest('header') || sair.parentElement && sair.parentElement.parentElement);
    const left = sb ? Math.max(0, Math.round(sb.getBoundingClientRect().right)) : 0;
    const top = header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
    root.style.left = left + 'px'; root.style.top = top + 'px'; root.style.right = '0'; root.style.bottom = '0';
  }

  function open(pagina) {
    ensureStyles();
    if (!root) {
      root = document.createElement('div');
      root.id = 'md-fin';
      root.className = 'md-fin';
      drawerHost = document.createElement('div');
      drawerHost.id = 'md-fin-drawer';
      drawerHost.className = 'md-fin';
      drawerHost.addEventListener('click', onClick);
      drawerHost.addEventListener('change', onChange);
      drawerHost.addEventListener('input', onInput);
      drawerHost.addEventListener('submit', onSubmit);
      document.body.appendChild(drawerHost);
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'Transações');
      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('input', onInput);
      root.addEventListener('submit', onSubmit);
      document.body.appendChild(root);
      document.addEventListener('keydown', onKey);
      window.addEventListener('resize', posicionar);
    }
    if (pagina) st.pagina = pagina;
    posicionar();
    marcarMenu(true);
    render();
    carregar();
  }
  function close() {
    if (root) root.remove();
    if (drawerHost) drawerHost.remove();
    root = null;
    drawerHost = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', posicionar);
    marcarMenu(false);
  }
  function onKey(e) {
    if (e.key !== 'Escape' || !root) return;
    if (st.drawer) { st.drawer = null; render(); return; }
  }

  async function carregar() {
    st.carregando = true; st.erro = '';
    try {
      const d = await api('GET', '/transacoes?mes=' + st.mes + (st.conta ? '&conta=' + encodeURIComponent(st.conta) : ''));
      st.dados = d;
      if (st.conta && !d.contaId) { st.conta = ''; salvarPref(); }
      const vis = new Set(d.transacoes.map((t) => t.id));
      st.sel.forEach((id) => { if (!vis.has(id)) st.sel.delete(id); });
      if (!d.permissoes.receber.ver) st.rec = false;
      if (!d.permissoes.pagar.ver) st.des = false;
    } catch (e) { st.erro = e.message; }
    st.carregando = false;
    render();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function render() {
    if (!root) return;
    const foco = document.activeElement && (root.contains(document.activeElement) || drawerHost.contains(document.activeElement)) && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    const nav = [['inicio', 'Visão geral'], ['transacoes', 'Transações'], ['contas', 'Contas']];
    let html = '<div class="wrap"><div class="top"><h1>' + (st.pagina === 'inicio' ? 'Visão geral' : st.pagina === 'contas' ? 'Contas' : 'Transações') + '</h1>' +
      '<nav class="nav" aria-label="Financeiro">' + nav.map((n) => '<button type="button" data-act="pagina" data-p="' + n[0] + '"' + (st.pagina === n[0] ? ' aria-current="page"' : '') + '>' + n[1] + '</button>').join('') + '</nav><span class="grow"></span>';
    if (st.pagina === 'transacoes') html += '<label class="search">' + IC.search + '<input data-k="busca" placeholder="Pesquisar..." aria-label="Pesquisar transações" value="' + esc(st.busca) + '"></label>';
    if (st.dados && podeCriarAlgo()) html += '<button type="button" class="icon-btn" data-act="nova" title="Nova transação" aria-label="Nova transação">' + IC.plus + '</button>';
    html += '<button type="button" class="icon-btn" data-act="fechar" title="Fechar" aria-label="Fechar">' + IC.close + '</button></div>';
    if (st.msg) html += '<div class="msg ' + (st.msg.ok ? 'ok' : 'bad') + '" role="status">' + esc(st.msg.texto) + '</div>';
    if (st.erro) html += '<div class="msg bad">' + esc(st.erro) + ' <button type="button" class="btn" data-act="recarregar">Tentar de novo</button></div>';
    if (!st.dados) html += '<div class="loading">Carregando…</div>';
    else if (st.pagina === 'inicio') html += renderInicio();
    else if (st.pagina === 'contas') html += renderContas();
    else html += renderTransacoes();
    html += '</div>';
    root.innerHTML = html;
    drawerHost.innerHTML = st.drawer ? renderDrawer() : '';
    if (foco) { const el = root.querySelector('[data-k="' + foco + '"]') || drawerHost.querySelector('[data-k="' + foco + '"]'); if (el) { el.focus(); if (el.setSelectionRange && typeof el.value === 'string') { const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) {} } } }
    else if (st.drawer) { const el = drawerHost.querySelector('.drawer [data-autofocus]'); if (el) el.focus(); }
  }

  const podeCriarAlgo = () => st.dados && (st.dados.permissoes.receber.criar || st.dados.permissoes.pagar.criar || st.dados.permissoes.contas);
  const contaNome = (id) => { const c = st.dados && st.dados.contas.find((x) => x.id === id); return c ? c.nome : '—'; };
  const mesLabel = (m) => MESES[Number(m.slice(5, 7)) - 1] + '/' + m.slice(0, 4);
  const mesLongo = (m) => MESES_LONGOS[Number(m.slice(5, 7)) - 1] + '/' + m.slice(0, 4);

  function cardConta() {
    const d = st.dados;
    const atual = st.conta ? d.contas.find((c) => c.id === st.conta) : null;
    const saldo = atual ? atual.saldoAtual : d.contas.reduce((a, c) => a + c.saldoAtual, 0);
    const prev = atual ? atual.previsaoMes : d.contas.reduce((a, c) => a + c.previsaoMes, 0);
    return '<div class="card conta"><div class="conta-sel"><span class="bank">' + IC.bank + '</span><select data-k="conta" aria-label="Conta">' +
      '<option value="">Todas as contas</option>' + d.contas.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === st.conta ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></div>' +
      '<div class="l"><span class="g">Saldo atual:</span><b class="' + (saldo < 0 ? 'r' : '') + '">' + money(saldo) + '</b></div>' +
      '<div class="l"><span class="muted">Previsão do mês:</span><b style="font-size:15px">' + money(prev) + '</b></div></div>';
  }

  function grafico(serie, altura) {
    if (!serie || !serie.length) return '';
    const W = 560, H = altura || 230, pl = 84, pr = 10, pt = 12, pb = 26;
    const curto = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const vals = serie.map((p) => p.saldo);
    let min = Math.min(0, ...vals), max = Math.max(0, ...vals);
    if (max === min) max = min + 1;
    const x = (i) => pl + (i * (W - pl - pr)) / Math.max(1, serie.length - 1);
    const y = (v) => pt + ((max - v) * (H - pt - pb)) / (max - min);
    const pts = serie.map((p, i) => x(i).toFixed(1) + ',' + y(p.saldo).toFixed(1)).join(' ');
    const hoje = hojeISO();
    const iHoje = serie.findIndex((p) => p.dia === hoje);
    const marcas = [0, Math.floor((serie.length - 1) / 2), serie.length - 1];
    const fim = serie[serie.length - 1].saldo;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Saldo projetado no mês: termina em ' + esc(money(fim)) + '">' +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#d1d5db"/>' +
      '<line x1="' + pl + '" x2="' + pl + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#e5e7eb"/>' +
      (Math.abs(y(max) - y(0)) > 14 ? '<text x="' + (pl - 6) + '" y="' + (y(max) + 4) + '" text-anchor="end" font-size="13" fill="#6b7280">' + esc(curto(max)) + '</text>' : '') +
      (min < 0 && Math.abs(y(min) - y(0)) > 14 ? '<text x="' + (pl - 6) + '" y="' + (y(min) + 4) + '" text-anchor="end" font-size="13" fill="#6b7280">' + esc(curto(min)) + '</text>' : '') +
      '<text x="' + (pl - 6) + '" y="' + (y(0) + 4) + '" text-anchor="end" font-size="13" fill="#6b7280">R$ 0</text>' +
      (iHoje >= 0 ? '<line x1="' + x(iHoje) + '" x2="' + x(iHoje) + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#c7d2fe" stroke-dasharray="3 3"/>' : '') +
      '<polyline fill="none" stroke="#5b5bd6" stroke-width="2.2" stroke-linejoin="round" points="' + pts + '"/>' +
      marcas.map((i) => '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="13" fill="#6b7280">' + ddmm(serie[i].dia) + '</text>').join('') +
      '</svg>';
  }

  function anel(pct, cor, rotulo) {
    const r = 54, c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(100, pct));
    return '<div class="ring"><svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="' + rotulo + ': ' + Math.round(p) + '%">' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="#eef0f3" stroke-width="10"/>' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + cor + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 70 70)"/>' +
      '<text x="70" y="62" text-anchor="middle" font-size="14" font-weight="600" fill="' + cor + '">' + rotulo + '</text>' +
      '<text x="70" y="88" text-anchor="middle" font-size="22" fill="#111827">' + Math.round(p) + '%</text></svg></div>';
  }
  const pct = (a, b) => (b > 0 ? (a / b) * 100 : 100);

  function calendario() {
    const d = st.dados;
    const [y, m] = st.mes.split('-').map(Number);
    const primeiro = new Date(Date.UTC(y, m - 1, 1));
    const offset = (primeiro.getUTCDay() + 6) % 7; // segunda = 0
    const inicio = new Date(Date.UTC(y, m - 1, 1 - offset));
    const hoje = hojeISO();
    let rows = '';
    for (let w = 0; w < 6; w++) {
      let tds = '';
      for (let k = 0; k < 7; k++) {
        const dt = new Date(inicio.getTime() + (w * 7 + k) * 86400000);
        const iso = dt.toISOString().slice(0, 10);
        const fora = iso.slice(0, 7) !== st.mes;
        const c = !fora && d.calendario[iso];
        const dots = c ? '<span class="dots">' + (c.receitas ? '<i style="background:#10b981"></i>' : '') + (c.despesas ? '<i style="background:#f43f5e"></i>' : '') + (c.transferencias ? '<i style="background:#5b5bd6"></i>' : '') + '</span>' : '';
        const titulo = c ? ((c.receitas ? c.receitas + ' recebimento(s) ' : '') + (c.despesas ? c.despesas + ' despesa(s) ' : '') + (c.transferencias ? c.transferencias + ' transferência(s)' : '')).trim() : '';
        tds += '<td><button type="button" class="' + (fora ? 'out' : '') + (iso === hoje ? ' hoje' : '') + '"' + (fora ? ' tabindex="-1"' : ' data-act="dia" data-dia="' + iso + '"') + (titulo ? ' title="' + esc(titulo) + '"' : '') + ' aria-label="' + ddmmaaaa(iso) + (titulo ? ', ' + esc(titulo) : '') + '">' + dt.getUTCDate() + dots + '</button></td>';
      }
      rows += '<tr>' + tds + '</tr>';
      if (w >= 3 && new Date(inicio.getTime() + ((w + 1) * 7) * 86400000).toISOString().slice(0, 7) !== st.mes) break;
    }
    return '<div class="card cal"><div class="cal-h"><h3>' + MESES_LONGOS[m - 1] + ' - ' + y + '</h3><div style="display:flex;gap:6px">' +
      '<button type="button" class="icon-btn" data-act="mes" data-n="-1" aria-label="Mês anterior">' + IC.left + '</button><button type="button" class="icon-btn" data-act="mes" data-n="1" aria-label="Próximo mês">' + IC.right + '</button></div></div>' +
      '<table data-sort-enhanced="true"><thead><tr><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th><th>Dom</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="legend"><span><i style="background:#10b981"></i>Recebimentos</span><span><i style="background:#f43f5e"></i>Despesas</span><span><i style="background:#5b5bd6"></i>Transferências</span></div></div>';
  }

  function renderInicio() {
    const d = st.dados;
    const R = d.resumo.receitas, D = d.resumo.despesas;
    const contaTxt = st.conta ? contaNome(st.conta) : 'Todas as contas';
    const res = R.previsto - D.previsto;
    const resReal = R.realizado - D.realizado;
    const maxTop = Math.max(1, ...d.topGastos.map((t) => t.valor));
    return '<div class="grid-inicio">' +
      '<div class="card"><div class="card-h"><h3>Previsto / realizado no mês</h3><p>' + mesLongo(st.mes) + ' - ' + esc(contaTxt) + '</p></div><div class="card-b">' +
      '<div class="rings">' + anel(pct(R.realizado, R.previsto), '#10b981', 'Recebido') + anel(pct(D.realizado, D.previsto), '#f43f5e', 'Pago') + '</div>' +
      '<div class="kv"><div><h4>Recebimentos</h4><div class="l g"><span>Recebido</span><span>' + money(R.realizado) + '</span></div><div class="l g"><span>Falta</span><span>' + money(R.previsto - R.realizado) + '</span></div><div class="l t"><span>Previsto</span><span>' + money(R.previsto) + '</span></div></div>' +
      '<div><h4>Despesas</h4><div class="l r"><span>Pago</span><span>' + money(D.realizado) + '</span></div><div class="l r"><span>Falta</span><span>' + money(D.previsto - D.realizado) + '</span></div><div class="l t"><span>Previsto</span><span>' + money(D.previsto) + '</span></div></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Fluxo de caixa</h3><p>' + mesLongo(st.mes) + ' - ' + esc(contaTxt) + ' · saldo projetado dia a dia</p></div><div class="card-b">' + grafico(d.serie, 260) + '</div></div>' +
      '<div class="side">' + cardConta() + calendario() + '</div>' +
      '<div class="card"><div class="card-h"><h3>Resultado do mês</h3><p>' + mesLongo(st.mes) + ' - ' + esc(contaTxt) + '</p></div><div class="card-b">' +
      '<div class="kv"><div><div class="l"><span>Resultado previsto</span><b class="' + (res < 0 ? 'r' : 'g') + '">' + money(res) + '</b></div><div class="l"><span>Resultado realizado</span><b class="' + (resReal < 0 ? 'r' : 'g') + '">' + money(resReal) + '</b></div></div>' +
      '<div><div class="bar-line"><span style="width:92px">Recebimentos</span><span class="bar"><i style="width:' + pct(R.previsto, Math.max(R.previsto, D.previsto)) + '%;background:#10b981"></i></span></div>' +
      '<div class="bar-line" style="margin-top:8px"><span style="width:92px">Despesas</span><span class="bar"><i style="width:' + pct(D.previsto, Math.max(R.previsto, D.previsto)) + '%;background:#f43f5e"></i></span></div></div></div>' +
      '<p style="margin:14px 0 0"><button type="button" class="btn" data-act="pagina" data-p="transacoes">Ver as transações do mês</button></p></div></div>' +
      '<div class="card top5"><div class="card-h"><h3>Top 5 gastos do mês anterior</h3><p>' + mesLongo(somaMes(st.mes, -1)) + ' - ' + esc(contaTxt) + '</p></div><div class="card-b">' +
      (d.topGastos.length ? d.topGastos.map((t) => '<div class="it"><div class="l"><span>' + esc(t.categoria) + '</span><span class="r">' + money(t.valor) + '</span></div><div class="bar"><i style="width:' + (t.valor / maxTop * 100) + '%;background:#f43f5e"></i></div></div>').join('') : '<p class="muted">Nenhuma despesa no mês anterior.</p>') +
      '</div></div></div>';
  }

  function listaFiltrada() {
    const d = st.dados;
    const f = st.filtros;
    const b = norm(st.busca);
    let lista = d.transacoes.filter((t) => (t.tipo === 'receita' ? st.rec : st.des));
    if (st.dia) lista = lista.filter((t) => t.data === st.dia);
    if (b) lista = lista.filter((t) => norm(t.descricao + ' ' + t.contato + ' ' + t.categoria + ' ' + t.modo).includes(b));
    if (f.categoria) lista = lista.filter((t) => t.categoria === f.categoria);
    if (f.contato) lista = lista.filter((t) => t.contato === f.contato);
    if (f.modo) lista = lista.filter((t) => t.modo === f.modo);
    if (f.situacao === 'pagos') lista = lista.filter((t) => t.pago);
    if (f.situacao === 'nao_pagos') lista = lista.filter((t) => !t.pago);
    if (f.situacao === 'vencidos') lista = lista.filter((t) => !t.pago && t.data < hojeISO());
    const { campo, asc } = st.ordem;
    const k = (t) => (campo === 'valor' ? t.valor : norm(t[campo] || ''));
    lista = [...lista].sort((a, c) => { const x = k(a), y = k(c); const r = x < y ? -1 : x > y ? 1 : 0; return (asc ? r : -r) || a.data.localeCompare(c.data); });
    return lista;
  }

  function renderTransacoes() {
    const d = st.dados;
    const R = d.resumo.receitas, D = d.resumo.despesas;
    const p = d.permissoes;
    let h = '<div class="resumo"><div class="res-prev"><div class="lbl">Resultado previsto no mês</div><div class="val ' + (R.previsto - D.previsto < 0 ? 'r' : '') + '">' + money(R.previsto - D.previsto) + '</div>' +
      '<div class="pb">' +
      (p.receber.ver ? '<div><h4>Recebimentos</h4><div class="bar-line"><span class="bar"><i style="width:' + pct(R.realizado, R.previsto) + '%;background:#10b981"></i></span><span class="g">' + pct(R.realizado, R.previsto).toFixed(2).replace('.', ',') + '%</span></div><div class="row g"><span>Recebido</span><span>' + money(R.realizado) + '</span></div><div class="row muted"><span>Previsto</span><span>' + money(R.previsto) + '</span></div></div>' : '') +
      (p.pagar.ver ? '<div><h4>Despesas</h4><div class="bar-line"><span class="bar"><i style="width:' + pct(D.realizado, D.previsto) + '%;background:#f43f5e"></i></span><span class="r">' + pct(D.realizado, D.previsto).toFixed(2).replace('.', ',') + '%</span></div><div class="row r"><span>Pago</span><span>' + money(D.realizado) + '</span></div><div class="row muted"><span>Previsto</span><span>' + money(D.previsto) + '</span></div></div>' : '') +
      '</div></div><div>' + grafico(d.serie, 170) + '</div>' + cardConta() + '</div>';

    h += '<div class="toolbar"><div class="mes"><button type="button" class="icon-btn" data-act="mes" data-n="-1" aria-label="Mês anterior">' + IC.left + '</button><span class="lbl" aria-live="polite">' + mesLabel(st.mes) + '</span><button type="button" class="icon-btn" data-act="mes" data-n="1" aria-label="Próximo mês">' + IC.right + '</button></div>';
    if (st.dia) h += '<button type="button" class="chip dia" data-act="limpar-dia" aria-label="Remover filtro do dia">Dia ' + ddmm(st.dia) + ' ✕</button>';
    h += '<span class="grow"></span>';
    if (p.receber.ver) h += '<button type="button" class="chip rec" data-act="chip" data-c="rec" aria-pressed="' + (!st.trf && st.rec) + '">Recebimentos</button>';
    if (p.pagar.ver) h += '<button type="button" class="chip des" data-act="chip" data-c="des" aria-pressed="' + (!st.trf && st.des) + '">Despesas</button>';
    h += '<button type="button" class="chip trf" data-act="chip" data-c="trf" aria-pressed="' + st.trf + '" style="margin-left:14px">Transferências</button></div>';

    h += '<div class="card">';
    if (st.trf) return h + renderTransferencias() + '</div>';

    h += '<div style="display:flex;justify-content:flex-end;padding:10px 14px;border-bottom:1px solid #e5e7eb"><button type="button" class="btn" data-act="filtros" aria-expanded="' + st.mostrarFiltros + '">' + IC.filter + ' Filtrar' + (Object.values(st.filtros).some(Boolean) ? ' •' : '') + '</button></div>';
    if (st.mostrarFiltros) {
      const cats = [...new Set(d.transacoes.map((t) => t.categoria))].sort();
      const cont = [...new Set(d.transacoes.map((t) => t.contato).filter(Boolean))].sort();
      const modos = [...new Set(d.transacoes.map((t) => t.modo).filter(Boolean))].sort();
      const sel = (k, rot, ops, labels) => '<label class="f">' + rot + '<select class="i" data-k="f-' + k + '"><option value="">Todos</option>' + ops.map((o, i) => '<option value="' + esc(o) + '"' + (st.filtros[k] === o ? ' selected' : '') + '>' + esc(labels ? labels[i] : o) + '</option>').join('') + '</select></label>';
      h += '<div class="filtros">' + sel('categoria', 'Categoria', cats) + sel('contato', 'Contato', cont) + sel('situacao', 'Situação', ['pagos', 'nao_pagos', 'vencidos'], ['Pagos', 'Não pagos', 'Vencidos']) + sel('modo', 'Modo de pagamento', modos) +
        '<label class="f" style="justify-content:flex-end"><button type="button" class="btn" data-act="limpar-filtros">Limpar</button></label></div>';
    }
    const lista = listaFiltrada();
    if (st.sel.size) {
      const podeB = p.receber.baixar || p.pagar.baixar, podeX = p.receber.excluir || p.pagar.excluir;
      h += '<div class="lote" role="toolbar" aria-label="Ações nos selecionados"><b>' + st.sel.size + ' selecionado(s)</b>' +
        (podeB ? '<button type="button" class="btn" data-act="lote-pagar">Marcar como pago</button><button type="button" class="btn" data-act="lote-despagar">Marcar como não pago</button>' : '') +
        (podeX ? '<button type="button" class="btn danger" data-act="lote-excluir">Excluir</button>' : '') +
        '<button type="button" class="btn" data-act="lote-limpar">Limpar seleção</button></div>';
    }
    const so = st.rec && !st.des ? 'rec' : !st.rec && st.des ? 'des' : '';
    const colContato = so === 'rec' ? 'Recebido de' : so === 'des' ? 'Pago a' : 'Recebido de / Pago a';
    const th = (campo, rot) => '<th><button type="button" data-act="ordem" data-campo="' + campo + '">' + rot + (st.ordem.campo === campo ? (st.ordem.asc ? ' ▴' : ' ▾') : ' ↕') + '</button></th>';
    const todosSel = lista.length > 0 && lista.every((t) => st.sel.has(t.id));
    h += '<div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr><th style="width:34px"><input type="checkbox" data-act="sel-todos" aria-label="Selecionar todos"' + (todosSel ? ' checked' : '') + '></th>' +
      th('data', 'Data') + th('descricao', 'Descrição') + th('contato', colContato) + th('categoria', 'Categoria') + th('valor', 'Valor') + '<th>Tipo pagamento</th><th>Modo de pagamento</th><th>Pago?</th></tr></thead><tbody>';
    const podeNova = (st.rec && p.receber.criar) || (st.des && p.pagar.criar);
    if (podeNova) h += '<tr><td colspan="9" class="nova"><button type="button" data-act="nova">+ Nova transação</button></td></tr>';
    const hoje = hojeISO();
    for (const t of lista) {
      const rec = t.tipo === 'receita';
      const podeB = rec ? p.receber.baixar : p.pagar.baixar;
      const vencido = !t.pago && t.data < hoje;
      h += '<tr class="lin' + (st.sel.has(t.id) ? ' sel' : '') + '" data-act="abrir" data-id="' + esc(t.id) + '">' +
        '<td><input type="checkbox" data-act="sel" data-id="' + esc(t.id) + '" aria-label="Selecionar ' + esc(t.descricao) + '"' + (st.sel.has(t.id) ? ' checked' : '') + '></td>' +
        '<td style="white-space:nowrap' + (vencido ? ';color:#be123c' : '') + '"' + (vencido ? ' title="Vencido"' : '') + '>' + ddmm(t.data) + '</td>' +
        '<td class="trunc" title="' + esc(t.descricao + (t.observacao ? ' — ' + t.observacao : '')) + '">' + esc(t.descricao) + '</td>' +
        '<td class="trunc c" title="' + esc(t.contato) + '">' + esc(t.contato || '—') + '</td><td><span class="tag">' + esc(t.categoria) + '</span></td>' +
        '<td style="white-space:nowrap" class="' + (rec ? 'g' : 'r') + '">' + (rec ? '' : '- ') + money(t.valor) + '</td>' +
        '<td style="white-space:nowrap">' + esc(t.tipoPagamento) + '</td><td>' + esc(t.modo || '—') + '</td>' +
        '<td><button type="button" class="sw' + (rec ? '' : ' des') + '" role="switch" aria-checked="' + t.pago + '" data-act="pago" data-id="' + esc(t.id) + '" aria-label="' + (rec ? 'Recebido' : 'Pago') + '"' + (podeB ? '' : ' disabled') + ' title="' + (t.pago ? (rec ? 'Recebido em ' : 'Pago em ') + ddmmaaaa(t.dataPagamento) : 'Marcar como ' + (rec ? 'recebido' : 'pago')) + '"></button>' + (t.parcial ? '<span class="sw-parcial">parcial: ' + money(t.valorPago) + '</span>' : '') + '</td></tr>';
    }
    h += '</tbody></table></div>';
    if (!lista.length) h += '<div class="vazio"><b>' + (d.transacoes.length ? 'Nada encontrado' : 'A lista está vazia') + '</b>' + (d.transacoes.length ? 'Mude os filtros ou a pesquisa.' : 'Nenhuma transação em ' + mesLongo(st.mes) + '.') + '</div>';
    const rs = lista.filter((t) => t.tipo === 'receita'), ds = lista.filter((t) => t.tipo === 'despesa');
    const s = (l, c) => l.reduce((a, t) => a + t[c], 0);
    const total = s(rs, 'valor') - s(ds, 'valor');
    h += '<div class="totais"><div class="box"><div class="l t"><span>Total</span><span class="' + (total < 0 ? 'r' : '') + '">' + money(total) + '</span></div>' +
      (rs.length || st.rec ? '<div class="l g"><span>Recebido</span><span>' + money(s(rs, 'valorPago')) + '</span></div><div class="l muted"><span>A receber</span><span>' + money(s(rs, 'valor') - s(rs, 'valorPago')) + '</span></div>' : '') +
      (ds.length || st.des ? '<div class="l r"><span>Pago</span><span>' + money(s(ds, 'valorPago')) + '</span></div><div class="l muted"><span>A pagar</span><span>' + money(s(ds, 'valor') - s(ds, 'valorPago')) + '</span></div>' : '') +
      '</div></div>';
    return h + '</div>';
  }

  function renderTransferencias() {
    const d = st.dados;
    let h = '<div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr><th>Data</th><th>Descrição</th><th>De</th><th>Para</th><th>Valor</th><th></th></tr></thead><tbody>';
    if (d.permissoes.contas) h += '<tr><td colspan="6" class="nova"><button type="button" data-act="nova-trf">+ Nova transferência</button></td></tr>';
    for (const t of d.transferencias) {
      h += '<tr><td>' + ddmm(t.data) + '</td><td>' + esc(t.descricao) + '</td><td>' + esc(contaNome(t.deContaId)) + '</td><td>' + esc(contaNome(t.paraContaId)) + '</td><td style="color:#5b5bd6">' + money(t.valor) + '</td>' +
        '<td>' + (d.permissoes.contas ? '<button type="button" class="btn danger" data-act="excluir-trf" data-id="' + esc(t.recordId) + '">Excluir</button>' : '') + '</td></tr>';
    }
    h += '</tbody></table></div>';
    if (!d.transferencias.length) h += '<div class="vazio"><b>Nenhuma transferência</b>Transferências entre contas em ' + mesLongo(st.mes) + ' aparecem aqui.</div>';
    return h;
  }

  function renderContas() {
    const d = st.dados;
    let h = '<p class="muted" style="margin:0 0 14px">Contas bancárias, carteira e caixa. O saldo atual é o saldo inicial mais tudo o que foi recebido e pago em cada conta até hoje.</p><div class="contas-grid">';
    for (const c of d.contas) {
      h += '<div class="card conta-card"><h3>' + esc(c.nome) + (c.principal ? ' <span class="tag">principal</span>' : '') + '</h3><div class="muted" style="font-size:13px">' + esc(TIPOS_CONTA[c.tipo] || 'Conta') + (c.banco ? ' · ' + esc(c.banco) : '') + '</div>' +
        '<div class="s ' + (c.saldoAtual < 0 ? 'r' : '') + '">' + money(c.saldoAtual) + '</div><div class="muted" style="font-size:13px">Saldo atual · previsão do mês ' + money(c.previsaoMes) + '</div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:6px">Saldo inicial ' + money(c.saldoInicial) + (c.dataSaldoInicial ? ' em ' + ddmmaaaa(c.dataSaldoInicial) : '') + '</div>' +
        (d.permissoes.contas ? '<div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="btn" data-act="editar-conta" data-id="' + esc(c.id) + '">Editar</button>' + (c.principal ? '' : '<button type="button" class="btn danger" data-act="desativar-conta" data-id="' + esc(c.id) + '">Desativar</button>') + '</div>' : '') + '</div>';
    }
    if (d.permissoes.contas) h += '<button type="button" class="card conta-card" data-act="nova-conta" style="border:2px dashed #8b8bf0;color:#5b5bd6;font:inherit;font-size:15px;cursor:pointer;min-height:150px">+ Nova conta</button>';
    return h + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Formulários (painel lateral)
  // ---------------------------------------------------------------------------
  function renderDrawer() {
    const dr = st.drawer;
    let titulo = 'Nova transação', corpo = '', rodape = '';
    const d = st.dados;
    if (dr.tipo === 'conta') {
      const c = dr.conta || {};
      titulo = c.id ? 'Editar conta' : 'Nova conta';
      corpo = '<label class="f">Nome da conta *<input class="i" name="nome" required maxlength="60" data-autofocus value="' + esc(c.nome || '') + '"></label>' +
        '<label class="f">Tipo<select class="i" name="tipo">' + Object.keys(TIPOS_CONTA).map((k) => '<option value="' + k + '"' + ((c.tipo || 'corrente') === k ? ' selected' : '') + '>' + TIPOS_CONTA[k] + '</option>').join('') + '</select></label>' +
        '<label class="f">Banco (opcional)<input class="i" name="banco" maxlength="60" value="' + esc(c.banco || '') + '"></label>' +
        '<div class="two"><label class="f">Saldo inicial<input class="i" name="saldoInicial" type="number" step="0.01" value="' + esc(c.saldoInicial != null ? c.saldoInicial : 0) + '"></label>' +
        '<label class="f">Data do saldo inicial<input class="i" name="dataSaldoInicial" type="date" value="' + esc(c.dataSaldoInicial || '') + '"></label></div>' +
        '<p class="hint">O saldo inicial é o valor que estava na conta antes dos lançamentos registrados no sistema.</p>';
      rodape = '<button type="submit" class="btn pri">Salvar</button><button type="button" class="btn" data-act="fechar-drawer">Cancelar</button>';
    } else {
      const t = dr.t || {};
      const editando = Boolean(t.id);
      const modo = dr.modo; // receita | despesa | transferencia
      const rec = modo === 'receita';
      const p = d.permissoes;
      titulo = editando ? (rec ? 'Recebimento' : 'Despesa') : 'Nova transação';
      const travado = editando && !t.editavel;
      if (!editando) {
        const segs = [];
        if (p.receber.criar) segs.push('<button type="button" class="rec" data-act="modo" data-m="receita" aria-pressed="' + (modo === 'receita') + '">Recebimento</button>');
        if (p.pagar.criar) segs.push('<button type="button" class="des" data-act="modo" data-m="despesa" aria-pressed="' + (modo === 'despesa') + '">Despesa</button>');
        if (p.contas && d.contas.length > 1) segs.push('<button type="button" class="trf" data-act="modo" data-m="transferencia" aria-pressed="' + (modo === 'transferencia') + '">Transferência</button>');
        corpo += '<div class="seg" role="group" aria-label="Tipo">' + segs.join('') + '</div>';
      }
      if (modo === 'transferencia') {
        const opts = (sel) => d.contas.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('');
        corpo += '<div class="two"><label class="f">De *<select class="i" name="deContaId">' + opts(d.contas[0] && d.contas[0].id) + '</select></label><label class="f">Para *<select class="i" name="paraContaId">' + opts(d.contas[1] && d.contas[1].id) + '</select></label></div>' +
          '<div class="two"><label class="f">Valor *<input class="i" name="valor" type="number" step="0.01" min="0.01" required data-autofocus></label><label class="f">Data *<input class="i" name="data" type="date" required value="' + hojeISO() + '"></label></div>' +
          '<label class="f">Descrição<input class="i" name="descricao" maxlength="200" placeholder="Transferência entre contas"></label>';
        rodape = '<button type="submit" class="btn pri">Salvar transferência</button><button type="button" class="btn" data-act="fechar-drawer">Cancelar</button>';
      } else {
        const nat = rec ? 'receber' : 'pagar';
        if (travado) corpo += '<div class="aviso">Lançamento gerado por uma OS, venda ou título com parcelas. Aqui dá para marcar como pago ou não pago; os demais dados são alterados na tela de origem.</div>';
        const dis = travado ? ' disabled' : '';
        corpo += '<label class="f">Descrição *<input class="i" name="descricao" required maxlength="200" value="' + esc(t.descricao || '') + '"' + dis + (travado ? '' : ' data-autofocus') + '></label>' +
          '<div class="two"><label class="f">Valor *<input class="i" name="valor" type="number" step="0.01" min="0.01" required value="' + esc(t.valor != null ? t.valor : '') + '"' + (travado || (editando && t.pago) ? ' disabled' : '') + '></label>' +
          '<label class="f">' + (editando ? 'Vencimento *' : 'Data *') + '<input class="i" name="data" type="date" required value="' + esc(t.data || (st.dia || (st.mes === hojeISO().slice(0, 7) ? hojeISO() : st.mes + '-01'))) + '"' + dis + '></label></div>' +
          (editando && t.pago && !travado ? '<p class="hint">Para mudar o valor, desmarque o pagamento primeiro.</p>' : '') +
          '<label class="f">' + (rec ? 'Recebido de' : 'Pago a') + '<input class="i" name="contato" list="md-fin-contatos" maxlength="120" value="' + esc(t.contato || '') + '"' + dis + ' placeholder="' + (rec ? 'Cliente' : 'Fornecedor') + '"></label>' +
          '<datalist id="md-fin-contatos">' + (d.opcoes.contatos[nat] || []).map((c) => '<option value="' + esc(c.nome) + '"></option>').join('') + '</datalist>' +
          '<div class="two"><label class="f">Categoria<input class="i" name="categoria" list="md-fin-cats" maxlength="80" value="' + esc(t.categoria && t.categoria !== 'Sem categoria' ? t.categoria : '') + '"' + dis + ' placeholder="Ex.: ' + (rec ? 'Serviços' : 'Aluguel') + '"></label>' +
          '<label class="f">Conta<select class="i" name="contaId">' + d.contas.map((c) => '<option value="' + esc(c.id) + '"' + ((t.contaId || st.conta || d.contas[0].id) === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></label></div>' +
          '<datalist id="md-fin-cats">' + (d.opcoes.categorias[nat] || []).map((c) => '<option value="' + esc(c) + '"></option>').join('') + '</datalist>' +
          '<label class="f">Modo de pagamento<input class="i" name="modo" list="md-fin-modos" maxlength="60" value="' + esc(t.modo || '') + '"></label>' +
          '<datalist id="md-fin-modos">' + d.opcoes.modos.map((m) => '<option value="' + esc(m) + '"></option>').join('') + '</datalist>';
        if (!editando) {
          const r = dr.repeticao || 'UNICA';
          corpo += '<label class="f">Repetição<select class="i" name="repeticao" data-k="repeticao">' + REPETICOES.map((x) => '<option value="' + x[0] + '"' + (r === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></label>';
          if (r === 'PARCELADA' || r === 'FIXA_MENSAL') corpo += '<label class="f">' + (r === 'PARCELADA' ? 'Número de parcelas' : 'Quantos meses') + '<input class="i" name="vezes" type="number" min="' + (r === 'PARCELADA' ? 2 : 1) + '" max="120" value="' + esc(dr.vezes || (r === 'PARCELADA' ? 2 : 12)) + '" data-k="vezes"></label>';
          corpo += '<p class="hint" data-hint-rep>' + esc(dicaRepeticao(r, dr.valor, dr.vezes)) + '</p>';
        } else {
          corpo += '<p class="hint">' + esc(t.tipoPagamento) + (t.grupo ? ' · faz parte de uma série' : '') + '</p>';
        }
        const podeB = rec ? p.receber.baixar : p.pagar.baixar;
        if (podeB) {
          const marcado = dr.pago != null ? dr.pago : Boolean(t.pago);
          corpo += '<label class="chk"><input type="checkbox" name="pago" data-k="pago"' + (marcado ? ' checked' : '') + '> ' + (rec ? 'Recebido' : 'Pago') + (!editando && dr.repeticao && dr.repeticao !== 'UNICA' ? ' (só o primeiro lançamento)' : '') + '</label>';
          if (marcado) corpo += '<label class="f">Data do ' + (rec ? 'recebimento' : 'pagamento') + '<input class="i" name="dataPagamento" type="date" value="' + esc(t.dataPagamento || hojeISO()) + '"></label>';
          if (t.parcial) corpo += '<p class="hint">Recebido parcialmente: ' + money(t.valorPago) + ' de ' + money(t.valor) + '.</p>';
        }
        corpo += '<label class="f">Observação<textarea class="i" name="observacao" rows="2" maxlength="500"' + dis + '>' + esc(t.observacao || '') + '</textarea></label>';
        rodape = '<button type="submit" class="btn pri">Salvar</button><button type="button" class="btn" data-act="fechar-drawer">Cancelar</button>';
        if (editando && !travado && !t.pago && (rec ? p.receber.excluir : p.pagar.excluir)) {
          rodape += '<span class="grow"></span>' + (t.grupo ? '<button type="button" class="btn danger" data-act="excluir" data-escopo="esta">Excluir esta</button><button type="button" class="btn danger" data-act="excluir" data-escopo="proximas">Excluir esta e as próximas</button>' : '<button type="button" class="btn danger" data-act="excluir" data-escopo="esta">Excluir</button>');
        }
      }
    }
    return '<div class="drawer-bg" data-act="fechar-drawer"></div><form class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '" novalidate><div class="dh"><h2>' + esc(titulo) + '</h2><button type="button" class="icon-btn" data-act="fechar-drawer" aria-label="Fechar">' + IC.close + '</button></div>' +
      '<div class="db">' + (dr.erro ? '<div class="msg bad" role="alert">' + esc(dr.erro) + '</div>' : '') + corpo + '</div><div class="df">' + rodape + '</div></form>';
  }

  function dicaRepeticao(r, valor, vezes) {
    const v = Number(valor) || 0;
    const n = Number(vezes) || (r === 'PARCELADA' ? 2 : 12);
    if (r === 'PARCELADA') return v ? n + ' parcelas mensais: ' + money(Math.floor((v / n) * 100) / 100) + ' cada (o valor informado é o total).' : 'O valor informado é o total, dividido em parcelas mensais.';
    if (r === 'FIXA_MENSAL') return 'O mesmo valor todo mês, por ' + n + ' meses.';
    if (r === 'FIXA_INDETERMINADA') return 'O mesmo valor todo mês. O sistema mantém sempre os próximos 12 meses lançados.';
    if (r === 'VARIAVEL_MENSAL') return 'Todo mês, com o valor informado como estimativa (ajuste em cada mês).';
    return 'Um lançamento só.';
  }

  function abrirNova(modo) {
    const p = st.dados.permissoes;
    let m = modo;
    if (!m) m = st.des && !st.rec ? 'despesa' : 'receita';
    if (m === 'receita' && !p.receber.criar) m = p.pagar.criar ? 'despesa' : 'transferencia';
    if (m === 'despesa' && !p.pagar.criar) m = p.receber.criar ? 'receita' : 'transferencia';
    st.drawer = { tipo: 'transacao', modo: m, t: {}, repeticao: 'UNICA' };
    render();
  }

  function lerForm(form) {
    const o = {};
    [...form.elements].forEach((el) => { if (!el.name) return; o[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    return o;
  }

  async function onSubmit(e) {
    const form = e.target.closest('form.drawer');
    if (!form) return;
    e.preventDefault();
    const dr = st.drawer;
    const v = lerForm(form);
    const botao = form.querySelector('button[type=submit]');
    if (botao) botao.disabled = true;
    try {
      if (dr.tipo === 'conta') {
        const corpo = { nome: v.nome, tipo: v.tipo, banco: v.banco, saldoInicial: Number(v.saldoInicial) || 0, dataSaldoInicial: v.dataSaldoInicial };
        if (dr.conta && dr.conta.id) await api('PUT', '/contas-bancarias/' + encodeURIComponent(dr.conta.id), corpo);
        else await api('POST', '/contas-bancarias', corpo);
        aviso('Conta salva.');
      } else if (dr.modo === 'transferencia') {
        await api('POST', '/transferencias', { deContaId: v.deContaId, paraContaId: v.paraContaId, valor: Number(v.valor), data: v.data, descricao: v.descricao });
        aviso('Transferência registrada.');
      } else {
        const t = dr.t || {};
        const contato = v.contato ? { nome: v.contato, id: ((st.dados.opcoes.contatos[dr.modo === 'receita' ? 'receber' : 'pagar'] || []).find((c) => c.nome === v.contato) || {}).id || '' } : undefined;
        if (!t.id) {
          await api('POST', '/transacoes', {
            tipo: dr.modo, descricao: v.descricao, valor: Number(v.valor), data: v.data, contato, categoria: v.categoria, contaId: v.contaId, modo: v.modo,
            repeticao: { tipo: v.repeticao || 'UNICA', vezes: Number(v.vezes) || 0 }, pago: Boolean(v.pago), dataPagamento: v.dataPagamento, observacao: v.observacao,
          });
          aviso(dr.modo === 'receita' ? 'Recebimento lançado.' : 'Despesa lançada.');
        } else {
          if (t.editavel) {
            const corpo = { descricao: v.descricao, data: v.data, categoria: v.categoria, contaId: v.contaId, modo: v.modo, observacao: v.observacao, contato: contato || { nome: '' } };
            if (!t.pago) corpo.valor = Number(v.valor);
            await api('PUT', '/transacoes/' + encodeURIComponent(t.id), corpo);
          }
          if (v.pago !== undefined && Boolean(v.pago) !== Boolean(t.pago)) {
            await api('POST', '/transacoes/pagamento', { ids: [t.id], pago: Boolean(v.pago), data: v.dataPagamento, contaId: v.contaId, modo: v.modo });
          } else if (v.pago && t.pago && v.dataPagamento && v.dataPagamento !== t.dataPagamento) {
            await api('POST', '/transacoes/pagamento', { ids: [t.id], pago: false });
            await api('POST', '/transacoes/pagamento', { ids: [t.id], pago: true, data: v.dataPagamento, contaId: v.contaId, modo: v.modo });
          }
          aviso('Alterações salvas.');
        }
      }
      st.drawer = null;
      await carregar();
      syncApp();
    } catch (err) {
      dr.erro = err.message;
      Object.assign(dr, { valor: v.valor, vezes: v.vezes, repeticao: v.repeticao || dr.repeticao, pago: v.pago });
      if (dr.t) Object.assign(dr.t, { descricao: v.descricao, valor: v.valor !== undefined ? v.valor : dr.t.valor, data: v.data, contato: v.contato, categoria: v.categoria, modo: v.modo, observacao: v.observacao, contaId: v.contaId, dataPagamento: v.dataPagamento });
      render();
    }
  }

  function aviso(texto, ok) {
    st.msg = { texto, ok: ok !== false };
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { st.msg = null; if (root && !st.drawer) render(); }, 4000);
  }

  async function executar(fn, sucesso) {
    try { const r = await fn(); if (sucesso) aviso(typeof sucesso === 'function' ? sucesso(r) : sucesso); await carregar(); syncApp(); }
    catch (err) { aviso(err.message, false); render(); }
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------
  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t || !(root.contains(t) || drawerHost.contains(t))) return;
    const act = t.dataset.act;
    const d = st.dados;
    if (act === 'fechar') return close();
    if (act === 'recarregar') return carregar();
    if (act === 'pagina') { st.pagina = t.dataset.p; st.drawer = null; render(); return; }
    if (act === 'mes') { st.mes = somaMes(st.mes, Number(t.dataset.n)); st.dia = ''; st.sel.clear(); render(); carregar(); return; }
    if (act === 'dia') { st.dia = t.dataset.dia; st.pagina = 'transacoes'; st.trf = false; render(); return; }
    if (act === 'limpar-dia') { st.dia = ''; render(); return; }
    if (act === 'chip') {
      const c = t.dataset.c;
      if (c === 'trf') st.trf = !st.trf;
      else {
        if (st.trf) { st.trf = false; st.rec = c === 'rec'; st.des = c === 'des'; }
        else if (c === 'rec') { st.rec = !st.rec; if (!st.rec && !st.des) st.des = true; }
        else { st.des = !st.des; if (!st.rec && !st.des) st.rec = true; }
        if (!d.permissoes.receber.ver) st.rec = false;
        if (!d.permissoes.pagar.ver) st.des = false;
      }
      st.sel.clear(); render(); return;
    }
    if (act === 'filtros') { st.mostrarFiltros = !st.mostrarFiltros; render(); return; }
    if (act === 'limpar-filtros') { st.filtros = { categoria: '', contato: '', situacao: '', modo: '' }; render(); return; }
    if (act === 'ordem') { const c = t.dataset.campo; st.ordem = { campo: c, asc: st.ordem.campo === c ? !st.ordem.asc : true }; render(); return; }
    if (act === 'nova') { if (st.pagina === 'contas') { st.drawer = { tipo: 'conta', conta: null }; render(); return; } abrirNova(); return; }
    if (act === 'nova-trf') { st.drawer = { tipo: 'transacao', modo: 'transferencia', t: {} }; render(); return; }
    if (act === 'modo') { st.drawer.modo = t.dataset.m; st.drawer.erro = ''; render(); return; }
    if (act === 'fechar-drawer') { if (e.target === t || t.tagName === 'BUTTON' || t.closest('button')) { st.drawer = null; render(); } return; }
    if (act === 'sel') { e.stopPropagation(); const id = t.dataset.id; if (t.checked) st.sel.add(id); else st.sel.delete(id); render(); return; }
    if (act === 'sel-todos') { const lista = listaFiltrada(); if (t.checked) lista.forEach((x) => st.sel.add(x.id)); else st.sel.clear(); render(); return; }
    if (act === 'lote-limpar') { st.sel.clear(); render(); return; }
    if (act === 'lote-pagar' || act === 'lote-despagar') {
      const ids = [...st.sel]; const pago = act === 'lote-pagar';
      return executar(() => api('POST', '/transacoes/pagamento', { ids, pago, data: hojeISO() }), (r) => r.alterados + ' lançamento(s) ' + (pago ? 'marcados como pagos.' : 'marcados como não pagos.'));
    }
    if (act === 'lote-excluir') {
      const ids = [...st.sel];
      if (!window.confirm('Excluir ' + ids.length + ' lançamento(s)? Lançamentos já pagos e os que vieram de OS/vendas não são excluídos.')) return;
      return executar(() => api('POST', '/transacoes/excluir', { ids }), (r) => r.excluidos + ' excluído(s)' + (r.bloqueados.length ? '; ' + r.bloqueados.length + ' não puderam ser excluídos (pagos ou de OS/venda).' : '.'));
    }
    if (act === 'pago') {
      e.stopPropagation();
      const x = d.transacoes.find((y) => y.id === t.dataset.id);
      if (!x) return;
      t.disabled = true;
      return executar(() => api('POST', '/transacoes/pagamento', { ids: [x.id], pago: !x.pago, data: hojeISO() }), x.pago ? 'Pagamento desfeito.' : (x.tipo === 'receita' ? 'Marcado como recebido hoje.' : 'Marcado como pago hoje.'));
    }
    if (act === 'abrir') {
      if (e.target.closest('input,button')) return;
      const x = d.transacoes.find((y) => y.id === t.dataset.id);
      if (!x) return;
      st.drawer = { tipo: 'transacao', modo: x.tipo, t: { ...x } };
      render(); return;
    }
    if (act === 'excluir') {
      const x = st.drawer && st.drawer.t;
      if (!x) return;
      const prox = t.dataset.escopo === 'proximas';
      if (!window.confirm(prox ? 'Excluir este lançamento e os próximos desta série (os já pagos ficam)?' : 'Excluir este lançamento?')) return;
      st.drawer = null;
      return executar(() => api('POST', '/transacoes/excluir', { ids: [x.id], escopo: prox ? 'proximas' : 'esta' }), (r) => (r.excluidos ? r.excluidos + ' lançamento(s) excluído(s).' : 'Nada foi excluído.'));
    }
    if (act === 'excluir-trf') {
      if (!window.confirm('Excluir esta transferência?')) return;
      return executar(() => api('POST', '/transferencias/' + encodeURIComponent(t.dataset.id) + '/excluir'), 'Transferência excluída.');
    }
    if (act === 'nova-conta') { st.drawer = { tipo: 'conta', conta: null }; render(); return; }
    if (act === 'editar-conta') { st.drawer = { tipo: 'conta', conta: d.contas.find((c) => c.id === t.dataset.id) }; render(); return; }
    if (act === 'desativar-conta') {
      if (!window.confirm('Desativar esta conta? Os lançamentos dela continuam no sistema.')) return;
      return executar(() => api('PUT', '/contas-bancarias/' + encodeURIComponent(t.dataset.id), { ativo: false }), 'Conta desativada.');
    }
  }

  function onChange(e) {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    if (k === 'conta') { st.conta = e.target.value; salvarPref(); st.sel.clear(); carregar(); return; }
    if (k.startsWith('f-')) { st.filtros[k.slice(2)] = e.target.value; render(); return; }
    if (k === 'repeticao' || k === 'pago') {
      const form = e.target.closest('form');
      const v = lerForm(form);
      const dr = st.drawer;
      Object.assign(dr, { repeticao: v.repeticao || dr.repeticao, vezes: v.vezes, valor: v.valor, pago: Boolean(v.pago) });
      Object.assign(dr.t, { descricao: v.descricao, valor: v.valor !== undefined ? v.valor : dr.t.valor, data: v.data, contato: v.contato, categoria: v.categoria, modo: v.modo, observacao: v.observacao, contaId: v.contaId, dataPagamento: v.dataPagamento || dr.t.dataPagamento });
      render();
    }
  }
  function onInput(e) {
    const k = e.target.dataset && e.target.dataset.k;
    if (k === 'busca') { st.busca = e.target.value; clearTimeout(onInput.t); onInput.t = setTimeout(render, 150); return; }
    const form = e.target.closest && e.target.closest('form.drawer');
    if (form && (e.target.name === 'valor' || e.target.name === 'vezes')) {
      const hint = form.querySelector('[data-hint-rep]');
      const v = lerForm(form);
      if (hint) hint.textContent = dicaRepeticao(v.repeticao || 'UNICA', v.valor, v.vezes);
    }
  }

  // ---------------------------------------------------------------------------
  // Item no menu lateral (antes de "Financeiro & Fiscal")
  // ---------------------------------------------------------------------------
  function marcarMenu(ativo) { const b = document.getElementById('menu-btn-fin-transacoes'); if (b) { if (ativo) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); } }
  function injectMenu() {
    const nav = document.querySelector('#sidebar-container nav');
    const existing = document.getElementById('menu-btn-fin-transacoes');
    const u = user();
    if (!nav || !podeVer(u)) { if (existing) existing.remove(); if (root && !u) close(); return; }
    ensureStyles();
    const sidebar = document.getElementById('sidebar-container');
    const collapsed = sidebar && sidebar.offsetWidth < 100;
    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'menu-btn-fin-transacoes';
      btn.title = 'Transações';
      btn.addEventListener('click', () => open('transacoes'));
    }
    const html = IC.money + (collapsed ? '' : '<span>TRANSAÇÕES</span>');
    if (btn.innerHTML !== html) btn.innerHTML = html;
    btn.style.justifyContent = collapsed ? 'center' : '';
    if (root) btn.setAttribute('aria-current', 'page');
    const ancora = [...nav.children].find((el) => el !== btn && /financeiro/i.test(el.textContent || ''));
    if (ancora) { if (ancora.previousElementSibling !== btn) ancora.before(btn); }
    else if (btn.parentElement !== nav) nav.appendChild(btn);
    if (root) posicionar();
  }

  // Clicar em outro item do menu (ou trocar de empresa) fecha a tela
  document.addEventListener('click', (e) => {
    if (!root) return;
    const item = e.target.closest && e.target.closest('#sidebar-container nav button, #sidebar-container nav a');
    if (item && item.id !== 'menu-btn-fin-transacoes') close();
  }, true);
  let empresaAnterior = companyId();
  setInterval(() => {
    injectMenu();
    const atual = companyId();
    if (atual !== empresaAnterior) { empresaAnterior = atual; st.conta = ''; st.dados = null; if (root) { render(); carregar(); } }
  }, 1000);

  window.MotorDeskOpenTransacoes = open;
})();
