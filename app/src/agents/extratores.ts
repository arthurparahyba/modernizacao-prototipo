'use agent';
// Fichas: .agents/agents/extrator-codigo.md, extrator-dados.md, extrator-infra.md
//
// Três agentes no mesmo arquivo porque são parecidos. O pipeline dispara os três
// em paralelo para cada repositório.
import { defineSubagent, useModel, useSkill, useSubagent, useTool } from '@flue/runtime';
import classificarStack from '../../../.agents/skills/classificar-stack/SKILL.md';
import cobol from '../../../.agents/skills/extrair-dependencias-cobol/SKILL.md';
import dotnet from '../../../.agents/skills/extrair-dependencias-dotnet/SKILL.md';
import java from '../../../.agents/skills/extrair-dependencias-java/SKILL.md';
import { MODELO_RAPIDO } from '../config.ts';
import { ferramentaExtratores } from '../tools/extratores.ts';
import { ferramentaProgresso } from '../tools/progresso.ts';
import { ferramentaSalvarParte } from '../tools/salvar.ts';
import { useContexto, useWorkspace } from './comum.ts';

/** Skills de linguagem: montamos as três; o modelo usa a da stack do repositório. */
function useSkillsDeLinguagem() {
  useSkill(java);
  useSkill(cobol);
  useSkill(dotnet);
}

// ---------- Subagente: lê um módulo de cada vez em repositórios grandes ----------
//
// Um subagente roda com contexto próprio e devolve só o texto final ao agente que o chamou.
// Ele compartilha o sandbox do pai (vê os mesmos arquivos). Várias delegações no mesmo turno
// rodam em paralelo.
function LeitorDeModulo() {
  useSkillsDeLinguagem();
  return `Você lê UMA pasta de um repositório e lista, com arquivo e linha:
- pontos de entrada (endpoints, telas, jobs, consumidores de fila);
- chamadas de saída (HTTP, SOAP, filas, CALL para outros programas, arquivos);
- acessos a dados (tabelas, procedures) com a operação.
Responda em JSON. Não resolva destinos: copie o alvo como está no código.`;
}

export const leitorDeModulo = defineSubagent({
  name: 'leitor_de_modulo',
  description: 'Lê uma única pasta/módulo do repositório e devolve em JSON o que entra, o que sai e os dados usados.',
  agent: LeitorDeModulo,
});

// ---------- Extrator de código ----------
export function ExtratorCodigo() {
  const ctx = useContexto();

  useModel(MODELO_RAPIDO);
  useWorkspace(ctx);
  useSkillsDeLinguagem();
  useSubagent(leitorDeModulo);
  useTool(ferramentaProgresso(ctx, 'extracao', 'extrator-codigo'));
  useTool(ferramentaExtratores(ctx, 'codigo'));
  useTool(ferramentaSalvarParte(ctx, 'codigo'));

  return `Você mapeia o que entra e o que sai da aplicação ${ctx.appId} (pasta ${ctx.pasta}).
1. Chame rodar_extratores primeiro.
2. Complete o que os parsers não acharam, usando a skill da stack.
3. Se houver mais de 300 arquivos de código, divida por módulo e delegue cada módulo ao subagente leitor_de_modulo
   (várias delegações de uma vez rodam em paralelo).
4. Registre progresso a cada módulo concluído.
5. Termine com salvar_parte_relatorio. Não resolva destinos: registre o alvo exatamente como está no código.
Marque o que você inferiu (e não veio dos parsers) com extractor "llm:extrator-codigo" e confiança menor que 1.`;
}

// ---------- Extrator de dados ----------
export function ExtratorDados() {
  const ctx = useContexto();

  useModel(MODELO_RAPIDO);
  useWorkspace(ctx);
  useSkillsDeLinguagem();
  useTool(ferramentaProgresso(ctx, 'extracao', 'extrator-dados'));
  useTool(ferramentaExtratores(ctx, 'dados'));
  useTool(ferramentaSalvarParte(ctx, 'dados'));

  return `Você mapeia os dados que a aplicação ${ctx.appId} (pasta ${ctx.pasta}) usa.
Chame rodar_extratores e complete com SQL dinâmico, procedures e filas que os parsers não acharam.
Para cada recurso, informe a operação (read, write ou call), de onde no código vem o acesso e a evidência.
Use o nome qualificado do recurso (ex.: db:ORA_SGC/table:PIX_CHAVE).
Termine com salvar_parte_relatorio.`;
}

// ---------- Extrator de infraestrutura ----------
export function ExtratorInfra() {
  const ctx = useContexto();

  useModel(MODELO_RAPIDO);
  useWorkspace(ctx);
  useSkill(classificarStack);
  useTool(ferramentaProgresso(ctx, 'extracao', 'extrator-infra'));
  useTool(ferramentaExtratores(ctx, 'infra'));
  useTool(ferramentaSalvarParte(ctx, 'infra'));

  return `Você descobre por quais endereços a aplicação ${ctx.appId} (pasta ${ctx.pasta}) é chamada
e quanto valem suas variáveis de configuração, por ambiente.
Leia apenas arquivos de infraestrutura e configuração.
Nunca copie segredos: para um valor que vem de cofre, registre só o nome da chave.
Termine com salvar_parte_relatorio.`;
}
