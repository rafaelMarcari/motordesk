/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface FocusCertificado {
  subject: string;
  cnpjCert: string;
  validoAte: string;
  fingerprint: string;
  hasPfx: boolean;
  diasParaVencer?: number;
}

export interface FocusEmpresa {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoMunicipal: string;
  codigoMunicipio: string;
  uf?: string;
  regime: 'mei' | 'simples' | 'normal';
  ambiente: 'homologacao' | 'producao';
  serieDps: string;
  proximoNumeroDps: number;
  webhookUrl?: string;
  webhookSecret?: string;
  token: string;
  ativo: boolean;
  criadoEm: string;
  certificado?: FocusCertificado;
}

export interface FocusTomador {
  cnpjCpf: string;
  razaoSocial: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  codigoMunicipio?: string;
  uf?: string;
  cep?: string;
}

export interface FocusServico {
  discriminacao: string;
  codigoTributacaoNacional?: string;
  itemListaServico?: string;
  valorServicos: number;
  aliquotaIss: number;
  valorIss: number;
  valorLiquido: number;
  retencoes?: {
    pis?: number;
    cofins?: number;
    inss?: number;
    ir?: number;
    csll?: number;
  };
}

export interface FocusNota {
  id: string;
  ref: string;
  empresaId: string;
  empresaCnpj: string;
  empresaRazaoSocial: string;
  numeroDps: number;
  serieDps: string;
  chaveAcesso: string;
  status: 'autorizado' | 'processando_autorizacao' | 'erro_autorizacao' | 'cancelado';
  tomador: FocusTomador;
  servico: FocusServico;
  ambiente: 'homologacao' | 'producao';
  criadoEm: string;
  autorizadoEm?: string;
  canceladoEm?: string;
  justificativaCancelamento?: string;
  xml?: string;
  mensagensSefin?: string[];
  protocolo?: string;
}

export interface FocusWebhookLog {
  id: string;
  empresaId: string;
  empresaCnpj: string;
  evento: 'nfse.autorizada' | 'nfse.cancelada' | 'nfse.rejeitada' | 'teste';
  url: string;
  statusCode?: number;
  enviadoEm: string;
  payload: any;
  sucesso: boolean;
  resposta?: string;
}

export interface FocusDatabase {
  masterPasswordHash: string;
  masterPasswordSalt: string;
  driver: 'mock' | 'nfse_nacional';
  empresas: FocusEmpresa[];
  notas: FocusNota[];
  webhookLogs: FocusWebhookLog[];
  updatedAt: string;
}

const NOTAS_API_STORE_PATH = path.join(process.cwd(), 'data', 'notas_api_store.json');
const DEFAULT_MASTER_PASSWORD = 'motordesk@admin2026';

let inMemoryFocusDb: FocusDatabase | null = null;

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function generateRandomToken(prefix: string = 'fcs_tok_'): string {
  return `${prefix}${crypto.randomBytes(24).toString('hex')}`;
}

export function generateRandomSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

export function generateDpsKey(cnpj: string, serie: string, numero: number): string {
  const cleanCnpj = cnpj.replace(/\D/g, '').padStart(14, '0');
  const now = new Date();
  const yearTwoDigits = now.getFullYear().toString().slice(-2);
  const monthTwoDigits = (now.getMonth() + 1).toString().padStart(2, '0');
  const cleanSerie = serie.replace(/\D/g, '').padStart(5, '0');
  const cleanNumero = numero.toString().padStart(15, '0');
  const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
  const baseKey = `43${yearTwoDigits}${monthTwoDigits}${cleanCnpj}55${cleanSerie}${cleanNumero}${randomCode}`;
  
  // Calculate check digit (Mod 11)
  let sum = 0;
  let weight = 2;
  for (let i = baseKey.length - 1; i >= 0; i--) {
    sum += parseInt(baseKey[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  return `${baseKey}${checkDigit}`;
}

function generateSignedXmlDps(empresa: FocusEmpresa, nota: Partial<FocusNota>): string {
  const dpsId = `DPS_${nota.chaveAcesso}`;
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="${dpsId}">
    <tpAmb>${empresa.ambiente === 'producao' ? '1' : '2'}</tpAmb>
    <dhEmi>${now}</dhEmi>
    <verAplic>MotorDesk_Focus_1.0</verAplic>
    <serie>${empresa.serieDps}</serie>
    <nDPS>${nota.numeroDps}</nDPS>
    <emit>
      <CNPJ>${empresa.cnpj.replace(/\D/g, '')}</CNPJ>
      <xNome>${empresa.razaoSocial}</xNome>
      <xFant>${empresa.nomeFantasia || empresa.razaoSocial}</xFant>
      <IM>${empresa.inscricaoMunicipal}</IM>
      <cMun>${empresa.codigoMunicipio}</cMun>
      <CRT>${empresa.regime === 'simples' ? '1' : empresa.regime === 'mei' ? '4' : '3'}</CRT>
    </emit>
    <toma>
      <CNPJ>${(nota.tomador?.cnpjCpf || '').replace(/\D/g, '')}</CNPJ>
      <xNome>${nota.tomador?.razaoSocial || 'Tomador do Servico'}</xNome>
      <xEnd>${nota.tomador?.endereco || 'Logradouro Principal'}</xEnd>
      <email>${nota.tomador?.email || 'contato@cliente.com.br'}</email>
    </toma>
    <serv>
      <cTribNac>${nota.servico?.codigoTributacaoNacional || '14.01.01'}</cTribNac>
      <xDescServ>${nota.servico?.discriminacao || 'Serviços Mecânicos Automotivos'}</xDescServ>
      <vServ>${(nota.servico?.valorServicos || 0).toFixed(2)}</vServ>
      <vISS>${(nota.servico?.valorIss || 0).toFixed(2)}</vISS>
      <vLiq>${(nota.servico?.valorLiquido || 0).toFixed(2)}</vLiq>
    </serv>
  </infDPS>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="#${dpsId}">
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${crypto.createHash('sha256').update(dpsId).digest('base64')}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${crypto.randomBytes(128).toString('base64')}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>${crypto.randomBytes(256).toString('base64')}</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>
</DPS>`;
}

export function initFocusDatabase(registeredCompanies: any[] = []): FocusDatabase {
  if (inMemoryFocusDb) return inMemoryFocusDb;

  try {
    if (fs.existsSync(NOTAS_API_STORE_PATH)) {
      const raw = fs.readFileSync(NOTAS_API_STORE_PATH, 'utf-8');
      inMemoryFocusDb = JSON.parse(raw);
      if (inMemoryFocusDb && inMemoryFocusDb.empresas && inMemoryFocusDb.empresas.length > 0) {
        return inMemoryFocusDb;
      }
    }
  } catch (err) {
    console.warn('[NOTAS-API] Erro ao carregar notas_api_store.json, inicializando do zero:', err);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const masterPasswordHash = hashPassword(DEFAULT_MASTER_PASSWORD, salt);

  // Seed default companies from registeredCompanies or default
  const defaultEmpresas: FocusEmpresa[] = [];
  const companiesToSeed = registeredCompanies && registeredCompanies.length > 0 ? registeredCompanies : [
    {
      id: 'comp-1',
      cnpj: '11.222.333/0001-44',
      corporateName: 'MotorDesk Centro Automotivo Matriz Ltda',
      tradeName: 'MotorDesk Matriz Pinheiros',
      inscricaoMunicipal: '98765432-1',
      codigoMunicipio: '3550308',
      uf: 'SP',
      businessType: 'OFICINA_COMERCIO'
    },
    {
      id: 'comp-2',
      cnpj: '22.333.444/0001-55',
      corporateName: 'MotorDesk Moema Serviços e Peças Ltda',
      tradeName: 'MotorDesk Moema',
      inscricaoMunicipal: '87654321-0',
      codigoMunicipio: '3550308',
      uf: 'SP',
      businessType: 'OFICINA'
    },
    {
      id: 'comp-3',
      cnpj: '33.444.555/0001-66',
      corporateName: 'MotorDesk Barra da Tijuca Auto Center S/A',
      tradeName: 'MotorDesk Barra',
      inscricaoMunicipal: '76543210-9',
      codigoMunicipio: '3304557',
      uf: 'RJ',
      businessType: 'OFICINA_COMERCIO'
    }
  ];

  companiesToSeed.forEach((comp, idx) => {
    const validadeCert = new Date();
    validadeCert.setFullYear(validadeCert.getFullYear() + 1);

    defaultEmpresas.push({
      id: comp.id || `emp-${idx + 1}`,
      cnpj: comp.cnpj || `00.000.000/000${idx + 1}-00`,
      razaoSocial: comp.corporateName || comp.tradeName || `Empresa Cliente ${idx + 1}`,
      nomeFantasia: comp.tradeName || comp.corporateName,
      inscricaoMunicipal: comp.inscricaoMunicipal || `${10000000 + idx}`,
      codigoMunicipio: comp.codigoMunicipio || '3550308', // SP Capital default
      uf: comp.uf || 'SP',
      regime: 'simples',
      ambiente: 'homologacao',
      serieDps: '1',
      proximoNumeroDps: 101 + (idx * 50),
      token: generateRandomToken(`fcs_tok_emp${idx + 1}_`),
      webhookSecret: generateRandomSecret(),
      webhookUrl: 'https://webhook.site/motordesk-nfse-test',
      ativo: true,
      criadoEm: new Date().toISOString(),
      certificado: {
        subject: `CN=${comp.corporateName || comp.tradeName || 'Empresa'}:000000000000, OU=Certificado A1, O=ICP-Brasil, C=BR`,
        cnpjCert: (comp.cnpj || '11222333000144').replace(/\D/g, ''),
        validoAte: validadeCert.toISOString(),
        fingerprint: crypto.randomBytes(20).toString('hex').toUpperCase(),
        hasPfx: true,
        diasParaVencer: 365
      }
    });
  });

  // Seed sample initial notes for immediate realism
  const sampleNotas: FocusNota[] = [
    {
      id: 'nota-fcs-1',
      ref: 'OS-2026-001',
      empresaId: defaultEmpresas[0].id,
      empresaCnpj: defaultEmpresas[0].cnpj,
      empresaRazaoSocial: defaultEmpresas[0].razaoSocial,
      numeroDps: 100,
      serieDps: '1',
      chaveAcesso: generateDpsKey(defaultEmpresas[0].cnpj, '1', 100),
      status: 'autorizado',
      ambiente: 'homologacao',
      protocolo: '20260923000145892',
      tomador: {
        cnpjCpf: '123.456.789-00',
        razaoSocial: 'João Pedro da Silva',
        email: 'joao.silva@email.com',
        telefone: '(11) 98765-4321',
        endereco: 'Rua das Flores, 123 - São Paulo - SP'
      },
      servico: {
        discriminacao: 'Alinhamento 3D Computadorizado, Balanceamento e Revisão Geral de Suspensão',
        codigoTributacaoNacional: '14.01.01',
        valorServicos: 450.00,
        aliquotaIss: 5.0,
        valorIss: 22.50,
        valorLiquido: 450.00
      },
      criadoEm: '2026-09-22T14:30:00.000Z',
      autorizadoEm: '2026-09-22T14:30:04.000Z',
      mensagensSefin: ['DPS processada e autorizada com sucesso na Sefin Nacional.']
    },
    {
      id: 'nota-fcs-2',
      ref: 'OS-2026-002',
      empresaId: defaultEmpresas[0].id,
      empresaCnpj: defaultEmpresas[0].cnpj,
      empresaRazaoSocial: defaultEmpresas[0].razaoSocial,
      numeroDps: 101,
      serieDps: '1',
      chaveAcesso: generateDpsKey(defaultEmpresas[0].cnpj, '1', 101),
      status: 'autorizado',
      ambiente: 'homologacao',
      protocolo: '20260923000145893',
      tomador: {
        cnpjCpf: '11.222.333/0001-44',
        razaoSocial: 'Empresa ABC Transportes e Frotas Ltda',
        email: 'fiscal@abctransportes.com.br',
        telefone: '(11) 3322-9988',
        endereco: 'Av. das Nações Unidas, 4500 - São Paulo - SP'
      },
      servico: {
        discriminacao: 'Troca de Óleo de Motor Sintético, Filtros e Higienização de Ar Condicionado de Frota',
        codigoTributacaoNacional: '14.01.01',
        valorServicos: 1280.00,
        aliquotaIss: 5.0,
        valorIss: 64.00,
        valorLiquido: 1280.00
      },
      criadoEm: '2026-09-23T09:15:00.000Z',
      autorizadoEm: '2026-09-23T09:15:05.000Z',
      mensagensSefin: ['DPS processada e autorizada com sucesso na Sefin Nacional.']
    }
  ];

  sampleNotas.forEach(n => {
    n.xml = generateSignedXmlDps(defaultEmpresas[0], n);
  });

  inMemoryFocusDb = {
    masterPasswordHash,
    masterPasswordSalt: salt,
    driver: 'mock',
    empresas: defaultEmpresas,
    notas: sampleNotas,
    webhookLogs: [
      {
        id: 'wh-log-1',
        empresaId: defaultEmpresas[0].id,
        empresaCnpj: defaultEmpresas[0].cnpj,
        evento: 'nfse.autorizada',
        url: defaultEmpresas[0].webhookUrl || '',
        statusCode: 200,
        enviadoEm: '2026-09-23T09:15:06.000Z',
        sucesso: true,
        resposta: '{"status":"received"}',
        payload: {
          ref: 'OS-2026-002',
          status: 'autorizado',
          numero_dps: 101,
          chave_acesso: sampleNotas[1].chaveAcesso
        }
      }
    ],
    updatedAt: new Date().toISOString()
  };

  saveFocusDatabase(inMemoryFocusDb);
  return inMemoryFocusDb;
}

export function saveFocusDatabase(db: FocusDatabase): void {
  try {
    const dir = path.dirname(NOTAS_API_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db.updatedAt = new Date().toISOString();
    fs.writeFileSync(NOTAS_API_STORE_PATH, JSON.stringify(db, null, 2), 'utf-8');
    inMemoryFocusDb = db;
  } catch (err) {
    console.error('[NOTAS-API] Erro ao salvar notas_api_store.json:', err);
  }
}

export function verifyMasterPassword(password: string): boolean {
  const db = initFocusDatabase();
  const hash = hashPassword(password, db.masterPasswordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(db.masterPasswordHash, 'hex'));
}

export function updateMasterPassword(oldPass: string, newPass: string): boolean {
  if (!verifyMasterPassword(oldPass)) return false;
  if (!newPass || newPass.trim().length < 6) return false;

  const db = initFocusDatabase();
  const newSalt = crypto.randomBytes(16).toString('hex');
  db.masterPasswordSalt = newSalt;
  db.masterPasswordHash = hashPassword(newPass.trim(), newSalt);
  saveFocusDatabase(db);
  return true;
}

export function getNotasApiStats() {
  const db = initFocusDatabase();
  const totalEmpresas = db.empresas.filter(e => e.ativo).length;
  const totalNotas = db.notas.length;
  const notasAutorizadas = db.notas.filter(n => n.status === 'autorizado').length;
  const notasCanceladas = db.notas.filter(n => n.status === 'cancelado').length;
  const valorTotal = db.notas
    .filter(n => n.status === 'autorizado')
    .reduce((acc, n) => acc + (n.servico.valorServicos || 0), 0);
  const certsAtivos = db.empresas.filter(e => e.certificado?.hasPfx).length;

  return {
    totalEmpresas,
    totalNotas,
    notasAutorizadas,
    notasCanceladas,
    valorTotal,
    certsAtivos,
    driver: db.driver
  };
}

export function getEmpresas(): FocusEmpresa[] {
  const db = initFocusDatabase();
  return db.empresas.map(e => {
    // calculate remaining days of cert
    if (e.certificado && e.certificado.validoAte) {
      const diffMs = new Date(e.certificado.validoAte).getTime() - Date.now();
      e.certificado.diasParaVencer = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
    return e;
  });
}

export function getEmpresaById(id: string): FocusEmpresa | undefined {
  const db = initFocusDatabase();
  return db.empresas.find(e => e.id === id);
}

export function getEmpresaByToken(token: string): FocusEmpresa | undefined {
  const db = initFocusDatabase();
  const clean = token.replace(/^Bearer\s+/i, '').replace(/^Basic\s+/i, '').trim();
  return db.empresas.find(e => e.token === clean && e.ativo);
}

export function saveEmpresa(empresaData: Partial<FocusEmpresa>): FocusEmpresa {
  const db = initFocusDatabase();
  const now = new Date().toISOString();

  if (empresaData.id) {
    // Edit existing
    const idx = db.empresas.findIndex(e => e.id === empresaData.id);
    if (idx !== -1) {
      const existing = db.empresas[idx];
      db.empresas[idx] = {
        ...existing,
        ...empresaData,
        id: existing.id
      };
      saveFocusDatabase(db);
      return db.empresas[idx];
    }
  }

  // Create new
  const newEmpresa: FocusEmpresa = {
    id: empresaData.id || `emp-${Date.now()}`,
    cnpj: empresaData.cnpj || '00.000.000/0001-00',
    razaoSocial: empresaData.razaoSocial || 'Nova Empresa Emitente Ltda',
    nomeFantasia: empresaData.nomeFantasia || empresaData.razaoSocial,
    inscricaoMunicipal: empresaData.inscricaoMunicipal || '12345678',
    codigoMunicipio: empresaData.codigoMunicipio || '3550308',
    uf: empresaData.uf || 'SP',
    regime: empresaData.regime || 'simples',
    ambiente: empresaData.ambiente || 'homologacao',
    serieDps: empresaData.serieDps || '1',
    proximoNumeroDps: empresaData.proximoNumeroDps || 1,
    webhookUrl: empresaData.webhookUrl || '',
    webhookSecret: generateRandomSecret(),
    token: generateRandomToken(),
    ativo: true,
    criadoEm: now,
    certificado: empresaData.certificado
  };

  db.empresas.unshift(newEmpresa);
  saveFocusDatabase(db);
  return newEmpresa;
}

export function deleteEmpresa(id: string): boolean {
  const db = initFocusDatabase();
  const idx = db.empresas.findIndex(e => e.id === id);
  if (idx !== -1) {
    db.empresas[idx].ativo = false;
    saveFocusDatabase(db);
    return true;
  }
  return false;
}

export function regenerateEmpresaToken(id: string): string | null {
  const db = initFocusDatabase();
  const empresa = db.empresas.find(e => e.id === id);
  if (!empresa) return null;
  empresa.token = generateRandomToken();
  empresa.webhookSecret = generateRandomSecret();
  saveFocusDatabase(db);
  return empresa.token;
}

export function updateCertificadoA1(id: string, certInfo: { subject?: string; password?: string; pfxBase64?: string; validadeDias?: number }): FocusEmpresa | null {
  const db = initFocusDatabase();
  const empresa = db.empresas.find(e => e.id === id);
  if (!empresa) return null;

  const validade = new Date();
  validade.setDate(validade.getDate() + (certInfo.validadeDias || 365));

  empresa.certificado = {
    subject: certInfo.subject || `CN=${empresa.razaoSocial}:${empresa.cnpj.replace(/\D/g, '')}, OU=Certificado Digital A1, O=ICP-Brasil, C=BR`,
    cnpjCert: empresa.cnpj.replace(/\D/g, ''),
    validoAte: validade.toISOString(),
    fingerprint: crypto.randomBytes(20).toString('hex').toUpperCase(),
    hasPfx: true,
    diasParaVencer: certInfo.validadeDias || 365
  };

  saveFocusDatabase(db);
  return empresa;
}

export function getNotas(filters?: { status?: string; empresaId?: string; q?: string }): FocusNota[] {
  const db = initFocusDatabase();
  let list = [...db.notas];

  if (filters?.status && filters.status !== 'todas') {
    list = list.filter(n => n.status === filters.status);
  }
  if (filters?.empresaId && filters.empresaId !== 'todas') {
    list = list.filter(n => n.empresaId === filters.empresaId);
  }
  if (filters?.q && filters.q.trim()) {
    const q = filters.q.toLowerCase().trim();
    list = list.filter(n => 
      n.ref.toLowerCase().includes(q) ||
      n.tomador.razaoSocial.toLowerCase().includes(q) ||
      n.tomador.cnpjCpf.includes(q) ||
      n.chaveAcesso.includes(q) ||
      n.numeroDps.toString().includes(q)
    );
  }

  return list.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
}

export function emitirNfse(payload: {
  empresaId: string;
  ref: string;
  tomador: FocusTomador;
  servico: {
    discriminacao: string;
    codigoTributacaoNacional?: string;
    valorServicos: number;
    aliquotaIss?: number;
    retencoes?: any;
  };
  ambiente?: 'homologacao' | 'producao';
}): FocusNota {
  const db = initFocusDatabase();
  const empresa = db.empresas.find(e => e.id === payload.empresaId);
  if (!empresa) {
    throw new Error(`Empresa com ID "${payload.empresaId}" não encontrada no cadastro do portal.`);
  }

  const numeroDps = empresa.proximoNumeroDps || 1;
  empresa.proximoNumeroDps = numeroDps + 1;

  const chaveAcesso = generateDpsKey(empresa.cnpj, empresa.serieDps, numeroDps);
  const now = new Date().toISOString();

  const valorServicos = Number(payload.servico.valorServicos) || 0;
  const aliquotaIss = Number(payload.servico.aliquotaIss) || (empresa.regime === 'simples' ? 3.0 : 5.0);
  const valorIss = +(valorServicos * (aliquotaIss / 100)).toFixed(2);
  const valorLiquido = +(valorServicos).toFixed(2);

  const novaNota: FocusNota = {
    id: `nota-fcs-${Date.now()}`,
    ref: payload.ref || `REF-${Date.now()}`,
    empresaId: empresa.id,
    empresaCnpj: empresa.cnpj,
    empresaRazaoSocial: empresa.razaoSocial,
    numeroDps,
    serieDps: empresa.serieDps,
    chaveAcesso,
    status: 'autorizado',
    ambiente: payload.ambiente || empresa.ambiente,
    protocolo: `${new Date().getFullYear()}${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    tomador: payload.tomador,
    servico: {
      discriminacao: payload.servico.discriminacao,
      codigoTributacaoNacional: payload.servico.codigoTributacaoNacional || '14.01.01',
      valorServicos,
      aliquotaIss,
      valorIss,
      valorLiquido,
      retencoes: payload.servico.retencoes
    },
    criadoEm: now,
    autorizadoEm: now,
    mensagensSefin: [
      `DPS nº ${numeroDps} série ${empresa.serieDps} assinada digitalmente com sucesso.`,
      `Protocolo Sefin Nacional gerado: 2026${numeroDps}9982741. Autorização concedida.`
    ]
  };

  novaNota.xml = generateSignedXmlDps(empresa, novaNota);
  db.notas.unshift(novaNota);

  // Trigger simulated webhook if configured
  if (empresa.webhookUrl) {
    const webhookEntry: FocusWebhookLog = {
      id: `wh-log-${Date.now()}`,
      empresaId: empresa.id,
      empresaCnpj: empresa.cnpj,
      evento: 'nfse.autorizada',
      url: empresa.webhookUrl,
      statusCode: 200,
      enviadoEm: new Date().toISOString(),
      sucesso: true,
      resposta: '{"status":"received","processed":true}',
      payload: {
        ref: novaNota.ref,
        status: novaNota.status,
        numero_dps: novaNota.numeroDps,
        serie_dps: novaNota.serieDps,
        chave_acesso: novaNota.chaveAcesso,
        autorizado_em: novaNota.autorizadoEm
      }
    };
    db.webhookLogs.unshift(webhookEntry);
  }

  saveFocusDatabase(db);
  return novaNota;
}

export function cancelarNfse(notaId: string, justificativa: string): FocusNota {
  const db = initFocusDatabase();
  const nota = db.notas.find(n => n.id === notaId || n.ref === notaId);
  if (!nota) {
    throw new Error(`Nota fiscal com identificador "${notaId}" não encontrada.`);
  }

  if (nota.status === 'cancelado') {
    throw new Error('Esta nota fiscal já se encontra cancelada.');
  }

  if (!justificativa || justificativa.trim().length < 15) {
    throw new Error('A justificativa de cancelamento é obrigatória e deve conter pelo menos 15 caracteres (exigência Sefin).');
  }

  const now = new Date().toISOString();
  nota.status = 'cancelado';
  nota.canceladoEm = now;
  nota.justificativaCancelamento = justificativa.trim();
  nota.mensagensSefin = [
    ...(nota.mensagensSefin || []),
    `Cancelamento homologado na Sefin Nacional em ${now}. Motivo: ${justificativa.trim()}`
  ];

  // Disparar log de webhook para o cancelamento
  const empresa = db.empresas.find(e => e.id === nota.empresaId);
  if (empresa && empresa.webhookUrl) {
    db.webhookLogs.unshift({
      id: `wh-log-${Date.now()}`,
      empresaId: empresa.id,
      empresaCnpj: empresa.cnpj,
      evento: 'nfse.cancelada',
      url: empresa.webhookUrl,
      statusCode: 200,
      enviadoEm: now,
      sucesso: true,
      resposta: '{"status":"cancellation_acknowledged"}',
      payload: {
        ref: nota.ref,
        status: 'cancelado',
        cancelado_em: now,
        justificativa: justificativa.trim()
      }
    });
  }

  saveFocusDatabase(db);
  return nota;
}

export function getDanfseHtml(notaId: string): string {
  const db = initFocusDatabase();
  const nota = db.notas.find(n => n.id === notaId || n.ref === notaId);
  if (!nota) throw new Error('Nota fiscal não encontrada.');

  const empresa = db.empresas.find(e => e.id === nota.empresaId) || {
    razaoSocial: nota.empresaRazaoSocial,
    cnpj: nota.empresaCnpj,
    inscricaoMunicipal: '98765432-1',
    codigoMunicipio: '3550308',
    uf: 'SP'
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFSe - Nota Fiscal de Serviços Eletrônica nº ${nota.numeroDps}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #1e293b; background: #fff; }
    .container { max-width: 800px; margin: 0 auto; border: 2px solid #0f172a; padding: 20px; border-radius: 4px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 16px; font-weight: 800; text-transform: uppercase; }
    .box { border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 12px; border-radius: 4px; }
    .box-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 6px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .val-highlight { font-size: 16px; font-weight: bold; color: #0f172a; }
    .status-badge { display: inline-block; padding: 4px 8px; font-weight: bold; font-size: 12px; border-radius: 4px; }
    .status-autorizado { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .status-cancelado { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    @media print {
      body { margin: 0; }
      .container { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Imprimir / Salvar PDF</button>
  </div>
  <div class="container">
    <div class="header">
      <div>
        <div class="title">DANFSe - Documento Auxiliar da NFS-e Nacional</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Padrão Nacional Sefin / RFB</div>
      </div>
      <div style="text-align: right;">
        <span class="status-badge status-${nota.status}">${nota.status === 'autorizado' ? 'AUTORIZADA' : 'CANCELADA'}</span>
        <div style="font-size: 11px; font-family: monospace; margin-top: 4px;">DPS Nº ${nota.numeroDps} Série ${nota.serieDps}</div>
      </div>
    </div>

    <div class="box">
      <div class="box-title">Chave de Acesso da NFS-e Nacional</div>
      <div style="font-family: monospace; font-size: 13px; font-weight: bold; letter-spacing: 1px;">${nota.chaveAcesso}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Protocolo de Autorização: ${nota.protocolo || '202699827112'} | Emissão: ${new Date(nota.criadoEm).toLocaleString('pt-BR')}</div>
    </div>

    <div class="box">
      <div class="box-title">Prestador de Serviços (Emitente)</div>
      <div class="grid">
        <div><strong>Razão Social:</strong> ${empresa.razaoSocial}</div>
        <div><strong>CNPJ:</strong> ${empresa.cnpj}</div>
        <div><strong>Inscrição Municipal:</strong> ${empresa.inscricaoMunicipal}</div>
        <div><strong>Município / UF:</strong> ${empresa.codigoMunicipio} / ${empresa.uf}</div>
      </div>
    </div>

    <div class="box">
      <div class="box-title">Tomador de Serviços (Cliente / Destinatário)</div>
      <div class="grid">
        <div><strong>Nome / Razão Social:</strong> ${nota.tomador.razaoSocial}</div>
        <div><strong>CPF / CNPJ:</strong> ${nota.tomador.cnpjCpf}</div>
        <div><strong>Endereço:</strong> ${nota.tomador.endereco || 'Não informado'}</div>
        <div><strong>E-mail / Telefone:</strong> ${nota.tomador.email || '-'} | ${nota.tomador.telefone || '-'}</div>
      </div>
    </div>

    <div class="box">
      <div class="box-title">Discriminação dos Serviços Prestados</div>
      <div style="font-size: 12px; white-space: pre-wrap; line-height: 1.5; min-height: 60px;">${nota.servico.discriminacao}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 8px;">Código Tributação Nacional: ${nota.servico.codigoTributacaoNacional || '14.01.01'}</div>
    </div>

    <div class="box">
      <div class="box-title">Cálculo dos Impostos e Valor Total</div>
      <div class="grid" style="grid-template-columns: repeat(4, 1fr); text-align: center;">
        <div>
          <div style="font-size: 10px; color: #64748b;">Valor dos Serviços</div>
          <div class="val-highlight">R$ ${nota.servico.valorServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b;">Alíquota ISS</div>
          <div class="val-highlight">${nota.servico.aliquotaIss.toFixed(2)}%</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b;">Valor do ISS</div>
          <div class="val-highlight">R$ ${nota.servico.valorIss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b;">Valor Líquido da NFS-e</div>
          <div class="val-highlight" style="color: #16a34a;">R$ ${nota.servico.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>

    ${nota.justificativaCancelamento ? `
    <div class="box" style="background: #fef2f2; border-color: #fca5a5;">
      <div class="box-title" style="color: #991b1b;">Motivo do Cancelamento</div>
      <div style="font-size: 12px; color: #991b1b;">${nota.justificativaCancelamento} (Cancelada em: ${new Date(nota.canceladoEm || '').toLocaleString('pt-BR')})</div>
    </div>
    ` : ''}

    <div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px;">
      MotorDesk Focus NFS-e Gateway — Autenticidade garantida por Assinatura Digital ICP-Brasil
    </div>
  </div>
</body>
</html>`;
}
