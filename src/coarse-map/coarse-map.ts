import * as THREE from "three";

import { SimulationMap } from "../simulation-map";
import type { SimulationResolution } from "../simulation-size";
import fragmentShader from './coarse-map.frag?raw';
import vertexShader from './coarse-map.vert?raw';

export class CoarseMap extends SimulationMap {
	constructor(
		private simulationResolution: SimulationResolution,
		terrainTexture: THREE.Texture,
	) {
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

		super(
			simulationResolution,
			coarseMapShaderMaterial,
			texture => new THREE.MeshBasicMaterial({ map: texture }),
			2,
		);
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
