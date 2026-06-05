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
let previousTime = 0;

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

function drawScene() {
  const rect = canvas.getBoundingClientRect();

  ctx.drawImage(costMapImage, 0, 0, rect.width, rect.height);
  drawWaypoints(rect.width, rect.height);
  drawAgents(rect.width, rect.height);
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
