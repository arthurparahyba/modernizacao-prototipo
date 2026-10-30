# 1. Conceitos do Flue, para quem nunca usou

O Flue é um framework TypeScript para construir agentes de IA. Ele roda sobre o **Pi**, um "harness": o motor que chama o modelo, executa as ferramentas que o modelo pede, devolve o resultado e repete até a tarefa terminar. O Flue organiza esse motor no estilo do React: **um agente é uma função**, e cada capacidade é adicionada com um **hook** (`useModel`, `useTool`…).

Este guia explica cada peça com uma analogia e mostra onde ela aparece neste projeto. Os nomes de API conferem com o `@flue/runtime` 2.3.0.

## A analogia: um agente é um funcionário

| Peça | Analogia | No Flue | Neste projeto |
| --- | --- | --- | --- |
| Agente | Um funcionário com uma função | Uma função TypeScript marcada com `'use agent'` | `app/src/agents/*.ts` |
| Modelo | O cérebro desse funcionário | `useModel('anthropic/claude-sonnet-4-6')` | `config.ts`: um modelo rápido e um de raciocínio |
| Instruções | A descrição do cargo | O texto que a função **retorna** | O `return \`...\`` de cada agente |
| Tool | Uma ferramenta de trabalho, com manual de uso | `defineTool({...})` + `useTool(...)` | `app/src/tools/*.ts` |
| Skill | Um manual que ele consulta quando precisa | Pasta com `SKILL.md` + `useSkill(...)` | `.agents/skills/*/SKILL.md` |
| Sandbox | A mesa de trabalho, com os arquivos em cima | `useSandbox(local({ cwd }))` | A pasta com os repositórios clonados |
| Subagente | Um assistente que recebe uma tarefa isolada | `useSubagent({...})` | `leitor_de_modulo`, no extrator de código |
| Dados iniciais | A ficha do caso entregue junto com a tarefa | `initialData` no envio + `useInitialData()` | Projeto e repositório de cada execução |

## As peças, uma a uma

### Agente

```ts
'use agent';
import { useModel } from '@flue/runtime';

export function Inventario() {
  useModel('anthropic/claude-haiku-4-5');
  return 'Você classifica uma aplicação…';
}
```

- `'use agent'` no topo avisa ao Flue: "neste arquivo há agentes; registre as funções exportadas com nome em maiúscula".
- O texto retornado é o **prompt de sistema**.
- A função roda de novo antes de cada chamada ao modelo (por isso se fala em "re-renderizar", como no React). Assim, dá para mudar ferramentas no meio do caminho, por exemplo liberando uma tool só depois de uma condição.

### Tool

Uma tool é código **seu**, que o modelo pode pedir para executar. O modelo só enxerga o nome, a descrição e o formato da entrada.

```ts
export const salvar = defineTool({
  name: 'salvar_inventario',
  description: 'Grava a classificação desta aplicação. Chame uma única vez, no final.',
  input: v.object({ classification: Classification }),   // schema Valibot
  async run({ data }) {
    await salvarDocumento(...);   // aqui é código comum: banco, API, arquivo…
    return 'Inventário salvo.';
  },
});
```

Neste projeto, as tools seguem uma regra: **todo resultado sai por uma tool que valida e grava**. O texto livre do modelo não é usado como dado. Isso dá confiabilidade: se o modelo mandar algo fora do schema, o Flue recusa e o modelo corrige.

### Skill

Uma skill é conhecimento que o agente carrega **sob demanda**. O modelo sempre vê o nome e a descrição; o resto só é lido quando ele decide que precisa. Isso economiza contexto: o extrator tem as skills de Java, COBOL e .NET montadas, mas só lê a da stack do repositório.

```md
---
name: extrair-dependencias-cobol
description: "Use ao mapear dependências em aplicações de mainframe…"
---
# Dependências em mainframe
…
```

> Duas formas de dar skills a um agente: importar e montar (`useSkill(skill)`), que é o que este projeto faz, ou deixar a pasta `.agents/skills/` dentro do diretório de trabalho do sandbox, onde o Flue descobre as skills sozinho. Escolhemos a primeira para controlar qual agente recebe qual skill.

### Sandbox

Com um sandbox, o agente ganha as ferramentas `read`, `grep`, `glob` e `bash` (e também `write` e `edit`) sobre uma pasta. Aqui, a pasta é `/work/<projeto>/`, com os repositórios clonados.

`local()` usa a própria máquina do servidor: ótimo para desenvolver, **não** impede escrita. Em produção, use um sandbox isolado (container, Daytona ou E2B) com os repositórios montados como somente leitura.

### Subagente

Um subagente é um agente que outro agente chama pela tool `task`. Ele começa **sem** o histórico do pai, recebe só a tarefa e devolve só o texto final. Serve para dividir trabalho grande sem estourar o contexto. Várias delegações no mesmo turno rodam **em paralelo**.

No extrator de código, cada módulo de um repositório grande vai para um `leitor_de_modulo`.

### Dados iniciais (`initialData`)

Quando o código envia uma tarefa a um agente, pode mandar junto um objeto. O agente lê com `useInitialData()`. Aqui vão o projeto, o repositório e a pasta. As tools usam esses valores para saber onde gravar, sem depender de o modelo repetir ids corretamente.

### Enviar e esperar: `init`, `dispatch`, `read`

É assim que **código** conversa com um agente:

```ts
const handle  = init(ExtratorCodigo, { id: 'proj-1--extracao--app:sgc-core--extrator-codigo' });
const recibo  = await handle.dispatch({ message: 'Mapeie…', initialData: ctx });
const resposta = await handle.read(recibo);   // espera terminar
```

O `id` identifica a instância. Mesmo id = mesma conversa. Tudo fica gravado no banco do Flue, então, se o servidor cair, a conversa continua e o `read` pode ser feito de novo.

### Expor um agente por HTTP: `createAgentRouter`

```ts
app.route('/agents/assistente', createAgentRouter(Assistente));
```

Isso cria as rotas da conversa: `POST /:id` para enviar mensagem, `GET /:id` para ler e acompanhar ao vivo, `POST /:id/abort` para parar. A documentação do Flue alerta: **quem alcança a URL fala com o agente**, então coloque autenticação na frente (feito em `app.ts`).

### Mostrar na tela: `useFlueAgent` e `useDataWriter`

No React, `useFlueAgent({ url })` devolve as mensagens já organizadas, o status (`idle`, `submitted`, `streaming`…) e `sendMessage()`. Cada mensagem tem **partes**:

- `text`: o texto;
- `dynamic-tool`: uma tool em uso (a tela mostra "Simulando o plano…");
- `data-<nome>`: um dado estruturado que o agente enviou com `useDataWriter('<nome>')`. A tela desenha um cartão próprio para ele.

## Onde está cada coisa

```
modernizacao/
├── .agents/
│   ├── agents/     fichas dos agentes (especificação para pessoas; o Flue não lê)
│   └── skills/     skills no formato do Flue (importadas pelos agentes)
├── app/
│   ├── src/agents/     os agentes ('use agent')
│   ├── src/tools/      as tools (defineTool)
│   ├── src/pipeline/   o "maestro" e as partes determinísticas (correlação, pontuação, simulação)
│   ├── src/app.ts      a API das telas + o chat
│   └── web/            exemplos de telas React ligadas à API
└── docs/           estes guias
```
