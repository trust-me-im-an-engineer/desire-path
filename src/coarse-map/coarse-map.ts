import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

import fragmentShader from './coarse-map.frag?raw';
import vertexShader from './coarse-map.vert?raw';

export type CoarseMap = {
	renderTarget: THREE.WebGLRenderTarget,
	pass: FullScreenQuad,
	mesh: THREE.Mesh,
}

export function createCoarseMap(simulationSize: THREE.Vector2, downscale: number, terrainTexture: THREE.Texture): CoarseMap {
	// Coarse map is 1/4th of native simulation resolution.
	// It combines base terrain with wear map.
	const renderTarget = new THREE.WebGLRenderTarget(
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

	// Render for debugging
	const mesh = new THREE.Mesh(
		new THREE.PlaneGeometry(simulationSize.width, simulationSize.height),
		new THREE.MeshBasicMaterial({ map: renderTarget.texture })
	);
	mesh.position.set(simulationSize.width / 2, -simulationSize.height / 2, 4);

	return {
		renderTarget: renderTarget,
		pass: new FullScreenQuad(coarseMapShaderMaterial),
		mesh: mesh,
	}
}
