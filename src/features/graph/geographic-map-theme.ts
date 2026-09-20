export const NEXUSTRACE_BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const NEXUSTRACE_MAP_STYLES = {
  dark: NEXUSTRACE_BASEMAP_STYLE,
  light: NEXUSTRACE_BASEMAP_STYLE,
} as const;

type ThemeableMap = {
  getStyle: () => { layers?: Array<{ id: string; type: string; "source-layer"?: string }> };
  setPaintProperty: unknown;
  setLayoutProperty: unknown;
};

function layerSemantics(layer: { id: string; "source-layer"?: string }): string {
  const sourceLayer = layer["source-layer"];
  return `${layer.id} ${sourceLayer ?? ""}`.toLowerCase();
}

function safePaint(map: ThemeableMap, layerId: string, property: string, value: unknown) {
  try {
    (map.setPaintProperty as (id: string, name: string, nextValue: unknown) => unknown)(layerId, property, value);
  } catch {
    // OpenFreeMap styles can evolve. An optional upstream property must not break the map.
  }
}

function safeLayout(map: ThemeableMap, layerId: string, property: string, value: unknown) {
  try {
    (map.setLayoutProperty as (id: string, name: string, nextValue: unknown) => unknown)(layerId, property, value);
  } catch {
    // Keep upstream style changes non-fatal, as with optional paint properties.
  }
}

export function applyNexusTraceDarkBasemap(map: ThemeableMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.id.startsWith("nexustrace-")) continue;
    const semantics = layerSemantics(layer);

    if (layer.type === "background") {
      safePaint(map, layer.id, "background-color", "#05080d");
      safePaint(map, layer.id, "background-opacity", 1);
      continue;
    }

    if (layer.type === "fill") {
      if (/water|ocean|lake|river/.test(semantics)) {
        safePaint(map, layer.id, "fill-color", "#071724");
        safePaint(map, layer.id, "fill-opacity", 0.96);
      } else if (/building/.test(semantics)) {
        safePaint(map, layer.id, "fill-color", "#13202d");
        safePaint(map, layer.id, "fill-opacity", 0.7);
      } else if (/park|wood|forest|grass|landcover|landuse|natural/.test(semantics)) {
        safePaint(map, layer.id, "fill-color", "#0b1918");
        safePaint(map, layer.id, "fill-opacity", 0.72);
      } else {
        safePaint(map, layer.id, "fill-color", "#090f17");
        safePaint(map, layer.id, "fill-opacity", 0.82);
      }
      continue;
    }

    if (layer.type === "fill-extrusion") {
      safePaint(map, layer.id, "fill-extrusion-color", "#152331");
      safePaint(map, layer.id, "fill-extrusion-opacity", 0.68);
      continue;
    }

    if (layer.type === "line") {
      if (/water|river|stream|waterway/.test(semantics)) {
        safePaint(map, layer.id, "line-color", "#183b54");
        safePaint(map, layer.id, "line-opacity", 0.78);
      } else if (/motorway|trunk|primary/.test(semantics)) {
        safePaint(map, layer.id, "line-color", "#506780");
        safePaint(map, layer.id, "line-opacity", 0.82);
      } else if (/road|street|transport/.test(semantics)) {
        safePaint(map, layer.id, "line-color", "#2d3e51");
        safePaint(map, layer.id, "line-opacity", 0.72);
      } else if (/boundary|admin/.test(semantics)) {
        safePaint(map, layer.id, "line-color", "#435a72");
        safePaint(map, layer.id, "line-opacity", 0.55);
      } else {
        safePaint(map, layer.id, "line-color", "#263747");
        safePaint(map, layer.id, "line-opacity", 0.58);
      }
      continue;
    }

    if (layer.type === "symbol") {
      const isPlace = /place|city|town|state|country|locality|settlement/.test(semantics);
      const isRoad = /road|street|transport/.test(semantics);
      const isPoi = /poi|amenity|shop/.test(semantics);
      // OpenFreeMap Liberty style serves Noto Sans as the standard font stack
      safeLayout(map, layer.id, "text-font", ["Noto Sans Regular"]);
      safePaint(map, layer.id, "text-color", isPlace ? "#dce7f2" : isRoad ? "#92a5ba" : "#aab9c8");
      safePaint(map, layer.id, "text-halo-color", "#07101a");
      safePaint(map, layer.id, "text-halo-width", isPlace ? 1.25 : 0.9);
      safePaint(map, layer.id, "text-opacity", isPoi ? 0.34 : isRoad ? 0.66 : 0.82);
      safePaint(map, layer.id, "icon-opacity", isPoi ? 0.22 : 0.62);
    }
  }
}
