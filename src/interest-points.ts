import * as THREE from "three";

export class InterestPoint {
	constructor(
		public nativeResolutionPosition: THREE.Vector2,
		public weight: number,
	) {}
}

export function createInterestPointsGroup(points: readonly InterestPoint[]): THREE.Group {
	const group = new THREE.Group();
	for (const point of points) {
		const pointMesh = new THREE.Mesh(
			new THREE.CircleGeometry(point.weight),
			new THREE.MeshBasicMaterial({ color: 0xd93d2b })
		);
		pointMesh.position.set(point.nativeResolutionPosition.x, -point.nativeResolutionPosition.y, 2);
		group.add(pointMesh);
	}
	return group;
}
