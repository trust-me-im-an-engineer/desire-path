import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

import type { SimulationResolution } from "./simulation-size";

type RenderMaterialFactory = (texture: THREE.Texture) => THREE.Material;

export abstract class SimulationMap {
	public readonly mesh: THREE.Mesh;

	protected readonly computeTarget: THREE.WebGLRenderTarget;

	private readonly pass: FullScreenQuad;

	protected constructor(
		simulationResolution: SimulationResolution,
		computeMaterial: THREE.Material,
		createRenderMaterial: RenderMaterialFactory,
		depth: number,
	) {
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
			},
		);

		this.pass = new FullScreenQuad(computeMaterial);
		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(
				simulationResolution.native.width,
				simulationResolution.native.height,
			),
			createRenderMaterial(this.computeTarget.texture),
		);
		this.mesh.position.set(
			simulationResolution.native.width / 2,
			-simulationResolution.native.height / 2,
			depth,
		);
	}

	compute(renderer: THREE.WebGLRenderer): void {
		renderer.setRenderTarget(this.computeTarget);
		this.pass.render(renderer);
	}
}
