/**
 * MotorDesk - Integrações e API
 *
 * Item "Integrações e API" no menu lateral (administradores) com duas abas:
 *  - API do MotorDesk: endereço da API v1, documentação dos endpoints, chaves de API da empresa
 *    (criar, revogar; a chave completa aparece uma única vez) e dados para o add-in SolidWorks.
 *  - Sistemas externos: cadastro da URL e da credencial da API de outros sistemas (ERP,
 *    contabilidade, e-commerce...), com teste de conexão feito pelo servidor.
 * Todas as regras (quem pode, qual empresa) são conferidas no servidor.
 */
(function () {
  'use strict';

  const KIND_LABELS = { erp: 'ERP', contabilidade: 'Contabilidade', ecommerce: 'E-commerce', crm: 'CRM', banco: 'Banco', marketplace: 'Marketplace', cad: 'CAD / Engenharia', outro: 'Outro' };
  const AUTH_LABELS = { bearer: 'Token (Authorization: Bearer)', header: 'Chave em cabeçalho próprio', basic: 'Usuário e senha (Basic)', none: 'Sem autenticação' };
  const SCOPE_LABELS = { read: 'Leitura', write: 'Gravação', solidworks: 'SolidWorks' };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(ms) {
    return ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  }
  function activeUser() {
    try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; }
  }
  function activeCompanyId() {
    try {
      const u = activeUser() || {};
      return localStorage.getItem('motordesk_active_company_id') || u.companyId || '';
    } catch (e) { return ''; }
  }
  function canManage(u) {
    if (!u) return false;
    const name = String(u.username || '').toLowerCase();
    if (name === 'admin' || name === 'validador' || u.role === 'qa' || u.role === 'admin') return true;
    const p = Object.assign({}, u.permissions || {}, u.individualExceptions || {}, u.customPermissions || {});
    return p.accessUserManagement === true;
  }

  async function api(method, path, body) {
    const res = await fetch(path, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'X-Company-Id': activeCompanyId() },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || (data && data.success === false)) throw new Error((data && data.error) || ('Erro HTTP ' + res.status));
    return data;
  }

  // ---------------------------------------------------------------------------
  // Estilos (escopo #md-int)
  // ---------------------------------------------------------------------------
  function ensureStyles() {
    if (document.getElementById('md-int-style')) return;
    const st = document.createElement('style');
    st.id = 'md-int-style';
    st.textContent = [
      '#md-int{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}',
      '#md-int .p{background:#fff;width:100%;max-width:980px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden}',
      '#md-int .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid #e2e8f0}',
      '#md-int h2{margin:0;font-size:18px;font-weight:700}',
      '#md-int .sub{margin:2px 0 0;font-size:13px;color:#64748b}',
      '#md-int .x{border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer;color:#334155}',
      '#md-int .tabs{display:flex;gap:4px;padding:0 20px;border-bottom:1px solid #e2e8f0;background:#f8fafc}',
      '#md-int .tab{border:0;background:none;padding:12px 14px;font-size:14px;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent}',
      '#md-int .tab[aria-selected=true]{color:#4338ca;border-bottom-color:#4338ca}',
      '#md-int .bd{padding:18px 20px;overflow:auto}',
      '#md-int section{margin-bottom:22px}',
      '#md-int h3{font-size:15px;margin:0 0 8px;font-weight:700}',
      '#md-int p.t{font-size:13px;color:#475569;margin:0 0 10px;line-height:1.5}',
      '#md-int code,#md-int .mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12.5px}',
      '#md-int .box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;background:#f8fafc}',
      '#md-int .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
      '#md-int .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}',
      '#md-int label.f{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:#334155}',
      '#md-int input[type=text],#md-int input[type=url],#md-int input[type=password],#md-int select,#md-int textarea{font:inherit;font-size:14px;font-weight:400;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a;min-width:0}',
      '#md-int .btn{border:0;border-radius:8px;padding:8px 14px;font-size:13.5px;font-weight:600;cursor:pointer;background:#4f46e5;color:#fff}',
      '#md-int .btn.s{background:#e2e8f0;color:#1e293b}',
      '#md-int .btn.d{background:#fee2e2;color:#b91c1c}',
      '#md-int .btn:disabled{opacity:.6;cursor:default}',
      '#md-int .tw{overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px}',
      '#md-int table{border-collapse:collapse;width:100%;font-size:13px}',
      '#md-int th,#md-int td{text-align:left;padding:8px 10px;border-bottom:1px solid #eef2f7;vertical-align:top}',
      '#md-int th{background:#f8fafc;font-size:12px;color:#475569;font-weight:600}',
      '#md-int .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:600;background:#e0e7ff;color:#3730a3;margin:0 4px 2px 0}',
      '#md-int .pill.off{background:#f1f5f9;color:#64748b}',
      '#md-int .ok{color:#047857}#md-int .bad{color:#b91c1c}',
      '#md-int .msg{font-size:13px;margin-top:8px}',
      '#md-int .newkey{border:1px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:12px 14px;margin-top:12px}',
      '#md-int .card{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:10px}',
      '#md-int .muted{color:#64748b;font-size:12.5px}',
      '#menu-btn-integracoes{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:0;background:none;color:#cbd5e1;font-size:12px;font-weight:600;letter-spacing:.02em;cursor:pointer;text-align:left}',
      '#menu-btn-integracoes:hover{background:#1e293b;color:#fff}',
      '#menu-btn-integracoes svg{width:16px;height:16px;flex-shrink:0;color:#818cf8}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------------------
  // Painel
  // ---------------------------------------------------------------------------
  let root = null;
  let tab = 'api';
  let docs = null;
  let editing = null;

  function open() {
    ensureStyles();
    if (root) root.remove();
    root = document.createElement('div');
    root.id = 'md-int';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Integrações e API');
    root.innerHTML =
      '<div class="p">' +
      '<div class="hd"><div><h2>Integrações e API</h2><p class="sub">Conecte o MotorDesk a outros sistemas da empresa.</p></div>' +
      '<button type="button" class="x" data-act="close" aria-label="Fechar">×</button></div>' +
      '<div class="tabs" role="tablist">' +
      '<button type="button" class="tab" role="tab" data-tab="api">API do MotorDesk</button>' +
      '<button type="button" class="tab" role="tab" data-tab="ext">Sistemas externos</button>' +
      '</div><div class="bd" data-body></div></div>';
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    render();
  }
  function close() {
    if (root) root.remove();
    root = null;
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function body() { return root && root.querySelector('[data-body]'); }

  function render() {
    if (!root) return;
    root.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
    if (tab === 'api') renderApi(); else renderExternal();
  }

  async function renderApi() {
    const b = body();
    const base = window.location.origin + '/api/v1';
    b.innerHTML =
      '<section><h3>Endereço da API</h3>' +
      '<p class="t">Sistemas externos consultam e enviam dados do MotorDesk por esta API, sempre com uma chave da empresa no cabeçalho <code>Authorization: Bearer mdk_...</code>. Cada chave só acessa os dados desta empresa e os módulos contratados.</p>' +
      '<div class="box row"><span class="mono" style="flex:1;min-width:0;word-break:break-all">' + esc(base) + '</span>' +
      '<button type="button" class="btn s" data-act="copy" data-value="' + esc(base) + '">Copiar</button></div></section>' +
      '<section><h3>Chaves de API</h3><div data-keys><p class="t">Carregando…</p></div>' +
      '<div class="box" style="margin-top:12px"><div class="grid">' +
      '<label class="f">Nome da chave<input type="text" data-k="name" maxlength="80" placeholder="Ex.: ERP da contabilidade"></label>' +
      '<div class="f" style="font-size:12.5px;font-weight:600;color:#334155">Permissões<div class="row" style="font-weight:400;margin-top:6px">' +
      '<label><input type="checkbox" data-k="read" checked> Leitura</label>' +
      '<label><input type="checkbox" data-k="write"> Gravação (clientes, veículos, peças)</label>' +
      '<label><input type="checkbox" data-k="solidworks"> SolidWorks</label></div></div></div>' +
      '<div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="create-key">Gerar chave</button><span class="msg" data-keymsg></span></div>' +
      '<div data-newkey></div></div></section>' +
      '<section><h3>Add-in SolidWorks</h3><p class="t">No add-in, use uma chave com a permissão <b>SolidWorks</b> e o endereço:</p>' +
      '<div class="box row"><span class="mono" style="flex:1;min-width:0;word-break:break-all">' + esc(window.location.origin + '/api/integrations/solidworks/sync-project') + '</span>' +
      '<button type="button" class="btn s" data-act="copy" data-value="' + esc(window.location.origin + '/api/integrations/solidworks/sync-project') + '">Copiar</button></div></section>' +
      '<section><h3>Endpoints disponíveis</h3><div data-docs><p class="t">Carregando…</p></div></section>';
    loadKeys();
    loadDocs();
  }

  async function loadDocs() {
    const el = body() && body().querySelector('[data-docs]');
    if (!el) return;
    try {
      if (!docs) docs = await (await fetch('/api/v1', { cache: 'no-store' })).json();
      el.innerHTML =
        '<p class="t">Limite: ' + esc(docs.rateLimit) + '. Listas aceitam <code>limit</code>, <code>offset</code> e <code>updatedSince</code>. Exemplo: <code class="mono">curl -H "Authorization: Bearer mdk_..." ' + esc(docs.baseUrl) + '/clients</code></p>' +
        '<div class="tw"><table><thead><tr><th>Método</th><th>Caminho</th><th>Permissão</th><th>Descrição</th></tr></thead><tbody>' +
        docs.endpoints.map(function (e) {
          return '<tr><td class="mono">' + esc(e.method) + '</td><td class="mono">' + esc(e.path) + '</td><td>' + esc(SCOPE_LABELS[e.scope] || e.scope) + '</td><td>' + esc(e.description) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } catch (err) {
      el.innerHTML = '<p class="t bad">Não foi possível carregar a documentação.</p>';
    }
  }

  async function loadKeys() {
    const el = body() && body().querySelector('[data-keys]');
    if (!el) return;
    try {
      const data = await api('GET', '/api/integrations/api-keys');
      if (!data.keys.length) { el.innerHTML = '<p class="t">Nenhuma chave criada ainda.</p>'; return; }
      el.innerHTML = '<div class="tw"><table><thead><tr><th>Nome</th><th>Início da chave</th><th>Permissões</th><th>Criada</th><th>Último uso</th><th></th></tr></thead><tbody>' +
        data.keys.map(function (k) {
          const revoked = Boolean(k.revokedAt);
          return '<tr><td>' + esc(k.name) + '<div class="muted">por ' + esc(k.createdBy || '—') + '</div></td>' +
            '<td class="mono">' + esc(k.prefix) + '…</td>' +
            '<td>' + (k.scopes || []).map(function (s) { return '<span class="pill' + (revoked ? ' off' : '') + '">' + esc(SCOPE_LABELS[s] || s) + '</span>'; }).join('') + '</td>' +
            '<td>' + esc(fmtDate(k.createdAt)) + '</td><td>' + esc(fmtDate(k.lastUsedAt)) + '</td>' +
            '<td>' + (revoked ? '<span class="muted">Revogada em ' + esc(fmtDate(k.revokedAt)) + '</span>'
              : '<button type="button" class="btn d" data-act="revoke" data-id="' + esc(k.id) + '">Revogar</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } catch (err) {
      el.innerHTML = '<p class="t bad">' + esc(err.message) + '</p>';
    }
  }

  async function renderExternal() {
    const b = body();
    b.innerHTML =
      '<section><h3>Sistemas conectados</h3><p class="t">Cadastre a API de outros sistemas que o MotorDesk deve acessar. A credencial fica cifrada no servidor e nunca é exibida de novo, só os últimos 4 caracteres.</p>' +
      '<div data-list><p class="t">Carregando…</p></div></section>' +
      '<section><h3 data-formtitle>Adicionar sistema externo</h3><div class="box" data-form></div></section>';
    renderForm();
    loadExternal();
  }

  function renderForm() {
    const f = body() && body().querySelector('[data-form]');
    if (!f) return;
    const e = editing || { kind: 'erp', authType: 'bearer', enabled: true };
    body().querySelector('[data-formtitle]').textContent = editing ? 'Editar ' + editing.name : 'Adicionar sistema externo';
    f.innerHTML =
      '<div class="grid">' +
      '<label class="f">Nome do sistema<input type="text" data-e="name" maxlength="80" value="' + esc(e.name) + '" placeholder="Ex.: ERP Bling"></label>' +
      '<label class="f">Tipo<select data-e="kind">' + Object.keys(KIND_LABELS).map(function (k) { return '<option value="' + k + '"' + (e.kind === k ? ' selected' : '') + '>' + esc(KIND_LABELS[k]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" style="grid-column:1/-1">URL da API (https://)<input type="url" data-e="baseUrl" value="' + esc(e.baseUrl) + '" placeholder="https://api.sistema-externo.com.br/v1"></label>' +
      '<label class="f">Autenticação<select data-e="authType">' + Object.keys(AUTH_LABELS).map(function (k) { return '<option value="' + k + '"' + (e.authType === k ? ' selected' : '') + '>' + esc(AUTH_LABELS[k]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" data-show="header"' + (e.authType === 'header' ? '' : ' hidden') + '>Nome do cabeçalho<input type="text" data-e="authHeader" value="' + esc(e.authHeader || 'X-API-Key') + '"></label>' +
      '<label class="f" data-show="basic"' + (e.authType === 'basic' ? '' : ' hidden') + '>Usuário<input type="text" data-e="username" value="' + esc(e.username) + '"></label>' +
      '<label class="f" data-show="secret"' + (e.authType === 'none' ? ' hidden' : '') + '>' + (e.authType === 'basic' ? 'Senha' : 'Chave / token da API') +
      '<input type="password" data-e="secret" autocomplete="new-password" placeholder="' + (editing && editing.hasSecret ? 'Guardada (' + esc(editing.secretHint) + '). Deixe em branco para manter' : 'Cole aqui a chave fornecida pelo sistema') + '"></label>' +
      '<label class="f" style="grid-column:1/-1">Observações<textarea data-e="notes" rows="2" maxlength="500">' + esc(e.notes) + '</textarea></label>' +
      '</div><div class="row" style="margin-top:10px"><label><input type="checkbox" data-e="enabled"' + (e.enabled !== false ? ' checked' : '') + '> Ativa</label>' +
      '<span style="flex:1"></span>' + (editing ? '<button type="button" class="btn s" data-act="cancel-edit">Cancelar</button>' : '') +
      '<button type="button" class="btn" data-act="save-ext">' + (editing ? 'Salvar alterações' : 'Adicionar') + '</button></div><div class="msg" data-extmsg></div>';
  }

  async function loadExternal() {
    const el = body() && body().querySelector('[data-list]');
    if (!el) return;
    try {
      const data = await api('GET', '/api/integrations/external');
      if (!data.integrations.length) { el.innerHTML = '<p class="t">Nenhum sistema externo cadastrado.</p>'; return; }
      el.innerHTML = data.integrations.map(function (i) {
        return '<div class="card"><div class="row"><b style="font-size:14px">' + esc(i.name) + '</b>' +
          '<span class="pill">' + esc(KIND_LABELS[i.kind] || i.kind) + '</span>' +
          (i.enabled ? '' : '<span class="pill off">Inativa</span>') + '<span style="flex:1"></span>' +
          '<button type="button" class="btn s" data-act="test" data-id="' + esc(i.id) + '">Testar conexão</button>' +
          '<button type="button" class="btn s" data-act="edit" data-id="' + esc(i.id) + '">Editar</button>' +
          '<button type="button" class="btn d" data-act="delete-ext" data-id="' + esc(i.id) + '">Excluir</button></div>' +
          '<div class="mono" style="margin-top:6px;word-break:break-all">' + esc(i.baseUrl) + '</div>' +
          '<div class="muted" style="margin-top:4px">' + esc(AUTH_LABELS[i.authType] || i.authType) + (i.hasSecret ? ' · credencial ' + esc(i.secretHint) : '') + '</div>' +
          '<div class="muted" data-teststatus="' + esc(i.id) + '">' + (i.lastTestAt ? 'Último teste (' + esc(fmtDate(i.lastTestAt)) + '): ' + esc(i.lastTestStatus) : 'Ainda não testada.') + '</div>' +
          (i.notes ? '<div class="muted" style="margin-top:4px">' + esc(i.notes) + '</div>' : '') + '</div>';
      }).join('');
      el._items = data.integrations;
    } catch (err) {
      el.innerHTML = '<p class="t bad">' + esc(err.message) + '</p>';
    }
  }

  function setMsg(sel, text, ok) {
    const el = body() && body().querySelector(sel);
    if (el) { el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'bad'); }
  }

  async function onClick(e) {
    const t = e.target.closest('[data-act],[data-tab]');
    if (!t) { if (e.target === root) close(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; editing = null; render(); return; }
    const act = t.dataset.act;
    if (act === 'close') return close();
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(t.dataset.value); t.textContent = 'Copiado'; } catch (err) { t.textContent = 'Selecione e copie'; }
      setTimeout(function () { t.textContent = 'Copiar'; }, 1800);
      return;
    }
    if (act === 'create-key') {
      const b = body();
      const name = b.querySelector('[data-k=name]').value.trim();
      const scopes = ['read', 'write', 'solidworks'].filter(function (s) { return b.querySelector('[data-k=' + s + ']').checked; });
      t.disabled = true;
      try {
        const data = await api('POST', '/api/integrations/api-keys', { name: name, scopes: scopes });
        b.querySelector('[data-k=name]').value = '';
        setMsg('[data-keymsg]', '', true);
        b.querySelector('[data-newkey]').innerHTML =
          '<div class="newkey"><b>Copie a chave agora: ela não será mostrada de novo.</b>' +
          '<div class="row" style="margin-top:8px"><input type="text" readonly class="mono" style="flex:1;min-width:0" value="' + esc(data.key) + '">' +
          '<button type="button" class="btn" data-act="copy" data-value="' + esc(data.key) + '">Copiar</button></div></div>';
        loadKeys();
      } catch (err) {
        setMsg('[data-keymsg]', err.message, false);
      } finally { t.disabled = false; }
      return;
    }
    if (act === 'revoke') {
      if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'Confirmar revogação'; return; }
      t.disabled = true;
      try { await api('DELETE', '/api/integrations/api-keys/' + encodeURIComponent(t.dataset.id)); loadKeys(); }
      catch (err) { t.disabled = false; t.textContent = err.message; }
      return;
    }
    if (act === 'save-ext') {
      const b = body();
      const v = function (k) { const el = b.querySelector('[data-e=' + k + ']'); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; };
      const payload = { id: editing && editing.id, name: v('name'), kind: v('kind'), baseUrl: v('baseUrl'), authType: v('authType'), authHeader: v('authHeader'), username: v('username'), secret: v('secret'), notes: v('notes'), enabled: v('enabled') };
      t.disabled = true;
      try {
        await api('POST', '/api/integrations/external', payload);
        editing = null;
        renderForm();
        setMsg('[data-extmsg]', 'Salvo.', true);
        loadExternal();
      } catch (err) {
        setMsg('[data-extmsg]', err.message, false);
      } finally { t.disabled = false; }
      return;
    }
    if (act === 'cancel-edit') { editing = null; renderForm(); return; }
    if (act === 'edit') {
      const list = body().querySelector('[data-list]')._items || [];
      editing = list.find(function (i) { return i.id === t.dataset.id; }) || null;
      renderForm();
      body().querySelector('[data-form]').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (act === 'delete-ext') {
      if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'Confirmar exclusão'; return; }
      t.disabled = true;
      try { await api('DELETE', '/api/integrations/external/' + encodeURIComponent(t.dataset.id)); if (editing && editing.id === t.dataset.id) { editing = null; renderForm(); } loadExternal(); }
      catch (err) { t.disabled = false; t.textContent = err.message; }
      return;
    }
    if (act === 'test') {
      const out = body().querySelector('[data-teststatus="' + t.dataset.id + '"]');
      t.disabled = true;
      if (out) { out.textContent = 'Testando…'; out.className = 'muted'; }
      try {
        const data = await api('POST', '/api/integrations/external/' + encodeURIComponent(t.dataset.id) + '/test');
        if (out) { out.textContent = data.status; out.className = data.ok ? 'ok' : 'bad'; }
      } catch (err) {
        if (out) { out.textContent = err.message; out.className = 'bad'; }
      } finally { t.disabled = false; }
    }
  }

  function onChange(e) {
    if (e.target.matches('[data-e=authType]')) {
      const type = e.target.value;
      const b = body();
      b.querySelector('[data-show=header]').hidden = type !== 'header';
      b.querySelector('[data-show=basic]').hidden = type !== 'basic';
      const secret = b.querySelector('[data-show=secret]');
      secret.hidden = type === 'none';
      secret.firstChild.textContent = type === 'basic' ? 'Senha' : 'Chave / token da API';
    }
  }

  // ---------------------------------------------------------------------------
  // Item no menu lateral
  // ---------------------------------------------------------------------------
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7H6a4 4 0 0 0 0 8h3"/><path d="M15 7h3a4 4 0 0 1 0 8h-3"/><line x1="8" y1="11" x2="16" y2="11"/></svg>';

  function injectMenu() {
    const nav = document.querySelector('#sidebar-container nav');
    const existing = document.getElementById('menu-btn-integracoes');
    const user = activeUser();
    if (!nav || !canManage(user)) { if (existing) existing.remove(); return; }
    ensureStyles();
    const sidebar = document.getElementById('sidebar-container');
    const collapsed = sidebar && sidebar.offsetWidth < 100;
    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'menu-btn-integracoes';
      btn.title = 'Integrações e API';
      btn.addEventListener('click', open);
    }
    const html = ICON + (collapsed ? '' : '<span>Integrações e API</span>');
    if (btn.innerHTML !== html) btn.innerHTML = html;
    btn.style.justifyContent = collapsed ? 'center' : '';
    if (btn.parentElement !== nav || nav.lastElementChild !== btn) nav.appendChild(btn);
  }

  setInterval(injectMenu, 1000);
  window.MotorDeskOpenIntegrations = open;
})();
