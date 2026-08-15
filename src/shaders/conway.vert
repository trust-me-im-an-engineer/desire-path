#ifndef SHADER_TYPE
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

attribute vec3 position;
attribute vec2 uv;
#endif

varying vec2 vUvs;

void main() {
	vUvs = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}