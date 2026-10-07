// DANFE (Documento Auxiliar da NF-e) em HTML para impressão/salvar em PDF, gerado a partir do XML
// autorizado (nfeProc). Código de barras da chave de acesso em Code 128 subconjunto C.
import { DOMParser } from "@xmldom/xmldom";
import { esc } from "./xml.ts";

// Larguras barra/espaço dos 107 símbolos do Code 128 (índice = valor do símbolo)
export const CODE128 = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

export function code128cSymbols(numeric: string): number[] {
  if (!/^\d+$/.test(numeric) || numeric.length % 2) throw new Error("Code 128C exige quantidade par de dígitos.");
  const values = [105];
  for (let i = 0; i < numeric.length; i += 2) values.push(Number(numeric.slice(i, i + 2)));
  const checksum = values.reduce((s, v, i) => s + v * (i === 0 ? 1 : i), 0) % 103;
  values.push(checksum, 106);
  return values;
}

export function code128cSvg(numeric: string, height = 44): string {
  const widths = code128cSymbols(numeric).map((v) => CODE128[v]).join("");
  const quiet = 10;
  let x = quiet;
  let bars = "";
  for (let i = 0; i < widths.length; i++) {
    const w = Number(widths[i]);
    if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${height}"/>`;
    x += w;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + quiet} ${height}" preserveAspectRatio="none" role="img" aria-label="Código de barras da chave de acesso">${bars}</svg>`;
}

const money = (v: string | null | undefined) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (v: string | null | undefined) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const docFmt = (d: string) => d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : d;
const dateFmt = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const timeFmt = (iso: string | null) => (iso ? iso.slice(11, 19) : "");

export function renderDanfe(nfeProcXml: string, opts: { cancelada?: boolean } = {}): string {
  const doc = new DOMParser().parseFromString(nfeProcXml, "text/xml");
  const first = (parent: any, name: string): any => (parent ? parent.getElementsByTagName(name)[0] || null : null);
  const txt = (parent: any, name: string): string => {
    const el = first(parent, name);
    return el ? String(el.textContent || "") : "";
  };
  const infNFe = first(doc, "infNFe");
  const ide = first(infNFe, "ide");
  const emit = first(infNFe, "emit");
  const dest = first(infNFe, "dest");
  const tot = first(infNFe, "ICMSTot");
  const transp = first(infNFe, "transp");
  const infProt = first(doc, "infProt");
  const chave = String(infNFe.getAttribute("Id") || "").replace(/^NFe/, "");
  const homolog = txt(ide, "tpAmb") === "2";
  const ender = (el: any) => `${txt(el, "xLgr")}, ${txt(el, "nro")}${txt(el, "xCpl") ? " - " + txt(el, "xCpl") : ""}`;
  const enderEmit = first(emit, "enderEmit");
  const enderDest = first(dest, "enderDest");
  const nNF = txt(ide, "nNF").padStart(9, "0").replace(/^(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3");
  const serie = txt(ide, "serie").padStart(3, "0");
  const chaveFmt = chave.replace(/(\d{4})(?=\d)/g, "$1 ");

  const dets = Array.from(infNFe.getElementsByTagName("det")) as any[];
  const rows = dets.map((det) => {
    const prod = first(det, "prod");
    const icms = first(det, "ICMS");
    const icmsGrp = icms ? (Array.from(icms.childNodes) as any[]).find((n) => n.nodeType === 1) : null;
    const cst = icmsGrp ? txt(icmsGrp, "orig") + (txt(icmsGrp, "CST") || txt(icmsGrp, "CSOSN")) : "";
    const ipi = first(det, "IPITrib");
    return `<tr><td>${esc(txt(prod, "cProd"))}</td><td class="l">${esc(txt(prod, "xProd"))}${txt(det, "infAdProd") ? `<br><small>${esc(txt(det, "infAdProd"))}</small>` : ""}</td><td>${esc(txt(prod, "NCM"))}</td><td>${esc(cst)}</td><td>${esc(txt(prod, "CFOP"))}</td><td>${esc(txt(prod, "uCom"))}</td><td class="r">${qtyFmt(txt(prod, "qCom"))}</td><td class="r">${money(txt(prod, "vUnCom"))}</td><td class="r">${money(txt(prod, "vProd"))}</td><td class="r">${money(icmsGrp ? txt(icmsGrp, "vBC") : "")}</td><td class="r">${money(icmsGrp ? txt(icmsGrp, "vICMS") : "")}</td><td class="r">${money(ipi ? txt(ipi, "vIPI") : "")}</td><td class="r">${icmsGrp && txt(icmsGrp, "pICMS") ? money(txt(icmsGrp, "pICMS")) : ""}</td><td class="r">${ipi ? money(txt(ipi, "pIPI")) : ""}</td></tr>`;
  }).join("");

  const dups = (Array.from(infNFe.getElementsByTagName("dup")) as any[]).map((d) => `<div class="dup"><b>${esc(txt(d, "nDup"))}</b> ${dateFmt(txt(d, "dVenc"))}<br>R$ ${money(txt(d, "vDup"))}</div>`).join("");
  const transporta = first(transp, "transporta");
  const vol = first(transp, "vol");
  const modFrete: Record<string, string> = { "0": "0-Emitente", "1": "1-Destinatário", "2": "2-Terceiros", "3": "3-Próprio Rem.", "4": "4-Próprio Dest.", "9": "9-Sem Frete" };
  const cell = (label: string, value: string, cls = "") => `<div class="c ${cls}"><span>${esc(label)}</span><b>${esc(value) || "&nbsp;"}</b></div>`;
  const marca = opts.cancelada ? "CANCELADA" : homolog ? "SEM VALOR FISCAL" : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DANFE ${esc(nNF)}</title><style>
@page{size:A4;margin:7mm}*{box-sizing:border-box}body{font:9px Arial,Helvetica,sans-serif;color:#000;margin:0;padding:8px;background:#fff}
.page{max-width:196mm;margin:0 auto;position:relative}.wm{position:fixed;top:40%;left:0;right:0;text-align:center;font-size:56px;font-weight:700;color:rgba(200,0,0,.18);transform:rotate(-25deg);pointer-events:none}
.box{border:1px solid #000;border-radius:3px;margin-bottom:3px}.row{display:flex}.row>.c{flex:1}.c{border-right:1px solid #000;padding:1px 3px;min-height:21px;overflow:hidden}.c:last-child{border-right:0}
.c span{display:block;font-size:6.5px;text-transform:uppercase}.c b{font-size:9px;font-weight:600;white-space:nowrap}.c.w{flex:3}.c.w b{white-space:normal}.row+.row{border-top:1px solid #000}
h3{font-size:8px;margin:5px 0 1px;text-transform:uppercase}.head{display:grid;grid-template-columns:38% 17% 45%}.head>div{border-right:1px solid #000;padding:4px}.head>div:last-child{border:0}
.danfe{text-align:center}.danfe .t{font-size:15px;font-weight:700}.bar svg{width:100%;height:40px}.chave{font-size:10px;font-weight:700;letter-spacing:.5px;text-align:center}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:1px 2px;font-size:7.5px;text-align:center}td.l{text-align:left}td.r{text-align:right}th{font-size:6.5px}
.dup{display:inline-block;border:1px solid #000;border-radius:2px;padding:2px 4px;margin:2px;font-size:8px}.canhoto{display:grid;grid-template-columns:20% 60% 20%}.canhoto>div{border-right:1px solid #000;padding:3px;min-height:30px}.canhoto>div:last-child{border:0;text-align:center}
.print{position:fixed;right:12px;bottom:12px;padding:8px 14px;font-size:13px;cursor:pointer}@media print{.print{display:none}}
</style></head><body><div class="page">${marca ? `<div class="wm">${marca}</div>` : ""}<button class="print" onclick="window.print()">Imprimir / salvar PDF</button>
<div class="box canhoto"><div><span style="font-size:6.5px">DATA DE RECEBIMENTO</span></div><div style="font-size:7px">RECEBEMOS DE ${esc(txt(emit, "xNome"))} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO<br><br><span style="font-size:6.5px">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span></div><div><b style="font-size:11px">NF-e</b><br>Nº ${esc(nNF)}<br>Série ${esc(serie)}</div></div>
<div class="box head"><div><b style="font-size:11px">${esc(txt(emit, "xNome"))}</b><br>${esc(ender(enderEmit))}<br>${esc(txt(enderEmit, "xBairro"))} - ${esc(txt(enderEmit, "CEP"))}<br>${esc(txt(enderEmit, "xMun"))} - ${esc(txt(enderEmit, "UF"))} ${txt(enderEmit, "fone") ? "Fone: " + esc(txt(enderEmit, "fone")) : ""}</div>
<div class="danfe"><div class="t">DANFE</div><div>Documento Auxiliar da<br>Nota Fiscal Eletrônica</div><div style="margin:4px 0">0 - Entrada<br>1 - Saída <b style="border:1px solid #000;padding:0 4px;font-size:11px">${esc(txt(ide, "tpNF"))}</b></div><b style="font-size:10px">Nº ${esc(nNF)}<br>Série ${esc(serie)}</b><br>Folha 1/1</div>
<div><div class="bar">${code128cSvg(chave)}</div><div style="font-size:6.5px">CHAVE DE ACESSO</div><div class="chave">${esc(chaveFmt)}</div><div style="text-align:center;margin-top:3px">Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora</div></div></div>
<div class="box"><div class="row">${cell("Natureza da operação", txt(ide, "natOp"))}${cell("Protocolo de autorização de uso", infProt ? `${txt(infProt, "nProt")} - ${dateFmt(txt(infProt, "dhRecbto"))} ${timeFmt(txt(infProt, "dhRecbto"))}` : "")}</div>
<div class="row">${cell("Inscrição estadual", txt(emit, "IE"))}${cell("Insc. estadual do subst. trib.", txt(emit, "IEST"))}${cell("CNPJ", docFmt(txt(emit, "CNPJ")))}</div></div>
<h3>Destinatário / Remetente</h3><div class="box"><div class="row">${cell("Nome / razão social", txt(dest, "xNome"), "w")}${cell("CNPJ / CPF", docFmt(txt(dest, "CNPJ") || txt(dest, "CPF")))}${cell("Data da emissão", dateFmt(txt(ide, "dhEmi")))}</div>
<div class="row">${cell("Endereço", ender(enderDest))}${cell("Bairro / distrito", txt(enderDest, "xBairro"))}${cell("CEP", txt(enderDest, "CEP"))}${cell("Data da saída/entrada", dateFmt(txt(ide, "dhSaiEnt")))}</div>
<div class="row">${cell("Município", txt(enderDest, "xMun"))}${cell("Fone/fax", txt(enderDest, "fone"))}${cell("UF", txt(enderDest, "UF"))}${cell("Inscrição estadual", txt(dest, "IE"))}${cell("Hora da saída/entrada", timeFmt(txt(ide, "dhSaiEnt")))}</div></div>
${dups ? `<h3>Fatura / duplicatas</h3><div class="box" style="padding:2px">${dups}</div>` : ""}
<h3>Cálculo do imposto</h3><div class="box"><div class="row">${cell("Base de cálc. do ICMS", money(txt(tot, "vBC")))}${cell("Valor do ICMS", money(txt(tot, "vICMS")))}${cell("Base de cálc. ICMS S.T.", money(txt(tot, "vBCST")))}${cell("Valor do ICMS subst.", money(txt(tot, "vST")))}${cell("V. ICMS UF dest. / FCP", `${money(txt(tot, "vICMSUFDest"))} / ${money((Number(txt(tot, "vFCPUFDest") || 0) + Number(txt(tot, "vFCP") || 0) + Number(txt(tot, "vFCPST") || 0)).toFixed(2))}`)}${cell("Valor total dos produtos", money(txt(tot, "vProd")))}</div>
<div class="row">${cell("Valor do frete", money(txt(tot, "vFrete")))}${cell("Valor do seguro", money(txt(tot, "vSeg")))}${cell("Desconto", money(txt(tot, "vDesc")))}${cell("Outras despesas", money(txt(tot, "vOutro")))}${cell("Valor do IPI", money(txt(tot, "vIPI")))}${cell("ICMS desonerado", money(txt(tot, "vICMSDeson")))}${cell("Valor total da nota", money(txt(tot, "vNF")))}</div></div>
<h3>Transportador / volumes transportados</h3><div class="box"><div class="row">${cell("Nome / razão social", txt(transporta, "xNome"))}${cell("Frete por conta", modFrete[txt(transp, "modFrete")] || txt(transp, "modFrete"))}${cell("CNPJ / CPF", docFmt(txt(transporta, "CNPJ") || txt(transporta, "CPF")))}${cell("Inscrição estadual", txt(transporta, "IE"))}</div>
<div class="row">${cell("Endereço", txt(transporta, "xEnder"))}${cell("Município", txt(transporta, "xMun"))}${cell("UF", txt(transporta, "UF"))}${cell("Quantidade", txt(vol, "qVol"))}${cell("Espécie", txt(vol, "esp"))}${cell("Peso bruto", txt(vol, "pesoB"))}${cell("Peso líquido", txt(vol, "pesoL"))}</div></div>
<h3>Dados dos produtos / serviços</h3><table><thead><tr><th>Código</th><th>Descrição</th><th>NCM/SH</th><th>O/CST</th><th>CFOP</th><th>UN</th><th>Quant.</th><th>Valor unit.</th><th>Valor total</th><th>B. cálc. ICMS</th><th>Valor ICMS</th><th>Valor IPI</th><th>Alíq. ICMS</th><th>Alíq. IPI</th></tr></thead><tbody>${rows}</tbody></table>
<h3>Dados adicionais</h3><div class="box row"><div class="c" style="flex:2;min-height:60px"><span>Informações complementares</span><div style="font-size:8px">${esc(txt(first(infNFe, "infAdic"), "infCpl"))}</div></div><div class="c" style="min-height:60px"><span>Reservado ao fisco</span><div style="font-size:8px">${esc(txt(first(infNFe, "infAdic"), "infAdFisco"))}</div></div></div>
</div></body></html>`;
}
