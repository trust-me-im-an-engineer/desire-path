precision highp float;

uniform sampler2D uStateTexture;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

flat out vec2 vDirection;

void main() {
	int textureWidth = textureSize(uStateTexture, 0).x;

	ivec2 statePixel = ivec2(gl_VertexID % textureWidth, gl_VertexID / textureWidth);

	vec4 state = texelFetch(uStateTexture, statePixel, 0);
	vec2 position = state.xy;
	float heading = state.z;

	// Point coordinates have upward-positive Y, unlike simulation coordinates
	vDirection = vec2(cos(heading), -sin(heading));

    // Simulation coordinates have downward-positive Y
	vec3 worldPosition = vec3(position.x, -position.y, 0.0f);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0f);

	gl_PointSize = 30.0f;
}
