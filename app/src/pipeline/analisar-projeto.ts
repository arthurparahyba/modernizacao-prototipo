// O "maestro": código comum que coordena as 5 etapas.
//
// Ele não é um agente. A ordem das etapas é sempre a mesma, então não há o que um modelo decidir.
// Os agentes entram dentro de cada etapa, onde há julgamento a fazer.
//
//   1. Inventário       → 1 agente por repositório          (paralelo)
//   2. Extração         → 3 agentes por repositório         (paralelo)
//   3. Correlação       → código + 1 agente para os ambíguos
//   4. Funcionalidades  → 1 agente para o projeto
//   5. Plano            → pontuação em código + 1 agente planejador
import { PARALELISMO } from '../config.ts';
import { listarRepositorios, registrarProgresso } from '../db.ts';
import { Inventario } from '../agents/inventario.ts';
import { ExtratorCodigo, ExtratorDados, ExtratorInfra } from '../agents/extratores.ts';
import { Correlacao } from '../agents/correlacao.ts';
import { Funcionalidades } from '../agents/funcionalidades.ts';
import { Planejador } from '../agents/planejador.ts';
import { clonarRepositorio } from './workspace.ts';
import { consolidarRelatorios, correlacionarAutomatico } from './correlacionar.ts';
import { pontuarFuncionalidades } from './pontuar.ts';
import { emParalelo, rodarAgente } from './rodar-agente.ts';

export async function analisarProjeto(projetoId: string) {
  const repos = await listarRepositorios(projetoId);

  // Mostra todos os agentes "na fila" logo de cara, para a tela já ter o que desenhar.
  for (const r of repos) {
    for (const agente of ['inventario', 'extrator-codigo', 'extrator-dados', 'extrator-infra']) {
      await registrarProgresso({
        projetoId, appId: r.app_id, agente, status: 'fila',
        etapa: agente === 'inventario' ? 'inventario' : 'extracao',
      });
    }
  }

  // ---------- Etapas 1 e 2: por repositório, vários repositórios ao mesmo tempo ----------
  await emParalelo(repos, PARALELISMO, async (repo) => {
    const { pasta } = await clonarRepositorio(projetoId, repo.app_id, repo.url);
    const ctx = { projetoId, appId: repo.app_id, pasta };

    await rodarAgente({
      agente: Inventario, nome: 'inventario', etapa: 'inventario', ctx,
      mensagem: `Classifique a aplicação ${repo.app_id}.`,
    });

    // Os três extratores do mesmo repositório rodam juntos.
    await Promise.allSettled([
      rodarAgente({ agente: ExtratorCodigo, nome: 'extrator-codigo', etapa: 'extracao', ctx,
        mensagem: `Mapeie pontos de entrada e chamadas de saída de ${repo.app_id}.` }),
      rodarAgente({ agente: ExtratorDados, nome: 'extrator-dados', etapa: 'extracao', ctx,
        mensagem: `Mapeie os dados usados por ${repo.app_id}.` }),
      rodarAgente({ agente: ExtratorInfra, nome: 'extrator-infra', etapa: 'extracao', ctx,
        mensagem: `Mapeie hosts e configuração de ${repo.app_id}.` }),
    ]);
  });

  // Junta as três partes de cada repositório em um RepoReport e valida contra o schema.
  await consolidarRelatorios(projetoId);

  // ---------- Etapa 3: correlação ----------
  const { ambiguos } = await correlacionarAutomatico(projetoId);
  if (ambiguos > 0) {
    await rodarAgente({
      agente: Correlacao, nome: 'correlacao', etapa: 'correlacao', ctx: { projetoId },
      mensagem: `Há ${ambiguos} chamadas ambíguas para decidir.`,
    });
  } else {
    await registrarProgresso({ projetoId, etapa: 'correlacao', agente: 'correlacao', status: 'concluido', percentual: 100 });
  }

  // ---------- Etapa 4: funcionalidades ----------
  await rodarAgente({
    agente: Funcionalidades, nome: 'funcionalidades', etapa: 'funcionalidades', ctx: { projetoId },
    mensagem: 'Encontre as funcionalidades de negócio deste portfólio.',
  });

  // ---------- Etapa 5: pontuação (código) e plano (agente) ----------
  await pontuarFuncionalidades(projetoId);
  await rodarAgente({
    agente: Planejador, nome: 'planejador', etapa: 'plano', ctx: { projetoId },
    mensagem: 'Monte o plano de ondas.',
  });
}
