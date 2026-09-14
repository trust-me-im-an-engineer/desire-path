precision highp float;

#ifndef DOWNSCALE_FACTOR
int DOWNSCALE_FACTOR;
#endif

uniform sampler2D uTerrainTexture;

out float outWeight;
void main() {
	ivec2 base = ivec2(gl_FragCoord.xy) * DOWNSCALE_FACTOR;
	float sum = 0.0f;

	for(int y = 0; y < DOWNSCALE_FACTOR; y++) {
		for(int x = 0; x < DOWNSCALE_FACTOR; x++) {
			sum += texelFetch(uTerrainTexture, base + ivec2(x, y), 0).r;
		}
	}

	outWeight = sum / float(DOWNSCALE_FACTOR * DOWNSCALE_FACTOR);
}
