/**
 * Marca no cabeçalho (todos os ramos)
 *
 * - GET  /api/empresa-ativa   identificação da empresa em uso (cartão do menu, cabeçalho e PDFs exportados). O logo
 *                              é o do cadastro da empresa (Logomarca / Imagem da Empresa); o retorno diz também o que
 *                              o usuário pode fazer (abrir o cadastro para trocar o logo, exportar dados)
 * - GET  /api/divulgacao      mensagens de divulgação do MotorDesk exibidas abaixo do cabeçalho
 * - PUT  /api/divulgacao      altera as mensagens (só o administrador da plataforma)
 *
 * As mensagens ficam em divulgacaoSistema, chave que só esta rota grava (as gravações comuns do navegador não a
 * trazem), para uma cópia antiga não desfazer a alteração.
 */
import type { Express } from "express";

type Contexto =
  | { status: number; error: string }
  | { companyId: string; company: any; user: any; businessType: string; master: boolean; podeLogo: boolean; podeExportar: boolean };

export interface MarcaDeps {
  getStore: () => any;
  mutateStore: (fn: (current: any) => any, meta: { source: string; companyId?: string; userId?: string }) => Promise<any>;
  contexto: (req: any) => Contexto;
}

export interface MensagemDivulgacao { titulo: string; texto: string; link?: string; acao?: string }

// Mensagens usadas enquanto o administrador da plataforma não define as próprias
export const DIVULGACAO_PADRAO: MensagemDivulgacao[] = [
  { titulo: "Saúde da empresa", texto: "Caixa, vendas, inadimplência e estoque numa tela só.", acao: "saude" },
  { titulo: "Lançamentos", texto: "Entradas e saídas do mês, contas bancárias e conciliação por OFX.", acao: "lancamentos" },
  { titulo: "Exportar", texto: "Leve qualquer lista para PDF, Excel ou CSV pelo botão Exportar.", acao: "" },
  { titulo: "MotorDesk", texto: "Gestão completa para oficinas, autopeças e indústrias. Indique a um parceiro!", link: "/" },
];

const limpar = (v: any, max: number) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const linkSeguro = (v: any) => {
  const l = limpar(v, 300);
  if (!l) return "";
  if (l.startsWith("/") && !l.startsWith("//")) return l;
  return /^https:\/\/[^\s"'<>]+$/i.test(l) ? l : "";
};

function divulgacaoAtual(store: any) {
  const d = store?.divulgacaoSistema;
  const mensagens: MensagemDivulgacao[] = Array.isArray(d?.mensagens) && d.mensagens.length ? d.mensagens : DIVULGACAO_PADRAO;
  return {
    ativo: d?.ativo !== false,
    intervaloSeg: Math.min(60, Math.max(5, Number(d?.intervaloSeg) || 9)),
    mensagens,
    personalizada: Array.isArray(d?.mensagens) && d.mensagens.length > 0,
  };
}

export function registerMarcaRoutes(app: Express, d: MarcaDeps) {
  const negar = (res: any, c: any) => res.status(c.status).json({ success: false, error: c.error });

  app.get("/api/empresa-ativa", (req: any, res) => {
    const c = d.contexto(req);
    if ("status" in c) return negar(res, c);
    const co = c.company;
    const inativa = co.active === false || /^(inactive|inativ|blocked|bloque|suspens)/i.test(String(co.status || ""));
    res.json({
      success: true,
      id: co.id,
      nome: co.tradeName || co.name || "",
      razaoSocial: co.name || "",
      cnpj: co.cnpj || co.document || "",
      segmento: c.businessType,
      ativa: !inativa,
      // logo do cadastro da empresa (Criar Usuários / Níveis → Logomarca / Imagem da Empresa)
      logo: co.logoUrl || co.logo || "",
      podeLogo: c.podeLogo,
      podeExportar: c.podeExportar,
    });
  });

  app.get("/api/divulgacao", (req: any, res) => {
    const c = d.contexto(req);
    if ("status" in c) return negar(res, c);
    res.json({ success: true, ...divulgacaoAtual(d.getStore()), podeEditar: c.master });
  });

  app.put("/api/divulgacao", async (req: any, res) => {
    const c = d.contexto(req);
    if ("status" in c) return negar(res, c);
    if (!c.master) return res.status(403).json({ success: false, error: "Só o administrador da plataforma altera a divulgação do MotorDesk." });
    const b = req.body || {};
    const mensagens: MensagemDivulgacao[] = (Array.isArray(b.mensagens) ? b.mensagens : []).slice(0, 12).map((m: any) => ({
      titulo: limpar(m?.titulo, 40),
      texto: limpar(m?.texto, 160),
      link: linkSeguro(m?.link),
      acao: ["saude", "lancamentos"].includes(m?.acao) ? m.acao : "",
    })).filter((m: MensagemDivulgacao) => m.texto);
    const nova = { ativo: b.ativo !== false, intervaloSeg: Math.min(60, Math.max(5, Number(b.intervaloSeg) || 9)), mensagens, atualizadoEm: new Date().toISOString(), por: c.user.id };
    try {
      await d.mutateStore((current) => ({ ...current, divulgacaoSistema: nova }), { source: "divulgacao", companyId: c.companyId, userId: c.user.id });
      res.json({ success: true, ...divulgacaoAtual({ divulgacaoSistema: nova }), podeEditar: true });
    } catch (err: any) {
      res.status(503).json({ success: false, error: "Não foi possível gravar agora. Tente novamente." });
    }
  });
}
