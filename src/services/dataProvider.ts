import { AppDatabase } from '../data/mockData';

type DataMergedCallback = (mergedDb: AppDatabase) => void;

class DataProviderService {
  private mergedCallback: DataMergedCallback | null = null;
  private pendingSaveTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__motorDeskDb = (window as any).__motorDeskDb || {};
      (window as any).__motorDeskDb.setDataMergedCallback = (cb: DataMergedCallback) => {
        this.setDataMergedCallback(cb);
      };
      (window as any).__motorDeskDb.fetchDatabaseInternal = async () => {
        return await this.getDatabase();
      };
    }
  }

  public setDataMergedCallback(callback: DataMergedCallback): void {
    this.mergedCallback = callback;
    if (typeof window !== 'undefined') {
      (window as any).__motorDeskDb = (window as any).__motorDeskDb || {};
      (window as any).__motorDeskDb.onDataMergedCallback = callback;
    }
  }

  public triggerDataMerged(db: AppDatabase): void {
    if (typeof window !== 'undefined') {
      (window as any).__CURRENT_DB = db;
      if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
        (window as any).__allCompanies = db.registeredCompanies;
      }
    }
    if (this.mergedCallback) {
      try {
        this.mergedCallback(db);
      } catch (err) {
        console.error('[DataProvider] Error in data merged callback:', err);
      }
    }
  }

  public async getDatabase(): Promise<AppDatabase> {
    // A carga antecipada do boot (pre-hydrate.js) é aproveitada apenas uma vez;
    // toda chamada seguinte consulta o servidor para enxergar gravações de outras máquinas.
    if (typeof window !== 'undefined' && (window as any).__motorDeskDbPromise && !(window as any).__motorDeskBootDbConsumed) {
      (window as any).__motorDeskBootDbConsumed = true;
      try {
        const preDb = await (window as any).__motorDeskDbPromise;
        if (preDb && typeof preDb === 'object') {
          (window as any).__CURRENT_DB = preDb;
          return preDb as AppDatabase;
        }
      } catch (e) {}
    }

    let authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('motordesk_auth_token') : null;
    if (!authToken) {
      authToken = `motordesk_session_guest_${Date.now()}`;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('motordesk_auth_token', authToken);
        }
      } catch (e) {}
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${authToken}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Sync-Mode': 'full'
    };

    if (typeof localStorage !== 'undefined') {
      const activeUserStr = localStorage.getItem('motordesk_active_user');
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          if (u.id) headers['X-User-Id'] = u.id;
          if (u.companyId) headers['X-Company-Id'] = u.companyId;
          if (u.role) headers['X-User-Role'] = u.role;
        } catch (e) {}
      } else {
        headers['X-Company-Id'] = 'all';
        headers['X-User-Role'] = 'guest';
      }
    }

    try {
      const response = await fetch(`/api/db?t=${Date.now()}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading database from server`);
      }

      const payload = await response.json();
      const serverDb = payload && payload.success !== false ? payload.data : null;

      if (serverDb && typeof serverDb === 'object') {
        if (typeof window !== 'undefined') {
          (window as any).__CURRENT_DB = serverDb;
          if (Array.isArray(serverDb.registeredCompanies) && serverDb.registeredCompanies.length > 0) {
            (window as any).__allCompanies = serverDb.registeredCompanies;
          }
        }
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('motordesk_db_v1', JSON.stringify(serverDb));
            localStorage.setItem('motordesk_db', JSON.stringify(serverDb));
            localStorage.setItem('motordesk_full_database', JSON.stringify(serverDb));
            if (Array.isArray(serverDb.registeredCompanies) && serverDb.registeredCompanies.length > 0) {
              localStorage.setItem('motordesk_all_companies', JSON.stringify(serverDb.registeredCompanies));
            }
          } catch (e) {}
        }
        return serverDb as AppDatabase;
      }
    } catch (err) {
      console.warn('[DataProvider] Server fetch notice, evaluating fallback:', err);
    }

    // Servidor indisponível: mantém o estado já carregado nesta aba
    if (typeof window !== 'undefined' && (window as any).__CURRENT_DB) {
      return (window as any).__CURRENT_DB as AppDatabase;
    }

    // Local fallback se rede falhar completamente
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('motordesk_db_v1') || localStorage.getItem('motordesk_db') || localStorage.getItem('motordesk_full_database');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {}
      }
    }

    const { getDatabase } = await import('../data/mockData');
    return getDatabase();
  }

  public async saveDatabase(db: AppDatabase): Promise<void> {
    // Envio direto imediato ao banco de dados oficial do servidor
    await this.saveDatabaseImmediate(db);
  }

  public async saveDatabaseImmediate(db: AppDatabase): Promise<void> {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout);
      this.pendingSaveTimeout = null;
    }

    // 1. Manter em memória global
    if (typeof window !== 'undefined') {
      (window as any).__CURRENT_DB = db;
      if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
        (window as any).__allCompanies = db.registeredCompanies;
      }
    }

    // 2. Cache local resiliente
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('motordesk_db_v1', JSON.stringify(db));
        localStorage.setItem('motordesk_db', JSON.stringify(db));
        localStorage.setItem('motordesk_full_database', JSON.stringify(db));
        if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
          localStorage.setItem('motordesk_all_companies', JSON.stringify(db.registeredCompanies));
        }
      } catch (e) {}
    }

    // 3. Transmissão BroadcastChannel para abas abertas no mesmo navegador
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('motordesk_live_channel');
        bc.postMessage({ type: 'db_update', data: db, timestamp: Date.now() });
      } catch (e) {}
    }

    // 4. Persistir DIRETAMENTE no banco do servidor backend (Cloud SQL / app_store.json)
    let authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('motordesk_auth_token') : null;
    if (!authToken) {
      authToken = `motordesk_session_${Date.now()}`;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('motordesk_auth_token', authToken);
        }
      } catch (e) {}
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Sync-Mode': 'full'
    };

    if (typeof localStorage !== 'undefined') {
      const activeUserStr = localStorage.getItem('motordesk_active_user');
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          if (u.id) headers['X-User-Id'] = u.id;
          if (u.companyId) headers['X-Company-Id'] = u.companyId;
          if (u.role) headers['X-User-Role'] = u.role;
        } catch (e) {}
      }
    }

    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers,
        body: JSON.stringify(db)
      });
      if (response.ok) {
        const payload = await response.json();
        const serverData = payload.data || payload;
        if (serverData && typeof serverData === 'object') {
          if (typeof window !== 'undefined') {
            (window as any).__CURRENT_DB = serverData;
          }
          this.triggerDataMerged(serverData);
        }
      } else {
        console.warn(`[DataProvider] Server returned HTTP ${response.status} on saveDatabase`);
      }
    } catch (err) {
      console.warn('[DataProvider] Network error during saveDatabase:', err);
    }
  }
}

export const dataProvider = new DataProviderService();
