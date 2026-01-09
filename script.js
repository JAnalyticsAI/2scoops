// Canvas movable cube implementation (2D)
const canvas = document.getElementById("game-canvas");
if (!canvas) throw new Error('Canvas element with id "game-canvas" not found');
const ctx = canvas.getContext("2d");

// Canvas sizing: set canvas to the interior of `#app-border`, excluding the navbar height
function resizeCanvas() {
  const app = document.getElementById('app-border');
  const nav = document.querySelector('.navbar');
  if (!app) {
    // fallback to full window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return;
  }

  // clientWidth/Height give the inner size excluding borders
  const contentWidth = app.clientWidth;
  const contentHeight = app.clientHeight;
  const navHeight = nav ? nav.offsetHeight : 0;

  // Set canvas drawing buffer and CSS size to match the available area above the navbar
  canvas.width = contentWidth;
  canvas.height = Math.max(0, contentHeight - navHeight);
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';

  // ensure cube remains inside new bounds
  clampCube();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Cube properties
let cubeSize = 30;
let cubeX = 30;
let cubeY = 30;
let cubeSpeed = 5;

// Input state
const keys = { left: false, right: false, up: false, down: false };

// Mouse / touch drag state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCube() {
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(Math.round(cubeX), Math.round(cubeY), cubeSize, cubeSize);
}

function clampCube() {
  cubeX = Math.max(0, Math.min(canvas.width - cubeSize, cubeX));
  cubeY = Math.max(0, Math.min(canvas.height - cubeSize, cubeY));
}

function updateCubePosition() {
  if (!isDragging) {
    if (keys.left) cubeX -= cubeSpeed;
    if (keys.right) cubeX += cubeSpeed;
    if (keys.up) cubeY -= cubeSpeed;
    if (keys.down) cubeY += cubeSpeed;
    clampCube();
  }
}

// Keyboard handlers
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      keys.left = true;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      keys.right = true;
      break;
    case "ArrowUp":
    case "w":
    case "W":
      keys.up = true;
      break;
    case "ArrowDown":
    case "s":
    case "S":
      keys.down = true;
      break;
  }
});
window.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      keys.left = false;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      keys.right = false;
      break;
    case "ArrowUp":
    case "w":
    case "W":
      keys.up = false;
      break;
    case "ArrowDown":
    case "s":
    case "S":
      keys.down = false;
      break;
  }
});

// Mouse events for dragging the cube
function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

canvas.addEventListener("mousedown", (e) => {
  const pos = getMousePos(e);
  if (pos.x >= cubeX && pos.x <= cubeX + cubeSize && pos.y >= cubeY && pos.y <= cubeY + cubeSize) {
    isDragging = true;
    dragOffsetX = pos.x - cubeX;
    dragOffsetY = pos.y - cubeY;
    canvas.style.cursor = 'grabbing';
  }
});
window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const pos = getMousePos(e);
  cubeX = pos.x - dragOffsetX;
  cubeY = pos.y - dragOffsetY;
  clampCube();
});
window.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    canvas.style.cursor = 'default';
  }
});

// Touch support (drag)
canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = t.clientX - rect.left;
  const y = t.clientY - rect.top;
  if (x >= cubeX && x <= cubeX + cubeSize && y >= cubeY && y <= cubeY + cubeSize) {
    isDragging = true;
    dragOffsetX = x - cubeX;
    dragOffsetY = y - cubeY;
  }
}, { passive: true });
canvas.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  cubeX = t.clientX - rect.left - dragOffsetX;
  cubeY = t.clientY - rect.top - dragOffsetY;
  clampCube();
  e.preventDefault();
}, { passive: false });
canvas.addEventListener("touchend", () => { isDragging = false; });

// Main loop
function loop() {
  clearCanvas();
  updateCubePosition();
  drawCube();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
