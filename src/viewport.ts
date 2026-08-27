import * as THREE from "three";

export function resize(
	renderer: THREE.WebGLRenderer,
	camera: THREE.OrthographicCamera,
	terrainTextureSize: THREE.Vector2,
): void {
	const canvas = renderer.domElement;
	const renderWidth = Math.floor(canvas.clientWidth * window.devicePixelRatio);
	const renderHeight = Math.floor(canvas.clientHeight * window.devicePixelRatio);

	if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
		renderer.setSize(renderWidth, renderHeight, false);

		const canvasAspect = canvas.clientWidth / canvas.clientHeight;
		const textureAspect = terrainTextureSize.width / terrainTextureSize.height;
		const cameraRight = canvasAspect > textureAspect ? terrainTextureSize.height * canvasAspect : terrainTextureSize.width;
		const cameraBottom = canvasAspect > textureAspect ? terrainTextureSize.height : terrainTextureSize.width / canvasAspect;

		camera.right = cameraRight;
		camera.bottom = -cameraBottom;
		camera.updateProjectionMatrix();
	}
}
