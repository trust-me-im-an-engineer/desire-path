import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import type { InterestPoint } from "./interest-points";
import { resize } from "./viewport";

import navigationComputeFragmentShader from './shaders/navigation/compute/navigation-compute.frag?raw';
import navigationComputeVertexShader from './shaders/navigation/compute/navigation-compute.vert?raw';
import navigationRenderFragmentShader from './shaders/navigation/render/navigation-render.frag?raw';
import navigationRenderVertexShader from './shaders/navigation/render/navigation-render.vert?raw';

import coarseMapFragmentShader from './shaders/coarse-map/coarse-map.frag?raw';
import coarseMapVertexShader from './shaders/coarse-map/coarse-map.vert?raw';

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

const terrainTexture = await new THREE.TextureLoader().loadAsync("assets/5.png");
terrainTexture.generateMipmaps = false;
terrainTexture.colorSpace = THREE.SRGBColorSpace;

const simulationSize = new THREE.Vector2(terrainTexture.width, terrainTexture.height);

const terrainMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(simulationSize.width, simulationSize.height),
	new THREE.MeshBasicMaterial({ map: terrainTexture })
);
terrainMesh.position.set(simulationSize.width / 2, -simulationSize.height / 2);
scene.add(terrainMesh);

const interestPoints: readonly InterestPoint[] = [
	{ position: new THREE.Vector2(200, 270), weight: 12 },
	{ position: new THREE.Vector2(800, 264), weight: 12 },
];

const interestPointsGroup = new THREE.Group();
for (const point of interestPoints) {
	const pointMesh = new THREE.Mesh(
		new THREE.CircleGeometry(point.weight),
		new THREE.MeshBasicMaterial({ color: 0xd93d2b })
	);
	pointMesh.position.set(point.position.x, -point.position.y, 2);
	interestPointsGroup.add(pointMesh);
}
scene.add(interestPointsGroup);

// Coarse map is 1/4th of native simulation resolution.
// It combines base terrain with wear map.
const coarseMapRenderTarget = new THREE.WebGLRenderTarget(
	Math.floor(simulationSize.width / COARSE_MAP_DOWNSCALE),
	Math.floor(simulationSize.height / COARSE_MAP_DOWNSCALE),
	{
		format: THREE.RedFormat,
		type: THREE.FloatType,
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		depthBuffer: false,
		stencilBuffer: false,
		generateMipmaps: false,
		colorSpace: THREE.NoColorSpace,
	}
);

const coarseMapShaderMaterial = new THREE.RawShaderMaterial({
	glslVersion: THREE.GLSL3,

	defines: {
		COARSE_MAP_DOWNSCALE,
	},

	uniforms: {
		uDownscale: { value: COARSE_MAP_DOWNSCALE },
		uTerrainTexture: { value: terrainTexture },
		// uWearMap: { value: wearTexture },
		// uInterestPoints: { value: interestPoints },
	},

	vertexShader: coarseMapVertexShader,
	fragmentShader: coarseMapFragmentShader,
});

const coarseMapPass = new FullScreenQuad(coarseMapShaderMaterial);

// Render for debugging
const coarseMapMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(simulationSize.width, simulationSize.height),
	new THREE.MeshBasicMaterial({ map: coarseMapRenderTarget.texture })
);
coarseMapMesh.position.set(simulationSize.width / 2, -simulationSize.height / 2, 4);
scene.add(coarseMapMesh);

// Compute navigation field to single-channel target of simulationSize
const navigationComputeTarget = new THREE.WebGLRenderTarget(
	simulationSize.width,
	simulationSize.height,
	{
		format: THREE.RedFormat,
		type: THREE.FloatType,
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		depthBuffer: false,
		stencilBuffer: false,
		generateMipmaps: false,
		colorSpace: THREE.NoColorSpace,
	}
);

// Compute navigation field only for first point for now
const navigationComputeMaterial = new THREE.RawShaderMaterial({
	glslVersion: THREE.GLSL3,

	uniforms: {
		uInterestPointPosition: { value: interestPoints[0].position },
		uSimulationSize: { value: simulationSize },
		uTerrainTexture: { value: terrainTexture },
	},

	vertexShader: navigationComputeVertexShader,
	fragmentShader: navigationComputeFragmentShader,
});

const navigationPass = new FullScreenQuad(navigationComputeMaterial);

// Render computed navigation field texture using it's channel as transparency
const navigationRenderMaterial = new THREE.RawShaderMaterial({
	glslVersion: THREE.GLSL3,

	uniforms: {
		uNavigation: {
			value: navigationComputeTarget.texture,
		},
	},

	vertexShader: navigationRenderVertexShader,
	fragmentShader: navigationRenderFragmentShader,

	transparent: true,
	depthWrite: false,
});

const navigationMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(simulationSize.width, simulationSize.height),
	navigationRenderMaterial
);
navigationMesh.position.set(simulationSize.width / 2, -simulationSize.height / 2, 1);
scene.add(navigationMesh);

function frameRequestCallback() {
	// Compute coarse map
	renderer.setRenderTarget(coarseMapRenderTarget);
	coarseMapPass.render(renderer);

	// Compute navigation field into target's texture
	renderer.setRenderTarget(navigationComputeTarget);
	navigationPass.render(renderer);

	// Resize camera and renderer according to current canvas size
	resize(renderer, camera, simulationSize);

	// Render world
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
