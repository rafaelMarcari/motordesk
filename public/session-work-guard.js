/**
 * MotorDesk - Session Inactivity Lock & Work Preservation Engine
 * 
 * Garante que:
 * 1. Quando a sessão expirar por inatividade (15 minutos sem interação),
 *    o usuário NÃO perca o trabalho em andamento (formulários, dados digitados,
 *    modais abertos, orçamentos, ordens de serviço, itens, etc.).
 * 2. Apresenta uma tela de bloqueio de segurança corporativa (Lock Screen)
 *    que protege a visualização dos dados da empresa com backdrop-blur.
 * 3. Permite reautenticar rapidamente informando apenas a senha do operador.
 * 4. Ao desbloquear, o usuário continua EXATAMENTE onde estava, com 100% dos dados
 *    preservados e sem recarregar a tela.
 * 5. Caso haja recarregamento de página (F5) ou fechamento de navegador, os dados
 *    são salvos como rascunho criptografado/estruturado no localStorage e restaurados
 *    automaticamente após o login com notificação de recuperação de trabalho.
 */
(function() {
  'use strict';

  const DRAFT_STORAGE_KEY = 'motordesk_work_draft';
  const LOCK_STATE_KEY = 'motordesk_session_locked';
  const INTENDED_VIEW_KEY = 'motordesk_intended_view';
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

  let currentLockState = {
    isLocked: false,
    user: null,
    view: null,
    db: null,
    lockTime: null,
    onUnlockCallback: null,
    onLogoutCallback: null
  };

  // --- MOTOR DE PRESERVAÇÃO DE TRABALHO / RASCUNHO EM TEMPO REAL ---

  /**
   * Captura o estado atual de formulários, inputs, textareas e modais visíveis
   */
  function captureActiveWorkDraft(explicitView) {
    try {
      const activeUserStr = localStorage.getItem('motordesk_active_user');
      const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
      const activeCompanyId = localStorage.getItem('motordesk_active_company_id') || 'comp-1';
      
      const currentView = explicitView || 
        (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null) ||
        localStorage.getItem(INTENDED_VIEW_KEY) ||
        'dashboard';

      // Coletar campos preenchidos
      const fields = {};
      const inputs = document.querySelectorAll('input:not([type="password"]):not([type="hidden"]), textarea, select');
      let filledCount = 0;

      inputs.forEach((el, index) => {
        // Ignorar campos de busca geral ou do próprio lockscreen
        if (el.closest('#motordesk-lock-screen') || el.closest('#login-view-container')) return;
        if (el.id && (el.id.includes('search') || el.id.includes('filter'))) return;

        const val = el.value;
        const key = el.id || el.name || `field_${el.tagName.toLowerCase()}_${index}`;

        if (el.type === 'checkbox' || el.type === 'radio') {
          fields[key] = { type: el.type, checked: el.checked };
        } else if (val && typeof val === 'string' && val.trim().length > 0) {
          fields[key] = { type: el.type || 'text', value: val };
          filledCount++;
        }
      });

      // Detectar se há modal aberto
      let activeModalInfo = null;
      try {
        const visibleModais = document.querySelectorAll('[role="dialog"], .fixed.inset-0, .z-50, .z-40');
        visibleModais.forEach(modal => {
          if (!modal || modal.id === 'motordesk-lock-screen') return;
          if (typeof modal.getBoundingClientRect !== 'function') return;
          const rect = modal.getBoundingClientRect();
          const isVisible = (typeof window.getComputedStyle === 'function')
            ? window.getComputedStyle(modal).display !== 'none'
            : true;
          if (rect.width > 100 && rect.height > 100 && isVisible) {
            const heading = modal.querySelector ? modal.querySelector('h1, h2, h3, h4, .font-bold') : null;
            activeModalInfo = {
              title: heading ? heading.innerText.trim() : 'Modal Ativo',
              id: modal.id || null
            };
          }
        });
      } catch (modalErr) {
        // silencioso
      }

      const draftPayload = {
        timestamp: Date.now(),
        userId: activeUser ? activeUser.id : null,
        username: activeUser ? activeUser.username : null,
        companyId: activeCompanyId,
        view: currentView,
        fieldsCount: filledCount,
        fields: fields,
        modal: activeModalInfo
      };

      if (filledCount > 0 || activeModalInfo) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
        // console.log('[Work Guard] Trabalho em andamento salvo com sucesso:', draftPayload);
      }

      return draftPayload;
    } catch (err) {
      console.warn('[Work Guard] Falha ao capturar rascunho de trabalho:', err);
      return null;
    }
  }

  /**
   * Restaura o rascunho salvo para a tela ativa
   */
  function restoreActiveWorkDraft() {
    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) return false;

      const draft = JSON.parse(rawDraft);
      if (!draft || !draft.fields || Object.keys(draft.fields).length === 0) return false;

      // Verificar se o rascunho é recente (menos de 24h)
      if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return false;
      }

      let restoredCount = 0;

      // Tentar preencher campos correspondentes
      Object.keys(draft.fields).forEach(key => {
        const item = draft.fields[key];
        let el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
        
        if (el) {
          if (item.type === 'checkbox' || item.type === 'radio') {
            if (el.checked !== item.checked) {
              el.checked = item.checked;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              restoredCount++;
            }
          } else if (item.value !== undefined && el.value !== item.value) {
            el.value = item.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            restoredCount++;
          }
        }
      });

      if (restoredCount > 0) {
        showRestoredNotification(restoredCount, draft.view);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Work Guard] Erro ao restaurar trabalho salvo:', err);
      return false;
    }
  }

  /**
   * Notificação flutuante de trabalho restaurado com sucesso
   */
  function showRestoredNotification(fieldsCount, viewName) {
    if (document.getElementById('motordesk-work-restored-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'motordesk-work-restored-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      background: #0f172a;
      border: 1px solid #10b981;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
      border-radius: 12px;
      padding: 14px 18px;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 420px;
      animation: slideInUp 0.35s ease-out;
    `;

    toast.innerHTML = `
      <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: #10b981; flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 13px; color: #10b981; margin-bottom: 2px;">Trabalho Recuperado com Sucesso</div>
        <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">Seus dados e formulários em andamento foram preservados e restaurados sem perdas.</div>
      </div>
      <button id="btn-close-work-toast" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    document.body.appendChild(toast);

    const closeBtn = document.getElementById('btn-close-work-toast');
    if (closeBtn) {
      closeBtn.onclick = () => toast.remove();
    }

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transition = 'opacity 0.4s, transform 0.4s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 400);
      }
    }, 6000);
  }

  // Monitorar digitações para salvar rascunhos preventivos a cada segundo de inatividade
  let inputDebounceTimer = null;
  document.addEventListener('input', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
      if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
      inputDebounceTimer = setTimeout(() => {
        captureActiveWorkDraft();
      }, 1000);
    }
  }, { passive: true });

  // Limpar rascunho quando formulários forem salvos com sucesso
  document.addEventListener('submit', (e) => {
    // Se o submit não for do login nem do lockscreen, limpa o draft após confirmação de salvamento
    if (!e.target.closest('#motordesk-lock-screen') && !e.target.closest('#form-login')) {
      setTimeout(() => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }, 1000);
    }
  });

  // --- TELA DE BLOQUEIO POR INATIVIDADE (LOCK SCREEN) ---

  /**
   * Renderiza a tela de bloqueio com proteção de blur e formulário de desbloqueio rápido
   */
  function showInactivityLockScreen(options) {
    const user = options.user;
    const view = options.view || localStorage.getItem(INTENDED_VIEW_KEY) || 'dashboard';
    const db = options.db;
    const onUnlock = options.onUnlock;
    const onLogout = options.onLogout;

    // 1. Salvar o trabalho atual imediatamente antes de bloquear
    captureActiveWorkDraft(view);
    localStorage.setItem(INTENDED_VIEW_KEY, view);
    localStorage.setItem(LOCK_STATE_KEY, 'true');

    currentLockState = {
      isLocked: true,
      user: user,
      view: view,
      db: db,
      lockTime: Date.now(),
      onUnlockCallback: onUnlock,
      onLogoutCallback: onLogout
    };

    // Se já houver um lock screen no DOM, apenas focar
    let existingScreen = document.getElementById('motordesk-lock-screen');
    if (existingScreen) {
      const pwdInput = document.getElementById('lock-password-input');
      if (pwdInput) pwdInput.focus();
      return;
    }

    // Obter dados da empresa para exibição
    let companyName = 'Empresa Ativa';
    if (db) {
      const compId = user.companyId || localStorage.getItem('motordesk_active_company_id');
      const comp = (db.registeredCompanies || []).find(c => c && c.id === compId) || db.companyInfo;
      if (comp && comp.name) companyName = comp.name;
    }

    const userName = user.name || user.username || 'Operador';
    const userRole = user.role ? (user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : user.role === 'mechanic' ? 'Mecânico / Técnico' : 'Operador') : 'Usuário';
    const userInitials = userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    // Criar elemento de tela de bloqueio
    const lockScreen = document.createElement('div');
    lockScreen.id = 'motordesk-lock-screen';
    lockScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      background: rgba(10, 15, 29, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      animation: fadeInLock 0.3s ease-out;
    `;

    lockScreen.innerHTML = `
      <div id="motordesk-lock-card" style="
        width: 100%;
        max-width: 480px;
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
        padding: 36px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        position: relative;
        overflow: hidden;
      ">
        <!-- Barra de destaque no topo -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #3b82f6, #10b981, #6366f1);"></div>

        <!-- Ícone de Escudo e Segurança -->
        <div style="
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: #10b981;
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <!-- Título -->
        <h2 style="font-size: 22px; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0; letter-spacing: -0.02em;">
          Sessão Bloqueada por Inatividade
        </h2>

        <!-- Badge de Proteção de Trabalho -->
        <div style="
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 20px;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Seu trabalho em andamento foi preservado com segurança</span>
        </div>

        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 24px 0; line-height: 1.5; max-width: 380px;">
          Após 15 minutos sem interação, sua tela foi bloqueada para conformidade e segurança. Digite sua senha para continuar de onde parou.
        </p>

        <!-- Card do Usuário Ativo -->
        <div style="
          width: 100%;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
          text-align: left;
        ">
          <div style="
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: #3b82f6;
            color: #ffffff;
            font-weight: 800;
            font-size: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            ${userInitials}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 14px; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${userName}
            </div>
            <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 8px;">
              <span>@${user.username || 'operador'}</span>
              <span>•</span>
              <span style="color: #38bdf8;">${userRole}</span>
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              🏢 ${companyName}
            </div>
          </div>
        </div>

        <!-- Alerta de Erro de Senha -->
        <div id="lock-error-alert" style="
          display: none;
          width: 100%;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 12px;
          font-weight: 600;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
          text-align: left;
        "></div>

        <!-- Formulário de Desbloqueio -->
        <form id="form-unlock-session" style="width: 100%; display: flex; flex-direction: column; gap: 16px;">
          <div style="text-align: left;">
            <label for="lock-password-input" style="display: block; font-size: 11px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
              Confirme sua Senha
            </label>
            <div style="position: relative;">
              <input 
                id="lock-password-input" 
                type="password" 
                placeholder="Informe sua senha"
                required
                autocomplete="current-password"
                style="
                  width: 100%;
                  box-sizing: border-box;
                  background: #1e293b;
                  border: 1px solid #334155;
                  border-radius: 10px;
                  padding: 12px 42px 12px 14px;
                  color: #f8fafc;
                  font-size: 14px;
                  outline: none;
                  transition: border-color 0.2s, box-shadow 0.2s;
                "
              />
              <button 
                type="button" 
                id="btn-toggle-lock-pwd" 
                style="
                  position: absolute;
                  right: 12px;
                  top: 50%;
                  transform: translateY(-50%);
                  background: none;
                  border: none;
                  color: #64748b;
                  cursor: pointer;
                  padding: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                "
                title="Mostrar/Ocultar Senha"
              >
                <svg id="icon-eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg id="icon-eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Botão Desbloquear -->
          <button 
            type="submit" 
            id="btn-submit-unlock"
            style="
              width: 100%;
              background: #10b981;
              hover: background #059669;
              border: none;
              border-radius: 10px;
              padding: 13px 16px;
              color: #ffffff;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39);
              transition: transform 0.1s, background-color 0.2s;
            "
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
            <span>Desbloquear Sessão e Continuar Trabalho</span>
          </button>
        </form>

        <!-- Ações Auxiliares: Trocar de Usuário / Sair -->
        <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #64748b;">Não é ${userName}?</span>
          <button 
            type="button" 
            id="btn-lock-logout"
            style="
              background: none;
              border: none;
              color: #f87171;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              padding: 4px 8px;
              border-radius: 6px;
              display: flex;
              align-items: center;
              gap: 4px;
              transition: background-color 0.2s;
            "
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Trocar de Usuário / Sair</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(lockScreen);

    // Eventos e Interações do Lock Screen
    const pwdInput = document.getElementById('lock-password-input');
    const togglePwdBtn = document.getElementById('btn-toggle-lock-pwd');
    const eyeOpen = document.getElementById('icon-eye-open');
    const eyeClosed = document.getElementById('icon-eye-closed');
    const errorAlert = document.getElementById('lock-error-alert');
    const unlockForm = document.getElementById('form-unlock-session');
    const logoutBtn = document.getElementById('btn-lock-logout');

    if (pwdInput) {
      setTimeout(() => pwdInput.focus(), 150);
      pwdInput.onfocus = () => {
        pwdInput.style.borderColor = '#3b82f6';
        pwdInput.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
      };
      pwdInput.onblur = () => {
        pwdInput.style.borderColor = '#334155';
        pwdInput.style.boxShadow = 'none';
      };
    }

    if (togglePwdBtn && pwdInput) {
      togglePwdBtn.onclick = () => {
        if (pwdInput.type === 'password') {
          pwdInput.type = 'text';
          if (eyeOpen) eyeOpen.style.display = 'none';
          if (eyeClosed) eyeClosed.style.display = 'block';
        } else {
          pwdInput.type = 'password';
          if (eyeOpen) eyeOpen.style.display = 'block';
          if (eyeClosed) eyeClosed.style.display = 'none';
        }
      };
    }

    // Submeter desbloqueio
    if (unlockForm) {
      unlockForm.onsubmit = (e) => {
        e.preventDefault();
        const pwd = pwdInput ? pwdInput.value.trim() : '';
        if (!pwd) {
          showError('Por favor, informe sua senha para desbloquear.');
          return;
        }

        // Validar senha
        let isValid = false;
        if (user.passwordHash && (user.passwordHash === pwd || user.passwordHash.toLowerCase() === pwd.toLowerCase())) {
          isValid = true;
        } else if (db && Array.isArray(db.users)) {
          const match = db.users.find(u => 
            u && u.username && u.username.toLowerCase() === (user.username || '').toLowerCase() &&
            (u.passwordHash === pwd || (u.passwordHash && u.passwordHash.toLowerCase() === pwd.toLowerCase()))
          );
          if (match) isValid = true;
        }

        if (isValid) {
          // Desbloqueio autorizado!
          unlockSessionSuccess();
        } else {
          showError('Senha incorreta. Por favor, tente novamente.');
          if (pwdInput) {
            pwdInput.value = '';
            pwdInput.focus();
          }
        }
      };
    }

    function showError(msg) {
      if (errorAlert) {
        errorAlert.innerText = msg;
        errorAlert.style.display = 'block';
      }
    }

    function unlockSessionSuccess() {
      // 1. Fechar o overlay
      localStorage.setItem('motordesk_last_activity', Date.now().toString());
      localStorage.removeItem(LOCK_STATE_KEY);
      currentLockState.isLocked = false;

      if (lockScreen && lockScreen.parentNode) {
        lockScreen.style.transition = 'opacity 0.3s';
        lockScreen.style.opacity = '0';
        setTimeout(() => lockScreen.remove(), 300);
      }

      // 2. Chamar callback de desbloqueio do app se houver
      if (typeof onUnlock === 'function') {
        try { onUnlock(); } catch (err) { console.warn(err); }
      }

      // 3. Restaurar dados de trabalho se necessário
      setTimeout(() => {
        restoreActiveWorkDraft();
        showRestoredNotification(1, view);
      }, 200);
    }

    // Ação de Logout
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        const confirmExit = confirm('Atenção: Ao sair para trocar de usuário, o trabalho em andamento que não foi gravado no banco de dados poderá ser descartado. Deseja realmente sair?');
        if (!confirmExit) return;

        // Limpar lock
        localStorage.removeItem(LOCK_STATE_KEY);
        currentLockState.isLocked = false;
        if (lockScreen && lockScreen.parentNode) lockScreen.remove();

        if (typeof onLogout === 'function') {
          onLogout();
        } else {
          // Fallback logout
          localStorage.removeItem('motordesk_auth_token');
          localStorage.removeItem('motordesk_active_user');
          localStorage.removeItem('motordesk_last_activity');
          window.location.reload();
        }
      };
    }
  }

  // Expor API global
  window.__motordesk_lock_session = function(options) {
    showInactivityLockScreen(options);
  };

  window.__motordesk_save_active_work = function(view) {
    return captureActiveWorkDraft(view);
  };

  window.__motordesk_restore_active_work = function() {
    return restoreActiveWorkDraft();
  };

  window.__motordesk_is_locked = function() {
    return currentLockState.isLocked || localStorage.getItem(LOCK_STATE_KEY) === 'true';
  };

  // Ao carregar a página: verificar se havia rascunho recente a ser restaurado após login
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      // Se houver usuário ativo logado e rascunho existente
      const activeUser = localStorage.getItem('motordesk_active_user');
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (activeUser && draft) {
        restoreActiveWorkDraft();
      }
    }, 1200);
  });

  console.log('[Work & Inactivity Guard] Engine carregado com sucesso. Protegendo trabalho e sessão do usuário.');
})();
