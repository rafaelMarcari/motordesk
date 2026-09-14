/**
 * MotorDesk - Synchronous Pre-Hydration Bootstrap
 * 
 * Executa antes de qualquer renderização do React para garantir que,
 * em qualquer novo navegador, dispositivo móvel ou janela anônima, o
 * localStorage já esteja 100% abastecido com o banco de dados oficial
 * do servidor (7 empresas, usuários globais, configurações e cadastros),
 * impedindo que o React caia em estados padrão antigos (mock/stale).
 */
(function() {
  'use strict';

  try {
    // Sincronização Síncrona Imediata com o Servidor Cloud SQL:
    // Garante que qualquer navegador (Chrome, Opera, Firefox, Safari, Edge ou Celular)
    // receba imediatamente o estado mais recente do banco de dados e usuários atualizados
    // antes de qualquer componente React renderizar.
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/db?t=' + Date.now(), false);
    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
    let authToken = localStorage.getItem('motordesk_auth_token');
    if (!authToken) {
      authToken = 'motordesk_session_guest_' + Date.now();
      try {
        localStorage.setItem('motordesk_auth_token', authToken);
      } catch(e) {}
    }
    xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
    xhr.setRequestHeader('X-Sync-Mode', 'full');
    
    const rawActiveUser = localStorage.getItem('motordesk_active_user');
    if (rawActiveUser) {
      try {
        const u = JSON.parse(rawActiveUser);
        if (u.id) xhr.setRequestHeader('X-User-Id', u.id);
        if (u.companyId) xhr.setRequestHeader('X-Company-Id', u.companyId);
        if (u.role) xhr.setRequestHeader('X-User-Role', u.role);
      } catch(e) {}
    } else {
      xhr.setRequestHeader('X-Company-Id', 'all');
      xhr.setRequestHeader('X-User-Role', 'guest');
    }

    xhr.send(null);

    if (xhr.status === 200) {
      const res = JSON.parse(xhr.responseText);
      const freshDb = res.data || res;
      if (freshDb && typeof freshDb === 'object' && Array.isArray(freshDb.registeredCompanies) && freshDb.registeredCompanies.length > 0) {
        localStorage.setItem('motordesk_db_v1', JSON.stringify(freshDb));
        localStorage.setItem('motordesk_db', JSON.stringify(freshDb));
        localStorage.setItem('motordesk_all_companies', JSON.stringify(freshDb.registeredCompanies));
        window.__allCompanies = freshDb.registeredCompanies;

        // Se houver usuário ativo logado, sincronizar imediatamente dados mais recentes (senha, permissões, status)
        if (rawActiveUser && Array.isArray(freshDb.users)) {
          try {
            const activeUser = JSON.parse(rawActiveUser);
            const freshUser = freshDb.users.find(u => u.id === activeUser.id || (u.username && u.username.toLowerCase() === activeUser.username.toLowerCase()));
            if (freshUser) {
              const merged = Object.assign({}, activeUser, freshUser);
              localStorage.setItem('motordesk_active_user', JSON.stringify(merged));
            }
          } catch(e) {}
        }
        console.log('[MotorDesk PreHydrate] Database successfully synchronized with Cloud SQL across browsers (' + freshDb.registeredCompanies.length + ' companies).');
      }
    }
  } catch (err) {
    console.warn('[MotorDesk PreHydrate] Synchronous hydration notice, falling back to local storage:', err);
    try {
      const rawLocal = localStorage.getItem('motordesk_db_v1') || localStorage.getItem('motordesk_db');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (parsed && Array.isArray(parsed.registeredCompanies)) {
          window.__allCompanies = parsed.registeredCompanies;
        }
      }
    } catch(e) {}
  }
})();
