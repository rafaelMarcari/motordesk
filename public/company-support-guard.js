/**
 * MotorDesk - Módulo de Suporte por Empresa, Liberação de ID, Número da Empresa e Central de Backup (Exclusivo QA)
 * 
 * Atende estritamente às diretrizes:
 * 1. O botão de Backup aparece SOMENTE para o usuário QA.
 * 2. Exibição clara e explícita do NÚMERO DA EMPRESA CADASTRADA (Nº 01, Nº 02, etc.) no topo, no formulário e no cabeçalho.
 * 3. Seleção se a empresa deseja o serviço de backup ou não (Sim / Não).
 * 4. Ao selecionar Sim, opções completas: Diário, A cada período, Semanal e Qual Horário (além de intervalo em horas e dias da semana).
 * 5. Central de Backup e Políticas por Empresa acessível para QA com aba de gestão de todas as empresas.
 */
(function () {
  'use strict';

  console.log('[MotorDesk] Inicializando Módulo de Identificação Cadastral, Políticas de Backup e Suporte...');

  // Helper para verificar se o usuário ativo é QA
  function isCurrentUserQA() {
    try {
      const raw = localStorage.getItem('motordesk_active_user');
      if (!raw) return false;
      const u = JSON.parse(raw);
      if (!u) return false;
      const role = (u.role || '').toLowerCase().trim();
      const uname = (u.username || '').toLowerCase().trim();
      const email = (u.email || '').toLowerCase().trim();
      return (
        role === 'qa' ||
        uname === 'qa' ||
        uname === 'marcari.rafael@gmail.com' ||
        email === 'marcari.rafael@gmail.com' ||
        Boolean(u.isQA) ||
        Boolean(u.permissions && u.permissions.accessQAPanel)
      );
    } catch (e) {
      return false;
    }
  }

  // Helper para obter empresa ativa e lista de empresas do localStorage
  function getActiveCompanyContext() {
    try {
      const activeId = localStorage.getItem('motordesk_active_company_id') || 'comp-1';
      const raw = localStorage.getItem('motordesk_db');
      if (!raw) return { id: activeId, name: 'Empresa Ativa', cnpj: '', companyNumber: 1, companyNumberFormatted: '01', allCompanies: [] };
      const db = JSON.parse(raw);
      const allCompanies = [
        ...(Array.isArray(db.registeredCompanies) ? db.registeredCompanies : []),
        ...(db.companyInfo ? [db.companyInfo] : []),
      ];

      // Deduplicar empresas por ID
      const uniqueCompanies = [];
      const seen = new Set();
      allCompanies.forEach((c, idx) => {
        if (c && c.id && !seen.has(c.id)) {
          seen.add(c.id);
          const cNum = c.companyNumber || (idx + 1);
          uniqueCompanies.push({
            ...c,
            companyNumber: cNum,
            companyNumberFormatted: String(cNum).padStart(2, '0')
          });
        }
      });

      const foundIdx = uniqueCompanies.findIndex(c => c.id === activeId);
      const found = foundIdx !== -1 ? uniqueCompanies[foundIdx] : (uniqueCompanies[0] || db.companyInfo || { id: activeId, name: 'Empresa Ativa', cnpj: '' });
      const cNum = found.companyNumber || (foundIdx !== -1 ? foundIdx + 1 : 1);
      const cNumFormatted = String(cNum).padStart(2, '0');

      return {
        id: found.id || activeId,
        name: found.name || 'Empresa Ativa',
        cnpj: found.cnpj || '',
        companyNumber: cNum,
        companyNumberFormatted: cNumFormatted,
        companyType: found.companyType || 'matriz',
        businessType: found.businessType || 'OFICINA',
        backupService: found.backupService || {
          enabled: false,
          frequency: 'daily',
          scheduleTime: '02:00',
          intervalHours: 4,
          daysOfWeek: ['seg', 'qua', 'sex'],
          retentionDays: 30,
        },
        allCompanies: uniqueCompanies,
      };
    } catch (e) {
      return { id: 'comp-1', name: 'MotorDesk Auto Center', cnpj: '', companyNumber: 1, companyNumberFormatted: '01', allCompanies: [] };
    }
  }

  // Toast notification universal
  function showNotification(title, message, type = 'success') {
    const existing = document.getElementById('motordesk-global-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'motordesk-global-toast';
    toast.className = 'fixed bottom-5 right-5 z-[99999] max-w-md p-4 rounded-xl shadow-2xl border text-xs flex items-start gap-3 transition-all duration-300 animate-slide-up ' +
      (type === 'success' ? 'bg-slate-900 text-white border-emerald-500' : 'bg-rose-950 text-white border-rose-500');

    toast.innerHTML = `
      <div class="p-1.5 rounded-lg ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} shrink-0 text-base font-bold">
        ${type === 'success' ? '✓' : '⚠️'}
      </div>
      <div class="flex-1 space-y-1">
        <h4 class="font-bold text-white uppercase tracking-wide text-[11px]">${title}</h4>
        <p class="text-slate-300 leading-relaxed">${message}</p>
      </div>
      <button type="button" class="text-slate-400 hover:text-white text-base leading-none p-1 cursor-pointer" onclick="this.parentElement.remove()">✕</button>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);
  }

  // 1. INJEÇÃO DO NÚMERO DA EMPRESA CADASTRADA E ID NO FORMULÁRIO DE CONFIGURAÇÕES
  function injectCompanyIdAndNumberFieldInSettingsForm() {
    const form = document.getElementById('form-company-settings');
    if (!form) return;

    const comp = getActiveCompanyContext();
    const compNum = comp.companyNumberFormatted || '01';

    // 1.1 Banner Oficial do Número da Empresa Cadastrada
    let banner = document.getElementById('company-number-official-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'company-number-official-banner';
      banner.className = 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border-2 border-indigo-500/80 shadow-lg mb-5 animate-fade-in';
      form.insertBefore(banner, form.firstChild);
    }

    banner.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 bg-indigo-600/30 border border-indigo-400/40 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner">
            🏢
          </div>
          <div>
            <span class="text-[11px] font-mono uppercase tracking-widest text-indigo-300 font-bold block">
              Registro Cadastral Oficial MotorDesk ERP
            </span>
            <div class="flex flex-wrap items-center gap-2.5 mt-0.5">
              <h3 class="text-base font-extrabold text-white flex items-center gap-2">
                Número da Empresa Cadastrada:
                <span id="display-company-number" class="px-3 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-mono font-black text-sm shadow-xs tracking-wider">
                  Nº ${compNum}
                </span>
              </h3>
              <span class="px-2.5 py-0.5 rounded-md bg-indigo-900/90 text-indigo-200 border border-indigo-700/60 font-mono text-xs font-bold">
                ID Técnico: ${comp.id}
              </span>
            </div>
            <p class="text-xs text-slate-300 mt-1">
              Utilize o <strong>Número da Empresa (Nº ${compNum})</strong> ou o <strong>ID Técnico (${comp.id})</strong> para identificar esta unidade e solicitar suporte técnico isolado.
            </p>
          </div>
        </div>
        <div class="flex sm:flex-col items-center gap-2 shrink-0">
          <button id="btn-copy-company-full-number" type="button" class="w-full px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border border-indigo-400">
            📋 Copiar Nº da Empresa
          </button>
          <button id="btn-copy-company-full-id" type="button" class="w-full px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border border-slate-600">
            🔑 Copiar ID da Empresa
          </button>
        </div>
      </div>
    `;

    // Event listeners dos botões de cópia
    document.getElementById('btn-copy-company-full-number')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(`Empresa Nº ${compNum} (${comp.name})`).then(() => {
        showNotification('Número da Empresa Copiado', `"Empresa Nº ${compNum} (${comp.name})"`);
      });
    });

    document.getElementById('btn-copy-company-full-id')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(comp.id).then(() => {
        showNotification('ID da Empresa Copiado', `ID Técnico: ${comp.id}`);
      });
    });

    // 1.2 Campo de ID e Número dentro da grade do formulário
    let wrapper = document.getElementById('comp-id-field-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'comp-id-field-wrapper';
      wrapper.className = 'space-y-3 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-indigo-50/40 p-4.5 rounded-2xl border-2 border-indigo-200 sm:col-span-2 shadow-xs mb-3';
      
      const nameInput = document.getElementById('comp-name-input');
      const targetParent = nameInput ? nameInput.closest('.space-y-1') : null;
      if (targetParent && targetParent.parentElement) {
        targetParent.parentElement.insertBefore(wrapper, targetParent);
      } else {
        const grid = form.querySelector('.grid') || form;
        grid.insertBefore(wrapper, grid.firstChild);
      }
    }

    wrapper.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-2.5">
        <div class="space-y-0.5">
          <label class="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5 font-display">
            <span class="text-sm">🔑</span> Identificação Cadastral da Empresa *
          </label>
          <p class="text-[11px] text-slate-500">Número da empresa cadastrada e ID técnico único no MotorDesk ERP.</p>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] bg-emerald-600 text-white font-mono font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <span>✓</span> Empresa Nº ${compNum} Ativa
          </span>
          <span class="text-[10px] bg-indigo-600 text-white font-mono font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <span>🔒</span> Multi-Tenant Isolado
          </span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <!-- Número da Empresa -->
        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
            <span>Número da Empresa Cadastrada *</span>
            <span class="text-[10px] text-emerald-600 font-bold font-mono">Ordem Cadastral</span>
          </label>
          <div class="flex items-center gap-2">
            <input id="comp-number-input" type="text" readonly value="Empresa Nº ${compNum}"
              class="w-full text-xs py-2.5 px-3 border-2 border-emerald-300 rounded-xl bg-emerald-50/70 font-mono font-black text-emerald-950 shadow-inner select-all" />
            <button id="btn-copy-comp-num-field" type="button"
              class="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-xs">
              Copiar
            </button>
          </div>
        </div>

        <!-- ID da Empresa -->
        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
            <span>ID Técnico da Empresa *</span>
            <span class="text-[10px] text-indigo-600 font-bold font-mono">Chave Primária</span>
          </label>
          <div class="flex items-center gap-2">
            <input id="comp-id-input" type="text" readonly value="${comp.id}"
              class="w-full text-xs py-2.5 px-3 border-2 border-indigo-300 rounded-xl bg-white font-mono font-bold text-indigo-950 shadow-inner select-all" />
            <button id="btn-copy-comp-id" type="button"
              class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-xs">
              Copiar
            </button>
          </div>
        </div>
      </div>

      <div class="p-3 bg-white/90 rounded-xl border border-indigo-100 text-[11px] text-indigo-950 space-y-1 mt-1">
        <div class="flex items-start gap-2">
          <span class="text-amber-500 text-sm">💡</span>
          <div class="leading-relaxed">
            <strong>Instrução para Abertura de Chamado Técnico:</strong> Informe sempre o número e o ID desta empresa:
            <div class="mt-1">
              <code id="comp-id-code-display" class="bg-indigo-100 text-indigo-900 px-2 py-1 rounded-md font-mono font-bold text-xs block select-all cursor-pointer" title="Clique para copiar">
                "Na empresa Nº ${compNum} (ID: ${comp.id}) precisa corrigir"
              </code>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-copy-comp-num-field')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(`Nº ${compNum}`).then(() => {
        showNotification('Copiado', `Número da Empresa: Nº ${compNum}`);
      });
    });

    document.getElementById('btn-copy-comp-id')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(comp.id).then(() => {
        showNotification('Copiado', `ID da Empresa: ${comp.id}`);
      });
    });

    document.getElementById('comp-id-code-display')?.addEventListener('click', () => {
      const phrase = `Na empresa Nº ${compNum} (ID: ${comp.id}) precisa corrigir`;
      navigator.clipboard.writeText(phrase).then(() => {
        showNotification('Frase Copiada', `"${phrase}"`);
      });
    });

    // 1.3 Injeção da Seção: CONTRATAÇÃO DO SERVIÇO DE BACKUP EM NUVEM
    injectBackupServiceContractSection(form, comp);
  }

  // 2. INJEÇÃO DA SEÇÃO: CONTRATAÇÃO DO SERVIÇO DE BACKUP EM NUVEM NA EMPRESA
  function injectBackupServiceContractSection(form, comp) {
    let section = document.getElementById('company-backup-service-card');
    if (!section) {
      section = document.createElement('div');
      section.id = 'company-backup-service-card';
      section.className = 'p-5 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 rounded-2xl border-2 border-indigo-200 sm:col-span-2 shadow-xs mb-4 space-y-4';
      
      const actionsBar = form.querySelector('.flex.justify-end') || form.lastElementChild;
      if (actionsBar) {
        form.insertBefore(section, actionsBar);
      } else {
        form.appendChild(section);
      }
    }

    const currentService = comp.backupService || {
      enabled: false,
      frequency: 'daily',
      scheduleTime: '02:00',
      intervalHours: 4,
      daysOfWeek: ['seg', 'qua', 'sex'],
      retentionDays: 30,
    };

    const isEnabled = Boolean(currentService.enabled);
    const freq = currentService.frequency || 'daily';
    const scheduleTime = currentService.scheduleTime || '02:00';
    const intervalHours = currentService.intervalHours || 4;
    const daysOfWeek = Array.isArray(currentService.daysOfWeek) ? currentService.daysOfWeek : ['seg', 'qua', 'sex'];

    section.innerHTML = `
      <!-- Cabeçalho da Seção -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-600 text-white rounded-xl shadow-xs text-base">
            🛡️
          </div>
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-950 font-display flex items-center gap-2">
              Contratação do Serviço de Backup em Nuvem
              <span id="backup-service-status-chip" class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${isEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'}">
                ${isEnabled ? '✓ ATIVO / CONTRATADO' : '✕ NÃO CONTRATADO'}
              </span>
            </h4>
            <p class="text-[11px] text-slate-500">
              Configure se a Empresa Nº ${comp.companyNumberFormatted} (${comp.name}) possui a rotina de backup em nuvem contratada.
            </p>
          </div>
        </div>
      </div>

      <!-- Pergunta Principal: Deseja o serviço de backup? -->
      <div class="space-y-2">
        <label class="text-xs font-bold text-slate-800 uppercase tracking-wide block">
          A empresa deseja o serviço de backup em nuvem? *
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Opção NÃO -->
          <label id="label-backup-no" class="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition select-none ${!isEnabled ? 'bg-white border-rose-400 ring-2 ring-rose-200 shadow-xs' : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'}">
            <input type="radio" name="comp_backup_service_desired" value="false" ${!isEnabled ? 'checked' : ''} class="w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer" />
            <div>
              <div class="text-xs font-bold text-slate-900">❌ Não Deseja o Serviço de Backup</div>
              <div class="text-[11px] text-slate-500">Esta empresa não terá rotinas automatizadas contratadas.</div>
            </div>
          </label>

          <!-- Opção SIM -->
          <label id="label-backup-yes" class="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition select-none ${isEnabled ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-200 shadow-xs' : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'}">
            <input type="radio" name="comp_backup_service_desired" value="true" ${isEnabled ? 'checked' : ''} class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
            <div>
              <div class="text-xs font-bold text-emerald-950">✅ Sim, Deseja / Ativar Serviço de Backup</div>
              <div class="text-[11px] text-emerald-800">Rotinas automatizadas em nuvem com retenção de segurança.</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Opções Detalhadas (Aparecem quando SIM está selecionado) -->
      <div id="backup-service-details-panel" class="space-y-4 pt-3 border-t border-indigo-100/80 ${isEnabled ? 'block' : 'hidden'}">
        <!-- Frequência: Diário, A cada período, Semanal -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            Frequência / Periodicidade da Rotina *
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- Diário -->
            <label class="flex flex-col p-3 rounded-xl border-2 cursor-pointer transition select-none bg-white ${freq === 'daily' ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}">
              <div class="flex items-center gap-2">
                <input type="radio" name="comp_backup_frequency" value="daily" ${freq === 'daily' ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                <span class="text-xs font-bold text-slate-900">📅 Diário</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Executa 1 vez ao dia no horário fixado</span>
            </label>

            <!-- A cada período -->
            <label class="flex flex-col p-3 rounded-xl border-2 cursor-pointer transition select-none bg-white ${freq === 'periodic' ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}">
              <div class="flex items-center gap-2">
                <input type="radio" name="comp_backup_frequency" value="periodic" ${freq === 'periodic' ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                <span class="text-xs font-bold text-slate-900">⏱️ A Cada Período</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">A cada X horas ao longo do dia</span>
            </label>

            <!-- Semanal -->
            <label class="flex flex-col p-3 rounded-xl border-2 cursor-pointer transition select-none bg-white ${freq === 'weekly' ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}">
              <div class="flex items-center gap-2">
                <input type="radio" name="comp_backup_frequency" value="weekly" ${freq === 'weekly' ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                <span class="text-xs font-bold text-slate-900">🗓️ Semanal</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Em dias selecionados da semana</span>
            </label>
          </div>
        </div>

        <!-- Qual Horário e Intervalo -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Qual Horário -->
          <div class="space-y-1.5">
            <label for="comp-backup-time-input" class="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <span>Qual Horário de Execução *</span>
              <span class="text-[10px] text-indigo-600 font-mono">Horário Local</span>
            </label>
            <div class="relative">
              <input id="comp-backup-time-input" type="time" value="${scheduleTime}"
                class="w-full text-xs p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-mono font-bold text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <p class="text-[10px] text-slate-500">Horário recomendado fora do expediente (ex: 02:00 da madrugada).</p>
          </div>

          <!-- Se "A cada período": Intervalo em horas -->
          <div id="comp-backup-interval-container" class="space-y-1.5 ${freq === 'periodic' ? 'block' : 'hidden'}">
            <label for="comp-backup-interval-select" class="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Intervalo entre Backups *
            </label>
            <select id="comp-backup-interval-select" class="w-full text-xs p-2.5 bg-white border-2 border-indigo-200 rounded-xl font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-indigo-500">
              <option value="2" ${intervalHours === 2 ? 'selected' : ''}>A cada 2 horas</option>
              <option value="4" ${intervalHours === 4 ? 'selected' : ''}>A cada 4 horas (Recomendado)</option>
              <option value="6" ${intervalHours === 6 ? 'selected' : ''}>A cada 6 horas</option>
              <option value="8" ${intervalHours === 8 ? 'selected' : ''}>A cada 8 horas</option>
              <option value="12" ${intervalHours === 12 ? 'selected' : ''}>A cada 12 horas</option>
            </select>
            <p class="text-[10px] text-slate-500">Gera um ponto de restauração a cada ciclo de horas.</p>
          </div>

          <!-- Se "Semanal": Dias da Semana -->
          <div id="comp-backup-weekdays-container" class="space-y-1.5 sm:col-span-2 ${freq === 'weekly' ? 'block' : 'hidden'}">
            <label class="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Dias da Semana de Execução *
            </label>
            <div class="flex flex-wrap gap-2" id="comp-backup-weekdays-group">
              ${['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(d => {
                const isChecked = daysOfWeek.includes(d);
                const labels = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };
                return `
                  <label class="px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition select-none flex items-center gap-1.5 ${isChecked ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}">
                    <input type="checkbox" name="comp_backup_weekday" value="${d}" ${isChecked ? 'checked' : ''} class="hidden" />
                    <span>${labels[d]}</span>
                  </label>
                `;
              }).join('')}
            </div>
            <p class="text-[10px] text-slate-500">Selecione os dias em que a rotina semanal será acionada.</p>
          </div>
        </div>

        <!-- Box de Resumo da Política -->
        <div class="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">📋</span>
            <div>
              <strong class="block text-indigo-900">Resumo da Rotina:</strong>
              <span id="backup-policy-summary-text" class="text-slate-700 font-medium">
                ${formatPolicySummary(isEnabled, freq, scheduleTime, intervalHours, daysOfWeek)}
              </span>
            </div>
          </div>
          <button id="btn-save-backup-policy-direct" type="button" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer shrink-0">
            Salvar Política de Backup
          </button>
        </div>
      </div>
    `;

    // Interações de troca SIM / NÃO
    const radioDesired = section.querySelectorAll('input[name="comp_backup_service_desired"]');
    const detailsPanel = document.getElementById('backup-service-details-panel');
    const statusChip = document.getElementById('backup-service-status-chip');
    const labelYes = document.getElementById('label-backup-yes');
    const labelNo = document.getElementById('label-backup-no');

    radioDesired.forEach(r => {
      r.addEventListener('change', () => {
        const wants = r.value === 'true';
        if (wants) {
          detailsPanel.classList.remove('hidden');
          statusChip.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
          statusChip.textContent = '✓ ATIVO / CONTRATADO';
          labelYes.className = 'flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition select-none bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-200 shadow-xs';
          labelNo.className = 'flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition select-none bg-slate-50/80 border-slate-200 hover:border-slate-300';
        } else {
          detailsPanel.classList.add('hidden');
          statusChip.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700';
          statusChip.textContent = '✕ NÃO CONTRATADO';
          labelNo.className = 'flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition select-none bg-white border-rose-400 ring-2 ring-rose-200 shadow-xs';
          labelYes.className = 'flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition select-none bg-slate-50/80 border-slate-200 hover:border-slate-300';
        }
        updateSummaryText();
      });
    });

    // Interações de Frequência
    const radioFreq = section.querySelectorAll('input[name="comp_backup_frequency"]');
    const intervalContainer = document.getElementById('comp-backup-interval-container');
    const weekdaysContainer = document.getElementById('comp-backup-weekdays-container');

    radioFreq.forEach(r => {
      r.addEventListener('change', () => {
        const selectedFreq = r.value;
        if (selectedFreq === 'periodic') {
          intervalContainer.classList.remove('hidden');
          weekdaysContainer.classList.add('hidden');
        } else if (selectedFreq === 'weekly') {
          intervalContainer.classList.add('hidden');
          weekdaysContainer.classList.remove('hidden');
        } else {
          intervalContainer.classList.add('hidden');
          weekdaysContainer.classList.add('hidden');
        }
        updateSummaryText();
      });
    });

    // Checkboxes dos dias da semana
    const weekdayInputs = section.querySelectorAll('input[name="comp_backup_weekday"]');
    weekdayInputs.forEach(wInput => {
      wInput.addEventListener('change', () => {
        const parent = wInput.closest('label');
        if (wInput.checked) {
          parent.className = 'px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition select-none flex items-center gap-1.5 bg-indigo-600 text-white border-indigo-700 shadow-xs';
        } else {
          parent.className = 'px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition select-none flex items-center gap-1.5 bg-white text-slate-700 border-slate-300 hover:bg-slate-50';
        }
        updateSummaryText();
      });
    });

    document.getElementById('comp-backup-time-input')?.addEventListener('change', updateSummaryText);
    document.getElementById('comp-backup-interval-select')?.addEventListener('change', updateSummaryText);

    function getFormPolicyState() {
      const isWants = section.querySelector('input[name="comp_backup_service_desired"]:checked')?.value === 'true';
      const f = section.querySelector('input[name="comp_backup_frequency"]:checked')?.value || 'daily';
      const time = document.getElementById('comp-backup-time-input')?.value || '02:00';
      const hours = parseInt(document.getElementById('comp-backup-interval-select')?.value || '4', 10);
      const days = Array.from(section.querySelectorAll('input[name="comp_backup_weekday"]:checked')).map(cb => cb.value);

      return {
        enabled: isWants,
        frequency: f,
        scheduleTime: time,
        intervalHours: hours,
        daysOfWeek: days.length > 0 ? days : ['seg', 'qua', 'sex'],
        retentionDays: 30,
        updatedAt: new Date().toISOString(),
      };
    }

    function updateSummaryText() {
      const st = getFormPolicyState();
      const textElem = document.getElementById('backup-policy-summary-text');
      if (textElem) {
        textElem.textContent = formatPolicySummary(st.enabled, st.frequency, st.scheduleTime, st.intervalHours, st.daysOfWeek);
      }
    }

    // Salvar política imediatamente
    document.getElementById('btn-save-backup-policy-direct')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const policyState = getFormPolicyState();
      await persistCompanyBackupPolicy(comp.id, policyState);
    });

    // Interceptar submissão do formulário pai
    if (!form.__backupHooked) {
      form.__backupHooked = true;
      form.addEventListener('submit', () => {
        const policyState = getFormPolicyState();
        persistCompanyBackupPolicy(comp.id, policyState, true);
      });
    }
  }

  function formatPolicySummary(enabled, frequency, time, intervalHours, daysOfWeek) {
    if (!enabled) {
      return 'Serviço de backup em nuvem NÃO contratado para esta empresa.';
    }
    if (frequency === 'daily') {
      return `Backup Diário agendado para às ${time} (1 execução por dia).`;
    }
    if (frequency === 'periodic') {
      return `Backup a cada ${intervalHours} horas (início/referência às ${time}).`;
    }
    if (frequency === 'weekly') {
      const labels = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
      const dayNames = (daysOfWeek || []).map(d => labels[d] || d).join(', ');
      return `Backup Semanal nos dias [${dayNames}] às ${time}.`;
    }
    return `Backup ativo às ${time}.`;
  }

  // Persistência unificada da política de backup (LocalStorage + Backend)
  async function persistCompanyBackupPolicy(companyId, policy, silent = false) {
    try {
      // 1. Atualizar no LocalStorage
      const rawDb = localStorage.getItem('motordesk_db');
      if (rawDb) {
        const db = JSON.parse(rawDb);
        if (Array.isArray(db.registeredCompanies)) {
          db.registeredCompanies = db.registeredCompanies.map(c => {
            if (c && c.id === companyId) {
              return { ...c, backupService: policy };
            }
            return c;
          });
        }
        if (db.companyInfo && db.companyInfo.id === companyId) {
          db.companyInfo = { ...db.companyInfo, backupService: policy };
        }
        localStorage.setItem('motordesk_db', JSON.stringify(db));
        localStorage.setItem('motordesk_db_v1', JSON.stringify(db));
        localStorage.setItem('motordesk_full_database', JSON.stringify(db));
        if (Array.isArray(db.registeredCompanies)) {
          localStorage.setItem('motordesk_all_companies', JSON.stringify(db.registeredCompanies));
          window.__allCompanies = db.registeredCompanies;
        }
        window.__CURRENT_DB = db;
      }

      // 2. Chamar endpoint no backend para gravação durável
      const res = await fetch(`/api/backup/policy/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-1' },
        body: JSON.stringify(policy),
      }).then(r => r.json()).catch(() => null);

      if (!silent) {
        showNotification(
          'Política de Backup Salva',
          policy.enabled
            ? `Serviço ativado: ${formatPolicySummary(policy.enabled, policy.frequency, policy.scheduleTime, policy.intervalHours, policy.daysOfWeek)}`
            : 'Serviço de backup desativado para esta empresa.',
          'success'
        );
      }
    } catch (e) {
      console.error('[MotorDesk] Erro ao salvar política de backup:', e);
      if (!silent) {
        showNotification('Erro ao Salvar', e.message || 'Falha na gravação da política.', 'error');
      }
    }
  }

  // 3. BOTÃO DE BACKUP: LIBERADO PARA TODAS AS EMPRESAS E USUÁRIOS
  function injectBackupAndSupportNavbarButton() {
    const rawUser = localStorage.getItem('motordesk_active_user');
    if (!rawUser) return;

    // 3.1 Injetar no Header / Navbar de Topo
    const header = document.querySelector('header#top-workspace-bar') || document.querySelector('header');
    if (header && !document.getElementById('btn-navbar-backup-support')) {
      const rightContainer = header.querySelector('.flex.items-center.gap-3') ||
                             header.querySelector('.flex.items-center.gap-2') ||
                             header.lastElementChild;

      if (rightContainer) {
        const btn = document.createElement('button');
        btn.id = 'btn-navbar-backup-support';
        btn.type = 'button';
        btn.title = 'Central de Backup & Gestão de Políticas (Liberado para Todas as Empresas)';
        btn.className = 'flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-lg text-xs font-black border border-amber-600 transition shadow-xs cursor-pointer select-none';
        btn.innerHTML = `
          <span class="text-sm leading-none">💾</span>
          <span class="hidden md:inline font-bold">Central de Backup</span>
          <span class="bg-slate-950 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-mono font-black">BACKUP</span>
        `;

        btn.addEventListener('click', () => {
          openSupportAndBackupModal('backup');
        });

        rightContainer.insertBefore(btn, rightContainer.firstChild);
      }
    }

    // 3.2 Injetar no Menu Lateral (Sidebar)
    if (!document.getElementById('menu-btn-qa-backup')) {
      const targetMenuBtn = document.getElementById('menu-btn-qa-panel') ||
                            document.getElementById('menu-btn-settings') ||
                            document.getElementById('menu-btn-reports') ||
                            document.getElementById('menu-btn-history');
      if (targetMenuBtn && targetMenuBtn.parentElement) {
        const sideBtn = document.createElement('button');
        sideBtn.id = 'menu-btn-qa-backup';
        sideBtn.type = 'button';
        sideBtn.title = 'Central de Backup e Políticas (Todas as Empresas)';
        sideBtn.className = 'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition text-amber-300 hover:bg-slate-800 hover:text-amber-200 border border-amber-500/30 my-1 cursor-pointer';
        sideBtn.innerHTML = `
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-amber-400 shrink-0">💾</span>
            <span class="truncate font-bold text-amber-200">Central de Backup</span>
          </div>
          <span class="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border border-amber-500/40">TODAS AS EMPRESAS</span>
        `;

        sideBtn.addEventListener('click', () => {
          openSupportAndBackupModal('backup');
        });

        if (targetMenuBtn.nextSibling) {
          targetMenuBtn.parentElement.insertBefore(sideBtn, targetMenuBtn.nextSibling);
        } else {
          targetMenuBtn.parentElement.appendChild(sideBtn);
        }
      }
    }

    // 3.3 Atualizar títulos no Seletor de Empresa para exibir o Número da Empresa
    updateCompanySelectorDisplay();
  }

  // Helper para enriquecer o Seletor de Empresas com o Número da Empresa
  function updateCompanySelectorDisplay() {
    const comp = getActiveCompanyContext();
    const select = document.getElementById('top-company-switcher-select');
    if (select && select.options) {
      Array.from(select.options).forEach((opt, idx) => {
        const found = comp.allCompanies.find(c => c.id === opt.value);
        const cNum = found ? found.companyNumberFormatted : String(idx + 1).padStart(2, '0');
        if (!opt.textContent.includes('Nº ')) {
          opt.textContent = `[Nº ${cNum}] ${opt.textContent}`;
        }
      });
    }

    const badge = document.getElementById('top-company-badge');
    if (badge && !badge.innerHTML.includes('Nº ')) {
      const numSpan = document.createElement('span');
      numSpan.className = 'bg-indigo-600 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-black';
      numSpan.textContent = `Nº ${comp.companyNumberFormatted}`;
      badge.insertBefore(numSpan, badge.firstChild.nextSibling);
    }
  }

  // 4. MODAL COMPLETO: CENTRAL DE BACKUP DIÁRIO, POLÍTICAS E SUPORTE
  function openSupportAndBackupModal(initialTab = 'backup') {
    const existing = document.getElementById('motordesk-backup-support-modal');
    if (existing) existing.remove();

    const activeComp = getActiveCompanyContext();

    const modal = document.createElement('div');
    modal.id = 'motordesk-backup-support-modal';
    modal.className = 'fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[99998] flex items-center justify-center p-4 animate-fade-in overflow-y-auto';

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-scale-up my-8 max-h-[92vh] flex flex-col">
        
        <!-- Header do Modal -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div class="flex items-center gap-3.5">
            <div class="p-2.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xl shadow-xs">
              💾
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900 dark:text-white font-display">
                  Central de Backup & Gestão de Políticas por Empresa
                </h3>
                <span class="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-black border border-emerald-400">
                  LIBERADO EM TODAS AS EMPRESAS
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Empresa Ativa: <strong class="text-indigo-600 font-mono">Empresa Nº ${activeComp.companyNumberFormatted} - ${activeComp.name} (ID: ${activeComp.id})</strong>
              </p>
            </div>
          </div>
          <button type="button" id="btn-close-backup-support-modal" class="text-slate-400 hover:text-slate-600 p-2 rounded-lg text-lg cursor-pointer">✕</button>
        </div>

        <!-- Abas com as Políticas por Empresa -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 shrink-0 overflow-x-auto">
          <button id="tab-btn-backup" type="button" class="px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 ${initialTab === 'backup' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            <span>💾</span> Backup Geral & Snapshot
          </button>
          <button id="tab-btn-policies" type="button" class="px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 ${initialTab === 'policies' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            <span>⚙️</span> Políticas de Backup por Empresa
          </button>
          <button id="tab-btn-restore" type="button" class="px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 ${initialTab === 'restore' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            <span>🔄</span> Restauração por Empresa
          </button>
          <button id="tab-btn-support" type="button" class="px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 ${initialTab === 'support' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            <span>🏢</span> Diagnóstico & Suporte por ID
          </button>
        </div>

        <!-- Conteúdo Rolável -->
        <div class="flex-1 overflow-y-auto space-y-5 pr-1 min-h-[360px]" id="backup-support-modal-body">
          <div class="text-center py-10 text-slate-400">
            Carregando informações da base de dados...
          </div>
        </div>

        <!-- Rodapé do Modal -->
        <div class="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span class="flex items-center gap-1.5 font-mono text-[11px]">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            MotorDesk Multi-Tenant Isolation & Cloud Backup Engine
          </span>
          <button type="button" id="btn-footer-close-modal" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-close-backup-support-modal')?.addEventListener('click', () => modal.remove());
    document.getElementById('btn-footer-close-modal')?.addEventListener('click', () => modal.remove());

    const tabBackupBtn = document.getElementById('tab-btn-backup');
    const tabPoliciesBtn = document.getElementById('tab-btn-policies');
    const tabRestoreBtn = document.getElementById('tab-btn-restore');
    const tabSupportBtn = document.getElementById('tab-btn-support');

    const updateTabStyles = (activeTab) => {
      [tabBackupBtn, tabPoliciesBtn, tabRestoreBtn, tabSupportBtn].forEach(b => {
        if (b) b.className = 'px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 bg-slate-100 text-slate-600 hover:bg-slate-200';
      });
      if (activeTab === 'backup' && tabBackupBtn) {
        tabBackupBtn.className = 'px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 bg-indigo-600 text-white';
      } else if (activeTab === 'policies' && tabPoliciesBtn) {
        tabPoliciesBtn.className = 'px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 bg-indigo-600 text-white';
      } else if (activeTab === 'restore' && tabRestoreBtn) {
        tabRestoreBtn.className = 'px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 bg-indigo-600 text-white';
      } else if (activeTab === 'support' && tabSupportBtn) {
        tabSupportBtn.className = 'px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 bg-indigo-600 text-white';
      }
    };

    tabBackupBtn?.addEventListener('click', () => {
      updateTabStyles('backup');
      renderBackupView();
    });

    tabPoliciesBtn?.addEventListener('click', () => {
      updateTabStyles('policies');
      renderPoliciesView();
    });

    tabRestoreBtn?.addEventListener('click', () => {
      updateTabStyles('restore');
      renderRestoreCompanyView();
    });

    tabSupportBtn?.addEventListener('click', () => {
      updateTabStyles('support');
      renderSupportView();
    });

    if (initialTab === 'backup') {
      renderBackupView();
    } else if (initialTab === 'policies') {
      renderPoliciesView();
    } else if (initialTab === 'restore') {
      renderRestoreCompanyView();
    } else {
      renderSupportView();
    }
  }

  // 4.1 RENDERIZADOR DA ABA DE BACKUP GERAL
  async function renderBackupView() {
    const container = document.getElementById('backup-support-modal-body');
    if (!container) return;

    const activeComp = getActiveCompanyContext();

    container.innerHTML = `
      <div class="flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    `;

    try {
      const [statusRes, listRes] = await Promise.all([
        fetch('/api/backup/status', { headers: { 'x-user-id': 'usr-admin-1' } }).then(r => r.json()),
        fetch('/api/backup/list', { headers: { 'x-user-id': 'usr-admin-1' } }).then(r => r.json()),
      ]);

      const status = statusRes.status || {};
      const backups = listRes.backups || [];

      container.innerHTML = `
        <!-- Card de Status -->
        <div class="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4.5 rounded-2xl border-2 border-emerald-200 space-y-3 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                <span>💾</span>
              </div>
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-950 font-display">
                  Rotina de Backup em Nuvem Automático
                </h4>
                <p class="text-[11px] text-emerald-800">
                  Proteção diária contínua das informações de todas as empresas cadastradas.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-xs">
                <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                AUTOMÁTICO ATIVO
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">Frequência Padrão</span>
              <strong class="text-slate-800">${status.frequency || 'Diário'}</strong>
            </div>
            <div class="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">Último Backup</span>
              <strong class="text-emerald-700 font-mono">${status.lastBackupDate || 'Hoje'}</strong>
            </div>
            <div class="bg-white/90 p-3 rounded-xl border border-emerald-100">
              <span class="text-[10px] text-slate-500 uppercase font-bold block">Total Armazenados</span>
              <strong class="text-indigo-600 font-mono">${status.totalStoredBackups || backups.length} arquivos</strong>
            </div>
          </div>
        </div>

        <!-- Ações Imediatas -->
        <div class="flex flex-col sm:flex-row gap-3 pt-1">
          <button id="btn-trigger-backup-now" type="button"
            class="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
            <span>⚡</span>
            <span>Gerar Backup Imediato de Todas as Empresas</span>
          </button>
          
          <button id="btn-download-active-company" type="button"
            class="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
            <span>📦</span>
            <span>Baixar Backup Apenas da Empresa Nº ${activeComp.companyNumberFormatted}</span>
          </button>
        </div>

        <!-- Lista de Backups -->
        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800">
              Histórico de Backups Disponíveis
            </h4>
            <span class="text-[10px] font-mono text-slate-500">${backups.length} pontos de restauração</span>
          </div>

          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${backups.length === 0 ? `
              <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                Nenhum arquivo de backup gerado ainda. Clique em "Gerar Backup Imediato" acima.
              </div>
            ` : backups.map(b => `
              <div class="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-indigo-300 transition">
                <div class="space-y-0.5">
                  <div class="font-mono font-bold text-slate-800 flex items-center gap-2">
                    <span>📄</span> ${b.filename}
                    <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-sans">${b.fileSizeFormatted}</span>
                  </div>
                  <div class="text-[11px] text-slate-500">
                    Gerado em: ${new Date(b.createdAt).toLocaleString('pt-BR')} • ${b.companiesCount} empresas incluídas • ${b.totalRecords} registros
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <a href="/api/backup/download/${b.filename}" target="_blank" download
                    class="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 font-bold rounded-lg border border-slate-200 transition text-[11px] flex items-center gap-1">
                    <span>⬇️</span> Baixar
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Event listener: Gerar Backup Imediato
      document.getElementById('btn-trigger-backup-now')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-trigger-backup-now');
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Gerando snapshot...';
        try {
          const res = await fetch('/api/backup/trigger-daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-1' }
          }).then(r => r.json());
          if (res.success) {
            showNotification('Backup Concluído', `Arquivo ${res.metadata.filename} (${res.metadata.fileSizeFormatted}) gerado com sucesso!`);
            renderBackupView();
          } else {
            showNotification('Erro no Backup', res.error || 'Falha ao criar backup.', 'error');
          }
        } catch (e) {
          showNotification('Erro no Backup', e.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });

      // Event listener: Baixar Backup Isolado da Empresa Ativa
      document.getElementById('btn-download-active-company')?.addEventListener('click', () => {
        window.open(`/api/backup/download-company/${activeComp.id}`, '_blank');
      });

    } catch (err) {
      container.innerHTML = `
        <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
          <h4 class="font-bold">Erro ao carregar dados do backup</h4>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  // 4.2 RENDERIZADOR DA ABA DE POLÍTICAS DE BACKUP POR EMPRESA
  async function renderPoliciesView() {
    const container = document.getElementById('backup-support-modal-body');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    `;

    try {
      const res = await fetch('/api/backup/policies', {
        headers: { 'x-user-id': 'usr-admin-1' }
      }).then(r => r.json()).catch(() => ({ success: false, policies: [] }));

      const policies = res.policies || [];
      const activeCtx = getActiveCompanyContext();

      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                <span>🏢</span> Políticas de Backup Contratadas por Empresa
              </h4>
              <p class="text-xs text-slate-500">
                Gerencie individualmente quais empresas possuem o serviço de backup ativo, horário e periodicidade.
              </p>
            </div>
            <span class="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              ${policies.length} Empresas Cadastradas
            </span>
          </div>

          <div class="space-y-3">
            ${policies.map(p => {
              const bService = p.backupService || {};
              const isEnabled = Boolean(bService.enabled);
              const freq = bService.frequency || 'daily';
              const time = bService.scheduleTime || '02:00';
              const interval = bService.intervalHours || 4;
              const days = bService.daysOfWeek || ['seg', 'qua', 'sex'];
              const summary = formatPolicySummary(isEnabled, freq, time, interval, days);
              const cNumFormatted = String(p.companyNumber).padStart(2, '0');
              const isCurrent = p.companyId === activeCtx.id;

              return `
                <div class="p-4 rounded-xl border-2 transition ${isCurrent ? 'bg-indigo-50/40 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'} space-y-3">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div class="flex items-center gap-3">
                      <span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-black text-xs">
                        Nº ${cNumFormatted}
                      </span>
                      <div>
                        <div class="font-bold text-slate-900 text-xs flex items-center gap-2">
                          ${p.name}
                          ${isCurrent ? '<span class="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">EMPRESA ATIVA</span>' : ''}
                        </div>
                        <div class="text-[11px] text-slate-500 font-mono">
                          ID: ${p.companyId} • CNPJ: ${p.cnpj || 'Não informado'} • Tipo: ${p.companyType.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                        ${isEnabled ? '✓ CONTRATADO (SIM)' : '✕ NÃO CONTRATADO'}
                      </span>
                    </div>
                  </div>

                  <!-- Detalhes da Política e Ações Rápidas -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2 text-slate-700">
                      <span class="text-base">📅</span>
                      <div>
                        <span class="font-bold">Política:</span> ${summary}
                      </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      ${isEnabled ? `
                        <button type="button" class="btn-toggle-backup-policy px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-bold text-xs transition cursor-pointer" data-id="${p.companyId}" data-enable="false">
                          Desativar
                        </button>
                      ` : `
                        <button type="button" class="btn-toggle-backup-policy px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-xs" data-id="${p.companyId}" data-enable="true">
                          ⚡ Ativar Diário às 02:00
                        </button>
                      `}
                      <a href="/api/backup/download-company/${p.companyId}" target="_blank" download class="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold rounded-lg border border-slate-200 text-xs transition">
                        ⬇️ Baixar Dados
                      </a>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Event listeners para alternar política com 1 clique
      container.querySelectorAll('.btn-toggle-backup-policy').forEach(btn => {
        btn.addEventListener('click', async () => {
          const compId = btn.getAttribute('data-id');
          const wantEnable = btn.getAttribute('data-enable') === 'true';
          btn.disabled = true;
          btn.textContent = 'Gravando...';

          const targetCompany = policies.find(p => p.companyId === compId);
          const currentPol = (targetCompany && targetCompany.backupService) ? targetCompany.backupService : {};
          const newPolicy = {
            enabled: wantEnable,
            frequency: currentPol.frequency || 'daily',
            scheduleTime: currentPol.scheduleTime || '02:00',
            intervalHours: currentPol.intervalHours || 4,
            daysOfWeek: currentPol.daysOfWeek || ['seg', 'qua', 'sex'],
            retentionDays: 30,
            updatedAt: new Date().toISOString(),
          };

          await persistCompanyBackupPolicy(compId, newPolicy);
          renderPoliciesView();
        });
      });

    } catch (err) {
      container.innerHTML = `
        <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
          <h4 class="font-bold">Erro ao carregar políticas de backup</h4>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  // 4.3 RENDERIZADOR DA ABA DE RESTAURAÇÃO ISOLADA
  async function renderRestoreCompanyView() {
    const container = document.getElementById('backup-support-modal-body');
    if (!container) return;

    const activeComp = getActiveCompanyContext();

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Banner de Segurança e Isolamento -->
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 p-4.5 rounded-2xl border-2 border-amber-300 text-amber-950 space-y-2 shadow-xs">
          <div class="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wide text-amber-900">
            <span class="text-base">🛡️</span> Restauração de Dados com Isolamento Estrito
          </div>
          <p class="text-xs text-amber-900 leading-relaxed">
            A restauração no MotorDesk é <strong>100% isolada por empresa</strong>. Ao restaurar um backup para a 
            <strong>Empresa Nº ${activeComp.companyNumberFormatted} (${activeComp.name})</strong>, nenhuma outra empresa do sistema será modificada ou afetada.
          </p>
        </div>

        <!-- Seletor de Arquivo de Backup -->
        <div class="p-5 bg-white border-2 border-slate-200 rounded-2xl space-y-4 shadow-xs">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Selecione o Arquivo de Backup (.json) para Restaurar *
            </label>
            <input type="file" id="input-restore-file" accept=".json"
              class="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer" />
          </div>

          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div class="font-bold text-slate-800">Alvo da Restauração:</div>
            <div class="text-slate-600 font-mono">
              Empresa Nº ${activeComp.companyNumberFormatted} • ID: ${activeComp.id} • Razão: ${activeComp.name}
            </div>
          </div>

          <button id="btn-run-company-restore" type="button" disabled
            class="w-full px-4 py-3 bg-indigo-600 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
            <span>🔄</span>
            <span>Executar Restauração Isolada para esta Empresa</span>
          </button>
        </div>

        <div id="restore-result-box" class="hidden"></div>
      </div>
    `;

    const fileInput = document.getElementById('input-restore-file');
    const restoreBtn = document.getElementById('btn-run-company-restore');
    const resultBox = document.getElementById('restore-result-box');

    fileInput?.addEventListener('change', () => {
      restoreBtn.disabled = !fileInput.files || fileInput.files.length === 0;
    });

    restoreBtn?.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      restoreBtn.disabled = true;
      restoreBtn.innerHTML = '<span>⏳</span> Processando arquivo e executando restauração isolada...';

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        const res = await fetch('/api/backup/restore-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-1' },
          body: JSON.stringify({
            targetCompanyId: activeComp.id,
            sourceData: json,
            sourceDescription: file.name
          })
        }).then(r => r.json());

        if (res.success) {
          resultBox.className = 'p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-950 text-xs space-y-2 animate-fade-in block';
          resultBox.innerHTML = `
            <div class="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <span>✓</span> Restauração Concluída com Sucesso!
            </div>
            <p class="text-xs text-emerald-900">${res.message}</p>
            <div class="p-2.5 bg-white/80 rounded-lg border border-emerald-200 font-mono text-[11px] text-emerald-800">
              Registros restaurados: ${res.result.restoredRecordsCount} • Empresas preservadas: ${res.result.unaffectedCompaniesCount}
            </div>
          `;
          showNotification('Restauração Concluída', `Empresa Nº ${activeComp.companyNumberFormatted} restaurada com sucesso!`);
        } else {
          resultBox.className = 'p-4 bg-rose-50 border-2 border-rose-200 rounded-xl text-rose-950 text-xs space-y-2 animate-fade-in block';
          resultBox.innerHTML = `
            <div class="font-bold text-rose-800">Erro na Restauração</div>
            <p>${res.error || 'Falha ao restaurar backup.'}</p>
          `;
        }
      } catch (e) {
        showNotification('Erro no Arquivo', e.message, 'error');
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = '<span>🔄</span> Executar Restauração Isolada para esta Empresa';
      }
    });
  }

  // 4.4 RENDERIZADOR DA ABA DE DIAGNÓSTICO & SUPORTE POR ID
  async function renderSupportView() {
    const container = document.getElementById('backup-support-modal-body');
    if (!container) return;

    const activeComp = getActiveCompanyContext();

    container.innerHTML = `
      <div class="flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    `;

    try {
      const res = await fetch(`/api/support/company-diagnostic/${activeComp.id}`, {
        headers: { 'x-user-id': 'usr-admin-1' }
      }).then(r => r.json());

      const report = res.report || {};

      container.innerHTML = `
        <div class="space-y-4">
          <!-- Banner de Identificação Oficial -->
          <div class="p-4 bg-slate-900 text-white rounded-2xl border-2 border-indigo-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🏢</span>
              <div>
                <div class="text-xs uppercase tracking-wider text-indigo-300 font-bold">Identificação no Suporte</div>
                <div class="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Empresa Nº ${activeComp.companyNumberFormatted} - ${report.targetCompanyName}</span>
                  <span class="bg-indigo-700 text-indigo-200 font-mono text-xs px-2 py-0.5 rounded">ID: ${report.targetCompanyId}</span>
                </div>
              </div>
            </div>
            <button id="btn-copy-support-phrase" type="button" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition cursor-pointer">
              Copiar Frase de Suporte
            </button>
          </div>

          <!-- Diagnóstico de Integridade -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span class="text-[10px] text-slate-500 uppercase font-bold">Status de Integridade</span>
              <div class="font-bold text-emerald-700 flex items-center gap-1.5 text-sm">
                <span>✓</span> ${report.healthStatus || '100% ÍNTEGRO & ISOLADO'}
              </div>
            </div>
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span class="text-[10px] text-slate-500 uppercase font-bold">Total de Registros Isolados</span>
              <div class="font-bold text-indigo-700 font-mono text-sm">
                ${report.recordsCountByCollection ? Object.values(report.recordsCountByCollection).reduce((a, b) => a + b, 0) : 0} registros
              </div>
            </div>
          </div>

          <!-- Frase de Abertura de Chamado -->
          <div class="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2">
            <label class="text-xs font-bold text-indigo-950 uppercase block">
              Frase Recomendada para Chamados Técnicos:
            </label>
            <div class="p-3 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-xs text-indigo-950 select-all" id="support-ticket-phrase">
              "Na empresa Nº ${activeComp.companyNumberFormatted} (ID: ${report.targetCompanyId}) precisa corrigir"
            </div>
            <p class="text-[11px] text-slate-500">
              Esta declaração garante que os técnicos e o agente atuem com foco absoluto nesta unidade, sem risco para outras empresas.
            </p>
          </div>

          <!-- Ação de Reparo Isolado -->
          <div class="pt-2">
            <button id="btn-run-company-repair" type="button"
              class="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
              <span>🛠️</span>
              <span>Executar Correção / Auditoria Isolada nesta Empresa</span>
            </button>
          </div>

          <div id="repair-result-box" class="hidden"></div>
        </div>
      `;

      document.getElementById('btn-copy-support-phrase')?.addEventListener('click', () => {
        const phrase = `Na empresa Nº ${activeComp.companyNumberFormatted} (ID: ${report.targetCompanyId}) precisa corrigir`;
        navigator.clipboard.writeText(phrase).then(() => {
          showNotification('Frase de Suporte Copiada', `"${phrase}"`);
        });
      });

      document.getElementById('btn-run-company-repair')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-run-company-repair');
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Executando auditoria isolada...';
        try {
          const res = await fetch('/api/support/company-repair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-1' },
            body: JSON.stringify({ targetCompanyId: report.targetCompanyId, correctionType: 'all' })
          }).then(r => r.json());

          const resultBox = document.getElementById('repair-result-box');
          if (resultBox && res.success) {
            resultBox.className = 'p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-950 text-xs space-y-2 animate-fade-in block';
            resultBox.innerHTML = `
              <div class="flex items-center gap-2 font-bold text-emerald-800">
                <span>✓</span> ${res.message}
              </div>
              <div class="text-[11px] text-emerald-900 space-y-1">
                ${(res.result.details || []).map(d => `<div>• ${d}</div>`).join('')}
              </div>
            `;
            showNotification('Correção Isolada Concluída', `Empresa Nº ${activeComp.companyNumberFormatted} auditada e protegida.`);
          }
        } catch (e) {
          showNotification('Erro na Correção', e.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<span>🛠️</span> Executar Correção / Auditoria Isolada nesta Empresa';
        }
      });

    } catch (err) {
      container.innerHTML = `
        <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
          <h4 class="font-bold">Erro ao carregar diagnóstico de suporte</h4>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  // 5. OBSERVER & EXECUÇÃO CONTÍNUA DO DOM

  // --- INJEÇÃO DA MINI PROPAGANDA MOTORDESK E LINK DA EMPRESA CONTRATANTE ---
  function injectCompanyAccessPromoAndContractorLink() {
    const loginForm = document.getElementById("form-login");
    const loginContainer = document.getElementById("login-view-container");
    if (loginForm && loginContainer) {
      const companyCtx = getActiveCompanyContext();
      const select = document.getElementById("login-company-select");
      const selectedId = select ? select.value : companyCtx.id;
      const targetCompany = companyCtx.allCompanies.find(c => c.id === selectedId) || companyCtx;
      const companySite = targetCompany.website || targetCompany.portalUrl || (targetCompany.cnpj ? ("https://" + (targetCompany.tradeName || targetCompany.name || "empresa").toLowerCase().replace(/[^a-z0-9]/g, "") + ".com.br") : "https://motordesk.com.br");

      let promoContainer = document.getElementById("motordesk-login-promo-container");
      if (!promoContainer) {
        promoContainer = document.createElement("div");
        promoContainer.id = "motordesk-login-promo-container";
        promoContainer.style.cssText = "margin-top: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px;";
        
        const selectorContainer = document.getElementById("login-company-selector-container") || document.getElementById("login-single-company-badge");
        if (selectorContainer && selectorContainer.parentNode) {
          selectorContainer.parentNode.insertBefore(promoContainer, selectorContainer.nextSibling);
        } else {
          loginForm.parentNode.insertBefore(promoContainer, loginForm);
        }
      }

      promoContainer.innerHTML = `
        <!-- Card da Empresa Contratante com Link -->
        <div id="card-contractor-company-link" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%); border: 1px solid #3b82f6; border-radius: 14px; padding: 14px 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">🏢</span>
              <span style="font-size: 12px; font-weight: 800; color: #ffffff;">Empresa Contratante:</span>
            </div>
            <span style="font-size: 10px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); padding: 2px 8px; border-radius: 6px; font-weight: 800;">Ativa</span>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #facc15; margin-bottom: 2px;">
            ${targetCompany.name || "MotorDesk Auto Center"}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
            ${targetCompany.cnpj ? "CNPJ: " + targetCompany.cnpj : ""} ${targetCompany.phone ? "• Tel: " + targetCompany.phone : ""}
          </div>
          <a href="${companySite}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; box-sizing: border-box; padding: 8px 12px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 11.5px; font-weight: 700; transition: background 0.2s;" onmouseover="this.style.background=#1d4ed8" onmouseout="this.style.background=#2563eb">
            <span>🌐</span> Acessar Link / Portal da Empresa Contratante ↗
          </a>
        </div>

        <!-- Mini Propaganda do MotorDesk -->
        <div id="card-motordesk-mini-promo" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 14px; padding: 14px 16px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.12);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 10px; background: rgba(99, 102, 241, 0.25); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 2px 8px; border-radius: 6px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                ⚡ MotorDesk Enterprise
              </span>
            </div>
            <span style="font-size: 10px; color: #38bdf8; font-weight: 700;">ERP Automotivo 360°</span>
          </div>
          <p style="font-size: 11px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px; line-height: 1.4;">
            O Sistema Mais Completo do Brasil para Oficinas, Centros Automotivos & Autopeças
          </p>
          <p style="font-size: 10px; color: #94a3b8; margin: 0 0 10px; line-height: 1.4;">
            Ordens de Serviço em tempo real • PDV Balcão Express com cálculo dimensional • Cotações Online com Fornecedores • Emissão Fiscal SEFAZ (NF-e, NFS-e, NFC-e) • Acesso simultâneo em múltiplos computadores.
          </p>
          <button type="button" onclick="const b = document.getElementById('btn-login-to-landing'); if (b) b.click(); else window.open('/', '_blank');" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; box-sizing: border-box; padding: 7px 12px; background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; color: #c7d2fe; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(99, 102, 241, 0.3)'" onmouseout="this.style.background='rgba(99, 102, 241, 0.15)'">
            <span>🚀</span> Conheça Todos os Recursos do MotorDesk ↗
          </button>
        </div>
      `;

      if (select && !select.dataset.promoBound) {
        select.dataset.promoBound = "true";
        select.addEventListener("change", () => {
          setTimeout(injectCompanyAccessPromoAndContractorLink, 50);
        });
      }
    }

    const topBar = document.getElementById("top-workspace-bar");
    if (topBar && !document.getElementById("top-contractor-link-badge")) {
      const companyCtx = getActiveCompanyContext();
      const companySite = companyCtx.website || companyCtx.portalUrl || (companyCtx.cnpj ? ("https://" + (companyCtx.tradeName || companyCtx.name || "empresa").toLowerCase().replace(/[^a-z0-9]/g, "") + ".com.br") : "https://motordesk.com.br");

      const badge = document.createElement("div");
      badge.id = "top-contractor-link-badge";
      badge.style.cssText = "display: inline-flex; align-items: center; gap: 6px; margin-left: 8px;";
      badge.innerHTML = `
        <a href="${companySite}" target="_blank" rel="noopener noreferrer" title="Acessar site/portal oficial da empresa contratante" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; color: #2563eb; text-decoration: none; font-size: 11px; font-weight: 700; white-space: nowrap;">
          <span>🌐</span> <span class="hidden md:inline">Portal da Empresa</span> ↗
        </a>
      `;

      const rightSection = topBar.querySelector(".flex.items-center.gap-2") || topBar.children[1] || topBar;
      if (rightSection) {
        rightSection.insertBefore(badge, rightSection.firstChild);
      }
    }
  }

  function runDomCheck() {
    injectCompanyIdAndNumberFieldInSettingsForm();
    injectBackupAndSupportNavbarButton();
    injectCompanyAccessPromoAndContractorLink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDomCheck);
  } else {
    runDomCheck();
  }

  const observer = new MutationObserver(() => {
    runDomCheck();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Expor utility global
  window.__openMotorDeskBackupSupport = openSupportAndBackupModal;

  console.log('[MotorDesk] Módulo de Identificação Cadastral e Central de Backup (QA) pronto.');
})();
