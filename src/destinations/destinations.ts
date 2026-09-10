import * as THREE from "three";

import { Destination } from "./destination";

export const MAX_COUNT = 32;

export class Destinations {
	public readonly group: THREE.Group;
	public readonly texture: THREE.Texture;
	public readonly totalWeight: number;

	constructor(
		public items: Destination[],
	) {
		this.group = new THREE.Group();
		for (const destination of items) {
			const destinationMesh = new THREE.Mesh(
				new THREE.CircleGeometry(destination.weight),
				new THREE.MeshBasicMaterial({ color: 0x00ff00 })
			);
			destinationMesh.position.set(destination.nativePosition.x, -destination.nativePosition.y, 4);
			this.group.add(destinationMesh);
		}

		this.totalWeight = 0;

		const data = new Float32Array(3 * MAX_COUNT);
		for (let i = 0; i < items.length; i++) {
			data[3 * i] = items[i].nativePosition.x;
			data[3 * i + 1] = items[i].nativePosition.y;
			data[3 * i + 2] = items[i].weight;

			this.totalWeight += items[i].weight;
		}
		this.texture = new THREE.DataTexture(
			data,
			MAX_COUNT,
			1,
			THREE.RGBFormat,
			THREE.FloatType,
		)
		this.texture.internalFormat = "RGB32F";
		this.texture.minFilter = THREE.NearestFilter;
		this.texture.magFilter = THREE.NearestFilter;
		this.texture.generateMipmaps = false;
		this.texture.colorSpace = THREE.NoColorSpace;
		this.texture.needsUpdate = true;
	}
}
