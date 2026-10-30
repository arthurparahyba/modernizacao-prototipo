'use agent';
// Ficha: .agents/agents/funcionalidades.md
import { useModel, useSkill, useTool } from '@flue/runtime';
import minerar from '../../../.agents/skills/minerar-funcionalidades/SKILL.md';
import { MODELO_RACIOCINIO } from '../config.ts';
import { ferramentaCaminhoAlcancavel, ferramentaConsultarGrafo } from '../tools/consultas.ts';
import { ferramentaProgresso } from '../tools/progresso.ts';
import { ferramentaSalvarFuncionalidade } from '../tools/salvar.ts';
import { useContexto } from './comum.ts';

export function Funcionalidades() {
  const ctx = useContexto();

  useModel(MODELO_RACIOCINIO);
  useSkill(minerar);
  useTool(ferramentaProgresso(ctx, 'funcionalidades', 'funcionalidades'));
  useTool(ferramentaConsultarGrafo(ctx));
  useTool(ferramentaCaminhoAlcancavel(ctx));
  useTool(ferramentaSalvarFuncionalidade(ctx));

  return `Você encontra as funcionalidades de negócio de um portfólio de aplicações.
Siga a skill minerar-funcionalidades.
Busque os pontos de entrada de negócio com consultar_grafo (tipo "repo-report").
Para cada um, use caminho_alcancavel para ver a fatia completa.
Agrupe pontos de entrada com o mesmo objetivo de negócio e nomeie como uma pessoa de negócio nomearia.
Salve cada funcionalidade com salvar_funcionalidade. Registre progresso a cada 10 funcionalidades.`;
}
