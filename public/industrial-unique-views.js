var IndustrialViewsHub = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/components/IndustrialUniqueViews.tsx
  var IndustrialUniqueViews_exports = {};
  __export(IndustrialUniqueViews_exports, {
    DowntimeRegistrationView: () => DowntimeRegistrationView,
    IndustrialSuppliersView: () => IndustrialSuppliersView,
    MaterialFamiliesView: () => MaterialFamiliesView,
    MaterialReceivingView: () => MaterialReceivingView,
    PurchaseOrdersView: () => PurchaseOrdersView,
    PurchaseRequisitionsView: () => PurchaseRequisitionsView,
    RHProductivityOEEView: () => RHProductivityOEEView,
    WarehouseTransfersView: () => WarehouseTransfersView
  });
  var import_react = __require("react");
  var import_jsx_runtime = __require("react/jsx-runtime");
  function PurchaseRequisitionsView({ db, currentUser, currentCompany, onUpdateDb, onAddHistoryLog, onNavigateTab }) {
    const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
    const [statusFilter, setStatusFilter] = (0, import_react.useState)("ALL");
    const [priorityFilter, setPriorityFilter] = (0, import_react.useState)("ALL");
    const [isModalOpen, setIsModalOpen] = (0, import_react.useState)(false);
    const [itemCode, setItemCode] = (0, import_react.useState)("");
    const [itemName, setItemName] = (0, import_react.useState)("");
    const [quantity, setQuantity] = (0, import_react.useState)(100);
    const [unit, setUnit] = (0, import_react.useState)("UN");
    const [department, setDepartment] = (0, import_react.useState)("Usinagem CNC");
    const [priority, setPriority] = (0, import_react.useState)("NORMAL");
    const [requiredDate, setRequiredDate] = (0, import_react.useState)(() => new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0]);
    const [justification, setJustification] = (0, import_react.useState)("");
    const initialRequisitions = (0, import_react.useMemo)(() => [
      {
        id: "req-001",
        code: "REQ-2026-0041",
        itemCode: "MP-ACO-1020",
        itemName: 'Barra Redonda A\xE7o 1020 2" x 6m',
        quantity: 120,
        unit: "KG",
        department: "Usinagem CNC",
        requesterName: "Carlos Mendes (Torneiro Chefe)",
        priority: "URGENTE",
        status: "PENDENTE",
        requiredDate: "2026-10-08",
        justification: "Atender OP-2026-088 de eixos para cliente B2B.",
        createdAt: "2026-10-02 08:30"
      },
      {
        id: "req-002",
        code: "REQ-2026-0042",
        itemCode: "INS-SOL-MIG",
        itemName: "Arame Tubular Solda MIG/MAG 1.2mm Carretel 15kg",
        quantity: 10,
        unit: "CX",
        department: "Caldeiraria & Solda",
        requesterName: "Marcos Vinicius",
        priority: "ALTA",
        status: "EM_COTACAO",
        requiredDate: "2026-10-10",
        justification: "Reposi\xE7\xE3o de consum\xEDvel do posto robotizado.",
        createdAt: "2026-10-01 14:15"
      },
      {
        id: "req-003",
        code: "REQ-2026-0043",
        itemCode: "FER-INS-CNMG",
        itemName: "Pastilha de Metal Duro CNMG 120408 para Torneamento",
        quantity: 50,
        unit: "UN",
        department: "Usinagem CNC",
        requesterName: "Carlos Mendes",
        priority: "NORMAL",
        status: "APROVADA",
        requiredDate: "2026-10-15",
        justification: "Ferramental para novo lote de engrenagens cil\xEDndricas.",
        createdAt: "2026-09-30 11:00"
      },
      {
        id: "req-004",
        code: "REQ-2026-0044",
        itemCode: "CMP-ROL-6205",
        itemName: "Rolamento R\xEDgido de Esferas 6205-2RS C3",
        quantity: 200,
        unit: "UN",
        department: "Montagem Final",
        requesterName: "Eduardo Silveira",
        priority: "NORMAL",
        status: "ATENDIDA",
        requiredDate: "2026-10-05",
        justification: "Montagem de redutores modelo RX-200.",
        createdAt: "2026-09-28 09:20"
      }
    ], []);
    const [requisitions, setRequisitions] = (0, import_react.useState)(() => db?.purchaseRequisitions?.length > 0 ? db.purchaseRequisitions : initialRequisitions);
    const filtered = (0, import_react.useMemo)(() => {
      return requisitions.filter((r) => {
        const matchSearch = (r.itemName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (r.code || "").toLowerCase().includes(searchTerm.toLowerCase()) || (r.itemCode || "").toLowerCase().includes(searchTerm.toLowerCase()) || (r.department || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
        const matchPriority = priorityFilter === "ALL" || r.priority === priorityFilter;
        return matchSearch && matchStatus && matchPriority;
      });
    }, [requisitions, searchTerm, statusFilter, priorityFilter]);
    const handleCreateRequisition = (e) => {
      e.preventDefault();
      if (!itemName || !quantity) return;
      const newReq = {
        id: `req-${Date.now()}`,
        code: `REQ-2026-${Math.floor(1e3 + Math.random() * 9e3)}`,
        itemCode: itemCode || `SKU-${Math.floor(100 + Math.random() * 900)}`,
        itemName,
        quantity: Number(quantity),
        unit,
        department,
        requesterName: currentUser?.name || "Operador Industrial",
        priority,
        status: "PENDENTE",
        requiredDate,
        justification: justification || "Requisi\xE7\xE3o fabril de rotina.",
        createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16)
      };
      const updated = [newReq, ...requisitions];
      setRequisitions(updated);
      if (onUpdateDb) onUpdateDb({ ...db, purchaseRequisitions: updated });
      if (onAddHistoryLog) onAddHistoryLog("PCP", "Nova Solicita\xE7\xE3o de Compra", `Solicita\xE7\xE3o ${newReq.code} para ${newReq.itemName} cadastrada.`);
      setIsModalOpen(false);
      setItemName("");
      setItemCode("");
      setJustification("");
    };
    const handleUpdateStatus = (id, newStatus) => {
      const updated = requisitions.map((r) => r.id === id ? { ...r, status: newStatus } : r);
      setRequisitions(updated);
      if (onUpdateDb) onUpdateDb({ ...db, purchaseRequisitions: updated });
      if (onAddHistoryLog) onAddHistoryLog("PCP", "Status da Solicita\xE7\xE3o Alterado", `Solicita\xE7\xE3o ID ${id} atualizada para ${newStatus}.`);
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "PCP & Suprimentos Industriais" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 3 \u2022 Fluxo de Requisi\xE7\xF5es" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4DD}" }),
            " Solicita\xE7\xF5es de Compra Fabris (Requisi\xE7\xF5es Internas)"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Controle de requisi\xE7\xF5es de mat\xE9rias-primas e consum\xEDveis abertas pelos postos de usinagem, estamparia, solda e montagem antes de gerar cota\xE7\xE3o com distribuidores." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => onNavigateTab && onNavigateTab("purchasing_suggestions"),
              className: "px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer",
              children: "\u{1F522} Ver C\xE1lculo MRP"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              onClick: () => setIsModalOpen(true),
              className: "px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u2795" }),
                " Nova Solicita\xE7\xE3o"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Total de Requisi\xE7\xF5es" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-slate-900 font-mono mt-1", children: requisitions.length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: "Demandas internas" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-amber-700 uppercase tracking-wide", children: "Pendentes" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-amber-600 font-mono mt-1", children: requisitions.filter((r) => r.status === "PENDENTE").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-amber-600 font-medium", children: "Aguardando cota\xE7\xE3o" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-rose-700 uppercase tracking-wide", children: "Urgentes / Cr\xEDticas" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-rose-600 font-mono mt-1", children: requisitions.filter((r) => r.priority === "URGENTE").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-rose-600 font-medium", children: "Parada potencial de OP" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-emerald-700 uppercase tracking-wide", children: "Atendidas / Aprovadas" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-emerald-600 font-mono mt-1", children: requisitions.filter((r) => r.status === "ATENDIDA" || r.status === "APROVADA").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-emerald-600 font-medium", children: "Convertidas em compra" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative flex-1 min-w-[240px] max-w-md", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm", children: "\u{1F50D}" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "text",
              value: searchTerm,
              onChange: (e) => setSearchTerm(e.target.value),
              placeholder: "Buscar por c\xF3digo, material, setor ou solicitante...",
              className: "w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "select",
            {
              value: statusFilter,
              onChange: (e) => setStatusFilter(e.target.value),
              className: "px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-700",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ALL", children: "Todos os Status" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "PENDENTE", children: "Pendentes" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "EM_COTACAO", children: "Em Cota\xE7\xE3o" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "APROVADA", children: "Aprovadas" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ATENDIDA", children: "Atendidas" })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "select",
            {
              value: priorityFilter,
              onChange: (e) => setPriorityFilter(e.target.value),
              className: "px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-700",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ALL", children: "Todas as Prioridades" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "NORMAL", children: "Normal" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ALTA", children: "Alta" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "URGENTE", children: "Urgente" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "C\xF3digo / Data" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Insumo Requisitado" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Quantidade" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Setor Solicitante" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Prioridade" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Status" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5 text-right", children: "A\xE7\xF5es" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { className: "divide-y divide-slate-100", children: [
          filtered.map((req) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50/80 transition", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-mono font-bold text-indigo-700 block", children: req.code }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: req.createdAt })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-bold text-slate-900", children: req.itemName }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-[10px] font-mono text-slate-500", children: [
                "C\xF3d: ",
                req.itemCode
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate", children: req.justification })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono font-black text-slate-800", children: [
              req.quantity,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-500 text-[10px] font-normal", children: req.unit })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px] block w-fit", children: req.department }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400 block mt-0.5", children: req.requesterName })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${req.priority === "URGENTE" ? "bg-rose-100 text-rose-800 border border-rose-300" : req.priority === "ALTA" ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-700"}`, children: req.priority }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `px-2 py-0.5 rounded text-[10px] font-bold ${req.status === "ATENDIDA" ? "bg-emerald-100 text-emerald-800" : req.status === "APROVADA" ? "bg-blue-100 text-blue-800" : req.status === "EM_COTACAO" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"}`, children: [
              "\u25CF ",
              req.status
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 text-right space-x-1.5 whitespace-nowrap", children: [
              req.status === "PENDENTE" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  onClick: () => handleUpdateStatus(req.id, "EM_COTACAO"),
                  className: "px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition cursor-pointer",
                  title: "Enviar para tomada de pre\xE7os",
                  children: "Cotar"
                }
              ),
              req.status !== "ATENDIDA" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  onClick: () => handleUpdateStatus(req.id, "ATENDIDA"),
                  className: "px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer",
                  title: "Marcar como atendida / comprada",
                  children: "\u2713 Atender"
                }
              )
            ] })
          ] }, req.id)),
          filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { colSpan: 7, className: "p-8 text-center text-slate-400", children: "Nenhuma solicita\xE7\xE3o de compra encontrada com os filtros selecionados." }) })
        ] })
      ] }) }) }),
      isModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-base font-bold text-slate-900 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4DD}" }),
            " Nova Solicita\xE7\xE3o de Compra Fabril"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setIsModalOpen(false),
              className: "text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer",
              children: "\u2715"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleCreateRequisition, className: "space-y-3.5 text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-3 gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "col-span-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "C\xF3d. Insumo" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "text",
                  value: itemCode,
                  onChange: (e) => setItemCode(e.target.value),
                  placeholder: "Ex: MP-ACO-01",
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "col-span-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Descri\xE7\xE3o do Material *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "text",
                  required: true,
                  value: itemName,
                  onChange: (e) => setItemName(e.target.value),
                  placeholder: "Ex: Chapa de A\xE7o Inox 304 3mm",
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Quantidade *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "number",
                  required: true,
                  min: "1",
                  value: quantity,
                  onChange: (e) => setQuantity(Number(e.target.value)),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Unidade" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  value: unit,
                  onChange: (e) => setUnit(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "UN", children: "UN (Unidade)" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "KG", children: "KG (Quilo)" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "M", children: "M (Metro)" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "M2", children: "M\xB2 (Metro Quadrado)" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "CX", children: "CX (Caixa)" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "L", children: "L (Litro)" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Prioridade" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  value: priority,
                  onChange: (e) => setPriority(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "NORMAL", children: "Normal" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ALTA", children: "Alta" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "URGENTE", children: "Urgente" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Setor Requisitante" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  value: department,
                  onChange: (e) => setDepartment(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Usinagem CNC", children: "Usinagem CNC" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Caldeiraria & Solda", children: "Caldeiraria & Solda" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Corte a Laser", children: "Corte a Laser" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Montagem Final", children: "Montagem Final" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Manuten\xE7\xE3o Fabril", children: "Manuten\xE7\xE3o Fabril" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Data Necess\xE1ria" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "date",
                  value: requiredDate,
                  onChange: (e) => setRequiredDate(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Justificativa da Compra" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "textarea",
              {
                rows: 2,
                value: justification,
                onChange: (e) => setJustification(e.target.value),
                placeholder: "Informe a OP vinculada, motivo de urg\xEAncia ou substitui\xE7\xE3o...",
                className: "w-full px-3 py-2 rounded-lg border border-slate-300"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-end gap-2 pt-3 border-t border-slate-200", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => setIsModalOpen(false),
                className: "px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer",
                children: "Cancelar"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "submit",
                className: "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition cursor-pointer",
                children: "Salvar Solicita\xE7\xE3o"
              }
            )
          ] })
        ] })
      ] }) })
    ] });
  }
  function PurchaseOrdersView({ db, currentUser, currentCompany, onUpdateDb, onAddHistoryLog, onNavigateTab }) {
    const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
    const [statusFilter, setStatusFilter] = (0, import_react.useState)("ALL");
    const [selectedOrder, setSelectedOrder] = (0, import_react.useState)(null);
    const initialOrders = (0, import_react.useMemo)(() => [
      {
        id: "po-101",
        code: "PO-2026-0812",
        supplierName: "Gerdau A\xE7os Especiais S/A",
        supplierCnpj: "33.611.500/0001-19",
        issueDate: "2026-10-01",
        deliveryForecast: "2026-10-08",
        paymentTerms: "28 / 56 ddl (Boleto)",
        status: "EM_TRANSITO",
        totalValue: 24850,
        carrier: "Braspress Transportes R\xE1pidos",
        itemsCount: 4,
        items: [
          { code: "MP-ACO-1045", name: 'Barra Redonda 1045 \xD8 3"', qty: 800, unit: "KG", unitPrice: 14.5, total: 11600 },
          { code: "MP-ACO-4140", name: 'Barra 4140 Beneficiada \xD8 2"', qty: 500, unit: "KG", unitPrice: 26.5, total: 13250 }
        ]
      },
      {
        id: "po-102",
        code: "PO-2026-0813",
        supplierName: "Sandvik Coromant Ferramentas do Brasil",
        supplierCnpj: "60.874.192/0001-44",
        issueDate: "2026-10-02",
        deliveryForecast: "2026-10-06",
        paymentTerms: "30 ddl (Boleto)",
        status: "CONFIRMADO",
        totalValue: 8420,
        carrier: "Direct Express Sedex",
        itemsCount: 6,
        items: [
          { code: "FER-BROC-D12", name: "Broca Metal Duro CoroDrill 12mm", qty: 10, unit: "UN", unitPrice: 420, total: 4200 },
          { code: "FER-FRES-R5", name: "Fresa Toroidal Raio 5mm 4 Cortes", qty: 8, unit: "UN", unitPrice: 527.5, total: 4220 }
        ]
      },
      {
        id: "po-103",
        code: "PO-2026-0814",
        supplierName: "SKF do Brasil Rolamentos",
        supplierCnpj: "59.105.748/0001-20",
        issueDate: "2026-09-29",
        deliveryForecast: "2026-10-03",
        paymentTerms: "\xC0 Vista com 5% de Desconto",
        status: "ENTREGUE",
        totalValue: 15300,
        carrier: "Jamef Encomendas Urgentes",
        itemsCount: 3,
        items: [
          { code: "CMP-ROL-22218", name: "Rolamento Autocompensador 22218 EK", qty: 15, unit: "UN", unitPrice: 1020, total: 15300 }
        ]
      }
    ], []);
    const [orders, setOrders] = (0, import_react.useState)(() => db?.purchaseOrders?.length > 0 ? db.purchaseOrders : initialOrders);
    const filtered = (0, import_react.useMemo)(() => {
      return orders.filter((o) => {
        const matchSearch = (o.code || "").toLowerCase().includes(searchTerm.toLowerCase()) || (o.supplierName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (o.supplierCnpj || "").includes(searchTerm);
        const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
        return matchSearch && matchStatus;
      });
    }, [orders, searchTerm, statusFilter]);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "Compras & Ordens Formais" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 3 \u2022 Purchase Orders (PO)" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4E6}" }),
            " Pedidos de Compra Fabris (Purchase Orders)"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Gest\xE3o de pedidos de compra emitidos para sider\xFArgicas, fabricantes de ferramentas e distribuidores com rastreamento de transporte e confer\xEAncia de entrega." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => onNavigateTab && onNavigateTab("quotations"),
            className: "px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer",
            children: "\u{1F3F7}\uFE0F Ver Cota\xE7\xF5es"
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Total de Pedidos" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-slate-900 font-mono mt-1", children: orders.length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: "Ordens formais" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-blue-700 uppercase tracking-wide", children: "Em Transporte / Tr\xE2nsito" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-blue-600 font-mono mt-1", children: orders.filter((o) => o.status === "EM_TRANSITO" || o.status === "CONFIRMADO").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-blue-600 font-medium", children: "A caminho da f\xE1brica" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-emerald-700 uppercase tracking-wide", children: "Valor em Aberto" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-emerald-700 font-mono mt-1", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            orders.reduce((acc, curr) => acc + (curr.totalValue || 0), 0)
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-emerald-600 font-medium", children: "Comprometimento de caixa" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-purple-700 uppercase tracking-wide", children: "Entregues no M\xEAs" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-purple-600 font-mono mt-1", children: orders.filter((o) => o.status === "ENTREGUE").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-purple-600 font-medium", children: "Estoque integrado" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative flex-1 max-w-md", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm", children: "\u{1F50D}" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "text",
              value: searchTerm,
              onChange: (e) => setSearchTerm(e.target.value),
              placeholder: "Buscar por n\xFAmero do pedido, fornecedor ou CNPJ...",
              className: "w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "select",
          {
            value: statusFilter,
            onChange: (e) => setStatusFilter(e.target.value),
            className: "px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-700",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ALL", children: "Todos os Status" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "CONFIRMADO", children: "Confirmado" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "EM_TRANSITO", children: "Em Transporte" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ENTREGUE", children: "Entregue" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Pedido / Emiss\xE3o" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Fornecedor Homologado" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Previs\xE3o Entrega" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Condi\xE7\xE3o Pagto" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Valor Total" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Status" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5 text-right", children: "A\xE7\xE3o" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: filtered.map((order) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50/80 transition", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-indigo-700 block", children: order.code }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[10px] text-slate-400", children: [
              "Emiss\xE3o: ",
              order.issueDate
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-bold text-slate-900", children: order.supplierName }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-[10px] font-mono text-slate-400", children: [
              "CNPJ: ",
              order.supplierCnpj
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-slate-800", children: order.deliveryForecast }),
            order.carrier && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400 block", children: order.carrier })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5 text-slate-600 font-medium", children: order.paymentTerms }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5 font-mono font-black text-slate-900", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.totalValue) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `px-2 py-0.5 rounded text-[10px] font-bold ${order.status === "ENTREGUE" ? "bg-emerald-100 text-emerald-800" : order.status === "EM_TRANSITO" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`, children: [
            "\u25CF ",
            order.status
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5 text-right", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setSelectedOrder(order),
              className: "px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition cursor-pointer",
              children: "\u{1F441}\uFE0F Detalhes"
            }
          ) })
        ] }, order.id)) })
      ] }) }) }),
      selectedOrder && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-150", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-base font-bold text-slate-900 flex items-center gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4E6}" }),
              " Espelho do Pedido de Compra: ",
              selectedOrder.code
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-xs text-slate-500", children: [
              "Fornecedor: ",
              selectedOrder.supplierName
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setSelectedOrder(null),
              className: "text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer",
              children: "\u2715"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-slate-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 text-[10px] block", children: "Condi\xE7\xE3o de Pagamento" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-slate-800", children: selectedOrder.paymentTerms })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 text-[10px] block", children: "Previs\xE3o de Entrega" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-slate-800", children: selectedOrder.deliveryForecast })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 text-[10px] block", children: "Transportadora" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-slate-800", children: selectedOrder.carrier || "FOB Fornecedor" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 text-[10px] block", children: "Valor Total" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-mono font-black text-emerald-700", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedOrder.totalValue) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-bold text-slate-700 uppercase tracking-wide", children: "Itens do Pedido Fabril" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "border border-slate-200 rounded-lg overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold text-[10px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-2.5", children: "C\xF3digo / Descri\xE7\xE3o" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-2.5", children: "Qtd" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-2.5", children: "Unit\xE1rio" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-2.5 text-right", children: "Total" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: (selectedOrder.items || []).map((it, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-2.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-slate-800 block", children: it.name }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[10px] font-mono text-slate-400", children: [
                  "SKU: ",
                  it.code
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-2.5 font-mono font-bold", children: [
                it.qty,
                " ",
                it.unit
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-2.5 font-mono", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.unitPrice) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-2.5 font-mono font-bold text-right", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.total) })
            ] }, idx)) })
          ] }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-end gap-2 pt-3 border-t border-slate-200", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setSelectedOrder(null),
              className: "px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer",
              children: "Fechar"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              onClick: () => {
                alert(`Espelho do Pedido ${selectedOrder.code} enviado para o WhatsApp do Fornecedor com sucesso!`);
                setSelectedOrder(null);
              },
              className: "px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4AC}" }),
                " Enviar p/ Fornecedor"
              ]
            }
          )
        ] })
      ] }) })
    ] });
  }
  function MaterialReceivingView({ db, currentUser, currentCompany, parts, onUpdateDb, onAddHistoryLog, onNavigateTab }) {
    const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
    const [isConferenceModalOpen, setIsConferenceModalOpen] = (0, import_react.useState)(false);
    const initialReceipts = (0, import_react.useMemo)(() => [
      {
        id: "rec-01",
        code: "REC-2026-0501",
        nfeNumber: "NF-e 004812",
        nfeKey: "35261033611500000119550010000048121892837461",
        supplierName: "Gerdau A\xE7os Especiais S/A",
        receivedAt: "2026-10-02 10:15",
        carrier: "Braspress Transportes R\xE1pidos",
        status: "APROVADO_ESTOQUE",
        totalWeightKg: 1300,
        inspector: "Ant\xF4nio Prado (Conferente WMS)",
        items: [
          { code: "MP-ACO-1045", name: 'Barra Redonda 1045 \xD8 3"', qtyReceived: 800, unit: "KG", lotNumber: "LT-GER-8812", condition: "CONFORME" },
          { code: "MP-ACO-4140", name: 'Barra 4140 Beneficiada \xD8 2"', qtyReceived: 500, unit: "KG", lotNumber: "LT-GER-8813", condition: "CONFORME" }
        ]
      },
      {
        id: "rec-02",
        code: "REC-2026-0502",
        nfeNumber: "NF-e 019283",
        nfeKey: "35261059105748000120550010000192831092837412",
        supplierName: "SKF do Brasil Rolamentos",
        receivedAt: "2026-10-01 16:40",
        carrier: "Jamef Encomendas",
        status: "EM_CONFERENCIA",
        totalWeightKg: 45,
        inspector: "Ant\xF4nio Prado",
        items: [
          { code: "CMP-ROL-22218", name: "Rolamento Autocompensador 22218 EK", qtyReceived: 15, unit: "UN", lotNumber: "LT-SKF-9921", condition: "CONFORME" }
        ]
      }
    ], []);
    const [receipts, setReceipts] = (0, import_react.useState)(() => db?.materialReceipts?.length > 0 ? db.materialReceipts : initialReceipts);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "Portaria & Almoxarifado" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 3 / 9 \u2022 Entrada de Insumos" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F69A}" }),
            " Recebimento & Confer\xEAncia de Materiais (NF-e)"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Confer\xEAncia cega de notas fiscais de fornecedores, inspe\xE7\xE3o de integridade f\xEDsica, laudo de entrada e aloca\xE7\xE3o autom\xE1tica de lote no estoque WMS." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => onNavigateTab && onNavigateTab("stock_traffic"),
              className: "px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer",
              children: "\u{1F6A6} Ver Sem\xE1foro"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              onClick: () => setIsConferenceModalOpen(true),
              className: "px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4E5}" }),
                " Nova Entrada de NF-e"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Recebimentos Realizados" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-slate-900 font-mono mt-1", children: receipts.length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: "Total de cargas" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-amber-700 uppercase tracking-wide", children: "Em Confer\xEAncia" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-amber-600 font-mono mt-1", children: receipts.filter((r) => r.status === "EM_CONFERENCIA").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-amber-600 font-medium", children: "Na doca de descarga" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-emerald-700 uppercase tracking-wide", children: "Aprovados no Estoque" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-emerald-600 font-mono mt-1", children: receipts.filter((r) => r.status === "APROVADO_ESTOQUE").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-emerald-600 font-medium", children: "Lotes integrados ao WMS" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-blue-700 uppercase tracking-wide", children: "Peso Total Recebido" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-2xl font-black text-blue-600 font-mono mt-1", children: [
            receipts.reduce((acc, curr) => acc + (curr.totalWeightKg || 0), 0),
            " kg"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-blue-600 font-medium", children: "Volume f\xEDsico conferido" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "C\xF3d. Entrada / Data" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Nota Fiscal / Chave" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Fornecedor" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Itens & Lotes" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Conferente" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Status" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: receipts.map((rec) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50/80 transition", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-indigo-700 block", children: rec.code }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: rec.receivedAt })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-bold text-slate-900", children: rec.nfeNumber }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[9px] font-mono text-slate-400 truncate max-w-xs", children: rec.nfeKey })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-bold text-slate-800", children: rec.supplierName }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[10px] text-slate-400", children: rec.carrier })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "font-bold text-slate-800 block", children: [
              (rec.items || []).length,
              " itens conferidos"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[10px] font-mono text-emerald-600", children: [
              "Peso: ",
              rec.totalWeightKg,
              " kg"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5 text-slate-600 font-medium", children: rec.inspector }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `px-2 py-0.5 rounded text-[10px] font-bold ${rec.status === "APROVADO_ESTOQUE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`, children: [
            "\u25CF ",
            rec.status
          ] }) })
        ] }, rec.id)) })
      ] }) }) }),
      isConferenceModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-base font-bold text-slate-900 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4E5}" }),
            " Entrada de Materiais e XML NF-e"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setIsConferenceModalOpen(false),
              className: "text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer",
              children: "\u2715"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-900", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "font-bold flex items-center gap-1.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4D1}" }),
            " Importa\xE7\xE3o Autom\xE1tica de XML"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-[11px] text-indigo-700", children: "Arraste o arquivo XML da NF-e emitida pelo fornecedor para carregar os itens, NCM, lote e dados fiscais com 1 clique." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "file",
              accept: ".xml",
              onChange: (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  alert("Arquivo XML carregado! Dados do fornecedor e itens da nota importados com sucesso para confer\xEAncia f\xEDsica.");
                  setIsConferenceModalOpen(false);
                }
              },
              className: "w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex justify-end gap-2 pt-2 border-t border-slate-200", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => setIsConferenceModalOpen(false),
            className: "px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer",
            children: "Fechar"
          }
        ) })
      ] }) })
    ] });
  }
  function IndustrialSuppliersView({ db, currentUser, currentCompany, suppliers, onUpdateDb, onAddHistoryLog, onNavigateTab }) {
    const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
    const [categoryFilter, setCategoryFilter] = (0, import_react.useState)("ALL");
    const initialSuppliers = (0, import_react.useMemo)(() => [
      {
        id: "sup-01",
        name: "Gerdau A\xE7os Especiais S/A",
        tradeName: "Gerdau Usinagem & A\xE7os",
        cnpj: "33.611.500/0001-19",
        city: "S\xE3o Paulo",
        state: "SP",
        category: "A\xE7os & Metais Brutos",
        leadTimeDays: 7,
        rating: "A (ISO 9001 / IATF)",
        status: "HOMOLOGADO",
        phone: "(11) 3094-6600",
        whatsapp: "(11) 98122-3344",
        email: "comercial.acos@gerdau.com"
      },
      {
        id: "sup-02",
        name: "Sandvik Coromant Ferramentas do Brasil",
        tradeName: "Sandvik Ferramental",
        cnpj: "60.874.192/0001-44",
        city: "Jundia\xED",
        state: "SP",
        category: "Ferramental & Pastilhas",
        leadTimeDays: 4,
        rating: "A (Certificado Global)",
        status: "HOMOLOGADO",
        phone: "(11) 4589-7000",
        whatsapp: "(11) 99233-4455",
        email: "atendimento@sandvik.com"
      },
      {
        id: "sup-03",
        name: "SKF do Brasil Rolamentos Ltda",
        tradeName: "SKF Rolamentos",
        cnpj: "59.105.748/0001-20",
        city: "Rodovia Anhanguera",
        state: "SP",
        category: "Rolamentos & Componentes",
        leadTimeDays: 5,
        rating: "A (Original OEM)",
        status: "HOMOLOGADO",
        phone: "(11) 4617-8000",
        whatsapp: "(11) 97344-5566",
        email: "vendas.ind@skf.com"
      },
      {
        id: "sup-04",
        name: "White Martins Gases Industriais",
        tradeName: "White Martins Gases & Solda",
        cnpj: "35.820.448/0001-30",
        city: "Osasco",
        state: "SP",
        category: "Gases Industriais & Consum\xEDveis",
        leadTimeDays: 2,
        rating: "A (Gases Medicinais e Fabris)",
        status: "HOMOLOGADO",
        phone: "(11) 3681-9000",
        whatsapp: "(11) 98455-6677",
        email: "pedidos@whitemartins.com"
      }
    ], []);
    const [supplierList, setSupplierList] = (0, import_react.useState)(() => suppliers?.length > 0 ? suppliers : initialSuppliers);
    const filtered = (0, import_react.useMemo)(() => {
      return supplierList.filter((s) => {
        const matchSearch = (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (s.tradeName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (s.cnpj || "").includes(searchTerm) || (s.category || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;
        return matchSearch && matchCat;
      });
    }, [supplierList, searchTerm, categoryFilter]);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "Homologa\xE7\xE3o T\xE9cnica Fabril" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 5 \u2022 Qualifica\xE7\xE3o de Cadeia" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F3ED}" }),
          " Fornecedores Homologados da Ind\xFAstria"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Cadastro estrat\xE9gico de fornecedores qualificados por auditoria t\xE9cnica, certifica\xE7\xE3o ISO, prazos de entrega (lead time) e \xEDndice de conformidade CQ." })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Fornecedores Ativos" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-slate-900 font-mono mt-1", children: supplierList.length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: "Cadastrados na base" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-emerald-700 uppercase tracking-wide", children: "Homologados ISO" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-emerald-600 font-mono mt-1", children: supplierList.filter((s) => s.status === "HOMOLOGADO").length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-emerald-600 font-medium", children: "Auditoria em dia" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-blue-700 uppercase tracking-wide", children: "Lead Time M\xE9dio" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-blue-600 font-mono mt-1", children: "4.5 dias" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-blue-600 font-medium", children: "Tempo de atendimento" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-indigo-700 uppercase tracking-wide", children: "\xCDndice OTIF" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-indigo-600 font-mono mt-1", children: "98.2%" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-indigo-600 font-medium", children: "No prazo e quantidade" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative flex-1 max-w-md", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm", children: "\u{1F50D}" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "text",
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            placeholder: "Buscar por nome, raz\xE3o social, CNPJ ou categoria de insumo...",
            className: "w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          }
        )
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Fornecedor / Raz\xE3o Social" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Categoria de Insumo" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Cidade / UF" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Lead Time" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Avalia\xE7\xE3o CQ" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Status" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5 text-right", children: "Contato" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: filtered.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50/80 transition", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-bold text-slate-900", children: s.tradeName || s.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-[10px] font-mono text-slate-400", children: [
              "CNPJ: ",
              s.cnpj
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]", children: s.category || "Insumos Fabris" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 text-slate-600", children: [
            s.city,
            "/",
            s.state
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono font-bold text-slate-800", children: [
            s.leadTimeDays,
            " dias"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-emerald-700 font-bold text-[11px] block", children: s.rating }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800", children: [
            "\u25CF ",
            s.status
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 text-right font-mono text-[11px] text-slate-600", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: s.phone }),
            s.whatsapp && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-emerald-600 font-bold", children: [
              "WhatsApp: ",
              s.whatsapp
            ] })
          ] })
        ] }, s.id)) })
      ] }) }) })
    ] });
  }
  function MaterialFamiliesView({ db, currentUser, currentCompany, parts = [], onUpdateDb, onAddHistoryLog, onNavigateTab }) {
    const [selectedFamily, setSelectedFamily] = (0, import_react.useState)("ALL");
    const families = (0, import_react.useMemo)(() => [
      {
        id: "MP",
        name: "Mat\xE9rias-Primas Met\xE1licas",
        code: "FAM-MP",
        desc: "Chapas laminadas, tubos industriais, vigas W, perfis estruturais e barras redondas 1020/1045/4140.",
        icon: "\u{1F529}",
        color: "border-blue-300 bg-blue-50/20 text-blue-900",
        badgeColor: "bg-blue-600 text-white",
        itemType: "materia_prima",
        unitGroup: "KG, M, M\xB2"
      },
      {
        id: "CMP",
        name: "Componentes Comprados",
        code: "FAM-CMP",
        desc: "Rolamentos r\xEDgidos e autocompensadores, retentores, veda\xE7\xF5es hidr\xE1ulicas, parafusos classe 8.8 e motores el\xE9tricos.",
        icon: "\u2699\uFE0F",
        color: "border-amber-300 bg-amber-50/20 text-amber-900",
        badgeColor: "bg-amber-600 text-white",
        itemType: "componente",
        unitGroup: "UN, CX, JG"
      },
      {
        id: "SUB",
        name: "Subconjuntos Fabricados",
        code: "FAM-SUB",
        desc: "Conjuntos soldados intermedi\xE1rios, caixas redutoras pr\xE9-montadas e blocos usinados que comp\xF5em o BOM.",
        icon: "\u{1F9E9}",
        color: "border-purple-300 bg-purple-50/20 text-purple-900",
        badgeColor: "bg-purple-600 text-white",
        itemType: "subconjunto",
        unitGroup: "UN, PC"
      },
      {
        id: "PRD",
        name: "Produtos Acabados",
        code: "FAM-PRD",
        desc: "M\xE1quinas montadas, implementos fabris conclu\xEDdos, prontos para expedi\xE7\xE3o e faturamento ao cliente.",
        icon: "\u{1F3ED}",
        color: "border-emerald-300 bg-emerald-50/20 text-emerald-900",
        badgeColor: "bg-emerald-600 text-white",
        itemType: "produto_acabado",
        unitGroup: "UN"
      },
      {
        id: "INS",
        name: "Insumos & Consum\xEDveis",
        code: "FAM-INS",
        desc: "Arames de solda, gases industriais, \xF3leos sol\xFAveis de corte CNC, graxas sint\xE9ticas, lixas e EPIs.",
        icon: "\u{1F9EA}",
        color: "border-rose-300 bg-rose-50/20 text-rose-900",
        badgeColor: "bg-rose-600 text-white",
        itemType: "insumo",
        unitGroup: "L, KG, ROLO"
      }
    ], []);
    const itemsList = (0, import_react.useMemo)(() => {
      if (!parts || parts.length === 0) return [];
      if (selectedFamily === "ALL") return parts;
      return parts.filter((p) => p.itemType === selectedFamily || p.category === selectedFamily);
    }, [parts, selectedFamily]);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "Classifica\xE7\xE3o & Taxonomia" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 5 \u2022 Fam\xEDlias de Materiais" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F5C2}\uFE0F" }),
            " Fam\xEDlias de Materiais Industriais"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Segmenta\xE7\xE3o estrat\xE9gica do almoxarifado em mat\xE9rias-primas brutas, componentes comprados, subconjuntos em processo, produtos acabados e insumos fabris." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => onNavigateTab && onNavigateTab("item_master"),
            className: "px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer",
            children: "\u{1F4E6} Ver Cat\xE1logo Mestre Completo"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4", children: families.map((f) => {
        const count = parts.filter((p) => p.itemType === f.itemType || p.category && p.category.includes(f.name)).length;
        const isSelected = selectedFamily === f.itemType;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            onClick: () => setSelectedFamily(isSelected ? "ALL" : f.itemType),
            className: `p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${isSelected ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-400" : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-2xl", children: f.icon }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded-full ${f.badgeColor}`, children: f.code })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "font-bold text-sm text-slate-900 leading-tight", children: f.name }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-[11px] text-slate-500 mt-1 line-clamp-2", children: f.desc })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "border-t border-slate-100 pt-2 flex items-center justify-between text-xs", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 font-medium", children: "Itens Ativos:" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "font-mono font-black text-slate-900", children: [
                  count || 12,
                  " SKUs"
                ] })
              ] })
            ]
          },
          f.id
        );
      }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-sm font-bold text-slate-800 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F4CB}" }),
            " Itens da Fam\xEDlia Selecionada: ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-indigo-600", children: selectedFamily === "ALL" ? "Todas as Fam\xEDlias" : selectedFamily })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-xs text-slate-400 font-mono", children: [
            itemsList.length,
            " itens encontrados"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[10px] uppercase", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "C\xF3digo SKU" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Descri\xE7\xE3o do Material" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Tipo / Categoria" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Unidade" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Saldo F\xEDsico" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Estoque M\xEDnimo" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Custo Unit\xE1rio" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: itemsList.slice(0, 15).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50/80 transition", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono font-bold text-indigo-700", children: p.code }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-bold text-slate-900", children: p.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]", children: p.itemType || p.category || "Geral" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono font-bold text-slate-600", children: p.unit || "UN" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono font-bold text-slate-900", children: p.stockQuantity ?? p.stock ?? 0 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono text-slate-500", children: p.minStock ?? 10 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono text-slate-700", children: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.costPrice || 0) })
          ] }, p.id)) })
        ] }) })
      ] })
    ] });
  }
  function WarehouseTransfersView({ db, currentUser, currentCompany, locations = [], parts = [], onSaveLocation, onTransferStock, onUpdateDb, onAddHistoryLog }) {
    const [fromLocId, setFromLocId] = (0, import_react.useState)("");
    const [toLocId, setToLocId] = (0, import_react.useState)("");
    const [partId, setPartId] = (0, import_react.useState)("");
    const [quantity, setQuantity] = (0, import_react.useState)(10);
    const [reason, setReason] = (0, import_react.useState)("REABASTECIMENTO_LINHA");
    const [successMsg, setSuccessMsg] = (0, import_react.useState)("");
    const [transferHistory, setTransferHistory] = (0, import_react.useState)([
      {
        id: "trf-01",
        date: "2026-10-02 11:20",
        itemCode: "MP-ACO-1020",
        itemName: 'Barra Redonda A\xE7o 1020 \xD8 2"',
        quantity: 50,
        unit: "KG",
        fromCode: "ALM-R01-E01",
        toCode: "FAB-POSTO-TORNO-01",
        operator: "Paulo Almeida",
        reason: "Reabastecimento de Posto"
      },
      {
        id: "trf-02",
        date: "2026-10-01 15:40",
        itemCode: "CMP-ROL-6205",
        itemName: "Rolamento 6205-2RS",
        quantity: 100,
        unit: "UN",
        fromCode: "DOCA-RECEBIMENTO",
        toCode: "ALM-R02-E03",
        operator: "Ant\xF4nio Prado",
        reason: "Guarda ap\xF3s Laudo CQ"
      }
    ]);
    const handleExecuteTransfer = (e) => {
      e.preventDefault();
      if (!fromLocId || !toLocId || !partId || !quantity) {
        alert("Selecione endere\xE7o de origem, destino, insumo e quantidade v\xE1lida.");
        return;
      }
      const fromLoc = locations.find((l) => l.id === fromLocId);
      const toLoc = locations.find((l) => l.id === toLocId);
      const part = parts.find((p) => p.id === partId);
      if (onTransferStock) {
        onTransferStock({
          fromLocationId: fromLocId,
          toLocationId: toLocId,
          partId,
          quantity: Number(quantity)
        });
      }
      const newEntry = {
        id: `trf-${Date.now()}`,
        date: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16),
        itemCode: part?.code || "SKU",
        itemName: part?.name || "Insumo",
        quantity: Number(quantity),
        unit: part?.unit || "UN",
        fromCode: fromLoc?.code || fromLocId,
        toCode: toLoc?.code || toLocId,
        operator: currentUser?.name || "Operador Almoxarifado",
        reason: reason === "REABASTECIMENTO_LINHA" ? "Reabastecimento de Posto" : "Remanejamento de Espa\xE7o"
      };
      setTransferHistory([newEntry, ...transferHistory]);
      setSuccessMsg("Transfer\xEAncia f\xEDsica WMS conclu\xEDda e registrada com sucesso!");
      setTimeout(() => setSuccessMsg(""), 4e3);
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "Movimenta\xE7\xE3o Interna WMS" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 9 \u2022 Transfer\xEAncia de Posi\xE7\xF5es" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F504}" }),
          " Transfer\xEAncia Entre Posi\xE7\xF5es WMS"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Movimenta\xE7\xE3o de mat\xE9rias-primas e componentes entre docas, ruas de estoque, prateleiras e bancadas do ch\xE3o de f\xE1brica com rastreabilidade de operador." })
      ] }) }),
      successMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u2713" }),
        " ",
        successMsg
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-sm font-bold text-slate-900 flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u26A1" }),
          " Executar Movimenta\xE7\xE3o Imediata"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleExecuteTransfer, className: "space-y-4 text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Localiza\xE7\xE3o de Origem *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  required: true,
                  value: fromLocId,
                  onChange: (e) => setFromLocId(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "Selecione Origem..." }),
                    locations.map((loc) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: loc.id, children: [
                      loc.code,
                      " - ",
                      loc.name || loc.warehouse
                    ] }, loc.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Localiza\xE7\xE3o de Destino *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  required: true,
                  value: toLocId,
                  onChange: (e) => setToLocId(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "Selecione Destino..." }),
                    locations.map((loc) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: loc.id, children: [
                      loc.code,
                      " - ",
                      loc.name || loc.warehouse
                    ] }, loc.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Material / Insumo *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  required: true,
                  value: partId,
                  onChange: (e) => setPartId(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "Selecione Item..." }),
                    parts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: p.id, children: [
                      p.code,
                      " - ",
                      p.name
                    ] }, p.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Quantidade a Mover *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "number",
                  required: true,
                  min: "1",
                  value: quantity,
                  onChange: (e) => setQuantity(Number(e.target.value)),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between pt-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-500 font-medium", children: "Motivo:" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  value: reason,
                  onChange: (e) => setReason(e.target.value),
                  className: "px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "REABASTECIMENTO_LINHA", children: "Reabastecimento de Posto Fabril" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "REMANEJAMENTO_ESPACO", children: "Remanejamento de Espa\xE7o / Otimiza\xE7\xE3o" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "QUARENTENA", children: "Envio para Quarentena CQ" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "SEPARACAO_OP", children: "Separa\xE7\xE3o de Kit de OP" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "submit",
                className: "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F504}" }),
                  " Confirmar Transfer\xEAncia WMS"
                ]
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 border-b border-slate-200 flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-bold text-slate-800 uppercase tracking-wide", children: "Hist\xF3rico Recente de Transfer\xEAncias" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-slate-400 text-xs font-mono", children: [
            transferHistory.length,
            " movimenta\xE7\xF5es registradas"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Data / Hora" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Insumo Movimentado" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Quantidade" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Origem" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Destino" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Operador" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Motivo" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: transferHistory.map((trf) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50 transition", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono text-slate-400", children: trf.date }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3 font-bold text-slate-900", children: [
              trf.itemName,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "font-mono text-slate-400 text-[10px]", children: [
                "(",
                trf.itemCode,
                ")"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3 font-mono font-bold text-indigo-700", children: [
              trf.quantity,
              " ",
              trf.unit
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono text-slate-600 font-bold", children: trf.fromCode }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-mono text-emerald-700 font-bold", children: trf.toCode }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 text-slate-600", children: trf.operator }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium", children: trf.reason }) })
          ] }, trf.id)) })
        ] })
      ] })
    ] });
  }
  function DowntimeRegistrationView({ db, currentUser, currentCompany, productionOrders = [], operators = [], onUpdateDb, onAddHistoryLog }) {
    const [machineName, setMachineName] = (0, import_react.useState)("Torno CNC Romi Centur 30D");
    const [reasonCategory, setReasonCategory] = (0, import_react.useState)("FALHA_MECANICA");
    const [operatorName, setOperatorName] = (0, import_react.useState)("Carlos Mendes");
    const [durationMinutes, setDurationMinutes] = (0, import_react.useState)(45);
    const [rootCause, setRootCause] = (0, import_react.useState)("");
    const [actionTaken, setActionTaken] = (0, import_react.useState)("");
    const [downtimeList, setDowntimeList] = (0, import_react.useState)([
      {
        id: "dt-01",
        code: "PAR-2026-081",
        date: "2026-10-02 09:15",
        machineName: "Torno CNC Romi Centur 30D",
        category: "FALHA_MECANICA",
        operator: "Carlos Mendes",
        durationMinutes: 45,
        rootCause: "Superaquecimento do rolamento da \xE1rvore principal.",
        actionTaken: "Lubrifica\xE7\xE3o for\xE7ada e troca de \xF3leo hidr\xE1ulico.",
        status: "RESOLVIDO"
      },
      {
        id: "dt-02",
        code: "PAR-2026-082",
        date: "2026-10-01 14:00",
        machineName: "Prensa Dobradeira CNC 150T",
        category: "SETUP_FERRAMENTAL",
        operator: "Marcos Vinicius",
        durationMinutes: 30,
        rootCause: "Troca de matriz para dobra de chapa 6mm.",
        actionTaken: "Ajuste de batentes e calibra\xE7\xE3o de \xE2ngulo a laser.",
        status: "RESOLVIDO"
      },
      {
        id: "dt-03",
        code: "PAR-2026-083",
        date: "2026-09-30 11:30",
        machineName: "Posto Soldagem Robotizada",
        category: "FALTA_MATERIAL",
        operator: "Roberto Antunes",
        durationMinutes: 60,
        rootCause: "Aguardando corte de suportes na guilhotina.",
        actionTaken: "Prioriza\xE7\xE3o de corte na programa\xE7\xE3o do PCP.",
        status: "RESOLVIDO"
      }
    ]);
    const handleRegisterDowntime = (e) => {
      e.preventDefault();
      const newEntry = {
        id: `dt-${Date.now()}`,
        code: `PAR-2026-${Math.floor(100 + Math.random() * 900)}`,
        date: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16),
        machineName,
        category: reasonCategory,
        operator: operatorName,
        durationMinutes: Number(durationMinutes),
        rootCause: rootCause || "Interven\xE7\xE3o operacional.",
        actionTaken: actionTaken || "Ajuste realizado.",
        status: "RESOLVIDO"
      };
      setDowntimeList([newEntry, ...downtimeList]);
      if (onAddHistoryLog) onAddHistoryLog("MANUFATURA", "Parada de Linha Registrada", `Parada de ${newEntry.durationMinutes}min na ${newEntry.machineName}.`);
      setRootCause("");
      setActionTaken("");
    };
    const totalMinutes = downtimeList.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "Efici\xEAncia & Disponibilidade" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 4 \u2022 Apontamento de Indisponibilidade" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u26A0\uFE0F" }),
          " Registro de Paradas de Linha de Produ\xE7\xE3o"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Mapeamento de quebras mec\xE2nicas, falhas el\xE9tricas, tempo de troca de ferramentas (setup), falta de mat\xE9ria-prima e gargalos operacionais da f\xE1brica." })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Total de Paradas" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-slate-900 font-mono mt-1", children: downtimeList.length }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: "Ocorr\xEAncias registradas" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-rose-700 uppercase tracking-wide", children: "Tempo Total Parado" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-2xl font-black text-rose-600 font-mono mt-1", children: [
            totalMinutes,
            " min"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-rose-600 font-medium", children: "Impacto na disponibilidade" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-amber-700 uppercase tracking-wide", children: "Maior Causa" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-lg font-black text-amber-700 mt-1 truncate", children: "Falha Mec\xE2nica" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-amber-600 font-medium", children: "45% do tempo parado" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-emerald-700 uppercase tracking-wide", children: "Disponibilidade Geral" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl font-black text-emerald-700 font-mono mt-1", children: "94.8%" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-emerald-600 font-medium", children: "Dentro da meta (> 90%)" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-sm font-bold text-slate-900 flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F6D1}" }),
          " Apontar Nova Parada de Linha"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleRegisterDowntime, className: "space-y-3.5 text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "M\xE1quina / Posto Fabril *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  value: machineName,
                  onChange: (e) => setMachineName(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Torno CNC Romi Centur 30D", children: "Torno CNC Romi Centur 30D" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Centro de Usinagem 4 Eixos", children: "Centro de Usinagem 4 Eixos" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Prensa Dobradeira CNC 150T", children: "Prensa Dobradeira CNC 150T" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Posto Soldagem Robotizada", children: "Posto Soldagem Robotizada" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "Corte a Laser Fibra 3kW", children: "Corte a Laser Fibra 3kW" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Categoria do Motivo *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  value: reasonCategory,
                  onChange: (e) => setReasonCategory(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-bold",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "FALHA_MECANICA", children: "Quebra / Falha Mec\xE2nica" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "FALHA_ELETRICA", children: "Falha El\xE9trica / Eletr\xF4nica" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "SETUP_FERRAMENTAL", children: "Setup / Troca de Ferramenta" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "FALTA_MATERIAL", children: "Falta de Mat\xE9ria-Prima" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ALMOCO_TROCA_TURNO", children: "Troca de Turno / Intervalo" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Operador Respons\xE1vel" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "text",
                  value: operatorName,
                  onChange: (e) => setOperatorName(e.target.value),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Tempo Parado (Minutos) *" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "number",
                  required: true,
                  min: "1",
                  value: durationMinutes,
                  onChange: (e) => setDurationMinutes(Number(e.target.value)),
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "Causa Raiz da Parada" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "text",
                  value: rootCause,
                  onChange: (e) => setRootCause(e.target.value),
                  placeholder: "Ex: Rompimento de correia, quebra de broca, etc.",
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block font-semibold text-slate-700 mb-1", children: "A\xE7\xE3o de Conten\xE7\xE3o Tomada" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "text",
                  value: actionTaken,
                  onChange: (e) => setActionTaken(e.target.value),
                  placeholder: "Ex: Substitui\xE7\xE3o por pe\xE7a sobressalente do almoxarifado.",
                  className: "w-full px-3 py-2 rounded-lg border border-slate-300"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex justify-end pt-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "submit",
              className: "px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u{1F6D1}" }),
                " Registrar Parada de M\xE1quina"
              ]
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-4 border-b border-slate-200 flex items-center justify-between", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-bold text-slate-800 uppercase tracking-wide", children: "Registro Cronol\xF3gico de Ocorr\xEAncias" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Data / C\xF3digo" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "M\xE1quina / Posto" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Motivo / Categoria" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Dura\xE7\xE3o" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Operador" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3", children: "Causa & A\xE7\xE3o" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: downtimeList.map((dt) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50 transition", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3 font-mono", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-bold text-rose-700 block", children: dt.code }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400", children: dt.date })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 font-bold text-slate-900", children: dt.machineName }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800", children: dt.category }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3 font-mono font-black text-rose-600", children: [
              dt.durationMinutes,
              " min"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3 text-slate-700", children: dt.operator }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-slate-800 font-medium", children: dt.rootCause }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[10px] text-slate-400", children: dt.actionTaken })
            ] })
          ] }, dt.id)) })
        ] })
      ] })
    ] });
  }
  function RHProductivityOEEView({ db, currentUser, currentCompany, operators = [], productionOrders = [], onUpdateDb, onAddHistoryLog }) {
    const opData = (0, import_react.useMemo)(() => [
      { id: "op-01", name: "Carlos Mendes", role: "Torneiro CNC S\xEAnior", shift: "1\xBA Turno (06:00 - 15:00)", hoursWorked: 176, overtimeHours: 12, goodsProduced: 1240, scrap: 14, efficiency: 97.4, status: "PRODUZINDO" },
      { id: "op-02", name: "Marcos Vinicius", role: "Operador de Dobradeira CNC", shift: "1\xBA Turno (06:00 - 15:00)", hoursWorked: 176, overtimeHours: 8, goodsProduced: 980, scrap: 18, efficiency: 95.8, status: "PRODUZINDO" },
      { id: "op-03", name: "Roberto Antunes", role: "Soldador TIG / MIG Robotizado", shift: "2\xBA Turno (15:00 - 23:45)", hoursWorked: 168, overtimeHours: 16, goodsProduced: 750, scrap: 6, efficiency: 98.2, status: "DISPON\xCDVEL" },
      { id: "op-04", name: "Eduardo Silveira", role: "Montador Mec\xE2nico Especialista", shift: "1\xBA Turno (06:00 - 15:00)", hoursWorked: 176, overtimeHours: 4, goodsProduced: 520, scrap: 2, efficiency: 99.1, status: "PRODUZINDO" },
      { id: "op-05", name: "Juliana Ferreira", role: "Inspetora de Qualidade CQ", shift: "Geral (07:30 - 17:18)", hoursWorked: 176, overtimeHours: 0, goodsProduced: 3200, scrap: 0, efficiency: 100, status: "EM_INSPE\xC7\xC3O" }
    ], []);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded text-[11px] font-bold tracking-wide uppercase", children: "Recursos Humanos & Performance" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-slate-300 font-mono", children: "M\xF3dulo 4 \u2022 Efici\xEAncia Global Fabril (OEE)" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-xl font-black font-display tracking-tight text-white mt-1 flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u26A1" }),
          " Produtividade de Operadores & Efici\xEAncia Global (OEE)"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 max-w-2xl mt-1", children: "Acompanhamento de horas normais e extras por turno, produtividade individual de operadores, \xEDndice de pe\xE7as boas vs scrap e OEE da planta industrial." })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Disponibilidade (D)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800", children: "Meta: >90%" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-3xl font-black text-slate-900 font-mono", children: "92.4%" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full bg-slate-100 rounded-full h-2 overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-emerald-500 h-2 rounded-full", style: { width: "92.4%" } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400 block", children: "Tempo em produ\xE7\xE3o vs planejado" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Performance (P)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800", children: "Meta: >85%" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-3xl font-black text-slate-900 font-mono", children: "88.1%" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full bg-slate-100 rounded-full h-2 overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-blue-500 h-2 rounded-full", style: { width: "88.1%" } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400 block", children: "Velocidade real vs nominal da m\xE1quina" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide", children: "Qualidade (Q)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800", children: "Meta: >95%" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-3xl font-black text-slate-900 font-mono", children: "96.8%" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full bg-slate-100 rounded-full h-2 overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-emerald-600 h-2 rounded-full", style: { width: "96.8%" } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-400 block", children: "Taxa de pe\xE7as boas aprovadas" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-md space-y-2 border border-indigo-700/50", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-indigo-300 uppercase tracking-wide", children: "OEE Consolidado" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-mono", children: "BOM" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-3xl font-black text-emerald-400 font-mono", children: "78.8%" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full bg-slate-800 rounded-full h-2 overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-emerald-400 h-2 rounded-full", style: { width: "78.8%" } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] text-slate-300 block", children: "D \xD7 P \xD7 Q = Efici\xEAncia Global" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 border-b border-slate-200 flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-bold text-slate-800 uppercase tracking-wide", children: "Desempenho Individual de Operadores Fabris" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-slate-400 text-xs font-mono", children: [
            opData.length,
            " colaboradores monitorados"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { className: "bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Colaborador / Fun\xE7\xE3o" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Turno" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Horas Normais" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Horas Extras" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Pe\xE7as Boas" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Refugo (Scrap)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Efici\xEAncia (%)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3.5", children: "Status" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { className: "divide-y divide-slate-100", children: opData.map((op) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "hover:bg-slate-50 transition", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-bold text-slate-900", children: op.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[10px] text-slate-400", children: op.role })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5 text-slate-600 font-medium", children: op.shift }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono font-bold text-slate-800", children: [
              op.hoursWorked,
              "h"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono font-bold text-amber-700", children: [
              "+",
              op.overtimeHours,
              "h"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono font-black text-emerald-700", children: [
              op.goodsProduced,
              " un"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "p-3.5 font-mono font-bold text-rose-600", children: [
              op.scrap,
              " un"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5 font-mono font-black text-slate-900", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `px-2 py-0.5 rounded ${op.efficiency >= 98 ? "bg-emerald-100 text-emerald-800" : op.efficiency >= 95 ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`, children: [
              op.efficiency,
              "%"
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "p-3.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700", children: [
              "\u25CF ",
              op.status
            ] }) })
          ] }, op.id)) })
        ] }) })
      ] })
    ] });
  }
  return __toCommonJS(IndustrialUniqueViews_exports);
})();
