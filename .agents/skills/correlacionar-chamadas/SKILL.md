---
name: correlacionar-chamadas
description: "Use para decidir para qual aplicação, ponto de entrada ou sistema externo vai uma chamada que o casamento automático não resolveu. Traz critérios, faixas de confiança e quando criar um sistema externo."
---

# Correlacionar chamadas ambíguas

## Ordem de análise de cada caso

1. **Resolva o alvo.** Veja se a variável tem valor em algum ambiente (`consultar_grafo` → variáveis resolvidas do repositório de origem).
2. **Ache candidatos.** Pontos de entrada com o mesmo método e rota parecida, ou o mesmo nome de fila, operação SOAP ou nome JNDI.
3. **Confirme no código.** Abra o arquivo do candidato e veja se os parâmetros e o corpo combinam com o que a origem envia.
4. **Decida e explique.** Um parágrafo curto: por que este destino e não os outros.

## Faixas de confiança

| Situação | Confiança |
| --- | --- |
| Host resolvido aponta para a aplicação e a rota bate exatamente | 1,0 (não deveria chegar aqui) |
| Rota bate, host não resolvido, só uma aplicação expõe a rota | 0,8 a 0,9 |
| Rota bate com diferença de versão ou prefixo (`/v1/` vs `/api/v1/`) e o corpo combina | 0,7 a 0,8 |
| Mais de um candidato plausível | 0,5 a 0,7, `needsReview: true` |
| Só semelhança de nome | não registre conexão; trate como externo |

## Quando criar um sistema externo

- O host resolvido não pertence a nenhuma aplicação da lista.
- Nenhum ponto de entrada da lista combina com a chamada.

Agrupe por host: duas chamadas para `antifraude.interno` viram o mesmo `ext:motor-antifraude`. Dê um nome legível a partir do host ou do nome do cliente no código.

## Armadilhas comuns

- Gateways e proxies: uma chamada para `api-gateway.interno/pagamentos/...` vai para quem está **atrás** do gateway. Procure a regra de roteamento no repositório de infraestrutura, se estiver na lista.
- Rotas genéricas (`/api/{recurso}/{id}`) casam com tudo; não confie só nelas.
