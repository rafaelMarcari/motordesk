/**
 * Tipos de conta (a pagar) e contas recorrentes.
 *
 * Periodicidade de uma conta:
 *  - FIXA_INDETERMINADA: mesmo valor todo mês, sem data para acabar (renovada automaticamente);
 *  - FIXA_MENSAL:        mesmo valor por tempo determinado (N meses / até uma data);
 *  - VARIAVEL_MENSAL:    todo mês, valor muda (lançada com valor estimado, renovada automaticamente);
 *  - VARIAVEL:           avulsa / pontual;
 *  - PARCELADA:          parcelas com vencimentos e valores próprios.
 *
 * As recorrentes sem fim mantêm sempre 12 meses à frente; o agendamento diário completa o que faltar.
 */

export const PERIODICIDADES = ["FIXA_INDETERMINADA", "FIXA_MENSAL", "VARIAVEL_MENSAL", "VARIAVEL", "PARCELADA"] as const;
export type Periodicidade = typeof PERIODICIDADES[number];
export const RECORRENTES_SEM_FIM = new Set<string>(["FIXA_INDETERMINADA", "VARIAVEL_MENSAL"]);
export const MESES_A_FRENTE = 12;

/** Tipos oferecidos a toda empresa (a empresa pode cadastrar os seus). */
export const TIPOS_PADRAO = [
  { id: "padrao-salarios", nome: "Salários e encargos", categoria: "Folha de Pagamento & Comissões", periodicidade: "FIXA_INDETERMINADA" },
  { id: "padrao-prolabore", nome: "Pró-labore", categoria: "Folha de Pagamento & Comissões", periodicidade: "FIXA_INDETERMINADA" },
  { id: "padrao-aluguel", nome: "Aluguel", categoria: "Despesas Fixas", periodicidade: "FIXA_MENSAL", meses: 12 },
  { id: "padrao-condominio", nome: "Condomínio", categoria: "Despesas Fixas", periodicidade: "FIXA_INDETERMINADA" },
  { id: "padrao-energia", nome: "Energia elétrica", categoria: "Despesas Fixas", periodicidade: "VARIAVEL_MENSAL" },
  { id: "padrao-agua", nome: "Água e esgoto", categoria: "Despesas Fixas", periodicidade: "VARIAVEL_MENSAL" },
  { id: "padrao-internet", nome: "Internet e telefone", categoria: "Despesas Fixas", periodicidade: "FIXA_INDETERMINADA" },
  { id: "padrao-contabilidade", nome: "Contabilidade", categoria: "Nota Fiscal de Serviço", periodicidade: "FIXA_INDETERMINADA" },
  { id: "padrao-impostos", nome: "Impostos (DAS, ICMS, ISS)", categoria: "Impostos", periodicidade: "VARIAVEL_MENSAL" },
  { id: "padrao-comissoes", nome: "Comissões", categoria: "Folha de Pagamento & Comissões", periodicidade: "VARIAVEL_MENSAL" },
  { id: "padrao-fornecedor", nome: "Fornecedor (nota fiscal)", categoria: "Nota Fiscal de Estoque", periodicidade: "PARCELADA" },
  { id: "padrao-emprestimo", nome: "Empréstimo / financiamento", categoria: "Tarifas", periodicidade: "PARCELADA" },
  { id: "padrao-avulsa", nome: "Despesa avulsa", categoria: "Outros", periodicidade: "VARIAVEL" },
];

/** Tipos padrão do Contas a Receber (categorias iguais às da tela). */
export const TIPOS_PADRAO_RECEBER = [
  { id: "padrao-rec-mensalidade", nome: "Mensalidade / contrato de cliente", categoria: "Faturamento PJ / Frotas", periodicidade: "FIXA_INDETERMINADA" },
  { id: "padrao-rec-comissao", nome: "Comissão de representação", categoria: "Outros", periodicidade: "VARIAVEL_MENSAL" },
  { id: "padrao-rec-aluguel", nome: "Aluguel recebido", categoria: "Outros", periodicidade: "FIXA_MENSAL", meses: 12 },
  { id: "padrao-rec-venda-prazo", nome: "Venda a prazo (parcelada)", categoria: "Duplicatas", periodicidade: "PARCELADA" },
  { id: "padrao-rec-boleto", nome: "Boleto / duplicata", categoria: "Boletos", periodicidade: "PARCELADA" },
  { id: "padrao-rec-servico", nome: "Serviço / O.S.", categoria: "O.S. / Serviços Mecânicos", periodicidade: "VARIAVEL" },
  { id: "padrao-rec-balcao", nome: "Venda de peças / balcão", categoria: "Venda de Peças / Balcão", periodicidade: "VARIAVEL" },
  { id: "padrao-rec-adiantamento", nome: "Sinal / adiantamento", categoria: "Adiantamento", periodicidade: "VARIAVEL" },
  { id: "padrao-rec-avulsa", nome: "Receita avulsa", categoria: "Outros", periodicidade: "VARIAVEL" },
];

export type Natureza = "pagar" | "receber";
export const COLECAO: Record<Natureza, string> = { pagar: "accountsPayable", receber: "accountsReceivable" };
export const naturezaDe = (v: any): Natureza => (String(v || "").toLowerCase() === "receber" ? "receber" : "pagar");

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Soma meses mantendo o dia de vencimento (31 vira o último dia dos meses mais curtos). */
export function somarMeses(iso: string, meses: number, dia?: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const alvoDia = dia || d;
  const total = (m - 1) + meses;
  const ano = y + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return `${ano}-${pad2(mes + 1)}-${pad2(Math.min(alvoDia, ultimo))}`;
}

const daEmpresa = (r: any, companyId: string) => r && (r.companyId || "comp-1") === companyId;

/**
 * Completa as recorrências sem fim para manter MESES_A_FRENTE meses à frente de `hoje`.
 * Retorna as novas contas (não altera `contas`).
 */
export function lancamentosParaRenovar(contas: any[], hoje: string, nextRev: () => number, prefixo = "pay"): any[] {
  const grupos = new Map<string, any[]>();
  for (const c of contas || []) {
    const r = c?.recurrence;
    if (!r || !r.groupId || !RECORRENTES_SEM_FIM.has(String(r.tipo || c.expenseType))) continue;
    if (!grupos.has(r.groupId)) grupos.set(r.groupId, []);
    grupos.get(r.groupId)!.push(c);
  }
  // Mantém lançados o mês atual e os próximos 11 (compara por mês, não pelo dia)
  const limite = somarMeses(hoje, MESES_A_FRENTE - 1).slice(0, 7);
  const novas: any[] = [];
  for (const [groupId, lista] of grupos) {
    if (lista.some((c) => c.recurrence?.ativo === false)) continue;
    const ordenada = [...lista].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    const ultima = ordenada[ordenada.length - 1];
    if (!ultima?.dueDate) continue;
    const dia = Number(ultima.recurrence?.diaVencimento) || Number(String(ultima.dueDate).slice(8, 10));
    let indice = Math.max(...ordenada.map((c) => Number(c.recurrence?.indice) || 0));
    let venc = somarMeses(ultima.dueDate, 1, dia);
    let guard = 0;
    while (venc.slice(0, 7) <= limite && guard++ < 36) {
      indice += 1;
      const valor = Number(ultima.recurrence?.valorBase ?? ultima.amount) || 0;
      novas.push({
        ...ultima,
        id: `${prefixo}-${groupId}-${venc.replace(/-/g, "")}`,
        amount: valor,
        remainingAmount: valor,
        paidAmount: 0,
        status: "pending",
        dueDate: venc,
        date: venc,
        paidAt: undefined,
        paymentDate: undefined,
        installment: `Mês ${indice}`,
        recurrence: { ...ultima.recurrence, indice, valorEstimado: ultima.recurrence?.tipo === "VARIAVEL_MENSAL" },
        createdAt: new Date().toISOString(),
        createdBy: "renovação automática",
        _rev: nextRev(),
      });
      venc = somarMeses(venc, 1, dia);
    }
  }
  return novas;
}

/** Recorrências da empresa (uma linha por grupo). */
export function listarRecorrencias(contas: any[], companyId: string, hoje: string) {
  const grupos = new Map<string, any[]>();
  for (const c of contas || []) {
    if (!daEmpresa(c, companyId) || !c?.recurrence?.groupId) continue;
    if (!grupos.has(c.recurrence.groupId)) grupos.set(c.recurrence.groupId, []);
    grupos.get(c.recurrence.groupId)!.push(c);
  }
  return [...grupos.entries()].map(([groupId, lista]) => {
    const ord = [...lista].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    const base = ord[0];
    const ativas = ord.filter((c) => c.status !== "cancelled");
    const proxima = ativas.find((c) => c.dueDate >= hoje && c.status !== "paid");
    const encerrada = lista.some((c) => c.recurrence?.ativo === false);
    return {
      groupId,
      tipo: base.recurrence?.tipo || base.expenseType,
      fornecedor: base.supplierName || base.clientName || "",
      tipoConta: base.accountTypeName || "",
      categoria: base.category,
      valor: Number(base.recurrence?.valorBase ?? base.amount) || 0,
      diaVencimento: Number(base.recurrence?.diaVencimento) || Number(String(base.dueDate).slice(8, 10)),
      inicio: base.dueDate,
      fim: RECORRENTES_SEM_FIM.has(String(base.recurrence?.tipo)) && !encerrada ? "" : (ativas[ativas.length - 1]?.dueDate || ""),
      lancamentos: ativas.length,
      pagos: ativas.filter((c) => c.status === "paid").length,
      proximoVencimento: proxima?.dueDate || "",
      encerrada,
      encerramento: lista.find((c) => c.recurrence?.encerramento)?.recurrence?.encerramento || null,
    };
  }).sort((a, b) => Number(a.encerrada) - Number(b.encerrada) || String(a.fornecedor).localeCompare(String(b.fornecedor)));
}
