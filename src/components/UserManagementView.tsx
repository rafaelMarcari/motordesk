/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  Shield, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Settings, 
  RefreshCw, 
  Lock, 
  Unlock,
  Building2, 
  Phone, 
  MessageSquare, 
  Save, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  FileText,
  FileCheck,
  Upload,
  Download,
  Printer,
  Eye,
  UserCheck,
  Layers,
  Sliders,
  Headphones,
  Clock,
  Video,
  PlusCircle,
  ShoppingBag,
  Wrench,
  Zap,
  Package,
  Truck
} from 'lucide-react';
import { User, UserRole, UserPermissions, CompanyInfo, BusinessType } from '../types';
import { AppDatabase } from '../data/mockData';
import { normalizeBusinessType } from '../utils/businessSegmentation';
import PrivacyLgpdModal, { PrivacyLgpdFooter } from './PrivacyLgpdModal';
import OperationResultModal from './OperationResultModal';

interface UserManagementViewProps {
  db: AppDatabase;
  currentUser: User;
  onSaveUsers: (users: User[]) => void;
  onSaveCompanyInfo?: (companyInfo: CompanyInfo) => void;
  onSaveRegisteredCompanies?: (companies: CompanyInfo[], activeCompanyId?: string, newUsers?: User[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  globalModules: { [key: string]: boolean };
  onUpdateGlobalModules: (modules: { [key: string]: boolean }) => void;
  onSwitchActiveCompany?: (companyId: string) => void;
  activeWorkspaceCompanyId?: string;
}

const DEFAULT_LEVEL_PERMISSIONS: { [key in UserRole]: UserPermissions } = {
  admin: {
    accessDashboard: true,
    accessSales: true,
    accessCarriers: true,
    accessClients: true,
    accessVehicles: true,
    accessParts: true,
    accessServices: true,
    accessBudgets: true,
    accessServiceOrders: true,
    accessHistory: true,
    accessReports: true,
    accessUserManagement: true,
    accessQAPanel: true,
    accessQuotations: true,
    accessAccountsReceivable: true,
    accessAccountsPayable: true,
    accessFinancial: true,
    accessFiscal: true,
    accessBoletos: true,
    accessSefaz: true,
    fiscalView: true,
    fiscalEmit: true,
    fiscalCancel: true,
    fiscalConfig: true,
    fiscalReprint: true,
    fiscalXml: true,
    boletoView: true,
    boletoGenerate: true,
    boletoReprint: true,
    boletoConfig: true,
    pixView: true,
    pixConfig: true,
    pixGenerate: true,
    sefazView: true,
    sefazTest: true,
    sefazConfig: true,
    financialView: true,
    financialEntry: true,
    financialConfig: true,
    canEditBudgets: true,
    canCustomizePdf: true,
    canViewOtherStoresStock: true,
    canSellOtherStoresStock: true,
    canViewAllCompaniesHistory: true,
    restrictToOwnSales: false,
  },
  atendente: {
    accessDashboard: true,
    accessSales: true,
    accessCarriers: true,
    accessClients: true,
    accessVehicles: true,
    accessParts: false,
    accessServices: false,
    accessBudgets: true,
    accessServiceOrders: false,
    accessHistory: true,
    accessReports: true,
    accessUserManagement: false,
    accessQAPanel: true,
    accessQuotations: false,
    accessAccountsReceivable: true,
    accessAccountsPayable: false,
    accessFinancial: false,
    accessFiscal: true,
    accessBoletos: true,
    accessSefaz: true,
    fiscalView: true,
    fiscalEmit: true,
    fiscalCancel: false,
    fiscalConfig: false,
    fiscalReprint: true,
    fiscalXml: true,
    boletoView: true,
    boletoGenerate: true,
    boletoReprint: true,
    boletoConfig: false,
    pixView: true,
    pixConfig: false,
    pixGenerate: true,
    sefazView: true,
    sefazTest: false,
    sefazConfig: false,
    financialView: true,
    financialEntry: true,
    financialConfig: false,
    canEditBudgets: true,
    canCustomizePdf: true,
    canViewOtherStoresStock: true,
    canSellOtherStoresStock: false,
    canViewAllCompaniesHistory: false,
    restrictToOwnSales: false,
  },
  mecanico: {
    accessDashboard: true,
    accessSales: false,
    accessCarriers: false,
    accessClients: false,
    accessVehicles: false,
    accessParts: true,
    accessServices: true,
    accessBudgets: false,
    accessServiceOrders: true,
    accessHistory: true,
    accessReports: false,
    accessUserManagement: false,
    accessQAPanel: true,
    accessQuotations: false,
    accessAccountsReceivable: false,
    accessAccountsPayable: false,
    accessFinancial: false,
    accessFiscal: false,
    accessBoletos: false,
    accessSefaz: false,
    fiscalView: false,
    fiscalEmit: false,
    fiscalCancel: false,
    fiscalConfig: false,
    fiscalReprint: false,
    fiscalXml: false,
    boletoView: false,
    boletoGenerate: false,
    boletoReprint: false,
    boletoConfig: false,
    pixView: false,
    pixConfig: false,
    pixGenerate: false,
    sefazView: false,
    sefazTest: false,
    sefazConfig: false,
    financialView: false,
    financialEntry: false,
    financialConfig: false,
    canEditBudgets: false,
    canCustomizePdf: false,
    canViewOtherStoresStock: false,
    canSellOtherStoresStock: false,
    canViewAllCompaniesHistory: false,
    restrictToOwnSales: false,
  },
  qa: {
    accessDashboard: true,
    accessSales: true,
    accessCarriers: true,
    accessClients: true,
    accessVehicles: true,
    accessParts: true,
    accessServices: true,
    accessBudgets: true,
    accessServiceOrders: true,
    accessHistory: true,
    accessReports: true,
    accessUserManagement: true,
    accessQAPanel: true,
    accessQuotations: true,
    accessAccountsReceivable: true,
    accessAccountsPayable: true,
    accessFinancial: true,
    accessFiscal: true,
    accessBoletos: true,
    accessSefaz: true,
    fiscalView: true,
    fiscalEmit: true,
    fiscalCancel: true,
    fiscalConfig: true,
    fiscalReprint: true,
    fiscalXml: true,
    boletoView: true,
    boletoGenerate: true,
    boletoReprint: true,
    boletoConfig: true,
    pixView: true,
    pixConfig: true,
    pixGenerate: true,
    sefazView: true,
    sefazTest: true,
    sefazConfig: true,
    financialView: true,
    financialEntry: true,
    financialConfig: true,
    canEditBudgets: true,
    canCustomizePdf: true,
    canViewOtherStoresStock: true,
    canSellOtherStoresStock: true,
    canViewAllCompaniesHistory: true,
    restrictToOwnSales: false,
  }
};

const PERMISSION_LABEL_MAP: { [K in keyof UserPermissions]: string } = {
  accessDashboard: "Dashboard Geral KPI",
  accessSales: "Vendas & Balcão (PDV / Comércio)",
  accessCarriers: "Cadastro de Transportadoras & Frete",
  restrictToOwnSales: "Restringir aos Próprios Pedidos de Venda (Vendedores)",
  accessClients: "Cadastro de Clientes",
  accessVehicles: "Cadastro de Veículos",
  accessParts: "Controle de Peças e Estoque",
  accessQuotations: "Cotação de Preços & Fornecedores",
  accessServices: "Tabela de Serviços",
  accessBudgets: "Orçamentos Builder",
  accessServiceOrders: "Ordens de Serviço (OS)",
  accessHistory: "Histórico do Veículo (RN007)",
  accessReports: "Relatórios Financeiros (RF015)",
  accessUserManagement: "Controle de Colaboradores",
  accessQAPanel: "Painel Integrado de QA",
  accessNotifications: "Notificações do Sistema",
  accessAccountsReceivable: "Contas a Receber",
  accessAccountsPayable: "Contas a Pagar",
  accessFinancial: "DRE & Caixa Financeiro",
  accessFiscal: "Módulo Fiscal & NF-e",
  accessBoletos: "Módulo de Boletos Bancários",
  accessSefaz: "Comunicação & Status SEFAZ",
  fiscalView: "Fiscal: Visualizar Documentos e DANFE",
  fiscalEmit: "Fiscal: Emitir Novas Notas Fiscais (NF-e / NFC-e)",
  fiscalCancel: "Fiscal: Cancelar Notas Fiscais Autorizadas",
  fiscalConfig: "Fiscal: Configurar Parâmetros Tributários & Regime",
  fiscalReprint: "Fiscal: Reimprimir DANFE / Documentos Fiscais",
  fiscalXml: "Fiscal: Download de Arquivo XML Autorizado",
  boletoView: "Boletos: Visualizar Boletos Gerados",
  boletoGenerate: "Boletos: Gerar Novos Boletos Bancários",
  boletoReprint: "Boletos: Reimprimir e Copiar Linha Digitável",
  boletoConfig: "Boletos: Configurar Conta Bancária e Carteira",
  pixView: "PIX: Visualizar Cobranças PIX",
  pixGenerate: "PIX: Gerar QR Code e Copia e Cola",
  pixConfig: "PIX: Configurar Chaves e Integração Bancária",
  sefazView: "SEFAZ: Consultar Situação e Protocolos",
  sefazTest: "SEFAZ: Executar Testes de Comunicação e Rejeição",
  sefazConfig: "SEFAZ: Configurar Certificado Digital A1 e Ambiente",
  financialView: "Financeiro: Visualizar Lançamentos e DRE",
  financialEntry: "Financeiro: Criar Lançamentos e Baixas",
  financialConfig: "Financeiro: Configurar Regras e Contas",
  canEditBudgets: "Editar Orçamentos Existentes (Adicionar/Alterar Itens e Dados)",
  canCustomizePdf: "Personalizar Layout e Campos do PDF / Relatório",
  canViewOtherStoresStock: "Visualizar Estoque de Outras Lojas/Filiais (Rede)",
  canSellOtherStoresStock: "Realizar Venda / OS de Peças de Outras Lojas/Filiais",
  canViewAllCompaniesHistory: "Visualizar Histórico e Auditoria de Todas as Empresas/Lojas (Rede)"
};

export default function UserManagementView({ 
  db, 
  currentUser, 
  onSaveUsers, 
  onSaveCompanyInfo, 
  onSaveRegisteredCompanies,
  onAddHistoryLog, 
  globalModules, 
  onUpdateGlobalModules,
  onSwitchActiveCompany,
  activeWorkspaceCompanyId
}: UserManagementViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [adminSubView, setAdminSubView] = useState<'users' | 'levels' | 'company' | 'subscription'>('subscription');

  // List of registered multi-tenant companies
  const registeredCompaniesList = db.registeredCompanies && db.registeredCompanies.length > 0
    ? db.registeredCompanies
    : [db.companyInfo];

  // Currently selected company ID in the Combobox
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return db.companyInfo?.id || registeredCompaniesList[0]?.id || 'comp-1';
  });

  // Current company object derived from selectedCompanyId
  const currentCompany = registeredCompaniesList.find(c => c.id === selectedCompanyId) || registeredCompaniesList[0] || db.companyInfo;

  // Unsaved Changes Tracking State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false);
  const [pendingTargetCompanyId, setPendingTargetCompanyId] = useState<string | null>(null);

  // Privacy and LGPD States
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [hasAcceptedUserLgpd, setHasAcceptedUserLgpd] = useState<boolean>(true);
  const [hasAcceptedCompanyLgpd, setHasAcceptedCompanyLgpd] = useState<boolean>(true);

  // New Company Creation Modal
  const [showNewCompanyModal, setShowNewCompanyModal] = useState<boolean>(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompCnpj, setNewCompCnpj] = useState('');
  const [newCompType, setNewCompType] = useState<'matriz' | 'filial'>('matriz');
  const [newCompBusinessType, setNewCompBusinessType] = useState<BusinessType>('OFICINA');
  const [newCompParentMatrizId, setNewCompParentMatrizId] = useState<string>('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompWhatsapp, setNewCompWhatsapp] = useState('');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompAddress, setNewCompAddress] = useState('');
  const [newCompFee, setNewCompFee] = useState(299.90);
  const [newCompLegalRepName, setNewCompLegalRepName] = useState('');
  const [newCompLegalRepCpf, setNewCompLegalRepCpf] = useState('');
  const [newCompLegalRepRg, setNewCompLegalRepRg] = useState('');
  const [newCompLegalRepPhone, setNewCompLegalRepPhone] = useState('');
  const [newCompLegalRepEmail, setNewCompLegalRepEmail] = useState('');
  const [newCompLegalRepAddress, setNewCompLegalRepAddress] = useState('');

  // Local Form State for the selected company
  const [compName, setCompName] = useState(currentCompany?.name || 'MotorDesk Auto Center');
  const [compCnpj, setCompCnpj] = useState(currentCompany?.cnpj || '12.345.678/0001-90');
  const [compType, setCompType] = useState<'matriz' | 'filial'>(currentCompany?.companyType || 'matriz');
  const [compBusinessType, setCompBusinessType] = useState<BusinessType>(currentCompany?.businessType || 'OFICINA');
  const [compParentMatrizId, setCompParentMatrizId] = useState<string>(currentCompany?.parentMatrizId || '');
  const [compWhatsapp, setCompWhatsapp] = useState(currentCompany?.whatsapp || '11987654321');
  const [compPhone, setCompPhone] = useState(currentCompany?.phone || '(11) 3344-5566');
  const [compEmail, setCompEmail] = useState(currentCompany?.email || 'contato@motordesk.com.br');
  const [compAddress, setCompAddress] = useState(currentCompany?.address || 'Av. das Nações Unidas, 1200 - SP');
  const [compWelcome, setCompWelcome] = useState(currentCompany?.welcomeMessage || 'Agradecemos a preferência!');
  const [compLogoUrl, setCompLogoUrl] = useState(currentCompany?.logoUrl || '');

  // Responsável Legal & Contrato de Prestação de Serviços (SaaS) - CONTRATANTE
  const [compLegalRepName, setCompLegalRepName] = useState(currentCompany?.legalRepresentativeName || '');
  const [compLegalRepCpf, setCompLegalRepCpf] = useState(currentCompany?.legalRepresentativeCpf || '');
  const [compLegalRepRg, setCompLegalRepRg] = useState(currentCompany?.legalRepresentativeRg || '');
  const [compLegalRepPhone, setCompLegalRepPhone] = useState(currentCompany?.legalRepresentativePhone || '');
  const [compLegalRepEmail, setCompLegalRepEmail] = useState(currentCompany?.legalRepresentativeEmail || '');
  const [compLegalRepAddress, setCompLegalRepAddress] = useState(currentCompany?.legalRepresentativeAddress || '');
  const [compSignedContractUrl, setCompSignedContractUrl] = useState(currentCompany?.signedContractUrl || '');
  const [compSignedContractFileName, setCompSignedContractFileName] = useState(currentCompany?.signedContractFileName || '');
  const [compSignedContractDate, setCompSignedContractDate] = useState(currentCompany?.signedContractDate || '');
  const [compContractStatus, setCompContractStatus] = useState<'pending' | 'signed'>(currentCompany?.contractStatus || (currentCompany?.signedContractUrl ? 'signed' : 'pending'));
  const [showContractModal, setShowContractModal] = useState(false);
  const [showSignedContractPreviewModal, setShowSignedContractPreviewModal] = useState(false);

  // Dados da CONTRATADA (Fornecedor / Desenvolvedor do Sistema)
  const [compProviderCompanyName, setCompProviderCompanyName] = useState(currentCompany?.providerCompanyName || 'MotorDesk Soluções em Tecnologia e Software LTDA');
  const [compProviderCnpj, setCompProviderCnpj] = useState(currentCompany?.providerCnpj || '12.345.678/0001-90');
  const [compProviderAddress, setCompProviderAddress] = useState(currentCompany?.providerAddress || 'Av. das Nações Unidas, 1200 - Pinheiros, São Paulo - SP');
  const [compProviderLegalRepName, setCompProviderLegalRepName] = useState(currentCompany?.providerLegalRepName || 'Rafael Marcari');
  const [compProviderLegalRepCpf, setCompProviderLegalRepCpf] = useState(currentCompany?.providerLegalRepCpf || '000.000.000-00');
  const [compProviderLegalRepRg, setCompProviderLegalRepRg] = useState(currentCompany?.providerLegalRepRg || 'Desenvolvedor / Proprietário');
  const [compProviderPhone, setCompProviderPhone] = useState(currentCompany?.providerPhone || '(11) 99999-9999');
  const [compProviderEmail, setCompProviderEmail] = useState(currentCompany?.providerEmail || 'contato@motordesk.com.br');

  // Configurações de Reserva de Estoque em Orçamentos
  const [compBudgetStockReservationMode, setCompBudgetStockReservationMode] = useState<'none' | 'reserve_while_valid'>(
    currentCompany?.budgetStockReservationMode || 'reserve_while_valid'
  );
  const [compBudgetStockReservationValidityDays, setCompBudgetStockReservationValidityDays] = useState<number>(
    currentCompany?.budgetStockReservationValidityDays || 10
  );

  // Novas Configurações: Retirada/Entrega, Multiloja e Conferência Fiscal
  const [compEnableWithdrawalAndDelivery, setCompEnableWithdrawalAndDelivery] = useState<boolean>(
    currentCompany?.enableWithdrawalAndDelivery || false
  );
  const [compEnableInterStoreSales, setCompEnableInterStoreSales] = useState<boolean>(
    currentCompany?.enableInterStoreSales || false
  );
  const [compInterStorePaymentMode, setCompInterStorePaymentMode] = useState<'PURCHASE_STORE_ONLY' | 'FULFILLMENT_STORE_ONLY' | 'BOTH'>(
    currentCompany?.interStorePaymentMode || 'BOTH'
  );
  const [compInterStoreFulfillmentMode, setCompInterStoreFulfillmentMode] = useState<'pickup_at_stock_store' | 'transfer_to_origin_store' | 'allow_customer_choice'>(
    currentCompany?.interStoreFulfillmentMode || 'allow_customer_choice'
  );
  const [compRequireAuthorizedFiscalBeforeRelease, setCompRequireAuthorizedFiscalBeforeRelease] = useState<boolean>(
    currentCompany?.requireAuthorizedFiscalBeforeRelease || false
  );

  // Modal de resultado das operações (Sucesso / Erro com botão OK)
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });
  const [invalidFields, setInvalidFields] = useState<{ [key: string]: boolean }>({});

  // Função para imprimir contrato em janela dedicada / popup ou suporte via browser iframe
  const handlePrintContract = () => {
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <title>Contrato MotorDesk - ${compName || 'Empresa'}</title>
            <style>
              @page { size: A4; margin: 20mm; }
              body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.6; color: #0f172a; padding: 30px; margin: 0; background: #fff; }
              .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
              .brand { font-size: 22px; font-weight: 900; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
              .title { font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 8px 0 4px 0; color: #0f172a; }
              .subtitle { font-size: 11px; color: #475569; font-weight: 500; }
              .legal-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 11px; }
              .legal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
              .legal-item { background: #ffffff; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; font-size: 10.5px; }
              .clause-title { font-weight: 800; font-size: 11.5px; margin-top: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; color: #0f172a; text-transform: uppercase; }
              p { margin: 6px 0; text-align: justify; }
              .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; page-break-inside: avoid; }
              .sig-box { flex: 1; text-align: center; font-size: 11px; }
              .sig-line { border-top: 1px solid #0f172a; margin-bottom: 8px; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">MotorDesk Systems</div>
              <div class="title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA DA INFORMAÇÃO, LICENCIAMENTO DE SOFTWARE E SUPORTE TÉCNICO (SaaS)</div>
              <div class="subtitle">Instrumento Particular de Contratação Eletrônica e Licença de Uso de Software</div>
            </div>

            <div class="legal-box">
              <strong style="color: #3730a3; text-transform: uppercase;">Legislação Aplicável e Marco Regulatório:</strong>
              <div class="legal-grid">
                <div class="legal-item"><strong>Lei do Software (nº 9.609/1998):</strong> Licenciamento SaaS e propriedade intelectual.</div>
                <div class="legal-item"><strong>Marco Civil da Internet (nº 12.965/2014):</strong> Guarda responsável de registros na web.</div>
                <div class="legal-item"><strong>LGPD (nº 13.709/2018):</strong> Proteção e privacidade de dados de clientes e veículos.</div>
                <div class="legal-item"><strong>Código Civil (nº 10.406/2002):</strong> Regras de Prestação de Serviços (Art. 593 a 609).</div>
              </div>
            </div>

            <div class="clause-title">1. DAS PARTES CONTRATANTES</div>
            <p><strong>CONTRATADA (FORNECEDOR/DESENVOLVEDOR):</strong> <strong>${compProviderCompanyName || 'MotorDesk Soluções em Tecnologia e Software LTDA'}</strong>, inscrita no CNPJ/MF sob o nº <strong>${compProviderCnpj || '12.345.678/0001-90'}</strong>, estabelecida no endereço <strong>${compProviderAddress || 'Av. das Nações Unidas, 1200 - Pinheiros, São Paulo - SP'}</strong>, representada por seu Responsável Legal <strong>${compProviderLegalRepName || 'Rafael Marcari'}</strong>, CPF nº <strong>${compProviderLegalRepCpf || '000.000.000-00'}</strong>, RG/Cargo <strong>${compProviderLegalRepRg || 'Desenvolvedor / Proprietário'}</strong>, e-mail <strong>${compProviderEmail || 'contato@motordesk.com.br'}</strong>, telefone/WhatsApp <strong>${compProviderPhone || '(11) 99999-9999'}</strong>.</p>
            <p><strong>CONTRATANTE / PROPRIETÁRIO DO SISTEMA:</strong> <strong>${compName || 'NÃO INFORMADA'}</strong>, inscrita no CNPJ/MF sob o nº <strong>${compCnpj || 'NÃO INFORMADO'}</strong>, estabelecida no endereço <strong>${compAddress || 'NÃO INFORMADO'}</strong>, representada neste ato por seu Proprietário / Responsável Legal <strong>${compLegalRepName || 'NÃO INFORMADO'}</strong>, portador(a) do CPF nº <strong>${compLegalRepCpf || 'NÃO INFORMADO'}</strong>, RG nº <strong>${compLegalRepRg || 'NÃO INFORMADO'}</strong>, residente/domiciliado em <strong>${compLegalRepAddress || compAddress || 'NÃO INFORMADO'}</strong>, telefone <strong>${compLegalRepPhone || compWhatsapp || 'NÃO INFORMADO'}</strong>, e-mail <strong>${compLegalRepEmail || compEmail || 'NÃO INFORMADO'}</strong>.</p>

            <div class="clause-title">CLÁUSULA PRIMEIRA - DO OBJETO E LICENCIAMENTO SAAS</div>
            <p>1.1. O presente contrato tem por objeto o licenciamento de uso não exclusivo, temporário e intransferível do sistema de gestão de oficinas mecânicas <strong>MotorDesk</strong> no modelo SaaS (Software as a Service), englobando o Plano Básico e os módulos operacionais adicionais liberados para a CONTRATANTE.</p>
            <p>1.2. A liberação tecnológica dos módulos objeto deste contrato é realizada em tempo real no ambiente da aplicação <strong>MotorDesk</strong>. A ativação ou desativação de módulos reflete diretamente nos menus, relatórios e telas operacionais de todos os colaboradores vinculados à CONTRATANTE.</p>

            <div class="clause-title">ANEXO I - MÓDULOS LIBERADOS E ESPECIFICAÇÃO NA APLICAÇÃO</div>
            <p>Fica expressamente detalhada a composição dos módulos contratados e o status de liberação na aplicação para a CONTRATANTE:</p>

            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin: 10px 0;">
              <strong style="color: #3730a3; font-size: 11px; text-transform: uppercase;">A. Módulos Inclusos no Plano Básico Core (Padrão do Sistema):</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; font-size: 10.5px;">
                <div style="background: #fff; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 600;">✅ Painel Principal / Dashboard KPI</div>
                <div style="background: #fff; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 600;">✅ Cadastro e Gestão de Clientes</div>
                <div style="background: #fff; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 600;">✅ Gestão de Veículos & Histórico</div>
                <div style="background: #fff; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 600;">✅ Tabela de Serviços & Mão de Obra</div>
                <div style="background: #fff; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 600;">✅ Emissão e Impressão de Orçamentos</div>
                <div style="background: #fff; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 600;">✅ Ordens de Serviço (OS) & Oficina</div>
              </div>

              <strong style="color: #3730a3; font-size: 11px; text-transform: uppercase; display: block; margin-top: 12px;">B. Módulos Opcionais - Status de Liberação na Aplicação:</strong>
              <table style="width: 100%; border-collapse: collapse; margin-top: 6px; background: #fff; border: 1px solid #cbd5e1; font-size: 10.5px;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left; color: #334155;">
                    <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Módulo Funcional</th>
                    <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Status de Liberação no Sistema</th>
                    <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Valor Adicional / Mês</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.keys(DEFAULT_OPTIONAL_MODULE_PRICES).map(mKey => {
                    const info = DEFAULT_OPTIONAL_MODULE_PRICES[mKey];
                    const isEnabled = !!companyGlobalModules[mKey];
                    const price = optionalModulePrices[mKey] !== undefined ? optionalModulePrices[mKey] : info.defaultPrice;
                    return `
                      <tr>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: ${isEnabled ? 'bold' : 'normal'}; color: ${isEnabled ? '#0f172a' : '#64748b'};">
                          ${info.label}
                        </td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">
                          <span style="font-weight: bold; color: ${isEnabled ? '#059669' : '#dc2626'};">
                            ${isEnabled ? '✅ LIBERADO E ATIVO NA APLICAÇÃO' : '🔒 BLOQUEADO / NÃO CONTRATADO'}
                          </span>
                        </td>
                        <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace;">
                          ${isEnabled ? `R$ ${price.toFixed(2)}` : 'R$ 0,00'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="clause-title">CLÁUSULA SEGUNDA - DA DISPONIBILIDADE E SUPORTE TÉCNICO (SLA)</div>
            <p>2.1. A CONTRATADA garante o índice de disponibilidade do sistema (uptime) de <strong>99,5% (noventa e nove vírgula cinco por cento)</strong> ao mês.</p>
            <p>2.2. O suporte técnico relativo ao manuseio, esclarecimento de dúvidas e apoio operacional será prestado nos dias úteis e no período comercial estipulado: <strong>${compSupportBusinessHours}</strong>.</p>
            <p>2.3. Os serviços de suporte serão disponibilizados através do número oficial de WhatsApp do desenvolvedor/fornecedor: <strong>${compSupportWhatsapp}</strong>, contemplando envio de mensagens de texto/áudio, chamadas telefônicas diretas e agendamento de reuniões online por vídeo (via Microsoft Teams, Google Meet, Zoom ou aplicativo de conferência equivalente disponível).</p>

            <div class="clause-title">CLÁUSULA TERCEIRA - DA SEGURANÇA E PROTEÇÃO DE DADOS (LGPD)</div>
            <p>3.1. Em observância à <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong>, a CONTRATADA declara que adota medidas técnicas, organizacionais e de criptografia para proteger os dados armazenados.</p>
            <p>3.2. A CONTRATANTE declara-se titular dos dados operacionais e de seus clientes inseridos no sistema, cabendo à CONTRATADA apenas o papel de operadora de dados sob as diretrizes legais.</p>

            <div class="clause-title">CLÁUSULA QUARTA - DOS VALORES, COMPOSIÇÃO MODULAR E PAGAMENTO</div>
            <p>4.1. Pela prestação dos serviços e licença de uso acordada, a CONTRATANTE pagará à CONTRATADA a mensalidade global ajustada no valor de <strong>R$ ${subMonthlyFee.toFixed(2)} (${subMonthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</strong>.</p>
            <p>4.2. A mensalidade é composta pela taxa do Plano Básico (R$ ${basePlanFee.toFixed(2)}) acrescida dos módulos operacionais selecionados. Na eventual inclusão de novos módulos a pedido da CONTRATANTE, será emitido o correspondente <strong>Termo Aditivo ao Contrato</strong> com o devido acréscimo proporcional na mensalidade.</p>
            <p>4.3. O inadimplemento da mensalidade por prazo superior a 15 (quinze) dias poderá acarretar a suspensão temporária dos acessos operacionais ao sistema até a devida regularização.</p>

            <div class="clause-title">CLÁUSULA QUINTA - DA VIGÊNCIA E RESCISÃO</div>
            <p>5.1. Este contrato entra em vigor na data da sua assinatura por prazo indeterminado, podendo ser rescindido por qualquer uma das partes mediante aviso prévio por escrito de no mínimo 30 (trinta) dias, sem incidência de multa rescisória.</p>

            <p style="margin-top: 35px; text-align: center; font-weight: 600;">E por estarem assim justas e contratadas, as partes firmam o presente instrumento legal em formato digital.</p>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <strong>${compProviderCompanyName || 'MotorDesk Soluções em Tecnologia LTDA'}</strong><br/>
                CONTRATADA (CNPJ: ${compProviderCnpj || '12.345.678/0001-90'})<br/>
                Resp. Legal: ${compProviderLegalRepName || 'Rafael Marcari'}<br/>
                CPF: ${compProviderLegalRepCpf || '000.000.000-00'} | Cargo: ${compProviderLegalRepRg || 'Desenvolvedor'}
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <strong>${compName || 'CONTRATANTE'}</strong><br/>
                Proprietário / Resp. Legal: ${compLegalRepName || '__________________________'}<br/>
                CPF: ${compLegalRepCpf || '___________'} | RG: ${compLegalRepRg || '___________'}<br/>
                CNPJ: ${compCnpj || '___________'} | Tel: ${compLegalRepPhone || compWhatsapp || '___________'}
              </div>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handlePrintAddendum = (addendum: any) => {
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const addedModuleListText = (addendum.addedModuleNames || addendum.addedModules || [])
          .map((mName: string) => `<li><strong>${mName}</strong></li>`)
          .join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Aditivo Contratual - ${compName}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1e293b; font-size: 11px; line-height: 1.6; }
              .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; text-align: center; }
              .brand { font-size: 18px; font-weight: 900; color: #3730a3; text-transform: uppercase; letter-spacing: 1px; }
              .title { font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 8px 0 4px 0; color: #0f172a; }
              .subtitle { font-size: 10.5px; color: #475569; font-weight: 500; }
              .addendum-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; margin: 16px 0; }
              .clause-title { font-weight: 800; font-size: 11px; margin-top: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; color: #0f172a; text-transform: uppercase; }
              p { margin: 6px 0; text-align: justify; }
              .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; page-break-inside: avoid; }
              .sig-box { flex: 1; text-align: center; font-size: 10.5px; }
              .sig-line { border-top: 1px solid #0f172a; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin: 12px 0; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 10.5px; }
              th { background-color: #f1f5f9; font-weight: 800; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">MotorDesk Systems</div>
              <div class="title">TERMO ADITIVO AO CONTRATO DE LICENCIAMENTO DE SOFTWARE E SUPORTE TÉCNICO (SaaS)</div>
              <div class="subtitle">Aditivo de Inclusão de Módulo Operacional • Data da Emissão: ${addendum.date || new Date().toLocaleDateString('pt-BR')}</div>
            </div>

            <div class="addendum-box">
              <strong>IDENTIFICAÇÃO DAS PARTES CONTRATANTES:</strong><br/>
              <strong>CONTRATADA:</strong> MotorDesk Soluções em Tecnologia e Software LTDA (CNPJ: 12.345.678/0001-90)<br/>
              <strong>CONTRATANTE / PROPRIETÁRIO:</strong> ${compName || 'NÃO INFORMADA'} (CNPJ: ${compCnpj || 'NÃO INFORMADO'})<br/>
              <strong>PROPRIETÁRIO / RESPONSÁVEL LEGAL:</strong> ${compLegalRepName || 'NÃO INFORMADO'} (CPF: ${compLegalRepCpf || 'NÃO INFORMADO'} | RG: ${compLegalRepRg || 'NÃO INFORMADO'})<br/>
              <strong>CONTATO DO RESPONSÁVEL:</strong> Tel: ${compLegalRepPhone || compWhatsapp || 'NÃO INFORMADO'} | E-mail: ${compLegalRepEmail || compEmail || 'NÃO INFORMADO'} | Endereço: ${compLegalRepAddress || compAddress || 'NÃO INFORMADO'}
            </div>

            <div class="clause-title">CLÁUSULA PRIMEIRA - DO OBJETO DO ADITIVO</div>
            <p>1.1. O presente Termo Aditivo tem por objetivo formalizar a inclusão e a imediata liberação operacional do(s) seguinte(s) módulo(s) opcional(is) na conta do sistema MotorDesk mantida pela CONTRATANTE:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              ${addedModuleListText}
            </ul>

            <div class="clause-title">CLÁUSULA SEGUNDA - DA ADEQUAÇÃO DA MENSALIDADE</div>
            <p>2.1. Em virtude da adição do(s) novo(s) módulo(s) estipulado(s) na Cláusula Primeira, o valor da mensalidade do contrato de prestação de serviços SaaS é readequado nos seguintes termos:</p>
            <table>
              <thead>
                <tr>
                  <th>Descrição da Composição</th>
                  <th>Valor Mensal (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Valor da Mensalidade Contratada Anteriormente</td>
                  <td>R$ ${Number(addendum.previousMonthlyFee || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Valor Adicional do(s) Novo(s) Módulo(s) Incluído(s)</td>
                  <td>+ R$ ${Number(addendum.additionalMonthlyFee || 0).toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f1f5f9; font-weight: bold; color: #3730a3;">
                  <td>NOVO VALOR TOTAL DA MENSALIDADE REAJUSTADA</td>
                  <td>R$ ${Number(addendum.newTotalMonthlyFee || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="clause-title">CLÁUSULA TERCEIRA - DA EXTENSÃO DO SUPORTE TÉCNICO</div>
            <p>3.1. Fica ratificado que a garantia de Suporte Técnico prestada pela CONTRATADA abrange integralmente o(s) novo(s) módulo(s) liberado(s), disponibilizado através do WhatsApp de suporte <strong>${compSupportWhatsapp}</strong> no período comercial (<strong>${compSupportBusinessHours}</strong>) via mensagens, chamadas telefônicas e reuniões virtuais em aplicativos online (Microsoft Teams/Google Meet).</p>

            <div class="clause-title">CLÁUSULA QUARTA - DA RATIFICAÇÃO DO CONTRATO PRINCIPAL</div>
            <p>4.1. Permanecem inalteradas e plenamente válidas todas as demais cláusulas e condições do Contrato Principal de Prestação de Serviços SaaS que não foram expressamente modificadas por este aditivo.</p>

            <p style="margin-top: 35px; text-align: center; font-weight: 600;">E por estarem de perfeito acordo, as partes assinam o presente Termo Aditivo Contratual.</p>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <strong>MotorDesk Soluções em Tecnologia LTDA</strong><br/>
                CONTRATADA (CNPJ: 12.345.678/0001-90)
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <strong>${compName || 'CONTRATANTE'}</strong><br/>
                Resp. Legal: ${compLegalRepName || '__________________________'}<br/>
                CPF: ${compLegalRepCpf || '__________________________'} | CNPJ: ${compCnpj || '__________________________'}
              </div>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 250);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleCreateAddendum = () => {
    if (selectedAddendumModules.length === 0) {
      alert('Por favor, selecione ao menos um módulo para emitir o aditivo.');
      return;
    }

    let additionalTotal = 0;
    const addedNames: string[] = [];

    selectedAddendumModules.forEach(modKey => {
      const price = optionalModulePrices[modKey] !== undefined 
        ? optionalModulePrices[modKey] 
        : DEFAULT_OPTIONAL_MODULE_PRICES[modKey]?.defaultPrice || 0;
      additionalTotal += price;

      const name = DEFAULT_OPTIONAL_MODULE_PRICES[modKey]?.label || modKey;
      addedNames.push(name);
    });

    const previousFee = subMonthlyFee;
    const newTotalFee = Number((previousFee + additionalTotal).toFixed(2));

    // Enable selected modules globally in company state
    const updatedGlobalModules = { ...companyGlobalModules };
    selectedAddendumModules.forEach(modKey => {
      updatedGlobalModules[modKey] = true;
    });
    setCompanyGlobalModules(updatedGlobalModules);

    if (onUpdateGlobalModules) {
      onUpdateGlobalModules(updatedGlobalModules);
    }

    // Update monthly fee
    setSubMonthlyFee(newTotalFee);

    const newAddendum = {
      id: `addendum-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      addedModules: selectedAddendumModules,
      addedModuleNames: addedNames,
      previousMonthlyFee: previousFee,
      additionalMonthlyFee: additionalTotal,
      newTotalMonthlyFee: newTotalFee,
      notes: addendumNotes.trim(),
      signedByClient: true,
      signedDate: new Date().toLocaleString('pt-BR')
    };

    const updatedAddendumsList = [newAddendum, ...contractAddendums];
    setContractAddendums(updatedAddendumsList);

    setShowAddendumModal(false);
    setSelectedAddendumModules([]);
    setAddendumNotes('');
    setHasUnsavedChanges(true);

    // Open PDF print for this newly generated addendum
    handlePrintAddendum(newAddendum);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('A imagem da logomarca deve ter no máximo 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCompLogoUrl(base64);
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignedContractFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert('O arquivo do contrato deve ter no máximo 15MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const nowFormatted = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        setCompSignedContractUrl(base64);
        setCompSignedContractFileName(file.name);
        setCompSignedContractDate(nowFormatted);
        setCompContractStatus('signed');
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Subscription / SaaS Fields for selected company
  const [subStatus, setSubStatus] = useState<'active' | 'blocked' | 'overdue' | 'trial'>(currentCompany?.subscriptionStatus || 'active');
  const [subStartDate, setSubStartDate] = useState(currentCompany?.startDate || '2026-01-01');
  const [subExpirationDate, setSubExpirationDate] = useState(currentCompany?.expirationDate || '2026-12-31');
  const [subMonthlyFee, setSubMonthlyFee] = useState<number>(currentCompany?.monthlyFee || 199.90);
  const [subPaymentStatus, setSubPaymentStatus] = useState<'paid' | 'pending' | 'overdue'>(currentCompany?.paymentStatus || 'paid');
  const [subNotes, setSubNotes] = useState(currentCompany?.notes || '');

  // Support & Contact Information State
  const [compSupportWhatsapp, setCompSupportWhatsapp] = useState(currentCompany?.supportWhatsapp || '(11) 98765-4321');
  const [compSupportBusinessHours, setCompSupportBusinessHours] = useState(currentCompany?.supportBusinessHours || 'Segunda a Sexta-feira das 08h00 às 18h00 e Sábados das 08h00 às 12h00');
  const [compSupportChannelsText, setCompSupportChannelsText] = useState(currentCompany?.supportChannelsText || 'Mensagens (WhatsApp), Ligações telefônicas diretas e Reuniões online (Teams/Meet)');

  // Base Plan & Modular Pricing Settings
  const [basePlanFee, setBasePlanFee] = useState<number>(currentCompany?.basePlanFee ?? 199.90);
  const [customNegotiatedDiscount, setCustomNegotiatedDiscount] = useState<number>(currentCompany?.customNegotiatedDiscount ?? 0.00);

  // Default Optional Module Prices
  const DEFAULT_OPTIONAL_MODULE_PRICES: { [key: string]: { label: string; defaultPrice: number; permKey: keyof UserPermissions } } = {
    accessParts: { label: 'Gestão de Peças & Estoque Avançado', defaultPrice: 39.90, permKey: 'accessParts' },
    accessQuotations: { label: 'Cotação de Preços & Fornecedores', defaultPrice: 29.90, permKey: 'accessQuotations' },
    accessAccountsReceivable: { label: 'Gestão de Contas a Receber', defaultPrice: 29.90, permKey: 'accessAccountsReceivable' },
    accessAccountsPayable: { label: 'Gestão de Contas a Pagar', defaultPrice: 29.90, permKey: 'accessAccountsPayable' },
    accessFinancial: { label: 'Fluxo de Caixa Avançado & DRE', defaultPrice: 49.90, permKey: 'accessFinancial' },
    accessFiscal: { label: 'Emissão Fiscal SEFAZ & Boletos', defaultPrice: 59.90, permKey: 'accessFiscal' },
    accessReports: { label: 'Relatórios Gerenciais & Exportação', defaultPrice: 29.90, permKey: 'accessReports' },
    accessQAPanel: { label: 'Painel QA & Conversor de Migração', defaultPrice: 49.90, permKey: 'accessQAPanel' },
  };

  const [optionalModulePrices, setOptionalModulePrices] = useState<{ [key: string]: number }>(() => {
    return currentCompany?.optionalModulePrices || {
      accessParts: 39.90,
      accessQuotations: 29.90,
      accessAccountsReceivable: 29.90,
      accessAccountsPayable: 29.90,
      accessFinancial: 49.90,
      accessFiscal: 59.90,
      accessReports: 29.90,
      accessQAPanel: 49.90,
    };
  });

  // Global Modules Toggles
  const [companyGlobalModules, setCompanyGlobalModules] = useState<{ [key: string]: boolean }>(() => {
    return currentCompany?.globalModules || {
      accessDashboard: true,
      accessClients: true,
      accessVehicles: true,
      accessServices: true,
      accessBudgets: true,
      accessServiceOrders: true,
      accessHistory: true,
      accessParts: true,
      accessQuotations: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      accessReports: true,
      accessUserManagement: true,
      accessQAPanel: true,
    };
  });

  // Contract Addendums List
  const [contractAddendums, setContractAddendums] = useState<any[]>(currentCompany?.contractAddendums || []);

  // Modal State for Addendum Generation
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [selectedAddendumModules, setSelectedAddendumModules] = useState<string[]>([]);
  const [addendumNotes, setAddendumNotes] = useState('');

  // Permissions by Level for the currently selected company
  const [levelPermissions, setLevelPermissions] = useState<{ [key in UserRole]: UserPermissions }>(() => {
    if (currentCompany?.levelPermissions) {
      return currentCompany.levelPermissions as any;
    }
    const saved = localStorage.getItem(`motordesk_level_permissions_${selectedCompanyId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_LEVEL_PERMISSIONS;
  });

  const [showSaveConfirmationModal, setShowSaveConfirmationModal] = useState(false);
  const [saveModalData, setSaveModalData] = useState<{
    title: string;
    message: string;
    targetType: 'user' | 'level' | 'company' | 'modules' | 'subscription';
    affectedCount?: number;
    userName?: string;
    userRole?: string;
    permissionsList?: string[];
  } | null>(null);

  // Sync state whenever selectedCompanyId changes
  useEffect(() => {
    const comp = registeredCompaniesList.find(c => c.id === selectedCompanyId) || registeredCompaniesList[0];
    if (comp) {
      setCompName(comp.name || '');
      setCompCnpj(comp.cnpj || '');
      setCompType(comp.companyType || 'matriz');
      setCompBusinessType(comp.businessType || 'OFICINA');
      setCompParentMatrizId(comp.parentMatrizId || '');
      setCompWhatsapp(comp.whatsapp || '');
      setCompPhone(comp.phone || '');
      setCompEmail(comp.email || '');
      setCompAddress(comp.address || '');
      setCompWelcome(comp.welcomeMessage || '');
      setCompLogoUrl(comp.logoUrl || '');

      setCompLegalRepName(comp.legalRepresentativeName || '');
      setCompLegalRepCpf(comp.legalRepresentativeCpf || '');
      setCompLegalRepRg(comp.legalRepresentativeRg || '');
      setCompLegalRepPhone(comp.legalRepresentativePhone || '');
      setCompLegalRepEmail(comp.legalRepresentativeEmail || '');
      setCompLegalRepAddress(comp.legalRepresentativeAddress || '');
      setCompSignedContractUrl(comp.signedContractUrl || '');
      setCompSignedContractFileName(comp.signedContractFileName || '');
      setCompSignedContractDate(comp.signedContractDate || '');
      setCompContractStatus(comp.contractStatus || (comp.signedContractUrl ? 'signed' : 'pending'));

      setCompProviderCompanyName(comp.providerCompanyName || 'MotorDesk Soluções em Tecnologia e Software LTDA');
      setCompProviderCnpj(comp.providerCnpj || '12.345.678/0001-90');
      setCompProviderAddress(comp.providerAddress || 'Av. das Nações Unidas, 1200 - Pinheiros, São Paulo - SP');
      setCompProviderLegalRepName(comp.providerLegalRepName || 'Rafael Marcari');
      setCompProviderLegalRepCpf(comp.providerLegalRepCpf || '000.000.000-00');
      setCompProviderLegalRepRg(comp.providerLegalRepRg || 'Desenvolvedor / Proprietário');
      setCompProviderPhone(comp.providerPhone || '(11) 99999-9999');
      setCompProviderEmail(comp.providerEmail || 'contato@motordesk.com.br');

      setSubStatus(comp.subscriptionStatus || 'active');
      setSubStartDate(comp.startDate || '2026-01-01');
      setSubExpirationDate(comp.expirationDate || '2026-12-31');
      setSubMonthlyFee(comp.monthlyFee || 199.90);
      setSubPaymentStatus(comp.paymentStatus || 'paid');
      setSubNotes(comp.notes || '');

      setCompSupportWhatsapp(comp.supportWhatsapp || '(11) 98765-4321');
      setCompSupportBusinessHours(comp.supportBusinessHours || 'Segunda a Sexta-feira das 08h00 às 18h00 e Sábados das 08h00 às 12h00');
      setCompSupportChannelsText(comp.supportChannelsText || 'Mensagens (WhatsApp), Ligações telefônicas e Reuniões online (Teams/Meet)');

      setBasePlanFee(comp.basePlanFee !== undefined ? comp.basePlanFee : 199.90);
      setCustomNegotiatedDiscount(comp.customNegotiatedDiscount || 0);

      if (comp.optionalModulePrices) {
        setOptionalModulePrices(comp.optionalModulePrices);
      } else {
        setOptionalModulePrices({
          accessParts: 39.90,
          accessQuotations: 29.90,
          accessAccountsReceivable: 29.90,
          accessAccountsPayable: 29.90,
          accessFinancial: 49.90,
          accessFiscal: 59.90,
          accessReports: 29.90,
          accessQAPanel: 49.90,
        });
      }

      if (comp.globalModules) {
        setCompanyGlobalModules(comp.globalModules);
      } else {
        setCompanyGlobalModules({
          accessDashboard: true,
          accessClients: true,
          accessVehicles: true,
          accessServices: true,
          accessBudgets: true,
          accessServiceOrders: true,
          accessHistory: true,
          accessParts: true,
          accessQuotations: true,
          accessAccountsReceivable: true,
          accessAccountsPayable: true,
          accessFinancial: true,
          accessFiscal: true,
          accessReports: true,
          accessUserManagement: true,
          accessQAPanel: true,
        });
      }

      setContractAddendums(comp.contractAddendums || []);

      setCompBudgetStockReservationMode(comp.budgetStockReservationMode || 'reserve_while_valid');
      setCompBudgetStockReservationValidityDays(comp.budgetStockReservationValidityDays || 10);
      setCompEnableWithdrawalAndDelivery(comp.enableWithdrawalAndDelivery || false);
      setCompEnableInterStoreSales(comp.enableInterStoreSales || false);
      setCompInterStorePaymentMode(comp.interStorePaymentMode || 'BOTH');
      setCompInterStoreFulfillmentMode(comp.interStoreFulfillmentMode || 'allow_customer_choice');
      setCompRequireAuthorizedFiscalBeforeRelease(comp.requireAuthorizedFiscalBeforeRelease || false);

      if (comp.levelPermissions) {
        setLevelPermissions(comp.levelPermissions as any);
      } else {
        setLevelPermissions(DEFAULT_LEVEL_PERMISSIONS);
      }
      setHasUnsavedChanges(false);
    }
  }, [selectedCompanyId]);

  // Form fields for User creation/edition
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('atendente');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_LEVEL_PERMISSIONS.atendente);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Combobox Switch Handler with Unsaved Changes Intercept
  const handleCompanySelectChange = (targetId: string) => {
    if (targetId === selectedCompanyId) return;

    if (hasUnsavedChanges) {
      setPendingTargetCompanyId(targetId);
      setShowUnsavedChangesModal(true);
      return;
    }

    // Direct switch if clean
    setSelectedCompanyId(targetId);
  };

  // Helper to save current company edits to DB
  const saveCurrentCompanyData = (): CompanyInfo => {
    const updatedCompany: CompanyInfo = {
      ...currentCompany,
      id: selectedCompanyId,
      name: compName,
      cnpj: compCnpj,
      companyType: compType,
      businessType: normalizeBusinessType(compBusinessType),
      parentMatrizId: compType === 'filial' ? compParentMatrizId : undefined,
      phone: compPhone,
      whatsapp: compWhatsapp,
      email: compEmail,
      address: compAddress,
      welcomeMessage: compWelcome,
      logoUrl: compLogoUrl,
      legalRepresentativeName: compLegalRepName,
      legalRepresentativeCpf: compLegalRepCpf,
      legalRepresentativeRg: compLegalRepRg,
      legalRepresentativePhone: compLegalRepPhone,
      legalRepresentativeEmail: compLegalRepEmail,
      legalRepresentativeAddress: compLegalRepAddress,
      signedContractUrl: compSignedContractUrl,
      signedContractFileName: compSignedContractFileName,
      signedContractDate: compSignedContractDate,
      contractStatus: compContractStatus,
      providerCompanyName: compProviderCompanyName,
      providerCnpj: compProviderCnpj,
      providerAddress: compProviderAddress,
      providerLegalRepName: compProviderLegalRepName,
      providerLegalRepCpf: compProviderLegalRepCpf,
      providerLegalRepRg: compProviderLegalRepRg,
      providerPhone: compProviderPhone,
      providerEmail: compProviderEmail,
      subscriptionStatus: subStatus,
      startDate: subStartDate,
      expirationDate: subExpirationDate,
      monthlyFee: subMonthlyFee,
      paymentStatus: subPaymentStatus,
      notes: subNotes,
      basePlanFee: basePlanFee,
      customNegotiatedDiscount: customNegotiatedDiscount,
      optionalModulePrices: optionalModulePrices,
      globalModules: companyGlobalModules,
      supportWhatsapp: compSupportWhatsapp,
      supportBusinessHours: compSupportBusinessHours,
      supportChannelsText: compSupportChannelsText,
      budgetStockReservationMode: compBudgetStockReservationMode,
      budgetStockReservationValidityDays: compBudgetStockReservationValidityDays,
      enableWithdrawalAndDelivery: compEnableWithdrawalAndDelivery,
      enableInterStoreSales: compEnableInterStoreSales,
      interStorePaymentMode: compInterStorePaymentMode,
      interStoreFulfillmentMode: compInterStoreFulfillmentMode,
      requireAuthorizedFiscalBeforeRelease: compRequireAuthorizedFiscalBeforeRelease,
      contractAddendums: contractAddendums,
      levelPermissions: levelPermissions,
      reportPageOrientation: currentCompany?.reportPageOrientation,
      reportCustomOrientations: currentCompany?.reportCustomOrientations,
      registeredAt: currentCompany?.registeredAt || new Date().toISOString()
    };

    const updatedList = registeredCompaniesList.map(c => c.id === selectedCompanyId ? updatedCompany : c);
    if (!updatedList.some(c => c.id === selectedCompanyId)) {
      updatedList.push(updatedCompany);
    }

    if (onSaveRegisteredCompanies) {
      onSaveRegisteredCompanies(updatedList, selectedCompanyId);
    } else if (onSaveCompanyInfo) {
      onSaveCompanyInfo(updatedCompany);
    }

    setHasUnsavedChanges(false);
    return updatedCompany;
  };

  // Modal Actions for Unsaved Changes Prompt
  const handleConfirmSaveAndSwitch = () => {
    saveCurrentCompanyData();
    if (pendingTargetCompanyId) {
      setSelectedCompanyId(pendingTargetCompanyId);
    }
    setShowUnsavedChangesModal(false);
    setPendingTargetCompanyId(null);
  };

  const handleConfirmDiscardAndSwitch = () => {
    if (pendingTargetCompanyId) {
      setSelectedCompanyId(pendingTargetCompanyId);
    }
    setHasUnsavedChanges(false);
    setShowUnsavedChangesModal(false);
    setPendingTargetCompanyId(null);
  };

  const handleCancelCompanySwitch = () => {
    setShowUnsavedChangesModal(false);
    setPendingTargetCompanyId(null);
  };

  // Register New Company Action
  const handleCreateNewCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAcceptedCompanyLgpd) {
      alert('É necessário aceitar os Termos de Privacidade e LGPD para cadastrar uma nova empresa.');
      return;
    }
    if (!newCompName.trim() || !newCompCnpj.trim()) {
      alert('Nome e CNPJ da nova empresa são obrigatórios.');
      return;
    }

    const newCompId = `comp-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);
    const expStr = expDate.toISOString().split('T')[0];

    const newCompanyObj: CompanyInfo = {
      id: newCompId,
      name: newCompName.trim(),
      cnpj: newCompCnpj.trim(),
      companyType: newCompType,
      businessType: normalizeBusinessType(newCompBusinessType),
      parentMatrizId: newCompType === 'filial' ? newCompParentMatrizId : undefined,
      phone: newCompPhone.trim() || '(11) 3000-0000',
      whatsapp: newCompWhatsapp.trim() || '11900000000',
      email: newCompEmail.trim() || 'contato@novaempresa.com.br',
      address: newCompAddress.trim() || 'Endereço Comercial',
      welcomeMessage: 'Agradecemos a preferência!',
      registeredAt: new Date().toISOString(),
      subscriptionStatus: 'active',
      startDate: todayStr,
      expirationDate: expStr,
      monthlyFee: Number(newCompFee) || 299.90,
      paymentStatus: 'paid',
      lastPaymentDate: todayStr,
      legalRepresentativeName: newCompLegalRepName.trim(),
      legalRepresentativeCpf: newCompLegalRepCpf.trim(),
      legalRepresentativeRg: newCompLegalRepRg.trim(),
      legalRepresentativePhone: newCompLegalRepPhone.trim(),
      legalRepresentativeEmail: newCompLegalRepEmail.trim(),
      legalRepresentativeAddress: newCompLegalRepAddress.trim(),
      contractStatus: 'pending',
      levelPermissions: DEFAULT_LEVEL_PERMISSIONS
    };

    const updatedList = [...registeredCompaniesList, newCompanyObj];

    // Automatically create default QA and Admin users with full permissions for the new company
    const newQAUser: User = {
      id: `usr-qa-${Date.now()}`,
      username: 'qa',
      name: `Analista de QA (${newCompanyObj.name})`,
      role: 'qa',
      passwordHash: 'qa123',
      companyId: newCompId,
      permissions: {
        accessDashboard: true,
        accessSales: true,
        accessClients: true,
        accessVehicles: true,
        accessParts: true,
        accessServices: true,
        accessBudgets: true,
        accessServiceOrders: true,
        accessHistory: true,
        accessReports: true,
        accessUserManagement: true,
        accessQAPanel: true,
        accessQuotations: true,
        accessNotifications: true,
        accessAccountsReceivable: true,
        accessAccountsPayable: true,
        accessFinancial: true,
        accessFiscal: true,
        canEditBudgets: true,
      }
    };

    const newAdminUser: User = {
      id: `usr-adm-${Date.now()}`,
      username: 'admin',
      name: `Administrador (${newCompanyObj.name})`,
      role: 'admin',
      passwordHash: 'admin123',
      companyId: newCompId,
      permissions: {
        accessDashboard: true,
        accessSales: true,
        accessClients: true,
        accessVehicles: true,
        accessParts: true,
        accessServices: true,
        accessBudgets: true,
        accessServiceOrders: true,
        accessHistory: true,
        accessReports: true,
        accessUserManagement: true,
        accessQAPanel: true,
        accessQuotations: true,
        accessNotifications: true,
        accessAccountsReceivable: true,
        accessAccountsPayable: true,
        accessFinancial: true,
        accessFiscal: true,
        canEditBudgets: true,
      }
    };

    const initialCompanyUsers = [newQAUser, newAdminUser];

    console.log(`[TRACE-PERSISTENCE] COMPANY CREATE: id=${newCompanyObj.id}, name=${newCompanyObj.name}, cnpj=${newCompanyObj.cnpj}, type=${newCompanyObj.companyType}`);

    if (onSaveRegisteredCompanies) {
      onSaveRegisteredCompanies(updatedList, newCompId, initialCompanyUsers);
    } else {
      const updatedUsersList = [...(db.users || []), ...initialCompanyUsers];
      onSaveUsers(updatedUsersList);
    }

    onAddHistoryLog(
      'system',
      `Nova Empresa Cadastrada: ${newCompanyObj.name}`,
      `Nova empresa contratante "${newCompanyObj.name}" (CNPJ ${newCompanyObj.cnpj}) foi cadastrada. Usuários @admin (senha 'admin123') e @qa (senha 'qa123') criados com acesso master liberado.`,
      '',
      ''
    );

    // Reset Form & Switch Combobox to New Company
    setNewCompName('');
    setNewCompCnpj('');
    setNewCompBusinessType('OFICINA');
    setNewCompPhone('');
    setNewCompWhatsapp('');
    setNewCompEmail('');
    setNewCompAddress('');
    setShowNewCompanyModal(false);
    setSelectedCompanyId(newCompId);
    if (onSwitchActiveCompany) {
      onSwitchActiveCompany(newCompId);
    }
    setSuccessMsg(`Empresa "${newCompanyObj.name}" cadastrada e ativada no workspace com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Quick Action: Register Payment & Renew +30 Days
  const handleRegisterPaymentAndRenew = () => {
    const today = new Date();
    const currExp = new Date(subExpirationDate);
    const startFrom = !isNaN(currExp.getTime()) && currExp > today ? currExp : today;
    
    startFrom.setDate(startFrom.getDate() + 30);
    const newExpStr = startFrom.toISOString().split('T')[0];

    setSubExpirationDate(newExpStr);
    setSubStatus('active');
    setSubPaymentStatus('paid');

    const updatedComp: CompanyInfo = {
      ...currentCompany,
      id: selectedCompanyId,
      name: compName,
      cnpj: compCnpj,
      phone: compPhone,
      whatsapp: compWhatsapp,
      email: compEmail,
      address: compAddress,
      welcomeMessage: compWelcome,
      subscriptionStatus: 'active',
      startDate: subStartDate,
      expirationDate: newExpStr,
      monthlyFee: subMonthlyFee,
      paymentStatus: 'paid',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      notes: subNotes,
      levelPermissions: levelPermissions
    };

    const updatedList = registeredCompaniesList.map(c => c.id === selectedCompanyId ? updatedComp : c);
    if (onSaveRegisteredCompanies) {
      onSaveRegisteredCompanies(updatedList, selectedCompanyId);
    } else if (onSaveCompanyInfo) {
      onSaveCompanyInfo(updatedComp);
    }

    setHasUnsavedChanges(false);

    onAddHistoryLog(
      'payment',
      `Pagamento de Mensalidade Registrado: ${compName}`,
      `Pagamento da mensalidade de R$ ${subMonthlyFee.toFixed(2)} foi confirmado. Validade da assinatura estendida até ${newExpStr}.`,
      '',
      ''
    );

    setSaveModalData({
      title: `Pagamento Confirmado & Assinatura Renovada!`,
      message: `A mensalidade de R$ ${subMonthlyFee.toFixed(2)} foi registrada com sucesso para "${compName}". O acesso aos módulos foi mantido ativado até ${newExpStr}.`,
      targetType: 'subscription'
    });
    setShowSaveConfirmationModal(true);
  };

  // Quick Action: Block Access (Inadimplência)
  const handleBlockCompanyAccess = () => {
    setSubStatus('blocked');
    setSubPaymentStatus('overdue');

    const updatedComp: CompanyInfo = {
      ...currentCompany,
      id: selectedCompanyId,
      name: compName,
      cnpj: compCnpj,
      phone: compPhone,
      whatsapp: compWhatsapp,
      email: compEmail,
      address: compAddress,
      welcomeMessage: compWelcome,
      subscriptionStatus: 'blocked',
      startDate: subStartDate,
      expirationDate: subExpirationDate,
      monthlyFee: subMonthlyFee,
      paymentStatus: 'overdue',
      notes: subNotes,
      levelPermissions: levelPermissions
    };

    const updatedList = registeredCompaniesList.map(c => c.id === selectedCompanyId ? updatedComp : c);
    if (onSaveRegisteredCompanies) {
      onSaveRegisteredCompanies(updatedList, selectedCompanyId);
    } else if (onSaveCompanyInfo) {
      onSaveCompanyInfo(updatedComp);
    }

    setHasUnsavedChanges(false);

    onAddHistoryLog(
      'system',
      `Acesso Suspenso por Inadimplência: ${compName}`,
      `O acesso da empresa "${compName}" aos módulos foi suspenso devido à falta de pagamento da assinatura.`,
      '',
      ''
    );

    setSaveModalData({
      title: `Acesso Suspenso com Sucesso`,
      message: `O acesso da empresa "${compName}" aos módulos foi bloqueado por inadimplência. Os usuários receberão aviso ao tentar operar.`,
      targetType: 'subscription'
    });
    setShowSaveConfirmationModal(true);
  };

  // Level Permissions Toggle
  const saveLevelPermissions = (updated: { [key in UserRole]: UserPermissions }, autoSyncUsers = false, targetRole?: UserRole) => {
    setLevelPermissions(updated);
    setHasUnsavedChanges(true);

    if (autoSyncUsers) {
      const updatedUsers = db.users.map(u => {
        if ((u.companyId || 'comp-1') === selectedCompanyId && (!targetRole || u.role === targetRole)) {
          return {
            ...u,
            permissions: updated[u.role] ? { ...updated[u.role] } : u.permissions
          };
        }
        return u;
      });
      onSaveUsers(updatedUsers);
    }
  };

  const handleSaveSingleLevel = (roleKey: UserRole) => {
    saveLevelPermissions(levelPermissions, true, roleKey);
    saveCurrentCompanyData();

    const rolePerms = levelPermissions[roleKey];
    const affectedUsers = db.users.filter(u => u.role === roleKey);
    const activePermsList = (Object.keys(rolePerms) as (keyof UserPermissions)[])
      .filter(k => rolePerms[k])
      .map(k => PERMISSION_LABEL_MAP[k] || k);

    onAddHistoryLog(
      'user_activity',
      `Configuração Salva: Nível ${roleKey.toUpperCase()} (${compName})`,
      `Definições de permissões do nível "${roleKey.toUpperCase()}" foram gravadas para a empresa "${compName}".`,
      '',
      ''
    );

    setSaveModalData({
      title: `Permissões do Nível ${roleKey.toUpperCase()} Salvas para ${compName}!`,
      message: `As liberações de módulos para o perfil "${roleKey.toUpperCase()}" na empresa "${compName}" foram salvas no banco de dados.`,
      targetType: 'level',
      affectedCount: affectedUsers.length,
      userRole: roleKey.toUpperCase(),
      permissionsList: activePermsList
    });
    setShowSaveConfirmationModal(true);
  };

  const handleSaveAllLevels = () => {
    saveLevelPermissions(levelPermissions, true);
    saveCurrentCompanyData();

    onAddHistoryLog(
      'user_activity',
      `Matriz Geral de Níveis Salva (${compName})`,
      `O administrador "${currentUser.name}" salvou e sincronizou a matriz de permissões por perfil para a empresa "${compName}".`,
      '',
      ''
    );

    setSaveModalData({
      title: `Matriz de Níveis Salva com Sucesso!`,
      message: `As definições de permissões para todos os perfis da empresa "${compName}" foram salvas com sucesso.`,
      targetType: 'level'
    });
    setShowSaveConfirmationModal(true);
  };

  const handleRoleChange = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setPermissions(levelPermissions[selectedRole] || DEFAULT_LEVEL_PERMISSIONS[selectedRole]);
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!hasAcceptedUserLgpd) {
      setErrorMsg('É necessário concordar com os Termos de Privacidade e LGPD para cadastrar ou alterar o operador.');
      return;
    }

    if (!username.trim() || !name.trim()) {
      setErrorMsg('Nome completo e nome de usuário são obrigatórios.');
      return;
    }

    const isUsernameChanged = editingUser ? editingUser.username.toLowerCase() !== username.trim().toLowerCase() : true;
    if (isUsernameChanged) {
      const usernameExists = db.users.some(u => (u.companyId || 'comp-1') === selectedCompanyId && u.username.toLowerCase() === username.trim().toLowerCase());
      if (usernameExists) {
        setErrorMsg(`O nome de usuário "${username}" já está cadastrado nesta empresa.`);
        return;
      }
    }

    let updatedUsersList: User[] = [];

    if (editingUser) {
      const updatedUser: User = {
        ...editingUser,
        username: username.trim().toLowerCase(),
        name: name.trim(),
        role,
        passwordHash: password || editingUser.passwordHash,
        permissions,
        companyId: selectedCompanyId
      };

      updatedUsersList = db.users.map(u => u.id === editingUser.id ? updatedUser : u);
      onSaveUsers(updatedUsersList);

      onAddHistoryLog(
        'user_activity', 
        'Permissões Alteradas', 
        `Nível e permissões do colaborador "${updatedUser.name}" (@${updatedUser.username}) atualizadas na empresa ${compName}.`, 
        '', 
        ''
      );

      const activePermsList = (Object.keys(updatedUser.permissions) as (keyof UserPermissions)[])
        .filter(k => updatedUser.permissions[k])
        .map(k => PERMISSION_LABEL_MAP[k] || k);

      setSaveModalData({
        title: 'Permissões do Usuário Atualizadas!',
        message: `As alterações do colaborador "${updatedUser.name}" foram salvas no banco de dados.`,
        targetType: 'user',
        userName: updatedUser.name,
        userRole: updatedUser.role.toUpperCase(),
        permissionsList: activePermsList
      });
      setShowSaveConfirmationModal(true);
    } else {
      if (!password.trim()) {
        setErrorMsg('Senha inicial é obrigatória para novos operadores.');
        return;
      }

      const newUser: User = {
        id: `usr-${Date.now()}`,
        username: username.trim().toLowerCase(),
        name: name.trim(),
        role,
        passwordHash: password,
        permissions,
        companyId: selectedCompanyId
      };

      updatedUsersList = [...db.users, newUser];
      onSaveUsers(updatedUsersList);

      onAddHistoryLog(
        'user_activity', 
        'Novo Usuário Cadastrado', 
        `Operador ${newUser.name} (@${newUser.username}) adicionado à empresa ${compName}.`, 
        '', 
        ''
      );

      const activePermsList = (Object.keys(newUser.permissions) as (keyof UserPermissions)[])
        .filter(k => newUser.permissions[k])
        .map(k => PERMISSION_LABEL_MAP[k] || k);

      setSaveModalData({
        title: 'Novo Operador Cadastrado!',
        message: `O operador "${newUser.name}" (@${newUser.username}) foi cadastrado para a empresa ${compName}.`,
        targetType: 'user',
        userName: newUser.name,
        userRole: newUser.role.toUpperCase(),
        permissionsList: activePermsList
      });
      setShowSaveConfirmationModal(true);
    }

    setUsername('');
    setName('');
    setPassword('');
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert('Você não pode excluir a sua própria conta logada.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o operador "${userName}"? Ele perderá o acesso a esta empresa.`)) {
      const updatedUsers = db.users.filter(u => u.id !== userId);
      onSaveUsers(updatedUsers);
      onAddHistoryLog(
        'user_activity',
        'Operador Excluído',
        `O operador "${userName}" foi desvinculado e excluído do cadastro da empresa "${compName}".`,
        '',
        ''
      );
      setSuccessMsg(`Operador "${userName}" removido com sucesso.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="user-management-view-container">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">
            Gestão Multi-Empresa & Módulos SaaS
          </h1>
          <p className="text-sm text-slate-500">
            Liberação de módulos por perfil e controle de assinaturas por empresa contratante.
          </p>
        </div>

        {/* Action Button */}
        {adminSubView === 'users' && !isFormOpen && (
          <button 
            id="btn-add-user"
            onClick={() => {
              setEditingUser(null);
              setName('');
              setUsername('');
              setPassword('');
              setRole('atendente');
              setPermissions(levelPermissions['atendente'] || DEFAULT_LEVEL_PERMISSIONS.atendente);
              setIsFormOpen(true);
            }} 
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Cadastrar Operador
          </button>
        )}
      </div>

      {/* MULTI-TENANT COMPANY SELECTOR COMBOBOX (REQUISITO PRINCIPAL) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-indigo-900/40 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Empresa Contratante (Tenant)
              </span>
              {hasUnsavedChanges && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Alterações não salvas
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold font-display text-white">
              {currentCompany?.name || 'Selecione uma Empresa'}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Combobox Selection Dropdown */}
            <div className="relative min-w-[280px]">
              <label htmlFor="company-combobox-select" className="sr-only">Selecione a Empresa</label>
              <select
                id="company-combobox-select"
                value={selectedCompanyId}
                onChange={(e) => handleCompanySelectChange(e.target.value)}
                className="w-full bg-slate-800/90 border border-indigo-700/60 text-white text-xs font-semibold px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-hidden cursor-pointer shadow-inner appearance-none pr-10"
              >
                {registeredCompaniesList.map((comp) => (
                  <option key={comp.id} value={comp.id} className="bg-slate-900 text-white py-2">
                    {comp.name} {comp.subscriptionStatus === 'blocked' ? '🔒 (Bloqueado)' : '✅ (Ativo)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-indigo-300 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Button to Add New Company */}
            <button
              type="button"
              id="btn-open-new-company-modal"
              onClick={() => setShowNewCompanyModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Empresa
            </button>
          </div>
        </div>

        {/* Selected Company Status Badge Summary */}
        <div className="pt-2 border-t border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
              CNPJ: <strong className="text-white font-mono">{compCnpj || 'Não informado'}</strong>
            </span>
            
            {/* Segment Badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5 ${
              compBusinessType === 'COMERCIO' 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : compBusinessType === 'OFICINA_COMERCIO' 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
            }`}>
              {compBusinessType === 'COMERCIO' && <ShoppingBag className="w-3 h-3 text-emerald-400" />}
              {compBusinessType === 'OFICINA_COMERCIO' && <Building2 className="w-3 h-3 text-amber-400" />}
              {compBusinessType === 'OFICINA' && <Wrench className="w-3 h-3 text-indigo-400" />}
              {compBusinessType === 'COMERCIO' ? 'Comércio & Autopeças' : compBusinessType === 'OFICINA_COMERCIO' ? 'Oficina + Comércio Híbrido' : 'Oficina Mecânica'}
            </span>

            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Validade: <strong className="text-white font-mono">{subExpirationDate || 'Sem data'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchActiveCompany && (
              selectedCompanyId === activeWorkspaceCompanyId ? (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Workspace Ativo
                </span>
              ) : (
                <button
                  type="button"
                  id="btn-activate-company-workspace"
                  onClick={() => onSwitchActiveCompany(selectedCompanyId)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Mudar o sistema para trabalhar com esta empresa"
                >
                  <Zap className="w-3.5 h-3.5" /> Alternar Workspace
                </button>
              )
            )}

            {subStatus === 'blocked' || subPaymentStatus === 'overdue' ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3 text-rose-400" /> Bloqueado (Inadimplente)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Unlock className="w-3 h-3 text-emerald-400" /> Liberado / Em Dia
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subview Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-0.5" id="user-subview-selector">
        <button 
          id="btn-subview-subscription"
          type="button"
          onClick={() => { setAdminSubView('subscription'); setIsFormOpen(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            adminSubView === 'subscription' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Gestão de Assinatura & Inadimplência
        </button>
        <button 
          id="btn-subview-levels"
          type="button"
          onClick={() => { setAdminSubView('levels'); setIsFormOpen(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            adminSubView === 'levels' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="w-4 h-4" /> Liberação de Módulos por Perfil
        </button>
        <button 
          id="btn-subview-users"
          type="button"
          onClick={() => { setAdminSubView('users'); setIsFormOpen(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            adminSubView === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" /> Operadores da Empresa ({db.users.filter(u => !u.companyId || u.companyId === selectedCompanyId).length})
        </button>
        <button 
          id="btn-subview-company"
          type="button"
          onClick={() => { setAdminSubView('company'); setIsFormOpen(false); }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            adminSubView === 'company' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building2 className="w-4 h-4" /> Dados da Oficina & WhatsApp
        </button>
      </div>

      {successMsg && (
        <div id="user-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl flex items-center gap-2 border border-emerald-200 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* 1. SAAS SUBSCRIPTION & ACCESS LOCK MANAGEMENT VIEW */}
      {adminSubView === 'subscription' && (
        <div className="space-y-6 animate-fade-in" id="saas-subscription-panel">
          {/* TOP CARD: VIGÊNCIA DA LICENÇA, VALIDADE E DOCUMENTOS CONTRATUAIS */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Controle de Licença, Validade e Ações da Assinatura SaaS
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure a vigência, emita o contrato principal, aditivos de novos módulos e controle o acesso da empresa <strong className="text-slate-700">{compName}</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-print-main-contract"
                  onClick={handlePrintContract}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Imprimir ou baixar PDF do Contrato Principal de Prestação de Serviços"
                >
                  <Printer className="w-4 h-4 text-indigo-300" /> Contrato Principal (PDF)
                </button>

                <button
                  type="button"
                  id="btn-open-addendum-modal"
                  onClick={() => setShowAddendumModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Inclusão de novos módulos para o cliente e emissão de termo aditivo"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-200" /> Emitir Aditivo de Módulo (PDF)
                </button>

                <button
                  type="button"
                  id="btn-renew-payment-30days"
                  onClick={handleRegisterPaymentAndRenew}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Registrar pagamento e prorrogar validade em +30 dias"
                >
                  <DollarSign className="w-4 h-4" /> Registrar Pagamento (+30 Dias)
                </button>

                {subStatus === 'blocked' ? (
                  <button
                    type="button"
                    id="btn-unblock-access"
                    onClick={() => {
                      setSubStatus('active');
                      setSubPaymentStatus('paid');
                      setHasUnsavedChanges(true);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" /> Desbloquear Acesso
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-block-access-overdue"
                    onClick={handleBlockCompanyAccess}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Lock className="w-4 h-4" /> Bloquear Acesso (Inadimplente)
                  </button>
                )}
              </div>
            </div>

            <form 
              id="form-subscription-settings"
              onSubmit={(e) => {
                e.preventDefault();
                saveCurrentCompanyData();
                setSaveModalData({
                  title: 'Parâmetros de Assinatura Salvos!',
                  message: `As datas do contrato e o status de faturamento da empresa "${compName}" foram salvas no sistema com sucesso.`,
                  targetType: 'subscription'
                });
                setShowSaveConfirmationModal(true);
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Data Início e Término */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Vigência da Licença de Uso
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="sub-start-date">
                    Data de Início do Uso *
                  </label>
                  <input
                    id="sub-start-date"
                    type="date"
                    required
                    value={subStartDate}
                    onChange={(e) => {
                      setSubStartDate(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="sub-expiration-date">
                    Data de Término / Validade *
                  </label>
                  <input
                    id="sub-expiration-date"
                    type="date"
                    required
                    value={subExpirationDate}
                    onChange={(e) => {
                      setSubExpirationDate(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-indigo-900"
                  />
                  <p className="text-[10px] text-slate-400">Após esta data, os usuários receberão alertas de vencimento ou bloqueio de tela.</p>
                </div>
              </div>

              {/* Status do Acesso e Mensalidade Vigente */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-600" /> Status de Acesso & Mensalidade Vigente
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="sub-status-select">
                    Situação da Liberação do Sistema *
                  </label>
                  <select
                    id="sub-status-select"
                    value={subStatus}
                    onChange={(e) => {
                      setSubStatus(e.target.value as any);
                      setHasUnsavedChanges(true);
                    }}
                    className={`w-full text-xs p-2.5 border rounded-lg font-bold ${
                      subStatus === 'blocked' 
                        ? 'bg-rose-50 border-rose-300 text-rose-800' 
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="active">Ativo (Módulos Liberados)</option>
                    <option value="blocked">Bloqueado por Inadimplência</option>
                    <option value="overdue">Atrasado (Com Aviso de Vencimento)</option>
                    <option value="trial">Período de Testes (Trial)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between" htmlFor="sub-fee-input">
                    <span>Valor Vigente da Mensalidade (R$) *</span>
                    <span className="text-[10px] text-indigo-600 font-bold">Acordo Oficial</span>
                  </label>
                  <input
                    id="sub-fee-input"
                    type="number"
                    step="0.01"
                    required
                    value={subMonthlyFee}
                    onChange={(e) => {
                      setSubMonthlyFee(Number(e.target.value));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="sub-payment-status">
                    Status do Pagamento
                  </label>
                  <select
                    id="sub-payment-status"
                    value={subPaymentStatus}
                    onChange={(e) => {
                      setSubPaymentStatus(e.target.value as any);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-semibold"
                  >
                    <option value="paid">Em Dia / Pago</option>
                    <option value="pending">Pendente (Aguardando)</option>
                    <option value="overdue">Em Atraso / Vencido</option>
                  </select>
                </div>
              </div>

              {/* Observações Contratuais */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-600" /> Anotações do Contrato SaaS
                  </h4>
                  <textarea
                    rows={4}
                    value={subNotes}
                    onChange={(e) => {
                      setSubNotes(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Ex: Contrato fechado em 12 parcelas mensais via PIX. Inclui módulo estendido de fiscal e estoque."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-save-subscription-settings"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-2"
                >
                  <Save className="w-4 h-4" /> Salvar Parâmetros da Assinatura
                </button>
              </div>
            </form>
          </div>

          {/* CARD 2: PRECIFICAÇÃO MODULAR & NEGOCIAÇÃO COM O CLIENTE */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-800 font-display">
                    Precificação Modular & Composição de Valores — <span className="text-indigo-600">{compName}</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Defina o preço básico do sistema e ajuste o valor individual de cada módulo opcional conforme negociação com o cliente. A liberação de novos módulos aumenta a mensalidade.
                </p>
              </div>

              {/* Box de Resumo da Calculadora */}
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center gap-4 shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block">Mensalidade Calculada</span>
                  <span className="text-lg font-extrabold text-indigo-900 font-mono">
                    R$ {(() => {
                      let tot = basePlanFee;
                      Object.keys(DEFAULT_OPTIONAL_MODULE_PRICES).forEach(mKey => {
                        if (companyGlobalModules[mKey]) {
                          tot += (optionalModulePrices[mKey] !== undefined ? optionalModulePrices[mKey] : DEFAULT_OPTIONAL_MODULE_PRICES[mKey].defaultPrice);
                        }
                      });
                      tot -= customNegotiatedDiscount;
                      return Math.max(0, tot).toFixed(2);
                    })()}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-apply-calculated-fee"
                  onClick={() => {
                    let tot = basePlanFee;
                    Object.keys(DEFAULT_OPTIONAL_MODULE_PRICES).forEach(mKey => {
                      if (companyGlobalModules[mKey]) {
                        tot += (optionalModulePrices[mKey] !== undefined ? optionalModulePrices[mKey] : DEFAULT_OPTIONAL_MODULE_PRICES[mKey].defaultPrice);
                      }
                    });
                    tot -= customNegotiatedDiscount;
                    const finalFee = Number(Math.max(0, tot).toFixed(2));
                    setSubMonthlyFee(finalFee);
                    setHasUnsavedChanges(true);
                    alert(`Valor calculado (R$ ${finalFee.toFixed(2)}) aplicado à mensalidade oficial! Clique em "Salvar Parâmetros da Assinatura" para gravar.`);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar Valor
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna 1: Plano Básico e Desconto */}
              <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Plano Básico (Core Operacional)
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Inclui as funcionalidades essenciais para o funcionamento básico da oficina: Dashboard, Clientes, Veículos, Tabela de Serviços, Orçamentos, Ordens de Serviço e Histórico do Veículo.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="base-plan-fee-input">
                    Preço Base do Plano Básico (R$)
                  </label>
                  <input
                    id="base-plan-fee-input"
                    type="number"
                    step="0.01"
                    value={basePlanFee}
                    onChange={(e) => {
                      setBasePlanFee(Number(e.target.value));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">Preço padrão negociado: R$ 199,90/mês.</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="negotiated-discount-input">
                    Desconto Comercial Negociado (R$)
                  </label>
                  <input
                    id="negotiated-discount-input"
                    type="number"
                    step="0.01"
                    value={customNegotiatedDiscount}
                    onChange={(e) => {
                      setCustomNegotiatedDiscount(Number(e.target.value));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-emerald-700"
                  />
                  <p className="text-[10px] text-slate-400">Abatimento especial de fidelidade ou negociação corporativa.</p>
                </div>
              </div>

              {/* Coluna 2 e 3: Tabela de Módulos Opcionais com Preço e Toggle */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Sliders className="w-4 h-4 text-indigo-600" /> Módulos Opcionais que Elevam a Mensalidade</span>
                  <span className="text-[11px] text-slate-400 font-normal">Preços por módulo personalizáveis por cliente</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                  {Object.keys(DEFAULT_OPTIONAL_MODULE_PRICES).map((modKey) => {
                    const info = DEFAULT_OPTIONAL_MODULE_PRICES[modKey];
                    const isEnabled = !!companyGlobalModules[modKey];
                    const currentPrice = optionalModulePrices[modKey] !== undefined ? optionalModulePrices[modKey] : info.defaultPrice;

                    return (
                      <div 
                        key={modKey}
                        className={`p-3 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                          isEnabled 
                            ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs' 
                            : 'bg-white border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-800">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                setCompanyGlobalModules({
                                  ...companyGlobalModules,
                                  [modKey]: e.target.checked
                                });
                                setHasUnsavedChanges(true);
                              }}
                              className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>{info.label}</span>
                          </label>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isEnabled ? 'Liberado' : 'Não Contratado'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="text-[11px] text-slate-500">Valor Adicional Mês:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-400 text-[11px]">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={currentPrice}
                              onChange={(e) => {
                                setOptionalModulePrices({
                                  ...optionalModulePrices,
                                  [modKey]: Number(e.target.value)
                                });
                                setHasUnsavedChanges(true);
                              }}
                              className="w-20 text-xs p-1 border border-slate-200 rounded-md bg-white font-mono font-bold text-slate-900 text-right"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: SUPORTE TÉCNICO & CANAIS NO CONTRATO */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-600" />
                Cláusula de Suporte Técnico & Canais de Atendimento
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Defina o número do WhatsApp de suporte, horário comercial e canais garantidos que constarão no contrato e nos aditivos de prestação de serviços.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1" htmlFor="support-whatsapp-input">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp de Suporte Técnico *
                </label>
                <input
                  id="support-whatsapp-input"
                  type="text"
                  required
                  value={compSupportWhatsapp}
                  onChange={(e) => {
                    setCompSupportWhatsapp(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="(11) 98765-4321"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                />
                <p className="text-[10px] text-slate-400">Inserido diretamente nas cláusulas do contrato em PDF.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1" htmlFor="support-hours-input">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Período Comercial de Atendimento *
                </label>
                <input
                  id="support-hours-input"
                  type="text"
                  required
                  value={compSupportBusinessHours}
                  onChange={(e) => {
                    setCompSupportBusinessHours(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Segunda a Sexta-feira das 08h00 às 18h00 e Sábados das 08h00 às 12h00"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                />
                <p className="text-[10px] text-slate-400">Horário de funcionamento do atendimento técnico.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1" htmlFor="support-channels-input">
                  <Video className="w-3.5 h-3.5 text-purple-600" /> Canais Previstos no Contrato
                </label>
                <input
                  id="support-channels-input"
                  type="text"
                  value={compSupportChannelsText}
                  onChange={(e) => {
                    setCompSupportChannelsText(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Mensagens (WhatsApp), Ligações telefônicas e Reuniões online (Teams/Meet)"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                />
                <p className="text-[10px] text-slate-400">WhatsApp, telefone e reuniões por vídeo (Teams, Meet, Zoom).</p>
              </div>
            </div>

            {/* Badges de Destaque dos Canais de Suporte */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-around gap-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><MessageSquare className="w-4 h-4" /></div>
                <div>
                  <span className="block text-slate-800 font-bold">Mensagens & Áudio</span>
                  <span className="text-[10px] text-slate-500">Atendimento ágil via WhatsApp</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Phone className="w-4 h-4" /></div>
                <div>
                  <span className="block text-slate-800 font-bold">Ligações Diretas</span>
                  <span className="text-[10px] text-slate-500">Suporte por chamada de voz</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><Video className="w-4 h-4" /></div>
                <div>
                  <span className="block text-slate-800 font-bold">Reuniões de Vídeo</span>
                  <span className="text-[10px] text-slate-500">Microsoft Teams / Google Meet</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: HISTÓRICO DE ADITIVOS CONTRATUAIS EMITIDOS */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Histórico de Aditivos Contratuais de Módulos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Termos aditivos gerados para inclusão de novos módulos para a empresa <strong className="text-slate-700">{compName}</strong>.
                </p>
              </div>

              <button
                type="button"
                id="btn-addendum-modal-trigger"
                onClick={() => setShowAddendumModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Novo Aditivo de Módulo
              </button>
            </div>

            {contractAddendums.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Nenhum termo aditivo emitido até o momento para esta empresa.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Quando o cliente solicitar novos módulos, clique em "Novo Aditivo de Módulo" para emitir o termo e readequar a mensalidade.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Módulos Incluídos</th>
                      <th className="p-3">Mensalidade Anterior</th>
                      <th className="p-3">Adicional Mês</th>
                      <th className="p-3">Nova Mensalidade</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contractAddendums.map((add) => (
                      <tr key={add.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-slate-800">{add.date}</td>
                        <td className="p-3 text-slate-700 font-medium">
                          {(add.addedModuleNames || add.addedModules || []).join(', ')}
                        </td>
                        <td className="p-3 font-mono text-slate-500">R$ {Number(add.previousMonthlyFee || 0).toFixed(2)}</td>
                        <td className="p-3 font-mono text-emerald-600 font-bold">+ R$ {Number(add.additionalMonthlyFee || 0).toFixed(2)}</td>
                        <td className="p-3 font-mono text-indigo-900 font-extrabold">R$ {Number(add.newTotalMonthlyFee || 0).toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handlePrintAddendum(add)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-[11px] rounded-lg border border-slate-200 hover:border-indigo-200 transition flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Reenviar / PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PROFILE MODULE PERMISSIONS MATRIX FOR SELECTED COMPANY */}
      {adminSubView === 'levels' && (
        <div className="space-y-6 animate-slide-up" id="level-permissions-panel">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-semibold text-slate-800 font-display">
                  Liberação de Módulos por Perfil — <span className="text-indigo-600">{compName}</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-sans">
                Selecione os módulos liberados para cada perfil específico da empresa selecionada no combobox.
              </p>
            </div>
            <button
              id="btn-save-all-levels"
              type="button"
              onClick={handleSaveAllLevels}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer font-sans shrink-0"
            >
              <Save className="w-4 h-4" />
              Salvar Matriz Geral para {compName}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['admin', 'atendente', 'mecanico', 'qa'] as UserRole[]).map((roleKey) => {
              const roleTitleMap: { [key in UserRole]: string } = {
                admin: "Gerente / Administrador",
                atendente: "Atendente (Recepção)",
                mecanico: "Mecânico (Oficina)",
                qa: "QA Tester (Qualidade)"
              };

              const roleDescMap: { [key in UserRole]: string } = {
                admin: "Gestão administrativa e faturamento completo",
                atendente: "Recepção de clientes, veículos e orçamentos",
                mecanico: "Execução mecânica, peças e ordens de serviço",
                qa: "Inspeção completa do sistema e automação de testes"
              };

              const rolePermissions = levelPermissions[roleKey] || DEFAULT_LEVEL_PERMISSIONS[roleKey];

              const permissionList: { key: keyof UserPermissions; label: string }[] = [
                { key: 'accessDashboard', label: 'Painel Geral / KPIs' },
                { key: 'accessSales', label: 'Vendas & Balcão (PDV)' },
                { key: 'restrictToOwnSales', label: 'Restringir aos Próprios Pedidos de Venda' },
                { key: 'accessCarriers', label: 'Cadastro de Transportadoras & Fretes' },
                { key: 'accessClients', label: 'Cadastro de Clientes' },
                { key: 'accessVehicles', label: 'Cadastro de Veículos' },
                { key: 'accessParts', label: 'Catálogo de Peças' },
                { key: 'accessQuotations', label: 'Cotação & Fornecedores' },
                { key: 'accessServices', label: 'Tabela de Serviços' },
                { key: 'accessBudgets', label: 'Orçamentos Builder' },
                { key: 'accessServiceOrders', label: 'Ordens de Serviço (OS)' },
                { key: 'accessAccountsReceivable', label: 'Contas a Receber' },
                { key: 'accessAccountsPayable', label: 'Contas a Pagar' },
                { key: 'accessFinancial', label: 'Fluxo de Caixa / DRE' },
                { key: 'accessFiscal', label: 'Módulo Fiscal, Boletos & SEFAZ' },
                { key: 'accessHistory', label: 'Histórico do Veículo' },
                { key: 'accessReports', label: 'Relatórios Financeiros' },
                { key: 'accessUserManagement', label: 'Controle de Colaboradores' },
                { key: 'accessQAPanel', label: 'Painel de Testes QA' },
                { key: 'canViewOtherStoresStock', label: 'Estoque Outras Lojas (Rede)' },
                { key: 'canSellOtherStoresStock', label: 'Venda de Peças Outra Loja' },
                { key: 'canViewAllCompaniesHistory', label: 'Auditoria de Todas as Empresas' }
              ];

              return (
                <div key={roleKey} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-full" id={`level-card-${roleKey}`}>
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                    <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-sans">
                      Perfil: {roleKey.toUpperCase()}
                    </span>
                    <h4 className="font-semibold text-slate-800 text-sm mt-1.5 font-sans">{roleTitleMap[roleKey]}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug h-8 overflow-hidden font-sans">{roleDescMap[roleKey]}</p>
                  </div>

                  <div className="p-4 flex-grow space-y-2.5 overflow-y-auto max-h-[380px]">
                    {permissionList.map((perm) => {
                      const isChecked = rolePermissions[perm.key];
                      return (
                        <label 
                          key={perm.key} 
                          className="flex items-start gap-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer select-none transition font-sans"
                        >
                          <input 
                            type="checkbox"
                            checked={Boolean(isChecked)}
                            onChange={() => {
                              const updatedPermissions = {
                                ...rolePermissions,
                                [perm.key]: !rolePermissions[perm.key]
                              };
                              const updatedLevelPermissions = {
                                ...levelPermissions,
                                [roleKey]: updatedPermissions
                              };
                              saveLevelPermissions(updatedLevelPermissions, true, roleKey);
                            }}
                            className="mt-0.5 h-3.5 w-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          />
                          <span className={`${isChecked ? 'font-medium text-slate-700' : 'text-slate-400'}`}>
                            {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-slate-50/50 border-t border-slate-100 mt-auto flex-shrink-0 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSingleLevel(roleKey)}
                      className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer font-sans"
                      id={`btn-save-level-${roleKey}`}
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar {roleKey.toUpperCase()}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. USERS / OPERATORS MANAGEMENT FOR SELECTED COMPANY */}
      {adminSubView === 'users' && (
        <div className="space-y-6 animate-slide-up">
          {/* Create User Form */}
          {isFormOpen && (
            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md animate-slide-up" id="user-form-panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <h3 className="font-semibold text-slate-800 font-display text-base">
                  {editingUser ? `Alterar Nível / Permissões: ${editingUser.name}` : `Criar Operador para ${compName}`}
                </h3>
                <button id="btn-close-user-form" onClick={() => { setIsFormOpen(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div id="user-error-alert" className="mb-4 p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="font-medium">{errorMsg}</p>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="form-user">
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Credenciais de Acesso</h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600" htmlFor="user-name-input">Nome Completo *</label>
                      <input 
                        id="user-name-input"
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Alberto Roberto" 
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600" htmlFor="user-username-input">Usuário de Login (Username) *</label>
                      <input 
                        id="user-username-input"
                        type="text" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Ex: alberto" 
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600" htmlFor="user-password-input">
                        {editingUser ? 'Alterar Senha (Opcional)' : 'Senha Inicial *'}
                      </label>
                      <input 
                        id="user-password-input"
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={editingUser ? "Deixe em branco para manter" : "Min. 4 caracteres"} 
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono"
                        required={!editingUser}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600" htmlFor="user-role-select">Perfil Padrão *</label>
                      <select 
                        id="user-role-select"
                        value={role}
                        onChange={e => handleRoleChange(e.target.value as UserRole)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700"
                      >
                        <option value="admin">Administrador (Total)</option>
                        <option value="atendente">Atendente (Serviço de Entrada)</option>
                        <option value="mecanico">Mecânico (Execução e Diagnóstico)</option>
                        <option value="qa">QA Engineer / Tester (Analista)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-indigo-50/20 p-5 rounded-xl border border-indigo-100/50 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900">
                      <Shield className="w-5 h-5" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Permissões de Acesso do Operador</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {Object.keys(PERMISSION_LABEL_MAP).map((permKey) => {
                        const key = permKey as keyof UserPermissions;
                        const isChecked = Boolean(permissions[key]);

                        return (
                          <div 
                            key={key} 
                            onClick={() => togglePermission(key)}
                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                              isChecked 
                                ? 'bg-white border-indigo-200 shadow-3xs' 
                                : 'bg-slate-50/30 border-slate-100 opacity-60'
                            }`}
                          >
                            <span className="text-xs text-slate-700 font-medium">{PERMISSION_LABEL_MAP[key]}</span>
                            <div className={`w-5 h-5 rounded-sm flex items-center justify-center border transition ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <PrivacyLgpdFooter
                    onOpenModal={() => setShowPrivacyModal(true)}
                    mode="register"
                    isChecked={hasAcceptedUserLgpd}
                    onToggleCheck={setHasAcceptedUserLgpd}
                  />

                  <div className="flex gap-3 justify-end pt-2">
                    <button 
                      id="btn-save-user-submit"
                      type="submit" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition cursor-pointer"
                    >
                      {editingUser ? 'Salvar Operador' : 'Confirmar e Cadastrar Operador'}
                    </button>
                    <button 
                      id="btn-cancel-user-form"
                      type="button" 
                      onClick={() => { setIsFormOpen(false); setEditingUser(null); }} 
                      className="bg-slate-150 hover:bg-slate-200 text-slate-600 font-semibold text-sm px-6 py-2.5 rounded-lg transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Active Users List */}
          {!isFormOpen && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden" id="users-list-panel">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Operadores Cadastrados para {compName}
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {(() => {
                  const companyUsers = db.users.filter(u => (u.companyId || 'comp-1') === selectedCompanyId);
                  if (companyUsers.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 text-slate-500 text-xs">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">Nenhum operador cadastrado para {compName}</p>
                        <p className="text-slate-400 mt-1 max-w-md mx-auto">
                          Os usuários cadastrados em outras empresas são isolados e não aparecem aqui.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(null);
                            setName('');
                            setUsername('');
                            setPassword('');
                            setRole('atendente');
                            setPermissions(levelPermissions.atendente || DEFAULT_LEVEL_PERMISSIONS.atendente);
                            setIsFormOpen(true);
                          }}
                          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          + Cadastrar Operador Exclusivo para {compName}
                        </button>
                      </div>
                    );
                  }

                  return companyUsers.map(user => (
                    <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/20 transition duration-150" id={`user-row-${user.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{user.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span className="font-mono">User: {user.username}</span>
                            <span>•</span>
                            <span className="font-bold uppercase text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {user.role}
                            </span>
                            <span>•</span>
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-medium">
                              Empresa: {compName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-edit-user-permissions-${user.id}`}
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setName(user.name);
                            setUsername(user.username);
                            setPassword('');
                            setRole(user.role);
                            setPermissions(user.permissions);
                            setIsFormOpen(true);
                          }}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Editar Operador
                        </button>

                        <button
                          id={`btn-delete-user-${user.id}`}
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Excluir este operador da empresa"
                        >
                          <X className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. COMPANY DETAILS VIEW */}
      {adminSubView === 'company' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 animate-fade-in" id="company-settings-panel">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Cadastro da Empresa ({compName})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Estes dados serão incorporados ao cabeçalho de orçamentos e Ordens de Serviço.
            </p>
          </div>

          <form
            id="form-company-settings"
            onSubmit={(e) => {
              e.preventDefault();
              const errors: { [key: string]: boolean } = {};
              let firstErrorId = '';

              if (!compName || !compName.trim()) {
                errors['comp-name-input'] = true;
                if (!firstErrorId) firstErrorId = 'comp-name-input';
              }
              if (!compCnpj || !compCnpj.trim()) {
                errors['comp-cnpj-input'] = true;
                if (!firstErrorId) firstErrorId = 'comp-cnpj-input';
              }
              if (!compWhatsapp || !compWhatsapp.trim()) {
                errors['comp-whatsapp-input'] = true;
                if (!firstErrorId) firstErrorId = 'comp-whatsapp-input';
              }
              if (!compEmail || !compEmail.trim()) {
                errors['comp-email-input'] = true;
                if (!firstErrorId) firstErrorId = 'comp-email-input';
              }
              if (!compLegalRepName || !compLegalRepName.trim()) {
                errors['comp-legal-rep-name'] = true;
                if (!firstErrorId) firstErrorId = 'comp-legal-rep-name';
              }
              if (!compLegalRepCpf || !compLegalRepCpf.trim()) {
                errors['comp-legal-rep-cpf'] = true;
                if (!firstErrorId) firstErrorId = 'comp-legal-rep-cpf';
              }
              if (!compProviderCompanyName || !compProviderCompanyName.trim()) {
                errors['comp-provider-company-name'] = true;
                if (!firstErrorId) firstErrorId = 'comp-provider-company-name';
              }
              if (!compProviderCnpj || !compProviderCnpj.trim()) {
                errors['comp-provider-cnpj'] = true;
                if (!firstErrorId) firstErrorId = 'comp-provider-cnpj';
              }
              if (!compProviderLegalRepName || !compProviderLegalRepName.trim()) {
                errors['comp-provider-rep-name'] = true;
                if (!firstErrorId) firstErrorId = 'comp-provider-rep-name';
              }

              if (firstErrorId) {
                setInvalidFields(errors);
                const el = document.getElementById(firstErrorId);
                if (el) el.focus();
                setResultModal({
                  isOpen: true,
                  type: 'error',
                  title: 'Campo Obrigatório Não Preenchido',
                  message: 'Existem campos obrigatórios não preenchidos nas configurações da empresa ou nos dados do contrato. Por favor, preencha os campos em vermelho para salvar.'
                });
                return;
              }

              setInvalidFields({});
              saveCurrentCompanyData();
              setHasUnsavedChanges(false);
              setResultModal({
                isOpen: true,
                type: 'success',
                title: 'Operação Realizada com Sucesso',
                message: `As configurações cadastrais da empresa "${compName}" e os dados do Contrato de Prestação de Serviços (CONTRATANTE e CONTRATADA) foram salvos com sucesso!`
              });
            }}
            className="space-y-4 max-w-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-name-input">
                  Nome da Empresa / Oficina *
                </label>
                <input
                  id="comp-name-input"
                  type="text"
                  required
                  value={compName}
                  onChange={e => {
                    setCompName(e.target.value);
                    setHasUnsavedChanges(true);
                    if (e.target.value.trim()) setInvalidFields(prev => ({ ...prev, 'comp-name-input': false }));
                  }}
                  className={`w-full text-xs p-2.5 border rounded-lg bg-white font-medium ${
                    invalidFields['comp-name-input'] ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50' : 'border-slate-200'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-cnpj-input">
                  CNPJ *
                </label>
                <input
                  id="comp-cnpj-input"
                  type="text"
                  required
                  value={compCnpj}
                  onChange={e => {
                    setCompCnpj(e.target.value);
                    setHasUnsavedChanges(true);
                    if (e.target.value.trim()) setInvalidFields(prev => ({ ...prev, 'comp-cnpj-input': false }));
                  }}
                  className={`w-full text-xs p-2.5 border rounded-lg bg-white font-mono ${
                    invalidFields['comp-cnpj-input'] ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50' : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Matriz / Filial (Estrutura de Rede de Lojas) */}
              <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 sm:col-span-2">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Estrutura de Rede / Tipo de Unidade (Matriz x Filial)
                </label>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Defina se esta unidade é uma <strong>Sede Principal (Matriz)</strong> ou uma <strong>Sucursal (Filial)</strong> vinculada a outra loja da rede.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label 
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                      compType === 'matriz' 
                        ? 'bg-white border-indigo-600 shadow-xs' 
                        : 'bg-white/60 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="compTypeRadio" 
                      value="matriz" 
                      checked={compType === 'matriz'} 
                      onChange={() => {
                        setCompType('matriz');
                        setCompParentMatrizId('');
                        setHasUnsavedChanges(true);
                      }}
                      className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">🏢 Empresa Matriz (Sede)</span>
                      <span className="text-[10px] text-slate-500 block">Sede principal. Será listada para vínculo de Filiais.</span>
                    </div>
                  </label>

                  <label 
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                      compType === 'filial' 
                        ? 'bg-white border-indigo-600 shadow-xs' 
                        : 'bg-white/60 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="compTypeRadio" 
                      value="filial" 
                      checked={compType === 'filial'} 
                      onChange={() => {
                        setCompType('filial');
                        const firstMatriz = registeredCompaniesList.find(c => c.companyType === 'matriz' && c.id !== selectedCompanyId);
                        if (firstMatriz) setCompParentMatrizId(firstMatriz.id);
                        setHasUnsavedChanges(true);
                      }}
                      className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">🏬 Empresa Filial (Sucursal)</span>
                      <span className="text-[10px] text-slate-500 block">Loja dependente vinculada a uma Matriz.</span>
                    </div>
                  </label>
                </div>

                {compType === 'filial' && (
                  <div className="pt-2 space-y-1.5 animate-fade-in">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-matriz-select">
                      Selecione a Empresa Matriz *
                    </label>
                    <select
                      id="comp-matriz-select"
                      value={compParentMatrizId}
                      onChange={e => { setCompParentMatrizId(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-indigo-200 rounded-lg bg-white font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500"
                      required={compType === 'filial'}
                    >
                      <option value="">-- Selecione uma Matriz cadastrada --</option>
                      {registeredCompaniesList
                        .filter(c => (c.companyType === 'matriz' || !c.companyType) && c.id !== selectedCompanyId)
                        .map(m => (
                          <option key={m.id} value={m.id}>
                            🏢 {m.name} (CNPJ: {m.cnpj})
                          </option>
                        ))}
                    </select>

                    {registeredCompaniesList.filter(c => (c.companyType === 'matriz' || !c.companyType) && c.id !== selectedCompanyId).length === 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 font-medium">
                        ⚠️ Nenhuma outra empresa cadastrada como "Matriz" no sistema. Selecione "Matriz" no cadastro das outras lojas para liberá-las aqui.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Segmento de Negocio (Multi-Segmento: Oficina x Comercio) */}
              <div className="space-y-3 bg-slate-900 text-white p-4.5 rounded-xl border border-slate-800 sm:col-span-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    Tipo de Negócio / Segmento do Estabelecimento *
                  </label>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono font-bold border border-indigo-500/30">
                    Núcleo ERP Modular
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Defina o ramo principal desta empresa para adaptar o menu de navegação e as funcionalidades operacionais sem duplicação de dados:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label 
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                      compBusinessType === 'OFICINA' 
                        ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md text-white' 
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="radio" 
                        name="compBusinessTypeRadio" 
                        value="OFICINA" 
                        checked={compBusinessType === 'OFICINA'} 
                        onChange={() => {
                          setCompBusinessType('OFICINA');
                          setHasUnsavedChanges(true);
                        }}
                        className="h-4 w-4 text-indigo-500 border-slate-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-white flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-indigo-400" /> Oficina Mecânica
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-normal">
                      Foco em Ordens de Serviço, Veículos, Mecânicos, Checklist, Serviços e Peças.
                    </span>
                  </label>

                  <label 
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                      compBusinessType === 'COMERCIO' 
                        ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md text-white' 
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="radio" 
                        name="compBusinessTypeRadio" 
                        value="COMERCIO" 
                        checked={compBusinessType === 'COMERCIO'} 
                        onChange={() => {
                          setCompBusinessType('COMERCIO');
                          setHasUnsavedChanges(true);
                        }}
                        className="h-4 w-4 text-emerald-500 border-slate-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-white flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> Comércio & Vendas
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-normal">
                      Foco em Vendas de Balcão (PDV), Produtos/Estoque, Caixa, Contas a Pagar/Receber e Fiscal.
                    </span>
                  </label>

                  <label 
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                      compBusinessType === 'OFICINA_COMERCIO' 
                        ? 'bg-slate-800 border-amber-500 ring-2 ring-amber-500/30 shadow-md text-white' 
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="radio" 
                        name="compBusinessTypeRadio" 
                        value="OFICINA_COMERCIO" 
                        checked={compBusinessType === 'OFICINA_COMERCIO'} 
                        onChange={() => {
                          setCompBusinessType('OFICINA_COMERCIO');
                          setHasUnsavedChanges(true);
                        }}
                        className="h-4 w-4 text-amber-500 border-slate-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-white flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" /> Oficina + Comércio
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-normal">
                      Estrutura Híbrida: Atende serviços automotivos (OS) e vendas diretas de peças no balcão.
                    </span>
                  </label>
                </div>
              </div>

              {/* Reserva de Estoque em Orçamentos (Configuração por Empresa) */}
              <div className="space-y-3 bg-slate-900 text-white p-4.5 rounded-xl border border-slate-800 sm:col-span-2 shadow-xs" id="budget-stock-reservation-config">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-400" />
                    Política de Reserva de Estoque em Orçamentos *
                  </label>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold border border-amber-500/30">
                    Estoque Comercial & Oficina
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Defina o comportamento do estoque quando novos orçamentos comerciais ou de oficina forem gerados:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label 
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                      compBudgetStockReservationMode === 'none' 
                        ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md text-white' 
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="radio" 
                        name="compBudgetStockReservationRadio" 
                        value="none" 
                        checked={compBudgetStockReservationMode === 'none'} 
                        onChange={() => {
                          setCompBudgetStockReservationMode('none');
                          setHasUnsavedChanges(true);
                        }}
                        className="h-4 w-4 text-indigo-500 border-slate-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-white">
                        Não Reservar Estoque
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-normal">
                      O orçamento registra intenção de compra sem bloquear unidades do saldo disponível. Apenas a venda ou OS confirmada movimenta/reserva o estoque.
                    </span>
                  </label>

                  <label 
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                      compBudgetStockReservationMode === 'reserve_while_valid' 
                        ? 'bg-slate-800 border-amber-500 ring-2 ring-amber-500/30 shadow-md text-white' 
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="radio" 
                        name="compBudgetStockReservationRadio" 
                        value="reserve_while_valid" 
                        checked={compBudgetStockReservationMode === 'reserve_while_valid'} 
                        onChange={() => {
                          setCompBudgetStockReservationMode('reserve_while_valid');
                          setHasUnsavedChanges(true);
                        }}
                        className="h-4 w-4 text-amber-500 border-slate-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-white flex items-center gap-1">
                        Reservar Enquanto Orçamento Estiver Válido
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-normal">
                      Reserva temporariamente os itens do orçamento durante o prazo de validade. Ao vencer o prazo, a reserva é liberada automaticamente.
                    </span>
                  </label>
                </div>

                {compBudgetStockReservationMode === 'reserve_while_valid' && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-lg">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1" htmlFor="budget-validity-days-input">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Prazo Padrão de Validade da Reserva (Dias)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Após este período, o orçamento expira e o saldo reservado retorna automaticamente ao estoque disponível.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="budget-validity-days-input"
                        type="number"
                        min="1"
                        max="90"
                        value={compBudgetStockReservationValidityDays}
                        onChange={e => {
                          const val = Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 10));
                          setCompBudgetStockReservationValidityDays(val);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-24 text-xs p-2 bg-slate-800 border border-slate-700 text-white font-bold rounded-lg text-center focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-xs text-slate-300 font-semibold">dias</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Módulo Logístico de Retirada & Entrega (Configuração por Empresa) */}
              <div className="space-y-4 bg-indigo-950/40 text-slate-800 p-4.5 rounded-xl border border-indigo-200 sm:col-span-2 shadow-xs" id="logistics-withdrawal-config">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5 font-display">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    Fluxo de Separação, Retirada Balcão e Entrega Residual
                  </label>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                    Logística & Expedição
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Controle a esteira física de picking, conferência, romaneios de separação e baixas parciais de mercadoria:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${compEnableWithdrawalAndDelivery ? 'bg-white border-indigo-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <input
                      type="checkbox"
                      id="comp-enable-withdrawal-delivery-checkbox"
                      checked={compEnableWithdrawalAndDelivery}
                      onChange={e => {
                        setCompEnableWithdrawalAndDelivery(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="mt-0.5 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-slate-900 block">
                        Habilitar Fluxo de Separação / Retirada e Entrega
                      </span>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Ativa a fila de expedição, geração de romaneios de entrega residual e baixa física na conferência.
                      </p>
                    </div>
                  </label>

                  <label className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${compRequireAuthorizedFiscalBeforeRelease ? 'bg-white border-teal-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <input
                      type="checkbox"
                      id="comp-require-fiscal-before-release-checkbox"
                      checked={compRequireAuthorizedFiscalBeforeRelease}
                      onChange={e => {
                        setCompRequireAuthorizedFiscalBeforeRelease(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="mt-0.5 h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-slate-900 block">
                        Exigir Documento Fiscal Autorizado para Liberação
                      </span>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Bloqueia a entrega física de mercadorias até que a NF-e/NFC-e correspondente seja autorizada pela SEFAZ.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Operação Multiloja & Venda Cruzada Entre Lojas (Configuração por Empresa) */}
              <div className="space-y-4 bg-slate-50 text-slate-800 p-4.5 rounded-xl border border-slate-200 sm:col-span-2 shadow-xs" id="multi-store-operations-config">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-display">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Operação Multiloja & Estoque Compartilhado na Rede
                  </label>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    Rede Matriz & Filiais
                  </span>
                </div>

                <label className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${compEnableInterStoreSales ? 'bg-white border-indigo-600 shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <input
                    type="checkbox"
                    id="comp-enable-interstore-sales-checkbox"
                    checked={compEnableInterStoreSales}
                    onChange={e => {
                      setCompEnableInterStoreSales(e.target.checked);
                      setHasUnsavedChanges(true);
                    }}
                    className="mt-0.5 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-slate-900 block">
                      Permitir Venda de Produtos Pertencentes a Outras Lojas / Filiais
                    </span>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Permite que operadores consultem o saldo de outras lojas da rede e realizem vendas cruzadas com rastreabilidade de origem e destino.
                    </p>
                  </div>
                </label>

                {compEnableInterStoreSales && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                    <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                      <label className="text-[11px] font-bold text-slate-700 uppercase block" htmlFor="interstore-payment-mode-select">
                        Local Permitido para Pagamento
                      </label>
                      <select
                        id="interstore-payment-mode-select"
                        value={compInterStorePaymentMode}
                        onChange={e => {
                          setCompInterStorePaymentMode(e.target.value as any);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-800"
                      >
                        <option value="BOTH">Qualquer Loja (Origem ou Atendimento)</option>
                        <option value="PURCHASE_STORE_ONLY">Apenas na Loja Onde o Cliente Comprou</option>
                        <option value="FULFILLMENT_STORE_ONLY">Apenas na Loja Onde a Mercadoria Está Físicamente</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                      <label className="text-[11px] font-bold text-slate-700 uppercase block" htmlFor="interstore-fulfillment-mode-select">
                        Política Padrão de Retirada / Entrega
                      </label>
                      <select
                        id="interstore-fulfillment-mode-select"
                        value={compInterStoreFulfillmentMode}
                        onChange={e => {
                          setCompInterStoreFulfillmentMode(e.target.value as any);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-800"
                      >
                        <option value="allow_customer_choice">Cliente Escolhe (Retirar na Loja de Estoque ou Transferência)</option>
                        <option value="pickup_at_stock_store">Retirada Obrigatória na Loja Detentora do Estoque</option>
                        <option value="transfer_to_origin_store">Sempre Transferir Internamente para a Loja de Origem</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1" htmlFor="comp-whatsapp-input">
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp Oficial da Oficina *
                </label>
                <input
                  id="comp-whatsapp-input"
                  type="text"
                  required
                  value={compWhatsapp}
                  onChange={e => { setCompWhatsapp(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full text-xs p-2.5 border border-emerald-300 rounded-lg bg-emerald-50/30 font-mono font-bold text-emerald-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-phone-input">
                  Telefone Fixo
                </label>
                <input
                  id="comp-phone-input"
                  type="text"
                  value={compPhone}
                  onChange={e => { setCompPhone(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-email-input">
                  E-mail de Atendimento *
                </label>
                <input
                  id="comp-email-input"
                  type="email"
                  required
                  value={compEmail}
                  onChange={e => { setCompEmail(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-address-input">
                  Endereço Completo
                </label>
                <input
                  id="comp-address-input"
                  type="text"
                  value={compAddress}
                  onChange={e => { setCompAddress(e.target.value); setHasUnsavedChanges(true); }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              {/* Informações do Proprietário / Dono do Sistema & Contrato de Prestação de Serviço */}
              <div className="space-y-4 sm:col-span-2 bg-slate-50/90 p-5 rounded-xl border border-slate-200 mt-2 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5 font-display">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      Informações do Proprietário / Dono do Sistema (Para o Contrato)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Estes dados pessoais serão utilizados para preencher automaticamente o contrato de prestação de serviços.
                    </p>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold shrink-0">
                    Proprietário / Sócio Administrador
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-legal-rep-name">
                      Nome Completo do Proprietário *
                    </label>
                    <input
                      id="comp-legal-rep-name"
                      type="text"
                      placeholder="Ex: Rafael Marcari"
                      value={compLegalRepName}
                      onChange={e => {
                        setCompLegalRepName(e.target.value);
                        setHasUnsavedChanges(true);
                        if (e.target.value.trim()) setInvalidFields(prev => ({ ...prev, 'comp-legal-rep-name': false }));
                      }}
                      className={`w-full text-xs p-2.5 border rounded-lg bg-white font-medium ${
                        invalidFields['comp-legal-rep-name'] ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-legal-rep-cpf">
                      CPF do Proprietário *
                    </label>
                    <input
                      id="comp-legal-rep-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={compLegalRepCpf}
                      onChange={e => {
                        setCompLegalRepCpf(e.target.value);
                        setHasUnsavedChanges(true);
                        if (e.target.value.trim()) setInvalidFields(prev => ({ ...prev, 'comp-legal-rep-cpf': false }));
                      }}
                      className={`w-full text-xs p-2.5 border rounded-lg bg-white font-mono font-medium ${
                        invalidFields['comp-legal-rep-cpf'] ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-legal-rep-rg">
                      RG do Proprietário
                    </label>
                    <input
                      id="comp-legal-rep-rg"
                      type="text"
                      placeholder="00.000.000-0 SP"
                      value={compLegalRepRg}
                      onChange={e => { setCompLegalRepRg(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-legal-rep-phone">
                      Telefone / Celular do Proprietário
                    </label>
                    <input
                      id="comp-legal-rep-phone"
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={compLegalRepPhone}
                      onChange={e => { setCompLegalRepPhone(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-legal-rep-email">
                      E-mail Pessoal do Proprietário
                    </label>
                    <input
                      id="comp-legal-rep-email"
                      type="email"
                      placeholder="proprietario@email.com"
                      value={compLegalRepEmail}
                      onChange={e => { setCompLegalRepEmail(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div className="space-y-1 lg:col-span-3 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-legal-rep-address">
                      Endereço Residencial do Proprietário
                    </label>
                    <input
                      id="comp-legal-rep-address"
                      type="text"
                      placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                      value={compLegalRepAddress}
                      onChange={e => { setCompLegalRepAddress(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Informações da CONTRATADA (Fornecedor / Desenvolvedor / Contratado) */}
              <div className="space-y-4 sm:col-span-2 bg-indigo-50/70 p-5 rounded-xl border border-indigo-200 mt-2 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-200/80 pb-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-indigo-950 uppercase flex items-center gap-1.5 font-display">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Informações da CONTRATADA (Fornecedor / Desenvolvedor do Sistema)
                    </label>
                    <p className="text-[11px] text-indigo-800/80 mt-0.5">
                      Preencha os dados da sua empresa prestadora de serviços (fornecedor do software) para constar no contrato de prestação de serviços.
                    </p>
                  </div>
                  <span className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-2xs">
                    CONTRATADA (Fornecedor/Eu)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-company-name">
                      Razão Social / Nome da Contratada *
                    </label>
                    <input
                      id="comp-provider-company-name"
                      type="text"
                      placeholder="Ex: MotorDesk Soluções LTDA"
                      value={compProviderCompanyName}
                      onChange={e => {
                        setCompProviderCompanyName(e.target.value);
                        setHasUnsavedChanges(true);
                        if (e.target.value.trim()) setInvalidFields(prev => ({ ...prev, 'comp-provider-company-name': false }));
                      }}
                      className={`w-full text-xs p-2.5 border rounded-lg bg-white font-medium ${
                        invalidFields['comp-provider-company-name'] ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-cnpj">
                      CNPJ da Contratada *
                    </label>
                    <input
                      id="comp-provider-cnpj"
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={compProviderCnpj}
                      onChange={e => {
                        setCompProviderCnpj(e.target.value);
                        setHasUnsavedChanges(true);
                        if (e.target.value.trim()) setInvalidFields(prev => ({ ...prev, 'comp-provider-cnpj': false }));
                      }}
                      className={`w-full text-xs p-2.5 border rounded-lg bg-white font-mono font-medium ${
                        invalidFields['comp-provider-cnpj'] ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-rep-name">
                      Nome do Responsável Legal (Contratada) *
                    </label>
                    <input
                      id="comp-provider-rep-name"
                      type="text"
                      placeholder="Ex: Rafael Marcari"
                      value={compProviderLegalRepName}
                      onChange={e => {
                        setCompProviderLegalRepName(e.target.value);
                        setHasUnsavedChanges(true);
                        if (e.target.value.trim()) setInvalidFields(prev => ({ ...prev, 'comp-provider-rep-name': false }));
                      }}
                      className={`w-full text-xs p-2.5 border rounded-lg bg-white font-medium ${
                        invalidFields['comp-provider-rep-name'] ? 'border-red-500 ring-2 ring-red-500/30 bg-red-50/50' : 'border-slate-200'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-rep-cpf">
                      CPF do Responsável (Contratada)
                    </label>
                    <input
                      id="comp-provider-rep-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={compProviderLegalRepCpf}
                      onChange={e => { setCompProviderLegalRepCpf(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-rep-rg">
                      Cargo / RG do Responsável (Contratada)
                    </label>
                    <input
                      id="comp-provider-rep-rg"
                      type="text"
                      placeholder="Ex: Desenvolvedor / Proprietário"
                      value={compProviderLegalRepRg}
                      onChange={e => { setCompProviderLegalRepRg(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-phone">
                      Telefone / WhatsApp da Contratada
                    </label>
                    <input
                      id="comp-provider-phone"
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={compProviderPhone}
                      onChange={e => { setCompProviderPhone(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-email">
                      E-mail da Contratada
                    </label>
                    <input
                      id="comp-provider-email"
                      type="email"
                      placeholder="contato@motordesk.com.br"
                      value={compProviderEmail}
                      onChange={e => { setCompProviderEmail(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div className="space-y-1 lg:col-span-3 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="comp-provider-address">
                      Endereço Comercial da Contratada
                    </label>
                    <input
                      id="comp-provider-address"
                      type="text"
                      placeholder="Av. das Nações Unidas, 1200 - Pinheiros, São Paulo - SP"
                      value={compProviderAddress}
                      onChange={e => { setCompProviderAddress(e.target.value); setHasUnsavedChanges(true); }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* MÓDULO DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS SAAS & UPLOAD */}
              <div className="space-y-4 sm:col-span-2 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md border border-indigo-700/40 mt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-700/50 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-sm font-bold text-white font-display tracking-wide">
                        Contrato de Prestação de Serviços de Informática & SaaS
                      </h4>
                    </div>
                    <p className="text-xs text-indigo-200/90 leading-relaxed">
                      Conformidade legal com a <strong>Lei do Software (9.609/98)</strong>, <strong>Marco Civil da Internet (12.965/14)</strong> e <strong>LGPD (13.709/18)</strong>.
                    </p>
                  </div>

                  <button
                    id="btn-generate-legal-contract"
                    type="button"
                    onClick={() => setShowContractModal(true)}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer shrink-0 border border-indigo-300/30"
                  >
                    <Printer className="w-4 h-4" />
                    Gerar Contrato Completo
                  </button>
                </div>

                {/* PAINEL DE STATUS DO CONTRATO ASSINADO */}
                {compContractStatus === 'signed' || compSignedContractUrl ? (
                  <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 shadow-sm animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-emerald-950 text-sm tracking-wide">
                            Contrato assinado
                          </span>
                          <span className="bg-emerald-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            HOMOLOGADO
                          </span>
                        </div>
                        <p className="text-xs text-emerald-900 font-medium mt-0.5">
                          Arquivo: <strong className="font-bold">{compSignedContractFileName || 'Contrato_Assinado.pdf'}</strong>
                          {compSignedContractDate && ` • Enviado em: ${compSignedContractDate}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setShowSignedContractPreviewModal(true)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Visualizar
                      </button>

                      {compSignedContractUrl && (
                        <a
                          href={compSignedContractUrl}
                          download={compSignedContractFileName || `Contrato_Assinado_${compName}.pdf`}
                          className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar
                        </a>
                      )}

                      <label className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        Substituir
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={handleSignedContractFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/80 border border-indigo-500/30 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-200">
                          Contrato Pendente de Assinatura & Upload
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-300 font-medium">
                        Gere o contrato acima, colha a assinatura do responsável e faça o upload abaixo.
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                      <label className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm">
                        <Upload className="w-4 h-4" />
                        Upload do Contrato Assinado (PDF ou Imagem)
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={handleSignedContractFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Formatos aceitos: PDF, PNG, JPG, DOCX (Máx. 15MB)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Logo da Empresa (Canto Superior Esquerdo dos Documentos e Relatórios) */}
              <div className="space-y-2 sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200/90 mt-2">
                <label className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Logomarca / Imagem da Empresa (Canto Superior Esquerdo)
                  </span>
                  {compLogoUrl ? (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Logo Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-200 px-2 py-0.5 rounded">
                      Sem Logo
                    </span>
                  )}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  {/* Visualização de posicionamento do canto superior esquerdo */}
                  <div className="w-48 h-20 bg-white border-2 border-dashed border-slate-300 rounded-lg p-2 flex items-center justify-center relative overflow-hidden group shrink-0 shadow-2xs">
                    {compLogoUrl ? (
                      <img 
                        src={compLogoUrl} 
                        alt="Logomarca da Empresa" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    ) : (
                      <div className="text-center p-1">
                        <Building2 className="w-7 h-7 text-slate-300 mx-auto mb-0.5" />
                        <span className="text-[10px] text-slate-400 font-semibold block">Posição Superior Esquerda</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-xs w-full">
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      A logomarca cadastrada aqui será exibida automaticamente no <strong>canto superior esquerdo</strong> de orçamentos, ordens de serviço e relatórios para clientes ou fornecedores enviados por WhatsApp/E-mail.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs">
                        <Plus className="w-3.5 h-3.5" />
                        {compLogoUrl ? 'Alterar Logomarca' : 'Carregar Imagem / Logo'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoFileUpload} 
                          className="hidden" 
                        />
                      </label>

                      {compLogoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompLogoUrl('');
                            setHasUnsavedChanges(true);
                          }}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remover Logo
                        </button>
                      )}
                    </div>

                    <div>
                      <input 
                        type="text"
                        value={compLogoUrl}
                        onChange={e => { setCompLogoUrl(e.target.value); setHasUnsavedChanges(true); }}
                        placeholder="Ou digite/cole a URL da imagem (Ex: https://...)"
                        className="w-full text-[11px] p-2 border border-slate-200 rounded-lg bg-white font-mono text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                id="btn-save-company-info"
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Configurações da Empresa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE ALERTAS DE ALTERAÇÕES NÃO SALVAS AO MUDAR EMPRESA NO COMBOBOX (REQUISITO EXPLÍCITO) */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="unsaved-changes-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-5 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 font-display">
                  Alterações não salvas detectadas!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Você fez modificações nas configurações ou permissões da empresa <strong className="text-slate-800">{compName}</strong> que ainda não foram salvas. O que deseja fazer antes de trocar de empresa?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                id="btn-unsaved-save-and-switch"
                type="button"
                onClick={handleConfirmSaveAndSwitch}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Salvar Alterações e Mudar de Empresa
              </button>

              <button
                id="btn-unsaved-discard-and-switch"
                type="button"
                onClick={handleConfirmDiscardAndSwitch}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                Não Salvar (Descartar Alterações)
              </button>

              <button
                id="btn-unsaved-cancel-switch"
                type="button"
                onClick={handleCancelCompanySwitch}
                className="w-full bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 font-medium text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                Cancelar (Permanecer na Empresa Atual)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO DE NOVA EMPRESA (TENANT) */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="new-company-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-up max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Cadastrar Nova Empresa (Tenant SaaS)
              </h3>
              <button onClick={() => setShowNewCompanyModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCompany} className="flex-1 flex flex-col min-h-0 overflow-hidden pt-4">
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="new-comp-name">
                  Razão Social / Nome Fantasia *
                </label>
                <input
                  id="new-comp-name"
                  type="text"
                  required
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  placeholder="Ex: Auto Center Speed Motors LTDA"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="new-comp-cnpj">
                    CNPJ *
                  </label>
                  <input
                    id="new-comp-cnpj"
                    type="text"
                    required
                    value={newCompCnpj}
                    onChange={e => setNewCompCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="new-comp-fee">
                    Mensalidade (R$) *
                  </label>
                  <input
                    id="new-comp-fee"
                    type="number"
                    step="0.01"
                    required
                    value={newCompFee}
                    onChange={e => setNewCompFee(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Matriz ou Filial */}
              <div className="space-y-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                  Tipo de Empresa (Estrutura da Rede)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer text-xs font-semibold ${newCompType === 'matriz' ? 'bg-white border-indigo-600 text-indigo-900' : 'bg-slate-50 text-slate-600'}`}>
                    <input 
                      type="radio" 
                      name="newCompTypeRadio" 
                      checked={newCompType === 'matriz'} 
                      onChange={() => { setNewCompType('matriz'); setNewCompParentMatrizId(''); }} 
                    />
                    🏢 Matriz (Sede)
                  </label>

                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer text-xs font-semibold ${newCompType === 'filial' ? 'bg-white border-indigo-600 text-indigo-900' : 'bg-slate-50 text-slate-600'}`}>
                    <input 
                      type="radio" 
                      name="newCompTypeRadio" 
                      checked={newCompType === 'filial'} 
                      onChange={() => { 
                        setNewCompType('filial'); 
                        const first = registeredCompaniesList.find(c => c.companyType === 'matriz' || !c.companyType);
                        if (first) setNewCompParentMatrizId(first.id);
                      }} 
                    />
                    🏬 Filial (Sucursal)
                  </label>
                </div>

                {newCompType === 'filial' && (
                  <div className="pt-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase" htmlFor="new-comp-parent-matriz">
                      Vincular a qual Matriz? *
                    </label>
                    <select
                      id="new-comp-parent-matriz"
                      value={newCompParentMatrizId}
                      onChange={e => setNewCompParentMatrizId(e.target.value)}
                      className="w-full text-xs p-2 border border-indigo-200 rounded-lg bg-white font-semibold"
                      required={newCompType === 'filial'}
                    >
                      <option value="">-- Selecione a Matriz da rede --</option>
                      {registeredCompaniesList
                        .filter(c => c.companyType === 'matriz' || !c.companyType)
                        .map(m => (
                          <option key={m.id} value={m.id}>
                            🏢 {m.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Segmento de Negócio / Atuação */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Segmento de Atuação da Empresa *
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Define os módulos e fluxos do sistema</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-lg border flex flex-col gap-1 cursor-pointer text-xs transition ${newCompBusinessType === 'OFICINA' ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="newCompBusinessTypeRadio" 
                        value="OFICINA"
                        checked={newCompBusinessType === 'OFICINA'} 
                        onChange={() => setNewCompBusinessType('OFICINA')} 
                      />
                      <span>🔧 Oficina Mecânica</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal pl-5">OS, Mecânicos, Veículos e Checklists</span>
                  </label>

                  <label className={`p-2.5 rounded-lg border flex flex-col gap-1 cursor-pointer text-xs transition ${newCompBusinessType === 'COMERCIO' ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="newCompBusinessTypeRadio" 
                        value="COMERCIO"
                        checked={newCompBusinessType === 'COMERCIO'} 
                        onChange={() => setNewCompBusinessType('COMERCIO')} 
                      />
                      <span>🛍️ Comércio / Autopeças</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal pl-5">Vendas Balcão, PDV e Estoque de Peças</span>
                  </label>

                  <label className={`p-2.5 rounded-lg border flex flex-col gap-1 cursor-pointer text-xs transition ${newCompBusinessType === 'OFICINA_COMERCIO' ? 'bg-purple-50 border-purple-600 text-purple-950 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="newCompBusinessTypeRadio" 
                        value="OFICINA_COMERCIO"
                        checked={newCompBusinessType === 'OFICINA_COMERCIO'} 
                        onChange={() => setNewCompBusinessType('OFICINA_COMERCIO')} 
                      />
                      <span>⚡ Oficina + Comércio</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal pl-5">Híbrido completo: Serviços e Balcão</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-700 uppercase" htmlFor="new-comp-whatsapp">
                    WhatsApp Comercial
                  </label>
                  <input
                    id="new-comp-whatsapp"
                    type="text"
                    value={newCompWhatsapp}
                    onChange={e => setNewCompWhatsapp(e.target.value)}
                    placeholder="11988887777"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase" htmlFor="new-comp-email">
                    E-mail Principal
                  </label>
                  <input
                    id="new-comp-email"
                    type="text"
                    value={newCompEmail}
                    onChange={e => setNewCompEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Responsável Legal / Proprietário da Nova Empresa */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Proprietário / Dono do Sistema (Para o Contrato)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase" htmlFor="new-comp-legal-name">
                      Nome Completo
                    </label>
                    <input
                      id="new-comp-legal-name"
                      type="text"
                      placeholder="Ex: Rafael Marcari"
                      value={newCompLegalRepName}
                      onChange={e => setNewCompLegalRepName(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase" htmlFor="new-comp-legal-cpf">
                      CPF
                    </label>
                    <input
                      id="new-comp-legal-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={newCompLegalRepCpf}
                      onChange={e => setNewCompLegalRepCpf(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase" htmlFor="new-comp-legal-rg">
                      RG
                    </label>
                    <input
                      id="new-comp-legal-rg"
                      type="text"
                      placeholder="00.000.000-0 SP"
                      value={newCompLegalRepRg}
                      onChange={e => setNewCompLegalRepRg(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase" htmlFor="new-comp-legal-phone">
                      Telefone / Celular
                    </label>
                    <input
                      id="new-comp-legal-phone"
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={newCompLegalRepPhone}
                      onChange={e => setNewCompLegalRepPhone(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase" htmlFor="new-comp-legal-email">
                      E-mail Pessoal
                    </label>
                    <input
                      id="new-comp-legal-email"
                      type="email"
                      placeholder="proprietario@email.com"
                      value={newCompLegalRepEmail}
                      onChange={e => setNewCompLegalRepEmail(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase" htmlFor="new-comp-legal-address">
                      Endereço Residencial
                    </label>
                    <input
                      id="new-comp-legal-address"
                      type="text"
                      placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                      value={newCompLegalRepAddress}
                      onChange={e => setNewCompLegalRepAddress(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <PrivacyLgpdFooter
                onOpenModal={() => setShowPrivacyModal(true)}
                mode="register"
                isChecked={hasAcceptedCompanyLgpd}
                onToggleCheck={setHasAcceptedCompanyLgpd}
              />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewCompanyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-new-company-submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Cadastrar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL AFTER SAVING */}
      {showSaveConfirmationModal && saveModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="save-confirmation-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 font-display">
                  {saveModalData.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  {saveModalData.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-close-save-confirmation-modal"
                type="button"
                onClick={() => {
                  setShowSaveConfirmationModal(false);
                  setSaveModalData(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer font-sans flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Entendido / Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INFORMÁTICA / SAAS */}
      {showContractModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in" id="contract-view-modal">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scale-up my-auto max-h-[92vh] flex flex-col">
            
            {/* Header / Actions bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-display">
                    Contrato de Licenciamento & Prestação de Serviços SaaS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gerado para: <strong className="text-slate-800">{compName}</strong> (CNPJ: {compCnpj})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintContract}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contract Body Document View (Printable) */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-slate-700 text-xs leading-relaxed font-sans bg-slate-50/50 p-6 rounded-xl border border-slate-200 print:bg-white print:p-0 print:border-none">
              
              {/* Document Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Building2 className="w-8 h-8 text-indigo-700" />
                  <span className="font-extrabold text-slate-900 text-lg tracking-wider font-display uppercase">MotorDesk Systems</span>
                </div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide font-display">
                  CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA DA INFORMAÇÃO, LICENCIAMENTO DE SOFTWARE E SUPORTE TÉCNICO (SaaS)
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  Instrumento Particular de Contratação Eletrônica e Licença de Uso de Software
                </p>
              </div>

              {/* Fundamentação Legal Banner */}
              <div className="bg-indigo-50/90 border border-indigo-200 p-3.5 rounded-xl space-y-1.5">
                <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  LEGISLAÇÃO APLICÁVEL E MARCO REGULATÓRIO
                </span>
                <p className="text-[11px] text-indigo-900 leading-normal">
                  Este contrato é elaborado e regido rigorosamente em conformidade com as leis brasileiras vigentes de tecnologia da informação e prestação de serviços:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10.5px]">
                  <div className="bg-white p-2 rounded border border-indigo-100 font-medium text-slate-800">
                    📜 <strong>Lei do Software (Lei nº 9.609/1998):</strong> Proteção da propriedade intelectual de programa de computador e licenciamento SaaS.
                  </div>
                  <div className="bg-white p-2 rounded border border-indigo-100 font-medium text-slate-800">
                    🌐 <strong>Marco Civil da Internet (Lei nº 12.965/2014):</strong> Direitos, garantias, deveres e guarda responsável de registros na web.
                  </div>
                  <div className="bg-white p-2 rounded border border-indigo-100 font-medium text-slate-800">
                    🔒 <strong>LGPD (Lei nº 13.709/2018):</strong> Proteção, confidencialidade e privacidade dos dados de clientes, veículos e ordens de serviço.
                  </div>
                  <div className="bg-white p-2 rounded border border-indigo-100 font-medium text-slate-800">
                    ⚖️ <strong>Código Civil (Lei nº 10.406/2002):</strong> Artigos 593 a 609 referentes às Regras de Prestação de Serviços.
                  </div>
                </div>
              </div>

              {/* Das Partes */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-300 pb-1">
                  1. DAS PARTES CONTRATANTES
                </h3>
                <p>
                  <strong>CONTRATADA:</strong> <strong>MotorDesk Soluções em Tecnologia e Software LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº 12.345.678/0001-90, com sede na Av. das Nações Unidas, 1200 - Pinheiros, São Paulo - SP.
                </p>
                <p>
                  <strong>CONTRATANTE / PROPRIETÁRIO DO SISTEMA:</strong> <strong>{compName || 'NÃO INFORMADA'}</strong>, inscrita no CNPJ/MF sob o nº <strong>{compCnpj || 'NÃO INFORMADO'}</strong>, com sede estabelecida no endereço <strong>{compAddress || 'NÃO INFORMADO'}</strong>, representada neste ato por seu Proprietário / Responsável Legal <strong>{compLegalRepName || 'NÃO INFORMADO'}</strong>, portador(a) do CPF nº <strong>{compLegalRepCpf || 'NÃO INFORMADO'}</strong>, RG nº <strong>{compLegalRepRg || 'NÃO INFORMADO'}</strong>, residente/domiciliado em <strong>{compLegalRepAddress || compAddress || 'NÃO INFORMADO'}</strong>, telefone <strong>{compLegalRepPhone || compWhatsapp || 'NÃO INFORMADO'}</strong> e e-mail <strong>{compLegalRepEmail || compEmail || 'NÃO INFORMADO'}</strong>.
                </p>
              </div>

              {/* Cláusula Primeira */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-300 pb-1">
                  CLÁUSULA PRIMEIRA - DO OBJETO E LICENCIAMENTO SAAS
                </h3>
                <p>
                  1.1. O presente contrato tem por objeto o licenciamento de uso não exclusivo, temporário e intransferível do sistema de gestão de oficinas mecânicas <strong>MotorDesk</strong> no modelo SaaS (Software as a Service), incluindo acesso aos módulos de Clientes, Veículos, Orçamentos, Ordens de Serviço, Estoque, Peças, Serviços, Financeiro, Emissão de Documentos e Gestão de Filiais.
                </p>
              </div>

              {/* Cláusula Segunda */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-300 pb-1">
                  CLÁUSULA SEGUNDA - DA DISPONIBILIDADE E SUPORTE TÉCNICO (SLA)
                </h3>
                <p>
                  2.1. A CONTRATADA garante o índice de disponibilidade do sistema (uptime) de <strong>99,5% (noventa e nove vírgula cinco por cento)</strong> ao mês, ressalvadas as janelas de manutenção preventiva devidamente comunicadas com antecedência.
                </p>
                <p>
                  2.2. O suporte técnico relativo ao manuseio, esclarecimento de dúvidas e correção de inconsistências será prestado nos dias úteis em horário comercial via canais oficiais de atendimento da CONTRATADA.
                </p>
              </div>

              {/* Cláusula Terceira */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-300 pb-1">
                  CLÁUSULA TERCEIRA - DA SEGURANÇA E PROTEÇÃO DE DADOS (LGPD)
                </h3>
                <p>
                  3.1. Em observância à <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong>, a CONTRATADA declara que adota medidas técnicas, organizacionais e de criptografia para proteger os dados armazenados contra acessos não autorizados, vazamentos ou perda acidental.
                </p>
                <p>
                  3.2. A CONTRATANTE declara-se titular dos dados operacionais e de seus clientes inseridos no sistema, cabendo à CONTRATADA apenas o papel de operadora de dados sob as diretrizes legais.
                </p>
              </div>

              {/* Cláusula Quarta */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-300 pb-1">
                  CLÁUSULA QUARTA - DOS VALORES E CONDIÇÕES DE PAGAMENTO
                </h3>
                <p>
                  4.1. Pela prestação dos serviços e licença de uso acordada, a CONTRATANTE pagará à CONTRATADA a mensalidade no valor ajustado de <strong>R$ {subMonthlyFee.toFixed(2)} ({subMonthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</strong>.
                </p>
                <p>
                  4.2. O inadimplemento da mensalidade por prazo superior a 15 (quinze) dias poderá acarretar a suspensão temporária dos acessos operacionais ao sistema até a devida regularização.
                </p>
              </div>

              {/* Cláusula Quinta */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-300 pb-1">
                  CLÁUSULA QUINTA - DA VIGÊNCIA E RESCISÃO
                </h3>
                <p>
                  5.1. Este contrato entra em vigor na data da sua assinatura por prazo indeterminado, podendo ser rescindido por qualquer uma das partes mediante aviso prévio por escrito de no mínimo 30 (trinta) dias, sem incidência de multa rescisória.
                </p>
              </div>

              {/* Assinaturas */}
              <div className="pt-8 space-y-6">
                <p className="text-center font-medium">
                  E por estarem assim justas e contratadas, as partes firmam o presente instrumento em formato digital para todos os fins de direito.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                  <div className="text-center space-y-2">
                    <div className="border-b border-slate-800 w-3/4 mx-auto pb-1">
                      <span className="font-bold text-slate-900 block">MotorDesk Soluções em Tecnologia LTDA</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold block">CONTRATADA (Provedora do Sistema)</span>
                    <span className="text-[10px] font-mono text-slate-400 block">CNPJ: 12.345.678/0001-90</span>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="border-b border-slate-800 w-3/4 mx-auto pb-1">
                      <span className="font-bold text-slate-900 block">{compName || '__________________________'}</span>
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold block">
                      Proprietário / Resp. Legal: {compLegalRepName || '__________________________'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 block">
                      CPF: {compLegalRepCpf || '___________'} | RG: {compLegalRepRg || '___________'}
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      CNPJ: {compCnpj || '___________'} | Tel: {compLegalRepPhone || compWhatsapp || '___________'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">CONTRATANTE</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200 shrink-0 print:hidden">
              <span className="text-[11px] text-slate-500 font-medium">
                💡 Após assinar este contrato, faça o upload do arquivo assinado na tela de cadastro da empresa.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePrintContract}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PARA VISUALIZAR CONTRATO ASSINADO */}
      {showSignedContractPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="signed-contract-preview-modal">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                    Contrato Assinado - {compName}
                  </h3>
                  <p className="text-xs text-emerald-800 font-semibold">
                    Contrato Assinado e Homologado no Sistema
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSignedContractPreviewModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-900 rounded-xl p-4 flex items-center justify-center min-h-[350px]">
              {compSignedContractUrl ? (
                compSignedContractUrl.startsWith('data:image/') || compSignedContractFileName?.match(/\.(png|jpg|jpeg)$/i) ? (
                  <img src={compSignedContractUrl} alt="Contrato Assinado Anexado" className="max-h-[60vh] object-contain rounded-lg border border-slate-700" />
                ) : (
                  <iframe src={compSignedContractUrl} className="w-full h-[60vh] rounded-lg border border-slate-700" title="Contrato Assinado" />
                )
              ) : (
                <div className="text-center text-slate-400 space-y-2 p-6">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold">Documento de contrato anexado ao cadastro da empresa.</p>
                  <p className="text-[11px] text-slate-500">Arquivo: {compSignedContractFileName || 'Contrato_Assinado.pdf'}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Enviado em: <strong>{compSignedContractDate || 'Data não especificada'}</strong>
              </span>

              <div className="flex items-center gap-2">
                {compSignedContractUrl && (
                  <a
                    href={compSignedContractUrl}
                    download={compSignedContractFileName || `Contrato_Assinado_${compName}.pdf`}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-4 h-4" /> Download do Arquivo
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowSignedContractPreviewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EMISSÃO DE TERMO ADITIVO DE NOVO MÓDULO */}
      {showAddendumModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="addendum-issuance-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-display">
                    Emitir Termo Aditivo de Inclusão de Módulo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Empresa: <strong className="text-slate-700">{compName}</strong> | Mensalidade Atual: <strong className="text-indigo-900 font-mono">R$ {subMonthlyFee.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddendumModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <p className="text-xs text-slate-600">
                Selecione abaixo os módulos que o cliente está contratando neste aditivo. O sistema ativará os módulos e reajustará automaticamente o valor da mensalidade no contrato.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Módulos Disponíveis para Inclusão:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.keys(DEFAULT_OPTIONAL_MODULE_PRICES).map((mKey) => {
                    const info = DEFAULT_OPTIONAL_MODULE_PRICES[mKey];
                    const isAlreadyActive = !!companyGlobalModules[mKey];
                    const isSelected = selectedAddendumModules.includes(mKey);
                    const price = optionalModulePrices[mKey] !== undefined ? optionalModulePrices[mKey] : info.defaultPrice;

                    return (
                      <div
                        key={mKey}
                        onClick={() => {
                          if (isAlreadyActive) return;
                          if (isSelected) {
                            setSelectedAddendumModules(selectedAddendumModules.filter(k => k !== mKey));
                          } else {
                            setSelectedAddendumModules([...selectedAddendumModules, mKey]);
                          }
                        }}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isAlreadyActive
                            ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isAlreadyActive || isSelected}
                            disabled={isAlreadyActive}
                            onChange={() => {}}
                            className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <span className="block text-xs font-bold text-slate-800">{info.label}</span>
                            <span className="text-[10px] text-slate-500">
                              {isAlreadyActive ? 'Módulo já ativo' : `+ R$ ${price.toFixed(2)}/mês`}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isAlreadyActive ? 'bg-slate-200 text-slate-600' : isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isAlreadyActive ? 'Ativo' : isSelected ? 'Selecionado' : 'Adicionar'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo Financeiro do Aditivo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Mensalidade Atual:</span>
                  <span className="font-mono font-bold">R$ {subMonthlyFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Adicional dos Novos Módulos ({selectedAddendumModules.length}):</span>
                  <span className="font-mono font-bold">
                    + R$ {selectedAddendumModules.reduce((acc, k) => acc + (optionalModulePrices[k] !== undefined ? optionalModulePrices[k] : DEFAULT_OPTIONAL_MODULE_PRICES[k].defaultPrice), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-indigo-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>Nova Mensalidade Total:</span>
                  <span className="font-mono">
                    R$ {(
                      subMonthlyFee + 
                      selectedAddendumModules.reduce((acc, k) => acc + (optionalModulePrices[k] !== undefined ? optionalModulePrices[k] : DEFAULT_OPTIONAL_MODULE_PRICES[k].defaultPrice), 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddendumModal(false);
                  setSelectedAddendumModules([]);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={selectedAddendumModules.length === 0}
                onClick={() => {
                  handleCreateAddendum();
                  setShowAddendumModal(false);
                  setSelectedAddendumModules([]);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" /> Gerar Aditivo & Atualizar Mensalidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy and LGPD Modal */}
      <PrivacyLgpdModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        companyName={compName || 'MotorDesk'}
      />

      {/* Operation Result Feedback Modal (Success / Error with OK button) */}
      <OperationResultModal
        isOpen={resultModal.isOpen}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        onClose={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
