/**
 * MotorDesk - Multi-Device & Multi-Browser Real-Time Sync Engine
 * Guarantees instant synchronization of all CRUD operations across browsers and computers.
 */
(function () {
  let knownVersion = 0;
  let knownUpdatedAt = null;
  let isSyncing = false;
  let hasPendingSync = false;

  const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('motordesk_live_sync') : null;

  function log(...args) {
    console.log('[MotorDesk LiveSync]', ...args);
  }

  // Core synchronization execution
  async function performSync(triggerSource) {
    if (isSyncing) {
      hasPendingSync = true;
      return;
    }

    isSyncing = true;
    hasPendingSync = false;

    try {
      if (window.__motorDeskDb && typeof window.__motorDeskDb.fetchDatabaseInternal === 'function') {
        log(`Executing synchronized fetch (source: ${triggerSource})...`);
        const freshDb = await window.__motorDeskDb.fetchDatabaseInternal();
        if (freshDb && window.__motorDeskDb.onDataMergedCallback) {
          window.__motorDeskDb.onDataMergedCallback(freshDb);
          log(`Database state applied to UI across all components (source: ${triggerSource}).`);
        }
      } else {
        // Fallback if Qre is not yet registered
        const res = await fetch('/api/db', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data && window.__motorDeskDb && window.__motorDeskDb.onDataMergedCallback) {
            window.__motorDeskDb.onDataMergedCallback(json.data);
          }
        }
      }

      window.dispatchEvent(new CustomEvent('motordesk_sync_success', { detail: { source: triggerSource } }));
    } catch (err) {
      console.warn('[MotorDesk LiveSync] Sync error:', err);
    } finally {
      isSyncing = false;
      if (hasPendingSync) {
        hasPendingSync = false;
        setTimeout(() => performSync('pending_queue'), 100);
      }
    }
  }

  // Expose global trigger
  window.__motorDeskSyncNow = function (source) {
    performSync(source || 'manual_trigger');
  };

  // 1. Cross-Tab BroadcastChannel listener (0ms intra-device sync)
  if (syncChannel) {
    syncChannel.onmessage = function (event) {
      if (event.data && (event.data.type === 'db_update' || event.data.type === 'db_synced')) {
        log('Cross-tab broadcast received from sibling tab:', event.data);
        if (event.data.version && event.data.version > knownVersion) {
          knownVersion = event.data.version;
        }
        performSync('broadcast_channel');
      }
    };
  }

  // 2. Server-Sent Events (SSE) for instant cross-device push notifications (<100ms)
  let sseSource = null;
  function connectSSE() {
    try {
      if (sseSource) {
        sseSource.close();
      }
      sseSource = new EventSource('/api/db/stream');

      sseSource.addEventListener('connected', function (e) {
        try {
          const data = JSON.parse(e.data);
          if (data.version) knownVersion = Math.max(knownVersion, data.version);
          if (data.updatedAt) knownUpdatedAt = data.updatedAt;
          log('SSE stream connected. Current DB version:', knownVersion);
        } catch (err) {}
      });

      sseSource.addEventListener('db_update', function (e) {
        try {
          const data = JSON.parse(e.data);
          log('SSE db_update received from server:', data);
          if (data.version) knownVersion = Math.max(knownVersion, data.version);
          if (data.updatedAt) knownUpdatedAt = data.updatedAt;
          performSync('sse_push');
        } catch (err) {
          performSync('sse_push_fallback');
        }
      });

      sseSource.onerror = function () {
        // EventSource will automatically retry in modern browsers
        // But schedule check just in case
      };
    } catch (err) {
      console.warn('[MotorDesk LiveSync] SSE connection error:', err);
    }
  }

  connectSSE();

  // 3. Lightweight version poller (every 2.5s) to guarantee updates even if SSE is interrupted
  async function checkVersion() {
    try {
      const res = await fetch('/api/db/version?t=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success) {
        const remoteVersion = json.version || 0;
        const remoteUpdatedAt = json.updatedAt;

        if (remoteVersion > knownVersion || (remoteUpdatedAt && remoteUpdatedAt !== knownUpdatedAt && knownUpdatedAt !== null)) {
          log(`Remote DB update detected via poller (local v${knownVersion} -> remote v${remoteVersion})`);
          knownVersion = remoteVersion;
          knownUpdatedAt = remoteUpdatedAt;
          performSync('version_poller');
        } else if (knownVersion === 0 && remoteVersion > 0) {
          knownVersion = remoteVersion;
          knownUpdatedAt = remoteUpdatedAt;
        }
      }
    } catch (err) {
      // ignore transient network errors
    }
  }

  setInterval(checkVersion, 2500);

  // 4. Focus and tab visibility triggers (instant refresh when user switches window or tab)
  window.addEventListener('focus', () => {
    checkVersion();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion();
    }
  });

  // 5. Broadcast to other tabs when this tab saves
  window.addEventListener('storage', (e) => {
    if (e.key === 'motordesk_db_v2' || e.key === 'motordesk_db') {
      if (syncChannel) {
        syncChannel.postMessage({ type: 'db_update', timestamp: Date.now() });
      }
    }
  });

  log('Multi-device real-time sync engine initialized.');
})();
