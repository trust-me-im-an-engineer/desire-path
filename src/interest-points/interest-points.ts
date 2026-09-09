import * as THREE from "three";

import { InterestPoint } from "./interest-point";

export const TEXTURE_WIDTH = 8;

export class InterestPoints {
	public readonly group: THREE.Group;
	public readonly texture: THREE.Texture;

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

		const data = new Float32Array(3 * TEXTURE_WIDTH ** 2);
		for (let i = 0; i < data.length; i += 3) {
			data[i] = points[0].nativePosition.x;
			data[i + 1] = points[0].nativePosition.y;
			data[i + 2] = points[0].weight;
		}
		this.texture = new THREE.DataTexture(
			data,
			TEXTURE_WIDTH,
			TEXTURE_WIDTH,
			THREE.RGBFormat,
			THREE.FloatType,
		)
		this.texture.minFilter = THREE.NearestFilter;
		this.texture.magFilter = THREE.NearestFilter;
		this.texture.generateMipmaps = false;
		this.texture.colorSpace = THREE.NoColorSpace;
		this.texture.needsUpdate = true;
	}
}
