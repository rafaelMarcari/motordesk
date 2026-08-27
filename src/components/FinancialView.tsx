/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, Calendar, 
  Search, Plus, ArrowUpRight, ArrowDownRight, Tag, X, FileText, CheckCircle,
  Bell, Sliders
} from 'lucide-react';
import { FinancialTransaction, User, AlertSettings } from '../types';
import { AppDatabase, INITIAL_ALERT_SETTINGS } from '../data/mockData';
import { FinancialAlertsConfigModal } from './FinancialAlertsConfigModal';

interface FinancialViewProps {
  db: AppDatabase;
  currentUser: User;
  onSaveTransactions: (transactions: FinancialTransaction[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  onSaveAlertSettings?: (settings: AlertSettings) => void;
}

export default function FinancialView({
  db,
  currentUser,
  onSaveTransactions,
  onAddHistoryLog,
  onSaveAlertSettings
}: FinancialViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'month' | 'year'>('month');
  const [isAlertsConfigOpen, setIsAlertsConfigOpen] = useState(false);

  // Manual Transaction Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txCategory, setTxCategory] = useState('Entradas Diversas');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState('PIX');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const transactions = db.financialTransactions || [];
  const receivables = db.accountsReceivable || [];
  const payables = db.accountsPayable || [];

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || t.type === typeFilter;

    let matchesPeriod = true;
    const txDateObj = new Date(t.date);
    const now = new Date();

    if (periodFilter === 'today') {
      matchesPeriod = txDateObj.toDateString() === now.toDateString();
    } else if (periodFilter === 'month') {
      matchesPeriod = txDateObj.getMonth() === now.getMonth() && txDateObj.getFullYear() === now.getFullYear();
    } else if (periodFilter === 'year') {
      matchesPeriod = txDateObj.getFullYear() === now.getFullYear();
    }

    return matchesSearch && matchesType && matchesPeriod;
  });

  // Calculate Realized Financial Totals
  const totalIncomes = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncomes - totalExpenses;

  // Pending Forecasts
  const pendingReceivablesTotal = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);
  const pendingPayablesTotal = payables.reduce((sum, p) => sum + p.remainingAmount, 0);

  // Manual Quick Transaction Save
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(txAmount);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (!txDescription.trim()) {
      setErrorMsg('Informe a descrição do lançamento.');
      return;
    }

    const newTx: FinancialTransaction = {
      id: `ft-manual-${Date.now()}`,
      type: txType,
      category: txCategory,
      description: txDescription.trim(),
      amount: val,
      date: new Date(txDate).toISOString(),
      paymentMethod: txPaymentMethod,
      createdByName: currentUser.name
    };

    const updated = [newTx, ...transactions];
    onSaveTransactions(updated);
    onAddHistoryLog('payment', 'Lançamento Manual de Caixa', `Lançamento manual de ${txType === 'income' ? 'Entrada (+)' : 'Saída (-)'} no valor de R$ ${val.toFixed(2)} registrado por ${currentUser.name}.`, '', '');

    setSuccessMsg(`Lançamento de ${txType === 'income' ? 'Entrada' : 'Saída'} no valor de R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})} registrado!`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setIsFormOpen(false);
    setTxDescription('');
    setTxAmount('');
    setErrorMsg('');
  };

  return (
    <div className="space-y-6 animate-fade-in" id="financial-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display flex items-center gap-2">
            <Wallet className="w-6 h-6 text-indigo-600" />
            Módulo Financeiro & Fluxo de Caixa
          </h1>
          <p className="text-sm text-slate-500">
            Visão consolidada de receitas, despesas, saldo em caixa e projeção de entradas e saídas.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setIsAlertsConfigOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-200 transition border border-slate-200 cursor-pointer shadow-2xs"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600" /> Parâmetros de Alerta
          </button>
          {!isFormOpen && (
            <button 
              id="btn-add-manual-tx"
              onClick={() => setIsFormOpen(true)} 
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lançamento Avulso
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="financial-kpis">
        {/* Total Entradas */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Entradas Realizadas ({periodFilter === 'month' ? 'Este Mês' : periodFilter === 'today' ? 'Hoje' : periodFilter === 'year' ? 'Este Ano' : 'Período'})</p>
            <p className="text-lg font-bold text-emerald-600 font-mono">
              + R$ {totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Total Saídas */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Saídas / Despesas Pago</p>
            <p className="text-lg font-bold text-rose-600 font-mono">
              - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className={`bg-white p-4 rounded-xl border shadow-xs flex items-center gap-4 ${netBalance >= 0 ? 'border-indigo-100' : 'border-rose-200 bg-rose-50/20'}`}>
          <div className={`p-3 rounded-lg ${netBalance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-100 text-rose-700'}`}>
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Saldo em Caixa (Resultado)</p>
            <p className={`text-lg font-bold font-mono ${netBalance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
              R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Forecast Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="text-xs space-y-0.5">
            <p className="text-slate-400 font-medium">Previsão Futura</p>
            <p className="text-emerald-700 font-semibold font-mono">A Receber: R$ {pendingReceivablesTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <p className="text-rose-700 font-semibold font-mono">A Pagar: R$ {pendingPayablesTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
          </div>
        </div>
      </div>

      {/* Visual Cash Flow Ratio Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-3" id="financial-visual-bar">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
          <span>Proporção Entradas vs Saídas</span>
          <span>
            {totalIncomes + totalExpenses > 0 
              ? `${Math.round((totalIncomes / (totalIncomes + totalExpenses)) * 100)}% Receitas | ${Math.round((totalExpenses / (totalIncomes + totalExpenses)) * 100)}% Despesas`
              : 'Sem movimentações no período selecionado'}
          </span>
        </div>
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
          {totalIncomes + totalExpenses > 0 ? (
            <>
              <div 
                style={{ width: `${(totalIncomes / (totalIncomes + totalExpenses)) * 100}%` }} 
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Entradas: R$ ${totalIncomes.toFixed(2)}`}
              />
              <div 
                style={{ width: `${(totalExpenses / (totalIncomes + totalExpenses)) * 100}%` }} 
                className="bg-rose-500 h-full transition-all duration-500"
                title={`Saídas: R$ ${totalExpenses.toFixed(2)}`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-200 h-full" />
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div id="financial-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-200 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Manual Entry Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-md animate-slide-up" id="manual-tx-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-semibold text-slate-800 font-display text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Lançamento Avulso no Caixa (Entrada / Sangria)
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100 flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Tipo de Operação *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input 
                    type="radio" 
                    name="txType" 
                    value="income" 
                    checked={txType === 'income'} 
                    onChange={() => { setTxType('income'); setTxCategory('Entradas Diversas'); }}
                    className="accent-emerald-600"
                  />
                  <span className="text-emerald-700 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" /> Entrada (+)</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input 
                    type="radio" 
                    name="txType" 
                    value="expense" 
                    checked={txType === 'expense'} 
                    onChange={() => { setTxType('expense'); setTxCategory('Sangria / Despesa Interna'); }}
                    className="accent-rose-600"
                  />
                  <span className="text-rose-700 flex items-center gap-1"><ArrowDownRight className="w-4 h-4" /> Saída / Sangria (-)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Descrição do Lançamento *</label>
              <input 
                type="text" 
                value={txDescription}
                onChange={e => setTxDescription(e.target.value)}
                placeholder="Ex: Reforço de fundo de troco para o balcão" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Categoria</label>
              <input 
                type="text" 
                value={txCategory}
                onChange={e => setTxCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Valor (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="150.00" 
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Forma de Pagamento</label>
              <select 
                value={txPaymentMethod}
                onChange={e => setTxPaymentMethod(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
              >
                <option value="Dinheiro">Dinheiro (Espécie)</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Transferência">Transferência Bancária</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Data *</label>
              <input 
                type="date" 
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                required
              />
            </div>

            <div className="pt-2 flex gap-3 col-span-1 md:col-span-2">
              <button 
                type="submit" 
                className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition"
              >
                Salvar Lançamento
              </button>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)} 
                className="bg-slate-100 text-slate-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions Table Panel */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="financial-table-panel">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              id="financial-search-input"
              type="text" 
              placeholder="Buscar por descrição ou categoria no livro caixa..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              id="financial-type-filter"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden font-medium"
            >
              <option value="all">Todas as Operações</option>
              <option value="income">Apenas Entradas (+)</option>
              <option value="expense">Apenas Saídas (-)</option>
            </select>

            <select
              id="financial-period-filter"
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value as any)}
              className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden font-medium"
            >
              <option value="month">Este Mês</option>
              <option value="today">Hoje</option>
              <option value="year">Este Ano</option>
              <option value="all">Todo o Histórico</option>
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400" id="financial-empty-state">
            Nenhuma movimentação financeira registrada para o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="financial-table">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                  <th className="p-4">Data</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Categoria / Descrição</th>
                  <th className="p-4">Meio de Pagamento</th>
                  <th className="p-4">Lançado por</th>
                  <th className="p-4 text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredTransactions.map(t => {
                  const isIncome = t.type === 'income';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition duration-150" id={`tx-row-${t.id}`}>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
                        {isIncome ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-md">
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" /> Saída
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-md mb-0.5">
                          <Tag className="w-3 h-3 text-slate-400" /> {t.category}
                        </span>
                        <p className="font-medium text-slate-800">{t.description}</p>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600">
                        {t.paymentMethod || 'Dinheiro'}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {t.createdByName || 'Sistema'}
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncome ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financial Alerts Config Modal */}
      {isAlertsConfigOpen && onSaveAlertSettings && (
        <FinancialAlertsConfigModal
          isOpen={isAlertsConfigOpen}
          onClose={() => setIsAlertsConfigOpen(false)}
          currentSettings={db.alertSettings || INITIAL_ALERT_SETTINGS}
          currentUser={currentUser}
          onSave={(newSettings) => {
            onSaveAlertSettings(newSettings);
            setIsAlertsConfigOpen(false);
          }}
        />
      )}
    </div>
  );
}
