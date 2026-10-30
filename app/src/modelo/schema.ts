/**
 * Modelo de dados — modernização por funcionalidade
 *
 * Fonte da verdade para o que os agentes produzem e o que a interface lê.
 * Valibot, a mesma biblioteca dos schemas de tools no Flue.
 *
 *   reports/<app>.md      → frontmatter validado por RepoReport
 *   graph.json            → validado por Graph (consolidado, lido pela interface)
 */
import * as v from 'valibot';

/* ---------- Ids ---------- */

// Ids estáveis e legíveis: uma reanálise atualiza em vez de duplicar.
const id = (prefix: string) =>
  v.pipe(v.string(), v.startsWith(`${prefix}:`), v.maxLength(300));

export const AppId = id('app');            // app:sgc-core
export const EntryPointId = id('ep');      // ep:sgc-core:http:POST:/pix/chaves
export const CallId = id('call');          // call:sgc-core:a41c
export const DataResourceId = id('db');    // db:ORA_SGC/table:PIX_CHAVE
export const ExternalId = id('ext');       // ext:motor-antifraude
export const ConnectionId = id('conn');    // conn:app:sgc-core>ext:motor-antifraude
export const FeatureId = id('feat');       // feat:cadastro-chave-pix
export const WaveId = id('wave');          // wave:1
export const DecisionId = id('dec');       // dec:ext:motor-antifraude

const Confidence = v.pipe(v.number(), v.minValue(0), v.maxValue(1));
const IsoDate = v.pipe(v.string(), v.isoTimestamp());

/* ---------- Evidência ---------- */

// Todo fato extraído aponta para o código. Sem evidência, não entra no grafo.
export const Evidence = v.object({
  repo: v.optional(v.string()),     // implícito no relatório por repositório
  commit: v.optional(v.string()),
  path: v.string(),
  line: v.pipe(v.number(), v.integer(), v.minValue(1)),
  snippet: v.optional(v.pipe(v.string(), v.maxLength(400))),
  // parser:* = determinístico (confiança 1); llm:* = inferido (exige reason)
  extractor: v.pipe(v.string(), v.regex(/^(parser|llm|config):[a-z0-9-]+$/)),
  confidence: Confidence,
  reason: v.optional(v.string()),
});
export type Evidence = v.InferOutput<typeof Evidence>;

/* ---------- Aplicação ---------- */

export const Classification = v.object({
  value: v.picklist(['modern', 'legacy']),
  reasons: v.pipe(v.array(v.string()), v.minLength(1)),
});

export const Application = v.object({
  id: AppId,
  name: v.string(),
  repoUrl: v.pipe(v.string(), v.url()),
  stack: v.array(v.string()),                 // ["Java EE 6", "EJB", "Oracle 11g"]
  classification: Classification,
  inScope: v.boolean(),
  exposedHosts: v.array(v.string()),          // usados na correlação
  analysis: v.object({
    status: v.picklist(['queued', 'running', 'done', 'failed']),
    progress: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    step: v.optional(v.string()),             // "Mapeando chamadas"
    commit: v.optional(v.string()),
    analyzedAt: v.optional(IsoDate),
  }),
});
export type Application = v.InferOutput<typeof Application>;

/* ---------- Extração (por repositório) ---------- */

export const EntryPoint = v.object({
  id: EntryPointId,
  app: AppId,
  kind: v.picklist(['http', 'soap', 'screen', 'batch', 'queue-consumer', 'cron', 'rpc']),
  signature: v.string(),                      // "POST /pix/chaves", "COBR010"
  handler: v.optional(v.string()),            // "br.credito.pix.ChavePixResource#cadastrar"
  businessFacing: v.optional(v.boolean()),    // ponto de entrada de negócio → semente de fatia
  evidence: Evidence,
});

export const OutboundCall = v.object({
  id: CallId,
  app: AppId,
  kind: v.picklist(['http', 'soap', 'queue-produce', 'rpc', 'file', 'ftp']),
  method: v.optional(v.string()),
  target: v.string(),                         // como está escrito: "${ANTIFRAUDE_URL}/antifraude/score"
  resolvedTarget: v.optional(v.string()),     // depois de resolver config/IaC
  from: v.optional(v.string()),               // método ou programa de origem
  evidence: Evidence,
});

export const DataAccess = v.object({
  resource: DataResourceId,
  ops: v.array(v.picklist(['read', 'write', 'call'])),
  from: v.optional(v.string()),
  evidence: Evidence,
});

export const RepoReport = v.object({
  schema: v.literal('repo-report/v1'),
  app: AppId,
  repo: v.pipe(v.string(), v.url()),
  commit: v.string(),
  analyzedAt: IsoDate,
  classification: Classification,
  stack: v.optional(v.array(v.string())),
  exposedHosts: v.optional(v.array(v.string())),
  entryPoints: v.array(EntryPoint),
  outboundCalls: v.array(OutboundCall),
  dataAccess: v.array(DataAccess),
  unresolved: v.optional(v.array(v.object({ what: v.string(), evidence: Evidence }))),
});
export type RepoReport = v.InferOutput<typeof RepoReport>;

/* ---------- Correlação ---------- */

export const DataResource = v.object({
  id: DataResourceId,
  kind: v.picklist(['table', 'view', 'procedure', 'queue', 'topic', 'bucket', 'file']),
  store: v.string(),                          // "ORA_SGC", "MQ"
  name: v.string(),
  accessedBy: v.array(AppId),
  shared: v.boolean(),                        // acessado por 2+ aplicações
});

export const DecisionChoice = v.picklist(['pending', 'keep', 'include']);

export const ExternalSystem = v.object({
  id: ExternalId,
  name: v.string(),
  hosts: v.array(v.string()),
  calledBy: v.array(AppId),
  decision: DecisionChoice,
});

export const Connection = v.object({
  id: ConnectionId,
  from: AppId,
  to: v.union([AppId, ExternalId, DataResourceId]),
  kind: v.picklist(['http', 'soap', 'queue', 'rpc', 'file', 'data']),
  count: v.pipe(v.number(), v.integer(), v.minValue(1)),
  calls: v.array(v.union([CallId, v.string()])),
  matchedEntryPoints: v.optional(v.array(EntryPointId)),
  confidence: Confidence,                     // < 0.6 → revisão humana
  needsReview: v.boolean(),
  evidence: v.pipe(v.array(Evidence), v.minLength(1)),
});
export type Connection = v.InferOutput<typeof Connection>;

/* ---------- Funcionalidades ---------- */

export const FeatureApp = v.object({
  app: v.union([AppId, ExternalId]),
  role: v.string(),                           // "Tela de fatura", "Cálculo de encargos"
});

export const FeatureData = v.object({
  resource: DataResourceId,
  exclusive: v.boolean(),
  sharedWith: v.array(FeatureId),
});

export const Feature = v.object({
  id: FeatureId,
  name: v.string(),                           // nome de negócio
  description: v.string(),
  entryPoints: v.pipe(v.array(EntryPointId), v.minLength(1)),
  path: v.array(v.union([EntryPointId, CallId])), // caminho de chamadas, em ordem
  apps: v.array(FeatureApp),
  data: v.array(FeatureData),
  usagePerMonth: v.nullable(v.number()),      // null = sem dado
  unlocks: v.array(FeatureId),
  effort: v.object({
    size: v.picklist(['small', 'medium', 'large']),
    legacyRepos: v.number(),
    reachableLoc: v.optional(v.number()),
    integrations: v.number(),
  }),
  blockers: v.array(ExternalId),              // externos com decisão pendente
  score: v.optional(v.object({
    value: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    priority: v.picklist([1, 2, 3]),
    terms: v.object({ U: v.number(), D: v.number(), E: v.number(), S: v.number(), B: v.number() }),
  })),
  confidence: Confidence,
});
export type Feature = v.InferOutput<typeof Feature>;

/* ---------- Plano e decisões ---------- */

export const Wave = v.object({
  id: WaveId,
  order: v.number(),
  title: v.string(),
  features: v.array(FeatureId),
  blocked: v.array(FeatureId),
  estimate: v.optional(v.object({ minWeeks: v.number(), maxWeeks: v.number() })),
  appsRetiredAfter: v.array(AppId),
  rationale: v.string(),
});

export const Decision = v.object({
  id: DecisionId,
  subject: v.union([ExternalId, FeatureId, WaveId]),
  choice: v.union([DecisionChoice, v.picklist(['approve', 'reorder'])]),
  by: v.string(),
  at: IsoDate,
  note: v.optional(v.string()),
});

/* ---------- Pesos da prioridade (configuráveis por projeto) ---------- */

export const ScoreWeights = v.object({
  usage: v.number(),       // 0.35
  unlocks: v.number(),     // 0.30
  effort: v.number(),      // 0.25 (aplicado a 1 − E)
  sharing: v.number(),     // 0.10 (aplicado a 1 − S)
  blockerPenalty: v.number(), // 30
});

export const defaultWeights: v.InferOutput<typeof ScoreWeights> = {
  usage: 0.35, unlocks: 0.3, effort: 0.25, sharing: 0.1, blockerPenalty: 30,
};

/* ---------- Grafo consolidado (lido pela interface) ---------- */

export const Graph = v.object({
  schema: v.literal('graph/v1'),
  project: v.object({ id: v.string(), name: v.string(), weights: ScoreWeights }),
  generatedAt: IsoDate,
  applications: v.array(Application),
  entryPoints: v.array(EntryPoint),
  dataResources: v.array(DataResource),
  externalSystems: v.array(ExternalSystem),
  connections: v.array(Connection),
  features: v.array(Feature),
  waves: v.array(Wave),
  decisions: v.array(Decision),
});
export type Graph = v.InferOutput<typeof Graph>;
