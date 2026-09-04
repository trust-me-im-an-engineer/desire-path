precision highp float;

uniform sampler2D uStateTexture;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
	int textureWidth = textureSize(uStateTexture, 0).x;

	ivec2 statePixel = ivec2(gl_VertexID % textureWidth, gl_VertexID / textureWidth);

	vec2 position = texelFetch(uStateTexture, statePixel, 0).xy;

    // Simulation coordinates have downward-positive Y
	vec3 worldPosition = vec3(position.x, -position.y, 0.0f);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0f);

	gl_PointSize = 30.0f;
}
