import { getEntityHistory } from 'planfs-core';
export async function historyCommand(rootPath: string, id: string, format: 'text' | 'json' = 'text'): Promise<number> {
  try { const entries = await getEntityHistory(rootPath, id); if (format === 'json') console.log(JSON.stringify(entries, null, 2)); else if (!entries.length) console.log(`No committed history for ${id}.`); else for (const entry of entries) console.log(`${entry.hash.slice(0, 12)} ${entry.timestamp} ${entry.author} — ${entry.subject}`); return 0; }
  catch (error) { console.error(`History failed: ${error instanceof Error ? error.message : String(error)}`); return 1; }
}
