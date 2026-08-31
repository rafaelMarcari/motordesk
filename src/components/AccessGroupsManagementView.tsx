/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK — GESTÃO DE GRUPOS DE ACESSO & EXCEÇÕES INDIVIDUAIS (RBAC 2.0)
 * 
 * - Gestão de Grupos de Acesso (Perfis Funcionais)
 * - Matriz Granular de Permissões por Grupo
 * - Exceções Individuais por Usuário (Sobrescrita Positiva / Negativa)
 * - Visualização em Tempo Real das Permissões Efetivas Resolvidas
 * - Trilha de Auditoria com Registro de Justificativa e Histórico
 */

import React, { useState, useMemo } from 'react';
import { 
  AccessGroup, 
  User, 
  UserPermissions, 
  AppDatabase, 
  HistoryEntry, 
  CompanyInfo 
} from '../types';
import { 
  Shield, 
  Users, 
  KeyRound, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Lock, 
  Unlock, 
  Search, 
  History, 
  Sparkles, 
  Check, 
  X, 
  HelpCircle, 
  Sliders, 
  UserCheck, 
  RefreshCw,
  Building,
  FileText
} from 'lucide-react';
import { 
  getEffectivePermissions, 
  createSecurityAuditLog, 
  ALL_PERMISSION_KEYS 
} from '../utils/securityUtils';

interface AccessGroupsManagementViewProps {
  db: AppDatabase;
  currentUser?: User;
  currentCompany?: CompanyInfo;
  onSaveDatabase: (updatedDb: AppDatabase) => void;
}

export const AccessGroupsManagementView: React.FC<AccessGroupsManagementViewProps> = ({
  db,
  currentUser,
  currentCompany,
  onSaveDatabase
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'user_exceptions' | 'audit_logs'>('groups');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modais de Grupos
  const [isEditingGroupModalOpen, setIsEditingGroupModalOpen] = useState<boolean>(false);
  const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<AccessGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState<{
    name: string;
    code: string;
    description: string;
    color: string;
    active: boolean;
    permissions: Partial<UserPermissions>;
  }>({
    name: '',
    code: '',
    description: '',
    color: 'blue',
    active: true,
    permissions: {}
  });

  // Exceções por Usuário
  const [selectedUserForExceptions, setSelectedUserForExceptions] = useState<User | null>(
    db.users?.[0] || null
  );
  const [userAssignedGroupId, setUserAssignedGroupId] = useState<string>(
    db.users?.[0]?.accessGroupId || ''
  );
  const [userExceptionsDraft, setUserExceptionsDraft] = useState<Record<string, boolean | undefined>>({});
  const [exceptionJustification, setExceptionJustification] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Lista de Grupos
  const accessGroups = useMemo(() => {
    return db.accessGroups || [];
  }, [db.accessGroups]);

  // Lista de Usuários do Tenant
  const usersList = useMemo(() => {
    return db.users || [];
  }, [db.users]);

  // Permissões Efetivas do Usuário Selecionado
  const effectivePermissionsForSelectedUser = useMemo(() => {
    if (!selectedUserForExceptions) return null;
    
    // Constrói um usuário virtual com o draft atual para visualização em tempo real
    const previewUser: User = {
      ...selectedUserForExceptions,
      accessGroupId: userAssignedGroupId || undefined,
      customPermissions: Object.entries(userExceptionsDraft).reduce((acc, [k, v]) => {
        if (v !== undefined) acc[k as keyof UserPermissions] = v;
        return acc;
      }, {} as Partial<UserPermissions>)
    };

    return getEffectivePermissions(previewUser, currentCompany?.id || 'comp-1', db);
  }, [selectedUserForExceptions, userAssignedGroupId, userExceptionsDraft, currentCompany, db]);

  // Categorização das Permissões para Apresentação Amigável
  const permissionCategories: Array<{
    category: string;
    title: string;
    icon: React.ReactNode;
    keys: Array<{ key: keyof UserPermissions; label: string; description: string }>;
  }> = [
    {
      category: 'DASHBOARD',
      title: 'Painel & Indicadores',
      icon: <Sparkles className="w-4 h-4 text-blue-500" />,
      keys: [
        { key: 'accessDashboard', label: 'Acessar Dashboard', description: 'Visualizar KPIs, faturamento e resumo geral' },
        { key: 'exportDashboard', label: 'Exportar Dashboard', description: 'Gerar relatórios e planilhas dos indicadores' }
      ]
    },
    {
      category: 'SALES_BUDGETS',
      title: 'Vendas & Orçamentos',
      icon: <Sliders className="w-4 h-4 text-emerald-500" />,
      keys: [
        { key: 'accessSales', label: 'Acessar PDV / Vendas', description: 'Abrir tela de Vendas Balcão Express' },
        { key: 'salesCreate', label: 'Criar Vendas', description: 'Concluir vendas no caixa' },
        { key: 'salesCancel', label: 'Cancelar Vendas', description: 'Estornar vendas faturadas' },
        { key: 'accessBudgets', label: 'Acessar Orçamentos', description: 'Criar e consultar orçamentos técnicos' },
        { key: 'budgetsCreate', label: 'Criar Orçamentos', description: 'Elaborar novas propostas comerciais' },
        { key: 'budgetsApprove', label: 'Aprovar Orçamentos', description: 'Converter orçamento em Ordem de Serviço' },
        { key: 'budgetsApplyDiscount', label: 'Aplicar Descontos', description: 'Conceder descontos em orçamentos (> 15% exige autorização)' }
      ]
    },
    {
      category: 'OPERATIONS',
      title: 'Ordens de Serviço & Pátio',
      icon: <Users className="w-4 h-4 text-amber-500" />,
      keys: [
        { key: 'accessServiceOrders', label: 'Acessar Ordens de Serviço', description: 'Visualizar pátio de manutenção' },
        { key: 'serviceOrdersCreate', label: 'Criar Ordens de Serviço', description: 'Abrir novas ordens no pátio' },
        { key: 'serviceOrdersEdit', label: 'Editar Ordens de Serviço', description: 'Adicionar serviços e peças à OS' },
        { key: 'serviceOrdersComplete', label: 'Concluir Ordens de Serviço', description: 'Finalizar execução mecânica e faturar' },
        { key: 'serviceOrdersCancel', label: 'Cancelar Ordens de Serviço', description: 'Estornar ou cancelar OS' },
        { key: 'accessClients', label: 'Gestão de Clientes', description: 'Consultar base de clientes PF e PJ' },
        { key: 'accessVehicles', label: 'Gestão de Veículos', description: 'Consultar histórico veicular e frotas' },
        { key: 'accessServices', label: 'Catálogo de Serviços', description: 'Consultar tabela de mão de obra' }
      ]
    },
    {
      category: 'STOCK_SUPPLIERS',
      title: 'Peças, Estoque & Compras',
      icon: <Shield className="w-4 h-4 text-indigo-500" />,
      keys: [
        { key: 'accessParts', label: 'Acessar Peças & Estoque', description: 'Consultar inventário e localização' },
        { key: 'partsCreate', label: 'Cadastrar Peças', description: 'Inserir novos produtos no catálogo' },
        { key: 'partsEdit', label: 'Editar Peças', description: 'Alterar preços de venda e custo' },
        { key: 'partsDelete', label: 'Excluir Peças', description: 'Remover itens do inventário' },
        { key: 'partsImportXml', label: 'Importar XML de NF-e', description: 'Entrada automática de notas de fornecedor' },
        { key: 'accessUnitsOfMeasure', label: 'Unidades de Medida', description: 'Configurar cálculo linear, m² e m³' },
        { key: 'accessQuotations', label: 'Cotações com Fornecedores', description: 'Tomada de preços e compras' }
      ]
    },
    {
      category: 'FISCAL_SEFAZ',
      title: 'Módulo Fiscal & SEFAZ',
      icon: <FileText className="w-4 h-4 text-purple-500" />,
      keys: [
        { key: 'accessFiscal', label: 'Acessar Módulo Fiscal', description: 'Consultar notas e conferência tributária' },
        { key: 'fiscalEmit', label: 'Emitir NF-e / NFC-e / NFS-e', description: 'Transmitir documentos para a SEFAZ' },
        { key: 'fiscalCancel', label: 'Cancelar Documentos Fiscais', description: 'Realizar cancelamento formal SEFAZ' },
        { key: 'fiscalInutilize', label: 'Inutilizar Numeração Fiscal', description: 'Homologar quebra de numeração' }
      ]
    },
    {
      category: 'FINANCIAL',
      title: 'Financeiro & Caixa',
      icon: <KeyRound className="w-4 h-4 text-rose-500" />,
      keys: [
        { key: 'accessAccountsReceivable', label: 'Contas a Receber', description: 'Cobranças, parcelas e baixas' },
        { key: 'accessAccountsPayable', label: 'Contas a Pagar', description: 'Controle de despesas e fornecedores' },
        { key: 'accessFinancial', label: 'Fluxo de Caixa & DRE', description: 'Extratos, conciliação e resultado líquido' },
        { key: 'financialExport', label: 'Exportar Relatórios Financeiros', description: 'Baixar relatórios e DRE' }
      ]
    },
    {
      category: 'ADMIN_SYSTEM',
      title: 'Administração & Auditoria',
      icon: <Lock className="w-4 h-4 text-slate-500" />,
      keys: [
        { key: 'accessUserManagement', label: 'Gestão de Usuários & RBAC', description: 'Criar contas e definir permissões' },
        { key: 'accessReports', label: 'Relatórios Gerenciais', description: 'Curva ABC e relatórios consolidados' },
        { key: 'accessHistory', label: 'Trilha de Auditoria', description: 'Consultar logs imutáveis de operações' },
        { key: 'accessQAPanel', label: 'Console QA & Terminal SQL', description: 'Ferramentas de diagnóstico e PRD' }
      ]
    }
  ];

  // Abertura de Modal para Criar Grupo
  const handleOpenCreateGroup = () => {
    setSelectedGroupToEdit(null);
    setGroupFormData({
      name: '',
      code: '',
      description: '',
      color: 'blue',
      active: true,
      permissions: {}
    });
    setIsEditingGroupModalOpen(true);
  };

  // Abertura de Modal para Editar Grupo
  const handleOpenEditGroup = (group: AccessGroup) => {
    setSelectedGroupToEdit(group);
    setGroupFormData({
      name: group.name,
      code: group.code,
      description: group.description,
      color: group.color || 'blue',
      active: group.active,
      permissions: { ...group.permissions }
    });
    setIsEditingGroupModalOpen(true);
  };

  // Salvar Grupo de Acesso
  const handleSaveGroup = () => {
    if (!groupFormData.name.trim()) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let updatedGroups: AccessGroup[];
    let auditLog: HistoryEntry;

    if (selectedGroupToEdit) {
      // Atualização
      updatedGroups = accessGroups.map(g => {
        if (g.id === selectedGroupToEdit.id) {
          return {
            ...g,
            name: groupFormData.name,
            code: groupFormData.code || groupFormData.name.toUpperCase().replace(/\s+/g, '_'),
            description: groupFormData.description,
            color: groupFormData.color,
            active: groupFormData.active,
            permissions: (groupFormData.permissions || {}) as UserPermissions,
            updatedAt: now
          };
        }
        return g;
      });

      auditLog = createSecurityAuditLog({
        userId: currentUser?.id || 'usr-admin',
        userName: currentUser?.name || 'Administrador',
        companyId: currentCompany?.id || 'comp-1',
        action: 'GROUP_UPDATED',
        title: `Grupo de Acesso Atualizado: ${groupFormData.name}`,
        description: `Perfil ${groupFormData.name} modificado com novas diretrizes de permissões.`,
        targetRecordId: selectedGroupToEdit.id,
        previousValue: selectedGroupToEdit.permissions,
        newValue: groupFormData.permissions
      });
    } else {
      // Criação
      const newGroup: AccessGroup = {
        id: `grp-${Date.now()}`,
        companyId: currentCompany?.id || 'comp-1',
        name: groupFormData.name,
        code: groupFormData.code || groupFormData.name.toUpperCase().replace(/\s+/g, '_'),
        description: groupFormData.description,
        color: groupFormData.color,
        isSystemDefault: false,
        active: groupFormData.active,
        permissions: (groupFormData.permissions || {}) as UserPermissions,
        createdAt: now,
        updatedAt: now
      };

      updatedGroups = [...accessGroups, newGroup];

      auditLog = createSecurityAuditLog({
        userId: currentUser?.id || 'usr-admin',
        userName: currentUser?.name || 'Administrador',
        companyId: currentCompany?.id || 'comp-1',
        action: 'GROUP_CREATED',
        title: `Novo Grupo de Acesso Criado: ${groupFormData.name}`,
        description: `Grupo ${groupFormData.name} cadastrado no sistema com permissões configuradas.`,
        targetRecordId: newGroup.id,
        newValue: newGroup
      });
    }

    onSaveDatabase({
      ...db,
      accessGroups: updatedGroups,
      history: [auditLog, ...(db.history || [])]
    });

    setIsEditingGroupModalOpen(false);
    showFeedbackToast(`Grupo "${groupFormData.name}" salvo com sucesso!`);
  };

  // Excluir Grupo de Acesso
  const handleDeleteGroup = (groupId: string) => {
    const group = accessGroups.find(g => g.id === groupId);
    if (!group) return;

    if (group.isSystemDefault) {
      alert('Grupos padrão do sistema não podem ser excluídos.');
      return;
    }

    const updatedGroups = accessGroups.filter(g => g.id !== groupId);
    const auditLog = createSecurityAuditLog({
      userId: currentUser?.id || 'usr-admin',
      userName: currentUser?.name || 'Administrador',
      companyId: currentCompany?.id || 'comp-1',
      action: 'GROUP_DELETED',
      title: `Grupo de Acesso Removido: ${group.name}`,
      description: `Grupo ${group.name} excluído. Usuários vinculados retornam às permissões do papel básico.`,
      targetRecordId: groupId,
      previousValue: group
    });

    onSaveDatabase({
      ...db,
      accessGroups: updatedGroups,
      history: [auditLog, ...(db.history || [])]
    });

    showFeedbackToast(`Grupo "${group.name}" excluído.`);
  };

  // Selecionar Usuário para Exceções
  const handleSelectUserForExceptions = (user: User) => {
    setSelectedUserForExceptions(user);
    setUserAssignedGroupId(user.accessGroupId || '');
    setUserExceptionsDraft({ ...(user.customPermissions || {}) });
    setExceptionJustification('');
  };

  // Alterar Exceção Individual
  const handleToggleUserException = (key: keyof UserPermissions, mode: 'allow' | 'deny' | 'inherit') => {
    const updated = { ...userExceptionsDraft };
    if (mode === 'inherit') {
      delete updated[key];
    } else if (mode === 'allow') {
      updated[key] = true;
    } else if (mode === 'deny') {
      updated[key] = false;
    }
    setUserExceptionsDraft(updated);
  };

  // Salvar Exceções do Usuário
  const handleSaveUserExceptions = () => {
    if (!selectedUserForExceptions) return;

    const previousPermissions = selectedUserForExceptions.customPermissions || {};
    const updatedUsers = usersList.map(u => {
      if (u.id === selectedUserForExceptions.id) {
        return {
          ...u,
          accessGroupId: userAssignedGroupId || undefined,
          customPermissions: Object.keys(userExceptionsDraft).length > 0 ? (userExceptionsDraft as any) : undefined
        };
      }
      return u;
    });

    const auditLog = createSecurityAuditLog({
      userId: currentUser?.id || 'usr-admin',
      userName: currentUser?.name || 'Administrador',
      companyId: currentCompany?.id || 'comp-1',
      action: 'USER_PERMISSIONS_OVERRIDDEN',
      title: `Exceções de Permissões Atualizadas: ${selectedUserForExceptions.name}`,
      description: `Permissões individuais atualizadas para ${selectedUserForExceptions.name}. Grupo: ${userAssignedGroupId || 'Nenhum'}. Justificativa: "${exceptionJustification || 'Ajuste de perfil operacional'}".`,
      targetRecordId: selectedUserForExceptions.id,
      previousValue: {
        accessGroupId: selectedUserForExceptions.accessGroupId,
        customPermissions: previousPermissions
      },
      newValue: {
        accessGroupId: userAssignedGroupId,
        customPermissions: userExceptionsDraft
      },
      justification: exceptionJustification
    });

    onSaveDatabase({
      ...db,
      users: updatedUsers,
      history: [auditLog, ...(db.history || [])]
    });

    showFeedbackToast(`Permissões de ${selectedUserForExceptions.name} salvas com sucesso!`);
  };

  const showFeedbackToast = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Trilha de Auditoria RBAC
  const rbacAuditLogs = useMemo(() => {
    const history = db.history || [];
    return history.filter(h => 
      h.action?.startsWith('GROUP_') || 
      h.action?.startsWith('USER_PERMISSIONS_') || 
      h.action?.startsWith('GUIDE_') ||
      h.action?.includes('RBAC') ||
      h.action?.includes('PERMISSION')
    );
  }, [db.history]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Shield className="w-4 h-4" /> Segurança & Controle de Acesso (RBAC 2.0)
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            Grupos de Acesso & Exceções por Usuário
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Estrutura hierárquica de permissões: Status da Conta → Papel Padrão → Grupo de Acesso → Exceções Individuais com Auditoria Imutável.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'groups' && (
            <button
              onClick={handleOpenCreateGroup}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Grupo de Acesso
            </button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {saveFeedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{saveFeedback}</span>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'groups'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Grupos de Acesso ({accessGroups.length})
        </button>

        <button
          onClick={() => setActiveTab('user_exceptions')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'user_exceptions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" /> Exceções Individuais por Usuário
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'audit_logs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" /> Auditoria de Permissões ({rbacAuditLogs.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: GRUPOS DE ACESSO                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accessGroups.map(group => {
              const membersCount = usersList.filter(u => u.accessGroupId === group.id).length;
              const permissionsCount = Object.values(group.permissions || {}).filter(Boolean).length;

              return (
                <div
                  key={group.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-indigo-500" />
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {group.name}
                        </h3>
                      </div>
                      {group.isSystemDefault ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Padrão Sistema
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          Customizado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">
                      {group.description || 'Sem descrição informada.'}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> {membersCount} usuário(s)
                      </span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {permissionsCount} permissões ativas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenEditGroup(group)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Configurar Permissões
                    </button>
                    {!group.isSystemDefault && (
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        title="Excluir Grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: EXCEÇÕES INDIVIDUAIS POR USUÁRIO                                   */}
      {/* ========================================================================= */}
      {activeTab === 'user_exceptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Seletor de Usuários */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" /> Selecionar Usuário
            </h3>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {usersList.map(user => {
                const isSelected = selectedUserForExceptions?.id === user.id;
                const assignedGroup = accessGroups.find(g => g.id === user.accessGroupId);
                const hasExceptions = user.customPermissions && Object.keys(user.customPermissions).length > 0;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUserForExceptions(user)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        {user.name}
                        {hasExceptions && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" title="Possui exceções individuais" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{user.email || user.role}</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        Grupo: {assignedGroup?.name || 'Nenhum (Papel Básico)'}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                      {user.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Matriz de Permissões & Exceções */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {selectedUserForExceptions ? (
              <>
                {/* Header do Usuário */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Permissões de {selectedUserForExceptions.name}
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {selectedUserForExceptions.email}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure o Grupo de Acesso principal e sobrescreva permissões pontuais se necessário.
                    </p>
                  </div>

                  {/* Seletor de Grupo de Acesso */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Grupo:</span>
                    <select
                      value={userAssignedGroupId}
                      onChange={(e) => setUserAssignedGroupId(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      <option value="">Nenhum Grupo (Usar Padrão do Papel)</option>
                      {accessGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Justificativa para Auditoria */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Justificativa da Alteração (Obrigatório para Auditoria)
                  </label>
                  <input
                    type="text"
                    value={exceptionJustification}
                    onChange={(e) => setExceptionJustification(e.target.value)}
                    placeholder="Ex: Concessão temporária de acesso ao Módulo Fiscal para cobrir férias..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Matriz de Permissões com Controles Tri-state */}
                <div className="space-y-6">
                  {permissionCategories.map(cat => (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        {cat.icon} {cat.title}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cat.keys.map(item => {
                          const overrideVal = userExceptionsDraft[item.key];
                          const effectiveVal = effectivePermissionsForSelectedUser ? effectivePermissionsForSelectedUser[item.key] : false;

                          return (
                            <div
                              key={item.key}
                              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                            >
                              <div className="pr-2">
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {item.label}
                                  {effectiveVal ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Ativo" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" title="Inativo" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 leading-tight">{item.description}</div>
                              </div>

                              {/* Controles: Herdar / Forçar Permitir / Forçar Bloquear */}
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserException(item.key, 'inherit')}
                                  title="Herdar do Grupo de Acesso"
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    overrideVal === undefined
                                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                      : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                >
                                  Grupo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserException(item.key, 'allow')}
                                  title="Forçar Permissão (Liberar)"
                                  className={`p-1 rounded ${
                                    overrideVal === true
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-slate-400 hover:text-emerald-600'
                                  }`}
                                >
                                  <Unlock className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserException(item.key, 'deny')}
                                  title="Forçar Bloqueio (Negar)"
                                  className={`p-1 rounded ${
                                    overrideVal === false
                                      ? 'bg-rose-600 text-white'
                                      : 'text-slate-400 hover:text-rose-600'
                                  }`}
                                >
                                  <Lock className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão Salvar Exceções */}
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSaveUserExceptions}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow transition-all"
                  >
                    <Check className="w-4 h-4" /> Salvar Permissões do Usuário
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400">
                Selecione um usuário na coluna ao lado para visualizar e ajustar suas permissões.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: TRILHA DE AUDITORIA RBAC                                           */}
      {/* ========================================================================= */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" /> Trilha Imutável de Auditoria de Segurança & RBAC
          </h3>

          <div className="space-y-3">
            {rbacAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum evento de auditoria de segurança registrado no período.
              </div>
            ) : (
              rbacAuditLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{log.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{log.description}</p>
                    {log.justification && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                        Justificativa: "{log.justification}"
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 text-slate-400 text-[11px]">
                    <div>{log.timestamp}</div>
                    <div className="font-medium text-slate-600 dark:text-slate-300">Por: {log.userName}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / EDITAR GRUPO DE ACESSO                                     */}
      {/* ========================================================================= */}
      {isEditingGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedGroupToEdit ? `Editar Grupo: ${selectedGroupToEdit.name}` : 'Criar Novo Grupo de Acesso'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditingGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Informações Básicas do Grupo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome do Grupo</label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    placeholder="Ex: Faturamento & Tributos"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição Operacional</label>
                  <input
                    type="text"
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    placeholder="Ex: Acesso total a emissão de notas e conciliação bancária..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Matriz de Permissões do Grupo */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Matriz de Permissões do Grupo
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allTrue = ALL_PERMISSION_KEYS.reduce((acc, k) => {
                          acc[k.key] = true;
                          return acc;
                        }, {} as Partial<UserPermissions>);
                        setGroupFormData({ ...groupFormData, permissions: allTrue });
                      }}
                      className="text-[11px] text-indigo-600 hover:underline"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setGroupFormData({ ...groupFormData, permissions: {} })}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                {permissionCategories.map(cat => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      {cat.icon} {cat.title}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {cat.keys.map(item => {
                        const isChecked = !!groupFormData.permissions[item.key];

                        return (
                          <label
                            key={item.key}
                            className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-50/70 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setGroupFormData({
                                  ...groupFormData,
                                  permissions: {
                                    ...groupFormData.permissions,
                                    [item.key]: e.target.checked
                                  }
                                });
                              }}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{item.label}</div>
                              <div className="text-[10px] text-slate-400">{item.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingGroupModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow"
              >
                Salvar Grupo de Acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
