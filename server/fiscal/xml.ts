// Montagem de XML compacto (sem espaços entre tags), como a SEFAZ exige.
// Elementos com valor vazio/nulo são omitidos; a obrigatoriedade é conferida antes, na validação.

export function esc(v: unknown): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Texto livre: remove quebras de linha e espaços duplicados (a SEFAZ rejeita espaços nas pontas)
export function clean(v: unknown, max?: number): string {
  let s = String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (max && s.length > max) s = s.slice(0, max).trim();
  return s;
}

export function tag(name: string, value: unknown, attrs?: Record<string, string | number>): string {
  if (value === null || value === undefined || value === "") return "";
  const a = attrs ? Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("") : "";
  return `<${name}${a}>${esc(value)}</${name}>`;
}

// Grupo: omitido quando todos os filhos estão vazios
export function group(name: string, children: Array<string | false | null | undefined>, attrs?: Record<string, string | number>): string {
  const inner = children.filter(Boolean).join("");
  if (!inner) return "";
  const a = attrs ? Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join("") : "";
  return `<${name}${a}>${inner}</${name}>`;
}

export const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

// Arredondamento comercial em 2 casas (valores da nota)
export function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function dec(n: number | null | undefined, places = 2): string {
  const v = Number(n || 0);
  return v.toFixed(places);
}

// Percentuais/alíquotas: até 4 casas, sem zeros desnecessários além de 2
export function pct(n: number | null | undefined): string {
  let s = Number(n || 0).toFixed(4);
  while (s.endsWith("0") && s.split(".")[1].length > 2) s = s.slice(0, -1);
  return s;
}

// Lê o conteúdo de uma tag (primeira ocorrência) de um XML de retorno
export function readTag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
  return m ? m[1] : null;
}

// Trecho bruto de um elemento (com as tags), preservando-o exatamente como veio
export function readElement(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>[\\s\\S]*?</(?:\\w+:)?${name}>`));
  return m ? m[0] : null;
}

export function readAllElements(xml: string, name: string): string[] {
  return xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>[\\s\\S]*?</(?:\\w+:)?${name}>`, "g")) || [];
}
