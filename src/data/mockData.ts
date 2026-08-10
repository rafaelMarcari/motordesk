/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Client, Vehicle, Part, Service, Budget, ServiceOrder, HistoryEntry, TestCase, StockMovement, CompanyInfo, SystemNotification, AlertSettings, Supplier, SupplierPartPrice, Quotation, AccountReceivable, AccountPayable, FinancialTransaction, MaintenanceLog, PaymentMethodOption, FiscalDocument, BoletoDocument, InterBranchSaleLogistics, SefazApiConfig, TaxOperationNature, TaxRule, XmlImportRecord } from '../types';

export const INITIAL_SEFAZ_CONFIG: SefazApiConfig = {
  environment: 'homologation',
  uf: 'SP',
  certificateStatus: 'A1_ACTIVE',
  certificateName: 'Certificado e-CNPJ A1 (MotorDesk Testes)',
  certificateExpirationDate: '2027-12-31',
  autoTransmit: true,
  taxRegime: 'simples_nacional',
  stateRegistration: '388.123.456.110',
  cityRegistration: '123456-7',
  cnaeCode: '4520-0/01',
  nfeSeries: '1',
  nextNfeNumber: 105,
  nfseSeries: '1',
  nextNfseNumber: 46,
  defaultProductCfop: '5.102',
  defaultServiceCfop: '5.933',
  defaultIssRatePercent: 5.0,
  defaultIcmsRatePercent: 18.0,
  defaultIbsRatePercent: 0.1,  // Reforma Tributária 2026 - Alíquota Teste IBS
  defaultCbsRatePercent: 0.9,  // Reforma Tributária 2026 - Alíquota Teste CBS
  clientApiToken: 'md_live_tok_982347102983741928374981', // Token do Emissor do Cliente
  pfxCertificateFileName: 'Certificado_Digital_A1_MotorDesk.pfx',
  pfxCertificatePassword: '••••••••',
  pfxCertificateUploadDate: '2026-08-01',
  pfxCertificateSubjectCnpj: '12.345.678/0001-90'
};

export const INITIAL_TAX_OPERATION_NATURES: TaxOperationNature[] = [
  {
    id: 'nat-1',
    code: 'NAT-01',
    description: 'Venda de Peças / Mercadorias para Consumidor Final',
    cfopInternal: '5.102',
    cfopInterstate: '6.102',
    generatesFinancial: true,
    movesStock: true,
    docType: '1',
    nfePurpose: '1',
    notes: 'Operação padrão de venda de peças para cliente consumidor final.'
  },
  {
    id: 'nat-2',
    code: 'NAT-02',
    description: 'Venda de Peças com Substituição Tributária (ST)',
    cfopInternal: '5.405',
    cfopInterstate: '6.405',
    generatesFinancial: true,
    movesStock: true,
    docType: '1',
    nfePurpose: '1',
    notes: 'Venda de produtos sujeitos a ICMS-ST com imposto recolhido anteriormente.'
  },
  {
    id: 'nat-3',
    code: 'NAT-03',
    description: 'Prestação de Serviço de Oficina (ISSQN)',
    cfopInternal: '5.933',
    cfopInterstate: '6.933',
    generatesFinancial: true,
    movesStock: false,
    docType: '1',
    nfePurpose: '1',
    notes: 'Faturamento de mão de obra e serviços mecânicos sujeito ao ISS municipal.'
  },
  {
    id: 'nat-4',
    code: 'NAT-04',
    description: 'Remessa de Peça para Conserto ou Garantia',
    cfopInternal: '5.915',
    cfopInterstate: '6.915',
    generatesFinancial: false,
    movesStock: true,
    docType: '1',
    nfePurpose: '1',
    notes: 'Envio de peças com defeito para fabricante/distribuidor em garantia.'
  },
  {
    id: 'nat-5',
    code: 'NAT-05',
    description: 'Devolução de Compra para Comercialização',
    cfopInternal: '5.202',
    cfopInterstate: '6.202',
    generatesFinancial: true,
    movesStock: true,
    docType: '1',
    nfePurpose: '4',
    notes: 'Devolução de mercadoria adquirida de fornecedor.'
  },
  {
    id: 'nat-6',
    code: 'NAT-06',
    description: 'Transferência de Mercadoria entre Filiais',
    cfopInternal: '5.152',
    cfopInterstate: '6.152',
    generatesFinancial: false,
    movesStock: true,
    docType: '1',
    nfePurpose: '1',
    notes: 'Movimentação logística de peças entre a Matriz e Filiais da rede.'
  }
];

export const INITIAL_TAX_RULES: TaxRule[] = [
  {
    id: 'rule-1',
    name: 'Regra Padrão Simples Nacional - Vendas SP -> SP',
    ufOrigin: 'SP',
    ufDestination: 'SP',
    taxRegime: 'simples_nacional',
    natureId: 'nat-1',
    cfop: '5.102',
    icmsCstOrCsosn: '102',
    icmsRatePercent: 0,
    pisCst: '01',
    pisRatePercent: 0,
    cofinsCst: '01',
    cofinsRatePercent: 0,
    ipiCst: '99',
    ipiRatePercent: 0,
    active: true,
    notes: 'Tributação simplificada do Simples Nacional sem destaque de ICMS na NF-e.'
  },
  {
    id: 'rule-2',
    name: 'Regra Autopeças ST - Simples Nacional SP -> SP',
    ufOrigin: 'SP',
    ufDestination: 'SP',
    taxRegime: 'simples_nacional',
    natureId: 'nat-2',
    cfop: '5.405',
    icmsCstOrCsosn: '500',
    icmsRatePercent: 0,
    pisCst: '04',
    pisRatePercent: 0,
    cofinsCst: '04',
    cofinsRatePercent: 0,
    ipiCst: '99',
    ipiRatePercent: 0,
    active: true,
    notes: 'Segregação de receita do ICMS-ST e PIS/COFINS monofásico.'
  },
  {
    id: 'rule-3',
    name: 'Regra Venda Interestadual para Consumidor Não Contribuinte (DIFAL)',
    ufOrigin: 'SP',
    ufDestination: '*',
    taxRegime: 'simples_nacional',
    natureId: 'nat-1',
    cfop: '6.102',
    icmsCstOrCsosn: '102',
    icmsRatePercent: 12.0,
    pisCst: '01',
    pisRatePercent: 0,
    cofinsCst: '01',
    cofinsRatePercent: 0,
    difalRatePercent: 6.0,
    active: true,
    notes: 'DIFAL partilhado conforme EC 87/2015 para vendas consumidor final fora do Estado.'
  }
];

export const INITIAL_XML_IMPORT_RECORDS: XmlImportRecord[] = [
  {
    id: 'xml-1',
    accessKey: '35260798765432000110550010000010421004567890',
    nfeNumber: '1042',
    series: '1',
    issueDate: '2026-07-01',
    supplierName: 'AutoPeças Brasil Ltda',
    supplierCnpj: '98.765.432/0001-10',
    supplierIe: '112.334.556.778',
    recipientName: 'MotorDesk Auto Center - Matriz Pinheiros',
    recipientCnpj: '12.345.678/0001-90',
    totalProductsAmount: 2200.00,
    totalAmount: 2450.00,
    icmsAmount: 396.00,
    ipiAmount: 110.00,
    pisAmount: 36.30,
    cofinsAmount: 167.20,
    freightAmount: 140.00,
    protocolNumber: '135260000889900',
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe35260798765432000110550010000010421004567890"><ide><nNF>1042</nNF><serie>1</serie><dhEmi>2026-07-01T10:00:00-03:00</dhEmi></ide><emit><CNPJ>98765432000110</CNPJ><xNome>AutoPeças Brasil Ltda</xNome></emit><dest><CNPJ>12345678000190</CNPJ><xNome>MotorDesk Auto Center</xNome></dest><det nItem="1"><prod><cProd>PE-001</cProd><xProd>Pastilha de Freio Dianteira Brembo</xProd><NCM>87083090</NCM><qCom>15</qCom><vUnCom>110.00</vUnCom><vProd>1650.00</vProd></prod></det></infNFe></NFe></nfeProc>`,
    itemsCount: 1,
    importedAt: '2026-07-01T10:30:00Z',
    status: 'stock_synced',
    items: [
      {
        cProd: 'PE-001',
        xProd: 'Pastilha de Freio Dianteira Brembo',
        ncm: '8708.30.90',
        cest: '10.002.00',
        cfop: '5.102',
        uCom: 'PAR',
        qCom: 15,
        vUnCom: 110.00,
        vProd: 1650.00,
        icmsCstOrCsosn: '00',
        vICMS: 297.00,
        matchedPartId: 'prt-1',
        actionTaken: 'stock_updated'
      }
    ]
  }
];

export const INITIAL_FISCAL_DOCUMENTS: FiscalDocument[] = [
  {
    id: 'fisc-1',
    code: 'NFE-000101',
    type: 'nfe_product',
    status: 'authorized',
    accessKey: '35260712345678000190550010000001011001234567',
    protocolNumber: '135260000987654',
    issueDate: '2026-07-20',
    issuedAt: '2026-07-20 14:30:00',
    companyId: 'comp-1',
    companyName: 'MotorDesk Auto Center - Matriz Pinheiros',
    companyCnpj: '12.345.678/0001-90',
    clientId: 'cli-1',
    clientName: 'João Pedro da Silva',
    clientCpfCnpj: '123.456.789-00',
    serviceOrderId: 'os-1',
    cfop: '5.102',
    totalProducts: 540.00,
    totalServices: 0,
    totalTaxes: 97.20,
    totalAmount: 540.00,
    sefazStatusMessage: '100 - Autorizado o uso da NF-e',
    environment: 'homologation',
    items: [
      { id: 'fi-1', code: 'PE-001', name: 'Jogo de Pastilhas de Freio Dianteira Brembo', ncm: '8708.30.90', quantity: 2, unitPrice: 220.00, totalPrice: 440.00, type: 'part', cfop: '5.102', icmsRatePercent: 18 },
      { id: 'fi-2', code: 'PE-002', name: 'Filtro de Óleo Mann-Filter W712', ncm: '8421.23.00', quantity: 2, unitPrice: 50.00, totalPrice: 100.00, type: 'part', cfop: '5.102', icmsRatePercent: 18 }
    ]
  },
  {
    id: 'fisc-2',
    code: 'NFSE-000045',
    type: 'nfse_service',
    status: 'authorized',
    accessKey: '35260700000045100000010210098765',
    protocolNumber: '2026987654321',
    issueDate: '2026-07-20',
    issuedAt: '2026-07-20 14:35:00',
    companyId: 'comp-1',
    companyName: 'MotorDesk Auto Center - Matriz Pinheiros',
    companyCnpj: '12.345.678/0001-90',
    clientId: 'cli-1',
    clientName: 'João Pedro da Silva',
    clientCpfCnpj: '123.456.789-00',
    serviceOrderId: 'os-1',
    cfop: '14.01', // Código de Serviço ISS
    totalProducts: 0,
    totalServices: 280.00,
    totalTaxes: 14.00,
    totalAmount: 280.00,
    sefazStatusMessage: '100 - NFS-e Emitida e Homologada com Sucesso na Prefeitura',
    environment: 'homologation',
    items: [
      { id: 'fi-3', code: 'SRV-001', name: 'Substituição de Pastilhas e Discos de Freio', quantity: 1, unitPrice: 180.00, totalPrice: 180.00, type: 'service', issRatePercent: 5 },
      { id: 'fi-4', code: 'SRV-002', name: 'Troca de Óleo do Motor e Filtros', quantity: 1, unitPrice: 100.00, totalPrice: 100.00, type: 'service', issRatePercent: 5 }
    ]
  },
  {
    id: 'fisc-3',
    code: 'NFE-000102',
    type: 'nfe_transfer',
    status: 'authorized',
    accessKey: '35260712345678000190550010000001021009876543',
    protocolNumber: '135260000998877',
    issueDate: '2026-07-25',
    issuedAt: '2026-07-25 10:15:00',
    companyId: 'comp-2',
    companyName: 'MotorDesk Auto Center - Filial Zona Sul',
    companyCnpj: '12.345.678/0002-71',
    targetBranchId: 'comp-1',
    targetBranchName: 'MotorDesk Auto Center - Matriz Pinheiros',
    targetBranchCnpj: '12.345.678/0001-90',
    cfop: '5.152', // Transferência de mercadoria adquirida ou recebida de terceiros
    totalProducts: 380.00,
    totalServices: 0,
    totalTaxes: 68.40,
    totalAmount: 380.00,
    sefazStatusMessage: '100 - NF-e de Transferência Interfiliais Autorizada na SEFAZ',
    environment: 'homologation',
    logisticsOption: 'WAIT_TRANSFER_AT_BUYSTORE',
    items: [
      { id: 'fi-5', code: 'PE-003', name: 'Bateria Moura 60Ah M60AD', ncm: '8507.10.10', quantity: 1, unitPrice: 380.00, totalPrice: 380.00, type: 'part', cfop: '5.152', icmsRatePercent: 18 }
    ]
  }
];

export const INITIAL_BOLETOS: BoletoDocument[] = [
  {
    id: 'bol-1',
    code: 'BOL-2026-001',
    bankCode: '001',
    bankName: 'Banco do Brasil S.A.',
    barcodeNumber: '00190.00009 01234.567809 12345.678901 1 98760000082000',
    pixQrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020126580014br.gov.bcb.pix0136motordesk-pix-key-2026-0015204000053039865405820.005802BR5925MotorDesk%20Auto%20Center6009Sao%20Paulo62070503***6304E1D2',
    pixCopiaECola: '00020126580014br.gov.bcb.pix0136motordesk-pix-key-2026-0015204000053039865405820.005802BR5925MotorDesk%20Auto%20Center6009Sao%20Paulo62070503***6304E1D2',
    payerName: 'João Pedro da Silva',
    payerCpfCnpj: '123.456.789-00',
    amount: 820.00,
    dueDate: '2026-08-05',
    issueDate: '2026-07-20',
    status: 'registered',
    companyId: 'comp-1',
    serviceOrderId: 'os-1',
    receivableId: 'cr-1',
    nfeAccessKey: '35260712345678000190550010000001011001234567'
  },
  {
    id: 'bol-2',
    code: 'BOL-2026-002',
    bankCode: '341',
    bankName: 'Itaú Unibanco S.A.',
    barcodeNumber: '34191.76543 98765.432109 87654.321098 2 98800000045000',
    pixQrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020126580014br.gov.bcb.pix0136motordesk-pix-key-2026-0025204000053039865405450.005802BR5925MotorDesk%20Auto%20Center6009Sao%20Paulo6304F2E3',
    pixCopiaECola: '00020126580014br.gov.bcb.pix0136motordesk-pix-key-2026-0025204000053039865405450.005802BR5925MotorDesk%20Auto%20Center6009Sao%20Paulo6304F2E3',
    payerName: 'Mariana Costa Ferreira',
    payerCpfCnpj: '987.654.321-11',
    amount: 450.00,
    dueDate: '2026-08-10',
    issueDate: '2026-07-22',
    status: 'registered',
    companyId: 'comp-1',
    receivableId: 'cr-2'
  }
];

export const INITIAL_INTER_BRANCH_SALES: InterBranchSaleLogistics[] = [
  {
    id: 'ibs-1',
    saleId: 'VENDA-2026-101',
    originStoreId: 'comp-1', // Matriz Pinheiros
    originStoreName: 'MotorDesk Auto Center - Matriz Pinheiros',
    stockStoreId: 'comp-2', // Filial Zona Sul
    stockStoreName: 'MotorDesk Auto Center - Filial Zona Sul',
    partId: 'prt-3',
    partName: 'Bateria Moura 60Ah M60AD',
    partCode: 'PE-003',
    quantity: 1,
    unitPrice: 420.00,
    totalPrice: 420.00,
    logisticsOption: 'WAIT_TRANSFER_AT_BUYSTORE', // Cliente aguarda a peça chegar na loja da compra
    transferNfeId: 'fisc-3',
    transferStatus: 'in_transit',
    createdAt: '2026-07-25 10:15:00',
    clientName: 'Fernando Henrique Souza',
    clientCpfCnpj: '444.555.666-77'
  },
  {
    id: 'ibs-2',
    saleId: 'VENDA-2026-102',
    originStoreId: 'comp-1', // Matriz Pinheiros (onde pagou)
    originStoreName: 'MotorDesk Auto Center - Matriz Pinheiros',
    stockStoreId: 'comp-2', // Filial Zona Sul (onde retira)
    stockStoreName: 'MotorDesk Auto Center - Filial Zona Sul',
    partId: 'prt-4',
    partName: 'Amortecedor Dianteiro Cofap GP30112',
    partCode: 'PE-004',
    quantity: 2,
    unitPrice: 320.00,
    totalPrice: 640.00,
    logisticsOption: 'PAY_BUYSTORE_PICKUP_STOCKSTORE', // Paga na loja A e retira na loja B
    transferStatus: 'picked_up_by_client',
    pickupQrCode: 'RETIRA-COMP2-VENDA102-2026',
    createdAt: '2026-07-26 15:40:00',
    clientName: 'Juliana Paes de Oliveira',
    clientCpfCnpj: '222.333.444-55'
  }
];

export const INITIAL_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'pm-pix', name: 'PIX (À Vista)', type: 'pix', defaultInterestRatePercent: 0, maxInstallments: 1, active: true, notes: 'Recebimento instantâneo sem taxa' },
  { id: 'pm-dinheiro', name: 'Dinheiro (Espécie)', type: 'cash', defaultInterestRatePercent: 0, maxInstallments: 1, active: true, notes: 'Pagamento em moeda corrente' },
  { id: 'pm-debito', name: 'Cartão de Débito', type: 'debit_card', defaultInterestRatePercent: 1.5, maxInstallments: 1, active: true, notes: 'Taxa de maquininha débito: 1.5%' },
  { id: 'pm-credito', name: 'Cartão de Crédito', type: 'credit_card', defaultInterestRatePercent: 3.5, maxInstallments: 12, active: true, notes: 'Parcelamento até 12x com acréscimo' },
  { id: 'pm-boleto', name: 'Boleto Bancário', type: 'bank_slip', defaultInterestRatePercent: 0, maxInstallments: 6, active: true, notes: 'Emissão de boleto faturado' },
];

export const INITIAL_ALERT_SETTINGS: AlertSettings = {
  enableLowStockAlerts: true,
  enableBudgetCreatedAlerts: true,
  enableServiceOrderCreatedAlerts: true,
  enableBudgetConvertedAlerts: true,
  enableStockReservedExpirationAlerts: true,
  defaultBudgetValidityDays: 10,
  defaultPaymentRequirementMode: 'ADVANCE_DEPOSIT',
  defaultDepositPercentage: 30,
  requireDepositToExecuteOS: true,
  allowPerClientPaymentOverride: true,
};

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    companyId: 'comp-1',
    type: 'stock_low',
    title: 'Estoque Baixo Detectado',
    message: 'A peça "Amortecedor Dianteiro Cofap" (PE-004) está com apenas 4 unidades disponíveis (Mínimo: 6).',
    date: '2026-07-22T07:00:00Z',
    read: false,
    metadata: {
      partId: 'prt-4',
      partName: 'Amortecedor Dianteiro Cofap',
      availableStock: 4,
      minStock: 6
    }
  },
  {
    id: 'notif-2',
    companyId: 'comp-1',
    type: 'budget_converted',
    title: 'Orçamento Convertido em OS',
    message: 'Orçamento #orc-1 foi convertido na Ordem de Serviço #os-1 (Conversão TOTAL - 3 de 3 itens aprovados).',
    date: '2026-07-05T10:30:00Z',
    read: true,
    metadata: {
      budgetId: 'orc-1',
      serviceOrderId: 'os-1',
      conversionType: 'TOTAL',
      itemsCount: 3,
      totalItemsCount: 3
    }
  }
];

// Empresa / Oficina Inicial Padrão
export const INITIAL_COMPANY_INFO: CompanyInfo = {
  id: 'comp-1',
  name: 'MotorDesk Auto Center - Matriz Pinheiros',
  cnpj: '12.345.678/0001-90',
  companyType: 'matriz',
  phone: '(11) 3344-5566',
  whatsapp: '11987654321', // WhatsApp Oficial
  email: 'contato@motordesk.com.br',
  address: 'Av. das Nações Unidas, 1200 - Pinheiros, São Paulo - SP',
  logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" rx="10" fill="%231e1b4b"/><circle cx="35" cy="30" r="18" fill="%234f46e5"/><path d="M27 30l5 5 10-10" stroke="%23ffffff" stroke-width="3" fill="none" stroke-linecap="round"/><text x="65" y="34" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23ffffff">MotorDesk</text><text x="65" y="46" font-family="sans-serif" font-size="10" fill="%23818cf8">AUTO CENTER</text></svg>',
  welcomeMessage: 'Agradecemos a preferência! Segue o detalhamento do seu orçamento/ordem de serviço.',
  registeredAt: '2026-01-01T08:00:00Z',
  subscriptionStatus: 'active',
  startDate: '2026-01-01',
  expirationDate: '2026-12-31',
  monthlyFee: 299.90,
  paymentStatus: 'paid',
  lastPaymentDate: '2026-07-01',
  legalRepresentativeName: 'Rafael Marcari Silva',
  legalRepresentativeCpf: '123.456.789-00',
  contractStatus: 'pending'
};

export const INITIAL_COMPANIES: CompanyInfo[] = [
  INITIAL_COMPANY_INFO,
  {
    id: 'comp-2',
    name: 'MotorDesk Auto Center - Filial Vila Mariana',
    cnpj: '98.765.432/0001-10',
    companyType: 'filial',
    parentMatrizId: 'comp-1',
    phone: '(11) 4567-8900',
    whatsapp: '11977778888',
    email: 'atendimento@precisionmotors.com.br',
    address: 'Rua Vergueiro, 3500 - Vila Mariana, São Paulo - SP',
    welcomeMessage: 'MotorDesk Vila Mariana - Atendimento e manutenção rápida.',
    registeredAt: '2026-02-15T09:00:00Z',
    subscriptionStatus: 'active',
    startDate: '2026-02-15',
    expirationDate: '2026-07-28', // Próximo do vencimento
    monthlyFee: 399.90,
    paymentStatus: 'paid',
    lastPaymentDate: '2026-06-28',
    legalRepresentativeName: 'Carlos Eduardo Oliveira',
    legalRepresentativeCpf: '987.654.321-11',
    contractStatus: 'pending',
    notes: 'Filial vinculada à Matriz Pinheiros. Estoque integrado habilitado.'
  },
  {
    id: 'comp-3',
    name: 'Centro Automotivo Express Repair - Matriz RJ',
    cnpj: '45.123.890/0001-55',
    companyType: 'matriz',
    phone: '(21) 2233-4455',
    whatsapp: '21988889999',
    email: 'contato@expressrepair.com.br',
    address: 'Av. Brasil, 4500 - Rio de Janeiro - RJ',
    welcomeMessage: 'Express Repair - Serviços rápidos automotivos.',
    registeredAt: '2026-03-01T10:00:00Z',
    subscriptionStatus: 'blocked',
    startDate: '2026-03-01',
    expirationDate: '2026-06-30', // Vencido e Bloqueado
    monthlyFee: 249.90,
    paymentStatus: 'overdue',
    lastPaymentDate: '2026-05-30',
    notes: 'Acesso suspenso temporariamente por falta de pagamento da mensalidade de junho.'
  }
];

// Initial Users
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'admin',
    name: 'Carlos Santos (Gerente)',
    role: 'admin',
    passwordHash: 'admin123',
    companyId: 'comp-1',
    permissions: {
      accessDashboard: true,
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
    }
  },
  {
    id: 'usr-2',
    username: 'atendente',
    name: 'Ana Lima (Atendimento)',
    role: 'atendente',
    passwordHash: 'user123',
    companyId: 'comp-1',
    permissions: {
      accessDashboard: true,
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
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: false,
      accessFinancial: false,
    }
  },
  {
    id: 'usr-3',
    username: 'mecanico',
    name: 'Marcos Silveira (Mecânico Líder)',
    role: 'mecanico',
    passwordHash: 'mecanico123',
    companyId: 'comp-1',
    permissions: {
      accessDashboard: true,
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
      accessNotifications: true,
      accessAccountsReceivable: false,
      accessAccountsPayable: false,
      accessFinancial: false,
    }
  },
  {
    id: 'usr-4',
    username: 'qa',
    name: 'Rafael Marcari (QA MotorDesk)',
    role: 'qa',
    passwordHash: 'qa123',
    companyId: 'comp-1',
    permissions: {
      accessDashboard: true,
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
      canEditBudgets: true,
    }
  },
  // Usuários Exclusivos de Precision Motors (comp-2)
  {
    id: 'usr-comp2-qa',
    username: 'qa',
    name: 'QA Lead (Precision Motors)',
    role: 'qa',
    passwordHash: 'qa123',
    companyId: 'comp-2',
    permissions: {
      accessDashboard: true,
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
      canEditBudgets: true,
    }
  },
  {
    id: 'usr-comp2-1',
    username: 'precision_admin',
    name: 'Roberto Precision (Gerente)',
    role: 'admin',
    passwordHash: 'admin123',
    companyId: 'comp-2',
    permissions: {
      accessDashboard: true,
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
    }
  },
  {
    id: 'usr-comp2-2',
    username: 'precision_mecanico',
    name: 'Lucas Silva (Mecânico Precision)',
    role: 'mecanico',
    passwordHash: 'mecanico123',
    companyId: 'comp-2',
    permissions: {
      accessDashboard: true,
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
      accessNotifications: true,
      accessAccountsReceivable: false,
      accessAccountsPayable: false,
      accessFinancial: false,
    }
  },
  // Usuários Exclusivos de Centro Automotivo Express Repair (comp-3)
  {
    id: 'usr-comp3-qa',
    username: 'qa',
    name: 'QA Inspector (Express Repair)',
    role: 'qa',
    passwordHash: 'qa123',
    companyId: 'comp-3',
    permissions: {
      accessDashboard: true,
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
      canEditBudgets: true,
    }
  },
  {
    id: 'usr-comp3-1',
    username: 'express_admin',
    name: 'Marcelo Express (Gerente)',
    role: 'admin',
    passwordHash: 'admin123',
    companyId: 'comp-3',
    permissions: {
      accessDashboard: true,
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
    }
  }
];

// Initial Clients
export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    name: 'João Pedro da Silva',
    cpf: '123.456.789-00',
    email: 'joao.silva@email.com',
    phone: '(11) 98765-4321',
    address: 'Rua das Flores, 123 - Pinheiros, São Paulo - SP',
    createdAt: '2026-06-01T10:00:00Z',
    maxCreditLimit: 5000,
    currentDebt: 1250,
    paymentModeOverride: 'ADVANCE_DEPOSIT',
    depositPercentageOverride: 30
  },
  {
    id: 'cli-2',
    name: 'Maria Helena Oliveira',
    cpf: '987.654.321-11',
    email: 'maria.helena@email.com',
    phone: '(11) 99123-4567',
    address: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
    createdAt: '2026-06-15T14:30:00Z',
    maxCreditLimit: 3000,
    currentDebt: 0,
    paymentModeOverride: 'AFTER_COMPLETION'
  },
  {
    id: 'cli-3',
    name: 'Carlos Eduardo Santos',
    cpf: '456.789.123-22',
    email: 'carlos.santos@email.com',
    phone: '(21) 97111-2222',
    address: 'Rua Copacabana, 45 - Copacabana, Rio de Janeiro - RJ',
    createdAt: '2026-07-02T09:15:00Z',
    maxCreditLimit: 2000,
    currentDebt: 2450,
    paymentModeOverride: 'FULL_ADVANCE'
  }
];

// Initial Vehicles
export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    clientId: 'cli-1',
    plate: 'ABC-1234',
    brand: 'Chevrolet',
    model: 'Onix 1.0 Turbo',
    year: 2021,
    color: 'Cinza Metálico',
    createdAt: '2026-06-01T10:15:00Z'
  },
  {
    id: 'veh-2',
    clientId: 'cli-2',
    plate: 'XYZ-5678',
    brand: 'Honda',
    model: 'Civic LX 2.0',
    year: 2019,
    color: 'Preto Cristal',
    createdAt: '2026-06-15T14:45:00Z'
  },
  {
    id: 'veh-3',
    clientId: 'cli-3',
    plate: 'MNO-9012',
    brand: 'Ford',
    model: 'Ka Hatch 1.5',
    year: 2018,
    color: 'Branco Ártico',
    createdAt: '2026-07-02T09:30:00Z'
  }
];

// Initial Parts Inventory
export const INITIAL_PARTS: Part[] = [
  { id: 'prt-1', name: 'Pastilha de Freio Dianteira', code: 'PE-001', stock: 12, price: 180.00, costPrice: 110.00, minStock: 5, category: 'Freios', location: 'Prateleira A1', unit: 'PAR', ncm: '8708.30.90', lastSupplier: 'AutoPeças Brasil Ltda' },
  { id: 'prt-2', name: 'Filtro de Óleo Lubrificante', code: 'PE-002', stock: 25, price: 45.00, costPrice: 22.50, minStock: 10, category: 'Filtros', location: 'Prateleira B3', unit: 'UN', ncm: '8421.23.00', lastSupplier: 'Distribuidora Mahle', isPeriodic: true, maintenanceControl: { enabled: true, category: 'oil_change', defaultIntervalKm: 10000, defaultIntervalDays: 180 } },
  { id: 'prt-3', name: 'Óleo Motor Sintético 5W30 (1L)', code: 'PE-003', stock: 48, price: 65.00, costPrice: 38.00, minStock: 15, category: 'Óleos e Fluídos', location: 'Prateleira C2', unit: 'L', ncm: '2710.19.89', lastSupplier: 'Lubrificantes Mobil', isPeriodic: true, maintenanceControl: { enabled: true, category: 'oil_change', defaultIntervalKm: 10000, defaultIntervalDays: 180 }, isCrossSell: true, crossSellItems: [{ id: 'cs-1', type: 'service', itemId: 'srv-2', name: 'Troca de Óleo e Filtros', defaultQuantity: 1 }, { id: 'cs-2', type: 'part', itemId: 'prt-2', name: 'Filtro de Óleo Lubrificante', defaultQuantity: 1 }] },
  { id: 'prt-4', name: 'Amortecedor Dianteiro Cofap', code: 'PE-004', stock: 4, price: 420.00, costPrice: 280.00, minStock: 6, category: 'Suspensão', location: 'Prateleira D1', unit: 'UN', ncm: '8708.80.00', lastSupplier: 'Cofap Distribuidora' },
  { id: 'prt-5', name: 'Disco de Freio Dianteiro (Par)', code: 'PE-005', stock: 6, price: 290.00, costPrice: 175.00, minStock: 4, category: 'Freios', location: 'Prateleira A2', unit: 'PAR', ncm: '8708.30.90', lastSupplier: 'Fremax Componentes' },
  { id: 'prt-6', name: 'Filtro de Ar do Motor', code: 'PE-006', stock: 15, price: 55.00, costPrice: 28.00, minStock: 8, category: 'Filtros', location: 'Prateleira B2', unit: 'UN', ncm: '8421.31.00', lastSupplier: 'Distribuidora Mahle', isPeriodic: true, maintenanceControl: { enabled: true, category: 'oil_change', defaultIntervalKm: 10000, defaultIntervalDays: 180 } },
  { id: 'prt-7', name: 'Bateria Moura 60Ah', code: 'PE-007', stock: 3, price: 480.00, costPrice: 330.00, minStock: 5, category: 'Elétrica', location: 'Prateleira E1', unit: 'UN', ncm: '8507.10.10', lastSupplier: 'Moura Baterias S.A.' }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    partId: 'prt-1',
    partName: 'Pastilha de Freio Dianteira',
    partCode: 'PE-001',
    type: 'in',
    quantity: 15,
    unitCost: 110.00,
    reason: 'Entrada por Importação NFe #1042 - AutoPeças Brasil Ltda',
    supplierOrNFe: 'NFe #1042',
    date: '2026-07-01T10:30:00Z',
    userName: 'Carlos Santos (Gerente)'
  },
  {
    id: 'mov-2',
    partId: 'prt-4',
    partName: 'Amortecedor Dianteiro Cofap',
    partCode: 'PE-004',
    type: 'out',
    quantity: 2,
    unitCost: 280.00,
    reason: 'Baixa para Ordem de Serviço OS-2026-002',
    supplierOrNFe: 'OS-2026-002',
    date: '2026-07-10T14:15:00Z',
    userName: 'Marcos Silveira (Mecânico Líder)'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'AutoPeças Brasil Ltda',
    tradeName: 'AutoPeças Distribuidora',
    cnpjCpf: '11.222.333/0001-44',
    email: 'vendas@autopecasbrasil.com.br',
    phone: '(11) 3322-1100',
    contactPerson: 'Roberto Vendedor',
    address: 'Rua do Comércio, 450 - São Paulo - SP',
    paymentTerms: '28 dias / Faturado',
    status: 'active',
    notes: 'Fornecedor principal de pastilhas, freios e suspensão.',
    createdAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'sup-2',
    name: 'Distribuidora Mahle Filtros S.A.',
    tradeName: 'Mahle Componentes',
    cnpjCpf: '22.333.444/0001-55',
    email: 'pedidos@mahle.com.br',
    phone: '(11) 4004-8899',
    contactPerson: 'Juliana Comercial',
    address: 'Av. Industrial, 1200 - Bernardo do Campo - SP',
    paymentTerms: '30/60 dias boleto',
    status: 'active',
    notes: 'Especialista em filtros de ar, combustível e óleo.',
    createdAt: '2026-02-01T09:00:00Z'
  },
  {
    id: 'sup-3',
    name: 'Lubrificantes Mobil & Distribuição',
    tradeName: 'Mobil Distribuição SP',
    cnpjCpf: '33.444.555/0001-66',
    email: 'contato@mobildist.com.br',
    phone: '(11) 5544-2211',
    contactPerson: 'Marcos Vendas',
    address: 'Rod. Raposo Tavares, Km 18 - Osasco - SP',
    paymentTerms: 'À vista com 5% de desconto ou PIX',
    status: 'active',
    notes: 'Fornecedor de óleos lubrificantes sintéticos e fluídos de freio em caixa/tambor.',
    createdAt: '2026-03-10T11:30:00Z'
  }
];

export const INITIAL_SUPPLIER_PART_PRICES: SupplierPartPrice[] = [
  {
    id: 'spp-1',
    supplierId: 'sup-1',
    partId: 'prt-1',
    partCode: 'PE-001',
    supplierPartCode: 'AP-FREIO-101',
    supplierPartName: 'Pastilha Freio Diant. Premium',
    packageUnit: 'CX',
    conversionRatio: 5,
    lastQuotedCost: 520.00,
    lastPurchaseCost: 110.00,
    lastPurchaseDate: '2026-07-01T10:30:00Z',
    lastPurchaseQuantity: 15,
    notes: 'Desconto acumulado para lote acima de 10 caixas.'
  },
  {
    id: 'spp-2',
    supplierId: 'sup-2',
    partId: 'prt-2',
    partCode: 'PE-002',
    supplierPartCode: 'MHL-FO-22',
    supplierPartName: 'Filtro Óleo Lubrificante OC-90',
    packageUnit: 'CX',
    conversionRatio: 10,
    lastQuotedCost: 210.00,
    lastPurchaseCost: 22.50,
    lastPurchaseDate: '2026-06-20T14:00:00Z',
    lastPurchaseQuantity: 20,
    notes: 'Fornecido em caixas de 10 unidades lacradas.'
  },
  {
    id: 'spp-3',
    supplierId: 'sup-3',
    partId: 'prt-3',
    partCode: 'PE-003',
    supplierPartCode: 'MOB-5W30-CX',
    supplierPartName: 'Caixa de Óleo Mobil Super 3000 5W30 (12L)',
    packageUnit: 'CX',
    conversionRatio: 12,
    lastQuotedCost: 432.00,
    lastPurchaseCost: 38.00,
    lastPurchaseDate: '2026-06-25T16:00:00Z',
    lastPurchaseQuantity: 48,
    notes: 'Embalagem promocional de caixa fechada com 12 frascos de 1L.'
  }
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'cot-1',
    code: 'COT-2026-001',
    supplierId: 'sup-1',
    supplierName: 'AutoPeças Brasil Ltda',
    createdAt: '2026-07-15T09:30:00Z',
    validUntil: '2026-07-30T23:59:59Z',
    status: 'received',
    items: [
      {
        id: 'coti-1',
        partId: 'prt-1',
        partCode: 'PE-001',
        partName: 'Pastilha de Freio Dianteira',
        suggestedQuantity: 15,
        quantity: 15,
        packageUnit: 'PAR',
        conversionRatio: 1,
        lastPurchaseCost: 110.00,
        targetCost: 108.00,
        quotedCost: 105.00,
        totalCost: 1575.00,
        notes: 'Preço em lote com desconto de 4,5%'
      },
      {
        id: 'coti-2',
        partId: 'prt-5',
        partCode: 'PE-005',
        partName: 'Disco de Freio Dianteiro (Par)',
        suggestedQuantity: 4,
        quantity: 5,
        packageUnit: 'PAR',
        conversionRatio: 1,
        lastPurchaseCost: 175.00,
        targetCost: 170.00,
        quotedCost: 168.00,
        totalCost: 840.00,
        notes: 'Pronta entrega na distribuidora'
      }
    ],
    totalValue: 2415.00,
    paymentTerms: '28 dias no boleto',
    deliveryDays: 2,
    notes: 'Cotação prévia solicitada para reposição do estoque de freios.',
    createdBy: 'Carlos Santos (Gerente)'
  }
];

// Initial Services List
export const INITIAL_SERVICES: Service[] = [
  { 
    id: 'srv-1', 
    name: 'Troca de Óleo e Filtro de Motor', 
    standardHours: 0.5, 
    price: 60.00,
    category: 'Troca de Óleo',
    isPeriodic: true,
    maintenanceControl: {
      enabled: true,
      category: 'oil_change',
      defaultIntervalKm: 10000,
      defaultIntervalDays: 180,
      specificationsLabel: 'Viscosidade e Especificação do Óleo (Ex: 5W30 Sintético Mobil)',
      recommendedInstructions: 'Verificar anel do cárter, nível de fluído de freio e filtro de ar.'
    }
  },
  { id: 'srv-2', name: 'Substituição de Pastilhas e Discos de Freio', standardHours: 1.5, price: 180.00, category: 'Freios' },
  { 
    id: 'srv-3', 
    name: 'Alinhamento 3D e Balanceamento das 4 Rodas', 
    standardHours: 1.0, 
    price: 120.00,
    category: 'Pneus e Rodas',
    isPeriodic: true,
    maintenanceControl: {
      enabled: true,
      category: 'tire_alignment_balance',
      defaultIntervalKm: 10000,
      defaultIntervalDays: 180,
      specificationsLabel: 'Geometria do Alinhamento e Calibragem PSI',
      recommendedInstructions: 'Fazer rodízio de pneus X (dianteiro para traseiro).'
    }
  },
  { 
    id: 'srv-4', 
    name: 'Troca e Montagem de Pneus (Jogo ou Par)', 
    standardHours: 1.5, 
    price: 160.00,
    category: 'Pneus e Rodas',
    isPeriodic: true,
    maintenanceControl: {
      enabled: true,
      category: 'tire_change',
      defaultIntervalKm: 40000,
      defaultIntervalDays: 365,
      specificationsLabel: 'Medida, Marca e Modelo dos Pneus (Ex: 205/55 R16 Pirelli)',
      recommendedInstructions: 'Verificar válvulas de ar (bicos) e data DOT de fabricação.'
    }
  },
  { id: 'srv-5', name: 'Substituição de Amortecedores Dianteiros', standardHours: 2.0, price: 240.00, category: 'Suspensão' },
  { id: 'srv-6', name: 'Diagnóstico Computadorizado de Injeção Eletrônica', standardHours: 1.0, price: 150.00, category: 'Injeção Eletrônica' }
];

export const INITIAL_MAINTENANCE_LOGS: MaintenanceLog[] = [
  {
    id: 'mlog-1',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    serviceOrderId: 'os-1',
    serviceId: 'srv-1',
    serviceName: 'Troca de Óleo e Filtro de Motor',
    category: 'oil_change',
    performedDate: '2026-05-10',
    performedKm: 45000,
    nextDueKm: 55000,
    nextDueDate: '2026-11-10',
    specifications: 'Óleo Sintético Mobil Super 5W30 (4L) + Filtro Mahle OC-90',
    notes: 'Troca realizada com sucesso. Próxima troca em 55.000 KM.',
    status: 'ok',
    recordedBy: 'Marcos Silveira (Mecânico Líder)',
    createdAt: '2026-05-10T11:00:00Z'
  },
  {
    id: 'mlog-2',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    serviceOrderId: 'os-1',
    serviceId: 'srv-3',
    serviceName: 'Alinhamento 3D e Balanceamento das 4 Rodas',
    category: 'tire_alignment_balance',
    performedDate: '2026-05-10',
    performedKm: 45000,
    nextDueKm: 55000,
    nextDueDate: '2026-11-10',
    specifications: 'Alinhamento 3D dianteiro/traseiro e balanceamento das 4 rodas',
    notes: 'Rodízio dos pneus efetuado (pneus dianteiros para a traseira em X).',
    status: 'ok',
    recordedBy: 'Marcos Silveira (Mecânico Líder)',
    createdAt: '2026-05-10T11:15:00Z'
  },
  {
    id: 'mlog-3',
    vehicleId: 'veh-2',
    clientId: 'cli-2',
    serviceOrderId: 'os-2',
    serviceId: 'srv-1',
    serviceName: 'Troca de Óleo e Filtro de Motor',
    category: 'oil_change',
    performedDate: '2026-01-15',
    performedKm: 78000,
    nextDueKm: 88000,
    nextDueDate: '2026-07-15',
    specifications: 'Óleo Sintético 5W30 (4L) + Filtro de Óleo',
    notes: 'Atenção: Troca próxima do limite de tempo.',
    status: 'due_soon',
    recordedBy: 'Carlos Santos (Gerente)',
    createdAt: '2026-01-15T15:30:00Z'
  },
  {
    id: 'mlog-4',
    vehicleId: 'veh-2',
    clientId: 'cli-2',
    serviceName: 'Troca e Montagem de Pneus',
    category: 'tire_change',
    performedDate: '2024-06-10',
    performedKm: 50000,
    nextDueKm: 90000,
    nextDueDate: '2026-06-10',
    specifications: 'Pneu Pirelli Cinturato P7 205/55 R16 (4 Pneus)',
    notes: 'Pneus com mais de 2 anos de uso. Recomendar verificação do TWI ao cliente.',
    status: 'overdue',
    recordedBy: 'Marcos Silveira (Mecânico Líder)',
    createdAt: '2024-06-10T10:00:00Z'
  }
];

// Initial Budgets
export const INITIAL_BUDGETS: Budget[] = [
  {
    id: 'orc-1',
    clientId: 'cli-1',
    vehicleId: 'veh-1',
    validityDays: 10,
    createdAt: '2026-07-05T09:00:00Z',
    items: [
      { id: 'item-1', type: 'part', itemId: 'prt-1', name: 'Pastilha de Freio Dianteira', quantity: 1, unitPrice: 180.00, totalPrice: 180.00, status: 'approved' },
      { id: 'item-2', type: 'part', itemId: 'prt-5', name: 'Disco de Freio Dianteiro (Par)', quantity: 1, unitPrice: 290.00, totalPrice: 290.00, status: 'approved' },
      { id: 'item-3', type: 'service', itemId: 'srv-2', name: 'Substituição de Pastilhas e Discos de Freio', quantity: 1, unitPrice: 180.00, totalPrice: 180.00, status: 'approved' }
    ],
    status: 'approved',
    notes: 'Cliente reclama de ruído agudo ao frear.'
  },
  {
    id: 'orc-2',
    clientId: 'cli-2',
    vehicleId: 'veh-2',
    validityDays: 15,
    createdAt: '2026-07-10T14:00:00Z',
    items: [
      { id: 'item-4', type: 'part', itemId: 'prt-2', name: 'Filtro de Óleo Lubrificante', quantity: 1, unitPrice: 45.00, totalPrice: 45.00, status: 'approved' },
      { id: 'item-5', type: 'part', itemId: 'prt-3', name: 'Óleo Motor Sintético 5W30 (1L)', quantity: 4, unitPrice: 65.00, totalPrice: 260.00, status: 'approved' },
      { id: 'item-6', type: 'service', itemId: 'srv-1', name: 'Troca de Óleo e Filtro', quantity: 1, unitPrice: 60.00, totalPrice: 60.00, status: 'approved' },
      { id: 'item-7', type: 'part', itemId: 'prt-4', name: 'Amortecedor Dianteiro Cofap', quantity: 2, unitPrice: 420.00, totalPrice: 840.00, status: 'rejected' }, // RN005: recusado permanece
      { id: 'item-8', type: 'service', itemId: 'srv-5', name: 'Substituição de Amortecedores Dianteiros', quantity: 1, unitPrice: 240.00, totalPrice: 240.00, status: 'rejected' }
    ],
    status: 'partially_approved',
    notes: 'Revisão periódica de quilometragem. Foram identificados amortecedores dianteiros vazando, mas o cliente optou por não fazer a troca neste momento.'
  },
  {
    id: 'orc-3',
    clientId: 'cli-3',
    vehicleId: 'veh-3',
    validityDays: 7,
    createdAt: '2026-07-13T10:30:00Z',
    items: [
      { id: 'item-9', type: 'part', itemId: 'prt-7', name: 'Bateria Moura 60Ah', quantity: 1, unitPrice: 480.00, totalPrice: 480.00, status: 'pending' },
      { id: 'item-10', type: 'service', itemId: 'srv-6', name: 'Diagnóstico Computadorizado de Injeção Eletrônica', quantity: 1, unitPrice: 150.00, totalPrice: 150.00, status: 'pending' }
    ],
    status: 'pending',
    notes: 'Veículo com dificuldade extrema para dar partida, painel piscando.'
  }
];

// Initial Service Orders
export const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [
  {
    id: 'os-1',
    budgetId: 'orc-1',
    clientId: 'cli-1',
    vehicleId: 'veh-1',
    mechanicId: 'usr-3',
    companyId: 'comp-1',
    createdAt: '2026-07-05T10:30:00Z',
    startedAt: '2026-07-05T11:00:00Z',
    completedAt: '2026-07-05T15:30:00Z',
    status: 'completed',
    paymentStatus: 'paid',
    workshopStatus: 'blue',
    workshopStatusUpdatedAt: new Date().toISOString().split('T')[0],
    technicalRecommendations: 'Recomendado rodízio de pneus nos próximos 5.000km. Pastilhas antigas estavam totalmente desgastadas, tendo danificado os discos.',
    items: [
      { id: 'os-it-1', type: 'part', itemId: 'prt-1', name: 'Pastilha de Freio Dianteira', quantity: 1, unitPrice: 180.00, totalPrice: 180.00, status: 'completed', source: 'budget' },
      { id: 'os-it-2', type: 'part', itemId: 'prt-5', name: 'Disco de Freio Dianteiro (Par)', quantity: 1, unitPrice: 290.00, totalPrice: 290.00, status: 'completed', source: 'budget' },
      { id: 'os-it-3', type: 'service', itemId: 'srv-2', name: 'Substituição de Pastilhas e Discos de Freio', quantity: 1, unitPrice: 180.00, totalPrice: 180.00, status: 'completed', source: 'budget' }
    ],
    notes: 'Serviço executado com sucesso e freios testados na pista.'
  },
  {
    id: 'os-2',
    budgetId: 'orc-2',
    clientId: 'cli-2',
    vehicleId: 'veh-2',
    mechanicId: 'usr-3',
    companyId: 'comp-1',
    createdAt: '2026-07-11T08:30:00Z',
    startedAt: '2026-07-11T09:00:00Z',
    status: 'executing',
    paymentStatus: 'pending',
    workshopStatus: 'green',
    workshopStatusUpdatedAt: new Date().toISOString().split('T')[0],
    technicalRecommendations: '',
    items: [
      { id: 'os-it-4', type: 'part', itemId: 'prt-2', name: 'Filtro de Óleo Lubrificante', quantity: 1, unitPrice: 45.00, totalPrice: 45.00, status: 'completed', source: 'budget' },
      { id: 'os-it-5', type: 'part', itemId: 'prt-3', name: 'Óleo Motor Sintético 5W30 (1L)', quantity: 4, unitPrice: 65.00, totalPrice: 260.00, status: 'completed', source: 'budget' },
      { id: 'os-it-6', type: 'service', itemId: 'srv-1', name: 'Troca de Óleo e Filtro', quantity: 1, unitPrice: 60.00, totalPrice: 60.00, status: 'completed', source: 'budget' },
      // RN006: Sugerido pelo mecânico durante a execução
      { id: 'os-it-7', type: 'part', itemId: 'prt-6', name: 'Filtro de Ar do Motor', quantity: 1, unitPrice: 55.00, totalPrice: 55.00, status: 'pending', source: 'mechanic_suggestion' },
      { id: 'os-it-8', type: 'service', itemId: 'srv-6', name: 'Diagnóstico Computadorizado de Injeção Eletrônica', quantity: 1, unitPrice: 150.00, totalPrice: 150.00, status: 'pending', source: 'mechanic_suggestion' }
    ],
    notes: 'Durante a troca de óleo, o mecânico identificou que o filtro de ar do motor está extremamente sujo e obstruído, o que pode estar gerando consumo excessivo de combustível. Foi sugerido o filtro novo e um escaneamento.'
  },
  {
    id: 'os-3',
    budgetId: 'orc-3',
    clientId: 'cli-3',
    vehicleId: 'veh-3',
    mechanicId: 'usr-3',
    companyId: 'comp-1',
    createdAt: '2026-07-27T10:00:00Z',
    startedAt: '2026-07-27T10:30:00Z',
    status: 'executing',
    paymentStatus: 'pending',
    workshopStatus: 'yellow',
    pauseReason: 'Falta de Peça - Aguardando entrega de Amortecedores Cofap',
    workshopStatusUpdatedAt: new Date().toISOString().split('T')[0],
    technicalRecommendations: 'Substituição de amortecedores dianteiros necessária.',
    items: [
      { id: 'os-it-9', type: 'part', itemId: 'prt-4', name: 'Amortecedor Dianteiro Cofap', quantity: 2, unitPrice: 420.00, totalPrice: 840.00, status: 'pending', source: 'budget' },
      { id: 'os-it-10', type: 'service', itemId: 'srv-3', name: 'Troca de Amortecedores e Molas Dianteiras', quantity: 1, unitPrice: 220.00, totalPrice: 220.00, status: 'pending', source: 'budget' }
    ],
    notes: 'Serviço pausado aguardando fornecedor entregar o lote de amortecedores.'
  },
  {
    id: 'os-4',
    budgetId: 'orc-4',
    clientId: 'cli-1',
    vehicleId: 'veh-1',
    mechanicId: 'usr-3',
    companyId: 'comp-1',
    createdAt: new Date().toISOString(),
    status: 'pending',
    paymentStatus: 'pending',
    workshopStatus: 'gray',
    workshopStatusUpdatedAt: new Date().toISOString().split('T')[0],
    technicalRecommendations: 'Aguardando encostar na rampa principal para diagnóstico elétrico.',
    items: [
      { id: 'os-it-11', type: 'part', itemId: 'prt-7', name: 'Bateria Moura 60Ah', quantity: 1, unitPrice: 480.00, totalPrice: 480.00, status: 'pending', source: 'budget' },
      { id: 'os-it-12', type: 'service', itemId: 'srv-6', name: 'Diagnóstico Computadorizado de Injeção Eletrônica', quantity: 1, unitPrice: 150.00, totalPrice: 150.00, status: 'pending', source: 'budget' }
    ],
    notes: 'OS recém criada no atendimento. Veículo estacionado no pátio da oficina aguardando box livre.'
  }
];

// Initial History entries (never deleted)
export const INITIAL_HISTORY: HistoryEntry[] = [
  {
    id: 'hst-1',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    type: 'system',
    title: 'Cadastro do Veículo',
    description: 'Veículo Chevrolet Onix (ABC-1234) cadastrado no sistema.',
    date: '2026-06-01T10:15:00Z',
    userId: 'usr-2',
    userName: 'Ana Lima (Atendimento)'
  },
  {
    id: 'hst-2',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    type: 'budget',
    title: 'Orçamento Criado (orc-1)',
    description: 'Orçamento gerado para troca de pastilhas e discos. Valor total: R$ 650,00.',
    date: '2026-07-05T09:00:00Z',
    userId: 'usr-2',
    userName: 'Ana Lima (Atendimento)',
    metadata: { total: 650.00 }
  },
  {
    id: 'hst-3',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    type: 'budget',
    title: 'Orçamento Aprovado',
    description: 'Orçamento orc-1 aprovado integralmente pelo cliente João Pedro.',
    date: '2026-07-05T10:25:00Z',
    userId: 'usr-2',
    userName: 'Ana Lima (Atendimento)'
  },
  {
    id: 'hst-4',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    type: 'service_order',
    title: 'Ordem de Serviço Gerada (os-1)',
    description: 'OS os-1 criada para execução imediata pelo mecânico Marcos Silveira.',
    date: '2026-07-05T10:30:00Z',
    userId: 'usr-2',
    userName: 'Ana Lima (Atendimento)'
  },
  {
    id: 'hst-5',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    type: 'service_order',
    title: 'OS os-1 Concluída',
    description: 'Serviço concluído com substituição de pastilhas e discos de freio.',
    date: '2026-07-05T15:30:00Z',
    userId: 'usr-3',
    userName: 'Marcos Silveira (Mecânico Líder)'
  },
  {
    id: 'hst-6',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    type: 'payment',
    title: 'Pagamento Confirmado',
    description: 'Recebimento de R$ 650,00 confirmado em PIX.',
    date: '2026-07-05T16:00:00Z',
    userId: 'usr-1',
    userName: 'Carlos Santos (Gerente)',
    metadata: { amount: 650.00, method: 'PIX' }
  },
  {
    id: 'hst-7',
    vehicleId: 'veh-2',
    clientId: 'cli-2',
    type: 'budget',
    title: 'Orçamento Criado (orc-2)',
    description: 'Orçamento gerado para revisão periódica e troca de amortecedores. Total original: R$ 1.425,00.',
    date: '2026-07-10T14:00:00Z',
    userId: 'usr-2',
    userName: 'Ana Lima (Atendimento)',
    metadata: { total: 1425.00 }
  },
  {
    id: 'hst-8',
    vehicleId: 'veh-2',
    clientId: 'cli-2',
    type: 'budget',
    title: 'Aprovação Parcial (RN005)',
    description: 'Cliente Maria Helena aprovou apenas a Troca de Óleo e Filtro (R$ 365,00) e rejeitou a troca de amortecedores (R$ 1.080,00). Itens rejeitados salvos para registro histórico.',
    date: '2026-07-10T17:15:00Z',
    userId: 'usr-2',
    userName: 'Ana Lima (Atendimento)'
  },
  {
    id: 'hst-9',
    vehicleId: 'veh-2',
    clientId: 'cli-2',
    type: 'service_order',
    title: 'Ordem de Serviço Gerada (os-2)',
    description: 'OS os-2 gerada a partir da aprovação parcial de orc-2. Valor inicial: R$ 365,00.',
    date: '2026-07-11T08:30:00Z',
    userId: 'usr-2',
    userName: 'Ana Lima (Atendimento)'
  }
];

// Initial Manual Test Cases
export const INITIAL_TEST_CASES: TestCase[] = [
  {
    id: 'tc-1',
    code: 'CT001',
    requirement: 'RF001 / RN001',
    title: 'Cadastrar Cliente com CPF Único',
    category: 'Funcional',
    preConditions: 'Usuário logado com permissão para acessar Clientes (Admin ou Atendente).',
    steps: [
      'Navegar até a tela "Clientes".',
      'Clicar no botão "Novo Cliente".',
      'Preencher o campo CPF com um valor que JÁ exista no sistema (ex: 123.456.789-00).',
      'Preencher os demais campos e tentar salvar.',
      'Verificar se o sistema impede e exibe a mensagem de validação "CPF já cadastrado".',
      'Preencher com um CPF válido inédito (ex: 111.222.333-44) e clicar em Salvar.'
    ],
    expectedResult: 'Sistema bloqueia a duplicação na primeira tentativa e cadastra com sucesso o cliente com o CPF único na segunda.',
    status: 'passed'
  },
  {
    id: 'tc-2',
    code: 'CT002',
    requirement: 'RF003 / RN002',
    title: 'Cadastrar Veículo com Placa Única',
    category: 'Funcional',
    preConditions: 'Usuário logado com permissão de veículos.',
    steps: [
      'Navegar até a tela "Veículos".',
      'Clicar em "Cadastrar Veículo".',
      'Inserir uma placa que já existe cadastrada no sistema (ex: ABC-1234).',
      'Preencher os outros campos e submeter.',
      'Verificar se o sistema barra exibindo erro de "Placa já cadastrada".',
      'Alterar a placa para uma nova inédita (ex: BRA-5A26) e clicar em salvar.'
    ],
    expectedResult: 'O sistema valida a placa única no cadastro de veículos, impedindo duplicidade.',
    status: 'passed'
  },
  {
    id: 'tc-3',
    code: 'CT003',
    requirement: 'RF007 / RF009 / RN005',
    title: 'Aprovação Parcial de Orçamento com Registro no Histórico',
    category: 'Fluxo Principal',
    preConditions: 'Orçamento criado em estado "Pendente" contendo múltiplos itens.',
    steps: [
      'Ir até a tela de "Orçamentos".',
      'Selecionar o Orçamento orc-3 (Pendente).',
      'Clicar em "Avaliar Orçamento".',
      'Aprovar o item "Diagnóstico de Injeção" e Recusar o item "Bateria Moura".',
      'Clicar em "Confirmar Aprovação Parcial".',
      'Ir até a tela "Ordens de Serviço" e verificar se apenas o item Aprovado foi importado para a OS.',
      'Navegar até a tela "Histórico" do veículo do cliente correspondente e checar se o item recusado aparece listado como "Item Recusado de Orçamento".'
    ],
    expectedResult: 'A OS é gerada contendo apenas itens aprovados, e os recusados constam de forma indelével no Histórico.',
    status: 'passed'
  },
  {
    id: 'tc-4',
    code: 'CT004',
    requirement: 'RN003',
    title: 'Bloquear Geração de OS sem Orçamento Aprovado',
    category: 'Regra de Negócio',
    preConditions: 'Orçamento recém-criado em estado Pendente.',
    steps: [
      'Navegar até a aba "Orçamentos".',
      'Localizar o orçamento de status "Pendente".',
      'Verificar se o botão de "Gerar Ordem de Serviço" está oculto ou desabilitado para este orçamento.',
      'Clicar em "Visualizar Detalhes" do orçamento pendente e tentar forçar a criação de OS.'
    ],
    expectedResult: 'O botão de gerar OS só fica ativo após aprovação total ou parcial do orçamento. O fluxo impede pular etapas.',
    status: 'passed'
  },
  {
    id: 'tc-5',
    code: 'CT005',
    requirement: 'RN006',
    title: 'Mecânico Sugere Novos Itens Durante Execução',
    category: 'Fluxo Principal',
    preConditions: 'Usuário logado com perfil de Mecânico. Uma OS em status "Em Execução" selecionada.',
    steps: [
      'Acessar a tela "Ordens de Serviço" como Marcos Silveira (mecanico).',
      'Visualizar a OS de placa XYZ-5678.',
      'Clicar no botão "Sugerir Peça/Serviço".',
      'Escolher "Filtro de Ar do Motor" e quantidade "1". Clicar em "Adicionar Sugestão".',
      'Verificar se a sugestão entra como status "Pendente (Sugestão Mecânico)".'
    ],
    expectedResult: 'A OS absorve a sugestão pendente do mecânico, para posterior aprovação do cliente ou atendimento.',
    status: 'passed'
  },
  {
    id: 'tc-6',
    code: 'CT006',
    requirement: 'RN007',
    title: 'Garantir Imutabilidade do Histórico do Veículo',
    category: 'Regra de Negócio',
    preConditions: 'Registros de histórico criados no sistema.',
    steps: [
      'Navegar até a tela de "Histórico".',
      'Tentar localizar qualquer botão de "Excluir", "Deletar" ou "Apagar" na listagem de eventos.',
      'Checar se o usuário Admin consegue apagar algum registro de histórico.',
      'Tentar efetuar bypass de dados simulado.'
    ],
    expectedResult: 'Não há botões ou funções de exclusão de histórico em nenhum nível de permissão. O histórico é gravado em modo somente-leitura.',
    status: 'passed'
  },
  {
    id: 'tc-7',
    code: 'CT007',
    requirement: 'RF014 / Permissões',
    title: 'Controle de Acesso por Perfil e Permissão de Usuário',
    category: 'Permissões',
    preConditions: 'Usuário cadastrado com permissões personalizadas.',
    steps: [
      'Efetuar login com o usuário "mecanico" (senha mecanico123).',
      'Verificar se as abas "Clientes", "Veículos" e "Gerenciar Usuários" estão inacessíveis ou ocultas.',
      'Fazer logout.',
      'Efetuar login com o usuário "atendente" (senha user123).',
      'Verificar se as abas "Ordens de Serviço" e "Peças/Serviços" estão inacessíveis conforme configuração de permissões.'
    ],
    expectedResult: 'O sistema restringe o acesso aos menus do menu lateral dinamicamente baseando-se nas permissões individuais de cada usuário.',
    status: 'passed'
  },
  {
    id: 'tc-8',
    code: 'CT008',
    requirement: 'Unsaved Changes / Exit Flow',
    title: 'Logout com Verificação de Alterações Pendentes',
    category: 'Funcional',
    preConditions: 'Usuário em tela de edição ou preenchimento de dados.',
    steps: [
      'Logar no sistema.',
      'Acessar "Clientes" -> "Novo Cliente".',
      'Preencher o nome "Alberto Roberto" mas NÃO clicar em salvar (deixar campos preenchidos e tela aberta).',
      'Clicar no botão "Sair" (Logout) no canto inferior esquerdo.',
      'Verificar se o modal de "Tarefa Sem Salvar" aparece.',
      'Clicar na opção "Sim, salvar e sair" e verificar se o cliente foi cadastrado e o logout efetuado.',
      'Repetir os passos, mas escolher "Não, descartar e sair" e verificar se o cliente NÃO foi criado após o logout.'
    ],
    expectedResult: 'O fluxo de logout detecta o formulário sujo, abre o modal de salvamento condicional e executa a ação correta (salvar, descartar ou cancelar).',
    status: 'passed'
  },
  {
    id: 'tc-9',
    code: 'CT009',
    requirement: 'Alterar Senha',
    title: 'Alteração de Senha no Perfil com Validação da Senha Atual',
    category: 'Funcional',
    preConditions: 'Logado no sistema com qualquer perfil.',
    steps: [
      'Ir até as configurações do perfil no cabeçalho ou menu lateral.',
      'Inserir uma senha atual INCORRETA.',
      'Definir a nova senha e clicar em "Salvar Nova Senha".',
      'Verificar se o sistema recusa e exibe erro de "Senha atual incorreta".',
      'Inserir a senha atual CORRETA, digitar a nova senha e clicar em salvar.',
      'Fazer logout e tentar logar com a nova senha.'
    ],
    expectedResult: 'A senha só é alterada se a senha atual digitada for validada com sucesso pelo sistema.',
    status: 'passed'
  }
];

export const INITIAL_ACCOUNTS_RECEIVABLE: AccountReceivable[] = [
  {
    id: 'cr-1',
    code: 'CR-2026-001',
    clientId: 'cli-1',
    clientName: 'João Pedro da Silva',
    clientCpf: '123.456.789-00',
    serviceOrderId: 'os-1',
    title: 'OS #OS-2026-001 - Revisão e Freios Civic',
    totalAmount: 1250.00,
    paidAmount: 500.00,
    remainingAmount: 750.00,
    status: 'partially_paid',
    installmentsCount: 3,
    dueDate: '2026-08-15',
    createdAt: '2026-07-05T10:30:00Z',
    installments: [
      {
        id: 'parc-1-1',
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 500.00,
        paidAmount: 500.00,
        dueDate: '2026-07-05',
        status: 'paid',
        paymentDate: '2026-07-05T11:00:00Z',
        paymentMethod: 'PIX',
        receiptNotes: 'Entrada via PIX na abertura da OS'
      },
      {
        id: 'parc-1-2',
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 375.00,
        paidAmount: 0,
        dueDate: '2026-08-05',
        status: 'pending'
      },
      {
        id: 'parc-1-3',
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 375.00,
        paidAmount: 0,
        dueDate: '2026-09-05',
        status: 'pending'
      }
    ]
  },
  {
    id: 'cr-2',
    code: 'CR-2026-002',
    clientId: 'cli-3',
    clientName: 'Carlos Eduardo Santos',
    clientCpf: '456.789.123-22',
    serviceOrderId: 'os-3',
    title: 'OS #OS-2026-003 - Retífica e Suspensão Hilux',
    totalAmount: 2450.00,
    paidAmount: 0,
    remainingAmount: 2450.00,
    status: 'blocked_credit_limit',
    installmentsCount: 2,
    dueDate: '2026-07-30',
    createdAt: '2026-07-20T14:00:00Z',
    creditLimitExceeded: true,
    creditLimitAttempted: 2450.00,
    installments: [
      {
        id: 'parc-2-1',
        installmentNumber: 1,
        totalInstallments: 2,
        amount: 1225.00,
        paidAmount: 0,
        dueDate: '2026-07-30',
        status: 'pending'
      },
      {
        id: 'parc-2-2',
        installmentNumber: 2,
        totalInstallments: 2,
        amount: 1225.00,
        paidAmount: 0,
        dueDate: '2026-08-30',
        status: 'pending'
      }
    ],
    notes: 'Atenção: Limite do cliente (R$ 2.000,00) excedido em R$ 450,00. Aguardando liberação do gerente.'
  }
];

export const INITIAL_ACCOUNTS_PAYABLE: AccountPayable[] = [
  {
    id: 'cp-1',
    code: 'CP-2026-001',
    supplierId: 'sup-1',
    supplierName: 'AutoPeças Distribuidora Brasil Ltda',
    quotationId: 'cot-1',
    description: 'Lote de Amortecedores e Filtros de Óleo (Cotação #COT-2026-001)',
    category: 'Peças / Fornecedores',
    totalAmount: 1850.00,
    paidAmount: 1850.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-07-15',
    createdAt: '2026-06-25T09:00:00Z',
    installments: [
      {
        id: 'parc-p1-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 1850.00,
        paidAmount: 1850.00,
        dueDate: '2026-07-15',
        status: 'paid',
        paymentDate: '2026-07-15T14:20:00Z',
        paymentMethod: 'Transferência / PIX'
      }
    ]
  },
  {
    id: 'cp-2',
    code: 'CP-2026-002',
    supplierId: 'sup-2',
    supplierName: 'EletroAuto Soluções Elétricas',
    description: 'Baterias Moura 60Ah e Cabos de Velas',
    category: 'Peças / Fornecedores',
    totalAmount: 920.00,
    paidAmount: 460.00,
    remainingAmount: 460.00,
    status: 'partially_paid',
    dueDate: '2026-08-10',
    createdAt: '2026-07-10T11:00:00Z',
    installments: [
      {
        id: 'parc-p2-1',
        installmentNumber: 1,
        totalInstallments: 2,
        amount: 460.00,
        paidAmount: 460.00,
        dueDate: '2026-07-10',
        status: 'paid',
        paymentDate: '2026-07-10T11:30:00Z',
        paymentMethod: 'Cartão de Crédito'
      },
      {
        id: 'parc-p2-2',
        installmentNumber: 2,
        totalInstallments: 2,
        amount: 460.00,
        paidAmount: 0,
        dueDate: '2026-08-10',
        status: 'pending'
      }
    ]
  }
];

export const INITIAL_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 'ft-1',
    type: 'income',
    category: 'Ordem de Serviço',
    description: 'Pagamento 1/3 OS #OS-2026-001 - João Pedro da Silva',
    amount: 500.00,
    date: '2026-07-05T11:00:00Z',
    paymentMethod: 'PIX',
    referenceId: 'cr-1',
    clientId: 'cli-1',
    createdByName: 'Ana Lima (Atendimento)'
  },
  {
    id: 'ft-2',
    type: 'expense',
    category: 'Peças / Fornecedores',
    description: 'Quitação Lote Amortecedores - AutoPeças Brasil',
    amount: 1850.00,
    date: '2026-07-15T14:20:00Z',
    paymentMethod: 'PIX',
    referenceId: 'cp-1',
    supplierId: 'sup-1',
    createdByName: 'Carlos Santos (Gerente)'
  },
  {
    id: 'ft-3',
    type: 'expense',
    category: 'Peças / Fornecedores',
    description: 'Entrada 1/2 Baterias Moura - EletroAuto',
    amount: 460.00,
    date: '2026-07-10T11:30:00Z',
    paymentMethod: 'Cartão de Crédito',
    referenceId: 'cp-2',
    supplierId: 'sup-2',
    createdByName: 'Carlos Santos (Gerente)'
  }
];

// Complete Database load/save management
export interface AppDatabase {
  landingContent?: any;
  globalModules?: { [key: string]: boolean };
  loginHistory?: { username: string; name: string; role: string; lastAccess: string }[];
  levelPermissions?: any;
  companyInfo?: CompanyInfo;
  registeredCompanies?: CompanyInfo[];
  users: User[];
  clients: Client[];
  vehicles: Vehicle[];
  parts: Part[];
  stockMovements?: StockMovement[];
  services: Service[];
  budgets: Budget[];
  serviceOrders: ServiceOrder[];
  history: HistoryEntry[];
  testCases: TestCase[];
  notifications?: SystemNotification[];
  alertSettings?: AlertSettings;
  suppliers?: Supplier[];
  supplierPartPrices?: SupplierPartPrice[];
  quotations?: Quotation[];
  accountsReceivable?: AccountReceivable[];
  accountsPayable?: AccountPayable[];
  financialTransactions?: FinancialTransaction[];
  maintenanceLogs?: MaintenanceLog[];
  paymentMethods?: PaymentMethodOption[];
  fiscalDocuments?: FiscalDocument[];
  boletos?: BoletoDocument[];
  interBranchSales?: InterBranchSaleLogistics[];
  sefazConfig?: SefazApiConfig;
  taxOperationNatures?: TaxOperationNature[];
  taxRules?: TaxRule[];
  xmlImportRecords?: XmlImportRecord[];
}

export const STORAGE_KEY = 'motordesk_db_v1';

export function getDatabase(): AppDatabase {
  let db: AppDatabase;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    db = {
      companyInfo: INITIAL_COMPANY_INFO,
      registeredCompanies: INITIAL_COMPANIES,
      users: INITIAL_USERS,
      clients: INITIAL_CLIENTS,
      vehicles: INITIAL_VEHICLES,
      parts: INITIAL_PARTS,
      stockMovements: INITIAL_STOCK_MOVEMENTS,
      services: INITIAL_SERVICES,
      budgets: INITIAL_BUDGETS,
      serviceOrders: INITIAL_SERVICE_ORDERS,
      history: INITIAL_HISTORY,
      testCases: INITIAL_TEST_CASES,
      notifications: INITIAL_NOTIFICATIONS,
      alertSettings: INITIAL_ALERT_SETTINGS,
      suppliers: INITIAL_SUPPLIERS,
      supplierPartPrices: INITIAL_SUPPLIER_PART_PRICES,
      quotations: INITIAL_QUOTATIONS,
      accountsReceivable: INITIAL_ACCOUNTS_RECEIVABLE,
      accountsPayable: INITIAL_ACCOUNTS_PAYABLE,
      financialTransactions: INITIAL_FINANCIAL_TRANSACTIONS,
      paymentMethods: INITIAL_PAYMENT_METHODS,
      fiscalDocuments: INITIAL_FISCAL_DOCUMENTS,
      boletos: INITIAL_BOLETOS,
      interBranchSales: INITIAL_INTER_BRANCH_SALES,
      sefazConfig: INITIAL_SEFAZ_CONFIG,
      taxOperationNatures: INITIAL_TAX_OPERATION_NATURES,
      taxRules: INITIAL_TAX_RULES,
      xmlImportRecords: INITIAL_XML_IMPORT_RECORDS,
    };
    saveDatabase(db);
  } else {
    try {
      db = JSON.parse(raw);
      if (!db.companyInfo) {
        db.companyInfo = INITIAL_COMPANY_INFO;
      }
      if (!db.registeredCompanies) {
        db.registeredCompanies = INITIAL_COMPANIES;
      }
      if (!db.stockMovements) {
        db.stockMovements = INITIAL_STOCK_MOVEMENTS;
      }
      if (!db.notifications) {
        db.notifications = INITIAL_NOTIFICATIONS;
      }
      if (!db.alertSettings) {
        db.alertSettings = INITIAL_ALERT_SETTINGS;
      }
      if (!db.suppliers) {
        db.suppliers = INITIAL_SUPPLIERS;
      }
      if (!db.supplierPartPrices) {
        db.supplierPartPrices = INITIAL_SUPPLIER_PART_PRICES;
      }
      if (!db.quotations) {
        db.quotations = INITIAL_QUOTATIONS;
      }
      if (!db.accountsReceivable) {
        db.accountsReceivable = INITIAL_ACCOUNTS_RECEIVABLE;
      }
      if (!db.accountsPayable) {
        db.accountsPayable = INITIAL_ACCOUNTS_PAYABLE;
      }
      if (!db.financialTransactions) {
        db.financialTransactions = INITIAL_FINANCIAL_TRANSACTIONS;
      }
      if (!db.maintenanceLogs) {
        db.maintenanceLogs = INITIAL_MAINTENANCE_LOGS;
      }
      if (!db.paymentMethods) {
        db.paymentMethods = INITIAL_PAYMENT_METHODS;
      }
      if (!db.fiscalDocuments) {
        db.fiscalDocuments = INITIAL_FISCAL_DOCUMENTS;
      }
      if (!db.boletos) {
        db.boletos = INITIAL_BOLETOS;
      }
      if (!db.interBranchSales) {
        db.interBranchSales = INITIAL_INTER_BRANCH_SALES;
      }
      if (!db.sefazConfig) {
        db.sefazConfig = INITIAL_SEFAZ_CONFIG;
      }
      if (!db.taxOperationNatures) {
        db.taxOperationNatures = INITIAL_TAX_OPERATION_NATURES;
      }
      if (!db.taxRules) {
        db.taxRules = INITIAL_TAX_RULES;
      }
      if (!db.xmlImportRecords) {
        db.xmlImportRecords = INITIAL_XML_IMPORT_RECORDS;
      }
    } catch (e) {
      console.error("Error reading database, resetting...", e);
      db = {
        companyInfo: INITIAL_COMPANY_INFO,
        registeredCompanies: INITIAL_COMPANIES,
        users: INITIAL_USERS,
        clients: INITIAL_CLIENTS,
        vehicles: INITIAL_VEHICLES,
        parts: INITIAL_PARTS,
        stockMovements: INITIAL_STOCK_MOVEMENTS,
        services: INITIAL_SERVICES,
        budgets: INITIAL_BUDGETS,
        serviceOrders: INITIAL_SERVICE_ORDERS,
        history: INITIAL_HISTORY,
        testCases: INITIAL_TEST_CASES,
        notifications: INITIAL_NOTIFICATIONS,
        alertSettings: INITIAL_ALERT_SETTINGS,
        suppliers: INITIAL_SUPPLIERS,
        supplierPartPrices: INITIAL_SUPPLIER_PART_PRICES,
        quotations: INITIAL_QUOTATIONS,
        accountsReceivable: INITIAL_ACCOUNTS_RECEIVABLE,
        accountsPayable: INITIAL_ACCOUNTS_PAYABLE,
        financialTransactions: INITIAL_FINANCIAL_TRANSACTIONS,
        paymentMethods: INITIAL_PAYMENT_METHODS,
        maintenanceLogs: INITIAL_MAINTENANCE_LOGS,
        fiscalDocuments: INITIAL_FISCAL_DOCUMENTS,
        boletos: INITIAL_BOLETOS,
        interBranchSales: INITIAL_INTER_BRANCH_SALES,
        sefazConfig: INITIAL_SEFAZ_CONFIG,
        taxOperationNatures: INITIAL_TAX_OPERATION_NATURES,
        taxRules: INITIAL_TAX_RULES,
        xmlImportRecords: INITIAL_XML_IMPORT_RECORDS,
      };
      saveDatabase(db);
    }
  }

  if (db.users) {
    db.users = db.users.map(u => ({
      ...u,
      permissions: {
        accessFiscal: u.role !== 'mecanico',
        ...u.permissions
      }
    }));
  }

  // Ensure stored level permissions provide defaults without overwriting user explicit permissions
  const savedLevelPerms = localStorage.getItem('motordesk_level_permissions');
  if (savedLevelPerms && db.users) {
    try {
      const levelMap = JSON.parse(savedLevelPerms);
      db.users = db.users.map(u => {
        if (levelMap[u.role]) {
          return {
            ...u,
            permissions: {
              ...levelMap[u.role],
              ...u.permissions
            }
          };
        }
        return u;
      });
    } catch (e) {
      console.error("Failed to load level permissions into users database", e);
    }
  }

  return db;
}

import { dataProvider } from '../services/dataProvider';

export function saveDatabase(db: AppDatabase): void {
  dataProvider.saveDatabase(db).catch((err) => {
    console.error("Cloud SQL PostgreSQL save failure:", err);
  });
}

export async function getDatabaseAsync(): Promise<AppDatabase> {
  return await dataProvider.getDatabase();
}

export function resetDatabase(): AppDatabase {
  localStorage.removeItem(STORAGE_KEY);
  const db = getDatabase();
  saveDatabase(db);
  return db;
}
