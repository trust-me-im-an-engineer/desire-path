import * as THREE from "three";

import type { SimulationResolution } from "./simulation-size";

export class InterestPoint {
	public downscaledPosition: THREE.Vector2;

	constructor(
		public nativePosition: THREE.Vector2,
		public weight: number,
		simulationResolution: SimulationResolution,
	) {
		this.downscaledPosition = new THREE.Vector2(
			Math.floor(nativePosition.x / simulationResolution.downscaleFactor),
			simulationResolution.downscaled.height
				- 1
				- Math.floor(nativePosition.y / simulationResolution.downscaleFactor),
		);
	}
}

export function createInterestPointsGroup(points: readonly InterestPoint[]): THREE.Group {
	const group = new THREE.Group();
	for (const point of points) {
		const pointMesh = new THREE.Mesh(
			new THREE.CircleGeometry(point.weight),
			new THREE.MeshBasicMaterial({ color: 0x00ff00 })
		);
		pointMesh.position.set(point.nativePosition.x, -point.nativePosition.y, 4);
		group.add(pointMesh);
	}
	return group;
}
