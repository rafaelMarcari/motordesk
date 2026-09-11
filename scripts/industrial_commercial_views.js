// Modulo de Telas e Dashboards Comerciais Especializados para Industria B2B
module.exports = function(b, t) {
  // Helper de permissao
  function checkPerm(user, permKey) {
    if (!permKey) return true;
    if (user && (user.role === "admin" || user.role === "qa")) {
      if (user.permissions && user.permissions[permKey] === false) return false;
      return true;
    }
    if (user && user.permissions) {
      if (user.permissions[permKey] === false) return false;
      if (user.permissions[permKey] === true) return true;
    }
    return true; // default permissivo
  }

  // Componente de Acesso Negado
  function AccessDeniedNotice({ screenTitle, permKey }) {
    return t.jsxs("div", {
      className: "p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-center max-w-xl mx-auto my-12 space-y-3",
      children: [
        t.jsx("div", { className: "text-4xl", children: "🔒" }),
        t.jsx("h3", { className: "text-lg font-bold", children: `Acesso Restrito: ${screenTitle}` }),
        t.jsxs("p", {
          className: "text-xs text-slate-600 dark:text-slate-400",
          children: [
            "Seu grupo de acesso ou perfil não possui a permissão ",
            t.jsx("code", { className: "px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold text-[11px]", children: permKey }),
            ". Solicite a concessão desta tela ao Administrador do Sistema."
          ]
        })
      ]
    });
  }

  // Dados padrao industriais se nao existirem no banco
  const DEFAULT_PROSPECTS = [
    {
      id: "prosp-1",
      companyName: "Agrícola & Tratores Santa Fé Ltda",
      cnpj: "45.123.789/0001-44",
      segment: "Maquinário Agrícola",
      contactName: "Carlos Eduardo (Ger. Suprimentos)",
      phone: "(19) 3881-4400",
      email: "carlos.compras@agrisantafe.com.br",
      stage: "COTACAO_SOLICITADA",
      estimatedValue: 145000,
      probability: 80,
      nextAction: "Emitir proposta de usinagem dos cubos de roda e eixos estriados",
      discussions: [
        { id: "disc-1", date: "2026-09-08 14:30", author: "Roberto Vendas", type: "REUNIAO", notes: "Apresentado portfólio de centros de usinagem 5 eixos e tolerâncias ISO 2768-m. Cliente solicitou cotação de 120 eixos.", nextStep: "Cotação técnica na Engenharia" },
        { id: "disc-2", date: "2026-09-10 10:15", author: "Roberto Vendas", type: "LIGACAO", notes: "Alinhado prazo de entrega: cliente precisa do primeiro lote em 20 dias.", nextStep: "Simular carga de máquina no PCP" }
      ]
    },
    {
      id: "prosp-2",
      companyName: "Sul Minas Autopeças & Componentes",
      cnpj: "18.940.112/0001-89",
      segment: "Autopeças & Estamparia",
      contactName: "Mariana Vasconcelos (Eng. Compras)",
      phone: "(35) 3471-9920",
      email: "m.vasconcelos@sulminasauto.com.br",
      stage: "APRESENTACAO_TECNICA",
      estimatedValue: 98000,
      probability: 50,
      nextAction: "Agendar visita técnica da equipe de engenharia para avaliar amostras",
      discussions: [
        { id: "disc-3", date: "2026-09-05 16:00", author: "Fernanda Comercial", type: "EMAIL", notes: "Envio de catálogo técnico e laudos de ensaio de dureza Rockwell.", nextStep: "Follow-up telefônico" }
      ]
    },
    {
      id: "prosp-3",
      companyName: "HidroPower Sistemas Hidráulicos",
      cnpj: "31.220.554/0001-12",
      segment: "Óleo & Gás / Hidráulica",
      contactName: "Eng. Paulo Guimarães",
      phone: "(11) 4192-3300",
      email: "guimaraes@hidropower.ind.br",
      stage: "REUNIAO_AGENDADA",
      estimatedValue: 220000,
      probability: 65,
      nextAction: "Videoconferência técnica para análise de desenhos 3D STEP",
      discussions: [
        { id: "disc-4", date: "2026-09-09 11:00", author: "Roberto Vendas", type: "WHATSAPP", notes: "Cliente confirmou interesse em terceirizar blocos manifold usinados em ferro fundido nodular.", nextStep: "Reunião dia 14/09" }
      ]
    }
  ];

  const DEFAULT_BUDGETS = [
    {
      id: "ORC-IND-2026-041",
      clientName: "Agrícola & Tratores Santa Fé Ltda",
      clientCnpj: "45.123.789/0001-44",
      projectScope: "Lote de 120 Eixos Estriados Temperados 4340 + Tratamento Térmico por Indução",
      rawMaterialCost: 48000,
      machiningCost: 32000,
      laborCost: 14000,
      bdiMarginPct: 32,
      totalProductionCost: 94000,
      totalValue: 124080,
      estimatedLeadTimeDays: 18,
      validUntil: "2026-09-30",
      status: "EM_NEGOCIACAO",
      createdAt: "2026-09-09",
      discussions: [
        { id: "nd-1", date: "2026-09-10 15:40", author: "Roberto Vendas", type: "CONTRAPROPOSTA_CLIENTE", notes: "Cliente solicitou 4% de desconto à vista e entrega fracionada em 2 quinzenas.", discountOffered: 4, outcome: "Em análise pela diretoria fabril" }
      ]
    },
    {
      id: "ORC-IND-2026-042",
      clientName: "Frigorífico Aurora Sul S/A",
      clientCnpj: "04.555.221/0001-09",
      projectScope: "Reforma & Fabricação de 4 Tambores Rotativos Inox 304 para Linha de Desossa",
      rawMaterialCost: 65000,
      machiningCost: 28000,
      laborCost: 18000,
      bdiMarginPct: 28,
      totalProductionCost: 111000,
      totalValue: 142080,
      estimatedLeadTimeDays: 14,
      validUntil: "2026-09-25",
      status: "APROVADO",
      createdAt: "2026-09-04",
      discussions: [
        { id: "nd-2", date: "2026-09-07 09:30", author: "Eng. Ricardo", type: "ALINHAMENTO_TECNICO", notes: "Especificação de solda TIG com purga de argônio aprovada pelo cliente.", discountOffered: 0, outcome: "Aprovado sem ressalvas" }
      ]
    },
    {
      id: "ORC-IND-2026-043",
      clientName: "Votoran Cimentos & Mineração",
      clientCnpj: "61.064.838/0001-20",
      projectScope: "Conjunto de Guias de Desgaste em Aço Hardox 450 com Furação Cônica",
      rawMaterialCost: 38000,
      machiningCost: 22000,
      laborCost: 9000,
      bdiMarginPct: 35,
      totalProductionCost: 69000,
      totalValue: 93150,
      estimatedLeadTimeDays: 22,
      validUntil: "2026-10-05",
      status: "ENVIADO",
      createdAt: "2026-09-10",
      discussions: [
        { id: "nd-3", date: "2026-09-10 17:00", author: "Fernanda Comercial", type: "ENVIO_PROPOSTA", notes: "Proposta técnica enviada com laudo de composição química do aço Hardox.", discountOffered: 0, outcome: "Aguardando retorno do comitê de suprimentos" }
      ]
    }
  ];

  const DEFAULT_ORDERS = [
    {
      id: "PV-IND-2026-088",
      clientPoNumber: "PO-AURORA-9821",
      clientName: "Frigorífico Aurora Sul S/A",
      clientCnpj: "04.555.221/0001-09",
      budgetReferenceId: "ORC-IND-2026-042",
      productDescription: "4 Tambores Rotativos Inox 304 Linha de Desossa",
      quantity: 4,
      totalValue: 142080,
      paymentTerms: "Sinal 40% + 60% faturamento a 28 ddl",
      orderDate: "2026-09-07",
      deliveryDate: "2026-09-22",
      commercialStatus: "LIBERADO_PCP",
      productionOrderId: "OP-2026-012",
      shippingInstructions: "Frete CIF - Despachar via Transportadora Transvale com agendamento de descarregamento",
      discussions: [
        { id: "od-1", date: "2026-09-07 14:00", author: "Fernanda Comercial", topic: "CONFIRMACAO_PO", notes: "PO formalizada pelo comprador Sr. Almir. Comprovante de sinal de 40% creditado no Bradesco." },
        { id: "od-2", date: "2026-09-08 08:30", author: "Roberto Vendas", topic: "LIBERACAO_PCP", notes: "Pedido liberado para PCP com prioridade alta devido a parada de manutenção programada do frigorífico." }
      ]
    },
    {
      id: "PV-IND-2026-089",
      clientPoNumber: "OC-VOLVO-4412",
      clientName: "Metalúrgica Precision Parts Ltda",
      clientCnpj: "22.333.444/0001-55",
      budgetReferenceId: "ORC-IND-2026-039",
      productDescription: "800 Flanges Usinadas em Alumínio Naval 6061-T6",
      quantity: 800,
      totalValue: 96000,
      paymentTerms: "Faturado 30/60 dias após aceite do controle de qualidade",
      orderDate: "2026-08-28",
      deliveryDate: "2026-09-18",
      commercialStatus: "EM_FABRICACAO",
      productionOrderId: "OP-2026-009",
      shippingInstructions: "Entregar no galpão de inspeção da montadora com relatório tridimensional",
      discussions: [
        { id: "od-3", date: "2026-09-02 11:20", author: "Roberto Vendas", topic: "ALINHAMENTO_CQ", notes: "Alinhado envio antecipado de 5 peças piloto para ensaio de estanqueidade." }
      ]
    },
    {
      id: "PV-IND-2026-090",
      clientPoNumber: "PO-WEG-11029",
      clientName: "WEG Motores & Acionamentos",
      clientCnpj: "84.429.695/0001-11",
      budgetReferenceId: "ORC-IND-2026-035",
      productDescription: "50 Carcaças Especiais Usinadas para Motor A Prova de Explosão",
      quantity: 50,
      totalValue: 180400,
      paymentTerms: "28/42/56 ddl",
      orderDate: "2026-09-01",
      deliveryDate: "2026-09-28",
      commercialStatus: "EM_FABRICACAO",
      productionOrderId: "OP-2026-015",
      shippingInstructions: "Paletizado em madeira tratada padrão exportação com filme stretch",
      discussions: [
        { id: "od-4", date: "2026-09-09 16:30", author: "Fernanda Comercial", topic: "ACOMPANHAMENTO", notes: "Cliente solicitou prévia do relatório de rastreabilidade de corrida do aço." }
      ]
    }
  ];

  return {
    checkPerm,
    AccessDeniedNotice,
    DEFAULT_PROSPECTS,
    DEFAULT_BUDGETS,
    DEFAULT_ORDERS
  };
};
