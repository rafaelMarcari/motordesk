/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MOTOR DESK - UTILITÁRIOS DE PERÍODOS TEMPORAIS & COMPARAÇÃO ANALÍTICA
 * Suporte a granularidades: Mensal, Bimestral, Trimestral, Semestral e Anual.
 */

export type PeriodGranularity = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export interface PeriodOption {
  value: string;
  label: string;
  shortLabel: string;
  previousValue: string;
  previousLabel: string;
  months: string[]; // ['01', '02', ...]
  year: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Gera as opções de períodos para o seletor de acordo com a granularidade
 */
export function getPeriodOptions(granularity: PeriodGranularity, referenceYear = 2026): PeriodOption[] {
  const options: PeriodOption[] = [];

  if (granularity === 'mensal') {
    // 12 meses do ano
    for (let m = 11; m >= 0; m--) {
      const monthStr = String(m + 1).padStart(2, '0');
      const val = `${referenceYear}-${monthStr}`;
      
      // Mês anterior
      let prevVal: string;
      let prevLabel: string;
      if (m === 0) {
        prevVal = `${referenceYear - 1}-12`;
        prevLabel = `Dezembro ${referenceYear - 1}`;
      } else {
        const prevMonthStr = String(m).padStart(2, '0');
        prevVal = `${referenceYear}-${prevMonthStr}`;
        prevLabel = `${MONTH_NAMES[m - 1]} ${referenceYear}`;
      }

      options.push({
        value: val,
        label: `${MONTH_NAMES[m]} ${referenceYear}`,
        shortLabel: `${MONTH_ABBR[m]} ${referenceYear}`,
        previousValue: prevVal,
        previousLabel: prevLabel,
        months: [monthStr],
        year: referenceYear
      });
    }
  } else if (granularity === 'bimestral') {
    // 6 bimestres
    const bimesters = [
      { num: 1, name: '1º Bimestre', months: ['01', '02'], desc: 'Jan-Fev' },
      { num: 2, name: '2º Bimestre', months: ['03', '04'], desc: 'Mar-Abr' },
      { num: 3, name: '3º Bimestre', months: ['05', '06'], desc: 'Mai-Jun' },
      { num: 4, name: '4º Bimestre', months: ['07', '08'], desc: 'Jul-Ago' },
      { num: 5, name: '5º Bimestre', months: ['09', '10'], desc: 'Set-Out' },
      { num: 6, name: '6º Bimestre', months: ['11', '12'], desc: 'Nov-Dez' },
    ];

    for (let i = bimesters.length - 1; i >= 0; i--) {
      const b = bimesters[i];
      const val = `${referenceYear}-B${b.num}`;
      
      let prevVal: string;
      let prevLabel: string;
      if (b.num === 1) {
        prevVal = `${referenceYear - 1}-B6`;
        prevLabel = `6º Bimestre (Nov-Dez ${referenceYear - 1})`;
      } else {
        const prevB = bimesters[i - 1];
        prevVal = `${referenceYear}-B${prevB.num}`;
        prevLabel = `${prevB.name} (${prevB.desc} ${referenceYear})`;
      }

      options.push({
        value: val,
        label: `${b.name} (${b.desc} ${referenceYear})`,
        shortLabel: `${b.num}º Bim (${b.desc})`,
        previousValue: prevVal,
        previousLabel: prevLabel,
        months: b.months,
        year: referenceYear
      });
    }
  } else if (granularity === 'trimestral') {
    // 4 trimestres
    const quarters = [
      { num: 1, name: '1º Trimestre (Q1)', months: ['01', '02', '03'], desc: 'Jan-Mar' },
      { num: 2, name: '2º Trimestre (Q2)', months: ['04', '05', '06'], desc: 'Abr-Jun' },
      { num: 3, name: '3º Trimestre (Q3)', months: ['07', '08', '09'], desc: 'Jul-Set' },
      { num: 4, name: '4º Trimestre (Q4)', months: ['10', '11', '12'], desc: 'Out-Dez' },
    ];

    for (let i = quarters.length - 1; i >= 0; i--) {
      const q = quarters[i];
      const val = `${referenceYear}-Q${q.num}`;
      
      let prevVal: string;
      let prevLabel: string;
      if (q.num === 1) {
        prevVal = `${referenceYear - 1}-Q4`;
        prevLabel = `4º Trimestre Q4 (${referenceYear - 1})`;
      } else {
        const prevQ = quarters[i - 1];
        prevVal = `${referenceYear}-Q${prevQ.num}`;
        prevLabel = `${prevQ.name} (${referenceYear})`;
      }

      options.push({
        value: val,
        label: `${q.name} (${q.desc} ${referenceYear})`,
        shortLabel: `${q.num}º Tri (${q.desc})`,
        previousValue: prevVal,
        previousLabel: prevLabel,
        months: q.months,
        year: referenceYear
      });
    }
  } else if (granularity === 'semestral') {
    // 2 semestres
    const semesters = [
      { num: 1, name: '1º Semestre (S1)', months: ['01', '02', '03', '04', '05', '06'], desc: 'Jan-Jun' },
      { num: 2, name: '2º Semestre (S2)', months: ['07', '08', '09', '10', '11', '12'], desc: 'Jul-Dez' },
    ];

    for (let i = semesters.length - 1; i >= 0; i--) {
      const s = semesters[i];
      const val = `${referenceYear}-S${s.num}`;
      
      let prevVal: string;
      let prevLabel: string;
      if (s.num === 1) {
        prevVal = `${referenceYear - 1}-S2`;
        prevLabel = `2º Semestre S2 (${referenceYear - 1})`;
      } else {
        prevVal = `${referenceYear}-S1`;
        prevLabel = `1º Semestre S1 (${referenceYear})`;
      }

      options.push({
        value: val,
        label: `${s.name} (${s.desc} ${referenceYear})`,
        shortLabel: `${s.num}º Sem (${s.desc})`,
        previousValue: prevVal,
        previousLabel: prevLabel,
        months: s.months,
        year: referenceYear
      });
    }
  } else if (granularity === 'anual') {
    // Anos
    for (let y = referenceYear; y >= referenceYear - 3; y--) {
      options.push({
        value: `${y}`,
        label: `Ano Fiscal ${y}`,
        shortLabel: `${y}`,
        previousValue: `${y - 1}`,
        previousLabel: `Ano Fiscal ${y - 1}`,
        months: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
        year: y
      });
    }
  }

  return options;
}

/**
 * Verifica se uma data ISO pertence ao período especificado
 */
export function isDateInPeriod(dateStr?: string, periodOption?: PeriodOption | null): boolean {
  if (!dateStr || !periodOption) return false;
  const cleanDate = dateStr.trim();
  const yearStr = String(periodOption.year);
  
  if (!cleanDate.startsWith(yearStr)) return false;
  
  // Extrai o mês (ex: '2026-08-12' -> '08')
  const parts = cleanDate.split('-');
  if (parts.length < 2) return false;
  const month = parts[1];
  
  return periodOption.months.includes(month);
}

/**
 * Extrai a data representativa de um item qualquer (OS, Venda, Orçamento, OP)
 */
export function extractItemDate(item: any): string {
  if (!item) return '';
  return item.createdAt || 
         item.serviceDate || 
         item.startedAt || 
         item.plannedStartDate || 
         item.issueDate || 
         item.date || 
         '';
}

/**
 * Calcula variação percentual entre período atual e anterior
 */
export function calculateVariation(currentVal: number, previousVal: number): {
  percent: number;
  absolute: number;
  isPositive: boolean;
  formatted: string;
} {
  const absolute = currentVal - previousVal;
  if (previousVal === 0) {
    const percent = currentVal > 0 ? 100 : 0;
    return {
      percent,
      absolute,
      isPositive: currentVal >= 0,
      formatted: currentVal > 0 ? '+100%' : '0%'
    };
  }
  const percent = ((currentVal - previousVal) / previousVal) * 100;
  return {
    percent,
    absolute,
    isPositive: percent >= 0,
    formatted: `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`
  };
}
