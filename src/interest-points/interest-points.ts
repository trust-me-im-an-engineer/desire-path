import * as THREE from "three";

import { InterestPoint } from "./interest-point";

export class InterestPoints {
	public readonly group: THREE.Group;

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
	}
}
