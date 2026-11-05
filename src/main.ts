import * as THREE from "three";
import * as viewport from "./viewport";

import { Controls } from "./controls";
import { Simulation } from "./simulation/simulation";
import { loadPreset } from "./terrain/terrain";

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("simulationCanvas") as HTMLCanvasElement,
    alpha: true,
});

// World origin point in top left corner of screen
const camera = new THREE.OrthographicCamera();
camera.left = 0;
camera.top = 0;
camera.position.z = 100;
camera.updateProjectionMatrix();

let simulation: Simulation;
let terrainTexture: THREE.Texture;
let controls: Controls;

const selectPreset = document.getElementById(
    "select-preset",
) as HTMLSelectElement;

({ terrainTexture, simulation } = await loadPreset(
    selectPreset.value,
    renderer,
));
scene.add(simulation.group);

controls = new Controls(simulation);

selectPreset.addEventListener("change", async () => {
    const oldSimulation = simulation;
    const oldTerrainTexture = terrainTexture;

    ({ terrainTexture, simulation } = await loadPreset(
        selectPreset.value,
        renderer,
    ));

    // update scene with new simulation
    scene.remove(oldSimulation.group);
    scene.add(simulation.group);

    // update controls with new simulation
    controls.simulation = simulation;
    controls.apply();

    // dispose old simulation
    oldTerrainTexture.dispose();
    oldSimulation.dispose();
});

function frameRequestCallback() {
    // Resize camera and renderer according to current canvas size
    viewport.resize(renderer, camera, simulation.resolution);

    // Per-tick simulation
    simulation.update(renderer);

    // Render world
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
