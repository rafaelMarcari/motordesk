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
      '.md-fin .nav{display:flex;flex-wrap:wrap;gap:2px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:3px}',
      '.md-fin .nav button{border:0;background:none;padding:7px 12px;border-radius:999px;font:inherit;font-size:13.5px;color:#4b5563;cursor:pointer}',
      '.md-fin .nav button[aria-current=page]{background:#0f766e;color:#fff;font-weight:600}',
      '.md-fin .grow{flex:1}',
      '.md-fin .search{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:0 10px;height:38px;min-width:220px}',
      '.md-fin .search input{border:0;outline:0;font:inherit;font-size:14px;width:100%;background:none}',
      '.md-fin .icon-btn{width:38px;height:38px;border-radius:999px;border:1px solid #d1d5db;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:#4b5563}',
      '.md-fin .icon-btn:hover{border-color:#0f766e;color:#0f766e}',
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
      '.md-fin .conta-sel select{border:0;font:inherit;font-size:18px;font-weight:600;color:#0f766e;background:none;flex:1;cursor:pointer;min-width:0}',
      '.md-fin .conta .l{display:flex;gap:10px;align-items:baseline;font-size:14px;padding:3px 0}',
      '.md-fin .conta .l b{font-size:18px}',
      '.md-fin .cal{padding:14px 16px}',
      '.md-fin .cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.md-fin .cal-h h3{margin:0;font-size:18px;font-weight:600;color:#374151}',
      '.md-fin .cal table{width:100%;border-collapse:collapse;text-align:center;font-size:14px}',
      '.md-fin .cal th{font-weight:500;color:#6b7280;font-size:12.5px;padding:6px 0;border-bottom:1px solid #e5e7eb}',
      '.md-fin .cal td{padding:4px 0;border-bottom:1px solid #f1f2f4}',
      '.md-fin .cal button{border:0;background:none;font:inherit;width:36px;height:36px;border-radius:999px;cursor:pointer;color:#374151;position:relative}',
      '.md-fin .cal button:hover{background:#f0fdfa}.md-fin .cal button.out{color:#c4c8cf}.md-fin .cal button.hoje{border:1.5px solid #374151}',
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
      '.md-fin .mes .lbl{background:#0f766e;color:#fff;border-radius:999px;padding:8px 0;width:160px;text-align:center;font-weight:500;font-size:15px;letter-spacing:.03em}',
      '.md-fin .chip{border-radius:999px;padding:7px 16px;font:inherit;font-size:14px;cursor:pointer;background:#fff;border:1px solid #d1d5db}',
      '.md-fin .chip.rec{color:#059669;border-color:#a7f3d0}.md-fin .chip.rec[aria-pressed=true]{background:#10b981;color:#fff;border-color:#10b981}',
      '.md-fin .chip.des{color:#e11d48;border-color:#fecdd3}.md-fin .chip.des[aria-pressed=true]{background:#f43f5e;color:#fff;border-color:#f43f5e}',
      '.md-fin .chip.trf{color:#0f766e;border-color:#99f6e4}.md-fin .chip.trf[aria-pressed=true]{background:#0f766e;color:#fff;border-color:#0f766e}',
      '.md-fin .chip.dia{background:#f0fdfa;border-color:#99f6e4;color:#115e59}',
      '.md-fin .btn{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer;color:#374151;display:inline-flex;align-items:center;gap:6px}',
      '.md-fin .btn:hover{border-color:#9ca3af}.md-fin .btn svg{width:16px;height:16px}',
      '.md-fin .btn.pri{background:#0f766e;border-color:#0f766e;color:#fff}.md-fin .btn.pri:hover{background:#115e59}',
      '.md-fin .btn.danger{color:#be123c;border-color:#fecdd3}.md-fin .btn:disabled{opacity:.55;cursor:default}',
      '.md-fin .filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fafafb}',
      '.md-fin label.f{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:#4b5563}',
      '.md-fin input.i,.md-fin select.i,.md-fin textarea.i,.md-fin button.i{border:1px solid #d1d5db;border-radius:7px;padding:8px 10px;font:inherit;font-size:14px;background:#fff;color:#111827;width:100%}',
      '.md-fin input.i:focus,.md-fin select.i:focus,.md-fin textarea.i:focus{outline:2px solid #99f6e4;border-color:#0f766e}',
      '.md-fin .tbl-wrap{overflow-x:auto}',
      '.md-fin table.tx{width:100%;border-collapse:collapse;font-size:14px;min-width:900px}',
      '.md-fin table.tx th{text-align:left;font-weight:600;color:#374151;padding:12px 8px;border-bottom:1px solid #e5e7eb;white-space:nowrap}',
      '.md-fin table.tx th button{border:0;background:none;font:inherit;font-weight:600;color:inherit;cursor:pointer;padding:0}',
      '.md-fin table.tx td{padding:11px 8px;border-bottom:1px solid #f1f2f4;vertical-align:middle}',
      '.md-fin table.tx td.trunc.c{max-width:190px}.md-fin table.tx td.trunc{max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.md-fin table.tx tr.lin{cursor:pointer}.md-fin table.tx tr.lin:hover td{background:#fafaff}',
      '.md-fin table.tx tr.lin.sel td{background:#f0fdfa}',
      '.md-fin .nova{padding:8px 10px;background:#f4f5f7}',
      '.md-fin .nova button{width:100%;border:2px dashed #5eead4;border-radius:8px;background:#fff;color:#0f766e;font:inherit;font-size:15px;padding:8px;cursor:pointer}',
      '.md-fin .nova button:hover{background:#f0fdfa}',
      '.md-fin .vazio{text-align:center;padding:46px 10px;color:#6b7280}.md-fin .vazio b{display:block;font-size:18px;color:#374151;margin-bottom:4px}',
      '.md-fin .sw{width:40px;height:22px;border-radius:999px;background:#d1d5db;border:0;position:relative;cursor:pointer;flex-shrink:0;transition:background .15s}',
      '.md-fin .sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:999px;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)}',
      '.md-fin .sw[aria-checked=true]{background:#10b981}.md-fin .sw[aria-checked=true]::after{left:21px}',
      '.md-fin .sw.des[aria-checked=true]{background:#f43f5e}.md-fin .sw:disabled{opacity:.5;cursor:default}',
      '.md-fin .sw-parcial{font-size:11px;color:#b45309;display:block}',
      '.md-fin .totais{display:flex;justify-content:flex-end;padding:14px}',
      '.md-fin .totais .box{border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;min-width:300px;box-shadow:0 1px 3px rgba(0,0,0,.05)}',
      '.md-fin .totais .l{display:flex;justify-content:space-between;gap:30px;font-size:14px;padding:2px 0}.md-fin .totais .l.t{font-size:17px;font-weight:600;margin-bottom:4px}',
      '.md-fin .lote{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;background:#f0fdfa;border-bottom:1px solid #99f6e4;font-size:14px}',
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
      '.md-fin .seg button[aria-pressed=true].rec{background:#10b981;border-color:#10b981;color:#fff}.md-fin .seg button[aria-pressed=true].des{background:#f43f5e;border-color:#f43f5e;color:#fff}.md-fin .seg button[aria-pressed=true].trf{background:#0f766e;border-color:#0f766e;color:#fff}',
      '.md-fin .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.md-fin .chk{display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer}.md-fin .chk input{width:17px;height:17px}',
      '.md-fin .hint{font-size:12.5px;color:#6b7280;margin:-4px 0 0}',
      '.md-fin .aviso{font-size:13px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:8px;padding:9px 11px}',
      '.md-fin .contas-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}',
      '.md-fin .conta-card{padding:16px}.md-fin .conta-card h3{margin:0 0 2px;font-size:16px;color:#374151}.md-fin .conta-card .s{font-size:22px;font-weight:600;margin:10px 0 2px}',
      '.md-fin .top5 .it{margin:9px 0}.md-fin .top5 .it .l{display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px}',
      '.md-fin .loading{padding:60px;text-align:center;color:#6b7280}',
      '.md-fin .ct-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:16px}',
      '.md-fin .ct-card{display:flex;flex-direction:column;justify-content:space-between}.md-fin .ct-top{display:flex;gap:14px;align-items:center;padding:16px}',
      '.md-fin .ct-ic{width:52px;height:52px;border-radius:10px;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.md-fin .ct-v{font-size:24px;font-weight:600}.md-fin .ct-v small{font-size:16px;font-weight:400;letter-spacing:.1em}',
      '.md-fin .ct-mais{border:0;border-top:1px solid #f1f2f4;background:#fafafb;text-align:left;padding:12px 16px;color:#0f766e;font:inherit;font-size:15px;cursor:pointer;border-radius:0 0 10px 10px}.md-fin .ct-mais[aria-pressed=true]{background:#f0fdfa}',
      '.md-fin .pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}',
      '.md-fin .pill{border:1px solid #d1d5db;background:#fff;color:#0f766e;border-radius:999px;padding:7px 16px;font:inherit;font-size:14.5px;cursor:pointer}.md-fin .pill[aria-pressed=true]{background:#0f766e;border-color:#0f766e;color:#fff}',
      '.md-fin .filtros-rel{padding:14px 16px;margin-bottom:14px}.md-fin .fr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}',
      '.md-fin .fr-linha{display:flex;flex-wrap:wrap;align-items:flex-end;gap:24px;margin-top:14px}',
      '.md-fin div.f{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:#4b5563}.md-fin .ms{position:relative}.md-fin .ms-btn{min-height:38px;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.md-fin .ms-list{position:absolute;z-index:5;top:100%;left:0;right:0;min-width:220px;max-height:260px;overflow:auto;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:8px;display:flex;flex-direction:column;gap:6px;color:#111827}',
      '.md-fin .rel-grid{display:grid;grid-template-columns:250px minmax(0,1fr);gap:14px;align-items:start}@media (max-width:900px){.md-fin .rel-grid{grid-template-columns:1fr}}',
      '.md-fin .rel-menu{padding:10px;display:flex;flex-direction:column}.md-fin .rel-g{font-size:13.5px;color:#6b7280;margin:10px 8px 4px}',
      '.md-fin .rel-menu button{border:0;background:none;text-align:left;font:inherit;font-size:14.5px;padding:8px 10px;border-radius:7px;cursor:pointer;color:#374151}.md-fin .rel-menu button:hover{background:#f4f5f7}.md-fin .rel-menu button[aria-current=true]{background:#eef0f3;font-weight:600}',
      '.md-fin .rel-body{padding:14px 18px;min-width:0;overflow-x:auto}.md-fin .rel-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:8px}.md-fin .rel-h h3{margin:0;font-size:16px}',
      '.md-fin table.rel{width:100%;border-collapse:collapse;font-size:14px}.md-fin table.rel th,.md-fin table.rel td{padding:9px 8px;border-bottom:1px solid #f1f2f4;text-align:left}.md-fin table.rel .n{text-align:right;white-space:nowrap}.md-fin table.rel tfoot th{border-top:1px solid #e5e7eb}',
      '.md-fin .res-l{display:flex;justify-content:space-between;align-items:center;padding:14px 4px;border-bottom:1px solid #f1f2f4;font-size:15.5px}.md-fin .res-l.t{font-weight:600;font-size:17px;border-bottom:0}',
      '.md-fin .imp-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin-bottom:16px}',
      '.md-fin .imp-card{display:flex;flex-direction:column;justify-content:space-between}.md-fin .imp-top{display:flex;gap:14px;padding:16px}.md-fin .imp-top h3{margin:0 0 4px;font-size:19px;font-weight:500}.md-fin .imp-top p{margin:0;color:#6b7280;font-size:14px;line-height:1.4}.md-fin .imp-ic{flex-shrink:0}',
      '.md-fin .imp-acoes{display:flex;border-top:1px solid #f1f2f4}.md-fin .imp-btn,.md-fin .imp-link{flex:1;text-align:center;padding:12px;color:#0f766e;font:inherit;font-size:15px;cursor:pointer;background:none;border:0}.md-fin .imp-btn:hover,.md-fin .imp-link:hover{background:#f0fdfa}.md-fin .imp-link{border-left:1px solid #f1f2f4;color:#6b7280}',
      '.md-fin .map-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}.md-fin .imp-res{display:flex;flex-wrap:wrap;gap:16px;font-size:14px;font-weight:500}',
      '.md-fin .drawer.wide{width:min(980px,100vw)}',
      '.md-fin .conc-lista{display:flex;flex-direction:column}.md-fin .conc-it{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:18px;padding:14px 16px;border-bottom:1px solid #f1f2f4}@media (max-width:800px){.md-fin .conc-it{grid-template-columns:1fr}}',
      '.md-fin .conc-it.conciliado{background:#f6fdf9}.md-fin .conc-it.ignorado{background:#fafafb;opacity:.85}.md-fin .conc-sis{display:flex;flex-direction:column;gap:6px;align-items:flex-start}.md-fin .chk.sug{align-items:flex-start;font-size:13.5px}.md-fin .conc-form{width:100%}',
      '#md-fin{background:#f1f5f9;color:#0f172a}',
      '.md-fin .wrap{padding:16px 22px 40px}',
      '.md-fin .mdf-head{background:#0f172a;color:#e2e8f0;position:sticky;top:0;z-index:4;box-shadow:0 2px 6px rgba(15,23,42,.25)}',
      '.md-fin .mdf-head-in{max-width:1500px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px 22px 4px}',
      '.md-fin .mdf-kicker{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#5eead4;font-weight:700}',
      '.md-fin .mdf-title h1{color:#f8fafc;font-size:21px;margin:2px 0 0;font-weight:700}',
      '.md-fin .mdf-tabs{max-width:1500px;margin:0 auto;display:flex;flex-wrap:wrap;gap:2px;padding:0 14px}',
      '.md-fin .mdf-tabs button{border:0;background:none;color:#94a3b8;font:inherit;font-size:13.5px;font-weight:600;padding:10px 10px 11px;border-bottom:3px solid transparent;cursor:pointer}',
      '.md-fin .mdf-tabs button:hover{color:#e2e8f0}.md-fin .mdf-tabs button[aria-current=page]{color:#fff;border-bottom-color:#14b8a6}',
      '.md-fin .mdf-head .search{background:#1e293b;border-color:#334155;border-radius:6px;min-width:260px}.md-fin .mdf-head .search input{color:#f1f5f9}.md-fin .mdf-head .search input::placeholder{color:#94a3b8}',
      '.md-fin .icon-btn{border-radius:6px}.md-fin .icon-btn.dark{background:#1e293b;border-color:#334155;color:#cbd5e1}',
      '.md-fin .btn{border-radius:6px}.md-fin .btn.pri{background:#0f766e;border-color:#0f766e;color:#fff}.md-fin .btn.pri:hover{background:#115e59}.md-fin .btn.sm{padding:5px 10px;font-size:13px}',
      '.md-fin .card{border-radius:6px;border-color:#e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,.04)}.md-fin .card-h h3{color:#0f172a;font-size:16px}',
      '.md-fin .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}',
      '.md-fin .kpi{background:#fff;border:1px solid #e2e8f0;border-top:4px solid #94a3b8;border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;text-align:left;font:inherit;color:inherit}',
      '.md-fin button.kpi{cursor:pointer}.md-fin button.kpi[aria-pressed=true]{outline:2px solid #0f172a}',
      '.md-fin .kpi.ent{border-top-color:#059669}.md-fin .kpi.sai{border-top-color:#e11d48}.md-fin .kpi.res{border-top-color:#0f766e}.md-fin .kpi.res.neg .kpi-v{color:#be123c}.md-fin .kpi.cx{border-top-color:#0f172a}',
      '.md-fin .kpi-t{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:700}.md-fin .kpi-v{font-size:22px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums}.md-fin .kpi-s{font-size:12.5px;color:#64748b}',
      '.md-fin .kpi-bar{height:5px;background:#e2e8f0;border-radius:2px;overflow:hidden}.md-fin .kpi-bar i{display:block;height:100%}.md-fin .kpi.ent .kpi-bar i{background:#059669}.md-fin .kpi.sai .kpi-bar i{background:#e11d48}',
      '.md-fin .mdf-conta{padding:4px 8px;font-size:13px;margin:2px 0}',
      '.md-fin .mes{gap:6px}.md-fin .mes .lbl{background:none;color:#0f172a;width:auto;min-width:170px;font-size:16px;font-weight:700;letter-spacing:0;padding:0 4px;text-align:center}.md-fin .mes .icon-btn{width:32px;height:32px}',
      '.md-fin .seg-tipo{display:inline-flex;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#fff}',
      '.md-fin .seg-tipo button{border:0;border-right:1px solid #cbd5e1;background:none;padding:7px 14px;font:inherit;font-size:13.5px;color:#334155;cursor:pointer}.md-fin .seg-tipo button:last-child{border-right:0}.md-fin .seg-tipo button[aria-pressed=true]{background:#0f172a;color:#fff}',
      '.md-fin table.tx th{background:#f8fafc;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:#475569}.md-fin table.tx th.n,.md-fin table.tx td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.md-fin table.tx tr.lin:hover td{background:#f8fafc}.md-fin table.tx tr.lin.sel td{background:#f0fdfa}',
      '.md-fin .tipo-dot{display:inline-block;width:7px;height:7px;border-radius:2px;margin-right:8px;vertical-align:middle}.md-fin .tipo-dot.g{background:#059669}.md-fin .tipo-dot.r{background:#e11d48}',
      '.md-fin .sit{border:1px solid;border-radius:4px;padding:3px 9px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;background:#fff}',
      '.md-fin .sit.ok{color:#047857;border-color:#a7f3d0;background:#ecfdf5}.md-fin .sit.aberto{color:#475569;border-color:#cbd5e1}.md-fin .sit.venc{color:#be123c;border-color:#fecdd3;background:#fff1f2}.md-fin .sit.parc{color:#b45309;border-color:#fde68a;background:#fffbeb}.md-fin .sit:disabled{cursor:default;opacity:.8}',
      '.md-fin .rodape-tot{display:flex;flex-wrap:wrap;gap:22px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#475569}.md-fin .rodape-tot .tot{font-size:15.5px}',
      '.md-fin .grid-painel{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:14px}@media (max-width:1000px){.md-fin .grid-painel{grid-template-columns:1fr}}',
      '.md-fin .ag-venc{display:block;width:100%;text-align:left;border:1px solid #fecdd3;background:#fff1f2;color:#be123c;border-radius:6px;padding:8px 10px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;margin-bottom:10px}',
      '.md-fin .ag-dia{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9}.md-fin .ag-data{border:1px solid #e2e8f0;background:#f8fafc;border-radius:6px;width:52px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:4px 0;cursor:pointer;font:inherit}.md-fin .ag-data b{font-size:18px;color:#0f172a}.md-fin .ag-data span{font-size:11px;color:#64748b}',
      '.md-fin .ag-dia ul{list-style:none;margin:0;padding:0;flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;font-size:13.5px}.md-fin .ag-dia li{display:flex;justify-content:space-between;gap:8px}.md-fin .trunc-i{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.md-fin .rp{margin:8px 0 14px}.md-fin .rp-l{display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px}.md-fin .rp-bar{position:relative;height:14px;background:#f1f5f9;border-radius:3px}.md-fin .rp-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:3px}.md-fin .rp-bar i.prev{background:#cbd5e1}.md-fin .rp-bar i.real.g{background:#059669}.md-fin .rp-bar i.real.r{background:#e11d48}',
      '.md-fin .top5 .rk{display:inline-flex;width:20px;height:20px;border-radius:4px;background:#0f172a;color:#fff;font-size:11.5px;align-items:center;justify-content:center;margin-right:8px}.md-fin .top5 .bar i{background:#0f766e}',
      '.md-fin .drawer .dh{background:#0f172a}.md-fin .drawer .dh h2{color:#fff}.md-fin .drawer{border-radius:0}',
      '.md-fin .seg button{border-radius:6px}.md-fin .seg button[aria-pressed=true].rec{background:#059669;border-color:#059669}.md-fin .seg button[aria-pressed=true].des{background:#e11d48;border-color:#e11d48}.md-fin .seg button[aria-pressed=true].trf{background:#0f172a;border-color:#0f172a}',
      '.md-fin .pill{color:#334155;border-radius:6px;font-size:13.5px;padding:6px 12px}.md-fin .pill[aria-pressed=true]{background:#0f172a;border-color:#0f172a;color:#fff}',
      '.md-fin .sw[aria-checked=true]{background:#0f766e}.md-fin .chip.dia{border-radius:6px;background:#f0fdfa;border-color:#99f6e4;color:#115e59}',
      '.md-fin .imp-lista{display:flex;flex-direction:column;margin-bottom:18px}.md-fin .imp-row{display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid #f1f5f9}.md-fin .imp-row:last-child{border-bottom:0}',
      '.md-fin .imp-row .imp-ic{width:44px;height:44px;border-radius:6px;background:#f0fdfa;color:#0f766e;display:flex;align-items:center;justify-content:center;flex-shrink:0}.md-fin .imp-txt{flex:1;min-width:0}.md-fin .imp-txt h3{margin:0;font-size:15px}.md-fin .imp-txt p{margin:2px 0 0;font-size:13.5px;color:#64748b}',
      '.md-fin .imp-row .imp-acoes{display:flex;gap:8px;border:0;flex-shrink:0}.md-fin .sec-t{font-size:15px;margin:0 0 8px;color:#0f172a}',
      '.md-fin label.f.rel-sel{flex-direction:row;align-items:center;gap:8px;font-size:13.5px;color:#334155;font-weight:600}.md-fin table.tx th button{text-transform:inherit;letter-spacing:inherit;color:inherit}.md-fin table.rel tr.grp td{background:#f8fafc}.md-fin .rel-sel select{min-width:280px}.md-fin .rel-per{font-size:13.5px}',
      '.md-fin table.rel tr.grp th{font-weight:700;background:#f8fafc}.md-fin .res-l.t{border-top:2px solid #0f172a;margin-top:6px}',
      '.md-fin .conc-it.conciliado{background:#f0fdf4}.md-fin .vazio b{color:#0f172a}',
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
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="26" height="26"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6"/></svg>',
    userMinus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="26" height="26"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 11h6"/></svg>',
    cake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="26" height="26"><path d="M4 21V12h16v9M2 21h20M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 4 0M12 8v4M12 4.5a1.5 1.5 0 0 1 0 3"/></svg>',
    impPlanilha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/></svg>',
    impSistema: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="26" height="26" aria-hidden="true"><path d="M4 7h11M11 3l4 4-4 4M20 17H9M13 13l-4 4 4 4"/></svg>',
    impContatos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.6-2 2-3 3.5-3s2.9 1 3.5 3M14 10h4M14 13h4"/></svg>',
    impBanco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26" aria-hidden="true"><path d="M3 10h18L12 4zM5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18"/></svg>',
    users: '<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="#374151"/><g stroke="#fff" stroke-width="2.4" fill="none"><circle cx="24" cy="20" r="4"/><circle cx="15" cy="22" r="3"/><circle cx="33" cy="22" r="3"/><path d="M16 33c0-4 3.5-6 8-6s8 2 8 6M9 31c0-3 2-4.5 5-4.5M39 31c0-3-2-4.5-5-4.5"/></g></svg>',
    doc: '<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="#374151"/><g stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"><path d="M18 13h9l5 5v17H18z"/><path d="M27 13v5h5M21 25h8M21 29h8"/></g></svg>',
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
    modulo: null,
    ct: { dados: null, tipo: 'todos', cartao: '', busca: '', ordem: { campo: 'nome', asc: true } },
    rel: { dados: null, de: hojeISO().slice(0, 8) + '01', ate: '', cats: [], contas: [], contatos: [], modos: [], tipoPag: '', pagos: true, naoPagos: true, por: 'pagamento', relatorio: 'resultados', aberto: '' },
    imp: { dados: null },
    conc: { dados: null, contaId: '', filtro: 'pendente', criando: '' },
  };
  st.rel.ate = (() => { const [y, m] = st.rel.de.split('-').map(Number); return st.rel.de.slice(0, 8) + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0'); })();
  const PAGINAS = [
    ['inicio', 'Painel', 'transacoes'], ['transacoes', 'Lançamentos', 'transacoes'], ['contas', 'Contas', 'transacoes'],
    ['contatos', 'Contatos', 'contatos'], ['relatorios', 'Relatórios', 'relatorios'], ['importacoes', 'Importar', 'importacoes'],
    ['conciliacoes', 'Conciliação bancária', 'importacoes'], ['acessos', 'Acessos', 'acessos'],
  ];
  const paginaLiberada = (p) => {
    const m = st.modulo;
    const def = PAGINAS.find((x) => x[0] === p);
    if (!m || !def) return false;
    if (def[2] === 'acessos') return Boolean(m.gerenciaUsuarios || m.master);
    return Boolean(m.telas[def[2]]);
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
      root.setAttribute('aria-label', 'Lançamentos financeiros');
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
      if (!st.modulo) { st.modulo = await api('GET', '/modulo'); menuInfo = st.modulo; }
      if (!paginaLiberada(st.pagina)) { const p = PAGINAS.find((x) => paginaLiberada(x[0])); if (!p) throw new Error(st.modulo.contratado ? 'Nenhuma tela do módulo Lançamentos liberada para o seu usuário.' : 'O módulo Lançamentos não foi contratado por esta empresa.'); st.pagina = p[0]; render(); }
      const pg = st.pagina;
      if (pg === 'contatos') { st.ct.dados = await api('GET', '/contatos'); return; }
      if (pg === 'relatorios') { st.rel.dados = await api('GET', '/relatorio?de=' + st.rel.de + '&ate=' + st.rel.ate); return; }
      if (pg === 'importacoes') { st.imp.dados = await api('GET', '/importacoes'); return; }
      if (pg === 'conciliacoes') { st.conc.dados = await api('GET', '/conciliacoes' + (st.conc.contaId ? '?contaId=' + encodeURIComponent(st.conc.contaId) : '')); st.conc.contaId = st.conc.dados.contaId; return; }
      if (pg === 'acessos') { st.modulo = await api('GET', '/modulo'); menuInfo = st.modulo; return; }
      const d = await api('GET', '/transacoes?mes=' + st.mes + (st.conta ? '&conta=' + encodeURIComponent(st.conta) : ''));
      st.dados = d;
      if (st.conta && !d.contaId) { st.conta = ''; salvarPref(); }
      const vis = new Set(d.transacoes.map((t) => t.id));
      st.sel.forEach((id) => { if (!vis.has(id)) st.sel.delete(id); });
      if (!d.permissoes.receber.ver) st.rec = false;
      if (!d.permissoes.pagar.ver) st.des = false;
    } catch (e) { st.erro = e.message; } finally {
      st.carregando = false;
      render();
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function render() {
    if (!root) return;
    const foco = document.activeElement && (root.contains(document.activeElement) || drawerHost.contains(document.activeElement)) && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    const nav = PAGINAS.filter((p) => paginaLiberada(p[0]));
    const atual = PAGINAS.find((p) => p[0] === st.pagina) || PAGINAS[1];
    const empresa = st.modulo && st.modulo.empresa ? st.modulo.empresa.nome : '';
    let html = '<header class="mdf-head"><div class="mdf-head-in"><div class="mdf-title"><span class="mdf-kicker">Financeiro' + (empresa ? ' · ' + esc(empresa) : '') + '</span><h1>' + esc(atual[1]) + '</h1></div><span class="grow"></span>';
    if (st.pagina === 'transacoes') html += '<label class="search">' + IC.search + '<input data-k="busca" placeholder="Buscar histórico, contato, categoria" aria-label="Buscar lançamentos" value="' + esc(st.busca) + '"></label>';
    if (st.pagina === 'contatos') html += '<label class="search">' + IC.search + '<input data-k="busca-ct" placeholder="Buscar nome, documento, e-mail" aria-label="Buscar contatos" value="' + esc(st.ct.busca) + '"></label>';
    if (['inicio', 'transacoes', 'contas'].includes(st.pagina) && st.dados && podeCriarAlgo()) html += '<button type="button" class="btn pri" data-act="nova">' + IC.plus + ' Novo lançamento</button>';
    if (st.pagina === 'contatos' && st.ct.dados && st.ct.dados.podeEditar) html += '<button type="button" class="btn pri" data-act="novo-contato">' + IC.plus + ' Novo contato</button>';
    html += '<button type="button" class="icon-btn dark" data-act="fechar" title="Fechar" aria-label="Fechar">' + IC.close + '</button></div>' +
      '<nav class="mdf-tabs" aria-label="Financeiro">' + nav.map((n) => '<button type="button" data-act="pagina" data-p="' + n[0] + '"' + (st.pagina === n[0] ? ' aria-current="page"' : '') + '>' + n[1] + '</button>').join('') + '</nav></header><div class="wrap">';
    if (st.msg) html += '<div class="msg ' + (st.msg.ok ? 'ok' : 'bad') + '" role="status">' + esc(st.msg.texto) + '</div>';
    if (st.erro) html += '<div class="msg bad">' + esc(st.erro) + ' <button type="button" class="btn" data-act="recarregar">Tentar de novo</button></div>';
    if (st.modulo && st.modulo.master && !st.modulo.contratado) html += '<div class="aviso" style="margin-bottom:12px">Esta empresa não contratou o módulo Lançamentos. Só a conta mestre vê estas telas; marque a contratação em Acessos.</div>';
    const pg = st.pagina;
    const pronto = { inicio: st.dados, transacoes: st.dados, contas: st.dados, contatos: st.ct.dados, relatorios: st.rel.dados, importacoes: st.imp.dados, conciliacoes: st.conc.dados, acessos: st.modulo }[pg];
    if (!pronto) html += st.erro ? '' : '<div class="loading">Carregando…</div>';
    else if (pg === 'inicio') html += renderInicio();
    else if (pg === 'contas') html += renderContas();
    else if (pg === 'contatos') html += renderContatos();
    else if (pg === 'relatorios') html += renderRelatorios();
    else if (pg === 'importacoes') html += renderImportacoes();
    else if (pg === 'conciliacoes') html += renderConciliacoes();
    else if (pg === 'acessos') html += renderAcessos();
    else html += renderTransacoes();
    html += '</div>';
    root.innerHTML = html;
    drawerHost.innerHTML = st.drawer ? renderDrawer() : '';
    if (foco) { const el = root.querySelector('[data-k="' + foco + '"]') || drawerHost.querySelector('[data-k="' + foco + '"]'); if (el) { el.focus(); if (el.setSelectionRange && typeof el.value === 'string') { const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) {} } } }
    else if (st.drawer) { const el = drawerHost.querySelector('.drawer [data-autofocus]'); if (el) el.focus(); }
  }

  const podeCriarAlgo = () => st.dados && (st.dados.permissoes.receber.criar || st.dados.permissoes.pagar.criar || st.dados.permissoes.contas);
  const contaNome = (id) => { const c = st.dados && st.dados.contas.find((x) => x.id === id); return c ? c.nome : '—'; };
  const mesLabel = (m) => MESES_LONGOS[Number(m.slice(5, 7)) - 1] + ' de ' + m.slice(0, 4);
  const mesLongo = (m) => MESES_LONGOS[Number(m.slice(5, 7)) - 1] + '/' + m.slice(0, 4);
  const pct = (a, b) => (b > 0 ? (a / b) * 100 : 100);

  // Seletor de conta + saldo, usado dentro dos indicadores
  function seletorConta() {
    const d = st.dados;
    return '<select class="i mdf-conta" data-k="conta" aria-label="Conta"><option value="">Todas as contas</option>' + d.contas.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === st.conta ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select>';
  }
  function indicadores() {
    const d = st.dados;
    const R = d.resumo.receitas, D = d.resumo.despesas, p = d.permissoes;
    const atual = st.conta ? d.contas.find((c) => c.id === st.conta) : null;
    const saldo = atual ? atual.saldoAtual : d.contas.reduce((a, c) => a + c.saldoAtual, 0);
    const prev = atual ? atual.previsaoMes : d.contas.reduce((a, c) => a + c.previsaoMes, 0);
    const res = R.previsto - D.previsto;
    const tile = (cls, titulo, valor, linha2, barra) => '<div class="kpi ' + cls + '"><div class="kpi-t">' + titulo + '</div><div class="kpi-v">' + valor + '</div>' + (barra != null ? '<div class="kpi-bar"><i style="width:' + Math.min(100, barra) + '%"></i></div>' : '') + '<div class="kpi-s">' + linha2 + '</div></div>';
    return '<section class="kpis" aria-label="Indicadores do mês">' +
      (p.receber.ver ? tile('ent', 'Entradas no mês', money(R.realizado), 'de ' + money(R.previsto) + ' previstas · ' + Math.round(pct(R.realizado, R.previsto)) + '%', pct(R.realizado, R.previsto)) : '') +
      (p.pagar.ver ? tile('sai', 'Saídas no mês', money(D.realizado), 'de ' + money(D.previsto) + ' previstas · ' + Math.round(pct(D.realizado, D.previsto)) + '%', pct(D.realizado, D.previsto)) : '') +
      tile('res' + (res < 0 ? ' neg' : ''), 'Saldo previsto do mês', money(res), 'realizado até agora: ' + money(R.realizado - D.realizado)) +
      '<div class="kpi cx"><div class="kpi-t">Saldo em conta</div>' + seletorConta() + '<div class="kpi-v' + (saldo < 0 ? ' r' : '') + '">' + money(saldo) + '</div><div class="kpi-s">fim do mês (previsão): ' + money(prev) + '</div></div>' +
      '</section>';
  }

  function grafico(serie, altura) {
    if (!serie || !serie.length) return '';
    const W = 640, H = altura || 230, pl = 84, pr = 12, pt = 14, pb = 28;
    const curto = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const vals = serie.map((p) => p.saldo);
    let min = Math.min(0, ...vals), max = Math.max(0, ...vals);
    if (max === min) max = min + 1;
    const x = (i) => pl + (i * (W - pl - pr)) / Math.max(1, serie.length - 1);
    const y = (v) => pt + ((max - v) * (H - pt - pb)) / (max - min);
    // Barras diárias (positivo/negativo) com a linha do saldo por cima
    const larg = Math.max(2, (W - pl - pr) / serie.length - 3);
    const barras = serie.map((p, i) => { const y0 = y(0), y1 = y(p.saldo); return '<rect x="' + (x(i) - larg / 2).toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + larg.toFixed(1) + '" height="' + Math.max(1, Math.abs(y1 - y0)).toFixed(1) + '" fill="' + (p.saldo < 0 ? '#fecdd3' : '#ccfbf1') + '"/>'; }).join('');
    const pts = serie.map((p, i) => x(i).toFixed(1) + ',' + y(p.saldo).toFixed(1)).join(' ');
    const hoje = hojeISO();
    const iHoje = serie.findIndex((p) => p.dia === hoje);
    const marcas = [0, Math.floor((serie.length - 1) / 3), Math.floor((serie.length - 1) * 2 / 3), serie.length - 1];
    const fim = serie[serie.length - 1].saldo;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Saldo projetado no mês: termina em ' + esc(money(fim)) + '">' + barras +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#94a3b8"/>' +
      (Math.abs(y(max) - y(0)) > 14 ? '<text x="' + (pl - 8) + '" y="' + (y(max) + 4) + '" text-anchor="end" font-size="13" fill="#64748b">' + esc(curto(max)) + '</text>' : '') +
      (min < 0 && Math.abs(y(min) - y(0)) > 14 ? '<text x="' + (pl - 8) + '" y="' + (y(min) + 4) + '" text-anchor="end" font-size="13" fill="#64748b">' + esc(curto(min)) + '</text>' : '') +
      '<text x="' + (pl - 8) + '" y="' + (y(0) + 4) + '" text-anchor="end" font-size="13" fill="#64748b">R$ 0</text>' +
      (iHoje >= 0 ? '<line x1="' + x(iHoje) + '" x2="' + x(iHoje) + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#0f172a" stroke-dasharray="2 4"/><text x="' + x(iHoje) + '" y="' + (pt + 2) + '" text-anchor="middle" font-size="11" fill="#0f172a">hoje</text>' : '') +
      '<polyline fill="none" stroke="#0f766e" stroke-width="2.4" stroke-linejoin="round" points="' + pts + '"/>' +
      marcas.map((i) => '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="13" fill="#64748b">' + ddmm(serie[i].dia) + '</text>').join('') +
      '</svg>';
  }

  // Agenda: próximos lançamentos em aberto (a partir de hoje) e os vencidos do mês
  function agenda() {
    const d = st.dados;
    const hoje = hojeISO();
    const abertos = d.transacoes.filter((t) => !t.pago).sort((a, b) => a.data.localeCompare(b.data));
    const vencidos = abertos.filter((t) => t.data < hoje);
    const proximos = abertos.filter((t) => t.data >= hoje).slice(0, 8);
    const porDia = new Map();
    for (const t of proximos) { if (!porDia.has(t.data)) porDia.set(t.data, []); porDia.get(t.data).push(t); }
    let h = '<div class="card agenda"><div class="card-h"><h3>Agenda de vencimentos</h3><p>' + mesLongo(st.mes) + ' · em aberto</p></div><div class="card-b">';
    if (vencidos.length) h += '<button type="button" class="ag-venc" data-act="ag-vencidos">' + vencidos.length + ' lançamento(s) vencido(s) · ' + money(vencidos.reduce((a, t) => a + t.valor - t.valorPago, 0)) + '</button>';
    if (!porDia.size) h += '<p class="muted" style="margin:6px 0">Nada a vencer no restante do mês.</p>';
    for (const [dia, itens] of porDia) {
      h += '<div class="ag-dia"><button type="button" class="ag-data" data-act="dia" data-dia="' + dia + '" aria-label="Ver lançamentos de ' + ddmmaaaa(dia) + '"><b>' + dia.slice(8, 10) + '</b><span>' + MESES[Number(dia.slice(5, 7)) - 1] + '</span></button><ul>' +
        itens.map((t) => '<li><span class="trunc-i">' + esc(t.descricao) + '</span><b class="' + (t.tipo === 'receita' ? 'g' : 'r') + '">' + (t.tipo === 'receita' ? '+' : '−') + money(t.valor - t.valorPago) + '</b></li>').join('') + '</ul></div>';
    }
    return h + '</div></div>';
  }

  function renderInicio() {
    const d = st.dados;
    const R = d.resumo.receitas, D = d.resumo.despesas;
    const contaTxt = st.conta ? contaNome(st.conta) : 'todas as contas';
    const maxTop = Math.max(1, ...d.topGastos.map((t) => t.valor));
    const maxPrev = Math.max(R.previsto, D.previsto, 1);
    const linha = (rot, real, prev, cor) => '<div class="rp"><div class="rp-l"><span>' + rot + '</span><span><b>' + money(real) + '</b> / ' + money(prev) + '</span></div><div class="rp-bar"><i class="prev" style="width:' + (prev / maxPrev * 100) + '%"></i><i class="real ' + cor + '" style="width:' + (real / maxPrev * 100) + '%"></i></div></div>';
    return indicadores() +
      '<div class="toolbar"><div class="mes">' + navegadorMes() + '</div></div>' +
      '<div class="grid-painel">' +
      '<div class="card"><div class="card-h"><h3>Evolução do saldo</h3><p>' + mesLongo(st.mes) + ' · ' + esc(contaTxt) + ' · pagos pela data do pagamento, em aberto pelo vencimento</p></div><div class="card-b">' + grafico(d.serie, 250) + '</div></div>' +
      agenda() +
      '<div class="card"><div class="card-h"><h3>Realizado × previsto</h3><p>barra clara: previsto · barra escura: realizado</p></div><div class="card-b">' +
      linha('Entradas', R.realizado, R.previsto, 'g') + linha('Saídas', D.realizado, D.previsto, 'r') +
      '<p style="margin:14px 0 0"><button type="button" class="btn" data-act="pagina" data-p="transacoes">Abrir os lançamentos do mês</button></p></div></div>' +
      '<div class="card top5"><div class="card-h"><h3>Maiores saídas por categoria</h3><p>' + mesLongo(somaMes(st.mes, -1)) + ' (mês anterior)</p></div><div class="card-b">' +
      (d.topGastos.length ? d.topGastos.map((t, i) => '<div class="it"><div class="l"><span><span class="rk">' + (i + 1) + '</span>' + esc(t.categoria) + '</span><span>' + money(t.valor) + '</span></div><div class="bar"><i style="width:' + (t.valor / maxTop * 100) + '%"></i></div></div>').join('') : '<p class="muted">Sem saídas no mês anterior.</p>') +
      '</div></div></div>';
  }

  function navegadorMes() {
    return '<button type="button" class="icon-btn" data-act="mes" data-n="-1" aria-label="Mês anterior">' + IC.left + '</button><span class="lbl" aria-live="polite">' + mesLabel(st.mes) + '</span><button type="button" class="icon-btn" data-act="mes" data-n="1" aria-label="Próximo mês">' + IC.right + '</button>' +
      (st.mes !== hojeISO().slice(0, 7) ? '<button type="button" class="btn sm" data-act="mes-atual">Mês atual</button>' : '');
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

  function situacao(t) {
    const rec = t.tipo === 'receita';
    if (t.pago) return ['ok', rec ? 'Recebido' : 'Pago'];
    if (t.parcial) return ['parc', 'Parcial'];
    if (t.data < hojeISO()) return ['venc', 'Vencido'];
    return ['aberto', 'Em aberto'];
  }

  function renderTransacoes() {
    const d = st.dados;
    const p = d.permissoes;
    let h = indicadores();
    const modo = st.trf ? 'trf' : st.rec && st.des ? 'todos' : st.rec ? 'rec' : 'des';
    const seg = [['todos', 'Tudo'], ['rec', 'Entradas'], ['des', 'Saídas'], ['trf', 'Transferências']].filter((x) => (x[0] !== 'rec' || p.receber.ver) && (x[0] !== 'des' || p.pagar.ver) && (x[0] !== 'todos' || (p.receber.ver && p.pagar.ver)));
    h += '<div class="toolbar"><div class="mes">' + navegadorMes() + '</div>';
    if (st.dia) h += '<button type="button" class="chip dia" data-act="limpar-dia" aria-label="Remover filtro do dia">Dia ' + ddmm(st.dia) + ' ✕</button>';
    h += '<span class="grow"></span><div class="seg-tipo" role="group" aria-label="Tipo de lançamento">' + seg.map((x) => '<button type="button" data-act="tipo" data-t="' + x[0] + '" aria-pressed="' + (modo === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
    if (!st.trf) h += '<button type="button" class="btn" data-act="filtros" aria-expanded="' + st.mostrarFiltros + '">' + IC.filter + ' Filtros' + (Object.values(st.filtros).some(Boolean) ? ' •' : '') + '</button>';
    h += '</div><div class="card">';
    if (st.trf) return h + renderTransferencias() + '</div>';
    if (st.mostrarFiltros) {
      const cats = [...new Set(d.transacoes.map((t) => t.categoria))].sort();
      const cont = [...new Set(d.transacoes.map((t) => t.contato).filter(Boolean))].sort();
      const modos = [...new Set(d.transacoes.map((t) => t.modo).filter(Boolean))].sort();
      const sel = (k, rot, ops, labels) => '<label class="f">' + rot + '<select class="i" data-k="f-' + k + '"><option value="">Todos</option>' + ops.map((o, i) => '<option value="' + esc(o) + '"' + (st.filtros[k] === o ? ' selected' : '') + '>' + esc(labels ? labels[i] : o) + '</option>').join('') + '</select></label>';
      h += '<div class="filtros">' + sel('categoria', 'Categoria', cats) + sel('contato', 'Cliente / fornecedor', cont) + sel('situacao', 'Situação', ['pagos', 'nao_pagos', 'vencidos'], ['Pagos / recebidos', 'Em aberto', 'Vencidos']) + sel('modo', 'Forma de pagamento', modos) +
        '<label class="f" style="justify-content:flex-end"><button type="button" class="btn" data-act="limpar-filtros">Limpar filtros</button></label></div>';
    }
    const lista = listaFiltrada();
    if (st.sel.size) {
      const podeB = p.receber.baixar || p.pagar.baixar, podeX = p.receber.excluir || p.pagar.excluir;
      h += '<div class="lote" role="toolbar" aria-label="Ações nos selecionados"><b>' + st.sel.size + ' selecionado(s)</b>' +
        (podeB ? '<button type="button" class="btn" data-act="lote-pagar">Dar baixa</button><button type="button" class="btn" data-act="lote-despagar">Desfazer baixa</button>' : '') +
        (podeX ? '<button type="button" class="btn danger" data-act="lote-excluir">Excluir</button>' : '') +
        '<button type="button" class="btn" data-act="lote-limpar">Limpar seleção</button></div>';
    }
    const th = (campo, rot, cls) => '<th' + (cls ? ' class="' + cls + '"' : '') + '><button type="button" data-act="ordem" data-campo="' + campo + '">' + rot + (st.ordem.campo === campo ? (st.ordem.asc ? ' ↑' : ' ↓') : '') + '</button></th>';
    const todosSel = lista.length > 0 && lista.every((t) => st.sel.has(t.id));
    h += '<div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr><th style="width:34px"><input type="checkbox" data-act="sel-todos" aria-label="Selecionar todos"' + (todosSel ? ' checked' : '') + '></th>' +
      th('data', 'Vencimento') + th('descricao', 'Histórico') + th('contato', 'Cliente / fornecedor') + th('categoria', 'Categoria') + '<th>Forma</th><th>Condição</th>' + th('valor', 'Valor', 'n') + '<th>Situação</th></tr></thead><tbody>';
    for (const t of lista) {
      const rec = t.tipo === 'receita';
      const podeB = rec ? p.receber.baixar : p.pagar.baixar;
      const [cls, rot] = situacao(t);
      h += '<tr class="lin' + (st.sel.has(t.id) ? ' sel' : '') + '" data-act="abrir" data-id="' + esc(t.id) + '">' +
        '<td><input type="checkbox" data-act="sel" data-id="' + esc(t.id) + '" aria-label="Selecionar ' + esc(t.descricao) + '"' + (st.sel.has(t.id) ? ' checked' : '') + '></td>' +
        '<td style="white-space:nowrap">' + ddmmaaaa(t.data) + '</td>' +
        '<td class="trunc" title="' + esc(t.descricao + (t.observacao ? ' — ' + t.observacao : '')) + '"><span class="tipo-dot ' + (rec ? 'g' : 'r') + '" aria-hidden="true"></span>' + esc(t.descricao) + '</td>' +
        '<td class="trunc c" title="' + esc(t.contato) + '">' + esc(t.contato || '—') + '</td><td>' + esc(t.categoria) + '</td>' +
        '<td>' + esc(t.modo || '—') + '</td><td style="white-space:nowrap" class="muted">' + esc(t.tipoPagamento) + '</td>' +
        '<td class="n ' + (rec ? 'g' : 'r') + '">' + (rec ? '+ ' : '− ') + money(t.valor) + '</td>' +
        '<td><button type="button" class="sit ' + cls + '" role="switch" aria-checked="' + t.pago + '" data-act="pago" data-id="' + esc(t.id) + '"' + (podeB ? '' : ' disabled') + ' title="' + (t.pago ? (rec ? 'Recebido em ' : 'Pago em ') + ddmmaaaa(t.dataPagamento) + ' · clique para desfazer' : 'Clique para dar baixa hoje') + '">' + rot + (t.parcial ? ' · ' + money(t.valorPago) : '') + '</button></td></tr>';
    }
    h += '</tbody></table></div>';
    if (!lista.length) {
      const podeNova = (st.rec && p.receber.criar) || (st.des && p.pagar.criar);
      h += '<div class="vazio"><b>' + (d.transacoes.length ? 'Nenhum lançamento com esses filtros' : 'Nenhum lançamento em ' + mesLabel(st.mes)) + '</b>' + (d.transacoes.length ? 'Ajuste os filtros ou a busca.' : 'Use "Novo lançamento" para registrar uma entrada ou saída.') + (podeNova && !d.transacoes.length ? '<p><button type="button" class="btn pri" data-act="nova">' + IC.plus + ' Novo lançamento</button></p>' : '') + '</div>';
    }
    const rs = lista.filter((t) => t.tipo === 'receita'), ds = lista.filter((t) => t.tipo === 'despesa');
    const s = (l, c) => l.reduce((a, t) => a + t[c], 0);
    const total = s(rs, 'valor') - s(ds, 'valor');
    const aberto = s(rs, 'valor') - s(rs, 'valorPago') - (s(ds, 'valor') - s(ds, 'valorPago'));
    h += '<div class="rodape-tot"><span>' + lista.length + ' lançamento(s)</span>' +
      (rs.length ? '<span>Entradas <b class="g">' + money(s(rs, 'valor')) + '</b></span>' : '') + (ds.length ? '<span>Saídas <b class="r">' + money(s(ds, 'valor')) + '</b></span>' : '') +
      '<span>Em aberto <b>' + money(aberto) + '</b></span><span class="tot">Saldo <b class="' + (total < 0 ? 'r' : 'g') + '">' + money(total) + '</b></span></div>';
    return h + '</div>';
  }

  function renderTransferencias() {
    const d = st.dados;
    let h = '';
    if (d.permissoes.contas) h += '<div style="display:flex;justify-content:flex-end;padding:10px 14px;border-bottom:1px solid #e2e8f0"><button type="button" class="btn pri" data-act="nova-trf">' + IC.plus + ' Nova transferência</button></div>';
    h += '<div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr><th>Data</th><th>Histórico</th><th>Saiu de</th><th>Entrou em</th><th class="n">Valor</th><th></th></tr></thead><tbody>';
    for (const t of d.transferencias) {
      h += '<tr><td>' + ddmmaaaa(t.data) + '</td><td>' + esc(t.descricao) + '</td><td>' + esc(contaNome(t.deContaId)) + '</td><td>' + esc(contaNome(t.paraContaId)) + '</td><td class="n">' + money(t.valor) + '</td>' +
        '<td>' + (d.permissoes.contas ? '<button type="button" class="btn danger sm" data-act="excluir-trf" data-id="' + esc(t.recordId) + '">Excluir</button>' : '') + '</td></tr>';
    }
    h += '</tbody></table></div>';
    if (!d.transferencias.length) h += '<div class="vazio"><b>Nenhuma transferência em ' + mesLabel(st.mes) + '</b>Movimentações entre suas contas (ex.: do caixa para o banco).</div>';
    return h;
  }

  function renderContas() {
    const d = st.dados;
    let h = '<div class="card"><div class="card-h" style="display:flex;align-items:center;gap:10px;padding-bottom:12px"><div><h3>Contas e caixas</h3><p>Saldo atual = saldo inicial + tudo o que entrou e saiu de cada conta até hoje.</p></div><span class="grow"></span>' +
      (d.permissoes.contas ? '<button type="button" class="btn pri" data-act="nova-conta">' + IC.plus + ' Nova conta</button>' : '') + '</div>' +
      '<div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr><th>Conta</th><th>Tipo</th><th class="n">Saldo inicial</th><th class="n">Saldo atual</th><th class="n">Previsão no fim do mês</th><th></th></tr></thead><tbody>';
    for (const c of d.contas) {
      h += '<tr><td><b>' + esc(c.nome) + '</b>' + (c.principal ? ' <span class="tag">principal</span>' : '') + (c.banco ? '<div class="muted" style="font-size:12.5px">' + esc(c.banco) + '</div>' : '') + '</td><td>' + esc(TIPOS_CONTA[c.tipo] || 'Conta') + '</td>' +
        '<td class="n">' + money(c.saldoInicial) + (c.dataSaldoInicial ? '<div class="muted" style="font-size:12px">em ' + ddmmaaaa(c.dataSaldoInicial) + '</div>' : '') + '</td><td class="n ' + (c.saldoAtual < 0 ? 'r' : '') + '"><b>' + money(c.saldoAtual) + '</b></td><td class="n">' + money(c.previsaoMes) + '</td>' +
        '<td style="white-space:nowrap">' + (d.permissoes.contas ? '<button type="button" class="btn sm" data-act="editar-conta" data-id="' + esc(c.id) + '">Editar</button>' + (c.principal ? '' : ' <button type="button" class="btn danger sm" data-act="desativar-conta" data-id="' + esc(c.id) + '">Desativar</button>') : '') + '</td></tr>';
    }
    return h + '</tbody></table></div></div>';
  }

  // ---------------------------------------------------------------------------
  // Contatos
  // ---------------------------------------------------------------------------
  const TIPOS_CT = { cliente: 'Cliente', fornecedor: 'Fornecedor', colaborador: 'Colaborador', socio: 'Sócio', associado: 'Associado', outro: 'Outro' };

  function contatosFiltrados() {
    const d = st.ct.dados;
    const b = norm(st.ct.busca);
    const mes = hojeISO().slice(5, 7);
    let lista = d.contatos;
    if (st.ct.tipo !== 'todos') lista = lista.filter((x) => x.tipo === st.ct.tipo);
    if (st.ct.cartao === 'deve') lista = lista.filter((x) => x.aReceber > 0);
    if (st.ct.cartao === 'devo') lista = lista.filter((x) => x.aPagar > 0);
    if (st.ct.cartao === 'aniv') lista = lista.filter((x) => x.nascimento && x.nascimento.slice(5, 7) === mes);
    if (b) lista = lista.filter((x) => norm(x.nome + ' ' + x.documento + ' ' + x.email + ' ' + x.telefone).includes(b));
    const { campo, asc } = st.ct.ordem;
    const k = (x) => (campo === 'aReceber' || campo === 'aPagar' ? x[campo] : norm(x[campo] || ''));
    return [...lista].sort((a, c) => { const x = k(a), y = k(c); const r = x < y ? -1 : x > y ? 1 : 0; return asc ? r : -r; });
  }

  function renderContatos() {
    const d = st.ct.dados;
    const r = d.resumo;
    const card = (cls, titulo, valor, extra, c) => '<button type="button" class="kpi ct-card ' + cls + '" data-act="ct-cartao" data-c="' + c + '" aria-pressed="' + (st.ct.cartao === c) + '"><span class="kpi-t">' + titulo + '</span><span class="kpi-v">' + valor + '</span><span class="kpi-s">' + extra + ' · ' + (st.ct.cartao === c ? 'filtro ativo, clique para mostrar todos' : 'clique para listar') + '</span></button>';
    let h = '<div class="kpis">' + card('ent', 'A receber de contatos', money(r.deveParaMim.valor), r.deveParaMim.contatos + ' contato(s)', 'deve') +
      card('sai', 'A pagar a contatos', money(r.euDevo.valor), r.euDevo.contatos + ' contato(s)', 'devo') + card('res', 'Aniversários no mês', String(r.aniversariantes), 'contatos com data de nascimento', 'aniv') + '</div>';
    h += '<div class="pills" role="group" aria-label="Tipo do contato">' + [['todos', 'Todos'], ...Object.entries(TIPOS_CT)].map(([k, l]) => '<button type="button" class="pill" data-act="ct-tipo" data-t="' + k + '" aria-pressed="' + (st.ct.tipo === k) + '">' + l + '</button>').join('') + '</div>';
    const lista = contatosFiltrados();
    const th = (campo, rot) => '<th><button type="button" data-act="ct-ordem" data-campo="' + campo + '">' + rot + (st.ct.ordem.campo === campo ? (st.ct.ordem.asc ? ' ▴' : ' ▾') : ' ↕') + '</button></th>';
    h += '<div class="card"><div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr>' + th('nome', 'Nome') + th('tipo', 'Tipo do contato') + '<th>CPF/CNPJ</th><th>Email</th><th>Telefone</th>' + th('aReceber', 'A receber') + th('aPagar', 'A pagar') + '<th>Atualizado em</th></tr></thead><tbody>';
    for (const x of lista) {
      h += '<tr class="lin" data-act="ct-abrir" data-ref="' + esc(x.ref) + '"><td class="trunc">' + esc(x.nome) + (x.semCadastro ? ' <span class="tag">sem cadastro</span>' : '') + '</td><td>' + esc(TIPOS_CT[x.tipo] || 'Outro') + '</td><td style="white-space:nowrap">' + esc(x.documento || '—') + '</td>' +
        '<td class="trunc c">' + esc(x.email || '—') + '</td><td style="white-space:nowrap">' + esc(x.telefone || '—') + '</td>' +
        '<td class="g" style="white-space:nowrap">' + (x.aReceber ? money(x.aReceber) : '—') + '</td><td class="r" style="white-space:nowrap">' + (x.aPagar ? money(x.aPagar) : '—') + '</td>' +
        '<td style="white-space:nowrap">' + (x.atualizadoEm ? ddmmaaaa(String(x.atualizadoEm).slice(0, 10)) : '—') + '</td></tr>';
    }
    h += '</tbody></table></div>';
    if (!lista.length) h += '<div class="vazio"><b>' + (d.contatos.length ? 'Nenhum contato com esse filtro' : 'Nenhum contato cadastrado') + '</b>' + (d.contatos.length ? 'Ajuste o filtro ou a busca.' : 'Cadastre clientes, fornecedores, colaboradores e sócios aqui ou importe uma planilha.') + (d.podeEditar && !d.contatos.length ? '<p><button type="button" class="btn pri" data-act="novo-contato">' + IC.plus + ' Novo contato</button></p>' : '') + '</div>';
    return h + '</div>';
  }

  function drawerContato() {
    const c = st.drawer.c || {};
    const editando = Boolean(c.ref) && !c.semCadastro;
    const travaTipo = editando && (c.tipo === 'cliente' || c.tipo === 'fornecedor');
    const podeEditar = st.ct.dados ? st.ct.dados.podeEditar : true;
    const dis = podeEditar ? '' : ' disabled';
    const corpo = (c.aReceber || c.aPagar ? '<div class="two"><div class="card" style="padding:10px 12px"><div class="muted" style="font-size:12.5px">A receber</div><b class="g">' + money(c.aReceber) + '</b></div><div class="card" style="padding:10px 12px"><div class="muted" style="font-size:12.5px">A pagar</div><b class="r">' + money(c.aPagar) + '</b></div></div>' : '') +
      '<label class="f">Tipo do contato<select class="i" name="tipo"' + (travaTipo || !podeEditar ? ' disabled' : '') + '>' + Object.entries(TIPOS_CT).map(([k, l]) => '<option value="' + k + '"' + ((c.tipo || 'cliente') === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
      (travaTipo ? '<p class="hint">' + (c.tipo === 'cliente' ? 'Cliente' : 'Fornecedor') + ': o cadastro completo fica na tela de ' + (c.tipo === 'cliente' ? 'Clientes' : 'Fornecedores') + '.</p>' : '') +
      '<label class="f">Nome *<input class="i" name="nome" required maxlength="120" value="' + esc(c.nome || '') + '" data-autofocus' + dis + '></label>' +
      '<div class="two"><label class="f">CPF/CNPJ<input class="i" name="documento" maxlength="20" value="' + esc(c.documento || '') + '"' + dis + '></label><label class="f">Data de nascimento<input class="i" name="nascimento" type="date" value="' + esc(c.nascimento || '') + '"' + dis + '></label></div>' +
      '<div class="two"><label class="f">Email<input class="i" name="email" type="email" maxlength="120" value="' + esc(c.email || '') + '"' + dis + '></label><label class="f">Telefone<input class="i" name="telefone" maxlength="30" value="' + esc(c.telefone || '') + '"' + dis + '></label></div>' +
      '<label class="f">Observação<textarea class="i" name="observacao" rows="2" maxlength="500"' + dis + '>' + esc(c.observacao || '') + '</textarea></label>';
    const rodape = (podeEditar ? '<button type="submit" class="btn pri">' + (c.semCadastro ? 'Cadastrar' : 'Salvar') + '</button>' : '') + '<button type="button" class="btn" data-act="fechar-drawer">' + (podeEditar ? 'Cancelar' : 'Fechar') + '</button>';
    return [editando ? 'Contato' : 'Novo contato', corpo, rodape];
  }

  // ---------------------------------------------------------------------------
  // Relatórios
  // ---------------------------------------------------------------------------
  const RELATORIOS = [
    ['Visão do período', [['resultados', 'Demonstrativo do período'], ['extrato', 'Extrato com saldo acumulado'], ['gastos_recebimentos', 'Entradas e saídas por categoria'], ['historico', 'Evolução mês a mês']]],
    ['Saídas', [['g_categoria', 'Saídas por categoria'], ['g_descricao', 'Saídas por histórico'], ['g_contato', 'Saídas por fornecedor/contato'], ['g_modo', 'Saídas por forma de pagamento'], ['g_periodo', 'Saídas por período']]],
    ['Entradas', [['r_categoria', 'Entradas por categoria'], ['r_contato', 'Entradas por cliente/contato'], ['r_modo', 'Entradas por forma de pagamento'], ['r_periodo', 'Entradas por período']]],
  ];
  const nomeRelatorio = (k) => { for (const g of RELATORIOS) for (const r of g[1]) if (r[0] === k) return r[1]; return ''; };
  const grupoTipoPag = (t) => (/^Parcelado/.test(t) ? 'Parcelado' : /^Fixo/.test(t) ? 'Fixo' : /^Recorrente/.test(t) ? 'Recorrente' : 'Único');

  function relLinhas() {
    const d = st.rel.dados, f = st.rel;
    return d.transacoes
      .map((t) => ({ ...t, dataRef: f.por === 'competencia' ? t.competencia : (t.pago || t.parcial ? t.dataPagamento : t.data) }))
      .filter((t) => t.dataRef && t.dataRef >= d.de && t.dataRef <= d.ate)
      .filter((t) => (t.pago ? f.pagos : f.naoPagos))
      .filter((t) => !f.cats.length || f.cats.includes(t.categoria))
      .filter((t) => !f.contas.length || f.contas.includes(t.contaId))
      .filter((t) => !f.contatos.length || f.contatos.includes(t.contato || '—'))
      .filter((t) => !f.modos.length || f.modos.includes(t.modo || '—'))
      .filter((t) => !f.tipoPag || grupoTipoPag(t.tipoPagamento) === f.tipoPag);
  }
  function agrupar(lista, chave) {
    const m = new Map();
    for (const t of lista) { const k = chave(t) || '—'; const g = m.get(k) || { chave: k, total: 0, qtd: 0 }; g.total += t.valor; g.qtd++; m.set(k, g); }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }
  function tabelaGrupo(grupos, cor, rotulo) {
    const total = grupos.reduce((a, g) => a + g.total, 0) || 1;
    return '<table class="rel"><thead><tr><th>' + esc(rotulo) + '</th><th class="n">Lançamentos</th><th class="n">Valor</th><th class="n">%</th><th style="width:22%"></th></tr></thead><tbody>' +
      grupos.map((g) => '<tr><td>' + esc(g.chave) + '</td><td class="n">' + g.qtd + '</td><td class="n ' + cor + '">' + money(g.total) + '</td><td class="n">' + (g.total / total * 100).toFixed(1).replace('.', ',') + '%</td><td><span class="bar"><i style="width:' + (g.total / total * 100) + '%;background:' + (cor === 'g' ? '#10b981' : '#f43f5e') + '"></i></span></td></tr>').join('') +
      '</tbody><tfoot><tr><th>Total</th><th class="n">' + grupos.reduce((a, g) => a + g.qtd, 0) + '</th><th class="n ' + cor + '">' + money(grupos.reduce((a, g) => a + g.total, 0)) + '</th><th></th><th></th></tr></tfoot></table>';
  }
  const mesesEntre = (de, ate) => { const out = []; let m = de.slice(0, 7); while (m <= ate.slice(0, 7) && out.length < 40) { out.push(m); m = somaMes(m, 1); } return out; };
  const chavePeriodo = (t, d) => ((Date.parse(d.ate) - Date.parse(d.de)) / 86400000 > 62 ? mesLongo(t.dataRef.slice(0, 7)) : ddmmaaaa(t.dataRef));

  function montarRelatorio() {
    const d = st.rel.dados;
    const k = st.rel.relatorio;
    const linhas = relLinhas();
    const rec = linhas.filter((t) => t.tipo === 'receita'), des = linhas.filter((t) => t.tipo === 'despesa');
    const soma = (l) => l.reduce((a, t) => a + t.valor, 0);
    let html = '', csv = [];
    if (k === 'resultados') {
      const cats = agrupar(des, (t) => t.categoria);
      html = '<table class="rel"><tbody><tr class="grp"><th>Total de entradas</th><td class="n g"><b>' + money(soma(rec)) + '</b></td></tr><tr class="grp"><th>Saídas por categoria</th><td></td></tr>' +
        cats.map((g) => '<tr><td style="padding-left:22px">' + esc(g.chave) + '</td><td class="n r">' + money(g.total) + '</td></tr>').join('') +
        '<tr class="grp"><th>Total de saídas</th><td class="n r"><b>' + money(soma(des)) + '</b></td></tr></tbody></table><div class="res-l t"><span>Saldo do período</span><b class="' + (soma(rec) - soma(des) < 0 ? 'r' : 'g') + '">' + money(soma(rec) - soma(des)) + '</b></div>';
      csv = [['Item', 'Valor'], ['Total de entradas', soma(rec)], ...cats.map((g) => [g.chave, -g.total]), ['Total de saídas', -soma(des)], ['Saldo do período', soma(rec) - soma(des)]];
    } else if (k === 'extrato') {
      const ord = [...linhas].sort((a, b) => a.dataRef.localeCompare(b.dataRef) || a.descricao.localeCompare(b.descricao));
      let saldo = 0;
      html = '<table class="rel"><thead><tr><th>Data</th><th>Descrição</th><th>Contato</th><th>Categoria</th><th>Conta</th><th>Situação</th><th class="n">Valor</th><th class="n">Saldo</th></tr></thead><tbody>' +
        ord.map((t) => { const v = t.tipo === 'receita' ? t.valor : -t.valor; saldo += v; csv.push([ddmmaaaa(t.dataRef), t.descricao, t.contato, t.categoria, contaNomeRel(t.contaId), t.pago ? 'Pago' : 'Não pago', v, saldo]); return '<tr><td>' + ddmmaaaa(t.dataRef) + '</td><td>' + esc(t.descricao) + '</td><td>' + esc(t.contato || '—') + '</td><td>' + esc(t.categoria) + '</td><td>' + esc(contaNomeRel(t.contaId)) + '</td><td>' + (t.pago ? 'Pago' : 'Não pago') + '</td><td class="n ' + (v < 0 ? 'r' : 'g') + '">' + money(v) + '</td><td class="n">' + money(saldo) + '</td></tr>'; }).join('') +
        '</tbody></table>';
      csv.unshift(['Data', 'Descrição', 'Contato', 'Categoria', 'Conta', 'Situação', 'Valor', 'Saldo']);
    } else if (k === 'gastos_recebimentos') {
      const gr = agrupar(rec, (t) => t.categoria), gd = agrupar(des, (t) => t.categoria);
      html = '<h4 class="g" style="margin:4px 0 6px">Entradas</h4>' + tabelaGrupo(gr, 'g', 'Categoria') + '<h4 class="r" style="margin:18px 0 6px">Saídas</h4>' + tabelaGrupo(gd, 'r', 'Categoria');
      csv = [['Tipo', 'Categoria', 'Lançamentos', 'Valor'], ...gr.map((g) => ['Entrada', g.chave, g.qtd, g.total]), ...gd.map((g) => ['Saída', g.chave, g.qtd, g.total])];
    } else if (k === 'historico') {
      const meses = mesesEntre(d.de, d.ate);
      const max = Math.max(1, ...meses.map((m) => Math.max(soma(rec.filter((t) => t.dataRef.startsWith(m))), soma(des.filter((t) => t.dataRef.startsWith(m))))));
      html = '<table class="rel"><thead><tr><th>Mês</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Saldo</th><th style="width:28%"></th></tr></thead><tbody>' +
        meses.map((m) => { const r = soma(rec.filter((t) => t.dataRef.startsWith(m))), g = soma(des.filter((t) => t.dataRef.startsWith(m))); csv.push([mesLongo(m), r, g, r - g]); return '<tr><td>' + mesLongo(m) + '</td><td class="n g">' + money(r) + '</td><td class="n r">' + money(g) + '</td><td class="n ' + (r - g < 0 ? 'r' : 'g') + '">' + money(r - g) + '</td><td><span class="bar" style="margin-bottom:3px"><i style="width:' + (r / max * 100) + '%;background:#10b981"></i></span><span class="bar"><i style="width:' + (g / max * 100) + '%;background:#f43f5e"></i></span></td></tr>'; }).join('') + '</tbody></table>';
      csv.unshift(['Mês', 'Entradas', 'Saídas', 'Saldo']);
    } else {
      const lista = k.startsWith('g_') ? des : rec;
      const cor = k.startsWith('g_') ? 'r' : 'g';
      const tipo = k.slice(2);
      const chave = tipo === 'descricao' ? (t) => t.descricao : tipo === 'categoria' ? (t) => t.categoria : tipo === 'modo' ? (t) => t.modo || '—' : tipo === 'contato' ? (t) => t.contato || '—' : (t) => chavePeriodo(t, d);
      const rot = { descricao: 'Histórico', categoria: 'Categoria', modo: 'Forma de pagamento', contato: 'Contato', periodo: 'Período' }[tipo];
      let grupos = agrupar(lista, chave);
      if (tipo === 'periodo') grupos = grupos.sort((a, b) => { const p = (s) => (/\//.test(s) && s.length === 10 ? s.split('/').reverse().join('') : s); return String(p(a.chave)).localeCompare(String(p(b.chave))); });
      if (tipo === 'periodo' && (Date.parse(d.ate) - Date.parse(d.de)) / 86400000 > 62) { const ordem = mesesEntre(d.de, d.ate).map(mesLongo); grupos = grupos.sort((a, b) => ordem.indexOf(a.chave) - ordem.indexOf(b.chave)); }
      html = tabelaGrupo(grupos, cor, rot);
      csv = [[rot, 'Lançamentos', 'Valor'], ...grupos.map((g) => [g.chave, g.qtd, g.total])];
    }
    if (!linhas.length) html = '<div class="vazio"><b>Sem lançamentos no período</b>Ajuste as datas ou os filtros.</div>';
    return { html, csv };
  }
  const contaNomeRel = (id) => { const c = st.rel.dados && st.rel.dados.contas.find((x) => x.id === id); return c ? c.nome : '—'; };

  function multi(k, rotulo, opcoes) {
    const sel = st.rel[k];
    const resumo = !sel.length ? 'Todas' : sel.length === 1 ? ((opcoes.find((o) => o[0] === sel[0]) || [0, sel[0]])[1]) : sel.length + ' selecionadas';
    return '<div class="f"><span>' + rotulo + '</span><div class="ms"><button type="button" class="i ms-btn" data-act="ms-abrir" data-ms="' + k + '" aria-expanded="' + (st.rel.aberto === k) + '">' + esc(resumo) + '</button>' +
      (st.rel.aberto === k ? '<div class="ms-list">' + (opcoes.length ? opcoes.map((o) => '<label class="chk"><input type="checkbox" data-k="ms" data-ms="' + k + '" value="' + esc(o[0]) + '"' + (sel.includes(o[0]) ? ' checked' : '') + '> ' + esc(o[1]) + '</label>').join('') : '<span class="muted">Nenhuma opção no período</span>') + '</div>' : '') + '</div></div>';
  }

  function renderRelatorios() {
    const d = st.rel.dados, f = st.rel;
    const base = d.transacoes;
    const uniq = (fn) => [...new Set(base.map(fn).filter(Boolean))].sort().map((x) => [x, x]);
    let h = '<div class="card filtros-rel"><div class="fr-grid">' +
      '<label class="f">Data inicial<input class="i" type="date" data-k="rel-de" value="' + f.de + '"></label><label class="f">Data final<input class="i" type="date" data-k="rel-ate" value="' + f.ate + '"></label>' +
      multi('cats', 'Categorias', uniq((t) => t.categoria)) + multi('contas', 'Contas', d.contas.map((c) => [c.id, c.nome])) + multi('contatos', 'Clientes / fornecedores', uniq((t) => t.contato || '—')) + multi('modos', 'Formas de pagamento', uniq((t) => t.modo || '—')) +
      '<label class="f">Condição<select class="i" data-k="rel-tipopag"><option value="">Todas</option>' + ['Único', 'Parcelado', 'Fixo', 'Recorrente'].map((x) => '<option' + (f.tipoPag === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label></div>' +
      '<div class="fr-linha"><div><div class="muted" style="font-size:13px;margin-bottom:4px">Considerar</div><label class="chk" style="display:inline-flex;margin-right:16px"><input type="checkbox" data-k="rel-pagos"' + (f.pagos ? ' checked' : '') + '> Baixados</label><label class="chk" style="display:inline-flex"><input type="checkbox" data-k="rel-naopagos"' + (f.naoPagos ? ' checked' : '') + '> Em aberto</label></div>' +
      '<div><div class="muted" style="font-size:13px;margin-bottom:4px">Data de referência</div><label class="chk" style="display:inline-flex;margin-right:16px"><input type="radio" name="rel-por" data-k="rel-por" value="pagamento"' + (f.por === 'pagamento' ? ' checked' : '') + '> Caixa (data da baixa)</label><label class="chk" style="display:inline-flex"><input type="radio" name="rel-por" data-k="rel-por" value="competencia"' + (f.por === 'competencia' ? ' checked' : '') + '> Competência (emissão)</label></div>' +
      '<span class="grow"></span><button type="button" class="btn" data-act="rel-limpar">Limpar</button></div></div>';
    const r = montarRelatorio();
    st.rel.ultimo = r;
    h += '<section class="card rel-body"><div class="rel-h"><label class="f rel-sel">Relatório<select class="i" data-k="rel-tipo">' + RELATORIOS.map((g) => '<optgroup label="' + g[0] + '">' + g[1].map((x) => '<option value="' + x[0] + '"' + (f.relatorio === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</optgroup>').join('') + '</select></label>' +
      '<span class="muted rel-per">' + ddmmaaaa(d.de) + ' a ' + ddmmaaaa(d.ate) + '</span><span class="grow"></span><button type="button" class="btn" data-act="rel-csv">Exportar CSV</button><button type="button" class="btn" data-act="rel-imprimir">Imprimir</button></div>' + r.html + '</section>';
    return h;
  }

  function baixarCSV(nome, linhas) {
    const cel = (v) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"');
    const txt = '﻿' + linhas.map((l) => l.map(cel).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function imprimir(titulo, html) {
    const w = window.open('', '_blank');
    if (!w) { aviso('Permita janelas pop-up para imprimir.', false); render(); return; }
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}h2{font-size:16px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #ddd}.n{text-align:right}.g{color:#047857}.r{color:#be123c}.bar{display:none}.res-l{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}.res-l.t{font-weight:bold;font-size:14px}</style></head><body><h2>' + esc(titulo) + '</h2>' + html + '</body></html>');
    w.document.close(); w.focus(); setTimeout(() => w.print(), 200);
  }

  // ---------------------------------------------------------------------------
  // Importações
  // ---------------------------------------------------------------------------
  const XLSX_SRC = '/vendor/xlsx-0.20.3.full.min.js';
  let xlsxPromise = null;
  const carregarXlsx = () => {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) xlsxPromise = new Promise((ok, falhou) => { const s = document.createElement('script'); s.src = XLSX_SRC; s.onload = () => ok(window.XLSX); s.onerror = () => { xlsxPromise = null; falhou(new Error('Não foi possível carregar o leitor de planilhas.')); }; document.head.appendChild(s); });
    return xlsxPromise;
  };
  const CAMPOS_LANC = [
    ['data', 'Data (vencimento) *', [/^data$/, /venc/, /^dt\b/, /data.*(lanc|compet|emiss)/]],
    ['descricao', 'Descrição *', [/descri/, /historico/, /^nome$/, /lancamento/]],
    ['valor', 'Valor *', [/^valor/, /^vlr/, /montante/, /quantia/, /^total$/]],
    ['tipo', 'Tipo (receita/despesa)', [/^tipo$/, /natureza/, /receita.*despesa/, /entrada.*saida/, /^operacao/]],
    ['categoria', 'Categoria', [/categ/, /plano de contas/, /classifica/]],
    ['contato', 'Contato (cliente/fornecedor)', [/contato/, /cliente/, /fornecedor/, /favorecido/, /pagador/, /recebedor/]],
    ['conta', 'Conta bancária', [/^conta/, /banco/, /carteira/]],
    ['pago', 'Pago? (sim/não)', [/^pago/, /situa/, /status/, /quitad/, /realizad/]],
    ['dataPagamento', 'Data do pagamento', [/(data|dt).*(pag|receb|quit|liquid|baixa)/]],
    ['modo', 'Modo de pagamento', [/(forma|modo|meio).*(pag)/, /^forma$/]],
    ['observacao', 'Observação', [/obs/, /nota/, /coment/]],
  ];
  const CAMPOS_CT = [
    ['nome', 'Nome *', [/^nome/, /razao/, /contato/, /cliente/, /fornecedor/]],
    ['tipo', 'Tipo do contato', [/^tipo/, /categoria/, /perfil/]],
    ['documento', 'CPF/CNPJ', [/cpf/, /cnpj/, /documento/]],
    ['email', 'Email', [/e-?mail/]],
    ['telefone', 'Telefone', [/telefone/, /celular/, /fone/, /whats/]],
    ['nascimento', 'Data de nascimento', [/nasc/, /aniver/]],
    ['observacao', 'Observação', [/obs/, /nota/]],
  ];
  const normCab = (s) => norm(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function autoMapa(cab, campos) {
    const mapa = {}; const usadas = new Set();
    for (const [campo, , regras] of campos) {
      for (const re of regras) { const i = cab.findIndex((c, k) => !usadas.has(k) && re.test(normCab(c))); if (i >= 0) { mapa[campo] = i; usadas.add(i); break; } }
    }
    return mapa;
  }
  function valorBR(v) {
    if (typeof v === 'number') return v;
    let s = String(v == null ? '' : v).trim().replace(/[R$\s]/g, '');
    if (!s) return NaN;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (/-$/.test(s)) { neg = true; s = s.slice(0, -1); }
    const iv = s.lastIndexOf(','), ip = s.lastIndexOf('.');
    if (iv > ip) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    const n = Number(s);
    return neg ? -Math.abs(n) : n;
  }
  function dataISO(v) {
    if (v instanceof Date && !isNaN(v)) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
    const s = String(v == null ? '' : v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return a + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
    return '';
  }
  const simNao = (v) => /^(s|sim|y|yes|true|1|pago|paga|recebido|recebida|quitado|quitada|liquidado|realizado|ok|x)$/i.test(norm(v));
  function tipoDe(v, valor) {
    const s = norm(v);
    if (/receb|receita|entrada|credito|^c$|^r$|^\+$/.test(s)) return 'receita';
    if (/desp|saida|debito|pagamento|gasto|^d$|^-$/.test(s)) return 'despesa';
    return valor < 0 ? 'despesa' : 'receita';
  }
  function tipoContatoDe(v) {
    const s = norm(v);
    if (/forne/.test(s)) return 'fornecedor';
    if (/colab|funcion|empreg/.test(s)) return 'colaborador';
    if (/soci/.test(s)) return 'socio';
    if (/assoc/.test(s)) return 'associado';
    if (/outr/.test(s)) return 'outro';
    return 'cliente';
  }
  function converterLinhas(dr) {
    const pega = (l, campo) => (dr.mapa[campo] != null && dr.mapa[campo] !== '' ? l[dr.mapa[campo]] : '');
    return dr.linhas.map((l, i) => {
      const n = dr.cabLinha + i + 2;
      if (dr.modo === 'contatos') {
        const nome = String(pega(l, 'nome') || '').trim();
        return { linha: n, ok: Boolean(nome), motivo: nome ? '' : 'sem nome', tipo: dr.mapa.tipo != null && dr.mapa.tipo !== '' ? tipoContatoDe(pega(l, 'tipo')) : dr.tipoPadrao || 'cliente', nome, documento: String(pega(l, 'documento') || '').trim(), email: String(pega(l, 'email') || '').trim(), telefone: String(pega(l, 'telefone') || '').trim(), nascimento: dataISO(pega(l, 'nascimento')), observacao: String(pega(l, 'observacao') || '').trim() };
      }
      const bruto = valorBR(pega(l, 'valor'));
      const data = dataISO(pega(l, 'data'));
      const descricao = String(pega(l, 'descricao') || '').trim();
      const tipo = dr.mapa.tipo != null && dr.mapa.tipo !== '' ? tipoDe(pega(l, 'tipo'), bruto) : (bruto < 0 ? 'despesa' : 'receita');
      const motivo = !data ? 'data inválida' : !(Math.abs(bruto) > 0) ? 'valor inválido' : !descricao ? 'sem descrição' : '';
      return { linha: n, ok: !motivo, motivo, tipo, data, descricao, valor: Math.abs(bruto) || 0, categoria: String(pega(l, 'categoria') || '').trim(), contato: String(pega(l, 'contato') || '').trim(), conta: String(pega(l, 'conta') || '').trim(), pago: dr.mapa.pago != null && dr.mapa.pago !== '' ? simNao(pega(l, 'pago')) : false, dataPagamento: dataISO(pega(l, 'dataPagamento')), modo: String(pega(l, 'modo') || '').trim(), observacao: String(pega(l, 'observacao') || '').trim() };
    }).filter((x) => x.ok || x.descricao || x.nome || x.valor);
  }
  function decodificar(buf) {
    const u8 = new Uint8Array(buf);
    const utf8 = new TextDecoder('utf-8').decode(u8);
    if (!utf8.includes('�')) return utf8.replace(/^﻿/, '');
    try { return new TextDecoder('windows-1252').decode(u8); } catch (e) { return utf8; }
  }
  function lerCSV(txt) {
    const prim = txt.split(/\r?\n/)[0] || '';
    const sep = [';', '\t', ','].sort((a, b) => prim.split(b).length - prim.split(a).length)[0];
    const out = []; let linha = [], cel = '', aspas = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (aspas) { if (ch === '"' && txt[i + 1] === '"') { cel += '"'; i++; } else if (ch === '"') aspas = false; else cel += ch; continue; }
      if (ch === '"') aspas = true; else if (ch === sep) { linha.push(cel); cel = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; linha.push(cel); out.push(linha); linha = []; cel = ''; } else cel += ch;
    }
    if (cel || linha.length) { linha.push(cel); out.push(linha); }
    return out;
  }
  function lerOFX(txt) {
    const tag = (bloco, t) => { const m = bloco.match(new RegExp('<' + t + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
    const dataOFX = (s) => (s && /^\d{8}/.test(s) ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) : '');
    const itens = [];
    const re = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi;
    let m;
    while ((m = re.exec(txt))) {
      const b = m[1];
      const valor = valorBR(tag(b, 'TRNAMT').replace(',', '.'));
      itens.push({ fitId: tag(b, 'FITID'), data: dataOFX(tag(b, 'DTPOSTED')), valor, descricao: [tag(b, 'NAME'), tag(b, 'MEMO')].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' - ') || tag(b, 'TRNTYPE') });
    }
    return { banco: tag(txt, 'ORG') || tag(txt, 'BANKID'), agencia: tag(txt, 'BRANCHID'), numeroConta: tag(txt, 'ACCTID'), itens: itens.filter((x) => x.data && x.valor) };
  }

  async function lerArquivoImportacao(file, tipo) {
    try {
      const buf = await file.arrayBuffer();
      if (tipo === 'ofx') {
        const o = lerOFX(decodificar(buf));
        if (!o.itens.length) throw new Error('Não encontrei movimentações neste arquivo OFX.');
        const contas = (st.imp.dados && st.imp.dados.contas) || (st.conc.dados && st.conc.dados.contas) || [];
        const sugerida = contas.find((c) => o.numeroConta && norm(c.nome + ' ' + (c.banco || '')).includes(norm(o.numeroConta))) || contas.find((c) => c.id === st.conc.contaId) || contas[0];
        st.drawer = { tipo: 'ofx', arquivo: file.name, ofx: o, contas, contaId: sugerida ? sugerida.id : '' };
        render(); return;
      }
      let matriz;
      if (/\.csv$|\.txt$/i.test(file.name)) matriz = lerCSV(decodificar(buf));
      else {
        const X = await carregarXlsx();
        const wb = X.read(buf, { type: 'array', cellDates: true });
        const nomeAba = wb.SheetNames.find((n) => (X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' }) || []).length > 1) || wb.SheetNames[0];
        matriz = X.utils.sheet_to_json(wb.Sheets[nomeAba], { header: 1, raw: true, defval: '' });
      }
      matriz = matriz.filter((l) => l.some((c) => String(c).trim() !== ''));
      const cabLinha = Math.max(0, matriz.findIndex((l) => l.filter((c) => String(c).trim() !== '').length >= 2));
      const cab = (matriz[cabLinha] || []).map((c, i) => String(c).trim() || 'Coluna ' + (i + 1));
      const linhas = matriz.slice(cabLinha + 1);
      if (!linhas.length) throw new Error('A planilha não tem linhas abaixo do cabeçalho.');
      const modo = tipo === 'contatos' ? 'contatos' : 'lancamentos';
      st.drawer = { tipo: 'importar', modo, origem: tipo, arquivo: file.name, cab, cabLinha, linhas, mapa: autoMapa(cab, modo === 'contatos' ? CAMPOS_CT : CAMPOS_LANC) };
      render();
    } catch (err) { aviso(err.message || 'Não foi possível ler o arquivo.', false); render(); }
  }

  function baixarModelo(tipo) {
    if (tipo === 'contatos') return baixarCSV('modelo-contatos.csv', [['Nome', 'Tipo', 'CPF/CNPJ', 'Email', 'Telefone', 'Data de nascimento', 'Observação'], ['Cliente Exemplo Ltda', 'Cliente', '11.222.333/0001-81', 'contato@exemplo.com', '(11) 99999-0000', '', ''], ['João da Silva', 'Colaborador', '', '', '(11) 98888-0000', '15/03/1990', '']]);
    baixarCSV('modelo-lancamentos.csv', [['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Contato', 'Conta', 'Pago', 'Data do pagamento', 'Modo de pagamento', 'Observação'], [hojeISO().split('-').reverse().join('/'), 'Venda balcão', 150, 'Receita', 'Vendas', 'Cliente Exemplo', 'Conta Principal', 'Sim', hojeISO().split('-').reverse().join('/'), 'PIX', ''], [hojeISO().split('-').reverse().join('/'), 'Conta de energia', 320.5, 'Despesa', 'Energia', 'Companhia de Energia', 'Conta Principal', 'Não', '', 'Boleto', '']]);
  }

  function renderImportacoes() {
    const d = st.imp.dados;
    const cards = [
      ['padrao', IC.impPlanilha, 'Planilha de lançamentos', 'Entradas e saídas em Excel (.xlsx) ou CSV, no modelo do MotorDesk.', true],
      ['zeropaper', IC.impSistema, 'Planilha de outro sistema', 'Exportação de outro sistema financeiro (ex.: Zero Paper). As colunas são reconhecidas e você confere antes de gravar.', false],
      ['contatos', IC.impContatos, 'Cadastro de contatos', 'Clientes, fornecedores, colaboradores e sócios em Excel ou CSV.', true],
      ['ofx', IC.impBanco, 'Extrato bancário (OFX)', 'Arquivo OFX baixado do internet banking, para a conciliação bancária.', false],
    ];
    const podeImportar = st.modulo && (st.modulo.editar || st.modulo.master);
    let h = '<div class="card imp-lista">' + cards.map((c) => '<div class="imp-row"><span class="imp-ic">' + c[1] + '</span><div class="imp-txt"><h3>' + c[2] + '</h3><p>' + c[3] + '</p></div><div class="imp-acoes">' +
      (c[4] ? '<button type="button" class="btn sm" data-act="modelo" data-t="' + c[0] + '">Modelo</button>' : '') +
      (podeImportar ? '<label class="btn pri sm" style="cursor:pointer">Selecionar arquivo<input type="file" data-k="arquivo" data-tipo="' + c[0] + '" accept="' + (c[0] === 'ofx' ? '.ofx,.OFX' : '.xlsx,.xls,.csv,.txt') + '" hidden></label>' : '<span class="muted">Sem permissão para importar</span>') +
      '</div></div>').join('') + '</div><h3 class="sec-t">Histórico de importações</h3>';
    h += '<div class="card"><div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr><th>Arquivo</th><th>Resultado</th><th>Tipo</th><th>Registros gravados</th><th>Quando / quem</th><th></th></tr></thead><tbody>';
    for (const x of d.importacoes) {
      h += '<tr><td class="trunc">' + esc(x.arquivo) + '</td><td>' + esc(x.situacao) + (x.ignoradas ? ' <span class="tag">' + x.ignoradas + ' ignorada(s)</span>' : '') + '</td><td>' + esc(x.origem) + '</td><td>' + (x.transacoes || 0) + '</td><td style="white-space:nowrap">' + new Date(x.importadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + esc(x.importadoPor || '') + '</td>' +
        '<td>' + (x.tipo === 'ofx' ? '<button type="button" class="btn" data-act="ir-conciliar" data-conta="' + esc(x.contaId || '') + '">Conciliar</button>' : '') + '</td></tr>';
    }
    h += '</tbody></table></div>';
    if (!d.importacoes.length) h += '<div class="vazio"><b>Nenhuma importação feita</b>Os arquivos importados aparecem aqui, com o resultado de cada um.</div>';
    return h + '</div>';
  }

  function drawerImportar() {
    const dr = st.drawer;
    const campos = dr.modo === 'contatos' ? CAMPOS_CT : CAMPOS_LANC;
    const linhas = converterLinhas(dr);
    const ok = linhas.filter((x) => x.ok);
    const col = (campo) => '<select class="i" data-k="imp-mapa" data-campo="' + campo + '"><option value="">— não usar —</option>' + dr.cab.map((c, i) => '<option value="' + i + '"' + (String(dr.mapa[campo]) === String(i) ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>';
    let corpo = '<p class="hint" style="margin:0">Arquivo <b>' + esc(dr.arquivo) + '</b> · ' + dr.linhas.length + ' linha(s). Confira em qual coluna está cada informação; nada é gravado até você confirmar.</p>' +
      '<div class="map-grid">' + campos.map(([k, rot]) => '<label class="f">' + rot + col(k) + '</label>').join('') + '</div>';
    if (dr.modo === 'contatos' && (dr.mapa.tipo == null || dr.mapa.tipo === '')) corpo += '<label class="f" style="max-width:260px">Tipo para todos<select class="i" data-k="imp-tipopadrao">' + Object.entries(TIPOS_CT).map(([k, l]) => '<option value="' + k + '"' + ((dr.tipoPadrao || 'cliente') === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>';
    if (dr.modo === 'lancamentos' && (dr.mapa.tipo == null || dr.mapa.tipo === '')) corpo += '<p class="hint">Sem coluna de tipo: valores negativos viram despesas e positivos, recebimentos.</p>';
    if (dr.modo === 'lancamentos') {
      const rec = ok.filter((x) => x.tipo === 'receita'), des = ok.filter((x) => x.tipo === 'despesa');
      corpo += '<div class="imp-res"><span class="g">' + rec.length + ' recebimento(s): ' + money(rec.reduce((a, x) => a + x.valor, 0)) + '</span><span class="r">' + des.length + ' despesa(s): ' + money(des.reduce((a, x) => a + x.valor, 0)) + '</span>' + (linhas.length - ok.length ? '<span class="muted">' + (linhas.length - ok.length) + ' com problema (não serão importadas)</span>' : '') + '</div>';
    }
    const cab = dr.modo === 'contatos' ? ['Linha', 'Nome', 'Tipo', 'CPF/CNPJ', 'Email', 'Telefone', ''] : ['Linha', 'Data', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Contato', 'Pago', ''];
    corpo += '<div class="tbl-wrap" style="border:1px solid #e5e7eb;border-radius:8px"><table class="tx" data-sort-enhanced="true" style="min-width:700px"><thead><tr>' + cab.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
      linhas.slice(0, 60).map((x) => '<tr' + (x.ok ? '' : ' style="background:#fff1f2"') + '><td>' + x.linha + '</td>' + (dr.modo === 'contatos'
        ? '<td>' + esc(x.nome) + '</td><td>' + esc(TIPOS_CT[x.tipo]) + '</td><td>' + esc(x.documento) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.telefone) + '</td>'
        : '<td>' + ddmmaaaa(x.data) + '</td><td class="trunc">' + esc(x.descricao) + '</td><td class="' + (x.tipo === 'receita' ? 'g' : 'r') + '">' + (x.tipo === 'receita' ? 'Recebimento' : 'Despesa') + '</td><td>' + money(x.valor) + '</td><td>' + esc(x.categoria) + '</td><td class="trunc c">' + esc(x.contato) + '</td><td>' + (x.pago ? 'Sim' : 'Não') + '</td>') +
        '<td class="r" style="font-size:12.5px">' + esc(x.motivo) + '</td></tr>').join('') + '</tbody></table></div>' + (linhas.length > 60 ? '<p class="hint">Mostrando 60 de ' + linhas.length + ' linhas.</p>' : '');
    const rodape = '<button type="submit" class="btn pri"' + (ok.length ? '' : ' disabled') + '>Importar ' + ok.length + ' ' + (dr.modo === 'contatos' ? 'contato(s)' : 'lançamento(s)') + '</button><button type="button" class="btn" data-act="fechar-drawer">Cancelar</button>';
    return ['Importar ' + (dr.modo === 'contatos' ? 'contatos' : dr.origem === 'zeropaper' ? 'de outro sistema' : 'lançamentos'), corpo, rodape, 'wide'];
  }

  function drawerOFX() {
    const dr = st.drawer;
    const o = dr.ofx;
    const cred = o.itens.filter((x) => x.valor > 0), deb = o.itens.filter((x) => x.valor < 0);
    const corpo = '<p class="hint" style="margin:0">Arquivo <b>' + esc(dr.arquivo) + '</b>' + (o.banco ? ' · banco ' + esc(o.banco) : '') + (o.numeroConta ? ' · conta ' + esc(o.numeroConta) : '') + '</p>' +
      '<label class="f">Conta do extrato *<select class="i" name="contaId">' + dr.contas.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === dr.contaId ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></label>' +
      '<div class="imp-res"><span class="g">' + cred.length + ' crédito(s): ' + money(cred.reduce((a, x) => a + x.valor, 0)) + '</span><span class="r">' + deb.length + ' débito(s): ' + money(deb.reduce((a, x) => a + x.valor, 0)) + '</span></div>' +
      '<div class="tbl-wrap" style="border:1px solid #e5e7eb;border-radius:8px"><table class="tx" data-sort-enhanced="true" style="min-width:500px"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>' +
      o.itens.slice(0, 80).map((x) => '<tr><td>' + ddmmaaaa(x.data) + '</td><td class="trunc">' + esc(x.descricao) + '</td><td class="' + (x.valor < 0 ? 'r' : 'g') + '">' + money(x.valor) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="hint">Movimentações que já foram importadas antes (mesmo identificador do banco) são ignoradas. Depois de importar, concilie em "Conciliações (OFX)".</p>';
    return ['Importar extrato OFX', corpo, '<button type="submit" class="btn pri">Importar ' + o.itens.length + ' movimentação(ões)</button><button type="button" class="btn" data-act="fechar-drawer">Cancelar</button>', 'wide'];
  }

  // ---------------------------------------------------------------------------
  // Conciliações (OFX)
  // ---------------------------------------------------------------------------
  function renderConciliacoes() {
    const d = st.conc.dados;
    const conta = d.contas.find((c) => c.id === d.contaId);
    const cont = { pendente: 0, conciliado: 0, ignorado: 0 };
    d.itens.forEach((i) => { cont[i.situacao]++; });
    const podeImportar = st.modulo && (st.modulo.editar || st.modulo.master);
    let h = '<div class="toolbar"><label class="f" style="min-width:230px">Conta<select class="i" data-k="conc-conta">' + d.contas.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === d.contaId ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></label>' +
      '<div class="pills" style="margin:18px 0 0">' + [['pendente', 'Pendentes'], ['conciliado', 'Conciliados'], ['ignorado', 'Ignorados'], ['todos', 'Todos']].map(([k, l]) => '<button type="button" class="pill" data-act="conc-filtro" data-f="' + k + '" aria-pressed="' + (st.conc.filtro === k) + '">' + l + (k !== 'todos' ? ' (' + cont[k] + ')' : '') + '</button>').join('') + '</div><span class="grow"></span>';
    const exatas = d.itens.filter((i) => i.situacao === 'pendente' && i.sugestoes && i.sugestoes.length === 1);
    if (exatas.length && podeImportar) h += '<button type="button" class="btn pri" data-act="conc-exatas" style="margin-top:18px">Conciliar ' + exatas.length + ' sugestão(ões) única(s)</button>';
    if (podeImportar) h += '<label class="btn" style="margin-top:18px;cursor:pointer">Importar OFX<input type="file" data-k="arquivo" data-tipo="ofx" accept=".ofx,.OFX" hidden></label>';
    h += '</div>';
    const lista = d.itens.filter((i) => st.conc.filtro === 'todos' || i.situacao === st.conc.filtro);
    h += '<div class="card">';
    if (!d.itens.length) return h + '<div class="vazio"><b>Nenhum extrato importado' + (conta ? ' para ' + esc(conta.nome) : '') + '</b>Baixe o extrato em OFX no internet banking e importe aqui para conferir com os lançamentos.</div></div>';
    if (!lista.length) return h + '<div class="vazio"><b>Nada aqui</b>' + (st.conc.filtro === 'pendente' ? 'Todas as movimentações deste extrato já foram tratadas.' : 'Mude o filtro.') + '</div></div>';
    h += '<div class="conc-lista">';
    for (const i of lista) {
      const cred = i.valor >= 0;
      const tipo = cred ? 'receita' : 'despesa';
      h += '<div class="conc-it ' + i.situacao + '"><div class="conc-ext"><div class="muted" style="font-size:12.5px">' + ddmmaaaa(i.data) + ' · extrato</div><div style="font-weight:600">' + esc(i.descricao) + '</div><div class="' + (cred ? 'g' : 'r') + '" style="font-size:17px;font-weight:600">' + money(i.valor) + '</div></div><div class="conc-sis">';
      if (i.situacao === 'conciliado') {
        h += '<div class="g" style="font-weight:600">✓ Conciliado</div><div>' + esc(i.transacaoDescricao || '') + '</div>' + (podeImportar ? '<button type="button" class="btn" data-act="conc-desfazer" data-s="' + esc(i.statementId) + '" data-i="' + esc(i.itemId) + '">Desfazer</button>' : '');
      } else if (i.situacao === 'ignorado') {
        h += '<div class="muted">Ignorado</div>' + (podeImportar ? '<button type="button" class="btn" data-act="conc-desfazer" data-s="' + esc(i.statementId) + '" data-i="' + esc(i.itemId) + '">Desfazer</button>' : '');
      } else if (st.conc.criando === i.itemId) {
        const cats = d.categorias[tipo] || [];
        h += '<div class="conc-form" data-s="' + esc(i.statementId) + '" data-i="' + esc(i.itemId) + '"><div class="two"><label class="f">Descrição<input class="i" data-c="descricao" value="' + esc(i.descricao) + '"></label><label class="f">Categoria<input class="i" data-c="categoria" list="md-conc-cats" placeholder="' + (cred ? 'Outras receitas' : 'Tarifas bancárias') + '"></label></div>' +
          '<datalist id="md-conc-cats">' + cats.map((c) => '<option value="' + esc(c) + '"></option>').join('') + '</datalist><label class="f">' + (cred ? 'Recebido de' : 'Pago a') + '<input class="i" data-c="contato"></label>' +
          '<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn pri" data-act="conc-criar">Criar e conciliar</button><button type="button" class="btn" data-act="conc-cancelar">Cancelar</button></div></div>';
      } else {
        if (i.sugestoes && i.sugestoes.length) {
          h += '<div class="muted" style="font-size:12.5px;margin-bottom:4px">Lançamento correspondente</div>' + i.sugestoes.map((s, k) => '<label class="chk sug"><input type="radio" name="sug-' + esc(i.itemId) + '" value="' + esc(s.id) + '"' + (k === 0 ? ' checked' : '') + '> <span><b>' + esc(s.descricao) + '</b><br><span class="muted">' + ddmmaaaa(s.data) + ' · ' + esc(s.contato || 'sem contato') + ' · ' + money(s.valor) + (s.pago ? ' · <b>já baixado</b> (só vincula)' : '') + '</span></span></label>').join('');
        } else {
          const abertos = d.abertos.filter((t) => t.tipo === tipo).sort((a, b) => Math.abs(a.valor - Math.abs(i.valor)) - Math.abs(b.valor - Math.abs(i.valor)) || Math.abs(Date.parse(a.data) - Date.parse(i.data)) - Math.abs(Date.parse(b.data) - Date.parse(i.data))).slice(0, 200);
          h += '<div class="muted" style="font-size:12.5px;margin-bottom:4px">Nenhum lançamento com esse valor e data.</div><select class="i" data-k="conc-busca" data-i="' + esc(i.itemId) + '" aria-label="Escolher lançamento"><option value="">Escolher um lançamento…</option>' + abertos.map((t) => '<option value="' + esc(t.id) + '">' + ddmm(t.data) + ' · ' + esc(t.descricao).slice(0, 60) + ' · ' + money(t.valor) + (t.pago ? ' · pago' : '') + '</option>').join('') + '</select>';
        }
        if (podeImportar) h += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn pri" data-act="conc-vincular" data-s="' + esc(i.statementId) + '" data-i="' + esc(i.itemId) + '">Conciliar</button><button type="button" class="btn" data-act="conc-criar-abrir" data-i="' + esc(i.itemId) + '">Criar lançamento</button><button type="button" class="btn" data-act="conc-ignorar" data-s="' + esc(i.statementId) + '" data-i="' + esc(i.itemId) + '">Ignorar</button></div>';
      }
      h += '</div></div>';
    }
    return h + '</div></div>';
  }

  // ---------------------------------------------------------------------------
  // Acessos (contratação pela empresa e telas liberadas a cada usuário)
  // ---------------------------------------------------------------------------
  const TELAS_ACESSO = [['transacoes', 'Painel, Lançamentos e Contas'], ['editar', 'Lançar, editar e dar baixa'], ['contatos', 'Contatos'], ['relatorios', 'Relatórios'], ['importacoes', 'Importações e conciliação OFX']];
  function renderAcessos() {
    const m = st.modulo;
    let h = '<div class="card" style="padding:16px;margin-bottom:14px"><h3 style="margin:0 0 4px;font-size:17px">Contratação do módulo</h3>' +
      '<p class="muted" style="margin:0 0 12px;font-size:13.5px">Empresa: <b>' + esc(m.empresa.nome) + '</b>. Sem contratação, as telas do módulo Lançamentos ficam bloqueadas para todos os usuários desta empresa.</p>' +
      (m.gerenciaContrato
        ? '<div style="display:flex;align-items:center;gap:12px"><button type="button" class="sw" role="switch" aria-checked="' + m.contratado + '" data-act="contrato" aria-label="Módulo Lançamentos contratado"></button><b>' + (m.contratado ? 'Contratado' : 'Não contratado') + '</b><span class="muted" style="font-size:13px">(só o administrador da plataforma altera)</span></div>'
        : '<b class="' + (m.contratado ? 'g' : 'r') + '">' + (m.contratado ? 'Contratado' : 'Não contratado') + '</b>') + '</div>';
    if (!m.gerenciaUsuarios) return h + '<div class="card vazio"><b>Liberação por usuário</b>Só quem gerencia usuários pode liberar as telas.</div>';
    if (!m.contratado) h += '<div class="aviso" style="margin-bottom:14px">O módulo não está contratado: as liberações abaixo só valem depois da contratação.</div>';
    h += '<div class="card"><div style="padding:14px 16px 0"><h3 style="margin:0;font-size:17px">O que cada usuário pode usar</h3><p class="muted" style="margin:4px 0 0;font-size:13px">Administradores da empresa recebem tudo por padrão; desmarque para restringir. A alteração vale no próximo carregamento da tela do usuário.</p></div>' +
      '<div class="tbl-wrap"><table class="tx" data-sort-enhanced="true"><thead><tr><th>Usuário</th><th>Perfil</th>' + TELAS_ACESSO.map((t) => '<th style="white-space:normal;max-width:130px">' + t[1] + '</th>').join('') + '</tr></thead><tbody>';
    for (const u of m.usuarios) {
      h += '<tr><td>' + esc(u.nome) + '<div class="muted" style="font-size:12px">@' + esc(u.username) + (u.ativo ? '' : ' · inativo') + '</div></td><td>' + esc(u.role || '') + '</td>' +
        TELAS_ACESSO.map((t) => { const v = t[0] === 'editar' ? u.editar : u.telas[t[0]]; return '<td><button type="button" class="sw" role="switch" aria-checked="' + Boolean(v) + '" data-act="acesso" data-u="' + esc(u.id) + '" data-t="' + t[0] + '" aria-label="' + esc(t[1] + ' para ' + u.nome) + '"></button></td>'; }).join('') + '</tr>';
    }
    h += '</tbody></table></div>';
    if (!m.usuarios.length) h += '<div class="vazio"><b>Nenhum usuário</b>Cadastre usuários em Criar Usuários / Níveis.</div>';
    return h + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Formulários (painel lateral)
  // ---------------------------------------------------------------------------
  function moldura(titulo, corpo, rodape, largo) {
    const dr = st.drawer;
    return '<div class="drawer-bg" data-act="fechar-drawer"></div><form class="drawer' + (largo ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '" novalidate><div class="dh"><h2>' + esc(titulo) + '</h2><button type="button" class="icon-btn" data-act="fechar-drawer" aria-label="Fechar">' + IC.close + '</button></div>' +
      '<div class="db">' + (dr.erro ? '<div class="msg bad" role="alert">' + esc(dr.erro) + '</div>' : '') + corpo + '</div><div class="df">' + rodape + '</div></form>';
  }
  function renderDrawer() {
    const dr = st.drawer;
    if (dr.tipo === 'contato' || dr.tipo === 'importar' || dr.tipo === 'ofx') { const [t, c, r, w] = dr.tipo === 'contato' ? drawerContato() : dr.tipo === 'ofx' ? drawerOFX() : drawerImportar(); return moldura(t, c, r, w); }
    let titulo = 'Novo lançamento', corpo = '', rodape = '';
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
      titulo = editando ? (rec ? 'Entrada' : 'Saída') : 'Novo lançamento';
      const travado = editando && !t.editavel;
      if (!editando) {
        const segs = [];
        if (p.receber.criar) segs.push('<button type="button" class="rec" data-act="modo" data-m="receita" aria-pressed="' + (modo === 'receita') + '">Entrada</button>');
        if (p.pagar.criar) segs.push('<button type="button" class="des" data-act="modo" data-m="despesa" aria-pressed="' + (modo === 'despesa') + '">Saída</button>');
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
    return moldura(titulo, corpo, rodape);
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
    if (!st.dados) return;
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
      if (dr.tipo === 'contato') {
        const c = dr.c || {};
        const corpo = { tipo: v.tipo || c.tipo, nome: v.nome, documento: v.documento, email: v.email, telefone: v.telefone, nascimento: v.nascimento, observacao: v.observacao };
        if (c.ref && !c.semCadastro) await api('PUT', '/contatos/' + encodeURIComponent(c.ref), corpo); else await api('POST', '/contatos', corpo);
        aviso('Contato salvo.');
        st.drawer = null; await carregar(); syncApp(); return;
      }
      if (dr.tipo === 'importar') {
        const linhas = converterLinhas(dr).filter((x) => x.ok);
        if (dr.modo === 'contatos') {
          const r = await api('POST', '/importacoes/contatos', { arquivo: dr.arquivo, linhas });
          aviso(r.importados + ' contato(s) importado(s)' + (r.ignoradas.length ? '; ' + r.ignoradas.length + ' ignorado(s) (' + r.ignoradas.slice(0, 5).map((x) => 'linha ' + x.linha + ': ' + x.motivo).join('; ') + ')' : '') + '.');
        } else {
          const r = await api('POST', '/importacoes/lancamentos', { arquivo: dr.arquivo, origem: dr.origem === 'zeropaper' ? 'zeropaper' : 'padrao', linhas });
          aviso(r.importadas + ' lançamento(s) importado(s)' + (r.ignoradas.length ? '; ' + r.ignoradas.length + ' ignorado(s) (' + r.ignoradas.slice(0, 5).map((x) => 'linha ' + x.linha + ': ' + x.motivo).join('; ') + ')' : '') + '.');
        }
        st.drawer = null; st.dados = null; await carregar(); syncApp(); return;
      }
      if (dr.tipo === 'ofx') {
        const o = dr.ofx;
        const r = await api('POST', '/importacoes/ofx', { arquivo: dr.arquivo, contaId: v.contaId, banco: o.banco, agencia: o.agencia, numeroConta: o.numeroConta, itens: o.itens });
        aviso(r.novos + ' movimentação(ões) importada(s)' + (r.repetidos ? '; ' + r.repetidos + ' já tinham sido importadas antes' : '') + '. Confira a conciliação.');
        st.drawer = null; st.conc.contaId = v.contaId; st.conc.filtro = 'pendente'; st.pagina = 'conciliacoes'; await carregar(); return;
      }
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
    let fecharLista = false;
    if (st.rel.aberto && !(e.target.closest && e.target.closest('.ms'))) { st.rel.aberto = ''; fecharLista = true; }
    const t = e.target.closest('[data-act]');
    if (!t || !(root.contains(t) || drawerHost.contains(t))) { if (fecharLista) render(); return; }
    const act = t.dataset.act;
    const d = st.dados;
    if (onClickPaginas(e, t, act)) return;
    if (act === 'fechar') return close();
    if (act === 'recarregar') return carregar();
    if (act === 'pagina') { st.pagina = t.dataset.p; st.drawer = null; st.erro = ''; render(); carregar(); return; }
    if (act === 'mes') { st.mes = somaMes(st.mes, Number(t.dataset.n)); st.dia = ''; st.sel.clear(); render(); carregar(); return; }
    if (act === 'dia') { st.dia = t.dataset.dia; st.pagina = 'transacoes'; st.trf = false; render(); return; }
    if (act === 'limpar-dia') { st.dia = ''; render(); return; }
    if (act === 'tipo') { const tp = t.dataset.t; st.trf = tp === 'trf'; if (!st.trf) { st.rec = tp === 'todos' || tp === 'rec'; st.des = tp === 'todos' || tp === 'des'; if (!d.permissoes.receber.ver) st.rec = false; if (!d.permissoes.pagar.ver) st.des = false; } st.sel.clear(); render(); return; }
    if (act === 'mes-atual') { st.mes = hojeISO().slice(0, 7); st.dia = ''; st.sel.clear(); render(); carregar(); return; }
    if (act === 'ag-vencidos') { st.pagina = 'transacoes'; st.trf = false; st.dia = ''; st.filtros.situacao = 'vencidos'; st.mostrarFiltros = true; render(); return; }
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

  function onClickPaginas(e, t, act) {
    const conc = (acao, extra) => executar(() => api('POST', '/conciliacoes', { acoes: [Object.assign({ statementId: t.dataset.s, itemId: t.dataset.i, acao }, extra || {})] }), (r) => (r.feitos ? (acao === 'desfazer' ? 'Conciliação desfeita.' : acao === 'ignorar' ? 'Movimentação ignorada.' : 'Conciliado.') : (r.avisos[0] || 'Nada foi alterado.')));
    switch (act) {
      case 'ct-cartao': st.ct.cartao = st.ct.cartao === t.dataset.c ? '' : t.dataset.c; render(); return true;
      case 'ct-tipo': st.ct.tipo = t.dataset.t; render(); return true;
      case 'ct-ordem': { const c = t.dataset.campo; st.ct.ordem = { campo: c, asc: st.ct.ordem.campo === c ? !st.ct.ordem.asc : c !== 'aReceber' && c !== 'aPagar' }; render(); return true; }
      case 'ct-abrir': { const c = st.ct.dados.contatos.find((x) => x.ref === t.dataset.ref); if (c) { st.drawer = { tipo: 'contato', c: { ...c } }; render(); } return true; }
      case 'novo-contato': st.drawer = { tipo: 'contato', c: { tipo: st.ct.tipo !== 'todos' ? st.ct.tipo : 'cliente' } }; render(); return true;
      case 'rel': st.rel.relatorio = t.dataset.r; render(); return true;
      case 'rel-limpar': Object.assign(st.rel, { cats: [], contas: [], contatos: [], modos: [], tipoPag: '', pagos: true, naoPagos: true, por: 'pagamento' }); render(); return true;
      case 'rel-csv': baixarCSV('relatorio-' + st.rel.relatorio + '-' + st.rel.de + '-a-' + st.rel.ate + '.csv', st.rel.ultimo.csv); return true;
      case 'rel-imprimir': imprimir(nomeRelatorio(st.rel.relatorio) + ' - ' + ddmmaaaa(st.rel.dados.de) + ' à ' + ddmmaaaa(st.rel.dados.ate), st.rel.ultimo.html); return true;
      case 'ms-abrir': st.rel.aberto = st.rel.aberto === t.dataset.ms ? '' : t.dataset.ms; render(); return true;
      case 'modelo': baixarModelo(t.dataset.t); return true;
      case 'ir-conciliar': st.conc.contaId = t.dataset.conta || ''; st.conc.filtro = 'pendente'; st.pagina = 'conciliacoes'; st.conc.dados = null; render(); carregar(); return true;
      case 'conc-filtro': st.conc.filtro = t.dataset.f; render(); return true;
      case 'conc-criar-abrir': st.conc.criando = t.dataset.i; render(); return true;
      case 'conc-cancelar': st.conc.criando = ''; render(); return true;
      case 'conc-ignorar': conc('ignorar'); return true;
      case 'conc-desfazer': if (window.confirm('Desfazer? Se o lançamento foi marcado como pago pela conciliação, ele volta para não pago (e o criado pela conciliação é excluído).')) conc('desfazer'); return true;
      case 'conc-vincular': {
        const item = st.conc.dados.itens.find((x) => x.itemId === t.dataset.i);
        const radio = root.querySelector('input[name="sug-' + CSS.escape(t.dataset.i) + '"]:checked');
        const sel = root.querySelector('select[data-k="conc-busca"][data-i="' + CSS.escape(t.dataset.i) + '"]');
        const tx = (radio && radio.value) || (sel && sel.value) || '';
        if (!tx) { aviso('Escolha o lançamento do sistema que corresponde a esta movimentação, ou crie um lançamento.', false); render(); return true; }
        if (item && sel && sel.value) { const a = st.conc.dados.abertos.find((x) => x.id === tx); if (a && Math.abs(a.valor - Math.abs(item.valor)) > 0.009 && !window.confirm('O valor do lançamento (' + money(a.valor) + ') é diferente do extrato (' + money(Math.abs(item.valor)) + '). Conciliar mesmo assim?')) return true; }
        conc('vincular', { transacaoId: tx }); return true;
      }
      case 'conc-criar': {
        const f = t.closest('.conc-form');
        const val = (k) => (f.querySelector('[data-c="' + k + '"]') || {}).value || '';
        st.conc.criando = '';
        executar(() => api('POST', '/conciliacoes', { acoes: [{ statementId: f.dataset.s, itemId: f.dataset.i, acao: 'criar', descricao: val('descricao'), categoria: val('categoria'), contato: val('contato') }] }), (r) => (r.feitos ? 'Lançamento criado e conciliado.' : (r.avisos[0] || 'Nada foi alterado.')));
        return true;
      }
      case 'conc-exatas': {
        const acoes = st.conc.dados.itens.filter((i) => i.situacao === 'pendente' && i.sugestoes && i.sugestoes.length === 1).map((i) => ({ statementId: i.statementId, itemId: i.itemId, acao: 'vincular', transacaoId: i.sugestoes[0].id }));
        if (!window.confirm('Conciliar ' + acoes.length + ' movimentação(ões) com a única sugestão encontrada para cada uma?')) return true;
        executar(() => api('POST', '/conciliacoes', { acoes }), (r) => r.feitos + ' movimentação(ões) conciliada(s).' + (r.avisos.length ? ' ' + r.avisos.length + ' aviso(s).' : ''));
        return true;
      }
      case 'contrato': {
        const novo = !st.modulo.contratado;
        if (!window.confirm(novo ? 'Marcar o módulo Lançamentos como contratado por esta empresa?' : 'Remover o módulo Lançamentos do contrato desta empresa? As telas ficam bloqueadas para os usuários dela.')) return true;
        executar(() => api('POST', '/modulo/contrato', { contratado: novo }), novo ? 'Módulo contratado.' : 'Módulo removido do contrato.');
        return true;
      }
      case 'acesso': {
        const u = st.modulo.usuarios.find((x) => x.id === t.dataset.u);
        if (!u) return true;
        const campo = t.dataset.t;
        const corpo = { userId: u.id };
        if (campo === 'editar') corpo.editar = !u.editar; else corpo.telas = { [campo]: !u.telas[campo] };
        t.disabled = true;
        executar(() => api('POST', '/modulo/usuarios', corpo), 'Acesso de ' + u.nome + ' atualizado.');
        return true;
      }
      default: return false;
    }
  }

  function onChange(e) {
    const kk = e.target.dataset && e.target.dataset.k;
    if (kk === 'arquivo') { const f = e.target.files && e.target.files[0]; const tipo = e.target.dataset.tipo; e.target.value = ''; if (f) lerArquivoImportacao(f, tipo); return; }
    if (kk === 'imp-mapa') { st.drawer.mapa[e.target.dataset.campo] = e.target.value === '' ? '' : Number(e.target.value); render(); return; }
    if (kk === 'imp-tipopadrao') { st.drawer.tipoPadrao = e.target.value; render(); return; }
    if (kk === 'rel-de' || kk === 'rel-ate') { const v = e.target.value; if (!v) return; st.rel[kk === 'rel-de' ? 'de' : 'ate'] = v; if (st.rel.ate < st.rel.de) { aviso('A data final é anterior à inicial.', false); render(); return; } st.rel.dados = null; render(); carregar(); return; }
    if (kk === 'rel-tipo') { st.rel.relatorio = e.target.value; render(); return; }
    if (kk === 'rel-tipopag') { st.rel.tipoPag = e.target.value; render(); return; }
    if (kk === 'rel-pagos') { st.rel.pagos = e.target.checked; render(); return; }
    if (kk === 'rel-naopagos') { st.rel.naoPagos = e.target.checked; render(); return; }
    if (kk === 'rel-por') { st.rel.por = e.target.value; render(); return; }
    if (kk === 'ms') { const lista = st.rel[e.target.dataset.ms]; const v = e.target.value; const i = lista.indexOf(v); if (e.target.checked && i < 0) lista.push(v); if (!e.target.checked && i >= 0) lista.splice(i, 1); render(); return; }
    if (kk === 'conc-conta') { st.conc.contaId = e.target.value; st.conc.dados = null; render(); carregar(); return; }    const k = e.target.dataset && e.target.dataset.k;
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
    if (k === 'busca-ct') { st.ct.busca = e.target.value; clearTimeout(onInput.t); onInput.t = setTimeout(render, 150); return; }
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
  let menuInfo = null;
  let menuChave = '';
  let menuBuscando = false;
  let menuNovaTentativa = 0;
  function atualizarMenuInfo() {
    const u = user();
    const chave = (u && u.id) + '|' + companyId();
    if (!u || menuBuscando || chave === menuChave) return;
    if (chave.split('|')[1] !== (menuInfo && menuInfo.empresa && menuInfo.empresa.id)) menuInfo = null;
    menuBuscando = true;
    // Falha (ex.: sessão ainda não aberta logo após o login): tenta de novo em alguns segundos, sem guardar o resultado
    if (Date.now() < menuNovaTentativa) { menuBuscando = false; return; }
    api('GET', '/modulo').then((m) => { menuInfo = m; menuChave = chave; }).catch(() => { menuNovaTentativa = Date.now() + 4000; }).finally(() => { menuBuscando = false; });
  }
  const menuVisivel = () => {
    if (!menuInfo) return false;
    if (menuInfo.master) return true;
    return menuInfo.contratado && (Object.values(menuInfo.telas || {}).some(Boolean) || menuInfo.gerenciaUsuarios);
  };
  function injectMenu() {
    atualizarMenuInfo();
    const nav = document.querySelector('#sidebar-container nav');
    const existing = document.getElementById('menu-btn-fin-transacoes');
    const u = user();
    if (!nav || !u || !menuVisivel()) { if (existing) existing.remove(); if (root && !u) close(); return; }
    ensureStyles();
    const sidebar = document.getElementById('sidebar-container');
    const collapsed = sidebar && sidebar.offsetWidth < 100;
    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'menu-btn-fin-transacoes';
      btn.title = 'Lançamentos';
      btn.addEventListener('click', () => open('transacoes'));
    }
    const html = IC.money + (collapsed ? '' : '<span>LANÇAMENTOS</span>');
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
    const item = e.target.closest && e.target.closest('#sidebar-container nav button, #sidebar-container nav a, [id^="flyout-sub-"]');
    if (item && item.id !== 'menu-btn-fin-transacoes' && item.id !== 'flyout-sub-financial-md-transacoes') close();
  }, true);
  let empresaAnterior = companyId();
  setInterval(() => {
    injectMenu();
    const atual = companyId();
    if (atual !== empresaAnterior) { empresaAnterior = atual; st.conta = ''; st.dados = null; st.modulo = null; st.ct.dados = null; st.rel.dados = null; st.imp.dados = null; st.conc = { dados: null, contaId: '', filtro: 'pendente', criando: '' }; if (root) { render(); carregar(); } }
  }, 1000);

  window.MotorDeskOpenTransacoes = open;
})();
