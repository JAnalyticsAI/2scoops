// Canvas movable cube implementation (2D)
const canvas = document.getElementById("game-canvas");
if (!canvas) throw new Error('Canvas element with id "game-canvas" not found');
const ctx = canvas.getContext("2d");
// Make canvas focusable so we can restore keyboard focus to it
canvas.tabIndex = 0;

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
  // ensure black cube remains inside new bounds
  try { clampBlackCube(); } catch (e) {}
  // update Unity with new normalized black cube position (if present)
  try { notifyUnityBlackCube(); } catch (e) {}
}

// Cube properties
let cubeSize = 30;
let cubeX = 30;
let cubeY = 30;
let cubeSpeed = 5;

// Black cube properties (75% smaller -> 25% size)
let blackCubeSize = Math.max(6, Math.round(cubeSize * 0.25));
let blackCubeX = 0;
let blackCubeY = 0;

// Movement bounds (in canvas-local coordinates)
let movementMinX = 0;
let movementMinY = 0;
let movementMaxX = 0;
let movementMaxY = 0;

// Update on window resize (after cubeSize is defined)
window.addEventListener("resize", () => { resizeCanvas(); centerCube(); });

// Center the cube within the allowed movement area (called on load)
function centerCube() {
  // ensure bounds are current
  clampCube();
  const cx = Math.round((movementMinX + movementMaxX) / 2);
  const cy = Math.round((movementMinY + movementMaxY) / 2);
  cubeX = Math.max(movementMinX, Math.min(movementMaxX, cx));
  cubeY = Math.max(movementMinY, Math.min(movementMaxY, cy));
}

// Center once on initial load (ensure canvas and bounds are computed first)
resizeCanvas();
centerCube();

// Place the black cube at the top-left of the allowed movement area on load
blackCubeSize = Math.max(1, Math.round(cubeSize * 0.25));
blackCubeX = movementMinX;
blackCubeY = movementMinY;
clampBlackCube();
// Debug: log initial black cube values
console.log('BLACK CUBE INIT', { blackCubeX, blackCubeY, blackCubeSize, movementMinX, movementMinY, canvasWidth: canvas.width, canvasHeight: canvas.height });

// Helper to send messages to a Unity WebGL instance (robust to several loader names)
function sendToUnity(objectName, methodName, payload) {
  try {
    if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
      window.unityInstance.SendMessage(objectName, methodName, payload);
      return true;
    }
    if (typeof SendMessage === 'function') {
      SendMessage(objectName, methodName, payload);
      return true;
    }
    if (window.Module && typeof window.Module.SendMessage === 'function') {
      window.Module.SendMessage(objectName, methodName, payload);
      return true;
    }
  } catch (e) {}
  // not found — leave a debug trace
  console.log('Unity SendMessage not available', objectName, methodName, payload);
  return false;
}

// Inform Unity about the black cube initial location (normalized coords)
function notifyUnityBlackCube() {
  if (!canvas || !canvas.width || !canvas.height) return;
  const nx = (blackCubeX) / canvas.width;
  const ny = (blackCubeY) / canvas.height; // top-origin
  sendToUnity('InitialBlackCube', 'SetPositionFromNormalized', `${nx},${ny}`);
  sendToUnity('InitialBlackCube', 'SetActive', 'true');
}

// try one-time notify after initialization
setTimeout(notifyUnityBlackCube, 200);

// Continuous sync state: only send when position changes enough to avoid spamming
let __lastSentNx = null;
let __lastSentNy = null;
const __sendThreshold = 0.0005; // normalized units (~0.05% of canvas)

function sendBlackCubeIfMoved() {
  if (!canvas || !canvas.width || !canvas.height) return;
  const nx = (blackCubeX) / canvas.width;
  const ny = (blackCubeY) / canvas.height; // top-origin
  if (
    __lastSentNx === null || __lastSentNy === null ||
    Math.abs(nx - __lastSentNx) > __sendThreshold ||
    Math.abs(ny - __lastSentNy) > __sendThreshold
  ) {
    sendToUnity('InitialBlackCube', 'SetPositionFromNormalized', `${nx},${ny}`);
    __lastSentNx = nx;
    __lastSentNy = ny;
  }
}

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
    // Close should also resume the game
    resumeGame();
  });

  // Retry: reset current level state (timer + cube position) and resume
  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Retry (Current Level)';
  retryBtn.addEventListener('click', () => {
    try { if (window.timerManager && typeof window.timerManager.reset === 'function') window.timerManager.reset(); } catch (e) {}
    try { if (typeof window.centerCube === 'function') window.centerCube(); } catch (e) {}
    try { if (typeof resumeGame === 'function') resumeGame(); } catch (e) {}
  });

  // Restart: reset to level 1, clear score, reset timer, center cube, and resume
  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Restart';
  restartBtn.addEventListener('click', () => {
    try { if (window.levelManager && typeof window.levelManager.reset === 'function') window.levelManager.reset(); } catch (e) {}
    try { if (window.scoreManager && typeof window.scoreManager.reset === 'function') window.scoreManager.reset(); } catch (e) {}
    try { if (window.timerManager && typeof window.timerManager.reset === 'function') window.timerManager.reset(); } catch (e) {}
    try { if (typeof window.centerCube === 'function') window.centerCube(); } catch (e) {}
    try { if (typeof resumeGame === 'function') resumeGame(); } catch (e) {}
  });

  actions.appendChild(resumeBtn);
  actions.appendChild(retryBtn);
  actions.appendChild(restartBtn);
  actions.appendChild(closeBtn);
  win.appendChild(title);
  win.appendChild(actions);
  overlay.appendChild(win);
  document.body.appendChild(overlay);
  // focus resume button after it's in DOM (helps some browsers)
  setTimeout(() => {
    const resumeBtn = overlay.querySelector('button.primary');
    if (resumeBtn) resumeBtn.focus();
  }, 0);
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
  if (overlay) overlay.remove();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCube() {
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(Math.round(cubeX), Math.round(cubeY), cubeSize, cubeSize);
}

function drawBlackCube() {
  ctx.fillStyle = "#000000";
  const x = Math.round(blackCubeX);
  const y = Math.round(blackCubeY);
  ctx.fillRect(x, y, blackCubeSize, blackCubeSize);
  // add a contrasting stroke so the square is visible against any background
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, blackCubeSize - 1, blackCubeSize - 1);
}

function clampCube() {
  if (!Number.isFinite(cubeX)) cubeX = movementMinX;
  if (!Number.isFinite(cubeY)) cubeY = movementMinY;
  cubeX = Math.max(movementMinX, Math.min(movementMaxX, cubeX));
  cubeY = Math.max(movementMinY, Math.min(movementMaxY, cubeY));
}

function clampBlackCube() {
  if (!Number.isFinite(blackCubeX)) blackCubeX = movementMinX;
  if (!Number.isFinite(blackCubeY)) blackCubeY = movementMinY;
  const minX = movementMinX;
  const minY = movementMinY;
  const maxX = Math.max(minX, canvas.width - blackCubeSize);
  const maxY = Math.max(minY, canvas.height - blackCubeSize);
  blackCubeX = Math.max(minX, Math.min(maxX, blackCubeX));
  blackCubeY = Math.max(minY, Math.min(maxY, blackCubeY));
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
  // pause the global timer if present
  try { if (window.timerManager && typeof window.timerManager.pause === 'function') window.timerManager.pause(); } catch (e) {}
}

function resumeGame() {
  isPaused = false;
  hidePauseOverlay();
  // Focus the canvas explicitly so Edge receives keyboard events
  try {
    if (typeof canvas.focus === 'function') canvas.focus();
  } catch (e) {}
  restoreKeyboardFocus();
  // resume the global timer if present
  try { if (window.timerManager && typeof window.timerManager.start === 'function') window.timerManager.start(); } catch (e) {}
}

// Ensure keyboard focus returns to the page after resuming
function restoreKeyboardFocus() {
  try {
    // Force-blur any focused element (covers removed overlay button cases)
    if (document.activeElement && document.activeElement !== document.body) {
      try { document.activeElement.blur(); } catch (e) {}
    }
    // Make body focusable (if needed)
    if (document.body && typeof document.body.focus === 'function') {
      if (document.body.tabIndex === -1) document.body.tabIndex = 0;
    }
    // Focus the canvas after the click event finishes so Edge registers keyboard input
    setTimeout(() => {
      try { canvas.focus(); } catch (e) {}
      try { if (typeof window.focus === 'function') window.focus(); } catch (e) {}
    }, 0);
  } catch (e) {
    // ignore
  }
}


// Ensure keyboard focus returns to the page after resuming
function restoreKeyboardFocus() {
  try {
    // If any overlay child is focused, blur it
    if (document.activeElement && document.activeElement !== document.body) {
      // If focused element was inside the pause overlay, blur it
      const overlay = document.getElementById('pause-overlay');
      if (overlay && overlay.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }
    // Try to focus the body so `keydown` on window receives events
    if (document.body && typeof document.body.focus === 'function') {
      // Make body focusable if needed
      if (document.body.tabIndex === -1) document.body.tabIndex = 0;
      document.body.focus();
    }
    // Also try to focus the window
    if (typeof window.focus === 'function') window.focus();
  } catch (e) {
    // ignore
  }
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
  // update and draw the main red cube first, then the black cube on top
  drawCube();
  drawBlackCube();
  // Debug marker + continuous log (throttled via frame counter)
  if (!window.__blackDebugCounter) window.__blackDebugCounter = 0;
  window.__blackDebugCounter++;
  if (window.__blackDebugCounter % 60 === 0) {
    console.log('BLACK CUBE POS', { x: blackCubeX, y: blackCubeY, size: blackCubeSize });
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
