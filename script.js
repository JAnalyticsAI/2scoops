// Canvas movable cube implementation (2D)
const canvas = document.getElementById("game-canvas");
if (!canvas) throw new Error('Canvas element with id "game-canvas" not found');
const ctx = canvas.getContext("2d");
// Make canvas focusable so we can restore keyboard focus to it
canvas.tabIndex = 0;

// Lightweight debug helper available early to inspect Unity bridge state
window.debugUnityStatus = function() {
  try {
    console.log('canSendToUnity:', (typeof _canSendToUnity === 'function') ? _canSendToUnity() : 'unknown');
    console.log('queueLength:', (typeof _unityMessageQueue !== 'undefined') ? _unityMessageQueue.length : 'undefined');
    console.log('localFallbackActive:', !!window.__blackLocalActive);
    console.log('lastUnityBlackCube (stored):', window._lastUnityBlackCube);
    console.log('blackCube coords:', (typeof blackCubeX !== 'undefined') ? blackCubeX : 'NA', (typeof blackCubeY !== 'undefined') ? blackCubeY : 'NA');
  } catch (e) { console.warn('debugUnityStatus error', e); }
};

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
// Message queue + sender that retries until Unity's SendMessage becomes available.
const _unityMessageQueue = [];
let _unityFlushTimer = null;

function _canSendToUnity() {
  try {
    if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') return true;
    if (typeof SendMessage === 'function') return true;
    if (window.Module && typeof window.Module.SendMessage === 'function') return true;
  } catch (e) {}
  return false;
}

function _flushUnityQueue() {
  if (_unityMessageQueue.length === 0) {
    if (_unityFlushTimer) { clearInterval(_unityFlushTimer); _unityFlushTimer = null; }
    return;
  }
  if (!_canSendToUnity()) return;

  // Try to send all queued messages; if a send fails we keep it for later.
  for (let i = 0; i < _unityMessageQueue.length; ) {
    const msg = _unityMessageQueue[i];
    try {
      if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
        window.unityInstance.SendMessage(msg.objectName, msg.methodName, msg.payload);
        _unityMessageQueue.splice(i, 1);
        continue;
      }
      if (typeof SendMessage === 'function') {
        SendMessage(msg.objectName, msg.methodName, msg.payload);
        _unityMessageQueue.splice(i, 1);
        continue;
      }
      if (window.Module && typeof window.Module.SendMessage === 'function') {
        window.Module.SendMessage(msg.objectName, msg.methodName, msg.payload);
        _unityMessageQueue.splice(i, 1);
        continue;
      }
    } catch (e) {
      // if any error occurs, keep the message and try later
      console.warn('Error sending to Unity, will retry', e, msg);
      i++;
    }
  }

  if (_unityMessageQueue.length === 0 && _unityFlushTimer) { clearInterval(_unityFlushTimer); _unityFlushTimer = null; }
}

function sendToUnity(objectName, methodName, payload) {
  const msg = { objectName, methodName, payload };
  // If we can send immediately, do so.
  if (_canSendToUnity()) {
    try {
      if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
        window.unityInstance.SendMessage(objectName, methodName, payload);
        return true;
      }
      if (typeof SendMessage === 'function') { SendMessage(objectName, methodName, payload); return true; }
      if (window.Module && typeof window.Module.SendMessage === 'function') { window.Module.SendMessage(objectName, methodName, payload); return true; }
    } catch (e) {
      console.warn('Immediate SendMessage failed, queuing', e, msg);
    }
  }

  // Queue the message and start a background flusher if necessary
  _unityMessageQueue.push(msg);
  if (!_unityFlushTimer) {
    _unityFlushTimer = setInterval(_flushUnityQueue, 250);
  }
  // also try a short timeout flush (for fast initializations)
  setTimeout(_flushUnityQueue, 100);
  console.log('Unity SendMessage not available yet; queued', objectName, methodName, payload);
  // If Unity isn't available, ensure the JS local fallback runs so the black cube moves on the page
  // but respect suppression (used during resets) and paused/stopped flags
  try {
    if (typeof startBlackLocal === 'function' && !window.__suppressLocalStart && !__blackStopped && !__blackFrozen) startBlackLocal();
  } catch (e) {}
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

// Receive position updates from Unity WebGL build.
// Unity will call into the page with a normalized position string: "nx,ny" (top-origin ny).
window.ReceiveUnityBlackCube = function(payload) {
  try {
    if (!payload || typeof payload !== 'string') return;
    const parts = payload.split(',');
    if (parts.length < 2) return;
    const nx = parseFloat(parts[0]);
    const nyTop = parseFloat(parts[1]);
    if (!Number.isFinite(nx) || !Number.isFinite(nyTop)) return;
    if (!canvas || !canvas.width || !canvas.height) return;
    // convert normalized top-origin to canvas coordinates
    blackCubeX = nx * canvas.width;
    blackCubeY = nyTop * canvas.height;
    clampBlackCube();
  } catch (e) {
    console.warn('ReceiveUnityBlackCube parse error', e, payload);
  }
};

// --- Local JS fallback animation for black cube (used when Unity doesn't initialize) ---
let __blackLocalActive = false;
let __blackVx = 120; // px/s default
let __blackVy = 80;  // px/s default
let __blackLastTime = null;
// Stopped flag used to prevent further updates/sends when level completes
let __blackStopped = false;
// Previous rendered black cube position (used to freeze instantly on pause)
let __prevBlackX = null;
let __prevBlackY = null;
// Frozen flag used to lock the black cube in place while paused
let __blackFrozen = false;
// Debug flag: set `window.__blackDebug = true` in console to enable verbose fallback logs
window.__blackDebug = window.__blackDebug || false;

function startBlackLocal() {
  if (__blackLocalActive) return;
  __blackLocalActive = true;
  // randomize initial direction
  // preserve existing velocity when resuming; only randomize if velocity is zero
  const currentSpeed = Math.hypot(__blackVx, __blackVy);
  if (!Number.isFinite(currentSpeed) || currentSpeed === 0) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 120; // sensible default
    __blackVx = Math.cos(angle) * speed;
    __blackVy = Math.sin(angle) * speed;
  }
  __blackLastTime = performance.now();
  console.log('Black cube local simulation started');
}

function stopBlackLocal() {
  if (!__blackLocalActive) return;
  __blackLocalActive = false;
  __blackLastTime = null;
  // push final state to Unity when possible
  try { notifyUnityBlackCube(); } catch (e) {}
  console.log('Black cube local simulation stopped (Unity available)');
}

function updateBlackLocal(dt) {
  if (!__blackLocalActive) return;
  if (__blackFrozen) return;
  // move
  blackCubeX += __blackVx * dt;
  blackCubeY += __blackVy * dt;
  // bounce within canvas bounds
  const minX = movementMinX;
  const minY = movementMinY;
  const maxX = Math.max(minX, canvas.width - blackCubeSize);
  const maxY = Math.max(minY, canvas.height - blackCubeSize);
  if (blackCubeX <= minX) { blackCubeX = minX; __blackVx = Math.abs(__blackVx); }
  else if (blackCubeX >= maxX) { blackCubeX = maxX; __blackVx = -Math.abs(__blackVx); }
  if (blackCubeY <= minY) { blackCubeY = minY; __blackVy = Math.abs(__blackVy); }
  else if (blackCubeY >= maxY) { blackCubeY = maxY; __blackVy = -Math.abs(__blackVy); }
  clampBlackCube();
  // try to notify Unity if available
  if (_canSendToUnity()) {
    stopBlackLocal();
  } else {
    // verbose logging only when explicitly enabled
    if (window.__blackDebug) console.log('BlackLocal updating; Unity unavailable');
  }
}

// start fallback if Unity isn't available after a short delay
setTimeout(() => {
  try {
    if (!_canSendToUnity()) startBlackLocal();
  } catch (e) { startBlackLocal(); }
}, 2000);

// Debug helper: call `window.debugUnityStatus()` in the console to inspect availability and queue
window.debugUnityStatus = function() {
  try {
    console.log('canSendToUnity:', _canSendToUnity());
    console.log('queueLength:', _unityMessageQueue.length, 'localFallbackActive:', !!__blackLocalActive);
    console.log('unityInstance.SendMessage:', window.unityInstance && typeof window.unityInstance.SendMessage === 'function');
    console.log('global SendMessage:', typeof SendMessage === 'function');
    console.log('Module.SendMessage:', window.Module && typeof window.Module.SendMessage === 'function');
    console.log('lastUnityBlackCube (stored):', window._lastUnityBlackCube);
  } catch (e) { console.warn('debugUnityStatus error', e); }
};

// Continuous sync state: only send when position changes enough to avoid spamming
let __lastSentNx = null;
let __lastSentNy = null;
const __sendThreshold = 0.0005; // normalized units (~0.05% of canvas)

function sendBlackCubeIfMoved() {
  if (typeof __blackStopped !== 'undefined' && __blackStopped) return;
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

// Stop/resume helpers to be called from page logic when levels complete or restart.
window.stopBlackCube = function() {
  __blackStopped = true;
  try { stopBlackLocal(); } catch (e) {}
  // tell Unity to stop movement and pause
  sendToUnity('InitialBlackCube', 'StopMovement', 'true');
  sendToUnity('InitialBlackCube', 'PauseMovement', 'true');
  // optionally deactivate the object in Unity
  sendToUnity('InitialBlackCube', 'SetActive', 'false');
  console.log('stopBlackCube: local fallback stopped and messages queued to Unity');
};

window.resumeBlackCube = function() {
  __blackStopped = false;
  try { startBlackLocal(); } catch (e) {}
  // tell Unity to resume movement and activate object
  sendToUnity('InitialBlackCube', 'ResumeMovement', 'true');
  sendToUnity('InitialBlackCube', 'SetActive', 'true');
  notifyUnityBlackCube();
  console.log('resumeBlackCube: resumed local and queued resume to Unity');
};

// Pause/unpause helpers: freeze in-place without clearing stopped state
window.pauseBlackCube = function() {
  // stop local simulation but don't mark stopped (so resume continues)
  try { stopBlackLocal(); } catch (e) {}
  // snap to previous rendered position so pause appears instantaneous
  try {
    // freeze at the current position (prefer the most-recent rendered position)
    const fx = (__prevBlackX !== null) ? __prevBlackX : blackCubeX;
    const fy = (__prevBlackY !== null) ? __prevBlackY : blackCubeY;
    __blackFrozen = true;
    blackCubeX = fx;
    blackCubeY = fy;
    clampBlackCube();
    // immediately notify Unity/page of the frozen position
    try { sendBlackCubeIfMoved(); } catch (e) {}
    try { notifyUnityBlackCube(); } catch (e) {}
  } catch (e) {}
  // tell Unity to pause movement
  sendToUnity('InitialBlackCube', 'PauseMovement', 'true');
  console.log('pauseBlackCube: paused local and queued PauseMovement to Unity');
};

window.resumeBlackCube = (function(orig){
  return function() {
    // if previously stopped via stopBlackCube, leave stopped state handling to that function
    __blackStopped = false;
    __blackFrozen = false;
    // suppress auto-start briefly to avoid local/Unity race that can nudge the cube
    window.__suppressLocalStart = true;
    // tell Unity to resume movement and activate object
    sendToUnity('InitialBlackCube', 'ResumeMovement', 'true');
    sendToUnity('InitialBlackCube', 'SetActive', 'true');
    // inform Unity of current position
    notifyUnityBlackCube();
    console.log('resumeBlackCube: queued resume to Unity; local fallback suppressed briefly');
    // after a short delay, if Unity is still unavailable, start the local fallback
    setTimeout(() => {
      window.__suppressLocalStart = false;
      try {
        if (!_canSendToUnity() && !__blackStopped && !__blackFrozen) {
          startBlackLocal();
        }
      } catch (e) {}
    }, 150);
  };
})(window.resumeBlackCube);

// Reset black cube to initial top-left position (under the navbar) and notify Unity.
window.resetBlackCubePosition = function() {
  try {
    // ensure the canvas bounds are up-to-date
    try { resizeCanvas(); } catch (e) {}
    // stop local simulation so position stays until resume
    try { stopBlackLocal(); } catch (e) {}
    // suppress auto-start of local fallback while we notify/reset
    window.__suppressLocalStart = true;
    blackCubeX = movementMinX;
    blackCubeY = movementMinY;
    clampBlackCube();
    // immediately notify page/Unity of the new normalized position
    try { sendBlackCubeIfMoved(); } catch (e) {}
    try { notifyUnityBlackCube(); } catch (e) {}
    console.log('resetBlackCubePosition: set to', { x: blackCubeX, y: blackCubeY });
    // clear suppression shortly after so normal fallback behavior resumes
    setTimeout(() => { window.__suppressLocalStart = false; }, 250);
  } catch (e) {
    console.warn('resetBlackCubePosition error', e);
  }
};

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
    try { if (typeof resetBlackCubePosition === 'function') resetBlackCubePosition(); } catch (e) {}
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
    try { if (typeof resetBlackCubePosition === 'function') resetBlackCubePosition(); } catch (e) {}
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
  // pause the black cube (freeze in place)
  try { if (typeof pauseBlackCube === 'function') pauseBlackCube(); } catch (e) {}
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
  // resume the black cube (unfreeze)
  try { if (typeof resumeBlackCube === 'function') resumeBlackCube(); } catch (e) {}
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

// Main loop (uses requestAnimationFrame timestamp to compute delta)
let __lastRAF = null;
function loop(ts) {
  if (!__lastRAF) __lastRAF = ts;
  const dt = Math.max(0, (ts - __lastRAF) / 1000);
  __lastRAF = ts;

  clearCanvas();
  // record previous black cube position before any updates this frame
  __prevBlackX = blackCubeX;
  __prevBlackY = blackCubeY;
  updateCubePosition();
  // update black cube local simulation if active
  try { updateBlackLocal(dt); } catch (e) {}
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
