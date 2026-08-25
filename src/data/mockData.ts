/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Client, Vehicle, Part, Service, Budget, ServiceOrder, HistoryEntry, TestCase, StockMovement, CompanyInfo, SystemNotification, AlertSettings, Supplier, SupplierPartPrice, Quotation, AccountReceivable, AccountPayable, FinancialTransaction, MaintenanceLog, PaymentMethodOption, FiscalDocument, BoletoDocument, InterBranchSaleLogistics, SefazApiConfig, TaxOperationNature, TaxRule, XmlImportRecord, CommercialSale, Carrier, GoodsWithdrawalOrder, WithdrawalType, WithdrawalStatus, getDefaultModulesForBusinessType, UnitOfMeasure } from '../types';

export const INITIAL_UNITS_OF_MEASURE: UnitOfMeasure[] = [
  { id: 'uom-un', name: 'Unidade', acronym: 'UN', category: 'QUANTIDADE', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 0, active: true, isGlobal: true, notes: 'Contagem unitária inteira padrão' },
  { id: 'uom-pc', name: 'Peça', acronym: 'PC', category: 'QUANTIDADE', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 0, active: true, isGlobal: true, notes: 'Peça ou componente individual' },
  { id: 'uom-cx', name: 'Caixa', acronym: 'CX', category: 'QUANTIDADE', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 0, active: true, isGlobal: true, notes: 'Embalagem ou caixa fechada' },
  { id: 'uom-jg', name: 'Jogo', acronym: 'JG', category: 'QUANTIDADE', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 0, active: true, isGlobal: true, notes: 'Jogo ou conjunto de peças' },
  { id: 'uom-kit', name: 'Kit', acronym: 'KIT', category: 'QUANTIDADE', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 0, active: true, isGlobal: true, notes: 'Kit composto' },
  { id: 'uom-par', name: 'Par', acronym: 'PAR', category: 'QUANTIDADE', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 0, active: true, isGlobal: true, notes: 'Par de itens' },
  { id: 'uom-kg', name: 'Quilograma', acronym: 'KG', category: 'MASSA', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Peso em quilos' },
  { id: 'uom-g', name: 'Grama', acronym: 'G', category: 'MASSA', calculationType: 'SIMPLES', conversionFactor: 0.001, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Peso em gramas' },
  { id: 'uom-ton', name: 'Tonelada', acronym: 'T', category: 'MASSA', calculationType: 'SIMPLES', conversionFactor: 1000, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Peso em toneladas' },
  { id: 'uom-l', name: 'Litro', acronym: 'L', category: 'VOLUME', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Volume líquido em litros' },
  { id: 'uom-ml', name: 'Mililitro', acronym: 'ML', category: 'VOLUME', calculationType: 'SIMPLES', conversionFactor: 0.001, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Volume líquido fracionado' },
  { id: 'uom-m', name: 'Metro Linear', acronym: 'M', category: 'COMPRIMENTO', calculationType: 'LINEAR', conversionFactor: 1, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Cálculo por comprimento linear' },
  { id: 'uom-cm', name: 'Centímetro Linear', acronym: 'CM', category: 'COMPRIMENTO', calculationType: 'LINEAR', conversionFactor: 0.01, decimalPlaces: 2, active: true, isGlobal: true, notes: 'Cálculo por comprimento em centímetros' },
  { id: 'uom-mm', name: 'Milímetro Linear', acronym: 'MM', category: 'COMPRIMENTO', calculationType: 'LINEAR', conversionFactor: 0.001, decimalPlaces: 1, active: true, isGlobal: true, notes: 'Cálculo por comprimento em milímetros' },
  { id: 'uom-m2', name: 'Metro Quadrado', acronym: 'M²', category: 'AREA', calculationType: 'AREA', conversionFactor: 1, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Cálculo por área (Comprimento × Largura)' },
  { id: 'uom-cm2', name: 'Centímetro Quadrado', acronym: 'CM²', category: 'AREA', calculationType: 'AREA', conversionFactor: 0.0001, decimalPlaces: 2, active: true, isGlobal: true, notes: 'Cálculo por área em cm²' },
  { id: 'uom-m3', name: 'Metro Cúbico', acronym: 'M³', category: 'VOLUME', calculationType: 'VOLUME', conversionFactor: 1, decimalPlaces: 3, active: true, isGlobal: true, notes: 'Cálculo por volume (Comprimento × Largura × Altura)' },
  { id: 'uom-cm3', name: 'Centímetro Cúbico', acronym: 'CM³', category: 'VOLUME', calculationType: 'VOLUME', conversionFactor: 0.000001, decimalPlaces: 2, active: true, isGlobal: true, notes: 'Cálculo por volume em cm³' },
  { id: 'uom-h', name: 'Hora', acronym: 'H', category: 'TEMPO', calculationType: 'SIMPLES', conversionFactor: 1, decimalPlaces: 2, active: true, isGlobal: true, notes: 'Tempo em horas de serviço' },
  { id: 'uom-min', name: 'Minuto', acronym: 'MIN', category: 'TEMPO', calculationType: 'SIMPLES', conversionFactor: 0.01666, decimalPlaces: 0, active: true, isGlobal: true, notes: 'Tempo em minutos' }
];

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
  businessType: 'OFICINA',
  modules: getDefaultModulesForBusinessType('OFICINA'),
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
    businessType: 'OFICINA',
    modules: getDefaultModulesForBusinessType('OFICINA'),
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
    businessType: 'OFICINA',
    modules: getDefaultModulesForBusinessType('OFICINA'),
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
  },
  {
    id: 'comp-4',
    name: 'MotorDesk Auto Peças & Distribuidora - Comércio SP',
    cnpj: '77.888.999/0001-22',
    companyType: 'matriz',
    businessType: 'COMERCIO',
    modules: getDefaultModulesForBusinessType('COMERCIO'),
    phone: '(11) 3888-9900',
    whatsapp: '11988887777',
    email: 'vendas@motordeskpecas.com.br',
    address: 'Rua Duque de Caxias, 450 - Centro, São Paulo - SP',
    welcomeMessage: 'MotorDesk Auto Peças - Vendas diretas de balcão e peças para todo o Brasil.',
    registeredAt: '2026-04-10T11:00:00Z',
    subscriptionStatus: 'active',
    startDate: '2026-04-10',
    expirationDate: '2026-12-31',
    monthlyFee: 299.90,
    paymentStatus: 'paid',
    lastPaymentDate: '2026-07-10',
    legalRepresentativeName: 'Fernanda Lima Alencar',
    legalRepresentativeCpf: '321.654.987-22',
    contractStatus: 'signed',
    notes: 'Empresa do segmento Comércio de Peças (Vendas Diretas / Balcão, Estoque e NF-e).'
  }
];

// Initial Users
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-validador',
    username: 'validador',
    name: 'Validador QA & Admin',
    role: 'admin',
    passwordHash: 'Donatelo@123',
    companyId: 'comp-1',
    permissions: {
      accessDashboard: true,
      accessSales: true,
      accessWithdrawals: true,
      accessCarriers: true,
      accessUnitsOfMeasure: true,
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
  },
  {
    id: 'usr-1',
    username: 'admin',
    name: 'Carlos Santos (Gerente)',
    role: 'admin',
    passwordHash: 'Donatelo@123',
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
  },
  {
    id: 'tc-10',
    code: 'CT010',
    requirement: 'RN-RES-01',
    title: 'Configurar Modo de Reserva de Estoque por Empresa',
    category: 'Regra de Negócio',
    preConditions: 'Usuário Admin logado na tela de Gestão de Empresas / Configurações.',
    steps: [
      'Acessar "Usuários e Empresas" -> "Parâmetros da Empresa".',
      'Localizar o bloco "Política de Reserva de Estoque em Orçamentos".',
      'Alternar entre os modos: Não Reservar (none), Sempre Reservar (always) e Perguntar (prompt).',
      'Definir o prazo padrão de validade da reserva em dias (ex: 5 dias).',
      'Salvar as configurações e verificar a persistência no perfil da empresa ativa.'
    ],
    expectedResult: 'Os parâmetros são salvos com sucesso respeitando o isolamento por companyId.',
    status: 'passed'
  },
  {
    id: 'tc-11',
    code: 'CT011',
    requirement: 'RF-ORC-01',
    title: 'Criar Orçamento no Segmento Comércio (Sem Veículo)',
    category: 'Funcional',
    preConditions: 'Empresa selecionada do segmento COMERCIO.',
    steps: [
      'Navegar até a tela "Orçamentos".',
      'Clicar em "Novo Orçamento".',
      'Verificar que o seletor de segmento vem predefinido como "Comércio" e o campo de veículo não é obrigatório.',
      'Selecionar um cliente e adicionar itens de produtos/peças.',
      'Salvar o orçamento.'
    ],
    expectedResult: 'Orçamento comercial de balcão criado com sucesso sem necessidade de vincular placa/veículo.',
    status: 'passed'
  },
  {
    id: 'tc-12',
    code: 'CT012',
    requirement: 'RF-ORC-02',
    title: 'Criar Orçamento no Segmento Oficina (Com Veículo)',
    category: 'Funcional',
    preConditions: 'Empresa selecionada do segmento OFICINA.',
    steps: [
      'Navegar até "Orçamentos" -> "Novo Orçamento".',
      'Selecionar o cliente e o veículo da frota.',
      'Adicionar peças e serviços com prazo de validade.',
      'Salvar o orçamento.'
    ],
    expectedResult: 'Orçamento de oficina salvo com vinculação integral ao veículo e histórico.',
    status: 'passed'
  },
  {
    id: 'tc-13',
    code: 'CT013',
    requirement: 'RF-ORC-03',
    title: 'Criar Orçamento Híbrido (Peças + Serviços)',
    category: 'Funcional',
    preConditions: 'Empresa selecionada do segmento HÍBRIDO (OFICINA + COMÉRCIO).',
    steps: [
      'Abrir o formulário de orçamento.',
      'Adicionar produtos do catálogo e serviços de mão de obra.',
      'Verificar o cálculo de subtotais de peças e de serviços em separado.',
      'Salvar o orçamento.'
    ],
    expectedResult: 'Orçamento híbrido criado com discriminação clara de peças e serviços.',
    status: 'passed'
  },
  {
    id: 'tc-14',
    code: 'CT014',
    requirement: 'RN-RES-02',
    title: 'Reserva de Estoque em Orçamento e Bloqueio de Baixa Física',
    category: 'Regra de Negócio',
    preConditions: 'Empresa configurada com modo de reserva "always" ou "prompt" (com confirmação).',
    steps: [
      'Criar orçamento para a peça "Óleo 5W30" com 3 unidades.',
      'Confirmar a reserva de estoque.',
      'Verificar que o saldo total físico do produto NÃO foi decrementado.',
      'Verificar que o saldo reservado aumentou em 3 unidades e o saldo disponível reduziu correspondente.',
      'Consultar a tela de Peças e confirmar o badge de reserva ativa.'
    ],
    expectedResult: 'O saldo físico permanece intacto, mas o saldo disponível é reduzido para evitar sobrevendagem.',
    status: 'passed'
  },
  {
    id: 'tc-15',
    code: 'CT015',
    requirement: 'RN-RES-03',
    title: 'Expiração Automática da Reserva e Liberação de Saldo',
    category: 'Regra de Negócio',
    preConditions: 'Orçamento pendente com data de validade/reserva ultrapassada.',
    steps: [
      'Executar a rotina de varredura ou carregar a listagem de orçamentos.',
      'O sistema identifica que a data limite da reserva expirou.',
      'O status da reserva é alterado para EXPIRED.',
      'O saldo reservado é imediatamente devolvido ao saldo disponível da peça.'
    ],
    expectedResult: 'A reserva expirada é liberada automaticamente sem afetar o estoque físico.',
    status: 'passed'
  },
  {
    id: 'tc-16',
    code: 'CT016',
    requirement: 'RF-CONV-01',
    title: 'Converter Orçamento Comercial em Venda Balcão',
    category: 'Fluxo Principal',
    preConditions: 'Orçamento comercial aprovado com reserva de peças ativa.',
    steps: [
      'Localizar o orçamento aprovado na lista.',
      'Clicar na ação "Converter em Venda".',
      'Confirmar a conversão.',
      'Verificar que a Venda Comercial foi gerada na aba "Vendas".',
      'Verificar que a reserva do orçamento foi TRANSFERIDA para a venda sem duplicidade.',
      'Verificar o status do orçamento como "Convertido" e com link para a venda.'
    ],
    expectedResult: 'Venda criada com sucesso e reserva transferida de forma atômica.',
    status: 'passed'
  },
  {
    id: 'tc-17',
    code: 'CT017',
    requirement: 'RF-CONV-02',
    title: 'Converter Orçamento de Oficina em Ordem de Serviço (OS)',
    category: 'Fluxo Principal',
    preConditions: 'Orçamento de oficina aprovado.',
    steps: [
      'Localizar o orçamento de oficina aprovado.',
      'Clicar em "Converter em OS".',
      'Confirmar a criação da Ordem de Serviço.',
      'Verificar que a OS foi aberta na tela "Ordens de Serviço" com as peças e serviços correspondentes.',
      'Verificar a rastreabilidade do budgetId na nova OS.'
    ],
    expectedResult: 'Ordem de Serviço gerada com sucesso vinculada ao orçamento original.',
    status: 'passed'
  },
  {
    id: 'tc-18',
    code: 'CT018',
    requirement: 'RN-CONV-03',
    title: 'Proteção contra Dupla Conversão e Idempotência',
    category: 'Regra de Negócio',
    preConditions: 'Orçamento já convertido em Venda ou OS.',
    steps: [
      'Tentar acionar novamente o botão de conversão no orçamento já convertido.',
      'Verificar que os botões de conversão ficam desabilitados ou exibem mensagem de já convertido.',
      'Simular duplo clique rápido no momento da conversão.'
    ],
    expectedResult: 'O sistema bloqueia e impede a geração de vendas ou OSs duplicadas para o mesmo orçamento.',
    status: 'passed'
  },
  {
    id: 'tc-19',
    code: 'CT019',
    requirement: 'RF-LOG-01',
    title: 'Venda com Fluxo de Separação, Picking e Retirada no Balcão',
    category: 'Logística',
    preConditions: 'Empresa com enableWithdrawalAndDelivery habilitado.',
    steps: [
      'Realizar uma venda com tipo de atendimento "Retirar no Balcão (Aguardando Separação)".',
      'Verificar a criação automática do pedido de retirada na fila de expedição com status AGUARDANDO_SEPARACAO.',
      'Acessar a fila de expedição, iniciar a separação e gerar o Romaneio de Separação / Picking com localização física.',
      'Concluir a separação (status PRONTO_RETIRADA) e realizar a liberação ao cliente.',
      'Confirmar a baixa física de estoque executada no momento da entrega final.'
    ],
    expectedResult: 'Fluxo completo de separação e entrega executado com rastreabilidade total de operador, horário e baixa física.',
    status: 'passed'
  },
  {
    id: 'tc-20',
    code: 'CT020',
    requirement: 'RF-LOG-02',
    title: 'Venda com Retirada Imediata Parcial e Entrega Residual com Romaneio',
    category: 'Logística',
    preConditions: 'Cliente comprando múltiplos itens com necessidade de levar parte no ato e receber o restante via transportadora.',
    steps: [
      'Na tela de Vendas Balcão, selecionar a modalidade "Retirar Parte Agora e Enviar Restante por Transportadora".',
      'Definir as quantidades de retirada imediata e as quantidades para envio residual.',
      'Selecionar a transportadora e endereço de entrega residual.',
      'Finalizar a venda.',
      'Verificar a emissão do Romaneio de Entrega Residual e a inserção na esteira de despacho.'
    ],
    expectedResult: 'Pedido segregado corretamente entre baixa imediata e pedido residual de transporte com romaneio.',
    status: 'passed'
  },
  {
    id: 'tc-21',
    code: 'CT021',
    requirement: 'RF-FISC-01',
    title: 'Conferência Fiscal Pré-Emissão com Validação Tributária Rigorosa',
    category: 'Fiscal',
    preConditions: 'Venda ou Ordem de Serviço pronta para faturamento.',
    steps: [
      'Abrir o Modal de Conferência Fiscal Prévia antes de transmitir para a SEFAZ.',
      'Verificar a checagem automática de CFOP, NCM, Alíquotas de ICMS/PIS/COFINS, CPF/CNPJ e Inscrição Estadual.',
      'Simular um produto com NCM inválido e verificar o bloqueio com exibição do alerta de pendência fiscal.',
      'Corrigir os dados e prosseguir com a transmissão segura.'
    ],
    expectedResult: 'A conferência fiscal detecta divergências antes do envio, prevenindo rejeições na SEFAZ e retrabalho.',
    status: 'passed'
  },
  {
    id: 'tc-22',
    code: 'CT022',
    requirement: 'RN-LOG-03',
    title: 'Bloqueio de Entrega Física quando Exigido Documento Fiscal Autorizado',
    category: 'Regra de Negócio',
    preConditions: 'Empresa configurada com requireAuthorizedFiscalBeforeRelease = true.',
    steps: [
      'Acessar um pedido de retirada pronto com status PRONTO_RETIRADA onde a NF-e/NFC-e ainda não foi emitida.',
      'Tentar efetuar a liberação ao cliente.',
      'Verificar o travamento de segurança exigindo que o documento fiscal seja emitido e autorizado pela SEFAZ.',
      'Emitir a nota fiscal e verificar a liberação do botão de entrega.'
    ],
    expectedResult: 'Mercadoria bloqueada para saída física enquanto não houver nota fiscal autorizada.',
    status: 'passed'
  },
  {
    id: 'tc-23',
    code: 'CT023',
    requirement: 'RF-MULTI-01',
    title: 'Venda Multiloja de Produto Pertencente a Outra Filial',
    category: 'Multiloja',
    preConditions: 'Empresa com enableInterStoreSales = true e múltiplas lojas cadastradas na rede.',
    steps: [
      'Operador da Loja Matriz pesquisa produto sem estoque local, mas disponível na Loja Filial Sul.',
      'Selecionar a opção de venda cruzada inter-lojas.',
      'Definir a loja de origem do estoque (Filial Sul) e a loja vendedora (Matriz).',
      'Finalizar a venda e verificar o registro do pedido logístico de transferência e baixa na loja correta.'
    ],
    expectedResult: 'Venda efetuada com sucesso com registro contábil e logístico entre as filiais da rede.',
    status: 'passed'
  },
  {
    id: 'tc-24',
    code: 'CT024',
    requirement: 'RN-MULTI-02',
    title: 'Controle de Local de Pagamento e Retirada na Operação Multiloja',
    category: 'Regra de Negócio',
    preConditions: 'Empresa configurada com interStorePaymentMode = "PURCHASE_STORE_ONLY".',
    steps: [
      'Realizar venda de produto de outra filial.',
      'Verificar que a opção de pagamento na loja de estoque fica bloqueada, exigindo quitação na loja vendedora.',
      'Verificar se o cliente pode optar entre retirada na loja detentora ou aguardar transferência interna.'
    ],
    expectedResult: 'As regras de negócio configuradas para multiloja são aplicadas estritamente nas opções da venda.',
    status: 'passed'
  },
  {
    id: 'tc-25',
    code: 'CT025',
    requirement: 'RN-SEC-01',
    title: 'Isolamento Estrito de Configurações e Dados por companyId',
    category: 'Segurança & Arquitetura',
    preConditions: 'Duas empresas distintas cadastradas no sistema (Empresa A e Empresa B).',
    steps: [
      'Configurar Empresa A com modo de reserva "reserve_while_valid" e 15 dias de validade.',
      'Configurar Empresa B com modo de reserva "none" e entrega desabilitada.',
      'Alternar a empresa ativa para a Empresa B e verificar que NENHUM parâmetro da Empresa A vazou.',
      'Consultar o estoque e orçamentos da Empresa B e verificar o isolamento completo dos registros.'
    ],
    expectedResult: 'Isolamento absoluto multi-tenant garantido sem compartilhamento indevido entre empresas distintas.',
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

export const INITIAL_SALES: CommercialSale[] = [
  {
    id: 'sale-1',
    code: 'VEN-2026-0001',
    clientId: 'cli-1',
    clientName: 'João Silva',
    clientCpfCnpj: '123.456.789-00',
    companyId: 'comp-1',
    createdAt: '2026-08-10T14:30:00Z',
    items: [
      {
        id: 'sitem-1',
        partId: 'part-1',
        partName: 'Óleo Motor 5W30 Sintético',
        partCode: 'MOB-5W30',
        quantity: 4,
        unitPrice: 45.00,
        discount: 0,
        totalPrice: 180.00,
        unit: 'L',
        ncm: '2710.19.32'
      },
      {
        id: 'sitem-2',
        partId: 'part-2',
        partName: 'Filtro de Óleo Lubrificante',
        partCode: 'FIL-1023',
        quantity: 1,
        unitPrice: 35.00,
        discount: 5.00,
        totalPrice: 30.00,
        unit: 'UN',
        ncm: '8421.23.00'
      }
    ],
    subtotal: 215.00,
    discount: 5.00,
    totalAmount: 210.00,
    paymentMethod: 'PIX',
    paymentStatus: 'paid',
    notes: 'Venda direta de balcão. Cliente retirou produtos na loja.',
    createdBy: 'Carlos Santos (Atendente)'
  },
  {
    id: 'sale-2',
    code: 'VEN-2026-0002',
    clientId: 'cli-2',
    clientName: 'Maria Oliveira',
    clientCpfCnpj: '987.654.321-11',
    companyId: 'comp-1',
    createdAt: '2026-08-12T10:15:00Z',
    items: [
      {
        id: 'sitem-3',
        partId: 'part-3',
        partName: 'Jogo de Pastilhas de Freio Dianteira',
        partCode: 'PST-9042',
        quantity: 1,
        unitPrice: 160.00,
        discount: 10.00,
        totalPrice: 150.00,
        unit: 'JG',
        ncm: '8708.30.90'
      }
    ],
    subtotal: 160.00,
    discount: 10.00,
    totalAmount: 150.00,
    paymentMethod: 'Cartão de Crédito',
    paymentStatus: 'paid',
    notes: 'Venda com desconto de fidelidade.',
    createdBy: 'Carlos Santos (Atendente)'
  }
];

export const INITIAL_CARRIERS: Carrier[] = [
  {
    id: 'car-1',
    companyId: 'comp-1',
    corporateName: 'Braspress Transportes Urgentes Ltda',
    tradeName: 'Braspress Logística',
    cnpj: '48.740.351/0001-65',
    stateRegistration: '112.445.890.115',
    phone: '(11) 3429-5000',
    whatsapp: '(11) 98765-4321',
    email: 'atendimento@braspress.com.br',
    cep: '02050-010',
    street: 'Av. Presidente Castelo Branco',
    number: '3900',
    complement: 'Galpão 4 - Portaria B',
    neighborhood: 'Pari',
    city: 'São Paulo',
    state: 'SP',
    internalCode: 'TR-001',
    notes: 'Transportadora padrão para entregas interestaduais e redespacho com seguro de carga.',
    active: true,
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'car-2',
    companyId: 'comp-1',
    corporateName: 'Jadlog Logística S/A',
    tradeName: 'Jadlog Express',
    cnpj: '04.884.082/0001-35',
    stateRegistration: '116.890.123.118',
    phone: '(11) 3563-2000',
    whatsapp: '(11) 99123-4567',
    email: 'comercial@jadlog.com.br',
    cep: '05318-000',
    street: 'Av. Gastão Vidigal',
    number: '1132',
    complement: 'Bloco C',
    neighborhood: 'Vila Leopoldina',
    city: 'São Paulo',
    state: 'SP',
    internalCode: 'TR-002',
    notes: 'Entregas expressas de encomendas leves e autopeças para balcão.',
    active: true,
    createdAt: '2026-08-05T09:30:00Z'
  },
  {
    id: 'car-3',
    companyId: 'comp-1',
    corporateName: 'Rodonaves Transportes e Encomendas Ltda',
    tradeName: 'RTE Rodonaves',
    cnpj: '44.914.992/0001-38',
    stateRegistration: '582.012.345.110',
    phone: '(16) 2101-9000',
    whatsapp: '(16) 99876-1234',
    email: 'contato@rodonaves.com.br',
    cep: '14075-500',
    street: 'Rua General Câmara',
    number: '1255',
    neighborhood: 'Ipiranga',
    city: 'Ribeirão Preto',
    state: 'SP',
    internalCode: 'TR-003',
    notes: 'Especialista em cargas fracionadas no interior de SP, MG e PR.',
    active: true,
    createdAt: '2026-08-10T14:00:00Z'
  }
];

export const INITIAL_GOODS_WITHDRAWALS: GoodsWithdrawalOrder[] = [
  // 8 Aguardando Separação
  {
    id: 'ret-001',
    code: 'RET-2026-0001',
    saleId: 'sal-101',
    saleCode: 'VEN-2026-0101',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'João Pedro da Silva',
    clientPhone: '(11) 98765-4321',
    type: 'BALCAO',
    status: 'AGUARDANDO_SEPARACAO',
    items: [
      { id: 'wi-1', partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 2, quantityReserved: 2, quantitySeparated: 0, quantityReleased: 0, unitPrice: 220, totalPrice: 440 }
    ],
    createdAt: '2026-08-22T08:15:00Z',
    updatedAt: '2026-08-22T08:15:00Z',
    history: [{ id: 'he-1', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Venda finalizada no balcão aguardando separação no estoque.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T08:15:00Z' }]
  },
  {
    id: 'ret-002',
    code: 'RET-2026-0002',
    saleId: 'sal-102',
    saleCode: 'VEN-2026-0102',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Mariana Oliveira Costa',
    clientPhone: '(11) 97654-3210',
    type: 'ENTREGA',
    status: 'AGUARDANDO_SEPARACAO',
    carrierId: 'car-1',
    carrierName: 'Braspress Transportes Urgentes',
    shippingAddress: 'Av. Paulista, 1500, Bela Vista, São Paulo - SP',
    items: [
      { id: 'wi-2', partId: 'pe-2', partName: 'Filtro de Óleo Mann-Filter W712', partCode: 'PE-002', quantitySold: 4, quantityReserved: 4, quantitySeparated: 0, quantityReleased: 0, unitPrice: 50, totalPrice: 200 }
    ],
    createdAt: '2026-08-22T08:30:00Z',
    updatedAt: '2026-08-22T08:30:00Z',
    history: [{ id: 'he-2', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Venda para entrega interestadual aguardando separação.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T08:30:00Z' }]
  },
  {
    id: 'ret-003',
    code: 'RET-2026-0003',
    saleId: 'sal-103',
    saleCode: 'VEN-2026-0103',
    companyId: 'comp-1',
    clientId: 'cli-3',
    clientName: 'Auto Peças & Mecânica Central Ltda',
    clientPhone: '(11) 3221-9988',
    type: 'BALCAO',
    status: 'AGUARDANDO_SEPARACAO',
    items: [
      { id: 'wi-3', partId: 'pe-3', partName: 'Disco de Freio Dianteiro Ventilado Fremax', partCode: 'PE-003', quantitySold: 2, quantityReserved: 2, quantitySeparated: 0, quantityReleased: 0, unitPrice: 310, totalPrice: 620 }
    ],
    createdAt: '2026-08-22T09:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z',
    history: [{ id: 'he-3', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Pedido de balcão aguardando triagem.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T09:00:00Z' }]
  },
  {
    id: 'ret-004',
    code: 'RET-2026-0004',
    saleId: 'sal-104',
    saleCode: 'VEN-2026-0104',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Roberto Alves de Almeida',
    type: 'ENTREGA',
    status: 'AGUARDANDO_SEPARACAO',
    carrierId: 'car-2',
    carrierName: 'Jadlog Express',
    shippingAddress: 'Rua Augusta, 450, Consolação, São Paulo - SP',
    items: [
      { id: 'wi-4', partId: 'pe-4', partName: 'Amortecedor Dianteiro Turbogás Cofap', partCode: 'PE-004', quantitySold: 2, quantityReserved: 2, quantitySeparated: 0, quantityReleased: 0, unitPrice: 420, totalPrice: 840 }
    ],
    createdAt: '2026-08-22T09:15:00Z',
    updatedAt: '2026-08-22T09:15:00Z',
    history: [{ id: 'he-4', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Aguardando separador no estoque.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T09:15:00Z' }]
  },
  {
    id: 'ret-005',
    code: 'RET-2026-0005',
    saleId: 'sal-105',
    saleCode: 'VEN-2026-0105',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Lucas Mendes Santana',
    type: 'BALCAO',
    status: 'AGUARDANDO_SEPARACAO',
    items: [
      { id: 'wi-5', partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 1, quantityReserved: 1, quantitySeparated: 0, quantityReleased: 0, unitPrice: 220, totalPrice: 220 }
    ],
    createdAt: '2026-08-22T09:40:00Z',
    updatedAt: '2026-08-22T09:40:00Z',
    history: [{ id: 'he-5', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Cliente aguardando retirada em loja.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T09:40:00Z' }]
  },
  {
    id: 'ret-006',
    code: 'RET-2026-0006',
    saleId: 'sal-106',
    saleCode: 'VEN-2026-0106',
    companyId: 'comp-1',
    clientId: 'cli-3',
    clientName: 'Transportes Express ABC',
    type: 'ENTREGA',
    status: 'AGUARDANDO_SEPARACAO',
    carrierId: 'car-3',
    carrierName: 'RTE Rodonaves',
    shippingAddress: 'Rodovia Anchieta, Km 18, São Bernardo do Campo - SP',
    items: [
      { id: 'wi-6', partId: 'pe-2', partName: 'Filtro de Óleo Mann-Filter W712', partCode: 'PE-002', quantitySold: 10, quantityReserved: 10, quantitySeparated: 0, quantityReleased: 0, unitPrice: 48, totalPrice: 480 }
    ],
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
    history: [{ id: 'he-6', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Carga fracionada agendada.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T10:00:00Z' }]
  },
  {
    id: 'ret-007',
    code: 'RET-2026-0007',
    saleId: 'sal-107',
    saleCode: 'VEN-2026-0107',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Carla Nogueira',
    type: 'BALCAO',
    status: 'AGUARDANDO_SEPARACAO',
    items: [
      { id: 'wi-7', partId: 'pe-3', partName: 'Disco de Freio Dianteiro Ventilado Fremax', partCode: 'PE-003', quantitySold: 1, quantityReserved: 1, quantitySeparated: 0, quantityReleased: 0, unitPrice: 310, totalPrice: 310 }
    ],
    createdAt: '2026-08-22T10:20:00Z',
    updatedAt: '2026-08-22T10:20:00Z',
    history: [{ id: 'he-7', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Venda de balcão.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T10:20:00Z' }]
  },
  {
    id: 'ret-008',
    code: 'RET-2026-0008',
    saleId: 'sal-108',
    saleCode: 'VEN-2026-0108',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Diego Ferraz',
    type: 'BALCAO',
    status: 'AGUARDANDO_SEPARACAO',
    items: [
      { id: 'wi-8', partId: 'pe-4', partName: 'Amortecedor Dianteiro Turbogás Cofap', partCode: 'PE-004', quantitySold: 2, quantityReserved: 2, quantitySeparated: 0, quantityReleased: 0, unitPrice: 420, totalPrice: 840 }
    ],
    createdAt: '2026-08-22T10:35:00Z',
    updatedAt: '2026-08-22T10:35:00Z',
    history: [{ id: 'he-8', status: 'AGUARDANDO_SEPARACAO', action: 'Criação do Pedido', description: 'Retirada programada.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T10:35:00Z' }]
  },

  // 3 Em Separação
  {
    id: 'ret-009',
    code: 'RET-2026-0009',
    saleId: 'sal-109',
    saleCode: 'VEN-2026-0109',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Marcos Vinicius Rezende',
    type: 'BALCAO',
    status: 'EM_SEPARACAO',
    assignedOperator: 'Mecânico Teste',
    items: [
      { id: 'wi-9', partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 2, quantityReserved: 2, quantitySeparated: 1, quantityReleased: 0, unitPrice: 220, totalPrice: 440 }
    ],
    createdAt: '2026-08-22T08:00:00Z',
    updatedAt: '2026-08-22T09:10:00Z',
    history: [
      { id: 'he-9a', status: 'AGUARDANDO_SEPARACAO', action: 'Criação', description: 'Pedido gerado.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T08:00:00Z' },
      { id: 'he-9b', status: 'EM_SEPARACAO', action: 'Início de Separação', description: 'Operador coletando itens na prateleira A3.', userId: 'usr-3', userName: 'Mecânico Teste', timestamp: '2026-08-22T09:10:00Z' }
    ]
  },
  {
    id: 'ret-010',
    code: 'RET-2026-0010',
    saleId: 'sal-110',
    saleCode: 'VEN-2026-0110',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Juliana Barbosa',
    type: 'ENTREGA',
    status: 'EM_SEPARACAO',
    carrierId: 'car-2',
    carrierName: 'Jadlog Express',
    assignedOperator: 'Mecânico Teste',
    shippingAddress: 'Rua Bela Cintra, 890, São Paulo - SP',
    items: [
      { id: 'wi-10', partId: 'pe-2', partName: 'Filtro de Óleo Mann-Filter W712', partCode: 'PE-002', quantitySold: 3, quantityReserved: 3, quantitySeparated: 2, quantityReleased: 0, unitPrice: 50, totalPrice: 150 }
    ],
    createdAt: '2026-08-22T08:20:00Z',
    updatedAt: '2026-08-22T09:30:00Z',
    history: [
      { id: 'he-10a', status: 'AGUARDANDO_SEPARACAO', action: 'Criação', description: 'Pedido gerado.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T08:20:00Z' },
      { id: 'he-10b', status: 'EM_SEPARACAO', action: 'Início de Separação', description: 'Conferência de embalagem em andamento.', userId: 'usr-3', userName: 'Mecânico Teste', timestamp: '2026-08-22T09:30:00Z' }
    ]
  },
  {
    id: 'ret-011',
    code: 'RET-2026-0011',
    saleId: 'sal-111',
    saleCode: 'VEN-2026-0111',
    companyId: 'comp-1',
    clientId: 'cli-3',
    clientName: 'Oficina Rápida Moema',
    type: 'BALCAO',
    status: 'EM_SEPARACAO',
    assignedOperator: 'Carlos Atendente',
    items: [
      { id: 'wi-11', partId: 'pe-3', partName: 'Disco de Freio Dianteiro Ventilado Fremax', partCode: 'PE-003', quantitySold: 4, quantityReserved: 4, quantitySeparated: 2, quantityReleased: 0, unitPrice: 310, totalPrice: 1240 }
    ],
    createdAt: '2026-08-22T08:45:00Z',
    updatedAt: '2026-08-22T09:50:00Z',
    history: [
      { id: 'he-11a', status: 'AGUARDANDO_SEPARACAO', action: 'Criação', description: 'Pedido gerado.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T08:45:00Z' },
      { id: 'he-11b', status: 'EM_SEPARACAO', action: 'Início de Separação', description: 'Separando lote para retirada.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T09:50:00Z' }
    ]
  },

  // 2 Parcialmente Separado / Pendências
  {
    id: 'ret-012',
    code: 'RET-2026-0012',
    saleId: 'sal-112',
    saleCode: 'VEN-2026-0112',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Frota Express Transporte',
    type: 'BALCAO',
    status: 'PARCIALMENTE_SEPARADO',
    items: [
      { id: 'wi-12a', partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 5, quantityReserved: 5, quantitySeparated: 5, quantityReleased: 0, unitPrice: 220, totalPrice: 1100 },
      { id: 'wi-12b', partId: 'pe-4', partName: 'Amortecedor Dianteiro Turbogás Cofap', partCode: 'PE-004', quantitySold: 4, quantityReserved: 4, quantitySeparated: 2, quantityReleased: 0, unitPrice: 420, totalPrice: 1680 }
    ],
    createdAt: '2026-08-22T07:30:00Z',
    updatedAt: '2026-08-22T10:15:00Z',
    history: [
      { id: 'he-12a', status: 'PARCIALMENTE_SEPARADO', action: 'Separação Parcial', description: 'Pastilhas 100% separadas. Amortecedores separados 2 de 4 (faltam 2).', userId: 'usr-3', userName: 'Mecânico Teste', timestamp: '2026-08-22T10:15:00Z' }
    ]
  },
  {
    id: 'ret-013',
    code: 'RET-2026-0013',
    saleId: 'sal-113',
    saleCode: 'VEN-2026-0113',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Centro Automotivo Pinheiros',
    type: 'ENTREGA',
    status: 'PARCIALMENTE_SEPARADO',
    carrierId: 'car-1',
    carrierName: 'Braspress Transportes Urgentes',
    items: [
      { id: 'wi-13', partId: 'pe-2', partName: 'Filtro de Óleo Mann-Filter W712', partCode: 'PE-002', quantitySold: 8, quantityReserved: 8, quantitySeparated: 5, quantityReleased: 0, unitPrice: 50, totalPrice: 400 }
    ],
    createdAt: '2026-08-22T07:50:00Z',
    updatedAt: '2026-08-22T10:25:00Z',
    history: [
      { id: 'he-13', status: 'PARCIALMENTE_SEPARADO', action: 'Separação Parcial', description: '5 unidades separadas na caixa 1. Pendente conferência final.', userId: 'usr-3', userName: 'Mecânico Teste', timestamp: '2026-08-22T10:25:00Z' }
    ]
  },

  // 5 Prontos para Retirada (3 com >24h de espera para teste de alerta operacional SLA)
  {
    id: 'ret-014',
    code: 'RET-2026-0014',
    saleId: 'sal-114',
    saleCode: 'VEN-2026-0114',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Rodrigo Toledo Martins',
    clientPhone: '(11) 98111-2233',
    type: 'BALCAO',
    status: 'PRONTO_RETIRADA',
    separatedAt: '2026-08-20T14:00:00Z', // >24h
    items: [
      { id: 'wi-14', partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 1, quantityReserved: 1, quantitySeparated: 1, quantityReleased: 0, unitPrice: 220, totalPrice: 220 }
    ],
    createdAt: '2026-08-20T11:00:00Z',
    updatedAt: '2026-08-20T14:00:00Z',
    history: [{ id: 'he-14', status: 'PRONTO_RETIRADA', action: 'Separação Concluída', description: 'Mercadoria embalada e disponível no Balcão 1.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-20T14:00:00Z' }]
  },
  {
    id: 'ret-015',
    code: 'RET-2026-0015',
    saleId: 'sal-115',
    saleCode: 'VEN-2026-0115',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Fernando Guimarães Silva',
    clientPhone: '(11) 97222-3344',
    type: 'BALCAO',
    status: 'PRONTO_RETIRADA',
    separatedAt: '2026-08-20T16:30:00Z', // >24h
    items: [
      { id: 'wi-15', partId: 'pe-3', partName: 'Disco de Freio Dianteiro Ventilado Fremax', partCode: 'PE-003', quantitySold: 2, quantityReserved: 2, quantitySeparated: 2, quantityReleased: 0, unitPrice: 310, totalPrice: 620 }
    ],
    createdAt: '2026-08-20T15:00:00Z',
    updatedAt: '2026-08-20T16:30:00Z',
    history: [{ id: 'he-15', status: 'PRONTO_RETIRADA', action: 'Separação Concluída', description: 'Aguardando cliente vir retirar.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-20T16:30:00Z' }]
  },
  {
    id: 'ret-016',
    code: 'RET-2026-0016',
    saleId: 'sal-116',
    saleCode: 'VEN-2026-0116',
    companyId: 'comp-1',
    clientId: 'cli-3',
    clientName: 'Patricia Vasconcelos',
    clientPhone: '(11) 96333-4455',
    type: 'BALCAO',
    status: 'PRONTO_RETIRADA',
    separatedAt: '2026-08-21T08:00:00Z', // >24h
    items: [
      { id: 'wi-16', partId: 'pe-2', partName: 'Filtro de Óleo Mann-Filter W712', partCode: 'PE-002', quantitySold: 2, quantityReserved: 2, quantitySeparated: 2, quantityReleased: 0, unitPrice: 50, totalPrice: 100 }
    ],
    createdAt: '2026-08-21T07:30:00Z',
    updatedAt: '2026-08-21T08:00:00Z',
    history: [{ id: 'he-16', status: 'PRONTO_RETIRADA', action: 'Separação Concluída', description: 'Notificação enviada por WhatsApp.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-21T08:00:00Z' }]
  },
  {
    id: 'ret-017',
    code: 'RET-2026-0017',
    saleId: 'sal-117',
    saleCode: 'VEN-2026-0117',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Henrique Faria',
    clientPhone: '(11) 99444-5566',
    type: 'BALCAO',
    status: 'PRONTO_RETIRADA',
    separatedAt: '2026-08-22T08:50:00Z',
    items: [
      { id: 'wi-17', partId: 'pe-4', partName: 'Amortecedor Dianteiro Turbogás Cofap', partCode: 'PE-004', quantitySold: 2, quantityReserved: 2, quantitySeparated: 2, quantityReleased: 0, unitPrice: 420, totalPrice: 840 }
    ],
    createdAt: '2026-08-22T08:10:00Z',
    updatedAt: '2026-08-22T08:50:00Z',
    history: [{ id: 'he-17', status: 'PRONTO_RETIRADA', action: 'Separação Concluída', description: 'Pronto para entrega de balcão imediata.', userId: 'usr-3', userName: 'Mecânico Teste', timestamp: '2026-08-22T08:50:00Z' }]
  },
  {
    id: 'ret-018',
    code: 'RET-2026-0018',
    saleId: 'sal-118',
    saleCode: 'VEN-2026-0118',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Luciana Prado',
    clientPhone: '(11) 98555-6677',
    type: 'BALCAO',
    status: 'PRONTO_RETIRADA',
    separatedAt: '2026-08-22T09:20:00Z',
    items: [
      { id: 'wi-18', partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 1, quantityReserved: 1, quantitySeparated: 1, quantityReleased: 0, unitPrice: 220, totalPrice: 220 }
    ],
    createdAt: '2026-08-22T08:40:00Z',
    updatedAt: '2026-08-22T09:20:00Z',
    history: [{ id: 'he-18', status: 'PRONTO_RETIRADA', action: 'Separação Concluída', description: 'Etiqueta de cliente anexada.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T09:20:00Z' }]
  },

  // 1 Parcialmente Retirado (Exemplo Demonstrativo de Romaneio Híbrido: Balcão + Entrega Residual)
  {
    id: 'ret-018b',
    code: 'RET-2026-0018B',
    saleId: 'sal-118b',
    saleCode: 'VEN-2026-0188',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Transportadora & Logística Real',
    clientPhone: '(11) 97788-9900',
    type: 'BALCAO',
    status: 'PARCIALMENTE_RETIRADO',
    carrierId: 'car-2',
    carrierName: 'Jadlog Express',
    shippingAddress: 'Av. das Nações Unidas, 14200, Brooklin, São Paulo - SP',
    collectedByName: 'Marcos Aurelio (Motorista)',
    collectedByDocument: '33.444.555-6',
    items: [
      { 
        id: 'wi-18b-1', 
        partId: 'pe-2', 
        partName: 'Filtro de Óleo Mann-Filter W712', 
        partCode: 'PE-002', 
        location: 'Prateleira A-02',
        unit: 'UN',
        quantitySold: 10, 
        quantityReserved: 4, 
        quantitySeparated: 10, 
        quantityReleased: 6, 
        quantityWithdrawn: 6,
        quantityForDelivery: 4, 
        unitPrice: 50, 
        totalPrice: 500,
        isConferred: true,
        divergenceNotes: '6 un retiradas no balcão pelo motorista. 4 un restantes para expedição via Jadlog.'
      }
    ],
    createdAt: '2026-08-22T07:15:00Z',
    updatedAt: '2026-08-22T10:45:00Z',
    history: [
      { id: 'he-18b-1', status: 'AGUARDANDO_SEPARACAO', action: 'Venda Concluída', description: 'Pedido de expedição gerado automaticamente com 10 unidades reservadas.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T07:15:00Z' },
      { id: 'he-18b-2', status: 'PRONTO_RETIRADA', action: 'Separação Concluída (100%)', description: '10 unidades separadas e conferidas no estoque.', userId: 'usr-3', userName: 'Mecânico Teste', timestamp: '2026-08-22T08:30:00Z' },
      { id: 'he-18b-3', status: 'PARCIALMENTE_RETIRADO', action: 'Retirada Parcial no Balcão', description: 'Cliente retirou 6 unidades no balcão (Doc: 33.444.555-6). Saldo residual de 4 unidades destinado para entrega/expedição posterior.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T10:45:00Z' }
    ]
  },

  // 4 Prontos para Entrega / Despacho
  {
    id: 'ret-019',
    code: 'RET-2026-0019',
    saleId: 'sal-119',
    saleCode: 'VEN-2026-0119',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Oficina Mecânica São Judas',
    type: 'ENTREGA',
    status: 'PRONTO_ENTREGA',
    carrierId: 'car-2',
    carrierName: 'Jadlog Express',
    shippingAddress: 'Av. Jabaquara, 1200, Mirandópolis, São Paulo - SP',
    trackingCode: 'JAD-SP-99201',
    separatedAt: '2026-08-22T09:00:00Z',
    items: [
      { id: 'wi-19', partId: 'pe-3', partName: 'Disco de Freio Dianteiro Ventilado Fremax', partCode: 'PE-003', quantitySold: 4, quantityReserved: 4, quantitySeparated: 4, quantityReleased: 0, unitPrice: 310, totalPrice: 1240 }
    ],
    createdAt: '2026-08-22T08:00:00Z',
    updatedAt: '2026-08-22T09:00:00Z',
    history: [{ id: 'he-19', status: 'PRONTO_ENTREGA', action: 'Pronto para Despacho', description: 'Volumes pesados e com DANFE anexada.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T09:00:00Z' }]
  },
  {
    id: 'ret-020',
    code: 'RET-2026-0020',
    saleId: 'sal-120',
    saleCode: 'VEN-2026-0120',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Transportes Rápidos Campinas',
    type: 'ENTREGA',
    status: 'PRONTO_ENTREGA',
    carrierId: 'car-1',
    carrierName: 'Braspress Transportes Urgentes',
    shippingAddress: 'Rua Barão de Jaguara, 500, Centro, Campinas - SP',
    trackingCode: 'BP-887102-SP',
    separatedAt: '2026-08-22T09:30:00Z',
    items: [
      { id: 'wi-20', partId: 'pe-2', partName: 'Filtro de Óleo Mann-Filter W712', partCode: 'PE-002', quantitySold: 6, quantityReserved: 6, quantitySeparated: 6, quantityReleased: 0, unitPrice: 50, totalPrice: 300 }
    ],
    createdAt: '2026-08-22T08:30:00Z',
    updatedAt: '2026-08-22T09:30:00Z',
    history: [{ id: 'he-20', status: 'PRONTO_ENTREGA', action: 'Pronto para Despacho', description: 'Coleta solicitada para o período da tarde.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T09:30:00Z' }]
  },
  {
    id: 'ret-021',
    code: 'RET-2026-0021',
    saleId: 'sal-121',
    saleCode: 'VEN-2026-0121',
    companyId: 'comp-1',
    clientId: 'cli-3',
    clientName: 'Gabriel Siqueira',
    type: 'ENTREGA',
    status: 'PRONTO_ENTREGA',
    carrierId: 'car-3',
    carrierName: 'RTE Rodonaves',
    shippingAddress: 'Av. Brasil, 4300, Jardim Paulista, Ribeirão Preto - SP',
    trackingCode: 'ROD-SP-44120',
    separatedAt: '2026-08-22T10:00:00Z',
    items: [
      { id: 'wi-21', partId: 'pe-4', partName: 'Amortecedor Dianteiro Turbogás Cofap', partCode: 'PE-004', quantitySold: 2, quantityReserved: 2, quantitySeparated: 2, quantityReleased: 0, unitPrice: 420, totalPrice: 840 }
    ],
    createdAt: '2026-08-22T09:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
    history: [{ id: 'he-21', status: 'PRONTO_ENTREGA', action: 'Pronto para Despacho', description: 'Embalagem reforçada.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T10:00:00Z' }]
  },
  {
    id: 'ret-022',
    code: 'RET-2026-0022',
    saleId: 'sal-122',
    saleCode: 'VEN-2026-0122',
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: 'Eduardo Brandão',
    type: 'ENTREGA',
    status: 'PRONTO_ENTREGA',
    carrierId: 'car-2',
    carrierName: 'Jadlog Express',
    shippingAddress: 'Rua Domingos de Morais, 2100, Vila Mariana, São Paulo - SP',
    trackingCode: 'JAD-SP-99304',
    separatedAt: '2026-08-22T10:15:00Z',
    items: [
      { id: 'wi-22', partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 2, quantityReserved: 2, quantitySeparated: 2, quantityReleased: 0, unitPrice: 220, totalPrice: 440 }
    ],
    createdAt: '2026-08-22T09:20:00Z',
    updatedAt: '2026-08-22T10:15:00Z',
    history: [{ id: 'he-22', status: 'PRONTO_ENTREGA', action: 'Pronto para Despacho', description: 'Aguardando transportadora.', userId: 'usr-3', userName: 'Mecânico Teste', timestamp: '2026-08-22T10:15:00Z' }]
  },

  // 2 Saiu para Entrega (Em Trânsito)
  {
    id: 'ret-023',
    code: 'RET-2026-0023',
    saleId: 'sal-123',
    saleCode: 'VEN-2026-0123',
    companyId: 'comp-1',
    clientId: 'cli-2',
    clientName: 'Rogério Albuquerque',
    type: 'ENTREGA',
    status: 'SAIU_PARA_ENTREGA',
    carrierId: 'car-2',
    carrierName: 'Jadlog Express',
    shippingAddress: 'Rua Teodoro Sampaio, 1800, Pinheiros, São Paulo - SP',
    trackingCode: 'JAD-SP-88129',
    separatedAt: '2026-08-22T08:00:00Z',
    releasedAt: '2026-08-22T09:30:00Z',
    items: [
      { id: 'wi-23', partId: 'pe-3', partName: 'Disco de Freio Dianteiro Ventilado Fremax', partCode: 'PE-003', quantitySold: 2, quantityReserved: 0, quantitySeparated: 2, quantityReleased: 2, unitPrice: 310, totalPrice: 620 }
    ],
    createdAt: '2026-08-22T07:15:00Z',
    updatedAt: '2026-08-22T09:30:00Z',
    history: [
      { id: 'he-23a', status: 'PRONTO_ENTREGA', action: 'Separação Concluída', description: 'Separado e embalado.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T08:00:00Z' },
      { id: 'he-23b', status: 'SAIU_PARA_ENTREGA', action: 'Coleta Efetuada', description: 'Despachado com motorista Jadlog. Baixa física de estoque executada.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T09:30:00Z' }
    ]
  },
  {
    id: 'ret-024',
    code: 'RET-2026-0024',
    saleId: 'sal-124',
    saleCode: 'VEN-2026-0124',
    companyId: 'comp-1',
    clientId: 'cli-3',
    clientName: 'Centro Técnico Morumbi',
    type: 'ENTREGA',
    status: 'SAIU_PARA_ENTREGA',
    carrierId: 'car-1',
    carrierName: 'Braspress Transportes Urgentes',
    shippingAddress: 'Av. Giovanni Gronchi, 3200, Morumbi, São Paulo - SP',
    trackingCode: 'BP-990142-SP',
    separatedAt: '2026-08-22T08:20:00Z',
    releasedAt: '2026-08-22T10:00:00Z',
    items: [
      { id: 'wi-24', partId: 'pe-2', partName: 'Filtro de Óleo Mann-Filter W712', partCode: 'PE-002', quantitySold: 4, quantityReserved: 0, quantitySeparated: 4, quantityReleased: 4, unitPrice: 50, totalPrice: 200 }
    ],
    createdAt: '2026-08-22T07:40:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
    history: [
      { id: 'he-24a', status: 'PRONTO_ENTREGA', action: 'Separação Concluída', description: 'Separado.', userId: 'usr-2', userName: 'Carlos Atendente', timestamp: '2026-08-22T08:20:00Z' },
      { id: 'he-24b', status: 'SAIU_PARA_ENTREGA', action: 'Coleta Efetuada', description: 'Coleta efetuada pela transportadora.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T10:00:00Z' }
    ]
  },

  // 12 Concluídos / Entregues hoje
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `ret-done-${i + 1}`,
    code: `RET-2026-00${30 + i}`,
    saleId: `sal-done-${i + 1}`,
    saleCode: `VEN-2026-01${30 + i}`,
    companyId: 'comp-1',
    clientId: 'cli-1',
    clientName: i % 2 === 0 ? `Cliente Balcão Concluído #${i + 1}` : `Entrega Expressa #${i + 1}`,
    type: (i % 2 === 0 ? 'BALCAO' : 'ENTREGA') as WithdrawalType,
    status: (i % 2 === 0 ? 'RETIRADO' : 'ENTREGUE') as WithdrawalStatus,
    separatedAt: '2026-08-22T08:00:00Z',
    releasedAt: '2026-08-22T09:00:00Z',
    deliveredAt: '2026-08-22T10:30:00Z',
    items: [
      { id: `wi-d-${i}`, partId: 'pe-1', partName: 'Jogo de Pastilhas de Freio Dianteira Brembo', partCode: 'PE-001', quantitySold: 1, quantityReserved: 0, quantitySeparated: 1, quantityReleased: 1, unitPrice: 220, totalPrice: 220 }
    ],
    createdAt: '2026-08-22T07:30:00Z',
    updatedAt: '2026-08-22T10:30:00Z',
    history: [
      { id: `he-d-${i}`, status: (i % 2 === 0 ? 'RETIRADO' : 'ENTREGUE') as WithdrawalStatus, action: i % 2 === 0 ? 'Retirada Efetuada' : 'Entrega Concluída', description: 'Operação finalizada com sucesso.', userId: 'usr-1', userName: 'Admin Demo', timestamp: '2026-08-22T10:30:00Z' }
    ]
  }))
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
  sales?: CommercialSale[];
  goodsWithdrawals?: GoodsWithdrawalOrder[];
  carriers?: Carrier[];
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
  unitsOfMeasure?: UnitOfMeasure[];
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
      sales: INITIAL_SALES,
      goodsWithdrawals: INITIAL_GOODS_WITHDRAWALS,
      carriers: INITIAL_CARRIERS,
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
      unitsOfMeasure: INITIAL_UNITS_OF_MEASURE,
    };
  } else {
    try {
      db = JSON.parse(raw);
      if (!db.companyInfo) {
        db.companyInfo = INITIAL_COMPANY_INFO;
      }
      if (!db.registeredCompanies) {
        db.registeredCompanies = INITIAL_COMPANIES;
      }
      if (!db.sales) {
        db.sales = INITIAL_SALES;
      }
      if (!db.goodsWithdrawals) {
        db.goodsWithdrawals = INITIAL_GOODS_WITHDRAWALS;
      }
      if (!db.carriers) {
        db.carriers = INITIAL_CARRIERS;
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
      if (!db.unitsOfMeasure || !Array.isArray(db.unitsOfMeasure) || db.unitsOfMeasure.length === 0) {
        db.unitsOfMeasure = INITIAL_UNITS_OF_MEASURE;
      }
      if (!db.landingContent) {
        try {
          const saved = localStorage.getItem('motordesk_landing_content_v2');
          if (saved) {
            db.landingContent = JSON.parse(saved);
          }
        } catch (e) {
          console.error("Failed to parse landingContent cache in mockData:", e);
        }
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
        sales: INITIAL_SALES,
        goodsWithdrawals: INITIAL_GOODS_WITHDRAWALS,
        carriers: INITIAL_CARRIERS,
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
    }
  }

  if (db.users) {
    const hasValidador = db.users.some(u => u.username.toLowerCase() === 'validador');
    if (!hasValidador) {
      db.users.unshift(INITIAL_USERS[0]); // usr-validador
    } else {
      db.users = db.users.map(u => u.username.toLowerCase() === 'validador' ? { ...u, passwordHash: 'Donatelo@123', role: 'admin' } : u);
    }
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
