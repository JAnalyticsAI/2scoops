// Get the borders of the app and game container
const appborder = document.getElementById("appborder");
const gameborder = document.getElementById("game-container");
// Get the canvas and context
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Canvas Size
canvas.width = canvas.innerWidth
canvas.height = canvas.innerHeight

// Set up cube properties
let cubeSize = 25;
let cubeX = 15;
let cubeY = 15;
let cubeSpeed = 5;

// Function to clear the canvas
function clearCanvas() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

};

//Draw the cube
function drawCube() {

  ctx.fillStyle = "blue";
  ctx.fillRect(cubeX, cubeY, cubeSize, cubeSize);
  
};

// Function to resize canvas
function resizeCanvas() {
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

// Event Listener for movable events

document.addEventListener("keydown", function(event) {

  switch(event.key) {
    case "ArrowLeft":
      cubeX -= cubeSpeed;
      break;
    case "ArrowRight":
      cubeX += cubeSpeed;
      break;
    case "ArrowUp":
      cubeY -= cubeSpeed;
      break;
    case "ArrowDown":
      cubeY += cubeSpeed;
      break;
  };

}); 

// Update cube position based on key input abd boundaries check
function updateCubePosition() {

  if (keys.left) cubeX -= cubeSpeed;
  if (keys.right) cubeX += cubeSpeed;
  if (keys.up) cubeY -= cubeSpeed;
  if (keys.down) cubeY += cubeSpeed;

  // Restrict cube movement within canvas boundaries
  cubeX = Math.max(0, Math.min(canvas.width - cubeSize, cubeX));
  cubeY = Math.max(0, Math.min(canvas.height - cubeSize, cubeY));

}

// Main game loop
function gameLoop() {

  clearCanvas();
  updateCubePosition();
  drawCube();
  requestAnimationFrame(gameLoop);

};

gameLoop();







/* Touch Controls - Uncomment to enable touch controls

let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;

function handleTouchStart(event) {

  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
  touchMoved = false;

};

function handleTouchMove(event) {

  event.preventDefault();
  let touchX = event.touches[0].clientX;
  let touchY = event.touches[0].clientY;
  let deltaX = touchX - touchStartX;
  let deltaY = touchY - touchStartY;
  cubeX += deltaX;
  cubeY += deltaY;
  touchStartX = touchX;
  touchStartY = touchY;
  touchMoved = true;

};

function handleTouchEnd() {

  if (!touchMoved) {
    //Handle tap event here is needed
  };

};

canvas.addEventListener("touchstart", handleTouchStart);
canvas.addEventListener("touchmove", handleTouchMove);
canvas.addEventListener("touchend", handleTouchEnd);

*/