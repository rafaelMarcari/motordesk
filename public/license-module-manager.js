/**
 * MotorDesk - Gerenciador Dinâmico de Licenciamento & Liberação de Módulos Pós-Contratação
 * Permite liberar módulos (Boletos Bancários, Fiscal, PDV, PCP, etc.) e gerenciar licença de operadores (5 usuários base + valor por usuário adicional)
 */

(function () {
  'use strict';

  console.log('[MotorDesk] Inicializando Gerenciador de Licença & Módulos...');

  const ALL_MODULES_CONFIG = [
    {
      key: 'accessBoletos',
      label: 'Boletos Bancários & Emissão PIX Cobrança',
      description: 'Geração e registro de boletos bancários com código de barras, linha digitável e QR Code PIX dinâmico.',
      icon: 'receipt',
      category: 'Financeiro & Bancário',
      defaultPrice: 29.90,
    },
    {
      key: 'accessFiscal',
      label: 'Emissão Fiscal SEFAZ (NF-e, NFC-e, NFS-e)',
      description: 'Transmissão eletrônica de notas fiscais, DANFE, cartas de correção e integração SEFAZ.',
      icon: 'file-text',
      category: 'Fiscal & Tributário',
      defaultPrice: 59.90,
    },
    {
      key: 'accessFinancial',
      label: 'Fluxo de Caixa Avançado & DRE Gerencial',
      description: 'Controle de contas a pagar, contas a receber, conciliação bancária e demonstrativos de resultado.',
      icon: 'dollar-sign',
      category: 'Financeiro & Bancário',
      defaultPrice: 49.90,
    },
    {
      key: 'accessSales',
      label: 'Vendas & Balcão (PDV / Comércio)',
      description: 'Ponto de venda com leitor de código de barras, abertura/fechamento de caixa e sangrias.',
      icon: 'shopping-cart',
      category: 'Vendas & Estoque',
      defaultPrice: 49.90,
    },
    {
      key: 'accessServiceOrders',
      label: 'Ordens de Serviço & Checklist Técnico',
      description: 'Abertura de O.S., atribuição a mecânicos, apontamento de mão de obra e fotos de inspeção.',
      icon: 'wrench',
      category: 'Oficina & Manutenção',
      defaultPrice: 39.90,
    },
    {
      key: 'accessBudgets',
      label: 'Orçamentos & Propostas Comerciais',
      description: 'Elaboração e envio de orçamentos em PDF com botão de aprovação rápida por WhatsApp.',
      icon: 'calculator',
      category: 'Oficina & Vendas',
      defaultPrice: 29.90,
    },
    {
      key: 'accessParts',
      label: 'Gestão de Peças & Estoque Avançado',
      description: 'Controle de saldo, localização de prateleira, ponto de reposição e importação de XML de fornecedor.',
      icon: 'package',
      category: 'Vendas & Estoque',
      defaultPrice: 39.90,
    },
    {
      key: 'accessProduction',
      label: 'Produção & PCP Industrial (BOM / O.P. / Lotes)',
      description: 'Estrutura de produtos (BOM), ordens de produção, rastreabilidade de lote e apontamento industrial.',
      icon: 'cpu',
      category: 'Indústria & PCP',
      defaultPrice: 79.90,
    },
    {
      key: 'accessNotificationEngine',
      label: 'Central de Notificações & WhatsApp Automático',
      description: 'Disparos automáticos de aviso de OS concluída, vencimento de boletos e lembretes de revisão.',
      icon: 'bell',
      category: 'Comunicação',
      defaultPrice: 29.90,
    },
    {
      key: 'accessQAPanel',
      label: 'Painel de Homologação & QA Operacional',
      description: 'Auditoria de integridade fiscal, validação de transações e checklist de conformidade.',
      icon: 'shield-check',
      category: 'Governança & QA',
      defaultPrice: 49.90,
    },
  ];

  // Helper para obter dados da aplicação do localStorage
  function getLocalAppDb() {
    try {
      const keys = ['motordesk_db', 'motordesk_app_store', 'app_store_cache'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
    } catch (e) {
      console.warn('[MotorDesk] Erro ao ler banco local:', e);
    }
    return null;
  }

  // Helper para salvar dados localmente e sincronizar via API
  async function persistUpdatedCompany(updatedCompany) {
    if (!updatedCompany || !updatedCompany.id) return;

    // Atualizar no localStorage
    try {
      const keys = ['motordesk_db', 'motordesk_app_store', 'app_store_cache'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const db = JSON.parse(raw);
          if (Array.isArray(db.registeredCompanies)) {
            const idx = db.registeredCompanies.findIndex(c => c.id === updatedCompany.id);
            if (idx !== -1) db.registeredCompanies[idx] = updatedCompany;
            else db.registeredCompanies.push(updatedCompany);
          }
          if (db.companyInfo && db.companyInfo.id === updatedCompany.id) {
            db.companyInfo = updatedCompany;
          }
          localStorage.setItem(k, JSON.stringify(db));
        }
      }
    } catch (e) {
      console.warn('[MotorDesk] Erro ao gravar local:', e);
    }

    // Salvar via API backend
    try {
      const response = await fetch(`/api/companies/${encodeURIComponent(updatedCompany.id)}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: updatedCompany.globalModules,
          contractModules: updatedCompany.contractModules,
        }),
      });
      const data = await response.json();
      console.log('[MotorDesk] Módulos salvos com sucesso no backend:', data);
    } catch (err) {
      console.warn('[MotorDesk] Erro ao enviar módulos ao backend:', err);
    }
  }

  // Obter empresa atual ativa
  function getCurrentCompany() {
    const db = getLocalAppDb();
    if (!db) return null;

    let companyId = null;
    try {
      companyId = localStorage.getItem('motordesk_selected_company_id');
    } catch (e) {}

    if (companyId && Array.isArray(db.registeredCompanies)) {
      const found = db.registeredCompanies.find(c => c.id === companyId);
      if (found) return found;
    }

    if (db.companyInfo) return db.companyInfo;
    if (Array.isArray(db.registeredCompanies) && db.registeredCompanies.length > 0) {
      return db.registeredCompanies[0];
    }
    return null;
  }

  // Renderizar o painel de Gerenciamento de Licença & Módulos na tela de Assinatura
  function injectLicensingAndModulePanels() {
    // Verificar se estamos na tela de Assinatura ou Configurações da Empresa
    const company = getCurrentCompany();
    if (!company) return;

    // Buscar container da tela de Assinatura
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
    const subscriptionHeading = headings.find(h => 
      h.textContent && (
        h.textContent.includes('Assinatura') || 
        h.textContent.includes('Plano & Módulos') || 
        h.textContent.includes('Dados da Empresa') ||
        h.textContent.includes('Gestão de Assinatura')
      )
    );

    if (!subscriptionHeading) return;

    // Verificar se nosso painel já foi injetado
    if (document.getElementById('motordesk-license-modules-manager')) return;

    // Container pai
    const parentContainer = subscriptionHeading.closest('div.space-y-6, div.space-y-8, div.p-6, div.container, main') || subscriptionHeading.parentElement;
    if (!parentContainer) return;

    const userLimit = typeof company.userLimit === 'number' && company.userLimit > 0 ? company.userLimit : 5;
    const additionalPrice = typeof company.additionalUserPrice === 'number' && company.additionalUserPrice >= 0 ? company.additionalUserPrice : 29.90;
    const basePrice = typeof company.monthlyFee === 'number' ? company.monthlyFee : 199.90;
    const globalModules = company.globalModules || {};

    const db = getLocalAppDb();
    const isQaUser = (u) => u && (
      u.role === 'qa' ||
      u.role === 'QA' ||
      u.userType === 'qa' ||
      (u.username && (u.username.toLowerCase() === 'validador' || u.username.toLowerCase() === 'qa'))
    );

    const allCompanyUsers = (db?.users || []).filter(u => (u.companyId || 'comp-1') === company.id);
    const regularUsers = allCompanyUsers.filter(u => !isQaUser(u));
    const qaUsers = allCompanyUsers.filter(isQaUser);
    const usersCount = regularUsers.length;
    const extraUsers = Math.max(0, userLimit - 5);
    const extraFee = extraUsers * additionalPrice;
    const totalFee = (company.basePlanFee ?? basePrice) + extraFee;

    // Criar elemento principal
    const managerDiv = document.createElement('div');
    managerDiv.id = 'motordesk-license-modules-manager';
    managerDiv.className = 'mt-8 space-y-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-slate-100';

    managerDiv.innerHTML = `
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Licenciamento & Módulos Ativos
          </div>
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            Gestão de Licença e Liberação de Módulos
          </h3>
          <p class="text-sm text-slate-400 mt-1">
            Empresa: <strong class="text-slate-200">${company.name || 'Empresa Atual'}</strong> | CNPJ: ${company.cnpj || 'Não informado'} | ID: <span class="font-mono text-indigo-400 font-bold">${company.id || 'comp-1'}</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button id="md-refresh-license-btn" class="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Atualizar
          </button>
        </div>
      </div>

      <!-- CARD 1: LICENÇA DE USUÁRIOS & ISENÇÃO DO QA -->
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              👥
            </div>
            <div>
              <h4 class="font-bold text-base text-white">Licença de Operadores & Usuários</h4>
              <p class="text-xs text-slate-400">
                Plano base inclui <strong>5 operadores regulares</strong>. Usuários do perfil <strong>QA / Validador são ISENTOS</strong> e não consomem a cota.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-md ${usersCount >= userLimit ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">
              ${usersCount} de ${userLimit} operadores ocupados
            </span>
            ${qaUsers.length > 0 ? `
              <span class="text-xs font-semibold px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30" title="Usuários QA de validação e auditoria não contam no plano">
                🛡️ ${qaUsers.length} QA Isento(s)
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Alerta de Regra do QA e Acréscimo Configurável -->
        <div class="mb-4 p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-lg flex items-start gap-2.5 text-xs text-indigo-200">
          <span class="text-base shrink-0">📌</span>
          <div class="leading-relaxed">
            <strong>Regra de Licenciamento:</strong> O plano contratado contempla 5 operadores vinculados. 
            Usuários com papel <em>QA / Validador</em> (como o usuário homologador <code>validador</code>) realizam auditorias e <strong>não entram na contagem dos 5 operadores</strong>. 
            Ao liberar o próximo operador regular (a partir do 6º), haverá o <strong>acréscimo configurável</strong> no valor estipulado abaixo.
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div class="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
            <label class="block text-xs font-medium text-slate-400 mb-1">
              Limite de Operadores do Plano *
            </label>
            <div class="flex items-center gap-2">
              <input type="number" id="md-user-limit-input" min="1" max="100" value="${userLimit}" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-blue-500">
              <span class="text-xs text-slate-400 whitespace-nowrap">operadores</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">Base do plano: 5 operadores inclusos</p>
          </div>

          <div class="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
            <label class="block text-xs font-medium text-slate-400 mb-1">
              Valor por Usuário Adicional (R$) *
            </label>
            <div class="flex items-center gap-2">
              <input type="number" step="0.10" id="md-user-price-input" min="0" value="${additionalPrice.toFixed(2)}" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-blue-500">
              <span class="text-xs text-slate-400 whitespace-nowrap">R$/mês</span>
            </div>
            <p class="text-[11px] text-emerald-400 font-semibold mt-1">⚙️ Campo configurável por empresa</p>
          </div>

          <div class="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-center">
            <span class="text-xs font-medium text-slate-400">Mensalidade Total Calculada</span>
            <div class="text-lg font-black text-emerald-400 mt-1" id="md-total-fee-display">
              R$ ${totalFee.toFixed(2)}
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5" id="md-calc-explanation">
              ${extraUsers > 0 ? `+${extraUsers} usuário(s) extra(s): +R$ ${extraFee.toFixed(2)}/mês` : 'Sem acréscimo de usuários extras'}
            </p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-800/80 gap-3">
          <p class="text-xs text-slate-400">
            💡 Para liberar o 6º operador, aumente o limite acima para 6 ou mais. O acréscimo de <strong>R$ ${additionalPrice.toFixed(2)}/mês</strong> será aplicado e refletido automaticamente.
          </p>
          <button id="md-save-license-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer shrink-0">
            <span>💾 Salvar Licença & Recalcular</span>
          </button>
        </div>
      </div>

      <!-- CARD 2: LIBERAÇÃO DE MÓDULOS PÓS-CONTRATAÇÃO -->
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
              ⚡
            </div>
            <div>
              <h4 class="font-bold text-base text-white">Liberação Imediata de Módulos (Pós-Contratação)</h4>
              <p class="text-xs text-slate-400">Habilite ou desabilite recursos contratados para a empresa a qualquer momento, sem recriar cadastros.</p>
            </div>
          </div>
          <span class="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5 self-start sm:self-center">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            Liberação Instantânea
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="md-modules-grid">
          <!-- Injetado dinamicamente -->
        </div>

        <div class="mt-5 p-3.5 bg-blue-950/40 border border-blue-900/50 rounded-lg flex items-start gap-3 text-xs text-blue-200">
          <span class="text-base">💡</span>
          <div>
            <strong>Dica sobre Boletos Bancários & Emissão PIX:</strong> Ao clicar no botão <em>"Liberar para Empresa"</em>, o módulo de Boletos é ativado no contrato e passa a ficar visível e acessível imediatamente para todos os operadores da empresa.
          </div>
        </div>
      </div>
    `;

    // Inserir no DOM
    parentContainer.appendChild(managerDiv);

    // Renderizar grid de módulos
    renderModulesGrid(company);

    // Listeners para os botões e inputs
    setupLicenseEventListeners(company);
  }

  // Renderizar a lista de módulos com toggles
  function renderModulesGrid(company) {
    const grid = document.getElementById('md-modules-grid');
    if (!grid) return;

    const globalModules = company.globalModules || {};

    grid.innerHTML = ALL_MODULES_CONFIG.map(mod => {
      // Determinar se o módulo está liberado
      let isEnabled = Boolean(globalModules[mod.key]);
      if (mod.key === 'accessBoletos') {
        if (globalModules.accessBoletos !== undefined) {
          isEnabled = Boolean(globalModules.accessBoletos);
        } else if (globalModules.accessFiscal || globalModules.accessFinancial) {
          isEnabled = true;
        }
      }

      const isBoleto = mod.key === 'accessBoletos';

      return `
        <div class="p-4 rounded-xl border transition-all ${
          isEnabled 
            ? 'bg-slate-900/90 border-emerald-500/30 shadow-sm shadow-emerald-500/5' 
            : 'bg-slate-900/40 border-slate-800/80 opacity-90'
        } flex flex-col justify-between gap-3">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2">
                <span class="text-base ${isBoleto ? 'animate-bounce' : ''}">${isBoleto ? '💳' : '📦'}</span>
                <span class="font-bold text-sm text-white ${isBoleto ? 'text-emerald-300' : ''}">
                  ${mod.label}
                </span>
              </div>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded ${
                isEnabled 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }">
                ${isEnabled ? '✓ Contratado / Liberado' : 'Bloqueado'}
              </span>
            </div>
            <p class="text-xs text-slate-400 leading-relaxed">
              ${mod.description}
            </p>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-800/60 mt-auto">
            <span class="text-[11px] text-slate-400 font-medium">
              Valor ref: R$ ${mod.defaultPrice.toFixed(2)}/mês
            </span>
            <button 
              data-mod-key="${mod.key}" 
              data-mod-state="${isEnabled ? 'enabled' : 'disabled'}"
              class="md-toggle-module-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isEnabled 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 font-bold'
              }">
              ${isEnabled ? 'Bloquear Módulo' : 'Liberar para Empresa'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Adicionar eventos aos botões de toggle
    const toggleButtons = grid.querySelectorAll('.md-toggle-module-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const key = btn.getAttribute('data-mod-key');
        const currentState = btn.getAttribute('data-mod-state') === 'enabled';
        const newState = !currentState;

        btn.disabled = true;
        btn.textContent = 'Salvando...';

        // Atualizar módulo
        const currentCompany = getCurrentCompany();
        if (!currentCompany) return;

        const updatedGlobal = {
          ...(currentCompany.globalModules || {}),
          [key]: newState,
        };

        if (key === 'accessBoletos') {
          updatedGlobal.accessBoletos = newState;
          updatedGlobal.boletos = newState;
        }

        currentCompany.globalModules = updatedGlobal;
        await persistUpdatedCompany(currentCompany);

        // Re-renderizar grid
        renderModulesGrid(currentCompany);

        // Feedback toast
        showToast(
          newState ? 'Módulo Liberado com Sucesso!' : 'Módulo Bloqueado',
          `O recurso "${key}" foi ${newState ? 'liberado' : 'bloqueado'} para a empresa "${currentCompany.name}".`,
          newState ? 'success' : 'info'
        );
      });
    });
  }

  // Configurar eventos de licença (salvar limites de usuários)
  function setupLicenseEventListeners(company) {
    const limitInput = document.getElementById('md-user-limit-input');
    const priceInput = document.getElementById('md-user-price-input');
    const saveBtn = document.getElementById('md-save-license-btn');
    const refreshBtn = document.getElementById('md-refresh-license-btn');
    const feeDisplay = document.getElementById('md-total-fee-display');
    const explanation = document.getElementById('md-calc-explanation');

    function updateFeeCalculation() {
      if (!limitInput || !priceInput || !feeDisplay) return;
      const limit = parseInt(limitInput.value, 10) || 5;
      const price = parseFloat(priceInput.value) || 29.90;
      const basePrice = typeof company.monthlyFee === 'number' ? company.monthlyFee : 199.90;
      const extraUsers = Math.max(0, limit - 5);
      const extraFee = extraUsers * price;
      const total = basePrice + extraFee;

      feeDisplay.textContent = `R$ ${total.toFixed(2)}`;
      if (explanation) {
        explanation.textContent = extraUsers > 0 
          ? `+${extraUsers} usuários extras: +R$ ${extraFee.toFixed(2)}/mês` 
          : 'Sem cobrança de usuários extras';
      }
    }

    if (limitInput) limitInput.addEventListener('input', updateFeeCalculation);
    if (priceInput) priceInput.addEventListener('input', updateFeeCalculation);

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const newLimit = parseInt(limitInput.value, 10) || 5;
        const newPrice = parseFloat(priceInput.value) || 29.90;

        saveBtn.disabled = true;
        saveBtn.textContent = 'Gravando Licença...';

        try {
          const res = await fetch(`/api/companies/${encodeURIComponent(company.id)}/license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userLimit: newLimit,
              additionalUserPrice: newPrice,
            }),
          });
          const data = await res.json();
          if (data.success && data.company) {
            company.userLimit = newLimit;
            company.additionalUserPrice = newPrice;
            if (data.company.monthlyFee) company.monthlyFee = data.company.monthlyFee;
            await persistUpdatedCompany(company);

            showToast(
              'Licença Atualizada com Sucesso!',
              `Novo limite de ${newLimit} operadores configurado para a empresa "${company.name}".`,
              'success'
            );
          }
        } catch (err) {
          console.error('[MotorDesk] Erro ao salvar licença:', err);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Salvar Licença & Recalcular';
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const comp = getCurrentCompany();
        if (comp) renderModulesGrid(comp);
      });
    }
  }

  // Notificação toast elegante
  function showToast(title, message, type = 'success') {
    let container = document.getElementById('motordesk-toasts-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'motordesk-toasts-container';
      container.className = 'fixed bottom-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto p-4 rounded-xl shadow-2xl border text-sm transition-all transform translate-y-4 opacity-0 flex items-start gap-3 ${
      type === 'success' 
        ? 'bg-slate-900 border-emerald-500/40 text-emerald-100' 
        : 'bg-slate-900 border-blue-500/40 text-blue-100'
    }`;

    toast.innerHTML = `
      <span class="text-xl">${type === 'success' ? '✅' : 'ℹ️'}</span>
      <div class="flex-1">
        <h5 class="font-bold text-white mb-0.5">${title}</h5>
        <p class="text-xs text-slate-300 leading-snug">${message}</p>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Badge informativa de operadores na aba de Usuários
  function injectUserLimitBadge() {
    const userTabHeading = Array.from(document.querySelectorAll('h1, h2, h3, h4')).find(h => 
      h.textContent && (h.textContent.includes('Usuários') || h.textContent.includes('Colaboradores') || h.textContent.includes('Operadores'))
    );

    if (!userTabHeading) return;
    if (document.getElementById('motordesk-user-limit-badge')) return;

    const company = getCurrentCompany();
    if (!company) return;

    const userLimit = typeof company.userLimit === 'number' && company.userLimit > 0 ? company.userLimit : 5;
    const db = getLocalAppDb();
    const isQaUser = (u) => u && (
      u.role === 'qa' ||
      u.role === 'QA' ||
      u.userType === 'qa' ||
      (u.username && (u.username.toLowerCase() === 'validador' || u.username.toLowerCase() === 'qa'))
    );
    const allUsers = (db?.users || []).filter(u => (u.companyId || 'comp-1') === company.id);
    const regularUsers = allUsers.filter(u => !isQaUser(u));
    const qaUsers = allUsers.filter(isQaUser);
    const count = regularUsers.length;
    const remaining = Math.max(0, userLimit - count);
    const isLimitReached = count >= userLimit;
    const addPrice = typeof company.additionalUserPrice === 'number' ? company.additionalUserPrice : 29.90;

    const badge = document.createElement('div');
    badge.id = 'motordesk-user-limit-badge';
    badge.className = `mt-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
      isLimitReached 
        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' 
        : 'bg-slate-900/60 border-slate-800 text-slate-300'
    }`;

    badge.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base">${isLimitReached ? '⚠️' : '👥'}</span>
        <span>
          <strong>Licença de Operadores:</strong> ${count} de ${userLimit} vagas ocupadas (${remaining} disponíveis).
          ${qaUsers.length > 0 ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">🛡️ ${qaUsers.length} QA Isento(s)</span>` : ''}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-slate-400">Extra: R$ ${addPrice.toFixed(2)}/usuário</span>
        ${isLimitReached ? `
          <button type="button" class="font-bold text-amber-300 underline cursor-pointer hover:text-amber-200" onclick="const sBtn=Array.from(document.querySelectorAll('button, a')).find(el=>el.textContent&&el.textContent.includes('Assinatura')); if(sBtn) sBtn.click();">
            Aumentar Limite
          </button>
        ` : ''}
      </div>
    `;

    userTabHeading.parentElement.appendChild(badge);
  }

  // Observer contínuo para renderização dinâmica conforme o usuário navega pelas abas do MotorDesk
  const observer = new MutationObserver(() => {
    injectLicensingAndModulePanels();
    injectUserLimitBadge();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Execução inicial
  setTimeout(() => {
    injectLicensingAndModulePanels();
    injectUserLimitBadge();
  }, 1000);

})();
