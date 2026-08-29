import * as THREE from "three";
import { createInterestPointsGroup, type InterestPoint } from "./interest-points";
import { resize } from "./viewport";

import { createCoarseMap } from "./coarse-map/coarse-map";
import { createNavigationMap } from "./navigation-map/navigation-map";

const COARSE_MAP_DOWNSCALE = 8;

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

const nativeSize = new THREE.Vector2(terrainTexture.width, terrainTexture.height);

const terrainMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(nativeSize.width, nativeSize.height),
	new THREE.MeshBasicMaterial({ map: terrainTexture })
);
terrainMesh.position.set(nativeSize.width / 2, -nativeSize.height / 2);
scene.add(terrainMesh);

const interestPoints: readonly InterestPoint[] = [
	{ position: new THREE.Vector2(200, 270), weight: 12 },
	{ position: new THREE.Vector2(800, 264), weight: 12 },
];

const interestPointsGroup = createInterestPointsGroup(interestPoints);
scene.add(interestPointsGroup);

const coarseMap = createCoarseMap(nativeSize, COARSE_MAP_DOWNSCALE, terrainTexture);
// scene.add(coarseMap.mesh);

const navigationMap = createNavigationMap(nativeSize, COARSE_MAP_DOWNSCALE, coarseMap.computeTarget.texture, interestPoints[0]);
// scene.add(navigationMap.mesh);

function frameRequestCallback() {
	coarseMap.compute(renderer);
	navigationMap.compute(renderer);

	// Resize camera and renderer according to current canvas size
	resize(renderer, camera, nativeSize);

	// Render world
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
