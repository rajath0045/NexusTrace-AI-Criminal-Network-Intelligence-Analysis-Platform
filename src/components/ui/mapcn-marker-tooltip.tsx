"use client";

import * as MapLibreGL from "maplibre-gl";
import type { MarkerOptions, PopupOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

MapLibreGL.setWorkerUrl("/vendor/maplibre/6.10.0/maplibre-gl-worker.mjs");

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

const defaultStyles = {
  dark: "https://tiles.openfreemap.org/styles/liberty",
  light: "https://tiles.openfreemap.org/styles/liberty",
};

type Theme = "light" | "dark";

type MapViewport = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type MapStyleOption = string | MapLibreGL.StyleSpecification;
type MapRef = MapLibreGL.Map;
export type MapLifecycleState = "INITIALIZING" | "STYLE_LOADING" | "READY" | "DELAYED" | "ERROR";

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
  status: MapLifecycleState;
};

const MapContext = createContext<MapContextValue | null>(null);

function getDocumentTheme(): Theme | null {
  if (typeof document === "undefined") return null;
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useResolvedTheme(themeProp?: Theme): Theme {
  const [detectedTheme, setDetectedTheme] = useState<Theme>(() => getDocumentTheme() ?? getSystemTheme());

  useEffect(() => {
    if (themeProp) return;
    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) setDetectedTheme(docTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (!getDocumentTheme()) setDetectedTheme(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
}

function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error("useMap must be used within a Map component");
  return context;
}

type MapProps = {
  children?: ReactNode;
  className?: string;
  theme?: Theme;
  styles?: { light?: MapStyleOption; dark?: MapStyleOption };
  viewport?: Partial<MapViewport>;
  onViewportChange?: (viewport: MapViewport) => void;
  loading?: boolean;
  loadingLabel?: string;
  loadTimeoutMs?: number;
  onStyleReady?: (map: MapLibreGL.Map) => void;
  onLifecycleChange?: (status: MapLifecycleState) => void;
  onError?: (error: Error) => void;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

function DefaultLoader({ label }: { label: string }) {
  return (
    <div className="mapcn-loading-state absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-xs" role="status">
      <div className="flex gap-1">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </div>
      <span>{label}</span>
    </div>
  );
}

function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

const Map = forwardRef<MapRef, MapProps>(function Map(
  { children, className, theme: themeProp, styles, viewport, onViewportChange, loading = false, loadingLabel = "Loading map…", loadTimeoutMs = 12_000, onStyleReady, onLifecycleChange, onError, ...props },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [lifecycle, setLifecycle] = useState<MapLifecycleState>("INITIALIZING");
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalUpdateRef = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp);
  const onViewportChangeRef = useRef(onViewportChange);
  const onErrorRef = useRef(onError);
  const onStyleReadyRef = useRef(onStyleReady);
  const onLifecycleChangeRef = useRef(onLifecycleChange);

  const mapStyles = useMemo(
    () => ({ dark: styles?.dark ?? defaultStyles.dark, light: styles?.light ?? defaultStyles.light }),
    [styles],
  );
  const initialOptionsRef = useRef({ props, viewport, resolvedTheme, mapStyles });
  const appliedStyleRef = useRef<MapStyleOption>(resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onStyleReadyRef.current = onStyleReady;
  }, [onStyleReady]);

  useEffect(() => {
    onLifecycleChangeRef.current = onLifecycleChange;
  }, [onLifecycleChange]);

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

  useEffect(() => {
    if (!containerRef.current) return;
    const initial = initialOptionsRef.current;
    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initial.resolvedTheme === "dark" ? initial.mapStyles.dark : initial.mapStyles.light,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      ...initial.props,
      ...initial.viewport,
    });
    let initialStyleReady = false;
    let terminalError = false;
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => map.resize());
    resizeObserver?.observe(containerRef.current);

    const updateLifecycle = (status: MapLifecycleState) => {
      setLifecycle(status);
      onLifecycleChangeRef.current?.(status);
    };
    const styleLoadHandler = () => {
      initialStyleReady = true;
      terminalError = false;
      onStyleReadyRef.current?.(map);
      map.resize();
      setIsStyleLoaded(true);
      updateLifecycle("READY");
    };
    const loadHandler = () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setIsFullyLoaded(true);
      if (!terminalError) updateLifecycle("READY");
    };
    const moveHandler = () => {
      if (!internalUpdateRef.current) onViewportChangeRef.current?.(getViewport(map));
    };
    const errorHandler = (event: MapLibreGL.ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : new Error("The geographic basemap could not be loaded.");
      if (!initialStyleReady) {
        terminalError = true;
        updateLifecycle("ERROR");
        onErrorRef.current?.(error);
      }
    };

    updateLifecycle("STYLE_LOADING");
    map.on("load", loadHandler);
    map.on("style.load", styleLoadHandler);
    map.on("move", moveHandler);
    map.on("error", errorHandler);
    setMapInstance(map);
    loadTimeoutRef.current = setTimeout(() => {
      if (!map.loaded() && !terminalError) updateLifecycle("DELAYED");
    }, loadTimeoutMs);

    return () => {
      map.off("load", loadHandler);
      map.off("style.load", styleLoadHandler);
      map.off("move", moveHandler);
      map.off("error", errorHandler);
      resizeObserver?.disconnect();
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      map.remove();
      setMapInstance(null);
      setIsFullyLoaded(false);
      setIsStyleLoaded(false);
      setLifecycle("INITIALIZING");
    };
  }, [loadTimeoutMs]);

  useEffect(() => {
    if (!mapInstance) return;
    const nextStyle = resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    if (appliedStyleRef.current === nextStyle) return;
    setIsStyleLoaded(false);
    setLifecycle("STYLE_LOADING");
    onLifecycleChangeRef.current?.("STYLE_LOADING");
    mapInstance.setStyle(nextStyle);
    appliedStyleRef.current = nextStyle;
  }, [resolvedTheme, mapStyles, mapInstance]);

  useEffect(() => {
    if (!mapInstance || !viewport) return;
    internalUpdateRef.current = true;
    mapInstance.jumpTo(viewport);
    requestAnimationFrame(() => {
      internalUpdateRef.current = false;
    });
  }, [mapInstance, viewport]);

  const contextValue = useMemo(() => ({ map: mapInstance, isLoaded: Boolean(mapInstance) && isStyleLoaded, status: lifecycle }), [lifecycle, mapInstance, isStyleLoaded]);

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative h-full w-full", className)} data-map-state={lifecycle} data-map-ready={contextValue.isLoaded ? "true" : "false"} data-map-loaded={isFullyLoaded ? "true" : "false"} data-map-style-loaded={isStyleLoaded ? "true" : "false"}>
        {(!contextValue.isLoaded || loading) && <DefaultLoader label={loadingLabel} />}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

type MarkerContextValue = {
  marker: MapLibreGL.Marker;
  map: MapLibreGL.Map | null;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) throw new Error("Marker components must be used within MapMarker");
  return context;
}

type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
  onClick?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onDragStart?: (lngLat: { lng: number; lat: number }) => void;
  onDrag?: (lngLat: { lng: number; lat: number }) => void;
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

function MapMarker({ longitude, latitude, children, onClick, onMouseEnter, onMouseLeave, onDragStart, onDrag, onDragEnd, draggable = false, ...markerOptions }: MapMarkerProps) {
  const { map } = useMap();
  const [marker] = useState(() => new MapLibreGL.Marker({ ...markerOptions, element: document.createElement("div"), draggable }).setLngLat([longitude, latitude]));

  useEffect(() => {
    const element = marker.getElement();
    const handleClick = (event: MouseEvent) => onClick?.(event);
    const handleMouseEnter = (event: MouseEvent) => onMouseEnter?.(event);
    const handleMouseLeave = (event: MouseEvent) => onMouseLeave?.(event);
    const handleDragStart = () => {
      const lngLat = marker.getLngLat();
      onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDrag = () => {
      const lngLat = marker.getLngLat();
      onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDragEnd = () => {
      const lngLat = marker.getLngLat();
      onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    element.addEventListener("click", handleClick);
    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    marker.on("dragstart", handleDragStart);
    marker.on("drag", handleDrag);
    marker.on("dragend", handleDragEnd);
    return () => {
      element.removeEventListener("click", handleClick);
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      marker.off("dragstart", handleDragStart);
      marker.off("drag", handleDrag);
      marker.off("dragend", handleDragEnd);
    };
  }, [marker, onClick, onDrag, onDragEnd, onDragStart, onMouseEnter, onMouseLeave]);

  useEffect(() => {
    if (!map) return;
    marker.addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, marker]);

  useEffect(() => {
    const current = marker.getLngLat();
    if (current.lng !== longitude || current.lat !== latitude) marker.setLngLat([longitude, latitude]);
    if (marker.isDraggable() !== draggable) marker.setDraggable(draggable);
  }, [draggable, latitude, longitude, marker]);

  return <MarkerContext.Provider value={{ marker, map }}>{children}</MarkerContext.Provider>;
}

type MarkerContentProps = {
  children?: ReactNode;
  className?: string;
};

function MarkerContent({ children, className }: MarkerContentProps) {
  const { marker } = useMarkerContext();
  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>{children || <DefaultMarkerIcon />}</div>,
    marker.getElement(),
  );
}

function DefaultMarkerIcon() {
  return <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />;
}

type MarkerTooltipProps = {
  children: ReactNode;
  className?: string;
} & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

function MarkerTooltip({ children, className, ...popupOptions }: MarkerTooltipProps) {
  const { marker, map } = useMarkerContext();
  const [container] = useState(() => document.createElement("div"));
  const [tooltip] = useState(() => new MapLibreGL.Popup({ offset: 16, ...popupOptions, closeOnClick: true, closeButton: false }).setMaxWidth("none"));

  useEffect(() => {
    if (!map) return;
    tooltip.setDOMContent(container);
    const handleMouseEnter = () => tooltip.setLngLat(marker.getLngLat()).addTo(map);
    const handleMouseLeave = () => tooltip.remove();
    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
  }, [container, map, marker, tooltip]);

  useEffect(() => {
    tooltip.setOffset(popupOptions.offset ?? 16);
    tooltip.setMaxWidth(popupOptions.maxWidth ?? "none");
  }, [popupOptions.maxWidth, popupOptions.offset, tooltip]);

  return createPortal(
    <div className={cn("pointer-events-none rounded-md bg-foreground px-2 py-1 text-xs text-balance text-background shadow-md animate-in fade-in-0 zoom-in-95 duration-200 ease-out", className)}>
      {children}
    </div>,
    container,
  );
}

type MarkerLabelProps = {
  children: ReactNode;
  className?: string;
  position?: "top" | "bottom";
};

function MarkerLabel({ children, className, position = "top" }: MarkerLabelProps) {
  const positionClasses = { top: "bottom-full mb-1", bottom: "top-full mt-1" };
  return (
    <div className={cn("absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-foreground", positionClasses[position], className)}>
      {children}
    </div>
  );
}

export { Map, useMap, MapMarker, MarkerContent, MarkerTooltip, MarkerLabel };
