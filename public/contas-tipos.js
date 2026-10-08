/**
 * MotorDesk - Tipos de conta e contas recorrentes (Contas a Pagar e Contas a Receber)
 *
 *  - Tipos de conta: padrão (Salários, Aluguel, Energia...) e os cadastrados pela empresa, cada um com a
 *    periodicidade sugerida (fixa por tempo indeterminado ou determinado, variável mensal, avulsa, parcelada).
 *    O tipo escolhido no cadastro da conta preenche categoria e periodicidade.
 *  - Contas recorrentes: acompanhamento e encerramento (com data e motivo) das recorrências.
 * Regras e permissões são conferidas no servidor (/api/financeiro).
 */
(function () {
  'use strict';

  const API = '/api/financeiro';
  const PER = {
    FIXA_INDETERMINADA: ['Fixa – tempo indeterminado', '#3730a3', '#e0e7ff'],
    FIXA_MENSAL: ['Fixa – tempo determinado', '#075985', '#e0f2fe'],
    VARIAVEL_MENSAL: ['Variável mensal', '#6d28d9', '#ede9fe'],
    VARIAVEL: ['Avulsa / pontual', '#92400e', '#fef3c7'],
    PARCELADA: ['Parcelada / boleto', '#065f46', '#d1fae5'],
  };
  const CATEGORIAS_RECEBER = [
    ['O.S. / Serviços Mecânicos', 'O.S. / Serviços Mecânicos'], ['Venda de Peças / Balcão', 'Venda de Peças / Balcão'], ['Faturamento PJ / Frotas', 'Faturamento PJ / Frotas'],
    ['Faturamento Industrial', 'Faturamento Industrial (NF-e)'], ['Duplicatas', 'Duplicata Mercantil / Cobrança'], ['Adiantamento', 'Sinal / Adiantamento de Cliente'],
    ['Boletos', 'Boleto Bancário / CNAB'], ['Cartão / Pix', 'Cartão de Crédito / Pix'], ['Outros', 'Outros Títulos'],
  ];
  const CATEGORIAS = [
    ['Despesas Fixas', 'Despesas Operacionais / Fixas'], ['Nota Fiscal de Estoque', 'Nota Fiscal de Peças / Matéria-Prima'], ['Nota Fiscal de Serviço', 'Nota Fiscal de Serviço'],
    ['Folha de Pagamento & Comissões', 'Folha de Pagamento & Comissões'], ['Impostos', 'Impostos & Tributos'], ['Tarifas', 'Tarifas Bancárias & Financiamentos'],
    ['Adiantamentos', 'Adiantamento a Fornecedor'], ['Benefícios & Encargos', 'Benefícios & Encargos Sociais'], ['Outros', 'Outros Títulos'],
  ];
  // Mesmos tipos padrão do servidor (server/financeiro/recorrencias.ts) — usados no formulário de Contas a Pagar
  window.__MD_TIPOS_CONTA_PADRAO = [
    { id: 'padrao-salarios', nome: 'Salários e encargos', categoria: 'Folha de Pagamento & Comissões', periodicidade: 'FIXA_INDETERMINADA' },
    { id: 'padrao-prolabore', nome: 'Pró-labore', categoria: 'Folha de Pagamento & Comissões', periodicidade: 'FIXA_INDETERMINADA' },
    { id: 'padrao-aluguel', nome: 'Aluguel', categoria: 'Despesas Fixas', periodicidade: 'FIXA_MENSAL', meses: 12 },
    { id: 'padrao-condominio', nome: 'Condomínio', categoria: 'Despesas Fixas', periodicidade: 'FIXA_INDETERMINADA' },
    { id: 'padrao-energia', nome: 'Energia elétrica', categoria: 'Despesas Fixas', periodicidade: 'VARIAVEL_MENSAL' },
    { id: 'padrao-agua', nome: 'Água e esgoto', categoria: 'Despesas Fixas', periodicidade: 'VARIAVEL_MENSAL' },
    { id: 'padrao-internet', nome: 'Internet e telefone', categoria: 'Despesas Fixas', periodicidade: 'FIXA_INDETERMINADA' },
    { id: 'padrao-contabilidade', nome: 'Contabilidade', categoria: 'Nota Fiscal de Serviço', periodicidade: 'FIXA_INDETERMINADA' },
    { id: 'padrao-impostos', nome: 'Impostos (DAS, ICMS, ISS)', categoria: 'Impostos', periodicidade: 'VARIAVEL_MENSAL' },
    { id: 'padrao-comissoes', nome: 'Comissões', categoria: 'Folha de Pagamento & Comissões', periodicidade: 'VARIAVEL_MENSAL' },
    { id: 'padrao-fornecedor', nome: 'Fornecedor (nota fiscal)', categoria: 'Nota Fiscal de Estoque', periodicidade: 'PARCELADA' },
    { id: 'padrao-emprestimo', nome: 'Empréstimo / financiamento', categoria: 'Tarifas', periodicidade: 'PARCELADA' },
    { id: 'padrao-avulsa', nome: 'Despesa avulsa', categoria: 'Outros', periodicidade: 'VARIAVEL' },
  ];
  // Mesmos tipos padrão do servidor para o Contas a Receber
  window.__MD_TIPOS_CONTA_PADRAO_RECEBER = [
    { id: 'padrao-rec-mensalidade', nome: 'Mensalidade / contrato de cliente', categoria: 'Faturamento PJ / Frotas', periodicidade: 'FIXA_INDETERMINADA' },
    { id: 'padrao-rec-comissao', nome: 'Comissão de representação', categoria: 'Outros', periodicidade: 'VARIAVEL_MENSAL' },
    { id: 'padrao-rec-aluguel', nome: 'Aluguel recebido', categoria: 'Outros', periodicidade: 'FIXA_MENSAL', meses: 12 },
    { id: 'padrao-rec-venda-prazo', nome: 'Venda a prazo (parcelada)', categoria: 'Duplicatas', periodicidade: 'PARCELADA' },
    { id: 'padrao-rec-boleto', nome: 'Boleto / duplicata', categoria: 'Boletos', periodicidade: 'PARCELADA' },
    { id: 'padrao-rec-servico', nome: 'Serviço / O.S.', categoria: 'O.S. / Serviços Mecânicos', periodicidade: 'VARIAVEL' },
    { id: 'padrao-rec-balcao', nome: 'Venda de peças / balcão', categoria: 'Venda de Peças / Balcão', periodicidade: 'VARIAVEL' },
    { id: 'padrao-rec-adiantamento', nome: 'Sinal / adiantamento', categoria: 'Adiantamento', periodicidade: 'VARIAVEL' },
    { id: 'padrao-rec-avulsa', nome: 'Receita avulsa', categoria: 'Outros', periodicidade: 'VARIAVEL' },
  ];

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDia = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—');
  const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const user = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; } };
  const companyId = () => { try { const u = user() || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  const badge = (c, t) => '<span class="badge" style="color:' + c[1] + ';background:' + c[2] + '">' + esc(t || c[0]) + '</span>';
  const syncApp = () => { try { if (window.__motorDeskSyncNow) window.__motorDeskSyncNow('tipos-conta'); } catch (e) {} };

  async function api(method, path, body) {
    const url = API + path + (path.includes('?') ? '&' : '?') + 'natureza=' + natureza;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: body ? JSON.stringify(Object.assign({ natureza }, body)) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || data.success === false) throw new Error((data && data.error) || 'Erro HTTP ' + res.status);
    return data;
  }

  function ensureStyles() {
    if (document.getElementById('md-tc-style')) return;
    const st = document.createElement('style');
    st.id = 'md-tc-style';
    st.textContent = [
      '#md-tc{position:fixed;inset:0;z-index:2147483001;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}',
      '#md-tc .p{background:#fff;width:100%;max-width:1180px;height:calc(100vh - 24px);display:flex;flex-direction:column;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden}',
      '#md-tc .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-bottom:1px solid #e2e8f0}',
      '#md-tc h2{margin:0;font-size:18px}#md-tc .sub{margin:2px 0 0;font-size:13px;color:#64748b}#md-tc h3{font-size:14.5px;margin:0 0 8px}',
      '#md-tc .x{border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer}',
      '#md-tc .tabs{display:flex;gap:2px;padding:0 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc}',
      '#md-tc .tab{border:0;background:none;padding:11px 13px;font-size:13.5px;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent}',
      '#md-tc .tab[aria-selected=true]{color:#4338ca;border-bottom-color:#4338ca}',
      '#md-tc .bd{padding:16px 20px;overflow:auto;flex:1}',
      '#md-tc .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end}',
      '#md-tc label.f{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600;color:#334155}',
      '#md-tc input,#md-tc select{font:inherit;font-size:13.5px;font-weight:400;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#0f172a;min-width:0}',
      '#md-tc .box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;background:#f8fafc;margin-bottom:14px}',
      '#md-tc .btn{border:0;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;background:#4f46e5;color:#fff}',
      '#md-tc .btn.s{background:#e2e8f0;color:#1e293b}#md-tc .btn.d{background:#fee2e2;color:#b91c1c}#md-tc .btn.sm{padding:5px 9px;font-size:12px}#md-tc .btn:disabled{opacity:.55}',
      '#md-tc .tw{overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px}',
      '#md-tc table{border-collapse:collapse;width:100%;font-size:12.5px}',
      '#md-tc th,#md-tc td{text-align:left;padding:7px 8px;border-bottom:1px solid #eef2f7;vertical-align:top}',
      '#md-tc th{background:#f8fafc;font-size:11.5px;color:#475569}#md-tc td.r,#md-tc th.r{text-align:right;white-space:nowrap}',
      '#md-tc .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap}',
      '#md-tc .msg{font-size:13px;margin-top:8px}#md-tc .ok{color:#047857}#md-tc .bad{color:#b91c1c}#md-tc .muted{color:#64748b;font-size:12px}',
      '#md-tc .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '#md-tc .inline{background:#fff;border:1px solid #fca5a5;border-radius:8px;padding:8px;margin-top:6px}',
      '#md-tc .info{border:1px solid #c7d2fe;background:#eef2ff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;line-height:1.5}',
      '#btn-pay-tipos-conta,.md-btn-tipos-conta{padding:4px 10px;border-radius:4px;background:#eef2ff;border:1px solid #a5b4fc;font-size:12px;font-weight:600;color:#3730a3;cursor:pointer}',
    ].join('\n');
    document.head.appendChild(st);
  }

  let root = null;
  let tab = 'tipos';
  let editando = null;
  let natureza = 'pagar';
  const receber = () => natureza === 'receber';

  function open(initialTab, nat) {
    natureza = nat === 'receber' ? 'receber' : 'pagar';
    ensureStyles();
    if (root) root.remove();
    tab = initialTab === 'recorrencias' ? 'recorrencias' : 'tipos';
    editando = null;
    root = document.createElement('div');
    root.id = 'md-tc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Tipos de conta e recorrências');
    root.innerHTML = '<div class="p"><div class="hd"><div><h2>Tipos de conta e recorrências — ' + (receber() ? 'Contas a Receber' : 'Contas a Pagar') + '</h2><p class="sub">' + (receber() ? 'Títulos a receber' : 'Contas a pagar') + ' fixas (tempo determinado ou indeterminado), variáveis, avulsas e parceladas.</p></div><button type="button" class="x" data-act="close" aria-label="Fechar">×</button></div>' +
      '<div class="tabs" role="tablist"><button type="button" class="tab" role="tab" data-tab="tipos">Tipos de conta</button><button type="button" class="tab" role="tab" data-tab="recorrencias">Contas recorrentes</button></div><div class="bd" data-body></div></div>';
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    render();
  }
  function close() { if (root) root.remove(); root = null; document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape' && root) close(); }
  const body = () => root && root.querySelector('[data-body]');
  function render() {
    root.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (tab === 'tipos') renderTipos(); else renderRecorrencias();
  }

  // ---- Tipos de conta ---------------------------------------------------------------------
  function formTipo(t) {
    t = t || { nome: '', periodicidade: 'FIXA_INDETERMINADA', categoria: receber() ? 'Outros' : 'Despesas Fixas', meses: 12, observacao: '' };
    return '<div class="box" data-form><h3>' + (editando ? 'Alterar tipo de conta' : 'Cadastrar tipo de conta') + '</h3><div class="grid">' +
      '<label class="f">Nome *<input data-k="nome" maxlength="80" placeholder="' + (receber() ? 'Ex.: Comissão Fábrica ABC, Mensalidade cliente X' : 'Ex.: Aluguel do galpão, Salário vendedor') + '" value="' + esc(t.nome) + '"></label>' +
      '<label class="f">Periodicidade *<select data-k="periodicidade">' + Object.keys(PER).map((k) => '<option value="' + k + '"' + (t.periodicidade === k ? ' selected' : '') + '>' + PER[k][0] + '</option>').join('') + '</select></label>' +
      '<label class="f" data-meses' + (t.periodicidade === 'FIXA_MENSAL' ? '' : ' hidden') + '>Meses (tempo determinado)<input type="number" min="1" max="120" data-k="meses" value="' + esc(t.meses || 12) + '"></label>' +
      '<label class="f">Categoria<select data-k="categoria">' + (receber() ? CATEGORIAS_RECEBER : CATEGORIAS).map((c) => '<option value="' + esc(c[0]) + '"' + (t.categoria === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>').join('') + '</select></label>' +
      '<label class="f">Observação<input data-k="observacao" maxlength="300" value="' + esc(t.observacao || '') + '"></label>' +
      '<div class="row"><button type="button" class="btn" data-act="salvar-tipo">' + (editando ? 'Salvar alteração' : 'Cadastrar') + '</button>' + (editando ? '<button type="button" class="btn s" data-act="cancelar-edicao">Cancelar</button>' : '') + '</div></div><div class="msg" data-fmsg></div></div>';
  }

  async function renderTipos(aviso) {
    const b = body();
    b.innerHTML = '<p class="muted">Carregando…</p>';
    let r;
    try { r = await api('GET', '/tipos-conta'); } catch (err) { b.innerHTML = '<p class="msg bad">' + esc(err.message) + '</p>'; return; }
    if (!root || tab !== 'tipos') return;
    const proprio = editando ? r.tipos.find((t) => t.id === editando) : null;
    b.innerHTML = '<div class="info">O tipo escolhido ao cadastrar ' + (receber() ? 'um título a receber' : 'uma conta a pagar') + ' já preenche a categoria e a periodicidade. Os tipos padrão podem ser personalizados cadastrando um com o mesmo nome.</div>' +
      (aviso ? '<p class="msg ok">' + esc(aviso) + '</p>' : '') + formTipo(proprio) +
      '<div class="tw"><table><thead><tr><th>Tipo de conta</th><th>Periodicidade</th><th>Categoria</th><th>Origem</th><th></th></tr></thead><tbody>' +
      r.tipos.map((t) => '<tr' + (t.ativo === false ? ' style="opacity:.55"' : '') + '><td><b>' + esc(t.nome) + '</b>' + (t.observacao ? '<div class="muted">' + esc(t.observacao) + '</div>' : '') + '</td><td>' + badge(PER[t.periodicidade] || PER.VARIAVEL, (PER[t.periodicidade] || PER.VARIAVEL)[0] + (t.periodicidade === 'FIXA_MENSAL' && t.meses ? ' (' + t.meses + ' meses)' : '')) + '</td><td>' + esc(t.categoria) + '</td>' +
        '<td>' + (t.padrao ? '<span class="muted">Padrão</span>' : 'Da empresa' + (t.ativo === false ? ' · inativo' : '')) + '</td>' +
        '<td>' + (t.padrao ? '' : '<div class="row"><button type="button" class="btn s sm" data-act="editar-tipo" data-id="' + esc(t.id) + '">Alterar</button><button type="button" class="btn ' + (t.ativo === false ? 's' : 'd') + ' sm" data-act="ativar-tipo" data-id="' + esc(t.id) + '" data-ativo="' + (t.ativo === false ? '1' : '0') + '">' + (t.ativo === false ? 'Reativar' : 'Desativar') + '</button></div>') + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  async function salvarTipo(btn) {
    const f = body().querySelector('[data-form]');
    const msg = f.querySelector('[data-fmsg]');
    const dados = {};
    f.querySelectorAll('[data-k]').forEach((el) => { dados[el.dataset.k] = el.value; });
    dados.meses = Number(dados.meses) || 0;
    btn.disabled = true;
    try {
      if (editando) await api('PUT', '/tipos-conta/' + encodeURIComponent(editando), dados);
      else await api('POST', '/tipos-conta', dados);
      const aviso = editando ? 'Tipo de conta alterado.' : 'Tipo de conta "' + dados.nome + '" cadastrado.';
      editando = null;
      syncApp();
      renderTipos(aviso);
    } catch (err) { msg.className = 'msg bad'; msg.textContent = err.message; btn.disabled = false; }
  }

  // ---- Contas recorrentes -----------------------------------------------------------------
  async function renderRecorrencias(aviso) {
    const b = body();
    b.innerHTML = '<p class="muted">Carregando…</p>';
    let r;
    try { r = await api('GET', '/recorrencias'); } catch (err) { b.innerHTML = '<p class="msg bad">' + esc(err.message) + '</p>'; return; }
    if (!root || tab !== 'recorrencias') return;
    const lista = r.recorrencias || [];
    b.innerHTML = '<div class="info">As contas fixas por tempo indeterminado e as variáveis mensais ficam sempre com os próximos 12 meses lançados (renovação automática diária). Para parar, encerre a recorrência informando a data e o motivo; lançamentos já pagos são mantidos.</div>' +
      (aviso ? '<p class="msg ok">' + esc(aviso) + '</p>' : '') +
      (lista.length ? '<div class="tw"><table><thead><tr><th>Conta</th><th>Periodicidade</th><th class="r">Valor</th><th>Vencimento</th><th>Início / fim</th><th>Próximo vencimento</th><th class="r">Lançados / pagos</th><th>Situação</th><th></th></tr></thead><tbody>' +
        lista.map((g) => '<tr data-grupo="' + esc(g.groupId) + '"><td><b>' + esc(g.fornecedor || '—') + '</b><div class="muted">' + esc(g.tipoConta || g.categoria || '') + '</div></td><td>' + badge(PER[g.tipo] || PER.VARIAVEL) + '</td><td class="r">' + money(g.valor) + '</td><td>dia ' + esc(g.diaVencimento) + '</td>' +
          '<td>' + fmtDia(g.inicio) + ' → ' + (g.fim ? fmtDia(g.fim) : '<b>sem data para acabar</b>') + '</td><td>' + fmtDia(g.proximoVencimento) + '</td><td class="r">' + g.lancamentos + ' / ' + g.pagos + '</td>' +
          '<td>' + (g.encerrada ? badge(['Encerrada', '#7f1d1d', '#fee2e2']) + (g.encerramento ? '<div class="muted">' + fmtDia(g.encerramento.aPartirDe) + ' · ' + esc(g.encerramento.motivo) + '</div>' : '') : badge(['Ativa', '#065f46', '#d1fae5'])) + '</td>' +
          '<td>' + (g.encerrada || g.tipo === 'PARCELADA' ? '' : '<button type="button" class="btn d sm" data-act="encerrar" data-grupo="' + esc(g.groupId) + '">Encerrar</button>') + '<div data-slot></div></td></tr>').join('') + '</tbody></table></div>'
        : '<p class="muted">Nenhuma conta recorrente ainda. Cadastre em ' + (receber() ? 'Contas a Receber' : 'Contas a Pagar') + ' → Novo, escolhendo uma periodicidade fixa ou variável mensal.</p>');
  }

  function abrirEncerrar(grupo) {
    const tr = body().querySelector('tr[data-grupo="' + CSS.escape(grupo) + '"]');
    const slot = tr && tr.querySelector('[data-slot]');
    if (!slot) return;
    slot.innerHTML = '<div class="inline"><label class="f">A partir de<input type="date" data-enc="data" value="' + hoje() + '"></label>' +
      '<label class="f" style="margin-top:6px">Motivo *<input data-enc="motivo" maxlength="300" placeholder="Ex.: contrato encerrado, funcionário desligado"></label>' +
      '<div class="row" style="margin-top:6px"><button type="button" class="btn d sm" data-act="encerrar-sim" data-grupo="' + esc(grupo) + '">Encerrar recorrência</button><button type="button" class="btn s sm" data-act="encerrar-nao">Voltar</button></div><div class="msg" data-emsg></div></div>';
    slot.querySelector('[data-enc="motivo"]').focus();
  }

  async function encerrar(btn) {
    const slot = btn.closest('[data-slot]');
    const msg = slot.querySelector('[data-emsg]');
    const motivo = slot.querySelector('[data-enc="motivo"]').value.trim();
    const aPartirDe = slot.querySelector('[data-enc="data"]').value;
    if (!motivo) { msg.className = 'msg bad'; msg.textContent = 'Informe o motivo.'; return; }
    btn.disabled = true;
    try {
      const r = await api('POST', '/recorrencias/' + encodeURIComponent(btn.dataset.grupo) + '/encerrar', { motivo, aPartirDe });
      syncApp();
      renderRecorrencias('Recorrência encerrada: ' + r.canceladas + ' lançamento(s) futuro(s) cancelado(s).');
    } catch (err) { msg.className = 'msg bad'; msg.textContent = err.message; btn.disabled = false; }
  }

  function onChange(e) {
    if (e.target.dataset.k === 'periodicidade') {
      const m = body().querySelector('[data-meses]');
      if (m) m.hidden = e.target.value !== 'FIXA_MENSAL';
    }
  }

  async function onClick(e) {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; editando = null; render(); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'close') return close();
    if (act === 'salvar-tipo') return salvarTipo(a);
    if (act === 'editar-tipo') { editando = a.dataset.id; return renderTipos(); }
    if (act === 'cancelar-edicao') { editando = null; return renderTipos(); }
    if (act === 'ativar-tipo') {
      a.disabled = true;
      try { await api('PUT', '/tipos-conta/' + encodeURIComponent(a.dataset.id), { ativo: a.dataset.ativo === '1' }); syncApp(); renderTipos(a.dataset.ativo === '1' ? 'Tipo reativado.' : 'Tipo desativado (não aparece mais no cadastro de contas).'); }
      catch (err) { a.disabled = false; alert(err.message); }
      return;
    }
    if (act === 'encerrar') return abrirEncerrar(a.dataset.grupo);
    if (act === 'encerrar-nao') { const s = a.closest('[data-slot]'); if (s) s.innerHTML = ''; return; }
    if (act === 'encerrar-sim') return encerrar(a);
  }

  // ---- Botão na barra de Contas a Pagar / a Receber + renovação ao abrir a tela -----------------
  const renovadas = new Set();
  const TELAS = [
    { nat: 'pagar', view: 'view-wareline-payables', novo: '#btn-pay-novo', excluir: '#btn-pay-excluir', id: 'btn-pay-tipos-conta' },
    { nat: 'receber', view: 'view-wareline-receivables', novo: '#btn-rec-novo', excluir: '#btn-rec-excluir', id: 'btn-rec-tipos-conta' },
  ];
  function injectButton() {
    for (const t of TELAS) {
      const view = document.getElementById(t.view);
      if (!view) continue;
      ensureStyles();
      const novo = view.querySelector(t.novo);
      if (novo && !document.getElementById(t.id)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = t.id;
        btn.className = 'md-btn-tipos-conta';
        btn.textContent = 'Tipos de conta e recorrências';
        btn.addEventListener('click', () => open('tipos', t.nat));
        const excluir = novo.parentElement.querySelector(t.excluir);
        (excluir || novo).after(btn);
      }
      const chave = companyId() + ':' + t.nat;
      if (companyId() && !renovadas.has(chave)) {
        renovadas.add(chave);
        fetch(API + '/recorrencias/renovar?natureza=' + t.nat, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: JSON.stringify({ natureza: t.nat }) })
          .then((r) => r.json()).then((r) => { if (r && r.criadas > 0) syncApp(); }).catch(() => {});
      }
    }
  }

  setInterval(injectButton, 1000);
  window.MotorDeskOpenTiposConta = open;
})();
