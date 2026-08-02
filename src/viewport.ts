import * as THREE from "three";

export function resizeToDisplaySize(
	renderer: THREE.WebGLRenderer,
	camera: THREE.OrthographicCamera,
	displayTexture: THREE.Texture,
): void {
	const canvas = renderer.domElement;
	const displayWidth = canvas.clientWidth;
	const displayHeight = canvas.clientHeight;
	const renderWidth = Math.floor(displayWidth * window.devicePixelRatio);
	const renderHeight = Math.floor(displayHeight * window.devicePixelRatio);

	if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
		renderer.setSize(renderWidth, renderHeight, false);

		const canvasAspect = displayWidth / displayHeight;
		const textureAspect = displayTexture.width / displayTexture.height;
		const viewWidth = canvasAspect > textureAspect
			? displayTexture.height * canvasAspect
			: displayTexture.width;
		const viewHeight = canvasAspect > textureAspect
			? displayTexture.height
			: displayTexture.width / canvasAspect;

		camera.left = -viewWidth / 2;
		camera.right = viewWidth / 2;
		camera.top = viewHeight / 2;
		camera.bottom = -viewHeight / 2;
		camera.updateProjectionMatrix();
	}
}
