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

  // 11 Empresas Registradas Oficiais da Base de Dados MotorDesk Central
  const CENTRAL_COMPANIES = [
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

  window.__allCompanies = CENTRAL_COMPANIES;
  try {
    localStorage.setItem('motordesk_all_companies', JSON.stringify(CENTRAL_COMPANIES));
  } catch(e) {}

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
    const freshDb = payload.data || payload;
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
        const fresh = json.data || json;
        if (fresh && window.__motorDeskDb && typeof window.__motorDeskDb.onDataMergedCallback === 'function') {
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
