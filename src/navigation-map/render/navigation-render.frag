precision highp float;
precision highp int;

uniform highp sampler2DArray uNavigationMaps;
uniform int uDestinationIndex;

in vec2 vUv;

out vec4 outColor;

void main() {
	float navigation = texture(uNavigationMaps, vec3(vUv, float(uDestinationIndex))).r;

	outColor = vec4(0.0f, 0.0f, 1.0f, 1.0f - navigation / 500000.0f);
}