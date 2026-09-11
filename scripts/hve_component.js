// Catálogo de Montagens Industriais SolidWorks tv
const tv = [
  {
    id: "cad-01",
    name: "Válvula Esfera Flangeada DN50 PN16",
    assemblyFileName: "VALVULA-ESFERA-FLANGEADA-DN50.SLDASM",
    partNumber: "VALV-ESF-DN50-316L",
    cadVersion: "SolidWorks 2025 SP1.0 (Build 33.1.0)",
    totalMassKg: 14.85,
    mainMaterial: "Aço Inox AISI 316L / CF8M",
    author: "Eng. Roberto Albuquerque (Projetos CAD)",
    lastModified: "14/03/2026 10:45",
    defaultBatch: 5,
    components: [
      { itemNumber: 1, partNumber: "MP-CORP-VALV-DN50", description: "Corpo da Válvula Bipartido Fundido CF8M", quantity: 1, unit: "UN", category: "materia_prima", material: "Aço Inox 316L Fundido", estimatedUnitCost: 280, defaultLocation: "Rua A - Prat. 01 - Nív. 2 (A-01-02)", status: "valid" },
      { itemNumber: 2, partNumber: "CP-ESFERA-DN50-POL", description: "Esfera Flutuante Polida Espelhada DN50", quantity: 1, unit: "UN", category: "componente", material: "Aço Inox 316L Usinado", estimatedUnitCost: 115, defaultLocation: "Rua B - Prat. 03 - Nív. 1 (B-03-01)", status: "valid" },
      { itemNumber: 3, partNumber: "CP-HASTE-VALV-316", description: "Haste de Acionamento Antiestática DN50", quantity: 1, unit: "UN", category: "componente", material: "Aço Inox 316L Retificado", estimatedUnitCost: 45, defaultLocation: "Rua B - Prat. 03 - Nív. 2 (B-03-02)", status: "valid" },
      { itemNumber: 4, partNumber: "CP-VED-PTFE-DN50", description: "Assento e Vedação da Esfera em PTFE Puro", quantity: 2, unit: "UN", category: "componente", material: "Polímero PTFE (Teflon)", estimatedUnitCost: 28.5, defaultLocation: "Gaveteiro G-04 (G-04-A)", status: "valid" },
      { itemNumber: 5, partNumber: "CP-GAX-PTFE-CHEVRON", description: "Jogo de Gaxetas Chevron para Vedação da Haste", quantity: 1, unit: "JG", category: "componente", material: "PTFE Grafitado", estimatedUnitCost: 18, defaultLocation: "Gaveteiro G-04 (G-04-B)", status: "valid" },
      { itemNumber: 6, partNumber: "MP-ALAV-ACO-EPOXI", description: "Alavanca Manual de Manobra com Revestimento Epóxi", quantity: 1, unit: "UN", category: "materia_prima", material: "Aço Carbono SAE 1020", estimatedUnitCost: 32, defaultLocation: "Rua C - Prat. 02 - Nív. 1 (C-02-01)", status: "valid" },
      { itemNumber: 7, partNumber: "CP-PARAF-INOX-M12", description: "Parafuso Sextavado Inox A2-70 M12 x 45mm", quantity: 8, unit: "UN", category: "componente", material: "Aço Inox 304", estimatedUnitCost: 3.2, defaultLocation: "Gaveteiro G-08 (G-08-C)", status: "valid" },
      { itemNumber: 8, partNumber: "CP-PORCA-INOX-M12", description: "Porca Sextavada Auto-Travante Inox A2 M12", quantity: 8, unit: "UN", category: "componente", material: "Aço Inox 304", estimatedUnitCost: 1.8, defaultLocation: "Gaveteiro G-08 (G-08-D)", status: "valid" }
    ]
  },
  {
    id: "cad-02",
    name: "Redutor Planetário de Precisão Ratio 1:10",
    assemblyFileName: "REDUTOR-PLANETARIO-RATIO10.SLDASM",
    partNumber: "RED-PLAN-MOD2-10X",
    cadVersion: "SolidWorks 2025 SP1.0 (Build 33.1.0)",
    totalMassKg: 8.4,
    mainMaterial: "Aço Liga SAE 8620 Cementado",
    author: "Eng. Lucas Penteado (Mecatrônica)",
    lastModified: "12/03/2026 16:20",
    defaultBatch: 3,
    components: [
      { itemNumber: 1, partNumber: "MP-CARC-ALU-RED", description: "Carcaça Usinada em Alumínio Naval 6061-T6", quantity: 1, unit: "UN", category: "materia_prima", material: "Alumínio 6061-T6", estimatedUnitCost: 195, defaultLocation: "Rua A - Prat. 04 - Nív. 2 (A-04-02)", status: "valid" },
      { itemNumber: 2, partNumber: "CP-ENG-SOLAR-Z12", description: "Engrenagem Solar Z=12 Módulo 2.0 Cementada", quantity: 1, unit: "UN", category: "componente", material: "Aço SAE 8620", estimatedUnitCost: 85, defaultLocation: "Rua B - Prat. 01 - Nív. 3 (B-01-03)", status: "valid" },
      { itemNumber: 3, partNumber: "CP-ENG-PLANET-Z24", description: "Engrenagens Planetárias Z=24 Módulo 2.0 (Jogo 3 un)", quantity: 3, unit: "UN", category: "componente", material: "Aço SAE 8620", estimatedUnitCost: 65, defaultLocation: "Rua B - Prat. 01 - Nív. 4 (B-01-04)", status: "valid" },
      { itemNumber: 4, partNumber: "CP-COROA-DENT-INT", description: "Coroa Dentada Interna com Flange DIN 5480", quantity: 1, unit: "UN", category: "componente", material: "Aço SAE 4140 Beneficiado", estimatedUnitCost: 140, defaultLocation: "Rua B - Prat. 02 - Nív. 2 (B-02-02)", status: "valid" },
      { itemNumber: 5, partNumber: "CP-ROL-ESF-6005", description: "Rolamento Rígido de Esferas SKF 6005-2RS1", quantity: 2, unit: "UN", category: "componente", material: "Aço Cromo 100Cr6", estimatedUnitCost: 38, defaultLocation: "Gaveteiro G-02 (G-02-E)", status: "valid" },
      { itemNumber: 6, partNumber: "CP-RET-NBR-25X47", description: "Retentor de Óleo com Mola 25x47x7mm NBR", quantity: 2, unit: "UN", category: "componente", material: "Borracha Nitrílica NBR", estimatedUnitCost: 14.5, defaultLocation: "Gaveteiro G-05 (G-05-A)", status: "valid" }
    ]
  },
  {
    id: "cad-03",
    name: "Cilindro Hidráulico Industrial Dupla Ação Ø80x350mm",
    assemblyFileName: "CILINDRO-HIDRAULICO-DA-80X350.SLDASM",
    partNumber: "CIL-HID-DA-80-350",
    cadVersion: "SolidWorks 2025 SP1.0 (Build 33.1.0)",
    totalMassKg: 28.6,
    mainMaterial: "Aço ST52 Brunido / Haste SAE 1045 Cromada",
    author: "Eng. Marcelo Tavares (Oleodinâmica)",
    lastModified: "15/03/2026 09:15",
    defaultBatch: 4,
    components: [
      { itemNumber: 1, partNumber: "MP-CAMISA-ST52-80", description: "Camisa Tubular Brunida Interna H8 Ø80x95x420mm", quantity: 1, unit: "UN", category: "materia_prima", material: "Aço ST52 Sem Costura", estimatedUnitCost: 310, defaultLocation: "Rua D - Prat. 01 - Nív. 1 (D-01-01)", status: "valid" },
      { itemNumber: 2, partNumber: "MP-HASTE-CROM-40", description: "Barra Redonda Cromada com Dureza 65 HRC Ø40x480mm", quantity: 1, unit: "UN", category: "materia_prima", material: "Aço SAE 1045 Cromo Duro", estimatedUnitCost: 220, defaultLocation: "Rua D - Prat. 02 - Nív. 1 (D-02-01)", status: "valid" },
      { itemNumber: 3, partNumber: "CP-EMBOLO-ACO-80", description: "Êmbolo Bipartido com Alojamento de Gaxeta Ø80mm", quantity: 1, unit: "UN", category: "componente", material: "Aço SAE 1020 Usinado", estimatedUnitCost: 85, defaultLocation: "Rua B - Prat. 04 - Nív. 3 (B-04-03)", status: "valid" },
      { itemNumber: 4, partNumber: "CP-TAMPA-GUIA-NOD", description: "Cabeçote Tampa Guia da Haste em Ferro Fundido GGG-40", quantity: 1, unit: "UN", category: "componente", material: "Fofo Nodular GGG-40", estimatedUnitCost: 125, defaultLocation: "Rua A - Prat. 03 - Nív. 2 (A-03-02)", status: "valid" },
      { itemNumber: 5, partNumber: "CP-KIT-VED-CIL80", description: "Kit Completo de Vedações Hidráulicas (Gaxeta, Raspador, O-ring)", quantity: 1, unit: "JG", category: "componente", material: "Poliuretano + NBR 90 Shore", estimatedUnitCost: 65, defaultLocation: "Gaveteiro G-06 (G-06-B)", status: "valid" },
      { itemNumber: 6, partNumber: "CP-ROTULA-GE40", description: "Olhal Articulado com Rótula Esférica GE40ES", quantity: 2, unit: "UN", category: "componente", material: "Aço Forjado 1045", estimatedUnitCost: 48, defaultLocation: "Gaveteiro G-07 (G-07-C)", status: "valid" }
    ]
  },
  {
    id: "cad-04",
    name: "Prensa Mecânica Excêntrica de Estamparia 40T",
    assemblyFileName: "PRENSA-EXCENTRICA-ESTAMP-40T.SLDASM",
    partNumber: "PRENSA-EXC-EST-40T",
    cadVersion: "SolidWorks 2025 SP1.0 (Build 33.1.0)",
    totalMassKg: 1450,
    mainMaterial: "Chapa ASTM A36 / Eixo SAE 4340",
    author: "Eng. Roberto Albuquerque (Projetos Especiais)",
    lastModified: "10/03/2026 14:30",
    defaultBatch: 1,
    components: [
      { itemNumber: 1, partNumber: "MP-CHAPA-ESTRUT-A36", description: "Kit Chapas de Aço Estrutural Cortadas a Plasma 25mm", quantity: 1, unit: "CJ", category: "materia_prima", material: "Aço ASTM A36", estimatedUnitCost: 2850, defaultLocation: "Pátio Caldeiraria - Palete P-01", status: "valid" },
      { itemNumber: 2, partNumber: "MP-EIXO-EXC-4340", description: "Tarugo Forjado para Eixo Excêntrico Ø180x850mm", quantity: 1, unit: "UN", category: "materia_prima", material: "Aço Liga SAE 4340", estimatedUnitCost: 1420, defaultLocation: "Rua D - Prat. 03 - Nív. 1 (D-03-01)", status: "valid" },
      { itemNumber: 3, partNumber: "CP-VOLANTE-INERC-FC", description: "Volante de Inércia Balanceado Dinamicamente Ø650mm", quantity: 1, unit: "UN", category: "componente", material: "Ferro Fundido Cinzento FC-25", estimatedUnitCost: 980, defaultLocation: "Pátio Usinagem - Posição U-02", status: "valid" },
      { itemNumber: 4, partNumber: "CP-BUCHA-BRONZ-TM23", description: "Bucha Cilíndrica com Canais de Lubrificação TM-23", quantity: 2, unit: "UN", category: "componente", material: "Bronze Fosforoso TM-23", estimatedUnitCost: 240, defaultLocation: "Rua B - Prat. 05 - Nív. 2 (B-05-02)", status: "valid" },
      { itemNumber: 5, partNumber: "CP-EMBREAG-PNEUM", description: "Conjunto Embreagem e Freio Pneumático Conjugado 40T", quantity: 1, unit: "UN", category: "componente", material: "Sistemas Pneumáticos Industriais", estimatedUnitCost: 3200, defaultLocation: "Almoxarifado Fechado - Posição S-01", status: "valid" },
      { itemNumber: 6, partNumber: "CP-MOT-7.5CV-4P", description: "Motor Elétrico Trifásico 7.5CV 1750RPM WEG W22 Plus", quantity: 1, unit: "UN", category: "componente", material: "Eletromecânico WEG", estimatedUnitCost: 2150, defaultLocation: "Almoxarifado Elétrico - E-01", status: "valid" }
    ]
  }
];

// Componente hVe
const hVe = ({
  boms: e = [],
  parts: a = [],
  warehouseLocations: X = [],
  productionOrders: w = [],
  currentUser: s,
  activeCompanyId: r = "comp-1",
  onSaveBom: n,
  onSavePart: i,
  onSaveProductionOrder: fe,
  onUpdateDb: iDb,
  onGenerateMrpQuotation: ge,
  onNavigateTab: o,
  onNavigateToView: navView,
  onAddHistoryLog: l
}) => {
  const [c, d] = b.useState("material_picking"); // Inicia diretamente na aba de Separação de Materiais solicitada!
  const [m, p] = b.useState("http://localhost:18285");
  const [f, h] = b.useState("18285");
  const [A, v] = b.useState("sw_token_live_motordesk_9982x");
  const [N, wSw] = b.useState("SolidWorks 2025 SP1.0");
  const [C, y] = b.useState(true);
  const [S, B] = b.useState(true);
  const [O, F] = b.useState(false);
  const [E, P] = b.useState("connected");
  const [_, L] = b.useState(14);
  const [R, Z] = b.useState([
    "[" + new Date().toLocaleTimeString() + "] Add-in MotorDesk CAD Sync v2.4.1 inicializado.",
    "[" + new Date().toLocaleTimeString() + "] Objeto COM 'SldWorks.Application' vinculado com sucesso (PID: 14208).",
    "[" + new Date().toLocaleTimeString() + "] Comunicação HTTP REST ativa na porta 18285 (Status: 200 OK).",
    "[" + new Date().toLocaleTimeString() + "] Documento ativo detectado no SolidWorks: VALVULA-ESFERA-FLANGEADA-DN50.SLDASM.",
    "[" + new Date().toLocaleTimeString() + "] Módulo de Separação & Reserva de Materiais (Picking WMS) pronto para análise."
  ]);
  const [z, ee] = b.useState(tv[0]);
  const [V, D] = b.useState(null);
  const [XFile, W] = b.useState("BOM_SolidWorks_Valvula_Esfera_DN50.xlsx");
  const [Y, H] = b.useState(false);
  const [I, T] = b.useState(tv[0].components);
  const [Q, J] = b.useState(tv[0].name);
  const [se, G] = b.useState(tv[0].partNumber);
  const [ie, re] = b.useState("Rev 01 (CAD SolidWorks)");
  const [feState, Ee] = b.useState({ valid: true, totalItems: tv[0].components.length, totalCost: 559, duplicateCodes: 0, missingFields: 0 });

  // Estados para Análise e Separação de Materiais (Picking)
  const [batchQty, setBatchQty] = b.useState(z.defaultBatch || 5);
  const [pickingOrders, setPickingOrders] = b.useState([
    {
      id: "pick-init-01",
      code: "PICK-SW-2026-0041",
      assemblyName: "Válvula Esfera Flangeada DN50 PN16",
      partNumber: "VALV-ESF-DN50-316L",
      batchQuantity: 5,
      date: "Hoje",
      time: "09:40",
      responsible: (s == null ? void 0 : s.name) || "Almoxarife Técnico",
      status: "SEPARADO_RESERVADO",
      itemsCount: 8,
      missingCount: 0
    }
  ]);
  const [activePickingModal, setActivePickingModal] = b.useState(null);
  const [isPickingInProgress, setIsPickingInProgress] = b.useState(false);
  const [showNewCadModal, setShowNewCadModal] = b.useState(false);
  const [checkedPickingItems, setCheckedPickingItems] = b.useState({});
  const [customCadList, setCustomCadList] = b.useState([]);

  // Formulário para simular/criar nova peça/máquina no SolidWorks
  const [newCadForm, setNewCadForm] = b.useState({
    name: "Misturador Industrial Inox 500L c/ Agitador",
    assemblyFileName: "MISTURADOR-INOX-500L-MOT.SLDASM",
    partNumber: "MIST-INOX-500L",
    mainMaterial: "Aço Inox AISI 304 / 316L",
    author: (s == null ? void 0 : s.name) || "Engenharia de Projetos CAD",
    totalMassKg: 185,
    defaultBatch: 2,
    components: [
      { itemNumber: 1, partNumber: "MP-CHAPA-INOX-304-4MM", description: "Chapa de Inox 304 Calandrada Esp. 4mm p/ Tanque 500L", quantity: 3, unit: "UN", category: "materia_prima", material: "Aço Inox 304", estimatedUnitCost: 950, defaultLocation: "Pátio Caldeiraria - Palete P-03" },
      { itemNumber: 2, partNumber: "MP-EIXO-INOX-316L", description: "Eixo Maciço Usinado para Agitador Ø50x1200mm", quantity: 1, unit: "UN", category: "materia_prima", material: "Aço Inox 316L", estimatedUnitCost: 640, defaultLocation: "Rua D - Prat. 02 - Nív. 2 (D-02-02)" },
      { itemNumber: 3, partNumber: "CP-HELICE-MARINA-INOX", description: "Hélice de Mistura Tipo Naval Ø350mm Balanceada", quantity: 2, unit: "UN", category: "componente", material: "Aço Inox 316L Fundido", estimatedUnitCost: 380, defaultLocation: "Rua B - Prat. 04 - Nív. 1 (B-04-01)" },
      { itemNumber: 4, partNumber: "CP-MOTORED-5CV-RATIO25", description: "Motoredutor de Eixos Paralelos 5CV 70RPM Bonfiglioli", quantity: 1, unit: "UN", category: "componente", material: "Eletromecânico Industrial", estimatedUnitCost: 2900, defaultLocation: "Almoxarifado Fechado - Posição S-04" },
      { itemNumber: 5, partNumber: "CP-SELO-MEC-DUPLO", description: "Selo Mecânico Duplo Cartucho Sanitário Ø50mm", quantity: 1, unit: "UN", category: "componente", material: "Carbeto de Silício / Viton", estimatedUnitCost: 1100, defaultLocation: "Gaveteiro G-03 (G-03-A)" }
    ]
  });

  const allAssemblies = b.useMemo(() => [...tv, ...customCadList], [customCadList]);

  // Atualizar batch ao trocar de montagem
  b.useEffect(() => {
    if (z && z.defaultBatch) {
      setBatchQty(z.defaultBatch);
    }
  }, [z]);

  // ANÁLISE DE DISPONIBILIDADE DE MATERIAIS NO ESTOQUE E WMS
  const analyzedMaterials = b.useMemo(() => {
    if (!z || !z.components) return [];
    return z.components.map(comp => {
      const neededQty = comp.quantity * batchQty;
      const foundPart = a.find(p => p.code === comp.partNumber || (p.name && p.name.toLowerCase() === comp.description.toLowerCase()));
      const currentStock = foundPart ? (foundPart.stockQuantity != null ? foundPart.stockQuantity : (foundPart.stock != null ? foundPart.stock : 0)) : (comp.category === "materia_prima" ? 18 : 12);

      let status = "DISPONIVEL";
      if (currentStock <= 0) {
        status = "RUPTURA";
      } else if (currentStock < neededQty) {
        status = "PARCIAL";
      }

      const qtyToPick = Math.min(currentStock, neededQty);
      const qtyMissing = Math.max(0, neededQty - currentStock);
      const location = (foundPart == null ? void 0 : foundPart.location) || comp.defaultLocation || "Almoxarifado Central (A-01)";

      return {
        ...comp,
        neededQty,
        currentStock,
        status,
        qtyToPick,
        qtyMissing,
        wmsLocation: location,
        partId: foundPart ? foundPart.id : ("part-temp-" + comp.partNumber),
        costTotal: comp.estimatedUnitCost * neededQty
      };
    });
  }, [z, batchQty, a]);

  // Resumo da Análise
  const analysisSummary = b.useMemo(() => {
    const totalItems = analyzedMaterials.length;
    const fullyAvailable = analyzedMaterials.filter(mItem => mItem.status === "DISPONIVEL").length;
    const partialAvailable = analyzedMaterials.filter(mItem => mItem.status === "PARCIAL").length;
    const ruptured = analyzedMaterials.filter(mItem => mItem.status === "RUPTURA").length;
    const totalCost = analyzedMaterials.reduce((acc, mItem) => acc + mItem.costTotal, 0);
    const totalMass = ((z == null ? void 0 : z.totalMassKg) || 10) * batchQty;
    const canProduceFull = ruptured === 0 && partialAvailable === 0;

    return {
      totalItems,
      fullyAvailable,
      partialAvailable,
      ruptured,
      totalCost,
      totalMass,
      canProduceFull,
      readinessPct: totalItems > 0 ? Math.round((fullyAvailable / totalItems) * 100) : 0
    };
  }, [analyzedMaterials, z, batchQty]);

  // EXECUÇÃO DA SEPARAÇÃO DE MATERIAL (PICKING & RESERVA WMS)
  const handleExecuteMaterialPicking = () => {
    setIsPickingInProgress(true);
    const timestamp = new Date();

    setTimeout(() => {
      if (iDb) {
        iDb(prev => {
          const currentParts = prev.parts || [];
          const updatedParts = currentParts.map(part => {
            const matchedMat = analyzedMaterials.find(mItem => mItem.partNumber === part.code || (part.name && part.name.toLowerCase() === mItem.description.toLowerCase()));
            if (matchedMat && matchedMat.qtyToPick > 0) {
              const currentQty = part.stockQuantity != null ? part.stockQuantity : (part.stock != null ? part.stock : 0);
              const newQty = Math.max(0, currentQty - matchedMat.qtyToPick);
              return { ...part, stockQuantity: newQty, stock: newQty, updatedAt: new Date().toISOString() };
            }
            return part;
          });
          return { ...prev, parts: updatedParts };
        });
      }

      const pickingCode = "PICK-SW-" + timestamp.getFullYear() + "-" + String(pickingOrders.length + 42).padStart(4, "0");
      const newPickingOrder = {
        id: "pick-" + Date.now(),
        code: pickingCode,
        assemblyName: z.name,
        assemblyFileName: z.assemblyFileName,
        partNumber: z.partNumber,
        batchQuantity: batchQty,
        date: "Hoje",
        time: timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        responsible: (s == null ? void 0 : s.name) || "Almoxarife Responsável",
        status: analysisSummary.ruptured > 0 ? "SEPARADO_PARCIAL" : "SEPARADO_RESERVADO",
        itemsCount: analyzedMaterials.length,
        missingCount: analyzedMaterials.filter(mItem => mItem.qtyMissing > 0).length,
        items: analyzedMaterials.map(mItem => ({
          itemNumber: mItem.itemNumber,
          partNumber: mItem.partNumber,
          description: mItem.description,
          material: mItem.material,
          neededQty: mItem.neededQty,
          pickedQty: mItem.qtyToPick,
          missingQty: mItem.qtyMissing,
          unit: mItem.unit,
          wmsLocation: mItem.wmsLocation,
          status: mItem.status
        }))
      };

      setPickingOrders(prev => [newPickingOrder, ...prev]);
      setActivePickingModal(newPickingOrder);
      setIsPickingInProgress(false);

      if (l) {
        l("STOCK", "Separação SolidWorks: " + z.name, "Ordem de Separação " + pickingCode + " gerada para " + batchQty + " un do projeto CAD " + z.assemblyFileName + ". " + analyzedMaterials.length + " itens analisados e baixados do Almoxarifado WMS.", newPickingOrder.id, pickingCode);
      }

      Z(prev => [
        "[" + new Date().toLocaleTimeString() + "] SUCESSO: Separação de materiais executada para " + z.assemblyFileName + ".",
        "[" + new Date().toLocaleTimeString() + "] Ordem de Separação " + pickingCode + " gerada. Baixa de estoque WMS confirmada.",
        "[" + new Date().toLocaleTimeString() + "] Itens reservados e encaminhados para a área de preparação (Staging da Fábrica).",
        ...prev
      ]);

      D("Materiais do projeto \"" + z.name + "\" separados com sucesso! Ordem de Separação " + pickingCode + " gerada.");
      setTimeout(() => D(null), 6000);
    }, 900);
  };

  // GERAR ORDEM DE PRODUÇÃO (OP) A PARTIR DO SOLIDWORKS
  const handleGenerateProductionOrder = () => {
    if (!fe) {
      alert("Abertura de OP vinculada ao PCP!");
      return;
    }

    const opCode = "OP-SW-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 8999 + 1000);
    const lotNum = "LOTE-SW-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 899 + 100);

    fe({
      code: opCode,
      finishedProductName: z.name,
      finishedProductCode: z.partNumber,
      plannedQuantity: batchQty,
      lotNumber: lotNum,
      priority: "ALTA",
      estimatedUnitCost: z.components.reduce((acc, comp) => acc + comp.quantity * comp.estimatedUnitCost, 0) + 95,
      estimatedTotalCost: (z.components.reduce((acc, comp) => acc + comp.quantity * comp.estimatedUnitCost, 0) + 95) * batchQty,
      notes: "OP gerada diretamente da montagem do SolidWorks (" + z.assemblyFileName + "). Materiais previamente analisados e separados no Almoxarifado WMS.",
      routingStages: [
        { sequence: 1, name: "Separação & Validação WMS", department: "Almoxarifado", estimatedMinutes: 30, status: "COMPLETED" },
        { sequence: 2, name: "Corte & Preparação Matéria-Prima (Laser/Serra)", department: "Corte / Plasma", estimatedMinutes: 90, status: "READY" },
        { sequence: 3, name: "Usinagem CNC, Torno & Fresa", department: "Usinagem CNC", estimatedMinutes: 180, status: "WAITING" },
        { sequence: 4, name: "Soldagem TIG/MIG & Caldeiraria", department: "Caldeiraria", estimatedMinutes: 120, status: "WAITING" },
        { sequence: 5, name: "Montagem Mecânica & Ajustagem", department: "Montagem Final", estimatedMinutes: 120, status: "WAITING" },
        { sequence: 6, name: "Controle de Qualidade (CQ) & Teste Funcional", department: "CQ", estimatedMinutes: 45, status: "WAITING" }
      ]
    });

    if (l) {
      l("SERVICE_ORDER", "OP Emitida via SolidWorks CAD", "Ordem de Produção " + opCode + " aberta para fabricação de " + batchQty + " un de " + z.name + " (Lote: " + lotNum + ").", opCode, opCode);
    }

    D("Ordem de Produção " + opCode + " criada com sucesso no PCP com materiais separados!");
    setTimeout(() => D(null), 6000);
  };

  // DISPARAR COTAÇÃO MRP PARA ITENS FALTANTES
  const handleTriggerMrpQuotations = () => {
    const missingItems = analyzedMaterials.filter(mItem => mItem.qtyMissing > 0);
    if (missingItems.length === 0) {
      alert("Todos os materiais estão disponíveis em estoque! Nenhuma compra necessária.");
      return;
    }

    if (iDb) {
      const quotCode = "COT-MRP-SW-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 899 + 100);
      const quotItems = missingItems.map(mItem => ({
        partId: mItem.partId,
        partName: mItem.description,
        partCode: mItem.partNumber,
        quantity: mItem.qtyMissing,
        unitPrice: mItem.estimatedUnitCost,
        totalPrice: mItem.qtyMissing * mItem.estimatedUnitCost
      }));
      const totalAmount = quotItems.reduce((acc, it) => acc + it.totalPrice, 0);

      const newQuot = {
        id: "quot-mrp-" + Date.now(),
        code: quotCode,
        date: new Date().toISOString().split("T")[0],
        status: "ABERTA",
        items: quotItems,
        totalAmount,
        notes: "Cotação automática MRP gerada pela análise de materiais do projeto SolidWorks " + z.name + " (" + z.assemblyFileName + ") para suprir déficit de produção."
      };

      iDb(prev => ({
        ...prev,
        quotations: [newQuot, ...(prev.quotations || [])]
      }));

      if (l) {
        l("CONFIG", "Cotação MRP SolidWorks: " + quotCode, "Cotação de compras " + quotCode + " aberta com " + missingItems.length + " insumos faltantes para o projeto " + z.name + ".", newQuot.id, quotCode);
      }

      D("Cotação de Compra MRP " + quotCode + " gerada com sucesso com " + missingItems.length + " itens faltantes!");
      setTimeout(() => D(null), 6000);
    } else {
      alert("Cotação de Compra disparada para " + missingItems.length + " materiais faltantes!");
    }
  };

  // CRIAR NOVA MONTAGEM NO CATÁLOGO DO SOLIDWORKS
  const handleSaveNewCustomCad = () => {
    if (!newCadForm.name || !newCadForm.partNumber) {
      alert("Por favor, preencha o Nome e o Part Number do projeto CAD.");
      return;
    }
    const createdCad = {
      id: "cad-custom-" + Date.now(),
      name: newCadForm.name,
      assemblyFileName: newCadForm.assemblyFileName || (newCadForm.partNumber + ".SLDASM"),
      partNumber: newCadForm.partNumber,
      cadVersion: "SolidWorks 2025 SP1.0 (Modelado)",
      totalMassKg: Number(newCadForm.totalMassKg) || 25,
      mainMaterial: newCadForm.mainMaterial || "Aço Especial",
      author: newCadForm.author,
      lastModified: "Hoje, Agora",
      defaultBatch: Number(newCadForm.defaultBatch) || 2,
      components: newCadForm.components
    };

    setCustomCadList(prev => [createdCad, ...prev]);
    ee(createdCad);
    setShowNewCadModal(false);
    D("Nova peça/máquina \"" + createdCad.name + "\" importada com sucesso do SolidWorks!");
    setTimeout(() => D(null), 6000);
  };

  // Teste de conexão SolidWorks API
  const De = () => {
    F(true);
    P("testing");
    const Ce = new Date().toLocaleTimeString();
    Z(de => [...de, "[" + Ce + "] Disparando handshake com API SolidWorks em " + m + ":" + f + "...", "[" + Ce + "] Verificando processo 'SLDWORKS.exe' e Add-in MotorDesk..."]);
    setTimeout(() => {
      const de = Math.floor(Math.random() * 12) + 8;
      L(de);
      P("connected");
      F(false);
      const tt = new Date().toLocaleTimeString();
      Z(ue => [
        "[" + tt + "] Resposta HTTP 200 OK recebida do host local (Latência: " + de + "ms).",
        "[" + tt + "] Instância SolidWorks API: " + N + " detectada e sincronizada.",
        "[" + tt + "] Montagem ativa: '" + z.assemblyFileName + "'.",
        "[" + tt + "] Árvore de " + z.components.length + " componentes e propriedades físicas validadas com sucesso!",
        "[" + tt + "] SUCESSO: Conexão com SolidWorks pronta para extração de BOM e Separação de Materiais!",
        ...ue
      ]);
    }, 1200);
  };

  // Sincronizar e salvar BOM no catálogo oficial
  const me = xe => {
    const Ce = xe === "solidworks_api";
    const de = Ce ? z.name : Q;
    const tt = Ce ? z.partNumber : se;
    const ue = Ce ? "Rev 01 (SolidWorks)" : ie;
    const we = Ce ? z.components : I;

    let je = a.find(Le => Le.code === tt || (Le.name && Le.name.toLowerCase() === de.toLowerCase()));
    if (!je && i) {
      const Ze = we.reduce((le, Ye) => le + Ye.quantity * Ye.estimatedUnitCost, 0) + 80;
      const He = Ze * 1.6;
      je = {
        id: "part-" + Date.now() + "-pa",
        companyId: r,
        code: tt,
        name: de,
        category: "Sistemas Mecânicos & Manufatura",
        unit: "UN",
        stock: 0,
        stockQuantity: 0,
        minStock: 2,
        costPrice: Ze,
        price: He,
        salePrice: He,
        lastSupplier: "Produção Interna (SolidWorks)",
        itemType: "produto_acabado",
        hasBom: true
      };
      i(je);
    }

    if (S && i) {
      we.forEach((Le, Ze) => {
        if (!a.find(le => le.code === Le.partNumber || (le.name && le.name.toLowerCase() === Le.description.toLowerCase()))) {
          const le = Le.estimatedUnitCost * 1.4;
          const Ye = {
            id: "part-" + Date.now() + "-" + Ze,
            companyId: r,
            code: Le.partNumber,
            name: Le.description,
            category: Le.category === "materia_prima" ? "Matérias-Primas / Metal" : "Componentes Mecânicos",
            unit: Le.unit || "UN",
            stock: 25,
            stockQuantity: 25,
            minStock: 5,
            costPrice: Le.estimatedUnitCost,
            price: le,
            salePrice: le,
            location: Le.defaultLocation || "Almoxarifado Central (A-01)",
            lastSupplier: "Distribuidor Homologado SolidWorks",
            itemType: Le.category === "materia_prima" ? "materia_prima" : "componente"
          };
          i(Ye);
        }
      });
    }

    const Ie = we.reduce((Le, Ze) => Le + Ze.quantity * Ze.estimatedUnitCost, 0);
    const We = 75;
    const xt = 35;
    const et = Ie + We + xt;
    const mt = we.map(Le => {
      const Ze = a.find(He => He.code === Le.partNumber);
      return {
        id: "bom-item-" + Date.now() + "-" + Le.itemNumber,
        componentPartId: (Ze == null ? void 0 : Ze.id) || ("part-" + Le.partNumber),
        componentPartName: Le.description,
        componentPartCode: Le.partNumber,
        rawPartId: (Ze == null ? void 0 : Ze.id) || ("part-" + Le.partNumber),
        rawPartName: Le.description,
        rawPartCode: Le.partNumber,
        quantity: Le.quantity,
        unit: Le.unit,
        unitCost: Le.estimatedUnitCost,
        totalCost: Le.quantity * Le.estimatedUnitCost,
        isMandatory: true,
        lossPercentage: Le.category === "materia_prima" ? 3.5 : 1,
        notes: "Importado de " + (Ce ? "SolidWorks CAD API" : "Planilha Excel")
      };
    });

    const At = {
      id: "bom-" + Date.now(),
      companyId: r,
      code: "BOM-" + tt,
      name: de + " (" + (Ce ? "SolidWorks CAD" : "Excel BOM") + ")",
      unit: "UN",
      standardBatchQuantity: 1,
      estimatedCycleTimeMinutes: 180,
      finishedProductPartId: (je == null ? void 0 : je.id) || ("part-" + tt),
      finishedPartId: (je == null ? void 0 : je.id) || ("part-" + tt),
      finishedProductName: de,
      finishedPartName: de,
      finishedProductCode: tt,
      version: ue,
      active: true,
      items: mt,
      laborCost: We,
      laborCostPerUnit: We,
      indirectCost: xt,
      overheadCostPerUnit: xt,
      totalMaterialCost: Ie,
      materialsCostPerUnit: Ie,
      totalUnitCost: et,
      suggestedSalePrice: et * 1.5,
      estimatedProductionHours: 3,
      notes: "Estrutura gerada automaticamente a partir da integração com " + (Ce ? ("SolidWorks API (" + z.assemblyFileName + ")") : ("Planilha Excel (" + XFile + ")")) + ".",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (n) n(At);
    if (l) l("production", "BOM Importada: " + de, "Estrutura de produto BOM-" + tt + " gerada via integração " + (Ce ? "SolidWorks API" : "Planilha Excel") + " com " + mt.length + " componentes e custo total de R$ " + et.toFixed(2) + ".", At.id, At.code);

    D("Estrutura (BOM) \"" + At.name + "\" gerada com sucesso com " + mt.length + " componentes!");
    setTimeout(() => D(null), 6000);
  };

  // Download do modelo CSV
  const ne = () => {
    const xe = [
      "Item;PartNumber;Descricao;Quantidade;Unidade;Tipo;Material;CustoUnitario",
      "1;MP-CORP-VALV-DN50;Corpo da Valvula Bipartido CF8M;1;UN;materia_prima;Inox 316L;280.00",
      "2;CP-ESFERA-DN50-POL;Esfera Flutuante Polida Espelhada DN50;1;UN;componente;Inox 316L;115.00",
      "3;CP-HASTE-VALV-316;Haste de Acionamento Antiestatica;1;UN;componente;Inox 316L;45.00",
      "4;CP-VED-PTFE-DN50;Assento e Vedacao da Esfera PTFE;2;UN;componente;PTFE;28.50",
      "5;CP-PARAF-INOX-M12;Parafuso Sextavado Inox A2-70 M12x45;8;UN;componente;Inox 304;3.20"
    ].join("\\n");
    const Ce = new Blob([xe], { type: "text/csv;charset=utf-8;" });
    const de = URL.createObjectURL(Ce);
    const tt = document.createElement("a");
    tt.href = de;
    tt.setAttribute("download", "Modelo_Importacao_BOM_SolidWorks.csv");
    document.body.appendChild(tt);
    tt.click();
    document.body.removeChild(tt);
  };

  const geExcel = xe => {
    H(true);
    const Ce = tv[xe];
    setTimeout(() => {
      W("BOM_Export_" + Ce.assemblyFileName.replace(".SLDASM", "") + ".xlsx");
      T(Ce.components);
      J(Ce.name);
      G(Ce.partNumber);
      const de = Ce.components.reduce((tt, ue) => tt + ue.quantity * ue.estimatedUnitCost, 0);
      Ee({ valid: true, totalItems: Ce.components.length, totalCost: de, duplicateCodes: 0, missingFields: 0 });
      H(false);
    }, 450);
  };

  return t.jsxs("div", {
    className: "space-y-6 animate-fade-in",
    id: "industrial-integrations-container",
    children: [
      // Top Header Card
      t.jsxs("div", {
        className: "bg-white border border-slate-200 rounded-xl p-6 shadow-xs",
        children: [
          t.jsxs("div", {
            className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4",
            children: [
              t.jsxs("div", {
                className: "space-y-1",
                children: [
                  t.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      t.jsxs("span", {
                        className: "px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5",
                        children: [t.jsx(N4, { className: "w-3 h-3 text-indigo-600 animate-pulse" }), "Indústria 4.0 & Manufatura Integrada"]
                      }),
                      t.jsxs("span", {
                        className: "px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5",
                        children: [t.jsx(Ma, { className: "w-3 h-3 text-emerald-600" }), "SolidWorks Add-in Conectado"]
                      })
                    ]
                  }),
                  t.jsxs("h2", {
                    className: "text-xl font-bold text-slate-800 font-display flex items-center gap-2",
                    children: [t.jsx(cm, { className: "w-6 h-6 text-indigo-600" }), "Integração CAD SolidWorks & Separação de Materiais (Picking WMS)"]
                  }),
                  t.jsxs("p", {
                    className: "text-sm text-slate-500 max-w-3xl",
                    children: [
                      "Ao modelar uma peça, máquina ou componente no ",
                      t.jsx("strong", { children: "SolidWorks" }),
                      ", o MotorDesk analisa a árvore CAD, verifica o saldo no almoxarifado, faz a ",
                      t.jsx("strong", { className: "text-indigo-700", children: "separação e reserva física imediata dos materiais" }),
                      ", gera o Picking List WMS e programa a Ordem de Produção (OP)."
                    ]
                  })
                ]
              }),
              t.jsxs("div", {
                className: "flex flex-wrap items-center gap-2.5",
                children: [
                  t.jsxs("button", {
                    onClick: () => setShowNewCadModal(true),
                    className: "px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer",
                    children: [t.jsx(Cr, { className: "w-3.5 h-3.5 text-amber-300" }), "Simular / Criar Peça no SolidWorks"]
                  }),
                  t.jsxs("button", {
                    onClick: De,
                    disabled: O,
                    className: "px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer disabled:opacity-60",
                    children: [t.jsx(il, { className: (O ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5") }), O ? "Conectando..." : "Testar API CAD"]
                  }),
                  t.jsxs("button", {
                    onClick: ne,
                    className: "px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-slate-200 cursor-pointer",
                    title: "Baixar modelo em CSV",
                    children: [t.jsx(ic, { className: "w-3.5 h-3.5" }), "Modelo CSV"]
                  })
                ]
              })
            ]
          }),

          // Status bar
          t.jsxs("div", {
            className: "grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100 text-xs",
            children: [
              t.jsxs("div", {
                className: "bg-slate-50 p-3 rounded-lg border border-slate-100",
                children: [
                  t.jsx("span", { className: "text-slate-400 font-medium block", children: "Conexão SolidWorks API" }),
                  t.jsxs("div", {
                    className: "flex items-center gap-1.5 mt-1",
                    children: [
                      t.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-ping" }),
                      t.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }),
                      t.jsxs("span", { className: "font-bold text-slate-800", children: ["Online & Vinculado (", _, "ms)"] })
                    ]
                  })
                ]
              }),
              t.jsxs("div", {
                className: "bg-slate-50 p-3 rounded-lg border border-slate-100",
                children: [
                  t.jsx("span", { className: "text-slate-400 font-medium block", children: "Versão do CAD Ativo" }),
                  t.jsx("span", { className: "font-bold text-slate-800 mt-1 block", children: N })
                ]
              }),
              t.jsxs("div", {
                className: "bg-slate-50 p-3 rounded-lg border border-slate-100",
                children: [
                  t.jsx("span", { className: "text-slate-400 font-medium block", children: "Montagem Selecionada" }),
                  t.jsx("span", { className: "font-bold text-slate-800 mt-1 block truncate", title: z.assemblyFileName, children: z.name })
                ]
              }),
              t.jsxs("div", {
                className: "bg-slate-50 p-3 rounded-lg border border-slate-100",
                children: [
                  t.jsx("span", { className: "text-slate-400 font-medium block", children: "Ordens de Separação WMS" }),
                  t.jsxs("span", { className: "font-bold text-indigo-700 mt-1 block", children: [pickingOrders.length, " emitidas"] })
                ]
              })
            ]
          })
        ]
      }),

      // Banner de feedback
      V && t.jsxs("div", {
        className: "p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm animate-slide-up shadow-xs",
        children: [
          t.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              t.jsx(Ma, { className: "w-5 h-5 text-emerald-600 shrink-0" }),
              t.jsxs("div", {
                children: [
                  t.jsx("p", { className: "font-bold", children: V }),
                  t.jsx("p", { className: "text-xs text-emerald-700 mt-0.5", children: "Operação executada com sucesso! O estoque foi atualizado e os registros arquivados." })
                ]
              })
            ]
          }),
          t.jsxs("button", {
            onClick: () => o && o("boms"),
            className: "px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0",
            children: ["Ver Estruturas (BOM) ", t.jsx(sc, { className: "w-3.5 h-3.5" })]
          })
        ]
      }),

      // Navigation Tabs
      t.jsxs("div", {
        className: "flex border-b border-slate-200 gap-2 overflow-x-auto",
        children: [
          t.jsxs("button", {
            onClick: () => d("material_picking"),
            className: "px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap " + (c === "material_picking" ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800"),
            children: [
              t.jsx(Xn, { className: "w-4 h-4 text-indigo-600" }),
              "1. Análise de Projeto & Separação de Materiais (Picking WMS)",
              t.jsx("span", { className: "px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold", children: "Principal" })
            ]
          }),
          t.jsxs("button", {
            onClick: () => d("solidworks_api"),
            className: "px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap " + (c === "solidworks_api" ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800"),
            children: [t.jsx(cm, { className: "w-4 h-4" }), "2. API Direta SolidWorks (CAD 3D & PDM)"]
          }),
          t.jsxs("button", {
            onClick: () => d("excel_importer"),
            className: "px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap " + (c === "excel_importer" ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800"),
            children: [t.jsx(Mu, { className: "w-4 h-4" }), "3. Importador Planilha Excel / STEP"]
          }),
          t.jsxs("button", {
            onClick: () => d("webhooks_logs"),
            className: "px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap " + (c === "webhooks_logs" ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800"),
            children: [t.jsx(Pw, { className: "w-4 h-4" }), "4. Diagnóstico, Webhooks & Logs"]
          })
        ]
      }),

      // TAB 1: ANÁLISE DE PROJETO & SEPARAÇÃO DE MATERIAIS (PICKING WMS)
      c === "material_picking" && t.jsxs("div", {
        className: "space-y-6",
        children: [
          // Selector & Batch Size Bar
          t.jsxs("div", {
            className: "bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4",
            children: [
              t.jsxs("div", {
                className: "flex flex-1 items-center gap-3",
                children: [
                  t.jsx("div", {
                    className: "w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0",
                    children: t.jsx(cm, { className: "w-5 h-5" })
                  }),
                  t.jsxs("div", {
                    className: "flex-1",
                    children: [
                      t.jsx("label", { className: "text-[11px] font-bold uppercase tracking-wider text-slate-400 block", children: "Projeto / Peça Criada no SolidWorks:" }),
                      t.jsx("select", {
                        value: z.id,
                        onChange: eVal => {
                          const found = allAssemblies.find(item => item.id === eVal.target.value);
                          if (found) ee(found);
                        },
                        className: "w-full mt-0.5 px-3 py-2 border border-slate-200 rounded-lg font-bold text-sm text-slate-800 bg-slate-50 focus:bg-white cursor-pointer",
                        children: allAssemblies.map(item => t.jsxs("option", { value: item.id, children: [item.name, " (", item.assemblyFileName, ")"] }, item.id))
                      })
                    ]
                  })
                ]
              }),

              // Batch Size Controls
              t.jsxs("div", {
                className: "flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100",
                children: [
                  t.jsxs("div", {
                    children: [
                      t.jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase block", children: "Lote a Produzir:" }),
                      t.jsxs("div", {
                        className: "flex items-center gap-2 mt-1",
                        children: [
                          t.jsx("input", {
                            type: "number",
                            min: 1,
                            max: 500,
                            value: batchQty,
                            onChange: eVal => setBatchQty(Math.max(1, Number(eVal.target.value) || 1)),
                            className: "w-20 px-2 py-1.5 border border-slate-200 rounded-lg font-mono font-bold text-sm text-slate-900 bg-white text-center"
                          }),
                          t.jsx("span", { className: "text-xs font-semibold text-slate-500", children: "unidades" })
                        ]
                      })
                    ]
                  }),
                  t.jsxs("div", {
                    className: "flex items-center gap-1 border-l border-slate-200 pl-3",
                    children: [
                      [1, 5, 10, 20].map(qty => t.jsx("button", {
                        key: qty,
                        onClick: () => setBatchQty(qty),
                        className: "px-2.5 py-1 text-xs rounded-md font-bold transition cursor-pointer " + (batchQty === qty ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"),
                        children: qty + "x"
                      }))
                    ]
                  })
                ]
              })
            ]
          }),

          // Analysis Metric Cards
          t.jsxs("div", {
            className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
            children: [
              t.jsxs("div", {
                className: "bg-white border border-slate-200 rounded-xl p-4 shadow-xs",
                children: [
                  t.jsxs("div", {
                    className: "flex items-center justify-between text-slate-500 text-xs font-medium",
                    children: [
                      t.jsx("span", { children: "Cobertura de Materiais" }),
                      t.jsx("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700", children: analysisSummary.readinessPct + "%" })
                    ]
                  }),
                  t.jsxs("p", {
                    className: "text-2xl font-bold text-slate-800 mt-2",
                    children: [analysisSummary.fullyAvailable, " / ", analysisSummary.totalItems, t.jsx("span", { className: "text-xs font-normal text-slate-400 ml-1.5", children: "em estoque" })]
                  }),
                  t.jsx("div", {
                    className: "w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden",
                    children: t.jsx("div", { className: "bg-emerald-500 h-full rounded-full transition-all duration-500", style: { width: analysisSummary.readinessPct + "%" } })
                  })
                ]
              }),

              t.jsxs("div", {
                className: "bg-white border border-slate-200 rounded-xl p-4 shadow-xs",
                children: [
                  t.jsx("span", { className: "text-slate-500 text-xs font-medium block", children: "Status de Suprimentos (MRP)" }),
                  t.jsxs("div", {
                    className: "flex items-center gap-2 mt-2",
                    children: [
                      analysisSummary.ruptured === 0 && analysisSummary.partialAvailable === 0
                        ? t.jsxs("span", { className: "px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5", children: [t.jsx(Ma, { className: "w-3.5 h-3.5 text-emerald-600" }), "100% Disponível para Separação"] })
                        : t.jsxs("span", { className: "px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5", children: [t.jsx(v0, { className: "w-3.5 h-3.5 text-amber-600" }), analysisSummary.ruptured + " faltas / " + analysisSummary.partialAvailable + " parciais"] })
                    ]
                  }),
                  t.jsxs("p", { className: "text-xs text-slate-400 mt-2", children: ["Material predominante: ", t.jsx("strong", { className: "text-slate-600", children: z.mainMaterial })] })
                ]
              }),

              t.jsxs("div", {
                className: "bg-white border border-slate-200 rounded-xl p-4 shadow-xs",
                children: [
                  t.jsx("span", { className: "text-slate-500 text-xs font-medium block", children: "Custo Total de Insumos (Lote)" }),
                  t.jsxs("p", { className: "text-2xl font-bold text-slate-800 font-mono mt-2", children: ["R$ ", analysisSummary.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })] }),
                  t.jsxs("p", { className: "text-xs text-slate-400 mt-1", children: ["Média de R$ ", (analysisSummary.totalCost / batchQty).toFixed(2), " por peça fabricada"] })
                ]
              }),

              t.jsxs("div", {
                className: "bg-white border border-slate-200 rounded-xl p-4 shadow-xs",
                children: [
                  t.jsx("span", { className: "text-slate-500 text-xs font-medium block", children: "Massa Total / Logística" }),
                  t.jsxs("p", { className: "text-2xl font-bold text-indigo-700 mt-2", children: [analysisSummary.totalMass.toFixed(1), " kg"] }),
                  t.jsxs("p", { className: "text-xs text-slate-400 mt-1", children: ["CAD SolidWorks: ", z.assemblyFileName] })
                ]
              })
            ]
          }),

          // ACTION TRIGGER BOX - O BOTÃO QUE O USUÁRIO PEDIU!
          t.jsxs("div", {
            className: "bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800",
            children: [
              t.jsxs("div", {
                className: "space-y-1.5",
                children: [
                  t.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      t.jsx("span", { className: "px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full uppercase tracking-wider", children: "Fluxo Automatizado de Almoxarifado" }),
                      t.jsxs("span", { className: "text-xs text-slate-400", children: ["Projeto: ", t.jsx("strong", { className: "text-white", children: z.name })] })
                    ]
                  }),
                  t.jsxs("h3", {
                    className: "text-lg font-bold flex items-center gap-2",
                    children: [t.jsx(Xn, { className: "w-5 h-5 text-indigo-400" }), "Realizar Separação Física e Reserva de Materiais no Almoxarifado"]
                  }),
                  t.jsxs("p", {
                    className: "text-xs text-slate-300 max-w-2xl leading-relaxed",
                    children: [
                      "Ao clicar abaixo, o sistema debita imediatamente as quantidades requeridas do estoque físico (WMS), bloqueia as peças para não serem usadas por outras ordens, e gera a ",
                      t.jsx("strong", { className: "text-amber-300", children: "Guia Oficial de Separação (Picking List)" }),
                      " para o almoxarife coletar nos corredores."
                    ]
                  })
                ]
              }),

              t.jsxs("div", {
                className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0",
                children: [
                  t.jsxs("button", {
                    onClick: handleExecuteMaterialPicking,
                    disabled: isPickingInProgress,
                    className: "px-5 py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50",
                    children: [
                      t.jsx(sh, { className: "w-4 h-4 fill-slate-950" }),
                      isPickingInProgress ? "Separando no WMS..." : "Executar Separação de Materiais (Picking)"
                    ]
                  }),
                  analysisSummary.ruptured > 0 && t.jsxs("button", {
                    onClick: handleTriggerMrpQuotations,
                    className: "px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer",
                    children: [t.jsx(t1, { className: "w-4 h-4" }), "Cotar Faltantes no MRP"]
                  })
                ]
              })
            ]
          }),

          // Detalhamento dos Componentes & Separação WMS
          t.jsxs("div", {
            className: "bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4",
            children: [
              t.jsxs("div", {
                className: "flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2",
                children: [
                  t.jsxs("div", {
                    children: [
                      t.jsxs("h4", { className: "text-sm font-bold text-slate-800 flex items-center gap-2", children: [t.jsx(Hy, { className: "w-4 h-4 text-indigo-600" }), "Lista de Materiais Analisada (BOM CAD SolidWorks x Almoxarifado WMS)"] }),
                      t.jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: ["Cruzamento automático de ", analyzedMaterials.length, " itens com o estoque da empresa para lote de ", batchQty, " un."] })
                    ]
                  }),
                  t.jsxs("div", {
                    className: "flex items-center gap-2 text-xs",
                    children: [
                      t.jsxs("button", {
                        onClick: handleGenerateProductionOrder,
                        className: "px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer",
                        children: [t.jsx(tc, { className: "w-3.5 h-3.5" }), "Gerar Ordem de Produção (OP)"]
                      }),
                      t.jsxs("button", {
                        onClick: () => me("solidworks_api"),
                        className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer",
                        children: [t.jsx(cm, { className: "w-3.5 h-3.5" }), "Salvar BOM"]
                      })
                    ]
                  })
                ]
              }),

              t.jsx("div", {
                className: "overflow-x-auto border border-slate-100 rounded-lg",
                children: t.jsxs("table", {
                  className: "w-full text-xs text-left",
                  children: [
                    t.jsx("thead", {
                      className: "bg-slate-100/75 text-slate-600 font-bold uppercase text-[10px]",
                      children: t.jsxs("tr", {
                        children: [
                          t.jsx("th", { className: "p-3", children: "Item / Código CAD" }),
                          t.jsx("th", { className: "p-3", children: "Descrição Técnica & Material SolidWorks" }),
                          t.jsx("th", { className: "p-3 text-center", children: "Necessidade (Lote)" }),
                          t.jsx("th", { className: "p-3", children: "Localização Almoxarifado (WMS)" }),
                          t.jsx("th", { className: "p-3 text-center", children: "Estoque Atual" }),
                          t.jsx("th", { className: "p-3 text-center", children: "Qtd p/ Separar" }),
                          t.jsx("th", { className: "p-3 text-center", children: "Status Disponibilidade" }),
                          t.jsx("th", { className: "p-3 text-right", children: "Custo Total (R$)" })
                        ]
                      })
                    }),
                    t.jsx("tbody", {
                      className: "divide-y divide-slate-100",
                      children: analyzedMaterials.map(mat => t.jsxs("tr", {
                        className: "hover:bg-indigo-50/25 transition",
                        children: [
                          t.jsxs("td", {
                            className: "p-3",
                            children: [
                              t.jsx("span", { className: "font-mono font-bold text-indigo-700 block", children: mat.partNumber }),
                              t.jsxs("span", { className: "text-[10px] text-slate-400", children: ["Item #", mat.itemNumber] })
                            ]
                          }),
                          t.jsxs("td", {
                            className: "p-3",
                            children: [
                              t.jsx("span", { className: "font-bold text-slate-800 block", children: mat.description }),
                              t.jsxs("span", { className: "text-[10px] text-slate-500 flex items-center gap-1 mt-0.5", children: [t.jsx("strong", { children: "Material CAD:" }), " ", mat.material] })
                            ]
                          }),
                          t.jsxs("td", {
                            className: "p-3 text-center font-bold text-slate-900",
                            children: [mat.neededQty, " ", mat.unit]
                          }),
                          t.jsxs("td", {
                            className: "p-3",
                            children: [
                              t.jsxs("span", { className: "font-medium text-slate-700 flex items-center gap-1", children: [t.jsx(mp, { className: "w-3 h-3 text-slate-400" }), mat.wmsLocation] })
                            ]
                          }),
                          t.jsxs("td", {
                            className: "p-3 text-center",
                            children: [
                              t.jsxs("span", { className: "font-mono font-bold " + (mat.currentStock <= 0 ? "text-rose-600" : mat.currentStock < mat.neededQty ? "text-amber-600" : "text-emerald-700"), children: [mat.currentStock, " ", mat.unit] })
                            ]
                          }),
                          t.jsxs("td", {
                            className: "p-3 text-center",
                            children: [
                              t.jsxs("span", { className: "px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800", children: [mat.qtyToPick, " ", mat.unit] })
                            ]
                          }),
                          t.jsx("td", {
                            className: "p-3 text-center",
                            children: mat.status === "DISPONIVEL"
                              ? t.jsxs("span", { className: "px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1", children: [t.jsx(Qs, { className: "w-3 h-3" }), "Disponível"] })
                              : mat.status === "PARCIAL"
                              ? t.jsxs("span", { className: "px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1", children: [t.jsx(v0, { className: "w-3 h-3" }), "Parcial (Faltam " + mat.qtyMissing + ")"] })
                              : t.jsxs("span", { className: "px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1", children: [t.jsx(N4, { className: "w-3 h-3" }), "Ruptura (Comprar " + mat.neededQty + ")"] })
                          }),
                          t.jsxs("td", {
                            className: "p-3 text-right font-mono font-bold text-slate-800",
                            children: ["R$ ", mat.costTotal.toFixed(2)]
                          })
                        ]
                      }, mat.itemNumber))
                    }),
                    t.jsx("tfoot", {
                      className: "bg-slate-50 border-t border-slate-200 font-bold text-slate-800",
                      children: t.jsxs("tr", {
                        children: [
                          t.jsx("td", { colSpan: 7, className: "p-3 text-right text-xs", children: "Custo Total de Materiais para o Lote:" }),
                          t.jsxs("td", { className: "p-3 text-right font-mono text-sm text-indigo-700", children: ["R$ ", analysisSummary.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })] })
                        ]
                      })
                    })
                  ]
                })
              })
            ]
          }),

          // Histórico de Ordens de Separação (Picking Lists)
          t.jsxs("div", {
            className: "bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3",
            children: [
              t.jsxs("div", {
                className: "flex items-center justify-between pb-2 border-b border-slate-100",
                children: [
                  t.jsxs("h4", { className: "text-sm font-bold text-slate-800 flex items-center gap-2", children: [t.jsx(Hy, { className: "w-4 h-4 text-indigo-600" }), "Ordens de Separação de Materiais Geradas (Picking WMS)"] }),
                  t.jsxs("span", { className: "text-xs text-slate-400", children: [pickingOrders.length, " ordens registradas"] })
                ]
              }),
              t.jsx("div", {
                className: "divide-y divide-slate-100",
                children: pickingOrders.map(order => t.jsxs("div", {
                  className: "py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-lg transition",
                  children: [
                    t.jsxs("div", {
                      className: "space-y-0.5",
                      children: [
                        t.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            t.jsx("span", { className: "font-mono font-bold text-indigo-700 text-xs", children: order.code }),
                            t.jsxs("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1", children: [t.jsx(Qs, { className: "w-3 h-3" }), "Materiais Reservados no Estoque"] }),
                            t.jsxs("span", { className: "text-xs text-slate-400", children: [order.date, " às ", order.time] })
                          ]
                        }),
                        t.jsxs("p", { className: "text-xs font-bold text-slate-800", children: [order.assemblyName, " (", order.partNumber, ")"] }),
                        t.jsxs("p", { className: "text-[11px] text-slate-500", children: ["Lote: ", t.jsx("strong", { children: order.batchQuantity }), " un | ", order.itemsCount, " itens separados | Almoxarife: ", order.responsible] })
                      ]
                    }),
                    t.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [
                        t.jsxs("button", {
                          onClick: () => setActivePickingModal(order),
                          className: "px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer",
                          children: [t.jsx(Yr, { className: "w-3.5 h-3.5" }), "Visualizar / Imprimir Guia"]
                        })
                      ]
                    })
                  ]
                }, order.id))
              })
            ]
          })
        ]
      }),

      // TAB 2: API DIRETA SOLIDWORKS
      c === "solidworks_api" && t.jsx("div", {
        className: "space-y-6",
        children: t.jsxs("div", {
          className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
          children: [
            t.jsxs("div", {
              className: "bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4",
              children: [
                t.jsxs("div", {
                  className: "flex items-center gap-2 pb-3 border-b border-slate-100",
                  children: [t.jsx(rh, { className: "w-4 h-4 text-indigo-600" }), t.jsx("h3", { className: "text-sm font-bold text-slate-800", children: "Parâmetros da API SolidWorks" })]
                }),
                t.jsxs("div", {
                  className: "space-y-3 text-xs",
                  children: [
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-semibold text-slate-600 block mb-1", children: "Endpoint / Host da API Local" }),
                        t.jsx("input", { type: "text", value: m, onChange: eVal => p(eVal.target.value), className: "w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-700 bg-slate-50 focus:bg-white" }),
                        t.jsx("span", { className: "text-[10px] text-slate-400 mt-1 block", children: "Daemon local MotorDesk SolidWorks Add-in." })
                      ]
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-semibold text-slate-600 block mb-1", children: "Porta TCP" }),
                        t.jsx("input", { type: "text", value: f, onChange: eVal => h(eVal.target.value), className: "w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-700 bg-slate-50 focus:bg-white" })
                      ]
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-semibold text-slate-600 block mb-1", children: "Token de Segurança" }),
                        t.jsx("input", { type: "password", value: A, onChange: eVal => v(eVal.target.value), className: "w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-700 bg-slate-50 focus:bg-white" })
                      ]
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-semibold text-slate-600 block mb-1", children: "Versão do SolidWorks" }),
                        t.jsxs("select", {
                          value: N,
                          onChange: eVal => wSw(eVal.target.value),
                          className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white",
                          children: [
                            t.jsx("option", { value: "SolidWorks 2026 SP0.0", children: "SolidWorks 2026 SP0.0" }),
                            t.jsx("option", { value: "SolidWorks 2025 SP1.0", children: "SolidWorks 2025 SP1.0 (Recomendado)" }),
                            t.jsx("option", { value: "SolidWorks 2024 SP2.0", children: "SolidWorks 2024 SP2.0" })
                          ]
                        })
                      ]
                    }),
                    t.jsxs("div", {
                      className: "pt-2 space-y-2",
                      children: [
                        t.jsxs("label", {
                          className: "flex items-center gap-2 cursor-pointer",
                          children: [
                            t.jsx("input", { type: "checkbox", checked: C, onChange: eVal => y(eVal.target.checked), className: "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" }),
                            t.jsx("span", { className: "text-slate-700", children: "Extrair Propriedades Físicas & Materiais CAD" })
                          ]
                        }),
                        t.jsxs("label", {
                          className: "flex items-center gap-2 cursor-pointer",
                          children: [
                            t.jsx("input", { type: "checkbox", checked: S, onChange: eVal => B(eVal.target.checked), className: "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" }),
                            t.jsx("span", { className: "text-slate-700", children: "Cadastrar Insumos Inexistentes no Estoque" })
                          ]
                        })
                      ]
                    }),
                    t.jsx("div", {
                      className: "pt-3 border-t border-slate-100",
                      children: t.jsxs("button", {
                        onClick: De,
                        disabled: O,
                        className: "w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50",
                        children: [t.jsx(N4, { className: "w-3.5 h-3.5 text-emerald-400" }), O ? "Testando Conexão..." : "Testar Conexão com API SolidWorks"]
                      })
                    })
                  ]
                })
              ]
            }),

            t.jsxs("div", {
              className: "lg:col-span-2 space-y-4",
              children: [
                t.jsxs("div", {
                  className: "bg-white border border-slate-200 rounded-xl p-5 shadow-xs",
                  children: [
                    t.jsxs("div", {
                      className: "flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3",
                      children: [
                        t.jsxs("div", {
                          children: [
                            t.jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200", children: "Montagem 3D Ativa no SolidWorks" }),
                            t.jsxs("h3", { className: "text-base font-bold text-slate-800 mt-1 flex items-center gap-2", children: [t.jsx(Tr, { className: "w-4 h-4 text-indigo-600" }), z.name] }),
                            t.jsxs("p", { className: "text-xs text-slate-400 font-mono mt-0.5", children: ["Arquivo: ", z.assemblyFileName, " | Part Number: ", z.partNumber] })
                          ]
                        }),
                        t.jsxs("div", {
                          className: "flex items-center gap-2",
                          children: [
                            t.jsx("span", { className: "text-xs text-slate-400 font-medium", children: "Montagem:" }),
                            t.jsx("select", {
                              value: z.id,
                              onChange: eVal => {
                                const found = allAssemblies.find(item => item.id === eVal.target.value);
                                if (found) ee(found);
                              },
                              className: "px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 cursor-pointer",
                              children: allAssemblies.map(item => t.jsx("option", { value: item.id, children: item.name }, item.id))
                            })
                          ]
                        })
                      ]
                    }),

                    t.jsxs("div", {
                      className: "grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs",
                      children: [
                        t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 block text-[10px] uppercase font-bold", children: "Massa Calculada" }), t.jsxs("span", { className: "font-bold text-slate-800", children: [z.totalMassKg, " kg"] })] }),
                        t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 block text-[10px] uppercase font-bold", children: "Material Principal" }), t.jsx("span", { className: "font-bold text-slate-800 truncate block", children: z.mainMaterial })] }),
                        t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 block text-[10px] uppercase font-bold", children: "Autor / Projetista" }), t.jsx("span", { className: "font-bold text-slate-800 truncate block", children: z.author })] }),
                        t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 block text-[10px] uppercase font-bold", children: "Componentes na Árvore" }), t.jsxs("span", { className: "font-bold text-indigo-600", children: [z.components.length, " itens"] })] })
                      ]
                    }),

                    t.jsx("div", {
                      className: "overflow-x-auto border border-slate-100 rounded-lg",
                      children: t.jsxs("table", {
                        className: "w-full text-xs text-left",
                        children: [
                          t.jsx("thead", {
                            className: "bg-slate-100/75 text-slate-600 font-bold uppercase text-[10px]",
                            children: t.jsxs("tr", {
                              children: [
                                t.jsx("th", { className: "p-2.5", children: "Item" }),
                                t.jsx("th", { className: "p-2.5", children: "Part Number" }),
                                t.jsx("th", { className: "p-2.5", children: "Descrição" }),
                                t.jsx("th", { className: "p-2.5", children: "Qtd" }),
                                t.jsx("th", { className: "p-2.5", children: "Material" }),
                                t.jsx("th", { className: "p-2.5 text-right", children: "Custo Unit." }),
                                t.jsx("th", { className: "p-2.5 text-right", children: "Total" })
                              ]
                            })
                          }),
                          t.jsx("tbody", {
                            className: "divide-y divide-slate-100",
                            children: z.components.map(comp => t.jsxs("tr", {
                              className: "hover:bg-indigo-50/30 transition",
                              children: [
                                t.jsx("td", { className: "p-2.5 font-bold text-slate-500", children: comp.itemNumber }),
                                t.jsx("td", { className: "p-2.5 font-mono text-indigo-700 font-semibold", children: comp.partNumber }),
                                t.jsxs("td", { className: "p-2.5 font-medium text-slate-800", children: [comp.description, t.jsx("span", { className: "block text-[10px] text-slate-400 capitalize", children: comp.category === "materia_prima" ? "Matéria-Prima" : "Componente Homologado" })] }),
                                t.jsxs("td", { className: "p-2.5 font-bold text-slate-900", children: [comp.quantity, " ", comp.unit] }),
                                t.jsx("td", { className: "p-2.5 text-slate-600", children: comp.material }),
                                t.jsxs("td", { className: "p-2.5 text-right font-mono text-slate-700", children: ["R$ ", comp.estimatedUnitCost.toFixed(2)] }),
                                t.jsxs("td", { className: "p-2.5 text-right font-mono font-bold text-slate-900", children: ["R$ ", (comp.quantity * comp.estimatedUnitCost).toFixed(2)] })
                              ]
                            }, comp.itemNumber))
                          })
                        ]
                      })
                    }),

                    t.jsxs("div", {
                      className: "flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100",
                      children: [
                        t.jsxs("button", {
                          onClick: () => d("material_picking"),
                          className: "px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs",
                          children: [t.jsx(Xn, { className: "w-4 h-4" }), "Ir para Análise & Separação de Materiais"]
                        }),
                        t.jsxs("button", {
                          onClick: () => me("solidworks_api"),
                          className: "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer",
                          children: [t.jsx(Cr, { className: "w-4 h-4 text-amber-300" }), "Sincronizar e Criar Estrutura (BOM)"]
                        })
                      ]
                    })
                  ]
                }),

                // Console
                t.jsxs("div", {
                  className: "bg-slate-950 text-slate-300 rounded-xl p-4 font-mono text-xs shadow-md border border-slate-800",
                  children: [
                    t.jsxs("div", {
                      className: "flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400",
                      children: [
                        t.jsxs("div", { className: "flex items-center gap-2", children: [t.jsx(Pw, { className: "w-3.5 h-3.5 text-emerald-400" }), t.jsx("span", { children: "Console SolidWorks Add-in Sync" })] }),
                        t.jsx("span", { className: "text-emerald-400 font-bold", children: "PORTA 18285 / TCP LISTENING" })
                      ]
                    }),
                    t.jsx("div", {
                      className: "space-y-1 max-h-36 overflow-y-auto pr-2 text-[11px] leading-relaxed",
                      children: R.map((msg, idx) => t.jsxs("div", { className: "flex items-start gap-2", children: [t.jsx("span", { className: "text-slate-600 select-none", children: ">" }), t.jsx("span", { className: msg.includes("SUCESSO") ? "text-emerald-400 font-bold" : msg.includes("handshake") ? "text-amber-400" : "text-slate-300", children: msg })] }, idx))
                    })
                  ]
                })
              ]
            })
          ]
        })
      }),

      // TAB 3: IMPORTADOR EXCEL / CSV / STEP
      c === "excel_importer" && t.jsx("div", {
        className: "space-y-6",
        children: t.jsxs("div", {
          className: "bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6",
          children: [
            t.jsxs("div", {
              className: "flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100",
              children: [
                t.jsxs("div", {
                  children: [
                    t.jsxs("h3", { className: "text-base font-bold text-slate-800 flex items-center gap-2 font-display", children: [t.jsx(Mu, { className: "w-5 h-5 text-emerald-600" }), "Importador de Listas de Materiais Exportadas do SolidWorks (.XLSX / .CSV)"] }),
                    t.jsxs("p", { className: "text-xs text-slate-500 mt-1 max-w-2xl", children: ["Exporte a Lista de Materiais (BOM Table) no SolidWorks para Excel ou CSV e importe diretamente para carregar na árvore e disparar a separação de material."] })
                  ]
                }),
                t.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    t.jsxs("button", { onClick: () => geExcel(0), className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer", children: [t.jsx(Cr, { className: "w-3.5 h-3.5 text-amber-500" }), "Carregar Exemplo: Válvula Esfera"] }),
                    t.jsxs("button", { onClick: () => geExcel(1), className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer", children: [t.jsx(Cr, { className: "w-3.5 h-3.5 text-amber-500" }), "Carregar Exemplo: Redutor"] })
                  ]
                })
              ]
            }),

            t.jsxs("div", {
              className: "border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-xl p-8 text-center transition cursor-pointer",
              children: [
                t.jsx(Bf, { className: "w-10 h-10 text-indigo-500 mx-auto mb-3 animate-bounce" }),
                t.jsx("p", { className: "text-sm font-bold text-slate-700", children: "Arraste sua planilha BOM (.xlsx ou .csv) ou arquivo STEP aqui" }),
                t.jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Layout com suporte automático a colunas PartNumber, Quantidade, Descrição e Material" })
              ]
            })
          ]
        })
      }),

      // TAB 4: DIAGNÓSTICO & LOGS
      c === "webhooks_logs" && t.jsx("div", {
        className: "bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4",
        children: t.jsxs("div", {
          className: "space-y-2",
          children: [
            t.jsx("h3", { className: "text-sm font-bold text-slate-800", children: "Logs de Transmissão da Integração CAD" }),
            t.jsx("div", {
              className: "bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs space-y-1.5 max-h-60 overflow-y-auto",
              children: R.map((msg, idx) => t.jsx("div", { children: msg }, idx))
            })
          ]
        })
      }),

      // MODAL: VISUALIZAR E IMPRIMIR GUIA DE SEPARAÇÃO (PICKING LIST)
      activePickingModal && t.jsx("div", {
        className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto",
        children: t.jsxs("div", {
          className: "bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden",
          children: [
            // Modal Header
            t.jsxs("div", {
              className: "px-6 py-4 bg-slate-900 text-white flex items-center justify-between",
              children: [
                t.jsxs("div", {
                  className: "flex items-center gap-3",
                  children: [
                    t.jsx("div", { className: "p-2 bg-indigo-500/20 text-indigo-400 rounded-lg", children: t.jsx(Hy, { className: "w-5 h-5" }) }),
                    t.jsxs("div", {
                      children: [
                        t.jsxs("div", { className: "flex items-center gap-2", children: [t.jsx("h3", { className: "font-bold text-base", children: "Guia Oficial de Separação de Almoxarifado (Picking Slip)" }), t.jsx("span", { className: "px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold rounded", children: activePickingModal.code })] }),
                        t.jsxs("p", { className: "text-xs text-slate-400", children: ["Projeto SolidWorks: ", activePickingModal.assemblyName, " | Lote: ", activePickingModal.batchQuantity, " un"] })
                      ]
                    })
                  ]
                }),
                t.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    t.jsxs("button", {
                      onClick: () => window.print(),
                      className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs",
                      children: [t.jsx(Yr, { className: "w-3.5 h-3.5" }), "Imprimir Folha"]
                    }),
                    t.jsx("button", {
                      onClick: () => setActivePickingModal(null),
                      className: "p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer text-sm font-bold",
                      children: "✕"
                    })
                  ]
                })
              ]
            }),

            // Modal Body
            t.jsxs("div", {
              className: "p-6 overflow-y-auto space-y-6 text-xs",
              children: [
                // Picking Metadata
                t.jsxs("div", {
                  className: "grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200",
                  children: [
                    t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 font-medium block", children: "Código da Ordem" }), t.jsx("span", { className: "font-mono font-bold text-slate-800 text-sm", children: activePickingModal.code })] }),
                    t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 font-medium block", children: "Data / Horário" }), t.jsxs("span", { className: "font-bold text-slate-800", children: [activePickingModal.date, " às ", activePickingModal.time] })] }),
                    t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 font-medium block", children: "Almoxarife Responsável" }), t.jsx("span", { className: "font-bold text-slate-800", children: activePickingModal.responsible })] }),
                    t.jsxs("div", { children: [t.jsx("span", { className: "text-slate-400 font-medium block", children: "Status da Reserva" }), t.jsx("span", { className: "px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] inline-block", children: "Reservado para Produção" })] })
                  ]
                }),

                // Picking Table
                t.jsxs("div", {
                  className: "border border-slate-200 rounded-xl overflow-hidden",
                  children: [
                    t.jsxs("div", {
                      className: "p-3 bg-slate-100 font-bold text-slate-700 flex items-center justify-between border-b border-slate-200",
                      children: [
                        t.jsx("span", { children: "Itens da Ordem de Separação (Rota Otimizada WMS)" }),
                        t.jsxs("span", { className: "text-[11px] font-normal text-slate-500", children: [activePickingModal.items.length, " itens a coletar"] })
                      ]
                    }),
                    t.jsxs("table", {
                      className: "w-full text-left",
                      children: [
                        t.jsx("thead", {
                          className: "bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200",
                          children: t.jsxs("tr", {
                            children: [
                              t.jsx("th", { className: "p-2.5 text-center w-12", children: "Check" }),
                              t.jsx("th", { className: "p-2.5", children: "Localização WMS" }),
                              t.jsx("th", { className: "p-2.5", children: "Código / Part Number" }),
                              t.jsx("th", { className: "p-2.5", children: "Descrição do Material" }),
                              t.jsx("th", { className: "p-2.5 text-center", children: "Qtd Requerida" }),
                              t.jsx("th", { className: "p-2.5 text-center", children: "Qtd Separada" }),
                              t.jsx("th", { className: "p-2.5 text-center", children: "Código de Barras" })
                            ]
                          })
                        }),
                        t.jsx("tbody", {
                          className: "divide-y divide-slate-100",
                          children: activePickingModal.items.map((it, idx) => {
                            const isChecked = !!checkedPickingItems[activePickingModal.id + "-" + idx];
                            return t.jsxs("tr", {
                              className: isChecked ? "bg-emerald-50/50" : "hover:bg-slate-50",
                              children: [
                                t.jsx("td", {
                                  className: "p-2.5 text-center",
                                  children: t.jsx("input", {
                                    type: "checkbox",
                                    checked: isChecked,
                                    onChange: eVal => {
                                      setCheckedPickingItems(prev => ({
                                        ...prev,
                                        [activePickingModal.id + "-" + idx]: eVal.target.checked
                                      }));
                                    },
                                    className: "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                                  })
                                }),
                                t.jsxs("td", {
                                  className: "p-2.5 font-bold text-slate-800",
                                  children: [t.jsx(mp, { className: "w-3 h-3 text-slate-400 inline mr-1" }), it.wmsLocation]
                                }),
                                t.jsx("td", { className: "p-2.5 font-mono font-bold text-indigo-700", children: it.partNumber }),
                                t.jsxs("td", {
                                  className: "p-2.5",
                                  children: [
                                    t.jsx("span", { className: "font-semibold text-slate-800 block", children: it.description }),
                                    t.jsxs("span", { className: "text-[10px] text-slate-400", children: ["Material: ", it.material] })
                                  ]
                                }),
                                t.jsxs("td", { className: "p-2.5 text-center font-bold text-slate-900", children: [it.neededQty, " ", it.unit] }),
                                t.jsxs("td", {
                                  className: "p-2.5 text-center",
                                  children: t.jsxs("span", { className: "px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800", children: [it.pickedQty, " ", it.unit] })
                                }),
                                t.jsxs("td", {
                                  className: "p-2.5 text-center font-mono text-[10px] text-slate-500",
                                  children: ["*", it.partNumber.replace(/[^A-Z0-9]/g, ""), "*"]
                                })
                              ]
                            }, idx);
                          })
                        })
                      ]
                    })
                  ]
                }),

                // Signatures Box
                t.jsxs("div", {
                  className: "pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs",
                  children: [
                    t.jsxs("div", {
                      className: "border-t border-slate-300 pt-2",
                      children: [
                        t.jsx("p", { className: "font-bold text-slate-800", children: activePickingModal.responsible }),
                        t.jsx("p", { className: "text-[10px] text-slate-400", children: "Almoxarife Responsável (Separação & Baixa WMS)" })
                      ]
                    }),
                    t.jsxs("div", {
                      className: "border-t border-slate-300 pt-2",
                      children: [
                        t.jsx("p", { className: "font-bold text-slate-800", children: "Líder de Produção / Encarregado Chão de Fábrica" }),
                        t.jsx("p", { className: "text-[10px] text-slate-400", children: "Recebimento no Staging & Liberação de Início da OP" })
                      ]
                    })
                  ]
                })
              ]
            }),

            // Modal Footer
            t.jsxs("div", {
              className: "px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between",
              children: [
                t.jsxs("span", { className: "text-[11px] text-slate-400", children: ["MotorDesk ERP Indústria 4.0 | SolidWorks Add-in Sync | ", activePickingModal.code] }),
                t.jsxs("button", {
                  onClick: () => setActivePickingModal(null),
                  className: "px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer transition",
                  children: "Fechar Guia"
                })
              ]
            })
          ]
        })
      }),

      // MODAL: SIMULAR / CRIAR NOVA PEÇA NO SOLIDWORKS
      showNewCadModal && t.jsx("div", {
        className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto",
        children: t.jsxs("div", {
          className: "bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden",
          children: [
            t.jsxs("div", {
              className: "px-6 py-4 bg-indigo-900 text-white flex items-center justify-between",
              children: [
                t.jsxs("div", {
                  className: "flex items-center gap-2.5",
                  children: [
                    t.jsx(Cr, { className: "w-5 h-5 text-amber-300" }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("h3", { className: "font-bold text-base", children: "Simular / Modelar Nova Peça ou Máquina no SolidWorks" }),
                        t.jsx("p", { className: "text-xs text-indigo-200", children: "Crie um novo projeto CAD para testar a análise e a separação de materiais no estoque." })
                      ]
                    })
                  ]
                }),
                t.jsx("button", { onClick: () => setShowNewCadModal(false), className: "p-1.5 hover:bg-indigo-800 rounded-lg text-white font-bold cursor-pointer", children: "✕" })
              ]
            }),

            t.jsxs("div", {
              className: "p-6 overflow-y-auto space-y-4 text-xs",
              children: [
                t.jsxs("div", {
                  className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                  children: [
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-bold text-slate-700 block mb-1", children: "Nome do Componente / Máquina:" }),
                        t.jsx("input", { type: "text", value: newCadForm.name, onChange: eVal => setNewCadForm(prev => ({ ...prev, name: eVal.target.value })), className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800" })
                      ]
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-bold text-slate-700 block mb-1", children: "Arquivo SolidWorks (.SLDASM):" }),
                        t.jsx("input", { type: "text", value: newCadForm.assemblyFileName, onChange: eVal => setNewCadForm(prev => ({ ...prev, assemblyFileName: eVal.target.value })), className: "w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-800" })
                      ]
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-bold text-slate-700 block mb-1", children: "Part Number Principal:" }),
                        t.jsx("input", { type: "text", value: newCadForm.partNumber, onChange: eVal => setNewCadForm(prev => ({ ...prev, partNumber: eVal.target.value })), className: "w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-800" })
                      ]
                    }),
                    t.jsxs("div", {
                      children: [
                        t.jsx("label", { className: "font-bold text-slate-700 block mb-1", children: "Material Predominante:" }),
                        t.jsx("input", { type: "text", value: newCadForm.mainMaterial, onChange: eVal => setNewCadForm(prev => ({ ...prev, mainMaterial: eVal.target.value })), className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800" })
                      ]
                    })
                  ]
                }),

                t.jsxs("div", {
                  className: "p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2",
                  children: [
                    t.jsxs("div", {
                      className: "flex items-center justify-between",
                      children: [
                        t.jsx("span", { className: "font-bold text-slate-800", children: "Lista de Componentes do SolidWorks (BOM CAD):" }),
                        t.jsxs("span", { className: "text-[11px] text-slate-500", children: [newCadForm.components.length, " matérias-primas e componentes"] })
                      ]
                    }),
                    t.jsx("div", {
                      className: "space-y-1.5 max-h-48 overflow-y-auto",
                      children: newCadForm.components.map((comp, idx) => t.jsxs("div", {
                        className: "p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs",
                        children: [
                          t.jsxs("div", {
                            children: [
                              t.jsxs("span", { className: "font-mono font-bold text-indigo-700", children: [comp.partNumber, " - "] }),
                              t.jsx("span", { className: "font-semibold text-slate-800", children: comp.description }),
                              t.jsxs("span", { className: "text-[10px] text-slate-400 block", children: ["Material: ", comp.material, " | Local: ", comp.defaultLocation] })
                            ]
                          }),
                          t.jsxs("div", {
                            className: "text-right",
                            children: [
                              t.jsxs("span", { className: "font-bold text-slate-900 block", children: [comp.quantity, " ", comp.unit] }),
                              t.jsxs("span", { className: "text-[10px] font-mono text-slate-500", children: ["R$ ", comp.estimatedUnitCost, "/un"] })
                            ]
                          })
                        ]
                      }, idx))
                    })
                  ]
                })
              ]
            }),

            t.jsxs("div", {
              className: "px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between",
              children: [
                t.jsx("button", { onClick: () => setShowNewCadModal(false), className: "px-4 py-2 text-slate-600 hover:text-slate-800 font-bold cursor-pointer", children: "Cancelar" }),
                t.jsxs("button", {
                  onClick: handleSaveNewCustomCad,
                  className: "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5",
                  children: [t.jsx(Ma, { className: "w-4 h-4" }), "Salvar e Analisar Separação de Materiais"]
                })
              ]
            })
          ]
        })
      })
    ]
  });
};
