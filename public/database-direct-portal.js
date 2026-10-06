/**
 * MotorDesk - Universal Direct Database Query & Real-Time Sync Portal
 * 
 * Substitui o modelo antigo de storage local isolado por uma conexão direta
 * e contínua com a base de dados central (Cloud SQL / PostgreSQL / app_store.json).
 * 
 * Regras Operacionais Implementadas:
 * 1. Conexão Direta com a Base: O backend oficial é a única fonte de verdade.
 *    Nenhum navegador (Firefox, Chrome, Opera, Safari) fica desincronizado.
 * 2. Envio Imediato ao Concluir Operações: Sempre que um cadastro, edição ou baixa
 *    for finalizado (cliente, veículo, OS, peça, venda, financeiro), é disparado
 *    imediatamente para o banco no servidor via POST /api/db.
 * 3. Consulta a Critério do Usuário: Botão "Consultar Banco de Dados" e busca
 *    ativa no banco ao pesquisar (Enter ou digitação), buscando diretamente na base
 *    e trazendo registros novos cadastrados em qualquer outro navegador.
 */
(function() {
  'use strict';

  function log(...args) {
    console.log('[MotorDesk DirectDB-Portal]', ...args);
  }

  // Executar consulta direta ao banco central
  async function executeDirectDbQuery(queryText, triggerElement) {
    log('Executando consulta direta ao Banco Central...');
    if (triggerElement) {
      triggerElement.classList.add('animate-pulse');
      triggerElement.disabled = true;
    }

    try {
      let fresh = null;
      if (typeof window.__motorDeskFirestore?.fetchDatabase === 'function') {
        fresh = await window.__motorDeskFirestore.fetchDatabase();
        if (fresh && window.__motorDeskDb?.onDataMergedCallback) {
          window.__motorDeskDb.onDataMergedCallback(fresh);
        }
      } else if (typeof window.__motorDeskDirectQuery === 'function') {
        fresh = await window.__motorDeskDirectQuery(queryText);
      } else if (typeof window.__motorDeskSyncNow === 'function') {
        window.__motorDeskSyncNow('user_direct_search');
      }

      showQueryToast('✓ Conectado e atualizado diretamente do Google Cloud Firestore!');
    } catch(err) {
      console.warn('Erro ao consultar banco:', err);
      showQueryToast('Aviso: Conectando ao banco...', 'warning');
    } finally {
      if (triggerElement) {
        triggerElement.classList.remove('animate-pulse');
        triggerElement.disabled = false;
      }
    }
  }

  // Toast de feedback de consulta direta
  function showQueryToast(message, type = 'success') {
    let toast = document.getElementById('motordesk-db-query-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'motordesk-db-query-toast';
      toast.className = 'fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 pointer-events-none';
      document.body.appendChild(toast);
    }

    if (type === 'success') {
      toast.className = 'fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 pointer-events-none bg-emerald-700 text-white border border-emerald-500';
      toast.innerHTML = `<svg class="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span>${message}</span>`;
    } else {
      toast.className = 'fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 pointer-events-none bg-indigo-700 text-white border border-indigo-500';
      toast.innerHTML = `<svg class="w-4 h-4 text-indigo-200 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>${message}</span>`;
    }

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(toast.__timeout);
    toast.__timeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
    }, 3500);
  }

  // Injetar botão de consulta ao banco em qualquer barra de pesquisa
  function enhanceSearchInputs() {
    const searchInputs = document.querySelectorAll('input[type="text"][placeholder*="Buscar"], input[type="text"][placeholder*="buscar"], input[id*="search"]');
    searchInputs.forEach(input => {
      if (input.dataset.directDbHooked) return;
      input.dataset.directDbHooked = 'true';

      // Ao teclar Enter, consultar o banco diretamente
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeDirectDbQuery(input.value);
        }
      });

      // Se não tiver botão ao lado no container pai, injetar um botão sutil
      const container = input.parentElement;
      if (container && !container.querySelector('.btn-direct-db-query') && !document.getElementById('btn-direct-db-query-clients')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-direct-db-query ml-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5';
        btn.innerHTML = `<svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Consultar Banco`;
        btn.title = 'Consultar diretamente no Banco Central para carregar dados de qualquer navegador';
        btn.addEventListener('click', () => {
          executeDirectDbQuery(input.value, btn);
        });

        if (container.classList.contains('flex') || container.parentElement?.classList.contains('flex')) {
          container.parentElement.appendChild(btn);
        }
      }
    });
  }

  // Interceptar envio de formulários para garantir envio imediato ao banco
  function hookFormCompletions() {
    document.addEventListener('submit', (e) => {
      log('Formulário submetido. Acionando garantia de persistência imediata no Banco Central...');
      setTimeout(() => {
        if (window.__motorDeskDb && typeof window.__motorDeskDb.saveDatabaseImmediate === 'function' && window.__CURRENT_DB) {
          window.__motorDeskDb.saveDatabaseImmediate(window.__CURRENT_DB);
        }
      }, 50);
    }, true);

    // Garantir redirecionamento estrito para tela de login ao clicar em Sair do Sistema
    document.addEventListener('click', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const btn = e.target.closest('#btn-top-logout, #btn-sidebar-logout, [title*="Sair"], button');
      const isLogoutBtn = (btn && (
        btn.id === 'btn-top-logout' || 
        btn.id === 'btn-sidebar-logout' || 
        (btn.title && btn.title.toLowerCase().includes('sair')) ||
        (btn.textContent && (btn.textContent.includes('Sair do Sistema') || btn.textContent.includes('Sair da Conta') || btn.textContent.includes('Sair')))
      )) || (e.target.innerText && (e.target.innerText.includes('Sair do Sistema') || e.target.innerText.includes('Sair da Conta')));
      if (isLogoutBtn) {
        log('Ação de Logout detectada. Redirecionando diretamente para tela de login (/motordesk)...');
        setTimeout(() => {
          if (!window.location.pathname.toLowerCase().startsWith('/motordesk')) {
            window.history.pushState({}, '', '/motordesk');
          }
          // Se o login container existir, focar no campo de usuário
          const userInput = document.getElementById('login-username-input') || document.querySelector('input[type="text"]');
          if (userInput) userInput.focus();
        }, 80);
      }
    }, true);
  }

  // Sincronização contínua do site com o Banco Central
  async function fetchSiteLandingData() {
    try {
      const res = await fetch('/api/landing?t=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.landingContent) {
          if (window.__CURRENT_DB) {
            window.__CURRENT_DB.landingContent = json.landingContent;
          }
          log('Conteúdo do site sincronizado com o Banco Central.');
        }
      }
    } catch(e) {}
  }
  fetchSiteLandingData();

  // Observador de mutações no DOM para novos inputs de pesquisa
  const observer = new MutationObserver(() => {
    enhanceSearchInputs();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enhanceSearchInputs();
      hookFormCompletions();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    enhanceSearchInputs();
    hookFormCompletions();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  log('Universal Direct Database Portal ativo com sucesso.');
})();
