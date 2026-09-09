precision highp float;
precision highp int;

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

uint pcgHash(uint inputValue) {
	uint state = inputValue * 747796405u + 2891336453u;
	uint word = ((state >> ((state >> 28u) + 4u)) ^ state) *
		277803737u;

	return (word >> 22u) ^ word;
}

// random returns a deterministic pseudo-random value in the range [0.0, 1.0).
float random(ivec2 agentCoord, Properties properties, State state) {
	uint value = floatBitsToUint(properties.seed);

	value ^= pcgHash(uint(agentCoord.x));
	value ^= pcgHash(uint(agentCoord.y));
	value ^= pcgHash(floatBitsToUint(state.position.x));
	value ^= pcgHash(floatBitsToUint(state.position.y));
	value ^= pcgHash(floatBitsToUint(state.direction));
	value ^= pcgHash(uint(state.destinationIndex));

	// Use 24 bits so conversion cannot round up to 1.0.
	return float(pcgHash(value) >> 8u) *
		(1.0f / 16777216.0f);
}

// chooseNewInterestPoint chooses new interest point randomly according to weights.
InterestPoint chooseNewInterestPoint(InterestPoint oldInterestPoint, float rand) {
	int i = 0;
	InterestPoint interestPoint;
	float collectedWeight = 0.0f;

	int capacity = textureSize(uInterestPointsTexture, 0).x;

	for (int i = 0; i < capacity; i++) {
		if (collectedWeight >= rand * (uInterestPointsTotalWeight - oldInterestPoint.weight)) {
			break;
		}

		interestPoint = readInterestPoint(i);

		if (interestPoint.index != oldInterestPoint.index) {
			collectedWeight += interestPoint.weight;
		}
	}

	return interestPoint;
}

void main() {
	ivec2 coord = ivec2(gl_FragCoord.xy);

	State state = readState(coord);
	Properties properties = readProperties(coord);
	InterestPoint interestPoint = readInterestPoint(state.destinationIndex);

	float rand = random(ivec2(gl_FragCoord.xy), properties, state);

	if (distance(state.position, interestPoint.position) < interestPoint.weight) {
		interestPoint = chooseNewInterestPoint(interestPoint, rand);
		state.destinationIndex = interestPoint.index;
	}

	vec2 directionVec = (interestPoint.position - state.position);
	state.direction = atan(directionVec.y, directionVec.x);

	state.position += vec2(cos(state.direction), sin(state.direction)) * properties.speed;

	outState = packState(state);
}
