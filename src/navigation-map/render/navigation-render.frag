precision highp float;

uniform sampler2D uNavigation;

in vec2 vUv;

out vec4 outColor;

void main() {
	// outColor = vec4(0.0f, 0.0f, 1.0f, 1.0f - log(texture(uNavigation, vUv).r) / log(20000000.0));
	outColor = vec4(0.0f, 0.0f, 1.0f, 1.0f - texture(uNavigation, vUv).r / 500000.0f);
}