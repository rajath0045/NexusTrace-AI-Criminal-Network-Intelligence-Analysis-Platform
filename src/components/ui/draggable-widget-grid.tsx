"use client";

import { MotionConfig, motion, useDragControls } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export type WidgetSize = "sm" | "wide" | "tall" | "lg";

export interface WidgetItem {
  id: string;
  size: WidgetSize;
  label?: string;
}

export interface DraggableWidgetGridProps<T extends WidgetItem = WidgetItem> {
  items?: T[];
  onChange?: (items: T[]) => void;
  renderItem?: (item: T, renderedSize: WidgetSize) => ReactNode;
  editable?: boolean;
  maxColumns?: number;
  cellSize?: number;
  gap?: number;
  radius?: number;
  className?: string;
}

interface GridPosition {
  id: string;
  col: number;
  row: number;
  w: number;
  h: number;
}

interface GridSlot {
  col: number;
  row: number;
  w: number;
  h: number;
}

const widgetSpans: Record<WidgetSize, { col: number; row: number }> = {
  sm: { col: 1, row: 1 },
  wide: { col: 2, row: 1 },
  tall: { col: 1, row: 2 },
  lg: { col: 2, row: 2 },
};

const widgetSizeLabels: Record<WidgetSize, string> = {
  sm: "Small",
  wide: "Wide",
  tall: "Tall",
  lg: "Large",
};

const defaultItems: WidgetItem[] = [
  { id: "widget-1", size: "wide" },
  { id: "widget-2", size: "sm" },
  { id: "widget-3", size: "sm" },
  { id: "widget-4", size: "sm" },
  { id: "widget-5", size: "wide" },
  { id: "widget-6", size: "sm" },
  { id: "widget-7", size: "sm" },
  { id: "widget-8", size: "wide" },
  { id: "widget-9", size: "sm" },
];

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function sizeOf(width: number, height: number): WidgetSize {
  if (width >= 2 && height >= 2) return "lg";
  if (width >= 2) return "wide";
  if (height >= 2) return "tall";
  return "sm";
}

function overlaps(first: GridSlot, second: GridSlot): boolean {
  return (
    first.col < second.col + second.w &&
    second.col < first.col + first.w &&
    first.row < second.row + second.h &&
    second.row < first.row + first.h
  );
}

function contains(outer: GridSlot, inner: GridSlot): boolean {
  return (
    inner.col >= outer.col &&
    inner.row >= outer.row &&
    inner.col + inner.w <= outer.col + outer.w &&
    inner.row + inner.h <= outer.row + outer.h
  );
}

function spanOf(item: WidgetItem, columns: number) {
  return {
    w: Math.min(widgetSpans[item.size].col, columns),
    h: widgetSpans[item.size].row,
  };
}

function layout<T extends WidgetItem>(items: T[], columns: number): GridPosition[] {
  if (columns < 1 || items.length === 0) return [];
  return tile(items, columns) ?? pack(items, columns);
}

const tileSearchLimit = 20_000;

function tile<T extends WidgetItem>(
  items: T[],
  columns: number,
): GridPosition[] | null {
  const spans = items.map((item) => spanOf(item, columns));
  const area = spans.reduce((total, span) => total + span.w * span.h, 0);
  const rows = Math.ceil(area / columns);
  const occupied = new Array<boolean>(rows * columns).fill(false);
  const used = new Array<boolean>(items.length).fill(false);
  const positions: GridPosition[] = [];
  let remainingSearches = tileSearchLimit;

  const fits = (width: number, height: number, row: number, col: number) => {
    if (col + width > columns || row + height > rows) return false;
    for (let y = row; y < row + height; y += 1) {
      for (let x = col; x < col + width; x += 1) {
        if (occupied[y * columns + x]) return false;
      }
    }
    return true;
  };

  const mark = (
    width: number,
    height: number,
    row: number,
    col: number,
    value: boolean,
  ) => {
    for (let y = row; y < row + height; y += 1) {
      for (let x = col; x < col + width; x += 1) {
        occupied[y * columns + x] = value;
      }
    }
  };

  const place = (placed: number): boolean => {
    if (placed === items.length) return true;
    remainingSearches -= 1;
    if (remainingSearches < 0) return false;

    const firstEmpty = occupied.indexOf(false);
    if (firstEmpty < 0) return false;
    const row = Math.floor(firstEmpty / columns);
    const col = firstEmpty % columns;
    const triedSpans = new Set<string>();

    for (let index = 0; index < items.length; index += 1) {
      if (used[index]) continue;
      const { w, h } = spans[index];
      const key = `${w}x${h}`;
      if (triedSpans.has(key) || !fits(w, h, row, col)) continue;

      triedSpans.add(key);
      used[index] = true;
      mark(w, h, row, col, true);
      positions.push({ id: items[index].id, col, row, w, h });
      if (place(placed + 1)) return true;
      positions.pop();
      mark(w, h, row, col, false);
      used[index] = false;
    }

    return false;
  };

  return place(0) ? positions : null;
}

function pack<T extends WidgetItem>(items: T[], columns: number): GridPosition[] {
  const positions: GridPosition[] = [];
  let rowOffset = 0;
  let remaining = items.map((item) => ({ id: item.id, ...spanOf(item, columns) }));

  while (remaining.length > 0) {
    const rowCount = Math.max(...remaining.slice(0, columns).map((item) => item.h));
    const occupied = new Array<boolean>(rowCount * columns).fill(false);
    const placed: GridPosition[] = [];
    const deferred: typeof remaining = [];

    for (const item of remaining) {
      let slot = -1;
      for (let index = 0; index < occupied.length && slot < 0; index += 1) {
        const row = Math.floor(index / columns);
        const col = index % columns;
        if (col + item.w > columns || row + item.h > rowCount) continue;

        let fits = true;
        for (let y = row; y < row + item.h && fits; y += 1) {
          for (let x = col; x < col + item.w && fits; x += 1) {
            if (occupied[y * columns + x]) fits = false;
          }
        }
        if (fits) slot = index;
      }

      if (slot < 0 || deferred.length > 0) {
        deferred.push(item);
        continue;
      }

      const row = Math.floor(slot / columns);
      const col = slot % columns;
      for (let y = row; y < row + item.h; y += 1) {
        for (let x = col; x < col + item.w; x += 1) {
          occupied[y * columns + x] = true;
        }
      }
      placed.push({ id: item.id, col, row, w: item.w, h: item.h });
    }

    for (let index = 0; index < occupied.length; index += 1) {
      if (occupied[index]) continue;
      const row = Math.floor(index / columns);
      const col = index % columns;
      const horizontal = placed.find(
        (item) =>
          item.col + item.w === col &&
          item.row <= row &&
          item.row + item.h > row &&
          item.h === 1,
      );
      const vertical = placed.find(
        (item) =>
          item.row + item.h === row &&
          item.col === col &&
          item.w === 1,
      );
      const expandable = horizontal ?? vertical;
      if (expandable) {
        if (expandable === horizontal) expandable.w += 1;
        else expandable.h += 1;
        occupied[index] = true;
      }
    }

    positions.push(
      ...placed.map((item) => ({ ...item, row: item.row + rowOffset })),
    );
    rowOffset += rowCount;
    remaining = deferred;
  }

  return positions;
}

function canonical<T extends WidgetItem>(items: T[], columns: number): T[] {
  const currentLayout = layout(items, columns);
  if (currentLayout.length !== items.length) return items;

  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = [...currentLayout]
    .sort((first, second) => first.row - second.row || first.col - second.col)
    .map((position) => byId.get(position.id) as T);

  if (ordered.every((item, index) => item === items[index])) return items;

  const currentById = new Map(currentLayout.map((position) => [position.id, position]));
  const isSameLayout = layout(ordered, columns).every((position) => {
    const current = currentById.get(position.id);
    return (
      current &&
      current.col === position.col &&
      current.row === position.row &&
      current.w === position.w &&
      current.h === position.h
    );
  });

  return isSameLayout ? ordered : items;
}

function moveTo<T>(items: T[], fromIndex: number, toIndex: number): T[];
function moveTo<T extends WidgetItem>(items: T[], id: string, toIndex: number): T[];
function moveTo<T extends WidgetItem>(
  items: T[],
  idOrIndex: string | number,
  toIndex: number,
): T[] {
  const fromIndex =
    typeof idOrIndex === "number"
      ? idOrIndex
      : items.findIndex((item) => item.id === idOrIndex);
  if (
    fromIndex < 0 ||
    fromIndex === toIndex ||
    toIndex < 0 ||
    toIndex >= items.length
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function sameOrder<T extends WidgetItem>(first: T[], second: T[]): boolean {
  return (
    first.length === second.length &&
    first.every((item, index) => item.id === second[index].id)
  );
}

const insetRatio = 0.18;

function choose(
  original: GridSlot,
  candidates: Array<{ order: WidgetItem[]; slot: GridSlot }>,
  pointerX: number,
  pointerY: number,
): WidgetItem[] | null {
  const distance = (slot: GridSlot & DOMRect, inset: number) => {
    const xInset = (slot.right - slot.left) * inset;
    const yInset = (slot.bottom - slot.top) * inset;
    const x = Math.max(slot.left + xInset - pointerX, 0, pointerX - (slot.right - xInset));
    const y = Math.max(slot.top + yInset - pointerY, 0, pointerY - (slot.bottom - yInset));
    return Math.hypot(x, y);
  };

  const toCentre = (slot: GridSlot & DOMRect) =>
    Math.hypot(
      (slot.left + slot.right) / 2 - pointerX,
      (slot.top + slot.bottom) / 2 - pointerY,
    );

  let bestDistance = distance(original as GridSlot & DOMRect, 0);
  if (bestDistance === 0) return null;

  let best: WidgetItem[] | null = null;
  let bestCentre = Number.POSITIVE_INFINITY;
  for (const { order, slot } of candidates) {
    const candidateDistance = distance(slot as GridSlot & DOMRect, insetRatio);
    const candidateCentre = toCentre(slot as GridSlot & DOMRect);
    if (
      candidateDistance < bestDistance ||
      (candidateDistance === bestDistance && best && candidateCentre < bestCentre)
    ) {
      bestDistance = candidateDistance;
      bestCentre = candidateCentre;
      best = order;
    }
  }

  return best;
}

function candidatesFor<T extends WidgetItem>(
  items: T[],
  id: string,
  columns: number,
  toRect: (slot: GridSlot) => GridSlot & DOMRect,
): Array<{ order: T[]; slot: GridSlot & DOMRect }> {
  const currentLayout = layout(items, columns);
  const source = currentLayout.find((position) => position.id === id);
  if (!source) return [];

  const byId = new Map(items.map((item) => [item.id, item]));
  const rows = Math.max(...currentLayout.map((position) => position.row + position.h));
  const candidates: Array<{ order: T[]; slot: GridSlot & DOMRect }> = [];

  for (let row = 0; row + source.h <= rows; row += 1) {
    for (let col = 0; col + source.w <= columns; col += 1) {
      const target = { col, row, w: source.w, h: source.h };
      if (overlaps(target, source)) continue;

      const covered = currentLayout.filter((position) => overlaps(position, target));
      if (covered.length < 2 || !covered.every((position) => contains(target, position))) {
        continue;
      }

      const swapped = currentLayout.map((position) => {
        if (position.id === id) return { ...position, col, row };
        if (covered.includes(position)) {
          return {
            ...position,
            col: position.col - col + source.col,
            row: position.row - row + source.row,
          };
        }
        return position;
      });
      swapped.sort((first, second) => first.row - second.row || first.col - second.col);
      candidates.push({
        order: swapped.map((position) => byId.get(position.id) as T),
        slot: toRect(target),
      });
    }
  }

  const sourceIndex = items.findIndex((item) => item.id === id);
  for (let index = 0; index < items.length; index += 1) {
    if (index === sourceIndex) continue;
    const order = moveTo(items, id, index);
    const slot = layout(order, columns).find((position) => position.id === id);
    if (slot) candidates.push({ order, slot: toRect(slot) });
  }

  return candidates;
}

const layoutTransition = {
  type: "spring",
  visualDuration: 0.38,
  bounce: 0.16,
} as const;
const dragTransition = {
  type: "spring",
  visualDuration: 0.26,
  bounce: 0.32,
} as const;
const raisedScale = 1.06;
const dragFrameMs = 40;
const landedDurationMs = 620;
const touchHoldMs = 350;
const touchMoveThreshold = 8;
const restingShadow =
  "0px 1px 2px 0px rgba(0,0,0,0.12), 0px 0px 0px 0px rgba(0,0,0,0)";
const raisedShadow =
  "0px 28px 60px -16px rgba(0,0,0,0.45), 0px 10px 24px -8px rgba(0,0,0,0.3)";

interface WidgetHandlers {
  start: (id: string) => void;
  drag: () => void;
  end: (id: string) => void;
  key: (event: KeyboardEvent<HTMLDivElement>, id: string) => void;
  swallow: () => boolean;
  suppressClick: () => void;
}

interface WidgetProps<T extends WidgetItem> {
  item: T;
  col: number;
  row: number;
  w: number;
  h: number;
  columns: number;
  rows: number;
  editable: boolean;
  held: boolean;
  raised: boolean;
  landed: boolean;
  handlers: WidgetHandlers;
  hintId: string;
  position: number;
  count: number;
  renderItem?: (item: T, renderedSize: WidgetSize) => ReactNode;
}

const Widget = memo(function Widget<T extends WidgetItem>({
  item,
  col,
  row,
  w,
  h,
  columns,
  rows,
  editable,
  held,
  raised,
  landed,
  handlers,
  hintId,
  position,
  count,
  renderItem,
}: WidgetProps<T>) {
  const dragControls = useDragControls();
  const elementRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    timer: number;
  } | null>(null);
  const draggingTouchRef = useRef(false);
  const removeEndListenersRef = useRef<(() => void) | null>(null);
  const [touchState, setTouchState] = useState<"idle" | "holding" | "lifted">(
    "idle",
  );

  const cancelTouch = useCallback(() => {
    if (holdRef.current) window.clearTimeout(holdRef.current.timer);
    holdRef.current = null;
    draggingTouchRef.current = false;
    removeEndListenersRef.current?.();
    removeEndListenersRef.current = null;
    setTouchState("idle");
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const blockTouchMove = (event: TouchEvent) => {
      if (draggingTouchRef.current) event.preventDefault();
    };
    element.addEventListener("touchmove", blockTouchMove, { passive: false });
    return () => {
      element.removeEventListener("touchmove", blockTouchMove);
      if (holdRef.current) window.clearTimeout(holdRef.current.timer);
      removeEndListenersRef.current?.();
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || event.button !== 0 || !event.isPrimary) return;
    if (event.pointerType !== "touch") {
      dragControls.start(event);
      return;
    }
    if (holdRef.current || draggingTouchRef.current) return;

    const nativeEvent = event.nativeEvent;
    const pointerId = event.pointerId;
    setTouchState("holding");
    holdRef.current = {
      pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(() => {
        holdRef.current = null;
        draggingTouchRef.current = true;
        setTouchState("lifted");
        navigator.vibrate?.(10);
        dragControls.start(nativeEvent);

        const done = (pointerEvent: PointerEvent) => {
          if (pointerEvent.pointerId === pointerId) {
            handlers.suppressClick();
            cancelTouch();
          }
        };
        window.addEventListener("pointerup", done);
        window.addEventListener("pointercancel", done);
        removeEndListenersRef.current = () => {
          window.removeEventListener("pointerup", done);
          window.removeEventListener("pointercancel", done);
        };
      }, touchHoldMs),
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const hold = holdRef.current;
    if (
      hold &&
      event.pointerId === hold.pointerId &&
      Math.hypot(event.clientX - hold.x, event.clientY - hold.y) >
        touchMoveThreshold
    ) {
      cancelTouch();
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (holdRef.current?.pointerId === event.pointerId) cancelTouch();
  };

  const delay =
    (col / Math.max(columns, 1) + row / Math.max(rows, 1)) * 0.26;

  return (
    <motion.div
      ref={elementRef}
      role="listitem"
      data-slot="widget"
      data-widget-id={item.id}
      tabIndex={editable ? 0 : undefined}
      aria-label={item.label ?? `${widgetSizeLabels[item.size]} widget`}
      aria-describedby={editable ? hintId : undefined}
      aria-posinset={position}
      aria-setsize={count}
      layout="position"
      drag={editable}
      dragListener={false}
      dragControls={dragControls}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => handlers.start(item.id)}
      onDrag={handlers.drag}
      onDragEnd={() => handlers.end(item.id)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(event) => {
        if (touchState !== "idle") event.preventDefault();
      }}
      onKeyDown={(event) => handlers.key(event, item.id)}
      onClickCapture={(event) => {
        const clickedLink =
          event.target instanceof Element && Boolean(event.target.closest("a"));
        if (handlers.swallow() || (editable && clickedLink)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      animate={{
        scale:
          touchState === "holding"
            ? 0.97
            : touchState === "lifted"
              ? raisedScale
              : 1,
        boxShadow: touchState === "lifted" ? raisedShadow : restingShadow,
      }}
      whileDrag={{
        scale: raisedScale,
        boxShadow: raisedShadow,
        transition: dragTransition,
      }}
      transition={layoutTransition}
      className={`relative min-w-0 rounded-[var(--widget-radius)] outline-none focus-visible:ring-2 focus-visible:ring-ring [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none] ${editable ? "cursor-grab touch-pan-y touch-pinch-zoom select-none [-webkit-touch-callout:none] active:cursor-grabbing" : ""}`}
      style={{
        gridColumn: `${col + 1} / span ${w}`,
        gridRow: `${row + 1} / span ${h}`,
        zIndex: held ? 20 : raised ? 10 : 0,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring",
          visualDuration: 0.6,
          bounce: 0.12,
          delay,
        }}
        className={`relative isolate flex h-full w-full flex-col overflow-hidden rounded-[var(--widget-radius)] bg-card text-card-foreground ring-inset transition-shadow duration-300 [clip-path:inset(0_round_var(--widget-radius))] ${landed ? "ring-2 ring-foreground/40" : "ring-1 ring-border"}`}
      >
        {renderItem?.(item, sizeOf(w, h))}
      </motion.div>
    </motion.div>
  );
}) as <T extends WidgetItem>(props: WidgetProps<T>) => ReactNode;

export default function DraggableWidgetGrid<T extends WidgetItem = WidgetItem>({
  items,
  onChange,
  renderItem,
  editable = true,
  maxColumns = 4,
  cellSize = 215,
  gap = 12,
  radius = 24,
  className = "",
}: DraggableWidgetGridProps<T>) {
  const [currentItems, setCurrentItems] = useState<T[]>(
    () => (items ?? defaultItems) as T[],
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const minimumColumns = Math.min(2, Math.max(1, maxColumns));
  const [metrics, setMetrics] = useState({ unit: 0, columns: 0 });

  useIsomorphicLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => {
      const width = grid.getBoundingClientRect().width;
      if (width < 1) return;
      const columns = Math.max(
        minimumColumns,
        Math.min(maxColumns, Math.round(width / cellSize)),
      );
      const unit = (width - gap * (columns - 1)) / columns;
      setMetrics((current) =>
        current.columns === columns && Math.abs(current.unit - unit) < 0.5
          ? current
          : { unit, columns },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [maxColumns, minimumColumns, cellSize, gap]);

  const columns = metrics.columns || Math.max(minimumColumns, maxColumns);
  const positions = useMemo(
    () => layout(currentItems, columns),
    [currentItems, columns],
  );
  const rows = positions.reduce(
    (maximum, position) => Math.max(maximum, position.row + position.h),
    0,
  );

  const latest = useRef({
    items: currentItems,
    metrics,
    onChange,
  });
  useIsomorphicLayoutEffect(() => {
    latest.current = { items: currentItems, metrics, onChange };
  }, [currentItems, metrics, onChange]);

  const updateItems = useCallback((next: T[]) => {
    latest.current.items = next;
    setCurrentItems(next);
  }, []);

  const toRect = useCallback(
    (slot: GridSlot): GridSlot & DOMRect => {
      const grid = gridRef.current;
      const { unit } = latest.current.metrics;
      const bounds = grid?.getBoundingClientRect();
      const columnUnit = unit + gap;
      const rowUnit = Math.round(unit) + gap;
      const left = (bounds?.left ?? 0) + slot.col * columnUnit;
      const top = (bounds?.top ?? 0) + slot.row * rowUnit;
      const right = left + slot.w * columnUnit - gap;
      const bottom = top + slot.h * rowUnit - gap;
      return {
        ...slot,
        x: left,
        y: top,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        toJSON: () => ({}),
      };
    },
    [gap],
  );

  const [heldId, setHeldId] = useState<string | null>(null);
  const [raisedId, setRaisedId] = useState<string | null>(null);
  const [landedId, setLandedId] = useState<string | null>(null);
  const draggingId = useRef<string | null>(null);
  const originalItems = useRef<T[] | null>(null);
  const frame = useRef(0);
  const lastReorderAt = useRef(0);
  const suppressClickUntil = useRef(0);
  const landedTimer = useRef(0);
  const focusAfterReorder = useRef<string | null>(null);

  const reorderFromPointer = useCallback(
    function reorderFromPointerCallback(force = false) {
      frame.current = 0;
      const id = draggingId.current;
      const { items: latestItems, metrics: latestMetrics } = latest.current;
      const element = id
        ? gridRef.current?.querySelector<HTMLDivElement>(
            `[data-widget-id="${CSS.escape(id)}"]`,
          )
        : null;
      if (!id || !element || !latestMetrics.columns) return;

      const now = performance.now();
      if (!force && now - lastReorderAt.current < dragFrameMs) {
        frame.current = requestAnimationFrame(() =>
          reorderFromPointerCallback(),
        );
        return;
      }

      const original = layout(latestItems, latestMetrics.columns).find(
        (position) => position.id === id,
      );
      if (!original) return;

      const bounds = element.getBoundingClientRect();
      const next = choose(
        toRect(original),
        candidatesFor(latestItems, id, latestMetrics.columns, toRect),
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      ) as T[] | null;

      if (next) {
        lastReorderAt.current = now;
        updateItems(canonical(next, latestMetrics.columns));
      }
    },
    [toRect, updateItems],
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(landedTimer.current);
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    const id = focusAfterReorder.current;
    if (!id) return;
    focusAfterReorder.current = null;
    gridRef.current
      ?.querySelector<HTMLDivElement>(`[data-widget-id="${CSS.escape(id)}"]`)
      ?.focus();
  }, [currentItems]);

  const handlers = useMemo<WidgetHandlers>(
    () => ({
      start: (id) => {
        draggingId.current = id;
        originalItems.current = latest.current.items;
        lastReorderAt.current = 0;
        setHeldId(id);
        setRaisedId(id);
        window.addEventListener(
          "pointerup",
          () => {
            suppressClickUntil.current = performance.now() + 300;
          },
          { once: true, capture: true },
        );
      },
      drag: () => {
        if (!frame.current) {
          frame.current = requestAnimationFrame(() => reorderFromPointer());
        }
      },
      end: (id) => {
        cancelAnimationFrame(frame.current);
        reorderFromPointer(true);
        frame.current = 0;
        draggingId.current = null;
        setHeldId(null);
        setLandedId(id);
        window.clearTimeout(landedTimer.current);
        landedTimer.current = window.setTimeout(() => {
          setLandedId(null);
          setRaisedId(null);
        }, landedDurationMs);

        const previous = originalItems.current;
        originalItems.current = null;
        const next = latest.current.items;
        if (previous && !sameOrder(previous, next)) {
          latest.current.onChange?.(next);
        }
      },
      key: (event, id) => {
        if (
          !editable ||
          !event.altKey ||
          (event.target instanceof Element &&
            Boolean(event.target.closest("input, textarea, select")))
        ) {
          return;
        }

        const direction =
          event.key === "ArrowRight" || event.key === "ArrowDown"
            ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? -1
              : 0;
        if (!direction) return;

        event.preventDefault();
        const { items: latestItems, metrics: latestMetrics } = latest.current;
        const currentColumns = latestMetrics.columns || maxColumns;
        const currentIndex = latestItems.findIndex((item) => item.id === id);

        for (
          let index = currentIndex + direction;
          index >= 0 && index < latestItems.length;
          index += direction
        ) {
          const next = canonical(moveTo(latestItems, id, index), currentColumns);
          if (!sameOrder(next, latestItems)) {
            focusAfterReorder.current = id;
            updateItems(next);
            latest.current.onChange?.(next);
            return;
          }
        }
      },
      swallow: () => performance.now() < suppressClickUntil.current,
      suppressClick: () => {
        suppressClickUntil.current = performance.now() + 300;
      },
    }),
    [editable, maxColumns, reorderFromPointer, updateItems],
  );

  const itemsById = useMemo(
    () => new Map(currentItems.map((item) => [item.id, item])),
    [currentItems],
  );
  const [stableDomOrder] = useState(() => currentItems.map((item) => item.id));

  const positionsById = new Map(
    positions.map((position) => [position.id, position]),
  );
  const visualPositions = new Map(
    [...positions]
      .sort((first, second) => first.row - second.row || first.col - second.col)
      .map((position, index) => [position.id, index]),
  );

  const gridStyle = {
    "--widget-radius": `${radius}px`,
  } as CSSProperties;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`relative w-full ${className}`} style={gridStyle}>
        {editable ? (
          <p id={hintId} className="sr-only">
            Drag to rearrange. On touch screens, press and hold first. With a
            keyboard, hold Alt and press the arrow keys.
          </p>
        ) : null}
        <div
          ref={gridRef}
          role="list"
          data-slot="widget-grid"
          className="grid w-full"
          style={{
            gap,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridAutoRows: metrics.unit
              ? `${Math.round(metrics.unit)}px`
              : `minmax(${cellSize * 0.75}px, auto)`,
          }}
        >
          {stableDomOrder.map((id) => {
            const item = itemsById.get(id);
            const position = positionsById.get(id);
            if (!item || !position) return null;
            return (
              <Widget
                key={id}
                position={(visualPositions.get(id) ?? 0) + 1}
                count={positions.length}
                item={item}
                col={position.col}
                row={position.row}
                w={position.w}
                h={position.h}
                columns={columns}
                rows={rows}
                editable={editable}
                held={heldId === position.id}
                raised={raisedId === position.id}
                landed={landedId === position.id}
                handlers={handlers}
                hintId={hintId}
                renderItem={renderItem}
              />
            );
          })}
        </div>
      </div>
    </MotionConfig>
  );
}
