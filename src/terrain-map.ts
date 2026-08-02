import * as THREE from "three";

type TerrainMap = {
	displayTexture: THREE.Texture;
	terrainTexture: THREE.Texture;
	planeMesh: THREE.Mesh;
};

export async function loadTerrainMap(url: string): Promise<TerrainMap> {
	const loader = new THREE.TextureLoader();
	const loadedTexture = await loader.loadAsync(url);

	// User-visible map
	const displayTexture = loadedTexture;
	displayTexture.colorSpace = THREE.SRGBColorSpace;

	const textureAspect = displayTexture.width / displayTexture.height;

	const plane = new THREE.PlaneGeometry(textureAspect, 1);
	const planeMesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: displayTexture }));
	planeMesh.position.x = textureAspect / 2;
	planeMesh.position.y = -0.5;

	// Numeric terrain data
	const terrainTexture = loadedTexture.clone();
	terrainTexture.colorSpace = THREE.NoColorSpace;
	terrainTexture.generateMipmaps = false;
	terrainTexture.minFilter = THREE.LinearFilter;
	terrainTexture.magFilter = THREE.LinearFilter;
	terrainTexture.needsUpdate = true;

	return { displayTexture, terrainTexture, planeMesh };
}
