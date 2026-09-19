# NexusTrace Geographic Network Console Design

## Objective

Transform `/network` into the primary geographic criminal-network investigation console while preserving the existing Cytoscape graph, graph-domain contracts, incident timeline, investigation findings, workspace customization, evidence provenance, and server-side RBAC.

The map represents only authorized geographic facts. It correlates events and timestamped observations without inferring presence, movement, guilt, or risk.

## Architecture

### Canonical geographic observation

Add one additive `EntityLocationObservation` model related to the existing canonical `GraphEntity`. It stores longitude, latitude, observation time, observation semantics, a presentation-safe location label, an optional context note, source-record type/id, department ownership, verification level, and creation time.

Observation types remain distinct: residence, property, registered address, observed person location, vehicle observation, device observation, incident location, evidence location, and other authorized observation. Ownership and residence relationships never substitute for timestamped physical observations.

### Authorization boundary

All geographic repository queries are actor-scoped on the server. Non-administrators receive only observations in their department and only when the related graph entity is already visible through an authorized case/incident context. The browser receives no hidden or filtered-out coordinates, counts, tooltip content, or heatmap inputs.

### Temporal resolution

`resolveEntityLocationAtTime` selects the closest authorized timestamped observation within a bounded window and returns the observation plus temporal distance and source metadata. Static residence/property/registered-address observations are excluded from historical-presence resolution. When no eligible observation exists, the result is explicitly unknown.

### Geographic projection

The projection service composes:

- authorized graph nodes and relationship tiers;
- authorized current-window geographic observations;
- authorized incident/timeline activity;
- communication records whose endpoints are resolved independently at event time;
- bundled entity-pair connections with compact communication/financial/relationship counts;
- provenance, verification, related Case/FIR, and evidence identifiers already authorized to the actor.

The API returns a presentation-safe projection. It never returns unrestricted domain records.

### Client composition

The central stable canvas supports synchronized `Geographic` and `Relationship` modes. MapLibre renders the real dark basemap, important DOM markers, bundled line layers, clusters, optional authorized heatmap, semantic icons, fit, and recenter. Existing Cytoscape remains the abstract relationship view.

One client controller owns focus, selection, tier/hop/verification/type/time/layer filters, active view, and detail selection. The top timeline, both canvases, and surrounding panels consume that shared state.

Surrounding server-authorized panels use the existing per-user `graph` workspace. Map gestures never become workspace drag gestures.

## Visual system

- Primary tier: neon red.
- Secondary tier: electric blue.
- Tertiary tier: luminous yellow.
- Verification: line pattern, opacity, border strength, and badges—never tier color.
- Focus: controlled halo and label priority.
- Labels: focus, selection, primary connections, and important places first; remaining labels are zoom/hover disclosed.
- Dense observations: MapLibre GeoJSON clustering, not unbounded DOM markers.
- Motion is restrained and disabled/reduced under `prefers-reduced-motion`.

## Failure and empty states

The map distinguishes basemap loading/failure, no authorized geolocation, no relationships matching filters, and partially geolocated communications. Unknown endpoints remain visible in Relationship view and Connection Details as `LOCATION UNKNOWN`; coordinates are never synthesized.

## Verification

Coverage includes persistence, authorization, temporal resolution, unknown endpoints, semantic observation types, call geolocation, bundling, tier/verification styling, focus synchronization, timeline filtering, clustering/layers, workspace gesture isolation, responsiveness, Prisma validation/migrations, TypeScript, ESLint, unit/component/integration tests, and the webpack production build.

