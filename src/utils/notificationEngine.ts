/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK CONNECT — MOTOR CENTRAL DE NOTIFICAÇÕES & RÉGUA INTELIGENTE
 * Sistema de mensageria multicanal (In-App, WhatsApp, E-mail) com templates dinâmicos,
 * régua de cobrança pré/pós-vencimento, escalonamento automático e trilha de auditoria.
 */

import { 
  AppDatabase, 
  NotificationAuditLog, 
  NotificationChannel, 
  NotificationCriticality, 
  NotificationEngineSettings, 
  NotificationRecipientType, 
  NotificationRule, 
  NotificationTemplate, 
  NotificationTriggerType, 
  SystemNotification,
  AccountReceivable,
  AccountPayable
} from '../types';

export interface DailyFinancialSummary {
  date: string;
  totalReceivableToday: number;
  totalPayableToday: number;
  totalReceivedToday: number;
  totalPaidToday: number;
  projectedNetToday: number;
  totalOverdueReceivable: number;
  countOverdueReceivable: number;
  totalOverduePayable: number;
  countOverduePayable: number;
}

// ==========================================
// TEMPLATES PADRÃO DE FÁBRICA (MotorDesk Connect)
// ==========================================

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tmpl-rec-pre-due',
    code: 'RECEIVABLE_PRE_DUE_3D',
    name: 'Lembrete Amigável de Vencimento (D-3)',
    triggerType: 'receivable_pre_due',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `Olá, *{cliente_nome}*! Tudo bem?\n\nLembramos que sua fatura *{codigo_documento}* no valor de *{valor_total}* vencerá em *{data_vencimento}*.\n\nPara sua comodidade, você pode efetuar o pagamento via PIX no link:\n{link_fatura_pix}\n\nSe já efetuou o pagamento, favor desconsiderar esta mensagem.\n\nAtenciosamente,\n*{empresa_nome}* | {telefone_contato}`
  },
  {
    id: 'tmpl-rec-due-today',
    code: 'RECEIVABLE_DUE_TODAY',
    name: 'Fatura Vence Hoje (D0)',
    triggerType: 'receivable_due_today',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `Olá, *{cliente_nome}*!\n\nSua fatura *{codigo_documento}* no valor de *{valor_total}* vence *HOJE* ({data_vencimento}).\n\nEvite encargos efetuando o pagamento diretamente via PIX:\n{link_fatura_pix}\n\nCaso necessite de 2ª via ou atendimento, estamos à disposição.\n\n*{empresa_nome}*`
  },
  {
    id: 'tmpl-rec-overdue-3d',
    code: 'RECEIVABLE_OVERDUE_3D',
    name: 'Aviso de Atraso Moderado (D+3)',
    triggerType: 'receivable_overdue',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `Prezado(a) *{cliente_nome}*,\n\nIdentificamos que a fatura *{codigo_documento}* no valor de *{valor_total}*, com vencimento em *{data_vencimento}*, consta em aberto ({dias_atraso} dias de atraso).\n\nPedimos a gentileza de regularizar o pagamento acessando o link atualizado:\n{link_fatura_pix}\n\nSe tiver qualquer dúvida ou já tiver realizado a quitação, por favor nos responda com o comprovante.\n\n*{empresa_nome}*`
  },
  {
    id: 'tmpl-rec-overdue-15d',
    code: 'RECEIVABLE_OVERDUE_15D_CRITICAL',
    name: 'Cobrança Crítica & Escalonamento (D+15)',
    triggerType: 'receivable_overdue',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `*COMUNICADO DE COBRANÇA - {empresa_nome}*\n\nPrezado(a) *{cliente_nome}*,\n\nA fatura *{codigo_documento}* no valor de *{valor_total}* está vencida há *{dias_atraso} dias* ({data_vencimento}).\n\nSolicitamos contato urgente pelo telefone {telefone_contato} para renegociação antes do envio para apontamento cadastral e suspensão de crédito.\n\nLink para liquidação imediata via PIX:\n{link_fatura_pix}\n\nDepartamento Financeiro | *{empresa_nome}*`
  },
  {
    id: 'tmpl-pay-pre-due',
    code: 'PAYABLE_PRE_DUE_2D',
    name: 'Alerta Interno: Conta a Pagar Vencendo (D-2)',
    triggerType: 'payable_pre_due',
    channel: 'system',
    isSystemDefault: true,
    body: `Atenção Financeiro: A conta a pagar {codigo_documento} de {fornecedor_nome} no valor de {valor_total} vence em {data_vencimento} (2 dias). Provisionar saldo bancário.`
  },
  {
    id: 'tmpl-pay-due-today',
    code: 'PAYABLE_DUE_TODAY',
    name: 'Alerta Interno: Conta a Pagar Vence Hoje (D0)',
    triggerType: 'payable_due_today',
    channel: 'system',
    isSystemDefault: true,
    body: `Vencimento HOJE: Título a pagar {codigo_documento} de {fornecedor_nome}, valor {valor_total}. Efetuar liquidação bancária para evitar juros.`
  },
  {
    id: 'tmpl-pay-overdue',
    code: 'PAYABLE_OVERDUE_URGENT',
    name: 'Alerta Urgente: Conta a Pagar Vencida',
    triggerType: 'payable_overdue',
    channel: 'system',
    isSystemDefault: true,
    body: `URGENTE: A despesa {codigo_documento} para {fornecedor_nome} ({valor_total}) está em atraso há {dias_atraso} dias! Verificar bloqueio de fornecedor.`
  },
  {
    id: 'tmpl-stock-low',
    code: 'LOW_STOCK_ALERT',
    name: 'Alerta de Estoque Mínimo / Ponto de Pedido',
    triggerType: 'low_stock',
    channel: 'system',
    isSystemDefault: true,
    body: `Estoque Crítico: O item {itens_resumo} atingiu o saldo mínimo. Necessário emitir cotação com fornecedores.`
  },
  {
    id: 'tmpl-so-completed',
    code: 'SO_COMPLETED_CLIENT',
    name: 'Ordem de Serviço Pronta para Retirada',
    triggerType: 'so_completed',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `Olá, *{cliente_nome}*! Temos ótimas notícias! 🚗✨\n\nA manutenção do seu veículo referente à OS *{codigo_documento}* foi CONCLUÍDA com sucesso pela equipe da *{empresa_nome}*!\n\nSeu veículo já está limpo e pronto para retirada em nosso pátio.\n\nValor total dos serviços/peças: *{valor_total}*\nQualquer dúvida, fale conosco no {telefone_contato}.\n\nEsperamos por você!`
  },
  {
    id: 'tmpl-budget-approved',
    code: 'BUDGET_APPROVED_NOTIF',
    name: 'Orçamento Técnico Aprovado pelo Cliente',
    triggerType: 'budget_approved',
    channel: 'system',
    isSystemDefault: true,
    body: `Orçamento {codigo_documento} do cliente {cliente_nome} no valor de {valor_total} foi aprovado com assinatura digital! Gerar Ordem de Serviço ou Separar Peças.`
  },
  {
    id: 'tmpl-daily-summary',
    code: 'DAILY_FINANCIAL_SUMMARY',
    name: 'Resumo Financeiro Diário Gerencial',
    triggerType: 'daily_summary',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `📊 *RESUMO FINANCEIRO DIÁRIO - {empresa_nome}*\n📅 Data: *{data_vencimento}*\n\n💰 *Entradas Previstas Hoje:* {valor_total}\n💸 *Saídas Previstas Hoje:* {itens_resumo}\n📈 *Saldo Projetado do Dia:* {saldo_projetado}\n\n⚠️ *Títulos em Atraso a Receber:* {dias_atraso}\n\n_Gerado automaticamente pelo MotorDesk Connect_`
  },
  {
    id: 'tmpl-rep-order-sent',
    code: 'REP_ORDER_SENT_FACTORY',
    name: 'Pedido de Representação Enviado à Fábrica',
    triggerType: 'rep_order_sent',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `*NOVO PEDIDO DE COMPRA - REPRESENTAÇÃO*\n\nPrezada *{fornecedor_nome}*,\n\nSegue pedido nº *{codigo_documento}* emitido para o cliente *{cliente_nome}*.\n\nValor total faturável: *{valor_total}*\nItens do pedido:\n{itens_resumo}\n\nFavor confirmar recebimento e previsão de faturamento.\n\nRepresentante: *{empresa_nome}* | {telefone_contato}`
  },
  {
    id: 'tmpl-rep-commission-due',
    code: 'REP_COMMISSION_DUE',
    name: 'Lembrete de Comissão de Representação a Faturar',
    triggerType: 'rep_commission_due',
    channel: 'whatsapp',
    isSystemDefault: true,
    body: `Prezada *{fornecedor_nome}*,\n\nConsta a comissão referente ao pedido *{codigo_documento}* faturado para o cliente *{cliente_nome}*, no valor de *{valor_total}*, com data prevista de liquidação em *{data_vencimento}*.\n\nFavor confirmar agendamento do pagamento.\n\nAtenciosamente,\n*{empresa_nome}*`
  }
];

// ==========================================
// RÉGUAS DE NOTIFICAÇÃO PADRÃO
// ==========================================

export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'rule-rec-d-3',
    companyId: '',
    name: 'Cobrança Preventiva (D-3)',
    triggerType: 'receivable_pre_due',
    daysOffset: -3,
    channels: ['whatsapp', 'email'],
    templateId: 'tmpl-rec-pre-due',
    active: true,
    recipients: ['client'],
    criticality: 'normal'
  },
  {
    id: 'rule-rec-d-0',
    companyId: '',
    name: 'Aviso de Vencimento no Dia (D0)',
    triggerType: 'receivable_due_today',
    daysOffset: 0,
    channels: ['whatsapp', 'email'],
    templateId: 'tmpl-rec-due-today',
    active: true,
    recipients: ['client'],
    criticality: 'atencao'
  },
  {
    id: 'rule-rec-d-3-overdue',
    companyId: '',
    name: 'Aviso de Atraso Inicial (D+3)',
    triggerType: 'receivable_overdue',
    daysOffset: 3,
    channels: ['whatsapp', 'email'],
    templateId: 'tmpl-rec-overdue-3d',
    active: true,
    recipients: ['client'],
    criticality: 'urgente',
    escalateAfterDays: 5,
    escalateTo: 'manager'
  },
  {
    id: 'rule-rec-d-15-overdue',
    companyId: '',
    name: 'Cobrança Crítica e Bloqueio (D+15)',
    triggerType: 'receivable_overdue',
    daysOffset: 15,
    channels: ['whatsapp', 'email'],
    templateId: 'tmpl-rec-overdue-15d',
    active: true,
    recipients: ['client', 'financial'],
    criticality: 'critico',
    escalateAfterDays: 15,
    escalateTo: 'admin'
  },
  {
    id: 'rule-pay-d-2',
    companyId: '',
    name: 'Aviso Interno de Despesa Vencendo (D-2)',
    triggerType: 'payable_pre_due',
    daysOffset: -2,
    channels: ['system'],
    templateId: 'tmpl-pay-pre-due',
    active: true,
    recipients: ['financial'],
    criticality: 'normal'
  },
  {
    id: 'rule-pay-d-0',
    companyId: '',
    name: 'Aviso Interno de Despesa Hoje (D0)',
    triggerType: 'payable_due_today',
    daysOffset: 0,
    channels: ['system'],
    templateId: 'tmpl-pay-due-today',
    active: true,
    recipients: ['financial'],
    criticality: 'urgente'
  },
  {
    id: 'rule-pay-d-1-overdue',
    companyId: '',
    name: 'Alerta de Despesa em Atraso (D+1)',
    triggerType: 'payable_overdue',
    daysOffset: 1,
    channels: ['system'],
    templateId: 'tmpl-pay-overdue',
    active: true,
    recipients: ['financial', 'manager'],
    criticality: 'critico'
  }
];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationEngineSettings = {
  enabled: true,
  enableWhatsApp: true,
  enableEmail: true,
  enableInApp: true,
  groupDailySameRecipient: true,
  autoEscalateOverdue: true,
  escalateOverdueDaysThreshold: 5,
  dailySummarySendTime: '08:00',
  dailySummaryRecipients: ['admin', 'manager', 'financial']
};

// ==========================================
// RENDERIZADOR DE TEMPLATES E VARIÁVEIS
// ==========================================

export function renderNotificationTemplate(
  templateBody: string,
  variables: Record<string, string | number | undefined | null>
): string {
  let result = templateBody;
  
  Object.entries(variables).forEach(([key, val]) => {
    const rawVal = val !== undefined && val !== null ? String(val) : '';
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, rawVal);
  });

  return result;
}

// ==========================================
// FORMATADOR WHATSAPP & HIGIENIZAÇÃO DE NÚMERO
// ==========================================

export function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  
  // Se não tiver DDI (55), adiciona se tiver 10 ou 11 dígitos
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// ==========================================
// CÁLCULO DO RESUMO FINANCEIRO DIÁRIO
// ==========================================

export function calculateDailyFinancialSummary(
  db: AppDatabase, 
  companyId: string, 
  targetDateStr?: string
): DailyFinancialSummary {
  const today = targetDateStr || new Date().toISOString().substring(0, 10);
  
  const recs = (db.accountsReceivable || []).filter(r => (r.companyId || 'comp-1') === companyId);
  const pays = (db.accountsPayable || []).filter(p => (p.companyId || 'comp-1') === companyId);

  let totalReceivableToday = 0;
  let totalPayableToday = 0;
  let totalReceivedToday = 0;
  let totalPaidToday = 0;
  let totalOverdueReceivable = 0;
  let countOverdueReceivable = 0;
  let totalOverduePayable = 0;
  let countOverduePayable = 0;

  recs.forEach(r => {
    const isDueToday = r.dueDate === today;
    const isOverdue = r.dueDate < today && r.status !== 'paid';

    if (isDueToday) {
      totalReceivableToday += Number(r.totalAmount || 0);
      if (r.status === 'paid') {
        totalReceivedToday += Number(r.totalAmount || 0);
      }
    }

    if (isOverdue) {
      totalOverdueReceivable += Number(r.totalAmount || 0);
      countOverdueReceivable++;
    }
  });

  pays.forEach(p => {
    const isDueToday = p.dueDate === today;
    const isOverdue = p.dueDate < today && p.status !== 'paid';

    if (isDueToday) {
      totalPayableToday += Number(p.totalAmount || 0);
      if (p.status === 'paid') {
        totalPaidToday += Number(p.totalAmount || 0);
      }
    }

    if (isOverdue) {
      totalOverduePayable += Number(p.totalAmount || 0);
      countOverduePayable++;
    }
  });

  const projectedNetToday = totalReceivableToday - totalPayableToday;

  return {
    date: today,
    totalReceivableToday,
    totalPayableToday,
    totalReceivedToday,
    totalPaidToday,
    projectedNetToday,
    totalOverdueReceivable,
    countOverdueReceivable,
    totalOverduePayable,
    countOverduePayable
  };
}

// ==========================================
// DISPARO & REGISTRO DE AUDITORIA
// ==========================================

export function createNotificationLog(params: {
  companyId: string;
  channel: NotificationChannel;
  recipientType: 'client' | 'supplier' | 'internal' | 'custom';
  recipientName: string;
  recipientContact: string;
  sourceDocType: 'receivable' | 'payable' | 'budget' | 'service_order' | 'sale' | 'rep_order' | 'daily_summary' | 'stock' | 'system';
  sourceDocId?: string;
  sourceDocCode?: string;
  subject?: string;
  messageContent: string;
  criticality: NotificationCriticality;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'simulated';
  operatorName?: string;
  operatorId?: string;
  linkUrl?: string;
  notes?: string;
}): NotificationAuditLog {
  return {
    id: `notif-log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    companyId: params.companyId,
    date: new Date().toISOString(),
    channel: params.channel,
    recipientType: params.recipientType,
    recipientName: params.recipientName,
    recipientContact: params.recipientContact,
    sourceDocType: params.sourceDocType,
    sourceDocId: params.sourceDocId,
    sourceDocCode: params.sourceDocCode,
    subject: params.subject,
    messageContent: params.messageContent,
    criticality: params.criticality,
    status: params.status,
    operatorId: params.operatorId,
    operatorName: params.operatorName || 'Sistema Automático',
    linkUrl: params.linkUrl,
    notes: params.notes
  };
}

// ==========================================
// AVALIAÇÃO DE RÉGUA INTELIGENTE EM TEMPO REAL
// ==========================================

export function evaluatePendingRuleTriggers(
  db: AppDatabase,
  companyId: string
): Array<{
  rule: NotificationRule;
  template: NotificationTemplate;
  targetDoc: AccountReceivable | AccountPayable | any;
  targetType: 'receivable' | 'payable';
  recipientName: string;
  recipientContact: string;
  daysDiff: number;
  renderedText: string;
  criticality: NotificationCriticality;
}> {
  const company = (db.registeredCompanies || []).find(c => c.id === companyId) || db.companyInfo;
  const rules = (db.notificationRules || DEFAULT_NOTIFICATION_RULES).filter(r => r.active);
  const templates = db.notificationTemplates || DEFAULT_NOTIFICATION_TEMPLATES;
  const today = new Date().toISOString().substring(0, 10);
  const todayTimestamp = new Date(today).getTime();

  const results: any[] = [];

  // 1. Verificar Contas a Receber
  const recs = (db.accountsReceivable || []).filter(r => 
    (r.companyId || 'comp-1') === companyId && 
    r.status !== 'paid'
  );

  recs.forEach(rec => {
    if (!rec.dueDate) return;
    const dueTimestamp = new Date(rec.dueDate).getTime();
    const diffDays = Math.round((todayTimestamp - dueTimestamp) / (1000 * 60 * 60 * 24));

    rules.forEach(rule => {
      let matches = false;

      if (rule.triggerType === 'receivable_pre_due' && diffDays === rule.daysOffset) {
        matches = true;
      } else if (rule.triggerType === 'receivable_due_today' && diffDays === 0 && rule.daysOffset === 0) {
        matches = true;
      } else if (rule.triggerType === 'receivable_overdue') {
        if (rule.daysOffset > 0 && diffDays >= rule.daysOffset) {
          matches = true;
        }
      }

      if (matches) {
        const tmpl = templates.find(t => t.id === rule.templateId || t.code === rule.templateId) || templates[0];
        const client = (db.clients || []).find(c => c.id === rec.clientId || c.name.toLowerCase() === rec.clientName?.toLowerCase());
        const phone = client?.phone || '';
        
        const rendered = renderNotificationTemplate(tmpl.body, {
          cliente_nome: rec.clientName || client?.name || 'Cliente',
          valor_total: `R$ ${Number(rec.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          data_vencimento: new Date(rec.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR'),
          dias_atraso: diffDays > 0 ? diffDays : 0,
          codigo_documento: rec.code || `FAT-${rec.id.substring(0, 6)}`,
          link_fatura_pix: (rec as any).pixQrCode || `https://pagar.motordesk.com/fatura/${rec.id}`,
          empresa_nome: company?.name || 'MotorDesk Workshop',
          telefone_contato: company?.phone || '(11) 99999-9999'
        });

        // Escalonamento de criticidade se configurado
        let effectiveCriticality = rule.criticality;
        if (rule.escalateAfterDays && diffDays >= rule.escalateAfterDays) {
          effectiveCriticality = 'critico';
        }

        results.push({
          rule,
          template: tmpl,
          targetDoc: rec,
          targetType: 'receivable',
          recipientName: rec.clientName || 'Cliente',
          recipientContact: phone,
          daysDiff: diffDays,
          renderedText: rendered,
          criticality: effectiveCriticality
        });
      }
    });
  });

  return results;
}
