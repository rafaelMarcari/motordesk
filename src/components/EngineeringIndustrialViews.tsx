import React, { useState, useMemo } from 'react';

export interface EngineeringProps {
  currentUser?: any;
  currentCompany?: any;
  db: any;
  onUpdateDb: (updater: (prev: any) => any) => void;
  onAddHistoryLog?: (log: any) => void;
  onNavigateTab?: (tab: string) => void;
  onSelectSubTab?: (tab: string) => void;
  onNavigateToView?: (view: string) => void;
}

// --------------------------------------------------------------------------------------
// 1. DASHBOARD DE ENGENHARIA & P&D
// --------------------------------------------------------------------------------------
export function IndustrialEngenhariaDashboardView({
  currentUser,
  db,
  onNavigateTab
}: EngineeringProps) {
  const boms = db.boms || [];
  const parts = db.parts || [];
  const activeBoms = boms.filter((b: any) => b.status === 'active' || b.status === 'APPROVED');
  const totalEngCost = boms.reduce((acc: number, b: any) => acc + (Number(b.totalCost) || Number(b.cost) || 0), 0);
  const avgEngCost = boms.length > 0 ? totalEngCost / boms.length : 485.50;

  return (
    <div className="space-y-6">
      {/* CARDS DE MÉTRICAS DA ENGENHARIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estruturas Ativas</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300">
              BOM Homologadas
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeBoms.length || 8} Listas BOM
          </div>
          <div className="text-xs text-slate-500 mt-1">Multi-nível e mononível liberadas para fabricação</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo Médio Produto</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              BOM Ponderada
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            R$ {avgEngCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Matéria-prima direta calculada por explosão</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Integração CAD 3D</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              SolidWorks API
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">Online :18285</div>
          <div className="text-xs text-slate-500 mt-1">Add-in CAD Sync v2.4.1 conectado ao COM</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revisões ECN</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              Eng. Alteração
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">3 Ordens ECN</div>
          <div className="text-xs text-slate-500 mt-1">1 em análise técnica e 2 implantadas na fábrica</div>
        </div>
      </div>

      {/* PAINEL DE ACESSO RÁPIDO ÀS DISCIPLINAS DE ENGENHARIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab && onNavigateTab('boms')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 p-5 rounded-xl shadow-xs transition cursor-pointer group"
        >
          <div className="text-2xl mb-2">📋</div>
          <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 transition text-sm">
            Estruturas de Produto (BOM)
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Árvore de componentes, quantidades teóricas, custos unitários e explosão de materiais.
          </p>
          <span className="inline-block mt-3 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
            Abrir Árvore de Materiais →
          </span>
        </div>

        <div
          onClick={() => onNavigateTab && onNavigateTab('product_development')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 p-5 rounded-xl shadow-xs transition cursor-pointer group"
        >
          <div className="text-2xl mb-2">💡</div>
          <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition text-sm">
            Desenvolvimento de Produtos
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Gestão do ciclo de vida: do conceito, modelagem 3D, protótipo à homologação fabril.
          </p>
          <span className="inline-block mt-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">
            Acessar Portfólio P&D →
          </span>
        </div>

        <div
          onClick={() => onNavigateTab && onNavigateTab('technical_datasheet')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 p-5 rounded-xl shadow-xs transition cursor-pointer group"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition text-sm">
            Fichas Técnicas & Processos
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Roteiros de usinagem, tempos de ciclo, tempos de setup e postos de trabalho da fábrica.
          </p>
          <span className="inline-block mt-3 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            Ver Roteiros de Fabricação →
          </span>
        </div>

        <div
          onClick={() => onNavigateTab && onNavigateTab('cad_solidworks_integrations')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-xl shadow-xs transition cursor-pointer group"
        >
          <div className="text-2xl mb-2">💻</div>
          <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition text-sm">
            Integração CAD SolidWorks
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Sincronização direta de montagens 3D .SLDASM/.SLDPRT, extração de BOM e Picking WMS.
          </p>
          <span className="inline-block mt-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Conectar com SolidWorks →
          </span>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 2. DESENVOLVIMENTO DE NOVOS PRODUTOS & PORTFÓLIO P&D
// --------------------------------------------------------------------------------------
export function IndustrialDesenvolvimentoProdutosView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onNavigateTab
}: EngineeringProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [selectedProd, setSelectedProd] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form Novo Produto
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('Válvulas & Tubulações Industriais');
  const [stage, setStage] = useState('CONCEITO');
  const [leadEng, setLeadEng] = useState('Eng. Marcelo Vieira');
  const [cadFile, setCadFile] = useState('');
  const [materials, setMaterials] = useState('');
  const [weightKg, setWeightKg] = useState('5.0');
  const [dimensions, setDimensions] = useState('');
  const [tolerances, setTolerances] = useState('ISO 2768-m');
  const [targetCost, setTargetCost] = useState('450.00');
  const [salePrice, setSalePrice] = useState('1100.00');

  const products = useMemo(() => {
    return db.industrialProductDev && db.industrialProductDev.length > 0
      ? db.industrialProductDev
      : [
          {
            id: 'DEV-PROD-01',
            partNumber: 'VALV-ESF-DN50-316L',
            name: 'Válvula Esfera Flangeada DN50 PN16',
            category: 'Válvulas & Tubulações Industriais',
            stage: 'HOMOLOGADO',
            leadEngineer: 'Eng. Marcelo Vieira (CREA 506144)',
            cadFile: 'VALVULA-ESFERA-FLANGEADA-DN50.SLDASM',
            materials: 'Corpo Aço Inox ASTM A351 CF8M, Esfera AISI 316, Vedações PTFE Reforçado',
            weightKg: 8.45,
            dimensions: 'DN 50mm x Face-a-Face 178mm x Flange 165mm',
            tolerances: 'ISO 2768-mK / Classe de Pressão ANSI 150 / PN16',
            targetCost: 559.0,
            suggestedSalePrice: 1250.0,
            bomId: 'BOM-VALV-ESF-01',
            notes: 'Montagem modelada no SolidWorks 2025 com cálculo FEA aprovado para 25 bar.'
          },
          {
            id: 'DEV-PROD-02',
            partNumber: 'RED-PLANET-10-NM350',
            name: 'Redutor Planetário de Precisão 1:10 Torque 350 N.m',
            category: 'Transmissão Mecânica & Redutores',
            stage: 'PROTOTIPO',
            leadEngineer: 'Eng. Larissa Fontes',
            cadFile: 'REDUTOR-PLANETARIO-1-10.SLDASM',
            materials: 'Engrenagens Aço SAE 8620 Cementado, Carcaça Alumínio 7075-T6 Usinado',
            weightKg: 4.82,
            dimensions: 'Flange 90mm x Comprimento 165mm x Eixo 22mm',
            tolerances: 'Folga Angular (Backlash) < 5 arcmin / Batimento Eixo < 0.015mm',
            targetCost: 890.0,
            suggestedSalePrice: 2100.0,
            bomId: 'BOM-RED-02',
            notes: 'Protótipo em bancada dinamométrica. Ruído medido de 62 dBA.'
          },
          {
            id: 'DEV-PROD-03',
            partNumber: 'CIL-HIDR-100-50-400',
            name: 'Cilindro Hidráulico Industrial Dupla Ação Curso 400mm',
            category: 'Hidráulica & Automação Fabril',
            stage: 'MODELAGEM_CAD',
            leadEngineer: 'Eng. Marcelo Vieira',
            cadFile: 'CILINDRO-HIDRAULICO-HEAVY-DUTY.SLDASM',
            materials: 'Camisa Brunida ST52 BK+S, Haste Aço SAE 1045 Cromo Duro 30µm',
            weightKg: 24.1,
            dimensions: 'Diâm. Camisa 100mm x Haste 50mm x Curso 400mm',
            tolerances: 'Rugosidade Camisa Ra 0.2µm / Pressão Trabalho 210 bar (3000 PSI)',
            targetCost: 1450.0,
            suggestedSalePrice: 3200.0,
            bomId: 'BOM-CIL-03',
            notes: 'Em detalhamento de vedações Chevron e olhais de articulação.'
          }
        ];
  }, [db.industrialProductDev]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStage = stageFilter === 'ALL' || p.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [products, searchTerm, stageFilter]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !partNumber) {
      alert('Preencha o Nome e o Part Number do Produto.');
      return;
    }

    const newProd = {
      id: `DEV-PROD-${Date.now()}`,
      partNumber,
      name,
      category,
      stage,
      leadEngineer: leadEng,
      cadFile: cadFile || `${partNumber}.SLDASM`,
      materials: materials || 'Aço SAE 1045 / Inox 304',
      weightKg: Number(weightKg) || 1.0,
      dimensions: dimensions || 'Sob especificação dimensional',
      tolerances,
      targetCost: Number(targetCost) || 0,
      suggestedSalePrice: Number(salePrice) || 0,
      bomId: `BOM-${partNumber}`,
      notes: 'Cadastrado no módulo de Desenvolvimento de Produtos P&D.'
    };

    onUpdateDb((prev: any) => {
      const cur = prev.industrialProductDev || products;
      return {
        ...prev,
        industrialProductDev: [newProd, ...cur]
      };
    });

    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'PRODUTO_DEV_CRIADO',
        description: `Novo produto em desenvolvimento: ${name} (${partNumber})`,
        module: 'Engenharia'
      });
    }

    setShowModal(false);
    setName('');
    setPartNumber('');
    setMaterials('');
    setDimensions('');
  };

  const getStageBadge = (st: string) => {
    switch (st) {
      case 'CONCEITO':
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">1. Conceito / R&D</span>;
      case 'MODELAGEM_CAD':
        return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">2. Modelagem CAD 3D</span>;
      case 'PROTOTIPO':
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">3. Protótipo & Testes</span>;
      case 'HOMOLOGADO':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">4. Homologado para Produção</span>;
      case 'EM_LINHA':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">5. Em Linha Fabril</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* BARRA DE AÇÕES E MÉTRICAS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>💡</span> Desenvolvimento de Novos Produtos & Portfólio P&D ({filteredProducts.length})
          </h3>
          <p className="text-xs text-slate-500">
            Gestão do ciclo de vida da engenharia, parâmetros dimensionais, tolerâncias e materiais.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>➕</span> Cadastrar Produto P&D
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('cad_solidworks_integrations')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>💻</span> Sincronizar com SolidWorks
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          placeholder="Filtrar por Part Number, Nome ou Categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white"
        />

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200"
        >
          <option value="ALL">Todas as Fases de P&D</option>
          <option value="CONCEITO">Conceito</option>
          <option value="MODELAGEM_CAD">Modelagem CAD 3D</option>
          <option value="PROTOTIPO">Protótipo & Testes</option>
          <option value="HOMOLOGADO">Homologado</option>
          <option value="EM_LINHA">Em Linha</option>
        </select>
      </div>

      {/* GRADE DE PRODUTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((prod: any) => (
          <div
            key={prod.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 hover:border-blue-400 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block">
                  {prod.partNumber}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{prod.name}</h4>
                <span className="text-[11px] text-slate-400">{prod.category}</span>
              </div>
              <div>{getStageBadge(prod.stage)}</div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg">
              <div>
                <span className="text-slate-400 block text-[10px]">Arquivo CAD SolidWorks:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{prod.cadFile}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Materiais Homologados:</span>
                <span className="text-slate-700 dark:text-slate-300">{prod.materials}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Peso Teórico:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{prod.weightKg} kg</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Custo Alvo Fabril:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">R$ {prod.targetCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setSelectedProd(prod)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 transition cursor-pointer"
              >
                Ver Detalhes Técnicos →
              </button>
              <button
                onClick={() => onNavigateTab && onNavigateTab('boms')}
                className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 rounded text-xs font-bold transition cursor-pointer"
              >
                Ver BOM
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOVO PRODUTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>➕</span> Iniciar Novo Desenvolvimento de Produto (P&D)
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conjunto Mancal Bipartido com Rolamento Autocompensador"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Part Number / Código de Engenharia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MANC-BIP-2026-01"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Fase Inicial de P&D
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="CONCEITO">1. Conceito / R&D</option>
                    <option value="MODELAGEM_CAD">2. Modelagem CAD 3D</option>
                    <option value="PROTOTIPO">3. Protótipo & Testes</option>
                    <option value="HOMOLOGADO">4. Homologado para Produção</option>
                    <option value="EM_LINHA">5. Em Linha Fabril</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Arquivo CAD SolidWorks
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PRODUTO-NOVO.SLDASM"
                    value={cadFile}
                    onChange={(e) => setCadFile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Engenheiro Responsável
                  </label>
                  <input
                    type="text"
                    value={leadEng}
                    onChange={(e) => setLeadEng(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Materiais & Ligas Metálicas Homologadas
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ferro Fundido Nodular GGG-40 / Aço SAE 1045"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Peso Estimado (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Custo Alvo de Engenharia (R$)
                  </label>
                  <input
                    type="number"
                    value={targetCost}
                    onChange={(e) => setTargetCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Registrar Produto em P&D
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 3. FICHA TÉCNICA DE PROCESSO & ROTEIROS DE FABRICAÇÃO
// --------------------------------------------------------------------------------------
export function IndustrialFichaTecnicaView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onNavigateTab
}: EngineeringProps) {
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);

  const datasheets = useMemo(() => {
    return db.industrialDatasheets && db.industrialDatasheets.length > 0
      ? db.industrialDatasheets
      : [
          {
            id: 'FT-2026-001',
            productPartNumber: 'VALV-ESF-DN50-316L',
            productName: 'Válvula Esfera Flangeada DN50 PN16',
            revision: 'Rev 02',
            effectiveDate: '2026-08-15',
            leadProcessEngineer: 'Eng. Cláudio Prado',
            totalStandardTimeMin: 145,
            operations: [
              { seq: 10, name: 'Corte em Serra de Fita CNC', workCenter: 'POSTO-CORTE-01 (Serra Franho)', setupTimeMin: 15, cycleTimeMin: 6, tools: 'Lâmina Bimetálica M42 4/6 dentes', inspectionCriteria: 'Comprimento nominal ±0.5mm, esquadro de corte 90°' },
              { seq: 20, name: 'Torneamento CNC - Usinagem do Corpo', workCenter: 'POSTO-CNC-01 (Torno Nardini Fastrace)', setupTimeMin: 35, cycleTimeMin: 22, tools: 'Pastilhas Metal Duro WNMG 080408 Sandvik', inspectionCriteria: 'Diâmetro interno Ø50 H7 (+0.030/0), roscas NPT conforme calibrador tampão' },
              { seq: 30, name: 'Furação e Fresamento de Flanges', workCenter: 'POSTO-USINAGEM-02 (Centro Romi D800)', setupTimeMin: 40, cycleTimeMin: 28, tools: 'Broca Metal Duro Integral Ø18mm, Fresa de Topo Ø50mm', inspectionCriteria: 'Posição dos 4 furos PCD 125mm ±0.15mm, planaridade da face flangeada Ra 1.6' },
              { seq: 40, name: 'Polimento da Esfera e Haste', workCenter: 'POSTO-POLIMENTO-01 (Bancada de Acabamento)', setupTimeMin: 10, cycleTimeMin: 18, tools: 'Pasta Diamantada 3µm + Disco de Feltro', inspectionCriteria: 'Esfericidade < 0.008mm, Rugosidade Ra < 0.1µm espelhado' },
              { seq: 50, name: 'Montagem do Conjunto e Vedações', workCenter: 'POSTO-MONTAGEM-01 (Célula Válvulas)', setupTimeMin: 10, cycleTimeMin: 15, tools: 'Torquímetro com soquete 19mm (Torque 45 N.m)', inspectionCriteria: 'Torque de acionamento manual suave sem folga axial na haste' },
              { seq: 60, name: 'Ensaio Hidrostático & Estanqueidade', workCenter: 'POSTO-TESTE-CQ (Bancada Teste Hidráulico)', setupTimeMin: 10, cycleTimeMin: 12, tools: 'Manômetro Calibrado RBC + Bomba Teste 30 bar', inspectionCriteria: 'Pressão de ensaio 24 bar mantida por 3 minutos sem perda de pressão' },
              { seq: 70, name: 'Limpeza, Gravação a Laser e Embalagem', workCenter: 'POSTO-EMBALAGEM-01', setupTimeMin: 5, cycleTimeMin: 8, tools: 'Laser de Fibra 30W + Caixas com Espuma', inspectionCriteria: 'Gravação legível: Part Number, Lote, Pressão Máxima e Logo da Empresa' }
            ]
          },
          {
            id: 'FT-2026-002',
            productPartNumber: 'RED-PLANET-10-NM350',
            productName: 'Redutor Planetário de Precisão 1:10 Torque 350 N.m',
            revision: 'Rev 01',
            effectiveDate: '2026-07-20',
            leadProcessEngineer: 'Eng. Cláudio Prado',
            totalStandardTimeMin: 220,
            operations: [
              { seq: 10, name: 'Usinagem da Carcaça em Alumínio 7075', workCenter: 'POSTO-USINAGEM-01 (Centro 5 Eixos Hermle)', setupTimeMin: 50, cycleTimeMin: 45, tools: 'Fresa de Alumínio Pastilhada Sandvik', inspectionCriteria: 'Concentricidade dos mancais < 0.010mm, alojamento de rolamento H6' },
              { seq: 20, name: 'Denteamento de Engrenagens Solares e Satélites', workCenter: 'POSTO-DENTEADORA-01 (Fellows CNC)', setupTimeMin: 60, cycleTimeMin: 35, tools: 'Caracol Módulo 1.5 DIN 3962 Classe 6', inspectionCriteria: 'Erro acumulado de passo < 0.008mm, perfil de dente involuta verificado' },
              { seq: 30, name: 'Tratamento Térmico de Cementação e Têmpera', workCenter: 'FORNECEDOR-EXTERNO (Trat. Térmico TermoAço)', setupTimeMin: 0, cycleTimeMin: 0, tools: 'Forno de Atmosfera Controlada', inspectionCriteria: 'Dureza superficial 58-62 HRC, profundidade de camada 0.8mm' },
              { seq: 40, name: 'Retífica de Flancos de Dente e Eixos', workCenter: 'POSTO-RETIFICA-01 (Retífica Studer CNC)', setupTimeMin: 45, cycleTimeMin: 30, tools: 'Rebolo CBN Dressado', inspectionCriteria: 'Classe de precisão DIN 3962 Classe 4 / Ra 0.4µm' },
              { seq: 50, name: 'Montagem em Sala Limpa e Lubrificação', workCenter: 'SALA-LIMPA-MONTAGEM', setupTimeMin: 15, cycleTimeMin: 25, tools: 'Graxa Sintética Klüber Isoflex Topas L32', inspectionCriteria: 'Folga entre dentes (Backlash) ajustada < 5 arcmin' },
              { seq: 60, name: 'Teste Dinamométrico de Rendimento e Ruído', workCenter: 'POSTO-TESTE-DINAMOMETRO', setupTimeMin: 15, cycleTimeMin: 20, tools: 'Dinamômetro Magtrol + Decibelímetro', inspectionCriteria: 'Eficiência mecânica > 94% a 3000 RPM, ruído < 65 dBA' }
            ]
          }
        ];
  }, [db.industrialDatasheets]);

  const currentSheet = datasheets[selectedSheetIndex] || datasheets[0];

  return (
    <div className="space-y-6">
      {/* SELETOR DE FICHA TÉCNICA E AÇÕES */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>⚙️</span> Ficha Técnica de Engenharia & Roteiro de Processo Fabril
          </h3>
          <p className="text-xs text-slate-500">
            Definição da sequência operacional de fabricação, tempos de ciclo, setup de máquinas e critérios de inspeção.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedSheetIndex}
            onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold"
          >
            {datasheets.map((ds: any, idx: number) => (
              <option key={ds.id} value={idx}>
                {ds.productPartNumber} ({ds.revision}) - {ds.productName}
              </option>
            ))}
          </select>
          <button
            onClick={() => alert('Folha de Processo enviada para impressão e emissão de OS.')}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
          >
            Imprimir Roteiro
          </button>
        </div>
      </div>

      {/* CABEÇALHO DO ROTEIRO ATIVO */}
      {currentSheet && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Produto / Part Number</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {currentSheet.productPartNumber}
              </span>
              <span className="text-slate-600 dark:text-slate-300 block text-[11px] mt-0.5">{currentSheet.productName}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Revisão Homologada</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{currentSheet.revision}</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Vigência: {currentSheet.effectiveDate}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Tempo Padrão de Fabricação</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                {currentSheet.totalStandardTimeMin} minutos
              </span>
              <span className="text-slate-400 block text-[11px] mt-0.5">
                {(currentSheet.totalStandardTimeMin / 60).toFixed(1)} horas / conjunto montado
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Engenheiro de Processos</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{currentSheet.leadProcessEngineer}</span>
              <span className="text-emerald-600 block text-[11px] font-medium mt-0.5">● Roteiro Validado</span>
            </div>
          </div>

          {/* TABELA DE OPERAÇÕES SEQUENCIAIS */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-semibold text-center w-16">Seq.</th>
                  <th className="py-3 px-4 font-semibold">Operação & Descrição do Processo</th>
                  <th className="py-3 px-4 font-semibold">Posto de Trabalho / Máquina</th>
                  <th className="py-3 px-3 font-semibold text-center">Setup (min)</th>
                  <th className="py-3 px-3 font-semibold text-center">Ciclo (min/pç)</th>
                  <th className="py-3 px-4 font-semibold">Ferramentas & Dispositivos</th>
                  <th className="py-3 px-4 font-semibold">Critério de Inspeção CQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {currentSheet.operations.map((op: any) => (
                  <tr key={op.seq} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                      {op.seq}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {op.name}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {op.workCenter}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                      {op.setupTimeMin}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {op.cycleTimeMin}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-300">
                      {op.tools}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded">
                      {op.inspectionCriteria}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 4. CONTROLE DE REVISÕES & ECN (ENGINEERING CHANGE NOTICE)
// --------------------------------------------------------------------------------------
export function IndustrialControleRevisoesView({
  currentUser,
  db,
  onUpdateDb,
  onAddHistoryLog,
  onNavigateTab
}: EngineeringProps) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [partNumber, setPartNumber] = useState('VALV-ESF-DN50-316L');
  const [fromRev, setFromRev] = useState('Rev 02');
  const [toRev, setToRev] = useState('Rev 03');
  const [reason, setReason] = useState('MELHORIA_PROCESSO');
  const [description, setDescription] = useState('');
  const [disposition, setDisposition] = useState('CONSUMIR_ESTOQUE_ANTERIOR');

  const revisions = useMemo(() => {
    return db.industrialRevisions && db.industrialRevisions.length > 0
      ? db.industrialRevisions
      : [
          {
            id: 'ECN-2026-014',
            title: 'Otimização da Sede de Vedação em PTFE na Válvula Esfera DN50',
            productPartNumber: 'VALV-ESF-DN50-316L',
            fromRev: 'Rev 01',
            toRev: 'Rev 02',
            requestDate: '2026-08-10',
            approvalDate: '2026-08-15',
            requester: 'Eng. Marcelo Vieira (Engenharia de Produto)',
            approver: 'Diretoria Técnica & CQ',
            status: 'HOMOLOGADA',
            reason: 'REDUCAO_TORQUE',
            description: 'Adicionado chanfro de alívio de 15° na sede em PTFE para diminuir o torque de manobra em 22% sem perder estanqueidade.',
            stockDisposition: 'CONSUMIR_ESTOQUE_ANTERIOR',
            stockDispositionNotes: 'As 18 sedes do lote anterior podem ser consumidas normalmente em pedidos de pressão standard (até 16 bar).',
            cadDrawingUpdated: true,
            cadFileName: 'VALVULA-ESFERA-FLANGEADA-DN50-REV02.SLDASM'
          },
          {
            id: 'ECN-2026-015',
            title: 'Substituição do Parafuso de Fechamento por Inox 316 A4-70',
            productPartNumber: 'VALV-ESF-DN50-316L',
            fromRev: 'Rev 02',
            toRev: 'Rev 03',
            requestDate: '2026-09-02',
            approvalDate: '2026-09-09',
            requester: 'Eng. Larissa Fontes',
            approver: 'Gerência de Qualidade Fabril',
            status: 'IMPLANTADA_PRODUCAO',
            reason: 'RESISTENCIA_CORROSAO',
            description: 'Substituição dos parafusos sextavados M12x45 de Aço Inox 304 (A2-70) para Aço Inox 316 (A4-70) atendendo requisito de plantas químicas costeiras.',
            stockDisposition: 'RETRABALHAR_LOTE',
            stockDispositionNotes: 'Trocar parafusos em estoque nas 4 unidades montadas antes da expedição.',
            cadDrawingUpdated: true,
            cadFileName: 'VALVULA-ESFERA-FLANGEADA-DN50-REV03.SLDASM'
          },
          {
            id: 'ECN-2026-016',
            title: 'Redesenho dos Satélites para Redução de Inércia no Redutor 1:10',
            productPartNumber: 'RED-PLANET-10-NM350',
            fromRev: 'Rev 01',
            toRev: 'Rev 02',
            requestDate: '2026-09-12',
            approvalDate: null,
            requester: 'Eng. Larissa Fontes',
            approver: 'Em Análise pela Engenharia de Processo',
            status: 'EM_ANALISE',
            reason: 'MELHORIA_DESEMPENHO',
            description: 'Abertura de 3 furos de alívio nos corpos das 3 engrenagens satélites para reduzir o momento de inércia rotacional em 14%.',
            stockDisposition: 'CONSUMIR_ESTOQUE_ANTERIOR',
            stockDispositionNotes: 'Lote piloto em usinagem no centro Romi.',
            cadDrawingUpdated: true,
            cadFileName: 'SATELITE-COM-ALIVIO-REV02.SLDPRT'
          }
        ];
  }, [db.industrialRevisions]);

  const handleSaveEcn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Preencha o título e a justificativa técnica da alteração de engenharia.');
      return;
    }

    const newEcn = {
      id: `ECN-${new Date().getFullYear()}-0${revisions.length + 15}`,
      title,
      productPartNumber: partNumber,
      fromRev,
      toRev,
      requestDate: new Date().toISOString().split('T')[0],
      approvalDate: null,
      requester: currentUser?.name || 'Engenheiro Solicitante',
      approver: 'Em Análise Técnica',
      status: 'EM_ANALISE',
      reason,
      description,
      stockDisposition: disposition,
      stockDispositionNotes: 'Avaliação de impacto físico no almoxarifado WMS.',
      cadDrawingUpdated: false,
      cadFileName: `${partNumber}-${toRev}.SLDASM`
    };

    onUpdateDb((prev: any) => {
      const cur = prev.industrialRevisions || revisions;
      return {
        ...prev,
        industrialRevisions: [newEcn, ...cur]
      };
    });

    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'ECN_EMITIDA',
        description: `Ordem de Alteração de Engenharia ${newEcn.id} emitida para ${partNumber}`,
        module: 'Engenharia'
      });
    }

    setShowModal(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔄</span> Controle de Revisões de Engenharia & ECN (Engineering Change Notice)
          </h3>
          <p className="text-xs text-slate-500">
            Controle formal de alterações em desenhos técnicos, especificações, impacto em estoque e aprovação CQ.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span>➕</span> Emitir Nova ECN
        </button>
      </div>

      {/* LISTAGEM DE ECNs */}
      <div className="space-y-4">
        {revisions.map((ecn: any) => (
          <div
            key={ecn.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300">
                  {ecn.id}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ecn.title}</h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">
                  {ecn.fromRev} → <span className="text-blue-600 dark:text-blue-400 font-extrabold">{ecn.toRev}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ecn.status === 'IMPLANTADA_PRODUCAO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : ecn.status === 'HOMOLOGADA'
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ecn.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">{ecn.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg">
              <div>
                <span className="text-slate-400 block text-[10px]">Produto / Montagem:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ecn.productPartNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Disposição do Estoque Físico:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{ecn.stockDisposition}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Solicitante & Data:</span>
                <span className="text-slate-700 dark:text-slate-300">{ecn.requester} ({ecn.requestDate})</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOVA ECN */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>➕</span> Emitir Ordem de Alteração de Engenharia (ECN)
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEcn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Título da Alteração de Engenharia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Adequação de tolerância no alojamento do rolamento"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Part Number
                  </label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Revisão Atual
                  </label>
                  <input
                    type="text"
                    value={fromRev}
                    onChange={(e) => setFromRev(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nova Revisão
                  </label>
                  <input
                    type="text"
                    value={toRev}
                    onChange={(e) => setToRev(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Motivo da Alteração Técnica
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="MELHORIA_PROCESSO">Melhoria de Processo / Redução de Tempo</option>
                  <option value="REDUCAO_CUSTO">Redução de Custo de Matéria-Prima</option>
                  <option value="CORRECAO_DIMENSIONAL">Correção Dimensional / Tolerância</option>
                  <option value="SOLICITACAO_CLIENTE">Solicitação Técnica do Cliente</option>
                  <option value="NAO_CONFORMIDADE_CQ">Eliminação de Não Conformidade CQ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Justificativa & Detalhamento da Alteração *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva as alterações nos desenhos técnicos e processos fabris..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Destino do Estoque Físico Existente no Almoxarifado WMS
                </label>
                <select
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                >
                  <option value="CONSUMIR_ESTOQUE_ANTERIOR">Consumir Estoque Anterior normalmente até esgotar</option>
                  <option value="RETRABALHAR_LOTE">Retrabalhar Lote Físico no posto de usinagem</option>
                  <option value="SUCATEAR">Sucatear / Descartar peças antigas do estoque</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Emitir ECN para Análise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 5. UNIDADES DE MEDIDA INDUSTRIAIS & CONVERSÕES
// --------------------------------------------------------------------------------------
export function IndustrialUnidadesMedidaView() {
  const units = [
    { code: 'UN', name: 'Unidade', type: 'Discreto', factor: '1 UN', desc: 'Peças unitárias, eixos, motores, válvulas completas' },
    { code: 'PC', name: 'Peça', type: 'Discreto', factor: '1 PC', desc: 'Componentes usinados, estamparia, chapas cortadas' },
    { code: 'KG', name: 'Quilograma', type: 'Massa', factor: '1000 g', desc: 'Matérias-primas metálicas, tarugos, sucatas, pós' },
    { code: 'G', name: 'Grama', type: 'Massa', factor: '0.001 kg', desc: 'Soldas nobres, pigmentos, aditivos químicos' },
    { code: 'M', name: 'Metro Linear', type: 'Comprimento', factor: '1000 mm', desc: 'Perfis estruturais, tubos, barras redondas laminadas' },
    { code: 'M2', name: 'Metro Quadrado', type: 'Área', factor: '10000 cm²', desc: 'Chapas de aço cortadas a laser, placas de desgaste' },
    { code: 'M3', name: 'Metro Cúbico', type: 'Volume', factor: '1000 L', desc: 'Gases industriais, tanques, tratamento térmico' },
    { code: 'L', name: 'Litro', type: 'Volume Líquido', factor: '1000 ml', desc: 'Óleos solúveis de usinagem, tintas epóxi, fluidos hidráulicos' },
    { code: 'ROLO', name: 'Rolo', type: 'Agrupamento', factor: 'Variável', desc: 'Arames de solda MIG/TIG, fitas de vedação PTFE' },
    { code: 'CENTO', name: 'Cento', type: 'Discreto Agrupado', factor: '100 un', desc: 'Parafusos, arruelas, porcas industriais' },
    { code: 'JG', name: 'Jogo / Kit', type: 'Kit Montagem', factor: 'Variável', desc: 'Kits de reparo de vedações, conjuntos de engrenagens' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📏</span> Unidades de Medida Industriais & Fatores de Conversão
        </h3>
        <p className="text-xs text-slate-500">
          Unidades padronizadas para listas de materiais (BOM), compras de matérias-primas e apontamentos fabris.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4 font-semibold w-24">Sigla / Código</th>
              <th className="py-3 px-4 font-semibold">Nome da Unidade</th>
              <th className="py-3 px-4 font-semibold">Grandeza / Tipo</th>
              <th className="py-3 px-4 font-semibold">Fator de Referência</th>
              <th className="py-3 px-4 font-semibold">Aplicação na Indústria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {units.map((u) => (
              <tr key={u.code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{u.code}</td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{u.name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
                    {u.type}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{u.factor}</td>
                <td className="py-3 px-4 text-slate-500">{u.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
