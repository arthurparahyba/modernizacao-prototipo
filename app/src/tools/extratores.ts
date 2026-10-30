// rodar_extratores: a parte DETERMINÍSTICA da extração.
//
// Aqui não há IA. A tool roda parsers de verdade sobre o repositório e devolve o que
// encontraram, com confiança 1. O agente só completa o que os parsers não acham.
//
// Os parsers em si ficam fora deste rascunho. Exemplos do que plugar aqui:
//   Java: JavaParser/Spoon para JAX-RS, Spring, JPA; jdeps para dependências entre módulos.
//   .NET: Roslyn para controllers, WCF, Entity Framework.
//   COBOL: um parser de JCL + varredura de EXEC SQL / EXEC CICS / CALL.
//   Infra: leitores de Terraform, Helm, .properties, appsettings.json.
// Cada parser é um comando que recebe a pasta e imprime JSON no formato do schema.ts.
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { WORK_DIR } from '../config.ts';
import type { Contexto } from './contexto.ts';

const run = promisify(execFile);

export function ferramentaExtratores(ctx: Contexto, foco: 'codigo' | 'dados' | 'infra') {
  return defineTool({
    name: 'rodar_extratores',
    description:
      `Roda os parsers automáticos de "${foco}" sobre este repositório e devolve o que eles acharam ` +
      '(confiança 1). Chame primeiro; depois complete apenas o que faltar.',
    input: v.object({
      stack: v.array(v.string()),
    }),
    timeoutMs: 10 * 60_000,
    async run({ data, log }) {
      const pasta = join(WORK_DIR, ctx.projetoId, ctx.pasta!);
      log.info(`extratores ${foco} em ${pasta}`);
      // TODO: trocar pelo comando real dos parsers.
      const { stdout } = await run('modernizar-extratores', [
        '--foco', foco,
        '--pasta', pasta,
        '--app', ctx.appId!,
        '--stack', data.stack.join(','),
      ], { maxBuffer: 50 * 1024 * 1024 });
      return { output: stdout };
    },
  });
}
