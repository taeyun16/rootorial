import { createContext, useCallback, useContext, useSyncExternalStore, type SetStateAction } from "react";
import { emptyDraftSnapshot, type ExperimentDraftStore } from "./experiment-drafts";

export const ExperimentDraftContext = createContext<ExperimentDraftStore | null>(null);
const emptySubscribe = () => () => {};
const getEmpty = () => emptyDraftSnapshot;

/** Version draftId when changing its schema. Save inputs, never results or grading state. */
export function useExperimentDraft<T>(draftId: string, initialValue: T, validate: (value: unknown) => value is T) {
  const store = useContext(ExperimentDraftContext);
  const snapshot = useSyncExternalStore(store?.subscribe ?? emptySubscribe, store?.getSnapshot ?? getEmpty, getEmpty);
  const saved = snapshot.values[draftId];
  const valid = validate(saved);
  const restored = valid && snapshot.restoredIds.includes(draftId);
  const value = valid ? saved : initialValue;
  const setValue = useCallback((next: SetStateAction<T>) => {
    if (!store) return;
    const current = store.getSnapshot().values[draftId];
    const previous = validate(current) ? current : initialValue;
    store.set(draftId, typeof next === "function" ? (next as (value: T) => T)(previous) : next);
  }, [store, draftId, initialValue, validate]);
  const clear = useCallback(() => store?.clear(draftId), [store, draftId]);
  return { value, setValue, ready: snapshot.ready, restored, storageAvailable: snapshot.storageAvailable, clear };
}
