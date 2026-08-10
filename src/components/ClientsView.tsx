/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Client } from '../types';
import { AppDatabase } from '../data/mockData';

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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [maxCreditLimit, setMaxCreditLimit] = useState<string>('3000');
  const [paymentModeOverride, setPaymentModeOverride] = useState<'DEFAULT' | 'AFTER_COMPLETION' | 'ADVANCE_DEPOSIT' | 'FULL_ADVANCE'>('DEFAULT');
  const [depositPercentageOverride, setDepositPercentageOverride] = useState<string>('30');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-format CPF (999.999.999-99)
  const formatCPF = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
  };

  // Auto-format Phone ((99) 99999-9999)
  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  // Check if form is dirty (unsaved changes)
  const isFormDirty = name.trim() !== '' || cpf.trim() !== '' || email.trim() !== '' || phone.trim() !== '' || address.trim() !== '';

  const resetForm = () => {
    setName('');
    setCpf('');
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
    setCpf(client.cpf);
    setEmail(client.email);
    setPhone(client.phone);
    setAddress(client.address);
    setMaxCreditLimit(client.maxCreditLimit !== undefined ? String(client.maxCreditLimit) : '3000');
    setPaymentModeOverride(client.paymentModeOverride || 'DEFAULT');
    setDepositPercentageOverride(client.depositPercentageOverride !== undefined ? String(client.depositPercentageOverride) : '30');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // Core save client action (used both normally and by the conditional logout dialog)
  const executeSave = (customData?: { name: string; cpf: string; email: string; phone: string; address: string; maxCreditLimit?: string; editingClient: Client | null }) => {
    const activeName = customData ? customData.name : name;
    const activeCpf = customData ? customData.cpf : cpf;
    const activeEmail = customData ? customData.email : email;
    const activePhone = customData ? customData.phone : phone;
    const activeAddress = customData ? customData.address : address;
    const activeLimitNum = parseFloat(customData?.maxCreditLimit || maxCreditLimit) || 0;
    const activeEditingClient = customData ? customData.editingClient : editingClient;

    if (!activeName.trim() || !activeCpf.trim()) {
      return { success: false, message: 'Nome e CPF são campos obrigatórios.' };
    }

    if (activeCpf.length < 14) {
      return { success: false, message: 'CPF inválido ou incompleto.' };
    }

    // RN001: CPF único check
    const cpfExists = db.clients.some(c => c.cpf === activeCpf && (!activeEditingClient || c.id !== activeEditingClient.id));
    if (cpfExists) {
      return { success: false, message: 'Regra de Negócio Violada (RN001): Já existe um cliente cadastrado com este CPF.' };
    }

    const activeDepositPct = Number(depositPercentageOverride) || 30;

    let updatedClientsList: Client[] = [];
    if (activeEditingClient) {
      // Edit Client
      updatedClientsList = db.clients.map(c => 
        c.id === activeEditingClient.id 
          ? { 
              ...c, 
              name: activeName, 
              cpf: activeCpf, 
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
      onAddHistoryLog('user_activity', 'Cliente Editado', `Dados cadastrais e política de pagamento do cliente ${activeName} atualizados no sistema.`, activeEditingClient.id, '');
    } else {
      // Create Client
      const newClient: Client = {
        id: `cli-${Date.now()}`,
        name: activeName,
        cpf: activeCpf,
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
      onSaveClients(updatedClientsList);
      onAddHistoryLog('user_activity', 'Cliente Cadastrado', `Cliente ${activeName} cadastrado com sucesso sob CPF ${activeCpf} e limite de crédito R$ ${activeLimitNum.toFixed(2)}.`, newClient.id, '');
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
  }, [isFormOpen, name, cpf, email, phone, address]);

  // Filter clients
  const filteredClients = db.clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.cpf.includes(searchQuery) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <label className="text-xs font-semibold text-slate-600" htmlFor="client-name-input">Nome Completo *</label>
              <input 
                id="client-name-input"
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: João da Silva" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="client-cpf-input">CPF * (RN001 - Único)</label>
              <input 
                id="client-cpf-input"
                type="text" 
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                required
              />
            </div>

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
                placeholder="Buscar cliente por nome, CPF ou email..." 
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
                    <th className="p-4">CPF (Validação RN001)</th>
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
                        <td className="p-4 font-mono text-xs text-slate-600">{client.cpf}</td>
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
    </div>
  );
}
