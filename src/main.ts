import * as THREE from "three";
import { loadTerrainMap } from "./terrain-map";
import { createInterestPoints } from "./interest-points";
import { resizeToDisplaySize } from "./viewport";

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const camera = new THREE.OrthographicCamera();

camera.position.z = 100;
camera.left = 0;
camera.top = 0;
camera.bottom = -1;

const terrainMap = await loadTerrainMap("assets/2.png");
scene.add(terrainMap.planeMesh);

const interestPoints = createInterestPoints(
	[
		{ x: 0.25, y: 0.45 },
		{ x: 1.50, y: 0.43 },
	]
);

scene.add(interestPoints.markers);

function frameRequestCallback(timeMs: number) {
	resizeToDisplaySize(renderer, camera, terrainMap.displayTexture);

	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
