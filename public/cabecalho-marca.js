/**
 * MotorDesk - Cabeçalho: logo da empresa contratante e divulgação do MotorDesk (todos os segmentos)
 *
 *  - Logo: no começo do cabeçalho, antes do seletor de empresa. Quem tem a liberação "Logo da empresa no
 *    cabeçalho" (administradores, ou usuários liberados) envia, troca ou remove clicando nele. A imagem é
 *    reduzida no navegador antes do envio. O mesmo logo sai nos PDFs exportados.
 *  - Divulgação: faixa fina logo abaixo do cabeçalho com mensagens do MotorDesk que se alternam (para ao passar
 *    o mouse). Pode ser ocultada até o próximo acesso. O administrador da plataforma edita as mensagens pela
 *    engrenagem da própria faixa.
 * Dados: /api/empresa-ativa (compartilhado por empresa-cartao.js em window.__mdEmpresaAtiva) e /api/divulgacao.
 */
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const user = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; } };
  const companyId = () => { try { const u = user() || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  const api = async (method, url, body) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: body ? JSON.stringify(body) : undefined });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d || d.success === false) throw new Error((d && d.error) || 'Não foi possível concluir agora.');
    return d;
  };
  const reduzMovimento = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const MARCA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>';
  const ENGRENAGEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

  function estilos() {
    if (document.getElementById('md-cab-style')) return;
    const s = document.createElement('style');
    s.id = 'md-cab-style';
    s.textContent = [
      // o bloco antigo de logos do canto direito (só aparecia em telas muito largas) dá lugar a estes
      '#top-right-logos-container{display:none !important}',
      // logo
      '#md-cab-logo{display:flex;align-items:center;flex-shrink:0}',
      '#md-cab-logo .lg{height:36px;max-width:132px;padding:3px 6px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:default}',
      '#md-cab-logo button.lg{cursor:pointer}#md-cab-logo button.lg:hover{border-color:#a5b4fc}',
      '#md-cab-logo .lg img{max-height:28px;max-width:118px;object-fit:contain;display:block}',
      '#md-cab-logo .vazio{height:34px;padding:0 10px;border-radius:8px;border:1px dashed #cbd5e1;background:#f8fafc;color:#64748b;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap}',
      '#md-cab-logo .vazio:hover{border-color:#818cf8;color:#4338ca;background:#eef2ff}',
      '#md-cab-logo button:focus-visible,#md-cab-promo button:focus-visible,#md-cab-promo a:focus-visible{outline:2px solid #6366f1;outline-offset:2px}',
      '#md-cab-logo-pop{position:fixed;z-index:10060;width:300px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.18);padding:14px;font-size:12.5px;color:#334155}',
      '#md-cab-logo-pop h4{margin:0 0 2px;font-size:13.5px;color:#0f172a}#md-cab-logo-pop p{margin:0 0 10px;color:#64748b;font-size:12px;line-height:1.45}',
      '#md-cab-logo-pop .prev{height:84px;border:1px solid #e2e8f0;border-radius:8px;background:repeating-conic-gradient(#f8fafc 0 25%,#fff 0 50%) 0 0/16px 16px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#94a3b8}',
      '#md-cab-logo-pop .prev img{max-height:70px;max-width:260px;object-fit:contain}',
      '#md-cab-logo-pop .bts{display:flex;gap:6px;flex-wrap:wrap}#md-cab-logo-pop button{font:inherit;font-size:12px;font-weight:600;border-radius:7px;padding:6px 10px;cursor:pointer;border:1px solid #cbd5e1;background:#fff;color:#334155}',
      '#md-cab-logo-pop button.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}#md-cab-logo-pop button.pri:hover{background:#4338ca}#md-cab-logo-pop button.rem{color:#b91c1c}',
      '#md-cab-logo-pop .msg{margin-top:8px;font-size:11.5px}#md-cab-logo-pop .msg.erro{color:#b91c1c}#md-cab-logo-pop .msg.ok{color:#047857}',
      // divulgação
      '#md-cab-promo{display:flex;align-items:center;justify-content:center;height:30px;padding:0 12px;background:linear-gradient(90deg,#f8fafc,#eef2ff 50%,#f8fafc);border-bottom:1px solid #e2e8f0;color:#475569;font-size:12.5px;flex-shrink:0;position:relative;z-index:9}',
      '#md-cab-promo .faixa{display:flex;align-items:center;gap:8px;min-width:0;max-width:100%}',
      '#md-cab-promo .marca{display:flex;align-items:center;gap:5px;flex-shrink:0;color:#4f46e5;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}#md-cab-promo .marca svg{width:13px;height:13px}',
      '#md-cab-promo .sep{width:1px;height:14px;background:#cbd5e1;flex-shrink:0}',
      '#md-cab-promo .conteudo{min-width:0;display:flex;align-items:baseline;gap:6px;white-space:nowrap;overflow:hidden;transition:opacity .25s}',
      '#md-cab-promo .conteudo.saindo{opacity:0}',
      '#md-cab-promo .tit{font-weight:700;color:#1e293b;flex-shrink:0}#md-cab-promo .txt{overflow:hidden;text-overflow:ellipsis;color:#64748b}',
      '#md-cab-promo .acao{flex-shrink:0;border:0;background:none;color:#4f46e5;font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:2px 6px;border-radius:6px;text-decoration:none}#md-cab-promo .acao:hover{background:#e0e7ff}',
      '#md-cab-promo .cfg,#md-cab-promo .fx{flex-shrink:0;border:0;background:none;color:#94a3b8;cursor:pointer;padding:3px;border-radius:6px;display:flex;align-items:center;justify-content:center}#md-cab-promo .cfg:hover,#md-cab-promo .fx:hover{color:#334155;background:#e2e8f0}#md-cab-promo .cfg svg{width:14px;height:14px}',
      '#md-cab-promo .fx{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:16px;line-height:1;width:22px;height:22px}',
      '@media (max-width:700px){#md-cab-promo .txt,#md-cab-promo .marca span{display:none}}',
      '@media print{#md-cab-promo{display:none}}',
      // editor da divulgação
      '#md-divulgacao-ed{position:fixed;inset:0;z-index:10070;background:rgba(15,23,42,.45);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow:auto}',
      '#md-divulgacao-ed .cx{background:#fff;border-radius:14px;width:100%;max-width:760px;padding:20px 22px;color:#334155;font-size:13px;box-shadow:0 24px 60px rgba(15,23,42,.3)}',
      '#md-divulgacao-ed h3{margin:0 0 4px;font-size:16px;color:#0f172a}#md-divulgacao-ed .sub{margin:0 0 14px;color:#64748b;font-size:12.5px}',
      '#md-divulgacao-ed .lin{display:grid;grid-template-columns:140px minmax(0,1fr) 170px 150px 32px;gap:6px;margin-bottom:6px;align-items:center}',
      '#md-divulgacao-ed .cab{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em}',
      '#md-divulgacao-ed input,#md-divulgacao-ed select{font:inherit;font-size:12.5px;border:1px solid #cbd5e1;border-radius:7px;padding:6px 8px;min-width:0;width:100%;box-sizing:border-box;background:#fff;color:#0f172a}',
      '#md-divulgacao-ed .x{border:0;background:none;color:#94a3b8;font-size:18px;cursor:pointer;border-radius:6px}#md-divulgacao-ed .x:hover{color:#b91c1c;background:#fef2f2}',
      '#md-divulgacao-ed .rod{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px;flex-wrap:wrap}',
      '#md-divulgacao-ed button.b{font:inherit;font-size:12.5px;font-weight:600;border-radius:8px;padding:7px 12px;cursor:pointer;border:1px solid #cbd5e1;background:#fff;color:#334155}',
      '#md-divulgacao-ed button.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}',
      '#md-divulgacao-ed .opc{display:flex;gap:16px;align-items:center;margin-bottom:14px;flex-wrap:wrap}#md-divulgacao-ed .opc label{display:flex;gap:6px;align-items:center}',
      '#md-divulgacao-ed .opc select{width:auto}#md-divulgacao-ed .erro{color:#b91c1c;font-size:12px}',
      '@media (max-width:760px){#md-divulgacao-ed .lin{grid-template-columns:1fr}#md-divulgacao-ed .cab{display:none}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- logo
  const empresa = () => window.__mdEmpresaAtiva && window.__mdEmpresaAtiva.id === companyId() ? window.__mdEmpresaAtiva : null;
  let pop = null;

  function fecharPop() { if (pop) { pop.remove(); pop = null; document.removeEventListener('mousedown', foraDoPop, true); } }
  function foraDoPop(e) { if (pop && !pop.contains(e.target) && !e.target.closest('#md-cab-logo')) fecharPop(); }

  // Reduz para no máximo 480×160 px e devolve PNG (ou JPEG, se o PNG ficar grande)
  function prepararImagem(arquivo) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(png|jpeg|webp|svg\+xml|gif)$/.test(arquivo.type)) return reject(new Error('Escolha uma imagem PNG, JPG, WebP ou SVG.'));
      if (arquivo.size > 5 * 1024 * 1024) return reject(new Error('Arquivo acima de 5 MB. Escolha uma imagem menor.'));
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
        img.onload = () => {
          const w0 = img.naturalWidth || 480, h0 = img.naturalHeight || 160;
          const k = Math.min(1, 480 / w0, 160 / h0);
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w0 * k)); cv.height = Math.max(1, Math.round(h0 * k));
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          let url = cv.toDataURL('image/png');
          if (url.length > 380000) {
            const cv2 = document.createElement('canvas'); cv2.width = cv.width; cv2.height = cv.height;
            const c2 = cv2.getContext('2d'); c2.fillStyle = '#fff'; c2.fillRect(0, 0, cv2.width, cv2.height); c2.drawImage(cv, 0, 0);
            url = cv2.toDataURL('image/jpeg', 0.85);
          }
          resolve(url);
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function abrirPop() {
    const e = empresa();
    if (!e || !e.podeLogo) return;
    if (pop) { fecharPop(); return; }
    pop = document.createElement('div');
    pop.id = 'md-cab-logo-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Logo da empresa');
    const desenhar = (msg, tipo) => {
      const at = empresa() || e;
      pop.innerHTML = '<h4>Logo da empresa</h4><p>Aparece no cabeçalho para todos os usuários de <b>' + esc(at.nome) + '</b> e nos PDFs exportados. Prefira PNG com fundo transparente.</p>' +
        '<div class="prev">' + (at.logo ? '<img src="' + esc(at.logo) + '" alt="Logo atual">' : 'Sem logo') + '</div>' +
        '<div class="bts"><button type="button" class="pri" data-a="escolher">' + (at.logo ? 'Trocar imagem' : 'Escolher imagem') + '</button>' +
        (at.logoProprio ? '<button type="button" class="rem" data-a="remover">Remover</button>' : '') +
        '<button type="button" data-a="fechar">Fechar</button></div>' +
        '<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>' +
        (msg ? '<div class="msg ' + (tipo || '') + '" role="status">' + esc(msg) + '</div>' : '');
    };
    desenhar();
    pop.addEventListener('click', async (ev) => {
      const b = ev.target.closest('button[data-a]');
      if (!b) return;
      if (b.dataset.a === 'fechar') return fecharPop();
      if (b.dataset.a === 'escolher') return pop.querySelector('input[type=file]').click();
      if (b.dataset.a === 'remover') {
        if (!window.confirm('Remover o logo da empresa do cabeçalho e dos PDFs?')) return;
        try { await api('PUT', '/api/empresa-ativa/logo', { logo: null }); desenhar('Logo removido.', 'ok'); window.__mdEmpresaAtivaRecarregar && window.__mdEmpresaAtivaRecarregar(); } catch (err) { desenhar(err.message, 'erro'); }
      }
    });
    pop.addEventListener('change', async (ev) => {
      const inp = ev.target; if (!inp.files || !inp.files[0]) return;
      try {
        desenhar('Enviando…');
        const logo = await prepararImagem(inp.files[0]);
        await api('PUT', '/api/empresa-ativa/logo', { logo });
        if (window.__mdEmpresaAtiva) { window.__mdEmpresaAtiva.logo = logo; window.__mdEmpresaAtiva.logoProprio = true; }
        desenhar('Logo atualizado.', 'ok');
        window.__mdEmpresaAtivaRecarregar && window.__mdEmpresaAtivaRecarregar();
        cicloLogo();
      } catch (err) { desenhar(err.message, 'erro'); }
    });
    document.body.appendChild(pop);
    const slot = document.getElementById('md-cab-logo');
    const r = slot.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 310)) + 'px';
    pop.style.top = (r.bottom + 8) + 'px';
    setTimeout(() => document.addEventListener('mousedown', foraDoPop, true), 0);
    const pri = pop.querySelector('button.pri'); if (pri) pri.focus();
  }

  function cicloLogo() {
    const bar = document.getElementById('top-workspace-bar');
    let slot = document.getElementById('md-cab-logo');
    const e = empresa();
    const grupo = bar && document.getElementById('top-company-switcher-select') && document.getElementById('top-company-switcher-select').closest('#top-workspace-bar > div');
    if (!bar || !grupo || !e || (!e.logo && !e.podeLogo)) { if (slot) slot.remove(); if (!e || !bar) fecharPop(); return; }
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'md-cab-logo';
      slot.addEventListener('click', (ev) => { if (ev.target.closest('button')) abrirPop(); });
    }
    const html = e.logo
      ? (e.podeLogo ? '<button type="button" class="lg" title="Logo de ' + esc(e.nome) + ' — clique para trocar" aria-label="Trocar o logo da empresa">' : '<div class="lg" title="' + esc(e.nome) + '">') +
        '<img src="' + esc(e.logo) + '" alt="Logo de ' + esc(e.nome) + '">' + (e.podeLogo ? '</button>' : '</div>')
      : '<button type="button" class="vazio" title="Enviar o logo da empresa">＋ Logo da empresa</button>';
    if (slot._html !== html) { slot._html = html; slot.innerHTML = html; }
    if (grupo.firstElementChild !== slot) grupo.prepend(slot);
  }

  // ---------------------------------------------------------------- divulgação
  let divulg = null, divulgDe = '', divulgBuscando = false, divulgTentar = 0;
  let idx = 0, pausado = false, ultimoGiro = Date.now();
  const FECHADA = 'md_divulgacao_fechada'; // por sessão: volta no próximo acesso

  function buscarDivulgacao() {
    const cid = companyId();
    if (divulgBuscando || Date.now() < divulgTentar) return;
    divulgBuscando = true;
    api('GET', '/api/divulgacao').then((d) => { divulg = d; divulgDe = cid; idx = 0; })
      .catch(() => { divulgTentar = Date.now() + 15000; })
      .finally(() => { divulgBuscando = false; });
  }

  const acaoDisponivel = (m) => {
    if (m.link) return true;
    if (m.acao === 'saude') return Boolean(document.getElementById('menu-btn-saude-empresa'));
    if (m.acao === 'lancamentos') return Boolean(document.getElementById('menu-btn-fin-transacoes'));
    return false;
  };
  function executarAcao(m) {
    if (m.acao === 'saude') { const b = document.getElementById('menu-btn-saude-empresa'); if (b) b.click(); }
    if (m.acao === 'lancamentos') { const b = document.getElementById('menu-btn-fin-transacoes'); if (b) b.click(); }
  }

  function conteudoMsg(m) {
    const acao = acaoDisponivel(m)
      ? (m.link ? '<a class="acao" href="' + esc(m.link) + '" target="_blank" rel="noopener">Conhecer</a>' : '<button type="button" class="acao" data-a="acao">Conhecer</button>')
      : '';
    return '<span class="tit">' + esc(m.titulo || 'MotorDesk') + '</span><span class="txt">' + esc(m.texto) + '</span></span>' + acao;
  }

  function cicloPromo() {
    const bar = document.getElementById('top-workspace-bar');
    let el = document.getElementById('md-cab-promo');
    const cid = companyId();
    if (!bar || !user() || !cid) { if (el) el.remove(); return; }
    if (divulgDe !== cid || (divulg && Date.now() - (divulg._em || 0) > 10 * 60 * 1000)) { if (divulg) divulg._em = Date.now(); buscarDivulgacao(); }
    if (divulg && !divulg._em) divulg._em = Date.now();
    const lista = divulg && divulg.ativo ? (divulg.mensagens || []).filter((m) => m && m.texto) : [];
    let fechada = false; try { fechada = sessionStorage.getItem(FECHADA) === cid; } catch (e) {}
    if (fechada || (!lista.length && !(divulg && divulg.podeEditar))) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'md-cab-promo';
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', 'Novidades do MotorDesk');
      el.addEventListener('mouseenter', () => { pausado = true; });
      el.addEventListener('mouseleave', () => { pausado = false; ultimoGiro = Date.now(); });
      el.addEventListener('focusin', () => { pausado = true; });
      el.addEventListener('focusout', () => { pausado = false; });
      el.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-a]');
        if (!b) return;
        if (b.dataset.a === 'acao') { const l = (divulg.mensagens || []).filter((m) => m && m.texto); executarAcao(l[idx % l.length] || {}); }
        if (b.dataset.a === 'cfg') abrirEditor();
        if (b.dataset.a === 'fechar') { try { sessionStorage.setItem(FECHADA, companyId()); } catch (e) {} el.remove(); }
      });
    }
    if (lista.length && !pausado && Date.now() - ultimoGiro > (divulg.intervaloSeg || 9) * 1000) { ultimoGiro = Date.now(); girar(el, lista); }
    const m = lista.length ? lista[idx % lista.length] : { titulo: 'Divulgação desligada', texto: 'Só você vê esta faixa: clique na engrenagem para ligar.' };
    const html = '<div class="faixa" title="' + esc((m.titulo ? m.titulo + ' — ' : '') + m.texto) + '"><span class="marca">' + MARCA + '<span>MotorDesk</span></span><span class="sep" aria-hidden="true"></span>' +
      '<span class="conteudo">' + conteudoMsg(m) +
      (divulg && divulg.podeEditar ? '<button type="button" class="cfg" data-a="cfg" title="Editar a divulgação do MotorDesk" aria-label="Editar a divulgação do MotorDesk">' + ENGRENAGEM + '</button>' : '') + '</div>' +
      '<button type="button" class="fx" data-a="fechar" title="Ocultar até o próximo acesso" aria-label="Ocultar a divulgação até o próximo acesso">×</button>';
    if (el._html !== html && !el._girando) { el._html = html; el.innerHTML = html; }
    // faixa fina logo abaixo do cabeçalho (no próprio cabeçalho não sobra espaço em telas comuns)
    if (bar.nextElementSibling !== el) bar.after(el);
  }

  function girar(el, lista) {
    if (lista.length < 2) return;
    const c = el.querySelector('.conteudo');
    if (!c || reduzMovimento()) { idx = (idx + 1) % lista.length; return; }
    el._girando = true;
    c.classList.add('saindo');
    setTimeout(() => { idx = (idx + 1) % lista.length; el._girando = false; cicloPromo(); }, 260);
  }

  // Editor (administrador da plataforma)
  function abrirEditor() {
    if (!divulg || !divulg.podeEditar || document.getElementById('md-divulgacao-ed')) return;
    const st = { ativo: divulg.ativo !== false, intervaloSeg: divulg.intervaloSeg || 9, mensagens: (divulg.mensagens || []).map((m) => ({ titulo: m.titulo || '', texto: m.texto || '', link: m.link || '', acao: m.acao || '' })), erro: '' };
    const ed = document.createElement('div');
    ed.id = 'md-divulgacao-ed';
    ed.setAttribute('role', 'dialog');
    ed.setAttribute('aria-modal', 'true');
    ed.setAttribute('aria-label', 'Divulgação do MotorDesk no cabeçalho');
    const desenhar = () => {
      ed.innerHTML = '<div class="cx"><h3>Divulgação do MotorDesk no cabeçalho</h3><p class="sub">Mensagens exibidas para todas as empresas, uma de cada vez. "Conhecer" abre o link ou a tela escolhida (só aparece para quem tem acesso à tela).' + (divulg.personalizada ? '' : ' Estas são as mensagens padrão.') + '</p>' +
        '<div class="opc"><label><input type="checkbox" data-c="ativo"' + (st.ativo ? ' checked' : '') + '> Exibir no cabeçalho</label>' +
        '<label>Trocar a cada <select data-c="intervalo">' + [6, 9, 15, 30].map((n) => '<option value="' + n + '"' + (Number(st.intervaloSeg) === n ? ' selected' : '') + '>' + n + ' s</option>').join('') + '</select></label></div>' +
        '<div class="lin cab"><span>Título</span><span>Texto</span><span>Link (opcional)</span><span>Ou abrir a tela</span><span></span></div>' +
        st.mensagens.map((m, i) => '<div class="lin" data-i="' + i + '"><input data-f="titulo" maxlength="40" value="' + esc(m.titulo) + '" aria-label="Título da mensagem ' + (i + 1) + '"><input data-f="texto" maxlength="160" value="' + esc(m.texto) + '" aria-label="Texto da mensagem ' + (i + 1) + '"><input data-f="link" maxlength="300" placeholder="https://… ou /" value="' + esc(m.link) + '" aria-label="Link da mensagem ' + (i + 1) + '">' +
          '<select data-f="acao" aria-label="Tela da mensagem ' + (i + 1) + '"><option value="">Nenhuma</option><option value="saude"' + (m.acao === 'saude' ? ' selected' : '') + '>Saúde da empresa</option><option value="lancamentos"' + (m.acao === 'lancamentos' ? ' selected' : '') + '>Lançamentos</option></select>' +
          '<button type="button" class="x" data-a="rem" title="Remover mensagem" aria-label="Remover mensagem ' + (i + 1) + '">×</button></div>').join('') +
        (st.erro ? '<p class="erro" role="alert">' + esc(st.erro) + '</p>' : '') +
        '<div class="rod"><div style="display:flex;gap:6px"><button type="button" class="b" data-a="add">＋ Mensagem</button><button type="button" class="b" data-a="padrao">Usar as mensagens padrão</button></div>' +
        '<div style="display:flex;gap:6px"><button type="button" class="b" data-a="cancelar">Cancelar</button><button type="button" class="b pri" data-a="salvar">Salvar</button></div></div></div>';
    };
    const ler = () => {
      st.ativo = ed.querySelector('[data-c=ativo]').checked;
      st.intervaloSeg = Number(ed.querySelector('[data-c=intervalo]').value);
      ed.querySelectorAll('.lin[data-i]').forEach((l) => { const m = st.mensagens[Number(l.dataset.i)]; l.querySelectorAll('[data-f]').forEach((i) => { m[i.dataset.f] = i.value; }); });
    };
    const fechar = () => { ed.remove(); document.removeEventListener('keydown', tecla, true); };
    const tecla = (ev) => { if (ev.key === 'Escape') fechar(); };
    ed.addEventListener('click', async (ev) => {
      if (ev.target === ed) return fechar();
      const b = ev.target.closest('button[data-a]');
      if (!b) return;
      ler();
      const a = b.dataset.a;
      if (a === 'cancelar') return fechar();
      if (a === 'add') { st.mensagens.push({ titulo: '', texto: '', link: '', acao: '' }); desenhar(); const ult = ed.querySelectorAll('.lin[data-i] [data-f=titulo]'); if (ult.length) ult[ult.length - 1].focus(); return; }
      if (a === 'rem') { st.mensagens.splice(Number(b.closest('.lin').dataset.i), 1); desenhar(); return; }
      if (a === 'padrao') { if (!window.confirm('Voltar para as mensagens padrão do MotorDesk?')) return; st.mensagens = []; }
      try {
        b.disabled = true;
        const d = await api('PUT', '/api/divulgacao', { ativo: st.ativo, intervaloSeg: st.intervaloSeg, mensagens: st.mensagens });
        divulg = d; divulgDe = companyId(); idx = 0; ultimoGiro = Date.now();
        fechar(); cicloPromo();
      } catch (err) { st.erro = err.message; desenhar(); }
    });
    desenhar();
    document.body.appendChild(ed);
    document.addEventListener('keydown', tecla, true);
    const p = ed.querySelector('[data-f=titulo]'); if (p) p.focus();
  }

  function ciclo() { if (!document.body) return; estilos(); cicloLogo(); cicloPromo(); }
  window.addEventListener('md-empresa-ativa', ciclo);
  window.addEventListener('motordesk_company_switched', () => { divulgDe = ''; fecharPop(); });
  setInterval(ciclo, 800);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ciclo); else ciclo();
})();
