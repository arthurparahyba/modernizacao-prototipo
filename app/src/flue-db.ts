// Onde o Flue guarda as CONVERSAS dos agentes (histórico, recibos, estado durável).
// É isso que permite retomar um agente depois de uma queda.
//
// SQLite serve para desenvolvimento. Em produção, use Postgres:
//   npx flue add database postgres
// (o comando entrega um guia que o seu agente de código aplica neste projeto).
//
// Observação: este banco é do Flue. Os dados da aplicação (progresso, grafo) ficam no
// Postgres da aplicação, em src/db.ts.
import { sqlite } from '@flue/runtime/node';

export default sqlite('./data/flue.db');
