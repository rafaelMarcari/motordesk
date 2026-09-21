import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const publicAsset = path.resolve('public/assets/index-CUxTo0fH.js');
const distAsset = path.resolve('dist/assets/index-CUxTo0fH.js');
const backupAsset = path.resolve('public/assets/index-CUxTo0fH.js.bak');

console.log('=== MOTOR DESK COMPREHENSIVE INTEGRATION ===');

async function compileAndWrap(filePath, componentName) {
  console.log(`Compiling ${componentName} from ${filePath}...`);
  const build = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react/jsx-runtime'],
    write: false
  });
  let code = build.outputFiles[0].text;
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*["']react["'];?/g, (match, p1) => {
    const parts = p1.split(',').map(s => s.trim()).filter(Boolean);
    const assignments = parts.map(part => {
      if (part.includes(' as ')) {
        const [orig, alias] = part.split(/\s+as\s+/).map(s => s.trim());
        return `var ${alias} = __MD_REACT__.${orig};`;
      } else {
        return `var ${part} = __MD_REACT__.${part};`;
      }
    });
    return assignments.join('\n');
  });
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*["']react\/jsx-runtime["'];?/g, (match, p1) => {
    const parts = p1.split(',').map(s => s.trim()).filter(Boolean);
    const assignments = parts.map(part => {
      let orig = part;
      let alias = part;
      if (part.includes(' as ')) {
        [orig, alias] = part.split(/\s+as\s+/).map(s => s.trim());
      }
      if (orig === 'Fragment') {
        return `var ${alias} = __MD_REACT__.Fragment;`;
      }
      if (orig === 'jsxs') {
        return `var ${alias} = __MD_JSXS__;`;
      }
      return `var ${alias} = __MD_JSX__;`;
    });
    return assignments.join('\n');
  });
  code = code.replace(/export\s*\{[^}]*\};?/g, '');
  return `var ${componentName} = (function(__MD_REACT__, __MD_JSX__, __MD_JSXS__, __MD_PORTAL__) {
  var React = __MD_REACT__;
  var forwardRef = __MD_REACT__.forwardRef, forwardRef2 = __MD_REACT__.forwardRef, forwardRef3 = __MD_REACT__.forwardRef;
  var createElement = __MD_REACT__.createElement, createElement2 = __MD_REACT__.createElement, createElement3 = __MD_REACT__.createElement;
  var { useState, useMemo, useEffect, useCallback, useRef, useId, useContext, useReducer, useLayoutEffect, Fragment } = __MD_REACT__;
  var useState2 = useState, useState3 = useState;
  var useMemo2 = useMemo, useMemo3 = useMemo;
  var useEffect2 = useEffect, useEffect3 = useEffect;
  var useCallback2 = useCallback, useCallback3 = useCallback;
  var useRef2 = useRef, useRef3 = useRef;
  var Fragment2 = Fragment, Fragment3 = Fragment;
  var createPortal = __MD_PORTAL__;
  var jsx = __MD_JSX__, jsxs = __MD_JSXS__;
  ${code}
  return ${componentName};
})(b, t.jsx, t.jsxs, (typeof CI !== "undefined" && CI.createPortal) ? CI.createPortal : (typeof xc !== "undefined" && xc.createPortal) ? xc.createPortal : null);`;
}

// 1. Compile all integrated modules
const wrappedFiscal = await compileAndWrap('src/components/FiscalXmlExtractionView.tsx', 'FiscalXmlExtractionView');
const wrappedRep = await compileAndWrap('src/components/RepresentativeOrdersView.tsx', 'RepresentativeOrdersView');
const wrappedReminder = await compileAndWrap('src/components/BoletoClientReminderModal.tsx', 'BoletoClientReminderModal');
const wrappedReceivablesFilters = await compileAndWrap('src/components/WarelineReceivablesFiltersView.tsx', 'WarelineReceivablesFiltersView');
const wrappedPayablesFilters = await compileAndWrap('src/components/WarelinePayablesFiltersView.tsx', 'WarelinePayablesFiltersView');
const wrappedPriceMarkup = await compileAndWrap('src/components/PriceMarkupCalculatorView.tsx', 'PriceMarkupCalculatorView');
const wrappedFiscalInvoicing = await compileAndWrap('src/components/FiscalInvoicingGridView.tsx', 'FiscalInvoicingGridView');
const wrappedReportsMenu = await compileAndWrap('src/components/HierarchicalReportsHeaderMenu.tsx', 'HierarchicalReportsHeaderMenu');
const wrappedOperationalModal = await compileAndWrap('src/components/OperationalScreenParametersModal.tsx', 'OperationalScreenParametersModal');
const wrappedIndReports = await compileAndWrap('src/components/IndustrialComprehensiveReportsView.tsx', 'IndustrialComprehensiveReportsView');
const wrappedScreenSubmenuHub = await compileAndWrap('src/components/ScreenSubmenuHubModal.tsx', 'ScreenSubmenuHubModal');
const wrappedSidebarTreeMenu = await compileAndWrap('src/components/SidebarTreeMenu.tsx', 'SidebarTreeMenu');
const wrappedDeviceConnectionsModal = await compileAndWrap('src/components/DeviceConnectionsAndPermissionsModal.tsx', 'DeviceConnectionsAndPermissionsModal');
const wrappedSystemBackupModal = await compileAndWrap('src/components/SystemBackupModal.tsx', 'SystemBackupModal');

console.log('All 14 modules compiled successfully!');

const targetFiles = [publicAsset];
if (fs.existsSync(distAsset)) {
  targetFiles.push(distAsset);
}

for (const filePath of targetFiles) {
  let content = fs.readFileSync(backupAsset, 'utf8');

  // A. Backoff 429 logic
  const saveDbPattern = 'async saveDatabase(e,a=!1){';
  const saveDbResilient = `async saveDatabase(e,a=!1){
      if(typeof window!=="undefined"&&window.rateLimitCooloffUntil&&Date.now()<window.rateLimitCooloffUntil){
        console.warn("[MotorDesk Save] Bloqueio preventivo 429 ativo até:", new Date(window.rateLimitCooloffUntil).toLocaleTimeString());
        return;
      }`;
  if (content.includes(saveDbPattern)) {
    content = content.replace(saveDbPattern, saveDbResilient);
    console.log(`- Applied resilient 429 backoff handling to POST /api/db in ${path.basename(filePath)}`);
  }

  // Relax debounce from 300ms to 600ms
  content = content.replace('this.saveDebounceTimer=setTimeout(()=>{this.saveDatabase(e)},300)', 'this.saveDebounceTimer=setTimeout(()=>{this.saveDatabase(e)},600)');

  // B. Inject BoletoClientReminderModal before ROe
  const roeMarker = 'function ROe(e){';
  if (content.includes(roeMarker)) {
    content = content.replace(roeMarker, `${wrappedReminder}\n\nfunction ROe(e){`);
    console.log(`- Injected BoletoClientReminderModal before ROe in ${path.basename(filePath)}`);
  }

  // C. Injected all other components before KKe
  const kkeMarker = 'function KKe(){';
  if (content.includes(kkeMarker)) {
    content = content.replace(
      kkeMarker,
      `${wrappedFiscal}\n\n${wrappedRep}\n\n${wrappedReceivablesFilters}\n\n${wrappedPayablesFilters}\n\n${wrappedPriceMarkup}\n\n${wrappedFiscalInvoicing}\n\n${wrappedReportsMenu}\n\n${wrappedOperationalModal}\n\n${wrappedIndReports}\n\n${wrappedScreenSubmenuHub}\n\n${wrappedDeviceConnectionsModal}\n\n${wrappedSystemBackupModal}\n\nfunction KKe(){`
    );
    console.log(`- Injected modal and view components before KKe in ${path.basename(filePath)}`);
  }

  // D. Add showOperationalModal, showReportsFlyout, activeSubmenuHub, showDeviceConnModal and showSystemBackupModal state in KKe and expose global openers
  const kkeStateMarker = 'const[e,a]=b.useState(()=>HE()),';
  const kkeStateReplacement = 'const[e,a]=b.useState(()=>HE()),[showOperationalModal,setShowOperationalModal]=b.useState(!1),[showReportsFlyout,setShowReportsFlyout]=b.useState(!1),[activeSubmenuHub,setActiveSubmenuHub]=b.useState(null),[submenuCustomItems,setSubmenuCustomItems]=b.useState(null),[showDeviceConnModal,setShowDeviceConnModal]=b.useState(!1),[showSystemBackupModal,setShowSystemBackupModal]=b.useState(!1),';
  if (content.includes(kkeStateMarker)) {
    content = content.replace(kkeStateMarker, kkeStateReplacement);
    console.log(`- Added showOperationalModal, activeSubmenuHub, showDeviceConnModal and showSystemBackupModal state in KKe in ${path.basename(filePath)}`);
  }

  // D2. Expose global openers for operational parameters modal, screen submenu hub, device connections, and backup
  const kkeFirstEffect = 'b.useEffect(()=>{typeof localStorage<"u"&&De&&localStorage.setItem("motordesk_active_view",De)},[De])';
  if (content.includes(kkeFirstEffect)) {
    content = content.replace(
      kkeFirstEffect,
      `b.useEffect(()=>{if(typeof window!=="undefined"){window.__openOperationalParamsModal=()=>setShowOperationalModal(!0);window.openOperationalParams=()=>setShowOperationalModal(!0);window.__openScreenSubmenuHub=(modId,modName,items)=>{setActiveSubmenuHub(modId);setSubmenuCustomItems(items||null);};window.openScreenSubmenuHub=window.__openScreenSubmenuHub;window.__openDeviceConnectionsModal=()=>setShowDeviceConnModal(!0);window.openDeviceConnectionsModal=()=>setShowDeviceConnModal(!0);window.__openBackupModal=()=>setShowSystemBackupModal(!0);window.openBackupModal=()=>setShowSystemBackupModal(!0);if(!window.__MD_LIVESYNC_ATTACHED__){window.__MD_LIVESYNC_ATTACHED__=!0;let sseInst=null,lastV=0;function connectLiveSSE(){try{if(sseInst){sseInst.close();}sseInst=new EventSource("/api/db/stream");sseInst.addEventListener("connected",(e)=>{try{const d=JSON.parse(e.data);if(d.version)lastV=d.version;}catch{}});sseInst.addEventListener("db_updated",(e)=>{try{const d=JSON.parse(e.data);if(d.version&&d.version>lastV){lastV=d.version;if(window.__motorDeskDb&&window.__motorDeskDb.fetchDatabaseInternal){window.__motorDeskDb.fetchDatabaseInternal().then(fresh=>{if(fresh&&window.__motorDeskDb.onDataMergedCallback){window.__motorDeskDb.onDataMergedCallback(fresh);}}).catch(()=>{});}}}catch{}});sseInst.onerror=()=>{try{sseInst.close();}catch{}setTimeout(connectLiveSSE,6000);};}catch{}}connectLiveSSE();setInterval(async()=>{try{const r=await fetch("/api/db/version");if(r.ok){const v=await r.json();if(v.version&&lastV>0&&v.version>lastV){lastV=v.version;if(window.__motorDeskDb&&window.__motorDeskDb.fetchDatabaseInternal){const fresh=await window.__motorDeskDb.fetchDatabaseInternal();if(fresh&&window.__motorDeskDb.onDataMergedCallback){window.__motorDeskDb.onDataMergedCallback(fresh);}}}else if(v.version&&lastV===0){lastV=v.version;}}}catch{}},10000);if("BroadcastChannel" in window){const bc=new BroadcastChannel("motordesk_live_channel");bc.onmessage=(ev)=>{if(ev.data&&ev.data.type==="DB_SAVED_LOCAL"&&ev.data.data){if(window.__motorDeskDb&&window.__motorDeskDb.onDataMergedCallback){window.__motorDeskDb.onDataMergedCallback(ev.data.data);}}};}}}},[]),${kkeFirstEffect}`
    );
    console.log(`- Injected global modal opener and LiveSync effect in ${path.basename(filePath)}`);
  }

  // E. Update zre map with fiscal_xml_extraction, price_calculation, fiscal_invoicing_grid, industrial_reports
  if (!content.includes('price_calculation:"accessFinancial"')) {
    content = content.replace(
      'fiscal_conference:"accessFiscal"',
      'fiscal_conference:"accessFiscal",fiscal_xml_extraction:"accessFiscal",fiscal_xml:"accessFiscal",price_calculation:"accessFinancial",fiscal_invoicing_grid:"accessFiscal",industrial_reports:"accessReports"'
    );
    console.log(`- Updated zre permission map in ${path.basename(filePath)}`);
  }

  // E1. Update ex map with price_calculation and fiscal routes
  const oldEx = 'financial:"accessFinancial",fiscal:"accessFiscal",';
  const newEx = 'financial:"accessFinancial",price_calculation:"accessFinancial",fiscal_xml_extraction:"accessFiscal",fiscal_invoicing_grid:"accessFiscal",industrial_reports:"accessReports",fiscal:"accessFiscal",';
  if (content.includes(oldEx)) {
    content = content.replace(oldEx, newEx);
    console.log(`- Updated ex route permission map in ${path.basename(filePath)}`);
  }

  // E2. Patch FA and Hc to allow representative_orders and price_calculation across all business segments
  const oldFA = 'function FA(e,a){const s=Id(a);return s==="INDUSTRIA"?!(xD.includes(e)||SV.includes(e)):s==="COMERCIO"?!(xD.includes(e)||pD.includes(e)):s==="OFICINA"?!(Kre.includes(e)||pD.includes(e)):!0}';
  const newFA = 'function FA(e,a){if(e==="representative_orders"||e==="price_calculation")return!0;const s=Id(a);return s==="INDUSTRIA"?!(xD.includes(e)||SV.includes(e)):s==="COMERCIO"?!(xD.includes(e)||pD.includes(e)):s==="OFICINA"?!(Kre.includes(e)||pD.includes(e)):!0}';
  if (content.includes(oldFA)) {
    content = content.replace(oldFA, newFA);
    console.log(`- Patched FA to permit representative_orders and price_calculation in ${path.basename(filePath)}`);
  }

  const oldHc = 'function Hc(e,a){const s=Id(a);return s==="INDUSTRIA"?!(fD.includes(e)||EV.includes(e)):s==="COMERCIO"?!(fD.includes(e)||hD.includes(e)):s==="OFICINA"?!(Xre.includes(e)||hD.includes(e)):!0}';
  const newHc = 'function Hc(e,a){if(e==="accessRepresentativeOrders"||e==="accessRepresentativeCommerce"||e==="accessPriceCalculation"||e==="accessFinancial")return!0;const s=Id(a);return s==="INDUSTRIA"?!(fD.includes(e)||EV.includes(e)):s==="COMERCIO"?!(fD.includes(e)||hD.includes(e)):s==="OFICINA"?!(Xre.includes(e)||hD.includes(e)):!0}';
  if (content.includes(oldHc)) {
    content = content.replace(oldHc, newHc);
    console.log(`- Patched Hc to permit accessRepresentativeOrders and accessPriceCalculation in ${path.basename(filePath)}`);
  }

  // E3. Patch Wd to properly validate financial, price_calculation and representative_orders modules
  const oldWdFin = 'else if(e==="accessFinancial"||e.startsWith("financial")||e==="accessAccountsReceivable"||e==="accessAccountsPayable"||e.startsWith("accountsReceivable")||e.startsWith("accountsPayable")||e==="authorizeCreditLimitBypass"){i=gm.accessFinancial??gm.financial??(e.includes("Receivable")?gm.accessAccountsReceivable:e.includes("Payable")?gm.accessAccountsPayable:void 0)}';
  const newWdFin = 'else if(e==="accessFinancial"||e.startsWith("financial")||e==="accessPriceCalculation"||e==="price_calculation"||e==="accessAccountsReceivable"||e==="accessAccountsPayable"||e.startsWith("accountsReceivable")||e.startsWith("accountsPayable")||e==="authorizeCreditLimitBypass"){i=gm.accessFinancial??gm.financial??gm.accessPriceCalculation??gm.price_calculation??(e.includes("Receivable")?gm.accessAccountsReceivable:e.includes("Payable")?gm.accessAccountsPayable:(gm.accessAccountsReceivable??gm.accessAccountsPayable??(a.modules?a.modules.financial:!0)??!0))}';
  if (content.includes(oldWdFin)) {
    content = content.replace(oldWdFin, newWdFin);
    console.log(`- Patched Wd financial validation in ${path.basename(filePath)}`);
  }

  const oldWdRep = 'else if(e.startsWith("representative")||e==="accessRepresentativeCommerce"||e==="accessRepresentativeOrders"){i=gm.accessRepresentativeCommerce??gm.accessRepresentativeOrders??gm.representative_commerce}';
  const newWdRep = 'else if(e.startsWith("representative")||e==="accessRepresentativeCommerce"||e==="accessRepresentativeOrders"||e==="representative_orders"||e==="representative_commerce"){i=gm.accessRepresentativeOrders??gm.representative_orders??gm.accessRepresentativeCommerce??gm.representative_commerce??gm.accessCommercialOrders??(a.enableRepresentativeCommerce!==!1?(!0):(a.modules?a.modules.sales:!0)??!0)}';
  if (content.includes(oldWdRep)) {
    content = content.replace(oldWdRep, newWdRep);
    console.log(`- Patched Wd representative validation in ${path.basename(filePath)}`);
  }

  const oldWdFallback = 'if(i!==void 0)return!!i;if(Object.keys(a.globalModules).length>0)return e==="accessDashboard"||e==="accessUserManagement"||e==="accessNotifications"||e==="accessClients"||e==="accessHistory"||e==="accessReports"';
  const newWdFallback = 'if(i!==void 0)return!!i;if(Object.keys(a.globalModules).length>0)return e==="accessDashboard"||e==="accessUserManagement"||e==="accessNotifications"||e==="accessClients"||e==="accessHistory"||e==="accessReports"||e==="accessFinancial"||e==="accessPriceCalculation"||e==="accessRepresentativeOrders"||e==="accessFiscal"';
  if (content.includes(oldWdFallback)) {
    content = content.replace(oldWdFallback, newWdFallback);
    console.log(`- Patched Wd fallback validation in ${path.basename(filePath)}`);
  }

  const oldWdModulesRep = 'accessRepresentativeCommerce:i.representative_commerce??a.enableRepresentativeCommerce,accessRepresentativeOrders:i.representative_orders??i.representative_commerce??a.enableRepresentativeCommerce';
  const newWdModulesRep = 'accessPriceCalculation:i.financial??!0,accessRepresentativeCommerce:i.representative_commerce??a.enableRepresentativeCommerce??!0,accessRepresentativeOrders:i.representative_orders??i.representative_commerce??a.enableRepresentativeCommerce??!0';
  if (content.includes(oldWdModulesRep)) {
    content = content.replace(oldWdModulesRep, newWdModulesRep);
    console.log(`- Patched Wd modules rep/price in ${path.basename(filePath)}`);
  }

  // E4. Patch IA to grant price_calculation and representative_orders to authorized users
  const oldIA = 'function IA(e,a,s,r){if(!e||!a||a.active===!1||a.isActive===!1||a.isTerminated===!0||a.status==="terminated")return!1;const _isM=(a.username&&(a.username.toLowerCase()==="admin"||a.username.toLowerCase()==="validador"))||(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*"));if(!_isM){const _uC=a.companyId||"comp-1";if(_uC!==e.id&&!(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes(e.id)))return!1;}if(s==="profile")return!0;if(!gI(e))return s==="users"&&(a.role==="admin"||_isM);const n=Id(e.businessType);if(!FA(s,n))return!1;const i=zre[s];if(!i)return!0;if(!Wd(i,e,n))return!1;const o=bI(a,e,r||void 0);return!(!o||!o[i])}';
  const newIA = 'function IA(e,a,s,r){if(!e||!a||a.active===!1||a.isActive===!1||a.isTerminated===!0||a.status==="terminated")return!1;const _isM=(a.username&&(a.username.toLowerCase()==="admin"||a.username.toLowerCase()==="validador"))||(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes("*"));if(!_isM){const _uC=a.companyId||"comp-1";if(_uC!==e.id&&!(Array.isArray(a.allowedCompanyIds)&&a.allowedCompanyIds.includes(e.id)))return!1;}if(s==="profile")return!0;if(!gI(e))return s==="users"&&(a.role==="admin"||_isM);const n=Id(e.businessType);if(!FA(s,n))return!1;const i=zre[s];if(!i)return!0;if(!Wd(i,e,n))return!1;const o=bI(a,e,r||void 0);if(!o)return!1;if(s==="price_calculation")return!!(o.accessFinancial||o.accessPriceCalculation||o.accessParts||a.role==="admin"||a.role==="qa"||_isM);if(s==="representative_orders")return!!(o.accessRepresentativeOrders||o.accessRepresentativeCommerce||o.accessCommercialOrders||a.role==="admin"||a.role==="qa"||_isM);return!!o[i]}';
  if (content.includes(oldIA)) {
    content = content.replace(oldIA, newIA);
    console.log(`- Patched IA route resolution in ${path.basename(filePath)}`);
  }

  // E5. Patch KA to add accessPriceCalculation
  const oldKAFin = 'accessFinancial:(e==null?void 0:e.accessFinancial)!==void 0?!!e.accessFinancial:w,';
  const newKAFin = 'accessFinancial:(e==null?void 0:e.accessFinancial)!==void 0?!!e.accessFinancial:w,accessPriceCalculation:(e==null?void 0:e.accessPriceCalculation)!==void 0?!!e.accessPriceCalculation:((e==null?void 0:e.accessFinancial)??w),';
  if (content.includes(oldKAFin)) {
    content = content.replace(oldKAFin, newKAFin);
    console.log(`- Added accessPriceCalculation to KA in ${path.basename(filePath)}`);
  }

  // F. Replace accounts_receivable with WarelineReceivablesFiltersView
  const oldReceivableRender = 'De==="accounts_receivable"&&n.permissions.accessAccountsReceivable&&(qt("accessAccountsReceivable")?va():t.jsx(ROe,{db:pt,currentUser:n,onSaveReceivables:_e,onSaveFiscalDocuments:It,onSaveBoletos:Lt,onSaveDatabaseUpdates:as,onAddHistoryLog:$t,setUnsavedTask:tt}))';
  const newReceivableRender = 'De==="accounts_receivable"&&n.permissions.accessAccountsReceivable&&(qt("accessAccountsReceivable")?va():t.jsx(WarelineReceivablesFiltersView,{db:pt,currentUser:n,onSaveReceivables:_e,onSaveFiscalDocuments:It,onSaveBoletos:Lt,onSaveDatabaseUpdates:as,onAddHistoryLog:$t,setUnsavedTask:tt,onNavigate:Tt}))';
  if (content.includes(oldReceivableRender)) {
    content = content.replace(oldReceivableRender, newReceivableRender);
    console.log(`- Injected WarelineReceivablesFiltersView in ${path.basename(filePath)}`);
  }

  // G. Replace accounts_payable with WarelinePayablesFiltersView
  const oldPayableRender = 'De==="accounts_payable"&&n.permissions.accessAccountsPayable&&(qt("accessAccountsPayable")?va():t.jsx(VQe,{db:pt,currentUser:n,onSavePayables:qe,onAddHistoryLog:$t,setUnsavedTask:tt,onSaveFullDatabase:nt}))';
  const newPayableRender = 'De==="accounts_payable"&&n.permissions.accessAccountsPayable&&(qt("accessAccountsPayable")?va():t.jsx(WarelinePayablesFiltersView,{db:pt,currentUser:n,onSavePayables:qe,onAddHistoryLog:$t,setUnsavedTask:tt,onSaveFullDatabase:nt,onNavigate:Tt}))';
  if (content.includes(oldPayableRender)) {
    content = content.replace(oldPayableRender, newPayableRender);
    console.log(`- Injected WarelinePayablesFiltersView in ${path.basename(filePath)}`);
  }

  // H. Register price_calculation, fiscal_invoicing_grid, fiscal_xml_extraction, industrial_reports routes in workspace-main-content
  const fiscalRouterMarker = 'De==="sales"&&n.permissions.accessSales&&(';
  const newRoutes = `De==="industrial_reports"?(n.permissions.accessReports?qt("accessReports")?va():t.jsx(IndustrialComprehensiveReportsView,{db:pt,currentUser:n,onNavigate:Tt}):va()):De==="price_calculation"&&(n.role==="admin"||n.role==="qa"||n.permissions.accessFinancial||n.permissions.accessPriceCalculation||n.permissions.accessParts?t.jsx(PriceMarkupCalculatorView,{db:pt,currentUser:n,onUpdateDb:nt,onAddHistoryLog:$t,onNavigate:Tt}):va()),De==="fiscal_invoicing_grid"&&(n.permissions.accessFiscal?qt("accessFiscal")?va():t.jsx(FiscalInvoicingGridView,{db:pt,currentUser:n,onSaveFiscalDocuments:It,onSaveReceivables:_e,onAddHistoryLog:$t,onNavigateToView:Tt}):va()),De==="fiscal_xml_extraction"&&(n.permissions.accessFiscal||n.permissions.fiscalXml?qt("accessFiscal")?va():t.jsx(FiscalXmlExtractionView,{db:pt,currentUser:n,activeCompanyId:ye,onAddHistoryLog:$t,onNavigateToView:Tt}):va()),`;
  if (content.includes(fiscalRouterMarker)) {
    content = content.replace(fiscalRouterMarker, `${newRoutes}${fiscalRouterMarker}`);
    console.log(`- Registered new routes (industrial_reports, price_calculation, fiscal_invoicing_grid, fiscal_xml_extraction) in ${path.basename(filePath)}`);
  }

  // H2. Hook industrial reports into reports view for INDUSTRIA companies
  const oldReportsRoute = 'De==="reports"&&n.permissions.accessReports&&(qt("accessReports")?va():t.jsx(COe,{db:pt,businessType:Te,currentUser:n}))';
  const newReportsRoute = 'De==="reports"&&n.permissions.accessReports&&(qt("accessReports")?va():(Te==="INDUSTRIA"?t.jsx(IndustrialComprehensiveReportsView,{db:pt,currentUser:n,onNavigate:Tt}):t.jsx(COe,{db:pt,businessType:Te,currentUser:n})))';
  if (content.includes(oldReportsRoute)) {
    content = content.replace(oldReportsRoute, newReportsRoute);
    console.log(`- Wired comprehensive industrial reports for INDUSTRIA companies in ${path.basename(filePath)}`);
  }

  // I. Register RepresentativeOrdersView
  const repOldRoute = '["representative_commerce","representative_orders","representative_reconciliation"].includes(De)&&(De==="representative_orders"&&n.permissions.accessRepresentativeOrders||n.permissions.accessRepresentativeCommerce?qt(De==="representative_orders"?"accessRepresentativeOrders":"accessRepresentativeCommerce")?va():t.jsx(VVe,{db:pt,setDb:nt,currentUser:n,activeCompanyId:ye,initialTab:De==="representative_orders"?"orders":De==="representative_reconciliation"?"reconciliation":void 0,onAddHistoryLog:$t,onNavigateToView:Tt}):null)';
  const repNewRoute = 'De==="representative_orders"?(n.role==="admin"||n.role==="qa"||n.permissions.accessRepresentativeOrders||n.permissions.accessRepresentativeCommerce?t.jsx(RepresentativeOrdersView,{db:pt,setDb:nt,currentUser:n,activeCompanyId:ye,onAddHistoryLog:$t,onNavigateToView:Tt}):va()):(["representative_commerce","representative_reconciliation"].includes(De)&&(n.permissions.accessRepresentativeCommerce?qt("accessRepresentativeCommerce")?va():t.jsx(VVe,{db:pt,setDb:nt,currentUser:n,activeCompanyId:ye,initialTab:De==="representative_reconciliation"?"reconciliation":void 0,onAddHistoryLog:$t,onNavigateToView:Tt}):null))';
  if (content.includes(repOldRoute)) {
    content = content.replace(repOldRoute, repNewRoute);
    console.log(`- Replaced RepresentativeOrders with dedicated view in ${path.basename(filePath)}`);
  }

  // J. Whitelist new routes in non-fallback check
  const oldFallbackCheck = '!["dashboard","sales","withdrawals","carriers","clients","vehicles","parts","units_of_measure","quotations","accounts_receivable","accounts_payable","financial","fiscal_conference","fiscal","tax_obligations","services","budgets","serviceOrders","industry","history","reports","users","access_groups","profile","qa_panel","data_migration","notifications_engine","notification_engine","representative_commerce","representative_orders","representative_reconciliation"].includes(De)&&t.jsxs("div",{className:"flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200/80 my-12 animate-fade-in shadow-xs",id:"fallback-view-screen"';
  const newFallbackCheck = '(!["dashboard","sales","withdrawals","carriers","clients","vehicles","parts","units_of_measure","quotations","accounts_receivable","accounts_payable","financial","fiscal_conference","fiscal","fiscal_xml_extraction","fiscal_xml","fiscal_invoicing_grid","price_calculation","tax_obligations","services","budgets","serviceOrders","industry","history","reports","users","access_groups","profile","qa_panel","data_migration","notifications_engine","notification_engine","representative_commerce","representative_orders","representative_reconciliation","client_installation","industrial_reports","cost_analysis"].includes(De)&&!(typeof De==="string"&&(De.startsWith("ind_")||De==="ind_rastrear_processo")))&&t.jsxs("div",{className:"flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200/80 my-12 animate-fade-in shadow-xs",id:"fallback-view-screen"';
  if (content.includes(oldFallbackCheck)) {
    content = content.replace(oldFallbackCheck, newFallbackCheck);
    console.log(`- Updated fallback whitelist for new routes in ${path.basename(filePath)}`);
  }

  // K. Render DeviceConnectionsAndPermissionsModal, SystemBackupModal, OperationalScreenParametersModal and ScreenSubmenuHubModal next to global qVe notifications modal (always mounted in root KKe)
  const qveTarget = 't.jsx(qVe,{notifications:pt.notifications||[]';
  const qveReplacement = `t.jsx(SystemBackupModal,{isOpen:showSystemBackupModal,onClose:()=>setShowSystemBackupModal(!1),currentUser:n,activeCompanyId:ye,companies:pt.registeredCompanies||[pt.companyInfo],db:pt,setDb:nt,onAddHistoryLog:$t}),t.jsx(DeviceConnectionsAndPermissionsModal,{isOpen:showDeviceConnModal,onClose:()=>setShowDeviceConnModal(!1),currentUser:n,db:pt,setDb:nt,activeCompanyId:ye,onAddHistoryLog:$t}),t.jsx(ScreenSubmenuHubModal,{isOpen:!!activeSubmenuHub,onClose:()=>setActiveSubmenuHub(null),activeModuleId:activeSubmenuHub,customItems:submenuCustomItems,onNavigate:(rt)=>{setActiveSubmenuHub(null);Tt(rt)},activeRoute:De,currentSegment:Te}),t.jsx(OperationalScreenParametersModal,{isOpen:showOperationalModal,onClose:()=>setShowOperationalModal(!1),db:pt,currentUser:n,onSaveCompanyInfo:ia,onAddHistoryLog:$t}),t.jsx(qVe,{notifications:pt.notifications||[]`;
  if (content.includes(qveTarget)) {
    content = content.replace(qveTarget, qveReplacement);
    console.log(`- Injected SystemBackupModal, DeviceConnectionsAndPermissionsModal, ScreenSubmenuHubModal and OperationalScreenParametersModal render next to qVe in ${path.basename(filePath)}`);
  }

  // L. Financial block in standard sidebar: replaced with interactive SidebarTreeMenu
  const finTargetStart = 't.jsxs("div",{className:"relative space-y-1",onMouseEnter:()=>Ot(!0),onMouseLeave:()=>Ot(!1),children:[t.jsxs("button",{id:"menu-btn-financial-parent"';
  const finTargetEnd = ',$e("services")&&t.jsx("button",{id:"menu-btn-services"';
  const idxFinStart = content.indexOf(finTargetStart);
  const idxFinEnd = content.indexOf(finTargetEnd, idxFinStart);
  if (idxFinStart !== -1 && idxFinEnd !== -1) {
    const beforeFin = content.substring(0, idxFinStart);
    const afterFin = content.substring(idxFinEnd);
    const replacementFin = `t.jsx(SidebarTreeMenu,{id:"financial",title:"Financeiro & Fiscal",icon:t.jsx(Df,{className:"w-4 h-4 shrink-0 text-emerald-400"}),isCollapsed:le,isHovered:Ue,activeRoute:De,onNavigate:Tt,submenus:[{id:"financial",label:"Caixa & DRE",icon:"📊"},{id:"accounts_receivable",label:"Contas a Receber",icon:"💰"},{id:"accounts_payable",label:"Contas a Pagar",icon:"💳"},{id:"representative_orders",label:"Pedidos Realizados (Fábricas)",icon:"🤝"},{id:"fiscal_conference",label:"Fila de Conferência",icon:"📋"},{id:"fiscal",label:"Fiscal, Boletos & SEFAZ",icon:"📑"},{id:"tax_obligations",label:"Obrigações & Guias Fiscais",icon:"🏛️"},{id:"price_calculation",label:"Formação de Preço",icon:"💲"},{id:"fiscal_xml_extraction",label:"Extração XML & SPED",icon:"📦"}]})`;
    content = `${beforeFin}${replacementFin}${afterFin}`;
    console.log(`- Replaced financial block with interactive SidebarTreeMenu in ${path.basename(filePath)}`);
  } else {
    // Fallback: update buttons
    const oldFinancialParentBtn = 'id:"menu-btn-financial-parent",onClick:()=>Ot(ft=>!ft)';
    const newFinancialParentBtn = 'id:"menu-btn-financial-parent",type:"button",onClick:()=>setActiveSubmenuHub("financial")';
    if (content.includes(oldFinancialParentBtn)) {
      content = content.replace(oldFinancialParentBtn, newFinancialParentBtn);
      console.log(`- Updated Financeiro parent button to open ScreenSubmenuHubModal in ${path.basename(filePath)}`);
    }
  }

  // M2. Transform Sidebar "Relatórios" to open ScreenSubmenuHubModal on screen and inject universal Backup & Connections buttons for all segments
  const oldReportsBtn = '$e("reports")&&t.jsx("button",{id:"menu-btn-reports",onClick:()=>Tt("reports"),title:"Relatórios",className:`w-full flex items-center ${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${De==="reports"?"bg-indigo-600 text-white font-bold":"hover:bg-slate-800 text-slate-400 hover:text-slate-100"}`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(eh,{className:"w-4 h-4 shrink-0"}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Relatórios"})]})})';

  const newReportsBtn = `$e("reports")&&t.jsx("button",{id:"menu-btn-reports",type:"button",onClick:()=>setActiveSubmenuHub("reports"),title:"Central de Relatórios",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2.5 rounded-lg text-xs font-semibold tracking-wide transition \${["reports","industrial_reports"].includes(De)?"bg-indigo-600 text-white font-bold shadow-xs":"hover:bg-slate-800 text-slate-300 hover:text-slate-100"}\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx(eh,{className:"w-4 h-4 shrink-0 text-indigo-400"}),(!le||Ue)&&t.jsx("span",{className:"truncate",children:"Relatórios"})]})}),t.jsx("button",{id:"btn-sidebar-backup",type:"button",onClick:()=>setShowSystemBackupModal(!0),title:"Backup & Restauração da Base de Dados (Todos os Segmentos)",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition hover:bg-slate-800 text-amber-400 hover:text-amber-300 cursor-pointer\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx("span",{className:"text-sm shrink-0",children:"💾"}),(!le||Ue)&&t.jsx("span",{className:"truncate font-bold",children:"Backup do Sistema"})]})}),t.jsx("button",{id:"btn-sidebar-device-connections",type:"button",onClick:()=>setShowDeviceConnModal(!0),title:"Conexões de Computadores, Auditoria de Sessões e Módulos por Usuário/Grupo/Empresa",className:\`w-full flex items-center \${!le||Ue?"justify-between px-3":"justify-center px-2"} py-2 rounded-lg text-xs font-semibold tracking-wide transition hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 cursor-pointer\`,children:t.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[t.jsx("span",{className:"text-sm shrink-0",children:"🛡️"}),(!le||Ue)&&t.jsx("span",{className:"truncate font-bold",children:"Conexões & Módulos"})]})})`;

  if (content.includes(oldReportsBtn)) {
    content = content.replace(oldReportsBtn, newReportsBtn);
    console.log(`- Injected Sidebar Reports button, Backup and Device Connections buttons in ${path.basename(filePath)}`);
  }

  // O. Viewport and Scrolling fixes (Strict Isolation between Sidebar and Workspace)
  content = content.replace(
    'className:"min-h-screen bg-slate-50 flex font-sans",id:"app-workspace-shell"',
    'className:"h-screen max-h-screen bg-slate-50 flex font-sans overflow-hidden w-full relative select-none",id:"app-workspace-shell"'
  );
  content = content.replace(
    'className:`transition-all duration-300 ease-in-out shrink-0 relative ${le?"w-16":"w-64"}`',
    'className:`transition-all duration-300 ease-in-out shrink-0 relative h-screen max-h-screen overflow-hidden flex flex-col ${le?"w-16":"w-64"}`'
  );
  content = content.replace(
    'className:`bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-all duration-300 ease-in-out h-full ${le?"absolute top-0 left-0 bottom-0 z-30 shadow-2xl":"relative w-64"} ${le&&Ue?"w-64":le?"w-16 overflow-x-hidden":"w-64"}`',
    'className:`bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-all duration-300 ease-in-out h-screen max-h-screen overflow-hidden ${le?"absolute top-0 left-0 bottom-0 z-30 shadow-2xl":"relative w-64"} ${le&&Ue?"w-64":le?"w-16 overflow-x-hidden":"w-64"}`'
  );
  content = content.replace(
    't.jsxs("div",{className:"p-3.5 border-b border-slate-800/80 flex items-center justify-between",children:[',
    't.jsxs("div",{className:"p-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0",children:['
  );
  content = content.replace(
    't.jsxs("nav",{className:"flex-1 p-2 space-y-1 overflow-y-auto"',
    't.jsxs("nav",{className:"flex-1 min-h-0 p-2 space-y-1 overflow-y-auto overscroll-contain custom-sidebar-nav-scroll select-none"'
  );
  content = content.replace(
    't.jsxs("nav",{className:"flex-1 min-h-0 p-2 space-y-1 overflow-y-auto overscroll-contain"',
    't.jsxs("nav",{className:"flex-1 min-h-0 p-2 space-y-1 overflow-y-auto overscroll-contain custom-sidebar-nav-scroll select-none"'
  );
  content = content.replace(
    't.jsxs("div",{className:"flex-1 flex flex-col h-screen overflow-hidden",children:[',
    't.jsxs("div",{className:"flex-1 min-w-0 flex flex-col h-screen max-h-screen overflow-hidden relative",children:['
  );
  content = content.replace(
    't.jsx("main",{className:"flex-1 p-8 overflow-y-auto",id:"workspace-main-content"',
    't.jsx("main",{className:"flex-1 min-h-0 p-6 overflow-y-auto overscroll-contain custom-workspace-scroll bg-slate-50/70",id:"workspace-main-content"'
  );
  content = content.replace(
    't.jsx("main",{className:"flex-1 min-h-0 p-6 overflow-y-auto overscroll-contain bg-slate-50/70",id:"workspace-main-content"',
    't.jsx("main",{className:"flex-1 min-h-0 p-6 overflow-y-auto overscroll-contain custom-workspace-scroll bg-slate-50/70",id:"workspace-main-content"'
  );

  // P. Inject Top Workspace Bar with:
  // - HierarchicalReportsHeaderMenu ("Aba Relatórios")
  // - "Backup" button (Todos os segmentos)
  // - "Conexões & Módulos" button (Auditoria de sessões e matriz de permissões)
  // - "Parâmetros" button (Dividir parâmetros de operacional e tela)
  // - Dual Font Zoom buttons: "A−" (Diminuir) and "A+" (Aumentar)
  // - "Logo da empresa e o logo do software no canto direito superior"
  const exactBakHeaderStart = 't.jsxs("header",{className:"bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shrink-0 shadow-2xs z-10",id:"top-workspace-bar",children:[t.jsxs("div",{className:"flex items-center gap-3",children:[(()=>{const ft=(pt.notifications||[]).filter(yt=>!yt.read).length;return t.jsxs("button",{id:"btn-top-notifications"';
  const exactBakHeaderEnd = ',t.jsx("main",{className:"flex-1 p-8 overflow-y-auto",id:"workspace-main-content"';

  const modernTopBar = `t.jsxs("header",{className:"bg-white border-b border-slate-200/90 px-5 py-2.5 flex items-center justify-between shrink-0 shadow-2xs z-10",id:"top-workspace-bar",children:[t.jsxs("div",{className:"flex items-center gap-3.5",children:[Kt.length>1?t.jsxs("div",{className:"relative inline-flex items-center",children:[t.jsx("select",{id:"top-company-switcher-select",value:ye,onChange:ft=>it(ft.target.value),className:"bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 text-[13.5px] font-bold px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-hidden cursor-pointer shadow-2xs appearance-none pr-8 transition font-sans",title:"Alternar entre empresas autorizadas",children:Kt.map(ft=>{const yt=Bb(ft),Dt=yt==="INDUSTRIA"?"🏭 Indústria":yt==="COMERCIO"?"🛒 Comércio":yt==="OFICINA_COMERCIO"?"🏢 Híbrido":"🔧 Oficina";return t.jsxs("option",{value:ft.id,className:"bg-white text-slate-800",children:[ft.name||"Empresa"," (",Dt,")"]},ft.id)})}),t.jsx(mg,{className:"w-4 h-4 text-indigo-600 absolute right-2.5 pointer-events-none"})]}):t.jsxs("span",{className:"text-[13.5px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg flex items-center gap-2 font-sans shadow-2xs",id:"top-company-badge",children:[t.jsx(Fs,{className:"w-4 h-4 text-indigo-600"}),(ot==null?void 0:ot.name)||((on=e.companyInfo)==null?void 0:on.name)||"MotorDesk"]}),t.jsxs("span",{className:"text-[11px] font-black uppercase px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-sans hidden sm:inline-flex shadow-2xs "+(Te==="INDUSTRIA"?"bg-cyan-50 text-cyan-800 border-cyan-300":Te==="COMERCIO"?"bg-emerald-50 text-emerald-800 border-emerald-300":Te==="OFICINA_COMERCIO"?"bg-amber-50 text-amber-800 border-amber-300":"bg-indigo-50 text-indigo-800 border-indigo-300"),children:[Te==="INDUSTRIA"&&t.jsx(tc,{className:"w-4 h-4 text-cyan-600"}),Te==="COMERCIO"&&t.jsx(sn,{className:"w-4 h-4 text-emerald-600"}),Te==="OFICINA_COMERCIO"&&t.jsx(Fs,{className:"w-4 h-4 text-amber-600"}),Te==="OFICINA"&&t.jsx(hr,{className:"w-4 h-4 text-indigo-600"}),Te==="INDUSTRIA"?"Indústria":Te==="COMERCIO"?"Comércio":Te==="OFICINA_COMERCIO"?"Híbrido":"Oficina"]})]}),t.jsxs("div",{className:"flex items-center gap-2.5",children:[t.jsxs("button",{id:"btn-top-backup",type:"button",onClick:()=>setShowSystemBackupModal(!0),className:"flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[13.5px] font-bold transition shadow-2xs cursor-pointer",title:"Gestão e Política de Backup do Sistema (Todos os Segmentos)",children:[t.jsx("span",{className:"text-sm",children:"💾"}),t.jsx("span",{className:"uppercase tracking-wider text-[12px] font-bold hidden md:inline",children:"Backup"})]}),t.jsxs("button",{id:"btn-top-device-connections",type:"button",onClick:()=>setShowDeviceConnModal(!0),className:"flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[13.5px] font-bold transition shadow-2xs cursor-pointer",title:"Conexões de Computadores e Matriz de Permissões Tríplice (Empresa → Grupo → Usuário)",children:[t.jsx(Fs,{className:"w-4 h-4 text-emerald-600"}),t.jsx("span",{className:"uppercase tracking-wider text-[12px] font-bold hidden md:inline",children:"Conexões & Módulos"})]}),t.jsxs("button",{id:"btn-top-params",type:"button",onClick:()=>{setShowOperationalModal(!0);try{if(window.__openOperationalParamsModal)window.__openOperationalParamsModal();if(window.openOperationalParams)window.openOperationalParams()}catch{}},className:"flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[13.5px] font-bold transition border border-slate-300 shadow-2xs cursor-pointer",title:"Configurar Parâmetros de Operacional e de Tela",children:[t.jsx(FD,{className:"w-4 h-4 text-slate-700"}),t.jsx("span",{className:"uppercase tracking-wider text-[12px] font-bold",children:"Parâmetros"})]}),t.jsxs("div",{className:"flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-300 shadow-2xs",title:"Acessibilidade Visual (Tamanho da Fonte)",children:[t.jsxs("button",{id:"btn-top-font-decrease",type:"button",onClick:()=>{try{const curr=localStorage.getItem("motordesk_font_zoom")||"normal";let next="normal";if(curr==="xlarge")next="large";else if(curr==="large")next="normal";else if(curr==="normal")next="small";else next="small";localStorage.setItem("motordesk_font_zoom",next);document.documentElement.classList.remove("font-zoom-small","font-zoom-large","font-zoom-xlarge");if(next!=="normal")document.documentElement.classList.add("font-zoom-"+next)}catch{}},className:"flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-bold transition cursor-pointer",title:"Diminuir tamanho da fonte (A−)",children:[t.jsx("span",{className:"text-sm font-black text-slate-700",children:"A−"}),t.jsx("span",{className:"hidden lg:inline text-[11px] font-semibold text-slate-500",children:"Diminuir"})]}),t.jsx("div",{className:"w-px h-4 bg-slate-300 mx-0.5"}),t.jsxs("button",{id:"btn-top-font-increase",type:"button",onClick:()=>{try{const curr=localStorage.getItem("motordesk_font_zoom")||"normal";let next="large";if(curr==="small")next="normal";else if(curr==="normal")next="large";else if(curr==="large")next="xlarge";else next="xlarge";localStorage.setItem("motordesk_font_zoom",next);document.documentElement.classList.remove("font-zoom-small","font-zoom-large","font-zoom-xlarge");if(next!=="normal")document.documentElement.classList.add("font-zoom-"+next)}catch{}},className:"flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-bold transition cursor-pointer",title:"Aumentar tamanho da fonte (A+)",children:[t.jsx("span",{className:"text-sm font-black text-indigo-700",children:"A+"}),t.jsx("span",{className:"hidden lg:inline text-[11px] font-semibold text-slate-500",children:"Aumentar"})]})]}),(()=>{const ft=(pt.notifications||[]).filter(yt=>!yt.read).length;return t.jsxs("button",{id:"btn-top-notifications",onClick:()=>xt(!0),className:"relative p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200/80 transition cursor-pointer flex items-center justify-center font-sans shadow-2xs",title:"Central de Alertas",children:[t.jsx(em,{className:"w-4 h-4 text-indigo-600"}),ft>0&&t.jsx("span",{className:"absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse",children:ft>9?"9+":ft})]})})(),(n.role==="admin"||n.role==="atendente"||n.role==="qa")&&t.jsxs("button",{id:"btn-top-doc-pdf",onClick:()=>mt(!0),className:"flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-lg text-[13.5px] font-bold transition shadow-2xs cursor-pointer font-sans",title:"Documentação do sistema",children:[t.jsx(hs,{className:"w-4 h-4 text-emerald-600"}),t.jsx("span",{className:"hidden md:inline font-bold uppercase tracking-wider text-[12px]",children:"DOCS"})]}),t.jsxs("span",{className:"text-[13.5px] font-bold text-slate-800 bg-slate-100/90 border border-slate-200/90 px-3 py-2 rounded-lg flex items-center gap-2 font-sans shadow-2xs",children:[t.jsx(ND,{className:"w-4 h-4 text-indigo-600"}),t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx("span",{className:"font-bold truncate max-w-[120px]",children:n.name}),t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-extrabold uppercase font-mono",children:n.role.toUpperCase()})]})]}),t.jsxs("button",{id:"btn-top-logout",onClick:Aa,className:"flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 px-3 py-2 rounded-lg text-[13.5px] font-bold transition shadow-2xs cursor-pointer font-sans",title:"Encerrar sessão",children:[t.jsx(Sw,{className:"w-4 h-4 text-rose-600"}),t.jsx("span",{className:"font-bold uppercase tracking-wider text-[12px]",children:"SAIR"})]}),t.jsxs("div",{className:"flex items-center gap-2 pl-3 border-l border-slate-200/90 select-none",id:"top-right-logos-container",title:"Logo da Empresa e Software MotorDesk",children:[((ot&&ot.logoUrl)||(e.companyInfo&&e.companyInfo.logoUrl))?t.jsx("img",{src:(ot&&ot.logoUrl)||(e.companyInfo&&e.companyInfo.logoUrl),alt:"Logo Empresa",className:"h-8 max-w-[90px] object-contain rounded border border-slate-200 bg-white p-0.5 shadow-2xs"}):t.jsx("div",{className:"h-8 px-2.5 rounded bg-indigo-900 text-white font-black text-[11px] flex items-center justify-center uppercase shadow-2xs",children:(((ot&&ot.tradeName)||(e.companyInfo&&e.companyInfo.tradeName)||"EMPRESA").slice(0,8))}),t.jsxs("div",{className:"h-8 px-2.5 rounded bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center gap-1.5 shadow-2xs border border-slate-800",children:[t.jsx("span",{className:"text-indigo-400 font-extrabold text-sm",children:"⚡"}),t.jsxs("div",{className:"flex flex-col leading-none",children:[t.jsx("span",{className:"text-[9.5px] font-black tracking-wider uppercase text-white font-sans",children:"MOTORDESK"}),t.jsx("span",{className:"text-[7px] font-extrabold tracking-widest uppercase text-sky-400 font-mono",children:"ERP"})]})]})]})]})]}),t.jsx("main",{className:"flex-1 min-h-0 p-6 overflow-y-auto overscroll-contain custom-workspace-scroll bg-slate-50/70",id:"workspace-main-content"`;

  const headerIdxStart = content.indexOf('t.jsxs("header",{className:"bg-white border-b border-slate-200 px-8 py-3.5');
  const headerIdxEnd = content.indexOf('id:"workspace-main-content"', headerIdxStart);

  if (headerIdxStart !== -1 && headerIdxEnd !== -1) {
    const headerBefore = content.substring(0, headerIdxStart);
    const headerAfter = content.substring(headerIdxEnd + 'id:"workspace-main-content"'.length);
    content = `${headerBefore}${modernTopBar}${headerAfter}`;
    console.log(`- Injected modern top bar with reports, parameters and right-corner logos in ${path.basename(filePath)}`);
  } else {
    console.warn(`- Could not find header indices in ${path.basename(filePath)}`);
  }

  // Q. Ensure sidebar footer does not compress
  content = content.replace(
    'className:"p-3 border-t border-slate-800 bg-slate-950 space-y-2"',
    'className:"p-3 border-t border-slate-800 bg-slate-950 space-y-2 shrink-0"'
  );

  // R. Fix h4 fallback resolver to prioritize Indústria view for INDUSTRIA companies
  const oldH4 = 'function h4(e,a){return(a==null?void 0:a.accessDashboard)!==!1?"dashboard":Zre(e)&&(a==null?void 0:a.accessIndustrialDashboard)!==!1?"industry":Yre(e)&&(a==null?void 0:a.accessSales)!==!1?"sales":Jre(e)&&(a==null?void 0:a.accessServiceOrders)!==!1?"serviceOrders":"clients"}';
  const newH4 = 'function h4(e,a){const _s=Id(e);if(_s==="INDUSTRIA")return(a==null?void 0:a.accessIndustrialDashboard)!==!1||(a==null?void 0:a.accessProduction)!==!1?"industry":(a==null?void 0:a.accessDashboard)!==!1?"dashboard":"parts";if(_s==="COMERCIO")return(a==null?void 0:a.accessSales)!==!1?"sales":(a==null?void 0:a.accessDashboard)!==!1?"dashboard":"parts";if(_s==="OFICINA")return(a==null?void 0:a.accessDashboard)!==!1?"dashboard":(a==null?void 0:a.accessServiceOrders)!==!1?"serviceOrders":"clients";return(a==null?void 0:a.accessDashboard)!==!1?"dashboard":"clients"}';
  if (content.includes(oldH4)) {
    content = content.replace(oldH4, newH4);
    console.log(`- Fixed h4 fallback resolver to prioritize Indústria view for INDUSTRIA companies in ${path.basename(filePath)}`);
  }

  // S. Fix f4 safe accessible view iterator for segmented companies
  const oldF4 = 'function f4(e,a,s){const r=["dashboard","sales","serviceOrders","budgets","clients","parts","services","representative_commerce","industry","financial","history","reports","users","profile"];for(const n of r)if(IA(e,a,n,s))return n;return"profile"}';
  const newF4 = 'function f4(e,a,s){const _bt=Bb(e),r=_bt==="INDUSTRIA"?["industry","parts","clients","financial","reports","users","profile"]:_bt==="COMERCIO"?["sales","parts","clients","financial","reports","users","profile"]:["dashboard","serviceOrders","budgets","sales","clients","parts","services","representative_commerce","financial","history","reports","users","profile"];for(const n of r)if(IA(e,a,n,s))return n;return"profile"}';
  if (content.includes(oldF4)) {
    content = content.replace(oldF4, newF4);
    console.log(`- Fixed f4 safe accessible view iterator for segmented companies in ${path.basename(filePath)}`);
  }

  // T. Enhanced company switcher (it) to auto-transition segment view
  const oldItSwitch = 'if(!IA(Dt,Yt,De,ga)){const Ea=f4(Dt,Yt,ga);me(Ea)}';
  const newItSwitch = `const _btSwitch=Bb(Dt);if(_btSwitch==="INDUSTRIA"){try{sessionStorage.setItem("motordesk_active_dashboard_tab","INDUSTRIA")}catch{}if(De==="dashboard"||De==="serviceOrders"||De==="budgets"||De==="vehicles"||De==="services")me("industry");else if(!IA(Dt,Yt,De,ga)){me(f4(Dt,Yt,ga))}}else if(_btSwitch==="COMERCIO"){try{sessionStorage.setItem("motordesk_active_dashboard_tab","COMERCIO")}catch{}if(De==="serviceOrders"||De==="vehicles")me("sales");else if(!IA(Dt,Yt,De,ga)){me(f4(Dt,Yt,ga))}}else{try{sessionStorage.setItem("motordesk_active_dashboard_tab","OFICINA")}catch{}if(De==="industry")me("dashboard");else if(!IA(Dt,Yt,De,ga)){me(f4(Dt,Yt,ga))}}`;
  if (content.includes(oldItSwitch)) {
    content = content.replace(oldItSwitch, newItSwitch);
    console.log(`- Enhanced company switcher (it) to auto-transition segment view in ${path.basename(filePath)}`);
  }

  // U. Added industrial aliases to zt route resolver
  const oldZtEnd = 'ind_bi_relatorios:"ind_bi_relatorios"})[ft]||ft';
  const newZtEnd = 'ind_bi_relatorios:"ind_bi_relatorios",industrial:"industry",industria:"industry",ind:"industry",ind_pcp:"industry",price_calculation:"price_calculation",price_markup:"price_calculation",markup:"price_calculation",formacao_preco:"price_calculation",representative_orders:"representative_orders",pedidos_realizados:"representative_orders",pedidos_fabricas:"representative_orders"})[ft]||ft';
  if (content.includes(oldZtEnd)) {
    content = content.replace(oldZtEnd, newZtEnd);
    console.log(`- Added industrial, price and representative aliases to zt route resolver in ${path.basename(filePath)}`);
  }

  // V. Added corresponding icons for all modules and submenus in IndustrialHierarchicalSidebar
  const sidebarIconMaps = `
var MODULE_ICONS_MAP = {
  ind_mod_comercial: "📢",
  ind_mod_engenharia: "📐",
  ind_mod_pcp: "📅",
  ind_mod_rh: "👷",
  ind_mod_cadastros: "🔩",
  ind_mod_producao: "⚙️",
  ind_mod_qualidade: "✅",
  ind_mod_manutencao: "🛠️",
  ind_mod_almoxarifado: "📦",
  ind_mod_expedicao: "🚚",
  ind_mod_bi: "📈"
};
var SUBMENU_ICONS_MAP = {
  ind_com_marketing: "📢",
  ind_com_clientes: "👥",
  ind_com_orcamentos: "📑",
  ind_com_pedidos: "🛒",
  ind_com_carteira: "📈",
  ind_com_posvenda: "🎧",
  ind_eng_dashboard: "📊",
  ind_eng_projetos: "💡",
  ind_eng_produtos: "⚙️",
  units_of_measure: "📏",
  ind_eng_boms: "🧩",
  ind_eng_fichatecnica: "📋",
  ind_eng_solidworks: "📐",
  ind_eng_revisoes: "🔄",
  ind_pcp_planejamento: "📅",
  ind_pcp_mrp: "🔢",
  ind_pcp_solicitacoes: "📝",
  quotations: "🤝",
  ind_pcp_compras: "🛒",
  ind_pcp_semaforo: "🚦",
  ind_pcp_recebimento: "📥",
  ind_rh_dashboard: "📊",
  ind_rh_operadores: "👷",
  ind_rh_apontamentos: "⏱️",
  ind_rh_paradas: "🛑",
  ind_rh_produtividade: "⚡",
  ind_cad_dashboard: "📊",
  item_master: "🔩",
  warehouse_locations: "📍",
  label_generator: "🏷️",
  categories: "🗂️",
  suppliers: "🏭",
  ind_prod_pcp_dash: "📊",
  production_orders: "⚙️",
  lots: "🏷️",
  trace_product: "🔍",
  ind_prod_custos: "💲",
  ind_cq_dashboard: "📊",
  quality_inspections: "✅",
  non_conformities: "⚠️",
  ind_pcm_dashboard: "📊",
  equipment_maintenance: "🛠️",
  ind_almox_dash: "📊",
  ind_almox_locs: "📦",
  ind_almox_mov: "🔁",
  ind_exp_dash: "📊",
  client_installation: "🏗️",
  withdrawals: "🚚",
  industrial_reports: "📈",
  cost_analysis: "💰"
};
`;
  if (!content.includes('var SUBMENU_ICONS_MAP')) {
    content = content.replace(
      'function IndustrialHierarchicalSidebar(props) {',
      `${sidebarIconMaps}\n\n${wrappedSidebarTreeMenu}\n\nfunction IndustrialHierarchicalSidebar(props) {`
    );
  }

  // Replace Industrial modules with interactive SidebarTreeMenu
  const startMarker = "return t.jsxs(\"div\", {\n          key: mod.id,";
  const endMarker = "})\n          ]\n        });\n      }),";
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const beforeMapRet = content.substring(0, startIdx);
    const afterMapRet = content.substring(endIdx + endMarker.length);
    const newMapRet = `return t.jsx(SidebarTreeMenu, {
          key: mod.id,
          id: mod.id,
          title: mod.name,
          icon: t.jsx("span", { className: "text-xs shrink-0", children: (typeof MODULE_ICONS_MAP !== "undefined" && MODULE_ICONS_MAP[mod.id]) || mod.num }),
          badge: mod.num,
          badgeColor: mod.color,
          isCollapsed: isCollapsed,
          isHovered: isHovered,
          activeRoute: activeRoute,
          onNavigate: (subId) => onNavigate && onNavigate(subId),
          submenus: allowedSubs.map(s => ({
            id: s.id,
            label: s.label,
            icon: (typeof SUBMENU_ICONS_MAP !== "undefined" && SUBMENU_ICONS_MAP[s.id]) || "📌"
          }))
        });
      }),`;
    content = `${beforeMapRet}${newMapRet}${afterMapRet}`;
    console.log(`- Replaced Industrial modules with interactive SidebarTreeMenu in ${path.basename(filePath)}`);
  }

  // W. Liberate Industrial backup button for all users and segments
  const qaBackupSection = 'isQAUser && t.jsxs("div", {\n        className: "px-2 py-1.5 mb-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-purple-500/15 to-blue-500/20 border border-amber-500/40 text-amber-200",';
  const liberatedBackupSection = 'true && t.jsxs("div", {\n        className: "px-2 py-1.5 mb-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-purple-500/15 to-blue-500/20 border border-amber-500/40 text-amber-200",';
  if (content.includes(qaBackupSection)) {
    content = content.replace(qaBackupSection, liberatedBackupSection);
    content = content.replace(
      't.jsx("span", { children: "🛡️ PAINEL AUDITORIA QA" })',
      't.jsx("span", { children: "💾 BACKUP DO SISTEMA" })'
    );
    content = content.replace(
      't.jsx("span", { className: "px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-mono font-extrabold", children: "QA ROLE" })',
      't.jsx("span", { className: "px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 text-[9px] font-mono font-extrabold", children: "LIBERADO" })'
    );
    content = content.replace(
      '(!isCollapsed || isHovered) ? "Configurar Serviço de Backup" : "Backup QA"',
      '(!isCollapsed || isHovered) ? "Backup da Base de Dados" : "Backup"'
    );
    content = content.replace(
      'onClick: () => setShowBackupModal(true)',
      'onClick: () => { setShowBackupModal(true); try { if (window.__openBackupModal) window.__openBackupModal(); if (window.openBackupModal) window.openBackupModal(); } catch(e) {} }'
    );
    content = content.replace(
      't.jsx("span", { className: "px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold font-mono", children: "EXCLUSIVO QA" })',
      't.jsx("span", { className: "px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold font-mono", children: "TODOS OS SEGMENTOS" })'
    );
    console.log(`- Liberated Industrial backup button for all users and segments in ${path.basename(filePath)}`);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully updated ${filePath} (Size: ${(content.length / (1024*1024)).toFixed(2)} MB)`);
}

console.log('=== INTEGRATION COMPLETE ===');
