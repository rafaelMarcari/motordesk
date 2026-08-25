# MotorDesk — Diretrizes do Sistema, Módulos, Segmentos de Negócio & Regras Operacionais

Este documento consolida o mapeamento completo dos segmentos de atuação do **MotorDesk**, seus módulos, perfil de liberação modular (RBAC/Multi-tenant) e como cada um auxilia diretamente nas operações diárias de oficinas mecânicas, lojas de autopeças e centros automotivos integrados.

---

## 🏢 Segmentos de Negócio Suportados (Ramo de Atuação)

O MotorDesk oferece parametrização nativa por **Segmento de Atuação da Empresa (Tenant)**, ajustando os fluxos operacionais, o menu de navegação, a política de estoque e as regras fiscais de acordo com o perfil da empresa contratante:

### 1. 🔧 Segmento Oficina Mecânica (`OFICINA`)
- **Foco Operacional**: Gestão de pátio automotivo, abertura e tramitação de Ordens de Serviço (OS), diagnóstico técnico, checklists fotográficos de entrada/saída, agendamento de revisões preventivas, alocação de mecânicos e aplicação de peças em serviços.
- **Módulos Centrais Liberados**: Ordens de Serviço, Veículos & Frota, Serviços & Mão de Obra, Peças & Estoque, Clientes/CRM, Orçamentos Técnicos, Contas a Receber/Pagar, Fluxo de Caixa e Emissão Fiscal (NFS-e e NF-e).
- **Como auxilia nas operações**:
  - Elimina o fluxo de ordens de serviço em papel e evita perdas de histórico de manutenções veiculares.
  - Rastreia com precisão a produtividade de cada mecânico e as garantias de 90 dias de peças e mão de obra.
  - Alerta o cliente via WhatsApp sobre prazos e quilometragens para troca de óleo, correia dentada e filtros.
- **Público Indicado**: Oficinas mecânicas gerais, centros de reparação automotiva, autoelétricas, funilarias, oficinas de motos e oficinas de linha pesada/diesel.

---

### 2. 🛍️ Segmento Comércio & Autopeças (`COMERCIO`)
- **Foco Operacional**: Ponto de Venda Express (PDV Balcão), catálogo de produtos e autopeças com cálculo dimensional (unidade, linear, m² e m³), entrada rápida de notas fiscais via leitor XML de NF-e, controle de estoque mínimo e ponto de pedido, caixa rápido e emissão fiscal imediata (NFC-e e NF-e mod. 55).
- **Módulos Centrais Liberados**: Vendas Balcão (PDV), Peças & Estoque, Unidades de Medida & Dimensões, Cotações com Fornecedores, Clientes & Limite de Crédito, Contas a Receber/Pagar, Fluxo de Caixa, Transportadoras e Módulo Fiscal SEFAZ.
- **Como auxilia nas operações**:
  - Reduz filas no balcão com atendimento ágil em menos de 30 segundos por venda, sem burocracia de cadastro veicular obrigatório.
  - Suporta materiais fracionados e sob medida (mangueiras por metro, chapas por m², óleos por litro e fluidos a granel).
  - Alimenta o Contas a Receber e atualiza o estoque instantaneamente a cada venda no caixa.
- **Público Indicado**: Lojas de autopeças, distribuidoras de motopeças, casas de rolamentos e retentores, lojas de baterias e centros de troca rápida de óleo.

---

### 3. ⚡ Segmento Híbrido: Oficina + Comércio (`OFICINA_COMERCIO`)
- **Foco Operacional**: O ecossistema mais completo do MotorDesk. Unifica o fluxo de serviços no pátio com Ordens de Serviço completas E o fluxo de vendas rápidas no balcão de peças para clientes avulsos ou mecânicos terceiros.
- **Módulos Centrais Liberados**: **Todos os módulos ativados simultaneamente** (Dashboard, Vendas Balcão, Orçamentos, Ordens de Serviço, Clientes, Veículos, Peças, Unidades de Medida, Serviços, Cotações, Contas a Receber, Contas a Pagar, Fluxo de Caixa/DRE, Módulo Fiscal SEFAZ, Transportadoras, Relatórios e Auditoria).
- **Como auxilia nas operações**:
  - Compartilha o mesmo inventário de peças e saldo físico tanto para a aplicação interna em Ordens de Serviço quanto para a venda direta no balcão, impedindo furos de estoque.
  - Permite faturar serviços mecânicos com NFS-e municipal e vendas de balcão com NFC-e/NF-e estadual na mesma plataforma e conta bancária.
  - Oferece visão 360° da rentabilidade do negócio, separando a margem de contribuição de peças vendidas da lucratividade de serviços prestados.
- **Público Indicado**: Centros automotivos integrados (Autocenters), concessionárias, convertedoras de GNV com loja de peças, recapadoras de pneus com oficina e grandes centros de serviços com loja anexa.

---

## 🏛️ Guia de Módulos Operacionais & Liberação de Acesso

O MotorDesk adota arquitetura baseada em controle de acesso granular (**Role-Based Access Control - RBAC**) e isolamento **Multi-Tenant (Multi-Empresa)**, permitindo que cada módulo seja ativado, desativado ou liberado sob medida para cada função operacional.

---

### 1. 📊 Painel de Controle / Dashboard (`DashboardView`)
- **Objetivo & Funcionamento**: Consolida em tempo real os principais Indicadores-Chave de Desempenho (KPIs) da oficina: faturamento diário e mensal, ticket médio, quantidade de veículos no pátio, status das Ordens de Serviço (em aberto, execução, concluídas) e alertas de estoque crítico.
- **Como auxilia nas operações**: Centraliza a tomada de decisão do gestor em uma única tela, dá visibilidade imediata de gargalos no pátio e previne perdas financeiras com acompanhamento diário de metas.
- **Permissão de Liberação**: `accessDashboard` (Disponível para: Administradores, Gerentes e Gestores de Pátio).

---

### 2. ⚡ Vendas Balcão / Ponto de Venda Express (`SalesView`)
- **Objetivo & Funcionamento**: PDV ágil para venda direta de peças, fluidos e insumos sem a obrigatoriedade de abertura de Ordem de Serviço ou vínculo veicular. Suporta cálculo por quantidade simples e cálculo dimensional (linear, área em m², volume em m³).
- **Como auxilia nas operações**: Reduz o tempo de fila no balcão, atende clientes rápidos e mecânicos externos em segundos, dá baixa imediata no estoque e integra o faturamento ao Contas a Receber ou Caixa à vista.
- **Permissão de Liberação**: `accessSales` | `salesCreate` | `salesCancel` (Disponível para: Atendentes, Vendedores Balcão, Caixa e Estoquistas).

---

### 3. 📝 Orçamentos Comerciais & Portal do Cliente (`BudgetsView`)
- **Objetivo & Funcionamento**: Elaborador de orçamentos técnicos com detalhamento de serviços e peças, cálculo automático de impostos, controle de margem de desconto com trava de segurança (descontos > 15% exigem autorização de Gerente) e geração de link público para aprovação digital com assinatura do cliente via WhatsApp.
- **Como auxilia nas operações**: Aumenta a taxa de conversão comercial com propostas transparentes, evita contestação de valores com a aprovação digital registrada e converte o orçamento aprovado em Ordem de Serviço com 1 clique.
- **Permissão de Liberação**: `accessBudgets` | `budgetsCreate` | `budgetsApprove` | `budgetsApplyDiscount` (Disponível para: Consultores Técnicos, Atendentes e Gerentes).

---

### 4. 🔧 Ordens de Serviço Inteligentes (`ServiceOrdersView`)
- **Objetivo & Funcionamento**: Núcleo operacional da oficina. Gerencia todo o ciclo de vida da OS (Aberta, Em Andamento, Aguardando Peças, Concluída, Faturada), checklists fotográficos de entrada/saída, alocação de mecânico responsável, registro de manutenções preventivas (km e data da próxima revisão) e faturamento.
- **Como auxilia nas operações**: Elimina perdas em ordens de papel, garante rastreabilidade do mecânico executor, avisa o cliente sobre próximas revisões periódicas e ao finalizar já gera o Contas a Receber com cálculo de juros de maquininha e baixa no estoque.
- **Permissão de Liberação**: `accessServiceOrders` | `serviceOrdersCreate` | `serviceOrdersEdit` | `serviceOrdersComplete` | `serviceOrdersCancel` (Disponível para: Consultores, Mecânicos Chefes, Recepcionistas e Gerentes).

---

### 5. 👥 Cadastro de Clientes & CRM (`ClientsView`)
- **Objetivo & Funcionamento**: Base unificada de clientes (Pessoa Física e Jurídica) com validação estrita de CPF/CNPJ único (RN001), limites de crédito, contatos de WhatsApp, histórico completo de serviços prestados e faturamento acumulado.
- **Como auxilia nas operações**: Impede cadastros duplicados no banco de dados, agiliza a identificação do proprietário no atendimento e fornece histórico de relacionamento para fidelização e pós-venda.
- **Permissão de Liberação**: `accessClients` | `clientsCreate` | `clientsEdit` | `clientsDelete` (Disponível para: Recepção, Atendimento e Comercial).

---

### 6. 🚗 Gestão de Veículos & Frota (`VehiclesView`)
- **Objetivo & Funcionamento**: Cadastro da frota com validação de placa única nos formatos Tradicional e Mercosul (RN002), registro de chassi, motor, quilometragem, histórico de passagens mecânicas e cálculo do prazo de garantia de 90 dias.
- **Como auxilia nas operações**: Garante diagnóstico ágil conhecendo o histórico de manutenções anteriores do veículo, evita retrabalho e alerta preventivamente sobre prazos de garantia e recall de peças trocadas.
- **Permissão de Liberação**: `accessVehicles` | `vehiclesCreate` | `vehiclesEdit` | `vehiclesDelete` (Disponível para: Consultores, Mecânicos e Recepção).

---

### 7. 📦 Peças & Controle de Estoque (`PartsView`)
- **Objetivo & Funcionamento**: Controle de inventário de peças e insumos com importação automática de XML de NF-e de compra, ponto de pedido / estoque mínimo, localização física em prateleiras/galpões, classificação fiscal (NCM, CEST, CST, ICMS, PIS, COFINS) e precificação por margem de lucro.
- **Como auxilia nas operações**: Acaba com a falta de peças no meio de um serviço, automatiza a entrada de notas em segundos via leitor XML e assegura conformidade fiscal para emissão de NF-e.
- **Permissão de Liberação**: `accessParts` | `partsCreate` | `partsEdit` | `partsDelete` | `partsImportXml` (Disponível para: Estoquistas, Almoxarifado e Compras).

---

### 8. 📐 Unidades de Medida & Cálculo Dimensional (`UnitsOfMeasureView`)
- **Objetivo & Funcionamento**: Módulo de configuração de unidades de medida (UN, KG, L, M, M², M³, CX, PAR, HR) com definição de regras de cálculo (Linear por metro, Área por m², Volume por m³) e fatores de conversão métrica.
- **Como auxilia nas operações**: Permite precificar e comercializar materiais fracionados ou sob medida (tubulações, chapas de funilaria, mangueiras, fluidos por litro) com precisão matemática, sem divergências no faturamento e no estoque.
- **Permissão de Liberação**: `accessUnitsOfMeasure` | `unitsOfMeasureCreate` | `unitsOfMeasureEdit` | `unitsOfMeasureToggleActive` (Disponível para: Administradores, Gerentes e Almoxarife Chefe).

---

### 9. 🛠️ Catálogo de Serviços & Mão de Obra (`ServicesView`)
- **Objetivo & Funcionamento**: Tabela padrão de serviços mecânicos, elétricos e de funilaria, tempos estimados de execução, valor hora e enquadramento fiscal municipal (Lei Complementar 116/2003, CNAE, alíquotas de ISSQN e retenções de impostos).
- **Como auxilia nas operações**: Padroniza os preços praticados por todos os orçamentistas da oficina, garante clareza técnica ao cliente e permite emitir Notas Fiscais de Serviços (NFS-e) sem erros de alíquota.
- **Permissão de Liberação**: `accessServices` | `servicesCreate` | `servicesEdit` | `servicesDelete` (Disponível para: Gerentes de Oficina e Mecânicos Chefes).

---

### 10. 🏷️ Cotações & Gestão de Fornecedores (`QuotationsSuppliersView`)
- **Objetivo & Funcionamento**: Cadastro de fornecedores de autopeças e módulo de tomada de preços multi-fornecedor, destacando o menor valor por item e convertendo a melhor cotação em pedido de compra.
- **Como auxilia nas operações**: Reduz os custos diretos com peças em até 20%, agiliza o processo de compras quando um item está em falta e registra o histórico de preços dos distribuidores.
- **Permissão de Liberação**: `accessQuotations` | `quotationsCreate` | `quotationsApprove` (Disponível para: Compradores, Estoquistas e Gerentes).

---

### 11. 💰 Contas a Receber & Cobrança (`AccountsReceivableView`)
- **Objetivo & Funcionamento**: Gestão de títulos a receber gerados automaticamente pelas Ordens de Serviço e Vendas Balcão, controle de parcelamento, juros de maquininha de cartão, emissão de boletos com PIX dinâmico e baixas de pagamento.
- **Como auxilia nas operações**: Reduz a inadimplência com controle visual de títulos vencidos e a vencer, automatiza o cálculo de juros e alimenta o caixa em tempo real ao registrar recebimentos.
- **Permissão de Liberação**: `accessAccountsReceivable` | `accountsReceivableCreate` | `accountsReceivableSettle` | `accountsReceivableCancel` (Disponível para: Setor Financeiro, Faturamento e Caixa).

---

### 12. 🧾 Contas a Pagar & Despesas (`AccountsPayableView`)
- **Objetivo & Funcionamento**: Controle de obrigações financeiras da empresa com fornecedores de peças, concessionárias públicas (água, energia), aluguel, salários e despesas fixas/variáveis.
- **Como auxilia nas operações**: Evita atrasos de títulos e pagamento de multas, permite planejar a necessidade de fluxo de caixa futuro e organiza as saídas por centro de custos.
- **Permissão de Liberação**: `accessAccountsPayable` | `accountsPayableCreate` | `accountsPayableSettle` | `accountsPayableCancel` (Disponível para: Setor Financeiro e Gestão).

---

### 13. 📈 Gestão Financeira, Fluxo de Caixa & DRE (`FinancialView`)
- **Objetivo & Funcionamento**: Centraliza todas as movimentações de entradas e saídas, extrato por conta bancária, conciliação de caixa e Demonstrativo de Resultados do Exercício (DRE) simplificado em tempo real.
- **Como auxilia nas operações**: Demonstra a real lucratividade líquida da empresa, a margem de contribuição dos serviços prestados e a saúde do capital de giro.
- **Permissão de Liberação**: `accessFinancial` | `financialExport` (Disponível para: Sócios, Diretores e Gerentes Financeiros).

---

### 14. 🏛️ Módulo Fiscal SEFAZ & Emissão Eletrônica (`FiscalSefazView` / `FiscalConferenceView`)
- **Objetivo & Funcionamento**: Emissão, transmissão, cancelamento e inutilização de Notas Fiscais Eletrônicas (NF-e modelo 55, NFC-e modelo 65 e NFS-e). Geração de XML assinado, DANFE com chave de acesso de 44 dígitos e conferência fiscal pré-emissão.
- **Como auxilia nas operações**: Mantém a oficina em conformidade com as legislações federal e estadual, previne autuações tributárias e possibilita emitir documentos fiscais tanto imediatamente na venda quanto de forma postergada no financeiro.
- **Permissão de Liberação**: `accessFiscal` | `fiscalEmit` | `fiscalCancel` | `fiscalInutilize` (Disponível para: Setor Fiscal, Contabilidade e Faturamento).

---

### 15. 🚚 Transportadoras & Logística (`CarriersView`)
- **Objetivo & Funcionamento**: Cadastro de transportadoras parceiras, modalidade de frete (CIF/FOB), dados do veículo transportador e vinculação direta aos dados de transporte da NF-e.
- **Como auxilia nas operações**: Organiza o envio de peças e devoluções para frotistas e registra adequadamente o frete nos documentos fiscais eletrônicos.
- **Permissão de Liberação**: `accessCarriers` | `carriersCreate` | `carriersEdit` | `carriersDelete` (Disponível para: Expedição, Faturamento e Compras).

---

### 16. 📊 Relatórios Estratégicos & Curva ABC (`ReportsView`)
- **Objetivo & Funcionamento**: Emissão de relatórios analíticos de faturamento, rentabilidade de serviços, curva ABC de produtos, desempenho por mecânico e exportação oficial em formato PDF.
- **Como auxilia nas operações**: Revela quais serviços e peças geram maior receita para a oficina e embasa decisões de investimento e bonificação de colaboradores.
- **Permissão de Liberação**: `accessReports` | `reportsExport` (Disponível para: Gerentes e Sócios).

---

### 17. 🛡️ Trilha de Auditoria & Logs Imutáveis (`HistoryView`)
- **Objetivo & Funcionamento**: Registro cronológico e inviolável de todas as ações operadas no sistema (criação, edição, exclusão, descontos aplicados, emissões e estornos), com identificação de usuário, IP e timestamp.
- **Como auxilia nas operações**: Garante segurança operacional interna, evita fraudes e fornece evidências completas para auditorias e conferências de processos.
- **Permissão de Liberação**: `accessHistory` | `historyExport` (Disponível para: Administradores e Auditores).

---

### 18. 🔐 Gestão de Usuários & Matriz de Níveis RBAC (`UserManagementView`)
- **Objetivo & Funcionamento**: Gerenciamento de operadores, vinculação a empresas/filiais, definição de papéis e liberação individual de cada módulo e funcionalidade por usuário.
- **Como auxilia nas operações**: Garante que cada operador tenha acesso exclusivamente às informações e ações pertinentes à sua função, protegendo os dados estratégicos da empresa.
- **Permissão de Liberação**: `accessUserManagement` (Exclusivo: Administrador do Sistema).

---

### 19. 🔄 Conversor e Migração de Dados Legados (`DataMigrationConverterView`)
- **Objetivo & Funcionamento**: Importador de planilhas nos formatos CSV e JSON para carregamento em massa de clientes, veículos e catálogo de peças de sistemas legados.
- **Como auxilia nas operações**: Agiliza a implantação da oficina no MotorDesk em minutos, sem necessidade de digitação manual de cadastros prévios.
- **Permissão de Liberação**: `accessQAPanel` (Disponível para: Técnicos de Implantação e Administradores).

---

### 20. 🧪 Portfólio de Qualidade & Terminal SQL (`QAPortfolioView`)
- **Objetivo & Funcionamento**: Suíte de Engenharia de Qualidade com Documento de Requisitos (PRD), Casos de Teste interativos com execução em tempo real, Matriz de Rastreabilidade e Console SQL nativo para consultas ad-hoc.
- **Como auxilia nas operações**: Assegura a estabilidade e conformidade do software a cada atualização e permite que analistas de negócio e auditores executem consultas avançadas no banco de dados.
- **Permissão de Liberação**: `accessQAPanel` (Disponível para: Engenheiros de QA, Desenvolvedores e Administradores).

---

## 🔒 Matriz Resumo de Liberação de Módulos por Perfil

| Módulo do Sistema | Administrador | Gerente | Consultor / Atendente | Mecânico | Estoquista | Financeiro |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | ✅ Total | ✅ Total | 👁️ Visualização | ❌ | ❌ | 👁️ Visualização |
| **Vendas Balcão** | ✅ Total | ✅ Total | ✅ Total | ❌ | ✅ Total | 👁️ Visualização |
| **Orçamentos** | ✅ Total | ✅ Total | ✅ Total | 👁️ Leitura | ❌ | 👁️ Leitura |
| **Ordens de Serviço** | ✅ Total | ✅ Total | ✅ Total | 🔧 Execução | 👁️ Leitura | 👁️ Faturamento |
| **Clientes & Veículos** | ✅ Total | ✅ Total | ✅ Total | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura |
| **Peças & Estoque** | ✅ Total | ✅ Total | 👁️ Consulta | 👁️ Consulta | ✅ Total | 👁️ Consulta |
| **Unidades de Medida** | ✅ Total | ✅ Total | 👁️ Consulta | ❌ | ✅ Total | 👁️ Consulta |
| **Serviços** | ✅ Total | ✅ Total | 👁️ Consulta | 👁️ Consulta | ❌ | 👁️ Consulta |
| **Cotações / Compras** | ✅ Total | ✅ Total | ❌ | ❌ | ✅ Total | 👁️ Leitura |
| **Contas a Receber** | ✅ Total | ✅ Total | ❌ | ❌ | ❌ | ✅ Total |
| **Contas a Pagar** | ✅ Total | ✅ Total | ❌ | ❌ | ❌ | ✅ Total |
| **Fluxo de Caixa / DRE** | ✅ Total | ✅ Total | ❌ | ❌ | ❌ | ✅ Total |
| **Fiscal / SEFAZ** | ✅ Total | ✅ Total | ❌ | ❌ | ❌ | ✅ Total |
| **Relatórios / PDF** | ✅ Total | ✅ Total | 👁️ Básico | ❌ | 👁️ Estoque | ✅ Financeiro |
| **Trilha de Auditoria** | ✅ Total | 👁️ Leitura | ❌ | ❌ | ❌ | ❌ |
| **Gestão de Usuários** | ✅ Total | ❌ | ❌ | ❌ | ❌ | ❌ |
