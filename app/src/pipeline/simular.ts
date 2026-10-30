// Simula um plano de ondas sem gravar nada. Usado pelo planejador e pelo assistente.
import { lerDocumentos } from '../db.ts';
import type { Application, Feature } from '../modelo/schema.ts';

export async function simularOndas(projetoId: string, ondas: { id: string; features: string[] }[]) {
  const features = new Map((await lerDocumentos<Feature>(projetoId, 'feature')).map((f) => [f.id, f]));
  const legados = (await lerDocumentos<Application>(projetoId, 'application'))
    .filter((a) => a.classification.value === 'legacy')
    .map((a) => a.id);

  // Quantas funcionalidades cada aplicação legada tem no total.
  const total = new Map(legados.map((app) => [app, [...features.values()].filter((f) => f.apps.some((x) => x.app === app)).length]));

  const migradas = new Set<string>();
  const resultado = ondas.map((onda) => {
    onda.features.forEach((f) => migradas.add(f));

    const porAplicacao = legados.map((app) => {
      const feitas = [...migradas].filter((id) => features.get(id)?.apps.some((x) => x.app === app)).length;
      const t = total.get(app) || 1;
      return { app, percentualMigrado: Math.round((100 * feitas) / t), desligavel: feitas === t };
    });

    // Tabela dividida: compartilhada entre uma funcionalidade já migrada e outra que ainda não migrou.
    const divididas = new Set<string>();
    for (const id of migradas) {
      for (const d of features.get(id)?.data ?? []) {
        if (d.sharedWith.some((outra) => !migradas.has(outra))) divididas.add(d.resource);
      }
    }

    return { onda: onda.id, porAplicacao, desligaveis: porAplicacao.filter((p) => p.desligavel).map((p) => p.app), tabelasDivididas: [...divididas] };
  });

  const desconhecidas = ondas.flatMap((o) => o.features).filter((f) => !features.has(f));
  return { ondas: resultado, avisos: desconhecidas.length ? [`Funcionalidades desconhecidas: ${desconhecidas.join(', ')}`] : [] };
}
