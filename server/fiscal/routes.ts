// API fiscal do MotorDesk (padrão de campos e rotas da Focus NFe), só para empresas cadastradas.
//   POST   /api/fiscal/v2/nfe?ref=REF            emite NF-e (síncrono)
//   GET    /api/fiscal/v2/nfe/:ref               consulta (reconsulta a SEFAZ se ficou pendente)
//   DELETE /api/fiscal/v2/nfe/:ref               cancela  { justificativa }
//   POST   /api/fiscal/v2/nfe/:ref/carta_correcao { correcao }
//   POST   /api/fiscal/v2/nfe/inutilizacao        { serie, numero_inicial, numero_final, justificativa }
//   GET    /api/fiscal/v2/nfe/:ref/xml | /danfe | /guias
//   POST   /api/fiscal/v2/nfe/calcular            prévia dos tributos, sem emitir
//   GET/PUT /api/fiscal/v2/empresa, POST/DELETE /api/fiscal/v2/empresa/certificado, GET /api/fiscal/v2/sefaz/status
//   GET/PUT /api/fiscal/v2/plataforma            (administrador da plataforma: responsável técnico, tabela de UFs)
import type { Express } from "express";
import crypto from "crypto";
import { parsePfx, ParsedCertificate } from "./certificate.ts";
import { buildNFe, buildEvento, buildInutilizacao, FiscalProfile, FiscalValidationError, NFE_NS, RespTec, signXml, validateProfile } from "./nfe.ts";
import { callSefaz, retStatus, SefazError, UFS_HABILITADAS } from "./sefaz.ts";
import { DEFAULT_UF_TABLE, UF_CODES, UfTaxRow } from "./tax.ts";
import { calcularGuias, DEFAULT_GNRE_RECEITAS, Guia } from "./gnre.ts";
import { renderDanfe } from "./danfe.ts";
import { digits, readAllElements, readElement, readTag } from "./xml.ts";

export interface FiscalDeps {
  exec: (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
  hasDb: () => boolean;
  encrypt: (plain: string) => Promise<string>;
  decrypt: (stored: string | null) => Promise<string | null>;
  getStore: () => any;
  mutateStore: (fn: (current: any) => any, meta: { source: string; companyId?: string; userId?: string }) => Promise<any>;
  // Empresa e permissões do chamador (sessão ou chave de API com escopo "fiscal")
  access: (req: any, need: "ler" | "emitir" | "cancelar" | "configurar") => { companyId: string; actor: string } | { error: string; status: number };
  isMaster: (req: any) => boolean;
}

const AUTORIZADO = ["100", "150"];
const DENEGADO = ["110", "301", "302", "303"];

let tablesReady: Promise<void> | null = null;
function ensureTables(d: FiscalDeps): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await d.exec(`CREATE TABLE IF NOT EXISTS fiscal_profiles (
        company_id TEXT PRIMARY KEY, data JSONB NOT NULL, cert_enc TEXT, cert_pass_enc TEXT, cert_meta JSONB, updated_at BIGINT NOT NULL)`);
      await d.exec(`CREATE TABLE IF NOT EXISTS fiscal_settings (key TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at BIGINT NOT NULL)`);
      await d.exec(`CREATE TABLE IF NOT EXISTS nfe_numbering (
        company_id TEXT NOT NULL, serie INT NOT NULL, ambiente INT NOT NULL, next_number BIGINT NOT NULL,
        PRIMARY KEY (company_id, serie, ambiente))`);
      await d.exec(`CREATE TABLE IF NOT EXISTS nfe_documents (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, ref TEXT NOT NULL, serie INT NOT NULL, numero BIGINT NOT NULL, ambiente INT NOT NULL,
        chave TEXT, status TEXT NOT NULL, cstat TEXT, motivo TEXT, protocolo TEXT, recibo TEXT, xml TEXT, xml_proc TEXT,
        payload JSONB, totals JSONB, guias JSONB, eventos JSONB NOT NULL DEFAULT '[]'::jsonb, destinatario JSONB,
        created_by TEXT, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, UNIQUE (company_id, ref))`);
      await d.exec(`CREATE INDEX IF NOT EXISTS nfe_documents_company_created ON nfe_documents (company_id, created_at DESC)`);
      await d.exec(`CREATE TABLE IF NOT EXISTS nfe_inutilizacoes (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, serie INT NOT NULL, ambiente INT NOT NULL, numero_inicial BIGINT NOT NULL,
        numero_final BIGINT NOT NULL, justificativa TEXT, protocolo TEXT, cstat TEXT, motivo TEXT, xml TEXT, created_by TEXT, created_at BIGINT NOT NULL)`);
    })().catch((err) => { tablesReady = null; throw err; });
  }
  return tablesReady;
}

// ------------------------------------------------------------------------
// Configurações
// ------------------------------------------------------------------------
async function getSetting<T>(d: FiscalDeps, key: string, fallback: T): Promise<T> {
  const r = await d.exec(`SELECT data FROM fiscal_settings WHERE key = $1`, [key]);
  return r.rows[0] ? (r.rows[0].data as T) : fallback;
}
async function platformConfig(d: FiscalDeps) {
  const respTec = await getSetting<RespTec | null>(d, "resp_tec", null);
  const ufTable = await getSetting<Record<string, UfTaxRow>>(d, "uf_table", {});
  const receitas = await getSetting(d, "gnre_receitas", {} as any);
  return { respTec, ufTable: { ...DEFAULT_UF_TABLE, ...ufTable }, receitas };
}

async function loadProfile(d: FiscalDeps, companyId: string) {
  const r = await d.exec(`SELECT * FROM fiscal_profiles WHERE company_id = $1`, [companyId]);
  return r.rows[0] || null;
}

async function loadCredentials(d: FiscalDeps, row: any): Promise<ParsedCertificate> {
  if (!row?.cert_enc) throw new FiscalValidationError(["Envie o certificado digital A1 da empresa."]);
  const pfx = await d.decrypt(row.cert_enc);
  const pass = await d.decrypt(row.cert_pass_enc);
  return parsePfx(Buffer.from(pfx || "", "base64"), pass || "");
}

function certProblems(meta: any, profile: FiscalProfile | null): string[] {
  if (!meta) return ["Envie o certificado digital A1 da empresa."];
  const e: string[] = [];
  if (new Date(meta.notAfter).getTime() < Date.now()) e.push(`Certificado digital vencido em ${String(meta.notAfter).slice(0, 10)}.`);
  if (profile && meta.cnpj && digits(profile.cnpj).slice(0, 8) !== String(meta.cnpj).slice(0, 8)) e.push("O certificado pertence a outro CNPJ.");
  return e;
}

// ------------------------------------------------------------------------
// Numeração (atômica no banco: nunca repete nem pula sem registro)
// ------------------------------------------------------------------------
async function nextNumber(d: FiscalDeps, companyId: string, serie: number, ambiente: number, inicial: number): Promise<number> {
  await d.exec(
    `INSERT INTO nfe_numbering (company_id, serie, ambiente, next_number) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [companyId, serie, ambiente, Math.max(1, inicial)]);
  const r = await d.exec(
    `UPDATE nfe_numbering SET next_number = next_number + 1 WHERE company_id = $1 AND serie = $2 AND ambiente = $3 RETURNING next_number - 1 AS numero`,
    [companyId, serie, ambiente]);
  return Number(r.rows[0].numero);
}

// ------------------------------------------------------------------------
// Resposta no formato da Focus NFe
// ------------------------------------------------------------------------
function focusView(row: any, cnpj?: string) {
  const base = `/api/fiscal/v2/nfe/${encodeURIComponent(row.ref)}`;
  const eventos = Array.isArray(row.eventos) ? row.eventos : [];
  return {
    cnpj_emitente: cnpj || null,
    ref: row.ref,
    status: row.status,
    status_sefaz: row.cstat || null,
    mensagem_sefaz: row.motivo || null,
    chave_nfe: row.chave || null,
    numero: String(row.numero),
    serie: String(row.serie),
    ambiente: Number(row.ambiente) === 1 ? "producao" : "homologacao",
    protocolo: row.protocolo || null,
    valor_total: row.totals?.vNF ?? null,
    destinatario: row.destinatario || null,
    caminho_xml_nota_fiscal: row.xml_proc ? `${base}/xml` : null,
    caminho_danfe: row.xml_proc ? `${base}/danfe` : null,
    guias: row.guias || [],
    cartas_correcao: eventos.filter((e: any) => e.tipo === "110110").map((e: any) => ({ sequencia: e.nSeq, correcao: e.texto, protocolo: e.protocolo, data: e.data })),
    cancelamento: eventos.find((e: any) => e.tipo === "110111" && e.cStat && ["135", "155"].includes(e.cStat)) || null,
    criado_em: new Date(Number(row.created_at)).toISOString(),
    atualizado_em: new Date(Number(row.updated_at)).toISOString(),
  };
}

// Registro resumido na lista de documentos fiscais do sistema (telas existentes)
async function syncAppRecord(d: FiscalDeps, companyId: string, row: any, actor: string) {
  if (!["autorizado", "cancelado"].includes(row.status)) return;
  const store = d.getStore() || {};
  const company = [...(store.registeredCompanies || []), store.companyInfo].find((c: any) => c && c.id === companyId) || {};
  const payload = row.payload || {};
  const record = {
    id: `nfe-api-${row.id}`,
    code: `NFE-${String(row.numero).padStart(6, "0")}`,
    type: "nfe_product",
    docModel: "55",
    status: row.status === "cancelado" ? "canceled" : "authorized",
    accessKey: row.chave,
    protocolNumber: row.protocolo,
    nfeNumber: Number(row.numero),
    series: String(row.serie),
    issueDate: new Date(Number(row.created_at)).toISOString().slice(0, 10),
    issuedAt: new Date(Number(row.created_at)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    companyId,
    companyName: company.tradeName || company.name || "",
    companyCnpj: company.cnpj || "",
    clientName: row.destinatario?.nome || payload.nome_destinatario || "",
    clientCpfCnpj: row.destinatario?.documento || "",
    cfop: payload.items?.[0]?.cfop || "",
    totalProducts: row.totals?.vProd || 0,
    totalServices: 0,
    totalTaxes: Math.round(((row.totals?.vICMS || 0) + (row.totals?.vST || 0) + (row.totals?.vIPI || 0) + (row.totals?.vPIS || 0) + (row.totals?.vCOFINS || 0)) * 100) / 100,
    totalAmount: row.totals?.vNF || 0,
    sefazStatusMessage: `${row.cstat} - ${row.motivo}`,
    environment: Number(row.ambiente) === 1 ? "production" : "homologation",
    items: (payload.items || []).map((it: any, i: number) => ({ id: `fi-${row.id}-${i + 1}`, code: it.codigo_produto, name: it.descricao, ncm: it.codigo_ncm, quantity: Number(it.quantidade_comercial), unitPrice: Number(it.valor_unitario_comercial), totalPrice: Math.round(Number(it.quantidade_comercial) * Number(it.valor_unitario_comercial) * 100) / 100, type: "part", cfop: it.cfop })),
    source: "motordesk_fiscal_api",
    ref: row.ref,
    _rev: Date.now(),
  };
  await d.mutateStore((current) => {
    const next = { ...(current || {}) };
    const list = Array.isArray(next.fiscalDocuments) ? [...next.fiscalDocuments] : [];
    const i = list.findIndex((x: any) => x && x.id === record.id);
    if (i >= 0) list[i] = { ...list[i], ...record }; else list.unshift(record);
    next.fiscalDocuments = list;
    return next;
  }, { source: "fiscal_nfe", companyId, userId: actor });
}

// ------------------------------------------------------------------------
// Emissão e reconsulta
// ------------------------------------------------------------------------
async function updateDoc(d: FiscalDeps, id: string, fields: Record<string, any>) {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => (["totals", "guias", "eventos", "payload", "destinatario"].includes(k) ? JSON.stringify(fields[k]) : fields[k]));
  const r = await d.exec(`UPDATE nfe_documents SET ${sets}, updated_at = ${Date.now()} WHERE id = $1 RETURNING *`, [id, ...values]);
  return r.rows[0];
}

function nfeProc(signedNFe: string, protNFe: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="${NFE_NS}" versao="4.00">${signedNFe}${protNFe}</nfeProc>`;
}

async function applyProtocol(d: FiscalDeps, row: any, protNFe: string, companyId: string, ufEmit: string, receitas: any, iest: Record<string, string> | undefined, actor: string) {
  const { cStat, xMotivo } = retStatus(protNFe, "infProt");
  if (AUTORIZADO.includes(cStat)) {
    const guias: Guia[] = calcularGuias({
      ufEmit, ufDest: row.destinatario?.uf || ufEmit, chave: row.chave, numero: Number(row.numero), dataEmissao: new Date().toISOString(),
      totals: row.totals || {}, temIeSubstitutoNoDestino: Boolean(iest && iest[row.destinatario?.uf]), receitas,
    });
    const updated = await updateDoc(d, row.id, {
      status: "autorizado", cstat: cStat, motivo: xMotivo, protocolo: readTag(protNFe, "nProt"), xml_proc: nfeProc(row.xml, protNFe), guias,
    });
    await syncAppRecord(d, companyId, updated, actor);
    return updated;
  }
  if (DENEGADO.includes(cStat)) {
    return updateDoc(d, row.id, { status: "denegado", cstat: cStat, motivo: xMotivo, xml_proc: nfeProc(row.xml, protNFe) });
  }
  return updateDoc(d, row.id, { status: "erro_autorizacao", cstat: cStat, motivo: xMotivo });
}

async function consultarProtocolo(d: FiscalDeps, row: any, ufEmit: string, cred: ParsedCertificate) {
  const body = `<consSitNFe xmlns="${NFE_NS}" versao="4.00"><tpAmb>${row.ambiente}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${row.chave}</chNFe></consSitNFe>`;
  const ret = await callSefaz({ uf: ufEmit, ambiente: Number(row.ambiente) as 1 | 2, servico: "consultaProtocolo", body, cred });
  return { ret, prot: readElement(ret, "protNFe"), ...retStatus(ret) };
}

async function consultarRecibo(d: FiscalDeps, row: any, ufEmit: string, cred: ParsedCertificate) {
  const body = `<consReciNFe xmlns="${NFE_NS}" versao="4.00"><tpAmb>${row.ambiente}</tpAmb><nRec>${row.recibo}</nRec></consReciNFe>`;
  const ret = await callSefaz({ uf: ufEmit, ambiente: Number(row.ambiente) as 1 | 2, servico: "retAutorizacao", body, cred });
  return { ret, prot: readElement(ret, "protNFe"), ...retStatus(ret) };
}

// Nota que ficou "processando" (SEFAZ lenta, queda de conexão): descobre o resultado real
async function resolverPendente(d: FiscalDeps, row: any, ctx: { companyId: string; profile: FiscalProfile; cred: ParsedCertificate; receitas: any; actor: string }) {
  const uf = ctx.profile.endereco.uf;
  try {
    if (row.recibo) {
      const r = await consultarRecibo(d, row, uf, ctx.cred);
      if (r.prot) return applyProtocol(d, row, r.prot, ctx.companyId, uf, ctx.receitas, ctx.profile.iest, ctx.actor);
      if (r.cStat === "105") return row; // lote ainda em processamento
    }
    const c = await consultarProtocolo(d, row, uf, ctx.cred);
    if (c.prot) return applyProtocol(d, row, c.prot, ctx.companyId, uf, ctx.receitas, ctx.profile.iest, ctx.actor);
    if (c.cStat === "217") return updateDoc(d, row.id, { status: "erro_autorizacao", cstat: c.cStat, motivo: "NF-e não consta na SEFAZ: pode ser reenviada com a mesma referência." });
  } catch (err: any) {
    if (!(err instanceof SefazError)) throw err;
  }
  return row;
}

// ------------------------------------------------------------------------
// Rotas
// ------------------------------------------------------------------------
export function registerFiscalRoutes(app: Express, d: FiscalDeps) {
  const guard = (need: "ler" | "emitir" | "cancelar" | "configurar") => async (req: any, res: any, next: any) => {
    if (!d.hasDb()) return res.status(503).json({ codigo: "banco_indisponivel", mensagem: "A emissão fiscal exige o banco de dados configurado." });
    const a = d.access(req, need);
    if ("error" in a) return res.status(a.status).json({ codigo: "permissao_negada", mensagem: a.error });
    try {
      await ensureTables(d);
    } catch (err: any) {
      return res.status(503).json({ codigo: "banco_indisponivel", mensagem: err.message });
    }
    req.fiscal = a;
    next();
  };
  const fail = (res: any, err: any) => {
    if (err instanceof FiscalValidationError) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "Dados inválidos para a NF-e.", erros: err.details });
    if (err instanceof SefazError) return res.status(err.kind === "configuracao" ? 422 : 502).json({ codigo: err.kind === "configuracao" ? "uf_nao_habilitada" : "sefaz_indisponivel", mensagem: err.message });
    console.error("[FISCAL] Erro inesperado:", err);
    return res.status(500).json({ codigo: "erro_interno", mensagem: err?.message || "Erro inesperado." });
  };

  async function context(req: any) {
    const companyId = req.fiscal.companyId;
    const row = await loadProfile(d, companyId);
    const profile: FiscalProfile | null = row?.data ? { ...row.data } : null;
    if (profile) {
      // Próximo número real (a sequência avança no banco a cada nota)
      const num = await d.exec(`SELECT next_number FROM nfe_numbering WHERE company_id = $1 AND serie = $2 AND ambiente = $3`, [companyId, profile.serie, profile.ambiente]);
      if (num.rows[0]) profile.proximoNumero = Math.max(Number(profile.proximoNumero || 1), Number(num.rows[0].next_number));
    }
    const plat = await platformConfig(d);
    const problems = [...validateProfile(profile, plat.respTec), ...certProblems(row?.cert_meta, profile)];
    if (profile && !UFS_HABILITADAS.includes(profile.endereco?.uf) && !process.env.FISCAL_SEFAZ_URL_OVERRIDE) {
      problems.push(`Emissão para empresas de ${profile.endereco?.uf} ainda não habilitada (disponível: ${UFS_HABILITADAS.join(", ")}).`);
    }
    return { companyId, row, profile, plat, problems };
  }

  // ---------- Configuração da empresa ----------
  app.get("/api/fiscal/v2/empresa", guard("ler"), async (req: any, res) => {
    try {
      const c = await context(req);
      res.json({
        configurado: c.problems.length === 0,
        pendencias: c.problems,
        perfil: c.profile,
        certificado: c.row?.cert_meta || null,
        ufs_habilitadas: UFS_HABILITADAS,
        responsavel_tecnico_configurado: Boolean(c.plat.respTec),
      });
    } catch (err) { fail(res, err); }
  });

  app.put("/api/fiscal/v2/empresa", guard("configurar"), async (req: any, res) => {
    try {
      const b = req.body || {};
      const current = (await loadProfile(d, req.fiscal.companyId))?.data || {};
      const profile: FiscalProfile = {
        ...current,
        cnpj: digits(b.cnpj ?? current.cnpj),
        razaoSocial: String(b.razaoSocial ?? current.razaoSocial ?? "").trim(),
        nomeFantasia: String(b.nomeFantasia ?? current.nomeFantasia ?? "").trim(),
        ie: String(b.ie ?? current.ie ?? "").trim(),
        iest: b.iest ?? current.iest ?? {},
        im: String(b.im ?? current.im ?? "").trim(),
        cnae: digits(b.cnae ?? current.cnae),
        crt: Number(b.crt ?? current.crt ?? 3) as any,
        endereco: { ...(current.endereco || {}), ...(b.endereco || {}) },
        ambiente: Number(b.ambiente ?? current.ambiente ?? 2) as any,
        serie: Number(b.serie ?? current.serie ?? 1),
        proximoNumero: Number(b.proximoNumero ?? current.proximoNumero ?? 1),
        pisCofinsRegime: (b.pisCofinsRegime ?? current.pisCofinsRegime ?? "cumulativo") === "nao_cumulativo" ? "nao_cumulativo" : "cumulativo",
        excluirIcmsBasePisCofins: (b.excluirIcmsBasePisCofins ?? current.excluirIcmsBasePisCofins) !== false,
        contribuinteIpi: Boolean(b.contribuinteIpi ?? current.contribuinteIpi),
        aliqCreditoSimples: b.aliqCreditoSimples !== undefined ? Number(b.aliqCreditoSimples) : current.aliqCreditoSimples,
        informacoesComplementaresPadrao: String(b.informacoesComplementaresPadrao ?? current.informacoesComplementaresPadrao ?? "").slice(0, 2000),
      };
      profile.endereco.uf = String(profile.endereco.uf || "").toUpperCase();
      if (!UF_CODES[profile.endereco.uf]) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "UF do endereço inválida." });
      // Próximo número: só pode avançar (números já usados não voltam)
      const used = await d.exec(`SELECT next_number FROM nfe_numbering WHERE company_id = $1 AND serie = $2 AND ambiente = $3`, [req.fiscal.companyId, profile.serie, profile.ambiente]);
      if (used.rows[0]) {
        if (profile.proximoNumero < Number(used.rows[0].next_number)) profile.proximoNumero = Number(used.rows[0].next_number);
        else if (b.proximoNumero !== undefined) await d.exec(`UPDATE nfe_numbering SET next_number = $4 WHERE company_id = $1 AND serie = $2 AND ambiente = $3`, [req.fiscal.companyId, profile.serie, profile.ambiente, profile.proximoNumero]);
      }
      await d.exec(
        `INSERT INTO fiscal_profiles (company_id, data, updated_at) VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (company_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
        [req.fiscal.companyId, JSON.stringify(profile), Date.now()]);
      const c = await context(req);
      res.json({ configurado: c.problems.length === 0, pendencias: c.problems, perfil: c.profile, certificado: c.row?.cert_meta || null });
    } catch (err) { fail(res, err); }
  });

  app.post("/api/fiscal/v2/empresa/certificado", guard("configurar"), async (req: any, res) => {
    try {
      const b64 = String(req.body?.arquivo_base64 || "").replace(/^data:[^,]+,/, "");
      const senha = String(req.body?.senha || "");
      if (!b64 || !senha) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "Envie o arquivo do certificado (.pfx) e a senha." });
      if (b64.length > 200_000) return res.status(413).json({ codigo: "requisicao_invalida", mensagem: "Arquivo grande demais para um certificado A1." });
      let parsed: ParsedCertificate;
      try {
        parsed = parsePfx(Buffer.from(b64, "base64"), senha);
      } catch (err: any) {
        return res.status(422).json({ codigo: "certificado_invalido", mensagem: err.message });
      }
      const current = await loadProfile(d, req.fiscal.companyId);
      const meta = { cnpj: parsed.cnpj, cpf: parsed.cpf, titular: parsed.subject, emissor: parsed.issuer, serie: parsed.serialNumber, validoDe: parsed.notBefore, notAfter: parsed.notAfter, validoAte: parsed.notAfter, enviadoEm: new Date().toISOString(), enviadoPor: req.fiscal.actor };
      const problems = certProblems(meta, current?.data || null);
      if (problems.length) return res.status(422).json({ codigo: "certificado_invalido", mensagem: problems.join(" ") });
      if (!parsed.cnpj) return res.status(422).json({ codigo: "certificado_invalido", mensagem: "O certificado não é um e-CNPJ (não traz o CNPJ da empresa)." });
      await d.exec(
        `INSERT INTO fiscal_profiles (company_id, data, cert_enc, cert_pass_enc, cert_meta, updated_at) VALUES ($1, '{}'::jsonb, $2, $3, $4::jsonb, $5)
         ON CONFLICT (company_id) DO UPDATE SET cert_enc = EXCLUDED.cert_enc, cert_pass_enc = EXCLUDED.cert_pass_enc, cert_meta = EXCLUDED.cert_meta, updated_at = EXCLUDED.updated_at`,
        [req.fiscal.companyId, await d.encrypt(b64), await d.encrypt(senha), JSON.stringify(meta), Date.now()]);
      res.json({ certificado: meta });
    } catch (err) { fail(res, err); }
  });

  app.delete("/api/fiscal/v2/empresa/certificado", guard("configurar"), async (req: any, res) => {
    try {
      await d.exec(`UPDATE fiscal_profiles SET cert_enc = NULL, cert_pass_enc = NULL, cert_meta = NULL, updated_at = $2 WHERE company_id = $1`, [req.fiscal.companyId, Date.now()]);
      res.json({ removido: true });
    } catch (err) { fail(res, err); }
  });

  // ---------- Configuração da plataforma (administrador do MotorDesk) ----------
  app.get("/api/fiscal/v2/plataforma", guard("ler"), async (req: any, res) => {
    if (!d.isMaster(req)) return res.status(403).json({ codigo: "permissao_negada", mensagem: "Somente o administrador da plataforma." });
    try {
      const plat = await platformConfig(d);
      res.json({ responsavel_tecnico: plat.respTec, tabela_uf: plat.ufTable, receitas_gnre: { ...DEFAULT_GNRE_RECEITAS, ...plat.receitas } });
    } catch (err) { fail(res, err); }
  });

  app.put("/api/fiscal/v2/plataforma", guard("ler"), async (req: any, res) => {
    if (!d.isMaster(req)) return res.status(403).json({ codigo: "permissao_negada", mensagem: "Somente o administrador da plataforma." });
    try {
      const b = req.body || {};
      const save = (key: string, data: any) => d.exec(
        `INSERT INTO fiscal_settings (key, data, updated_at) VALUES ($1, $2::jsonb, $3) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
        [key, JSON.stringify(data), Date.now()]);
      if (b.responsavel_tecnico) {
        const rt = b.responsavel_tecnico;
        const v: RespTec = { cnpj: digits(rt.cnpj), contato: String(rt.contato || "").trim(), email: String(rt.email || "").trim(), fone: digits(rt.fone) };
        if (v.cnpj.length !== 14 || !v.contato || !/@/.test(v.email) || v.fone.length < 10) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "Responsável técnico: informe CNPJ, contato, e-mail e telefone com DDD." });
        await save("resp_tec", v);
      }
      if (b.tabela_uf) {
        const t: Record<string, UfTaxRow> = {};
        for (const [uf, row] of Object.entries<any>(b.tabela_uf)) {
          if (!UF_CODES[uf]) continue;
          t[uf] = { aliqInterna: Number(row.aliqInterna), fcp: Number(row.fcp || 0), difalBase: row.difalBase === "unica" ? "unica" : "dupla" };
        }
        await save("uf_table", t);
      }
      if (b.receitas_gnre) await save("gnre_receitas", b.receitas_gnre);
      const plat = await platformConfig(d);
      res.json({ responsavel_tecnico: plat.respTec, tabela_uf: plat.ufTable, receitas_gnre: { ...DEFAULT_GNRE_RECEITAS, ...plat.receitas } });
    } catch (err) { fail(res, err); }
  });

  // ---------- SEFAZ ----------
  app.get("/api/fiscal/v2/sefaz/status", guard("ler"), async (req: any, res) => {
    try {
      const c = await context(req);
      if (!c.profile) throw new FiscalValidationError(["Configure os dados fiscais da empresa."]);
      const cred = await loadCredentials(d, c.row);
      const uf = c.profile.endereco.uf;
      const body = `<consStatServ xmlns="${NFE_NS}" versao="4.00"><tpAmb>${c.profile.ambiente}</tpAmb><cUF>${UF_CODES[uf]}</cUF><xServ>STATUS</xServ></consStatServ>`;
      const ret = await callSefaz({ uf, ambiente: c.profile.ambiente, servico: "statusServico", body, cred, timeoutMs: 15000 });
      const s = retStatus(ret);
      res.json({ uf, ambiente: c.profile.ambiente === 1 ? "producao" : "homologacao", status_sefaz: s.cStat, mensagem_sefaz: s.xMotivo, em_operacao: s.cStat === "107", tempo_medio: readTag(ret, "tMed") });
    } catch (err) { fail(res, err); }
  });

  // ---------- Prévia de tributos ----------
  app.post("/api/fiscal/v2/nfe/calcular", guard("ler"), async (req: any, res) => {
    try {
      const c = await context(req);
      if (!c.profile) throw new FiscalValidationError(["Configure os dados fiscais da empresa."]);
      const respTec = c.plat.respTec || { cnpj: "00000000000000", contato: "-", email: "-", fone: "0000000000" };
      const built = buildNFe(req.body || {}, { profile: c.profile, respTec, numero: 1, serie: c.profile.serie, ufTable: c.plat.ufTable });
      const guias = calcularGuias({ ufEmit: c.profile.endereco.uf, ufDest: built.ufDest, chave: "", numero: 0, dataEmissao: new Date().toISOString(), totals: built.totals, temIeSubstitutoNoDestino: Boolean(c.profile.iest?.[built.ufDest]), receitas: c.plat.receitas });
      res.json({
        totais: built.totals,
        operacao: built.idDest === 1 ? "interna" : built.idDest === 2 ? "interestadual" : "exterior",
        consumidor_final: built.indFinal === 1,
        itens: built.items.map((x, i) => ({ numero_item: i + 1, valor_bruto: x.vProd, icms_base_calculo: x.vBC, icms_valor: x.vICMS, icms_st_base_calculo: x.vBCST, icms_st_valor: x.vST, fcp_valor: x.vFCP, fcp_st_valor: x.vFCPST, difal_valor: x.vICMSUFDest, fcp_uf_destino_valor: x.vFCPUFDest, icms_desonerado: x.vICMSDeson, ipi_valor: x.vIPI, pis_valor: x.vPIS, cofins_valor: x.vCOFINS })),
        guias,
        pendencias_configuracao: c.problems,
      });
    } catch (err) { fail(res, err); }
  });

  // ---------- Emissão ----------
  app.post("/api/fiscal/v2/nfe", guard("emitir"), async (req: any, res) => {
    const ref = String(req.query.ref || req.body?.ref || "").trim();
    if (!/^[A-Za-z0-9_.-]{1,60}$/.test(ref)) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "Informe a referência (ref) da nota: até 60 letras, números, ponto, hífen ou sublinhado." });
    try {
      const c = await context(req);
      if (c.problems.length) return res.status(422).json({ codigo: "empresa_nao_configurada", mensagem: "Configuração fiscal da empresa incompleta.", erros: c.problems });
      const profile = c.profile!;
      const payload = { ...(req.body || {}) };
      delete payload.ref;

      const existing = (await d.exec(`SELECT * FROM nfe_documents WHERE company_id = $1 AND ref = $2`, [c.companyId, ref])).rows[0];
      if (existing && ["autorizado", "cancelado", "denegado"].includes(existing.status)) return res.json(focusView(existing, profile.cnpj));
      if (existing && existing.status === "processando_autorizacao" && Date.now() - Number(existing.updated_at) < 120000) {
        return res.status(409).json({ codigo: "em_processamento", mensagem: "Esta referência já está sendo enviada à SEFAZ. Consulte em instantes." });
      }

      // Valida antes de reservar número (erros de cadastro não consomem numeração)
      buildNFe(payload, { profile, respTec: c.plat.respTec!, numero: 1, serie: profile.serie, ufTable: c.plat.ufTable });
      const cred = await loadCredentials(d, c.row);

      let row = existing;
      if (row && row.status === "processando_autorizacao") {
        // Envio anterior sem resposta: antes de reenviar, descobre se a SEFAZ autorizou
        row = await resolverPendente(d, row, { companyId: c.companyId, profile, cred, receitas: c.plat.receitas, actor: req.fiscal.actor });
        if (row.status !== "erro_autorizacao") return res.status(row.status === "autorizado" ? 200 : 202).json(focusView(row, profile.cnpj));
      }
      const numero = row ? Number(row.numero) : await nextNumber(d, c.companyId, profile.serie, profile.ambiente, profile.proximoNumero);
      const serie = row ? Number(row.serie) : profile.serie;
      const built = buildNFe(payload, { profile, respTec: c.plat.respTec!, numero, serie, ufTable: c.plat.ufTable });
      const signed = signXml(built.xml, "infNFe", cred.keyPem, cred.certPem);
      const now = Date.now();
      const fields = {
        status: "processando_autorizacao", chave: built.chave, xml: signed, payload, totals: built.totals, destinatario: built.destinatario,
        cstat: null, motivo: null, recibo: null, protocolo: null, xml_proc: null,
      };
      if (row) row = await updateDoc(d, row.id, fields);
      else {
        const id = `nfe_${crypto.randomBytes(8).toString("hex")}`;
        row = (await d.exec(
          `INSERT INTO nfe_documents (id, company_id, ref, serie, numero, ambiente, chave, status, xml, payload, totals, destinatario, created_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'processando_autorizacao',$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$13) RETURNING *`,
          [id, c.companyId, ref, serie, numero, profile.ambiente, built.chave, signed, JSON.stringify(payload), JSON.stringify(built.totals), JSON.stringify(built.destinatario), req.fiscal.actor, now])).rows[0];
      }

      const idLote = String(now).slice(-15);
      const env = `<enviNFe xmlns="${NFE_NS}" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signed}</enviNFe>`;
      let ret: string;
      try {
        ret = await callSefaz({ uf: profile.endereco.uf, ambiente: profile.ambiente, servico: "autorizacao", body: env, cred });
      } catch (err: any) {
        if (err instanceof SefazError && err.kind === "configuracao") throw err;
        // Sem resposta: a nota pode ter sido autorizada. Fica pendente e é reconsultada.
        row = await updateDoc(d, row.id, { motivo: `Sem resposta da SEFAZ (${err.message}). A situação será consultada novamente.` });
        return res.status(202).json(focusView(row, profile.cnpj));
      }
      const lote = retStatus(ret);
      const prot = readElement(ret, "protNFe");
      if (prot) row = await applyProtocol(d, row, prot, c.companyId, profile.endereco.uf, c.plat.receitas, profile.iest, req.fiscal.actor);
      else if (lote.cStat === "103") {
        row = await updateDoc(d, row.id, { recibo: readTag(ret, "nRec"), cstat: lote.cStat, motivo: lote.xMotivo });
        for (let i = 0; i < 3 && row.status === "processando_autorizacao"; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          row = await resolverPendente(d, row, { companyId: c.companyId, profile, cred, receitas: c.plat.receitas, actor: req.fiscal.actor });
        }
      } else if (lote.cStat === "204" || lote.cStat === "539") {
        // Duplicidade: a nota já foi recebida antes; recupera o protocolo
        row = await resolverPendente(d, row, { companyId: c.companyId, profile, cred, receitas: c.plat.receitas, actor: req.fiscal.actor });
        if (row.status === "processando_autorizacao") row = await updateDoc(d, row.id, { status: "erro_autorizacao", cstat: lote.cStat, motivo: lote.xMotivo });
      } else {
        row = await updateDoc(d, row.id, { status: "erro_autorizacao", cstat: lote.cStat, motivo: lote.xMotivo });
      }
      const http = row.status === "autorizado" ? 201 : row.status === "processando_autorizacao" ? 202 : 422;
      res.status(http).json(focusView(row, profile.cnpj));
    } catch (err) { fail(res, err); }
  });

  app.get("/api/fiscal/v2/nfe", guard("ler"), async (req: any, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 200);
      const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
      const status = req.query.status ? String(req.query.status) : null;
      const r = await d.exec(
        `SELECT id, ref, serie, numero, ambiente, chave, status, cstat, motivo, protocolo, totals, destinatario, guias, eventos, created_at, updated_at, (xml_proc IS NOT NULL) AS tem_xml
         FROM nfe_documents WHERE company_id = $1 ${status ? "AND status = $4" : ""} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        status ? [req.fiscal.companyId, limit, offset, status] : [req.fiscal.companyId, limit, offset]);
      res.json({ notas: r.rows.map((x: any) => focusView({ ...x, xml_proc: x.tem_xml ? "1" : null })), limit, offset });
    } catch (err) { fail(res, err); }
  });

  const findDoc = async (req: any) => (await d.exec(`SELECT * FROM nfe_documents WHERE company_id = $1 AND ref = $2`, [req.fiscal.companyId, req.params.ref])).rows[0];

  app.get("/api/fiscal/v2/nfe/:ref", guard("ler"), async (req: any, res) => {
    try {
      let row = await findDoc(req);
      if (!row) return res.status(404).json({ codigo: "nao_encontrado", mensagem: "Nota fiscal não encontrada." });
      const c = await context(req);
      if (row.status === "processando_autorizacao" && c.profile && c.row?.cert_enc) {
        const cred = await loadCredentials(d, c.row);
        row = await resolverPendente(d, row, { companyId: c.companyId, profile: c.profile, cred, receitas: c.plat.receitas, actor: req.fiscal.actor });
      }
      res.json(focusView(row, c.profile?.cnpj));
    } catch (err) { fail(res, err); }
  });

  app.get("/api/fiscal/v2/nfe/:ref/xml", guard("ler"), async (req: any, res) => {
    try {
      const row = await findDoc(req);
      if (!row?.xml_proc) return res.status(404).json({ codigo: "nao_encontrado", mensagem: "XML autorizado não disponível." });
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${row.chave}-nfe.xml"`);
      res.send(row.xml_proc);
    } catch (err) { fail(res, err); }
  });

  app.get("/api/fiscal/v2/nfe/:ref/danfe", guard("ler"), async (req: any, res) => {
    try {
      const row = await findDoc(req);
      if (!row?.xml_proc) return res.status(404).json({ codigo: "nao_encontrado", mensagem: "DANFE disponível só para nota autorizada." });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderDanfe(row.xml_proc, { cancelada: row.status === "cancelado" }));
    } catch (err) { fail(res, err); }
  });

  app.get("/api/fiscal/v2/nfe/:ref/guias", guard("ler"), async (req: any, res) => {
    try {
      const row = await findDoc(req);
      if (!row) return res.status(404).json({ codigo: "nao_encontrado", mensagem: "Nota fiscal não encontrada." });
      res.json({ ref: row.ref, chave_nfe: row.chave, guias: row.guias || [] });
    } catch (err) { fail(res, err); }
  });

  // ---------- Eventos ----------
  async function sendEvento(req: any, res: any, tipo: "110111" | "110110") {
    const row = await findDoc(req);
    if (!row) return res.status(404).json({ codigo: "nao_encontrado", mensagem: "Nota fiscal não encontrada." });
    if (row.status !== "autorizado") return res.status(422).json({ codigo: "requisicao_invalida", mensagem: `A nota está "${row.status}": só nota autorizada aceita ${tipo === "110111" ? "cancelamento" : "carta de correção"}.` });
    const texto = String(tipo === "110111" ? req.body?.justificativa || "" : req.body?.correcao || "").trim();
    if (texto.length < 15 || texto.length > (tipo === "110111" ? 255 : 1000)) {
      return res.status(422).json({ codigo: "requisicao_invalida", mensagem: tipo === "110111" ? "A justificativa precisa ter de 15 a 255 caracteres." : "A correção precisa ter de 15 a 1000 caracteres." });
    }
    const c = await context(req);
    const cred = await loadCredentials(d, c.row);
    const eventos: any[] = Array.isArray(row.eventos) ? row.eventos : [];
    const nSeq = tipo === "110111" ? 1 : eventos.filter((e) => e.tipo === "110110" && ["135", "136"].includes(e.cStat)).length + 1;
    if (nSeq > 20) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "Limite de 20 cartas de correção por nota." });
    const evento = signXml(buildEvento({ chave: row.chave, cnpj: c.profile!.cnpj, ambiente: Number(row.ambiente) as 1 | 2, tpEvento: tipo, nSeq, detalhe: tipo === "110111" ? { nProt: row.protocolo, xJust: texto } : { xCorrecao: texto } }), "infEvento", cred.keyPem, cred.certPem);
    const body = `<envEvento xmlns="${NFE_NS}" versao="1.00"><idLote>${String(Date.now()).slice(-15)}</idLote>${evento}</envEvento>`;
    const ret = await callSefaz({ uf: c.profile!.endereco.uf, ambiente: Number(row.ambiente) as 1 | 2, servico: "recepcaoEvento", body, cred });
    const retEvento = readAllElements(ret, "retEvento")[0] || "";
    const s = retEvento ? retStatus(retEvento, "infEvento") : retStatus(ret);
    const ok = ["135", "136", "155"].includes(s.cStat);
    const registro = { tipo, nSeq, texto, cStat: s.cStat, motivo: s.xMotivo, protocolo: readTag(retEvento, "nProt"), data: new Date().toISOString(), xml: ok ? `<procEventoNFe xmlns="${NFE_NS}" versao="1.00">${evento.replace(/<evento xmlns="[^"]+"/, "<evento")}${retEvento}</procEventoNFe>` : null };
    const updated = await updateDoc(d, row.id, { eventos: [...eventos, registro], ...(ok && tipo === "110111" ? { status: "cancelado", cstat: s.cStat, motivo: s.xMotivo } : {}) });
    if (ok && tipo === "110111") await syncAppRecord(d, c.companyId, updated, req.fiscal.actor);
    res.status(ok ? 200 : 422).json({ ...focusView(updated, c.profile!.cnpj), status_evento: s.cStat, mensagem_evento: s.xMotivo });
  }

  app.delete("/api/fiscal/v2/nfe/:ref", guard("cancelar"), async (req: any, res) => {
    try { await sendEvento(req, res, "110111"); } catch (err) { fail(res, err); }
  });
  app.post("/api/fiscal/v2/nfe/:ref/carta_correcao", guard("emitir"), async (req: any, res) => {
    try { await sendEvento(req, res, "110110"); } catch (err) { fail(res, err); }
  });

  app.post("/api/fiscal/v2/nfe/inutilizacao", guard("emitir"), async (req: any, res) => {
    try {
      const c = await context(req);
      if (c.problems.length) return res.status(422).json({ codigo: "empresa_nao_configurada", mensagem: "Configuração fiscal da empresa incompleta.", erros: c.problems });
      const profile = c.profile!;
      const serie = Number(req.body?.serie ?? profile.serie);
      const ini = Number(req.body?.numero_inicial);
      const fim = Number(req.body?.numero_final);
      const just = String(req.body?.justificativa || "").trim();
      if (!(ini >= 1 && fim >= ini && fim - ini < 10000)) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "Faixa de numeração inválida." });
      if (just.length < 15 || just.length > 255) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: "A justificativa precisa ter de 15 a 255 caracteres." });
      const usados = await d.exec(`SELECT numero FROM nfe_documents WHERE company_id = $1 AND serie = $2 AND ambiente = $3 AND numero BETWEEN $4 AND $5 AND status IN ('autorizado','cancelado','denegado','processando_autorizacao')`, [c.companyId, serie, profile.ambiente, ini, fim]);
      if (usados.rows.length) return res.status(422).json({ codigo: "requisicao_invalida", mensagem: `Números já usados por notas emitidas: ${usados.rows.map((x: any) => x.numero).join(", ")}.` });
      const cred = await loadCredentials(d, c.row);
      const xml = signXml(buildInutilizacao({ cUF: UF_CODES[profile.endereco.uf], ambiente: profile.ambiente, cnpj: profile.cnpj, serie, inicio: ini, fim, justificativa: just }), "infInut", cred.keyPem, cred.certPem);
      const ret = await callSefaz({ uf: profile.endereco.uf, ambiente: profile.ambiente, servico: "inutilizacao", body: xml, cred });
      const s = retStatus(ret);
      const ok = s.cStat === "102";
      await d.exec(
        `INSERT INTO nfe_inutilizacoes (id, company_id, serie, ambiente, numero_inicial, numero_final, justificativa, protocolo, cstat, motivo, xml, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [`inut_${crypto.randomBytes(6).toString("hex")}`, c.companyId, serie, profile.ambiente, ini, fim, just, readTag(ret, "nProt"), s.cStat, s.xMotivo, ok ? `<procInutNFe xmlns="${NFE_NS}" versao="4.00">${xml.replace(/<inutNFe xmlns="[^"]+"/, "<inutNFe")}${readElement(ret, "retInutNFe")}</procInutNFe>` : null, req.fiscal.actor, Date.now()]);
      res.status(ok ? 200 : 422).json({ status: ok ? "autorizado" : "erro", status_sefaz: s.cStat, mensagem_sefaz: s.xMotivo, protocolo_sefaz: readTag(ret, "nProt"), serie: String(serie), numero_inicial: String(ini), numero_final: String(fim) });
    } catch (err) { fail(res, err); }
  });
}
