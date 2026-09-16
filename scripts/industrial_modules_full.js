// MÓDULO INTEGRADO DE TELAS COMERCIAIS E ENGENHARIA PARA INDÚSTRIA B2B
module.exports = function(b, t) {
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
    return true;
  }

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

  // =========================================================================
  // DADOS PADRÃO DO COMERCIAL INDUSTRIAL
  // =========================================================================
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
      phone: "(35) 3422-9000",
      email: "m.vasconcelos@sulminasauto.com.br",
      stage: "EM_NEGOCIACAO",
      estimatedValue: 98000,
      probability: 65,
      nextAction: "Reunião de alinhamento sobre tratamento térmico por indução",
      discussions: [
        { id: "disc-3", date: "2026-09-05 09:00", author: "Roberto Vendas", type: "VISITA_TECNICA", notes: "Visita técnica à planta fabril em Pouso Alegre. Auditadas dimensões das amostras.", nextStep: "Enviar laudo de rugosidade Ra 0.8" }
      ]
    },
    {
      id: "prosp-3",
      companyName: "HidroValves Sistemas de Fluxo S/A",
      cnpj: "09.432.110/0001-33",
      segment: "Válvulas & Óleo e Gás",
      contactName: "Eng. Paulo Sérgio (P&D)",
      phone: "(11) 4612-8800",
      email: "paulo.sergio@hidrovalves.ind.br",
      stage: "PROSPECCAO_INICIAL",
      estimatedValue: 220000,
      probability: 40,
      nextAction: "Assinatura de Acordo de Confidencialidade (NDA) para envio de modelos CAD 3D",
      discussions: [
        { id: "disc-4", date: "2026-09-11 16:00", author: "Fernanda Comercial", type: "EMAIL", notes: "Recebidas especificações preliminares de corpos forjados em ASTM A105.", nextStep: "Retornar com minuta de NDA" }
      ]
    }
  ];

  const DEFAULT_CLIENTES_B2B = [
    {
      id: "cli-ind-01",
      razaoSocial: "Agrícola & Tratores Santa Fé Ltda",
      nomeFantasia: "Santa Fé Máquinas Agrícolas",
      cnpj: "45.123.789/0001-44",
      ie: "284.912.450.110",
      segmento: "Maquinário Agrícola & Tratores",
      cidade: "Ribeirão Preto - SP",
      compradorPrincipal: "Carlos Eduardo (Gerente de Compras)",
      telefone: "(19) 3881-4400",
      email: "carlos.compras@agrisantafe.com.br",
      condicaoPagamento: "28 / 42 / 56 ddl",
      limiteCredito: 350000,
      limiteUtilizado: 124080,
      status: "ATIVO",
      tabelaPreco: "Tabela Fabril Especial B2B",
      totalFaturadoAno: 640000
    },
    {
      id: "cli-ind-02",
      razaoSocial: "Frigorífico Aurora Sul S/A",
      nomeFantasia: "Aurora Alimentos Industrial",
      cnpj: "04.555.221/0001-09",
      ie: "902.114.773.001",
      segmento: "Alimentício & Frigorífico Inox",
      cidade: "Chapecó - SC",
      compradorPrincipal: "Almir Zandoná (Suprimentos)",
      telefone: "(49) 3321-7000",
      email: "almir.suprimentos@aurorasul.com.br",
      condicaoPagamento: "Sinal 40% + 60% a 28 ddl",
      limiteCredito: 500000,
      limiteUtilizado: 142080,
      status: "ATIVO",
      tabelaPreco: "Linha Inox Sanitária 304/316L",
      totalFaturadoAno: 890000
    },
    {
      id: "cli-ind-03",
      razaoSocial: "Metalúrgica Precision Parts Ltda",
      nomeFantasia: "Precision Parts Usinagem",
      cnpj: "22.333.444/0001-55",
      ie: "114.882.331.119",
      segmento: "Autopeças & Metalmecânica",
      cidade: "São Bernardo do Campo - SP",
      compradorPrincipal: "Renato Diniz (Coordenador de Compras)",
      telefone: "(11) 4344-2200",
      email: "renato.diniz@precisionparts.com.br",
      condicaoPagamento: "30 / 60 dias após aceite CQ",
      limiteCredito: 250000,
      limiteUtilizado: 96000,
      status: "ATIVO",
      tabelaPreco: "Tabela Montadoras e Sistemistas",
      totalFaturadoAno: 420000
    },
    {
      id: "cli-ind-04",
      razaoSocial: "WEG Motores & Acionamentos S/A",
      nomeFantasia: "WEG Fábrica VII",
      cnpj: "84.429.695/0001-11",
      ie: "250.123.889.004",
      segmento: "Motores & Equipamentos Industriais",
      cidade: "Jaraguá do Sul - SC",
      compradorPrincipal: "Guilherme Schmitt (Eng. Suprimentos)",
      telefone: "(47) 3276-4000",
      email: "guilherme.schmitt@weg.net",
      condicaoPagamento: "28 / 42 / 56 ddl",
      limiteCredito: 800000,
      limiteUtilizado: 180400,
      status: "ATIVO",
      tabelaPreco: "Contrato Anual Fornecimento Homologado",
      totalFaturadoAno: 1450000
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
      leadTimeDays: 15,
      validUntil: "2026-09-30",
      status: "AGUARDANDO_CLIENTE",
      approvalProb: 85,
      notes: "Custo de aço SAE 4340 forjado cotação Gerdau de 05/09/2026. BDI cobre custos indiretos e margem líquida de 18%."
    },
    {
      id: "ORC-IND-2026-042",
      clientName: "Frigorífico Aurora Sul S/A",
      clientCnpj: "04.555.221/0001-09",
      projectScope: "4 Tambores Rotativos Inox 304 Linha de Desossa",
      rawMaterialCost: 55000,
      machiningCost: 38000,
      laborCost: 15000,
      bdiMarginPct: 31.5,
      totalProductionCost: 108000,
      totalValue: 142080,
      leadTimeDays: 20,
      validUntil: "2026-09-25",
      status: "APROVADO",
      approvalProb: 100,
      notes: "Orçamento aprovado pelo cliente via PO-AURORA-9821. Aguardando liberação formal para PCP."
    },
    {
      id: "ORC-IND-2026-043",
      clientName: "HidroValves Sistemas de Fluxo S/A",
      clientCnpj: "09.432.110/0001-33",
      projectScope: "25 Conjuntos de Válvulas Esfera Flangeadas DN50 PN16 em Aço Inox 316L",
      rawMaterialCost: 68000,
      machiningCost: 42000,
      laborCost: 18000,
      bdiMarginPct: 35,
      totalProductionCost: 128000,
      totalValue: 172800,
      leadTimeDays: 25,
      validUntil: "2026-10-05",
      status: "EM_ELABORACAO",
      approvalProb: 60,
      notes: "Necessário teste hidrostático a 24 bar conforme norma ASME B16.34."
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
      shippingInstructions: "Frete CIF - Despachar via Transportadora Transvale com agendamento de descarregamento"
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
      shippingInstructions: "Entregar no galpão de inspeção da montadora com relatório tridimensional"
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
      shippingInstructions: "Paletizado em madeira tratada padrão exportação com filme stretch"
    }
  ];

  // =========================================================================
  // DADOS PADRÃO DA ENGENHARIA INDUSTRIAL
  // =========================================================================
  const DEFAULT_PRODUCT_DEV = [
    {
      id: "DEV-PROD-01",
      partNumber: "VALV-ESF-DN50-316L",
      name: "Válvula Esfera Flangeada DN50 PN16",
      category: "Válvulas & Tubulações Industriais",
      stage: "HOMOLOGADO", // CONCEITO, MODELAGEM_CAD, PROTOTIPO, HOMOLOGADO, EM_LINHA, OBSOLETO
      leadEngineer: "Eng. Marcelo Vieira (CREA 506144)",
      cadFile: "VALVULA-ESFERA-FLANGEADA-DN50.SLDASM",
      materials: "Corpo Aço Inox ASTM A351 CF8M, Esfera AISI 316, Vedações PTFE Reforçado",
      weightKg: 8.450,
      dimensions: "DN 50mm x Face-a-Face 178mm x Flange 165mm",
      tolerances: "ISO 2768-mK / Classe de Pressão ANSI 150 / PN16",
      targetCost: 559.00,
      suggestedSalePrice: 1250.00,
      bomId: "BOM-VALV-ESF-01",
      notes: "Montagem modelada no SolidWorks 2025 com cálculo de elementos finitos FEA aprovado para 25 bar."
    },
    {
      id: "DEV-PROD-02",
      partNumber: "RED-PLANET-10-NM350",
      name: "Redutor Planetário de Precisão 1:10 Torque 350 N.m",
      category: "Transmissão Mecânica & Redutores",
      stage: "PROTOTIPO",
      leadEngineer: "Eng. Larissa Fontes",
      cadFile: "REDUTOR-PLANETARIO-1-10.SLDASM",
      materials: "Engrenagens Aço SAE 8620 Cementado, Carcaça Alumínio 7075-T6 Usinado",
      weightKg: 4.820,
      dimensions: "Flange 90mm x Comprimento 165mm x Eixo 22mm",
      tolerances: "Folga Angular (Backlash) < 5 arcmin / Batimento Eixo < 0.015mm",
      targetCost: 890.00,
      suggestedSalePrice: 2100.00,
      bomId: "BOM-RED-02",
      notes: "Protótipo físico em teste de vida acelerada na bancada dinamométrica. Ruído medido de 62 dBA."
    },
    {
      id: "DEV-PROD-03",
      partNumber: "CIL-HIDR-100-50-400",
      name: "Cilindro Hidráulico Industrial Dupla Ação Curso 400mm",
      category: "Hidráulica & Automação Fabril",
      stage: "MODELAGEM_CAD",
      leadEngineer: "Eng. Marcelo Vieira",
      cadFile: "CILINDRO-HIDRAULICO-HEAVY-DUTY.SLDASM",
      materials: "Camisa Brunida ST52 BK+S, Haste Aço SAE 1045 Cromo Duro 30µm",
      weightKg: 24.100,
      dimensions: "Diâm. Camisa 100mm x Haste 50mm x Curso 400mm",
      tolerances: "Rugosidade Camisa Ra 0.2µm / Pressão Trabalho 210 bar (3000 PSI)",
      targetCost: 1450.00,
      suggestedSalePrice: 3200.00,
      bomId: "BOM-CIL-03",
      notes: "Em detalhamento de vedações Chevron e olhais de articulação com buchas autolubrificantes."
    }
  ];

  const DEFAULT_TECHNICAL_DATASHEETS = [
    {
      id: "FT-2026-001",
      productPartNumber: "VALV-ESF-DN50-316L",
      productName: "Válvula Esfera Flangeada DN50 PN16",
      revision: "Rev 02",
      effectiveDate: "2026-08-15",
      leadProcessEngineer: "Eng. Cláudio Prado",
      totalStandardTimeMin: 145,
      operations: [
        { seq: 10, name: "Corte em Serra de Fita CNC", workCenter: "POSTO-CORTE-01 (Serra Franho)", setupTimeMin: 15, cycleTimeMin: 6, tools: "Lâmina Bimetálica M42 4/6 dentes", inspectionCriteria: "Comprimento nominal ±0.5mm, esquadro de corte 90°" },
        { seq: 20, name: "Torneamento CNC - Usinagem do Corpo", workCenter: "POSTO-CNC-01 (Torno Nardini Fastrace)", setupTimeMin: 35, cycleTimeMin: 22, tools: "Pastilhas Metal Duro WNMG 080408 Sandvik", inspectionCriteria: "Diâmetro interno Ø50 H7 (+0.030/0), roscas NPT conforme calibrador tampão" },
        { seq: 30, name: "Furação e Fresamento de Flanges", workCenter: "POSTO-USINAGEM-02 (Centro Romi D800)", setupTimeMin: 40, cycleTimeMin: 28, tools: "Broca Metal Duro Integral Ø18mm, Fresa de Topo Ø50mm", inspectionCriteria: "Posição dos 4 furos PCD 125mm ±0.15mm, planaridade da face flangeada Ra 1.6" },
        { seq: 40, name: "Polimento da Esfera e Haste", workCenter: "POSTO-POLIMENTO-01 (Bancada de Acabamento)", setupTimeMin: 10, cycleTimeMin: 18, tools: "Pasta Diamantada 3µm + Disco de Feltro", inspectionCriteria: "Esfericidade < 0.008mm, Rugosidade Ra < 0.1µm espelhado" },
        { seq: 50, name: "Montagem do Conjunto e Vedações", workCenter: "POSTO-MONTAGEM-01 (Célula Válvulas)", setupTimeMin: 10, cycleTimeMin: 15, tools: "Torquímetro com soquete 19mm (Torque 45 N.m)", inspectionCriteria: "Torque de acionamento manual suave sem folga axial na haste" },
        { seq: 60, name: "Ensaio Hidrostático & Estanqueidade", workCenter: "POSTO-TESTE-CQ (Bancada Teste Hidráulico)", setupTimeMin: 10, cycleTimeMin: 12, tools: "Manômetro Calibrado RBC + Bomba Teste 30 bar", inspectionCriteria: "Pressão de ensaio 24 bar mantida por 3 minutos sem perda de pressão" },
        { seq: 70, name: "Limpeza, Gravação a Laser e Embalagem", workCenter: "POSTO-EMBALAGEM-01", setupTimeMin: 5, cycleTimeMin: 8, tools: "Laser de Fibra 30W + Caixas com Espuma", inspectionCriteria: "Gravação legível: Part Number, Lote, Pressão Máxima e Logo da Empresa" }
      ]
    },
    {
      id: "FT-2026-002",
      productPartNumber: "RED-PLANET-10-NM350",
      productName: "Redutor Planetário de Precisão 1:10 Torque 350 N.m",
      revision: "Rev 01",
      effectiveDate: "2026-07-20",
      leadProcessEngineer: "Eng. Cláudio Prado",
      totalStandardTimeMin: 220,
      operations: [
        { seq: 10, name: "Usinagem da Carcaça em Alumínio 7075", workCenter: "POSTO-USINAGEM-01 (Centro 5 Eixos Hermle)", setupTimeMin: 50, cycleTimeMin: 45, tools: "Fresa de Alumínio Pastilhada Sandvik", inspectionCriteria: "Concentricidade dos mancais < 0.010mm, alojamento de rolamento H6" },
        { seq: 20, name: "Denteamento de Engrenagens Solares e Satélites", workCenter: "POSTO-DENTEADORA-01 (Fellows CNC)", setupTimeMin: 60, cycleTimeMin: 35, tools: "Caracol Módulo 1.5 DIN 3962 Classe 6", inspectionCriteria: "Erro acumulado de passo < 0.008mm, perfil de dente involuta verificado" },
        { seq: 30, name: "Tratamento Térmico de Cementação e Têmpera", workCenter: "FORNECEDOR-EXTERNO (Trat. Térmico TermoAço)", setupTimeMin: 0, cycleTimeMin: 0, tools: "Forno de Atmosfera Controlada", inspectionCriteria: "Dureza superficial 58-62 HRC, profundidade de camada 0.8mm" },
        { seq: 40, name: "Retífica de Flancos de Dente e Eixos", workCenter: "POSTO-RETIFICA-01 (Retífica Studer CNC)", setupTimeMin: 45, cycleTimeMin: 30, tools: "Rebolo CBN Dressado", inspectionCriteria: "Classe de precisão DIN 3962 Classe 4 / Ra 0.4µm" },
        { seq: 50, name: "Montagem em Sala Limpa e Lubrificação", workCenter: "SALA-LIMPA-MONTAGEM", setupTimeMin: 15, cycleTimeMin: 25, tools: "Graxa Sintética Klüber Isoflex Topas L32", inspectionCriteria: "Folga entre dentes (Backlash) ajustada < 5 arcmin" },
        { seq: 60, name: "Teste Dinamométrico de Rendimento e Ruído", workCenter: "POSTO-TESTE-DINAMOMETRO", setupTimeMin: 15, cycleTimeMin: 20, tools: "Dinamômetro Magtrol + Decibelímetro", inspectionCriteria: "Eficiência mecânica > 94% a 3000 RPM, ruído < 65 dBA" }
      ]
    }
  ];

  const DEFAULT_REVISIONS_ECN = [
    {
      id: "ECN-2026-014",
      title: "Otimização da Sede de Vedação em PTFE na Válvula Esfera DN50",
      productPartNumber: "VALV-ESF-DN50-316L",
      fromRev: "Rev 01",
      toRev: "Rev 02",
      requestDate: "2026-08-10",
      approvalDate: "2026-08-15",
      requester: "Eng. Marcelo Vieira (Engenharia de Produto)",
      approver: "Diretoria Técnica & CQ",
      status: "HOMOLOGADA", // RASCUNHO, EM_ANALISE, HOMOLOGADA, IMPLANTADA_PRODUCAO
      reason: "REDUCAO_TORQUE",
      description: "Adicionado chanfro de alívio de 15° na sede em PTFE para diminuir o torque de manobra em 22% sem perder estanqueidade.",
      stockDisposition: "CONSUMIR_ESTOQUE_ANTERIOR", // CONSUMIR_ESTOQUE_ANTERIOR, RETRABALHAR_LOTE, SUCATEAR
      stockDispositionNotes: "As 18 sedes do lote anterior podem ser consumidas normalmente em pedidos de pressão standard (até 16 bar).",
      cadDrawingUpdated: true,
      cadFileName: "VALVULA-ESFERA-FLANGEADA-DN50-REV02.SLDASM",
      bomUpdated: true
    },
    {
      id: "ECN-2026-015",
      title: "Substituição do Parafuso de Fechamento por Inox 316 A4-70",
      productPartNumber: "VALV-ESF-DN50-316L",
      fromRev: "Rev 02",
      toRev: "Rev 03",
      requestDate: "2026-09-02",
      approvalDate: "2026-09-09",
      requester: "Eng. Larissa Fontes",
      approver: "Gerência de Qualidade Fabril",
      status: "IMPLANTADA_PRODUCAO",
      reason: "RESISTENCIA_CORROSAO",
      description: "Substituição dos parafusos sextavados M12x45 de Aço Inox 304 (A2-70) para Aço Inox 316 (A4-70) atendendo requisito de plantas químicas costeiras.",
      stockDisposition: "RETRABALHAR_LOTE",
      stockDispositionNotes: "Trocar parafusos em estoque nas 4 unidades montadas antes da expedição.",
      cadDrawingUpdated: true,
      cadFileName: "VALVULA-ESFERA-FLANGEADA-DN50-REV03.SLDASM",
      bomUpdated: true
    },
    {
      id: "ECN-2026-016",
      title: "Redesenho dos Satélites para Redução de Inércia no Redutor 1:10",
      productPartNumber: "RED-PLANET-10-NM350",
      fromRev: "Rev 01",
      toRev: "Rev 02",
      requestDate: "2026-09-12",
      approvalDate: null,
      requester: "Eng. Larissa Fontes",
      approver: "Em Análise pela Engenharia de Processo",
      status: "EM_ANALISE",
      reason: "MELHORIA_DESEMPENHO",
      description: "Abertura de 3 furos de alívio nos corpos das 3 engrenagens satélites para reduzir o momento de inércia rotacional em 14%.",
      stockDisposition: "CONSUMIR_ESTOQUE_ANTERIOR",
      stockDispositionNotes: "Lote piloto em usinagem no centro Romi.",
      cadDrawingUpdated: true,
      cadFileName: "SATELITE-COM-ALIVIO-REV02.SLDPRT",
      bomUpdated: false
    }
  ];

  const INDUSTRIAL_UNITS = [
    { code: "UN", name: "Unidade", type: "Discreto", desc: "Peças unitárias, eixos, motores, válvulas completas" },
    { code: "PC", name: "Peça", type: "Discreto", desc: "Componentes usinados, estamparia, chapas cortadas" },
    { code: "KG", name: "Quilograma", type: "Massa", desc: "Matérias-primas metálicas, tarugos, sucatas, pós" },
    { code: "G", name: "Grama", type: "Massa", desc: "Soldas nobres, pigmentos, aditivos químicos" },
    { code: "M", name: "Metro Linear", type: "Comprimento", desc: "Perfis estruturais, tubos, barras redondas laminadas" },
    { code: "M2", name: "Metro Quadrado", type: "Área", desc: "Chapas de aço cortadas a laser, placas de desgaste" },
    { code: "M3", name: "Metro Cúbico", type: "Volume", desc: "Gases industriais, tanques, tratamento térmico" },
    { code: "L", name: "Litro", type: "Volume Líquido", desc: "Óleos solúveis de usinagem, tintas epóxi, fluidos hidráulicos" },
    { code: "ROLO", name: "Rolo", type: "Agrupamento", desc: "Arames de solda MIG/TIG, fitas de vedação PTFE" },
    { code: "CENTO", name: "Cento (100 un)", type: "Discreto Agrupado", desc: "Parafusos, arruelas, porcas industriais" },
    { code: "JG", name: "Jogo / Conjunto", type: "Kit", desc: "Kits de reparo de vedações, conjuntos de engrenagens" }
  ];

  return {
    checkPerm,
    AccessDeniedNotice,
    DEFAULT_PROSPECTS,
    DEFAULT_CLIENTES_B2B,
    DEFAULT_BUDGETS,
    DEFAULT_ORDERS,
    DEFAULT_PRODUCT_DEV,
    DEFAULT_TECHNICAL_DATASHEETS,
    DEFAULT_REVISIONS_ECN,
    INDUSTRIAL_UNITS
  };
};
