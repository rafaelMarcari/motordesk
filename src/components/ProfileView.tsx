/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Key, CheckCircle, AlertCircle, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { AppDatabase } from '../data/mockData';

interface ProfileViewProps {
  currentUser: User;
  db: AppDatabase;
  onSaveUsers: (users: User[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
}

export default function ProfileView({ currentUser, db, onSaveUsers, onAddHistoryLog }: ProfileViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Todos os campos de senha são obrigatórios.');
      return;
    }

    // Verify current password (plain comparison since we are simulating authentication for the QA portfolio context)
    if (currentPassword !== currentUser.passwordHash) {
      setErrorMsg('Senha Atual Incorreta. Não foi possível autorizar a alteração.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmação da senha não corresponde com a nova senha digitada.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('A nova senha não pode ser idêntica à senha atual.');
      return;
    }

    // Update password in the database list
    const updatedUsers = db.users.map(usr => {
      if (usr.id === currentUser.id) {
        return {
          ...usr,
          passwordHash: newPassword
        };
      }
      return usr;
    });

    onSaveUsers(updatedUsers);
    
    // Log history
    onAddHistoryLog('user_activity', 'Alteração de Senha', `O colaborador ${currentUser.name} atualizou sua credencial de acesso de forma segura nas configurações de perfil.`, '', '');

    setSuccessMsg('Senha atualizada com sucesso! Suas novas credenciais estão em vigor.');
    
    // Clear fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6 animate-fade-in" id="profile-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Configurações de Perfil</h1>
          <p className="text-sm text-slate-500">Gestão dos seus dados cadastrais e credenciais de segurança do sistema.</p>
        </div>
      </div>

      {successMsg && (
        <div id="profile-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div id="profile-error-alert" className="p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100 animate-slide-up">
          <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Stats/Details Card */}
        <div className="md:col-span-1 bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4" id="profile-details-card">
          <div className="flex flex-col items-center text-center py-4 border-b border-slate-100 space-y-3">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
              <UserIcon className="w-12 h-12" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{currentUser.name}</h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider border border-slate-200 mt-1 inline-block">
                {currentUser.role}
              </span>
            </div>
          </div>

          <div className="text-xs space-y-3 pt-2">
            <p className="font-bold uppercase text-[10px] text-slate-400">Informações da Conta</p>
            <div className="space-y-1">
              <p className="text-slate-500">Nome de login:</p>
              <p className="font-mono font-semibold text-slate-800 bg-slate-50 border border-slate-100 px-2 py-1 rounded w-fit">
                {currentUser.username}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500">Identificador interno:</p>
              <p className="font-mono text-slate-600">{currentUser.id}</p>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-5" id="profile-password-panel">
          <div className="flex items-center gap-2 text-indigo-900 border-b border-slate-150 pb-3">
            <Key className="w-5 h-5 text-indigo-600" />
            <h4 className="font-semibold text-slate-800 font-display text-sm uppercase tracking-wider">Alterar Senha do Perfil</h4>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4" id="form-change-password">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="current-pwd-input">Senha Atual *</label>
              <input 
                id="current-pwd-input"
                type="password" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Insira sua senha atual para validação" 
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600" htmlFor="new-pwd-input">Nova Senha *</label>
                <input 
                  id="new-pwd-input"
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 4 caracteres" 
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600" htmlFor="confirm-pwd-input">Confirmar Nova Senha *</label>
                <input 
                  id="confirm-pwd-input"
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha" 
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                id="btn-save-new-password"
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition"
              >
                Salvar Nova Senha
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
