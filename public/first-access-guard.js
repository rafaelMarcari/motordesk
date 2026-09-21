/**
 * MotorDesk First Access Guard
 * Monitora o login de novos colaboradores e exibe uma tela exclusiva para
 * alteração obrigatória ou confirmação de manutenção da senha inicial (123456).
 * Garante que a senha alterada seja permanentemente acatada em todas as sessões.
 */
(function () {
  'use strict';

  var modalId = 'motordesk-first-access-modal';
  var isProcessing = false;

  function getActiveUser() {
    try {
      var raw = localStorage.getItem('motordesk_active_user');
      if (!raw) return null;
      var user = JSON.parse(raw);
      if (user && user.id && user.username) return user;
    } catch (e) {}
    return null;
  }

  function getActiveCompany(companyId) {
    try {
      var rawDb = localStorage.getItem('motordesk_db_v1') || localStorage.getItem('motordesk_db');
      if (rawDb) {
        var db = JSON.parse(rawDb);
        var companies = db.registeredCompanies || (db.companyInfo ? [db.companyInfo] : []);
        var found = companies.find(function (c) { return c.id === companyId; });
        if (found) return found;
      }
    } catch (e) {}
    return { name: 'Unidade Fabril' };
  }

  function checkNeedsFirstAccess(user) {
    if (!user) return false;
    // Administrador master e QA não são forçados pela tela de primeiro acesso de operador fabril
    if (user.role === 'admin' || user.username === 'admin' || user.username === 'validador') {
      return false;
    }

    // Se usuário já escolheu manter ou alterar explicitamente
    if (user.hasChosenPassword === true && user.firstAccess === false && user.mustChangePassword === false) {
      return false;
    }

    // Critérios de primeiro acesso:
    // 1. Flag firstAccess ou mustChangePassword ativa
    if (user.firstAccess === true || user.mustChangePassword === true) {
      return true;
    }

    // 2. Senha ainda é o padrão inicial '123456' e hasChosenPassword ainda não foi registrado
    if (user.passwordHash === '123456' && user.hasChosenPassword !== true) {
      return true;
    }

    return false;
  }

  function showToast(message, isSuccess) {
    var toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[100000] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold text-white transition-all transform duration-300 ' +
      (isSuccess ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500');
    toast.style.boxShadow = '0 20px 30px -10px rgba(0,0,0,0.3)';
    toast.innerHTML = (isSuccess ? '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>') +
      '<span>' + message + '</span>';
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4000);
  }

  function saveUserPasswordUpdate(user, newPassword, keepCurrent, onComplete) {
    if (isProcessing) return;
    isProcessing = true;

    var now = Date.now();
    var finalPassword = keepCurrent ? (user.passwordHash || '123456') : newPassword;

    // 1. Atualizar active user no localStorage
    user.passwordHash = finalPassword;
    user.firstAccess = false;
    user.mustChangePassword = false;
    user.hasChosenPassword = true;
    user.passwordUpdatedAt = now;
    user.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem('motordesk_active_user', JSON.stringify(user));
    } catch (e) {}

    // 2. Atualizar banco local (motordesk_db_v1 e motordesk_db)
    var dbKeys = ['motordesk_db_v1', 'motordesk_db'];
    var updatedDb = null;
    dbKeys.forEach(function (k) {
      try {
        var raw = localStorage.getItem(k);
        if (raw) {
          var db = JSON.parse(raw);
          if (Array.isArray(db.users)) {
            db.users = db.users.map(function (u) {
              if (u.id === user.id || (u.username && u.username.toLowerCase() === user.username.toLowerCase() && u.companyId === user.companyId)) {
                return Object.assign({}, u, {
                  passwordHash: finalPassword,
                  firstAccess: false,
                  mustChangePassword: false,
                  hasChosenPassword: true,
                  passwordUpdatedAt: now,
                  updatedAt: new Date().toISOString()
                });
              }
              return u;
            });
            localStorage.setItem(k, JSON.stringify(db));
            updatedDb = db;
          }
        }
      } catch (e) {}
    });

    // 3. Chamar API dedicada no backend com fallback resiliente
    fetch('/api/users/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id,
        'X-Company-Id': user.companyId || 'comp-1',
        'X-User-Role': user.role || 'mecanico'
      },
      body: JSON.stringify({
        userId: user.id,
        username: user.username,
        companyId: user.companyId,
        newPassword: keepCurrent ? undefined : finalPassword,
        keepCurrent: Boolean(keepCurrent)
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        console.log('[FIRST-ACCESS] Resposta da API:', data);
        // Também enviar atualização global do db para persistência cruzada de forma gerenciada
        if (updatedDb) {
          if (window.__motorDeskDb && typeof window.__motorDeskDb.saveDatabase === 'function') {
            window.__motorDeskDb.saveDatabase(updatedDb);
          }
        }
      })
      .catch(function (err) {
        console.warn('[FIRST-ACCESS] Erro na requisição (usando persistência local e sync):', err);
      })
      .finally(function () {
        isProcessing = false;
        if (typeof onComplete === 'function') onComplete();
      });
  }

  function renderFirstAccessModal(user) {
    if (document.getElementById(modalId)) return;

    var company = getActiveCompany(user.companyId);
    var jobTitle = user.jobTitle || (user.role === 'mecanico' ? 'Mecânico / Operador Fabril' : user.role);

    var overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in';

    overlay.innerHTML =
      '<div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800 my-8">' +
        // Header
        '<div class="bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-900 p-6 sm:p-7 text-white text-center relative overflow-hidden">' +
          '<div class="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>' +
          '<div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/20 mb-3 shadow-inner">' +
            '<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>' +
            '</svg>' +
          '</div>' +
          '<div class="inline-block px-3 py-1 bg-amber-400/20 border border-amber-300/40 rounded-full text-amber-200 text-xs font-bold tracking-wide uppercase mb-2">' +
            'Primeiro Acesso ao Sistema' +
          '</div>' +
          '<h2 class="text-xl sm:text-2xl font-bold tracking-tight">Definição da Senha de Acesso</h2>' +
          '<p class="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-sm mx-auto">' +
            'Configure sua credencial para acessar os módulos da empresa.' +
          '</p>' +
        '</div>' +

        // Body Content
        '<div class="p-6 sm:p-7 space-y-5">' +
          // User Card
          '<div class="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between text-xs sm:text-sm">' +
            '<div class="space-y-0.5">' +
              '<p class="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Colaborador</p>' +
              '<p class="font-bold text-slate-900 text-sm sm:text-base">' + (user.name || 'Operador') + '</p>' +
              '<p class="text-indigo-600 font-mono text-xs">@' + user.username + ' • ' + jobTitle + '</p>' +
            '</div>' +
            '<div class="text-right">' +
              '<p class="text-slate-500 text-[11px] font-medium uppercase tracking-wider">Empresa</p>' +
              '<span class="inline-block px-2.5 py-1 bg-slate-200/70 text-slate-800 rounded-lg text-xs font-semibold max-w-[150px] truncate">' +
                company.name +
              '</span>' +
            '</div>' +
          '</div>' +

          // Opção A: Alterar Senha
          '<form id="form-first-access" class="space-y-4">' +
            '<div class="space-y-3">' +
              '<div class="flex items-center justify-between">' +
                '<label class="block text-xs font-bold text-slate-800 uppercase tracking-wider">Definir Nova Senha Pessoal</label>' +
                '<span class="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">Recomendado</span>' +
              '</div>' +
              '<div class="relative">' +
                '<input type="password" id="input-new-pass" placeholder="Digite uma nova senha (mínimo 4 caracteres)" ' +
                  'class="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition" required minlength="4" autocomplete="new-password" />' +
                '<button type="button" id="toggle-pass-1" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5">' +
                  '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>' +
                '</button>' +
              '</div>' +

              '<div class="relative">' +
                '<input type="password" id="input-confirm-pass" placeholder="Confirme a nova senha digitada" ' +
                  'class="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition" required minlength="4" autocomplete="new-password" />' +
                '<button type="button" id="toggle-pass-2" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5">' +
                  '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>' +
                '</button>' +
              '</div>' +
              '<div id="pass-error-msg" class="text-xs text-rose-600 hidden font-medium flex items-center gap-1.5">' +
                '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
                '<span id="pass-error-text"></span>' +
              '</div>' +
            '</div>' +

            '<button type="submit" id="btn-save-new-pass" ' +
              'class="w-full py-3 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/25 transition transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer">' +
              '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' +
              '<span>Salvar Nova Senha e Acessar o Sistema</span>' +
            '</button>' +
          '</form>' +

          // Divider
          '<div class="relative flex py-1 items-center">' +
            '<div class="flex-grow border-t border-slate-200"></div>' +
            '<span class="flex-shrink mx-3 text-slate-400 text-xs uppercase font-bold tracking-wider">ou manter padrão</span>' +
            '<div class="flex-grow border-t border-slate-200"></div>' +
          '</div>' +

          // Opção B: Manter Senha Atual Criada
          '<div class="space-y-2">' +
            '<button type="button" id="btn-keep-current-pass" ' +
              'class="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 transition flex items-center justify-center gap-2 cursor-pointer">' +
              '<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
              '<span>Manter a Senha Criada (123456) e Prosseguir</span>' +
            '</button>' +
            '<p class="text-[11px] text-slate-500 text-center leading-relaxed">' +
              'Você poderá trocar sua senha a qualquer momento nas configurações do seu perfil.' +
            '</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Configurar interações dos campos
    var inputNew = document.getElementById('input-new-pass');
    var inputConfirm = document.getElementById('input-confirm-pass');
    var errorBox = document.getElementById('pass-error-msg');
    var errorText = document.getElementById('pass-error-text');
    var form = document.getElementById('form-first-access');
    var btnSave = document.getElementById('btn-save-new-pass');
    var btnKeep = document.getElementById('btn-keep-current-pass');

    function toggleVisibility(inputId, btnId) {
      var inp = document.getElementById(inputId);
      var btn = document.getElementById(btnId);
      if (btn && inp) {
        btn.addEventListener('click', function () {
          if (inp.type === 'password') {
            inp.type = 'text';
            btn.innerHTML = '<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>';
          } else {
            inp.type = 'password';
            btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
          }
        });
      }
    }
    toggleVisibility('input-new-pass', 'toggle-pass-1');
    toggleVisibility('input-confirm-pass', 'toggle-pass-2');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pass1 = (inputNew.value || '').trim();
      var pass2 = (inputConfirm.value || '').trim();

      if (pass1.length < 4) {
        errorText.textContent = 'A nova senha deve possuir no mínimo 4 caracteres.';
        errorBox.classList.remove('hidden');
        inputNew.focus();
        return;
      }
      if (pass1 !== pass2) {
        errorText.textContent = 'As senhas digitadas não coincidem. Verifique a confirmação.';
        errorBox.classList.remove('hidden');
        inputConfirm.focus();
        return;
      }

      errorBox.classList.add('hidden');
      btnSave.disabled = true;
      btnKeep.disabled = true;
      btnSave.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Salvando nova senha...';

      saveUserPasswordUpdate(user, pass1, false, function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        showToast('Nova senha configurada com sucesso! Bem-vindo ao MotorDesk.', true);
      });
    });

    btnKeep.addEventListener('click', function () {
      btnSave.disabled = true;
      btnKeep.disabled = true;
      btnKeep.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Confirmando...';

      saveUserPasswordUpdate(user, null, true, function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        showToast('Senha inicial mantida. Bem-vindo ao MotorDesk!', true);
      });
    });
  }

  function checkAndTrigger() {
    var user = getActiveUser();
    if (!user) {
      var existing = document.getElementById(modalId);
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }

    if (checkNeedsFirstAccess(user)) {
      renderFirstAccessModal(user);
    } else {
      var existing = document.getElementById(modalId);
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    }
  }

  // Monitoramento contínuo
  window.addEventListener('load', checkAndTrigger);
  window.addEventListener('storage', checkAndTrigger);
  setInterval(checkAndTrigger, 400);

  // Exportar hook para disparo imediato após login
  window.__motorDeskCheckFirstAccess = checkAndTrigger;
})();
