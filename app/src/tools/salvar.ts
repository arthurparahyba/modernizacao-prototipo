// Tools de saída: é por elas que cada agente entrega o resultado.
// Todas validam contra o schema.ts. Se o dado vier errado, a tool devolve o erro
// em texto e o agente corrige e chama de novo (o Flue também rejeita input fora do schema).
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { salvarDocumento } from '../db.ts';
import {
  Classification,
  Connection,
  DataAccess,
  Decision,
  DecisionChoice,
  EntryPoint,
  Evidence,
  ExternalSystem,
  Feature,
  OutboundCall,
  Wave,
} from '../modelo/schema.ts';
import type { Contexto } from './contexto.ts';

/** Etapa 1 — inventário. */
export function ferramentaSalvarInventario(ctx: Contexto) {
  return defineTool({
    name: 'salvar_inventario',
    description: 'Grava a classificação e a stack desta aplicação. Chame uma única vez, no final.',
    input: v.object({
      nome: v.string(),
      stack: v.array(v.string()),
      classification: Classification,
      exposedHosts: v.array(v.string()),
    }),
    async run({ data }) {
      await salvarDocumento(ctx.projetoId, 'application-inventario', ctx.appId!, {
        id: ctx.appId,
        ...data,
      });
      return 'Inventário salvo.';
    },
  });
}

/** Etapa 2 — cada extrator salva a sua parte do relatório do repositório. */
export function ferramentaSalvarParte(ctx: Contexto, parte: 'codigo' | 'dados' | 'infra') {
  const formatos = {
    codigo: v.object({ entryPoints: v.array(EntryPoint), outboundCalls: v.array(OutboundCall) }),
    dados: v.object({ dataAccess: v.array(DataAccess) }),
    infra: v.object({
      exposedHosts: v.array(v.string()),
      variaveis: v.array(
        v.object({ nome: v.string(), ambiente: v.string(), valor: v.string(), evidence: Evidence }),
      ),
    }),
  } as const;

  return defineTool({
    name: 'salvar_parte_relatorio',
    description: `Grava a parte "${parte}" do relatório deste repositório. Chame uma vez, no final.`,
    input: formatos[parte],
    async run({ data }) {
      // Confere se o agente não misturou repositórios.
      const outroApp = JSON.stringify(data).match(/"app":"(app:[^"]+)"/g)?.find((m) => !m.includes(ctx.appId!));
      if (outroApp) return `Erro: há itens de outra aplicação (${outroApp}). Use somente ${ctx.appId}.`;
      await salvarDocumento(ctx.projetoId, `repo-report-${parte}`, ctx.appId!, data);
      return `Parte "${parte}" salva.`;
    },
  });
}

/** Etapa 3 — correlação dos casos ambíguos. */
export function ferramentaRegistrarConexao(ctx: Contexto) {
  return defineTool({
    name: 'registrar_conexao',
    description:
      'Registra a decisão sobre um caso ambíguo: uma conexão para um ponto de entrada ou recurso de dados, ' +
      'ou um sistema externo novo quando nenhum candidato da lista combina.',
    input: v.object({
      casoId: v.string(),
      conexao: Connection,
      sistemaExternoNovo: v.optional(ExternalSystem),
    }),
    async run({ data }) {
      if (data.sistemaExternoNovo) {
        await salvarDocumento(ctx.projetoId, 'external', data.sistemaExternoNovo.id, {
          ...data.sistemaExternoNovo,
          decision: 'pending',
        });
      }
      await salvarDocumento(ctx.projetoId, 'connection', data.conexao.id, data.conexao);
      await salvarDocumento(ctx.projetoId, 'ambiguo-resolvido', data.casoId, { conexao: data.conexao.id });
      return 'Conexão registrada.';
    },
  });
}

/** Etapa 4 — funcionalidades. A pontuação fica de fora: é calculada em código depois. */
export function ferramentaSalvarFuncionalidade(ctx: Contexto) {
  return defineTool({
    name: 'salvar_funcionalidade',
    description: 'Grava uma funcionalidade (fatia ponta a ponta). Chame uma vez por funcionalidade.',
    input: v.omit(Feature, ['score', 'usagePerMonth', 'unlocks', 'effort']),
    async run({ data }) {
      await salvarDocumento(ctx.projetoId, 'feature', data.id, data);
      return `Funcionalidade ${data.id} salva.`;
    },
  });
}

/** Etapa 5 — plano. */
export function ferramentaSalvarOndas(ctx: Contexto) {
  return defineTool({
    name: 'salvar_ondas',
    description: 'Grava o plano completo de ondas. Substitui o plano anterior.',
    input: v.object({ ondas: v.pipe(v.array(Wave), v.minLength(1)) }),
    async run({ data }) {
      for (const onda of data.ondas) await salvarDocumento(ctx.projetoId, 'wave', onda.id, onda);
      return `${data.ondas.length} ondas salvas.`;
    },
  });
}

/** Chat — decisões do usuário. O assistente só chama depois de o usuário confirmar. */
export function ferramentaRegistrarDecisao(ctx: Contexto) {
  return defineTool({
    name: 'registrar_decisao',
    description:
      'Grava uma decisão do usuário (manter ou incluir um sistema externo, aprovar ou reordenar ondas). ' +
      'Só chame depois de o usuário confirmar explicitamente.',
    input: v.object({
      subject: Decision.entries.subject,
      choice: v.union([DecisionChoice, v.picklist(['approve', 'reorder'])]),
      note: v.optional(v.string()),
    }),
    async run({ data }) {
      const decisao = {
        id: `dec:${data.subject}`,
        ...data,
        by: ctx.usuario ?? 'desconhecido',
        at: new Date().toISOString(),
      };
      await salvarDocumento(ctx.projetoId, 'decision', decisao.id, decisao);
      // Reprocessa em segundo plano só o que a decisão afeta (ver pipeline/reprocessar.ts).
      // Import dinâmico para evitar import circular (o reprocessamento usa agentes, que usam esta tool).
      void import('../pipeline/reprocessar.ts').then((m) => m.reprocessar(ctx.projetoId, decisao));
      return 'Decisão registrada. A análise vai ser atualizada.';
    },
  });
}
