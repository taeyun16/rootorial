import { parseStoredProgress, validateCompletedSlugs } from "./progress.ts";
import { mergeProgress, validateResume, type ProgressSnapshot, type ResumePoint } from "./progress-repository.ts";

export type ProgressStatus = "loading" | "local" | "memory" | "syncing" | "synced" | "error";
export type ProgressTransport = {
  read: () => Promise<ProgressSnapshot>;
  merge: (snapshot: ProgressSnapshot) => Promise<ProgressSnapshot>;
};
export type ClientProgress = ProgressSnapshot & { status: ProgressStatus; storageAvailable: boolean };
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const empty = (): ProgressSnapshot => ({ completed: [], resume: null });

/** A serialized, identity-independent client. Pending writes survive reloads. */
export class ProgressClient {
  state: ClientProgress = { ...empty(), status: "loading", storageAvailable: true };
  private revision = 0;
  private dirty = false;
  private stopped = false;
  private flight: Promise<void> | null = null;
  private storage: StoragePort;
  private key: string;
  private remote?: ProgressTransport;
  private changed: (state: ClientProgress) => void;
  constructor(
    storage: StoragePort,
    key: string,
    remote?: ProgressTransport,
    changed: (state: ClientProgress) => void = () => {},
  ) {
    this.storage = storage;
    this.key = key;
    this.remote = remote;
    this.changed = changed;
  }

  private emit() { if (!this.stopped) this.changed({ ...this.state }); }
  private cached(): ProgressSnapshot {
    try {
      const completed = parseStoredProgress(this.storage.getItem(this.key));
      let resume = null;
      try { resume = validateResume(JSON.parse(this.storage.getItem(`${this.key}:resume`) ?? "null")); } catch { /* Ignore corrupt resume data, retaining completions. */ }
      let pending = empty();
      try {
        const value = JSON.parse(this.storage.getItem(`${this.key}:outbox:v1`) ?? "null");
        if (value) pending = { completed: validateCompletedSlugs(value.completed), resume: validateResume(value.resume) };
      } catch { /* Cached completions are a second durable copy. */ }
      return mergeProgress({ completed, resume }, pending);
    } catch {
      this.state.storageAvailable = false;
      return empty();
    }
  }

  private persist() {
    this.state = { ...this.state, ...mergeProgress(this.cached(), this.state) };
    const value = { completed: this.state.completed, resume: this.state.resume };
    try {
      // Write the retry record first, before sending anything to the server.
      if (this.remote && this.dirty) this.storage.setItem(`${this.key}:outbox:v1`, JSON.stringify(value));
      this.storage.setItem(this.key, JSON.stringify(value.completed));
      this.storage.setItem(`${this.key}:resume`, JSON.stringify(value.resume));
      this.state.storageAvailable = true;
    } catch { this.state.storageAvailable = false; }
  }

  async start(imported: ProgressSnapshot = empty()) {
    this.state = { ...this.state, ...mergeProgress(this.cached(), imported) };
    this.dirty = Boolean(this.remote);
    this.persist();
    this.emit();
    if (!this.remote) {
      this.state.status = this.state.storageAvailable ? "local" : "memory";
      this.emit();
      return;
    }
    try {
      const remote = await this.remote.read();
      if (this.stopped) return;
      this.state = { ...this.state, ...mergeProgress(remote, this.state) };
      this.persist();
      await this.flush();
    } catch {
      if (this.stopped) return;
      this.state.status = "error";
      this.emit();
    }
  }

  complete(chapterId: string) {
    const completed = validateCompletedSlugs([chapterId]);
    this.update({ completed, resume: null });
    return this.flush();
  }

  resume(point: ResumePoint) {
    this.update({ completed: [], resume: validateResume(point) });
    return this.flush();
  }

  private update(snapshot: ProgressSnapshot) {
    if (this.stopped) return;
    this.state = { ...this.state, ...mergeProgress(this.state, snapshot) };
    this.revision++;
    this.dirty = Boolean(this.remote);
    this.persist();
    this.state.status = this.remote ? "syncing" : this.state.storageAvailable ? "local" : "memory";
    this.emit();
  }

  flush(): Promise<void> {
    if (this.stopped || !this.remote || !this.dirty) return Promise.resolve();
    if (this.flight) return this.flight;
    this.flight = this.drain().finally(() => { this.flight = null; });
    return this.flight;
  }

  retry() {
    if (this.stopped) return Promise.resolve();
    this.persist();
    if (!this.remote) {
      this.state.status = this.state.storageAvailable ? "local" : "memory";
      this.emit();
    }
    return this.flush();
  }

  private async drain() {
    this.state.status = "syncing";
    this.emit();
    try {
      while (this.dirty && !this.stopped) {
        const revision = this.revision;
        this.persist();
        const sent = { completed: [...this.state.completed], resume: this.state.resume };
        const result = await this.remote!.merge(sent);
        if (this.stopped) return;
        // A late response must never replace work done while it was in flight.
        this.state = { ...this.state, ...mergeProgress(this.state, result) };
        this.dirty = revision !== this.revision;
        this.persist();
        if (!this.dirty) {
          try {
            // Keep another tab's newer retry record for its next startup/online event.
            const pending = this.storage.getItem(`${this.key}:outbox:v1`);
            if (!pending || pending === JSON.stringify(sent)) this.storage.removeItem(`${this.key}:outbox:v1`);
          } catch { this.state.storageAvailable = false; }
        }
      }
      this.state.status = "synced";
    } catch {
      this.state.status = "error";
    }
    this.emit();
  }

  reset() {
    if (this.remote) return false;
    let storageAvailable = true;
    try {
      for (const suffix of ["", ":resume", ":outbox:v1"]) this.storage.removeItem(this.key + suffix);
    } catch { storageAvailable = false; }
    this.state = { ...empty(), status: storageAvailable ? "local" : "memory", storageAvailable };
    this.emit();
    return storageAvailable;
  }

  dispose() { this.stopped = true; }
}
