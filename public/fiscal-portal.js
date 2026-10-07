/**
 * MotorDesk - Notas Fiscais (NF-e modelo 55)
 *
 * Tela de emissão própria, ligada à API fiscal do servidor (/api/fiscal/v2, padrão Focus NFe):
 *  - Emitir: destinatário e itens do cadastro, CFOP sugerido pela operação, prévia de tributos e guias.
 *  - Notas emitidas: DANFE, XML, carta de correção, cancelamento, guias de recolhimento.
 *  - Inutilização de numeração.
 *  - Configuração da empresa (dados fiscais, certificado A1, ambiente, série) e da plataforma.
 * Regras e permissões são conferidas no servidor.
 */
(function () {
  'use strict';

  const API = '/api/fiscal/v2';
  const CRT = { 1: 'Simples Nacional', 2: 'Simples Nacional – excesso de sublimite', 3: 'Regime normal (Lucro Presumido/Real)', 4: 'MEI' };
  const PAG = { '01': 'Dinheiro', '03': 'Cartão de crédito', '04': 'Cartão de débito', '15': 'Boleto bancário', '17': 'PIX', '05': 'Crédito loja', '99': 'Outros', '90': 'Sem pagamento' };
  const FRETE = { 9: 'Sem frete', 0: 'Por conta do emitente', 1: 'Por conta do destinatário', 2: 'Por conta de terceiros' };
  const STATUS = { autorizado: ['Autorizada', '#047857', '#d1fae5'], cancelado: ['Cancelada', '#b91c1c', '#fee2e2'], erro_autorizacao: ['Rejeitada', '#b45309', '#fef3c7'], processando_autorizacao: ['Processando', '#1d4ed8', '#dbeafe'], denegado: ['Denegada', '#7f1d1d', '#fecaca'] };
  const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const digits = (v) => String(v || '').replace(/\D/g, '');
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const user = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; } };
  const companyId = () => { try { const u = user() || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  const isMaster = (u) => u && (['admin', 'validador'].includes(String(u.username || '').toLowerCase()) || u.role === 'qa');
  const perm = (u, key) => {
    if (!u) return false;
    if (isMaster(u)) return true;
    const p = Object.assign({}, u.permissions || {}, u.individualExceptions || {}, u.customPermissions || {});
    if (p[key] === false) return false;
    return p[key] === true || u.role === 'admin';
  };
  const db = () => window.__CURRENT_DB || {};

  async function api(method, path, body, asText) {
    const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId() }, body: body ? JSON.stringify(body) : undefined });
    if (asText) { if (!res.ok) throw new Error('Arquivo indisponível (HTTP ' + res.status + ')'); return res.text(); }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok && res.status !== 202) {
      const err = new Error((data && (data.mensagem || data.error)) || 'Erro HTTP ' + res.status);
      err.details = (data && data.erros) || [];
      err.data = data;
      throw err;
    }
    return data;
  }

  // ---------------------------------------------------------------------------
  // Estilos
  // ---------------------------------------------------------------------------
  function ensureStyles() {
    if (document.getElementById('md-fis-style')) return;
    const st = document.createElement('style');
    st.id = 'md-fis-style';
    st.textContent = [
      '#md-fis{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}',
      '#md-fis .p{background:#fff;width:100%;max-width:1180px;height:calc(100vh - 24px);display:flex;flex-direction:column;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden}',
      '#md-fis .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-bottom:1px solid #e2e8f0}',
      '#md-fis h2{margin:0;font-size:18px}#md-fis .sub{margin:2px 0 0;font-size:13px;color:#64748b}',
      '#md-fis .x{border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer}',
      '#md-fis .tabs{display:flex;gap:2px;padding:0 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;overflow-x:auto}',
      '#md-fis .tab{border:0;background:none;padding:11px 13px;font-size:13.5px;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}',
      '#md-fis .tab[aria-selected=true]{color:#4338ca;border-bottom-color:#4338ca}',
      '#md-fis .bd{padding:16px 20px;overflow:auto;flex:1}',
      '#md-fis section{margin-bottom:18px}#md-fis h3{font-size:14.5px;margin:0 0 8px}',
      '#md-fis .t{font-size:13px;color:#475569;margin:0 0 8px;line-height:1.5}',
      '#md-fis .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}',
      '#md-fis label.f{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600;color:#334155}',
      '#md-fis input,#md-fis select,#md-fis textarea{font:inherit;font-size:13.5px;font-weight:400;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#0f172a;min-width:0}',
      '#md-fis input[type=checkbox]{padding:0}',
      '#md-fis .box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;background:#f8fafc}',
      '#md-fis .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '#md-fis .btn{border:0;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;background:#4f46e5;color:#fff}',
      '#md-fis .btn.s{background:#e2e8f0;color:#1e293b}#md-fis .btn.d{background:#fee2e2;color:#b91c1c}#md-fis .btn.g{background:#047857}',
      '#md-fis .btn.sm{padding:5px 9px;font-size:12px}#md-fis .btn:disabled{opacity:.55;cursor:default}',
      '#md-fis .tw{overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px}',
      '#md-fis table{border-collapse:collapse;width:100%;font-size:12.5px}',
      '#md-fis th,#md-fis td{text-align:left;padding:7px 8px;border-bottom:1px solid #eef2f7;vertical-align:middle}',
      '#md-fis th{background:#f8fafc;font-size:11.5px;color:#475569}#md-fis td.r,#md-fis th.r{text-align:right}',
      '#md-fis .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:700}',
      '#md-fis .msg{font-size:13px;margin-top:8px;line-height:1.5}#md-fis .ok{color:#047857}#md-fis .bad{color:#b91c1c}',
      '#md-fis .warn{border:1px solid #f59e0b;background:#fffbeb;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}',
      '#md-fis .info{border:1px solid #c7d2fe;background:#eef2ff;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}',
      '#md-fis .tot{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}',
      '#md-fis .tot div{border:1px solid #e2e8f0;border-radius:8px;padding:6px 9px;background:#fff}#md-fis .tot span{display:block;font-size:11px;color:#64748b}#md-fis .tot b{font-size:14px}',
      '#md-fis .muted{color:#64748b;font-size:12px}',
      '#md-fis .items td input{width:100%}',
      '#md-fis .inline{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-top:6px}',
      '#menu-btn-notas-fiscais{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:0;background:none;color:#cbd5e1;font-size:12px;font-weight:600;letter-spacing:.02em;cursor:pointer;text-align:left}',
      '#menu-btn-notas-fiscais:hover{background:#1e293b;color:#fff}#menu-btn-notas-fiscais svg{width:16px;height:16px;flex-shrink:0;color:#34d399}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  let root = null;
  let tab = 'emitir';
  let empresa = null;
  let draft = null;

  function newDraft() {
    return { ref: 'nfe-' + Date.now().toString(36), dest: { indicador: '1' }, items: [], pagamento: '01', frete: '9', infCpl: '', natureza: 'Venda de mercadoria', consumidorFinal: '' };
  }

  function open(initialTab) {
    ensureStyles();
    if (root) root.remove();
    tab = initialTab || tab;
    if (!draft) draft = newDraft();
    root = document.createElement('div');
    root.id = 'md-fis';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Notas Fiscais');
    const u = user();
    const tabs = [['emitir', 'Emitir NF-e'], ['notas', 'Notas emitidas'], ['inutilizar', 'Inutilização']];
    if (perm(u, 'accessUserManagement')) tabs.push(['config', 'Configuração da empresa']);
    if (isMaster(u)) tabs.push(['plataforma', 'Plataforma']);
    root.innerHTML = '<div class="p"><div class="hd"><div><h2>Notas Fiscais (NF-e)</h2><p class="sub">Emissão de NF-e modelo 55 direto na SEFAZ, com o certificado da empresa.</p></div><button type="button" class="x" data-act="close" aria-label="Fechar">×</button></div>' +
      '<div class="tabs" role="tablist">' + tabs.map((t) => '<button type="button" class="tab" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div class="bd" data-body></div></div>';
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    render();
  }
  function close() { if (root) root.remove(); root = null; document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape' && root && !root.querySelector('.inline input:focus, .inline textarea:focus')) close(); }
  const body = () => root && root.querySelector('[data-body]');

  async function loadEmpresa() {
    try { empresa = await api('GET', '/empresa'); } catch (e) { empresa = { erro: e.message }; }
    return empresa;
  }

  function render() {
    if (!root) return;
    root.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    body().innerHTML = '<p class="t">Carregando…</p>';
    ({ emitir: renderEmitir, notas: renderNotas, inutilizar: renderInutilizar, config: renderConfig, plataforma: renderPlataforma })[tab]();
  }

  function pendenciasHtml() {
    if (!empresa) return '';
    if (empresa.erro) return '<div class="warn">' + esc(empresa.erro) + '</div>';
    if (empresa.configurado) {
      const amb = empresa.perfil && Number(empresa.perfil.ambiente) === 1 ? '<b>PRODUÇÃO</b> (notas com validade fiscal)' : '<b>HOMOLOGAÇÃO</b> (testes, sem validade fiscal)';
      return '<div class="info">Ambiente: ' + amb + '. Série ' + esc(empresa.perfil.serie) + ', próximo número ' + esc(empresa.perfil.proximoNumero) + '.</div>';
    }
    return '<div class="warn"><b>Emissão ainda não liberada.</b> Pendências:<ul style="margin:6px 0 0;padding-left:18px">' + (empresa.pendencias || []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></div>';
  }

  // ---------------------------------------------------------------------------
  // Emitir
  // ---------------------------------------------------------------------------
  async function renderEmitir() {
    await loadEmpresa();
    const b = body();
    if (!b) return;
    const clients = (db().clients || []).filter((c) => !c.companyId || c.companyId === companyId());
    const parts = (db().parts || []).filter((p) => !p.companyId || p.companyId === companyId());
    const d = draft.dest;
    b.innerHTML = pendenciasHtml() +
      '<section><h3>Destinatário</h3><div class="box"><div class="grid">' +
      '<label class="f" style="grid-column:1/-1">Buscar cliente do cadastro<input list="md-fis-clients" data-k="clientSearch" placeholder="Digite o nome ou CPF/CNPJ"><datalist id="md-fis-clients">' +
      clients.map((c) => '<option value="' + esc(c.name + ' — ' + (c.cpfCnpj || c.cpf || '')) + '" data-id="' + esc(c.id) + '"></option>').join('') + '</datalist></label>' +
      field('Nome / razão social', 'dest.nome', d.nome) + field('CPF ou CNPJ', 'dest.doc', d.doc) +
      '<label class="f">Contribuinte de ICMS?<select data-k="dest.indicador"><option value="1"' + sel(d.indicador, '1') + '>Sim, tem IE</option><option value="2"' + sel(d.indicador, '2') + '>Isento de IE</option><option value="9"' + sel(d.indicador, '9') + '>Não contribuinte (consumidor final)</option></select></label>' +
      field('Inscrição estadual', 'dest.ie', d.ie) + field('Inscrição SUFRAMA (ZFM)', 'dest.suframa', d.suframa) + field('E-mail', 'dest.email', d.email) +
      field('CEP', 'dest.cep', d.cep, 'Busca o endereço automaticamente') + field('Logradouro', 'dest.logradouro', d.logradouro) + field('Número', 'dest.numero', d.numero) + field('Complemento', 'dest.complemento', d.complemento) + field('Bairro', 'dest.bairro', d.bairro) +
      field('Município', 'dest.municipio', d.municipio) + field('Código IBGE', 'dest.ibge', d.ibge) +
      '<label class="f">UF<select data-k="dest.uf"><option value=""></option>' + UFS.map((u) => '<option' + sel(d.uf, u) + '>' + u + '</option>').join('') + '</select></label>' +
      '</div></div></section>' +
      '<section><h3>Produtos</h3><div class="box"><div class="row" style="margin-bottom:8px"><input list="md-fis-parts" data-k="partSearch" placeholder="Adicionar produto do cadastro (código ou nome)" style="flex:1;min-width:220px"><datalist id="md-fis-parts">' +
      parts.map((p) => '<option value="' + esc((p.code || '') + ' — ' + p.name) + '"></option>').join('') + '</datalist><button type="button" class="btn s" data-act="add-blank">Item avulso</button></div>' +
      '<div class="tw"><table class="items"><thead><tr><th style="min-width:90px">Código</th><th style="min-width:200px">Descrição</th><th>NCM</th><th>CEST</th><th>CFOP</th><th>CST/CSOSN</th><th>Orig.</th><th class="r">Qtd</th><th class="r">Valor unit.</th><th class="r">Desconto</th><th class="r">MVA ST %</th><th></th></tr></thead><tbody data-items>' + itemsRows() + '</tbody></table></div>' +
      '<p class="muted" style="margin:6px 0 0">O CFOP é sugerido conforme o destino e a tributação; confira antes de emitir. Produtos com ST (CST 10/70, CSOSN 201/202) precisam de CEST e MVA.</p></div></section>' +
      '<section><h3>Operação e pagamento</h3><div class="box"><div class="grid">' + field('Natureza da operação', 'natureza', draft.natureza) +
      '<label class="f">Consumidor final?<select data-k="consumidorFinal"><option value=""' + sel(draft.consumidorFinal, '') + '>Automático</option><option value="1"' + sel(draft.consumidorFinal, '1') + '>Sim</option><option value="0"' + sel(draft.consumidorFinal, '0') + '>Não (revenda/industrialização)</option></select></label>' +
      '<label class="f">Forma de pagamento<select data-k="pagamento">' + Object.keys(PAG).map((k) => '<option value="' + k + '"' + sel(draft.pagamento, k) + '>' + PAG[k] + '</option>').join('') + '</select></label>' +
      '<label class="f">Frete<select data-k="frete">' + Object.keys(FRETE).map((k) => '<option value="' + k + '"' + sel(draft.frete, k) + '>' + FRETE[k] + '</option>').join('') + '</select></label>' +
      field('Referência (única por nota)', 'ref', draft.ref) +
      '<label class="f" style="grid-column:1/-1">Informações complementares<textarea data-k="infCpl" rows="2">' + esc(draft.infCpl) + '</textarea></label></div></div></section>' +
      '<div data-preview></div><div class="row" style="position:sticky;bottom:-16px;background:#fff;padding:10px 0;border-top:1px solid #e2e8f0"><button type="button" class="btn s" data-act="limpar">Nova nota</button><span style="flex:1"></span>' +
      '<button type="button" class="btn s" data-act="calcular">Calcular impostos</button><button type="button" class="btn g" data-act="emitir"' + (empresa && empresa.configurado ? '' : ' disabled title="Configure a empresa antes de emitir"') + '>Emitir NF-e</button></div><div class="msg" data-emsg></div>';
  }
  const sel = (a, b) => (String(a == null ? '' : a) === String(b) ? ' selected' : '');
  function field(label, key, value, hint) {
    return '<label class="f">' + esc(label) + '<input data-k="' + key + '" value="' + esc(value || '') + '"' + (hint ? ' title="' + esc(hint) + '"' : '') + '></label>';
  }
  function itemsRows() {
    if (!draft.items.length) return '<tr><td colspan="12" class="muted">Nenhum produto. Busque no cadastro acima.</td></tr>';
    return draft.items.map((it, i) => '<tr>' + ['codigo', 'descricao', 'ncm', 'cest', 'cfop', 'cst', 'origem'].map((k) => '<td><input data-i="' + i + '" data-f="' + k + '" value="' + esc(it[k] || '') + '"' + ({ origem: ' style="width:44px"', ncm: ' style="min-width:92px"', cest: ' style="min-width:80px"', cfop: ' style="min-width:58px"', cst: ' style="min-width:52px"' }[k] || '') + '></td>').join('') +
      ['quantidade', 'valorUnitario', 'desconto', 'mva'].map((k) => '<td><input data-i="' + i + '" data-f="' + k + '" inputmode="decimal" style="text-align:right;width:84px" value="' + esc(it[k] == null ? '' : it[k]) + '"></td>').join('') +
      '<td><button type="button" class="btn d sm" data-act="rm-item" data-i="' + i + '" aria-label="Remover">×</button></td></tr>').join('');
  }

  function crt() { return Number(empresa && empresa.perfil && empresa.perfil.crt) || 3; }
  function ufEmit() { return (empresa && empresa.perfil && empresa.perfil.endereco && empresa.perfil.endereco.uf) || 'SP'; }

  function suggestCfop(it) {
    const uf = draft.dest.uf;
    const inter = uf && uf !== ufEmit();
    const st = /^(10|30|70|201|202|203)$/.test(String(it.cst));
    const stRet = /^(60|500)$/.test(String(it.cst));
    if (!inter) return st ? '5401' : stRet ? '5405' : '5102';
    if (draft.dest.suframa) return '6109';
    if (st) return '6403';
    if (draft.dest.indicador === '9') return '6108';
    return stRet ? '6404' : '6102';
  }

  function addPart(p) {
    const sn = crt() !== 3;
    let cst = String(p.icmsCstOrCsosn || (sn ? '102' : '00'));
    if (sn && cst.length < 3) cst = cst === '60' ? '500' : '102';
    if (!sn && cst.length > 2) cst = cst === '500' ? '60' : '00';
    const it = { codigo: p.code || p.id, descricao: p.name, ncm: digits(p.ncm), cest: digits(p.cest), cst, origem: String(p.origem != null ? p.origem : 0), quantidade: 1, valorUnitario: Number(p.price || 0), desconto: '', mva: p.mvaPercent || '', unidade: p.unitCommercial || p.unit || 'UN', pisCst: p.pisCst, cofinsCst: p.cofinsCst, aliqIcms: Number(p.icmsRatePercent) > 0 ? p.icmsRatePercent : '', ipiCst: p.ipiCst, aliqIpi: Number(p.ipiRatePercent) > 0 ? p.ipiRatePercent : '' };
    it.cfop = suggestCfop(it);
    draft.items.push(it);
  }

  function refreshCfops() { draft.items.forEach((it) => { if (!it.cfopManual) it.cfop = suggestCfop(it); }); }

  function payload() {
    const d = draft.dest;
    const doc = digits(d.doc);
    const total = draft.items.reduce((s, it) => s + Number(String(it.quantidade).replace(',', '.')) * Number(String(it.valorUnitario).replace(',', '.')) - Number(String(it.desconto || 0).replace(',', '.')), 0);
    const p = {
      natureza_operacao: draft.natureza,
      nome_destinatario: d.nome, inscricao_estadual_destinatario: d.indicador === '1' ? d.ie : undefined, indicador_inscricao_estadual_destinatario: Number(d.indicador || 9),
      inscricao_suframa_destinatario: d.suframa || undefined, email_destinatario: d.email || undefined,
      logradouro_destinatario: d.logradouro, numero_destinatario: d.numero, complemento_destinatario: d.complemento || undefined, bairro_destinatario: d.bairro,
      municipio_destinatario: d.municipio, codigo_municipio_destinatario: d.ibge, uf_destinatario: d.uf, cep_destinatario: d.cep,
      modalidade_frete: Number(draft.frete),
      informacoes_adicionais_contribuinte: draft.infCpl || undefined,
      items: draft.items.map((it, i) => {
        const n = (v) => (v === '' || v == null ? undefined : Number(String(v).replace(',', '.')));
        const st = /^(10|30|70|201|202|203)$/.test(String(it.cst));
        return {
          numero_item: i + 1, codigo_produto: it.codigo, descricao: it.descricao, codigo_ncm: it.ncm, cest: it.cest || undefined, cfop: it.cfop,
          unidade_comercial: it.unidade || 'UN', quantidade_comercial: n(it.quantidade), valor_unitario_comercial: n(it.valorUnitario), valor_desconto: n(it.desconto),
          icms_origem: Number(it.origem || 0), icms_situacao_tributaria: it.cst, icms_aliquota: n(it.aliqIcms), icms_margem_valor_adicionado_st: st ? n(it.mva) : undefined,
          pis_situacao_tributaria: it.pisCst || undefined, cofins_situacao_tributaria: it.cofinsCst || undefined,
          ipi_situacao_tributaria: it.ipiCst || undefined, ipi_aliquota: n(it.aliqIpi),
        };
      }),
    };
    if (doc.length === 14) p.cnpj_destinatario = doc; else p.cpf_destinatario = doc;
    if (draft.consumidorFinal !== '') p.consumidor_final = Number(draft.consumidorFinal);
    p.formas_pagamento = [{ forma_pagamento: draft.pagamento, valor_pagamento: draft.pagamento === '90' ? 0 : Math.round(total * 100) / 100 }];
    return p;
  }

  function previewHtml(r) {
    const t = r.totais;
    const cell = (l, v) => '<div><span>' + l + '</span><b>' + money(v) + '</b></div>';
    return '<section><h3>Prévia dos tributos (' + esc(r.operacao) + (r.consumidor_final ? ', consumidor final' : '') + ')</h3><div class="tot">' +
      cell('Produtos', t.vProd) + cell('Desconto', t.vDesc) + cell('Base ICMS', t.vBC) + cell('ICMS', t.vICMS) + cell('Base ICMS-ST', t.vBCST) + cell('ICMS-ST', t.vST) +
      cell('FCP / FCP-ST', t.vFCP + t.vFCPST) + cell('DIFAL (UF destino)', t.vICMSUFDest) + cell('FCP UF destino', t.vFCPUFDest) + cell('ICMS desonerado', t.vICMSDeson) +
      cell('IPI', t.vIPI) + cell('PIS', t.vPIS) + cell('COFINS', t.vCOFINS) + '<div style="border-color:#4f46e5"><span>Total da nota</span><b>' + money(t.vNF) + '</b></div></div>' +
      (r.guias && r.guias.length ? '<h3 style="margin-top:12px">Guias de recolhimento</h3>' + guiasTable(r.guias) : '') + '</section>';
  }
  function guiasTable(guias) {
    return '<div class="tw"><table><thead><tr><th>Guia</th><th>UF</th><th>Receita</th><th>Descrição</th><th class="r">Valor</th><th>Observação</th></tr></thead><tbody>' +
      guias.map((g) => '<tr><td>' + esc(g.tipo) + (g.situacao === 'informativo' ? ' <span class="muted">(informativo)</span>' : '') + '</td><td>' + esc(g.ufFavorecida) + '</td><td>' + esc(g.receita) + '</td><td>' + esc(g.descricaoReceita) + '</td><td class="r">' + money(g.valor) + '</td><td class="muted">' + esc(g.observacao) + '</td></tr>').join('') +
      '</tbody></table></div><p class="muted" style="margin:6px 0 0">GNRE: gere e pague no Portal GNRE (www.gnre.pe.gov.br) informando a chave da NF-e. Confira os códigos de receita com a contabilidade.</p>';
  }

  function showErrors(sel, err) {
    const el = body() && body().querySelector(sel);
    if (!el) return;
    el.className = 'msg bad';
    el.innerHTML = esc(err.message) + (err.details && err.details.length ? '<ul style="margin:4px 0 0;padding-left:18px">' + err.details.map((d) => '<li>' + esc(d) + '</li>').join('') + '</ul>' : '');
  }

  async function calcular(btn) {
    btn.disabled = true;
    const msg = body().querySelector('[data-emsg]');
    msg.textContent = '';
    try {
      const r = await api('POST', '/nfe/calcular', payload());
      body().querySelector('[data-preview]').innerHTML = previewHtml(r);
    } catch (err) { showErrors('[data-emsg]', err); } finally { btn.disabled = false; }
  }

  async function emitir(btn) {
    btn.disabled = true;
    const msg = body().querySelector('[data-emsg]');
    msg.className = 'msg';
    msg.textContent = 'Enviando à SEFAZ…';
    try {
      const r = await api('POST', '/nfe?ref=' + encodeURIComponent(draft.ref), payload());
      if (r.status === 'autorizado') {
        msg.className = 'msg ok';
        msg.innerHTML = '<b>NF-e nº ' + esc(r.numero) + ' autorizada.</b> Chave ' + esc(r.chave_nfe) + ' · protocolo ' + esc(r.protocolo) + '. <button type="button" class="btn sm" data-act="danfe" data-ref="' + esc(r.ref) + '">Abrir DANFE</button>' +
          (r.guias && r.guias.some((g) => g.situacao === 'a_pagar') ? ' <b class="bad">Há guias a recolher: veja em Notas emitidas.</b>' : '');
        draft = newDraft();
      } else if (r.status === 'processando_autorizacao') {
        msg.className = 'msg';
        msg.textContent = 'A SEFAZ não respondeu a tempo. A nota ficou "processando" e será consultada em Notas emitidas (não reenvie com outra referência).';
      } else {
        msg.className = 'msg bad';
        msg.innerHTML = '<b>Rejeitada pela SEFAZ (' + esc(r.status_sefaz) + '):</b> ' + esc(r.mensagem_sefaz) + '<br>Corrija e emita de novo: a mesma referência reaproveita o número ' + esc(r.numero) + '.';
      }
    } catch (err) {
      if (err.data && err.data.status === 'erro_autorizacao') {
        msg.className = 'msg bad';
        msg.innerHTML = '<b>Rejeitada pela SEFAZ (' + esc(err.data.status_sefaz) + '):</b> ' + esc(err.data.mensagem_sefaz) + '<br>Corrija e emita de novo: a mesma referência reaproveita o número ' + esc(err.data.numero) + '.';
      } else showErrors('[data-emsg]', err);
    } finally { btn.disabled = false; }
  }

  // ---------------------------------------------------------------------------
  // Notas emitidas
  // ---------------------------------------------------------------------------
  async function renderNotas() {
    const b = body();
    try {
      const r = await api('GET', '/nfe?limit=200');
      if (!b.isConnected) return;
      if (!r.notas.length) { b.innerHTML = '<p class="t">Nenhuma NF-e emitida ainda.</p>'; return; }
      const u = user();
      b.innerHTML = '<div class="tw"><table><thead><tr><th>Nº</th><th>Emissão</th><th>Destinatário</th><th class="r">Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>' +
        r.notas.map((n) => {
          const s = STATUS[n.status] || [n.status, '#334155', '#e2e8f0'];
          return '<tr data-ref="' + esc(n.ref) + '"><td><b>' + esc(n.numero) + '</b><div class="muted">série ' + esc(n.serie) + (n.ambiente === 'homologacao' ? ' · homologação' : '') + '</div></td><td>' + esc(fmtDate(n.criado_em)) + '</td>' +
            '<td>' + esc((n.destinatario && n.destinatario.nome) || '—') + '<div class="muted">' + esc((n.destinatario && n.destinatario.uf) || '') + '</div></td><td class="r">' + money(n.valor_total) + '</td>' +
            '<td><span class="badge" style="color:' + s[1] + ';background:' + s[2] + '">' + s[0] + '</span>' + (n.status === 'erro_autorizacao' && n.mensagem_sefaz ? '<div class="muted" style="max-width:260px">' + esc(n.status_sefaz + ' - ' + n.mensagem_sefaz) + '</div>' : '') + (n.guias && n.guias.some((g) => g.situacao === 'a_pagar') ? '<div class="bad" style="font-size:11.5px">Guias a recolher</div>' : '') + '</td><td><div class="row">' +
            (n.caminho_danfe ? '<button type="button" class="btn s sm" data-act="danfe" data-ref="' + esc(n.ref) + '">DANFE</button><button type="button" class="btn s sm" data-act="xml" data-ref="' + esc(n.ref) + '" data-chave="' + esc(n.chave_nfe) + '">XML</button>' : '') +
            (n.guias && n.guias.length ? '<button type="button" class="btn s sm" data-act="guias" data-ref="' + esc(n.ref) + '">Guias</button>' : '') +
            (n.status === 'autorizado' && perm(u, 'fiscalEmit') ? '<button type="button" class="btn s sm" data-act="cce" data-ref="' + esc(n.ref) + '">Carta de correção</button>' : '') +
            (n.status === 'autorizado' && perm(u, 'fiscalCancel') ? '<button type="button" class="btn d sm" data-act="cancelar" data-ref="' + esc(n.ref) + '">Cancelar</button>' : '') +
            (n.status === 'processando_autorizacao' ? '<button type="button" class="btn s sm" data-act="consultar" data-ref="' + esc(n.ref) + '">Consultar SEFAZ</button>' : '') +
            '</div><div data-slot></div></td></tr>';
        }).join('') + '</tbody></table></div>';
      b._notas = r.notas;
    } catch (err) { b.innerHTML = '<p class="t bad">' + esc(err.message) + '</p>'; }
  }

  function slot(ref) { const tr = body().querySelector('tr[data-ref="' + CSS.escape(ref) + '"]'); return tr && tr.querySelector('[data-slot]'); }

  async function openDanfe(ref) {
    const w = window.open('', '_blank');
    try {
      const html = await api('GET', '/nfe/' + encodeURIComponent(ref) + '/danfe', null, true);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (w) w.location.href = url; else window.location.assign(url);
    } catch (err) { if (w) w.close(); alertMsg(err.message); }
  }
  async function downloadXml(ref, chave) {
    try {
      const xml = await api('GET', '/nfe/' + encodeURIComponent(ref) + '/xml', null, true);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
      a.download = (chave || ref) + '-nfe.xml';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err) { alertMsg(err.message); }
  }
  function alertMsg(text) { const el = body().querySelector('[data-emsg]') || body(); const d = document.createElement('div'); d.className = 'msg bad'; d.textContent = text; el.prepend(d); }

  // ---------------------------------------------------------------------------
  // Inutilização
  // ---------------------------------------------------------------------------
  async function renderInutilizar() {
    await loadEmpresa();
    const b = body();
    b.innerHTML = pendenciasHtml() + '<section><h3>Inutilizar numeração</h3><p class="t">Use quando números da sequência foram pulados e não serão usados (ex.: falha do sistema). Notas emitidas, rejeitadas ou canceladas não precisam ser inutilizadas.</p><div class="box"><div class="grid">' +
      field('Série', 'inut.serie', empresa && empresa.perfil ? empresa.perfil.serie : 1) + field('Número inicial', 'inut.ini', '') + field('Número final', 'inut.fim', '') +
      '<label class="f" style="grid-column:1/-1">Justificativa (15 a 255 caracteres)<textarea data-k="inut.just" rows="2"></textarea></label></div><div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="inutilizar">Inutilizar</button></div><div class="msg" data-imsg></div></div></section>';
  }

  // ---------------------------------------------------------------------------
  // Configuração da empresa
  // ---------------------------------------------------------------------------
  async function renderConfig() {
    await loadEmpresa();
    const b = body();
    const p = (empresa && empresa.perfil) || { endereco: {} };
    const en = p.endereco || {};
    const cert = empresa && empresa.certificado;
    b.innerHTML = pendenciasHtml() +
      '<section><h3>Dados fiscais da empresa</h3><div class="box"><div class="grid">' +
      field('CNPJ', 'cfg.cnpj', p.cnpj) + field('Razão social', 'cfg.razaoSocial', p.razaoSocial) + field('Nome fantasia', 'cfg.nomeFantasia', p.nomeFantasia) +
      field('Inscrição estadual', 'cfg.ie', p.ie) + field('Inscrição municipal', 'cfg.im', p.im) + field('CNAE', 'cfg.cnae', p.cnae) +
      '<label class="f">Regime tributário (CRT)<select data-k="cfg.crt">' + Object.keys(CRT).map((k) => '<option value="' + k + '"' + sel(p.crt || 3, k) + '>' + CRT[k] + '</option>').join('') + '</select></label>' +
      '<label class="f">PIS/COFINS (regime normal)<select data-k="cfg.pisCofinsRegime"><option value="cumulativo"' + sel(p.pisCofinsRegime, 'cumulativo') + '>Cumulativo (Lucro Presumido)</option><option value="nao_cumulativo"' + sel(p.pisCofinsRegime, 'nao_cumulativo') + '>Não cumulativo (Lucro Real)</option></select></label>' +
      field('Alíq. crédito Simples (%)', 'cfg.aliqCreditoSimples', p.aliqCreditoSimples) +
      '<label class="f">Contribuinte de IPI<select data-k="cfg.contribuinteIpi"><option value="false"' + sel(String(!!p.contribuinteIpi), 'false') + '>Não (comércio)</option><option value="true"' + sel(String(!!p.contribuinteIpi), 'true') + '>Sim (indústria/equiparado)</option></select></label>' +
      '<label class="f">Excluir ICMS da base PIS/COFINS<select data-k="cfg.excluirIcmsBasePisCofins"><option value="true"' + sel(String(p.excluirIcmsBasePisCofins !== false), 'true') + '>Sim (STF, RE 574.706)</option><option value="false"' + sel(String(p.excluirIcmsBasePisCofins !== false), 'false') + '>Não</option></select></label>' +
      '</div><h3 style="margin-top:12px">Endereço</h3><div class="grid">' + field('CEP', 'cfg.cep', en.cep, 'Busca o endereço automaticamente') + field('Logradouro', 'cfg.logradouro', en.logradouro) + field('Número', 'cfg.numero', en.numero) + field('Complemento', 'cfg.complemento', en.complemento) +
      field('Bairro', 'cfg.bairro', en.bairro) + field('Município', 'cfg.municipio', en.municipio) + field('Código IBGE', 'cfg.codigoMunicipio', en.codigoMunicipio) +
      '<label class="f">UF<select data-k="cfg.uf">' + UFS.map((u) => '<option' + sel(en.uf || 'SP', u) + '>' + u + '</option>').join('') + '</select></label>' + field('Telefone', 'cfg.telefone', en.telefone) +
      '</div><h3 style="margin-top:12px">Emissão</h3><div class="grid">' +
      '<label class="f">Ambiente<select data-k="cfg.ambiente"><option value="2"' + sel(p.ambiente || 2, 2) + '>Homologação (testes)</option><option value="1"' + sel(p.ambiente, 1) + '>Produção (validade fiscal)</option></select></label>' +
      field('Série', 'cfg.serie', p.serie == null ? 1 : p.serie) + field('Próximo número', 'cfg.proximoNumero', p.proximoNumero || 1) +
      '<label class="f" style="grid-column:1/-1">Texto padrão em informações complementares<textarea data-k="cfg.informacoesComplementaresPadrao" rows="2">' + esc(p.informacoesComplementaresPadrao || '') + '</textarea></label>' +
      '</div><div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="salvar-cfg">Salvar dados fiscais</button></div><div class="msg" data-cmsg></div></div></section>' +
      '<section><h3>Certificado digital A1</h3><div class="box">' +
      (cert ? '<p class="t"><b>' + esc(cert.titular) + '</b><br>CNPJ ' + esc(cert.cnpj) + ' · válido até <b>' + esc(String(cert.validoAte).slice(0, 10).split('-').reverse().join('/')) + '</b> · enviado por ' + esc(cert.enviadoPor || '—') + '</p>' : '<p class="t">Nenhum certificado enviado.</p>') +
      '<div class="grid"><label class="f">Arquivo .pfx ou .p12<input type="file" accept=".pfx,.p12" data-k="cert.file"></label><label class="f">Senha do certificado<input type="password" data-k="cert.senha" autocomplete="new-password"></label></div>' +
      '<div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="enviar-cert">Enviar certificado</button>' + (cert ? '<button type="button" class="btn d" data-act="remover-cert">Remover</button>' : '') +
      '<span style="flex:1"></span><button type="button" class="btn s" data-act="status-sefaz">Testar conexão com a SEFAZ</button></div><div class="msg" data-certmsg></div>' +
      '<p class="muted" style="margin:8px 0 0">O certificado e a senha ficam cifrados no servidor e nunca voltam para o navegador.</p></div></section>';
  }

  // ---------------------------------------------------------------------------
  // Plataforma (administrador do MotorDesk)
  // ---------------------------------------------------------------------------
  async function renderPlataforma() {
    const b = body();
    try {
      const r = await api('GET', '/plataforma');
      const rt = r.responsavel_tecnico || {};
      b.innerHTML = '<section><h3>Responsável técnico (software house)</h3><p class="t">Vai em todas as NF-e (grupo infRespTec), obrigatório na SEFAZ-SP.</p><div class="box"><div class="grid">' +
        field('CNPJ', 'rt.cnpj', rt.cnpj) + field('Contato', 'rt.contato', rt.contato) + field('E-mail', 'rt.email', rt.email) + field('Telefone com DDD', 'rt.fone', rt.fone) +
        '</div></div></section><section><h3>Alíquotas por UF (DIFAL, ICMS-ST)</h3><p class="t">Valores padrão que precisam ser conferidos pela contabilidade; o produto pode informar a alíquota específica.</p>' +
        '<div class="tw"><table><thead><tr><th>UF</th><th>Alíquota interna %</th><th>FCP %</th><th>Base DIFAL</th></tr></thead><tbody>' +
        UFS.map((uf) => { const x = r.tabela_uf[uf] || {}; return '<tr><td>' + uf + '</td><td><input data-uf="' + uf + '" data-c="aliqInterna" value="' + esc(x.aliqInterna) + '" style="width:80px"></td><td><input data-uf="' + uf + '" data-c="fcp" value="' + esc(x.fcp) + '" style="width:70px"></td><td><select data-uf="' + uf + '" data-c="difalBase"><option value="dupla"' + sel(x.difalBase, 'dupla') + '>Dupla (LC 190/22)</option><option value="unica"' + sel(x.difalBase, 'unica') + '>Única</option></select></td></tr>'; }).join('') +
        '</tbody></table></div></section><section><h3>Códigos de receita GNRE</h3><div class="box"><div class="grid">' +
        ['st', 'difal', 'fcp'].map((k) => field({ st: 'ICMS-ST por operação', difal: 'DIFAL consumidor final', fcp: 'FCP por operação' }[k], 'gnre.' + k, (r.receitas_gnre[k] || {}).codigo)).join('') +
        '</div></div></section><div class="row"><button type="button" class="btn" data-act="salvar-plataforma">Salvar</button></div><div class="msg" data-pmsg></div>';
      b._receitas = r.receitas_gnre;
    } catch (err) { b.innerHTML = '<p class="t bad">' + esc(err.message) + '</p>'; }
  }

  // ---------------------------------------------------------------------------
  // Eventos de interface
  // ---------------------------------------------------------------------------
  function setPath(obj, path, value) { const ks = path.split('.'); let o = obj; while (ks.length > 1) { const k = ks.shift(); o[k] = o[k] || {}; o = o[k]; } o[ks[0]] = value; }

  async function cepLookup(prefix, cep) {
    const c = digits(cep);
    if (c.length !== 8) return;
    try {
      const r = await (await fetch('https://viacep.com.br/ws/' + c + '/json/')).json();
      if (r.erro) return;
      const map = prefix === 'dest' ? { logradouro: 'dest.logradouro', bairro: 'dest.bairro', localidade: 'dest.municipio', ibge: 'dest.ibge', uf: 'dest.uf' } : { logradouro: 'cfg.logradouro', bairro: 'cfg.bairro', localidade: 'cfg.municipio', ibge: 'cfg.codigoMunicipio', uf: 'cfg.uf' };
      Object.keys(map).forEach((k) => {
        const el = body().querySelector('[data-k="' + map[k] + '"]');
        if (el && r[k]) { el.value = r[k]; if (prefix === 'dest') setPath(draft, map[k], r[k]); }
      });
      if (prefix === 'dest') { refreshCfops(); const tb = body().querySelector('[data-items]'); if (tb) tb.innerHTML = itemsRows(); }
    } catch (e) {}
  }

  function onInput(e) {
    const t = e.target;
    if (tab === 'emitir' && t.dataset.k && !['clientSearch', 'partSearch'].includes(t.dataset.k)) setPath(draft, t.dataset.k, t.value);
    if (tab === 'emitir' && t.dataset.i !== undefined) {
      const it = draft.items[Number(t.dataset.i)];
      it[t.dataset.f] = t.value;
      if (t.dataset.f === 'cfop') it.cfopManual = true;
      if (t.dataset.f === 'cst' && !it.cfopManual) { it.cfop = suggestCfop(it); const c = body().querySelector('[data-i="' + t.dataset.i + '"][data-f="cfop"]'); if (c) c.value = it.cfop; }
    }
  }

  function onChange(e) {
    const t = e.target;
    const k = t.dataset.k;
    if (tab === 'emitir' && k === 'clientSearch') {
      const opt = Array.from(body().querySelectorAll('#md-fis-clients option')).find((o) => o.value === t.value);
      const c = opt && (db().clients || []).find((x) => x.id === opt.dataset.id);
      if (c) {
        const doc = digits(c.cpfCnpj || c.cpf);
        draft.dest = Object.assign({}, draft.dest, { nome: c.name, doc, email: c.email || '', indicador: doc.length === 14 ? (c.stateRegistration || c.ie ? '1' : '9') : '9', ie: c.stateRegistration || c.ie || '' });
        renderEmitir();
      }
    }
    if (tab === 'emitir' && k === 'partSearch') {
      const p = (db().parts || []).find((x) => ((x.code || '') + ' — ' + x.name) === t.value);
      if (p) { addPart(p); t.value = ''; body().querySelector('[data-items]').innerHTML = itemsRows(); }
    }
    if (tab === 'emitir' && (k === 'dest.uf' || k === 'dest.indicador' || k === 'dest.suframa')) { setPath(draft, k, t.value); refreshCfops(); body().querySelector('[data-items]').innerHTML = itemsRows(); }
    if (tab === 'emitir' && k && k.indexOf('dest.') !== 0 && ['pagamento', 'frete', 'consumidorFinal'].includes(k)) setPath(draft, k, t.value);
    if (k === 'dest.cep') cepLookup('dest', t.value);
    if (k === 'cfg.cep') cepLookup('cfg', t.value);
  }

  async function onClick(e) {
    const t = e.target.closest('[data-act],[data-tab]');
    if (!t) { if (e.target === root) close(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; render(); return; }
    const act = t.dataset.act;
    const b = body();
    const val = (k) => { const el = b.querySelector('[data-k="' + k + '"]'); return el ? el.value : ''; };
    if (act === 'close') return close();
    if (act === 'add-blank') { draft.items.push({ codigo: '', descricao: '', ncm: '', cest: '', cst: crt() === 3 ? '00' : '102', origem: '0', quantidade: 1, valorUnitario: '', desconto: '', mva: '', unidade: 'UN', cfop: '' }); draft.items[draft.items.length - 1].cfop = suggestCfop(draft.items[draft.items.length - 1]); b.querySelector('[data-items]').innerHTML = itemsRows(); return; }
    if (act === 'rm-item') { draft.items.splice(Number(t.dataset.i), 1); b.querySelector('[data-items]').innerHTML = itemsRows(); return; }
    if (act === 'limpar') { draft = newDraft(); renderEmitir(); return; }
    if (act === 'calcular') return calcular(t);
    if (act === 'emitir') return emitir(t);
    if (act === 'danfe') return openDanfe(t.dataset.ref);
    if (act === 'xml') return downloadXml(t.dataset.ref, t.dataset.chave);
    if (act === 'guias') {
      const n = (b._notas || []).find((x) => x.ref === t.dataset.ref);
      const s = slot(t.dataset.ref);
      if (s) s.innerHTML = '<div class="inline">' + guiasTable((n && n.guias) || []) + '</div>';
      return;
    }
    if (act === 'cce' || act === 'cancelar') {
      const s = slot(t.dataset.ref);
      if (!s) return;
      const isCancel = act === 'cancelar';
      s.innerHTML = '<div class="inline"><label class="f">' + (isCancel ? 'Justificativa do cancelamento (15 a 255 caracteres)' : 'Texto da correção (15 a 1000 caracteres; não corrige valores, impostos, destinatário nem datas)') + '<textarea rows="2" data-k="ev.texto"></textarea></label><div class="row" style="margin-top:6px"><button type="button" class="btn ' + (isCancel ? 'd' : '') + ' sm" data-act="' + (isCancel ? 'confirmar-cancelar' : 'confirmar-cce') + '" data-ref="' + esc(t.dataset.ref) + '">' + (isCancel ? 'Confirmar cancelamento' : 'Enviar carta de correção') + '</button><span class="msg" data-evmsg></span></div></div>';
      s.querySelector('textarea').focus();
      return;
    }
    if (act === 'confirmar-cancelar' || act === 'confirmar-cce') {
      const s = slot(t.dataset.ref);
      const texto = s.querySelector('[data-k="ev.texto"]').value.trim();
      const out = s.querySelector('[data-evmsg]');
      t.disabled = true;
      try {
        const r = act === 'confirmar-cancelar'
          ? await api('DELETE', '/nfe/' + encodeURIComponent(t.dataset.ref), { justificativa: texto })
          : await api('POST', '/nfe/' + encodeURIComponent(t.dataset.ref) + '/carta_correcao', { correcao: texto });
        out.className = 'msg ok';
        out.textContent = r.mensagem_evento || 'Registrado.';
        setTimeout(renderNotas, 1200);
      } catch (err) { out.className = 'msg bad'; out.textContent = (err.data && err.data.mensagem_evento) || err.message; t.disabled = false; }
      return;
    }
    if (act === 'consultar') {
      t.disabled = true;
      try { await api('GET', '/nfe/' + encodeURIComponent(t.dataset.ref)); } catch (e) {}
      renderNotas();
      return;
    }
    if (act === 'inutilizar') {
      const out = b.querySelector('[data-imsg]');
      t.disabled = true;
      try {
        const r = await api('POST', '/nfe/inutilizacao', { serie: Number(val('inut.serie')), numero_inicial: Number(val('inut.ini')), numero_final: Number(val('inut.fim')), justificativa: val('inut.just') });
        out.className = 'msg ok';
        out.textContent = 'Numeração ' + r.numero_inicial + ' a ' + r.numero_final + ' inutilizada. Protocolo ' + r.protocolo_sefaz + '.';
      } catch (err) { out.className = 'msg bad'; out.textContent = (err.data && err.data.mensagem_sefaz) || err.message; } finally { t.disabled = false; }
      return;
    }
    if (act === 'salvar-cfg') {
      const out = b.querySelector('[data-cmsg]');
      t.disabled = true;
      try {
        const r = await api('PUT', '/empresa', {
          cnpj: val('cfg.cnpj'), razaoSocial: val('cfg.razaoSocial'), nomeFantasia: val('cfg.nomeFantasia'), ie: val('cfg.ie'), im: val('cfg.im'), cnae: val('cfg.cnae'),
          crt: Number(val('cfg.crt')), pisCofinsRegime: val('cfg.pisCofinsRegime'), aliqCreditoSimples: val('cfg.aliqCreditoSimples') === '' ? undefined : Number(String(val('cfg.aliqCreditoSimples')).replace(',', '.')),
          contribuinteIpi: val('cfg.contribuinteIpi') === 'true', excluirIcmsBasePisCofins: val('cfg.excluirIcmsBasePisCofins') === 'true',
          endereco: { cep: digits(val('cfg.cep')), logradouro: val('cfg.logradouro'), numero: val('cfg.numero'), complemento: val('cfg.complemento'), bairro: val('cfg.bairro'), municipio: val('cfg.municipio'), codigoMunicipio: digits(val('cfg.codigoMunicipio')), uf: val('cfg.uf'), telefone: digits(val('cfg.telefone')) },
          ambiente: Number(val('cfg.ambiente')), serie: Number(val('cfg.serie')), proximoNumero: Number(val('cfg.proximoNumero')), informacoesComplementaresPadrao: val('cfg.informacoesComplementaresPadrao'),
        });
        empresa = Object.assign({}, empresa, r);
        out.className = 'msg ok';
        out.textContent = r.configurado ? 'Salvo. A empresa está pronta para emitir.' : 'Salvo. Pendências: ' + r.pendencias.join(' ');
      } catch (err) { showErrors('[data-cmsg]', err); } finally { t.disabled = false; }
      return;
    }
    if (act === 'enviar-cert') {
      const out = b.querySelector('[data-certmsg]');
      const file = b.querySelector('[data-k="cert.file"]').files[0];
      if (!file) { out.className = 'msg bad'; out.textContent = 'Escolha o arquivo do certificado.'; return; }
      t.disabled = true;
      try {
        const base64 = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result).split(',')[1] || ''); fr.onerror = reject; fr.readAsDataURL(file); });
        await api('POST', '/empresa/certificado', { arquivo_base64: base64, senha: val('cert.senha') });
        renderConfig();
      } catch (err) { out.className = 'msg bad'; out.textContent = err.message; t.disabled = false; }
      return;
    }
    if (act === 'remover-cert') {
      if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'Confirmar remoção'; return; }
      try { await api('DELETE', '/empresa/certificado'); renderConfig(); } catch (err) { t.textContent = err.message; }
      return;
    }
    if (act === 'status-sefaz') {
      const out = b.querySelector('[data-certmsg]');
      t.disabled = true;
      out.className = 'msg'; out.textContent = 'Consultando a SEFAZ…';
      try {
        const r = await api('GET', '/sefaz/status');
        out.className = r.em_operacao ? 'msg ok' : 'msg bad';
        out.textContent = 'SEFAZ ' + r.uf + ' (' + r.ambiente + '): ' + r.status_sefaz + ' - ' + r.mensagem_sefaz + '.';
      } catch (err) { out.className = 'msg bad'; out.textContent = err.message; } finally { t.disabled = false; }
      return;
    }
    if (act === 'salvar-plataforma') {
      const out = b.querySelector('[data-pmsg]');
      const tabela = {};
      b.querySelectorAll('[data-uf]').forEach((el) => { tabela[el.dataset.uf] = tabela[el.dataset.uf] || {}; tabela[el.dataset.uf][el.dataset.c] = el.dataset.c === 'difalBase' ? el.value : Number(String(el.value).replace(',', '.')); });
      const rec = Object.assign({}, b._receitas || {});
      ['st', 'difal', 'fcp'].forEach((k) => { rec[k] = Object.assign({}, rec[k] || {}, { codigo: val('gnre.' + k) }); });
      t.disabled = true;
      try {
        await api('PUT', '/plataforma', { responsavel_tecnico: { cnpj: val('rt.cnpj'), contato: val('rt.contato'), email: val('rt.email'), fone: val('rt.fone') }, tabela_uf: tabela, receitas_gnre: rec });
        out.className = 'msg ok'; out.textContent = 'Salvo.';
      } catch (err) { showErrors('[data-pmsg]', err); } finally { t.disabled = false; }
    }
  }

  // ---------------------------------------------------------------------------
  // Item no menu lateral (quem tem o módulo fiscal)
  // ---------------------------------------------------------------------------
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h12l4 4v16H4z"/><path d="M8 10h8M8 14h8M8 18h5"/></svg>';
  function injectMenu() {
    const nav = document.querySelector('#sidebar-container nav');
    const existing = document.getElementById('menu-btn-notas-fiscais');
    const u = user();
    if (!nav || !perm(u, 'accessFiscal')) { if (existing) existing.remove(); return; }
    ensureStyles();
    const sidebar = document.getElementById('sidebar-container');
    const collapsed = sidebar && sidebar.offsetWidth < 100;
    let btn = existing;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'menu-btn-notas-fiscais';
      btn.title = 'Notas Fiscais (NF-e)';
      btn.addEventListener('click', () => open());
    }
    const html = ICON + (collapsed ? '' : '<span>Notas Fiscais (NF-e)</span>');
    if (btn.innerHTML !== html) btn.innerHTML = html;
    btn.style.justifyContent = collapsed ? 'center' : '';
    const integ = document.getElementById('menu-btn-integracoes');
    if (integ && integ.parentElement === nav) { if (btn.nextElementSibling !== integ) nav.insertBefore(btn, integ); }
    else if (btn.parentElement !== nav || nav.lastElementChild !== btn) nav.appendChild(btn);
  }

  setInterval(injectMenu, 1000);
  window.MotorDeskOpenFiscal = open;
})();
