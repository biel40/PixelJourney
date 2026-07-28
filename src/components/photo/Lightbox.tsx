import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedEvent } from 'preact';
import type { LightboxSource } from '../../types/photo';

const MORPH_NAME = 'photo-morph';
const MORPH_FLAG = 'data-photo-morph';
const SWIPE_COMMIT_RATIO = 0.22;
const DISMISS_DISTANCE = 130;
const AXIS_LOCK_DISTANCE = 10;
const EDGE_RESISTANCE = 0.35;

type ViewTransition = { finished: Promise<void>; ready: Promise<void> };
type TransitionCapableDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
};

type Axis = 'x' | 'y' | null;

interface OpenDetail {
  id: string;
  ids: string[];
}

interface Props {
  sources: LightboxSource[];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function findThumbnail(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-photo-id="${CSS.escape(id)}"] img`,
  );
}

function afterRender(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function runWithMorph(mutate: () => void): Promise<void> {
  const doc = document as TransitionCapableDocument;

  if (!doc.startViewTransition || prefersReducedMotion()) {
    mutate();
    return;
  }

  document.documentElement.setAttribute(MORPH_FLAG, '');
  const transition = doc.startViewTransition(async () => {
    mutate();
    await afterRender();
  });

  await transition.finished.catch(() => undefined);
  document.documentElement.removeAttribute(MORPH_FLAG);
}

export default function Lightbox({ sources }: Props) {
  const byId = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const gesture = useRef<{ startX: number; startY: number; active: boolean; axis: Axis }>({
    startX: 0,
    startY: 0,
    active: false,
    axis: null,
  });

  const active = useMemo(
    () =>
      order
        .map((id) => byId.get(id))
        .filter((source): source is LightboxSource => Boolean(source)),
    [order, byId],
  );

  const isOpen = index >= 0 && index < active.length;
  const current = isOpen ? active[index] : null;

  const open = useCallback(
    async (detail: OpenDetail) => {
      const ids = detail.ids.filter((id) => byId.has(id));
      const target = ids.indexOf(detail.id);
      if (target < 0) return;

      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      const thumbnail = findThumbnail(detail.id);
      if (thumbnail) thumbnail.style.viewTransitionName = MORPH_NAME;

      await runWithMorph(() => {
        if (thumbnail) thumbnail.style.viewTransitionName = '';
        setOrder(ids);
        setIndex(target);
        setOffsetX(0);
        setOffsetY(0);
      });
    },
    [byId],
  );

  const close = useCallback(async () => {
    if (!current) return;

    const thumbnail = findThumbnail(current.id);
    thumbnail?.scrollIntoView({ block: 'center' });

    await runWithMorph(() => {
      if (thumbnail) thumbnail.style.viewTransitionName = MORPH_NAME;
      setIndex(-1);
      setOffsetX(0);
      setOffsetY(0);
    });

    if (thumbnail) thumbnail.style.viewTransitionName = '';
    triggerRef.current?.focus();
  }, [current]);

  const step = useCallback(
    (direction: 1 | -1): boolean => {
      const next = index + direction;
      if (next < 0 || next >= active.length) return false;

      setIndex(next);
      setOffsetX((previous) => previous + direction * viewportWidth);
      setOffsetY(0);
      setIsSnapping(true);
      return true;
    },
    [index, active.length, viewportWidth],
  );

  useEffect(() => {
    if (!isSnapping) return;

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setIsSnapping(false);
        setOffsetX(0);
      }),
    );

    return () => cancelAnimationFrame(frame);
  }, [isSnapping]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OpenDetail>).detail;
      if (detail) void open(detail);
    };

    window.addEventListener('lightbox:open', handler);
    return () => window.removeEventListener('lightbox:open', handler);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const element = viewportRef.current;
    if (!element) return;

    setViewportWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) =>
      setViewportWidth(entry.contentRect.width),
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void close();
        return;
      }
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close, step]);

  useEffect(() => {
    if (!isOpen) return;

    for (const neighbour of [active[index - 1], active[index + 1]]) {
      if (!neighbour) continue;
      const preloaded = new Image();
      preloaded.src = neighbour.src;
    }
  }, [isOpen, index, active]);

  const resistedX = (delta: number): number => {
    const atStart = index === 0 && delta > 0;
    const atEnd = index === active.length - 1 && delta < 0;
    return atStart || atEnd ? delta * EDGE_RESISTANCE : delta;
  };

  const onPointerDown = (event: TargetedEvent<HTMLDivElement, PointerEvent>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      startX: event.clientX,
      startY: event.clientY,
      active: true,
      axis: null,
    };
    setIsDragging(true);
    setIsSnapping(false);
  };

  const onPointerMove = (event: TargetedEvent<HTMLDivElement, PointerEvent>) => {
    if (!gesture.current.active) return;

    const deltaX = event.clientX - gesture.current.startX;
    const deltaY = event.clientY - gesture.current.startY;

    if (!gesture.current.axis && Math.hypot(deltaX, deltaY) > AXIS_LOCK_DISTANCE) {
      gesture.current.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    }

    if (gesture.current.axis === 'x') {
      setOffsetX(resistedX(deltaX));
      setOffsetY(0);
    }

    if (gesture.current.axis === 'y') {
      setOffsetY(Math.max(deltaY, 0));
      setOffsetX(0);
    }
  };

  const onPointerUp = () => {
    if (!gesture.current.active) return;

    const { axis } = gesture.current;
    gesture.current.active = false;
    setIsDragging(false);

    if (axis === 'y' && offsetY > DISMISS_DISTANCE) {
      void close();
      return;
    }

    const threshold = viewportWidth * SWIPE_COMMIT_RATIO;
    const direction: 1 | -1 | 0 =
      offsetX <= -threshold ? 1 : offsetX >= threshold ? -1 : 0;

    if (axis === 'x' && direction !== 0 && step(direction)) return;

    setOffsetX(0);
    setOffsetY(0);
  };

  if (!isOpen || !current) return null;

  const slides = [active[index - 1] ?? null, current, active[index + 1] ?? null];
  const chromeOpacity = Math.max(0, 1 - offsetY / DISMISS_DISTANCE);
  const backdropOpacity = Math.max(0.3, 1 - offsetY / 420);
  const trackTransition =
    isDragging || isSnapping
      ? 'none'
      : 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div
      ref={rootRef}
      class="fixed inset-0 z-50 flex touch-none flex-col outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={current.alt}
      tabIndex={-1}
    >
      <div
        class="absolute inset-0 bg-neutral-950/95 backdrop-blur-md"
        style={{ opacity: backdropOpacity }}
        onClick={() => void close()}
      />

      <header
        class="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6"
        style={{ opacity: chromeOpacity }}
      >
        <p class="font-mono text-xs tracking-[0.2em] text-neutral-400 tabular-nums">
          {index + 1} / {active.length}
        </p>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-neutral-200 transition-colors hover:bg-white/15 hover:text-white"
          aria-label="Cerrar visor"
          onClick={() => void close()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </header>

      <div
        ref={viewportRef}
        class="relative z-10 flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          class="flex h-full"
          style={{
            transform: `translate3d(${offsetX - viewportWidth}px, ${offsetY}px, 0)`,
            transition: trackTransition,
          }}
        >
          {slides.map((source, slot) => (
            <div
              key={source ? source.id : `empty-${slot}`}
              class="grid h-full shrink-0 place-items-center px-3 py-2"
              style={{ width: `${viewportWidth}px` }}
            >
              {source && (
                <img
                  src={source.src}
                  alt={source.alt}
                  width={source.width}
                  height={source.height}
                  draggable={false}
                  decoding="async"
                  class="max-h-full w-auto max-w-full rounded-lg object-contain shadow-2xl select-none"
                  style={source.id === current.id ? { viewTransitionName: MORPH_NAME } : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        class="absolute top-1/2 left-4 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-neutral-200 transition-colors hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:flex"
        aria-label="Foto anterior"
        disabled={index === 0}
        onClick={() => step(-1)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        class="absolute top-1/2 right-4 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-neutral-200 transition-colors hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:flex"
        aria-label="Foto siguiente"
        disabled={index === active.length - 1}
        onClick={() => step(1)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <footer
        class="relative z-10 flex flex-col items-center gap-1 px-6 pt-3 pb-6 text-center"
        style={{ opacity: chromeOpacity }}
      >
        <p class="font-mono text-[0.7rem] tracking-[0.25em] text-neutral-400 uppercase">
          {current.albumLabel}
        </p>
        {current.dateLabel && (
          <p class="text-xs text-neutral-500">{current.dateLabel}</p>
        )}
      </footer>
    </div>
  );
}
