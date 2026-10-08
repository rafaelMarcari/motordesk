/**
 * Transações (/api/financeiro): visão única de recebimentos, despesas e transferências, no estilo
 * "lançamentos do mês". Lê os títulos que já existem (Contas a Receber / Contas a Pagar, inclusive os
 * antigos com parcelas internas, gerados por OS e vendas) e grava no mesmo formato das telas atuais,
 * para que o que for lançado aqui apareça lá e vice-versa.
 *
 * GET  /transacoes?mes=AAAA-MM&conta=ID|todas   lançamentos do mês, resumo, saldos, gráfico e calendário
 * POST /transacoes                              novo recebimento/despesa (única, parcelada, fixa ou recorrente)
 * PUT  /transacoes/:id                          altera um lançamento (os de parcelas internas não)
 * POST /transacoes/pagamento                    marca/desmarca como pago (um ou vários)
 * POST /transacoes/excluir                      exclui (cancela) um ou vários; recorrentes: esta ou esta e as próximas
 * POST /transferencias                          transferência entre contas
 * POST /transferencias/:id/excluir
 * POST /contas-bancarias, PUT /contas-bancarias/:id
 */
import type { Express } from "express";
import { somarMeses } from "./recorrencias.ts";

export type Natureza = "receber" | "pagar";
export type Need = "ler" | "criar" | "baixar" | "excluir" | "contas";

export interface TransacoesDeps {
  getStore: () => any;
  mutateStore: (fn: (current: any) => any, meta: { source: string; companyId?: string; userId?: string }) => Promise<any>;
  nextRev: () => number;
  /** natureza null = leitura geral (recebimentos e/ou despesas que o usuário pode ver) */
  access: (req: any, need: Need, natureza: Natureza | null) =>
    | { companyId: string; actor: string; userId: string; ver: Record<Natureza, boolean>; pode: (need: Need, natureza: Natureza) => boolean }
    | { status: number; error: string };
}

const COL: Record<Natureza, string> = { receber: "accountsReceivable", pagar: "accountsPayable" };
const PREFIXO: Record<Natureza, string> = { receber: "R", pagar: "P" };
const SEP = "~";
const hojeISO = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); // Brasília
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (v: number) => Math.round(v * 100) / 100;
const dia = (v: any) => { const s = String(v || ""); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ""; };
const texto = (v: any, max = 200) => String(v ?? "").trim().slice(0, max);
const cancelado = (s: any) => /^(cancel|canceled|cancelled|cancelado|estornado|removed)$/i.test(String(s || ""));
const PAGO = /^(paid|received|settled|pago|recebido|liquidado)$/i;
const daEmpresa = (r: any, companyId: string) => r && (r.companyId || "comp-1") === companyId;
const principalId = (companyId: string) => `cb-principal-${companyId}`;

// ---------------------------------------------------------------------------
// Contas bancárias
// ---------------------------------------------------------------------------
export function contasDaEmpresa(store: any, companyId: string): any[] {
  const proprias = (Array.isArray(store?.bankAccounts) ? store.bankAccounts : []).filter((c: any) => daEmpresa(c, companyId) && c.ativo !== false);
  const pid = principalId(companyId);
  const lista = proprias.some((c: any) => c.id === pid)
    ? proprias
    : [{ id: pid, companyId, nome: "Conta Principal", tipo: "corrente", saldoInicial: 0, dataSaldoInicial: "", principal: true }, ...proprias];
  return lista.map((c: any) => ({ ...c, principal: c.id === pid }));
}

// ---------------------------------------------------------------------------
// Normalização dos títulos em transações
// ---------------------------------------------------------------------------
function tipoPagamento(r: any, inst: any, idx: number, total: number): string {
  const rec = r?.recurrence;
  if (rec?.tipo === "PARCELADA") return `Parcelado ${rec.indice}/${rec.total}`;
  if (rec?.tipo === "FIXA_MENSAL") return `Fixo ${rec.indice}/${rec.total}`;
  if (rec?.tipo === "FIXA_INDETERMINADA") return "Recorrente";
  if (rec?.tipo === "VARIAVEL_MENSAL") return "Recorrente (variável)";
  if (inst && total > 1) return `Parcelado ${inst.installmentNumber || idx + 1}/${inst.totalInstallments || total}`;
  return "Único";
}

export function transacoesDe(store: any, companyId: string, natureza: Natureza): any[] {
  const out: any[] = [];
  const pid = principalId(companyId);
  for (const r of Array.isArray(store?.[COL[natureza]]) ? store[COL[natureza]] : []) {
    if (!daEmpresa(r, companyId) || cancelado(r.status)) continue;
    const contato = natureza === "receber"
      ? (r.clientName || r.customerName || r.client || "")
      : (r.supplierName || r.supplier || r.vendorName || "");
    const contatoId = natureza === "receber" ? (r.clientId || "") : (r.supplierId || "");
    const descricaoBase = r.description || r.title || r.accountTypeName || r.category || (natureza === "receber" ? "Recebimento" : "Despesa");
    const categoria = r.category || r.accountTypeName || "Sem categoria";
    const insts = Array.isArray(r.installments) && r.installments.length > 0 ? r.installments : null;
    const base = (fonte: any, valor: number, extra: any) => {
      const valorPago = Math.min(valor, num(fonte.paidAmount));
      const pago = PAGO.test(String(fonte.status || "")) || (valor > 0 && valorPago >= valor - 0.005);
      const data = dia(fonte.dueDate) || dia(r.dueDate) || dia(r.date) || dia(r.createdAt);
      return {
        natureza,
        tipo: natureza === "receber" ? "receita" : "despesa",
        recordId: r.id,
        data,
        competencia: dia(r.emissionDate) || dia(r.date) || data,
        descricao: descricaoBase,
        contato,
        contatoId,
        categoria,
        valor: r2(valor),
        valorPago: r2(pago ? valor : valorPago),
        pago,
        parcial: !pago && valorPago > 0,
        dataPagamento: pago || valorPago > 0 ? (dia(fonte.paymentDate) || dia(fonte.settlementDate) || dia(fonte.paidAt) || dia(r.paymentDate) || data) : "",
        modo: fonte.paymentMethod || r.paymentMethod || "",
        contaId: fonte.bankAccountId || r.bankAccountId || pid,
        grupo: r.recurrence?.groupId || "",
        observacao: r.notes && r.notes !== descricaoBase ? r.notes : "",
        ...extra,
      };
    };
    if (insts) {
      insts.forEach((inst: any, i: number) => {
        if (!inst || cancelado(inst.status)) return;
        const instId = inst.id || `#${i}`;
        out.push(base(inst, num(inst.amount), {
          id: [PREFIXO[natureza], r.id, instId].join(SEP),
          installmentId: instId,
          descricao: insts.length > 1 ? `${descricaoBase} (${inst.installmentNumber || i + 1}/${inst.totalInstallments || insts.length})` : descricaoBase,
          tipoPagamento: tipoPagamento(r, inst, i, insts.length),
          editavel: false,
        }));
      });
    } else {
      out.push(base(r, num(r.amount ?? r.totalAmount ?? r.value), {
        id: [PREFIXO[natureza], r.id].join(SEP),
        installmentId: "",
        tipoPagamento: tipoPagamento(r, null, 0, 1),
        editavel: true,
      }));
    }
  }
  return out;
}

function transferenciasDe(store: any, companyId: string): any[] {
  return (Array.isArray(store?.bankTransfers) ? store.bankTransfers : [])
    .filter((t: any) => daEmpresa(t, companyId) && !cancelado(t.status))
    .map((t: any) => ({ id: "T" + SEP + t.id, recordId: t.id, tipo: "transferencia", data: dia(t.data), valor: r2(num(t.valor)), deContaId: t.deContaId, paraContaId: t.paraContaId, descricao: t.descricao || "Transferência entre contas" }));
}

// Efeito de uma transação no saldo de uma conta (ou de todas, conta = "")
function efeitoRealizado(t: any, conta: string): number {
  if (t.tipo === "transferencia") {
    if (!conta) return 0;
    return (t.paraContaId === conta ? t.valor : 0) - (t.deContaId === conta ? t.valor : 0);
  }
  if (conta && t.contaId !== conta) return 0;
  const v = t.pago ? t.valor : t.valorPago;
  return t.tipo === "receita" ? v : -v;
}
function efeitoPendente(t: any, conta: string): number {
  if (t.tipo === "transferencia" || t.pago) return 0;
  if (conta && t.contaId !== conta) return 0;
  const v = t.valor - t.valorPago;
  return t.tipo === "receita" ? v : -v;
}

export function montarVisao(store: any, companyId: string, mes: string, conta: string, ver: Record<Natureza, boolean>) {
  const hoje = hojeISO();
  const contas = contasDaEmpresa(store, companyId);
  const contaSel = conta && contas.some((c) => c.id === conta) ? conta : "";
  const todas = [
    ...(ver.receber ? transacoesDe(store, companyId, "receber") : []),
    ...(ver.pagar ? transacoesDe(store, companyId, "pagar") : []),
  ];
  const transf = transferenciasDe(store, companyId);
  const ini = `${mes}-01`;
  const fim = somarMeses(ini, 1).slice(0, 8) + "01";
  const ultimoDia = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
  const fimMes = `${mes}-${String(ultimoDia).padStart(2, "0")}`;

  const saldoAte = (contaId: string, limite: string, incluirLimite = true) => {
    const ok = (d: string) => d && (incluirLimite ? d <= limite : d < limite);
    let s = contas.filter((c) => !contaId || c.id === contaId).reduce((a, c) => a + num(c.saldoInicial), 0);
    for (const t of todas) if (ok(t.dataPagamento)) s += efeitoRealizado(t, contaId);
    for (const t of transf) if (ok(t.data)) s += efeitoRealizado(t, contaId);
    return r2(s);
  };
  const previsaoAte = (contaId: string, limite: string) => {
    let s = saldoAte(contaId, hoje);
    for (const t of todas) if (t.data <= limite) s += efeitoPendente(t, contaId);
    for (const t of transf) if (t.data > hoje && t.data <= limite) s += efeitoRealizado(t, contaId);
    return r2(s);
  };
  const contasOut = contas.map((c) => ({ ...c, saldoAtual: saldoAte(c.id, hoje), previsaoMes: previsaoAte(c.id, fimMes) }));

  const doMes = todas.filter((t) => t.data >= ini && t.data < fim && (!contaSel || t.contaId === contaSel)).sort((a, b) => a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao));
  const transfMes = transf.filter((t) => t.data >= ini && t.data < fim && (!contaSel || t.deContaId === contaSel || t.paraContaId === contaSel));
  const soma = (lista: any[], campo: "valor" | "valorPago") => r2(lista.reduce((a, t) => a + t[campo], 0));
  const rec = doMes.filter((t) => t.tipo === "receita");
  const des = doMes.filter((t) => t.tipo === "despesa");
  const resumo = {
    receitas: { previsto: soma(rec, "valor"), realizado: soma(rec, "valorPago") },
    despesas: { previsto: soma(des, "valor"), realizado: soma(des, "valorPago") },
  };

  // Saldo projetado dia a dia no mês (pagos pela data de pagamento, pendentes pelo vencimento)
  const serie: Array<{ dia: string; saldo: number }> = [];
  let saldo = saldoAte(contaSel, ini, false);
  const fluxoDia = new Map<string, number>();
  const somaDia = (d: string, v: number) => { if (d >= ini && d < fim) fluxoDia.set(d, (fluxoDia.get(d) || 0) + v); };
  for (const t of todas) {
    if (t.dataPagamento) somaDia(t.dataPagamento, efeitoRealizado(t, contaSel));
    if (!t.pago) somaDia(t.data, efeitoPendente(t, contaSel));
  }
  for (const t of transf) somaDia(t.data, efeitoRealizado(t, contaSel));
  for (let d = 1; d <= ultimoDia; d++) {
    const k = `${mes}-${String(d).padStart(2, "0")}`;
    saldo += fluxoDia.get(k) || 0;
    serie.push({ dia: k, saldo: r2(saldo) });
  }

  const calendario: Record<string, { receitas: number; despesas: number; transferencias: number }> = {};
  const marca = (d: string, campo: "receitas" | "despesas" | "transferencias") => { (calendario[d] ||= { receitas: 0, despesas: 0, transferencias: 0 })[campo]++; };
  for (const t of doMes) marca(t.data, t.tipo === "receita" ? "receitas" : "despesas");
  for (const t of transfMes) marca(t.data, "transferencias");

  // Top 5 gastos (por categoria) do mês anterior
  const iniAnt = somarMeses(ini, -1).slice(0, 8) + "01";
  const porCat = new Map<string, number>();
  for (const t of todas) if (t.tipo === "despesa" && t.data >= iniAnt && t.data < ini && (!contaSel || t.contaId === contaSel)) porCat.set(t.categoria, (porCat.get(t.categoria) || 0) + t.valor);
  const topGastos = [...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([categoria, valor]) => ({ categoria, valor: r2(valor) }));

  // Opções dos formulários
  const cats = (nat: Natureza) => [...new Set(todas.filter((t) => t.natureza === nat).map((t) => t.categoria).filter((c) => c && c !== "Sem categoria"))].sort();
  const contatos = (nat: Natureza) => {
    const lista = nat === "receber" ? store?.clients : store?.suppliers;
    const nomes = new Map<string, any>();
    for (const c of Array.isArray(lista) ? lista : []) if (daEmpresa(c, companyId) && (c.name || c.companyName || c.tradeName)) nomes.set(String(c.name || c.companyName || c.tradeName), { id: c.id, nome: String(c.name || c.companyName || c.tradeName) });
    for (const t of todas) if (t.natureza === nat && t.contato && !nomes.has(t.contato)) nomes.set(t.contato, { id: t.contatoId || "", nome: t.contato });
    return [...nomes.values()].sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, 2000);
  };
  const modos = [...new Set([
    ...(Array.isArray(store?.paymentMethods) ? store.paymentMethods : []).filter((m: any) => daEmpresa(m, companyId) && m.active !== false).map((m: any) => m.name),
    "PIX", "Dinheiro", "Boleto", "Cartão de crédito", "Cartão de débito", "Transferência bancária",
  ].filter(Boolean))];

  return {
    mes, hoje, contaId: contaSel, contas: contasOut,
    transacoes: doMes, transferencias: transfMes, resumo, serie, calendario, topGastos,
    opcoes: { categorias: { receber: cats("receber"), pagar: cats("pagar") }, contatos: { receber: ver.receber ? contatos("receber") : [], pagar: ver.pagar ? contatos("pagar") : [] }, modos },
  };
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------
const naturezaDoId = (id: string): Natureza | null => (id.startsWith("R" + SEP) ? "receber" : id.startsWith("P" + SEP) ? "pagar" : null);
const naturezaDoTipo = (v: any): Natureza | null => (/^(receita|recebimento|receber)$/i.test(String(v)) ? "receber" : /^(despesa|pagar|pagamento)$/i.test(String(v)) ? "pagar" : null);

function localizar(current: any, id: string, companyId: string) {
  const natureza = naturezaDoId(id);
  if (!natureza) return null;
  const [, recordId, instId] = id.split(SEP);
  const lista = Array.isArray(current?.[COL[natureza]]) ? current[COL[natureza]] : [];
  const idx = lista.findIndex((r: any) => r && r.id === recordId && daEmpresa(r, companyId));
  if (idx < 0) return null;
  return { natureza, recordId, instId: instId || "", idx, registro: lista[idx] };
}

function historico(current: any, companyId: string, userId: string, actor: string, title: string, description: string) {
  const h = { id: `hst-trx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: new Date().toISOString(), type: "financial", title, description, userId, userName: actor, companyId, clientId: "system", vehicleId: "system" };
  return [h, ...(Array.isArray(current.history) ? current.history : [])];
}

export function registerTransacoesRoutes(app: Express, d: TransacoesDeps) {
  const ctx = (req: any, res: any, need: Need, natureza: Natureza | null) => {
    const r = d.access(req, need, natureza);
    if ("status" in r) { res.status(r.status).json({ success: false, error: r.error }); return null; }
    return r;
  };
  const falha = (res: any, err: any) => res.status(err?.httpStatus || 503).json({ success: false, error: err?.httpStatus ? err.message : "Não foi possível gravar agora. Tente novamente." });
  const erro = (msg: string, status = 400) => Object.assign(new Error(msg), { httpStatus: status });

  app.get("/api/financeiro/transacoes", (req: any, res) => {
    const c = ctx(req, res, "ler", null);
    if (!c) return;
    const mes = /^\d{4}-\d{2}$/.test(String(req.query?.mes || "")) ? String(req.query.mes) : hojeISO().slice(0, 7);
    const visao = montarVisao(d.getStore(), c.companyId, mes, String(req.query?.conta || ""), c.ver);
    res.json({
      success: true, ...visao,
      permissoes: {
        receber: { ver: c.ver.receber, criar: c.pode("criar", "receber"), baixar: c.pode("baixar", "receber"), excluir: c.pode("excluir", "receber") },
        pagar: { ver: c.ver.pagar, criar: c.pode("criar", "pagar"), baixar: c.pode("baixar", "pagar"), excluir: c.pode("excluir", "pagar") },
        contas: c.pode("contas", "pagar"),
      },
    });
  });

  // Novo recebimento / despesa
  app.post("/api/financeiro/transacoes", async (req: any, res) => {
    const b = req.body || {};
    const natureza = naturezaDoTipo(b.tipo);
    if (!natureza) return res.status(400).json({ success: false, error: "Informe se é recebimento ou despesa." });
    const c = ctx(req, res, "criar", natureza);
    if (!c) return;
    const valor = r2(num(b.valor));
    const data = dia(b.data);
    const descricao = texto(b.descricao, 200);
    if (!descricao) return res.status(400).json({ success: false, error: "Informe a descrição." });
    if (!(valor > 0)) return res.status(400).json({ success: false, error: "Informe um valor maior que zero." });
    if (!data) return res.status(400).json({ success: false, error: "Informe a data." });
    const pago = Boolean(b.pago);
    if (pago && !c.pode("baixar", natureza)) return res.status(403).json({ success: false, error: "Seu usuário não pode registrar pagamentos." });
    const rep = String(b.repeticao?.tipo || "UNICA");
    const vezes = Math.round(num(b.repeticao?.vezes));
    if (rep === "PARCELADA" && (vezes < 2 || vezes > 120)) return res.status(400).json({ success: false, error: "Parcelado: informe de 2 a 120 parcelas." });
    if (rep === "FIXA_MENSAL" && (vezes < 1 || vezes > 120)) return res.status(400).json({ success: false, error: "Fixo: informe de 1 a 120 meses." });
    const contato = texto(b.contato?.nome, 120);
    const contatoId = texto(b.contato?.id, 80);
    const categoria = texto(b.categoria, 80) || "Outros";
    const modo = texto(b.modo, 60);
    const dataPagamento = dia(b.dataPagamento) || data;
    const observacao = texto(b.observacao, 500);
    let criados: any[] = [];
    try {
      await d.mutateStore((current) => {
        const contas = contasDaEmpresa(current, c.companyId);
        const contaId = contas.some((x) => x.id === b.contaId) ? String(b.contaId) : principalId(c.companyId);
        const base = Date.now();
        const grupo = `trx-${base.toString(36)}`;
        const diaVenc = Number(data.slice(8, 10));
        const pre = natureza === "receber" ? "rec" : "pay";
        const montar = (i: number, venc: string, amt: number, parcela: string, recurrence: any) => {
          const v = r2(amt);
          const reg: any = {
            id: `${pre}-${base}-${i}`, companyId: c.companyId,
            ...(natureza === "receber" ? { clientName: contato || "Cliente não informado", clientId: contatoId || "" } : { supplierName: contato || "Fornecedor não informado", supplierId: contatoId || "" }),
            category: categoria, description: descricao, notes: observacao || undefined,
            amount: v, remainingAmount: v, paidAmount: 0, dueDate: venc, date: data, emissionDate: data,
            status: "pending", installment: parcela, expenseType: rep === "UNICA" ? "VARIAVEL" : rep,
            paymentMethod: modo || undefined, bankAccountId: contaId, origem: "transacoes",
            createdAt: new Date().toISOString(), createdBy: c.actor, _rev: d.nextRev(),
            ...(recurrence ? { recurrence } : {}),
          };
          return reg;
        };
        let novos: any[] = [];
        if (rep === "PARCELADA") {
          const parte = Math.floor((valor / vezes) * 100) / 100;
          novos = Array.from({ length: vezes }, (_, i) => montar(i, somarMeses(data, i, diaVenc), i === vezes - 1 ? valor - parte * (vezes - 1) : parte, `${String(i + 1).padStart(2, "0")}/${String(vezes).padStart(2, "0")}`, { groupId: grupo, tipo: rep, indice: i + 1, total: vezes }));
        } else if (rep === "FIXA_MENSAL") {
          novos = Array.from({ length: vezes }, (_, i) => montar(i, somarMeses(data, i, diaVenc), valor, `${String(i + 1).padStart(2, "0")}/${String(vezes).padStart(2, "0")}`, { groupId: grupo, tipo: rep, indice: i + 1, total: vezes, fim: somarMeses(data, vezes - 1, diaVenc), diaVencimento: diaVenc, valorBase: valor }));
        } else if (rep === "FIXA_INDETERMINADA" || rep === "VARIAVEL_MENSAL") {
          novos = Array.from({ length: 12 }, (_, i) => montar(i, somarMeses(data, i, diaVenc), valor, `Mês ${i + 1}`, { groupId: grupo, tipo: rep, indice: i + 1, total: null, ativo: true, diaVencimento: diaVenc, valorBase: valor, valorEstimado: rep === "VARIAVEL_MENSAL" }));
        } else {
          novos = [montar(0, data, valor, "01/01", null)];
        }
        const extras: any = {};
        if (pago) {
          const p = novos[0];
          Object.assign(p, { status: "paid", paidAmount: p.amount, remainingAmount: 0, paymentDate: dataPagamento });
          extras.financialTransactions = [...(Array.isArray(current.financialTransactions) ? current.financialTransactions : []), movimento(natureza, p, null, p.amount, dataPagamento, modo, contaId, c, d, false)];
        }
        criados = novos;
        const total = r2(novos.reduce((a, x) => a + x.amount, 0));
        return {
          ...current,
          ...extras,
          [COL[natureza]]: [...novos, ...(Array.isArray(current[COL[natureza]]) ? current[COL[natureza]] : [])],
          history: historico(current, c.companyId, c.userId, c.actor, natureza === "receber" ? "Recebimento lançado" : "Despesa lançada", `${descricao} — ${novos.length > 1 ? novos.length + " lançamentos, total " : ""}R$ ${total.toFixed(2)} (${categoria}).`),
        };
      }, { source: "transacoes_criar", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, criados: criados.length, ids: criados.map((x) => PREFIXO[natureza] + SEP + x.id) });
    } catch (err: any) { falha(res, err); }
  });

  // Alterar um lançamento (só os de um vencimento por registro)
  app.put("/api/financeiro/transacoes/:id", async (req: any, res) => {
    const id = String(req.params.id || "");
    const natureza = naturezaDoId(id);
    if (!natureza) return res.status(400).json({ success: false, error: "Lançamento inválido." });
    const c = ctx(req, res, "criar", natureza);
    if (!c) return;
    const b = req.body || {};
    try {
      await d.mutateStore((current) => {
        const l = localizar(current, id, c.companyId);
        if (!l || cancelado(l.registro.status)) throw erro("Lançamento não encontrado.", 404);
        if (l.instId || (Array.isArray(l.registro.installments) && l.registro.installments.length)) throw erro("Este lançamento veio de uma OS/venda com parcelas; altere-o pela tela de origem.");
        const r = { ...l.registro };
        const pagoAgora = PAGO.test(String(r.status)) || num(r.paidAmount) > 0;
        if (b.descricao !== undefined) { const v = texto(b.descricao, 200); if (!v) throw erro("Informe a descrição."); r.description = v; }
        if (b.valor !== undefined) {
          const v = r2(num(b.valor));
          if (!(v > 0)) throw erro("Informe um valor maior que zero.");
          if (pagoAgora && v !== r2(num(r.amount ?? r.totalAmount))) throw erro("Desmarque o pagamento antes de alterar o valor.");
          r.amount = v; if (r.totalAmount !== undefined) r.totalAmount = v; r.remainingAmount = r2(v - num(r.paidAmount));
        }
        if (b.data !== undefined) { const v = dia(b.data); if (!v) throw erro("Informe a data."); r.dueDate = v; }
        if (b.categoria !== undefined) r.category = texto(b.categoria, 80) || r.category;
        if (b.modo !== undefined) r.paymentMethod = texto(b.modo, 60) || undefined;
        if (b.observacao !== undefined) r.notes = texto(b.observacao, 500) || undefined;
        if (b.contaId !== undefined && contasDaEmpresa(current, c.companyId).some((x) => x.id === b.contaId)) r.bankAccountId = b.contaId;
        if (b.contato !== undefined) {
          const nome = texto(b.contato?.nome, 120); const cid = texto(b.contato?.id, 80);
          if (natureza === "receber") { r.clientName = nome || r.clientName; r.clientId = cid || r.clientId; } else { r.supplierName = nome || r.supplierName; r.supplierId = cid || r.supplierId; }
        }
        r.updatedAt = new Date().toISOString(); r._rev = d.nextRev();
        const lista = [...current[COL[natureza]]]; lista[l.idx] = r;
        return { ...current, [COL[natureza]]: lista };
      }, { source: "transacoes_alterar", companyId: c.companyId, userId: c.userId });
      res.json({ success: true });
    } catch (err: any) { falha(res, err); }
  });

  // Marcar / desmarcar como pago (um ou vários)
  app.post("/api/financeiro/transacoes/pagamento", async (req: any, res) => {
    const b = req.body || {};
    const ids: string[] = (Array.isArray(b.ids) ? b.ids : []).map(String).slice(0, 500);
    if (!ids.length) return res.status(400).json({ success: false, error: "Nenhum lançamento selecionado." });
    const naturezas = [...new Set(ids.map(naturezaDoId))];
    if (naturezas.includes(null)) return res.status(400).json({ success: false, error: "Lançamento inválido." });
    let c: any = null;
    for (const n of naturezas as Natureza[]) { c = ctx(req, res, "baixar", n); if (!c) return; }
    const pago = b.pago !== false;
    const data = dia(b.data) || hojeISO();
    const modo = texto(b.modo, 60);
    let alterados = 0;
    try {
      await d.mutateStore((current) => {
        const next: any = { ...current, accountsReceivable: [...(current.accountsReceivable || [])], accountsPayable: [...(current.accountsPayable || [])] };
        const movs: any[] = [];
        const contas = contasDaEmpresa(current, c.companyId);
        const contaPedida = contas.some((x) => x.id === b.contaId) ? String(b.contaId) : "";
        for (const id of ids) {
          const l = localizar(next, id, c.companyId);
          if (!l || cancelado(l.registro.status)) continue;
          const r = { ...l.registro };
          const contaId = contaPedida || r.bankAccountId || principalId(c.companyId);
          if (l.instId) {
            const insts = [...(r.installments || [])];
            const i = insts.findIndex((x: any, k: number) => (x?.id || `#${k}`) === l.instId);
            if (i < 0) continue;
            const inst = { ...insts[i] };
            const valor = num(inst.amount);
            const jaPago = PAGO.test(String(inst.status)) || num(inst.paidAmount) >= valor - 0.005;
            if (jaPago === pago) continue;
            const efetivo = pago ? valor - num(inst.paidAmount) : num(inst.paidAmount);
            Object.assign(inst, pago
              ? { status: "paid", paidAmount: valor, paymentDate: data, paymentMethod: modo || inst.paymentMethod, bankAccountId: contaId }
              : { status: "pending", paidAmount: 0, paymentDate: undefined, bankAccountId: inst.bankAccountId });
            insts[i] = inst;
            const total = insts.reduce((a: number, x: any) => a + num(x?.amount), 0);
            const pagoTotal = insts.reduce((a: number, x: any) => a + num(x?.paidAmount), 0);
            Object.assign(r, { installments: insts, paidAmount: r2(pagoTotal), remainingAmount: r2(total - pagoTotal), status: pagoTotal >= total - 0.005 ? "paid" : pagoTotal > 0 ? "partially_paid" : "pending" });
            movs.push(movimento(l.natureza, r, inst, r2(efetivo), pago ? data : hojeISO(), modo || inst.paymentMethod, contaId, c, d, !pago));
          } else {
            const valor = num(r.amount ?? r.totalAmount);
            const jaPago = PAGO.test(String(r.status)) || num(r.paidAmount) >= valor - 0.005;
            if (jaPago === pago) continue;
            const efetivo = pago ? valor - num(r.paidAmount) : num(r.paidAmount);
            Object.assign(r, pago
              ? { status: "paid", paidAmount: valor, remainingAmount: 0, paymentDate: data, paymentMethod: modo || r.paymentMethod, bankAccountId: contaId }
              : { status: "pending", paidAmount: 0, remainingAmount: valor, paymentDate: undefined, settlementDate: undefined });
            movs.push(movimento(l.natureza, r, null, r2(efetivo), pago ? data : hojeISO(), modo || r.paymentMethod, contaId, c, d, !pago));
          }
          r.updatedAt = new Date().toISOString(); r._rev = d.nextRev();
          next[COL[l.natureza]][l.idx] = r;
          alterados++;
        }
        if (!alterados) return current;
        next.financialTransactions = [...(Array.isArray(current.financialTransactions) ? current.financialTransactions : []), ...movs];
        next.history = historico(current, c.companyId, c.userId, c.actor, pago ? "Lançamentos marcados como pagos" : "Pagamento desfeito", `${alterados} lançamento(s) ${pago ? "marcados como pagos em " + data : "voltaram para não pagos"}.`);
        return next;
      }, { source: pago ? "transacoes_pagar" : "transacoes_estornar", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, alterados });
    } catch (err: any) { falha(res, err); }
  });

  // Excluir (cancelar) lançamentos
  app.post("/api/financeiro/transacoes/excluir", async (req: any, res) => {
    const b = req.body || {};
    const ids: string[] = (Array.isArray(b.ids) ? b.ids : []).map(String).slice(0, 500);
    if (!ids.length) return res.status(400).json({ success: false, error: "Nenhum lançamento selecionado." });
    const naturezas = [...new Set(ids.map(naturezaDoId))];
    if (naturezas.includes(null)) return res.status(400).json({ success: false, error: "Lançamento inválido." });
    let c: any = null;
    for (const n of naturezas as Natureza[]) { c = ctx(req, res, "excluir", n); if (!c) return; }
    const proximas = b.escopo === "proximas";
    let excluidos = 0;
    const bloqueados: string[] = [];
    try {
      await d.mutateStore((current) => {
        const next: any = { ...current, accountsReceivable: [...(current.accountsReceivable || [])], accountsPayable: [...(current.accountsPayable || [])] };
        const cancelar = (nat: Natureza, idx: number, motivo: string) => {
          const r = next[COL[nat]][idx];
          next[COL[nat]][idx] = { ...r, status: "cancelled", cancelledAt: new Date().toISOString(), cancelledBy: c.actor, cancelReason: motivo, _rev: d.nextRev() };
          excluidos++;
        };
        for (const id of ids) {
          const l = localizar(next, id, c.companyId);
          if (!l || cancelado(l.registro.status)) continue;
          const r = l.registro;
          if (l.instId || (Array.isArray(r.installments) && r.installments.length)) { bloqueados.push(r.description || r.title || r.id); continue; }
          if (PAGO.test(String(r.status)) || num(r.paidAmount) > 0) { bloqueados.push(r.description || r.id); continue; }
          cancelar(l.natureza, l.idx, "Excluído em Transações");
          if (proximas && r.recurrence?.groupId) {
            next[COL[l.natureza]].forEach((x: any, k: number) => {
              if (k !== l.idx && x && daEmpresa(x, c.companyId) && x.recurrence?.groupId === r.recurrence.groupId && String(x.dueDate) > String(r.dueDate) && !cancelado(x.status) && !PAGO.test(String(x.status)) && !(num(x.paidAmount) > 0)) cancelar(l.natureza, k, "Excluído em Transações (esta e as próximas)");
            });
            next[COL[l.natureza]] = next[COL[l.natureza]].map((x: any) => (x && x.recurrence?.groupId === r.recurrence.groupId && daEmpresa(x, c.companyId) ? { ...x, recurrence: { ...x.recurrence, ativo: false } } : x));
          }
        }
        if (!excluidos) return current;
        next.history = historico(current, c.companyId, c.userId, c.actor, "Lançamentos excluídos", `${excluidos} lançamento(s) excluído(s) em Transações.`);
        return next;
      }, { source: "transacoes_excluir", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, excluidos, bloqueados });
    } catch (err: any) { falha(res, err); }
  });

  // Transferência entre contas
  app.post("/api/financeiro/transferencias", async (req: any, res) => {
    const c = ctx(req, res, "contas", null);
    if (!c) return;
    const b = req.body || {};
    const valor = r2(num(b.valor));
    const data = dia(b.data);
    if (!(valor > 0)) return res.status(400).json({ success: false, error: "Informe um valor maior que zero." });
    if (!data) return res.status(400).json({ success: false, error: "Informe a data." });
    if (!b.deContaId || !b.paraContaId || b.deContaId === b.paraContaId) return res.status(400).json({ success: false, error: "Escolha duas contas diferentes." });
    try {
      await d.mutateStore((current) => {
        const contas = contasDaEmpresa(current, c.companyId);
        if (!contas.some((x) => x.id === b.deContaId) || !contas.some((x) => x.id === b.paraContaId)) throw erro("Conta não encontrada.", 404);
        const t = { id: `trf-${Date.now()}`, companyId: c.companyId, data, valor, deContaId: b.deContaId, paraContaId: b.paraContaId, descricao: texto(b.descricao, 200) || "Transferência entre contas", status: "ativa", createdAt: new Date().toISOString(), createdBy: c.actor, _rev: d.nextRev() };
        return { ...current, bankTransfers: [...(Array.isArray(current.bankTransfers) ? current.bankTransfers : []), t] };
      }, { source: "transferencia_criar", companyId: c.companyId, userId: c.userId });
      res.json({ success: true });
    } catch (err: any) { falha(res, err); }
  });

  app.post("/api/financeiro/transferencias/:id/excluir", async (req: any, res) => {
    const c = ctx(req, res, "contas", null);
    if (!c) return;
    let achou = false;
    try {
      await d.mutateStore((current) => {
        const lista = (Array.isArray(current.bankTransfers) ? current.bankTransfers : []).map((t: any) => {
          if (t && t.id === req.params.id && daEmpresa(t, c.companyId) && !cancelado(t.status)) { achou = true; return { ...t, status: "cancelled", cancelledBy: c.actor, cancelledAt: new Date().toISOString(), _rev: d.nextRev() }; }
          return t;
        });
        return achou ? { ...current, bankTransfers: lista } : current;
      }, { source: "transferencia_excluir", companyId: c.companyId, userId: c.userId });
      if (!achou) return res.status(404).json({ success: false, error: "Transferência não encontrada." });
      res.json({ success: true });
    } catch (err: any) { falha(res, err); }
  });

  // Contas bancárias
  const validarConta = (b: any) => {
    const nome = texto(b?.nome, 60);
    if (!nome) return { erro: "Informe o nome da conta." };
    const tipo = ["corrente", "poupanca", "carteira", "caixa", "investimento", "cartao"].includes(b?.tipo) ? b.tipo : "corrente";
    return { conta: { nome, tipo, banco: texto(b?.banco, 60), saldoInicial: r2(num(b?.saldoInicial)), dataSaldoInicial: dia(b?.dataSaldoInicial) } };
  };
  app.post("/api/financeiro/contas-bancarias", async (req: any, res) => {
    const c = ctx(req, res, "contas", null);
    if (!c) return;
    const { conta, erro: e } = validarConta(req.body);
    if (e) return res.status(400).json({ success: false, error: e });
    try {
      let criada: any = null;
      await d.mutateStore((current) => {
        if (contasDaEmpresa(current, c.companyId).some((x) => x.nome.toLowerCase() === conta!.nome.toLowerCase())) throw erro("Já existe uma conta com esse nome.", 409);
        criada = { id: `cb-${Date.now()}`, companyId: c.companyId, ...conta, ativo: true, createdAt: new Date().toISOString(), createdBy: c.actor, _rev: d.nextRev() };
        return { ...current, bankAccounts: [...(Array.isArray(current.bankAccounts) ? current.bankAccounts : []), criada] };
      }, { source: "conta_bancaria", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, conta: criada });
    } catch (err: any) { falha(res, err); }
  });
  app.put("/api/financeiro/contas-bancarias/:id", async (req: any, res) => {
    const c = ctx(req, res, "contas", null);
    if (!c) return;
    const somenteDesativar = req.body && Object.keys(req.body).length === 1 && req.body.ativo === false;
    const { conta, erro: e } = somenteDesativar ? { conta: null, erro: "" } : validarConta(req.body);
    if (e) return res.status(400).json({ success: false, error: e });
    const id = String(req.params.id);
    try {
      await d.mutateStore((current) => {
        const existentes = contasDaEmpresa(current, c.companyId);
        const alvo = existentes.find((x) => x.id === id);
        if (!alvo) throw erro("Conta não encontrada.", 404);
        if (somenteDesativar && alvo.principal) throw erro("A conta principal não pode ser desativada.");
        if (conta && existentes.some((x) => x.id !== id && x.nome.toLowerCase() === conta.nome.toLowerCase())) throw erro("Já existe uma conta com esse nome.", 409);
        const lista = Array.isArray(current.bankAccounts) ? [...current.bankAccounts] : [];
        const idx = lista.findIndex((x: any) => x && x.id === id);
        const { principal: _p, saldoAtual: _s, previsaoMes: _pm, ...limpo } = alvo;
        const salvo = { ...limpo, ...(conta || {}), ...(somenteDesativar ? { ativo: false } : {}), companyId: c.companyId, updatedAt: new Date().toISOString(), _rev: d.nextRev() };
        if (idx >= 0) lista[idx] = salvo; else lista.push(salvo); // conta principal: passa a existir no banco na 1ª alteração
        return { ...current, bankAccounts: lista };
      }, { source: "conta_bancaria", companyId: c.companyId, userId: c.userId });
      res.json({ success: true });
    } catch (err: any) { falha(res, err); }
  });
}

// Movimento de caixa (mesma coleção usada pelo Fluxo de Caixa / DRE). Estorno = movimento inverso.
function movimento(natureza: Natureza, r: any, inst: any, valor: number, data: string, modo: string, contaId: string, c: any, d: TransacoesDeps, estorno: boolean) {
  const receita = natureza === "receber";
  const tipo = receita !== estorno ? "income" : "expense";
  const desc = r.description || r.title || r.category || "";
  return {
    id: `ft-trx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: `${data}T12:00:00.000Z`, type: tipo, amount: valor,
    category: r.category || (receita ? "Recebimentos" : "Despesas"),
    ...(receita ? { clientId: r.clientId || undefined } : { supplierId: r.supplierId || undefined }),
    companyId: c.companyId,
    description: `${estorno ? "Estorno de " + (receita ? "recebimento" : "pagamento") : receita ? "Recebimento" : "Pagamento"}: ${desc}${inst ? ` (parcela ${inst.installmentNumber || ""})` : ""}`,
    referenceId: r.id, installmentId: inst?.id || undefined, paymentMethod: modo || undefined, bankAccountId: contaId,
    createdByName: c.actor, origem: "transacoes", estorno: estorno || undefined, _rev: d.nextRev(),
  };
}
