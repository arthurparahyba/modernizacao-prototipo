---
name: minerar-funcionalidades
description: "Use para agrupar pontos de entrada técnicos em funcionalidades de negócio (fatias ponta a ponta), dar nomes que o negócio reconhece e descrever o papel de cada aplicação na fatia."
---

# Minerar funcionalidades

## O que é uma funcionalidade aqui

Algo que um cliente, operador ou área de negócio **reconhece como uma coisa que o sistema faz**: "Cadastro de chave Pix", "Segunda via de boleto", "Relatório de inadimplência". Uma funcionalidade é a fatia completa: da tela ou gatilho até os dados, atravessando quantos repositórios for preciso.

## Como agrupar

Junte pontos de entrada quando **todos** valem:

- servem ao mesmo objetivo de negócio (CRUD de uma mesma coisa, consulta + detalhe da mesma coisa);
- as fatias alcançadas se sobrepõem bastante (mesmas aplicações, mesmas tabelas principais).

Não junte quando:

- só compartilham uma tabela genérica (`CLIENTE`, `PARAMETRO`, `LOG`);
- um é tela de cliente e o outro é rotina interna de operação, mesmo que mexam nos mesmos dados.

## Como nomear

- Use substantivo de ação do negócio: "Cadastro de…", "Consulta de…", "Emissão de…", "Aviso de…".
- Sem nome de tecnologia, de tabela ou de classe.
- Descrição em uma frase, do ponto de vista de quem usa: "Cliente vê a fatura atual, o histórico e baixa o PDF."

## Papel de cada aplicação

Para cada aplicação da fatia, uma frase curta: "Tela de fatura", "Cálculo de encargos", "Geração do PDF", "Provedor externo; continua depois da modernização".

## Sinais de alerta (registre em `blockers` ou na descrição)

- A fatia alcança um sistema externo com decisão pendente.
- A fatia escreve numa tabela que outras funcionalidades também escrevem.
