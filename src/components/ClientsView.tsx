/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Client } from '../types';
import { AppDatabase } from '../data/mockData';
import PrivacyLgpdModal, { PrivacyLgpdFooter } from './PrivacyLgpdModal';

interface ClientsViewProps {
  db: AppDatabase;
  onSaveClients: (clients: Client[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  // Unsaved changes hooks
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

export default function ClientsView({ db, onSaveClients, onAddHistoryLog, setUnsavedTask }: ClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [maxCreditLimit, setMaxCreditLimit] = useState<string>('3000');
  const [paymentModeOverride, setPaymentModeOverride] = useState<'DEFAULT' | 'AFTER_COMPLETION' | 'ADVANCE_DEPOSIT' | 'FULL_ADVANCE'>('DEFAULT');
  const [depositPercentageOverride, setDepositPercentageOverride] = useState<string>('30');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasAcceptedLgpd, setHasAcceptedLgpd] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Auto-detecção inteligente: contagem de dígitos numéricos do documento
  const cpfDigits = cpf.replace(/\D/g, '');
  const isJuridica = cpfDigits.length > 11; // 12 a 14 dígitos = Pessoa Jurídica (CNPJ)
  const isFisica = cpfDigits.length > 0 && cpfDigits.length <= 11; // 1 a 11 dígitos = Pessoa Física (CPF)

  // Auto-format CPF (999.999.999-99) ou CNPJ (99.999.999/9999-99)
  const formatCpfCnpj = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 14);
    if (raw.length <= 11) {
      if (raw.length <= 3) return raw;
      if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
      if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
      return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
    }
    if (raw.length <= 12) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`;
  };

  // Auto-format Phone ((99) 99999-9999)
  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpfCnpj(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  // Check if form is dirty (unsaved changes)
  const isFormDirty = name.trim() !== '' || cpf.trim() !== '' || rg.trim() !== '' || stateRegistration.trim() !== '' || email.trim() !== '' || phone.trim() !== '' || address.trim() !== '';

  const resetForm = () => {
    setName('');
    setCpf('');
    setRg('');
    setStateRegistration('');
    setEmail('');
    setPhone('');
    setAddress('');
    setMaxCreditLimit('3000');
    setPaymentModeOverride('DEFAULT');
    setDepositPercentageOverride('30');
    setErrorMsg('');
    setEditingClient(null);
    setIsFormOpen(false);
    setUnsavedTask(null);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCpf(client.cpfCnpj || client.cpf || '');
    setRg(client.rg || '');
    setStateRegistration(client.stateRegistration || client.ie || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setMaxCreditLimit(client.maxCreditLimit !== undefined ? String(client.maxCreditLimit) : '3000');
    setPaymentModeOverride(client.paymentModeOverride || 'DEFAULT');
    setDepositPercentageOverride(client.depositPercentageOverride !== undefined ? String(client.depositPercentageOverride) : '30');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // Core save client action (used both normally and by the conditional logout dialog)
  const executeSave = (customData?: { 
    name: string; 
    cpf: string; 
    rg?: string;
    stateRegistration?: string;
    email: string; 
    phone: string; 
    address: string; 
    maxCreditLimit?: string; 
    editingClient: Client | null 
  }) => {
    const activeName = customData ? customData.name : name;
    const activeCpf = customData ? customData.cpf : cpf;
    const activeRg = customData?.rg !== undefined ? customData.rg : rg;
    const activeStateRegistration = customData?.stateRegistration !== undefined ? customData.stateRegistration : stateRegistration;
    const activeEmail = customData ? customData.email : email;
    const activePhone = customData ? customData.phone : phone;
    const activeAddress = customData ? customData.address : address;
    const activeLimitNum = parseFloat(customData?.maxCreditLimit || maxCreditLimit) || 0;
    const activeEditingClient = customData ? customData.editingClient : editingClient;

    if (!activeName.trim() || !activeCpf.trim()) {
      return { success: false, message: 'Nome e CPF/CNPJ são campos obrigatórios.' };
    }

    const digitsOnly = activeCpf.replace(/\D/g, '');
    if (digitsOnly.length !== 11 && digitsOnly.length !== 14) {
      return { success: false, message: 'CPF/CNPJ inválido ou incompleto (deve conter 11 dígitos para CPF ou 14 dígitos para CNPJ).' };
    }

    const isJuridicaMode = digitsOnly.length > 11;
    const cleanRg = isJuridicaMode ? '' : activeRg.trim();
    const cleanIe = isJuridicaMode ? activeStateRegistration.trim() : '';

    // RN001: CPF/CNPJ único check
    const docExists = db.clients.some(c => {
      if (activeEditingClient && c.id === activeEditingClient.id) return false;
      const cDigits = (c.cpfCnpj || c.cpf || '').replace(/\D/g, '');
      return cDigits === digitsOnly;
    });

    if (docExists) {
      return { success: false, message: 'Regra de Negócio Violada (RN001): Já existe um cliente cadastrado com este CPF/CNPJ.' };
    }

    if (!hasAcceptedLgpd) {
      return { success: false, message: 'É necessário aceitar o Termo de Privacidade e LGPD para prosseguir com o cadastro do cliente.' };
    }

    const activeDepositPct = Number(depositPercentageOverride) || 30;
    let updatedClientsList: Client[] = [];

    if (activeEditingClient) {
      // Edit Client
      console.log(`[TRACE-PERSISTENCE] CLIENT EDIT: id=${activeEditingClient.id}, name=${activeName}, cpfCnpj=${activeCpf}, rg=${cleanRg}, ie=${cleanIe}`);
      updatedClientsList = db.clients.map(c => 
        c.id === activeEditingClient.id 
          ? { 
              ...c, 
              name: activeName, 
              cpf: activeCpf, 
              cpfCnpj: activeCpf,
              rg: cleanRg,
              stateRegistration: cleanIe,
              ie: cleanIe,
              clientType: isJuridicaMode ? 'JURIDICA' : 'FISICA',
              email: activeEmail, 
              phone: activePhone, 
              address: activeAddress, 
              maxCreditLimit: activeLimitNum,
              paymentModeOverride,
              depositPercentageOverride: activeDepositPct
            } 
          : c
      );
      onSaveClients(updatedClientsList);
      onAddHistoryLog('user_activity', 'Cliente Editado', `Dados cadastrais e política de pagamento do cliente ${activeName} (${isJuridicaMode ? 'Pessoa Jurídica' : 'Pessoa Física'}) atualizados no sistema.`, activeEditingClient.id, '');
    } else {
      // Create Client
      const newClient: Client = {
        id: `cli-${Date.now()}`,
        name: activeName,
        cpf: activeCpf,
        cpfCnpj: activeCpf,
        rg: cleanRg,
        stateRegistration: cleanIe,
        ie: cleanIe,
        clientType: isJuridicaMode ? 'JURIDICA' : 'FISICA',
        email: activeEmail,
        phone: activePhone,
        address: activeAddress,
        maxCreditLimit: activeLimitNum,
        currentDebt: 0,
        paymentModeOverride,
        depositPercentageOverride: activeDepositPct,
        createdAt: new Date().toISOString()
      };
      updatedClientsList = [...db.clients, newClient];
      const empresas = (db.registeredCompanies || []).length || 1;
      const usuarios = (db.users || []).length;
      const clientes = updatedClientsList.length;
      const veiculos = (db.vehicles || []).length;
      const pecas = (db.parts || []).length;
      const companyId = db.companyInfo?.id || 'comp-1';
      console.log(`[TRACE-PERSISTENCE] CLIENT CREATE\nid=${newClient.id}\nname=${newClient.name}\ncpf=${newClient.cpf}\nrg=${cleanRg}\nie=${cleanIe}\ncompanyId=${companyId}\nempresas=${empresas}\nusuários=${usuarios}\nclientes=${clientes}\nveículos=${veiculos}\npeças=${pecas}\nupdatedAt=${newClient.createdAt}`);
      onSaveClients(updatedClientsList);
      onAddHistoryLog('user_activity', 'Cliente Cadastrado', `Cliente ${activeName} (${isJuridicaMode ? `PJ - CNPJ: ${activeCpf}${cleanIe ? ` / IE: ${cleanIe}` : ''}` : `PF - CPF: ${activeCpf}${cleanRg ? ` / RG: ${cleanRg}` : ''}`}) cadastrado com sucesso e limite de crédito R$ ${activeLimitNum.toFixed(2)}.`, newClient.id, '');
    }

    return { success: true, list: updatedClientsList };
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = executeSave();
    if (!res.success) {
      setErrorMsg(res.message || '');
      return;
    }
    setSuccessMsg(editingClient ? 'Cadastro de cliente atualizado!' : 'Novo cliente cadastrado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
    resetForm();
  };

  // Handle reporting of unsaved changes to main layout
  useEffect(() => {
    if (isFormOpen && isFormDirty) {
      setUnsavedTask({
        type: 'client',
        saveCallback: () => {
          executeSave();
        },
        discardCallback: () => {
          resetForm();
        }
      });
    } else {
      setUnsavedTask(null);
    }
  }, [isFormOpen, isFormDirty, name, cpf, rg, stateRegistration, email, phone, address]);

  // Garantir isolamento estrito contra injeções externas de IE no formulário de clientes
  useEffect(() => {
    const rogues = document.querySelectorAll('#client-form-panel #group-comp-ie, #form-client #group-comp-ie, #form-client #new-comp-ie');
    rogues.forEach(el => {
      const grp = el.closest('#group-comp-ie');
      if (grp) grp.remove();
      else el.remove();
    });
  }, [isFormOpen, cpf]);

  // Filter clients
  const filteredClients = db.clients.filter(client => {
    const q = searchQuery.toLowerCase();
    const doc = (client.cpfCnpj || client.cpf || '').toLowerCase();
    const cleanDoc = doc.replace(/\D/g, '');
    const cleanQ = searchQuery.replace(/\D/g, '');
    return (
      client.name.toLowerCase().includes(q) ||
      doc.includes(q) ||
      (cleanQ.length > 0 && cleanDoc.includes(cleanQ)) ||
      (client.email && client.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" id="clients-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Gerenciamento de Clientes</h1>
          <p className="text-sm text-slate-500">Cadastro e edição de proprietários para ordens de serviço (RF001, RF002).</p>
        </div>
        {!isFormOpen && (
          <button 
            id="btn-add-client"
            onClick={openNewForm} 
            className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> Cadastrar Cliente
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="client-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Form Section */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md animate-slide-up" id="client-form-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-semibold text-slate-800 font-display text-base">
              {editingClient ? `Editar Cliente: ${editingClient.name}` : 'Novo Cadastro de Cliente'}
            </h3>
            <button 
              id="btn-close-client-form"
              onClick={resetForm} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div id="client-error-alert" className="mb-4 p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4" id="form-client">
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="client-name-input">
                {isJuridica ? 'Razão Social / Nome da Empresa *' : cpfDigits.length > 0 ? 'Nome Completo *' : 'Nome Completo ou Razão Social *'}
              </label>
              <input 
                id="client-name-input"
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isJuridica ? "Ex: Transportes Modelo Ltda" : cpfDigits.length > 0 ? "Ex: João da Silva" : "Ex: Nome Completo ou Razão Social"} 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600" htmlFor="client-cpf-input">
                  CPF/CNPJ * (RN001 - Único)
                </label>
                {cpfDigits.length === 0 ? (
                  <span id="badge-doc-detection-waiting" className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    Digite os números (PF ≤ 11 / PJ &gt; 11)
                  </span>
                ) : isJuridica ? (
                  <span id="badge-doc-detection-pj" className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                    🏢 Pessoa Jurídica ({cpfDigits.length}/14 dígitos)
                  </span>
                ) : (
                  <span id="badge-doc-detection-pf" className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    👤 Pessoa Física ({cpfDigits.length}/11 dígitos)
                  </span>
                )}
              </div>
              <input 
                id="client-cpf-input"
                type="text" 
                value={cpf}
                onChange={handleCpfChange}
                placeholder={isJuridica ? "00.000.000/0000-00 (CNPJ)" : cpfDigits.length > 0 ? "000.000.000-00 (CPF)" : "Digite CPF ou CNPJ"} 
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-hidden focus:ring-1 transition font-mono ${
                  isJuridica 
                    ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-500 bg-purple-50/15' 
                    : cpfDigits.length > 0 
                      ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-blue-50/15' 
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                required
              />
              <p className="text-[10px] text-slate-500">
                {isJuridica 
                  ? 'Detectado CNPJ (> 11 dígitos): Campo Inscrição Estadual (IE) liberado.' 
                  : cpfDigits.length > 0 
                    ? 'Detectado CPF (≤ 11 dígitos): Campo RG (Registro Geral) liberado.' 
                    : 'A quantidade de dígitos identifica se é Pessoa Física ou Jurídica e libera o campo correspondente.'}
              </p>
            </div>

            {/* Campo liberado dinamicamente: Inscrição Estadual (se PJ) ou RG (se PF) */}
            {isJuridica ? (
              <div className="space-y-1.5 animate-fade-in" id="container-client-ie">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-purple-900 flex items-center gap-1.5" htmlFor="client-ie-input">
                    <span>Inscrição Estadual (IE)</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-purple-100 text-purple-800 rounded border border-purple-200">
                      Liberado para Pessoa Jurídica
                    </span>
                  </label>
                </div>
                <input 
                  id="client-ie-input"
                  type="text" 
                  value={stateRegistration}
                  onChange={e => setStateRegistration(e.target.value.toUpperCase())}
                  placeholder="Ex: 123.456.789.111 ou ISENTO" 
                  className="w-full text-sm px-3 py-2 border border-purple-300 bg-purple-50/20 rounded-lg focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono uppercase"
                />
                <p className="text-[10px] text-purple-700">
                  Inscrição Estadual da empresa perante a SEFAZ para emissão fiscal
                </p>
              </div>
            ) : isFisica ? (
              <div className="space-y-1.5 animate-fade-in" id="container-client-rg">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-blue-900 flex items-center gap-1.5" htmlFor="client-rg-input">
                    <span>RG (Registro Geral)</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-blue-100 text-blue-800 rounded border border-blue-200">
                      Liberado para Pessoa Física
                    </span>
                  </label>
                </div>
                <input 
                  id="client-rg-input"
                  type="text" 
                  value={rg}
                  onChange={e => setRg(e.target.value.toUpperCase())}
                  placeholder="Ex: 12.345.678-9 ou SSP/SP" 
                  className="w-full text-sm px-3 py-2 border border-blue-300 bg-blue-50/20 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono uppercase"
                />
                <p className="text-[10px] text-blue-700">
                  Documento de identificação civil emitido por órgão de segurança pública
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 flex flex-col justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs" id="container-doc-waiting">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Documento de Identificação Civil
                </span>
                <p className="text-[11px] text-slate-500">
                  Inicie a digitação do CPF ou CNPJ ao lado para liberar automaticamente o campo de RG (Pessoa Física) ou Inscrição Estadual (Pessoa Jurídica).
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="client-phone-input">Telefone / WhatsApp</label>
              <input 
                id="client-phone-input"
                type="text" 
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="client-email-input">E-mail</label>
              <input 
                id="client-email-input"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="joao@exemplo.com" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="client-address-input">Endereço Completo</label>
              <input 
                id="client-address-input"
                type="text" 
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Rua, Número, Bairro, Cidade - UF" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-2 bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
              <label className="text-xs font-semibold text-amber-900 flex items-center justify-between" htmlFor="client-credit-limit-input">
                <span>Limite Máximo de Crédito Aprovado (R$)</span>
                <span className="text-[11px] font-normal text-amber-700">Se ultrapassado na venda, dispara alerta e requer liberação do Gerente</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-amber-700 font-semibold">R$</span>
                <input 
                  id="client-credit-limit-input"
                  type="number" 
                  step="50"
                  min="0"
                  value={maxCreditLimit}
                  onChange={e => setMaxCreditLimit(e.target.value)}
                  placeholder="3000" 
                  className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Payment Policy Override for this Client */}
            <div className="space-y-2 col-span-1 md:col-span-2 bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200/70">
              <label className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span>Política de Pagamento para este Cliente (Sinal de Entrada)</span>
                <span className="text-[10px] text-emerald-700 font-normal">Personalizável por cliente</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="select-client-payment-mode" className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Regra de Cobrança:
                  </label>
                  <select
                    id="select-client-payment-mode"
                    value={paymentModeOverride}
                    onChange={e => setPaymentModeOverride(e.target.value as any)}
                    className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-lg font-medium text-slate-800"
                  >
                    <option value="DEFAULT">Usar Padrão Geral da Oficina</option>
                    <option value="AFTER_COMPLETION">100% Pós-Pago (Paga na Entrega)</option>
                    <option value="ADVANCE_DEPOSIT">Exigir Sinal de Entrada (%)</option>
                    <option value="FULL_ADVANCE">Exigir 100% Antecipado</option>
                  </select>
                </div>

                {paymentModeOverride === 'ADVANCE_DEPOSIT' && (
                  <div>
                    <label htmlFor="input-client-deposit-pct" className="text-[11px] font-semibold text-slate-700 block mb-1">
                      % de Sinal Exigido do Cliente:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="input-client-deposit-pct"
                        type="number"
                        min="5"
                        max="90"
                        step="5"
                        value={depositPercentageOverride}
                        onChange={e => setDepositPercentageOverride(e.target.value)}
                        className="w-20 text-xs p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                      />
                      <span className="text-xs text-slate-600">% (Ex: 30%, 50% de entrada)</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                Esta regra será aplicada automaticamente ao criar orçamentos e Ordens de Serviço para {name || 'este cliente'}.
              </p>
            </div>

            <div className="col-span-1 md:col-span-2">
              <PrivacyLgpdFooter
                onOpenModal={() => setShowPrivacyModal(true)}
                mode="register"
                isChecked={hasAcceptedLgpd}
                onToggleCheck={setHasAcceptedLgpd}
              />
            </div>

            <div className="pt-2 flex gap-3 col-span-1 md:col-span-2">
              <button 
                id="btn-save-client"
                type="submit" 
                className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition"
              >
                {editingClient ? 'Salvar Alterações' : 'Salvar Cadastro'}
              </button>
              <button 
                id="btn-cancel-client"
                type="button" 
                onClick={resetForm} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold px-5 py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Table Area */}
      {!isFormOpen && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="clients-list-panel">
          {/* Table Search Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="client-search-input"
                type="text" 
                placeholder="Buscar cliente por nome, CPF/CNPJ ou email..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Table */}
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-slate-400" id="clients-empty-state">
              Nenhum cliente encontrado com os critérios fornecidos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="clients-table">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                    <th className="p-4">Nome</th>
                    <th className="p-4">CPF/CNPJ (Validação RN001)</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4">Endereço</th>
                    <th className="p-4">Limite de Crédito</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredClients.map(client => {
                    const limit = client.maxCreditLimit !== undefined ? client.maxCreditLimit : 3000;
                    const debt = client.currentDebt || 0;
                    const isExceeded = debt > limit;
                    const rawDoc = (client.cpfCnpj || client.cpf || '').replace(/\D/g, '');
                    const isCnpj = rawDoc.length > 11;
                    const displayDoc = client.cpfCnpj || client.cpf || '-';

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/50 transition duration-150" id={`client-row-${client.id}`}>
                        <td className="p-4 font-semibold text-slate-800">
                          <div>{client.name}</div>
                          {client.paymentModeOverride && client.paymentModeOverride !== 'DEFAULT' && (
                            <div className="mt-1">
                              {client.paymentModeOverride === 'AFTER_COMPLETION' && (
                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200">
                                  Regra: 100% Pós-Pago
                                </span>
                              )}
                              {client.paymentModeOverride === 'ADVANCE_DEPOSIT' && (
                                <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                                  Regra: Sinal {client.depositPercentageOverride || 30}%
                                </span>
                              )}
                              {client.paymentModeOverride === 'FULL_ADVANCE' && (
                                <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                                  Regra: 100% Antecipado
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isCnpj ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {isCnpj ? 'CNPJ' : 'CPF'}
                            </span>
                            <span className="font-semibold">{displayDoc}</span>
                          </div>
                          {isCnpj && (client.stateRegistration || client.ie) && (
                            <div className="text-[11px] text-purple-700 font-mono mt-0.5 flex items-center gap-1 font-medium">
                              <span className="text-[10px] px-1 py-0.2 bg-purple-50 rounded border border-purple-200">IE</span>
                              <span>{client.stateRegistration || client.ie}</span>
                            </div>
                          )}
                          {!isCnpj && client.rg && (
                            <div className="text-[11px] text-blue-700 font-mono mt-0.5 flex items-center gap-1 font-medium">
                              <span className="text-[10px] px-1 py-0.2 bg-blue-50 rounded border border-blue-200">RG</span>
                              <span>{client.rg}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <p>{client.phone || '(Não informado)'}</p>
                            <p className="text-xs text-slate-400 font-mono">{client.email || '(Sem email)'}</p>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 max-w-xs truncate">{client.address || '(Sem endereço)'}</td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-700 font-mono">
                                R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {isExceeded && (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200 animate-pulse">
                                  Excedido
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Dívida Ativa: <span className={`font-mono font-medium ${debt > 0 ? 'text-amber-600' : 'text-slate-500'}`}>R$ {debt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            id={`btn-edit-client-${client.id}`}
                            onClick={() => openEditForm(client)} 
                            className="text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs"
                            title="Editar Cadastro"
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
          )}
        </div>
      )}
      {/* Privacy and LGPD Modal */}
      <PrivacyLgpdModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        companyName={db.companyInfo?.name || 'MotorDesk'}
      />
    </div>
  );
}
