import { promises as fs } from 'fs';
import * as path from 'path';

export const PLANFS_FORMAT_VERSION = 1;
const CONFIG_FILE = path.join('.planfs', 'planfs.json');

export interface FormatInfo { version: number; explicit: boolean; filePath: string; }
export interface MigrationPlan { currentVersion: number; targetVersion: number; changes: Array<{ filePath: string; action: 'create'; content: string }>; }

export async function getPlanfsFormat(rootPath: string): Promise<FormatInfo> {
  const filePath = path.join(rootPath, CONFIG_FILE);
  try {
    const value = JSON.parse(await fs.readFile(filePath, 'utf8')) as { formatVersion?: unknown };
    if (!Number.isInteger(value.formatVersion) || Number(value.formatVersion) < 1) throw new Error('formatVersion must be a positive integer');
    const version = Number(value.formatVersion);
    if (version > PLANFS_FORMAT_VERSION) throw new Error(`PlanFS format ${version} is newer than this CLI supports (${PLANFS_FORMAT_VERSION}). Upgrade PlanFS before editing this repository.`);
    return { version, explicit: true, filePath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, explicit: false, filePath };
    throw error;
  }
}

export async function planFormatMigration(rootPath: string): Promise<MigrationPlan> {
  const current = await getPlanfsFormat(rootPath);
  return { currentVersion: current.version, targetVersion: PLANFS_FORMAT_VERSION, changes: current.explicit ? [] : [{ filePath: current.filePath, action: 'create', content: JSON.stringify({ formatVersion: PLANFS_FORMAT_VERSION }, null, 2) + '\n' }] };
}

export async function applyFormatMigration(rootPath: string): Promise<MigrationPlan> {
  const plan = await planFormatMigration(rootPath);
  for (const change of plan.changes) {
    await fs.mkdir(path.dirname(change.filePath), { recursive: true });
    await fs.writeFile(change.filePath, change.content, 'utf8');
  }
  return plan;
}
