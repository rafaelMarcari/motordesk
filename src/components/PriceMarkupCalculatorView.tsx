import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Settings,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Percent,
  Tag,
  ArrowRight,
  ListFilter,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { AppDatabase, User, Product } from '../types';

export interface PriceMarkupCalculatorViewProps {
  db: AppDatabase;
  currentUser: User;
  onSaveProducts?: (products: Product[]) => void;
  onAddHistoryLog?: (entry: any) => void;
  initialCost?: number;
  initialVarejo?: number;
  initialAtacado?: number;
}

export interface PriceListRule {
  id: string;
  name: string;
  markupPct: number;
  type: 'markup' | 'margin';
  minQuantity: number;
  description: string;
}

export function PriceMarkupCalculatorView({
  db,
  currentUser,
  onSaveProducts,
  onAddHistoryLog,
  initialCost = 17.90,
  initialVarejo = 25.90,
  initialAtacado = 25.30
}: PriceMarkupCalculatorViewProps) {
  // Estados principais conforme Screenshot 2 (top)
  const [costPrice, setCostPrice] = useState<number>(initialCost);
  const [retailPrice, setRetailPrice] = useState<number>(initialVarejo);
  const [wholesalePrice, setWholesalePrice] = useState<number>(initialAtacado);

  // Modal "CONFIGURAR LISTAS DE PREÇO"
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [priceLists, setPriceLists] = useState<PriceListRule[]>([
    { id: '1', name: 'Tabela Padrão Varejo', markupPct: 44.69, type: 'margin', minQuantity: 1, description: 'Margem alvo balcão e consumidor final' },
    { id: '2', name: 'Tabela Atacado / Frotistas', markupPct: 41.34, type: 'margin', minQuantity: 5, description: 'Desconto escalonado para pedidos em volume' },
    { id: '3', name: 'Tabela Distribuidor / Concessionária', markupPct: 20.00, type: 'margin', minQuantity: 20, description: 'Preço especial para revendedores' },
    { id: '4', name: 'Tabela Promoção Sazonal', markupPct: 25.00, type: 'margin', minQuantity: 1, description: 'Campanhas promocionais temporárias' }
  ]);

  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Fórmulas de Margem de Lucro Bruta:
  // Margem (%) = ((Preço Venda - Custo) / Preço Venda) * 100
  const retailMarginPct = useMemo(() => {
    if (retailPrice <= 0) return 0;
    const margin = ((retailPrice - costPrice) / retailPrice) * 100;
    return Number(margin.toFixed(2));
  }, [costPrice, retailPrice]);

  const wholesaleMarginPct = useMemo(() => {
    if (wholesalePrice <= 0) return 0;
    const margin = ((wholesalePrice - costPrice) / wholesalePrice) * 100;
    return Number(margin.toFixed(2));
  }, [costPrice, wholesalePrice]);

  // Markup sobre o Custo:
  // Markup (%) = ((Preço Venda - Custo) / Custo) * 100
  const retailMarkupPct = useMemo(() => {
    if (costPrice <= 0) return 0;
    return Number((((retailPrice - costPrice) / costPrice) * 100).toFixed(2));
  }, [costPrice, retailPrice]);

  const wholesaleMarkupPct = useMemo(() => {
    if (costPrice <= 0) return 0;
    return Number((((wholesalePrice - costPrice) / costPrice) * 100).toFixed(2));
  }, [costPrice, wholesalePrice]);

  // Carregar dados de produto existente da base
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = (db.products || []).find(p => p.id === prodId);
    if (prod) {
      const c = Number(prod.costPrice) || 17.90;
      const r = Number(prod.salePrice) || 25.90;
      const w = Number(prod.wholesalePrice || (r * 0.95)) || 25.30;
      setCostPrice(c);
      setRetailPrice(r);
      setWholesalePrice(w);
    }
  };

  // Salvar no catálogo do banco
  const handleSaveToCatalog = () => {
    if (!selectedProductId) {
      alert('Selecione um produto do catálogo ou cadastre um novo para fixar os preços.');
      return;
    }
    const updated = (db.products || []).map(p => {
      if (p.id === selectedProductId) {
        return {
          ...p,
          costPrice: costPrice,
          salePrice: retailPrice,
          wholesalePrice: wholesalePrice
        };
      }
      return p;
    });

    if (onSaveProducts) {
      onSaveProducts(updated);
      alert('Preços atualizados com sucesso no cadastro do produto!');
    }
    if (onAddHistoryLog) {
      onAddHistoryLog({
        action: 'UPDATE_PRODUCT_PRICES',
        description: `Preços do produto #${selectedProductId} recalculados: Custo R$ ${costPrice.toFixed(2)}, Varejo R$ ${retailPrice.toFixed(2)} (${retailMarginPct}%), Atacado R$ ${wholesalePrice.toFixed(2)} (${wholesaleMarginPct}%).`,
        user: currentUser.name,
        date: new Date().toISOString()
      });
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800" id="view-price-markup-calculator">
      {/* CARD PRINCIPAL DE CÁLCULO DE PREÇOS (Exatamente como Screenshot 2) */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Header do Card */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-800">
              PREÇOS
            </h2>
          </div>
          <button
            type="button"
            id="btn-configurar-listas-preco"
            onClick={() => setShowConfigModal(true)}
            className="text-xs font-black tracking-wider text-sky-600 hover:text-sky-800 hover:underline uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>CONFIGURAR LISTAS DE PREÇO</span>
          </button>
        </div>

        {/* Seletor Rápido de Produto do Catálogo */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Package className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-bold text-slate-700">Simular com Produto da Base:</span>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800 flex-1 max-w-md focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="">-- Exemplo Padrão (Peça / Item de Consumo) --</option>
              {(db.products || []).map(p => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ''}{p.name} - Atual: R$ {p.salePrice ? p.salePrice.toFixed(2) : '0.00'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSaveToCatalog}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-3xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar no Cadastro do Produto</span>
          </button>
        </div>

        {/* Corpo dos Inputs e Badges de Margem (Conforme Screenshot 2 top) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: CUSTO (Última compra) */}
          <div className="md:col-span-5 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              CUSTO (Última compra)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm font-black text-slate-500 select-none">
                R$
              </span>
              <input
                id="input-preco-custo"
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-2.5 text-base font-bold font-mono text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition shadow-3xs"
                placeholder="17,90"
              />
            </div>
            <div className="text-[11px] text-slate-500 font-sans flex items-center gap-1 pt-1">
              <span className="font-semibold">Preço de entrada da NF-e / Custo Médio Ponderado.</span>
            </div>
          </div>

          {/* Coluna Direita: VENDA VAREJO E VENDA ATACADO */}
          <div className="md:col-span-7 space-y-6">
            {/* Bloco 1: VENDA VAREJO */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                VENDA VAREJO
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative w-44">
                  <span className="absolute left-3.5 top-2.5 text-sm font-black text-slate-500 select-none">
                    R$
                  </span>
                  <input
                    id="input-preco-venda-varejo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2 text-base font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition shadow-3xs"
                    placeholder="25,90"
                  />
                </div>

                {/* Badge de Margem de Lucro Verde em Destaque (Screenshot 2) */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                    {retailMarginPct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} %
                  </span>
                  <div className="flex flex-col text-[10.5px] font-extrabold uppercase text-slate-600 leading-tight">
                    <span>MARGEM DE LUCRO</span>
                    <span className="text-slate-400 font-bold">(APROXIMADA NO VAREJO)</span>
                  </div>
                </div>
              </div>
              <div className="text-[10.5px] font-mono text-slate-500 flex items-center gap-2 pt-0.5">
                <span>Markup s/ Custo: <strong>{retailMarkupPct}%</strong></span>
                <span>•</span>
                <span>Lucro Bruto: <strong className="text-emerald-700">R$ {(retailPrice - costPrice > 0 ? retailPrice - costPrice : 0).toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Bloco 2: VENDA ATACADO */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                VENDA ATACADO
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative w-44">
                  <span className="absolute left-3.5 top-2.5 text-sm font-black text-slate-500 select-none">
                    R$
                  </span>
                  <input
                    id="input-preco-venda-atacado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2 text-base font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition shadow-3xs"
                    placeholder="25,30"
                  />
                </div>

                {/* Badge de Margem de Lucro Verde em Destaque (Screenshot 2) */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                    {wholesaleMarginPct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} %
                  </span>
                  <div className="flex flex-col text-[10.5px] font-extrabold uppercase text-slate-600 leading-tight">
                    <span>MARGEM DE LUCRO</span>
                    <span className="text-slate-400 font-bold">(APROXIMADA NO ATACADO)</span>
                  </div>
                </div>
              </div>
              <div className="text-[10.5px] font-mono text-slate-500 flex items-center gap-2 pt-0.5">
                <span>Markup s/ Custo: <strong>{wholesaleMarkupPct}%</strong></span>
                <span>•</span>
                <span>Lucro Bruto: <strong className="text-emerald-700">R$ {(wholesalePrice - costPrice > 0 ? wholesalePrice - costPrice : 0).toFixed(2)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Simulador Rápido de Margem Alvo */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Atalhos de Margem Alvo no Varejo:</span>
            {[20, 25, 30, 35, 40, 50].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  if (costPrice > 0) {
                    // Margem = (Venda - Custo)/Venda => Venda = Custo / (1 - Margem/100)
                    const calculated = costPrice / (1 - pct / 100);
                    setRetailPrice(Number(calculated.toFixed(2)));
                  }
                }}
                className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 border border-slate-300 text-sky-700 font-bold font-mono transition cursor-pointer"
              >
                {pct}%
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Atalhos de Margem Alvo no Atacado:</span>
            {[15, 20, 25, 28, 30].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  if (costPrice > 0) {
                    const calculated = costPrice / (1 - pct / 100);
                    setWholesalePrice(Number(calculated.toFixed(2)));
                  }
                }}
                className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-slate-300 text-emerald-700 font-bold font-mono transition cursor-pointer"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL CONFIGURAR LISTAS DE PREÇO */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm">Configuração de Tabelas e Listas de Preço</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Configure as políticas de markup e margem para cada canal de venda (Varejo, Atacado, Revendedores, e Campanhas Promocionais).
              </p>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r border-slate-200">Nome da Tabela</th>
                      <th className="p-2 border-r border-slate-200 text-center">Tipo</th>
                      <th className="p-2 border-r border-slate-200 text-right">% Alvo</th>
                      <th className="p-2 border-r border-slate-200 text-center">Qtd Mín.</th>
                      <th className="p-2 border-r border-slate-200">Descrição / Canal</th>
                      <th className="p-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {priceLists.map((pl, idx) => (
                      <tr key={pl.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-800">{pl.name}</td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                            {pl.type === 'margin' ? 'MARGEM' : 'MARKUP'}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                          {pl.markupPct.toFixed(2)}%
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">
                          {pl.minQuantity} un
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600">{pl.description}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (costPrice > 0) {
                                const newPrice = costPrice / (1 - pl.markupPct / 100);
                                if (pl.id === '1') setRetailPrice(Number(newPrice.toFixed(2)));
                                else setWholesalePrice(Number(newPrice.toFixed(2)));
                                setShowConfigModal(false);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition cursor-pointer"
                            title="Aplicar regra ao cálculo atual"
                          >
                            Aplicar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer shadow-3xs"
                >
                  Fechar Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
