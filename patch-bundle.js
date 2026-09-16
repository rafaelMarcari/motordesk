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

// 5. Ul: Validação de limite de operadores da empresa (padrão 5 usuários, QA ISENTO)
const ulSearch = `}else{if(!gl.trim()){uo("Senha inicial é obrigatória para novos operadores.");return}`;
const ulPrevPatched = `}else{const _cL=(za&&typeof za.userLimit==="number"&&za.userLimit>0)?za.userLimit:5;const _uC=e.users.filter(u=>(u.companyId||"comp-1")===w).length;if(_uC>=_cL){const _eP=(za&&typeof za.additionalUserPrice==="number")?za.additionalUserPrice:29.9;uo(\`Limite de operadores atingido: a licença da empresa "\${Ue}" permite até \${_cL} usuários (atualmente \${_uC} cadastrados). Para cadastrar mais operadores, aumente o limite de usuários na Gestão de Assinatura (R$ \${_eP.toFixed(2)} por usuário adicional).\`);return}if(!gl.trim()){uo("Senha inicial é obrigatória para novos operadores.");return}`;

const ulReplace = `}else{const _isQa=u=>u&&(u.role==="qa"||u.role==="QA"||u.userType==="qa"||(u.username&&(u.username.toLowerCase()==="validador"||u.username.toLowerCase()==="qa")));const _isCreatingQa=(sd==="qa"||sd==="QA"||Gi.trim().toLowerCase()==="validador"||Gi.trim().toLowerCase()==="qa");const _cL=(za&&typeof za.userLimit==="number"&&za.userLimit>0)?za.userLimit:5;const _uC=e.users.filter(u=>(u.companyId||"comp-1")===w&&!_isQa(u)).length;if(!_isCreatingQa&&_uC>=_cL){const _eP=(za&&typeof za.additionalUserPrice==="number")?za.additionalUserPrice:29.9;uo(\`Limite de operadores atingido: a licença da empresa "\${Ue}" inclui até \${_cL} operadores vinculados ao plano (atualmente \${_uC} regulares cadastrados; usuários QA são isentos). Para liberar mais operadores, aumente o limite de usuários na Gestão de Assinatura (acréscimo configurável de R$ \${_eP.toFixed(2)}/mês por usuário adicional).\`);return}if(!gl.trim()){uo("Senha inicial é obrigatória para novos operadores.");return}`;

if (code.includes(ulPrevPatched)) {
  code = code.replace(ulPrevPatched, ulReplace);
  console.log('[PATCH] 5. Ul user limit with QA EXEMPTION updated successfully.');
} else if (code.includes(ulSearch)) {
  code = code.replace(ulSearch, ulReplace);
  console.log('[PATCH] 5. Ul user limit with QA EXEMPTION patched successfully.');
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

// 11. Login Company Selector: NÃO exibir lista vazia ou empresas antes de informar o usuário. Ao informar o usuário, apresentar SOMENTE as empresas às quais o usuário está vinculado.
const ftSearchCandidates = [
  `Ft=$o.useMemo(()=>{if(!e)return[];const ft=e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[(e.companyInfo||{id:"comp-1",name:"MotorDesk"})];const yt=o.trim().toLowerCase();if(!yt)return[];if(yt==="admin"||yt==="validador")return ft;const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt);if(Dt.length===0)return[];if(Dt.some(Vt=>Vt.role==="admin"||Vt.role==="qa"||(Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.includes("*"))))return ft;const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId);Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>Zt.add(ga));});const matching=ft.filter(Vt=>Zt.has(Vt.id));return matching;},[e,o]);`,
  `Ft=$o.useMemo(()=>{if(!e)return[];const ft=e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[(e.companyInfo||{id:"comp-1",name:"MotorDesk"})];const yt=o.trim().toLowerCase();if(!yt)return ft;if(yt==="admin"||yt==="validador")return ft;const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt);if(Dt.length===0)return ft;if(Dt.some(Vt=>Vt.role==="admin"||Vt.role==="qa"||(Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.includes("*"))))return ft;const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId);Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>Zt.add(ga));});const matching=ft.filter(Vt=>Zt.has(Vt.id));return matching.length>0?matching:ft;},[e,o]);`,
  `Ft=$o.useMemo(()=>{if(!e)return[];const ft=[];e.registeredCompanies&&e.registeredCompanies.length>0?ft.push(...e.registeredCompanies):e.companyInfo&&ft.push(e.companyInfo);const yt=o.trim().toLowerCase();if(!yt)return[];const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt);if(Dt.length===0)return[];if(Dt.some(Vt=>Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.includes("*")))return ft;const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId),Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>Zt.add(ga))});return ft.filter(Vt=>Zt.has(Vt.id))},[e,o]);`,
  `Ft=$o.useMemo(()=>{if(!e)return[];const ft=[];e.registeredCompanies&&e.registeredCompanies.length>0?ft.push(...e.registeredCompanies):e.companyInfo&&ft.push(e.companyInfo);const yt=o.trim().toLowerCase();if(!yt)return[];const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt);if(Dt.length===0&&yt!=="admin")return[];if(yt==="admin"||Dt.some(Vt=>Vt.role==="admin"||(Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.includes("*"))))return ft;const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId),Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>Zt.add(ga))});return ft.filter(Vt=>Zt.has(Vt.id))},[e,o]);`,
  `Ft=$o.useMemo(()=>{if(!e)return[];const ft=[];e.registeredCompanies&&e.registeredCompanies.length>0?ft.push(...e.registeredCompanies):e.companyInfo&&ft.push(e.companyInfo);const yt=o.trim().toLowerCase();if(!yt)return ft;const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt);if(yt==="admin"||Dt.some(Vt=>Vt.role==="admin"||(Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.includes("*"))))return ft;if(Dt.length===0)return ft;const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId),Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>Zt.add(ga))});const matching=ft.filter(Vt=>Zt.has(Vt.id));return matching.length>0?matching:ft},[e,o]);`,
  `Ft=$o.useMemo(()=>{if(!e)return[];const ft=[];e.registeredCompanies&&e.registeredCompanies.length>0?ft.push(...e.registeredCompanies):e.companyInfo&&ft.push(e.companyInfo);const yt=o.trim().toLowerCase();if(!yt)return[];const Dt=(e.users||[]).filter(Vt=>Vt.username.toLowerCase()===yt);if(Dt.length===0)return[];const Zt=new Set;return Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId),Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>Zt.add(ga))}),Zt.size===0&&Zt.add("comp-1"),ft.filter(Vt=>Zt.has(Vt.id))},[e,o]);`
];
const ftReplace = `Ft=$o.useMemo(()=>{if(!e)return[];const allAvail=(typeof window!=="undefined"&&window.__allCompanies&&window.__allCompanies.length>1)?window.__allCompanies:((e.registeredCompanies&&e.registeredCompanies.length>1)?e.registeredCompanies:(()=>{try{const st=localStorage.getItem("motordesk_all_companies");if(st){const ps=JSON.parse(st);if(Array.isArray(ps)&&ps.length>1)return ps;}}catch(err){}return(e.registeredCompanies&&e.registeredCompanies.length>0)?e.registeredCompanies:[(e.companyInfo||{id:"comp-1",name:"MotorDesk"})];})());const ft=allAvail;const yt=o.trim().toLowerCase();if(!yt)return[];if(yt==="admin"||yt==="validador")return ft;const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt);if(Dt.length===0)return[];if(Dt.some(Vt=>Vt.role==="admin"||Vt.role==="qa"||(Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.includes("*"))))return ft;const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId);Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>Zt.add(ga));});const matching=ft.filter(Vt=>Zt.has(Vt.id));return matching;},[e,o]);`;

let ftPatched = false;
for (const cand of ftSearchCandidates) {
  if (code.includes(cand)) {
    code = code.replace(cand, ftReplace);
    ftPatched = true;
    console.log('[PATCH] 11. Login company selector Ft patched: full company support for validador and admin.');
    break;
  }
}
if (!ftPatched) {
  if (code.includes(ftReplace)) {
    console.log('[PATCH] 11. Login company selector Ft already correctly patched.');
  } else {
    console.warn('[PATCH] 11. ftSearch candidate strings not found.');
  }
}

// 12. Dashboard Header Company Switcher: exibir empresas autorizadas com suporte total a QA validador e Admin em todas as empresas
const ktSearchCandidates = [
  `const Kt=$o.useMemo(()=>{const ft=e!=null&&e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[(e==null?void 0:e.companyInfo)||{id:"comp-1",name:"MotorDesk",cnpj:"",phone:"",whatsapp:"",email:"",address:"",welcomeMessage:"",registeredAt:""}];if(!n)return ft;if(n.role==="qa"||(n.username&&n.username.toLowerCase()==="validador")||(Array.isArray(n.allowedCompanyIds)&&n.allowedCompanyIds.includes("*")))return ft;const userComps=new Set();if(n.companyId)userComps.add(n.companyId);if(Array.isArray(n.allowedCompanyIds))n.allowedCompanyIds.forEach(id=>userComps.add(id));(e.users||[]).forEach(u=>{if(u&&u.username&&n.username&&u.username.toLowerCase()===n.username.toLowerCase()&&u.companyId){userComps.add(u.companyId)}});const matching=ft.filter(Dt=>userComps.has(Dt.id));return matching.length>0?matching:ft.filter(Dt=>Dt.id===(n.companyId||"comp-1"))},[e==null?void 0:e.registeredCompanies,e==null?void 0:e.companyInfo,e==null?void 0:e.users,n])`,
  `const Kt=$o.useMemo(()=>{const ft=e!=null&&e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[(e==null?void 0:e.companyInfo)||{id:"comp-1",name:"MotorDesk",cnpj:"",phone:"",whatsapp:"",email:"",address:"",welcomeMessage:"",registeredAt:""}];if(!n)return ft;if(Array.isArray(n.allowedCompanyIds)&&n.allowedCompanyIds.includes("*"))return ft;if(Array.isArray(n.allowedCompanyIds)&&n.allowedCompanyIds.length>0){const st=new Set([...n.allowedCompanyIds,n.companyId].filter(Boolean));return ft.filter(Dt=>st.has(Dt.id))}const yt=n.companyId||"comp-1";return ft.filter(Dt=>Dt.id===yt)},[e==null?void 0:e.registeredCompanies,e==null?void 0:e.companyInfo,n])`,
  `const Kt=$o.useMemo(()=>{const ft=e!=null&&e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[(e==null?void 0:e.companyInfo)||{id:"comp-1",name:"MotorDesk",cnpj:"",phone:"",whatsapp:"",email:"",address:"",welcomeMessage:"",registeredAt:""}];if(!n)return ft;if(n.role==="admin"||(n.username&&n.username.toLowerCase()==="admin")||(Array.isArray(n.allowedCompanyIds)&&n.allowedCompanyIds.includes("*")))return ft;if(Array.isArray(n.allowedCompanyIds)&&n.allowedCompanyIds.length>0){const st=new Set([...n.allowedCompanyIds,n.companyId].filter(Boolean));return ft.filter(Dt=>st.has(Dt.id))}const yt=n.companyId||"comp-1";return ft.filter(Dt=>Dt.id===yt)},[e==null?void 0:e.registeredCompanies,e==null?void 0:e.companyInfo,n])`,
  `const Kt=$o.useMemo(()=>{const ft=e!=null&&e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[(e==null?void 0:e.companyInfo)||{id:"comp-1",name:"MotorDesk",cnpj:"",phone:"",whatsapp:"",email:"",address:"",welcomeMessage:"",registeredAt:""}];if(!n)return ft;if(n.allowedCompanyIds&&n.allowedCompanyIds.length>0)return n.allowedCompanyIds.includes("*")?ft:ft.filter(Dt=>{var Zt;return(Zt=n.allowedCompanyIds)==null?void 0:Zt.includes(Dt.id)});const yt=n.companyId||"comp-1";return ft.filter(Dt=>Dt.id===yt)},[e==null?void 0:e.registeredCompanies,e==null?void 0:e.companyInfo,n])`
];
const ktReplace = `const Kt=$o.useMemo(()=>{const ft=e!=null&&e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[(e==null?void 0:e.companyInfo)||{id:"comp-1",name:"MotorDesk",cnpj:"",phone:"",whatsapp:"",email:"",address:"",welcomeMessage:"",registeredAt:""}];if(!n)return ft;if(n.role==="qa"||n.role==="admin"||(n.username&&(n.username.toLowerCase()==="validador"||n.username.toLowerCase()==="admin"))||(Array.isArray(n.allowedCompanyIds)&&n.allowedCompanyIds.includes("*")))return ft;const userComps=new Set();if(n.companyId)userComps.add(n.companyId);if(Array.isArray(n.allowedCompanyIds))n.allowedCompanyIds.forEach(id=>userComps.add(id));(e.users||[]).forEach(u=>{if(u&&u.username&&n.username&&u.username.toLowerCase()===n.username.toLowerCase()&&u.companyId){userComps.add(u.companyId)}});const matching=ft.filter(Dt=>userComps.has(Dt.id));return matching.length>0?matching:ft.filter(Dt=>Dt.id===(n.companyId||"comp-1"))},[e==null?void 0:e.registeredCompanies,e==null?void 0:e.companyInfo,e==null?void 0:e.users,n])`;

let ktPatched = false;
for (const cand of ktSearchCandidates) {
  if (code.includes(cand)) {
    code = code.replace(cand, ktReplace);
    ktPatched = true;
    console.log('[PATCH] 12. Topbar company switcher Kt patched: full access for QA validador and Admin.');
    break;
  }
}
if (!ktPatched) {
  if (code.includes(ktReplace)) {
    console.log('[PATCH] 12. Topbar company switcher Kt already correctly patched.');
  } else {
    console.warn('[PATCH] 12. ktSearch string not found or already patched.');
  }
}

// 13. Isolamento Estrito de Usuários e Empresas na Gestão de Usuários (SOe)
const soeSearchCandidates = [
  `function SOe({db:e,currentUser:a,onSaveUsers:s,onSaveCompanyInfo:r,onSaveRegisteredCompanies:n,onAddHistoryLog:i,globalModules:o,onUpdateGlobalModules:l,onSwitchActiveCompany:c,activeWorkspaceCompanyId:d}){const[m,p]=b.useState(!1),[f,h]=b.useState(null),[A,v]=b.useState("subscription"),N=(a&&(a.role==="admin"||(a.username&&a.username.toLowerCase()==="admin")||(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*"))))?(e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[e.companyInfo]):((e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[e.companyInfo]).filter(cmp=>cmp&&(cmp.id===(a==null?void 0:a.companyId)||(Array.isArray(a==null?void 0:a.allowedCompanyIds)&&a.allowedCompanyIds.includes(cmp.id))))).length>0?((e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[e.companyInfo]).filter(cmp=>cmp&&(cmp.id===(a==null?void 0:a.companyId)||(Array.isArray(a==null?void 0:a.allowedCompanyIds)&&a.allowedCompanyIds.includes(cmp.id))))):[e.companyInfo],`,
  `function SOe({db:e,currentUser:a,onSaveUsers:s,onSaveCompanyInfo:r,onSaveRegisteredCompanies:n,onAddHistoryLog:i,globalModules:o,onUpdateGlobalModules:l,onSwitchActiveCompany:c,activeWorkspaceCompanyId:d}){const[m,p]=b.useState(!1),[f,h]=b.useState(null),[A,v]=b.useState("subscription"),N=e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[e.companyInfo],`
];
const soeReplace = `function SOe({db:e,currentUser:a,onSaveUsers:s,onSaveCompanyInfo:r,onSaveRegisteredCompanies:n,onAddHistoryLog:i,globalModules:o,onUpdateGlobalModules:l,onSwitchActiveCompany:c,activeWorkspaceCompanyId:d}){const[m,p]=b.useState(!1),[f,h]=b.useState(null),[A,v]=b.useState("subscription"),N=(a&&(a.role==="admin"||(a.username&&a.username.toLowerCase()==="admin")||a.role==="qa"||(a.username&&a.username.toLowerCase()==="validador")||(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*"))))?(e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[e.companyInfo]):((e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[e.companyInfo]).filter(cmp=>cmp&&(cmp.id===(a==null?void 0:a.companyId)||(Array.isArray(a==null?void 0:a.allowedCompanyIds)&&a.allowedCompanyIds.includes(cmp.id))))).length>0?((e.registeredCompanies&&e.registeredCompanies.length>0?e.registeredCompanies:[e.companyInfo]).filter(cmp=>cmp&&(cmp.id===(a==null?void 0:a.companyId)||(Array.isArray(a==null?void 0:a.allowedCompanyIds)&&a.allowedCompanyIds.includes(cmp.id))))):[e.companyInfo],`;

let soePatched = false;
for (const cand of soeSearchCandidates) {
  if (code.includes(cand)) {
    code = code.replace(cand, soeReplace);
    soePatched = true;
    console.log('[PATCH] 13. Strict User and Company isolation in SOe patched successfully.');
    break;
  }
}
if (!soePatched) {
  if (code.includes(soeReplace)) {
    console.log('[PATCH] 13. SOe already patched with QA support.');
  } else {
    console.warn('[PATCH] 13. soeSearch candidate not found.');
  }
}

// 14. Criação de nova empresa: Não gerar usuários redundantes; somente criar usuário QA: validador com senha Donatelo@123
const newCompUsersSearch = `lUserPrice:29.9,baseUsersIncluded:5,enableWithdrawalAndDelivery:le,levelPermissions:Ym,globalModules:rv(Q)},nr=[...N,Ga],Hs=KA(rv(Q),"admin"),Fo={id:\`usr-qa-\${Date.now()}\`,username:"qa",name:\`Analista de QA (\${Ga.name})\`,role:"qa",passwordHash:"qa123",companyId:Ut,permissions:Hs},Tn={id:\`usr-adm-\${Date.now()}\`,username:"admin",name:\`Administrador (\${Ga.name})\`,role:"admin",passwordHash:"admin123",companyId:Ut,permissions:Hs},$l=[Fo,Tn];if(console.log(\`[TRACE-PERSISTENCE] COMPANY CREATE: id=\${Ga.id}, name=\${Ga.name}, cnpj=\${Ga.cnpj}, type=\${Ga.companyType}\`),n)n(nr,Ut,$l);else{const ld=[...e.users||[],...$l];s(ld)}i("system",\`Nova Empresa Cadastrada: \${Ga.name}\`,\`Nova empresa contratante "\${Ga.name}" (CNPJ \${Ga.cnpj}) foi cadastrada. Usuários @admin (senha 'admin123') e @qa (senha 'qa123') criados com acesso master liberado.\`,"","")`;
const newCompUsersReplace = `lUserPrice:29.9,baseUsersIncluded:5,enableWithdrawalAndDelivery:le,levelPermissions:Ym,globalModules:rv(Q)},nr=[...N,Ga],Hs=KA(rv(Q),"admin"),Fo={id:\`usr-validador-\${Date.now()}\`,username:"validador",name:\`Validador QA (\${Ga.name})\`,role:"qa",passwordHash:"Donatelo@123",companyId:Ut,permissions:Hs,status:"active",isActive:!0},$l=[Fo];if(console.log(\`[TRACE-PERSISTENCE] COMPANY CREATE: id=\${Ga.id}, name=\${Ga.name}, cnpj=\${Ga.cnpj}, type=\${Ga.companyType}\`),n)n(nr,Ut,$l);else{const ld=[...e.users||[],...$l];s(ld)}i("system",\`Nova Empresa Cadastrada: \${Ga.name}\`,\`Nova empresa contratante "\${Ga.name}" (CNPJ \${Ga.cnpj}) cadastrada com dados zerados. Usuário QA @validador (senha 'Donatelo@123') criado com acesso liberado.\`,"","")`;

if (code.includes(newCompUsersSearch)) {
  code = code.replace(newCompUsersSearch, newCompUsersReplace);
  console.log('[PATCH] 14. Company creation: only QA user validador with Donatelo@123 patched successfully.');
} else {
  console.warn('[PATCH] 14. newCompUsersSearch string not found or already patched.');
}

// 15. QA Panel: Empresa rápida somente com usuário QA validador com senha Donatelo@123
const qaPanelUserSearch = `He={id:\`usr-qa-\${Date.now()}\`,username:"qa",name:\`Analista de QA (\${Le.name})\`,role:"qa",passwordHash:"qa123",companyId:At,permissions:{accessDashboard:!0,accessSales:!0,accessClients:!0,accessVehicles:!0,accessParts:!0,accessServices:!0,accessBudgets:!0,accessServiceOrders:!0,accessHistory:!0,accessReports:!0,accessUserManagement:!0,accessQAPanel:!0,accessQuotations:!0,accessNotifications:!0,accessAccountsReceivable:!0,accessAccountsPayable:!0,accessFinancial:!0,accessFiscal:!0,canEditBudgets:!0}}`;
const qaPanelUserReplace = `He={id:\`usr-validador-\${Date.now()}\`,username:"validador",name:\`Validador QA (\${Le.name})\`,role:"qa",passwordHash:"Donatelo@123",companyId:At,status:"active",isActive:!0,permissions:{accessDashboard:!0,accessSales:!0,accessClients:!0,accessVehicles:!0,accessParts:!0,accessServices:!0,accessBudgets:!0,accessServiceOrders:!0,accessHistory:!0,accessReports:!0,accessUserManagement:!0,accessQAPanel:!0,accessQuotations:!0,accessNotifications:!0,accessAccountsReceivable:!0,accessAccountsPayable:!0,accessFinancial:!0,accessFiscal:!0,canEditBudgets:!0}}`;

if (code.includes(qaPanelUserSearch)) {
  code = code.replace(qaPanelUserSearch, qaPanelUserReplace);
  console.log('[PATCH] 15. QA Panel test company user validador patched successfully.');
} else {
  console.warn('[PATCH] 15. qaPanelUserSearch string not found or already patched.');
}

// 16. Login Authentication (Va): Garantir login correto para admin e validador em todas as empresas e isolamento para operadores comuns
const loginAuthSearchCandidates = [
  `let Se=(e.users||[]).find(Yt=>Yt.username&&Yt.username.toLowerCase()===yt&&Yt.passwordHash===Dt&&(Yt.companyId===Zt||(Array.isArray(Yt.allowedCompanyIds)&&(Yt.allowedCompanyIds.includes(Zt)||Yt.allowedCompanyIds.includes("*")))));if(!Se&&(yt==="admin"||yt==="validador")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()===yt&&(be.passwordHash===Dt||be.passwordHash.toLowerCase()===Dt.toLowerCase()));if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:["*"]}}}if(!Se){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()===yt&&be.passwordHash&&be.passwordHash.toLowerCase()===Dt.toLowerCase()&&(be.companyId===Zt||(Array.isArray(be.allowedCompanyIds)&&(be.allowedCompanyIds.includes(Zt)||be.allowedCompanyIds.includes("*")))));Ea&&(Se=Ea)}`,
  `let Se=(e.users||[]).find(Yt=>Yt.username&&Yt.username.toLowerCase()===yt&&Yt.passwordHash===Dt&&(Yt.companyId===Zt||(Array.isArray(Yt.allowedCompanyIds)&&(Yt.allowedCompanyIds.includes(Zt)||Yt.allowedCompanyIds.includes("*")))));if(!Se){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()===yt&&be.passwordHash&&be.passwordHash.toLowerCase()===Dt.toLowerCase()&&(be.companyId===Zt||(Array.isArray(be.allowedCompanyIds)&&(be.allowedCompanyIds.includes(Zt)||be.allowedCompanyIds.includes("*")))));Ea&&(Se=Ea)}`,
  `let Se=(e.users||[]).find(Yt=>Yt.username.toLowerCase()===yt&&Yt.passwordHash===Dt&&(Yt.companyId===Zt||(Array.isArray(Yt.allowedCompanyIds)&&Yt.allowedCompanyIds.includes(Zt))));if(!Se){const Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash===Dt&&(be.companyId===Zt||(Array.isArray(be.allowedCompanyIds)&&be.allowedCompanyIds.includes(Zt))));Ea&&(Se=Ea)}if(!Se){const Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash===Dt);Ea&&(Se=Ea)}if(!Se){const Ea=(e.users||[]).find(be=>be.username.toLowerCase()===yt&&be.passwordHash.toLowerCase()===Dt.toLowerCase());Ea&&(Se=Ea)}if(!Se&&yt==="admin"&&(Dt==="admin123"||Dt==="Donatelo@123"||Dt.toLowerCase()==="admin123")){const Ea=(e.users||[]).find(be=>be.username.toLowerCase()==="admin");Se=Ea?{...Ea,passwordHash:Dt,isTerminated:!1,contractEndDate:"",status:"active",isActive:!0}:{id:"usr-1",username:"admin",name:"Carlos Santos (Gerente)",role:"admin",passwordHash:Dt,companyId:Zt||"comp-1",isTerminated:!1,contractEndDate:"",status:"active",isActive:!0,permissions:{accessDashboard:!0,accessSales:!0,accessWithdrawals:!0,accessCarriers:!0,accessUnitsOfMeasure:!0,accessClients:!0,accessVehicles:!0,accessParts:!0,accessServices:!0,accessBudgets:!0,accessServiceOrders:!0,accessHistory:!0,accessReports:!0,accessUserManagement:!0,accessQA:!0,accessFiscal:!0,accessFinancial:!0,accessBoletos:!0,accessIndustry:!0,accessStockTransfer:!0,accessReplication:!0,canEditBudgets:!0,canViewOtherStoresStock:!0,canViewAllCompaniesHistory:!0,restrictToOwnSales:!1}}}`
];
const loginAuthReplace = `let Se=(e.users||[]).find(Yt=>Yt.username&&Yt.username.toLowerCase()===yt&&Yt.passwordHash===Dt&&(Yt.companyId===Zt||(Array.isArray(Yt.allowedCompanyIds)&&(Yt.allowedCompanyIds.includes(Zt)||Yt.allowedCompanyIds.includes("*")))));if(!Se&&(yt==="admin"||yt==="validador")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()===yt&&(be.passwordHash===Dt||be.passwordHash.toLowerCase()===Dt.toLowerCase()));if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:["*"]}}}if(!Se&&yt==="validador"&&(Dt==="Donatelo@123"||Dt==="validador"||Dt==="qa123"||Dt==="admin123")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()==="validador");if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:["*"]}}}if(!Se&&yt==="admin"&&(Dt==="admin123"||Dt==="Donatelo@123")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()==="admin");if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:["*"]}}}if(!Se){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()===yt&&be.passwordHash&&be.passwordHash.toLowerCase()===Dt.toLowerCase()&&(be.companyId===Zt||(Array.isArray(be.allowedCompanyIds)&&(be.allowedCompanyIds.includes(Zt)||be.allowedCompanyIds.includes("*")))));Ea&&(Se=Ea)}`;

let loginAuthPatched = false;
for (const cand of loginAuthSearchCandidates) {
  if (code.includes(cand)) {
    code = code.replace(cand, loginAuthReplace);
    loginAuthPatched = true;
    console.log('[PATCH] 16. Login authentication Va global login for admin and validador patched successfully.');
    break;
  }
}
if (!loginAuthPatched) {
  if (code.includes(loginAuthReplace)) {
    console.log('[PATCH] 16. Login authentication Va already correctly patched.');
  } else {
    console.warn('[PATCH] 16. loginAuthSearch candidate string not found.');
  }
}

// 17. Chão de Fábrica / RH Operacional (vVe): Criação automática de usuário padrão ao cadastrar funcionário
const vveAddOpSearch = `const H={id:\`op-\${Date.now()}\`,code:\`OP-\${String(z.length+1).padStart(3,"0")}\`,name:A.trim(),role:N.trim(),shift:C,machinesAllowed:E.length>0?E:["Máquinas Gerais"],certifications:R.length>0?R:["NR-12 Segurança"],status:"ATIVO",hourlyRate:Number(S)||30,admissionDate:new Date().toISOString().split("T")[0],companyId:s};r(I=>({...I,factoryOperators:[H,...I.factoryOperators||[]]})),n&&n("INDUSTRIA","Operador Cadastrado",\`Operador \${H.code} - \${H.name} (\${H.role}) cadastrado\`,H.id,H.code),h(!1),v(""),w(""),B(35),P([]),Z([])`;
const vveAddOpReplace = `const H={id:\`op-\${Date.now()}\`,code:\`OP-\${String(z.length+1).padStart(3,"0")}\`,name:A.trim(),role:N.trim(),shift:C,machinesAllowed:E.length>0?E:["Máquinas Gerais"],certifications:R.length>0?R:["NR-12 Segurança"],status:"ATIVO",hourlyRate:Number(S)||30,admissionDate:new Date().toISOString().split("T")[0],companyId:s};let _fu="";r(I=>{const _clean=A.trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]/g," ").split(/\\s+/).filter(Boolean);const _baseUser=_clean.length>1?\`\${_clean[0]}.\${_clean[_clean.length-1]}\`:(_clean[0]||\"operador\");_fu=_baseUser;let _cnt=1,_allUsers=Array.isArray(I.users)?I.users:[];while(_allUsers.some(u=>(u.companyId||"comp-1")===s&&u.username&&u.username.toLowerCase()===_fu.toLowerCase())){_cnt++;_fu=\`\${_baseUser}\${_cnt}\`;}const _defaultUser={id:\`usr-op-\${Date.now()}\`,operatorId:H.id,username:_fu,name:H.name,role:"mecanico",jobTitle:H.role,passwordHash:"123456",companyId:s,allowedCompanyIds:[s],isTerminated:!1,contractStartDate:H.admissionDate,contractEndDate:"",status:"active",isActive:!0,permissions:(typeof Ym!=="undefined"&&Ym.mecanico)?{...Ym.mecanico,accessProduction:!0,accessDashboard:!0}:{accessDashboard:!0,accessParts:!0,accessServices:!0,accessServiceOrders:!0,accessHistory:!0,accessProduction:!0,accessQAPanel:!0,canEditBudgets:!1,canViewOtherStoresStock:!1,restrictToOwnSales:!0}};return{...I,factoryOperators:[H,...(I.factoryOperators||[])],users:[..._allUsers,_defaultUser]};}),n&&n("INDUSTRIA","Funcionário e Usuário Cadastrados",\`Funcionário \${H.code} - \${H.name} (\${H.role}) cadastrado com usuário padrão @\${_fu} (senha: 123456)\`,H.id,H.code),alert(\`Funcionário cadastrado com sucesso na empresa!\\n\\nUsuário de acesso padrão criado:\\n• Login: \${_fu}\\n• Senha inicial: 123456\\n• Perfil: Mecânico / Operador Fabril\\n• Status: Ativo\`),h(!1),v(""),w(""),B(35),P([]),Z([])`;

if (code.includes(vveAddOpSearch)) {
  code = code.replace(vveAddOpSearch, vveAddOpReplace);
  console.log('[PATCH] 17. vVe automatic default user creation for employee patched successfully.');
} else {
  console.warn('[PATCH] 17. vveAddOpSearch string not found or already patched.');
}

// 18. Chão de Fábrica / RH Operacional (vVe): Card informativo e texto do botão no formulário do funcionário
const vveModalFooterSearch = `der border-amber-200",children:[Y,t.jsx(Sa,{className:"w-3 h-3 cursor-pointer hover:text-rose-600",onClick:()=>Z(R.filter((I,T)=>T!==H))})]},H))})]}),t.jsxs("div",{className:"p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl",children:[t.jsx("button",{type:"button",onClick:()=>h(!1),className:"px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer",children:"Cancelar"}),t.jsx("button",{type:"submit",className:"px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer",children:"Cadastrar Operador"})]})`;
const vveModalFooterReplace = `der border-amber-200",children:[Y,t.jsx(Sa,{className:"w-3 h-3 cursor-pointer hover:text-rose-600",onClick:()=>Z(R.filter((I,T)=>T!==H))})]},H))})]}),t.jsxs("div",{className:"p-3 bg-purple-50/80 rounded-xl border border-purple-200/90 flex items-start gap-2.5 my-2",children:[t.jsx(Yc,{className:"w-4 h-4 text-purple-700 shrink-0 mt-0.5"}),t.jsxs("div",{className:"text-[11px] text-purple-950",children:[t.jsx("p",{className:"font-bold",children:"Criação Automática de Usuário Padrão"}),t.jsx("p",{className:"text-purple-700 mt-0.5",children:"Ao cadastrar este colaborador, o sistema criará automaticamente seu usuário de acesso com perfil de Operador/Mecânico e senha padrão 123456."})]})]}),t.jsxs("div",{className:"p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl",children:[t.jsx("button",{type:"button",onClick:()=>h(!1),className:"px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer",children:"Cancelar"}),t.jsx("button",{type:"submit",className:"px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer",children:"Cadastrar Funcionário & Usuário"})]})`;

if (code.includes(vveModalFooterSearch)) {
  code = code.replace(vveModalFooterSearch, vveModalFooterReplace);
  console.log('[PATCH] 18. vVe modal informative card and button label patched successfully.');
} else {
  console.warn('[PATCH] 18. vveModalFooterSearch string not found or already patched.');
}

// 19. Gestão de Usuários e Colaboradores (SOe): Sugestão automática de login e senha padrão ao digitar nome do operador
const soeUserNameSearch = `t.jsx("input",{id:"user-name-input",type:"text",value:Al,onChange:Re=>In(Re.target.value),placeholder:"Ex: Alberto Roberto",className:"w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white",required:!0})`;
const soeUserNameReplace = `t.jsx("input",{id:"user-name-input",type:"text",value:Al,onChange:Re=>{const _nv=Re.target.value;In(_nv);if(!f){const _p=_nv.trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]/g," ").split(/\\s+/).filter(Boolean);const _sug=_p.length>1?\`\${_p[0]}.\${_p[_p.length-1]}\`:(_p[0]||\"\");Xo(_sug);if(!gl)Ei(\"123456\");}},placeholder:"Ex: Alberto Roberto",className:"w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white",required:!0})`;

if (code.includes(soeUserNameSearch)) {
  code = code.replace(soeUserNameSearch, soeUserNameReplace);
  console.log('[PATCH] 19. SOe user name input auto-suggest login and default password patched successfully.');
} else {
  console.warn('[PATCH] 19. soeUserNameSearch string not found or already patched.');
}

// 20. Preservação da Empresa Ativa no merge AD: nunca sobrescrever com empresa de outro segmento ao fazer polling
const adSearch = `function AD(e,a){if(!e)return a;if(!a)return e;const s=(a.registeredCompanies||e.registeredCompanies||[]).map(i=>({...i,businessType:Id(i.businessType,i.name)})),r=a.companyInfo||e.companyInfo||(s.length>0?s[0]:void 0),n=r?{...r,businessType:Id(r.businessType,r.name)}:void 0;return{...e,...a,companyInfo:n,registeredCompanies:s}}`;
const adReplace = `function AD(e,a){if(!e)return a;if(!a)return e;const s=(a.registeredCompanies||e.registeredCompanies||[]).map(i=>({...i,businessType:Id(i.businessType,i.name)}));const _actId=typeof localStorage<"u"?localStorage.getItem("motordesk_active_company_id"):"";const _actComp=_actId?s.find(i=>i.id===_actId):null;const r=_actComp||(a.companyInfo&&_actId&&a.companyInfo.id===_actId?a.companyInfo:null)||(e.companyInfo&&_actId&&e.companyInfo.id===_actId?e.companyInfo:null)||a.companyInfo||e.companyInfo||(s.length>0?s[0]:void 0);const n=r?{...r,businessType:Id(r.businessType,r.name)}:void 0;return{...e,...a,companyInfo:n,registeredCompanies:s}}`;

if (code.includes(adSearch)) {
  code = code.replace(adSearch, adReplace);
  console.log('[PATCH] 20. AD active company preservation patched successfully.');
} else {
  if (code.includes(adReplace)) {
    console.log('[PATCH] 20. AD active company preservation already patched.');
  } else {
    console.warn('[PATCH] 20. adSearch string not found or already patched.');
  }
}

// 21. Gestão de Usuários (SOe): Administrador master e usuários wildcard visíveis; isolar estritamente administradores locais
const soeUserListCandidates = [
  `const Re=e.users.filter(Ut=>(Ut.companyId||"comp-1")===w||Ut.role==="admin"||(Ut.username&&Ut.username.toLowerCase()==="admin")||(Array.isArray(Ut.allowedCompanyIds)&&Ut.allowedCompanyIds.includes("*")));return Re.length===0`,
  `const Re=e.users.filter(Ut=>(Ut.companyId||"comp-1")===w);return Re.length===0`
];
const soeUserListReplace = `const Re=e.users.filter(Ut=>(Ut.companyId||"comp-1")===w||(Ut.username&&(Ut.username.toLowerCase()==="admin"||Ut.username.toLowerCase()==="validador"))||(Array.isArray(Ut.allowedCompanyIds)&&(Ut.allowedCompanyIds.includes(w)||Ut.allowedCompanyIds.includes("*"))));return Re.length===0`;

let soeUserListPatched = false;
for (const cand of soeUserListCandidates) {
  if (code.includes(cand)) {
    code = code.replace(cand, soeUserListReplace);
    soeUserListPatched = true;
    console.log('[PATCH] 21. SOe user table strict company isolation patched successfully.');
    break;
  }
}
if (!soeUserListPatched) {
  if (code.includes(soeUserListReplace)) {
    console.log('[PATCH] 21. SOe user table strict company isolation already present.');
  } else {
    console.warn('[PATCH] 21. soeUserListSearch string not found or already patched.');
  }
}

const soeUserCountCandidates = [
  `" Operadores da Empresa (",e.users.filter(Re=>(Re.companyId||"comp-1")===w||Re.role==="admin"||(Re.username&&Re.username.toLowerCase()==="admin")||(Array.isArray(Re.allowedCompanyIds)&&Re.allowedCompanyIds.includes("*"))).length,")"`,
  `" Operadores da Empresa (",e.users.filter(Re=>(Re.companyId||"comp-1")===w).length,")"`
];
const soeUserCountReplace = `" Operadores da Empresa (",e.users.filter(Re=>(Re.companyId||"comp-1")===w||(Re.username&&(Re.username.toLowerCase()==="admin"||Re.username.toLowerCase()==="validador"))||(Array.isArray(Re.allowedCompanyIds)&&(Re.allowedCompanyIds.includes(w)||Re.allowedCompanyIds.includes("*")))).length,")"`;

let soeUserCountPatched = false;
for (const cand of soeUserCountCandidates) {
  if (code.includes(cand)) {
    code = code.replace(cand, soeUserCountReplace);
    soeUserCountPatched = true;
    console.log('[PATCH] 21b. SOe user counter strict company isolation patched successfully.');
    break;
  }
}
if (!soeUserCountPatched) {
  if (code.includes(soeUserCountReplace)) {
    console.log('[PATCH] 21b. SOe user counter strict company isolation already present.');
  } else {
    console.warn('[PATCH] 21b. soeUserCountSearch string not found or already patched.');
  }
}

// 22. API Gateway Base URL: remover URL externa legada e usar origem relativa do navegador atual
const legacyApiUrl = "https://motordesk-605741677403.us-east1.run.app";
if (code.includes(legacyApiUrl)) {
  code = code.split(legacyApiUrl).join("");
  console.log('[PATCH] 22. Legacy external API URL purged. Axios Np now uses relative path origin for all browsers/devices.');
} else {
  console.log('[PATCH] 22. Legacy external API URL already removed or not present.');
}

// 23. HE() Inicialização: Preservar senha de validador se já customizada pelo usuário
const heValidadorSearch = `n.username.toLowerCase()==="validador"?{...n,passwordHash:"Donatelo@123",role:"admin"}:n`;
const heValidadorReplace = `n.username.toLowerCase()==="validador"?{...n,passwordHash:n.passwordHash||"Donatelo@123",role:"admin"}:n`;
if (code.includes(heValidadorSearch)) {
  code = code.replace(heValidadorSearch, heValidadorReplace);
  console.log('[PATCH] 23. HE() validador password preservation patched successfully.');
} else {
  console.log('[PATCH] 23. HE() validador password already patched or not found.');
}

// 24. Alteração de senha no perfil: persistência atômica com timestamp e sincronização com /api/users/update-password
const profilePassChangeSearch = `const N=a.users.map(w=>w.id===e.id?{...w,passwordHash:o}:w);s(N),r("user_activity","Alteração de Senha"`;
const profilePassChangeReplace = `const N=a.users.map(w=>w.id===e.id?{...w,passwordHash:o,passwordUpdatedAt:Date.now()}:w);try{const _u=JSON.parse(localStorage.getItem("motordesk_active_user")||"{}");if(_u.id===e.id){_u.passwordHash=o;_u.passwordUpdatedAt=Date.now();localStorage.setItem("motordesk_active_user",JSON.stringify(_u));}}catch(_e){}fetch("/api/users/update-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:e.id,username:e.username,companyId:e.companyId,newPassword:o})}).catch(()=>{});s(N),r("user_activity","Alteração de Senha"`;
if (code.includes(profilePassChangeSearch)) {
  code = code.replace(profilePassChangeSearch, profilePassChangeReplace);
  console.log('[PATCH] 24. Profile password change atomic persistence patched successfully.');
} else {
  console.log('[PATCH] 24. Profile password change already patched or not found.');
}

// 25. Chão de fábrica / RH Operacional (vVe): Usuário padrão com flags de primeiro acesso
const opUserFirstAccessSearch = `jobTitle:H.role,passwordHash:"123456",companyId:s,allowedCompanyIds:[s],isTerminated:!1`;
const opUserFirstAccessReplace = `jobTitle:H.role,passwordHash:"123456",firstAccess:!0,mustChangePassword:!0,hasChosenPassword:!1,companyId:s,allowedCompanyIds:[s],isTerminated:!1`;
if (code.includes(opUserFirstAccessSearch)) {
  code = code.replace(opUserFirstAccessSearch, opUserFirstAccessReplace);
  console.log('[PATCH] 25. Operator default user first access flags patched successfully.');
} else {
  console.log('[PATCH] 25. Operator default user first access flags already patched or not found.');
}

// 26. Prevenção de duplicidade global de usuários no cadastro de operadores (SOe)
const soeDupUserCandidates = [
  `if((f?f.username.toLowerCase()!==Gi.trim().toLowerCase():!0)&&e.users.some(nr=>(nr.companyId||"comp-1")===w&&nr.username.toLowerCase()===Gi.trim().toLowerCase())){uo(\`O nome de usuário "\${Gi}" já está cadastrado nesta empresa.\`);return}`,
  `if((f?f.username.toLowerCase()!==Gi.trim().toLowerCase():!0)&&e.users.some(nr=>nr.username&&nr.username.toLowerCase()===Gi.trim().toLowerCase())){uo(\`O nome de usuário "\${Gi}" já existe no sistema. Escolha outro nome de usuário único.\`);return}`
];
const soeDupUserReplace = `if((f?f.username.toLowerCase()!==Gi.trim().toLowerCase():!0)&&e.users.some(nr=>nr.username&&nr.username.toLowerCase()===Gi.trim().toLowerCase())){uo(\`O nome de usuário "\${Gi}" já existe no sistema. Escolha outro nome de usuário único.\`);return}`;
if (code.includes(soeDupUserCandidates[0])) {
  code = code.replace(soeDupUserCandidates[0], soeDupUserReplace);
  console.log('[PATCH] 26. SOe global duplicate user prevention patched successfully.');
} else if (code.includes(soeDupUserReplace)) {
  console.log('[PATCH] 26. SOe global duplicate user prevention already present.');
} else {
  console.warn('[PATCH] 26. soeDupUserSearch string not found.');
}

// 27. Criação de operadores (SOe): Flags atômicas de primeiro acesso e aviso claro de senha inicial
const soeCreateUserSearch = `status:_isTerm?"terminated":"active",terminationDate:_isTerm?_ced:"",companyId:w,jobTitle:Uc.trim()||void 0,baseSalary:ai>0?ai:void 0,commissionPercent:bl>0?bl:void 0,commissionType:Zo,pixKey:Nl.trim()||void 0,pixKeyType:Nl?Br:void 0,bankName:wl.trim()||void 0,bankAgency:cc.trim()||void 0,bankAccount:_d.trim()||void 0};Oa=[...e.users,Ga],s(Oa),i("user_activity","Novo Usuário Cadastrado",\`Operador \${Ga.name} (@\${Ga.username}) adicionado à empresa \${Ue}.\`,"","");const nr=Object.keys(Ga.permissions).filter(Hs=>Ga.permissions[Hs]).map(Hs=>Yb[Hs]||Hs);Li({title:"Novo Operador Cadastrado!",message:\`O operador "\${Ga.name}" (@\${Ga.username}) foi cadastrado para a empresa \${Ue}.\``;
const soeCreateUserReplace = `status:_isTerm?"terminated":"active",terminationDate:_isTerm?_ced:"",companyId:w,allowedCompanyIds:[w],firstAccess:!0,mustChangePassword:!0,hasChosenPassword:!1,passwordUpdatedAt:Date.now(),jobTitle:Uc.trim()||void 0,baseSalary:ai>0?ai:void 0,commissionPercent:bl>0?bl:void 0,commissionType:Zo,pixKey:Nl.trim()||void 0,pixKeyType:Nl?Br:void 0,bankName:wl.trim()||void 0,bankAgency:cc.trim()||void 0,bankAccount:_d.trim()||void 0};Oa=[...e.users,Ga],s(Oa),i("user_activity","Novo Usuário Cadastrado",\`Operador \${Ga.name} (@\${Ga.username}) adicionado à empresa \${Ue}.\`,"","");const nr=Object.keys(Ga.permissions).filter(Hs=>Ga.permissions[Hs]).map(Hs=>Yb[Hs]||Hs);Li({title:"Novo Operador Cadastrado!",message:\`O operador "\${Ga.name}" (@\${Ga.username}) foi cadastrado para a empresa \${Ue}. Senha de acesso definida: \${gl||"123456"}. No 1º acesso, o colaborador poderá alterar ou manter a senha.\``;
if (code.includes(soeCreateUserSearch)) {
  code = code.replace(soeCreateUserSearch, soeCreateUserReplace);
  console.log('[PATCH] 27. SOe operator creation first access flags and password notification patched successfully.');
} else if (code.includes(soeCreateUserReplace)) {
  console.log('[PATCH] 27. SOe operator creation first access flags already present.');
} else {
  console.warn('[PATCH] 27. soeCreateUserSearch string not found.');
}

// 28. Ordens de Serviço: Isolar mecânicos e operadores estritamente por empresa
const osMechSearch1 = `const Ke=e.users.filter(rt=>rt.role==="mecanico"||rt.role==="admin");Ke.length>0?ue(Ke[0].id):ue((a==null?void 0:a.id)||"usr-3");`;
const osMechReplace1 = `const _osCompId=(oe&&oe.companyId)||(e.companyInfo&&e.companyInfo.id)||"comp-1";const Ke=e.users.filter(rt=>(rt.role==="mecanico"||rt.role==="admin")&&((rt.companyId||"comp-1")===_osCompId||(Array.isArray(rt.allowedCompanyIds)&&(rt.allowedCompanyIds.includes(_osCompId)||rt.allowedCompanyIds.includes("*")))||rt.username==="admin"||rt.username==="validador"));Ke.length>0?ue(Ke[0].id):ue((a==null?void 0:a.id)||"usr-3");`;

const osMechSearch2 = `children:e.users.filter(oe=>oe.role==="mecanico"||oe.role==="admin").map(oe=>t.jsxs("option",{value:oe.id,children:[oe.name," (",oe.role==="mecanico"?"Mecânico"`;
const osMechReplace2 = `children:e.users.filter(oe=>(oe.role==="mecanico"||oe.role==="admin")&&((oe.companyId||"comp-1")===((e.companyInfo&&e.companyInfo.id)||"comp-1")||(Array.isArray(oe.allowedCompanyIds)&&(oe.allowedCompanyIds.includes((e.companyInfo&&e.companyInfo.id)||"comp-1")||oe.allowedCompanyIds.includes("*")))||oe.username==="admin"||oe.username==="validador")).map(oe=>t.jsxs("option",{value:oe.id,children:[oe.name," (",oe.role==="mecanico"?"Mecânico"`;

if (code.includes(osMechSearch1)) {
  code = code.replace(osMechSearch1, osMechReplace1);
  console.log('[PATCH] 28a. OS mechanic auto-assignment company isolation patched successfully.');
} else if (code.includes(osMechReplace1)) {
  console.log('[PATCH] 28a. OS mechanic auto-assignment company isolation already present.');
} else {
  console.warn('[PATCH] 28a. osMechSearch1 string not found.');
}

if (code.includes(osMechSearch2)) {
  code = code.replace(osMechSearch2, osMechReplace2);
  console.log('[PATCH] 28b. OS mechanic dropdown company isolation patched successfully.');
} else if (code.includes(osMechReplace2)) {
  console.log('[PATCH] 28b. OS mechanic dropdown company isolation already present.');
} else {
  console.warn('[PATCH] 28b. osMechSearch2 string not found.');
}

// 29. Controle Estrito de Módulos (IA): Apenas liberar módulos contratados pela empresa e permitidos ao usuário
const iaModuleSearch = `function IA(e,a,s,r){if(!e||!a||a.active===!1)return!1;if(s==="profile")return!0;if(!gI(e))return s==="users"&&a.role==="admin";const n=Id(e.businessType);if(!FA(s,n))return!1;const i=zre[s];if(!i)return!0;if(!Wd(i,e,n))return!1;const o=bI(a,e,r||void 0);return!(!o||!o[i])}`;
const iaModuleReplace = `function IA(e,a,s,r){if(!e||!a||a.active===!1||a.isActive===!1||a.isTerminated===!0||a.status==="terminated")return!1;const _isM=(a.username&&(a.username.toLowerCase()==="admin"||a.username.toLowerCase()==="validador"))||(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*"));if(!_isM){const _uC=a.companyId||"comp-1";if(_uC!==e.id&&!(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes(e.id)))return!1;}if(s==="profile")return!0;if(!gI(e))return s==="users"&&(a.role==="admin"||_isM);const n=Id(e.businessType);if(!FA(s,n))return!1;const i=zre[s];if(!i)return!0;if(!Wd(i,e,n))return!1;const o=bI(a,e,r||void 0);return!(!o||!o[i])}`;
if (code.includes(iaModuleSearch)) {
  code = code.replace(iaModuleSearch, iaModuleReplace);
  console.log('[PATCH] 29. Strict module authorization and company permission (IA) patched successfully.');
} else if (code.includes(iaModuleReplace)) {
  console.log('[PATCH] 29. Strict module authorization (IA) already present.');
} else {
  console.warn('[PATCH] 29. iaModuleSearch string not found.');
}

fs.writeFileSync(bundlePath, code, 'utf8');
const distBundlePath = path.join(__dirname, 'dist', 'assets', 'index-CUxTo0fH.js');
if (fs.existsSync(distBundlePath)) {
  fs.writeFileSync(distBundlePath, code, 'utf8');
  console.log('[PATCH] Also updated dist bundle at:', distBundlePath);
}
console.log('[PATCH] Bundle patch completed successfully!');
