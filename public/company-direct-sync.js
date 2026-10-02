/**
 * MotorDesk - Company State Real-Time Synchronization Engine
 * 
 * Camada de conexão direta para gerenciamento de estados de empresas.
 * Substitui o armazenamento local isolado por sincronização com a API proxy
 * dedicada /api/companies/active e Google Cloud Firestore.
 */
(function() {
  'use strict';

  let currentActiveCompanyId = 'comp-1';

  async function fetchActiveCompanyFromServer() {
    try {
      const token = localStorage.getItem('motordesk_auth_token') || 'guest';
      const userStr = localStorage.getItem('motordesk_active_user');
      const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Authorization': 'Bearer ' + token
      };
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.id) headers['X-User-Id'] = u.id;
          if (u.role) headers['X-User-Role'] = u.role;
        } catch(e) {}
      }

      const res = await fetch('/api/companies/active?t=' + Date.now(), { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.activeCompanyId) {
          currentActiveCompanyId = data.activeCompanyId;
          window.__activeCompanyId = currentActiveCompanyId;
          localStorage.setItem('motordesk_active_company_id', currentActiveCompanyId);
          console.log('[CompanyDirectSync] Empresa ativa autoritativa sincronizada do banco central:', currentActiveCompanyId);
          return currentActiveCompanyId;
        }
      }
    } catch (e) {
      console.warn('[CompanyDirectSync] Aviso ao obter empresa ativa:', e);
    }
    return currentActiveCompanyId;
  }

  async function setActiveCompanyOnServer(newCompanyId) {
    if (!newCompanyId) return;
    currentActiveCompanyId = newCompanyId;
    window.__activeCompanyId = newCompanyId;
    localStorage.setItem('motordesk_active_company_id', newCompanyId);

    try {
      const token = localStorage.getItem('motordesk_auth_token') || 'guest';
      const userStr = localStorage.getItem('motordesk_active_user');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      };
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.id) headers['X-User-Id'] = u.id;
          if (u.role) headers['X-User-Role'] = u.role;
        } catch(e) {}
      }

      await fetch('/api/companies/active', {
        method: 'POST',
        headers,
        body: JSON.stringify({ activeCompanyId: newCompanyId })
      });
      console.log('[CompanyDirectSync] Empresa ativa salva no banco central e transmitida aos navegadores:', newCompanyId);
    } catch (e) {
      console.warn('[CompanyDirectSync] Aviso ao gravar empresa ativa:', e);
    }
  }

  window.__motorDeskCompanyState = {
    getActiveCompanyId: () => currentActiveCompanyId,
    fetchActiveCompany: fetchActiveCompanyFromServer,
    setActiveCompany: setActiveCompanyOnServer
  };

  // Inicializar consulta ao banco central imediatamente
  fetchActiveCompanyFromServer();

  // Escutar eventos SSE de alteração de empresa
  window.addEventListener('motordesk_realtime_synced', (e) => {
    if (e.detail && e.detail.source === 'company_switched' && e.detail.companyId) {
      if (e.detail.companyId !== currentActiveCompanyId) {
        currentActiveCompanyId = e.detail.companyId;
        window.__activeCompanyId = currentActiveCompanyId;
        localStorage.setItem('motordesk_active_company_id', currentActiveCompanyId);
        console.log('[CompanyDirectSync] Sincronização multi-navegador: Empresa ativa atualizada para', currentActiveCompanyId);
        if (typeof window.__motorDeskSyncNow === 'function') {
          window.__motorDeskSyncNow('company_switched_remote');
        }
      }
    }
  });

  // Interceptar seletores de empresa no DOM
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (target && target.tagName === 'SELECT') {
      const isCompanySelect = target.id?.includes('company') || target.name?.includes('company') || target.classList?.contains('company-selector');
      if (isCompanySelect && target.value && target.value.startsWith('comp-')) {
        setActiveCompanyOnServer(target.value);
      }
    }
  }, true);

})();
