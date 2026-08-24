import * as THREE from "three";

export function resize(
	renderer: THREE.WebGLRenderer,
	camera: THREE.OrthographicCamera,
	textureAspect: number,
): void {
	const canvas = renderer.domElement;
	const renderWidth = Math.floor(canvas.clientWidth * window.devicePixelRatio);
	const renderHeight = Math.floor(canvas.clientHeight * window.devicePixelRatio);

	if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
		renderer.setSize(renderWidth, renderHeight, false);

		const canvasAspect = canvas.clientWidth / canvas.clientHeight;
		const cameraWidth = canvasAspect > textureAspect ? canvasAspect : textureAspect;
		const cameraHeight = canvasAspect > textureAspect ? 1 : textureAspect / canvasAspect;

		camera.right = cameraWidth;
		camera.bottom = -cameraHeight;
		camera.updateProjectionMatrix();
	}
}
