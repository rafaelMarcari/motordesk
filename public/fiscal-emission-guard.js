/**
 * MotorDesk - Bloqueio de emissão fiscal sem provedor
 *
 * As telas fiscais apenas SIMULAVAM a emissão (chave de acesso e protocolo sorteados, mensagem
 * "Autorizada pela SEFAZ" sem nada ter sido enviado). Enquanto nenhum provedor fiscal real estiver
 * integrado, os botões que só emitem/transmitem notas mostram um aviso e não executam a simulação.
 * O servidor também recusa gravar notas autorizadas/canceladas sem provedor (defesa principal).
 * Botões que fazem outra coisa além de emitir (ex.: "Gerar Venda & Emissão Fiscal") continuam
 * funcionando: a venda é gravada e o servidor descarta apenas a nota simulada.
 */
(function () {
  'use strict';

  const EMISSION_PATTERNS = [
    /^emitir (nf-?e|nfc-?e|nfs-?e|nova nota fiscal)/,
    /^transmitir (para (a )?sefaz|nf-?e|nfc-?e|e validar)/,
    /^autorizar na sefaz/,
    /^confirmar e transmitir/,
  ];

  let providerReady = false;
  let lastCheck = 0;

  function refreshProviderStatus() {
    if (Date.now() - lastCheck < 60000) return;
    lastCheck = Date.now();
    fetch('/api/fiscal/config-status', { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) { providerReady = Boolean(data && data.configured); })
      .catch(function () {});
  }

  function normalize(text) {
    return String(text || '')
      .replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isEmissionButton(el) {
    const text = normalize(el.innerText || el.textContent);
    if (!text || text.length > 60) return false;
    return EMISSION_PATTERNS.some(function (re) { return re.test(text); });
  }

  function showBlockedNotice() {
    if (document.getElementById('md-fiscal-blocked')) return;
    const overlay = document.createElement('div');
    overlay.id = 'md-fiscal-blocked';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    overlay.innerHTML =
      '<div style="background:#fff;color:#0f172a;max-width:440px;width:100%;border-radius:12px;padding:20px 22px;box-shadow:0 20px 50px rgba(0,0,0,.3)">' +
      '<div style="font-size:16px;font-weight:700;margin-bottom:8px">Emissão fiscal indisponível nesta tela</div>' +
      '<p style="font-size:14px;line-height:1.5;color:#334155;margin:0 0 10px">Este botão gerava uma nota simulada, sem envio à SEFAZ e sem validade fiscal, por isso está bloqueado.</p>' +
      '<p style="font-size:13px;line-height:1.5;color:#64748b;margin:0 0 16px">A NF-e de produto (modelo 55) é emitida pela tela <b>Notas Fiscais (NF-e)</b> do menu lateral, direto na SEFAZ com o certificado da empresa.</p>' +
      '<div style="text-align:right">' + (typeof window.MotorDeskOpenFiscal === 'function' ? '<button type="button" data-open-fiscal style="background:#047857;color:#fff;border:0;border-radius:8px;padding:8px 16px;font-size:14px;font-weight:600;cursor:pointer;margin-right:8px">Abrir Notas Fiscais</button>' : '') + '<button type="button" data-close style="background:#4f46e5;color:#fff;border:0;border-radius:8px;padding:8px 16px;font-size:14px;font-weight:600;cursor:pointer">Entendi</button></div>' +
      '</div>';
    overlay.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-open-fiscal')) { overlay.remove(); window.MotorDeskOpenFiscal('emitir'); return; }
      if (e.target === overlay || e.target.hasAttribute('data-close')) overlay.remove();
    });
    (document.body || document.documentElement).appendChild(overlay);
    const btn = overlay.querySelector('[data-close]');
    if (btn) btn.focus();
  }

  document.addEventListener('click', function (e) {
    const el = e.target && e.target.closest ? e.target.closest('button, [role="button"]') : null;
    // A tela "Notas Fiscais (NF-e)" emite de verdade pelo servidor: não é bloqueada
    if (!el || el.closest('#md-fis') || !isEmissionButton(el)) return;
    refreshProviderStatus();
    if (providerReady) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showBlockedNotice();
  }, true);

  window.__mdFiscalProviderReady = function () { return providerReady; };
})();
