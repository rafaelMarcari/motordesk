/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, AlertCircle, CheckCircle, X, Wrench, Calendar, Clock, RotateCcw, Droplet, Disc, Sparkles, FileCode } from 'lucide-react';
import { Service, MaintenanceCategory, ServiceMaintenanceControl } from '../types';
import { AppDatabase } from '../data/mockData';

interface ServicesViewProps {
  db: AppDatabase;
  onSaveServices: (services: Service[]) => void;
  onAddHistoryLog?: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

export default function ServicesView({ db, onSaveServices, onAddHistoryLog, setUnsavedTask }: ServicesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Geral');
  const [standardHours, setStandardHours] = useState<number>(1.0);
  const [price, setPrice] = useState<number>(0);

  // Fiscal Fields for Municipal Service (NFS-e / LC 116 / ISS)
  const [municipalServiceCode, setMunicipalServiceCode] = useState('14.01');
  const [cnaeCode, setCnaeCode] = useState('4520-0/01');
  const [issRatePercent, setIssRatePercent] = useState<number>(2.0);
  const [retentionIss, setRetentionIss] = useState<boolean>(false);
  const [retentionInss, setRetentionInss] = useState<boolean>(false);
  const [issCst, setIssCst] = useState<string>('0');

  // Periodic Maintenance Control Fields
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [maintCategory, setMaintCategory] = useState<MaintenanceCategory>('oil_change');
  const [defaultIntervalKm, setDefaultIntervalKm] = useState<number>(10000);
  const [defaultIntervalDays, setDefaultIntervalDays] = useState<number>(180);
  const [specificationsLabel, setSpecificationsLabel] = useState('');
  const [recommendedInstructions, setRecommendedInstructions] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isFormDirty = name.trim() !== '' || standardHours !== 1.0 || price !== 0 || isPeriodic;

  const resetForm = () => {
    setName('');
    setCategory('Geral');
    setStandardHours(1.0);
    setPrice(0);
    setMunicipalServiceCode('14.01');
    setCnaeCode('4520-0/01');
    setIssRatePercent(2.0);
    setRetentionIss(false);
    setRetentionInss(false);
    setIssCst('0');
    setIsPeriodic(false);
    setMaintCategory('oil_change');
    setDefaultIntervalKm(10000);
    setDefaultIntervalDays(180);
    setSpecificationsLabel('');
    setRecommendedInstructions('');
    setErrorMsg('');
    setEditingService(null);
    setIsFormOpen(false);
    setUnsavedTask(null);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setCategory(service.category || 'Geral');
    setStandardHours(service.standardHours);
    setPrice(service.price);
    setMunicipalServiceCode(service.municipalServiceCode || '14.01');
    setCnaeCode(service.cnaeCode || '4520-0/01');
    setIssRatePercent(service.issRatePercent ?? 2.0);
    setRetentionIss(service.retentionIss || false);
    setRetentionInss(service.retentionInss || false);
    setIssCst(service.issCst || '0');
    
    const isSrvPeriodic = service.isPeriodic || service.maintenanceControl?.enabled || false;
    setIsPeriodic(isSrvPeriodic);
    
    if (service.maintenanceControl) {
      setMaintCategory(service.maintenanceControl.category || 'oil_change');
      setDefaultIntervalKm(service.maintenanceControl.defaultIntervalKm || 10000);
      setDefaultIntervalDays(service.maintenanceControl.defaultIntervalDays || 180);
      setSpecificationsLabel(service.maintenanceControl.specificationsLabel || '');
      setRecommendedInstructions(service.maintenanceControl.recommendedInstructions || '');
    } else {
      setMaintCategory('oil_change');
      setDefaultIntervalKm(10000);
      setDefaultIntervalDays(180);
      setSpecificationsLabel('');
      setRecommendedInstructions('');
    }

    setErrorMsg('');
    setIsFormOpen(true);
  };

  const executeSave = () => {
    if (!name.trim() || standardHours <= 0 || price < 0) {
      return { success: false, message: 'Todos os campos com * são obrigatórios.' };
    }

    const maintControl: ServiceMaintenanceControl | undefined = isPeriodic ? {
      enabled: true,
      category: maintCategory,
      defaultIntervalKm: Number(defaultIntervalKm) || 10000,
      defaultIntervalDays: Number(defaultIntervalDays) || 180,
      specificationsLabel: specificationsLabel.trim() || undefined,
      recommendedInstructions: recommendedInstructions.trim() || undefined
    } : undefined;

    let updatedServicesList: Service[] = [];
    if (editingService) {
      updatedServicesList = db.services.map(s => 
        s.id === editingService.id 
          ? { 
              ...s, 
              name, 
              category, 
              standardHours, 
              price,
              municipalServiceCode: municipalServiceCode.trim() || undefined,
              cnaeCode: cnaeCode.trim() || undefined,
              issRatePercent: Number(issRatePercent) || 0,
              retentionIss,
              retentionInss,
              issCst,
              isPeriodic,
              maintenanceControl: maintControl
            } 
          : s
      );
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'user_activity',
          'Serviço Alterado',
          `Alterou dados do serviço "${name}" (Cód. Municipal: ${municipalServiceCode}). Periódico: ${isPeriodic ? 'Sim' : 'Não'}. Valor: R$ ${price.toFixed(2)}.`,
          '',
          ''
        );
      }
    } else {
      const newService: Service = {
        id: `srv-${Date.now()}`,
        name,
        category,
        standardHours,
        price,
        municipalServiceCode: municipalServiceCode.trim() || undefined,
        cnaeCode: cnaeCode.trim() || undefined,
        issRatePercent: Number(issRatePercent) || 0,
        retentionIss,
        retentionInss,
        issCst,
        isPeriodic,
        maintenanceControl: maintControl
      };
      updatedServicesList = [...db.services, newService];
      if (onAddHistoryLog) {
        onAddHistoryLog(
          'user_activity',
          'Serviço Cadastrado',
          `Cadastrou novo serviço: "${name}" (${isPeriodic ? 'Controle Periódico Ativo' : 'Padrão'}). Preço: R$ ${price.toFixed(2)}.`,
          '',
          ''
        );
      }
    }

    onSaveServices(updatedServicesList);
    return { success: true, list: updatedServicesList };
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = executeSave();
    if (!res.success) {
      setErrorMsg(res.message || '');
      return;
    }
    setSuccessMsg(editingService ? 'Serviço de mão de obra atualizado!' : 'Serviço de mão de obra cadastrado!');
    setTimeout(() => setSuccessMsg(''), 3000);
    resetForm();
  };

  useEffect(() => {
    if (isFormOpen && isFormDirty) {
      setUnsavedTask({
        type: 'os',
        saveCallback: () => { executeSave(); },
        discardCallback: () => { resetForm(); }
      });
    } else {
      setUnsavedTask(null);
    }
  }, [isFormOpen, name, category, standardHours, price, isPeriodic, maintCategory, defaultIntervalKm, defaultIntervalDays]);

  const filteredServices = db.services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in" id="services-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Tabela de Serviços & Controle Periódico</h1>
          <p className="text-sm text-slate-500">Definição dos serviços padronizados, tempos técnicos e controle de trocas periódicas (Óleo, Pneus, Balanceamento, etc.).</p>
        </div>
        {!isFormOpen && (
          <button 
            id="btn-add-service"
            onClick={openNewForm} 
            className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Serviço
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="services-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md animate-slide-up" id="service-form-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-semibold text-slate-800 font-display text-base flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              {editingService ? `Editar Serviço: ${editingService.name}` : 'Cadastrar Novo Serviço'}
            </h3>
            <button 
              id="btn-close-service-form"
              onClick={resetForm} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div id="services-error-alert" className="mb-4 p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4" id="form-service">
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="service-name-input">Nome do Serviço *</label>
              <input 
                id="service-name-input"
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Troca de Óleo e Filtro de Motor, Alinhamento 3D" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="service-category-input">Categoria do Serviço</label>
              <input 
                id="service-category-input"
                type="text" 
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Ex: Troca de Óleo, Pneus e Rodas, Freios" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="service-hours-input">Tempo Técnico Padrão * (Horas)</label>
              <input 
                id="service-hours-input"
                type="number" 
                value={standardHours}
                onChange={e => setStandardHours(Number(e.target.value))}
                min="0.1"
                step="0.1"
                placeholder="1.0"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="service-price-input">Valor Padrão de Mão de Obra * (R$)</label>
              <input 
                id="service-price-input"
                type="number" 
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                min="0"
                step="5"
                placeholder="0.00"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
                required
              />
            </div>

            {/* SEÇÃO FISCAL DE SERVIÇOS (NFS-e / ISSQN / LC 116) */}
            <div className="col-span-1 md:col-span-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-4 my-1" id="service-fiscal-section">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 font-display">
                    <FileCode className="w-4 h-4 text-emerald-600" />
                    Informações Fiscais do Serviço (NFS-e Municipal / ISSQN / LC 116)
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Configurações tributárias para emissão da Nota Fiscal de Serviço Eletrônica conforme exigências da contabilidade.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700" htmlFor="srv-municipal-code">Item LC 116 / Cód. Municipal *</label>
                  <input
                    id="srv-municipal-code"
                    type="text"
                    value={municipalServiceCode}
                    onChange={e => setMunicipalServiceCode(e.target.value)}
                    placeholder="Ex: 14.01 (Lubrificação e Revisão)"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700" htmlFor="srv-cnae-code">CNAE Específico</label>
                  <input
                    id="srv-cnae-code"
                    type="text"
                    value={cnaeCode}
                    onChange={e => setCnaeCode(e.target.value)}
                    placeholder="Ex: 4520-0/01"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700" htmlFor="srv-iss-rate">Alíquota ISS (%)</label>
                  <input
                    id="srv-iss-rate"
                    type="number"
                    value={issRatePercent}
                    onChange={e => setIssRatePercent(Number(e.target.value))}
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="2.0"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700" htmlFor="srv-iss-cst">Exigibilidade / CST ISS</label>
                  <select
                    id="srv-iss-cst"
                    value={issCst}
                    onChange={e => setIssCst(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium"
                  >
                    <option value="0">0 - Exigível / Tributado no Município</option>
                    <option value="1">1 - Isenção de ISS</option>
                    <option value="2">2 - Imune / Não Tributável</option>
                    <option value="3">3 - Suspenso por Decisão Judicial</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer" htmlFor="chk-retention-iss">
                  <input
                    id="chk-retention-iss"
                    type="checkbox"
                    checked={retentionIss}
                    onChange={e => setRetentionIss(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700">Retenção de ISS pelo Tomador</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer" htmlFor="chk-retention-inss">
                  <input
                    id="chk-retention-inss"
                    type="checkbox"
                    checked={retentionInss}
                    onChange={e => setRetentionInss(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700">Retenção de INSS na Mão de Obra</span>
                </label>
              </div>
            </div>

            {/* SEÇÃO: CONTROLE DE MANUTENÇÃO PERIÓDICA E PRÓXIMA TROCA */}
            <div className="col-span-1 md:col-span-3 bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-4 my-2" id="periodic-maintenance-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950 font-display">
                      Controle de Manutenção Periódica & Próxima Troca
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Marque esta opção para serviços que exigem controle preventivo (Óleo, Pneus, Alinhamento, Balanceamento, Filtros).
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer" htmlFor="toggle-periodic-service">
                  <input
                    id="toggle-periodic-service"
                    type="checkbox"
                    checked={isPeriodic}
                    onChange={e => {
                      setIsPeriodic(e.target.checked);
                      if (e.target.checked && name.toLowerCase().includes('pneu')) {
                        setMaintCategory('tire_change');
                        setDefaultIntervalKm(40000);
                        setDefaultIntervalDays(365);
                        setSpecificationsLabel('Medida e Marca dos Pneus (Ex: 205/55 R16 Pirelli)');
                      } else if (e.target.checked && (name.toLowerCase().includes('alinh') || name.toLowerCase().includes('balan'))) {
                        setMaintCategory('tire_alignment_balance');
                        setDefaultIntervalKm(10000);
                        setDefaultIntervalDays(180);
                        setSpecificationsLabel('Geometria do Alinhamento e Calibragem');
                      } else if (e.target.checked) {
                        setMaintCategory('oil_change');
                        setDefaultIntervalKm(10000);
                        setDefaultIntervalDays(180);
                        setSpecificationsLabel('Viscosidade do Óleo (Ex: 5W30 Sintético)');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-xs font-bold text-indigo-900">
                    {isPeriodic ? 'Serviço Periódico Ativo' : 'Não Periódico'}
                  </span>
                </label>
              </div>

              {isPeriodic && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-indigo-100 animate-fade-in">
                  <div className="space-y-1 col-span-1 sm:col-span-2 md:col-span-1">
                    <label className="text-[11px] font-bold text-slate-700 block" htmlFor="maint-category-select">
                      Tipo de Manutenção *
                    </label>
                    <select
                      id="maint-category-select"
                      value={maintCategory}
                      onChange={e => {
                        const cat = e.target.value as MaintenanceCategory;
                        setMaintCategory(cat);
                        if (cat === 'oil_change') {
                          setDefaultIntervalKm(10000);
                          setDefaultIntervalDays(180);
                          setSpecificationsLabel('Viscosidade do Óleo (Ex: 5W30 Sintético Mobil)');
                        } else if (cat === 'tire_change') {
                          setDefaultIntervalKm(40000);
                          setDefaultIntervalDays(365);
                          setSpecificationsLabel('Medida, Marca e Modelo (Ex: 205/55 R16)');
                        } else if (cat === 'tire_alignment_balance') {
                          setDefaultIntervalKm(10000);
                          setDefaultIntervalDays(180);
                          setSpecificationsLabel('Parâmetros de Geometria e Calibragem');
                        } else if (cat === 'general_maintenance') {
                          setDefaultIntervalKm(20000);
                          setDefaultIntervalDays(365);
                          setSpecificationsLabel('Especificação do Componente ou Correia');
                        }
                      }}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    >
                      <option value="oil_change">🛢️ Troca de Óleo e Filtros</option>
                      <option value="tire_change">🚗 Troca e Montagem de Pneus</option>
                      <option value="tire_alignment_balance">⚖️ Alinhamento e Balanceamento</option>
                      <option value="general_maintenance">🔧 Correia / Revisão Periódica</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block" htmlFor="interval-km-input">
                      Intervalo de KM (Próxima Troca) *
                    </label>
                    <input
                      id="interval-km-input"
                      type="number"
                      step="1000"
                      min="500"
                      value={defaultIntervalKm}
                      onChange={e => setDefaultIntervalKm(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block" htmlFor="interval-days-input">
                      Intervalo em Dias (Tempo) *
                    </label>
                    <input
                      id="interval-days-input"
                      type="number"
                      step="30"
                      min="30"
                      value={defaultIntervalDays}
                      onChange={e => setDefaultIntervalDays(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      ~{Math.round(defaultIntervalDays / 30)} meses
                    </span>
                  </div>

                  <div className="space-y-1 col-span-1 sm:col-span-2 md:col-span-1">
                    <label className="text-[11px] font-bold text-slate-700 block" htmlFor="specs-label-input">
                      Rótulo da Especificação Técnica
                    </label>
                    <input
                      id="specs-label-input"
                      type="text"
                      value={specificationsLabel}
                      onChange={e => setSpecificationsLabel(e.target.value)}
                      placeholder="Ex: Viscosidade 5W30 ou Medida Pneu"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1 col-span-1 sm:col-span-2 md:col-span-4">
                    <label className="text-[11px] font-bold text-slate-700 block" htmlFor="instructions-textarea">
                      Instruções Recomendadas e Checklist Técnico do Serviço
                    </label>
                    <input
                      id="instructions-textarea"
                      type="text"
                      value={recommendedInstructions}
                      onChange={e => setRecommendedInstructions(e.target.value)}
                      placeholder="Ex: Verificar anel de vedação do cárter, pressão de ar dos pneus e torque dos parafusos..."
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3 col-span-1 md:col-span-3">
              <button 
                id="btn-save-service"
                type="submit" 
                className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-xs cursor-pointer"
              >
                {editingService ? 'Salvar Alterações' : 'Salvar Serviço'}
              </button>
              <button 
                id="btn-cancel-service"
                type="button" 
                onClick={resetForm} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold px-5 py-2.5 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services Table */}
      {!isFormOpen && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="services-list-panel">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="service-search-input"
                type="text" 
                placeholder="Buscar por nome de serviço de mão de obra ou categoria..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total: <strong>{filteredServices.length}</strong> serviços cadastrados
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="services-table">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                  <th className="p-4">Serviço & Categoria</th>
                  <th className="p-4">Controle de Manutenção Periódica</th>
                  <th className="p-4">Tempo Est.</th>
                  <th className="p-4">Valor Mão de Obra</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredServices.map(service => {
                  const isSrvPeriodic = service.isPeriodic || service.maintenanceControl?.enabled;
                  const mc = service.maintenanceControl;

                  return (
                    <tr key={service.id} className="hover:bg-slate-50/50 transition duration-150" id={`service-row-${service.id}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border ${
                            isSrvPeriodic 
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                              : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            <Wrench className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{service.name}</p>
                            {service.category && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                {service.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {isSrvPeriodic && mc ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              {mc.category === 'oil_change' && '🛢️ Troca de Óleo e Filtros'}
                              {mc.category === 'tire_change' && '🚗 Troca de Pneus'}
                              {mc.category === 'tire_alignment_balance' && '⚖️ Alinhamento / Balanceamento'}
                              {mc.category === 'general_maintenance' && '🔧 Revisão Periódica'}
                            </span>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Próxima troca a cada <strong>{mc.defaultIntervalKm.toLocaleString()} KM</strong> ou <strong>{mc.defaultIntervalDays} dias</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Serviço eventual / Sem periodicidade</span>
                        )}
                      </td>

                      <td className="p-4 font-mono text-xs text-slate-600">{service.standardHours} h</td>

                      <td className="p-4 font-bold text-slate-800">
                        R$ {service.price.toFixed(2)}
                      </td>

                      <td className="p-4 text-right">
                        <button 
                          id={`btn-edit-service-${service.id}`}
                          onClick={() => openEditForm(service)} 
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

