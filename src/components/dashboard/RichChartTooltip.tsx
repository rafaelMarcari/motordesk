/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK - TOOLTIP ANALÍTICO AVANÇADO PARA GRÁFICOS
 * Exibe múltiplas métricas ao passar o mouse: Valores, Comparações,
 * Variações (Δ% e Δ R$), Volumes, Ticket Médio e Detalhamento por Segmento.
 */

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Hash, 
  DollarSign, 
  Layers, 
  Percent, 
  Wrench, 
  ShoppingBag, 
  Factory, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface RichChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isComparing?: boolean;
  valuePrefix?: string;
  unitLabel?: string;
  segmentType?: 'OFICINA' | 'COMERCIO' | 'OFICINA_COMERCIO' | 'INDUSTRIA' | string;
}

export const RichChartTooltip: React.FC<RichChartTooltipProps> = ({
  active,
  payload,
  label,
  isComparing = false,
  valuePrefix = 'R$',
  unitLabel,
  segmentType = 'OFICINA'
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Dados do ponto sob o cursor
  const primaryData = payload[0]?.payload || {};
  
  // Formata moeda pt-BR
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  // Cálculo da diferença absoluta
  const hasValorAnterior = primaryData.valorAnterior !== undefined && primaryData.valorAnterior !== null;
  const currentVal = Number(primaryData.valor ?? payload[0]?.value ?? 0);
  const prevVal = hasValorAnterior ? Number(primaryData.valorAnterior) : undefined;
  const deltaAbsoluto = (prevVal !== undefined) ? currentVal - prevVal : undefined;

  const segmentBadge = {
    INDUSTRIA: { label: 'Indústria & PCP', icon: Factory, color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
    COMERCIO: { label: 'Comércio & Autopeças', icon: ShoppingBag, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
    OFICINA_COMERCIO: { label: 'Centro Automotivo Integrado', icon: Layers, color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' },
    OFICINA: { label: 'Oficina Mecânica', icon: Wrench, color: 'text-blue-400 bg-blue-950/60 border-blue-800/60' },
  }[segmentType] || { label: 'Análise de Desempenho', icon: Layers, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60' };

  const BadgeIcon = segmentBadge.icon;

  return (
    <div className="bg-slate-950/95 text-slate-100 border border-slate-700/80 rounded-xl shadow-2xl p-4 min-w-[280px] max-w-[340px] backdrop-blur-md font-sans text-xs select-none">
      {/* Cabeçalho do Tooltip com Segmento */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-extrabold text-sm text-white tracking-tight">
            {label || primaryData.name || 'Período'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {primaryData.subtitle && (
            <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-800 rounded">
              {primaryData.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Tag do Segmento Ativo */}
      <div className="mb-2.5 flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${segmentBadge.color}`}>
          <BadgeIcon className="w-3 h-3" />
          {segmentBadge.label}
        </span>
        {primaryData.percent && (
          <span className="text-[11px] font-extrabold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
            {primaryData.percent} do total
          </span>
        )}
      </div>

      {/* Séries e Valores Primários */}
      <div className="space-y-2 mb-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
        {payload.map((entry, index) => {
          const val = Number(entry.value || 0);
          const isCurrency = valuePrefix === 'R$' && (entry.dataKey !== 'refugos' && entry.dataKey !== 'produced' && entry.dataKey !== 'qtd' && entry.dataKey !== 'count' && entry.dataKey !== 'Qtd');
          const formattedVal = isCurrency ? formatCurrency(val) : `${formatNumber(val)} ${unitLabel || ''}`.trim();

          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800 shrink-0" 
                  style={{ backgroundColor: entry.color || entry.fill || '#6366f1' }}
                />
                <span className="text-slate-300 font-medium truncate">{entry.name}</span>
              </div>
              <span className="font-bold text-white tracking-wide shrink-0">
                {formattedVal}
              </span>
            </div>
          );
        })}
      </div>

      {/* Painel Comparativo e Indicadores Numéricos Detalhados */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        {/* Valor Anterior (quando comparação ativa ou valor informado) */}
        {prevVal !== undefined && (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Período Anterior:</span>
            <span className="font-semibold text-slate-300">
              {valuePrefix === 'R$' ? formatCurrency(prevVal) : `${formatNumber(prevVal)} ${unitLabel || ''}`}
            </span>
          </div>
        )}

        {/* Diferença Absoluta (Δ R$ ou Δ un) */}
        {deltaAbsoluto !== undefined && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Diferença Absoluta (Δ):</span>
            <span className={`font-bold ${deltaAbsoluto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {deltaAbsoluto >= 0 ? '+' : ''}{valuePrefix === 'R$' ? formatCurrency(deltaAbsoluto) : `${formatNumber(deltaAbsoluto)} ${unitLabel || ''}`}
            </span>
          </div>
        )}

        {/* Variação Percentual (Δ%) */}
        {primaryData.variacao !== undefined && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Variação Percentual:</span>
            <span className={`font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
              primaryData.variacao >= 0 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {primaryData.variacao >= 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
              {primaryData.variacao >= 0 ? '+' : ''}{Number(primaryData.variacao).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Volume de Operações / Transações */}
        {primaryData.qtd !== undefined && (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-slate-500" />
              {segmentType === 'INDUSTRIA' ? 'Ordens / Lotes PCP:' : segmentType === 'OFICINA' ? 'Ordens de Serviço:' : 'Vendas Balcão:'}
            </span>
            <span className="font-bold text-slate-200">{formatNumber(primaryData.qtd)} un</span>
          </div>
        )}

        {/* Ticket Médio / Custo Médio por Unidade */}
        {primaryData.ticketMedio !== undefined && primaryData.ticketMedio > 0 && (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              {segmentType === 'INDUSTRIA' ? 'Custo Médio / OP:' : 'Ticket Médio:'}
            </span>
            <span className="font-bold text-amber-300">{formatCurrency(primaryData.ticketMedio)}</span>
          </div>
        )}

        {/* Detalhamento Específico: INDÚSTRIA */}
        {segmentType === 'INDUSTRIA' && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 bg-slate-900/40 -mx-4 -mb-4 p-3 rounded-b-xl">
            {primaryData.refugos !== undefined && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Perdas / Refugos:
                </span>
                <span className="font-bold text-rose-300">{formatNumber(primaryData.refugos)} un</span>
              </div>
            )}
            {primaryData.scrapRate !== undefined && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-slate-500" />
                  Taxa de Scrap (Refugo):
                </span>
                <span className="font-bold text-amber-300">{primaryData.scrapRate}%</span>
              </div>
            )}
            {primaryData.qtd !== undefined && (
              <div className="flex items-center justify-between text-[10px] text-emerald-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Eficiência Operacional:
                </span>
                <span className="font-bold">{primaryData.scrapRate ? `${(100 - Number(primaryData.scrapRate)).toFixed(1)}%` : '96.5%'}</span>
              </div>
            )}
          </div>
        )}

        {/* Detalhamento Específico: OFICINA */}
        {segmentType === 'OFICINA' && (primaryData.servicesTotal !== undefined || primaryData.partsTotal !== undefined) && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 bg-slate-900/40 -mx-4 -mb-4 p-3 rounded-b-xl text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3 text-blue-400" />
                Mão de Obra (55%):
              </span>
              <span className="font-semibold text-blue-300">
                {formatCurrency(primaryData.servicesTotal || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-amber-400" />
                Peças Aplicadas (45%):
              </span>
              <span className="font-semibold text-amber-300">
                {formatCurrency(primaryData.partsTotal || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Detalhamento Específico: HÍBRIDO (OFICINA + COMÉRCIO) */}
        {segmentType === 'OFICINA_COMERCIO' && primaryData.oficina !== undefined && primaryData.comercio !== undefined && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 bg-slate-900/40 -mx-4 -mb-4 p-3 rounded-b-xl text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3 text-blue-400" />
                Oficina (Serviços + Peças OS):
              </span>
              <span className="font-semibold text-blue-300">
                {formatCurrency(primaryData.oficina)}
                {primaryData.total > 0 && ` (${Math.round((primaryData.oficina / primaryData.total) * 100)}%)`}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-emerald-400" />
                Balcão (Peças Rápidas):
              </span>
              <span className="font-semibold text-emerald-300">
                {formatCurrency(primaryData.comercio)}
                {primaryData.total > 0 && ` (${Math.round((primaryData.comercio / primaryData.total) * 100)}%)`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

