import * as THREE from 'three';

const canvas = <HTMLCanvasElement>document.getElementById("simulationCanvas");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas });
const camera = new THREE.OrthographicCamera();

camera.position.z = 100;

var texture: THREE.Texture;
const loader = new THREE.TextureLoader();
texture = await loader.loadAsync('assets/initial-cost-map.png');
texture.colorSpace = THREE.SRGBColorSpace;

const plane = new THREE.PlaneGeometry(texture.width, texture.height);
const planeMesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: texture }));
scene.add(planeMesh)

function resizeToDisplaySize(renderer: THREE.WebGLRenderer, camera: THREE.OrthographicCamera) {
	const canvas = renderer.domElement;
	const displayWidth = canvas.clientWidth;
	const displayHeight = canvas.clientHeight;
	const pixelRatio = renderer.getPixelRatio();
	const renderWidth = Math.floor(displayWidth * pixelRatio);
	const renderHeight = Math.floor(displayHeight * pixelRatio);
	
	if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
		renderer.setSize(renderWidth, renderHeight, false);

		camera.left = -texture.width/2;
		camera.right = texture.width/2;
		camera.top = texture.height/2;
		camera.bottom = -texture.height/2;
		camera.updateProjectionMatrix();
	}
}

function frameRequestCallback(time: number) {
	time *= 0.001;  // convert time to seconds

	resizeToDisplaySize(renderer, camera)

	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frameRequestCallback)
