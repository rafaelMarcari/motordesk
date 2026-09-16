/**
 * MotorDesk - Multi-Device & Multi-Machine Real-Time Sync Engine
 * 
 * Garante que todas as informações cadastradas ou modificadas em qualquer máquina/computador
 * (clientes, ordens de serviço, veículos, peças, estoque, financeiro, orçamentos, vendas, etc.)
 * apareçam imediatamente nas outras máquinas em tempo real (< 100ms via SSE + Poller 1s de contingência).
 */
(function () {
  'use strict';

  let knownVersion = 0;
  let knownUpdatedAt = null;
  let isSyncing = false;
  let hasPendingSync = false;
  let lastReceivedSignalTime = Date.now();
  let sseSource = null;
  let sseReconnectTimer = null;
  let activeSubscribersCount = 1;

  const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('motordesk_live_sync') : null;

  function log(...args) {
    console.log('[MotorDesk LiveSync]', ...args);
  }

  // Lista resiliente de fallback imediato para carregamento síncrono instantâneo em qualquer novo dispositivo
  const DEFAULT_FALLBACK_COMPANIES = [
    { id: "comp-1", name: "MotorDesk Auto Center - Matriz Pinheiros", businessType: "OFICINA", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-2", name: "MotorDesk Auto Center - Filial Vila Mariana", businessType: "OFICINA", companyType: "filial", subscriptionStatus: "active" },
    { id: "comp-3", name: "Centro Automotivo Express Repair - Matriz RJ", businessType: "OFICINA", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-4", name: "MotorDesk Auto Peças & Distribuidora - Comércio SP", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-5", name: "MotorDesk Metalúrgica & Indústria de Autopeças - Indústria SP", businessType: "INDUSTRIA", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-1786707452067", name: "EMPRESA DE TESTE", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-test-1786973620291", name: "Auto Mecânica Auditoria Sincronizada", businessType: "OFICINA", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-1787053175032", name: "Cerâmica de Pisos LTDA", businessType: "INDUSTRIA", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-1788186013297", name: "A F X Solucoes em Embalagens Afx Representacoes Comerciais LTDA", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-1788356473331", name: "INDUSTRIA FABRICAÇÃO LTDA", businessType: "INDUSTRIA", companyType: "matriz", subscriptionStatus: "active" },
    { id: "comp-1789044350982", name: "COMERCIO COMERCIAL LTDA", businessType: "COMERCIO", companyType: "matriz", subscriptionStatus: "active" }
  ];

  // Inicialização síncrona imediata no window para qualquer dispositivo/aba
  if (!window.__allCompanies || window.__allCompanies.length === 0) {
    try {
      const stored = localStorage.getItem('motordesk_all_companies');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          window.__allCompanies = parsed;
        }
      }
    } catch(e) {}
    if (!window.__allCompanies || window.__allCompanies.length === 0) {
      window.__allCompanies = DEFAULT_FALLBACK_COMPANIES;
    }
  }

  // Pre-carregar e manter lista global de empresas sincronizada para o seletor de login
  async function preloadCompanies() {
    try {
      const res = await fetch('/api/companies?t=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        const comps = json.companies || json.data || [];
        if (Array.isArray(comps) && comps.length > 0) {
          window.__allCompanies = comps;
          try {
            localStorage.setItem('motordesk_all_companies', JSON.stringify(comps));
            // Se estiver na tela de login (sem usuário ativo), garantir que o banco local não esteja encolhido
            const activeUser = localStorage.getItem('motordesk_active_user');
            if (!activeUser) {
              const localDbRaw = localStorage.getItem('motordesk_db_v1') || localStorage.getItem('motordesk_db');
              if (localDbRaw) {
                const localDb = JSON.parse(localDbRaw);
                if (!localDb.registeredCompanies || localDb.registeredCompanies.length < comps.length) {
                  localDb.registeredCompanies = comps;
                  localStorage.setItem('motordesk_db_v1', JSON.stringify(localDb));
                  localStorage.setItem('motordesk_db', JSON.stringify(localDb));
                }
              }
            }
          } catch (e) {}
          log(`Preloaded ${comps.length} registered companies for global selectors.`);
        }
      }
    } catch (e) {}
  }
  preloadCompanies();

  // Obter cabeçalhos de autenticação válidos para qualquer requisição HTTP
  function getAuthHeaders() {
    let token = localStorage.getItem('motordesk_auth_token');
    if (!token) {
      token = `motordesk_session_guest_${Date.now()}`;
      try {
        localStorage.setItem('motordesk_auth_token', token);
      } catch (e) {}
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Sync-Mode': 'full'
    };

    const activeUserStr = localStorage.getItem('motordesk_active_user');
    if (activeUserStr) {
      try {
        const u = JSON.parse(activeUserStr);
        if (u.id) headers['X-User-Id'] = u.id;
        if (u.companyId) headers['X-Company-Id'] = u.companyId;
        if (u.role) headers['X-User-Role'] = u.role;
      } catch (e) {}
    }

    const activeCompanyId = localStorage.getItem('motordesk_active_company_id');
    if (activeCompanyId && activeUserStr) {
      headers['X-Company-Id'] = activeCompanyId;
    } else if (!activeUserStr) {
      headers['X-Company-Id'] = 'all';
    }

    return headers;
  }

  // Interceptar montagem do MotorDesk DB para garantir aplicação imediata
  function hookMotorDeskDb() {
    if (window.__motorDeskDb && !window.__motorDeskDb.__liveSyncHooked) {
      window.__motorDeskDb.__liveSyncHooked = true;
      const originalSetCallback = window.__motorDeskDb.setDataMergedCallback;

      window.__motorDeskDb.setDataMergedCallback = function (callback) {
        log('React component subscribed to database state updates.');
        window.__motorDeskDb.onDataMergedCallback = callback;
        if (typeof originalSetCallback === 'function') {
          originalSetCallback.call(window.__motorDeskDb, callback);
        }

        // Se houver dados pendentes que chegaram antes da montagem do React, aplicar agora
        if (window.__motorDeskPendingDbUpdate) {
          const pending = window.__motorDeskPendingDbUpdate;
          window.__motorDeskPendingDbUpdate = null;
          log('Applying buffered real-time update to freshly mounted React UI...');
          try {
            callback(pending);
          } catch (err) {
            console.warn('[MotorDesk LiveSync] Error applying buffered update:', err);
          }
        }
      };
    }
  }

  // Atualizar indicador visual de sincronização em tempo real
  function updateIndicatorStatus(status, label) {
    const badge = document.getElementById('motordesk-live-sync-indicator');
    if (!badge) return;

    const dot = badge.querySelector('.sync-dot');
    const text = badge.querySelector('.sync-text');

    if (status === 'connected') {
      if (dot) {
        dot.className = 'sync-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      }
      if (text) {
        text.innerText = label || 'Tempo Real Ativo';
      }
      badge.setAttribute('title', `Sincronização em tempo real ativa entre computadores. Conexões ativas: ${activeSubscribersCount}. Clique para atualizar.`);
    } else if (status === 'syncing') {
      if (dot) {
        dot.className = 'sync-dot w-2 h-2 rounded-full bg-amber-400 animate-spin';
      }
      if (text) {
        text.innerText = label || 'Sincronizando...';
      }
    } else if (status === 'synced') {
      if (dot) {
        dot.className = 'sync-dot w-2 h-2 rounded-full bg-emerald-400';
      }
      if (text) {
        text.innerText = label || 'Sincronizado';
      }
      setTimeout(() => updateIndicatorStatus('connected'), 2000);
    } else if (status === 'offline') {
      if (dot) {
        dot.className = 'sync-dot w-2 h-2 rounded-full bg-rose-500';
      }
      if (text) {
        text.innerText = label || 'Reconectando...';
      }
    }
  }

  // Criar badge discreto no canto inferior direito
  function injectSyncIndicator() {
    if (document.getElementById('motordesk-live-sync-indicator')) return;

    const badge = document.createElement('div');
    badge.id = 'motordesk-live-sync-indicator';
    badge.className = 'fixed bottom-2 right-2 z-50 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-900/85 text-slate-200 backdrop-blur border border-slate-700/60 rounded-full shadow-lg transition-all duration-200 cursor-pointer select-none hover:bg-slate-800 hover:scale-105';
    badge.style.fontSize = '11px';
    badge.innerHTML = `
      <span class="sync-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span class="sync-text">Tempo Real Ativo</span>
    `;

    badge.addEventListener('click', () => {
      log('User clicked live sync badge. Triggering immediate manual refresh...');
      performSync('manual_badge_click');
    });

    document.body.appendChild(badge);
  }

  // Execução central da sincronização
  async function performSync(triggerSource) {
    if (isSyncing) {
      hasPendingSync = true;
      return;
    }

    isSyncing = true;
    hasPendingSync = false;
    updateIndicatorStatus('syncing', 'Atualizando dados...');

    try {
      hookMotorDeskDb();

      let freshDb = null;

      // 1. Tentar via motor nativo se disponível
      if (window.__motorDeskDb && typeof window.__motorDeskDb.fetchDatabaseInternal === 'function') {
        log(`Executing synchronized fetch via internal database engine (source: ${triggerSource})...`);
        freshDb = await window.__motorDeskDb.fetchDatabaseInternal();
      } else {
        // 2. Fetch HTTP direto com cabeçalhos autorizados completos
        log(`Executing synchronized fetch via HTTP API with auth headers (source: ${triggerSource})...`);
        const res = await fetch('/api/db?t=' + Date.now(), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            freshDb = json.data;
          }
        }
      }

      if (freshDb) {
        // Atualizar cache de localStorage para persistência local
        try {
          localStorage.setItem('motordesk_db_v1', JSON.stringify(freshDb));
          localStorage.setItem('motordesk_db', JSON.stringify(freshDb));

          // Sincronizar dados do usuário ativo da sessão atual
          const rawActiveUser = localStorage.getItem('motordesk_active_user');
          if (rawActiveUser && Array.isArray(freshDb.users)) {
            const activeUser = JSON.parse(rawActiveUser);
            const freshUser = freshDb.users.find(u => u.id === activeUser.id);
            if (freshUser) {
              const mergedActive = { ...activeUser, ...freshUser };
              localStorage.setItem('motordesk_active_user', JSON.stringify(mergedActive));
              if (typeof window.__motorDeskCheckFirstAccess === 'function') {
                window.__motorDeskCheckFirstAccess();
              }
            }
          }
        } catch (e) {}

        // Aplicar estado reativo na UI
        if (window.__motorDeskDb && typeof window.__motorDeskDb.onDataMergedCallback === 'function') {
          window.__motorDeskDb.onDataMergedCallback(freshDb);
          log(`[REALTIME-APPLIED] Database state successfully applied to all UI views (source: ${triggerSource}).`);
        } else {
          // Buffer até o React montar
          window.__motorDeskPendingDbUpdate = freshDb;
          log('[REALTIME-BUFFERED] Database state stored in pending buffer for React mount.');
        }

        // Transmitir para abas irmãs no mesmo computador
        if (syncChannel) {
          try {
            syncChannel.postMessage({
              type: 'db_synced',
              version: knownVersion,
              updatedAt: knownUpdatedAt,
              timestamp: Date.now(),
            });
          } catch (e) {}
        }

        updateIndicatorStatus('synced', 'Sincronizado!');
        window.dispatchEvent(new CustomEvent('motordesk_realtime_synced', {
          detail: {
            source: triggerSource,
            version: knownVersion,
            updatedAt: knownUpdatedAt,
            timestamp: Date.now()
          }
        }));
      }
    } catch (err) {
      console.warn('[MotorDesk LiveSync] Synchronization error:', err);
      updateIndicatorStatus('connected');
    } finally {
      isSyncing = false;
      if (hasPendingSync) {
        hasPendingSync = false;
        setTimeout(() => performSync('pending_queue'), 100);
      }
    }
  }

  // Gatilho global exposto para qualquer módulo
  window.__motorDeskSyncNow = function (source) {
    performSync(source || 'manual_trigger');
  };

  // 1. Cross-Tab BroadcastChannel (0ms intra-device)
  if (syncChannel) {
    syncChannel.onmessage = function (event) {
      if (event.data && (event.data.type === 'db_update' || event.data.type === 'db_synced')) {
        log('Cross-tab broadcast received from sibling tab:', event.data);
        if (event.data.version && event.data.version > knownVersion) {
          knownVersion = event.data.version;
        }
        if (event.data.updatedAt) {
          knownUpdatedAt = event.data.updatedAt;
        }
        performSync('broadcast_channel');
      }
    };
  }

  // 2. Server-Sent Events (SSE) para entrega instantânea multi-máquinas (< 50ms)
  function connectSSE() {
    if (sseReconnectTimer) {
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = null;
    }

    try {
      if (sseSource) {
        try {
          sseSource.close();
        } catch (e) {}
        sseSource = null;
      }

      sseSource = new EventSource('/api/db/stream');
      lastReceivedSignalTime = Date.now();

      sseSource.addEventListener('connected', function (e) {
        try {
          const data = JSON.parse(e.data);
          lastReceivedSignalTime = Date.now();
          if (data.version && data.version > knownVersion) {
            knownVersion = data.version;
          }
          if (data.updatedAt) knownUpdatedAt = data.updatedAt;
          if (data.subscribersCount) activeSubscribersCount = data.subscribersCount;
          updateIndicatorStatus('connected');
          log(`SSE stream connected. Current DB version: ${knownVersion}, Active machines: ${activeSubscribersCount}`);
        } catch (err) {}
      });

      sseSource.addEventListener('db_update', function (e) {
        try {
          const data = JSON.parse(e.data);
          lastReceivedSignalTime = Date.now();
          log('SSE db_update received from server in real-time:', data);

          if (data.subscribersCount) activeSubscribersCount = data.subscribersCount;

          const remoteVersion = Number(data.version) || 0;
          const remoteUpdatedAt = data.updatedAt;

          // Se a versão remota é mais recente ou diferente, aplicar sync imediatamente!
          if (remoteVersion > knownVersion || (remoteUpdatedAt && remoteUpdatedAt !== knownUpdatedAt)) {
            knownVersion = Math.max(knownVersion, remoteVersion);
            knownUpdatedAt = remoteUpdatedAt;
            performSync('sse_push');
          } else {
            // Mesmo se a versão bater, forçar garantia de atualização para mudanças concorrentes
            performSync('sse_push_affirmative');
          }
        } catch (err) {
          performSync('sse_push_fallback');
        }
      });

      // SSE: Evento de integridade corporativa - sessão derrubada por acesso em outro computador
      sseSource.addEventListener('session_revoked', function (e) {
        try {
          const data = JSON.parse(e.data);
          log('SSE session_revoked received from server:', data);
          window.dispatchEvent(new CustomEvent('motordesk_session_revoked', { detail: data }));
        } catch (err) {
          console.warn('[LiveSync] Error handling session_revoked event:', err);
        }
      });

      sseSource.onerror = function () {
        updateIndicatorStatus('offline');
        if (sseSource) {
          try {
            sseSource.close();
          } catch (e) {}
          sseSource = null;
        }

        // Tentar reconectar imediatamente após 1 segundo
        if (!sseReconnectTimer) {
          sseReconnectTimer = setTimeout(() => {
            sseReconnectTimer = null;
            log('Reconnecting SSE stream after connection drop...');
            connectSSE();
          }, 1200);
        }
      };
    } catch (err) {
      console.warn('[MotorDesk LiveSync] SSE initialization error:', err);
    }
  }

  // 3. Ultra-Fast Version Poller (a cada 1s) para contingência anti-firewall/proxy
  async function checkVersion() {
    try {
      const res = await fetch('/api/db/version?t=' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });

      if (!res.ok) return;

      const json = await res.json();
      if (json && json.success) {
        const remoteVersion = json.version || 0;
        const remoteUpdatedAt = json.updatedAt;
        if (json.subscribersCount) activeSubscribersCount = json.subscribersCount;

        if (remoteVersion > knownVersion || (remoteUpdatedAt && remoteUpdatedAt !== knownUpdatedAt && knownUpdatedAt !== null)) {
          log(`Remote database update detected via ultra-fast poller (local v${knownVersion} -> remote v${remoteVersion})`);
          knownVersion = remoteVersion;
          knownUpdatedAt = remoteUpdatedAt;
          performSync('version_poller');
        } else if (knownVersion === 0 && remoteVersion > 0) {
          knownVersion = remoteVersion;
          knownUpdatedAt = remoteUpdatedAt;
          performSync('initial_boot');
        }
      }
    } catch (err) {
      // silencioso para não poluir console em oscilações momentâneas
    }
  }

  // Watchdog de integridade da conexão SSE
  setInterval(() => {
    // Se não recebermos nenhum sinal (nem keep-alive) há mais de 25 segundos, reconectar SSE
    if (Date.now() - lastReceivedSignalTime > 25000) {
      log('SSE heartbeat timeout detected (>25s without signal). Re-establishing stream connection...');
      connectSSE();
    }
  }, 10000);

  // Iniciar SSE imediatamente
  connectSSE();

  // Executar poller de alta frequência a cada 1000ms
  setInterval(checkVersion, 1000);

  // Monitorar foco de janela e visibilidade da aba
  window.addEventListener('focus', () => {
    log('Window focused. Checking for real-time updates from other computers...');
    checkVersion();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      log('Tab became visible. Checking for real-time updates from other computers...');
      checkVersion();
    }
  });

  // Disparar sincronização em eventos de armazenamento local
  window.addEventListener('storage', (e) => {
    if (e.key === 'motordesk_db_v1' || e.key === 'motordesk_db') {
      if (syncChannel) {
        try {
          syncChannel.postMessage({ type: 'db_update', timestamp: Date.now() });
        } catch (err) {}
      }
    }
  });

  // Tentar inicializar o gancho e o indicador visual após o carregamento da página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hookMotorDeskDb();
      setTimeout(injectSyncIndicator, 1500);
    });
  } else {
    hookMotorDeskDb();
    setTimeout(injectSyncIndicator, 1500);
  }

  // Repetir hook periodicamente até o React inicializar
  const hookInterval = setInterval(() => {
    if (window.__motorDeskDb) {
      hookMotorDeskDb();
      clearInterval(hookInterval);
    }
  }, 200);

  log('Multi-Device Real-Time Synchronization Engine fully activated and running.');
})();
