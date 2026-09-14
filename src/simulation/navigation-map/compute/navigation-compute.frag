precision highp float;

uniform vec2 uDestinationPosition;
uniform sampler2D uTerrainTexture;

out float outWeight;

void main() {
    vec2 simulationSize = vec2(textureSize(uTerrainTexture, 0));

    vec2 position = vec2(gl_FragCoord.x, simulationSize.y - gl_FragCoord.y);

    float d = distance(position, uDestinationPosition);

    outWeight = d / length(max(uDestinationPosition, simulationSize - uDestinationPosition));
}
