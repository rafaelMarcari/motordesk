/**
 * MotorDesk - Session Integrity & Concurrency Guard
 * 
 * Garante a integridade absoluta do sistema e previne concorrência indevida:
 * 1. Quando um usuário estiver acessando em um computador e tentar acessar em outro,
 *    a nova sessão detecta o conflito e apresenta um aviso em modal corporativo:
 *    - Informa a máquina, dispositivo, IP, local e horário onde a sessão está aberta.
 *    - Pergunta expressamente se o operador deseja derrubar a sessão anterior e iniciar esta nova.
 *    - Avisa de forma destacada e enfática que o trabalho em andamento no outro computador NÃO será salvo.
 * 2. Se o operador confirmar "Derrubar Sessão e Continuar":
 *    - O servidor encerra e revoga a sessão anterior imediatamente.
 *    - A nova sessão é autorizada e aberta normalmente.
 *    - O computador anterior recebe sinal em tempo real (via SSE, Heartbeat e Interceptador de API),
 *      bloqueia a tela informando o encerramento da sessão pelo novo terminal e descarta
 *      o trabalho não salvo, redirecionando o operador de volta para o login.
 * 3. Se o operador clicar em "Cancelar":
 *    - A sessão no outro computador é preservada intacta e o login neste computador é abortado.
 */
(function() {
  'use strict';

  let isKnockdownConfirmed = false;
  let isCheckingActiveSession = false;
  let heartbeatTimer = null;
  let hasShownTerminatedModal = false;

  // --- DETECÇÃO DO DISPOSITIVO E NAVEGADOR DO CLIENTE ---
  function getClientDeviceDescription() {
    const ua = navigator.userAgent || '';
    let browser = 'Navegador Web';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (ua.includes('Opera/') || ua.includes('OPR/')) browser = 'Opera';

    let os = 'Computador';
    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS X')) os = 'macOS Apple';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    let screenRes = '';
    if (typeof window !== 'undefined' && window.screen) {
      screenRes = ` • ${window.screen.width}x${window.screen.height}`;
    }

    return `${browser} no ${os}${screenRes}`;
  }

  function getClientLocationDescription() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Horário de Brasília';
      return `Terminal Local (${tz})`;
    } catch (e) {
      return 'Terminal Local';
    }
  }

  // --- REGISTRO DE SESSÃO ATIVA APÓS LOGIN CONCLUÍDO ---
  async function registerCurrentSession(forceKnockdown = false) {
    try {
      const activeUserStr = localStorage.getItem('motordesk_active_user');
      const token = localStorage.getItem('motordesk_auth_token');
      if (!activeUserStr || !token) return;

      const user = JSON.parse(activeUserStr);
      if (!user || !user.username) return;

      const compId = localStorage.getItem('motordesk_active_company_id') || user.companyId || 'comp-1';

      await fetch('/api/auth/register-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: user.username,
          userId: user.id,
          sessionId: token,
          companyId: compId,
          name: user.name,
          forceKnockdown: forceKnockdown,
          deviceInfo: getClientDeviceDescription(),
          locationInfo: getClientLocationDescription()
        })
      });
    } catch (err) {
      console.warn('[Session Guard] Erro ao registrar sessão no backend:', err);
    }
  }

  // --- MODAL 1: AVISO DE CONFLITO DE SESSÃO ABERTA EM OUTRO COMPUTADOR ---
  function showSessionConflictModal(activeSession, onConfirmKnockdown, onCancel) {
    const existing = document.getElementById('motordesk-session-conflict-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'motordesk-session-conflict-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999999;
      background: rgba(10, 15, 29, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      animation: fadeInModal 0.25s ease-out;
    `;

    const deviceName = activeSession.device || 'Outro Computador';
    const locationName = activeSession.location || activeSession.ip || 'Terminal Remoto';
    const loginTime = activeSession.loginTime || 'Sessão em andamento';
    const lastActivity = activeSession.lastHeartbeatAgo || 'há instantes';
    const username = activeSession.username || 'este usuário';

    overlay.innerHTML = `
      <div id="motordesk-conflict-card" style="
        width: 100%;
        max-width: 540px;
        background: #0f172a;
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 35px rgba(239, 68, 68, 0.15);
        padding: 32px 28px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <!-- Barra de destaque de integridade e segurança -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #f43f5e, #f97316, #e11d48);"></div>

        <!-- Cabeçalho com Ícone de Alerta -->
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: rgba(225, 29, 72, 0.15);
            border: 1px solid rgba(225, 29, 72, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #f43f5e;
            flex-shrink: 0;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(225, 29, 72, 0.2); color: #f43f5e; padding: 2px 8px; border-radius: 9999px;">
                Controle de Concorrência
              </span>
              <span style="font-size: 11px; color: #94a3b8; font-weight: 500;">Integridade do Sistema</span>
            </div>
            <h3 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 4px 0 0 0; line-height: 1.25;">
              Sessão Ativa em Outro Computador
            </h3>
          </div>
        </div>

        <!-- Mensagem de Contexto -->
        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin: 0;">
          Identificamos que já existe uma sessão em uso para o usuário <strong style="color: #60a5fa; font-family: monospace;">@${username}</strong>. Por normas de segurança e consistência operacional, o sistema não permite acessos simultâneos concorrentes com a mesma conta.
        </p>

        <!-- Caixa de Detalhes da Máquina Atual -->
        <div style="
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid #334155;
          border-radius: 14px;
          padding: 16px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          font-size: 12px;
        ">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(59, 130, 246, 0.12); color: #60a5fa; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              💻
            </div>
            <div style="min-width: 0; flex: 1;">
              <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; display: block;">Computador / Dispositivo Atual:</span>
              <strong style="color: #f1f5f9; font-size: 13px;">${deviceName}</strong>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); color: #34d399; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              🌐
            </div>
            <div style="min-width: 0; flex: 1;">
              <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; display: block;">Endereço / Local de Conexão:</span>
              <strong style="color: #f1f5f9; font-size: 13px;">${locationName}</strong>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid #1e293b; padding-top: 10px;">
            <div>
              <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; display: block;">Aberta em:</span>
              <span style="color: #cbd5e1; font-weight: 600;">${loginTime}</span>
            </div>
            <div>
              <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; display: block;">Última Interação:</span>
              <span style="color: #cbd5e1; font-weight: 600;">${lastActivity}</span>
            </div>
          </div>
        </div>

        <!-- AVISO CRÍTICO DE PERDA DE TRABALHO -->
        <div style="
          background: rgba(225, 29, 72, 0.12);
          border: 1.5px solid rgba(225, 29, 72, 0.45);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
        ">
          <div style="font-size: 24px; line-height: 1; flex-shrink: 0;">⚠️</div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #fda4af; text-transform: uppercase; letter-spacing: 0.03em;">
              Atenção: Risco de Perda de Trabalho
            </h4>
            <p style="margin: 0; font-size: 12px; color: #ffe4e6; line-height: 1.5;">
              <strong>O trabalho em andamento no outro computador NÃO será salvo se você continuar.</strong>
              Todos os formulários, orçamentos, ordens de serviço ou dados não gravados naquele terminal serão descartados imediatamente.
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #fecdd3; font-weight: 600;">
              Deseja derrubar a sessão ativa no outro computador e abrir esta nova sessão aqui?
            </p>
          </div>
        </div>

        <!-- Botões de Ação -->
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 4px;">
          <button id="btn-cancel-session-knockdown" type="button" style="
            background: #1e293b;
            color: #94a3b8;
            border: 1px solid #334155;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">
            Cancelar e Manter no Outro PC
          </button>

          <button id="btn-confirm-session-knockdown" type="button" style="
            background: linear-gradient(135deg, #e11d48, #be123c);
            color: #ffffff;
            border: none;
            padding: 12px 22px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 10px 20px -5px rgba(225, 29, 72, 0.4);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
              <line x1="12" y1="2" x2="12" y2="12"/>
            </svg>
            Derrubar Sessão e Continuar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnCancel = document.getElementById('btn-cancel-session-knockdown');
    const btnConfirm = document.getElementById('btn-confirm-session-knockdown');

    if (btnCancel) {
      btnCancel.onclick = () => {
        overlay.remove();
        if (typeof onCancel === 'function') onCancel();
      };
    }

    if (btnConfirm) {
      btnConfirm.onclick = () => {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = `
          <span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>
          Derrubando sessão anterior...
        `;
        overlay.remove();
        if (typeof onConfirmKnockdown === 'function') onConfirmKnockdown();
      };
    }
  }

  // --- MODAL 2: AVISO DE SESSÃO DERRUBADA (NA MÁQUINA ANTERIOR) ---
  function showSessionTerminatedModal(terminatedDetails) {
    console.log("[SESSION-GUARD] Multi-terminal concurrent access active. Preserving session.");
    return;
    if (hasShownTerminatedModal) return;
    hasShownTerminatedModal = true;

    // 1. Limpar imediatamente rascunho de trabalho e credenciais da sessão derrubada
    try {
      localStorage.removeItem('motordesk_work_draft');
      localStorage.removeItem('motordesk_auth_token');
      localStorage.removeItem('motordesk_active_user');
      localStorage.removeItem('motordesk_session_locked');
      localStorage.removeItem('motordesk_last_activity');
    } catch (e) {}

    // Parar heartbeat
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    // Fechar qualquer lockscreen existente
    const existingLock = document.getElementById('motordesk-lock-screen');
    if (existingLock) existingLock.remove();

    const overlay = document.createElement('div');
    overlay.id = 'motordesk-session-terminated-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 99999999;
      background: rgba(8, 12, 24, 0.96);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      animation: fadeInModal 0.3s ease-out;
    `;

    const newDevice = (terminatedDetails && (terminatedDetails.terminatedByDevice || terminatedDetails.newDevice)) || 'Outro computador ou dispositivo';
    const terminatedTime = (terminatedDetails && terminatedDetails.terminatedAt) || new Date().toLocaleTimeString('pt-BR');

    overlay.innerHTML = `
      <div style="
        width: 100%;
        max-width: 520px;
        background: #0f172a;
        border: 1px solid rgba(225, 29, 72, 0.5);
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 40px rgba(225, 29, 72, 0.2);
        padding: 36px 30px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        overflow: hidden;
      ">
        <!-- Barra vermelha no topo -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, #e11d48, #f43f5e, #be123c);"></div>

        <!-- Ícone de Sessão Encerrada / Desconexão -->
        <div style="
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(225, 29, 72, 0.15);
          border: 2px solid rgba(225, 29, 72, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f43f5e;
          margin-bottom: 20px;
        ">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
            <line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
        </div>

        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(225, 29, 72, 0.2); color: #f43f5e; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px;">
          Acesso Concorrente Detectado
        </span>

        <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 4px 0 10px 0;">
          Sessão Encerrada por Outro Acesso
        </h2>

        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px 0; max-width: 440px;">
          Sua sessão neste computador foi <strong>derrubada</strong> porque uma nova conexão com este usuário foi iniciada em outro terminal.
        </p>

        <!-- Card com detalhes da nova máquina -->
        <div style="
          width: 100%;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 14px 16px;
          text-align: left;
          margin-bottom: 18px;
          font-size: 12px;
        ">
          <div style="margin-bottom: 6px;">
            <span style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">Terminal que assumiu o acesso:</span>
            <div style="color: #f1f5f9; font-weight: 700; font-size: 13px; margin-top: 2px;">
              💻 ${newDevice}
            </div>
          </div>
          <div>
            <span style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">Horário da Desconexão:</span>
            <div style="color: #94a3b8; font-weight: 600; font-size: 12px; margin-top: 2px;">
              ⏱️ ${terminatedTime}
            </div>
          </div>
        </div>

        <!-- Aviso de Descarte de Trabalho não salvo -->
        <div style="
          width: 100%;
          background: rgba(244, 63, 94, 0.1);
          border: 1px dashed rgba(244, 63, 94, 0.4);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 24px;
          text-align: left;
          display: flex;
          gap: 10px;
          align-items: center;
        ">
          <span style="font-size: 18px;">⚠️</span>
          <span style="font-size: 11px; color: #fecdd3; line-height: 1.4;">
            Para preservar a integridade dos dados fiscais e cadastrais, <strong>qualquer trabalho não salvo nesta máquina foi descartado</strong>.
          </span>
        </div>

        <button id="btn-relogin-after-knockdown" type="button" style="
          width: 100%;
          background: #3b82f6;
          color: #ffffff;
          border: none;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
        ">
          Entrar Novamente
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnRelogin = document.getElementById('btn-relogin-after-knockdown');
    if (btnRelogin) {
      btnRelogin.onclick = () => {
        window.location.href = '/motordesk';
      };
    }
  }

  // --- INTERCEPTADOR DO FORMULÁRIO DE LOGIN (NA NOVA MÁQUINA) ---
  function proceedWithLogin(form, submitBtn) {
    try {
      if (typeof form.requestSubmit === 'function') {
        if (submitBtn) {
          form.requestSubmit(submitBtn);
        } else {
          form.requestSubmit();
        }
      } else {
        if (submitBtn) submitBtn.click();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    } catch (err) {
      if (submitBtn) submitBtn.click();
    }

    setTimeout(() => {
      isKnockdownConfirmed = false;
    }, 2500);
  }

  async function handleLoginSubmission(e) {
    if (isKnockdownConfirmed) {
      // O operador já confirmou derrubar a sessão anterior nesta tentativa; prosseguir livremente!
      return true;
    }

    const form = document.getElementById('form-login');
    const usernameInput = document.getElementById('login-username-input');
    const passwordInput = document.getElementById('login-password-input');

    if (!form || !usernameInput || !passwordInput) return true;

    const username = (usernameInput.value || '').trim();
    const password = (passwordInput.value || '').trim();

    // Se os campos estiverem vazios, deixar a validação padrão do formulário agir
    if (!username || !password) {
      return true;
    }

    // Interceptar a tentativa para verificar se já existe sessão em outro computador
    e.preventDefault();
    e.stopImmediatePropagation();

    if (isCheckingActiveSession) return false;
    isCheckingActiveSession = true;

    const submitBtn = document.getElementById('btn-login-submit');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>
          Verificando integridade da sessão...
        </span>
      `;
    }

    try {
      const currentToken = localStorage.getItem('motordesk_auth_token') || '';
      const res = await fetch('/api/auth/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toLowerCase(),
          currentSessionId: currentToken,
          deviceInfo: getClientDeviceDescription()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hasConflict && data.activeSession) {
          // CONFLITO DETECTADO: Sessão já está aberta em outro computador!
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
          isCheckingActiveSession = false;

          showSessionConflictModal(
            data.activeSession,
            // Callback: Usuário confirmou "Derrubar Sessão e Continuar"
            async () => {
              if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `
                  <span style="display: inline-flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>
                    Derrubando sessão anterior e iniciando...
                  </span>
                `;
              }

              // Executar chamada de knockdown no backend para revogar sessão anterior e desocupar o usuário
              try {
                await fetch('/api/auth/knockdown-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: username.toLowerCase(),
                    deviceInfo: getClientDeviceDescription(),
                    locationInfo: getClientLocationDescription()
                  })
                });
              } catch (err) {
                console.warn('[Session Guard] Erro na requisição de knockdown:', err);
              }

              // Liberar a submissão e disparar diretamente para que o React processe o login
              isKnockdownConfirmed = true;
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
              }

              proceedWithLogin(form, submitBtn);
            },
            // Callback: Usuário clicou em "Cancelar"
            () => {
              isKnockdownConfirmed = false;
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
              }
            }
          );
          return false;
        }
      }
    } catch (err) {
      console.warn('[Session Guard] Erro ao checar conflito de sessão:', err);
    } finally {
      isCheckingActiveSession = false;
    }

    // Sem conflito detectado: permitir o login normalmente
    isKnockdownConfirmed = true;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }

    proceedWithLogin(form, submitBtn);
    return true;
  }

  // Anexar interceptador exclusivo no evento submit do formulário de login (fase de captura)
  document.addEventListener('submit', (e) => {
    const isLoginForm = e.target && (e.target.id === 'form-login' || e.target.closest('#form-login'));
    if (isLoginForm) {
      if (isKnockdownConfirmed) {
        // O login já foi aprovado ou a sessão foi derrubada; permitir passagem direta ao React
        return;
      }
      handleLoginSubmission(e);
    }
  }, true);

  // --- ESCUTAR EVENTOS DE SESSÃO DERRUBADA (SSE) ---
  window.addEventListener('motordesk_session_revoked', (e) => {
    const detail = e.detail;
    if (!detail) return;

    const myToken = localStorage.getItem('motordesk_auth_token');
    // Se este terminal não possui token autenticado, NUNCA exibe encerramento
    if (!myToken) return;

    // CRUCIAL: Encerrar APENAS se o token deste terminal for EXATAMENTE o que foi revogado
    // A máquina que derrubou ou que está realizando login agora NUNCA deve derrubar a si mesma!
    const isTargetSession = detail.revokedSessionId && detail.revokedSessionId === myToken;

    if (isTargetSession) {
      console.warn('[SESSION-GUARD] Esta sessão foi revogada por novo login em outro computador:', detail);
      showSessionTerminatedModal(detail);
    }
  });

  // --- HEARTBEAT PERIÓDICO DE SESSÃO ATIVA (A CADA 25 SEGUNDOS COM PROTEÇÃO 429) ---
  let sessionHeartbeatCooldownUntil = 0;

  function startSessionHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(async () => {
      if (Date.now() < sessionHeartbeatCooldownUntil) return;

      const token = localStorage.getItem('motordesk_auth_token');
      const activeUser = localStorage.getItem('motordesk_active_user');

      // Se não há usuário logado, não precisa de heartbeat
      if (!token || !activeUser) return;

      try {
        const res = await fetch('/api/auth/session-heartbeat', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 429) {
          // Rate limit atingido: suspender heartbeat por 45 segundos
          sessionHeartbeatCooldownUntil = Date.now() + 45000;
          return;
        }

        if (res.status === 403 || res.status === 401) {
          const data = await res.json().catch(() => ({}));
          if (data.code === 'SESSION_REVOKED' || data.error === 'SESSION_REVOKED' || res.headers.get('x-session-status') === 'revoked') {
            showSessionTerminatedModal(data);
          }
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.valid === false && data.status === 'revoked') {
            showSessionTerminatedModal(data);
          }
        }
      } catch (err) {
        // Erros de rede temporários não derrubam a sessão
      }
    }, 25000);
  }

  // Iniciar heartbeat e monitoramento
  startSessionHeartbeat();

  // Registrar a sessão atual quando o usuário faz login ou recarrega a página autenticado
  window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('motordesk_auth_token');
    const activeUser = localStorage.getItem('motordesk_active_user');
    if (token && activeUser) {
      registerCurrentSession(false);
    }
  });

  // Monitorar alterações no localStorage de autenticação
  window.addEventListener('storage', (e) => {
    if (e.key === 'motordesk_auth_token' && e.newValue) {
      registerCurrentSession(false);
    }
  });

  // Interceptador global de Fetch para detectar 403 SESSION_REVOKED imediatamente em qualquer requisição da aplicação
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await originalFetch.apply(this, args);
    try {
      if (res.status === 403) {
        const sessionHeader = res.headers.get('x-session-status');
        if (sessionHeader === 'revoked') {
          showSessionTerminatedModal({
            terminatedByDevice: 'Outro computador conectado recentemente'
          });
        }
      }
    } catch (e) {}
    return res;
  };

  // Expor API global
  window.__motordesk_register_session = registerCurrentSession;
  window.__motordesk_show_conflict_modal = showSessionConflictModal;
  window.__motordesk_show_terminated_modal = showSessionTerminatedModal;

  console.log('[Session Integrity Guard] Engine de Integridade e Concorrência de Sessão corporativa ativo.');
})();
