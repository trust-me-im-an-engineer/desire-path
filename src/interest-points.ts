import * as THREE from "three";

export class InterestPoint {
	public downscaledPosition: THREE.Vector2;

	constructor(
		public nativePosition: THREE.Vector2,
		public weight: number,
		downscaleFactor: number,
	) {
		this.downscaledPosition = nativePosition.clone().divideScalar(downscaleFactor).floor();
	}
}

export function createInterestPointsGroup(points: readonly InterestPoint[]): THREE.Group {
	const group = new THREE.Group();
	for (const point of points) {
		const pointMesh = new THREE.Mesh(
			new THREE.CircleGeometry(point.weight),
			new THREE.MeshBasicMaterial({ color: 0xd93d2b })
		);
		pointMesh.position.set(point.nativePosition.x, -point.nativePosition.y, 2);
		group.add(pointMesh);
	}
	return group;
}
