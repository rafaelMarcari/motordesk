import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundlePath = path.join(__dirname, 'public', 'assets', 'index-CUxTo0fH.js');
let code = fs.readFileSync(bundlePath, 'utf8');

console.log('[PATCH] Starting bundle patch for license and module enablement...');

// 1. Wd: Permitir boletos e módulos contratados explicitamente
const wdSearch = `,i!==void 0)return!!i;if(Object.keys(a.globalModules).length>0)return e==="accessDashboard"||e==="accessUserManagement"}`;
const wdReplace = `,i===void 0&&(e==="accessBoletos"||e==="boletoGenerate"||e==="boletoView"||e==="boletoReprint"||e==="boletoConfig")&&(i=a.globalModules.accessBoletos??a.globalModules.boletos,i===void 0&&(a.globalModules.accessFiscal||a.globalModules.accessFinancial)&&(i=!0)),i!==void 0)return!!i;if(Object.keys(a.globalModules).length>0)return e==="accessDashboard"||e==="accessUserManagement"}`;

if (code.includes(wdSearch)) {
  code = code.replace(wdSearch, wdReplace);
  console.log('[PATCH] 1. Wd boleto check patched successfully.');
} else {
  console.warn('[PATCH] 1. Wd search string not found or already patched.');
}

// 2. ma: Adicionar accessBoletos à lista de módulos opcionais
const maSearch = `ma={accessSales:{label:"Vendas & Balcão (PDV / Comércio)",defaultPrice:49.9,permKey:"accessSales"},`;
const maReplace = `ma={accessBoletos:{label:"Boletos Bancários & Cobrança PIX",defaultPrice:29.9,permKey:"accessBoletos"},accessSales:{label:"Vendas & Balcão (PDV / Comércio)",defaultPrice:49.9,permKey:"accessSales"},`;

if (code.includes(maSearch)) {
  code = code.replace(maSearch, maReplace);
  console.log('[PATCH] 2. ma accessBoletos added successfully.');
} else {
  console.warn('[PATCH] 2. ma search string not found or already patched.');
}

// 3. sa: Adicionar accessBoletos:29.9 nos preços padrão
const saSearch = `{accessParts:39.9,accessQuotations:29.9,accessAccountsReceivable:29.9,accessAccountsPayable:29.9,accessFinancial:49.9,accessFiscal:59.9,accessReports:29.9,accessQAPanel:49.9}`;
const saReplace = `{accessBoletos:29.9,accessParts:39.9,accessQuotations:29.9,accessAccountsReceivable:29.9,accessAccountsPayable:29.9,accessFinancial:49.9,accessFiscal:59.9,accessReports:29.9,accessQAPanel:49.9}`;

if (code.includes(saSearch)) {
  code = code.replace(saSearch, saReplace);
  console.log('[PATCH] 3. sa default prices patched successfully.');
} else {
  console.warn('[PATCH] 3. sa search string not found or already patched.');
}

// 4. rv: Garantir accessBoletos:!0 em todos os 4 casos de getDefaultGlobalModules
const rvSearch = `accessFiscal:!0,accessReports:!0`;
const rvReplace = `accessFiscal:!0,accessBoletos:!0,accessReports:!0`;

// Substituir apenas dentro de rv
const rvIndex = code.indexOf('function rv(');
if (rvIndex !== -1) {
  const beforeRv = code.substring(0, rvIndex);
  const afterRv = code.substring(rvIndex);
  const patchedAfterRv = afterRv.replace(new RegExp(rvSearch, 'g'), rvReplace);
  code = beforeRv + patchedAfterRv;
  console.log('[PATCH] 4. rv function patched with accessBoletos:!0.');
}

// 5. Ul: Validação de limite de operadores da empresa (padrão 5 usuários)
const ulSearch = `}else{if(!gl.trim()){uo("Senha inicial é obrigatória para novos operadores.");return}`;
const ulReplace = `}else{const _cL=(za&&typeof za.userLimit==="number"&&za.userLimit>0)?za.userLimit:5;const _uC=e.users.filter(u=>(u.companyId||"comp-1")===w).length;if(_uC>=_cL){const _eP=(za&&typeof za.additionalUserPrice==="number")?za.additionalUserPrice:29.9;uo(\`Limite de operadores atingido: a licença da empresa "\${Ue}" permite até \${_cL} usuários (atualmente \${_uC} cadastrados). Para cadastrar mais operadores, aumente o limite de usuários na Gestão de Assinatura (R$ \${_eP.toFixed(2)} por usuário adicional).\`);return}if(!gl.trim()){uo("Senha inicial é obrigatória para novos operadores.");return}`;

if (code.includes(ulSearch)) {
  code = code.replace(ulSearch, ulReplace);
  console.log('[PATCH] 5. Ul user limit enforcement patched successfully.');
} else {
  console.warn('[PATCH] 5. Ul search string not found or already patched.');
}

// 6. Jo: Definir licença padrão de 5 usuários na criação de nova empresa
const joSearch = `enableWithdrawalAndDelivery:le,levelPermissions:Ym,globalModules:rv(Q)},nr=[...N,Ga]`;
const joReplace = `userLimit:5,additionalUserPrice:29.9,baseUsersIncluded:5,enableWithdrawalAndDelivery:le,levelPermissions:Ym,globalModules:rv(Q)},nr=[...N,Ga]`;

if (code.includes(joSearch)) {
  code = code.replace(joSearch, joReplace);
  console.log('[PATCH] 6. Jo new company default user limit (5 users) patched successfully.');
} else {
  console.warn('[PATCH] 6. Jo search string not found or already patched.');
}

// 7. Login: NÃO corromper o companyId de outros usuários com mesmo username ao logar
const userMapSearch = `users:(Rs.users||[]).map(xs=>xs.id===Se.id||xs.username.toLowerCase()===Se.username.toLowerCase()?{...xs,companyId:Yt}:xs)`;
const userMapReplace = `users:(Rs.users||[]).map(xs=>xs.id===Se.id?{...xs,companyId:Yt}:xs)`;

if (code.includes(userMapSearch)) {
  code = code.replace(userMapSearch, userMapReplace);
  console.log('[PATCH] 7. Login user companyId isolation patched successfully.');
} else {
  console.warn('[PATCH] 7. userMap search string not found or already patched.');
}

// 8. Login: Respeitar a empresa Zt selecionada pelo usuário no dropdown e não sobrescrever com Ea.companyId
const loginSearch = `let Se=(e.users||[]).find(Yt=>Yt.username.toLowerCase()===yt&&Yt.passwordHash===Dt&&(Yt.companyId||"comp-1")===Zt);if(!Se){const Yt=Ft.map(be=>be.id),Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash===Dt&&(Yt.length===0||Yt.includes(be.companyId||"comp-1")));Ea&&(Se=Ea,Zt=Ea.companyId||Zt)}if(!Se){const Yt=Ft.map(be=>be.id),Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash.toLowerCase()===Dt.toLowerCase()&&(Yt.length===0||Yt.includes(be.companyId||"comp-1")));Ea&&(Se=Ea,Zt=Ea.companyId||Zt)}`;
const loginReplace = `let Se=(e.users||[]).find(Yt=>Yt.username.toLowerCase()===yt&&Yt.passwordHash===Dt&&(Yt.companyId===Zt||(Array.isArray(Yt.allowedCompanyIds)&&Yt.allowedCompanyIds.includes(Zt))));if(!Se){const Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash===Dt&&(be.companyId===Zt||(Array.isArray(be.allowedCompanyIds)&&be.allowedCompanyIds.includes(Zt))));Ea&&(Se=Ea)}if(!Se){const Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash===Dt);Ea&&(Se=Ea)}if(!Se){const Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash.toLowerCase()===Dt.toLowerCase());Ea&&(Se=Ea)}`;

if (code.includes(loginSearch)) {
  code = code.replace(loginSearch, loginReplace);
  console.log('[PATCH] 8. Login company Zt preservation and priority patched successfully.');
} else {
  console.warn('[PATCH] 8. loginSearch string not found or already patched.');
}

// 9. App Component: Sincronização do operador respeitando a empresa ativa Ia
const appSyncSearch = `if(Ra!=null&&Ra.globalModules?Xe(Ra.globalModules):Yt.globalModules&&Xe(Yt.globalModules),n){const Cs=(Yt.users||[]).find(os=>os.id===n.id||os.username&&os.username.toLowerCase()===n.username.toLowerCase());`;
const appSyncReplace = `if(Ra!=null&&Ra.globalModules?Xe(Ra.globalModules):Yt.globalModules&&Xe(Yt.globalModules),n){const Cs=(Yt.users||[]).find(os=>os.id===n.id&&os.companyId===Ia)||(Yt.users||[]).find(os=>os.username&&os.username.toLowerCase()===n.username.toLowerCase()&&(os.companyId===Ia||(Array.isArray(os.allowedCompanyIds)&&os.allowedCompanyIds.includes(Ia))))||(Yt.users||[]).find(os=>os.id===n.id);`;

if (code.includes(appSyncSearch)) {
  code = code.replace(appSyncSearch, appSyncReplace);
  console.log('[PATCH] 9. App user sync by active company Ia patched successfully.');
} else {
  console.warn('[PATCH] 9. appSyncSearch string not found or already patched.');
}

// 10. Logout: Limpar intended view para não abrir segmento errado no próximo login
const logoutSearch = `Ne=()=>{if(De)try{localStorage.setItem("motordesk_intended_view",De)}catch{}i(null),`;
const logoutReplace = `Ne=()=>{try{localStorage.removeItem("motordesk_intended_view")}catch{}i(null),`;

if (code.includes(logoutSearch)) {
  code = code.replace(logoutSearch, logoutReplace);
  console.log('[PATCH] 10. Logout intended view clear patched successfully.');
} else {
  console.warn('[PATCH] 10. logoutSearch string not found or already patched.');
}

fs.writeFileSync(bundlePath, code, 'utf8');
console.log('[PATCH] Bundle patch completed successfully!');
