/**
 * API dos tipos de conta e das contas recorrentes (/api/financeiro).
 *
 * GET  /tipos-conta                         tipos padrão + os cadastrados pela empresa
 * POST /tipos-conta                         cadastra um tipo
 * PUT  /tipos-conta/:id                     altera / desativa um tipo da empresa
 * GET  /recorrencias                        contas recorrentes da empresa
 * POST /recorrencias/:grupo/encerrar        encerra a recorrência a partir de uma data (com motivo)
 * POST /recorrencias/renovar                completa os próximos 12 meses das recorrentes sem fim (empresa da sessão)
 */
import type { Express } from "express";
import { PERIODICIDADES, TIPOS_PADRAO, lancamentosParaRenovar, listarRecorrencias } from "./recorrencias.ts";

export interface FinanceiroDeps {
  getStore: () => any;
  mutateStore: (fn: (current: any) => any, meta: { source: string; companyId?: string; userId?: string }) => Promise<any>;
  /** need: "ler" | "editar" (cadastrar tipos, encerrar recorrências) */
  access: (req: any, need: "ler" | "editar") => { companyId: string; actor: string; userId: string } | { status: number; error: string };
  nextRev: () => number;
}

const hojeISO = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); // Brasília
const daEmpresa = (list: any, companyId: string) => (Array.isArray(list) ? list : []).filter((r: any) => r && (r.companyId || "comp-1") === companyId);
const texto = (v: any, max = 120) => String(v ?? "").trim().slice(0, max);

function validarTipo(body: any): { tipo?: any; erro?: string } {
  const nome = texto(body?.nome, 80);
  const periodicidade = String(body?.periodicidade || "");
  if (!nome) return { erro: "Informe o nome do tipo de conta." };
  if (!(PERIODICIDADES as readonly string[]).includes(periodicidade)) return { erro: "Periodicidade inválida." };
  const meses = Math.round(Number(body?.meses) || 0);
  if (periodicidade === "FIXA_MENSAL" && (meses < 1 || meses > 120)) return { erro: "Para tempo determinado, informe de 1 a 120 meses." };
  return { tipo: { nome, periodicidade, categoria: texto(body?.categoria, 80) || "Outros", meses: periodicidade === "FIXA_MENSAL" ? meses : undefined, observacao: texto(body?.observacao, 300) } };
}

/** Renova as recorrências sem fim de todas as empresas dentro de uma gravação (usado pelo agendamento diário). */
export function renovarTodas(current: any, nextRev: () => number): { next: any; criadas: number } {
  const contas = Array.isArray(current?.accountsPayable) ? current.accountsPayable : [];
  const novas = lancamentosParaRenovar(contas, hojeISO(), nextRev);
  if (novas.length === 0) return { next: current, criadas: 0 };
  return { next: { ...current, accountsPayable: [...contas, ...novas] }, criadas: novas.length };
}

export function registerFinanceiroRoutes(app: Express, d: FinanceiroDeps) {
  const guard = (need: "ler" | "editar") => (req: any, res: any, next: any) => {
    const r = d.access(req, need);
    if ("status" in r) return res.status(r.status).json({ success: false, error: r.error });
    req.fin = r;
    next();
  };

  app.get("/api/financeiro/tipos-conta", guard("ler"), (req: any, res) => {
    const proprios = daEmpresa(d.getStore()?.accountTypes, req.fin.companyId);
    const nomes = new Set(proprios.map((t: any) => String(t.nome).toLowerCase()));
    const padrao = TIPOS_PADRAO.filter((t) => !nomes.has(t.nome.toLowerCase())).map((t) => ({ ...t, padrao: true, ativo: true }));
    res.json({ success: true, tipos: [...proprios.map((t: any) => ({ ...t, padrao: false })), ...padrao], periodicidades: PERIODICIDADES });
  });

  app.post("/api/financeiro/tipos-conta", guard("editar"), async (req: any, res) => {
    const { tipo, erro } = validarTipo(req.body);
    if (erro) return res.status(400).json({ success: false, error: erro });
    const { companyId, actor, userId } = req.fin;
    let criado: any = null;
    let duplicado = false;
    try {
      await d.mutateStore((current) => {
        const lista = Array.isArray(current?.accountTypes) ? current.accountTypes : [];
        if (daEmpresa(lista, companyId).some((t: any) => String(t.nome).toLowerCase() === tipo.nome.toLowerCase())) { duplicado = true; return current; }
        criado = { id: `tpc-${Date.now()}`, companyId, ...tipo, ativo: true, createdAt: new Date().toISOString(), createdBy: actor, _rev: d.nextRev() };
        return { ...current, accountTypes: [...lista, criado] };
      }, { source: "tipos_conta", companyId, userId });
      if (duplicado) return res.status(409).json({ success: false, error: "Já existe um tipo de conta com esse nome." });
      res.json({ success: true, tipo: criado });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar agora. Tente novamente." });
    }
  });

  app.put("/api/financeiro/tipos-conta/:id", guard("editar"), async (req: any, res) => {
    const { companyId, userId } = req.fin;
    const somenteAtivo = req.body && Object.keys(req.body).length === 1 && "ativo" in req.body;
    const { tipo, erro } = somenteAtivo ? { tipo: null, erro: "" } : validarTipo(req.body);
    if (erro) return res.status(400).json({ success: false, error: erro });
    let salvo: any = null;
    try {
      await d.mutateStore((current) => {
        const lista = Array.isArray(current?.accountTypes) ? [...current.accountTypes] : [];
        const idx = lista.findIndex((t: any) => t && t.id === req.params.id && (t.companyId || "comp-1") === companyId);
        if (idx < 0) return current;
        salvo = { ...lista[idx], ...(tipo || {}), ...(somenteAtivo ? { ativo: Boolean(req.body.ativo) } : {}), updatedAt: new Date().toISOString(), _rev: d.nextRev() };
        lista[idx] = salvo;
        return { ...current, accountTypes: lista };
      }, { source: "tipos_conta", companyId, userId });
      if (!salvo) return res.status(404).json({ success: false, error: "Tipo de conta não encontrado (os tipos padrão não podem ser alterados; cadastre um com o mesmo nome)." });
      res.json({ success: true, tipo: salvo });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar agora. Tente novamente." });
    }
  });

  app.get("/api/financeiro/recorrencias", guard("ler"), (req: any, res) => {
    res.json({ success: true, recorrencias: listarRecorrencias(d.getStore()?.accountsPayable, req.fin.companyId, hojeISO()) });
  });

  app.post("/api/financeiro/recorrencias/renovar", guard("ler"), async (req: any, res) => {
    const { companyId, userId } = req.fin;
    let criadas = 0;
    // Só grava quando falta lançar algum mês (cada gravação faz os navegadores recarregarem)
    const contasAgora = daEmpresa(d.getStore()?.accountsPayable, companyId);
    if (lancamentosParaRenovar(contasAgora, hojeISO(), () => 0).length === 0) return res.json({ success: true, criadas: 0 });
    try {
      await d.mutateStore((current) => {
        const contas = Array.isArray(current?.accountsPayable) ? current.accountsPayable : [];
        const novas = lancamentosParaRenovar(daEmpresa(contas, companyId), hojeISO(), d.nextRev);
        criadas = novas.length;
        return criadas ? { ...current, accountsPayable: [...contas, ...novas] } : current;
      }, { source: "recorrencias_renovar", companyId, userId });
      res.json({ success: true, criadas });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível renovar agora." });
    }
  });

  app.post("/api/financeiro/recorrencias/:grupo/encerrar", guard("editar"), async (req: any, res) => {
    const { companyId, actor, userId } = req.fin;
    const motivo = texto(req.body?.motivo, 300);
    const aPartirDe = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.aPartirDe || "")) ? req.body.aPartirDe : hojeISO();
    if (!motivo) return res.status(400).json({ success: false, error: "Informe o motivo do encerramento." });
    let canceladas = 0;
    let achou = false;
    try {
      await d.mutateStore((current) => {
        const contas = Array.isArray(current?.accountsPayable) ? [...current.accountsPayable] : [];
        const encerramento = { motivo, aPartirDe, por: actor, em: new Date().toISOString() };
        for (let i = 0; i < contas.length; i++) {
          const c = contas[i];
          if (!c || c.recurrence?.groupId !== req.params.grupo || (c.companyId || "comp-1") !== companyId) continue;
          achou = true;
          // Lançamentos ainda não pagos a partir da data ficam cancelados (pagos e parciais são mantidos)
          const cancelar = c.dueDate >= aPartirDe && c.status !== "paid" && c.status !== "partial" && !(Number(c.paidAmount) > 0);
          if (cancelar) canceladas++;
          contas[i] = {
            ...c,
            status: cancelar ? "cancelled" : c.status,
            recurrence: { ...c.recurrence, ativo: false, encerramento },
            _rev: d.nextRev(),
          };
        }
        if (!achou) return current;
        const history = [{
          id: `hst-rec-${Date.now()}`, date: new Date().toISOString(), type: "financial", title: "Recorrência encerrada",
          description: `Conta recorrente encerrada a partir de ${aPartirDe}: ${canceladas} lançamento(s) futuro(s) cancelado(s). Motivo: ${motivo}`,
          userId, userName: actor, companyId, clientId: "system", vehicleId: "system",
        }, ...(Array.isArray(current.history) ? current.history : [])];
        return { ...current, accountsPayable: contas, history };
      }, { source: "recorrencias_encerrar", companyId, userId });
      if (!achou) return res.status(404).json({ success: false, error: "Recorrência não encontrada nesta empresa." });
      res.json({ success: true, canceladas });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar agora. Tente novamente." });
    }
  });
}
