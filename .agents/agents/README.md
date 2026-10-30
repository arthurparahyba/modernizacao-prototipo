# Agentes

Esta pasta tem uma ficha por agente: o que ele faz, com qual modelo, o que recebe, o que entrega, quais tools e skills usa e o que ele **não** pode fazer.

> **Importante para quem está começando no Flue.** O Flue não lê esta pasta. No Flue, um agente é uma função TypeScript em `src/agents/`. Estas fichas são a especificação legível que times de negócio e técnico revisam juntos. O código em `src/agents/` implementa cada ficha, e o texto "Instruções" de cada ficha é o que a função retorna como prompt de sistema.
>
> Já a pasta `.agents/skills/` **é** lida pelo Flue: skills nessa pasta, dentro do diretório de trabalho do sandbox, são descobertas automaticamente.

## Quem é quem

| Agente | Etapa | Roda | Modelo | Entrega |
| --- | --- | --- | --- | --- |
| [inventario](inventario.md) | 1. Inventário | 1 por repositório | rápido | `Application` (moderna ou legada) |
| [extrator-codigo](extrator-codigo.md) | 2. Extração | 1 por repositório | rápido | pontos de entrada e chamadas de saída |
| [extrator-dados](extrator-dados.md) | 2. Extração | 1 por repositório | rápido | tabelas, procedures, filas |
| [extrator-infra](extrator-infra.md) | 2. Extração | 1 por repositório | rápido | hosts expostos, variáveis resolvidas |
| [correlacao](correlacao.md) | 3. Correlação | 1 por projeto, só nos casos ambíguos | raciocínio | `Connection`, `ExternalSystem` |
| [funcionalidades](funcionalidades.md) | 4. Funcionalidades | 1 por projeto | raciocínio | `Feature` (fatias) |
| [planejador](planejador.md) | 5. Plano | 1 por projeto | raciocínio | `Wave` (ondas) |
| [assistente](assistente.md) | Chat | 1 por usuário e projeto | raciocínio | respostas e `Decision` |

## E o "maestro"?

Não existe um agente que decide a ordem das etapas. Quem coordena é **código comum** (`src/pipeline/analisar-projeto.ts`): ele dispara os agentes, espera, valida o resultado e passa para a próxima etapa.

Por quê: a ordem das etapas é sempre a mesma, então não há nada para um LLM decidir. Código é previsível, barato, fácil de testar e fácil de retomar se cair no meio. Os LLMs entram só onde é preciso julgamento: ler código estranho, decidir uma correlação ambígua, dar nome de negócio a uma funcionalidade e montar o plano.

## Regras que valem para todos

1. **Só leitura nos repositórios.** Nenhum agente altera código. O sandbox recebe os repositórios clonados e mais nada.
2. **Resultado sai por tool, não por texto.** Todo agente termina chamando uma tool `salvar_*`. A tool valida contra o `schema.ts` e grava no banco. Se não validar, a tool devolve o erro e o agente corrige.
3. **Sem evidência, não grava.** Todo fato aponta para arquivo e linha.
4. **Progresso visível.** Os agentes chamam `registrar_progresso` em marcos (por exemplo "li 120 de 214 programas"), e é isso que a tela mostra.
