/**
 * Conciliação dos pedidos de representação com a planilha de fechamento da representada.
 *
 * A planilha traz, por linha, o pedido como foi digitado na representada (número dela), a nota fiscal
 * e o valor faturado. Um pedido do MotorDesk pode virar dois ou mais pedidos/notas na representada.
 *
 * Ordem de vinculação de cada linha:
 *  1. número do pedido na representada já informado no pedido do MotorDesk (campo factoryOrderNumbers);
 *  2. número do pedido do MotorDesk citado na planilha (coluna "seu pedido"/"pedido do representante");
 *  3. outras linhas com o mesmo número de pedido da representada de uma linha já vinculada;
 *  4. sugestão: mesmo cliente (CNPJ/CPF ou nome) e valores que fecham com o pedido — precisa ser conferida.
 */

export type StatusPedido = 'conciliado' | 'parcial' | 'recebido' | 'divergente' | 'sugestao' | 'nao_consta';
export type Metodo = 'numero_representada' | 'nosso_numero' | 'mesmo_pedido_representada' | 'sugestao' | 'manual';

export interface LinhaPlanilha {
  linha: number;
  pedidoRepresentada: string;
  nossoPedido: string;
  cliente: string;
  documento: string;
  dataPedido: string;
  valorPedido: number;
  notaFiscal: string;
  dataFaturamento: string;
  valorFaturado: number;
  situacao: string;
}

export interface OpcoesAnalise {
  representadaId?: string;
  de?: string;
  ate?: string;
  toleranciaValor?: number;
  toleranciaPercentual?: number;
  /** linha -> id do pedido ("" desfaz o vínculo automático) */
  vinculos?: Record<string, string>;
  ignorar?: number[];
}

export interface NotaVinculada {
  numero: string;
  data: string;
  valor: number;
  pedidoRepresentada: string;
  conciliacaoId?: string;
}

export interface PedidoAnalisado {
  id: string;
  numero: string;
  data: string;
  representada: string;
  representadaId: string;
  cliente: string;
  documento: string;
  valor: number;
  comissaoPercentual: number;
  statusAtual: string;
  numerosRepresentada: string[];
  numerosNovos: string[];
  linhas: number[];
  metodo: Metodo | null;
  notas: NotaVinculada[];
  notasAnteriores: NotaVinculada[];
  faturado: number;
  diferenca: number;
  comissaoFaturada: number;
  status: StatusPedido;
  statusValores: StatusPedido;
  avisos: string[];
}

export interface LinhaAnalisada extends LinhaPlanilha {
  pedidoId: string | null;
  pedidoNumero: string | null;
  metodo: Metodo | null;
  status: 'vinculada' | 'sugerida' | 'sem_pedido' | 'ignorada';
}

export interface ResultadoAnalise {
  pedidos: PedidoAnalisado[];
  linhas: LinhaAnalisada[];
  resumo: {
    pedidos: number;
    conciliados: number;
    parciais: number;
    recebidos: number;
    divergentes: number;
    sugestoes: number;
    naoConstam: number;
    linhas: number;
    linhasSemPedido: number;
    valorPedidos: number;
    valorFaturado: number;
    comissaoFaturada: number;
  };
}

const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const digits = (v: any) => String(v ?? '').replace(/\D/g, '');

/** Chave de número de pedido: só letras e dígitos, maiúsculas, sem zeros à esquerda. */
export function chaveNumero(v: any): string {
  const s = String(v ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
  return s.replace(/^0+(?=\d)/, '');
}

export function chaveNome(v: any): string {
  return String(v ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(LTDA|ME|EPP|EIRELI|S\/?A|SA|CIA|COMERCIO|IND|INDUSTRIA)\b/g, ' ')
    .replace(/[^A-Z0-9]/g, '');
}

/** Converte "1.234,56", "1234.56", "R$ 1.234,56" ou número para número. */
export function numero(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/[R$\s]/g, '');
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()\-]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, '');
  else if (lastComma < 0 && (s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
}

/** Datas da planilha: ISO, dd/mm/aaaa ou número serial do Excel. Devolve aaaa-mm-dd ou "". */
export function data(v: any): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

const texto = (v: any, max = 160) => String(v ?? '').trim().slice(0, max);

export function normalizarLinhas(raw: any[]): LinhaPlanilha[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5000).map((r: any, i: number) => ({
    linha: Number.isInteger(r?.linha) ? r.linha : i + 1,
    pedidoRepresentada: texto(r?.pedidoRepresentada, 40),
    nossoPedido: texto(r?.nossoPedido, 40),
    cliente: texto(r?.cliente),
    documento: digits(r?.documento).slice(0, 14),
    dataPedido: data(r?.dataPedido),
    valorPedido: round2(numero(r?.valorPedido)),
    notaFiscal: texto(r?.notaFiscal, 40),
    dataFaturamento: data(r?.dataFaturamento),
    valorFaturado: round2(numero(r?.valorFaturado)),
    situacao: texto(r?.situacao, 60),
  })).filter((r) => r.pedidoRepresentada || r.nossoPedido || r.notaFiscal || r.valorFaturado || r.valorPedido || r.cliente);
}

const valorPedido = (o: any) => round2(numero(o?.totalOrderAmount ?? o?.totalAmount ?? o?.total ?? 0));
const nomeRepresentada = (o: any) => String(o?.representedName || o?.representedCompanyName || '');
const idRepresentada = (o: any) => String(o?.representedId || o?.representedCompanyId || '');
const cancelado = (s: any) => /CANCEL/i.test(String(s || ''));
const notaChave = (n: { numero: string; pedidoRepresentada: string; valor: number }) =>
  `${chaveNumero(n.numero)}|${chaveNumero(n.pedidoRepresentada)}|${n.numero ? '' : round2(n.valor)}`;

function pertenceRepresentada(o: any, representadaId: string, representadas: any[]): boolean {
  if (!representadaId) return true;
  if (idRepresentada(o) === representadaId) return true;
  const rep = representadas.find((r) => r?.id === representadaId);
  if (!rep) return false;
  const nome = chaveNome(nomeRepresentada(o));
  return Boolean(nome) && [rep.tradeName, rep.corporateName, rep.name].some((n) => n && chaveNome(n) === nome);
}

/** Combinação de até 4 valores (dentre no máx. 14) que soma o alvo dentro da tolerância. */
function combinacao(itens: { idx: number; valor: number }[], alvo: number, tol: number): number[] | null {
  const lista = itens.slice(0, 14);
  let melhor: number[] | null = null;
  const busca = (inicio: number, soma: number, escolhidos: number[]) => {
    if (melhor) return;
    if (escolhidos.length > 0 && Math.abs(soma - alvo) <= tol) { melhor = [...escolhidos]; return; }
    if (escolhidos.length === 4) return;
    for (let i = inicio; i < lista.length; i++) {
      if (soma + lista[i].valor > alvo + tol) continue;
      escolhidos.push(lista[i].idx);
      busca(i + 1, soma + lista[i].valor, escolhidos);
      escolhidos.pop();
      if (melhor) return;
    }
  };
  busca(0, 0, []);
  return melhor;
}

export function analisarConciliacao(
  pedidosEmpresa: any[],
  representadas: any[],
  linhasEntrada: LinhaPlanilha[],
  opcoes: OpcoesAnalise = {}
): ResultadoAnalise {
  const tolValor = Math.max(0, numero(opcoes.toleranciaValor ?? 1));
  const tolPct = Math.max(0, numero(opcoes.toleranciaPercentual ?? 0.5));
  const tolerancia = (valor: number) => Math.max(tolValor, Math.abs(valor) * tolPct / 100);
  const ignorar = new Set((opcoes.ignorar || []).map(Number));
  const vinculosManuais = opcoes.vinculos || {};

  const pedidos = (pedidosEmpresa || []).filter((o) => o && o.id);
  const porId = new Map(pedidos.map((o) => [String(o.id), o]));

  // Índices de número: o da representada (já informado) e o do próprio MotorDesk
  const porNumeroRepresentada = new Map<string, any>();
  const porNossoNumero = new Map<string, any>();
  for (const o of pedidos) {
    for (const n of Array.isArray(o.factoryOrderNumbers) ? o.factoryOrderNumbers : []) {
      const k = chaveNumero(n);
      if (k && !porNumeroRepresentada.has(k)) porNumeroRepresentada.set(k, o);
    }
    const k = chaveNumero(o.orderNumber);
    if (k) {
      porNossoNumero.set(k, o);
      const soDigitos = digits(o.orderNumber).replace(/^0+/, '');
      if (soDigitos.length >= 3 && !porNossoNumero.has(soDigitos)) porNossoNumero.set(soDigitos, o);
    }
  }

  const linhas: LinhaAnalisada[] = linhasEntrada.map((l) => ({ ...l, pedidoId: null, pedidoNumero: null, metodo: null, status: 'sem_pedido' }));
  const vincular = (l: LinhaAnalisada, o: any, metodo: Metodo) => {
    l.pedidoId = String(o.id);
    l.pedidoNumero = String(o.orderNumber || o.id);
    l.metodo = metodo;
    l.status = metodo === 'sugestao' ? 'sugerida' : 'vinculada';
  };

  // 0. Ignoradas e vínculos manuais
  for (const l of linhas) {
    if (ignorar.has(l.linha)) { l.status = 'ignorada'; continue; }
    const manual = vinculosManuais[String(l.linha)];
    if (manual !== undefined) {
      const o = manual ? porId.get(String(manual)) : null;
      if (o) vincular(l, o, 'manual');
      else (l as any).semVinculoManual = true;
    }
  }
  const livres = () => linhas.filter((l) => l.status === 'sem_pedido' && !(l as any).semVinculoManual);

  // 1 e 2. Número da representada já informado; número do MotorDesk citado na planilha
  for (const l of livres()) {
    const porRep = l.pedidoRepresentada && porNumeroRepresentada.get(chaveNumero(l.pedidoRepresentada));
    if (porRep) { vincular(l, porRep, 'numero_representada'); continue; }
    const k = chaveNumero(l.nossoPedido);
    const porNosso = k && (porNossoNumero.get(k) || porNossoNumero.get(digits(l.nossoPedido).replace(/^0+/, '')));
    if (porNosso) vincular(l, porNosso, 'nosso_numero');
  }

  // 3. Outras linhas do mesmo pedido da representada
  const repParaPedido = new Map<string, any>();
  for (const l of linhas) if (l.pedidoId && l.pedidoRepresentada) repParaPedido.set(chaveNumero(l.pedidoRepresentada), porId.get(l.pedidoId));
  for (const l of livres()) {
    const o = l.pedidoRepresentada && repParaPedido.get(chaveNumero(l.pedidoRepresentada));
    if (o) vincular(l, o, 'mesmo_pedido_representada');
  }

  // Pedidos no escopo do fechamento (enviados e ainda não faturados por completo)
  const noPeriodo = (o: any) => {
    const d = String(o.orderDate || o.createdAt || '').slice(0, 10);
    if (opcoes.de && d && d < opcoes.de) return false;
    if (opcoes.ate && d && d > opcoes.ate) return false;
    return true;
  };
  const vinculados = new Set(linhas.filter((l) => l.pedidoId).map((l) => l.pedidoId as string));
  const noEscopo = pedidos.filter((o) =>
    vinculados.has(String(o.id)) ||
    (pertenceRepresentada(o, opcoes.representadaId || '', representadas) && noPeriodo(o) &&
      !cancelado(o.status) && !/DIGITA|RASCUNHO|DRAFT/i.test(String(o.status || '')) && String(o.status || '') !== 'FATURADO_TOTAL')
  );

  // 4. Sugestões: mesmo cliente e valores que fecham com o pedido
  const chaveCliente = (doc: string, nome: string) => (digits(doc).length >= 11 ? `D${digits(doc)}` : chaveNome(nome) ? `N${chaveNome(nome)}` : '');
  const candidatos = noEscopo.filter((o) => !vinculados.has(String(o.id)));
  const porCliente = new Map<string, any[]>();
  for (const o of candidatos) {
    const k = chaveCliente(o.clientCnpjCpf || o.clientDocument || '', o.clientName || '');
    if (!k) continue;
    if (!porCliente.has(k)) porCliente.set(k, []);
    porCliente.get(k)!.push(o);
  }
  const linhasPorCliente = new Map<string, LinhaAnalisada[]>();
  for (const l of livres()) {
    const k = chaveCliente(l.documento, l.cliente);
    if (!k) continue;
    if (!linhasPorCliente.has(k)) linhasPorCliente.set(k, []);
    linhasPorCliente.get(k)!.push(l);
  }
  for (const [k, ls] of linhasPorCliente) {
    const os = (porCliente.get(k) || []).sort((a, b) => String(a.orderDate || '').localeCompare(String(b.orderDate || '')));
    for (const o of os) {
      const disponiveis = ls.filter((l) => !l.pedidoId);
      if (disponiveis.length === 0) break;
      const alvo = valorPedido(o);
      const itens = disponiveis.map((l, idx) => ({ idx, valor: l.valorFaturado || l.valorPedido })).filter((i) => i.valor > 0);
      const escolha = alvo > 0 ? combinacao(itens, alvo, tolerancia(alvo)) : null;
      if (escolha) {
        // Inclui também as demais linhas do mesmo pedido da representada
        const reps = new Set(escolha.map((i) => chaveNumero(disponiveis[i].pedidoRepresentada)).filter(Boolean));
        for (const l of disponiveis) if (escolha.includes(disponiveis.indexOf(l)) || (l.pedidoRepresentada && reps.has(chaveNumero(l.pedidoRepresentada)))) vincular(l, o, 'sugestao');
      } else if (os.length === 1) {
        for (const l of disponiveis) vincular(l, o, 'sugestao');
      }
    }
  }

  // Resultado por pedido
  const final = new Set(linhas.filter((l) => l.pedidoId).map((l) => l.pedidoId as string));
  const listaPedidos = [...noEscopo.filter((o) => !final.has(String(o.id))), ...pedidos.filter((o) => final.has(String(o.id)))];
  const vistos = new Set<string>();
  const resultado: PedidoAnalisado[] = [];
  for (const o of listaPedidos) {
    const id = String(o.id);
    if (vistos.has(id)) continue;
    vistos.add(id);
    const minhas = linhas.filter((l) => l.pedidoId === id);
    const valor = valorPedido(o);
    const existentes: string[] = (Array.isArray(o.factoryOrderNumbers) ? o.factoryOrderNumbers : []).map((n: any) => String(n)).filter(Boolean);
    const chavesExistentes = new Set(existentes.map(chaveNumero));
    const numerosNovos: string[] = [];
    for (const l of minhas) {
      const k = chaveNumero(l.pedidoRepresentada);
      if (k && !chavesExistentes.has(k)) { chavesExistentes.add(k); numerosNovos.push(l.pedidoRepresentada); }
    }
    const notasPlanilha: NotaVinculada[] = minhas
      .filter((l) => l.notaFiscal || l.valorFaturado > 0)
      .map((l) => ({ numero: l.notaFiscal, data: l.dataFaturamento, valor: l.valorFaturado, pedidoRepresentada: l.pedidoRepresentada }));
    // Uma nota pode vir em várias linhas (uma por item): soma os valores da mesma nota
    const notasMap = new Map<string, NotaVinculada>();
    for (const n of notasPlanilha) {
      const k = notaChave(n) + (n.numero ? '' : `#${notasMap.size}`);
      const prev = notasMap.get(k);
      notasMap.set(k, prev ? { ...prev, valor: round2(prev.valor + n.valor), data: prev.data || n.data } : n);
    }
    const notas = [...notasMap.values()];
    const chavesNotas = new Set(notas.map(notaChave));
    const anteriores: NotaVinculada[] = (Array.isArray(o.representedInvoices) ? o.representedInvoices : [])
      .filter((n: any) => n && !chavesNotas.has(notaChave(n)));
    const faturado = round2([...notas, ...anteriores].reduce((s, n) => s + (Number(n.valor) || 0), 0));
    const diferenca = round2(valor - faturado);
    const avisos: string[] = [];

    let statusValores: StatusPedido;
    if (minhas.length === 0 && anteriores.length === 0) statusValores = 'nao_consta';
    else if (faturado <= 0) statusValores = 'recebido';
    else if (Math.abs(diferenca) <= tolerancia(valor)) statusValores = 'conciliado';
    else if (diferenca > 0) statusValores = 'parcial';
    else { statusValores = 'divergente'; avisos.push('Faturado acima do valor do pedido.'); }

    if (minhas.some((l) => cancelado(l.situacao))) { statusValores = 'divergente'; avisos.push('Pedido cancelado na representada.'); }
    const docPedido = digits(o.clientCnpjCpf || o.clientDocument || '');
    if (docPedido.length >= 11 && minhas.some((l) => l.documento.length >= 11 && l.documento !== docPedido)) {
      statusValores = 'divergente';
      avisos.push('CNPJ/CPF do cliente diferente do pedido.');
    }
    // Valor do pedido como digitado na representada (repetido nas linhas do mesmo pedido dela)
    const valorPorPedidoRep = new Map<string, number>();
    for (const l of minhas) if (l.valorPedido > 0) valorPorPedidoRep.set(chaveNumero(l.pedidoRepresentada) || `#${l.linha}`, l.valorPedido);
    const valorPlanilha = round2([...valorPorPedidoRep.values()].reduce((s, v) => s + v, 0));
    if (statusValores === 'recebido' && valorPlanilha > 0 && Math.abs(valorPlanilha - valor) > tolerancia(valor)) {
      avisos.push(`Valor digitado na representada (${valorPlanilha.toFixed(2)}) diferente do pedido.`);
    }

    const metodos = new Set(minhas.map((l) => l.metodo));
    const metodo: Metodo | null = minhas.length === 0 ? null
      : metodos.has('sugestao') ? 'sugestao'
      : metodos.has('manual') ? 'manual'
      : metodos.has('numero_representada') ? 'numero_representada'
      : metodos.has('nosso_numero') ? 'nosso_numero' : 'mesmo_pedido_representada';
    const status: StatusPedido = metodo === 'sugestao' ? 'sugestao' : statusValores;
    const pct = numero(o.commissionPercentage ?? o.commissionPercent ?? 0);

    resultado.push({
      id,
      numero: String(o.orderNumber || id),
      data: String(o.orderDate || '').slice(0, 10),
      representada: nomeRepresentada(o),
      representadaId: idRepresentada(o),
      cliente: String(o.clientName || ''),
      documento: docPedido,
      valor,
      comissaoPercentual: pct,
      statusAtual: String(o.status || ''),
      numerosRepresentada: existentes,
      numerosNovos,
      linhas: minhas.map((l) => l.linha),
      metodo,
      notas,
      notasAnteriores: anteriores,
      faturado,
      diferenca,
      comissaoFaturada: round2(faturado * pct / 100),
      status,
      statusValores,
      avisos,
    });
  }

  const ordem: Record<StatusPedido, number> = { divergente: 0, sugestao: 1, parcial: 2, recebido: 3, nao_consta: 4, conciliado: 5 };
  resultado.sort((a, b) => ordem[a.status] - ordem[b.status] || a.numero.localeCompare(b.numero));

  const conta = (s: StatusPedido) => resultado.filter((p) => p.status === s).length;
  return {
    pedidos: resultado,
    linhas,
    resumo: {
      pedidos: resultado.length,
      conciliados: conta('conciliado'),
      parciais: conta('parcial'),
      recebidos: conta('recebido'),
      divergentes: conta('divergente'),
      sugestoes: conta('sugestao'),
      naoConstam: conta('nao_consta'),
      linhas: linhas.filter((l) => l.status !== 'ignorada').length,
      linhasSemPedido: linhas.filter((l) => l.status === 'sem_pedido').length,
      valorPedidos: round2(resultado.reduce((s, p) => s + p.valor, 0)),
      valorFaturado: round2(resultado.reduce((s, p) => s + p.faturado, 0)),
      comissaoFaturada: round2(resultado.reduce((s, p) => s + p.comissaoFaturada, 0)),
    },
  };
}

/** Situação do pedido no MotorDesk após confirmar a conciliação. */
export function statusAposConciliacao(p: PedidoAnalisado, statusAtual: string): { status: string; reconciliationStatus: string } {
  const sv = p.statusValores;
  const rec = sv === 'conciliado' ? 'CONCILIADO' : sv === 'parcial' ? 'PARCIAL' : sv === 'recebido' ? 'RECEBIDO' : 'DIVERGENTE';
  if (p.faturado > 0) return { status: p.faturado + 0.005 >= p.valor && sv !== 'parcial' ? 'FATURADO_TOTAL' : 'FATURADO_PARCIAL', reconciliationStatus: rec };
  if (cancelado(statusAtual)) return { status: statusAtual, reconciliationStatus: rec };
  return { status: /DIGITA|RASCUNHO|DRAFT/i.test(statusAtual) || !statusAtual ? 'ENVIADO_FABRICA' : statusAtual, reconciliationStatus: rec };
}
