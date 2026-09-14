precision highp float;
precision highp int;

uniform sampler2D uPreviousStateTexture;
uniform sampler2D uPropertiesTexture;

uniform sampler2D uDestinationsTexture;
uniform float uDestinationsTotalWeight;

uniform ivec2 uSimulationResolution;
uniform float uDownscaleFactor;
uniform sampler2D uTerrainTexture;
uniform highp sampler2DArray uNavigationMapTextureArray;

out vec4 outState;

const float UNREACHABLE = 1e30f;

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

// Destination represents destination properties
struct Destination {
	vec2 position;
	float weight;
	int index;
};

Destination readDestination(int index) {
	ivec2 textureCoord = ivec2(index, 0);

	vec3 packed = texelFetch(uDestinationsTexture, textureCoord, 0).xyz;

	return Destination(packed.xy, packed.z, index);
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

// chooseNextDestination chooses a new destination randomly according to weights.
Destination chooseNextDestination(Destination currentDestination, float rand) {
	int i = 0;
	Destination destination;
	float collectedWeight = 0.0f;

	int capacity = textureSize(uDestinationsTexture, 0).x;

	for (int i = 0; i < capacity; i++) {
		if (collectedWeight >= rand * (uDestinationsTotalWeight - currentDestination.weight)) {
			break;
		}

		destination = readDestination(i);

		if (destination.index != currentDestination.index) {
			collectedWeight += destination.weight;
		}
	}

	return destination;
}

// navigationWeight returns weight of given cell in navigation map.
// cells out of bounds returned as UNREACHABLE.
float navigationWeight(ivec2 cell, int layer) {
	ivec2 size = textureSize(uNavigationMapTextureArray, 0).xy;
	if (any(lessThan(cell, ivec2(0))) ||
		any(greaterThanEqual(cell, size))) {
		return UNREACHABLE;
	}

	return texelFetch(uNavigationMapTextureArray, ivec3(cell, layer), 0).r;
}

void main() {
	ivec2 coord = ivec2(gl_FragCoord.xy);

	State state = readState(coord);
	Properties properties = readProperties(coord);
	Destination destination = readDestination(state.destinationIndex);

	float rand = random(ivec2(gl_FragCoord.xy), properties, state);

	if (distance(state.position, destination.position) < destination.weight) {
		destination = chooseNextDestination(destination, rand);
		state.destinationIndex = destination.index;
	}

	ivec2 navigationMapSize = textureSize(uNavigationMapTextureArray, 0).xy;
	ivec2 agentCell = ivec2(state.position / uDownscaleFactor);

	// Agent Y is down-positive, while texture Y is up-positive.
	ivec2 navigationCell = ivec2(agentCell.x, navigationMapSize.y - 1 - agentCell.y);

	ivec2 bestDirectionVec = ivec2(0);
	float smallestWeight = UNREACHABLE;
	for (int x = -1; x <= 1; x++) {
		for (int y = -1; y <= 1; y++) {
			if (x == 0 && y == 0) {
				continue;
			}

			float weight = navigationWeight(navigationCell + ivec2(x, -y), state.destinationIndex);
			if (weight < smallestWeight) {
				bestDirectionVec = ivec2(x, y);
				smallestWeight = weight;
			}
		}
	}

	state.direction = atan(float(bestDirectionVec.y), float(bestDirectionVec.x));

	// vec2 directionVec = destination.position - state.position;
	// state.direction = atan(directionVec.y, directionVec.x);

	state.position += vec2(cos(state.direction), sin(state.direction)) * properties.speed;

	outState = packState(state);
}
