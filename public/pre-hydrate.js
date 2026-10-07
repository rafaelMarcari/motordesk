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

  // Cópias locais antigas da base (gravadas antes do login no servidor) continham senhas: descarta
  // quando não há sessão válida do novo formato. Usuário logado no formato antigo volta ao login.
  try {
    if (!getSessionToken()) {
      ['motordesk_db_v1', 'motordesk_db', 'motordesk_full_database', 'motordesk_all_companies'].forEach(function (k) {
        localStorage.removeItem(k);
      });
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
    return nativeFetch(input, init).then(function (res) {
      if (res.status === 401 && isSameOriginApi(url) && !isAuthFlowUrl(url)) handleSessionExpired();
      return res;
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
      });
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
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function(payload) {
    const freshDb = payload && payload.success !== false ? payload.data : null;
    if (freshDb && typeof freshDb === 'object') {
      window.__CURRENT_DB = freshDb;
      if (Array.isArray(freshDb.registeredCompanies) && freshDb.registeredCompanies.length > 0) {
        window.__allCompanies = freshDb.registeredCompanies;
        try {
          localStorage.setItem('motordesk_all_companies', JSON.stringify(freshDb.registeredCompanies));
        } catch(e) {}
      }

      // Se houver componente React aguardando notificação de merge
      if (window.__motorDeskDb && typeof window.__motorDeskDb.onDataMergedCallback === 'function') {
        window.__motorDeskDb.onDataMergedCallback(freshDb);
      } else {
        window.__motorDeskPendingDbUpdate = freshDb;
      }

      console.log('[MotorDesk DirectDB] Conexão direta estabelecida com sucesso com o Banco Central (' + (freshDb.registeredCompanies || []).length + ' empresas, ' + (freshDb.clients || []).length + ' clientes, ' + (freshDb.vehicles || []).length + ' veículos).');
      return freshDb;
    }
    return null;
  })
  .catch(function(err) {
    console.warn('[MotorDesk DirectDB] Aviso na busca inicial assíncrona:', err);
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
