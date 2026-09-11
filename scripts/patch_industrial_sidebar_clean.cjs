const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const bundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
let bundle = fs.readFileSync(bundlePath, "utf8");
console.log("Original bundle length:", bundle.length);

// 1. Add units_of_measure to INDUSTRIAL_MODULES (Module 2 and Module 5)
const pEng = bundle.indexOf('id: "ind_mod_engenharia"');
if (pEng === -1) {
  throw new Error("ind_mod_engenharia not found in bundle!");
}
const engBomsTarget = '{ id: "ind_eng_boms", label: "Estruturas de Produto (BOM)", perm: "accessBillOfMaterials", tab: "boms" }';
const engUnitsSnippet = '{ id: "units_of_measure", label: "Unidades de Medida (UN/KG/M)", perm: "accessUnitsOfMeasure" },      ';
if (!bundle.substring(pEng, pEng + 1000).includes("units_of_measure")) {
  bundle = bundle.replace(engBomsTarget, engUnitsSnippet + engBomsTarget);
  console.log("Added units_of_measure to Engenharia module");
}

const pProd = bundle.indexOf('id: "ind_mod_producao"');
if (pProd === -1) {
  throw new Error("ind_mod_producao not found in bundle!");
}
const prodPartsTarget = '{ id: "parts", label: "Almoxarifado: Estoque Físico", perm: "accessParts" }';
const prodUnitsSnippet = '{ id: "parts", label: "Almoxarifado: Estoque Físico", perm: "accessParts" },      { id: "units_of_measure", label: "Almoxarifado: Unidades de Medida", perm: "accessUnitsOfMeasure" }';
if (!bundle.substring(pProd, pProd + 1500).includes("units_of_measure")) {
  bundle = bundle.replace(prodPartsTarget, prodUnitsSnippet);
  console.log("Added units_of_measure to Almoxarifado / Produção module");
}

// 2. Enhance permission check in IndustrialHierarchicalSidebar
const oldAllowedSubs = 'const allowedSubs = mod.submenus.filter(sub => !sub.perm || (canAccess && canAccess(sub.perm)));';
const newAllowedSubs = 'const allowedSubs = mod.submenus.filter(sub => { if (!sub.perm) return true; if (currentUser && (currentUser.role === "admin" || currentUser.role === "qa")) return true; if (currentUser && currentUser.permissions) { if (currentUser.permissions[sub.perm] === false) return false; if (currentUser.permissions[sub.perm] === true) return true; if (sub.id && currentUser.permissions[sub.id] === true) return true; } if (canAccess) return canAccess(sub.id) || canAccess(sub.perm); return true; });';
if (bundle.includes(oldAllowedSubs)) {
  bundle = bundle.replace(oldAllowedSubs, newAllowedSubs);
  console.log("Updated allowedSubs in IndustrialHierarchicalSidebar");
}

// 3. Update dashboard button label for Industry
const pSidebar = bundle.indexOf("IndustrialHierarchicalSidebar", 5000000);
const pDash = bundle.lastIndexOf("menu-btn-dashboard", pSidebar);
const pDashBtnStart = bundle.lastIndexOf('$e("dashboard")&&t.jsx("button",{id:"menu-btn-dashboard"', pDash);
const pDashBtnEnd = bundle.indexOf("})}),", pDash) + 5;
const dashBtnCode = bundle.substring(pDashBtnStart, pDashBtnEnd);

const newDashBtnCode = dashBtnCode
  .replace('title:"Dashboard KPI"', 'title:Te==="INDUSTRIA"?"Dashboard Geral Industrial":"Dashboard KPI"')
  .replace('children:"Dashboard KPI"', 'children:Te==="INDUSTRIA"?"Dashboard Industrial":"Dashboard KPI"');

bundle = bundle.substring(0, pDashBtnStart) + newDashBtnCode + bundle.substring(pDashBtnEnd);
console.log("Updated Dashboard button for Industry");

// 4. Wrap legacy buttons in Te!=="INDUSTRIA" and wrap IndustrialHierarchicalSidebar in Te==="INDUSTRIA"
const pSidebar2 = bundle.indexOf("t.jsx(IndustrialHierarchicalSidebar", 5000000);
const pDash2 = bundle.lastIndexOf("menu-btn-dashboard", pSidebar2);
const pDashBtnEnd2 = bundle.indexOf("})}),", pDash2) + 5;

// Legacy buttons are from pDashBtnEnd2 to pSidebar2
const legacyButtons = bundle.substring(pDashBtnEnd2, pSidebar2);
console.log("Legacy buttons length to wrap:", legacyButtons.length);

const pSidebarEnd = bundle.indexOf("})", pSidebar2) + 2;
const sidebarCall = bundle.substring(pSidebar2, pSidebarEnd);

const wrappedReplacement = 'Te!=="INDUSTRIA"&&t.jsxs(t.Fragment,{children:[' + legacyButtons + ']},"legacy-menus"),Te==="INDUSTRIA"&&' + sidebarCall + ",";

bundle = bundle.substring(0, pDashBtnEnd2) + wrappedReplacement + bundle.substring(pSidebarEnd + 1);
console.log("Wrapped legacy buttons and IndustrialHierarchicalSidebar conditionally by segment");

// 5. Add industrial permissions to usr-validador and grp-admin in bundle
const indPerms = 'accessProduction:!0,accessIndustrialDashboard:!0,accessEngineering:!0,accessBillOfMaterials:!0,accessCADSolidWorks:!0,accessPCP:!0,accessMRP:!0,accessIndustrialPurchasing:!0,accessIndustrialRH:!0,accessWarehouseLocations:!0,accessIndustrialStock:!0,accessLots:!0,accessMaterialSeparation:!0,accessLabelGenerator:!0,accessProductionOrders:!0,accessProductionFloor:!0,accessExpedition:!0,accessQualityControl:!0,accessMaintenance:!0,accessClientPortal:!0,accessIndustrialCosts:!0,accessIndustrialReports:!0,accessProcessTracking:!0,accessCommercial:!0,';

const pVal = bundle.indexOf('id:"usr-validador"');
if (pVal !== -1) {
  const pValPerm = bundle.indexOf('permissions:{', pVal);
  if (pValPerm !== -1 && !bundle.substring(pValPerm, pValPerm + 200).includes("accessProduction")) {
    bundle = bundle.substring(0, pValPerm + 13) + indPerms + bundle.substring(pValPerm + 13);
    console.log("Added industrial permissions to usr-validador");
  }
}

const pGrp = bundle.indexOf('id:"grp-admin"');
if (pGrp !== -1) {
  const pGrpPerm = bundle.indexOf('permissions:{', pGrp);
  if (pGrpPerm !== -1 && !bundle.substring(pGrpPerm, pGrpPerm + 200).includes("accessProduction")) {
    bundle = bundle.substring(0, pGrpPerm + 13) + indPerms + bundle.substring(pGrpPerm + 13);
    console.log("Added industrial permissions to grp-admin");
  }
}

// 6. Validate with esbuild
console.log("Validating updated bundle with esbuild...");
esbuild.transformSync(bundle, { loader: "js" });
console.log("esbuild validation PASSED!");

// 7. Write updated bundle
fs.writeFileSync(bundlePath, bundle, "utf8");
console.log("Saved patched bundle successfully. New length:", bundle.length);
