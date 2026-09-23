'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from './icons';

interface LightboxImage {
  url: string;
  caption?: string | undefined;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

/**
 * Full-screen image viewer with real interactive zoom — scroll/pinch zooms
 * toward wherever the cursor or pinch midpoint actually is, not a fixed
 * scale-to-center. Drag to pan once zoomed. No image-processing library:
 * this is CSS transform + pointer/wheel events, so it doesn't add a new
 * dependency to the app.
 *
 * Math note (see zoomToward): keeping the point under the cursor fixed on
 * screen while `scale` changes means the pan offset has to move by
 * `point - newScale/oldScale * (point - oldOffset)`, not just by whatever
 * the wheel/pinch delta was — that's what makes this "zoom toward the
 * cursor" instead of "zoom toward the image center".
 */
export function ImageLightbox({ images, startIndex, onClose }: ImageLightboxProps): React.ReactElement {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const pinchState = useRef<{ startDist: number; startScale: number } | null>(null);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());

  function resetView(): void {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function go(delta: number): void {
    resetView();
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  // point: cursor/pinch-midpoint position relative to the container's
  // center, in screen pixels. Keeps that exact point visually fixed while
  // scale changes to nextScale — see the class comment above for the math.
  function zoomToward(point: { x: number; y: number }, nextScale: number): void {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    setOffset((prev) => ({
      x: point.x - (clamped / scale) * (point.x - prev.x),
      y: point.y - (clamped / scale) * (point.y - prev.y),
    }));
    setScale(clamped);
    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }

  function pointFromEvent(clientX: number, clientY: number): { x: number; y: number } {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && images.length > 1) go(-1);
      else if (e.key === 'ArrowRight' && images.length > 1) go(1);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  return (
    <div data-lightbox role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div data-lightbox-backdrop onClick={onClose} />

      <button type="button" data-lightbox-close onClick={onClose} aria-label="Close">
        <X aria-hidden="true" />
      </button>

      {images.length > 1 && (
        <>
          <button type="button" data-lightbox-nav="prev" onClick={() => go(-1)} aria-label="Previous photo">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" data-lightbox-nav="next" onClick={() => go(1)} aria-label="Next photo">
            <ChevronRight aria-hidden="true" />
          </button>
        </>
      )}

      <div
        ref={containerRef}
        data-lightbox-viewport
        onWheel={(e) => {
          e.preventDefault();
          zoomToward(pointFromEvent(e.clientX, e.clientY), scale * (1 - e.deltaY * 0.0015));
        }}
        onDoubleClick={(e) => {
          zoomToward(pointFromEvent(e.clientX, e.clientY), scale > 1 ? 1 : 2.5);
        }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointers.current.size === 2) {
            const [a, b] = [...activePointers.current.values()];
            if (!a || !b) return;
            pinchState.current = { startDist: Math.hypot(a.x - b.x, a.y - b.y), startScale: scale };
            dragState.current = null;
          } else if (scale > 1) {
            dragState.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
          }
        }}
        onPointerMove={(e) => {
          if (!activePointers.current.has(e.pointerId)) return;
          activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (activePointers.current.size === 2 && pinchState.current) {
            const [a, b] = [...activePointers.current.values()];
            if (!a || !b) return;
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const mid = pointFromEvent((a.x + b.x) / 2, (a.y + b.y) / 2);
            zoomToward(mid, pinchState.current.startScale * (dist / pinchState.current.startDist));
          } else if (dragState.current) {
            setOffset({
              x: dragState.current.offsetX + (e.clientX - dragState.current.x),
              y: dragState.current.offsetY + (e.clientY - dragState.current.y),
            });
          }
        }}
        onPointerUp={(e) => {
          activePointers.current.delete(e.pointerId);
          if (activePointers.current.size < 2) pinchState.current = null;
          if (activePointers.current.size === 0) dragState.current = null;
        }}
        onPointerCancel={(e) => {
          activePointers.current.delete(e.pointerId);
          pinchState.current = null;
          dragState.current = null;
        }}
      >
        <img
          key={images[index]?.url}
          src={images[index]?.url}
          alt={images[index]?.caption || `Photo ${index + 1} of ${images.length}`}
          data-lightbox-image
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: scale > 1 ? 'grab' : 'default',
          }}
        />
      </div>

      <div data-lightbox-toolbar>
        <button type="button" data-btn-ghost data-btn-sm onClick={() => zoomToward({ x: 0, y: 0 }, scale - 0.5)} aria-label="Zoom out">
          <ZoomOut size={16} aria-hidden="true" />
        </button>
        <span data-lightbox-zoom-level>{Math.round(scale * 100)}%</span>
        <button type="button" data-btn-ghost data-btn-sm onClick={() => zoomToward({ x: 0, y: 0 }, scale + 0.5)} aria-label="Zoom in">
          <ZoomIn size={16} aria-hidden="true" />
        </button>
        {images.length > 1 && (
          <span data-lightbox-count>{index + 1} / {images.length}</span>
        )}
      </div>
    </div>
  );
}
