/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  Package, TrendingUp, AlertTriangle, Clock, ArrowDownRight, ArrowUpRight, 
  RefreshCw, DollarSign, Download, Filter, Search, Layers, Box, CheckCircle2,
  Calendar, ShieldAlert, Archive, BarChart3, AlertCircle
} from 'lucide-react';
import { AppDatabase } from '../../data/mockData';
import { Part, StockMovement } from '../../types';
import { exportToCsv } from '../../utils/csvExporter';

export type StockReportSubType = 
  | 'stock_position_movements'
  | 'stock_replenishment'
  | 'stock_dormant';

interface StockReportsProps {
  db: AppDatabase;
  subType: StockReportSubType;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  selectedCategory?: string;
  dormantCutoffDays?: number;
}

export const StockReports: React.FC<StockReportsProps> = ({
  db,
  subType,
  startDate = '',
  endDate = '',
  searchTerm = '',
  selectedCategory = '',
  dormantCutoffDays = 60,
}) => {
  const parts: Part[] = db.parts || [];
  const stockMovements: StockMovement[] = db.stockMovements || [];

  // Active filter tab within movements subview
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');

  // Date parsing
  const now = new Date().getTime();
  const todayStr = new Date().toISOString().substring(0, 10);

  // Map last movement per part
  const lastMovementByPart = useMemo(() => {
    const map = new Map<string, StockMovement>();
    const sorted = [...stockMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sorted.forEach(m => {
      if (!map.has(m.partId)) {
        map.set(m.partId, m);
      }
    });
    return map;
  }, [stockMovements]);

  // Enriched parts data
  const enrichedParts = useMemo(() => {
    return parts.map(p => {
      const lastMov = lastMovementByPart.get(p.id);
      const lastDate = lastMov?.date ? new Date(lastMov.date).getTime() : new Date('2024-01-01').getTime();
      const daysWithoutMovement = Math.max(0, Math.floor((now - lastDate) / (24 * 60 * 60 * 1000)));
      
      const stock = p.stock || 0;
      const minStock = p.minStock || 5;
      const cost = p.costPrice || (p.price * 0.6) || 0;
      const salePrice = p.price || 0;
      const totalCostValue = stock * cost;
      const totalSaleValue = stock * salePrice;
      const isLowStock = stock <= minStock;
      const isDormant = stock > 0 && daysWithoutMovement >= dormantCutoffDays;
      const suggestedBuyQty = isLowStock ? Math.max((minStock * 2) - stock, 5) : 0;
      const replenishmentCost = suggestedBuyQty * cost;

      return {
        ...p,
        stock,
        minStock,
        cost,
        salePrice,
        totalCostValue,
        totalSaleValue,
        isLowStock,
        isDormant,
        daysWithoutMovement,
        lastMovementDate: lastMov?.date || '',
        suggestedBuyQty,
        replenishmentCost
      };
    });
  }, [parts, lastMovementByPart, now, dormantCutoffDays]);

  // Filtered parts based on search and category
  const filteredParts = useMemo(() => {
    return enrichedParts.filter(p => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesCode = (p.code || '').toLowerCase().includes(term);
        const matchesName = (p.name || '').toLowerCase().includes(term);
        const matchesCategory = (p.category || '').toLowerCase().includes(term);
        const matchesLocation = (p.location || '').toLowerCase().includes(term);
        if (!matchesCode && !matchesName && !matchesCategory && !matchesLocation) return false;
      }
      return true;
    });
  }, [enrichedParts, selectedCategory, searchTerm]);

  // Filtered movements for position_movements subview
  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => {
      const movDate = (m.date || '').substring(0, 10);
      if (startDate && movDate < startDate) return false;
      if (endDate && movDate > endDate) return false;

      if (movementTypeFilter !== 'all') {
        const isEntry = m.type === 'in' || (m.type as string) === 'entry';
        const isExit = m.type === 'out' || (m.type as string) === 'exit';
        const isAdj = m.type === 'adjustment';

        if (movementTypeFilter === 'in' && !isEntry) return false;
        if (movementTypeFilter === 'out' && !isExit) return false;
        if (movementTypeFilter === 'adjustment' && !isAdj) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const part = parts.find(p => p.id === m.partId);
        const pName = part?.name || m.partName || '';
        const pCode = part?.code || '';
        const reason = m.reason || m.sourceDocument || '';
        if (!pName.toLowerCase().includes(term) && !pCode.toLowerCase().includes(term) && !reason.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements, startDate, endDate, movementTypeFilter, searchTerm, parts]);

  // Low stock parts
  const lowStockParts = useMemo(() => {
    return filteredParts.filter(p => p.isLowStock);
  }, [filteredParts]);

  // Dormant stock parts
  const dormantParts = useMemo(() => {
    return filteredParts
      .filter(p => p.isDormant)
      .sort((a, b) => b.totalCostValue - a.totalCostValue);
  }, [filteredParts]);

  // Global KPIs
  const totalStockCostValuation = useMemo(() => {
    return enrichedParts.reduce((sum, p) => sum + p.totalCostValue, 0);
  }, [enrichedParts]);

  const totalStockSaleValuation = useMemo(() => {
    return enrichedParts.reduce((sum, p) => sum + p.totalSaleValue, 0);
  }, [enrichedParts]);

  const totalReplenishmentCost = useMemo(() => {
    return lowStockParts.reduce((sum, p) => sum + p.replenishmentCost, 0);
  }, [lowStockParts]);

  const totalDormantCapital = useMemo(() => {
    return dormantParts.reduce((sum, p) => sum + p.totalCostValue, 0);
  }, [dormantParts]);

  // CSV Export
  const handleExportCsv = () => {
    if (subType === 'stock_position_movements') {
      const headers = ['Código', 'Nome do Produto', 'Categoria', 'Localização', 'Unidade', 'Estoque Atual', 'Estoque Mínimo', 'Custo Unitário (R$)', 'Preço Venda (R$)', 'Total Custo (R$)', 'Total Venda (R$)'];
      const rows = filteredParts.map(p => [
        p.code,
        p.name,
        p.category || 'Geral',
        p.location || 'Padrão',
        p.unit || 'UN',
        p.stock,
        p.minStock,
        p.cost.toFixed(2),
        p.salePrice.toFixed(2),
        p.totalCostValue.toFixed(2),
        p.totalSaleValue.toFixed(2)
      ]);
      exportToCsv('Relatorio_Posicao_Estoque', headers, rows);
    } else if (subType === 'stock_replenishment') {
      const headers = ['Código', 'Nome do Produto', 'Estoque Físico', 'Estoque Mínimo', 'Qtd Sugerida', 'Unidade', 'Custo Estimado Unit. (R$)', 'Investimento Previsto (R$)'];
      const rows = lowStockParts.map(p => [
        p.code,
        p.name,
        p.stock,
        p.minStock,
        p.suggestedBuyQty,
        p.unit || 'UN',
        p.cost.toFixed(2),
        p.replenishmentCost.toFixed(2)
      ]);
      exportToCsv('Relatorio_Sugestao_Reposicao', headers, rows);
    } else if (subType === 'stock_dormant') {
      const headers = ['Código', 'Nome do Produto', 'Categoria', 'Saldo em Estoque', 'Custo Unitário (R$)', 'Capital Imobilizado (R$)', 'Dias Parado', 'Última Movimentação'];
      const rows = dormantParts.map(p => [
        p.code,
        p.name,
        p.category || 'Geral',
        p.stock,
        p.cost.toFixed(2),
        p.totalCostValue.toFixed(2),
        p.daysWithoutMovement,
        p.lastMovementDate ? new Date(p.lastMovementDate).toLocaleDateString('pt-BR') : 'Sem registro'
      ]);
      exportToCsv('Relatorio_Estoque_Parado_Dormant', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            {subType === 'stock_position_movements' && 'Posição Físico-Financeira & Rastreabilidade de Estoque'}
            {subType === 'stock_replenishment' && 'Sugestão de Reposição & Itens Abaixo do Mínimo'}
            {subType === 'stock_dormant' && `Estoque Parado & Capital Imobilizado (> ${dormantCutoffDays} dias sem giro)`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {subType === 'stock_position_movements' && 'Inventário valorizado por custo médio e histórico auditável de entradas/saídas'}
            {subType === 'stock_replenishment' && 'Cálculo automatizado do ponto de pedido para prevenir ruptura operacional'}
            {subType === 'stock_dormant' && 'Diagnóstico de itens sem giro para liberação de capital de giro e tomada de decisão'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition inline-flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <Download className="w-4 h-4" /> Exportar Planilha (CSV)
        </button>
      </div>

      {/* ================= VIEW 1: POSITION & MOVEMENTS ================= */}
      {subType === 'stock_position_movements' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">Patrimônio em Estoque (Custo)</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block font-mono">
                R$ {totalStockCostValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-indigo-700 mt-1 block">Valor de aquisição total</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Potencial de Venda</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block font-mono">
                R$ {totalStockSaleValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                Margem bruta projetada: {totalStockCostValuation > 0 ? (((totalStockSaleValuation - totalStockCostValuation) / totalStockCostValuation) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">Total de SKUs Cadastrados</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block font-mono">
                {parts.length}
              </span>
              <span className="text-[11px] text-amber-700 mt-1 block">{filteredParts.length} itens no filtro</span>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">Itens em Alerta Crítico</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">
                {lowStockParts.length}
              </span>
              <span className="text-[11px] text-rose-600 mt-1 block font-medium">Abaixo do estoque de segurança</span>
            </div>
          </div>

          {/* Table: Current Inventory Position */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-600" /> Inventário Atual de Produtos ({filteredParts.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Código / Produto</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Localização</th>
                    <th className="p-3.5 text-center">Físico</th>
                    <th className="p-3.5 text-center">Mínimo</th>
                    <th className="p-3.5 text-right">Custo Médio</th>
                    <th className="p-3.5 text-right">Preço Venda</th>
                    <th className="p-3.5 text-right font-bold text-slate-900">Total em Custo</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Nenhum item encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-[11px]">{p.code}</span>
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {p.category || 'Geral'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">{p.location || '-'}</td>
                        <td className="p-3.5 text-center font-mono font-bold">
                          <span className={p.isLowStock ? 'text-rose-600 font-black' : 'text-slate-800'}>
                            {p.stock} {p.unit || 'UN'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono text-slate-500">{p.minStock} {p.unit || 'UN'}</td>
                        <td className="p-3.5 text-right font-mono text-slate-700">R$ {p.cost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-emerald-700">R$ {p.salePrice.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">R$ {p.totalCostValue.toFixed(2)}</td>
                        <td className="p-3.5 text-center">
                          {p.stock === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Zerado
                            </span>
                          ) : p.isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Abaixo Mínimo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Movements Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-3 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" /> Histórico & Rastreabilidade de Movimentações ({filteredMovements.length})
              </h3>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    movementTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('in')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    movementTypeFilter === 'in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Entradas
                </button>
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('out')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    movementTypeFilter === 'out' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Saídas
                </button>
                <button
                  type="button"
                  onClick={() => setMovementTypeFilter('adjustment')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    movementTypeFilter === 'adjustment' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Ajustes
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Data/Hora</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Peça / Produto</th>
                    <th className="p-3.5 text-center">Quantidade</th>
                    <th className="p-3.5 text-right">Custo Unitário</th>
                    <th className="p-3.5 text-right">Total</th>
                    <th className="p-3.5">Documento / Motivo</th>
                    <th className="p-3.5">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Nenhuma movimentação registrada no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map(m => {
                      const part = parts.find(p => p.id === m.partId);
                      const isEntry = m.type === 'in' || (m.type as string) === 'entry';
                      const isExit = m.type === 'out' || (m.type as string) === 'exit';
                      const unitCost = m.unitCost || part?.costPrice || 0;
                      const totalMov = m.quantity * unitCost;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 font-mono text-slate-600">
                            {m.date ? new Date(m.date).toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="p-3.5">
                            {isEntry ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ArrowDownRight className="w-3 h-3" /> Entrada
                              </span>
                            ) : isExit ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <ArrowUpRight className="w-3 h-3" /> Saída
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <RefreshCw className="w-3 h-3" /> Ajuste
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">
                            <span className="font-mono text-slate-500 text-[11px] mr-1.5">{part?.code}</span>
                            <span>{part?.name || m.partName || 'Peça'}</span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold">
                            <span className={isEntry ? 'text-emerald-700' : isExit ? 'text-rose-700' : 'text-amber-700'}>
                              {isEntry ? '+' : isExit ? '-' : ''}{m.quantity} {part?.unit || 'UN'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-700">R$ {unitCost.toFixed(2)}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">R$ {totalMov.toFixed(2)}</td>
                          <td className="p-3.5 text-slate-600 text-[11px]">{m.reason || m.sourceDocument || 'Movimentação padrão'}</td>
                          <td className="p-3.5 text-slate-500 font-mono text-[11px]">{m.userName || 'Sistema'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: REPLENISHMENT ================= */}
      {subType === 'stock_replenishment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">Itens com Ruptura / Abaixo do Mínimo</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">
                {lowStockParts.length} SKUs
              </span>
              <span className="text-[11px] text-rose-600 mt-1 block">Necessitam emissão urgente de cotação</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">Investimento Previsto de Reposição</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block font-mono">
                R$ {totalReplenishmentCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-indigo-700 mt-1 block">Baseado no custo médio de aquisição</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Nível de Segurança Global</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block font-mono">
                {parts.length > 0 ? (((parts.length - lowStockParts.length) / parts.length) * 100).toFixed(1) : 100}%
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">Itens operando em faixa segura</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Tabela de Sugestão de Compra & Reposição
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Código / Produto</th>
                    <th className="p-3.5 text-center">Físico</th>
                    <th className="p-3.5 text-center">Mínimo</th>
                    <th className="p-3.5 text-center font-bold text-indigo-700">Qtd Sugerida</th>
                    <th className="p-3.5 text-right">Custo Unitário Estimado</th>
                    <th className="p-3.5 text-right font-bold text-slate-900">Total Investimento</th>
                    <th className="p-3.5 text-center">Nível de Criticidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lowStockParts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        Parabéns! Nenhum produto está com estoque abaixo do mínimo.
                      </td>
                    </tr>
                  ) : (
                    lowStockParts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-[11px]">{p.code}</span>
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-600">{p.stock} {p.unit || 'UN'}</td>
                        <td className="p-3.5 text-center font-mono text-slate-600">{p.minStock} {p.unit || 'UN'}</td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                            +{p.suggestedBuyQty} {p.unit || 'UN'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-700">R$ {p.cost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">R$ {p.replenishmentCost.toFixed(2)}</td>
                        <td className="p-3.5 text-center">
                          {p.stock === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                              Urgente (Ruptura)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Estoque Baixo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: DORMANT STOCK ================= */}
      {subType === 'stock_dormant' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">Capital Imobilizado Parado</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block font-mono">
                R$ {totalDormantCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-amber-700 mt-1 block">Recursos financeiros travados sem giro</span>
            </div>

            <div className="bg-slate-100 border border-slate-200 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">Quantidade de SKUs Inativos</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {dormantParts.length} produtos
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Sem saídas nos últimos {dormantCutoffDays} dias</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">Impacto no Capital de Giro</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block font-mono">
                {totalStockCostValuation > 0 ? ((totalDormantCapital / totalStockCostValuation) * 100).toFixed(1) : 0}%
              </span>
              <span className="text-[11px] text-indigo-700 mt-1 block">Do estoque total está sem movimentação</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" /> Diagnóstico de Itens sem Giro (&gt; {dormantCutoffDays} dias)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3.5">Código / Produto</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5 text-center">Saldo Físico</th>
                    <th className="p-3.5 text-right">Custo Unitário</th>
                    <th className="p-3.5 text-right font-bold text-amber-900">Capital Imobilizado</th>
                    <th className="p-3.5 text-center">Dias sem Giro</th>
                    <th className="p-3.5">Última Movimentação</th>
                    <th className="p-3.5 text-center">Ação Recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dormantParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        Excelente! Nenhum produto está com estoque parado acima de {dormantCutoffDays} dias.
                      </td>
                    </tr>
                  ) : (
                    dormantParts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-[11px]">{p.code}</span>
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {p.category || 'Geral'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800">{p.stock} {p.unit || 'UN'}</td>
                        <td className="p-3.5 text-right font-mono text-slate-700">R$ {p.cost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-amber-800">
                          R$ {p.totalCostValue.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {p.daysWithoutMovement} dias
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {p.lastMovementDate ? new Date(p.lastMovementDate).toLocaleDateString('pt-BR') : 'Sem registro'}
                        </td>
                        <td className="p-3.5 text-center">
                          {p.daysWithoutMovement >= 120 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Liquidação / Devolução
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Ação Promocional
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
