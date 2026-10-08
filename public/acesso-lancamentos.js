/**
 * MotorDesk - Liberação do módulo Lançamentos no cadastro do usuário
 *
 * Em "Criar Usuários / Níveis" → editar operador, acrescenta logo abaixo de "Permissões de acesso do operador"
 * o bloco "Módulo Lançamentos" com as telas liberadas para aquela pessoa. Cada chave grava na hora
 * (POST /api/financeiro/modulo/usuarios); o servidor confere quem pode alterar e se a empresa contratou.
 * É o mesmo controle da aba Acessos do módulo.
 */
(function () {
  'use strict';

  const TELAS = [
    ['transacoes', 'Painel, Lançamentos e Contas', 'Consultar entradas, saídas e saldos'],
    ['editar', 'Lançar, editar e dar baixa', 'Sem isto, a pessoa só consulta'],
    ['contatos', 'Contatos', 'A receber / a pagar por contato'],
    ['relatorios', 'Relatórios', 'Demonstrativo, extrato e agrupamentos'],
    ['importacoes', 'Importar e conciliação bancária', 'Planilhas, OFX e conciliação'],
  ];
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const companyId = () => { try { const u = JSON.parse(localStorage.getItem('motordesk_active_user') || 'null') || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  async function api(method, path, body) {
    const res = await fetch('/api/financeiro' + path, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || data.success === false) throw new Error((data && data.error) || 'Erro HTTP ' + res.status);
    return data;
  }

  let modulo = null;
  let chaveCarregada = '';
  let carregando = false;
  let aviso = null;
  let editandoId = '';
  // Qual operador foi aberto para edição (o nome de login pode ser alterado no formulário)
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[id]');
    if (!b) return;
    if (b.id.startsWith('btn-edit-user-permissions-')) editandoId = b.id.replace('btn-edit-user-permissions-', '');
    else if (/^btn-add-(user|operator)/.test(b.id) || /Cadastrar Operador/i.test(b.textContent || '')) editandoId = '';
  }, true);

  function estilos() {
    if (document.getElementById('md-acesso-lanc-style')) return;
    const st = document.createElement('style');
    st.id = 'md-acesso-lanc-style';
    st.textContent = [
      '#md-acesso-lanc{background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:18px 20px;margin-top:16px;font-size:13px;color:#0f172a}',
      '#md-acesso-lanc h4{margin:0;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#115e59;display:flex;align-items:center;gap:8px}',
      '#md-acesso-lanc .sub{margin:4px 0 12px;color:#475569;line-height:1.45}',
      '#md-acesso-lanc .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}',
      '#md-acesso-lanc .op{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px}',
      '#md-acesso-lanc .op b{display:block;font-size:13px}#md-acesso-lanc .op span{display:block;font-size:11.5px;color:#64748b}',
      '#md-acesso-lanc .sw{width:40px;height:22px;border-radius:999px;background:#cbd5e1;border:0;position:relative;cursor:pointer;flex-shrink:0}',
      '#md-acesso-lanc .sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:999px;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)}',
      '#md-acesso-lanc .sw[aria-checked=true]{background:#0f766e}#md-acesso-lanc .sw[aria-checked=true]::after{left:21px}#md-acesso-lanc .sw:disabled{opacity:.5;cursor:default}',
      '#md-acesso-lanc .rod{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}',
      '#md-acesso-lanc .lnk{border:1px solid #0f766e;color:#0f766e;background:#fff;border-radius:8px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}',
      '#md-acesso-lanc .ok{color:#047857;font-weight:600}#md-acesso-lanc .bad{color:#be123c;font-weight:600}#md-acesso-lanc .warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 10px;margin-bottom:10px}',
    ].join('\n');
    document.head.appendChild(st);
  }

  function localDoBloco() {
    const form = document.getElementById('form-user');
    if (!form) return null;
    const titulo = [...form.querySelectorAll('div')].find((e) => e.children.length <= 2 && /^PERMISSÕES DE ACESSO DO OPERADOR$/i.test((e.innerText || '').trim()));
    const cartao = titulo && titulo.parentElement;
    return cartao ? { form, cartao } : null;
  }

  function render(bloco, username) {
    const m = modulo;
    let h = '<h4><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.2 0 1.2-1.3 2.2-3 2.2-1.5 0-2.7-.6-3.2-1.6"/></svg>Módulo Lançamentos (financeiro)</h4>';
    if (!m) return h + '<p class="sub">Carregando…</p>';
    if (m.erro) return h + '<p class="sub bad">' + esc(m.erro) + '</p>';
    if (!m.gerenciaUsuarios) return h + '<p class="sub">Só quem gerencia usuários pode liberar as telas deste módulo.</p>';
    const u = (m.usuarios || []).find((x) => (editandoId ? x.id === editandoId : String(x.username).toLowerCase() === String(username).toLowerCase()));
    h += '<p class="sub">Telas do módulo Lançamentos (Financeiro &amp; Fiscal → Lançamentos) que este usuário pode usar. Cada chave grava na hora.</p>';
    if (!m.contratado) h += '<div class="warn">A empresa ainda não contratou o módulo Lançamentos: as liberações só valem depois da contratação' + (m.gerenciaContrato ? ' (marque em Lançamentos → Acessos).' : '.') + '</div>';
    if (!u) return h + '<p class="sub"><b>Salve o operador primeiro</b>; depois abra a edição dele de novo para liberar o módulo.</p>';
    h += '<div class="grade">' + TELAS.map(([k, rot, dica]) => {
      const v = k === 'editar' ? u.editar : u.telas[k];
      return '<div class="op"><div><b>' + rot + '</b><span>' + dica + '</span></div><button type="button" class="sw" role="switch" aria-checked="' + Boolean(v) + '" data-tela="' + k + '" data-user="' + esc(u.id) + '" aria-label="' + esc(rot + ' para ' + u.nome) + '"></button></div>';
    }).join('') + '</div>';
    h += '<div class="rod">' + (aviso ? '<span class="' + (aviso.ok ? 'ok' : 'bad') + '">' + esc(aviso.texto) + '</span>' : '') + '<span style="flex:1"></span>' +
      (window.MotorDeskOpenTransacoes ? '<button type="button" class="lnk" data-abrir-acessos>Ver todos em Lançamentos → Acessos</button>' : '') + '</div>';
    if (u.role === 'admin') h += '<p class="sub" style="margin:8px 0 0">Administrador da empresa: recebe tudo por padrão; desmarque para restringir.</p>';
    return h;
  }

  async function carregar(chave) {
    if (carregando) return;
    carregando = true;
    try { modulo = await api('GET', '/modulo'); }
    catch (e) { modulo = { erro: e.message }; }
    chaveCarregada = chave;
    carregando = false;
  }

  // Só redesenha quando o conteúdo muda (comparando com o último HTML gerado, não com o lido do navegador)
  function desenhar(bloco, html) { if (bloco._mdHtml === html) return; bloco._mdHtml = html; bloco.innerHTML = html; }

  function ciclo() {
    const local = localDoBloco();
    const existente = document.getElementById('md-acesso-lanc');
    if (!local) { if (existente) existente.remove(); chaveCarregada = ''; aviso = null; return; }
    estilos();
    const userInput = document.getElementById('user-username-input');
    const username = userInput ? userInput.value.trim() : '';
    const chave = companyId() + '|' + (editandoId || username);
    let bloco = existente;
    if (!bloco) {
      bloco = document.createElement('section');
      bloco.id = 'md-acesso-lanc';
      bloco.setAttribute('aria-label', 'Liberação do módulo Lançamentos');
      bloco.addEventListener('click', onClick);
    }
    if (bloco.previousElementSibling !== local.cartao) local.cartao.after(bloco);
    if (chave !== chaveCarregada && !carregando) { modulo = null; aviso = null; carregar(chave).then(() => desenhar(bloco, render(bloco, username))); }
    desenhar(bloco, render(bloco, username));
  }

  async function onClick(e) {
    if (e.target.closest('[data-abrir-acessos]')) { e.preventDefault(); window.MotorDeskOpenTransacoes('acessos'); return; }
    const sw = e.target.closest('button.sw[data-tela]');
    if (!sw) return;
    e.preventDefault();
    const u = modulo && (modulo.usuarios || []).find((x) => x.id === sw.dataset.user);
    if (!u) return;
    const tela = sw.dataset.tela;
    const corpo = { userId: u.id };
    if (tela === 'editar') corpo.editar = !u.editar; else corpo.telas = { [tela]: !u.telas[tela] };
    sw.disabled = true;
    try {
      await api('POST', '/modulo/usuarios', corpo);
      if (tela === 'editar') u.editar = !u.editar; else u.telas[tela] = !u.telas[tela];
      aviso = { ok: true, texto: 'Liberação salva.' };
      modulo = await api('GET', '/modulo').catch(() => modulo);
    } catch (err) { aviso = { ok: false, texto: err.message }; }
    const bloco = document.getElementById('md-acesso-lanc');
    if (bloco) { const ui = document.getElementById('user-username-input'); desenhar(bloco, render(bloco, ui ? ui.value.trim() : '')); }
  }

  setInterval(ciclo, 700);
})();
