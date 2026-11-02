import * as THREE from "three";
import * as controls from "./controls";
import * as viewport from "./viewport";

import { Playback } from "./playback";
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

const loadPreset = async function (name: string): Promise<Simulation> {
	const terrain: Terrain = presets[name];

	const terrainTexture = await new THREE.TextureLoader().loadAsync("assets/" + terrain.url);
	terrainTexture.generateMipmaps = false;
	terrainTexture.colorSpace = THREE.SRGBColorSpace;

	return new Simulation(renderer, terrainTexture, terrain.destinations, 8);
}

const selectPreset = document.getElementById("select-preset") as HTMLSelectElement;
selectPreset.addEventListener('change', async () => {
	console.log(selectPreset.value);
	const next = await loadPreset(selectPreset.value);
	scene.remove(simulation.group);
	scene.add(next.group);
	simulation = next;

	visibilityBindings.forEach(setVisibility => setVisibility());
	controls.bindNavigationMapsDebug(simulation.navigationMaps);
});

simulation = await loadPreset(selectPreset.value);
scene.add(simulation.group);

controls.bindInputPair('agentCount', value => simulation.agents.setCount(value));
controls.bindInputPair('agentSpeed', value => simulation.agents.setSpeed(value));
controls.bindInputPair('agentInertia', value => simulation.agents.setSteeringStrength(value));
controls.bindInputPair('agentSteeringExponent', value => simulation.agents.setSteeringExponent(value));

const visibilityBindings = [
	controls.bindVisibilityToggle("showTerrain", () => simulation.terrainMesh),
	controls.bindVisibilityToggle("showDestinations", () => simulation.destinations.group),
	controls.bindVisibilityToggle("showCoarseMap", () => simulation.coarseMap.mesh),
	controls.bindVisibilityToggle("showAgents", () => simulation.agents.mesh),
];
controls.bindNavigationMapsDebug(simulation.navigationMaps);

const playback = new Playback();
controls.bindPlayback(playback);

function frameRequestCallback() {
	// Resize camera and renderer according to current canvas size
	viewport.resize(renderer, camera, simulation.resolution);

	// Per-tick simulation
	if (playback.shouldAdvance()) {
		simulation.update(renderer);
	}

	// Render world
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
