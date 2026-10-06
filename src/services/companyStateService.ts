/**
 * MotorDesk - Direct Company State Service Layer
 * 
 * Camada de serviço de conexão direta com o banco de dados (PostgreSQL / Google Cloud Firestore)
 * através da API proxy dedicada /api/companies/active e /api/companies.
 * 
 * Substitui o armazenamento local no gerenciamento de estados de empresas,
 * eliminando discrepâncias de cache entre navegadores (Firefox, Chrome, Opera).
 */

import { CompanyInfo } from '../types';

export interface CompanyStateResponse {
  activeCompanyId: string;
  company: CompanyInfo | null;
  companies: CompanyInfo[];
}

type CompanyChangeListener = (activeCompanyId: string, company: CompanyInfo | null) => void;

class CompanyStateService {
  private activeCompanyId: string = 'comp-1';
  private cachedCompanies: CompanyInfo[] = [];
  private listeners: Set<CompanyChangeListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private sseSource: EventSource | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Ouvir canal BroadcastChannel local
      if ('BroadcastChannel' in window) {
        try {
          this.broadcastChannel = new BroadcastChannel('motordesk_company_state');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'active_company_changed') {
              this.activeCompanyId = event.data.activeCompanyId;
              this.notifyListeners(this.activeCompanyId, event.data.company || null);
            }
          };
        } catch (e) {}
      }

      // 2. Expor serviço globalmente
      (window as any).__motorDeskCompanyService = this;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };

    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('motordesk_auth_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const activeUserStr = localStorage.getItem('motordesk_active_user');
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          if (u.id) headers['X-User-Id'] = u.id;
          if (u.role) headers['X-User-Role'] = u.role;
        } catch (e) {}
      }
    }
    return headers;
  }

  /**
   * Obtém a empresa ativa diretamente do Banco Central / Firestore
   */
  public async getActiveCompany(): Promise<{ activeCompanyId: string; company: CompanyInfo | null }> {
    try {
      const res = await fetch(`/api/companies/active?t=${Date.now()}`, {
        method: 'GET',
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
      console.warn('[CompanyStateService] Falha ao consultar empresa ativa no servidor:', err);
    }

    return { activeCompanyId: this.activeCompanyId, company: null };
  }

  /**
   * Altera a empresa ativa diretamente no Banco Central / Firestore e notifica outros navegadores
   */
  public async setActiveCompany(companyId: string): Promise<boolean> {
    if (!companyId) return false;
    this.activeCompanyId = companyId;

    if (typeof window !== 'undefined') {
      if ((window as any).__motorDeskFirestore?.setActiveCompany) {
        try {
          (window as any).__motorDeskFirestore.setActiveCompany(companyId);
        } catch (e) {}
      }
    }

    try {
      const res = await fetch('/api/companies/active', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ activeCompanyId: companyId })
      });

      if (res.ok) {
        // Transmitir via BroadcastChannel
        if (this.broadcastChannel) {
          try {
            this.broadcastChannel.postMessage({
              type: 'active_company_changed',
              activeCompanyId: companyId,
              timestamp: Date.now()
            });
          } catch (e) {}
        }

        this.notifyListeners(companyId, null);
        return true;
      }
    } catch (err) {
      console.warn('[CompanyStateService] Erro ao gravar empresa ativa no servidor:', err);
    }

    this.notifyListeners(companyId, null);
    return false;
  }

  /**
   * Busca lista oficial de empresas autorizadas diretamente do PostgreSQL / Cloud SQL
   */
  public async getCompanies(username?: string): Promise<CompanyInfo[]> {
    try {
      const q = username ? `&username=${encodeURIComponent(username)}` : '';
      const res = await fetch(`/api/companies?t=${Date.now()}${q}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (res.ok) {
        const json = await res.json();
        const list = json.companies || [];
        if (Array.isArray(list) && list.length > 0) {
          this.cachedCompanies = list;
          if (typeof window !== 'undefined') {
            (window as any).__allCompanies = list;
          }
          return list;
        }
      }
    } catch (err) {
      console.warn('[CompanyStateService] Falha ao buscar lista de empresas:', err);
    }

    if (typeof window !== 'undefined' && Array.isArray((window as any).__allCompanies)) {
      return (window as any).__allCompanies;
    }

    return this.cachedCompanies;
  }

  /**
   * Registra uma nova empresa diretamente no PostgreSQL e Firestore
   */
  public async registerCompany(companyData: Partial<CompanyInfo>): Promise<CompanyInfo | null> {
    try {
      const res = await fetch('/api/companies/register', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(companyData)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.company) {
          const comp = json.company;
          this.cachedCompanies.push(comp);
          if (typeof window !== 'undefined') {
            (window as any).__allCompanies = this.cachedCompanies;
          }
          return comp;
        }
      }
    } catch (err) {
      console.warn('[CompanyStateService] Erro ao registrar empresa no banco:', err);
    }
    return null;
  }

  /**
   * Inscrição em alterações de empresa ativa (concorrência multi-navegador)
   */
  public subscribe(listener: CompanyChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(activeCompanyId: string, company: CompanyInfo | null) {
    this.listeners.forEach((fn) => {
      try {
        fn(activeCompanyId, company);
      } catch (e) {}
    });
  }
}

export const companyStateService = new CompanyStateService();
