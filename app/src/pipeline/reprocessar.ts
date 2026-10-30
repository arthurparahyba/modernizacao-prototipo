// Quando o usuário decide algo na tela, só o que depende da decisão é recalculado.
//
//   decisão sobre sistema externo  → recalcula a pontuação (bloqueios mudam) e refaz o plano
//   decisão de aprovar ou reordenar → refaz só o plano
//   "incluir no escopo"             → a tela pede o repositório; ele entra pelo fluxo normal de análise
import { Planejador } from '../agents/planejador.ts';
import { salvarDocumento } from '../db.ts';
import { pontuarFuncionalidades } from './pontuar.ts';
import { rodarAgente } from './rodar-agente.ts';

export async function reprocessar(projetoId: string, decisao: { subject: string; choice: string }) {
  if (decisao.subject.startsWith('ext:') && (decisao.choice === 'keep' || decisao.choice === 'include')) {
    // Atualiza o sistema externo com a decisão tomada.
    const { lerDocumentos } = await import('../db.ts');
    const ext = (await lerDocumentos<{ id: string }>(projetoId, 'external')).find((e) => e.id === decisao.subject);
    if (ext) await salvarDocumento(projetoId, 'external', ext.id, { ...ext, decision: decisao.choice });
    await pontuarFuncionalidades(projetoId);
  }
  if (decisao.choice === 'include') return; // espera o repositório novo ser adicionado

  await rodarAgente({
    agente: Planejador, nome: 'planejador', etapa: 'plano', ctx: { projetoId },
    mensagem: `O usuário decidiu "${decisao.choice}" sobre ${decisao.subject}. Revise o plano de ondas.`,
  });
}
