import * as THREE from "three";

export type InterestPoint = {
	x: number;
	y: number;
};

export function createInterestPoints(points: readonly InterestPoint[]) {
	const data = new Float32Array(points.length * 2);

	for (let i = 0; i < points.length; i++) {
		data[i * 2] = points[i].x;
		data[i * 2 + 1] = points[i].y;
	}

	const texture = new THREE.DataTexture(
		data,
		points.length,
		1,
		THREE.RGFormat,
		THREE.FloatType,
	);

	texture.colorSpace = THREE.NoColorSpace;
	texture.minFilter = THREE.NearestFilter;
	texture.magFilter = THREE.NearestFilter;
	texture.generateMipmaps = false;
	texture.needsUpdate = true;

	// static render for now
	const markers = new THREE.Group();
	const geometry = new THREE.CircleGeometry(0.02);
	const material = new THREE.MeshBasicMaterial({
		color: 0xd93d2b,
		depthTest: false,
		depthWrite: false,
	});
	for (const point of points) {
		const marker = new THREE.Mesh(geometry, material);
		marker.position.set(point.x, -point.y, 1);
		markers.add(marker);
	}

	return {
		count: points.length,
		texture,
		markers,
	};
}