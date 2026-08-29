import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

import type { SimulationResolution } from "../simulation-size";
import fragmentShader from './coarse-map.frag?raw';
import vertexShader from './coarse-map.vert?raw';

export type CoarseMap = {
	computeTarget: THREE.WebGLRenderTarget,
	pass: FullScreenQuad,
	mesh: THREE.Mesh,
	compute(renderer: THREE.WebGLRenderer): void;
	toArray(renderer: THREE.WebGLRenderer): Float32Array;
}

export function createCoarseMap(simulationResolution: SimulationResolution, terrainTexture: THREE.Texture): CoarseMap {
	// Coarse map uses the downscaled simulation resolution.
	// It combines base terrain with wear map.
	const computeTarget = new THREE.WebGLRenderTarget(
		simulationResolution.downscaled.width,
		simulationResolution.downscaled.height,
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
			DOWNSCALE_FACTOR: simulationResolution.downscaleFactor,
		},
		uniforms: {
			uTerrainTexture: { value: terrainTexture },
			// uWearMap: { value: wearTexture },
			// uInterestPoints: { value: interestPoints },
		},

		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
	});

	const pass = new FullScreenQuad(coarseMapShaderMaterial);

	// Render for debugging
	const mesh = new THREE.Mesh(
		new THREE.PlaneGeometry(simulationResolution.native.width, simulationResolution.native.height),
		new THREE.MeshBasicMaterial({ map: computeTarget.texture }),
	);
	mesh.position.set(simulationResolution.native.width / 2, -simulationResolution.native.height / 2, 4);

	const compute = function (renderer: THREE.WebGLRenderer) {
		renderer.setRenderTarget(computeTarget);
		pass.render(renderer);
	};

	const toArray = function (renderer: THREE.WebGLRenderer) {
		const array = new Float32Array(
			simulationResolution.downscaled.width * simulationResolution.downscaled.height,
		);
		renderer.readRenderTargetPixels(
			computeTarget,
			0,
			0,
			simulationResolution.downscaled.width,
			simulationResolution.downscaled.height,
			array,
		);
		return array;
	};

	return {
		computeTarget: computeTarget,
		pass: pass,
		mesh: mesh,
		compute: compute,
		toArray: toArray,
	};
}
