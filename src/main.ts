import * as THREE from "three";
import * as controls from "./controls";
import * as viewport from "./viewport";

import { Playback } from "./playback";
import { Agents } from "./simulation/agents/agents";
import { CoarseMap } from "./simulation/coarse-map/coarse-map";
import { Destination } from "./simulation/destinations/destination";
import { Destinations } from "./simulation/destinations/destinations";
import { NavigationMaps } from "./simulation/navigation-map/navigation-maps";
import { SimulationResolution } from "./simulation/simulation-size";

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

const simulationResolution = new SimulationResolution(
	terrainTexture.width,
	terrainTexture.height,
	8,
);

const terrainMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(simulationResolution.native.width, simulationResolution.native.height),
	new THREE.MeshBasicMaterial({ map: terrainTexture })
);
terrainMesh.position.set(simulationResolution.native.width / 2, -simulationResolution.native.height / 2);

const destinations = new Destinations([
	new Destination(new THREE.Vector2(200, 270), 12, simulationResolution),
	new Destination(new THREE.Vector2(650, 264), 12, simulationResolution),
	new Destination(new THREE.Vector2(501, 500), 12, simulationResolution),
]);

const coarseMap = new CoarseMap(simulationResolution, terrainTexture);

coarseMap.compute(renderer);

const navigationMaps = new NavigationMaps(
	simulationResolution,
	coarseMap,
	destinations.items,
	renderer,
);
navigationMaps.mesh.visible = false;

const agents = new Agents(
	simulationResolution,
	terrainTexture,
	coarseMap.computeTarget.texture,
	destinations,
	navigationMaps.textureArray,
	renderer,
	4,
	(document.getElementById('agentSpeedNumber') as HTMLInputElement).valueAsNumber,
	(document.getElementById('agentCountNumber') as HTMLInputElement).valueAsNumber,
);

scene.add(
	terrainMesh,
	coarseMap.mesh,
	navigationMaps.mesh,
	agents.mesh,
	destinations.group,
);

controls.bindVisibilityToggle("showTerrain", terrainMesh);
controls.bindVisibilityToggle("showDestinations", destinations.group);
controls.bindVisibilityToggle("showCoarseMap", coarseMap.mesh);
controls.bindVisibilityToggle("showAgents", agents.mesh);

controls.bindNavigationMapsDebug(navigationMaps);

controls.bindInputPair('agentCount', value => agents.setCount(value));
controls.bindInputPair('agentSpeed', value => agents.setSpeed(value));
controls.bindInputPair('agentInertia', value => agents.setSteeringStrength(value));
controls.bindInputPair('agentSteeringExponent', value => agents.setSteeringExponent(value));

const playback = new Playback();
controls.bindPlayback(playback);

let readingState = false;

async function updateAgentDebug() {
	if (readingState) return;

	readingState = true;
	try {
		const state = await agents.read0thAgentState(renderer);
		const element = document.getElementById("agentState");
		if (element) {
			element.textContent = JSON.stringify(state, null, 2);
		}
	} catch (error) {
		console.error("Failed to read agent state", error);
	} finally {
		readingState = false;
	}
}

async function frameRequestCallback() {
	// Resize camera and renderer according to current canvas size
	viewport.resize(renderer, camera, simulationResolution);

	// Per-tick simulation
	if (playback.shouldAdvance()) {
		agents.compute(renderer);
	}

	if (playback.paused) {
		void updateAgentDebug();
	}

	// Render world
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
