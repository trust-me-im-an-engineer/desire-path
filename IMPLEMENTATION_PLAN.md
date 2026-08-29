# Desire Path Simulation Implementation Plan

This document is the implementation specification for terrain storage, navigation-field computation, agent movement, wear, fading, and interactive terrain painting.

## 1. Final design decisions

- World and agent positions use floating-point native pixel coordinates. For the current map, `x` is in `[0, 1000)` and `y` is in `[0, 600)`.
- Navigation uses a grid reduced by a fixed factor of four. The current navigation grid is therefore `250 x 150`.
- Base terrain and wear remain at native resolution so rendered desire paths retain native-pixel detail.
- A separate GPU pass averages the native effective terrain into one shared coarse terrain texture. Navigation shaders never perform their own 4x4 reduction.
- Thin black features are intentionally traversable. A coarse cell is the average of its 16 native pixels; it is impassable only when that average is zero.
- Traversal speed is the coarse grayscale value `g`. Traversal cost per unit distance is `1 / g`; `g == 0` is unreachable.
- Exact navigation fields are computed with Dijkstra in a Web Worker at startup and after user painting.
- Between exact rebuilds, GPU Bellman relaxation tracks gradual wear and grass regrowth in both directions: costs may decrease or increase.
- Up to four destinations are packed into the RGBA channels of one navigation texture. Up to 20 points require five texture groups.
- Each RGBA navigation group receives exactly one relaxation pass per rendered simulation frame.
- Agents never step from navigation cell to navigation cell. They move continuously by `speed * deltaTime`, steer using the coarse field, and retain floating-point positions.
- Existing UI sliders are outside the first implementation and remain unused.

## 2. Coordinates and indexing

The public/world convention remains top-left origin because interest points and the camera already use it:

```text
world x: rightward
world y: downward
```

GPU textures, render-target readback, and worker arrays use bottom-left row order. Convert only at system boundaries:

```ts
function worldToUv(x: number, y: number, width: number, height: number) {
	return { x: x / width, y: 1 - y / height };
}

function worldToNavigationCell(
	x: number,
	y: number,
	coarseWidth: number,
	coarseHeight: number,
) {
	return {
		x: Math.min(coarseWidth - 1, Math.floor(x / 4)),
		y: Math.min(coarseHeight - 1, coarseHeight - 1 - Math.floor(y / 4)),
	};
}
```

All CPU grids are flat typed arrays:

```ts
const index = y * width + x;
```

Do not use `number[][]` for terrain or navigation fields.

## 3. Terrain ownership and formats

### Native base terrain

The editable base map has two representations of the same data:

- CPU source of truth: `Uint8Array(width * height)`.
- GPU representation: R8 `THREE.DataTexture` using `RedFormat`, `UnsignedByteType`, `NoColorSpace`, nearest filtering, no mipmaps, and `flipY = false`.

Decode the PNG once, extract its red/grayscale channel, and reverse its top-down image rows while filling the typed array. The resulting array is already in bottom-left GPU order.

User painting modifies the CPU array and sets `baseTerrainTexture.needsUpdate = true` once in each frame containing edits. Uploading the complete current 1000x600 R8 map transfers 600 KB, which is acceptable initially. Dirty-rectangle uploads are a future optimization only if profiling requires them.

The terrain display shader samples the R8 texture and replicates `.r` into RGB. Numeric terrain data must not use sRGB decoding.

### Native wear

Wear is a GPU-owned native-resolution value in `[0, 1]`:

- `0`: no trail; use the base terrain value.
- `1`: maximally worn; approach white terrain.

Keep two native R16F render targets for wear fading/update ping-pong. Avoid relying on float blending. Instead:

1. Clear a native R8 traffic target.
2. Render every accepted agent movement segment into the traffic target with additive normalized blending.
3. Run a full-screen wear update from previous wear plus traffic into the other R16F target.
4. Apply fading in the same update shader and swap wear targets.

The wear update is:

```text
newWear = clamp(oldWear * fadeFactor + traffic * wearGain, 0, 1)
```

Render movement as instanced swept-segment quads/capsules rather than relying on platform-dependent wide GL lines. Wear is deposited along the traversed segment, not only at its endpoint, so fast agents do not create dotted paths.

Base-black native pixels are never brightened by wear. At a native pixel:

```glsl
float effective = base == 0.0 ? 0.0 : mix(base, 1.0, wear);
```

Thin black structures can nevertheless be crossed because navigation and collision use the average of the entire 4x4 footprint.

### Shared coarse effective terrain

Create one `250 x 150` R8 render target. Once per simulation frame, after wear and painting updates, render a reduction pass that:

1. Visits the corresponding 4x4 native footprint with `texelFetch`.
2. Combines base and wear per native pixel using the formula above.
3. Averages all 16 effective values.
4. Writes the average to the coarse R8 target.

For dimensions not divisible by four, ignore out-of-range source texels and divide by the actual sample count. The current dimensions divide evenly.

This one pass performs approximately 600,000 native texture reads. Its result is reused by every navigation group, agent movement, and Dijkstra snapshot. Do not repeat the 4x4 averaging inside navigation shaders.

The averaging rule intentionally gives the following behavior:

- 4 white rows: `g = 1`, normal speed.
- 1 black row and 3 white rows: `g = 0.75`, traversable fence.
- 2 black rows and 2 white rows: `g = 0.5`, stronger penalty.
- Fully black 4x4 footprint: `g = 0`, impassable.

There is no separate hard-obstacle mask in the first implementation. If thin features must later become absolutely impassable, add an explicit semantic mask rather than changing the averaging rule.

## 4. Navigation cost definition

Navigation fields store accumulated travel cost in native-pixel distance units:

```text
target cost:       0
unreachable cost:  1e20
lower cost:        better route
```

Use the finite constant `UNREACHABLE = 1e20`. Do not generate IEEE infinity and never evaluate `1 / 0`.

For a transition between adjacent coarse cells `a` and `b`:

```text
speedA = grayscale(a)
speedB = grayscale(b)

if speedA == 0 or speedB == 0:
    edge is forbidden
else:
    distance = 4 for an axial edge, 4 * sqrt(2) for a diagonal edge
    edgeCost = distance * 0.5 * (1 / speedA + 1 / speedB)
```

Using the average inverse speeds makes the edge symmetric, so worker Dijkstra and reverse-from-target navigation fields use the same cost in either direction.

Use eight neighbors. A diagonal edge is forbidden when either of the two adjacent orthogonal coarse cells is zero; this prevents corner cutting through touching impassable cells.

Clamp every addition to `UNREACHABLE`.

## 5. Exact Dijkstra rebuild

Three.js has no Dijkstra implementation and WebGL textures cannot be accessed directly by a worker. Implement grid-specific Dijkstra in TypeScript using flat typed arrays and a binary min-heap.

### Worker request

After rendering the latest coarse terrain, read its R8 target asynchronously:

```ts
const terrain = new Uint8Array(coarseWidth * coarseHeight);

await renderer.readRenderTargetPixelsAsync(
	coarseTerrainTarget,
	0,
	0,
	coarseWidth,
	coarseHeight,
	terrain,
);
```

If a device cannot read an R8 attachment, render/copy into an RGBA8 readback target and extract every fourth byte as the compatibility fallback.

Transfer this request to the worker:

```ts
type NavigationBuildRequest = {
	paintRevision: number;
	width: number;
	height: number;
	terrain: Uint8Array;
	targets: Array<{ x: number; y: number; radius: number }>;
};
```

Transfer `terrain.buffer`; do not attempt to reuse the detached buffer after posting it.

### Worker algorithm

For each interest point:

1. Fill a `Float32Array(width * height)` with `UNREACHABLE`.
2. Seed every passable coarse cell whose center lies within the interest point's radius with cost zero. Report a configuration error if the radius contains no passable coarse cell.
3. Run eight-neighbor Dijkstra with the exact edge formula above.
4. Skip stale heap entries instead of implementing decrease-key.

After all points are solved, pack up to four scalar fields into each RGBA group:

```text
group = floor(targetIndex / 4)
channel = targetIndex % 4
packed[pixel * 4 + channel] = targetField[pixel]
```

Fill unused channels with `UNREACHABLE`. Return transferable `Float32Array(width * height * 4)` group buffers with the originating `paintRevision`.

### Rebuild timing

- Run Dijkstra at startup and do not spawn/move agents until the initial fields are uploaded.
- Every user paint operation increments `paintRevision` and schedules a rebuild 150 ms after the most recent stroke event.
- Painting affects base terrain and coarse collision immediately; navigation may remain stale while the worker runs.
- Discard a worker response if a newer paint revision exists.
- Wear/fading changes do not invalidate an in-flight worker result. GPU relaxation will correct the small wear difference after upload.

### Upload and atomic replacement

For each RGBA group:

1. Wrap the returned packed array in a temporary RGBA/Float `DataTexture`.
2. Copy it with a full-screen pass into the group's currently inactive RGBA32F render target.
3. After every group has been copied, atomically switch all active group references.
4. Dispose the temporary upload textures.

The next relaxation frame reads the newly exact field and writes into the other ping-pong target.

## 6. GPU navigation relaxation

Create `ceil(interestPointCount / 4)` RGBA32F ping-pong target pairs. At 20 points there are five groups. At `250 x 150`, five pairs use approximately 6 MB.

Run exactly one full-screen relaxation pass for every group in every simulation frame:

```text
1-4 points:   1 navigation draw per frame
5-8 points:   2 navigation draws per frame
17-20 points: 5 navigation draws per frame
```

Every channel has a different target. The shader receives four target positions/radii plus an active-channel mask for its group.

For each non-target, nonzero-terrain cell, recompute rather than retain the old value:

```text
newCost = minimum(previousNeighborCost + edgeCost)
```

Important: do not calculate `min(oldCost, newCost)`. Full overwrite relaxation allows costs to rise as unused trails fade and fall when trails are worn.

One local-neighbor relaxation propagates a change by approximately one coarse cell per frame. A change crossing the 250-cell map width takes about 250 frames, or roughly 4.2 seconds at 60 FPS. This delay is intentional and acceptable.

If painting creates or removes connectivity, overwrite relaxation alone can retain stale cyclic values for too long. The debounced Dijkstra rebuild is the authoritative repair for all painting changes.

The debug renderer selects a group and channel, treats values near `UNREACHABLE` as transparent, and maps finite raw costs to brightness. Agent logic consumes raw costs and prefers lower values.

## 7. Agent state and movement

### Storage

Support up to 10,000 agents with GPU state textures. Use square targets sized to `ceil(sqrt(agentCount))`:

- Dynamic ping-pong RGBA32F state: `position.xy`, `direction.xy`.
- Static RGBA32F metadata: `baseSpeed`, `targetIndex`, `randomSeed`, reserved value.

Pixels beyond `agentCount` are inactive. Render agents with one points/instanced draw that fetches state by agent index.

For a destination index:

```text
fieldGroup = floor(targetIndex / 4)
fieldChannel = targetIndex % 4
```

The agent update shader binds up to five explicitly named navigation samplers and uses a fixed branch/switch to select the group, then selects the RGBA channel. Do not rely on non-uniform dynamic indexing of a sampler array.

### Continuous movement

Use a fixed simulation timestep of `1 / 60` second. Keep a small accumulator, process at most four catch-up steps, and discard excess backlog after long stalls.

Agent positions remain floating-point native pixel coordinates. Movement is never rounded:

```text
distance = actualSpeed * fixedDeltaTime
newPosition = oldPosition + direction * distance
```

This naturally permits both subpixel and multi-pixel movement. For example, at 60 updates per second:

- 20 px/s moves 0.33 pixels per step.
- 60 px/s moves 1 pixel per step.
- 120 px/s moves 2 pixels per step.

Assign each agent a stable personal speed, initially `nominalSpeed * random(0.8, 1.2)`. Terrain modifies it consistently with navigation:

```text
actualSpeed = baseSpeed * coarseEffectiveTerrain
```

### Steering

The navigation field is guidance, not a waypoint grid. Convert native position to coarse continuous coordinates and use finite-aware bilinear field sampling. When interpolation corners contain `UNREACHABLE`, ignore those corners and renormalize the finite weights.

Agents retain heading inertia. At steering updates, evaluate several candidate headings around the current direction using navigation cost at a look-ahead position, turn penalty, and a small seeded random term. Choose probabilistically among valid candidates, then rotate smoothly toward the selected heading. This prevents every agent from following an identical cell-center gradient.

Keep steering constants centralized and initially use:

- Five candidates relative to current heading: `-60`, `-30`, `0`, `30`, and `60` degrees.
- Look-ahead distance: 8 native pixels (two coarse cells).
- Per-agent seeded noise so results are repeatable for a given seed.

Tune probability temperature and turn penalty visually after the end-to-end pipeline works; they do not affect navigation-field correctness.

### Swept traversability

Checking only the proposed endpoint would allow fast agents to jump over blocked terrain. Test the entire old-to-new segment against the shared coarse effective terrain using coarse-grid DDA, visiting every coarse cell intersected by the segment.

- A cell with `g == 0` blocks movement.
- Nonzero cells are traversable and affect speed, including cells created by averaging thin black fences.
- On collision, keep the last valid position and choose a new heading on the next update.

Do not reject individual native black pixels: that would contradict the chosen 4x4 averaging rule. If native-scale hard collision becomes necessary later, introduce a separate explicit hard-obstacle mask.

The accepted old-to-new segment is also the segment rendered into the traffic texture.

### Arrival and retargeting

An agent arrives when its native position enters the target interest point's radius. It then selects a different target according to interest-point weights, updates its target index, and continues without snapping its position to the target center.

## 8. User painting

Pointer input operates in native top-left world coordinates:

1. Convert the brush footprint to native terrain array indices using the bottom-left row conversion.
2. Write grayscale values into the CPU base terrain array.
3. Mark the base R8 `DataTexture` for one upload in the current frame.
4. Increment `paintRevision` and restart the 150 ms Dijkstra debounce.
5. Regenerate coarse effective terrain in the normal per-frame reduction pass.

Painting therefore changes rendering, local traversal, and GPU relaxation immediately. Exact global topology follows when the latest Dijkstra response is installed.

Painting zero over a small part of a 4x4 footprint raises cost but does not block it. A footprint becomes impassable only when its averaged value reaches zero. This is intentional: a thin fence can be crossed while a thick solid region cannot.

## 9. Frame order

After startup Dijkstra has completed, each rendered frame uses this order:

1. Apply pending CPU base-terrain upload from user painting.
2. Clear the native traffic target.
3. Run zero to four fixed agent simulation steps from the active navigation fields and previous coarse terrain, rendering each step's accepted movement segments into the traffic target.
4. Update/fade native wear once using the accumulated traffic and elapsed simulated time, then swap wear targets.
5. Reduce native base plus current wear into the shared coarse effective-terrain target.
6. Run one relaxation pass for every RGBA navigation group and swap each group.
7. Start a debounced coarse readback/worker request when painting requires one and no newer request supersedes it.
8. Resize and render terrain, wear, agents, interest points, and optional navigation debug output.

The one-frame delay between movement and its navigation-field effect is expected.

## 10. Suggested modules

Keep `src/main.ts` as orchestration rather than placing all simulation logic there.

```text
src/terrain-map.ts                  base terrain decode, CPU editing, GPU texture
src/coarse-terrain.ts               4x4 effective-terrain reduction and readback
src/navigation-field.ts             field groups, uploads, relaxation, debug access
src/navigation-dijkstra.ts          pure grid Dijkstra and binary heap
src/navigation-dijkstra.worker.ts   worker protocol and grouped output packing
src/agents.ts                       state targets, metadata, update and rendering
src/wear.ts                         traffic rasterization, fading, wear targets
src/painting.ts                     brush input and paint revision/debounce
src/shaders/*                       focused compute/render shaders
```

The exact file split may be consolidated where code remains small, but terrain, navigation, agent, and wear ownership must remain separate.

## 11. Implementation sequence

1. **Terrain data**
   - Decode base terrain to a bottom-left R8 `DataTexture` backed by `Uint8Array`.
   - Render it with a grayscale data-texture material.
   - Add the shared 4x4 averaging pass without wear initially.

2. **Exact navigation**
   - Implement and unit-test pure Dijkstra on synthetic grids.
   - Add the worker protocol, coarse readback, RGBA group packing, and upload.
   - Display the first exact field.

3. **Relaxation**
   - Add RGBA32F ping-pong targets and one overwrite relaxation per group per frame.
   - Confirm static Dijkstra fields remain stable and manual terrain changes can raise and lower costs.

4. **Agent movement**
   - Add float agent state, per-agent speeds/targets, smooth probabilistic steering, swept coarse collision, arrival, and retargeting.
   - Render agents from GPU state.

5. **Wear and fading**
   - Add native traffic segments, R16F wear update/fade, effective terrain combination, and per-frame coarse reduction.
   - Verify desire paths influence both speed and navigation.

6. **Painting**
   - Add CPU brush edits, immediate texture updates, paint revisions, debounce, stale-response rejection, and exact field replacement.

## 12. Verification and acceptance criteria

### Dijkstra and cost

- An all-white grid produces axial costs of 4 and diagonal costs of `4 * sqrt(2)` per step.
- A 50% grey region costs twice as much per unit distance as white.
- A zero coarse cell is never entered and remains `UNREACHABLE`.
- A black wall with a gap routes through the gap.
- A disconnected region remains `UNREACHABLE`.
- Diagonal movement cannot pass between two touching zero cells.
- CPU Dijkstra and GPU relaxation use the same edge formula within float tolerance.
- No navigation texel becomes NaN or IEEE infinity.

### Averaging

- A 4x4 white footprint reduces to 255.
- A footprint containing one full black row and three white rows reduces to approximately 191 and remains traversable.
- A fully black footprint reduces to zero and blocks movement.
- Base-black native pixels remain black regardless of wear.

### Dynamic navigation

- Gradual wear lowers costs through overwrite relaxation.
- Fading raises costs rather than retaining stale minima.
- Every field advances by one relaxation iteration per frame regardless of the total number of points.
- Twenty interest points use five RGBA groups and five relaxation draws per frame.
- Painting that changes connectivity is corrected by the next accepted Dijkstra result.
- A stale worker response never replaces a newer paint revision.

### Agents and wear

- Agent positions remain fractional and movement distance is frame-rate independent.
- Agents with different base speeds cover proportionally different distances on equal terrain.
- Swept traversal prevents multi-pixel movement from jumping across a zero coarse cell.
- Thin black native features remain traversable according to their averaged coarse value.
- Fast movement produces continuous wear segments rather than dots.
- Agents reach and retarget among all interest points without snapping.

### Project checks

- Run `npm run typecheck` and `npm run build` after each implementation phase.
- Visually verify the current road and roundabout at two and twenty interest points.
- Profile the 20-point, 10,000-agent case before adding dirty rectangles, lower precision, or other optimizations.
