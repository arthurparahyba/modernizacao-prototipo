// Etapa 3, parte determinística: liga as chamadas de saída aos pontos de entrada.
// Só o que sobra (ambíguo) vai para o agente de correlação.
import * as v from 'valibot';
import { lerDocumentos, listarRepositorios, salvarDocumento, sql } from '../db.ts';
import { Application, type Connection, type Evidence } from '../modelo/schema.ts';

interface EntryPointDoc { id: string; app: string; kind: string; signature: string; evidence: Evidence }
interface CallDoc { id: string; app: string; kind: string; method?: string; target: string; resolvedTarget?: string; evidence: Evidence }
interface AccessDoc { resource: string; ops: string[]; evidence: Evidence }
interface Variavel { nome: string; ambiente: string; valor: string }
interface Relatorio {
  app: string;
  entryPoints: EntryPointDoc[];
  outboundCalls: CallDoc[];
  dataAccess: AccessDoc[];
  exposedHosts: string[];
  variaveis: Variavel[];
}

/** Junta inventário + as três partes de cada repositório e valida. */
export async function consolidarRelatorios(projetoId: string) {
  const repos = await listarRepositorios(projetoId);
  const inventarios = await lerDocumentosPorApp<{ nome: string; stack: string[]; classification: unknown; exposedHosts: string[] }>(projetoId, 'application-inventario');
  const codigos = await lerDocumentosPorApp<{ entryPoints: EntryPointDoc[]; outboundCalls: CallDoc[] }>(projetoId, 'repo-report-codigo');
  const dados = await lerDocumentosPorApp<{ dataAccess: AccessDoc[] }>(projetoId, 'repo-report-dados');
  const infras = await lerDocumentosPorApp<{ exposedHosts: string[]; variaveis: Variavel[] }>(projetoId, 'repo-report-infra');

  for (const repo of repos) {
    const inv = inventarios.get(repo.app_id);
    const aplicacao = {
      id: repo.app_id,
      name: inv?.nome ?? repo.app_id.replace(/^app:/, ''),
      repoUrl: repo.url,
      stack: inv?.stack ?? [],
      classification: inv?.classification ?? { value: 'legacy', reasons: ['Inventário não concluído'] },
      inScope: true,
      exposedHosts: [...(inv?.exposedHosts ?? []), ...(infras.get(repo.app_id)?.exposedHosts ?? [])],
      analysis: { status: 'done', progress: 100 },
    };
    const valida = v.safeParse(Application, aplicacao);
    if (!valida.success) throw new Error(`Application inválida para ${repo.app_id}: ${valida.issues[0].message}`);
    await salvarDocumento(projetoId, 'application', repo.app_id, valida.output);

    const relatorio: Relatorio = {
      app: repo.app_id,
      entryPoints: codigos.get(repo.app_id)?.entryPoints ?? [],
      outboundCalls: codigos.get(repo.app_id)?.outboundCalls ?? [],
      dataAccess: dados.get(repo.app_id)?.dataAccess ?? [],
      exposedHosts: aplicacao.exposedHosts,
      variaveis: infras.get(repo.app_id)?.variaveis ?? [],
    };
    await salvarDocumento(projetoId, 'repo-report', repo.app_id, relatorio);
  }
}

async function lerDocumentosPorApp<T>(projetoId: string, tipo: string) {
  // As partes são gravadas com chave = appId (ver tools/salvar.ts).
  const linhas = await sql`select chave, conteudo from documento where projeto_id = ${projetoId} and tipo = ${tipo}`;
  return new Map(linhas.map((l) => [l.chave as string, l.conteudo as T]));
}

const normalizar = (rota: string) =>
  rota.split('?')[0].replace(/\/+$/, '').split('/').map((s) => (/^\{.*\}$|^\d+$|^:/.test(s) ? '*' : s.toLowerCase())).join('/');

function resolver(alvo: string, variaveis: Variavel[]) {
  return alvo.replace(/\$\{([A-Z0-9_]+)\}/g, (orig, nome) => {
    const candidatas = variaveis.filter((x) => x.nome === nome);
    return (candidatas.find((x) => /prod/i.test(x.ambiente)) ?? candidatas[0])?.valor ?? orig;
  });
}

function separar(url: string) {
  const m = url.match(/^[a-z]+:\/\/([^/:]+)(?::\d+)?(\/.*)?$/i);
  return m ? { host: m[1].toLowerCase(), rota: m[2] ?? '/' } : { host: undefined, rota: url };
}

/** Casamento automático. Devolve quantos casos ficaram para o agente. */
export async function correlacionarAutomatico(projetoId: string) {
  const relatorios = await lerDocumentos<Relatorio>(projetoId, 'repo-report');
  const hostParaApp = new Map<string, string>();
  for (const r of relatorios) for (const h of r.exposedHosts) hostParaApp.set(h.toLowerCase(), r.app);
  const todosEntryPoints = relatorios.flatMap((r) => r.entryPoints);

  const conexoes = new Map<string, Connection>();
  const juntar = (de: string, para: string, kind: Connection['kind'], chamada: string, ev: Evidence, conf: number, ep?: string) => {
    const id = `conn:${de}>${para}`;
    const c = conexoes.get(id) ?? {
      id, from: de, to: para, kind, count: 0, calls: [], matchedEntryPoints: [], confidence: 1, needsReview: false, evidence: [],
    };
    c.count += 1;
    c.calls.push(chamada);
    if (ep) c.matchedEntryPoints!.push(ep);
    c.confidence = Math.min(c.confidence, conf);
    c.needsReview = c.confidence < 0.6;
    if (c.evidence.length < 5) c.evidence.push(ev);
    conexoes.set(id, c);
  };

  let ambiguos = 0;
  const externos = new Map<string, { id: string; name: string; hosts: string[]; calledBy: Set<string> }>();

  for (const r of relatorios) {
    for (const call of r.outboundCalls) {
      // Filas: casa pelo nome da fila com um consumidor.
      if (call.kind === 'queue-produce') {
        const consumidor = todosEntryPoints.find((e) => e.kind === 'queue-consumer' && e.signature === call.target);
        if (consumidor) { juntar(r.app, consumidor.app, 'queue', call.id, call.evidence, 1, consumidor.id); continue; }
      }

      const { host, rota } = separar(call.resolvedTarget ?? resolver(call.target, r.variaveis));
      const candidatos = todosEntryPoints.filter(
        (e) => e.app !== r.app && e.signature.toUpperCase().startsWith((call.method ?? '').toUpperCase())
          && normalizar(e.signature.split(' ').pop() ?? '') === normalizar(rota),
      );
      const appDoHost = host ? hostParaApp.get(host) : undefined;

      if (appDoHost) {
        const ep = candidatos.find((e) => e.app === appDoHost);
        juntar(r.app, appDoHost, call.kind === 'soap' ? 'soap' : 'http', call.id, call.evidence, ep ? 1 : 0.8, ep?.id);
      } else if (host && candidatos.length === 0) {
        // Host conhecido mas fora da lista → sistema externo, agrupado por host.
        const id = `ext:${host.split('.')[0]}`;
        const ext = externos.get(id) ?? { id, name: host.split('.')[0], hosts: [host], calledBy: new Set<string>() };
        ext.calledBy.add(r.app);
        externos.set(id, ext);
        juntar(r.app, id, 'http', call.id, call.evidence, 0.9);
      } else if (candidatos.length === 1) {
        juntar(r.app, candidatos[0].app, 'http', call.id, call.evidence, 0.8, candidatos[0].id);
      } else {
        ambiguos += 1;
        await salvarDocumento(projetoId, 'ambiguo', call.id, { id: call.id, chamada: call, candidatos: candidatos.map((c) => c.id) });
      }
    }

    // Dados: uma conexão por recurso.
    for (const a of r.dataAccess) juntar(r.app, a.resource, 'data', a.resource, a.evidence, 1);
  }

  // Recursos compartilhados = acessados por 2 ou mais aplicações.
  const acessos = new Map<string, Set<string>>();
  for (const r of relatorios) for (const a of r.dataAccess) acessos.set(a.resource, (acessos.get(a.resource) ?? new Set()).add(r.app));
  for (const [recurso, apps] of acessos) {
    const [store, nome] = recurso.replace(/^db:/, '').split('/');
    await salvarDocumento(projetoId, 'data-resource', recurso, {
      id: recurso, kind: nome?.startsWith('queue:') ? 'queue' : 'table', store, name: nome ?? store,
      accessedBy: [...apps], shared: apps.size > 1,
    });
  }

  for (const ext of externos.values()) {
    await salvarDocumento(projetoId, 'external', ext.id, { ...ext, calledBy: [...ext.calledBy], decision: 'pending' });
  }
  for (const c of conexoes.values()) await salvarDocumento(projetoId, 'connection', c.id, c);

  return { ambiguos, conexoes: conexoes.size, externos: externos.size };
}
