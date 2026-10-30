// Etapa 5, parte determinística: a pontuação de cada funcionalidade.
// É código (e não o modelo) para ser reproduzível e explicável na tela.
//
//   score = 100 × (0,35·U + 0,30·D + 0,25·(1 − E) + 0,10·(1 − S)) − B
//
// U = uso, D = quanto destrava, E = esforço, S = compartilhamento de dados, B = bloqueio.
import { lerDocumentos, salvarDocumento } from '../db.ts';
import { defaultWeights, type Application, type Feature } from '../modelo/schema.ts';

type FeatureSalva = Omit<Feature, 'score' | 'usagePerMonth' | 'unlocks' | 'effort'> & Partial<Feature>;

export async function pontuarFuncionalidades(projetoId: string, pesos = defaultWeights) {
  const features = await lerDocumentos<FeatureSalva>(projetoId, 'feature');
  const apps = new Map((await lerDocumentos<Application>(projetoId, 'application')).map((a) => [a.id, a]));
  const externos = await lerDocumentos<{ id: string; decision: string }>(projetoId, 'external');
  const pendentes = new Set(externos.filter((e) => e.decision === 'pending').map((e) => e.id));
  // TODO: preencher uso por mês a partir do APM ou dos logs (tool própria). Sem dado, U fica de fora.
  const uso = new Map<string, number>();

  const maxUso = Math.max(1, ...[...uso.values()].map((u) => Math.log10(u + 1)));
  const escritaPor = (f: FeatureSalva) => new Set(f.data.filter((d) => !d.exclusive).map((d) => d.resource));

  // D: quantas outras funcionalidades usam dados que esta escreve (aproximação: recursos compartilhados).
  const destrava = new Map(features.map((f) => {
    const meus = escritaPor(f);
    const outras = features.filter((g) => g.id !== f.id && g.data.some((d) => meus.has(d.resource)));
    return [f.id, outras.map((g) => g.id)];
  }));
  const maxDestrava = Math.max(1, ...[...destrava.values()].map((x) => x.length));

  for (const f of features) {
    const legados = f.apps.filter((a) => apps.get(a.app as string)?.classification.value === 'legacy').length;
    const integracoes = f.apps.filter((a) => (a.app as string).startsWith('ext:')).length;
    const E = Math.min(1, (legados - 1) / 3 + integracoes * 0.15);
    const S = f.data.length ? f.data.filter((d) => !d.exclusive).length / f.data.length : 0;
    const D = destrava.get(f.id)!.length / maxDestrava;
    const temUso = uso.has(f.id);
    const U = temUso ? Math.log10(uso.get(f.id)! + 1) / maxUso : 0;
    const B = f.blockers.some((b) => pendentes.has(b)) ? pesos.blockerPenalty : 0;

    // Sem dado de uso, o peso de U é redistribuído entre os outros termos.
    const pu = temUso ? pesos.usage : 0;
    const resto = pesos.unlocks + pesos.effort + pesos.sharing;
    const k = (1 - pu) / resto;
    const bruto = 100 * (pu * U + k * (pesos.unlocks * D + pesos.effort * (1 - E) + pesos.sharing * (1 - S))) - B;
    const valor = Math.max(0, Math.min(100, Math.round(bruto)));

    await salvarDocumento(projetoId, 'feature', f.id, {
      ...f,
      usagePerMonth: temUso ? uso.get(f.id)! : null,
      unlocks: destrava.get(f.id)!,
      effort: {
        size: E < 0.34 ? 'small' : E < 0.67 ? 'medium' : 'large',
        legacyRepos: legados,
        integrations: integracoes,
      },
      score: {
        value: valor,
        priority: valor >= 70 ? 1 : valor >= 45 ? 2 : 3,
        terms: { U, D, E, S, B },
      },
    });
  }
}
