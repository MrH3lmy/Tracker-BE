import type { RefObject, PointerEvent } from "react";
import type { CropOverlayState, CropSelection } from "./notesPageHelpers";
import { Button } from "../ui";

interface ScreenshotCropOverlayProps {
  cropOverlay: CropOverlayState | null;
  cropImageRef: RefObject<HTMLImageElement | null>;
  getNormalizedSelection: (selection: CropSelection | null) => { left: number; top: number; width: number; height: number } | null;
  cancelCropOverlay: () => void;
  confirmCropOverlay: () => Promise<void>;
  handleCropPointerDown: (event: PointerEvent<HTMLImageElement>) => void;
  handleCropPointerMove: (event: PointerEvent<HTMLImageElement>) => void;
  handleCropPointerUp: (event: PointerEvent<HTMLImageElement>) => void;
}

export function ScreenshotCropOverlay({ cropOverlay, cropImageRef, getNormalizedSelection, cancelCropOverlay, confirmCropOverlay, handleCropPointerDown, handleCropPointerMove, handleCropPointerUp }: ScreenshotCropOverlayProps) {
  if (!cropOverlay) return null;
  const selection = getNormalizedSelection(cropOverlay.selection);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-overlay-title"
      className="fixed inset-0 z-(--z-toast) flex flex-col items-center justify-center gap-3 bg-scrim p-4"
    >
      <div className="flex max-w-[min(96vw,72rem)] flex-col gap-3 rounded-xl border border-line bg-card p-5 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="crop-overlay-title" className="text-base font-semibold text-fg">Capture area screenshot</h3>
            <p className="mt-0.5 text-sm text-fg-muted" role="status">Drag over the preview to select the area to upload. Press Escape or Cancel to stop.</p>
          </div>
          <div className="flex gap-1.5">
            <Button onClick={() => cancelCropOverlay()}>Cancel</Button>
            <Button variant="primary" onClick={() => void confirmCropOverlay()} disabled={!selection}>Confirm crop</Button>
          </div>
        </div>
        {/*
          Geometry note: the wrapper below and the <img> itself keep their
          exact inline styles (position/display/lineHeight/dimensions) and no
          padding/margin/border was added between them. Crop math in the
          parent reads cropImageRef.current.getBoundingClientRect() directly
          off this <img>, so only decorative styling (colors) was touched.
        */}
        <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", lineHeight: 0, cursor: "crosshair" }}>
          <img
            ref={cropImageRef}
            src={cropOverlay.imageSrc}
            alt="Captured screen preview for area selection"
            draggable={false}
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            className="rounded-md"
            style={{ display: "block", maxWidth: "min(92vw, 70rem)", maxHeight: "70vh", width: "auto", height: "auto", userSelect: "none" }}
          />
          {selection ? (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${(selection.left / cropOverlay.width) * 100}%`,
                top: `${(selection.top / cropOverlay.height) * 100}%`,
                width: `${(selection.width / cropOverlay.width) * 100}%`,
                height: `${(selection.height / cropOverlay.height) * 100}%`,
                border: "2px solid var(--app-brand)",
                background: "color-mix(in srgb, var(--app-brand) 20%, transparent)",
                boxShadow: "0 0 0 9999px var(--app-scrim)",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
