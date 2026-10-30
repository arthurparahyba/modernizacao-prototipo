# 3. Passo a passo: rodar, estender e levar para produção

## O que já foi conferido neste rascunho

- Todo o código em `app/` passa no typecheck do TypeScript contra os tipos reais do `@flue/runtime` 2.3.0, `@flue/react` e `@flue/sdk`.
- `vite build` com o plugin `@flue/vite` gera o servidor e registra os 8 agentes.
- O build já pegou um erro real, corrigido: descrições de skill com `:` precisam de aspas no YAML.

O que **não** foi feito: rodar contra repositórios de verdade, com banco e chave de API. Os parsers determinísticos (`rodar_extratores`) são um ponto de encaixe; o comando ainda não existe.

## Rodar localmente

1. Pré-requisitos: Node 22.18 ou mais novo, Postgres e uma chave de API do provedor do modelo (`ANTHROPIC_API_KEY`).
2. Instale:
   ```bash
   cd app
   npm install
   ```
3. Crie o banco da aplicação:
   ```bash
   createdb modernizar
   psql modernizar -f db/001_inicial.sql
   ```
4. Configure o ambiente:
   ```bash
   export ANTHROPIC_API_KEY=...
   export DATABASE_URL=postgres://localhost/modernizar
   export WORK_DIR=$HOME/modernizar-work
   ```
5. Suba em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
6. Crie um projeto (troque a porta pela que o `npm run dev` mostrar; o cabeçalho `authorization` serve só para o login de mentira do rascunho):
   ```bash
   curl -X POST localhost:5173/api/projetos -H 'authorization: dev' \
     -H 'content-type: application/json' \
     -d '{"nome":"Piloto","repositorios":["https://git.empresa.com/credito/sgc-core.git"]}'
   ```
7. Acompanhe: `curl localhost:5173/api/projetos/<id>/status -H 'authorization: dev'`.

## Como adicionar…

### …um agente novo

1. Escreva a ficha em `.agents/agents/<nome>.md` (responsabilidade, entrada, saída, o que não faz).
2. Crie `app/src/agents/<nome>.ts` com `'use agent'` no topo e uma função exportada com nome em maiúscula.
3. Dê a ele, no mínimo: `useModel`, a tool `registrar_progresso` e uma tool `salvar_*`.
4. Chame-o no pipeline com `rodarAgente(...)`.

### …uma skill

1. Crie `.agents/skills/<nome>/SKILL.md`. O `name` precisa ser igual ao nome da pasta. A `description` vai entre aspas e diz **quando** usar.
2. Importe e monte no agente: `import x from '../../../.agents/skills/<nome>/SKILL.md'` e `useSkill(x)`.

### …uma tool

1. Crie com `defineTool` em `app/src/tools/`. Prefira o formato "fábrica" (`ferramentaX(ctx)`) para a tool já saber o projeto.
2. A descrição é o único manual que o modelo lê: diga quando chamar e o que esperar.
3. Se a tool tem efeito externo que não pode repetir, use `durable: true` e envolva cada efeito em `step.do(nome, fn)`.

### …uma stack nova (ex.: Delphi, Natural/Adabas)

1. Um parser em `rodar_extratores` para o que for mecânico.
2. Uma skill `extrair-dependencias-<stack>` com o que o modelo precisa saber para o resto.
3. Monte a skill nos extratores.

## Levar para produção: lista de verificação

- [ ] **Sandbox isolado.** Trocar `local()` por um container próprio, Daytona ou E2B, com os repositórios montados como somente leitura e sem rede.
- [ ] **Banco do Flue em Postgres.** Trocar o SQLite de `src/flue-db.ts` (`npx flue add database postgres`).
- [ ] **Pipeline durável.** Tirar o `void analisarProjeto(...)` do `app.ts` e rodar o pipeline numa fila ou orquestrador (Inngest, Temporal, Cloudflare Workflows). Para retomar sem refazer trabalho, faça cada etapa consultar a tabela `progresso` e pular o que já está `concluido`. Isso ainda não está implementado no rascunho.
- [ ] **Autenticação de verdade.** Trocar `verificarSessao` pelo SSO da empresa. Para o `EventSource`, usar cookie de sessão.
- [ ] **Parsers determinísticos.** Implementar `modernizar-extratores` para as stacks do piloto.
- [ ] **Uso por mês.** Uma tool ou rotina que lê o APM ou os logs e preenche o termo U da pontuação.
- [ ] **Custos.** Limitar `PARALELISMO`, usar o modelo rápido na extração e acompanhar o uso por projeto (o Flue tem integração com OpenTelemetry: `npx flue add tooling opentelemetry`).
- [ ] **Segredos.** O extrator de infra registra só o **nome** de chaves de cofre. Revise os relatórios do piloto para confirmar.

## Perguntas comuns

**Por que o pipeline não é um agente?** Porque a ordem das etapas nunca muda. Um agente para isso gastaria tokens decidindo o óbvio e poderia pular etapas. Código é previsível e fácil de retomar.

**E se um agente errar a classificação ou uma conexão?** Tudo tem evidência (arquivo e linha) e confiança. A tela mostra os casos de confiança baixa, e o usuário corrige pelo chat; a correção vira uma `Decision`.

**Dá para trocar o modelo de uma etapa?** Sim: `MODELO_RAPIDO` e `MODELO_RACIOCINIO` em `config.ts`, ou `useModel(...)` direto no agente. Um subagente também aceita `model` próprio.
