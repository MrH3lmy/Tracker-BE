import { useEffect, useRef, useState } from 'react';
import { useFocusActiveQuery, useFocusSessionMutations } from '../../hooks/useApiQueries';
import { Button, Card, Checkbox, Popover, PopoverContent, PopoverTrigger, Textarea } from '../ui';
import { Check, Pencil, X } from '../ui/icons';

const formatElapsed = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

export function FocusTimerWidget() {
  const activeQuery = useFocusActiveQuery();
  const { pauseSession, resumeSession, stopSession } = useFocusSessionMutations();
  const session = activeQuery.data?.data ?? null;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stopOpen, setStopOpen] = useState(false);
  const [note, setNote] = useState('');
  const [completeTask, setCompleteTask] = useState(false);
  const tickRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeding the live timer display from a freshly-fetched elapsedMinutes, not deriving render state.
    setElapsedSeconds(session.elapsedMinutes * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed only when the session identity/status/known elapsed minutes change, not every render.
  }, [session?.id, session?.status, session?.elapsedMinutes]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING') return undefined;
    tickRef.current = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the session's identity/status should restart the ticking interval.
  }, [session?.id, session?.status]);

  if (!session) return null;

  const busy = pauseSession.isPending || resumeSession.isPending || stopSession.isPending;

  const confirmStop = () => {
    stopSession.mutate({ id: session.id, body: { note: note.trim() || undefined, completeTask } }, {
      onSuccess: (result) => {
        if (result.ok) { setStopOpen(false); setNote(''); setCompleteTask(false); }
      },
    });
  };

  return (
    <Card className="fixed right-4 bottom-20 z-(--z-dropdown) flex w-72 flex-col gap-2 shadow-lg lg:bottom-4" role="status" aria-label="Active focus session">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{session.taskTitle ?? 'Focus session'}</p>
          <p className="text-xs text-fg-muted">{session.status === 'PAUSED' ? 'Paused' : 'Focusing'}</p>
        </div>
        <span className="shrink-0 font-mono text-lg font-bold text-fg tabular-nums">{formatElapsed(elapsedSeconds)}</span>
      </div>
      <div className="flex items-center gap-2">
        {session.status === 'RUNNING' ? (
          <Button size="sm" onClick={() => pauseSession.mutate(session.id)} disabled={busy} className="flex-1">Pause</Button>
        ) : (
          <Button size="sm" onClick={() => resumeSession.mutate(session.id)} disabled={busy} className="flex-1">Resume</Button>
        )}
        <Popover open={stopOpen} onOpenChange={setStopOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="danger" disabled={busy} className="flex-1">
              <X className="h-3.5 w-3.5" aria-hidden />
              Stop
            </Button>
          </PopoverTrigger>
          <PopoverContent aria-label="Stop focus session">
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted" htmlFor="focusStopNote">
                <span className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" aria-hidden />Note (optional)</span>
                <Textarea id="focusStopNote" rows={2} className="min-h-0" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} placeholder="What did you work on?" />
              </label>
              {session.taskId && (
                <Checkbox id="focusCompleteTask" label="Mark task complete" checked={completeTask} onChange={(e) => setCompleteTask(e.target.checked)} disabled={busy} />
              )}
              <Button size="sm" variant="primary" onClick={confirmStop} disabled={busy}>
                <Check className="h-3.5 w-3.5" aria-hidden />
                {stopSession.isPending ? 'Stopping...' : 'Stop session'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
}
