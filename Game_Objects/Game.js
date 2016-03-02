/* 
    Abstract Game Class

    File must be included along with the following dependencies:
      Round
      Player
      Container
      Item
 */

"use strict";

function Game(maxPlayers) {
  if (this.constructor == Game) {
    throw new Error("Abstract Class cannot be defined!");
  }
  maxPlayers = typeof(maxPlayers) !== 'undefined' ? maxPlayers : 6;
  this.players = new Container();
  this.unsetPlayers = new Container();
  this.turn = 0;

  for (var i = 0; i < maxPlayers; i++) {
    this.unsetPlayers.addItem("player" + i, new Player("player" + i));
  }

  this.round = new Round(this);
  this.containers = [this.round.tempItems];
}

var method = Game.prototype;

method.initPlayers = function(playerObj) {
  throw new Error("Abstract method!");
  for (var player of playerObj) {
    this.addPlayer(player, []);
  }

  this.round.initRound();
}

method.getGameInfo = function() {
  throw new Error("Abstract method!");
  var gameInfo = {players: []};
  for (var player in this.players) {
    player = this.players[player];

    gameInfo.players.push(player.getInfo());
  }

  return gameInfo;
}

method.addPlayer = function(playerName) {
  var oldPlayerName = "player" + this.players.numItems;
  var currPlayer = this.unsetPlayers.getItem(oldPlayerName);
  currPlayer.name = playerName;

  this.players.addItem(playerName, currPlayer);
  this.unsetPlayers.removeItem(oldPlayerName);
  return currPlayer;
}

method.delPlayer = function(playerName) {
  throw new Error("Abstract method!");
  var player = this.players.getItem(playerName);
  this.unsetPlayers.addItem("player" + (this.players.numItems - 1), player);
  this.players.removeItem(playerName);
}

method.findItems = function(itemNames, containers) {
  containers = typeof(containers) != 'undefined' ? containers: [];

  if (!containers) {

    for (var player of this.players) {
      containers.push(player);
    }

    for (var container of this.round.tempItems) {
      containers.push(container);
    }
  }

  var items = new Container();
  var item = null;
  for (var itemName of itemNames) {
    for (var container of containers) {
      item = container.getItem(itemName);
      if (item) {
        items.addItem(itemName, item);
      }
    }
    if (!item) {
      console.log('Item at index ' + itemName + ' not found');
    }
  }
  return items;
}

method.resetGame = function() {
  for (var player of this.players) {
    this.delPlayer(player[0]);
  }
}

method.hasWon = function(player) {
  throw new Error("Abstract method!");
}

module.exports = Game;