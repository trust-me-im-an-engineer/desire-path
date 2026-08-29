import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

import fragmentShader from './coarse-map.frag?raw';
import vertexShader from './coarse-map.vert?raw';

export type CoarseMap = {
	computeTarget: THREE.WebGLRenderTarget,
	pass: FullScreenQuad,
	mesh: THREE.Mesh,
	compute(renderer: THREE.WebGLRenderer): void;
}

export function createCoarseMap(simulationSize: THREE.Vector2, downscale: number, terrainTexture: THREE.Texture): CoarseMap {
	// Coarse map is 1/4th of native simulation resolution.
	// It combines base terrain with wear map.
	const computeTarget = new THREE.WebGLRenderTarget(
		Math.floor(simulationSize.width / downscale),
		Math.floor(simulationSize.height / downscale),
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
			COARSE_MAP_DOWNSCALE: downscale,
		},

		uniforms: {
			uDownscale: { value: downscale },
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
		new THREE.PlaneGeometry(simulationSize.width, simulationSize.height),
		new THREE.MeshBasicMaterial({ map: computeTarget.texture }),
	);
	mesh.position.set(simulationSize.width / 2, -simulationSize.height / 2, 4);

	const compute = function (renderer: THREE.WebGLRenderer) {
		renderer.setRenderTarget(computeTarget);
		pass.render(renderer);
	};

	return {
		computeTarget: computeTarget,
		pass: pass,
		mesh: mesh,
		compute: compute,
	};
}
