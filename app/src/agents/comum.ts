// Hooks customizados compartilhados pelos agentes.
// No Flue, um "custom hook" é só uma função comum que chama outros hooks.
import { useInitialData, useSandbox } from '@flue/runtime';
import { local } from '@flue/runtime/node';
import { join } from 'node:path';
import { WORK_DIR } from '../config.ts';
import type { Contexto } from '../tools/contexto.ts';

/** Lê o contexto (projeto, repositório) que o pipeline mandou no dispatch. */
export function useContexto(): Contexto {
  return useInitialData<Contexto>();
}

/**
 * Dá ao agente acesso ao workspace do projeto: /work/<projeto>/, onde estão os repositórios clonados.
 * Com um sandbox, o agente ganha as tools read, grep, glob e bash (e também write/edit).
 *
 * ATENÇÃO: `local()` roda na própria máquina do servidor e não impede escrita. Serve para desenvolvimento.
 * Em produção, use um sandbox isolado (container próprio, Daytona ou E2B) com os repositórios montados
 * como somente leitura.
 */
export function useWorkspace(ctx: Contexto) {
  useSandbox(local({ cwd: join(WORK_DIR, ctx.projetoId) }));
}
