/**
 * Site: "a dor e o remédio" (versão 2 do conteúdo)
 *
 * O site passa a abrir com a pergunta que incomoda o dono da empresa e, logo em seguida, cada dor comum de
 * oficinas, autopeças e indústrias com o recurso do MotorDesk que a resolve. Só entram recursos que existem
 * no sistema.
 *
 * O conteúdo fica no banco (landingContent): esta migração é aplicada uma única vez (conteudoVersao = 2) e
 * guarda o que foi trocado em landingContent.conteudoAnterior, para voltar atrás se preciso. Depois disso o
 * editor do site ("Admin da Página") continua mandando no texto; os campos novos (dores, conteudoVersao,
 * conteudoAnterior) são preservados quando o editor salva sem eles.
 */

export const CONTEUDO_VERSAO = 2;

export interface ItemDor { segmentos: string[]; dor: string; remedio: string; detalhe: string; tela: string }

export const DORES_PADRAO = {
  etiqueta: "A dor e o remédio",
  titulo: "O que tira o seu sono hoje — e como o MotorDesk resolve",
  subtitulo: "Cada problema abaixo é dito do jeito que a gente ouve dos donos de oficina, loja e fábrica. Logo embaixo, o recurso do sistema que acaba com ele.",
  rotuloDor: "A dor",
  rotuloRemedio: "O remédio",
  fechamentoTitulo: "Comece pelo que dói mais",
  fechamentoTexto: "Você contrata só os módulos do seu segmento e libera cada tela para quem precisa. Sem pagar pelo que não usa.",
  itens: [
    {
      segmentos: ["todos"],
      dor: "Fecho o mês e não sei se a empresa deu lucro ou prejuízo.",
      remedio: "Saúde da empresa",
      detalhe: "Caixa do mês, saldo nas contas, o que entra e sai nos próximos 30 dias, inadimplência e estoque numa tela só, com sinal verde, amarelo ou vermelho e a explicação de cada número.",
      tela: "Saúde da empresa",
    },
    {
      segmentos: ["todos"],
      dor: "Tem dinheiro na rua e eu não sei quem está me devendo.",
      remedio: "Contas a receber automático",
      detalhe: "Cada OS faturada e cada venda já gera o título a receber, com parcelas, juros da maquininha, boleto e PIX. Os vencidos aparecem em destaque para você cobrar no dia.",
      tela: "Contas a Receber",
    },
    {
      segmentos: ["todos"],
      dor: "Conferir o extrato do banco com o caderno leva a tarde inteira.",
      remedio: "Lançamentos com conciliação bancária",
      detalhe: "Importe o extrato do banco (OFX) e o sistema sugere qual lançamento corresponde a cada movimento. Você só confirma.",
      tela: "Lançamentos",
    },
    {
      segmentos: ["todos"],
      dor: "Funcionário mexe onde não deve e eu nem fico sabendo.",
      remedio: "Liberação tela por tela e auditoria",
      detalhe: "Cada pessoa vê só as telas liberadas para ela, e toda ação fica registrada com usuário, data e hora num histórico que ninguém apaga.",
      tela: "Criar Usuários / Níveis e Histórico",
    },
    {
      segmentos: ["todos"],
      dor: "Nota fiscal é sempre um sufoco e depende de outro programa.",
      remedio: "Fiscal no mesmo sistema",
      detalhe: "NF-e, NFC-e e NFS-e emitidas a partir da venda ou da OS, com fila de conferência antes de transmitir e o XML guardado para a contabilidade.",
      tela: "Fiscal, Boletos & SEFAZ",
    },
    {
      segmentos: ["oficina"],
      dor: "A OS de papel some, e o cliente jura que não autorizou o serviço.",
      remedio: "Orçamento aprovado pelo cliente e OS digital",
      detalhe: "O cliente aprova o orçamento pelo WhatsApp, a OS nasce com um clique e guarda checklist com fotos, mecânico responsável e o histórico do carro pela placa.",
      tela: "Orçamentos e Ordens de Serviço",
    },
    {
      segmentos: ["oficina"],
      dor: "Não sei quais carros estão parados no pátio e por quê.",
      remedio: "Semáforo da oficina",
      detalhe: "Painel em quatro cores, legível de longe pelos mecânicos: aguardando, em serviço, pausado com o motivo e liberado.",
      tela: "Ordens de Serviço",
    },
    {
      segmentos: ["oficina"],
      dor: "Esqueço de chamar o cliente para a próxima revisão e perco o serviço.",
      remedio: "Próxima revisão com aviso",
      detalhe: "Ao concluir a OS, o sistema registra a próxima revisão por quilometragem e data e avisa o cliente pelo WhatsApp.",
      tela: "Ordens de Serviço e Motor de Notificações",
    },
    {
      segmentos: ["comercio"],
      dor: "Fila no balcão e cliente desistindo da compra.",
      remedio: "PDV de balcão",
      detalhe: "Venda em segundos, sem cadastro obrigatório, inclusive por metro, m² ou litro. O estoque baixa na hora e a venda já cai no caixa ou no contas a receber.",
      tela: "Vendas & Balcão",
    },
    {
      segmentos: ["comercio", "oficina"],
      dor: "Vendo uma peça que já estava prometida em outro orçamento.",
      remedio: "Reserva de estoque no orçamento",
      detalhe: "A peça orçada fica reservada pelo prazo combinado, o vendedor vê o aviso na tela e, se o orçamento vencer, ela volta sozinha para o estoque.",
      tela: "Orçamentos e Estoque",
    },
    {
      segmentos: ["comercio"],
      dor: "Dar entrada na nota de compra é digitar item por item.",
      remedio: "Entrada de nota pelo XML",
      detalhe: "Importe o XML da NF-e do fornecedor: produtos, quantidades e dados fiscais entram no estoque de uma vez.",
      tela: "Estoque & NF-e",
    },
    {
      segmentos: ["industria"],
      dor: "O cliente liga perguntando do pedido e ninguém sabe em que etapa está.",
      remedio: "Rastrear Processo",
      detalhe: "As 14 etapas do pedido, do comercial ao pós-venda, numa esteira com o setor responsável. Abra a tela de qualquer etapa e avance para a próxima sem voltar ao menu.",
      tela: "Rastrear Processo",
    },
    {
      segmentos: ["hibrido"],
      dor: "A oficina usa a peça que o balcão acabou de vender.",
      remedio: "Um estoque só para oficina e balcão",
      detalhe: "No plano híbrido, ordens de serviço e vendas de balcão baixam do mesmo saldo, e você vê a margem das peças separada do lucro dos serviços.",
      tela: "Estoque, OS e Vendas",
    },
  ] as ItemDor[],
};

const HERO_V2 = {
  badgeText: "MotorDesk — gestão para oficinas, autopeças e indústrias",
  title: "Você sabe hoje quanto sua empresa lucrou, quem está devendo e onde está cada serviço?",
  subtitle: "Se a resposta depende de papel, planilha ou memória, o MotorDesk resolve: ordens de serviço, vendas, estoque, financeiro e notas fiscais em um só sistema — só com os módulos que o seu segmento usa.",
  primaryCtaText: "Acessar o MotorDesk",
  secondaryCtaText: "Ver as telas do sistema",
  // números que podem ser conferidos no próprio sistema
  kpis: [
    { value: "3", label: "Segmentos: oficina, comércio e indústria" },
    { value: "1 tela", label: "Para ver a saúde da empresa" },
    { value: "14 etapas", label: "Rastreadas na indústria" },
    { value: "7 formatos", label: "De exportação: PDF, Excel, CSV e mais" },
  ],
};

// Telas do produto que falam com o desenvolvedor, não com o dono da empresa
const TELAS_FORA = new Set(["screen-qa-bdd-tests"]);

/** Aplica a versão 2 sobre o conteúdo do site; devolve null se já estiver aplicada. */
export function conteudoSiteV2(l: any): any | null {
  if (!l || typeof l !== "object" || Number(l.conteudoVersao) >= CONTEUDO_VERSAO) return null;
  const telas = Array.isArray(l.productScreens) ? l.productScreens : [];
  const anterior = {
    em: new Date().toISOString(),
    hero: l.hero || null,
    // só os textos (as imagens ficam onde estão)
    telasRetiradas: telas.filter((t: any) => t && TELAS_FORA.has(t.id)).map(({ imageUrl, ...resto }: any) => resto),
  };
  return {
    ...l,
    hero: { ...(l.hero || {}), ...HERO_V2 },
    productScreens: telas.filter((t: any) => !(t && TELAS_FORA.has(t.id))),
    dores: l.dores || DORES_PADRAO,
    conteudoVersao: CONTEUDO_VERSAO,
    conteudoAnterior: anterior,
  };
}

/** O editor do site manda o conteúdo inteiro; o que ele não conhece vem do que já está gravado. */
export function preservarCamposNovos(recebido: any, atual: any): any {
  if (!atual || typeof atual !== "object") return recebido;
  const out = { ...recebido };
  for (const k of ["dores", "conteudoVersao", "conteudoAnterior"]) if (out[k] === undefined && atual[k] !== undefined) out[k] = atual[k];
  return out;
}
