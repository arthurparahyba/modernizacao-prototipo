# Modernização por funcionalidade

Aplicação que recebe uma lista de repositórios legados e descobre:

- quais aplicações são modernas e quais são legadas;
- como elas se conectam entre si, com bancos e com sistemas fora da lista;
- quais funcionalidades existem e em quais repositórios cada uma está espalhada;
- um plano de migração por **funcionalidade**, em ondas.

A interface é feita para pessoas de negócio. Os agentes são construídos com o [Flue](https://flueframework.com), que roda sobre o Pi.

## Por onde começar

| Se você quer… | Leia |
| --- | --- |
| Entender o Flue do zero | [docs/01-conceitos-do-flue.md](docs/01-conceitos-do-flue.md) |
| Entender o que acontece entre o clique e a tela | [docs/02-do-repositorio-a-tela.md](docs/02-do-repositorio-a-tela.md) |
| Rodar, estender ou levar para produção | [docs/03-passo-a-passo.md](docs/03-passo-a-passo.md) |
| Saber o que cada agente faz | [.agents/agents/README.md](.agents/agents/README.md) |
| Ver o modelo de dados | `documento/` (Word) e [app/src/modelo/schema.ts](app/src/modelo/schema.ts) |

## Estrutura

```
.agents/
  agents/          uma ficha por agente: responsabilidade, entrada, saída, limites, prompt
  skills/          conhecimento de domínio no formato do Flue (SKILL.md)
app/               rascunho da aplicação em Flue
  src/agents/      os 8 agentes
  src/tools/       as tools (gravar, consultar, progresso, parsers)
  src/pipeline/    o "maestro" e as partes sem IA (correlação, pontuação, simulação)
  src/app.ts       API das telas + chat
  web/             telas React de exemplo (status ao vivo e chat)
docs/              guias didáticos
documento/         especificação do modelo de dados
prototipo-fontes/  as 4 telas do protótipo e o runtime delas (support.js)
```

## Rodar o protótipo localmente

As telas precisam do `support.js`, que já está em `prototipo-fontes/`. Só é preciso ter o Python 3 para servir os arquivos. Na raiz do projeto, rode:

```bash
python3 -m http.server 8765 --directory prototipo-fontes
```

Depois abra <http://localhost:8765/Main.dc.html>. Os links do menu levam às outras telas.

O protótipo usa dados de exemplo e não depende de `app/`. O `support.js` é uma cópia fixa do runtime do protótipo online e não se atualiza sozinho. Use o servidor local: abrir o arquivo com dois cliques não foi testado.

## Situação

É um rascunho. O código de `app/` passa no typecheck contra o `@flue/runtime` 2.3.0, e o build registra os 8 agentes, mas ainda não rodou contra repositórios reais. O que falta para isso está em [docs/03](docs/03-passo-a-passo.md).

Versões online: [protótipo](https://claude.ai/artifact/9idR8D8SqviFot19iXMZUC) · [documento](https://claude.ai/artifact/F3F1pHQ285z8egZTJKXMDP)
