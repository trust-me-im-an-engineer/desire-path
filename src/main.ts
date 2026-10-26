import * as THREE from "three";
import * as controls from "./controls";
import * as viewport from "./viewport";

import { Playback } from "./playback";
import { Destination } from "./simulation/destinations/destination";
import { Destinations } from "./simulation/destinations/destinations";
import { SimulationResolution } from "./simulation/resolution";
import { Simulation } from "./simulation/simulation";

const scene = new THREE.Scene();

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

// World origin point in top left corner of screen
const camera = new THREE.OrthographicCamera();
camera.left = 0;
camera.top = 0;
camera.position.z = 100;
camera.updateProjectionMatrix();

const terrainTexture = await new THREE.TextureLoader().loadAsync("assets/5.png");
terrainTexture.generateMipmaps = false;
terrainTexture.colorSpace = THREE.SRGBColorSpace;

const resolution = new SimulationResolution(
	terrainTexture.width,
	terrainTexture.height,
	8
);

const destinations = new Destinations([
	new Destination(new THREE.Vector2(200, 270), 12, resolution),
	new Destination(new THREE.Vector2(650, 264), 12, resolution),
	new Destination(new THREE.Vector2(501, 500), 12, resolution),
]);

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
