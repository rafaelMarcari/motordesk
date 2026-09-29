/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getDatabase, 
  saveDatabase, 
  resetDatabase, 
  INITIAL_ALERT_SETTINGS,
  AppDatabase 
} from './data/mockData';
import { dataProvider } from './services/dataProvider';
import { mergeDatabases } from './utils/dbSync';
import { 
  User, 
  UserPermissions,
  Client, 
  Vehicle, 
  Part, 
  StockMovement,
  Service, 
  Budget, 
  ServiceOrder, 
  HistoryEntry, 
  TestCase,
  CompanyInfo,
  BusinessType,
  SystemNotification,
  AlertSettings,
  MaintenanceLog,
  PaymentMethodOption,
  TaxOperationNature,
  TaxRule,
  XmlImportRecord,
  Carrier,
  UnitOfMeasure,
  ExpenseCategoryItem
} from './types';

// Icons for navigation
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Package, 
  Wrench, 
  FileSpreadsheet, 
  ClipboardList, 
  History, 
  BarChart3, 
  UserPlus, 
  UserCircle, 
  Bug, 
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut, 
  Lock, 
  AlertTriangle, 
  Building2, 
  CheckCircle, 
  Bell, 
  ShoppingBag, 
  Truck,
  Boxes,
  DollarSign, 
  Wallet, 
  ArrowDownRight, 
  Receipt, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  Wrench as ToolIcon,
  Ruler,
  Factory,
  Zap,
  Eye,
  EyeOff,
  Clock,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

// View Imports
import DashboardView from './components/DashboardView';
import ClientsView from './components/ClientsView';
import VehiclesView from './components/VehiclesView';
import PartsView from './components/PartsView';
import ServicesView from './components/ServicesView';
import BudgetsView from './components/BudgetsView';
import ServiceOrdersView from './components/ServiceOrdersView';
import HistoryView from './components/HistoryView';
import ReportsView from './components/ReportsView';
import UserManagementView from './components/UserManagementView';
import ProfileView from './components/ProfileView';
import QAPortfolioView from './components/QAPortfolioView';
import DataMigrationConverterView from './components/DataMigrationConverterView';
import QuotationsSuppliersView from './components/QuotationsSuppliersView';
import AccountsReceivableView from './components/AccountsReceivableView';
import AccountsPayableView from './components/AccountsPayableView';
import FinancialView from './components/FinancialView';
import FiscalSefazView from './components/FiscalSefazView';
import FiscalConferenceView from './components/FiscalConferenceView';
import { TaxObligationsView } from './components/TaxObligationsView';
import { AccessGroupsManagementView } from './components/AccessGroupsManagementView';
import { SalesView } from './components/SalesView';
import WithdrawalView from './components/WithdrawalView';
import CarriersView from './components/CarriersView';
import UnitsOfMeasureView from './components/UnitsOfMeasureView';
import IndustrialView from './components/IndustrialView';
import { NotificationEngineView } from './components/NotificationEngineView';
import { RepresentativeCommerceView } from './components/RepresentativeCommerceView';
import NotificationToastPopup from './components/NotificationToastPopup';
import NotificationsModal from './components/NotificationsModal';
import LandingPresentationView, { LandingContent } from './components/LandingPresentationView';
import { FocusNotasApiPortalView } from './components/FocusNotasApiPortalView';
import motordeskLogoImg from './assets/images/motordesk_logo_1786534067989.jpg';
import FullDocumentationModal from './components/FullDocumentationModal';
import PrivacyLgpdModal, { PrivacyLgpdFooter } from './components/PrivacyLgpdModal';
import { sweepExpiredBudgets, checkLowStockAlerts, checkFinancialDueAlerts } from './utils/stockUtils';
import { syncServiceOrdersWithBudgets } from './utils/serviceOrderUtils';
import { AccountReceivable, AccountPayable, FinancialTransaction, FiscalDocument, BoletoDocument, InterBranchSaleLogistics, SefazApiConfig, TaxObligationGuide, AccessGroup, ViewID } from './types';
import { Globe, FileText, FileCheck2, Scale, Shield } from 'lucide-react';
import {
  getBusinessType,
  normalizeBusinessType,
  isWorkshopBusiness,
  isCommerceBusiness,
  isPureWorkshop,
  isPureCommerce,
  isHybridBusiness,
  isViewAllowedForBusinessType,
  isModuleAllowedForBusinessType,
  getFallbackViewForBusinessType,
  getAvailableViewsForBusinessType,
  getSegmentMetadata,
  normalizeUser,
  normalizeUserPermissions
} from './utils/businessSegmentation';
import { getEffectivePermissions, isModuleContractedForCompany, canAccessView, isCompanyActive, getSafeAccessibleFallbackView } from './utils/securityUtils';

const VIEW_PERMISSION_MAP: Record<ViewID, keyof UserPermissions | null> = {
  dashboard: 'accessDashboard',
  sales: 'accessSales',
  withdrawals: 'accessWithdrawals',
  fiscal_conference: 'accessFiscal',
  carriers: 'accessCarriers',
  units_of_measure: 'accessUnitsOfMeasure',
  clients: 'accessClients',
  vehicles: 'accessVehicles',
  parts: 'accessParts',
  quotations: 'accessQuotations',
  accounts_receivable: 'accessAccountsReceivable',
  accounts_payable: 'accessAccountsPayable',
  financial: 'accessFinancial',
  fiscal: 'accessFiscal',
  tax_obligations: 'accessFiscal',
  access_groups: 'accessUserManagement',
  notifications_engine: 'accessNotificationsEngine',
  representative_commerce: 'accessRepresentativeCommerce',
  representative_orders: 'accessRepresentativeOrders',
  representative_reconciliation: 'accessRepresentativeCommerce',
  services: 'accessServices',
  budgets: 'accessBudgets',
  serviceOrders: 'accessServiceOrders',
  history: 'accessHistory',
  reports: 'accessReports',
  users: 'accessUserManagement',
  profile: null,
  qa_panel: 'accessQAPanel',
  data_migration: 'accessQAPanel',
  industry: 'accessProduction'
};

export default function App() {
  // 1. Core DB State (Instant Local Cache + Silent Async Cloud Sync)
  const [db, setDb] = useState<AppDatabase>(() => getDatabase());
  
  // 2. Auth State & Multi-tenant Company Tracking
  const [activeCompanyIdState, setActiveCompanyIdState] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem('motordesk_active_company_id') || '';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // ------------------------------------------------------------------------
    // POLÍTICA ESTRITA DE SEGURANÇA: SEMPRE PEDIR SENHA AO ACESSAR O SISTEMA
    // ------------------------------------------------------------------------
    // Nunca realiza login direto ou restauração automática de sessão sem senha.
    // O usuário é sempre direcionado para a tela de autenticação onde a senha é obrigatória.
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlView = searchParams.get('view');
        const hashView = window.location.hash.replace('#', '');
        const savedView = localStorage.getItem('motordesk_active_view');
        const intended = urlView || hashView || savedView;
        if (intended) {
          localStorage.setItem('motordesk_intended_view', intended);
        }
        // Limpa tokens antigos para garantir que a autenticação por senha ocorra
        localStorage.removeItem('motordesk_auth_token');
        localStorage.removeItem('motordesk_active_user');
      } catch (e) {}
    }
    return null;
  });

  const [loginUsername, setLoginUsername] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return 'validador';
    const saved = localStorage.getItem('motordesk_saved_username');
    if (saved && saved !== 'admin') return saved;
    return 'validador';
  });
  const [loginPassword, setLoginPassword] = useState<string>('Donatelo@123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string>('');
  const [selectedLoginCompanyId, setSelectedLoginCompanyId] = useState<string>('');
  const [loginError, setLoginError] = useState('');
  const [loginHistory, setLoginHistory] = useState<{username: string, name: string, role: string, lastAccess: string}[]>([]);
  const [loginTab, setLoginTab] = useState<'login' | 'register_company' | 'link_token'>('login');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenFeedback, setTokenFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasAcceptedLoginLgpd, setHasAcceptedLoginLgpd] = useState(true);

  // Multi-tenant Company Registration States - Pre-filled by default for streamlined onboarding
  const [regCompName, setRegCompName] = useState('MotorDesk Centro Automotivo & Peças LTDA');
  const [regCompCnpj, setRegCompCnpj] = useState('24.789.102/0001-45');
  const [regCompBusinessType, setRegCompBusinessType] = useState<BusinessType>('OFICINA_COMERCIO');
  const [regCompWhatsapp, setRegCompWhatsapp] = useState('11987654321');
  const [regCompPhone, setRegCompPhone] = useState('(11) 3456-7890');
  const [regCompEmail, setRegCompEmail] = useState('contato@motordeskoficina.com.br');
  const [regCompAddress, setRegCompAddress] = useState('Av. das Nações Unidas, 1500 - Bloco B - São Paulo - SP, CEP 04578-000');
  const [regAdminName, setRegAdminName] = useState('Validador QA');
  const [regAdminUsername, setRegAdminUsername] = useState('validador');
  const [regAdminPassword, setRegAdminPassword] = useState('Donatelo@123');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [globalModules, setGlobalModules] = useState<{ [key: string]: boolean }>({
    accessDashboard: true,
    accessClients: true,
    accessVehicles: true,
    accessParts: true,
    accessQuotations: true,
    accessServices: true,
    accessBudgets: true,
    accessServiceOrders: true,
    accessAccountsReceivable: true,
    accessAccountsPayable: true,
    accessFinancial: true,
    accessFiscal: true,
    accessHistory: true,
    accessReports: true,
    accessUserManagement: true,
  });

  // 3. Navigation State
  const [activeView, setActiveView] = useState<ViewID>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlView = searchParams.get('view');
      if (urlView) return urlView as ViewID;
      const hashView = window.location.hash.replace('#', '');
      if (hashView) return hashView as ViewID;
      const savedView = localStorage.getItem('motordesk_active_view');
      if (savedView) return savedView as ViewID;
    }
    return 'dashboard';
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && activeView) {
      localStorage.setItem('motordesk_active_view', activeView);
    }
  }, [activeView]);

  const [isNotasApiOpen, setIsNotasApiOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      return path.includes('notas-api') || search.includes('notas-api');
    }
    return false;
  });

  const [isLanding, setIsLanding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path.includes('notas-api') || search.includes('notas-api')) {
        return false;
      }
      if (search.includes('landing=true')) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        if (path.includes('notas-api') || search.includes('notas-api')) {
          setIsNotasApiOpen(true);
          return;
        }
        setIsNotasApiOpen(false);
        if (path.startsWith('/motordesk')) {
          setIsLanding(false);
        } else {
          setIsLanding(true);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSystem = () => {
    setIsLanding(false);
    if (typeof window !== 'undefined' && !window.location.pathname.toLowerCase().startsWith('/motordesk')) {
      window.history.pushState({}, '', '/motordesk');
    }
  };

  const openLanding = () => {
    setIsLanding(true);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  // 4. Unsaved Changes Interceptor State
  const [unsavedTask, setUnsavedTask] = useState<{
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null>(null);

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState<ViewID | 'logout' | null>(null);

  // 5. Notifications & Alert Settings State
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);

  const handleAddNotification = (newNotif: SystemNotification) => {
    const formatted: SystemNotification = {
      ...newNotif,
      companyId: newNotif.companyId || currentUser?.companyId || db?.companyInfo?.id || 'comp-1'
    };
    setDb(prev => {
      if (!prev) return prev;
      const currentNotifs = prev.notifications || [];
      const updatedNotifs = [formatted, ...currentNotifs];
      const updatedDb = { ...prev, notifications: updatedNotifs };
      saveDatabase(updatedDb);
      return updatedDb;
    });
  };

  const handleMarkAllNotificationsRead = () => {
    setDb(prev => {
      if (!prev) return prev;
      const currentNotifs = prev.notifications || [];
      const updatedNotifs = currentNotifs.map(n => 
        (n.companyId || 'comp-1') === activeCompanyId ? { ...n, read: true } : n
      );
      const updatedDb = { ...prev, notifications: updatedNotifs };
      saveDatabase(updatedDb);
      return updatedDb;
    });
  };

  const handleClearNotifications = () => {
    setDb(prev => {
      if (!prev) return prev;
      const remainingNotifs = (prev.notifications || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const updatedDb = { ...prev, notifications: remainingNotifs };
      saveDatabase(updatedDb);
      return updatedDb;
    });
  };

  const handleSaveAlertSettings = (newSettings: AlertSettings) => {
    setDb(prev => {
      const updatedDb = { ...prev, alertSettings: newSettings };
      saveDatabase(updatedDb);
      return updatedDb;
    });
    handleAddHistoryLog(
      'system',
      'Parâmetros de Alerta Atualizados',
      'Configurações de notificações de estoque, orçamentos e Ordens de Serviço atualizadas com sucesso.',
      'system',
      'system'
    );
  };

  // 6. Sidebar Retractable / Collapsed State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('motordesk_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isFinSubmenuOpen, setIsFinSubmenuOpen] = useState<boolean>(false);

  // Sync collapsed state when currentUser logs in or changes
  useEffect(() => {
    if (currentUser) {
      const savedUserPreference = localStorage.getItem(`motordesk_sidebar_collapsed_${currentUser.username}`);
      if (savedUserPreference !== null) {
        setIsSidebarCollapsed(JSON.parse(savedUserPreference));
      }
    }
  }, [currentUser]);

  // Ensure activeView remains accessible whenever currentUser or permissions change
  useEffect(() => {
    if (!currentUser) return;

    const requiredPerm = VIEW_PERMISSION_MAP[activeView];
    const isAllowed = requiredPerm ? (currentUser.permissions[requiredPerm] ?? true) : true;
    if (!isAllowed) {
      const firstAllowed = (Object.keys(VIEW_PERMISSION_MAP) as ViewID[]).find(v => {
        const perm = VIEW_PERMISSION_MAP[v];
        return perm === null || (currentUser.permissions[perm] ?? true);
      });
      setActiveView(firstAllowed || 'profile');
    }
  }, [currentUser, activeView]);

  const toggleSidebarCollapse = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    if (currentUser) {
      localStorage.setItem(`motordesk_sidebar_collapsed_${currentUser.username}`, JSON.stringify(nextState));
    }
    localStorage.setItem('motordesk_sidebar_collapsed', JSON.stringify(nextState));
  };

  // Initialize DB from PostgreSQL Cloud SQL (or local cache) and login history
  useEffect(() => {
    let isMounted = true;
    const loadDbAsync = async () => {
      const bootStartTime = performance.now();
      console.log(`[BOOT] AUTH_START timestamp=${new Date().toISOString()}`);
      const authToken = localStorage.getItem('motordesk_auth_token');
      console.log(`[BOOT] AUTH_SUCCESS timestamp=${new Date().toISOString()} hasToken=${Boolean(authToken)}`);

      console.log(`[BOOT] DATABASE_LOAD_START timestamp=${new Date().toISOString()}`);
      console.log(`[BOOT] DATABASE_GET_START timestamp=${new Date().toISOString()}`);
      const getStart = performance.now();

      try {
        const loadedDb = await dataProvider.getDatabase();
        const getEnd = performance.now();
        console.log(`[BOOT] DATABASE_GET_SUCCESS latencyMs=${Math.round(getEnd - getStart)}`);
        console.log(`[BOOT] DATABASE_GET_END timestamp=${new Date().toISOString()}`);

        if (!isMounted) return;

        if (loadedDb.serviceOrders && loadedDb.budgets) {
          const { updatedOrders, hasChanges } = syncServiceOrdersWithBudgets(loadedDb.serviceOrders, loadedDb.budgets);
          if (hasChanges) {
            loadedDb.serviceOrders = updatedOrders;
          }
        }
        if (loadedDb.globalModules) {
          setGlobalModules(loadedDb.globalModules);
        }
        if (loadedDb.loginHistory) {
          setLoginHistory(loadedDb.loginHistory);
        }

        // Align active company ID with authoritative server database
        const serverCompanyId = loadedDb.companyInfo?.id;
        const targetCompanies = loadedDb.registeredCompanies || [];
        const isCurrentActiveValid = activeCompanyIdState && targetCompanies.some(c => c.id === activeCompanyIdState);
        
        const effectiveId = isCurrentActiveValid ? activeCompanyIdState : (serverCompanyId || targetCompanies[0]?.id || 'comp-1');
        if (effectiveId !== activeCompanyIdState) {
          setActiveCompanyIdState(effectiveId);
          try {
            localStorage.setItem('motordesk_active_company_id', effectiveId);
          } catch (e) {}
        }

        const activeComp = targetCompanies.find(c => c.id === effectiveId) || loadedDb.companyInfo;
        if (activeComp?.globalModules) {
          setGlobalModules(activeComp.globalModules);
        } else if (loadedDb.globalModules) {
          setGlobalModules(loadedDb.globalModules);
        }

        if (currentUser) {
          const rawUser = (loadedDb.users || []).find(
            u => u.id === currentUser.id || (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase())
          );
          if (rawUser) {
            const freshUser = normalizeUser({ ...rawUser, companyId: effectiveId }, effectiveId, loadedDb);
            setCurrentUser(freshUser);
            try {
              localStorage.setItem('motordesk_active_user', JSON.stringify(freshUser));
            } catch (e) {}
          }
        }

        const applyStart = performance.now();
        setDb(loadedDb);
        const applyEnd = performance.now();
        console.log(`[BOOT] DATABASE_STATE_APPLIED latencyMs=${Math.round(applyEnd - applyStart)}`);
        console.log(`[BOOT] APP_READY totalLatencyMs=${Math.round(performance.now() - bootStartTime)}`);
      } catch (e: any) {
        console.error('[BOOT] Falha ao inicializar banco de dados:', e);
        if (isMounted) {
          setDb(getDatabase());
        }
      }
    };

    // Register callback for background data merge events from server
    dataProvider.setDataMergedCallback((mergedDb: AppDatabase) => {
      setDb(prev => {
        const next = prev ? mergeDatabases(prev, mergedDb) : mergedDb;
        const empresas = (next.registeredCompanies || []).length;
        const usuarios = (next.users || []).length;
        const clientes = (next.clients || []).length;
        const veiculos = (next.vehicles || []).length;
        const pecas = (next.parts || []).length;
        const companyId = next.companyInfo?.id || 'none';
        console.log(`[TRACE-PERSISTENCE] APPLY SERVER STATE\ncompanyId=${companyId}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nupdatedAt=${new Date().toISOString()}\nsource=callback_merge`);
        return next;
      });
    });

    loadDbAsync();

    return () => { isMounted = false; };
  }, []);

  // Auto-sync database state from PostgreSQL Cloud SQL / Server backend on window/tab focus, visibility change & periodic polling (5s)
  useEffect(() => {
    let isSyncing = false;

    const syncWithServer = async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const remoteDb = await dataProvider.getDatabase();
        if (remoteDb) {
          setDb(prev => {
            const next = prev ? mergeDatabases(prev, remoteDb) : remoteDb;
            const empresas = (next.registeredCompanies || []).length;
            const usuarios = (next.users || []).length;
            const clientes = (next.clients || []).length;
            const veiculos = (next.vehicles || []).length;
            const pecas = (next.parts || []).length;
            const companyId = next.companyInfo?.id || 'none';
            console.log(`[TRACE-PERSISTENCE] APPLY SERVER STATE\ncompanyId=${companyId}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nupdatedAt=${new Date().toISOString()}\nsource=polling_merge`);
            return next;
          });

          if (remoteDb.globalModules) setGlobalModules(remoteDb.globalModules);
          if (remoteDb.loginHistory) setLoginHistory(remoteDb.loginHistory);
        }
      } catch (e) {
        console.error('Error auto-syncing DB with server:', e);
      } finally {
        isSyncing = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithServer();
      }
    };

    window.addEventListener('focus', syncWithServer);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Background polling every 5 seconds to keep all open browsers & devices in sync in real time
    const pollInterval = setInterval(syncWithServer, 5000);

    return () => {
      window.removeEventListener('focus', syncWithServer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Run automatic budget expiration sweep, OS auto-sync, financial due alerts and low stock checks
  useEffect(() => {
    if (db && db.budgets && db.parts) {
      const sweepRes = sweepExpiredBudgets(db);
      const lowStockNotifs = checkLowStockAlerts(db);
      const financialDueNotifs = checkFinancialDueAlerts(db);
      const osSyncRes = db.serviceOrders ? syncServiceOrdersWithBudgets(db.serviceOrders, db.budgets) : { updatedOrders: db.serviceOrders, hasChanges: false };

      if (sweepRes.expiredCount > 0 || lowStockNotifs.length > 0 || financialDueNotifs.length > 0 || osSyncRes.hasChanges) {
        const mergedNotifications = [
          ...financialDueNotifs,
          ...lowStockNotifs,
          ...sweepRes.newNotifications,
          ...(db.notifications || [])
        ];

        const mergedHistory = [
          ...sweepRes.newHistoryLogs,
          ...(db.history || [])
        ];

        setDb(prev => {
          const updatedDb: AppDatabase = {
            ...prev,
            budgets: sweepRes.updatedBudgets,
            serviceOrders: osSyncRes.hasChanges ? osSyncRes.updatedOrders : prev.serviceOrders,
            notifications: mergedNotifications,
            history: mergedHistory
          };
          saveDatabase(updatedDb);
          return updatedDb;
        });
      }
    }
  }, [db?.budgets?.length, db?.parts?.length, db?.serviceOrders?.length, db?.accountsReceivable?.length, db?.accountsPayable?.length]);

  // User Accessible Companies: return all companies for admin, validador, or users with wildcard; otherwise strictly user-associated companies
  const userAccessibleCompanies = React.useMemo(() => {
    const all = db?.registeredCompanies && db.registeredCompanies.length > 0
      ? db.registeredCompanies
      : [db?.companyInfo || { id: 'comp-1', name: 'MotorDesk', cnpj: '', phone: '', whatsapp: '', email: '', address: '', welcomeMessage: '', registeredAt: '' }];

    if (!currentUser) return all;

    const cleanUsername = currentUser.username.toLowerCase();
    if (
      cleanUsername === 'validador' ||
      cleanUsername === 'admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'qa' ||
      (Array.isArray(currentUser.allowedCompanyIds) && currentUser.allowedCompanyIds.includes('*'))
    ) {
      return all;
    }

    const userRecords = (db?.users || []).filter(u => u && u.username && u.username.toLowerCase() === cleanUsername && u.status !== 'terminated' && !u.isTerminated);
    const accessibleCompanyIds = new Set<string>();

    userRecords.forEach(u => {
      if (u.companyId) accessibleCompanyIds.add(u.companyId);
      if (Array.isArray(u.allowedCompanyIds)) {
        u.allowedCompanyIds.forEach(id => {
          if (id && id !== '*') accessibleCompanyIds.add(id);
        });
      }
    });

    if (currentUser.companyId) accessibleCompanyIds.add(currentUser.companyId);
    if (Array.isArray(currentUser.allowedCompanyIds)) {
      currentUser.allowedCompanyIds.forEach(id => {
        if (id && id !== '*') accessibleCompanyIds.add(id);
      });
    }

    const filtered = all.filter(c => accessibleCompanyIds.has(c.id));
    return filtered.length > 0 ? filtered : all.filter(c => c.id === (currentUser.companyId || 'comp-1'));
  }, [db?.registeredCompanies, db?.companyInfo, db?.users, currentUser]);

  // Multi-tenant scoping helper: derive active company ID for current logged user
  const activeCompanyId = React.useMemo(() => {
    if (currentUser) {
      const allowedIds = userAccessibleCompanies.map(c => c.id);
      if (activeCompanyIdState && allowedIds.includes(activeCompanyIdState)) {
        return activeCompanyIdState;
      }
      if (currentUser.companyId && allowedIds.includes(currentUser.companyId)) {
        return currentUser.companyId;
      }
      if (allowedIds.length > 0) {
        return allowedIds[0];
      }
    }
    if (activeCompanyIdState && (db?.registeredCompanies || []).some(c => c.id === activeCompanyIdState)) {
      return activeCompanyIdState;
    }
    if (currentUser?.companyId && (db?.registeredCompanies || []).some(c => c.id === currentUser.companyId)) {
      return currentUser.companyId;
    }
    if (db?.companyInfo?.id && (db?.registeredCompanies || []).some(c => c.id === db.companyInfo.id)) {
      return db.companyInfo.id;
    }
    if (db?.registeredCompanies && db.registeredCompanies.length > 0) {
      return db.registeredCompanies[0].id;
    }
    return db?.companyInfo?.id || 'comp-1';
  }, [activeCompanyIdState, currentUser, userAccessibleCompanies, db?.registeredCompanies, db?.companyInfo?.id]);

  const activeCompanyObj = React.useMemo(() => {
    return (db?.registeredCompanies || []).find(c => c.id === activeCompanyId) || db?.companyInfo;
  }, [db?.registeredCompanies, db?.companyInfo, activeCompanyId]);

  const activeCompanyModules = React.useMemo(() => {
    return activeCompanyObj?.globalModules || globalModules;
  }, [activeCompanyObj?.globalModules, globalModules]);

  const activeBusinessType = getBusinessType(activeCompanyObj);
  const activeSegmentMeta = getSegmentMetadata(activeBusinessType);

  // Keep currentUser permissions in sync with db.users and active company licensing in real time
  useEffect(() => {
    if (db && currentUser) {
      const rawUser = (db.users || []).find(
        u => u.id === currentUser.id || (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase())
      );
      if (rawUser) {
        const freshUser = normalizeUser({ ...rawUser, companyId: activeCompanyId }, activeCompanyId, db);
        if (
          JSON.stringify(freshUser.permissions) !== JSON.stringify(currentUser.permissions) ||
          freshUser.role !== currentUser.role ||
          freshUser.name !== currentUser.name ||
          freshUser.companyId !== currentUser.companyId
        ) {
          setCurrentUser(freshUser);
        }
      }
    }
  }, [db, activeCompanyId, currentUser?.id]);

  // Multi-tab synchronization: keep activeCompanyIdState in sync without overwriting memory DB with stale localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'motordesk_active_company_id' && e.newValue && e.newValue !== activeCompanyIdState) {
        setActiveCompanyIdState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeCompanyIdState]);

  // Fallback activeView if current module permission is revoked
  useEffect(() => {
    if (!currentUser) return;
    const requiredPerm = VIEW_PERMISSION_MAP[activeView];
    if (requiredPerm !== null && requiredPerm !== undefined && !currentUser.permissions[requiredPerm]) {
      const firstAllowed = (Object.keys(VIEW_PERMISSION_MAP) as ViewID[]).find(v => {
        const perm = VIEW_PERMISSION_MAP[v];
        return (perm === null || Boolean(currentUser.permissions[perm])) && isViewAllowedForBusinessType(v, activeBusinessType);
      });
      setActiveView(firstAllowed || 'profile');
    }
  }, [currentUser?.permissions, activeView, activeBusinessType]);

  const handleUpdateGlobalModules = (updatedModules: { [key: string]: boolean }) => {
    setGlobalModules(updatedModules);
    syncDb(prev => {
      const updatedRegComps = (prev.registeredCompanies || []).map(c => {
        if (c.id === activeCompanyId) {
          return { ...c, globalModules: updatedModules };
        }
        return c;
      });
      const updatedCompInfo = prev.companyInfo && prev.companyInfo.id === activeCompanyId
        ? { ...prev.companyInfo, globalModules: updatedModules }
        : prev.companyInfo;

      return {
        ...prev,
        globalModules: updatedModules,
        registeredCompanies: updatedRegComps,
        companyInfo: updatedCompInfo
      };
    });
    
    // Log in history
    handleAddHistoryLog(
      'system',
      'Liberação de Módulos Globais Atualizada',
      'Configurações de liberação e ativação global de módulos atualizadas com sucesso pelo administrador.',
      'system',
      'system'
    );
  };

  // Save changes to DB helper with state consistency
  const syncDb = (updater: AppDatabase | ((prev: AppDatabase) => AppDatabase)) => {
    setDb(prev => {
      if (!prev) return prev;
      const nextDb = typeof updater === 'function' ? updater(prev) : updater;
      saveDatabase(nextDb);
      return nextDb;
    });
  };

  const handleSaveLandingContent = (newContent: LandingContent) => {
    syncDb(prev => ({
      ...prev,
      landingContent: newContent
    }));
  };

  const isModuleLocked = React.useCallback((permissionKey: string) => {
    if (!activeCompanyObj) return true;

    // Empresa inativa ou bloqueada tem todos os módulos operacionais bloqueados
    if (!isCompanyActive(activeCompanyObj)) {
      if (permissionKey === 'accessUserManagement' && (currentUser?.role === 'admin' || currentUser?.username?.toLowerCase() === 'admin')) {
        return false;
      }
      return true;
    }

    // Regra central de Contrato e Segmentação da Empresa
    if (!isModuleContractedForCompany(permissionKey, activeCompanyObj, activeBusinessType)) {
      return true;
    }

    // Override explícito em globalModules
    if (activeCompanyObj.globalModules && activeCompanyObj.globalModules[permissionKey] === false) {
      return true;
    }

    return activeCompanyModules[permissionKey as keyof typeof activeCompanyModules] === false;
  }, [activeCompanyObj, activeBusinessType, activeCompanyModules, currentUser]);

  // Decisão unificada e autoritativa de exibição de itens de menu e acesso a telas:
  // Só exibe o que foi efetivamente CONTRATADO pela empresa e cujo usuário possui permissão ativa.
  // Mesmo para o usuário master/admin, apenas os módulos contratados pela empresa são exibidos.
  // Se uma permissão for removida do usuário ou do contrato, o item é removido imediatamente da navegação.
  const isViewAccessible = React.useCallback((viewId: ViewID | string): boolean => {
    return canAccessView(activeCompanyObj || db?.companyInfo, currentUser, viewId, db);
  }, [activeCompanyObj, currentUser, db]);

  // Auto-redirect if active view is not supported by current company business type or not accessible
  useEffect(() => {
    if (!currentUser) return;
    if (!canAccessView(activeCompanyObj, currentUser, activeView, db)) {
      const fallback = getSafeAccessibleFallbackView(activeCompanyObj, currentUser, db);
      setActiveView(fallback);
    }
  }, [activeCompanyId, activeBusinessType, currentUser, activeView, activeCompanyObj, db]);

  // Registered Companies List
  const registeredCompaniesList: CompanyInfo[] = db?.registeredCompanies && db.registeredCompanies.length > 0
    ? db.registeredCompanies
    : [db?.companyInfo || { id: 'comp-1', name: 'MotorDesk', cnpj: '', phone: '', whatsapp: '', email: '', address: '', welcomeMessage: '', registeredAt: '' }];

  // Switch Active Company Workspace (for Admin / QA users)
  const handleSwitchCompanyWorkspace = (targetCompanyId: string, optionalTargetComp?: CompanyInfo) => {
    if (!currentUser) return;
    const targetComp = optionalTargetComp || 
      (db?.registeredCompanies || []).find(c => c.id === targetCompanyId) || 
      (db?.companyInfo?.id === targetCompanyId ? db?.companyInfo : null);
    if (!targetComp) {
      console.warn(`[WorkspaceSwitch] Company ${targetCompanyId} not found`);
      return;
    }

    const allowedIds = userAccessibleCompanies.map(c => c.id);
    if (!allowedIds.includes(targetCompanyId) && currentUser.role !== 'qa') {
      console.warn(`[WorkspaceSwitch] User ${currentUser.username} is not authorized for company ${targetCompanyId}`);
      return;
    }

    setActiveCompanyIdState(targetCompanyId);
    try {
      localStorage.setItem('motordesk_active_company_id', targetCompanyId);
    } catch (e) {}

    if (targetComp.globalModules) {
      setGlobalModules(targetComp.globalModules);
    }

    setDb(prev => {
      if (!prev) return prev;
      const nextDb: AppDatabase = {
        ...prev,
        companyInfo: targetComp,
        globalModules: targetComp.globalModules || prev.globalModules,
      };
      dataProvider.saveDatabaseImmediate(nextDb);

      const updatedUser: User = normalizeUser({
        ...currentUser,
        companyId: targetCompanyId,
      }, targetCompanyId, nextDb);

      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('motordesk_active_user', JSON.stringify(updatedUser));
      } catch (e) {}

      if (!canAccessView(targetComp, updatedUser, activeView, nextDb)) {
        const fallback = getSafeAccessibleFallbackView(targetComp, updatedUser, nextDb);
        setActiveView(fallback);
      }

      return nextDb;
    });
  };

  // Scoped database view providing strict multi-tenant isolation and zero-leakage security (CT-LIC-15, CT-LIC-17)
  const scopedDb = React.useMemo<AppDatabase>(() => {
    if (!db) {
      return {
        companyInfo: { id: 'comp-1', name: '', cnpj: '', phone: '', whatsapp: '', email: '', address: '', welcomeMessage: '', registeredAt: '' },
        users: [], clients: [], vehicles: [], parts: [], services: [], budgets: [], serviceOrders: [], history: [], testCases: [], notifications: []
      };
    }

    const canClients = !isModuleLocked('accessClients') && Boolean(currentUser?.permissions?.accessClients);
    const canVehicles = !isModuleLocked('accessVehicles') && Boolean(currentUser?.permissions?.accessVehicles);
    const canProduction = !isModuleLocked('accessProduction') && (Boolean(currentUser?.permissions?.accessProduction) || Boolean(currentUser?.permissions?.accessIndustrialDashboard));
    const canParts = (!isModuleLocked('accessParts') && Boolean(currentUser?.permissions?.accessParts)) || canProduction;
    const canServices = !isModuleLocked('accessServices') && Boolean(currentUser?.permissions?.accessServices);
    const canBudgets = !isModuleLocked('accessBudgets') && Boolean(currentUser?.permissions?.accessBudgets);
    const canServiceOrders = !isModuleLocked('accessServiceOrders') && Boolean(currentUser?.permissions?.accessServiceOrders);
    const canQuotations = !isModuleLocked('accessQuotations') && Boolean(currentUser?.permissions?.accessQuotations);
    const canAccountsReceivable = !isModuleLocked('accessAccountsReceivable') && Boolean(currentUser?.permissions?.accessAccountsReceivable);
    const canAccountsPayable = !isModuleLocked('accessAccountsPayable') && Boolean(currentUser?.permissions?.accessAccountsPayable);
    const canFinancial = !isModuleLocked('accessFinancial') && Boolean(currentUser?.permissions?.accessFinancial);
    const canSales = !isModuleLocked('accessSales') && Boolean(currentUser?.permissions?.accessSales);
    const canFiscal = !isModuleLocked('accessFiscal') && Boolean(currentUser?.permissions?.accessFiscal);
    const canCarriers = !isModuleLocked('accessCarriers') && Boolean(currentUser?.permissions?.accessCarriers);
    const canUnits = !isModuleLocked('accessUnitsOfMeasure') && Boolean(currentUser?.permissions?.accessUnitsOfMeasure);
    const canWithdrawals = !isModuleLocked('accessWithdrawals') && (currentUser?.permissions?.accessWithdrawals ?? true);

    return {
      ...db,
      companyInfo: activeCompanyObj || db.companyInfo,
      sefazConfig: activeCompanyObj?.sefazConfig || db.sefazConfig,
      registeredCompanies: userAccessibleCompanies,
      clients: canClients ? (db.clients || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      vehicles: canVehicles ? (db.vehicles || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      parts: canParts ? (db.parts || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      services: canServices ? (db.services || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      budgets: canBudgets ? (db.budgets || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      serviceOrders: canServiceOrders ? (db.serviceOrders || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      history: (db.history || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      suppliers: (canQuotations || canParts) ? (db.suppliers || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      quotations: canQuotations ? (db.quotations || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      accountsReceivable: canAccountsReceivable ? (db.accountsReceivable || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      accountsPayable: canAccountsPayable ? (db.accountsPayable || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      financialTransactions: canFinancial ? (db.financialTransactions || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      users: (db.users || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      notifications: (db.notifications || [])
        .filter(item => (item.companyId || 'comp-1') === activeCompanyId)
        .filter(item => {
          if ((item.type === 'stock_low' || item.type === 'stock_expired') && !canParts) return false;
          if ((item.type === 'service_order_created' || item.type === 'os_closed_by_mechanic') && !canServiceOrders) return false;
          if ((item.type === 'budget_created' || item.type === 'budget_converted' || item.type === 'budget_converted_to_sale') && !canBudgets) return false;
          if (item.type === 'sale_created' && !canSales) return false;
          if (item.type === 'receivable_due' && !canAccountsReceivable) return false;
          if (item.type === 'payable_due' && !canAccountsPayable) return false;
          return true;
        }),
      stockMovements: canParts ? (db.stockMovements || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      supplierPartPrices: (canQuotations || canParts) ? (db.supplierPartPrices || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      maintenanceLogs: (canVehicles || canServiceOrders) ? (db.maintenanceLogs || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      sales: canSales ? (db.sales || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      goodsWithdrawals: canWithdrawals ? (db.goodsWithdrawals || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      carriers: canCarriers ? (db.carriers || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      fiscalDocuments: canFiscal ? (db.fiscalDocuments || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      boletos: (canAccountsReceivable || canFiscal) ? (db.boletos || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      taxObligationGuides: canFiscal ? (db.taxObligationGuides || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      accessGroups: (db.accessGroups || []).filter(item => !item.companyId || item.companyId === '*' || item.isSystemDefault || (item.companyId || 'comp-1') === activeCompanyId),
      taxOperationNatures: db.taxOperationNatures || [],
      taxRules: db.taxRules || [],
      xmlImportRecords: db.xmlImportRecords || [],
      unitsOfMeasure: canUnits ? (db.unitsOfMeasure || []).filter(item => item.isGlobal || !item.companyId || (item.companyId || 'comp-1') === activeCompanyId) : [],
      boms: canProduction ? (db.boms || db.billOfMaterials || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      billOfMaterials: canProduction ? (db.boms || db.billOfMaterials || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      productionOrders: canProduction ? (db.productionOrders || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      productLots: canProduction ? (db.productLots || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId) : [],
      operationalAlerts: (db.operationalAlerts || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      monthlyAccountingClosings: (db.monthlyAccountingClosings || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
    };
  }, [db, activeCompanyId, activeCompanyObj, activeBusinessType, userAccessibleCompanies, currentUser?.permissions, isModuleLocked]);

  // State Updaters passed to Views (Preserving multi-tenant data for other companies)
  const handleSaveUnitsOfMeasure = (units: UnitOfMeasure[]) => {
    setDb(prev => {
      if (!prev) return prev;
      const otherCompanyUnits = (prev.unitsOfMeasure || []).filter(
        u => !u.isGlobal && u.companyId && (u.companyId || 'comp-1') !== activeCompanyId
      );
      const nextDb = { ...prev, unitsOfMeasure: [...otherCompanyUnits, ...units] };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };

  const handleSaveCarriers = (carriers: Carrier[]) => {
    const formatted = carriers.map(c => ({ ...c, companyId: c.companyId || activeCompanyId }));
    setDb(prev => {
      if (!prev) return prev;
      const other = (prev.carriers || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const nextDb = { ...prev, carriers: [...other, ...formatted] };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };
  const handleSaveClients = (clients: Client[]) => {
    if (currentUser && !currentUser.permissions?.accessClients) {
      alert('Acesso não permitido. Seu usuário não possui permissão para acessar este recurso.');
      return;
    }
    const formatted = clients.map(c => ({ ...c, companyId: c.companyId || activeCompanyId }));
    setDb(prev => {
      if (!prev) return prev;
      const other = (prev.clients || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const nextDb = { ...prev, clients: [...other, ...formatted] };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };

  const handleSaveVehicles = (vehicles: Vehicle[]) => {
    if (currentUser && !currentUser.permissions?.accessVehicles) {
      alert('Acesso não permitido. Seu usuário não possui permissão para acessar este recurso.');
      return;
    }
    const formatted = vehicles.map(v => ({ ...v, companyId: v.companyId || activeCompanyId }));
    setDb(prev => {
      if (!prev) return prev;
      const other = (prev.vehicles || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const nextDb = { ...prev, vehicles: [...other, ...formatted] };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };

  const handleSaveParts = (parts: Part[]) => {
    if (currentUser && !currentUser.permissions?.accessParts) {
      alert('Acesso não permitido. Seu usuário não possui permissão para acessar este recurso.');
      return;
    }
    const formatted = parts.map(p => ({ ...p, companyId: p.companyId || activeCompanyId }));
    syncDb(prev => {
      const other = (prev.parts || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, parts: [...other, ...formatted] };
    });
  };

  const handleSaveStockMovements = (stockMovements: StockMovement[]) => {
    const formatted = stockMovements.map(sm => ({ ...sm, companyId: sm.companyId || activeCompanyId }));
    syncDb(prev => {
      const other = (prev.stockMovements || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, stockMovements: [...other, ...formatted] };
    });
  };

  const handleSaveReceivables = (
    accountsReceivable: AccountReceivable[], 
    clients: Client[], 
    financialTransactions: FinancialTransaction[],
    notifications: SystemNotification[],
    paymentMethods?: PaymentMethodOption[]
  ) => {
    const formattedAR = accountsReceivable.map(ar => ({ ...ar, companyId: ar.companyId || activeCompanyId }));
    const formattedClients = clients.map(c => ({ ...c, companyId: c.companyId || activeCompanyId }));
    const formattedFT = financialTransactions.map(ft => ({ ...ft, companyId: ft.companyId || activeCompanyId }));
    const formattedNotifs = notifications.map(n => ({ ...n, companyId: n.companyId || activeCompanyId }));

    syncDb(prev => {
      const otherAR = (prev.accountsReceivable || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const otherClients = (prev.clients || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const otherFT = (prev.financialTransactions || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const otherNotifs = (prev.notifications || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);

      return {
        ...prev,
        accountsReceivable: [...otherAR, ...formattedAR],
        clients: [...otherClients, ...formattedClients],
        financialTransactions: [...otherFT, ...formattedFT],
        notifications: [...otherNotifs, ...formattedNotifs],
        ...(paymentMethods ? { paymentMethods } : {})
      };
    });
  };

  const handleSavePayables = (
    accountsPayable: AccountPayable[], 
    financialTransactions: FinancialTransaction[],
    expenseCategories?: ExpenseCategoryItem[]
  ) => {
    const formattedAP = accountsPayable.map(ap => ({ ...ap, companyId: ap.companyId || activeCompanyId }));
    const formattedFT = financialTransactions.map(ft => ({ ...ft, companyId: ft.companyId || activeCompanyId }));

    syncDb(prev => {
      const otherAP = (prev.accountsPayable || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const otherFT = (prev.financialTransactions || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);

      return {
        ...prev,
        accountsPayable: [...otherAP, ...formattedAP],
        financialTransactions: [...otherFT, ...formattedFT],
        ...(expenseCategories ? { expenseCategories } : {})
      };
    });
  };

  const handleSaveTransactions = (financialTransactions: FinancialTransaction[]) => {
    const formattedFT = financialTransactions.map(ft => ({ ...ft, companyId: ft.companyId || activeCompanyId }));
    syncDb(prev => {
      const otherFT = (prev.financialTransactions || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, financialTransactions: [...otherFT, ...formattedFT] };
    });
  };

  const handleSaveServices = (services: Service[]) => {
    const formatted = services.map(s => ({ ...s, companyId: s.companyId || activeCompanyId }));
    syncDb(prev => {
      const other = (prev.services || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, services: [...other, ...formatted] };
    });
  };

  const handleSaveBudgets = (budgets: Budget[]) => {
    const formatted = budgets.map(b => ({ ...b, companyId: b.companyId || activeCompanyId }));
    syncDb(prev => {
      const other = (prev.budgets || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, budgets: [...other, ...formatted] };
    });
  };

  const handleSaveServiceOrders = (serviceOrders: ServiceOrder[]) => {
    const formatted = serviceOrders.map(so => ({ ...so, companyId: so.companyId || activeCompanyId }));
    syncDb(prev => {
      const other = (prev.serviceOrders || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, serviceOrders: [...other, ...formatted] };
    });
  };

  const handleSaveMaintenanceLogs = (maintenanceLogs: MaintenanceLog[]) => {
    const formatted = maintenanceLogs.map(ml => ({ ...ml, companyId: ml.companyId || activeCompanyId }));
    syncDb(prev => {
      const other = (prev.maintenanceLogs || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, maintenanceLogs: [...other, ...formatted] };
    });
  };

  const handleSaveFiscalDocuments = (fiscalDocuments: FiscalDocument[]) => {
    syncDb(prev => ({ ...prev, fiscalDocuments }));
  };

  const handleSaveBoletos = (boletos: BoletoDocument[]) => {
    syncDb(prev => ({ ...prev, boletos }));
  };

  const handleSaveInterBranchSales = (interBranchSales: InterBranchSaleLogistics[]) => {
    syncDb(prev => ({ ...prev, interBranchSales }));
  };

  const handleSaveSefazConfig = (sefazConfig: SefazApiConfig) => {
    setDb(prev => {
      if (!prev) return prev;
      const currentList = prev.registeredCompanies && prev.registeredCompanies.length > 0 
        ? prev.registeredCompanies 
        : [prev.companyInfo || { id: activeCompanyId, name: '', cnpj: '', phone: '', whatsapp: '', email: '', address: '', welcomeMessage: '', registeredAt: '' }];

      const updatedList = currentList.map(c => c.id === activeCompanyId ? { ...c, sefazConfig } : c);
      
      const updatedActiveComp = (prev.companyInfo?.id === activeCompanyId) 
        ? { ...prev.companyInfo, sefazConfig } 
        : prev.companyInfo;

      const nextDb: AppDatabase = { 
        ...prev, 
        sefazConfig, // Global / current active fallback
        companyInfo: updatedActiveComp,
        registeredCompanies: updatedList
      };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };

  const handleSaveTaxOperationNatures = (taxOperationNatures: TaxOperationNature[]) => {
    syncDb(prev => ({ ...prev, taxOperationNatures }));
  };

  const handleSaveTaxRules = (taxRules: TaxRule[]) => {
    syncDb(prev => ({ ...prev, taxRules }));
  };

  const handleSaveXmlImportRecords = (xmlImportRecords: XmlImportRecord[]) => {
    syncDb(prev => ({ ...prev, xmlImportRecords }));
  };

  const handleSaveTaxObligationGuides = (taxObligationGuides: TaxObligationGuide[]) => {
    syncDb(prev => {
      const other = (prev.taxObligationGuides || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      return { ...prev, taxObligationGuides: [...other, ...taxObligationGuides] };
    });
  };

  const handleSaveAccessGroups = (accessGroups: AccessGroup[]) => {
    syncDb(prev => {
      const other = (prev.accessGroups || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const current = accessGroups.map(item => ({ ...item, companyId: item.companyId || activeCompanyId }));
      return { ...prev, accessGroups: [...other, ...current] };
    });
  };

  const handleSaveAccessGroupsDatabase = (updatedScopedDb: AppDatabase) => {
    syncDb(prev => {
      const otherAccessGroups = (prev.accessGroups || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const currentAccessGroups = (updatedScopedDb.accessGroups || []).map(g => ({ ...g, companyId: g.companyId || activeCompanyId }));

      const otherUsers = (prev.users || []).filter(u => (u.companyId || 'comp-1') !== activeCompanyId);
      const currentUsers = (updatedScopedDb.users || []).map(u => ({ ...u, companyId: u.companyId || activeCompanyId }));

      const otherHistory = (prev.history || []).filter(h => (h.companyId || 'comp-1') !== activeCompanyId);
      const currentHistory = (updatedScopedDb.history || []).map(h => ({ ...h, companyId: h.companyId || activeCompanyId }));

      return {
        ...prev,
        accessGroups: [...otherAccessGroups, ...currentAccessGroups],
        users: [...otherUsers, ...currentUsers],
        history: [...currentHistory, ...otherHistory]
      };
    });
  };

  const handleSaveFullDatabase = (updatedDb: AppDatabase) => {
    setDb(updatedDb);
    dataProvider.saveDatabaseImmediate(updatedDb);
  };

  const handleSaveUsers = (users: User[]) => {
    syncDb(prev => {
      // Keep operators from other companies completely untouched
      const otherCompanyUsers = (prev.users || []).filter(
        u => (u.companyId || 'comp-1') !== activeCompanyId
      );
      // Ensure all current company users have companyId assigned
      const currentCompanyUsers = users.map(u => ({
        ...u,
        companyId: u.companyId || activeCompanyId
      }));
      return { ...prev, users: [...otherCompanyUsers, ...currentCompanyUsers] };
    });
    if (currentUser) {
      const updatedSelf = users.find(
        u => u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()
      );
      if (updatedSelf) {
        const freshSelf = normalizeUser({ ...updatedSelf, companyId: activeCompanyId }, activeCompanyId, db);
        setCurrentUser(freshSelf);
      }
    }
  };

  const handleSaveTestCases = (testCases: TestCase[]) => {
    syncDb(prev => ({ ...prev, testCases }));
  };

  const handleSaveDatabaseUpdates = (
    updates: Partial<AppDatabase>,
    auditLog?: {
      type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system';
      title: string;
      description: string;
      clientId?: string;
      vehicleId?: string;
    }
  ) => {
    syncDb(prev => {
      let nextDb = { ...prev, ...updates };
      if (auditLog) {
        const newHistoryEntry: HistoryEntry = {
          id: `hist-${Date.now()}`,
          vehicleId: auditLog.vehicleId || 'system',
          clientId: auditLog.clientId || 'system',
          companyId: activeCompanyId,
          type: auditLog.type,
          title: auditLog.title,
          description: auditLog.description,
          date: new Date().toISOString().replace('T', ' ').substring(0, 19),
          userId: currentUser?.id || 'admin',
          userName: currentUser?.name || 'Administrador',
          metadata: { timestamp: new Date().toISOString() }
        };
        nextDb.history = [newHistoryEntry, ...(nextDb.history || [])];
      }
      return nextDb;
    });
  };

  const handleSaveCompanyInfo = (companyInfo: CompanyInfo) => {
    setDb(prev => {
      if (!prev) return prev;
      const currentList = prev.registeredCompanies && prev.registeredCompanies.length > 0 
        ? prev.registeredCompanies 
        : [prev.companyInfo || companyInfo];

      const updatedList = currentList.map(c => c.id === companyInfo.id ? companyInfo : c);
      if (!updatedList.some(c => c.id === companyInfo.id)) {
        updatedList.push(companyInfo);
      }

      const nextDb = { 
        ...prev, 
        companyInfo,
        registeredCompanies: updatedList
      };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };

  const handleSaveRegisteredCompanies = (companies: CompanyInfo[], activeCompanyIdParam?: string, newUsers?: User[]) => {
    const targetActiveId = activeCompanyIdParam || activeCompanyIdState || activeCompanyId || companies[0]?.id;
    const activeComp = companies.find(c => c.id === targetActiveId) || companies[0];

    if (targetActiveId) {
      setActiveCompanyIdState(targetActiveId);
      try {
        localStorage.setItem('motordesk_active_company_id', targetActiveId);
      } catch (e) {}
    }

    if (activeComp?.globalModules) {
      setGlobalModules(activeComp.globalModules);
    }

    setDb(prev => {
      if (!prev) return prev;
      const effectiveActiveComp = activeComp || prev.companyInfo;

      // Merge companies with existing registered companies so unviewed companies are preserved
      const compMap = new Map((prev.registeredCompanies || []).map(c => [c.id, c]));
      companies.forEach(c => compMap.set(c.id, c));
      const mergedCompanies = Array.from(compMap.values());

      let mergedUsers = prev.users || [];
      if (newUsers && newUsers.length > 0) {
        const userMap = new Map(mergedUsers.map(u => [u.id, u]));
        newUsers.forEach(u => userMap.set(u.id, u));
        mergedUsers = Array.from(userMap.values());
      }

      const nextDb: AppDatabase = {
        ...prev,
        companyInfo: effectiveActiveComp,
        registeredCompanies: mergedCompanies,
        globalModules: effectiveActiveComp.globalModules || prev.globalModules,
        users: mergedUsers
      };
      dataProvider.saveDatabaseImmediate(nextDb);

      if (currentUser) {
        const updatedUser: User = normalizeUser({
          ...currentUser,
          companyId: currentUser.companyId || targetActiveId,
        }, targetActiveId, nextDb);
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('motordesk_active_user', JSON.stringify(updatedUser));
        } catch (e) {}

        if (!canAccessView(effectiveActiveComp, updatedUser, activeView, nextDb)) {
          const fallback = getSafeAccessibleFallbackView(effectiveActiveComp, updatedUser, nextDb);
          setActiveView(fallback);
        }
      }

      return nextDb;
    });
  };

  const handleRegisterCompanyFromQA = (companyInfo: CompanyInfo, adminUser?: User, qaUser?: User) => {
    const normalizedCompany: CompanyInfo = {
      ...companyInfo,
      businessType: normalizeBusinessType(companyInfo.businessType, companyInfo.name),
    };
    if (normalizedCompany.id) {
      setActiveCompanyIdState(normalizedCompany.id);
      localStorage.setItem('motordesk_active_company_id', normalizedCompany.id);
    }
    setDb(prev => {
      if (!prev) return prev;
      const currentList = prev.registeredCompanies && prev.registeredCompanies.length > 0 
        ? prev.registeredCompanies 
        : [prev.companyInfo || normalizedCompany];

      const updatedList = currentList.map(c => c.id === normalizedCompany.id ? normalizedCompany : c);
      if (!updatedList.some(c => c.id === normalizedCompany.id)) {
        updatedList.push(normalizedCompany);
      }

      let mergedUsers = prev.users || [];
      const newUsers = [adminUser, qaUser].filter(Boolean) as User[];
      if (newUsers.length > 0) {
        const userMap = new Map(mergedUsers.map(u => [u.id, u]));
        newUsers.forEach(u => userMap.set(u.id, u));
        mergedUsers = Array.from(userMap.values());
      }

      const nextDb = { 
        ...prev, 
        companyInfo: normalizedCompany,
        registeredCompanies: updatedList,
        users: mergedUsers
      };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };

  // Add auditable log helper (RN007)
  const handleAddHistoryLog = (
    type: HistoryEntry['type'],
    title: string,
    description: string,
    clientId: string,
    vehicleId: string,
    metadata?: any
  ) => {
    if (!currentUser) return;

    const newLog: HistoryEntry = {
      id: `hst-${Date.now()}`,
      vehicleId: vehicleId || 'system',
      clientId: clientId || 'system',
      companyId: activeCompanyId,
      type,
      title,
      description,
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      metadata
    };

    syncDb(prev => ({
      ...prev,
      history: [newLog, ...(prev.history || [])]
    }));
  };

  // Synchronize users guaranteeing validador and admin wildcard access across all companies
  useEffect(() => {
    if (!db || !Array.isArray(db.users)) return;
    let needsSync = false;
    const currentUsers = db.users.map(u => {
      if (u.username && (u.username.toLowerCase() === 'validador' || u.username.toLowerCase() === 'admin')) {
        if (!Array.isArray(u.allowedCompanyIds) || !u.allowedCompanyIds.includes('*')) {
          needsSync = true;
          return {
            ...u,
            allowedCompanyIds: ['*']
          };
        }
      }
      return u;
    });

    if (needsSync) {
      setDb(prev => {
        const next = { ...prev, users: currentUsers };
        saveDatabase(next);
        return next;
      });
    }
  }, [db?.registeredCompanies?.length]);

  // Calculate matching companies for typed username (returns all for admin, validador, or wildcard users)
  const matchingCompaniesForLogin = React.useMemo(() => {
    if (!db) return [];
    const allCompanies: CompanyInfo[] = [];
    if (db.registeredCompanies && db.registeredCompanies.length > 0) {
      allCompanies.push(...db.registeredCompanies);
    } else if (db.companyInfo) {
      allCompanies.push(db.companyInfo);
    }

    const cleanUsername = loginUsername.trim().toLowerCase();
    if (!cleanUsername) {
      return [];
    }

    if (cleanUsername === 'validador' || cleanUsername === 'admin') {
      return allCompanies;
    }

    const matchingUsers = (db.users || []).filter(u => 
      u && u.username && u.username.toLowerCase() === cleanUsername && 
      u.status !== 'terminated' && !u.isTerminated
    );
    if (matchingUsers.length === 0) {
      return [];
    }

    if (matchingUsers.some(u => Array.isArray(u.allowedCompanyIds) && u.allowedCompanyIds.includes('*'))) {
      return allCompanies;
    }

    const accessibleCompanyIds = new Set<string>();
    matchingUsers.forEach(u => {
      if (u.companyId) {
        accessibleCompanyIds.add(u.companyId);
      }
      if (Array.isArray(u.allowedCompanyIds)) {
        u.allowedCompanyIds.forEach(id => {
          if (id && id !== '*') accessibleCompanyIds.add(id);
        });
      }
    });

    const filtered = allCompanies.filter(c => accessibleCompanyIds.has(c.id));
    return filtered.length > 0 ? filtered : allCompanies;
  }, [db, loginUsername]);

  // Synchronize selectedLoginCompanyId based on typed username and matching companies
  useEffect(() => {
    if (matchingCompaniesForLogin.length === 1) {
      // Exactly one company: automatically select it so login goes straight to it
      setSelectedLoginCompanyId(matchingCompaniesForLogin[0].id);
    } else if (matchingCompaniesForLogin.length > 1) {
      const savedCompanyId = localStorage.getItem('motordesk_active_company_id');
      if (savedCompanyId && matchingCompaniesForLogin.some(c => c.id === savedCompanyId)) {
        if (!selectedLoginCompanyId || !matchingCompaniesForLogin.some(c => c.id === selectedLoginCompanyId)) {
          setSelectedLoginCompanyId(savedCompanyId);
        }
      } else if (!selectedLoginCompanyId || !matchingCompaniesForLogin.some(c => c.id === selectedLoginCompanyId)) {
        setSelectedLoginCompanyId(matchingCompaniesForLogin[0].id);
      }
    } else {
      setSelectedLoginCompanyId('');
    }
  }, [matchingCompaniesForLogin]);

  // --------------------------------------------------------------------------
  // SEGURANÇA: ENCERRAMENTO AUTOMÁTICO DE SESSÃO POR TEMPO DE INATIVIDADE (15 MIN)
  // --------------------------------------------------------------------------
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos sem interação
  const lastActivityTimestampRef = useRef<number>(Date.now());

  // Monitora movimentos e cliques do usuário, encerrando a sessão caso fique 15 minutos inativo
  useEffect(() => {
    if (!currentUser) return;

    lastActivityTimestampRef.current = Date.now();
    try {
      localStorage.setItem('motordesk_last_activity', Date.now().toString());
    } catch (e) {}

    let throttleTimer: NodeJS.Timeout | null = null;
    const handleUserInteraction = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          lastActivityTimestampRef.current = Date.now();
          try {
            localStorage.setItem('motordesk_last_activity', Date.now().toString());
          } catch (e) {}
          throttleTimer = null;
        }, 3000); // Throttling para não sobrecarregar
      }
    };

    const monitoredEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    monitoredEvents.forEach(evt => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Verificação periódica de inatividade a cada 5 segundos
    const inactivityChecker = setInterval(() => {
      const now = Date.now();
      const storedLast = localStorage.getItem('motordesk_last_activity');
      const lastActive = storedLast ? parseInt(storedLast, 10) : lastActivityTimestampRef.current;
      const elapsed = now - lastActive;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Encerra a sessão imediatamente por inatividade
        const expiredUsername = currentUser.username;
        const lastView = activeView;

        try {
          localStorage.setItem('motordesk_intended_view', lastView);
          localStorage.setItem('motordesk_saved_username', expiredUsername);
          localStorage.removeItem('motordesk_auth_token');
          localStorage.removeItem('motordesk_active_user');
          localStorage.removeItem('motordesk_last_activity');
        } catch (e) {}

        setCurrentUser(null);
        setLoginUsername(expiredUsername);
        setLoginPassword('');
        setSessionExpiredMessage('Sua sessão foi encerrada por inatividade (15 minutos sem interação). Por segurança, confirme sua senha para continuar de onde parou.');
      }
    }, 5000);

    return () => {
      monitoredEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      if (throttleTimer) clearTimeout(throttleTimer);
      clearInterval(inactivityChecker);
    };
  }, [currentUser, activeView]);

  // Login handler with strict multi-tenant company block check, password requirement, and redirect preservation
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!hasAcceptedLoginLgpd) {
      setLoginError('É necessário concordar com o Termo de Aceite de Privacidade e LGPD para realizar o login.');
      return;
    }

    if (!db) return;

    const cleanUsername = loginUsername.trim().toLowerCase();
    const enteredPassword = loginPassword.trim();

    if (!cleanUsername) {
      setLoginError('Por favor, informe o nome de usuário.');
      return;
    }

    // EXIGÊNCIA OBRIGATÓRIA DE SENHA: Nunca aceita campo vazio ou bypass
    if (!enteredPassword) {
      setLoginError('A senha é obrigatória. Por favor, digite sua senha para acessar o sistema.');
      return;
    }

    // Determine target company:
    // If the user has access to only 1 company, strictly target that company.
    // If multiple companies match, target selectedLoginCompanyId (if valid) or the first one.
    let targetCompId = '';
    if (matchingCompaniesForLogin.length === 1) {
      targetCompId = matchingCompaniesForLogin[0].id;
    } else if (matchingCompaniesForLogin.length > 1) {
      if (selectedLoginCompanyId && matchingCompaniesForLogin.some(c => c.id === selectedLoginCompanyId)) {
        targetCompId = selectedLoginCompanyId;
      } else {
        targetCompId = matchingCompaniesForLogin[0].id;
      }
    } else {
      const matchingUser = (db.users || []).find(u => u.username.toLowerCase() === cleanUsername);
      targetCompId = matchingUser?.companyId || selectedLoginCompanyId || db.companyInfo?.id || 'comp-1';
    }

    // 1. Try matching with the target company first
    let matchedUser = (db.users || []).find(
      u => u.username.toLowerCase() === cleanUsername && 
           u.passwordHash === enteredPassword &&
           (u.companyId || 'comp-1') === targetCompId
    );

    // 2. If not matched in target company, check if password matches across any of the user's accessible companies
    if (!matchedUser) {
      const allowedCompIds = matchingCompaniesForLogin.map(c => c.id);
      const anyCompMatch = (db.users || []).find(
        u => u.username.toLowerCase() === cleanUsername && 
             u.passwordHash === enteredPassword &&
             (allowedCompIds.length === 0 || allowedCompIds.includes(u.companyId || 'comp-1'))
      );
      if (anyCompMatch) {
        matchedUser = anyCompMatch;
        targetCompId = anyCompMatch.companyId || targetCompId;
      }
    }

    // 3. Fallback: case-insensitive match for password within accessible companies
    if (!matchedUser) {
      const allowedCompIds = matchingCompaniesForLogin.map(c => c.id);
      const userWithAnyCasePass = (db.users || []).find(
        u => u.username.toLowerCase() === cleanUsername && 
             u.passwordHash.toLowerCase() === enteredPassword.toLowerCase() &&
             (allowedCompIds.length === 0 || allowedCompIds.includes(u.companyId || 'comp-1'))
      );
      if (userWithAnyCasePass) {
        matchedUser = userWithAnyCasePass;
        targetCompId = userWithAnyCasePass.companyId || targetCompId;
      }
    }

    // 4. Garantia para o Usuário Padrão Homologador: validador / Donatelo@123
    if (!matchedUser && cleanUsername === 'validador' && enteredPassword === 'Donatelo@123') {
      const anyVal = (db.users || []).find(u => u.username.toLowerCase() === 'validador' && (u.companyId || 'comp-1') === targetCompId) ||
                     (db.users || []).find(u => u.username.toLowerCase() === 'validador');
      if (anyVal) {
        matchedUser = {
          ...anyVal,
          role: 'qa',
          passwordHash: 'Donatelo@123',
          allowedCompanyIds: ['*'],
          active: true
        };
        targetCompId = targetCompId || anyVal.companyId || 'comp-1';
      } else {
        matchedUser = {
          id: 'usr-validador-master',
          username: 'validador',
          name: 'Validador QA',
          role: 'qa',
          passwordHash: 'Donatelo@123',
          companyId: targetCompId || db.companyInfo?.id || 'comp-1',
          allowedCompanyIds: ['*'],
          groupId: 'grp-qa',
          groupName: 'Engenharia de Qualidade (QA)',
          active: true,
          permissions: normalizeUserPermissions(getDefaultGlobalModulesForBusinessType('OFICINA_COMERCIO'), 'admin')
        };
      }
    }

    if (matchedUser) {
      // If user is validador or admin, ensure wildcard access across companies
      if (cleanUsername === 'validador' || cleanUsername === 'admin' || matchedUser.role === 'admin') {
        matchedUser.allowedCompanyIds = ['*'];
      }
      // Sync active company with effective companyId
      const userCompId = targetCompId || matchedUser.companyId || 'comp-1';
      matchedUser = {
        ...matchedUser,
        companyId: userCompId
      };
      const matchedComp = (db.registeredCompanies || []).find(c => c.id === userCompId) || 
                          (db.companyInfo?.id === userCompId ? db.companyInfo : null) ||
                          db.companyInfo;

      if (matchedComp) {
        // ENFORCE COMPANY SUBSCRIPTION BLOCK / INADIMPLÊNCIA CHECK
        const isBlocked = matchedComp.subscriptionStatus === 'blocked' || 
                          matchedComp.subscriptionStatus === 'overdue' || 
                          matchedComp.paymentStatus === 'overdue';

        if (isBlocked) {
          setLoginError(`Acesso Bloqueado por Inadimplência: A empresa "${matchedComp.name}" está com a assinatura/licença suspensa ou pagamento pendente. Por favor, entre em contato com o suporte ou gestor financeiro.`);
          return;
        }
      }

      // Normalize user permissions with active company context and licensing
      matchedUser = normalizeUser(matchedUser, userCompId, db);

      // Sync permissions with motordesk_level_permissions from localStorage if available
      const savedLevels = localStorage.getItem('motordesk_level_permissions');
      if (savedLevels) {
        try {
          const levelMap = JSON.parse(savedLevels);
          if (levelMap[matchedUser.role]) {
            matchedUser = {
              ...matchedUser,
              permissions: normalizeUserPermissions(
                {
                  ...levelMap[matchedUser.role],
                  ...matchedUser.permissions
                },
                matchedUser.role
              )
            };
          }
        } catch (e) {
          console.error('Failed to parse motordesk_level_permissions on login', e);
        }
      }

      // Save matchedUser's info to login history in localStorage
      const updatedHistory = [
        {
          username: matchedUser.username,
          name: matchedUser.name,
          role: matchedUser.role,
          lastAccess: new Date().toISOString()
        },
        ...loginHistory.filter(h => h.username.toLowerCase() !== matchedUser.username.toLowerCase())
      ].slice(0, 4);
      setLoginHistory(updatedHistory);

      // Batch state update: ensure both companyInfo and user's companyId are updated
      syncDb(prev => ({
        ...prev,
        ...(matchedComp ? { companyInfo: matchedComp } : {}),
        users: (prev.users || []).map(u =>
          (u.id === matchedUser!.id || u.username.toLowerCase() === matchedUser!.username.toLowerCase())
            ? { ...u, companyId: userCompId }
            : u
        ),
        loginHistory: updatedHistory
      }));

      setActiveCompanyIdState(userCompId);
      localStorage.setItem('motordesk_active_company_id', userCompId);
      setCurrentUser(matchedUser);
      const sessionToken = `motordesk_session_${matchedUser.id}_${Date.now()}`;
      localStorage.setItem('motordesk_auth_token', sessionToken);
      localStorage.setItem('motordesk_active_user', JSON.stringify(matchedUser));
      localStorage.setItem('motordesk_saved_username', matchedUser.username);
      localStorage.setItem('motordesk_last_activity', Date.now().toString());

      // REDIRECIONAMENTOS CERTINHO:
      // Verifica se o usuário pretendia acessar uma view específica (URL query param `?view=...`, hash `#...`, ou motordesk_intended_view)
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const intendedFromStorage = localStorage.getItem('motordesk_intended_view');
      const intendedFromUrl = urlParams ? urlParams.get('view') : null;
      const intendedHash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : null;
      const intendedCandidate = intendedFromStorage || intendedFromUrl || intendedHash;

      const matchedCompanyBusinessType = getBusinessType(matchedComp);
      let targetViewToActivate: ViewID | null = null;

      if (intendedCandidate) {
        const normalizedCandidate = normalizeViewId(intendedCandidate);
        if (isViewAllowedForBusinessType(normalizedCandidate, matchedCompanyBusinessType)) {
          const perm = VIEW_PERMISSION_MAP[normalizedCandidate];
          if (perm === null || (matchedUser.permissions[perm] ?? true)) {
            targetViewToActivate = normalizedCandidate;
          }
        }
      }

      // Se a view pretendida não puder ser acessada, usa a primeira tela permitida pelo perfil
      if (!targetViewToActivate) {
        const firstAllowed = (Object.keys(VIEW_PERMISSION_MAP) as ViewID[]).find(v => {
          if (!isViewAllowedForBusinessType(v, matchedCompanyBusinessType)) return false;
          const perm = VIEW_PERMISSION_MAP[v];
          return perm === null || (matchedUser!.permissions[perm] ?? true);
        });
        targetViewToActivate = firstAllowed || 'dashboard';
      }

      setActiveView(targetViewToActivate);
      if (typeof window !== 'undefined') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('view', targetViewToActivate);
        window.history.replaceState({}, '', newUrl.toString());
      }
      try {
        localStorage.removeItem('motordesk_intended_view');
      } catch (e) {}

      // Limpa os campos de senha e mensagens
      setLoginPassword('');
      setSessionExpiredMessage('');
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos. Por favor, verifique suas credenciais.');
    }
  };

  // Quick fill logins for the QA evaluator (Preenche apenas o usuário, forçando digitação manual da senha)
  const quickLogin = (username: string) => {
    setLoginUsername(username);
    setLoginPassword('');
    setLoginError('');
  };

  // Logout routine com preservação de rota pretendida para redirecionamento certinho
  const handleLogout = () => {
    if (activeView) {
      try {
        localStorage.setItem('motordesk_intended_view', activeView);
      } catch (e) {}
    }
    setCurrentUser(null);
    localStorage.removeItem('motordesk_auth_token');
    localStorage.removeItem('motordesk_active_user');
    localStorage.removeItem('motordesk_last_activity');
    setActiveCompanyIdState('');
    setUnsavedTask(null);
    setShowUnsavedModal(false);
    setPendingTargetView(null);
    setLoginPassword('');
    setSessionExpiredMessage('');
    setLoginError('');
  };

  // Normalizador resiliente de ViewID para compatibilidade de rotas e notificações
  const normalizeViewId = (rawView: string | ViewID): ViewID => {
    const map: Record<string, ViewID> = {
      'accountsReceivable': 'accounts_receivable',
      'accounts_receivable': 'accounts_receivable',
      'accountsPayable': 'accounts_payable',
      'accounts_payable': 'accounts_payable',
      'fiscalConference': 'fiscal_conference',
      'fiscal_conference': 'fiscal_conference',
      'taxObligations': 'tax_obligations',
      'tax_obligations': 'tax_obligations',
      'unitsOfMeasure': 'units_of_measure',
      'units_of_measure': 'units_of_measure',
      'accessGroups': 'access_groups',
      'access_groups': 'access_groups',
      'qaPanel': 'qa_panel',
      'qa_panel': 'qa_panel',
      'dataMigration': 'data_migration',
      'data_migration': 'data_migration',
      'serviceOrders': 'serviceOrders',
      'service_orders': 'serviceOrders',
      'production': 'industry',
      'industrial': 'industry',
      'industry': 'industry',
      'reports': 'reports',
      'history': 'history',
      'users': 'users',
      'userManagement': 'users',
      'profile': 'profile',
      'dashboard': 'dashboard',
      'sales': 'sales',
      'withdrawals': 'withdrawals',
      'carriers': 'carriers',
      'clients': 'clients',
      'vehicles': 'vehicles',
      'parts': 'parts',
      'quotations': 'quotations',
      'services': 'services',
      'budgets': 'budgets',
      'financial': 'financial',
      'fiscal': 'fiscal',
      'notification_engine': 'notifications_engine',
      'notificationEngine': 'notifications_engine',
      'notifications_engine': 'notifications_engine',
      'notificationsEngine': 'notifications_engine',
      'representative_commerce': 'representative_commerce',
      'representativeCommerce': 'representative_commerce',
      'representative_orders': 'representative_orders',
      'representativeOrders': 'representative_orders',
      'representative_reconciliation': 'representative_reconciliation',
      'representativeReconciliation': 'representative_reconciliation',
    };
    return map[rawView] || (rawView as ViewID);
  };

  // Safe navigation checks for unsaved forms with segmentation fallback
  const navigateToView = (view: ViewID | string) => {
    const normalized = normalizeViewId(view);
    const currentActiveComp = (db?.registeredCompanies || []).find(c => c.id === activeCompanyId) || db?.companyInfo;
    const curBusinessType = getBusinessType(currentActiveComp);
    
    const targetView = isViewAllowedForBusinessType(normalized, curBusinessType)
      ? normalized
      : getFallbackViewForBusinessType(curBusinessType, currentUser?.permissions);

    if (unsavedTask) {
      setPendingTargetView(targetView);
      setShowUnsavedModal(true);
    } else {
      setActiveView(targetView);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('view', targetView);
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  const triggerLogoutWithCheck = () => {
    if (unsavedTask) {
      setPendingTargetView('logout');
      setShowUnsavedModal(true);
    } else {
      handleLogout();
    }
  };

  const handleModalSaveAndProceed = () => {
    if (unsavedTask) {
      // Execute save action
      unsavedTask.saveCallback();
    }
    proceedAfterUnsavedModal();
  };

  const handleModalDiscardAndProceed = () => {
    if (unsavedTask) {
      // Execute discard rollbacks
      unsavedTask.discardCallback();
    }
    proceedAfterUnsavedModal();
  };

  const proceedAfterUnsavedModal = () => {
    setUnsavedTask(null);
    setShowUnsavedModal(false);
    if (pendingTargetView === 'logout') {
      handleLogout();
    } else if (pendingTargetView) {
      setActiveView(pendingTargetView);
    }
    setPendingTargetView(null);
  };

  const handleResetQADb = () => {
    const freshDb = resetDatabase();
    setDb(freshDb);
    // Update active user state to prevent session crash
    if (currentUser) {
      const resetSelf = freshDb.users.find(u => u.username === currentUser.username);
      if (resetSelf) setCurrentUser(resetSelf);
    }
  };

  const handleRegisterCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (!regCompName.trim() || !regCompCnpj.trim() || !regCompWhatsapp.trim() || !regAdminUsername.trim() || !regAdminPassword.trim()) {
      setLoginError('Preencha os campos obrigatórios (*): Nome da Empresa, CNPJ, WhatsApp, Usuário e Senha.');
      return;
    }

    const companyId = `comp-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);
    const expStr = expDate.toISOString().split('T')[0];

    const newCompany: CompanyInfo = {
      id: companyId,
      name: regCompName.trim(),
      cnpj: regCompCnpj.trim(),
      businessType: normalizeBusinessType(regCompBusinessType),
      phone: regCompPhone.trim() || regCompWhatsapp.trim(),
      whatsapp: regCompWhatsapp.trim(),
      email: regCompEmail.trim() || 'contato@oficina.com.br',
      address: regCompAddress.trim() || 'Av. das Nações Unidas, 1500 - São Paulo - SP',
      welcomeMessage: 'Agradecemos pela preferência!',
      registeredAt: new Date().toISOString(),
      subscriptionStatus: 'active',
      startDate: todayStr,
      expirationDate: expStr,
      monthlyFee: 299.90,
      paymentStatus: 'paid'
    };

    const newAdminUser: User = {
      id: `usr-${Date.now()}`,
      username: regAdminUsername.trim().toLowerCase(),
      name: regAdminName.trim() || 'Administrador',
      role: 'admin',
      passwordHash: regAdminPassword,
      companyId: companyId,
      permissions: {
        accessDashboard: true,
        accessClients: true,
        accessVehicles: true,
        accessParts: true,
        accessServices: true,
        accessBudgets: true,
        accessServiceOrders: true,
        accessHistory: true,
        accessReports: true,
        accessUserManagement: true,
        accessQAPanel: true,
        accessQuotations: true,
        accessNotifications: true,
        accessAccountsReceivable: true,
        accessAccountsPayable: true,
        accessFinancial: true,
        canEditBudgets: true
      }
    };

    // Auto-create default QA user with username 'validador' and password 'Donatelo@123'
    // with menus released according to the contracted modules
    const newCompanyQAUser: User = {
      id: `usr-val-${companyId}`,
      username: 'validador',
      name: `Validador QA (${newCompany.name})`,
      role: 'qa',
      passwordHash: 'Donatelo@123',
      companyId: companyId,
      allowedCompanyIds: [companyId],
      status: 'active',
      isActive: true,
      permissions: {
        accessDashboard: Boolean(newCompany.globalModules?.accessDashboard ?? true),
        accessSales: Boolean(newCompany.globalModules?.accessSales ?? true),
        accessClients: Boolean(newCompany.globalModules?.accessClients ?? true),
        accessVehicles: Boolean(newCompany.globalModules?.accessVehicles ?? true),
        accessParts: Boolean(newCompany.globalModules?.accessParts ?? true),
        accessServices: Boolean(newCompany.globalModules?.accessServices ?? true),
        accessBudgets: Boolean(newCompany.globalModules?.accessBudgets ?? true),
        accessServiceOrders: Boolean(newCompany.globalModules?.accessServiceOrders ?? true),
        accessHistory: Boolean(newCompany.globalModules?.accessHistory ?? true),
        accessReports: Boolean(newCompany.globalModules?.accessReports ?? true),
        accessUserManagement: Boolean(newCompany.globalModules?.accessUserManagement ?? true),
        accessQAPanel: Boolean(newCompany.globalModules?.accessQAPanel ?? true),
        accessQuotations: Boolean(newCompany.globalModules?.accessQuotations ?? true),
        accessNotifications: Boolean(newCompany.globalModules?.accessNotifications ?? true),
        accessAccountsReceivable: Boolean(newCompany.globalModules?.accessAccountsReceivable ?? true),
        accessAccountsPayable: Boolean(newCompany.globalModules?.accessAccountsPayable ?? true),
        accessFinancial: Boolean(newCompany.globalModules?.accessFinancial ?? true),
        accessFiscal: Boolean(newCompany.globalModules?.accessFiscal ?? true),
        accessBoletos: Boolean(newCompany.globalModules?.accessBoletos ?? true),
        accessUnitsOfMeasure: Boolean(newCompany.globalModules?.accessUnitsOfMeasure ?? true),
        accessCarriers: Boolean(newCompany.globalModules?.accessCarriers ?? true),
        accessProduction: Boolean(newCompany.globalModules?.accessProduction ?? false),
        canEditBudgets: Boolean(newCompany.globalModules?.accessBudgets ?? true)
      }
    };

    let userToLog: User;
    let updatedUsers = [...(db.users || [])];
    const existingUserIndex = updatedUsers.findIndex(u => u.username.toLowerCase() === regAdminUsername.trim().toLowerCase());

    if (existingUserIndex >= 0) {
      const existingUser = updatedUsers[existingUserIndex];
      const curAllowed = Array.isArray(existingUser.allowedCompanyIds) ? existingUser.allowedCompanyIds : [existingUser.companyId];
      const newAllowed = (curAllowed.includes('*') && existingUser.username.toLowerCase() === 'admin')
        ? ['*'] 
        : Array.from(new Set([...curAllowed.filter((x: string) => x !== '*'), companyId]));
      const updatedExisting: User = {
        ...existingUser,
        companyId: companyId,
        allowedCompanyIds: newAllowed,
        passwordHash: regAdminPassword || existingUser.passwordHash
      };
      updatedUsers[existingUserIndex] = updatedExisting;
      userToLog = updatedExisting;
    } else {
      updatedUsers.push(newAdminUser);
      userToLog = newAdminUser;
    }

    updatedUsers.push(newCompanyQAUser);

    const updatedCompanies = [...(db.registeredCompanies || []), newCompany];

    const updatedDb: AppDatabase = {
      ...db,
      companyInfo: newCompany,
      registeredCompanies: updatedCompanies,
      users: updatedUsers
    };

    // Immediate flush to database
    dataProvider.saveDatabaseImmediate(updatedDb);
    setDb(updatedDb);

    // Auto Login
    setCurrentUser(userToLog);
    localStorage.setItem('motordesk_auth_token', `motordesk_session_${userToLog.id}_${Date.now()}`);

    handleAddHistoryLog(
      'system',
      'Nova Empresa Cadastrada & Acessos Liberados',
      `Empresa "${newCompany.name}" (CNPJ: ${newCompany.cnpj}) cadastrada no sistema. Acesso master liberado para ${userToLog.name} (@${userToLog.username}).`,
      '',
      ''
    );

    setLoginError('');
  };

  const handleLinkCompanyByToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setTokenFeedback({ text: 'Por favor, insira o Token, CNPJ ou ID da Empresa para consultar a vinculação.', type: 'error' });
      return;
    }

    const cleanNumeric = cleanToken.replace(/\D/g, '');
    const foundComp = (db.registeredCompanies || []).find(c => 
      c.id === cleanToken || 
      (cleanNumeric && c.cnpj && c.cnpj.replace(/\D/g, '') === cleanNumeric) ||
      (c.id && c.id.toLowerCase() === cleanToken.toLowerCase())
    );

    if (foundComp) {
      setTokenFeedback({ 
        text: `✓ Empresa localizada com sucesso: "${foundComp.name}" (CNPJ: ${foundComp.cnpj}). No MotorDesk, ela já está vinculada na rede! Redirecionando para login com usuário 'validador'...`, 
        type: 'success' 
      });
      setLoginUsername('validador');
      setLoginPassword('Donatelo@123');
      setSelectedLoginCompanyId(foundComp.id);
      setTimeout(() => {
        setLoginTab('login');
      }, 2000);
    } else {
      setTokenFeedback({ 
        text: `Token/Chave "${cleanToken}" verificada: No MotorDesk, a vinculação entre Matriz e Filiais é nativa e dispensa tokens manuais (feita pela seleção da Matriz no cadastro). Usuários como @validador já acessam todas as empresas da rede automaticamente. Se este for um token de API Focus NFS-e, utilize-o no módulo de Notas Fiscais.`, 
        type: 'info' 
      });
    }
  };

  const handleUpdateTestCaseStatus = (id: string, status: TestCase['status'], comments?: string) => {
    if (!db) return;
    const updated = db.testCases.map(tc => {
      if (tc.id === id) {
        return { ...tc, status, comments };
      }
      return tc;
    });
    handleSaveTestCases(updated);
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <ToolIcon className="w-10 h-10 text-indigo-600 animate-spin" />
          <div className="text-center">
            <p className="text-slate-800 font-bold text-base">Conectando ao banco de dados...</p>
            <p className="text-slate-500 text-xs mt-1">Sincronizando dados com o Cloud SQL PostgreSQL</p>
          </div>
        </div>
      </div>
    );
  }

  // FOCUS NOTAS-API / NFS-E SEFIN GATEWAY PORTAL
  if (isNotasApiOpen) {
    return (
      <FocusNotasApiPortalView
        onBackToApp={() => {
          setIsNotasApiOpen(false);
          if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('notas-api')) {
            window.history.pushState({}, '', '/');
          }
        }}
        registeredCompanies={db?.registeredCompanies}
      />
    );
  }

  // LANDING PAGE PRESENTATION (Infinite Scroll + Framer Motion)
  if (isLanding) {
    return (
      <LandingPresentationView
        onOpenSystem={openSystem}
        currentUser={currentUser}
        dbLandingContent={db?.landingContent}
        onSaveLandingContent={handleSaveLandingContent}
        dbUsers={db?.users}
      />
    );
  }

  // LOGIN SCREEN WRAPPER (RF014)
  if (!currentUser) {
    const loginPageData = db?.landingContent?.loginPage || {
      title: 'Bem-vindo ao MotorDesk',
      subtitle: 'Realize o login com o seu perfil funcional para iniciar suas atividades.',
      leftBadge: 'Portfólio de Gestão & QA',
      leftTitle: 'Plataforma integrada de Ordens de Serviço sob rigorosos testes de QA.',
      leftSubtitle: 'Este sistema foi planejado para demonstrar a excelência técnica em engenharia de testes, rastreabilidade e validação de requisitos de oficina.',
      buttonText: 'Entrar no Sistema',
      logoUrl: motordeskLogoImg
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="login-view-container">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100 animate-fade-in">
          {/* Left panel branding */}
          <div className="md:col-span-5 bg-slate-900 p-8 flex flex-col justify-between text-white relative">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={loginPageData.logoUrl || "/motordesk_logo.png"}
                  alt="Logo MotorDesk"
                  className="w-10 h-10 object-contain rounded-xl bg-slate-950/60 p-1 border border-slate-700/60 shadow-md"
                  onError={(e) => { e.currentTarget.src = "/favicon.svg"; }}
                  referrerPolicy="no-referrer"
                />
                <span className="font-extrabold tracking-tight text-xl font-display">MotorDesk</span>
              </div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{loginPageData.leftBadge}</p>
            </div>

            <div className="my-8 space-y-4">
              <p className="text-lg font-bold tracking-tight text-slate-100 leading-tight">
                {loginPageData.leftTitle}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {loginPageData.leftSubtitle}
              </p>

              <button
                type="button"
                id="btn-login-to-landing"
                onClick={openLanding}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-4"
              >
                <Globe className="w-4 h-4 text-amber-400" />
                <span>🌐 Ver Site / Apresentação Completa</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-4">
              © 2026 MotorDesk Workshop Management. Todos os direitos reservados.
            </div>
          </div>

          {/* Right panel interactive form */}
          <div className="md:col-span-7 p-8 space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight font-display">{loginPageData.title}</h1>
              <p className="text-xs text-slate-500">{loginPageData.subtitle}</p>
            </div>

            {/* Inactivity Session Expiration Banner */}
            {sessionExpiredMessage && (
              <div id="session-timeout-alert" className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 animate-fade-in shadow-xs">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-950">Sessão Encerrada por Inatividade</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{sessionExpiredMessage}</p>
                </div>
              </div>
            )}

            {/* Intended Route Target Badge */}
            {(() => {
              const intended = typeof localStorage !== 'undefined' ? (localStorage.getItem('motordesk_intended_view') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null)) : null;
              if (!intended) return null;
              const viewLabels: Record<string, string> = {
                representative_orders: 'Pedidos Realizados (Fábricas)',
                representative_commerce: 'Representação Comercial',
                representative_reconciliation: 'Conciliação de Comissões',
                serviceOrders: 'Ordens de Serviço',
                sales: 'Vendas Balcão / PDV',
                budgets: 'Orçamentos Comerciais',
                clients: 'Clientes',
                vehicles: 'Veículos & Frotas',
                parts: 'Peças & Estoque',
                services: 'Serviços & Mão de Obra',
                accounts_receivable: 'Contas a Receber',
                accounts_payable: 'Contas a Pagar',
                financial: 'Financeiro & Fluxo de Caixa',
                fiscal: 'Módulo Fiscal SEFAZ',
                reports: 'Relatórios Estratégicos',
                dashboard: 'Painel Geral (Dashboard)'
              };
              const label = viewLabels[intended] || intended;
              return (
                <div className="flex items-center gap-2.5 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 animate-fade-in" id="intended-redirect-banner">
                  <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[11px] block text-indigo-950">Destino Agendado</span>
                    <span className="text-[11px] text-indigo-700 truncate block">Após autenticar, você será redirecionado para <strong>{label}</strong>.</span>
                  </div>
                </div>
              );
            })()}

            {/* Abas de Navegação Superior: Login, Cadastrar Empresa e Vincular por Token */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600 gap-1 border border-slate-200 shadow-inner">
              <button
                type="button"
                id="tab-btn-login"
                onClick={() => { setLoginTab('login'); setLoginError(''); setTokenFeedback(null); }}
                className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  loginTab === 'login'
                    ? 'bg-white text-indigo-950 shadow-xs font-extrabold'
                    : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Entrar</span>
              </button>
              <button
                type="button"
                id="tab-btn-register-company"
                onClick={() => { setLoginTab('register_company'); setLoginError(''); setTokenFeedback(null); }}
                className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  loginTab === 'register_company'
                    ? 'bg-white text-indigo-950 shadow-xs font-extrabold'
                    : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cadastrar Empresa</span>
              </button>
              <button
                type="button"
                id="tab-btn-link-token"
                onClick={() => { setLoginTab('link_token'); setLoginError(''); setTokenFeedback(null); }}
                className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  loginTab === 'link_token'
                    ? 'bg-white text-indigo-950 shadow-xs font-extrabold'
                    : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Vincular / Token</span>
              </button>
            </div>

            {loginError && (
              <div id="login-error-alert" className="p-3 bg-rose-50 text-rose-800 text-xs font-medium rounded-lg border border-rose-100 animate-shake">
                {loginError}
              </div>
            )}

            {/* TAB 1: FAZER LOGIN */}
            {loginTab === 'login' && (
              <>
                {/* Credenciais Padrão Homologador (validador / Donatelo@123) */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border border-indigo-200/80 rounded-xl space-y-2" id="card-default-credentials">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Credenciais Padrão de Homologação
                    </span>
                    <button
                      type="button"
                      id="btn-use-default-validador"
                      onClick={() => {
                        setLoginUsername('validador');
                        setLoginPassword('Donatelo@123');
                        setLoginError('');
                      }}
                      className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      Usar Padrão
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                    <span>Usuário: <code className="text-indigo-900 bg-white font-mono px-2 py-0.5 rounded border border-indigo-200 font-bold">validador</code></span>
                    <span>Senha: <code className="text-indigo-900 bg-white font-mono px-2 py-0.5 rounded border border-indigo-200 font-bold">Donatelo@123</code></span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4" id="form-login">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between" htmlFor="login-username-input">
                      <span>Usuário (Username)</span>
                      <span className="text-[10px] text-slate-400 font-semibold lowercase">obrigatório</span>
                    </label>
                    <input 
                      id="login-username-input"
                      type="text" 
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      placeholder="Ex: validador ou admin" 
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition font-mono"
                      required
                    />
                  </div>

                  {/* Multi-Company Selector Combobox */}
                  {matchingCompaniesForLogin.length > 1 && (
                    <div className="space-y-1.5 animate-fade-in p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl" id="login-company-selector-container">
                      <label className="text-xs font-bold text-indigo-900 uppercase flex items-center justify-between" htmlFor="login-company-select">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          Empresa / Unidade para Acesso
                        </span>
                        <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-black font-mono">
                          {matchingCompaniesForLogin.length} Empresas
                        </span>
                      </label>
                      <select
                        id="login-company-select"
                        value={selectedLoginCompanyId}
                        onChange={e => setSelectedLoginCompanyId(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 bg-white border border-indigo-300 text-slate-900 font-bold rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer shadow-xs"
                      >
                        {matchingCompaniesForLogin.map(comp => {
                          const bType = getBusinessType(comp);
                          const segmentLabel = bType === 'INDUSTRIA' ? '🏭 Indústria' : bType === 'COMERCIO' ? '🛒 Comércio' : bType === 'OFICINA_COMERCIO' ? '🏢 Híbrido' : '🔧 Oficina';
                          return (
                            <option key={comp.id} value={comp.id}>
                              [{segmentLabel}] {comp.companyType === 'filial' ? 'Filial: ' : ''}{comp.name} {comp.cnpj ? `— CNPJ: ${comp.cnpj}` : ''}
                              {comp.subscriptionStatus === 'blocked' ? ' 🔒 (Bloqueada)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[10px] text-indigo-700 font-medium">
                        Usuário cadastrado em mais de uma empresa. Selecione a unidade onde deseja fazer login.
                      </p>
                    </div>
                  )}

                  {matchingCompaniesForLogin.length === 1 && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs animate-fade-in" id="login-single-company-badge">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Unidade de Acesso</span>
                        <span className="font-semibold text-slate-800 text-xs truncate block">
                          {matchingCompaniesForLogin[0].name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Strict Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5" htmlFor="login-password-input">
                        <Lock className="w-3.5 h-3.5 text-indigo-600" /> Senha de Acesso <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Obrigatória</span>
                    </div>
                    <div className="relative">
                      <input 
                        id="login-password-input"
                        type={showPassword ? 'text' : 'password'} 
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="Digite sua senha de operador" 
                        autoComplete="new-password"
                        className="w-full text-xs px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition font-sans"
                        required
                      />
                      <button
                        type="button"
                        id="btn-toggle-password-visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                        title={showPassword ? 'Ocultar senha' : 'Exibir senha digitada'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Por segurança, a senha é sempre exigida mesmo que o navegador tenha dados salvos.
                    </p>
                  </div>

                  <PrivacyLgpdFooter
                    onOpenModal={() => setShowPrivacyModal(true)}
                    mode="login"
                    isChecked={hasAcceptedLoginLgpd}
                    onToggleCheck={setHasAcceptedLoginLgpd}
                  />

                  <button 
                    id="btn-login-submit"
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Lock className="w-4 h-4 text-indigo-400" /> {loginPageData.buttonText}
                  </button>

                  {/* Botão de Acesso Direto ao Portal Notas-API / Focus NFS-e */}
                  <div className="pt-2">
                    <button
                      type="button"
                      id="btn-open-notas-api-portal"
                      onClick={() => {
                        setIsNotasApiOpen(true);
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/notas-api');
                        }
                      }}
                      className="w-full py-2.5 px-3.5 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200 hover:border-indigo-300 text-indigo-900 text-xs font-bold rounded-lg transition flex items-center justify-between cursor-pointer shadow-3xs"
                      title="Acessar Portal da API da Nota Fiscal (Focus NFS-e / Sefin Nacional)"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-extrabold text-indigo-950">Acesso à API da Nota Fiscal</span>
                      </span>
                      <span className="text-[10px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold uppercase tracking-wider transition">
                        Acessar
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sessão Segura
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Expira em 15 min sem uso
                    </span>
                  </div>
                </form>
              </>
            )}

            {/* TAB 2: CADASTRAR EMPRESA (PRÉ-PREENCHIDO) */}
            {loginTab === 'register_company' && (
              <form onSubmit={handleRegisterCompany} className="space-y-4 animate-fade-in" id="form-register-company">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-950 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold flex items-center gap-1 text-emerald-900">
                      <span>✨</span> Cadastro Pré-Preenchido Pronto para Homologação
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      Modelo Carregado
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Os dados da empresa e as credenciais do usuário validador (@validador / 'Donatelo@123') já foram configurados. Você pode alterar o que desejar ou apenas clicar em cadastrar.
                  </p>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase" htmlFor="reg-comp-name">
                      Razão Social / Nome da Empresa *
                    </label>
                    <input
                      id="reg-comp-name"
                      type="text"
                      value={regCompName}
                      onChange={e => setRegCompName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase" htmlFor="reg-comp-cnpj">
                        CNPJ *
                      </label>
                      <input
                        id="reg-comp-cnpj"
                        type="text"
                        value={regCompCnpj}
                        onChange={e => setRegCompCnpj(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase" htmlFor="reg-comp-whatsapp">
                        WhatsApp Comercial *
                      </label>
                      <input
                        id="reg-comp-whatsapp"
                        type="text"
                        value={regCompWhatsapp}
                        onChange={e => setRegCompWhatsapp(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase" htmlFor="reg-comp-segment">
                      Segmento de Atuação da Empresa
                    </label>
                    <select
                      id="reg-comp-segment"
                      value={regCompBusinessType}
                      onChange={e => setRegCompBusinessType(e.target.value as BusinessType)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="OFICINA_COMERCIO">🏢 Híbrido (Oficina Mecânica + Loja de Peças Balcão) [Mais Completo]</option>
                      <option value="OFICINA">🔧 Oficina Mecânica (Ordens de Serviço, Pátio e Mecânicos)</option>
                      <option value="COMERCIO">🛒 Comércio & Autopeças (PDV Balcão e Venda Dimensional)</option>
                      <option value="INDUSTRIA">🏭 Indústria & PCP (Fábrica, Engenharia e Produção)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase" htmlFor="reg-comp-address">
                      Endereço da Empresa
                    </label>
                    <input
                      id="reg-comp-address"
                      type="text"
                      value={regCompAddress}
                      onChange={e => setRegCompAddress(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-indigo-950 block">👤 Usuário Master de Acesso</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Login:</span>
                        <input
                          id="reg-admin-username"
                          type="text"
                          value={regAdminUsername}
                          onChange={e => setRegAdminUsername(e.target.value)}
                          className="w-full p-1.5 text-xs bg-white border border-indigo-200 rounded font-mono font-bold"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Senha:</span>
                        <input
                          id="reg-admin-password"
                          type="text"
                          value={regAdminPassword}
                          onChange={e => setRegAdminPassword(e.target.value)}
                          className="w-full p-1.5 text-xs bg-white border border-indigo-200 rounded font-mono font-bold"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    id="btn-register-company-submit"
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Building2 className="w-4 h-4" /> Cadastrar Empresa & Acessar Imediatamente
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginTab('login')}
                    className="w-full text-slate-500 hover:text-slate-800 text-xs py-1.5 text-center font-medium cursor-pointer"
                  >
                    Já possui acesso? Voltar para o Login
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: COMO FUNCIONA O VÍNCULO E INSERÇÃO DE TOKEN */}
            {loginTab === 'link_token' && (
              <div className="space-y-4 animate-fade-in" id="panel-link-token">
                <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 text-xs shadow-md">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-extrabold text-sm text-indigo-200">Como funciona o Vínculo no MotorDesk?</h4>
                  </div>
                  <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <strong className="text-white block">1. Vínculo Matriz / Filial (Nativo & Sem Token):</strong>
                      No MotorDesk, filiais são vinculadas diretamente pela seleção da Matriz no cadastro da empresa. Não é necessário gerar nem digitar tokens manuais.
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <strong className="text-white block">2. Acesso Multi-Empresa do Usuário:</strong>
                      O usuário <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded font-mono">validador</code> possui acesso compartilhado para todas as empresas da rede. Ao logar, você escolhe qual unidade acessar.
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <strong className="text-white block">3. Onde usar Tokens de API (Bearer)?</strong>
                      O Token de API (ex: <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded font-mono">fcs_tok_...</code>) é exclusivo para autorizar emissões fiscais no Portal da API da Nota Fiscal (Focus NFS-e / SEFIN).
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLinkCompanyByToken} className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-xs font-bold text-slate-800 uppercase block" htmlFor="input-token-link">
                    Consultar / Localizar Cadastro por Token ou CNPJ
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Insira o Token de API, CNPJ ou identificador para localizar a empresa correspondente no sistema:
                  </p>
                  <div className="flex gap-2">
                    <input
                      id="input-token-link"
                      type="text"
                      placeholder="Ex: fcs_tok_matriz_8832a71b ou CNPJ..."
                      value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                    <button
                      type="submit"
                      id="btn-verify-token"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      Consultar
                    </button>
                  </div>

                  {tokenFeedback && (
                    <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                      tokenFeedback.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium'
                        : tokenFeedback.type === 'error'
                        ? 'bg-rose-50 text-rose-900 border border-rose-200 font-medium'
                        : 'bg-blue-50 text-blue-900 border border-blue-200'
                    }`}>
                      {tokenFeedback.text}
                    </div>
                  )}
                </form>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setLoginTab('login')}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold text-center transition"
                  >
                    Voltar para a Tela de Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Privacy and LGPD Modal */}
        <PrivacyLgpdModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          companyName={db?.companyInfo?.name || 'MotorDesk'}
        />
      </div>
    );
  }

  const renderLockedScreen = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200/80 my-12 animate-fade-in shadow-xs" id="locked-module-screen">
      <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-xs font-bold">
        🔒
      </div>
      <h2 className="text-base font-bold text-slate-800 font-display">Módulo Não Disponível para este Segmento / Plano SaaS</h2>
      <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
        Este módulo funcional não está habilitado para o segmento <strong>{activeSegmentMeta.label}</strong> ou não consta na relação de módulos liberados no contrato da empresa <strong className="text-slate-700">{activeCompanyObj?.name || 'sua empresa'}</strong>.
      </p>
      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 max-w-md text-left space-y-1">
        <p className="font-bold text-slate-800">📄 Liberação de Módulos e Segmento no Sistema:</p>
        <p className="text-[11px] text-slate-500">
          Para alterar o segmento de negócio ou incluir novos módulos na assinatura, acesse a tela de <strong>"Gestão Multi-Empresa & Módulos SaaS"</strong> para configurar o tipo de empresa ou emitir o <strong>Termo Aditivo</strong>.
        </p>
      </div>
      {currentUser?.role === 'admin' && (
        <button
          type="button"
          onClick={() => setActiveView('users')}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          Acessar Gestão de Módulos & Termos Aditivos
        </button>
      )}
    </div>
  );

  const renderAccessDeniedScreen = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-rose-200/80 my-12 animate-fade-in shadow-xs" id="access-denied-screen">
      <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-xs font-bold">
        🚫
      </div>
      <h2 className="text-base font-bold text-slate-800 font-display">Acesso não permitido</h2>
      <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed font-medium">
        Seu usuário não possui permissão para acessar este recurso.
      </p>
      <button
        type="button"
        onClick={() => setActiveView(getFallbackViewForBusinessType(activeBusinessType, currentUser?.permissions))}
        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
      >
        Voltar para a Página Principal
      </button>
    </div>
  );

  const renderSegmentRestrictedScreen = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-amber-200/80 my-12 animate-fade-in shadow-xs" id="segment-restricted-screen">
      <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-xs font-bold">
        🏢
      </div>
      <h2 className="text-base font-bold text-slate-800 font-display">Módulo Não Habilitado para este Segmento</h2>
      <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
        Este recurso não está disponível para o segmento <strong>{activeSegmentMeta.label}</strong> da empresa atual.
      </p>
      <button
        type="button"
        onClick={() => setActiveView(getFallbackViewForBusinessType(activeBusinessType, currentUser?.permissions))}
        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
      >
        Voltar para a Página Principal
      </button>
    </div>
  );

  // MAIN WORKSPACE INTERFACE
  return (
    <div className="h-screen w-screen bg-slate-50 flex font-sans overflow-hidden" id="app-workspace-shell">
      {/* SIDEBAR NAVIGATION (Retractable & Collapsible) */}
      <aside 
        id="sidebar-container"
        className={`h-screen shrink-0 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-[width] duration-300 ease-in-out relative z-30 select-none overflow-x-hidden ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Top Header */}
        <div className={`border-b border-slate-800/80 transition-all ${isSidebarCollapsed ? 'p-3 flex items-center justify-center' : 'p-3.5 flex items-center justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <ToolIcon className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="truncate">
                <span className="font-extrabold text-white text-base font-display tracking-tight block leading-none">MotorDesk</span>
                <p className="text-[9px] text-indigo-300 font-semibold uppercase mt-0.5 font-mono truncate">{activeSegmentMeta.label}</p>
              </div>
            </div>
          )}

          <button
            id="btn-toggle-sidebar"
            type="button"
            onClick={toggleSidebarCollapse}
            className={`rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer ${
              isSidebarCollapsed ? 'p-2 text-indigo-400' : 'p-1.5 shrink-0'
            }`}
            title={isSidebarCollapsed ? "Expandir Menu Lateral" : "Retrair Menu Lateral"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

          {/* Dynamic Navigation Links (Based on Permissions & Segment) */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {isViewAccessible('dashboard') && (
              <button 
                id="menu-btn-dashboard"
                onClick={() => navigateToView('dashboard')}
                title="Dashboard KPI"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'dashboard' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Dashboard KPI</span>}
                </div>
              </button>
            )}

            {isViewAccessible('sales') && (
              <button 
                id="menu-btn-sales"
                onClick={() => navigateToView('sales')}
                title="Vendas & Balcão (PDV / Comércio)"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'sales' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!isSidebarCollapsed && <span className="truncate">Vendas & Balcão</span>}
                </div>
              </button>
            )}

            {isViewAccessible('representative_commerce') && (
              <button 
                id="menu-btn-representative-commerce"
                onClick={() => navigateToView('representative_commerce')}
                title="Comércio Representante (Fábricas & Comissões)"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'representative_commerce' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 shrink-0 text-blue-400" />
                  {!isSidebarCollapsed && <span className="truncate">Representadas</span>}
                </div>
              </button>
            )}

            {isViewAccessible('representative_orders') && (
              <button 
                id="menu-btn-representative-orders"
                onClick={() => navigateToView('representative_orders')}
                title="Pedidos Realizados (Representadas & Faturamento)"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'representative_orders' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 shrink-0 text-indigo-400" />
                  {!isSidebarCollapsed && <span className="truncate">Pedidos Realizados</span>}
                </div>
              </button>
            )}

            {isViewAccessible('withdrawals') && (
              <button 
                id="menu-btn-withdrawals"
                onClick={() => navigateToView('withdrawals')}
                title="Retirada & Entrega de Mercadorias (Expedição)"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'withdrawals' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Boxes className="w-4 h-4 shrink-0 text-indigo-400" />
                  {!isSidebarCollapsed && <span className="truncate">Retirada & Entrega</span>}
                </div>
              </button>
            )}

            {isViewAccessible('carriers') && (
              <button 
                id="menu-btn-carriers"
                onClick={() => navigateToView('carriers')}
                title="Transportadoras & Frete"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'carriers' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Truck className="w-4 h-4 shrink-0 text-blue-400" />
                  {!isSidebarCollapsed && <span className="truncate">Transportadoras</span>}
                </div>
              </button>
            )}

            {isViewAccessible('clients') && (
              <button 
                id="menu-btn-clients"
                onClick={() => navigateToView('clients')}
                title="Clientes"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'clients' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Clientes</span>}
                </div>
              </button>
            )}

            {isViewAccessible('vehicles') && (
              <button 
                id="menu-btn-vehicles"
                onClick={() => navigateToView('vehicles')}
                title="Veículos"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'vehicles' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Car className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Veículos</span>}
                </div>
              </button>
            )}

            {isViewAccessible('parts') && (
              <button 
                id="menu-btn-parts"
                onClick={() => navigateToView('parts')}
                title="Estoque & NFe"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'parts' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Package className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Estoque & NFe</span>}
                </div>
              </button>
            )}

            {isViewAccessible('units_of_measure') && (
              <button 
                id="menu-btn-units-of-measure"
                onClick={() => navigateToView('units_of_measure')}
                title="Unidades de Medida"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'units_of_measure' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Ruler className="w-4 h-4 shrink-0 text-indigo-400" />
                  {!isSidebarCollapsed && <span className="truncate">Unidades de Medida</span>}
                </div>
              </button>
            )}

            {isViewAccessible('quotations') && (
              <button 
                id="menu-btn-quotations"
                onClick={() => navigateToView('quotations')}
                title="Cotação & Fornecedores"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'quotations' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Cotação & Fornecedores</span>}
                </div>
              </button>
            )}

            {/* MENU GRUPO FINANCEIRO COM SUBMENU AO PASSAR O MOUSE / HOVER */}
            {(isViewAccessible('financial') || isViewAccessible('accounts_receivable') || isViewAccessible('accounts_payable') || isViewAccessible('fiscal') || isViewAccessible('fiscal_conference') || isViewAccessible('tax_obligations')) && (
              <div 
                className="relative space-y-1"
                onMouseEnter={() => setIsFinSubmenuOpen(true)}
                onMouseLeave={() => setIsFinSubmenuOpen(false)}
              >
                <button 
                  id="menu-btn-financial-parent"
                  onClick={() => setIsFinSubmenuOpen(prev => !prev)}
                  title="Módulo Financeiro & Fiscal"
                  className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                    ['financial', 'accounts_receivable', 'accounts_payable', 'fiscal', 'fiscal_conference', 'tax_obligations'].includes(activeView)
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Wallet className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isSidebarCollapsed && <span className="truncate">Financeiro & Fiscal</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center gap-1">
                      {isFinSubmenuOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-80" /> : <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                    </div>
                  )}
                </button>

                {/* SUBMENUS AO PASSAR O MOUSE / HOVER */}
                {(isFinSubmenuOpen || ['financial', 'accounts_receivable', 'accounts_payable', 'fiscal', 'fiscal_conference', 'tax_obligations'].includes(activeView)) && !isSidebarCollapsed && (
                  <div className="pl-4 pr-1 space-y-1 py-1 border-l-2 border-indigo-500/40 ml-4 animate-fade-in">
                    {isViewAccessible('financial') && (
                      <button
                        id="submenu-btn-financial"
                        onClick={() => navigateToView('financial')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'financial' ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Caixa & DRE</span>
                      </button>
                    )}

                    {isViewAccessible('accounts_receivable') && (
                      <button
                        id="submenu-btn-accounts-receivable"
                        onClick={() => navigateToView('accounts_receivable')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'accounts_receivable' ? 'bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Contas a Receber</span>
                      </button>
                    )}

                    {isViewAccessible('accounts_payable') && (
                      <button
                        id="submenu-btn-accounts-payable"
                        onClick={() => navigateToView('accounts_payable')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'accounts_payable' ? 'bg-rose-500/20 text-rose-200 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">Contas a Pagar</span>
                      </button>
                    )}

                    {isViewAccessible('representative_orders') && (
                      <button
                        id="submenu-btn-representative-orders-fin"
                        onClick={() => navigateToView('representative_orders')}
                        title="Confronto de Pedidos Realizados e Previsões da Representada"
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'representative_orders' ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Pedidos Realizados (Fábricas)</span>
                      </button>
                    )}

                    {isViewAccessible('fiscal_conference') && (
                      <button
                        id="submenu-btn-fiscal-conference"
                        onClick={() => navigateToView('fiscal_conference')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'fiscal_conference' ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">Fila de Conferência</span>
                      </button>
                    )}

                    {isViewAccessible('fiscal') && (
                      <button
                        id="submenu-btn-fiscal"
                        onClick={() => navigateToView('fiscal')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'fiscal' ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Fiscal, Boletos & SEFAZ</span>
                      </button>
                    )}

                    {isViewAccessible('tax_obligations') && (
                      <button
                        id="submenu-btn-tax-obligations"
                        onClick={() => navigateToView('tax_obligations')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'tax_obligations' ? 'bg-indigo-500/30 text-indigo-100 font-bold border border-indigo-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Obrigações & Guias Fiscais</span>
                      </button>
                    )}

                    {/* Botão de Acesso ao Portal Notas API dentro do submenu Fiscal */}
                    <button
                      id="submenu-btn-notas-api"
                      type="button"
                      onClick={() => {
                        setIsNotasApiOpen(true);
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/notas-api');
                        }
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-bold transition flex items-center gap-2 cursor-pointer text-indigo-300 hover:text-white hover:bg-slate-800/80 border border-indigo-500/30"
                      title="Portal Focus NFS-e / Sefin Nacional"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Notas API (Focus NFS-e)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Botão Principal Notas API (Focus NFS-e / Sefin Nacional) */}
            <button 
              id="menu-btn-notas-api"
              type="button"
              onClick={() => {
                setIsNotasApiOpen(true);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/notas-api');
                }
              }}
              title="Portal Notas API (Focus NFS-e / Sefin Nacional)"
              className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition hover:bg-slate-800 text-indigo-300 hover:text-white`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-indigo-400" />
                {!isSidebarCollapsed && <span className="truncate font-bold">Notas API</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono font-bold">NFS-e</span>
              )}
            </button>

            {isViewAccessible('services') && (
              <button 
                id="menu-btn-services"
                onClick={() => navigateToView('services')}
                title="Serviços / Mão de Obra"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'services' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wrench className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Serviços / Mão de Obra</span>}
                </div>
              </button>
            )}

            {isViewAccessible('budgets') && (
              <button 
                id="menu-btn-budgets"
                onClick={() => navigateToView('budgets')}
                title="Orçamentos Builder"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'budgets' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Orçamentos Builder</span>}
                </div>
              </button>
            )}

            {isViewAccessible('serviceOrders') && (
              <button 
                id="menu-btn-service-orders"
                onClick={() => navigateToView('serviceOrders')}
                title="Ordens de Serviço"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'serviceOrders' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Ordens de Serviço</span>}
                </div>
              </button>
            )}

            {isViewAccessible('industry') && (
              <button 
                id="menu-btn-industry"
                onClick={() => navigateToView('industry')}
                title="Produção & PCP (BOM/OP)"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'industry' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Factory className="w-4 h-4 shrink-0 text-amber-400" />
                  {!isSidebarCollapsed && <span className="truncate">Produção & PCP (BOM/OP)</span>}
                </div>
              </button>
            )}

            {isViewAccessible('history') && (
              <button 
                id="menu-btn-history"
                onClick={() => navigateToView('history')}
                title="Histórico Auditoria"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'history' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <History className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Histórico Auditoria</span>}
                </div>
              </button>
            )}

            {isViewAccessible('reports') && (
              <button 
                id="menu-btn-reports"
                onClick={() => navigateToView('reports')}
                title="Relatórios"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'reports' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Relatórios</span>}
                </div>
              </button>
            )}

            {isViewAccessible('users') && (
              <button 
                id="menu-btn-users"
                onClick={() => navigateToView('users')}
                title="Criar Usuários / Níveis"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'users' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Criar Usuários / Níveis</span>}
                </div>
              </button>
            )}

            {isViewAccessible('access_groups') && (
              <button 
                id="menu-btn-access-groups"
                onClick={() => navigateToView('access_groups')}
                title="Grupos de Acesso (RBAC 2.0)"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'access_groups' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <KeyRound className="w-4 h-4 shrink-0 text-indigo-400" />
                  {!isSidebarCollapsed && <span className="truncate">Grupos de Acesso (RBAC)</span>}
                </div>
              </button>
            )}

            {isViewAccessible('notifications_engine') && (
              <button 
                id="menu-btn-notification-engine"
                onClick={() => navigateToView('notifications_engine')}
                title="Motor Central de Notificações & Réguas"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'notifications_engine' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bell className="w-4 h-4 shrink-0 text-amber-400" />
                  {!isSidebarCollapsed && <span className="truncate">Motor Notificações</span>}
                </div>
              </button>
            )}

            {isViewAccessible('qa_panel') && (
              <button 
                id="menu-btn-qa-panel"
                onClick={() => navigateToView('qa_panel')}
                title="Painel de Testes QA"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'qa_panel' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bug className="w-4 h-4 shrink-0 text-amber-400" />
                  {!isSidebarCollapsed && <span className="truncate">Painel de Testes QA</span>}
                </div>
              </button>
            )}

            {isViewAccessible('data_migration') && (
              <button 
                id="menu-btn-data-migration"
                onClick={() => navigateToView('data_migration')}
                title="Conversor de Migração"
                className={`w-full flex items-center ${!isSidebarCollapsed ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeView === 'data_migration' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="w-4 h-4 shrink-0 text-cyan-400" />
                  {!isSidebarCollapsed && <span className="truncate">Conversor de Migração</span>}
                </div>
              </button>
            )}

            {/* Fim da Navegação Principal */}
          </nav>

          {/* Sidebar Footer (Active User Info & Logout) */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 space-y-2">
            <button 
              id="menu-btn-profile"
              onClick={() => navigateToView('profile')}
              title={`Perfil: ${currentUser.name}`}
              className={`w-full flex items-center ${!isSidebarCollapsed ? 'gap-2.5 p-2' : 'justify-center p-2'} rounded-lg text-left transition ${
                activeView === 'profile' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCircle className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-100 truncate leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate uppercase font-semibold">{currentUser.role}</p>
                </div>
              )}
            </button>

            <button 
              id="btn-sidebar-logout"
              onClick={triggerLogoutWithCheck}
              title="Sair da Conta (Sair)"
              className={`w-full flex items-center ${!isSidebarCollapsed ? 'gap-2 px-3 justify-start' : 'justify-center px-2'} text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 py-2 rounded-lg transition`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Sair da Conta</span>}
            </button>
          </div>
        </aside>

      {/* MAIN VIEW CONTENT CONTAINER WITH TOP HEADER */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* TOP BAR / HEADER WITH LOGOUT BUTTON & NOTIFICATION BELL */}
        <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shrink-0 shadow-2xs z-10" id="top-workspace-bar">
          <div className="flex items-center gap-3">
            {/* Toggle Sidebar Button */}
            <button
              id="btn-top-toggle-sidebar"
              type="button"
              onClick={toggleSidebarCollapse}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200/80 transition cursor-pointer flex items-center justify-center font-sans"
              title={isSidebarCollapsed ? "Expandir Menu Lateral" : "Retrair Menu Lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Notification Bell Button */}
            {(() => {
              const unreadNotifCount = (scopedDb.notifications || []).filter(n => !n.read).length;
              return (
                <button
                  id="btn-top-notifications"
                  onClick={() => setShowNotificationsModal(true)}
                  className="relative p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200/80 transition cursor-pointer flex items-center justify-center font-sans"
                  title="Central de Alertas e Notificações Configuráveis"
                >
                  <Bell className="w-4 h-4 text-indigo-600" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Documentação PDF Button (Acesso para Gestão) */}
            {(currentUser.role === 'admin' || currentUser.role === 'atendente' || currentUser.role === 'qa') && (
              <button
                id="btn-top-doc-pdf"
                onClick={() => setShowDocModal(true)}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-3xs cursor-pointer font-sans"
                title="Baixar ou visualizar documentação do sistema em PDF"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Documentação PDF</span>
              </button>
            )}

            <span className="text-xs font-semibold text-slate-500 font-sans hidden sm:inline">Empresa:</span>
            {userAccessibleCompanies.length > 1 ? (
              <div className="relative inline-flex items-center">
                <select
                  id="top-company-switcher-select"
                  value={activeCompanyId}
                  onChange={(e) => handleSwitchCompanyWorkspace(e.target.value)}
                  className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 text-xs font-bold px-2.5 py-1 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-hidden cursor-pointer shadow-3xs appearance-none pr-7 transition"
                  title="Alternar entre empresas autorizadas"
                >
                  {userAccessibleCompanies.map((comp) => {
                    const bType = getBusinessType(comp);
                    const label = bType === 'INDUSTRIA' ? '🏭 Indústria' : bType === 'COMERCIO' ? '🛒 Comércio' : bType === 'OFICINA_COMERCIO' ? '🏢 Híbrido' : '🔧 Oficina';
                    return (
                      <option key={comp.id} value={comp.id} className="bg-white text-slate-800">
                        {comp.name || 'Empresa'} ({label})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600 absolute right-2 pointer-events-none" />
              </div>
            ) : (
              <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-sans" id="top-company-badge">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                {activeCompanyObj?.name || db.companyInfo?.name || 'MotorDesk'}
              </span>
            )}

            {/* Segment Indicator Pill */}
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 font-sans hidden sm:inline-flex ${
              activeBusinessType === 'INDUSTRIA'
                ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                : activeBusinessType === 'COMERCIO' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : activeBusinessType === 'OFICINA_COMERCIO' 
                    ? 'bg-amber-50 text-amber-800 border-amber-300' 
                    : 'bg-indigo-50 text-indigo-800 border-indigo-300'
            }`}>
              {activeBusinessType === 'INDUSTRIA' && <Factory className="w-3 h-3 text-cyan-600" />}
              {activeBusinessType === 'COMERCIO' && <ShoppingBag className="w-3 h-3 text-emerald-600" />}
              {activeBusinessType === 'OFICINA_COMERCIO' && <Building2 className="w-3 h-3 text-amber-600" />}
              {activeBusinessType === 'OFICINA' && <Wrench className="w-3 h-3 text-indigo-600" />}
              {activeBusinessType === 'INDUSTRIA' ? 'Indústria' : activeBusinessType === 'COMERCIO' ? 'Comércio' : activeBusinessType === 'OFICINA_COMERCIO' ? 'Híbrido' : 'Oficina'}
            </span>

            <span className="text-xs font-semibold text-slate-500 font-sans hidden sm:inline">Sessão:</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-sans">
              <UserCircle className="w-3.5 h-3.5 text-indigo-600" />
              {currentUser.name} ({currentUser.role.toUpperCase()})
            </span>
          </div>

          {/* BOTÃO DE SAIR */}
          <button
            id="btn-top-logout"
            onClick={triggerLogoutWithCheck}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-3xs cursor-pointer font-sans"
            title="Encerrar sessão no sistema"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Sair do Sistema</span>
          </button>
        </header>

        {/* MAIN VIEW CONTENT AREA */}
        <main className="flex-1 p-8 overflow-y-auto" id="workspace-main-content">
          {activeView !== 'profile' && !isViewAllowedForBusinessType(activeView, activeBusinessType) ? (
            renderSegmentRestrictedScreen()
          ) : activeView !== 'profile' && !canAccessView(activeCompanyObj || db.companyInfo, currentUser, activeView, db) ? (
            renderLockedScreen()
          ) : (
            <>
              {activeView === 'dashboard' && currentUser.permissions.accessDashboard && (
            isModuleLocked('accessDashboard') ? renderLockedScreen() : (
              <DashboardView 
                db={scopedDb} 
                onNavigate={(view: string) => navigateToView(view as ViewID)} 
                businessType={activeBusinessType}
              />
            )
          )}

          {activeView === 'sales' && currentUser.permissions.accessSales && (
            isModuleLocked('accessSales') ? renderLockedScreen() : (
              <SalesView 
                db={db}
                onUpdateDb={syncDb}
                currentUser={currentUser}
                currentCompany={activeCompanyObj || db.companyInfo}
                isFiscalEnabled={activeCompanyObj?.globalModules?.accessFiscal !== false}
                onSaveCompanyInfo={handleSaveCompanyInfo}
              />
            )
          )}

          {activeView === 'withdrawals' && (currentUser.permissions.accessWithdrawals ?? true) && (
            isModuleLocked('accessWithdrawals') ? renderLockedScreen() : (
              <WithdrawalView 
                db={scopedDb}
                onUpdateDb={syncDb}
                currentUser={currentUser}
                currentCompany={activeCompanyObj || db.companyInfo}
                onNavigate={(view: string) => navigateToView(view as ViewID)}
              />
            )
          )}

          {activeView === 'carriers' && currentUser.permissions.accessCarriers && (
            isModuleLocked('accessCarriers') ? renderLockedScreen() : (
              <CarriersView 
                db={scopedDb}
                currentUser={currentUser}
                onSaveCarriers={handleSaveCarriers}
                onAddHistoryLog={handleAddHistoryLog}
              />
            )
          )}

          {activeView === 'clients' && currentUser.permissions.accessClients && (
            isModuleLocked('accessClients') ? renderLockedScreen() : (
              <ClientsView 
                db={scopedDb} 
                onSaveClients={handleSaveClients} 
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
              />
            )
          )}

          {activeView === 'vehicles' && currentUser.permissions.accessVehicles && (
            isModuleLocked('accessVehicles') ? renderLockedScreen() : (
              <VehiclesView 
                db={scopedDb} 
                onSaveVehicles={handleSaveVehicles} 
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
              />
            )
          )}

          {activeView === 'parts' && currentUser.permissions.accessParts && (
            isModuleLocked('accessParts') ? renderLockedScreen() : (
              <PartsView 
                db={scopedDb} 
                currentUser={currentUser}
                onSaveParts={handleSaveParts} 
                onSaveStockMovements={handleSaveStockMovements}
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
              />
            )
          )}

          {activeView === 'units_of_measure' && (currentUser.permissions.accessUnitsOfMeasure ?? (currentUser.role === 'admin' || currentUser.role === 'qa')) && (
            isModuleLocked('accessUnitsOfMeasure') ? renderLockedScreen() : (
              <UnitsOfMeasureView
                db={scopedDb}
                currentUser={currentUser}
                currentCompany={activeCompanyObj || db.companyInfo}
                onSaveUnitsOfMeasure={handleSaveUnitsOfMeasure}
                onAddHistoryLog={handleAddHistoryLog}
              />
            )
          )}

          {activeView === 'quotations' && currentUser.permissions.accessQuotations && (
            isModuleLocked('accessQuotations') ? renderLockedScreen() : (
              <QuotationsSuppliersView 
                db={scopedDb}
                currentUser={currentUser}
                onUpdateDb={syncDb}
                onAddHistoryLog={handleAddHistoryLog}
              />
            )
          )}

          {activeView === 'accounts_receivable' && currentUser.permissions.accessAccountsReceivable && (
            isModuleLocked('accessAccountsReceivable') ? renderLockedScreen() : (
              <AccountsReceivableView 
                db={scopedDb}
                currentUser={currentUser}
                onSaveReceivables={handleSaveReceivables}
                onSaveFiscalDocuments={handleSaveFiscalDocuments}
                onSaveBoletos={handleSaveBoletos}
                onSaveDatabaseUpdates={handleSaveDatabaseUpdates}
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
              />
            )
          )}

          {activeView === 'accounts_payable' && currentUser.permissions.accessAccountsPayable && (
            isModuleLocked('accessAccountsPayable') ? renderLockedScreen() : (
              <AccountsPayableView 
                db={scopedDb}
                currentUser={currentUser}
                onSavePayables={handleSavePayables}
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
                onSaveFullDatabase={syncDb}
              />
            )
          )}

          {activeView === 'financial' && currentUser.permissions.accessFinancial && (
            isModuleLocked('accessFinancial') ? renderLockedScreen() : (
              <FinancialView 
                db={scopedDb}
                currentUser={currentUser}
                onSaveTransactions={handleSaveTransactions}
                onAddHistoryLog={handleAddHistoryLog}
                onSaveAlertSettings={handleSaveAlertSettings}
                onUpdateDb={syncDb}
              />
            )
          )}

          {activeView === 'fiscal_conference' && (currentUser.permissions.accessFiscal ?? true) && (
            isModuleLocked('accessFiscal') ? renderLockedScreen() : (
              <FiscalConferenceView 
                db={db}
                onUpdateDb={syncDb}
                currentUser={currentUser}
                currentCompany={activeCompanyObj || db.companyInfo}
                onNavigate={navigateToView}
              />
            )
          )}

          {activeView === 'fiscal' && (currentUser.permissions.accessFiscal ?? true) && (
            isModuleLocked('accessFiscal') ? renderLockedScreen() : (
              <FiscalSefazView 
                db={scopedDb} 
                currentUser={currentUser}
                onSaveFiscalDocuments={handleSaveFiscalDocuments}
                onSaveBoletos={handleSaveBoletos}
                onSaveInterBranchSales={handleSaveInterBranchSales}
                onSaveSefazConfig={handleSaveSefazConfig}
                onSaveCompanyInfo={handleSaveCompanyInfo}
                onSaveReceivables={handleSaveReceivables}
                onSaveParts={handleSaveParts}
                onSaveServices={handleSaveServices}
                onSaveClients={handleSaveClients}
                onSaveTaxOperationNatures={handleSaveTaxOperationNatures}
                onSaveTaxRules={handleSaveTaxRules}
                onSaveXmlImportRecords={handleSaveXmlImportRecords}
                onSaveTaxObligationGuides={handleSaveTaxObligationGuides}
                onAddHistoryLog={handleAddHistoryLog}
              />
            )
          )}

          {activeView === 'tax_obligations' && (currentUser.permissions.accessFiscal ?? true) && (
            isModuleLocked('accessFiscal') ? renderLockedScreen() : (
              <TaxObligationsView
                db={scopedDb}
                currentUser={currentUser}
                currentCompany={activeCompanyObj || db.companyInfo}
                onSaveDatabase={handleSaveFullDatabase}
                onNavigate={(v: string) => setActiveView(v as ViewID)}
              />
            )
          )}

          {activeView === 'services' && currentUser.permissions.accessServices && (
            isModuleLocked('accessServices') ? renderLockedScreen() : (
              <ServicesView 
                db={scopedDb} 
                onSaveServices={handleSaveServices} 
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
              />
            )
          )}

          {activeView === 'budgets' && currentUser.permissions.accessBudgets && (
            isModuleLocked('accessBudgets') ? renderLockedScreen() : (
              <BudgetsView 
                db={scopedDb} 
                currentUser={currentUser}
                onSaveBudgets={handleSaveBudgets} 
                onSaveServiceOrders={handleSaveServiceOrders}
                onSaveCompanyInfo={handleSaveCompanyInfo}
                onAddNotification={handleAddNotification}
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
              />
            )
          )}

          {activeView === 'serviceOrders' && currentUser.permissions.accessServiceOrders && (
            isModuleLocked('accessServiceOrders') ? renderLockedScreen() : (
              <ServiceOrdersView 
                db={scopedDb} 
                currentUser={currentUser}
                onSaveServiceOrders={handleSaveServiceOrders}
                onSaveParts={handleSaveParts}
                onSaveMaintenanceLogs={handleSaveMaintenanceLogs}
                onSaveCompanyInfo={handleSaveCompanyInfo}
                onSaveReceivables={handleSaveReceivables}
                onSaveFiscalDocuments={handleSaveFiscalDocuments}
                onSaveBoletos={handleSaveBoletos}
                onAddNotification={handleAddNotification}
                onAddHistoryLog={handleAddHistoryLog}
                setUnsavedTask={setUnsavedTask}
              />
            )
          )}

          {activeView === 'industry' && (Boolean(currentUser.permissions.accessProduction) || Boolean(currentUser.permissions.accessIndustrialDashboard)) && (
            isModuleLocked('accessProduction') ? renderLockedScreen() : (
              <IndustrialView
                db={scopedDb}
                currentUser={currentUser}
                currentCompany={activeCompanyObj || db.companyInfo}
                onUpdateDb={syncDb}
                onAddHistoryLog={handleAddHistoryLog}
                onNavigateToView={navigateToView}
              />
            )
          )}

          {activeView === 'history' && currentUser.permissions.accessHistory && (
            isModuleLocked('accessHistory') ? renderLockedScreen() : (
              <HistoryView db={scopedDb} currentUser={currentUser} />
            )
          )}

          {activeView === 'reports' && currentUser.permissions.accessReports && (
            isModuleLocked('accessReports') ? renderLockedScreen() : (
              <ReportsView db={scopedDb} businessType={activeBusinessType} currentUser={currentUser} />
            )
          )}

          {activeView === 'users' && currentUser.permissions.accessUserManagement && (
            isModuleLocked('accessUserManagement') ? renderLockedScreen() : (
              <UserManagementView 
                db={scopedDb} 
                currentUser={currentUser}
                onSaveUsers={handleSaveUsers} 
                onSaveCompanyInfo={handleSaveCompanyInfo}
                onSaveRegisteredCompanies={handleSaveRegisteredCompanies}
                onAddHistoryLog={handleAddHistoryLog}
                globalModules={globalModules}
                onUpdateGlobalModules={handleUpdateGlobalModules}
                onSwitchActiveCompany={handleSwitchCompanyWorkspace}
                activeWorkspaceCompanyId={activeCompanyId}
              />
            )
          )}

          {activeView === 'access_groups' && currentUser.permissions.accessUserManagement && (
            isModuleLocked('accessUserManagement') ? renderLockedScreen() : (
              <AccessGroupsManagementView 
                db={scopedDb}
                currentUser={currentUser}
                currentCompany={activeCompanyObj || db.companyInfo}
                onSaveDatabase={handleSaveAccessGroupsDatabase}
              />
            )
          )}

          {activeView === 'profile' && (
            <ProfileView 
              currentUser={currentUser} 
              db={scopedDb} 
              onSaveUsers={handleSaveUsers} 
              onAddHistoryLog={handleAddHistoryLog}
            />
          )}

          {activeView === 'qa_panel' && currentUser.permissions.accessQAPanel && (
            <QAPortfolioView 
              testCases={db?.testCases || []} 
              db={db || undefined}
              currentUser={currentUser}
              onUpdateTestCaseStatus={handleUpdateTestCaseStatus}
              onResetTestCases={handleResetQADb}
              onRegisterCompany={handleRegisterCompanyFromQA}
              onOpenDocModal={() => setShowDocModal(true)}
            />
          )}

          {activeView === 'data_migration' && currentUser.permissions.accessQAPanel && (
            <DataMigrationConverterView 
              db={scopedDb}
              onSaveClients={handleSaveClients}
              onSaveVehicles={handleSaveVehicles}
              onSaveParts={handleSaveParts}
              onSaveServiceOrders={handleSaveServiceOrders}
              onAddHistoryLog={handleAddHistoryLog}
            />
          )}

          {(activeView === 'notifications_engine' || (activeView as string) === 'notification_engine') && (currentUser.permissions.accessNotificationsEngine || currentUser.permissions.accessNotificationEngine) && (
            (isModuleLocked('accessNotificationsEngine') || isModuleLocked('accessNotificationEngine')) ? renderLockedScreen() : (
              <NotificationEngineView 
                db={scopedDb}
                setDb={syncDb as any}
                currentUser={currentUser}
                activeCompanyId={activeCompanyId}
              />
            )
          )}

          {['representative_commerce', 'representative_orders', 'representative_reconciliation'].includes(activeView) && (
            (activeView === 'representative_orders' ? (currentUser.permissions.accessRepresentativeOrders || currentUser.permissions.accessRepresentativeCommerce) : currentUser.permissions.accessRepresentativeCommerce) ? (
              isModuleLocked(activeView === 'representative_orders' ? 'accessRepresentativeOrders' : 'accessRepresentativeCommerce') ? renderLockedScreen() : (
                <RepresentativeCommerceView 
                  db={scopedDb}
                  setDb={syncDb as any}
                  currentUser={currentUser}
                  activeCompanyId={activeCompanyId}
                  initialTab={activeView === 'representative_orders' ? 'orders' : activeView === 'representative_reconciliation' ? 'reconciliation' : undefined}
                  onAddHistoryLog={handleAddHistoryLog}
                  onNavigateToView={navigateToView}
                />
              )
            ) : null
          )}

          {/* Fallback de Segurança caso a view não corresponda a nenhum componente renderizado - Previne 100% Tela Branca */}
          {![
            'dashboard', 'sales', 'withdrawals', 'carriers', 'clients', 'vehicles', 
            'parts', 'units_of_measure', 'quotations', 'accounts_receivable', 
            'accounts_payable', 'financial', 'fiscal_conference', 'fiscal', 
            'tax_obligations', 'services', 'budgets', 'serviceOrders', 'industry', 
            'history', 'reports', 'users', 'access_groups', 'profile', 'qa_panel', 'data_migration',
            'notifications_engine', 'notification_engine', 'representative_commerce',
            'representative_orders', 'representative_reconciliation'
          ].includes(activeView) && (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200/80 my-12 animate-fade-in shadow-xs" id="fallback-view-screen">
              <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-xs font-bold">
                🧭
              </div>
              <h2 className="text-base font-bold text-slate-800 font-display">Acesso Direcionado</h2>
              <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                A visualização solicitada não está disponível para o seu nível de acesso ou não consta no contrato da empresa.
              </p>
              <button
                onClick={() => setActiveView(getFallbackViewForBusinessType(activeBusinessType, currentUser?.permissions))}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Voltar para a Página Principal
              </button>
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {/* GLOBAL UNSAVED CHANGES & LOGOUT CONFIRMATION MODAL */}
      {showUnsavedModal && (
        <div id="unsaved-changes-modal" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-indigo-150 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-full border border-amber-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base font-display">
                  {unsavedTask 
                    ? 'Ação / Alteração em Andamento!' 
                    : pendingTargetView === 'logout'
                      ? 'Confirmar Saída do Sistema'
                      : 'Alterações Não Salvas!'
                  }
                </h3>
                {unsavedTask && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                    Módulo: {unsavedTask.type}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {unsavedTask 
                ? 'Analisamos o sistema e identificamos que existe uma ação ou cadastro em andamento. Deseja salvar as alterações antes de continuar ou sair?'
                : pendingTargetView === 'logout'
                  ? 'Você está prestes a encerrar sua sessão no MotorDesk. Nenhuma alteração pendente foi detectada. Deseja realmente sair?'
                  : 'Você possui alterações pendentes ou formulários rascunhados que ainda não foram confirmados. Deseja salvar as modificações antes de prosseguir?'
              }
            </p>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
              {unsavedTask ? (
                <>
                  <button 
                    id="btn-unsaved-save"
                    onClick={handleModalSaveAndProceed}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-3xs cursor-pointer font-sans"
                  >
                    Sim, Salvar e {pendingTargetView === 'logout' ? 'Sair' : 'Continuar'}
                  </button>
                  <button 
                    id="btn-unsaved-discard"
                    onClick={handleModalDiscardAndProceed}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer font-sans"
                  >
                    Não, {pendingTargetView === 'logout' ? 'Sair sem Salvar' : 'Descartar'}
                  </button>
                  <button 
                    id="btn-unsaved-cancel"
                    onClick={() => {
                      setShowUnsavedModal(false);
                      setPendingTargetView(null);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer font-sans"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button 
                    id="btn-logout-confirm-sim"
                    onClick={handleModalDiscardAndProceed}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-3xs cursor-pointer font-sans"
                  >
                    Sim, Sair do Sistema
                  </button>
                  <button 
                    id="btn-logout-confirm-cancelar"
                    onClick={() => {
                      setShowUnsavedModal(false);
                      setPendingTargetView(null);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer font-sans"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS & ALERT CONFIGURATION MODAL */}
      <NotificationsModal 
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={scopedDb.notifications || []}
        alertSettings={db.alertSettings || INITIAL_ALERT_SETTINGS}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onClearNotifications={handleClearNotifications}
        onSaveAlertSettings={handleSaveAlertSettings}
        businessType={activeCompanyObj?.businessType || 'OFICINA'}
        currentUser={currentUser}
        onNavigateToView={(view) => {
          setShowNotificationsModal(false);
          navigateToView(view as ViewID);
        }}
      />

      {/* FULL DOCUMENTATION PDF MODAL (ACESSO EXCLUSIVO QA / ADMIN) */}
      {(currentUser.role === 'qa' || currentUser.username?.toLowerCase() === 'qa' || currentUser.permissions?.accessQAPanel || currentUser.role === 'admin') && (
        <FullDocumentationModal
          isOpen={showDocModal}
          onClose={() => setShowDocModal(false)}
          testCases={db.testCases}
          landingContent={db?.landingContent}
        />
      )}

      {/* POP-UP NOTIFICATIONS (BOTTOM RIGHT CORNER - PER PROFILE PERMISSION) */}
      <NotificationToastPopup 
        notifications={scopedDb.notifications || []}
        currentUser={currentUser}
        onMarkAsRead={(id) => {
          if (!db) return;
          const updated = (db.notifications || []).map(n => n.id === id ? { ...n, read: true } : n);
          syncDb({ ...db, notifications: updated });
        }}
        onNavigateToView={(view) => navigateToView(view as ViewID)}
      />
    </div>
  );
}
