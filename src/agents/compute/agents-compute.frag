precision highp float;

uniform sampler2D uPreviousStateTexture;
uniform sampler2D uPropertiesTexture;
uniform ivec2 uSimulationResolution;
uniform sampler2D uTerrainTexture;

out vec4 outState;

// State represents dynamic agent state
struct State {
	vec2 position;
	float direction;
	int destinationIndex;
};

// readState reads agent state from state texture
State readState(ivec2 textureCoord) {
	vec4 packed = texelFetch(uPreviousStateTexture, textureCoord, 0);

	return State(packed.xy, packed.z, int(packed.w));
}

// packState packs agent state to RGBA pixel
vec4 packState(State state) {
	return vec4(state.position, state.direction, float(state.destinationIndex));
}

// Properties represent static agent properties
struct Properties {
	float seed;
	float speed;
};

// readProperties reads agent properties from properties texture
Properties readProperties(ivec2 textureCoord) {
	vec2 packed = texelFetch(uPropertiesTexture, textureCoord, 0).xy;

	return Properties(packed.x, packed.y);
}

void main() {
	ivec2 coord = ivec2(gl_FragCoord.xy);

	State state = readState(coord);
	Properties properties = readProperties(coord);

	state.position += vec2(cos(state.direction), -sin(state.direction)) * properties.speed;

	outState = packState(state);
}