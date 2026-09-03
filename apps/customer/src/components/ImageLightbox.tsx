'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icons } from '@stayos/ui';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number | undefined;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * Full-screen image viewer with real interactive zoom — scroll/pinch/buttons
 * zoom around the cursor (or midpoint of two touches), and dragging pans
 * around the zoomed image, rather than the old "always zoomed to centre"
 * behaviour. Panning is clamped so the image can't be dragged out of view.
 */
export function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps): React.ReactElement {
  const [index, setIndex]         = useState(initialIndex);
  const [scale, setScale]         = useState(1);
  const [offset, setOffset]       = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const stageRef  = useRef<HTMLDivElement>(null);
  const panState  = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pinchState = useRef<{ startDist: number; startScale: number } | null>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => { resetView(); }, [index, resetView]);

  const clampOffset = useCallback((next: { x: number; y: number }, nextScale: number) => {
    const stage = stageRef.current;
    if (!stage) return next;
    // Maximum pan distance grows with how far past 1x we've zoomed.
    const maxX = (stage.clientWidth * (nextScale - 1)) / 2;
    const maxY = (stage.clientHeight * (nextScale - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  function zoomBy(delta: number, center?: { x: number; y: number }): void {
    setScale((prevScale) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale + delta));
      if (nextScale === prevScale) return prevScale;
      setOffset((prevOffset) => {
        if (nextScale === MIN_SCALE) return { x: 0, y: 0 };
        if (!center || !stageRef.current) return clampOffset(prevOffset, nextScale);
        // Keep the point under the cursor/pinch-midpoint stationary while zooming.
        const rect = stageRef.current.getBoundingClientRect();
        const cx = center.x - rect.left - rect.width / 2;
        const cy = center.y - rect.top - rect.height / 2;
        const ratio = nextScale / prevScale;
        const next = {
          x: cx - (cx - prevOffset.x) * ratio,
          y: cy - (cy - prevOffset.y) * ratio,
        };
        return clampOffset(next, nextScale);
      });
      return nextScale;
    });
  }

  function handleWheel(e: React.WheelEvent): void {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.25 : -0.25, { x: e.clientX, y: e.clientY });
  }

  function handleDoubleClick(e: React.MouseEvent): void {
    if (scale > MIN_SCALE) {
      resetView();
    } else {
      zoomBy(1.5, { x: e.clientX, y: e.clientY });
    }
  }

  function handlePointerDown(e: React.PointerEvent): void {
    if (scale <= MIN_SCALE) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsPanning(true);
    panState.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent): void {
    if (!panState.current) return;
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;
    setOffset(clampOffset({ x: panState.current.originX + dx, y: panState.current.originY + dy }, scale));
  }

  function endPan(): void {
    panState.current = null;
    setIsPanning(false);
  }

  function touchDistance(touches: React.TouchList): number {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(e: React.TouchEvent): void {
    if (e.touches.length === 2) {
      pinchState.current = { startDist: touchDistance(e.touches), startScale: scale };
    }
  }

  function handleTouchMove(e: React.TouchEvent): void {
    if (e.touches.length === 2 && pinchState.current) {
      e.preventDefault();
      const dist  = touchDistance(e.touches);
      const ratio = dist / pinchState.current.startDist;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchState.current.startScale * ratio));
      setScale(nextScale);
      setOffset((prev) => clampOffset(prev, nextScale));
    }
  }

  function handleTouchEnd(e: React.TouchEvent): void {
    if (e.touches.length < 2) pinchState.current = null;
  }

  function goTo(delta: number): void {
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goTo(1);
      if (e.key === 'ArrowLeft') goTo(-1);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // `goTo` intentionally omitted from deps — it only reads `images.length`
    // (already a dep) and calling it doesn't need to resubscribe the
    // listener on every index change. Not suppressed via eslint-disable
    // because this project's ESLint config doesn't have the react-hooks
    // plugin registered, and a disable-comment for an unregistered rule
    // is itself a lint error ("Definition for rule ... was not found").
  }, [onClose, images.length]);

  const current = images[index] ?? '';

  return (
    <div data-lightbox-overlay role="dialog" aria-modal="true" aria-label="Image viewer">
      <div data-lightbox-toolbar>
        <span data-lightbox-counter>{index + 1} / {images.length}</span>
        <div data-lightbox-toolbar-group>
          <button type="button" data-lightbox-btn aria-label="Zoom out" onClick={() => zoomBy(-0.5)} disabled={scale <= MIN_SCALE}>
            <Icons.Minus size={16} />
          </button>
          <button type="button" data-lightbox-btn aria-label="Zoom in" onClick={() => zoomBy(0.5)} disabled={scale >= MAX_SCALE}>
            <Icons.Plus size={16} />
          </button>
          <button type="button" data-lightbox-btn aria-label="Reset zoom" onClick={resetView} disabled={scale === MIN_SCALE}>
            <Icons.RefreshCcw size={16} />
          </button>
          <button type="button" data-lightbox-btn aria-label="Close" onClick={onClose}>
            <Icons.X size={18} />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        data-lightbox-stage
        data-panning={isPanning ? '' : undefined}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images.length > 1 && (
          <button type="button" data-lightbox-btn aria-label="Previous image"
            style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
            onClick={(e) => { e.stopPropagation(); goTo(-1); }}>
            <Icons.ChevronLeft size={18} />
          </button>
        )}
        <img
          src={current}
          alt={`Photo ${index + 1} of ${images.length}`}
          draggable={false}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transition: panState.current ? 'none' : 'transform 100ms ease' }}
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        {images.length > 1 && (
          <button type="button" data-lightbox-btn aria-label="Next image"
            style={{ position: 'absolute', right: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
            onClick={(e) => { e.stopPropagation(); goTo(1); }}>
            <Icons.ChevronRight size={18} />
          </button>
        )}
      </div>

      <p data-lightbox-hint>Scroll or pinch to zoom · drag to pan · double-click to reset</p>

      {images.length > 1 && (
        <div data-lightbox-thumbs>
          {images.map((src, i) => (
            <button key={src + i} type="button" data-lightbox-thumb data-active={i === index ? '' : undefined}
              onClick={() => setIndex(i)} aria-label={`Go to photo ${i + 1}`}>
              <img src={src} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
