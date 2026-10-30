// O painel de chat. Usa o hook oficial do Flue, que cuida de histórico, streaming e reconexão.
import { useFlueAgent } from '@flue/react';
import { useState } from 'react';

export function ChatAssistente({ projetoId, usuario }: { projetoId: string; usuario: string }) {
  // Uma conversa por usuário e projeto. A URL é a rota montada em app.ts + o id da conversa.
  const agente = useFlueAgent({ url: `/agents/assistente/${projetoId}--${usuario}` });
  const [texto, setTexto] = useState('');

  return (
    <section aria-label="Assistente">
      {agente.messages
        .filter((m) => m.display === 'visible')
        .map((m) => (
          <div key={m.id} data-papel={m.role}>
            {m.parts.map((parte, i) => {
              // 1) Texto normal da conversa.
              if (parte.type === 'text') return <p key={i}>{parte.text}</p>;

              // 2) Uma tool sendo usada: mostramos um aviso amigável em vez do nome técnico.
              if (parte.type === 'dynamic-tool') {
                const rotulos: Record<string, string> = {
                  consultar_grafo: 'Consultando a análise…',
                  status_analise: 'Vendo o andamento…',
                  simular_ondas: 'Simulando o plano…',
                  registrar_decisao: 'Registrando sua decisão…',
                };
                return <small key={i}>{rotulos[parte.toolName] ?? 'Trabalhando…'}</small>;
              }

              // 3) Dado estruturado enviado pelo agente com useDataWriter('simulacao'):
              //    desenhamos um cartão próprio em vez de texto.
              if (parte.type === 'data-simulacao') {
                const sim = parte.data as { ondas: { onda: string; desligaveis: string[]; tabelasDivididas: string[] }[] };
                return (
                  <div key={i} role="group" aria-label="Simulação do plano">
                    {sim.ondas.map((o) => (
                      <div key={o.onda}>
                        <strong>{o.onda}</strong>
                        {o.desligaveis.length > 0 && <div>Desligáveis: {o.desligaveis.join(', ')}</div>}
                        {o.tabelasDivididas.length > 0 && <div>Dados divididos: {o.tabelasDivididas.join(', ')}</div>}
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          setTexto('');
          await agente.sendMessage(texto);
        }}
      >
        <label htmlFor="pergunta">Pergunte ao assistente</label>
        <input id="pergunta" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" disabled={agente.status === 'submitted' || agente.status === 'streaming'}>
          Enviar
        </button>
      </form>
    </section>
  );
}
