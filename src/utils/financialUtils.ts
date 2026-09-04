/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK — REESTRUTURAÇÃO FINANCEIRA (NATUREZA, CLASSIFICAÇÃO, PERIODICIDADE, RECORRÊNCIA, ORIGEM)
 */

import {
  FinancialNature,
  FinancialClassification,
  FinancialPeriodicity,
  FinancialOrigin,
  AccountPayable,
  AccountReceivable,
  FinancialTransaction,
} from '../types';

export interface FinancialDimensionLabels {
  nature: string;
  classification: string;
  periodicity: string;
  isRecurring: string;
  origin: string;
}

export const FINANCIAL_NATURE_OPTIONS: Array<{ value: FinancialNature; label: string; badgeClass: string }> = [
  { value: 'income', label: 'Receita (+)', badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
  { value: 'expense', label: 'Despesa (-)', badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-300' },
];

export const FINANCIAL_CLASSIFICATION_OPTIONS: Array<{ value: FinancialClassification; label: string; badgeClass: string }> = [
  { value: 'fixed', label: 'Fixa', badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  { value: 'variable', label: 'Variável', badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-300' },
];

export const FINANCIAL_PERIODICITY_OPTIONS: Array<{ value: FinancialPeriodicity; label: string }> = [
  { value: 'single', label: 'Única' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizada' },
];

export const FINANCIAL_ORIGIN_OPTIONS: Array<{ value: FinancialOrigin; label: string; category: 'income' | 'expense' | 'both' }> = [
  { value: 'sale', label: 'Venda de Balcão / Peças', category: 'income' },
  { value: 'commission', label: 'Comissão de Representação Comercial', category: 'income' },
  { value: 'service', label: 'Serviço Mecânico / OS', category: 'income' },
  { value: 'supplier', label: 'Fornecedor / Peças', category: 'expense' },
  { value: 'rent', label: 'Aluguel / Imóvel', category: 'expense' },
  { value: 'salary', label: 'Salários & Folha de Pagamento', category: 'expense' },
  { value: 'tax', label: 'Impostos & Tributos', category: 'expense' },
  { value: 'freight', label: 'Frete & Transporte', category: 'expense' },
  { value: 'marketing', label: 'Marketing & Comercial', category: 'expense' },
  { value: 'other', label: 'Outras Operações', category: 'both' },
];

export function getNatureLabel(nature?: FinancialNature): string {
  if (nature === 'income') return 'Receita';
  if (nature === 'expense') return 'Despesa';
  return 'Não Definida';
}

export function getClassificationLabel(classification?: FinancialClassification): string {
  if (classification === 'fixed') return 'Fixa';
  if (classification === 'variable') return 'Variável';
  return 'Variável';
}

export function getPeriodicityLabel(periodicity?: FinancialPeriodicity): string {
  const match = FINANCIAL_PERIODICITY_OPTIONS.find(p => p.value === periodicity);
  return match ? match.label : 'Única';
}

export function getOriginLabel(origin?: FinancialOrigin): string {
  const match = FINANCIAL_ORIGIN_OPTIONS.find(o => o.value === origin);
  return match ? match.label : 'Geral';
}

/**
 * Preenche dimensões financeiras com defaults seguros caso o registro seja legado
 */
export function enrichPayableWithDimensions(payable: AccountPayable): AccountPayable {
  const desc = (payable.description || '').toLowerCase();
  const cat = (payable.category || '').toLowerCase();

  let nature: FinancialNature = payable.nature || 'expense';
  let classification: FinancialClassification = payable.classification || 'variable';
  let periodicity: FinancialPeriodicity = payable.periodicity || 'single';
  let isRecurring = payable.isRecurring ?? false;
  let origin: FinancialOrigin = payable.origin || 'supplier';

  if (!payable.classification) {
    if (desc.includes('aluguel') || cat.includes('aluguel') || desc.includes('energia') || desc.includes('internet') || desc.includes('salario') || cat.includes('salario')) {
      classification = 'fixed';
      isRecurring = true;
      periodicity = 'monthly';
    } else {
      classification = 'variable';
    }
  }

  if (!payable.origin) {
    if (desc.includes('aluguel') || cat.includes('aluguel')) origin = 'rent';
    else if (desc.includes('salario') || cat.includes('salario') || desc.includes('folha')) origin = 'salary';
    else if (desc.includes('imposto') || cat.includes('tributo') || desc.includes('darf') || desc.includes('simples')) origin = 'tax';
    else if (desc.includes('frete') || cat.includes('transporte')) origin = 'freight';
    else origin = 'supplier';
  }

  return {
    ...payable,
    nature,
    classification,
    periodicity,
    isRecurring,
    origin,
  };
}

export function enrichReceivableWithDimensions(receivable: AccountReceivable): AccountReceivable {
  let nature: FinancialNature = receivable.nature || 'income';
  let classification: FinancialClassification = receivable.classification || 'variable';
  let periodicity: FinancialPeriodicity = receivable.periodicity || 'single';
  let isRecurring = receivable.isRecurring ?? false;
  let origin: FinancialOrigin = receivable.origin || (receivable.originType === 'commission' ? 'commission' : 'sale');

  if (receivable.originType === 'commission' || receivable.commissionId) {
    origin = 'commission';
    classification = 'variable';
  }

  return {
    ...receivable,
    nature,
    classification,
    periodicity,
    isRecurring,
    origin,
  };
}
