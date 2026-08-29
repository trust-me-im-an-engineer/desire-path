precision highp float;

uniform vec2 uInterestPointPosition;
uniform vec2 uSimulationSize;
uniform sampler2D uTerrainTexture;

out float outWeight;

void main() {
    vec2 position = vec2(gl_FragCoord.x, uSimulationSize.y - gl_FragCoord.y);

    float d = distance(position, uInterestPointPosition);

    outWeight = d / length(max(uInterestPointPosition, uSimulationSize - uInterestPointPosition));
}