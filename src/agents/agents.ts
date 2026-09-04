import * as THREE from "three";

import { InterestPoint } from "../interest-points";
import type { SimulationResolution } from "../simulation-size";

import renderFragmentShader from './render/agents-render.frag?raw';
import renderVertexShader from './render/agents-render.vert?raw';

const TEXTURES_WIDTH = 128;
const MIN_AGENT_SPEED = 0.5;
const MAX_AGENT_SPEED = 1.0;

export class Agents {
	public readonly points: THREE.Points;

	private readonly computeTarget: THREE.WebGLRenderTarget;
	// private readonly pass: FullScreenQuad;

	constructor(
		simulationResolution: SimulationResolution,
		terrainTexture: THREE.Texture,
		coarseMap: THREE.Texture,
		interestPoints: readonly InterestPoint[],
		renderer: THREE.WebGLRenderer,
		depth: number,
		public count: number,

	) {
		// Initialize static texture (seed + speed)
		const staticTextureData = new Float32Array(2 * TEXTURES_WIDTH ** 2);
		for (let i = 0; i < staticTextureData.length; i += 2) {
			staticTextureData[i] = Math.random();
			staticTextureData[i + 1] = MIN_AGENT_SPEED + Math.random() * (MAX_AGENT_SPEED - MIN_AGENT_SPEED);
		}
		const staticTexture = new THREE.DataTexture(
			staticTextureData,
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			THREE.RGFormat,
			THREE.FloatType,
		);
		staticTexture.minFilter = THREE.NearestFilter;
		staticTexture.magFilter = THREE.NearestFilter;
		staticTexture.generateMipmaps = false;
		staticTexture.colorSpace = THREE.NoColorSpace;
		staticTexture.needsUpdate = true;

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

		// One render target with one state texture
		this.computeTarget = new THREE.WebGLRenderTarget(
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			{
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				depthBuffer: false,
				stencilBuffer: false,
				generateMipmaps: false,
				colorSpace: THREE.NoColorSpace,
			},
		);

		const state = this.computeTarget.texture;
		state.format = THREE.RGBAFormat;
		state.type = THREE.FloatType;

		// Initialization needed before copying data texture to render target
		renderer.initRenderTarget(this.computeTarget);

		renderer.copyTextureToTexture(
			stateTexture,
			this.computeTarget.texture,
		);

		stateTexture.dispose();

		const geometry = new THREE.BufferGeometry();
		geometry.setDrawRange(0, count);

		this.points = new THREE.Points(
			geometry,
			new THREE.RawShaderMaterial({
				glslVersion: THREE.GLSL3,

				uniforms: {
					uStateTexture: {
						value: this.computeTarget.texture,
					},
				},

				vertexShader: renderVertexShader,
				fragmentShader: renderFragmentShader,

				transparent: true,
				depthWrite: false,
			}),
		);

		// Disable culling as this mesh is always on screen
		this.points.frustumCulled = false;

		this.points.position.z = depth;
	}
}
