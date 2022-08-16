var gameBoard = docuemnt.getElementsById("game-border");
var gameContext = gameBoard.getContext("webgl", {depth: true})
var pause = docuemnt.getElementsByClassName("pausebtn");
var isPaused = true;




function pauseMenu () {

    window.open(windowFeatures.popup);

}

pausebtn.addEventListener("click", pauseMenu);