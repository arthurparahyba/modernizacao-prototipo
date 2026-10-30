// Tools de leitura: o agente consulta o que já foi descoberto.
// Também é código comum: buscam no banco e devolvem JSON.
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { lerDocumentos, lerProgresso } from '../db.ts';
import { caminhoAlcancavel } from '../pipeline/grafo.ts';
import { simularOndas } from '../pipeline/simular.ts';
import type { Contexto } from './contexto.ts';

const TIPOS = ['application', 'repo-report', 'connection', 'external', 'feature', 'wave', 'decision'] as const;

export function ferramentaConsultarGrafo(ctx: Contexto) {
  return defineTool({
    name: 'consultar_grafo',
    description:
      'Busca o que a análise já descobriu. Escolha o tipo e, se quiser, um texto para filtrar pelo id ' +
      '(ex.: tipo "connection", filtro "sgc-core"). Devolve no máximo 50 itens.',
    input: v.object({
      tipo: v.picklist(TIPOS),
      filtro: v.optional(v.string()),
    }),
    async run({ data }) {
      const docs = await lerDocumentos<{ id?: string; app?: string }>(ctx.projetoId, data.tipo);
      const f = data.filtro?.toLowerCase();
      const achados = f ? docs.filter((d) => JSON.stringify(d).toLowerCase().includes(f)) : docs;
      return { output: JSON.stringify({ total: achados.length, itens: achados.slice(0, 50) }) };
    },
  });
}

export function ferramentaListarAmbiguos(ctx: Contexto) {
  return defineTool({
    name: 'listar_ambiguos',
    description: 'Lista as chamadas que o casamento automático não resolveu e ainda não têm decisão.',
    async run() {
      const casos = await lerDocumentos<{ id: string }>(ctx.projetoId, 'ambiguo');
      const resolvidos = new Set(
        (await lerDocumentos<{ id?: string }>(ctx.projetoId, 'ambiguo-resolvido')).map((r) => r.id),
      );
      const pendentes = casos.filter((c) => !resolvidos.has(c.id));
      return { output: JSON.stringify({ total: pendentes.length, casos: pendentes.slice(0, 20) }) };
    },
  });
}

export function ferramentaCaminhoAlcancavel(ctx: Contexto) {
  return defineTool({
    name: 'caminho_alcancavel',
    description:
      'Dado um ponto de entrada, devolve tudo que ele alcança no grafo: aplicações, chamadas e dados, ' +
      'parando no primeiro sistema fora do escopo.',
    input: v.object({ entryPoint: v.string() }),
    async run({ data }) {
      return { output: JSON.stringify(await caminhoAlcancavel(ctx.projetoId, data.entryPoint)) };
    },
  });
}

export function ferramentaSimularOndas(ctx: Contexto) {
  return defineTool({
    name: 'simular_ondas',
    description:
      'Simula um plano sem gravar: para cada onda, quanto de cada aplicação legada sai, ' +
      'quais ficam desligáveis e quais tabelas ficam divididas entre sistema novo e legado.',
    input: v.object({
      ondas: v.array(v.object({ id: v.string(), features: v.array(v.string()) })),
    }),
    async run({ data }) {
      return { output: JSON.stringify(await simularOndas(ctx.projetoId, data.ondas)) };
    },
  });
}

export function ferramentaStatusAnalise(ctx: Contexto) {
  return defineTool({
    name: 'status_analise',
    description: 'Mostra em que etapa a análise está e o progresso de cada agente.',
    async run() {
      return { output: JSON.stringify(await lerProgresso(ctx.projetoId)) };
    },
  });
}
