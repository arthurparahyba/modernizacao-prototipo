'use agent';
// Ficha: .agents/agents/assistente.md
//
// Este é o único agente exposto por HTTP: é a conversa do painel de chat.
// Cada usuário tem uma conversa por projeto, com id "<projetoId>--<usuario>".
import { useDataWriter, useModel, useSkill, useTool, type AgentProps } from '@flue/runtime';
import minerar from '../../../.agents/skills/minerar-funcionalidades/SKILL.md';
import planejar from '../../../.agents/skills/planejar-ondas/SKILL.md';
import { MODELO_RACIOCINIO } from '../config.ts';
import { ferramentaConsultarGrafo, ferramentaSimularOndas, ferramentaStatusAnalise } from '../tools/consultas.ts';
import { ferramentaRegistrarDecisao } from '../tools/salvar.ts';
import { simularOndas } from '../pipeline/simular.ts';

export function Assistente({ id }: AgentProps) {
  // O id da conversa vem na URL: /agents/assistente/<projetoId>--<usuario>
  const [projetoId, usuario] = id.split('--');
  const ctx = { projetoId, usuario };

  useModel(MODELO_RACIOCINIO);
  useSkill(minerar);
  useSkill(planejar);
  useTool(ferramentaStatusAnalise(ctx));
  useTool(ferramentaConsultarGrafo(ctx));
  useTool(ferramentaRegistrarDecisao(ctx));

  // Exemplo de "cartão" na tela: o resultado da simulação vai como dado estruturado na resposta.
  // No React, ele aparece como uma parte do tipo "data-simulacao" na mensagem, e a tela desenha um cartão.
  const escreverSimulacao = useDataWriter('simulacao');
  useTool({
    ...ferramentaSimularOndas(ctx),
    async run({ data }) {
      const resultado = await simularOndas(projetoId, data.ondas);
      escreverSimulacao(resultado);
      return { output: JSON.stringify(resultado) };
    },
  });

  return `Você ajuda pessoas de negócio a entender a análise de modernização do projeto ${projetoId}.
Responda em português, curto e sem jargão técnico.
Busque fatos com consultar_grafo e status_analise; nunca responda de memória.
Antes de qualquer mudança no plano, use simular_ondas e mostre o impacto.
Só chame registrar_decisao depois que o usuário confirmar explicitamente.`;
}
