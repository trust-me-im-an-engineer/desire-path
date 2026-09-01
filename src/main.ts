import * as THREE from "three";

import { CoarseMap } from "./coarse-map/coarse-map";
import { createInterestPointsGroup, InterestPoint } from "./interest-points";
import { dijkstra } from "./navigation-map/navigation-map";
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

const interestPoints: readonly InterestPoint[] = [
	new InterestPoint(new THREE.Vector2(200, 270), 12, simulationResolution),
	new InterestPoint(new THREE.Vector2(800, 264), 12, simulationResolution),
];

const interestPointsGroup = createInterestPointsGroup(interestPoints);
scene.add(interestPointsGroup);

const coarseMap = new CoarseMap(simulationResolution, terrainTexture);
scene.add(coarseMap.mesh);

coarseMap.compute(renderer);
const coarseMapArray = coarseMap.toArray(renderer);

const navigationMapArray = dijkstra(interestPoints[0].downscaledPosition, coarseMapArray, simulationResolution);

const navigationMapTexture = new THREE.DataTexture(
	navigationMapArray,
	simulationResolution.downscaled.width,
	simulationResolution.downscaled.height,
	THREE.RedFormat,
	THREE.FloatType,
);
navigationMapTexture.needsUpdate = true;

import renderFragmentShader from './navigation-map/render/navigation-render.frag?raw';
import renderVertexShader from './navigation-map/render/navigation-render.vert?raw';

// Render computed navigation field texture using its channel as transparency
const renderMaterial = new THREE.RawShaderMaterial({
	glslVersion: THREE.GLSL3,

	uniforms: {
		uNavigation: {
			value: navigationMapTexture,
		},
	},

	vertexShader: renderVertexShader,
	fragmentShader: renderFragmentShader,

	transparent: true,
	depthWrite: false,
});

const navigationMapMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(simulationResolution.native.width, simulationResolution.native.height),
	renderMaterial,
);
navigationMapMesh.position.set(
	simulationResolution.native.width / 2,
	-simulationResolution.native.height / 2,
	3,
);
scene.add(navigationMapMesh);

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
bindVisibilityToggle("showInterestPoints", interestPointsGroup);
bindVisibilityToggle("showCoarseMap", coarseMap.mesh);
bindVisibilityToggle("showNavigationMap", navigationMapMesh);

function frameRequestCallback() {
	// Resize camera and renderer according to current canvas size
	resize(renderer, camera, simulationResolution);

	// Render world
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
