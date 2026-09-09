precision highp float;

uniform sampler2D uPreviousStateTexture;
uniform sampler2D uPropertiesTexture;

uniform sampler2D uInterestPointsTexture;
uniform float uInterestPointsTotalWeight;

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

// Properties represents static agent properties
struct Properties {
	float seed;
	float speed;
};

// readProperties reads agent properties from properties texture
Properties readProperties(ivec2 textureCoord) {
	vec2 packed = texelFetch(uPropertiesTexture, textureCoord, 0).xy;

	return Properties(packed.x, packed.y);
}

// InterestPoint represent interest point properties
struct InterestPoint {
	vec2 position;
	float weight;
	int index;
};

InterestPoint readInterestPoint(int index) {
	ivec2 textureCoord = ivec2(index, 0);

	vec3 packed = texelFetch(uInterestPointsTexture, textureCoord, 0).xyz;

	return InterestPoint(packed.xy, packed.z, index);
}

// chooseNewInterestPoint chooses new interest point randomly according to weights.
InterestPoint chooseNewInterestPoint(InterestPoint old) {

	return old;
}

void main() {
	ivec2 coord = ivec2(gl_FragCoord.xy);

	State state = readState(coord);
	Properties properties = readProperties(coord);
	InterestPoint interestPoint = readInterestPoint(state.destinationIndex);

	if(distance(state.position, interestPoint.position) < interestPoint.weight) {
		interestPoint = chooseNewInterestPoint(interestPoint);
		state.destinationIndex = interestPoint.index;
	}

	vec2 directionVec = (interestPoint.position - state.position);
	state.direction = atan(directionVec.y, directionVec.x);

	state.position += vec2(cos(state.direction), sin(state.direction)) * properties.speed;

	outState = packState(state);
}