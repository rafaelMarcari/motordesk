# 🚗 MotorDesk — Sistema de Gestão de Oficina Mecânica & Portfólio de Quality Assurance (QA)

> **MotorDesk** é uma solução web corporativa desenvolvida em **React 18, TypeScript 5, Vite e Tailwind CSS v4**, concebida tanto para o gerenciamento operacional e financeiro completo de oficinas mecânicas (ERP/DMS) quanto para servir como um **Portfólio Interativo de Engenharia de Qualidade e Suíte de QA**.
>
> O projeto integra todas as rotinas operacionais (clientes, veículos com controle de revisão preventiva e periodicidade de serviço, estoque com importação de NFe XML, serviços, orçamentos com aprovação parcial, ordens de serviço em execução com agendamento de próxima revisão, cotações com fornecedores, contas a receber geradas automaticamente ao finalizar OS com parcelamento e juros de maquininha, contas a pagar, fluxo de caixa e conversor de dados legados) a um **Portal Integrado de QA**, munido de PRD (Documento de Requisitos), Casos de Teste executáveis em tempo real, Matriz de Rastreabilidade, Terminal SQL de Consulta e Scripts de Automação E2E em Cypress.

---

## 📋 Sumário
1. [🛠️ Linguagem & Stack Tecnológica](#-linguagem--stack-tecnológica)
2. [🗄️ Arquitetura do Banco de Dados & Verificação de Persistência](#-arquitetura-do-banco-de-dados--verificação-de-persistência)
3. [📁 Estrutura de Diretórios & Módulos do Sistema](#-estrutura-de-diretórios--módulos-do-sistema)
4. [📄 Documento de Requisitos do Sistema (PRD / SRD)](#-documento-de-requisitos-do-sistema-prd--srd)
5. [⚙️ Funcionalidades de Destaque Recentes](#️-funcionalidades-de-destaque-recentes)
6. [🧪 Plano de Testes Manuais & Suíte de Automação (QA)](#-plano-de-testes-manuais--suíte-de-automação-qa)
7. [🚀 Como Configurar e Executar na Máquina Local](#-como-configurar-e-executar-na-máquina-local)
8. [🌿 Workflow de Versionamento e Comandos Git](#-workflow-de-versionamento-e-comandos-git)

---

## 🛠️ Linguagem & Stack Tecnológica

A aplicação adota as melhores práticas de arquitetura frontend moderna em TypeScript:

| Camada | Tecnologia | Função e Aplicação |
| :--- | :--- | :--- |
| **Linguagem Principal** | **TypeScript 5.x** | Tipagem estática estrita para todas as entidades de domínio, anulando inconsistências e garantindo compilação 100% segura. |
| **Framework Frontend** | **React 18 / 19** | Arquitetura declarativa reativa baseada em componentes funcionais e Hooks customizados (`useState`, `useEffect`, `useRef`). |
| **Estilização & Design** | **Tailwind CSS v4** | Estilização utilitária de alto desempenho, com paleta neutra e refinada, suporte a layout responsivo e transições fluidas. |
| **Animações & UI** | **Motion** (`motion/react`) | Animações de entrada, transição de telas, alertas e modais interativos. |
| **Data Viz & Charts** | **Recharts** | Gráficos estatísticos de receita, conversão de orçamentos, faturamento mensal e saúde financeira. |
| **Ícones Vetoriais** | **Lucide React** | Biblioteca consistente de ícones vetoriais com suporte a acessibilidade visual. |
| **Bundler & Dev Engine** | **Vite** | Bundler ultrarrápido configurado na porta `3000` com suporte a HMR e build otimizado para produção. |

---

## 🗄️ Arquitetura do Banco de Dados & Verificação de Persistência

### 📌 Mecanismo de Persistência
O MotorDesk adota um **Engine de Banco de Dados de Persistência Local Sincronizada** (`AppDatabase` em TypeScript), gerenciado centralmente no módulo `src/data/mockData.ts` e orquestrado no estado raiz em `src/App.tsx`.

- **Chave de Armazenamento**: `motordesk_db_v1`
- **Garantia de Persistência Completa**: Todas as inserções, edições e deleções efetuadas em **qualquer uma das telas do sistema** são gravadas de forma imediata e atômica no `localStorage` do navegador via helper `saveDatabase(newDb)`.
- **Sincronização de Estado**: As atualizações de estado utilizam modificações funcionais (`syncDb(prev => ...)`), impedindo condições de corrida (*race conditions*) e garantindo reatividade instantânea na interface.
- **Operação Offline**: Funciona de forma 100% independente de servidores externos.

---

### 🔍 Verificação da Persistência por Tela / Módulo do Sistema

| Tela / Módulo | Dados Persistidos | Função de Persistência | Validação de Persistência |
| :--- | :--- | :--- | :--- |
| **1. Clientes (`ClientsView`)** | Cadastro de clientes, CPF, telefone, endereço, histórico e limite de crédito | `handleSaveClient`, `handleDeleteClient` | Gravado em `db.clients`. Valida duplicidade de CPF. |
| **2. Veículos (`VehiclesView`)** | Placa, modelo, marca, ano, histórico de reparos, data do último serviço e próxima revisão | `handleSaveVehicle`, `handleDeleteVehicle` | Gravado em `db.vehicles`. Atualiza automaticamente quando uma OS é concluída. |
| **3. Estoque / Peças (`PartsView`)** | Peças, SKU, NCM, quantidade, custo, margem %, preço de venda e XMLs importados | `handleSaveParts`, `handleImportXml` | Gravado em `db.parts` e `db.stockMovements`. Baixa atômica na conclusão da OS. |
| **4. Serviços (`ServicesView`)** | Serviços de mão de obra, tempo estimado, preço/hora e descrição | `handleSaveServices` | Gravado em `db.services`. |
| **5. Orçamentos (`BudgetsView`)** | Orçamentos, itens aprovados/recusados, descontos com trava por perfil e justificativa | `handleSaveBudgets` | Gravado em `db.budgets`. Conversão direta para OS. |
| **6. Ordens de Serviço (`ServiceOrdersView`)** | OS, status de execução, peças trocadas, data do serviço, próxima revisão, juros de maquininha e parcelamento | `handleSaveServiceOrders`, `onSaveReceivables` | Gravado em `db.serviceOrders`. Gera automaticamente títulos em `db.accountsReceivable`. |
| **7. Contas a Receber (`AccountsReceivableView`)** | Títulos a receber, parcelas, valores originais, juros, baixas/quitações e formas de pagamento | `onSaveReceivables` | Gravado em `db.accountsReceivable`. Alimenta o caixa em quitações. |
| **8. Contas a Pagar (`AccountsPayableView`)** | Títulos de fornecedores, despesas operacionais e baixas financeiras | `handleSavePayables` | Gravado em `db.accountsPayable`. |
| **9. Cotações & Fornecedores (`QuotationsSuppliersView`)** | Fornecedores, preços cotados por item e cotações aprovadas | `handleSaveSuppliers`, `handleSaveQuotations` | Gravado em `db.suppliers` e `db.quotations`. |
| **10. Financeiro & Fluxo de Caixa (`FinancialView`)** | Entradas, saídas, categorias, conciliação e saldo | `handleSaveFinancialTransactions` | Gravado em `db.financialTransactions`. |
| **11. Formas de Pagamento (`PaymentMethods`)** | Cadastro dinâmico de formas de pagamento (Pix, Dinheiro, Cartão, Boleto) e taxas padrão de juros | `handleSaveReceivables` / `paymentMethods` | Gravado em `db.paymentMethods`. |
| **12. Usuários & Permissões (`UserManagementView`)** | Cadastro de operadores, troca de senha e matriz de permissões/trava global | `handleSaveUsers`, `handleSavePermissions` | Gravado em `db.users` e `db.permissions`. |

---

### 📊 Como Executar Consultas SQL (`SELECT`) e Inspecionar o Banco

O MotorDesk oferece **três alternativas práticas** para consulta e auditoria dos dados gravados:

#### 1. Pelo Próprio Terminal SQL Interativo do Sistema (App Native SQL Engine)
1. No menu lateral, acesse a opção **QA Panel & Consulta SQL**.
2. Clique na aba **`5. Inspeção & Consulta SQL`**.
3. Utilize o **Terminal SQL em Tempo Real** equipado com atalhos para todas as coleções.
4. Digite consultas no padrão SQL ANSI com suporte às cláusulas `WHERE` (buscas numéricas, exatas ou por texto parcial) e `ORDER BY`.
5. Clique em **Executar Consulta** para visualizar o resultado formatado em tabela.

**Exemplos de consultas SQL suportadas no terminal interno:**
- `SELECT * FROM clients` — Lista todos os clientes cadastrados.
- `SELECT * FROM vehicles` — Exibe a frota de veículos, histórico e próxima revisão.
- `SELECT * FROM parts WHERE stockQuantity <= 10` — Retorna peças com estoque crítico.
- `SELECT * FROM serviceOrders WHERE status = 'executing'` — Filtra Ordens de Serviço em execução.
- `SELECT * FROM accountsReceivable WHERE status = 'pending'` — Filtra títulos a receber pendentes.
- `SELECT * FROM paymentMethods` — Consulta as formas de pagamento e taxas cadastradas.

#### 2. Pelo Console de Desenvolvimento do Navegador (DevTools - F12)
```javascript
// 1. Listar todos os clientes
console.table(JSON.parse(localStorage.getItem('motordesk_db_v1')).clients);

// 2. Listar peças com estoque baixo
console.table(JSON.parse(localStorage.getItem('motordesk_db_v1')).parts.filter(p => p.stockQuantity <= p.minStockQuantity));

// 3. Consultar títulos a receber com juros de maquininha e parcelas
console.table(JSON.parse(localStorage.getItem('motordesk_db_v1')).accountsReceivable);

// 4. Inspecionar formas de pagamento cadastradas
console.table(JSON.parse(localStorage.getItem('motordesk_db_v1')).paymentMethods);
```

#### 3. Pela Aba Application do Navegador (DevTools Storage)
1. No DevTools (**`F12`**), selecione a aba **Aplicação** (**Application** / **Storage**).
2. Expanda o item **Local Storage**.
3. Selecione o domínio da aplicação (`http://localhost:3000`).
4. Clique na chave **`motordesk_db_v1`** para visualizar a árvore JSON com todas as coleções mantidas.

---

## ⚙️ Funcionalidades de Destaque Recentes

### 1. 📅 Periodicidade de Serviço e Controle de Manutenção Preventiva na OS
- **Caixa de Data do Serviço Atual**: Registra o momento exato em que a manutenção foi efetuada.
- **Caixa de Data da Próxima Revisão**: Calcula ou permite definir a data limite para a próxima verificação (ex: daqui a 6 meses ou 10.000 km).
- **Sincronização com o Veículo**: Ao concluir a OS, a data da última manutenção e a data da próxima revisão são gravadas diretamente no cadastro do veículo em `db.vehicles`, permitindo emitir alertas de revisão preventiva.

### 2. 💳 Finalização de OS & Geração Automática de Contas a Receber
- **Interceção ao Finalizar OS**: Clicar em "Finalizar OS" abre um modal financeiro completo.
- **Acréscimo de Juros da Maquininha**: Permite informar a taxa de juros da maquininha de cartão (ex: 2.5%, 3.5%, 5.0%), calculando o valor exato dos juros e o novo valor total a receber.
- **Parcelamento Inteligente**: Opção de parcelamento de 1x até 12x com cálculo dinâmico do valor e cronograma de vencimentos de cada parcela.
- **Formas de Pagamento Dinâmicas**: Seleção de métodos cadastrados (Pix, Dinheiro, Cartão de Crédito, Cartão de Débito, Boleto) e botão para **cadastrar novas formas de pagamento** na hora.
- **Quitação Imediata no Ato**: Opção de marcar como "Pago Imediatamente", lançando a receita diretamente no Fluxo de Caixa do financeiro.

---

## 📁 Estrutura de Diretórios & Módulos do Sistema

```text
motordesk/
├── package.json                 # Manifesto de dependências e scripts npm
├── README.md                    # Documentação oficial do projeto
├── vite.config.ts               # Configuração do Vite e plugin Tailwind CSS v4
├── index.html                   # HTML base da aplicação
└── src/
    ├── main.tsx                 # Ponto de entrada e renderização do React
    ├── App.tsx                  # Shell principal, sincronização de banco, navegação e modais
    ├── index.css                # Estilos globais e utilitários Tailwind
    ├── types.ts                 # Definições das interfaces e contratos de dados
    ├── data/
    │   └── mockData.ts          # Banco de dados inicial e engine de persistência LocalStorage
    └── components/
        ├── DashboardView.tsx    # Painel com KPIs, gráficos de faturamento e resumo operacional
        ├── ClientsView.tsx      # Gestão de clientes e validação de CPF único
        ├── VehiclesView.tsx     # Cadastro de veículos, controle de revisões e histórico
        ├── PartsView.tsx        # Estoque de peças, movimentações e Importador de NFe XML
        ├── ServicesView.tsx     # Catálogo de serviços de mão de obra
        ├── BudgetsView.tsx      # Criador de orçamentos, desconto por perfil e aprovação parcial
        ├── ServiceOrdersView.tsx# Ciclo de vida de OS, periodicidade, baixa de estoque e contas a receber
        ├── QuotationsSuppliersView.tsx # Cotações, catálogo de fornecedores e cotação multi-item
        ├── AccountsReceivableView.tsx  # Contas a receber, gestão de parcelas, juros e quitação
        ├── AccountsPayableView.tsx     # Contas a pagar de fornecedores e baixa financeira
        ├── FinancialView.tsx    # DRE Simplificado, fluxo de caixa e conciliação financeira
        ├── HistoryView.tsx      # Trilha de auditoria imutável (Audit Trail)
        ├── ReportsView.tsx      # Relatórios de desempenho, curva ABC de peças e conversão
        ├── DataMigrationConverterView.tsx # Importador/Conversor de dados legados (CSV/JSON/Excel)
        ├── UserManagementView.tsx# Gestão de operadores, matriz de níveis e bloqueio global
        ├── ProfileView.tsx      # Perfil do usuário logado e alteração de senha
        └── QAPortfolioView.tsx  # Portal de QA (PRD, Casos de Teste, Rastreabilidade, Cypress e SQL)
```

---

## 📄 Documento de Requisitos do Sistema (PRD / SRD)

### 🔹 Requisitos Funcionais (RF)
- **RF001 - Gestão de Clientes**: Cadastro, edição e consulta de clientes com validação obrigatória de CPF único (**RN001**).
- **RF002 - Cadastro de Veículos**: Vinculação de veículos a clientes ativos com validação de placa única (**RN002**).
- **RF003 - Catálogo de Peças & Importação NFe**: Gestão de peças com aviso de estoque mínimo e leitor DOM de NFe XML.
- **RF004 - Tabela de Serviços**: Cadastro de serviços mecânicos e tabela de valor por hora.
- **RF005 - Construtor de Orçamentos**: Criação de orçamentos com subtotal, impostos, desconto regulado por perfil e envio.
- **RF006 - Aprovação Parcial de Orçamento**: Seleção de itens aprovados/recusados com justificativa obrigatória (**RN005**).
- **RF007 - Conversão e Ciclo de Vida da OS**: Geração de OS a partir de orçamento, controle de periodicidade e agendamento de revisão.
- **RF008 - Baixa Automática de Estoque**: Efetivação da baixa de peças no estoque na conclusão da OS (**RN004**).
- **RF009 - Gerador de Contas a Receber na Conclusão da OS**: Geração automática do título a receber ao finalizar a OS com parcelamento, acréscimo de juros de maquininha e seleção de forma de pagamento.
- **RF010 - Gestão de Contas a Receber e Pagar**: Controle financeiro de parcelas, quitações e inadimplência.
- **RF011 - Conversor de Dados Legados**: Importação em lote de clientes, veículos e peças via CSV/JSON.
- **RF012 - Matriz de Permissões e Trava Global**: Configuração de permissões por nível de acesso e bloqueio global de módulos pelo Admin.
- **RF013 - Trilha de Auditoria Imutável (Audit Trail)**: Registro inviolável de todas as ações operacionais no sistema (**RN007**).
- **RF014 - Interceptor de Saída com Alterações Pendentes**: Modal de confirmação ao tentar sair ou navegar com formulário preenchido sem salvar (**RN008**).
- **RF015 - Segurança e Mascaramento de Senhas**: Exibição de senhas em formato mascarado (`*`) na tela de login e perfil.

---

## 🧪 Plano de Testes Manuais & Suíte de Automação (QA)

### 📌 Suíte de Casos de Teste Manuais (Interactive Test Cases)

| Código | Requisito | Título do Caso de Teste | Categoria | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CT001** | RF001 / RN001 | Cadastrar Cliente com CPF Único | Funcional | Bloqueia CPF duplicado com alerta explicativo e cadastra CPF válido. | `Passed` |
| **CT002** | RF002 / RN002 | Cadastrar Veículo com Placa Única | Funcional | Impede cadastro de veículo com placa já existente no sistema. | `Passed` |
| **CT003** | RF006 / RN005 | Aprovação Parcial de Orçamento | Fluxo Principal | Gera OS contendo apenas itens aprovados e grava recusados com motivo no histórico. | `Passed` |
| **CT004** | RN003 | Trava de Desconto Máximo por Perfil | Regra de Negócio | Impede Atendente de conceder desconto acima de 5% sem permissão de Gerente. | `Passed` |
| **CT005** | RF008 / RN004 | Baixa Automática de Estoque na OS | Integridade | Valida estoque e deduz automaticamente a quantidade das peças na conclusão da OS. | `Passed` |
| **CT006** | RF009 | Conclusão de OS e Geração de Contas a Receber com Juros e Parcelas | Financeiro | Calcula juros da maquininha, divide parcelas e lança no Contas a Receber ao finalizar OS. | `Passed` |
| **CT007** | RF007 | Agendamento de Próxima Revisão na OS em Execução | Operacional | Permite registrar a data do serviço e grava a data da próxima revisão na ficha do veículo. | `Passed` |
| **CT008** | RF013 / RN007 | Imutabilidade da Trilha de Auditoria | Segurança | Garante ausência de botões ou funções de exclusão de registros do histórico. | `Passed` |
| **CT009** | RF012 | Trava Global de Módulos e Permissões | Acesso | Oculta menus e bloqueia acesso a módulos desativados pelo Administrador. | `Passed` |
| **CT010** | RN008 | Interceptor de Logout com Tarefa Pendente | Usabilidade | Exibe modal de confirmação ao sair com formulário preenchido sem salvar. | `Passed` |

---

### 🤖 Automação de Testes End-to-End (E2E) com Cypress

A suíte de testes automáticos está disponível na aba **Cypress** do portal e no arquivo `cypress/e2e/motordesk.cy.js`.

```javascript
describe('MotorDesk Workshop - E2E QA Test Suite', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('#login-username-input').type('admin');
    cy.get('#login-password-input').type('admin123');
    cy.get('#btn-login-submit').click();
  });

  it('CT001 - Deve impedir o cadastro de cliente com CPF duplicado (RN001)', () => {
    cy.get('#menu-btn-clients').click();
    cy.get('#btn-add-client').click();
    cy.get('#client-name-input').type('Cliente Teste Duplicado');
    cy.get('#client-cpf-input').type('123.456.789-00');
    cy.get('#btn-save-client').click();
    cy.get('#client-error-alert').should('be.visible').and('contain', 'CPF já cadastrado');
  });

  it('CT006 - Deve finalizar OS e gerar Contas a Receber com acréscimo de juros', () => {
    cy.get('#menu-btn-service-orders').click();
    cy.get('.btn-open-os-detail').first().click();
    cy.get('#btn-complete-os-exec').click();
    cy.get('#finishing-interest-input').type('3.5');
    cy.get('#btn-confirm-finishing-receivable').click();
    cy.get('#menu-btn-accounts-receivable').click();
    cy.get('#receivables-table').should('contain', 'CR-2026');
  });
});
```

---

## 🚀 Como Configurar e Executar na Máquina Local

Siga o passo a passo para rodar o ambiente de desenvolvimento localmente:

### 1. Pré-requisitos
- **Node.js** (Versão 18.x ou superior).
- **npm** (incluso com o Node).
- **Git** instalado.

### 2. Clonar o Repositório
```bash
git clone https://github.com/SEU-USUARIO/motordesk.git
cd motordesk
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Configurar Variáveis de Ambiente
Crie o arquivo `.env` a partir do modelo `.env.example`:
```bash
cp .env.example .env
```

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Abra seu navegador no endereço:
👉 **`http://localhost:3000`**

### 6. Validação de Código e Linter
Para executar a verificação estática do TypeScript e garantir que não há erros de compilação:
```bash
npm run lint
```

---

## 🌿 Workflow de Versionamento e Comandos Git

Procedimento padrão para versionamento do projeto no GitHub:

### 1. Inicializar e Verificar Repositório Local
```bash
git init
git status
```

### 2. Adicionar Arquivos e Criar o Commit
```bash
git add .
git commit -m "feat: finalizacao do fluxo financeiro de OS com parcelamento, juros e persistencia global"
```

### 3. Enviar para o Repositório Remoto
```bash
git push -u origin main
```

---

*Projeto desenvolvido com rigor técnico em **Engenharia de Software**, **Arquitetura Reativa** e **Garantia de Qualidade de Software (QA)**.* 🚗⚡
