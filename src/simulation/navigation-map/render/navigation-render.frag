precision highp float;
precision highp int;

uniform highp sampler2DArray uNavigationMaps;
uniform int uDestinationIndex;
uniform float uMaxReachableWeight;

in vec2 vUv;

out vec4 outColor;

void main() {
	float navigation = texture(uNavigationMaps, vec3(vUv, float(uDestinationIndex))).r;

	float t = clamp(navigation / uMaxReachableWeight, 0.0f, 1.0f);
	float alpha = 1.0f * pow(1.0f - t, 2.0f);
	outColor = vec4(0.0f, 0.0f, 1.0f, alpha);
}