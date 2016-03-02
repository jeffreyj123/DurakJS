/*
		Abstract Player Class
		
		File must be included with the following dependencies:
			Container
			Item
 */

var method = Player.prototype;

function Player(name) {
  this.name = name;
  this.items = new Container();
}

method.getItems = function(container, backup) {
  throw new Error("Abstract method!");
}

module.exports = Player;