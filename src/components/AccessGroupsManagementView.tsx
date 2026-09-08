/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK — GESTÃO DE GRUPOS DE ACESSO, RBAC & ALÇADAS OPERACIONAIS (RBAC v2.0)
 * 
 * - Gestão de Grupos de Acesso (Perfis Funcionais)
 * - Matriz Granular de Permissões por Grupo e Ação
 * - Configuração de Alçadas Operacionais por Grupo (Descontos, Limites de Compra, Liquidação, Estornos)
 * - Exceções Individuais por Usuário (Sobrescrita Positiva / Negativa de Permissões e Alçadas)
 * - Simulador de Alçadas & Permissões em Tempo Real
 * - Visualização das Permissões Efetivas Resolvidas
 * - Trilha de Auditoria Imutável com Justificativas
 */

import React, { useState, useMemo } from 'react';
import { 
  AccessGroup, 
  User, 
  UserPermissions, 
  AppDatabase, 
  HistoryEntry, 
  CompanyInfo,
  OperationalAlcada
} from '../types';
import { 
  Shield, 
  Users, 
  KeyRound, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  History, 
  Sparkles, 
  Check, 
  X, 
  Sliders, 
  UserCheck, 
  FileText,
  DollarSign,
  Percent,
  PlayCircle,
  TrendingDown,
  CreditCard,
  RotateCcw,
  Building2
} from 'lucide-react';
import { 
  getEffectivePermissions, 
  getEffectiveAlcadas,
  checkOperationalAlcada,
  getDefaultAlcadasForRole,
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
  const [activeTab, setActiveTab] = useState<'groups' | 'user_exceptions' | 'simulator' | 'audit_logs'>('groups');

  // Modais de Grupos
  const [isEditingGroupModalOpen, setIsEditingGroupModalOpen] = useState<boolean>(false);
  const [groupModalTab, setGroupModalTab] = useState<'permissions' | 'alcadas'>('permissions');
  const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<AccessGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState<{
    name: string;
    code: string;
    description: string;
    color: string;
    active: boolean;
    permissions: Partial<UserPermissions>;
    alcadas: OperationalAlcada;
  }>({
    name: '',
    code: '',
    description: '',
    color: 'blue',
    active: true,
    permissions: {},
    alcadas: {
      maxDiscountPercent: 5,
      maxPurchaseApprovalAmount: 5000,
      maxCreditBypassAmount: 0,
      maxAccountsPayableSettleAmount: 10000,
      canCancelInvoices: false,
      canReopenServiceOrders: false,
      canReopenFinancialClosings: false,
      canBypassCreditLimit: false
    }
  });

  // Exceções por Usuário
  const [selectedUserForExceptions, setSelectedUserForExceptions] = useState<User | null>(
    db.users?.[0] || null
  );
  const [userAssignedGroupId, setUserAssignedGroupId] = useState<string>(
    db.users?.[0]?.accessGroupId || ''
  );
  const [userExceptionsDraft, setUserExceptionsDraft] = useState<Record<string, boolean | undefined>>({});
  const [userAlcadasDraft, setUserAlcadasDraft] = useState<Partial<OperationalAlcada>>({});
  const [exceptionJustification, setExceptionJustification] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Simulador de Alçadas em Tempo Real
  const [simSelectedUser, setSimSelectedUser] = useState<string>(db.users?.[0]?.id || '');
  const [simAction, setSimAction] = useState<'discount' | 'purchase' | 'credit_bypass' | 'payable_settle' | 'cancel_invoice' | 'reopen_os' | 'reopen_closing'>('discount');
  const [simValue, setSimValue] = useState<number>(12);

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
    
    const previewUser: User = {
      ...selectedUserForExceptions,
      accessGroupId: userAssignedGroupId || undefined,
      groupId: userAssignedGroupId || undefined,
      customPermissions: Object.entries(userExceptionsDraft).reduce((acc, [k, v]) => {
        if (v !== undefined) acc[k as keyof UserPermissions] = v;
        return acc;
      }, {} as Partial<UserPermissions>)
    };

    return getEffectivePermissions(previewUser, currentCompany?.id || 'comp-1', db);
  }, [selectedUserForExceptions, userAssignedGroupId, userExceptionsDraft, currentCompany, db]);

  // Alçadas Efetivas do Usuário Selecionado
  const effectiveAlcadasForSelectedUser = useMemo(() => {
    if (!selectedUserForExceptions) return getDefaultAlcadasForRole('atendente');

    const previewUser: User = {
      ...selectedUserForExceptions,
      accessGroupId: userAssignedGroupId || undefined,
      groupId: userAssignedGroupId || undefined,
      customAlcadas: userAlcadasDraft
    };

    return getEffectiveAlcadas(previewUser, currentCompany?.id || 'comp-1', db);
  }, [selectedUserForExceptions, userAssignedGroupId, userAlcadasDraft, currentCompany, db]);

  // Resultado da Simulação de Alçada
  const simResult = useMemo(() => {
    const targetUser = usersList.find(u => u.id === simSelectedUser) || selectedUserForExceptions;
    if (!targetUser) return null;
    return checkOperationalAlcada(
      targetUser,
      { action: simAction, value: simValue },
      currentCompany?.id || 'comp-1',
      db
    );
  }, [simSelectedUser, simAction, simValue, selectedUserForExceptions, currentCompany, db, usersList]);

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
        { key: 'salesCreate', label: 'Criar / Faturar Vendas', description: 'Concluir vendas no caixa' },
        { key: 'salesCancel', label: 'Cancelar / Estornar Vendas', description: 'Estornar vendas faturadas' },
        { key: 'accessBudgets', label: 'Acessar Orçamentos', description: 'Criar e consultar orçamentos técnicos' },
        { key: 'budgetsCreate', label: 'Criar Orçamentos', description: 'Elaborar novas propostas comerciais' },
        { key: 'budgetsEdit', label: 'Editar Orçamentos Abertos', description: 'Modificar itens, peças e valores' },
        { key: 'budgetsApprove', label: 'Aprovar / Converter Orçamentos', description: 'Converter orçamento em Ordem de Serviço' },
        { key: 'budgetsCancel', label: 'Cancelar Orçamentos', description: 'Reprovar propostas de orçamento' },
        { key: 'budgetsApplyDiscount', label: 'Aplicar Descontos', description: 'Conceder descontos em orçamentos conforme alçada' }
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
        { key: 'serviceOrdersReopen', label: 'Reabrir Ordens de Serviço', description: 'Reabrir OS finalizada para correções' },
        { key: 'serviceOrdersAssignMechanic', label: 'Alocar Mecânico Responsável', description: 'Designar técnicos aos serviços' },
        { key: 'accessClients', label: 'Gestão de Clientes', description: 'Consultar base de clientes PF e PJ' },
        { key: 'clientsCreate', label: 'Cadastrar Novos Clientes', description: 'Registrar novos clientes' },
        { key: 'clientsEdit', label: 'Editar Clientes', description: 'Atualizar dados e contatos' },
        { key: 'clientsDelete', label: 'Excluir Clientes', description: 'Remover clientes sem histórico' },
        { key: 'accessVehicles', label: 'Gestão de Veículos', description: 'Consultar histórico veicular e frotas' },
        { key: 'vehiclesCreate', label: 'Cadastrar Novos Veículos', description: 'Registrar veículos da frota' },
        { key: 'vehiclesEdit', label: 'Editar Veículos', description: 'Atualizar km e histórico' },
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
        { key: 'partsAdjustStock', label: 'Ajuste Manual de Estoque', description: 'Retificar contagem de inventário' },
        { key: 'accessUnitsOfMeasure', label: 'Unidades de Medida', description: 'Configurar cálculo linear, m² e m³' },
        { key: 'accessQuotations', label: 'Cotações com Fornecedores', description: 'Tomada de preços e compras' },
        { key: 'quotationsCreate', label: 'Criar Tomada de Preços', description: 'Abrir cotações de peças' },
        { key: 'quotationsApprove', label: 'Aprovar Compras', description: 'Aprovar compras conforme alçada em R$' }
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
        { key: 'fiscalInutilize', label: 'Inutilizar Numeração Fiscal', description: 'Homologar quebra de numeração' },
        { key: 'fiscalGenerateGuides', label: 'Gerar Guias Tributárias', description: 'Gerar GNRE/DARE de ICMS-ST/DIFAL' }
      ]
    },
    {
      category: 'FINANCIAL',
      title: 'Financeiro & Caixa',
      icon: <KeyRound className="w-4 h-4 text-rose-500" />,
      keys: [
        { key: 'accessAccountsReceivable', label: 'Contas a Receber', description: 'Cobranças, parcelas e baixas' },
        { key: 'accountsReceivableCreate', label: 'Lançar Faturas a Receber', description: 'Registrar contas manuais' },
        { key: 'accountsReceivableSettle', label: 'Liquidar Contas a Receber', description: 'Dar baixa de recebimento' },
        { key: 'accountsReceivableCancel', label: 'Estornar Títulos a Receber', description: 'Anular recebimentos ou títulos' },
        { key: 'accessAccountsPayable', label: 'Contas a Pagar', description: 'Controle de despesas e fornecedores' },
        { key: 'accountsPayableCreate', label: 'Lançar Despesas a Pagar', description: 'Registrar títulos de compras' },
        { key: 'accountsPayableSettle', label: 'Pagar / Quitar Despesas', description: 'Baixar títulos conforme alçada' },
        { key: 'accountsPayableCancel', label: 'Estornar Pagamentos', description: 'Anular baixa de contas a pagar' },
        { key: 'accountsPayableImportXml', label: 'Importar Boletos & XML', description: 'Carregar duplicatas a pagar' },
        { key: 'accessFinancial', label: 'Fluxo de Caixa & DRE', description: 'Extratos, conciliação e resultado líquido' },
        { key: 'financialExport', label: 'Exportar Relatórios Financeiros', description: 'Baixar relatórios e DRE' },
        { key: 'authorizeCreditLimitBypass', label: 'Liberar Limite de Crédito', description: 'Autorizar venda acima do teto' }
      ]
    },
    {
      category: 'REPRESENTATIVE',
      title: 'Representação Comercial & Pedidos',
      icon: <Building2 className="w-4 h-4 text-violet-500" />,
      keys: [
        { key: 'accessRepresentativeCommerce', label: 'Acesso Geral Representação', description: 'Visão geral, representadas e dashboard' },
        { key: 'accessRepresentativeOrders', label: 'Pedidos da Representada', description: 'Emitir e acompanhar pedidos enviados às fábricas' },
        { key: 'representativeOrdersCreate', label: 'Criar Pedidos Fábrica', description: 'Emitir novos pedidos comerciais' },
        { key: 'representativeOrdersEdit', label: 'Editar Pedidos Fábrica', description: 'Alterar itens e valores de pedidos' },
        { key: 'representativeOrdersCancel', label: 'Cancelar Pedidos Fábrica', description: 'Cancelar pedidos de representação' },
        { key: 'representativeOrdersExport', label: 'Exportar Pedidos', description: 'Gerar relatórios e planilhas dos pedidos' },
        { key: 'representativeReconciliationView', label: 'Conferência de Faturamento 1:N', description: 'Conciliar faturas e NFs com pedidos' },
        { key: 'representativeCommissionView', label: 'Comissões de Representação', description: 'Visualizar extrato e liquidações de comissões' },
        { key: 'representativeCommissionSettle', label: 'Baixar / Liquidar Comissões', description: 'Marcar comissões como recebidas' },
        { key: 'representativeReportsView', label: 'Relatórios de Representação', description: 'Indicadores de fábricas e clientes' }
      ]
    },
    {
      category: 'ADMIN_SYSTEM',
      title: 'Administração & Auditoria',
      icon: <Lock className="w-4 h-4 text-slate-500" />,
      keys: [
        { key: 'accessUserManagement', label: 'Gestão de Usuários & RBAC', description: 'Criar contas e definir permissões' },
        { key: 'accessAccessGroups', label: 'Gestão de Grupos de Acesso', description: 'Criar e editar grupos e alçadas' },
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
      permissions: {},
      alcadas: {
        maxDiscountPercent: 5,
        maxPurchaseApprovalAmount: 5000,
        maxCreditBypassAmount: 0,
        maxAccountsPayableSettleAmount: 10000,
        canCancelInvoices: false,
        canReopenServiceOrders: false,
        canReopenFinancialClosings: false,
        canBypassCreditLimit: false
      }
    });
    setGroupModalTab('permissions');
    setIsEditingGroupModalOpen(true);
  };

  // Abertura de Modal para Editar Grupo
  const handleOpenEditGroup = (group: AccessGroup) => {
    setSelectedGroupToEdit(group);
    setGroupFormData({
      name: group.name,
      code: group.code || '',
      description: group.description,
      color: group.color || 'blue',
      active: group.active,
      permissions: { ...group.permissions },
      alcadas: group.alcadas ? { ...group.alcadas } : {
        maxDiscountPercent: 5,
        maxPurchaseApprovalAmount: 5000,
        maxCreditBypassAmount: 0,
        maxAccountsPayableSettleAmount: 10000,
        canCancelInvoices: false,
        canReopenServiceOrders: false,
        canReopenFinancialClosings: false,
        canBypassCreditLimit: false
      }
    });
    setGroupModalTab('permissions');
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
            alcadas: groupFormData.alcadas,
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
        description: `Perfil ${groupFormData.name} modificado com novas diretrizes de permissões e alçadas operacionais.`,
        targetRecordId: selectedGroupToEdit.id,
        previousValue: {
          permissions: selectedGroupToEdit.permissions,
          alcadas: selectedGroupToEdit.alcadas
        },
        newValue: {
          permissions: groupFormData.permissions,
          alcadas: groupFormData.alcadas
        }
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
        alcadas: groupFormData.alcadas,
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
        description: `Grupo ${groupFormData.name} cadastrado com permissões granulares e alçadas operacionais.`,
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
    setUserAssignedGroupId(user.accessGroupId || user.groupId || '');
    setUserExceptionsDraft({ ...(user.customPermissions || user.individualExceptions || {}) });
    setUserAlcadasDraft({ ...(user.customAlcadas || user.alcadas || {}) });
    setExceptionJustification('');
  };

  // Alterar Exceção Individual de Permissão
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
    const previousAlcadas = selectedUserForExceptions.customAlcadas || {};

    const updatedUsers = usersList.map(u => {
      if (u.id === selectedUserForExceptions.id) {
        return {
          ...u,
          accessGroupId: userAssignedGroupId || undefined,
          groupId: userAssignedGroupId || undefined,
          customPermissions: Object.keys(userExceptionsDraft).length > 0 ? (userExceptionsDraft as any) : undefined,
          customAlcadas: Object.keys(userAlcadasDraft).length > 0 ? userAlcadasDraft : undefined
        };
      }
      return u;
    });

    const auditLog = createSecurityAuditLog({
      userId: currentUser?.id || 'usr-admin',
      userName: currentUser?.name || 'Administrador',
      companyId: currentCompany?.id || 'comp-1',
      action: 'USER_PERMISSIONS_OVERRIDDEN',
      title: `Exceções de Permissões & Alçadas: ${selectedUserForExceptions.name}`,
      description: `Permissões e alçadas individuais atualizadas para ${selectedUserForExceptions.name}. Grupo: ${userAssignedGroupId || 'Nenhum'}. Justificativa: "${exceptionJustification || 'Ajuste de alçadas operacionais'}".`,
      targetRecordId: selectedUserForExceptions.id,
      previousValue: {
        accessGroupId: selectedUserForExceptions.accessGroupId,
        customPermissions: previousPermissions,
        customAlcadas: previousAlcadas
      },
      newValue: {
        accessGroupId: userAssignedGroupId,
        customPermissions: userExceptionsDraft,
        customAlcadas: userAlcadasDraft
      },
      justification: exceptionJustification
    });

    onSaveDatabase({
      ...db,
      users: updatedUsers,
      history: [auditLog, ...(db.history || [])]
    });

    showFeedbackToast(`Permissões e alçadas de ${selectedUserForExceptions.name} salvas com sucesso!`);
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
      h.action?.startsWith('ALCADA_') ||
      h.action?.startsWith('GUIDE_') ||
      h.action?.includes('RBAC') ||
      h.action?.includes('PERMISSION') ||
      h.action?.includes('AUDIT')
    );
  }, [db.history]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Shield className="w-4 h-4" /> Governança, RBAC & Alçadas Operacionais v2.0
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            Grupos de Acesso, Alçadas & Exceções
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Hierarquia: Contrato SaaS → Módulo Contratado → Grupo RBAC → Exceções Individuais → Alçadas Operacionais com Auditoria Imutável.
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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'groups'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Grupos de Acesso ({accessGroups.length})
        </button>

        <button
          onClick={() => setActiveTab('user_exceptions')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'user_exceptions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" /> Exceções & Alçadas por Usuário
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'simulator'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <PlayCircle className="w-4 h-4 text-emerald-500" /> Simulador de Alçadas em Tempo Real
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
              const membersCount = usersList.filter(u => (u.accessGroupId === group.id || u.groupId === group.id)).length;
              const permissionsCount = Object.values(group.permissions || {}).filter(Boolean).length;
              const groupAlcadas = group.alcadas;

              return (
                <div
                  key={group.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
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

                    {/* Resumo de Alçadas Operacionais */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Desconto Máximo:</span>
                        <strong className="text-indigo-600 dark:text-indigo-400">{groupAlcadas?.maxDiscountPercent ?? 5}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Alçada Compras:</span>
                        <strong className="text-slate-900 dark:text-white">R$ {(groupAlcadas?.maxPurchaseApprovalAmount ?? 0).toLocaleString('pt-BR')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Alçada Pagamento Título:</span>
                        <strong className="text-slate-900 dark:text-white">R$ {(groupAlcadas?.maxAccountsPayableSettleAmount ?? 0).toLocaleString('pt-BR')}</strong>
                      </div>
                    </div>

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
                      <Edit3 className="w-3.5 h-3.5" /> Configurar Permissões & Alçadas
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
      {/* ABA 2: EXCEÇÕES & ALÇADAS POR USUÁRIO                                     */}
      {/* ========================================================================= */}
      {activeTab === 'user_exceptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Seletor de Usuários */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" /> Selecionar Usuário
            </h3>

            <div className="space-y-1.5 max-h-[550px] overflow-y-auto">
              {usersList.map(user => {
                const isSelected = selectedUserForExceptions?.id === user.id;
                const assignedGroup = accessGroups.find(g => g.id === (user.accessGroupId || user.groupId));
                const hasExceptions = (user.customPermissions && Object.keys(user.customPermissions).length > 0) || (user.customAlcadas && Object.keys(user.customAlcadas).length > 0);

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

          {/* Coluna Direita: Matriz de Permissões & Alçadas */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {selectedUserForExceptions ? (
              <>
                {/* Header do Usuário */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Permissões & Alçadas: {selectedUserForExceptions.name}
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {selectedUserForExceptions.role}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure o Grupo de Acesso e defina exceções individuais de permissões e alçadas operacionais.
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
                    Justificativa da Alteração (Obrigatório para Auditoria Imutável)
                  </label>
                  <input
                    type="text"
                    value={exceptionJustification}
                    onChange={(e) => setExceptionJustification(e.target.value)}
                    placeholder="Ex: Concessão temporária de alçada de 15% de desconto para fechamento de grandes frotas..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Alçadas Operacionais do Usuário */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-indigo-600" /> Alçadas Operacionais Efetivas do Operador
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Desconto Máximo (%)</label>
                      <div className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-indigo-500" />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={userAlcadasDraft.maxDiscountPercent ?? effectiveAlcadasForSelectedUser.maxDiscountPercent ?? 0}
                          onChange={(e) => setUserAlcadasDraft({ ...userAlcadasDraft, maxDiscountPercent: Number(e.target.value) })}
                          className="w-full bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Aprovação Compras (R$)</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-600">R$</span>
                        <input
                          type="number"
                          min="0"
                          value={userAlcadasDraft.maxPurchaseApprovalAmount ?? effectiveAlcadasForSelectedUser.maxPurchaseApprovalAmount ?? 0}
                          onChange={(e) => setUserAlcadasDraft({ ...userAlcadasDraft, maxPurchaseApprovalAmount: Number(e.target.value) })}
                          className="w-full bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Baixa Título Pagar (R$)</label>
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                        <input
                          type="number"
                          min="0"
                          value={userAlcadasDraft.maxAccountsPayableSettleAmount ?? effectiveAlcadasForSelectedUser.maxAccountsPayableSettleAmount ?? 0}
                          onChange={(e) => setUserAlcadasDraft({ ...userAlcadasDraft, maxAccountsPayableSettleAmount: Number(e.target.value) })}
                          className="w-full bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Tolerância Crédito (R$)</label>
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                        <input
                          type="number"
                          min="0"
                          value={userAlcadasDraft.maxCreditBypassAmount ?? effectiveAlcadasForSelectedUser.maxCreditBypassAmount ?? 0}
                          onChange={(e) => setUserAlcadasDraft({ ...userAlcadasDraft, maxCreditBypassAmount: Number(e.target.value) })}
                          className="w-full bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
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
                    <Check className="w-4 h-4" /> Salvar Permissões & Alçadas do Usuário
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
      {/* ABA 3: SIMULADOR DE ALÇADAS EM TEMPO REAL                                */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-emerald-500" /> Simulador de Alçadas & Ações Operacionais
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teste se um operador possui alçada para conceder determinado desconto, aprovar compras ou executar ações críticas no sistema.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Selecionar Operador</label>
              <select
                value={simSelectedUser}
                onChange={(e) => setSimSelectedUser(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
              >
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Ação / Operação</label>
              <select
                value={simAction}
                onChange={(e) => setSimAction(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="discount">Desconto Comercial em Orçamento / Venda (%)</option>
                <option value="purchase">Aprovação de Pedido de Compra / Cotação (R$)</option>
                <option value="payable_settle">Liquidação / Pagamento de Despesa (R$)</option>
                <option value="credit_bypass">Venda com Excesso de Limite de Crédito (R$)</option>
                <option value="cancel_invoice">Cancelamento de Documento Fiscal (SEFAZ)</option>
                <option value="reopen_os">Reabertura de Ordem de Serviço Concluída</option>
                <option value="reopen_closing">Estorno de Fechamento Financeiro Consolidado</option>
              </select>
            </div>

            {(simAction === 'discount' || simAction === 'purchase' || simAction === 'payable_settle' || simAction === 'credit_bypass') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {simAction === 'discount' ? 'Percentual Solicitado (%)' : 'Valor da Operação (R$)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={simValue}
                  onChange={(e) => setSimValue(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Cartão de Veredito do Simulador */}
          {simResult && (
            <div className={`p-5 rounded-2xl border transition-all ${
              simResult.allowed
                ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {simResult.allowed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {simResult.allowed ? 'Operação Autorizada Diretamente' : 'Operação Bloqueada / Requer Alçada Superior'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      simResult.allowed
                        ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                    }`}>
                      {simResult.allowed ? 'ALÇADA APROVADA' : 'BLOQUEIO RBAC'}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed opacity-90">
                    {simResult.allowed
                      ? `O operador possui alçada suficiente para executar a ação solicitada (Limite máximo configurado: ${simResult.maxAllowed !== undefined ? `${simResult.maxAllowed}${simAction === 'discount' ? '%' : ' R$'}` : 'Ilimitado'}).`
                      : simResult.reason}
                  </p>

                  {!simResult.allowed && simResult.requiredRole && (
                    <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300 mt-2 bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-lg inline-block">
                      🔒 Nível hierárquico necessário para aprovação: <strong>{simResult.requiredRole}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: TRILHA DE AUDITORIA RBAC                                           */}
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

            {/* Sub-abas do Modal: Permissões vs Alçadas */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-6">
              <button
                type="button"
                onClick={() => setGroupModalTab('permissions')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                  groupModalTab === 'permissions'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                1. Matriz de Permissões Granulares
              </button>
              <button
                type="button"
                onClick={() => setGroupModalTab('alcadas')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                  groupModalTab === 'alcadas'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                2. Alçadas & Limites Operacionais
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
                    placeholder="Ex: Consultores Técnicos & Atendimento"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição Operacional</label>
                  <input
                    type="text"
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    placeholder="Ex: Acesso a abertura de OS, orçamentos e consulta de peças..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>
              </div>

              {groupModalTab === 'permissions' && (
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
              )}

              {groupModalTab === 'alcadas' && (
                <div className="space-y-6 pt-2">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 dark:border-slate-800">
                    Limites de Alçadas Operacionais para Membros do Grupo
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Desconto Máximo Permitido (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-indigo-500" />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={groupFormData.alcadas.maxDiscountPercent ?? 5}
                          onChange={(e) => setGroupFormData({
                            ...groupFormData,
                            alcadas: { ...groupFormData.alcadas, maxDiscountPercent: Number(e.target.value) }
                          })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Descontos acima deste teto exigirão liberação gerencial.</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Alçada para Aprovação de Compras (R$)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-emerald-600">R$</span>
                        <input
                          type="number"
                          min="0"
                          value={groupFormData.alcadas.maxPurchaseApprovalAmount ?? 5000}
                          onChange={(e) => setGroupFormData({
                            ...groupFormData,
                            alcadas: { ...groupFormData.alcadas, maxPurchaseApprovalAmount: Number(e.target.value) }
                          })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Pedidos de compra ou cotações acima deste valor são encaminhados a diretoria.</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Alçada para Baixa de Títulos a Pagar (R$)
                      </label>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-500" />
                        <input
                          type="number"
                          min="0"
                          value={groupFormData.alcadas.maxAccountsPayableSettleAmount ?? 10000}
                          onChange={(e) => setGroupFormData({
                            ...groupFormData,
                            alcadas: { ...groupFormData.alcadas, maxAccountsPayableSettleAmount: Number(e.target.value) }
                          })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Liquidação direta de despesas diárias do Contas a Pagar.</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tolerância de Limite de Crédito (R$)
                      </label>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                        <input
                          type="number"
                          min="0"
                          value={groupFormData.alcadas.maxCreditBypassAmount ?? 0}
                          onChange={(e) => setGroupFormData({
                            ...groupFormData,
                            alcadas: { ...groupFormData.alcadas, maxCreditBypassAmount: Number(e.target.value) }
                          })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Valor de tolerância para faturar clientes com limite estourado.</p>
                    </div>
                  </div>

                  {/* Permissões Críticas Booleanas */}
                  <div className="space-y-2 pt-2">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Ações Operacionais de Alto Impacto</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupFormData.alcadas.canCancelInvoices ?? false}
                          onChange={(e) => setGroupFormData({
                            ...groupFormData,
                            alcadas: { ...groupFormData.alcadas, canCancelInvoices: e.target.checked }
                          })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">Cancelar Documentos Fiscais</div>
                          <div className="text-[10px] text-slate-400">Pode solicitar cancelamento na SEFAZ</div>
                        </div>
                      </label>

                      <label className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupFormData.alcadas.canReopenServiceOrders ?? false}
                          onChange={(e) => setGroupFormData({
                            ...groupFormData,
                            alcadas: { ...groupFormData.alcadas, canReopenServiceOrders: e.target.checked }
                          })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">Reabrir Ordens de Serviço Concluídas</div>
                          <div className="text-[10px] text-slate-400">Pode reverter status de OS finalizada</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
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
