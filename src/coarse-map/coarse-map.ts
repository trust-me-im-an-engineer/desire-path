import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

import type { SimulationResolution } from "../simulation-size";
import fragmentShader from './coarse-map.frag?raw';
import vertexShader from './coarse-map.vert?raw';

export class CoarseMap {
	public computeTarget: THREE.WebGLRenderTarget;
	public pass: FullScreenQuad;
	public mesh: THREE.Mesh;

	constructor(
		private simulationResolution: SimulationResolution,
		terrainTexture: THREE.Texture,
	) {
		// Coarse map uses the downscaled simulation resolution.
		// It combines base terrain with wear map.
		this.computeTarget = new THREE.WebGLRenderTarget(
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

		this.pass = new FullScreenQuad(coarseMapShaderMaterial);

		// Render for debugging
		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(simulationResolution.native.width, simulationResolution.native.height),
			new THREE.MeshBasicMaterial({ map: this.computeTarget.texture }),
		);
		this.mesh.position.set(
			simulationResolution.native.width / 2,
			-simulationResolution.native.height / 2,
			2,
		);
	}

	compute(renderer: THREE.WebGLRenderer): void {
		renderer.setRenderTarget(this.computeTarget);
		this.pass.render(renderer);
	}

	toArray(renderer: THREE.WebGLRenderer): Float32Array {
		const array = new Float32Array(
			this.simulationResolution.downscaled.width * this.simulationResolution.downscaled.height,
		);
		renderer.readRenderTargetPixels(
			this.computeTarget,
			0,
			0,
			this.simulationResolution.downscaled.width,
			this.simulationResolution.downscaled.height,
			array,
		);
		return array;
	}
}
