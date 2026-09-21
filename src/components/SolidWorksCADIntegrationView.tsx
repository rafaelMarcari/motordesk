import React, { useState, useMemo } from 'react';

export interface SolidWorksIntegrationProps {
  currentUser?: any;
  currentCompany?: any;
  db: any;
  onUpdateDb: (updater: (prev: any) => any) => void;
  onAddHistoryLog?: (log: any) => void;
  onNavigateTab?: (tab: string) => void;
  onNavigateToView?: (view: string) => void;
}

export interface SolidWorksComponentItem {
  partNumber: string;
  description: string;
  qtyPerAssembly: number;
  totalQtyNeeded: number;
  unit: string;
  material: string;
  itemType: 'MANUFACTURED' | 'PURCHASED' | 'RAW_MATERIAL';
  location: string;
  inStock: number;
  separatedQty: number;
  status: 'PENDING' | 'SEPARATED' | 'SHORTAGE';
  processRoute?: string[];
}

export interface SolidWorksCADProject {
  id: string;
  companyId: string;
  projectName: string;
  assemblyNumber: string;
  revision: string;
  cadFile: string;
  designer: string;
  cadSoftware: string;
  receivedAt: string;
  orderQuantity: number;
  customerName: string;
  productionOrderId: string;
  separationId: string;
  bomId: string;
  totalItemsCount: number;
  separationStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  shortageCount: number;
  items: SolidWorksComponentItem[];
  notes?: string;
}

// Modelos pré-configurados de projetos CAD SolidWorks para demonstração imediata
const DEMO_CAD_PROJECT_TEMPLATES = [
  {
    projectName: 'Bomba Centrífuga Alta Pressão BC-450',
    assemblyNumber: 'BC450-ASM-REV04',
    revision: 'Rev D',
    cadFile: 'BC450_MONTAGEM_GERAL.SLDASM',
    designer: 'Eng. Carlos Eduardo (Engenharia Mecânica)',
    cadSoftware: 'SolidWorks 2025 Professional',
    customerName: 'PetroMetal Química S.A.',
    orderQuantity: 2,
    notes: 'Conjunto mecânico de bombeamento industrial com corpo em inox e selagem mecânica dupla.',
    items: [
      {
        partNumber: 'BC-CORP-450',
        description: 'Carcaça Fundida da Bomba BC-450 Usinada',
        qtyPerAssembly: 1,
        unit: 'PC',
        material: 'Aço Inox AISI 316 Fundido',
        itemType: 'MANUFACTURED',
        location: 'Almoxarifado Central - Corredor A, Prateleira 04',
        inStock: 4,
        processRoute: ['Torneamento CNC', 'Mandrilhamento', 'Furação de Flanges', 'Teste Hidrostático']
      },
      {
        partNumber: 'BC-ROTOR-450',
        description: 'Rotor Fechado Equilibrado Dinamicamente',
        qtyPerAssembly: 1,
        unit: 'PC',
        material: 'Bronze Fosforoso SAE 65',
        itemType: 'MANUFACTURED',
        location: 'Almoxarifado Peças Usinadas - Rua B, Gaveta 12',
        inStock: 2,
        processRoute: ['Usinagem 5 Eixos', 'Balanceamento Dinâmico ISO G2.5']
      },
      {
        partNumber: 'BC-EIXO-410',
        description: 'Eixo Principal Retificado com Chaveta Dupla',
        qtyPerAssembly: 1,
        unit: 'PC',
        material: 'Aço Inox AISI 410 Reafinado',
        itemType: 'MANUFACTURED',
        location: 'Almoxarifado Eixos - Prateleira 08',
        inStock: 3,
        processRoute: ['Torneamento CNC', 'Fresamento de Chaveta', 'Retífica Cilíndrica']
      },
      {
        partNumber: 'ROL-6310-2RS',
        description: 'Rolamento Fixo de Esferas 6310 C3',
        qtyPerAssembly: 2,
        unit: 'UN',
        material: 'Aço Cromo 100Cr6',
        itemType: 'PURCHASED',
        location: 'Almoxarifado Rolamentos - Estante 02, Gaveta 18',
        inStock: 10
      },
      {
        partNumber: 'SEL-MEC-45MM',
        description: 'Selo Mecânico Duplo Cartucho Cartridge 45mm Silício x Carboneto',
        qtyPerAssembly: 1,
        unit: 'UN',
        material: 'Carbeto de Silício / Viton',
        itemType: 'PURCHASED',
        location: 'Almoxarifado Especial - Armário Blindado 01',
        inStock: 1 // Vai dar falta se pedir 2 conjuntos!
      },
      {
        partNumber: 'PAR-M12X45-INOX',
        description: 'Parafuso Sextavado M12 x 45mm DIN 933 A2-70 Inox',
        qtyPerAssembly: 16,
        unit: 'UN',
        material: 'Aço Inox A2-70',
        itemType: 'PURCHASED',
        location: 'Fixadores & Parafusos - Módulo 03, Caixa 42',
        inStock: 120
      },
      {
        partNumber: 'ORING-NBR-180',
        description: 'Anel O-Ring Vedação 180 x 5.33mm NBR 70 Shore A',
        qtyPerAssembly: 2,
        unit: 'UN',
        material: 'Borracha Nitrílica NBR',
        itemType: 'PURCHASED',
        location: 'Vedações & Guarnições - Gaveta V-14',
        inStock: 8
      }
    ]
  },
  {
    projectName: 'Redutor Planetário Industrial RP-200',
    assemblyNumber: 'RP200-PLAN-ASM-01',
    revision: 'Rev B',
    cadFile: 'RP200_REDUTOR_GERAL.SLDASM',
    designer: 'Eng. Mariana Silva (P&D Fabril)',
    cadSoftware: 'SolidWorks 2025 Professional',
    customerName: 'AgroIndústria Vale do Sul',
    orderQuantity: 1,
    notes: 'Redutor planetário com relação de transmissão 1:15 e engrenagens tratadas termicamente.',
    items: [
      {
        partNumber: 'RP-CARC-200',
        description: 'Carcaça Principal Bipartida do Redutor',
        qtyPerAssembly: 1,
        unit: 'PC',
        material: 'Ferro Fundido Nodular GGG-50',
        itemType: 'MANUFACTURED',
        location: 'Almoxarifado Estruturas - Rua C, Baia 02',
        inStock: 2,
        processRoute: ['Fresamento Portal CNC', 'Furação Rosqueada']
      },
      {
        partNumber: 'ENG-SOLAR-01',
        description: 'Engrenagem Solar Central Retificada Módulo 3',
        qtyPerAssembly: 1,
        unit: 'PC',
        material: 'Aço 8620 Cementado e Temperado',
        itemType: 'MANUFACTURED',
        location: 'Almoxarifado Engrenagens - Prateleira 05',
        inStock: 1,
        processRoute: ['Torneamento', 'Gerafresamento', 'Tratamento Térmico', 'Retífica de Dentes']
      },
      {
        partNumber: 'ENG-PLANET-03',
        description: 'Engrenagem Planetária Módulo 3 (Jogo 3 Peças)',
        qtyPerAssembly: 3,
        unit: 'PC',
        material: 'Aço 8620 Cementado e Temperado',
        itemType: 'MANUFACTURED',
        location: 'Almoxarifado Engrenagens - Prateleira 05',
        inStock: 6
      },
      {
        partNumber: 'RET-55X80X10',
        description: 'Retentor de Óleo com Mola 55 x 80 x 10mm Nitrílica',
        qtyPerAssembly: 2,
        unit: 'UN',
        material: 'NBR / Carcaça de Aço',
        itemType: 'PURCHASED',
        location: 'Almoxarifado Vedações - Gaveta R-04',
        inStock: 5
      }
    ]
  }
];

export function SolidWorksCADIntegrationView({
  currentUser,
  currentCompany,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onNavigateTab,
  onNavigateToView
}: SolidWorksIntegrationProps) {
  const companyId = currentCompany?.id || currentUser?.companyId || 'comp-1';

  // Carrega ou inicializa projetos do SolidWorks no estado da empresa
  const solidworksProjects: SolidWorksCADProject[] = useMemo(() => {
    const list = db.solidworksProjects || [];
    return list.filter((p: any) => !p.companyId || p.companyId === companyId);
  }, [db.solidworksProjects, companyId]);

  // Modais e seleções
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customOrderQty, setCustomOrderQty] = useState(1);
  const [customCustomer, setCustomCustomer] = useState('');
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<SolidWorksCADProject | null>(null);
  const [pickingSearchFilter, setPickingSearchFilter] = useState('');
  const [filterSeparationStatus, setFilterSeparationStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [isProcessingSync, setIsProcessingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showApiDocModal, setShowApiDocModal] = useState(false);

  // Contadores operacionais
  const metrics = useMemo(() => {
    const totalProjects = solidworksProjects.length;
    const completedPickings = solidworksProjects.filter(p => p.separationStatus === 'COMPLETED').length;
    const pendingPickings = solidworksProjects.filter(p => p.separationStatus === 'PENDING' || p.separationStatus === 'IN_PROGRESS').length;
    const totalShortages = solidworksProjects.reduce((acc, p) => acc + (p.shortageCount || 0), 0);
    return { totalProjects, completedPickings, pendingPickings, totalShortages };
  }, [solidworksProjects]);

  // Disparar sincronização do SolidWorks -> MotorDesk
  const handleProcessSolidWorksSubmission = (templateIndex = 0) => {
    setIsProcessingSync(true);
    const template = DEMO_CAD_PROJECT_TEMPLATES[templateIndex];
    const qty = Number(customOrderQty) > 0 ? Number(customOrderQty) : template.orderQuantity;
    const customer = customCustomer.trim() || template.customerName;

    setTimeout(() => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timestampStr = now.toLocaleTimeString('pt-BR');
      const uniqueSuffix = Date.now().toString().slice(-4);
      const opId = `OP-SW-${uniqueSuffix}`;
      const sepId = `SEP-SW-${uniqueSuffix}`;
      const bomId = `BOM-SW-${uniqueSuffix}`;

      // Monta os itens do picking calculando estoque e faltas
      let shortageCount = 0;
      const processedItems: SolidWorksComponentItem[] = template.items.map(item => {
        const totalNeeded = item.qtyPerAssembly * qty;
        // Consulta estoque em db.parts se existir
        const matchedPart = (db.parts || []).find((p: any) => 
          p.code?.toLowerCase() === item.partNumber.toLowerCase() || 
          p.name?.toLowerCase().includes(item.description.toLowerCase())
        );
        const actualStock = matchedPart?.stock !== undefined ? Number(matchedPart.stock) : item.inStock;
        const isShortage = actualStock < totalNeeded;
        if (isShortage) shortageCount++;

        return {
          partNumber: item.partNumber,
          description: item.description,
          qtyPerAssembly: item.qtyPerAssembly,
          totalQtyNeeded: totalNeeded,
          unit: item.unit,
          material: item.material,
          itemType: item.itemType as any,
          location: item.location,
          inStock: actualStock,
          separatedQty: 0,
          status: isShortage ? 'SHORTAGE' : 'PENDING',
          processRoute: item.processRoute
        };
      });

      // 1. Objeto do Projeto SolidWorks
      const newSwProject: SolidWorksCADProject = {
        id: `SW-PROJ-${Date.now()}`,
        companyId,
        projectName: template.projectName,
        assemblyNumber: template.assemblyNumber,
        revision: template.revision,
        cadFile: template.cadFile,
        designer: template.designer,
        cadSoftware: template.cadSoftware,
        receivedAt: `${dateStr} ${timestampStr}`,
        orderQuantity: qty,
        customerName: customer,
        productionOrderId: opId,
        separationId: sepId,
        bomId: bomId,
        totalItemsCount: processedItems.length,
        separationStatus: 'PENDING',
        shortageCount,
        items: processedItems,
        notes: template.notes
      };

      // 2. Ordem de Produção (OP) gerada para o PCP
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      const newProductionOrder = {
        id: opId,
        companyId,
        orderNumber: opId,
        productName: template.projectName,
        productCode: template.assemblyNumber,
        quantity: qty,
        customer: customer,
        source: 'Integração SolidWorks CAD 3D',
        cadFile: template.cadFile,
        revision: template.revision,
        startDate: dateStr,
        dueDate: dueDate.toISOString().slice(0, 10),
        status: 'LIBERADA_PCP',
        priority: 'ALTA',
        notes: `Gerada automaticamente a partir do SolidWorks (${template.cadFile} - ${template.revision}). Picking ID: ${sepId}`
      };

      // 3. Estrutura de Materiais (BOM) na Engenharia
      const newBom = {
        id: bomId,
        companyId,
        productName: template.projectName,
        code: template.assemblyNumber,
        revision: template.revision,
        cadSource: template.cadSoftware,
        cadFile: template.cadFile,
        status: 'APPROVED',
        items: processedItems.map(i => ({
          partNumber: i.partNumber,
          description: i.description,
          quantity: i.qtyPerAssembly,
          unit: i.unit,
          material: i.material,
          route: i.processRoute
        })),
        updatedAt: dateStr
      };

      // 4. Ordem de Separação de Almoxarifado (Picking List)
      const newMaterialSeparation = {
        id: sepId,
        companyId,
        productionOrderId: opId,
        projectName: template.projectName,
        assemblyNumber: template.assemblyNumber,
        cadFile: template.cadFile,
        orderQuantity: qty,
        status: 'AGUARDANDO_SEPARACAO',
        responsible: 'Almoxarifado & WMS',
        createdAt: `${dateStr} ${timestampStr}`,
        totalItems: processedItems.length,
        shortageCount,
        items: processedItems
      };

      // Atualiza o banco com todos os registros operacionais
      onUpdateDb(prev => ({
        ...prev,
        solidworksProjects: [newSwProject, ...(prev.solidworksProjects || [])],
        productionOrders: [newProductionOrder, ...(prev.productionOrders || [])],
        boms: [newBom, ...(prev.boms || [])],
        materialSeparations: [newMaterialSeparation, ...(prev.materialSeparations || [])]
      }));

      if (onAddHistoryLog) {
        onAddHistoryLog({
          id: `log-sw-${Date.now()}`,
          date: dateStr,
          timestamp: `${dateStr} ${timestampStr}`,
          type: 'industrial',
          title: `[SolidWorks CAD] Projeto ${template.projectName} Recebido com Sucesso`,
          description: `Criada Ordem de Produção ${opId} (${qty} un) e Romaneio de Separação de Peças ${sepId}. Total de componentes: ${processedItems.length}.`,
          userId: currentUser?.id || 'eng-cad',
          userName: currentUser?.name || template.designer,
          companyId
        });
      }

      setIsProcessingSync(false);
      setShowImportModal(false);
      setSelectedProjectForDetail(newSwProject);
      setSyncFeedback({
        type: 'success',
        message: `Projeto CAD "${template.projectName}" integrado com sucesso! Foram criados: Pedido/OP ${opId}, Lista BOM ${bomId} e Separação de Itens ${sepId}.`
      });

      setTimeout(() => setSyncFeedback(null), 8000);
    }, 600);
  };

  // Operação no Almoxarifado: Bipar / Marcar Item como Separado
  const handleToggleItemSeparated = (projectId: string, itemPartNumber: string) => {
    onUpdateDb(prev => {
      const projects = (prev.solidworksProjects || []).map((p: SolidWorksCADProject) => {
        if (p.id !== projectId) return p;

        const updatedItems = p.items.map(item => {
          if (item.partNumber !== itemPartNumber) return item;
          const isCurrentlySeparated = item.status === 'SEPARATED';
          return {
            ...item,
            status: (isCurrentlySeparated ? 'PENDING' : 'SEPARATED') as any,
            separatedQty: isCurrentlySeparated ? 0 : item.totalQtyNeeded
          };
        });

        const allSeparated = updatedItems.every(i => i.status === 'SEPARATED');
        const anySeparated = updatedItems.some(i => i.status === 'SEPARATED');
        const newStatus = allSeparated ? 'COMPLETED' : anySeparated ? 'IN_PROGRESS' : 'PENDING';

        return {
          ...p,
          items: updatedItems,
          separationStatus: newStatus
        };
      });

      return {
        ...prev,
        solidworksProjects: projects
      };
    });

    // Atualiza também o modal detalhado aberto
    if (selectedProjectForDetail && selectedProjectForDetail.id === projectId) {
      setSelectedProjectForDetail(prevDetail => {
        if (!prevDetail) return null;
        const updatedItems = prevDetail.items.map(item => {
          if (item.partNumber !== itemPartNumber) return item;
          const isCurrentlySeparated = item.status === 'SEPARATED';
          return {
            ...item,
            status: (isCurrentlySeparated ? 'PENDING' : 'SEPARATED') as any,
            separatedQty: isCurrentlySeparated ? 0 : item.totalQtyNeeded
          };
        });
        const allSeparated = updatedItems.every(i => i.status === 'SEPARATED');
        const anySeparated = updatedItems.some(i => i.status === 'SEPARATED');
        return {
          ...prevDetail,
          items: updatedItems,
          separationStatus: allSeparated ? 'COMPLETED' : anySeparated ? 'IN_PROGRESS' : 'PENDING'
        };
      });
    }
  };

  // Separar todos os itens disponíveis em estoque de uma vez
  const handleSeparateAllInStock = (projectId: string) => {
    onUpdateDb(prev => {
      const projects = (prev.solidworksProjects || []).map((p: SolidWorksCADProject) => {
        if (p.id !== projectId) return p;

        const updatedItems = p.items.map(item => {
          if (item.inStock >= item.totalQtyNeeded) {
            return {
              ...item,
              status: 'SEPARATED' as any,
              separatedQty: item.totalQtyNeeded
            };
          }
          return item;
        });

        const allSeparated = updatedItems.every(i => i.status === 'SEPARATED');
        const anySeparated = updatedItems.some(i => i.status === 'SEPARATED');
        const newStatus = allSeparated ? 'COMPLETED' : anySeparated ? 'IN_PROGRESS' : 'PENDING';

        return {
          ...p,
          items: updatedItems,
          separationStatus: newStatus
        };
      });

      return {
        ...prev,
        solidworksProjects: projects
      };
    });

    if (selectedProjectForDetail && selectedProjectForDetail.id === projectId) {
      setSelectedProjectForDetail(prevDetail => {
        if (!prevDetail) return null;
        const updatedItems = prevDetail.items.map(item => {
          if (item.inStock >= item.totalQtyNeeded) {
            return {
              ...item,
              status: 'SEPARATED' as any,
              separatedQty: item.totalQtyNeeded
            };
          }
          return item;
        });
        const allSeparated = updatedItems.every(i => i.status === 'SEPARATED');
        const anySeparated = updatedItems.some(i => i.status === 'SEPARATED');
        return {
          ...prevDetail,
          items: updatedItems,
          separationStatus: allSeparated ? 'COMPLETED' : anySeparated ? 'IN_PROGRESS' : 'PENDING'
        };
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ALERTA DE SUCESSO / NOTIFICAÇÃO OPERACIONAL */}
      {syncFeedback && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-start gap-3 shadow-xs animate-fade-in">
          <div className="text-xl">✅</div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Operação Concluída com Sucesso!</h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">{syncFeedback.message}</p>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO DE INTEGRAÇÃO SOLIDWORKS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💻</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Integração CAD 3D SolidWorks & Automação Fabril
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                Add-in Oficial Conectado
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
              Ao concluir um projeto mecânico no SolidWorks, o envio automatizado para o MotorDesk gera instantaneamente:
              a <strong>Ordem de Produção (OP)</strong> para a fábrica, a <strong>Estrutura de Materiais (BOM)</strong> na Engenharia e o <strong>Romaneio de Separação (Picking List)</strong> para o Almoxarifado com conferência de saldo de estoque.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowApiDocModal(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚙️</span> API & Macro VBA
            </button>

            <button
              onClick={() => {
                setSelectedTemplateIndex(0);
                setCustomOrderQty(1);
                setCustomCustomer('');
                setShowImportModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>⚡</span> Simular Envio do SolidWorks
            </button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Projetos CAD Sincronizados</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.totalProjects}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Arquivos .SLDASM recebidos</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Ordens de Produção (OP)</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{metrics.totalProjects}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Criadas automaticamente no PCP</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Separações em Andamento</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{metrics.pendingPickings}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Aguardando picking de almoxarifado</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Itens Faltantes / Compras</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{metrics.totalShortages}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Saldo de estoque insuficiente</div>
          </div>
        </div>
      </div>

      {/* LISTA DE PROJETOS INTEGRADOS DO SOLIDWORKS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋</span> Projetos Recebidos do CAD SolidWorks
            </h3>
            <p className="text-xs text-slate-500">Histórico de montagens 3D processadas e seus fluxos operacionais vinculados</p>
          </div>

          {/* FILTRO DE STATUS */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status Separação:</span>
            <select
              value={filterSeparationStatus}
              onChange={e => setFilterSeparationStatus(e.target.value as any)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDING">Aguardando Separação</option>
              <option value="IN_PROGRESS">Em Separação</option>
              <option value="COMPLETED">100% Separado</option>
            </select>
          </div>
        </div>

        {solidworksProjects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="text-4xl">📁</div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhum Projeto SolidWorks Recebido Ainda</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Utilize o botão acima para simular a chegada de um projeto 3D ou envie uma montagem através da API REST / Add-in do SolidWorks.
            </p>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Simular Primeiro Projeto CAD
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Projeto & Arquivo CAD</th>
                  <th className="py-3 px-4">Revisão / Autor</th>
                  <th className="py-3 px-4">Ordem de Produção</th>
                  <th className="py-3 px-4">Qtd / Cliente</th>
                  <th className="py-3 px-4">Separação de Peças</th>
                  <th className="py-3 px-4">Saldo Estoque</th>
                  <th className="py-3 px-4 text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {solidworksProjects
                  .filter(p => filterSeparationStatus === 'ALL' || p.separationStatus === filterSeparationStatus)
                  .map(proj => {
                    const isFullySeparated = proj.separationStatus === 'COMPLETED';
                    const isShortage = proj.shortageCount > 0;

                    return (
                      <tr key={proj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{proj.projectName}</div>
                          <div className="flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                            <span>📦</span> {proj.cadFile}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                            {proj.revision}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-0.5">{proj.designer}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{proj.productionOrderId}</div>
                          <span className="text-[10px] text-slate-400">BOM: {proj.bomId}</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{proj.orderQuantity} un</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{proj.customerName}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isFullySeparated
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : proj.separationStatus === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {isFullySeparated ? '100% Separado' : proj.separationStatus === 'IN_PROGRESS' ? 'Em Separação' : 'Aguardando Picking'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{proj.items.length} itens na lista</div>
                        </td>

                        <td className="py-3 px-4">
                          {isShortage ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                              ⚠️ {proj.shortageCount} {proj.shortageCount === 1 ? 'item em falta' : 'itens em falta'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                              ✓ 100% em Estoque
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedProjectForDetail(proj)}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>📦</span> Romaneio de Separação
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALHADO DO ROMANEIO DE SEPARAÇÃO (PICKING LIST OPERACIONAL) */}
      {selectedProjectForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* TOPO DO MODAL */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <h3 className="text-base font-bold">
                    Romaneio de Separação de Peças (Picking Almoxarifado)
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono text-[11px]">
                    {selectedProjectForDetail.separationId}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Origem SolidWorks: <strong className="text-white">{selectedProjectForDetail.projectName}</strong> ({selectedProjectForDetail.cadFile} - {selectedProjectForDetail.revision}) | Ordem de Produção: <strong>{selectedProjectForDetail.productionOrderId}</strong> ({selectedProjectForDetail.orderQuantity} conjuntos)
                </p>
              </div>

              <button
                onClick={() => setSelectedProjectForDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* STATUS E AÇÕES RÁPIDAS NO MODAL */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs">
                  <span className="text-slate-500">Responsável: </span>
                  <strong className="text-slate-800 dark:text-slate-200">Almoxarifado Central & WMS</strong>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="text-xs">
                  <span className="text-slate-500">Destino: </span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedProjectForDetail.customerName}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filtrar por peça, código ou rua..."
                  value={pickingSearchFilter}
                  onChange={e => setPickingSearchFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 w-52"
                />

                <button
                  onClick={() => handleSeparateAllInStock(selectedProjectForDetail.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>✓</span> Separar Todos Disponíveis
                </button>
              </div>
            </div>

            {/* LISTA DE ITENS DO PICKING */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {selectedProjectForDetail.items
                  .filter(i => 
                    !pickingSearchFilter || 
                    i.partNumber.toLowerCase().includes(pickingSearchFilter.toLowerCase()) || 
                    i.description.toLowerCase().includes(pickingSearchFilter.toLowerCase()) ||
                    i.location.toLowerCase().includes(pickingSearchFilter.toLowerCase())
                  )
                  .map(item => {
                    const isItemSeparated = item.status === 'SEPARATED';
                    const isShortage = item.inStock < item.totalQtyNeeded;

                    return (
                      <div
                        key={item.partNumber}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isItemSeparated
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                            : isShortage
                            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {item.partNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.description}
                            </span>
                            <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.itemType === 'MANUFACTURED' ? 'Fabricação Interna' : item.itemType === 'PURCHASED' ? 'Comprado' : 'Matéria-Prima'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <div>
                              <span>Localização: </span>
                              <strong className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{item.location}</strong>
                            </div>
                            <div>
                              <span>Material: </span>
                              <span className="text-slate-700 dark:text-slate-300">{item.material}</span>
                            </div>
                            {item.processRoute && item.processRoute.length > 0 && (
                              <div>
                                <span>Roteiro: </span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                  {item.processRoute.join(' → ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {/* SALDOS E QUANTIDADES */}
                          <div className="text-right text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">
                              Necessário: <span className="text-base text-blue-600 dark:text-blue-400">{item.totalQtyNeeded}</span> {item.unit}
                            </div>
                            <div className="text-[11px]">
                              Saldo Estoque:{' '}
                              <span className={isShortage ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                                {item.inStock} {item.unit}
                              </span>
                              {isShortage && (
                                <span className="text-rose-500 block font-bold text-[10px]">
                                  Falta: {item.totalQtyNeeded - item.inStock} {item.unit}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* BOTÃO DE CONFIRMAR / BIPAR SEPARAÇÃO */}
                          <button
                            onClick={() => handleToggleItemSeparated(selectedProjectForDetail.id, item.partNumber)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                              isItemSeparated
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span>{isItemSeparated ? '✓ Separado' : '📦 Bipar / Separar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* RODAPÉ DO MODAL COM BOTÃO DE IMPRESSÃO DO ROMANEIO */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Total de Itens: <strong>{selectedProjectForDetail.items.length}</strong> | Itens Separados:{' '}
                <strong className="text-emerald-600">
                  {selectedProjectForDetail.items.filter(i => i.status === 'SEPARATED').length}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  🖨️ Imprimir Romaneio de Picking
                </button>
                <button
                  onClick={() => setSelectedProjectForDetail(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA SIMULAR / IMPORTAR PROJETO SOLIDWORKS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚡</span> Receber Projeto Finalizado do SolidWorks
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione um projeto CAD ou simule o envio direto pelo add-in do SolidWorks.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Selecione o Projeto / Montagem CAD 3D (.SLDASM):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEMO_CAD_PROJECT_TEMPLATES.map((tmpl, idx) => (
                    <div
                      key={tmpl.assemblyNumber}
                      onClick={() => setSelectedTemplateIndex(idx)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedTemplateIndex === idx
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{tmpl.projectName}</div>
                      <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">{tmpl.cadFile}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{tmpl.items.length} componentes estruturados</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade de Conjuntos a Produzir:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customOrderQty}
                    onChange={e => setCustomOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cliente / Destino da Produção:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PetroMetal Química S.A. ou Linha de Montagem"
                    value={customCustomer}
                    onChange={e => setCustomCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <div className="font-bold">O que o MotorDesk fará automaticamente:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Criará a <strong>Ordem de Produção (OP)</strong> no PCP com data de entrega e prioridade.</li>
                  <li>Cadastrará a <strong>Estrutura de Produto (BOM)</strong> com a lista completa de componentes.</li>
                  <li>Gerará a <strong>Separação de Almoxarifado (Picking List)</strong> com a conferência física de cada item.</li>
                  <li>Verificará o <strong>Saldo de Estoque</strong> e apontará eventuais peças faltantes para compra.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessingSync}
                onClick={() => handleProcessSolidWorksSubmission(selectedTemplateIndex)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>{isProcessingSync ? 'Processando CAD...' : 'Confirmar e Gerar Pedidos e Separação'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DOCUMENTAÇÃO DA API / SCRIPT VBA SOLIDWORKS */}
      {showApiDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚙️</span> Configuração da Integração SolidWorks (VBA / C# / REST)
                </h3>
                <p className="text-xs text-slate-500">
                  Como enviar montagens do SolidWorks diretamente para a API do MotorDesk
                </p>
              </div>
              <button onClick={() => setShowApiDocModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">POST</span> /api/integrations/solidworks/sync-project
                <div className="text-slate-500 mt-1">Headers: Content-Type: application/json, X-Company-Id: {companyId}</div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Exemplo de Payload JSON Enviado pelo SolidWorks:</h4>
                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
{`{
  "projectName": "Bomba Centrífuga Alta Pressão BC-450",
  "assemblyNumber": "BC450-ASM-REV04",
  "revision": "Rev D",
  "cadFile": "BC450_MONTAGEM_GERAL.SLDASM",
  "designer": "Eng. Mecânico Responsável",
  "cadSoftware": "SolidWorks 2025",
  "orderQuantity": 2,
  "customerName": "Cliente Industrial S.A.",
  "items": [
    {
      "partNumber": "BC-CORP-450",
      "description": "Carcaça Fundida Usinada",
      "qtyPerAssembly": 1,
      "unit": "PC",
      "material": "Aço Inox AISI 316",
      "itemType": "MANUFACTURED",
      "location": "Almoxarifado Central - Rua A"
    },
    {
      "partNumber": "PAR-M12X45-INOX",
      "description": "Parafuso Sextavado M12 x 45mm",
      "qtyPerAssembly": 16,
      "unit": "UN",
      "material": "Aço Inox A2-70",
      "itemType": "PURCHASED",
      "location": "Fixadores - Módulo 03"
    }
  ]
}`}
                </pre>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold">Macro SolidWorks (VBA Macro pronta):</div>
                <p className="text-[11px]">
                  Os projetistas podem salvar o botão na barra de ferramentas do SolidWorks: ao clicar, a macro percorre a árvore de montagem ativa (<code>AssemblyDoc.GetComponents</code>), extrai as propriedades personalizadas e posta diretamente no MotorDesk.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowApiDocModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
