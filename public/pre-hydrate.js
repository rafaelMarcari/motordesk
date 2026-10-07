/**
 * MotorDesk - Direct Database Connector & Asynchronous Bootstrap
 * 
 * Executa antes de qualquer renderização para conectar DIRETAMENTE ao banco
 * oficial do servidor (Cloud SQL / app_store.json) em qualquer navegador
 * (Firefox, Chrome, Opera, Edge, Safari, Dispositivos Móveis), sem depender
 * de storage local como fonte de verdade e SEM chamadas síncronas bloqueantes
 * (que quebram no Firefox).
 */
(function() {
  'use strict';

  // A lista de empresas vem exclusivamente do banco (Neon) — preenchida pela busca abaixo.
  // Uma lista fixa aqui faria a tela de login exibir empresas inexistentes ou desatualizadas.
  window.__allCompanies = [];

  // ---------------------------------------------------------------------------
  // SESSÃO EMITIDA PELO SERVIDOR
  // O token (mds_...) é criado em POST /api/auth/login. Todas as chamadas /api
  // da própria origem passam a enviá-lo; sessão expirada/revogada volta ao login.
  // ---------------------------------------------------------------------------
  function getSessionToken() {
    try {
      const t = localStorage.getItem('motordesk_auth_token') || '';
      return t.indexOf('mds_') === 0 ? t : '';
    } catch (e) {
      return '';
    }
  }

  function isSameOriginApi(url) {
    try {
      const u = new URL(url, window.location.href);
      return u.origin === window.location.origin && u.pathname.indexOf('/api/') === 0;
    } catch (e) {
      return false;
    }
  }

  // Respostas 401 destas rotas são esperadas (senha errada etc.) e não encerram a sessão
  function isAuthFlowUrl(url) {
    return /\/api\/(auth\/(login|verify-password|logout)|users\/update-password)/.test(String(url || ''));
  }

  // ---------------------------------------------------------------------------
  // O SERVIDOR (NEON) É A ÚNICA FONTE DOS DADOS
  // Nada de negócio fica guardado no navegador: um Firefox anônimo e um Edge com
  // dados antigos precisam mostrar exatamente a mesma coisa.
  //  - Cópias da base (motordesk_db*, conteúdo do site...) nunca são lidas nem gravadas.
  //  - Configurações da empresa (parâmetros operacionais, de tela, backup, permissões por
  //    nível, orientação de documentos) são lidas da base e gravadas em POST /api/settings.
  // Preferências só visuais do aparelho (zoom, menu recolhido, aba aberta) continuam locais.
  // ---------------------------------------------------------------------------
  const CACHE_KEYS = ['motordesk_db', 'motordesk_db_v1', 'motordesk_full_database', 'motordesk_all_companies',
    'motordesk_app_store', 'motordesk_app_database', 'motordesk_landing_content_v2'];
  const SHARED_PREFIXES = ['motordesk_level_permissions', 'motordesk_backup_policy', 'motordesk_backup_config_',
    'motordesk_operational_params', 'motordesk_screen_params', 'motordesk_doc_orientation_'];
  function isCacheKey(k) { return CACHE_KEYS.indexOf(k) !== -1; }
  function isSharedKey(k) {
    return SHARED_PREFIXES.some(function (p) {
      return k === p || k.indexOf(p.charAt(p.length - 1) === '_' ? p : p + '_') === 0;
    });
  }

  const storageProto = window.Storage && Storage.prototype;
  const nativeGetItem = storageProto.getItem;
  const nativeSetItem = storageProto.setItem;
  const nativeRemoveItem = storageProto.removeItem;
  let realLocalStorage = null;
  try { realLocalStorage = window.localStorage; } catch (e) {}
  const isLocal = function (store) { return realLocalStorage && store === realLocalStorage; };

  // Limpa o que versões anteriores deixaram gravado neste navegador. Antes de apagar, guarda uma
  // única cópia em 'motordesk_legacy_backup' (o sistema não lê essa chave): enquanto o site esteve
  // publicado sem servidor, o que foi digitado ficou só no navegador e pode precisar ser recuperado.
  try {
    const stale = [];
    for (let i = 0; i < realLocalStorage.length; i++) {
      const k = realLocalStorage.key(i);
      if (k && (isCacheKey(k) || isSharedKey(k))) stale.push(k);
    }
    if (stale.length && !nativeGetItem.call(realLocalStorage, 'motordesk_legacy_backup')) {
      const backup = { savedAt: new Date().toISOString(), keys: {} };
      stale.forEach(function (k) { backup.keys[k] = nativeGetItem.call(realLocalStorage, k); });
      stale.forEach(function (k) { nativeRemoveItem.call(realLocalStorage, k); });
      try { nativeSetItem.call(realLocalStorage, 'motordesk_legacy_backup', JSON.stringify(backup)); } catch (e) {}
    }
    stale.forEach(function (k) { nativeRemoveItem.call(realLocalStorage, k); });
  } catch (e) {}

  let lastSharedSettings = {};
  function activeCompanyId() {
    try {
      const u = JSON.parse(nativeGetItem.call(realLocalStorage, 'motordesk_active_user') || '{}');
      return nativeGetItem.call(realLocalStorage, 'motordesk_active_company_id') || u.companyId ||
        (window.__CURRENT_DB && window.__CURRENT_DB.companyInfo && window.__CURRENT_DB.companyInfo.id) || '';
    } catch (e) {
      return '';
    }
  }
  function sharedSettings() {
    const db = window.__CURRENT_DB;
    if (db && db.sharedSettings && typeof db.sharedSettings === 'object') lastSharedSettings = db.sharedSettings;
    return lastSharedSettings;
  }
  function sharedGet(key) {
    const company = sharedSettings()[activeCompanyId()] || {};
    return Object.prototype.hasOwnProperty.call(company, key) ? String(company[key]) : null;
  }
  function sharedSet(key, value) {
    const cid = activeCompanyId();
    if (!cid || !getSessionToken()) return;
    const all = Object.assign({}, sharedSettings());
    const previous = Object.assign({}, all[cid] || {});
    const company = Object.assign({}, previous);
    if (value === null) delete company[key]; else company[key] = value;
    all[cid] = company;
    lastSharedSettings = all;
    if (window.__CURRENT_DB && typeof window.__CURRENT_DB === 'object') window.__CURRENT_DB.sharedSettings = all;
    nativeFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessionToken(), 'X-Company-Id': cid },
      body: JSON.stringify({ key: key, value: value })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok && data && data.success) return;
        throw new Error((data && data.error) || ('HTTP ' + res.status));
      });
    }).catch(function (err) {
      // Não gravou no servidor: desfaz para não exibir aqui algo que os outros não veem
      const back = Object.assign({}, lastSharedSettings);
      back[cid] = previous;
      lastSharedSettings = back;
      if (window.__CURRENT_DB && typeof window.__CURRENT_DB === 'object') window.__CURRENT_DB.sharedSettings = back;
      showToast('Configuração não salva no servidor: ' + err.message);
    });
  }

  storageProto.getItem = function (key) {
    if (isLocal(this)) {
      const k = String(key);
      if (isCacheKey(k)) return null;
      if (isSharedKey(k)) return sharedGet(k);
    }
    return nativeGetItem.apply(this, arguments);
  };
  storageProto.setItem = function (key, value) {
    if (isLocal(this)) {
      const k = String(key);
      if (isCacheKey(k)) return;
      if (isSharedKey(k)) { sharedSet(k, String(value)); return; }
    }
    return nativeSetItem.apply(this, arguments);
  };
  storageProto.removeItem = function (key) {
    if (isLocal(this)) {
      const k = String(key);
      if (isCacheKey(k)) return;
      if (isSharedKey(k)) { sharedSet(k, null); return; }
    }
    return nativeRemoveItem.apply(this, arguments);
  };

  // ---------------------------------------------------------------------------
  // SEM SERVIDOR, SEM DADOS
  // Até a base do servidor chegar, uma tela de carregamento cobre o aplicativo (que
  // nasce com dados de exemplo embutidos). Se o servidor não responder, a tela vira um
  // bloqueio "sem conexão" que tenta de novo sozinho.
  // ---------------------------------------------------------------------------
  let serverReady = false;
  let serverOffline = false;
  let overlayEl = null;
  let healthTimer = null;
  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.id = 'motordesk-server-gate';
    overlayEl.setAttribute('role', 'alert');
    overlayEl.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
      'background:#0f172a;color:#e2e8f0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px';
    overlayEl.innerHTML = '<div style="max-width:420px"><div data-gate-title style="font-size:18px;font-weight:700;margin-bottom:8px"></div>' +
      '<div data-gate-text style="color:#94a3b8"></div></div>';
    (document.body || document.documentElement).appendChild(overlayEl);
    return overlayEl;
  }
  function showGate(title, text) {
    const el = ensureOverlay();
    el.querySelector('[data-gate-title]').textContent = title;
    el.querySelector('[data-gate-text]').textContent = text;
    el.hidden = false;
  }
  function hideGate() {
    if (overlayEl) overlayEl.hidden = true;
  }
  function showToast(message) {
    try {
      const t = document.createElement('div');
      t.textContent = message;
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:#b91c1c;color:#fff;' +
        'padding:10px 16px;border-radius:8px;font:14px system-ui,sans-serif;max-width:90vw;box-shadow:0 4px 16px rgba(0,0,0,.3)';
      (document.body || document.documentElement).appendChild(t);
      setTimeout(function () { t.remove(); }, 6000);
    } catch (e) {}
  }
  showGate('Carregando MotorDesk…', 'Conectando ao banco de dados.');

  function isServerFailure(res) {
    if (!res) return true;
    if (res.status === 502 || res.status === 503 || res.status === 504) return true;
    const ct = (res.headers && res.headers.get ? res.headers.get('content-type') : '') || '';
    return res.status !== 204 && ct.toLowerCase().indexOf('text/html') !== -1;
  }
  function markOffline() {
    if (serverOffline) return;
    serverOffline = true;
    showGate('Sem conexão com o servidor', 'Os dados só são exibidos quando vêm do servidor, para que todos vejam a mesma informação. Tentando reconectar…');
    if (!healthTimer) healthTimer = setInterval(checkServerBack, 5000);
  }
  function checkServerBack() {
    nativeFetch('/api/db/version?t=' + Date.now(), { cache: 'no-store' }).then(function (res) {
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!res.ok || ct.indexOf('application/json') === -1) return;
      clearInterval(healthTimer);
      healthTimer = null;
      if (!serverReady) { window.location.reload(); return; }
      serverOffline = false;
      hideGate();
      if (typeof window.__motorDeskSyncNow === 'function') window.__motorDeskSyncNow('server_back');
    }).catch(function () {});
  }
  // Gravação só com a base do servidor carregada e usuário logado (evita gravar dados de exemplo)
  window.__mdCanWrite = function () {
    return serverReady && !serverOffline && Boolean(getSessionToken());
  };

  // O aplicativo sempre volta à tela de login ao carregar a página (descarta token e usuário).
  // Encerra também a sessão no servidor, para não deixá-la válida sem uso, e garante que a
  // carga inicial seja a mesma de qualquer navegador recém-aberto.
  try {
    const previousToken = getSessionToken();
    if (previousToken) {
      window.fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + previousToken }, keepalive: true }).catch(function () {});
      nativeRemoveItem.call(realLocalStorage, 'motordesk_auth_token');
    }
  } catch (e) {}

  // Cópias locais antigas da base (gravadas antes do login no servidor) continham senhas: descarta
  // quando não há sessão válida do novo formato. Usuário logado no formato antigo volta ao login.
  try {
    if (!getSessionToken()) {
      if (localStorage.getItem('motordesk_active_user')) {
        const legacyUser = JSON.parse(localStorage.getItem('motordesk_active_user') || '{}');
        if (legacyUser && legacyUser.username) localStorage.setItem('motordesk_saved_username', legacyUser.username);
        localStorage.removeItem('motordesk_active_user');
      }
    }
  } catch (e) {}

  let sessionExpiredHandled = false;
  function handleSessionExpired() {
    if (sessionExpiredHandled) return;
    let hadActiveUser = false;
    try {
      hadActiveUser = Boolean(localStorage.getItem('motordesk_active_user'));
      if (!hadActiveUser) return;
      const u = JSON.parse(localStorage.getItem('motordesk_active_user') || '{}');
      if (u && u.username) localStorage.setItem('motordesk_saved_username', u.username);
      localStorage.removeItem('motordesk_active_user');
      localStorage.removeItem('motordesk_auth_token');
      localStorage.removeItem('motordesk_last_activity');
    } catch (e) {}
    if (!hadActiveUser) return;
    sessionExpiredHandled = true;
    console.warn('[MotorDesk Auth] Sessão expirada ou revogada. Retornando à tela de login.');
    window.location.reload();
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (isSameOriginApi(url)) {
      const token = getSessionToken();
      if (token) {
        const headers = new Headers((init && init.headers) || (input && typeof input !== 'string' ? input.headers : undefined) || {});
        const current = headers.get('Authorization') || '';
        if (current.indexOf('mds_') === -1) headers.set('Authorization', 'Bearer ' + token);
        init = Object.assign({}, init || {}, { headers: headers });
      }
    }
    const apiCall = isSameOriginApi(url);
    return nativeFetch(input, init).then(function (res) {
      if (res.status === 401 && apiCall && !isAuthFlowUrl(url)) handleSessionExpired();
      if (apiCall && isServerFailure(res)) markOffline();
      return res;
    }, function (err) {
      if (apiCall && !(err && err.name === 'AbortError')) markOffline();
      throw err;
    });
  };

  // Requisições via XMLHttpRequest (cliente HTTP interno do aplicativo)
  // (setRequestHeader repetido CONCATENA valores no XHR, então o token é aplicado uma única vez)
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  const nativeSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__mdUrl = url;
    this.__mdAuthSet = false;
    return nativeOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (String(name).toLowerCase() === 'authorization' && isSameOriginApi(this.__mdUrl)) {
      if (this.__mdAuthSet) return;
      this.__mdAuthSet = true;
      const token = getSessionToken();
      if (token && String(value).indexOf('mds_') === -1) value = 'Bearer ' + token;
    }
    return nativeSetHeader.call(this, name, value);
  };
  XMLHttpRequest.prototype.send = function () {
    const xhr = this;
    if (isSameOriginApi(xhr.__mdUrl)) {
      const token = getSessionToken();
      if (token && !xhr.__mdAuthSet) {
        try { xhr.setRequestHeader('Authorization', 'Bearer ' + token); } catch (e) {}
      }
      xhr.addEventListener('load', function () {
        if (xhr.status === 401 && !isAuthFlowUrl(xhr.__mdUrl)) handleSessionExpired();
        const ct = String(xhr.getResponseHeader('content-type') || '').toLowerCase();
        if (xhr.status === 502 || xhr.status === 503 || xhr.status === 504 || (xhr.status !== 204 && ct.indexOf('text/html') !== -1)) markOffline();
      });
      xhr.addEventListener('error', markOffline);
    }
    return nativeSend.apply(this, arguments);
  };

  // Tela de login: empresas do usuário digitado vêm do servidor (sem baixar a lista de usuários)
  let loginLookupTimer = null;
  let lastLookupUsername = '';
  function applyLoginDirectory(data) {
    if (!data || !data.success) return;
    try {
      if (localStorage.getItem('motordesk_active_user')) return; // já logado
    } catch (e) {}
    const companies = Array.isArray(data.companies) ? data.companies : [];
    window.__allCompanies = companies;
    const base = window.__CURRENT_DB && typeof window.__CURRENT_DB === 'object' ? window.__CURRENT_DB : {};
    const next = Object.assign({}, base, { users: data.users || [], registeredCompanies: companies });
    window.__CURRENT_DB = next;
    if (window.__motorDeskDb && typeof window.__motorDeskDb.onDataMergedCallback === 'function') {
      window.__motorDeskDb.onDataMergedCallback(next);
    } else {
      window.__motorDeskPendingDbUpdate = next;
    }
  }
  function lookupLoginCompanies(username) {
    const clean = String(username || '').trim().toLowerCase();
    if (clean === lastLookupUsername) return;
    lastLookupUsername = clean;
    if (!clean) {
      applyLoginDirectory({ success: true, companies: [], users: [] });
      return;
    }
    nativeFetch('/api/auth/login-companies?username=' + encodeURIComponent(clean), { headers: { 'Cache-Control': 'no-cache' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (clean === lastLookupUsername) applyLoginDirectory(data);
      })
      .catch(function () {});
  }
  document.addEventListener('input', function (e) {
    const el = e.target;
    if (!el || el.id !== 'login-username-input') return;
    clearTimeout(loginLookupTimer);
    loginLookupTimer = setTimeout(function () { lookupLoginCompanies(el.value); }, 350);
  }, true);
  // Usuário pré-preenchido (último login): consulta assim que a tela de login aparecer
  setInterval(function () {
    const el = document.getElementById('login-username-input');
    if (el && el.value && el.value.trim().toLowerCase() !== lastLookupUsername) lookupLoginCompanies(el.value);
  }, 1000);

  // Autenticação token de transporte
  let authToken = null;
  try {
    authToken = localStorage.getItem('motordesk_auth_token');
    if (!authToken) {
      authToken = 'motordesk_session_guest_' + Date.now();
      localStorage.setItem('motordesk_auth_token', authToken);
    }
  } catch(e) {
    authToken = 'motordesk_session_guest_' + Date.now();
  }

  function buildHeaders() {
    const headers = {
      'Authorization': 'Bearer ' + authToken,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Sync-Mode': 'full'
    };

    try {
      const rawUser = localStorage.getItem('motordesk_active_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u.id) headers['X-User-Id'] = u.id;
        if (u.companyId) headers['X-Company-Id'] = u.companyId;
        if (u.role) headers['X-User-Role'] = u.role;
      } else {
        headers['X-Company-Id'] = 'all';
        headers['X-User-Role'] = 'guest';
      }
    } catch(e) {
      headers['X-Company-Id'] = 'all';
      headers['X-User-Role'] = 'guest';
    }
    return headers;
  }

  // CONEXÃO DIRETA COM O BANCO DE DADOS (Assíncrona, compatível com Firefox, Chrome, Opera, Safari)
  window.__motorDeskDbPromise = fetch('/api/db?t=' + Date.now(), {
    method: 'GET',
    headers: buildHeaders()
  })
  .then(function(res) {
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || ct.indexOf('application/json') === -1) throw new Error('HTTP ' + res.status + ' ' + ct);
    return res.json();
  })
  .then(function(payload) {
    const freshDb = payload && payload.success !== false ? payload.data : null;
    if (freshDb && typeof freshDb === 'object') {
      window.__CURRENT_DB = freshDb;
      if (Array.isArray(freshDb.registeredCompanies) && freshDb.registeredCompanies.length > 0) {
        window.__allCompanies = freshDb.registeredCompanies;
      }

      // Se houver componente React aguardando notificação de merge
      if (window.__motorDeskDb && typeof window.__motorDeskDb.onDataMergedCallback === 'function') {
        window.__motorDeskDb.onDataMergedCallback(freshDb);
      } else {
        window.__motorDeskPendingDbUpdate = freshDb;
      }

      console.log('[MotorDesk DirectDB] Conexão direta estabelecida com sucesso com o Banco Central (' + (freshDb.registeredCompanies || []).length + ' empresas, ' + (freshDb.clients || []).length + ' clientes, ' + (freshDb.vehicles || []).length + ' veículos).');
      serverReady = true;
      // Dá tempo do aplicativo trocar os dados de exemplo pelos do servidor antes de aparecer
      setTimeout(function () { if (!serverOffline) hideGate(); }, 400);
      return freshDb;
    }
    throw new Error('Resposta sem dados');
  })
  .catch(function(err) {
    console.warn('[MotorDesk DirectDB] Servidor indisponível na carga inicial:', err && err.message);
    markOffline();
    return null;
  });

  // Função global para consulta direta ao banco a critério do usuário (quando pesquisar ou clicar)
  window.__motorDeskDirectQuery = async function(entityOrSearch) {
    try {
      const res = await fetch('/api/db?t=' + Date.now(), {
        method: 'GET',
        headers: buildHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const fresh = json && json.success !== false ? json.data : null;
        if (!fresh || typeof fresh !== 'object') return null;
        window.__CURRENT_DB = fresh;
        if (window.__motorDeskDb && typeof window.__motorDeskDb.onDataMergedCallback === 'function') {
          window.__motorDeskDb.onDataMergedCallback(fresh);
        }
        return fresh;
      }
    } catch(err) {
      console.warn('[MotorDesk DirectQuery] Erro na consulta ao banco:', err);
    }
    return null;
  };

})();
