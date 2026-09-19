import { describe, expect, it, vi } from "vitest";
import { applyNexusTraceDarkBasemap, NEXUSTRACE_BASEMAP_STYLE } from "./geographic-map-theme";

describe("NexusTrace OpenFreeMap theme", () => {
  it("uses the approved OpenFreeMap Liberty baselayer", () => {
    expect(NEXUSTRACE_BASEMAP_STYLE).toBe("https://tiles.openfreemap.org/styles/liberty");
  });

  it("darkens known layer types without applying invalid paint properties", () => {
    const setPaintProperty = vi.fn();
    const setLayoutProperty = vi.fn();
    const map = {
      getStyle: () => ({
        layers: [
          { id: "background", type: "background" },
          { id: "water", type: "fill", "source-layer": "water" },
          { id: "road-primary", type: "line", "source-layer": "transportation" },
          { id: "place-city", type: "symbol", "source-layer": "place" },
          { id: "poi-minor", type: "symbol", "source-layer": "poi" },
        ],
      }),
      setPaintProperty,
      setLayoutProperty,
    };

    applyNexusTraceDarkBasemap(map);

    expect(setPaintProperty).toHaveBeenCalledWith("background", "background-color", "#05080d");
    expect(setPaintProperty).toHaveBeenCalledWith("water", "fill-color", "#071724");
    expect(setPaintProperty).toHaveBeenCalledWith("road-primary", "line-color", "#506780");
    expect(setPaintProperty).toHaveBeenCalledWith("place-city", "text-color", "#dce7f2");
    expect(setPaintProperty).toHaveBeenCalledWith("poi-minor", "text-opacity", 0.34);
    expect(setLayoutProperty).toHaveBeenCalledWith("place-city", "text-font", ["Noto Sans Regular"]);
    expect(setLayoutProperty).toHaveBeenCalledWith("poi-minor", "text-font", ["Noto Sans Regular"]);

    const fillCalls = setPaintProperty.mock.calls.filter(([id]) => id === "water");
    expect(fillCalls.every(([, property]) => String(property).startsWith("fill-"))).toBe(true);
  });

  it("continues safely when an upstream style layer rejects an optional property", () => {
    const map = {
      getStyle: () => ({ layers: [{ id: "city", type: "symbol", "source-layer": "place" }] }),
      setPaintProperty: vi.fn(() => { throw new Error("unsupported expression"); }),
      setLayoutProperty: vi.fn(),
    };

    expect(() => applyNexusTraceDarkBasemap(map)).not.toThrow();
  });
});
