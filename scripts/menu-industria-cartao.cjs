/**
 * Menu lateral da Indústria: o cartão "Empresa cadastrada" e o bloco laranja "Backup do sistema" saem do
 * componente industrial. No lugar, todos os segmentos usam o mesmo cartão da empresa (public/empresa-cartao.js),
 * em tons suaves, com o atalho de Backup só para quem tem a liberação (o bloco antigo aparecia para todos).
 *
 * Uso: node scripts/menu-industria-cartao.cjs   (idempotente; aceita quebras de linha LF ou CRLF)
 */
const fs = require('fs');
const path = require('path');
const ARQ = path.resolve(__dirname, '..', 'public/assets/index-CUxTo0fH.js');
const MARK = '/*MD-MENU-IND-CARTAO-v1*/';
let s = fs.readFileSync(ARQ, 'utf8');
if (s.includes(MARK)) { console.log('já aplicado'); process.exit(0); }
const trocar = (re, fn, nome) => {
  const n = (s.match(re) || []).length;
  if (n !== 1) throw new Error(nome + ': ' + n + ' ocorrências');
  s = s.replace(re, fn);
};

// 1. cartão "EMPRESA CADASTRADA" do menu industrial
trocar(/\(!isCollapsed \|\| isHovered\) && t\.jsxs\("div", \{(\s*)className: "px-2\.5 py-2 mb-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shadow-xs",/g,
  (_, q) => MARK + 'false && t.jsxs("div", {' + q + 'className: "px-2.5 py-2 mb-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shadow-xs",',
  'cartão da empresa');

// 2. bloco "BACKUP DO SISTEMA" (exibido para todos, sem checar a liberação)
trocar(/true && t\.jsxs\("div", \{(\s*)className: "px-2 py-1\.5 mb-2 rounded-xl bg-gradient-to-r from-amber-500\/20 via-purple-500\/15 to-blue-500\/20 border border-amber-500\/40 text-amber-200",/g,
  (_, q) => 'false && t.jsxs("div", {' + q + 'className: "px-2 py-1.5 mb-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-purple-500/15 to-blue-500/20 border border-amber-500/40 text-amber-200",',
  'bloco de backup');

fs.writeFileSync(ARQ, s);
console.log('ok');
