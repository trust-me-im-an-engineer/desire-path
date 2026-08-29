import * as THREE from "three";

export type SimulationResolution = {
	native: THREE.Vector2,
	downscaled: THREE.Vector2,
	downscaleFactor: number,
}
