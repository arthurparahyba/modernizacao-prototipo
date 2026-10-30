---
name: extrair-dependencias-cobol
description: "Use ao mapear dependências em aplicações de mainframe (COBOL, JCL, CICS, DB2, IBM MQ, VSAM). Explica como ler JCL, CALL estático e dinâmico, EXEC SQL, EXEC CICS e filas MQ."
---

# Dependências em mainframe

## Pontos de entrada

- **Jobs batch**: cada `//JOBNAME JOB` no JCL é um ponto de entrada `batch`. Os `EXEC PGM=` dizem quais programas rodam, em ordem.
- **Transações CICS**: definições de transação (CSD) ou `EXEC CICS RETURN TRANSID`. Cada transação é um ponto de entrada `screen` ou `rpc`.
- **Consumidores MQ**: programas com `MQGET` ou disparados por trigger de fila (`queue-consumer`).

## Chamadas de saída

- `CALL 'PROGRAMA'` (estático): chamada interna. Só vira dependência externa se o programa estiver em outro repositório.
- `CALL WS-NOME-PROGRAMA` (dinâmico): procure onde `WS-NOME-PROGRAMA` recebe valor (`MOVE 'XYZ' TO WS-NOME-PROGRAMA`). Se não der para saber, registre com confiança baixa.
- `EXEC CICS LINK PROGRAM(...)` e `EXEC CICS START`.
- `MQPUT` / `MQPUT1`: registre o nome da fila, que costuma estar em working storage ou num copybook.
- Arquivos: `DD DSN=` no JCL indica arquivos trocados com outros sistemas (`file`).

## Dados

- `EXEC SQL ... END-EXEC`: tabela e operação (SELECT = read; INSERT, UPDATE, DELETE = write).
- VSAM: `SELECT ... ASSIGN TO` no programa + `DD` no JCL.
- Copybooks com layout de tabela ajudam a nomear o recurso.

## Cuidados

- Programas são muitos e parecidos: divida por JCL ou por transação e delegue ao subagente leitor_de_modulo.
- Não leia copybooks inteiros no contexto principal; consulte só os que um programa usa.
