import * as THREE from "three";

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
