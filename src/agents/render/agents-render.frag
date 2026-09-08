precision highp float;

flat in vec2 vDirection;

out vec4 outColor;

void main() {
	// convert from upper-left-centred coords to middle centred coords
	vec2 fromCenter = gl_PointCoord * 2.0f - 1.0f;

	// direction perpendicular to agents' direction
	vec2 sidewayDirection = vec2(-vDirection.y, vDirection.x);

	// convert to local coordinate system (allign with agent's rotation)
	vec2 localPosition = vec2(dot(fromCenter, vDirection), dot(fromCenter, sidewayDirection));

	// Define traingle params
	float traingleTipPosition = 0.9f;
	float traingleRearPosition = -0.8f;
	float traingleRearWidth = 1.2f;

	// calculate local traingle half width (pixel within this width are drawn, and outside are discarded)
	float localTraingleHalfWidth = traingleRearWidth * (traingleTipPosition - localPosition.x) / (traingleTipPosition - traingleRearPosition) / 2.0f;

	// Draw right facing traingle (in local coordinates)
	if(localPosition.x < traingleRearPosition ||
		localPosition.x > traingleTipPosition ||
		abs(localPosition.y) > localTraingleHalfWidth) {
		discard;
	}

	outColor = vec4(1.0f, 0.2f, 0.0f, 0.5f);
}
