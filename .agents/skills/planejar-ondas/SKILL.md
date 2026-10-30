---
name: planejar-ondas
description: "Use para montar ou ajustar o plano de migração por funcionalidade em ondas, respeitando pontuação, dependências, bloqueios e o objetivo de desligar aplicações legadas."
---

# Planejar ondas

## Princípios

1. **Cada onda entrega algo ao cliente ou ao negócio.** Uma onda só de "infraestrutura" não existe neste plano.
2. **Ganhos rápidos primeiro**: pontuação alta e esforço pequeno abrem o plano e geram confiança.
3. **Quem destrava vem antes de quem é destravado.**
4. **Pense no desligamento**: prefira terminar as funcionalidades de uma aplicação legada antes de abrir muitas frentes em outra. Uma aplicação desligada reduz custo e risco.
5. **Bloqueadas ficam visíveis**: uma funcionalidade que depende de sistema externo pendente vai para a onda em que faria sentido, marcada como bloqueada, com o motivo.

## Tamanho das ondas

- Entre 2 e 4 funcionalidades por onda, conforme a capacidade informada.
- Se uma onda passar de 3 repositórios legados tocados ao mesmo tempo, considere dividir.

## Riscos para checar com `simular_ondas`

- **Dados divididos**: uma tabela escrita por funcionalidades em ondas diferentes fica dividida entre sistema novo e legado nesse intervalo. Aponte e sugira sincronização temporária (eventos ou CDC).
- **Legado que não desliga nunca**: uma aplicação com uma funcionalidade solta na última onda. Sugira antecipar.

## Como escrever a justificativa

Duas ou três frases para o negócio: o que o cliente ganha, o que ela destrava e o que fica desligável. Sem jargão.
