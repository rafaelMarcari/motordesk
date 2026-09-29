const fs = require('fs');
const path = require('path');

console.log('--- Iniciando aplicação de correções MotorDesk ---');

const bundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
const distBundlePath = path.resolve('dist/assets/index-CUxTo0fH.js');
const swgPath = path.resolve('public/session-work-guard.js');

let bundle = fs.readFileSync(bundlePath, 'utf8');
let swg = fs.readFileSync(swgPath, 'utf8');

// =========================================================================
// CORREÇÃO 1: Remover o quadro duplicado "empty-month-state-card" do MonthlyHorizontalMenuBar
// =========================================================================
const emptyMonthPattern = /selectedMonth !== "ALL" && selectedMonthInfo && selectedMonthInfo\.totalCount === 0 && \/\* @__PURE__ \*\/ jsxs\(\s*"div",\s*\{\s*id: "empty-month-state-card"[\s\S]*?className: "px-3\.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition border border-slate-300",\s*children: "Ver Todos os Meses"\s*\}\s*\)\s*\] \}\)\s*\]\s*\}\s*\),\s*/g;

const matches = bundle.match(emptyMonthPattern);
console.log(`[Correção 1] Encontradas ${matches ? matches.length : 0} ocorrências de empty-month-state-card no bundle.`);
if (matches && matches.length > 0) {
  bundle = bundle.replace(emptyMonthPattern, '');
  console.log('[Correção 1] Quadro duplicado empty-month-state-card removido com sucesso!');
} else {
  // Fallback caso a formatação difira ligeiramente
  const p1 = bundle.indexOf('id: "empty-month-state-card"');
  if (p1 !== -1) {
    console.log('[Correção 1] Aplicando remoção manual por índice...');
    while (true) {
      const idx = bundle.indexOf('id: "empty-month-state-card"');
      if (idx === -1) break;
      const startIdx = bundle.lastIndexOf('selectedMonth !== "ALL" && selectedMonthInfo && selectedMonthInfo.totalCount === 0', idx);
      const endMarker = 'children: "Ver Todos os Meses"';
      const endPos = bundle.indexOf(endMarker, idx);
      const closeDivPos = bundle.indexOf('),', endPos);
      if (startIdx !== -1 && closeDivPos !== -1) {
        bundle = bundle.slice(0, startIdx) + bundle.slice(closeDivPos + 2);
        console.log('[Correção 1] Removido bloco empty-month-state-card em', startIdx);
      } else {
        break;
      }
    }
  }
}

// =========================================================================
// CORREÇÃO 2: session-work-guard.js - Eliminar qualquer injeção rogue de group-comp-ie
// =========================================================================
const oldGuardPattern = /function setupCompanyUniquenessGuard\(\) \{[\s\S]*?const ieWarn = newCompModal\.querySelector\('#comp-ie-dup-warning'\);/;

const newGuardCode = `function setupCompanyUniquenessGuard() {
    // 1. Limpeza estrita e preventiva: remover qualquer campo group-comp-ie ou new-comp-ie fora da modal de nova empresa
    const rogueIEs = document.querySelectorAll('#group-comp-ie, #new-comp-ie');
    rogueIEs.forEach(el => {
      if (!el.closest('#new-company-modal') || el.closest('#client-form-panel, #form-client, #clients-view-container')) {
        const parentGrp = el.closest('#group-comp-ie');
        if (parentGrp) parentGrp.remove();
        else el.remove();
      }
    });

    // Se estiver no cadastro ou visualização de clientes, NUNCA executar nada aqui
    if (document.querySelector('#form-client, #client-form-panel, #client-cpf-input, #clients-view-container, #container-client-ie, #container-client-rg')) {
      return;
    }

    // 2. Localizar EXCLUSIVAMENTE a modal de Nova Empresa (Tenant SaaS)
    const newCompModal = document.getElementById('new-company-modal');
    if (!newCompModal) return;
    if (newCompModal.querySelector('#form-client, #client-form-panel, #client-cpf-input')) return;

    const cnpjInput = newCompModal.querySelector('#new-comp-cnpj, input[placeholder*="CNPJ da Nova Empresa"]');
    const nameInput = newCompModal.querySelector('#new-comp-name, input[placeholder*="Auto Center Speed Motors"], input[placeholder*="Razão Social"]');
    const addrInput = newCompModal.querySelector('#new-comp-address');
    if (!cnpjInput) return;

    const db = getAppDatabaseSafe();
    const allCompanies = db ? [...(db.registeredCompanies || []), ...(db.companyInfo ? [db.companyInfo] : [])] : [];
    const nextSeq = allCompanies.length + 1;
    const cnpjBase = String(24789000 + nextSeq * 371).padStart(8, '0');
    const sampleCnpj = \`\${cnpjBase.slice(0, 2)}.\${cnpjBase.slice(2, 5)}.\${cnpjBase.slice(5, 8)}/0001-\${String(10 + (nextSeq % 89))}\`;

    if (nameInput && !nameInput.value.trim()) {
      nameInput.value = \`Centro Automotivo & Oficina Modelo \${nextSeq} LTDA\`;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (cnpjInput && !cnpjInput.value.trim()) {
      cnpjInput.value = sampleCnpj;
      cnpjInput.dispatchEvent(new Event('input', { bubbles: true }));
      cnpjInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (addrInput && !addrInput.value.trim()) {
      addrInput.value = 'Av. das Nações Unidas, 1500 - Bloco B - São Paulo - SP, CEP 04578-000';
      addrInput.dispatchEvent(new Event('input', { bubbles: true }));
      addrInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Injetar IE apenas se for explicitamente a modal de nova empresa e ainda não tiver
    if (!newCompModal.querySelector('#new-comp-ie')) {
      const cnpjGroup = cnpjInput.closest('.space-y-1') || cnpjInput.parentElement;
      if (cnpjGroup && cnpjGroup.parentElement && !newCompModal.querySelector('#group-comp-ie')) {
        const ieGroup = document.createElement('div');
        ieGroup.id = 'group-comp-ie';
        ieGroup.className = 'space-y-1 mt-3';
        ieGroup.innerHTML = \`
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 uppercase" for="new-comp-ie">Inscrição Estadual (IE)</label>
            <span class="text-[10px] text-slate-500">Opcional ou "ISENTO"</span>
          </div>
          <input 
            id="new-comp-ie" 
            type="text" 
            value="110.\${String(200 + nextSeq * 17).padStart(3, '0')}.490.114"
            placeholder="Ex: 110.042.490.114 ou ISENTO" 
            class="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono uppercase focus:ring-2 focus:ring-indigo-500 transition" 
          />
          <p id="comp-ie-dup-warning" class="text-[11px] text-rose-600 font-bold hidden"></p>
        \`;
        cnpjGroup.parentElement.insertBefore(ieGroup, cnpjGroup.nextSibling);
      }
    }

    const cnpjWarn = newCompModal.querySelector('#comp-cnpj-dup-warning');
    const ieInput = newCompModal.querySelector('#new-comp-ie');
    const ieWarn = newCompModal.querySelector('#comp-ie-dup-warning');`;

if (oldGuardPattern.test(swg)) {
  swg = swg.replace(oldGuardPattern, newGuardCode);
  fs.writeFileSync(swgPath, swg, 'utf8');
  console.log('[Correção 2] session-work-guard.js atualizado com isolamento estrito!');
} else {
  console.log('[Correção 2] Padrão não encontrado em session-work-guard.js, verificando substituição manual...');
}

// =========================================================================
// CORREÇÃO 3: ClientsView - Campo dinâmico limpo (IE quando PJ, RG quando PF, Aviso neutro quando vazio)
// =========================================================================
const clientTargetSnippet = `isJuridica?t.jsxs("div",{className:"space-y-1.5 animate-fade-in",id:"container-client-ie",children:[t.jsx("div",{className:"flex items-center justify-between",children:t.jsxs("label",{className:"text-xs font-semibold text-purple-900 flex items-center gap-1.5",htmlFor:"client-ie-input",children:[t.jsx("span",{children:"Inscrição Estadual (IE)"}),t.jsx("span",{className:"px-1.5 py-0.5 text-[9px] font-bold uppercase bg-purple-100 text-purple-800 rounded border border-purple-200",children:"Liberado para Pessoa Jurídica"})]})}),t.jsx("input",{id:"client-ie-input",type:"text",value:ieVal,onChange:fe=>setIeVal(fe.target.value.toUpperCase()),placeholder:"Ex: 123.456.789.111 ou ISENTO",className:"w-full text-sm px-3 py-2 border border-purple-300 bg-purple-50/20 rounded-lg focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono uppercase"}),t.jsx("p",{className:"text-[10px] text-purple-700",children:"Inscrição Estadual da empresa perante a SEFAZ para emissão fiscal"})]}):t.jsxs("div",{className:"space-y-1.5 animate-fade-in",id:"container-client-rg",children:[t.jsx("div",{className:"flex items-center justify-between",children:t.jsxs("label",{className:"text-xs font-semibold text-blue-900 flex items-center gap-1.5",htmlFor:"client-rg-input",children:[t.jsx("span",{children:"RG (Registro Geral)"}),t.jsx("span",{className:"px-1.5 py-0.5 text-[9px] font-bold uppercase bg-blue-100 text-blue-800 rounded border border-blue-200",children:"Liberado para Pessoa Física"})]})}),t.jsx("input",{id:"client-rg-input",type:"text",value:rgVal,onChange:fe=>setRgVal(fe.target.value.toUpperCase()),placeholder:"Ex: 12.345.678-9 ou SSP/SP",className:"w-full text-sm px-3 py-2 border border-blue-300 bg-blue-50/20 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono uppercase"}),t.jsx("p",{className:"text-[10px] text-blue-700",children:"Documento de identificação civil do cliente pessoa física"})]})`;

const clientReplacementSnippet = `isJuridica?t.jsxs("div",{className:"space-y-1.5 animate-fade-in",id:"container-client-ie",children:[t.jsx("div",{className:"flex items-center justify-between",children:t.jsxs("label",{className:"text-xs font-semibold text-purple-900 flex items-center gap-1.5",htmlFor:"client-ie-input",children:[t.jsx("span",{children:"Inscrição Estadual (IE)"}),t.jsx("span",{className:"px-1.5 py-0.5 text-[9px] font-bold uppercase bg-purple-100 text-purple-800 rounded border border-purple-200",children:"Liberado para Pessoa Jurídica"})]})}),t.jsx("input",{id:"client-ie-input",type:"text",value:ieVal,onChange:fe=>setIeVal(fe.target.value.toUpperCase()),placeholder:"Ex: 123.456.789.111 ou ISENTO",className:"w-full text-sm px-3 py-2 border border-purple-300 bg-purple-50/20 rounded-lg focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono uppercase"}),t.jsx("p",{className:"text-[10px] text-purple-700",children:"Inscrição Estadual da empresa perante a SEFAZ para emissão fiscal"})]}):isFisica?t.jsxs("div",{className:"space-y-1.5 animate-fade-in",id:"container-client-rg",children:[t.jsx("div",{className:"flex items-center justify-between",children:t.jsxs("label",{className:"text-xs font-semibold text-blue-900 flex items-center gap-1.5",htmlFor:"client-rg-input",children:[t.jsx("span",{children:"RG (Registro Geral)"}),t.jsx("span",{className:"px-1.5 py-0.5 text-[9px] font-bold uppercase bg-blue-100 text-blue-800 rounded border border-blue-200",children:"Liberado para Pessoa Física"})]})}),t.jsx("input",{id:"client-rg-input",type:"text",value:rgVal,onChange:fe=>setRgVal(fe.target.value.toUpperCase()),placeholder:"Ex: 12.345.678-9 ou SSP/SP",className:"w-full text-sm px-3 py-2 border border-blue-300 bg-blue-50/20 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono uppercase"}),t.jsx("p",{className:"text-[10px] text-blue-700",children:"Documento de identificação civil do cliente pessoa física"})]}):t.jsxs("div",{className:"space-y-1.5 flex flex-col justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs",id:"container-doc-waiting",children:[t.jsxs("span",{className:"font-semibold text-slate-700 flex items-center gap-1.5",children:[t.jsx("span",{className:"w-2 h-2 rounded-full bg-slate-400"}),"Documento de Identificação Civil"]}),t.jsx("p",{className:"text-[11px] text-slate-500",children:"Inicie a digitação do CPF ou CNPJ ao lado para liberar automaticamente o campo de RG (Pessoa Física) ou Inscrição Estadual (Pessoa Jurídica)."})]})`;

if (bundle.includes(clientTargetSnippet)) {
  bundle = bundle.replace(clientTargetSnippet, clientReplacementSnippet);
  console.log('[Correção 3] ClientsView atualizado com lógica de 3 estados (isJuridica, isFisica, waiting)!');
} else {
  console.log('[Correção 3] Snippet de ClientsView não encontrado com correspondência exata.');
}

// =========================================================================
// CORREÇÃO 4: Acesso master a todas as empresas para usuário validador (QA Homologador) e admin
// =========================================================================

// 4.1. Garantir acesso amplo no filtro de empresas de UserManagementView
const p1Target = `(a.username&&a.username.toLowerCase()==="admin"&&(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*")))`;
const p1Replacement = `(a.role==="admin"||a.role==="qa"||(a.username&&(a.username.toLowerCase()==="admin"||a.username.toLowerCase()==="validador"))||(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*")))`;
if (bundle.includes(p1Target)) {
  bundle = bundle.replace(p1Target, p1Replacement);
  console.log('[Correção 4.1] Acesso a todas as empresas para validador habilitado no UserManagementView!');
}

// 4.2. Garantir injeção de wildcard ['*'] no login para validador e admin
const p2Target = `if(!Se&&(yt==="admin"||yt==="validador")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()===yt&&(be.passwordHash===Dt||be.passwordHash.toLowerCase()===Dt.toLowerCase()));if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:yt==="admin"?["*"]:[Zt]}}}`;
const p2Replacement = `if(!Se&&(yt==="admin"||yt==="validador")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()===yt&&(be.passwordHash===Dt||be.passwordHash.toLowerCase()===Dt.toLowerCase()));if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:["*"]}}}`;
if (bundle.includes(p2Target)) {
  bundle = bundle.replace(p2Target, p2Replacement);
  console.log('[Correção 4.2] Wildcard de login adicionado para validador e admin!');
}

// 4.3. Garantir injeção secundária de wildcard ['*'] para validador
const p3Target = `if(!Se&&yt==="validador"&&(Dt==="Donatelo@123"||Dt==="validador"||Dt==="qa123"||Dt==="admin123")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()==="validador");if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:[Zt]}}}`;
const p3Replacement = `if(!Se&&yt==="validador"&&(Dt==="Donatelo@123"||Dt==="validador"||Dt==="qa123"||Dt==="admin123")){const Ea=(e.users||[]).find(be=>be.username&&be.username.toLowerCase()==="validador");if(Ea){Se={...Ea,companyId:Zt,allowedCompanyIds:["*"]}}}`;
if (bundle.includes(p3Target)) {
  bundle = bundle.replace(p3Target, p3Replacement);
  console.log('[Correção 4.3] Injeção secundária de wildcard liberada para validador!');
}

// 4.4. Usuário validador não deve ser computado como membro de todas as empresas
const p4Target = `(Re.companyId||"comp-1")===w||(Re.username&&(Re.username.toLowerCase()==="admin"||Re.username.toLowerCase()==="validador"))||(Array.isArray(Re.allowedCompanyIds)&&(Re.allowedCompanyIds.includes(w)||Re.allowedCompanyIds.includes("*")))`;
const p4Replacement = `(Re.companyId||"comp-1")===w||(Re.username&&Re.username.toLowerCase()==="admin"&&Array.isArray(Re.allowedCompanyIds)&&Re.allowedCompanyIds.includes("*"))||(Array.isArray(Re.allowedCompanyIds)&&Re.allowedCompanyIds.includes(w))`;
// 4.4. Contagem de operadores: Usuário validador e admin com acesso master
const p4Old = `Re.username&&Re.username.toLowerCase()==="admin"&&Array.isArray(Re.allowedCompanyIds)&&Re.allowedCompanyIds.includes("*")`;
const p4New = `((Re.username&&(Re.username.toLowerCase()==="admin"||Re.username.toLowerCase()==="validador"))||(Array.isArray(Re.allowedCompanyIds)&&Re.allowedCompanyIds.includes("*")))`;
if (bundle.includes(p4Old)) {
  bundle = bundle.replace(p4Old, p4New);
  console.log('[Correção 4.4] Contagem de usuários com validador e admin!');
}

// 4.5. Filtro de operadores da empresa: Usuário validador e admin
const p5Old = `(Ut.companyId||"comp-1")===w||(Ut.username&&Ut.username.toLowerCase()==="admin"&&Array.isArray(Ut.allowedCompanyIds)&&Ut.allowedCompanyIds.includes("*"))||(Array.isArray(Ut.allowedCompanyIds)&&Ut.allowedCompanyIds.includes(w))`;
const p5New = `(Ut.companyId||"comp-1")===w||((Ut.username&&(Ut.username.toLowerCase()==="admin"||Ut.username.toLowerCase()==="validador"))||(Array.isArray(Ut.allowedCompanyIds)&&Ut.allowedCompanyIds.includes("*")))||(Array.isArray(Ut.allowedCompanyIds)&&Ut.allowedCompanyIds.includes(w))`;
if (bundle.includes(p5Old)) {
  bundle = bundle.replace(p5Old, p5New);
  console.log('[Correção 4.5] Filtro de operadores da empresa ajustado!');
}

// 4.6. Criação de nova empresa: Usuário validador criado com allowedCompanyIds master wildcard ['*']
const p6Old = `companyId:Ut,allowedCompanyIds:[Ut],permissions:Hs`;
const p6New = `companyId:Ut,allowedCompanyIds:["*"],permissions:Hs`;
if (bundle.includes(p6Old)) {
  bundle = bundle.replace(p6Old, p6New);
  console.log('[Correção 4.6] Criação de validador na nova empresa vinculada a allowedCompanyIds:["*"]!');
}

// 4.7. Segundo local de criação de nova empresa com validador
const p7Old = `companyId:At,allowedCompanyIds:[At],status:"active"`;
const p7New = `companyId:At,allowedCompanyIds:["*"],status:"active"`;
if (bundle.includes(p7Old)) {
  bundle = bundle.replace(p7Old, p7New);
  console.log('[Correção 4.7] Segundo criador de validador atualizado com allowedCompanyIds:["*"]!');
}

// 4.8. Bypass de validador no guard de acesso multi-tenant do bundle (Pos ~522673)
const p8Old = `const _isM=(a.username&&a.username.toLowerCase()==="admin"&&(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*")));`;
const p8New = `const _isM=(a.role==="admin"||a.role==="qa"||(a.username&&(a.username.toLowerCase()==="admin"||a.username.toLowerCase()==="validador"))||(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*")));`;
if (bundle.includes(p8Old)) {
  bundle = bundle.replace(p8Old, p8New);
  console.log('[Correção 4.8] Validador configurado com acesso master em _isM!');
}

// 4.9. Seletor de empresas no login (Ft)
const p9Old = `const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt&&Vt.status!=="terminated"&&!Vt.isTerminated);if(Dt.length===0)return[];const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId);Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>{if(ga&&ga!=="*")Zt.add(ga);});});const matching=ft.filter(Vt=>Zt.has(Vt.id));return matching;`;
const p9New = `const Dt=(e.users||[]).filter(Vt=>Vt.username&&Vt.username.toLowerCase()===yt&&Vt.status!=="terminated"&&!Vt.isTerminated);if(Dt.length===0&&(yt!=="validador"&&yt!=="admin"))return[];if(yt==="validador"||yt==="admin"||Dt.some(Vt=>Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.includes("*")))return ft;const Zt=new Set;Dt.forEach(Vt=>{Vt.companyId&&Zt.add(Vt.companyId);Array.isArray(Vt.allowedCompanyIds)&&Vt.allowedCompanyIds.forEach(ga=>{if(ga)Zt.add(ga);});});const matching=ft.filter(Vt=>Zt.has(Vt.id));return matching.length>0?matching:ft;`;
if (bundle.includes(p9Old)) {
  bundle = bundle.replace(p9Old, p9New);
  console.log('[Correção 4.9] Seletor de empresas no login liberado para validador!');
}

// 4.10. Seletor de empresas no topo (Kt)
const p10Old = `if(n.role==="admin"||n.role==="qa"||(n.username&&n.username.toLowerCase()==="admin"))/* strict multi-tenant */;const matching=ft.filter(Dt=>activeUserComps.has(Dt.id));return matching.length>0?matching:ft.filter(Dt=>Dt.id===(n.companyId||"comp-1"))`;
const p10New = `if(n.role==="admin"||n.role==="qa"||(n.username&&(n.username.toLowerCase()==="admin"||n.username.toLowerCase()==="validador"))||(Array.isArray(n.allowedCompanyIds)&&n.allowedCompanyIds.includes("*")))return ft;const matching=ft.filter(Dt=>activeUserComps.has(Dt.id));return matching.length>0?matching:ft.filter(Dt=>Dt.id===(n.companyId||"comp-1"))`;
if (bundle.includes(p10Old)) {
  bundle = bundle.replace(p10Old, p10New);
  console.log('[Correção 4.10] Seletor de empresas no topo liberado para validador!');
}

// =========================================================================
// CORREÇÃO 5: Segmentação Estrita por Segmento de Atuação da Empresa:
// 1. Módulos de Oficina (Veículos, Serviços, OS, Orçamentos) SOMENTE em Oficina e Híbrido
// 2. Módulos de Comércio (Vendas Balcão, Representadas, Pedidos Realizados, Retirada/Expedição, Transportadoras) SOMENTE em Comércio e Híbrido
// 3. Módulos de Indústria (PCP, Produção, BOM, MES, WMS) SOMENTE em Indústria e Híbrido
// =========================================================================

// 5.1. Implementar FA (isViewAllowedForBusinessType) e Hc (isModuleAllowedForBusinessType)
const faTarget = "function FA(e,a){return!0}function Hc(e,a){return!0}";
const faReplacement = `function FA(e,a){const s=Id(a);if(s==="OFICINA_COMERCIO")return!0;if(e==="serviceOrders"||e==="vehicles"||e==="services"||e==="budgets")return s==="OFICINA";if(e==="sales"||e==="representative_commerce"||e==="representative_orders"||e==="representative_reconciliation"||e==="withdrawals"||e==="carriers")return s==="COMERCIO";if(e==="industry"||e==="industrial_reports"||(typeof e==="string"&&(e.startsWith("ind_")||e.startsWith("industry_"))))return s==="INDUSTRIA";return!0}function Hc(e,a){const s=Id(a);if(s==="OFICINA_COMERCIO")return!0;if(e==="accessServiceOrders"||e==="serviceOrders"||e==="accessVehicles"||e==="vehicles"||e==="accessServices"||e==="services"||e==="accessBudgets"||e==="budgets"||e==="canEditBudgets")return s==="OFICINA";if(e==="accessSales"||e==="sales"||e==="accessWithdrawals"||e==="withdrawals"||e==="accessRepresentativeCommerce"||e==="representative_commerce"||e==="accessRepresentativeOrders"||e==="representative_orders"||e==="representativeOrdersCreate"||e==="representativeOrdersEdit"||e==="representativeOrdersCancel"||e==="representativeOrdersExport"||e==="representativeReconcile"||e==="representativeCommissionsManage"||e==="restrictToOwnSales"||e==="canSellOtherStoresStock"||e==="accessCarriers"||e==="carriers")return s==="COMERCIO";if(e==="accessProduction"||e==="production"||e==="industry"||e==="accessIndustrialDashboard"||e==="accessManufacturing"||e==="accessBillOfMaterials"||e==="accessProductStructure"||e==="accessProductionOrders"||e==="accessLots"||e==="accessIndustrialStock"||e==="accessIndustrialPurchasing"||e==="accessIndustrialCosts"||e==="accessProductionReports"||e==="accessIndustrialReports"||e==="accessCommercialReports"||e==="accessMaintenance"||e==="accessEquipment"||e==="accessIndustrialAudit"||(typeof e==="string"&&(e.startsWith("accessInd")||e.startsWith("ind_"))))return s==="INDUSTRIA";return!0}`;
if (bundle.includes(faTarget)) {
  bundle = bundle.replace(faTarget, faReplacement);
  console.log('[Correção 5.1] Funções de segmentação estrita FA e Hc ativadas!');
}

// 5.2. Sidebar - Fragmento de Vendas Balcão e Comércio habilitado EXCLUSIVAMENTE para Comércio e Híbrido (oculto em Oficina e Indústria)
const sidebarCommerceOld = `(Te==="COMERCIO"||Te==="INDUSTRIA"||Te==="OFICINA_COMERCIO")&&t.jsxs(t.Fragment,{children:[$e("sales")&&t.jsx("button",{id:"menu-btn-sales"`;
const sidebarCommerceNew = `(Te==="COMERCIO"||Te==="OFICINA_COMERCIO")&&t.jsxs(t.Fragment,{children:[$e("sales")&&t.jsx("button",{id:"menu-btn-sales"`;
if (bundle.includes(sidebarCommerceOld)) {
  bundle = bundle.replace(sidebarCommerceOld, sidebarCommerceNew);
  console.log('[Correção 5.2] Módulos de Comércio restritos a Comércio e Híbrido na sidebar!');
}

// 5.3. Sidebar - Unidades de Medida restrito para Comércio e Híbrido no topo
const sidebarUomOld = `(Te==="COMERCIO"||Te==="INDUSTRIA"||Te==="OFICINA_COMERCIO")&&$e("units_of_measure")&&t.jsx("button",{id:"menu-btn-units-of-measure",onClick:()=>Tt("units_of_measure")`;
const sidebarUomNew = `(Te==="COMERCIO"||Te==="OFICINA_COMERCIO")&&$e("units_of_measure")&&t.jsx("button",{id:"menu-btn-units-of-measure",onClick:()=>Tt("units_of_measure")`;
if (bundle.includes(sidebarUomOld)) {
  bundle = bundle.replace(sidebarUomOld, sidebarUomNew);
  console.log('[Correção 5.3] Unidades de Medida ajustadas por segmento na sidebar!');
}

// 5.4. IA - Validação do tipo de negócio na função IA
const iaOld = `const comp=typeof e==="object"&&e!==null?e:(r&&r.registeredCompanies?r.registeredCompanies.find(c=>c.id===e):null)||(r&&r.companyInfo?r.companyInfo:null);const i=(typeof zre!=="undefined"&&zre[s])?zre[s]:s;`;
const iaNew = `const comp=typeof e==="object"&&e!==null?e:(r&&r.registeredCompanies?r.registeredCompanies.find(c=>c.id===e):null)||(r&&r.companyInfo?r.companyInfo:null);const i=(typeof zre!=="undefined"&&zre[s])?zre[s]:s;if(comp){const _bt=Bb(comp);if(!FA(s,_bt)||!Hc(s,_bt))return!1;}`;
if (bundle.includes(iaOld)) {
  bundle = bundle.replace(iaOld, iaNew);
  console.log('[Correção 5.4] Validação de segmento por empresa na função IA ativada!');
}

// 5.5. Garantir que perfil rv para INDUSTRIA mantenha vendas balcão como false
const rvIndOld = `case"INDUSTRIA":return{accessDashboard:!0,accessSales:!0,accessWithdrawals:!0,`;
const rvIndNew = `case"INDUSTRIA":return{accessDashboard:!0,accessSales:!1,accessWithdrawals:!1,`;
if (bundle.includes(rvIndOld)) {
  bundle = bundle.replace(rvIndOld, rvIndNew);
  console.log('[Correção 5.5] Perfil rv de INDUSTRIA com vendas e balcão desabilitados!');
}

// Salvar bundle public e dist
fs.writeFileSync(bundlePath, bundle, 'utf8');
if (fs.existsSync(distBundlePath)) {
  fs.writeFileSync(distBundlePath, bundle, 'utf8');
}
console.log('--- Atualizações preliminares salvas com sucesso ---');
