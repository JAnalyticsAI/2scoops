// Get the border of the game
const gameBorder = document.getElementById("app-border");
const ctx = gameBorder.getContext("2d");

// Set up cube properties
let cubeSize = 25;
let cubeX = gameBorder.width / 2 - cubeSize / 2;
let cubeY = gameBorder.height / 2 - cubeSize / 2;
let cubeSpeed = 5;

//Draw the cube
function drawCube() {

  ctx.fillRect(cubeX, cubeY, cubeSize, cubeSize);
  
}

// Function to clear the game board
function clearGB() {

  ctx.clearRect(0, 0, gameBorder.width, gameBorder.height);

}

// Event Listener for touch events

gameBorder.addEventListener("touchstart", handleTouchStart);
gameBorder.addEventListener("touchmove", handleTouchMove);
gameBorder.addEventListener("touchend", handleTouchEnd);

let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;

function handleTouchStart(event) {

  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
  touchMoved = false;

} 

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

}

function handleTouchEnd() {

  if (!touchMoved) {
    //Handle tap event here is needed
  }

}

//Main game loop
function gameLoop() {

  clearGB();
  drawCube();
  requestAnimationFrame(gameLoop);

}

//Start the game loop
gameLoop();