/**
 * Site: o menu do topo passa a levar à seção "Dores & Soluções" (public/site-landing.js), logo depois do Início,
 * no lugar da tabela "Diferenciais vs. Concorrentes", que sai do site.
 *
 * Uso: node scripts/site-menu-dores.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');
const ARQ = path.resolve(__dirname, '..', 'public/assets/index-CUxTo0fH.js');
const MARK = '/*MD-SITE-MENU-DORES-v1*/';
let s = fs.readFileSync(ARQ, 'utf8');
if (s.includes(MARK)) { console.log('já aplicado'); process.exit(0); }
const a = '[{id:"hero",label:"Início"},{id:"produto",label:"Produto & Telas"},{id:"diferenciais",label:"Diferenciais"},{id:"contato",label:"Contato"}]';
const n = s.split(a).length - 1;
if (n !== 1) throw new Error('menu do site: ' + n + ' ocorrências');
s = s.split(a).join(MARK + '[{id:"hero",label:"Início"},{id:"dores",label:"Dores & Soluções"},{id:"produto",label:"Produto & Telas"},{id:"contato",label:"Contato"}]');
fs.writeFileSync(ARQ, s);
console.log('ok');
