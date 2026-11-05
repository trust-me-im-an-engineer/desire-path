import * as THREE from "three";

export class SimulationResolution {
    readonly native: THREE.Vector2;
    readonly downscaled: THREE.Vector2;
    readonly cellSize: THREE.Vector2;

    constructor(width: number, height: number, targetCellSize: number) {
        this.native = new THREE.Vector2(width, height);

        const columns = Math.max(1, Math.round(width / targetCellSize));
        const rows = Math.max(1, Math.round(height / targetCellSize));

        this.cellSize = new THREE.Vector2(width / columns, height / rows);

        this.downscaled = this.native.clone();
        this.downscaled.divide(this.cellSize);
    }
}
