var gameBoard = docuemnt.getElementsById("game-border");
var gameContext = gameBoard.getContext("webgl", {depth: true, stencil: true})
var pause = docuemnt.getElementsByClassName("pausebtn");
/* To move the blocks when user clicks on them */
var options = $( ".block" ).draggable( "option" );





/*Sift through below code to make movement of the blocks work,
Still need to create ball 

var box = document.getElementById("box");
var container = document.getElementById("container");
var time = document.getElementById("time");
let up2 = 1;
let right2 = 1;
let left2 = 1;
let down2 = 1;

function up() {
  box.style.height = 30 + "px";
  box.style.bottom = 30 * up2 + "px";
  up2++;
}

function right() {
  box.style.right = 30 + "px";
  box.style.left = 30 * right2 + "px";
  right2++;
}

function left() {
  box.style.left = 30 + "px";
  box.style.right = 30 * left2 + "px";
  left2++;
}

function down() {
  box.style.bottom = 30 + "px";
  box.style.top = 30 * down2 + "px";
  down2++;
} */


/* To move the blocks when user clicks on them, 
Must make movement functions possible first

$( ".block" ).draggable({
    create: function( event, ui ) {}
  });

  $( ".selector" ).on( "drag", function( event, ui ) {} );

*/

