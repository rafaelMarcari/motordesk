# 🧪 Planejamento de Qualidade & Estratégia de Testes — MotorDesk

Este documento detalha o **Plano de Testes**, a **Estratégia de Quality Assurance (QA)** e a **Arquitetura de Automação** implementados no MotorDesk. Ele serve como comprovação técnica de competências em Engenharia de Qualidade, cobrindo desde a análise de requisitos até a implementação de testes de ponta a ponta (E2E).

---

## 🎯 1. Estratégia Geral de QA

A abordagem de testes adotada no MotorDesk segue o modelo híbrido, equilibrando **Testes Manuais Exploratórios**, **Validação de Regras de Negócio por Estado** e **Testes Automatizados de Regressão E2E** para garantir que as atualizações do sistema não quebrem fluxos críticos de receita (como emissão de orçamentos e checkout).

### 🛠️ Pirâmide de Testes Aplicada:
1. **Nível de Interface & E2E (Cypress)**: Validação dos fluxos completos do usuário (Criação de Clientes, Associação de Veículos, Geração de Orçamentos, Conclusão de OS e Fluxo de Checkout).
2. **Nível de Integração/Estado (React Testing / React Hooks State)**: Garantia de que as transições de estado (ex: Orçamento Rascunho -> Orçamento Aprovado -> Ordem de Serviço) obedeçam estritamente as regras de negócio declaradas no PRD.
3. **Nível Unitário (TypeScript Linters & Strict Typecheck)**: Uso rigoroso do compilador TypeScript para assegurar que contratos de dados de Clientes, Peças e Orçamentos sejam invioláveis.

---

## 📋 2. Mapeamento de Requisitos & Regras de Negócio (PRD)

Para que um sistema seja testável, ele precisa de especificações claras. O MotorDesk implementa as seguintes regras de negócio no seu núcleo de código, todas expostas na aba interativa do portfólio:

| Código | Tipo | Descrição da Regra / Requisito | Validação do Sistema |
| :--- | :--- | :--- | :--- |
| **RN001** | Regra de Negócio | **CPF Único**: Não é permitido o cadastro de dois clientes com o mesmo CPF. | O sistema exibe um alerta de violação de regra e bloqueia a gravação. |
| **RN002** | Regra de Negócio | **Placa de Veículo Única**: Uma placa de carro não pode ser duplicada no sistema. | Exibe erro e impede a vinculação se a placa já existir. |
| **RN003** | Regra de Negócio | **Desconto Máximo Controlado**: Vendedores comuns ou mecânicos possuem limites estritos de descontos (ex: 10%), exigindo privilégios administrativos para descontos maiores. | Bloqueia a aprovação ou aplicação de valores acima do teto estipulado para o cargo. |
| **RN004** | Regra de Negócio | **Estoque Mínimo de Peças**: Peças que chegam ao limite mínimo de segurança geram alerta visual imediato. | O sistema exibe status de alerta de reabastecimento no estoque e no Dashboard. |
| **RF001** | Requisito Funcional| **Conversão de Orçamento**: Um orçamento aprovado deve gerar automaticamente uma Ordem de Serviço (OS) com status "Aguardando Peças" ou "Em Andamento". | Fluxo automatizado na interface com logs no histórico do sistema. |

---

## 🗺️ 3. Matriz de Rastreabilidade (Traceability Matrix)

A matriz garante que **nenhum requisito do PRD fique sem cobertura de teste**. Cada requisito é mapeado para um ou mais Casos de Teste (CTs):

* **RN001 (CPF Único)** ➡️ **CT001**: Cadastrar cliente com CPF duplicado.
* **RN002 (Placa Única)** ➡️ **CT002**: Cadastrar veículo com placa já existente.
* **RN003 (Desconto Máximo)** ➡️ **CT003**: Tentar aplicar desconto abusivo sem permissão de Administrador.
* **RN004 (Estoque Mínimo)** ➡️ **CT004**: Consumir peças em uma OS e verificar acionamento do alerta de estoque crítico.
* **RF001 (Conversão em OS)** ➡️ **CT005**: Aprovar orçamento e validar criação da OS correspondente.

---

## 🤖 4. Arquitetura de Automação com Cypress

Os testes automatizados foram modelados utilizando o **Cypress**, que oferece execução extremamente rápida em navegadores modernos e facilidade de depuração visual.

### Exemplo de Fluxo Crítico Automatizado (Massa de Teste e Login):

```javascript
describe('Fluxo Principal - Emissão e Aprovação de Orçamentos', () => {
  it('Deve criar um orçamento de forma bem-sucedida e convertê-lo em OS', () => {
    // 1. Visita o sistema e faz o login como Administrador
    cy.visit('/');
    cy.get('#login-username-input').type('admin');
    cy.get('#login-password-input').type('admin123');
    cy.get('#btn-login-submit').click();
    
    // 2. Navega até Orçamentos
    cy.get('#menu-btn-budgets').click();
    cy.get('#btn-create-budget').click();
    
    // 3. Seleciona Cliente e Veículo
    cy.get('#budget-client-select').select('João Silva');
    cy.get('#budget-vehicle-select').select('ABC-1234');
    
    // 4. Adiciona Serviços e Peças
    cy.get('#btn-add-service-row').click();
    cy.get('#service-select-row-0').select('Troca de Óleo');
    cy.get('#btn-add-part-row').click();
    cy.get('#part-select-row-0').select('Óleo Sintético 5W30');
    
    // 5. Salva o Orçamento como Rascunho
    cy.get('#btn-save-budget-draft').click();
    cy.contains('Orçamento criado com sucesso!').should('be.visible');
    
    // 6. Aprova o Orçamento (Gerando a OS)
    cy.get('#btn-approve-budget-0').click();
    cy.contains('Orçamento aprovado e convertido em OS!').should('be.visible');
    
    // 7. Navega até as Ordens de Serviço para validar
    cy.get('#menu-btn-service-orders').click();
    cy.get('#os-table-row-0').should('contain', 'João Silva')
      .and('contain', 'Em Andamento');
  });
});
```

---

## 💡 5. Como Apresentar Este Projeto em Entrevistas de QA

Este repositório foi construído para ser altamente defensável e impressionante em processos seletivos. Aqui estão alguns tópicos para você abordar em entrevistas técnicas:

1. **Abordagem Orientada a Requisitos**: Mostre como você usou a **Matriz de Rastreabilidade** para vincular regras de negócio diretamente aos seus casos de teste. Isso prova que você testa com foco no valor do negócio, e não apenas clicando em botões aleatórios.
2. **Automação de Ponta a Ponta**: Explique que o script do Cypress foi projetado para cobrir o "Caminho Feliz" (fluxo de conversão de OS) e os "Caminhos de Exceção" (como bloqueios de CPF e placas duplicadas).
3. **Massa de Teste Controlada**: Destaque que a aplicação conta com dados iniciais ricos (mockados diretamente no arquivo `src/data/`) que representam cenários realistas de uma oficina real, facilitando tanto os testes manuais quanto as execuções automatizadas locais.
4. **Testabilidade do Sistema**: Mencione que os elementos do sistema possuem atributos de `id` semânticos específicos (ex: `#btn-login-submit`, `#client-cpf-input`), facilitando a escrita de seletores limpos e duradouros no Cypress, evitando testes quebradiços ("flaky tests").

---

*A excelência na entrega de software começa com uma cultura sólida de qualidade. O MotorDesk materializa essa cultura na prática!* 🧪🚀
