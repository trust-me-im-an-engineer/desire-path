import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

import { InterestPoint } from "../interest-points";

import computeFragmentShader from './compute/navigation-compute.frag?raw';
import computeVertexShader from './compute/navigation-compute.vert?raw';
import renderFragmentShader from './render/navigation-render.frag?raw';
import renderVertexShader from './render/navigation-render.vert?raw';

export type NavigationMap = {
	computeTarget: THREE.WebGLRenderTarget,
	pass: FullScreenQuad,
	mesh: THREE.Mesh,
	compute(renderer: THREE.WebGLRenderer): void;
}

export function createNavigationMap(nativeSize: THREE.Vector2, downscale: number, coarseMapTexture: THREE.Texture, point: InterestPoint): NavigationMap {
	// Compute navigation field to single-channel target
	const computeTarget = new THREE.WebGLRenderTarget(
		Math.floor(nativeSize.width / downscale),
		Math.floor(nativeSize.height / downscale),
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

	const computeMaterial = new THREE.RawShaderMaterial({
		glslVersion: THREE.GLSL3,

		uniforms: {
			uInterestPointPosition: {
				value: new THREE.Vector2(
					Math.floor(point.position.x / downscale),
					Math.floor(point.position.y / downscale),
				)
			},
			uTerrainTexture: { value: coarseMapTexture },
		},

		vertexShader: computeVertexShader,
		fragmentShader: computeFragmentShader,
	});

	const pass = new FullScreenQuad(computeMaterial);

	// Render computed navigation field texture using it's channel as transparency
	const renderMaterial = new THREE.RawShaderMaterial({
		glslVersion: THREE.GLSL3,

		uniforms: {
			uNavigation: {
				value: computeTarget.texture,
			},
		},

		vertexShader: renderVertexShader,
		fragmentShader: renderFragmentShader,

		transparent: true,
		depthWrite: false,
	});

	const navigationMesh = new THREE.Mesh(
		new THREE.PlaneGeometry(nativeSize.width, nativeSize.height),
		renderMaterial
	);
	navigationMesh.position.set(nativeSize.width / 2, -nativeSize.height / 2, 1);

	const compute = function (renderer: THREE.WebGLRenderer) {
		renderer.setRenderTarget(computeTarget);
		pass.render(renderer);
	};

	return {
		computeTarget: computeTarget,
		pass: pass,
		mesh: navigationMesh,
		compute: compute,
	};
}


export function dijkstra(interestPoint: InterestPoint, terrain: Uint8Array): Float32Array {
	const navigationMap = new Float32Array;



	return navigationMap;
}
