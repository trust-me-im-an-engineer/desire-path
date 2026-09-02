import { Heap } from "heap-js";
import * as THREE from "three";

import { InterestPoint } from "../interest-points";
import { SimulationMap } from "../simulation-map";
import type { SimulationResolution } from "../simulation-size";

import computeFragmentShader from './compute/navigation-compute.frag?raw';
import computeVertexShader from './compute/navigation-compute.vert?raw';
import renderFragmentShader from './render/navigation-render.frag?raw';
import renderVertexShader from './render/navigation-render.vert?raw';

export class NavigationMap extends SimulationMap {
	constructor(
		simulationResolution: SimulationResolution,
		coarseMapTexture: THREE.Texture,
		point: InterestPoint,
	) {
		const computeMaterial = new THREE.RawShaderMaterial({
			glslVersion: THREE.GLSL3,

			uniforms: {
				uInterestPointPosition: {
					value: point.downscaledPosition,
				},
				uTerrainTexture: { value: coarseMapTexture },
			},

			vertexShader: computeVertexShader,
			fragmentShader: computeFragmentShader,
		});

		super(
			simulationResolution,
			computeMaterial,
			texture => new THREE.RawShaderMaterial({
				glslVersion: THREE.GLSL3,

				uniforms: {
					uNavigation: {
						value: texture,
					},
				},

				vertexShader: renderVertexShader,
				fragmentShader: renderFragmentShader,

				transparent: true,
				depthWrite: false,
			}),
			1,
		);
	}
}

/** A finite value is used so navigation fields can safely be stored in textures. */
export const UNREACHABLE = 1e20;

type HeapEntry = {
	index: number;
	cost: number;
};

/**
 * Builds a row-major cost field leading away from `point`.
 *
 * Terrain values are traversal speeds in [0, 1]. Zero is impassable, one has
 * no terrain penalty, and costs for intermediate values are proportional to
 * their inverse speed. The returned costs are not normalized.
 *
 * Costs use native-pixel distance units.
 */
export function dijkstra(point: THREE.Vector2, map: Float32Array, simulationResolution: SimulationResolution): Float32Array {
	const width = simulationResolution.downscaled.x;
	const height = simulationResolution.downscaled.y;

	const navigationMap = new Float32Array(map.length);
	navigationMap.fill(UNREACHABLE);

	const pointIndex = point.y * width + point.x;
	if (map[pointIndex] === 0) {
		return navigationMap;
	}

	navigationMap[pointIndex] = 0;
	const queue = new Heap<HeapEntry>((a, b) => a.cost - b.cost);
	queue.push({ index: pointIndex, cost: 0 });

	while (queue.length > 0) {
		const current = queue.pop();
		if (current === undefined) {
			break;
		}
		if (current.cost !== navigationMap[current.index]) {
			continue;
		}

		const x = current.index % width;
		const y = Math.floor(current.index / width);
		const currentWeight = map[current.index];

		for (let offsetY = -1; offsetY <= 1; offsetY++) {
			const nextY = y + offsetY;
			if (nextY < 0 || nextY >= height) {
				continue;
			}

			for (let offsetX = -1; offsetX <= 1; offsetX++) {
				if (offsetX === 0 && offsetY === 0) {
					continue;
				}

				const nextX = x + offsetX;
				if (nextX < 0 || nextX >= width) {
					continue;
				}

				const nextIndex = nextY * width + nextX;
				const nextWeight = map[nextIndex];
				if (nextWeight === 0) {
					continue;
				}

				let distance = simulationResolution.downscaleFactor;
				if (offsetX !== 0 && offsetY !== 0) {
					distance *= Math.SQRT2;
				}

				const edgeCost = distance * ((1 / currentWeight + 1 / nextWeight) << 7);

				const candidate = Math.min(UNREACHABLE, current.cost + edgeCost);

				if (candidate < navigationMap[nextIndex]) {
					navigationMap[nextIndex] = candidate;
					queue.push({ index: nextIndex, cost: navigationMap[nextIndex] });
				}
			}
		}
	}

	return navigationMap;
}
