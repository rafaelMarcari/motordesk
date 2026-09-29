const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
const distBundlePath = path.resolve('dist/assets/index-CUxTo0fH.js');

let bundle = fs.readFileSync(bundlePath, 'utf8');

// =========================================================================
// 1. ATUALIZAR WarelinePayablesFiltersView
// =========================================================================
console.log('Atualizando WarelinePayablesFiltersView...');

const startWPF = bundle.indexOf('var WarelinePayablesFiltersView');
const endWPF = bundle.indexOf('return WarelinePayablesFiltersView;})(b,', startWPF);

if (startWPF === -1 || endWPF === -1) {
  console.error('ERRO: Não foi possível localizar os limites de WarelinePayablesFiltersView');
  process.exit(1);
}

// Localizar state newPayable
const searchState = `const [newPayable, setNewPayable] = useState({    supplierName: "",    supplierCnpj: "",    docNumber: "",    category: "Nota Fiscal de Serviço",    amount: 350,    dueDate: todayStr,    emissionDate: todayStr,    installment: "01/01",    notes: ""  });`;
const fallbackSearchState = `const [newPayable, setNewPayable] = useState({`;

console.log('Verificando presença de newPayable state...');
const idxState = bundle.indexOf('const [newPayable, setNewPayable] = useState({', startWPF);
console.log('idxState:', idxState);

// Localizar handleCreatePayable
const idxCreate = bundle.indexOf('const handleCreatePayable = (e) => {', startWPF);
console.log('idxCreate:', idxCreate);

// Localizar showNewModal
const idxModal = bundle.indexOf('showNewModal && /* @__PURE__ */ jsx2("div", { className: "fixed inset-0 z-50 bg-slate-950/70', startWPF);
console.log('idxModal:', idxModal);
