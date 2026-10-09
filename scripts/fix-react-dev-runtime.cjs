/**
 * O pacote carrega uma cópia do "react/jsx-runtime" em modo de desenvolvimento, com dois defeitos que
 * derrubavam a tela de Pedidos de Compra (etapa 5 do Rastrear Processo da Indústria):
 *  1) lê React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE de um objeto que não existe
 *     ("Cannot read properties of undefined (reading 'recentlyCreatedOwnerStacks')");
 *  2) cria os elementos com a chave "$typeof" em vez de "$$typeof", e o React recusa o objeto (erro #31).
 *
 * Uso: node scripts/fix-react-dev-runtime.cjs   (idempotente)
 */
const fs = require('fs');
const path = require('path');
const ARQ = path.resolve(__dirname, '..', 'public/assets/index-CUxTo0fH.js');
let s = fs.readFileSync(ARQ, 'utf8');
const trocar = (a, b, nome) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(nome + ': ' + n + ' ocorrências'); s = s.split(a).join(b); };

const MARK1 = '/*MD-REACT-DEV-RUNTIME-v1*/';
if (!s.includes(MARK1)) {
  trocar('ReactSharedInternals = React3.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,',
    'ReactSharedInternals = ' + MARK1 + '(React3 && React3.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE) || { A: null, recentlyCreatedOwnerStacks: 0 },',
    'internals');
}
const MARK2 = '/*MD-REACT-DEV-RUNTIME-v2*/';
if (!s.includes(MARK2)) {
  // aceita quebra de linha LF ou CRLF (o git do Windows pode converter)
  const re = /type = \{(\r?\n\s*)\$typeof: REACT_ELEMENT_TYPE,/g;
  const n = (s.match(re) || []).length;
  if (n !== 1) throw new Error('chave $$typeof: ' + n + ' ocorrências');
  s = s.replace(re, (_, quebra) => 'type = {' + MARK2 + quebra + '$$typeof: REACT_ELEMENT_TYPE,');
}
fs.writeFileSync(ARQ, s);
console.log('ok');
