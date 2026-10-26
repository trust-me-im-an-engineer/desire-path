import * as THREE from "three";

import { Agents } from "./agents/agents";
import { CoarseMap } from "./coarse-map/coarse-map";
import { Destination } from "./destinations/destination";
import { Destinations } from "./destinations/destinations";
import { NavigationMaps } from "./navigation-map/navigation-maps";

export type SimulationOptions = {
	downscaleFactor: number;
	destinations: readonly { x: number; y: number; weight: number }[];
	agentSpeed: number;
	agentCount: number;
}

export class SimulationResolution {
	readonly native: THREE.Vector2;
	readonly downscaled: THREE.Vector2;

	constructor(
		width: number,
		height: number,
		readonly downscaleFactor: number,
	) {
		this.native = new THREE.Vector2(width, height);
		this.downscaled = new THREE.Vector2(
			Math.floor(width / downscaleFactor),
			Math.floor(height / downscaleFactor),
		);
	}
}

export class Simulation {
	public readonly group = new THREE.Group();
	public readonly resolution: SimulationResolution;
	public readonly terrainMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
	public readonly destinations: Destinations;
	public readonly coarseMap: CoarseMap;
	public readonly navigationMaps: NavigationMaps;
	public readonly agents: Agents;

	constructor(
		renderer: THREE.WebGLRenderer,
		terrainTexture: THREE.Texture,
		options: SimulationOptions,
	) {
		this.resolution = new SimulationResolution(
			terrainTexture.width,
			terrainTexture.height,
			options.downscaleFactor,
		);
		const { native } = this.resolution;
		this.terrainMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(native.width, native.height),
			new THREE.MeshBasicMaterial({ map: terrainTexture }),
		);
		this.terrainMesh.position.set(native.width / 2, -native.height / 2);

		this.destinations = new Destinations(options.destinations.map(destination =>
			new Destination(
				new THREE.Vector2(destination.x, destination.y),
				destination.weight,
				this.resolution,
			),
		));

		this.coarseMap = new CoarseMap(this.resolution, terrainTexture);
		this.coarseMap.compute(renderer);

		this.navigationMaps = new NavigationMaps(
			this.resolution,
			this.coarseMap,
			this.destinations.items,
			renderer,
		);
		this.navigationMaps.mesh.visible = false;

		this.agents = new Agents(
			this.resolution,
			terrainTexture,
			this.coarseMap.computeTarget.texture,
			this.destinations,
			this.navigationMaps.textureArray,
			renderer,
			4,
			options.agentSpeed,
			options.agentCount,
		);

		this.group.add(
			this.terrainMesh,
			this.coarseMap.mesh,
			this.navigationMaps.mesh,
			this.agents.mesh,
			this.destinations.group,
		);
	}

	update(renderer: THREE.WebGLRenderer): void {
		this.agents.compute(renderer);
	}
}
