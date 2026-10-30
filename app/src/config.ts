// Onde ficam as escolhas que mudam de ambiente para ambiente.

// Modelos no formato "provedor/modelo". A lista de modelos disponíveis está em https://pi.dev/models.
// Dois perfis, como nas fichas dos agentes:
//  - RAPIDO: trabalho em volume (inventário e extração, um por repositório).
//  - RACIOCINIO: decisões (correlação ambígua, funcionalidades, plano, chat).
export const MODELO_RAPIDO = process.env.MODELO_RAPIDO ?? 'anthropic/claude-haiku-4-5';
export const MODELO_RACIOCINIO = process.env.MODELO_RACIOCINIO ?? 'anthropic/claude-sonnet-4-6';

// Pasta onde cada projeto ganha um "workspace": os repositórios clonados + as skills.
//   /work/<projetoId>/
//     .agents/skills/...      ← copiadas deste repositório
//     repos/<app>/            ← um clone por repositório analisado
export const WORK_DIR = process.env.WORK_DIR ?? '/work';

// Quantos repositórios analisar ao mesmo tempo (limita custo e uso de máquina).
export const PARALELISMO = Number(process.env.PARALELISMO ?? 4);

// Conexão com o Postgres da aplicação (estado das análises e grafo).
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost/modernizar';
