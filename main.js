const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  drawCanvasPlaceholder(rect.width, rect.height, dpr);
}

function drawCanvasPlaceholder(cssWidth, cssHeight, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#101311";
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  ctx.strokeStyle = "rgba(238, 242, 232, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssWidth - 1, cssHeight - 1);

  ctx.fillStyle = "rgba(238, 242, 232, 0.68)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(`${Math.round(cssWidth)} x ${Math.round(cssHeight)}`, 16, 28);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
