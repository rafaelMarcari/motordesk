/**
 * Telas complementares do módulo Transações (/api/financeiro):
 *
 * GET  /contatos                 clientes, fornecedores e demais contatos, com "deve para mim" / "eu devo" e aniversariantes
 * POST /contatos, PUT /contatos/:ref
 * GET  /relatorio?de&ate         lançamentos e transferências do período (os relatórios são montados na tela)
 * GET  /importacoes              histórico de importações
 * POST /importacoes/lancamentos  planilha padrão (ou exportada de outro sistema) já mapeada na tela
 * POST /importacoes/contatos     planilha de contatos
 * POST /importacoes/ofx          extrato OFX (itens já lidos na tela) → fica pendente para conciliar
 * GET  /conciliacoes?contaId     itens do extrato com sugestões de lançamentos
 * POST /conciliacoes             vincular / criar lançamento / ignorar / desfazer
 */
import type { Express } from "express";
import {
  type TransacoesDeps, type Natureza, COL, PREFIXO, SEP, hojeISO, num, r2, dia, texto, cancelado, daEmpresa,
  principalId, historico, transacoesDe, transferenciasDe, contasDaEmpresa, montarLancamentos, aplicarPagamentos, localizar,
} from "./transacoes.ts";

const norm = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const digitos = (s: any) => String(s ?? "").replace(/\D/g, "");
const TIPOS_CONTATO = ["cliente", "fornecedor", "colaborador", "socio", "associado", "outro"] as const;
type TipoContato = typeof TIPOS_CONTATO[number];
const tipoContato = (v: any): TipoContato => (TIPOS_CONTATO as readonly string[]).includes(String(v)) ? (v as TipoContato) : "outro";
const MAX_LINHAS = 5000;

function contatosDe(store: any, companyId: string) {
  const lista: any[] = [];
  for (const c of Array.isArray(store?.clients) ? store.clients : []) {
    if (!daEmpresa(c, companyId) || cancelado(c.status) || c.active === false) continue;
    lista.push({ ref: "C" + SEP + c.id, id: c.id, tipo: "cliente", nome: c.name || c.companyName || "", documento: c.cpfCnpj || c.cpf || c.cnpj || "", email: c.email || "", telefone: c.phone || c.cellphoneCommercial || c.cellphonePersonal || c.whatsapp || "", nascimento: dia(c.birthDate || c.birthday || c.dataNascimento), observacao: c.notes || "", atualizadoEm: c.updatedAt || c.createdAt || "" });
  }
  for (const s of Array.isArray(store?.suppliers) ? store.suppliers : []) {
    if (!daEmpresa(s, companyId) || cancelado(s.status) || s.status === "inactive") continue;
    lista.push({ ref: "F" + SEP + s.id, id: s.id, tipo: "fornecedor", nome: s.name || s.companyName || s.tradeName || "", documento: s.cnpjCpf || s.cnpj || s.cpf || "", email: s.email || "", telefone: s.phone || "", nascimento: dia(s.birthDate), observacao: s.notes || "", atualizadoEm: s.updatedAt || s.createdAt || "" });
  }
  for (const o of Array.isArray(store?.financeContacts) ? store.financeContacts : []) {
    if (!daEmpresa(o, companyId) || o.ativo === false) continue;
    lista.push({ ref: "O" + SEP + o.id, id: o.id, tipo: tipoContato(o.tipo), nome: o.nome || "", documento: o.documento || "", email: o.email || "", telefone: o.telefone || "", nascimento: dia(o.nascimento), observacao: o.observacao || "", atualizadoEm: o.updatedAt || o.createdAt || "" });
  }
  return lista.filter((c) => c.nome);
}

export function registerFinanceiroExtrasRoutes(app: Express, d: TransacoesDeps) {
  const ctx = (req: any, res: any, need: any, natureza: Natureza | null, tela: any) => {
    const r = d.access(req, need, natureza, tela);
    if ("status" in r) { res.status(r.status).json({ success: false, error: r.error }); return null; }
    return r;
  };
  const falha = (res: any, err: any) => res.status(err?.httpStatus || 503).json({ success: false, error: err?.httpStatus ? err.message : "Não foi possível gravar agora. Tente novamente." });
  const erro = (msg: string, status = 400) => Object.assign(new Error(msg), { httpStatus: status });
  const registrarImportacao = (current: any, c: any, dados: any) => ({
    ...current,
    financeImports: [{ id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, companyId: c.companyId, importadoEm: new Date().toISOString(), importadoPor: c.actor, _rev: d.nextRev(), ...dados }, ...(Array.isArray(current.financeImports) ? current.financeImports : [])],
  });

  // ------------------------------------------------------------------ Contatos
  app.get("/api/financeiro/contatos", (req: any, res) => {
    const c = ctx(req, res, "ler", null, "contatos");
    if (!c) return;
    const store = d.getStore();
    const contatos = contatosDe(store, c.companyId);
    const porId = new Map<string, any>();
    const porNome = new Map<string, any>();
    for (const x of contatos) { porId.set(x.id, x); if (!porNome.has(norm(x.nome))) porNome.set(norm(x.nome), x); x.aReceber = 0; x.aPagar = 0; x.qtdReceber = 0; x.qtdPagar = 0; }
    const semCadastro = new Map<string, any>();
    for (const nat of ["receber", "pagar"] as Natureza[]) {
      for (const t of transacoesDe(store, c.companyId, nat)) {
        if (t.pago) continue;
        const aberto = r2(t.valor - t.valorPago);
        if (aberto <= 0 || !t.contato) continue;
        let alvo = (t.contatoId && porId.get(t.contatoId)) || porNome.get(norm(t.contato));
        if (!alvo) {
          const k = norm(t.contato);
          alvo = semCadastro.get(k);
          if (!alvo) { alvo = { ref: "N" + SEP + k, id: "", tipo: nat === "receber" ? "cliente" : "fornecedor", nome: t.contato, documento: "", email: "", telefone: "", nascimento: "", semCadastro: true, aReceber: 0, aPagar: 0, qtdReceber: 0, qtdPagar: 0 }; semCadastro.set(k, alvo); }
        }
        if (nat === "receber") { alvo.aReceber = r2(alvo.aReceber + aberto); alvo.qtdReceber++; } else { alvo.aPagar = r2(alvo.aPagar + aberto); alvo.qtdPagar++; }
      }
    }
    const todos = [...contatos, ...semCadastro.values()];
    const mes = hojeISO().slice(5, 7);
    const deve = todos.filter((x) => x.aReceber > 0);
    const devo = todos.filter((x) => x.aPagar > 0);
    res.json({
      success: true, contatos: todos,
      resumo: {
        deveParaMim: { valor: r2(deve.reduce((a, x) => a + x.aReceber, 0)), contatos: deve.length },
        euDevo: { valor: r2(devo.reduce((a, x) => a + x.aPagar, 0)), contatos: devo.length },
        aniversariantes: todos.filter((x) => x.nascimento && x.nascimento.slice(5, 7) === mes).length,
      },
      podeEditar: c.pode("criar", "receber") || c.pode("criar", "pagar"),
    });
  });

  const validarContato = (b: any) => {
    const nome = texto(b?.nome, 120);
    if (!nome) return { erro: "Informe o nome." };
    const doc = digitos(b?.documento);
    if (doc && doc.length !== 11 && doc.length !== 14) return { erro: "CPF deve ter 11 dígitos e CNPJ, 14." };
    return { v: { tipo: tipoContato(b?.tipo), nome, documento: texto(b?.documento, 20), email: texto(b?.email, 120), telefone: texto(b?.telefone, 30), nascimento: dia(b?.nascimento), observacao: texto(b?.observacao, 500) } };
  };
  const duplicado = (store: any, companyId: string, v: any, ignorarRef = "") => {
    const doc = digitos(v.documento);
    return contatosDe(store, companyId).find((x) => x.ref !== ignorarRef && x.tipo === v.tipo && ((doc && digitos(x.documento) === doc) || (!doc && norm(x.nome) === norm(v.nome))));
  };
  const novoContato = (current: any, c: any, v: any, sufixo = "") => {
    const agora = new Date().toISOString();
    const id = `${Date.now()}${sufixo}`;
    if (v.tipo === "cliente") {
      const reg = { id: `cli-${id}`, companyId: c.companyId, name: v.nome, cpfCnpj: v.documento || undefined, type: digitos(v.documento).length === 14 ? "JURIDICA" : "FISICA", email: v.email || undefined, phone: v.telefone || undefined, birthDate: v.nascimento || undefined, notes: v.observacao || undefined, createdAt: agora, _rev: d.nextRev() };
      return { ...current, clients: [...(current.clients || []), reg] };
    }
    if (v.tipo === "fornecedor") {
      const reg = { id: `sup-${id}`, companyId: c.companyId, name: v.nome, cnpjCpf: v.documento || undefined, email: v.email || undefined, phone: v.telefone || undefined, birthDate: v.nascimento || undefined, notes: v.observacao || undefined, status: "active", createdAt: agora, _rev: d.nextRev() };
      return { ...current, suppliers: [...(current.suppliers || []), reg] };
    }
    const reg = { id: `fct-${id}`, companyId: c.companyId, ...v, ativo: true, createdAt: agora, createdBy: c.actor, _rev: d.nextRev() };
    return { ...current, financeContacts: [...(current.financeContacts || []), reg] };
  };

  app.post("/api/financeiro/contatos", async (req: any, res) => {
    const c = ctx(req, res, "criar", null, "contatos");
    if (!c) return;
    const { v, erro: e } = validarContato(req.body);
    if (e) return res.status(400).json({ success: false, error: e });
    try {
      await d.mutateStore((current) => {
        if (duplicado(current, c.companyId, v)) throw erro("Já existe um contato desse tipo com esse " + (digitos(v!.documento) ? "CPF/CNPJ." : "nome."), 409);
        return novoContato(current, c, v);
      }, { source: "contato_criar", companyId: c.companyId, userId: c.userId });
      res.json({ success: true });
    } catch (err: any) { falha(res, err); }
  });

  app.put("/api/financeiro/contatos/:ref", async (req: any, res) => {
    const c = ctx(req, res, "criar", null, "contatos");
    if (!c) return;
    const ref = String(req.params.ref || "");
    const [pre, id] = ref.split(SEP);
    const { v, erro: e } = validarContato(req.body);
    if (e) return res.status(400).json({ success: false, error: e });
    try {
      await d.mutateStore((current) => {
        const col = pre === "C" ? "clients" : pre === "F" ? "suppliers" : pre === "O" ? "financeContacts" : "";
        if (!col) throw erro("Contato inválido.");
        const lista = Array.isArray(current[col]) ? [...current[col]] : [];
        const idx = lista.findIndex((x: any) => x && x.id === id && daEmpresa(x, c.companyId));
        if (idx < 0) throw erro("Contato não encontrado.", 404);
        const atual = lista[idx];
        v!.tipo = pre === "C" ? "cliente" : pre === "F" ? "fornecedor" : tipoContato(req.body?.tipo || atual.tipo);
        if (duplicado(current, c.companyId, v, ref)) throw erro("Já existe um contato desse tipo com esse CPF/CNPJ ou nome.", 409);
        const agora = new Date().toISOString();
        lista[idx] = pre === "C"
          ? { ...atual, name: v!.nome, cpfCnpj: v!.documento || atual.cpfCnpj, email: v!.email, phone: v!.telefone, birthDate: v!.nascimento || undefined, notes: v!.observacao || atual.notes, updatedAt: agora, _rev: d.nextRev() }
          : pre === "F"
            ? { ...atual, name: v!.nome, cnpjCpf: v!.documento || atual.cnpjCpf, email: v!.email, phone: v!.telefone, birthDate: v!.nascimento || undefined, notes: v!.observacao || atual.notes, updatedAt: agora, _rev: d.nextRev() }
            : { ...atual, ...v, updatedAt: agora, _rev: d.nextRev() };
        return { ...current, [col]: lista };
      }, { source: "contato_alterar", companyId: c.companyId, userId: c.userId });
      res.json({ success: true });
    } catch (err: any) { falha(res, err); }
  });

  // ------------------------------------------------------------------ Relatórios
  app.get("/api/financeiro/relatorio", (req: any, res) => {
    const c = ctx(req, res, "ler", null, "relatorios");
    if (!c) return;
    const de = dia(req.query?.de) || hojeISO().slice(0, 8) + "01";
    const ate = dia(req.query?.ate) || hojeISO();
    if (ate < de) return res.status(400).json({ success: false, error: "A data final é anterior à inicial." });
    if ((Date.parse(ate) - Date.parse(de)) / 86400000 > 3 * 366) return res.status(400).json({ success: false, error: "Escolha um período de até 3 anos." });
    const store = d.getStore();
    const dentro = (x: string) => x && x >= de && x <= ate;
    const transacoes = [...transacoesDe(store, c.companyId, "receber"), ...transacoesDe(store, c.companyId, "pagar")]
      .filter((t) => dentro(t.data) || dentro(t.dataPagamento) || dentro(t.competencia));
    // Histórico: 12 meses até o fim do período (por vencimento)
    const contas = contasDaEmpresa(store, c.companyId);
    res.json({ success: true, de, ate, transacoes, transferencias: transferenciasDe(store, c.companyId).filter((t) => dentro(t.data)), contas });
  });

  // ------------------------------------------------------------------ Importações
  app.get("/api/financeiro/importacoes", (req: any, res) => {
    const c = ctx(req, res, "ler", null, "importacoes");
    if (!c) return;
    const lista = (Array.isArray(d.getStore()?.financeImports) ? d.getStore().financeImports : []).filter((x: any) => daEmpresa(x, c.companyId)).slice(0, 200);
    res.json({ success: true, importacoes: lista, contas: contasDaEmpresa(d.getStore(), c.companyId) });
  });

  app.post("/api/financeiro/importacoes/lancamentos", async (req: any, res) => {
    const b = req.body || {};
    const linhas: any[] = Array.isArray(b.linhas) ? b.linhas.slice(0, MAX_LINHAS) : [];
    if (!linhas.length) return res.status(400).json({ success: false, error: "Nenhuma linha para importar." });
    const naturezas = new Set<Natureza>(linhas.map((l) => (l.tipo === "receita" ? "receber" : "pagar")));
    let c: any = null;
    for (const n of naturezas) { c = ctx(req, res, "criar", n, "importacoes"); if (!c) return; }
    const algumPago = linhas.some((l) => l.pago);
    for (const n of naturezas) if (algumPago && !c.pode("baixar", n)) return res.status(403).json({ success: false, error: "Seu usuário não pode registrar pagamentos; desmarque a coluna de pago." });
    const arquivo = texto(b.arquivo, 200) || "planilha";
    const origem = b.origem === "zeropaper" ? "Zero Paper" : "Importação padrão";
    let importadas = 0;
    const ignoradas: Array<{ linha: number; motivo: string }> = [];
    try {
      await d.mutateStore((current) => {
        let next: any = { ...current };
        const importId = `imp-${Date.now()}`;
        const contas = contasDaEmpresa(current, c.companyId);
        const existentes = new Set([...transacoesDe(current, c.companyId, "receber"), ...transacoesDe(current, c.companyId, "pagar")].map((t) => [t.natureza, t.data, t.valor.toFixed(2), norm(t.descricao)].join("|")));
        const movs: any[] = [];
        const novos: Record<Natureza, any[]> = { receber: [], pagar: [] };
        linhas.forEach((l, i) => {
          const natureza: Natureza = l.tipo === "receita" ? "receber" : "pagar";
          const valor = r2(Math.abs(num(l.valor)));
          const data = dia(l.data);
          const descricao = texto(l.descricao, 200);
          if (!descricao || !(valor > 0) || !data) { ignoradas.push({ linha: num(l.linha) || i + 1, motivo: !data ? "data inválida" : !(valor > 0) ? "valor inválido" : "sem descrição" }); return; }
          const chave = [natureza, data, valor.toFixed(2), norm(descricao)].join("|");
          if (existentes.has(chave)) { ignoradas.push({ linha: num(l.linha) || i + 1, motivo: "já existe um lançamento igual" }); return; }
          existentes.add(chave);
          const conta = contas.find((x) => norm(x.nome) === norm(l.conta)) || contas.find((x) => x.principal);
          const r = montarLancamentos(next, c, natureza, { descricao, valor, data, contato: texto(l.contato, 120), categoria: texto(l.categoria, 80), modo: texto(l.modo, 60), observacao: texto(l.observacao, 500), contaId: conta?.id, rep: "UNICA", pago: Boolean(l.pago), dataPagamento: dia(l.dataPagamento) || data, origem: "importacao", importId }, d.nextRev, `${Date.now()}${String(i).padStart(5, "0")}`);
          novos[natureza].push(...r.novos);
          movs.push(...r.movs);
          importadas++;
        });
        if (!importadas) return registrarImportacao(current, c, { arquivo, origem, tipo: "lancamentos", situacao: "Sem novas transações", transacoes: 0, ignoradas: ignoradas.length });
        next = {
          ...next,
          accountsReceivable: [...novos.receber, ...(current.accountsReceivable || [])],
          accountsPayable: [...novos.pagar, ...(current.accountsPayable || [])],
          financialTransactions: [...(current.financialTransactions || []), ...movs],
          history: historico(current, c.companyId, c.userId, c.actor, "Importação de lançamentos", `${importadas} lançamento(s) importado(s) de ${arquivo} (${origem}).`),
        };
        return registrarImportacao(next, c, { id: importId, arquivo, origem, tipo: "lancamentos", situacao: ignoradas.length ? "Importado com avisos" : "Importado", transacoes: importadas, ignoradas: ignoradas.length });
      }, { source: "importacao_lancamentos", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, importadas, ignoradas });
    } catch (err: any) { falha(res, err); }
  });

  app.post("/api/financeiro/importacoes/contatos", async (req: any, res) => {
    const c = ctx(req, res, "criar", null, "importacoes");
    if (!c) return;
    const linhas: any[] = Array.isArray(req.body?.linhas) ? req.body.linhas.slice(0, MAX_LINHAS) : [];
    if (!linhas.length) return res.status(400).json({ success: false, error: "Nenhuma linha para importar." });
    const arquivo = texto(req.body?.arquivo, 200) || "planilha";
    let importados = 0;
    const ignoradas: Array<{ linha: number; motivo: string }> = [];
    try {
      await d.mutateStore((current) => {
        let next = current;
        linhas.forEach((l, i) => {
          const { v, erro: e } = validarContato(l);
          if (e) { ignoradas.push({ linha: num(l.linha) || i + 1, motivo: e }); return; }
          if (duplicado(next, c.companyId, v)) { ignoradas.push({ linha: num(l.linha) || i + 1, motivo: "contato já cadastrado" }); return; }
          next = novoContato(next, c, v, String(i).padStart(5, "0"));
          importados++;
        });
        return registrarImportacao(next, c, { arquivo, origem: "Contatos", tipo: "contatos", situacao: importados ? (ignoradas.length ? "Importado com avisos" : "Importado") : "Sem novos contatos", transacoes: importados, ignoradas: ignoradas.length });
      }, { source: "importacao_contatos", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, importados, ignoradas });
    } catch (err: any) { falha(res, err); }
  });

  app.post("/api/financeiro/importacoes/ofx", async (req: any, res) => {
    const c = ctx(req, res, "baixar", null, "importacoes");
    if (!c) return;
    const b = req.body || {};
    const itens: any[] = Array.isArray(b.itens) ? b.itens.slice(0, MAX_LINHAS) : [];
    if (!itens.length) return res.status(400).json({ success: false, error: "O arquivo não tem movimentações." });
    const arquivo = texto(b.arquivo, 200) || "extrato.ofx";
    let novos = 0, repetidos = 0;
    try {
      await d.mutateStore((current) => {
        const contas = contasDaEmpresa(current, c.companyId);
        const conta = contas.find((x) => x.id === b.contaId);
        if (!conta) throw erro("Escolha a conta do extrato.");
        const extratos = Array.isArray(current.bankStatements) ? current.bankStatements : [];
        const jaTem = new Set<string>();
        for (const s of extratos) if (daEmpresa(s, c.companyId) && (s.bankAccountId || principalId(c.companyId)) === conta.id) for (const it of s.items || []) if (it?.fitId) jaTem.add(String(it.fitId));
        const base = Date.now();
        const items = itens.map((it, i) => {
          const valor = r2(num(it.valor));
          const data = dia(it.data);
          const fitId = texto(it.fitId, 80) || `${data}-${valor}-${norm(it.descricao).slice(0, 30)}-${i}`;
          if (!data || !valor) return null;
          if (jaTem.has(fitId)) { repetidos++; return null; }
          jaTem.add(fitId);
          novos++;
          return { id: `st-${base}-${i}`, date: data, type: valor >= 0 ? "CREDIT" : "DEBIT", fitId, amount: valor, description: texto(it.descricao, 200) || (valor >= 0 ? "Crédito" : "Débito"), reconciled: false };
        }).filter(Boolean);
        const datas = items.map((x: any) => x.date).sort();
        const extrato = { id: `stmt-${base}`, companyId: c.companyId, bankAccountId: conta.id, fileName: arquivo, bankName: texto(b.banco, 80) || conta.nome, agency: texto(b.agencia, 20), accountNumber: texto(b.numeroConta, 30), startDate: datas[0] || "", endDate: datas[datas.length - 1] || "", importedAt: new Date().toISOString(), importedBy: c.actor, items, _rev: d.nextRev() };
        const next = items.length ? { ...current, bankStatements: [...extratos, extrato] } : current;
        return registrarImportacao(next, c, { arquivo, origem: "OFX", tipo: "ofx", contaId: conta.id, situacao: items.length ? "Aguardando conciliação" : "Sem novas movimentações", transacoes: novos, ignoradas: repetidos });
      }, { source: "importacao_ofx", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, novos, repetidos });
    } catch (err: any) { falha(res, err); }
  });

  // ------------------------------------------------------------------ Conciliação (OFX)
  app.get("/api/financeiro/conciliacoes", (req: any, res) => {
    const c = ctx(req, res, "ler", null, "importacoes");
    if (!c) return;
    const store = d.getStore();
    const contas = contasDaEmpresa(store, c.companyId);
    const contaId = contas.some((x) => x.id === req.query?.contaId) ? String(req.query.contaId) : contas[0].id;
    const todas = [...transacoesDe(store, c.companyId, "receber"), ...transacoesDe(store, c.companyId, "pagar")];
    const porId = new Map(todas.map((t) => [t.id, t]));
    const itens: any[] = [];
    const jaConciliados = new Set<string>();
    for (const s of Array.isArray(store?.bankStatements) ? store.bankStatements : []) if (daEmpresa(s, c.companyId)) for (const it of s.items || []) if (it?.reconciled && it.reconciledTransactionId) jaConciliados.add(it.reconciledTransactionId);
    const DIA = 86400000;
    const candidato = (t: any, tipo: string, alvo: number, tData: number) => t.tipo === tipo && !jaConciliados.has(t.id) && (t.pago
      ? Math.abs(t.valor - alvo) < 0.01 && Math.abs(Date.parse(t.dataPagamento || t.data) - tData) <= 10 * DIA
      : Math.abs((t.valor - t.valorPago) - alvo) < 0.01 && Math.abs(Date.parse(t.data) - tData) <= 10 * DIA);
    for (const s of Array.isArray(store?.bankStatements) ? store.bankStatements : []) {
      if (!daEmpresa(s, c.companyId) || (s.bankAccountId || principalId(c.companyId)) !== contaId) continue;
      for (const it of s.items || []) {
        if (!it) continue;
        const valor = num(it.amount);
        const situacao = it.reconciled ? "conciliado" : it.ignored ? "ignorado" : "pendente";
        const linha: any = { statementId: s.id, itemId: it.id, arquivo: s.fileName, data: dia(it.date), valor: r2(valor), descricao: it.description || "", fitId: it.fitId || "", situacao };
        if (situacao === "conciliado") {
          const t = it.reconciledTransactionId && porId.get(it.reconciledTransactionId);
          linha.transacaoId = it.reconciledTransactionId || "";
          linha.transacaoDescricao = t ? `${t.descricao}${t.contato ? " — " + t.contato : ""}` : (it.reconciledAccountReceivableId || it.reconciledBillingClosingId ? "Conciliado anteriormente" : "");
        } else if (situacao === "pendente") {
          const tipo = valor >= 0 ? "receita" : "despesa";
          const alvo = Math.abs(valor);
          const tData = Date.parse(linha.data);
          const ref = (t: any) => Date.parse(t.pago ? (t.dataPagamento || t.data) : t.data);
          linha.sugestoes = todas
            .filter((t) => candidato(t, tipo, alvo, tData))
            .sort((a, b2) => Math.abs(ref(a) - tData) - Math.abs(ref(b2) - tData))
            .slice(0, 3)
            .map((t) => ({ id: t.id, descricao: t.descricao, contato: t.contato, data: t.pago ? (t.dataPagamento || t.data) : t.data, valor: t.valor, categoria: t.categoria, pago: t.pago }));
        }
        itens.push(linha);
      }
    }
    itens.sort((a, b2) => b2.data.localeCompare(a.data));
    const abertos = todas.filter((t) => !jaConciliados.has(t.id)).map((t) => ({ id: t.id, tipo: t.tipo, descricao: t.descricao, contato: t.contato, data: t.pago ? (t.dataPagamento || t.data) : t.data, valor: t.pago ? t.valor : r2(t.valor - t.valorPago), pago: t.pago }));
    const cats = (tipo: string) => [...new Set(todas.filter((t) => t.tipo === tipo).map((t) => t.categoria).filter((x) => x && x !== "Sem categoria"))].sort();
    res.json({ success: true, contaId, contas, itens, abertos, categorias: { receita: cats("receita"), despesa: cats("despesa") } });
  });

  app.post("/api/financeiro/conciliacoes", async (req: any, res) => {
    const acoes: any[] = Array.isArray(req.body?.acoes) ? req.body.acoes.slice(0, 500) : [];
    if (!acoes.length) return res.status(400).json({ success: false, error: "Nenhuma ação informada." });
    let c: any = null;
    for (const n of ["receber", "pagar"] as Natureza[]) { c = ctx(req, res, "baixar", n, "importacoes"); if (!c) return; }
    let feitos = 0;
    const avisos: string[] = [];
    try {
      await d.mutateStore((current) => {
        const next: any = { ...current, accountsReceivable: [...(current.accountsReceivable || [])], accountsPayable: [...(current.accountsPayable || [])], bankStatements: [...(current.bankStatements || [])] };
        const movs: any[] = [];
        for (const a of acoes) {
          const si = next.bankStatements.findIndex((s: any) => s && s.id === a.statementId && daEmpresa(s, c.companyId));
          if (si < 0) { avisos.push("extrato não encontrado"); continue; }
          const s = { ...next.bankStatements[si], items: [...(next.bankStatements[si].items || [])] };
          const ii = s.items.findIndex((x: any) => x && x.id === a.itemId);
          if (ii < 0) { avisos.push("movimentação não encontrada"); continue; }
          const it = { ...s.items[ii] };
          const contaId = s.bankAccountId || principalId(c.companyId);
          const valor = num(it.amount);
          const natureza: Natureza = valor >= 0 ? "receber" : "pagar";
          if (a.acao === "vincular" || a.acao === "criar") {
            if (it.reconciled) { avisos.push(`${it.description}: já conciliado`); continue; }
            let txId = String(a.transacaoId || "");
            if (a.acao === "criar") {
              const descricao = texto(a.descricao, 200) || it.description || (valor >= 0 ? "Crédito em conta" : "Débito em conta");
              const r = montarLancamentos(next, c, natureza, { descricao, valor: Math.abs(valor), data: dia(it.date), contato: texto(a.contato, 120), categoria: texto(a.categoria, 80) || (valor >= 0 ? "Outras receitas" : "Outras despesas"), contaId, rep: "UNICA", pago: true, dataPagamento: dia(it.date), origem: "conciliacao" }, d.nextRev, `${Date.now()}${String(feitos).padStart(4, "0")}`);
              next[COL[natureza]] = [...r.novos, ...next[COL[natureza]]];
              movs.push(...r.movs);
              txId = PREFIXO[natureza] + SEP + r.novos[0].id;
              it.criadoPelaConciliacao = true;
            } else {
              const l = localizar(next, txId, c.companyId);
              if (!l || l.natureza !== natureza) { avisos.push(`${it.description}: lançamento não encontrado`); continue; }
              const jaVinculado = next.bankStatements.some((s2: any) => daEmpresa(s2, c.companyId) && (s2.items || []).some((x: any) => x && x.reconciled && x.reconciledTransactionId === txId));
              if (jaVinculado) { avisos.push(`${it.description}: esse lançamento já está conciliado com outra movimentação`); continue; }
              const r = aplicarPagamentos(next, c, [txId], true, dia(it.date), contaId, "", d.nextRev);
              movs.push(...r.movs);
              it.criadoPelaConciliacao = false;
              it.pagoPelaConciliacao = r.alterados > 0; // já estava pago: só vincula
            }
            Object.assign(it, { reconciled: true, ignored: false, reconciledTransactionId: txId, reconciledAt: new Date().toISOString(), reconciledBy: c.actor });
          } else if (a.acao === "ignorar") {
            Object.assign(it, { ignored: true, ignoredAt: new Date().toISOString(), ignoredBy: c.actor, ignoreReason: texto(a.motivo, 200) || undefined });
          } else if (a.acao === "desfazer") {
            if (it.reconciled && it.reconciledTransactionId && (it.pagoPelaConciliacao || it.criadoPelaConciliacao)) {
              const r = aplicarPagamentos(next, c, [it.reconciledTransactionId], false, hojeISO(), "", "", d.nextRev);
              movs.push(...r.movs);
              if (it.criadoPelaConciliacao) {
                const l = localizar(next, it.reconciledTransactionId, c.companyId);
                if (l) next[COL[l.natureza]][l.idx] = { ...next[COL[l.natureza]][l.idx], status: "cancelled", cancelReason: "Conciliação desfeita", cancelledAt: new Date().toISOString(), cancelledBy: c.actor, _rev: d.nextRev() };
              }
            }
            for (const k of ["reconciled", "ignored", "reconciledTransactionId", "reconciledAt", "reconciledBy", "criadoPelaConciliacao", "pagoPelaConciliacao", "ignoredAt", "ignoredBy", "ignoreReason"]) delete it[k];
            it.reconciled = false;
          } else { avisos.push("ação inválida"); continue; }
          s.items[ii] = it;
          s._rev = d.nextRev();
          next.bankStatements[si] = s;
          feitos++;
        }
        if (!feitos) return current;
        next.financialTransactions = [...(current.financialTransactions || []), ...movs];
        next.history = historico(current, c.companyId, c.userId, c.actor, "Conciliação bancária (OFX)", `${feitos} movimentação(ões) do extrato tratada(s).`);
        return next;
      }, { source: "conciliacao_ofx", companyId: c.companyId, userId: c.userId });
      res.json({ success: true, feitos, avisos });
    } catch (err: any) { falha(res, err); }
  });
}
