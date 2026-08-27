import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import type { InterestPoint } from "./interest-points";
import { resize } from "./viewport";

import navigationComputeFragmentShader from './shaders/navigation-compute.frag?raw';
import navigationComputeVertexShader from './shaders/navigation-compute.vert?raw';
import navigationRenderFragmentShader from './shaders/navigation-render.frag?raw';
import navigationRenderVertexShader from './shaders/navigation-render.vert?raw';

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
	}
);

// Compute navigation field only for first point for now
const navigationComputeMaterial = new THREE.RawShaderMaterial({
	glslVersion: THREE.GLSL3,

	uniforms: {
		uInterestPointPosition: { value: interestPoints[0].position },
		uSimulationSize: { value: simulationSize },
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
