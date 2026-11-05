precision highp float;

in vec3 position;

uniform sampler2D uStateTexture;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
	int textureWidth = textureSize(uStateTexture, 0).x;

	ivec2 statePixel = ivec2(gl_InstanceID % textureWidth, gl_InstanceID / textureWidth);

	vec4 state = texelFetch(uStateTexture, statePixel, 0);
	float heading = state.z;

	vec2 rotatedPosition = vec2(cos(heading) * position.x - sin(heading) * position.y, sin(heading) * position.x + cos(heading) * position.y);

	state.xy += rotatedPosition;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(state.xy, 0.0f, 1.0f);
}
