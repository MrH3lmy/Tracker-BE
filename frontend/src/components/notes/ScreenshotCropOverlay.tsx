import type { RefObject, PointerEvent } from "react";
import type { CropOverlayState, CropSelection } from "./notesPageHelpers";

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
    <div role="dialog" aria-modal="true" aria-labelledby="crop-overlay-title" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", background: "rgba(15, 23, 42, 0.88)" }}>
      <div className="panel" style={{ maxWidth: "min(96vw, 72rem)" }}>
        <div className="section-header" style={{ gap: "var(--space-3)" }}>
          <div><h3 id="crop-overlay-title">Capture area screenshot</h3><p className="muted" role="status">Drag over the preview to select the area to upload. Press Escape or Cancel to stop.</p></div>
          <div className="row compact-row"><button type="button" onClick={() => cancelCropOverlay()}>Cancel</button><button type="button" className="button-primary" onClick={() => void confirmCropOverlay()} disabled={!selection}>Confirm crop</button></div>
        </div>
        <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", lineHeight: 0, cursor: "crosshair" }}>
          <img ref={cropImageRef} src={cropOverlay.imageSrc} alt="Captured screen preview for area selection" draggable={false} onPointerDown={handleCropPointerDown} onPointerMove={handleCropPointerMove} onPointerUp={handleCropPointerUp} style={{ display: "block", maxWidth: "min(92vw, 70rem)", maxHeight: "70vh", width: "auto", height: "auto", userSelect: "none", borderRadius: "var(--radius-md)" }} />
          {selection ? <div aria-hidden="true" style={{ position: "absolute", left: `${(selection.left / cropOverlay.width) * 100}%`, top: `${(selection.top / cropOverlay.height) * 100}%`, width: `${(selection.width / cropOverlay.width) * 100}%`, height: `${(selection.height / cropOverlay.height) * 100}%`, border: "2px solid #38bdf8", background: "rgba(56, 189, 248, 0.2)", boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45)", pointerEvents: "none" }} /> : null}
        </div>
      </div>
    </div>
  );
}
