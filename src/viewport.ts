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

    let cameraWidth = simulationResolution.native.width;
    let cameraHeight = simulationResolution.native.width / canvasAspect;

    if (canvasAspect > textureAspect) {
        cameraWidth = simulationResolution.native.height * canvasAspect;
        cameraHeight = simulationResolution.native.height;
    }

    if (
        camera.right !== cameraWidth / 2 ||
        camera.left !== cameraWidth / 2 ||
        camera.top !== cameraHeight / 2 ||
        camera.bottom !== cameraHeight / 2
    ) {
        camera.right = cameraWidth / 2;
        camera.left = -cameraWidth / 2;
        camera.top = cameraHeight / 2;
        camera.bottom = -cameraHeight / 2;
        camera.updateProjectionMatrix();
    }
}
