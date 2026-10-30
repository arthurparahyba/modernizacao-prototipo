// O "contexto" de cada execução de agente: a qual projeto e a qual repositório ela pertence.
//
// O pipeline envia isso como `initialData` no dispatch. O agente lê com `useInitialData()`
// e entrega às tools. Assim as tools sabem onde gravar sem depender do modelo
// repetir ids corretamente.
export interface Contexto {
  projetoId: string;
  /** Presente nas etapas por repositório (inventário e extração). */
  appId?: string;
  /** Pasta do repositório dentro do workspace, por exemplo "repos/sgc-core". */
  pasta?: string;
  /** Presente no chat: quem está falando. */
  usuario?: string;
}
