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
    if (this.mergedCallback) {
      try {
        this.mergedCallback(db);
      } catch (err) {
        console.error('[DataProvider] Error in data merged callback:', err);
      }
    }
  }

  public async getDatabase(): Promise<AppDatabase> {
    const startTime = Date.now();
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
      const serverDb = payload.data || payload;

      if (serverDb && typeof serverDb === 'object') {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('motordesk_db_v1', JSON.stringify(serverDb));
            localStorage.setItem('motordesk_db', JSON.stringify(serverDb));
            localStorage.setItem('motordesk_full_database', JSON.stringify(serverDb));
            if (Array.isArray(serverDb.registeredCompanies) && serverDb.registeredCompanies.length > 0) {
              localStorage.setItem('motordesk_all_companies', JSON.stringify(serverDb.registeredCompanies));
              (window as any).__allCompanies = serverDb.registeredCompanies;
            }
          } catch (e) {}
        }
        return serverDb as AppDatabase;
      }
    } catch (err) {
      console.warn('[DataProvider] Server fetch error, using local storage fallback:', err);
    }

    // Local fallback
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
    // Debounce rapid continuous saves, but guarantee eventual execution
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout);
    }
    this.pendingSaveTimeout = setTimeout(() => {
      this.saveDatabaseImmediate(db).catch(err => {
        console.error('[DataProvider] Debounced saveDatabase error:', err);
      });
    }, 150);
  }

  public async saveDatabaseImmediate(db: AppDatabase): Promise<void> {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout);
      this.pendingSaveTimeout = null;
    }

    // 1. Immediately cache in local browser storage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('motordesk_db_v1', JSON.stringify(db));
        localStorage.setItem('motordesk_db', JSON.stringify(db));
        localStorage.setItem('motordesk_full_database', JSON.stringify(db));
        if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
          localStorage.setItem('motordesk_all_companies', JSON.stringify(db.registeredCompanies));
          (window as any).__allCompanies = db.registeredCompanies;
        }
      } catch (e) {}
    }

    // 2. Broadcast via BroadcastChannel locally for other open tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('motordesk_live_channel');
        bc.postMessage({ type: 'db_update', data: db, timestamp: Date.now() });
      } catch (e) {}
    }

    // 3. Persist to authoritative server backend (Cloud SQL / Firestore / Cache)
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
      if (!response.ok) {
        console.warn(`[DataProvider] Server returned HTTP ${response.status} on saveDatabase`);
      }
    } catch (err) {
      console.warn('[DataProvider] Network error during saveDatabase:', err);
    }
  }
}

export const dataProvider = new DataProviderService();
