import * as THREE from "three";

import type { SimulationResolution } from "./simulation/resolution";

export function resize(
    renderer: THREE.WebGLRenderer,
    camera: THREE.OrthographicCamera,
    simulationResolution: SimulationResolution,
): void {
    const canvas = renderer.domElement;

    const renderWidth = Math.floor(
        canvas.clientWidth * window.devicePixelRatio,
    );
    const renderHeight = Math.floor(
        canvas.clientHeight * window.devicePixelRatio,
    );

    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        renderer.setSize(renderWidth, renderHeight, false);
    }

    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        return;
    }

    const canvasAspect = canvas.clientWidth / canvas.clientHeight;
    const textureAspect =
        simulationResolution.native.width / simulationResolution.native.height;

    let cameraRight = simulationResolution.native.width;
    let cameraTop = simulationResolution.native.width / canvasAspect;

    if (canvasAspect > textureAspect) {
        cameraRight = simulationResolution.native.height * canvasAspect;
        cameraTop = simulationResolution.native.height;
    }

    // Simulation dimensions can change independently of the canvas size.
    if (camera.right !== cameraRight || camera.top !== cameraTop) {
        camera.right = cameraRight;
        camera.top = cameraTop;
        camera.updateProjectionMatrix();
    }
}
