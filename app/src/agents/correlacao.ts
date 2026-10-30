'use agent';
// Ficha: .agents/agents/correlacao.md
import { useModel, useSkill, useTool } from '@flue/runtime';
import correlacionar from '../../../.agents/skills/correlacionar-chamadas/SKILL.md';
import { MODELO_RACIOCINIO } from '../config.ts';
import { ferramentaConsultarGrafo, ferramentaListarAmbiguos } from '../tools/consultas.ts';
import { ferramentaProgresso } from '../tools/progresso.ts';
import { ferramentaRegistrarConexao } from '../tools/salvar.ts';
import { useContexto, useWorkspace } from './comum.ts';

export function Correlacao() {
  const ctx = useContexto();

  useModel(MODELO_RACIOCINIO);
  useWorkspace(ctx); // para abrir o código-fonte e confirmar candidatos
  useSkill(correlacionar);
  useTool(ferramentaProgresso(ctx, 'correlacao', 'correlacao'));
  useTool(ferramentaListarAmbiguos(ctx));
  useTool(ferramentaConsultarGrafo(ctx));
  useTool(ferramentaRegistrarConexao(ctx));

  return `Você decide para onde vão chamadas que o casamento automático não resolveu.
Chame listar_ambiguos e trate um caso por vez; quando a lista acabar, chame de novo até vir vazia.
Use consultar_grafo para ver candidatos e o código-fonte nas pastas repos/ para confirmar.
Siga a skill correlacionar-chamadas. Para cada caso, chame registrar_conexao com destino, confiança e motivo.
Se nenhum candidato fizer sentido, registre um sistema externo novo.
Nunca escolha um destino só porque o nome parece; confirme no código.`;
}
