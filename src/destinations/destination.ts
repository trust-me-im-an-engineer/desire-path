import * as THREE from "three";

import type { SimulationResolution } from "../simulation-size";

export class Destination {
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
