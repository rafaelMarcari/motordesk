/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UnitOfMeasure, UnitCalculationType, UnitCategory, ItemDimensionData } from '../types';

export interface CalculateQuantityParams {
  calculationType: UnitCalculationType;
  length?: number;
  width?: number;
  height?: number;
  quantity?: number; // Para quantidade simples ou multiplicador de peças
  piecesCount?: number; // Multiplicador de peças (ex: 2 peças de 5m x 4m)
  decimalPlaces?: number;
}

export interface CalculationResult {
  quantity: number;
  dimensions: ItemDimensionData;
  displayText: string;
  formulaText: string;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Arredondamento seguro evitando erros de ponto flutuante em JavaScript
 */
export function roundToDecimals(value: number, decimals: number = 3): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, Math.max(0, Math.min(6, decimals)));
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Formata um número com o número exato de casas decimais e separador brasileiro
 */
export function formatQuantityLocale(value: number, decimals: number = 3): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Centralized quantity and dimension calculation service
 */
export function calculateItemQuantity(params: CalculateQuantityParams): CalculationResult {
  const {
    calculationType,
    length = 0,
    width = 0,
    height = 0,
    quantity = 1,
    piecesCount = 1,
    decimalPlaces = 3
  } = params;

  const safePieces = Math.max(1, piecesCount || 1);

  switch (calculationType) {
    case 'LINEAR': {
      const safeLength = Math.max(0, length);
      if (safeLength <= 0) {
        return {
          quantity: 0,
          dimensions: { calculationType, length: safeLength, piecesCount: safePieces },
          displayText: 'Comprimento não informado',
          formulaText: '0 M',
          isValid: false,
          errorMessage: 'O comprimento deve ser maior que zero.'
        };
      }
      const rawTotal = safeLength * safePieces;
      const finalQty = roundToDecimals(rawTotal, decimalPlaces);
      const piecesSuffix = safePieces > 1 ? ` (${safePieces} peças de ${formatQuantityLocale(safeLength, decimalPlaces)})` : '';
      return {
        quantity: finalQty,
        dimensions: { calculationType, length: safeLength, piecesCount: safePieces },
        displayText: `${formatQuantityLocale(finalQty, decimalPlaces)}${piecesSuffix}`,
        formulaText: safePieces > 1 ? `${safePieces} × ${formatQuantityLocale(safeLength, decimalPlaces)} = ${formatQuantityLocale(finalQty, decimalPlaces)}` : `${formatQuantityLocale(safeLength, decimalPlaces)}`,
        isValid: true
      };
    }

    case 'AREA': {
      const safeLength = Math.max(0, length);
      const safeWidth = Math.max(0, width);
      if (safeLength <= 0 || safeWidth <= 0) {
        return {
          quantity: 0,
          dimensions: { calculationType, length: safeLength, width: safeWidth, piecesCount: safePieces },
          displayText: 'Dimensões incompletas',
          formulaText: '0 M × 0 M = 0 M²',
          isValid: false,
          errorMessage: 'Comprimento e largura devem ser maiores que zero.'
        };
      }
      const areaSingle = safeLength * safeWidth;
      const rawTotal = areaSingle * safePieces;
      const finalQty = roundToDecimals(rawTotal, decimalPlaces);
      const formula = safePieces > 1
        ? `${safePieces} × (${formatQuantityLocale(safeLength, 2)} M × ${formatQuantityLocale(safeWidth, 2)} M) = ${formatQuantityLocale(finalQty, decimalPlaces)} M²`
        : `${formatQuantityLocale(safeLength, 2)} M × ${formatQuantityLocale(safeWidth, 2)} M = ${formatQuantityLocale(finalQty, decimalPlaces)} M²`;
      return {
        quantity: finalQty,
        dimensions: { calculationType, length: safeLength, width: safeWidth, piecesCount: safePieces },
        displayText: `${formatQuantityLocale(safeLength, 2)} M × ${formatQuantityLocale(safeWidth, 2)} M${safePieces > 1 ? ` (${safePieces} un)` : ''} = ${formatQuantityLocale(finalQty, decimalPlaces)} M²`,
        formulaText: formula,
        isValid: true
      };
    }

    case 'VOLUME': {
      const safeLength = Math.max(0, length);
      const safeWidth = Math.max(0, width);
      const safeHeight = Math.max(0, height);
      if (safeLength <= 0 || safeWidth <= 0 || safeHeight <= 0) {
        return {
          quantity: 0,
          dimensions: { calculationType, length: safeLength, width: safeWidth, height: safeHeight, piecesCount: safePieces },
          displayText: 'Dimensões incompletas',
          formulaText: '0 M × 0 M × 0 M = 0 M³',
          isValid: false,
          errorMessage: 'Comprimento, largura e altura devem ser maiores que zero.'
        };
      }
      const volumeSingle = safeLength * safeWidth * safeHeight;
      const rawTotal = volumeSingle * safePieces;
      const finalQty = roundToDecimals(rawTotal, decimalPlaces);
      const formula = safePieces > 1
        ? `${safePieces} × (${formatQuantityLocale(safeLength, 2)} M × ${formatQuantityLocale(safeWidth, 2)} M × ${formatQuantityLocale(safeHeight, 2)} M) = ${formatQuantityLocale(finalQty, decimalPlaces)} M³`
        : `${formatQuantityLocale(safeLength, 2)} M × ${formatQuantityLocale(safeWidth, 2)} M × ${formatQuantityLocale(safeHeight, 2)} M = ${formatQuantityLocale(finalQty, decimalPlaces)} M³`;
      return {
        quantity: finalQty,
        dimensions: { calculationType, length: safeLength, width: safeWidth, height: safeHeight, piecesCount: safePieces },
        displayText: `${formatQuantityLocale(safeLength, 2)} M × ${formatQuantityLocale(safeWidth, 2)} M × ${formatQuantityLocale(safeHeight, 2)} M${safePieces > 1 ? ` (${safePieces} un)` : ''} = ${formatQuantityLocale(finalQty, decimalPlaces)} M³`,
        formulaText: formula,
        isValid: true
      };
    }

    case 'SIMPLES':
    default: {
      const safeQty = Math.max(0, quantity);
      const finalQty = roundToDecimals(safeQty, decimalPlaces);
      return {
        quantity: finalQty,
        dimensions: { calculationType: 'SIMPLES' },
        displayText: `${formatQuantityLocale(finalQty, decimalPlaces)}`,
        formulaText: `${formatQuantityLocale(finalQty, decimalPlaces)}`,
        isValid: safeQty > 0
      };
    }
  }
}

/**
 * Converte de forma segura dimensões em string formatada para exibição em tabelas e orçamentos/vendas
 */
export function formatDimensionSummary(
  dimensions?: ItemDimensionData,
  unitAcronym: string = 'UN',
  calculatedQty?: number
): string | null {
  if (!dimensions || dimensions.calculationType === 'SIMPLES' || !dimensions.calculationType) {
    return null;
  }

  const { calculationType, length = 0, width = 0, height = 0, piecesCount = 1 } = dimensions;

  if (calculationType === 'LINEAR') {
    return piecesCount > 1 
      ? `${piecesCount} pçs × ${formatQuantityLocale(length, 2)} M = ${formatQuantityLocale(calculatedQty ?? length * piecesCount, 3)} ${unitAcronym}`
      : `${formatQuantityLocale(length, 2)} M`;
  }

  if (calculationType === 'AREA') {
    return piecesCount > 1
      ? `${piecesCount} pçs × (${formatQuantityLocale(length, 2)} M × ${formatQuantityLocale(width, 2)} M) = ${formatQuantityLocale(calculatedQty ?? length * width * piecesCount, 3)} ${unitAcronym}`
      : `${formatQuantityLocale(length, 2)} M × ${formatQuantityLocale(width, 2)} M = ${formatQuantityLocale(calculatedQty ?? length * width, 3)} ${unitAcronym}`;
  }

  if (calculationType === 'VOLUME') {
    return piecesCount > 1
      ? `${piecesCount} pçs × (${formatQuantityLocale(length, 2)} M × ${formatQuantityLocale(width, 2)} M × ${formatQuantityLocale(height, 2)} M) = ${formatQuantityLocale(calculatedQty ?? length * width * height * piecesCount, 3)} ${unitAcronym}`
      : `${formatQuantityLocale(length, 2)} M × ${formatQuantityLocale(width, 2)} M × ${formatQuantityLocale(height, 2)} M = ${formatQuantityLocale(calculatedQty ?? length * width * height, 3)} ${unitAcronym}`;
  }

  return null;
}

/**
 * Obtém a unidade de medida do produto resolvendo por ID ou sigla com fallback
 */
export function resolveUnitOfMeasure(
  units: UnitOfMeasure[],
  unitIdOrAcronym?: string,
  legacyUnit?: string
): UnitOfMeasure {
  if (!unitIdOrAcronym && !legacyUnit) {
    return (
      units.find(u => u.acronym === 'UN' && u.active) ||
      units[0] || {
        id: 'uom-un',
        name: 'Unidade',
        acronym: 'UN',
        category: 'QUANTIDADE',
        calculationType: 'SIMPLES',
        conversionFactor: 1,
        decimalPlaces: 0,
        active: true,
        isGlobal: true
      }
    );
  }

  // Busca por ID exato
  if (unitIdOrAcronym) {
    const byId = units.find(u => u.id === unitIdOrAcronym);
    if (byId) return byId;
  }

  // Busca por sigla (case-insensitive)
  const targetAcronym = (unitIdOrAcronym || legacyUnit || '').trim().toUpperCase();
  const byAcronym = units.find(u => u.acronym.toUpperCase() === targetAcronym);
  if (byAcronym) return byAcronym;

  // Fallback padrão
  return {
    id: `uom-fallback-${targetAcronym.toLowerCase()}`,
    name: targetAcronym || 'Unidade',
    acronym: targetAcronym || 'UN',
    category: 'QUANTIDADE',
    calculationType: targetAcronym === 'M²' ? 'AREA' : targetAcronym === 'M³' ? 'VOLUME' : targetAcronym === 'M' ? 'LINEAR' : 'SIMPLES',
    conversionFactor: 1,
    decimalPlaces: targetAcronym === 'UN' || targetAcronym === 'PC' || targetAcronym === 'CX' ? 0 : 3,
    active: true,
    isGlobal: true
  };
}
