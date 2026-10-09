/**
 * MotorDesk - Cartão da empresa no topo do menu lateral (todos os segmentos)
 *
 * Mostra a empresa em que a pessoa está trabalhando (nome, número do cadastro, CNPJ e situação), em tons
 * suaves para não cansar a vista, e o atalho "Backup da base de dados" para quem tem essa liberação.
 * O atalho usa o próprio botão de Backup do menu (#btn-sidebar-backup), que só existe para quem pode
 * fazer backup; enquanto o atalho está no cartão, aquele item fica oculto para não aparecer duas vezes.
 * Com o menu recolhido, o cartão vira só as iniciais da empresa.
 * Dados: GET /api/empresa-ativa. Ficam também em window.__mdEmpresaAtiva (evento "md-empresa-ativa") para o
 * cabeçalho (logo) e a exportação (nome, CNPJ e logo nos arquivos); window.__mdEmpresaAtivaRecarregar() busca de novo.
 */
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const user = () => { try { return JSON.parse(localStorage.getItem('motordesk_active_user') || 'null'); } catch (e) { return null; } };
  const companyId = () => { try { const u = user() || {}; return localStorage.getItem('motordesk_active_company_id') || u.companyId || ''; } catch (e) { return ''; } };
  const iniciais = (nome) => String(nome || '').replace(/\b(ltda|s\/?a|me|epp|eireli)\b\.?/gi, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '·';
  const COM_BACKUP = 'md-cartao-com-backup';
  const ICON_BACKUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>';

  let dados = null;        // { id, nome, razaoSocial, cnpj, ativa }
  let dadosDe = '';        // empresa a que os dados se referem
  let buscando = false;
  let novaTentativa = 0;
  let buscadoEm = 0;       // a cada 3 minutos busca de novo (logo ou nome alterados em outra máquina)

  function estilos() {
    if (document.getElementById('md-empresa-cartao-style')) return;
    const s = document.createElement('style');
    s.id = 'md-empresa-cartao-style';
    s.textContent = [
      '#md-empresa-cartao{margin:2px 2px 10px;padding:10px 11px;border-radius:10px;background:rgba(148,163,184,.06);border:1px solid rgba(148,163,184,.14);color:#cbd5e1;font-family:inherit;text-transform:none;letter-spacing:normal}',
      '#md-empresa-cartao .topo{display:flex;align-items:center;gap:10px;min-width:0}',
      '#md-empresa-cartao .ini{width:30px;height:30px;border-radius:8px;background:#1e293b;color:#cbd5e1;font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}',
      '#md-empresa-cartao .ini i{position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border-radius:50%;background:#34d399;border:2px solid #0f172a}',
      '#md-empresa-cartao .ini i.off{background:#f87171}',
      '#md-empresa-cartao .txt{min-width:0;flex:1}',
      '#md-empresa-cartao .nome{font-size:12.5px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}',
      '#md-empresa-cartao .meta{font-size:10.5px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;font-variant-numeric:tabular-nums}',
      // o menu deixa os botões em maiúsculas e com letra grande; o atalho do cartão fica discreto
      '#md-empresa-cartao .bk{margin-top:9px;width:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:5px 8px !important;border-radius:7px;border:1px solid rgba(148,163,184,.2);background:transparent;color:#cbd5e1;font-family:inherit;font-size:11.5px !important;line-height:1.4 !important;font-weight:500 !important;text-transform:none !important;letter-spacing:normal !important;white-space:nowrap;min-height:0 !important;cursor:pointer;transition:background .15s,color .15s}',
      '#md-empresa-cartao .bk:hover{background:rgba(148,163,184,.12);color:#fff}#md-empresa-cartao .bk:focus-visible{outline:2px solid #818cf8;outline-offset:1px}',
      '#md-empresa-cartao .bk svg{width:14px;height:14px;color:#94a3b8}',
      '#md-empresa-cartao.mini{padding:6px 0;background:none;border-color:transparent;display:flex;justify-content:center}',
      'body.' + COM_BACKUP + ' #btn-sidebar-backup{display:none !important}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function buscar(cid) {
    if (buscando || Date.now() < novaTentativa) return;
    buscando = true;
    fetch('/api/empresa-ativa', { headers: { 'X-Company-Id': cid } })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok || !d || !d.success) throw new Error('sem dados');
        if (companyId() === cid) {
          dados = d; dadosDe = cid; buscadoEm = Date.now();
          window.__mdEmpresaAtiva = d;
          window.dispatchEvent(new CustomEvent('md-empresa-ativa', { detail: d }));
        }
      })
      .catch(() => { novaTentativa = Date.now() + 5000; })
      .finally(() => { buscando = false; });
  }

  function remover() {
    const c = document.getElementById('md-empresa-cartao');
    if (c) c.remove();
    if (document.body) document.body.classList.remove(COM_BACKUP);
  }

  function ciclo() {
    const nav = document.querySelector('#sidebar-container nav');
    const cid = companyId();
    if (!nav || !user() || !cid) { remover(); return; }
    // ao buscar de novo a mesma empresa (ex.: logo trocado), mantém o que está na tela até chegar a resposta
    if (dadosDe === cid && Date.now() - buscadoEm > 180000) dadosDe = '';
    if (dadosDe !== cid) { if (!dados || dados.id !== cid) dados = null; buscar(cid); }
    estilos();
    const sb = document.getElementById('sidebar-container');
    const recolhido = sb && sb.offsetWidth < 100;
    const backup = document.getElementById('btn-sidebar-backup');
    const comBackup = Boolean(backup) && !recolhido;

    const nome = (dados && dados.nome) || 'Empresa';
    const ativa = !dados || dados.ativa !== false;
    const numero = 'Nº ' + ((dados && dados.id) || cid);
    const cnpj = dados && dados.cnpj ? 'CNPJ ' + dados.cnpj : '';
    const titulo = [(dados && dados.razaoSocial) || nome, numero, cnpj, ativa ? 'ativa' : 'inativa'].filter(Boolean).join(' — ');
    const html = recolhido
      ? '<div class="ini" title="' + esc(titulo) + '">' + esc(iniciais(nome)) + '<i class="' + (ativa ? '' : 'off') + '"></i></div>'
      : '<div class="topo"><div class="ini" aria-hidden="true">' + esc(iniciais(nome)) + '<i class="' + (ativa ? '' : 'off') + '"></i></div>' +
        '<div class="txt"><div class="nome" title="' + esc(titulo) + '">' + esc(nome) + '</div><div class="meta">' + esc(numero) + (ativa ? ' · ativa' : ' · inativa') + '</div>' + (cnpj ? '<div class="meta">' + esc(cnpj) + '</div>' : '') + '</div></div>' +
        (comBackup ? '<button type="button" class="bk" id="md-empresa-cartao-backup" title="Backup e restauração da base de dados">' + ICON_BACKUP + 'Backup da base de dados</button>' : '');

    let card = document.getElementById('md-empresa-cartao');
    if (!card) {
      card = document.createElement('div');
      card.id = 'md-empresa-cartao';
      card.setAttribute('role', 'group');
      card.setAttribute('aria-label', 'Empresa em uso');
      card.addEventListener('click', (e) => {
        if (!e.target.closest('#md-empresa-cartao-backup')) return;
        const b = document.getElementById('btn-sidebar-backup');
        if (b) b.click();
      });
    }
    if (card._html !== html) { card._html = html; card.innerHTML = html; }
    card.classList.toggle('mini', Boolean(recolhido));
    if (nav.firstElementChild !== card) nav.prepend(card);
    document.body.classList.toggle(COM_BACKUP, comBackup);
  }

  // Troca de empresa: busca os dados de novo
  window.addEventListener('motordesk_company_switched', () => { dadosDe = ''; novaTentativa = 0; window.__mdEmpresaAtiva = null; });
  window.__mdEmpresaAtivaRecarregar = () => { dadosDe = ''; novaTentativa = 0; ciclo(); };
  setInterval(ciclo, 700);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ciclo); else ciclo();
})();
