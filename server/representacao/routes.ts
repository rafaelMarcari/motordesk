/**
 * API da conciliação de pedidos de representação (/api/representacao).
 *
 * GET  /pedidos                      pedidos da empresa + representadas + situação de conciliação
 * PUT  /pedidos/:id/numeros          números do pedido na representada (devolvidos por ela após digitar)
 * POST /conciliacao/analisar         prévia: cruza as linhas da planilha com os pedidos (nada é gravado)
 * POST /conciliacao/confirmar        grava o resultado nos pedidos escolhidos e guarda o histórico
 * GET  /conciliacao/historico        conciliações anteriores (resumo)
 * GET  /conciliacao/historico/:id    detalhe de uma conciliação
 *
 * A empresa vem da sessão; os pedidos de outras empresas nunca entram na análise.
 */
import type { Express } from "express";
import { analisarConciliacao, normalizarLinhas, statusAposConciliacao, chaveNumero, type OpcoesAnalise } from "./conciliacao.ts";

export interface RepresentacaoDeps {
  getStore: () => any;
  mutateStore: (fn: (current: any) => any, meta: { source: string; companyId?: string; userId?: string }) => Promise<any>;
  /** need: "ler" (ver e informar números) | "conciliar" (confirmar a conciliação) */
  access: (req: any, need: "ler" | "conciliar") => { companyId: string; actor: string; userId: string } | { status: number; error: string };
  nextRev: () => number;
}

const MAX_HISTORICO = 60;

function opcoesDe(body: any): OpcoesAnalise {
  const o = body?.opcoes || {};
  const vinculos: Record<string, string> = {};
  if (o.vinculos && typeof o.vinculos === "object") {
    for (const [k, v] of Object.entries(o.vinculos)) vinculos[String(Number(k))] = String(v ?? "");
  }
  return {
    representadaId: String(o.representadaId || ""),
    de: /^\d{4}-\d{2}-\d{2}$/.test(String(o.de || "")) ? o.de : "",
    ate: /^\d{4}-\d{2}-\d{2}$/.test(String(o.ate || "")) ? o.ate : "",
    toleranciaValor: o.toleranciaValor,
    toleranciaPercentual: o.toleranciaPercentual,
    vinculos,
    ignorar: Array.isArray(o.ignorar) ? o.ignorar.map(Number).filter(Number.isFinite) : [],
  };
}

const daEmpresa = (list: any, companyId: string) => (Array.isArray(list) ? list : []).filter((r: any) => r && (r.companyId || "comp-1") === companyId);

export function registerRepresentacaoRoutes(app: Express, d: RepresentacaoDeps) {
  const guard = (need: "ler" | "conciliar") => (req: any, res: any, next: any) => {
    const r = d.access(req, need);
    if ("status" in r) return res.status(r.status).json({ success: false, error: r.error });
    req.rep = r;
    next();
  };

  app.get("/api/representacao/pedidos", guard("ler"), (req: any, res) => {
    const db = d.getStore() || {};
    const { companyId } = req.rep;
    const pedidos = daEmpresa(db.representativeOrders, companyId).map((o: any) => ({
      id: o.id,
      numero: o.orderNumber || o.id,
      data: String(o.orderDate || o.createdAt || "").slice(0, 10),
      representadaId: o.representedId || o.representedCompanyId || "",
      representada: o.representedName || o.representedCompanyName || "",
      cliente: o.clientName || "",
      documento: o.clientCnpjCpf || o.clientDocument || "",
      valor: Number(o.totalOrderAmount ?? o.totalAmount ?? 0) || 0,
      comissaoPercentual: Number(o.commissionPercentage ?? 0) || 0,
      status: o.status || "",
      numerosRepresentada: Array.isArray(o.factoryOrderNumbers) ? o.factoryOrderNumbers : [],
      notas: Array.isArray(o.representedInvoices) ? o.representedInvoices : [],
      faturado: Number(o.invoicedAmount ?? 0) || 0,
      conciliacao: o.reconciliationStatus || "",
      conciliadoEm: o.reconciledAt || "",
    }));
    pedidos.sort((a: any, b: any) => String(b.data).localeCompare(String(a.data)) || String(b.numero).localeCompare(String(a.numero)));
    const representadas = daEmpresa(db.representedCompanies, companyId).map((r: any) => ({ id: r.id, nome: r.tradeName || r.corporateName || r.name || r.id, cnpj: r.cnpj || "" }));
    // Representadas citadas nos pedidos e ainda não cadastradas
    for (const p of pedidos) {
      if (p.representada && !representadas.some((r: any) => r.id === p.representadaId || r.nome === p.representada)) {
        representadas.push({ id: p.representadaId || `nome:${p.representada}`, nome: p.representada, cnpj: "" });
      }
    }
    res.json({ success: true, pedidos, representadas });
  });

  app.put("/api/representacao/pedidos/:id/numeros", guard("ler"), async (req: any, res) => {
    const { companyId, actor, userId } = req.rep;
    const recebidos: string[] = Array.isArray(req.body?.numeros) ? req.body.numeros : [];
    const numeros: string[] = [];
    const vistos = new Set<string>();
    for (const n of recebidos) {
      const s = String(n ?? "").trim().slice(0, 40);
      const k = chaveNumero(s);
      if (k && !vistos.has(k)) { vistos.add(k); numeros.push(s); }
    }
    if (numeros.length > 30) return res.status(400).json({ success: false, error: "Informe no máximo 30 números por pedido." });
    try {
      let atualizado: any = null;
      let conflito = "";
      await d.mutateStore((current) => {
        const next = { ...(current || {}) };
        const list = Array.isArray(next.representativeOrders) ? [...next.representativeOrders] : [];
        const idx = list.findIndex((o: any) => o && o.id === req.params.id && (o.companyId || "comp-1") === companyId);
        if (idx < 0) return current;
        // O mesmo número da representada não pode estar em dois pedidos da empresa
        for (const o of list) {
          if (!o || o.id === req.params.id || (o.companyId || "comp-1") !== companyId) continue;
          const dup = (Array.isArray(o.factoryOrderNumbers) ? o.factoryOrderNumbers : []).find((n: any) => vistos.has(chaveNumero(n)));
          if (dup) { conflito = `O número ${dup} já está no pedido ${o.orderNumber || o.id}.`; return current; }
        }
        const prev = list[idx];
        const status = numeros.length > 0 && /DIGITA|RASCUNHO|DRAFT/i.test(String(prev.status || "")) ? "ENVIADO_FABRICA" : prev.status;
        atualizado = {
          ...prev,
          factoryOrderNumbers: numeros,
          status,
          representedReceivedAt: numeros.length > 0 ? prev.representedReceivedAt || new Date().toISOString() : prev.representedReceivedAt,
          updatedAt: new Date().toISOString(),
          _rev: d.nextRev(),
        };
        list[idx] = atualizado;
        next.representativeOrders = list;
        next.history = [{
          id: `hst-rep-${Date.now()}`, date: new Date().toISOString(), type: "representative", title: "Número do pedido na representada",
          description: `Pedido ${prev.orderNumber || prev.id}: número(s) na representada ${numeros.join(", ") || "(removidos)"}.`,
          userId, userName: actor, companyId, clientId: "system", vehicleId: "system",
        }, ...(Array.isArray(next.history) ? next.history : [])];
        return next;
      }, { source: "representacao_numeros", companyId, userId });
      if (conflito) return res.status(409).json({ success: false, error: conflito });
      if (!atualizado) return res.status(404).json({ success: false, error: "Pedido não encontrado nesta empresa." });
      res.json({ success: true, id: atualizado.id, numerosRepresentada: atualizado.factoryOrderNumbers, status: atualizado.status });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar agora. Tente novamente." });
    }
  });

  app.post("/api/representacao/conciliacao/analisar", guard("ler"), (req: any, res) => {
    const db = d.getStore() || {};
    const { companyId } = req.rep;
    const linhas = normalizarLinhas(req.body?.linhas);
    if (linhas.length === 0) return res.status(400).json({ success: false, error: "A planilha não tem linhas com pedido, nota ou valor." });
    const resultado = analisarConciliacao(daEmpresa(db.representativeOrders, companyId), daEmpresa(db.representedCompanies, companyId), linhas, opcoesDe(req.body));
    res.json({ success: true, ...resultado });
  });

  app.post("/api/representacao/conciliacao/confirmar", guard("conciliar"), async (req: any, res) => {
    const { companyId, actor, userId } = req.rep;
    const linhas = normalizarLinhas(req.body?.linhas);
    const confirmar = new Set<string>((Array.isArray(req.body?.confirmar) ? req.body.confirmar : []).map(String));
    if (linhas.length === 0) return res.status(400).json({ success: false, error: "A planilha não tem linhas com pedido, nota ou valor." });
    if (confirmar.size === 0) return res.status(400).json({ success: false, error: "Selecione ao menos um pedido para confirmar." });
    const opcoes = opcoesDe(req.body);
    const arquivo = String(req.body?.arquivo || "planilha").slice(0, 160);
    const conciliacaoId = `conc-${Date.now()}`;
    const agora = new Date().toISOString();
    try {
      let registro: any = null;
      await d.mutateStore((current) => {
        const next = { ...(current || {}) };
        const todos = Array.isArray(next.representativeOrders) ? [...next.representativeOrders] : [];
        // Análise refeita no servidor sobre os pedidos gravados agora (não confia no resultado do navegador)
        const resultado = analisarConciliacao(daEmpresa(todos, companyId), daEmpresa(next.representedCompanies, companyId), linhas, opcoes);
        const aplicados: any[] = [];
        for (const p of resultado.pedidos) {
          if (!confirmar.has(p.id) || p.linhas.length === 0) continue;
          const idx = todos.findIndex((o: any) => o && o.id === p.id && (o.companyId || "comp-1") === companyId);
          if (idx < 0) continue;
          const prev = todos[idx];
          const numeros = [...(Array.isArray(prev.factoryOrderNumbers) ? prev.factoryOrderNumbers : []), ...p.numerosNovos];
          const notas = [...p.notasAnteriores, ...p.notas.map((n) => ({ ...n, conciliacaoId }))];
          const { status, reconciliationStatus } = statusAposConciliacao(p, String(prev.status || ""));
          const ultimaNota = notas.map((n) => n.data).filter(Boolean).sort().pop();
          todos[idx] = {
            ...prev,
            factoryOrderNumbers: numeros,
            representedInvoices: notas,
            invoicedAmount: p.faturado,
            commissionInvoicedAmount: p.comissaoFaturada,
            status,
            reconciliationStatus,
            reconciledAt: agora,
            lastReconciliationId: conciliacaoId,
            factoryInvoiceDate: ultimaNota || prev.factoryInvoiceDate,
            representedReceivedAt: prev.representedReceivedAt || agora,
            updatedAt: agora,
            _rev: d.nextRev(),
          };
          aplicados.push({ id: p.id, numero: p.numero, cliente: p.cliente, representada: p.representada, valor: p.valor, faturado: p.faturado, diferenca: p.diferenca, status: p.statusValores, metodo: p.metodo, numerosNovos: p.numerosNovos, notas: p.notas, avisos: p.avisos });
        }
        if (aplicados.length === 0) return current;
        next.representativeOrders = todos;
        const r = resultado.resumo;
        registro = {
          id: conciliacaoId,
          companyId,
          createdAt: agora,
          createdBy: actor,
          userId,
          arquivo,
          representadaId: opcoes.representadaId || "",
          periodo: { de: opcoes.de || "", ate: opcoes.ate || "" },
          resumo: { ...r, confirmados: aplicados.length, valorConfirmado: aplicados.reduce((s, a) => s + a.faturado, 0) },
          pedidos: aplicados,
          pendentes: resultado.pedidos.filter((p) => !confirmar.has(p.id) || p.linhas.length === 0).map((p) => ({ id: p.id, numero: p.numero, cliente: p.cliente, valor: p.valor, status: p.status })),
          linhasSemPedido: resultado.linhas.filter((l) => l.status === "sem_pedido").slice(0, 500),
        };
        const historico = daEmpresa(next.representativeReconciliations, companyId);
        const outras = (Array.isArray(next.representativeReconciliations) ? next.representativeReconciliations : []).filter((h: any) => h && (h.companyId || "comp-1") !== companyId);
        next.representativeReconciliations = [...outras, registro, ...historico].slice(0, outras.length + MAX_HISTORICO);
        next.history = [{
          id: `hst-rep-${Date.now()}`, date: agora, type: "representative", title: "Conciliação de pedidos da representada",
          description: `${aplicados.length} pedido(s) conciliado(s) a partir de "${arquivo}". Faturado: R$ ${registro.resumo.valorConfirmado.toFixed(2)}.`,
          userId, userName: actor, companyId, clientId: "system", vehicleId: "system",
        }, ...(Array.isArray(next.history) ? next.history : [])];
        return next;
      }, { source: "representacao_conciliacao", companyId, userId });
      if (!registro) return res.status(409).json({ success: false, error: "Nenhum dos pedidos selecionados tem linhas vinculadas na planilha." });
      res.json({ success: true, conciliacao: { id: registro.id, resumo: registro.resumo, pedidos: registro.pedidos.length } });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar a conciliação agora. Nada foi alterado; tente novamente." });
    }
  });

  app.get("/api/representacao/conciliacao/historico", guard("ler"), (req: any, res) => {
    const db = d.getStore() || {};
    const lista = daEmpresa(db.representativeReconciliations, req.rep.companyId)
      .map((h: any) => ({ id: h.id, createdAt: h.createdAt, createdBy: h.createdBy, arquivo: h.arquivo, representadaId: h.representadaId, periodo: h.periodo, resumo: h.resumo }))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ success: true, historico: lista });
  });

  app.get("/api/representacao/conciliacao/historico/:id", guard("ler"), (req: any, res) => {
    const db = d.getStore() || {};
    const h = daEmpresa(db.representativeReconciliations, req.rep.companyId).find((x: any) => x.id === req.params.id);
    if (!h) return res.status(404).json({ success: false, error: "Conciliação não encontrada." });
    res.json({ success: true, conciliacao: h });
  });
}
