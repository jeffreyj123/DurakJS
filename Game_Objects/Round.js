/*  
    Abstract Round Class

    File must be included with the following dependencies:
      Game
      Player
    Container
    Item
 */

var method = Round.prototype;

function Round(game) {
	this.game = game;
  this.tempItems = new Container();
	this.players = [];
}

method.initRound = function() {
  for (var player of this.game.players)
    this.players.push(player.name);
}

method.checkWin = function(player) {
  throw new Error("Abstract method!");
}

method.win = function(player) {
  throw new Error("Abstract method!");
	if (!this.checkWin()) {
		return false;
	}

	return true;
}

method.surrender = function() {
  throw new Error("Abstract method!");
	if (this.checkWin()) {
		return false;
	}

	return true;
}

method.getPlayerItems = function() {
  throw new Error("Abstract method");
  var items = new Container();

  for (var player of this.game.players) {
    items.setItem(player.name, player.getItems());
  }

  return items;
}

method.resetState = function(hasWon) {
  throw new Error("Abstract method!");
  if (hasWon) {
    // do something
  }
  //doSomething else
}

method.newRound = function(player, hasWon) {
  throw new Error("Abstract method!");
	var items = this.getPlayerItems(), players = [];
	this.game.turn += 1;

	if (hasWon) {
		// do something
	} else {
		// do something else
	}
	
	for (var item of items) {
    players.push([item[0], item[1]]);
  }

  return players;
}

module.exports = Round;