/**
 * MotorDesk - Liberação das telas extras no cadastro do usuário
 *
 * Em "Criar Usuários / Níveis" → editar operador, logo abaixo de "Permissões de acesso do operador",
 * mostra as telas que não estão no catálogo de permissões do cadastro: módulo Lançamentos (Painel,
 * lançar/dar baixa, Contatos, Relatórios, Importar e conciliação), Backup da empresa e Conexões & Módulos.
 * Cada chave grava na hora (POST /api/acessos/telas-extras). O servidor confere quem pode alterar e
 * não deixa liberar o que o próprio usuário não tem nem alterar as próprias liberações.
 */
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usuarioAtivo = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null') || {}; } catch (e) { return {}; } };
  const companyId = () => { try { return localStorage.getItem('motordesk_active_company_id') || usuarioAtivo().companyId || ''; } catch (e) { return ''; } };
  async function api(method, body) {
    const res = await fetch('/api/acessos/telas-extras', { method, headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || data.success === false) throw new Error((data && data.error) || 'Erro HTTP ' + res.status);
    return data;
  }

  let dados = null;
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
      '#md-acesso-lanc h4{margin:0;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#115e59}',
      '#md-acesso-lanc h5{margin:14px 0 6px;font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.04em}',
      '#md-acesso-lanc .sub{margin:4px 0 4px;color:#475569;line-height:1.45}',
      '#md-acesso-lanc .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}',
      '#md-acesso-lanc .op{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px}',
      '#md-acesso-lanc .op b{display:block;font-size:13px}#md-acesso-lanc .op span{display:block;font-size:11.5px;color:#64748b}#md-acesso-lanc .op .nao{color:#b45309}',
      '#md-acesso-lanc .sw{width:40px;height:22px;border-radius:999px;background:#cbd5e1;border:0;position:relative;cursor:pointer;flex-shrink:0}',
      '#md-acesso-lanc .sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:999px;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)}',
      '#md-acesso-lanc .sw[aria-checked=true]{background:#0f766e}#md-acesso-lanc .sw[aria-checked=true]::after{left:21px}#md-acesso-lanc .sw:disabled{opacity:.45;cursor:not-allowed}',
      '#md-acesso-lanc .rod{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}',
      '#md-acesso-lanc .lnk{border:1px solid #0f766e;color:#0f766e;background:#fff;border-radius:8px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}',
      '#md-acesso-lanc .ok{color:#047857;font-weight:600}#md-acesso-lanc .bad{color:#be123c;font-weight:600}#md-acesso-lanc .warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:8px 10px;margin:8px 0}',
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

  function render(username) {
    const d = dados;
    let h = '<h4>Outras telas do sistema</h4>';
    if (!d) return h + '<p class="sub">Carregando…</p>';
    if (d.erro) return h + '<p class="sub bad">' + esc(d.erro) + '</p>';
    const u = (d.usuarios || []).find((x) => (editandoId ? x.id === editandoId : String(x.username).toLowerCase() === String(username).toLowerCase()));
    h += '<p class="sub">Telas que não aparecem na lista acima. Cada chave grava na hora. Você só consegue liberar o que o seu próprio usuário também tem.</p>';
    if (!u) {
      const eu = usuarioAtivo();
      if (editandoId && eu && eu.id === editandoId) return h + '<div class="warn">Este é o seu próprio usuário: as suas liberações são alteradas por outro administrador.</div>';
      return h + '<div class="warn"><b>Salve o operador primeiro</b>; depois abra a edição dele de novo para liberar estas telas.</div>';
    }
    if (!d.lancamentosContratado) h += '<div class="warn">A empresa não contratou o módulo Lançamentos: essas liberações só valem depois da contratação (Financeiro &amp; Fiscal → Lançamentos → Acessos).</div>';
    const grupos = [];
    for (const t of d.telas) { let g = grupos.find((x) => x.nome === t.grupo); if (!g) { g = { nome: t.grupo, itens: [] }; grupos.push(g); } g.itens.push(t); }
    for (const g of grupos) {
      h += '<h5>' + esc(g.nome) + '</h5><div class="grade">' + g.itens.map((t) => {
        const v = Boolean(u.valores[t.chave]);
        const pode = d.podeConceder[t.chave] || v; // pode sempre retirar; liberar exige ter o acesso
        return '<div class="op"><div><b>' + esc(t.rotulo) + '</b><span>' + esc(t.dica) + '</span>' + (!d.podeConceder[t.chave] ? '<span class="nao">Seu usuário não tem este acesso: não pode liberar.</span>' : '') + '</div>' +
          '<button type="button" class="sw" role="switch" aria-checked="' + v + '" data-chave="' + esc(t.chave) + '" data-user="' + esc(u.id) + '"' + (pode ? '' : ' disabled') + ' aria-label="' + esc(t.rotulo + ' para ' + u.nome) + '"></button></div>';
      }).join('') + '</div>';
    }
    h += '<div class="rod">' + (aviso ? '<span class="' + (aviso.ok ? 'ok' : 'bad') + '">' + esc(aviso.texto) + '</span>' : '') + '<span style="flex:1"></span>' +
      (window.MotorDeskOpenTransacoes ? '<button type="button" class="lnk" data-abrir-acessos>Ver todos em Lançamentos → Acessos</button>' : '') + '</div>';
    if (u.role === 'admin') h += '<p class="sub" style="margin-top:8px">Administrador da empresa: recebe estas telas por padrão; desmarque para restringir.</p>';
    return h;
  }

  function desenhar(bloco, html) { if (bloco._mdHtml === html) return; bloco._mdHtml = html; bloco.innerHTML = html; }

  async function carregar(chave) {
    if (carregando) return;
    carregando = true;
    try { dados = await api('GET'); } catch (e) { dados = { erro: e.message }; }
    chaveCarregada = chave;
    carregando = false;
  }

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
      bloco.setAttribute('aria-label', 'Liberação de outras telas do sistema');
      bloco.addEventListener('click', onClick);
    }
    if (bloco.previousElementSibling !== local.cartao) local.cartao.after(bloco);
    if (chave !== chaveCarregada && !carregando) { dados = null; aviso = null; carregar(chave).then(() => desenhar(bloco, render(username))); }
    desenhar(bloco, render(username));
  }

  async function onClick(e) {
    if (e.target.closest('[data-abrir-acessos]')) { e.preventDefault(); window.MotorDeskOpenTransacoes('acessos'); return; }
    const sw = e.target.closest('button.sw[data-chave]');
    if (!sw || sw.disabled) return;
    e.preventDefault();
    const u = dados && (dados.usuarios || []).find((x) => x.id === sw.dataset.user);
    if (!u) return;
    const chave = sw.dataset.chave;
    sw.disabled = true;
    try {
      await api('POST', { userId: u.id, permissoes: { [chave]: !u.valores[chave] } });
      aviso = { ok: true, texto: 'Liberação salva.' };
      dados = await api('GET').catch(() => dados);
    } catch (err) { aviso = { ok: false, texto: err.message }; }
    const bloco = document.getElementById('md-acesso-lanc');
    const ui = document.getElementById('user-username-input');
    if (bloco) desenhar(bloco, render(ui ? ui.value.trim() : ''));
  }

  setInterval(ciclo, 700);
})();
