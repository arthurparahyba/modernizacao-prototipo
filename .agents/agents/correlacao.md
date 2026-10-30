---
nome: correlacao
etapa: 3. Correlação
roda: um por projeto, depois que todos os repositórios terminaram a etapa 2
modelo: raciocínio (MODELO_RACIOCINIO)
codigo: src/agents/correlacao.ts
skills: [correlacionar-chamadas]
tools: [registrar_progresso, listar_ambiguos, consultar_grafo, registrar_conexao]
sandbox: somente leitura, cwd = workspace do projeto
---

# Correlação

## Responsabilidade

Decidir os casos que o código não conseguiu decidir sozinho: **esta chamada da aplicação A vai para qual ponto de entrada, de qual aplicação?**

## Como a etapa funciona

A maior parte da correlação é código (`src/pipeline/correlacionar.ts`): resolve variáveis, monta o mapa host → aplicação e casa rota com rota. O que casa com confiança alta já vira `Connection` sem passar por LLM. O que sobra (rota parecida mas não igual, host desconhecido, fila com nome montado) vai para este agente.

## Recebe

Nada na mensagem além do id do projeto. Ele busca o trabalho com `listar_ambiguos`.

## Entrega

Uma chamada a `registrar_conexao` por caso, com:

- destino escolhido: um ponto de entrada, um recurso de dados ou um **sistema externo novo**;
- confiança e motivo;
- `needsReview: true` quando a confiança ficar abaixo de 0,6, para aparecer na tela.

## Não faz

- Não inventa ponto de entrada que não existe nos relatórios.
- Não analisa sistemas fora do escopo por dentro. Quando o destino não está na lista, cria um `ExternalSystem` com decisão `pending`, e o usuário decide na tela de Conexões.

## Instruções (rascunho do prompt)

> Você decide para onde vão chamadas que o casamento automático não resolveu. Chame `listar_ambiguos` e trate um caso por vez. Use `consultar_grafo` para ver pontos de entrada candidatos e o código-fonte no sandbox para confirmar. Siga a skill correlacionar-chamadas. Para cada caso, chame `registrar_conexao` com o destino, a confiança e o motivo. Se nenhum candidato fizer sentido, registre como sistema externo. Nunca escolha um destino só porque o nome parece; confirme no código.
