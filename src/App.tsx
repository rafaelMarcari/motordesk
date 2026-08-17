/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getDatabase, 
  saveDatabase, 
  resetDatabase, 
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
  SystemNotification,
  AlertSettings,
  MaintenanceLog,
  PaymentMethodOption,
  TaxOperationNature,
  TaxRule,
  XmlImportRecord
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
  DollarSign,
  Wallet,
  ArrowDownRight,
  Receipt,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Wrench as ToolIcon 
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
import { SalesView } from './components/SalesView';
import NotificationToastPopup from './components/NotificationToastPopup';
import NotificationsModal from './components/NotificationsModal';
import LandingPresentationView, { LandingContent } from './components/LandingPresentationView';
import motordeskLogoImg from './assets/images/motordesk_logo_1786534067989.jpg';
import FullDocumentationModal from './components/FullDocumentationModal';
import PrivacyLgpdModal, { PrivacyLgpdFooter } from './components/PrivacyLgpdModal';
import { sweepExpiredBudgets, checkLowStockAlerts } from './utils/stockUtils';
import { syncServiceOrdersWithBudgets } from './utils/serviceOrderUtils';
import { AccountReceivable, AccountPayable, FinancialTransaction, FiscalDocument, BoletoDocument, InterBranchSaleLogistics, SefazApiConfig } from './types';
import { Globe, FileText } from 'lucide-react';
import {
  getBusinessType,
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

type ViewID = 
  | 'dashboard' 
  | 'sales'
  | 'clients' 
  | 'vehicles' 
  | 'parts' 
  | 'quotations'
  | 'accounts_receivable'
  | 'accounts_payable'
  | 'financial'
  | 'fiscal'
  | 'services' 
  | 'budgets' 
  | 'serviceOrders' 
  | 'history' 
  | 'reports' 
  | 'users' 
  | 'profile' 
  | 'qa_panel'
  | 'data_migration';

const VIEW_PERMISSION_MAP: Record<ViewID, keyof UserPermissions | null> = {
  dashboard: 'accessDashboard',
  sales: 'accessSales',
  clients: 'accessClients',
  vehicles: 'accessVehicles',
  parts: 'accessParts',
  quotations: 'accessQuotations',
  accounts_receivable: 'accessAccountsReceivable',
  accounts_payable: 'accessAccountsPayable',
  financial: 'accessFinancial',
  fiscal: 'accessFiscal',
  services: 'accessServices',
  budgets: 'accessBudgets',
  serviceOrders: 'accessServiceOrders',
  history: 'accessHistory',
  reports: 'accessReports',
  users: 'accessUserManagement',
  profile: null,
  qa_panel: 'accessQAPanel',
  data_migration: 'accessQAPanel'
};

export default function App() {
  // 1. Core DB State
  const [db, setDb] = useState<AppDatabase | null>(null);
  
  // 2. Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedLoginCompanyId, setSelectedLoginCompanyId] = useState<string>('');
  const [loginError, setLoginError] = useState('');
  const [loginHistory, setLoginHistory] = useState<{username: string, name: string, role: string, lastAccess: string}[]>([]);
  const [loginTab, setLoginTab] = useState<'login' | 'register_company'>('login');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasAcceptedLoginLgpd, setHasAcceptedLoginLgpd] = useState(true);

  // Multi-tenant Company Registration States
  const [regCompName, setRegCompName] = useState('');
  const [regCompCnpj, setRegCompCnpj] = useState('');
  const [regCompWhatsapp, setRegCompWhatsapp] = useState('');
  const [regCompPhone, setRegCompPhone] = useState('');
  const [regCompEmail, setRegCompEmail] = useState('');
  const [regCompAddress, setRegCompAddress] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminUsername, setRegAdminUsername] = useState('');
  const [regAdminPassword, setRegAdminPassword] = useState('');
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
  const [activeView, setActiveView] = useState<ViewID>('dashboard');
  const [isLanding, setIsLanding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/motordesk')) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
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
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
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

    const viewPermissionMap: Record<ViewID, keyof UserPermissions | null> = {
      dashboard: 'accessDashboard',
      sales: 'accessSales',
      clients: 'accessClients',
      vehicles: 'accessVehicles',
      parts: 'accessParts',
      quotations: 'accessQuotations',
      accounts_receivable: 'accessAccountsReceivable',
      accounts_payable: 'accessAccountsPayable',
      financial: 'accessFinancial',
      fiscal: 'accessFiscal',
      services: 'accessServices',
      budgets: 'accessBudgets',
      serviceOrders: 'accessServiceOrders',
      history: 'accessHistory',
      reports: 'accessReports',
      users: 'accessUserManagement',
      profile: null,
      qa_panel: 'accessQAPanel',
      data_migration: 'accessQAPanel'
    };

    const requiredPerm = viewPermissionMap[activeView];
    const isAllowed = requiredPerm ? (currentUser.permissions[requiredPerm] ?? true) : true;
    if (!isAllowed) {
      const firstAllowed = (Object.keys(viewPermissionMap) as ViewID[]).find(v => {
        const perm = viewPermissionMap[v];
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
      try {
        const loadedDb = await dataProvider.getDatabase();
        if (!isMounted) return;
        if (loadedDb.serviceOrders && loadedDb.budgets) {
          const { updatedOrders, hasChanges } = syncServiceOrdersWithBudgets(loadedDb.serviceOrders, loadedDb.budgets);
          if (hasChanges) {
            loadedDb.serviceOrders = updatedOrders;
            dataProvider.saveDatabase(loadedDb).catch(err => {
              console.warn('[MotorDesk] Aviso não-bloqueante ao sincronizar ordens de serviço no banco:', err);
            });
          }
        }
        if (loadedDb.globalModules) {
          setGlobalModules(loadedDb.globalModules);
        }
        if (loadedDb.loginHistory) {
          setLoginHistory(loadedDb.loginHistory);
        }
        setDb(loadedDb);
      } catch (e: any) {
        console.error('Falha ao inicializar banco de dados:', e);
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
    const syncWithServer = async () => {
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

  // Run automatic budget expiration sweep, OS auto-sync and low stock checks
  useEffect(() => {
    if (db && db.budgets && db.parts) {
      const sweepRes = sweepExpiredBudgets(db);
      const lowStockNotifs = checkLowStockAlerts(db);
      const osSyncRes = db.serviceOrders ? syncServiceOrdersWithBudgets(db.serviceOrders, db.budgets) : { updatedOrders: db.serviceOrders, hasChanges: false };

      if (sweepRes.expiredCount > 0 || lowStockNotifs.length > 0 || osSyncRes.hasChanges) {
        const mergedNotifications = [
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
  }, [db?.budgets?.length, db?.parts?.length, db?.serviceOrders?.length]);

  // Keep currentUser permissions in sync with db.users in real time
  useEffect(() => {
    if (db && currentUser) {
      const rawUser = (db.users || []).find(
        u => u.id === currentUser.id || (u.username && u.username.toLowerCase() === currentUser.username.toLowerCase())
      );
      if (rawUser) {
        const freshUser = normalizeUser(rawUser);
        if (
          JSON.stringify(freshUser.permissions) !== JSON.stringify(currentUser.permissions) ||
          freshUser.role !== currentUser.role ||
          freshUser.name !== currentUser.name
        ) {
          setCurrentUser(freshUser);
        }
      }
    }
  }, [db?.users, currentUser?.id]);

  // Fallback activeView if current module permission is revoked
  useEffect(() => {
    if (!currentUser) return;
    const requiredPerm = VIEW_PERMISSION_MAP[activeView];
    if (requiredPerm !== null && requiredPerm !== undefined && !currentUser.permissions[requiredPerm]) {
      const firstAllowed = (Object.keys(VIEW_PERMISSION_MAP) as ViewID[]).find(v => {
        const perm = VIEW_PERMISSION_MAP[v];
        return perm === null || Boolean(currentUser.permissions[perm]);
      });
      setActiveView(firstAllowed || 'profile');
    }
  }, [currentUser?.permissions, activeView]);

  const handleUpdateGlobalModules = (updatedModules: { [key: string]: boolean }) => {
    setGlobalModules(updatedModules);
    syncDb(prev => ({
      ...prev,
      globalModules: updatedModules
    }));
    
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

  // Multi-tenant scoping helper: derive active company ID for current logged user
  const activeCompanyId = currentUser?.companyId || db?.companyInfo?.id || 'comp-1';
  const activeCompanyObj = (db?.registeredCompanies || []).find(c => c.id === activeCompanyId) || db?.companyInfo;
  const activeCompanyModules = activeCompanyObj?.globalModules || globalModules;
  const activeBusinessType = getBusinessType(activeCompanyObj);
  const activeSegmentMeta = getSegmentMetadata(activeBusinessType);

  // Auto-redirect if active view is not supported by current company business type
  useEffect(() => {
    if (!currentUser) return;
    if (!isViewAllowedForBusinessType(activeView, activeBusinessType)) {
      const fallback = getFallbackViewForBusinessType(activeBusinessType, currentUser.permissions);
      setActiveView(fallback);
    }
  }, [activeCompanyId, activeBusinessType, currentUser, activeView]);

  // Scoped database view providing strict multi-tenant isolation
  const scopedDb = React.useMemo<AppDatabase>(() => {
    if (!db) {
      return {
        companyInfo: { id: 'comp-1', name: '', cnpj: '', phone: '', whatsapp: '', email: '', address: '', welcomeMessage: '', registeredAt: '' },
        users: [], clients: [], vehicles: [], parts: [], services: [], budgets: [], serviceOrders: [], history: [], testCases: [], notifications: []
      };
    }

    return {
      ...db,
      clients: (db.clients || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      vehicles: (db.vehicles || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      parts: (db.parts || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      services: (db.services || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      budgets: (db.budgets || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      serviceOrders: (db.serviceOrders || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      history: (db.history || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      suppliers: (db.suppliers || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      quotations: (db.quotations || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      accountsReceivable: (db.accountsReceivable || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      accountsPayable: (db.accountsPayable || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      financialTransactions: (db.financialTransactions || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      users: (db.users || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      notifications: (db.notifications || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      stockMovements: (db.stockMovements || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      supplierPartPrices: (db.supplierPartPrices || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
      maintenanceLogs: (db.maintenanceLogs || []).filter(item => (item.companyId || 'comp-1') === activeCompanyId),
    };
  }, [db, activeCompanyId]);

  // State Updaters passed to Views (Preserving multi-tenant data for other companies)
  const handleSaveClients = (clients: Client[]) => {
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
    financialTransactions: FinancialTransaction[]
  ) => {
    const formattedAP = accountsPayable.map(ap => ({ ...ap, companyId: ap.companyId || activeCompanyId }));
    const formattedFT = financialTransactions.map(ft => ({ ...ft, companyId: ft.companyId || activeCompanyId }));

    syncDb(prev => {
      const otherAP = (prev.accountsPayable || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);
      const otherFT = (prev.financialTransactions || []).filter(item => (item.companyId || 'comp-1') !== activeCompanyId);

      return {
        ...prev,
        accountsPayable: [...otherAP, ...formattedAP],
        financialTransactions: [...otherFT, ...formattedFT]
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
    syncDb(prev => ({ ...prev, sefazConfig }));
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

  const handleSaveUsers = (users: User[]) => {
    syncDb(prev => {
      // Merge users intelligently so other companies and existing operators are preserved safely
      const userMap = new Map((prev.users || []).map(u => [u.id, u]));
      users.forEach(u => userMap.set(u.id, u));
      const mergedUsers = Array.from(userMap.values());
      return { ...prev, users: mergedUsers };
    });
    if (currentUser) {
      const updatedSelf = users.find(
        u => u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()
      );
      if (updatedSelf) {
        setCurrentUser({ ...updatedSelf });
      }
    }
  };

  const handleSaveTestCases = (testCases: TestCase[]) => {
    syncDb(prev => ({ ...prev, testCases }));
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

  const handleSaveRegisteredCompanies = (companies: CompanyInfo[], activeCompanyId?: string, newUsers?: User[]) => {
    setDb(prev => {
      if (!prev) return prev;
      const activeComp = activeCompanyId 
        ? companies.find(c => c.id === activeCompanyId) || prev.companyInfo
        : prev.companyInfo;

      let mergedUsers = prev.users || [];
      if (newUsers && newUsers.length > 0) {
        const userMap = new Map(mergedUsers.map(u => [u.id, u]));
        newUsers.forEach(u => userMap.set(u.id, u));
        mergedUsers = Array.from(userMap.values());
      }

      const nextDb = {
        ...prev,
        companyInfo: activeComp,
        registeredCompanies: companies,
        users: mergedUsers
      };
      dataProvider.saveDatabaseImmediate(nextDb);
      return nextDb;
    });
  };

  const handleRegisterCompanyFromQA = (companyInfo: CompanyInfo, adminUser?: User, qaUser?: User) => {
    setDb(prev => {
      if (!prev) return prev;
      const currentList = prev.registeredCompanies && prev.registeredCompanies.length > 0 
        ? prev.registeredCompanies 
        : [prev.companyInfo || companyInfo];

      const updatedList = currentList.map(c => c.id === companyInfo.id ? companyInfo : c);
      if (!updatedList.some(c => c.id === companyInfo.id)) {
        updatedList.push(companyInfo);
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
        companyInfo,
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

  // Calculate matching companies for typed username
  const matchingCompaniesForLogin = React.useMemo(() => {
    if (!db || !loginUsername.trim()) return [];
    const cleanUsername = loginUsername.trim().toLowerCase();
    
    // Find all users matching this username
    const matchingUsers = (db.users || []).filter(u => u.username.toLowerCase() === cleanUsername);
    if (matchingUsers.length === 0) return [];

    const allCompanies: CompanyInfo[] = [];
    if (db.registeredCompanies && db.registeredCompanies.length > 0) {
      allCompanies.push(...db.registeredCompanies);
    } else if (db.companyInfo) {
      allCompanies.push(db.companyInfo);
    }

    const companyIds = Array.from(new Set(matchingUsers.map(u => u.companyId || 'comp-1')));
    return allCompanies.filter(c => companyIds.includes(c.id));
  }, [db, loginUsername]);

  // Synchronize selectedLoginCompanyId based on typed username and matching companies
  useEffect(() => {
    if (matchingCompaniesForLogin.length > 0) {
      if (!selectedLoginCompanyId || !matchingCompaniesForLogin.some(c => c.id === selectedLoginCompanyId)) {
        setSelectedLoginCompanyId(matchingCompaniesForLogin[0].id);
      }
    } else {
      setSelectedLoginCompanyId('');
    }
  }, [matchingCompaniesForLogin, selectedLoginCompanyId]);

  // Login handler with strict multi-tenant company block check
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
    const targetCompId = selectedLoginCompanyId || matchingCompaniesForLogin[0]?.id || db.companyInfo?.id || 'comp-1';

    // 1. Try matching with the target company first
    let matchedUser = (db.users || []).find(
      u => u.username.toLowerCase() === cleanUsername && 
           u.passwordHash === enteredPassword &&
           (u.companyId || 'comp-1') === targetCompId
    );

    // 2. If not matched in selected company, check if password matches across any other company
    if (!matchedUser) {
      const anyCompMatch = (db.users || []).find(
        u => u.username.toLowerCase() === cleanUsername && 
             u.passwordHash === enteredPassword
      );
      if (anyCompMatch) {
        // If user has admin or QA role, allow them to log into the selected company directly
        if (anyCompMatch.role === 'admin' || anyCompMatch.role === 'qa') {
          matchedUser = {
            ...anyCompMatch,
            companyId: targetCompId
          };
        } else {
          matchedUser = anyCompMatch;
          if (anyCompMatch.companyId) {
            setSelectedLoginCompanyId(anyCompMatch.companyId);
          }
        }
      }
    }

    // 3. Fallback: case-insensitive match for password
    if (!matchedUser) {
      const userWithAnyCasePass = (db.users || []).find(
        u => u.username.toLowerCase() === cleanUsername && 
             u.passwordHash.toLowerCase() === enteredPassword.toLowerCase()
      );
      if (userWithAnyCasePass) {
        if (userWithAnyCasePass.role === 'admin' || userWithAnyCasePass.role === 'qa') {
          matchedUser = {
            ...userWithAnyCasePass,
            companyId: targetCompId
          };
        } else {
          matchedUser = userWithAnyCasePass;
          if (userWithAnyCasePass.companyId) {
            setSelectedLoginCompanyId(userWithAnyCasePass.companyId);
          }
        }
      }
    }

    if (matchedUser) {
      // Sync active company with effective companyId
      const userCompId = matchedUser.companyId || targetCompId || 'comp-1';
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

      // Normalize user permissions for legacy database safety
      matchedUser = normalizeUser(matchedUser);

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

      // Batch state update
      syncDb(prev => ({
        ...prev,
        ...(matchedComp ? { companyInfo: matchedComp } : {}),
        loginHistory: updatedHistory
      }));

      setCurrentUser(matchedUser);
      const sessionToken = `motordesk_session_${matchedUser.id}_${Date.now()}`;
      localStorage.setItem('motordesk_auth_token', sessionToken);

      // Determine default accessible landing view based on user permissions
      const viewPermissionMap: Record<ViewID, keyof UserPermissions | null> = {
        dashboard: 'accessDashboard',
        sales: 'accessSales',
        clients: 'accessClients',
        vehicles: 'accessVehicles',
        parts: 'accessParts',
        quotations: 'accessQuotations',
        accounts_receivable: 'accessAccountsReceivable',
        accounts_payable: 'accessAccountsPayable',
        financial: 'accessFinancial',
        fiscal: 'accessFiscal',
        services: 'accessServices',
        budgets: 'accessBudgets',
        serviceOrders: 'accessServiceOrders',
        history: 'accessHistory',
        reports: 'accessReports',
        users: 'accessUserManagement',
        profile: null,
        qa_panel: 'accessQAPanel',
        data_migration: 'accessQAPanel'
      };

      const matchedCompanyBusinessType = getBusinessType(matchedComp);
      const firstAllowed = (Object.keys(viewPermissionMap) as ViewID[]).find(v => {
        if (!isViewAllowedForBusinessType(v, matchedCompanyBusinessType)) return false;
        const perm = viewPermissionMap[v];
        return perm === null || (matchedUser!.permissions[perm] ?? true);
      });
      setActiveView(firstAllowed || 'profile');
      
      // Clear password inputs
      setLoginPassword('');
      setLoginUsername('');
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

  // Logout routine (trigger checking)
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('motordesk_auth_token');
    setUnsavedTask(null);
    setShowUnsavedModal(false);
    setPendingTargetView(null);
  };

  // Safe navigation checks for unsaved forms with segmentation fallback
  const navigateToView = (view: ViewID) => {
    const currentActiveComp = (db?.registeredCompanies || []).find(c => c.id === activeCompanyId) || db?.companyInfo;
    const curBusinessType = getBusinessType(currentActiveComp);
    
    const targetView = isViewAllowedForBusinessType(view, curBusinessType)
      ? view
      : getFallbackViewForBusinessType(curBusinessType, currentUser?.permissions);

    if (unsavedTask) {
      setPendingTargetView(targetView);
      setShowUnsavedModal(true);
    } else {
      setActiveView(targetView);
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

    const existingUser = db.users.find(u => u.username.toLowerCase() === regAdminUsername.trim().toLowerCase());
    if (existingUser) {
      setLoginError(`O nome de usuário "${regAdminUsername}" já está em uso por outro operador.`);
      return;
    }

    const companyId = `comp-${Date.now()}`;
    const newCompany: CompanyInfo = {
      id: companyId,
      name: regCompName.trim(),
      cnpj: regCompCnpj.trim(),
      phone: regCompPhone.trim() || regCompWhatsapp.trim(),
      whatsapp: regCompWhatsapp.trim(),
      email: regCompEmail.trim() || 'contato@oficina.com.br',
      address: regCompAddress.trim() || 'Matriz Principal',
      welcomeMessage: 'Agradecemos pela preferência!',
      registeredAt: new Date().toISOString()
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

    // Auto-create default QA user with full permissions for the new company
    const newCompanyQAUser: User = {
      id: `usr-qa-${Date.now()}`,
      username: 'qa',
      name: `Analista de QA (${newCompany.name})`,
      role: 'qa',
      passwordHash: 'qa123',
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

    const updatedCompanies = [...(db.registeredCompanies || []), newCompany];
    const updatedUsers = [...db.users, newAdminUser, newCompanyQAUser];

    const updatedDb: AppDatabase = {
      ...db,
      companyInfo: newCompany,
      registeredCompanies: updatedCompanies,
      users: updatedUsers
    };

    // Immediate flush to Cloud SQL
    dataProvider.saveDatabaseImmediate(updatedDb);
    setDb(updatedDb);

    // Auto Login as new admin
    setCurrentUser(newAdminUser);
    localStorage.setItem('motordesk_auth_token', `motordesk_session_${newAdminUser.id}_${Date.now()}`);

    handleAddHistoryLog(
      'system',
      'Nova Empresa Cadastrada & Acessos Liberados',
      `Empresa/Oficina "${newCompany.name}" (CNPJ: ${newCompany.cnpj}) cadastrada no sistema. Acesso master liberado para ${newAdminUser.name} (@${newAdminUser.username}).`,
      '',
      ''
    );

    setLoginError('');
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
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <ToolIcon className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-slate-600 font-semibold">Carregando Banco de Dados local do MotorDesk...</p>
        </div>
      </div>
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
                {loginPageData.logoUrl ? (
                  <img
                    src={loginPageData.logoUrl}
                    alt="Logo MotorDesk"
                    className="w-10 h-10 object-contain rounded-xl bg-slate-950/60 p-1 border border-slate-700/60 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ToolIcon className="w-7 h-7 text-indigo-400" />
                )}
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

            {loginError && (
              <div id="login-error-alert" className="p-3 bg-rose-50 text-rose-800 text-xs font-medium rounded-lg border border-rose-100 animate-shake">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4" id="form-login">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase" htmlFor="login-username-input">Usuário (Username)</label>
                <input 
                  id="login-username-input"
                  type="text" 
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Ex: admin ou qa" 
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition font-mono"
                  required
                />
              </div>

              {/* Multi-Company Selector Combobox - Only shown when the typed username is registered in MORE THAN 1 company */}
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
                    {matchingCompaniesForLogin.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.companyType === 'filial' ? '🏬 Filial: ' : '🏢 '}
                        {comp.name} {comp.cnpj ? `— CNPJ: ${comp.cnpj}` : ''}
                        {comp.subscriptionStatus === 'blocked' ? ' 🔒 (Bloqueada)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-700 font-medium">
                    Usuário cadastrado em mais de uma empresa. Selecione a unidade onde deseja fazer login.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase" htmlFor="login-password-input">Senha</label>
                <input 
                  id="login-password-input"
                  type="password" 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Insira sua senha de operador (Ex: qa123)" 
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 transition"
                  required
                />
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
            </form>
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

  const isModuleLocked = (permissionKey: string) => {
    if (permissionKey === 'accessUserManagement' || permissionKey === 'accessDashboard') return false;

    // Strict centralized segmentation check
    if (!isModuleAllowedForBusinessType(permissionKey, activeBusinessType)) {
      return true;
    }

    return activeCompanyModules[permissionKey as keyof typeof activeCompanyModules] === false;
  };

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

  // MAIN WORKSPACE INTERFACE
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans" id="app-workspace-shell">
      {/* SIDEBAR NAVIGATION WRAPPER (Retractable & Collapsible) */}
      <div 
        className={`transition-all duration-300 ease-in-out shrink-0 relative ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <aside 
          id="sidebar-container"
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-all duration-300 ease-in-out h-full ${
            isSidebarCollapsed ? 'absolute top-0 left-0 bottom-0 z-30 shadow-2xl' : 'relative w-64'
          } ${
            isSidebarCollapsed && isSidebarHovered ? 'w-64' : isSidebarCollapsed ? 'w-16 overflow-x-hidden' : 'w-64'
          }`}
        >
          {/* Top Header */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <ToolIcon className="w-5 h-5 text-indigo-400 shrink-0" />
              {(!isSidebarCollapsed || isSidebarHovered) && (
                <div className="truncate">
                  <span className="font-extrabold text-white text-base font-display tracking-tight block leading-none">MotorDesk</span>
                  <p className="text-[9px] text-indigo-300 font-semibold uppercase mt-0.5 font-mono truncate">{activeSegmentMeta.label}</p>
                </div>
              )}
            </div>

            <button
              id="btn-toggle-sidebar"
              type="button"
              onClick={toggleSidebarCollapse}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0 cursor-pointer"
              title={isSidebarCollapsed ? "Fixar Menu Expandido" : "Retrair Menu Lateral"}
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
            {currentUser.permissions.accessDashboard && isViewAllowedForBusinessType('dashboard', activeBusinessType) && (
              <button 
                id="menu-btn-dashboard"
                onClick={() => !isModuleLocked('accessDashboard') && navigateToView('dashboard')}
                disabled={isModuleLocked('accessDashboard')}
                title="Dashboard KPI"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessDashboard')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'dashboard' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Dashboard KPI</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessDashboard === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessSales && isViewAllowedForBusinessType('sales', activeBusinessType) && (
              <button 
                id="menu-btn-sales"
                onClick={() => !isModuleLocked('accessSales') && navigateToView('sales')}
                disabled={isModuleLocked('accessSales')}
                title="Vendas & Balcão (PDV / Comércio)"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessSales')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'sales' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag className="w-4 h-4 shrink-0 text-emerald-400" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Vendas & Balcão</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessSales === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessClients && isViewAllowedForBusinessType('clients', activeBusinessType) && (
              <button 
                id="menu-btn-clients"
                onClick={() => !isModuleLocked('accessClients') && navigateToView('clients')}
                disabled={isModuleLocked('accessClients')}
                title="Clientes"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessClients')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'clients' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Clientes</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessClients === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessVehicles && isViewAllowedForBusinessType('vehicles', activeBusinessType) && (
              <button 
                id="menu-btn-vehicles"
                onClick={() => !isModuleLocked('accessVehicles') && navigateToView('vehicles')}
                disabled={isModuleLocked('accessVehicles')}
                title="Veículos"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessVehicles')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'vehicles' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Car className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Veículos</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessVehicles === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessParts && isViewAllowedForBusinessType('parts', activeBusinessType) && (
              <button 
                id="menu-btn-parts"
                onClick={() => !isModuleLocked('accessParts') && navigateToView('parts')}
                disabled={isModuleLocked('accessParts')}
                title="Estoque & NFe"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessParts')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'parts' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Package className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Estoque & NFe</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessParts === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessQuotations && isViewAllowedForBusinessType('quotations', activeBusinessType) && (
              <button 
                id="menu-btn-quotations"
                onClick={() => !isModuleLocked('accessQuotations') && navigateToView('quotations')}
                disabled={isModuleLocked('accessQuotations')}
                title="Cotação & Fornecedores"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessQuotations')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'quotations' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Cotação & Fornecedores</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessQuotations === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {/* MENU GRUPO FINANCEIRO COM SUBMENU AO PASSAR O MOUSE / HOVER */}
            {(currentUser.permissions.accessFinancial || currentUser.permissions.accessAccountsReceivable || currentUser.permissions.accessAccountsPayable || (currentUser.permissions.accessFiscal ?? true)) && isViewAllowedForBusinessType('financial', activeBusinessType) && (
              <div 
                className="relative space-y-1"
                onMouseEnter={() => setIsFinSubmenuOpen(true)}
                onMouseLeave={() => setIsFinSubmenuOpen(false)}
              >
                <button 
                  id="menu-btn-financial-parent"
                  onClick={() => setIsFinSubmenuOpen(prev => !prev)}
                  title="Módulo Financeiro & Fiscal"
                  className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                    ['financial', 'accounts_receivable', 'accounts_payable', 'fiscal'].includes(activeView)
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Wallet className="w-4 h-4 shrink-0 text-emerald-400" />
                    {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Financeiro & Fiscal</span>}
                  </div>
                  {(!isSidebarCollapsed || isSidebarHovered) && (
                    <div className="flex items-center gap-1">
                      {isFinSubmenuOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-80" /> : <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                    </div>
                  )}
                </button>

                {/* SUBMENUS AO PASSAR O MOUSE / HOVER */}
                {(isFinSubmenuOpen || ['financial', 'accounts_receivable', 'accounts_payable', 'fiscal'].includes(activeView)) && (!isSidebarCollapsed || isSidebarHovered) && (
                  <div className="pl-4 pr-1 space-y-1 py-1 border-l-2 border-indigo-500/40 ml-4 animate-fade-in">
                    {currentUser.permissions.accessFinancial && (
                      <button
                        id="submenu-btn-financial"
                        onClick={() => !isModuleLocked('accessFinancial') && navigateToView('financial')}
                        disabled={isModuleLocked('accessFinancial')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'financial' ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Caixa & DRE</span>
                      </button>
                    )}

                    {currentUser.permissions.accessAccountsReceivable && (
                      <button
                        id="submenu-btn-accounts-receivable"
                        onClick={() => !isModuleLocked('accessAccountsReceivable') && navigateToView('accounts_receivable')}
                        disabled={isModuleLocked('accessAccountsReceivable')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'accounts_receivable' ? 'bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Contas a Receber</span>
                      </button>
                    )}

                    {currentUser.permissions.accessAccountsPayable && (
                      <button
                        id="submenu-btn-accounts-payable"
                        onClick={() => !isModuleLocked('accessAccountsPayable') && navigateToView('accounts_payable')}
                        disabled={isModuleLocked('accessAccountsPayable')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'accounts_payable' ? 'bg-rose-500/20 text-rose-200 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">Contas a Pagar</span>
                      </button>
                    )}

                    {(currentUser.permissions.accessFiscal ?? true) && (
                      <button
                        id="submenu-btn-fiscal"
                        onClick={() => !isModuleLocked('accessFiscal') && navigateToView('fiscal')}
                        disabled={isModuleLocked('accessFiscal')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-2 cursor-pointer ${
                          activeView === 'fiscal' ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Fiscal, Boletos & SEFAZ</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentUser.permissions.accessServices && isViewAllowedForBusinessType('services', activeBusinessType) && (
              <button 
                id="menu-btn-services"
                onClick={() => !isModuleLocked('accessServices') && navigateToView('services')}
                disabled={isModuleLocked('accessServices')}
                title="Serviços / Mão de Obra"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessServices')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'services' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wrench className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Serviços / Mão de Obra</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessServices === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessBudgets && isViewAllowedForBusinessType('budgets', activeBusinessType) && (
              <button 
                id="menu-btn-budgets"
                onClick={() => !isModuleLocked('accessBudgets') && navigateToView('budgets')}
                disabled={isModuleLocked('accessBudgets')}
                title="Orçamentos Builder"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessBudgets')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'budgets' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Orçamentos Builder</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessBudgets === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessServiceOrders && isViewAllowedForBusinessType('serviceOrders', activeBusinessType) && (
              <button 
                id="menu-btn-service-orders"
                onClick={() => !isModuleLocked('accessServiceOrders') && navigateToView('serviceOrders')}
                disabled={isModuleLocked('accessServiceOrders')}
                title="Ordens de Serviço"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessServiceOrders')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'serviceOrders' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Ordens de Serviço</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessServiceOrders === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessHistory && isViewAllowedForBusinessType('history', activeBusinessType) && (
              <button 
                id="menu-btn-history"
                onClick={() => !isModuleLocked('accessHistory') && navigateToView('history')}
                disabled={isModuleLocked('accessHistory')}
                title="Histórico Auditoria"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessHistory')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'history' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <History className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Histórico Auditoria</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessHistory === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessReports && isViewAllowedForBusinessType('reports', activeBusinessType) && (
              <button 
                id="menu-btn-reports"
                onClick={() => !isModuleLocked('accessReports') && navigateToView('reports')}
                disabled={isModuleLocked('accessReports')}
                title="Relatórios"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessReports')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'reports' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Relatórios</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessReports === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessUserManagement && isViewAllowedForBusinessType('users', activeBusinessType) && (
              <button 
                id="menu-btn-users"
                onClick={() => !isModuleLocked('accessUserManagement') && navigateToView('users')}
                disabled={isModuleLocked('accessUserManagement')}
                title="Criar Usuários / Níveis"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessUserManagement')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'users' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Criar Usuários / Níveis</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessUserManagement === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessQAPanel && (
              <button 
                id="menu-btn-qa-panel"
                onClick={() => !isModuleLocked('accessQAPanel') && navigateToView('qa_panel')}
                disabled={isModuleLocked('accessQAPanel')}
                title="Painel de Testes QA"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessQAPanel')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'qa_panel' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bug className="w-4 h-4 shrink-0 text-amber-400" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Painel de Testes QA</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && activeCompanyModules.accessQAPanel === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
              </button>
            )}

            {currentUser.permissions.accessQAPanel && (
              <button 
                id="menu-btn-data-migration"
                onClick={() => !isModuleLocked('accessQAPanel') && navigateToView('data_migration')}
                disabled={isModuleLocked('accessQAPanel')}
                title="Conversor de Migração"
                className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  isModuleLocked('accessQAPanel')
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : activeView === 'data_migration' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="w-4 h-4 shrink-0 text-cyan-400" />
                  {(!isSidebarCollapsed || isSidebarHovered) && <span className="truncate">Conversor de Migração</span>}
                </div>
                {(!isSidebarCollapsed || isSidebarHovered) && globalModules.accessQAPanel === false && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded border border-amber-500/20 font-mono">🔒</span>
                )}
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
              className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'gap-2.5 p-2' : 'justify-center p-2'} rounded-lg text-left transition ${
                activeView === 'profile' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCircle className="w-5 h-5 shrink-0" />
              {(!isSidebarCollapsed || isSidebarHovered) && (
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
              className={`w-full flex items-center ${(!isSidebarCollapsed || isSidebarHovered) ? 'gap-2 px-3 justify-start' : 'justify-center px-2'} text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 py-2 rounded-lg transition`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {(!isSidebarCollapsed || isSidebarHovered) && <span>Sair da Conta</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* MAIN VIEW CONTENT CONTAINER WITH TOP HEADER */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR / HEADER WITH LOGOUT BUTTON & NOTIFICATION BELL */}
        <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shrink-0 shadow-2xs z-10" id="top-workspace-bar">
          <div className="flex items-center gap-3">
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
            <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-sans">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              {db.companyInfo?.name || 'MotorDesk'}
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
                onAddHistoryLog={handleAddHistoryLog}
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

          {activeView === 'history' && currentUser.permissions.accessHistory && (
            isModuleLocked('accessHistory') ? renderLockedScreen() : (
              <HistoryView db={scopedDb} currentUser={currentUser} fullDb={db} />
            )
          )}

          {activeView === 'reports' && currentUser.permissions.accessReports && (
            isModuleLocked('accessReports') ? renderLockedScreen() : (
              <ReportsView db={scopedDb} />
            )
          )}

          {activeView === 'users' && currentUser.permissions.accessUserManagement && (
            isModuleLocked('accessUserManagement') ? renderLockedScreen() : (
              <UserManagementView 
                db={db} 
                currentUser={currentUser}
                onSaveUsers={handleSaveUsers} 
                onSaveCompanyInfo={handleSaveCompanyInfo}
                onSaveRegisteredCompanies={handleSaveRegisteredCompanies}
                onAddHistoryLog={handleAddHistoryLog}
                globalModules={globalModules}
                onUpdateGlobalModules={handleUpdateGlobalModules}
              />
            )
          )}

          {activeView === 'profile' && (
            <ProfileView 
              currentUser={currentUser} 
              db={db || scopedDb} 
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
              db={db}
              onSaveClients={handleSaveClients}
              onSaveVehicles={handleSaveVehicles}
              onSaveParts={handleSaveParts}
              onSaveServiceOrders={handleSaveServiceOrders}
              onAddHistoryLog={handleAddHistoryLog}
            />
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
        alertSettings={db.alertSettings || {
          enableBudgetCreatedAlerts: true,
          enableServiceOrderCreatedAlerts: true,
          enableBudgetConvertedAlerts: true,
          enableLowStockAlerts: true,
          enableStockReservedExpirationAlerts: true,
          defaultBudgetValidityDays: 10
        }}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onClearNotifications={handleClearNotifications}
        onSaveAlertSettings={handleSaveAlertSettings}
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
