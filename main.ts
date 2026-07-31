import * as THREE from 'three';

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const camera = new THREE.OrthographicCamera();

camera.position.z = 100;

const loader = new THREE.TextureLoader();
const loadedTexture = await loader.loadAsync("assets/5a.png");

// User-visible map
const displayTexture = loadedTexture;
displayTexture.colorSpace = THREE.SRGBColorSpace;

const plane = new THREE.PlaneGeometry(displayTexture.width, displayTexture.height);
const planeMesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: displayTexture }));
scene.add(planeMesh)

// Numeric terrain data
const terrainTexture = loadedTexture.clone();
terrainTexture.colorSpace = THREE.NoColorSpace;
terrainTexture.generateMipmaps = false;
terrainTexture.minFilter = THREE.LinearFilter;
terrainTexture.magFilter = THREE.LinearFilter;
terrainTexture.needsUpdate = true;

function resizeToDisplaySize(renderer: THREE.WebGLRenderer, camera: THREE.OrthographicCamera) {
	const canvas = renderer.domElement;
	const displayWidth = canvas.clientWidth;
	const displayHeight = canvas.clientHeight;
	const renderWidth = Math.floor(displayWidth * window.devicePixelRatio);
	const renderHeight = Math.floor(displayHeight * window.devicePixelRatio);

	if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
		renderer.setSize(renderWidth, renderHeight, false);

		const canvasAspect = displayWidth / displayHeight;
		const textureAspect = displayTexture.width / displayTexture.height;
		const viewWidth = canvasAspect > textureAspect
			? displayTexture.height * canvasAspect
			: displayTexture.width;
		const viewHeight = canvasAspect > textureAspect
			? displayTexture.height
			: displayTexture.width / canvasAspect;

		camera.left = -viewWidth / 2;
		camera.right = viewWidth / 2;
		camera.top = viewHeight / 2;
		camera.bottom = -viewHeight / 2;
		camera.updateProjectionMatrix();
	}
}

function frameRequestCallback(time: number) {
	time *= 0.001;  // convert time to seconds

	resizeToDisplaySize(renderer, camera)

	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback)
