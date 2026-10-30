// Rascunho da tela "Portfólio" do protótipo, ligada de verdade ao backend.
// Mostra: o formulário de repositórios, a tabela de aplicações com progresso e os agentes trabalhando.
import { useEffect, useState } from 'react';
import { ChatAssistente } from './ChatAssistente.tsx';
import { useStatusDaAnalise } from './useStatusDaAnalise.ts';

interface Aplicacao {
  id: string;
  name: string;
  stack: string[];
  classification: { value: 'modern' | 'legacy'; reasons: string[] };
}

export function TelaPortfolio({ projetoId, usuario }: { projetoId: string; usuario: string }) {
  const { status } = useStatusDaAnalise(projetoId);
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [urls, setUrls] = useState('');

  // Recarrega as aplicações sempre que o inventário avança.
  const inventario = status?.etapas.find((e) => e.etapa === 'inventario');
  useEffect(() => {
    fetch(`/api/projetos/${projetoId}/dados/application`).then((r) => r.json()).then(setAplicacoes);
  }, [projetoId, inventario?.percentual]);

  async function analisar() {
    const repositorios = urls.split('\n').map((u) => u.trim()).filter(Boolean);
    await fetch(`/api/projetos/${projetoId}/repositorios`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ repositorios }),
    });
    setUrls('');
  }

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <main style={{ flex: '999 1 560px', minWidth: 0 }}>
        {/* Etapas da análise */}
        <ol aria-label="Etapas">
          {status?.etapas.map((e) => (
            <li key={e.etapa}>{e.etapa}: {e.status} ({e.percentual}%)</li>
          ))}
        </ol>

        {/* Aplicações: classificação vem do banco; progresso vem do status ao vivo */}
        <table>
          <thead>
            <tr><th>Aplicação</th><th>Tecnologia</th><th>Classificação</th><th>Análise</th></tr>
          </thead>
          <tbody>
            {status?.aplicacoes.map((p) => {
              const app = aplicacoes.find((a) => a.id === p.appId);
              return (
                <tr key={p.appId}>
                  <td>{app?.name ?? p.appId}</td>
                  <td>{app?.stack.join(' · ') ?? '…'}</td>
                  <td>
                    {app ? (app.classification.value === 'modern' ? 'Moderna' : 'Legada') : '…'}
                    <div><small>{app?.classification.reasons[0]}</small></div>
                  </td>
                  <td>
                    {p.passo}
                    <progress value={p.percentual} max={100} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <label htmlFor="repos">Repositórios (um por linha)</label>
        <textarea id="repos" value={urls} onChange={(e) => setUrls(e.target.value)} rows={3} />
        <button type="button" onClick={analisar}>Analisar</button>
      </main>

      <aside style={{ flex: '1 1 340px' }}>
        <h2>Em andamento</h2>
        {status?.agentesAtivos.map((a) => (
          <div key={`${a.agente}-${a.appId}`}>
            <strong>{a.agente}</strong> · {a.appId}
            <div>{a.mensagem}</div>
            <progress value={a.percentual} max={100} />
          </div>
        ))}
        <ChatAssistente projetoId={projetoId} usuario={usuario} />
      </aside>
    </div>
  );
}
