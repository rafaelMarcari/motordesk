/**
 * Saúde da empresa (GET /api/saude-empresa?mes=AAAA-MM): indicadores do mês numa tela só, com o
 * comparativo do mês anterior, sinal (verde / amarelo / vermelho) e a explicação de cada um.
 * Os blocos acompanham o ramo da empresa (oficina, comércio, indústria) e a representação comercial.
 * Contas a receber / a pagar usam a mesma leitura da tela de Lançamentos (inclusive títulos de OS/vendas).
 */
import type { Express } from "express";
import { transacoesDe, contasDaEmpresa, montarVisao } from "../financeiro/transacoes.ts";
import { somarMeses } from "../financeiro/recorrencias.ts";

export interface SaudeDeps {
  getStore: () => any;
  /** null = sem acesso (mensagem em error) */
  access: (req: any) => { companyId: string; company: any; businessType: string } | { status: number; error: string };
}

type Sinal = "ok" | "atencao" | "critico" | "neutro";
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (v: number) => Math.round(v * 100) / 100;
const dia = (v: any) => { const s = String(v || ""); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ""; };
const hojeISO = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const daEmpresa = (r: any, companyId: string) => r && (r.companyId || "comp-1") === companyId;
const cancelado = (s: any) => /cancel|estorn|removed|rejected|recusad/i.test(String(s || ""));
const somaItens = (itens: any) => (Array.isArray(itens) ? itens.reduce((a: number, i: any) => a + num(i?.totalPrice ?? num(i?.unitPrice) * num(i?.quantity || 1)), 0) : 0);
const variacao = (atual: number, anterior: number) => (anterior > 0 ? r2(((atual - anterior) / anterior) * 100) : atual > 0 ? 100 : 0);

function noMes(data: string, mes: string) { return Boolean(data) && data.slice(0, 7) === mes; }

/** Faturamento do mês: vendas balcão, OS concluídas e pedidos de representação */
function vendasDoMes(store: any, companyId: string, mes: string) {
  const vendas = (store?.sales || []).filter((s: any) => daEmpresa(s, companyId) && !cancelado(s.status) && !cancelado(s.paymentStatus) && noMes(dia(s.createdAt), mes));
  const os = (store?.serviceOrders || []).filter((o: any) => daEmpresa(o, companyId) && o.status === "completed" && noMes(dia(o.completedAt || o.updatedAt || o.createdAt), mes));
  const pedidos = (store?.representativeOrders || []).filter((p: any) => daEmpresa(p, companyId) && !cancelado(p.status) && noMes(dia(p.orderDate || p.createdAt), mes));
  const valorVendas = vendas.reduce((a: number, s: any) => a + num(s.totalAmount ?? s.total ?? somaItens(s.items)), 0);
  const valorOS = os.reduce((a: number, o: any) => a + num(o.totalAmount ?? o.total ?? somaItens(o.items)), 0);
  const valorPedidos = pedidos.reduce((a: number, p: any) => a + num(p.totalOrderAmount ?? p.subtotal), 0);
  const comissao = pedidos.reduce((a: number, p: any) => a + num(p.commissionAmount ?? p.estimatedTotalCommission), 0);
  return { vendas: vendas.length, os: os.length, pedidos: pedidos.length, valorVendas: r2(valorVendas), valorOS: r2(valorOS), valorPedidos: r2(valorPedidos), comissao: r2(comissao), faturamento: r2(valorVendas + valorOS) };
}

function sinalPorFaixa(v: number, verdeAte: number, amareloAte: number, maiorMelhor = false): Sinal {
  if (maiorMelhor) return v >= verdeAte ? "ok" : v >= amareloAte ? "atencao" : "critico";
  return v <= verdeAte ? "ok" : v <= amareloAte ? "atencao" : "critico";
}

export function calcularSaude(store: any, companyId: string, businessType: string, mes: string) {
  const hoje = hojeISO();
  const mesAnt = somarMeses(mes + "-01", -1).slice(0, 7);
  const em30 = somarMeses(hoje, 1);
  const blocos: any[] = [];
  const ind = (titulo: string, valor: string, sinal: Sinal, detalhe: string, explica: string, extra: any = {}) => ({ titulo, valor, sinal, detalhe, explica, ...extra });
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pctTxt = (v: number) => (v > 0 ? "+" : "") + v.toFixed(1).replace(".", ",") + "%";

  // ---------------- Financeiro
  const rec = transacoesDe(store, companyId, "receber");
  const pag = transacoesDe(store, companyId, "pagar");
  const pagoNoMes = (l: any[], m: string) => r2(l.reduce((a, t) => a + (noMes(t.dataPagamento, m) ? (t.pago ? t.valor : t.valorPago) : 0), 0));
  const recebido = pagoNoMes(rec, mes), pago = pagoNoMes(pag, mes);
  const recebidoAnt = pagoNoMes(rec, mesAnt), pagoAnt = pagoNoMes(pag, mesAnt);
  const aberto = (t: any) => r2(t.valor - t.valorPago);
  const recVencido = rec.filter((t) => !t.pago && t.data < hoje);
  const pagVencido = pag.filter((t) => !t.pago && t.data < hoje);
  const totalRecVencido = r2(recVencido.reduce((a, t) => a + aberto(t), 0));
  const totalPagVencido = r2(pagVencido.reduce((a, t) => a + aberto(t), 0));
  const totalRecAberto = r2(rec.filter((t) => !t.pago).reduce((a, t) => a + aberto(t), 0));
  const rec30 = r2(rec.filter((t) => !t.pago && t.data >= hoje && t.data <= em30).reduce((a, t) => a + aberto(t), 0));
  const pag30 = r2(pag.filter((t) => !t.pago && t.data >= hoje && t.data <= em30).reduce((a, t) => a + aberto(t), 0));
  const visao = montarVisao(store, companyId, hoje.slice(0, 7), "", { receber: true, pagar: true });
  const saldoContas = r2(visao.contas.reduce((a: number, c: any) => a + c.saldoAtual, 0));
  const resultado = r2(recebido - pago), resultadoAnt = r2(recebidoAnt - pagoAnt);
  const inad = totalRecAberto > 0 ? r2((totalRecVencido / totalRecAberto) * 100) : 0;
  const cobertura = pag30 + totalPagVencido > 0 ? Math.max(0, r2(((saldoContas + rec30) / (pag30 + totalPagVencido)) * 100)) : 100;
  blocos.push({
    id: "financeiro", titulo: "Financeiro", itens: [
      ind("Resultado de caixa no mês", brl(resultado), resultado >= 0 ? "ok" : "critico", `Recebido ${brl(recebido)} · pago ${brl(pago)} · mês anterior ${brl(resultadoAnt)}`, "Tudo o que entrou menos tudo o que saiu no mês (pela data do pagamento). Negativo: a empresa gastou mais do que recebeu."),
      ind("Saldo em contas hoje", brl(saldoContas), saldoContas >= 0 ? "ok" : "critico", `${visao.contas.length} conta(s) cadastrada(s) em Lançamentos → Contas`, "Soma do saldo atual das contas e caixas (saldo inicial + entradas − saídas)."),
      ind("Cobertura dos próximos 30 dias", cobertura.toFixed(0) + "%", sinalPorFaixa(cobertura, 100, 70, true), `Saldo + a receber em 30 dias ${brl(r2(saldoContas + rec30))} · a pagar (30 dias + vencidos) ${brl(r2(pag30 + totalPagVencido))}`, "Quanto do que vence nos próximos 30 dias o caixa consegue pagar. Abaixo de 100%: vai faltar dinheiro se nada mudar."),
      ind("A receber vencido (inadimplência)", brl(totalRecVencido), totalRecVencido === 0 ? "ok" : sinalPorFaixa(inad, 5, 15), `${recVencido.length} título(s) · ${inad.toFixed(1).replace(".", ",")}% do que há a receber`, "Valores que os clientes já deveriam ter pago. Acima de 15% do total a receber é sinal de alerta na cobrança."),
      ind("A pagar vencido", brl(totalPagVencido), totalPagVencido === 0 ? "ok" : pagVencido.length <= 2 ? "atencao" : "critico", `${pagVencido.length} conta(s) em atraso`, "Contas que já venceram e ainda não foram pagas: geram juros, multa e desgaste com fornecedores."),
    ],
  });

  // ---------------- Vendas
  const v = vendasDoMes(store, companyId, mes), vAnt = vendasDoMes(store, companyId, mesAnt);
  const varFat = variacao(v.faturamento, vAnt.faturamento);
  const qtd = v.vendas + v.os, qtdAnt = vAnt.vendas + vAnt.os;
  const ticket = qtd ? r2(v.faturamento / qtd) : 0, ticketAnt = qtdAnt ? r2(vAnt.faturamento / qtdAnt) : 0;
  const itensVendas = [
    ind("Faturamento do mês", brl(v.faturamento), v.faturamento === 0 && vAnt.faturamento === 0 ? "neutro" : varFat >= 0 ? "ok" : varFat >= -10 ? "atencao" : "critico", `${pctTxt(varFat)} sobre o mês anterior (${brl(vAnt.faturamento)}) · ${v.vendas} venda(s) balcão${businessType !== "COMERCIO" ? " · " + v.os + " OS concluída(s)" : ""}`, "Vendas de balcão e ordens de serviço concluídas no mês. Comparado com o mês anterior."),
    ind("Ticket médio", brl(ticket), qtd === 0 ? "neutro" : ticket >= ticketAnt ? "ok" : "atencao", `mês anterior ${brl(ticketAnt)} · ${qtd} atendimento(s)`, "Valor médio de cada venda ou OS. Subir o ticket médio aumenta o faturamento sem precisar de mais clientes."),
  ];
  blocos.push({ id: "vendas", titulo: "Vendas", itens: itensVendas });

  // ---------------- Representação (quando houver)
  const pedidosRep = (store?.representativeOrders || []).filter((p: any) => daEmpresa(p, companyId));
  if (pedidosRep.length) {
    const pend = (store?.representativePendingLines || []).filter((l: any) => daEmpresa(l, companyId) && l.status === "aberta");
    const semNumero = pedidosRep.filter((p: any) => !cancelado(p.status) && /sent|enviado/i.test(String(p.status)) && !(Array.isArray(p.factoryOrderNumbers) && p.factoryOrderNumbers.length));
    blocos.push({
      id: "representacao", titulo: "Representação comercial", itens: [
        ind("Pedidos enviados às representadas", brl(v.valorPedidos), v.valorPedidos === 0 && vAnt.valorPedidos === 0 ? "neutro" : variacao(v.valorPedidos, vAnt.valorPedidos) >= 0 ? "ok" : "atencao", `${v.pedidos} pedido(s) · ${pctTxt(variacao(v.valorPedidos, vAnt.valorPedidos))} sobre o mês anterior`, "Volume de pedidos tirados no mês para as fábricas representadas."),
        ind("Comissão estimada do mês", brl(v.comissao), "neutro", `mês anterior ${brl(vAnt.comissao)}`, "Comissão prevista sobre os pedidos do mês (confirma-se no faturamento da representada)."),
        ind("Pendências da conciliação", String(pend.length), pend.length === 0 ? "ok" : pend.length <= 5 ? "atencao" : "critico", `${semNumero.length} pedido(s) enviado(s) sem o número da representada`, "Linhas da planilha de fechamento ainda não conciliadas: comissão que pode estar ficando para trás."),
      ],
    });
  }

  // ---------------- Clientes e orçamentos
  const clientes = (store?.clients || []).filter((c: any) => daEmpresa(c, companyId));
  const novos = clientes.filter((c: any) => noMes(dia(c.createdAt), mes)).length;
  const orc = (store?.budgets || []).filter((b: any) => daEmpresa(b, companyId) && noMes(dia(b.createdAt), mes));
  const aprov = orc.filter((b: any) => /approved|aprovad|converted/i.test(String(b.status))).length;
  const conv = orc.length ? r2((aprov / orc.length) * 100) : 0;
  const itensCli = [ind("Clientes cadastrados", String(clientes.length), "neutro", `${novos} novo(s) no mês`, "Base de clientes da empresa. Clientes novos indicam se a captação está funcionando.")];
  if (businessType !== "COMERCIO" || orc.length) itensCli.push(ind("Conversão de orçamentos", orc.length ? conv.toFixed(0) + "%" : "—", orc.length ? sinalPorFaixa(conv, 50, 30, true) : "neutro", `${aprov} aprovado(s) de ${orc.length} emitido(s) no mês`, "Quantos orçamentos viraram serviço/venda. Abaixo de 30% vale revisar preço, prazo ou o retorno ao cliente."));
  blocos.push({ id: "clientes", titulo: "Clientes e orçamentos", itens: itensCli });

  // ---------------- Estoque
  const pecas = (store?.parts || []).filter((p: any) => daEmpresa(p, companyId));
  if (pecas.length) {
    const valorEstoque = r2(pecas.reduce((a: number, p: any) => a + num(p.stock) * num(p.costPrice ?? p.cost ?? 0), 0));
    const abaixo = pecas.filter((p: any) => num(p.minStock) > 0 && num(p.stock) < num(p.minStock));
    const zerados = pecas.filter((p: any) => num(p.stock) <= 0);
    blocos.push({
      id: "estoque", titulo: "Estoque", itens: [
        ind("Valor parado em estoque", brl(valorEstoque), "neutro", `${pecas.length} item(ns) cadastrado(s) (pelo preço de custo)`, "Dinheiro investido em mercadoria. Estoque alto demais prende o caixa; baixo demais perde vendas."),
        ind("Itens abaixo do mínimo", String(abaixo.length), abaixo.length === 0 ? "ok" : abaixo.length <= 5 ? "atencao" : "critico", `${zerados.length} item(ns) zerado(s)`, "Itens que já passaram do ponto de pedido: risco de faltar no balcão ou no meio de um serviço."),
      ],
    });
  }

  // ---------------- Oficina
  if (businessType === "OFICINA" || businessType === "OFICINA_COMERCIO") {
    const os = (store?.serviceOrders || []).filter((o: any) => daEmpresa(o, companyId) && !cancelado(o.status));
    const abertas = os.filter((o: any) => o.status !== "completed");
    const conc = os.filter((o: any) => o.status === "completed" && noMes(dia(o.completedAt), mes));
    const dias = conc.map((o: any) => (Date.parse(dia(o.completedAt)) - Date.parse(dia(o.createdAt))) / 86400000).filter((d: number) => d >= 0);
    const tempo = dias.length ? r2(dias.reduce((a: number, d: number) => a + d, 0) / dias.length) : 0;
    const paradas = abertas.filter((o: any) => dia(o.createdAt) && (Date.parse(hoje) - Date.parse(dia(o.createdAt))) / 86400000 > 7);
    blocos.push({
      id: "oficina", titulo: "Oficina", itens: [
        ind("OS em aberto", String(abertas.length), paradas.length === 0 ? "ok" : paradas.length <= 2 ? "atencao" : "critico", `${paradas.length} aberta(s) há mais de 7 dias`, "Ordens de serviço no pátio. As paradas há muito tempo seguram dinheiro e desagradam o cliente."),
        ind("Tempo médio de entrega", conc.length ? tempo.toFixed(1).replace(".", ",") + " dia(s)" : "—", conc.length ? sinalPorFaixa(tempo, 3, 7) : "neutro", `${conc.length} OS concluída(s) no mês`, "Da abertura à conclusão da OS. Quanto menor, mais carros passam pela oficina."),
      ],
    });
  }

  // ---------------- Indústria
  if (businessType === "INDUSTRIA") {
    const ops = (store?.productionOrders || []).filter((o: any) => daEmpresa(o, companyId) && !cancelado(o.status));
    const concluida = (o: any) => /conclu|finaliz|completed|done/i.test(String(o.status));
    const abertas = ops.filter((o: any) => !concluida(o));
    const atrasadas = abertas.filter((o: any) => dia(o.plannedEndDate) && dia(o.plannedEndDate) < hoje);
    const concMes = ops.filter((o: any) => concluida(o) && noMes(dia(o.actualEndDate || o.updatedAt), mes));
    const produzido = ops.reduce((a: number, o: any) => a + num(o.producedQuantity), 0);
    const refugo = ops.reduce((a: number, o: any) => a + num(o.scrappedQuantity), 0);
    const pctRefugo = produzido + refugo > 0 ? r2((refugo / (produzido + refugo)) * 100) : 0;
    blocos.push({
      id: "industria", titulo: "Produção", itens: [
        ind("Ordens de produção em aberto", String(abertas.length), atrasadas.length === 0 ? "ok" : atrasadas.length <= 2 ? "atencao" : "critico", `${atrasadas.length} atrasada(s) · ${concMes.length} concluída(s) no mês`, "OPs planejadas e em produção. Atrasos comprometem prazos de entrega ao cliente."),
        ind("Refugo", pctRefugo.toFixed(1).replace(".", ",") + "%", produzido + refugo ? sinalPorFaixa(pctRefugo, 2, 5) : "neutro", `${refugo} peça(s) refugada(s) de ${produzido + refugo}`, "Percentual de peças perdidas na produção. Acima de 5% indica problema de processo ou matéria-prima."),
      ],
    });
  }

  // Série de 6 meses: faturamento e resultado de caixa
  const serie = [];
  for (let i = 5; i >= 0; i--) {
    const m = somarMeses(mes + "-01", -i).slice(0, 7);
    serie.push({ mes: m, faturamento: vendasDoMes(store, companyId, m).faturamento, resultado: r2(pagoNoMes(rec, m) - pagoNoMes(pag, m)) });
  }
  const todos = blocos.flatMap((b) => b.itens).filter((i) => i.sinal !== "neutro");
  const placar = { ok: todos.filter((i) => i.sinal === "ok").length, atencao: todos.filter((i) => i.sinal === "atencao").length, critico: todos.filter((i) => i.sinal === "critico").length };
  const geral: Sinal = placar.critico >= 2 || (placar.critico >= 1 && placar.atencao >= 2) ? "critico" : placar.critico || placar.atencao >= 2 ? "atencao" : "ok";
  return { mes, mesAnterior: mesAnt, hoje, businessType, geral, placar, blocos, serie, contas: contasDaEmpresa(store, companyId).length };
}

export function registerSaudeRoutes(app: Express, d: SaudeDeps) {
  app.get("/api/saude-empresa", (req: any, res) => {
    const c = d.access(req);
    if ("status" in c) return res.status(c.status).json({ success: false, error: c.error });
    const mes = /^\d{4}-\d{2}$/.test(String(req.query?.mes || "")) ? String(req.query.mes) : hojeISO().slice(0, 7);
    res.json({ success: true, empresa: c.company.name || "", ...calcularSaude(d.getStore(), c.companyId, c.businessType, mes) });
  });
}
