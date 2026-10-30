import * as THREE from "three";

import { Destination } from "../terrain/terrain";
import { Agents } from "./agents/agents";
import { CoarseMap } from "./coarse-map/coarse-map";
import { Destinations } from "./destinations/destinations";
import { NavigationMaps } from "./navigation-map/navigation-maps";
import { SimulationResolution } from "./resolution";

export class Simulation {
	public readonly resolution: SimulationResolution;
	public readonly terrainMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
	public readonly destinations: Destinations;
	public readonly coarseMap: CoarseMap;
	public readonly navigationMaps: NavigationMaps;
	public readonly agents: Agents;
	public readonly group = new THREE.Group();

	constructor(
		renderer: THREE.WebGLRenderer,
		terrainTexture: THREE.Texture,
		destinations: Destination[],
		downscaleFactor: number,
	) {
		this.resolution = new SimulationResolution(
			terrainTexture.width,
			terrainTexture.height,
			downscaleFactor,
		);

		this.terrainMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(this.resolution.native.width, this.resolution.native.height),
			new THREE.MeshBasicMaterial({ map: terrainTexture }),
		);
		this.terrainMesh.position.set(
			this.resolution.native.width / 2,
			-this.resolution.native.height / 2
		);

		this.destinations = new Destinations(destinations);

		this.coarseMap = new CoarseMap(this.resolution, terrainTexture);
		this.coarseMap.compute(renderer);

		this.navigationMaps = new NavigationMaps(
			this.resolution,
			this.coarseMap,
			this.destinations.items,
			renderer,
		);

		this.agents = new Agents(
			this.resolution,
			terrainTexture,
			this.coarseMap.computeTarget.texture,
			this.destinations,
			this.navigationMaps.textureArray,
			renderer,
			4,
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
