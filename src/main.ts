import * as THREE from "three";
import { createInterestPoints } from "./interest-points";
import { resize } from "./viewport";

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const camera = new THREE.OrthographicCamera();
camera.left = 0;
camera.top = 0;
camera.position.z = 100;
camera.updateProjectionMatrix();

const terrainTexture = await new THREE.TextureLoader().loadAsync("assets/2.png");
terrainTexture.colorSpace = THREE.SRGBColorSpace;

const textureAspect = terrainTexture.width / terrainTexture.height;

const mesh = new THREE.Mesh(
	new THREE.PlaneGeometry(textureAspect, 1),
	new THREE.MeshBasicMaterial({ map: terrainTexture })
);
mesh.position.x = textureAspect / 2;
mesh.position.y = -0.5;
scene.add(mesh);

const interestPoints = createInterestPoints([
	{ x: 0.2, y: 0.46, weight: 0.02 },
	{ x: 1.4, y: 0.44, weight: 0.02 },
]);

scene.add(interestPoints.markers);

function frameRequestCallback() {
	resize(renderer, camera, textureAspect);
	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback);
