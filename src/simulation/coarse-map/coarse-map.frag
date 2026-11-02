precision highp float;
precision highp int;

uniform sampler2D uTerrainTexture;
uniform vec2 uCellSize;

out float outWeight;

void main() {
    // gl_FragCoord is at pixel centers; floor gives the cell index.
	ivec2 cell = ivec2(floor(gl_FragCoord.xy));
	ivec2 imageSize = textureSize(uTerrainTexture, 0);

	vec2 start = vec2(cell) * uCellSize;
	vec2 end = min(start + uCellSize, vec2(imageSize));

	ivec2 firstPixel = max(ivec2(floor(start)), ivec2(0));
	ivec2 endPixel = min(ivec2(ceil(end)), imageSize);

	float sum = 0.0f;
	float totalArea = 0.0f;

	for (int y = firstPixel.y; y < endPixel.y; y++) {
		for (int x = firstPixel.x; x < endPixel.x; x++) {
			vec2 pixelStart = vec2(float(x), float(y));

			vec2 overlap = max(min(end, pixelStart + vec2(1.0f)) - max(start, pixelStart), vec2(0.0f));

			float area = overlap.x * overlap.y;

			sum += texelFetch(uTerrainTexture, ivec2(x, y), 0).r * area;
			totalArea += area;
		}
	}

	outWeight = sum / max(totalArea, 0.000001f);
}
