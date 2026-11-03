import * as THREE from "three";
import * as viewport from "./viewport";

import { Controls } from "./controls";
import { Simulation } from "./simulation/simulation";
import { presets, Terrain } from "./terrain/terrain";

const scene = new THREE.Scene();

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

// World origin point in top left corner of screen
const camera = new THREE.OrthographicCamera();
camera.left = 0;
camera.top = 0;
camera.position.z = 100;
camera.updateProjectionMatrix();

let simulation: Simulation;
let terrainTexture: THREE.Texture;
let controls: Controls;

const loadPreset = async function (name: string): Promise<Simulation> {
    const terrain: Terrain = presets[name];

    terrainTexture = await new THREE.TextureLoader().loadAsync(
        "assets/" + terrain.url,
    );
    terrainTexture.generateMipmaps = false;
    terrainTexture.colorSpace = THREE.SRGBColorSpace;

    return new Simulation(renderer, terrainTexture, terrain.destinations, 8);
};

const selectPreset = document.getElementById(
    "select-preset",
) as HTMLSelectElement;
selectPreset.addEventListener("change", async () => {
    const next = await loadPreset(selectPreset.value);
    scene.remove(simulation.group);
    scene.add(next.group);

    const oldSimulation = simulation;
    const oldTerrainTexture = terrainTexture;

    simulation = next;

    oldTerrainTexture.dispose();
    oldSimulation.dispose();

    controls.simulation = simulation;
    controls.apply();
});

simulation = await loadPreset(selectPreset.value);
scene.add(simulation.group);

controls = new Controls(simulation);

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
