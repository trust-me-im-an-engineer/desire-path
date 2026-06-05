const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

function initializeCanvas() {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
  canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function passabilityAt(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;
  let value = 0.72;

  value += 0.14 * Math.sin(nx * 10 + ny * 3);
  value += 0.10 * Math.cos(nx * 7 - ny * 12);

  const centerMeadow = Math.hypot(nx - 0.5, ny - 0.52);
  value += 0.22 * (1 - smoothstep(0.12, 0.34, centerMeadow));

  const pond = Math.hypot(nx - 0.52, ny - 0.28);
  if (pond < 0.09) return 0;
  value -= 0.45 * (1 - smoothstep(0.09, 0.15, pond));

  const groveLeft = Math.hypot(nx - 0.31, ny - 0.62);
  value -= 0.34 * (1 - smoothstep(0.10, 0.22, groveLeft));

  const groveRight = Math.hypot(nx - 0.72, ny - 0.58);
  value -= 0.30 * (1 - smoothstep(0.09, 0.20, groveRight));

  return Math.max(0, Math.min(1, value));
}

function drawCostMap() {
  const image = ctx.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const passability = passabilityAt(x, y, canvas.width, canvas.height);
      const shade = Math.round(passability * 255);
      const offset = (y * canvas.width + x) * 4;

      image.data[offset] = shade;
      image.data[offset + 1] = shade;
      image.data[offset + 2] = shade;
      image.data[offset + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}

initializeCanvas();
drawCostMap();
