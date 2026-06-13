const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const routeResolutionInput = document.getElementById("routeResolution");
const routeResolutionValue = document.getElementById("routeResolutionValue");
const agentCountInput = document.getElementById("agentCount");
const agentCountValue = document.getElementById("agentCountValue");
const turnSmoothnessInput = document.getElementById("turnSmoothness");
const turnSmoothnessValue = document.getElementById("turnSmoothnessValue");
const wanderStrengthInput = document.getElementById("wanderStrength");
const wanderStrengthValue = document.getElementById("wanderStrengthValue");
const wanderChangeRateInput = document.getElementById("wanderChangeRate");
const wanderChangeRateValue = document.getElementById("wanderChangeRateValue");
const wanderBlendRateInput = document.getElementById("wanderBlendRate");
const wanderBlendRateValue = document.getElementById("wanderBlendRateValue");
const routeDebugInput = document.getElementById("routeDebug");

const waypoints = [
  { x: 0.16, y: 0.18 },
  { x: 0.78, y: 0.20 },
  { x: 0.18, y: 0.80 },
  { x: 0.80, y: 0.78 },
  { x: 0.50, y: 0.56 },
  { x: 0.50, y: 0.36 },
];

const agents = [];
const impassableThreshold = 0.01
const trailDepositRate = 0.018;
const trailPassabilityBonus = 0.1;
const routeRecalculateInterval = 1;
const minimumAgentSpawnRate = 6;
const agentPopulationRecoveryTime = 8;
let wanderStrength = Number(wanderStrengthInput.value);
let wanderChangeRate = Number(wanderChangeRateInput.value);
let wanderBlendRate = Number(wanderBlendRateInput.value);
let agentCount = Number(agentCountInput.value);
let turnSmoothness = Number(turnSmoothnessInput.value);
let routeResolutionScale = Number(routeResolutionInput.value);
let previousTime = 0;
let routeRecalculateTimer = 0;
let routeRecalculateIndex = 0;
let agentSpawnRemainder = 0;
let routesByWaypoint = [];
let trailGrid = null;
let isRouteDebugVisible = routeDebugInput.checked;

const costMapImage = new Image();
costMapImage.src = "./assets/initial-cost-map.png";
costMapImage.addEventListener("load", start);
routeResolutionInput.addEventListener("input", updateRouteResolution);
agentCountInput.addEventListener("input", updateAgentCount);
turnSmoothnessInput.addEventListener("input", updateTurnSmoothness);
wanderStrengthInput.addEventListener("input", updateWanderSettings);
wanderChangeRateInput.addEventListener("input", updateWanderSettings);
wanderBlendRateInput.addEventListener("input", updateWanderSettings);
routeDebugInput.addEventListener("input", updateRouteDebug);

function initializeCanvas() {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
  canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function start() {
  initializeCanvas();
  updateRouteResolutionLabel();
  updateAgentCountLabel();
  updateTurnSmoothnessLabel();
  updateWanderSettingsLabels();
  routesByWaypoint = calculateRoutesByWaypoint();
  syncAgentCount();

  requestAnimationFrame(tick);
}

function tick(time) {
  const deltaTime = Math.min(0.05, (time - previousTime) / 1000 || 0);
  previousTime = time;

  updateAgents(deltaTime);
  spawnAgents(deltaTime);
  updateRoutesAfterTrails(deltaTime);
  drawScene();

  requestAnimationFrame(tick);
}

function createAgent() {
  const originIndex = randomWaypointIndex();
  let targetIndex = randomWaypointIndex();

  while (targetIndex === originIndex) {
    targetIndex = randomWaypointIndex();
  }

  const origin = waypoints[originIndex];
  const target = waypoints[targetIndex];
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy) || 1;

  return {
    x: origin.x,
    y: origin.y,
    vx: dx / distance,
    vy: dy / distance,
    wanderX: 0,
    wanderY: 0,
    targetWanderX: 0,
    targetWanderY: 0,
    targetIndex,
    speed: 0.045 + Math.random() * 0.035,
  };
}

function randomWaypointIndex() {
  return Math.floor(Math.random() * waypoints.length);
}

function updateAgents(deltaTime) {
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const target = waypoints[agent.targetIndex];
    const desiredDirection = findCoarseRouteDirection(agent);

    if (Math.hypot(target.x - agent.x, target.y - agent.y) < 0.01) {
      agents.splice(i, 1);
      i--;
      continue;
    }

    updateAgentWander(agent, deltaTime);
    blendAgentDirection(agent, applyAgentWander(agent, desiredDirection), deltaTime);
    avoidImpassableStep(agent, agent.speed * deltaTime);

    const step = agent.speed * deltaTime;
    agent.x += agent.vx * step;
    agent.y += agent.vy * step;
    depositAgentTrail(agent, deltaTime);
  }
}

function blendAgentDirection(agent, desiredDirection, deltaTime) {
  const turnRate = 12 / (1 + turnSmoothness);
  const turnBlend = 1 - Math.exp(-turnRate * deltaTime);
  const vx = agent.vx + (desiredDirection.x - agent.vx) * turnBlend;
  const vy = agent.vy + (desiredDirection.y - agent.vy) * turnBlend;
  const length = Math.hypot(vx, vy) || 1;

  agent.vx = vx / length;
  agent.vy = vy / length;
}

function updateAgentWander(agent, deltaTime) {
  if (Math.random() < wanderChangeRate * deltaTime) {
    const angle = Math.random() * Math.PI * 2;
    const strength = Math.random() * wanderStrength;
    agent.targetWanderX = Math.cos(angle) * strength;
    agent.targetWanderY = Math.sin(angle) * strength;
  }

  const blend = 1 - Math.exp(-wanderBlendRate * deltaTime);
  agent.wanderX += (agent.targetWanderX - agent.wanderX) * blend;
  agent.wanderY += (agent.targetWanderY - agent.wanderY) * blend;
}

function applyAgentWander(agent, direction) {
  const route = routesByWaypoint[agent.targetIndex];
  const candidateX = direction.x + agent.wanderX;
  const candidateY = direction.y + agent.wanderY;
  const candidateLength = Math.hypot(candidateX, candidateY) || 1;
  const candidateDirection = {
    x: candidateX / candidateLength,
    y: candidateY / candidateLength,
  };
  const wanderScale = route ? sampleForwardPassability(route, agent, candidateDirection) : 1;
  const x = direction.x + agent.wanderX * wanderScale;
  const y = direction.y + agent.wanderY * wanderScale;
  const length = Math.hypot(x, y) || 1;

  return {
    x: x / length,
    y: y / length,
  };
}

function sampleForwardPassability(route, agent, direction) {
  const lookAhead = 1 / Math.min(route.width, route.height);
  const x = (agent.x + direction.x * lookAhead) * route.width - 0.5;
  const y = (agent.y + direction.y * lookAhead) * route.height - 0.5;

  return Math.pow(samplePassability(route, x, y), 2);
}

function avoidImpassableStep(agent, step) {
  const route = routesByWaypoint[agent.targetIndex];
  if (!route) return;

  const x = (agent.x + agent.vx * step) * route.width - 0.5;
  const y = (agent.y + agent.vy * step) * route.height - 0.5;
  if (samplePassability(route, x, y) > 0) return;

  const direction = findCoarseRouteDirection(agent);
  agent.vx = direction.x;
  agent.vy = direction.y;
  agent.wanderX = 0;
  agent.wanderY = 0;
  agent.targetWanderX = 0;
  agent.targetWanderY = 0;
}

function findCoarseRouteDirection(agent) {
  const route = routesByWaypoint[agent.targetIndex];
  if (!route) return directionToWaypoint(agent);

  const gridX = agent.x * route.width - 0.5;
  const gridY = agent.y * route.height - 0.5;
  const currentDistance = sampleRouteDistance(route, gridX, gridY);
  let directionX = 0;
  let directionY = 0;
  let totalWeight = 0;

  if (!Number.isFinite(currentDistance) || currentDistance === 0) {
    return directionToWaypoint(agent);
  }

  for (let y = Math.floor(gridY) - 2; y <= Math.floor(gridY) + 2; y++) {
    for (let x = Math.floor(gridX) - 2; x <= Math.floor(gridX) + 2; x++) {
      if (x < 0 || x >= route.width || y < 0 || y >= route.height) continue;

      const distance = route.distance[y * route.width + x];
      const improvement = currentDistance - distance;
      if (!Number.isFinite(distance) || improvement <= 0) continue;

      const dx = x - gridX;
      const dy = y - gridY;
      const length = Math.hypot(dx, dy);
      if (length === 0) continue;

      const nx = dx / length;
      const ny = dy / length;
      const weight = improvement / (1 + length);

      directionX += nx * weight;
      directionY += ny * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return directionToWaypoint(agent);

  const length = Math.hypot(directionX, directionY) || 1;
  return {
    x: directionX / length,
    y: directionY / length,
  };
}

function sampleRouteDistance(route, x, y) {
  const x0 = Math.max(0, Math.min(route.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(route.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(route.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(route.height - 1, y0 + 1));
  const tx = Math.max(0, Math.min(1, x - x0));
  const ty = Math.max(0, Math.min(1, y - y0));

  return weightedRouteDistance(route, [
    { x: x0, y: y0, weight: (1 - tx) * (1 - ty) },
    { x: x1, y: y0, weight: tx * (1 - ty) },
    { x: x0, y: y1, weight: (1 - tx) * ty },
    { x: x1, y: y1, weight: tx * ty },
  ]);
}

function samplePassability(route, x, y) {
  const x0 = Math.max(0, Math.min(route.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(route.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(route.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(route.height - 1, y0 + 1));
  const tx = Math.max(0, Math.min(1, x - x0));
  const ty = Math.max(0, Math.min(1, y - y0));
  const top = interpolate(route.passability[y0 * route.width + x0], route.passability[y0 * route.width + x1], tx);
  const bottom = interpolate(route.passability[y1 * route.width + x0], route.passability[y1 * route.width + x1], tx);

  return interpolate(top, bottom, ty);
}

function interpolate(a, b, t) {
  return a + (b - a) * t;
}

function weightedRouteDistance(route, samples) {
  let distance = 0;
  let weight = 0;

  for (const sample of samples) {
    const value = route.distance[sample.y * route.width + sample.x];
    if (!Number.isFinite(value) || sample.weight === 0) continue;

    distance += value * sample.weight;
    weight += sample.weight;
  }

  return weight === 0 ? Infinity : distance / weight;
}

function directionToWaypoint(agent) {
  const target = waypoints[agent.targetIndex];
  const dx = target.x - agent.x;
  const dy = target.y - agent.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: dx / length,
    y: dy / length,
  };
}

function updateRouteResolution() {
  routeResolutionScale = Number(routeResolutionInput.value);
  updateRouteResolutionLabel();
  routeRecalculateIndex = 0;
  routeRecalculateTimer = 0;
  routesByWaypoint = calculateRoutesByWaypoint();
}

function updateRouteResolutionLabel() {
  routeResolutionValue.textContent = `1:${routeResolutionScale}`;
}

function updateAgentCount() {
  agentCount = Number(agentCountInput.value);
  updateAgentCountLabel();
  syncAgentCount();
}

function updateAgentCountLabel() {
  agentCountValue.textContent = String(agentCount);
}

function updateTurnSmoothness() {
  turnSmoothness = Number(turnSmoothnessInput.value);
  updateTurnSmoothnessLabel();
}

function updateTurnSmoothnessLabel() {
  turnSmoothnessValue.textContent = String(turnSmoothness);
}

function updateWanderSettings() {
  wanderStrength = Number(wanderStrengthInput.value);
  wanderChangeRate = Number(wanderChangeRateInput.value);
  wanderBlendRate = Number(wanderBlendRateInput.value);
  updateWanderSettingsLabels();
}

function updateWanderSettingsLabels() {
  wanderStrengthValue.textContent = String(wanderStrength);
  wanderChangeRateValue.textContent = String(wanderChangeRate);
  wanderBlendRateValue.textContent = String(wanderBlendRate);
}

function updateRouteDebug() {
  isRouteDebugVisible = routeDebugInput.checked;
}

function syncAgentCount() {
  if (agents.length > agentCount) {
    agents.length = agentCount;
  }
}

function spawnAgents(deltaTime) {
  if (agents.length >= agentCount) {
    agentSpawnRemainder = 0;
    return;
  }

  const missingAgents = agentCount - agents.length;
  const spawnRate = Math.max(minimumAgentSpawnRate, agentCount / agentPopulationRecoveryTime);
  agentSpawnRemainder += spawnRate * deltaTime;
  const spawnCount = Math.min(missingAgents, Math.floor(agentSpawnRemainder));

  if (spawnCount === 0) return;

  agentSpawnRemainder -= spawnCount;

  for (let i = 0; i < spawnCount; i++) {
    agents.push(createAgent());
  }
}

function calculateRoutesByWaypoint() {
  const width = Math.max(1, Math.round(canvas.width / routeResolutionScale));
  const height = Math.max(1, Math.round(canvas.height / routeResolutionScale));
  const basePassability = readPassabilityGrid(width, height);
  const passability = addTrailsToPassability(basePassability, width, height);

  return waypoints.map((waypoint) => calculateCoarseRoute(waypoint, width, height, passability));
}

function addTrailsToPassability(basePassability, width, height) {
  ensureTrailGrid(width, height);

  const passability = new Float32Array(basePassability.length);
  for (let i = 0; i < passability.length; i++) {
    passability[i] = basePassability[i] < impassableThreshold
      ? 0
      : Math.min(1, basePassability[i] + trailGrid.values[i] * trailPassabilityBonus);
  }

  return passability;
}

function ensureTrailGrid(width, height) {
  if (trailGrid && trailGrid.width === width && trailGrid.height === height) return;

  trailGrid = {
    width,
    height,
    values: new Float32Array(width * height),
  };
}

function depositAgentTrail(agent, deltaTime) {
  if (!trailGrid) return;

  const x = Math.max(0, Math.min(trailGrid.width - 1, Math.round(agent.x * (trailGrid.width - 1))));
  const y = Math.max(0, Math.min(trailGrid.height - 1, Math.round(agent.y * (trailGrid.height - 1))));
  const index = y * trailGrid.width + x;
  trailGrid.values[index] = Math.min(1, trailGrid.values[index] + trailDepositRate * deltaTime);
}

function updateRoutesAfterTrails(deltaTime) {
  routeRecalculateTimer += deltaTime;
  if (routeRecalculateTimer < routeRecalculateInterval) return;

  routeRecalculateTimer = 0;
  recalculateNextWaypointRoute();
}

function recalculateNextWaypointRoute() {
  if (waypoints.length === 0) return;

  const index = routeRecalculateIndex % waypoints.length;
  routesByWaypoint[index] = calculateRouteForWaypoint(waypoints[index]);
  routeRecalculateIndex = (index + 1) % waypoints.length;
}

function calculateRouteForWaypoint(waypoint) {
  const width = Math.max(1, Math.round(canvas.width / routeResolutionScale));
  const height = Math.max(1, Math.round(canvas.height / routeResolutionScale));
  const basePassability = readPassabilityGrid(width, height);
  const passability = addTrailsToPassability(basePassability, width, height);

  return calculateCoarseRoute(waypoint, width, height, passability);
}

function calculateCoarseRoute(targetWaypoint, width, height, passability) {
  const distance = new Float32Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue = new PriorityQueue();

  distance.fill(Infinity);

  const targetX = Math.max(0, Math.min(width - 1, Math.round(targetWaypoint.x * (width - 1))));
  const targetY = Math.max(0, Math.min(height - 1, Math.round(targetWaypoint.y * (height - 1))));
  const targetIndex = targetY * width + targetX;

  distance[targetIndex] = 0;
  queue.push(targetIndex, 0);

  while (queue.length > 0) {
    const current = queue.pop();
    if (visited[current]) continue;

    visited[current] = 1;
    relaxNeighbors(current, width, height, passability, distance, queue);
  }

  return { width, height, passability, distance };
}

function readPassabilityGrid(width, height) {
  const mapCanvas = document.createElement("canvas");
  const mapCtx = mapCanvas.getContext("2d", { alpha: false });

  mapCanvas.width = width;
  mapCanvas.height = height;
  mapCtx.drawImage(costMapImage, 0, 0, width, height);

  const pixels = mapCtx.getImageData(0, 0, width, height).data;
  const passability = new Float32Array(width * height);

  for (let i = 0; i < passability.length; i++) {
    const offset = i * 4;
    passability[i] = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / (255 * 3);
  }

  return passability;
}

function relaxNeighbors(index, width, height, passability, distance, queue) {
  const x = index % width;
  const y = Math.floor(index / width);

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue;

      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const nextIndex = ny * width + nx;
      const stepLength = Math.hypot(ox, oy);
      const stepCost = routeStepCost(passability[index], passability[nextIndex], stepLength);
      if (!Number.isFinite(stepCost)) continue;

      const nextDistance = distance[index] + stepCost;

      if (nextDistance < distance[nextIndex]) {
        distance[nextIndex] = nextDistance;
        queue.push(nextIndex, nextDistance);
      }
    }
  }
}

function routeStepCost(currentPassability, nextPassability, stepLength) {
  const pathPassability = Math.min(currentPassability, nextPassability);
  if (pathPassability === 0) return Infinity;

  return stepLength / (Math.pow(pathPassability, 4));
}

function drawScene() {
  const rect = canvas.getBoundingClientRect();

  ctx.drawImage(costMapImage, 0, 0, rect.width, rect.height);
  drawTrailDebug(rect.width, rect.height);
  if (isRouteDebugVisible) drawCoarseRouteMapDebug(rect.width, rect.height);
  drawWaypoints(rect.width, rect.height);
  drawAgents(rect.width, rect.height);
}

function drawTrailDebug(width, height) {
  if (!trailGrid) return;

  const cellWidth = width / trailGrid.width;
  const cellHeight = height / trailGrid.height;

  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  for (let y = 0; y < trailGrid.height; y++) {
    for (let x = 0; x < trailGrid.width; x++) {
      const value = trailGrid.values[y * trailGrid.width + x];
      if (value <= 0) continue;

      ctx.globalAlpha = Math.min(0.45, value);
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
  }

  ctx.globalAlpha = 1;
}

function drawCoarseRouteMapDebug(width, height) {
  const firstWaypointRoute = routesByWaypoint[0];
  if (!firstWaypointRoute) return;

  const maxDistance = findMaxRouteDistance(firstWaypointRoute.distance);
  const cellWidth = width / firstWaypointRoute.width;
  const cellHeight = height / firstWaypointRoute.height;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "8px system-ui, sans-serif";

  for (let y = 0; y < firstWaypointRoute.height; y++) {
    for (let x = 0; x < firstWaypointRoute.width; x++) {
      const index = y * firstWaypointRoute.width + x;
      const distance = firstWaypointRoute.distance[index];

      if (!Number.isFinite(distance)) continue;

      const closeness = 1 - distance / maxDistance;
      const centerX = (x + 0.5) * cellWidth;
      const centerY = (y + 0.5) * cellHeight;
      const radius = Math.min(cellWidth, cellHeight) * 0.42;

      ctx.fillStyle = `rgba(0, 0, ${255 - distance}, 0.9)`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.0)";
      ctx.fillText(String(Math.round(distance)), centerX, centerY);
    }
  }
}

function findMaxRouteDistance(distance) {
  let maxDistance = 0;

  for (const value of distance) {
    if (Number.isFinite(value) && value > maxDistance) {
      maxDistance = value;
    }
  }

  return maxDistance || 1;
}

function drawWaypoints(width, height) {
  for (const waypoint of waypoints) {
    const x = waypoint.x * width;
    const y = waypoint.y * height;

    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#d93d2b";
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }
}

function drawAgents(width, height) {
  ctx.fillStyle = "#1f6fff";

  for (const agent of agents) {
    ctx.beginPath();
    ctx.arc(agent.x * width, agent.y * height, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}


class PriorityQueue {
  constructor() {
    this.items = [];
  }

  get length() {
    return this.items.length;
  }

  push(index, priority) {
    this.items.push({ index, priority });
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    const first = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0) {
      this.items[0] = last;
      this.sinkDown(0);
    }

    return first.index;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.items[parentIndex].priority <= this.items[index].priority) break;

      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  sinkDown(index) {
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = index * 2 + 2;
      let smallestIndex = index;

      if (leftIndex < this.items.length && this.items[leftIndex].priority < this.items[smallestIndex].priority) {
        smallestIndex = leftIndex;
      }

      if (rightIndex < this.items.length && this.items[rightIndex].priority < this.items[smallestIndex].priority) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === index) break;

      this.swap(index, smallestIndex);
      index = smallestIndex;
    }
  }

  swap(a, b) {
    const item = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = item;
  }
}
