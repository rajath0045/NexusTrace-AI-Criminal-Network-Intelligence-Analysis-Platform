import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class FakeMap {
    static instances: FakeMap[] = [];
    options: Record<string, unknown>;
    handlers = new globalThis.Map<string, Set<(...args: unknown[]) => void>>();
    resize = vi.fn();
    remove = vi.fn();
    jumpTo = vi.fn();
    setStyle = vi.fn();
    fullyLoaded = false;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      FakeMap.instances.push(this);
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      const handlers = this.handlers.get(event) ?? new Set();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    once(event: string, handler: (...args: unknown[]) => void) {
      const onceHandler = (...args: unknown[]) => {
        this.off(event, onceHandler);
        handler(...args);
      };
      return this.on(event, onceHandler);
    }

    off(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.get(event)?.delete(handler);
      return this;
    }

    emit(event: string, payload: unknown = {}) {
      for (const handler of [...(this.handlers.get(event) ?? [])]) handler(payload);
    }

    loaded() { return this.fullyLoaded; }
    getCenter() { return { lng: 77.59, lat: 12.97 }; }
    getZoom() { return 11; }
    getBearing() { return 0; }
    getPitch() { return 0; }
  }

  return { FakeMap };
});

vi.mock("maplibre-gl", () => ({
  Map: mocks.FakeMap,
  Marker: class {},
  Popup: class {},
  setWorkerUrl: vi.fn(),
}));

import { Map } from "./mapcn-marker-tooltip";

describe("MapLibre wrapper lifecycle", () => {
  const observe = vi.fn();
  const disconnect = vi.fn();
  let resizeCallback: ResizeObserverCallback;

  beforeEach(() => {
    mocks.FakeMap.instances.length = 0;
    observe.mockClear();
    disconnect.mockClear();
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("uses style readiness, stays mounted when delayed, resizes, and cleans up once", () => {
    const onLifecycleChange = vi.fn();
    const onStyleReady = vi.fn();
    const styles = { dark: "https://tiles.openfreemap.org/styles/liberty" };
    const view = render(<Map theme="dark" styles={styles} loadTimeoutMs={500} onLifecycleChange={onLifecycleChange} onStyleReady={onStyleReady}><span>overlay</span></Map>);
    const map = mocks.FakeMap.instances[0];

    expect(mocks.FakeMap.instances).toHaveLength(1);
    expect(map.options.style).toBe(styles.dark);
    expect(view.container.firstChild).toHaveAttribute("data-map-state", "STYLE_LOADING");

    act(() => map.emit("style.load"));
    expect(view.container.firstChild).toHaveAttribute("data-map-ready", "true");
    expect(onStyleReady).toHaveBeenCalledOnce();

    view.rerender(<Map theme="dark" styles={styles} loadTimeoutMs={500} onLifecycleChange={onLifecycleChange} onStyleReady={onStyleReady}><span>updated overlay</span></Map>);
    expect(mocks.FakeMap.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(500));
    expect(view.container.firstChild).toHaveAttribute("data-map-state", "DELAYED");
    expect(view.container.firstChild).toHaveAttribute("data-map-ready", "true");

    act(() => resizeCallback([], {} as ResizeObserver));
    expect(map.resize).toHaveBeenCalled();

    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(map.remove).toHaveBeenCalledOnce();
  });
});
