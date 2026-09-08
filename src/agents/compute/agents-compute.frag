precision highp float;

uniform sampler2D uPreviousStateTexture;

out vec4 outState;

void main() {
	vec4 inState = texelFetch(uPreviousStateTexture, ivec2(gl_FragCoord.xy), 0);
	outState = vec4(inState.x, inState.y, inState.z - 0.01f, inState.w);
}