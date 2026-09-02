import { type RefObject } from 'react';
import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, PageHeader, cn } from '../ui';
import { Camera, ChevronDown, FileText, Plus, RefreshCw } from '../ui/icons';

interface NotesWorkspaceHeaderProps {
  canCaptureAreaNote: boolean;
  isBusy: boolean;
  isUploadPending: boolean;
  isCapturePending: boolean;
  isCreatingScreenshotNote: boolean;
  isReloading: boolean;
  onCaptureAreaNote: () => void;
  onNewNote: () => void;
  onNewFromTemplate: () => void;
  onReload: () => void;
  newNoteButtonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Capture is a cluster, not a lone button (issue #299): "New note" stays the one primary action,
 * and the ways of capturing that used to be buried - a template, a screen-area grab - sit one
 * click away in an adjacent menu instead of inside an "Advanced" tab of the editor.
 */
export function NotesWorkspaceHeader({
  canCaptureAreaNote,
  isBusy,
  isUploadPending,
  isCapturePending,
  isCreatingScreenshotNote,
  isReloading,
  onCaptureAreaNote,
  onNewNote,
  onNewFromTemplate,
  onReload,
  newNoteButtonRef,
}: NotesWorkspaceHeaderProps) {
  return (
    <PageHeader
      title="Notes"
      description="Your working knowledge library — capture what you learn, find it later, and turn it into work."
      className="mb-0"
      actions={
        <>
          <Button
            variant="ghost"
            iconOnly
            onClick={onReload}
            disabled={isReloading}
            aria-label={isReloading ? 'Reloading notes' : 'Reload notes'}
            title="Reload"
          >
            <RefreshCw className={cn('h-4 w-4', isReloading && 'animate-spin')} aria-hidden />
          </Button>

          <Menu>
            <MenuTrigger asChild>
              <Button disabled={isBusy}>
                Capture
                <ChevronDown className="h-4 w-4" aria-hidden />
              </Button>
            </MenuTrigger>
            <MenuContent aria-label="Capture options">
              <MenuLabel>Capture into your library</MenuLabel>
              <MenuItem onSelect={onNewFromTemplate}>
                <FileText className="h-4 w-4" aria-hidden />
                New from template
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                onSelect={onCaptureAreaNote}
                disabled={!canCaptureAreaNote || isBusy || isUploadPending || isCapturePending}
              >
                <Camera className="h-4 w-4" aria-hidden />
                {isCreatingScreenshotNote ? 'Capturing screen area…' : 'Capture screen area'}
              </MenuItem>
              {!canCaptureAreaNote ? (
                <MenuLabel>Screen capture needs a linked task — open Notes from a task, or pick one in the editor.</MenuLabel>
              ) : null}
            </MenuContent>
          </Menu>

          <Button variant="primary" ref={newNoteButtonRef} onClick={onNewNote} disabled={isBusy}>
            <Plus className="h-4 w-4" aria-hidden />
            New note
          </Button>
        </>
      }
    />
  );
}
