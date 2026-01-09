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
  // Keep the canvas full size of the app container; we'll restrict movement below the navbar
  canvas.width = contentWidth;
  canvas.height = Math.max(0, contentHeight);
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';

  // ensure canvas positioned at top-left of the app container
  canvas.style.position = 'absolute';
  canvas.style.left = '0px';
  canvas.style.top = '0px';

  // compute movement bounds in canvas-local coordinates
  const canvasRect = canvas.getBoundingClientRect();
  const navRect = nav ? nav.getBoundingClientRect() : null;
  movementMinX = 0;
  // Ensure the cube cannot move under the navbar: start Y at navbar height
  movementMinY = nav ? nav.offsetHeight : 0;
  movementMaxX = Math.max(0, canvas.width - cubeSize);
  movementMaxY = Math.max(0, canvas.height - cubeSize);

  // ensure cube remains inside new bounds
  clampCube();
}

// Cube properties
let cubeSize = 30;
let cubeX = 30;
let cubeY = 30;
let cubeSpeed = 5;

// Movement bounds (in canvas-local coordinates)
let movementMinX = 0;
let movementMinY = 0;
let movementMaxX = 0;
let movementMaxY = 0;

// Recompute bounds now cube size is known
resizeCanvas();
// Update on window resize (after cubeSize is defined)
window.addEventListener("resize", resizeCanvas);

// Input state
const keys = { left: false, right: false, up: false, down: false };

// Mouse / touch drag state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
// Pause state
let isPaused = false;

// Ensure pause overlay exists in DOM
function ensurePauseOverlay() {
  if (document.getElementById('pause-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'pause-overlay';
  // inline styles to avoid stylesheet ordering issues
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);z-index:2147483647;';

  const win = document.createElement('div');
  win.className = 'pause-window';
  const title = document.createElement('h2');
  title.textContent = 'Paused';
  const actions = document.createElement('div');
  actions.className = 'pause-actions';

  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'primary';
  resumeBtn.textContent = 'Resume';
  resumeBtn.addEventListener('click', resumeGame);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    // hide overlay but keep game paused unless resume pressed
    overlay.style.display = 'none';
  });

  actions.appendChild(resumeBtn);
  actions.appendChild(closeBtn);
  win.appendChild(title);
  win.appendChild(actions);
  overlay.appendChild(win);
  document.body.appendChild(overlay);
}

function showPauseOverlay() {
  ensurePauseOverlay();
  const overlay = document.getElementById('pause-overlay');
  overlay.style.display = 'flex';
  const resumeBtn = overlay.querySelector('button.primary');
  if (resumeBtn) resumeBtn.focus();
}

function hidePauseOverlay() {
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.style.display = 'none';
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCube() {
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(Math.round(cubeX), Math.round(cubeY), cubeSize, cubeSize);
}

function clampCube() {
  if (!Number.isFinite(cubeX)) cubeX = movementMinX;
  if (!Number.isFinite(cubeY)) cubeY = movementMinY;
  cubeX = Math.max(movementMinX, Math.min(movementMaxX, cubeX));
  cubeY = Math.max(movementMinY, Math.min(movementMaxY, cubeY));
}

function updateCubePosition() {
  if (isPaused) return;
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
  // Allow toggling pause with Escape regardless of `isPaused`
  if (e.key === 'Escape') {
    if (isPaused) resumeGame(); else pauseGame();
    return;
  }
  if (isPaused) return;

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
  if (isPaused) return;
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

// Pause / resume functions
function pauseGame() {
  isPaused = true;
  // clear movement inputs while paused
  keys.left = keys.right = keys.up = keys.down = false;
  showPauseOverlay();
}

function resumeGame() {
  isPaused = false;
  hidePauseOverlay();
}

// Export functions for inline onclick and attach pause button handler
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
const pauseBtn = document.querySelector('.pausebtn');
if (pauseBtn) pauseBtn.addEventListener('click', (e) => { e.preventDefault(); pauseGame(); });

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
