/**
 * API da conciliação de pedidos de representação (/api/representacao).
 *
 * GET  /pedidos                      pedidos da empresa + representadas + situação de conciliação
 * PUT  /pedidos/:id/numeros          números do pedido na representada (devolvidos por ela após digitar)
 * POST /conciliacao/analisar         prévia: cruza as linhas da planilha com os pedidos (nada é gravado)
 * POST /conciliacao/confirmar        grava o resultado nos pedidos escolhidos e guarda o histórico
 * GET  /pendencias                   linhas sem pedido e pedidos ainda não conciliados (voltam em toda análise)
 * POST /pendencias/linhas/:id/baixa  baixa manual de linha sem pedido (motivo obrigatório)
 * POST /pedidos/:id/baixa | /reabrir baixa manual (ou reabertura) de pedido na conciliação, com motivo
 * GET  /conciliacao/historico        conciliações anteriores (resumo)
 * GET  /conciliacao/historico/:id    detalhe de uma conciliação
 *
 * A empresa vem da sessão; os pedidos de outras empresas nunca entram na análise.
 */
import type { Express } from "express";
import { analisarConciliacao, normalizarLinhas, statusAposConciliacao, chaveNumero, chaveLinha, pedidoEncerrado, type OpcoesAnalise, type LinhaPlanilha } from "./conciliacao.ts";

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

  // Linhas pendentes de conciliações anteriores entram de novo na análise até serem conciliadas ou baixadas
  const MAX_PENDENTES = 2000;
  function comPendentes(db: any, companyId: string, linhasCliente: LinhaPlanilha[], representadaId: string): LinhaPlanilha[] {
    const abertas = daEmpresa(db.representativePendingLines, companyId)
      .filter((p: any) => p.status === "aberta" && (!representadaId || !p.representadaId || p.representadaId === representadaId));
    const porChave = new Map<string, any>();
    for (const p of abertas) porChave.set(chaveLinha(normalizarLinhas([p.linha])[0] || p.linha), p);
    const usadas = new Set<string>();
    const linhas: LinhaPlanilha[] = linhasCliente.map((l) => {
      const p = porChave.get(chaveLinha(l));
      if (p && !usadas.has(p.id)) { usadas.add(p.id); return { ...l, pendenteId: p.id, pendenteDesde: p.origem?.em || p.createdAt, pendenteArquivo: p.origem?.arquivo || "" }; }
      return l;
    });
    let n = 900000;
    for (const p of abertas) {
      if (usadas.has(p.id)) continue;
      const base = normalizarLinhas([p.linha])[0];
      if (!base) continue;
      linhas.push({ ...base, linha: ++n, pendenteId: p.id, pendenteDesde: p.origem?.em || p.createdAt, pendenteArquivo: p.origem?.arquivo || "" });
    }
    return linhas;
  }
  const textoMotivo = (v: any) => String(v ?? "").trim().slice(0, 300);
  const mapaMotivos = (obj: any) => {
    const out = new Map<string, string>();
    if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) { const m = textoMotivo(v); if (m) out.set(String(k), m); }
    return out;
  };

  app.post("/api/representacao/conciliacao/analisar", guard("ler"), (req: any, res) => {
    const db = d.getStore() || {};
    const { companyId } = req.rep;
    const opcoes = opcoesDe(req.body);
    const linhas = comPendentes(db, companyId, normalizarLinhas(req.body?.linhas), opcoes.representadaId || "");
    if (linhas.length === 0) return res.status(400).json({ success: false, error: "Nenhuma linha para analisar: a planilha está vazia e não há pendências anteriores." });
    const resultado = analisarConciliacao(daEmpresa(db.representativeOrders, companyId), daEmpresa(db.representedCompanies, companyId), linhas, opcoes);
    res.json({ success: true, ...resultado });
  });

  app.post("/api/representacao/conciliacao/confirmar", guard("conciliar"), async (req: any, res) => {
    const { companyId, actor, userId } = req.rep;
    const linhasCliente = normalizarLinhas(req.body?.linhas);
    const confirmar = new Set<string>((Array.isArray(req.body?.confirmar) ? req.body.confirmar : []).map(String));
    const baixasLinhas = mapaMotivos(req.body?.baixasLinhas);
    const baixasPedidos = mapaMotivos(req.body?.baixasPedidos);
    const opcoes = opcoesDe(req.body);
    // Linhas com baixa saem da análise (são registradas com o motivo)
    opcoes.ignorar = [...new Set([...(opcoes.ignorar || []), ...[...baixasLinhas.keys()].map(Number)])];
    const arquivo = String(req.body?.arquivo || "planilha").slice(0, 160);
    const conciliacaoId = `conc-${Date.now()}`;
    const agora = new Date().toISOString();
    try {
      let registro: any = null;
      await d.mutateStore((current) => {
        const next = { ...(current || {}) };
        const todos = Array.isArray(next.representativeOrders) ? [...next.representativeOrders] : [];
        const linhas = comPendentes(next, companyId, linhasCliente, opcoes.representadaId || "");
        // Análise refeita no servidor sobre os pedidos gravados agora (não confia no resultado do navegador)
        const resultado = analisarConciliacao(daEmpresa(todos, companyId), daEmpresa(next.representedCompanies, companyId), linhas, opcoes);
        const aplicados: any[] = [];
        const confirmados = new Set<string>();
        for (const p of resultado.pedidos) {
          if (!confirmar.has(p.id) || p.linhas.length === 0 || baixasPedidos.has(p.id)) continue;
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
          confirmados.add(p.id);
          aplicados.push({ id: p.id, numero: p.numero, cliente: p.cliente, representada: p.representada, valor: p.valor, faturado: p.faturado, diferenca: p.diferenca, status: p.statusValores, metodo: p.metodo, numerosNovos: p.numerosNovos, notas: p.notas, avisos: p.avisos });
        }

        // Baixa manual de pedidos (com motivo): saem das próximas conciliações
        const baixados: any[] = [];
        for (const [id, motivo] of baixasPedidos) {
          const idx = todos.findIndex((o: any) => o && o.id === id && (o.companyId || "comp-1") === companyId);
          if (idx < 0) continue;
          const prev = todos[idx];
          todos[idx] = { ...prev, reconciliationStatus: "BAIXA_MANUAL", manualClose: { motivo, por: actor, em: agora, conciliacaoId, statusAnterior: prev.reconciliationStatus || "" }, updatedAt: agora, _rev: d.nextRev() };
          baixados.push({ id, numero: prev.orderNumber || id, cliente: prev.clientName || "", valor: Number(prev.totalOrderAmount) || 0, motivo });
        }

        // Linhas: conciliadas fecham a pendência; baixadas registram o motivo; o resto fica pendente
        const pendentes = Array.isArray(next.representativePendingLines) ? [...next.representativePendingLines] : [];
        const idxPend = new Map<string, number>(pendentes.map((p: any, i: number) => [String(p?.id), i]));
        const salvarPend = (l: any, campos: any) => {
          const { pendenteId, pendenteDesde, pendenteArquivo, pedidoId, pedidoNumero, metodo, status, linha, ...dados } = l;
          const i = pendenteId ? idxPend.get(String(pendenteId)) : undefined;
          if (i !== undefined) { pendentes[i] = { ...pendentes[i], ...campos, updatedAt: agora, _rev: d.nextRev() }; return; }
          if (campos.status === "conciliada") return; // linha nova conciliada: fica registrada só no pedido
          const novo = { id: `pend-${Date.now()}-${pendentes.length}`, companyId, representadaId: opcoes.representadaId || "", linha: dados, origem: { conciliacaoId, arquivo, em: agora }, createdAt: agora, createdBy: actor, ...campos, _rev: d.nextRev() };
          idxPend.set(novo.id, pendentes.length);
          pendentes.push(novo);
        };
        let novasPendencias = 0, linhasBaixadas = 0;
        const linhaPorNumero = new Map<number, LinhaPlanilha>(linhas.map((l) => [l.linha, l]));
        for (const [num, motivo] of baixasLinhas) {
          const l = linhaPorNumero.get(Number(num));
          if (!l) continue;
          salvarPend(l, { status: "baixada", motivoBaixa: motivo, baixadoPor: actor, baixadoEm: agora });
          linhasBaixadas++;
        }
        for (const l of resultado.linhas) {
          if (baixasLinhas.has(String(l.linha))) continue;
          if (l.pedidoId && confirmados.has(l.pedidoId)) {
            salvarPend(l, { status: "conciliada", pedidoId: l.pedidoId, conciliadaEm: agora, conciliacaoId });
          } else if (!l.pendenteId) {
            salvarPend(l, { status: "aberta", pedidoSugeridoId: l.pedidoId || "" });
            novasPendencias++;
          }
        }
        if (aplicados.length === 0 && baixados.length === 0 && linhasBaixadas === 0 && novasPendencias === 0) return current;
        // Mantém todas as abertas e as fechadas mais recentes (limite de tamanho)
        const outras = pendentes.filter((p: any) => (p.companyId || "comp-1") !== companyId);
        const minhas = pendentes.filter((p: any) => (p.companyId || "comp-1") === companyId);
        const abertas = minhas.filter((p: any) => p.status === "aberta");
        const fechadas = minhas.filter((p: any) => p.status !== "aberta").slice(-Math.max(0, MAX_PENDENTES - abertas.length));
        next.representativePendingLines = [...outras, ...abertas, ...fechadas];
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
          resumo: { ...r, confirmados: aplicados.length, valorConfirmado: aplicados.reduce((s, a) => s + a.faturado, 0), pedidosBaixados: baixados.length, linhasBaixadas, novasPendencias },
          pedidos: aplicados,
          baixas: { pedidos: baixados, linhas: [...baixasLinhas].map(([num, motivo]) => ({ ...(linhaPorNumero.get(Number(num)) || {}), motivo })) },
          pendentes: resultado.pedidos.filter((p) => !confirmados.has(p.id) && !baixasPedidos.has(p.id)).map((p) => ({ id: p.id, numero: p.numero, cliente: p.cliente, valor: p.valor, status: p.status })),
          linhasSemPedido: resultado.linhas.filter((l) => l.status === "sem_pedido" && !baixasLinhas.has(String(l.linha))).slice(0, 500),
        };
        const historico = daEmpresa(next.representativeReconciliations, companyId);
        const outrasH = (Array.isArray(next.representativeReconciliations) ? next.representativeReconciliations : []).filter((h: any) => h && (h.companyId || "comp-1") !== companyId);
        next.representativeReconciliations = [...outrasH, registro, ...historico].slice(0, outrasH.length + MAX_HISTORICO);
        next.history = [{
          id: `hst-rep-${Date.now()}`, date: agora, type: "representative", title: "Conciliação de pedidos da representada",
          description: `"${arquivo}": ${aplicados.length} pedido(s) conciliado(s) (R$ ${registro.resumo.valorConfirmado.toFixed(2)}), ${baixados.length} pedido(s) e ${linhasBaixadas} linha(s) baixados manualmente, ${novasPendencias} nova(s) pendência(s).`,
          userId, userName: actor, companyId, clientId: "system", vehicleId: "system",
        }, ...(Array.isArray(next.history) ? next.history : [])];
        return next;
      }, { source: "representacao_conciliacao", companyId, userId });
      if (!registro) return res.status(409).json({ success: false, error: "Nada a gravar: nenhum pedido marcado, nenhuma baixa e nenhuma pendência nova." });
      res.json({ success: true, conciliacao: { id: registro.id, resumo: registro.resumo, pedidos: registro.pedidos.length } });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar a conciliação agora. Nada foi alterado; tente novamente." });
    }
  });

  // ---- Pendências: linhas sem pedido e pedidos ainda não conciliados -----------------------
  app.get("/api/representacao/pendencias", guard("ler"), (req: any, res) => {
    const db = d.getStore() || {};
    const { companyId } = req.rep;
    const linhas = daEmpresa(db.representativePendingLines, companyId)
      .filter((p: any) => p.status === "aberta")
      .map((p: any) => ({ ...p.linha, id: p.id, desde: p.origem?.em || p.createdAt, arquivo: p.origem?.arquivo || "", pedidoSugeridoId: p.pedidoSugeridoId || "" }));
    const pedidos = daEmpresa(db.representativeOrders, companyId)
      .filter((o: any) => !/CANCEL|DIGITA|RASCUNHO|DRAFT/i.test(String(o.status || "")) && !pedidoEncerrado(o))
      .map((o: any) => ({
        id: o.id, numero: o.orderNumber || o.id, data: String(o.orderDate || "").slice(0, 10), cliente: o.clientName || "", representada: o.representedName || "",
        valor: Number(o.totalOrderAmount) || 0, faturado: Number(o.invoicedAmount) || 0,
        numerosRepresentada: Array.isArray(o.factoryOrderNumbers) ? o.factoryOrderNumbers : [],
        situacao: o.reconciliationStatus === "PARCIAL" ? "parcial" : o.reconciliationStatus === "DIVERGENTE" ? "divergente" : o.reconciliationStatus === "RECEBIDO" ? "recebido"
          : (Array.isArray(o.factoryOrderNumbers) && o.factoryOrderNumbers.length ? "recebido" : "aguardando"),
        ultimaConciliacao: o.reconciledAt || "",
      }));
    const baixadas = [
      ...daEmpresa(db.representativePendingLines, companyId).filter((p: any) => p.status === "baixada").map((p: any) => ({ tipo: "linha", id: p.id, descricao: `Linha: ped. ${p.linha?.pedidoRepresentada || "—"} · NF ${p.linha?.notaFiscal || "—"} · ${p.linha?.cliente || ""}`, valor: Number(p.linha?.valorFaturado || p.linha?.valorPedido) || 0, motivo: p.motivoBaixa, por: p.baixadoPor, em: p.baixadoEm })),
      ...daEmpresa(db.representativeOrders, companyId).filter((o: any) => o.reconciliationStatus === "BAIXA_MANUAL").map((o: any) => ({ tipo: "pedido", id: o.id, descricao: `Pedido ${o.orderNumber || o.id} · ${o.clientName || ""}`, valor: Number(o.totalOrderAmount) || 0, motivo: o.manualClose?.motivo, por: o.manualClose?.por, em: o.manualClose?.em })),
    ].sort((a, b) => String(b.em).localeCompare(String(a.em))).slice(0, 200);
    res.json({ success: true, linhas, pedidos, baixadas });
  });

  app.post("/api/representacao/pendencias/linhas/:id/baixa", guard("conciliar"), async (req: any, res) => {
    const { companyId, actor, userId } = req.rep;
    const motivo = textoMotivo(req.body?.motivo);
    if (!motivo) return res.status(400).json({ success: false, error: "Informe o motivo da baixa." });
    let ok = false;
    try {
      await d.mutateStore((current) => {
        const lista = Array.isArray(current?.representativePendingLines) ? [...current.representativePendingLines] : [];
        const i = lista.findIndex((p: any) => p && p.id === req.params.id && (p.companyId || "comp-1") === companyId && p.status === "aberta");
        if (i < 0) return current;
        ok = true;
        lista[i] = { ...lista[i], status: "baixada", motivoBaixa: motivo, baixadoPor: actor, baixadoEm: new Date().toISOString(), _rev: d.nextRev() };
        const l = lista[i].linha || {};
        const history = [{ id: `hst-rep-${Date.now()}`, date: new Date().toISOString(), type: "representative", title: "Baixa manual de linha da representada", description: `Linha sem pedido baixada (ped. ${l.pedidoRepresentada || "—"}, NF ${l.notaFiscal || "—"}). Motivo: ${motivo}`, userId, userName: actor, companyId, clientId: "system", vehicleId: "system" }, ...(Array.isArray(current.history) ? current.history : [])];
        return { ...current, representativePendingLines: lista, history };
      }, { source: "representacao_baixa", companyId, userId });
      if (!ok) return res.status(404).json({ success: false, error: "Pendência não encontrada ou já resolvida." });
      res.json({ success: true });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar agora. Tente novamente." });
    }
  });

  const alterarBaixaPedido = (reabrir: boolean) => async (req: any, res: any) => {
    const { companyId, actor, userId } = req.rep;
    const motivo = textoMotivo(req.body?.motivo);
    if (!motivo) return res.status(400).json({ success: false, error: reabrir ? "Informe o motivo da reabertura." : "Informe o motivo da baixa." });
    let ok = false;
    try {
      await d.mutateStore((current) => {
        const lista = Array.isArray(current?.representativeOrders) ? [...current.representativeOrders] : [];
        const i = lista.findIndex((o: any) => o && o.id === req.params.id && (o.companyId || "comp-1") === companyId);
        if (i < 0) return current;
        const prev = lista[i];
        if (reabrir ? prev.reconciliationStatus !== "BAIXA_MANUAL" : prev.reconciliationStatus === "BAIXA_MANUAL") return current;
        ok = true;
        const agora = new Date().toISOString();
        lista[i] = reabrir
          ? { ...prev, reconciliationStatus: prev.manualClose?.statusAnterior || "", manualClose: { ...prev.manualClose, reabertoEm: agora, reabertoPor: actor, motivoReabertura: motivo }, _rev: d.nextRev() }
          : { ...prev, reconciliationStatus: "BAIXA_MANUAL", manualClose: { motivo, por: actor, em: agora, statusAnterior: prev.reconciliationStatus || "" }, _rev: d.nextRev() };
        const history = [{ id: `hst-rep-${Date.now()}`, date: agora, type: "representative", title: reabrir ? "Pedido reaberto na conciliação" : "Baixa manual de pedido na conciliação", description: `Pedido ${prev.orderNumber || prev.id}. Motivo: ${motivo}`, userId, userName: actor, companyId, clientId: "system", vehicleId: "system" }, ...(Array.isArray(current.history) ? current.history : [])];
        return { ...current, representativeOrders: lista, history };
      }, { source: "representacao_baixa", companyId, userId });
      if (!ok) return res.status(404).json({ success: false, error: reabrir ? "O pedido não está baixado." : "Pedido não encontrado ou já baixado." });
      res.json({ success: true });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar agora. Tente novamente." });
    }
  };
  app.post("/api/representacao/pedidos/:id/baixa", guard("conciliar"), alterarBaixaPedido(false));
  app.post("/api/representacao/pedidos/:id/reabrir", guard("conciliar"), alterarBaixaPedido(true));

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
