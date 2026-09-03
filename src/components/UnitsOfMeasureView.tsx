/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Ruler,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Eye,
  Sliders,
  Calculator,
  Box,
  Layers,
  Maximize2,
  Scale,
  Clock,
  HelpCircle,
  ShieldCheck,
  Building2,
  Globe,
  ArrowRight,
  Info,
  Check,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { UnitOfMeasure, UnitCategory, UnitCalculationType, User, CompanyInfo } from '../types';
import { AppDatabase } from '../data/mockData';
import { calculateItemQuantity, formatQuantityLocale } from '../utils/unitMeasurementUtils';

interface UnitsOfMeasureViewProps {
  db: AppDatabase;
  currentUser: User;
  currentCompany: CompanyInfo;
  onSaveUnitsOfMeasure: (units: UnitOfMeasure[]) => void;
  onAddHistoryLog?: (
    type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system',
    title: string,
    description: string,
    clientId: string,
    vehicleId: string,
    metadata?: any
  ) => void;
}

const CATEGORY_LABELS: Record<UnitCategory, { label: string; icon: any; color: string }> = {
  QUANTIDADE: { label: 'Quantidade / Peças', icon: Box, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPRIMENTO: { label: 'Comprimento Linear', icon: Ruler, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  AREA: { label: 'Área / Superfície (M²)', icon: Layers, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  VOLUME: { label: 'Volume / Cúbico (M³, L)', icon: Maximize2, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  MASSA: { label: 'Massa / Peso (KG, G)', icon: Scale, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  TEMPO: { label: 'Tempo / Horas', icon: Clock, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  OUTROS: { label: 'Outros / Especiais', icon: Sliders, color: 'bg-slate-50 text-slate-700 border-slate-200' }
};

const CALC_TYPE_LABELS: Record<UnitCalculationType, { label: string; desc: string; badgeColor: string }> = {
  SIMPLES: {
    label: 'Cálculo Simples',
    desc: 'Multiplicação direta (Quantidade × Preço Unitário)',
    badgeColor: 'bg-slate-100 text-slate-800'
  },
  LINEAR: {
    label: 'Linear (Comprimento)',
    desc: 'Comprimento × Preço por metro/unidade linear',
    badgeColor: 'bg-indigo-100 text-indigo-800'
  },
  AREA: {
    label: 'Área (M²)',
    desc: 'Comprimento × Largura × Preço por m²',
    badgeColor: 'bg-emerald-100 text-emerald-800'
  },
  VOLUME: {
    label: 'Volume (M³)',
    desc: 'Comprimento × Largura × Altura × Preço por m³',
    badgeColor: 'bg-purple-100 text-purple-800'
  }
};

export const UnitsOfMeasureView: React.FC<UnitsOfMeasureViewProps> = ({
  db,
  currentUser,
  currentCompany,
  onSaveUnitsOfMeasure,
  onAddHistoryLog
}) => {
  const units = db.unitsOfMeasure || [];

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [calcTypeFilter, setCalcTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasure | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formAcronym, setFormAcronym] = useState('');
  const [formCategory, setFormCategory] = useState<UnitCategory>('QUANTIDADE');
  const [formCalcType, setFormCalcType] = useState<UnitCalculationType>('SIMPLES');
  const [formDecimalPlaces, setFormDecimalPlaces] = useState<number>(0);
  const [formConversionFactor, setFormConversionFactor] = useState<number>(1);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState('');
  const [formScope, setFormScope] = useState<'global' | 'company'>('company');
  const [errorMessage, setErrorMessage] = useState('');

  // Interactive Simulator State
  const [simUnitId, setSimUnitId] = useState<string>(units[0]?.id || 'uom-m2');
  const [simLength, setSimLength] = useState<number>(2.5);
  const [simWidth, setSimWidth] = useState<number>(4.0);
  const [simHeight, setSimHeight] = useState<number>(1.2);
  const [simPieces, setSimPieces] = useState<number>(1);
  const [simUnitPrice, setSimUnitPrice] = useState<number>(85.0);

  // Permissions check - strictly respect effective permissions
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'qa';
  const canManage = Boolean(currentUser.permissions?.accessUnitsOfMeasure);
  const canCreate = Boolean(currentUser.permissions?.unitsOfMeasureCreate);
  const canEdit = Boolean(currentUser.permissions?.unitsOfMeasureEdit);
  const canToggleActive = Boolean(currentUser.permissions?.unitsOfMeasureToggleActive);

  // Filtered list
  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      // Search matches name or acronym
      const matchesSearch =
        !searchTerm.trim() ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.notes && u.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const matchesCategory = categoryFilter === 'all' || u.category === categoryFilter;

      // Calculation Type filter
      const matchesCalc = calcTypeFilter === 'all' || u.calculationType === calcTypeFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.active) ||
        (statusFilter === 'inactive' && !u.active);

      return matchesSearch && matchesCategory && matchesCalc && matchesStatus;
    });
  }, [units, searchTerm, categoryFilter, calcTypeFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = units.length;
    const active = units.filter(u => u.active).length;
    const dimensional = units.filter(u => u.calculationType !== 'SIMPLES').length;
    const custom = units.filter(u => !u.isGlobal).length;
    return { total, active, dimensional, custom };
  }, [units]);

  // Open Modal for New Unit
  const handleOpenNew = () => {
    setEditingUnit(null);
    setFormName('');
    setFormAcronym('');
    setFormCategory('QUANTIDADE');
    setFormCalcType('SIMPLES');
    setFormDecimalPlaces(0);
    setFormConversionFactor(1);
    setFormActive(true);
    setFormNotes('');
    setFormScope(isAdmin ? 'global' : 'company');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (unit: UnitOfMeasure) => {
    setEditingUnit(unit);
    setFormName(unit.name);
    setFormAcronym(unit.acronym);
    setFormCategory(unit.category);
    setFormCalcType(unit.calculationType);
    setFormDecimalPlaces(unit.decimalPlaces ?? 0);
    setFormConversionFactor(unit.conversionFactor ?? 1);
    setFormActive(unit.active);
    setFormNotes(unit.notes || '');
    setFormScope(unit.isGlobal ? 'global' : 'company');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Auto-adjust default decimals and category when calculation type changes in form
  const handleCalcTypeChange = (newType: UnitCalculationType) => {
    setFormCalcType(newType);
    if (newType === 'AREA') {
      setFormCategory('AREA');
      if (formDecimalPlaces === 0) setFormDecimalPlaces(3);
    } else if (newType === 'VOLUME') {
      setFormCategory('VOLUME');
      if (formDecimalPlaces === 0) setFormDecimalPlaces(3);
    } else if (newType === 'LINEAR') {
      setFormCategory('COMPRIMENTO');
      if (formDecimalPlaces === 0) setFormDecimalPlaces(3);
    }
  };

  // Save Unit Handler
  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formName.trim();
    const cleanAcronym = formAcronym.trim().toUpperCase();

    if (!cleanName) {
      setErrorMessage('O nome da unidade de medida é obrigatório.');
      return;
    }
    if (!cleanAcronym) {
      setErrorMessage('A sigla / símbolo da unidade é obrigatória (ex: M², KG, UN).');
      return;
    }

    // Check duplicate acronym
    const duplicate = units.find(
      u => u.acronym.toUpperCase() === cleanAcronym && (!editingUnit || u.id !== editingUnit.id)
    );
    if (duplicate) {
      setErrorMessage(`Já existe uma unidade cadastrada com a sigla "${cleanAcronym}" (${duplicate.name}).`);
      return;
    }

    const isGlobal = formScope === 'global' && isAdmin;
    const nowIso = new Date().toISOString();

    let updatedList: UnitOfMeasure[];

    if (editingUnit) {
      updatedList = units.map(u =>
        u.id === editingUnit.id
          ? {
              ...u,
              name: cleanName,
              acronym: cleanAcronym,
              category: formCategory,
              calculationType: formCalcType,
              decimalPlaces: Math.max(0, Math.min(4, formDecimalPlaces)),
              conversionFactor: formConversionFactor > 0 ? formConversionFactor : 1,
              active: formActive,
              isGlobal: isGlobal,
              companyId: isGlobal ? undefined : (u.companyId || currentCompany.id),
              notes: formNotes.trim(),
              updatedAt: nowIso
            }
          : u
      );
    } else {
      const newUnit: UnitOfMeasure = {
        id: `uom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: cleanName,
        acronym: cleanAcronym,
        category: formCategory,
        calculationType: formCalcType,
        decimalPlaces: Math.max(0, Math.min(4, formDecimalPlaces)),
        conversionFactor: formConversionFactor > 0 ? formConversionFactor : 1,
        active: formActive,
        isGlobal: isGlobal,
        companyId: isGlobal ? undefined : currentCompany.id,
        notes: formNotes.trim(),
        createdAt: nowIso,
        updatedAt: nowIso
      };
      updatedList = [...units, newUnit];
    }

    onSaveUnitsOfMeasure(updatedList);

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'system',
        editingUnit ? 'Unidade de Medida Atualizada' : 'Nova Unidade de Medida Cadastrada',
        `Unidade "${cleanName}" (${cleanAcronym}) com cálculo ${formCalcType} e precisão de ${formDecimalPlaces} casas decimais.`,
        '',
        ''
      );
    }

    setIsModalOpen(false);
  };

  // Toggle Active Status
  const handleToggleActive = (unit: UnitOfMeasure) => {
    if (!canToggleActive) {
      alert('Você não tem permissão para alterar o status das unidades de medida.');
      return;
    }

    const updated = units.map(u => (u.id === unit.id ? { ...u, active: !u.active, updatedAt: new Date().toISOString() } : u));
    onSaveUnitsOfMeasure(updated);

    if (onAddHistoryLog) {
      onAddHistoryLog(
        'system',
        unit.active ? 'Unidade Desativada' : 'Unidade Ativada',
        `A unidade ${unit.name} (${unit.acronym}) foi ${unit.active ? 'desativada' : 'ativada'}.`,
        '',
        ''
      );
    }
  };

  // Simulator Active Unit
  const activeSimUnit = useMemo(() => {
    return units.find(u => u.id === simUnitId) || units[0];
  }, [units, simUnitId]);

  // Simulator Calculation Result
  const simResult = useMemo(() => {
    if (!activeSimUnit) {
      return {
        quantity: 0,
        displayText: '',
        formulaText: '',
        isValid: false
      };
    }

    return calculateItemQuantity({
      calculationType: activeSimUnit.calculationType,
      length: simLength,
      width: simWidth,
      height: simHeight,
      piecesCount: simPieces,
      quantity: simPieces,
      decimalPlaces: activeSimUnit.decimalPlaces
    });
  }, [activeSimUnit, simLength, simWidth, simHeight, simPieces]);

  const simTotalPrice = simResult.quantity * simUnitPrice;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Unidades de Medida</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Configuração global e dimensional de grandezas (Linear, Área, Volume e Massa) integradas ao catálogo, vendas e orçamentos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              id="btn-new-uom"
              onClick={handleOpenNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Unidade de Medida
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total de Unidades</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">Cadastradas no sistema</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Unidades Ativas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</p>
          <p className="text-xs text-slate-500 mt-1">Disponíveis para uso</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Cálculo Dimensional</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.dimensional}</p>
          <p className="text-xs text-slate-500 mt-1">Linear, Área e Volume</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Personalizadas</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{stats.custom}</p>
          <p className="text-xs text-slate-500 mt-1">Criadas pela empresa</p>
        </div>
      </div>

      {/* Main Grid: List & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Units Table (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input-search-uom"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, sigla ou descrição..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  id="select-filter-category"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="QUANTIDADE">Quantidade</option>
                  <option value="COMPRIMENTO">Comprimento Linear</option>
                  <option value="AREA">Área (M²)</option>
                  <option value="VOLUME">Volume (M³, Litros)</option>
                  <option value="MASSA">Massa (KG, G)</option>
                  <option value="TEMPO">Tempo (Horas)</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              {/* Calculation Type Filter */}
              <div>
                <select
                  id="select-filter-calctype"
                  value={calcTypeFilter}
                  onChange={e => setCalcTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                >
                  <option value="all">Todos os Cálculos</option>
                  <option value="SIMPLES">Cálculo Simples</option>
                  <option value="LINEAR">Linear (Comp.)</option>
                  <option value="AREA">Área (M²)</option>
                  <option value="VOLUME">Volume (M³)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Units Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Sigla</th>
                    <th className="py-3.5 px-4">Nome & Descrição</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4">Tipo de Cálculo</th>
                    <th className="py-3.5 px-4 text-center">Decimais</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <Ruler className="w-10 h-10 text-slate-300 mb-2" />
                          <p className="font-medium text-slate-700">Nenhuma unidade de medida encontrada</p>
                          <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou cadastre uma nova unidade.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map(unit => {
                      const catInfo = CATEGORY_LABELS[unit.category] || CATEGORY_LABELS.OUTROS;
                      const calcInfo = CALC_TYPE_LABELS[unit.calculationType] || CALC_TYPE_LABELS.SIMPLES;

                      return (
                        <tr
                          key={unit.id}
                          className={`hover:bg-slate-50/80 transition-colors ${!unit.active ? 'opacity-60 bg-slate-50/40' : ''}`}
                        >
                          {/* Sigla */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-slate-900 text-white shadow-2xs">
                              {unit.acronym}
                            </span>
                          </td>

                          {/* Nome & Escopo */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-900 flex items-center gap-1.5">
                              {unit.name}
                              {unit.isGlobal ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-md border border-blue-100" title="Unidade Padrão Global do Sistema">
                                  <Globe className="w-2.5 h-2.5" /> Padrão
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-600 rounded-md border border-purple-100" title="Unidade Personalizada da Empresa">
                                  <Building2 className="w-2.5 h-2.5" /> Empresa
                                </span>
                              )}
                            </div>
                            {unit.notes && (
                              <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{unit.notes}</p>
                            )}
                          </td>

                          {/* Categoria */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>

                          {/* Tipo de Cálculo */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${calcInfo.badgeColor}`}>
                              {calcInfo.label}
                            </span>
                          </td>

                          {/* Decimais */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {unit.decimalPlaces} {unit.decimalPlaces === 1 ? 'casa' : 'casas'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleActive(unit)}
                              disabled={!canToggleActive}
                              title={unit.active ? 'Clique para desativar' : 'Clique para ativar'}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                unit.active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {unit.active ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Ativa
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                  Inativa
                                </>
                              )}
                            </button>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSimUnitId(unit.id);
                                }}
                                title="Testar no Simulador"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleOpenEdit(unit)}
                                  title="Editar Unidade"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Dimensional Calculator & Documentation */}
        <div className="space-y-6">
          {/* Dimensional Calculation Simulator Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Simulador de Cálculo</h2>
                  <p className="text-xs text-slate-500">Valide a fórmula em tempo real</p>
                </div>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                {activeSimUnit?.acronym}
              </span>
            </div>

            {/* Select Unit to Simulate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Unidade de Medida Selecionada</label>
              <select
                id="select-sim-unit"
                value={simUnitId}
                onChange={e => setSimUnitId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
              >
                {units.filter(u => u.active).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.acronym} — {u.name} ({u.calculationType})
                  </option>
                ))}
              </select>
            </div>

            {/* Inputs by Calculation Type */}
            {activeSimUnit?.calculationType === 'LINEAR' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Comprimento (M)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={simLength}
                    onChange={e => setSimLength(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Multiplicador (Peças)</label>
                  <input
                    type="number"
                    min="1"
                    value={simPieces}
                    onChange={e => setSimPieces(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {activeSimUnit?.calculationType === 'AREA' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Comprimento (M)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={simLength}
                      onChange={e => setSimLength(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Largura (M)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={simWidth}
                      onChange={e => setSimWidth(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Quantidade de Peças / Peças Iguais</label>
                  <input
                    type="number"
                    min="1"
                    value={simPieces}
                    onChange={e => setSimPieces(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {activeSimUnit?.calculationType === 'VOLUME' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Comp. (M)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={simLength}
                      onChange={e => setSimLength(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Larg. (M)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={simWidth}
                      onChange={e => setSimWidth(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Alt. (M)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={simHeight}
                      onChange={e => setSimHeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Quantidade de Peças / Volumes</label>
                  <input
                    type="number"
                    min="1"
                    value={simPieces}
                    onChange={e => setSimPieces(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {activeSimUnit?.calculationType === 'SIMPLES' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Quantidade</label>
                <input
                  type="number"
                  step={activeSimUnit.decimalPlaces > 0 ? '0.001' : '1'}
                  min="0"
                  value={simPieces}
                  onChange={e => setSimPieces(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Unit Price input for simulation */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Preço Unitário (R$ por {activeSimUnit?.acronym})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={simUnitPrice}
                onChange={e => setSimUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Live Result Box */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Quantidade Faturada Real</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  {formatQuantityLocale(simResult.quantity, activeSimUnit?.decimalPlaces || 3)} {activeSimUnit?.acronym}
                </p>
                <p className="text-xs text-slate-300 mt-1 font-mono">{simResult.formulaText}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Faturado:</span>
                <span className="text-base font-bold text-white">
                  R$ {simTotalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Business & Calculation Guide Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 p-5 rounded-2xl border border-indigo-100 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-indigo-900 font-bold">
              <Info className="w-4 h-4 text-indigo-600" />
              Diretrizes de Cálculo por Segmento
            </div>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-700">•</span>
                <span><strong>Comércio & Auto Peças:</strong> Suporta venda de cabos por metro (LINEAR), tecidos, mangueiras, perfis metálicos, vidros (ÁREA) e líquidos/lubrificantes a granel (VOLUME).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-700">•</span>
                <span><strong>Oficinas & Serviços:</strong> Cálculo exato de fluidos fracionados (ex: 4,500 L de óleo) e tempo de mão de obra (HORAS).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-700">•</span>
                <span><strong>Preservação de Histórico:</strong> Ao alterar a unidade, orçamentos e vendas anteriores permanecem imutáveis com o snapshot gravado na transação.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Criação / Edição de Unidade */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingUnit ? 'Editar Unidade de Medida' : 'Nova Unidade de Medida'}
                  </h3>
                  <p className="text-xs text-slate-500">Defina as propriedades de cálculo e grandeza</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveUnit} className="space-y-4">
              {/* Sigla e Nome */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sigla / Símbolo *</label>
                  <input
                    type="text"
                    id="input-uom-acronym"
                    value={formAcronym}
                    onChange={e => setFormAcronym(e.target.value.toUpperCase())}
                    placeholder="Ex: M²"
                    maxLength={6}
                    required
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nome da Unidade *</label>
                  <input
                    type="text"
                    id="input-uom-name"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ex: Metro Quadrado"
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Tipo de Cálculo & Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tipo de Cálculo Dimensional *</label>
                  <select
                    id="select-uom-calctype"
                    value={formCalcType}
                    onChange={e => handleCalcTypeChange(e.target.value as UnitCalculationType)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="SIMPLES">Simples (Qtd × Preço)</option>
                    <option value="LINEAR">Linear (Comprimento)</option>
                    <option value="AREA">Área (Comp. × Larg.)</option>
                    <option value="VOLUME">Volume (Comp. × Larg. × Alt.)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Categoria de Grandeza *</label>
                  <select
                    id="select-uom-category"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as UnitCategory)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="QUANTIDADE">Quantidade / Peças</option>
                    <option value="COMPRIMENTO">Comprimento Linear</option>
                    <option value="AREA">Área / Superfície</option>
                    <option value="VOLUME">Volume / Líquidos</option>
                    <option value="MASSA">Massa / Peso</option>
                    <option value="TEMPO">Tempo / Horas</option>
                    <option value="OUTROS">Outros / Especiais</option>
                  </select>
                </div>
              </div>

              {/* Casas Decimais e Fator de Conversão */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Casas Decimais (Precisão)</label>
                  <select
                    id="select-uom-decimals"
                    value={formDecimalPlaces}
                    onChange={e => setFormDecimalPlaces(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value={0}>0 casas (Inteiro - ex: 1 UN)</option>
                    <option value={1}>1 casa (ex: 1,5 MM)</option>
                    <option value={2}>2 casas (ex: 1,50 M)</option>
                    <option value={3}>3 casas (ex: 1,250 KG ou M²)</option>
                    <option value={4}>4 casas (Alta precisão)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Fator de Conversão (Base)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    id="input-uom-factor"
                    value={formConversionFactor}
                    onChange={e => setFormConversionFactor(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Scope (Global vs Company) for Admins */}
              {isAdmin && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Escopo da Unidade</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormScope('company')}
                      className={`p-2 rounded-lg border text-xs font-medium text-left flex items-center gap-2 ${
                        formScope === 'company'
                          ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Empresa Atual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormScope('global')}
                      className={`p-2 rounded-lg border text-xs font-medium text-left flex items-center gap-2 ${
                        formScope === 'global'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Global (Todas as Empresas)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Observações / Descrição */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Observações & Instruções de Uso</label>
                <textarea
                  id="textarea-uom-notes"
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ex: Utilizada para cálculo de chapas, vidros e insulfilm por metro quadrado."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Status Ativo */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="checkbox-uom-active"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="checkbox-uom-active" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Unidade Ativa (disponível para seleção no catálogo de produtos e vendas)
                </label>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-uom"
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors"
                >
                  {editingUnit ? 'Salvar Alterações' : 'Cadastrar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsOfMeasureView;
