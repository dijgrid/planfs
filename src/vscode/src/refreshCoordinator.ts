export class RefreshCoordinator {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pending = new Map<string, () => Promise<void>>();

  schedule(workspaceKey: string, refresh: () => Promise<void>, delay = 75): void {
    this.pending.set(workspaceKey, refresh);
    const existing = this.timers.get(workspaceKey);
    if (existing) clearTimeout(existing);
    this.timers.set(workspaceKey, setTimeout(() => void this.run(workspaceKey), delay));
  }

  async flush(workspaceKey: string): Promise<void> {
    const timer = this.timers.get(workspaceKey);
    if (timer) clearTimeout(timer);
    await this.run(workspaceKey);
  }

  private async run(workspaceKey: string): Promise<void> {
    this.timers.delete(workspaceKey);
    const refresh = this.pending.get(workspaceKey);
    this.pending.delete(workspaceKey);
    if (!refresh) return;
    const started = Date.now();
    try { await refresh(); }
    catch (error) { console.error(`PlanFS refresh failed for ${workspaceKey}:`, error); }
    finally { console.debug(`PlanFS refresh ${workspaceKey} completed in ${Date.now() - started}ms`); }
  }
}
