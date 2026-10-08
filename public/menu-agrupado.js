/**
 * MotorDesk - Organiza os itens de menu acrescentados pelos módulos extras dentro dos grupos que já existem.
 *
 *  - Transações, Conciliação de Pedidos e Notas Fiscais (NF-e) entram no submenu "Financeiro & Fiscal"
 *    (painel que abre ao passar o mouse), com o mesmo visual dos itens de lá, e saem da lista principal.
 *  - Cada módulo continua decidindo quem vê o item (o botão original fica no menu, oculto, e é ele que
 *    abre a tela). Sem o grupo Financeiro para o usuário, os itens continuam na lista principal.
 *  - Integrações e API fica logo abaixo de "Conexões & Módulos".
 */
(function () {
  'use strict';

  const ITENS = [
    // [id do botão original, id no submenu, emoji, rótulo, depois de qual item do submenu (sem âncora: fim da lista)]
    // Cada item tem âncoras próprias: dois itens disputando a mesma posição ficariam se empurrando.
    ['menu-btn-fin-transacoes', 'md-transacoes', '💵', 'Transações', ['flyout-sub-financial-accounts_payable', 'flyout-sub-financial-accounts_receivable']],
    ['menu-btn-rep-conciliacao', 'md-conciliacao-pedidos', '✅', 'Conciliação de Pedidos', ['flyout-sub-financial-representative_orders']],
    ['menu-btn-notas-fiscais', 'md-notas-fiscais', '🧾', 'Notas Fiscais (NF-e)', ['flyout-sub-financial-fiscal', 'flyout-sub-financial-fiscal_conference']],
  ];
  const CLASSE = 'md-menu-agrupado';

  function estilos() {
    if (document.getElementById('md-menu-agrupado-style')) return;
    const st = document.createElement('style');
    st.id = 'md-menu-agrupado-style';
    st.textContent = 'body.' + CLASSE + ' ' + ITENS.map((i) => '#' + i[0]).join(', body.' + CLASSE + ' ') + '{display:none !important}';
    document.head.appendChild(st);
  }

  // Só agrupa quando o usuário vê o grupo Financeiro & Fiscal (senão os itens ficariam inacessíveis)
  function atualizarAgrupamento() {
    if (!document.body) return;
    const temGrupo = Boolean(document.getElementById('menu-btn-financial-parent'));
    document.body.classList.toggle(CLASSE, temGrupo);
  }

  function preencherSubmenu() {
    const painel = document.getElementById('flyout-menu-container-financial');
    if (!painel || !document.body || !document.body.classList.contains(CLASSE)) return;
    const modelo = painel.querySelector('button[id^="flyout-sub-financial-"]:not([data-md-extra])');
    if (!modelo) return;
    const lista = modelo.parentElement;
    for (const [origem, id, emoji, rotulo, ancoras] of ITENS) {
      const original = document.getElementById(origem);
      const subId = 'flyout-sub-financial-' + id;
      let item = document.getElementById(subId);
      if (!original) { if (item) item.remove(); continue; }
      if (!item) {
        item = modelo.cloneNode(true);
        item.id = subId;
        item.title = rotulo;
        item.setAttribute('data-md-extra', '1');
        item.classList.remove('bg-indigo-600', 'text-white');
        const spans = item.querySelectorAll('span');
        if (spans[0]) spans[0].textContent = emoji;
        if (spans[1]) spans[1].textContent = rotulo;
        for (let k = 2; k < spans.length; k++) spans[k].remove(); // contadores/selos do item copiado
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          painel.style.display = 'none';
          const botao = document.getElementById(origem);
          if (botao) botao.click();
        });
      }
      const ancora = ancoras.map((a) => document.getElementById(a)).find((a) => a && a.parentElement === lista);
      if (ancora) { if (ancora.nextElementSibling !== item) ancora.after(item); }
      else if (item.parentElement !== lista) lista.appendChild(item);
    }
    // Rodapé "N telas disponíveis" passa a contar os itens acrescentados
    const total = lista.querySelectorAll('button[id^="flyout-sub-"]').length;
    const rodape = [...painel.querySelectorAll('span, div')].find((e) => e.children.length === 0 && /^\d+ telas? disponíve(l|is)$/.test((e.textContent || '').trim()));
    const texto = total + (total === 1 ? ' tela disponível' : ' telas disponíveis');
    if (rodape && rodape.textContent.trim() !== texto) rodape.textContent = texto;
  }

  // Integrações e API logo abaixo de "Conexões & Módulos"
  function posicionarIntegracoes() {
    const integ = document.getElementById('menu-btn-integracoes');
    const conexoes = document.getElementById('btn-sidebar-device-connections');
    if (integ && conexoes && conexoes.parentElement === integ.parentElement && conexoes.nextElementSibling !== integ) conexoes.after(integ);
  }

  function ciclo() {
    if (!document.body) return;
    estilos();
    atualizarAgrupamento();
    posicionarIntegracoes();
    preencherSubmenu();
  }

  let agendado = false;
  new MutationObserver(() => {
    if (agendado || !document.getElementById('flyout-menu-container-financial')) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; preencherSubmenu(); });
  })
    .observe(document.documentElement, { childList: true, subtree: true });
  setInterval(ciclo, 500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ciclo); else ciclo();
})();
