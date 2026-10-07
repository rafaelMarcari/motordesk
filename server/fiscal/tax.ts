// Cálculo dos tributos de cada item da NF-e (modelo 55) e montagem dos grupos de imposto.
// Cobre: ICMS próprio (CST e CSOSN), redução de base, diferimento, ICMS-ST com MVA (e MVA
// ajustada nas operações interestaduais), ST retida anteriormente, FCP e FCP-ST, DIFAL para
// consumidor final não contribuinte de outra UF (EC 87/2015 e LC 190/2022), desoneração para
// SUFRAMA, IPI, PIS e COFINS (cumulativo, não cumulativo, Simples Nacional, monofásico).
//
// As alíquotas internas, FCP e o tipo de base do DIFAL por UF ficam numa tabela editável
// (ver DEFAULT_UF_TABLE): mudam por lei estadual e precisam ser conferidas pela contabilidade.
import { dec, pct, r2, tag, group } from "./xml.ts";

export interface UfTaxRow {
  aliqInterna: number; // alíquota modal interna (%)
  fcp: number; // Fundo de Combate à Pobreza padrão da UF (%)
  difalBase: "unica" | "dupla"; // base do DIFAL para não contribuinte
}

// Valores padrão — CONFERIR com a contabilidade (alteráveis em Configuração fiscal da plataforma)
export const DEFAULT_UF_TABLE: Record<string, UfTaxRow> = {
  AC: { aliqInterna: 19, fcp: 0, difalBase: "dupla" },
  AL: { aliqInterna: 19, fcp: 1, difalBase: "dupla" },
  AM: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
  AP: { aliqInterna: 18, fcp: 0, difalBase: "dupla" },
  BA: { aliqInterna: 20.5, fcp: 0, difalBase: "dupla" },
  CE: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
  DF: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
  ES: { aliqInterna: 17, fcp: 0, difalBase: "dupla" },
  GO: { aliqInterna: 19, fcp: 0, difalBase: "dupla" },
  MA: { aliqInterna: 23, fcp: 0, difalBase: "dupla" },
  MG: { aliqInterna: 18, fcp: 0, difalBase: "dupla" },
  MS: { aliqInterna: 17, fcp: 0, difalBase: "dupla" },
  MT: { aliqInterna: 17, fcp: 0, difalBase: "dupla" },
  PA: { aliqInterna: 19, fcp: 0, difalBase: "dupla" },
  PB: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
  PE: { aliqInterna: 20.5, fcp: 0, difalBase: "dupla" },
  PI: { aliqInterna: 22.5, fcp: 0, difalBase: "dupla" },
  PR: { aliqInterna: 19.5, fcp: 0, difalBase: "dupla" },
  RJ: { aliqInterna: 20, fcp: 2, difalBase: "dupla" },
  RN: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
  RO: { aliqInterna: 19.5, fcp: 0, difalBase: "dupla" },
  RR: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
  RS: { aliqInterna: 17, fcp: 0, difalBase: "dupla" },
  SC: { aliqInterna: 17, fcp: 0, difalBase: "dupla" },
  SE: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
  SP: { aliqInterna: 18, fcp: 0, difalBase: "dupla" },
  TO: { aliqInterna: 20, fcp: 0, difalBase: "dupla" },
};

export const UF_CODES: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17", MA: "21", PI: "22", CE: "23",
  RN: "24", PB: "25", PE: "26", AL: "27", SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35",
  PR: "41", SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53",
};

const SUL_SUDESTE_SEM_ES = ["SP", "RJ", "MG", "PR", "SC", "RS"];
const ORIGEM_IMPORTADA = ["1", "2", "3", "8"]; // Resolução do Senado 13/2012

// Alíquota interestadual de ICMS (Resolução do Senado 22/89 e 13/2012)
export function aliquotaInterestadual(ufOrig: string, ufDest: string, origem: string): number {
  if (ORIGEM_IMPORTADA.includes(String(origem))) return 4;
  if (SUL_SUDESTE_SEM_ES.includes(ufOrig) && !SUL_SUDESTE_SEM_ES.includes(ufDest)) return 7;
  return 12;
}

export interface ItemInput {
  numero: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  gtin?: string;
  desconto?: number;
  frete?: number;
  seguro?: number;
  outras?: number;
  origem: string;
  cst?: string; // regime normal (CRT 3)
  csosn?: string; // Simples Nacional (CRT 1, 2, 4)
  aliqIcms?: number;
  reducaoBase?: number;
  percDiferimento?: number;
  modBcSt?: number;
  mvaSt?: number;
  mvaAjustar?: boolean;
  aliqIcmsSt?: number;
  reducaoBaseSt?: number;
  fcp?: number;
  fcpSt?: number;
  bcStRetido?: number;
  aliqStRetido?: number;
  icmsSubstituto?: number;
  icmsStRetido?: number;
  ipiCst?: string;
  aliqIpi?: number;
  ipiEnquadramento?: string;
  pisCst?: string;
  aliqPis?: number;
  cofinsCst?: string;
  aliqCofins?: number;
  aliqInternaDestino?: number;
  fcpDestino?: number;
  informacoesAdicionais?: string;
  pedido?: string;
  itemPedido?: number;
}

export interface TaxContext {
  crt: 1 | 2 | 3 | 4;
  ufEmit: string;
  ufDest: string;
  idDest: 1 | 2 | 3;
  indFinal: 0 | 1;
  indIEDest: 1 | 2 | 9;
  suframa: boolean;
  pisCofinsRegime: "cumulativo" | "nao_cumulativo";
  excluirIcmsBasePisCofins: boolean;
  contribuinteIpi: boolean;
  aliqCreditoSimples?: number; // pCredSN (CSOSN 101/201/900)
  ufTable: Record<string, UfTaxRow>;
}

export interface ItemTaxResult {
  vProd: number;
  vDesc: number;
  vFrete: number;
  vSeg: number;
  vOutro: number;
  vBC: number;
  vICMS: number;
  vICMSDeson: number;
  deduzDeson: boolean;
  vBCST: number;
  vST: number;
  vFCP: number;
  vFCPST: number;
  vFCPSTRet: number;
  vIPI: number;
  vPIS: number;
  vCOFINS: number;
  vICMSUFDest: number;
  vFCPUFDest: number;
  vICMSUFRemet: number;
  vTotTrib: number;
  icmsXml: string;
  ipiXml: string;
  pisXml: string;
  cofinsXml: string;
  difalXml: string;
  // dados usados para as guias de recolhimento
  stInterestadual: boolean;
  errors: string[];
}

const ST_CST = ["10", "30", "70"];
const ST_CSOSN = ["201", "202", "203"];
const ST_RET_CST = ["60"];
const ST_RET_CSOSN = ["500"];
const ICMS_TRIBUTADO_CST = ["00", "10", "20", "51", "70", "90"];

export function calcItem(it: ItemInput, ctx: TaxContext): ItemTaxResult {
  const errors: string[] = [];
  const sn = ctx.crt !== 3;
  const cst = sn ? null : String(it.cst || "00").padStart(2, "0");
  let csosn = sn ? String(it.csosn || "102") : null;
  const orig = String(it.origem ?? "0");
  const vProd = r2(it.quantidade * it.valorUnitario);
  const vDesc = r2(it.desconto || 0);
  const vFrete = r2(it.frete || 0);
  const vSeg = r2(it.seguro || 0);
  const vOutro = r2(it.outras || 0);
  const baseOp = r2(vProd - vDesc + vFrete + vSeg + vOutro);
  const ufDestRow = ctx.ufTable[ctx.ufDest] || DEFAULT_UF_TABLE[ctx.ufDest];
  const ufEmitRow = ctx.ufTable[ctx.ufEmit] || DEFAULT_UF_TABLE[ctx.ufEmit];
  const interestadual = ctx.idDest === 2;
  const aliqInter = aliquotaInterestadual(ctx.ufEmit, ctx.ufDest, orig);
  const aliqIcmsPadrao = interestadual ? aliqInter : ufEmitRow?.aliqInterna ?? 18;

  const res: ItemTaxResult = {
    vProd, vDesc, vFrete, vSeg, vOutro, vBC: 0, vICMS: 0, vICMSDeson: 0, deduzDeson: false, vBCST: 0, vST: 0,
    vFCP: 0, vFCPST: 0, vFCPSTRet: 0, vIPI: 0, vPIS: 0, vCOFINS: 0, vICMSUFDest: 0, vFCPUFDest: 0, vICMSUFRemet: 0,
    vTotTrib: 0, icmsXml: "", ipiXml: "", pisXml: "", cofinsXml: "", difalXml: "", stInterestadual: false, errors,
  };

  // ---------------- IPI (entra na base do ST e do DIFAL) ----------------
  const ipiCst = it.ipiCst ? String(it.ipiCst).padStart(2, "0") : (ctx.contribuinteIpi ? "50" : null);
  if (ipiCst) {
    const cEnq = it.ipiEnquadramento || "999";
    if (["00", "49", "50", "99"].includes(ipiCst)) {
      const pIPI = Number(it.aliqIpi || 0);
      const vBCIPI = baseOp;
      res.vIPI = r2(vBCIPI * pIPI / 100);
      res.ipiXml = group("IPI", [tag("cEnq", cEnq), group("IPITrib", [tag("CST", ipiCst), tag("vBC", dec(vBCIPI)), tag("pIPI", pct(pIPI)), tag("vIPI", dec(res.vIPI))])]);
    } else {
      res.ipiXml = group("IPI", [tag("cEnq", cEnq), group("IPINT", [tag("CST", ipiCst)])]);
    }
  }

  // ---------------- SUFRAMA: ICMS desonerado ----------------
  let suframaDeson = false;
  if (ctx.suframa && interestadual) {
    suframaDeson = true;
    if (!sn) {
      res.vICMSDeson = r2(baseOp * aliqInter / 100);
      res.deduzDeson = true;
    }
  }

  // ---------------- ICMS próprio, ST e FCP ----------------
  const pICMS = it.aliqIcms !== undefined && it.aliqIcms !== null ? Number(it.aliqIcms) : aliqIcmsPadrao;
  const cstTributado = sn ? csosn === "900" : ["00", "10", "20", "51", "70", "90"].includes(cst!);
  if (cstTributado && !(pICMS > 0) && !(ctx.suframa && interestadual)) {
    errors.push(`Item ${it.numero}: alíquota de ICMS zerada para a situação tributária ${sn ? csosn : cst} (tributada). Informe a alíquota ou use a situação de isenção/não incidência.`);
  }
  const pRed = Number(it.reducaoBase || 0);
  const pFCP = Number(it.fcp ?? (interestadual ? 0 : ufEmitRow?.fcp ?? 0));
  const isST = sn ? ST_CSOSN.includes(csosn!) : ST_CST.includes(cst!);
  const pICMSST = it.aliqIcmsSt !== undefined && it.aliqIcmsSt !== null ? Number(it.aliqIcmsSt) : (ufDestRow?.aliqInterna ?? 18);
  const pFCPST = Number(it.fcpSt ?? 0);

  let stXml = "";
  let fcpStXml = "";
  if (isST) {
    if (!it.cest) errors.push(`Item ${it.numero}: CEST obrigatório para mercadoria com substituição tributária.`);
    const modBCST = it.modBcSt ?? 4;
    let mva = Number(it.mvaSt || 0);
    if (modBCST === 4 && !it.mvaSt) errors.push(`Item ${it.numero}: informe a MVA (margem de valor agregado) da substituição tributária.`);
    if (interestadual && it.mvaAjustar !== false && mva > 0) {
      // MVA ajustada (Convênio ICMS 142/2018): [(1 + MVA) × (1 − ALQ inter) / (1 − ALQ intra)] − 1
      const ajustada = ((1 + mva / 100) * (1 - aliqInter / 100) / (1 - pICMSST / 100) - 1) * 100;
      mva = Math.round(ajustada * 10000) / 10000;
    }
    const pRedST = Number(it.reducaoBaseSt || 0);
    const vICMSProprio = r2(baseOp * (1 - pRed / 100) * pICMS / 100);
    const vBCST = r2((baseOp + res.vIPI) * (1 + mva / 100) * (1 - pRedST / 100));
    const vST = Math.max(0, r2(vBCST * pICMSST / 100 - vICMSProprio));
    res.vBCST = vBCST;
    res.vST = vST;
    res.stInterestadual = interestadual;
    stXml = [tag("modBCST", modBCST), mva ? tag("pMVAST", pct(mva)) : "", pRedST ? tag("pRedBCST", pct(pRedST)) : "",
      tag("vBCST", dec(vBCST)), tag("pICMSST", pct(pICMSST)), tag("vICMSST", dec(vST))].join("");
    if (pFCPST > 0) {
      res.vFCPST = r2(vBCST * pFCPST / 100);
      fcpStXml = [tag("vBCFCPST", dec(vBCST)), tag("pFCPST", pct(pFCPST)), tag("vFCPST", dec(res.vFCPST))].join("");
    }
  }

  const desonXml = (motivo: string) => res.vICMSDeson > 0
    ? [tag("vICMSDeson", dec(res.vICMSDeson)), tag("motDesICMS", motivo), tag("indDeduzDeson", res.deduzDeson ? "1" : "0")].join("")
    : "";

  if (!sn) {
    let c = cst!;
    if (suframaDeson && ICMS_TRIBUTADO_CST.includes(c)) c = "40"; // isenção ZFM/ALC (Convênio ICMS 65/88)
    const vBC = r2(baseOp * (1 - pRed / 100));
    const proprio = () => {
      res.vBC = vBC;
      res.vICMS = r2(vBC * pICMS / 100);
      if (pFCP > 0) res.vFCP = r2(vBC * pFCP / 100);
    };
    const fcpXml = (comBase: boolean) => res.vFCP > 0
      ? [comBase ? tag("vBCFCP", dec(res.vBC)) : "", tag("pFCP", pct(pFCP)), tag("vFCP", dec(res.vFCP))].join("")
      : "";
    const head = tag("orig", orig) + tag("CST", c);
    switch (c) {
      case "00":
        proprio();
        res.icmsXml = `<ICMS00>${head}${tag("modBC", 3)}${tag("vBC", dec(res.vBC))}${tag("pICMS", pct(pICMS))}${tag("vICMS", dec(res.vICMS))}${fcpXml(false)}</ICMS00>`;
        break;
      case "10":
        proprio();
        res.icmsXml = `<ICMS10>${head}${tag("modBC", 3)}${tag("vBC", dec(res.vBC))}${tag("pICMS", pct(pICMS))}${tag("vICMS", dec(res.vICMS))}${fcpXml(true)}${stXml}${fcpStXml}</ICMS10>`;
        break;
      case "20":
        if (!pRed) errors.push(`Item ${it.numero}: CST 20 exige percentual de redução da base (pRedBC).`);
        proprio();
        res.icmsXml = `<ICMS20>${head}${tag("modBC", 3)}${tag("pRedBC", pct(pRed))}${tag("vBC", dec(res.vBC))}${tag("pICMS", pct(pICMS))}${tag("vICMS", dec(res.vICMS))}${fcpXml(true)}${desonXml("9")}</ICMS20>`;
        break;
      case "30":
        res.icmsXml = `<ICMS30>${head}${stXml}${fcpStXml}${desonXml(suframaDeson ? "7" : "9")}</ICMS30>`;
        break;
      case "40":
      case "41":
      case "50":
        res.icmsXml = `<ICMS40>${head}${desonXml(suframaDeson ? "7" : "9")}</ICMS40>`;
        break;
      case "51": {
        const pDif = Number(it.percDiferimento || 0);
        const vICMSOp = r2(vBC * pICMS / 100);
        const vICMSDif = r2(vICMSOp * pDif / 100);
        res.vBC = vBC;
        res.vICMS = r2(vICMSOp - vICMSDif);
        res.icmsXml = `<ICMS51>${head}${tag("modBC", 3)}${pRed ? tag("pRedBC", pct(pRed)) : ""}${tag("vBC", dec(vBC))}${tag("pICMS", pct(pICMS))}${tag("vICMSOp", dec(vICMSOp))}${tag("pDif", pct(pDif))}${tag("vICMSDif", dec(vICMSDif))}${tag("vICMS", dec(res.vICMS))}</ICMS51>`;
        break;
      }
      case "60": {
        const ret = it.bcStRetido !== undefined
          ? [tag("vBCSTRet", dec(it.bcStRetido)), tag("pST", pct(it.aliqStRetido || 0)), tag("vICMSSubstituto", dec(it.icmsSubstituto || 0)), tag("vICMSSTRet", dec(it.icmsStRetido || 0))].join("")
          : "";
        res.icmsXml = `<ICMS60>${head}${ret}</ICMS60>`;
        break;
      }
      case "70":
        if (!pRed) errors.push(`Item ${it.numero}: CST 70 exige percentual de redução da base (pRedBC).`);
        proprio();
        res.icmsXml = `<ICMS70>${head}${tag("modBC", 3)}${tag("pRedBC", pct(pRed))}${tag("vBC", dec(res.vBC))}${tag("pICMS", pct(pICMS))}${tag("vICMS", dec(res.vICMS))}${fcpXml(true)}${stXml}${fcpStXml}${desonXml("9")}</ICMS70>`;
        break;
      case "90":
        proprio();
        res.icmsXml = `<ICMS90>${head}${tag("modBC", 3)}${tag("vBC", dec(res.vBC))}${pRed ? tag("pRedBC", pct(pRed)) : ""}${tag("pICMS", pct(pICMS))}${tag("vICMS", dec(res.vICMS))}${fcpXml(true)}${desonXml("9")}</ICMS90>`;
        break;
      default:
        errors.push(`Item ${it.numero}: CST de ICMS "${c}" não suportado.`);
    }
  } else {
    if (suframaDeson && ["101", "102", "900"].includes(csosn!)) csosn = "300"; // imune/isento
    const head = tag("orig", orig) + tag("CSOSN", csosn);
    const pCred = Number(ctx.aliqCreditoSimples || 0);
    const credito = () => {
      const v = r2(baseOp * pCred / 100);
      return pCred > 0 ? tag("pCredSN", pct(pCred)) + tag("vCredICMSSN", dec(v)) : "";
    };
    switch (csosn) {
      case "101":
        if (!pCred) errors.push(`Item ${it.numero}: CSOSN 101 exige a alíquota de crédito do Simples Nacional (configuração da empresa).`);
        res.icmsXml = `<ICMSSN101>${head}${tag("pCredSN", pct(pCred))}${tag("vCredICMSSN", dec(r2(baseOp * pCred / 100)))}</ICMSSN101>`;
        break;
      case "102":
      case "103":
      case "300":
      case "400":
        res.icmsXml = `<ICMSSN102>${head}</ICMSSN102>`;
        break;
      case "201":
        res.icmsXml = `<ICMSSN201>${head}${stXml}${fcpStXml}${credito()}</ICMSSN201>`;
        break;
      case "202":
      case "203":
        res.icmsXml = `<ICMSSN202>${head}${stXml}${fcpStXml}</ICMSSN202>`;
        break;
      case "500": {
        const ret = it.bcStRetido !== undefined
          ? [tag("vBCSTRet", dec(it.bcStRetido)), tag("pST", pct(it.aliqStRetido || 0)), tag("vICMSSubstituto", dec(it.icmsSubstituto || 0)), tag("vICMSSTRet", dec(it.icmsStRetido || 0))].join("")
          : "";
        res.icmsXml = `<ICMSSN500>${head}${ret}</ICMSSN500>`;
        break;
      }
      case "900": {
        res.vBC = r2(baseOp * (1 - pRed / 100));
        res.vICMS = r2(res.vBC * pICMS / 100);
        res.icmsXml = `<ICMSSN900>${head}${tag("modBC", 3)}${tag("vBC", dec(res.vBC))}${pRed ? tag("pRedBC", pct(pRed)) : ""}${tag("pICMS", pct(pICMS))}${tag("vICMS", dec(res.vICMS))}${credito()}</ICMSSN900>`;
        break;
      }
      default:
        errors.push(`Item ${it.numero}: CSOSN "${csosn}" não suportado.`);
    }
  }
  res.icmsXml = `<ICMS>${res.icmsXml}</ICMS>`;

  // ---------------- DIFAL: consumidor final não contribuinte de outra UF ----------------
  const tributado = sn ? !["300", "400"].includes(csosn!) : !["40", "41", "50", "60"].includes(cst!) && !suframaDeson;
  if (interestadual && ctx.indFinal === 1 && ctx.indIEDest === 9 && tributado) {
    const pDest = Number(it.aliqInternaDestino ?? ufDestRow?.aliqInterna ?? 18);
    const pFCPDest = Number(it.fcpDestino ?? ufDestRow?.fcp ?? 0);
    const base = r2(baseOp + res.vIPI);
    const icmsOrigem = r2(base * aliqInter / 100);
    let vBCUFDest = base;
    let vICMSUFDest: number;
    let vFCPUFDest: number;
    if ((ufDestRow?.difalBase || "dupla") === "dupla") {
      // LC 190/2022: base "por dentro" com a alíquota interna do destino
      vBCUFDest = r2((base - icmsOrigem) / (1 - (pDest + pFCPDest) / 100));
      vICMSUFDest = Math.max(0, r2(vBCUFDest * pDest / 100 - icmsOrigem));
      vFCPUFDest = r2(vBCUFDest * pFCPDest / 100);
    } else {
      vICMSUFDest = Math.max(0, r2(base * (pDest - aliqInter) / 100));
      vFCPUFDest = r2(base * pFCPDest / 100);
    }
    res.vICMSUFDest = vICMSUFDest;
    res.vFCPUFDest = vFCPUFDest;
    res.difalXml = group("ICMSUFDest", [
      tag("vBCUFDest", dec(vBCUFDest)), tag("vBCFCPUFDest", dec(vBCUFDest)), tag("pFCPUFDest", pct(pFCPDest)),
      tag("pICMSUFDest", pct(pDest)), tag("pICMSInter", pct(aliqInter)), tag("pICMSInterPart", pct(100)),
      tag("vFCPUFDest", dec(vFCPUFDest)), tag("vICMSUFDest", dec(vICMSUFDest)), tag("vICMSUFRemet", dec(0)),
    ]);
  }

  // ---------------- PIS e COFINS ----------------
  const naoCumul = ctx.pisCofinsRegime === "nao_cumulativo";
  const defaultCst = suframaDeson ? "06" : sn ? "49" : "01";
  const pisCst = String(it.pisCst || defaultCst).padStart(2, "0");
  const cofinsCst = String(it.cofinsCst || defaultCst).padStart(2, "0");
  const basePisCofins = r2(baseOp - (ctx.excluirIcmsBasePisCofins ? res.vICMS : 0));
  const pisCofins = (kind: "PIS" | "COFINS", cstPc: string, aliqDefault: number, aliqInformada?: number) => {
    const aliq = sn && aliqInformada === undefined ? 0 : Number(aliqInformada ?? aliqDefault);
    if (["01", "02"].includes(cstPc)) {
      const v = r2(basePisCofins * aliq / 100);
      if (kind === "PIS") res.vPIS = v; else res.vCOFINS = v;
      return `<${kind}><${kind}Aliq>${tag("CST", cstPc)}${tag("vBC", dec(basePisCofins))}${tag(`p${kind}`, pct(aliq))}${tag(`v${kind}`, dec(v))}</${kind}Aliq></${kind}>`;
    }
    if (["04", "05", "06", "07", "08", "09"].includes(cstPc)) {
      return `<${kind}><${kind}NT>${tag("CST", cstPc)}</${kind}NT></${kind}>`;
    }
    // 49, 50..99: outras operações
    const base = aliq > 0 ? basePisCofins : 0;
    const v = r2(base * aliq / 100);
    if (kind === "PIS") res.vPIS = v; else res.vCOFINS = v;
    return `<${kind}><${kind}Outr>${tag("CST", cstPc)}${tag("vBC", dec(base))}${tag(`p${kind}`, pct(aliq))}${tag(`v${kind}`, dec(v))}</${kind}Outr></${kind}>`;
  };
  res.pisXml = pisCofins("PIS", pisCst, naoCumul ? 1.65 : 0.65, it.aliqPis);
  res.cofinsXml = pisCofins("COFINS", cofinsCst, naoCumul ? 7.6 : 3, it.aliqCofins);

  res.vTotTrib = r2(res.vICMS + res.vST + res.vFCP + res.vFCPST + res.vIPI + res.vPIS + res.vCOFINS + res.vICMSUFDest + res.vFCPUFDest);
  return res;
}
