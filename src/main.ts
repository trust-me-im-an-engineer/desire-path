import * as THREE from "three";
import * as controls from "./controls";
import * as viewport from "./viewport";

import { Playback } from "./playback";
import { Destinations } from "./simulation/destinations/destinations";
import { SimulationResolution } from "./simulation/resolution";
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

const terrain: Terrain = presets[1];

const terrainTexture = await new THREE.TextureLoader().loadAsync("assets/" + terrain.url);
terrainTexture.generateMipmaps = false;
terrainTexture.colorSpace = THREE.SRGBColorSpace;

const resolution = new SimulationResolution(
	terrainTexture.width,
	terrainTexture.height,
	8
);

const destinations = new Destinations(terrain.destinations);

const simulation = new Simulation(renderer, terrainTexture, resolution, destinations);
scene.add(simulation.group);

controls.bindInputPair('agentCount', value => simulation.agents.setCount(value));
controls.bindInputPair('agentSpeed', value => simulation.agents.setSpeed(value));
controls.bindInputPair('agentInertia', value => simulation.agents.setSteeringStrength(value));
controls.bindInputPair('agentSteeringExponent', value => simulation.agents.setSteeringExponent(value));

controls.bindVisibilityToggle("showTerrain", simulation.terrainMesh);
controls.bindVisibilityToggle("showDestinations", simulation.destinations.group);
controls.bindNavigationMapsDebug(simulation.navigationMaps);
controls.bindVisibilityToggle("showCoarseMap", simulation.coarseMap.mesh);
controls.bindVisibilityToggle("showAgents", simulation.agents.mesh);

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
