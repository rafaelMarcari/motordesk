/**
 * Telas bloqueadas: mensagem que diz o que falta liberar, sem autoliberação; bloco industrial só onde
 * deve aparecer; Backup e Conexões & Módulos só para quem tem a liberação.
 *
 * - O bloco da área Industrial também atende "accounts_receivable", "accounts_payable", "financial"...
 *   Em empresa que não é do ramo Indústria ele era desenhado junto com a tela normal e mostrava
 *   "Módulo Não Disponível / Não Liberado" embaixo de Contas a Receber/Pagar. Agora só aparece nas
 *   telas da Indústria ou em empresa do ramo Indústria.
 * - A tela de bloqueio consultava a permissão pelo nome da tela (ex.: "accounts_receivable") e o botão
 *   "Liberar Acesso para meu Usuário" liberava sempre Cotações, para o próprio usuário. Agora mostra o
 *   motivo (assinatura, ramo, contrato ou permissão do usuário), o nome do módulo e onde liberar.
 * - Backup do Sistema e Conexões & Módulos apareciam para todos os usuários.
 *
 * Uso: node scripts/fix-bloqueio-telas.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ARQ = path.join(ROOT, 'public/assets/index-CUxTo0fH.js');
const MARK = '/*MD-BLOQUEIO-TELAS-v1*/';
let s = fs.readFileSync(ARQ, 'utf8');
if (s.includes(MARK)) { console.log('v1 já aplicado'); aplicarV2(); process.exit(0); }
const trocar = (a, b, nome) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(nome + ': ' + n + ' ocorrências'); s = s.replace(a, b); };

// Nomes dos módulos (catálogo do sistema)
const fonte = fs.readFileSync(path.join(ROOT, 'src/components/DeviceConnectionsAndPermissionsModal.tsx'), 'utf8');
const NOMES = {};
for (const m of fonte.matchAll(/key:\s*'([A-Za-z]+)',\s*name:\s*'([^']+)'/g)) NOMES[m[1]] = m[2];
Object.assign(NOMES, { accessQAPanel: 'Painel de Testes QA', accessNotificationEngine: 'Motor de Notificações', accessNotificationsEngine: 'Motor de Notificações', accessBackup: 'Backup da empresa', accessDeviceConnections: 'Conexões & Módulos' });

// 1. Bloco industrial só nas telas da Indústria ou em empresa do ramo Indústria
trocar('(typeof INDUSTRIAL_MODULES!=="undefined"&&INDUSTRIAL_MODULES.some(m=>m.submenus&&m.submenus.some(s=>s.id===De||s.tab===De))))))&&(n.role==="admin"',
  '(Te==="INDUSTRIA"&&typeof INDUSTRIAL_MODULES!=="undefined"&&INDUSTRIAL_MODULES.some(m=>m.submenus&&m.submenus.some(s=>s.id===De||s.tab===De))))))&&(n.role==="admin"', 'bloco industrial');

// 2. Tela de bloqueio
{
  const i = s.indexOf('const va=()=>{const isQ=De==="quotations"');
  const j = s.indexOf('},is=()=>', i);
  if (i < 0 || j < 0) throw new Error('tela de bloqueio não encontrada');
  const nova = `const va=()=>{${MARK}const NOMES=${JSON.stringify(NOMES)};const chave=(typeof zre!=="undefined"&&zre[De])||De;const nome=NOMES[chave]||chave;const comp=ot||(e==null?void 0:e.companyInfo);const ativa=comp?gI(comp):!1;const ramo=comp?FA(De,Te)&&Hc(chave,Te):!0;const contratado=comp?Wd(chave,comp,Te)&&!(comp.globalModules&&comp.globalModules[chave]===!1):!1;const p=(n==null?void 0:n.permissions)||{},ie=(n==null?void 0:n.individualExceptions)||{},cp=(n==null?void 0:n.customPermissions)||{};const negado=p[chave]===!1||ie[chave]===!1||cp[chave]===!1;const liberado=!negado&&(p[chave]===!0||ie[chave]===!0||cp[chave]===!0||(n==null?void 0:n.role)==="admin"||(n==null?void 0:n.role)==="qa");const gerencia=(n==null?void 0:n.role)==="admin"||(n==null?void 0:n.role)==="qa"||p.accessUserManagement===!0;const esc=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);const usuario=(n==null?void 0:n.name)||(n==null?void 0:n.username)||"";const RAMOS={OFICINA:"Oficina Mecânica",COMERCIO:"Comércio & Autopeças",INDUSTRIA:"Indústria",OFICINA_COMERCIO:"Oficina + Comércio"};const linha=(ok,titulo,detalhe)=>'<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;text-align:left"><div><b style="font-size:12.5px;color:#334155">'+titulo+'</b><div style="font-size:11.5px;color:#64748b">'+detalhe+'</div></div><span style="flex-shrink:0;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;'+(ok?'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0">✓ OK':'background:#fff1f2;color:#be123c;border:1px solid #fecdd3">✗ Pendente')+'</span></div>';let acao="";if(!ativa)acao='A assinatura da empresa está <b>bloqueada ou vencida</b>. Quem regulariza: administrador da plataforma, em <b>Criar Usuários / Níveis → Gestão de Assinatura</b>.';else if(!ramo)acao='Esta tela não faz parte do ramo da empresa (<b>'+esc(RAMOS[Te]||Te)+'</b>). Ela só é usada por empresas de outro ramo.';else if(!contratado)acao='O módulo <b>“'+esc(nome)+'”</b> não foi contratado pela empresa. Quem contrata: administrador da plataforma, em <b>Criar Usuários / Níveis → Liberação de Módulos / Gestão de Assinatura</b>.';else if(!liberado)acao='O seu usuário não tem a permissão <b>“'+esc(nome)+'”</b>. Peça ao administrador da empresa: <b>Criar Usuários / Níveis → Operadores da Empresa → editar “'+esc(usuario)+'” → marcar “'+esc(nome)+'” → Salvar Operador</b>.';else acao='Tudo liberado. Recarregue a página (Ctrl+F5) para atualizar as permissões.';const html='<div style="width:56px;height:56px;margin:0 auto 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px">🔒</div><h2 style="margin:0;font-size:16px;font-weight:700;color:#1e293b">Tela não liberada: '+esc(nome)+'</h2><p style="margin:6px 0 16px;font-size:12.5px;color:#64748b">Para usar esta tela, os itens abaixo precisam estar OK.</p><div style="display:flex;flex-direction:column;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px">'+linha(ativa,"1. Assinatura da empresa","Empresa: "+esc(comp&&comp.name||"—"))+linha(ramo,"2. Ramo da empresa","Ramo: "+esc(RAMOS[Te]||Te))+linha(contratado,"3. Módulo contratado","Módulo: "+esc(nome))+linha(liberado,"4. Liberado ao usuário","Usuário: "+esc(usuario)+" ("+esc(n==null?void 0:n.role)+")")+'</div><div style="margin-top:14px;text-align:left;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;font-size:12.5px;color:#1e3a8a;line-height:1.5"><b>O que fazer:</b> '+acao+'</div><p style="margin:10px 0 0;font-size:11px;color:#94a3b8">Código da permissão: '+esc(chave)+'</p>'+(gerencia&&ativa&&ramo?'<button type="button" data-md-act="usuarios" style="margin-top:14px;padding:8px 16px;background:#0f172a;color:#fff;border:0;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer">Abrir Criar Usuários / Níveis</button>':'');return t.jsx("div",{id:"locked-module-screen",className:"p-8 text-center bg-white rounded-2xl border border-slate-200/80 my-8 animate-fade-in shadow-xs max-w-2xl mx-auto",onClick:ev=>{const b=ev.target.closest&&ev.target.closest('[data-md-act="usuarios"]');if(b)me("users")},dangerouslySetInnerHTML:{__html:html}})}`;
  s = s.slice(0, i) + nova + s.slice(j + 1);
}

// 3. Backup e Conexões & Módulos só para quem tem a liberação (conta mestre e administrador da empresa por padrão)
const pode = (k) => `(n&&(n.role==="qa"||["admin","validador"].includes(String(n.username||"").toLowerCase())||((n.permissions||{}).${k}===!0)||(n.role==="admin"&&(n.permissions||{}).${k}!==!1)))&&`;
trocar('t.jsx("button",{id:"btn-sidebar-backup"', pode('accessBackup') + 't.jsx("button",{id:"btn-sidebar-backup"', 'menu backup');
trocar('t.jsx("button",{id:"btn-sidebar-device-connections"', pode('accessDeviceConnections') + 't.jsx("button",{id:"btn-sidebar-device-connections"', 'menu conexões');

fs.writeFileSync(ARQ, s);
console.log('ok — nomes de módulos:', Object.keys(NOMES).length);
aplicarV2();

// v2: cada chamada do aviso informa a permissão que de fato bloqueou (ex.: qt("accessProduction")?va("accessProduction"))
function aplicarV2() {
  const MARK2 = '/*MD-BLOQUEIO-TELAS-v2*/';
  let b = fs.readFileSync(ARQ, 'utf8');
  if (b.includes(MARK2)) return;
  const antes = b.split('const va=()=>{' + MARK).length - 1;
  if (antes !== 1) throw new Error('v2: tela de bloqueio v1 não encontrada');
  b = b.replace('const va=()=>{' + MARK, 'const va=(kBloq)=>{' + MARK + MARK2);
  b = b.replace('const chave=(typeof zre!=="undefined"&&zre[De])||De;', 'const chave=kBloq||(typeof zre!=="undefined"&&zre[De])||De;');
  let n = 0;
  b = b.replace(/qt\("([A-Za-z]+)"\)\?va\(\)/g, (m, k) => { n++; return 'qt("' + k + '")?va("' + k + '")'; });
  fs.writeFileSync(ARQ, b);
  console.log('v2 ok — chamadas com a permissão que bloqueou:', n);
}
