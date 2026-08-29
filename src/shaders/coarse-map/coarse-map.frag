precision highp float;

#ifndef COARSE_MAP_DOWNSCALE
int COARSE_MAP_DOWNSCALE;
#endif

uniform sampler2D uTerrainTexture;

out float outWeight;
void main() {
	ivec2 base = ivec2(gl_FragCoord.xy) * COARSE_MAP_DOWNSCALE;
	float sum = 0.0f;

	for(int y = 0; y < COARSE_MAP_DOWNSCALE; y++) {
		for(int x = 0; x < COARSE_MAP_DOWNSCALE; x++) {
			sum += texelFetch(uTerrainTexture, base + ivec2(x, y), 0).r;
		}
	}

	outWeight = sum / float(COARSE_MAP_DOWNSCALE * COARSE_MAP_DOWNSCALE);
}