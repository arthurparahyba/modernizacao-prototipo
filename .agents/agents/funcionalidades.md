---
nome: funcionalidades
etapa: 4. Funcionalidades
roda: um por projeto, depois da correlação
modelo: raciocínio (MODELO_RACIOCINIO)
codigo: src/agents/funcionalidades.ts
skills: [minerar-funcionalidades]
tools: [registrar_progresso, consultar_grafo, caminho_alcancavel, salvar_funcionalidade]
sandbox: somente leitura, cwd = workspace do projeto
---

# Funcionalidades

## Responsabilidade

Transformar o grafo técnico em **funcionalidades que o negócio reconhece**: "Cadastro de chave Pix", "Consulta de fatura". Cada funcionalidade é uma fatia ponta a ponta, da tela ao banco, mesmo quando atravessa vários repositórios.

## Como trabalha

1. Pega os pontos de entrada de negócio (telas, endpoints públicos, jobs, consumidores) com `consultar_grafo`.
2. Para cada um, chama `caminho_alcancavel`, uma tool determinística que percorre o grafo e devolve tudo que aquele ponto alcança (aplicações, chamadas, tabelas), parando no primeiro sistema fora do escopo.
3. Agrupa pontos de entrada que servem ao mesmo objetivo. Por exemplo, `GET`, `POST` e `DELETE /pix/chaves` mais a tela de chaves viram uma funcionalidade só.
4. Dá nome e descrição em linguagem de negócio, sem jargão técnico.
5. Para cada aplicação da fatia, descreve o papel dela ("tela", "regra de cálculo", "gera o PDF").

## Entrega

Uma chamada a `salvar_funcionalidade` por funcionalidade. Uso por mês, quem ela destrava, esforço e pontuação **não** são calculados aqui: o pipeline calcula em código depois.

## Não faz

- Não calcula prioridade.
- Não junta funcionalidades só porque usam a mesma tabela. Tabela compartilhada é acoplamento, não é a mesma funcionalidade.

## Instruções (rascunho do prompt)

> Você encontra as funcionalidades de negócio de um portfólio de aplicações. Siga a skill minerar-funcionalidades. Para cada ponto de entrada de negócio, use `caminho_alcancavel` para ver a fatia completa. Agrupe pontos de entrada com o mesmo objetivo de negócio. Nomeie cada funcionalidade como uma pessoa de negócio nomearia. Salve cada uma com `salvar_funcionalidade`. Registre progresso a cada 10 funcionalidades.
