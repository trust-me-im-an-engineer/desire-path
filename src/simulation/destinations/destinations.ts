import * as THREE from "three";
import { Destination } from "../../terrain/terrain";
import { SimulationResolution } from "../resolution";

export const MAX_COUNT = 32;

export class Destinations {
    public readonly group: THREE.Group;
    public readonly texture: THREE.Texture;
    public readonly totalWeight: number;

    constructor(
        public items: Destination[],
        cellSize: THREE.Vector2,
        resolution: SimulationResolution,
    ) {
        this.group = new THREE.Group();
        this.group.position.set(
            -resolution.native.width / 2,
            -resolution.native.height / 2,
            0,
        );

        for (const destination of items) {
            const destinationMesh = new THREE.Mesh(
                new THREE.CircleGeometry(destination.weight),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
            );
            destinationMesh.position.set(
                destination.x - (destination.x % cellSize.x) + cellSize.x / 2,
                destination.y - (destination.y % cellSize.y) + cellSize.y / 2,
                5,
            );
            this.group.add(destinationMesh);
        }

        this.totalWeight = 0;

        const data = new Float32Array(3 * MAX_COUNT);
        for (let i = 0; i < items.length; i++) {
            data[3 * i] =
                items[i].x - (items[i].x % cellSize.x) + cellSize.x / 2;
            data[3 * i + 1] =
                items[i].y - (items[i].y % cellSize.y) + cellSize.y / 2;
            data[3 * i + 2] = items[i].weight;

            this.totalWeight += items[i].weight;
        }
        this.texture = new THREE.DataTexture(
            data,
            MAX_COUNT,
            1,
            THREE.RGBFormat,
            THREE.FloatType,
        );
        this.texture.internalFormat = "RGB32F";
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.generateMipmaps = false;
        this.texture.colorSpace = THREE.NoColorSpace;
        this.texture.needsUpdate = true;
    }

    dispose(): void {
        this.texture.dispose();

        for (const child of this.group.children) {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        }

        this.group.clear();
    }
}
