import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Calculator,
  FileText,
  Download,
  ShieldCheck,
  Building2,
  BarChart3,
  Clock,
  Boxes,
  Users,
  Factory,
  Settings,
  Wrench,
  Truck,
  HelpCircle
} from 'lucide-react';

export interface SubmenuItemDetail {
  id: string;
  title: string;
  label?: string;
  description: string;
  badge?: string;
  icon?: string;
  category?: string;
  isPopular?: boolean;
}

export interface ScreenSubmenuHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModuleId: string | null;
  activeModuleName?: string;
  items?: SubmenuItemDetail[];
  onNavigate: (routeId: string) => void;
  activeRoute?: string;
  currentSegment?: string;
}

// Catálogo Mestre Completo com Descrições Detalhadas para Todos os Módulos do Sistema
export const MODULE_SUBMENUS_CATALOG: Record<string, {
  name: string;
  segment: string;
  description: string;
  icon: string;
  items: SubmenuItemDetail[];
}> = {
  financial: {
    name: 'Módulo Financeiro & Fluxo de Caixa',
    segment: 'Financeiro',
    description: 'Gestão completa de tesouraria, contas a pagar e receber, demonstrativos contábeis e formação de preços.',
    icon: '💲',
    items: [
      {
        id: 'accounts_payable',
        title: 'Contas a Pagar',
        badge: 'Obrigações & Despesas',
        icon: '💳',
        description: 'Gestão minuciosa de obrigações com fornecedores de peças e matérias-primas, serviços de retífica/usinagem, tributos municipais e federais, despesas operacionais fixas e liquidações parciais com histórico.',
        isPopular: true
      },
      {
        id: 'accounts_receivable',
        title: 'Contas a Receber',
        badge: 'Receitas & Clientes',
        icon: '💵',
        description: 'Acompanhamento rigoroso de títulos a receber organizados por cliente e vencimento, emissão e conciliação de boletos bancários (CNAB), faturamento B2B, vendas balcão, aging de atrasos e réguas de cobrança.',
        isPopular: true
      },
      {
        id: 'financial',
        title: 'Fluxo de Caixa Diário',
        badge: 'Tesouraria',
        icon: '📊',
        description: 'Entradas e saídas consolidadas por banco e balcão, saldo acumulado em tempo real, conciliação de extratos bancários e projeção financeira para tomada de decisão antecipada.',
        isPopular: true
      },
      {
        id: 'financial_dre',
        title: 'DRE Gerencial Consolidado',
        badge: 'Controladoria',
        icon: '📈',
        description: 'Demonstrativo do Resultado do Exercício com cálculo automatizado de receita bruta, deduções fiscais, margem de contribuição, despesas fixas, EBITDA e lucro líquido do período.',
        isPopular: true
      },
      {
        id: 'price_calculation',
        title: 'Cálculo de Preços & Markup',
        badge: 'Precificação',
        icon: '🧮',
        description: 'Formação científica do preço de venda para produtos fabricados, peças de revenda e serviços de oficina, considerando custos variáveis, impostos, comissões e margem de lucro líquido pretendida.'
      }
    ]
  },
  fiscal: {
    name: 'Módulo Fiscal & Tributário',
    segment: 'Fiscal & SEFAZ',
    description: 'Emissão de documentos fiscais eletrônicos, conciliação tributária, conferência e extração de XMLs para a contabilidade.',
    icon: '📑',
    items: [
      {
        id: 'fiscal_invoicing_grid',
        title: 'Emissão das Notas Fiscais',
        badge: 'Faturamento SEFAZ',
        icon: '📄',
        description: 'Painel gerador e transmissor de NF-e (produtos 5.101/6.101), NFS-e (prestação de serviços) e NFC-e com cálculo automatizado de tributos (ICMS, IPI, PIS, COFINS, ISS) e status de autorização.',
        isPopular: true
      },
      {
        id: 'fiscal_xml_extraction',
        title: 'Baixar XML em Lote (Mensal)',
        badge: 'Exportação Contábil',
        icon: '📦',
        description: 'Extração instantânea e unificada de todos os arquivos XML autorizados e DANFEs em arquivo compactado (.ZIP), pronto para envio mensal ao escritório de contabilidade sem retrabalho.',
        isPopular: true
      },
      {
        id: 'fiscal_conference',
        title: 'Fila de Conferência Fiscal',
        badge: 'Auditoria & Compliance',
        icon: '🔍',
        description: 'Ambiente de pré-validação antes da transmissão SEFAZ, permitindo auditar NCM, CFOP, alíquotas tributárias, CST/CSOSN e dados cadastrais para evitar rejeições e multas fiscais.',
        isPopular: true
      },
      {
        id: 'fiscal',
        title: 'Módulo Fiscal Completo',
        badge: 'Configuração & Livros',
        icon: '🏛️',
        description: 'Painel administrativo com gestão de Certificados Digitais A1, livros de apuração fiscal, notas emitidas e contingência operacional.'
      }
    ]
  },
  reports: {
    name: 'Central de Relatórios Estratégicos',
    segment: 'BI & Inteligência',
    description: 'Relatórios gerenciais completos com filtros por período e seleção de datas, clientes, ordenação por coluna e exportação em múltiplas extensões.',
    icon: '📊',
    items: [
      {
        id: 'industrial_reports',
        title: 'Relatórios de Manufatura & OPs',
        badge: 'Produção & PCP',
        icon: '🏭',
        description: 'Relatório com os filtros mais usados: selecione período por data inicial e final, filtre por cliente, ordene os dados clicando no cabeçalho das colunas e exporte em PDF, Excel (.xlsx), CSV, TXT e Word.',
        isPopular: true
      },
      {
        id: 'mes_apontamentos',
        title: 'Apontamentos Chão de Fábrica (MES)',
        badge: 'Produtividade Operacional',
        icon: '⏱️',
        description: 'Registro de horas produtivas trabalhadas por operador, pausas de máquina, refugo e cálculo em tempo real do índice OEE (Overall Equipment Effectiveness) da fábrica.',
        isPopular: true
      },
      {
        id: 'bom_consumo',
        title: 'Estruturas BOM & Estoque Fabril',
        badge: 'Engenharia & Almoxarifado',
        icon: '🧩',
        description: 'Ficha técnica com lista de materiais (BOM), consumo unitário previsto vs realizado, itens com saldo crítico e capital imobilizado em estoque.',
        isPopular: true
      },
      {
        id: 'custos_lote',
        title: 'Custos & Rentabilidade por Lote',
        badge: 'Controladoria Industrial',
        icon: '💰',
        description: 'Apuração detalhada do custo real por lote fabricado, englobando matéria-prima consumida, mão de obra direta (MOD) e custos indiretos de fabricação (GGF).',
        isPopular: true
      },
      {
        id: 'vendas_clientes',
        title: 'Vendas por Cliente Industrial',
        badge: 'Comercial B2B',
        icon: '👥',
        description: 'Volume de vendas e faturamento agrupado por cliente, análise de ticket médio, produtos mais demandados e histórico de pedidos para previsão de demanda.',
        isPopular: true
      },
      {
        id: 'reports',
        title: 'Central Geral de Relatórios ERP',
        badge: 'Visão Consolidada',
        icon: '📈',
        description: 'Acesse o menu hierárquico com todas as categorias do ERP: Contas a Pagar, Contas a Receber, Extrato Bancário, DRE, Curva ABC 80/20 e Indicadores.'
      }
    ]
  },
  ind_mod_comercial: {
    name: 'Comercial & Vendas Industriais',
    segment: 'Indústria',
    description: 'Funil de vendas B2B, prospecção de clientes, emissão de orçamentos fabris e pedidos de produção.',
    icon: '📢',
    items: [
      {
        id: 'ind_com_marketing',
        title: 'Marketing & Prospecção B2B',
        badge: 'Funil de Vendas',
        icon: '📢',
        description: 'Captação de leads industriais, campanhas comerciais, análise de canais de aquisição e qualificação de oportunidades para o time comercial.'
      },
      {
        id: 'ind_com_clientes',
        title: 'Clientes Industriais B2B',
        badge: 'Carteira Ativa',
        icon: '👥',
        description: 'Cadastro detalhado de clientes pessoa jurídica, histórico de compras, tabelas de preço diferenciadas, limites de crédito e contatos de compras.',
        isPopular: true
      },
      {
        id: 'ind_com_orcamentos',
        title: 'Orçamentos Fabris',
        badge: 'Propostas Comerciais',
        icon: '📑',
        description: 'Elaboração de cotações técnicas para itens padrão e sob medida, memória de cálculo de custos, prazos de entrega e geração de propostas em PDF.',
        isPopular: true
      },
      {
        id: 'ind_com_pedidos',
        title: 'Pedidos de Venda',
        badge: 'Entrada de Pedidos',
        icon: '🛒',
        description: 'Confirmação de pedidos comerciais aceitos pelo cliente, reserva automática de estoque e disparo imediato para o PCP programar a produção.',
        isPopular: true
      },
      {
        id: 'ind_com_carteira',
        title: 'Carteira de Pedidos (Backlog)',
        badge: 'Gestão de Entregas',
        icon: '📈',
        description: 'Acompanhamento do saldo da carteira de pedidos a faturar, prazos prometidos aos clientes e faturamento previsto por período.'
      },
      {
        id: 'ind_com_posvenda',
        title: 'Pós-Venda & Atendimento SAC',
        badge: 'Relacionamento',
        icon: '🎧',
        description: 'Atendimento a garantias técnicas, chamados de assistência, índice de satisfação de clientes industriais e feedback de entregas.'
      }
    ]
  },
  ind_mod_engenharia: {
    name: 'Engenharia de Produto & P&D',
    segment: 'Indústria',
    description: 'Desenvolvimento de produtos, estruturas de engenharia (BOM), fichas técnicas e integração com software CAD SolidWorks.',
    icon: '📐',
    items: [
      {
        id: 'ind_eng_dashboard',
        title: 'Dashboard de Engenharia',
        badge: 'Indicadores P&D',
        icon: '📊',
        description: 'Visão geral dos projetos em desenvolvimento, tempo médio de lançamento, quantidade de itens cadastrados e status das revisões ativas.'
      },
      {
        id: 'ind_eng_projetos',
        title: 'Projetos Especiais',
        badge: 'Engenharia Sob Medida',
        icon: '💡',
        description: 'Gestão de projetos técnicos personalizados (ETO - Engineer to Order), cronograma de desenvolvimento e aprovação com o cliente.'
      },
      {
        id: 'ind_eng_produtos',
        title: 'Catálogo de Produtos Fabricados',
        badge: 'Portfólio Fabril',
        icon: '⚙️',
        description: 'Cadastro técnico de produtos manufaturados, códigos de identificação interna, desenhos técnicos e especificações dimensionais.',
        isPopular: true
      },
      {
        id: 'units_of_measure',
        title: 'Unidades de Medida',
        badge: 'Padronização',
        icon: '📏',
        description: 'Definição e fatores de conversão entre unidades industriais (KG, M, PEÇA, L, CX) para compras, produção e faturamento sem divergências.'
      },
      {
        id: 'ind_eng_boms',
        title: 'Estruturas de Produto (BOM)',
        badge: 'Lista de Materiais',
        icon: '🧩',
        description: 'Árvore completa de materiais com subconjuntos, componentes de matéria-prima, percentuais de perda técnica e tempo padrão de fabricação.',
        isPopular: true
      },
      {
        id: 'ind_eng_fichatecnica',
        title: 'Ficha Técnica de Processo',
        badge: 'Roteiro de Produção',
        icon: '📋',
        description: 'Roteiro detalhado das operações fabris (corte, dobra, usinagem, solda, pintura, montagem) com postos de trabalho e instruções operacionais.',
        isPopular: true
      },
      {
        id: 'ind_eng_solidworks',
        title: 'Integração SolidWorks CAD',
        badge: 'CAD / 3D Sync',
        icon: '📐',
        description: 'Importação direta de arquivos SolidWorks (SLDPRT, SLDASM), extração automatizada da lista BOM e sincronização com o ERP com um clique.',
        isPopular: true
      },
      {
        id: 'ind_eng_revisoes',
        title: 'Controle de Revisões (ECN)',
        badge: 'Engenharia Reversa',
        icon: '🔄',
        description: 'Histórico de alterações de engenharia (Engineering Change Notice), aprovações formais e garantia de que a fábrica use sempre a versão correta.'
      }
    ]
  },
  ind_mod_pcp: {
    name: 'PCP & Gestão de Compras Fabris',
    segment: 'Indústria',
    description: 'Planejamento e Controle da Produção, cálculo MRP de materiais, cotações com fornecedores e controle de ordens de compra.',
    icon: '📅',
    items: [
      {
        id: 'ind_pcp_planejamento',
        title: 'Planejamento da Produção (MPS)',
        badge: 'Plano Mestre',
        icon: '📅',
        description: 'Plano mestre de produção com base na carteira de pedidos e previsão de demanda, balanceando capacidade das linhas e prazos de entrega.',
        isPopular: true
      },
      {
        id: 'ind_pcp_mrp',
        title: 'Cálculo de Necessidades (MRP)',
        badge: 'Explosão de Materiais',
        icon: '🔢',
        description: 'Explosão automatizada da estrutura dos produtos para calcular compras de matérias-primas e componentes que faltam no estoque.',
        isPopular: true
      },
      {
        id: 'ind_pcp_solicitacoes',
        title: 'Solicitações de Compra',
        badge: 'Requisições Fabris',
        icon: '📝',
        description: 'Geração e aprovação de requisições de compra originadas pelo chão de fábrica ou disparadas automaticamente pelo MRP.',
        isPopular: true
      },
      {
        id: 'quotations',
        title: 'Cotações com Fornecedores',
        badge: 'Mapa Comparativo',
        icon: '🤝',
        description: 'Envio de cotações para múltiplos fornecedores, mapa comparativo de preços, condições de pagamento e seleção da melhor oferta.',
        isPopular: true
      },
      {
        id: 'ind_pcp_compras',
        title: 'Pedidos de Compra Fabris',
        badge: 'Ordens de Fornecimento',
        icon: '🛒',
        description: 'Emissão formal de ordens de compra com data de entrega compromissada, acompanhamento de follow-up e envio direto por e-mail/PDF.',
        isPopular: true
      },
      {
        id: 'ind_pcp_semaforo',
        title: 'Semáforo de Materiais',
        badge: 'Alerta de Ruptura',
        icon: '🚦',
        description: 'Painel visual (verde, amarelo, vermelho) indicando se todos os insumos de cada Ordem de Produção já chegaram antes de liberar a fábrica.',
        isPopular: true
      },
      {
        id: 'ind_pcp_recebimento',
        title: 'Recebimento Físico & Fiscal',
        badge: 'Conferência de Cargas',
        icon: '📥',
        description: 'Entrada de notas fiscais de compra com conciliação XML de fornecedor, conferência cega de quantidades e etiquetagem WMS.'
      }
    ]
  },
  ind_mod_producao: {
    name: 'Produção & Manufatura (MES)',
    segment: 'Indústria',
    description: 'Gestão de Ordens de Produção (OP), rastreabilidade de lotes, apontamentos em tempo real e custos realizados da fábrica.',
    icon: '⚙️',
    items: [
      {
        id: 'production_orders',
        title: 'Ordens de Produção (OP)',
        badge: 'Comando Fabril',
        icon: '⚙️',
        description: 'Abertura, sequenciamento, liberação e encerramento de OPs com acompanhamento visual de progresso e prazos prometidos.',
        isPopular: true
      },
      {
        id: 'lots',
        title: 'Lotes & Rastreabilidade',
        badge: 'Controle de Lotes',
        icon: '🏷️',
        description: 'Criação de lotes fabris com registro completo de matérias-primas utilizadas, operadores responsáveis e data/hora de fabricação.',
        isPopular: true
      },
      {
        id: 'trace_product',
        title: 'Onde Está Meu Produto?',
        badge: 'Localizador em Linha',
        icon: '🔍',
        description: 'Localizador instantâneo do status e posto de trabalho exato em que qualquer ordem de produção ou lote se encontra no chão de fábrica.',
        isPopular: true
      },
      {
        id: 'ind_prod_custos',
        title: 'Custos Realizados da Produção',
        badge: 'Custo Efetivo',
        icon: '💲',
        description: 'Comparativo entre o custo padrão orçado e o custo real apontado (matéria-prima + mão de obra + paradas) de cada lote concluído.',
        isPopular: true
      },
      {
        id: 'ind_prod_pcp_dash',
        title: 'Painel de Eficiência Fabril',
        badge: 'Indicadores MES',
        icon: '📊',
        description: 'Gráficos de peças produzidas no dia, ritmo de fábrica (Takt Time), cumprimento do plano de produção e desvios de tempo.'
      }
    ]
  },
  ind_mod_rh: {
    name: 'Operadores & Recursos Humanos Fabris',
    segment: 'Indústria',
    description: 'Gestão de operadores, postos de trabalho, apontamento de chão de fábrica e controle de paradas de linha.',
    icon: '👷',
    items: [
      {
        id: 'ind_rh_operadores',
        title: 'Cadastro de Operadores & Postos',
        badge: 'Mão de Obra',
        icon: '👷',
        description: 'Registro de colaboradores do chão de fábrica, habilidades operacionais, certificações de segurança e postos de trabalho atribuídos.',
        isPopular: true
      },
      {
        id: 'ind_rh_apontamentos',
        title: 'Apontamento Chão de Fábrica',
        badge: 'Registro de Turno',
        icon: '⏱️',
        description: 'Registro simples de início e fim de tarefas nas OPs, permitindo calcular o tempo real de execução de cada peça e eficiência individual.',
        isPopular: true
      },
      {
        id: 'ind_rh_paradas',
        title: 'Paradas de Linha & Motivos',
        badge: 'Disponibilidade',
        icon: '🛑',
        description: 'Registro de ocorrências que interromperam a produção (falta de material, quebra de ferramenta, manutenção, setup excessivo).',
        isPopular: true
      },
      {
        id: 'ind_rh_produtividade',
        title: 'Produtividade da Mão de Obra',
        badge: 'Rendimento & OEE',
        icon: '⚡',
        description: 'Indicadores de eficiência horária por setor, horas extras fabris, comparação entre horas previstas e horas realmente trabalhadas.'
      }
    ]
  },
  ind_mod_qualidade: {
    name: 'Controle de Qualidade & CQ Fabril',
    segment: 'Indústria',
    description: 'Inspeções de recebimento e processo, relatórios de não conformidade (RNC) e planos de ação corretiva.',
    icon: '✅',
    items: [
      {
        id: 'quality_inspections',
        title: 'Inspeções de Qualidade',
        badge: 'Auditoria de Peças',
        icon: '✅',
        description: 'Checklists de inspeção dimensional e visual no recebimento de matéria-prima e durante as etapas produtivas.',
        isPopular: true
      },
      {
        id: 'non_conformities',
        title: 'Relatório de Não Conformidades (RNC)',
        badge: 'Qualidade Total',
        icon: '⚠️',
        description: 'Abertura, investigação da causa-raiz (5 Porquês / Ishikawa) e planos de ação corretiva para lotes rejeitados.',
        isPopular: true
      },
      {
        id: 'ind_cq_dashboard',
        title: 'Dashboard de Qualidade',
        badge: 'Indicadores de Refugo',
        icon: '📊',
        description: 'Taxa de peças conformes (PPM / FPY), histórico de desvios por fornecedor e custos de retrabalho na fábrica.'
      }
    ]
  },
  ind_mod_manutencao: {
    name: 'Manutenção de Ativos Fabris (PCM)',
    segment: 'Indústria',
    description: 'Gestão de máquinas, planos de manutenção preventiva e chamados de manutenção corretiva.',
    icon: '🛠️',
    items: [
      {
        id: 'equipment_maintenance',
        title: 'Gestão de Ativos & Manutenções',
        badge: 'Máquinas & Ferramentas',
        icon: '🛠️',
        description: 'Controle de equipamentos, máquinas operatrizes, histórico de intervenções, custos de peças de reposição e plano de manutenção preventiva.',
        isPopular: true
      },
      {
        id: 'ind_pcm_dashboard',
        title: 'Dashboard de Manutenção (MTBF / MTTR)',
        badge: 'Indicadores PCM',
        icon: '📊',
        description: 'Tempo médio entre falhas (MTBF), tempo médio de reparo (MTTR) e disponibilidade operacional das máquinas da fábrica.'
      }
    ]
  },
  ind_mod_expedicao: {
    name: 'Expedição, Embalagem & Logística',
    segment: 'Indústria',
    description: 'Separação de pedidos concluídos, conferência de embalagens, faturamento e rastreio com transportadoras.',
    icon: '🚚',
    items: [
      {
        id: 'withdrawals',
        title: 'Expedição & Baixa de Entregas',
        badge: 'Despacho de Cargas',
        icon: '🚚',
        description: 'Conferência de lotes acabados, romaneio de expedição, etiqueta de transporte e baixa na entrega ao cliente com comprovante assinado.',
        isPopular: true
      },
      {
        id: 'client_installation',
        title: 'Instalação & Entrega Técnica no Cliente',
        badge: 'Serviço em Campo',
        icon: '🏗️',
        description: 'Controle de montagem e entrega técnica no cliente final, laudos de entrega e aprovação formal do comprador industrial.',
        isPopular: true
      },
      {
        id: 'ind_exp_dash',
        title: 'Painel Logístico de Expedição',
        badge: 'Status de Despacho',
        icon: '📊',
        description: 'Cargas prontas para despacho, pedidos retidos por aguardar faturamento e índice de pontualidade de entregas (OTIF).'
      }
    ]
  },
  ind_mod_cadastros: {
    name: 'Cadastros Gerais, Itens & WMS',
    segment: 'Indústria & WMS',
    description: 'Catálogo mestre de itens, endereçamento WMS do almoxarifado, emissão de etiquetas com código de barras e fornecedores.',
    icon: '🔩',
    items: [
      {
        id: 'item_master',
        title: 'Catálogo Mestre de Itens',
        badge: 'Base Geral de Produtos',
        icon: '🔩',
        description: 'Cadastro unificado de matérias-primas, produtos acabados, embalagens e itens de consumo com foto, NCM e especificações.',
        isPopular: true
      },
      {
        id: 'warehouse_locations',
        title: 'Endereçamento WMS',
        badge: 'Almoxarifado Organizado',
        icon: '📍',
        description: 'Definição de ruas, corredores, prateleiras e gavetas do almoxarifado para localização rápida de qualquer peça ou insumo.',
        isPopular: true
      },
      {
        id: 'label_generator',
        title: 'Gerador de Etiquetas com Código de Barras',
        badge: 'Identificação Rápida',
        icon: '🏷️',
        description: 'Impressão de etiquetas de identificação com código de barras (Code 128, QR Code) para caixas, gavetas e paletes da fábrica.',
        isPopular: true
      },
      {
        id: 'suppliers',
        title: 'Cadastro de Fornecedores',
        badge: 'Parceiros de Suprimentos',
        icon: '🏭',
        description: 'Dados cadastrais de fornecedores, contatos comerciais, histórico de pontualidade e qualificação de fornecimento.',
        isPopular: true
      },
      {
        id: 'categories',
        title: 'Famílias & Categorias de Materiais',
        badge: 'Agrupamento',
        icon: '🗂️',
        description: 'Categorização de materiais para fins de relatórios de estoque, compra conjunta e apuração contábil.'
      }
    ]
  },
  ind_mod_bi: {
    name: 'Relatórios Executivos & BI Industrial',
    segment: 'Indústria',
    description: 'Indicadores estratégicos de desempenho fabril, curva ABC de clientes e análise de rentabilidade.',
    icon: '📈',
    items: [
      {
        id: 'industrial_reports',
        title: 'Central de Relatórios de Manufatura',
        badge: 'Relatórios com Filtros',
        icon: '📈',
        description: 'Relatórios completos com filtros mais usados (por período e seleção de datas, clientes, ordenação por coluna e exportação em extensões).',
        isPopular: true
      },
      {
        id: 'cost_analysis',
        title: 'Análise de Custos & Rentabilidade',
        badge: 'Controladoria Fabril',
        icon: '💰',
        description: 'Rentabilidade real por família de produtos, margem de contribuição e comparação entre metas orçadas e realizadas.',
        isPopular: true
      }
    ]
  }
};

export const ScreenSubmenuHubModal: React.FC<ScreenSubmenuHubModalProps> = ({
  isOpen,
  onClose,
  activeModuleId,
  activeModuleName,
  items: customItems,
  onNavigate,
  activeRoute,
  currentSegment = 'Geral'
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Limpar busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setSearchFilter('');
    }
  }, [isOpen, activeModuleId]);

  const moduleData = useMemo(() => {
    if (!activeModuleId) return null;
    return MODULE_SUBMENUS_CATALOG[activeModuleId] || null;
  }, [activeModuleId]);

  const displayTitle = activeModuleName || moduleData?.name || 'Central de Navegação de Módulo';
  const displayDescription = moduleData?.description || 'Selecione a funcionalidade ou tela desejada para abrir diretamente.';
  const displayIcon = moduleData?.icon || '📂';

  // Itens para renderizar
  const allItems: SubmenuItemDetail[] = useMemo(() => {
    if (customItems && customItems.length > 0) return customItems;
    if (moduleData && moduleData.items) return moduleData.items;
    return [];
  }, [customItems, moduleData]);

  // Filtragem pela busca
  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return allItems;
    const q = searchFilter.toLowerCase();
    return allItems.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    );
  }, [allItems, searchFilter]);

  if (!isOpen) return null;

  return (
    <div
      id="screen-submenu-hub-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="screen-submenu-hub-container"
        className="relative w-full max-w-5xl bg-white border border-slate-300/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Topo da Janela */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4.5 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {displayIcon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-wide truncate text-white">
                  {displayTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  {moduleData?.segment || currentSegment}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({filteredItems.length} {filteredItems.length === 1 ? 'tela disponível' : 'telas disponíveis'})
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                {displayDescription}
              </p>
            </div>
          </div>

          <button
            id="btn-close-submenu-hub"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/15 transition cursor-pointer shrink-0 ml-3"
            title="Fechar janela (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtro Rápido */}
        <div className="px-6 py-3 bg-slate-100/90 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-submenus"
              type="text"
              autoFocus
              placeholder="Buscar tela, relatório ou funcionalidade pelo nome ou palavras-chave..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition"
            />
          </div>
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Grade de Submenus com Descrições Completas (Dentro da Tela) */}
        <div className="p-6 overflow-y-auto flex-1 overscroll-contain bg-slate-50/70">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <HelpCircle className="w-10 h-10 mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="font-semibold text-sm">Nenhuma tela encontrada para "{searchFilter}"</p>
              <p className="text-xs text-slate-400 mt-1">Tente pesquisar por outro termo ou limpe o filtro de busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => {
                const isCurrent = activeRoute === item.id;
                return (
                  <div
                    key={item.id}
                    id={`screen-subitem-card-${item.id}`}
                    onClick={() => {
                      onClose();
                      onNavigate(item.id);
                    }}
                    className={`group relative p-4.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-indigo-50/80 border-indigo-400 shadow-md ring-2 ring-indigo-400/30'
                        : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-md hover:bg-slate-50/90'
                    }`}
                  >
                    <div>
                      {/* Cabeçalho do Card */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl shrink-0 select-none group-hover:scale-110 transition-transform">
                            {item.icon || '📌'}
                          </span>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                              {item.title}
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold">
                                  TELA ATUAL
                                </span>
                              )}
                            </h3>
                            {item.badge && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>

                        {item.isPopular && (
                          <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shadow-3xs">
                            Mais Usado
                          </span>
                        )}
                      </div>

                      {/* Descrição Completa e Nítida */}
                      <p className="text-xs text-slate-600 leading-relaxed font-normal mt-1.5">
                        {item.description}
                      </p>
                    </div>

                    {/* Botão / Ação de Acesso */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        ID: {item.id}
                      </span>
                      <div className="flex items-center gap-1 font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors">
                        <span>Acessar Tela</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé da Janela com Dica e Informações */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Dica:</span>
            <span>Clique em qualquer cartão para abrir a tela diretamente ou pressione <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] font-bold text-slate-700">ESC</kbd> para fechar.</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            MotorDesk ERP • Visualização em Tela Cheia
          </div>
        </div>
      </div>
    </div>
  );
};
