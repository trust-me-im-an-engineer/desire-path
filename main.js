const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const waypoints = [
  { x: 0.16, y: 0.18 },
  { x: 0.78, y: 0.20 },
  { x: 0.18, y: 0.80 },
  { x: 0.80, y: 0.78 },
  { x: 0.50, y: 0.56 },
];

const agents = [];
const agentCount = 80;
const routeGridWidth = 80;
const impassableThreshold = 0.08;

let previousTime = 0;
let firstWaypointRoute = null;

const costMapImage = new Image();
costMapImage.src = "./assets/initial-cost-map.png";
costMapImage.addEventListener("load", start);

function initializeCanvas() {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
  canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function start() {
  initializeCanvas();
  firstWaypointRoute = calculateCoarseRoute(waypoints[0]);

  for (let i = 0; i < agentCount; i++) {
    agents.push(createAgent());
  }

  requestAnimationFrame(tick);
}

function tick(time) {
  const deltaTime = Math.min(0.05, (time - previousTime) / 1000 || 0);
  previousTime = time;

  updateAgents(deltaTime);
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
  return {
    x: origin.x,
    y: origin.y,
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
    const dx = target.x - agent.x;
    const dy = target.y - agent.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.01) {
      agents[i] = createAgent();
      continue;
    }

    const step = Math.min(distance, agent.speed * deltaTime);
    agent.x += (dx / distance) * step;
    agent.y += (dy / distance) * step;
  }
}

function calculateCoarseRoute(targetWaypoint) {
  const rect = canvas.getBoundingClientRect();
  const width = routeGridWidth;
  const height = Math.max(1, Math.round(width * rect.height / rect.width));
  const passability = readPassabilityGrid(width, height);
  const distance = new Float32Array(width * height);
  const visited = new Uint8Array(width * height);

  distance.fill(Infinity);

  const targetX = Math.max(0, Math.min(width - 1, Math.round(targetWaypoint.x * (width - 1))));
  const targetY = Math.max(0, Math.min(height - 1, Math.round(targetWaypoint.y * (height - 1))));
  distance[targetY * width + targetX] = 0;

  for (let i = 0; i < width * height; i++) {
    const current = findNearestUnvisited(distance, visited, passability);
    if (current === -1) break;

    visited[current] = 1;
    relaxNeighbors(current, width, height, passability, distance);
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

function findNearestUnvisited(distance, visited, passability) {
  let bestIndex = -1;
  let bestDistance = Infinity;

  for (let i = 0; i < distance.length; i++) {
    if (visited[i] || passability[i] <= impassableThreshold) continue;
    if (distance[i] < bestDistance) {
      bestDistance = distance[i];
      bestIndex = i;
    }
  }

  return bestIndex;
}

function relaxNeighbors(index, width, height, passability, distance) {
  const x = index % width;
  const y = Math.floor(index / width);

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue;

      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const nextIndex = ny * width + nx;
      const nextPassability = passability[nextIndex];
      if (nextPassability <= impassableThreshold) continue;

      const stepLength = Math.hypot(ox, oy);
      const stepCost = stepLength / Math.max(nextPassability, 0.001);
      const nextDistance = distance[index] + stepCost;

      if (nextDistance < distance[nextIndex]) {
        distance[nextIndex] = nextDistance;
      }
    }
  }
}

function drawScene() {
  const rect = canvas.getBoundingClientRect();

  ctx.drawImage(costMapImage, 0, 0, rect.width, rect.height);
  drawCoarseRouteDebug(rect.width, rect.height);
  drawWaypoints(rect.width, rect.height);
  drawAgents(rect.width, rect.height);
}

function drawCoarseRouteDebug(width, height) {
  if (!firstWaypointRoute) return;

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00d084";

  for (let i = 1; i < waypoints.length; i++) {
    const path = traceCoarseRoute(waypoints[i], firstWaypointRoute);
    if (path.length < 2) continue;

    ctx.beginPath();
    ctx.moveTo(path[0].x * width, path[0].y * height);

    for (let j = 1; j < path.length; j++) {
      ctx.lineTo(path[j].x * width, path[j].y * height);
    }

    ctx.stroke();
  }
}

function traceCoarseRoute(origin, route) {
  const path = [];
  let x = Math.max(0, Math.min(route.width - 1, Math.round(origin.x * (route.width - 1))));
  let y = Math.max(0, Math.min(route.height - 1, Math.round(origin.y * (route.height - 1))));

  for (let step = 0; step < route.width + route.height; step++) {
    path.push({
      x: x / (route.width - 1),
      y: y / (route.height - 1),
    });

    const next = findBestRouteNeighbor(x, y, route);
    if (!next) break;

    x = next.x;
    y = next.y;
  }

  return path;
}

function findBestRouteNeighbor(x, y, route) {
  const currentIndex = y * route.width + x;
  let best = null;
  let bestDistance = route.distance[currentIndex];

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue;

      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || nx >= route.width || ny < 0 || ny >= route.height) continue;

      const index = ny * route.width + nx;
      if (route.distance[index] < bestDistance) {
        bestDistance = route.distance[index];
        best = { x: nx, y: ny };
      }
    }
  }

  return best;
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
