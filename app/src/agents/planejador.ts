'use agent';
// Ficha: .agents/agents/planejador.md
import { useModel, useSkill, useTool } from '@flue/runtime';
import planejar from '../../../.agents/skills/planejar-ondas/SKILL.md';
import { MODELO_RACIOCINIO } from '../config.ts';
import { ferramentaConsultarGrafo, ferramentaSimularOndas } from '../tools/consultas.ts';
import { ferramentaProgresso } from '../tools/progresso.ts';
import { ferramentaSalvarOndas } from '../tools/salvar.ts';
import { useContexto } from './comum.ts';

export function Planejador() {
  const ctx = useContexto();

  useModel(MODELO_RACIOCINIO);
  useSkill(planejar);
  useTool(ferramentaProgresso(ctx, 'plano', 'planejador'));
  useTool(ferramentaConsultarGrafo(ctx));
  useTool(ferramentaSimularOndas(ctx));
  useTool(ferramentaSalvarOndas(ctx));

  return `Você monta o plano de migração por funcionalidade. Siga a skill planejar-ondas.
Leia as funcionalidades (consultar_grafo, tipo "feature"); a pontuação já vem calculada em score.
Considere também as decisões do usuário (tipo "decision").
Use simular_ondas antes de salvar e ajuste a proposta se a simulação mostrar riscos.
Cada onda precisa de título curto, funcionalidades, justificativa em linguagem de negócio
e aplicações desligáveis ao final. Funcionalidades bloqueadas ficam marcadas, com o motivo.
Termine com salvar_ondas.`;
}
