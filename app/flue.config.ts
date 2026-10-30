// Configuração do projeto Flue.
// O plugin do Vite procura funções marcadas com 'use agent' e registra cada uma.
export default {
  target: 'node',
  app: './src/app.ts',        // as rotas HTTP (API das telas + chat)
  db: './src/flue-db.ts',     // onde o Flue guarda as conversas dos agentes
  agents: 'agents/**/*.ts',   // onde procurar 'use agent' (relativo a src/)
  providers: ['anthropic'],   // provedores de modelo carregados no servidor
};
