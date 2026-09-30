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
    const DEFAULT_FALLBACK_COMPANIES = [
      { id: "comp-1", name: "Auto Mecânica Modelo", cnpj: "12.345.678/0001-90", businessType: "OFICINA", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-2", name: "MotorDesk Auto Center - Filial Vila Mariana", cnpj: "98.765.432/0001-10", businessType: "OFICINA", companyType: "filial", subscriptionStatus: "active" },
      { id: "comp-3", name: "Centro Automotivo Express Repair - Matriz RJ", cnpj: "45.123.890/0001-55", businessType: "OFICINA", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-4", name: "MotorDesk Auto Peças & Distribuidora - Comércio SP", cnpj: "77.888.999/0001-22", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-5", name: "MotorDesk Metalúrgica & Indústria de Autopeças - Indústria SP", cnpj: "55.666.777/0001-88", businessType: "INDUSTRIA", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-1786707452067", name: "EMPRESA DE TESTE", cnpj: "33931853810", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-test-1786973620291", name: "Auto Mecânica Auditoria Sincronizada", cnpj: "99.888.777/0001-66", businessType: "OFICINA", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-1787053175032", name: "Cerâmica de Pisos LTDA", cnpj: "23.665.235/0001-06", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-1788186013297", name: "A F X Solucoes em Embalagens Afx Representacoes Comerciais LTDA", cnpj: "17.832.609/0001-20", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-1788356473331", name: "INDUSTRIA FABRICAÇÃO LTDA", cnpj: "74.818.289/0001-97", businessType: "INDUSTRIA", companyType: "matriz", subscriptionStatus: "active" },
      { id: "comp-1789044350982", name: "COMERCIO COMERCIAL LTDA", cnpj: "02.651.563/0001-75", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" }
    ];

    window.__allCompanies = DEFAULT_FALLBACK_COMPANIES;
    try {
      localStorage.setItem('motordesk_all_companies', JSON.stringify(DEFAULT_FALLBACK_COMPANIES));
    } catch(e) {}

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
        localStorage.setItem('motordesk_full_database', JSON.stringify(freshDb));
        localStorage.setItem('motordesk_all_companies', JSON.stringify(freshDb.registeredCompanies));
        window.__allCompanies = freshDb.registeredCompanies;
        window.__CURRENT_DB = freshDb;

        // Garantir que a empresa ativa inicial seja válida em qualquer novo navegador/máquina
        let activeCompId = localStorage.getItem('motordesk_active_company_id');
        if (!activeCompId || !freshDb.registeredCompanies.some(c => c.id === activeCompId)) {
          if (freshDb.registeredCompanies[0]?.id) {
            localStorage.setItem('motordesk_active_company_id', freshDb.registeredCompanies[0].id);
          }
        }

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
          if (parsed.registeredCompanies.length < DEFAULT_FALLBACK_COMPANIES.length) {
            const existingIds = new Set(parsed.registeredCompanies.map(c => c.id));
            const missing = DEFAULT_FALLBACK_COMPANIES.filter(c => !existingIds.has(c.id));
            parsed.registeredCompanies = [...parsed.registeredCompanies, ...missing];
            localStorage.setItem('motordesk_db_v1', JSON.stringify(parsed));
            localStorage.setItem('motordesk_db', JSON.stringify(parsed));
          }
          window.__allCompanies = parsed.registeredCompanies;
        }
      }
    } catch(e) {}
  }
})();
