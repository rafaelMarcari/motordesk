/**
 * Rastrear Processo (Indústria): ao abrir uma etapa da esteira, a barra de navegação
 * (public/rastrear-nav.js) mostra a etapa anterior, a próxima e "voltar ao Rastrear".
 *
 * - O botão "Abrir Tela →" de cada etapa informa à barra a lista de etapas e qual foi aberta.
 * - O módulo Industrial expõe a navegação dele (a mesma usada pelos botões das etapas), a aba atual
 *   e o retorno à esteira, para a barra navegar sem recarregar.
 *
 * Uso: node scripts/rastrear-navegacao.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');
const ARQ = path.resolve(__dirname, '..', 'public/assets/index-CUxTo0fH.js');
const MARK = '/*MD-RASTREAR-NAV-v1*/';
let s = fs.readFileSync(ARQ, 'utf8');
if (s.includes(MARK)) { console.log('já aplicado'); process.exit(0); }
const trocar = (a, b, nome) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(nome + ': ' + n + ' ocorrências'); s = s.replace(a, b); };

trocar('onClick: () => onNavigate && onNavigate(st.route),',
  'onClick: () => { ' + MARK + 'try { window.__mdRastrearIniciar && window.__mdRastrearIniciar((curr.stages || []).map((x) => ({ num: x.num, name: x.name, sector: x.sector, route: x.route, doc: x.doc })), (curr.stages || []).indexOf(st), curr.id, curr.item); } catch (e) {} onNavigate && onNavigate(st.route); },',
  'botão Abrir Tela');

trocar('(m==="trace_process"||m==="trace_product")&&t.jsx(IndustrialProcessTracker,{onNavigate:(route)=>{',
  '(window.__mdIndTab=m,window.__mdIndIrTracker=()=>p("trace_process"),null),(m==="trace_process"||m==="trace_product")&&t.jsx(IndustrialProcessTracker,{onNavigate:window.__mdIndNav=(route)=>{',
  'navegação do módulo industrial');

fs.writeFileSync(ARQ, s);
console.log('ok');
