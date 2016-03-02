//durak rules include attacking and defending
//game initiation
//first, everyone draws six cards from the deck at random, the deck being selected as fast-paced or regular (eliminating lower ranks)
//then, the trump card is selected and displayed in the discards pile. If anyone has the 2 of trump, they may replace cards
//attacking
//attacking requires a placement of any number of cards of the same rank
//once the cards are placed down, the defender must defend against the preivous cards
//defending
//play a card of equal rank to pass cards along
//on each attacking card, must play a card of greater rank of the same suit, or any trump card
//if the attacking card is a trump, then you can only beat it with a trump of greater rank
//any attacking/defending card can be placed by all players up until reaching the number of cards in the defender's hand
//turn ends when all attacking cards are successfully defended -> 10 seconds pass after last defended card or if all other players pass (first)
//also ends when player surrenders and takes all cards

"use strict";
/* Include Base Classes */
var Game = require("./Game.js");
var BasePlayer = require("./Player.js");
GLOBAL.Container = require("./Container.js");
GLOBAL.Item = require("./Item.js");

function Durak(maxPlayers, deckType) {
  Game.apply(this, arguments);
  
  this.suits = ['Clubs', 'Spades', 'Hearts', 'Diamonds'];
  this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var cards = [];

  if (deckType == 'Quick')
    this.ranks = this.ranks.slice(4);

  for (var _suit of this.suits) {
  	for (var _rank of this.ranks) {
  		cards.push(new Card({name: _rank + '-of-' + _suit, suit: _suit, rank: _rank}));
  	}
  }

  cards = cards.map(function(card) {return [card.name, card]});

  this.deck = new Deck(cards);
  this.discards = new Deck();
  this.trump = new Deck();

  this.deck.dShuffle();

  this.round = new Round(this);
  this.containers = [];
}

Durak.prototype = Object.create(Game.prototype);
Durak.prototype.constructor = Durak;
var method = Durak.prototype;

method.initPlayers = function(playerObj) {
  for (var player of playerObj) {
    this.addPlayer(player, []);
  }

  var trumpCard = this.deck.top();
  this.deck.removeItem(trumpCard.name);
  trumpCard.setContainer(trumpCard.name, this.trump);
  this.trumpSuit = trumpCard.suit;
  this.swappedTrump = false;
  this.round.initRound();
}

method.getGameInfo = function() {
  var gameInfo = {players: [], deck: [], discards: [], pairs: [], trump: null};
  for (var player of this.players) {
    var playerInfo = {name: player.name, cards: []};
    for (var card of player) {
      playerInfo.cards.push({name: card.name, rank: card.rank, suit: card.suit});
    }
    gameInfo.players.push(playerInfo);
  }

  var pair, attack, defend;
  for (var counter = 0; counter < this.round.pairs.length; counter++) {
    pair = this.round.pairs[counter];
    attack = pair.getAttack();
    defend = pair.getDefend();
    var pairInfo = {id: counter, attack: null, defend: null};
    pairInfo.attack = {name: attack.name, rank: attack.rank, suit: attack.suit};
    if (defend)
      pairInfo.defend = {name: defend.name, rank: defend.rank, suit: defend.suit};
    else
      pairInfo.defend = null;
    gameInfo.pairs.push(pairInfo);
  }

  for (var card of this.deck) {
    gameInfo.deck.push(card.name);
  }
  for(var card of this.discards) {
    gameInfo.discards.push(card.name);
  }

  var trump = this.trump.top();
  if (trump)
    gameInfo.trump = {suit: trump.suit, rank: trump.rank, name: trump.name};
  else
    gameInfo.trump = {suit: this.trumpSuit, rank: null, name: null};

  console.log('pairs GO', gameInfo.pairs);
  return gameInfo;
}

method.addPlayer = function(playerName, handNames) {
  var currPlayer = Game.prototype.addPlayer.apply(this, arguments);

  if (handNames.length > 0) {
    var handCards = this.findItems(handNames);
    for (var card of handCards) {
      card.setContainer(card.name, currPlayer);
    }
  } else {
    currPlayer.getItems(this.deck, this.trump);
    for (var card of currPlayer) {
      handNames.push(card);
    }
  }
  return [playerName, handNames];
}

method.delPlayer = function(playerName) {
  var player = this.players.getItem(playerName);
  for (var card of player) {
    player.removeItem(card.name);
    card.setContainer(card.name, this.deck);
  }
  this.unsetPlayers.addItem("player" + (this.players.size - 1), player);
  this.players.removeItem(playerName);
}

method.swapTrump = function(player, card) {
  if (this.swappedTrump || card.container == this.trump || card.suit != this.trumpSuit ||
      card.rank != this.ranks[0])
    return false;
  var trumpCard = this.trump.top();
  this.trump.removeItem(trumpCard.name);
  trumpCard.setContainer(trumpCard.name, player);
  card.container.removeItem(card.name);
  card.setContainer(card.name, this.trump);
  console.log('trump', this.trump);
  return true;
}

method.hasWon = function(player) {
  console.log(player);
  return !player.numItems;
}

var method1 = Round.prototype;

function Round(game) {
	this.game = game;
  this.tempItems = []; // game inheritance requirement
	this.pairs = this.tempItems; // clarifies content
	this.ranks = [];
	this.players = [];
	this.canPass = true;
}

method1.initRound = function() {
  for (var player of this.game.players)
    this.players.push(player.name);

  var attackerIndex = this.game.turn % this.players.length;
  var defenderIndex = (attackerIndex + 1) % this.players.length;

  this.attacker = this.game.players.getItem(this.players[attackerIndex]);
  this.defender = this.game.players.getItem(this.players[defenderIndex]);
}

method1.initAttack = function(attackCards) {
  var isAttackerCard = true;

  for (var card of attackCards) {
    if (card.container != this.attacker) {
      isAttackerCard = false;
    }
  }

  if (!isAttackerCard)
    return false;

  if (this.sameRank(attackCards)) {
    for (var card of attackCards) {
      this.initRank = card.rank;
      this.addPair(card, true);
    }

    this.addRank(this.initRank);
    return true;
  }
  return false;
}

method1.addRank = function(rank) {
	if (this.ranks.indexOf(rank) == -1) {
		this.ranks.push(rank);
	}
}

method1.addPair = function(attackCard, init) {
  var emptyPairs = 0;
  for (var pair of this.pairs) {
    if (!pair.completed)
      emptyPairs++;
  }

  if (this.defender.numItems <= emptyPairs)
    return false;

	if (this.ranks.indexOf(attackCard.rank) != -1 || init) {
		this.pairs.push(new Pair(this, attackCard));
		return true;
	}
	return false;
}

method1.checkPass = function(defendCards) {
  var isDefenderCard = true, defendRank = '';

  for (var card of defendCards) {
    defendRank = card.rank;
    if (card.container != this.defender) {
      isDefenderCard = false;
    }
  }

  if (!isDefenderCard)
    return false;

  console.log(this.canPass, this.sameRank(defendCards));
  console.log('init', this.initRank, defendRank);
	if (this.canPass)
		return this.sameRank(defendCards) && defendRank == this.initRank;
	return false;
}

method1.checkWin = function() {
	if (this.defender.numItems == 0) 
		return true;
	for (var pair of this.pairs) {
		if (!pair.completed) {
			return false;
		}
	}
	return true;
}

method1.sameRank = function(cards) {
  var sameRank = true, cardRank = cards.top().rank;
  for (var card of cards) {
    if (cardRank && card.rank != cardRank)
      sameRank =  false;
  }

  return sameRank;
}

method1.pass = function(defendCards) {
	if (!this.checkPass(defendCards))
		return false;

  for (var card of defendCards)
    this.addPair(card, false);

	this.game.turn += 1;
	var defenderIndex = (this.game.turn + 1) % this.players.length;
	this.defender = this.game.players.getItem(this.players[defenderIndex]);
  if (this.attacker == this.defender) {
    var attackerIndex = this.game.turn % this.players.length;
    this.attacker = this.game.players.getItem(this.players[attackerIndex]);
  }
	return true;
}

method1.win = function() {
	if (!this.checkWin()) {
		return false;
	}

	this.discardPairs(true);

	return true;
}

method1.surrender = function() {
	if (this.checkWin()) {
		return false;
	}

	this.discardPairs(false);

	return true;
}

method1.getPlayerItems = function() {
	var playerCards = new Container();
	playerCards.addItem(this.attacker.name, this.attacker.getItems(this.game.deck, this.game.trump));
	var attackerIndex = this.players.indexOf(this.attacker.name);
	var defenderIndex = this.players.indexOf(this.defender.name);

	for (var i = 0; i < this.players.length; i++) {
		if (i != attackerIndex && i != defenderIndex) {
			var index = (attackerIndex + i) % this.players.length;
			var player = this.game.players.getItem(this.players[index]);
			playerCards.addItem(player.name, player.getItems(this.game.deck, this.game.trump));
		}
	}
	playerCards.addItem(this.defender.name, this.defender.getItems(this.game.deck, this.game.trump));

	return playerCards;
}

method1.discardPairs = function(hasWon) {
  var destination = this.defender;
  if (hasWon)
    destination = this.game.discards;

  for (var pair of this.pairs) {
    var attack = pair.getAttack();
    pair.items.removeItem('attack');
    attack.setContainer(attack.name, destination);
    if (pair.completed) {
      var defend = pair.getDefend();
      pair.items.removeItem('defend');
      defend.setContainer(defend.name, destination);
    }
  }

  this.pairs = [];
  this.ranks = [];
}

method1.newRound = function(hasWon) {
	var cards = this.getPlayerItems(), players = [];
  console.log(cards);
	this.game.turn += 1;
  this.canPass = true;

  var attackerIndex = this.game.turn % this.players.length;
  var defenderIndex = (attackerIndex + 1) % this.players.length;

	if (hasWon) {
		this.attacker = this.defender;
    this.defender = this.game.players.getItem(this.players[defenderIndex]);
	} else {
		this.game.turn += 1;
    attackerIndex = this.game.turn % this.players.length;
    defenderIndex = (attackerIndex + 1) % this.players.length;
		this.attacker = this.game.players.getItem(this.players[attackerIndex]);
		this.defender = this.game.players.getItem(this.players[defenderIndex]);
	}

  console.log('attacker', this.attacker.name, 'defender', this.defender.name);
	
	for (var card of cards.entries()) {
    players.push([card[0], card[1]]);
  }

  return players;
}

GLOBAL.Round = Round;

function Player(name) {
  Container.apply(this, []);
  this.name = name;
}

Player.prototype = Object.create(Container.prototype);
var method2 = Player.prototype;

// draw til min, then return cards to draw
method2.getItems = function(deck, backup) {
  var cardNames = [];
  var top = deck.top();
  var drawCard;
  while (this.numItems < 6 && top != null) {
    drawCard = deck.removeItem(top.name);
  	drawCard.setContainer(drawCard.name, this);
  	cardNames.push(drawCard.name);
    top = deck.top();
  }

  if (this.numItems < 6 && backup.numItems > 0) {
    drawCard = backup.removeItem(backup.top().name);
    drawCard.setContainer(drawCard.name, this);
    cardNames.push(drawCard.name);
  }

  return cardNames;
}

GLOBAL.Player = Player;

// normal game rules diff - 
// 1. loser is last one to drop off
// 2. max six cards in attack field	
// house rules diff - 
// 1. winner is first to drop off
// 2. max defender num cards  in attack field
// Quick-game - exclude cards 2-5

/////

function Deck(cards) {
  Container.apply(this, arguments);
}

Deck.prototype = Object.create(Container.prototype);
var method3 = Deck.prototype;

method3.dShuffle = function() {
  var cardValues = [];
  for (var card of this) {
    cardValues.push([card.name, card]);
  }

  this.setEqual(new Deck(this.shuffle(cardValues)));
}

method3.shuffle = function(array) {
  var counter = array.length, temp, index;

  while (counter > 0) {
    index = Math.floor(Math.random() * counter);

    counter--;

    temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

var method4 = Pair.prototype;

function Pair(round, initCard) {
  this.round = round;
  this.items = new Container();
  this.completed = false;

  initCard.container.removeItem(initCard.name);
  initCard.setContainer('attack', this.items);
}

method4.getItem = function(id) {
  var options = [this.getAttack(), this.getDefend()];
  for (var option of options) {
    if (option.name == id) {
      return option
    }
  }

  return null;
}

method4.getAttack = function() {
  return this.items.getItem('attack');
}

method4.getDefend = function() {
  return this.items.getItem('defend');
}

method4.checkDefend = function(defend) {
  if (this.completed)
    return false;

  if (defend.container != this.round.defender)
    return false;

  var checkRank = false;
  var game = this.round.game;
  var attack = this.getAttack();
  var trumpIndex = game.suits.indexOf(game.trumpSuit);
  var attackSuitIndex = game.suits.indexOf(attack.suit);
  var defendSuitIndex = game.suits.indexOf(defend.suit);

  if (trumpIndex == defendSuitIndex && trumpIndex != attackSuitIndex)
    return true;

  var attackRankIndex = game.ranks.indexOf(attack.rank);
  var defendRankIndex = game.ranks.indexOf(defend.rank);

  if (trumpIndex == attackSuitIndex && trumpIndex == defendSuitIndex) {
    checkRank = true;
  }

  if (defendSuitIndex == attackSuitIndex) {
    checkRank = true;
  }

  if (checkRank && defendRankIndex > attackRankIndex) {
    return true;
  }
  return false;
}

method4.addDefend = function(defend) {
  if (this.checkDefend(defend)) {
    defend.container.removeItem(defend.name);
    defend.setContainer('defend', this.items);
    this.completed = true;
    this.round.canPass = false;
    this.round.addRank(defend.rank);
    return true;
  }
  return false;
}

function Card(info) {
  Item.apply(this, arguments);

  this.rank = info.rank;
  this.suit = info.suit;
}

Card.prototype = Object.create(Item.prototype);

module.exports = Durak;