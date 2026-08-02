import * as THREE from "three";
import { loadTerrainMap } from "./terrain-map";
import { resizeToDisplaySize } from "./viewport";

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const camera = new THREE.OrthographicCamera();

camera.position.z = 100;

const terrainMap = await loadTerrainMap("assets/5.png");
scene.add(terrainMap.planeMesh);

function frameRequestCallback(timeMs: number) {
	resizeToDisplaySize(renderer, camera, terrainMap.displayTexture);

	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
