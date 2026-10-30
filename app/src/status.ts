// Transforma as linhas da tabela `progresso` no formato que a tela desenha.
export interface LinhaProgresso {
  etapa: string;
  app_id: string;
  agente: string;
  status: string;
  percentual: number;
  mensagem: string | null;
}

export interface StatusProjeto {
  etapas: { etapa: string; status: 'fila' | 'rodando' | 'concluido' | 'erro'; percentual: number }[];
  aplicacoes: { appId: string; percentual: number; passo: string; status: string }[];
  agentesAtivos: { agente: string; appId: string; percentual: number; mensagem: string | null }[];
}

const ORDEM = ['inventario', 'extracao', 'correlacao', 'funcionalidades', 'plano'];
const NOMES: Record<string, string> = {
  inventario: 'Classificando',
  extracao: 'Mapeando chamadas',
  correlacao: 'Ligando aplicações',
  funcionalidades: 'Encontrando funcionalidades',
  plano: 'Montando o plano',
};

const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export function resumirStatus(linhas: readonly LinhaProgresso[] | readonly Record<string, unknown>[]): StatusProjeto {
  const ls = linhas as LinhaProgresso[];

  const etapas = ORDEM.map((etapa) => {
    const daEtapa = ls.filter((l) => l.etapa === etapa);
    const status =
      daEtapa.some((l) => l.status === 'erro') ? 'erro'
      : daEtapa.length && daEtapa.every((l) => l.status === 'concluido') ? 'concluido'
      : daEtapa.some((l) => l.status === 'rodando' || l.status === 'concluido') ? 'rodando'
      : 'fila';
    return { etapa, status, percentual: media(daEtapa.map((l) => l.percentual)) } as const;
  });

  const apps = [...new Set(ls.map((l) => l.app_id).filter(Boolean))];
  const aplicacoes = apps.map((appId) => {
    const doApp = ls.filter((l) => l.app_id === appId);
    const emAndamento = doApp.find((l) => l.status === 'rodando');
    const tudoPronto = doApp.every((l) => l.status === 'concluido');
    return {
      appId,
      percentual: media(doApp.map((l) => l.percentual)),
      passo: tudoPronto ? 'Concluída' : NOMES[emAndamento?.etapa ?? 'inventario'],
      status: doApp.some((l) => l.status === 'erro') ? 'erro' : tudoPronto ? 'concluido' : 'rodando',
    };
  });

  const agentesAtivos = ls
    .filter((l) => l.status === 'rodando')
    .map((l) => ({ agente: l.agente, appId: l.app_id, percentual: l.percentual, mensagem: l.mensagem }));

  return { etapas, aplicacoes, agentesAtivos };
}
