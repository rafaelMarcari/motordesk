const fs = require("fs");

const bundle = fs.readFileSync("public/assets/index-CUxTo0fH.js", "utf8");

function getFunction(name) {
  const marker = "function " + name + "(";
  const start = bundle.indexOf(marker);
  if (start === -1) throw new Error("Function not found: " + name);
  let depth = 0;
  let started = false;
  for (let i = start; i < bundle.length; i++) {
    if (bundle[i] === "{") {
      depth++;
      started = true;
    } else if (bundle[i] === "}") {
      depth--;
      if (started && depth === 0) {
        return bundle.substring(start, i + 1);
      }
    }
  }
  return "";
}

const idCode = getFunction("Id");
const giCode = getFunction("gI");
const rvCode = getFunction("rv");
const svCode = getFunction("sv");
const faCode = getFunction("FA");
const hcCode = getFunction("Hc");
const wdCode = getFunction("Wd");
const kaCode = getFunction("KA");
const biCode = getFunction("bI");
const iaCode = getFunction("IA");

const pZre = bundle.indexOf("const zre={");
const pZreEnd = bundle.indexOf("};", pZre) + 2;
const zreCode = bundle.substring(pZre, pZreEnd);

const pFA = bundle.indexOf("function FA(");
const pXD = bundle.lastIndexOf("const xD=", pFA);
const pXDEnd = bundle.indexOf("function FA(", pXD);
const xdCode = bundle.substring(pXD, pXDEnd);

const script = `
const Cv = [];
${idCode}
${giCode}
${rvCode}
${svCode}
${xdCode}
${faCode}
${hcCode}
${wdCode}
${kaCode}
${biCode}
${zreCode}
${iaCode}

const user = {
  id: "usr-validador",
  username: "validador",
  name: "Validador QA & Admin",
  role: "admin",
  companyId: "comp-1",
  active: true,
  permissions: {
    accessDashboard: true,
    accessSales: true,
    accessClients: true,
    accessVehicles: true,
    accessParts: true,
    accessServices: true,
    accessBudgets: true,
    accessServiceOrders: true,
    accessFinancial: true,
    accessFiscal: true,
    accessHistory: true,
    accessReports: true,
    accessUserManagement: true,
    accessProduction: true,
    accessCommercial: true,
    accessEngineering: true,
    accessCommercialMarketing: true,
    accessCommercialBudgets: true,
    accessCommercialOrders: true,
    accessCommercialBacklog: true,
    accessCommercialAfterSales: true,
    accessIndustrialDashboard: true
  }
};

const comp1 = { id: "comp-1", name: "Matriz", businessType: "OFICINA", modules: sv("OFICINA") };
const comp5 = { id: "comp-5", name: "Indústria", businessType: "INDUSTRIA", modules: sv("INDUSTRIA") };

console.log("=== COMP1 (OFICINA) ===");
for (const r of ["dashboard", "sales", "services", "budgets", "serviceOrders", "clients", "vehicles", "parts", "history", "reports", "users", "industry", "ind_com_marketing", "ind_eng_dashboard", "pcp_dashboard"]) {
  console.log("  " + r + ":", IA(comp1, user, r, { users: [user], companyInfo: comp1 }));
}

console.log("\\n=== COMP5 (INDUSTRIA) ===");
for (const r of ["dashboard", "sales", "services", "budgets", "serviceOrders", "clients", "vehicles", "parts", "history", "reports", "users", "industry", "ind_com_marketing", "ind_eng_dashboard", "pcp_dashboard"]) {
  console.log("  " + r + ":", IA(comp5, user, r, { users: [user], companyInfo: comp5 }));
}
`;

fs.writeFileSync("scripts/test_runner.cjs", script);
console.log("Generated scripts/test_runner.cjs successfully");

