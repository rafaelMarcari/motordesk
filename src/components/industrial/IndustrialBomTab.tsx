/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK - MÓDULO INDUSTRIAL & PCP: ESTRUTURAS DE PRODUTO (BOM)
 * Interface intuitiva para cadastro de Produtos Acabados, Matérias-Primas e Componentes
 */

import React, { useState, useMemo } from 'react';
import { 
  Layers, Search, Plus, Eye, ArrowRight, Play, Check, X, 
  Trash2, AlertCircle, DollarSign, Boxes, Sparkles, Package,
  Wrench, Edit3, HelpCircle, CheckCircle2, ChevronDown, RefreshCw,
  TrendingUp, Clock, Info, ShieldCheck
} from 'lucide-react';
import { BillOfMaterials, Part, User } from '../../types';

interface BomItemRow {
  mode: 'select' | 'custom';
  componentPartId: string;
  customName: string;
  customCode: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lossPercentage: number;
  notes?: string;
}

interface IndustrialBomTabProps {
  boms: BillOfMaterials[];
  parts: Part[];
  currentUser: User;
  activeCompanyId?: string;
  onSelectBomForOp: (bom: BillOfMaterials) => void;
  onSaveBom: (bom: BillOfMaterials) => void;
  onSavePart?: (part: Part) => void;
  onLoadSampleIndustrialData?: () => void;
}

export const IndustrialBomTab: React.FC<IndustrialBomTabProps> = ({
  boms,
  parts,
  currentUser,
  activeCompanyId = 'comp-1',
  onSelectBomForOp,
  onSaveBom,
  onSavePart,
  onLoadSampleIndustrialData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBom, setSelectedBom] = useState<BillOfMaterials | null>(null);
  const [showNewBomModal, setShowNewBomModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states for New BOM
  const [productSelectionMode, setProductSelectionMode] = useState<'select' | 'new'>('select');
  const [selectedFinishedPartId, setSelectedFinishedPartId] = useState('');
  const [partSearchFilter, setPartSearchFilter] = useState('');

  // New Product fields (when creating a new finished good directly in the BOM modal)
  const [newProductName, setNewProductName] = useState('');
  const [newProductCode, setNewProductCode] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('UN');
  const [newProductCategory, setNewProductCategory] = useState('Sistemas Hidráulicos & Manufatura');
  const [newProductBasePrice, setNewProductBasePrice] = useState<number>(550.00);

  // BOM metadata
  const [bomName, setBomName] = useState('');
  const [bomCode, setBomCode] = useState('');
  const [bomVersion, setBomVersion] = useState('v1.0');
  const [bomLaborCost, setBomLaborCost] = useState<number>(65.00);
  const [bomOverheadCost, setBomOverheadCost] = useState<number>(30.00);
  const [bomCycleHours, setBomCycleHours] = useState<number>(2.0);
  const [bomNotes, setBomNotes] = useState('');

  // BOM Items
  const [bomItems, setBomItems] = useState<BomItemRow[]>([
    {
      mode: 'select',
      componentPartId: '',
      customName: '',
      customCode: '',
      quantity: 1,
      unit: 'UN',
      unitCost: 0,
      lossPercentage: 0,
      notes: ''
    }
  ]);

  // Categorize parts for intuitive selection in comboboxes
  const finishedProductParts = useMemo(() => {
    return parts.filter(p => 
      p.itemType === 'produto_acabado' || 
      p.hasBom || 
      p.code?.startsWith('PA-') ||
      p.category?.toLowerCase().includes('acabado') ||
      p.category?.toLowerCase().includes('manufaturado') ||
      p.category?.toLowerCase().includes('hidráulico') ||
      p.category?.toLowerCase().includes('mecatrônica') ||
      p.category?.toLowerCase().includes('pneumática')
    );
  }, [parts]);

  const rawMaterialParts = useMemo(() => {
    return parts.filter(p => 
      p.itemType === 'materia_prima' || 
      p.code?.startsWith('MP-') ||
      p.category?.toLowerCase().includes('matéria') ||
      p.category?.toLowerCase().includes('metal') ||
      p.category?.toLowerCase().includes('aço')
    );
  }, [parts]);

  const componentParts = useMemo(() => {
    return parts.filter(p => 
      p.itemType === 'componente' || 
      p.code?.startsWith('CP-') ||
      p.category?.toLowerCase().includes('componente') ||
      p.category?.toLowerCase().includes('rolamento') ||
      p.category?.toLowerCase().includes('vedação') ||
      p.category?.toLowerCase().includes('motor')
    );
  }, [parts]);

  const supplyParts = useMemo(() => {
    return parts.filter(p => 
      p.itemType === 'insumo' || 
      p.code?.startsWith('INS-') ||
      p.category?.toLowerCase().includes('insumo') ||
      p.category?.toLowerCase().includes('fixador') ||
      p.category?.toLowerCase().includes('óleo') ||
      p.category?.toLowerCase().includes('fluido')
    );
  }, [parts]);

  const generalParts = useMemo(() => {
    const ids = new Set([
      ...finishedProductParts.map(p => p.id),
      ...rawMaterialParts.map(p => p.id),
      ...componentParts.map(p => p.id),
      ...supplyParts.map(p => p.id)
    ]);
    return parts.filter(p => !ids.has(p.id));
  }, [parts, finishedProductParts, rawMaterialParts, componentParts, supplyParts]);

  // Quick reset modal form
  const handleOpenNewBomModal = () => {
    // If no finished products exist, default to 'new' mode so the user isn't stuck with an empty combobox
    if (finishedProductParts.length === 0 && parts.length === 0) {
      setProductSelectionMode('new');
    } else {
      setProductSelectionMode('select');
    }

    setSelectedFinishedPartId('');
    setNewProductName('');
    setNewProductCode(`PA-IND-${Math.floor(100 + Math.random() * 900)}`);
    setNewProductUnit('UN');
    setNewProductCategory('Sistemas Hidráulicos & Manufatura');
    setNewProductBasePrice(480.00);

    setBomName('');
    setBomCode(`BOM-IND-${Math.floor(100 + Math.random() * 900)}`);
    setBomVersion('v1.0');
    setBomLaborCost(60.00);
    setBomOverheadCost(25.00);
    setBomCycleHours(2.0);
    setBomNotes('');

    // Pre-populate with one empty row or intelligent first component
    const firstComponent = rawMaterialParts[0] || componentParts[0] || parts[0];
    if (firstComponent) {
      setBomItems([
        {
          mode: 'select',
          componentPartId: firstComponent.id,
          customName: firstComponent.name,
          customCode: firstComponent.code || '',
          quantity: 1,
          unit: firstComponent.unit || 'UN',
          unitCost: firstComponent.costPrice || 25.00,
          lossPercentage: 2,
          notes: ''
        }
      ]);
    } else {
      setBomItems([
        {
          mode: 'custom',
          componentPartId: '',
          customName: 'Chapa de Aço Carbono SAE 1020 3mm',
          customCode: 'MP-CH-1020',
          quantity: 0.5,
          unit: 'M²',
          unitCost: 48.00,
          lossPercentage: 5,
          notes: 'Corte a laser e conformação'
        }
      ]);
    }

    setShowNewBomModal(true);
  };

  // Helper: auto-generate code
  const handleGenerateProductCode = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const code = `PA-${randomNum}`;
    setNewProductCode(code);
    if (!bomCode) {
      setBomCode(`BOM-${code}`);
    }
  };

  // Pre-fill realistic industrial items
  const handlePreFillSuggestedItems = () => {
    const foundChapa = parts.find(p => p.code?.includes('CH') || p.name?.toLowerCase().includes('chapa'));
    const foundEixo = parts.find(p => p.code?.includes('EX') || p.name?.toLowerCase().includes('eixo'));
    const foundRolamento = parts.find(p => p.code?.includes('RL') || p.name?.toLowerCase().includes('rolamento'));
    const foundRetentor = parts.find(p => p.code?.includes('RT') || p.name?.toLowerCase().includes('retentor'));
    const foundParafuso = parts.find(p => p.code?.includes('PF') || p.name?.toLowerCase().includes('parafuso'));

    setBomItems([
      {
        mode: foundChapa ? 'select' : 'custom',
        componentPartId: foundChapa?.id || '',
        customName: foundChapa?.name || 'Chapa de Aço Carbono SAE 1020 3mm',
        customCode: foundChapa?.code || 'MP-CH-1020',
        quantity: 0.5,
        unit: foundChapa?.unit || 'M²',
        unitCost: foundChapa?.costPrice || 48.00,
        lossPercentage: 5,
        notes: 'Corte a laser e estampagem da carcaça'
      },
      {
        mode: foundEixo ? 'select' : 'custom',
        componentPartId: foundEixo?.id || '',
        customName: foundEixo?.name || 'Eixo Retificado Aço 4140 Ø 25mm',
        customCode: foundEixo?.code || 'MP-EX-4140',
        quantity: 0.4,
        unit: foundEixo?.unit || 'M',
        unitCost: foundEixo?.costPrice || 35.00,
        lossPercentage: 3,
        notes: 'Usinagem CNC do eixo rotor'
      },
      {
        mode: foundRolamento ? 'select' : 'custom',
        componentPartId: foundRolamento?.id || '',
        customName: foundRolamento?.name || 'Rolamento de Esferas Blindado SKF 6205-2RS',
        customCode: foundRolamento?.code || 'CP-RL-6205',
        quantity: 2,
        unit: foundRolamento?.unit || 'UN',
        unitCost: foundRolamento?.costPrice || 18.50,
        lossPercentage: 0,
        notes: 'Mancais de apoio de alta rotação'
      },
      {
        mode: foundRetentor ? 'select' : 'custom',
        componentPartId: foundRetentor?.id || '',
        customName: foundRetentor?.name || 'Retentor de Óleo Duplo Viton 25x47x7',
        customCode: foundRetentor?.code || 'CP-RT-2547',
        quantity: 2,
        unit: foundRetentor?.unit || 'UN',
        unitCost: foundRetentor?.costPrice || 12.00,
        lossPercentage: 2,
        notes: 'Vedação resistente a altas temperaturas'
      },
      {
        mode: foundParafuso ? 'select' : 'custom',
        componentPartId: foundParafuso?.id || '',
        customName: foundParafuso?.name || 'Parafuso Sextavado Aço Inox M8x30 com Arruela',
        customCode: foundParafuso?.code || 'INS-PF-M830',
        quantity: 0.1,
        unit: foundParafuso?.unit || 'CX',
        unitCost: foundParafuso?.costPrice || 22.00,
        lossPercentage: 0,
        notes: 'Fixação de tampa e flange'
      }
    ]);
  };

  const handleAddItemRow = (mode: 'select' | 'custom' = 'select') => {
    // If parts are empty, default row to 'custom' mode
    const effectiveMode = parts.length === 0 ? 'custom' : mode;
    setBomItems(prev => [
      ...prev,
      {
        mode: effectiveMode,
        componentPartId: '',
        customName: '',
        customCode: '',
        quantity: 1,
        unit: 'UN',
        unitCost: 10.0,
        lossPercentage: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setBomItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemPartChange = (index: number, partId: string) => {
    const selectedPart = parts.find(p => p.id === partId);
    setBomItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          componentPartId: partId,
          customName: selectedPart?.name || '',
          customCode: selectedPart?.code || '',
          unit: selectedPart?.unit || 'UN',
          unitCost: selectedPart?.costPrice || selectedPart?.price || 15.00
        };
      }
      return item;
    }));
  };

  // Real-time calculations for BOM modal
  const calculatedItemsTotal = useMemo(() => {
    return bomItems.reduce((sum, item) => {
      const effectiveQty = item.quantity * (1 + (item.lossPercentage || 0) / 100);
      return sum + (effectiveQty * (item.unitCost || 0));
    }, 0);
  }, [bomItems]);

  const calculatedTotalUnitCost = useMemo(() => {
    return calculatedItemsTotal + Number(bomLaborCost || 0) + Number(bomOverheadCost || 0);
  }, [calculatedItemsTotal, bomLaborCost, bomOverheadCost]);

  const calculatedSuggestedSalePrice = useMemo(() => {
    return calculatedTotalUnitCost * 1.55; // 55% standard industrial markup
  }, [calculatedTotalUnitCost]);

  // Handle Form Submission
  const handleCreateBomSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finishedPartId = selectedFinishedPartId;
    let finishedName = '';
    let finishedCode = '';

    if (productSelectionMode === 'select') {
      const selectedPart = parts.find(p => p.id === selectedFinishedPartId);
      if (!selectedPart) {
        alert('Por favor, selecione um Produto Acabado do catálogo ou use a opção "Cadastrar Novo Produto Acabado".');
        return;
      }
      finishedPartId = selectedPart.id;
      finishedName = selectedPart.name;
      finishedCode = selectedPart.code || 'PA';
    } else {
      if (!newProductName.trim()) {
        alert('Por favor, informe o Nome do Produto Acabado.');
        return;
      }
      finishedPartId = `prt-pa-${Date.now()}`;
      finishedName = newProductName.trim();
      finishedCode = newProductCode.trim() || `PA-${Math.floor(100 + Math.random() * 900)}`;

      // Automatically register this new finished product into the company's catalog
      const newPart: Part = {
        id: finishedPartId,
        companyId: activeCompanyId,
        name: finishedName,
        code: finishedCode,
        stock: 0,
        reservedStock: 0,
        inProductionStock: 0,
        price: Number(newProductBasePrice) || calculatedSuggestedSalePrice,
        costPrice: calculatedTotalUnitCost,
        unit: newProductUnit || 'UN',
        category: newProductCategory || 'Sistemas Manufaturados',
        itemType: 'produto_acabado',
        hasBom: true,
        bomId: `bom-${Date.now()}`,
        minStock: 5,
        leadTimeDays: 5
      };

      onSavePart?.(newPart);
    }

    // Verify at least one item has valid info
    if (bomItems.length === 0) {
      alert('Adicione pelo menos um insumo, matéria-prima ou componente à estrutura.');
      return;
    }

    const createdBomId = `bom-${Date.now()}`;

    // Process items and optionally register custom ones into the catalog
    const processedItems = bomItems.map((item, idx) => {
      let componentId = item.componentPartId;
      let compName = item.customName;
      let compCode = item.customCode;
      let compUnit = item.unit || 'UN';
      let compCost = Number(item.unitCost) || 10.0;

      if (item.mode === 'select') {
        const found = parts.find(p => p.id === item.componentPartId);
        if (found) {
          compName = found.name;
          compCode = found.code || `COMP-${idx + 1}`;
          compUnit = found.unit || 'UN';
          compCost = item.unitCost || found.costPrice || 10.0;
        }
      } else {
        // Mode is custom: automatically create this part in the catalog for reuse
        if (!componentId) {
          componentId = `prt-comp-${Date.now()}-${idx}`;
          const newComponentPart: Part = {
            id: componentId,
            companyId: activeCompanyId,
            name: compName || `Componente ${idx + 1}`,
            code: compCode || `MP-${Math.floor(100 + Math.random() * 900)}`,
            stock: 0,
            price: compCost * 1.5,
            costPrice: compCost,
            unit: compUnit,
            category: 'Insumos & Matérias-Primas',
            itemType: 'materia_prima',
            minStock: 10
          };
          onSavePart?.(newComponentPart);
        }
      }

      const effectiveQty = item.quantity * (1 + (item.lossPercentage || 0) / 100);
      const totalCost = effectiveQty * compCost;

      return {
        id: `bi-${Date.now()}-${idx}`,
        componentPartId: componentId || `temp-comp-${idx}`,
        componentPartName: compName || 'Insumo Técnico',
        componentPartCode: compCode || `COD-${idx + 1}`,
        quantity: item.quantity,
        effectiveQuantity: Number(effectiveQty.toFixed(3)),
        unit: compUnit,
        unitCost: compCost,
        lossPercentage: item.lossPercentage || 0,
        totalCost: Number(totalCost.toFixed(2)),
        notes: item.notes || ''
      };
    });

    const finalBomCode = bomCode.trim() || `BOM-${finishedCode}`;
    const finalBomName = bomName.trim() || finishedName;

    const newBom: BillOfMaterials = {
      id: createdBomId,
      companyId: activeCompanyId,
      finishedProductPartId: finishedPartId,
      finishedProductName: finishedName,
      finishedProductCode: finishedCode,
      name: finalBomName,
      code: finalBomCode,
      version: bomVersion || 'v1.0',
      active: true,
      laborCost: Number(bomLaborCost || 0),
      indirectCost: Number(bomOverheadCost || 0),
      totalMaterialCost: Number(calculatedItemsTotal.toFixed(2)),
      totalUnitCost: Number(calculatedTotalUnitCost.toFixed(2)),
      suggestedSalePrice: Number(calculatedSuggestedSalePrice.toFixed(2)),
      estimatedProductionHours: Number(bomCycleHours || 1.5),
      notes: bomNotes,
      items: processedItems
    };

    onSaveBom(newBom);
    setShowNewBomModal(false);
    setSelectedBom(newBom);

    setSuccessToast(`Estrutura BOM ${finalBomCode} cadastrada com sucesso!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const filteredBoms = boms.filter(bom => {
    const name = (bom.name || bom.finishedProductName || bom.finishedPartName || '').toLowerCase();
    const code = (bom.code || bom.finishedProductCode || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 text-emerald-200 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto acabado, código ou versão da BOM..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          {onLoadSampleIndustrialData && (
            <button
              onClick={onLoadSampleIndustrialData}
              title="Carregar catálogo de peças e estruturas de exemplo para esta empresa"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Carregar Exemplos</span>
            </button>
          )}

          <button
            onClick={handleOpenNewBomModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Estrutura (BOM)
          </button>
        </div>
      </div>

      {/* Empty State when no BOMs exist */}
      {filteredBoms.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-2xl mx-auto shadow-xs space-y-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Nenhuma Estrutura BOM Cadastrada
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              A Estrutura de Produto (BOM — Bill of Materials) é a receita técnica de fabricação. 
              Ela define quais matérias-primas, insumos, tempos e componentes formam o produto acabado.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenNewBomModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Cadastrar Estrutura (BOM)
            </button>

            {onLoadSampleIndustrialData && (
              <button
                onClick={onLoadSampleIndustrialData}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors border border-slate-200"
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> Carregar Catálogo e BOMs de Exemplo
              </button>
            )}
          </div>
        </div>
      )}

      {/* BOM Cards Grid */}
      {filteredBoms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoms.map(bom => {
            const itemsCount = bom.items?.length || 0;
            const unitCost = bom.totalUnitCost || 0;
            const salePrice = bom.suggestedSalePrice || unitCost * 1.55;

            return (
              <div 
                key={bom.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {bom.code || bom.finishedProductCode || 'BOM'}
                      </span>
                      <span className="ml-1.5 font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {bom.version || 'v1.0'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      bom.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {bom.active !== false ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
                    {bom.name || bom.finishedProductName || bom.finishedPartName}
                  </h4>

                  <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                    <Boxes className="w-3.5 h-3.5 text-slate-400" />
                    <span>{itemsCount} componentes na lista técnica</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Custo Unitário</span>
                      <span className="font-bold text-slate-900">R$ {unitCost.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Preço Sugerido</span>
                      <span className="font-bold text-emerald-700">R$ {salePrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedBom(bom)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalhes
                  </button>

                  <button
                    onClick={() => onSelectBomForOp(bom)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Gerar OP
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOM Detail Modal */}
      {selectedBom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {selectedBom.code || selectedBom.finishedProductCode}
                  </span>
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedBom.version || 'v1.0'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedBom.name || selectedBom.finishedProductName || selectedBom.finishedPartName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBom(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cost Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Matérias-Primas</span>
                <span className="font-bold text-slate-900">R$ {(selectedBom.totalMaterialCost || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Mão de Obra</span>
                <span className="font-bold text-slate-900">R$ {(selectedBom.laborCost || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Custos Indiretos (CIF)</span>
                <span className="font-bold text-slate-900">R$ {(selectedBom.indirectCost || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Custo Unitário Total</span>
                <span className="font-bold text-emerald-700">R$ {(selectedBom.totalUnitCost || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600" />
                Componentes e Insumos ({selectedBom.items?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5 text-center">Qtd Base</th>
                      <th className="p-2.5 text-center">% Perda</th>
                      <th className="p-2.5 text-center">Qtd Efetiva</th>
                      <th className="p-2.5 text-right">Custo Unit.</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedBom.items || []).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-mono text-[11px] font-semibold text-indigo-700">
                          {item.componentPartCode || '-'}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900">
                          {item.componentPartName}
                          {item.notes && (
                            <span className="block text-[10px] text-slate-400">{item.notes}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 text-center text-rose-600 font-semibold">
                          {item.lossPercentage ? `${item.lossPercentage}%` : '-'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-800">
                          {item.effectiveQuantity || item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 text-right text-slate-600">
                          R$ {(item.unitCost || 0).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          R$ {(item.totalCost || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedBom.notes && (
              <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <span className="font-bold block mb-0.5">Notas Técnicas:</span>
                {selectedBom.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBom(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => {
                  const b = selectedBom;
                  setSelectedBom(null);
                  onSelectBomForOp(b);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4" /> Gerar Ordem de Produção (OP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CADASTRO DE NOVA ESTRUTURA BOM - MODAL INTUITIVO                          */}
      {/* ========================================================================= */}
      {showNewBomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Cadastrar Nova Estrutura de Produto (BOM)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Associe um produto acabado e liste todas as matérias-primas e insumos necessários para sua manufatura.
                </p>
              </div>
              <button
                onClick={() => setShowNewBomModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBomSubmit} className="space-y-5 text-xs">
              {/* ========================================================= */}
              {/* SEÇÃO 1: PRODUTO ACABADO (COMBOBOX OU CADASTRO DIRETO)    */}
              {/* ========================================================= */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    1. Definição do Produto Acabado
                  </span>

                  {/* Toggle Mode: Selecionar vs Criar Novo */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setProductSelectionMode('select')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        productSelectionMode === 'select'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Selecionar do Estoque ({parts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductSelectionMode('new')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        productSelectionMode === 'new'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ➕ Cadastrar Novo Produto
                    </button>
                  </div>
                </div>

                {/* MODO A: SELECIONAR DO ESTOQUE */}
                {productSelectionMode === 'select' && (
                  <div className="space-y-3">
                    {parts.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-bold block">Nenhum item cadastrado no estoque desta empresa ainda.</span>
                            Você pode carregar o catálogo industrial de exemplo com 1 clique ou cadastrar um produto acabado agora mesmo.
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {onLoadSampleIndustrialData && (
                            <button
                              type="button"
                              onClick={() => {
                                onLoadSampleIndustrialData();
                                setProductSelectionMode('select');
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Carregar Catálogo de Exemplo
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setProductSelectionMode('new')}
                            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg text-xs cursor-pointer hover:bg-amber-100"
                          >
                            ➕ Digitar Novo Produto Manualmente
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-slate-700 font-semibold">
                          Selecione o Produto Acabado no Combobox:
                        </label>
                        <select
                          value={selectedFinishedPartId}
                          onChange={e => {
                            const partId = e.target.value;
                            setSelectedFinishedPartId(partId);
                            const p = parts.find(part => part.id === partId);
                            if (p) {
                              setBomName(p.name);
                              setBomCode(`BOM-${p.code || 'PRD'}`);
                            }
                          }}
                          required={productSelectionMode === 'select'}
                          className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-600 font-medium text-xs"
                        >
                          <option value="">-- Selecione o produto acabado que será fabricado --</option>

                          {finishedProductParts.length > 0 && (
                            <optgroup label="⭐ Produtos Acabados & Manufaturados">
                              {finishedProductParts.map(p => (
                                <option key={p.id} value={p.id}>
                                  [{p.code}] {p.name} ({p.unit || 'UN'}) - Estoque: {p.stock || 0}
                                </option>
                              ))}
                            </optgroup>
                          )}

                          {generalParts.length > 0 && (
                            <optgroup label="📦 Outros Itens do Catálogo">
                              {generalParts.map(p => (
                                <option key={p.id} value={p.id}>
                                  [{p.code}] {p.name} ({p.unit || 'UN'}) - Estoque: {p.stock || 0}
                                </option>
                              ))}
                            </optgroup>
                          )}

                          {rawMaterialParts.length > 0 && (
                            <optgroup label="⚙️ Matérias-Primas do Estoque">
                              {rawMaterialParts.map(p => (
                                <option key={p.id} value={p.id}>
                                  [{p.code}] {p.name} ({p.unit || 'UN'})
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>

                        {selectedFinishedPartId && (
                          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                            <span>
                              Item Selecionado: <strong className="text-slate-900">{parts.find(p => p.id === selectedFinishedPartId)?.name}</strong>
                            </span>
                            <span className="font-mono text-indigo-600">
                              Código: {parts.find(p => p.id === selectedFinishedPartId)?.code}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MODO B: CADASTRAR NOVO PRODUTO ACABADO DIRETAMENTE */}
                {productSelectionMode === 'new' && (
                  <div className="space-y-3 bg-white p-3 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-900 font-bold text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Novo Produto Acabado (será cadastrado automaticamente no inventário)
                      </span>
                      <button
                        type="button"
                        onClick={handleGenerateProductCode}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                      >
                        Gerar Código Sugerido
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-8">
                        <label className="block text-slate-700 font-semibold mb-1">Nome do Produto Acabado *</label>
                        <input
                          type="text"
                          value={newProductName}
                          onChange={e => {
                            setNewProductName(e.target.value);
                            if (!bomName) setBomName(e.target.value);
                          }}
                          placeholder="Ex: Bomba Hidráulica de Direção Industrial HD-200"
                          required={productSelectionMode === 'new'}
                          className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-slate-700 font-semibold mb-1">Código / SKU *</label>
                        <input
                          type="text"
                          value={newProductCode}
                          onChange={e => {
                            setNewProductCode(e.target.value);
                            if (!bomCode) setBomCode(`BOM-${e.target.value}`);
                          }}
                          placeholder="Ex: PA-BH-200"
                          required={productSelectionMode === 'new'}
                          className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Unidade de Medida</label>
                        <select
                          value={newProductUnit}
                          onChange={e => setNewProductUnit(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300"
                        >
                          <option value="UN">UN - Unidade</option>
                          <option value="CX">CX - Caixa / Conjunto</option>
                          <option value="KG">KG - Quilograma</option>
                          <option value="M">M - Metro Linear</option>
                          <option value="M²">M² - Metro Quadrado</option>
                          <option value="L">L - Litro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Categoria de Manufatura</label>
                        <input
                          type="text"
                          value={newProductCategory}
                          onChange={e => setNewProductCategory(e.target.value)}
                          placeholder="Ex: Sistemas Hidráulicos"
                          className="w-full p-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Preço Sugerido Base (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newProductBasePrice}
                          onChange={e => setNewProductBasePrice(Number(e.target.value))}
                          className="w-full p-2 rounded-lg border border-slate-300 font-bold text-emerald-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* SEÇÃO 2: DADOS DA ESTRUTURA (CÓDIGO, VERSÃO, TEMPOS)      */}
              {/* ========================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Código da Estrutura (BOM) *</label>
                  <input
                    type="text"
                    value={bomCode}
                    onChange={e => setBomCode(e.target.value)}
                    placeholder="Ex: BOM-HD-200"
                    required
                    className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Versão de Engenharia</label>
                  <input
                    type="text"
                    value={bomVersion}
                    onChange={e => setBomVersion(e.target.value)}
                    placeholder="v1.0"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tempo Ciclo (Horas)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bomCycleHours}
                    onChange={e => setBomCycleHours(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              {/* ========================================================= */}
              {/* SEÇÃO 3: MATÉRIAS-PRIMAS E COMPONENTES (DINÂMICO)         */}
              {/* ========================================================= */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Boxes className="w-4 h-4 text-indigo-600" />
                      2. Matérias-Primas, Componentes e Insumos ({bomItems.length})
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Escolha do catálogo ou digite novos componentes sob medida para esta estrutura.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreFillSuggestedItems}
                      title="Preencher componentes industriais sugeridos"
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Preencher Sugestão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddItemRow('select')}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Insumo
                    </button>
                  </div>
                </div>

                {/* List of Component Rows */}
                <div className="space-y-2">
                  {bomItems.map((item, index) => {
                    const effectiveQty = item.quantity * (1 + (item.lossPercentage || 0) / 100);
                    const rowCost = effectiveQty * (item.unitCost || 0);

                    return (
                      <div 
                        key={index}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 transition-all"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Item Selector / Input */}
                          <div className="col-span-12 md:col-span-5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-slate-600">
                                Insumo #{index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBomItems(prev => prev.map((it, i) => {
                                    if (i === index) {
                                      return {
                                        ...it,
                                        mode: it.mode === 'select' ? 'custom' : 'select'
                                      };
                                    }
                                    return it;
                                  }));
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                              >
                                {item.mode === 'select' ? '✏️ Digitar Manual' : '🔍 Escolher do Catálogo'}
                              </button>
                            </div>

                            {item.mode === 'select' ? (
                              <select
                                value={item.componentPartId}
                                onChange={e => handleItemPartChange(index, e.target.value)}
                                required
                                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                              >
                                <option value="">-- Selecione o insumo no estoque --</option>

                                {rawMaterialParts.length > 0 && (
                                  <optgroup label="⚙️ Matérias-Primas (Chapas, Tubos, Eixos)">
                                    {rawMaterialParts.map(p => (
                                      <option key={p.id} value={p.id}>
                                        [{p.code}] {p.name} ({p.unit}) - R$ {(p.costPrice || 0).toFixed(2)}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                {componentParts.length > 0 && (
                                  <optgroup label="🔩 Componentes (Rolamentos, Vedações, Motores)">
                                    {componentParts.map(p => (
                                      <option key={p.id} value={p.id}>
                                        [{p.code}] {p.name} ({p.unit}) - R$ {(p.costPrice || 0).toFixed(2)}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                {supplyParts.length > 0 && (
                                  <optgroup label="🧪 Insumos, Fixadores & Químicos">
                                    {supplyParts.map(p => (
                                      <option key={p.id} value={p.id}>
                                        [{p.code}] {p.name} ({p.unit}) - R$ {(p.costPrice || 0).toFixed(2)}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                {generalParts.length > 0 && (
                                  <optgroup label="📦 Outras Peças do Inventário">
                                    {generalParts.map(p => (
                                      <option key={p.id} value={p.id}>
                                        [{p.code}] {p.name} ({p.unit}) - R$ {(p.costPrice || 0).toFixed(2)}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            ) : (
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  value={item.customName}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setBomItems(prev => prev.map((it, i) => i === index ? { ...it, customName: val } : it));
                                  }}
                                  placeholder="Nome da matéria-prima..."
                                  required
                                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                                />
                                <input
                                  type="text"
                                  value={item.customCode}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setBomItems(prev => prev.map((it, i) => i === index ? { ...it, customCode: val } : it));
                                  }}
                                  placeholder="Código (ex: MP-01)"
                                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-mono uppercase"
                                />
                              </div>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className="col-span-4 md:col-span-2">
                            <span className="text-[10px] font-bold text-slate-600 block mb-1">Quantidade</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={item.quantity}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setBomItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: val } : it));
                                }}
                                required
                                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                              />
                              <span className="text-[11px] font-mono text-slate-500 w-8">{item.unit || 'UN'}</span>
                            </div>
                          </div>

                          {/* Loss % */}
                          <div className="col-span-4 md:col-span-2">
                            <span className="text-[10px] font-bold text-slate-600 block mb-1">% Perda / Quebra</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={item.lossPercentage}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setBomItems(prev => prev.map((it, i) => i === index ? { ...it, lossPercentage: val } : it));
                              }}
                              placeholder="0%"
                              className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs text-rose-700 font-semibold"
                            />
                          </div>

                          {/* Unit Cost */}
                          <div className="col-span-3 md:col-span-2">
                            <span className="text-[10px] font-bold text-slate-600 block mb-1">Custo Unit (R$)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitCost}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setBomItems(prev => prev.map((it, i) => i === index ? { ...it, unitCost: val } : it));
                              }}
                              required
                              className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                            />
                          </div>

                          {/* Action Delete */}
                          <div className="col-span-1 text-right flex items-center justify-end pt-4">
                            {bomItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(index)}
                                title="Remover item"
                                className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subtotal calculation note for this row */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>
                            Qtd Efetiva: <strong className="text-slate-800">{effectiveQty.toFixed(3)} {item.unit}</strong>
                          </span>
                          <span>
                            Subtotal Insumo: <strong className="text-slate-900">R$ {rowCost.toFixed(2)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ========================================================= */}
              {/* SEÇÃO 4: CUSTOS DE PRODUÇÃO & FORMAÇÃO DE PREÇO           */}
              {/* ========================================================= */}
              <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-3">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  3. Custos de Fabricação & Simulação de Preço
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mão de Obra Direta (R$/un)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bomLaborCost}
                      onChange={e => setBomLaborCost(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Custos Indiretos CIF (R$/un)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bomOverheadCost}
                      onChange={e => setBomOverheadCost(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                </div>

                {/* Real-time Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-200/60">
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block font-medium">Matérias-Primas</span>
                    <span className="font-bold text-slate-900 text-xs">R$ {calculatedItemsTotal.toFixed(2)}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block font-medium">Mão de Obra + CIF</span>
                    <span className="font-bold text-slate-900 text-xs">
                      R$ {(Number(bomLaborCost || 0) + Number(bomOverheadCost || 0)).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-[10px] text-indigo-700 block font-bold">Custo Unitário Total</span>
                    <span className="font-extrabold text-indigo-900 text-sm">
                      R$ {calculatedTotalUnitCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block font-bold">Preço Venda Sugerido</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      R$ {calculatedSuggestedSalePrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engineering Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notas de Engenharia e Especificações</label>
                <textarea
                  rows={2}
                  value={bomNotes}
                  onChange={e => setBomNotes(e.target.value)}
                  placeholder="Instruções de usinagem, calibração, ensaio estanqueidade, tolerâncias dimensionais..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewBomModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" /> Salvar Estrutura BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
