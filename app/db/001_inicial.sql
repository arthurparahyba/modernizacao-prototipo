-- Banco da aplicação. Guarda o que a tela mostra.
-- (As conversas dos agentes ficam no armazenamento do próprio Flue.)

create table projeto (
  id          text primary key,
  nome        text not null,
  criado_em   timestamptz not null default now()
);

create table repositorio (
  projeto_id  text not null references projeto(id),
  app_id      text not null,              -- app:sgc-core
  url         text not null,
  primary key (projeto_id, app_id)
);

-- Uma linha por (etapa, aplicação, agente). É o que alimenta a barra de progresso.
create table progresso (
  projeto_id    text not null references projeto(id),
  etapa         text not null,            -- inventario | extracao | correlacao | funcionalidades | plano
  app_id        text not null default '', -- vazio nas etapas que são do projeto inteiro
  agente        text not null,
  status        text not null,            -- fila | rodando | concluido | erro
  percentual    int  not null default 0,
  mensagem      text,
  atualizado_em timestamptz not null default now(),
  primary key (projeto_id, etapa, app_id, agente)
);

-- Documentos do modelo de dados (Application, RepoReport, Connection, Feature, Wave, Decision…),
-- validados pelo schema.ts antes de entrar aqui.
create table documento (
  projeto_id  text not null references projeto(id),
  tipo        text not null,              -- application | repo-report | connection | feature | wave | decision …
  chave       text not null,              -- o id do documento (app:sgc-core, feat:cadastro-chave-pix…)
  conteudo    jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (projeto_id, tipo, chave)
);
