// Como o código "conversa" com um agente do Flue, em 3 passos:
//
//   1. init(Agente, { id })        → pega um "endereço" de uma instância do agente
//   2. handle.dispatch({...})      → entrega a mensagem (e os dados iniciais) e recebe um recibo
//   3. handle.read(recibo)         → espera a resposta terminar
//
// Tudo isso é durável: se o servidor cair no meio, a conversa continua de onde parou
// e o read() pode ser feito de novo, até de outro processo.
import { AgentRunError, init, type Agent } from '@flue/runtime';
import { registrarProgresso, type Etapa } from '../db.ts';
import type { Contexto } from '../tools/contexto.ts';

export async function rodarAgente(opcoes: {
  agente: Agent;
  nome: string;          // nome para a tela: "extrator-codigo"
  etapa: Etapa;
  ctx: Contexto;
  mensagem: string;
}) {
  const { agente, nome, etapa, ctx, mensagem } = opcoes;

  // Um id estável por (projeto, etapa, repositório, agente). Rodar de novo com o mesmo id continua
  // a mesma conversa; para reprocessar do zero, acrescente um sufixo de versão.
  const id = [ctx.projetoId, etapa, ctx.appId ?? 'projeto', nome].join('--');

  await registrarProgresso({ projetoId: ctx.projetoId, etapa, appId: ctx.appId, agente: nome, status: 'rodando' });

  try {
    const handle = init(agente, { id });
    const recibo = await handle.dispatch({ message: mensagem, initialData: ctx });
    const resposta = await handle.read(recibo);

    await registrarProgresso({
      projetoId: ctx.projetoId, etapa, appId: ctx.appId, agente: nome,
      status: 'concluido', percentual: 100,
    });
    return resposta;
  } catch (erro) {
    const motivo = erro instanceof AgentRunError ? `execução ${erro.outcome}` : String(erro);
    await registrarProgresso({
      projetoId: ctx.projetoId, etapa, appId: ctx.appId, agente: nome,
      status: 'erro', mensagem: motivo.slice(0, 120),
    });
    throw erro;
  }
}

/** Roda uma lista de tarefas com no máximo `limite` ao mesmo tempo. */
export async function emParalelo<T>(itens: T[], limite: number, tarefa: (item: T) => Promise<unknown>) {
  const fila = [...itens];
  const trabalhadores = Array.from({ length: Math.min(limite, fila.length) }, async () => {
    while (fila.length) await tarefa(fila.shift()!);
  });
  const resultados = await Promise.allSettled(trabalhadores);
  return resultados;
}
