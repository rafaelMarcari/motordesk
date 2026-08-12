/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Calendar, Shield, FileText, Wrench, DollarSign, UserCheck, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, Clock, Gauge, Car, User as UserIcon, Building2, Download, Lock, CheckCircle } from 'lucide-react';
import type { HistoryEntry, MaintenanceLog, User } from '../types';
import { AppDatabase } from '../data/mockData';

interface HistoryViewProps {
  db: AppDatabase;
  currentUser?: User | null;
  fullDb?: AppDatabase;
}

export default function HistoryView({ db, currentUser, fullDb }: HistoryViewProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'maintenance'>('audit');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [maintCategoryFilter, setMaintCategoryFilter] = useState<string>('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');

  const databaseToUse = fullDb || db;

  const getClientName = (id: string) => databaseToUse.clients.find(c => c.id === id)?.name || 'Cliente';
  const getVehicleDesc = (id: string) => {
    const v = databaseToUse.vehicles.find(veh => veh.id === id);
    return v ? `${v.brand} ${v.model} (${v.plate})` : 'Geral / Sistema';
  };
  const getVehicleObj = (id: string) => databaseToUse.vehicles.find(v => v.id === id);

  // List of all registered companies for multi-tenant filter
  const allCompaniesList = React.useMemo(() => {
    if (databaseToUse.registeredCompanies && databaseToUse.registeredCompanies.length > 0) {
      return databaseToUse.registeredCompanies;
    }
    return [databaseToUse.companyInfo];
  }, [databaseToUse]);

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return databaseToUse.companyInfo?.name || 'Oficina Principal';
    const comp = allCompaniesList.find(c => c.id === companyId);
    return comp ? comp.name : (databaseToUse.companyInfo?.name || 'Oficina');
  };

  // User & Multi-Tenant Company Isolation Context
  const userCompanyId = currentUser?.companyId || databaseToUse.companyInfo?.id || 'comp-1';
  const isSuperAdmin = currentUser?.role === 'admin';
  const isClient = (currentUser?.role as string) === 'client';

  // Check if current user has permission to view audit history of ALL companies
  const userRoleKey = currentUser?.role;
  const companyLevelPerms = userRoleKey ? databaseToUse.companyInfo?.levelPermissions?.[userRoleKey] : undefined;
  const canViewAllCompaniesHistory = Boolean(
    isSuperAdmin || 
    currentUser?.permissions?.canViewAllCompaniesHistory || 
    companyLevelPerms?.canViewAllCompaniesHistory
  );

  // Global Multi-Tenant Scope Toggle for Super-Admin (Disabled by default so audit shows ONLY user company by default)
  const [isGlobalViewEnabled, setIsGlobalViewEnabled] = useState<boolean>(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(userCompanyId);

  // Ensure selectedCompanyFilter stays aligned with userCompanyId when global view is off
  React.useEffect(() => {
    if (!isGlobalViewEnabled) {
      setSelectedCompanyFilter(userCompanyId);
    }
  }, [userCompanyId, isGlobalViewEnabled]);

  // Filter history entries (ordered descending by date)
  const sortedHistory = [...(databaseToUse.history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredHistory = sortedHistory.filter(entry => {
    const entryCompanyId = entry.companyId || 'comp-1';

    // 1. Store/Client isolation check:
    if (isClient) {
      if (entry.clientId && entry.clientId !== currentUser?.id) {
        return false;
      }
      if (entryCompanyId !== userCompanyId) {
        return false;
      }
    } else if (!canViewAllCompaniesHistory || !isGlobalViewEnabled) {
      // Users without cross-company permission OR when global view is disabled (default) ONLY see logs of their own company
      if (entryCompanyId !== userCompanyId) {
        return false;
      }
    } else if (isGlobalViewEnabled && canViewAllCompaniesHistory) {
      // Global view enabled by super-admin:
      if (selectedCompanyFilter !== 'all' && entryCompanyId !== selectedCompanyFilter) {
        return false;
      }
    }

    // 2. Query, Type, Vehicle, User filters
    const vDesc = getVehicleDesc(entry.vehicleId).toLowerCase();
    const cName = getClientName(entry.clientId).toLowerCase();
    const userNameStr = (entry.userName || '').toLowerCase();
    const compNameStr = getCompanyName(entry.companyId).toLowerCase();

    const matchesQuery = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        vDesc.includes(searchQuery.toLowerCase()) ||
                        cName.includes(searchQuery.toLowerCase()) ||
                        userNameStr.includes(searchQuery.toLowerCase()) ||
                        compNameStr.includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesVehicle = selectedVehicleId === 'all' || entry.vehicleId === selectedVehicleId;
    const matchesUser = selectedUserFilter === 'all' || entry.userName === selectedUserFilter;

    return matchesQuery && matchesType && matchesVehicle && matchesUser;
  });

  // Export audit logs as CSV
  const handleExportCsv = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['ID', 'Data/Hora', 'Empresa', 'ID Empresa', 'Usuario Responsavel', 'Tipo de Evento', 'Titulo', 'Descricao Detalhada'];
    const rows = filteredHistory.map(entry => [
      entry.id,
      new Date(entry.date).toLocaleString('pt-BR'),
      getCompanyName(entry.companyId),
      entry.companyId || 'comp-1',
      entry.userName || 'Sistema',
      entry.type,
      `"${(entry.title || '').replace(/"/g, '""')}"`,
      `"${(entry.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_historico_motordesk_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Maintenance Logs
  const maintenanceLogs = databaseToUse.maintenanceLogs || db.maintenanceLogs || [];
  const sortedMaintLogs = [...maintenanceLogs].sort((a, b) => new Date(b.serviceDate || '').getTime() - new Date(a.serviceDate || '').getTime());

  const filteredMaintLogs = sortedMaintLogs.filter(log => {
    const logCompanyId = log.companyId || 'comp-1';

    if (isClient) {
      if (log.clientId && log.clientId !== currentUser?.id) {
        return false;
      }
      if (logCompanyId !== userCompanyId) {
        return false;
      }
    } else if (!canViewAllCompaniesHistory || !isGlobalViewEnabled) {
      if (logCompanyId !== userCompanyId) {
        return false;
      }
    } else if (isGlobalViewEnabled && canViewAllCompaniesHistory) {
      if (selectedCompanyFilter !== 'all' && logCompanyId !== selectedCompanyFilter) {
        return false;
      }
    }

    const v = getVehicleObj(log.vehicleId);
    const vDesc = v ? `${v.brand} ${v.model} ${v.plate}`.toLowerCase() : '';
    const cName = getClientName(log.clientId).toLowerCase();
    const itemDesc = log.itemDescription || log.serviceName || '';
    const matchesQuery = itemDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        vDesc.includes(searchQuery.toLowerCase()) ||
                        cName.includes(searchQuery.toLowerCase()) ||
                        (log.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVehicle = selectedVehicleId === 'all' || log.vehicleId === selectedVehicleId;
    const matchesCategory = maintCategoryFilter === 'all' || log.category === maintCategoryFilter;

    return matchesQuery && matchesVehicle && matchesCategory;
  });

  const getIconForEntry = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'budget':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'service_order':
        return <Wrench className="w-4 h-4 text-purple-600" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'user_activity':
        return <UserCheck className="w-4 h-4 text-indigo-600" />;
      default:
        return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  const getBadgeColor = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'budget': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'service_order': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'payment': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'user_activity': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="history-view-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Histórico do Cliente & Manutenção</h1>
          <p className="text-sm text-slate-500">Acompanhamento das trocas periódicas (óleo, pneus, alinhamento) e auditoria geral.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mt-4 md:mt-0">
          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'maintenance'
                ? 'bg-indigo-600 text-white shadow-3xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Gauge className="w-4 h-4" /> Manutenções e Trocas Periódicas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-3xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Auditoria de Eventos
          </button>
        </div>
      </div>

      {/* TAB 1: MANUTENÇÕES PERIÓDICAS (ÓLEO, PNEUS, ALINHAMENTO) */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4 animate-fade-in">
          {/* Top Info Banner */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-150 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wide font-display">
                  Controle da Próxima Troca de Óleo, Pneus e Balanceamento
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Histórico completo por cliente e veículo com acompanhamento de KM atual, próxima troca prevista e prazos em dias.
                </p>
              </div>
            </div>
            <div className="text-xs bg-white px-3 py-1.5 rounded-lg border border-indigo-100 font-bold text-indigo-900 shadow-2xs">
              {filteredMaintLogs.length} Troca(s) / Manutenção(ões) Registrada(s)
            </div>
          </div>

          {/* Maintenance Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, veículo ou item..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <select
              value={maintCategoryFilter}
              onChange={e => setMaintCategoryFilter(e.target.value)}
              className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            >
              <option value="all">Todas as Categorias</option>
              <option value="oil_change">🛢️ Troca de Óleo / Filtros</option>
              <option value="tire_change">🚗 Pneus e Rodas</option>
              <option value="tire_alignment_balance">⚖️ Alinhamento e Balanceamento</option>
              <option value="general_maintenance">🔧 Revisão Geral / Correias</option>
            </select>

            <select
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            >
              <option value="all">Todos os Veículos</option>
              {db.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>
              ))}
            </select>
          </div>

          {/* List of Maintenance Logs */}
          <div className="space-y-3">
            {filteredMaintLogs.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-100 rounded-xl text-slate-400">
                <Gauge className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Nenhuma manutenção periódica encontrada com os filtros atuais.</p>
                <p className="text-xs text-slate-400 mt-1">Ao concluir Ordens de Serviço contendo serviços ou produtos periódicos, os registros de troca serão lançados automaticamente.</p>
              </div>
            ) : (
              filteredMaintLogs.map(log => {
                const vehicle = getVehicleObj(log.vehicleId);
                const clientName = getClientName(log.clientId);
                const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
                  oil_change: { label: 'Troca de Óleo / Filtro', icon: '🛢️', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                  tire_change: { label: 'Troca de Pneu', icon: '🚗', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                  tire_alignment_balance: { label: 'Alinhamento & Balanceamento', icon: '⚖️', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  general_maintenance: { label: 'Revisão Geral', icon: '🔧', color: 'bg-purple-50 text-purple-800 border-purple-200' }
                };
                const catMeta = categoryLabels[log.category] || categoryLabels['general_maintenance'];

                // Calculate due status
                const perfKm = log.serviceKm ?? log.performedKm ?? 0;
                const perfDate = log.serviceDate || log.performedDate || new Date().toISOString();
                const itemLabel = log.itemDescription || log.serviceName || 'Manutenção Periódica';

                const currentKm = vehicle?.currentKm || perfKm;
                const kmRemaining = log.nextDueKm ? log.nextDueKm - currentKm : null;
                const isOverdueKm = kmRemaining !== null && kmRemaining <= 0;
                const isNearDueKm = kmRemaining !== null && kmRemaining > 0 && kmRemaining <= 1000;

                return (
                  <div key={log.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md border text-xs font-bold flex items-center gap-1 ${catMeta.color}`}>
                          <span>{catMeta.icon}</span> {catMeta.label}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">{itemLabel}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">OS Origem:</span>
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {log.serviceOrderId || 'Direta'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                      {/* Vehicle & Client Info */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Veículo & Cliente</span>
                        <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Car className="w-3.5 h-3.5 text-indigo-600" />
                          {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'Veículo não encontrado'}
                        </p>
                        <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          {clientName}
                        </p>
                      </div>

                      {/* Executed Data */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Realizado Em</span>
                        <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(perfDate).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-slate-600 font-mono mt-0.5">
                          KM Realizado: <strong>{perfKm.toLocaleString('pt-BR')} km</strong>
                        </p>
                      </div>

                      {/* Next Due KM */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Próxima Troca (KM)</span>
                        <p className="font-bold font-mono text-indigo-900 text-sm mt-0.5">
                          {log.nextDueKm ? `${log.nextDueKm.toLocaleString('pt-BR')} km` : 'Não definido'}
                        </p>
                        {kmRemaining !== null && (
                          <p className={`text-[11px] font-bold mt-0.5 ${
                            isOverdueKm ? 'text-red-600 flex items-center gap-1' :
                            isNearDueKm ? 'text-amber-600 flex items-center gap-1' : 'text-emerald-600'
                          }`}>
                            {isOverdueKm ? (
                              <><AlertTriangle className="w-3 h-3" /> Vencido há {Math.abs(kmRemaining).toLocaleString('pt-BR')} km</>
                            ) : isNearDueKm ? (
                              <><Clock className="w-3 h-3" /> Próximo! Falta {kmRemaining.toLocaleString('pt-BR')} km</>
                            ) : (
                              <><CheckCircle2 className="w-3 h-3 inline mr-0.5" /> Faltam {kmRemaining.toLocaleString('pt-BR')} km</>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Next Due Date */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Próxima Troca (Data)</span>
                        <p className="font-bold text-indigo-900 text-sm mt-0.5">
                          {log.nextDueDate ? new Date(log.nextDueDate).toLocaleDateString('pt-BR') : 'Não definida'}
                        </p>
                        {log.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 truncate" title={log.notes}>
                            Obs: {log.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUDITORIA E EVENTOS DO SISTEMA */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-fade-in">
          {/* Profile Permission Access & Immutability Notification Header (RN007) */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md" id="history-immutability-alert">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-indigo-400 flex-shrink-0 animate-pulse" />
              <div className="text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-300">Garantia de Integridade & Isolamento de Auditoria Multi-tenant</span>
                  {currentUser && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono ${
                      canViewAllCompaniesHistory && isGlobalViewEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {canViewAllCompaniesHistory && isGlobalViewEnabled ? (
                        <><CheckCircle className="w-3 h-3 text-emerald-400" /> Auditoria Global Ativa (Super-Admin) — {currentUser.name}</>
                      ) : (
                        <><Lock className="w-3 h-3 text-indigo-400" /> Visão Padrão: Loja {getCompanyName(userCompanyId)} — {currentUser.name}</>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 leading-relaxed mt-0.5">
                  <strong>Regra de Negócio Absoluta:</strong> Históricos de ações por usuário e empresa são de caráter <strong>apenas-leitura</strong> e rastreáveis. Registros imutáveis para garantir conformidade e transparência fiscal.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-export-audit-csv"
              onClick={handleExportCsv}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" /> Exportar Relatório (CSV)
            </button>
          </div>

          {/* Super-Admin Scope Selector Card */}
          {canViewAllCompaniesHistory && (
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/80 rounded-xl shadow-xs text-white flex flex-col md:flex-row md:items-center justify-between gap-4" id="superadmin-scope-selector-card">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/30 rounded-lg text-indigo-300 border border-indigo-500/30 shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200 font-display">
                      Seletor de Escopo de Auditoria (Super-Admin)
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      isGlobalViewEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {isGlobalViewEnabled ? '🌐 Visão Global Multi-Empresa Ativa' : '🏢 Filtrado por Empresa Logada (Padrão)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Por padrão, a auditoria exibe apenas os registros da empresa do operador conectado (<strong>{getCompanyName(userCompanyId)}</strong>). Perfis com permissão super-admin podem alternar abaixo para a visão global.
                  </p>
                </div>
              </div>

              {/* Toggle selector buttons */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  id="btn-scope-my-company"
                  onClick={() => {
                    setIsGlobalViewEnabled(false);
                    setSelectedCompanyFilter(userCompanyId);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    !isGlobalViewEnabled
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Exibe logs apenas da empresa do usuário conectado (Comportamento Padrão)"
                >
                  <Building2 className="w-3.5 h-3.5" /> Apenas Minha Empresa
                </button>

                <button
                  type="button"
                  id="btn-scope-global"
                  onClick={() => {
                    setIsGlobalViewEnabled(true);
                    setSelectedCompanyFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isGlobalViewEnabled
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Habilita a auditoria de todas as empresas cadastradas no sistema"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> Habilitar Visão Global (Super-Admin)
                </button>
              </div>
            </div>
          )}

          {/* Filters and Search panel (Divided by Company & User) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200" id="history-filters-panel">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input 
                id="history-search-input"
                type="text" 
                placeholder="Buscar ação ou usuário..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Filter Company (Multi-Tenant Division) */}
            <div className="relative">
              {!canViewAllCompaniesHistory || !isGlobalViewEnabled ? (
                <div 
                  className="w-full text-xs px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-lg flex items-center justify-between gap-1 shadow-2xs" 
                  title={canViewAllCompaniesHistory ? "Modo Padrão: Filtrado pela sua empresa. Habilite a Visão Global no seletor de Super-Admin acima para alternar entre lojas." : "Acesso liberado apenas para a sua própria empresa."}
                >
                  <span className="truncate flex items-center gap-1 font-bold text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    {getCompanyName(userCompanyId)}
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded shrink-0">
                    Padrão
                  </span>
                </div>
              ) : (
                <select
                  id="history-filter-company-select"
                  value={selectedCompanyFilter}
                  onChange={e => setSelectedCompanyFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-indigo-300 text-indigo-950 font-bold rounded-lg focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">🏢 Visão Global (Todas as {allCompaniesList.length} Lojas)</option>
                  {allCompaniesList.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.cnpj ? `(${comp.cnpj})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Filter User */}
            <div className="relative">
              <select
                id="history-filter-user-select"
                value={selectedUserFilter}
                onChange={e => setSelectedUserFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 text-slate-800 font-medium rounded-lg focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">👤 Todos os Usuários Operadores</option>
                {Array.from(new Set((databaseToUse.history || []).map(h => h.userName).filter(Boolean))).map(uName => (
                  <option key={uName} value={uName}>Operador: {uName}</option>
                ))}
              </select>
            </div>

            {/* Filter Event Type */}
            <select 
              id="history-filter-type-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
            >
              <option value="all">⚡ Todos os tipos de ação</option>
              <option value="budget">📄 Orçamentos</option>
              <option value="service_order">🔧 Ordens de Serviço</option>
              <option value="payment">💰 Recebimentos/Financeiro</option>
              <option value="user_activity">👤 Atividades de Usuário</option>
              <option value="system">⚙️ Eventos de Sistema</option>
            </select>

            {/* Filter Vehicle */}
            <select 
              id="history-filter-vehicle-select"
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
            >
              <option value="all">🚗 Todos os Veículos</option>
              {databaseToUse.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>
              ))}
            </select>
          </div>

          {/* Timeline view */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 relative shadow-2xs" id="history-timeline-panel">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Registros Auditados ({filteredHistory.length} Eventos Encontrados)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Filtrado para: {!isGlobalViewEnabled || selectedCompanyFilter === userCompanyId ? `Minha Empresa (${getCompanyName(userCompanyId)})` : selectedCompanyFilter === 'all' ? 'Todas as Empresas (Visão Global)' : getCompanyName(selectedCompanyFilter)}
              </span>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400" id="history-empty-state">
                <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600 text-sm">Nenhum evento registrado com os filtros selecionados.</p>
                <p className="text-xs text-slate-400 mt-1">Tente selecionar outra empresa ou limpar o campo de busca.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-indigo-100 pl-6 ml-4 space-y-6">
                {filteredHistory.map((entry) => {
                  const compName = getCompanyName(entry.companyId);
                  return (
                    <div key={entry.id} className="relative group" id={`history-entry-${entry.id}`}>
                      {/* Visual Circle Indicator on the left line */}
                      <span className={`absolute -left-9.5 top-1 p-2 rounded-full border-2 border-white shadow-xs ${
                        entry.type === 'budget' ? 'bg-amber-500' :
                        entry.type === 'service_order' ? 'bg-purple-500' :
                        entry.type === 'payment' ? 'bg-emerald-500' :
                        entry.type === 'user_activity' ? 'bg-indigo-500' : 'bg-slate-600'
                      }`} />

                      <div className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition duration-150 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-slate-200/60">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(entry.type)}`}>
                              {getIconForEntry(entry.type)}
                              {entry.type === 'budget' ? 'Orçamento' :
                               entry.type === 'service_order' ? 'Ordem de Serviço' :
                               entry.type === 'payment' ? 'Financeiro' :
                               entry.type === 'user_activity' ? 'Atividade' : 'Sistema'}
                            </span>

                            {/* Company Division Badge */}
                            <span className="text-[10px] bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 font-mono">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              {compName}
                            </span>

                            <h3 className="font-bold text-slate-800 text-sm tracking-tight">{entry.title}</h3>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(entry.date).toLocaleString('pt-BR')}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans">{entry.description}</p>

                        <div className="pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                          <div className="flex items-center gap-3">
                            <p className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                              Usuário Responsável: <strong className="text-slate-800 font-mono">{entry.userName || 'Sistema'}</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p>Veículo: <span className="font-semibold text-slate-700">{getVehicleDesc(entry.vehicleId)}</span></p>
                            <p>Cliente: <span className="font-semibold text-slate-700">{getClientName(entry.clientId)}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
