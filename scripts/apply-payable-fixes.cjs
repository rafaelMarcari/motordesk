const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve('public/assets/index-CUxTo0fH.js');
let bundle = fs.readFileSync(bundlePath, 'utf8');

const startWPF = bundle.indexOf('var WarelinePayablesFiltersView');
if (startWPF === -1) {
  console.error('ERRO: WarelinePayablesFiltersView não encontrado no bundle');
  process.exit(1);
}

console.log('Iniciando atualização de WarelinePayablesFiltersView...');

// 1. Substituir declaração do state newPayable
const idxState = bundle.indexOf('const [newPayable, setNewPayable] = useState({', startWPF);
const idxStateEnd = bundle.indexOf('notes: ""\n  });', idxState);
const oldStateSnippet = bundle.slice(idxState, idxStateEnd + 'notes: ""\n  });'.length);

const newStateSnippet = `const [newPayable, setNewPayable] = useState({
    supplierName: "",
    supplierCnpj: "",
    docNumber: "",
    category: "Despesas Fixas",
    amount: 350,
    dueDate: todayStr,
    emissionDate: todayStr,
    installment: "01/01",
    notes: "",
    expenseType: "FIXA_MENSAL",
    replicateMonths: 12,
    installmentCount: 3,
    installments: [
      { number: 1, dueDate: todayStr, amount: 350 },
      { number: 2, dueDate: todayStr, amount: 350 },
      { number: 3, dueDate: todayStr, amount: 350 }
    ]
  });
  const handleInstallmentCountChange = (count) => {
    const n = Math.max(2, Math.min(48, Number(count) || 2));
    const [yStr, mStr, dStr] = (newPayable.dueDate || todayStr).split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10) || 10;
    const baseAmt = Math.round(((Number(newPayable.amount) || 0) / n) * 100) / 100;
    const newInsts = [];
    for (let i = 0; i < n; i++) {
      let m = month + i;
      let y = year;
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      const lastDay = new Date(y, m, 0).getDate();
      const actualD = Math.min(day, lastDay);
      const dDate = \`\${y}-\${String(m).padStart(2, "0")}-\${String(actualD).padStart(2, "0")}\`;
      newInsts.push({
        number: i + 1,
        dueDate: dDate,
        amount: baseAmt
      });
    }
    setNewPayable((prev) => ({
      ...prev,
      installmentCount: n,
      installments: newInsts
    }));
  };
  const handleCopyFirstAmountToAll = () => {
    const firstAmt = Number(newPayable.installments?.[0]?.amount) || Number(newPayable.amount) || 0;
    const updated = (newPayable.installments || []).map((inst) => ({
      ...inst,
      amount: firstAmt
    }));
    setNewPayable((prev) => ({
      ...prev,
      amount: firstAmt * (prev.installmentCount || updated.length),
      installments: updated
    }));
  };
  const handleDivideEqually = () => {
    const total = Number(newPayable.amount) || 0;
    const n = Number(newPayable.installmentCount) || (newPayable.installments || []).length || 1;
    const piece = Math.round((total / n) * 100) / 100;
    const updated = (newPayable.installments || []).map((inst, idx) => ({
      ...inst,
      amount: idx === n - 1 ? Math.round((total - piece * (n - 1)) * 100) / 100 : piece
    }));
    setNewPayable((prev) => ({
      ...prev,
      installments: updated
    }));
  };
  const handleUpdateInstallment = (idx, field, val) => {
    const updated = [...(newPayable.installments || [])];
    if (updated[idx]) {
      updated[idx] = {
        ...updated[idx],
        [field]: field === "amount" ? parseFloat(val) || 0 : val
      };
      const newTotal = updated.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      setNewPayable((prev) => ({
        ...prev,
        amount: Math.round(newTotal * 100) / 100,
        installments: updated
      }));
    }
  };
  const handleDuplicatePayable = () => {
    const selected = payables.find((p) => p.id === selectedPayableId);
    if (!selected) {
      alert("Selecione um lançamento na tabela para duplicar.");
      return;
    }
    const amt = Number(selected.amount) || 0;
    const dDate = selected.dueDate || todayStr;
    const [yStr, mStr, dStr] = dDate.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10) || 10;
    const insts = [];
    for (let i = 0; i < 3; i++) {
      let m = month + i;
      let y = year;
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      const lastDay = new Date(y, m, 0).getDate();
      const actualD = Math.min(day, lastDay);
      insts.push({
        number: i + 1,
        dueDate: \`\${y}-\${String(m).padStart(2, "0")}-\${String(actualD).padStart(2, "0")}\`,
        amount: amt
      });
    }
    setNewPayable({
      supplierName: selected.supplierName || "",
      supplierCnpj: selected.supplierCnpj || "",
      docNumber: (selected.invoiceNumber || selected.id) + "-COPIA",
      category: selected.category || "Despesas Fixas",
      amount: amt,
      dueDate: dDate,
      emissionDate: todayStr,
      installment: selected.installment || "01/01",
      notes: (selected.description || selected.notes || "") + " (Duplicado)",
      expenseType: "FIXA_MENSAL",
      replicateMonths: 12,
      installmentCount: 3,
      installments: insts
    });
    setShowNewModal(true);
  };`;

if (idxState !== -1 && idxStateEnd !== -1) {
  bundle = bundle.replace(oldStateSnippet, newStateSnippet);
  console.log('[1] State newPayable e helpers adicionados com sucesso!');
} else {
  console.warn('[1] oldStateSnippet não encontrado diretamente!');
}

// 2. Substituir handleCreatePayable
const idxCreateStart = bundle.indexOf("const handleCreatePayable = (e) => {", startWPF);
const idxCreateEnd = bundle.indexOf("setShowNewModal(false);  };", idxCreateStart);

if (idxCreateStart !== -1 && idxCreateEnd !== -1) {
  const oldCreateSnippet = bundle.slice(idxCreateStart, idxCreateEnd + "setShowNewModal(false);  };".length);
  const newCreateSnippet = `const handleCreatePayable = (e) => {    e.preventDefault();    const supp = newPayable.supplierName || "Fornecedor Geral";    const baseDoc = newPayable.docNumber || \`NF-\${Math.floor(1e3 + Math.random() * 9e3)}\`;    const cat = newPayable.category || "Despesas Fixas";    const newEntries = [];    if (newPayable.expenseType === "FIXA_MENSAL") {      const totalMonths = Number(newPayable.replicateMonths) || 12;      const [yStr, mStr, dStr] = (newPayable.dueDate || todayStr).split("-");      const year = parseInt(yStr, 10);      const startMonth = parseInt(mStr, 10);      const day = parseInt(dStr, 10) || 10;      for (let i = 0; i < totalMonths; i++) {        let m = startMonth + i;        let y = year;        while (m > 12) {          m -= 12;          y += 1;        }        const lastDay = new Date(y, m, 0).getDate();        const actualD = Math.min(day, lastDay);        const dDate = \`\${y}-\${String(m).padStart(2, "0")}-\${String(actualD).padStart(2, "0")}\`;        const newId = \`pay-fix-\${Date.now()}-\${i + 1}\`;        newEntries.push({          id: newId,          supplierName: supp,          supplierCnpj: newPayable.supplierCnpj || "",          supplierId: "sup-1",          invoiceNumber: \`\${baseDoc}/M\${String(i + 1).padStart(2, "0")}\`,          category: cat,          amount: Number(newPayable.amount),          remainingAmount: Number(newPayable.amount),          paidAmount: 0,          dueDate: dDate,          date: newPayable.emissionDate || dDate,          status: "pending",          installment: \`\${String(i + 1).padStart(2, "0")}/\${String(totalMonths).padStart(2, "0")}\`,          description: (newPayable.notes ? newPayable.notes + " - " : "") + \`Despesa Fixa Mensal (\${String(i + 1).padStart(2, "0")}/\${String(totalMonths).padStart(2, "0")})\`,          expenseType: "FIXA_MENSAL"        });      }    } else if (newPayable.expenseType === "PARCELADA") {      const list = (newPayable.installments && newPayable.installments.length > 0)        ? newPayable.installments        : [{ number: 1, dueDate: newPayable.dueDate, amount: Number(newPayable.amount) }];      const totalCount = list.length;      list.forEach((inst, idx) => {        const newId = \`pay-parc-\${Date.now()}-\${idx + 1}\`;        const instNum = String(idx + 1).padStart(2, "0");        const totalStr = String(totalCount).padStart(2, "0");        const instAmount = Number(inst.amount) || 0;        newEntries.push({          id: newId,          supplierName: supp,          supplierCnpj: newPayable.supplierCnpj || "",          supplierId: "sup-1",          invoiceNumber: \`\${baseDoc}-P\${idx + 1}\`,          category: cat,          amount: instAmount,          remainingAmount: instAmount,          paidAmount: 0,          dueDate: inst.dueDate || newPayable.dueDate,          date: newPayable.emissionDate || newPayable.dueDate,          status: "pending",          installment: \`\${instNum}/\${totalStr}\`,          description: (newPayable.notes ? newPayable.notes + " - " : "") + \`Boleto / Parcela \${instNum}/\${totalStr}\`,          expenseType: "PARCELADA"        });      });    } else {      const newId = \`pay-\${Date.now()}\`;      newEntries.push({        id: newId,        supplierName: supp,        supplierCnpj: newPayable.supplierCnpj || "",        supplierId: "sup-1",        invoiceNumber: baseDoc,        category: cat,        amount: Number(newPayable.amount),        remainingAmount: Number(newPayable.amount),        paidAmount: 0,        dueDate: newPayable.dueDate,        date: newPayable.emissionDate,        status: "pending",        installment: "01/01",        description: newPayable.notes || \`\${cat} - Doc \${baseDoc}\`,        expenseType: "VARIAVEL"      });    }    onSavePayables([...newEntries, ...payables]);    if (onAddHistoryLog) {      onAddHistoryLog({        action: "CREATE_PAYABLE",        description: \`Cadastrado(s) \${newEntries.length} lançamento(s) de contas a pagar (\${newPayable.expenseType === "FIXA_MENSAL" ? "Despesa Fixa Recorrente" : newPayable.expenseType === "PARCELADA" ? "Despesa Parcelada" : "Despesa Variável"}).\`,        user: currentUser?.name || "Administrador",        date: (/* @__PURE__ */ new Date()).toISOString()      });    }    setShowNewModal(false);  };`;

  bundle = bundle.replace(oldCreateSnippet, newCreateSnippet);
  console.log('[2] handleCreatePayable atualizado com suporte a Fixa/Variável/Parcelada!');
}

// 3. Adicionar botão Duplicar na toolbar
const oldBtnNovo = `id: "btn-pay-novo",            type: "button",            onClick: () => setShowNewModal(true),            className: "px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer",            children: [              /* @__PURE__ */ jsx2(Plus, { className: "w-3.5 h-3.5 text-emerald-600" }),              /* @__PURE__ */ jsx2("span", { children: "Novo" })            ]          }        ),`;
const newBtnNovo = `id: "btn-pay-novo",            type: "button",            onClick: () => {              setNewPayable({                supplierName: "",                supplierCnpj: "",                docNumber: "",                category: "Despesas Fixas",                amount: 350,                dueDate: todayStr,                emissionDate: todayStr,                installment: "01/01",                notes: "",                expenseType: "FIXA_MENSAL",                replicateMonths: 12,                installmentCount: 3,                installments: [                  { number: 1, dueDate: todayStr, amount: 350 },                  { number: 2, dueDate: todayStr, amount: 350 },                  { number: 3, dueDate: todayStr, amount: 350 }                ]              });              setShowNewModal(true);            },            className: "px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1 transition shadow-3xs cursor-pointer",            children: [              /* @__PURE__ */ jsx2(Plus, { className: "w-3.5 h-3.5 text-emerald-600" }),              /* @__PURE__ */ jsx2("span", { children: "Novo" })            ]          }        ),        /* @__PURE__ */ jsxs2(          "button",          {            id: "btn-pay-duplicar",            type: "button",            onClick: handleDuplicatePayable,            className: "px-2.5 py-1 rounded bg-white hover:bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 flex items-center gap-1 transition shadow-3xs cursor-pointer",            title: "Duplicar / Replicar Lançamento Selecionado",            children: [              /* @__PURE__ */ jsx2(RefreshCw, { className: "w-3.5 h-3.5 text-indigo-600" }),              /* @__PURE__ */ jsx2("span", { children: "Duplicar Lançamento" })            ]          }        ),`;

if (bundle.includes(oldBtnNovo)) {
  bundle = bundle.replace(oldBtnNovo, newBtnNovo);
  console.log('[3] Botão Duplicar Lançamento adicionado à barra de ferramentas!');
}

// 4. Substituir showNewModal JSX completo
const startModal = bundle.indexOf('showNewModal && /* @__PURE__ */ jsx2("div", { className: "fixed inset-0 z-50 bg-slate-950/70', startWPF);
const endMarker = 'children: "Cadastrar Conta a Pagar"            }          )        ] })      ] })    ] }) })';
const endModalPos = bundle.indexOf(endMarker, startModal);

if (startModal !== -1 && endModalPos !== -1) {
  const oldModalFull = bundle.slice(startModal, endModalPos + endMarker.length);

  const newModalFull = `showNewModal && /* @__PURE__ */ jsx2("div", { className: "fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto", children: /* @__PURE__ */ jsxs2("div", { className: "bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto", children: [
      /* @__PURE__ */ jsxs2("div", { className: "bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsx2(Plus, { className: "w-5 h-5 text-emerald-400 shrink-0" }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("h3", { className: "font-bold text-sm", children: "Lançamento de Contas a Pagar / Despesas" }),
            /* @__PURE__ */ jsx2("p", { className: "text-[11px] text-slate-300", children: "Parametrização inteligente de despesas fixas recorrentes, variáveis e parceladas" })
          ] })
        ] }),
        /* @__PURE__ */ jsx2(
          "button",
          {
            type: "button",
            onClick: () => setShowNewModal(false),
            className: "text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer",
            children: /* @__PURE__ */ jsx2(X, { className: "w-5 h-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs2("form", { onSubmit: handleCreatePayable, className: "p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto", children: [
        /* @__PURE__ */ jsxs2("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2", children: [
          /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-800 uppercase tracking-wider text-[11px]", children: "Tipo de Despesa & Periodicidade *" }),
          /* @__PURE__ */ jsxs2("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2", children: [
            /* @__PURE__ */ jsxs2(
              "button",
              {
                type: "button",
                onClick: () => setNewPayable({ ...newPayable, expenseType: "FIXA_MENSAL" }),
                className: \`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 \${newPayable.expenseType === "FIXA_MENSAL" ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs" : "bg-white border-slate-200 hover:bg-slate-100"}\`,
                children: [
                  /* @__PURE__ */ jsxs2("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsx2("span", { className: "font-bold text-indigo-950 text-xs", children: "🔁 Fixa & Mensal" }),
                    newPayable.expenseType === "FIXA_MENSAL" && /* @__PURE__ */ jsx2("span", { className: "w-2 h-2 rounded-full bg-indigo-600" })
                  ] }),
                  /* @__PURE__ */ jsx2("span", { className: "text-[10px] text-slate-600 leading-tight", children: "Replica para todos os 12 meses do ano com a mesma data e valor" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs2(
              "button",
              {
                type: "button",
                onClick: () => setNewPayable({ ...newPayable, expenseType: "VARIAVEL" }),
                className: \`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 \${newPayable.expenseType === "VARIAVEL" ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs" : "bg-white border-slate-200 hover:bg-slate-100"}\`,
                children: [
                  /* @__PURE__ */ jsxs2("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsx2("span", { className: "font-bold text-amber-950 text-xs", children: "⚡ Variável (Avulsa)" }),
                    newPayable.expenseType === "VARIAVEL" && /* @__PURE__ */ jsx2("span", { className: "w-2 h-2 rounded-full bg-amber-600" })
                  ] }),
                  /* @__PURE__ */ jsx2("span", { className: "text-[10px] text-slate-600 leading-tight", children: "Não replica. Lançamento avulso apenas no mês (mês a mês)" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs2(
              "button",
              {
                type: "button",
                onClick: () => {
                  handleInstallmentCountChange(newPayable.installmentCount || 3);
                  setNewPayable((prev) => ({ ...prev, expenseType: "PARCELADA" }));
                },
                className: \`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 \${newPayable.expenseType === "PARCELADA" ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs" : "bg-white border-slate-200 hover:bg-slate-100"}\`,
                children: [
                  /* @__PURE__ */ jsxs2("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsx2("span", { className: "font-bold text-emerald-950 text-xs", children: "📑 Parcelada / Boleto" }),
                    newPayable.expenseType === "PARCELADA" && /* @__PURE__ */ jsx2("span", { className: "w-2 h-2 rounded-full bg-emerald-600" })
                  ] }),
                  /* @__PURE__ */ jsx2("span", { className: "text-[10px] text-slate-600 leading-tight", children: "Escolha o nº de parcelas, valores individuais ou cópia rápida" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "Beneficiário / Fornecedor *" }),
            /* @__PURE__ */ jsx2(
              "input",
              {
                type: "text",
                required: true,
                placeholder: "Razão Social ou Nome do Fornecedor",
                value: newPayable.supplierName,
                onChange: (e) => setNewPayable({ ...newPayable, supplierName: e.target.value }),
                className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "Nº Documento / Nota Fiscal" }),
            /* @__PURE__ */ jsx2(
              "input",
              {
                type: "text",
                placeholder: "Ex: NF-e 4521 ou FAT-098",
                value: newPayable.docNumber,
                onChange: (e) => setNewPayable({ ...newPayable, docNumber: e.target.value }),
                className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "Categoria *" }),
            /* @__PURE__ */ jsxs2(
              "select",
              {
                value: newPayable.category,
                onChange: (e) => setNewPayable({ ...newPayable, category: e.target.value }),
                className: "w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold",
                children: [
                  /* @__PURE__ */ jsx2("option", { value: "Despesas Fixas", children: "Despesas Operacionais / Fixas" }),
                  /* @__PURE__ */ jsx2("option", { value: "Nota Fiscal de Estoque", children: "Nota Fiscal de Peças / Matéria-Prima" }),
                  /* @__PURE__ */ jsx2("option", { value: "Nota Fiscal de Serviço", children: "Nota Fiscal de Serviço" }),
                  /* @__PURE__ */ jsx2("option", { value: "Folha de Pagamento & Comissões", children: "Folha de Pagamento & Comissões" }),
                  /* @__PURE__ */ jsx2("option", { value: "Impostos", children: "Impostos & Tributos (DAS, ICMS, IPI, PIS)" }),
                  /* @__PURE__ */ jsx2("option", { value: "Tarifas", children: "Tarifas Bancárias & Financiamentos" }),
                  /* @__PURE__ */ jsx2("option", { value: "Adiantamentos", children: "Adiantamento a Fornecedor" }),
                  /* @__PURE__ */ jsx2("option", { value: "Benefícios & Encargos", children: "Benefícios & Encargos Sociais" }),
                  /* @__PURE__ */ jsx2("option", { value: "Outros", children: "Outros Títulos" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: newPayable.expenseType === "PARCELADA" ? "Valor Total (R$) *" : "Valor do Lançamento (R$) *" }),
            /* @__PURE__ */ jsx2(
              "input",
              {
                type: "number",
                step: "0.01",
                required: true,
                value: newPayable.amount,
                onChange: (e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setNewPayable({ ...newPayable, amount: val });
                },
                className: "w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-rose-700 text-xs"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "Vencimento Base *" }),
            /* @__PURE__ */ jsx2(
              "input",
              {
                type: "date",
                required: true,
                value: newPayable.dueDate,
                onChange: (e) => {
                  const d = e.target.value;
                  setNewPayable({ ...newPayable, dueDate: d });
                  if (newPayable.expenseType === "PARCELADA") {
                    handleInstallmentCountChange(newPayable.installmentCount || 3);
                  }
                },
                className: "w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800"
              }
            )
          ] })
        ] }),
        /* Configurações Específicas por Tipo de Despesa */
        newPayable.expenseType === "FIXA_MENSAL" && /* @__PURE__ */ jsxs2("div", { className: "p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2", children: [
          /* @__PURE__ */ jsxs2("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx2("span", { className: "text-base", children: "📅" }),
              /* @__PURE__ */ jsx2("span", { className: "font-bold text-indigo-950 text-xs", children: "Replicação Automática nos 12 Meses do Ano" })
            ] }),
            /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-1.5 text-xs text-indigo-900 font-bold", children: [
              /* @__PURE__ */ jsx2("span", { children: "Meses a Gerar:" }),
              /* @__PURE__ */ jsxs2(
                "select",
                {
                  value: newPayable.replicateMonths || 12,
                  onChange: (e) => setNewPayable({ ...newPayable, replicateMonths: Number(e.target.value) }),
                  className: "bg-white border border-indigo-300 rounded px-2 py-1 text-xs font-bold text-indigo-900",
                  children: [
                    /* @__PURE__ */ jsx2("option", { value: 12, children: "12 Meses (Ano Inteiro)" }),
                    /* @__PURE__ */ jsx2("option", { value: 6, children: "06 Meses (Semestral)" }),
                    /* @__PURE__ */ jsx2("option", { value: 3, children: "03 Meses (Trimestral)" }),
                    /* @__PURE__ */ jsx2("option", { value: 24, children: "24 Meses (Dois Anos)" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs2("p", { className: "text-[11px] text-indigo-800", children: [
            "Serão gerados ",
            /* @__PURE__ */ jsx2("strong", { children: String(newPayable.replicateMonths || 12) }),
            " lançamentos de ",
            /* @__PURE__ */ jsx2("strong", { children: \`R$ \${(Number(newPayable.amount) || 0).toFixed(2)}\` }),
            ", sempre com vencimento no dia ",
            /* @__PURE__ */ jsx2("strong", { children: (newPayable.dueDate || todayStr).slice(-2) }),
            " de cada mês, garantindo visão completa do fluxo de caixa e DRE."
          ] })
        ] }),
        newPayable.expenseType === "PARCELADA" && /* @__PURE__ */ jsxs2("div", { className: "p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3", children: [
          /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2", children: [
            /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx2("span", { className: "text-base", children: "💳" }),
              /* @__PURE__ */ jsx2("span", { className: "font-bold text-emerald-950 text-xs", children: "Composição de Parcelas & Boletos" })
            ] }),
            /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx2("span", { className: "text-xs font-bold text-emerald-900", children: "Nº de Parcelas:" }),
              /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-1", children: [
                [2, 3, 4, 5, 6, 10, 12].map((num) => /* @__PURE__ */ jsx2(
                  "button",
                  {
                    key: num,
                    type: "button",
                    onClick: () => handleInstallmentCountChange(num),
                    className: \`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer \${newPayable.installmentCount === num ? "bg-emerald-700 text-white shadow-xs" : "bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100"}\`,
                    children: \`\${num}x\`
                  }
                )),
                /* @__PURE__ */ jsx2(
                  "input",
                  {
                    type: "number",
                    min: 2,
                    max: 48,
                    value: newPayable.installmentCount || 3,
                    onChange: (e) => handleInstallmentCountChange(e.target.value),
                    className: "w-12 px-1.5 py-0.5 border border-emerald-300 rounded bg-white text-center font-bold text-xs"
                  }
                )
              ] })
            ] })
          ] }),
          /* Ações de cópia e divisão igual de valores */
          /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-center justify-between gap-2 bg-emerald-100/60 p-2 rounded-lg text-xs", children: [
            /* @__PURE__ */ jsxs2("span", { className: "text-emerald-900 font-semibold text-[11px]", children: [
              "Total das Parcelas: ",
              /* @__PURE__ */ jsx2("strong", { className: "font-mono font-extrabold text-emerald-950 text-sm", children: \`R$ \${(Number(newPayable.amount) || 0).toFixed(2)}\` })
            ] }),
            /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxs2(
                "button",
                {
                  type: "button",
                  onClick: handleCopyFirstAmountToAll,
                  className: "px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-bold text-[11px] flex items-center gap-1 shadow-3xs cursor-pointer transition",
                  title: "Se os valores forem iguais, copia o valor da 1ª parcela para todas",
                  children: [
                    /* @__PURE__ */ jsx2("span", { children: "📋" }),
                    /* @__PURE__ */ jsx2("span", { children: "Copiar Valor p/ Todas" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs2(
                "button",
                {
                  type: "button",
                  onClick: handleDivideEqually,
                  className: "px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] flex items-center gap-1 shadow-3xs cursor-pointer transition",
                  title: "Divide o valor total igualmente entre as parcelas",
                  children: [
                    /* @__PURE__ */ jsx2("span", { children: "⚖️" }),
                    /* @__PURE__ */ jsx2("span", { children: "Dividir Igualmente" })
                  ]
                }
              )
            ] })
          ] }),
          /* Tabela editável de parcelas */
          /* @__PURE__ */ jsx2("div", { className: "max-h-48 overflow-y-auto border border-emerald-200 rounded-lg bg-white", children: /* @__PURE__ */ jsxs2("table", { className: "w-full text-left border-collapse text-xs", children: [
            /* @__PURE__ */ jsx2("thead", { className: "bg-emerald-100/70 text-emerald-900 font-bold sticky top-0 border-b border-emerald-200", children: /* @__PURE__ */ jsxs2("tr", { children: [
              /* @__PURE__ */ jsx2("th", { className: "p-2 text-center w-16", children: "Parcela" }),
              /* @__PURE__ */ jsx2("th", { className: "p-2", children: "Data de Vencimento" }),
              /* @__PURE__ */ jsx2("th", { className: "p-2 text-right", children: "Valor da Parcela (R$)" })
            ] }) }),
            /* @__PURE__ */ jsx2("tbody", { children: (newPayable.installments || []).map((inst, idx) => /* @__PURE__ */ jsxs2("tr", { key: idx, className: "border-b border-emerald-100 hover:bg-emerald-50/50", children: [
              /* @__PURE__ */ jsxs2("td", { className: "p-2 text-center font-bold text-slate-700 font-mono", children: [
                String(idx + 1).padStart(2, "0"),
                "/",
                String(newPayable.installments.length).padStart(2, "0")
              ] }),
              /* @__PURE__ */ jsx2("td", { className: "p-2", children: /* @__PURE__ */ jsx2(
                "input",
                {
                  type: "date",
                  value: inst.dueDate || todayStr,
                  onChange: (e) => handleUpdateInstallment(idx, "dueDate", e.target.value),
                  className: "px-2 py-1 border border-slate-300 rounded font-mono text-xs w-full max-w-[160px]"
                }
              ) }),
              /* @__PURE__ */ jsx2("td", { className: "p-2 text-right", children: /* @__PURE__ */ jsx2(
                "input",
                {
                  type: "number",
                  step: "0.01",
                  value: inst.amount,
                  onChange: (e) => handleUpdateInstallment(idx, "amount", e.target.value),
                  className: "px-2 py-1 border border-slate-300 rounded font-mono text-xs text-right font-bold text-emerald-800 w-full max-w-[140px]"
                }
              ) })
            ] }, idx)) })
          ] }) })
        ] }),
        newPayable.expenseType === "VARIAVEL" && /* @__PURE__ */ jsxs2("div", { className: "p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1", children: [
          /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx2("span", { className: "text-base", children: "⚡" }),
            /* @__PURE__ */ jsx2("span", { className: "font-bold text-amber-950 text-xs", children: "Despesa Variável / Pontual" })
          ] }),
          /* @__PURE__ */ jsx2("p", { className: "text-[11px] text-amber-800", children: "Lançamento avulso apenas no mês deste vencimento. Não gera repetições automáticas, permitindo que você controle e lance mês a mês conforme os gastos reais acontecem." })
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "Data de Emissão *" }),
            /* @__PURE__ */ jsx2(
              "input",
              {
                type: "date",
                required: true,
                value: newPayable.emissionDate,
                onChange: (e) => setNewPayable({ ...newPayable, emissionDate: e.target.value }),
                className: "w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "CNPJ do Fornecedor (Opcional)" }),
            /* @__PURE__ */ jsx2(
              "input",
              {
                type: "text",
                placeholder: "00.000.000/0001-00",
                value: newPayable.supplierCnpj || "",
                onChange: (e) => setNewPayable({ ...newPayable, supplierCnpj: e.target.value }),
                className: "w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsx2("label", { className: "block font-bold text-slate-700 mb-1", children: "Observações / Descrição:" }),
          /* @__PURE__ */ jsx2(
            "input",
            {
              type: "text",
              placeholder: "Detalhamento da conta, centro de custos ou serviço prestado",
              value: newPayable.notes,
              onChange: (e) => setNewPayable({ ...newPayable, notes: e.target.value }),
              className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "flex items-center justify-end gap-2 pt-3 border-t border-slate-200", children: [
          /* @__PURE__ */ jsx2(
            "button",
            {
              type: "button",
              onClick: () => setShowNewModal(false),
              className: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition",
              children: "Cancelar"
            }
          ),
          /* @__PURE__ */ jsx2(
            "button",
            {
              type: "submit",
              className: "px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer shadow-md transition flex items-center gap-1.5",
              children: [
                /* @__PURE__ */ jsx2(Plus, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsx2("span", { children: newPayable.expenseType === "FIXA_MENSAL" ? \`Gerar \${newPayable.replicateMonths || 12} Lançamentos Mensais\` : newPayable.expenseType === "PARCELADA" ? \`Gerar \${(newPayable.installments || []).length} Parcelas\` : "Cadastrar Conta a Pagar" })
              ]
            }
          )
        ] })
      ] })
    ] }) })`;

  bundle = bundle.replace(oldModalFull, newModalFull);
  console.log('[4] Modal showNewModal substituído com sucesso!');
} else {
  console.warn('[4] startModal ou endModalPos não localizado!');
}

fs.writeFileSync(bundlePath, bundle, 'utf8');
console.log('--- Atualizações salvas em public/assets/index-CUxTo0fH.js com sucesso! ---');
