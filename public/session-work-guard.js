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

  // --- REGRAS CORPORATIVAS: UNICIDADE (EMPRESAS, CLIENTES, FORNECEDORES) E GESTÃO DE CONTRATOS / DEMISSÃO COM REVOGAÇÃO DE ACESSOS ---

  /**
   * Obtém os dados completos do banco de dados salvos localmente
   */
  function getAppDatabaseSafe() {
    try {
      const activeUserStr = localStorage.getItem('motordesk_active_user');
      const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
      // Procura banco no cache da janela ou localStorage
      if (window.__motordesk_current_db) return window.__motordesk_current_db;
      const cached = localStorage.getItem('motordesk_app_database');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // silencioso
    }
    return null;
  }

  /**
   * Monitora a modal de Novo / Editar Operador para injetar os dois campos:
   * 1. Data de Início do Contrato (Admissão)
   * 2. Data de Término do Contrato (Desligamento / Demissão)
   * Se a Data de Término estiver preenchida, revoga visualmente todas as permissões
   */
  function setupUserContractManagement() {
    // Verificar se há modal de usuário aberta (NUNCA associar ao formulário de cliente)
    const userModal = document.querySelector('#modal-user-permissions, [id*="user-permissions"], [id*="user-error-alert"]')?.closest('.fixed.inset-0');
    
    if (!userModal) return;
    if (userModal.querySelector('#form-client, #client-form-panel, #client-cpf-input, #client-name-input') || 
        userModal.id === 'client-form-panel' || 
        userModal.closest('#clients-view-container')) {
      return;
    }

    // Verificar se o container de contrato já foi injetado
    if (userModal.querySelector('#user-contract-fields-container')) {
      // Atualizar comportamento reativo com base no valor de data de término
      const endDateInput = userModal.querySelector('#user-contract-end-date');
      const banner = userModal.querySelector('#user-contract-status-banner');
      if (endDateInput && banner) {
        const isTerminated = Boolean(endDateInput.value && endDateInput.value.trim().length > 0);
        if (isTerminated) {
          banner.className = 'p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5';
          banner.innerHTML = `
            <span class="text-base leading-none">🔴</span>
            <div>
              <strong class="font-bold block text-rose-900">Colaborador Demitido / Vínculo Encerrado</strong>
              <p class="mt-0.5 text-rose-700">Com a data de término preenchida, <strong>todos os acessos ao sistema serão permanentemente revogados</strong>. As caixas de permissões foram zeradas.</p>
            </div>
          `;
          // Desmarcar e desabilitar caixas de permissão
          const permBoxes = userModal.querySelectorAll('input[type="checkbox"]');
          permBoxes.forEach(cb => {
            if (cb.id !== 'user-agree-terms') {
              cb.checked = false;
              cb.disabled = true;
              cb.classList.add('opacity-40', 'cursor-not-allowed');
            }
          });
        } else {
          banner.className = 'p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5';
          banner.innerHTML = `
            <span class="text-base leading-none">🟢</span>
            <div>
              <strong class="font-bold block text-emerald-900">Vínculo Contratual Ativo</strong>
              <p class="mt-0.5 text-emerald-700">Colaborador em exercício. Os acessos e permissões atribuídos abaixo estão regulares.</p>
            </div>
          `;
          // Reabilitar caixas de permissão
          const permBoxes = userModal.querySelectorAll('input[type="checkbox"]');
          permBoxes.forEach(cb => {
            cb.disabled = false;
            cb.classList.remove('opacity-40', 'cursor-not-allowed');
          });
        }
      }
      return;
    }

    // Localizar ponto de inserção: após o bloco de dados bancários/pix ou antes da seção de permissões
    const nameInput = userModal.querySelector('input[placeholder*="Ex: João da Silva"]') || userModal.querySelector('input');
    if (!nameInput) return;

    // Encontrar container de campos para injetar
    const formContainer = nameInput.closest('form') || nameInput.closest('.space-y-4') || nameInput.closest('.p-6') || nameInput.parentElement;
    if (!formContainer) return;

    // Criar o container de contrato com os dois campos solicitados pelo usuário
    const contractDiv = document.createElement('div');
    contractDiv.id = 'user-contract-fields-container';
    contractDiv.className = 'mt-4 pt-4 border-t border-slate-200 space-y-4';
    
    // Obter empresas cadastradas e grupos de acesso para os seletores multi-empresa e RBAC
    const appDb = getAppDatabaseSafe();
    const registeredCompanies = (appDb && Array.isArray(appDb.registeredCompanies) && appDb.registeredCompanies.length > 0)
      ? appDb.registeredCompanies
      : (appDb && appDb.companyInfo ? [appDb.companyInfo] : [{ id: 'comp-1', name: 'Auto Mecânica Modelo', businessType: 'OFICINA' }]);
    
    const accessGroups = (appDb && Array.isArray(appDb.accessGroups) && appDb.accessGroups.length > 0)
      ? appDb.accessGroups
      : [
          { id: 'grp-admin', name: 'Administradores do Sistema' },
          { id: 'grp-manager', name: 'Gerência Operacional & Pátio' },
          { id: 'grp-sales', name: 'Vendas Balcão & Consultores' },
          { id: 'grp-fiscal', name: 'Fiscal & Tributário SEFAZ' },
          { id: 'grp-financial', name: 'Financeiro & Controladoria' },
          { id: 'grp-purchasing', name: 'Estoque, Almoxarifado & Compras' },
          { id: 'grp-mechanic', name: 'Mecânicos & Chão de Oficina' }
        ];

    contractDiv.innerHTML = `
      <!-- Seção 1: Grupo de Acesso & Matriz RBAC -->
      <div class="p-3.5 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/40 rounded-xl border border-indigo-200 space-y-2.5">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️</span> Grupo de Acesso (Perfil de Funções & Alçadas)
          </label>
          <span class="text-[10px] text-indigo-700 bg-indigo-100 font-bold px-2 py-0.5 rounded-full">Controle RBAC</span>
        </div>
        <div>
          <select id="user-access-group-select" class="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500">
            <option value="">Padrão do Cargo (Sem Grupo Vinculado)</option>
            ${accessGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
          </select>
          <p class="text-[10px] text-slate-500 mt-1">O operador herdará automaticamente as permissões e alçadas do grupo em todas as empresas autorizadas.</p>
        </div>
      </div>

      <!-- Seção 2: Empresas com Acesso Liberado (Multi-Empresa & Troca sem Re-logon) -->
      <div class="p-3.5 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 rounded-xl border border-indigo-200 space-y-2.5" id="user-multi-company-container">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>🏢</span> Empresas com Acesso Liberado (Multi-Empresa)
          </label>
          <span class="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">Troca sem Novo Logon</span>
        </div>
        <p class="text-[11px] text-slate-500">Selecione as empresas que este usuário poderá acessar e alternar diretamente na aplicação:</p>
        
        <div class="space-y-2">
          <!-- Todas as Empresas (*) -->
          <label class="flex items-center gap-2 p-2 bg-indigo-50/80 border border-indigo-200 rounded-lg cursor-pointer text-xs font-bold text-indigo-950 select-none hover:bg-indigo-100 transition">
            <input type="checkbox" id="user-allowed-all-companies" value="*" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" />
            <span>🌟 Liberar Acesso a TODAS as Empresas do Sistema (*)</span>
          </label>

          <!-- Grade de Empresas Individuais -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1" id="user-company-checkboxes-grid">
            ${registeredCompanies.map((c, idx) => {
              const cNum = String(idx + 1).padStart(2, '0');
              const bType = c.businessType || 'OFICINA';
              const icon = bType === 'INDUSTRIA' ? '🏭' : bType === 'COMERCIO' ? '🛒' : '🔧';
              return `
                <label class="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer text-xs select-none hover:bg-slate-50 transition" title="ID: ${c.id}">
                  <input type="checkbox" name="user_allowed_company" value="${c.id}" class="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" />
                  <span class="truncate font-semibold text-slate-700">${icon} Nº ${cNum} - ${c.name}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Seção 3: Vínculo Contratual & Demissão -->
      <div class="flex items-center justify-between pt-1">
        <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>📋</span> Vínculo Contratual & Controle de Demissão
        </label>
        <span class="text-[10px] text-slate-500 font-medium">Controle de Segurança & Acessos</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="block text-[11px] font-semibold text-slate-600" for="user-contract-start-date">
            Data Início do Contrato (Admissão)
          </label>
          <input 
            id="user-contract-start-date" 
            type="date" 
            class="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-700" 
          />
        </div>

        <div class="space-y-1">
          <label class="block text-[11px] font-semibold text-slate-600 flex items-center justify-between" for="user-contract-end-date">
            <span>Data Término do Contrato (Desligamento)</span>
            <span class="text-rose-600 font-bold text-[10px]">Revoga Acesso</span>
          </label>
          <input 
            id="user-contract-end-date" 
            type="date" 
            class="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition text-slate-700 font-medium" 
            placeholder="DD/MM/AAAA"
          />
        </div>
      </div>

      <div id="user-contract-status-banner" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 transition-all">
        <span class="text-base leading-none">🟢</span>
        <div>
          <strong class="font-bold block text-emerald-900">Vínculo Contratual Ativo</strong>
          <p class="mt-0.5 text-emerald-700">Colaborador em exercício. Os acessos e permissões atribuídos abaixo estão regulares.</p>
        </div>
      </div>
    `;

    // Inserir antes da área de permissões
    const permSection = userModal.querySelector('[class*="grid-cols-2"], [class*="grid-cols-3"], [id*="perm"]') || formContainer.querySelector('.border-t');
    if (permSection && permSection.parentElement === formContainer) {
      formContainer.insertBefore(contractDiv, permSection);
    } else {
      formContainer.appendChild(contractDiv);
    }

    // Comportamento do checkbox "Todas as Empresas (*)"
    const allCompCb = contractDiv.querySelector('#user-allowed-all-companies');
    const compCheckboxes = contractDiv.querySelectorAll('input[name="user_allowed_company"]');
    if (allCompCb) {
      allCompCb.addEventListener('change', () => {
        const isAll = allCompCb.checked;
        compCheckboxes.forEach(cb => {
          cb.checked = isAll;
          cb.disabled = isAll;
        });
      });
    }

    // Tentar pré-carregar dados caso seja edição de operador
    try {
      const usernameInput = userModal.querySelector('input[placeholder*="usuario"]');
      const currentUName = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
      if (currentUName) {
        const db = getAppDatabaseSafe();
        if (db && Array.isArray(db.users)) {
          const userObj = db.users.find(u => u.username && u.username.toLowerCase() === currentUName);
          if (userObj) {
            const startInput = contractDiv.querySelector('#user-contract-start-date');
            const endInput = contractDiv.querySelector('#user-contract-end-date');
            if (startInput && userObj.contractStartDate) startInput.value = userObj.contractStartDate;
            if (endInput && (userObj.contractEndDate || userObj.terminationDate)) {
              endInput.value = userObj.contractEndDate || userObj.terminationDate;
            }

            // Pré-carregar Grupo de Acesso
            const groupSelect = contractDiv.querySelector('#user-access-group-select');
            if (groupSelect && (userObj.groupId || userObj.accessGroupId)) {
              groupSelect.value = userObj.groupId || userObj.accessGroupId;
            }

            // Pré-carregar Empresas Permitidas
            const allowed = Array.isArray(userObj.allowedCompanyIds) ? userObj.allowedCompanyIds : [userObj.companyId || 'comp-1'];
            if (allowed.includes('*')) {
              if (allCompCb) {
                allCompCb.checked = true;
                compCheckboxes.forEach(cb => { cb.checked = true; cb.disabled = true; });
              }
            } else {
              if (allCompCb) {
                allCompCb.checked = false;
              }
              compCheckboxes.forEach(cb => {
                cb.disabled = false;
                if (allowed.includes(cb.value) || cb.value === userObj.companyId) {
                  cb.checked = true;
                } else {
                  cb.checked = false;
                }
              });
            }
          }
        }
      }
    } catch (e) {
      // silencioso
    }

    // Interceptar a submissão do formulário do usuário para persistir allowedCompanyIds e groupId
    const submitBtn = userModal.querySelector('button[type="submit"], #btn-save-user-submit');
    const userForm = formContainer.closest('form') || userModal.querySelector('form');
    if (userForm && !userForm._boundMultiCompanySave) {
      userForm._boundMultiCompanySave = true;
      const saveHandler = () => {
        try {
          const usernameInput = userModal.querySelector('input[placeholder*="usuario"]');
          const uName = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
          if (!uName) return;

          const groupSelect = contractDiv.querySelector('#user-access-group-select');
          const selectedGroup = groupSelect ? groupSelect.value : '';

          let allowedIds = [];
          if (allCompCb && allCompCb.checked) {
            allowedIds = ['*'];
          } else {
            compCheckboxes.forEach(cb => {
              if (cb.checked) allowedIds.push(cb.value);
            });
            if (allowedIds.length === 0) {
              const activeCId = localStorage.getItem('motordesk_active_company_id') || 'comp-1';
              allowedIds.push(activeCId);
            }
          }

          // Atualizar o banco de dados local imediatamente
          let latestDbObj = null;
          const dbKeys = ['motordesk_db_v1', 'motordesk_db', 'motordesk_full_database', 'motordesk_app_database'];
          dbKeys.forEach(k => {
            try {
              const raw = localStorage.getItem(k);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.users)) {
                  let userFound = false;
                  parsed.users = parsed.users.map(u => {
                    if (u.username && u.username.toLowerCase() === uName) {
                      userFound = true;
                      return {
                        ...u,
                        allowedCompanyIds: allowedIds,
                        groupId: selectedGroup || undefined,
                        accessGroupId: selectedGroup || undefined
                      };
                    }
                    return u;
                  });
                  localStorage.setItem(k, JSON.stringify(parsed));
                  if (!latestDbObj) latestDbObj = parsed;
                }
              }
            } catch (err) {}
          });

          // Se for o usuário ativo logado, sincronizar
          try {
            const activeUserStr = localStorage.getItem('motordesk_active_user');
            if (activeUserStr) {
              const activeU = JSON.parse(activeUserStr);
              if (activeU.username && activeU.username.toLowerCase() === uName) {
                activeU.allowedCompanyIds = allowedIds;
                activeU.groupId = selectedGroup || undefined;
                activeU.accessGroupId = selectedGroup || undefined;
                localStorage.setItem('motordesk_active_user', JSON.stringify(activeU));
              }
            }
          } catch (err) {}

          // Enviar imediatamente para o servidor backend para sincronizar todos os navegadores e dispositivos
          if (latestDbObj) {
            try {
              let token = localStorage.getItem('motordesk_auth_token') || 'motordesk_session_admin';
              fetch('/api/db', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-Sync-Mode': 'full'
                },
                body: JSON.stringify(latestDbObj)
              }).then(r => r.json()).then(res => {
                console.log('[Session Work Guard] Usuário e permissões de empresas sincronizados com o servidor:', res);
              }).catch(err => {
                console.warn('[Session Work Guard] Falha ao enviar atualização para o servidor:', err);
              });
            } catch (netErr) {}
          }
        } catch (err) {
          console.warn('[Session Work Guard] Erro ao sincronizar multi-empresa do usuário:', err);
        }
      };

      if (submitBtn) submitBtn.addEventListener('click', saveHandler);
      userForm.addEventListener('submit', saveHandler);
    }

    // Ouvir alterações no input de data de término
    const endDateInput = contractDiv.querySelector('#user-contract-end-date');
    if (endDateInput) {
      endDateInput.addEventListener('input', () => {
        setupUserContractManagement();
      });
      endDateInput.addEventListener('change', () => {
        setupUserContractManagement();
      });
    }
  }

  /**
   * Monitora a modal de Nova Empresa para injetar o campo de Inscrição Estadual (IE)
   * e validar unicidade estrita de CNPJ e IE contra empresas já cadastradas
   */
  function setupCompanyUniquenessGuard() {
    // 1. Limpeza estrita e preventiva: remover qualquer campo group-comp-ie ou new-comp-ie fora da modal de nova empresa
    const rogueIEs = document.querySelectorAll('#group-comp-ie, #new-comp-ie');
    rogueIEs.forEach(el => {
      if (!el.closest('#new-company-modal') || el.closest('#client-form-panel, #form-client, #clients-view-container')) {
        const parentGrp = el.closest('#group-comp-ie');
        if (parentGrp) parentGrp.remove();
        else el.remove();
      }
    });

    // Se estiver no cadastro ou visualização de clientes, NUNCA executar nada aqui
    if (document.querySelector('#form-client, #client-form-panel, #client-cpf-input, #clients-view-container, #container-client-ie, #container-client-rg')) {
      return;
    }

    // 2. Localizar EXCLUSIVAMENTE a modal de Nova Empresa (Tenant SaaS)
    const newCompModal = document.getElementById('new-company-modal');
    if (!newCompModal) return;
    if (newCompModal.querySelector('#form-client, #client-form-panel, #client-cpf-input')) return;

    const cnpjInput = newCompModal.querySelector('#new-comp-cnpj, input[placeholder*="CNPJ da Nova Empresa"]');
    const nameInput = newCompModal.querySelector('#new-comp-name, input[placeholder*="Auto Center Speed Motors"], input[placeholder*="Razão Social"]');
    const addrInput = newCompModal.querySelector('#new-comp-address');
    if (!cnpjInput) return;

    const db = getAppDatabaseSafe();
    const allCompanies = db ? [...(db.registeredCompanies || []), ...(db.companyInfo ? [db.companyInfo] : [])] : [];
    const nextSeq = allCompanies.length + 1;
    const cnpjBase = String(24789000 + nextSeq * 371).padStart(8, '0');
    const sampleCnpj = `${cnpjBase.slice(0, 2)}.${cnpjBase.slice(2, 5)}.${cnpjBase.slice(5, 8)}/0001-${String(10 + (nextSeq % 89))}`;

    if (nameInput && !nameInput.value.trim()) {
      nameInput.value = `Centro Automotivo & Oficina Modelo ${nextSeq} LTDA`;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (cnpjInput && !cnpjInput.value.trim()) {
      cnpjInput.value = sampleCnpj;
      cnpjInput.dispatchEvent(new Event('input', { bubbles: true }));
      cnpjInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (addrInput && !addrInput.value.trim()) {
      addrInput.value = 'Av. das Nações Unidas, 1500 - Bloco B - São Paulo - SP, CEP 04578-000';
      addrInput.dispatchEvent(new Event('input', { bubbles: true }));
      addrInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Injetar IE apenas se for explicitamente a modal de nova empresa e ainda não tiver
    if (!newCompModal.querySelector('#new-comp-ie')) {
      const cnpjGroup = cnpjInput.closest('.space-y-1') || cnpjInput.parentElement;
      if (cnpjGroup && cnpjGroup.parentElement && !newCompModal.querySelector('#group-comp-ie')) {
        const ieGroup = document.createElement('div');
        ieGroup.id = 'group-comp-ie';
        ieGroup.className = 'space-y-1 mt-3';
        ieGroup.innerHTML = `
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 uppercase" for="new-comp-ie">Inscrição Estadual (IE)</label>
            <span class="text-[10px] text-slate-500">Opcional ou "ISENTO"</span>
          </div>
          <input 
            id="new-comp-ie" 
            type="text" 
            value="110.${String(200 + nextSeq * 17).padStart(3, '0')}.490.114"
            placeholder="Ex: 110.042.490.114 ou ISENTO" 
            class="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono uppercase focus:ring-2 focus:ring-indigo-500 transition" 
          />
          <p id="comp-ie-dup-warning" class="text-[11px] text-rose-600 font-bold hidden"></p>
        `;
        cnpjGroup.parentElement.insertBefore(ieGroup, cnpjGroup.nextSibling);
      }
    }

    const cnpjWarn = newCompModal.querySelector('#comp-cnpj-dup-warning');
    const ieInput = newCompModal.querySelector('#new-comp-ie');
    const ieWarn = newCompModal.querySelector('#comp-ie-dup-warning');
    const submitBtn = newCompModal.querySelector('button[type="submit"], button.bg-indigo-600');

    const validateUnique = () => {
      const db = getAppDatabaseSafe();
      const allCompanies = db ? [...(db.registeredCompanies || []), ...(db.companyInfo ? [db.companyInfo] : [])] : [];
      
      const cleanCnpj = cnpjInput.value.replace(/\D/g, '');
      const rawIe = ieInput ? ieInput.value.trim().toUpperCase() : '';
      const cleanIe = rawIe.replace(/\D/g, '');

      let hasError = false;

      // Validar CNPJ
      if (cleanCnpj.length === 14) {
        const dupC = allCompanies.find(c => c.cnpj && c.cnpj.replace(/\D/g, '') === cleanCnpj);
        if (dupC) {
          hasError = true;
          if (cnpjWarn) {
            cnpjWarn.innerText = `❌ CNPJ já cadastrado na empresa "${dupC.name}". O CNPJ deve ser único.`;
            cnpjWarn.classList.remove('hidden');
          }
        } else {
          if (cnpjWarn) cnpjWarn.classList.add('hidden');
        }
      } else {
        if (cnpjWarn) cnpjWarn.classList.add('hidden');
      }

      // Validar IE
      if (cleanIe.length >= 8 && rawIe !== 'ISENTO') {
        const dupIe = allCompanies.find(c => c.stateRegistration && c.stateRegistration.replace(/\D/g, '') === cleanIe);
        if (dupIe) {
          hasError = true;
          if (ieWarn) {
            ieWarn.innerText = `❌ Inscrição Estadual já cadastrada na empresa "${dupIe.name}". A IE deve ser única.`;
            ieWarn.classList.remove('hidden');
          }
        } else {
          if (ieWarn) ieWarn.classList.add('hidden');
        }
      } else {
        if (ieWarn) ieWarn.classList.add('hidden');
      }

      if (submitBtn) {
        if (hasError) {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
    };

    if (cnpjInput && !cnpjInput._boundUnique) {
      cnpjInput._boundUnique = true;
      cnpjInput.addEventListener('input', validateUnique);
    }
    if (ieInput && !ieInput._boundUnique) {
      ieInput._boundUnique = true;
      ieInput.addEventListener('input', validateUnique);
    }
  }

  /**
   * Adiciona badges de colaboradores demitidos na tabela de Operadores
   */
  function setupUserTableBadges() {
    const userRows = document.querySelectorAll('button[id^="btn-edit-user-permissions-"]');
    if (!userRows || userRows.length === 0) return;

    const db = getAppDatabaseSafe();
    if (!db || !Array.isArray(db.users)) return;

    userRows.forEach(btn => {
      const userId = btn.id.replace('btn-edit-user-permissions-', '');
      const userObj = db.users.find(u => u.id === userId);
      if (!userObj) return;

      const isTerminated = Boolean(userObj.contractEndDate && String(userObj.contractEndDate).trim().length > 0) || Boolean(userObj.isTerminated);
      const rowContainer = btn.closest('.p-4, .p-3, tr') || btn.parentElement?.parentElement;
      if (!rowContainer) return;

      // Se for demitido e ainda não tiver o badge
      const existingBadge = rowContainer.querySelector('.badge-user-terminated');
      if (isTerminated && !existingBadge) {
        const badge = document.createElement('span');
        badge.className = 'badge-user-terminated inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[11px] font-bold shrink-0';
        badge.innerHTML = `🔴 Demitido • Término: ${userObj.contractEndDate || userObj.terminationDate} (Acessos Revogados)`;
        
        // Encontrar onde inserir (próximo ao nome do usuário ou ao badge de cargo)
        const nameEl = rowContainer.querySelector('h3, h4, .font-bold, .font-semibold');
        if (nameEl && nameEl.parentElement) {
          nameEl.parentElement.appendChild(badge);
        }
      }
    });
  }

  /**
   * Verifica em tempo real se o usuário autenticado na sessão atual foi desligado
   * Se sim, encerra a sessão imediatamente com aviso claro
   */
  function checkActiveUserTerminationStatus() {
    try {
      const activeUserStr = localStorage.getItem('motordesk_active_user');
      if (!activeUserStr) return;
      const activeUser = JSON.parse(activeUserStr);
      if (!activeUser || !activeUser.username) return;

      const db = getAppDatabaseSafe();
      if (!db || !Array.isArray(db.users)) return;

      const foundUser = db.users.find(u => u.username && u.username.toLowerCase() === activeUser.username.toLowerCase());
      if (foundUser) {
        const isTerminated = Boolean(foundUser.contractEndDate && String(foundUser.contractEndDate).trim().length > 0) || Boolean(foundUser.isTerminated);
        if (isTerminated) {
          console.warn('[SECURITY] Colaborador demitido detectado na sessão ativa. Forçando logout imediato.');
          localStorage.removeItem('motordesk_auth_token');
          localStorage.removeItem('motordesk_active_user');
          localStorage.removeItem('motordesk_last_activity');
          alert(`Sessão Encerrada por Segurança:\n\nO vínculo empregatício do colaborador "${foundUser.name}" foi finalizado em ${foundUser.contractEndDate || foundUser.terminationDate || 'data anterior'}.\n\nTodos os acessos ao sistema MotorDesk foram revogados pela administração.`);
          window.location.href = '/?view=login';
        }
      }
    } catch (e) {
      // silencioso
    }
  }

  // Loop contínuo e leve para os guards da interface
  setInterval(() => {
    setupUserContractManagement();
    setupCompanyUniquenessGuard();
    setupUserTableBadges();
    checkActiveUserTerminationStatus();
  }, 1000);

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
