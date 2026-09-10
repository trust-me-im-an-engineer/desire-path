import * as THREE from "three";

import { Agents } from "./agents/agents";
import { CoarseMap } from "./coarse-map/coarse-map";
import { Destination } from "./destinations/destination";
import { Destinations } from "./destinations/destinations";
import { NavigationMaps } from "./navigation-map/navigation-maps";
import { SimulationResolution } from "./simulation-size";
import { resize } from "./viewport";

const SIMULATION_DOWNSCALE_FACTOR = 8;

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

// World origin point in top left corner of screen
const camera = new THREE.OrthographicCamera();
camera.left = 0;
camera.top = 0;
camera.position.z = 100;
camera.updateProjectionMatrix();

const terrainTexture = await new THREE.TextureLoader().loadAsync("assets/2.png");
terrainTexture.generateMipmaps = false;
terrainTexture.colorSpace = THREE.SRGBColorSpace;

const simulationResolution = new SimulationResolution(
	terrainTexture.width,
	terrainTexture.height,
	SIMULATION_DOWNSCALE_FACTOR,
);

const terrainMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(simulationResolution.native.width, simulationResolution.native.height),
	new THREE.MeshBasicMaterial({ map: terrainTexture })
);
terrainMesh.position.set(simulationResolution.native.width / 2, -simulationResolution.native.height / 2);
scene.add(terrainMesh);

const destinations = new Destinations([
	new Destination(new THREE.Vector2(200, 270), 12, simulationResolution),
	new Destination(new THREE.Vector2(800, 264), 12, simulationResolution),
	// new Destination(new THREE.Vector2(501, 400), 12, simulationResolution),
]);
scene.add(destinations.group);

const coarseMap = new CoarseMap(simulationResolution, terrainTexture);
scene.add(coarseMap.mesh);

coarseMap.compute(renderer);

const navigationMaps = new NavigationMaps(
	simulationResolution,
	coarseMap,
	destinations.items,
	renderer,
);
scene.add(navigationMaps.mesh);

const agents = new Agents(
	simulationResolution,
	terrainTexture,
	coarseMap.computeTarget.texture,
	destinations,
	renderer,
	5,
	100,
);
scene.add(agents.mesh);

function bindVisibilityToggle(id: string, object: THREE.Object3D): void {
	const toggle = document.getElementById(id);
	if (!(toggle instanceof HTMLInputElement)) {
		throw new Error(`Visibility toggle #${id} not found`);
	}

	object.visible = toggle.checked;
	toggle.addEventListener("change", () => {
		object.visible = toggle.checked;
	});
}

bindVisibilityToggle("showTerrain", terrainMesh);
bindVisibilityToggle("showDestinations", destinations.group);
bindVisibilityToggle("showCoarseMap", coarseMap.mesh);
bindVisibilityToggle("showNavigationMap", navigationMaps.mesh);
bindVisibilityToggle("showAgents", agents.mesh);

function frameRequestCallback() {
	// Resize camera and renderer according to current canvas size
	resize(renderer, camera, simulationResolution);

	agents.compute(renderer);

	// Render world
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
