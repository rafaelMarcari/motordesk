/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK CONNECT — PAINEL DE CONTROLE DO MOTOR CENTRAL DE NOTIFICAÇÕES
 * Gestão de réguas de cobrança, templates editáveis, simulador de WhatsApp/E-mail,
 * disparos em lote, resumo financeiro diário e trilha de auditoria completa.
 */

import React, { useState, useMemo } from 'react';
import { 
  AppDatabase, 
  User, 
  NotificationTemplate, 
  NotificationRule, 
  NotificationAuditLog, 
  NotificationChannel, 
  NotificationCriticality, 
  NotificationTriggerType 
} from '../types';
import { 
  DEFAULT_NOTIFICATION_TEMPLATES, 
  DEFAULT_NOTIFICATION_RULES, 
  DEFAULT_NOTIFICATION_SETTINGS, 
  renderNotificationTemplate, 
  buildWhatsAppLink, 
  calculateDailyFinancialSummary, 
  createNotificationLog, 
  evaluatePendingRuleTriggers 
} from '../utils/notificationEngine';
import { 
  Bell, 
  Send, 
  MessageSquare, 
  Mail, 
  Sliders, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Eye, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Check, 
  Calendar,
  Building2,
  DollarSign,
  Search,
  Filter
} from 'lucide-react';

interface NotificationEngineViewProps {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  currentUser: User;
  activeCompanyId: string;
}

export const NotificationEngineView: React.FC<NotificationEngineViewProps> = ({
  db,
  setDb,
  currentUser,
  activeCompanyId
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'templates' | 'rules' | 'daily_summary' | 'audit'>('queue');
  
  const company = (db.registeredCompanies || []).find(c => c.id === activeCompanyId) || db.companyInfo;

  // Templates state
  const templates = db.notificationTemplates || DEFAULT_NOTIFICATION_TEMPLATES;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || 'tmpl-rec-pre-due');
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const [templateEditBody, setTemplateEditBody] = useState<string>(selectedTemplate?.body || '');
  const [templateSubject, setTemplateSubject] = useState<string>(selectedTemplate?.emailSubject || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [testPhone, setTestPhone] = useState<string>((currentUser as any).phone || company?.phone || '');
  const [copiedDailySummary, setCopiedDailySummary] = useState<boolean>(false);

  // Filter audit logs
  const [auditChannelFilter, setAuditChannelFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Real-time pending triggers
  const pendingTriggers = useMemo(() => {
    return evaluatePendingRuleTriggers(db, activeCompanyId);
  }, [db, activeCompanyId]);

  // Daily financial summary
  const dailySummary = useMemo(() => {
    return calculateDailyFinancialSummary(db, activeCompanyId);
  }, [db, activeCompanyId]);

  // Handle template selection change
  const handleSelectTemplate = (tmpl: NotificationTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setTemplateEditBody(tmpl.body);
    setTemplateSubject(tmpl.emailSubject || '');
    setSaveSuccessMsg('');
  };

  // Save modified template
  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;
    const updated = templates.map(t => {
      if (t.id === selectedTemplate.id) {
        return {
          ...t,
          body: templateEditBody,
          emailSubject: templateSubject
        };
      }
      return t;
    });

    setDb(prev => ({
      ...prev,
      notificationTemplates: updated
    }));

    setSaveSuccessMsg('Template salvo com sucesso!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Reset templates to factory default
  const handleResetTemplates = () => {
    if (window.confirm('Deseja restaurar todos os templates para o padrão original de fábrica?')) {
      setDb(prev => ({
        ...prev,
        notificationTemplates: DEFAULT_NOTIFICATION_TEMPLATES
      }));
      setTemplateEditBody(DEFAULT_NOTIFICATION_TEMPLATES[0].body);
      setSaveSuccessMsg('Templates restaurados com sucesso!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  // Insert variable into template editor
  const handleInsertVariable = (varName: string) => {
    setTemplateEditBody(prev => `${prev}{${varName}}`);
  };

  // Dispatch individual trigger via WhatsApp
  const handleDispatchWhatsApp = (trigger: any) => {
    const log = createNotificationLog({
      companyId: activeCompanyId,
      channel: 'whatsapp',
      recipientType: 'client',
      recipientName: trigger.recipientName,
      recipientContact: trigger.recipientContact,
      sourceDocType: trigger.targetType,
      sourceDocId: trigger.targetDoc.id,
      sourceDocCode: trigger.targetDoc.documentNumber || trigger.targetDoc.id,
      messageContent: trigger.renderedText,
      criticality: trigger.criticality,
      status: 'sent',
      operatorName: currentUser.name,
      operatorId: currentUser.id
    });

    setDb(prev => ({
      ...prev,
      notificationAuditLogs: [log, ...(prev.notificationAuditLogs || [])]
    }));

    const url = buildWhatsAppLink(trigger.recipientContact, trigger.renderedText);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Dispatch test message
  const handleSendTestMessage = () => {
    if (!testPhone.trim()) {
      alert('Informe um número de telefone com DDD para testar o envio.');
      return;
    }

    const testRendered = renderNotificationTemplate(templateEditBody, {
      cliente_nome: 'João Silva (Teste)',
      fornecedor_nome: 'Distribuidora Modelo',
      valor_total: 'R$ 1.450,00',
      data_vencimento: new Date().toLocaleDateString('pt-BR'),
      dias_atraso: 3,
      codigo_documento: 'FAT-TESTE-001',
      link_fatura_pix: 'https://pagar.motordesk.com/fatura/teste-pix',
      empresa_nome: company?.name || 'MotorDesk Workshop',
      telefone_contato: company?.phone || '(11) 98888-7777',
      itens_resumo: 'Pastilhas de Freio + Óleo Sintético 5W30',
      saldo_projetado: 'R$ 8.920,00'
    });

    const log = createNotificationLog({
      companyId: activeCompanyId,
      channel: selectedTemplate.channel,
      recipientType: 'custom',
      recipientName: 'Usuário Teste',
      recipientContact: testPhone,
      sourceDocType: 'system',
      messageContent: testRendered,
      criticality: 'normal',
      status: 'simulated',
      operatorName: currentUser.name,
      operatorId: currentUser.id,
      notes: 'Disparo de teste manual do editor'
    });

    setDb(prev => ({
      ...prev,
      notificationAuditLogs: [log, ...(prev.notificationAuditLogs || [])]
    }));

    if (selectedTemplate.channel === 'whatsapp') {
      const url = buildWhatsAppLink(testPhone, testRendered);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert(`[Simulação de E-mail Enviada com Sucesso]\nDestinatário: ${testPhone}\nAssunto: ${templateSubject || 'Notificação MotorDesk'}`);
    }
  };

  // Live preview data for editor
  const previewText = useMemo(() => {
    return renderNotificationTemplate(templateEditBody, {
      cliente_nome: 'Carlos Eduardo Oliveira',
      fornecedor_nome: 'Bosch Autopeças Brasil',
      valor_total: 'R$ 890,00',
      data_vencimento: new Date().toLocaleDateString('pt-BR'),
      dias_atraso: 3,
      codigo_documento: 'FAT-2026-089',
      link_fatura_pix: 'https://pagar.motordesk.com/fatura/f-89',
      empresa_nome: company?.name || 'MotorDesk Workshop',
      telefone_contato: company?.phone || '(11) 97777-5555',
      itens_resumo: 'Filtro de Óleo + Correia Dentada',
      saldo_projetado: 'R$ 5.400,00'
    });
  }, [templateEditBody, company]);

  // Formatted daily summary text for copy/whatsapp
  const formattedDailySummaryText = useMemo(() => {
    const tmpl = templates.find(t => t.code === 'DAILY_FINANCIAL_SUMMARY') || DEFAULT_NOTIFICATION_TEMPLATES.find(t => t.code === 'DAILY_FINANCIAL_SUMMARY');
    return renderNotificationTemplate(tmpl?.body || '', {
      empresa_nome: company?.name || 'MotorDesk Workshop',
      data_vencimento: new Date().toLocaleDateString('pt-BR'),
      valor_total: `R$ ${dailySummary.totalReceivableToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      itens_resumo: `R$ ${dailySummary.totalPayableToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      saldo_projetado: `R$ ${dailySummary.projectedNetToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      dias_atraso: `${dailySummary.countOverdueReceivable} título(s) somando R$ ${dailySummary.totalOverdueReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    });
  }, [dailySummary, templates, company]);

  const handleCopyDailySummary = () => {
    navigator.clipboard.writeText(formattedDailySummaryText);
    setCopiedDailySummary(true);
    setTimeout(() => setCopiedDailySummary(false), 2500);
  };

  const handleShareDailySummaryWhatsApp = () => {
    const url = buildWhatsAppLink('', formattedDailySummaryText);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filtered audit logs
  const auditLogs = useMemo(() => {
    return (db.notificationAuditLogs || []).filter(log => {
      const matchComp = (log.companyId || activeCompanyId) === activeCompanyId;
      const matchChannel = auditChannelFilter === 'all' || log.channel === auditChannelFilter;
      const matchSearch = !auditSearch || 
        log.recipientName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.recipientContact.includes(auditSearch) ||
        (log.sourceDocCode && log.sourceDocCode.toLowerCase().includes(auditSearch.toLowerCase()));
      return matchComp && matchChannel && matchSearch;
    });
  }, [db.notificationAuditLogs, activeCompanyId, auditChannelFilter, auditSearch]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in" id="notification-engine-view">
      {/* Header with Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight font-display">MotorDesk Connect</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Motor Central Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Mensageria multicanal, régua financeira inteligente (D-X a D+X), templates dinâmicos e auditoria de envios
            </p>
          </div>
        </div>

        {/* Quick Tabs Navigation */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs overflow-x-auto">
          <button
            id="tab-queue"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'queue' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Fila Ativa ({pendingTriggers.length})
          </button>
          <button
            id="tab-templates"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'templates' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Templates Editáveis
          </button>
          <button
            id="tab-rules"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'rules' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Régua de Cobrança
          </button>
          <button
            id="tab-daily-summary"
            onClick={() => setActiveTab('daily_summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'daily_summary' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Resumo Diário
          </button>
          <button
            id="tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === 'audit' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Histórico & Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: FILA ATIVA EM TEMPO REAL */}
      {activeTab === 'queue' && (
        <div className="space-y-6 animate-fade-in" id="view-notif-queue">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Alertas Pendentes Hoje</span>
              <p className="text-2xl font-bold text-slate-800 mt-1">{pendingTriggers.length}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Cobranças D-3 (Preventivas)</span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {pendingTriggers.filter(t => t.rule.triggerType === 'receivable_pre_due').length}
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Vencendo Hoje (D0)</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {pendingTriggers.filter(t => t.rule.triggerType === 'receivable_due_today').length}
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Em Atraso / Críticas (D+X)</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {pendingTriggers.filter(t => t.rule.triggerType === 'receivable_overdue').length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Fila de Disparos da Régua Inteligente</h2>
                <p className="text-xs text-slate-500">
                  Lembretes e cobranças calculados automaticamente com base nos prazos configurados
                </p>
              </div>
            </div>

            {pendingTriggers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">Tudo em dia!</p>
                <p className="text-xs mt-1">Nenhuma notificação ou cobrança pendente para os parâmetros atuais.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTriggers.map((item, idx) => {
                  const critBadgeClass = 
                    item.criticality === 'critico' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                    item.criticality === 'urgente' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    item.criticality === 'atencao' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-indigo-50 text-indigo-700 border-indigo-200';

                  return (
                    <div key={idx} className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800">{item.recipientName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${critBadgeClass}`}>
                            {item.criticality.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {item.rule.name}
                          </span>
                          {item.daysDiff > 0 && (
                            <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {item.daysDiff} dia(s) em atraso
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          {item.renderedText}
                        </p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>Documento: <strong>{item.targetDoc.documentNumber || item.targetDoc.id}</strong></span>
                          <span>Valor: <strong>R$ {Number(item.targetDoc.amount || 0).toFixed(2)}</strong></span>
                          <span>Contato: <strong>{item.recipientContact || 'Sem telefone'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDispatchWhatsApp(item)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          title="Enviar via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Disparar WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATES EDITÁVEIS & SIMULADOR */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="view-notif-templates">
          {/* Left Column: Template Selection & Variables */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Templates do Sistema</h3>
                <button
                  onClick={handleResetTemplates}
                  className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition"
                  title="Restaurar originais"
                >
                  <RefreshCw className="w-3 h-3" />
                  Restaurar
                </button>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
                {templates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition border flex flex-col gap-1 ${
                      selectedTemplate?.id === tmpl.id
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{tmpl.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 uppercase">
                        {tmpl.channel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{tmpl.code}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clickable Variables Palette */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Variáveis Disponíveis
              </h3>
              <p className="text-[11px] text-slate-500">Clique para inserir dinamicamente no texto do template:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'cliente_nome',
                  'fornecedor_nome',
                  'valor_total',
                  'data_vencimento',
                  'dias_atraso',
                  'codigo_documento',
                  'link_fatura_pix',
                  'empresa_nome',
                  'telefone_contato',
                  'itens_resumo',
                  'saldo_projetado'
                ].map(varName => (
                  <button
                    key={varName}
                    onClick={() => handleInsertVariable(varName)}
                    className="text-[11px] font-mono px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-slate-600 transition"
                  >
                    {`{${varName}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: Editor */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{selectedTemplate?.name}</h3>
                  <p className="text-[11px] text-slate-400">Canal: {selectedTemplate?.channel.toUpperCase()}</p>
                </div>
                {saveSuccessMsg && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
                    <Check className="w-3.5 h-3.5" />
                    {saveSuccessMsg}
                  </span>
                )}
              </div>

              {selectedTemplate?.channel === 'email' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Assunto do E-mail</label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={e => setTemplateSubject(e.target.value)}
                    placeholder="Assunto da notificação"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Corpo da Mensagem (com formatação Markdown/*negrito*)</label>
                <textarea
                  rows={12}
                  value={templateEditBody}
                  onChange={e => setTemplateEditBody(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Template
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="DDD + Telefone teste"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg w-36 font-mono"
                  />
                  <button
                    onClick={handleSendTestMessage}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition flex items-center gap-1"
                  >
                    <Send className="w-3 h-3 text-emerald-600" />
                    Testar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Live Preview */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Preview WhatsApp
                </span>
                <span className="text-[10px] text-slate-400">Online</span>
              </div>

              {/* Realistic WhatsApp Chat Bubble */}
              <div className="bg-[#0b141a] p-3 rounded-xl min-h-[300px] flex flex-col justify-end">
                <div className="bg-[#005c4b] text-[#e9edef] p-3 rounded-2xl rounded-tr-xs text-xs whitespace-pre-wrap leading-relaxed shadow-sm font-sans border border-[#025142]">
                  {previewText}
                  <div className="text-[9px] text-[#8696a0] text-right mt-1.5 flex items-center justify-end gap-1">
                    <span>10:45</span>
                    <span className="text-emerald-400 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RÉGUA DE COBRANÇA & PRAZOS */}
      {activeTab === 'rules' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-xs animate-fade-in" id="view-notif-rules">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Régua Inteligente de Notificações</h2>
              <p className="text-xs text-slate-500">
                Prazos de disparo pré-vencimento, no dia do vencimento e regras de escalonamento pós-vencimento
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {(db.notificationRules || DEFAULT_NOTIFICATION_RULES).map(rule => (
              <div key={rule.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{rule.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-bold">
                      {rule.daysOffset < 0 ? `D${rule.daysOffset} (Pré)` : rule.daysOffset === 0 ? 'D0 (No Dia)' : `D+${rule.daysOffset} (Atraso)`}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                      {rule.channels.join(', ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Gatilho: <strong>{rule.triggerType}</strong> | Destinatários: <strong>{rule.recipients.join(', ')}</strong>
                  </p>
                  {rule.escalateAfterDays && (
                    <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Escalona após {rule.escalateAfterDays} dias para {rule.escalateTo || 'Gerência'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {rule.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RESUMO FINANCEIRO DIÁRIO */}
      {activeTab === 'daily_summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="view-daily-summary">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Resumo Executivo do Dia
              </h2>
              <p className="text-xs text-slate-500">
                Consolidação financeira de entradas, saídas e inadimplência do dia para despacho direto à diretoria
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <span className="text-[11px] text-emerald-800 font-semibold">Entradas Previstas</span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    R$ {dailySummary.totalReceivableToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                  <span className="text-[11px] text-rose-800 font-semibold">Saídas Previstas</span>
                  <p className="text-lg font-bold text-rose-700 mt-0.5">
                    R$ {dailySummary.totalPayableToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                  <span className="text-[11px] text-indigo-800 font-semibold">Saldo Projetado</span>
                  <p className={`text-lg font-bold mt-0.5 ${dailySummary.projectedNetToday >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                    R$ {dailySummary.projectedNetToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl col-span-2 sm:col-span-3">
                  <span className="text-[11px] text-amber-900 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Inadimplência Acumulada a Receber
                  </span>
                  <p className="text-base font-bold text-amber-900 mt-0.5">
                    R$ {dailySummary.totalOverdueReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({dailySummary.countOverdueReceivable} títulos)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Texto para Disparo</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyDailySummary}
                    className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition flex items-center gap-1"
                  >
                    {copiedDailySummary ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedDailySummary ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleShareDailySummaryWhatsApp}
                    className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    WhatsApp
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap text-slate-700 leading-relaxed">
                {formattedDailySummaryText}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HISTÓRICO & AUDITORIA DE ENVIOS */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs animate-fade-in" id="view-notif-audit">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Trilha de Auditoria de Notificações</h2>
              <p className="text-xs text-slate-500">Registro histórico de todas as tentativas, canais e mensagens geradas</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar destinatário..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white"
                />
              </div>

              <select
                value={auditChannelFilter}
                onChange={e => setAuditChannelFilter(e.target.value)}
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="all">Todos os Canais</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="system">Sistema</option>
              </select>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-xs">Nenhum registro de notificação encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Canal</th>
                    <th className="p-3">Destinatário</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Operador</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap text-slate-500">
                        {new Date(log.date).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 bg-slate-100 rounded-md">
                          {log.channel}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {log.recipientName}
                        <div className="text-[10px] text-slate-400 font-normal">{log.recipientContact}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {log.sourceDocCode || '-'}
                      </td>
                      <td className="p-3 text-slate-600">{log.operatorName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
