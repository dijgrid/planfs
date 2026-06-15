/**
 * File discovery module
 * Discovers and loads PlanFS files from a repository
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export interface DiscoveredFile {
  path: string;
  name: string;
  type: 'task' | 'epic' | 'milestone' | 'decision';
}

/**
 * Discover all PlanFS files in a repository
 */
export async function discoverFiles(
  rootPath: string
): Promise<DiscoveredFile[]> {
  const planfsDir = path.join(rootPath, '.planfs');
  const files: DiscoveredFile[] = [];

  const entityTypes = ['tasks', 'epics', 'milestones', 'decisions'] as const;

  for (const entityType of entityTypes) {
    const dir = path.join(planfsDir, entityType);

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push({
            path: path.join(dir, entry.name),
            name: entry.name,
            type: entityType.slice(0, -1) as 'task' | 'epic' | 'milestone' | 'decision'
          });
        }
      }
    } catch (error) {
      // Directory may not exist, which is okay
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }
  }

  return files;
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

/**
 * Write file content
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  // Create parent directories if needed
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Check if .planfs directory exists
 */
export async function planfsDirectoryExists(rootPath: string): Promise<boolean> {
  try {
    const planfsDir = path.join(rootPath, '.planfs');
    const stats = await fs.stat(planfsDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Ensure .planfs directory structure exists
 */
export async function ensurePlanfsStructure(rootPath: string): Promise<void> {
  const dirs = [
    path.join(rootPath, '.planfs'),
    path.join(rootPath, '.planfs', 'tasks'),
    path.join(rootPath, '.planfs', 'epics'),
    path.join(rootPath, '.planfs', 'milestones'),
    path.join(rootPath, '.planfs', 'decisions')
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}
