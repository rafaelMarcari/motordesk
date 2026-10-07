// NF-e modelo 55, leiaute 4.00: entrada no padrão de campos da Focus NFe, validação, montagem do
// XML, chave de acesso, assinatura digital (XMLDSig, RSA-SHA1, C14N) e XMLs de eventos/inutilização.
import crypto from "crypto";
import { SignedXml } from "xml-crypto";
import { clean, dec, digits, group, r2, tag } from "./xml.ts";
import { calcItem, DEFAULT_UF_TABLE, ItemInput, ItemTaxResult, TaxContext, UF_CODES, UfTaxRow } from "./tax.ts";

export const NFE_NS = "http://www.portalfiscal.inf.br/nfe";
const HOMOLOG_NOME = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
export const CCE_COND_USO =
  "A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.";

export interface FiscalProfile {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  ie: string;
  iest?: Record<string, string>; // IE de substituto tributário por UF
  im?: string;
  cnae?: string;
  crt: 1 | 2 | 3 | 4;
  endereco: { logradouro: string; numero: string; complemento?: string; bairro: string; codigoMunicipio: string; municipio: string; uf: string; cep: string; telefone?: string };
  ambiente: 1 | 2;
  serie: number;
  proximoNumero: number;
  pisCofinsRegime: "cumulativo" | "nao_cumulativo";
  excluirIcmsBasePisCofins: boolean;
  contribuinteIpi: boolean;
  aliqCreditoSimples?: number;
  informacoesComplementaresPadrao?: string;
}

export interface RespTec { cnpj: string; contato: string; email: string; fone: string }

export interface BuildResult {
  chave: string;
  numero: number;
  serie: number;
  xml: string; // <NFe> sem assinatura
  totals: Record<string, number>;
  items: ItemTaxResult[];
  ufDest: string;
  idDest: 1 | 2 | 3;
  indFinal: 0 | 1;
  indIEDest: 1 | 2 | 9;
  destinatario: { nome: string; documento: string; uf: string };
}

export class FiscalValidationError extends Error {
  details: string[];
  constructor(details: string[]) {
    super(details.join(" "));
    this.details = details;
  }
}

const num = (v: any) => (v === undefined || v === null || v === "" ? undefined : Number(v));

// Data/hora no fuso de Brasília (UTC−03:00, sem horário de verão desde 2019)
export function brTime(d = new Date()): string {
  const local = new Date(d.getTime() - 3 * 3600 * 1000);
  return local.toISOString().slice(0, 19) + "-03:00";
}

export function calcDV(chave43: string): string {
  let peso = 2;
  let soma = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? "0" : String(11 - resto);
}

export function buildChave(cUF: string, emissao: string, cnpj: string, modelo: string, serie: number, numero: number, tpEmis: number, cNF: string): string {
  const aamm = emissao.slice(2, 4) + emissao.slice(5, 7);
  const c43 = `${cUF}${aamm}${cnpj.padStart(14, "0")}${modelo}${String(serie).padStart(3, "0")}${String(numero).padStart(9, "0")}${tpEmis}${cNF}`;
  return c43 + calcDV(c43);
}

function vUnit(v: number): string {
  let s = Number(v).toFixed(10);
  while (s.endsWith("0") && s.split(".")[1].length > 2) s = s.slice(0, -1);
  return s;
}
function qty(v: number): string {
  return Number(v).toFixed(4);
}

// Converte o item do padrão Focus para o formato interno
function toItemInput(raw: any, idx: number, crt: number): ItemInput {
  const sit = raw.icms_situacao_tributaria !== undefined ? String(raw.icms_situacao_tributaria) : undefined;
  return {
    numero: Number(raw.numero_item || idx + 1),
    codigo: clean(raw.codigo_produto, 60),
    descricao: clean(raw.descricao, 120),
    ncm: digits(raw.codigo_ncm),
    cest: raw.cest ? digits(raw.cest) : undefined,
    cfop: digits(raw.cfop),
    unidade: clean(raw.unidade_comercial || "UN", 6),
    quantidade: Number(raw.quantidade_comercial),
    valorUnitario: Number(raw.valor_unitario_comercial),
    gtin: raw.codigo_barras_comercial ? digits(raw.codigo_barras_comercial) : undefined,
    desconto: num(raw.valor_desconto),
    frete: num(raw.valor_frete),
    seguro: num(raw.valor_seguro),
    outras: num(raw.valor_outras_despesas),
    origem: String(raw.icms_origem ?? "0"),
    cst: crt === 3 ? sit : undefined,
    csosn: crt !== 3 ? sit : undefined,
    aliqIcms: num(raw.icms_aliquota),
    reducaoBase: num(raw.icms_reducao_base_calculo),
    percDiferimento: num(raw.icms_percentual_diferimento),
    modBcSt: num(raw.icms_modalidade_base_calculo_st),
    mvaSt: num(raw.icms_margem_valor_adicionado_st),
    mvaAjustar: raw.icms_mva_ajustada_automatica === false ? false : undefined,
    aliqIcmsSt: num(raw.icms_aliquota_st),
    reducaoBaseSt: num(raw.icms_reducao_base_calculo_st),
    fcp: num(raw.fcp_percentual),
    fcpSt: num(raw.fcp_percentual_st),
    bcStRetido: num(raw.icms_base_calculo_retido_st),
    aliqStRetido: num(raw.icms_aliquota_final),
    icmsSubstituto: num(raw.icms_valor_substituto),
    icmsStRetido: num(raw.icms_valor_retido_st),
    ipiCst: raw.ipi_situacao_tributaria ? String(raw.ipi_situacao_tributaria) : undefined,
    aliqIpi: num(raw.ipi_aliquota),
    ipiEnquadramento: raw.ipi_codigo_enquadramento_legal ? String(raw.ipi_codigo_enquadramento_legal) : undefined,
    pisCst: raw.pis_situacao_tributaria ? String(raw.pis_situacao_tributaria) : undefined,
    aliqPis: num(raw.pis_aliquota_porcentual),
    cofinsCst: raw.cofins_situacao_tributaria ? String(raw.cofins_situacao_tributaria) : undefined,
    aliqCofins: num(raw.cofins_aliquota_porcentual),
    aliqInternaDestino: num(raw.icms_aliquota_interna_uf_destino),
    fcpDestino: num(raw.fcp_percentual_uf_destino),
    informacoesAdicionais: raw.informacoes_adicionais_item ? clean(raw.informacoes_adicionais_item, 500) : undefined,
    pedido: raw.pedido_compra ? clean(raw.pedido_compra, 15) : undefined,
    itemPedido: num(raw.item_pedido_compra),
  };
}

export function validateProfile(p: FiscalProfile | null, respTec: RespTec | null): string[] {
  const e: string[] = [];
  if (!p) return ["Configure os dados fiscais da empresa."];
  if (digits(p.cnpj).length !== 14) e.push("CNPJ do emitente inválido.");
  if (!clean(p.razaoSocial)) e.push("Razão social do emitente não informada.");
  if (!digits(p.ie) && String(p.ie).toUpperCase() !== "ISENTO") e.push("Inscrição estadual do emitente não informada.");
  if (![1, 2, 3, 4].includes(Number(p.crt))) e.push("Regime tributário (CRT) não informado.");
  const en = p.endereco || ({} as any);
  if (!clean(en.logradouro) || !clean(en.numero) || !clean(en.bairro) || !clean(en.municipio)) e.push("Endereço do emitente incompleto.");
  if (digits(en.codigoMunicipio).length !== 7) e.push("Código IBGE do município do emitente inválido (7 dígitos).");
  if (!UF_CODES[en.uf]) e.push("UF do emitente inválida.");
  if (digits(en.cep).length !== 8) e.push("CEP do emitente inválido.");
  if (![1, 2].includes(Number(p.ambiente))) e.push("Ambiente (homologação/produção) não definido.");
  if (!(Number(p.serie) >= 0 && Number(p.serie) <= 999)) e.push("Série inválida.");
  if (!respTec || digits(respTec.cnpj).length !== 14 || !respTec.contato || !respTec.email || digits(respTec.fone).length < 6) {
    e.push("Responsável técnico (dados da software house) não configurado pela plataforma.");
  }
  return e;
}

export interface BuildOptions {
  profile: FiscalProfile;
  respTec: RespTec;
  numero: number;
  serie: number;
  ufTable: Record<string, UfTaxRow>;
  now?: Date;
}

export function buildNFe(payload: any, opt: BuildOptions): BuildResult {
  const p = opt.profile;
  const errors: string[] = [];
  const ufEmit = p.endereco.uf;
  const cUF = UF_CODES[ufEmit];
  const homolog = Number(p.ambiente) === 2;

  // ---------------- Destinatário ----------------
  const cnpjDest = digits(payload.cnpj_destinatario);
  const cpfDest = digits(payload.cpf_destinatario);
  if (!cnpjDest && !cpfDest) errors.push("Informe o CNPJ ou CPF do destinatário.");
  if (cnpjDest && cnpjDest.length !== 14) errors.push("CNPJ do destinatário inválido.");
  if (cpfDest && cpfDest.length !== 11) errors.push("CPF do destinatário inválido.");
  const ufDest = String(payload.uf_destinatario || "").toUpperCase();
  if (!UF_CODES[ufDest] && ufDest !== "EX") errors.push("UF do destinatário inválida.");
  const nomeDest = clean(payload.nome_destinatario, 60);
  if (!nomeDest) errors.push("Nome do destinatário não informado.");
  const ieDest = digits(payload.inscricao_estadual_destinatario);
  let indIEDest = Number(payload.indicador_inscricao_estadual_destinatario || (ieDest ? 1 : 9)) as 1 | 2 | 9;
  if (cpfDest && indIEDest === 1 && !ieDest) indIEDest = 9;
  if (indIEDest === 1 && !ieDest) errors.push("Destinatário contribuinte (indicador 1) exige a inscrição estadual.");
  const isuf = digits(payload.inscricao_suframa_destinatario);
  if (digits(payload.codigo_municipio_destinatario).length !== 7) errors.push("Código IBGE do município do destinatário inválido.");
  if (digits(payload.cep_destinatario).length !== 8) errors.push("CEP do destinatário inválido.");
  if (!clean(payload.logradouro_destinatario) || !clean(payload.numero_destinatario) || !clean(payload.bairro_destinatario)) errors.push("Endereço do destinatário incompleto.");

  const idDest: 1 | 2 | 3 = ufDest === "EX" ? 3 : ufDest === ufEmit ? 1 : 2;
  const indFinal: 0 | 1 = payload.consumidor_final !== undefined ? (Number(payload.consumidor_final) ? 1 : 0) : (indIEDest === 9 ? 1 : 0);
  const indPres = Number(payload.presenca_comprador ?? 1);
  const finNFe = Number(payload.finalidade_emissao || 1);
  const tpNF = Number(payload.tipo_documento ?? 1);
  const natOp = clean(payload.natureza_operacao || "Venda de mercadoria", 60);

  // ---------------- Itens e tributos ----------------
  const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];
  if (rawItems.length === 0) errors.push("A nota precisa de ao menos um item.");
  if (rawItems.length > 990) errors.push("Máximo de 990 itens por NF-e.");
  const ctx: TaxContext = {
    crt: Number(p.crt) as 1 | 2 | 3 | 4,
    ufEmit,
    ufDest: idDest === 3 ? ufEmit : ufDest,
    idDest,
    indFinal,
    indIEDest,
    suframa: Boolean(isuf),
    pisCofinsRegime: p.pisCofinsRegime || "cumulativo",
    excluirIcmsBasePisCofins: p.excluirIcmsBasePisCofins !== false,
    contribuinteIpi: Boolean(p.contribuinteIpi),
    aliqCreditoSimples: p.aliqCreditoSimples,
    ufTable: { ...DEFAULT_UF_TABLE, ...(opt.ufTable || {}) },
  };
  const items = rawItems.map((r, i) => toItemInput(r, i, ctx.crt));
  const results: ItemTaxResult[] = [];
  const detXml: string[] = [];
  items.forEach((it, i) => {
    if (!it.codigo) errors.push(`Item ${i + 1}: código do produto não informado.`);
    if (!it.descricao) errors.push(`Item ${i + 1}: descrição não informada.`);
    if (it.ncm.length !== 8) errors.push(`Item ${i + 1}: NCM deve ter 8 dígitos.`);
    if (it.cfop.length !== 4) errors.push(`Item ${i + 1}: CFOP deve ter 4 dígitos.`);
    else {
      const first = it.cfop[0];
      const esperado = tpNF === 0 ? (idDest === 1 ? "1" : idDest === 2 ? "2" : "3") : (idDest === 1 ? "5" : idDest === 2 ? "6" : "7");
      if (first !== esperado) errors.push(`Item ${i + 1}: CFOP ${it.cfop} incompatível com a operação (${idDest === 1 ? "dentro do estado" : idDest === 2 ? "interestadual" : "exterior"}); use ${esperado}xxx.`);
    }
    if (!(it.quantidade > 0)) errors.push(`Item ${i + 1}: quantidade inválida.`);
    if (!(it.valorUnitario >= 0)) errors.push(`Item ${i + 1}: valor unitário inválido.`);
    if (it.cest && it.cest.length !== 7) errors.push(`Item ${i + 1}: CEST deve ter 7 dígitos.`);
    const tx = calcItem(it, ctx);
    errors.push(...tx.errors);
    results.push(tx);
    const gtin = it.gtin && [8, 12, 13, 14].includes(it.gtin.length) ? it.gtin : "SEM GTIN";
    const prod = [
      tag("cProd", it.codigo), tag("cEAN", gtin), tag("xProd", it.descricao), tag("NCM", it.ncm), tag("CEST", it.cest),
      tag("CFOP", it.cfop), tag("uCom", it.unidade), tag("qCom", qty(it.quantidade)), tag("vUnCom", vUnit(it.valorUnitario)),
      tag("vProd", dec(tx.vProd)), tag("cEANTrib", gtin), tag("uTrib", it.unidade), tag("qTrib", qty(it.quantidade)),
      tag("vUnTrib", vUnit(it.valorUnitario)), tx.vFrete ? tag("vFrete", dec(tx.vFrete)) : "", tx.vSeg ? tag("vSeg", dec(tx.vSeg)) : "",
      tx.vDesc ? tag("vDesc", dec(tx.vDesc)) : "", tx.vOutro ? tag("vOutro", dec(tx.vOutro)) : "", tag("indTot", 1),
      tag("xPed", it.pedido), it.itemPedido ? tag("nItemPed", it.itemPedido) : "",
    ].join("");
    const imposto = `<imposto>${tag("vTotTrib", dec(tx.vTotTrib))}${tx.icmsXml}${tx.ipiXml}${tx.pisXml}${tx.cofinsXml}${tx.difalXml}</imposto>`;
    detXml.push(`<det nItem="${i + 1}"><prod>${prod}</prod>${imposto}${tag("infAdProd", it.informacoesAdicionais)}</det>`);
  });

  // ---------------- Totais (soma dos valores já arredondados de cada item) ----------------
  const sum = (k: keyof ItemTaxResult) => r2(results.reduce((s, x) => s + Number(x[k] || 0), 0));
  const t: Record<string, number> = {
    vBC: sum("vBC"), vICMS: sum("vICMS"), vICMSDeson: sum("vICMSDeson"), vFCPUFDest: sum("vFCPUFDest"), vICMSUFDest: sum("vICMSUFDest"),
    vICMSUFRemet: sum("vICMSUFRemet"), vFCP: sum("vFCP"), vBCST: sum("vBCST"), vST: sum("vST"), vFCPST: sum("vFCPST"),
    vFCPSTRet: sum("vFCPSTRet"), vProd: sum("vProd"), vFrete: sum("vFrete"), vSeg: sum("vSeg"), vDesc: sum("vDesc"), vII: 0,
    vIPI: sum("vIPI"), vIPIDevol: 0, vPIS: sum("vPIS"), vCOFINS: sum("vCOFINS"), vOutro: sum("vOutro"), vTotTrib: sum("vTotTrib"),
  };
  const deducao = r2(results.filter((x) => x.deduzDeson).reduce((s, x) => s + x.vICMSDeson, 0));
  t.vNF = r2(t.vProd - t.vDesc - deducao + t.vST + t.vFCPST + t.vFrete + t.vSeg + t.vOutro + t.vII + t.vIPI + t.vIPIDevol);
  const temDifal = t.vICMSUFDest > 0 || t.vFCPUFDest > 0 || results.some((x) => x.difalXml);
  const totalXml = `<total><ICMSTot>${[
    tag("vBC", dec(t.vBC)), tag("vICMS", dec(t.vICMS)), tag("vICMSDeson", dec(t.vICMSDeson)),
    temDifal ? tag("vFCPUFDest", dec(t.vFCPUFDest)) + tag("vICMSUFDest", dec(t.vICMSUFDest)) + tag("vICMSUFRemet", dec(t.vICMSUFRemet)) : "",
    tag("vFCP", dec(t.vFCP)), tag("vBCST", dec(t.vBCST)), tag("vST", dec(t.vST)), tag("vFCPST", dec(t.vFCPST)), tag("vFCPSTRet", dec(t.vFCPSTRet)),
    tag("vProd", dec(t.vProd)), tag("vFrete", dec(t.vFrete)), tag("vSeg", dec(t.vSeg)), tag("vDesc", dec(t.vDesc)), tag("vII", dec(t.vII)),
    tag("vIPI", dec(t.vIPI)), tag("vIPIDevol", dec(t.vIPIDevol)), tag("vPIS", dec(t.vPIS)), tag("vCOFINS", dec(t.vCOFINS)),
    tag("vOutro", dec(t.vOutro)), tag("vNF", dec(t.vNF)), tag("vTotTrib", dec(t.vTotTrib)),
  ].join("")}</ICMSTot></total>`;

  // ---------------- Pagamento ----------------
  const pagamentos: any[] = Array.isArray(payload.formas_pagamento) && payload.formas_pagamento.length
    ? payload.formas_pagamento
    : [{ forma_pagamento: finNFe === 3 || finNFe === 4 ? "90" : "01", valor_pagamento: finNFe === 3 || finNFe === 4 ? 0 : t.vNF }];
  const detPag = pagamentos.map((pg) => {
    const tPag = String(pg.forma_pagamento || "01").padStart(2, "0");
    const card = ["03", "04"].includes(tPag) ? `<card>${tag("tpIntegra", 2)}</card>` : "";
    return `<detPag>${pg.indicador_pagamento !== undefined ? tag("indPag", pg.indicador_pagamento) : ""}${tag("tPag", tPag)}${tPag === "99" ? tag("xPag", clean(pg.descricao_pagamento || "Outros", 60)) : ""}${tag("vPag", dec(Number(pg.valor_pagamento || 0)))}${card}</detPag>`;
  }).join("");
  const totalPago = r2(pagamentos.reduce((s, pg) => s + Number(pg.valor_pagamento || 0), 0));
  const troco = r2(totalPago - t.vNF);
  if (finNFe !== 3 && finNFe !== 4 && totalPago < t.vNF - 0.009) errors.push(`Soma dos pagamentos (${dec(totalPago)}) menor que o valor da nota (${dec(t.vNF)}).`);
  const pagXml = `<pag>${detPag}${troco > 0 ? tag("vTroco", dec(troco)) : ""}</pag>`;

  if (errors.length) throw new FiscalValidationError(errors);

  // ---------------- Identificação e chave ----------------
  const now = opt.now || new Date();
  const dhEmi = payload.data_emissao ? brTime(new Date(payload.data_emissao)) : brTime(now);
  let cNF = String(crypto.randomInt(10_000_000, 99_999_999));
  if (cNF === String(opt.numero).padStart(8, "0")) cNF = String(Number(cNF) + 1);
  const chave = buildChave(cUF, dhEmi, digits(p.cnpj), "55", opt.serie, opt.numero, 1, cNF);

  const refs: any[] = Array.isArray(payload.notas_referenciadas) ? payload.notas_referenciadas : [];
  const nfRef = refs.map((r) => group("NFref", [tag("refNFe", digits(r.chave_nfe))])).join("");
  const ide = [
    tag("cUF", cUF), tag("cNF", cNF), tag("natOp", natOp), tag("mod", 55), tag("serie", opt.serie), tag("nNF", opt.numero),
    tag("dhEmi", dhEmi), payload.data_entrada_saida ? tag("dhSaiEnt", brTime(new Date(payload.data_entrada_saida))) : "",
    tag("tpNF", tpNF), tag("idDest", idDest), tag("cMunFG", digits(p.endereco.codigoMunicipio)), tag("tpImp", 1), tag("tpEmis", 1),
    tag("cDV", chave.slice(-1)), tag("tpAmb", p.ambiente), tag("finNFe", finNFe), tag("indFinal", indFinal), tag("indPres", indPres),
    [1, 2, 3, 4, 9].includes(indPres) ? tag("indIntermed", 0) : "", tag("procEmi", 0), tag("verProc", "MotorDesk 1.0"), nfRef,
  ].join("");

  const en = p.endereco;
  const emit = [
    tag("CNPJ", digits(p.cnpj)), tag("xNome", clean(p.razaoSocial, 60)), tag("xFant", clean(p.nomeFantasia, 60)),
    `<enderEmit>${[tag("xLgr", clean(en.logradouro, 60)), tag("nro", clean(en.numero, 60)), tag("xCpl", clean(en.complemento, 60)),
      tag("xBairro", clean(en.bairro, 60)), tag("cMun", digits(en.codigoMunicipio)), tag("xMun", clean(en.municipio, 60)), tag("UF", en.uf),
      tag("CEP", digits(en.cep)), tag("cPais", 1058), tag("xPais", "BRASIL"), tag("fone", digits(en.telefone) || undefined)].join("")}</enderEmit>`,
    tag("IE", digits(p.ie) || "ISENTO"),
    p.iest && p.iest[ufDest] ? tag("IEST", digits(p.iest[ufDest])) : "",
    p.im ? tag("IM", clean(p.im, 15)) + tag("CNAE", digits(p.cnae) || undefined) : "",
    tag("CRT", p.crt),
  ].join("");

  const dest = [
    cnpjDest ? tag("CNPJ", cnpjDest) : tag("CPF", cpfDest),
    tag("xNome", homolog ? HOMOLOG_NOME : nomeDest),
    `<enderDest>${[tag("xLgr", clean(payload.logradouro_destinatario, 60)), tag("nro", clean(payload.numero_destinatario, 60)),
      tag("xCpl", clean(payload.complemento_destinatario, 60)), tag("xBairro", clean(payload.bairro_destinatario, 60)),
      tag("cMun", digits(payload.codigo_municipio_destinatario)), tag("xMun", clean(payload.municipio_destinatario, 60)), tag("UF", ufDest),
      tag("CEP", digits(payload.cep_destinatario)), tag("cPais", 1058), tag("xPais", "BRASIL"),
      tag("fone", digits(payload.telefone_destinatario) || undefined)].join("")}</enderDest>`,
    tag("indIEDest", indIEDest), indIEDest === 1 ? tag("IE", ieDest) : "", isuf ? tag("ISUF", isuf) : "",
    tag("email", clean(payload.email_destinatario, 60) || undefined),
  ].join("");

  // ---------------- Transporte ----------------
  const tr = payload.transportador || null;
  const transporta = tr ? group("transporta", [
    digits(tr.cnpj) ? tag("CNPJ", digits(tr.cnpj)) : tag("CPF", digits(tr.cpf) || undefined), tag("xNome", clean(tr.nome, 60) || undefined),
    tag("IE", digits(tr.inscricao_estadual) || undefined), tag("xEnder", clean(tr.endereco, 60) || undefined),
    tag("xMun", clean(tr.municipio, 60) || undefined), tag("UF", tr.uf || undefined),
  ]) : "";
  const vols = (Array.isArray(payload.volumes) ? payload.volumes : []).map((v: any) => group("vol", [
    v.quantidade !== undefined ? tag("qVol", Number(v.quantidade)) : "", tag("esp", clean(v.especie, 60) || undefined), tag("marca", clean(v.marca, 60) || undefined),
    tag("nVol", clean(v.numeracao, 60) || undefined), v.peso_liquido !== undefined ? tag("pesoL", Number(v.peso_liquido).toFixed(3)) : "",
    v.peso_bruto !== undefined ? tag("pesoB", Number(v.peso_bruto).toFixed(3)) : "",
  ])).join("");
  const transpXml = `<transp>${tag("modFrete", payload.modalidade_frete ?? 9)}${transporta}${vols}</transp>`;

  // ---------------- Cobrança ----------------
  const dups: any[] = Array.isArray(payload.duplicatas) ? payload.duplicatas : [];
  const fat = payload.fatura || (dups.length ? { numero: String(opt.numero), valor_original: t.vNF, valor_desconto: 0, valor_liquido: t.vNF } : null);
  const cobrXml = fat || dups.length ? `<cobr>${fat ? group("fat", [tag("nFat", clean(fat.numero, 60)), tag("vOrig", dec(Number(fat.valor_original || 0))), tag("vDesc", dec(Number(fat.valor_desconto || 0))), tag("vLiq", dec(Number(fat.valor_liquido || 0)))]) : ""}${dups.map((d, i) => `<dup>${tag("nDup", String(d.numero || i + 1).padStart(3, "0"))}${tag("dVenc", String(d.data_vencimento).slice(0, 10))}${tag("vDup", dec(Number(d.valor)))}</dup>`).join("")}</cobr>` : "";

  // ---------------- Informações adicionais ----------------
  const infCpl: string[] = [];
  if (p.informacoesComplementaresPadrao) infCpl.push(clean(p.informacoesComplementaresPadrao));
  if (Number(p.crt) === 1 || Number(p.crt) === 4) infCpl.push("DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI.");
  if (isuf && t.vICMSDeson > 0) infCpl.push(`INSCRICAO SUFRAMA ${isuf}. ICMS DESONERADO (CONVENIO ICMS 65/88): R$ ${dec(t.vICMSDeson)}.`);
  if (t.vICMSUFDest > 0 || t.vFCPUFDest > 0) infCpl.push(`DIFAL EC 87/2015 - ICMS UF DESTINO R$ ${dec(t.vICMSUFDest)}; FCP UF DESTINO R$ ${dec(t.vFCPUFDest)}.`);
  if (payload.informacoes_adicionais_contribuinte) infCpl.push(clean(payload.informacoes_adicionais_contribuinte));
  const infAdic = group("infAdic", [tag("infAdFisco", clean(payload.informacoes_adicionais_fisco, 2000) || undefined), tag("infCpl", clean(infCpl.join(" "), 5000) || undefined)]);

  const rt = opt.respTec;
  const respTecXml = `<infRespTec>${tag("CNPJ", digits(rt.cnpj))}${tag("xContato", clean(rt.contato, 60))}${tag("email", clean(rt.email, 60))}${tag("fone", digits(rt.fone))}</infRespTec>`;

  const infNFe = `<infNFe versao="4.00" Id="NFe${chave}"><ide>${ide}</ide><emit>${emit}</emit><dest>${dest}</dest>${detXml.join("")}${totalXml}${transpXml}${cobrXml}${pagXml}${infAdic}${respTecXml}</infNFe>`;
  return {
    chave,
    numero: opt.numero,
    serie: opt.serie,
    xml: `<NFe xmlns="${NFE_NS}">${infNFe}</NFe>`,
    totals: t,
    items: results,
    ufDest,
    idDest,
    indFinal,
    indIEDest,
    destinatario: { nome: nomeDest, documento: cnpjDest || cpfDest, uf: ufDest },
  };
}

// ---------------- Assinatura digital ----------------
export function signXml(xml: string, elementName: "infNFe" | "infEvento" | "infInut", keyPem: string, certPem: string): string {
  const sig = new SignedXml({
    privateKey: keyPem,
    publicCert: certPem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });
  sig.addReference({
    xpath: `//*[local-name(.)='${elementName}']`,
    transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });
  sig.computeSignature(xml, { location: { reference: `//*[local-name(.)='${elementName}']`, action: "after" } });
  return sig.getSignedXml();
}

// ---------------- Eventos (cancelamento 110111 e carta de correção 110110) ----------------
export function buildEvento(opt: {
  chave: string; cnpj: string; ambiente: 1 | 2; tpEvento: "110111" | "110110"; nSeq: number; detalhe: { nProt?: string; xJust?: string; xCorrecao?: string };
}): string {
  const id = `ID${opt.tpEvento}${opt.chave}${String(opt.nSeq).padStart(2, "0")}`;
  const det = opt.tpEvento === "110111"
    ? `<detEvento versao="1.00"><descEvento>Cancelamento</descEvento>${tag("nProt", opt.detalhe.nProt)}${tag("xJust", clean(opt.detalhe.xJust, 255))}</detEvento>`
    : `<detEvento versao="1.00"><descEvento>Carta de Correcao</descEvento>${tag("xCorrecao", clean(opt.detalhe.xCorrecao, 1000))}${tag("xCondUso", CCE_COND_USO)}</detEvento>`;
  return `<evento xmlns="${NFE_NS}" versao="1.00"><infEvento Id="${id}">${tag("cOrgao", opt.chave.slice(0, 2))}${tag("tpAmb", opt.ambiente)}${tag("CNPJ", digits(opt.cnpj))}${tag("chNFe", opt.chave)}${tag("dhEvento", brTime())}${tag("tpEvento", opt.tpEvento)}${tag("nSeqEvento", opt.nSeq)}${tag("verEvento", "1.00")}${det}</infEvento></evento>`;
}

// ---------------- Inutilização de numeração ----------------
export function buildInutilizacao(opt: { cUF: string; ambiente: 1 | 2; cnpj: string; serie: number; inicio: number; fim: number; justificativa: string; ano?: number }): string {
  const ano = String(opt.ano ?? new Date().getFullYear()).slice(-2);
  const cnpj = digits(opt.cnpj);
  const id = `ID${opt.cUF}${ano}${cnpj}55${String(opt.serie).padStart(3, "0")}${String(opt.inicio).padStart(9, "0")}${String(opt.fim).padStart(9, "0")}`;
  return `<inutNFe xmlns="${NFE_NS}" versao="4.00"><infInut Id="${id}">${tag("tpAmb", opt.ambiente)}${tag("xServ", "INUTILIZAR")}${tag("cUF", opt.cUF)}${tag("ano", ano)}${tag("CNPJ", cnpj)}${tag("mod", 55)}${tag("serie", opt.serie)}${tag("nNFIni", opt.inicio)}${tag("nNFFin", opt.fim)}${tag("xJust", clean(opt.justificativa, 255))}</infInut></inutNFe>`;
}
