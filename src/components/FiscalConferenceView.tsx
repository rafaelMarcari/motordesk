/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  FileText, 
  Send, 
  Search, 
  Filter, 
  Building2, 
  User as UserIcon, 
  Printer, 
  Download, 
  ArrowUpRight, 
  Check, 
  X, 
  Eye, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Package,
  TrendingUp,
  CreditCard,
  Edit3
} from 'lucide-react';
import { 
  CommercialSale, 
  FiscalDocument, 
  CompanyInfo, 
  User, 
  UserPermissions,
  SefazApiConfig, 
  TaxRule, 
  TaxOperationNature,
  AccountReceivable
} from '../types';
import { AppDatabase } from '../data/mockData';
import FiscalDocumentPrintModal from './FiscalDocumentPrintModal';

const defaultFallbackCompany: CompanyInfo = {
  id: 'comp-1',
  name: 'MotorDesk Auto Center',
  tradeName: 'MotorDesk Oficina e Comércio',
  cnpj: '12.345.678/0001-90',
  stateRegistration: '123.456.789.110',
  cityRegistration: '98765432-1',
  uf: 'SP',
  phone: '(11) 3456-7890',
  whatsapp: '(11) 98765-4321',
  email: 'contato@motordesk.com.br',
  address: 'Av. Paulista, 1000 - Bela Vista - São Paulo / SP',
  registeredAt: '2026-01-01',
  sefazEnvironment: 'homologation',
  crt: '1',
  taxRegimeLabel: 'Simples Nacional'
};

interface FiscalConferenceViewProps {
  db: AppDatabase;
  currentUser?: User;
  currentCompany?: CompanyInfo;
  onUpdateDb: (updater: AppDatabase | ((prev: AppDatabase) => AppDatabase)) => void;
  onNavigate?: (tab: any) => void;
}

export default function FiscalConferenceView({
  db,
  currentUser,
  currentCompany: currentCompanyProp,
  onUpdateDb,
  onNavigate
}: FiscalConferenceViewProps) {
  const currentCompany: CompanyInfo = currentCompanyProp || db.companyInfo || defaultFallbackCompany;

  // Active Tab / Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('pending_conference');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Sale for Conference Inspector Modal
  const [selectedSaleForInspect, setSelectedSaleForInspect] = useState<CommercialSale | null>(null);
  
  // Selected Document for Print Modal (DANFE / NFC-e / NFS-e)
  const [selectedDocForDanfe, setSelectedDocForDanfe] = useState<FiscalDocument | null>(null);

  // Success / Feedback Toast
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Permissões do Usuário
  const permissions = (currentUser?.permissions || {}) as Partial<UserPermissions>;
  const canViewConference = permissions.fiscalConference !== false && permissions.accessFiscal !== false;
  const canEmit = permissions.fiscalEmit !== false;
  const canCancel = permissions.fiscalCancel !== false;
  const canReprint = permissions.fiscalReprint !== false;
  const canXml = permissions.fiscalXml !== false;

  // Filtrar apenas vendas da empresa ativa (Isolamento Multi-Tenant)
  const companySales = useMemo(() => {
    return (db.sales || []).filter(s => s.companyId === currentCompany.id);
  }, [db.sales, currentCompany.id]);

  // Lista de Operadores Únicos para Filtro
  const operators = useMemo(() => {
    const set = new Set<string>();
    companySales.forEach(s => {
      if (s.createdBy) set.add(s.createdBy);
    });
    return Array.from(set);
  }, [companySales]);

  // Contadores Operacionais de Status
  const kpis = useMemo(() => {
    let pendingConferenceCount = 0;
    let readyForEmissionCount = 0;
    let authorizedCount = 0;
    let rejectedCount = 0;
    let errorTransmissionCount = 0;
    let emitLaterCount = 0;
    let totalFaturado = 0;

    companySales.forEach(s => {
      const st = s.fiscalStatus || 'pending';
      if (st === 'pending_conference' || st === 'pending') pendingConferenceCount++;
      else if (st === 'ready_for_emission') readyForEmissionCount++;
      else if (st === 'authorized') {
        authorizedCount++;
        totalFaturado += s.totalAmount;
      }
      else if (st === 'rejected') rejectedCount++;
      else if (st === 'error_transmission') errorTransmissionCount++;
      else if (st === 'emit_later') emitLaterCount++;
    });

    return {
      pendingConferenceCount,
      readyForEmissionCount,
      authorizedCount,
      rejectedCount,
      errorTransmissionCount,
      emitLaterCount,
      totalFaturado,
      totalSales: companySales.length
    };
  }, [companySales]);

  // Vendas Filtradas
  const filteredSales = useMemo(() => {
    return companySales.filter(sale => {
      const saleFiscalStatus = sale.fiscalStatus || 'pending';

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending_conference') {
          if (saleFiscalStatus !== 'pending_conference' && saleFiscalStatus !== 'pending') return false;
        } else if (saleFiscalStatus !== statusFilter) {
          return false;
        }
      }

      // Search Query (Código, Cliente, CPF/CNPJ)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = (sale.code || '').toLowerCase().includes(q);
        const clientMatch = (sale.clientName || '').toLowerCase().includes(q);
        const cpfMatch = (sale.clientCpfCnpj || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        if (!codeMatch && !clientMatch && !cpfMatch) return false;
      }

      // Operator Filter
      if (operatorFilter !== 'all' && sale.createdBy !== operatorFilter) {
        return false;
      }

      // Date Range Filter
      if (startDate && sale.createdAt && sale.createdAt.slice(0, 10) < startDate) {
        return false;
      }
      if (endDate && sale.createdAt && sale.createdAt.slice(0, 10) > endDate) {
        return false;
      }

      return true;
    });
  }, [companySales, statusFilter, searchQuery, operatorFilter, startDate, endDate]);

  // Validação Fiscal da Venda Inspecionada (Três níveis: 🟢 OK, 🟡 ATENÇÃO, 🔴 ERRO)
  const validationDiagnosis = useMemo(() => {
    if (!selectedSaleForInspect) return null;

    const errors: Array<{ field: string; issue: string; resolution: string }> = [];
    const warnings: Array<{ field: string; issue: string; resolution: string }> = [];
    const checksOk: string[] = [];

    // 1. Emitente
    if (!currentCompany.cnpj || currentCompany.cnpj.replace(/\D/g, '').length !== 14) {
      errors.push({
        field: 'Emitente - CNPJ',
        issue: 'CNPJ do emitente inválido ou incompleto no cadastro da empresa.',
        resolution: 'Acesse Configurações > Dados da Empresa e preencha o CNPJ oficial de 14 dígitos.'
      });
    } else {
      checksOk.push('CNPJ do emitente válido e formatado');
    }

    if (!currentCompany.stateRegistration || currentCompany.stateRegistration === 'Isento') {
      warnings.push({
        field: 'Emitente - Inscrição Estadual',
        issue: 'Inscrição Estadual marcada como Isenta ou não preenchida.',
        resolution: 'Para emissão de NF-e (Modelo 55), certifique-se de que a filial possui IE ativa na SEFAZ.'
      });
    } else {
      checksOk.push('Inscrição Estadual do emitente preenchida');
    }

    // 2. Destinatário
    const rawCpfCnpj = (selectedSaleForInspect.clientCpfCnpj || '').replace(/\D/g, '');
    if (rawCpfCnpj.length === 0) {
      warnings.push({
        field: 'Destinatário - CPF/CNPJ',
        issue: 'Consumidor sem identificação de CPF/CNPJ (Venda Balcão / Consumidor Final).',
        resolution: 'Para NF-e Modelo 55 acima de R$ 10.000,00 ou interestadual, o CPF/CNPJ é obrigatório.'
      });
    } else if (rawCpfCnpj.length !== 11 && rawCpfCnpj.length !== 14) {
      errors.push({
        field: 'Destinatário - CPF/CNPJ Inválido',
        issue: `O documento informado possui ${rawCpfCnpj.length} dígitos, diferente do padrão (11 para CPF / 14 para CNPJ).`,
        resolution: 'Edite os dados do cliente e informe um CPF ou CNPJ com quantidade correta de dígitos.'
      });
    } else {
      checksOk.push(`Documento do destinatário válido (${rawCpfCnpj.length === 11 ? 'CPF' : 'CNPJ'})`);
    }

    // 3. Itens / Produtos
    if (!selectedSaleForInspect.items || selectedSaleForInspect.items.length === 0) {
      errors.push({
        field: 'Itens da Venda',
        issue: 'A venda não possui nenhum produto cadastrado.',
        resolution: 'Adicione ao menos um item válido na venda antes de transmitir.'
      });
    } else {
      checksOk.push(`Itens conferidos: ${selectedSaleForInspect.items.length} produto(s)`);

      selectedSaleForInspect.items.forEach((it, idx) => {
        const foundPart = db.parts.find(p => p.id === it.partId);
        const ncm = (it.ncm || foundPart?.ncm || '').replace(/\D/g, '');
        if (ncm.length !== 8) {
          errors.push({
            field: `Item #${idx + 1} (${it.partName}) - NCM`,
            issue: `NCM informado (${ncm || 'vazio'}) não possui 8 dígitos obrigatórios pela SEFAZ.`,
            resolution: 'Preencha a NCM correta com 8 dígitos no cadastro da peça (ex: 8708.29.99).'
          });
        }
      });
    }

    // 4. Ambiente Fiscal
    const sefazEnv = db.sefazConfig?.environment || currentCompany.sefazEnvironment || 'homologation';
    if (sefazEnv === 'homologation') {
      warnings.push({
        field: 'Ambiente SEFAZ',
        issue: 'Ambiente configurado como HOMOLOGAÇÃO (Sem valor fiscal comercial).',
        resolution: 'Documento será emitido em ambiente de testes da SEFAZ para validação de schema e regras.'
      });
    } else {
      checksOk.push('Ambiente de PRODUÇÃO Nacional ativado');
    }

    return {
      errors,
      warnings,
      checksOk,
      canEmitFiscal: errors.length === 0
    };
  }, [selectedSaleForInspect, currentCompany, db.parts, db.sefazConfig]);

  // Função: Aprovar Conferência e Emitir Documento Fiscal em Homologação
  const handleApproveAndEmit = (sale: CommercialSale) => {
    if (!canEmit) {
      alert('Seu usuário não possui permissão (fiscalEmit) para autorizar e transmitir notas fiscais.');
      return;
    }

    if (validationDiagnosis?.errors.length && validationDiagnosis.errors.length > 0) {
      alert('Não é possível emitir a nota fiscal pois existem inconsistências fiscais impeditivas (🔴 ERROS). Corrija as pendências antes de transmitir.');
      return;
    }

    // Geração do Documento Fiscal em Homologação com Chave de 44 Dígitos
    const now = new Date();
    const yearMonth = now.toISOString().slice(2, 4) + now.toISOString().slice(5, 7);
    const cnpjClean = (currentCompany.cnpj || '12345678000190').replace(/\D/g, '').padStart(14, '0');
    const docNumber = (db.sefazConfig?.nextNfeNumber || 101);
    const paddedDocNum = String(docNumber).padStart(9, '0');
    const randomCode = Math.floor(10000000 + Math.random() * 90000000);
    const accessKey = `35${yearMonth}${cnpjClean}55001${paddedDocNum}1${randomCode}9`;
    const protocolNumber = `135${yearMonth}${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const newFiscalDoc: FiscalDocument = {
      id: `fisc-sale-${sale.id}-${Date.now()}`,
      code: `NFE-${String(docNumber).padStart(6, '0')}`,
      type: 'nfe_product',
      status: 'authorized',
      accessKey,
      protocolNumber,
      issueDate: now.toISOString().slice(0, 10),
      issuedAt: now.toISOString().replace('T', ' ').slice(0, 19),
      createdAt: now.toISOString(),
      companyId: currentCompany.id,
      companyName: currentCompany.name,
      companyCnpj: currentCompany.cnpj || '',
      clientId: sale.clientId,
      clientName: sale.clientName,
      clientCpfCnpj: sale.clientCpfCnpj || '',
      saleId: sale.id,
      saleCode: sale.code,
      receivableId: sale.receivableId,
      cfop: '5.102',
      operationNature: 'VENDA DE MERCADORIA ADQ. DE TERCEIROS',
      totalProducts: sale.subtotal || sale.totalAmount,
      totalServices: 0,
      totalTaxes: (sale.totalAmount * 0.18),
      totalAmount: sale.totalAmount,
      totalIbs: sale.totalAmount * 0.001,
      totalCbs: sale.totalAmount * 0.009,
      totalIbsCbs: sale.totalAmount * 0.010,
      ibsTaxValue: sale.totalAmount * 0.001,
      cbsTaxValue: sale.totalAmount * 0.009,
      sefazStatusMessage: '100 - Autorizado o uso da NF-e (Ambiente de Homologação)',
      environment: db.sefazConfig?.environment || 'homologation',
      items: sale.items.map((it, idx) => ({
        id: `fitem-${sale.id}-${idx}`,
        code: it.partCode || `P-${idx + 1}`,
        name: it.partName,
        ncm: it.ncm || '8708.29.99',
        unit: it.unit || 'UN',
        cstCsosn: '102',
        cfop: '5.102',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        type: 'part' as const,
        icmsRatePercent: 18,
        icmsValue: it.totalPrice * 0.18
      }))
    };

    onUpdateDb(prev => {
      // 1. Atualizar a Venda
      const updatedSales = (prev.sales || []).map(s => {
        if (s.id === sale.id) {
          return {
            ...s,
            fiscalStatus: 'authorized' as const,
            fiscalDocumentId: newFiscalDoc.id,
            fiscalAccessKey: accessKey,
            nfeNumber: newFiscalDoc.code
          };
        }
        return s;
      });

      // 2. Atualizar o Contas a Receber se existir
      const updatedReceivables = (prev.accountsReceivable || []).map(r => {
        if (r.saleId === sale.id || r.code === `CR-${sale.code}`) {
          return {
            ...r,
            nfeId: newFiscalDoc.id,
            nfeCode: newFiscalDoc.code,
            nfeStatus: 'authorized' as any,
            nfeAccessKey: accessKey
          };
        }
        return r;
      });

      // 3. Adicionar Documento Fiscal
      const existingFisc = prev.fiscalDocuments || [];
      const updatedFisc = [newFiscalDoc, ...existingFisc];

      // 4. Incrementar numeração fiscal
      const updatedSefazConfig: SefazApiConfig = {
        ...(prev.sefazConfig || {
          environment: 'homologation',
          certificateStatus: 'VALID_ACTIVE',
          uf: currentCompany.uf || 'SP'
        }),
        nextNfeNumber: docNumber + 1
      };

      return {
        ...prev,
        sales: updatedSales,
        accountsReceivable: updatedReceivables,
        fiscalDocuments: updatedFisc,
        sefazConfig: updatedSefazConfig
      };
    });

    setSelectedSaleForInspect(null);
    setFeedbackMessage(`✅ NF-e ${newFiscalDoc.code} emitida e autorizada com sucesso na SEFAZ (Homologação)! Chave: ${accessKey}`);
    setTimeout(() => setFeedbackMessage(''), 8000);
  };

  // Função: Marcar Venda como Pronta para Emissão
  const handleMarkReadyForEmission = (sale: CommercialSale) => {
    onUpdateDb(prev => ({
      ...prev,
      sales: (prev.sales || []).map(s => {
        if (s.id === sale.id) {
          return { ...s, fiscalStatus: 'ready_for_emission' as const };
        }
        return s;
      })
    }));

    setSelectedSaleForInspect(null);
    setFeedbackMessage(`Venda #${sale.code} marcada como "Pronta para Emissão".`);
    setTimeout(() => setFeedbackMessage(''), 5000);
  };

  // Função: Download XML da NF-e
  const handleDownloadXml = (doc: FiscalDocument) => {
    if (!canXml) {
      alert('Seu usuário não possui permissão para baixar arquivos XML fiscais.');
      return;
    }

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${doc.accessKey}" versao="4.00">
    <ide>
      <cUF>35</cUF>
      <cNF>${Math.floor(10000000 + Math.random() * 90000000)}</cNF>
      <natOp>${doc.operationNature || 'VENDA DE MERCADORIAS'}</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>${doc.code.replace(/\D/g, '') || '101'}</nNF>
      <dhEmi>${doc.issuedAt || new Date().toISOString()}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <tpAmb>${doc.environment === 'production' ? '1' : '2'}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>MotorDesk ERP 4.0</verProc>
    </ide>
    <emit>
      <CNPJ>${(doc.companyCnpj || currentCompany.cnpj || '00000000000100').replace(/\D/g, '')}</CNPJ>
      <xNome>${doc.companyName || currentCompany.name || 'MotorDesk Auto Center'}</xNome>
      <xFant>${currentCompany.tradeName || doc.companyName}</xFant>
      <IE>${currentCompany.stateRegistration || '123456789'}</IE>
      <CRT>${currentCompany.crt || '1'}</CRT>
    </emit>
    <dest>
      <CPF>${(doc.clientCpfCnpj || '00000000000').replace(/\D/g, '')}</CPF>
      <xNome>${doc.clientName || 'Consumidor Final'}</xNome>
      <indIEDest>9</indIEDest>
    </dest>
    <total>
      <ICMSTot>
        <vBC>${(doc.totalProducts || doc.totalAmount).toFixed(2)}</vBC>
        <vICMS>${((doc.totalProducts || doc.totalAmount) * 0.18).toFixed(2)}</vICMS>
        <vProd>${(doc.totalProducts || doc.totalAmount).toFixed(2)}</vProd>
        <vNF>${doc.totalAmount.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <protNFe versao="4.00">
      <infProt>
        <tpAmb>${doc.environment === 'production' ? '1' : '2'}</tpAmb>
        <verAplic>SP_NFE_PL_009</verAplic>
        <chNFe>${doc.accessKey}</chNFe>
        <dhRecbto>${doc.issuedAt || new Date().toISOString()}</dhRecbto>
        <nProt>${doc.protocolNumber || '135260012345678'}</nProt>
        <digVal>z87aB3x69uQW2e01nMK89j2=</digVal>
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso da NF-e</xMotivo>
      </infProt>
    </protNFe>
  </infNFe>
</NFe>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe-${doc.accessKey}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="fiscal-conference-view">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl border border-indigo-100 shadow-2xs">
              ⚖️
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
                Fila de Conferência Fiscal
              </h1>
              <p className="text-xs text-slate-500">
                Auditoria tributária, validação de regras (CFOP, NCM, ICMS, IBS/CBS) e autorização SEFAZ
              </p>
            </div>
          </div>
        </div>

        {/* Ambiente Badge & Quick Action */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            (db.sefazConfig?.environment || currentCompany.sefazEnvironment) === 'production'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              (db.sefazConfig?.environment || currentCompany.sefazEnvironment) === 'production' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`} />
            <span>
              {(db.sefazConfig?.environment || currentCompany.sefazEnvironment) === 'production'
                ? '🟢 SEFAZ Produção Nacional'
                : '🟡 SEFAZ Homologação (Testes)'}
            </span>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('fiscal')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Módulo Fiscal / SEFAZ
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-medium flex items-center justify-between shadow-xs animate-slide-down">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {feedbackMessage}
          </span>
          <button onClick={() => setFeedbackMessage('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards / Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('pending_conference')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'pending_conference'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Aguardando</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 block">
            {kpis.pendingConferenceCount}
          </span>
          <span className="text-[10px] text-amber-700 font-medium">Pendente Conferência</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ready_for_emission')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'ready_for_emission'
              ? 'bg-cyan-50/70 border-cyan-300 ring-2 ring-cyan-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-cyan-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Prontas</span>
            <Send className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <span className="text-xl font-bold font-mono text-cyan-900 block">
            {kpis.readyForEmissionCount}
          </span>
          <span className="text-[10px] text-cyan-700 font-medium">Aptas p/ Transmissão</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('authorized')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'authorized'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Autorizadas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xl font-bold font-mono text-emerald-900 block">
            {kpis.authorizedCount}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">Transmitidas SEFAZ</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Rejeitadas</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <span className="text-xl font-bold font-mono text-rose-900 block">
            {kpis.rejectedCount}
          </span>
          <span className="text-[10px] text-rose-700 font-medium">Inconsistências SEFAZ</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('emit_later')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'emit_later'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Emitir Depois</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 block">
            {kpis.emitLaterCount}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Faturamento Posterior</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Total Faturado</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-base font-bold font-mono text-indigo-900 block truncate">
            R$ {kpis.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-indigo-600 font-medium">{kpis.totalSales} vendas no total</span>
        </button>
      </div>

      {/* Toolbar / Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por venda, cliente ou CPF/CNPJ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Operator Filter */}
          <div>
            <select
              value={operatorFilter}
              onChange={e => setOperatorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="all">Todos os Operadores / Vendedores</option>
              {operators.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Date Start */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              title="Data Inicial"
            />
          </div>

          {/* Date End */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              title="Data Final"
            />
          </div>
        </div>
      </div>

      {/* Main Table: Fila de Conferência */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">Fila Operacional</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">
              {filteredSales.length} registro(s)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Empresa: <strong className="text-slate-700">{currentCompany.tradeName || currentCompany.name}</strong>
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Nenhuma venda encontrada para os filtros selecionados.</p>
            <p className="text-xs">Alterne os filtros acima ou limpe os campos de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Cód. Venda</th>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Cliente / CPF/CNPJ</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status Fiscal</th>
                  <th className="p-3">Doc. Vinculado</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredSales.map(sale => {
                  const fiscalStatus = sale.fiscalStatus || 'pending';
                  const foundDoc = db.fiscalDocuments?.find(
                    d => d.id === sale.fiscalDocumentId || d.accessKey === sale.fiscalAccessKey || d.saleId === sale.id
                  );

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {sale.code}
                      </td>
                      <td className="p-3 text-slate-500 font-mono">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{sale.clientName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{sale.clientCpfCnpj || 'Não Informado'}</div>
                      </td>
                      <td className="p-3 text-slate-600 truncate max-w-[150px]">
                        {sale.createdBy || 'Operador'}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        {fiscalStatus === 'pending_conference' || fiscalStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                            <Clock className="w-3 h-3 text-amber-600" /> Aguardando Conferência
                          </span>
                        ) : fiscalStatus === 'ready_for_emission' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-semibold">
                            <Send className="w-3 h-3 text-cyan-600" /> Pronta p/ Emissão
                          </span>
                        ) : fiscalStatus === 'authorized' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Autorizada SEFAZ
                          </span>
                        ) : fiscalStatus === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-semibold">
                            <XCircle className="w-3 h-3 text-rose-600" /> Rejeitada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                            {fiscalStatus}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {foundDoc ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {foundDoc.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">Pendente</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Conferir */}
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForInspect(sale)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                            title="Abrir Conferência e Diagnóstico Fiscal"
                          >
                            <Eye className="w-3.5 h-3.5" /> Conferir
                          </button>

                          {/* Se já autorizada: Botões de DANFE e XML */}
                          {foundDoc && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedDocForDanfe(foundDoc)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Visualizar / Reimprimir DANFE"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadXml(foundDoc)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Baixar XML Autorizado"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: INSPETOR DE CONFERÊNCIA FISCAL PRÉ-EMISSÃO */}
      {selectedSaleForInspect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-fiscal-inspect">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
                  ⚖️
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    Conferência e Diagnóstico Fiscal • Venda #{selectedSaleForInspect.code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliente: <strong>{selectedSaleForInspect.clientName}</strong> • Total: <strong className="font-mono text-emerald-600">R$ {selectedSaleForInspect.totalAmount.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleForInspect(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Diagnostics */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
              {/* Status Banner de Validação */}
              {validationDiagnosis?.errors.length && validationDiagnosis.errors.length > 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    Inconsistências Encontradas (Emissão Bloqueada)
                  </div>
                  <p className="text-rose-700 text-xs">
                    Existem campos obrigatórios com pendências que impedem a autorização na SEFAZ. Corrija os itens abaixo:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {validationDiagnosis.errors.map((err, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-rose-200 text-rose-900 space-y-0.5">
                        <div className="font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {err.field}: {err.issue}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium pl-3">
                          👉 <strong>Como Corrigir:</strong> {err.resolution}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">Documento Validado e Apto para Transmissão</h4>
                    <p className="text-emerald-700 text-xs">
                      Todos os dados obrigatórios do emitente, destinatário, NCM, CFOP e cálculo tributário passaram no teste de conformidade.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid de Quatro Blocos de Conferência */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. EMITENTE */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" /> 1. Emitente Fiscal
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      🟢 OK
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div><strong>Razão Social:</strong> {currentCompany.name}</div>
                    <div><strong>CNPJ:</strong> {currentCompany.cnpj}</div>
                    <div><strong>Inscrição Estadual:</strong> {currentCompany.stateRegistration || 'Isento'}</div>
                    <div><strong>Regime Tributário:</strong> {currentCompany.taxRegimeLabel || 'Simples Nacional (CRT 1)'}</div>
                    <div><strong>Ambiente SEFAZ:</strong> <span className="font-bold text-amber-700">{db.sefazConfig?.environment === 'production' ? 'Produção' : 'Homologação'}</span></div>
                  </div>
                </div>

                {/* 2. DESTINATÁRIO */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600" /> 2. Destinatário / Tomador
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      🟢 OK
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div><strong>Nome / Razão:</strong> {selectedSaleForInspect.clientName}</div>
                    <div><strong>CPF / CNPJ:</strong> {selectedSaleForInspect.clientCpfCnpj || 'Consumidor Final Não Identificado'}</div>
                    <div><strong>Consumidor Final:</strong> Sim (Operação Presencial / Balcão)</div>
                    <div><strong>UF Destino:</strong> {currentCompany.uf || 'SP'}</div>
                  </div>
                </div>
              </div>

              {/* 3. TABELA DE ITENS / PRODUTOS */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-600" /> 3. Produtos / Peças da Venda
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                    {selectedSaleForInspect.items.length} item(ns)
                  </span>
                </div>
                <table className="w-full text-left text-[11px] border border-slate-200 bg-white rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2">Cód.</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 font-mono">NCM</th>
                      <th className="p-2 font-mono">CFOP</th>
                      <th className="p-2">Qtd</th>
                      <th className="p-2">V. Unit</th>
                      <th className="p-2 font-bold">V. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {selectedSaleForInspect.items.map((it, idx) => {
                      const foundPart = db.parts.find(p => p.id === it.partId);
                      return (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-slate-500">{it.partCode || `P-${idx + 1}`}</td>
                          <td className="p-2 font-medium text-slate-800">{it.partName}</td>
                          <td className="p-2 font-mono font-bold text-indigo-700">{it.ncm || foundPart?.ncm || '8708.29.99'}</td>
                          <td className="p-2 font-mono text-slate-600">5.102</td>
                          <td className="p-2">{it.quantity}</td>
                          <td className="p-2 font-mono">R$ {it.unitPrice.toFixed(2)}</td>
                          <td className="p-2 font-mono font-bold text-slate-900">R$ {it.totalPrice.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 4. TRIBUTAÇÃO E REFORMA TRIBUTÁRIA 2026 */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                <span className="font-bold text-indigo-900 text-xs block">
                  4. Resumo de Tributos & Reforma Tributária 2026 (EC 132/2023)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-slate-500 block text-[10px]">ICMS Padrão (18%)</span>
                    <span className="font-bold font-mono text-slate-800">R$ {(selectedSaleForInspect.totalAmount * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-cyan-700 block text-[10px] font-bold">IBS (0,1% Teste)</span>
                    <span className="font-bold font-mono text-cyan-900">R$ {(selectedSaleForInspect.totalAmount * 0.001).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-indigo-700 block text-[10px] font-bold">CBS (0,9% Teste)</span>
                    <span className="font-bold font-mono text-indigo-900">R$ {(selectedSaleForInspect.totalAmount * 0.009).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-emerald-700 block text-[10px] font-bold">Total da Venda</span>
                    <span className="font-bold font-mono text-emerald-900">R$ {selectedSaleForInspect.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedSaleForInspect(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkReadyForEmission(selectedSaleForInspect)}
                  className="px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Marcar como Pronta
                </button>

                <button
                  type="button"
                  disabled={!validationDiagnosis?.canEmitFiscal}
                  onClick={() => handleApproveAndEmit(selectedSaleForInspect)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    validationDiagnosis?.canEmitFiscal
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprovar & Emitir em Homologação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO DANFE */}
      {selectedDocForDanfe && (
        <FiscalDocumentPrintModal
          isOpen={!!selectedDocForDanfe}
          onClose={() => setSelectedDocForDanfe(null)}
          doc={selectedDocForDanfe}
          companyInfo={currentCompany}
          sefazConfig={db.sefazConfig}
          onDownloadXml={handleDownloadXml}
        />
      )}
    </div>
  );
}
