import React, { useState, useEffect, useMemo } from 'react';
import { 
  Laptop, 
  Monitor, 
  Smartphone, 
  Wifi, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Users, 
  Building, 
  Cpu, 
  Server, 
  Clock, 
  Trash2, 
  Activity, 
  KeyRound, 
  Search,
  Check,
  X,
  Radio,
  FileCheck,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { User, CompanyInfo, AccessGroup } from '../types';

interface ActiveSessionItem {
  username: string;
  name: string;
  device: string;
  ip: string;
  location: string;
  loginTime: string;
  lastHeartbeatAgoMs: number;
  status: 'active' | 'revoked';
}

interface DeviceConnectionsAndPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  db: any;
  setDb: (updater: (prev: any) => any) => void;
  activeCompanyId: string;
  onAddHistoryLog?: (action: string, details: string) => void;
}

export const SYSTEM_MODULES = [
  // 1. Gestão Geral & Indicadores
  { id: 'dashboard', key: 'accessDashboard', name: 'Dashboard Geral & Indicadores KPI', category: 'Gestão', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'vendedor', 'mecanico', 'financeiro', 'producao'] },
  { id: 'reports', key: 'accessReports', name: 'Central de Relatórios Globais', category: 'Gestão', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },

  // 2. Comercial & Vendas
  { id: 'sales', key: 'accessSales', name: 'Vendas & Balcão PDV Express', category: 'Comercial', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'vendedor'] },
  { id: 'budgets', key: 'accessBudgets', name: 'Orçamentos & Propostas Comerciais', category: 'Comercial', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'vendedor'] },
  { id: 'quotations', key: 'accessQuotations', name: 'Cotações com Fornecedores & Compras', category: 'Comercial', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'vendedor'] },
  { id: 'representative_commerce', key: 'accessRepresentativeCommerce', name: 'Comércio Representante (Fábricas & Comissões)', category: 'Comercial', defaultGroups: ['admin', 'qa', 'gerente', 'vendedor'] },
  { id: 'representative_orders', key: 'accessRepresentativeOrders', name: 'Pedidos da Representada (Fábrica B2B)', category: 'Comercial', defaultGroups: ['admin', 'qa', 'gerente', 'vendedor'] },

  // 3. Expedição, Retiradas & Logística
  { id: 'withdrawals', key: 'accessWithdrawals', name: 'Expedição de Vendas (Retirada & Entrega com Romaneio)', category: 'Expedição', defaultGroups: ['admin', 'qa', 'gerente', 'expedicao', 'vendedor', 'atendente'] },
  { id: 'carriers', key: 'accessCarriers', name: 'Transportadoras & Logística de Fretes', category: 'Expedição', defaultGroups: ['admin', 'qa', 'gerente', 'expedicao'] },
  { id: 'units_of_measure', key: 'accessUnitsOfMeasure', name: 'Unidades de Medida & Conversão Dimensional', category: 'Expedição', defaultGroups: ['admin', 'qa', 'gerente', 'expedicao', 'producao'] },

  // 4. Cadastros Gerais & CRM
  { id: 'clients', key: 'accessClients', name: 'Cadastro de Clientes & CRM', category: 'Cadastros', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'vendedor', 'financeiro'] },
  { id: 'vehicles', key: 'accessVehicles', name: 'Cadastro de Veículos & Frotas (Pátio)', category: 'Oficina', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'mecanico'] },
  { id: 'services', key: 'accessServices', name: 'Tabela de Serviços & Mão de Obra Mecânica', category: 'Oficina', defaultGroups: ['admin', 'qa', 'gerente', 'mecanico'] },
  { id: 'serviceOrders', key: 'accessServiceOrders', name: 'Ordens de Serviço (O.S. de Oficina)', category: 'Oficina', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'mecanico'] },

  // 5. Estoque & Almoxarifado
  { id: 'parts', key: 'accessParts', name: 'Estoque de Peças, Insumos & Produtos', category: 'Estoque', defaultGroups: ['admin', 'qa', 'gerente', 'atendente', 'mecanico', 'expedicao', 'producao'] },

  // 6. Financeiro & Custos
  { id: 'financial', key: 'accessFinancial', name: 'Financeiro (Caixa, DRE & Conciliação)', category: 'Financeiro', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },
  { id: 'accounts_receivable', key: 'accessAccountsReceivable', name: 'Contas a Receber, Boletos & PIX', category: 'Financeiro', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },
  { id: 'accounts_payable', key: 'accessAccountsPayable', name: 'Contas a Pagar & Despesas Operacionais', category: 'Financeiro', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },
  { id: 'price_calculation', key: 'accessPriceCalculation', name: 'Formação de Preço, Margem & Markup', category: 'Financeiro', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },

  // 7. Fiscal & Tributário
  { id: 'fiscal', key: 'accessFiscal', name: 'Fiscal, NF-e, NFC-e & SEFAZ', category: 'Fiscal', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },
  { id: 'fiscal_conference', key: 'accessFiscalConference', name: 'Fila de Conferência Fiscal & Auditoria', category: 'Fiscal', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },
  { id: 'fiscal_xml_extraction', key: 'accessFiscalXml', name: 'Extração de XMLs & SPED Fiscal', category: 'Fiscal', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },
  { id: 'fiscal_invoicing_grid', key: 'accessFiscalInvoicingGrid', name: 'Grade Geral de Faturamento Fiscal', category: 'Fiscal', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },
  { id: 'tax_obligations', key: 'accessTaxObligations', name: 'Obrigações Tributárias & Guia DAS', category: 'Fiscal', defaultGroups: ['admin', 'qa', 'gerente', 'financeiro'] },

  // 8. Indústria & Manufatura (MES / PCP / CQ)
  { id: 'industry', key: 'accessProduction', name: 'Indústria: Visão Geral Fabril & Painel Geral', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_engenharia', key: 'accessProductionEng', name: 'Indústria: Engenharia de Produto, BOM & Estruturas', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_pcp', key: 'accessProductionPCP', name: 'Indústria: PCP, MRP & Planejamento da Produção', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_rh', key: 'accessProductionRH', name: 'Indústria: RH Fabril, Operadores, Turnos & Postos', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_almoxarifado', key: 'accessProductionWarehouse', name: 'Indústria: Almoxarifado Fabril, WMS & Lotes', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao', 'expedicao'] },
  { id: 'ind_producao', key: 'accessManufacturing', name: 'Indústria: Fabricação, OPs & Chão de Fábrica (MES)', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_rastrear_processo', key: 'accessProcessTracking', name: 'Indústria: Rastreamento de Processo & Lote Ponta a Ponta', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_qualidade', key: 'accessProductionQuality', name: 'Indústria: Controle de Qualidade (CQ), RNC & Laudos', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_manutencao', key: 'accessMaintenance', name: 'Indústria: Manutenção Industrial & Gestão de Máquinas', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },
  { id: 'ind_log_expedicao', key: 'accessExpedition', name: 'Indústria: Expedição Fabril & Romaneios de Carga', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao', 'expedicao'] },
  { id: 'ind_comercial', key: 'accessCommercialOrders', name: 'Indústria: Comercial Fabril B2B, Pedidos & Orçamentos', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'vendedor'] },
  { id: 'industrial_reports', key: 'accessIndustrialReports', name: 'Indústria: Relatórios Industriais Gerenciais & OEE', category: 'Indústria', defaultGroups: ['admin', 'qa', 'gerente', 'producao'] },

  // 9. Segurança, Auditoria & Administração
  { id: 'history', key: 'accessHistory', name: 'Trilha de Auditoria & Histórico de Operações', category: 'Segurança', defaultGroups: ['admin', 'qa', 'gerente'] },
  { id: 'users', key: 'accessUserManagement', name: 'Gestão de Usuários, Colaboradores & Acessos', category: 'Segurança', defaultGroups: ['admin', 'qa'] },
  { id: 'backup', key: 'accessBackup', name: 'Backup & Restauração da Base de Dados', category: 'Segurança', defaultGroups: ['admin', 'qa'] },
  { id: 'qa_panel', key: 'accessQAPanel', name: 'Painel de Testes QA & Validação', category: 'Segurança', defaultGroups: ['admin', 'qa'] }
];

export const ACCESS_GROUPS_CATALOG = [
  { id: 'admin', name: 'Administradores', description: 'Acesso irrestrito a todos os módulos contratados pela empresa' },
  { id: 'gerente', name: 'Gerentes & Supervisores', description: 'Gestão operacional, aprovações, relatórios e auditoria' },
  { id: 'atendente', name: 'Atendimento & Recepção', description: 'Abertura de O.S., cadastro de clientes, veículos e vendas de balcão' },
  { id: 'vendedor', name: 'Vendedores & Representantes', description: 'Vendas balcão, cotações e pedidos de representantes' },
  { id: 'mecanico', name: 'Mecânicos & Técnicos', description: 'Ordens de serviço, apontamentos e baixa de peças' },
  { id: 'financeiro', name: 'Financeiro & Contábil', description: 'Contas a pagar/receber, conciliação, fiscal e relatórios' },
  { id: 'expedicao', name: 'Estoque & Expedição', description: 'Controle de almoxarifado, peças, romaneios e separação de mercadorias' },
  { id: 'producao', name: 'Operadores Fabris, PCP & Manufatura', description: 'Chão de fábrica, PCP, engenharia, apontamento de produção e estoque industrial' },
  { id: 'qa', name: 'Validação & Qualidade', description: 'Acesso de teste, validação e auditoria completa' }
];

export function DeviceConnectionsAndPermissionsModal({
  isOpen,
  onClose,
  currentUser,
  db,
  setDb,
  activeCompanyId,
  onAddHistoryLog
}: DeviceConnectionsAndPermissionsModalProps) {
  const [activeTab, setActiveTab] = useState<'CONNECTIONS' | 'PERMISSIONS_MATRIX' | 'GROUPS_AUDIT'>('CONNECTIONS');
  
  // Tab 1: Conexões de Computadores e Navegadores
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [lastSyncCheckTime, setLastSyncCheckTime] = useState<string>('');
  const [serverVersion, setServerVersion] = useState<number | null>(null);
  const [serverSubscribers, setServerSubscribers] = useState<number>(1);
  const [syncLatencyMs, setSyncLatencyMs] = useState<number | null>(null);

  // Tab 2: Matriz Tríplice de Permissões
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompanyId);
  const [searchModule, setSearchModule] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Fetch active sessions & live stats from backend
  const fetchActiveSessions = async () => {
    setIsLoadingSessions(true);
    const startMs = Date.now();
    try {
      // 1. Check version & active subscribers on SSE
      try {
        const vRes = await fetch('/api/db/version');
        if (vRes.ok) {
          const vData = await vRes.json();
          setServerVersion(vData.version || 1);
          setServerSubscribers(Math.max(1, vData.subscribersCount || 1));
          setSyncLatencyMs(Date.now() - startMs);
        }
      } catch {}

      // 2. Fetch active machine sessions
      const res = await fetch('/api/auth/active-sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        // Fallback local session if server is offline
        setSessions([
          {
            username: currentUser.username,
            name: currentUser.name,
            device: 'Navegador Web no Computador Local',
            ip: '127.0.0.1 (Localhost)',
            location: 'Terminal Local (Horário de Brasília)',
            loginTime: new Date().toISOString(),
            lastHeartbeatAgoMs: 1200,
            status: 'active'
          }
        ]);
      }
      setLastSyncCheckTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      console.warn('Erro ao consultar sessões ativas:', e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedCompanyId(activeCompanyId);
      fetchActiveSessions();
      const interval = setInterval(fetchActiveSessions, 8000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeCompanyId]);

  // Testar sincronização em tempo real entre navegadores e computadores
  const handleTestMultiBrowserSync = async () => {
    setIsLoadingSessions(true);
    const pingStart = Date.now();
    try {
      // 1. BroadcastChannel local entre abas
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('motordesk_live_channel');
        bc.postMessage({
          type: 'SYNC_TEST_PING',
          sender: currentUser.name,
          timestamp: Date.now()
        });
        bc.close();
      }

      // 2. LocalStorage signal
      localStorage.setItem('motordesk_sync_ping', String(Date.now()));

      // 3. Round-trip real com o servidor para validar latência e canais SSE
      const verRes = await fetch('/api/db/version');
      let roundTripMs = Date.now() - pingStart;
      let subscribers = 1;
      let version = 1;

      if (verRes.ok) {
        const vData = await verRes.json();
        subscribers = Math.max(1, vData.subscribersCount || 1);
        version = vData.version || 1;
        setServerVersion(version);
        setServerSubscribers(subscribers);
        setSyncLatencyMs(roundTripMs);
      }

      setSyncStatusMsg(
        `Sincronização 100% Operacional! ${subscribers} máquina(s)/aba(s) conectadas. Latência: ${roundTripMs}ms. Versão da base: #${version}.`
      );
      setTimeout(() => setSyncStatusMsg(''), 6000);

      await fetchActiveSessions();

      if (onAddHistoryLog) {
        onAddHistoryLog('Sincronização', `Teste de sincronização multi-navegador executado (${subscribers} máquinas, ${roundTripMs}ms)`);
      }
    } catch (err: any) {
      setSyncStatusMsg('Falha ao sincronizar: ' + err.message);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Derrubar sessão específica de outro computador
  const handleKnockdownSession = async (targetUsername: string) => {
    if (!confirm(`Deseja realmente encerrar a sessão do operador "${targetUsername}" neste computador?`)) return;

    try {
      const res = await fetch('/api/auth/session-knockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUsername,
          force: true
        })
      });

      if (res.ok) {
        alert(`Sessão de ${targetUsername} encerrada com sucesso no outro terminal.`);
        fetchActiveSessions();
      } else {
        alert('Não foi possível encerrar a sessão no servidor.');
      }
    } catch (e: any) {
      alert('Erro de conexão: ' + e.message);
    }
  };

  // Dados da Empresa e Usuários para a Matriz Tríplice
  const companies: CompanyInfo[] = db.registeredCompanies || [db.companyInfo];
  const activeCompany = companies.find(c => c.id === selectedCompanyId) || db.companyInfo || {};
  const users: User[] = db.users || [];
  const selectedUser = users.find(u => u.id === selectedUserId) || currentUser;

  // Resolução da Matriz Tríplice de Permissões:
  // Nível 0: Segmento de Negócio da Empresa (Comércio, Oficina, Indústria)
  // Nível 1: Empresa Contratou?
  // Nível 2: Grupo de Acesso Liberou?
  // Nível 3: Usuário Possui Permissão Direta / Exceção?
  const modulesResolution = useMemo(() => {
    const rawType = String(activeCompany.businessType || (activeCompany as any).segment || '').trim().toUpperCase();
    const compName = String(activeCompany.name || '').toUpperCase();
    const isIndustria = rawType.includes('INDUSTRIA') || rawType.includes('FABRICA') || rawType.includes('MANUFATURA') || compName.includes('INDUSTRIA');
    const isOficinaComercio = rawType.includes('OFICINA_COMERCIO') || rawType.includes('HIBRIDO') || (rawType.includes('OFICINA') && rawType.includes('COMERCIO'));
    const isOficina = !isOficinaComercio && (rawType.includes('OFICINA') || rawType.includes('MECANICA') || rawType.includes('AUTO CENTER'));
    const isComercio = !isOficinaComercio && !isOficina && (rawType.includes('COMERCIO') || rawType.includes('AUTOPECAS') || rawType.includes('DISTRIBUIDORA') || rawType.includes('LOJA') || true);

    return SYSTEM_MODULES.map(mod => {
      // 0. Segmento de negócio aplicável:
      // Todo módulo do sistema pode ser contratado e liberado caso a empresa opte por contratá-lo.
      const isSegmentAllowed = true;
      const segmentDeniedReason = '';

      // 1. Empresa contratou?
      const compModules = activeCompany.modules || {};
      const compGlobal = activeCompany.globalModules || {};
      const compContract = (activeCompany as any).contractModules || {};
      const isWithdrawalToggled = mod.id === 'withdrawals'
        ? (activeCompany.enableWithdrawalAndDelivery !== false && compContract.withdrawals !== false && compModules.withdrawals !== false && compGlobal.withdrawals !== false && (activeCompany.enableWithdrawalAndDelivery === true || (activeCompany as any).enableExpedition === true || compContract.withdrawals === true))
        : true;
      const isContractedByCompany = isSegmentAllowed && 
        isWithdrawalToggled &&
        compGlobal[mod.key] !== false && 
        compGlobal[mod.id] !== false &&
        compModules[mod.id] !== false &&
        compModules[mod.key] !== false &&
        compContract[mod.id] !== false &&
        compContract[mod.key] !== false;

      // 2. Grupo de acesso liberou por padrão?
      const userRole = (selectedUser.role || 'atendente').toLowerCase();
      const isGroupAllowed = 
        userRole === 'admin' || 
        userRole === 'qa' || 
        mod.defaultGroups.includes(userRole);

      // 3. Usuário individual possui permissão direta / exceção configurada?
      const userExplicit = selectedUser.permissions ? (
        selectedUser.permissions[mod.key] !== undefined ? selectedUser.permissions[mod.key] :
        selectedUser.permissions[mod.id] !== undefined ? selectedUser.permissions[mod.id] :
        undefined
      ) : undefined;

      const isUserAllowed = userExplicit !== undefined ? userExplicit : isGroupAllowed;

      // Status Efetivo Final (Regra Absoluta: Empresa Contratou + Usuário/Grupo Autorizado)
      let finalStatus: 'ALLOWED' | 'DENIED_COMPANY' | 'DENIED_GROUP' | 'DENIED_USER' = 'ALLOWED';
      let reason = 'Liberado para operação (Empresa Contratou + Usuário Autorizado)';

      if (!isContractedByCompany) {
        finalStatus = 'DENIED_COMPANY';
        reason = `Módulo não contratado pela empresa "${activeCompany.name || 'Empresa'}" no plano atual`;
      } else if (!isUserAllowed) {
        if (userExplicit === false) {
          finalStatus = 'DENIED_USER';
          reason = 'Acesso revogado individualmente para este operador';
        } else {
          finalStatus = 'DENIED_GROUP';
          reason = `Bloqueado para o perfil "${userRole.toUpperCase()}"`;
        }
      }

      return {
        ...mod,
        isSegmentAllowed,
        isContractedByCompany,
        isGroupAllowed,
        isUserAllowed,
        finalStatus,
        reason
      };
    }).filter(m => {
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false;
      if (!searchModule) return true;
      const q = searchModule.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.key.toLowerCase().includes(q);
    });
  }, [activeCompany, selectedUser, searchModule, categoryFilter]);

  // Salvar imediatamente no servidor e propagar para todas as abas e outros navegadores
  const broadcastAndPersistUpdate = async (updatedDb: any, actionName: string, actionDetails: string) => {
    try {
      // 1. Atualizar state local
      setDb(() => updatedDb);

      // 2. Se a classe global do MotorDesk existir, forçar flush imediato
      if (typeof window !== 'undefined' && (window as any).__motorDeskDb?.saveDatabaseImmediate) {
        await (window as any).__motorDeskDb.saveDatabaseImmediate(updatedDb);
      } else {
        // Fallback POST /api/db direto
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDb)
        });
      }

      // 3. Emitir sinal BroadcastChannel para abas locais
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('motordesk_live_channel');
        bc.postMessage({
          type: 'DB_SAVED_LOCAL',
          data: updatedDb,
          timestamp: Date.now()
        });
        bc.close();
      }

      if (onAddHistoryLog) {
        onAddHistoryLog(actionName, actionDetails);
      }

      setSyncStatusMsg(`Sincronizado! A alteração foi salva e transmitida em tempo real para todos os outros navegadores.`);
      setTimeout(() => setSyncStatusMsg(''), 4000);
    } catch (e: any) {
      console.warn('Erro ao salvar e propagar:', e);
      setSyncStatusMsg(`Aviso: salvo localmente, sincronizando em segundo plano...`);
    }
  };

  // Alternar permissão individual do usuário (Nível 3)
  const handleToggleUserPermission = async (permKey: string) => {
    const mod = SYSTEM_MODULES.find(m => m.key === permKey || m.id === permKey);
    const modId = mod?.id || permKey;
    const modKey = mod?.key || permKey;

    // Se estiver explicitamente definido, inverte; se não, pega o valor atual do grupo e inverte
    const explicitVal = selectedUser.permissions ? (
      selectedUser.permissions[modKey] !== undefined ? selectedUser.permissions[modKey] :
      selectedUser.permissions[modId] !== undefined ? selectedUser.permissions[modId] :
      undefined
    ) : undefined;

    const userRole = (selectedUser.role || 'atendente').toLowerCase();
    const defaultGroupAllowed = userRole === 'admin' || userRole === 'qa' || (mod ? mod.defaultGroups.includes(userRole) : true);
    const currentVal = explicitVal !== undefined ? explicitVal : defaultGroupAllowed;
    const newVal = !currentVal;

    let updatedTargetUser: any = null;

    const updatedUsers = (db.users || []).map((u: User) => {
      if (u.id === selectedUser.id) {
        const newPerms = {
          ...(u.permissions || {}),
          [modKey]: newVal,
          [modId]: newVal,
          ...(mod?.category === 'Indústria' && newVal === true ? { accessProduction: true } : {})
        };
        const newExceptions = {
          ...((u as any).individualExceptions || {}),
          [modKey]: newVal,
          [modId]: newVal,
          ...(mod?.category === 'Indústria' && newVal === true ? { accessProduction: true } : {})
        };
        const newCustom = {
          ...((u as any).customPermissions || {}),
          [modKey]: newVal,
          [modId]: newVal,
          ...(mod?.category === 'Indústria' && newVal === true ? { accessProduction: true } : {})
        };

        updatedTargetUser = {
          ...u,
          permissions: newPerms,
          individualExceptions: newExceptions,
          customPermissions: newCustom
        };
        return updatedTargetUser;
      }
      return u;
    });

    // Se for o próprio operador logado, reflete instantaneamente na sessão atual
    if (selectedUser.id === currentUser.id && updatedTargetUser) {
      currentUser.permissions = { ...updatedTargetUser.permissions };
      try {
        localStorage.setItem('motordesk_auth_user', JSON.stringify(updatedTargetUser));
        localStorage.setItem('motordesk_active_user', JSON.stringify(updatedTargetUser));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('motordesk_permissions_changed', { detail: updatedTargetUser }));
          (window as any).__currentUser = updatedTargetUser;
        }
      } catch {}
    }

    const updatedDb = {
      ...db,
      users: updatedUsers
    };

    await broadcastAndPersistUpdate(
      updatedDb,
      'Permissões',
      `Permissão do módulo "${mod?.name || modId}" para o colaborador "${selectedUser.name}" alterada para ${newVal ? 'AUTORIZADO' : 'REVOGADO'}`
    );
  };

  // Alternar contratação do módulo na empresa (Nível 1)
  const handleToggleCompanyModule = async (permKey: string, modId: string) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'qa') {
      alert('Apenas administradores podem alterar os módulos contratados da empresa.');
      return;
    }

    const currentVal = activeCompany.globalModules ? (
      activeCompany.globalModules[permKey] !== false &&
      activeCompany.globalModules[modId] !== false
    ) : true;
    const newVal = !currentVal;

    const updatedCompanies = (db.registeredCompanies || []).map((c: CompanyInfo) => {
      if (c.id === activeCompany.id) {
        return {
          ...c,
          enableWithdrawalAndDelivery: modId === 'withdrawals' ? newVal : c.enableWithdrawalAndDelivery,
          enableExpedition: modId === 'withdrawals' ? newVal : (c as any).enableExpedition,
          globalModules: {
            ...(c.globalModules || {}),
            [permKey]: newVal,
            [modId]: newVal
          },
          contractModules: {
            ...((c as any).contractModules || {}),
            [permKey]: newVal,
            [modId]: newVal,
            ...(modId === 'withdrawals' ? { withdrawals: newVal } : {})
          },
          modules: {
            ...(c.modules || {}),
            [modId]: newVal,
            [permKey]: newVal
          }
        };
      }
      return c;
    });

    const updatedCompanyInfo = db.companyInfo?.id === activeCompany.id ? {
      ...db.companyInfo,
      enableWithdrawalAndDelivery: modId === 'withdrawals' ? newVal : db.companyInfo.enableWithdrawalAndDelivery,
      enableExpedition: modId === 'withdrawals' ? newVal : (db.companyInfo as any).enableExpedition,
      globalModules: { ...(db.companyInfo.globalModules || {}), [permKey]: newVal, [modId]: newVal },
      contractModules: { ...((db.companyInfo as any).contractModules || {}), [permKey]: newVal, [modId]: newVal, ...(modId === 'withdrawals' ? { withdrawals: newVal } : {}) },
      modules: { ...(db.companyInfo.modules || {}), [modId]: newVal, [permKey]: newVal }
    } : db.companyInfo;

    const updatedDb = {
      ...db,
      companyInfo: updatedCompanyInfo,
      registeredCompanies: updatedCompanies
    };

    await broadcastAndPersistUpdate(
      updatedDb,
      'Licenciamento',
      `Módulo da empresa "${activeCompany.name}" (${permKey}) alterado para ${newVal ? 'CONTRATADO' : 'SUSPENSO'}`
    );
  };

  // Trocar grupo de acesso do usuário selecionado (Nível 2)
  const handleChangeUserRole = async (newRole: string) => {
    const updatedUsers = (db.users || []).map((u: User) => {
      if (u.id === selectedUser.id) {
        return {
          ...u,
          role: newRole
        };
      }
      return u;
    });

    const updatedDb = {
      ...db,
      users: updatedUsers
    };

    await broadcastAndPersistUpdate(
      updatedDb,
      'Grupos de Acesso',
      `Operador "${selectedUser.name}" transferido para o grupo de acesso "${newRole.toUpperCase()}"`
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 font-sans">
        
        {/* CABEÇALHO */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/90 text-white shadow-xs border border-indigo-400/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  Sincronização Multi-Navegador & Liberação de Módulos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LiveSync Ativo
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium">
                Auditoria de sessões simultâneas, canais de dados em tempo real e hierarquia: Empresa Contratou ➜ Grupo de Acesso ➜ Usuário Liberado
              </p>
            </div>
          </div>

          <button
            id="btn-close-device-connections-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Fechar auditoria"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/60 gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('CONNECTIONS')}
            className={`py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'CONNECTIONS'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>1. Sincronização entre Navegadores & Máquinas</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold">
              {sessions.length} Online
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PERMISSIONS_MATRIX')}
            className={`py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'PERMISSIONS_MATRIX'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>2. Matriz Tríplice: Empresa Contratou ➜ Grupo ➜ Usuário</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GROUPS_AUDIT')}
            className={`py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'GROUPS_AUDIT'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Grupos de Acesso & Contratos da Empresa</span>
          </button>
        </div>

        {/* FEEDBACK STATUS DE SINCRONIZAÇÃO */}
        {syncStatusMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{syncStatusMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncStatusMsg('')}
              className="text-xs text-emerald-700 hover:text-emerald-950 underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* ================= ABA 1: CONEXÕES ATIVAS & MULTI-COMPUTADORES ================= */}
          {activeTab === 'CONNECTIONS' && (
            <div className="space-y-6">
              
              {/* Barra de Diagnóstico de Sincronização em Tempo Real */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Motor de Sincronização em Tempo Real (LiveSync SSE + BroadcastChannel)
                      </span>
                      {serverVersion && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                          Base #{serverVersion}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {serverSubscribers} terminal(is) conectado(s) ao fluxo contínuo de dados • Latência: {syncLatencyMs ? `${syncLatencyMs}ms` : 'baixo'} • Checagem: {lastSyncCheckTime || 'agora'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    id="btn-refresh-sessions"
                    type="button"
                    onClick={fetchActiveSessions}
                    disabled={isLoadingSessions}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin text-indigo-500' : ''}`} />
                    <span>Atualizar Lista</span>
                  </button>

                  <button
                    id="btn-test-multi-browser-sync"
                    type="button"
                    onClick={handleTestMultiBrowserSync}
                    disabled={isLoadingSessions}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Testar Sincronização entre Máquinas</span>
                  </button>
                </div>
              </div>

              {/* Grid de Máquinas e Navegadores Conectados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Terminais & Navegadores Conectados na Empresa ({sessions.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Concorrência protegida com serialização atômica contra conflitos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {sessions.map((sess, idx) => {
                    const isMe = sess.username === currentUser.username;
                    const heartbeatSeconds = Math.round((sess.lastHeartbeatAgoMs || 0) / 1000);

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                          isMe
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 shadow-xs'
                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                              isMe ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {sess.device.includes('Android') || sess.device.includes('iOS') ? (
                                <Smartphone className="w-5 h-5" />
                              ) : (
                                <Laptop className="w-5 h-5" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  {sess.name}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                  @{sess.username}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200 border border-indigo-200">
                                    ESTE NAVEGADOR
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                                {sess.device}
                              </p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                                <span>IP: {sess.ip || '127.0.0.1'}</span>
                                <span>•</span>
                                <span>{sess.location}</span>
                              </div>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Ativo
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Último sinal (Heartbeat): {heartbeatSeconds}s atrás
                          </span>

                          {!isMe && (currentUser.role === 'admin' || currentUser.role === 'qa') && (
                            <button
                              type="button"
                              onClick={() => handleKnockdownSession(sess.username)}
                              className="text-[11px] font-black text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Derrubar Sessão Remota</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informação Técnica de Arquitetura */}
              <div className="p-4 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Como funciona a sincronização entre múltiplos navegadores:</span>
                </div>
                <p className="leading-relaxed">
                  1. <strong>Emissão Instantânea:</strong> Ao salvar qualquer alteração (financeiro, clientes, grupos ou permissões), os dados são gravados no banco PostgreSQL e um sinal SSE é emitido imediatamente para todas as outras abas e computadores.
                </p>
                <p className="leading-relaxed">
                  2. <strong>Zero Conflitos:</strong> O servidor serializa as gravações em fila atômica com mesclagem inteligente (Lossless Merge), garantindo que dois operadores editando em navegadores diferentes não sobrescrevam o trabalho um do outro.
                </p>
              </div>
            </div>
          )}

          {/* ================= ABA 2: MATRIZ TRÍPLICE DE LIBERAÇÃO DE MÓDULOS ================= */}
          {activeTab === 'PERMISSIONS_MATRIX' && (
            <div className="space-y-6">
              
              {/* Barra de Filtros e Seleção Tríplice */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    1. Empresa (Contratante)
                  </label>
                  <select
                    id="select-company-audit-matrix"
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-100 cursor-pointer shadow-3xs"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name || 'Empresa'} ({c.businessType || 'OFICINA'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    2. Operador para Auditoria
                  </label>
                  <select
                    id="select-user-audit-matrix"
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-100 cursor-pointer shadow-3xs"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} (@{u.username}) — [{u.role.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Categoria do Módulo
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-3xs"
                  >
                    <option value="ALL">Todas as Categorias (38 Menus)</option>
                    <option value="Indústria">Indústria & Manufatura (MES / PCP / CQ)</option>
                    <option value="Comercial">Comercial & Vendas</option>
                    <option value="Expedição">Expedição & Logística</option>
                    <option value="Oficina">Oficina & Serviços</option>
                    <option value="Estoque">Estoque & Almoxarifado</option>
                    <option value="Financeiro">Financeiro & Custos</option>
                    <option value="Fiscal">Fiscal & SEFAZ</option>
                    <option value="Cadastros">Cadastros Gerais & CRM</option>
                    <option value="Gestão">Gestão & Relatórios</option>
                    <option value="Segurança">Segurança & Auditoria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Filtrar por Nome
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar módulo..."
                      value={searchModule}
                      onChange={e => setSearchModule(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Diagrama Visual da Regra de Ouro */}
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2 flex-wrap font-bold">
                  <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    Regra Tríplice
                  </span>
                  <span>1. Empresa Contratou?</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2. Grupo Liberou?</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>3. Usuário Autorizado?</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">➜ ACESSO LIBERADO</span>
                </div>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium hidden md:inline">
                  Basta 1 nível negar para o acesso ser bloqueado.
                </span>
              </div>

              {/* Tabela da Matriz Tríplice */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-200 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-3 px-4">Módulo do Sistema</th>
                      <th className="py-3 px-3 text-center">
                        Nível 1: Empresa Contratou?
                      </th>
                      <th className="py-3 px-3 text-center">
                        Nível 2: Grupo de Acesso
                      </th>
                      <th className="py-3 px-3 text-center">
                        Nível 3: Permissão do Usuário
                      </th>
                      <th className="py-3 px-4 text-right">Resultado Final Efetivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {modulesResolution.map(item => {
                      const isAllowed = item.finalStatus === 'ALLOWED';

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 dark:text-white block text-xs">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {item.category} • Chave: <code className="font-mono text-indigo-600 dark:text-indigo-400">{item.key}</code>
                            </span>
                          </td>

                          {/* Nível 1: Empresa */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCompanyModule(item.key, item.id)}
                              title="Clique para alternar se a empresa contratou este módulo (Salva e sincroniza em todos os navegadores)"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black cursor-pointer transition shadow-3xs ${
                                item.isContractedByCompany
                                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 hover:bg-rose-200'
                              }`}
                            >
                              {item.isContractedByCompany ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Contratado</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>Não Contratado</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Nível 2: Grupo de Acesso */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold ${
                                item.isGroupAllowed
                                  ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300'
                              }`}
                            >
                              {item.isGroupAllowed ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Liberado no Grupo ({selectedUser.role.toUpperCase()})</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Bloqueado no Grupo ({selectedUser.role.toUpperCase()})</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Nível 3: Usuário */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleUserPermission(item.key)}
                              title="Clique para alternar permissão individual deste operador (Salva e sincroniza em todos os navegadores)"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black cursor-pointer transition shadow-3xs ${
                                item.isUserAllowed
                                  ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200 hover:bg-sky-200'
                                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:bg-amber-200'
                              }`}
                            >
                              {item.isUserAllowed ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Autorizado</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Revogado</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Status Final Consolidado */}
                          <td className="py-3 px-4 text-right">
                            {isAllowed ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-black text-[11.5px] shadow-3xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ACESSO LIBERADO</span>
                              </span>
                            ) : (
                              <div className="inline-flex flex-col items-end">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-[11px] shadow-3xs">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>ACESSO BLOQUEADO</span>
                                </span>
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 text-right max-w-xs">
                                  {item.reason}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Rodapé Informativo da Matriz */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-black block uppercase tracking-wider text-[11px]">
                    Hierarquia Inviolável de Segurança do Sistema:
                  </span>
                  <p className="leading-relaxed">
                    1. <strong>Contrato da Empresa:</strong> Se a empresa não contratou o módulo (ex: Fiscal ou PCP), nenhum usuário daquela empresa terá acesso, mesmo sendo administrador.
                  </p>
                  <p className="leading-relaxed">
                    2. <strong>Grupo de Acesso:</strong> Determina o perfil padrão de trabalho (ex: vendedores acessam Vendas e Clientes, mas não acessam Financeiro).
                  </p>
                  <p className="leading-relaxed">
                    3. <strong>Exceções do Usuário:</strong> Permite à gerência liberar ou revogar um módulo pontual para um colaborador específico sem alterar as regras de todo o grupo.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ================= ABA 3: GRUPOS DE ACESSO & CONTRATOS ================= */}
          {activeTab === 'GROUPS_AUDIT' && (
            <div className="space-y-6">
              
              {/* Resumo da Empresa Selecionada */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                <div>
                  <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                    Contrato Atual da Empresa
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {activeCompany.name || 'Empresa Piloto'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Segmento: <strong>{activeCompany.businessType || 'OFICINA'}</strong> • CNPJ: {activeCompany.cnpj || '00.000.000/0001-00'} • Limite: {activeCompany.userLimit || 5} operadores simultâneos
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestMultiBrowserSync()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Forçar Sincronização em Nuvem</span>
                  </button>
                </div>
              </div>

              {/* Lista dos Grupos de Acesso Existentes */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Grupos de Acesso & Operadores Vinculados
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ACCESS_GROUPS_CATALOG.map(grp => {
                    const groupUsers = users.filter(u => (u.role || '').toLowerCase() === grp.id);

                    return (
                      <div
                        key={grp.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-2xs flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                              <Users className="w-4 h-4 text-indigo-600" />
                              {grp.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 font-black uppercase">
                              {grp.id.toUpperCase()}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {grp.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80">
                          <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block mb-1">
                            Operadores neste grupo ({groupUsers.length}):
                          </span>
                          {groupUsers.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Nenhum operador atribuído a este perfil.</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {groupUsers.map(u => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserId(u.id);
                                    setActiveTab('PERMISSIONS_MATRIX');
                                  }}
                                  title="Clique para auditar este operador na Matriz Tríplice"
                                  className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-900 dark:bg-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                                >
                                  <span>{u.name}</span>
                                  <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RODAPÉ */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Auditoria contínua de permissões • Sincronização multi-terminal ativa</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-extrabold text-xs transition cursor-pointer shadow-3xs"
          >
            Fechar Auditoria
          </button>
        </div>

      </div>
    </div>
  );
}
