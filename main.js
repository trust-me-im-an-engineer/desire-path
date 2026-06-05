const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const controls = {
  agentCount: document.getElementById("agentCount"),
  agentCountValue: document.getElementById("agentCountValue"),
  simSpeed: document.getElementById("simSpeed"),
  simSpeedValue: document.getElementById("simSpeedValue"),
  showAgents: document.getElementById("showAgents"),
  showCostMap: document.getElementById("showCostMap"),
  showTrace: document.getElementById("showTrace"),
  pauseButton: document.getElementById("pauseButton"),
  resetTraceButton: document.getElementById("resetTraceButton"),
  fpsValue: document.getElementById("fpsValue"),
  activeAgentsValue: document.getElementById("activeAgentsValue"),
};

const sim = {
  width: 640,
  height: 400,
  cost: null,
  trace: null,
  waypoints: [],
  agents: [],
  paused: false,
  targetAgents: Number(controls.agentCount.value),
  speed: Number(controls.simSpeed.value),
  lastTime: performance.now(),
  fpsTime: performance.now(),
  fpsFrames: 0,
  costImage: null,
  traceImage: null,
  displayCanvas: document.createElement("canvas"),
  traceCanvas: document.createElement("canvas"),
};

const TAU = Math.PI * 2;
const IMPASSABLE = 0.055;
const MAX_AGENTS = 800;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function unit() {
  return Math.min(sim.width / 256, sim.height / 160);
}

function weightedPick(items, weightFn) {
  let total = 0;
  for (const item of items) total += Math.max(0, weightFn(item));
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= Math.max(0, weightFn(item));
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function idx(x, y) {
  return y * sim.width + x;
}

function sampleLayer(layer, x, y) {
  const ix = clamp(Math.floor(x), 0, sim.width - 1);
  const iy = clamp(Math.floor(y), 0, sim.height - 1);
  return layer[idx(ix, iy)];
}

function createEnvironment() {
  sim.cost = new Float32Array(sim.width * sim.height);
  sim.trace = new Float32Array(sim.width * sim.height);

  const sx = sim.width / 256;
  const sy = sim.height / 160;
  const scale = unit();
  const waypoint = (x, y, radius, attraction, color) => ({
    x: x * sx,
    y: y * sy,
    radius: radius * scale,
    attraction,
    color,
  });

  sim.waypoints = [
    waypoint(35, 28, 13, 0.65, "#f0cc58"),
    waypoint(218, 30, 16, 0.95, "#f07b50"),
    waypoint(48, 132, 15, 0.8, "#5fb6dc"),
    waypoint(210, 126, 14, 0.72, "#ad91e8"),
    waypoint(132, 82, 18, 1.0, "#7fc96f"),
  ];

  for (let y = 0; y < sim.height; y++) {
    for (let x = 0; x < sim.width; x++) {
      const nx = x / sim.width;
      const ny = y / sim.height;
      let passability = 0.55;

      passability += 0.22 * Math.sin(nx * 8.4 + 0.8) * Math.sin(ny * 5.7 - 0.3);
      passability += 0.12 * Math.cos(nx * 18.0 - ny * 7.2);
      passability += 0.08 * Math.sin((nx + ny) * 15.0);

      const meadow = Math.hypot(x - 128 * sx, y - 82 * sy);
      passability += 0.22 * (1 - smoothstep(28 * scale, 72 * scale, meadow));

      const pond = Math.hypot(x - 128 * sx, y - 44 * sy);
      passability = pond < 18 * scale ? 0 : passability * (1 - 0.65 * (1 - smoothstep(18 * scale, 32 * scale, pond)));

      const groveA = Math.hypot(x - 88 * sx, y - 92 * sy);
      passability *= 1 - 0.45 * (1 - smoothstep(20 * scale, 44 * scale, groveA));

      const groveB = Math.hypot(x - 178 * sx, y - 96 * sy);
      passability *= 1 - 0.42 * (1 - smoothstep(18 * scale, 42 * scale, groveB));

      for (const waypoint of sim.waypoints) {
        const distance = Math.hypot(x - waypoint.x, y - waypoint.y);
        if (distance < waypoint.radius * 0.34) {
          passability = 0;
        } else {
          const influence = 1 - smoothstep(waypoint.radius * 0.45, waypoint.radius * 1.45, distance);
          passability = lerp(passability, 0.95, influence * 0.72);
        }
      }

      sim.cost[idx(x, y)] = clamp(passability, 0, 1);
    }
  }

  updateCostImage();
}

function updateCostImage() {
  const image = new ImageData(sim.width, sim.height);
  for (let i = 0; i < sim.cost.length; i++) {
    const passability = sim.cost[i];
    const shade = Math.floor(42 + passability * 136);
    const o = i * 4;
    if (passability <= IMPASSABLE) {
      image.data[o] = 18;
      image.data[o + 1] = 21;
      image.data[o + 2] = 19;
    } else {
      image.data[o] = Math.floor(shade * 0.78);
      image.data[o + 1] = shade;
      image.data[o + 2] = Math.floor(shade * 0.68);
    }
    image.data[o + 3] = 255;
  }
  sim.costImage = image;
}

function updateTraceImage() {
  const image = new ImageData(sim.width, sim.height);
  for (let i = 0; i < sim.trace.length; i++) {
    const trace = Math.pow(clamp(sim.trace[i], 0, 1), 0.62);
    const o = i * 4;
    image.data[o] = Math.floor(238 * trace);
    image.data[o + 1] = Math.floor(221 * trace);
    image.data[o + 2] = Math.floor(132 * trace);
    image.data[o + 3] = Math.floor(225 * trace);
  }
  sim.traceImage = image;
}

function pickSpawnWaypoint() {
  return weightedPick(sim.waypoints, waypoint => waypoint.attraction * waypoint.attraction + 0.08);
}

function pickTargetWaypoint(origin) {
  return weightedPick(sim.waypoints.filter(waypoint => waypoint !== origin), waypoint => {
    const distance = Math.hypot(waypoint.x - origin.x, waypoint.y - origin.y);
    return waypoint.attraction * waypoint.attraction * 8 + 120 / Math.max(24, distance);
  });
}

function spawnAgent() {
  const origin = pickSpawnWaypoint();
  const target = pickTargetWaypoint(origin);

  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = Math.random() * TAU;
    const distance = rand(origin.radius * 0.58, origin.radius * 1.25);
    const x = origin.x + Math.cos(angle) * distance;
    const y = origin.y + Math.sin(angle) * distance;
    if (sampleLayer(sim.cost, x, y) <= IMPASSABLE) continue;

    const direction = Math.atan2(target.y - y, target.x - x);
    const commitment = Math.pow(Math.random(), 0.75);
    sim.agents.push({
      x,
      y,
      vx: Math.cos(direction) * 0.45,
      vy: Math.sin(direction) * 0.45,
      speed: rand(0.25, 0.55),
      commitment,
      target,
      age: 0,
      maxAge: rand(46, 92),
      traceClock: Math.random() * 0.22,
    });
    return;
  }
}

function maybeChangeTarget(agent, dt) {
  const chance = (1 - agent.commitment) * 0.018 * dt;
  if (Math.random() > chance) return;

  const current = agent.target;
  agent.target = weightedPick(sim.waypoints.filter(waypoint => waypoint !== current), waypoint => {
    const distance = Math.hypot(waypoint.x - agent.x, waypoint.y - agent.y);
    return waypoint.attraction * 10 + 80 / Math.max(18, distance);
  });
}

function effectivePassability(x, y, commitment) {
  const base = sampleLayer(sim.cost, x, y);
  if (base <= IMPASSABLE) return 0;

  const trace = sampleLayer(sim.trace, x, y);
  const middleSurface = 1 - Math.abs(base - 0.5) * 1.75;
  const traceEffect = trace * clamp(middleSurface, 0, 1) * lerp(0.52, 0.24, commitment);
  return clamp(base + (1 - base) * traceEffect, 0, 1);
}

function chooseDirection(agent) {
  const desiredAngle = Math.atan2(agent.target.y - agent.y, agent.target.x - agent.x);
  const currentAngle = Math.atan2(agent.vy, agent.vx);
  const candidateCount = 13;
  const spread = lerp(1.35, 0.72, agent.commitment);
  const stride = 2.25 * unit();
  let bestScore = -Infinity;
  let bestAngle = desiredAngle;

  for (let i = 0; i < candidateCount; i++) {
    const t = candidateCount === 1 ? 0 : i / (candidateCount - 1);
    const offset = (t - 0.5) * spread * 2;
    const jitter = rand(-0.22, 0.22) * (1.08 - agent.commitment * 0.72);
    const angle = desiredAngle + offset + jitter;
    const nx = agent.x + Math.cos(angle) * stride;
    const ny = agent.y + Math.sin(angle) * stride;
    const passability = effectivePassability(nx, ny, agent.commitment);
    if (passability <= IMPASSABLE) continue;

    const routeFit = Math.cos(angle - desiredAngle);
    const inertiaFit = Math.cos(angle - currentAngle);
    const trace = sampleLayer(sim.trace, nx, ny);
    const noise = rand(-0.05, 0.05) * (1.15 - agent.commitment);

    const score =
      routeFit * lerp(0.7, 1.75, agent.commitment) +
      inertiaFit * lerp(0.78, 0.42, agent.commitment) +
      passability * lerp(1.9, 0.88, agent.commitment) +
      trace * lerp(1.35, 0.32, agent.commitment) +
      noise;

    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

function updateAgent(agent, dt) {
  agent.age += dt;
  agent.traceClock -= dt;
  maybeChangeTarget(agent, dt);

  const targetDistance = Math.hypot(agent.target.x - agent.x, agent.target.y - agent.y);
  if (targetDistance < agent.target.radius * 1.15 || agent.age > agent.maxAge) {
    return false;
  }

  const angle = chooseDirection(agent);
  const localPassability = effectivePassability(agent.x, agent.y, agent.commitment);
  const desiredSpeed = lerp(0.48, 0.78, agent.commitment) * lerp(0.35, 1.0, localPassability);
  const turnRate = lerp(0.06, 0.15, agent.commitment);
  const speedRate = 0.055;

  const desiredVx = Math.cos(angle) * desiredSpeed;
  const desiredVy = Math.sin(angle) * desiredSpeed;
  agent.vx = lerp(agent.vx, desiredVx, turnRate);
  agent.vy = lerp(agent.vy, desiredVy, turnRate);
  agent.speed = lerp(agent.speed, desiredSpeed, speedRate);

  const nextX = agent.x + agent.vx * dt * 38 * unit();
  const nextY = agent.y + agent.vy * dt * 38 * unit();

  if (sampleLayer(sim.cost, nextX, nextY) > IMPASSABLE) {
    agent.x = clamp(nextX, 1, sim.width - 2);
    agent.y = clamp(nextY, 1, sim.height - 2);
  } else {
    const angle = Math.atan2(agent.vy, agent.vx) + rand(-1.4, 1.4);
    agent.vx = Math.cos(angle) * agent.speed * 0.35;
    agent.vy = Math.sin(angle) * agent.speed * 0.35;
  }

  if (agent.traceClock <= 0) {
    stampTrace(agent);
    agent.traceClock = 0.18;
  }

  return true;
}

function stampTrace(agent) {
  const radius = 2.8 * unit();
  const minX = Math.max(0, Math.floor(agent.x - radius));
  const maxX = Math.min(sim.width - 1, Math.ceil(agent.x + radius));
  const minY = Math.max(0, Math.floor(agent.y - radius));
  const maxY = Math.min(sim.height - 1, Math.ceil(agent.y + radius));
  const speed = Math.hypot(agent.vx, agent.vy);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const distance = Math.hypot(x + 0.5 - agent.x, y + 0.5 - agent.y);
      if (distance > radius) continue;

      const passability = sim.cost[idx(x, y)];
      if (passability <= IMPASSABLE) continue;

      const middleSurface = clamp(1 - Math.abs(passability - 0.5) * 1.85, 0, 1);
      const falloff = 1 - smoothstep(0, radius, distance);
      const amount = falloff * middleSurface * clamp(speed * 0.025, 0.004, 0.018);
      const index = idx(x, y);
      sim.trace[index] = clamp(sim.trace[index] + amount, 0, 1);
    }
  }
}

function decayTrace(dt) {
  const decay = Math.pow(0.9925, dt * 60);
  for (let i = 0; i < sim.trace.length; i++) {
    sim.trace[i] *= decay;
    if (sim.trace[i] < 0.0005) sim.trace[i] = 0;
  }
}

function update(dt) {
  const scaledDt = dt * sim.speed;
  const shortage = sim.targetAgents - sim.agents.length;
  const spawnAttempts = clamp(Math.ceil(shortage * 0.08), 0, 18);

  for (let i = 0; i < spawnAttempts && sim.agents.length < Math.min(sim.targetAgents, MAX_AGENTS); i++) {
    if (Math.random() < 0.72 || sim.agents.length < sim.targetAgents * 0.55) spawnAgent();
  }

  for (let i = sim.agents.length - 1; i >= 0; i--) {
    if (!updateAgent(sim.agents[i], scaledDt)) {
      sim.agents.splice(i, 1);
    }
  }

  decayTrace(scaledDt);
}

function render() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const display = sim.displayCanvas;
  display.width = sim.width;
  display.height = sim.height;
  const displayCtx = display.getContext("2d", { alpha: false });

  if (controls.showCostMap.checked) {
    displayCtx.putImageData(sim.costImage, 0, 0);
  } else {
    displayCtx.fillStyle = "#111511";
    displayCtx.fillRect(0, 0, sim.width, sim.height);
  }

  if (controls.showTrace.checked) {
    updateTraceImage();
    const trace = sim.traceCanvas;
    trace.width = sim.width;
    trace.height = sim.height;
    trace.getContext("2d").putImageData(sim.traceImage, 0, 0);
    displayCtx.globalCompositeOperation = "screen";
    displayCtx.drawImage(trace, 0, 0);
    displayCtx.globalCompositeOperation = "source-over";
  }

  for (const waypoint of sim.waypoints) {
    displayCtx.beginPath();
    displayCtx.arc(waypoint.x, waypoint.y, waypoint.radius * 0.34, 0, TAU);
    displayCtx.fillStyle = "rgba(12, 15, 13, 0.92)";
    displayCtx.fill();
    displayCtx.beginPath();
    displayCtx.arc(waypoint.x, waypoint.y, waypoint.radius, 0, TAU);
    displayCtx.strokeStyle = waypoint.color;
    displayCtx.lineWidth = 1.4;
    displayCtx.stroke();
  }

  if (controls.showAgents.checked) {
    displayCtx.fillStyle = "rgba(245, 248, 237, 0.88)";
    for (const agent of sim.agents) {
      displayCtx.beginPath();
      displayCtx.arc(agent.x, agent.y, 1.05 * unit(), 0, TAU);
      displayCtx.fill();
    }
  }

  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = "#101311";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(canvas.width / sim.width, canvas.height / sim.height);
  const drawWidth = sim.width * scale;
  const drawHeight = sim.height * scale;
  const offsetX = (canvas.width - drawWidth) * 0.5;
  const offsetY = (canvas.height - drawHeight) * 0.5;

  ctx.drawImage(display, offsetX, offsetY, drawWidth, drawHeight);
}

function frame(time) {
  const rawDt = Math.min(0.05, (time - sim.lastTime) / 1000 || 0);
  sim.lastTime = time;

  if (!sim.paused) update(rawDt);
  render();

  sim.fpsFrames++;
  if (time - sim.fpsTime > 500) {
    controls.fpsValue.textContent = String(Math.round(sim.fpsFrames * 1000 / (time - sim.fpsTime)));
    controls.activeAgentsValue.textContent = String(sim.agents.length);
    sim.fpsFrames = 0;
    sim.fpsTime = time;
  }

  requestAnimationFrame(frame);
}

controls.agentCount.addEventListener("input", () => {
  sim.targetAgents = Number(controls.agentCount.value);
  controls.agentCountValue.textContent = String(sim.targetAgents);
});

controls.simSpeed.addEventListener("input", () => {
  sim.speed = Number(controls.simSpeed.value);
  controls.simSpeedValue.textContent = sim.speed.toFixed(2);
});

controls.pauseButton.addEventListener("click", () => {
  sim.paused = !sim.paused;
  controls.pauseButton.textContent = sim.paused ? "Старт" : "Пауза";
});

controls.resetTraceButton.addEventListener("click", () => {
  sim.trace.fill(0);
});

createEnvironment();
for (let i = 0; i < sim.targetAgents; i++) spawnAgent();
requestAnimationFrame(frame);
