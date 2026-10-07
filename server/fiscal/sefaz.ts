// Comunicação com os webservices da SEFAZ (NF-e 4.00): SOAP 1.2 com o certificado A1 da empresa
// (TLS mútuo). O certificado do servidor é verificado contra as raízes oficiais da ICP-Brasil.
import https from "https";
import { ICP_BRASIL_ROOTS } from "./icpRoots.ts";
import { readElement, readTag } from "./xml.ts";

export type Servico = "autorizacao" | "retAutorizacao" | "statusServico" | "consultaProtocolo" | "recepcaoEvento" | "inutilizacao";

const WS: Record<Servico, { wsdl: string; action: string; path: string }> = {
  autorizacao: { wsdl: "NFeAutorizacao4", action: "nfeAutorizacaoLote", path: "nfeautorizacao4.asmx" },
  retAutorizacao: { wsdl: "NFeRetAutorizacao4", action: "nfeRetAutorizacaoLote", path: "nferetautorizacao4.asmx" },
  statusServico: { wsdl: "NFeStatusServico4", action: "nfeStatusServicoNF", path: "nfestatusservico4.asmx" },
  consultaProtocolo: { wsdl: "NFeConsultaProtocolo4", action: "nfeConsultaNF", path: "nfeconsultaprotocolo4.asmx" },
  recepcaoEvento: { wsdl: "NFeRecepcaoEvento4", action: "nfeRecepcaoEvento", path: "nferecepcaoevento4.asmx" },
  inutilizacao: { wsdl: "NFeInutilizacao4", action: "nfeInutilizacaoNF", path: "nfeinutilizacao4.asmx" },
};

// Autorizadores habilitados. Novas UFs entram aqui conforme houver clientes (SVRS, MG, PR, ...).
const HOSTS: Record<string, Record<1 | 2, string>> = {
  SP: { 1: "https://nfe.fazenda.sp.gov.br/ws/", 2: "https://homologacao.nfe.fazenda.sp.gov.br/ws/" },
};

export const UFS_HABILITADAS = Object.keys(HOSTS);

export class SefazError extends Error {
  kind: "indisponivel" | "configuracao";
  constructor(message: string, kind: "indisponivel" | "configuracao" = "indisponivel") {
    super(message);
    this.kind = kind;
  }
}

export function endpoint(uf: string, ambiente: 1 | 2, servico: Servico): string {
  // Somente para testes automatizados em homologação: aponta para um simulador local
  const override = process.env.FISCAL_SEFAZ_URL_OVERRIDE;
  if (override) {
    if (Number(ambiente) !== 2) throw new SefazError("Simulador de SEFAZ só pode ser usado em homologação.", "configuracao");
    return `${override.replace(/\/$/, "")}/${WS[servico].path}`;
  }
  const host = HOSTS[uf];
  if (!host) throw new SefazError(`Emissão para empresas de ${uf} ainda não habilitada (disponível: ${UFS_HABILITADAS.join(", ")}).`, "configuracao");
  return host[ambiente] + WS[servico].path;
}

export interface SefazCredentials {
  certPem: string;
  keyPem: string;
  chainPem?: string[];
}

export async function callSefaz(opt: { uf: string; ambiente: 1 | 2; servico: Servico; body: string; cred: SefazCredentials; timeoutMs?: number }): Promise<string> {
  const ws = WS[opt.servico];
  const url = new URL(endpoint(opt.uf, opt.ambiente, opt.servico));
  const envelope =
    `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${ws.wsdl}">${opt.body}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  const payload = Buffer.from(envelope, "utf8");
  const ca = process.env.FISCAL_SEFAZ_URL_OVERRIDE && process.env.FISCAL_SEFAZ_CA_PEM ? process.env.FISCAL_SEFAZ_CA_PEM : ICP_BRASIL_ROOTS;
  const agent = new https.Agent({
    cert: [opt.cred.certPem, ...(opt.cred.chainPem || [])].join("\n"),
    key: opt.cred.keyPem,
    ca,
    keepAlive: false,
    minVersion: "TLSv1.2",
  });
  return await new Promise<string>((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      agent,
      timeout: opt.timeoutMs ?? 30000,
      headers: {
        "Content-Type": `application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/${ws.wsdl}/${ws.action}"`,
        "Content-Length": payload.length,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        const result = readTag(text, "nfeResultMsg");
        if (result === null) {
          return reject(new SefazError(`SEFAZ respondeu HTTP ${res.statusCode} sem o retorno esperado${res.statusCode === 403 ? " (certificado recusado)" : ""}.`));
        }
        resolve(result);
      });
    });
    req.on("timeout", () => req.destroy(new SefazError("SEFAZ não respondeu a tempo.")));
    req.on("error", (err: any) => {
      reject(err instanceof SefazError ? err : new SefazError(`Falha de comunicação com a SEFAZ: ${err.code || err.message}.`));
    });
    req.end(payload);
  }).finally(() => agent.destroy());
}

export function retStatus(xml: string, element?: string): { cStat: string; xMotivo: string } {
  const scope = element ? readElement(xml, element) || xml : xml;
  return { cStat: readTag(scope, "cStat") || "", xMotivo: readTag(scope, "xMotivo") || "" };
}
