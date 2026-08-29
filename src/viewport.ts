import * as THREE from "three";

import type { SimulationResolution } from "./simulation-size";

export function resize(
	renderer: THREE.WebGLRenderer,
	camera: THREE.OrthographicCamera,
	simulationResolution: SimulationResolution,
): void {
	const canvas = renderer.domElement;
	const renderWidth = Math.floor(canvas.clientWidth * window.devicePixelRatio);
	const renderHeight = Math.floor(canvas.clientHeight * window.devicePixelRatio);

	if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
		renderer.setSize(renderWidth, renderHeight, false);

		const canvasAspect = canvas.clientWidth / canvas.clientHeight;
		const textureAspect = simulationResolution.native.width / simulationResolution.native.height;
		let cameraRight = simulationResolution.native.width;
		let cameraBottom = simulationResolution.native.width / canvasAspect;
		if (canvasAspect > textureAspect) {
			cameraRight = simulationResolution.native.height * canvasAspect;
			cameraBottom = simulationResolution.native.height;
		}

		camera.right = cameraRight;
		camera.bottom = -cameraBottom;
		camera.updateProjectionMatrix();
	}
}
