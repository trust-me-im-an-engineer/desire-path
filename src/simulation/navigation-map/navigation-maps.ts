import { Heap } from "heap-js";
import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/Addons.js";

import { Destination } from "../../terrain/destination";
import { CoarseMap } from "../coarse-map/coarse-map";
import type { SimulationResolution } from "../resolution";

import computeFragmentShader from './compute/navigation-compute.frag?raw';
import computeVertexShader from './compute/navigation-compute.vert?raw';
import renderFragmentShader from './render/navigation-render.frag?raw';
import renderVertexShader from './render/navigation-render.vert?raw';

export const UNREACHABLE = 1e30;

export class NavigationMaps {
	public readonly textureArray: THREE.DataArrayTexture;
	public readonly mesh: THREE.Mesh;

	private readonly computeMaterial: THREE.RawShaderMaterial;
	private readonly computePass: FullScreenQuad;

	private navigationRead: THREE.WebGLArrayRenderTarget;
	private navigationWrite: THREE.WebGLArrayRenderTarget;

	private readonly renderMaterial: THREE.RawShaderMaterial;

	private destinationCount: number;
	private maxReachableWeight: number[] = [];

	constructor(
		simulationResolution: SimulationResolution,
		coarseMap: CoarseMap,
		destinations: readonly Destination[],
		renderer: THREE.WebGLRenderer,
	) {
		const mapSize = simulationResolution.downscaled.width * simulationResolution.downscaled.height;

		const coarseMapArray = coarseMap.toArray(renderer);
		const data = new Float32Array(mapSize * destinations.length);
		for (const [i, destination] of destinations.entries()) {
			const destinationDownscaledPosition = new THREE.Vector2(
				Math.floor(destination.x / simulationResolution.downscaleFactor),
				simulationResolution.downscaled.height
				- 1
				- Math.floor(destination.y / simulationResolution.downscaleFactor),
			);

			const navigationMap = dijkstra(
				destinationDownscaledPosition,
				coarseMapArray,
				simulationResolution,
			);

			const reachableWeights = Array.from(navigationMap).filter(
				weight => Number.isFinite(weight) && weight < UNREACHABLE
			);
			reachableWeights.sort((a, b) => a - b);

			const weightIndex = Math.floor(0.9 * (reachableWeights.length - 1));
			const displayScale = Math.max(0.0001, reachableWeights[weightIndex] ?? 0);
			this.maxReachableWeight.push(displayScale);

			data.set(navigationMap, i * mapSize);
		}
		this.textureArray = new THREE.DataArrayTexture(
			data,
			simulationResolution.downscaled.width,
			simulationResolution.downscaled.height,
			destinations.length,
		);
		this.textureArray.format = THREE.RedFormat;
		this.textureArray.type = THREE.FloatType;
		this.textureArray.internalFormat = "R32F";
		this.textureArray.minFilter = THREE.NearestFilter;
		this.textureArray.magFilter = THREE.NearestFilter;
		this.textureArray.colorSpace = THREE.NoColorSpace;
		this.textureArray.needsUpdate = true;

		this.computeMaterial = new THREE.RawShaderMaterial({
			glslVersion: THREE.GLSL3,

			uniforms: {
				uTerrainTexture: { value: coarseMap.computeTarget.texture },
			},

			vertexShader: computeVertexShader,
			fragmentShader: computeFragmentShader,
		});

		this.computePass = new FullScreenQuad(this.computeMaterial);

		this.navigationRead = new THREE.WebGLArrayRenderTarget(
			simulationResolution.downscaled.width,
			simulationResolution.downscaled.height,
			destinations.length,
		);
		this.navigationWrite = this.navigationRead.clone();

		console.log(this.maxReachableWeight[0])

		// Render navigation map using its channel as transparency
		this.renderMaterial = new THREE.RawShaderMaterial({
			glslVersion: THREE.GLSL3,

			uniforms: {
				uNavigationMaps: { value: this.textureArray },
				uDestinationIndex: { value: 0 },
				uMaxReachableWeight: { value: this.maxReachableWeight[0] }
			},

			vertexShader: renderVertexShader,
			fragmentShader: renderFragmentShader,

			transparent: true,
			depthWrite: false,
		});

		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(simulationResolution.native.width, simulationResolution.native.height),
			this.renderMaterial,
		);
		this.mesh.position.set(
			simulationResolution.native.width / 2,
			-simulationResolution.native.height / 2,
			3,
		);

		this.destinationCount = destinations.length;
	}

	compute(renderer: THREE.WebGLRenderer): void {
		for (let i = 0; i < this.destinationCount; i++) {
			this.computeMaterial.uniforms.uDestinationIndex.value = i;

			// The second argument selects the array-texture layer.
			renderer.setRenderTarget(
				this.navigationWrite,
				i,
			);

			this.computePass.render(renderer);
		}

		// Swap only after every destination has been processed.
		[this.navigationRead, this.navigationWrite] = [
			this.navigationWrite,
			this.navigationRead,
		];

		this.computeMaterial.uniforms.uPreviousNavigationMaps.value = this.navigationRead.texture;
	}

	setDisplayedDestination(index: number): void {
		this.renderMaterial.uniforms.uDestinationIndex.value = index;
		this.renderMaterial.uniforms.uMaxReachableWeight.value = this.maxReachableWeight[index]
	}
}

type HeapEntry = {
	index: number;
	cost: number;
};

/**
 * Builds a row-major cost field leading away from `destination`.
 *
 * Terrain values are traversal speeds in [0, 1]. Zero is impassable, one has
 * no terrain penalty, and costs for intermediate values are proportional to
 * their inverse speed. The returned costs are not normalized.
 *
 * Costs use native-pixel distance units.
 */
function dijkstra(destination: THREE.Vector2, map: Float32Array, simulationResolution: SimulationResolution): Float32Array {
	const width = simulationResolution.downscaled.x;
	const height = simulationResolution.downscaled.y;

	const navigationMap = new Float32Array(map.length);
	navigationMap.fill(UNREACHABLE);

	const destinationIndex = destination.y * width + destination.x;
	if (map[destinationIndex] === 0) {
		return navigationMap;
	}

	navigationMap[destinationIndex] = 0;
	const queue = new Heap<HeapEntry>((a, b) => a.cost - b.cost);
	queue.push({ index: destinationIndex, cost: 0 });

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

				const edgeCost = distance * ((1 / currentWeight + 1 / nextWeight));

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
