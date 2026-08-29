import * as THREE from "three";

import { createCoarseMap } from "./coarse-map/coarse-map";
import { createInterestPointsGroup, InterestPoint } from "./interest-points";
import { createNavigationMap, dijkstra } from "./navigation-map/navigation-map";
import type { SimulationResolution } from "./simulation-size";
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

const simulationResolution: SimulationResolution = {
	native: new THREE.Vector2(terrainTexture.width, terrainTexture.height),
	downscaled: new THREE.Vector2(
		Math.floor(terrainTexture.width / SIMULATION_DOWNSCALE_FACTOR),
		Math.floor(terrainTexture.height / SIMULATION_DOWNSCALE_FACTOR),
	),
	downscaleFactor: SIMULATION_DOWNSCALE_FACTOR,
};

const terrainMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(simulationResolution.native.width, simulationResolution.native.height),
	new THREE.MeshBasicMaterial({ map: terrainTexture })
);
terrainMesh.position.set(simulationResolution.native.width / 2, -simulationResolution.native.height / 2);
scene.add(terrainMesh);

const interestPoints: readonly InterestPoint[] = [
	new InterestPoint(new THREE.Vector2(200, 270), 12, simulationResolution.downscaleFactor),
	new InterestPoint(new THREE.Vector2(800, 264), 12, simulationResolution.downscaleFactor),
];

const interestPointsGroup = createInterestPointsGroup(interestPoints);
scene.add(interestPointsGroup);

const coarseMap = createCoarseMap(simulationResolution, terrainTexture);
// scene.add(coarseMap.mesh);

const navigationMap = createNavigationMap(simulationResolution, coarseMap.computeTarget.texture, interestPoints[0]);
scene.add(navigationMap.mesh);

coarseMap.compute(renderer);
const coarseMapArray = coarseMap.toArray(renderer);

const navigationMapArray = dijkstra(interestPoints[0].downscaledPosition, coarseMapArray, simulationResolution);

navigationMap.compute(renderer);

function frameRequestCallback() {
	// Resize camera and renderer according to current canvas size
	resize(renderer, camera, simulationResolution);

	// Render world
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
