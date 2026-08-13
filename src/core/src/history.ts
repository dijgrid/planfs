import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { getAllEntities, loadRepository } from './repository';

const execFileAsync = promisify(execFile);
export interface EntityHistoryEntry { hash: string; timestamp: string; author: string; subject: string; }

export async function getEntityHistory(rootPath: string, id: string): Promise<EntityHistoryEntry[]> {
  const repository = await loadRepository(rootPath);
  const entity = [...getAllEntities(repository, { includeArchived: true })].find(candidate => candidate.id === id);
  if (!entity) throw new Error(`Entity not found: ${id}`);
  const relative = path.relative(rootPath, entity.filePath);
  try {
    const { stdout } = await execFileAsync('git', ['log', '--follow', '--format=%H%x09%aI%x09%an%x09%s', '--', relative], { cwd: rootPath });
    return stdout.split('\n').filter(Boolean).map(line => {
      const [hash, timestamp, author, subject] = line.split('\t');
      return { hash, timestamp, author, subject };
    });
  } catch (error) { throw new Error(`Git history is unavailable: ${error instanceof Error ? error.message : String(error)}`); }
}
