class DataProviderService {
  constructor() {
    this.mergedCallback = null;
    this.pendingSaveTimeout = null;
    if (typeof window !== "undefined") {
      window.__motorDeskDb = window.__motorDeskDb || {};
      window.__motorDeskDb.setDataMergedCallback = (cb) => {
        this.setDataMergedCallback(cb);
      };
      window.__motorDeskDb.fetchDatabaseInternal = async () => {
        return await this.getDatabase();
      };
    }
  }
  setDataMergedCallback(callback) {
    this.mergedCallback = callback;
    if (typeof window !== "undefined") {
      window.__motorDeskDb = window.__motorDeskDb || {};
      window.__motorDeskDb.onDataMergedCallback = callback;
    }
  }
  triggerDataMerged(db) {
    if (typeof window !== "undefined") {
      window.__CURRENT_DB = db;
      if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
        window.__allCompanies = db.registeredCompanies;
      }
    }
    if (this.mergedCallback) {
      try {
        this.mergedCallback(db);
      } catch (err) {
        console.error("[DataProvider] Error in data merged callback:", err);
      }
    }
  }
  async getDatabase() {
    if (typeof window !== "undefined") {
      if (window.__CURRENT_DB && typeof window.__CURRENT_DB === "object") {
        return window.__CURRENT_DB;
      }
      if (window.__motorDeskDbPromise) {
        try {
          const preDb = await window.__motorDeskDbPromise;
          if (preDb && typeof preDb === "object") {
            window.__CURRENT_DB = preDb;
            return preDb;
          }
        } catch (e) {
        }
      }
    }
    let authToken = typeof localStorage !== "undefined" ? localStorage.getItem("motordesk_auth_token") : null;
    if (!authToken) {
      authToken = `motordesk_session_guest_${Date.now()}`;
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("motordesk_auth_token", authToken);
        }
      } catch (e) {
      }
    }
    const headers = {
      "Authorization": `Bearer ${authToken}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "X-Requested-With": "XMLHttpRequest",
      "X-Sync-Mode": "full"
    };
    if (typeof localStorage !== "undefined") {
      const activeUserStr = localStorage.getItem("motordesk_active_user");
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          if (u.id) headers["X-User-Id"] = u.id;
          if (u.companyId) headers["X-Company-Id"] = u.companyId;
          if (u.role) headers["X-User-Role"] = u.role;
        } catch (e) {
        }
      } else {
        headers["X-Company-Id"] = "all";
        headers["X-User-Role"] = "guest";
      }
    }
    try {
      const response = await fetch(`/api/db?t=${Date.now()}`, {
        method: "GET",
        headers
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading database from server`);
      }
      const payload = await response.json();
      const serverDb = payload.data || payload;
      if (serverDb && typeof serverDb === "object") {
        if (typeof window !== "undefined") {
          window.__CURRENT_DB = serverDb;
          if (Array.isArray(serverDb.registeredCompanies) && serverDb.registeredCompanies.length > 0) {
            window.__allCompanies = serverDb.registeredCompanies;
          }
        }
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem("motordesk_db_v1", JSON.stringify(serverDb));
            localStorage.setItem("motordesk_db", JSON.stringify(serverDb));
            localStorage.setItem("motordesk_full_database", JSON.stringify(serverDb));
            if (Array.isArray(serverDb.registeredCompanies) && serverDb.registeredCompanies.length > 0) {
              localStorage.setItem("motordesk_all_companies", JSON.stringify(serverDb.registeredCompanies));
            }
          } catch (e) {
          }
        }
        return serverDb;
      }
    } catch (err) {
      console.warn("[DataProvider] Server fetch notice, evaluating fallback:", err);
    }
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem("motordesk_db_v1") || localStorage.getItem("motordesk_db") || localStorage.getItem("motordesk_full_database");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
        }
      }
    }
    const { getDatabase } = await import("../data/mockData");
    return getDatabase();
  }
  async saveDatabase(db) {
    await this.saveDatabaseImmediate(db);
  }
  async saveDatabaseImmediate(db) {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout);
      this.pendingSaveTimeout = null;
    }
    if (typeof window !== "undefined") {
      window.__CURRENT_DB = db;
      if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
        window.__allCompanies = db.registeredCompanies;
      }
    }
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("motordesk_db_v1", JSON.stringify(db));
        localStorage.setItem("motordesk_db", JSON.stringify(db));
        localStorage.setItem("motordesk_full_database", JSON.stringify(db));
        if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
          localStorage.setItem("motordesk_all_companies", JSON.stringify(db.registeredCompanies));
        }
      } catch (e) {
      }
    }
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("motordesk_live_channel");
        bc.postMessage({ type: "db_update", data: db, timestamp: Date.now() });
      } catch (e) {
      }
    }
    let authToken = typeof localStorage !== "undefined" ? localStorage.getItem("motordesk_auth_token") : null;
    if (!authToken) {
      authToken = `motordesk_session_${Date.now()}`;
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("motordesk_auth_token", authToken);
        }
      } catch (e) {
      }
    }
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      "X-Requested-With": "XMLHttpRequest",
      "X-Sync-Mode": "full"
    };
    if (typeof localStorage !== "undefined") {
      const activeUserStr = localStorage.getItem("motordesk_active_user");
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          if (u.id) headers["X-User-Id"] = u.id;
          if (u.companyId) headers["X-Company-Id"] = u.companyId;
          if (u.role) headers["X-User-Role"] = u.role;
        } catch (e) {
        }
      }
    }
    try {
      const response = await fetch("/api/db", {
        method: "POST",
        headers,
        body: JSON.stringify(db)
      });
      if (response.ok) {
        const payload = await response.json();
        const serverData = payload.data || payload;
        if (serverData && typeof serverData === "object") {
          if (typeof window !== "undefined") {
            window.__CURRENT_DB = serverData;
          }
          this.triggerDataMerged(serverData);
        }
      } else {
        console.warn(`[DataProvider] Server returned HTTP ${response.status} on saveDatabase`);
      }
    } catch (err) {
      console.warn("[DataProvider] Network error during saveDatabase:", err);
    }
  }
}
const dataProvider = new DataProviderService();
export {
  dataProvider
};
