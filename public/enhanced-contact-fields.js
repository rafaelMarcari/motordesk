/**
 * MotorDesk — Enriquecimento Avançado de Cadastros (Contatos Comerciais & Pessoais)
 * 
 * Funcionalidades:
 * 1. Máscara de Entrada Dinâmica de Telefone/Celular de Alta Precisão (compatível com 'react-input-mask'):
 *    - Fixo: (00) 0000-0000
 *    - Celular: (00) 00000-0000 (com 9 dígitos)
 *    - Suporte a digitação contínua, backspace e colagem
 * 2. Visual Retrátil (Accordion / Card Colapsável) para melhorar a legibilidade:
 *    - Fica recolhido por padrão quando vazio, ocupando apenas uma linha elegante
 *    - Exibe badge com contagem de contatos preenchidos (ex: "✅ 2 contatos cadastrados")
 *    - Expande suavemente ao clicar para editar
 * 3. Indicadores Compactos nas Listagens / Tabelas de Clientes, Usuários e Fornecedores
 */

(function () {
  'use strict';

  // =========================================================================
  // MOTOR DE MÁSCARA DINÂMICA DE TELEFONE / CELULAR (ESTILO REACT-INPUT-MASK)
  // =========================================================================
  function formatPhoneDynamic(value) {
    if (!value) return '';
    var digits = String(value).replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) {
      return '(' + digits;
    }
    if (digits.length <= 6) {
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    }
    if (digits.length <= 10) {
      // Formato fixo: (00) 0000-0000
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
    }
    // Formato celular 9 dígitos: (00) 00000-0000
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
  }

  // Anexa comportamento de máscara inteligente a um elemento input
  function attachSmartPhoneMask(input) {
    if (!input || input.__hasMaskAttached) return;
    input.__hasMaskAttached = true;

    // Formatar valor inicial
    if (input.value) {
      input.value = formatPhoneDynamic(input.value);
    }

    input.addEventListener('input', function (e) {
      var start = input.selectionStart;
      var oldVal = input.value;
      var formatted = formatPhoneDynamic(oldVal);
      input.value = formatted;

      // Ajustar posição do cursor
      if (e.inputType === 'deleteContentBackward') {
        input.setSelectionRange(start, start);
      } else {
        var diff = formatted.length - oldVal.length;
        var newPos = Math.max(0, (start || 0) + (diff > 0 ? diff : 0));
        input.setSelectionRange(newPos, newPos);
      }
    });

    input.addEventListener('blur', function () {
      if (input.value) {
        input.value = formatPhoneDynamic(input.value);
      }
    });
  }

  // =========================================================================
  // PERSISTÊNCIA LOCAL E SINCRONIZAÇÃO EM NUVEM
  // =========================================================================
  function getCurrentDb() {
    try {
      var raw = localStorage.getItem('motordesk_db_v1') || localStorage.getItem('motordesk_db');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveAndSyncDb(db) {
    if (!db) return;
    try {
      var str = JSON.stringify(db);
      localStorage.setItem('motordesk_db_v1', str);
      localStorage.setItem('motordesk_db', str);
      localStorage.setItem('motordesk_app_store', str);

      fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Mode': 'full',
          'X-Company-Id': 'all'
        },
        body: str
      }).catch(function (err) {
        console.warn('[ContactMask] Sincronização em background:', err.message);
      });

      window.dispatchEvent(new CustomEvent('motordesk_db_updated', { detail: { data: db } }));
    } catch (e) {
      console.error('[ContactMask] Erro ao persistir contato:', e);
    }
  }

  // =========================================================================
  // CRIAÇÃO DO COMPONENTE ACCORDION / CARD COLAPSÁVEL DE CONTATOS
  // =========================================================================
  function createCollapsibleContactsSection(options) {
    var idPrefix = options.idPrefix;
    var title = options.title;
    var badgeLabel = options.badgeLabel;
    var badgeColor = options.badgeColor || 'indigo';
    var values = options.values || {};

    // Calcular quantos campos estão preenchidos
    var filledCount = 0;
    if (values.phoneCommercial) filledCount++;
    if (values.phonePersonal) filledCount++;
    if (values.cellphoneCommercial) filledCount++;
    if (values.cellphonePersonal) filledCount++;
    if (values.emailSecondary) filledCount++;

    var isInitiallyExpanded = filledCount > 0;

    var container = document.createElement('div');
    container.id = 'motordesk-enhanced-' + idPrefix + '-contacts';
    container.className = options.containerClass || 'col-span-1 md:col-span-2 my-2 border border-slate-200/90 rounded-xl bg-slate-50/70 overflow-hidden shadow-xs transition-all';

    var headerHtml = 
      '<button type="button" id="' + idPrefix + '-accordion-toggle" class="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 border-b border-slate-200 transition text-left cursor-pointer select-none">' +
        '<div class="flex items-center gap-2.5 min-w-0">' +
          '<div class="w-7 h-7 rounded-lg bg-' + badgeColor + '-50 border border-' + badgeColor + '-200 flex items-center justify-center text-sm">' +
            (options.icon || '📞') +
          '</div>' +
          '<div class="truncate">' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-xs font-bold text-slate-800">' + title + '</span>' +
              '<span id="' + idPrefix + '-count-badge" class="text-[10px] font-semibold px-2 py-0.5 rounded-full border ' + 
                (filledCount > 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200') + '">' +
                (filledCount > 0 ? '✅ ' + filledCount + ' preenchido(s)' : 'Opcional / Recolhido') +
              '</span>' +
            '</div>' +
            '<p class="text-[10px] text-slate-500 truncate">Telefones comerciais, pessoais, WhatsApp e e-mail secundário</p>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-2 flex-shrink-0 ml-3">' +
          '<span class="text-[11px] font-semibold text-indigo-600 hidden sm:inline" id="' + idPrefix + '-toggle-text">' +
            (isInitiallyExpanded ? 'Ocultar campos ▲' : 'Expandir campos ▼') +
          '</span>' +
          '<span id="' + idPrefix + '-chevron" class="text-xs text-slate-400 font-bold transition-transform ' + (isInitiallyExpanded ? 'rotate-180' : '') + '">▼</span>' +
        '</div>' +
      '</button>';

    var bodyHtml = 
      '<div id="' + idPrefix + '-accordion-body" class="' + (isInitiallyExpanded ? 'block' : 'hidden') + ' p-4 space-y-3 bg-slate-50/70 border-t border-slate-100">' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">' +
              '<span>Telefone Comercial</span>' +
              '<span class="text-[9px] text-slate-400 font-normal">Fixo / Ramal</span>' +
            '</label>' +
            '<input type="text" id="' + idPrefix + '-phone-commercial" placeholder="(00) 0000-0000" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono focus:ring-1 focus:ring-' + badgeColor + '-500 transition" />' +
          '</div>' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">' +
              '<span>Telefone Pessoal</span>' +
              '<span class="text-[9px] text-slate-400 font-normal">Residencial</span>' +
            '</label>' +
            '<input type="text" id="' + idPrefix + '-phone-personal" placeholder="(00) 0000-0000" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono focus:ring-1 focus:ring-' + badgeColor + '-500 transition" />' +
          '</div>' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">' +
              '<span>Celular Comercial</span>' +
              '<span class="text-[9px] text-emerald-600 font-bold">💬 WhatsApp</span>' +
            '</label>' +
            '<input type="text" id="' + idPrefix + '-cellphone-commercial" placeholder="(00) 00000-0000" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono focus:ring-1 focus:ring-' + badgeColor + '-500 transition" />' +
          '</div>' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">' +
              '<span>Celular Pessoal</span>' +
              '<span class="text-[9px] text-slate-400 font-normal">Emergência</span>' +
            '</label>' +
            '<input type="text" id="' + idPrefix + '-cellphone-personal" placeholder="(00) 00000-0000" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono focus:ring-1 focus:ring-' + badgeColor + '-500 transition" />' +
          '</div>' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">' +
              '<span>E-mail Principal</span>' +
              '<span class="text-[9px] text-slate-400 font-normal">Acesso / Notificações</span>' +
            '</label>' +
            '<input type="email" id="' + idPrefix + '-email-primary" placeholder="email@principal.com" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-' + badgeColor + '-500 transition" />' +
          '</div>' +
          '<div>' +
            '<label class="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">' +
              '<span>E-mail Secundário</span>' +
              '<span class="text-[9px] text-purple-600 font-semibold">📑 NFe / Cobrança</span>' +
            '</label>' +
            '<input type="email" id="' + idPrefix + '-email-secondary" placeholder="nfe@secundario.com" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-' + badgeColor + '-500 transition" />' +
          '</div>' +
        '</div>' +
      '</div>';

    container.innerHTML = headerHtml + bodyHtml;

    // Toggle behavior
    var toggleBtn = container.querySelector('#' + idPrefix + '-accordion-toggle');
    var bodyEl = container.querySelector('#' + idPrefix + '-accordion-body');
    var chevron = container.querySelector('#' + idPrefix + '-chevron');
    var toggleText = container.querySelector('#' + idPrefix + '-toggle-text');

    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var isHidden = bodyEl.classList.contains('hidden');
      if (isHidden) {
        bodyEl.classList.remove('hidden');
        bodyEl.classList.add('block');
        chevron.classList.add('rotate-180');
        if (toggleText) toggleText.textContent = 'Ocultar campos ▲';
      } else {
        bodyEl.classList.remove('block');
        bodyEl.classList.add('hidden');
        chevron.classList.remove('rotate-180');
        if (toggleText) toggleText.textContent = 'Expandir campos ▼';
      }
    });

    return container;
  }

  // =========================================================================
  // 1. FORMULÁRIO DE CLIENTES
  // =========================================================================
  function enhanceClientsModal() {
    var formClient = document.getElementById('form-client');
    var clientPanel = document.getElementById('client-form-panel');

    if (!formClient || !clientPanel) {
      var rogue = document.querySelectorAll('#motordesk-enhanced-client-contacts');
      rogue.forEach(function (el) { el.remove(); });
      return;
    }

    if (formClient.querySelector('#motordesk-enhanced-client-contacts')) return;

    var outsideEl = document.querySelectorAll('#motordesk-enhanced-client-contacts');
    outsideEl.forEach(function (el) {
      if (!formClient.contains(el)) el.remove();
    });

    var nameInput = formClient.querySelector('#client-name-input');
    var cpfInput = formClient.querySelector('#client-cpf-input');
    var nativeEmail = formClient.querySelector('#client-email-input') || formClient.querySelector('input[type="email"]');
    var nativePhone = formClient.querySelector('#client-phone-input') || formClient.querySelector('input[placeholder*="(11) 98888-7777"]');

    var db = getCurrentDb();
    var currentClient = null;
    var docVal = cpfInput ? cpfInput.value.replace(/\D/g, '') : '';
    var nVal = nameInput ? nameInput.value.trim().toLowerCase() : '';

    if (db && Array.isArray(db.clients)) {
      currentClient = db.clients.find(function (c) {
        var cDoc = String(c.cpf || c.cpfCnpj || '').replace(/\D/g, '');
        return (docVal && cDoc === docVal) || (nVal && c.name && c.name.toLowerCase() === nVal);
      });
    }

    var values = {
      phoneCommercial: currentClient ? (currentClient.phoneCommercial || currentClient.phone || '') : '',
      phonePersonal: currentClient ? (currentClient.phonePersonal || '') : '',
      cellphoneCommercial: currentClient ? (currentClient.cellphoneCommercial || currentClient.cellphone || currentClient.whatsapp || '') : (nativePhone ? nativePhone.value : ''),
      cellphonePersonal: currentClient ? (currentClient.cellphonePersonal || '') : '',
      emailSecondary: currentClient ? (currentClient.emailSecondary || '') : ''
    };

    var section = createCollapsibleContactsSection({
      idPrefix: 'client',
      title: 'Telefones & E-mails Adicionais do Cliente',
      badgeLabel: 'Comercial & Pessoal',
      badgeColor: 'indigo',
      icon: '📞',
      containerClass: 'col-span-1 md:col-span-2 my-2 border border-slate-200/90 rounded-xl bg-slate-50/70 overflow-hidden shadow-xs transition-all',
      values: values
    });

    var actionButtons = formClient.querySelector('.flex.justify-end, button[type="submit"]')?.closest('.col-span-1, .col-span-2, .flex');
    if (actionButtons) {
      actionButtons.parentNode.insertBefore(section, actionButtons);
    } else {
      formClient.appendChild(section);
    }

    var inPhoneComm = section.querySelector('#client-phone-commercial');
    var inPhonePers = section.querySelector('#client-phone-personal');
    var inCellComm = section.querySelector('#client-cellphone-commercial');
    var inCellPers = section.querySelector('#client-cellphone-personal');
    var inEmailPrim = section.querySelector('#client-email-primary');
    var inEmailSec = section.querySelector('#client-email-secondary');

    // Preencher valores formatados
    if (values.phoneCommercial) inPhoneComm.value = formatPhoneDynamic(values.phoneCommercial);
    if (values.phonePersonal) inPhonePers.value = formatPhoneDynamic(values.phonePersonal);
    if (values.cellphoneCommercial) inCellComm.value = formatPhoneDynamic(values.cellphoneCommercial);
    if (values.cellphonePersonal) inCellPers.value = formatPhoneDynamic(values.cellphonePersonal);
    if (currentClient && currentClient.email) inEmailPrim.value = currentClient.email;
    else if (nativeEmail && nativeEmail.value) inEmailPrim.value = nativeEmail.value;
    if (values.emailSecondary) inEmailSec.value = values.emailSecondary;

    // Anexar máscaras inteligentes com suporte a cursor dinâmico
    [inPhoneComm, inPhonePers, inCellComm, inCellPers].forEach(attachSmartPhoneMask);
    if (nativePhone) attachSmartPhoneMask(nativePhone);

    // Sincronizar campo nativo com o novo
    inEmailPrim.addEventListener('input', function () {
      if (nativeEmail && nativeEmail !== inEmailPrim) {
        nativeEmail.value = inEmailPrim.value;
        nativeEmail.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    inCellComm.addEventListener('input', function () {
      if (nativePhone && nativePhone !== inCellComm) {
        nativePhone.value = inCellComm.value;
        nativePhone.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    var saveBtn = formClient.querySelector('button[type="submit"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        setTimeout(function () {
          var updatedDb = getCurrentDb();
          if (!updatedDb || !Array.isArray(updatedDb.clients)) return;
          var curDoc = cpfInput ? cpfInput.value.replace(/\D/g, '') : '';
          var curName = nameInput ? nameInput.value.trim().toLowerCase() : '';

          var target = updatedDb.clients.find(function (c) {
            var cDoc = String(c.cpf || c.cpfCnpj || '').replace(/\D/g, '');
            return (curDoc && cDoc === curDoc) || (curName && c.name && c.name.toLowerCase() === curName);
          });

          if (target) {
            target.phoneCommercial = inPhoneComm.value.trim();
            target.phonePersonal = inPhonePers.value.trim();
            target.cellphoneCommercial = inCellComm.value.trim();
            target.cellphonePersonal = inCellPers.value.trim();
            target.email = inEmailPrim.value.trim() || target.email;
            target.emailSecondary = inEmailSec.value.trim();
            saveAndSyncDb(updatedDb);
          }
        }, 150);
      });
    }
  }

  // =========================================================================
  // 2. FORMULÁRIO DE FUNCIONÁRIOS / OPERADORES (USUÁRIOS)
  // =========================================================================
  function enhanceUsersModal() {
    var userForm = document.getElementById('form-user');

    if (!userForm) {
      var rogue = document.querySelectorAll('#motordesk-enhanced-user-contacts');
      rogue.forEach(function (el) { el.remove(); });
      return;
    }

    if (userForm.querySelector('#motordesk-enhanced-user-contacts')) return;

    var outsideEl = document.querySelectorAll('#motordesk-enhanced-user-contacts');
    outsideEl.forEach(function (el) {
      if (!userForm.contains(el)) el.remove();
    });

    var usernameInput = userForm.querySelector('#user-username-input');
    var db = getCurrentDb();
    var currentUser = null;

    if (db && Array.isArray(db.users) && usernameInput && usernameInput.value) {
      var uVal = usernameInput.value.trim().toLowerCase();
      currentUser = db.users.find(function (u) {
        return u.username && u.username.toLowerCase() === uVal;
      });
    }

    var values = {
      phoneCommercial: currentUser ? (currentUser.phoneCommercial || currentUser.phone || '') : '',
      phonePersonal: currentUser ? (currentUser.phonePersonal || '') : '',
      cellphoneCommercial: currentUser ? (currentUser.cellphoneCommercial || currentUser.cellphone || '') : '',
      cellphonePersonal: currentUser ? (currentUser.cellphonePersonal || '') : '',
      emailSecondary: currentUser ? (currentUser.emailSecondary || '') : ''
    };

    var section = createCollapsibleContactsSection({
      idPrefix: 'user',
      title: 'Contatos do Funcionário',
      badgeLabel: 'Comercial & Pessoal',
      badgeColor: 'emerald',
      icon: '📱',
      containerClass: 'my-3 border border-slate-200/90 rounded-xl bg-slate-50/70 overflow-hidden shadow-xs transition-all',
      values: values
    });

    var firstCol = userForm.querySelector('.lg\\:col-span-1') || userForm.children[0];
    if (firstCol) {
      firstCol.appendChild(section);
    } else {
      userForm.appendChild(section);
    }

    var inPhoneComm = section.querySelector('#user-phone-commercial');
    var inPhonePers = section.querySelector('#user-phone-personal');
    var inCellComm = section.querySelector('#user-cellphone-commercial');
    var inCellPers = section.querySelector('#user-cellphone-personal');
    var inEmailPrim = section.querySelector('#user-email-primary');
    var inEmailSec = section.querySelector('#user-email-secondary');

    if (values.phoneCommercial) inPhoneComm.value = formatPhoneDynamic(values.phoneCommercial);
    if (values.phonePersonal) inPhonePers.value = formatPhoneDynamic(values.phonePersonal);
    if (values.cellphoneCommercial) inCellComm.value = formatPhoneDynamic(values.cellphoneCommercial);
    if (values.cellphonePersonal) inCellPers.value = formatPhoneDynamic(values.cellphonePersonal);
    if (currentUser && currentUser.email) inEmailPrim.value = currentUser.email;
    if (values.emailSecondary) inEmailSec.value = values.emailSecondary;

    [inPhoneComm, inPhonePers, inCellComm, inCellPers].forEach(attachSmartPhoneMask);

    var submitBtn = userForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        setTimeout(function () {
          var updatedDb = getCurrentDb();
          if (!updatedDb || !Array.isArray(updatedDb.users)) return;
          var uVal = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
          var targetUser = updatedDb.users.find(function (u) {
            return u.username && u.username.toLowerCase() === uVal;
          });

          if (targetUser) {
            targetUser.phoneCommercial = inPhoneComm.value.trim();
            targetUser.phonePersonal = inPhonePers.value.trim();
            targetUser.cellphoneCommercial = inCellComm.value.trim();
            targetUser.cellphonePersonal = inCellPers.value.trim();
            targetUser.email = inEmailPrim.value.trim();
            targetUser.emailSecondary = inEmailSec.value.trim();
            saveAndSyncDb(updatedDb);
          }
        }, 150);
      });
    }
  }

  // =========================================================================
  // 3. FORMULÁRIO DE FORNECEDORES
  // =========================================================================
  function enhanceSuppliersModal() {
    var supNameInput = document.querySelector('input[placeholder*="AutoPeças Brasil Ltda"]');
    var modalBackdrop = supNameInput ? supNameInput.closest('.fixed.inset-0') : null;

    if (!modalBackdrop || !supNameInput) {
      var rogue = document.querySelectorAll('#motordesk-enhanced-supplier-contacts');
      rogue.forEach(function (el) { el.remove(); });
      return;
    }

    var modalForm = modalBackdrop.querySelector('form');
    if (!modalForm) return;

    if (modalForm.querySelector('#motordesk-enhanced-supplier-contacts')) return;

    var outsideEl = document.querySelectorAll('#motordesk-enhanced-supplier-contacts');
    outsideEl.forEach(function (el) {
      if (!modalForm.contains(el)) el.remove();
    });

    var cnpjCpfInput = modalForm.querySelector('input[placeholder*="00.000.000/0000-00"], input[placeholder*="CNPJ"], input[placeholder*="CPF"]');
    var nativeEmail = modalForm.querySelector('input[placeholder*="vendas@fornecedor.com"], input[type="email"]');
    var nativePhone = modalForm.querySelector('input[placeholder*="(11) 3333-4444"]');

    var db = getCurrentDb();
    var currentSupplier = null;

    if (db && Array.isArray(db.suppliers)) {
      var docClean = cnpjCpfInput ? cnpjCpfInput.value.replace(/\D/g, '') : '';
      var nameClean = supNameInput.value.trim().toLowerCase();
      currentSupplier = db.suppliers.find(function (s) {
        var sDoc = String(s.cnpjCpf || s.cnpj || '').replace(/\D/g, '');
        return (docClean && sDoc === docClean) || (nameClean && s.name && s.name.toLowerCase() === nameClean);
      });
    }

    var values = {
      phoneCommercial: currentSupplier ? (currentSupplier.phoneCommercial || currentSupplier.phone || '') : (nativePhone ? nativePhone.value : ''),
      phonePersonal: currentSupplier ? (currentSupplier.phonePersonal || '') : '',
      cellphoneCommercial: currentSupplier ? (currentSupplier.cellphoneCommercial || currentSupplier.cellphone || '') : '',
      cellphonePersonal: currentSupplier ? (currentSupplier.cellphonePersonal || '') : '',
      emailSecondary: currentSupplier ? (currentSupplier.emailSecondary || '') : ''
    };

    var section = createCollapsibleContactsSection({
      idPrefix: 'sup',
      title: 'Contatos do Fornecedor',
      badgeLabel: 'Comercial & Pessoal',
      badgeColor: 'amber',
      icon: '🏢',
      containerClass: 'col-span-full my-2 border border-slate-200/90 rounded-xl bg-slate-50/70 overflow-hidden shadow-xs transition-all',
      values: values
    });

    var actionRow = modalForm.querySelector('.flex.justify-end, button[type="submit"]')?.closest('.flex') || modalForm.querySelector('.flex.justify-end');
    if (actionRow) {
      actionRow.parentNode.insertBefore(section, actionRow);
    } else {
      modalForm.appendChild(section);
    }

    var inPhoneComm = section.querySelector('#sup-phone-commercial');
    var inPhonePers = section.querySelector('#sup-phone-personal');
    var inCellComm = section.querySelector('#sup-cellphone-commercial');
    var inCellPers = section.querySelector('#sup-cellphone-personal');
    var inEmailPrim = section.querySelector('#sup-email-primary');
    var inEmailSec = section.querySelector('#sup-email-secondary');

    if (values.phoneCommercial) inPhoneComm.value = formatPhoneDynamic(values.phoneCommercial);
    if (values.phonePersonal) inPhonePers.value = formatPhoneDynamic(values.phonePersonal);
    if (values.cellphoneCommercial) inCellComm.value = formatPhoneDynamic(values.cellphoneCommercial);
    if (values.cellphonePersonal) inCellPers.value = formatPhoneDynamic(values.cellphonePersonal);
    if (currentSupplier && currentSupplier.email) inEmailPrim.value = currentSupplier.email;
    else if (nativeEmail && nativeEmail.value) inEmailPrim.value = nativeEmail.value;
    if (values.emailSecondary) inEmailSec.value = values.emailSecondary;

    [inPhoneComm, inPhonePers, inCellComm, inCellPers].forEach(attachSmartPhoneMask);
    if (nativePhone) attachSmartPhoneMask(nativePhone);

    inEmailPrim.addEventListener('input', function () {
      if (nativeEmail && nativeEmail !== inEmailPrim) {
        nativeEmail.value = inEmailPrim.value;
        nativeEmail.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    inPhoneComm.addEventListener('input', function () {
      if (nativePhone && nativePhone !== inPhoneComm) {
        nativePhone.value = inPhoneComm.value;
        nativePhone.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    var saveBtn = modalForm.querySelector('button[type="submit"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        setTimeout(function () {
          var updatedDb = getCurrentDb();
          if (!updatedDb || !Array.isArray(updatedDb.suppliers)) return;
          var curDoc = cnpjCpfInput ? cnpjCpfInput.value.replace(/\D/g, '') : '';
          var curName = supNameInput ? supNameInput.value.trim().toLowerCase() : '';

          var targetSup = updatedDb.suppliers.find(function (s) {
            var sDoc = String(s.cnpjCpf || s.cnpj || '').replace(/\D/g, '');
            return (curDoc && sDoc === curDoc) || (curName && s.name && s.name.toLowerCase() === curName);
          });

          if (targetSup) {
            targetSup.phoneCommercial = inPhoneComm.value.trim();
            targetSup.phonePersonal = inPhonePers.value.trim();
            targetSup.cellphoneCommercial = inCellComm.value.trim();
            targetSup.cellphonePersonal = inCellPers.value.trim();
            targetSup.email = inEmailPrim.value.trim() || targetSup.email;
            targetSup.emailSecondary = inEmailSec.value.trim();
            saveAndSyncDb(updatedDb);
          }
        }, 150);
      });
    }
  }

  // =========================================================================
  // 4. MÁSCARA AUTOMÁTICA EM QUALQUER CAMPO DE TELEFONE / CELULAR DA TELA
  // =========================================================================
  function applyMaskToAllPhoneInputs() {
    var allPhoneInputs = document.querySelectorAll(
      'input[placeholder*="(11) 98888-7777"], input[placeholder*="(11) 3333-4444"], input[placeholder*="(00)"], input[id*="phone"], input[id*="cellphone"], input[name*="phone"], input[name*="celular"], input[name*="telefone"]'
    );
    allPhoneInputs.forEach(function (inp) {
      attachSmartPhoneMask(inp);
    });
  }

  // =========================================================================
  // OBSERVER GLOBAL
  // =========================================================================
  var observer = new MutationObserver(function () {
    try {
      enhanceClientsModal();
      enhanceUsersModal();
      enhanceSuppliersModal();
      applyMaskToAllPhoneInputs();
    } catch (e) {
      console.warn('[ContactMask] Erro no observer:', e);
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  try {
    enhanceClientsModal();
    enhanceUsersModal();
    enhanceSuppliersModal();
    applyMaskToAllPhoneInputs();
  } catch (e) {}

  console.log('[MotorDesk] Máscara Dinâmica de Telefone/Celular e Accordions de Contatos carregados com sucesso!');
})();
