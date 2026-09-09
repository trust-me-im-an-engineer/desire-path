import * as THREE from "three";

import { InterestPoint } from "./interest-point";

export const MAX_COUNT = 32;

export class InterestPoints {
	public readonly group: THREE.Group;
	public readonly texture: THREE.Texture;
	public readonly totalWeight: number;

	constructor(
		public points: InterestPoint[],
	) {
		this.group = new THREE.Group();
		for (const point of points) {
			const pointMesh = new THREE.Mesh(
				new THREE.CircleGeometry(point.weight),
				new THREE.MeshBasicMaterial({ color: 0x00ff00 })
			);
			pointMesh.position.set(point.nativePosition.x, -point.nativePosition.y, 4);
			this.group.add(pointMesh);
		}

		this.totalWeight = 0;

		const data = new Float32Array(3 * MAX_COUNT);
		for (let i = 0; i < points.length; i++) {
			data[3 * i] = points[i].nativePosition.x;
			data[3 * i + 1] = points[i].nativePosition.y;
			data[3 * i + 2] = points[i].weight;

			this.totalWeight += points[i].weight;
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
