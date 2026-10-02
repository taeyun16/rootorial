type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type DraftSnapshot = { values: Record<string, unknown>; restoredIds: string[]; ready: boolean; storageAvailable: boolean };
export const emptyDraftSnapshot: DraftSnapshot = { values: {}, restoredIds: [], ready: false, storageAvailable: true };
export const experimentDraftKey = (progressKey: string) => `${progressKey}:drafts:v1`;

/** Browser-only input drafts. Never completion evidence and never sent to the server. */
export class ExperimentDraftStore {
  private snapshot: DraftSnapshot = emptyDraftSnapshot;
  private listeners = new Set<() => void>();
  private storage: StoragePort;
  private progressKey: string;
  constructor(storage: StoragePort, progressKey: string) { this.storage = storage; this.progressKey = progressKey; }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(values: Record<string, unknown>, storageAvailable: boolean, restoredIds = this.snapshot.restoredIds) {
    this.snapshot = { values, restoredIds, ready: true, storageAvailable };
    this.listeners.forEach((listener) => listener());
  }
  start() {
    let raw: string | null;
    try { raw = this.storage.getItem(experimentDraftKey(this.progressKey)); }
    catch { this.emit({}, false); return; }
    let values: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(raw ?? "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) values = parsed as Record<string, unknown>;
    } catch { /* A malformed draft never affects saved progress. */ }
    this.emit(values, true, Object.keys(values));
  }
  private latestValues() {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(experimentDraftKey(this.progressKey)) ?? "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // Keep unsaved inputs if a preceding write failed. Otherwise use the
        // latest browser copy, preserving edits to other draft IDs in other tabs.
        return this.snapshot.storageAvailable ? parsed as Record<string, unknown> : { ...parsed, ...this.snapshot.values };
      }
    } catch { /* Retain this page's inputs when storage is blocked or corrupt. */ }
    return this.snapshot.values;
  }
  set(id: string, value: unknown) {
    if (!this.snapshot.ready) return;
    const values = { ...this.latestValues(), [id]: value };
    let available = true;
    try { this.storage.setItem(experimentDraftKey(this.progressKey), JSON.stringify(values)); }
    catch { available = false; }
    this.emit(values, available);
  }
  clear(id: string) {
    const values = { ...this.latestValues() };
    delete values[id];
    let available = true;
    try { this.storage.setItem(experimentDraftKey(this.progressKey), JSON.stringify(values)); }
    catch { available = false; }
    this.emit(values, available, this.snapshot.restoredIds.filter((key) => key !== id));
  }
  reset() {
    let available = true;
    try { this.storage.removeItem(experimentDraftKey(this.progressKey)); }
    catch { available = false; }
    this.emit({}, available, []);
    return available;
  }
}
