/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Client, Vehicle, Part, Service, Budget, ServiceOrder, HistoryEntry, TestCase, StockMovement, CompanyInfo, SystemNotification, AlertSettings, Supplier, SupplierPartPrice, Quotation, AccountReceivable, AccountPayable, FinancialTransaction, MaintenanceLog, PaymentMethodOption, FiscalDocument, BoletoDocument, InterBranchSaleLogistics, SefazApiConfig, TaxOperationNature, TaxRule, XmlImportRecord, CommercialSale, Carrier, GoodsWithdrawalOrder, WithdrawalType, WithdrawalStatus, getDefaultModulesForBusinessType, UnitOfMeasure, BillOfMaterials, ProductionOrder, ProductLot, OperationalAlert, InstalledEquipment, EquipmentMaintenancePlan, EquipmentMaintenanceOrder, ProductionScrapLog, ProductionReworkLog, PurchaseHistoryItem, BomRevision, BillingClosingOrder, BankStatement, BankStatementItem, PaymentSplit, AccessGroup, TaxObligationGuide, TaxObligationType, TaxObligationStatus, TaxCalculationMemory, MonthlyAccountingClosing, AppDatabase } from '../types';

export type { AppDatabase };

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
  enableSalesCreatedAlerts: true,
  enableBudgetConvertedAlerts: true,
  enableBudgetConvertedToSaleAlerts: true,
  enableStockReservedExpirationAlerts: true,
  defaultBudgetValidityDays: 10,
  defaultPaymentRequirementMode: 'ADVANCE_DEPOSIT',
  defaultDepositPercentage: 30,
  requireDepositToExecuteOS: true,
  allowPerClientPaymentOverride: true,

  // Alertas Financeiros e Estoque Gerencial
  enableReceivableDueAlerts: true,
  receivableDueNoticeDays: 3, // Alertar títulos a vencer nos próximos 3 dias
  enablePayableDueAlerts: true,
  payableDueNoticeDays: 5, // Alertar contas a pagar nos próximos 5 dias
  showFinancialAlertsOnDashboard: true,
  showFinancialAlertsInModule: true,
  financialAlertFrequency: 'daily',
  enableDormantStockAlerts: true,
  dormantStockDaysThreshold: 60, // 60 dias sem movimentação
  enableCostIncreaseAlerts: true,
  costIncreaseThresholdPercent: 10, // Aumento de 10%
  enableCreditLimitAlerts: true,
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
  },
  {
    id: 'notif-3',
    companyId: 'comp-4',
    type: 'receivable_due',
    title: 'Fatura a Vencer em 3 dia(s)',
    message: 'A fatura #REC-2026-003 do cliente Auto Mecânica Silva no valor de R$ 1.850,00 vence em breve (2026-07-25).',
    date: '2026-07-22T08:00:00Z',
    read: false,
    metadata: {
      receivableId: 'rec-3',
      clientName: 'Auto Mecânica Silva',
      amount: 1850.00,
      dueDate: '2026-07-25',
      daysDiff: 3
    }
  },
  {
    id: 'notif-4',
    companyId: 'comp-4',
    type: 'stock_low',
    title: 'Ponto de Pedido Atingido',
    message: 'O produto "Óleo 5W30 Sintético Castrol 1L" (OL-5W30) atingiu o estoque mínimo de 10 unidades (Saldo atual: 8 un).',
    date: '2026-07-22T08:15:00Z',
    read: false,
    metadata: {
      partId: 'prt-1',
      partName: 'Óleo 5W30 Sintético Castrol 1L',
      availableStock: 8,
      minStock: 10
    }
  },
  {
    id: 'notif-5',
    companyId: 'comp-4',
    type: 'sale_created',
    title: 'Nova Venda Balcão Concluída',
    message: 'Venda Balcão #VD-2026-004 faturada com sucesso no valor de R$ 340,00 (Cliente Balcão Avulso).',
    date: '2026-07-22T09:00:00Z',
    read: true,
    metadata: {
      saleId: 'sale-4',
      clientName: 'Cliente Balcão Avulso',
      amount: 340.00
    }
  },
  {
    id: 'notif-6',
    companyId: 'comp-4',
    type: 'payable_due',
    title: 'Conta a Pagar a Vencer em 5 dia(s)',
    message: 'A duplicata #DUP-8899 do fornecedor Distribuidora Paulista no valor de R$ 4.200,00 vence em 2026-07-27.',
    date: '2026-07-22T09:30:00Z',
    read: false,
    metadata: {
      payableId: 'pay-2',
      supplierName: 'Distribuidora Paulista',
      amount: 4200.00,
      dueDate: '2026-07-27',
      daysDiff: 5
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
  },
  {
    id: 'comp-5',
    name: 'MotorDesk Metalúrgica & Indústria de Autopeças - Indústria SP',
    tradeName: 'MotorDesk Indústria',
    cnpj: '55.666.777/0001-88',
    companyType: 'matriz',
    businessType: 'INDUSTRIA',
    modules: getDefaultModulesForBusinessType('INDUSTRIA'),
    phone: '(11) 4004-9800',
    whatsapp: '11999995555',
    email: 'pcp@motordesk-industria.com.br',
    address: 'Av. Industrial das Nações, 1500 - Distrito Industrial, Mauá - SP',
    welcomeMessage: 'MotorDesk Indústria - Fabricação seriada, PCP, BOM e Rastreabilidade Operacional.',
    registeredAt: '2026-05-01T08:00:00Z',
    subscriptionStatus: 'active',
    startDate: '2026-05-01',
    expirationDate: '2026-12-31',
    monthlyFee: 599.90,
    paymentStatus: 'paid',
    lastPaymentDate: '2026-07-01',
    legalRepresentativeName: 'Eng. Roberto Vasconcelos',
    legalRepresentativeCpf: '444.555.666-77',
    contractStatus: 'signed',
    notes: 'Planta industrial com PCP ativo, Estrutura BOM multinível, rastreabilidade por Lotes e semáforo de estoque operacional.'
  }
];

// ==========================================
// GRUPOS DE ACESSO PADRÃO (RBAC v2.0)
// ==========================================
export const INITIAL_ACCESS_GROUPS: AccessGroup[] = [
  {
    id: 'grp-admin',
    companyId: 'comp-1',
    name: 'Administradores do Sistema',
    description: 'Acesso irrestrito a todos os módulos, configurações fiscais, financeiras, RBAC e relatórios executivos.',
    active: true,
    isSystemDefault: true,
    color: '#3b82f6',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-08-01 10:00:00',
    createdBy: 'Sistema',
    permissions: {
      accessDashboard: true,
      accessSales: true,
      accessWithdrawals: true,
      accessCarriers: true,
      accessUnitsOfMeasure: true,
      unitsOfMeasureCreate: true,
      unitsOfMeasureEdit: true,
      unitsOfMeasureToggleActive: true,
      accessClients: true,
      accessVehicles: true,
      accessParts: true,
      accessServices: true,
      accessBudgets: true,
      canEditBudgets: true,
      budgetApprove: true,
      accessServiceOrders: true,
      accessHistory: true,
      accessReports: true,
      accessUserManagement: true,
      accessAccessGroups: true,
      accessGroupsCreate: true,
      accessGroupsEdit: true,
      accessGroupsDelete: true,
      accessQAPanel: true,
      accessQuotations: true,
      accessPurchasing: true,
      accessPurchasingOrders: true,
      accessPurchasingApprove: true,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      fiscalView: true,
      fiscalConference: true,
      fiscalEmit: true,
      fiscalTransmit: true,
      fiscalCancel: true,
      fiscalGenerateGuides: true,
      fiscalCancelGuides: true,
      fiscalXml: true,
      fiscalReprint: true,
      fiscalConfig: true,
      accessTaxObligationsReport: true,
      accessBoletos: true,
      boletoGenerate: true,
      financialBillingClosing: true,
      financialReopenClosing: true,
      financialReconciliation: true,
      financialUnreconcile: true,
      authorizeCreditLimitBypass: true,
      accessFinancialReports: true,
      accessPurchasingReports: true,
      accessStockReports: true,
      accessReportsExport: true,
      accessFinancialAlertsConfig: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: true,
      restrictToOwnSales: false
    }
  },
  {
    id: 'grp-manager',
    companyId: 'comp-1',
    name: 'Gerência Operacional & Pátio',
    description: 'Gestão operacional de ordens de serviço, aprovação de orçamentos, vendas e relatórios de desempenho.',
    active: true,
    isSystemDefault: true,
    color: '#8b5cf6',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-08-01 10:00:00',
    createdBy: 'Sistema',
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
      canEditBudgets: true,
      budgetApprove: true,
      accessServiceOrders: true,
      accessHistory: true,
      accessReports: true,
      accessUserManagement: false,
      accessAccessGroups: false,
      accessQAPanel: false,
      accessQuotations: true,
      accessPurchasing: true,
      accessPurchasingOrders: true,
      accessPurchasingApprove: true,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      fiscalView: true,
      fiscalConference: true,
      fiscalEmit: true,
      fiscalTransmit: true,
      fiscalCancel: false,
      fiscalGenerateGuides: true,
      fiscalCancelGuides: false,
      fiscalXml: true,
      fiscalReprint: true,
      accessTaxObligationsReport: true,
      accessBoletos: true,
      boletoGenerate: true,
      financialBillingClosing: true,
      financialReopenClosing: false,
      financialReconciliation: true,
      financialUnreconcile: false,
      authorizeCreditLimitBypass: true,
      accessFinancialReports: true,
      accessPurchasingReports: true,
      accessStockReports: true,
      accessReportsExport: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false
    }
  },
  {
    id: 'grp-sales',
    companyId: 'comp-1',
    name: 'Vendas Balcão & Consultores',
    description: 'Atendimento rápido ao cliente, orçamentos comerciais, vendas balcão (PDV) e emissão de NFC-e imediata.',
    active: true,
    isSystemDefault: true,
    color: '#10b981',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-08-01 10:00:00',
    createdBy: 'Sistema',
    permissions: {
      accessDashboard: true,
      accessSales: true,
      accessWithdrawals: true,
      accessCarriers: true,
      accessUnitsOfMeasure: false,
      accessClients: true,
      accessVehicles: true,
      accessParts: true,
      accessServices: true,
      accessBudgets: true,
      canEditBudgets: true,
      budgetApprove: true,
      accessServiceOrders: true,
      accessHistory: false,
      accessReports: false,
      accessUserManagement: false,
      accessAccessGroups: false,
      accessQAPanel: false,
      accessQuotations: false,
      accessPurchasing: false,
      accessNotifications: true,
      accessAccountsReceivable: false,
      accessAccountsPayable: false,
      accessFinancial: false,
      accessFiscal: true,
      fiscalView: true,
      fiscalConference: false,
      fiscalEmit: true,
      fiscalTransmit: true,
      fiscalCancel: false,
      fiscalGenerateGuides: false,
      fiscalCancelGuides: false,
      fiscalXml: true,
      fiscalReprint: true,
      accessTaxObligationsReport: false,
      accessBoletos: false,
      financialBillingClosing: false,
      financialReopenClosing: false,
      financialReconciliation: false,
      financialUnreconcile: false,
      authorizeCreditLimitBypass: false,
      canCustomizePdf: false,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false
    }
  },
  {
    id: 'grp-fiscal',
    companyId: 'comp-1',
    name: 'Fiscal & Tributário SEFAZ',
    description: 'Auditoria de notas fiscais, conferência pré-emissão, transmissão de lotes, apuração e emissão de Guias (GNRE/DARE).',
    active: true,
    isSystemDefault: true,
    color: '#f59e0b',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-08-01 10:00:00',
    createdBy: 'Sistema',
    permissions: {
      accessDashboard: true,
      accessSales: false,
      accessWithdrawals: false,
      accessCarriers: true,
      accessUnitsOfMeasure: true,
      accessClients: true,
      accessVehicles: false,
      accessParts: true,
      accessServices: true,
      accessBudgets: false,
      accessServiceOrders: false,
      accessHistory: true,
      accessReports: true,
      accessUserManagement: false,
      accessAccessGroups: false,
      accessQAPanel: false,
      accessQuotations: false,
      accessPurchasing: false,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: false,
      accessFinancial: true,
      accessFiscal: true,
      fiscalView: true,
      fiscalConference: true,
      fiscalEmit: true,
      fiscalTransmit: true,
      fiscalCancel: true,
      fiscalGenerateGuides: true,
      fiscalCancelGuides: true,
      fiscalXml: true,
      fiscalReprint: true,
      fiscalConfig: true,
      accessTaxObligationsReport: true,
      accessBoletos: false,
      financialBillingClosing: true,
      financialReopenClosing: false,
      financialReconciliation: false,
      financialUnreconcile: false,
      authorizeCreditLimitBypass: false,
      accessFinancialReports: true,
      accessPurchasingReports: false,
      accessStockReports: true,
      accessReportsExport: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false
    }
  },
  {
    id: 'grp-financial',
    companyId: 'comp-1',
    name: 'Financeiro & Controladoria',
    description: 'Gestão de contas a receber e pagar, faturamento consolidado por período, conciliação bancária e fluxo de caixa.',
    active: true,
    isSystemDefault: true,
    color: '#06b6d4',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-08-01 10:00:00',
    createdBy: 'Sistema',
    permissions: {
      accessDashboard: true,
      accessSales: false,
      accessWithdrawals: false,
      accessCarriers: true,
      accessUnitsOfMeasure: false,
      accessClients: true,
      accessVehicles: false,
      accessParts: false,
      accessServices: false,
      accessBudgets: false,
      accessServiceOrders: false,
      accessHistory: true,
      accessReports: true,
      accessUserManagement: false,
      accessAccessGroups: false,
      accessQAPanel: false,
      accessQuotations: false,
      accessPurchasing: false,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      fiscalView: true,
      fiscalConference: false,
      fiscalEmit: true,
      fiscalTransmit: true,
      fiscalCancel: false,
      fiscalGenerateGuides: true,
      fiscalCancelGuides: false,
      fiscalXml: true,
      fiscalReprint: true,
      accessTaxObligationsReport: true,
      accessBoletos: true,
      boletoGenerate: true,
      financialBillingClosing: true,
      financialReopenClosing: true,
      financialReconciliation: true,
      financialUnreconcile: true,
      authorizeCreditLimitBypass: true,
      accessFinancialReports: true,
      accessPurchasingReports: false,
      accessStockReports: false,
      accessReportsExport: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false
    }
  },
  {
    id: 'grp-purchasing',
    companyId: 'comp-1',
    name: 'Estoque, Almoxarifado & Compras',
    description: 'Gestão de catálogo de peças, cotações com fornecedores, entrada de notas XML e controle de estoque mínimo.',
    active: true,
    isSystemDefault: true,
    color: '#ec4899',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-08-01 10:00:00',
    createdBy: 'Sistema',
    permissions: {
      accessDashboard: true,
      accessSales: false,
      accessWithdrawals: true,
      accessCarriers: true,
      accessUnitsOfMeasure: true,
      unitsOfMeasureCreate: true,
      unitsOfMeasureEdit: true,
      unitsOfMeasureToggleActive: false,
      accessClients: false,
      accessVehicles: false,
      accessParts: true,
      accessServices: false,
      accessBudgets: false,
      accessServiceOrders: false,
      accessHistory: false,
      accessReports: true,
      accessUserManagement: false,
      accessAccessGroups: false,
      accessQAPanel: false,
      accessQuotations: true,
      accessPurchasing: true,
      accessPurchasingOrders: true,
      accessPurchasingApprove: false,
      accessNotifications: true,
      accessAccountsReceivable: false,
      accessAccountsPayable: false,
      accessFinancial: false,
      accessFiscal: false,
      accessTaxObligationsReport: false,
      accessStockReports: true,
      accessPurchasingReports: true,
      accessReportsExport: true,
      canCustomizePdf: false,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false
    }
  },
  {
    id: 'grp-mechanic',
    companyId: 'comp-1',
    name: 'Mecânicos & Chão de Oficina',
    description: 'Execução de ordens de serviço, apontamento de tempo, consulta de peças e manutenção de ferramentas.',
    active: true,
    isSystemDefault: true,
    color: '#64748b',
    createdAt: '2026-01-01 08:00:00',
    updatedAt: '2026-08-01 10:00:00',
    createdBy: 'Sistema',
    permissions: {
      accessDashboard: false,
      accessSales: false,
      accessWithdrawals: false,
      accessCarriers: false,
      accessUnitsOfMeasure: false,
      accessClients: false,
      accessVehicles: false,
      accessParts: true,
      accessServices: true,
      accessBudgets: false,
      accessServiceOrders: true,
      accessHistory: false,
      accessReports: false,
      accessUserManagement: false,
      accessAccessGroups: false,
      accessQAPanel: false,
      accessQuotations: false,
      accessPurchasing: false,
      accessNotifications: true,
      accessAccountsReceivable: false,
      accessAccountsPayable: false,
      accessFinancial: false,
      accessFiscal: false,
      accessTaxObligationsReport: false,
      canCustomizePdf: false,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false
    }
  }
];

// ==========================================
// GUIAS E OBRIGAÇÕES FISCAIS INICIAIS
// ==========================================
export const INITIAL_TAX_OBLIGATION_GUIDES: TaxObligationGuide[] = [
  {
    id: 'guide-sample-1',
    companyId: 'comp-1',
    fiscalDocumentId: 'nfe-doc-104',
    invoiceKey: '35260812345678000190550010000001041009837264',
    nfeNumber: 104,
    nfeSeries: '1',
    obligationType: 'ICMS_ST',
    obligationName: 'Guia ICMS-ST Favorecido RJ',
    authority: 'RJ',
    revenueCode: '10008-0',
    calculationBase: 1250.00,
    rate: 20.0,
    calculatedAmount: 160.00,
    totalAmount: 160.00,
    dueDate: '2026-09-05',
    issueDate: '2026-08-28',
    guideNumber: 'ST-RJ-982341',
    barcode: '85670000016000100080352608123456780001905500',
    digitLine: '85670000016-0 00100080352-6 08123456780-0 01905500104-1',
    pixCopyPaste: '00020126580014BR.GOV.BCB.PIX0114sefaz.rj@sefaz.gov.br0214SEFAZ RJ5204000053039865406160.005802BR5915SEFAZ RJ RECEITA6009BRASILIA62070503GNRE9823416304A1B2',
    status: 'AGUARDANDO_PAGAMENTO',
    generatedAt: '2026-08-28 14:30:00',
    generatedBy: 'Carlos Santos (Gerente)',
    clientName: 'Transportes e Autopeças Guanabara Ltda',
    clientCpfCnpj: '44.555.666/0001-88',
    clientStateRegistration: '88.999.001',
    notes: 'GNRE de ICMS-ST para o Estado do Rio de Janeiro decorrente da NF-e 104.',
    calculationMemory: {
      steps: [
        { label: 'Valor dos Produtos Sujeitos a ST', formula: 'Σ(Pastilhas + Discos de Freio)', value: 'R$ 892.86' },
        { label: 'MVA Ajustada (Autopeças)', formula: 'Convênio ICMS 142/18', value: '40.00%' },
        { label: 'Base de Cálculo ICMS-ST', formula: 'R$ 892.86 × (1 + 40%)', value: 'R$ 1.250,00' },
        { label: 'Débito ICMS Destino (RJ - 20%)', formula: 'R$ 1.250,00 × 20%', value: 'R$ 250,00' },
        { label: 'Crédito ICMS Próprio (SP - 12%)', formula: 'R$ 892.86 × 12%', value: 'R$ 90,00' },
        { label: 'Valor Final a Recolher (ICMS-ST)', formula: 'Débito - Crédito', value: 'R$ 160,00' }
      ],
      legalBasis: 'Convênio ICMS 142/18 e Protocolo ICMS 41/08',
      description: 'Recolhimento de ICMS Substituição Tributária na remessa interestadual SP -> RJ para contribuinte.',
      ufOrigin: 'SP',
      ufDestination: 'RJ',
      cfop: '6.401',
      ncm: '8708.30.90',
      isInterstate: true,
      isFinalConsumer: false,
      recipientIeIndicator: '1'
    }
  },
  {
    id: 'guide-sample-2',
    companyId: 'comp-1',
    fiscalDocumentId: 'nfe-doc-103',
    invoiceKey: '35260812345678000190550010000001031009837263',
    nfeNumber: 103,
    nfeSeries: '1',
    obligationType: 'DIFAL',
    obligationName: 'Guia DIFAL Partilha Destino (MG)',
    authority: 'MG',
    revenueCode: '10010-2',
    calculationBase: 780.00,
    rate: 6.0,
    calculatedAmount: 46.80,
    totalAmount: 46.80,
    dueDate: '2026-09-02',
    issueDate: '2026-08-25',
    guideNumber: 'DIFAL-MG-776210',
    barcode: '85670000004680100102352608123456780001905500',
    digitLine: '85670000004-6 80100102352-6 08123456780-0 01905500103-2',
    pixCopyPaste: '00020126580014BR.GOV.BCB.PIX0114sefaz.mg@sefaz.gov.br0214SEFAZ MG520400005303986540546.805802BR5915SEFAZ MG RECEITA6009BRASILIA62070503GNRE7762106304C3D4',
    status: 'PAGA',
    generatedAt: '2026-08-25 11:15:00',
    generatedBy: 'Carlos Santos (Gerente)',
    paidAt: '2026-08-26 09:40:00',
    paidBy: 'Carlos Santos (Gerente)',
    bankAuthentication: 'AUTH-BCO-ITAU-998822-CONFIRMADO',
    clientName: 'Fernando Alencar Martins',
    clientCpfCnpj: '123.456.789-00',
    notes: 'DIFAL recolhido e quitado para SEFAZ/MG referente a venda a consumidor final.',
    calculationMemory: {
      steps: [
        { label: 'Valor da Mercadoria / Base DIFAL', formula: 'Valor da Venda', value: 'R$ 780,00' },
        { label: 'Alíquota Interna MG', formula: 'SEFAZ/MG', value: '18.00%' },
        { label: 'Alíquota Interestadual (SP -> MG)', formula: 'Resolução Senado 22/89', value: '12.00%' },
        { label: 'DIFAL Apurado', formula: '18% - 12% = 6%', value: '6.00%' },
        { label: 'Valor do DIFAL Destino (MG)', formula: 'R$ 780,00 × 6%', value: 'R$ 46,80' }
      ],
      legalBasis: 'Emenda Constitucional 87/2015 e LC 190/2022',
      description: 'Diferencial de alíquotas do ICMS devido a Minas Gerais.',
      ufOrigin: 'SP',
      ufDestination: 'MG',
      cfop: '6.108',
      ncm: '8708.29.99',
      isInterstate: true,
      isFinalConsumer: true,
      recipientIeIndicator: '9'
    }
  }
];

// Initial Users
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-validador',
    username: 'validador',
    name: 'Usuário Validador (QA)',
    role: 'qa',
    passwordHash: 'Donatelo@123',
    companyId: 'comp-1',
    allowedCompanyIds: ['comp-1'],
    groupId: 'grp-qa',
    groupName: 'Engenharia de Qualidade (QA)',
    active: true,
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
      accessAccessGroups: true,
      accessGroupsCreate: true,
      accessGroupsEdit: true,
      accessGroupsDelete: true,
      accessQAPanel: true,
      accessQuotations: true,
      accessPurchasing: true,
      accessPurchasingOrders: true,
      accessPurchasingApprove: true,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      fiscalView: true,
      fiscalConference: true,
      fiscalEmit: true,
      fiscalTransmit: true,
      fiscalCancel: true,
      fiscalGenerateGuides: true,
      fiscalCancelGuides: true,
      fiscalXml: true,
      fiscalReprint: true,
      accessTaxObligationsReport: true,
      accessFinancialReports: true,
      accessPurchasingReports: true,
      accessStockReports: true,
      accessReportsExport: true,
      accessFinancialAlertsConfig: true,
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
    groupId: 'grp-admin',
    groupName: 'Administradores do Sistema',
    active: true,
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
      accessAccessGroups: true,
      accessGroupsCreate: true,
      accessGroupsEdit: true,
      accessGroupsDelete: true,
      accessQAPanel: true,
      accessQuotations: true,
      accessPurchasing: true,
      accessPurchasingOrders: true,
      accessPurchasingApprove: true,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      fiscalView: true,
      fiscalConference: true,
      fiscalEmit: true,
      fiscalTransmit: true,
      fiscalCancel: true,
      fiscalGenerateGuides: true,
      fiscalCancelGuides: true,
      fiscalXml: true,
      fiscalReprint: true,
      accessTaxObligationsReport: true,
      accessFinancialReports: true,
      accessPurchasingReports: true,
      accessStockReports: true,
      accessReportsExport: true,
      accessFinancialAlertsConfig: true,
      canEditBudgets: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: true,
      restrictToOwnSales: false,
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
      accessSales: true,
      accessWithdrawals: true,
      accessCarriers: true,
      accessUnitsOfMeasure: false,
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
      accessFiscal: true,
      accessFinancialReports: false, // Atendente não vê relatórios financeiros sigilosos
      accessPurchasingReports: false,
      accessStockReports: true,
      accessReportsExport: true,
      accessFinancialAlertsConfig: false,
      canEditBudgets: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false,
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
      accessSales: false,
      accessWithdrawals: false,
      accessCarriers: false,
      accessUnitsOfMeasure: false,
      accessClients: false,
      accessVehicles: false,
      accessParts: true,
      accessServices: true,
      accessBudgets: false,
      accessServiceOrders: true,
      accessHistory: true,
      accessReports: false,
      accessFinancialReports: false,
      accessPurchasingReports: false,
      accessStockReports: false,
      accessReportsExport: false,
      accessFinancialAlertsConfig: false,
      accessUserManagement: false,
      accessQAPanel: true,
      accessQuotations: false,
      accessNotifications: true,
      accessAccountsReceivable: false,
      accessAccountsPayable: false,
      accessFinancial: false,
      accessFiscal: false,
      canEditBudgets: false,
      canCustomizePdf: false,
      canViewOtherStoresStock: false,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false,
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
      accessFinancialReports: true,
      accessPurchasingReports: true,
      accessStockReports: true,
      accessReportsExport: true,
      accessFinancialAlertsConfig: true,
      accessUserManagement: true,
      accessQAPanel: true,
      accessQuotations: true,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      canEditBudgets: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: true,
      restrictToOwnSales: false,
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
      accessFinancialReports: true,
      accessPurchasingReports: true,
      accessStockReports: true,
      accessReportsExport: true,
      accessFinancialAlertsConfig: true,
      accessUserManagement: true,
      accessQAPanel: true,
      accessQuotations: true,
      accessNotifications: true,
      accessAccountsReceivable: true,
      accessAccountsPayable: true,
      accessFinancial: true,
      accessFiscal: true,
      canEditBudgets: true,
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: true,
      restrictToOwnSales: false,
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
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: true,
      restrictToOwnSales: false,
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
      accessSales: false,
      accessWithdrawals: false,
      accessCarriers: false,
      accessUnitsOfMeasure: false,
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
      accessFiscal: false,
      canEditBudgets: false,
      canCustomizePdf: false,
      canViewOtherStoresStock: false,
      canSellOtherStoresStock: false,
      canViewAllCompaniesHistory: false,
      restrictToOwnSales: false,
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
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: true,
      restrictToOwnSales: false,
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
      canCustomizePdf: true,
      canViewOtherStoresStock: true,
      canSellOtherStoresStock: true,
      canViewAllCompaniesHistory: true,
      restrictToOwnSales: false,
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
    depositPercentageOverride: 30,
    billingPolicy: 'PER_SALE'
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
    paymentModeOverride: 'AFTER_COMPLETION',
    billingPolicy: 'PER_SALE'
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
    paymentModeOverride: 'FULL_ADVANCE',
    billingPolicy: 'PER_SALE'
  },
  {
    id: 'cli-abc',
    name: 'Empresa ABC Transportes e Frotas Ltda',
    cpf: '11.222.333/0001-44',
    cpfCnpj: '11.222.333/0001-44',
    email: 'financeiro@empresaabc.com.br',
    phone: '(11) 3456-7890',
    address: 'Av. Marginal Tietê, 4500 - Vila Maria, São Paulo - SP',
    createdAt: '2026-06-10T08:00:00Z',
    maxCreditLimit: 25000,
    currentDebt: 3450,
    billingPolicy: 'CONSOLIDATED_PERIOD',
    billingPeriodicity: 'SEMANAL',
    billingClosingDayOfWeek: 5, // Sexta-feira
    billingDueDaysAfter: 7, // 7 dias após o fechamento
    paymentConditionType: 'A_PRAZO',
    defaultPaymentMethod: 'Boleto',
    paymentModeOverride: 'AFTER_COMPLETION',
    notes: 'Cliente frotista com faturamento consolidado semanal às sextas-feiras e vencimento em 7 dias.'
  },
  {
    id: 'cli-xyz',
    name: 'Empresa XYZ Logística e Distribuição S.A.',
    cpf: '33.444.555/0001-66',
    cpfCnpj: '33.444.555/0001-66',
    email: 'contasapagar@xyzlog.com.br',
    phone: '(11) 4004-3322',
    address: 'Rodovia dos Bandeirantes, km 38 - Cajamar - SP',
    createdAt: '2026-06-20T09:30:00Z',
    maxCreditLimit: 50000,
    currentDebt: 8200,
    billingPolicy: 'CONSOLIDATED_PERIOD',
    billingPeriodicity: 'MENSAL',
    billingClosingDayOfMonth: 30, // Dia 30
    billingDueDayOfMonth: 10, // Dia 10 do mês seguinte
    paymentConditionType: 'A_PRAZO',
    defaultPaymentMethod: 'Boleto',
    paymentModeOverride: 'AFTER_COMPLETION',
    notes: 'Cliente corporativo com política de acumular compras: fechamento no dia 30 e vencimento no dia 10 do mês seguinte.'
  },
  {
    id: 'cli-ind',
    name: 'Metalúrgica Sul Industrial S.A.',
    cpf: '77.888.999/0001-11',
    cpfCnpj: '77.888.999/0001-11',
    email: 'compras@metalurgicasul.ind.br',
    phone: '(11) 4822-1100',
    address: 'Av. Industrial, 800 - Sertãozinho, Mauá - SP',
    createdAt: '2026-07-01T10:00:00Z',
    maxCreditLimit: 100000,
    currentDebt: 15400,
    billingPolicy: 'PER_SALE',
    paymentConditionType: 'A_PRAZO',
    defaultPaymentMethod: 'Boleto',
    paymentModeOverride: 'AFTER_COMPLETION',
    notes: 'Cliente industrial de fornecimento sob encomenda (BOM / OPs) com faturamento por venda a prazo.'
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
  { id: 'prt-1', name: 'Pastilha de Freio Dianteira', code: 'PE-001', stock: 12, reservedStock: 0, price: 180.00, costPrice: 110.00, minStock: 5, category: 'Freios', location: 'Prateleira A1', unit: 'PAR', ncm: '8708.30.90', lastSupplier: 'AutoPeças Brasil Ltda', itemType: 'peca_veicular' },
  { id: 'prt-2', name: 'Filtro de Óleo Lubrificante', code: 'PE-002', stock: 25, reservedStock: 0, price: 45.00, costPrice: 22.50, minStock: 10, category: 'Filtros', location: 'Prateleira B3', unit: 'UN', ncm: '8421.23.00', lastSupplier: 'Distribuidora Mahle', isPeriodic: true, maintenanceControl: { enabled: true, category: 'oil_change', defaultIntervalKm: 10000, defaultIntervalDays: 180 }, itemType: 'peca_veicular' },
  { id: 'prt-3', name: 'Óleo Motor Sintético 5W30 (1L)', code: 'PE-003', stock: 48, reservedStock: 0, price: 65.00, costPrice: 38.00, minStock: 15, category: 'Óleos e Fluídos', location: 'Prateleira C2', unit: 'L', ncm: '2710.19.89', lastSupplier: 'Lubrificantes Mobil', isPeriodic: true, maintenanceControl: { enabled: true, category: 'oil_change', defaultIntervalKm: 10000, defaultIntervalDays: 180 }, isCrossSell: true, crossSellItems: [{ id: 'cs-1', type: 'service', itemId: 'srv-2', name: 'Troca de Óleo e Filtros', defaultQuantity: 1 }, { id: 'cs-2', type: 'part', itemId: 'prt-2', name: 'Filtro de Óleo Lubrificante', defaultQuantity: 1 }], itemType: 'peca_veicular' },
  { id: 'prt-4', name: 'Amortecedor Dianteiro Cofap', code: 'PE-004', stock: 4, reservedStock: 0, price: 420.00, costPrice: 280.00, minStock: 6, category: 'Suspensão', location: 'Prateleira D1', unit: 'UN', ncm: '8708.80.00', lastSupplier: 'Cofap Distribuidora', itemType: 'peca_veicular' },
  { id: 'prt-5', name: 'Disco de Freio Dianteiro (Par)', code: 'PE-005', stock: 6, reservedStock: 0, price: 290.00, costPrice: 175.00, minStock: 4, category: 'Freios', location: 'Prateleira A2', unit: 'PAR', ncm: '8708.30.90', lastSupplier: 'Fremax Componentes', itemType: 'peca_veicular' },
  { id: 'prt-6', name: 'Filtro de Ar do Motor', code: 'PE-006', stock: 15, reservedStock: 0, price: 55.00, costPrice: 28.00, minStock: 8, category: 'Filtros', location: 'Prateleira B2', unit: 'UN', ncm: '8421.31.00', lastSupplier: 'Distribuidora Mahle', isPeriodic: true, maintenanceControl: { enabled: true, category: 'oil_change', defaultIntervalKm: 10000, defaultIntervalDays: 180 }, itemType: 'peca_veicular' },
  { id: 'prt-7', name: 'Bateria Moura 60Ah', code: 'PE-007', stock: 3, reservedStock: 0, price: 480.00, costPrice: 330.00, minStock: 5, category: 'Elétrica', location: 'Prateleira E1', unit: 'UN', ncm: '8507.10.10', lastSupplier: 'Moura Baterias S.A.', itemType: 'peca_veicular' },

  // ITENS INDUSTRIAIS (PRODUTOS ACABADOS, MATÉRIAS-PRIMAS, COMPONENTES E INSUMOS)
  {
    id: 'prt-ind-1',
    name: 'Bomba Hidráulica de Direção Industrial HD-200',
    code: 'PA-BH-200',
    stock: 14,
    reservedStock: 8,
    inProductionStock: 15,
    price: 580.00,
    costPrice: 285.00,
    minStock: 5,
    category: 'Sistemas Hidráulicos',
    location: 'Galpão 2 - Prateleira PA-01',
    unit: 'UN',
    ncm: '8413.60.19',
    itemType: 'produto_acabado',
    hasBom: true,
    bomId: 'bom-1',
    leadTimeDays: 4,
    currentLotNumber: 'LOTE-BH-2026-01',
    companyId: 'comp-5',
    icmsRatePercent: 18,
    pisRatePercent: 1.65,
    cofinsRatePercent: 7.6,
    ipiRatePercent: 5.0,
  },
  {
    id: 'prt-ind-2',
    name: 'Atuador Eletromecânico de Embreagem AT-50',
    code: 'PA-AT-050',
    stock: 4,
    reservedStock: 10,
    inProductionStock: 20,
    price: 420.00,
    costPrice: 195.00,
    minStock: 8,
    category: 'Mecatrônica & Atuadores',
    location: 'Galpão 2 - Prateleira PA-02',
    unit: 'UN',
    ncm: '8501.31.10',
    itemType: 'produto_acabado',
    hasBom: true,
    bomId: 'bom-2',
    leadTimeDays: 6,
    currentLotNumber: 'LOTE-AT-2026-02',
    companyId: 'comp-5',
    icmsRatePercent: 18,
    pisRatePercent: 1.65,
    cofinsRatePercent: 7.6,
    ipiRatePercent: 4.0,
  },
  {
    id: 'prt-ind-3',
    name: 'Chapa de Aço Carbono SAE 1020 3mm',
    code: 'MP-CH-1020',
    stock: 45.5,
    reservedStock: 12.0,
    price: 95.00,
    costPrice: 48.00,
    minStock: 15.0,
    category: 'Metais & Matérias-Primas',
    location: 'Pátio MP - Racks 03',
    unit: 'M²',
    unitOfMeasureId: 'uom-m2',
    unitName: 'Metro Quadrado',
    dimensions: { calculationType: 'AREA', length: 2.0, width: 1.0, unitLength: 'm', unitWidth: 'm', calculatedQuantity: 2.0 },
    ncm: '7208.51.00',
    itemType: 'materia_prima',
    leadTimeDays: 5,
    lastSupplier: 'Gerdau Aços Especiais S.A.',
    uomOrigin: 'NF_E_IMPORT',
    unitCommercial: 'CHAPA',
    unitTrib: 'M²',
    conversionFactorTrib: 2.0,
    currentLotNumber: 'LOT-GERD-992',
    companyId: 'comp-5',
  },
  {
    id: 'prt-ind-4',
    name: 'Eixo Retificado Aço 4140 Ø 25mm',
    code: 'MP-EX-4140',
    stock: 28.0,
    reservedStock: 8.0,
    price: 72.00,
    costPrice: 35.00,
    minStock: 10.0,
    category: 'Metais & Matérias-Primas',
    location: 'Pátio MP - Barraqueira 01',
    unit: 'M',
    unitOfMeasureId: 'uom-m',
    unitName: 'Metro Linear',
    dimensions: { calculationType: 'LINEAR', length: 3.0, unitLength: 'm', calculatedQuantity: 3.0 },
    ncm: '7228.30.00',
    itemType: 'materia_prima',
    leadTimeDays: 7,
    lastSupplier: 'Villares Metals S.A.',
    currentLotNumber: 'LOT-VIL-401',
    companyId: 'comp-5',
  },
  {
    id: 'prt-ind-5',
    name: 'Rolamento de Esferas Blindado SKF 6205-2RS',
    code: 'CP-RL-6205',
    stock: 85,
    reservedStock: 30,
    price: 36.00,
    costPrice: 18.50,
    minStock: 25,
    category: 'Rolamentos & Mancais',
    location: 'Almoxarifado B - Gaveta 14',
    unit: 'UN',
    ncm: '8482.10.10',
    itemType: 'componente',
    leadTimeDays: 3,
    lastSupplier: 'SKF do Brasil Ltda',
    currentLotNumber: 'LOT-SKF-882',
    companyId: 'comp-5',
  },
  {
    id: 'prt-ind-6',
    name: 'Retentor de Óleo Duplo Labirinto Viton 25x47x7',
    code: 'CP-RT-2547',
    stock: 120,
    reservedStock: 20,
    price: 24.00,
    costPrice: 12.00,
    minStock: 35,
    category: 'Vedações Industriais',
    location: 'Almoxarifado B - Gaveta 08',
    unit: 'UN',
    ncm: '4016.93.00',
    itemType: 'componente',
    leadTimeDays: 2,
    lastSupplier: 'Sabó Vedações S.A.',
    currentLotNumber: 'LOT-SAB-112',
    companyId: 'comp-5',
  },
  {
    id: 'prt-ind-7',
    name: 'Micro Motor DC 24V 3500RPM com Encoder',
    code: 'CP-MT-2435',
    stock: 18,
    reservedStock: 15,
    price: 150.00,
    costPrice: 75.00,
    minStock: 15,
    category: 'Mecatrônica & Motores',
    location: 'Almoxarifado B - Prateleira Eletrônica',
    unit: 'UN',
    ncm: '8501.10.19',
    itemType: 'componente',
    leadTimeDays: 10,
    lastSupplier: 'WEG Equipamentos Elétricos S.A.',
    currentLotNumber: 'LOT-WEG-302',
    companyId: 'comp-5',
  },
  {
    id: 'prt-ind-8',
    name: 'Fluido de Teste Hidráulico ISO VG 46',
    code: 'INS-FL-VG46',
    stock: 150.0,
    reservedStock: 25.0,
    price: 32.00,
    costPrice: 16.00,
    minStock: 40.0,
    category: 'Insumos Industriais',
    location: 'Depósito de Químicos - Tanque 02',
    unit: 'L',
    ncm: '2710.19.99',
    itemType: 'insumo',
    lastSupplier: 'Lubrificantes Mobil',
    companyId: 'comp-5',
  },
  {
    id: 'prt-ind-9',
    name: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
    code: 'INS-PF-M830',
    stock: 25,
    reservedStock: 5,
    price: 45.00,
    costPrice: 22.00,
    minStock: 10,
    category: 'Fixadores & Parafusos',
    location: 'Almoxarifado A - Prateleira Fixadores',
    unit: 'CX',
    ncm: '7318.15.00',
    itemType: 'insumo',
    lastSupplier: 'Ciser Parafusos e Porcas',
    companyId: 'comp-5',
  },

  // ITENS INDUSTRIAIS ADICIONAIS VINCULADOS À MATRIZ / COMP-1
  {
    id: 'prt-ind-1-c1',
    name: 'Bomba Hidráulica de Direção Industrial HD-200',
    code: 'PA-BH-200',
    stock: 14,
    reservedStock: 8,
    inProductionStock: 15,
    price: 580.00,
    costPrice: 285.00,
    minStock: 5,
    category: 'Sistemas Hidráulicos',
    location: 'Galpão 2 - Prateleira PA-01',
    unit: 'UN',
    ncm: '8413.60.19',
    itemType: 'produto_acabado',
    hasBom: true,
    bomId: 'bom-1-c1',
    leadTimeDays: 4,
    currentLotNumber: 'LOTE-BH-2026-01',
    companyId: 'comp-1',
    icmsRatePercent: 18,
    pisRatePercent: 1.65,
    cofinsRatePercent: 7.6,
    ipiRatePercent: 5.0,
  },
  {
    id: 'prt-ind-2-c1',
    name: 'Atuador Eletromecânico de Embreagem AT-50',
    code: 'PA-AT-050',
    stock: 6,
    reservedStock: 2,
    inProductionStock: 10,
    price: 420.00,
    costPrice: 195.00,
    minStock: 8,
    category: 'Mecatrônica & Atuadores',
    location: 'Galpão 2 - Prateleira PA-02',
    unit: 'UN',
    ncm: '8501.31.10',
    itemType: 'produto_acabado',
    hasBom: true,
    bomId: 'bom-2-c1',
    leadTimeDays: 6,
    currentLotNumber: 'LOTE-AT-2026-02',
    companyId: 'comp-1',
    icmsRatePercent: 18,
    pisRatePercent: 1.65,
    cofinsRatePercent: 7.6,
    ipiRatePercent: 4.0,
  },
  {
    id: 'prt-ind-3-c1',
    name: 'Chapa de Aço Carbono SAE 1020 3mm',
    code: 'MP-CH-1020',
    stock: 45.5,
    reservedStock: 12.0,
    price: 95.00,
    costPrice: 48.00,
    minStock: 15.0,
    category: 'Metais & Matérias-Primas',
    location: 'Pátio MP - Racks 03',
    unit: 'M²',
    unitOfMeasureId: 'uom-m2',
    unitName: 'Metro Quadrado',
    dimensions: { calculationType: 'AREA', length: 2.0, width: 1.0, unitLength: 'm', unitWidth: 'm', calculatedQuantity: 2.0 },
    ncm: '7208.51.00',
    itemType: 'materia_prima',
    leadTimeDays: 5,
    lastSupplier: 'Gerdau Aços Especiais S.A.',
    companyId: 'comp-1',
  },
  {
    id: 'prt-ind-4-c1',
    name: 'Eixo Retificado Aço 4140 Ø 25mm',
    code: 'MP-EX-4140',
    stock: 28.0,
    reservedStock: 8.0,
    price: 72.00,
    costPrice: 35.00,
    minStock: 10.0,
    category: 'Metais & Matérias-Primas',
    location: 'Pátio MP - Barraqueira 01',
    unit: 'M',
    unitOfMeasureId: 'uom-m',
    unitName: 'Metro Linear',
    dimensions: { calculationType: 'LINEAR', length: 3.0, unitLength: 'm', calculatedQuantity: 3.0 },
    ncm: '7228.30.00',
    itemType: 'materia_prima',
    leadTimeDays: 7,
    lastSupplier: 'Villares Metals S.A.',
    companyId: 'comp-1',
  },
  {
    id: 'prt-ind-5-c1',
    name: 'Rolamento de Esferas Blindado SKF 6205-2RS',
    code: 'CP-RL-6205',
    stock: 85,
    reservedStock: 30,
    price: 36.00,
    costPrice: 18.50,
    minStock: 25,
    category: 'Rolamentos & Mancais',
    location: 'Almoxarifado B - Gaveta 14',
    unit: 'UN',
    ncm: '8482.10.10',
    itemType: 'componente',
    leadTimeDays: 3,
    lastSupplier: 'SKF do Brasil Ltda',
    companyId: 'comp-1',
  },
  {
    id: 'prt-ind-6-c1',
    name: 'Retentor de Óleo Duplo Labirinto Viton 25x47x7',
    code: 'CP-RT-2547',
    stock: 120,
    reservedStock: 20,
    price: 24.00,
    costPrice: 12.00,
    minStock: 35,
    category: 'Vedações Industriais',
    location: 'Almoxarifado B - Gaveta 08',
    unit: 'UN',
    ncm: '4016.93.00',
    itemType: 'componente',
    leadTimeDays: 2,
    lastSupplier: 'Sabó Vedações S.A.',
    companyId: 'comp-1',
  },
  {
    id: 'prt-ind-7-c1',
    name: 'Micro Motor DC 24V 3500RPM com Encoder',
    code: 'CP-MT-2435',
    stock: 18,
    reservedStock: 15,
    price: 150.00,
    costPrice: 75.00,
    minStock: 15,
    category: 'Mecatrônica & Motores',
    location: 'Almoxarifado B - Prateleira Eletrônica',
    unit: 'UN',
    ncm: '8501.10.19',
    itemType: 'componente',
    leadTimeDays: 10,
    lastSupplier: 'WEG Equipamentos Elétricos S.A.',
    companyId: 'comp-1',
  },
  {
    id: 'prt-ind-8-c1',
    name: 'Fluido de Teste Hidráulico ISO VG 46',
    code: 'INS-FL-VG46',
    stock: 150.0,
    reservedStock: 25.0,
    price: 32.00,
    costPrice: 16.00,
    minStock: 40.0,
    category: 'Insumos Industriais',
    location: 'Depósito de Químicos - Tanque 02',
    unit: 'L',
    ncm: '2710.19.99',
    itemType: 'insumo',
    lastSupplier: 'Lubrificantes Mobil',
    companyId: 'comp-1',
  },
  {
    id: 'prt-ind-9-c1',
    name: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
    code: 'INS-PF-M830',
    stock: 25,
    reservedStock: 5,
    price: 45.00,
    costPrice: 22.00,
    minStock: 10,
    category: 'Fixadores & Parafusos',
    location: 'Almoxarifado A - Prateleira Fixadores',
    unit: 'CX',
    ncm: '7318.15.00',
    itemType: 'insumo',
    lastSupplier: 'Ciser Parafusos e Porcas',
    companyId: 'comp-1',
  }
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
  },
  // ==================== NOVOS TESTES OBRIGATÓRIOS (RELATÓRIOS, COMPRAS, ESTOQUE, FINANCEIRO, MULTIEMPRESA) ====================
  // Compras
  {
    id: 'tc-c01',
    code: 'CT-C01',
    requirement: 'REQ-COMPRAS-01',
    title: 'Histórico de Compras com Filtros e Métricas',
    category: 'Compras',
    preConditions: 'Usuário com permissão de relatórios de compras.',
    steps: [
      'Acessar o Relatório "Histórico de Compras".',
      'Filtrar por período (Mês Atual), Fornecedor (AutoPeças Distribuidora Brasil) e Produto.',
      'Verificar a exibição das colunas: Data, Fornecedor, Produto, Quantidade, Valor Unitário, Valor Total e NF/Pedido.',
      'Conferir se os cards de KPI (Total Comprado, Qtd de Compras, Ticket Médio) são recalculados em tempo real.'
    ],
    expectedResult: 'O sistema lista com precisão todas as compras realizadas conforme os filtros aplicados e totaliza os valores corretamente.',
    status: 'passed'
  },
  {
    id: 'tc-c02',
    code: 'CT-C02',
    requirement: 'REQ-COMPRAS-02',
    title: 'Comparativo Produto x Fornecedor e Variação de Preço',
    category: 'Compras',
    preConditions: 'Itens com histórico de compras em múltiplos fornecedores.',
    steps: [
      'Acessar o Relatório "Produto x Fornecedor".',
      'Selecionar a peça "Filtro de Óleo Lubrificante" (PE-002).',
      'Verificar o comparativo entre os fornecedores (Preço de compra, Última data, Frequência).',
      'Checar o destaque do fornecedor com melhor condição e a taxa de variação percentual de preço.'
    ],
    expectedResult: 'O comparativo exibe o histórico de preços por fornecedor, permitindo ao comprador identificar aumentos abusivos e economias potenciais.',
    status: 'passed'
  },
  {
    id: 'tc-c03',
    code: 'CT-C03',
    requirement: 'REQ-COMPRAS-03',
    title: 'Sugestão de Compra Baseada na Compra Anterior (Apoio à Decisão)',
    category: 'Compras',
    preConditions: 'Criação de nova cotação ou pedido de compra.',
    steps: [
      'Abrir o módulo "Cotações & Compras" e iniciar nova cotação.',
      'Selecionar um produto que já possui compras anteriores.',
      'Verificar o card inteligente de apoio: "Compra anterior: X un | Último fornecedor: Y | Último preço: R$ Z | Estoque atual: A | Sugestão: B un".',
      'Confirmar que a sugestão preenche a quantidade de forma editável e não efetiva compras sem autorização manual.'
    ],
    expectedResult: 'O sistema fornece subsídios históricos imediatos para a decisão do comprador, sem automações forçadas.',
    status: 'passed'
  },
  {
    id: 'tc-c04',
    code: 'CT-C04',
    requirement: 'REQ-COMPRAS-04',
    title: 'Identificação de Produtos Abaixo do Estoque Mínimo',
    category: 'Compras',
    preConditions: 'Produtos com saldo físico/disponível inferior ao estoque mínimo.',
    steps: [
      'Acessar o Relatório "Produtos para Reposição (Abaixo do Mínimo)".',
      'Verificar itens com badge vermelho/amarelo de criticidade.',
      'Checar se o sistema calcula a quantidade sugerida de compra para atingir o estoque seguro.',
      'Clicar no botão "Gerar Cotação / Pedido" e verificar o direcionamento com itens pré-selecionados.'
    ],
    expectedResult: 'Os produtos críticos são listados com clareza e com fluxo ágil de reposição.',
    status: 'passed'
  },
  {
    id: 'tc-c05',
    code: 'CT-C05',
    requirement: 'REQ-COMPRAS-05',
    title: 'Painel de Métricas e Inteligência do Comprador',
    category: 'Compras',
    preConditions: 'Módulo de Compras ativo com dados consolidados.',
    steps: [
      'Navegar até o painel "Inteligência de Compras" dentro de Cotações & Compras.',
      'Verificar os indicadores: Total Comprado, Qtd de Pedidos, Ticket Médio, Fornecedor Líder, Produto Mais Comprado e Maior Variação de Preço.',
      'Verificar a lista de produtos com aumentos de custo e economia potencial.'
    ],
    expectedResult: 'O comprador visualiza um panorama analítico 360° para negociar melhores condições comerciais.',
    status: 'passed'
  },
  // Estoque
  {
    id: 'tc-e01',
    code: 'CT-E01',
    requirement: 'REQ-ESTOQUE-01',
    title: 'Movimentação de Entrada de Estoque',
    category: 'Estoque',
    preConditions: 'Importação de XML de compra ou entrada manual de estoque.',
    steps: [
      'Registrar uma entrada de 10 unidades de Pastilha de Freio.',
      'Consultar o Relatório de Movimentações de Estoque.',
      'Verificar o registro com Tipo "Entrada", quantidade positiva (+10), custo unitário e saldo atualizado.'
    ],
    expectedResult: 'O saldo físico e disponível do produto aumentam em 10 unidades e o log de movimentação é gravado.',
    status: 'passed'
  },
  {
    id: 'tc-e02',
    code: 'CT-E02',
    requirement: 'REQ-ESTOQUE-02',
    title: 'Movimentação de Saída de Estoque (Venda / OS)',
    category: 'Estoque',
    preConditions: 'Venda balcão ou Ordem de Serviço faturada/concluída.',
    steps: [
      'Concluir uma OS ou Venda Balcão consumindo 2 unidades de Óleo Motor 5W30.',
      'Consultar o Relatório de Movimentações de Estoque.',
      'Verificar o registro com Tipo "Saída", quantidade negativa (-2) e vínculo com o documento de origem.'
    ],
    expectedResult: 'O saldo de estoque é reduzido com rastreabilidade completa do documento gerador.',
    status: 'passed'
  },
  {
    id: 'tc-e03',
    code: 'CT-E03',
    requirement: 'REQ-ESTOQUE-03',
    title: 'Reserva de Estoque em Orçamento / OS em Aberto',
    category: 'Estoque',
    preConditions: 'Configuração de reserva ativa na empresa.',
    steps: [
      'Gerar um orçamento com 2 unidades de Bateria Moura.',
      'Consultar a posição do estoque da peça.',
      'Verificar que o Saldo Físico permanece inalterado, a Reserva aumenta em 2 e o Saldo Disponível reduz em 2.'
    ],
    expectedResult: 'A reserva garante que o item não seja vendido em duplicidade para outro cliente enquanto o orçamento for válido.',
    status: 'passed'
  },
  {
    id: 'tc-e04',
    code: 'CT-E04',
    requirement: 'REQ-ESTOQUE-04',
    title: 'Liberação de Reserva de Estoque por Cancelamento/Expiração',
    category: 'Estoque',
    preConditions: 'Orçamento com itens reservados cancelado ou expirado.',
    steps: [
      'Cancelar o orçamento pendente com itens reservados.',
      'Consultar a posição do produto no estoque.',
      'Verificar que a quantidade reservada é zerada e o Saldo Disponível retorna integralmente.'
    ],
    expectedResult: 'A liberação de reserva restaura a disponibilidade de venda imediata do produto.',
    status: 'passed'
  },
  {
    id: 'tc-e05',
    code: 'CT-E05',
    requirement: 'REQ-ESTOQUE-05',
    title: 'Relatório de Produtos sem Movimentação (Capital Parado)',
    category: 'Estoque',
    preConditions: 'Itens no estoque sem movimentação por períodos de 30, 60, 90 ou mais dias.',
    steps: [
      'Acessar o Relatório "Produtos sem Movimentação (Capital Parado)".',
      'Selecionar o filtro de corte temporal (ex: 60 dias sem giro).',
      'Verificar a listagem de produtos, valor financeiro total imobilizado e data da última movimentação.'
    ],
    expectedResult: 'O gestor visualiza com exatidão o capital parado em estoque para criar promoções ou desovar itens parados.',
    status: 'passed'
  },
  // Financeiro
  {
    id: 'tc-f01',
    code: 'CT-F01',
    requirement: 'REQ-FIN-01',
    title: 'Relatório de Contas a Receber a Vencer',
    category: 'Financeiro',
    preConditions: 'Títulos a receber com data de vencimento futura.',
    steps: [
      'Acessar o Relatório de Contas a Receber.',
      'Filtrar pelo status "A Vencer".',
      'Verificar a listagem dos títulos, agrupamento por cliente e cálculo do total a receber projetado.'
    ],
    expectedResult: 'Apenas os títulos pendentes com vencimento futuro são exibidos com soma precisa do saldo devedor.',
    status: 'passed'
  },
  {
    id: 'tc-f02',
    code: 'CT-F02',
    requirement: 'REQ-FIN-02',
    title: 'Relatório de Contas a Receber Vencidas',
    category: 'Financeiro',
    preConditions: 'Títulos pendentes com data de vencimento anterior à data atual.',
    steps: [
      'Acessar o Relatório de Contas a Receber.',
      'Filtrar pelo status "Vencidas".',
      'Verificar a sinalização em vermelho, contagem de dias em atraso e cálculo de juros/multa aplicáveis.'
    ],
    expectedResult: 'Os títulos vencidos são destacados com clareza para ações de cobrança ativa.',
    status: 'passed'
  },
  {
    id: 'tc-f03',
    code: 'CT-F03',
    requirement: 'REQ-FIN-03',
    title: 'Relatório de Contas a Pagar a Vencer',
    category: 'Financeiro',
    preConditions: 'Obrigações com fornecedores com vencimento futuro.',
    steps: [
      'Acessar o Relatório de Contas a Pagar.',
      'Filtrar pelo status "A Vencer".',
      'Verificar a relação de títulos por fornecedor, datas e total de desembolso futuro previsto.'
    ],
    expectedResult: 'O sistema lista as obrigações a vencer permitindo o planejamento prévio do fluxo de caixa.',
    status: 'passed'
  },
  {
    id: 'tc-f04',
    code: 'CT-F04',
    requirement: 'REQ-FIN-04',
    title: 'Relatório de Contas a Pagar Vencidas',
    category: 'Financeiro',
    preConditions: 'Títulos a pagar em atraso com fornecedores.',
    steps: [
      'Acessar o Relatório de Contas a Pagar.',
      'Filtrar pelo status "Vencidas".',
      'Verificar os títulos pendentes de pagamento já ultrapassados do prazo de vencimento e o montante em atraso.'
    ],
    expectedResult: 'O relatório alerta imediatamente sobre dívidas pendentes para evitar protestos e juros moratórios.',
    status: 'passed'
  },
  {
    id: 'tc-f05',
    code: 'CT-F05',
    requirement: 'REQ-FIN-05',
    title: 'Filtro por Cliente no Contas a Receber e Inadimplência',
    category: 'Financeiro',
    preConditions: 'Múltiplos títulos de clientes distintos cadastrados.',
    steps: [
      'Acessar os Relatórios Financeiros.',
      'Selecionar um cliente específico no dropdown de filtro.',
      'Verificar se todos os títulos exibidos pertencem exclusivamente ao cliente selecionado.'
    ],
    expectedResult: 'O filtro isola com 100% de exatidão os lançamentos do cliente pesquisado.',
    status: 'passed'
  },
  {
    id: 'tc-f06',
    code: 'CT-F06',
    requirement: 'REQ-FIN-06',
    title: 'Filtro por Fornecedor no Contas a Pagar',
    category: 'Financeiro',
    preConditions: 'Múltiplos títulos de fornecedores distintos.',
    steps: [
      'Acessar o Relatório de Contas a Pagar.',
      'Selecionar um fornecedor no filtro de busca.',
      'Verificar se a tabela e os cards de KPI consolidam apenas as obrigações do fornecedor em questão.'
    ],
    expectedResult: 'O filtro refina com precisão os lançamentos do fornecedor selecionado.',
    status: 'passed'
  },
  {
    id: 'tc-f07',
    code: 'CT-F07',
    requirement: 'REQ-FIN-07',
    title: 'Filtro por Período em Relatórios Financeiros',
    category: 'Financeiro',
    preConditions: 'Lançamentos distribuídos em datas variadas.',
    steps: [
      'Acessar o Relatório de Contas a Receber / Contas a Pagar.',
      'Selecionar período personalizado (Data Inicial e Data Final).',
      'Verificar se apenas os títulos compreendidos no intervalo de vencimento/emissão são exibidos.'
    ],
    expectedResult: 'A filtragem por período é estrita e recalculada instantaneamente na interface.',
    status: 'passed'
  },
  {
    id: 'tc-f08',
    code: 'CT-F08',
    requirement: 'REQ-FIN-08',
    title: 'Relatório Consolidado A Pagar x A Receber (Saldo Projetado)',
    category: 'Financeiro',
    preConditions: 'Títulos cadastrados em Contas a Receber e Contas a Pagar.',
    steps: [
      'Acessar o Relatório "Compromissos Financeiros Consolidados".',
      'Verificar o bloco "A Receber", o bloco "A Pagar" e o indicador central "Saldo Projetado" (A Receber - A Pagar).',
      'Checar o alerta visual se a projeção é Superavitária (Verde) ou Deficitária (Vermelho).'
    ],
    expectedResult: 'O relatório consolidado entrega a visão clara da saúde financeira futura da empresa.',
    status: 'passed'
  },
  {
    id: 'tc-f09',
    code: 'CT-F09',
    requirement: 'REQ-FIN-09',
    title: 'Alertas de Vencimento Configuráveis (Dashboard e Módulos)',
    category: 'Financeiro',
    preConditions: 'Configuração de dias de antecedência para contas a vencer (ex: 3 dias para receber, 5 dias para pagar).',
    steps: [
      'Abrir o Modal de Configuração de Alertas Financeiros.',
      'Alterar a antecedência de aviso para 5 dias e salvar.',
      'Navegar ao Dashboard e aos módulos de Contas a Pagar / Receber.',
      'Verificar a presença dos banners e cards de alerta clicáveis destacando os títulos prestes a vencer.'
    ],
    expectedResult: 'Os alertas visuais notificam ativamente os operadores antes do vencimento dos compromissos.',
    status: 'passed'
  },
  {
    id: 'tc-f10',
    code: 'CT-F10',
    requirement: 'REQ-FIN-10',
    title: 'Bloqueio de Acesso para Usuário sem Permissão (RBAC)',
    category: 'Segurança & RBAC',
    preConditions: 'Usuário operador/atendente sem permissão de relatórios financeiros (`accessFinancialReports = false`).',
    steps: [
      'Efetuar login com o usuário "atendente" ou "mecanico".',
      'Acessar a tela de Relatórios.',
      'Verificar se as abas e relatórios de Contas a Pagar, Contas a Receber e DRE ficam ocultas ou bloqueadas com mensagem de permissão negada.'
    ],
    expectedResult: 'O sistema restringe estritamente a visualização de relatórios sigilosos conforme a matriz de permissões do usuário.',
    status: 'passed'
  },
  // Multiempresa
  {
    id: 'tc-m01',
    code: 'CT-M01',
    requirement: 'REQ-MULTI-01',
    title: 'Isolamento Multiempresa: Empresa A não visualiza dados da Empresa B',
    category: 'Multiempresa',
    preConditions: 'Dois tenants com estoques, clientes e financeiro cadastrados separadamente (comp-1 e comp-2).',
    steps: [
      'Logar na Empresa 1 (Oficina Matriz) e verificar os relatórios de estoque e financeiro.',
      'Alternar para a Empresa 2 (Precision Motors).',
      'Verificar os mesmos relatórios na Empresa 2 e constatar que nenhum título, peça ou movimentação da Empresa 1 aparece.'
    ],
    expectedResult: 'O isolamento de dados por companyId é total e inviolável em todos os módulos e relatórios.',
    status: 'passed'
  },
  {
    id: 'tc-m02',
    code: 'CT-M02',
    requirement: 'REQ-MULTI-02',
    title: 'Indicadores e Métricas Isolados por companyId',
    category: 'Multiempresa',
    preConditions: 'Transações e KPIs independentes em cada empresa.',
    steps: [
      'Consultar os cards de KPI no Dashboard da Empresa 1 (Faturamento, Total em Estoque, Contas a Pagar).',
      'Alternar para a Empresa 2.',
      'Verificar que os valores totais dos KPIs refletem única e exclusivamente os registros pertencentes à Empresa 2.'
    ],
    expectedResult: 'Todos os cálculos agregados respeitam rigorosamente o escopo do tenant ativo.',
    status: 'passed'
  },
  // MÓDULO INDUSTRIAL & PCP (CT-IND-01 a CT-IND-37)
  {
    id: 'tc-ind-01',
    code: 'CT-IND-01',
    requirement: 'REQ-IND-01',
    title: 'Parametrização do Módulo Industrial por Empresa',
    category: 'Industrial',
    preConditions: 'Empresa cadastrada no segmento INDUSTRIA ou HIBRIDO.',
    steps: [
      'Acessar Empresas e selecionar empresa industrial.',
      'Verificar a ativação dos módulos de Engenharia BOM, PCP, Rastreabilidade e Manutenção.',
      'Confirmar que os menus industriais estão disponíveis no sidebar de navegação.'
    ],
    expectedResult: 'Os módulos e fluxos industriais são exibidos exclusivamente para empresas do ramo industrial.',
    status: 'passed'
  },
  {
    id: 'tc-ind-02',
    code: 'CT-IND-02',
    requirement: 'REQ-IND-02',
    title: 'Cadastro de Estrutura do Produto (BOM) com Perda Técnica',
    category: 'Industrial',
    preConditions: 'Itens de matéria-prima e produto acabado cadastrados no catálogo.',
    steps: [
      'Navegar até a aba "Engenharia & BOM" no módulo Industrial.',
      'Clicar em "Nova Estrutura (BOM)" e selecionar o produto acabado.',
      'Adicionar matérias-primas com percentuais de perda técnica e insumos.',
      'Definir custos de mão de obra e custos indiretos de fabricação (CIF).',
      'Salvar a estrutura do produto.'
    ],
    expectedResult: 'Estrutura BOM salva com sucesso com cálculo exato de quantidade efetiva e custo unitário.',
    status: 'passed'
  },
  {
    id: 'tc-ind-03',
    code: 'CT-IND-03',
    requirement: 'REQ-IND-03',
    title: 'Versionamento de BOM (v1.0 -> v1.1) e Rastreio de Histórico',
    category: 'Industrial',
    preConditions: 'Estrutura BOM v1.0 existente.',
    steps: [
      'Selecionar a BOM v1.0 e solicitar criação de nova versão.',
      'Alterar a especificação de um componente ou percentual de perda técnica.',
      'Salvar a nova versão v1.1.',
      'Verificar que a versão anterior v1.0 é arquivada mantendo rastreabilidade para OPs passadas.'
    ],
    expectedResult: 'Novo registro de versão gerado mantendo histórico imutável das revisões anteriores.',
    status: 'passed'
  },
  {
    id: 'tc-ind-04',
    code: 'CT-IND-04',
    requirement: 'REQ-IND-04',
    title: 'Cálculo Automático de Custo Unitário (Matéria-Prima + MOD + CIF)',
    category: 'Industrial',
    preConditions: 'BOM com itens de custo cadastrados.',
    steps: [
      'Consultar a composição de custo na tela de detalhes da BOM.',
      'Verificar a somatória: Custo de Materiais + Custo de Mão de Obra + Custo Indireto.',
      'Verificar o preço de venda sugerido com base na margem parametrizada.'
    ],
    expectedResult: 'O custo unitário e preço sugerido são calculados em tempo real com precisão decimal.',
    status: 'passed'
  },
  {
    id: 'tc-ind-05',
    code: 'CT-IND-05',
    requirement: 'REQ-IND-05',
    title: 'Criação de Ordem de Produção (OP) a partir de BOM',
    category: 'Industrial',
    preConditions: 'BOM ativa cadastrada.',
    steps: [
      'Na aba "Ordens de Produção", clicar em "Nova OP".',
      'Selecionar a BOM desejada, informar a quantidade planejada (ex: 20 un) e data de entrega.',
      'Definir a prioridade e observações de fabricação.',
      'Confirmar a abertura da OP.'
    ],
    expectedResult: 'OP gerada no status "Planejada" com código sequencial único e roteiro de produção herdado da BOM.',
    status: 'passed'
  },
  {
    id: 'tc-ind-06',
    code: 'CT-IND-06',
    requirement: 'REQ-IND-06',
    title: 'Reserva Automática de Matéria-Prima na Abertura da OP',
    category: 'Industrial',
    preConditions: 'OP criada com quantidade planejada.',
    steps: [
      'Verificar os insumos necessários multiplicados pela quantidade da OP.',
      'Consultar o módulo de Peças/Estoque para os insumos vinculados.',
      'Confirmar que a quantidade calculada foi adicionada ao campo "Estoque Reservado".'
    ],
    expectedResult: 'Os materiais ficam reservados impedindo que sejam vendidos no balcão ou alocados em outra OP.',
    status: 'passed'
  },
  {
    id: 'tc-ind-07',
    code: 'CT-IND-07',
    requirement: 'REQ-IND-07',
    title: 'Bloqueio de Início de OP por Falha/Falta de Matéria-Prima',
    category: 'Industrial',
    preConditions: 'Insumo essencial com saldo disponível inferior à necessidade da OP.',
    steps: [
      'Tentar iniciar a OP com material insuficiente.',
      'O sistema exibe alerta crítico de falta de insumo.',
      'Apresenta opção de gerar sugestão de compra emergencial.'
    ],
    expectedResult: 'O sistema sinaliza o risco de parada e orienta o gestor de PCP.',
    status: 'passed'
  },
  {
    id: 'tc-ind-08',
    code: 'CT-IND-08',
    requirement: 'REQ-IND-08',
    title: 'Apontamento Parcial de Produção com Baixa Proporcional',
    category: 'Industrial',
    preConditions: 'OP no status "Em Produção".',
    steps: [
      'Abrir o modal de "Apontamento de Produção" da OP.',
      'Informar 10 unidades produzidas de 20 planejadas.',
      'Confirmar o apontamento.',
      'Verificar que a OP é atualizada para 10/20 e o saldo proporcional de matéria-prima é baixado.'
    ],
    expectedResult: 'Apontamento registrado com sucesso e consumo proporcional de insumos debitado.',
    status: 'passed'
  },
  {
    id: 'tc-ind-09',
    code: 'CT-IND-09',
    requirement: 'REQ-IND-09',
    title: 'Registro de Refugo/Sucata com Motivo e Custo Apropriado',
    category: 'Industrial',
    preConditions: 'Ocorrência de perda na linha de usinagem/montagem.',
    steps: [
      'No apontamento da OP, informar 1 unidade de refugo/sucata com motivo.',
      'Confirmar o registro.',
      'Verificar o log em "Histórico de Sucata / Refugos" com o custo financeiro apropriado.'
    ],
    expectedResult: 'Refugo registrado com motivo, operador e impacto no custo real da OP.',
    status: 'passed'
  },
  {
    id: 'tc-ind-10',
    code: 'CT-IND-10',
    requirement: 'REQ-IND-10',
    title: 'Apontamento de Retrabalho com Horas Adicionais',
    category: 'Industrial',
    preConditions: 'Peça necessitando de retrabalho na bancada de ajuste.',
    steps: [
      'Registrar retrabalho informando etapa, motivo e horas adicionais de mão de obra.',
      'Verificar a adição do custo de retrabalho ao custo total realizado da OP.'
    ],
    expectedResult: 'Retrabalho contabilizado sem duplicar contagem de unidades produzidas.',
    status: 'passed'
  },
  {
    id: 'tc-ind-11',
    code: 'CT-IND-11',
    requirement: 'REQ-IND-11',
    title: 'Conclusão da OP e Geração Automática de Lote',
    category: 'Industrial',
    preConditions: 'Total planejado da OP atingido nos apontamentos.',
    steps: [
      'Finalizar a OP.',
      'O sistema altera o status da OP para "Concluída".',
      'Gera automaticamente um número de lote com rastreabilidade completa.'
    ],
    expectedResult: 'Lote gerado com data de fabricação, quantidade, operador responsável e status de CQ.',
    status: 'passed'
  },
  {
    id: 'tc-ind-12',
    code: 'CT-IND-12',
    requirement: 'REQ-IND-12',
    title: 'Entrada Automática do Produto Acabado no Estoque Físico',
    category: 'Industrial',
    preConditions: 'OP concluída com lote gerado.',
    steps: [
      'Consultar o saldo em estoque do produto acabado fabricado.',
      'Verificar que a quantidade produzida foi somada ao Estoque Físico e Disponível.'
    ],
    expectedResult: 'Estoque do produto acabado alimentado instantaneamente com registro de movimentação de entrada por produção.',
    status: 'passed'
  },
  {
    id: 'tc-ind-13',
    code: 'CT-IND-13',
    requirement: 'REQ-IND-13',
    title: 'Rastreabilidade de Lote Ascendente (Produto -> MP/Fornecedor)',
    category: 'Industrial',
    preConditions: 'Lote de produto acabado existente.',
    steps: [
      'Na aba "Rastreabilidade por Lotes", pesquisar o número do lote.',
      'Clicar na árvore genealógica do lote.',
      'Visualizar os lotes de matéria-prima utilizados, notas fiscais de entrada e fornecedores de origem.'
    ],
    expectedResult: 'Árvore genealógica completa exibindo fornecedores, certificados de qualidade e operadores.',
    status: 'passed'
  },
  {
    id: 'tc-ind-14',
    code: 'CT-IND-14',
    requirement: 'REQ-IND-14',
    title: 'Rastreabilidade de Lote Descendente (Lote MP -> OPs -> Clientes)',
    category: 'Industrial',
    preConditions: 'Lote de matéria-prima fornecido com defeito.',
    steps: [
      'Informar o lote da matéria-prima defeituosa no buscador de rastreabilidade.',
      'O sistema identifica todas as OPs que utilizaram o lote e os lotes de produtos acabados gerados.',
      'Exibe as vendas/faturamentos para recall direcionado.'
    ],
    expectedResult: 'Mapeamento instantâneo de todos os clientes e produtos impactados pelo lote de insumo.',
    status: 'passed'
  },
  {
    id: 'tc-ind-15',
    code: 'CT-IND-15',
    requirement: 'REQ-IND-15',
    title: 'Bloqueio de Lote em Quarentena no Controle de Qualidade',
    category: 'Industrial',
    preConditions: 'Lote recebido ou produzido pendente de laudo laboratorial.',
    steps: [
      'Definir o status de qualidade do lote como "QUARENTENA".',
      'Tentar faturar ou alocar o lote em uma OP ou Venda.',
      'O sistema bloqueia a movimentação até aprovação pelo inspetor de qualidade.'
    ],
    expectedResult: 'Lotes em quarentena não podem ser consumidos ou comercializados.',
    status: 'passed'
  },
  {
    id: 'tc-ind-16',
    code: 'CT-IND-16',
    requirement: 'REQ-IND-16',
    title: 'Semáforo de Estoque Operacional (Físico, Reservado, Disponível)',
    category: 'Industrial',
    preConditions: 'Itens industriais com movimentações ativas.',
    steps: [
      'Acessar a aba "Semáforo de Estoque & Tráfego".',
      'Verificar as colunas: Físico, Reservado para OPs, Em Separação, Disponível e Ponto de Pedido.',
      'Confirmar a sinalização por cores (Verde, Amarelo, Vermelho).'
    ],
    expectedResult: 'Visibilidade 360° da real disponibilidade de materiais para produção contínua.',
    status: 'passed'
  },
  {
    id: 'tc-ind-17',
    code: 'CT-IND-17',
    requirement: 'REQ-IND-17',
    title: 'Cadastro de Equipamento Instalado com Número de Série e Garantia',
    category: 'Industrial',
    preConditions: 'Produto industrial vendido e entregue ao cliente.',
    steps: [
      'Na aba "Equipamentos & Manutenção", clicar em "Novo Equipamento Instalado".',
      'Preencher TAG, Número de Série, Cliente, Endereço de Instalação e Vigência de Garantia.',
      'Salvar o cadastro.'
    ],
    expectedResult: 'Equipamento registrado com controle de horímetro, ciclos e status operacional.',
    status: 'passed'
  },
  {
    id: 'tc-ind-18',
    code: 'CT-IND-18',
    requirement: 'REQ-IND-18',
    title: 'Vinculação de Equipamento a Cliente e Endereço de Instalação',
    category: 'Industrial',
    preConditions: 'Equipamento instalado cadastrado.',
    steps: [
      'Consultar o dossiê do equipamento.',
      'Verificar dados da empresa cliente, responsável técnico e geolocalização da fábrica parceira.'
    ],
    expectedResult: 'Rastreabilidade completa do parque fabril instalado de clientes.',
    status: 'passed'
  },
  {
    id: 'tc-ind-19',
    code: 'CT-IND-19',
    requirement: 'REQ-IND-19',
    title: 'Criação de Plano de Manutenção Preventiva por Periodicidade/Horímetro',
    category: 'Industrial',
    preConditions: 'Equipamentos cadastrados.',
    steps: [
      'Criar Plano Preventivo definindo intervalo (dias ou horas de operação).',
      'Configurar checklist padrão e peças de troca recomendadas.',
      'Ativar o plano.'
    ],
    expectedResult: 'Plano preventivo ativo e associado aos modelos de máquinas industriais.',
    status: 'passed'
  },
  {
    id: 'tc-ind-20',
    code: 'CT-IND-20',
    requirement: 'REQ-IND-20',
    title: 'Geração de Ordem de Manutenção (OM) Preventiva Automática',
    category: 'Industrial',
    preConditions: 'Data de manutenção próxima ou atingimento de horímetro limite.',
    steps: [
      'O sistema identifica equipamentos com revisão preventiva a vencer.',
      'Gera a Ordem de Manutenção (OM) com checklist predefinido e notifica o responsável técnico.'
    ],
    expectedResult: 'OM preventiva aberta com prioridade e roteiro de inspeção associado.',
    status: 'passed'
  },
  {
    id: 'tc-ind-21',
    code: 'CT-IND-21',
    requirement: 'REQ-IND-21',
    title: 'Execução de Checklist Técnico de Manutenção com Observações',
    category: 'Industrial',
    preConditions: 'OM no status "Em Andamento".',
    steps: [
      'O técnico preenche cada item do checklist (Conforme, Não Conforme, Ajustado).',
      'Registra observações de calibração, pressão e temperatura.',
      'Salva o progresso.'
    ],
    expectedResult: 'Checklist auditável preenchido com evidências técnicas.',
    status: 'passed'
  },
  {
    id: 'tc-ind-22',
    code: 'CT-IND-22',
    requirement: 'REQ-IND-22',
    title: 'Apontamento de Peças Substituídas com Baixa no Almoxarifado',
    category: 'Industrial',
    preConditions: 'Substituição de peças de reposição durante a manutenção.',
    steps: [
      'Adicionar as peças substituídas na OM (ex: rolamentos, retentores, parafusos).',
      'Informar motivo da troca (Preventiva ou Quebra).',
      'Confirmar a baixa no estoque do almoxarifado.'
    ],
    expectedResult: 'Custo de peças somado à OM e saldo no almoxarifado debitado automaticamente.',
    status: 'passed'
  },
  {
    id: 'tc-ind-23',
    code: 'CT-IND-23',
    requirement: 'REQ-IND-23',
    title: 'Registro de Desgaste de Componentes e Vida Útil Remanescente',
    category: 'Industrial',
    preConditions: 'Inspeção de barramentos, guias ou elementos de desgaste.',
    steps: [
      'Registrar componente avaliado com nível de desgaste (Leve, Moderado, Crítico) e % estimada.',
      'Informar horas úteis remanescentes estimadas para próxima troca.'
    ],
    expectedResult: 'Histórico de desgaste registrado para planejamento preditivo de peças sobressalentes.',
    status: 'passed'
  },
  {
    id: 'tc-ind-24',
    code: 'CT-IND-24',
    requirement: 'REQ-IND-24',
    title: 'Aprovação Técnica e Assinatura Digital do Laudo da OM',
    category: 'Industrial',
    preConditions: 'OM com checklist 100% concluído e horas apontadas.',
    steps: [
      'Técnico executor finaliza o laudo da OM.',
      'Engenheiro/Gerente revisa e clica em "Aprovar Laudo Técnico".',
      'O sistema registra o carimbo de aprovação, data/hora e responsável.'
    ],
    expectedResult: 'OM marcada como "Aprovada" com assinatura técnica digital registrada.',
    status: 'passed'
  },
  {
    id: 'tc-ind-25',
    code: 'CT-IND-25',
    requirement: 'REQ-IND-25',
    title: 'Trava de Edição em OM Concluída e Aprovada (Imutabilidade)',
    category: 'Industrial',
    preConditions: 'OM aprovada pelo engenheiro responsável.',
    steps: [
      'Tentar editar valores de peças, checklist ou horas após aprovação.',
      'O sistema bloqueia qualquer alteração direta, exigindo reabertura formal por perfil Admin.'
    ],
    expectedResult: 'Imutabilidade do laudo técnico garantida para fins de conformidade e auditoria ISO/NR.',
    status: 'passed'
  },
  {
    id: 'tc-ind-26',
    code: 'CT-IND-26',
    requirement: 'REQ-IND-26',
    title: 'Sugestão Automática de Compras por Ponto de Pedido + Demanda de OPs',
    category: 'Industrial',
    preConditions: 'Insumos com demanda em OPs planejadas ou saldo abaixo do estoque mínimo.',
    steps: [
      'Acessar a aba "Sugestões de Compras & MRP".',
      'Verificar as sugestões geradas automaticamente calculando Déficit = (Demanda OPs + Estoque Mínimo) - Saldo Disponível.',
      'Visualizar a quantidade ideal de reposição.'
    ],
    expectedResult: 'Lista de compras prioritária gerada prevenindo desabastecimento na fábrica.',
    status: 'passed'
  },
  {
    id: 'tc-ind-27',
    code: 'CT-IND-27',
    requirement: 'REQ-IND-27',
    title: 'Matriz Comparativa de Fornecedores e Histórico de Preços',
    category: 'Industrial',
    preConditions: 'Fornecedores e histórico de compras cadastrados.',
    steps: [
      'Na sugestão de compra, clicar em "Ver Fornecedores & Histórico".',
      'Comparar os preços dos distribuidores e data da última aquisição.',
      'Identificar o fornecedor com melhor custo-benefício e prazo de entrega.'
    ],
    expectedResult: 'Matriz de decisão de suprimentos clara e fundamentada em dados históricos.',
    status: 'passed'
  },
  {
    id: 'tc-ind-28',
    code: 'CT-IND-28',
    requirement: 'REQ-IND-28',
    title: 'Conversão de Sugestão de Compra em Cotação Direta',
    category: 'Industrial',
    preConditions: 'Sugestão de compra de insumos aprovada pelo comprador.',
    steps: [
      'Selecionar os itens da sugestão de compra.',
      'Clicar em "Gerar Cotação / Pedido de Compra".',
      'Confirmar a abertura da cotação no módulo de Compras.'
    ],
    expectedResult: 'Cotação criada com os itens industriais integrados sem retrabalho de digitação.',
    status: 'passed'
  },
  {
    id: 'tc-ind-29',
    code: 'CT-IND-29',
    requirement: 'REQ-IND-29',
    title: 'Análise de Custos Industriais Previsto vs Realizado',
    category: 'Industrial',
    preConditions: 'OP concluída com apontamentos de insumos, MOD e retrabalhos.',
    steps: [
      'Acessar a aba "Análise de Custos Industriais".',
      'Comparar: Custo Unitário Previsto (BOM) vs Custo Unitário Realizado (Apontamentos).',
      'Analisar desvios percentuais por categoria (Matéria-Prima, Mão de Obra, Insumos).'
    ],
    expectedResult: 'Divergências e desvios de custo apontados com clareza para calibração da margem.',
    status: 'passed'
  },
  {
    id: 'tc-ind-30',
    code: 'CT-IND-30',
    requirement: 'REQ-IND-30',
    title: 'Alertas Operacionais de Risco de Parada e Desvio de Custo',
    category: 'Industrial',
    preConditions: 'Inconsistências ou gargalos na linha de produção.',
    steps: [
      'Consultar o painel de Alertas Operacionais no topo do PCP.',
      'Verificar cartões de severidade crítica (Falta de Material, Atraso de Roteiro, Desvio de Custo).',
      'Clicar na ação sugerida para resolução rápida.'
    ],
    expectedResult: 'Alertas ativos direcionam o gestor para ações preventivas imediatas.',
    status: 'passed'
  },
  {
    id: 'tc-ind-31',
    code: 'CT-IND-31',
    requirement: 'REQ-IND-31',
    title: 'Controle Granular de Permissões Industriais (RBAC)',
    category: 'Industrial',
    preConditions: 'Usuários com diferentes papéis operacionais (Operador, PCP, Engenheiro, Gerente).',
    steps: [
      'Acessar com perfil Operador e verificar restrição de exclusão de BOMs e aprovação de laudos.',
      'Acessar com perfil Engenheiro/Admin e verificar acesso total à edição de engenharia e laudos.'
    ],
    expectedResult: 'Permissões granulares de acesso aplicadas de acordo com a matriz de níveis de usuário.',
    status: 'passed'
  },
  {
    id: 'tc-ind-32',
    code: 'CT-IND-32',
    requirement: 'REQ-IND-32',
    title: 'Isolamento Multitenant de Dados Industriais por CompanyId',
    category: 'Industrial',
    preConditions: 'Múltiplas empresas cadastradas no sistema.',
    steps: [
      'Criar uma OP e BOM na Indústria Matriz (comp-5).',
      'Alternar para outra empresa cadastrada.',
      'Verificar que os dados industriais da Indústria Matriz não são visíveis no outro tenant.'
    ],
    expectedResult: 'Isolamento estrito por companyId garantindo privacidade total entre empresas do grupo.',
    status: 'passed'
  },
  {
    id: 'tc-ind-33',
    code: 'CT-IND-33',
    requirement: 'REQ-IND-33',
    title: 'Vínculo de OP a Pedido de Venda Comercial',
    category: 'Industrial',
    preConditions: 'Pedido de Venda Comercial ou Orçamento Comercial aprovado.',
    steps: [
      'Vincular o código do pedido de venda à OP.',
      'Acompanhar o status da produção diretamente no espelho da venda comercial.'
    ],
    expectedResult: 'Integração transparente entre o departamento de vendas e a fábrica.',
    status: 'passed'
  },
  {
    id: 'tc-ind-34',
    code: 'CT-IND-34',
    requirement: 'REQ-IND-34',
    title: 'Faturamento de Lote Produzido via NF-e Mod. 55 com Rastreio de Lote',
    category: 'Industrial',
    preConditions: 'Lote de produto acabado liberado pelo CQ.',
    steps: [
      'Gerar faturamento da venda do lote produzido.',
      'Verificar a inclusão dos dados de lote (número, fabricação, validade) na tag rastro da NF-e Mod. 55.'
    ],
    expectedResult: 'Emissão fiscal em conformidade com exigências SEFAZ para produtos rastreáveis.',
    status: 'passed'
  },
  {
    id: 'tc-ind-35',
    code: 'CT-IND-35',
    requirement: 'REQ-IND-35',
    title: 'Relatório Analítico de Eficiência OEE e Produtividade',
    category: 'Industrial',
    preConditions: 'Histórico de OPs executadas com apontamento de horas e perdas.',
    steps: [
      'Acessar "Relatórios Industriais" -> "Indicador OEE e Produtividade".',
      'Verificar os índices de Disponibilidade, Desempenho e Qualidade.',
      'Visualizar o percentual consolidado de OEE do parque fabril.'
    ],
    expectedResult: 'Métricas de classe mundial (OEE) consolidadas para apoio à tomada de decisão executiva.',
    status: 'passed'
  },
  {
    id: 'tc-ind-36',
    code: 'CT-IND-36',
    requirement: 'REQ-IND-36',
    title: 'Relatório de Indicadores de Manutenção MTBF e MTTR',
    category: 'Industrial',
    preConditions: 'Histórico de ordens de manutenção preventivas e corretivas.',
    steps: [
      'Acessar "Relatórios Industriais" -> "Indicadores de Manutenção".',
      'Verificar o Tempo Médio Entre Falhas (MTBF) e Tempo Médio de Reparo (MTTR) por equipamento.'
    ],
    expectedResult: 'Indicadores de confiabilidade e manutenibilidade calculados com exatidão.',
    status: 'passed'
  },
  {
    id: 'tc-ind-37',
    code: 'CT-IND-37',
    requirement: 'REQ-IND-37',
    title: 'Exportação de Laudo Técnico e Dossiê de Produção em PDF',
    category: 'Industrial',
    preConditions: 'OM ou OP concluída e aprovada.',
    steps: [
      'Clicar na ação "Imprimir / Exportar Dossiê PDF".',
      'Verificar o layout profissional contendo cabeçalho da empresa, dados técnicos, checklists, assinaturas e QR Code de autenticidade.'
    ],
    expectedResult: 'Dossiê técnico gerado com formatação de alta qualidade para entrega ao cliente ou auditoria.',
    status: 'passed'
  },

  // ==========================================
  // MÓDULO FINANCEIRO & FATURAMENTO - OFICINA (CT-FIN-OFC-01 a 10)
  // ==========================================
  {
    id: 'tc-fin-ofc-01',
    code: 'CT-FIN-OFC-01',
    requirement: 'REQ-FIN-OFC-01',
    title: 'Abertura e Execução de OS com Forma de Pagamento e Condição Faturada',
    category: 'Financeiro & Faturamento',
    preConditions: 'Veículo no pátio e serviços/peças adicionados na OS.',
    steps: [
      'Na Ordem de Serviço, selecionar a forma de pagamento (ex: PIX, Boleto ou A Prazo).',
      'Definir a condição de pagamento (À Vista ou A Prazo com parcelamento/faturamento).',
      'Finalizar a OS.'
    ],
    expectedResult: 'OS finalizada com distinção clara entre forma e condição de pagamento, sem conflito de liquidez.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-02',
    code: 'CT-FIN-OFC-02',
    requirement: 'REQ-FIN-OFC-02',
    title: 'Política de Faturamento Consolidado Semanal para Frotista (Empresa ABC)',
    category: 'Financeiro & Faturamento',
    preConditions: 'Cliente frotista cadastrado com política de Faturamento Semanal (Fechamento Sexta / Vencimento +7 dias).',
    steps: [
      'Abrir e finalizar múltiplas OSs para veículos da frota da Empresa ABC durante a semana.',
      'Verificar que o sistema associa as OSs à política cadastrada do frotista.'
    ],
    expectedResult: 'OSs vinculadas à política de consolidação semanal sem exigir parametrização manual a cada atendimento.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-03',
    code: 'CT-FIN-OFC-03',
    requirement: 'REQ-FIN-OFC-03',
    title: 'Opção "Acumular para Faturamento Consolidado" vs Faturamento Imediato por Venda',
    category: 'Financeiro & Faturamento',
    preConditions: 'Conclusão de OS de cliente conveniado.',
    steps: [
      'Na tela de fechamento da OS, selecionar "Acumular para Faturamento Consolidado".',
      'Finalizar a OS.',
      'Verificar que a OS recebe status de faturamento "Pendente de Fechamento".'
    ],
    expectedResult: 'OS acumulada na fila de fechamento periódico sem gerar títulos avulsos prematuros.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-04',
    code: 'CT-FIN-OFC-04',
    requirement: 'REQ-FIN-OFC-04',
    title: 'Sinal Antecipado via PIX + Saldo Restante Faturado para Fechamento Periódico',
    category: 'Financeiro & Faturamento',
    preConditions: 'OS de alto valor (ex: retífica de motor).',
    steps: [
      'No fechamento, registrar entrada de 30% via PIX imediato.',
      'Definir os 70% restantes para "Acumular para Faturamento Consolidado".',
      'Confirmar a transação.'
    ],
    expectedResult: 'PIX lançado imediatamente no Caixa/Fluxo e saldo de 70% enfileirado para o próximo fechamento.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-05',
    code: 'CT-FIN-OFC-05',
    requirement: 'REQ-FIN-OFC-05',
    title: 'Validação de Limite de Crédito do Cliente com Trava Gerencial',
    category: 'Financeiro & Faturamento',
    preConditions: 'Cliente com limite de crédito de R$ 5.000 e saldo devedor atual de R$ 4.200.',
    steps: [
      'Tentar finalizar uma OS faturada no valor de R$ 1.500 (total R$ 5.700).',
      'O sistema identifica o estouro de limite (R$ 700 acima).',
      'Bloqueia o faturamento automático e exige senha/autorização de Gerente.'
    ],
    expectedResult: 'Trava de segurança de limite de crédito atuando com precisão.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-06',
    code: 'CT-FIN-OFC-06',
    requirement: 'REQ-FIN-OFC-06',
    title: 'Rastreabilidade Estrita entre OS, Título e Histórico Veicular',
    category: 'Financeiro & Faturamento',
    preConditions: 'OS faturada individualmente.',
    steps: [
      'Consultar o título a receber gerado no Contas a Receber.',
      'Verificar os links bidirecionais: Código da OS, Placa do Veículo e Dossiê do Cliente.'
    ],
    expectedResult: 'Rastreabilidade 100% preservada da ordem até a conciliação.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-07',
    code: 'CT-FIN-OFC-07',
    requirement: 'REQ-FIN-OFC-07',
    title: 'Execução de Fechamento Consolidado Semanal de OSs da Empresa ABC',
    category: 'Financeiro & Faturamento',
    preConditions: 'Chegada da sexta-feira com 3 OSs acumuladas da Empresa ABC.',
    steps: [
      'Acessar a aba "Fechamentos Consolidados" no Contas a Receber.',
      'Filtrar pelo cliente "Empresa ABC" e selecionar as 3 OSs da semana.',
      'Clicar em "Gerar Fechamento de Faturamento Consolidado".',
      'O sistema calcula a data de vencimento (+7 dias).'
    ],
    expectedResult: 'Fechamento gerado (código FCH), OSs marcadas como faturadas e 1 Título Consolidado gerado.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-08',
    code: 'CT-FIN-OFC-08',
    requirement: 'REQ-FIN-OFC-08',
    title: 'Emissão de Extrato / Espelho Consolidado de OSs para o Frotista',
    category: 'Financeiro & Faturamento',
    preConditions: 'Fechamento consolidado realizado.',
    steps: [
      'No fechamento, clicar em "Ver Espelho / Extrato de Faturamento".',
      'Verificar o detalhamento: placas, datas, motoristas, serviços, peças e valor total consolidado.'
    ],
    expectedResult: 'Demonstrativo claro e pronto para auditoria do setor financeiro do cliente.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-09',
    code: 'CT-FIN-OFC-09',
    requirement: 'REQ-FIN-OFC-09',
    title: 'Baixa de Título Consolidado com Entrada Automática no Fluxo de Caixa',
    category: 'Financeiro & Faturamento',
    preConditions: 'Título consolidado da Empresa ABC pendente de pagamento.',
    steps: [
      'Efetuar a baixa do título informando data de recebimento e conta bancária.',
      'Consultar o Fluxo de Caixa e DRE.'
    ],
    expectedResult: 'Título liquidado e receita registrada com vínculo ao fechamento.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ofc-10',
    code: 'CT-FIN-OFC-10',
    requirement: 'REQ-FIN-OFC-10',
    title: 'Garantia de Idempotência e Bloqueio de Duplicação de Título ou Baixa',
    category: 'Financeiro & Faturamento',
    preConditions: 'OS já inclusa em fechamento consolidado ou faturada.',
    steps: [
      'Tentar faturar a mesma OS novamente ou incluí-la em um segundo fechamento.',
      'O sistema bloqueia a ação informando que a OS já possui vínculo financeiro ativo.'
    ],
    expectedResult: 'Idempotência rigorosa garantida em todas as operações de faturamento.',
    status: 'passed'
  },

  // ==========================================
  // MÓDULO FINANCEIRO & FATURAMENTO - COMÉRCIO (CT-FIN-COM-01 a 10)
  // ==========================================
  {
    id: 'tc-fin-com-01',
    code: 'CT-FIN-COM-01',
    requirement: 'REQ-FIN-COM-01',
    title: 'Venda Balcão com Múltiplas Formas de Pagamento (Split de Pagamentos)',
    category: 'Financeiro & Faturamento',
    preConditions: 'Carrinho de compras com total de R$ 500,00.',
    steps: [
      'Selecionar a forma de pagamento "Múltiplas Formas de Pagamento".',
      'Distribuir: R$ 100,00 no Dinheiro, R$ 200,00 no PIX e R$ 200,00 no Cartão em 2x.',
      'Confirmar que a soma totaliza exatamente R$ 500,00.',
      'Finalizar a venda.'
    ],
    expectedResult: 'Venda finalizada com múltiplos recebimentos registrados com exatidão.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-02',
    code: 'CT-FIN-COM-02',
    requirement: 'REQ-FIN-COM-02',
    title: 'Validação de Soma dos Pagamentos (Divergência Não Justificada Bloqueia)',
    category: 'Financeiro & Faturamento',
    preConditions: 'Carrinho no valor de R$ 500,00 em modo Múltiplas Formas.',
    steps: [
      'Informar R$ 300,00 no PIX e R$ 100,00 no Cartão (Total R$ 400,00, diferença de R$ 100,00).',
      'Tentar clicar em "Finalizar Venda".',
      'O sistema exibe alerta de inconsistência e impede o fechamento.'
    ],
    expectedResult: 'Bloqueio estrito de finalização enquanto houver diferença não justificada.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-03',
    code: 'CT-FIN-COM-03',
    requirement: 'REQ-FIN-COM-03',
    title: 'Venda Balcão para Cliente Faturado Mensal (Empresa XYZ - Fechamento 30 / Vencimento 10)',
    category: 'Financeiro & Faturamento',
    preConditions: 'Cliente Empresa XYZ selecionado no PDV.',
    steps: [
      'O sistema exibe a identificação da política: "Faturamento Mensal (Fechamento 30 / Vencimento dia 10)".',
      'Forma de pagamento padrão ajustada para Boleto / A Prazo.',
      'Finalizar a venda.'
    ],
    expectedResult: 'Venda balcão registrada com dados fiscais e financeiros configurados para a política corporativa.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-04',
    code: 'CT-FIN-COM-04',
    requirement: 'REQ-FIN-COM-04',
    title: 'Opção "Acumular para Faturamento Consolidado" no Fechamento da Venda Balcão',
    category: 'Financeiro & Faturamento',
    preConditions: 'Venda no PDV para cliente corporativo.',
    steps: [
      'Marcar a opção "Acumular para Faturamento Consolidado".',
      'Finalizar a venda.',
      'Consultar a lista de vendas balcão.'
    ],
    expectedResult: 'Venda gravada com billingStatus "pending_billing", pronta para o fechamento mensal.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-05',
    code: 'CT-FIN-COM-05',
    requirement: 'REQ-FIN-COM-05',
    title: 'Rastreamento Individual de Cada Venda Balcão Acumulada',
    category: 'Financeiro & Faturamento',
    preConditions: 'Múltiplas vendas efetuadas para a Empresa XYZ ao longo do mês.',
    steps: [
      'Consultar as vendas pendentes de faturamento da Empresa XYZ.',
      'Verificar que cada venda mantém seu código VEN, operador, data/hora e itens preservados individualmente.'
    ],
    expectedResult: 'Rastreabilidade granular de cada venda mantida mesmo em modo acumulado.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-06',
    code: 'CT-FIN-COM-06',
    requirement: 'REQ-FIN-COM-06',
    title: 'Fechamento Mensal Consolidado de Compras da Empresa XYZ (Dia 30)',
    category: 'Financeiro & Faturamento',
    preConditions: 'Fim do mês com 4 vendas acumuladas da Empresa XYZ.',
    steps: [
      'No Contas a Receber, selecionar todas as vendas pendentes da Empresa XYZ.',
      'Clicar em "Gerar Fechamento de Faturamento Consolidado".',
      'O sistema calcula a data de vencimento para o dia 10 do mês subsequente.'
    ],
    expectedResult: 'Fechamento consolidado gerado com vencimento exato no dia 10.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-07',
    code: 'CT-FIN-COM-07',
    requirement: 'REQ-FIN-COM-07',
    title: 'Geração de Título Único Consolidado de Contas a Receber',
    category: 'Financeiro & Faturamento',
    preConditions: 'Fechamento mensal da Empresa XYZ concluído.',
    steps: [
      'Acessar a aba "Títulos a Receber".',
      'Localizar o título único gerado pelo fechamento com a somatória exata das 4 vendas.'
    ],
    expectedResult: 'Título único consolidado emitido contendo o extrato e IDs de todas as vendas associadas.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-08',
    code: 'CT-FIN-COM-08',
    requirement: 'REQ-FIN-COM-08',
    title: 'Emissão de Boleto Bancário Único do Fechamento Consolidado',
    category: 'Financeiro & Faturamento',
    preConditions: 'Título consolidado gerado.',
    steps: [
      'No título consolidado, clicar em "Emitir Boleto Bancário".',
      'Verificar a geração do boleto com linha digitável, código de barras e demonstrativo das notas/vendas no corpo do boleto.'
    ],
    expectedResult: 'Boleto bancário único gerado sem necessidade de emitir um boleto por venda avulsa.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-09',
    code: 'CT-FIN-COM-09',
    requirement: 'REQ-FIN-COM-09',
    title: 'Cancelamento / Estorno de Venda Acumulada antes do Fechamento',
    category: 'Financeiro & Faturamento',
    preConditions: 'Venda balcão acumulada ainda não faturada em fechamento.',
    steps: [
      'Solicitar o cancelamento da venda no módulo de Vendas.',
      'Confirmar a devolução dos itens ao estoque e a remoção da venda da fila de fechamento.'
    ],
    expectedResult: 'Venda cancelada, itens estornados e fila de fechamento atualizada sem inconsistências.',
    status: 'passed'
  },
  {
    id: 'tc-fin-com-10',
    code: 'CT-FIN-COM-10',
    requirement: 'REQ-FIN-COM-10',
    title: 'Trilha de Auditoria Imutável para Fechamentos e Baixas Financeiras',
    category: 'Financeiro & Faturamento',
    preConditions: 'Operações financeiras executadas por diferentes operadores.',
    steps: [
      'Acessar a Trilha de Auditoria no menu lateral.',
      'Filtrar por eventos de Fechamento Consolidado, Split de Pagamento e Baixa de Títulos.'
    ],
    expectedResult: 'Logs imutáveis registrados com data/hora, IP, usuário e valores envolvidos.',
    status: 'passed'
  },

  // ==========================================
  // MÓDULO FINANCEIRO & FATURAMENTO - INDÚSTRIA & CONCILIAÇÃO (CT-FIN-IND-01 a 10)
  // ==========================================
  {
    id: 'tc-fin-ind-01',
    code: 'CT-FIN-IND-01',
    requirement: 'REQ-FIN-IND-01',
    title: 'Faturamento Consolidado de Pedidos de Produção e Fornecimento Seriado',
    category: 'Financeiro & Faturamento',
    preConditions: 'Entregas periódicas de lotes de peças industriais para a Metalúrgica Sul.',
    steps: [
      'Acumular 3 remessas de produção entregues na quinzena.',
      'Executar o fechamento quinzenal gerando NF-e Mod. 55 e título único com rastreabilidade dos lotes.'
    ],
    expectedResult: 'Faturamento industrial consolidado com vínculo aos lotes e certificados de qualidade.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-02',
    code: 'CT-FIN-IND-02',
    requirement: 'REQ-FIN-IND-02',
    title: 'Condição de Pagamento 30/60/90 Dias com Cálculo Preciso de Parcelas',
    category: 'Financeiro & Faturamento',
    preConditions: 'Faturamento de pedido industrial no valor de R$ 30.000,00.',
    steps: [
      'Selecionar a condição "30/60/90 Dias".',
      'O sistema gera 3 parcelas de R$ 10.000,00 com vencimentos escalonados a cada 30 dias.'
    ],
    expectedResult: 'Parcelamento calculado com exatidão e títulos provisionados no Contas a Receber.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-03',
    code: 'CT-FIN-IND-03',
    requirement: 'REQ-FIN-IND-03',
    title: 'Importação de Extrato Bancário (OFX / CSV) para Conciliação',
    category: 'Financeiro & Faturamento',
    preConditions: 'Extrato bancário contendo créditos e débitos da conta corrente.',
    steps: [
      'No módulo Financeiro, acessar "Conciliação Bancária".',
      'Importar o arquivo de extrato bancário.',
      'O sistema mapeia todas as linhas de lançamento.'
    ],
    expectedResult: 'Extrato carregado com identificação de data, documento, valor e descrição.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-04',
    code: 'CT-FIN-IND-04',
    requirement: 'REQ-FIN-IND-04',
    title: 'Casamento Automático de Lançamentos de Extrato com Títulos a Receber',
    category: 'Financeiro & Faturamento',
    preConditions: 'Lançamento de crédito de R$ 1.850,00 no extrato referente ao fechamento FCH-2026-0001.',
    steps: [
      'O motor de conciliação cruza valor e código do cliente.',
      'Sugere o casamento com o título a receber correspondente.',
      'Operador confirma a conciliação.'
    ],
    expectedResult: 'Título baixado automaticamente com conciliação bancária confirmada.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-05',
    code: 'CT-FIN-IND-05',
    requirement: 'REQ-FIN-IND-05',
    title: 'Tratamento de Divergência de Juros, Descontos e Tarifas Bancárias',
    category: 'Financeiro & Faturamento',
    preConditions: 'Título de R$ 1.000,00 recebido com juros por atraso no valor de R$ 1.035,00 no extrato.',
    steps: [
      'Na conciliação, identificar a diferença de R$ 35,00.',
      'Classificar a diferença como "Receita de Juros / Multa".',
      'Efetivar a baixa e o lançamento contábil.'
    ],
    expectedResult: 'Título liquidado a 100% e receita de juros contabilizada no DRE.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-06',
    code: 'CT-FIN-IND-06',
    requirement: 'REQ-FIN-IND-06',
    title: 'Idempotência de Conciliação Bancária (Impedir Reconciliação Dupla)',
    category: 'Financeiro & Faturamento',
    preConditions: 'Linha de extrato já conciliada com título.',
    steps: [
      'Tentar conciliar a mesma linha de extrato com um segundo título.',
      'O sistema bloqueia a ação e sinaliza que o lançamento já foi conciliado.'
    ],
    expectedResult: 'Idempotência estrita protegendo o saldo bancário de duplicações.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-07',
    code: 'CT-FIN-IND-07',
    requirement: 'REQ-FIN-IND-07',
    title: 'Isolamento Multitenant Financeiro por CompanyId',
    category: 'Financeiro & Faturamento',
    preConditions: 'Múltiplas empresas cadastradas no MotorDesk.',
    steps: [
      'Gerar títulos e conciliações na empresa Matriz.',
      'Alternar para a empresa Filial e verificar que os dados financeiros da Matriz são totalmente isolados.'
    ],
    expectedResult: 'Isolamento multi-empresa perfeito em todas as rotinas financeiras.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-08',
    code: 'CT-FIN-IND-08',
    requirement: 'REQ-FIN-IND-08',
    title: 'Demonstrativo DRE com Segregação de Venda Balcão, OS e Faturamento Periódico',
    category: 'Financeiro & Faturamento',
    preConditions: 'Movimentações financeiras realizadas em todos os segmentos.',
    steps: [
      'Acessar a aba "DRE & Resultados" no Financeiro.',
      'Verificar a abertura das receitas: Vendas Balcão, Serviços Mecânicos de OS e Faturamentos Consolidados.'
    ],
    expectedResult: 'DRE consolidado com visualização transparente da margem e origem das receitas.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-09',
    code: 'CT-FIN-IND-09',
    requirement: 'REQ-FIN-IND-09',
    title: 'Trava de Edição em Títulos e Fechamentos Conciliados (Imutabilidade)',
    category: 'Financeiro & Faturamento',
    preConditions: 'Título com status "paid" e conciliação bancária confirmada.',
    steps: [
      'Tentar alterar valores ou excluir o título.',
      'O sistema bloqueia a operação para preservar a conformidade contábil e fiscal.'
    ],
    expectedResult: 'Imutabilidade contábil garantida.',
    status: 'passed'
  },
  {
    id: 'tc-fin-ind-10',
    code: 'CT-FIN-IND-10',
    requirement: 'REQ-FIN-IND-10',
    title: 'Exportação do Extrato de Fechamento Consolidado em PDF e Relatório Financeiro',
    category: 'Financeiro & Faturamento',
    preConditions: 'Fechamento consolidado realizado.',
    steps: [
      'Clicar em "Exportar Extrato PDF".',
      'Verificar a formatação executiva contendo discriminação de vendas, impostos, vencimentos e QR Code de validação.'
    ],
    expectedResult: 'Documento PDF com layout corporativo de alta qualidade gerado com sucesso.',
    status: 'passed'
  },

  // ==========================================
  // TESTE FINAL PONTA A PONTA (CT-FIN-E2E-01)
  // ==========================================
  {
    id: 'tc-fin-e2e-01',
    code: 'CT-FIN-E2E-01',
    requirement: 'REQ-FIN-E2E-01',
    title: 'Fluxo Completo Ponta a Ponta: Vendas Múltiplas + OS + Fechamento + Boleto + Conciliação',
    category: 'Financeiro & Faturamento',
    preConditions: 'Ambiente com clientes corporativos, catálogo de peças e serviços.',
    steps: [
      '1. Realizar 2 vendas de peças no balcão para a Empresa ABC com a opção "Acumular para Faturamento".',
      '2. Finalizar 1 Ordem de Serviço da frota da Empresa ABC também em modo "Acumular para Faturamento".',
      '3. Executar o Fechamento Consolidado Semanal gerando 1 Título Único de Contas a Receber com vencimento em +7 dias.',
      '4. Emitir o Boleto Bancário consolidado correspondente.',
      '5. Simular a importação do extrato bancário com o crédito do valor total.',
      '6. Efetuar o casamento e conciliação bancária com baixa automática e idempotente do título.',
      '7. Verificar a atualização do Caixa, DRE e a impossibilidade de reprocessar qualquer uma das vendas.'
    ],
    expectedResult: 'Fluxo integrado de ponta a ponta executado com 100% de integridade, rastreabilidade e idempotência contábil.',
    status: 'passed'
  },
  {
    id: 'tc-lic-11',
    code: 'CT-LIC-11',
    requirement: 'RN-LIC-01 / RBAC-01',
    title: 'Módulo retirado do contrato → acesso imediatamente bloqueado',
    category: 'Licenciamento & Multi-tenant',
    preConditions: 'Empresa com módulo anteriormente contratado (ex: Fiscal ou Orçamentos) e usuários com permissões ativas.',
    steps: [
      '1. Desativar o módulo no contrato/assinatura da empresa na Gestão Multi-Empresa.',
      '2. Salvar as alterações da empresa.',
      '3. Tentar acessar o módulo ou rota com qualquer usuário da empresa (inclusive Administrador).',
      '4. Verificar bloqueio imediato com tela de módulo bloqueado/não contratado e ausência do item no menu.'
    ],
    expectedResult: 'O acesso ao módulo é bloqueado instantaneamente para todos os usuários da empresa ao ser desativado na licença.',
    status: 'passed'
  },
  {
    id: 'tc-lic-12',
    code: 'CT-LIC-12',
    requirement: 'RN-LIC-02 / DATA-01',
    title: 'Módulo retirado → dados históricos permanecem preservados',
    category: 'Licenciamento & Integridade de Dados',
    preConditions: 'Empresa com registros existentes (ex: Ordens de Serviço ou Títulos Fiscais).',
    steps: [
      '1. Cadastrar registros no módulo ativo.',
      '2. Remover o módulo do contrato da empresa.',
      '3. Verificar no banco de dados / reativar o módulo posteriormente.',
      '4. Confirmar que nenhum registro histórico foi deletado ou corrompido.'
    ],
    expectedResult: 'Os dados históricos são 100% preservados no banco de dados e tornam-se acessíveis novamente quando o módulo for recontratado.',
    status: 'passed'
  },
  {
    id: 'tc-lic-13',
    code: 'CT-LIC-13',
    requirement: 'RN-LIC-03 / SAAS-01',
    title: 'Novo módulo contratado → licença ativada',
    category: 'Licenciamento & Multi-tenant',
    preConditions: 'Empresa com módulo não contratado.',
    steps: [
      '1. Acessar a Gestão Multi-Empresa e marcar o módulo como contratado.',
      '2. Emitir o Termo Aditivo / Salvar a assinatura.',
      '3. Acessar com usuário Administrador.',
      '4. Verificar que a licença está ativa e o módulo disponível para configuração de acessos.'
    ],
    expectedResult: 'A licença do módulo é ativada imediatamente na empresa após a contratação.',
    status: 'passed'
  },
  {
    id: 'tc-lic-14',
    code: 'CT-LIC-14',
    requirement: 'RN-LIC-04 / RBAC-02',
    title: 'Novo módulo contratado → administrador consegue liberar para grupo',
    category: 'Licenciamento & RBAC',
    preConditions: 'Novo módulo contratado pela empresa na licença.',
    steps: [
      '1. Administrador acessa a Gestão de Grupos de Acesso (RBAC).',
      '2. Seleciona o grupo desejado (ex: Consultores Técnicos).',
      '3. Marca a permissão do módulo recém-contratado.',
      '4. Usuários membros do grupo passam a acessar as funcionalidades operacionais liberadas.'
    ],
    expectedResult: 'O administrador consegue delegar permissões granulares do módulo contratado para grupos de acesso com sucesso.',
    status: 'passed'
  },
  {
    id: 'tc-lic-15',
    code: 'CT-LIC-15',
    requirement: 'RN-LIC-05 / TENANT-01',
    title: 'Empresa A não consegue acessar licença da Empresa B',
    category: 'Multi-tenant & Isolamento',
    preConditions: 'Empresa A possui módulo contratado (ex: Fiscal) e Empresa B NÃO possui.',
    steps: [
      '1. Logar com usuário da Empresa B.',
      '2. Tentar visualizar ou executar rotinas do módulo pertencente à Empresa A.',
      '3. Inspecionar o scoped database e permissões efetivas.',
      '4. Verificar isolamento estrito de licença e dados entre os tenants.'
    ],
    expectedResult: 'Isolamento rigoroso: a Empresa B não herda e não acessa licenças ou dados da Empresa A.',
    status: 'passed'
  },
  {
    id: 'tc-lic-16',
    code: 'CT-LIC-16',
    requirement: 'RN-LIC-06 / AUDIT-01',
    title: 'Alteração de módulo gera auditoria',
    category: 'Auditoria & Segurança',
    preConditions: 'Administrador logado.',
    steps: [
      '1. Alterar a contratação de um módulo na empresa.',
      '2. Salvar a assinatura.',
      '3. Acessar a Trilha de Auditoria do sistema.',
      '4. Verificar o registro de log com operador, timestamp, valores anteriores e novos valores.'
    ],
    expectedResult: 'Todas as alterações de licença e módulos contratuais geram entradas imutáveis na Trilha de Auditoria.',
    status: 'passed'
  },
  {
    id: 'tc-lic-17',
    code: 'CT-LIC-17',
    requirement: 'RN-LIC-07 / SECURITY-01',
    title: 'Usuário sem permissão não recebe dados do módulo',
    category: 'Segurança & Zero-Leakage',
    preConditions: 'Usuário sem permissão a determinado módulo (ex: Contas a Receber).',
    steps: [
      '1. Inspecionar a carga de dados retornada pelo scopedDb.',
      '2. Confirmar que coleções restritas são retornadas como vazias [].',
      '3. Verificar que nenhum dado confidencial é exposto na camada de renderização.'
    ],
    expectedResult: 'Proteção zero-leakage: o usuário sem permissão não recebe dados estruturais ou registros do módulo.',
    status: 'passed'
  },
  {
    id: 'tc-lic-18',
    code: 'CT-LIC-18',
    requirement: 'RN-LIC-08 / SECURITY-02',
    title: 'Acesso por URL direta não contorna RBAC',
    category: 'Segurança & Roteamento',
    preConditions: 'Usuário comum tenta acessar diretamente via URL ou manipulando o estado de navegação.',
    steps: [
      '1. Simular tentativa de navegação direta para uma View restrita ou não contratada.',
      '2. O sistema intercepta o acesso via guards e getEffectivePermissions / isModuleLocked.',
      '3. Exibe a tela de bloqueio e/ou redireciona para a tela padrão permitida.'
    ],
    expectedResult: 'Tentativas de navegação direta não contornam as camadas de Licenciamento e RBAC.',
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
    nature: 'expense',
    classification: 'variable',
    totalAmount: 1850.00,
    paidAmount: 1850.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-07-15',
    createdAt: '2026-06-25T09:00:00Z',
    nfeNumber: '4012',
    nfeSeries: '1',
    nfeAccessKey: '35260612345678000190550010000040121000040129',
    boletoBankName: 'Banco do Brasil',
    boletoLinhaDigitavel: '00190.00009 01234.567802 00000.000171 1 97750000185000',
    boletoBarcode: '00191977500001850000000001234567800000000017',
    attachments: [
      {
        id: 'att-1',
        name: 'Boleto_BB_Amortecedores_CP-001.pdf',
        type: 'boleto',
        fileSize: '245 KB',
        uploadedAt: '2026-06-25T09:15:00Z',
        uploadedByName: 'Carlos Santos (Gerente)',
        amount: 1850.00,
        dueDate: '2026-07-15'
      },
      {
        id: 'att-2',
        name: 'Comprovante_Pix_Quitacao_1850.pdf',
        type: 'receipt',
        fileSize: '180 KB',
        uploadedAt: '2026-07-15T14:20:00Z',
        uploadedByName: 'Carlos Santos (Gerente)',
        amount: 1850.00
      }
    ],
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
        paymentMethod: 'Transferência / PIX',
        boletoLinhaDigitavel: '00190.00009 01234.567802 00000.000171 1 97750000185000',
        boletoBarcode: '00191977500001850000000001234567800000000017',
        boletoBankName: 'Banco do Brasil'
      }
    ]
  },
  {
    id: 'cp-2',
    code: 'CP-2026-002',
    supplierId: 'sup-2',
    supplierName: 'EletroAuto Soluções Elétricas',
    description: 'Baterias Moura 60Ah e Cabos de Velas NGK (NFe #5502)',
    category: 'Peças / Fornecedores',
    nature: 'expense',
    classification: 'variable',
    totalAmount: 1380.00,
    paidAmount: 460.00,
    remainingAmount: 920.00,
    status: 'partially_paid',
    dueDate: '2026-09-10',
    createdAt: '2026-07-10T11:00:00Z',
    nfeNumber: '5502',
    nfeSeries: '1',
    nfeAccessKey: '35260712345678000190550010000055021000055024',
    boletoBankName: 'Itaú Unibanco',
    boletoLinhaDigitavel: '34191.09008 00000.123450 00000.000000 1 98010000046000',
    boletoBarcode: '34191980100000460001090000000123450000000000',
    paymentCondition: '3x Boletos Bancários (30/60/90 dias)',
    attachments: [
      {
        id: 'att-3',
        name: 'DANFE_NFe_5502_EletroAuto.pdf',
        type: 'nfe',
        fileSize: '310 KB',
        uploadedAt: '2026-07-10T11:05:00Z',
        uploadedByName: 'Ana Lima (Atendimento)',
        nfeNumber: '5502',
        nfeAccessKey: '35260712345678000190550010000055021000055024'
      },
      {
        id: 'att-4',
        name: 'Boleto_Itau_Parc1_EletroAuto.pdf',
        type: 'boleto',
        fileSize: '190 KB',
        uploadedAt: '2026-07-10T11:05:00Z',
        uploadedByName: 'Ana Lima (Atendimento)',
        amount: 460.00,
        installmentNumber: 1,
        dueDate: '2026-07-10'
      },
      {
        id: 'att-5',
        name: 'Boleto_Itau_Parc2_EletroAuto.pdf',
        type: 'boleto',
        fileSize: '190 KB',
        uploadedAt: '2026-07-10T11:05:00Z',
        uploadedByName: 'Ana Lima (Atendimento)',
        amount: 460.00,
        installmentNumber: 2,
        dueDate: '2026-08-10'
      },
      {
        id: 'att-6',
        name: 'Boleto_Itau_Parc3_EletroAuto.pdf',
        type: 'boleto',
        fileSize: '190 KB',
        uploadedAt: '2026-07-10T11:05:00Z',
        uploadedByName: 'Ana Lima (Atendimento)',
        amount: 460.00,
        installmentNumber: 3,
        dueDate: '2026-09-10'
      },
      {
        id: 'att-7',
        name: 'Comprovante_Pagto_Parc1_PIX.pdf',
        type: 'receipt',
        fileSize: '140 KB',
        uploadedAt: '2026-07-10T11:30:00Z',
        uploadedByName: 'Carlos Santos (Gerente)',
        amount: 460.00,
        installmentNumber: 1
      }
    ],
    installments: [
      {
        id: 'parc-p2-1',
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 460.00,
        paidAmount: 460.00,
        dueDate: '2026-07-10',
        status: 'paid',
        paymentDate: '2026-07-10T11:30:00Z',
        paymentMethod: 'PIX Bancário',
        boletoLinhaDigitavel: '34191.09008 00000.123450 00000.000000 1 98010000046000',
        boletoBarcode: '34191980100000460001090000000123450000000000',
        boletoBankName: 'Itaú Unibanco'
      },
      {
        id: 'parc-p2-2',
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 460.00,
        paidAmount: 0,
        dueDate: '2026-08-10',
        status: 'pending',
        boletoLinhaDigitavel: '34191.09008 00000.123468 00000.000000 1 98320000046000',
        boletoBarcode: '34191983200000460001090000000123460000000000',
        boletoBankName: 'Itaú Unibanco'
      },
      {
        id: 'parc-p2-3',
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 460.00,
        paidAmount: 0,
        dueDate: '2026-09-10',
        status: 'pending',
        boletoLinhaDigitavel: '34191.09008 00000.123476 00000.000000 1 98630000046000',
        boletoBarcode: '34191986300000460001090000000123470000000000',
        boletoBankName: 'Itaú Unibanco'
      }
    ]
  },
  {
    id: 'cp-3',
    code: 'CP-2026-003',
    supplierId: 'sup-3',
    supplierName: 'Distribuidora Central de Pneus & Freios',
    description: 'Lote de Pneus Pirelli 205/55R16 e Discos Fremax (NFe #8912)',
    category: 'Peças / Fornecedores',
    nature: 'expense',
    classification: 'variable',
    totalAmount: 2400.00,
    paidAmount: 1200.00,
    remainingAmount: 1200.00,
    status: 'partially_paid',
    dueDate: '2026-09-20',
    createdAt: '2026-07-20T14:00:00Z',
    nfeNumber: '8912',
    nfeSeries: '2',
    nfeAccessKey: '35260799887766000188550020000089121000089128',
    boletoBankName: 'Bradesco',
    boletoLinhaDigitavel: '23790.09006 90000.123452 00000.000171 2 98110000120000',
    boletoBarcode: '23792981100001200000090000000123450000000000',
    paymentCondition: '2x Boletos Bradesco',
    attachments: [
      {
        id: 'att-8',
        name: 'DANFE_NFe_8912_Pneus.pdf',
        type: 'nfe',
        fileSize: '420 KB',
        uploadedAt: '2026-07-20T14:10:00Z',
        uploadedByName: 'Carlos Santos (Gerente)'
      },
      {
        id: 'att-9',
        name: 'Boleto_Bradesco_Parc1_Pneus.pdf',
        type: 'boleto',
        fileSize: '210 KB',
        uploadedAt: '2026-07-20T14:10:00Z',
        uploadedByName: 'Carlos Santos (Gerente)'
      },
      {
        id: 'att-10',
        name: 'Boleto_Bradesco_Parc2_Pneus.pdf',
        type: 'boleto',
        fileSize: '210 KB',
        uploadedAt: '2026-07-20T14:10:00Z',
        uploadedByName: 'Carlos Santos (Gerente)'
      }
    ],
    installments: [
      {
        id: 'parc-p3-1',
        installmentNumber: 1,
        totalInstallments: 2,
        amount: 1200.00,
        paidAmount: 1200.00,
        dueDate: '2026-08-20',
        status: 'paid',
        paymentDate: '2026-08-20T10:15:00Z',
        paymentMethod: 'Boleto Bancário',
        boletoLinhaDigitavel: '23790.09006 90000.123452 00000.000171 2 98110000120000',
        boletoBarcode: '23792981100001200000090000000123450000000000',
        boletoBankName: 'Bradesco'
      },
      {
        id: 'parc-p3-2',
        installmentNumber: 2,
        totalInstallments: 2,
        amount: 1200.00,
        paidAmount: 0,
        dueDate: '2026-09-20',
        status: 'pending',
        boletoLinhaDigitavel: '23790.09006 90000.123460 00000.000171 2 98420000120000',
        boletoBarcode: '23792984200001200000090000000123460000000000',
        boletoBankName: 'Bradesco'
      }
    ]
  },
  {
    id: 'cp-4',
    code: 'CP-2026-004',
    supplierId: 'sup-fix-1',
    supplierName: 'Imobiliária & Empreendimentos Santa Bárbara',
    description: 'Aluguel Predial do Galpão da Oficina & Loja Balcão',
    category: 'Aluguel',
    nature: 'expense',
    classification: 'fixed',
    periodicity: 'monthly',
    isRecurring: true,
    origin: 'rent',
    totalAmount: 4800.00,
    paidAmount: 4800.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-08-10',
    createdAt: '2026-08-01T08:00:00Z',
    boletoBankName: 'Itaú Unibanco',
    installments: [
      {
        id: 'parc-p4-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 4800.00,
        paidAmount: 4800.00,
        dueDate: '2026-08-10',
        status: 'paid',
        paymentDate: '2026-08-09T14:30:00Z',
        paymentMethod: 'Transferência Bancária / TED'
      }
    ]
  },
  {
    id: 'cp-5',
    code: 'CP-2026-005',
    supplierId: 'sup-fix-2',
    supplierName: 'CPFL Energia / Enel Distribuição Paulista',
    description: 'Fatura de Energia Elétrica & Força Motriz da Oficina',
    category: 'Energia Elétrica',
    nature: 'expense',
    classification: 'fixed',
    periodicity: 'monthly',
    isRecurring: true,
    origin: 'other',
    totalAmount: 1850.00,
    paidAmount: 1850.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-08-15',
    createdAt: '2026-08-02T10:00:00Z',
    boletoBankName: 'Banco do Brasil',
    installments: [
      {
        id: 'parc-p5-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 1850.00,
        paidAmount: 1850.00,
        dueDate: '2026-08-15',
        status: 'paid',
        paymentDate: '2026-08-14T09:10:00Z',
        paymentMethod: 'PIX Bancário'
      }
    ]
  },
  {
    id: 'cp-6',
    code: 'CP-2026-006',
    supplierId: 'sup-fix-3',
    supplierName: 'Folha de Pagamento - Salários e Encargos Equipe',
    description: 'Folha Salarial Mensal dos Mecânicos, Atendentes e Estoquista',
    category: 'Salários & Encargos',
    nature: 'expense',
    classification: 'fixed',
    periodicity: 'monthly',
    isRecurring: true,
    origin: 'salary',
    totalAmount: 13500.00,
    paidAmount: 13500.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-08-05',
    createdAt: '2026-08-01T08:00:00Z',
    installments: [
      {
        id: 'parc-p6-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 13500.00,
        paidAmount: 13500.00,
        dueDate: '2026-08-05',
        status: 'paid',
        paymentDate: '2026-08-05T11:00:00Z',
        paymentMethod: 'Transferência Bancária / PIX'
      }
    ]
  },
  {
    id: 'cp-7',
    code: 'CP-2026-007',
    supplierId: 'sup-fix-4',
    supplierName: 'Vivo Fibra Dedicada Empresarial',
    description: 'Internet Fibra 600MB + Telefonia VoIP & Atendimento',
    category: 'Telecom & Internet',
    nature: 'expense',
    classification: 'fixed',
    periodicity: 'monthly',
    isRecurring: true,
    origin: 'other',
    totalAmount: 380.00,
    paidAmount: 380.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-08-18',
    createdAt: '2026-08-03T10:00:00Z',
    installments: [
      {
        id: 'parc-p7-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 380.00,
        paidAmount: 380.00,
        dueDate: '2026-08-18',
        status: 'paid',
        paymentDate: '2026-08-17T15:40:00Z',
        paymentMethod: 'Débito Automático'
      }
    ]
  },
  {
    id: 'cp-8',
    code: 'CP-2026-008',
    supplierId: 'sup-fix-5',
    supplierName: 'Escritório Contábil Santana & Associados',
    description: 'Honorários de Assessoria Contábil e Fiscal Mensal',
    category: 'Contabilidade',
    nature: 'expense',
    classification: 'fixed',
    periodicity: 'monthly',
    isRecurring: true,
    origin: 'other',
    totalAmount: 1100.00,
    paidAmount: 1100.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-08-20',
    createdAt: '2026-08-05T09:00:00Z',
    installments: [
      {
        id: 'parc-p8-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 1100.00,
        paidAmount: 1100.00,
        dueDate: '2026-08-20',
        status: 'paid',
        paymentDate: '2026-08-19T10:20:00Z',
        paymentMethod: 'PIX Bancário'
      }
    ]
  },
  {
    id: 'cp-9',
    code: 'CP-2026-009',
    supplierId: 'sup-var-1',
    supplierName: 'Química Automotiva Wurth do Brasil',
    description: 'Insumos Químicos, Desengraxantes, Desengripantes e Trava-Roscas',
    category: 'Insumos & Lubrificantes',
    nature: 'expense',
    classification: 'variable',
    totalAmount: 920.00,
    paidAmount: 920.00,
    remainingAmount: 0,
    status: 'paid',
    dueDate: '2026-08-22',
    createdAt: '2026-08-08T14:00:00Z',
    installments: [
      {
        id: 'parc-p9-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 920.00,
        paidAmount: 920.00,
        dueDate: '2026-08-22',
        status: 'paid',
        paymentDate: '2026-08-21T16:00:00Z',
        paymentMethod: 'Boleto Bancário'
      }
    ]
  },
  {
    id: 'cp-10',
    code: 'CP-2026-010',
    supplierId: 'sup-var-2',
    supplierName: 'Retífica de Motores Precisão Ltda',
    description: 'Serviço Terceirizado de Retífica de Cabeçote e Plainamento',
    category: 'Serviços Terceirizados',
    nature: 'expense',
    classification: 'variable',
    totalAmount: 1450.00,
    paidAmount: 0,
    remainingAmount: 1450.00,
    status: 'pending',
    dueDate: '2026-09-15',
    createdAt: '2026-08-25T11:00:00Z',
    installments: [
      {
        id: 'parc-p10-1',
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 1450.00,
        paidAmount: 0,
        dueDate: '2026-09-15',
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
    billingPolicy: 'PER_SALE',
    billingStatus: 'billed',
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
    billingPolicy: 'PER_SALE',
    billingStatus: 'billed',
    notes: 'Venda com desconto de fidelidade.',
    createdBy: 'Carlos Santos (Atendente)'
  },
  {
    id: 'sale-abc-1',
    code: 'VEN-2026-0101',
    clientId: 'cli-abc',
    clientName: 'Empresa ABC Transportes e Frotas Ltda',
    clientCpfCnpj: '11.222.333/0001-44',
    companyId: 'comp-1',
    createdAt: '2026-08-18T09:10:00Z',
    items: [
      {
        id: 'sitem-abc-1',
        partId: 'part-1',
        partName: 'Óleo Motor 5W30 Sintético',
        partCode: 'MOB-5W30',
        quantity: 12,
        unitPrice: 45.00,
        discount: 0,
        totalPrice: 540.00,
        unit: 'L',
        ncm: '2710.19.32'
      },
      {
        id: 'sitem-abc-2',
        partId: 'part-2',
        partName: 'Filtro de Óleo Lubrificante',
        partCode: 'FIL-1023',
        quantity: 3,
        unitPrice: 35.00,
        discount: 0,
        totalPrice: 105.00,
        unit: 'UN',
        ncm: '8421.23.00'
      }
    ],
    subtotal: 645.00,
    discount: 0,
    totalAmount: 645.00,
    paymentMethod: 'A Prazo',
    paymentConditionType: 'A_PRAZO',
    paymentStatus: 'pending',
    billingPolicy: 'CONSOLIDATED_PERIOD',
    billingStatus: 'pending_billing',
    accumulateForBilling: true,
    notes: 'Venda para manutenção de frota - Acumulado para Fechamento Semanal Sexta-Feira.',
    createdBy: 'Carlos Santos (Atendente)'
  },
  {
    id: 'sale-abc-2',
    code: 'VEN-2026-0102',
    clientId: 'cli-abc',
    clientName: 'Empresa ABC Transportes e Frotas Ltda',
    clientCpfCnpj: '11.222.333/0001-44',
    companyId: 'comp-1',
    createdAt: '2026-08-19T15:20:00Z',
    items: [
      {
        id: 'sitem-abc-3',
        partId: 'part-3',
        partName: 'Jogo de Pastilhas de Freio Dianteira',
        partCode: 'PST-9042',
        quantity: 2,
        unitPrice: 160.00,
        discount: 0,
        totalPrice: 320.00,
        unit: 'JG',
        ncm: '8708.30.90'
      }
    ],
    subtotal: 320.00,
    discount: 0,
    totalAmount: 320.00,
    paymentMethod: 'A Prazo',
    paymentConditionType: 'A_PRAZO',
    paymentStatus: 'pending',
    billingPolicy: 'CONSOLIDATED_PERIOD',
    billingStatus: 'pending_billing',
    accumulateForBilling: true,
    notes: 'Venda balcão expressa para frota Van Mercedes Sprinter.',
    createdBy: 'Carlos Santos (Atendente)'
  },
  {
    id: 'sale-xyz-1',
    code: 'VEN-2026-0201',
    clientId: 'cli-xyz',
    clientName: 'Empresa XYZ Logística e Distribuição S.A.',
    clientCpfCnpj: '33.444.555/0001-66',
    companyId: 'comp-1',
    createdAt: '2026-08-15T11:45:00Z',
    items: [
      {
        id: 'sitem-xyz-1',
        partId: 'part-1',
        partName: 'Óleo Motor 5W30 Sintético',
        partCode: 'MOB-5W30',
        quantity: 20,
        unitPrice: 45.00,
        discount: 50.00,
        totalPrice: 850.00,
        unit: 'L',
        ncm: '2710.19.32'
      }
    ],
    subtotal: 900.00,
    discount: 50.00,
    totalAmount: 850.00,
    paymentMethod: 'A Prazo',
    paymentConditionType: 'A_PRAZO',
    paymentStatus: 'pending',
    billingPolicy: 'CONSOLIDATED_PERIOD',
    billingStatus: 'pending_billing',
    accumulateForBilling: true,
    notes: 'Política de compras corporativas: Fechamento no dia 30 e vencimento no dia 10.',
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

export const INITIAL_BOMS: BillOfMaterials[] = [
  {
    id: 'bom-1',
    companyId: 'comp-5',
    finishedProductPartId: 'prt-ind-1',
    finishedProductName: 'Bomba Hidráulica de Direção Industrial HD-200',
    finishedProductCode: 'PA-BH-200',
    version: 'v1.0',
    active: true,
    laborCost: 75.00,
    indirectCost: 35.00,
    totalMaterialCost: 175.00,
    totalUnitCost: 285.00,
    suggestedSalePrice: 580.00,
    estimatedProductionHours: 2.5,
    validityDate: '2027-12-31',
    notes: 'Estrutura padrão de manufatura da Bomba Hidráulica HD-200 com teste de pressão estanqueidade.',
    items: [
      {
        id: 'bom-i1',
        componentPartId: 'prt-ind-3',
        componentPartName: 'Chapa de Aço Carbono SAE 1020 3mm',
        componentPartCode: 'MP-CH-1020',
        quantity: 0.5,
        unit: 'M²',
        unitCost: 48.00,
        lossPercentage: 5,
        effectiveQuantity: 0.525,
        totalCost: 25.20,
        notes: 'Corte a laser e estampagem da carcaça frontal'
      },
      {
        id: 'bom-i2',
        componentPartId: 'prt-ind-4',
        componentPartName: 'Eixo Retificado Aço 4140 Ø 25mm',
        componentPartCode: 'MP-EX-4140',
        quantity: 0.4,
        unit: 'M',
        unitCost: 35.00,
        lossPercentage: 3,
        effectiveQuantity: 0.412,
        totalCost: 14.42,
        notes: 'Usinagem CNC do eixo rotor'
      },
      {
        id: 'bom-i3',
        componentPartId: 'prt-ind-5',
        componentPartName: 'Rolamento de Esferas Blindado SKF 6205-2RS',
        componentPartCode: 'CP-RL-6205',
        quantity: 2,
        unit: 'UN',
        unitCost: 18.50,
        lossPercentage: 0,
        effectiveQuantity: 2,
        totalCost: 37.00,
        notes: 'Rolamento de alta rotação para mancais'
      },
      {
        id: 'bom-i4',
        componentPartId: 'prt-ind-6',
        componentPartName: 'Retentor de Óleo Duplo Labirinto Viton 25x47x7',
        componentPartCode: 'CP-RT-2547',
        quantity: 2,
        unit: 'UN',
        unitCost: 12.00,
        lossPercentage: 2,
        effectiveQuantity: 2.04,
        totalCost: 24.48,
        notes: 'Vedação resistente a altas temperaturas'
      },
      {
        id: 'bom-i5',
        componentPartId: 'prt-ind-8',
        componentPartName: 'Fluido de Teste Hidráulico ISO VG 46',
        componentPartCode: 'INS-FL-VG46',
        quantity: 1.5,
        unit: 'L',
        unitCost: 16.00,
        lossPercentage: 10,
        effectiveQuantity: 1.65,
        totalCost: 26.40,
        notes: 'Abastecimento para teste dinâmico em bancada'
      },
      {
        id: 'bom-i6',
        componentPartId: 'prt-ind-9',
        componentPartName: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
        componentPartCode: 'INS-PF-M830',
        quantity: 0.1,
        unit: 'CX',
        unitCost: 22.00,
        lossPercentage: 0,
        effectiveQuantity: 0.1,
        totalCost: 2.20,
        notes: '10 parafusos por conjunto'
      }
    ]
  },
  {
    id: 'bom-2',
    companyId: 'comp-5',
    finishedProductPartId: 'prt-ind-2',
    finishedProductName: 'Atuador Eletromecânico de Embreagem AT-50',
    finishedProductCode: 'PA-AT-050',
    version: 'v1.2',
    active: true,
    laborCost: 55.00,
    indirectCost: 25.00,
    totalMaterialCost: 115.00,
    totalUnitCost: 195.00,
    suggestedSalePrice: 420.00,
    estimatedProductionHours: 1.8,
    validityDate: '2027-12-31',
    notes: 'Conjunto atuador servomotorizado para automação veicular e industrial.',
    items: [
      {
        id: 'bom-i7',
        componentPartId: 'prt-ind-7',
        componentPartName: 'Micro Motor DC 24V 3500RPM com Encoder',
        componentPartCode: 'CP-MT-2435',
        quantity: 1,
        unit: 'UN',
        unitCost: 75.00,
        lossPercentage: 0,
        effectiveQuantity: 1,
        totalCost: 75.00,
        notes: 'Motor com encoder ótico'
      },
      {
        id: 'bom-i8',
        componentPartId: 'prt-ind-5',
        componentPartName: 'Rolamento de Esferas Blindado SKF 6205-2RS',
        componentPartCode: 'CP-RL-6205',
        quantity: 1,
        unit: 'UN',
        unitCost: 18.50,
        lossPercentage: 0,
        effectiveQuantity: 1,
        totalCost: 18.50
      },
      {
        id: 'bom-i9',
        componentPartId: 'prt-ind-4',
        componentPartName: 'Eixo Retificado Aço 4140 Ø 25mm',
        componentPartCode: 'MP-EX-4140',
        quantity: 0.25,
        unit: 'M',
        unitCost: 35.00,
        lossPercentage: 4,
        effectiveQuantity: 0.26,
        totalCost: 9.10
      },
      {
        id: 'bom-i10',
        componentPartId: 'prt-ind-9',
        componentPartName: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
        componentPartCode: 'INS-PF-M830',
        quantity: 0.05,
        unit: 'CX',
        unitCost: 22.00,
        lossPercentage: 0,
        effectiveQuantity: 0.05,
        totalCost: 1.10
      }
    ]
  },
  {
    id: 'bom-1-c1',
    companyId: 'comp-1',
    finishedProductPartId: 'prt-ind-1-c1',
    finishedProductName: 'Bomba Hidráulica de Direção Industrial HD-200',
    finishedProductCode: 'PA-BH-200',
    name: 'Bomba Hidráulica de Direção Industrial HD-200',
    code: 'BOM-HD-200',
    version: 'v1.0',
    active: true,
    laborCost: 75.00,
    indirectCost: 35.00,
    totalMaterialCost: 175.00,
    totalUnitCost: 285.00,
    suggestedSalePrice: 580.00,
    estimatedProductionHours: 2.5,
    validityDate: '2027-12-31',
    notes: 'Estrutura padrão de manufatura da Bomba Hidráulica HD-200 com teste de pressão estanqueidade.',
    items: [
      {
        id: 'bom-i1-c1',
        componentPartId: 'prt-ind-3-c1',
        componentPartName: 'Chapa de Aço Carbono SAE 1020 3mm',
        componentPartCode: 'MP-CH-1020',
        quantity: 0.5,
        unit: 'M²',
        unitCost: 48.00,
        lossPercentage: 5,
        effectiveQuantity: 0.525,
        totalCost: 25.20,
        notes: 'Corte a laser e estampagem da carcaça frontal'
      },
      {
        id: 'bom-i2-c1',
        componentPartId: 'prt-ind-4-c1',
        componentPartName: 'Eixo Retificado Aço 4140 Ø 25mm',
        componentPartCode: 'MP-EX-4140',
        quantity: 0.4,
        unit: 'M',
        unitCost: 35.00,
        lossPercentage: 3,
        effectiveQuantity: 0.412,
        totalCost: 14.42,
        notes: 'Usinagem CNC do eixo rotor'
      },
      {
        id: 'bom-i3-c1',
        componentPartId: 'prt-ind-5-c1',
        componentPartName: 'Rolamento de Esferas Blindado SKF 6205-2RS',
        componentPartCode: 'CP-RL-6205',
        quantity: 2,
        unit: 'UN',
        unitCost: 18.50,
        lossPercentage: 0,
        effectiveQuantity: 2,
        totalCost: 37.00,
        notes: 'Rolamento de alta rotação para mancais'
      },
      {
        id: 'bom-i4-c1',
        componentPartId: 'prt-ind-6-c1',
        componentPartName: 'Retentor de Óleo Duplo Labirinto Viton 25x47x7',
        componentPartCode: 'CP-RT-2547',
        quantity: 2,
        unit: 'UN',
        unitCost: 12.00,
        lossPercentage: 2,
        effectiveQuantity: 2.04,
        totalCost: 24.48,
        notes: 'Vedação resistente a altas temperaturas'
      },
      {
        id: 'bom-i5-c1',
        componentPartId: 'prt-ind-8-c1',
        componentPartName: 'Fluido de Teste Hidráulico ISO VG 46',
        componentPartCode: 'INS-FL-VG46',
        quantity: 1.5,
        unit: 'L',
        unitCost: 16.00,
        lossPercentage: 10,
        effectiveQuantity: 1.65,
        totalCost: 26.40,
        notes: 'Abastecimento para teste dinâmico em bancada'
      },
      {
        id: 'bom-i6-c1',
        componentPartId: 'prt-ind-9-c1',
        componentPartName: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
        componentPartCode: 'INS-PF-M830',
        quantity: 0.1,
        unit: 'CX',
        unitCost: 22.00,
        lossPercentage: 0,
        effectiveQuantity: 0.1,
        totalCost: 2.20,
        notes: '10 parafusos por conjunto'
      }
    ]
  }
];

export const INITIAL_PRODUCTION_ORDERS: ProductionOrder[] = [
  {
    id: 'op-1',
    code: 'OP-2026-001',
    companyId: 'comp-5',
    finishedProductPartId: 'prt-ind-1',
    finishedProductName: 'Bomba Hidráulica de Direção Industrial HD-200',
    finishedProductCode: 'PA-BH-200',
    bomId: 'bom-1',
    bomVersion: 'v1.0',
    plannedQuantity: 15,
    producedQuantity: 10,
    scrappedQuantity: 0,
    status: 'em_producao',
    priority: 'alta',
    lotNumber: 'LOTE-BH-2026-01',
    plannedStartDate: '2026-08-01',
    plannedEndDate: '2026-08-05',
    actualStartDate: '2026-08-01 08:30:00',
    estimatedUnitCost: 285.00,
    estimatedTotalCost: 4275.00,
    actualTotalCost: 2850.00,
    operatorName: 'Operador Líder Silva',
    customerName: 'Frotas Brasil Transportes Ltda',
    commercialSaleCode: 'VEN-IND-01',
    commercialBudgetId: 'bud-ind-1',
    notes: 'Lote prioritário para atendimento de pedido de exportação e frota pesada.',
    routingStages: [
      {
        id: 'stg-1',
        sequence: 1,
        workCenterName: 'Corte e Conformação Mecânica',
        description: 'Corte a laser de chapas e corte de eixos',
        estimatedMinutes: 45,
        actualMinutes: 42,
        status: 'concluido',
        operatorName: 'Carlos Usinagem',
        completedAt: '2026-08-01 12:00:00'
      },
      {
        id: 'stg-2',
        sequence: 2,
        workCenterName: 'Usinagem CNC & Torno',
        description: 'Retífica de precisão e fresamento de canais',
        estimatedMinutes: 60,
        actualMinutes: 58,
        status: 'concluido',
        operatorName: 'Marcos Torneiro',
        completedAt: '2026-08-01 16:30:00'
      },
      {
        id: 'stg-3',
        sequence: 3,
        workCenterName: 'Montagem de Conjuntos',
        description: 'Prensagem de rolamentos, retentores e fechamento da carcaça',
        estimatedMinutes: 50,
        status: 'em_andamento',
        operatorName: 'Líder Silva'
      },
      {
        id: 'stg-4',
        sequence: 4,
        workCenterName: 'Bancada de Testes & Controle de Qualidade',
        description: 'Teste de pressão 200 bar, teste estanqueidade e emissão de laudo CQ',
        estimatedMinutes: 30,
        status: 'pendente'
      }
    ],
    allocatedMaterials: [
      {
        id: 'mat-1',
        partId: 'prt-ind-3',
        partName: 'Chapa de Aço Carbono SAE 1020 3mm',
        partCode: 'MP-CH-1020',
        plannedQuantity: 7.875,
        consumedQuantity: 7.875,
        unit: 'M²',
        unitCost: 48.00,
        totalCost: 378.00,
        lotNumber: 'LOT-GERD-992',
        allocated: true,
        consumed: true
      },
      {
        id: 'mat-2',
        partId: 'prt-ind-4',
        partName: 'Eixo Retificado Aço 4140 Ø 25mm',
        partCode: 'MP-EX-4140',
        plannedQuantity: 6.18,
        consumedQuantity: 6.18,
        unit: 'M',
        unitCost: 35.00,
        totalCost: 216.30,
        lotNumber: 'LOT-VIL-401',
        allocated: true,
        consumed: true
      },
      {
        id: 'mat-3',
        partId: 'prt-ind-5',
        partName: 'Rolamento SKF 6205-2RS',
        partCode: 'CP-RL-6205',
        plannedQuantity: 30,
        consumedQuantity: 20,
        unit: 'UN',
        unitCost: 18.50,
        totalCost: 370.00,
        lotNumber: 'LOT-SKF-882',
        allocated: true,
        consumed: false
      }
    ],
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-02T16:00:00Z'
  },
  {
    id: 'op-2',
    code: 'OP-2026-002',
    companyId: 'comp-5',
    finishedProductPartId: 'prt-ind-2',
    finishedProductName: 'Atuador Eletromecânico de Embreagem AT-50',
    finishedProductCode: 'PA-AT-050',
    bomId: 'bom-2',
    bomVersion: 'v1.2',
    plannedQuantity: 20,
    producedQuantity: 0,
    scrappedQuantity: 0,
    status: 'planejada',
    priority: 'critica',
    lotNumber: 'LOTE-AT-2026-02',
    plannedStartDate: '2026-08-08',
    plannedEndDate: '2026-08-14',
    estimatedUnitCost: 195.00,
    estimatedTotalCost: 3900.00,
    customerName: 'Autopeças São Paulo Matriz',
    notes: 'Programada após recebimento de lote complementar de micromotores WEG.',
    routingStages: [
      {
        id: 'stg-201',
        sequence: 1,
        workCenterName: 'Montagem Eletromecânica',
        description: 'Acoplamento do motor, fiação e encoder',
        estimatedMinutes: 60,
        status: 'pendente'
      },
      {
        id: 'stg-202',
        sequence: 2,
        workCenterName: 'Calibração Eletrônica & CQ',
        description: 'Calibração de curso e teste de torque',
        estimatedMinutes: 45,
        status: 'pendente'
      }
    ],
    allocatedMaterials: [],
    createdAt: '2026-08-02T08:00:00Z',
    updatedAt: '2026-08-02T14:30:00Z'
  },
  {
    id: 'op-3',
    code: 'OP-2026-003',
    companyId: 'comp-5',
    finishedProductPartId: 'prt-ind-1',
    finishedProductName: 'Bomba Hidráulica de Direção Industrial HD-200',
    finishedProductCode: 'PA-BH-200',
    bomId: 'bom-1',
    bomVersion: 'v1.0',
    plannedQuantity: 25,
    producedQuantity: 25,
    scrappedQuantity: 1,
    status: 'concluida',
    priority: 'normal',
    lotNumber: 'LOTE-BH-2026-00-HIST',
    plannedStartDate: '2026-07-15',
    plannedEndDate: '2026-07-20',
    actualStartDate: '2026-07-15 07:00:00',
    actualEndDate: '2026-07-20 16:30:00',
    estimatedUnitCost: 285.00,
    estimatedTotalCost: 7125.00,
    actualTotalCost: 7240.00,
    operatorName: 'Turno A - Usinagem',
    notes: 'Lote histórico concluído com 100% de aprovação e estocado para expedição rápida.',
    createdAt: '2026-07-15T07:00:00Z',
    updatedAt: '2026-07-20T16:30:00Z'
  }
];

export const INITIAL_PRODUCT_LOTS: ProductLot[] = [
  {
    id: 'lot-1',
    lotNumber: 'LOTE-BH-2026-01',
    partId: 'prt-ind-1',
    partName: 'Bomba Hidráulica de Direção Industrial HD-200',
    partCode: 'PA-BH-200',
    companyId: 'comp-5',
    manufactureDate: '2026-08-01',
    expirationDate: '2029-08-01',
    initialQuantity: 15,
    currentQuantity: 14,
    reservedQuantity: 8,
    availableQuantity: 6,
    unitCost: 285.00,
    status: 'ativo',
    qualityInspectionStatus: 'aprovado',
    productionOrderId: 'op-1',
    storageLocation: 'Galpão 2 - PA-01',
    notes: 'Lote fabricado com laudo de teste dinâmico aprovado.'
  },
  {
    id: 'lot-2',
    lotNumber: 'LOTE-AT-2026-02',
    partId: 'prt-ind-2',
    partName: 'Atuador Eletromecânico de Embreagem AT-50',
    partCode: 'PA-AT-050',
    companyId: 'comp-5',
    manufactureDate: '2026-08-08',
    expirationDate: '2028-08-08',
    initialQuantity: 20,
    currentQuantity: 4,
    reservedQuantity: 10,
    availableQuantity: 0,
    unitCost: 195.00,
    status: 'quarentena',
    qualityInspectionStatus: 'em_inspecao',
    productionOrderId: 'op-2',
    storageLocation: 'Galpão 2 - PA-02',
    notes: 'Aguardando liberação do CQ para lote de pré-série.'
  },
  {
    id: 'lot-3',
    lotNumber: 'LOT-GERD-992',
    partId: 'prt-ind-3',
    partName: 'Chapa de Aço Carbono SAE 1020 3mm',
    partCode: 'MP-CH-1020',
    companyId: 'comp-5',
    manufactureDate: '2026-06-10',
    initialQuantity: 50.0,
    currentQuantity: 45.5,
    reservedQuantity: 12.0,
    availableQuantity: 33.5,
    unitCost: 48.00,
    status: 'ativo',
    qualityInspectionStatus: 'aprovado',
    supplierLotNumber: 'NF-1042-GERD',
    storageLocation: 'Pátio MP - Racks 03'
  }
];

export const INITIAL_OPERATIONAL_ALERTS: OperationalAlert[] = [
  {
    id: 'alr-1',
    companyId: 'comp-5',
    type: 'FALTA_MATERIAL_OP',
    severity: 'critica',
    title: 'Risco de Parada: Micro Motor DC em Nível Crítico para OP-2026-002',
    message: 'A OP-2026-002 (Atuador AT-50) requer 20 motores, porém há apenas 18 em estoque com 15 já reservados.',
    entityType: 'OP',
    entityId: 'op-2',
    entityCode: 'OP-2026-002',
    suggestedAction: 'Emitir cotação emergencial para fornecedor WEG ou postergar início em 3 dias.',
    createdAt: '2026-08-02 09:15:00',
    resolved: false
  },
  {
    id: 'alr-2',
    companyId: 'comp-5',
    type: 'DESVIO_CUSTO_BOM',
    severity: 'atencao',
    title: 'Desvio de Custo Unitário na BOM HD-200',
    message: 'O custo real dos últimos consumos superou a previsão em +4.2% devido à perda de usinagem na chapa SAE 1020.',
    entityType: 'BOM',
    entityId: 'bom-1',
    entityCode: 'PA-BH-200',
    suggestedAction: 'Recalcular perda técnica na BOM v1.1 ou reajustar preço sugerido.',
    createdAt: '2026-08-02 11:30:00',
    resolved: false
  },
  {
    id: 'alr-3',
    companyId: 'comp-5',
    type: 'OP_ATRASADA',
    severity: 'info',
    title: 'OP-2026-001 em Fase Final de Montagem e Teste',
    message: '10 de 15 unidades concluídas e testadas no dinamômetro com aprovação no CQ.',
    entityType: 'OP',
    entityId: 'op-1',
    entityCode: 'OP-2026-001',
    suggestedAction: 'Liberar lote para inspeção final e faturamento NF-e mod 55.',
    createdAt: '2026-08-02 14:00:00',
    resolved: false
  }
];

export const INITIAL_INSTALLED_EQUIPMENT: InstalledEquipment[] = [
  {
    id: 'eq-1',
    companyId: 'comp-5',
    serialNumber: 'SN-PR-2024-8891',
    code: 'EQ-PR-150',
    name: 'Prensa Hidráulica de Conformação 150T',
    productId: 'prt-ind-1',
    productName: 'Bomba Hidráulica de Direção Industrial HD-200',
    clientId: 'cli-1',
    clientName: 'Metalúrgica Paulista S/A',
    city: 'São Paulo',
    uf: 'SP',
    installationAddress: 'Av. das Indústrias, 1200 - Galpão 4, São Paulo - SP',
    manufactureDate: '2024-05-10',
    installationDate: '2024-06-01',
    warrantyExpirationDate: '2027-06-01',
    isUnderWarranty: true,
    technicalResponsible: 'Eng. Roberto Almeida (CREA 506987)',
    status: 'OPERATIONAL',
    runningHours: 1420,
    operationCycles: 85400,
    lastMaintenanceDate: '2026-06-15',
    nextMaintenanceDate: '2026-09-15',
    notes: 'Equipamento em regime contínuo de 2 turnos. Calibração de transdutor de pressão realizada.',
    createdAt: '2024-06-01T10:00:00Z'
  },
  {
    id: 'eq-2',
    companyId: 'comp-5',
    serialNumber: 'SN-CNC-2025-1042',
    code: 'EQ-CNC-500',
    name: 'Torno CNC de Precisão TC-500',
    productId: 'prt-ind-2',
    productName: 'Atuador Eletromecânico de Embreagem AT-50',
    clientId: 'cli-2',
    clientName: 'Auto Peças e Usinagem São Caetano',
    city: 'São Caetano do Sul',
    uf: 'SP',
    installationAddress: 'Rua das Máquinas, 450, São Caetano do Sul - SP',
    manufactureDate: '2025-02-20',
    installationDate: '2025-03-05',
    warrantyExpirationDate: '2027-03-05',
    isUnderWarranty: true,
    technicalResponsible: 'Téc. Marcos Vinicius',
    status: 'OPERATIONAL',
    runningHours: 860,
    operationCycles: 42100,
    lastMaintenanceDate: '2026-07-28',
    nextMaintenanceDate: '2026-08-30',
    notes: 'Troca de óleo do barramento em dia. Rotação do fuso balanceada.',
    createdAt: '2025-03-05T09:00:00Z'
  },
  {
    id: 'eq-3',
    companyId: 'comp-5',
    serialNumber: 'SN-DIN-2023-4412',
    code: 'EQ-DIN-200',
    name: 'Bancada de Teste Hidráulico e Dinamômetro Din-200',
    clientId: 'cli-3',
    clientName: 'Frotas Brasil Transportes Ltda',
    city: 'Campinas',
    uf: 'SP',
    installationAddress: 'Rodovia Anhanguera, km 98, Campinas - SP',
    manufactureDate: '2023-08-15',
    installationDate: '2023-09-01',
    warrantyExpirationDate: '2025-09-01',
    isUnderWarranty: false,
    technicalResponsible: 'Eng. Roberto Almeida',
    status: 'MAINTENANCE',
    runningHours: 3200,
    operationCycles: 195000,
    lastMaintenanceDate: '2026-05-10',
    nextMaintenanceDate: '2026-08-10',
    notes: 'Ordem de Manutenção Corretiva OM-2026-002 em andamento para substituição do manômetro digital.',
    createdAt: '2023-09-01T14:00:00Z'
  }
];

export const INITIAL_MAINTENANCE_PLANS: EquipmentMaintenancePlan[] = [
  {
    id: 'mp-1',
    companyId: 'comp-5',
    name: 'Plano Preventivo Trimestral - Linha Hidráulica Industrial',
    equipmentModel: 'Prensas e Unidades Hidráulicas HD',
    periodicityType: 'DAYS',
    intervalValue: 90,
    active: true,
    defaultChecklist: [
      { id: 'chk-1', description: 'Verificar nível e pressão de trabalho do fluido hidráulico (alvo: 180-200 bar)', category: 'MECANICA' },
      { id: 'chk-2', description: 'Inspecionar mangueiras, conexões e vedações quanto a vazamentos ou estufamentos', category: 'DESGASTE' },
      { id: 'chk-3', description: 'Reaperto de parafusos da mesa e colunas de sustentação com torquímetro calibrado', category: 'APERTO' },
      { id: 'chk-4', description: 'Lubrificação de guias lineares e buchas com graxa de lítio EP-2', category: 'LUBRIFICACAO' },
      { id: 'chk-5', description: 'Teste operacional de botão de emergência e cortina de luz de segurança', category: 'TESTE_OPERACIONAL' }
    ],
    recommendedParts: [
      { partId: 'prt-ind-5', partName: 'Rolamento SKF 6205-2RS', defaultQty: 2, unit: 'UN' },
      { partId: 'prt-ind-9', partName: 'Parafuso M8x30 Inox', defaultQty: 0.1, unit: 'CX' }
    ],
    notes: 'Plano padrão para garantia estendida e segurança NR-12.'
  },
  {
    id: 'mp-2',
    companyId: 'comp-5',
    name: 'Plano Preventivo Mensal - Tornos e Centros CNC',
    equipmentModel: 'Tornos CNC e Fresadoras',
    periodicityType: 'DAYS',
    intervalValue: 30,
    active: true,
    defaultChecklist: [
      { id: 'chk-6', description: 'Limpeza de barramentos, bandeja de cavacos e filtros de refrigeração', category: 'LIMPEZA' },
      { id: 'chk-7', description: 'Verificar concentração e pH do fluido refrigerante solúvel (alvo: 8.5 a 9.2)', category: 'CALIBRACAO' },
      { id: 'chk-8', description: 'Inspeção visual do fuso de esferas e guias lineares dos eixos X e Z', category: 'DESGASTE' },
      { id: 'chk-9', description: 'Teste de repetibilidade e folga de posicionamento micrométrico', category: 'TESTE_OPERACIONAL' }
    ],
    recommendedParts: [
      { partId: 'prt-ind-5', partName: 'Rolamento SKF 6205-2RS', defaultQty: 1, unit: 'UN' }
    ],
    notes: 'Manutenção rápida com parada programada de até 2 horas.'
  }
];

export const INITIAL_EQUIPMENT_MAINTENANCE_ORDERS: EquipmentMaintenanceOrder[] = [
  {
    id: 'om-1',
    companyId: 'comp-5',
    code: 'OM-2026-001',
    equipmentId: 'eq-1',
    equipmentName: 'Prensa Hidráulica de Conformação 150T',
    serialNumber: 'SN-PR-2024-8891',
    clientId: 'cli-1',
    clientName: 'Metalúrgica Paulista S/A',
    installationAddress: 'Av. das Indústrias, 1200 - Galpão 4, São Paulo - SP',
    type: 'PREVENTIVA',
    status: 'APROVADA',
    priority: 'MEDIA',
    scheduledDate: '2026-06-15',
    startedAt: '2026-06-15 08:30:00',
    completedAt: '2026-06-15 13:45:00',
    technicalNotes: 'Revisão preventiva trimestral executada com sucesso. Substituídos retentores e filtro hidráulico.',
    checklist: [
      { id: 'ck-1', description: 'Verificar nível e pressão de trabalho do óleo hidráulico', category: 'MECANICA', checked: true, status: 'CONFORME', observations: 'Pressão estabilizada em 195 bar' },
      { id: 'ck-2', description: 'Inspecionar mangueiras e conexões', category: 'DESGASTE', checked: true, status: 'CONFORME' },
      { id: 'ck-3', description: 'Reaperto de parafusos da estrutura', category: 'APERTO', checked: true, status: 'CONFORME' },
      { id: 'ck-4', description: 'Lubrificação de guias', category: 'LUBRIFICACAO', checked: true, status: 'CONFORME' },
      { id: 'ck-5', description: 'Teste de parada de emergência e cortinas NR-12', category: 'TESTE_OPERACIONAL', checked: true, status: 'CONFORME', observations: 'Atuação em menos de 120ms' }
    ],
    replacedParts: [
      {
        id: 'rp-1',
        partId: 'prt-ind-5',
        partName: 'Rolamento de Esferas Blindado SKF 6205-2RS',
        partCode: 'CP-RL-6205',
        quantity: 2,
        unit: 'UN',
        unitCost: 18.50,
        totalCost: 37.00,
        replacementReason: 'PREVENTIVA',
        stockDeducted: true
      }
    ],
    wearRecords: [
      {
        id: 'wr-1',
        componentName: 'Guia de Bronze do Martelo Superior',
        wearLevel: 'DESGASTE_LEVE',
        percentage: 18,
        estimatedRemainingHours: 3500,
        observations: 'Desgaste simétrico dentro da tolerância de fábrica.'
      }
    ],
    laborHours: 5.25,
    laborHourlyRate: 85.00,
    laborCost: 446.25,
    partsCost: 37.00,
    totalCost: 483.25,
    executorTechnicianName: 'Marcos Vinicius (Técnico de Campo)',
    reportResponsibleName: 'Marcos Vinicius',
    approverName: 'Eng. Roberto Almeida (Gerente Técnico)',
    isApproved: true,
    approvedAt: '2026-06-15 16:00:00',
    isLocked: true,
    createdAt: '2026-06-10T08:00:00Z',
    updatedAt: '2026-06-15T16:00:00Z'
  },
  {
    id: 'om-2',
    companyId: 'comp-5',
    code: 'OM-2026-002',
    equipmentId: 'eq-3',
    equipmentName: 'Bancada de Teste Hidráulico e Dinamômetro Din-200',
    serialNumber: 'SN-DIN-2023-4412',
    clientId: 'cli-3',
    clientName: 'Frotas Brasil Transportes Ltda',
    installationAddress: 'Rodovia Anhanguera, km 98, Campinas - SP',
    type: 'CORRETIVA',
    status: 'EM_ANDAMENTO',
    priority: 'ALTA',
    scheduledDate: '2026-08-02',
    startedAt: '2026-08-02 09:00:00',
    technicalNotes: 'Bancada oscilando medição no canal B. Em andamento para troca de célula de carga e acoplamento.',
    rootCause: 'Pico de pressão gerado por golpe de aríete no retorno do dinamômetro.',
    checklist: [
      { id: 'ck-6', description: 'Calibração do manômetro e transdutor de pressão', category: 'CALIBRACAO', checked: true, status: 'NAO_CONFORME', observations: 'Desvio de 8.5 bar identificado' },
      { id: 'ck-7', description: 'Inspeção do acoplamento elástico', category: 'MECANICA', checked: true, status: 'AJUSTADO' },
      { id: 'ck-8', description: 'Teste de vazamento estático sob 250 bar', category: 'TESTE_OPERACIONAL', checked: false, status: 'CONFORME' }
    ],
    replacedParts: [
      {
        id: 'rp-2',
        partId: 'prt-ind-9',
        partName: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
        partCode: 'INS-PF-M830',
        quantity: 0.1,
        unit: 'CX',
        unitCost: 22.00,
        totalCost: 2.20,
        replacementReason: 'QUEBRA',
        stockDeducted: true
      }
    ],
    wearRecords: [
      {
        id: 'wr-2',
        componentName: 'Acoplamento Flexível de Alumínio',
        wearLevel: 'DESGASTE_MODERADO',
        percentage: 45,
        estimatedRemainingHours: 1200,
        observations: 'Folga angular identificada nas chavetas.'
      }
    ],
    laborHours: 3.5,
    laborHourlyRate: 85.00,
    laborCost: 297.50,
    partsCost: 2.20,
    totalCost: 299.70,
    executorTechnicianName: 'Marcos Vinicius',
    reportResponsibleName: 'Marcos Vinicius',
    isApproved: false,
    isLocked: false,
    createdAt: '2026-08-02T08:30:00Z',
    updatedAt: '2026-08-02T11:00:00Z'
  }
];

export const INITIAL_PRODUCTION_SCRAP_LOGS: ProductionScrapLog[] = [
  {
    id: 'scrap-1',
    companyId: 'comp-5',
    productionOrderId: 'op-1',
    productionOrderCode: 'OP-2026-001',
    partId: 'prt-ind-3',
    partName: 'Chapa de Aço Carbono SAE 1020 3mm',
    partCode: 'MP-CH-1020',
    quantity: 0.45,
    unit: 'M²',
    scrapType: 'CORTE',
    reason: 'Apara técnica final e ponta de corte fora do esquadro no laser.',
    unitCost: 48.00,
    totalCost: 21.60,
    operatorName: 'Carlos Usinagem',
    date: '2026-08-01 11:30:00'
  },
  {
    id: 'scrap-2',
    companyId: 'comp-5',
    productionOrderId: 'op-3',
    productionOrderCode: 'OP-2026-003',
    partId: 'prt-ind-5',
    partName: 'Rolamento de Esferas Blindado SKF 6205-2RS',
    partCode: 'CP-RL-6205',
    quantity: 1,
    unit: 'UN',
    scrapType: 'DEFEITO',
    reason: 'Ruído excessivo detectado no ensaio dinamométrico sob carga.',
    unitCost: 18.50,
    totalCost: 18.50,
    operatorName: 'Turno A - Usinagem',
    date: '2026-07-18 15:45:00'
  }
];

export const INITIAL_PRODUCTION_REWORK_LOGS: ProductionReworkLog[] = [
  {
    id: 'rework-1',
    companyId: 'comp-5',
    productionOrderId: 'op-1',
    productionOrderCode: 'OP-2026-001',
    stageName: 'Usinagem CNC & Torno',
    reworkReason: 'Rebaixamento de 0.05mm no canal da chaveta do eixo retificado para ajuste de folga H7.',
    additionalHours: 1.5,
    laborHourlyRate: 35.00,
    additionalLaborCost: 52.50,
    additionalMaterialsCost: 0,
    totalAdditionalCost: 52.50,
    responsibleOperator: 'Marcos Torneiro',
    approvedBy: 'Operador Líder Silva',
    date: '2026-08-01 16:00:00',
    notes: 'Peças ajustadas e 100% aprovadas no controle de qualidade.'
  }
];

export const INITIAL_PURCHASE_HISTORY: PurchaseHistoryItem[] = [
  {
    id: 'ph-1',
    companyId: 'comp-5',
    date: '2026-07-01',
    supplierId: 'sup-1',
    supplierName: 'Gerdau Aços Especiais S/A',
    partId: 'prt-ind-3',
    partName: 'Chapa de Aço Carbono SAE 1020 3mm',
    partCode: 'MP-CH-1020',
    quantity: 50.0,
    unit: 'M²',
    unitPrice: 48.00,
    totalPrice: 2400.00,
    paymentCondition: '28/56 dias',
    documentNumber: 'NF-1042'
  },
  {
    id: 'ph-2',
    companyId: 'comp-5',
    date: '2026-06-15',
    supplierId: 'sup-1',
    supplierName: 'Gerdau Aços Especiais S/A',
    partId: 'prt-ind-4',
    partName: 'Eixo Retificado Aço 4140 Ø 25mm',
    partCode: 'MP-EX-4140',
    quantity: 30.0,
    unit: 'M',
    unitPrice: 35.00,
    totalPrice: 1050.00,
    paymentCondition: '30 dias',
    documentNumber: 'NF-0988'
  },
  {
    id: 'ph-3',
    companyId: 'comp-5',
    date: '2026-07-10',
    supplierId: 'sup-2',
    supplierName: 'SKF do Brasil Distribuidora',
    partId: 'prt-ind-5',
    partName: 'Rolamento de Esferas Blindado SKF 6205-2RS',
    partCode: 'CP-RL-6205',
    quantity: 100,
    unit: 'UN',
    unitPrice: 18.50,
    totalPrice: 1850.00,
    paymentCondition: '21/42 dias',
    documentNumber: 'NF-7741'
  },
  {
    id: 'ph-4',
    companyId: 'comp-5',
    date: '2026-06-20',
    supplierId: 'sup-3',
    supplierName: 'WEG Motores Elétricos',
    partId: 'prt-ind-7',
    partName: 'Micro Motor DC 24V 3500RPM com Encoder',
    partCode: 'CP-MT-2435',
    quantity: 25,
    unit: 'UN',
    unitPrice: 75.00,
    totalPrice: 1875.00,
    paymentCondition: '30 dias',
    documentNumber: 'NF-3321'
  }
];

export const INITIAL_BILLING_CLOSINGS: BillingClosingOrder[] = [
  {
    id: 'fch-2026-0001',
    code: 'FCH-2026-0001',
    companyId: 'comp-1',
    clientId: 'cli-abc',
    clientName: 'Empresa ABC Transportes e Frotas Ltda',
    clientCpfCnpj: '11.222.333/0001-44',
    periodicity: 'SEMANAL',
    periodStartDate: '2026-08-01',
    periodEndDate: '2026-08-08',
    closingDate: '2026-08-08',
    dueDate: '2026-08-15',
    salesCount: 2,
    serviceOrdersCount: 1,
    subtotal: 1850.00,
    discountAmount: 0,
    totalAmount: 1850.00,
    status: 'closed',
    paymentStatus: 'paid',
    accountReceivableId: 'cr-fch-1',
    accountReceivableCode: 'CR-FCH-0001',
    boletoId: 'bol-fch-1',
    items: [
      {
        id: 'fch-it-1',
        originType: 'SALE',
        originId: 'sale-abc-prev-1',
        originCode: 'VEN-2026-0098',
        documentDate: '2026-08-03',
        description: 'Venda de Peças para Manutenção Van 01',
        amount: 450.00,
        vehiclePlate: 'ABC-1234'
      },
      {
        id: 'fch-it-2',
        originType: 'SALE',
        originId: 'sale-abc-prev-2',
        originCode: 'VEN-2026-0099',
        documentDate: '2026-08-05',
        description: 'Filtros e Fluido de Freio DOT4',
        amount: 200.00,
        vehiclePlate: 'ABC-5678'
      },
      {
        id: 'fch-it-3',
        originType: 'SERVICE_ORDER',
        originId: 'os-abc-prev-1',
        originCode: 'OS-2026-0045',
        documentDate: '2026-08-07',
        description: 'Revisão Preventiva Freios e Suspensão',
        amount: 1200.00,
        vehiclePlate: 'ABC-1234'
      }
    ],
    createdAt: '2026-08-08T18:00:00Z',
    closedAt: '2026-08-08T18:00:00Z',
    createdByName: 'Carlos Santos (Gerente)',
    notes: 'Fechamento semanal faturamento período 01 a 08/08 quitado via conciliação bancária.'
  }
];

export const INITIAL_MONTHLY_ACCOUNTING_CLOSINGS: MonthlyAccountingClosing[] = [
  {
    id: 'mac-2026-06',
    companyId: 'comp-1',
    period: '2026-06',
    periodLabel: 'Junho de 2026',
    status: 'closed',
    closedAt: '2026-06-30T19:00:00.000Z',
    closedByName: 'Carlos Gerente',
    closedByUserId: 'user-manager',
    totalOrdersAmount: 38450.00,
    ordersCount: 34,
    salesAmount: 18200.00,
    serviceOrdersAmount: 19500.00,
    otherRevenuesAmount: 750.00,
    totalExpensesAmount: 22400.00,
    expensesCount: 16,
    fixedExpensesAmount: 15800.00,
    variableExpensesAmount: 6600.00,
    netBalance: 16050.00,
    profitMarginPercent: 41.7,
    expenseAbsorptionRate: 58.3,
    notes: 'Encerramento regular de Junho/2026 concluído com todas as despesas e receitas conciliadas.'
  },
  {
    id: 'mac-2026-07',
    companyId: 'comp-1',
    period: '2026-07',
    periodLabel: 'Julho de 2026',
    status: 'closed',
    closedAt: '2026-07-31T19:30:00.000Z',
    closedByName: 'Carlos Gerente',
    closedByUserId: 'user-manager',
    totalOrdersAmount: 42100.00,
    ordersCount: 38,
    salesAmount: 19900.00,
    serviceOrdersAmount: 21200.00,
    otherRevenuesAmount: 1000.00,
    totalExpensesAmount: 24300.00,
    expensesCount: 18,
    fixedExpensesAmount: 16200.00,
    variableExpensesAmount: 8100.00,
    netBalance: 17800.00,
    profitMarginPercent: 42.3,
    expenseAbsorptionRate: 57.7,
    notes: 'Encerramento de Julho/2026 aprovado pela diretoria com margem de 42,3%.'
  },
  {
    id: 'mac-2026-08',
    companyId: 'comp-1',
    period: '2026-08',
    periodLabel: 'Agosto de 2026',
    status: 'closed',
    closedAt: '2026-08-31T18:45:00.000Z',
    closedByName: 'Carlos Gerente',
    closedByUserId: 'user-manager',
    totalOrdersAmount: 46850.00,
    ordersCount: 42,
    salesAmount: 22400.00,
    serviceOrdersAmount: 23550.00,
    otherRevenuesAmount: 900.00,
    totalExpensesAmount: 26150.00,
    expensesCount: 20,
    fixedExpensesAmount: 16500.00,
    variableExpensesAmount: 9650.00,
    netBalance: 20700.00,
    profitMarginPercent: 44.2,
    expenseAbsorptionRate: 55.8,
    notes: 'Encerramento contábil de Agosto/2026 fechado com sucesso. Saldo apurado de R$ 20.700,00.'
  }
];

export const INITIAL_BANK_STATEMENTS: BankStatement[] = [
  {
    id: 'stmt-2026-08',
    companyId: 'comp-1',
    bankName: 'Banco Itaú Unibanco',
    accountNumber: '12345-6',
    agency: '0450',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    importedAt: '2026-08-16T10:00:00Z',
    importedByName: 'Carlos Santos (Gerente)',
    fileName: 'extrato_itau_ag0450_ago2026.ofx',
    items: [
      {
        id: 'st-it-1',
        fitId: 'ITAU-20260815-9921',
        date: '2026-08-15',
        description: 'LIQ. COBRANCA TIT FCH-2026-0001 EMPRESA ABC',
        amount: 1850.00,
        type: 'CREDIT',
        reconciled: true,
        reconciledAt: '2026-08-16T10:15:00Z',
        reconciledAccountReceivableId: 'cr-fch-1',
        reconciledBillingClosingId: 'fch-2026-0001'
      },
      {
        id: 'st-it-2',
        fitId: 'ITAU-20260816-4412',
        date: '2026-08-16',
        description: 'PIX RECEBIDO VEN-2026-0001 JOAO SILVA',
        amount: 210.00,
        type: 'CREDIT',
        reconciled: true,
        reconciledAt: '2026-08-16T10:20:00Z'
      },
      {
        id: 'st-it-3',
        fitId: 'ITAU-20260818-8831',
        date: '2026-08-18',
        description: 'TED RECEBIDA CLIENTE CORPORATIVO INDÚSTRIA',
        amount: 3250.00,
        type: 'CREDIT',
        reconciled: false
      },
      {
        id: 'st-it-4',
        fitId: 'ITAU-20260819-1120',
        date: '2026-08-19',
        description: 'TARIFA BANCARIA MANUT CONTA CORRENTE',
        amount: -45.00,
        type: 'DEBIT',
        reconciled: false
      }
    ]
  }
];

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
      taxObligationGuides: INITIAL_TAX_OBLIGATION_GUIDES,
      accessGroups: INITIAL_ACCESS_GROUPS,
      boletos: INITIAL_BOLETOS,
      interBranchSales: INITIAL_INTER_BRANCH_SALES,
      sefazConfig: INITIAL_SEFAZ_CONFIG,
      taxOperationNatures: INITIAL_TAX_OPERATION_NATURES,
      taxRules: INITIAL_TAX_RULES,
      xmlImportRecords: INITIAL_XML_IMPORT_RECORDS,
      unitsOfMeasure: INITIAL_UNITS_OF_MEASURE,
      boms: INITIAL_BOMS,
      billOfMaterials: INITIAL_BOMS,
      productionOrders: INITIAL_PRODUCTION_ORDERS,
      productLots: INITIAL_PRODUCT_LOTS,
      operationalAlerts: INITIAL_OPERATIONAL_ALERTS,
      installedEquipment: INITIAL_INSTALLED_EQUIPMENT,
      equipmentMaintenancePlans: INITIAL_MAINTENANCE_PLANS,
      equipmentMaintenanceOrders: INITIAL_EQUIPMENT_MAINTENANCE_ORDERS,
      productionScrapLogs: INITIAL_PRODUCTION_SCRAP_LOGS,
      productionReworkLogs: INITIAL_PRODUCTION_REWORK_LOGS,
      purchaseHistory: INITIAL_PURCHASE_HISTORY,
      billingClosings: INITIAL_BILLING_CLOSINGS,
      monthlyAccountingClosings: INITIAL_MONTHLY_ACCOUNTING_CLOSINGS,
      activeAccountingPeriod: '2026-09',
      bankStatements: INITIAL_BANK_STATEMENTS,
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
      if (!db.billingClosings || !Array.isArray(db.billingClosings) || db.billingClosings.length === 0) {
        db.billingClosings = INITIAL_BILLING_CLOSINGS;
      }
      if (!db.monthlyAccountingClosings || !Array.isArray(db.monthlyAccountingClosings) || db.monthlyAccountingClosings.length === 0) {
        db.monthlyAccountingClosings = INITIAL_MONTHLY_ACCOUNTING_CLOSINGS;
      }
      if (!db.activeAccountingPeriod) {
        db.activeAccountingPeriod = '2026-09';
      }
      if (!db.bankStatements || !Array.isArray(db.bankStatements) || db.bankStatements.length === 0) {
        db.bankStatements = INITIAL_BANK_STATEMENTS;
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
      if (!db.taxObligationGuides || !Array.isArray(db.taxObligationGuides) || db.taxObligationGuides.length === 0) {
        db.taxObligationGuides = INITIAL_TAX_OBLIGATION_GUIDES;
      }
      if (!db.accessGroups || !Array.isArray(db.accessGroups) || db.accessGroups.length === 0) {
        db.accessGroups = INITIAL_ACCESS_GROUPS;
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
      if (!db.boms || !Array.isArray(db.boms) || db.boms.length === 0) {
        db.boms = INITIAL_BOMS;
      }
      if (!db.billOfMaterials || !Array.isArray(db.billOfMaterials) || db.billOfMaterials.length === 0) {
        db.billOfMaterials = db.boms || INITIAL_BOMS;
      }
      if (!db.productionOrders || !Array.isArray(db.productionOrders) || db.productionOrders.length === 0) {
        db.productionOrders = INITIAL_PRODUCTION_ORDERS;
      }
      if (!db.productLots || !Array.isArray(db.productLots) || db.productLots.length === 0) {
        db.productLots = INITIAL_PRODUCT_LOTS;
      }
      if (!db.operationalAlerts || !Array.isArray(db.operationalAlerts) || db.operationalAlerts.length === 0) {
        db.operationalAlerts = INITIAL_OPERATIONAL_ALERTS;
      }
      if (!db.installedEquipment || !Array.isArray(db.installedEquipment) || db.installedEquipment.length === 0) {
        db.installedEquipment = INITIAL_INSTALLED_EQUIPMENT;
      }
      if (!db.equipmentMaintenancePlans || !Array.isArray(db.equipmentMaintenancePlans) || db.equipmentMaintenancePlans.length === 0) {
        db.equipmentMaintenancePlans = INITIAL_MAINTENANCE_PLANS;
      }
      if (!db.equipmentMaintenanceOrders || !Array.isArray(db.equipmentMaintenanceOrders) || db.equipmentMaintenanceOrders.length === 0) {
        db.equipmentMaintenanceOrders = INITIAL_EQUIPMENT_MAINTENANCE_ORDERS;
      }
      if (!db.productionScrapLogs || !Array.isArray(db.productionScrapLogs) || db.productionScrapLogs.length === 0) {
        db.productionScrapLogs = INITIAL_PRODUCTION_SCRAP_LOGS;
      }
      if (!db.productionReworkLogs || !Array.isArray(db.productionReworkLogs) || db.productionReworkLogs.length === 0) {
        db.productionReworkLogs = INITIAL_PRODUCTION_REWORK_LOGS;
      }
      if (!db.purchaseHistory || !Array.isArray(db.purchaseHistory) || db.purchaseHistory.length === 0) {
        db.purchaseHistory = INITIAL_PURCHASE_HISTORY;
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
        taxObligationGuides: INITIAL_TAX_OBLIGATION_GUIDES,
        accessGroups: INITIAL_ACCESS_GROUPS,
        boletos: INITIAL_BOLETOS,
        interBranchSales: INITIAL_INTER_BRANCH_SALES,
        sefazConfig: INITIAL_SEFAZ_CONFIG,
        taxOperationNatures: INITIAL_TAX_OPERATION_NATURES,
        taxRules: INITIAL_TAX_RULES,
        xmlImportRecords: INITIAL_XML_IMPORT_RECORDS,
        unitsOfMeasure: INITIAL_UNITS_OF_MEASURE,
        boms: INITIAL_BOMS,
        billOfMaterials: INITIAL_BOMS,
        productionOrders: INITIAL_PRODUCTION_ORDERS,
        productLots: INITIAL_PRODUCT_LOTS,
        operationalAlerts: INITIAL_OPERATIONAL_ALERTS,
        installedEquipment: INITIAL_INSTALLED_EQUIPMENT,
        equipmentMaintenancePlans: INITIAL_MAINTENANCE_PLANS,
        equipmentMaintenanceOrders: INITIAL_EQUIPMENT_MAINTENANCE_ORDERS,
        productionScrapLogs: INITIAL_PRODUCTION_SCRAP_LOGS,
        productionReworkLogs: INITIAL_PRODUCTION_REWORK_LOGS,
        purchaseHistory: INITIAL_PURCHASE_HISTORY,
      };
    }
  }

  if (db.users) {
    const allCompaniesList = (db.registeredCompanies && db.registeredCompanies.length > 0)
      ? db.registeredCompanies
      : (db.companyInfo ? [db.companyInfo] : INITIAL_COMPANIES);



    db.users = db.users.map(u => {
      if (u.username.toLowerCase() === 'validador') {
        const cleanAllowed = Array.isArray(u.allowedCompanyIds)
          ? u.allowedCompanyIds.filter(id => id !== '*')
          : [u.companyId || 'comp-1'];
        return {
          ...u,
          passwordHash: 'Donatelo@123',
          role: 'qa',
          allowedCompanyIds: cleanAllowed.length > 0 ? cleanAllowed : [u.companyId || 'comp-1'],
          active: true,
          status: 'active'
        };
      }
      return u;
    });

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

/**
 * Gera catálogo completo de peças industriais e estruturas BOM de exemplo para qualquer empresa
 */
export function generateIndustrialSeedForCompany(companyId: string): { parts: Part[]; boms: BillOfMaterials[] } {
  const compSuffix = companyId.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = Date.now();

  const paBhId = `prt-ind-bh-${compSuffix}`;
  const paAtId = `prt-ind-at-${compSuffix}`;
  const paCpId = `prt-ind-cp-${compSuffix}`;
  const mpChId = `prt-ind-ch-${compSuffix}`;
  const mpExId = `prt-ind-ex-${compSuffix}`;
  const cpRlId = `prt-ind-rl-${compSuffix}`;
  const cpRtId = `prt-ind-rt-${compSuffix}`;
  const cpMtId = `prt-ind-mt-${compSuffix}`;
  const insFlId = `prt-ind-fl-${compSuffix}`;
  const insPfId = `prt-ind-pf-${compSuffix}`;

  const bomBhId = `bom-bh-${compSuffix}`;
  const bomAtId = `bom-at-${compSuffix}`;

  const parts: Part[] = [
    {
      id: paBhId,
      companyId,
      name: 'Bomba Hidráulica de Direção Industrial HD-200',
      code: 'PA-BH-200',
      stock: 12,
      reservedStock: 4,
      inProductionStock: 10,
      price: 580.00,
      costPrice: 285.00,
      minStock: 5,
      category: 'Sistemas Hidráulicos & Manufatura',
      location: 'Galpão 2 - Prateleira PA-01',
      unit: 'UN',
      ncm: '8413.60.19',
      itemType: 'produto_acabado',
      hasBom: true,
      bomId: bomBhId,
      leadTimeDays: 4,
    },
    {
      id: paAtId,
      companyId,
      name: 'Atuador Eletromecânico de Embreagem AT-50',
      code: 'PA-AT-050',
      stock: 6,
      reservedStock: 2,
      inProductionStock: 8,
      price: 420.00,
      costPrice: 195.00,
      minStock: 6,
      category: 'Mecatrônica & Atuadores',
      location: 'Galpão 2 - Prateleira PA-02',
      unit: 'UN',
      ncm: '8501.31.10',
      itemType: 'produto_acabado',
      hasBom: true,
      bomId: bomAtId,
      leadTimeDays: 5,
    },
    {
      id: paCpId,
      companyId,
      name: 'Cilindro Pneumático Dupla Ação ISO 6431',
      code: 'PA-CP-100',
      stock: 8,
      reservedStock: 2,
      price: 320.00,
      costPrice: 145.00,
      minStock: 4,
      category: 'Pneumática Industrial',
      location: 'Galpão 2 - Prateleira PA-03',
      unit: 'UN',
      ncm: '8412.31.10',
      itemType: 'produto_acabado',
      hasBom: false,
      leadTimeDays: 3,
    },
    {
      id: mpChId,
      companyId,
      name: 'Chapa de Aço Carbono SAE 1020 3mm',
      code: 'MP-CH-1020',
      stock: 40.0,
      price: 95.00,
      costPrice: 48.00,
      minStock: 15.0,
      category: 'Metais & Matérias-Primas',
      location: 'Pátio MP - Racks 03',
      unit: 'M²',
      itemType: 'materia_prima',
      leadTimeDays: 5,
    },
    {
      id: mpExId,
      companyId,
      name: 'Eixo Retificado Aço 4140 Ø 25mm',
      code: 'MP-EX-4140',
      stock: 30.0,
      price: 72.00,
      costPrice: 35.00,
      minStock: 10.0,
      category: 'Metais & Matérias-Primas',
      location: 'Pátio MP - Barraqueira 01',
      unit: 'M',
      itemType: 'materia_prima',
      leadTimeDays: 6,
    },
    {
      id: cpRlId,
      companyId,
      name: 'Rolamento de Esferas Blindado SKF 6205-2RS',
      code: 'CP-RL-6205',
      stock: 75,
      price: 36.00,
      costPrice: 18.50,
      minStock: 20,
      category: 'Rolamentos & Mancais',
      location: 'Almoxarifado B - Gaveta 14',
      unit: 'UN',
      itemType: 'componente',
      leadTimeDays: 3,
    },
    {
      id: cpRtId,
      companyId,
      name: 'Retentor de Óleo Duplo Labirinto Viton 25x47x7',
      code: 'CP-RT-2547',
      stock: 90,
      price: 24.00,
      costPrice: 12.00,
      minStock: 30,
      category: 'Vedações Industriais',
      location: 'Almoxarifado B - Gaveta 08',
      unit: 'UN',
      itemType: 'componente',
      leadTimeDays: 2,
    },
    {
      id: cpMtId,
      companyId,
      name: 'Micro Motor DC 24V 3500RPM com Encoder',
      code: 'CP-MT-2435',
      stock: 15,
      price: 150.00,
      costPrice: 75.00,
      minStock: 10,
      category: 'Mecatrônica & Motores',
      location: 'Almoxarifado B - Prateleira Eletrônica',
      unit: 'UN',
      itemType: 'componente',
      leadTimeDays: 7,
    },
    {
      id: insFlId,
      companyId,
      name: 'Fluido de Teste Hidráulico ISO VG 46',
      code: 'INS-FL-VG46',
      stock: 120.0,
      price: 32.00,
      costPrice: 16.00,
      minStock: 30.0,
      category: 'Insumos Industriais',
      location: 'Depósito de Químicos - Tanque 02',
      unit: 'L',
      itemType: 'insumo',
    },
    {
      id: insPfId,
      companyId,
      name: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
      code: 'INS-PF-M830',
      stock: 30,
      price: 45.00,
      costPrice: 22.00,
      minStock: 10,
      category: 'Fixadores & Parafusos',
      location: 'Almoxarifado A - Prateleira Fixadores',
      unit: 'CX',
      itemType: 'insumo',
    }
  ];

  const boms: BillOfMaterials[] = [
    {
      id: bomBhId,
      companyId,
      finishedProductPartId: paBhId,
      finishedProductName: 'Bomba Hidráulica de Direção Industrial HD-200',
      finishedProductCode: 'PA-BH-200',
      name: 'Bomba Hidráulica de Direção Industrial HD-200',
      code: 'BOM-HD-200',
      version: 'v1.0',
      active: true,
      laborCost: 75.00,
      indirectCost: 35.00,
      totalMaterialCost: 175.00,
      totalUnitCost: 285.00,
      suggestedSalePrice: 580.00,
      estimatedProductionHours: 2.5,
      validityDate: '2027-12-31',
      notes: 'Estrutura técnica com teste hidrostático e balanceamento dinâmico.',
      items: [
        {
          id: `bi-${timestamp}-1`,
          componentPartId: mpChId,
          componentPartName: 'Chapa de Aço Carbono SAE 1020 3mm',
          componentPartCode: 'MP-CH-1020',
          quantity: 0.5,
          unit: 'M²',
          unitCost: 48.00,
          lossPercentage: 5,
          effectiveQuantity: 0.525,
          totalCost: 25.20,
          notes: 'Corte a laser e estampagem da carcaça'
        },
        {
          id: `bi-${timestamp}-2`,
          componentPartId: mpExId,
          componentPartName: 'Eixo Retificado Aço 4140 Ø 25mm',
          componentPartCode: 'MP-EX-4140',
          quantity: 0.4,
          unit: 'M',
          unitCost: 35.00,
          lossPercentage: 3,
          effectiveQuantity: 0.412,
          totalCost: 14.42,
          notes: 'Usinagem CNC do eixo rotor'
        },
        {
          id: `bi-${timestamp}-3`,
          componentPartId: cpRlId,
          componentPartName: 'Rolamento de Esferas Blindado SKF 6205-2RS',
          componentPartCode: 'CP-RL-6205',
          quantity: 2,
          unit: 'UN',
          unitCost: 18.50,
          lossPercentage: 0,
          effectiveQuantity: 2,
          totalCost: 37.00
        },
        {
          id: `bi-${timestamp}-4`,
          componentPartId: cpRtId,
          componentPartName: 'Retentor de Óleo Duplo Labirinto Viton 25x47x7',
          componentPartCode: 'CP-RT-2547',
          quantity: 2,
          unit: 'UN',
          unitCost: 12.00,
          lossPercentage: 2,
          effectiveQuantity: 2.04,
          totalCost: 24.48
        },
        {
          id: `bi-${timestamp}-5`,
          componentPartId: insFlId,
          componentPartName: 'Fluido de Teste Hidráulico ISO VG 46',
          componentPartCode: 'INS-FL-VG46',
          quantity: 1.5,
          unit: 'L',
          unitCost: 16.00,
          lossPercentage: 10,
          effectiveQuantity: 1.65,
          totalCost: 26.40
        },
        {
          id: `bi-${timestamp}-6`,
          componentPartId: insPfId,
          componentPartName: 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
          componentPartCode: 'INS-PF-M830',
          quantity: 0.1,
          unit: 'CX',
          unitCost: 22.00,
          lossPercentage: 0,
          effectiveQuantity: 0.1,
          totalCost: 2.20
        }
      ]
    }
  ];

  return { parts, boms };
}

