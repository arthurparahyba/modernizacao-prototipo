import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { registrarProgresso, type Etapa } from '../db.ts';
import type { Contexto } from './contexto.ts';

/**
 * Tool que o agente chama em marcos do trabalho ("li 120 de 214 programas").
 * Ela grava na tabela `progresso`, e a tela lê de lá.
 *
 * É uma "fábrica": recebe o contexto e devolve a tool já presa a um projeto, etapa e agente.
 */
export function ferramentaProgresso(ctx: Contexto, etapa: Etapa, agente: string) {
  return defineTool({
    name: 'registrar_progresso',
    description:
      'Informa à tela quanto do seu trabalho já foi feito. Chame em marcos: a cada módulo, ' +
      'a cada lote de arquivos ou a cada 10 itens salvos. Mensagem curta, para uma pessoa de negócio.',
    input: v.object({
      percentual: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
      mensagem: v.pipe(v.string(), v.maxLength(120)),
    }),
    async run({ data }) {
      await registrarProgresso({
        projetoId: ctx.projetoId,
        etapa,
        appId: ctx.appId,
        agente,
        status: 'rodando',
        percentual: Math.round(data.percentual),
        mensagem: data.mensagem,
      });
      return 'ok';
    },
  });
}
