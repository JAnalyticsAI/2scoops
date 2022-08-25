var gameBoard = docuemnt.getElementsById("game-border");
var gameContext = gameBoard.getContext("webgl", {depth: true, stencil: true})
var pause = docuemnt.getElementsByClassName("pausebtn");
/* To move the blocks when user clicks on them */
var options = $( ".block" ).draggable( "option" );




/* function pauseMenu () {

    

}

pausebtn.addEventListener("click", pauseMenu); */

/* To move the blocks when user clicks on them */

$( ".block" ).draggable({
    create: function( event, ui ) {}
  });

  $( ".selector" ).on( "drag", function( event, ui ) {} );