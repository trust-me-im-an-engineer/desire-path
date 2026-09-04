precision highp float;

out vec4 outColor;

void main() {
	vec2 fromCenter = gl_PointCoord * 2.0f - 1.0f;

	if(dot(fromCenter, fromCenter) > 1.0f) {
		discard;
	}

	outColor = vec4(1.0f, 0.2f, 0.0f, 0.5f);
}