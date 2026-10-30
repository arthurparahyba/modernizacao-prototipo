// Prepara a pasta de trabalho de um projeto: clona os repositórios (somente leitura, raso).
import { execFile } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { WORK_DIR } from '../config.ts';

const run = promisify(execFile);

export async function clonarRepositorio(projetoId: string, appId: string, url: string) {
  const pasta = join('repos', appId.replace(/^app:/, ''));
  const destino = join(WORK_DIR, projetoId, pasta);
  await mkdir(join(WORK_DIR, projetoId, 'repos'), { recursive: true });

  const jaExiste = await stat(destino).then(() => true, () => false);
  if (jaExiste) {
    await run('git', ['-C', destino, 'pull', '--ff-only']);
  } else {
    // --depth 1: só a versão atual, sem histórico. Basta para a análise e é bem mais rápido.
    await run('git', ['clone', '--depth', '1', url, destino]);
  }
  const { stdout } = await run('git', ['-C', destino, 'rev-parse', '--short', 'HEAD']);
  return { pasta, commit: stdout.trim() };
}
