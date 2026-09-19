# Geographic Network Console Implementation Plan

## Phase A — Geographic foundation

1. Add the supplied MapLibre component and compatible dependencies.
2. Add geographic enums and `EntityLocationObservation` to Prisma with an additive migration.
3. Add validation/contracts, repository, service, temporal resolver, authorization tests, and deterministic seed observations.
4. Add the actor-scoped geographic projection and API.

## Phase B — Central map

1. Add MapLibre map canvas, semantic Lucide markers, real dark basemap, loading/error/empty states, fit, and recenter.
2. Add focus selection and tier-colored bundled relationship layers.
3. Preserve exact verification semantics through independent line patterns/opacity.

## Phase C — Investigation semantics

1. Project residence, property, vehicle observation, device observation, and incident location independently.
2. Resolve communication endpoints at event time; render call badges only with two supported endpoints.
3. Represent partial/unknown geolocation explicitly and expose source/provenance details.
4. Aggregate multiple records between the same entity pair.

## Phase D — Synchronized console

1. Share focus and selection across MapLibre and Cytoscape with a Geographic/Relationship switch.
2. Add compact authorized timeline and investigation/filter/activity panels.
3. Add selected entity, connection, analyst context, actions, and factual bottom summaries.
4. Integrate surrounding panels with the existing `graph` workspace definitions.

## Phase E — Scale and refinement

1. Add native marker clustering, layer controls, zoom-aware labels, and optional authorized heatmap.
2. Complete responsive desktop/tablet/mobile layouts, reduced motion, keyboard access, and gesture isolation.
3. Run project and 21st reviews, update the checkpoint and design decision, verify the full suite, commit milestones, and push `main` only when clean.

