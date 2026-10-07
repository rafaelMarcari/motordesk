// Guias de recolhimento geradas por cada NF-e autorizada.
// Operações interestaduais devem o imposto à UF de destino por GNRE "por operação" quando a empresa
// não tem inscrição de substituto tributário (IE-ST) naquela UF: ICMS-ST, FCP-ST, DIFAL e FCP do DIFAL.
// Dentro de SP, o ICMS-ST do substituto é recolhido na apuração mensal (GARE-ICMS), sem guia por nota.
//
// Os códigos de receita seguem a tabela do Portal GNRE e devem ser conferidos pela contabilidade
// (podem ser alterados na Configuração fiscal da plataforma).

export interface GuiaReceita { codigo: string; descricao: string }

export const DEFAULT_GNRE_RECEITAS: Record<"st" | "difal" | "fcp", GuiaReceita> = {
  st: { codigo: "100110", descricao: "ICMS Substituição Tributária por Operação" },
  difal: { codigo: "100102", descricao: "ICMS Consumidor Final Não Contribuinte Outra UF por Operação" },
  fcp: { codigo: "100129", descricao: "ICMS Fundo Estadual de Combate à Pobreza por Operação" },
};

export interface Guia {
  tipo: "GNRE" | "GARE-ICMS";
  ufFavorecida: string;
  receita: string;
  descricaoReceita: string;
  valor: number;
  documentoOrigem: string; // chave da NF-e
  numeroNota: number;
  vencimento: string; // AAAA-MM-DD
  observacao: string;
  situacao: "a_pagar" | "informativo";
}

export function calcularGuias(opt: {
  ufEmit: string;
  ufDest: string;
  chave: string;
  numero: number;
  dataEmissao: string;
  totals: Record<string, number>;
  temIeSubstitutoNoDestino: boolean;
  receitas?: Partial<Record<"st" | "difal" | "fcp", GuiaReceita>>;
}): Guia[] {
  const r = { ...DEFAULT_GNRE_RECEITAS, ...(opt.receitas || {}) };
  const t = opt.totals;
  const guias: Guia[] = [];
  const venc = opt.dataEmissao.slice(0, 10);
  const base = { documentoOrigem: opt.chave, numeroNota: opt.numero, vencimento: venc };
  if (opt.ufDest !== opt.ufEmit) {
    if (!opt.temIeSubstitutoNoDestino) {
      if (t.vST > 0) guias.push({ ...base, tipo: "GNRE", ufFavorecida: opt.ufDest, receita: r.st.codigo, descricaoReceita: r.st.descricao, valor: t.vST, observacao: "Recolher antes da saída da mercadoria; a guia paga acompanha o transporte.", situacao: "a_pagar" });
      if (t.vFCPST > 0) guias.push({ ...base, tipo: "GNRE", ufFavorecida: opt.ufDest, receita: r.fcp.codigo, descricaoReceita: `${r.fcp.descricao} (FCP-ST)`, valor: t.vFCPST, observacao: "FCP devido na substituição tributária.", situacao: "a_pagar" });
      if (t.vICMSUFDest > 0) guias.push({ ...base, tipo: "GNRE", ufFavorecida: opt.ufDest, receita: r.difal.codigo, descricaoReceita: r.difal.descricao, valor: t.vICMSUFDest, observacao: "DIFAL (EC 87/2015) para consumidor final não contribuinte.", situacao: "a_pagar" });
      if (t.vFCPUFDest > 0) guias.push({ ...base, tipo: "GNRE", ufFavorecida: opt.ufDest, receita: r.fcp.codigo, descricaoReceita: `${r.fcp.descricao} (DIFAL)`, valor: t.vFCPUFDest, observacao: "FCP da UF de destino na venda a consumidor final.", situacao: "a_pagar" });
    } else if (t.vST + t.vFCPST + t.vICMSUFDest + t.vFCPUFDest > 0) {
      guias.push({ ...base, tipo: "GNRE", ufFavorecida: opt.ufDest, receita: "-", descricaoReceita: "Recolhimento na apuração mensal (empresa inscrita como substituta na UF de destino)", valor: Math.round((t.vST + t.vFCPST + t.vICMSUFDest + t.vFCPUFDest) * 100) / 100, observacao: "Sem guia por nota.", situacao: "informativo" });
    }
  } else if (t.vST > 0) {
    guias.push({ ...base, tipo: "GARE-ICMS", ufFavorecida: opt.ufEmit, receita: "-", descricaoReceita: "ICMS-ST — substituto tributário (apuração mensal)", valor: t.vST + t.vFCPST, observacao: "Valor entra na apuração mensal do ICMS-ST (GIA-ST/GARE), sem guia por nota.", situacao: "informativo" });
  }
  return guias;
}
