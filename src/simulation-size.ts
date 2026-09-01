import * as THREE from "three";

export class SimulationResolution {
	readonly native: THREE.Vector2;
	readonly downscaled: THREE.Vector2;

	constructor(
		readonly width: number,
		readonly height: number,
		readonly downscaleFactor: number,
	) {
		this.native = new THREE.Vector2(width, height);
		this.downscaled = new THREE.Vector2(
			Math.floor(width / downscaleFactor),
			Math.floor(height / downscaleFactor),
		);
	}
}
