import * as THREE from "three";
import { loadTerrainMap } from "./terrain-map";
import { resizeToDisplaySize } from "./viewport";
import vertexShader from './shaders/conway.vert?raw';
import fragmentShaderScreen from './shaders/conway screen.frag?raw';
import fragmentShaderBuffer from './shaders/conway buffer.frag?raw';

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const camera = new THREE.OrthographicCamera();

camera.position.z = 100;
camera.left = 0;
camera.top = 0;
camera.bottom = -1;

const terrainMap = await loadTerrainMap("assets/2.png");
// scene.add(terrainMap.planeMesh);

// const interestPoints = createInterestPoints(
// 	[
// 		{ x: 0.25, y: 0.45 },
// 		{ x: 1.50, y: 0.43 },
// 	]
// );

// scene.add(interestPoints.markers);

// const coarseMap = createCoarseMap(terrainMap.terrainTexture);
// scene.add(coarseMap);

const sizes = {
	width: Math.floor(canvas.clientWidth * window.devicePixelRatio) / 16,
	height: Math.floor(canvas.clientHeight * window.devicePixelRatio) / 16,
};

const bufferScene = new THREE.Scene();
var renderBufferA = new THREE.WebGLRenderTarget(
	sizes.width,
	sizes.height,
	{
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
		stencilBuffer: false
	}
);
var renderBufferB = new THREE.WebGLRenderTarget(
	sizes.width,
	sizes.height,
	{
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
		stencilBuffer: false
	}
);

const bufferCamera = new THREE.OrthographicCamera(0, 1, 0, -1);
bufferCamera.position.z = 1;

var data = new Uint8Array(4 * sizes.width * sizes.height);
for (var i = 0; i < data.length; i += 4) {
	if (Math.random() < 0.6) {
		data[i] = 255;
		data[i + 1] = 255;
		data[i + 2] = 255;
	} else {
		data[i] = 0;
		data[i + 1] = 0;
		data[i + 2] = 0;
	}

	data[i + 3] = 255;
}

console.log(data);

var texture = new THREE.DataTexture(
	data,
	sizes.width,
	sizes.height,
	THREE.RGBAFormat
);
texture.needsUpdate = true;

const plane = new THREE.PlaneGeometry(1, 1);

const resolution = new THREE.Vector3(
	sizes.width,
	sizes.height,
	window.devicePixelRatio
);

const bufferMaterial = new THREE.ShaderMaterial({
	uniforms: {
		uTexture: { value: texture },
		uResolution: {
			value: resolution
		},
	},
	vertexShader: vertexShader,
	fragmentShader: fragmentShaderBuffer,
});

const material = new THREE.ShaderMaterial({
	uniforms: {
		uTexture: { value: null },
		uResolution: {
			value: resolution
		}
	},
	vertexShader: vertexShader,
	fragmentShader: fragmentShaderScreen,
});

const mesh = new THREE.Mesh(plane, material);
mesh.position.x = 0.5;
mesh.position.y = -0.5;
scene.add(mesh);

const bufferMesh = new THREE.Mesh(plane, bufferMaterial);
bufferMesh.position.x = 0.5;
bufferMesh.position.y = -0.5;
bufferScene.add(bufferMesh);

function frameRequestCallback(timeMs: number) {
	resizeToDisplaySize(renderer, camera, terrainMap.displayTexture);

	renderer.setRenderTarget(renderBufferA);
	renderer.render(bufferScene, bufferCamera);

	mesh.material.uniforms.uTexture.value = renderBufferA.texture;

	renderer.setRenderTarget(null);
	renderer.render(scene, camera);

	[renderBufferA, renderBufferB] = [renderBufferB, renderBufferA];
	bufferMaterial.uniforms.uTexture.value = renderBufferB.texture;
}

renderer.setAnimationLoop(frameRequestCallback);
