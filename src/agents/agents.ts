import * as THREE from "three";

import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { InterestPoint } from "../interest-points";
import type { SimulationResolution } from "../simulation-size";

import renderFragmentShader from './render/agents-render.frag?raw';
import renderVertexShader from './render/agents-render.vert?raw';

import computeFragmentShader from './compute/agents-compute.frag?raw';
import computeVertexShader from './compute/agents-compute.vert?raw';

const TEXTURES_WIDTH = 128;
const MIN_AGENT_SPEED = 0.5;
const MAX_AGENT_SPEED = 1.0;
const AGENT_LENGTH = 15;
const AGENT_WIDTH = 10;

export class Agents {
	public readonly mesh: THREE.Mesh;

	private computeTargetRead: THREE.WebGLRenderTarget;
	private computeTargetWrite: THREE.WebGLRenderTarget;
	private readonly computeMaterial: THREE.RawShaderMaterial;
	private readonly pass: FullScreenQuad;
	private readonly renderMaterial: THREE.RawShaderMaterial;

	constructor(
		simulationResolution: SimulationResolution,
		terrainTexture: THREE.Texture,
		coarseMap: THREE.Texture,
		interestPoints: readonly InterestPoint[],
		renderer: THREE.WebGLRenderer,
		depth: number,
		public count: number,

	) {
		// Initialize static properties texture (seed + speed)
		const propertiesTextureData = new Float32Array(2 * TEXTURES_WIDTH ** 2);
		for (let i = 0; i < propertiesTextureData.length; i += 2) {
			propertiesTextureData[i] = Math.random();
			propertiesTextureData[i + 1] = MIN_AGENT_SPEED + Math.random() * (MAX_AGENT_SPEED - MIN_AGENT_SPEED);
		}
		const propertiesTexture = new THREE.DataTexture(
			propertiesTextureData,
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			THREE.RGFormat,
			THREE.FloatType,
		);
		propertiesTexture.minFilter = THREE.NearestFilter;
		propertiesTexture.magFilter = THREE.NearestFilter;
		propertiesTexture.generateMipmaps = false;
		propertiesTexture.colorSpace = THREE.NoColorSpace;
		propertiesTexture.needsUpdate = true;

		// Initialize state texture with position.xy, direction and destination index
		// Position = 0th interest point
		// Direction and destination index = 0
		const stateTextureData = new Float32Array(4 * TEXTURES_WIDTH ** 2);
		for (let i = 0; i < stateTextureData.length; i += 4) {
			stateTextureData[i] = interestPoints[0].nativePosition.x;
			stateTextureData[i + 1] = interestPoints[0].nativePosition.y;
			stateTextureData[i + 2] = 0.0;
			stateTextureData[i + 3] = 0.0;
		}
		const stateTexture = new THREE.DataTexture(
			stateTextureData,
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			THREE.RGBAFormat,
			THREE.FloatType,
		);
		stateTexture.minFilter = THREE.NearestFilter;
		stateTexture.magFilter = THREE.NearestFilter;
		stateTexture.generateMipmaps = false;
		stateTexture.colorSpace = THREE.NoColorSpace;
		stateTexture.needsUpdate = true;

		this.computeTargetRead = new THREE.WebGLRenderTarget(
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			{
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				internalFormat: "RGBA32F",

				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,

				depthBuffer: false,
				stencilBuffer: false,
				generateMipmaps: false,
				colorSpace: THREE.NoColorSpace,
			},
		);

		// Initialization needed before copying data texture to render target
		renderer.initRenderTarget(this.computeTargetRead);
		renderer.copyTextureToTexture(
			stateTexture,
			this.computeTargetRead.texture,
		);
		stateTexture.dispose();

		// Clone compute target for ping-pong simulation
		this.computeTargetWrite = this.computeTargetRead.clone();

		this.computeMaterial = new THREE.RawShaderMaterial({
			glslVersion: THREE.GLSL3,

			uniforms: {
				uPreviousStateTexture: { value: this.computeTargetRead.texture },
				uPropertiesTexture: { value: propertiesTexture },
				uSimulationResolution: { value: simulationResolution },
				uTerrainTexture: { value: terrainTexture },
			},

			vertexShader: computeVertexShader,
			fragmentShader: computeFragmentShader,

			depthWrite: false,
			depthTest: false,
		})

		// Pass is a full screen quad for rendering subsequent passes for simulation
		this.pass = new FullScreenQuad(this.computeMaterial);

		this.renderMaterial = new THREE.RawShaderMaterial({
			glslVersion: THREE.GLSL3,

			uniforms: {
				uStateTexture: {
					value: this.computeTargetRead.texture,
				},
			},

			vertexShader: renderVertexShader,
			fragmentShader: renderFragmentShader,

			transparent: true,
			depthWrite: false,
		})

		const geometry = new THREE.InstancedBufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute([
				-AGENT_LENGTH / 2, -AGENT_WIDTH / 2, 0,
				AGENT_LENGTH / 2, 0, 0,
				-AGENT_LENGTH / 2, AGENT_WIDTH / 2, 0,
			], 3),
		);
		geometry.instanceCount = count;

		this.mesh = new THREE.Mesh(
			geometry,
			this.renderMaterial,
		);

		// Disable culling as this mesh is always on screen
		this.mesh.frustumCulled = false;

		this.mesh.position.z = depth;
	}


	public compute(renderer: THREE.WebGLRenderer): void {
		renderer.setRenderTarget(this.computeTargetWrite);
		this.pass.render(renderer);

		// Current output becomes next frame's input
		[this.computeTargetRead, this.computeTargetWrite] = [this.computeTargetWrite, this.computeTargetRead];

		this.computeMaterial.uniforms.uPreviousStateTexture.value = this.computeTargetRead.texture;

		this.renderMaterial.uniforms.uStateTexture.value =
			this.computeTargetRead.texture;
	}
}
