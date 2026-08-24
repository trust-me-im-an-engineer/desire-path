import * as THREE from "three";

export type InterestPoint = {
	x: number;
	y: number;
	weight: number;
};

export function createInterestPoints(points: readonly InterestPoint[]) {
	const data = new Float32Array(points.length * 3);

	let i = 0;
	for (const point of points) {
		data[i++] = point.x;
		data[i++] = point.y;
		data[i++] = point.weight;
	}

	const texture = new THREE.DataTexture(
		data,
		points.length,
		1,
		THREE.RGBFormat,
		THREE.FloatType,
	);

	texture.colorSpace = THREE.NoColorSpace;
	texture.minFilter = THREE.NearestFilter;
	texture.magFilter = THREE.NearestFilter;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;

	// static render for now
	const markers = new THREE.Group();
	for (const point of points) {
		const marker = new THREE.Mesh(
			new THREE.CircleGeometry(point.weight),
			new THREE.MeshBasicMaterial({
				color: 0xd93d2b,
				depthTest: false,
				depthWrite: false,
			})
		);
		marker.position.set(point.x, -point.y, 1);
		markers.add(marker);
	}

	return {
		texture,
		markers,
	};
}