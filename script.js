// Get the border of the game
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
// Set up cube properties
let cubeSize = 25;
let cubeX = canvas.width / 2 - cubeSize / 2;
let cubeY = canvas.height / 2 - cubeSize / 2;
let cubeSpeed = 5;

//Draw the cube
function drawCube() {

  ctx.fillStyle = "red";
  ctx.fillRect(cubeX, cubeY, cubeSize, cubeSize);
  
};

// Function to clear the canvas
function clearCanvas() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

canvas.addEventListener("touchstart", handleTouchStart);
canvas.addEventListener("touchmove", handleTouchMove);
canvas.addEventListener("touchend", handleTouchEnd);

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

//Main game loop
function gameLoop() {

  clearCanvas();
  drawCube();
  requestAnimationFrame(gameLoop);

}

//Start the game loop
gameLoop();

// Board dimensions
const rows = 5;
const cols = 5;
//Create game board dynamically
const board = document.getElementById("gameBoard");
for (let i = 0; i < rows; i++) {

  for (let j = 0; j < cols; j++) {

    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.textContent = `${i}, ${j}`; // Example cell content (Place other game objects here)
    board.appendChild(cell);

  }
  
}
//Cell click event
const cells = document.querySelectorAll(".cell");
cells.forEach(cell => {

  cell.addEventListener("click", () => {

    //Handle cell click logic
    console.log("Clicked cell:", cell.textContent);

  });

});
