class CompanyStateService {
  constructor() {
    this.activeCompanyId = "comp-1";
    this.cachedCompanies = [];
    this.listeners = /* @__PURE__ */ new Set();
    this.broadcastChannel = null;
    this.sseSource = null;
    if (typeof window !== "undefined") {
      if ("BroadcastChannel" in window) {
        try {
          this.broadcastChannel = new BroadcastChannel("motordesk_company_state");
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === "active_company_changed") {
              this.activeCompanyId = event.data.activeCompanyId;
              this.notifyListeners(this.activeCompanyId, event.data.company || null);
            }
          };
        } catch (e) {
        }
      }
      window.__motorDeskCompanyService = this;
    }
  }
  getAuthHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache"
    };
    if (typeof localStorage !== "undefined") {
      const token = localStorage.getItem("motordesk_auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const activeUserStr = localStorage.getItem("motordesk_active_user");
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          if (u.id) headers["X-User-Id"] = u.id;
          if (u.role) headers["X-User-Role"] = u.role;
        } catch (e) {
        }
      }
    }
    return headers;
  }
  /**
   * Obtém a empresa ativa diretamente do Banco Central / Firestore
   */
  async getActiveCompany() {
    try {
      const res = await fetch(`/api/companies/active?t=${Date.now()}`, {
        method: "GET",
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.activeCompanyId) {
          this.activeCompanyId = json.activeCompanyId;
          const comp = json.company || null;
          this.notifyListeners(this.activeCompanyId, comp);
          return { activeCompanyId: this.activeCompanyId, company: comp };
        }
      }
    } catch (err) {
      console.warn("[CompanyStateService] Falha ao consultar empresa ativa no servidor:", err);
    }
    return { activeCompanyId: this.activeCompanyId, company: null };
  }
  /**
   * Altera a empresa ativa diretamente no Banco Central / Firestore e notifica outros navegadores
   */
  async setActiveCompany(companyId) {
    if (!companyId) return false;
    this.activeCompanyId = companyId;
    try {
      const res = await fetch("/api/companies/active", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ activeCompanyId: companyId })
      });
      if (res.ok) {
        if (this.broadcastChannel) {
          try {
            this.broadcastChannel.postMessage({
              type: "active_company_changed",
              activeCompanyId: companyId,
              timestamp: Date.now()
            });
          } catch (e) {
          }
        }
        this.notifyListeners(companyId, null);
        return true;
      }
    } catch (err) {
      console.warn("[CompanyStateService] Erro ao gravar empresa ativa no servidor:", err);
    }
    this.notifyListeners(companyId, null);
    return false;
  }
  /**
   * Busca lista oficial de empresas autorizadas diretamente do PostgreSQL / Cloud SQL
   */
  async getCompanies(username) {
    try {
      const q = username ? `&username=${encodeURIComponent(username)}` : "";
      const res = await fetch(`/api/companies?t=${Date.now()}${q}`, {
        method: "GET",
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.companies || [];
        if (Array.isArray(list) && list.length > 0) {
          this.cachedCompanies = list;
          if (typeof window !== "undefined") {
            window.__allCompanies = list;
          }
          return list;
        }
      }
    } catch (err) {
      console.warn("[CompanyStateService] Falha ao buscar lista de empresas:", err);
    }
    if (typeof window !== "undefined" && Array.isArray(window.__allCompanies)) {
      return window.__allCompanies;
    }
    return this.cachedCompanies;
  }
  /**
   * Registra uma nova empresa diretamente no PostgreSQL e Firestore
   */
  async registerCompany(companyData) {
    try {
      const res = await fetch("/api/companies/register", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(companyData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.company) {
          const comp = json.company;
          this.cachedCompanies.push(comp);
          if (typeof window !== "undefined") {
            window.__allCompanies = this.cachedCompanies;
          }
          return comp;
        }
      }
    } catch (err) {
      console.warn("[CompanyStateService] Erro ao registrar empresa no banco:", err);
    }
    return null;
  }
  /**
   * Inscrição em alterações de empresa ativa (concorrência multi-navegador)
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  notifyListeners(activeCompanyId, company) {
    this.listeners.forEach((fn) => {
      try {
        fn(activeCompanyId, company);
      } catch (e) {
      }
    });
  }
}
const companyStateService = new CompanyStateService();
export {
  companyStateService
};
