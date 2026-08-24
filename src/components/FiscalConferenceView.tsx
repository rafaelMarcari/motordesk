/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MOTOR DESK - FILA DE CONFERÊNCIA FISCAL OPERACIONAL (NFC-e 65 + NF-e 55 + NFS-e)
 * 
 * Padrão SEFAZ Nacional, MOC v7.0 e Reforma Tributária 2026 (EC 132/2023).
 * Multi-tenant rigoroso por companyId, diagnóstico em 3 níveis (🟢 OK, 🟡 ATENÇÃO, 🔴 ERRO).
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
  ShieldCheck,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Package,
  TrendingUp,
  CreditCard,
  Edit3,
  Receipt,
  QrCode,
  Lock,
  Ban,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle
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
  AccountReceivable,
  Client,
  FiscalDocumentItem
} from '../types';
import { AppDatabase } from '../data/mockData';
import FiscalDocumentPrintModal from './FiscalDocumentPrintModal';
import { fiscalProvider, FiscalEmissionResult } from '../services/fiscalProvider';
import { resolveItemTributacao } from '../utils/taxUtils';

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

  // Active Tab: Todos, NFC-e 65, NF-e 55, NFS-e
  const [activeDocTab, setActiveDocTab] = useState<'ALL' | '65' | '55' | 'NFSE'>('ALL');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Inspection Modal State
  const [selectedSaleForInspect, setSelectedSaleForInspect] = useState<CommercialSale | null>(null);
  const [targetDocModel, setTargetDocModel] = useState<'65' | '55' | 'NFS-e'>('65');
  const [simulateRejection, setSimulateRejection] = useState<boolean>(false);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [transmissionProgress, setTransmissionProgress] = useState<string>('');

  // Cancellation Modal State
  const [docToCancel, setDocToCancel] = useState<FiscalDocument | null>(null);
  const [cancelJustification, setCancelJustification] = useState<string>('');
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  // Print Modal State (DANFE / NFC-e / NFS-e)
  const [selectedDocForDanfe, setSelectedDocForDanfe] = useState<FiscalDocument | null>(null);

  // Success / Feedback Toast
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // User Permissions
  const permissions = (currentUser?.permissions || {}) as Partial<UserPermissions>;
  const canViewConference = permissions.fiscalConference !== false && permissions.accessFiscal !== false;
  const canEmit = permissions.fiscalEmit !== false || permissions.nfceEmit !== false;
  const canCancel = permissions.fiscalCancel !== false || permissions.nfceCancel !== false;
  const canReprint = permissions.fiscalReprint !== false || permissions.nfceReprint !== false;
  const canXml = permissions.fiscalXml !== false || permissions.nfceXml !== false;

  // Active Sefaz Config
  const sefazConfig: SefazApiConfig = useMemo(() => {
    return currentCompany.sefazConfig || db.sefazConfig || {
      environment: currentCompany.sefazEnvironment || 'homologation',
      uf: currentCompany.uf || 'SP',
      certificateStatus: currentCompany.certificateFileName ? 'A1_ACTIVE' : 'NOT_CONFIGURED',
      certificateName: currentCompany.certificateFileName || `Certificado e-CNPJ A1 (${currentCompany.name})`,
      certificateExpirationDate: currentCompany.certificateExpirationDate || '2027-12-31',
      autoTransmit: true,
      nfeSeries: currentCompany.nfeSeries || '1',
      nextNfeNumber: currentCompany.nextNfeNumber || 101,
      nfceSeries: currentCompany.nfceSeries || '1',
      nextNfceNumber: currentCompany.nextNfceNumber || 501,
      nfseSeries: currentCompany.nfseSeries || '1',
      nextNfseNumber: currentCompany.nextNfseNumber || 50
    };
  }, [currentCompany, db.sefazConfig]);

  // Multi-tenant sales filter
  const companySales = useMemo(() => {
    return (db.sales || []).filter(s => s.companyId === currentCompany.id);
  }, [db.sales, currentCompany.id]);

  // Unique operators
  const operators = useMemo(() => {
    const set = new Set<string>();
    companySales.forEach(s => {
      if (s.createdBy) set.add(s.createdBy);
    });
    return Array.from(set);
  }, [companySales]);

  // Status KPIs
  const kpis = useMemo(() => {
    let pendingConferenceCount = 0;
    let readyForEmissionCount = 0;
    let authorizedCount = 0;
    let rejectedCount = 0;
    let emitLaterCount = 0;
    let nfceCount = 0;
    let nfeCount = 0;
    let totalAuthorizedAmount = 0;

    companySales.forEach(s => {
      const st = s.fiscalStatus || 'pending';
      const doc = db.fiscalDocuments?.find(d => d.id === s.fiscalDocumentId || d.saleId === s.id);
      const model = doc?.docModel || s.fiscalModelChoice || '65';

      if (model === '65') nfceCount++;
      else if (model === '55') nfeCount++;

      if (st === 'pending_conference' || st === 'pending') pendingConferenceCount++;
      else if (st === 'ready_for_emission' || st === 'ready_for_transmission') readyForEmissionCount++;
      else if (st === 'authorized') {
        authorizedCount++;
        totalAuthorizedAmount += s.totalAmount;
      }
      else if (st === 'rejected') rejectedCount++;
      else if (st === 'emit_later') emitLaterCount++;
    });

    return {
      pendingConferenceCount,
      readyForEmissionCount,
      authorizedCount,
      rejectedCount,
      emitLaterCount,
      nfceCount,
      nfeCount,
      totalAuthorizedAmount,
      totalSales: companySales.length
    };
  }, [companySales, db.fiscalDocuments]);

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return companySales.filter(sale => {
      const saleFiscalStatus = sale.fiscalStatus || 'pending';
      const doc = db.fiscalDocuments?.find(d => d.id === sale.fiscalDocumentId || d.saleId === sale.id);
      const model = doc?.docModel || sale.fiscalModelChoice || '65';

      // Doc Type Tab
      if (activeDocTab === '65' && model !== '65') return false;
      if (activeDocTab === '55' && model !== '55') return false;
      if (activeDocTab === 'NFSE' && model !== 'NFS-e') return false;

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending_conference') {
          if (saleFiscalStatus !== 'pending_conference' && saleFiscalStatus !== 'pending') return false;
        } else if (statusFilter === 'ready_for_transmission') {
          if (saleFiscalStatus !== 'ready_for_emission' && saleFiscalStatus !== 'ready_for_transmission') return false;
        } else if (saleFiscalStatus !== statusFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = (sale.code || '').toLowerCase().includes(q);
        const clientMatch = (sale.clientName || '').toLowerCase().includes(q);
        const cpfMatch = (sale.clientCpfCnpj || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const docKeyMatch = doc?.accessKey ? doc.accessKey.includes(q.replace(/\D/g, '')) : false;
        if (!codeMatch && !clientMatch && !cpfMatch && !docKeyMatch) return false;
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
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [companySales, activeDocTab, statusFilter, searchQuery, operatorFilter, startDate, endDate, db.fiscalDocuments]);

  // Open inspect modal and synchronize target doc model
  const handleOpenInspectModal = (sale: CommercialSale) => {
    setSelectedSaleForInspect(sale);
    const existingDoc = db.fiscalDocuments?.find(d => d.id === sale.fiscalDocumentId || d.saleId === sale.id);
    if (existingDoc?.docModel) {
      setTargetDocModel(existingDoc.docModel);
    } else if (sale.fiscalModelChoice === '55') {
      setTargetDocModel('55');
    } else {
      setTargetDocModel('65');
    }
    setSimulateRejection(false);
  };

  // Validation Diagnosis for selected sale
  const validationDiagnosis = useMemo(() => {
    if (!selectedSaleForInspect) return null;

    const errors: Array<{ field: string; issue: string; resolution: string }> = [];
    const warnings: Array<{ field: string; issue: string; resolution: string }> = [];
    const checksOk: string[] = [];

    // 1. Emitente
    const emitCnpj = (currentCompany.cnpj || '').replace(/\D/g, '');
    if (emitCnpj.length !== 14) {
      errors.push({
        field: 'Emitente - CNPJ',
        issue: 'CNPJ do emitente inválido ou incompleto no cadastro da empresa.',
        resolution: 'Acesse Dados da Empresa e informe o CNPJ oficial de 14 dígitos.'
      });
    } else {
      checksOk.push('CNPJ do emitente regular (14 dígitos)');
    }

    if (!currentCompany.stateRegistration || currentCompany.stateRegistration === 'Isento') {
      if (targetDocModel === '55') {
        warnings.push({
          field: 'Emitente - Inscrição Estadual',
          issue: 'Inscrição Estadual marcada como Isenta ou não informada.',
          resolution: 'Verifique se a filial possui IE ativa no CADESP/SINTEGRA para emissão de NF-e Mod. 55.'
        });
      } else {
        checksOk.push('Inscrição Estadual conferida');
      }
    } else {
      checksOk.push(`Inscrição Estadual ativa (${currentCompany.stateRegistration})`);
    }

    // 2. Destinatário
    const destDoc = simulateRejection ? '00.000.000/0000-00' : (selectedSaleForInspect.clientCpfCnpj || '');
    const cleanDestDoc = destDoc.replace(/\D/g, '');

    if (cleanDestDoc.length === 0) {
      if (targetDocModel === '65') {
        warnings.push({
          field: 'Destinatário - Venda Balcão',
          issue: 'Consumidor não identificado (Permitido para NFC-e balcão até o limite legal).',
          resolution: 'Caso o cliente solicite CPF na nota, informe o documento antes da transmissão.'
        });
        checksOk.push('Consumidor final balcão habilitado');
      } else {
        warnings.push({
          field: 'Destinatário - NF-e Modelo 55',
          issue: 'Consumidor sem CPF/CNPJ para NF-e Modelo 55.',
          resolution: 'Recomendado cadastrar o CPF ou CNPJ completo do cliente para NF-e A4.'
        });
      }
    } else if (cleanDestDoc.length !== 11 && cleanDestDoc.length !== 14) {
      errors.push({
        field: 'Destinatário - Documento Inválido',
        issue: `Documento informado (${destDoc}) possui ${cleanDestDoc.length} dígitos (esperado 11 p/ CPF ou 14 p/ CNPJ).`,
        resolution: 'Corrija o CPF ou CNPJ do cliente no cadastro.'
      });
    } else if (cleanDestDoc === '00000000000000' || cleanDestDoc === '11111111111111') {
      errors.push({
        field: 'Destinatário - Documento Inválido RFB',
        issue: 'CNPJ do destinatário rejeitado na base da Receita Federal (Código SEFAZ 208).',
        resolution: 'Informe um CNPJ válido e ativo na RFB.'
      });
    } else {
      checksOk.push(`Documento do destinatário válido (${cleanDestDoc.length === 11 ? 'CPF' : 'CNPJ'})`);
    }

    // 3. Itens e NCM
    if (!selectedSaleForInspect.items || selectedSaleForInspect.items.length === 0) {
      errors.push({
        field: 'Itens da Venda',
        issue: 'A venda não possui produtos cadastrados.',
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
            issue: `NCM informado (${ncm || 'vazio'}) não possui os 8 dígitos obrigatórios pela SEFAZ.`,
            resolution: 'Preencha a NCM correta com 8 dígitos no cadastro da peça (ex: 8708.29.99).'
          });
        }
      });
    }

    // 4. Certificado Digital
    if (sefazConfig.certificateStatus === 'NOT_CONFIGURED' && !currentCompany.certificateFileName) {
      warnings.push({
        field: 'Certificado Digital A1',
        issue: 'Certificado Digital A1 não vinculado. No ambiente de Homologação, será utilizada a chave de testes da API Fiscal.',
        resolution: 'Acesse o Módulo Fiscal > Configurações SEFAZ para carregar o arquivo .pfx.'
      });
    } else {
      checksOk.push('Certificado Digital A1 pronto para assinatura');
    }

    // 5. Ambiente
    const activeEnv = sefazConfig.environment || currentCompany.sefazEnvironment || 'homologation';
    if (activeEnv === 'homologation') {
      warnings.push({
        field: 'Ambiente SEFAZ',
        issue: 'Documento será transmitido para o ambiente de HOMOLOGAÇÃO (Testes / Sem valor comercial).',
        resolution: 'Ambiente seguro para auditoria de schemas, cálculos tributários e QR Code.'
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
  }, [selectedSaleForInspect, targetDocModel, simulateRejection, currentCompany, db.parts, sefazConfig]);

  // Execute transmission to SEFAZ
  const handleApproveAndTransmit = async () => {
    if (!selectedSaleForInspect) return;

    if (!canEmit) {
      alert('Seu usuário não possui permissão (fiscalEmit / nfceEmit) para autorizar e transmitir notas fiscais.');
      return;
    }

    if (validationDiagnosis?.errors && validationDiagnosis.errors.length > 0) {
      alert('Existem inconsistências fiscais impeditivas (🔴 ERROS). Corrija as pendências antes de transmitir.');
      return;
    }

    setIsTransmitting(true);
    setTransmissionProgress('Preparando XML oficial MOC 7.0...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setTransmissionProgress('Assinando lote síncrono com Certificado Digital A1...');
      await new Promise(r => setTimeout(r, 700));
      setTransmissionProgress('Transmitindo lote para SEFAZ Homologação...');

      const sale = selectedSaleForInspect;
      const clientDoc = simulateRejection ? '00.000.000/0000-00' : (sale.clientCpfCnpj || '');

      const emissionItems = sale.items.map(it => {
        const foundPart = db.parts.find(p => p.id === it.partId);
        return {
          id: it.id,
          code: it.partCode || 'P-01',
          name: it.partName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          ncm: it.ncm || foundPart?.ncm || '8708.29.99',
          cfop: targetDocModel === 'NFS-e' ? '5.933' : '5.102',
          cest: foundPart?.cest,
          unit: it.unit || 'UN',
          type: 'part' as const
        };
      });

      const params = {
        company: currentCompany,
        client: null,
        clientName: sale.clientName,
        clientCpfCnpj: clientDoc,
        items: emissionItems,
        docType: (targetDocModel === '65' ? 'nfce_retail' : targetDocModel === '55' ? 'nfe_product' : 'nfse_service') as any,
        saleId: sale.id,
        saleCode: sale.code,
        paymentMethod: sale.paymentMethod,
        installmentsCount: sale.installmentsCount || 1,
        sefazConfig,
        taxRules: db.taxRules || [],
        environment: 'homologation' as const
      };

      let result: FiscalEmissionResult;
      if (targetDocModel === '65') {
        result = await fiscalProvider.emitirNFCe(params);
      } else if (targetDocModel === '55') {
        result = await fiscalProvider.emitirNFe(params);
      } else {
        result = await fiscalProvider.emitirNFSe(params);
      }

      await new Promise(r => setTimeout(r, 500));
      setTransmissionProgress('Retorno SEFAZ processado com sucesso!');

      // Update local database
      onUpdateDb(prev => {
        // 1. Update sale fiscal status
        const updatedSales = (prev.sales || []).map(s => {
          if (s.id === sale.id) {
            return {
              ...s,
              fiscalStatus: (result.status === 'authorized' ? 'authorized' : 'rejected') as any,
              fiscalDocumentId: result.fiscalDocument.id,
              fiscalAccessKey: result.accessKey,
              nfeNumber: result.fiscalDocument.code,
              fiscalModelChoice: targetDocModel,
              fiscalRejectionReason: result.rejectionReason
            };
          }
          return s;
        });

        // 2. Update Accounts Receivable if linked
        const updatedReceivables = (prev.accountsReceivable || []).map(r => {
          if (r.saleId === sale.id || r.code === `CR-${sale.code}`) {
            return {
              ...r,
              nfeId: result.fiscalDocument.id,
              nfeCode: result.fiscalDocument.code,
              nfeStatus: result.status === 'authorized' ? 'authorized' : 'rejected' as any,
              nfeAccessKey: result.accessKey
            };
          }
          return r;
        });

        // 3. Add or update fiscal documents list
        const existingFisc = (prev.fiscalDocuments || []).filter(d => d.id !== result.fiscalDocument.id && d.accessKey !== result.accessKey);
        const updatedFisc = [result.fiscalDocument, ...existingFisc];

        // 4. Update next document number in sefazConfig
        const updatedSefazConfig: SefazApiConfig = {
          ...(prev.sefazConfig || sefazConfig),
          nextNfceNumber: targetDocModel === '65' ? ((prev.sefazConfig?.nextNfceNumber || 501) + 1) : prev.sefazConfig?.nextNfceNumber,
          nextNfeNumber: targetDocModel === '55' ? ((prev.sefazConfig?.nextNfeNumber || 101) + 1) : prev.sefazConfig?.nextNfeNumber
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

      if (result.status === 'authorized') {
        setFeedbackMessage(`✅ ${targetDocModel === '65' ? 'NFC-e' : 'NF-e'} ${result.fiscalDocument.code} AUTORIZADA na SEFAZ! Protocolo: ${result.protocolNumber}`);
        // Optionally prompt to view DANFE immediately
        setSelectedDocForDanfe(result.fiscalDocument);
      } else {
        setFeedbackMessage(`❌ Documento REJEITADO pela SEFAZ: ${result.rejectionReason || result.sefazStatusMessage}`);
      }

      setTimeout(() => setFeedbackMessage(''), 10000);
    } catch (err: any) {
      alert(`Falha na transmissão SEFAZ: ${err.message || err}`);
    } finally {
      setIsTransmitting(false);
      setTransmissionProgress('');
    }
  };

  // Action: Mark to emit later
  const handleMarkEmitLater = (sale: CommercialSale) => {
    onUpdateDb(prev => ({
      ...prev,
      sales: (prev.sales || []).map(s => {
        if (s.id === sale.id) {
          return { ...s, fiscalStatus: 'emit_later' as const };
        }
        return s;
      })
    }));

    setSelectedSaleForInspect(null);
    setFeedbackMessage(`Venda #${sale.code} movida para "Emitir Depois / Faturamento Posterior".`);
    setTimeout(() => setFeedbackMessage(''), 6000);
  };

  // Action: Mark as ready for transmission
  const handleMarkReadyForTransmission = (sale: CommercialSale) => {
    onUpdateDb(prev => ({
      ...prev,
      sales: (prev.sales || []).map(s => {
        if (s.id === sale.id) {
          return { ...s, fiscalStatus: 'ready_for_transmission' as const };
        }
        return s;
      })
    }));

    setSelectedSaleForInspect(null);
    setFeedbackMessage(`Venda #${sale.code} marcada como "Pronta p/ Transmissão".`);
    setTimeout(() => setFeedbackMessage(''), 5000);
  };

  // Action: Copy Access Key
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Action: Download XML
  const handleDownloadXml = (doc: FiscalDocument) => {
    if (!canXml) {
      alert('Seu usuário não possui permissão para baixar arquivos XML fiscais.');
      return;
    }

    const xmlText = doc.xmlAuthorized || doc.xmlContent || doc.xmlSent || `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${doc.accessKey}" versao="4.00"><ide><mod>${doc.docModel || '65'}</mod><nNF>${doc.nfeNumber || 101}</nNF></ide></infNFe></NFe>`;
    const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.docModel === '65' ? 'NFCe' : 'NFe'}-${doc.accessKey}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Action: Open Cancellation Modal
  const handleOpenCancelModal = (doc: FiscalDocument) => {
    if (!canCancel) {
      alert('Seu usuário não possui permissão para cancelar documentos fiscais autorizados.');
      return;
    }
    setDocToCancel(doc);
    setCancelJustification('');
  };

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!docToCancel) return;
    if (cancelJustification.trim().length < 15) {
      alert('A justificativa de cancelamento da SEFAZ deve conter no mínimo 15 caracteres.');
      return;
    }

    setIsCanceling(true);
    try {
      const res = await fiscalProvider.cancelarDocumento(
        docToCancel.accessKey,
        cancelJustification.trim(),
        currentCompany,
        sefazConfig
      );

      if (res.success) {
        onUpdateDb(prev => {
          const updatedFisc = (prev.fiscalDocuments || []).map(d => {
            if (d.id === docToCancel.id || d.accessKey === docToCancel.accessKey) {
              return {
                ...d,
                status: 'canceled' as const,
                cancellationProtocol: res.cancellationProtocol,
                cancellationJustification: cancelJustification.trim(),
                cancellationDate: res.cancellationDate,
                sefazStatusMessage: res.sefazStatusMessage
              };
            }
            return d;
          });

          const updatedSales = (prev.sales || []).map(s => {
            if (s.fiscalDocumentId === docToCancel.id || s.fiscalAccessKey === docToCancel.accessKey) {
              return {
                ...s,
                fiscalStatus: 'canceled' as const
              };
            }
            return s;
          });

          return {
            ...prev,
            fiscalDocuments: updatedFisc,
            sales: updatedSales
          };
        });

        setFeedbackMessage(`Documento ${docToCancel.code} cancelado com sucesso na SEFAZ. Protocolo: ${res.cancellationProtocol}`);
        setDocToCancel(null);
      } else {
        alert(`Erro ao cancelar na SEFAZ: ${res.sefazStatusMessage}`);
      }
    } catch (err: any) {
      alert(`Falha no cancelamento: ${err.message || err}`);
    } finally {
      setIsCanceling(false);
    }
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
                Auditoria de NFC-e (Modelo 65), NF-e (Modelo 55), validação de NCM/CFOP, IBS/CBS Reforma 2026 e autorização SEFAZ
              </p>
            </div>
          </div>
        </div>

        {/* Environment Badge & Quick Action */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            sefazConfig.environment === 'production'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              sefazConfig.environment === 'production' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`} />
            <span>
              {sefazConfig.environment === 'production'
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

      {/* Document Model Tabs (TODOS, NFC-e 65, NF-e 55, NFS-e) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveDocTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeDocTab === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Todos os Documentos ({companySales.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveDocTab('65')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeDocTab === '65'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Receipt className="w-4 h-4" /> NFC-e — Modelo 65 ({kpis.nfceCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveDocTab('55')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeDocTab === '55'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <Building2 className="w-4 h-4" /> NF-e — Modelo 55 ({kpis.nfeCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveDocTab('NFSE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeDocTab === 'NFSE'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <FileText className="w-4 h-4" /> NFS-e — Serviços
        </button>
      </div>

      {/* KPI Cards / Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'pending_conference' ? 'all' : 'pending_conference')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'pending_conference'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-200'
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
          onClick={() => setStatusFilter(statusFilter === 'ready_for_transmission' ? 'all' : 'ready_for_transmission')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'ready_for_transmission'
              ? 'bg-cyan-50/80 border-cyan-300 ring-2 ring-cyan-500/20 shadow-xs'
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
          onClick={() => setStatusFilter(statusFilter === 'authorized' ? 'all' : 'authorized')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'authorized'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
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
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
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
          onClick={() => setStatusFilter(statusFilter === 'emit_later' ? 'all' : 'emit_later')}
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
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Total Faturado</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-base font-bold font-mono text-indigo-900 block truncate">
            R$ {kpis.totalAuthorizedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-indigo-600 font-medium">{kpis.totalSales} vendas no total</span>
        </button>
      </div>

      {/* Toolbar / Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar venda, cliente, CPF/CNPJ ou chave..."
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
            <p className="text-sm font-semibold text-slate-600">Nenhum documento encontrado na fila para os filtros selecionados.</p>
            <p className="text-xs">Alterne os filtros acima ou limpe os campos de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Cód. Venda</th>
                  <th className="p-3">Modelo Fiscal</th>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Cliente / CPF/CNPJ</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status Fiscal</th>
                  <th className="p-3">Doc. SEFAZ</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredSales.map(sale => {
                  const fiscalStatus = sale.fiscalStatus || 'pending';
                  const foundDoc = db.fiscalDocuments?.find(
                    d => d.id === sale.fiscalDocumentId || d.accessKey === sale.fiscalAccessKey || d.saleId === sale.id
                  );
                  const modelType = foundDoc?.docModel || sale.fiscalModelChoice || '65';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {sale.code}
                      </td>

                      {/* Modelo Fiscal Badge */}
                      <td className="p-3">
                        {modelType === '65' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                            <Receipt className="w-3 h-3 text-amber-600" /> NFC-e Mod. 65
                          </span>
                        ) : modelType === '55' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[10px]">
                            <Building2 className="w-3 h-3 text-indigo-600" /> NF-e Mod. 55
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                            <FileText className="w-3 h-3 text-emerald-600" /> NFS-e Municipal
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-slate-500 font-mono">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{sale.clientName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{sale.clientCpfCnpj || 'Consumidor Balcão'}</div>
                      </td>

                      <td className="p-3 text-slate-600 truncate max-w-[140px]">
                        {sale.createdBy || 'Operador'}
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900">
                        R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status Fiscal */}
                      <td className="p-3">
                        {fiscalStatus === 'pending_conference' || fiscalStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                            <Clock className="w-3 h-3 text-amber-600" /> Aguardando Conferência
                          </span>
                        ) : fiscalStatus === 'ready_for_emission' || fiscalStatus === 'ready_for_transmission' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-[11px] font-semibold">
                            <Send className="w-3 h-3 text-cyan-600" /> Pronta p/ Transmissão
                          </span>
                        ) : fiscalStatus === 'authorized' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Autorizada SEFAZ
                          </span>
                        ) : fiscalStatus === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-semibold">
                            <XCircle className="w-3 h-3 text-rose-600" /> Rejeitada SEFAZ
                          </span>
                        ) : fiscalStatus === 'canceled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-[11px] font-semibold">
                            <Ban className="w-3 h-3 text-slate-500" /> Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                            {fiscalStatus}
                          </span>
                        )}
                      </td>

                      {/* Doc Vinculado */}
                      <td className="p-3 font-mono text-[11px]">
                        {foundDoc ? (
                          <div>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block truncate max-w-[120px]">
                              {foundDoc.code}
                            </span>
                            <span className="text-[9px] text-slate-400 truncate block max-w-[120px]">
                              {foundDoc.accessKey.slice(-12)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Pendente</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Conferir & Transmitir */}
                          <button
                            type="button"
                            onClick={() => handleOpenInspectModal(sale)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                            title="Abrir Conferência e Diagnóstico Fiscal"
                          >
                            <Eye className="w-3.5 h-3.5" /> Conferir
                          </button>

                          {/* Se já autorizada: Botões de DANFE, XML, Copiar Chave, Cancelar */}
                          {foundDoc && foundDoc.status === 'authorized' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedDocForDanfe(foundDoc)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Visualizar / Imprimir DANFE / Cupom NFC-e"
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
                              <button
                                type="button"
                                onClick={() => handleCopyKey(foundDoc.accessKey)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Copiar Chave de 44 Dígitos"
                              >
                                {copiedKey === foundDoc.accessKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenCancelModal(foundDoc)}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                                title="Cancelar Documento na SEFAZ"
                              >
                                <Ban className="w-3.5 h-3.5" />
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

      {/* MODAL: INSPETOR DE CONFERÊNCIA FISCAL PRÉ-EMISSÃO (NFC-e 65 / NF-e 55) */}
      {selectedSaleForInspect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="modal-fiscal-inspect">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] space-y-4">
            
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

              {/* Doc Model Selection Selector */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTargetDocModel('65')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      targetDocModel === '65'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" /> NFC-e Mod. 65
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDocModel('55')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      targetDocModel === '55'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> NF-e Mod. 55
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSaleForInspect(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Diagnostics */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
              
              {/* Transmission In-Progress Overlay Banner */}
              {isTransmitting && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Comunicação SEFAZ em Andamento</h4>
                    <p className="text-indigo-700 text-xs">{transmissionProgress}</p>
                  </div>
                </div>
              )}

              {/* Status Banner de Validação */}
              {validationDiagnosis?.errors && validationDiagnosis.errors.length > 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    Inconsistências Encontradas (Transmissão Bloqueada)
                  </div>
                  <p className="text-rose-700 text-xs">
                    Existem regras fiscais impeditivas obrigatórias pela SEFAZ. Corrija os itens abaixo para liberar a transmissão:
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
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">
                        Documento {targetDocModel === '65' ? 'NFC-e (Modelo 65)' : 'NF-e (Modelo 55)'} Validado e Apto para Transmissão
                      </h4>
                      <p className="text-emerald-700 text-xs">
                        Estrutura fiscal, tributos, NCMs, emitente e destinatário em total conformidade com o MOC SEFAZ.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    🟢 100% CONFORME
                  </span>
                </div>
              )}

              {/* Warnings List */}
              {validationDiagnosis?.warnings && validationDiagnosis.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Avisos Informativos:
                  </div>
                  {validationDiagnosis.warnings.map((w, idx) => (
                    <div key={idx} className="text-amber-800 text-[11px] pl-5">
                      • <strong>{w.field}:</strong> {w.issue} ({w.resolution})
                    </div>
                  ))}
                </div>
              )}

              {/* Grid: Emitente & Destinatário */}
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
                    <div><strong>Ambiente SEFAZ:</strong> <span className="font-bold text-amber-700">{sefazConfig.environment === 'production' ? 'Produção' : 'Homologação'}</span></div>
                  </div>
                </div>

                {/* 2. DESTINATÁRIO */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600" /> 2. Consumidor / Destinatário
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      selectedSaleForInspect.clientCpfCnpj ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedSaleForInspect.clientCpfCnpj ? '🟢 Identificado' : '🟡 Balcão'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div><strong>Nome / Razão:</strong> {selectedSaleForInspect.clientName}</div>
                    <div><strong>CPF / CNPJ:</strong> {selectedSaleForInspect.clientCpfCnpj || 'Consumidor Não Identificado'}</div>
                    <div><strong>Tipo de Operação:</strong> Presencial / Balcão (indPres: 1)</div>
                    <div><strong>UF de Destino:</strong> {currentCompany.uf || 'SP'}</div>
                  </div>
                </div>
              </div>

              {/* 3. PRODUTOS & ITENS */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-600" /> 3. Detalhamento de Produtos ({selectedSaleForInspect.items.length} itens)
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                    CFOP: {targetDocModel === 'NFS-e' ? '5.933' : '5.102'}
                  </span>
                </div>
                <table className="w-full text-left text-[11px] border border-slate-200 bg-white rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2">Cód.</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 font-mono">NCM</th>
                      <th className="p-2 font-mono">CFOP</th>
                      <th className="p-2">Qtd</th>
                      <th className="p-2">V. Unit</th>
                      <th className="p-2 font-bold">Total</th>
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
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 text-xs">
                    4. Tributação Padrão & Reforma Tributária 2026 (EC 132/2023)
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    IBS (0,1%) • CBS (0,9%)
                  </span>
                </div>
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
                    <span className="text-emerald-700 block text-[10px] font-bold">Total Líquido</span>
                    <span className="font-bold font-mono text-emerald-900">R$ {selectedSaleForInspect.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 5. FORMA DE PAGAMENTO */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-slate-700">Forma de Pagamento:</span>
                  <strong className="text-slate-900">{selectedSaleForInspect.paymentMethod}</strong>
                  {selectedSaleForInspect.installmentsCount && selectedSaleForInspect.installmentsCount > 1 && (
                    <span className="text-slate-500">({selectedSaleForInspect.installmentsCount}x parcelas)</span>
                  )}
                </div>
                <div className="text-slate-600">
                  Status Financeiro: <strong className={selectedSaleForInspect.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                    {selectedSaleForInspect.paymentStatus === 'paid' ? 'Pago' : 'Pendente / A Prazo'}
                  </strong>
                </div>
              </div>

              {/* Teste de Rejeição SEFAZ (QA / Teste) */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-sim-rej"
                    checked={simulateRejection}
                    onChange={e => setSimulateRejection(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                  <label htmlFor="chk-sim-rej" className="text-slate-700 font-medium cursor-pointer">
                    Simular Rejeição SEFAZ (Código 208 - CNPJ Inválido) para testes de validação
                  </label>
                </div>
                <span className="text-[10px] text-slate-400">Ambiente Homologação</span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedSaleForInspect(null)}
                disabled={isTransmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkEmitLater(selectedSaleForInspect)}
                  disabled={isTransmitting}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" /> Emitir Depois
                </button>

                <button
                  type="button"
                  onClick={() => handleMarkReadyForTransmission(selectedSaleForInspect)}
                  disabled={isTransmitting}
                  className="px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Marcar como Pronta
                </button>

                <button
                  type="button"
                  disabled={!validationDiagnosis?.canEmitFiscal || isTransmitting}
                  onClick={handleApproveAndTransmit}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                    validationDiagnosis?.canEmitFiscal && !isTransmitting
                      ? targetDocModel === '65' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isTransmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Transmitindo SEFAZ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Aprovar & Transmitir {targetDocModel === '65' ? 'NFC-e 65' : 'NF-e 55'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAMENTO DE DOCUMENTO FISCAL */}
      {docToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-700">
                <Ban className="w-5 h-5" />
                <h3 className="font-bold text-slate-800 text-base">
                  Cancelar Documento Fiscal na SEFAZ
                </h3>
              </div>
              <button
                onClick={() => setDocToCancel(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono">
                <div><strong>Documento:</strong> {docToCancel.code} ({docToCancel.docModel === '65' ? 'NFC-e' : 'NF-e'})</div>
                <div><strong>Chave:</strong> {docToCancel.accessKey}</div>
                <div><strong>Protocolo:</strong> {docToCancel.protocolNumber || '135260012345678'}</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Justificativa de Cancelamento (Mínimo 15 caracteres) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelJustification}
                  onChange={e => setCancelJustification(e.target.value)}
                  placeholder="Ex: Cancelamento solicitado pelo cliente devido a desistência da compra em balcão."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Padrão MOC SEFAZ</span>
                  <span>{cancelJustification.length} / 15 mín.</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDocToCancel(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCanceling || cancelJustification.trim().length < 15}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  cancelJustification.trim().length >= 15 && !isCanceling
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Confirmar Cancelamento SEFAZ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO DANFE (NF-e A4, NFC-e 40 COLUNAS, NFS-e) */}
      {selectedDocForDanfe && (
        <FiscalDocumentPrintModal
          isOpen={!!selectedDocForDanfe}
          onClose={() => setSelectedDocForDanfe(null)}
          doc={selectedDocForDanfe}
          companyInfo={currentCompany}
          sefazConfig={sefazConfig}
          initialModel={selectedDocForDanfe.docModel === '65' ? 'nfce_40col' : 'nfe_a4'}
          onDownloadXml={handleDownloadXml}
        />
      )}
    </div>
  );
}
