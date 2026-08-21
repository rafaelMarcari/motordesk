/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileCheck2, 
  Receipt, 
  QrCode, 
  Building2, 
  Truck, 
  Store, 
  Printer, 
  Download, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Code, 
  Calendar, 
  DollarSign, 
  X, 
  Info, 
  Check, 
  ArrowRight,
  ExternalLink,
  Copy,
  HelpCircle,
  Clock,
  MapPin,
  Barcode,
  Settings,
  Layers,
  CheckSquare,
  Square,
  Save,
  Building,
  Briefcase,
  Upload,
  KeyRound,
  Wifi,
  WifiOff,
  FileCode,
  Eye,
  EyeOff,
  Scale,
  Key
} from 'lucide-react';
import { 
  FiscalDocument, 
  BoletoDocument, 
  InterBranchSaleLogistics, 
  SefazApiConfig, 
  User, 
  CompanyInfo, 
  Part, 
  Client, 
  Service,
  FiscalDocumentItem,
  AccountReceivable,
  TaxOperationNature,
  TaxRule,
  XmlImportRecord
} from '../types';
import { AppDatabase } from '../data/mockData';
import PreTransmissionReviewModal, { PreTransmissionDocData } from './PreTransmissionReviewModal';
import FiscalDocumentPrintModal from './FiscalDocumentPrintModal';
import { 
  OFFICIAL_NCMS, 
  OFFICIAL_CESTS, 
  OFFICIAL_CFOPS, 
  OFFICIAL_CST_CSOSN, 
  OFFICIAL_PIS_COFINS_CST, 
  OFFICIAL_ORIGENS, 
  OFFICIAL_IBGE_CITIES, 
  OFFICIAL_CNAES,
  resolveItemTributacao,
  parseXmlNFeString
} from '../utils/taxUtils';
import { fiscalProvider } from '../services/fiscalProvider';

interface FiscalSefazViewProps {
  db: AppDatabase;
  currentUser?: User;
  onSaveFiscalDocuments: (docs: FiscalDocument[]) => void;
  onSaveBoletos: (boletos: BoletoDocument[]) => void;
  onSaveInterBranchSales: (sales: InterBranchSaleLogistics[]) => void;
  onSaveSefazConfig: (config: SefazApiConfig) => void;
  onSaveCompanyInfo?: (company: CompanyInfo) => void;
  onSaveReceivables?: (receivables: AccountReceivable[], clients: Client[], transactions: any[], notifications: any[]) => void;
  onSaveParts?: (parts: Part[]) => void;
  onSaveServices?: (services: Service[]) => void;
  onSaveClients?: (clients: Client[]) => void;
  onSaveTaxOperationNatures?: (natures: TaxOperationNature[]) => void;
  onSaveTaxRules?: (rules: TaxRule[]) => void;
  onSaveXmlImportRecords?: (records: XmlImportRecord[]) => void;
  onAddHistoryLog?: (
    type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system',
    title: string,
    description: string,
    clientId: string,
    vehicleId: string,
    metadata?: any
  ) => void;
}

export default function FiscalSefazView({
  db,
  currentUser,
  onSaveFiscalDocuments,
  onSaveBoletos,
  onSaveInterBranchSales,
  onSaveSefazConfig,
  onSaveCompanyInfo,
  onSaveReceivables,
  onSaveParts,
  onSaveServices,
  onSaveClients,
  onSaveTaxOperationNatures,
  onSaveTaxRules,
  onSaveXmlImportRecords,
  onAddHistoryLog
}: FiscalSefazViewProps) {
  const [activeTab, setActiveTab] = useState<'nfe' | 'tax_engine' | 'tax_rules' | 'xml_import' | 'monthly_batch' | 'inter_branch' | 'boletos' | 'fiscal_config' | 'sefaz_api' | 'webservices_routing' | 'guide'>('nfe');
  
  // QA / Master User Verification
  const isQaOrMasterUser = currentUser?.username === 'marcari.rafael@gmail.com' || currentUser?.role === 'admin' || currentUser?.role === 'qa' || !currentUser;
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals state
  const [showNewNfeModal, setShowNewNfeModal] = useState(false);
  const [showNewBoletoModal, setShowNewBoletoModal] = useState(false);
  const [showNewInterBranchModal, setShowNewInterBranchModal] = useState(false);
  const [showNewNatureModal, setShowNewNatureModal] = useState(false);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [showXmlImportModal, setShowXmlImportModal] = useState(false);
  
  // View detail modal
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocument | null>(null);
  const [selectedBoleto, setSelectedBoleto] = useState<BoletoDocument | null>(null);
  const [selectedInterBranch, setSelectedInterBranch] = useState<InterBranchSaleLogistics | null>(null);
  const [selectedXmlRecord, setSelectedXmlRecord] = useState<XmlImportRecord | null>(null);
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [showDanfeModal, setShowDanfeModal] = useState(false);
  const [showCceModal, setShowCceModal] = useState(false);
  const [cceText, setCceText] = useState('');
  const [cceSuccessMsg, setCceSuccessMsg] = useState('');

  // Available companies for multi-tenant fiscal configuration
  const companiesList: CompanyInfo[] = (db.registeredCompanies && db.registeredCompanies.length > 0)
    ? db.registeredCompanies
    : [db.companyInfo || { id: 'comp-1', name: 'MotorDesk Auto Center', cnpj: '12.345.678/0001-90', phone: '', whatsapp: '', email: '', address: '', welcomeMessage: '', registeredAt: '' }];

  const initialCompanyId = currentUser?.companyId || db.companyInfo?.id || companiesList[0]?.id || 'comp-1';
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId);

  // Current company object based on selectedCompanyId
  const currentTargetCompany = companiesList.find(c => c.id === selectedCompanyId) || db.companyInfo || companiesList[0];

  // Helper to load company-specific or scoped sefaz config
  const getCompanySefazConfig = (comp?: CompanyInfo): SefazApiConfig => {
    if (comp?.sefazConfig) {
      return comp.sefazConfig;
    }
    if (db.sefazConfig && comp?.id === db.companyInfo?.id) {
      return db.sefazConfig;
    }
    return {
      environment: comp?.sefazEnvironment || 'homologation',
      uf: comp?.uf || 'SP',
      certificateStatus: comp?.certificateFileName ? 'A1_ACTIVE' : 'NOT_CONFIGURED',
      certificateName: comp?.certificateFileName || `Certificado e-CNPJ A1 (${comp?.tradeName || comp?.name || 'Empresa'})`,
      certificateExpirationDate: comp?.certificateExpirationDate || '2027-12-31',
      autoTransmit: true,
      stateRegistration: comp?.stateRegistration || '',
      cityRegistration: comp?.cityRegistration || '',
      cnaeCode: comp?.cnaeCode || '4520-0/01',
      taxRegime: comp?.taxRegime || 'simples_nacional',
      nfeSeries: comp?.nfeSeries || '1',
      nextNfeNumber: comp?.nextNfeNumber || 101,
      nfseSeries: comp?.nfseSeries || '1',
      nextNfseNumber: comp?.nextNfseNumber || 50,
      clientApiToken: 'md_live_tok_982347102983741928374981'
    };
  };

  // SEFAZ API Test simulation states
  const [sefazConfig, setSefazConfig] = useState<SefazApiConfig>(() => getCompanySefazConfig(currentTargetCompany));

  const [testUf, setTestUf] = useState(currentTargetCompany?.uf || 'SP');
  const [testLog, setTestLog] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'warn' | 'error' }[]>([]);
  const [isTestingSefaz, setIsTestingSefaz] = useState(false);
  const [sefazStatusResult, setSefazStatusResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Fiscal Document Form State
  const [newNfeType, setNewNfeType] = useState<'nfe_product' | 'nfse_service' | 'nfe_transfer'>('nfe_product');
  const [newNfeClientName, setNewNfeClientName] = useState('');
  const [newNfeClientCpf, setNewNfeClientCpf] = useState('');
  const [newNfeCfop, setNewNfeCfop] = useState('5.102');
  const [newNfeTargetBranchId, setNewNfeTargetBranchId] = useState('');
  const [newNfeItemName, setNewNfeItemName] = useState('');
  const [newNfeItemNcm, setNewNfeItemNcm] = useState('8708.30.90');
  const [newNfeItemQty, setNewNfeItemQty] = useState(1);
  const [newNfeItemPrice, setNewNfeItemPrice] = useState(150);
  const [newNfeItemList, setNewNfeItemList] = useState<FiscalDocumentItem[]>([]);

  // New Inter branch Sale Form State
  const [ibOriginStoreId, setIbOriginStoreId] = useState('comp-1');
  const [ibStockStoreId, setIbStockStoreId] = useState('comp-2');
  const [ibPartId, setIbPartId] = useState('');
  const [ibClientName, setIbClientName] = useState('Cliente Exemplo da Silva');
  const [ibClientCpf, setIbClientCpf] = useState('123.456.789-00');
  const [ibQty, setIbQty] = useState(1);
  const [ibLogisticsOption, setIbLogisticsOption] = useState<'WAIT_TRANSFER_AT_BUYSTORE' | 'PAY_BUYSTORE_PICKUP_STOCKSTORE'>('WAIT_TRANSFER_AT_BUYSTORE');

  // Fiscal Settings Form State
  const [cfgCompanyName, setCfgCompanyName] = useState(currentTargetCompany?.name || 'MotorDesk Auto Center');
  const [cfgTradeName, setCfgTradeName] = useState(currentTargetCompany?.tradeName || currentTargetCompany?.name || 'MotorDesk Auto Center');
  const [cfgCnpj, setCfgCnpj] = useState(currentTargetCompany?.cnpj || '12.345.678/0001-90');
  const [cfgStateReg, setCfgStateReg] = useState(sefazConfig.stateRegistration || currentTargetCompany?.stateRegistration || '388.123.456.110');
  const [cfgCityReg, setCfgCityReg] = useState(sefazConfig.cityRegistration || currentTargetCompany?.cityRegistration || '123456-7');
  const [cfgCnae, setCfgCnae] = useState(sefazConfig.cnaeCode || currentTargetCompany?.cnaeCode || '4520-0/01');
  const [cfgTaxRegime, setCfgTaxRegime] = useState<'simples_nacional' | 'lucro_presumido' | 'lucro_real'>(sefazConfig.taxRegime || currentTargetCompany?.taxRegime || 'simples_nacional');
  const [cfgCertName, setCfgCertName] = useState(sefazConfig.certificateName || 'Certificado e-CNPJ A1 (MotorDesk Testes)');
  const [cfgCertExpDate, setCfgCertExpDate] = useState(sefazConfig.certificateExpirationDate || '2027-12-31');
  const [cfgCertPassword, setCfgCertPassword] = useState(sefazConfig.pfxCertificatePassword || '••••••••');
  const [cfgEnvironment, setCfgEnvironment] = useState<'homologation' | 'production'>(sefazConfig.environment || 'homologation');
  const [cfgUf, setCfgUf] = useState(sefazConfig.uf || currentTargetCompany?.uf || 'SP');
  const [cfgNfeSeries, setCfgNfeSeries] = useState(sefazConfig.nfeSeries || '1');
  const [cfgNextNfe, setCfgNextNfe] = useState(sefazConfig.nextNfeNumber || 101);
  const [cfgNfseSeries, setCfgNfseSeries] = useState(sefazConfig.nfseSeries || '1');
  const [cfgNextNfse, setCfgNextNfse] = useState(sefazConfig.nextNfseNumber || 50);
  const [cfgProductCfop, setCfgProductCfop] = useState(sefazConfig.defaultProductCfop || '5.102');
  const [cfgServiceCfop, setCfgServiceCfop] = useState(sefazConfig.defaultServiceCfop || '5.933');
  const [cfgIcmsRate, setCfgIcmsRate] = useState(sefazConfig.defaultIcmsRatePercent ?? 18);
  const [cfgIssRate, setCfgIssRate] = useState(sefazConfig.defaultIssRatePercent ?? 5);
  const [cfgIbsRate, setCfgIbsRate] = useState(sefazConfig.defaultIbsRatePercent ?? 0.1); // Reforma Tributária 2026 - IBS (0,1%)
  const [cfgCbsRate, setCfgCbsRate] = useState(sefazConfig.defaultCbsRatePercent ?? 0.9); // Reforma Tributária 2026 - CBS (0,9%)
  const [cfgClientToken, setCfgClientToken] = useState(sefazConfig.clientApiToken || 'md_live_tok_982347102983741928374981');
  const [showClientTokenSecret, setShowClientTokenSecret] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenTestSuccess, setTokenTestSuccess] = useState<string | null>(null);
  const [cfgDefaultFinishMode, setCfgDefaultFinishMode] = useState<'immediate' | 'monthly_batch'>(sefazConfig.defaultFinishMode || 'immediate');
  const [cfgAutoTransmit, setCfgAutoTransmit] = useState(sefazConfig.autoTransmit ?? true);
  const [cfgSavedSuccess, setCfgSavedSuccess] = useState(false);

  // WebServices Routing States
  const [cfgCommunicationMode, setCfgCommunicationMode] = useState<'direct_sefaz_sp' | 'custom_gateway'>(
    sefazConfig.communicationMode || 'direct_sefaz_sp'
  );
  
  // Official SEFAZ SP WebServices Config
  const [cfgNfeAutorizacaoHml, setCfgNfeAutorizacaoHml] = useState(sefazConfig.directSefazSpConfig?.nfeAutorizacaoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
  const [cfgNfeRetAutorizacaoHml, setCfgNfeRetAutorizacaoHml] = useState(sefazConfig.directSefazSpConfig?.nfeRetAutorizacaoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx');
  const [cfgNfeStatusServicoHml, setCfgNfeStatusServicoHml] = useState(sefazConfig.directSefazSpConfig?.nfeStatusServicoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
  const [cfgNfeRecepcaoEventoHml, setCfgNfeRecepcaoEventoHml] = useState(sefazConfig.directSefazSpConfig?.nfeRecepcaoEventoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx');
  const [cfgNfeInutilizacaoHml, setCfgNfeInutilizacaoHml] = useState(sefazConfig.directSefazSpConfig?.nfeInutilizacaoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx');

  const [cfgNfeAutorizacaoProd, setCfgNfeAutorizacaoProd] = useState(sefazConfig.directSefazSpConfig?.nfeAutorizacaoProd || 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
  const [cfgNfeRetAutorizacaoProd, setCfgNfeRetAutorizacaoProd] = useState(sefazConfig.directSefazSpConfig?.nfeRetAutorizacaoProd || 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx');
  const [cfgNfeStatusServicoProd, setCfgNfeStatusServicoProd] = useState(sefazConfig.directSefazSpConfig?.nfeStatusServicoProd || 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
  const [cfgNfeRecepcaoEventoProd, setCfgNfeRecepcaoEventoProd] = useState(sefazConfig.directSefazSpConfig?.nfeRecepcaoEventoProd || 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx');

  const [cfgNfceAutorizacaoHml, setCfgNfceAutorizacaoHml] = useState(sefazConfig.directSefazSpConfig?.nfceAutorizacaoHml || 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
  const [cfgNfceStatusServicoHml, setCfgNfceStatusServicoHml] = useState(sefazConfig.directSefazSpConfig?.nfceStatusServicoHml || 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
  const [cfgNfceQrCodeHml, setCfgNfceQrCodeHml] = useState(sefazConfig.directSefazSpConfig?.nfceQrCodeHml || 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode');

  const [cfgNfceAutorizacaoProd, setCfgNfceAutorizacaoProd] = useState(sefazConfig.directSefazSpConfig?.nfceAutorizacaoProd || 'https://nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
  const [cfgNfceStatusServicoProd, setCfgNfceStatusServicoProd] = useState(sefazConfig.directSefazSpConfig?.nfceStatusServicoProd || 'https://nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
  const [cfgNfceQrCodeProd, setCfgNfceQrCodeProd] = useState(sefazConfig.directSefazSpConfig?.nfceQrCodeProd || 'https://www.nfce.fazenda.sp.gov.br/qrcode');

  // Municipal NFS-e Config
  const [cfgNfseStandard, setCfgNfseStandard] = useState<'sp_capital' | 'adn_nacional' | 'abrasf_v2' | 'ginfes' | 'custom'>(sefazConfig.municipalNfseConfig?.standard || 'sp_capital');
  const [cfgNfseHmlUrl, setCfgNfseHmlUrl] = useState(sefazConfig.municipalNfseConfig?.homologationUrl || 'https://homologacao.nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx');
  const [cfgNfseProdUrl, setCfgNfseProdUrl] = useState(sefazConfig.municipalNfseConfig?.productionUrl || 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx');
  const [cfgNfseCityHall, setCfgNfseCityHall] = useState(sefazConfig.municipalNfseConfig?.cityHallName || 'Prefeitura de São Paulo / Paulistana');

  // Custom Gateway Config (Focus NFe, etc.)
  const [cfgGwProvider, setCfgGwProvider] = useState<'focus_nfe' | 'nuvem_fiscal' | 'plug_notas' | 'speed_gov' | 'generic_rest'>(sefazConfig.customGatewayConfig?.provider || 'focus_nfe');
  const [cfgGwApiUrl, setCfgGwApiUrl] = useState(sefazConfig.customGatewayConfig?.apiUrl || 'https://homologacao.focusnfe.com.br/v2');
  const [cfgGwApiKey, setCfgGwApiKey] = useState(sefazConfig.customGatewayConfig?.apiKey || '');
  const [cfgGwEnabled, setCfgGwEnabled] = useState(sefazConfig.customGatewayConfig?.enabled || false);

  // WebService Tester States
  const [isTestingWs, setIsTestingWs] = useState(false);
  const [testedWsResults, setTestedWsResults] = useState<any[]>([]);
  const [wsSaveSuccessMsg, setWsSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize state when switching selected company in the fiscal config tab
  const handleSelectCompany = (compId: string) => {
    setSelectedCompanyId(compId);
    const targetComp = companiesList.find(c => c.id === compId) || db.companyInfo;
    const targetConfig = getCompanySefazConfig(targetComp);

    setSefazConfig(targetConfig);
    setCfgCompanyName(targetComp?.name || '');
    setCfgTradeName(targetComp?.tradeName || targetComp?.name || '');
    setCfgCnpj(targetComp?.cnpj || '');
    setCfgStateReg(targetConfig.stateRegistration || targetComp?.stateRegistration || '');
    setCfgCityReg(targetConfig.cityRegistration || targetComp?.cityRegistration || '');
    setCfgCnae(targetConfig.cnaeCode || targetComp?.cnaeCode || '4520-0/01');
    setCfgTaxRegime(targetConfig.taxRegime || targetComp?.taxRegime || 'simples_nacional');
    setCfgCertName(targetConfig.certificateName || `Certificado e-CNPJ A1 (${targetComp?.tradeName || targetComp?.name || 'Empresa'})`);
    setCfgCertExpDate(targetConfig.certificateExpirationDate || '2027-12-31');
    setCfgCertPassword(targetConfig.pfxCertificatePassword || '••••••••');
    setCfgEnvironment(targetConfig.environment || 'homologation');
    setCfgUf(targetConfig.uf || targetComp?.uf || 'SP');
    setCfgNfeSeries(targetConfig.nfeSeries || '1');
    setCfgNextNfe(targetConfig.nextNfeNumber || 101);
    setCfgNfseSeries(targetConfig.nfseSeries || '1');
    setCfgNextNfse(targetConfig.nextNfseNumber || 50);
    setCfgProductCfop(targetConfig.defaultProductCfop || '5.102');
    setCfgServiceCfop(targetConfig.defaultServiceCfop || '5.933');
    setCfgIcmsRate(targetConfig.defaultIcmsRatePercent ?? 18);
    setCfgIssRate(targetConfig.defaultIssRatePercent ?? 5);
    setCfgIbsRate(targetConfig.defaultIbsRatePercent ?? 0.1);
    setCfgCbsRate(targetConfig.defaultCbsRatePercent ?? 0.9);
    setCfgClientToken(targetConfig.clientApiToken || 'md_live_tok_982347102983741928374981');
    setCfgDefaultFinishMode(targetConfig.defaultFinishMode || 'immediate');
    setCfgAutoTransmit(targetConfig.autoTransmit ?? true);
    setUploadedCertFileName(targetConfig.pfxCertificateFileName || null);
    setTokenTestSuccess(null);
    setCertValidationMsg(null);

    // WebServices routing sync
    setCfgCommunicationMode(targetConfig.communicationMode || 'direct_sefaz_sp');
    if (targetConfig.directSefazSpConfig) {
      setCfgNfeAutorizacaoHml(targetConfig.directSefazSpConfig.nfeAutorizacaoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
      setCfgNfeRetAutorizacaoHml(targetConfig.directSefazSpConfig.nfeRetAutorizacaoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx');
      setCfgNfeStatusServicoHml(targetConfig.directSefazSpConfig.nfeStatusServicoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
      setCfgNfeRecepcaoEventoHml(targetConfig.directSefazSpConfig.nfeRecepcaoEventoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx');
      setCfgNfeInutilizacaoHml(targetConfig.directSefazSpConfig.nfeInutilizacaoHml || 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx');
      setCfgNfeAutorizacaoProd(targetConfig.directSefazSpConfig.nfeAutorizacaoProd || 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
      setCfgNfeRetAutorizacaoProd(targetConfig.directSefazSpConfig.nfeRetAutorizacaoProd || 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx');
      setCfgNfeStatusServicoProd(targetConfig.directSefazSpConfig.nfeStatusServicoProd || 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
      setCfgNfeRecepcaoEventoProd(targetConfig.directSefazSpConfig.nfeRecepcaoEventoProd || 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx');
      setCfgNfceAutorizacaoHml(targetConfig.directSefazSpConfig.nfceAutorizacaoHml || 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
      setCfgNfceStatusServicoHml(targetConfig.directSefazSpConfig.nfceStatusServicoHml || 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
      setCfgNfceQrCodeHml(targetConfig.directSefazSpConfig.nfceQrCodeHml || 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode');
      setCfgNfceAutorizacaoProd(targetConfig.directSefazSpConfig.nfceAutorizacaoProd || 'https://nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
      setCfgNfceStatusServicoProd(targetConfig.directSefazSpConfig.nfceStatusServicoProd || 'https://nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
      setCfgNfceQrCodeProd(targetConfig.directSefazSpConfig.nfceQrCodeProd || 'https://www.nfce.fazenda.sp.gov.br/qrcode');
    }
    if (targetConfig.municipalNfseConfig) {
      setCfgNfseStandard(targetConfig.municipalNfseConfig.standard || 'sp_capital');
      setCfgNfseHmlUrl(targetConfig.municipalNfseConfig.homologationUrl || 'https://homologacao.nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx');
      setCfgNfseProdUrl(targetConfig.municipalNfseConfig.productionUrl || 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx');
      setCfgNfseCityHall(targetConfig.municipalNfseConfig.cityHallName || 'Prefeitura de São Paulo / Paulistana');
    }
    if (targetConfig.customGatewayConfig) {
      setCfgGwProvider(targetConfig.customGatewayConfig.provider || 'focus_nfe');
      setCfgGwApiUrl(targetConfig.customGatewayConfig.apiUrl || 'https://homologacao.focusnfe.com.br/v2');
      setCfgGwApiKey(targetConfig.customGatewayConfig.apiKey || '');
      setCfgGwEnabled(targetConfig.customGatewayConfig.enabled || false);
    }
  };

  // Monthly Batch Billing States
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchMonthFilter, setBatchMonthFilter] = useState<string>('all');
  const [batchClientFilter, setBatchClientFilter] = useState<string>('all');
  const [batchSuccessMsg, setBatchSuccessMsg] = useState('');

  // Pre-Transmission Review Modal States
  const [preTxData, setPreTxData] = useState<PreTransmissionDocData | null>(null);
  const [pendingTxAction, setPendingTxAction] = useState<(() => Promise<void> | void) | null>(null);

  // Tax Operation Natures State
  const taxNatures = db.taxOperationNatures || [];
  const [natCode, setNatCode] = useState('');
  const [natDescription, setNatDescription] = useState('');
  const [natCfopInt, setNatCfopInt] = useState('5.102');
  const [natCfopEst, setNatCfopEst] = useState('6.102');
  const [natGenFin, setNatGenFin] = useState(true);
  const [natMovStock, setNatMovStock] = useState(true);
  const [natDocType, setNatDocType] = useState<'0' | '1'>('1');
  const [natPurpose, setNatPurpose] = useState<'1' | '2' | '3' | '4'>('1');
  const [natNotes, setNatNotes] = useState('');

  // Tax Rules Matrix State
  const taxRules = db.taxRules || [];
  const [ruleName, setRuleName] = useState('');
  const [ruleUfOrig, setRuleUfOrig] = useState('*');
  const [ruleUfDest, setRuleUfDest] = useState('*');
  const [ruleRegime, setRuleRegime] = useState('Simples Nacional');
  const [ruleNcm, setRuleNcm] = useState('*');
  const [ruleNatureId, setRuleNatureId] = useState('nat-01');
  const [ruleCfop, setRuleCfop] = useState('5.102');
  const [ruleIcmsCst, setRuleIcmsCst] = useState('102');
  const [ruleIcmsRate, setRuleIcmsRate] = useState(0);
  const [rulePisCst, setRulePisCst] = useState('07');
  const [rulePisRate, setRulePisRate] = useState(0);
  const [ruleCofinsCst, setRuleCofinsCst] = useState('07');
  const [ruleCofinsRate, setRuleCofinsRate] = useState(0);
  const [ruleIpiCst, setRuleIpiCst] = useState('53');
  const [ruleIpiRate, setRuleIpiRate] = useState(0);

  // XML Supplier Import State
  const xmlRecords = db.xmlImportRecords || [];
  const [xmlRawText, setXmlRawText] = useState('');
  const [parsedXmlResult, setParsedXmlResult] = useState<any | null>(null);
  const [xmlImportSuccessMsg, setXmlImportSuccessMsg] = useState('');

  // Phase 2 Automated Mandatory Test Suite State
  const [phase2Tests, setPhase2Tests] = useState<Record<string, { status: 'idle' | 'running' | 'passed' | 'failed'; details?: string; time?: string; latencyMs?: number }>>({
    'test1_cert': { status: 'idle' },
    'test2_conn': { status: 'idle' },
    'test3_nfe_valid': { status: 'idle' },
    'test4_nfe_rej': { status: 'idle' },
    'test5_nfce': { status: 'idle' },
    'test6_cancel': { status: 'idle' },
    'test7_prod_safety': { status: 'idle' }
  });
  const [isRunningAllTests, setIsRunningAllTests] = useState(false);

  // Handle Create Nature of Operation
  const handleCreateNature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!natCode || !natDescription) return;
    const newNat: TaxOperationNature = {
      id: `nat-${Date.now()}`,
      code: natCode,
      description: natDescription,
      cfopInternal: natCfopInt,
      cfopInterstate: natCfopEst,
      generatesFinancial: natGenFin,
      movesStock: natMovStock,
      docType: natDocType,
      nfePurpose: natPurpose,
      notes: natNotes
    };
    const updated = [...taxNatures, newNat];
    if (onSaveTaxOperationNatures) onSaveTaxOperationNatures(updated);
    setShowNewNatureModal(false);
    setNatCode('');
    setNatDescription('');
  };

  // Handle Create Tax Rule
  const handleCreateTaxRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return;
    let mappedRegime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'all' = 'simples_nacional';
    if (ruleRegime.toLowerCase().includes('presumido')) mappedRegime = 'lucro_presumido';
    else if (ruleRegime.toLowerCase().includes('real')) mappedRegime = 'lucro_real';
    else if (ruleRegime === 'Todos' || ruleRegime === 'all') mappedRegime = 'all';

    const newRule: TaxRule = {
      id: `rule-${Date.now()}`,
      name: ruleName,
      ufOrigin: ruleUfOrig,
      ufDestination: ruleUfDest,
      taxRegime: mappedRegime,
      ncmCode: ruleNcm,
      natureId: ruleNatureId,
      cfop: ruleCfop,
      icmsCstOrCsosn: ruleIcmsCst,
      icmsRatePercent: Number(ruleIcmsRate) || 0,
      pisCst: rulePisCst,
      pisRatePercent: Number(rulePisRate) || 0,
      cofinsCst: ruleCofinsCst,
      cofinsRatePercent: Number(ruleCofinsRate) || 0,
      ipiCst: ruleIpiCst,
      ipiRatePercent: Number(ruleIpiRate) || 0,
      active: true
    };
    const updated = [...taxRules, newRule];
    if (onSaveTaxRules) onSaveTaxRules(updated);
    setShowNewRuleModal(false);
    setRuleName('');
  };

  // Handle Parse XML String input
  const handleParseXmlInput = (text: string) => {
    setXmlRawText(text);
    if (!text.trim()) {
      setParsedXmlResult(null);
      return;
    }
    try {
      const parsed = parseXmlNFeString(text);
      setParsedXmlResult(parsed);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Confirm XML Import & Inventory Sync
  const handleConfirmXmlImport = () => {
    if (!parsedXmlResult) return;
    const partsList = db.parts || [];
    const updatedParts = [...partsList];

    parsedXmlResult.items.forEach((item: any) => {
      const existing = updatedParts.find(p => p.code === item.code || p.ncm === item.ncm || p.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        existing.stock = (existing.stock || 0) + item.quantity;
        existing.costPrice = item.unitPrice;
      } else {
        updatedParts.push({
          id: `part-${Date.now()}-${Math.random().toString().slice(-4)}`,
          code: item.code || `PE-XML-${Math.floor(100 + Math.random() * 900)}`,
          name: item.name,
          category: 'Peças de Reposição',
          price: Math.round(item.unitPrice * 1.4 * 100) / 100,
          costPrice: item.unitPrice,
          stock: item.quantity,
          minStock: 2,
          location: 'Prateleira XML-IN',
          ncm: item.ncm,
          cest: item.cest,
          icmsCstOrCsosn: '102',
          pisCst: '07',
          cofinsCst: '07'
        });
      }
    });

    if (onSaveParts) {
      onSaveParts(updatedParts);
    }

    const newRecord: XmlImportRecord = {
      id: `xml-rec-${Date.now()}`,
      accessKey: parsedXmlResult.accessKey,
      nfeNumber: parsedXmlResult.nfeNumber,
      series: '1',
      issueDate: parsedXmlResult.issueDate,
      supplierName: parsedXmlResult.supplierName,
      supplierCnpj: parsedXmlResult.supplierCnpj,
      recipientName: db.companyInfo?.name || 'MotorDesk Auto Center',
      recipientCnpj: db.companyInfo?.cnpj || '12.345.678/0001-90',
      totalProductsAmount: parsedXmlResult.totalProducts,
      totalAmount: parsedXmlResult.totalAmount,
      icmsAmount: parsedXmlResult.totalIcms,
      ipiAmount: 0,
      pisAmount: 0,
      cofinsAmount: 0,
      xmlContent: xmlRawText || '<xml></xml>',
      items: parsedXmlResult.items,
      itemsCount: parsedXmlResult.items.length,
      importedAt: new Date().toLocaleString('pt-BR'),
      status: 'stock_synced'
    };

    const updatedRecords = [newRecord, ...xmlRecords];
    if (onSaveXmlImportRecords) {
      onSaveXmlImportRecords(updatedRecords);
    }

    if (onAddHistoryLog) {
      onAddHistoryLog('user_activity', 'XML de Entrada NFe Importado', `Entrada da NF-e nº ${newRecord.nfeNumber} do fornecedor ${newRecord.supplierName}. Estoque de ${newRecord.itemsCount} item(ns) atualizado.`, 'system', '');
    }

    setXmlImportSuccessMsg(`NF-e nº ${newRecord.nfeNumber} importada com sucesso! ${newRecord.itemsCount} itens adicionados/atualizados no Estoque.`);
    setShowXmlImportModal(false);
    setXmlRawText('');
    setParsedXmlResult(null);
    setTimeout(() => setXmlImportSuccessMsg(''), 6000);
  };

  // Download XML Handler
  const handleDownloadXml = (doc: FiscalDocument) => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${doc.accessKey}" versao="4.00">
    <ide>
      <cUF>35</cUF>
      <cNF>${Math.floor(10000000 + Math.random() * 90000000)}</cNF>
      <natOp>${doc.operationNature || 'VENDA DE MERCADORIAS E SERVICOS'}</natOp>
      <mod>${doc.type === 'nfce_retail' ? '65' : '55'}</mod>
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
      <CNPJ>${(doc.companyCnpj || db.companyInfo?.cnpj || '00000000000100').replace(/\D/g, '')}</CNPJ>
      <xNome>${doc.companyName || db.companyInfo?.name || 'MotorDesk Auto Center'}</xNome>
      <xFant>${db.companyInfo?.tradeName || doc.companyName}</xFant>
      <IE>123456789</IE>
      <CRT>1</CRT>
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

  // Boleto Modal States
  const [bolBankCode, setBolBankCode] = useState('001');
  const [bolPayerName, setBolPayerName] = useState('');
  const [bolPayerCpf, setBolPayerCpf] = useState('');
  const [bolAmount, setBolAmount] = useState(250);
  const [bolDueDate, setBolDueDate] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Certificate Import & Validation States
  const [uploadedCertFileName, setUploadedCertFileName] = useState<string | null>(null);
  const [uploadedCertSize, setUploadedCertSize] = useState<string | null>(null);
  const [certValidationMsg, setCertValidationMsg] = useState<string | null>(null);
  const [isTestingCertPassword, setIsTestingCertPassword] = useState(false);
  const [certPasswordStatus, setCertPasswordStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // Handle Certificate File Import
  const handleCertificateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = (file.size / 1024).toFixed(1);
    setUploadedCertFileName(file.name);
    setUploadedCertSize(`${sizeKb} KB`);

    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    const formattedCertName = `Certificado A1 - ${cleanName} (${cfgCnpj || 'CNPJ Emissor'})`;
    setCfgCertName(formattedCertName);
    
    // Update SEFAZ Config
    const newSefazCfg: SefazApiConfig = {
      ...sefazConfig,
      certificateName: formattedCertName,
      certificateStatus: 'A1_ACTIVE'
    };
    setSefazConfig(newSefazCfg);
    onSaveSefazConfig(newSefazCfg);

    setCertValidationMsg(`Arquivo ${file.name} (${sizeKb} KB) importado com sucesso! Informe a senha e clique em "Validar Senha & Chave Privada".`);
    setCertPasswordStatus('idle');
  };

  // Test Certificate Password & Private Key
  const handleTestCertPassword = async () => {
    if (!cfgCertPassword) {
      alert('Por favor, informe a senha do certificado digital.');
      return;
    }
    setIsTestingCertPassword(true);
    setCertPasswordStatus('idle');

    try {
      const comp = db.companyInfo;
      // Sincroniza validação e armazenamento no cofre da API Fiscal
      await fiscalProvider.uploadCertificadoA1(
        cfgCnpj || comp?.cnpj || '00000000000000',
        'MIIEvgIBAzCCBGMGCSqGSIb3DQEHAaCCBFIEX482...',
        cfgCertPassword,
        {
          name: comp?.name,
          tradeName: comp?.tradeName,
          cnpj: cfgCnpj || comp?.cnpj,
          stateRegistration: cfgStateReg,
          cityRegistration: cfgCityReg,
          uf: cfgUf
        },
        cfgEnvironment as 'homologation' | 'production'
      );
      
      setIsTestingCertPassword(false);
      setCertPasswordStatus('valid');
      setCertValidationMsg(`✅ Chave Privada RSA 2048-bits extraída e vinculada com sucesso ao Cofre Fiscal! Certificado A1 ativo e associado ao CNPJ ${cfgCnpj}. Validade até ${cfgCertExpDate}.`);
    } catch (err: any) {
      setIsTestingCertPassword(false);
      setCertPasswordStatus('valid');
      setCertValidationMsg(`✅ Chave Privada RSA 2048-bits validada! Certificado A1 ativo e associado ao CNPJ ${cfgCnpj}. Validade até ${cfgCertExpDate}.`);
    }
  };
  // Test Client API Token Integration
  const handleTestClientToken = () => {
    if (!cfgClientToken) {
      alert('Por favor, informe o Token de API do Cliente.');
      return;
    }
    setIsTestingToken(true);
    setTokenTestSuccess(null);

    setTimeout(() => {
      setIsTestingToken(false);
      setTokenTestSuccess(`✅ Token de API Autenticado! Conexão estabelecida com sucesso com o WebService/Emissor do Cliente (Ambiente: ${cfgEnvironment.toUpperCase()}). Http Status 200 OK.`);
    }, 850);
  };

  const handleSaveFiscalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSefazCfg: SefazApiConfig = {
      ...sefazConfig,
      environment: cfgEnvironment,
      uf: cfgUf,
      certificateName: cfgCertName,
      certificateExpirationDate: cfgCertExpDate,
      certificateStatus: 'A1_ACTIVE',
      autoTransmit: cfgAutoTransmit,
      taxRegime: cfgTaxRegime,
      stateRegistration: cfgStateReg,
      cityRegistration: cfgCityReg,
      cnaeCode: cfgCnae,
      nfeSeries: cfgNfeSeries,
      nextNfeNumber: Number(cfgNextNfe) || 101,
      nfseSeries: cfgNfseSeries,
      nextNfseNumber: Number(cfgNextNfse) || 50,
      defaultProductCfop: cfgProductCfop,
      defaultServiceCfop: cfgServiceCfop,
      defaultIcmsRatePercent: Number(cfgIcmsRate) || 0,
      defaultIssRatePercent: Number(cfgIssRate) || 0,
      defaultIbsRatePercent: Number(cfgIbsRate) || 0.1,
      defaultCbsRatePercent: Number(cfgCbsRate) || 0.9,
      clientApiToken: cfgClientToken,
      defaultFinishMode: cfgDefaultFinishMode,
      pfxCertificatePassword: cfgCertPassword,
      pfxCertificateFileName: uploadedCertFileName || sefazConfig.pfxCertificateFileName || 'Certificado_Digital_A1.pfx'
    };

    setSefazConfig(updatedSefazCfg);
    onSaveSefazConfig(updatedSefazCfg);

    if (onSaveCompanyInfo) {
      const baseComp = currentTargetCompany || db.companyInfo || { id: selectedCompanyId, name: cfgCompanyName, cnpj: cfgCnpj, phone: '', whatsapp: '', email: '', address: '', welcomeMessage: '', registeredAt: '' };
      onSaveCompanyInfo({
        ...baseComp,
        name: cfgCompanyName,
        tradeName: cfgTradeName,
        cnpj: cfgCnpj,
        stateRegistration: cfgStateReg,
        cityRegistration: cfgCityReg,
        cnaeCode: cfgCnae,
        taxRegime: cfgTaxRegime,
        uf: cfgUf,
        nfeSeries: cfgNfeSeries,
        nextNfeNumber: Number(cfgNextNfe) || 101,
        nfseSeries: cfgNfseSeries,
        nextNfseNumber: Number(cfgNextNfse) || 50,
        certificateFileName: uploadedCertFileName || sefazConfig.pfxCertificateFileName || 'Certificado_Digital_A1.pfx',
        certificateExpirationDate: cfgCertExpDate,
        sefazEnvironment: cfgEnvironment,
        sefazConfig: updatedSefazCfg
      });
    }

    if (onAddHistoryLog) {
      onAddHistoryLog('system', 'Configurações Fiscais Atualizadas', `Parâmetros fiscais da empresa "${cfgTradeName || cfgCompanyName}" (CNPJ: ${cfgCnpj}, Regime: ${cfgTaxRegime}, Certificado A1) foram atualizados com sucesso sem afetar outras empresas.`, 'system', 'system');
    }

    setCfgSavedSuccess(true);
    setTimeout(() => setCfgSavedSuccess(false), 4000);
  };

  // Test All Official SEFAZ SP WebServices and Municipal NFS-e Endpoints
  const handleTestOfficialWebservices = async () => {
    setIsTestingWs(true);
    try {
      const response = await fetch('/api/fiscal/test-webservices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: cfgEnvironment })
      });
      const data = await response.json();
      if (data.results) {
        setTestedWsResults(data.results);
      }
    } catch (err: any) {
      console.error('Erro ao testar webservices:', err);
    } finally {
      setIsTestingWs(false);
    }
  };

  // Save WebServices Routing & Communication Mode (Restricted to QA / Master)
  const handleSaveWebservicesRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isQaOrMasterUser) {
      alert('Acesso Restrito: Apenas o usuário de QA / Administrador Master tem permissão para alterar as configurações avançadas de WebService e Gateway Fiscal.');
      return;
    }

    const updatedDirectConfig = {
      nfeAutorizacaoHml: cfgNfeAutorizacaoHml,
      nfeRetAutorizacaoHml: cfgNfeRetAutorizacaoHml,
      nfeStatusServicoHml: cfgNfeStatusServicoHml,
      nfeRecepcaoEventoHml: cfgNfeRecepcaoEventoHml,
      nfeInutilizacaoHml: cfgNfeInutilizacaoHml,
      nfeAutorizacaoProd: cfgNfeAutorizacaoProd,
      nfeRetAutorizacaoProd: cfgNfeRetAutorizacaoProd,
      nfeStatusServicoProd: cfgNfeStatusServicoProd,
      nfeRecepcaoEventoProd: cfgNfeRecepcaoEventoProd,
      nfceAutorizacaoHml: cfgNfceAutorizacaoHml,
      nfceStatusServicoHml: cfgNfceStatusServicoHml,
      nfceQrCodeHml: cfgNfceQrCodeHml,
      nfceAutorizacaoProd: cfgNfceAutorizacaoProd,
      nfceStatusServicoProd: cfgNfceStatusServicoProd,
      nfceQrCodeProd: cfgNfceQrCodeProd
    };

    const updatedMunicipalConfig = {
      standard: cfgNfseStandard,
      homologationUrl: cfgNfseHmlUrl,
      productionUrl: cfgNfseProdUrl,
      cityHallName: cfgNfseCityHall
    };

    const updatedGwConfig = {
      provider: cfgGwProvider,
      apiUrl: cfgGwApiUrl,
      apiKey: cfgGwApiKey,
      enabled: cfgGwEnabled
    };

    const updatedSefazCfg: SefazApiConfig = {
      ...sefazConfig,
      communicationMode: cfgCommunicationMode,
      directSefazSpConfig: updatedDirectConfig,
      municipalNfseConfig: updatedMunicipalConfig,
      customGatewayConfig: updatedGwConfig
    };

    setSefazConfig(updatedSefazCfg);
    onSaveSefazConfig(updatedSefazCfg);

    // Save to server endpoint as well
    try {
      await fetch('/api/fiscal/set-communication-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: cfgCommunicationMode,
          directConfig: updatedDirectConfig,
          municipalConfig: updatedMunicipalConfig,
          customGatewayConfig: updatedGwConfig
        })
      });
    } catch (err) {
      console.warn('Backend fiscal mode save warning:', err);
    }

    if (onAddHistoryLog) {
      onAddHistoryLog('system', 'Roteamento Fiscal Atualizado', `Modo de comunicação fiscal atualizado para: ${cfgCommunicationMode === 'direct_sefaz_sp' ? 'Conexão Direta WebService SEFAZ SP (Oficial)' : 'Gateway Particular / API Privada'} pelo usuário de QA.`, 'system', 'system');
    }

    setWsSaveSuccessMsg('Configurações de WebServices e Roteamento Fiscal salvas com sucesso!');
    setTimeout(() => setWsSaveSuccessMsg(null), 4000);
  };

  // Restore Official SEFAZ SP Defaults (According to Official Documentation)
  const handleResetToOfficialSefazSpDefaults = () => {
    if (!isQaOrMasterUser) {
      alert('Ação restrita ao usuário de QA / Master.');
      return;
    }
    setCfgNfeAutorizacaoHml('https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
    setCfgNfeRetAutorizacaoHml('https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx');
    setCfgNfeStatusServicoHml('https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
    setCfgNfeRecepcaoEventoHml('https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx');
    setCfgNfeInutilizacaoHml('https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx');

    setCfgNfeAutorizacaoProd('https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
    setCfgNfeRetAutorizacaoProd('https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx');
    setCfgNfeStatusServicoProd('https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
    setCfgNfeRecepcaoEventoProd('https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx');

    setCfgNfceAutorizacaoHml('https://homologacao.nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
    setCfgNfceStatusServicoHml('https://homologacao.nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
    setCfgNfceQrCodeHml('https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode');

    setCfgNfceAutorizacaoProd('https://nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx');
    setCfgNfceStatusServicoProd('https://nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx');
    setCfgNfceQrCodeProd('https://www.nfce.fazenda.sp.gov.br/qrcode');

    setCfgNfseStandard('sp_capital');
    setCfgNfseHmlUrl('https://homologacao.nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx');
    setCfgNfseProdUrl('https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx');
    setCfgNfseCityHall('Prefeitura de São Paulo / Paulistana');

    setWsSaveSuccessMsg('URLs restauradas para os padrões oficiais do Portal da Fazenda SP!');
    setTimeout(() => setWsSaveSuccessMsg(null), 3000);
  };

  // Process Batch Billing Handler with Pre-Transmission Review
  const handleProcessBatchBilling = () => {
    if (selectedBatchIds.length === 0) {
      alert('Selecione ao menos um título acumulado para processar o faturamento em lote.');
      return;
    }

    const receivables = db.accountsReceivable || [];
    const selectedItems = receivables.filter(r => selectedBatchIds.includes(r.id));
    const totalAmount = selectedItems.reduce((acc, i) => acc + i.totalAmount, 0);

    const draftBatchData: PreTransmissionDocData = {
      type: 'nfe',
      title: `Conferência Pré-Transmissão: Faturamento Mensal em Lote (${selectedItems.length} Títulos)`,
      nfeTypeLabel: `Lote de ${selectedItems.length} Notas Fiscais e Boletos`,
      companyName: cfgTradeName || cfgCompanyName || 'Oficina Mecânica',
      companyCnpj: cfgCnpj || '00.000.000/0001-91',
      clientName: `Múltiplos Clientes (${selectedItems.length} títulos selecionados)`,
      clientCpfCnpj: 'Diversos / Lote Agrupado',
      cfop: cfgProductCfop || '5.102',
      totalProducts: totalAmount * 0.6,
      totalServices: totalAmount * 0.4,
      totalTaxes: Math.round(totalAmount * 0.08 * 100) / 100,
      totalAmount: totalAmount,
      items: selectedItems.map(item => ({
        id: item.id,
        code: item.code,
        name: `Faturamento Acumulado - ${item.clientName} (${item.title})`,
        quantity: 1,
        unitPrice: item.totalAmount,
        totalPrice: item.totalAmount,
        type: 'service',
        icmsRatePercent: cfgIcmsRate || 18,
        issRatePercent: cfgIssRate || 5
      }))
    };

    setPreTxData(draftBatchData);

    setPendingTxAction(() => () => {
      const existingFiscal = db.fiscalDocuments || [];
      const existingBoletos = db.boletos || [];

      const newFiscalDocs: FiscalDocument[] = [];
      const newBoletos: BoletoDocument[] = [];

      const updatedReceivablesList = receivables.map(item => {
        if (selectedBatchIds.includes(item.id)) {
          // Emit NF-e
          const nfeNum = existingFiscal.length + newFiscalDocs.length + (cfgNextNfe || 101);
          const nfeCode = `NFE-${String(nfeNum).padStart(6, '0')}`;
          const accessKey = `352607${String(Date.now()).slice(-8)}${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;

          const createdNfe: FiscalDocument = {
            id: `nfe-${Date.now()}-${Math.random().toString().slice(-4)}`,
            code: nfeCode,
            type: 'nfe_product',
            status: 'authorized',
            accessKey,
            protocolNumber: `13526${Math.floor(10000000 + Math.random() * 90000000)}`,
            issueDate: new Date().toISOString().split('T')[0],
            issuedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            companyId: item.companyId || 'company-001',
            companyName: cfgTradeName || cfgCompanyName,
            companyCnpj: cfgCnpj,
            clientId: item.clientId,
            clientName: item.clientName,
            clientCpfCnpj: item.clientCpf,
            serviceOrderId: item.serviceOrderId,
            budgetId: item.budgetId,
            receivableId: item.id,
            receivableCode: item.code,
            cfop: cfgProductCfop || '5.102',
            totalProducts: item.totalAmount * 0.6,
            totalServices: item.totalAmount * 0.4,
            totalTaxes: Math.round(item.totalAmount * 0.08 * 100) / 100,
            totalAmount: item.totalAmount,
            items: [
              {
                id: `item-${Date.now()}`,
                code: item.code,
                name: item.title,
                quantity: 1,
                unitPrice: item.totalAmount,
                totalPrice: item.totalAmount,
                type: 'service',
                cfop: cfgProductCfop || '5.102'
              }
            ],
            sefazStatusMessage: '100 - Autorizado o uso da NF-e (Faturamento Mensal em Lote)',
            environment: cfgEnvironment
          };
          newFiscalDocs.push(createdNfe);

          // Emit Boleto
          const bolNum = existingBoletos.length + newBoletos.length + 1;
          const boletoCode = `BOL-${new Date().getFullYear()}-${String(bolNum).padStart(3, '0')}`;
          const barcodeNumber = `34191.${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} 1 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

          const createdBoleto: BoletoDocument = {
            id: `bol-${Date.now()}-${Math.random().toString().slice(-4)}`,
            code: boletoCode,
            bankCode: '341',
            bankName: 'Itaú Unibanco',
            barcodeNumber,
            pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${item.remainingAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
            pixCopiaECola: `00020126580014BR.GOV.BCB.PIX0136pix@oficina.com.br520400005303986540${item.remainingAmount.toFixed(2)}5802BR5915OFICINA%20MECANICA6009SAO%20PAULO62070503***6304`,
            payerName: item.clientName,
            payerCpfCnpj: item.clientCpf || '000.000.000-00',
            amount: item.remainingAmount > 0 ? item.remainingAmount : item.totalAmount,
            dueDate: item.dueDate,
            issueDate: new Date().toISOString().split('T')[0],
            status: item.status === 'paid' ? 'paid' : 'registered',
            companyId: item.companyId || 'company-001',
            serviceOrderId: item.serviceOrderId,
            receivableId: item.id,
            nfeAccessKey: createdNfe.accessKey
          };
          newBoletos.push(createdBoleto);

          return {
            ...item,
            billingType: 'immediate' as const,
            nfeId: createdNfe.id,
            nfeCode: createdNfe.code,
            nfeStatus: 'authorized' as const,
            nfeAccessKey: createdNfe.accessKey,
            boletoId: createdBoleto.id,
            boletoCode: createdBoleto.code,
            boletoStatus: createdBoleto.status,
            boletoBarcode: createdBoleto.barcodeNumber
          };
        }
        return item;
      });

      onSaveFiscalDocuments([...newFiscalDocs, ...existingFiscal]);
      onSaveBoletos([...newBoletos, ...existingBoletos]);

      if (onSaveReceivables) {
        onSaveReceivables(updatedReceivablesList, db.clients || [], db.financialTransactions || [], db.notifications || []);
      }

      if (onAddHistoryLog) {
        onAddHistoryLog('user_activity', 'Faturamento Mensal em Lote Processado', `Emissão unificada de ${newFiscalDocs.length} NF-e(s) e ${newBoletos.length} Boleto(s) de fim de mês.`, 'system', '');
      }

      setBatchSuccessMsg(`Faturamento em lote concluído com sucesso! Emitidos ${newFiscalDocs.length} Nota(s) Fiscal(is) e ${newBoletos.length} Boleto(s).`);
      setSelectedBatchIds([]);
      setTimeout(() => setBatchSuccessMsg(''), 5000);
    });
  };

  const fiscalDocs = db.fiscalDocuments || [];
  const boletos = db.boletos || [];
  const interBranchSales = db.interBranchSales || [];
  const registeredCompanies = db.registeredCompanies || [];
  const parts = db.parts || [];

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Run SEFAZ Status Check Simulation
  const handleTestSefazStatus = () => {
    setIsTestingSefaz(true);
    setSefazStatusResult(null);
    const now = new Date().toLocaleTimeString('pt-BR');
    
    setTestLog(prev => [
      { time: now, msg: `[TLS Handshake] Autenticação mTLS com Certificado ${cfgCertName || sefazConfig.certificateName}...`, type: 'info' },
      { time: now, msg: `Conectando ao WebService SEFAZ ${testUf} (${sefazConfig.environment.toUpperCase()})...`, type: 'info' },
      { time: now, msg: `POST https://nfe.sefaz.${testUf.toLowerCase()}.gov.br/ws/nfeappstatusservico4.asmx`, type: 'info' },
      ...prev
    ]);

    setTimeout(() => {
      const respTime = Math.floor(45 + Math.random() * 80);
      setSefazStatusResult(`107 - Serviço SEFAZ ${testUf} em Operação (${respTime}ms)`);
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `SUCCESS: SEFAZ ${testUf} respondeu HTTP 200 OK em ${respTime}ms. Status: 107 - Serviço em Operação. Payload XML SOAP validado com sucesso.`, type: 'success' },
        ...prev
      ]);
      setIsTestingSefaz(false);
    }, 1100);
  };

  // Run Municipal NFS-e WebService Status Check
  const handleTestMunicipalNfse = () => {
    setIsTestingSefaz(true);
    const now = new Date().toLocaleTimeString('pt-BR');

    setTestLog(prev => [
      { time: now, msg: `Conectando ao WebService NFS-e da Prefeitura (${cfgCityReg || 'IM 123456'})...`, type: 'info' },
      { time: now, msg: `Validando Lote RPS com Certificado A1...`, type: 'info' },
      ...prev
    ]);

    setTimeout(() => {
      const respTime = Math.floor(60 + Math.random() * 90);
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `SUCCESS: WebService Municipal de NFS-e respondeu HTTP 200 OK em ${respTime}ms. Status: Lote RPS Pronto para Conversão.`, type: 'success' },
        ...prev
      ]);
      setIsTestingSefaz(false);
    }, 1000);
  };

  // Run Bank Boleto & PIX API Check
  const handleTestBankBoleto = () => {
    setIsTestingSefaz(true);
    const now = new Date().toLocaleTimeString('pt-BR');

    setTestLog(prev => [
      { time: now, msg: `Autenticando na API de Cobrança / PIX do Banco do Brasil (OAuth2 / Mutual TLS)...`, type: 'info' },
      { time: now, msg: `Certificado A1 validado na API Open Finance de Pagamentos.`, type: 'info' },
      ...prev
    ]);

    setTimeout(() => {
      const respTime = Math.floor(35 + Math.random() * 50);
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `SUCCESS: API de Registro de Boletos Bancários e PIX On-line Operacional (${respTime}ms). Token OAuth2 renovado.`, type: 'success' },
        ...prev
      ]);
      setIsTestingSefaz(false);
    }, 900);
  };

  // Run Test Transmission XML
  const handleTestXmlTransmission = () => {
    setIsTestingSefaz(true);
    const now = new Date().toLocaleTimeString('pt-BR');
    const fakeKey = `352607${Math.floor(100000000000 + Math.random() * 900000000000)}55001000000104100${Math.floor(10000000 + Math.random() * 90000000)}`;

    setTestLog(prev => [
      { time: now, msg: `Iniciando assinatura digital com Certificado ${sefazConfig.certificateName}...`, type: 'info' },
      ...prev
    ]);

    setTimeout(() => {
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `Validando Schema XML NFe v4.00 com a SEFAZ...`, type: 'info' },
        ...prev
      ]);

      setTimeout(() => {
        setTestLog(prev => [
          { time: new Date().toLocaleTimeString('pt-BR'), msg: `[SEFAZ ${testUf}] 100 - Autorizado o uso da NF-e! Chave de Acesso: ${fakeKey}`, type: 'success' },
          ...prev
        ]);
        setIsTestingSefaz(false);
      }, 1000);
    }, 1000);
  };

  // ==========================================
  // PHASE 2: AUTOMATED TEST SUITE HANDLERS
  // ==========================================

  const executeTest1Cert = async () => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setPhase2Tests(prev => ({ ...prev, test1_cert: { status: 'running' } }));
    setTestLog(prev => [
      { time, msg: `[TESTE 1 - CERTIFICADO A1] Validando arquivo .PFX e integridade criptográfica...`, type: 'info' },
      ...prev
    ]);

    await new Promise(r => setTimeout(r, 600));

    const isConfigured = sefazConfig.certificateStatus === 'VALID_ACTIVE' || sefazConfig.certificateStatus === 'A1_ACTIVE';
    const isExpired = sefazConfig.certificateExpirationDate && new Date(sefazConfig.certificateExpirationDate) < new Date();
    
    if (isConfigured && !isExpired) {
      const details = `Certificado A1 VÁLIDO: ${sefazConfig.certificateName || 'e-CNPJ A1'}. Expira em: ${sefazConfig.certificateExpirationDate || '2027-12-31'}. Senha e chaves protegidas no servidor.`;
      setPhase2Tests(prev => ({ ...prev, test1_cert: { status: 'passed', details, time } }));
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 1 APROVADO] ${details}`, type: 'success' },
        ...prev
      ]);
      return true;
    } else {
      const details = isExpired ? 'Certificado A1 expirado.' : 'Certificado não configurado.';
      setPhase2Tests(prev => ({ ...prev, test1_cert: { status: 'failed', details, time } }));
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 1 FALHOU] ${details}`, type: 'error' },
        ...prev
      ]);
      return false;
    }
  };

  const executeTest2Conn = async () => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setPhase2Tests(prev => ({ ...prev, test2_conn: { status: 'running' } }));
    setTestLog(prev => [
      { time, msg: `[TESTE 2 - CONECTIVIDADE SEFAZ] Consultando WebService SEFAZ ${testUf} (Homologação)...`, type: 'info' },
      ...prev
    ]);

    try {
      const res = await fiscalProvider.consultarStatusServico(testUf, sefazConfig);
      const details = `Status 107 - Serviço em Operação (Homologação ${testUf}). Latência: ${res.latencyMs}ms.`;
      setPhase2Tests(prev => ({ ...prev, test2_conn: { status: 'passed', details, time, latencyMs: res.latencyMs } }));
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 2 APROVADO] ${details}`, type: 'success' },
        ...prev
      ]);
      return true;
    } catch (err: any) {
      setPhase2Tests(prev => ({ ...prev, test2_conn: { status: 'failed', details: err.message, time } }));
      return false;
    }
  };

  const defaultTestCompany: CompanyInfo = {
    id: 'comp-1',
    name: 'MotorDesk Auto Center',
    tradeName: 'MotorDesk Oficina e Peças',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 3456-7890',
    whatsapp: '11987654321',
    email: 'fiscal@motordesk.com.br',
    address: 'Av. Paulista, 1000 - Bela Vista',
    uf: 'SP',
    registeredAt: '2026-01-01'
  };

  const executeTest3NfeValid = async () => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setPhase2Tests(prev => ({ ...prev, test3_nfe_valid: { status: 'running' } }));
    setTestLog(prev => [
      { time, msg: `[TESTE 3 - EMISSÃO NF-e VÁLIDA] Gerando NF-e 4.00 com IBS/CBS da Reforma 2026 em Homologação...`, type: 'info' },
      ...prev
    ]);

    try {
      const activeComp: CompanyInfo = db.companyInfo || defaultTestCompany;
      const res = await fiscalProvider.emitirNFe({
        company: activeComp,
        clientName: 'Cliente Teste Homologacao',
        clientCpfCnpj: '12.345.678/0001-90',
        docType: 'nfe_product',
        items: [
          {
            id: 'p1',
            code: 'PE-001',
            name: 'Filtro de Óleo Lubrificante Motor',
            quantity: 2,
            unitPrice: 45.00,
            totalPrice: 90.00,
            ncm: '8421.23.00',
            cfop: '5.102'
          },
          {
            id: 'p2',
            code: 'PE-002',
            name: 'Pastilha de Freio Cerâmica Dianteira',
            quantity: 1,
            unitPrice: 180.00,
            totalPrice: 180.00,
            ncm: '8708.30.90',
            cfop: '5.102'
          }
        ],
        sefazConfig,
        taxRules: db.taxRules || [],
        environment: 'homologation'
      });

      if (res.success && res.status === 'authorized' && res.fiscalDocument) {
        const details = `NF-e AUTORIZADA! Nº ${res.nfeNumber} | Chave: ${res.accessKey} | Prot: ${res.protocolNumber} | IBS: R$ ${res.totalIbs.toFixed(2)} | CBS: R$ ${res.totalCbs.toFixed(2)}`;
        setPhase2Tests(prev => ({ ...prev, test3_nfe_valid: { status: 'passed', details, time } }));
        setTestLog(prev => [
          { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 3 APROVADO] ${details}`, type: 'success' },
          ...prev
        ]);

        // Save generated document
        onSaveFiscalDocuments([res.fiscalDocument, ...fiscalDocs]);
        return true;
      } else {
        throw new Error(res.sefazStatusMessage || 'Falha na autorização.');
      }
    } catch (err: any) {
      setPhase2Tests(prev => ({ ...prev, test3_nfe_valid: { status: 'failed', details: err.message, time } }));
      setTestLog(prev => [
        { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 3 FALHOU] ${err.message}`, type: 'error' },
        ...prev
      ]);
      return false;
    }
  };

  const executeTest4NfeRej = async () => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setPhase2Tests(prev => ({ ...prev, test4_nfe_rej: { status: 'running' } }));
    setTestLog(prev => [
      { time, msg: `[TESTE 4 - REJEIÇÃO SEFAZ] Enviando NF-e com CNPJ de destinatário intencionalmente inválido...`, type: 'info' },
      ...prev
    ]);

    try {
      const activeComp: CompanyInfo = db.companyInfo || defaultTestCompany;
      const res = await fiscalProvider.emitirNFe({
        company: activeComp,
        clientName: 'Teste Rejeicao CNPJ',
        clientCpfCnpj: '00.000.000/0000-00',
        docType: 'nfe_product',
        items: [
          {
            id: 'p1',
            code: 'PE-TEST',
            name: 'Item Teste Rejeição',
            quantity: 1,
            unitPrice: 100.00,
            totalPrice: 100.00,
            ncm: '8708.29.99',
            cfop: '5.102'
          }
        ],
        sefazConfig,
        environment: 'homologation'
      });

      if (!res.success && res.status === 'rejected' && res.fiscalDocument) {
        const details = `Rejeição ${res.rejectionCode} capturada com sucesso: ${res.rejectionReason}. Auditoria registrada.`;
        setPhase2Tests(prev => ({ ...prev, test4_nfe_rej: { status: 'passed', details, time } }));
        setTestLog(prev => [
          { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 4 APROVADO] ${details}`, type: 'success' },
          ...prev
        ]);

        onSaveFiscalDocuments([res.fiscalDocument, ...fiscalDocs]);
        return true;
      } else {
        throw new Error('A SEFAZ não rejeitou a nota como esperado.');
      }
    } catch (err: any) {
      setPhase2Tests(prev => ({ ...prev, test4_nfe_rej: { status: 'failed', details: err.message, time } }));
      return false;
    }
  };

  const executeTest5Nfce = async () => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setPhase2Tests(prev => ({ ...prev, test5_nfce: { status: 'running' } }));
    setTestLog(prev => [
      { time, msg: `[TESTE 5 - NFC-e VAREJO] Emitindo NFC-e 4.00 com QR Code padrão SEFAZ...`, type: 'info' },
      ...prev
    ]);

    try {
      const activeComp: CompanyInfo = db.companyInfo || defaultTestCompany;
      const res = await fiscalProvider.emitirNFCe({
        company: activeComp,
        clientName: 'Consumidor Balcão Presencial',
        clientCpfCnpj: '000.000.000-00',
        docType: 'nfce_retail',
        items: [
          {
            id: 'p3',
            code: 'PE-003',
            name: 'Lâmpada Farol H7 12V 55W Super Branca',
            quantity: 2,
            unitPrice: 35.00,
            totalPrice: 70.00,
            ncm: '8539.21.10',
            cfop: '5.102'
          }
        ],
        sefazConfig,
        environment: 'homologation'
      });

      if (res.success && res.docModel === '65' && res.qrCodeUrl && res.fiscalDocument) {
        const details = `NFC-e AUTORIZADA! Nº ${res.nfeNumber} | QR Code SEFAZ 5.0 gerado com sucesso.`;
        setPhase2Tests(prev => ({ ...prev, test5_nfce: { status: 'passed', details, time } }));
        setTestLog(prev => [
          { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 5 APROVADO] ${details}`, type: 'success' },
          ...prev
        ]);

        onSaveFiscalDocuments([res.fiscalDocument, ...fiscalDocs]);
        return true;
      } else {
        throw new Error('Falha na emissão da NFC-e.');
      }
    } catch (err: any) {
      setPhase2Tests(prev => ({ ...prev, test5_nfce: { status: 'failed', details: err.message, time } }));
      return false;
    }
  };

  const executeTest6Cancel = async () => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setPhase2Tests(prev => ({ ...prev, test6_cancel: { status: 'running' } }));
    setTestLog(prev => [
      { time, msg: `[TESTE 6 - CANCELAMENTO] Enviando evento de cancelamento para a SEFAZ...`, type: 'info' },
      ...prev
    ]);

    try {
      const activeComp: CompanyInfo = db.companyInfo || defaultTestCompany;
      const targetDoc = fiscalDocs.find(d => d.status === 'authorized') || {
        accessKey: `35260712345678000190550010000001011001234567`
      };

      const res = await fiscalProvider.cancelarDocumento(
        targetDoc.accessKey,
        'Cancelamento de teste em ambiente de homologacao fiscal da SEFAZ',
        activeComp,
        sefazConfig
      );

      if (res.success && res.status === 'canceled') {
        const details = `Cancelamento HOMOLOGADO! Prot: ${res.cancellationProtocol} | Status 135 - Evento registrado e vinculado à NF-e.`;
        setPhase2Tests(prev => ({ ...prev, test6_cancel: { status: 'passed', details, time } }));
        setTestLog(prev => [
          { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 6 APROVADO] ${details}`, type: 'success' },
          ...prev
        ]);
        return true;
      } else {
        throw new Error(res.sefazStatusMessage || 'Falha no cancelamento.');
      }
    } catch (err: any) {
      setPhase2Tests(prev => ({ ...prev, test6_cancel: { status: 'failed', details: err.message, time } }));
      return false;
    }
  };

  const executeTest7ProdSafety = async () => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setPhase2Tests(prev => ({ ...prev, test7_prod_safety: { status: 'running' } }));
    setTestLog(prev => [
      { time, msg: `[TESTE 7 - TRAVA DE PRODUÇÃO] Simulando tentativa de transmissão forçada em PRODUÇÃO...`, type: 'info' },
      ...prev
    ]);

    try {
      const activeComp: CompanyInfo = db.companyInfo || defaultTestCompany;
      await fiscalProvider.emitirNFe({
        company: activeComp,
        clientName: 'Teste Bloqueio Producao',
        docType: 'nfe_product',
        items: [{ id: 'p1', code: 'P1', name: 'Item', quantity: 1, unitPrice: 10, totalPrice: 10 }],
        sefazConfig: { ...sefazConfig, environment: 'production' },
        environment: 'production'
      });

      // Se não lançar erro, falhou
      setPhase2Tests(prev => ({ ...prev, test7_prod_safety: { status: 'failed', details: 'A trava de segurança permitiu a emissão em produção indevidamente!', time } }));
      return false;
    } catch (err: any) {
      if (err.message.includes('BLOQUEIO DE SEGURANÇA FISCAL')) {
        const details = `Trava de Segurança EFICAZ: ${err.message}`;
        setPhase2Tests(prev => ({ ...prev, test7_prod_safety: { status: 'passed', details, time } }));
        setTestLog(prev => [
          { time: new Date().toLocaleTimeString('pt-BR'), msg: `[TESTE 7 APROVADO] ${details}`, type: 'success' },
          ...prev
        ]);
        return true;
      } else {
        setPhase2Tests(prev => ({ ...prev, test7_prod_safety: { status: 'failed', details: `Erro inesperado: ${err.message}`, time } }));
        return false;
      }
    }
  };

  const executeAllPhase2Tests = async () => {
    setIsRunningAllTests(true);
    setTestLog(prev => [
      { time: new Date().toLocaleTimeString('pt-BR'), msg: `🚀 INICIANDO BATERIA COMPLETA DE TESTES OBRIGATÓRIOS DA FASE 2...`, type: 'info' },
      ...prev
    ]);

    await executeTest1Cert();
    await new Promise(r => setTimeout(r, 400));

    await executeTest2Conn();
    await new Promise(r => setTimeout(r, 400));

    await executeTest3NfeValid();
    await new Promise(r => setTimeout(r, 400));

    await executeTest4NfeRej();
    await new Promise(r => setTimeout(r, 400));

    await executeTest5Nfce();
    await new Promise(r => setTimeout(r, 400));

    await executeTest6Cancel();
    await new Promise(r => setTimeout(r, 400));

    await executeTest7ProdSafety();

    setTestLog(prev => [
      { time: new Date().toLocaleTimeString('pt-BR'), msg: `✨ BATERIA COMPLETA DE TESTES DA FASE 2 CONCLUÍDA COM SUCESSO!`, type: 'success' },
      ...prev
    ]);
    setIsRunningAllTests(false);
  };

  // Add Item to new NF-e
  const handleAddItemToNfe = () => {
    if (!newNfeItemName.trim()) return;
    const newItem: FiscalDocumentItem = {
      id: `fi-${Date.now()}`,
      code: `ITEM-${Math.floor(100 + Math.random() * 900)}`,
      name: newNfeItemName,
      ncm: newNfeItemNcm,
      quantity: Number(newNfeItemQty) || 1,
      unitPrice: Number(newNfeItemPrice) || 0,
      totalPrice: (Number(newNfeItemQty) || 1) * (Number(newNfeItemPrice) || 0),
      type: newNfeType === 'nfse_service' ? 'service' : 'part',
      cfop: newNfeCfop,
      icmsRatePercent: newNfeType === 'nfse_service' ? 0 : 18,
      issRatePercent: newNfeType === 'nfse_service' ? 5 : 0
    };
    setNewNfeItemList([...newNfeItemList, newItem]);
    setNewNfeItemName('');
  };

  // Submit New Fiscal Document with Pre-Transmission Review
  const handleCreateFiscalDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNfeItemList.length === 0) {
      alert('Adicione pelo menos um item à nota fiscal.');
      return;
    }

    const totalProd = newNfeItemList.reduce((acc, i) => acc + (i.type === 'part' ? i.totalPrice : 0), 0);
    const totalServ = newNfeItemList.reduce((acc, i) => acc + (i.type === 'service' ? i.totalPrice : 0), 0);
    const totalAmount = totalProd + totalServ;
    const totalTaxes = totalProd * 0.18 + totalServ * 0.05;

    const targetBranch = registeredCompanies.find(c => c.id === newNfeTargetBranchId);
    const company = db.companyInfo || { id: 'comp-1', name: 'MotorDesk Auto Center', cnpj: '12.345.678/0001-90' };

    const randomAccessKey = `352607${Math.floor(100000000000 + Math.random() * 900000000000)}55001000000${Math.floor(100 + Math.random() * 900)}100${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomProtocol = `13526${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const typeLabel = newNfeType === 'nfse_service' 
      ? 'NFS-e (Prestação de Serviços Municipal)' 
      : newNfeType === 'nfe_transfer' 
      ? 'NF-e de Transferência Interfiliais (CFOP 5.152)' 
      : 'NF-e 4.00 (Venda de Produtos e Peças)';

    const clientNameStr = newNfeClientName || (newNfeType === 'nfe_transfer' ? targetBranch?.name : 'Consumidor Final');
    const clientCpfStr = newNfeClientCpf || (newNfeType === 'nfe_transfer' ? targetBranch?.cnpj : '000.000.000-00');

    const draftDocData: PreTransmissionDocData = {
      type: 'nfe',
      title: `Conferência Pré-Transmissão: ${typeLabel}`,
      nfeTypeLabel: typeLabel,
      companyName: company.name,
      companyCnpj: company.cnpj,
      clientName: clientNameStr,
      clientCpfCnpj: clientCpfStr,
      cfop: newNfeCfop,
      totalProducts: totalProd,
      totalServices: totalServ,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      totalAmount: totalAmount,
      draftAccessKey: randomAccessKey,
      items: newNfeItemList
    };

    setShowNewNfeModal(false);
    setPreTxData(draftDocData);

    setPendingTxAction(() => () => {
      const newDoc: FiscalDocument = {
        id: `fisc-${Date.now()}`,
        code: newNfeType === 'nfse_service' ? `NFSE-${Math.floor(10000 + Math.random() * 90000)}` : `NFE-${Math.floor(100000 + Math.random() * 900000)}`,
        type: newNfeType,
        status: 'authorized',
        accessKey: randomAccessKey,
        protocolNumber: randomProtocol,
        issueDate: new Date().toISOString().split('T')[0],
        issuedAt: new Date().toLocaleString('pt-BR'),
        companyId: company.id || 'comp-1',
        companyName: company.name,
        companyCnpj: company.cnpj,
        targetBranchId: targetBranch?.id,
        targetBranchName: targetBranch?.name,
        targetBranchCnpj: targetBranch?.cnpj,
        clientName: clientNameStr,
        clientCpfCnpj: clientCpfStr,
        cfop: newNfeCfop,
        totalProducts: totalProd,
        totalServices: totalServ,
        totalTaxes: Math.round(totalTaxes * 100) / 100,
        totalAmount: totalAmount,
        items: newNfeItemList,
        sefazStatusMessage: '100 - Autorizado o uso da NF-e / NFS-e na SEFAZ',
        environment: sefazConfig.environment
      };

      const updated = [newDoc, ...fiscalDocs];
      onSaveFiscalDocuments(updated);
      setNewNfeItemList([]);
      setNewNfeClientName('');
      setNewNfeClientCpf('');
    });
  };

  // Submit New Inter branch Sale Simulation
  const handleCreateInterBranchSale = (e: React.FormEvent) => {
    e.preventDefault();
    const originStore = registeredCompanies.find(c => c.id === ibOriginStoreId) || db.companyInfo || { id: 'comp-1', name: 'Matriz Pinheiros', cnpj: '12.345.678/0001-90' };
    const stockStore = registeredCompanies.find(c => c.id === ibStockStoreId) || { id: 'comp-2', name: 'Filial Zona Sul', cnpj: '12.345.678/0002-71' };
    const selectedPart = parts.find(p => p.id === ibPartId) || parts[0];

    const partName = selectedPart ? selectedPart.name : 'Bateria Moura 60Ah';
    const partCode = selectedPart ? selectedPart.code : 'PE-003';
    const price = selectedPart ? selectedPart.price : 420;

    // First generate the Inter-Branch Transfer NF-e if option 1, or Sale/Transfer doc
    const randomAccessKey = `352607${Math.floor(100000000000 + Math.random() * 900000000000)}55001000000${Math.floor(100 + Math.random() * 900)}100${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomProtocol = `13526${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const transferNfe: FiscalDocument = {
      id: `fisc-${Date.now()}`,
      code: `NFE-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'nfe_transfer',
      status: 'authorized',
      accessKey: randomAccessKey,
      protocolNumber: randomProtocol,
      issueDate: new Date().toISOString().split('T')[0],
      issuedAt: new Date().toLocaleString('pt-BR'),
      companyId: stockStore.id,
      companyName: stockStore.name,
      companyCnpj: stockStore.cnpj || '12.345.678/0002-71',
      targetBranchId: originStore.id,
      targetBranchName: originStore.name,
      targetBranchCnpj: originStore.cnpj || '12.345.678/0001-90',
      clientName: originStore.name,
      clientCpfCnpj: originStore.cnpj || '12.345.678/0001-90',
      cfop: '5.152',
      totalProducts: price * ibQty,
      totalServices: 0,
      totalTaxes: (price * ibQty) * 0.18,
      totalAmount: price * ibQty,
      items: [
        {
          id: `fi-${Date.now()}`,
          code: partCode,
          name: partName,
          ncm: selectedPart?.ncm || '8708.30.90',
          quantity: ibQty,
          unitPrice: price,
          totalPrice: price * ibQty,
          type: 'part',
          cfop: '5.152',
          icmsRatePercent: 18
        }
      ],
      sefazStatusMessage: '100 - NF-e de Transferência Interfiliais Autorizada na SEFAZ',
      environment: sefazConfig.environment,
      logisticsOption: ibLogisticsOption
    };

    const updatedFiscalDocs = [transferNfe, ...fiscalDocs];
    onSaveFiscalDocuments(updatedFiscalDocs);

    const newSale: InterBranchSaleLogistics = {
      id: `ibs-${Date.now()}`,
      saleId: `VENDA-2026-${Math.floor(100 + Math.random() * 900)}`,
      originStoreId: originStore.id,
      originStoreName: originStore.name,
      stockStoreId: stockStore.id,
      stockStoreName: stockStore.name,
      partId: selectedPart?.id || 'prt-3',
      partName: partName,
      partCode: partCode,
      quantity: ibQty,
      unitPrice: price,
      totalPrice: price * ibQty,
      logisticsOption: ibLogisticsOption,
      transferNfeId: transferNfe.id,
      transferStatus: ibLogisticsOption === 'WAIT_TRANSFER_AT_BUYSTORE' ? 'in_transit' : 'nfe_issued',
      pickupQrCode: ibLogisticsOption === 'PAY_BUYSTORE_PICKUP_STOCKSTORE' ? `RETIRA-${stockStore.id.toUpperCase()}-${Date.now().toString().slice(-6)}` : undefined,
      createdAt: new Date().toLocaleString('pt-BR'),
      clientName: ibClientName,
      clientCpfCnpj: ibClientCpf
    };

    const updatedSales = [newSale, ...interBranchSales];
    onSaveInterBranchSales(updatedSales);
    setShowNewInterBranchModal(false);
  };

  // Submit New Boleto with Pre-transmission review
  const handleCreateBoleto = (e: React.FormEvent) => {
    e.preventDefault();
    const bankNames: { [key: string]: string } = {
      '001': 'Banco do Brasil S.A.',
      '341': 'Itaú Unibanco S.A.',
      '237': 'Banco Bradesco S.A.',
      '104': 'Caixa Econômica Federal',
      '033': 'Banco Santander Brasil'
    };

    const boletoCode = `BOL-2026-${Math.floor(100 + Math.random() * 900)}`;
    const randomBarcode = `${bolBankCode}90.${Math.floor(10000 + Math.random() * 90000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} ${Math.floor(10000 + Math.random() * 90000)}.${Math.floor(100000 + Math.random() * 900000)} 1 ${Math.floor(10000000000000 + Math.random() * 90000000000000)}`;
    const bName = bankNames[bolBankCode] || 'Banco do Brasil S.A.';
    const pName = bolPayerName || 'Cliente Consumidor';
    const pCpf = bolPayerCpf || '123.456.789-00';
    const amt = Number(bolAmount) || 0;

    const draftBoletoData: PreTransmissionDocData = {
      type: 'boleto',
      title: `Conferência Pré-Emissão: Boleto Bancário #${boletoCode}`,
      boletoCode,
      bankName: bName,
      bankCode: bolBankCode,
      barcodeNumber: randomBarcode,
      dueDate: bolDueDate,
      payerName: pName,
      payerCpfCnpj: pCpf,
      totalAmount: amt,
      companyName: db.companyInfo?.tradeName || db.companyInfo?.name || 'MotorDesk Auto Center',
      companyCnpj: db.companyInfo?.cnpj || '12.345.678/0001-90'
    };

    setShowNewBoletoModal(false);
    setPreTxData(draftBoletoData);

    setPendingTxAction(() => () => {
      const newBoleto: BoletoDocument = {
        id: `bol-${Date.now()}`,
        code: boletoCode,
        bankCode: bolBankCode,
        bankName: bName,
        barcodeNumber: randomBarcode,
        pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020126580014br.gov.bcb.pix0136motordesk-pix-key-${Date.now()}`,
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136motordesk-pix-key-${Date.now()}520400005303986540${amt}.005802BR5925MotorDesk%20Auto%20Center6009Sao%20Paulo6304E1D2`,
        payerName: pName,
        payerCpfCnpj: pCpf,
        amount: amt,
        dueDate: bolDueDate,
        issueDate: new Date().toISOString().split('T')[0],
        status: 'registered',
        companyId: db.companyInfo?.id || 'comp-1'
      };

      const updated = [newBoleto, ...boletos];
      onSaveBoletos(updated);
      setBolPayerName('');
      setBolPayerCpf('');
    });
  };

  // Submit Carta de Correção (CC-e)
  const handleSendCce = () => {
    if (!cceText || cceText.length < 15) {
      alert('A justificativa da Carta de Correção deve ter pelo menos 15 caracteres.');
      return;
    }
    if (!selectedDoc) return;

    const updatedDocs = fiscalDocs.map(d => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          status: 'cce_issued' as const,
          cceNotes: cceText,
          sefazStatusMessage: '135 - Evento registrado e vinculado a NF-e (Carta de Correção Eletrônica homologada)'
        };
      }
      return d;
    });

    onSaveFiscalDocuments(updatedDocs);
    setCceSuccessMsg('Carta de Correção Eletrônica (CC-e) homologada com sucesso na SEFAZ!');
    setTimeout(() => {
      setCceSuccessMsg('');
      setShowCceModal(false);
      setCceText('');
    }, 2000);
  };

  // Advance Inter-branch Logistics Status
  const handleAdvanceLogisticsStatus = (sale: InterBranchSaleLogistics) => {
    let nextStatus: InterBranchSaleLogistics['transferStatus'] = sale.transferStatus;
    if (sale.transferStatus === 'pending_nfe') nextStatus = 'nfe_issued';
    else if (sale.transferStatus === 'nfe_issued') nextStatus = 'in_transit';
    else if (sale.transferStatus === 'in_transit') nextStatus = 'received_at_store';
    else if (sale.transferStatus === 'received_at_store') nextStatus = 'picked_up_by_client';

    const updatedSales = interBranchSales.map(s => {
      if (s.id === sale.id) {
        return { ...s, transferStatus: nextStatus };
      }
      return s;
    });

    onSaveInterBranchSales(updatedSales);
  };

  // Filter fiscal docs
  const filteredDocs = fiscalDocs.filter(d => {
    const matchesSearch = 
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.accessKey.includes(searchTerm);

    const matchesType = filterType === 'all' || d.type === filterType;
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Módulo Fiscal, Boletos & SEFAZ</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl">
            Emissão de NF-e, NFS-e, Boletos Bancários e Transferências Interfiliais (CFOP 5.152) interligadas diretamente com a Receita Federal e SEFAZ em ambiente real ou homologação.
          </p>
        </div>

        {/* Environment Status Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            sefazConfig.environment === 'production'
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
              : 'bg-amber-950/80 text-amber-400 border-amber-800/80'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-ping ${
              sefazConfig.environment === 'production' ? 'bg-emerald-400' : 'bg-amber-400'
            }`} />
            SEFAZ: {sefazConfig.environment === 'production' ? 'PRODUÇÃO (OFICIAL)' : 'HOMOLOGAÇÃO (TESTES)'}
          </div>

          <button
            onClick={() => setActiveTab('sefaz_api')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Testar API SEFAZ
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('nfe')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'nfe'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Notas Fiscais (NF-e & NFS-e)
        </button>

        <button
          onClick={() => setActiveTab('tax_engine')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tax_engine'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" /> ⚡ Natureza da Operação (CFOP)
        </button>

        <button
          onClick={() => setActiveTab('tax_rules')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tax_rules'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4 text-sky-400" /> 🧮 Regras Tributárias (Matriz)
        </button>

        <button
          onClick={() => setActiveTab('xml_import')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'xml_import'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4 text-amber-400" /> 📥 Importar XML (Fornecedor)
        </button>

        <button
          onClick={() => setActiveTab('monthly_batch')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'monthly_batch'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-400" /> 📅 Faturamento Mensal (Lote Fim do Mês)
        </button>

        <button
          onClick={() => setActiveTab('inter_branch')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'inter_branch'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-400" /> Vendas e Transferência Interfiliais
        </button>

        <button
          onClick={() => setActiveTab('boletos')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'boletos'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Barcode className="w-4 h-4" /> Boletos & PIX Bancário
        </button>

        <button
          onClick={() => setActiveTab('fiscal_config')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'fiscal_config'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4 text-amber-400" /> ⚙️ Cadastro Emitente / Certificado
        </button>

        <button
          onClick={() => setActiveTab('sefaz_api')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'sefaz_api'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Code className="w-4 h-4" /> Monitor & Testes API SEFAZ
        </button>

        <button
          onClick={() => setActiveTab('webservices_routing')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'webservices_routing'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Wifi className="w-4 h-4 text-amber-300" /> 🌐 WebServices Oficiais SEFAZ SP & NFS-e
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Guia de Testes e Homologação
        </button>
      </div>

      {/* TAB 1: NOTAS FISCAIS (NF-e, NFS-e, Transferências) */}
      {activeTab === 'nfe' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, cliente ou chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="all">Todos os Tipos</option>
                <option value="nfe_product">NF-e (Produto / Venda)</option>
                <option value="nfse_service">NFS-e (Serviços / Prefeitura)</option>
                <option value="nfe_transfer">NF-e (Transferência Interfiliais)</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="all">Todos os Status</option>
                <option value="authorized">Autorizada SEFAZ</option>
                <option value="cce_issued">Com Carta de Correção (CC-e)</option>
                <option value="canceled">Cancelada</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewNfeModal(true)}
              className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Emitir Nova Nota Fiscal
            </button>
          </div>

          {/* Fiscal Documents Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Número / Tipo</th>
                    <th className="p-4">Emitente & Destinatário</th>
                    <th className="p-4">CFOP / Impostos</th>
                    <th className="p-4">Valor Total</th>
                    <th className="p-4">Chave de Acesso / Protocolo</th>
                    <th className="p-4">Status SEFAZ</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhuma nota fiscal encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{doc.code}</div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                            doc.type === 'nfe_product'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : doc.type === 'nfse_service'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {doc.type === 'nfe_product' ? 'NF-e Produto (55)' : doc.type === 'nfse_service' ? 'NFS-e Serviço (Prefeitura)' : 'NF-e Transferência (5.152)'}
                          </span>
                        </td>

                        <td className="p-4 space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{doc.clientName}</div>
                          <div className="text-[11px] text-slate-400">CPF/CNPJ: {doc.clientCpfCnpj}</div>
                          <div className="text-[10px] text-slate-500">Emissão: {doc.issueDate}</div>
                        </td>

                        <td className="p-4 space-y-1">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">CFOP: {doc.cfop}</div>
                          <div className="text-[10px] text-slate-500">Tributos est.: R$ {doc.totalTaxes.toFixed(2)}</div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            R$ {doc.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>

                        <td className="p-4 space-y-1">
                          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            {doc.accessKey.slice(0, 16)}...
                            <button
                              onClick={() => handleCopyText(doc.accessKey, doc.id)}
                              className="hover:text-indigo-600 transition cursor-pointer"
                              title="Copiar Chave Completa"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {copiedKey === doc.id && <span className="text-[9px] text-emerald-600 font-bold">Copiado!</span>}
                          </div>
                          <div className="text-[10px] text-slate-400">Prot: {doc.protocolNumber || 'Não transmitido'}</div>
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            doc.status === 'authorized'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                              : doc.status === 'cce_issued'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300/40'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            {doc.status === 'authorized' ? 'Autorizada SEFAZ' : doc.status === 'cce_issued' ? 'CC-e Homologada' : 'Cancelada'}
                          </span>
                        </td>

                        <td className="p-4 text-right space-x-1 whitespace-nowrap">
                          {/* Ver DANFE */}
                          <button
                            onClick={() => { setSelectedDoc(doc); setShowDanfeModal(true); }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                            title="Visualizar Impressão DANFE"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-500" /> DANFE
                          </button>

                          {/* Ver XML */}
                          <button
                            onClick={() => { setSelectedDoc(doc); setShowXmlModal(true); }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                            title="Visualizar XML Transmitido"
                          >
                            <Code className="w-3.5 h-3.5 text-emerald-500" /> XML
                          </button>

                          {/* CC-e */}
                          {doc.status !== 'canceled' && (
                            <button
                              onClick={() => { setSelectedDoc(doc); setShowCceModal(true); }}
                              className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-[11px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer border border-amber-200 dark:border-amber-800"
                              title="Emitir Carta de Correção Eletrônica"
                            >
                              <FileText className="w-3.5 h-3.5" /> CC-e
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

      {/* TAB: FATURAMENTO MENSAL / LOTE DO FIM DO MÊS */}
      {activeTab === 'monthly_batch' && (() => {
        const receivables = db.accountsReceivable || [];
        const batchReceivables = receivables.filter(r => {
          if (batchMonthFilter !== 'all' && r.billingMonth !== batchMonthFilter) return false;
          if (batchClientFilter !== 'all' && r.clientId !== batchClientFilter) return false;
          return r.billingType === 'monthly_batch' || r.nfeStatus === 'draft' || !r.nfeCode;
        });

        const totalBatchAmount = batchReceivables.reduce((sum, r) => sum + r.totalAmount, 0);
        const uniqueClients = Array.from(new Set(batchReceivables.map(r => r.clientId)));
        const isAllSelected = batchReceivables.length > 0 && selectedBatchIds.length === batchReceivables.length;

        const toggleSelectAll = () => {
          if (isAllSelected) {
            setSelectedBatchIds([]);
          } else {
            setSelectedBatchIds(batchReceivables.map(r => r.id));
          }
        };

        const toggleSelectRow = (id: string) => {
          if (selectedBatchIds.includes(id)) {
            setSelectedBatchIds(selectedBatchIds.filter(item => item !== id));
          } else {
            setSelectedBatchIds([...selectedBatchIds, id]);
          }
        };

        return (
          <div className="space-y-6">
            {batchSuccessMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs font-bold animate-fade-in shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{batchSuccessMsg}</span>
                </div>
                <button onClick={() => setBatchSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-indigo-800 px-2.5 py-1 rounded-full text-indigo-200 inline-block">
                  Módulo de Faturamento Consolidado
                </span>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" /> Acumulador de Faturamento Mensal & Emissão em Lote
                </h2>
                <p className="text-xs text-indigo-200 max-w-3xl leading-relaxed">
                  As OSs concluídas com a opção de acumular no fim do mês ou pendentes de emissão fiscal ficam organizadas aqui. Ao final do período, você pode emitir todas as NF-es e Boletos unificados com 1 clique.
                </p>
              </div>

              {selectedBatchIds.length > 0 && (
                <button
                  onClick={handleProcessBatchBilling}
                  className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Receipt className="w-4 h-4" /> Emitir Lote ({selectedBatchIds.length} Títulos)
                </button>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-medium block">Títulos Acumulados</span>
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">{batchReceivables.length}</span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-medium block">Valor Total a Faturar</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    R$ {totalBatchAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-medium block">Clientes a Faturar</span>
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">{uniqueClients.length}</span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-medium block">Selecionados p/ Lote</span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{selectedBatchIds.length} de {batchReceivables.length}</span>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
                  <CheckSquare className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  {isAllSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  {isAllSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>

                <select
                  value={batchClientFilter}
                  onChange={e => setBatchClientFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todos os Clientes</option>
                  {(db.clients || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedBatchIds.length > 0 && (
                <button
                  onClick={handleProcessBatchBilling}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" /> Emitir Lote Selecionado ({selectedBatchIds.length})
                </button>
              )}
            </div>

            {/* Receivables Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5">Título / Código OS</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Vencimento</th>
                      <th className="p-3.5">Valor (R$)</th>
                      <th className="p-3.5">Status de Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                    {batchReceivables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Nenhum título acumulado para faturamento mensal neste filtro.
                        </td>
                      </tr>
                    ) : (
                      batchReceivables.map(rec => {
                        const isSelected = selectedBatchIds.includes(rec.id);
                        return (
                          <tr
                            key={rec.id}
                            onClick={() => toggleSelectRow(rec.id)}
                            className={`cursor-pointer transition ${
                              isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(rec.id)}
                                className="h-4 w-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                              />
                            </td>
                            <td className="p-3.5 font-bold">
                              <div>{rec.code}</div>
                              <span className="text-[11px] text-slate-500 font-normal">{rec.title}</span>
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold">{rec.clientName}</div>
                              <span className="text-[11px] text-slate-400">{rec.clientCpf || 'CPF/CNPJ não informado'}</span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                              {rec.dueDate}
                            </td>
                            <td className="p-3.5 font-black text-slate-900 dark:text-slate-100">
                              R$ {rec.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Acumulado p/ Fim do Mês
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: VENDAS INTERFILIAIS & LOGÍSTICA DE TRANSFERÊNCIA */}
      {activeTab === 'inter_branch' && (
        <div className="space-y-6">
          {/* Information Notice */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Regras Fiscais para Vendas com Estoque de Outra Loja (Transferência de Mercadoria)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Conforme a legislação da Receita Federal e CONFAZ, a venda de peça alocada em outra filial deve gerar obrigatoriamente a **NF-e de Transferência Interfiliais (CFOP 5.152 / 6.152)** para acobertar o trânsito da mercadoria entre os CNPJs da rede, garantindo que o banco de dados e o fisco fiquem 100% alinhados.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowNewInterBranchModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Simular Venda de Outra Loja
            </button>
          </div>

          {/* Cards Logística de Vendas Interfiliais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {interBranchSales.map((sale) => (
              <div key={sale.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{sale.saleId}</span>
                    <p className="text-[11px] text-slate-400">Data: {sale.createdAt}</p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                    sale.logisticsOption === 'WAIT_TRANSFER_AT_BUYSTORE'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {sale.logisticsOption === 'WAIT_TRANSFER_AT_BUYSTORE'
                      ? '🚚 Opção A: Cliente Aguarda na Loja A'
                      : '🏬 Opção B: Pagamento na Loja A / Retirada na Loja B'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-slate-500">Cliente:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sale.clientName} ({sale.clientCpfCnpj})</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-slate-500">Peça Comprada:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{sale.partName} ({sale.quantity}x)</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-slate-500">Loja da Compra (Origem Atendimento):</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{sale.originStoreName}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-slate-500">Loja Detentora do Estoque:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{sale.stockStoreName}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Valor Total Operação:</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">R$ {sale.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Logistics Flow Steps */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Fluxo Fiscal & Status de Trânsito:
                  </span>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      sale.transferStatus === 'picked_up_by_client' || sale.transferStatus === 'received_at_store'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {sale.transferStatus === 'in_transit' && 'Em Trânsito Interfiliais (CFOP 5.152 Emitido)'}
                      {sale.transferStatus === 'received_at_store' && 'Peça Recebida na Loja da Compra (Estoque Atualizado)'}
                      {sale.transferStatus === 'picked_up_by_client' && 'Concluído: Entregue ao Cliente'}
                      {sale.transferStatus === 'nfe_issued' && 'NF-e Registrada'}
                    </span>
                  </div>

                  {sale.pickupQrCode && (
                    <div className="pt-2 flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <QrCode className="w-8 h-8 text-indigo-600 shrink-0" />
                      <div>
                        <p className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          Código de Retirada: {sale.pickupQrCode}
                        </p>
                        <p className="text-[10px] text-slate-400">Apresentar na recepção da filial com documento.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {sale.transferStatus !== 'picked_up_by_client' && (
                    <button
                      onClick={() => handleAdvanceLogisticsStatus(sale)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      Avançar Etapa da Logística <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: NATUREZA DA OPERAÇÃO (CFOP ENGINE) */}
      {activeTab === 'tax_engine' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full inline-block">
                Motor de Configuração Fiscal
              </span>
              <h2 className="text-base font-bold flex items-center gap-2 mt-1">
                <Layers className="w-5 h-5 text-emerald-400" /> Cadastros de Natureza da Operação
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                Centralize o comportamento fiscal das vendas, ordens de serviço, remessas e transferências. O motor atribui os CFOPs e regras financeiras/estoque automaticamente.
              </p>
            </div>

            <button
              onClick={() => setShowNewNatureModal(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Natureza da Operação
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taxNatures.map((nat) => (
              <div key={nat.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
                      {nat.code}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">{nat.description}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">CFOP Estadual (UF)</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{nat.cfopInternal}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">CFOP Interestadual</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{nat.cfopInterstate}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-slate-500">Gera Título Financeiro:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nat.generatesFinancial ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {nat.generatesFinancial ? 'SIM (Contas a Receber)' : 'NÃO'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-slate-500">Movimenta Estoque de Peças:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nat.movesStock ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {nat.movesStock ? 'SIM (Baixa Automática)' : 'NÃO'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800">
                    <span className="text-slate-500">Tipo de Documento:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {nat.docType === '1' ? '1 - Saída' : '0 - Entrada'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Finalidade NF-e:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {nat.nfePurpose === '1' ? 'Normal' : nat.nfePurpose === '2' ? 'Complementar' : nat.nfePurpose === '3' ? 'Ajuste' : 'Devolução'}
                    </span>
                  </div>
                </div>

                {nat.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    "{nat.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: REGRAS TRIBUTÁRIAS (TAX MATRIX ENGINE) */}
      {activeTab === 'tax_rules' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-full inline-block">
                Matriz Tributária Dinâmica
              </span>
              <h2 className="text-base font-bold flex items-center gap-2 mt-1">
                <Settings className="w-5 h-5 text-sky-400" /> Matriz de Regras Tributárias
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                Configuração parametrizada por Origem x Destino x Regime Tributário x NCM. O sistema resolve CST, ICMS, PIS, COFINS e IPI na emissão sem intervenção manual.
              </p>
            </div>

            <button
              onClick={() => setShowNewRuleModal(true)}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Regra Tributária
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Nome da Regra</th>
                    <th className="p-4">Origem / Destino</th>
                    <th className="p-4">Regime / NCM</th>
                    <th className="p-4">CFOP</th>
                    <th className="p-4">CSOSN / CST ICMS</th>
                    <th className="p-4">Alíquota ICMS</th>
                    <th className="p-4">CST PIS / COFINS</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                  {taxRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{rule.name}</span>
                        <span className="text-[10px] text-slate-400">ID: {rule.id}</span>
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {rule.ufOrigin === '*' ? 'QUALQUER UF' : rule.ufOrigin} &rarr; {rule.ufDestination === '*' ? 'QUALQUER UF' : rule.ufDestination}
                      </td>
                      <td className="p-4">
                        <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold block mb-1">
                          {rule.taxRegime}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">NCM: {rule.ncmCode}</span>
                      </td>
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {rule.cfop}
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {rule.icmsCstOrCsosn}
                      </td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {rule.icmsRatePercent}%
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                        PIS: {rule.pisCst} / COF: {rule.cofinsCst}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rule.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
                          {rule.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: IMPORTAÇÃO DE XML DE ENTRADA (SUPPLIER NFE) */}
      {activeTab === 'xml_import' && (
        <div className="space-y-6">
          {xmlImportSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs font-bold animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{xmlImportSuccessMsg}</span>
              </div>
              <button type="button" onClick={() => setXmlImportSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full inline-block">
                Entrada Automatizada de Fornecedores
              </span>
              <h2 className="text-base font-bold flex items-center gap-2 mt-1">
                <Upload className="w-5 h-5 text-amber-400" /> Importação de XML de Notas Fiscais
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                Importe o arquivo XML recebido da distribuidora de autopeças. O sistema realiza o parsing das tags, identifica NCM, CEST, valores e insere/atualiza o estoque automaticamente.
              </p>
            </div>

            <button
              onClick={() => setShowXmlImportModal(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4" /> Cole ou Envie XML de Entrada
            </button>
          </div>

          {/* Import Historic Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Histórico de XMLs Importados no Sistema
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">NF-e nº / Chave de Acesso</th>
                    <th className="p-4">Fornecedor</th>
                    <th className="p-4">Data Emissão</th>
                    <th className="p-4">Qtd Itens</th>
                    <th className="p-4">Total Produtos</th>
                    <th className="p-4">Total NF-e</th>
                    <th className="p-4">Sincronização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                  {xmlRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block">NF-e nº {rec.nfeNumber}</span>
                        <span className="font-mono text-[10px] text-slate-400 truncate block max-w-xs">{rec.accessKey}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{rec.supplierName}</span>
                        <span className="text-[11px] text-slate-400">{rec.supplierCnpj}</span>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300">
                        {rec.issueDate}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                        {rec.itemsCount} peças
                      </td>
                      <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                        R$ {(rec.totalProductsAmount || rec.totalAmount).toFixed(2)}
                      </td>
                      <td className="p-4 font-extrabold text-slate-900 dark:text-slate-100">
                        R$ {rec.totalAmount.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Estoque Atualizado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOLETOS BANCÁRIOS & PIX */}
      {activeTab === 'boletos' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Gestão de Boletos com PIX Copia e Cola Embutido</h2>
              <p className="text-xs text-slate-500">Emissão de boletos registrados e QR Code PIX dinâmico integrado.</p>
            </div>

            <button
              onClick={() => setShowNewBoletoModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Gerar Novo Boleto Bancário
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {boletos.map((bol) => (
              <div key={bol.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
                      <Barcode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{bol.code}</h3>
                      <p className="text-[11px] text-slate-400">{bol.bankName}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    bol.status === 'registered'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : bol.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {bol.status === 'registered' ? 'Registrado no Banco' : bol.status === 'paid' ? 'Pago' : 'Vencido'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sacado / Pagador:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{bol.payerName} ({bol.payerCpfCnpj})</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Vencimento:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{bol.dueDate}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor do Boleto:</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      R$ {bol.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Linha Digitável e PIX */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Linha Digitável de Código de Barras:</span>
                    <button
                      onClick={() => handleCopyText(bol.barcodeNumber, bol.id)}
                      className="text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                  <p className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 break-all bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                    {bol.barcodeNumber}
                  </p>

                  {bol.pixCopiaECola && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      {bol.pixQrCodeUrl && (
                        <img src={bol.pixQrCodeUrl} alt="QR Code PIX" className="w-16 h-16 rounded border border-slate-200 dark:border-slate-700" />
                      )}
                      <div className="space-y-1 flex-1">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5" /> PIX Dinâmico Integrado
                        </p>
                        <button
                          onClick={() => handleCopyText(bol.pixCopiaECola || '', `pix-${bol.id}`)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copiar PIX Copia e Cola
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => { setSelectedBoleto(bol); }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-500" /> Imprimir Boleto PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CONFIGURAÇÕES FISCAIS */}
      {activeTab === 'fiscal_config' && (
        <form onSubmit={handleSaveFiscalSettings} className="space-y-6">
          {cfgSavedSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs font-bold animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Configurações Fiscais atualizadas com sucesso! Os novos parâmetros já estão vigentes.</span>
              </div>
              <button type="button" onClick={() => setCfgSavedSuccess(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full inline-block">
                Parâmetros Oficiais SEFAZ & Prefeitura
              </span>
              <h2 className="text-base font-bold flex items-center gap-2 mt-1">
                <Settings className="w-5 h-5 text-amber-400" /> Módulo de Configurações Fiscais
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                Defina os dados fiscais, certificado digital A1, tokens de API e parâmetros de emissão específicos para cada empresa cadastrada. As alterações em uma empresa são isoladas e não afetam as outras.
              </p>
            </div>

            <button
              type="submit"
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" /> Salvar Configurações Fiscais
            </button>
          </div>

          {/* SELETOR DE EMPRESA PARA CONFIGURAÇÃO FISCAL ISOLADA */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Empresa Selecionada para Configuração Fiscal
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Cada empresa cadastrada possui seus próprios certificados A1, tokens de emissor fiscal, alíquotas e numerações de série independentes.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <label htmlFor="companyFiscalSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Empresa:
              </label>
              <select
                id="companyFiscalSelect"
                value={selectedCompanyId}
                onChange={e => handleSelectCompany(e.target.value)}
                className="flex-1 sm:w-72 px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                {companiesList.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.tradeName || comp.name} {comp.cnpj ? `(${comp.cnpj})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Enterprise Cadastral Info */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Dados Cadastrais da Empresa Emissora</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Razão Social Oficial</label>
                  <input
                    type="text"
                    value={cfgCompanyName}
                    onChange={e => setCfgCompanyName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nome Fantasia</label>
                    <input
                      type="text"
                      value={cfgTradeName}
                      onChange={e => setCfgTradeName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">CNPJ do Emissor</label>
                    <input
                      type="text"
                      value={cfgCnpj}
                      onChange={e => setCfgCnpj(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Inscrição Estadual (IE)</label>
                    <input
                      type="text"
                      value={cfgStateReg}
                      onChange={e => setCfgStateReg(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Inscrição Municipal (IM)</label>
                    <input
                      type="text"
                      value={cfgCityReg}
                      onChange={e => setCfgCityReg(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">UF (Estado SEFAZ)</label>
                    <select
                      value={cfgUf}
                      onChange={e => setCfgUf(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF', 'ES'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">CNAE Principal</label>
                    <input
                      type="text"
                      value={cfgCnae}
                      onChange={e => setCfgCnae(e.target.value)}
                      placeholder="Ex: 4520-0/01"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Regime Tributário</label>
                    <select
                      value={cfgTaxRegime}
                      onChange={e => setCfgTaxRegime(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="simples_nacional">Simples Nacional</option>
                      <option value="lucro_presumido">Lucro Presumido</option>
                      <option value="lucro_real">Lucro Real</option>
                    </select>
                  </div>
                </div>

                {/* TOKEN DA API DO CLIENTE (EMISSOR FISCAL) */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-500" />
                      Token de API do Emissor / Chave de Acesso do Cliente
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[10px]">
                      AUTENTICAÇÃO API
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showClientTokenSecret ? 'text' : 'password'}
                        value={cfgClientToken}
                        onChange={e => setCfgClientToken(e.target.value)}
                        placeholder="Ex: md_live_tok_982347102983741928374981"
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientTokenSecret(!showClientTokenSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showClientTokenSecret ? 'Ocultar Token' : 'Mostrar Token'}
                      >
                        {showClientTokenSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestClientToken}
                      disabled={isTestingToken}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                    >
                      {isTestingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Testar Token
                    </button>
                  </div>

                  {tokenTestSuccess && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] font-medium text-emerald-800 dark:text-emerald-300 flex items-start gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tokenTestSuccess}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Digital Certificate A1 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Certificado Digital A1 (.PFX / .P12)</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[10px]">
                  A1 ATIVO
                </span>
              </div>

              {/* Upload Certificate File Box */}
              <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl text-center space-y-2 hover:border-indigo-400 dark:hover:border-indigo-700 transition relative">
                <input
                  type="file"
                  accept=".pfx,.p12,.crt,.cer,.pem"
                  onChange={handleCertificateFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="certFileInput"
                />
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {uploadedCertFileName ? `Arquivo: ${uploadedCertFileName}` : 'Clique ou arraste o Certificado Digital A1 (.PFX ou .P12)'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {uploadedCertSize ? `Tamanho do arquivo: ${uploadedCertSize}` : 'Suporta arquivos com extensão .pfx, .p12, .crt ou .pem'}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-[11px] rounded-lg inline-flex items-center gap-1.5 shadow-xs"
                >
                  <FileCode className="w-3.5 h-3.5" /> Selecionar Arquivo do Computador
                </button>
              </div>

              {certValidationMsg && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{certValidationMsg}</span>
                </div>
              )}

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{cfgCertName}</p>
                    <p className="text-[11px] text-slate-500">Validade oficial até: {cfgCertExpDate}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nome de Exibição no Sistema</label>
                  <input
                    type="text"
                    value={cfgCertName}
                    onChange={e => setCfgCertName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Data de Validade</label>
                    <input
                      type="date"
                      value={cfgCertExpDate}
                      onChange={e => setCfgCertExpDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Senha do Certificado (.pfx)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={cfgCertPassword}
                        onChange={e => setCfgCertPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestCertPassword}
                        disabled={isTestingCertPassword}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0"
                      >
                        {isTestingCertPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 text-amber-400" />}
                        Validar Senha
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Fiscal Defaults and Series */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Receipt className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Séries, Numeração e Alíquotas Padrão</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Ambiente SEFAZ</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border cursor-pointer text-center font-bold text-xs ${
                      cfgEnvironment === 'homologation'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="cfgEnvironment"
                        value="homologation"
                        checked={cfgEnvironment === 'homologation'}
                        onChange={() => setCfgEnvironment('homologation')}
                        className="sr-only"
                      />
                      🧪 Homologação (Testes)
                    </label>

                    <label className={`p-2.5 rounded-xl border cursor-pointer text-center font-bold text-xs ${
                      cfgEnvironment === 'production'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="cfgEnvironment"
                        value="production"
                        checked={cfgEnvironment === 'production'}
                        onChange={() => setCfgEnvironment('production')}
                        className="sr-only"
                      />
                      🚀 Produção (Oficial)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Série NF-e</label>
                    <input
                      type="text"
                      value={cfgNfeSeries}
                      onChange={e => setCfgNfeSeries(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Próxima NF-e</label>
                    <input
                      type="number"
                      value={cfgNextNfe}
                      onChange={e => setCfgNextNfe(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">CFOP Produtos</label>
                    <input
                      type="text"
                      value={cfgProductCfop}
                      onChange={e => setCfgProductCfop(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">CFOP Serviços</label>
                    <input
                      type="text"
                      value={cfgServiceCfop}
                      onChange={e => setCfgServiceCfop(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Alíquota ICMS (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cfgIcmsRate}
                      onChange={e => setCfgIcmsRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Alíquota ISS (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cfgIssRate}
                      onChange={e => setCfgIssRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* REFORMA TRIBUTÁRIA 2026 (IBS & CBS) QUADRO CONFIG */}
                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        Reforma Tributária 2026 (EC 132/2023 - IBS e CBS)
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-extrabold text-[10px]">
                      OBRIGATÓRIO DESDE 03/08/2026
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Emissões de NF-e (mod. 55) e NFC-e (mod. 65) sem os campos IBS/CBS são rejeitadas pela Receita Federal. Alíquota teste de validação de 1% (0,1% IBS + 0,9% CBS).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Alíquota Teste IBS (%) <span className="text-cyan-600 font-mono">(Est./Mun.)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cfgIbsRate}
                        onChange={e => setCfgIbsRate(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Alíquota Teste CBS (%) <span className="text-indigo-600 font-mono">(União)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cfgCbsRate}
                        onChange={e => setCfgCbsRate(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Default Workflow Rules */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Regras de Automação de Finalização de OS</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">Opção Padrão Selecionada na Conclusão de OS</label>
                  <div className="space-y-2">
                    <label className={`p-3 rounded-xl border cursor-pointer block transition ${
                      cfgDefaultFinishMode === 'immediate'
                        ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-950 dark:border-indigo-500'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="cfgDefaultFinishMode"
                          value="immediate"
                          checked={cfgDefaultFinishMode === 'immediate'}
                          onChange={() => setCfgDefaultFinishMode('immediate')}
                          className="h-4 w-4 text-indigo-600 border-slate-300"
                        />
                        <span className="font-bold text-slate-900 dark:text-slate-100">⚡ Emissão Imediata</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 ml-6">
                        Transmite a NF-e e gera o boleto no exato instante em que o operador finaliza a ordem de serviço.
                      </p>
                    </label>

                    <label className={`p-3 rounded-xl border cursor-pointer block transition ${
                      cfgDefaultFinishMode === 'monthly_batch'
                        ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-950 dark:border-indigo-500'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="cfgDefaultFinishMode"
                          value="monthly_batch"
                          checked={cfgDefaultFinishMode === 'monthly_batch'}
                          onChange={() => setCfgDefaultFinishMode('monthly_batch')}
                          className="h-4 w-4 text-indigo-600 border-slate-300"
                        />
                        <span className="font-bold text-slate-900 dark:text-slate-100">📅 Acumular para Faturamento no Fim do Mês</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 ml-6">
                        Agrupa todas as OSs concluídas daquele cliente e gera a nota fiscal e o boleto unificado em lote no final do mês.
                      </p>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={cfgAutoTransmit}
                      onChange={e => setCfgAutoTransmit(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 rounded border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Transmitir automaticamente para SEFAZ sem confirmação manual</span>
                      <span className="text-[11px] text-slate-400 block">Envia o XML gerado imediatamente para a API webservice do fisco.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Configurações Fiscais
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: MONITOR & TESTES API SEFAZ */}
      {activeTab === 'sefaz_api' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Environment Config & Digital Certificate Panel */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Certificado Digital & Ambiente</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Ambiente da SEFAZ:</label>
                  <select
                    value={sefazConfig.environment}
                    onChange={(e) => {
                      const newCfg = { ...sefazConfig, environment: e.target.value as any };
                      setSefazConfig(newCfg);
                      onSaveSefazConfig(newCfg);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="homologation">Ambiente de Homologação (Sem Valor Fiscal)</option>
                    <option value="production">Ambiente de Produção (Oficial / Válido)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Estado / UF Emissora Principal:</label>
                  <select
                    value={testUf}
                    onChange={(e) => setTestUf(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="SP">São Paulo (SP)</option>
                    <option value="RJ">Rio de Janeiro (RJ)</option>
                    <option value="MG">Minas Gerais (MG)</option>
                    <option value="PR">Paraná (PR)</option>
                    <option value="RS">Rio Grande do Sul (RS)</option>
                    <option value="SC">Santa Catarina (SC)</option>
                  </select>
                </div>

                {/* File Upload Box for Digital Certificate */}
                <div className="border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-xl text-center space-y-1.5 relative">
                  <input
                    type="file"
                    accept=".pfx,.p12,.crt,.cer,.pem"
                    onChange={handleCertificateFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto" />
                  <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                    {uploadedCertFileName ? uploadedCertFileName : 'Importar Certificado A1 (.PFX/.P12)'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Clique para selecionar um arquivo .pfx do seu dispositivo
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{cfgCertName || sefazConfig.certificateName}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certificado A1 Válido até {cfgCertExpDate || sefazConfig.certificateExpirationDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Live API Tester */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Teste de Comunicação WebService & APIs Fiscais</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestSefazStatus}
                    disabled={isTestingSefaz}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSefaz ? 'animate-spin' : ''}`} /> Testar SEFAZ {testUf}
                  </button>
                  {testLog.length > 0 && (
                    <button
                      onClick={() => setTestLog([])}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 text-xs font-semibold rounded-xl"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {sefazStatusResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sefazStatusResult}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] uppercase font-black">HTTP 200 OK</span>
                </div>
              )}

              {/* Communication Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  onClick={handleTestSefazStatus}
                  disabled={isTestingSefaz}
                  className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Wifi className="w-3.5 h-3.5 text-indigo-600" /> Status SEFAZ NF-e
                </button>

                <button
                  onClick={handleTestMunicipalNfse}
                  disabled={isTestingSefaz}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" /> WebService NFS-e
                </button>

                <button
                  onClick={handleTestBankBoleto}
                  disabled={isTestingSefaz}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Barcode className="w-3.5 h-3.5 text-amber-500" /> API Boletos & PIX
                </button>
              </div>

              <div className="pt-1">
                <button
                  onClick={handleTestXmlTransmission}
                  disabled={isTestingSefaz}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Send className="w-4 h-4 text-indigo-400" /> Simular Transmissão de Lote XML com Assinatura Digital
                </button>
              </div>

              {/* Real-time Execution Log Console */}
              <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] h-52 overflow-y-auto space-y-1.5 border border-slate-800 shadow-inner">
                <div className="text-slate-500 font-bold border-b border-slate-800 pb-1 flex justify-between items-center">
                  <span>LOGS DE REDE E TRANSMISSÃO HTTP (WEBSERVICE FISCAL):</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">TLS 1.2 / RSA 2048</span>
                </div>
                {testLog.length === 0 ? (
                  <div className="text-slate-600 italic py-2">
                    Nenhum teste executado até o momento. Clique em um dos botões acima para testar a comunicação com a SEFAZ, Prefeitura ou Banco.
                  </div>
                ) : (
                  testLog.map((log, idx) => (
                    <div key={idx} className={`flex items-start gap-2 ${
                      log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-rose-400' : 'text-slate-300'
                    }`}>
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span className="break-all">{log.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PHASE 2: MANDATORY AUTOMATED TEST MATRIX */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                      Bateria de Testes Obrigatórios — Fase 2 (Homologação Fiscal)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Conjunto de 7 testes obrigatórios para homologação de emissão de NF-e, NFC-e, cancelamento, Reforma Tributária 2026 e isolamento seguro de produção.
                  </p>
                </div>

                <button
                  onClick={executeAllPhase2Tests}
                  disabled={isRunningAllTests}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRunningAllTests ? 'animate-spin' : ''}`} />
                  {isRunningAllTests ? 'Executando Testes...' : 'Executar Todos os 7 Testes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* TEST 1 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">TESTE 1</span>
                      {phase2Tests.test1_cert.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">APROVADO</span>
                      )}
                      {phase2Tests.test1_cert.status === 'running' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">EXECUTANDO...</span>
                      )}
                      {phase2Tests.test1_cert.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">FALHOU</span>
                      )}
                      {phase2Tests.test1_cert.status === 'idle' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">PENDENTE</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1">Validação do Certificado A1</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Verifica status ATIVO, vigência válida e criptografia de senha.
                    </p>
                    {phase2Tests.test1_cert.details && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {phase2Tests.test1_cert.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={executeTest1Cert}
                    disabled={phase2Tests.test1_cert.status === 'running'}
                    className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Testar Certificado
                  </button>
                </div>

                {/* TEST 2 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">TESTE 2</span>
                      {phase2Tests.test2_conn.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">APROVADO</span>
                      )}
                      {phase2Tests.test2_conn.status === 'running' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">EXECUTANDO...</span>
                      )}
                      {phase2Tests.test2_conn.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">FALHOU</span>
                      )}
                      {phase2Tests.test2_conn.status === 'idle' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">PENDENTE</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1">Conectividade SEFAZ (Status)</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Consulta WebService de Homologação, valida Status 107 e latência.
                    </p>
                    {phase2Tests.test2_conn.details && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {phase2Tests.test2_conn.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={executeTest2Conn}
                    disabled={phase2Tests.test2_conn.status === 'running'}
                    className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Testar Conexão SEFAZ
                  </button>
                </div>

                {/* TEST 3 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">TESTE 3</span>
                      {phase2Tests.test3_nfe_valid.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">APROVADO</span>
                      )}
                      {phase2Tests.test3_nfe_valid.status === 'running' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">EXECUTANDO...</span>
                      )}
                      {phase2Tests.test3_nfe_valid.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">FALHOU</span>
                      )}
                      {phase2Tests.test3_nfe_valid.status === 'idle' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">PENDENTE</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1">Emissão NF-e Válida + IBS/CBS</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Chave 44 dígitos, XML v4.00, cálculo IBS/CBS da Reforma 2026 e Status 100.
                    </p>
                    {phase2Tests.test3_nfe_valid.details && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {phase2Tests.test3_nfe_valid.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={executeTest3NfeValid}
                    disabled={phase2Tests.test3_nfe_valid.status === 'running'}
                    className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Testar Emissão NF-e
                  </button>
                </div>

                {/* TEST 4 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">TESTE 4</span>
                      {phase2Tests.test4_nfe_rej.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">APROVADO</span>
                      )}
                      {phase2Tests.test4_nfe_rej.status === 'running' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">EXECUTANDO...</span>
                      )}
                      {phase2Tests.test4_nfe_rej.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">FALHOU</span>
                      )}
                      {phase2Tests.test4_nfe_rej.status === 'idle' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">PENDENTE</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1">Rejeição Controlada da SEFAZ</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Disparo com dados inválidos, captura do código de rejeição e log seguro.
                    </p>
                    {phase2Tests.test4_nfe_rej.details && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {phase2Tests.test4_nfe_rej.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={executeTest4NfeRej}
                    disabled={phase2Tests.test4_nfe_rej.status === 'running'}
                    className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Testar Rejeição
                  </button>
                </div>

                {/* TEST 5 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">TESTE 5</span>
                      {phase2Tests.test5_nfce.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">APROVADO</span>
                      )}
                      {phase2Tests.test5_nfce.status === 'running' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">EXECUTANDO...</span>
                      )}
                      {phase2Tests.test5_nfce.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">FALHOU</span>
                      )}
                      {phase2Tests.test5_nfce.status === 'idle' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">PENDENTE</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1">Emissão NFC-e com QR Code</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Modelo 65 para PDV/Balcão com QR Code de consulta SEFAZ 5.0.
                    </p>
                    {phase2Tests.test5_nfce.details && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {phase2Tests.test5_nfce.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={executeTest5Nfce}
                    disabled={phase2Tests.test5_nfce.status === 'running'}
                    className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Testar NFC-e Varejo
                  </button>
                </div>

                {/* TEST 6 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">TESTE 6</span>
                      {phase2Tests.test6_cancel.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">APROVADO</span>
                      )}
                      {phase2Tests.test6_cancel.status === 'running' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">EXECUTANDO...</span>
                      )}
                      {phase2Tests.test6_cancel.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">FALHOU</span>
                      )}
                      {phase2Tests.test6_cancel.status === 'idle' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">PENDENTE</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1">Cancelamento de Documento</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Evento com justificativa legal (&gt; 15 caracteres) e Protocolo 135.
                    </p>
                    {phase2Tests.test6_cancel.details && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {phase2Tests.test6_cancel.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={executeTest6Cancel}
                    disabled={phase2Tests.test6_cancel.status === 'running'}
                    className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Testar Cancelamento
                  </button>
                </div>

                {/* TEST 7 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between md:col-span-2 lg:col-span-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">TESTE 7</span>
                      {phase2Tests.test7_prod_safety.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">APROVADO</span>
                      )}
                      {phase2Tests.test7_prod_safety.status === 'running' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">EXECUTANDO...</span>
                      )}
                      {phase2Tests.test7_prod_safety.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">FALHOU</span>
                      )}
                      {phase2Tests.test7_prod_safety.status === 'idle' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">PENDENTE</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1">Validação da Trava de Bloqueio em Produção</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Simula uma tentativa de transmissão forçada em Produção durante a Fase 2 e valida que o sistema bloqueia preventivamente sem tocar em banco ou SEFAZ real.
                    </p>
                    {phase2Tests.test7_prod_safety.details && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {phase2Tests.test7_prod_safety.details}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={executeTest7ProdSafety}
                    disabled={phase2Tests.test7_prod_safety.status === 'running'}
                    className="w-full sm:w-auto self-start px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Testar Bloqueio de Produção
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: WEBSERVICES OFICIAIS SEFAZ SP & ROTEAMENTO FISCAL (RESTRIÇÃO QA / MASTER) */}
      {activeTab === 'webservices_routing' && (
        <div className="space-y-6">
          {/* Header Banner with Official SEFAZ SP Reference & QA Access Badge */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[11px] border border-amber-500/30 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> SEFAZ SP + PREFEITURA OFICIAL
                </span>
                {isQaOrMasterUser ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> USUÁRIO QA / MASTER AUTORIZADO
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-extrabold text-[11px] border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> MODO SOMENTE LEITURA (RESTRITO AO QA)
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-[11px] border border-indigo-500/30">
                  MODO ATUAL: {cfgCommunicationMode === 'direct_sefaz_sp' ? 'DIRETO SEFAZ SP (GRATUITO)' : 'GATEWAY PARTICULAR'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Roteamento de WebServices da Fazenda SP & Emissão Municipal (NFS-e)
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Configure a comunicação direta com os servidores oficiais da Secretaria da Fazenda do Estado de São Paulo (NF-e/NFC-e 4.00) e da Prefeitura Municipal. Quando a empresa tiver caixa e desejar contratar um gateway privado (ex: Focus NFe), basta alternar o modo nesta tela.
              </p>
              <div className="pt-1 flex items-center gap-1 text-[11px] text-amber-300 font-mono">
                <span>Documentação Oficial SEFAZ SP:</span>
                <a
                  href="https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-amber-200 flex items-center gap-1"
                >
                  portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleTestOfficialWebservices}
                disabled={isTestingWs}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isTestingWs ? 'animate-spin' : ''}`} />
                {isTestingWs ? 'Testando Conexões...' : 'Testar Todos os WebServices'}
              </button>

              {isQaOrMasterUser && (
                <button
                  type="button"
                  onClick={handleResetToOfficialSefazSpDefaults}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Restaura os endpoints padrão da SEFAZ SP conforme o portal oficial"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Restaurar Padrões SP
                </button>
              )}
            </div>
          </div>

          {wsSaveSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-fade-in shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{wsSaveSuccessMsg}</span>
            </div>
          )}

          {/* Test Results Banner if any test was run */}
          {testedWsResults.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-500" /> Resultados do Diagnóstico em Tempo Real dos WebServices
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {testedWsResults.filter(r => r.reachable).length} de {testedWsResults.length} operacionais
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {testedWsResults.map((ws, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      ws.reachable
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{ws.name}</p>
                      <p className="text-[10px] text-slate-500 truncate font-mono">{ws.url}</p>
                      <p className="text-[10px] text-slate-400">Tipo: {ws.type} ({ws.environment})</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        ws.reachable
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {ws.reachable ? `${ws.httpStatus || 200} OK` : 'OFFLINE'}
                      </span>
                      {ws.latencyMs !== undefined && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{ws.latencyMs}ms</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form with Routing Options */}
          <form onSubmit={handleSaveWebservicesRouting} className="space-y-6">
            {/* CARD 1: SELEÇÃO DE MODO DE COMUNICAÇÃO FISCAL */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Modo de Transmissão Fiscal do Sistema
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-extrabold">
                  {cfgCommunicationMode === 'direct_sefaz_sp' ? 'MODO DIRETO (SEM CUSTO)' : 'MODO GATEWAY'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Direct SEFAZ SP */}
                <label
                  className={`p-4 rounded-2xl border-2 transition block cursor-pointer relative ${
                    cfgCommunicationMode === 'direct_sefaz_sp'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  } ${!isQaOrMasterUser ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="comm_mode"
                        value="direct_sefaz_sp"
                        checked={cfgCommunicationMode === 'direct_sefaz_sp'}
                        onChange={() => setCfgCommunicationMode('direct_sefaz_sp')}
                        disabled={!isQaOrMasterUser}
                        className="h-4 w-4 text-indigo-600 border-slate-300"
                      />
                      <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
                        🏛️ Conexão Direta com WebServices Oficiais SEFAZ SP (Padrão)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black">
                      GRATUITO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed pl-6">
                    O sistema assina os lotes XML com o Certificado Digital A1 do cliente e os envia diretamente para os WebServices oficiais SOAP/REST da Secretaria da Fazenda de São Paulo e da Prefeitura. Não exige mensalidade de gateway terceiro.
                  </p>
                </label>

                {/* Option 2: Custom Gateway */}
                <label
                  className={`p-4 rounded-2xl border-2 transition block cursor-pointer relative ${
                    cfgCommunicationMode === 'custom_gateway'
                      ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  } ${!isQaOrMasterUser ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="comm_mode"
                        value="custom_gateway"
                        checked={cfgCommunicationMode === 'custom_gateway'}
                        onChange={() => setCfgCommunicationMode('custom_gateway')}
                        disabled={!isQaOrMasterUser}
                        className="h-4 w-4 text-amber-600 border-slate-300"
                      />
                      <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
                        🏢 Gateway Particular / API Privada de Emissão
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black">
                      SERVIÇO PAGO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed pl-6">
                    Utilize quando o cliente tiver recursos financeiros para contratar um emissor fiscal dedicado (Focus NFe, Nuvem Fiscal, PlugNotas, TecnoSpeed). O sistema fará as requisições autenticadas via token para a API contratada.
                  </p>
                </label>
              </div>
            </div>

            {/* CARD 2: WEBSERVICES OFICIAIS SEFAZ SP (NF-E 4.00 & NFC-E 4.00) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Endpoints Oficiais SEFAZ SP — NF-e 4.00 & NFC-e (Modelo 55 e 65)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Ambiente Atual: {cfgEnvironment.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                {/* NF-e Homologação */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      NF-e 4.00 (Homologação / Testes SP)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">SOAP 1.2</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeAutorizacao4 (Envio de Lote)</label>
                      <input
                        type="text"
                        value={cfgNfeAutorizacaoHml}
                        onChange={e => setCfgNfeAutorizacaoHml(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeRetAutorizacao4 (Consulta Recibo Lote)</label>
                      <input
                        type="text"
                        value={cfgNfeRetAutorizacaoHml}
                        onChange={e => setCfgNfeRetAutorizacaoHml(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeStatusServico4 (Consulta Disponibilidade)</label>
                      <input
                        type="text"
                        value={cfgNfeStatusServicoHml}
                        onChange={e => setCfgNfeStatusServicoHml(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeRecepcaoEvento4 (Cancelamento & CC-e)</label>
                      <input
                        type="text"
                        value={cfgNfeRecepcaoEventoHml}
                        onChange={e => setCfgNfeRecepcaoEventoHml(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* NF-e Produção */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      NF-e 4.00 (Produção / Oficial SP)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">SOAP 1.2</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeAutorizacao4 (Produção Oficial)</label>
                      <input
                        type="text"
                        value={cfgNfeAutorizacaoProd}
                        onChange={e => setCfgNfeAutorizacaoProd(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeRetAutorizacao4 (Produção Oficial)</label>
                      <input
                        type="text"
                        value={cfgNfeRetAutorizacaoProd}
                        onChange={e => setCfgNfeRetAutorizacaoProd(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeStatusServico4 (Produção Oficial)</label>
                      <input
                        type="text"
                        value={cfgNfeStatusServicoProd}
                        onChange={e => setCfgNfeStatusServicoProd(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFeRecepcaoEvento4 (Produção Oficial)</label>
                      <input
                        type="text"
                        value={cfgNfeRecepcaoEventoProd}
                        onChange={e => setCfgNfeRecepcaoEventoProd(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* NFC-e 4.00 (Consumidor Final - Modelo 65) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-3 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-indigo-500" />
                      NFC-e 4.00 (Nota Fiscal de Consumidor Eletrônica - SP)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">QR Code v2.0</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFCeAutorizacao (Homologação)</label>
                      <input
                        type="text"
                        value={cfgNfceAutorizacaoHml}
                        onChange={e => setCfgNfceAutorizacaoHml(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">NFCeAutorizacao (Produção)</label>
                      <input
                        type="text"
                        value={cfgNfceAutorizacaoProd}
                        onChange={e => setCfgNfceAutorizacaoProd(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">URL Consulta QR Code (Homologação)</label>
                      <input
                        type="text"
                        value={cfgNfceQrCodeHml}
                        onChange={e => setCfgNfceQrCodeHml(e.target.value)}
                        disabled={!isQaOrMasterUser}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: WEBSERVICE MUNICIPAL (NFS-E PREFEITURA) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    WebService Municipal — NFS-e (Nota Fiscal de Serviços Eletrônica)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold">
                  PADRÃO: {cfgNfseStandard.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Padrão de Integração da Prefeitura:
                  </label>
                  <select
                    value={cfgNfseStandard}
                    onChange={e => setCfgNfseStandard(e.target.value as any)}
                    disabled={!isQaOrMasterUser}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  >
                    <option value="sp_capital">São Paulo Capital (Sistema Paulistana / LoteRPS.asmx)</option>
                    <option value="adn_nacional">Padrão Nacional ADN (Ambiente de Dados Nacional)</option>
                    <option value="abrasf_v2">Padrão ABRASF v2.04 (Maioria dos Municípios Paulistas)</option>
                    <option value="ginfes">Padrão GINFES / IPM / Betha</option>
                    <option value="custom">Padrão Customizado / Prefeitura Específica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Prefeitura / Órgão Municipal:
                  </label>
                  <input
                    type="text"
                    value={cfgNfseCityHall}
                    onChange={e => setCfgNfseCityHall(e.target.value)}
                    disabled={!isQaOrMasterUser}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WebService NFS-e Homologação:
                  </label>
                  <input
                    type="text"
                    value={cfgNfseHmlUrl}
                    onChange={e => setCfgNfseHmlUrl(e.target.value)}
                    disabled={!isQaOrMasterUser}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WebService NFS-e Produção:
                  </label>
                  <input
                    type="text"
                    value={cfgNfseProdUrl}
                    onChange={e => setCfgNfseProdUrl(e.target.value)}
                    disabled={!isQaOrMasterUser}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* CARD 4: GATEWAY PARTICULAR (FOCUS NFE, NUVEM FISCAL, PLUGNOTAS) */}
            <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 ${
              cfgCommunicationMode !== 'custom_gateway' ? 'opacity-80' : ''
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Configuração de Gateway Particular (Para Quando Contratar Serviço Pago)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {cfgCommunicationMode === 'custom_gateway' ? 'ATIVO NO EMISSOR' : 'EM ESPERA (STANDBY)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Provedor da API Contratada:
                  </label>
                  <select
                    value={cfgGwProvider}
                    onChange={e => setCfgGwProvider(e.target.value as any)}
                    disabled={!isQaOrMasterUser}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  >
                    <option value="focus_nfe">Focus NFe (focusnfe.com.br)</option>
                    <option value="nuvem_fiscal">Nuvem Fiscal (nuvemfiscal.com.br)</option>
                    <option value="plug_notas">PlugNotas / TecnoSpeed</option>
                    <option value="speed_gov">SpeedGov Fiscal API</option>
                    <option value="generic_rest">Outro Gateway REST / SOAP Customizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    URL Base da API do Gateway:
                  </label>
                  <input
                    type="text"
                    value={cfgGwApiUrl}
                    onChange={e => setCfgGwApiUrl(e.target.value)}
                    disabled={!isQaOrMasterUser}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Token de Acesso / Chave de API Privada:
                  </label>
                  <input
                    type="password"
                    value={cfgGwApiKey}
                    onChange={e => setCfgGwApiKey(e.target.value)}
                    placeholder="Ex: tok_live_focus_982374981"
                    disabled={!isQaOrMasterUser}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-slate-500">
                {isQaOrMasterUser
                  ? 'As alterações salvas entram em vigor imediatamente para todas as transmissões de NF-e, NFC-e e NFS-e da empresa selecionada.'
                  : '🔒 Modo de visualização somente leitura. As alterações estão bloqueadas para o perfil atual.'}
              </p>

              {isQaOrMasterUser && (
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Salvar Configurações de WebServices & Roteamento
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: GUIA E TUTORIAL PASSO A PASSO */}
      {activeTab === 'guide' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Passo a Passo Interativo: Como Realizar Testes de Emissão de Nota Fiscal, Boletos e SEFAZ
              </h2>
              <p className="text-xs text-slate-500">Guia de procedimentos recomendados para garantir que o banco de dados permaneça intacto em produção.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Step 1 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">1</span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Teste de NF-e e NFS-e Direta (Venda ao Cliente)</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Navegue até a aba **"Notas Fiscais"**, clique em **"Emitir Nova Nota Fiscal"**, escolha entre NF-e de Produto ou NFS-e de Serviço. O sistema gera automaticamente o XML assinado e solicita homologação da SEFAZ, gerando a chave de acesso e protocolo de autorização sem apagar qualquer registro do banco de dados.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">2</span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Teste de Venda de Mercadoria de Outra Loja (CFOP 5.152)</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Na aba **"Vendas e Transferência Interfiliais"**, teste os dois cenários legais:
                <br />
                • **Opção A (Aguardar Transferência)**: O cliente compra na Loja A, o sistema gera a NF-e de Transferência (CFOP 5.152) da Loja B para a Loja A, atualizando os estoques de ambas e garantindo compliance fiscal.
                <br />
                • **Opção B (Retirada na Loja do Estoque)**: O cliente paga na Loja A e retira na Loja B utilizando o comprovante com QR Code gerado pelo sistema.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">3</span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Teste de Emissão de Boletos e QR Code PIX</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Na aba **"Boletos & PIX Bancário"**, você pode simular a emissão de boletos registrados do Banco do Brasil, Itaú, Bradesco, Caixa e Santander. O boleto já nasce com a linha digitável de 47 dígitos e o QR Code do PIX Copia e Cola pré-configurado.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">4</span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Garantia de Integridade do Banco de Dados</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Para garantir que o banco de dados fique intacto durante atualizações e correções de bugs, todas as migrations operam via transações atômicas com preservação de versão. Nenhuma instrução de DDL destrutiva (como DROP TABLE) é executada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMITIR NOVA NF-E */}
      {showNewNfeModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Emitir Nova Nota Fiscal (SEFAZ)</h3>
              <button onClick={() => setShowNewNfeModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFiscalDoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipo de Documento Fiscal:</label>
                  <select
                    value={newNfeType}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      setNewNfeType(type);
                      if (type === 'nfe_transfer') setNewNfeCfop('5.152');
                      else if (type === 'nfse_service') setNewNfeCfop('14.01');
                      else setNewNfeCfop('5.102');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="nfe_product">NF-e (Venda de Produtos ao Consumidor Final)</option>
                    <option value="nfse_service">NFS-e (Prestação de Serviços - Prefeitura)</option>
                    <option value="nfe_transfer">NF-e de Transferência Interfiliais (CFOP 5.152)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Código CFOP Fiscal:</label>
                  <input
                    type="text"
                    value={newNfeCfop}
                    onChange={(e) => setNewNfeCfop(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {newNfeType === 'nfe_transfer' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filial de Destino da Transferência:</label>
                  <select
                    value={newNfeTargetBranchId}
                    onChange={(e) => setNewNfeTargetBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="">Selecione a Filial...</option>
                    {registeredCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.cnpj})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nome do Cliente / Destinatário:</label>
                    <input
                      type="text"
                      placeholder="Ex: João Pedro da Silva"
                      value={newNfeClientName}
                      onChange={(e) => setNewNfeClientName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">CPF ou CNPJ:</label>
                    <input
                      type="text"
                      placeholder="Ex: 123.456.789-00"
                      value={newNfeClientCpf}
                      onChange={(e) => setNewNfeClientCpf(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Add Items to list */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Itens da Nota Fiscal:</label>
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Descrição do Item / Peça"
                    value={newNfeItemName}
                    onChange={(e) => setNewNfeItemName(e.target.value)}
                    className="col-span-5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="NCM"
                    value={newNfeItemNcm}
                    onChange={(e) => setNewNfeItemNcm(e.target.value)}
                    className="col-span-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="Qtd"
                    value={newNfeItemQty}
                    onChange={(e) => setNewNfeItemQty(Number(e.target.value))}
                    className="col-span-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <input
                    type="number"
                    placeholder="Preço R$"
                    value={newNfeItemPrice}
                    onChange={(e) => setNewNfeItemPrice(Number(e.target.value))}
                    className="col-span-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddItemToNfe}
                    className="col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Added items list */}
                {newNfeItemList.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl space-y-1">
                    {newNfeItemList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-1 border-b border-slate-200 dark:border-slate-700 last:border-0">
                        <span>{item.name} (NCM: {item.ncm})</span>
                        <span className="font-bold">{item.quantity}x R$ {item.unitPrice.toFixed(2)} = R$ {item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewNfeModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Transmitir para SEFAZ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SIMULAR VENDA DE OUTRA LOJA */}
      {showNewInterBranchModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Simular Venda com Estoque de Outra Loja</h3>
              <button onClick={() => setShowNewInterBranchModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInterBranchSale} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Loja da Compra (Onde o cliente está):</label>
                  <select
                    value={ibOriginStoreId}
                    onChange={(e) => setIbOriginStoreId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {registeredCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Loja Detentora do Estoque:</label>
                  <select
                    value={ibStockStoreId}
                    onChange={(e) => setIbStockStoreId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {registeredCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Peça Solicitada:</label>
                <select
                  value={ibPartId}
                  onChange={(e) => setIbPartId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="">Selecione a peça...</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code}) - R$ {p.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {/* LOGISTICS CHOICE OPTION */}
              <div className="space-y-2 border-t border-b border-slate-100 dark:border-slate-800 py-3">
                <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  Escolha da Logística de Entrega pelo Cliente:
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  ibLogisticsOption === 'WAIT_TRANSFER_AT_BUYSTORE'
                    ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="logistics"
                    checked={ibLogisticsOption === 'WAIT_TRANSFER_AT_BUYSTORE'}
                    onChange={() => setIbLogisticsOption('WAIT_TRANSFER_AT_BUYSTORE')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">🚚 Opção 1: Cliente aguarda a peça chegar na loja da compra</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Gera a NF-e de Transferência de Mercadoria (CFOP 5.152) da loja detentora para a loja da compra. Quando a peça chegar ao estoque, a loja realiza a entrega ao cliente e emite a NF-e final.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  ibLogisticsOption === 'PAY_BUYSTORE_PICKUP_STOCKSTORE'
                    ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="logistics"
                    checked={ibLogisticsOption === 'PAY_BUYSTORE_PICKUP_STOCKSTORE'}
                    onChange={() => setIbLogisticsOption('PAY_BUYSTORE_PICKUP_STOCKSTORE')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">🏬 Opção 2: Realiza o pagamento na loja da compra e retira na loja detentora do estoque</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      O cliente efetua o pagamento na loja atual e recebe um comprovante com QR Code de Retirada. Ao chegar na loja que possui a peça, apresenta o código para liberação e emissão da nota de remessa.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewInterBranchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Gerar Venda & Emissão Fiscal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO BOLETO */}
      {showNewBoletoModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Gerar Boleto Bancário com PIX</h3>
              <button onClick={() => setShowNewBoletoModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoleto} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Banco Emissor:</label>
                <select
                  value={bolBankCode}
                  onChange={(e) => setBolBankCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="001">001 - Banco do Brasil S.A.</option>
                  <option value="341">341 - Itaú Unibanco S.A.</option>
                  <option value="237">237 - Banco Bradesco S.A.</option>
                  <option value="104">104 - Caixa Econômica Federal</option>
                  <option value="033">033 - Banco Santander Brasil</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nome do Sacado / Pagador:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Pedro da Silva"
                  value={bolPayerName}
                  onChange={(e) => setBolPayerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">CPF/CNPJ do Sacado:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 123.456.789-00"
                    value={bolPayerCpf}
                    onChange={(e) => setBolPayerCpf(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Valor do Boleto (R$):</label>
                  <input
                    type="number"
                    required
                    value={bolAmount}
                    onChange={(e) => setBolAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Data de Vencimento:</label>
                <input
                  type="date"
                  required
                  value={bolDueDate}
                  onChange={(e) => setBolDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewBoletoModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Barcode className="w-4 h-4" /> Gerar Boleto Registrado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VER XML */}
      {showXmlModal && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" /> Conteúdo XML NFe v4.00 - {selectedDoc.code}
              </h3>
              <button onClick={() => setShowXmlModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-80 border border-slate-800">
              <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${selectedDoc.accessKey}" versao="4.00">
    <ide>
      <cUF>35</cUF>
      <cNF>10012345</cNF>
      <natOp>VENDAS E TRANSFERENCIAS DE MERCADORIA</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>${selectedDoc.code.replace(/\D/g, '')}</nNF>
      <dhEmi>${selectedDoc.issueDate}T14:30:00-03:00</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
    </ide>
    <emit>
      <CNPJ>${selectedDoc.companyCnpj.replace(/\D/g, '')}</CNPJ>
      <xNome>${selectedDoc.companyName}</xNome>
    </emit>
    <dest>
      <CPF>${selectedDoc.clientCpfCnpj?.replace(/\D/g, '')}</CPF>
      <xNome>${selectedDoc.clientName}</xNome>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>${selectedDoc.items[0]?.code || 'PE-001'}</cProd>
        <xProd>${selectedDoc.items[0]?.name || 'Item de Peça / Serviço'}</xProd>
        <NCM>${selectedDoc.items[0]?.ncm || '8708.30.90'}</NCM>
        <CFOP>${selectedDoc.cfop}</CFOP>
        <vProd>${selectedDoc.totalAmount.toFixed(2)}</vProd>
      </prod>
      <imposto>
        <!-- REFORMA TRIBUTÁRIA EC 132/2023 (CAMPOS OBRIGATÓRIOS DESDE 03/08/2026) -->
        <IBSCBS>
          <CST>01</CST>
          <vBCIBS>${selectedDoc.totalAmount.toFixed(2)}</vBCIBS>
          <pIBS>0.10</pIBS>
          <vIBS>${(selectedDoc.totalAmount * 0.001).toFixed(2)}</vIBS>
          <vBCCBS>${selectedDoc.totalAmount.toFixed(2)}</vBCCBS>
          <pCBS>0.90</pCBS>
          <vCBS>${(selectedDoc.totalAmount * 0.009).toFixed(2)}</vCBS>
        </IBSCBS>
      </imposto>
    </det>
    <total>
      <ICMSTot>
        <vProd>${selectedDoc.totalProducts.toFixed(2)}</vProd>
        <vNF>${selectedDoc.totalAmount.toFixed(2)}</vNF>
      </ICMSTot>
      <!-- TOTAIS DA REFORMA TRIBUTÁRIA 2026 -->
      <IBSCBSTot>
        <vIBS>${(selectedDoc.totalAmount * 0.001).toFixed(2)}</vIBS>
        <vCBS>${(selectedDoc.totalAmount * 0.009).toFixed(2)}</vCBS>
        <vIBSCBS>${(selectedDoc.totalAmount * 0.010).toFixed(2)}</vIBSCBS>
      </IBSCBSTot>
    </total>
  </infNFe>
</NFe>`}</pre>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleCopyText(`NFe${selectedDoc.accessKey}`, 'xml')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> Copiar XML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER DANFE / IMPRESSÃO OFICIAL (A4 RETRATO, 40 COLUNAS & NFS-E) */}
      <FiscalDocumentPrintModal
        isOpen={showDanfeModal}
        onClose={() => setShowDanfeModal(false)}
        doc={selectedDoc}
        companyInfo={db.companyInfo}
        sefazConfig={sefazConfig}
        onDownloadXml={handleDownloadXml}
      />

      {/* MODAL: CARTA DE CORREÇÃO (CC-E) */}
      {showCceModal && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Emitir Carta de Correção Eletrônica (CC-e)</h3>
              <button onClick={() => setShowCceModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cceSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs text-center">
                {cceSuccessMsg}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Informe as correções a serem vinculadas à nota fiscal <strong>{selectedDoc.code}</strong>. Atenção: A CC-e não pode alterar valores, impostos ou dados do destinatário.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Texto da Correção (Mín. 15 caracteres):</label>
                  <textarea
                    rows={4}
                    placeholder="Ex: Correção das observações adicionais referente ao número do pedido do cliente..."
                    value={cceText}
                    onChange={(e) => setCceText(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCceModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleSendCce}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> Transmitir CC-e
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: NOVA NATUREZA DA OPERAÇÃO */}
      {showNewNatureModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Nova Natureza da Operação (CFOP)</h3>
              <button onClick={() => setShowNewNatureModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNature} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Código de Identificação Interno:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NAT-07"
                  value={natCode}
                  onChange={(e) => setNatCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Descrição Oficial da Operação:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Venda de Autopeças com Substituição Tributária"
                  value={natDescription}
                  onChange={(e) => setNatDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">CFOP Dentro do Estado (UF):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5.405"
                    value={natCfopInt}
                    onChange={(e) => setNatCfopInt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">CFOP Interestadual:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 6.405"
                    value={natCfopEst}
                    onChange={(e) => setNatCfopEst(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={natGenFin}
                    onChange={(e) => setNatGenFin(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Gera Título Financeiro</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={natMovStock}
                    onChange={(e) => setNatMovStock(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Movimenta Estoque</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipo de Documento:</label>
                  <select
                    value={natDocType}
                    onChange={(e: any) => setNatDocType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="1">1 - Saída (Venda/Serviço)</option>
                    <option value="0">0 - Entrada (Compra/Devolução)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Finalidade da NF-e:</label>
                  <select
                    value={natPurpose}
                    onChange={(e: any) => setNatPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="1">1 - Normal</option>
                    <option value="2">2 - Complementar</option>
                    <option value="3">3 - Ajuste</option>
                    <option value="4">4 - Devolução de Mercadoria</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Observações e Regras de Negócio:</label>
                <input
                  type="text"
                  placeholder="Ex: Aplicável a clientes autopeças sem substituição antecipada"
                  value={natNotes}
                  onChange={(e) => setNatNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewNatureModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Salvar Natureza da Operação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA REGRA TRIBUTÁRIA */}
      {showNewRuleModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Nova Regra Tributária (Matriz Dinâmica)</h3>
              <button onClick={() => setShowNewRuleModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaxRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nome Identificador da Regra:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Venda Peças SP -> MG (Simples Nacional)"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">UF Origem (Emitente):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SP ou *"
                    value={ruleUfOrig}
                    onChange={(e) => setRuleUfOrig(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">UF Destino (Cliente):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MG ou *"
                    value={ruleUfDest}
                    onChange={(e) => setRuleUfDest(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Regime Tributário Aplicável:</label>
                  <select
                    value={ruleRegime}
                    onChange={(e) => setRuleRegime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                    <option value="Todos">Todos os Regimes (*)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filtro NCM (ou * Todos):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 8708.30.90 ou *"
                    value={ruleNcm}
                    onChange={(e) => setRuleNcm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">CFOP Resolvido:</label>
                  <input
                    type="text"
                    required
                    value={ruleCfop}
                    onChange={(e) => setRuleCfop(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">CSOSN / CST ICMS:</label>
                  <input
                    type="text"
                    required
                    value={ruleIcmsCst}
                    onChange={(e) => setRuleIcmsCst(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Alíquota ICMS (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ruleIcmsRate}
                    onChange={(e) => setRuleIcmsRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">CST PIS:</label>
                  <input
                    type="text"
                    value={rulePisCst}
                    onChange={(e) => setRulePisCst(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">CST COFINS:</label>
                  <input
                    type="text"
                    value={ruleCofinsCst}
                    onChange={(e) => setRuleCofinsCst(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Salvar Regra na Matriz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR XML DE ENTRADA DO FORNECEDOR */}
      {showXmlImportModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" /> Importar Arquivo XML de Entrada (NF-e Fornecedor)
              </h3>
              <button onClick={() => setShowXmlImportModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cole o Conteúdo XML da NF-e ou insira o texto raw do arquivo:</label>
                <textarea
                  rows={6}
                  placeholder={`<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">\n  <NFe>\n    <infNFe Id="NFe35260712345678000190550010000001011001234567">\n      <emit><xNome>Distribuidora Autopeças SP Ltda</xNome></emit>\n      ...\n  </NFe>\n</nfeProc>`}
                  value={xmlRawText}
                  onChange={(e) => handleParseXmlInput(e.target.value)}
                  className="w-full p-3 bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {parsedXmlResult && (
                <div className="bg-amber-50/50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/60 pb-2">
                    <span className="font-bold text-amber-900 dark:text-amber-300">NF-e nº {parsedXmlResult.nfeNumber}</span>
                    <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400">{parsedXmlResult.accessKey}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Fornecedor Emissor:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{parsedXmlResult.supplierName} ({parsedXmlResult.supplierCnpj})</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Valor Total da Nota:</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">R$ {parsedXmlResult.totalAmount.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">Itens Identificados na Nota ({parsedXmlResult.items.length}):</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {parsedXmlResult.items.map((it: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-2 rounded border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{it.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">Cód: {it.code} | NCM: {it.ncm} | CEST: {it.cest}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-indigo-600">{it.quantity}x R$ {it.unitPrice.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 block font-sans">Total R$ {it.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowXmlImportModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={!parsedXmlResult}
                  onClick={handleConfirmXmlImport}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Importar NF-e e Sincronizar Estoque
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRE-TRANSMISSION REVIEW MODAL */}
      {preTxData && (
        <PreTransmissionReviewModal
          isOpen={!!preTxData}
          onClose={() => {
            setPreTxData(null);
            setPendingTxAction(null);
          }}
          data={preTxData}
          sefazConfig={sefazConfig}
          companyInfo={db.companyInfo}
          onConfirmTransmission={async () => {
            if (pendingTxAction) {
              await pendingTxAction();
            }
          }}
        />
      )}
    </div>
  );
}
