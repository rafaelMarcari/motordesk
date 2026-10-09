/**
 * MotorDesk - Saúde da empresa
 *
 * Indicadores do negócio numa tela só, para o empresário: caixa, cobertura dos próximos 30 dias,
 * inadimplência, contas vencidas, faturamento, ticket médio, clientes, orçamentos, estoque e, conforme o
 * ramo, oficina (OS), indústria (produção) e representação comercial. Cada indicador tem sinal
 * (verde / amarelo / vermelho), comparação com o mês anterior e a explicação do que significa.
 * Dados e permissão vêm do servidor (GET /api/saude-empresa); a tela é liberada por usuário
 * (Criar Usuários / Níveis → editar → Outras telas do sistema → Saúde da empresa).
 */
(function () {
  'use strict';

  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const curto = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const hojeISO = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const somaMes = (m, n) => { const [y, mm] = m.split('-').map(Number); const t = (mm - 1) + n; return (y + Math.floor(t / 12)) + '-' + String(((t % 12) + 12) % 12 + 1).padStart(2, '0'); };
  const mesLongo = (m) => MESES[Number(m.slice(5, 7)) - 1] + ' de ' + m.slice(0, 4);
  const user = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; } };
  const companyId = () => { try { const u = user() || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  const isMaster = (u) => u && (['admin', 'validador'].includes(String(u.username || '').toLowerCase()) || u.role === 'qa');
  const podeVer = (u) => {
    if (!u) return false;
    if (isMaster(u)) return true;
    const p = Object.assign({}, u.permissions || {}, u.individualExceptions || {}, u.customPermissions || {});
    if (p.accessSaudeEmpresa === false) return false;
    return p.accessSaudeEmpresa === true || u.role === 'admin';
  };
  const SINAIS = { ok: ['#059669', '#ecfdf5', 'Saudável'], atencao: ['#d97706', '#fffbeb', 'Atenção'], critico: ['#dc2626', '#fef2f2', 'Crítico'], neutro: ['#64748b', '#f8fafc', 'Informativo'] };

  let root = null;
  const st = { mes: hojeISO().slice(0, 7), dados: null, erro: '', aberto: '' };

  function estilos() {
    if (document.getElementById('md-saude-style')) return;
    const s = document.createElement('style');
    s.id = 'md-saude-style';
    s.textContent = [
      '#md-saude{position:fixed;z-index:44;background:#f1f5f9;overflow:auto;color:#0f172a;font-family:inherit}',
      '#md-saude *{box-sizing:border-box}',
      '#md-saude .hd{background:#0f172a;color:#e2e8f0;position:sticky;top:0;z-index:3}',
      '#md-saude .hd-in{max-width:1400px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:16px 22px}',
      '#md-saude .kick{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#5eead4;font-weight:700}',
      '#md-saude h1{margin:2px 0 0;font-size:21px;color:#fff}',
      '#md-saude .grow{flex:1}',
      '#md-saude .mes{display:flex;align-items:center;gap:6px}#md-saude .mes b{min-width:170px;text-align:center;color:#fff;font-size:15px}',
      '#md-saude .ib{width:34px;height:34px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;font-size:16px}',
      '#md-saude .bt{border:1px solid #334155;background:#1e293b;color:#e2e8f0;border-radius:6px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}',
      '#md-saude .wrap{max-width:1400px;margin:0 auto;padding:18px 22px 40px}',
      '#md-saude .geral{display:flex;flex-wrap:wrap;align-items:center;gap:18px;border-radius:8px;padding:16px 20px;margin-bottom:16px;border:1px solid}',
      '#md-saude .geral .sel{width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;flex-shrink:0}',
      '#md-saude .geral h2{margin:0;font-size:19px}#md-saude .geral p{margin:3px 0 0;font-size:13.5px;color:#475569}',
      '#md-saude .placar{display:flex;gap:10px;margin-left:auto}#md-saude .placar span{border-radius:6px;padding:6px 12px;font-size:13px;font-weight:700}',
      '#md-saude .bloco{margin-bottom:18px}#md-saude .bloco h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#475569}',
      '#md-saude .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}',
      '#md-saude .ind{background:#fff;border:1px solid #e2e8f0;border-left:5px solid;border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;gap:4px}',
      '#md-saude .ind .t{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:600;color:#334155}',
      '#md-saude .ind .tag{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}',
      '#md-saude .ind .v{font-size:23px;font-weight:700;font-variant-numeric:tabular-nums}',
      '#md-saude .ind .d{font-size:12.5px;color:#64748b;line-height:1.4}',
      '#md-saude .ind .q{align-self:flex-start;border:0;background:none;color:#0f766e;font:inherit;font-size:12.5px;cursor:pointer;padding:2px 0;text-decoration:underline}',
      '#md-saude .ind .exp{font-size:12.5px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:7px 9px;color:#134e4a;line-height:1.45}',
      '#md-saude .card{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;margin-bottom:18px}',
      '#md-saude .card h3{margin:0 0 4px;font-size:15px}#md-saude .card p{margin:0 0 8px;font-size:12.5px;color:#64748b}',
      '#md-saude .leg{display:flex;gap:14px;font-size:12px;color:#475569}#md-saude .leg i{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:middle;margin-right:5px}',
      '#md-saude .msg{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:12px 14px}',
      '#menu-btn-saude-empresa{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:0;background:none;color:#cbd5e1;font-size:12px;font-weight:600;letter-spacing:.02em;cursor:pointer;text-align:left}',
      '#menu-btn-saude-empresa:hover{background:#1e293b;color:#fff}#menu-btn-saude-empresa svg{width:16px;height:16px;flex-shrink:0;color:#f472b6}#menu-btn-saude-empresa[aria-current=page]{background:#4f46e5;color:#fff}',
      // Na Indústria acompanha as linhas dos módulos (mais compactas e em tom mais suave)
      '#menu-btn-saude-empresa.md-saude-ind{padding:8px 12px;margin:2px 0;color:#94a3b8;text-transform:uppercase}#menu-btn-saude-empresa.md-saude-ind:hover{color:#f1f5f9}#menu-btn-saude-empresa.md-saude-ind svg{width:14px;height:14px}',
      '@media print{#md-saude{position:static}#md-saude .hd .ib,#md-saude .hd .bt{display:none}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function posicionar() {
    if (!root) return;
    const sb = document.getElementById('sidebar-container');
    const sair = document.getElementById('btn-top-logout') || [...document.querySelectorAll('button')].find((b) => /^\s*SAIR\s*$/i.test(b.textContent || ''));
    const header = sair && (sair.closest('header') || (sair.parentElement && sair.parentElement.parentElement));
    root.style.left = (sb ? Math.round(sb.getBoundingClientRect().right) : 0) + 'px';
    root.style.top = (header ? Math.round(header.getBoundingClientRect().bottom) : 0) + 'px';
    root.style.right = '0'; root.style.bottom = '0';
  }

  async function carregar() {
    st.erro = '';
    try {
      const res = await fetch('/api/saude-empresa?mes=' + st.mes, { headers: { 'X-Company-Id': companyId() } });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d || !d.success) throw new Error((d && d.error) || 'Não foi possível carregar os indicadores.');
      st.dados = d;
    } catch (e) { st.erro = e.message; st.dados = null; }
    render();
  }

  function grafico(serie) {
    const W = 760, H = 230, pl = 86, pr = 10, pt = 14, pb = 30;
    const vals = serie.flatMap((s) => [s.faturamento, s.resultado]);
    let max = Math.max(0, ...vals), min = Math.min(0, ...vals);
    if (max === min) max = min + 1;
    const y = (v) => pt + ((max - v) * (H - pt - pb)) / (max - min);
    const gw = (W - pl - pr) / serie.length, bw = Math.min(28, gw / 3);
    let g = '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="#94a3b8"/>' +
      '<text x="' + (pl - 8) + '" y="' + (y(max) + 4) + '" text-anchor="end" font-size="12" fill="#64748b">' + esc(curto(max)) + '</text>' +
      (min < 0 ? '<text x="' + (pl - 8) + '" y="' + (y(min) + 4) + '" text-anchor="end" font-size="12" fill="#64748b">' + esc(curto(min)) + '</text>' : '') +
      '<text x="' + (pl - 8) + '" y="' + (y(0) + 4) + '" text-anchor="end" font-size="12" fill="#64748b">R$ 0</text>';
    serie.forEach((s, i) => {
      const cx = pl + gw * i + gw / 2;
      const b = (v, x, cor) => { const y0 = y(0), y1 = y(v); return '<rect x="' + x.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + bw + '" height="' + Math.max(1, Math.abs(y1 - y0)).toFixed(1) + '" fill="' + cor + '" rx="2"><title>' + esc(money(v)) + '</title></rect>'; };
      g += b(s.faturamento, cx - bw - 2, '#0f766e') + b(s.resultado, cx + 2, s.resultado < 0 ? '#dc2626' : '#34d399');
      g += '<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" fill="#475569">' + CURTO[Number(s.mes.slice(5, 7)) - 1] + '/' + s.mes.slice(2, 4) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Faturamento e resultado de caixa dos últimos 6 meses">' + g + '</svg>';
  }

  function render() {
    if (!root) return;
    const d = st.dados;
    let h = '<header class="hd"><div class="hd-in"><div><div class="kick">Gestão' + (d && d.empresa ? ' · ' + esc(d.empresa) : '') + '</div><h1>Saúde da empresa</h1></div><span class="grow"></span>' +
      '<div class="mes"><button type="button" class="ib" data-act="mes" data-n="-1" aria-label="Mês anterior">‹</button><b aria-live="polite">' + mesLongo(st.mes) + '</b><button type="button" class="ib" data-act="mes" data-n="1" aria-label="Próximo mês">›</button></div>' +
      '<button type="button" class="bt" data-act="imprimir">Imprimir</button><button type="button" class="ib" data-act="fechar" aria-label="Fechar">✕</button></div></header><div class="wrap">';
    if (st.erro) h += '<div class="msg">' + esc(st.erro) + '</div>';
    else if (!d) h += '<p style="color:#64748b">Carregando indicadores…</p>';
    else {
      const g = SINAIS[d.geral];
      const frase = d.geral === 'ok' ? 'Os principais indicadores estão saudáveis.' : d.geral === 'atencao' ? 'Alguns pontos pedem atenção: veja os itens em amarelo e vermelho.' : 'Há indicadores críticos: comece pelos itens em vermelho.';
      h += '<section class="geral" style="background:' + g[1] + ';border-color:' + g[0] + '55"><span class="sel" style="background:' + g[0] + '">' + (d.geral === 'ok' ? '✓' : '!') + '</span><div><h2 style="color:' + g[0] + '">Saúde geral: ' + (d.geral === 'ok' ? 'boa' : d.geral === 'atencao' ? 'atenção' : 'crítica') + '</h2><p>' + frase + ' Referência: ' + mesLongo(d.mes) + ', comparado com ' + mesLongo(d.mesAnterior) + '.</p></div>' +
        '<div class="placar"><span style="background:#ecfdf5;color:#047857">' + d.placar.ok + ' saudáveis</span><span style="background:#fffbeb;color:#b45309">' + d.placar.atencao + ' atenção</span><span style="background:#fef2f2;color:#b91c1c">' + d.placar.critico + ' críticos</span></div></section>';
      for (const b of d.blocos) {
        h += '<section class="bloco"><h3>' + esc(b.titulo) + '</h3><div class="grade">' + b.itens.map((it, k) => {
          const s = SINAIS[it.sinal]; const id = b.id + '-' + k;
          return '<article class="ind" style="border-left-color:' + s[0] + '"><div class="t"><span>' + esc(it.titulo) + '</span><span class="tag" style="background:' + s[1] + ';color:' + s[0] + '">' + s[2] + '</span></div><div class="v" style="color:' + (it.sinal === 'critico' ? '#b91c1c' : '#0f172a') + '">' + esc(it.valor) + '</div><div class="d">' + esc(it.detalhe) + '</div>' +
            '<button type="button" class="q" data-act="explica" data-id="' + id + '" aria-expanded="' + (st.aberto === id) + '">O que significa?</button>' + (st.aberto === id ? '<div class="exp">' + esc(it.explica) + '</div>' : '') + '</article>';
        }).join('') + '</div></section>';
      }
      h += '<section class="card"><h3>Últimos 6 meses</h3><p>Faturamento (vendas e OS concluídas) e resultado de caixa (recebido − pago) de cada mês.</p><div class="leg"><span><i style="background:#0f766e"></i>Faturamento</span><span><i style="background:#34d399"></i>Resultado de caixa</span><span><i style="background:#dc2626"></i>Resultado negativo</span></div>' + grafico(d.serie) + '</section>';
    }
    root.innerHTML = h + '</div>';
  }

  function abrir() {
    estilos();
    if (!root) {
      root = document.createElement('div');
      root.id = 'md-saude';
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'Saúde da empresa');
      root.addEventListener('click', onClick);
      document.body.appendChild(root);
      window.addEventListener('resize', posicionar);
    }
    posicionar();
    marcar(true);
    render();
    carregar();
  }
  function fechar() { if (root) root.remove(); root = null; window.removeEventListener('resize', posicionar); marcar(false); }
  function onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const a = t.dataset.act;
    if (a === 'fechar') return fechar();
    if (a === 'imprimir') return window.print();
    if (a === 'mes') { st.mes = somaMes(st.mes, Number(t.dataset.n)); st.dados = null; render(); carregar(); return; }
    if (a === 'explica') { st.aberto = st.aberto === t.dataset.id ? '' : t.dataset.id; render(); }
  }
  function marcar(ativo) { const b = document.getElementById('menu-btn-saude-empresa'); if (b) { if (ativo) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); } }

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>';
  function injectMenu() {
    const nav = document.querySelector('#sidebar-container nav');
    const existente = document.getElementById('menu-btn-saude-empresa');
    const u = user();
    if (!nav || !podeVer(u)) { if (existente) existente.remove(); if (root && !u) fechar(); return; }
    estilos();
    const sb = document.getElementById('sidebar-container');
    const recolhido = sb && sb.offsetWidth < 100;
    let btn = existente;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'menu-btn-saude-empresa';
      btn.title = 'Saúde da empresa';
      btn.addEventListener('click', abrir);
    }
    const html = ICON + (recolhido ? '' : '<span>SAÚDE DA EMPRESA</span>');
    if (btn.innerHTML !== html) btn.innerHTML = html;
    btn.style.justifyContent = recolhido ? 'center' : '';
    // Logo após o Dashboard; na Indústria (sem Dashboard no menu), logo após o "Rastrear Processo"
    const ancora = document.getElementById('menu-btn-dashboard') || document.getElementById('menu-btn-rastrear-processo');
    if (ancora && nav.contains(ancora)) { if (ancora.nextElementSibling !== btn) ancora.after(btn); }
    else if (btn.parentElement !== nav) nav.prepend(btn);
    btn.classList.toggle('md-saude-ind', Boolean(ancora && ancora.id === 'menu-btn-rastrear-processo'));
    if (root) posicionar();
  }

  // Outro item do menu (ou do submenu) fecha a tela
  document.addEventListener('click', (e) => {
    if (!root) return;
    const item = e.target.closest && e.target.closest('#sidebar-container nav button, #sidebar-container nav a, [id^="flyout-sub-"]');
    if (item && item.id !== 'menu-btn-saude-empresa') fechar();
  }, true);
  let empresa = companyId();
  setInterval(() => { injectMenu(); const c = companyId(); if (c !== empresa) { empresa = c; if (root) { st.dados = null; render(); carregar(); } } }, 1000);
  window.MotorDeskOpenSaude = abrir;
})();
