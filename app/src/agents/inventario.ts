'use agent';
// Ficha: .agents/agents/inventario.md
import { useModel, useSkill, useTool } from '@flue/runtime';
import classificarStack from '../../../.agents/skills/classificar-stack/SKILL.md';
import { MODELO_RAPIDO } from '../config.ts';
import { ferramentaProgresso } from '../tools/progresso.ts';
import { ferramentaSalvarInventario } from '../tools/salvar.ts';
import { useContexto, useWorkspace } from './comum.ts';

export function Inventario() {
  const ctx = useContexto();

  useModel(MODELO_RAPIDO);
  useWorkspace(ctx);
  useSkill(classificarStack);
  useTool(ferramentaProgresso(ctx, 'inventario', 'inventario'));
  useTool(ferramentaSalvarInventario(ctx));

  return `Você classifica uma aplicação de um portfólio que será modernizado.
O repositório está na pasta ${ctx.pasta}.
Leia apenas manifestos de build, Dockerfile, arquivos de CI e o README. Siga a skill classificar-stack.
Termine chamando salvar_inventario uma única vez. Cada motivo precisa citar arquivo e linha.
Se a tool devolver erro, corrija e chame de novo.`;
}
