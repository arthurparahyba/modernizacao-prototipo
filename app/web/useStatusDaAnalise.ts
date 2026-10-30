// Hook React que mantém o status da análise sempre atualizado na tela.
// Usa Server-Sent Events: o servidor empurra uma atualização sempre que o progresso muda.
import { useEffect, useState } from 'react';
import type { StatusProjeto } from '../src/status.ts';

export function useStatusDaAnalise(projetoId: string | undefined) {
  const [status, setStatus] = useState<StatusProjeto | null>(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!projetoId) return;
    // Observação: EventSource não envia cabeçalho Authorization. Use cookie de sessão
    // para autenticar esta rota, ou troque por fetch + polling a cada 3 s.
    const fonte = new EventSource(`/api/projetos/${projetoId}/status/stream`, { withCredentials: true });
    fonte.addEventListener('status', (e) => setStatus(JSON.parse((e as MessageEvent).data)));
    fonte.onopen = () => setConectado(true);
    fonte.onerror = () => setConectado(false); // o navegador reconecta sozinho
    return () => fonte.close();
  }, [projetoId]);

  return { status, conectado };
}
