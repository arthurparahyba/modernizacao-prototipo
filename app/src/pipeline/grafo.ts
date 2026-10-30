// Percorre o grafo a partir de um ponto de entrada. Código comum, sem IA.
//
// Simplificação deste rascunho: o percurso é por APLICAÇÃO (tudo que a aplicação do ponto de entrada
// chama, e assim por diante). Uma versão mais fina segue o caminho do handler específico,
// usando o campo `from` das chamadas de saída.
import { lerDocumentos } from '../db.ts';
import type { Connection } from '../modelo/schema.ts';

export async function caminhoAlcancavel(projetoId: string, entryPointId: string) {
  const appInicial = `app:${entryPointId.split(':')[1]}`;
  const conexoes = await lerDocumentos<Connection>(projetoId, 'connection');

  const apps = new Set<string>([appInicial]);
  const externos = new Set<string>();
  const dados = new Set<string>();
  const usadas: string[] = [];
  const fila = [appInicial];

  while (fila.length) {
    const atual = fila.shift()!;
    for (const c of conexoes.filter((x) => x.from === atual)) {
      usadas.push(c.id);
      if (c.to.startsWith('ext:')) externos.add(c.to);           // para no primeiro sistema fora do escopo
      else if (c.to.startsWith('db:')) dados.add(c.to);
      else if (!apps.has(c.to)) { apps.add(c.to); fila.push(c.to); }
    }
  }
  return { entryPoint: entryPointId, apps: [...apps], externos: [...externos], dados: [...dados], conexoes: usadas };
}
