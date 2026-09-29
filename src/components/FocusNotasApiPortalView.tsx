/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, Shield, Key, Building2, CheckCircle2, XCircle, Clock, 
  Send, RefreshCw, Copy, Check, Eye, Download, AlertTriangle, 
  Lock, ArrowLeft, Plus, Trash2, ExternalLink, HelpCircle, FileCheck
} from 'lucide-react';
import { FocusEmpresa, FocusNota } from '../services/notasApiBackend';

interface FocusNotasApiPortalViewProps {
  onBackToApp: () => void;
  registeredCompanies?: any[];
}

export const FocusNotasApiPortalView: React.FC<FocusNotasApiPortalViewProps> = ({ onBackToApp, registeredCompanies }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem('motordesk_notas_api_token');
  });
  const [masterPassword, setMasterPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'empresas' | 'notas' | 'api-docs' | 'config'>('empresas');

  // Data States
  const [stats, setStats] = useState<any>(null);
  const [empresas, setEmpresas] = useState<FocusEmpresa[]>([]);
  const [notas, setNotas] = useState<FocusNota[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('todas');
  const [empresaFilter, setEmpresaFilter] = useState('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showNewEmpresaModal, setShowNewEmpresaModal] = useState(false);
  const [showNewNotaModal, setShowNewNotaModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<FocusNota | null>(null);
  const [cancelJustificativa, setCancelJustificativa] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Empresa Form State
  const [empCnpj, setEmpCnpj] = useState('');
  const [empRazao, setEmpRazao] = useState('');
  const [empFantasia, setEmpFantasia] = useState('');
  const [empIM, setEmpIM] = useState('');
  const [empCodMun, setEmpCodMun] = useState('3550308');
  const [empUf, setEmpUf] = useState('SP');
  const [empRegime, setEmpRegime] = useState<'simples' | 'mei' | 'normal'>('simples');
  const [empAmbiente, setEmpAmbiente] = useState<'homologacao' | 'producao'>('homologacao');
  const [empWebhook, setEmpWebhook] = useState('');

  // Nota Form State
  const [notaEmpresaId, setNotaEmpresaId] = useState('');
  const [notaRef, setNotaRef] = useState('');
  const [tomadorDoc, setTomadorDoc] = useState('');
  const [tomadorNome, setTomadorNome] = useState('');
  const [tomadorEmail, setTomadorEmail] = useState('');
  const [tomadorTel, setTomadorTel] = useState('');
  const [tomadorEnd, setTomadorEnd] = useState('');
  const [servDesc, setServDesc] = useState('');
  const [servCodTrib, setServCodTrib] = useState('14.01.01');
  const [servValor, setServValor] = useState('');
  const [servAliq, setServAliq] = useState('5.0');

  // Change Password State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const getAuthToken = () => sessionStorage.getItem('motordesk_notas_api_token') || '';

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
    showToast('Copiado para a área de transferência!');
  };

  // Format CPF/CNPJ dynamically
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      setAuthError('Informe a senha master de acesso.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const res = await fetch('/api/notas-api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('motordesk_notas_api_token', data.token);
        setIsAuthenticated(true);
        loadPortalData();
      } else {
        setAuthError(data.error || 'Senha master incorreta.');
      }
    } catch (err: any) {
      setAuthError('Erro ao comunicar com o servidor: ' + err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('motordesk_notas_api_token');
    setIsAuthenticated(false);
  };

  const loadPortalData = async () => {
    const token = getAuthToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resStats, resEmpresas, resNotas] = await Promise.all([
        fetch('/api/notas-api/stats', { headers }),
        fetch('/api/notas-api/empresas', { headers }),
        fetch('/api/notas-api/notas', { headers })
      ]);

      if (resStats.status === 401 || resEmpresas.status === 401) {
        handleLogout();
        return;
      }

      if (resStats.ok) setStats(await resStats.json());
      if (resEmpresas.ok) {
        const empList = await resEmpresas.json();
        setEmpresas(empList);
        if (empList.length > 0 && !notaEmpresaId) {
          setNotaEmpresaId(empList[0].id);
        }
      }
      if (resNotas.ok) setNotas(await resNotas.json());
    } catch (err) {
      console.error('Erro ao carregar dados do portal Notas-API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPortalData();
    }
  }, [isAuthenticated]);

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const res = await fetch('/api/notas-api/empresas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cnpj: empCnpj,
          razaoSocial: empRazao,
          nomeFantasia: empFantasia,
          inscricaoMunicipal: empIM,
          codigoMunicipio: empCodMun,
          uf: empUf,
          regime: empRegime,
          ambiente: empAmbiente,
          webhookUrl: empWebhook,
          serieDps: '1',
          proximoNumeroDps: 1
        })
      });

      if (res.ok) {
        showToast('Empresa emitente cadastrada com sucesso!');
        setShowNewEmpresaModal(false);
        setEmpCnpj('');
        setEmpRazao('');
        setEmpFantasia('');
        setEmpIM('');
        loadPortalData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao cadastrar empresa', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRegenerateToken = async (id: string) => {
    if (!confirm('Deseja realmente gerar um novo token de API para esta empresa? O token antigo deixará de funcionar imediatamente.')) return;
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/notas-api/empresas/${id}/token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Novo token gerado com sucesso!');
        loadPortalData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEmitirNfse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notaEmpresaId) {
      showToast('Selecione uma empresa emitente.', 'error');
      return;
    }
    const token = getAuthToken();
    try {
      const res = await fetch('/api/notas-api/notas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          empresaId: notaEmpresaId,
          ref: notaRef || `REF-${Date.now()}`,
          tomador: {
            cnpjCpf: tomadorDoc,
            razaoSocial: tomadorNome,
            email: tomadorEmail,
            telefone: tomadorTel,
            endereco: tomadorEnd
          },
          servico: {
            discriminacao: servDesc,
            codigoTributacaoNacional: servCodTrib,
            valorServicos: parseFloat(servValor) || 0,
            aliquotaIss: parseFloat(servAliq) || 5.0
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`NFS-e autorizada com sucesso! DPS nº ${data.nota.numeroDps}`);
        setShowNewNotaModal(false);
        setNotaRef('');
        setTomadorDoc('');
        setTomadorNome('');
        setServDesc('');
        setServValor('');
        loadPortalData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao emitir nota fiscal', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCancelarNota = async () => {
    if (!showCancelModal) return;
    if (cancelJustificativa.trim().length < 15) {
      showToast('A justificativa deve ter pelo menos 15 caracteres.', 'error');
      return;
    }

    const token = getAuthToken();
    try {
      const res = await fetch(`/api/notas-api/notas/${showCancelModal.id}/cancelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ justificativa: cancelJustificativa })
      });

      if (res.ok) {
        showToast('NFS-e cancelada com sucesso!');
        setShowCancelModal(null);
        setCancelJustificativa('');
        loadPortalData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao cancelar', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      showToast('A nova senha e a confirmação não conferem.', 'error');
      return;
    }
    const token = getAuthToken();
    try {
      const res = await fetch('/api/notas-api/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
      });

      if (res.ok) {
        showToast('Senha master atualizada com sucesso!');
        setOldPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao alterar senha', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered Notes
  const filteredNotas = notas.filter(n => {
    if (statusFilter !== 'todas' && n.status !== statusFilter) return false;
    if (empresaFilter !== 'todas' && n.empresaId !== empresaFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        n.ref.toLowerCase().includes(q) ||
        n.tomador.razaoSocial.toLowerCase().includes(q) ||
        n.tomador.cnpjCpf.includes(q) ||
        n.chaveAcesso.includes(q) ||
        n.numeroDps.toString().includes(q)
      );
    }
    return true;
  });

  // ==========================================
  // VIEW: GUEST / MASTER PASSWORD LOGIN GATE
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl mb-3 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              Portal Focus NFS-e / Notas API
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Gateway Emissor de Notas Fiscais para Empresas Clientes
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-6 text-xs text-amber-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Área Restrita do Administrador</span>
              Este portal é protegido por senha única master. Somente o gestor do MotorDesk possui autorização de acesso.
            </div>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Senha Master de Acesso
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Padrão inicial de fábrica: <code className="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded font-mono">motordesk@admin2026</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Autenticando...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Entrar no Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <button
              onClick={onBackToApp}
              className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o MotorDesk Principal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: AUTHENTICATED PORTAL
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-slide-up ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
            : 'bg-rose-950 text-rose-200 border-rose-800'
        }`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toastMessage.text}
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight font-display">Portal Focus NFS-e</span>
              <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700/50 text-emerald-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                Online • Sefin Nacional
              </span>
            </div>
            <p className="text-[11px] text-slate-400">MotorDesk Focus API Gateway v1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToApp}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao MotorDesk
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Sair do Portal
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-slate-400 text-xs font-medium uppercase">Empresas Ativas</div>
            <div className="text-2xl font-bold text-white mt-1 font-display">{stats?.totalEmpresas ?? empresas.length}</div>
            <div className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Multi-Empresa Habilitado
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-slate-400 text-xs font-medium uppercase">NFS-e Autorizadas</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-display">{stats?.notasAutorizadas ?? notas.filter(n => n.status === 'autorizado').length}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sefin Nacional 100%
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-slate-400 text-xs font-medium uppercase">NFS-e Canceladas</div>
            <div className="text-2xl font-bold text-rose-400 mt-1 font-display">{stats?.notasCanceladas ?? notas.filter(n => n.status === 'cancelado').length}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-400" /> Histórico homologado
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-slate-400 text-xs font-medium uppercase">Faturamento Emitido</div>
            <div className="text-2xl font-bold text-white mt-1 font-display">
              R$ {(stats?.valorTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">Serviços mecânicos</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-slate-400 text-xs font-medium uppercase">Certificados A1</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 font-display">{stats?.certsAtivos ?? empresas.filter(e => e.certificado?.hasPfx).length}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Key className="w-3 h-3 text-amber-400" /> ICP-Brasil Ativos
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('empresas')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'empresas'
                ? 'bg-slate-800 text-white border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" /> Empresas Cadastradas ({empresas.length})
          </button>
          <button
            onClick={() => setActiveTab('notas')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'notas'
                ? 'bg-slate-800 text-white border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" /> Emissão & Consulta de NFS-e ({notas.length})
          </button>
          <button
            onClick={() => setActiveTab('api-docs')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'api-docs'
                ? 'bg-slate-800 text-white border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Key className="w-4 h-4" /> Documentação API Focus (v1)
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-slate-800 text-white border-indigo-500'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Shield className="w-4 h-4" /> Segurança & Senha Master
          </button>
        </div>

        {/* ==========================================
            TAB 1: EMPRESAS CADASTRADAS
        ========================================== */}
        {activeTab === 'empresas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Empresas Emitentes do Portal</h2>
                <p className="text-xs text-slate-400">Cada empresa possui seu próprio CNPJ, série DPS, Certificado A1 e Token de API Focus.</p>
              </div>
              <button
                onClick={() => setShowNewEmpresaModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Cadastrar Nova Empresa
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empresas.map(emp => (
                <div key={emp.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 relative hover:border-slate-700 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{emp.razaoSocial}</div>
                      {emp.nomeFantasia && <div className="text-xs text-slate-400">{emp.nomeFantasia}</div>}
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {emp.ambiente}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                    <div><span className="text-slate-500 font-sans">CNPJ:</span> {emp.cnpj}</div>
                    <div><span className="text-slate-500 font-sans">Inscrição Municipal:</span> {emp.inscricaoMunicipal}</div>
                    <div><span className="text-slate-500 font-sans">Município IBGE:</span> {emp.codigoMunicipio} ({emp.uf})</div>
                    <div><span className="text-slate-500 font-sans">Série / Próxima DPS:</span> {emp.serieDps} / nº {emp.proximoNumeroDps}</div>
                  </div>

                  {/* Certificado Digital Badge */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3 h-3 text-amber-400" /> Certificado A1
                      </span>
                      <span className="text-emerald-400 font-mono">{emp.certificado?.diasParaVencer ?? 365} dias rest.</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1">{emp.certificado?.subject || 'Certificado ICP-Brasil Instalado'}</div>
                  </div>

                  {/* Token de API */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Token de API Focus</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="password"
                        readOnly
                        value={emp.token}
                        className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs px-2.5 py-1.5 rounded-lg select-all"
                      />
                      <button
                        title="Copiar Token"
                        onClick={() => copyToClipboard(emp.token, emp.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                      >
                        {copiedToken === emp.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        title="Gerar Novo Token"
                        onClick={() => handleRegenerateToken(emp.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: EMISSÃO & CONSULTA DE NFS-E
        ========================================== */}
        {activeTab === 'notas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Notas Fiscais de Serviços (NFS-e)</h2>
                <p className="text-xs text-slate-400">Emissão direta compatível com o padrão Focus NFe e Sefin Nacional.</p>
              </div>
              <button
                onClick={() => setShowNewNotaModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Emitir NFS-e Rápida
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por referência, cliente, CPF/CNPJ ou chave..."
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg"
              />

              <select
                value={empresaFilter}
                onChange={e => setEmpresaFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg"
              >
                <option value="todas">Todas as Empresas</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.razaoSocial}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2 rounded-lg"
              >
                <option value="todas">Todos os Status</option>
                <option value="autorizado">Autorizadas</option>
                <option value="cancelado">Canceladas</option>
              </select>
            </div>

            {/* Notes Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="p-3.5">DPS / Série</th>
                      <th className="p-3.5">Empresa Emitente</th>
                      <th className="p-3.5">Tomador / Destinatário</th>
                      <th className="p-3.5 text-right">Valor Total</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-medium">
                    {filteredNotas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          Nenhuma NFS-e encontrada para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredNotas.map(nota => (
                        <tr key={nota.id} className="hover:bg-slate-900/40 transition">
                          <td className="p-3.5 font-mono">
                            <div className="font-bold text-white">DPS Nº {nota.numeroDps}</div>
                            <div className="text-[10px] text-slate-400">Ref: {nota.ref}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{nota.empresaRazaoSocial}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{nota.empresaCnpj}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{nota.tomador.razaoSocial}</div>
                            <div className="text-[10px] text-slate-400 font-mono">CPF/CNPJ: {nota.tomador.cnpjCpf}</div>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">
                            R$ {nota.servico.valorServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              nota.status === 'autorizado' 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {nota.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <a
                              href={`/api/notas-api/notas/${nota.id}/danfse`}
                              target="_blank"
                              rel="noreferrer"
                              title="Visualizar Espelho DANFSe"
                              className="inline-flex p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`/api/notas-api/notas/${nota.id}/xml`}
                              download
                              title="Baixar XML Assinado"
                              className="inline-flex p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            {nota.status === 'autorizado' && (
                              <button
                                title="Cancelar Nota Fiscal"
                                onClick={() => {
                                  setShowCancelModal(nota);
                                  setCancelJustificativa('');
                                }}
                                className="inline-flex p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-400 rounded-lg transition cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: DOCUMENTAÇÃO API FOCUS (V1)
        ========================================== */}
        {activeTab === 'api-docs' && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Integração Externa Compatível Focus NFe</h2>
              <p className="text-xs text-slate-400 mt-1">
                Qualquer sistema cliente (ERP, checkout, app mobile ou script) pode emitir NFS-e utilizando este gateway idêntico à Focus NFe.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono mb-2">
                  <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 rounded text-[10px]">POST</span>
                  <span>/v1/nfse?ref=SUA_REFERENCIA_UNICA</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Emite uma nova NFS-e para a empresa associada ao Bearer Token.</p>
                <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto">
{`curl -X POST "https://motordesk.app.br/v1/nfse?ref=OS-12345" \\
  -H "Authorization: Bearer fcs_tok_emp1_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "tomador": {
      "cnpj": "11.222.333/0001-44",
      "razao_social": "Auto Posto Aliança Ltda",
      "email": "fiscal@alianca.com.br"
    },
    "servico": {
      "discriminacao": "Serviço de Troca de Embreagem e Diagnóstico Eletrônico",
      "valor_servicos": 850.00,
      "aliquota": 5.0
    }
  }'`}
                </pre>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 font-mono mb-2">
                  <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-800 rounded text-[10px]">GET</span>
                  <span>/v1/nfse/:ref</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">Consulta o status e os links de XML e DANFSe de uma nota fiscal emitida.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono mb-2">
                  <span className="px-2 py-0.5 bg-rose-950 border border-rose-800 rounded text-[10px]">DELETE</span>
                  <span>/v1/nfse/:ref</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">Cancela a nota fiscal informando a justificativa obrigatória.</p>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: SEGURANÇA & SENHA MASTER
        ========================================== */}
        {activeTab === 'config' && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-lg space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Alterar Senha Master do Portal</h2>
              <p className="text-xs text-slate-400 mt-1">
                Esta senha é exigida para acessar o portal /notas-api. Mantenha-a em sigilo.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Senha Atual</label>
                <input
                  type="password"
                  required
                  value={oldPass}
                  onChange={e => setOldPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nova Senha Master (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Nova Senha Master</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-md"
              >
                Salvar Nova Senha Master
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL: CADASTRAR EMPRESA
      ========================================== */}
      {showNewEmpresaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Cadastrar Empresa Emitente</h3>

            <form onSubmit={handleSaveEmpresa} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={empCnpj}
                    onChange={e => setEmpCnpj(formatCpfCnpj(e.target.value))}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inscrição Municipal *</label>
                  <input
                    type="text"
                    required
                    value={empIM}
                    onChange={e => setEmpIM(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Razão Social *</label>
                <input
                  type="text"
                  required
                  value={empRazao}
                  onChange={e => setEmpRazao(e.target.value)}
                  placeholder="Nome Empresarial Completo"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={empFantasia}
                  onChange={e => setEmpFantasia(e.target.value)}
                  placeholder="Nome Fantasia / Marca"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cód. Município IBGE</label>
                  <input
                    type="text"
                    value={empCodMun}
                    onChange={e => setEmpCodMun(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={empUf}
                    onChange={e => setEmpUf(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Regime</label>
                  <select
                    value={empRegime}
                    onChange={e => setEmpRegime(e.target.value as any)}
                    className="w-full px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                  >
                    <option value="simples">Simples Nacional</option>
                    <option value="mei">MEI</option>
                    <option value="normal">Lucro Presumido/Real</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Webhook URL de Retorno (opcional)</label>
                <input
                  type="url"
                  value={empWebhook}
                  onChange={e => setEmpWebhook(e.target.value)}
                  placeholder="https://seu-sistema.com.br/webhook/nfse"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewEmpresaModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EMITIR NFS-E
      ========================================== */}
      {showNewNotaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Emitir NFS-e Rápida (Sefin Nacional)</h3>

            <form onSubmit={handleEmitirNfse} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Empresa Emitente *</label>
                <select
                  required
                  value={notaEmpresaId}
                  onChange={e => setNotaEmpresaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                >
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.razaoSocial} ({e.cnpj})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CPF/CNPJ do Tomador *</label>
                  <input
                    type="text"
                    required
                    value={tomadorDoc}
                    onChange={e => setTomadorDoc(formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00 ou CNPJ"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Referência / OS</label>
                  <input
                    type="text"
                    value={notaRef}
                    onChange={e => setNotaRef(e.target.value)}
                    placeholder="Ex: OS-2026-99"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome / Razão Social do Tomador *</label>
                <input
                  type="text"
                  required
                  value={tomadorNome}
                  onChange={e => setTomadorNome(e.target.value)}
                  placeholder="Nome do Cliente ou Razão Social"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Discriminação dos Serviços *</label>
                <textarea
                  required
                  rows={3}
                  value={servDesc}
                  onChange={e => setServDesc(e.target.value)}
                  placeholder="Descreva detalhadamente os serviços prestados..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor dos Serviços (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={servValor}
                    onChange={e => setServValor(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alíquota ISS (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={servAliq}
                    onChange={e => setServAliq(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewNotaModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Transmitir e Autorizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CANCELAR NFS-E
      ========================================== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-900 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Cancelar NFS-e DPS Nº {showCancelModal.numeroDps}
            </h3>
            <p className="text-xs text-slate-400">
              O cancelamento na Sefin Nacional é irreversível. É obrigatório fornecer uma justificativa formal com no mínimo 15 caracteres.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Justificativa do Cancelamento *</label>
              <textarea
                rows={3}
                required
                value={cancelJustificativa}
                onChange={e => setCancelJustificativa(e.target.value)}
                placeholder="Ex: Cancelamento motivado por desistência do serviço ou erro na apuração..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
              />
              <div className="text-[10px] text-slate-500 mt-1">
                Caracteres: {cancelJustificativa.length}/15 mínimo
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelarNota}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
