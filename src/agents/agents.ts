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

		// Initialize transform texture with position of 0th interest point and zero velocity
		const transformTextureData = new Float32Array(4 * TEXTURES_WIDTH ** 2);
		for (let i = 0; i < transformTextureData.length; i += 4) {
			transformTextureData[i] = interestPoints[0].nativePosition.x;
			transformTextureData[i + 1] = interestPoints[0].nativePosition.y;
			transformTextureData[i + 2] = 0.0;
			transformTextureData[i + 3] = 0.0;
		}
		const transformTexture = new THREE.DataTexture(
			transformTextureData,
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			THREE.RGBAFormat,
			THREE.FloatType,
		);
		transformTexture.minFilter = THREE.NearestFilter;
		transformTexture.magFilter = THREE.NearestFilter;
		transformTexture.generateMipmaps = false;
		transformTexture.colorSpace = THREE.NoColorSpace;
		transformTexture.needsUpdate = true;

		// Initialize destination texture with 0th interest point destination
		const destinationTextureData = new Float32Array(TEXTURES_WIDTH ** 2);
		const destinationTexture = new THREE.DataTexture(
			destinationTextureData,
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			THREE.RedFormat,
			THREE.FloatType,
		);
		destinationTexture.minFilter = THREE.NearestFilter;
		destinationTexture.magFilter = THREE.NearestFilter;
		destinationTexture.generateMipmaps = false;
		destinationTexture.colorSpace = THREE.NoColorSpace;
		destinationTexture.needsUpdate = true;

		// One render target with 2 attached textures
		this.computeTarget = new THREE.WebGLRenderTarget(
			TEXTURES_WIDTH,
			TEXTURES_WIDTH,
			{
				count: 2,
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				depthBuffer: false,
				stencilBuffer: false,
				generateMipmaps: false,
				colorSpace: THREE.NoColorSpace,
			},
		);

		const transform = this.computeTarget.textures[0];
		transform.format = THREE.RGBAFormat;
		transform.type = THREE.FloatType;

		const destination = this.computeTarget.textures[1];
		destination.format = THREE.RedFormat;
		destination.type = THREE.FloatType;

		// Initialization needed before copying data textures to render target
		renderer.initRenderTarget(this.computeTarget);

		renderer.copyTextureToTexture(
			transformTexture,
			this.computeTarget.textures[0],
		);

		renderer.copyTextureToTexture(
			destinationTexture,
			this.computeTarget.textures[1],
		);

		transformTexture.dispose();
		destinationTexture.dispose();

		const geometry = new THREE.BufferGeometry();
		geometry.setDrawRange(0, count);

		this.points = new THREE.Points(
			geometry,
			new THREE.RawShaderMaterial({
				glslVersion: THREE.GLSL3,

				uniforms: {
					uTransformTexture: {
						value: this.computeTarget.textures[0],
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
