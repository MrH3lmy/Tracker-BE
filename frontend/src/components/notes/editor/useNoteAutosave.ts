import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface AutosaveResult {
  ok: boolean;
  /** Server error text, surfaced verbatim in the persistent error state. */
  message?: string;
}

interface UseNoteAutosaveOptions<TSnapshot> {
  /** The current document. Changing this (by value identity) marks the document dirty. */
  snapshot: TSnapshot;
  /** Performs one save. Must resolve, never throw, for a handled failure. */
  save: (snapshot: TSnapshot, revision: number) => Promise<AutosaveResult>;
  /** Off until the document has actually loaded, so hydration never counts as an edit. */
  enabled: boolean;
  /**
   * Identifies which document the current snapshot *is*. When it changes, the snapshot that
   * arrives with it is adopted as the clean baseline rather than treated as an edit - that covers
   * the initial load and a re-hydration after a version restore. Without this, merely opening a
   * note would mark it dirty and autosave it with no user edit at all.
   */
  baselineKey: string | null;
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 900;
/** Enough passes to drain a queued follow-up save; a guard against an unexpected spin, not a retry. */
const MAX_FLUSH_PASSES = 5;
const SAVED_BADGE_MS = 2200;

/**
 * Debounced, strictly-sequenced autosave (issue #299 follow-up).
 *
 * The correctness rules this exists to enforce, in order of how badly each one bites:
 *
 * 1. **Never two saves in flight.** A second save is queued, not started. Overlapping requests
 *    against a last-write-wins backend can land out of order and resurrect old content.
 * 2. **A stale response can never move the document backwards.** Every save carries the local
 *    revision it was built from; a response is only allowed to mark that revision clean, and only
 *    if no newer edit has happened. The editor never adopts the response body as its content.
 * 3. **Nothing is called "Saved" until the server confirmed it.** A failure leaves the document
 *    dirty with a persistent error and a retry, not an optimistic tick.
 * 4. **Pending work is flushed before deliberate navigation**, and `beforeunload` warns if a save
 *    is still outstanding.
 *
 * Revisions are a monotonic local counter, not a server version - the API has no optimistic
 * concurrency (no `@Version`, no ETag), so this protects a single editor against its own races.
 * Two devices editing the same note concurrently remain last-write-wins; that would need a real
 * backend concurrency token and is deliberately out of scope.
 */
export function useNoteAutosave<TSnapshot>({
  snapshot,
  save,
  enabled,
  baselineKey,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseNoteAutosaveOptions<TSnapshot>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  /** Bumped when a completed save discovers newer local work that needs another round trip. */
  const [queuedSaveToken, setQueuedSaveToken] = useState(0);
  /** Mirrors "revision !== savedRevision" for render, so no ref is read during render. */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /** Bumped on every local edit. The single source of truth for "is there unsaved work". */
  const revisionRef = useRef(0);
  /** Highest revision the server has confirmed. */
  const savedRevisionRef = useRef(0);
  const inFlightRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const saveRef = useRef(save);
  const timerRef = useRef<number | null>(null);
  const savedBadgeTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const previousSnapshotRef = useRef(snapshot);
  const enabledRef = useRef(enabled);
  const baselineKeyRef = useRef<string | null>(null);
  /** Resolves when the current request settles, so `flush` can join it instead of skipping. */
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  /** Set when a save failed, so `flush` stops instead of spinning against a broken server. */
  const lastSaveFailedRef = useRef(false);

  // Ref syncing happens in an effect, never during render.
  useEffect(() => {
    snapshotRef.current = snapshot;
    saveRef.current = save;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (savedBadgeTimerRef.current !== null) window.clearTimeout(savedBadgeTimerRef.current);
    };
  }, []);

  const runSave = useCallback(async (): Promise<void> => {
    // Join an in-flight save rather than returning immediately: `flush` needs a promise that
    // actually settles when the server has responded, not one that resolves while a request is
    // still open (which is how a Back navigation could leave the newest edit unsaved).
    if (inFlightPromiseRef.current) return inFlightPromiseRef.current;
    if (!enabledRef.current) return;
    const revision = revisionRef.current;
    if (revision === savedRevisionRef.current) return;

    const attempt = (async () => {
    inFlightRef.current = true;
    setHasUnsavedChanges(true);
    setStatus('saving');
    const pendingSnapshot = snapshotRef.current;

    const result = await saveRef.current(pendingSnapshot, revision);
    inFlightRef.current = false;
    if (!isMountedRef.current) return;

    if (!result.ok) {
      // Keep the document dirty: the user's content is still only in the browser.
      lastSaveFailedRef.current = true;
      setStatus('error');
      setErrorMessage(result.message ?? 'The note could not be saved.');
      return;
    }
    lastSaveFailedRef.current = false;

    // Only ever moves forward. If the user typed while this request was in flight, revisionRef is
    // already higher and the document correctly stays dirty for the follow-up save.
    savedRevisionRef.current = Math.max(savedRevisionRef.current, revision);
    setErrorMessage(undefined);
    setHasUnsavedChanges(revisionRef.current > savedRevisionRef.current);

    if (revisionRef.current > savedRevisionRef.current) {
      // More was typed while this request was in flight: stay dirty and let the queued-save
      // effect below start the follow-up, rather than recursing here.
      setStatus('dirty');
      setQueuedSaveToken((token) => token + 1);
      return;
    }

    setStatus('saved');
    if (savedBadgeTimerRef.current !== null) window.clearTimeout(savedBadgeTimerRef.current);
    savedBadgeTimerRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      // Only fade the badge if nothing new happened meanwhile.
      setStatus((current) => (current === 'saved' ? 'idle' : current));
    }, SAVED_BADGE_MS);
    })();

    inFlightPromiseRef.current = attempt.finally(() => {
      inFlightPromiseRef.current = null;
    });
    return inFlightPromiseRef.current;
  }, []);

  // A changed snapshot identity is an edit - unless it arrived with a new `baselineKey`, which
  // means the document was just loaded or reloaded and this snapshot *is* the clean state.
  useEffect(() => {
    if (!enabled) {
      previousSnapshotRef.current = snapshot;
      return;
    }
    if (baselineKeyRef.current !== baselineKey) {
      baselineKeyRef.current = baselineKey;
      previousSnapshotRef.current = snapshot;
      savedRevisionRef.current = revisionRef.current;
      lastSaveFailedRef.current = false;
      setHasUnsavedChanges(false);
      setStatus('idle');
      setErrorMessage(undefined);
      return;
    }
    if (previousSnapshotRef.current === snapshot) return;
    previousSnapshotRef.current = snapshot;

    revisionRef.current += 1;
    setHasUnsavedChanges(true);
    setStatus((current) => (current === 'error' ? 'error' : 'dirty'));

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void runSave();
    }, debounceMs);
  }, [baselineKey, debounceMs, enabled, runSave, snapshot]);

  /**
   * Saves right now and **waits until the server has the revision that was current when flush was
   * called** - joining any in-flight request first, then draining follow-up work queued behind it.
   *
   * Returns false if a save failed, so a caller navigating away can stay put and leave the
   * persistent error on screen rather than discarding the user's newest edit.
   */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const target = revisionRef.current;
    // Bounded: each pass either confirms a revision or fails, so this cannot spin.
    for (let pass = 0; pass < MAX_FLUSH_PASSES; pass += 1) {
      if (savedRevisionRef.current >= target) return true;
      lastSaveFailedRef.current = false;
      await runSave();
      if (lastSaveFailedRef.current) return false;
    }
    return savedRevisionRef.current >= target;
  }, [runSave]);

  const retry = useCallback(async () => {
    setStatus('dirty');
    setErrorMessage(undefined);
    await flush();
  }, [flush]);

  // Drains a save that was queued because the user kept typing through the previous one.
  useEffect(() => {
    if (queuedSaveToken === 0) return;
    void runSave();
  }, [queuedSaveToken, runSave]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (revisionRef.current === savedRevisionRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  /** Marks the current snapshot as the clean baseline - used after load and after an explicit save. */
  const markClean = useCallback(() => {
    savedRevisionRef.current = revisionRef.current;
    setHasUnsavedChanges(false);
    setStatus('idle');
    setErrorMessage(undefined);
  }, []);

  return { status, errorMessage, flush, retry, markClean, hasUnsavedChanges };
}
