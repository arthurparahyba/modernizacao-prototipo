// A API que a interface usa. O Flue serve o que este arquivo exporta.
//
//   POST /api/projetos                      cria um projeto com repositórios e começa a análise
//   POST /api/projetos/:id/repositorios     adiciona repositórios e reanalisa
//   GET  /api/projetos/:id/status           foto do progresso (JSON)
//   GET  /api/projetos/:id/status/stream    progresso ao vivo (Server-Sent Events)
//   GET  /api/projetos/:id/dados/:tipo      dados das telas (application, connection, feature, wave…)
//   *    /agents/assistente/:conversa       conversa do chat (rotas criadas pelo Flue)
import { createAgentRouter } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Assistente } from './agents/assistente.ts';
import { lerDocumentos, lerProgresso, sql } from './db.ts';
import { analisarProjeto } from './pipeline/analisar-projeto.ts';
import { resumirStatus } from './status.ts';

const app = new Hono();

// ---------- Autenticação ----------
// Toda a API e o chat exigem usuário. Troque `verificarSessao` pelo login da empresa (SSO).
async function verificarSessao(token: string | undefined): Promise<{ id: string } | null> {
  return token ? { id: 'usuario-demo' } : null; // TODO: validar de verdade
}
app.use('/api/*', async (c, next) => {
  const usuario = await verificarSessao(c.req.header('authorization'));
  if (!usuario) return c.json({ erro: 'não autenticado' }, 401);
  await next();
});
// O chat: a pessoa só pode falar na conversa dela ("<projeto>--<usuario>").
app.use('/agents/assistente/*', async (c, next) => {
  const usuario = await verificarSessao(c.req.header('authorization'));
  if (!usuario) return c.json({ erro: 'não autenticado' }, 401);
  const conversa = c.req.path.split('/')[3] ?? '';
  if (!conversa.endsWith(`--${usuario.id}`)) return c.json({ erro: 'sem acesso' }, 403);
  await next();
});

// ---------- Projetos e repositórios ----------
const appIdDe = (url: string) => `app:${url.replace(/\.git$/, '').split('/').pop()!.toLowerCase()}`;

app.post('/api/projetos', async (c) => {
  const { nome, repositorios } = await c.req.json<{ nome: string; repositorios: string[] }>();
  const projetoId = `proj-${crypto.randomUUID().slice(0, 8)}`;
  await sql`insert into projeto (id, nome) values (${projetoId}, ${nome})`;
  for (const url of repositorios) {
    await sql`insert into repositorio (projeto_id, app_id, url) values (${projetoId}, ${appIdDe(url)}, ${url})`;
  }

  // Começa a análise SEM esperar: a resposta volta na hora e a tela acompanha pelo /status.
  // Em produção, coloque isto numa fila ou num orquestrador durável (veja docs/03).
  void analisarProjeto(projetoId).catch((e) => console.error('análise falhou', projetoId, e));

  return c.json({ projetoId }, 202);
});

app.post('/api/projetos/:id/repositorios', async (c) => {
  const projetoId = c.req.param('id');
  const { repositorios } = await c.req.json<{ repositorios: string[] }>();
  for (const url of repositorios) {
    await sql`insert into repositorio (projeto_id, app_id, url) values (${projetoId}, ${appIdDe(url)}, ${url})
              on conflict do nothing`;
  }
  void analisarProjeto(projetoId).catch((e) => console.error('análise falhou', projetoId, e));
  return c.json({ ok: true }, 202);
});

// ---------- Status da análise ----------
app.get('/api/projetos/:id/status', async (c) => {
  return c.json(resumirStatus(await lerProgresso(c.req.param('id'))));
});

// Ao vivo: o servidor lê o progresso a cada 2 s e manda para a tela só quando muda.
app.get('/api/projetos/:id/status/stream', (c) => {
  const projetoId = c.req.param('id');
  return streamSSE(c, async (stream) => {
    let anterior = '';
    while (!stream.aborted) {
      const atual = JSON.stringify(resumirStatus(await lerProgresso(projetoId)));
      if (atual !== anterior) {
        await stream.writeSSE({ event: 'status', data: atual });
        anterior = atual;
      }
      await stream.sleep(2000);
    }
  });
});

// ---------- Dados das telas ----------
const TIPOS = new Set(['application', 'connection', 'external', 'data-resource', 'feature', 'wave', 'decision']);
app.get('/api/projetos/:id/dados/:tipo', async (c) => {
  const tipo = c.req.param('tipo');
  if (!TIPOS.has(tipo)) return c.json({ erro: 'tipo desconhecido' }, 400);
  return c.json(await lerDocumentos(c.req.param('id'), tipo));
});

// ---------- Chat ----------
// O Flue cria as rotas da conversa: POST /:id (enviar), GET /:id (ler/stream), POST /:id/abort…
app.route('/agents/assistente', createAgentRouter(Assistente));

export default app;
