const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const bundlePath = path.join(__dirname, "../public/assets/index-CUxTo0fH.js");
const distBundlePath = path.join(__dirname, "../dist/assets/index-CUxTo0fH.js");

let bundle = fs.readFileSync(bundlePath, "utf8");

// 1. Atualizar chamada em TVe
const oldCall = 'm==="cad_solidworks_integrations"&&t.jsx(hVe,{boms:N,parts:S,currentUser:a,activeCompanyId:(s==null?void 0:s.id)||"comp-1",onSaveBom:G,onSavePart:ie,onNavigateTab:xe=>p(xe),onAddHistoryLog:o})';
const newCall = 'm==="cad_solidworks_integrations"&&t.jsx(hVe,{boms:N,parts:S,warehouseLocations:X,productionOrders:w,currentUser:a,activeCompanyId:(s==null?void 0:s.id)||"comp-1",onSaveBom:G,onSavePart:ie,onSaveProductionOrder:fe,onUpdateDb:i,onGenerateMrpQuotation:ge,onNavigateTab:xe=>p(xe),onNavigateToView:l,onAddHistoryLog:o})';

if (bundle.includes(oldCall)) {
  bundle = bundle.replace(oldCall, newCall);
  console.log("Chamada em TVe atualizada!");
} else if (bundle.includes(newCall)) {
  console.log("Chamada em TVe já está atualizada!");
} else {
  console.error("Chamada antiga ou nova não encontrada em TVe!");
  process.exit(1);
}

// 2. Preparar snippet
let componentCode = fs.readFileSync(path.join(__dirname, "hve_component.js"), "utf8");

let snippet = componentCode
  .replace(/\/\/ Catálogo de Montagens[\s\S]*?const tv =/, "tv=")
  .replace(/\];\s*\/\/\s*Componente hVe\s*const hVe =/, "],hVe=");

snippet = snippet.trim();
if (snippet.endsWith(";")) {
  snippet = snippet.slice(0, -1);
}

// 3. Localizar posições
const tvPos = bundle.indexOf("tv=[");
const hVePos = bundle.indexOf(",hVe=", tvPos);
const avePos = bundle.indexOf("function AVe", hVePos);

if (tvPos === -1 || hVePos === -1 || avePos === -1) {
  console.error("Posições não encontradas:", { tvPos, hVePos, avePos });
  process.exit(1);
}

console.log("Substituindo de", tvPos, "até", avePos);
const newBundle = bundle.substring(0, tvPos) + snippet + ";" + bundle.substring(avePos);

// 4. Validar sintaxe com esbuild
try {
  console.log("Validando bundle com esbuild...");
  esbuild.transformSync(newBundle, { loader: "js" });
  console.log("ESBUILD VALIDATION: 100% SUCESSO! 0 erros de sintaxe!");

  // Salvar em public e em dist
  fs.writeFileSync(bundlePath, newBundle, "utf8");
  fs.writeFileSync(distBundlePath, newBundle, "utf8");
  console.log("Arquivos salvos com sucesso em public/ e dist/!");
} catch (err) {
  console.error("ERRO ESBUILD:", err.message);
  process.exit(1);
}
