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
var method = Game.prototype;

function Game(deckType) {
  this.players = new Map();
  this.unsetPlayers = new Map();
  this.turn = 0;

  for (var i = 0; i < 6; i++) {
    this.unsetPlayers.set("player" + i, new Player("player" + i));
  }

  this.suits = ['Clubs', 'Spades', 'Hearts', 'Diamonds'];
  this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var cards = [];

  if (deckType == 'Quick')
    this.ranks = this.ranks.slice(4);

  for (var suit of this.suits) {
  	for (var rank of this.ranks) {
  		cards.push(new Card(suit, rank));
  	}
  }

  this.deck = new Deck(cards);
  this.discards = new Deck();
  this.trump = new Deck();

  this.deck.dShuffle();
  this.round = new Round(this);
}

method.initPlayers = function(playerObj) {
  for (var player of playerObj) {
    this.addPlayer(player, []);
  }

  for (var player of this.players) {
    player[1].draw(this.deck);
  }

  this.deck.getLast().setCard1(this.trump);
  this.trumpSuit = this.trump.getLast().suit;
  this.swappedTrump = false;
  this.round.initRound();
}

method.getGameInfo = function() {
  var gameInfo = {players: [], deck: [], discards: [], trump: this.trump.getLast().name};
  for (var player of this.players) {
    player = player[1];
    var playerInfo = {name: player.name, cards: []};
    for (var name of player.hand.cards.keys()) {
      playerInfo.cards.push(name);
    }
    gameInfo.players.push(playerInfo);
  }
  var deckNames = [];
  var discNames = [];
  for (var card of this.deck.cards.keys()) {
    deckNames.push(card);
  }
  for(var card of this.discards.cards.keys()) {
    discardNames.push(card);
  }

  gameInfo.deck = deckNames;
  gameInfo.discards = discNames;
  return gameInfo;
}

method.addPlayer = function(playerInfo, handNames) {
  var oldPlayerName = "player" + this.players.size;
  var currPlayer = this.unsetPlayers.get(oldPlayerName);
  currPlayer.name = playerInfo.name;

  if (handNames.length > 0) {
    var handCards = this.findCards(handNames);
    for (var card of handCards) {
      card[1].setCard(currPlayer.hand);
    }
  } else {
    currPlayer.draw(this.deck);
    for (var card of currPlayer.hand.cards) {
      handNames.push(card[0]);
    }
  }
  this.players.set(playerInfo.name, currPlayer);
  this.unsetPlayers.delete(oldPlayerName);
  return [playerInfo, handNames];
}

method.delPlayer = function(playerName) {
  var player = this.players.get(playerName);
  for (var card of player.hand.cards) {
    card[1].setCard1(this.deck);
  }
  this.unsetPlayers.set(player, "player" + (this.players.size - 1));
  this.players.delete(playerName);
}

method.findCards = function(cardNames) {
  cardNames = typeof cardNames !== 'undefined' ? cardNames : [];
  var cards = new Map();

  var decks = [this.deck, this.discards];
  for (var player of this.players) {
    decks.push(player[1].hand);
  }
  for (var pair of this.round.pairs) {
    decks.push(pair.attack);
    decks.push(pair.defend);
  }

  for (var cardName of cardNames) {
    var card = null;
    for (var deck of decks) {
      if (card != null) {
        break;
      } else {
        card = deck.selectCard(cardName);
      }
    }
    if (card == null) {
    //error code
      console.log(cardName + ' not found');
    } else {
      cards.set(cardName, card);
    }
  }

  return cards;
}

method.swapTrump = function(player, card) {
  if (this.swappedTrump || card.deck == this.trump || card.suit != this.trumpSuit ||
      card.rank != this.ranks[0])
    return false;
  this.trump.getLast().setCard1(player.hand);
  card.setCard1(this.trump);
  console.log('trump', this.trump);
  return true;
}

method.resetGame = function() {
  for (var player of this.players) {
    this.delPlayer(player[0]);
  }
}

var method1 = Round.prototype;

function Round(game) {
	this.game = game;
	this.pairs = [];
	this.ranks = [];
	this.players = [];
	this.canPass = true;
}

method1.initRound = function() {
  for (var player of this.game.players)
    this.players.push(player[0]);

  var attackerIndex = this.game.turn % this.players.length;
  var defenderIndex = (attackerIndex + 1) % this.players.length;

  this.attacker = this.game.players.get(this.players[attackerIndex]);
  this.defender = this.game.players.get(this.players[defenderIndex]);
}

method1.initAttack = function(attackCards) {
  var isAttackerCard = true;

  for (var card of attackCards) {
    if (card[1].deck != this.attacker.hand) {
      isAttackerCard = false;
    }
  }

  if (!isAttackerCard)
    return false;

  if (this.sameRank(attackCards)) {
    for (var card of attackCards) {
      this.initRank = card[1].rank;
      this.addPair(card[1], true);
    }

    this.ranks.push(this.initRank);
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

  if (this.defender.numCards <= this.emptyPairs)
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
    defendRank = card[1].rank;
    if (card[1].deck != this.defender.hand) {
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
	if (this.defender.hand.size == 0) 
		return true;
	for (var pair of this.pairs) {
		if (!pair.completed) {
      (pair);
			return false;
		}
	}
	return true;
}

method1.sameRank = function(cards) {
  var sameRank = true, cardRank = null;
  for (var card of cards) {
    if (cardRank && card[1].rank != cardRank)
      sameRank =  false;
  }

  return sameRank;
}

method1.pass = function(defendCards) {
	if (!this.checkPass(defendCards))
		return false;

  for (var card of defendCards)
    this.addPair(card[1], false);

	this.game.turn += 1;
	var defenderIndex = (this.game.turn + 1) % this.players.length;
	this.defender = this.game.players.get(this.players[defenderIndex]);
  if (this.attacker == this.defender) {
    var attackerIndex = this.game.turn % this.players.length;
    this.attacker = this.game.players.get(this.players[attackerIndex]);
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

method1.drawCards = function() {
	var playerCards = new Map();
	playerCards.set(this.attacker.name, this.attacker.draw(this.game.deck, this.game.trump));
	var attackerIndex = this.players.indexOf(this.attacker.name);
	var defenderIndex = this.players.indexOf(this.defender.name);

	for (var i = 0; i < this.players.length; i++) {
		if (i != attackerIndex && i != defenderIndex) {
			var index = (attackerIndex + i) % this.players.length;
			var player = this.game.players.get(this.players[index]);
			playerCards.set(player.name, player.draw(this.game.deck, this.game.trump));
		}
	}
	playerCards.set(this.defender.name, this.defender.draw(this.game.deck, this.game.trump));

	return playerCards;
}

method1.discardPairs = function(hasWon) {
  var destination = this.defender.hand;
  if (hasWon)
    destination = this.game.discards;

  for (var pair of this.pairs) {
    pair.attack.getLast().setCard1(destination);
    if (pair.completed)
      pair.defend.getLast().setCard1(destination);
  }

  this.pairs = [];
  this.ranks = [];
}

method1.newRound = function(hasWon) {
	var cards = this.drawCards(), players = [];
  console.log(cards);
	this.game.turn += 1;
  this.canPass = true;

  var attackerIndex = this.game.turn % this.players.length;
  var defenderIndex = (attackerIndex + 1) % this.players.length;

	if (hasWon) {
		this.attacker = this.defender;
    this.defender = this.game.players.get(this.players[defenderIndex]);
	} else {
		this.game.turn += 1;
    attackerIndex = this.game.turn % this.players.length;
    defenderIndex = (attackerIndex + 1) % this.players.length;
		this.attacker = this.game.players.get(this.players[attackerIndex]);
		this.defender = this.game.players.get(this.players[defenderIndex]);
	}

  console.log('attacker', this.attacker.name, 'defender', this.defender.name);
	
	for (var card of cards) {
    players.push([card[0], card[1]]);
  }

  return players;
}

var method2 = Card.prototype;

function Card(suit, rank) {
	this.name = rank + "-of-" + suit;
	this.suit = suit;
	this.rank = rank;
	this.deck = null;
}

method2.setCard = function(deck) {
  if (this.deck != null) {
    this.deck.remove(this);
  }
  deck.add(this);
  this.deck = deck;
}

method2.setCard1 = function(deck) {
  if (this.deck != null) {
    this.deck.remove(this);
  }
  deck.add1(this);
  this.deck = deck;
}

var method3 = Pair.prototype;

function Pair(round, attackCard) {
	this.round = round;
	this.attack = new Deck();
	this.defend = new Deck();
	this.completed = false;

  attackCard.setCard1(this.attack);
}

method3.checkDefend = function(defend) {
  if (defend.deck != this.round.defender.hand)
    return false;

	var checkRank = false;
	var game = this.round.game;
	var trumpIndex = game.suits.indexOf(game.trumpSuit);
	var attackSuitIndex = game.suits.indexOf(this.attack.getLast().suit);
	var defendSuitIndex = game.suits.indexOf(defend.suit);

  if (trumpIndex == defendSuitIndex && trumpIndex != attackSuitIndex)
    return true;

	var attackRankIndex = game.ranks.indexOf(this.attack.rank);
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

method3.addDefend = function(defend) {
	if (this.checkDefend(defend)) {
		defend.setCard1(this.defend);
    this.completed = true;
		this.round.canPass = false;
		this.round.addRank(defend.rank);
		return true;
	}
	return false;
}

var method4 = Deck.prototype;

function Deck(cards) {
  this.cards = new Map();
  if (typeof cards === 'undefined') {
    cards = [];
  }
  for (var card of cards) {
    card.setCard(this);
  }
  this.numCards = this.cards.size;
}

method4.add = function(card) {
  this.cards.set(card, card.name);
  this.numCards += 1;
}

method4.add1 = function(card) {
  this.cards.set(card.name, card);
  this.numCards += 1;
}

method4.remove = function(card) {
  this.cards.delete(card.name)
  this.numCards -= 1;
}

method4.getLast = function() {
	if (this.numCards != 0)
		return this.cards.values().next().value;
	return null;
}

method4.selectCard = function(name) {
  try {
    return this.cards.get(name);
  }
  catch(err) {
    console.log('select card at index ' + name + ' not found');
    return null;
  }
}

method4.dShuffle = function() {
  var cardValues = [];
  this.cards.forEach(function(name, card) {
    cardValues.push([name, card]);
  });

  this.cards = new Map(this.shuffle(cardValues));
}

method4.shuffle = function(array) {
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

var method5 = Player.prototype;

function Player(name) {
  this.name = name;
  this.hand = new Deck();
}

// draw til min, then return cards to draw
method5.draw = function(deck, backup) {
  var cardNames = [];
	var drawCard = deck.getLast();
  while (this.hand.numCards < 6 && drawCard != null) {
  	drawCard.setCard1(this.hand);
  	cardNames.push(drawCard.name);
  	drawCard = deck.getLast();
  }

  if (this.hand.numCards < 6 && backup.numCards > 0) {
    drawCard = backup.getLast();
    drawCard.setCard1(this.hand);
    cardNames.push(drawCard.name);
  }

  return cardNames;
}

method5.hasWon = function() {
  return this.hand.numCards == 0;
}

// normal game rules diff - 
// 1. loser is last one to drop off
// 2. max six cards in attack field	
// house rules diff - 
// 1. winner is first to drop off
// 2. max defender num cards  in attack field
// Quick-game - exclude cards 2-5
module.exports = Game;