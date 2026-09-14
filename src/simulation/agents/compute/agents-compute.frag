#define PI 3.14159265359

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

// random is [0.0, 1.0) value generated at each pass.
float random;

// State represents dynamic agent state.
struct State {
	vec2 position;
	float direction;
	int destinationIndex;
};

// readState reads agent state from state texture.
State readState(ivec2 textureCoord) {
	vec4 packed = texelFetch(uPreviousStateTexture, textureCoord, 0);

	return State(packed.xy, packed.z, int(packed.w));
}

// packState packs agent state to RGBA pixel.
vec4 packState(State state) {
	return vec4(state.position, state.direction, float(state.destinationIndex));
}

// Properties represents static agent properties.
struct Properties {
	float seed;
	float speed;
};

// readProperties reads agent properties from properties texture.
Properties readProperties(ivec2 textureCoord) {
	vec2 packed = texelFetch(uPropertiesTexture, textureCoord, 0).xy;

	return Properties(packed.x, packed.y);
}

// Destination represents destination properties.
struct Destination {
	vec2 position;
	float weight;
	int index;
};

// readDestination reads destination from texture.
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
float generateRandom(State state, Properties properties) {
	uint value = floatBitsToUint(properties.seed);

	value ^= pcgHash(uint(gl_FragCoord.x));
	value ^= pcgHash(uint(gl_FragCoord.y));
	value ^= pcgHash(floatBitsToUint(state.position.x));
	value ^= pcgHash(floatBitsToUint(state.position.y));
	value ^= pcgHash(floatBitsToUint(state.direction));
	value ^= pcgHash(uint(state.destinationIndex));

	// Use 24 bits so conversion cannot round up to 1.0.
	return float(pcgHash(value) >> 8u) *
		(1.0f / 16777216.0f);
}

// isDestinationReached checks if agent is closer to its destination, than destination's weight.
bool isDestinationReached(State state, Destination destination) {
	return distance(state.position, destination.position) < destination.weight;
}

// chooseNextDestination chooses a new destination randomly according to weights.
Destination chooseNextDestination(Destination currentDestination) {
	int i = 0;
	Destination destination;
	float collectedWeight = 0.0f;

	int capacity = textureSize(uDestinationsTexture, 0).x;

	for (int i = 0; i < capacity; i++) {
		if (collectedWeight >= random * (uDestinationsTotalWeight - currentDestination.weight)) {
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
// Cells out of bounds returned as UNREACHABLE.
float getNavigationWeight(ivec2 cell, int layer) {
	ivec2 size = textureSize(uNavigationMapTextureArray, 0).xy;
	if (any(lessThan(cell, ivec2(0))) ||
		any(greaterThanEqual(cell, size))) {
		return UNREACHABLE;
	}

	return texelFetch(uNavigationMapTextureArray, ivec3(cell, layer), 0).r;
}

float angleDiff(float a, float b) {
	float d = abs(a - b);
	return min(d, 2.0f * PI - d);
}

// steer sets agent's direction.
void steer(inout State state) {
	ivec2 downscaledPosition = ivec2(state.position / uDownscaleFactor);
	ivec2 navigationMapSize = textureSize(uNavigationMapTextureArray, 0).xy;

	// Agent Y is down-positive, while texture Y is up-positive.
	ivec2 navigationPosition = ivec2(downscaledPosition.x, navigationMapSize.y - 1 - downscaledPosition.y);

	ivec2 bestDirectionVec = ivec2(0);
	float smallestWeight = UNREACHABLE;
	for (int x = -1; x <= 1; x++) {
		for (int y = -1; y <= 1; y++) {
			if (x == 0 && y == 0) {
				continue;
			}

			float navigationWeight = getNavigationWeight(navigationPosition + ivec2(x, -y), state.destinationIndex);

			float direction = atan(float(y), float(x));
			float steeringWeight = angleDiff(state.direction, direction) * 2000.0f;

			float weight = navigationWeight + steeringWeight;

			if (weight < smallestWeight) {
				bestDirectionVec = ivec2(x, y);
				smallestWeight = weight;
			}
		}
	}

	state.direction = atan(float(bestDirectionVec.y), float(bestDirectionVec.x));
}

// move sets agent's new posision based on its position and direction.
void move(inout State state, float speed) {
	vec2 movementVec = vec2(cos(state.direction), sin(state.direction));
	state.position += movementVec * speed;
}

void main() {
	ivec2 textureCoord = ivec2(gl_FragCoord.xy);
	State state = readState(textureCoord);
	Properties properties = readProperties(textureCoord);
	Destination destination = readDestination(state.destinationIndex);

	random = generateRandom(state, properties);

	if (isDestinationReached(state, destination)) {
		destination = chooseNextDestination(destination);
		state.destinationIndex = destination.index;
	}

	steer(state);

	move(state, properties.speed);

	outState = packState(state);
}
