// Acesso ao banco da aplicação. Tudo aqui é código comum, sem IA.
import postgres from 'postgres';
import { DATABASE_URL } from './config.ts';

export const sql = postgres(DATABASE_URL);

export type Etapa = 'inventario' | 'extracao' | 'correlacao' | 'funcionalidades' | 'plano';
export type StatusEtapa = 'fila' | 'rodando' | 'concluido' | 'erro';

export async function registrarProgresso(p: {
  projetoId: string;
  etapa: Etapa;
  appId?: string;
  agente: string;
  status: StatusEtapa;
  percentual?: number;
  mensagem?: string;
}) {
  await sql`
    insert into progresso (projeto_id, etapa, app_id, agente, status, percentual, mensagem)
    values (${p.projetoId}, ${p.etapa}, ${p.appId ?? ''}, ${p.agente}, ${p.status},
            ${p.percentual ?? 0}, ${p.mensagem ?? null})
    on conflict (projeto_id, etapa, app_id, agente) do update set
      status = excluded.status,
      percentual = excluded.percentual,
      mensagem = excluded.mensagem,
      atualizado_em = now()`;
}

export async function lerProgresso(projetoId: string) {
  return sql`
    select etapa, app_id, agente, status, percentual, mensagem, atualizado_em
    from progresso where projeto_id = ${projetoId}
    order by etapa, app_id, agente`;
}

export async function salvarDocumento(projetoId: string, tipo: string, chave: string, conteudo: unknown) {
  await sql`
    insert into documento (projeto_id, tipo, chave, conteudo)
    values (${projetoId}, ${tipo}, ${chave}, ${sql.json(conteudo as never)})
    on conflict (projeto_id, tipo, chave) do update set
      conteudo = excluded.conteudo, atualizado_em = now()`;
}

export async function lerDocumentos<T = unknown>(projetoId: string, tipo: string): Promise<T[]> {
  const linhas = await sql`select conteudo from documento where projeto_id = ${projetoId} and tipo = ${tipo}`;
  return linhas.map((l) => l.conteudo as T);
}

export async function listarRepositorios(projetoId: string) {
  return sql<{ app_id: string; url: string }[]>`
    select app_id, url from repositorio where projeto_id = ${projetoId} order by app_id`;
}
