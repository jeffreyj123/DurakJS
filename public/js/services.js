'use strict';

angular.module('durakApp.services', []).
	factory('socket', ['$rootScope', function ($rootScope) {
	  var socket = io.connect();
	  return {
	    on: function (eventName, callback) {
	      socket.on(eventName, function () {  
	        var args = arguments;
	        $rootScope.$apply(function () {
	          callback.apply(socket, args);
	        });
	      });
	    },
	    emit: function (eventName, data, callback) {
	      socket.emit(eventName, data, function () {
	        var args = arguments;
	        $rootScope.$apply(function () {
	          if (callback) {
	            callback.apply(socket, args);
	          }
	        });
	      })
	    }
	  };
	}]).
	service('room', function() {
		var roomData = {};
		var rooms = {data: []};
		// prototype to name, users, players, username

		this.getRooms = function() {
			return rooms.data;
		}
		
		this.setRooms = function(roomsList) {
			console.log('rooms set');
			rooms.data = roomsList;
		}

		this.getRoom = function() {
			return roomData;
		}

		this.setRoom = function(roomVal) {
			roomData = roomVal;
		}

		this.setRoomName = function(name) {
			roomData.name = name;
		}

		this.setUsers = function(users) {
			roomData.users = users;
		}

		this.getUsername = function() {
			return roomData.username;
		}

		this.setUsername = function(name) {
			roomData.username = name;
		}
	}).
	service('game', function() {
		var gameData = {
			players: [],
			playerHand: {cards: []},
			trump: null,
			deck: 0,
			discards: 0,
			pairs: []
		};
		var started = false;
		var cards = [];
		var attacker = '';
		var defender = '';
		var winner = null;

		this.getGame = function() {
			return gameData;
		}

		this.getWinner = function() {
			return winner;
		}

		function equalizeByProp(array1, array2, property) {
			var to_do = array1.length, counter = 0;
			while (counter != to_do && counter < array2.length) {
				if (array2[counter][property] != array1[counter][property]) {
					array1.splice(counter, 1);
					counter--;
					to_do--;
				}
				counter++;
			}
			if (counter < to_do) {
				array1.splice(counter);
			}
		}

		this.equalizeInPlace = function(array1, array2, property) {
				equalizeByProp(array1, array2, property);
				array1.push.apply(array1, array2.splice(array1.length));
		}

		this.setGame = function(game) {
			if (gameData.players.length) {
				gameData.players = game.players;
				this.equalizeInPlace(gameData.playerHand.cards, game.playerHand.cards, 'name');
				this.equalizeInPlace(gameData.pairs, game.pairs, 'attack');
				console.log('pairs', game.pairs, gameData.pairs);
				gameData.trump = game.trump;
				gameData.deck = game.deck;
			} else {
				gameData = game;
			}
		}

		this.startGame = function() {
			started = true;
		}

		this.checkStart = function() {
			return started;
		}
/* unneccessary
		this.setCards = function(deck) {
			cards = [];
			var suits = ['Clubs', 'Spades', 'Hearts', 'Diamonds'];
  			var ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
			if (deck == "Quick")
				ranks = ranks.slice(4);

			for (var cardSuit of suits) {
				for (var cardRank of ranks) {
					cards.push({suit: cardSuit, rank: cardRank});
				}
			}
		}

		this.getCards = function() {
			return cards;
		}*/

		this.getGameItem = function(item) {
			return gameData[item];
		}

		this.setGameItem = function(item, newVal) {
			gameData[item] = newVal;
		}

		this.setAttacker = function(username) {
			attacker = username;
		}

		this.setDefender = function(username) {
			defender = username;
		}

		this.isAttacker = function(username) {
			return username == attacker;
		}

		this.isDefender = function(username) {
			return username == defender;
		}
/*		this.getPlayerCards = function(player) {
			return game.data.players.numCards;
		}

		this.setPlayerCards = function(player, numCards) {
			game.data.players[player].numCards = numCards;
		}*/
	}).
	service('chat', function() {
		var message = {data: ""};

		this.setMessage = function(messageString) {
			message.data = messageString;
		}

		this.getMessage = function() {
			return message.data;
		}
	}).
	service('actions', function() {
		var actionSet = {
			swap: false,
			attack: false,
			defend: false,
			pass: false,
			win: false,
			surrender: false,
			winGame: false,
		};

		var temp = {
			cards: [],
			pair: null,
			pairId: null,
			defend: null,
			swap: null
		};

		var confirmAction = false;

		this.getTempItem = function(item) {
			return temp[item];
		}

		this.setTempItem = function(item, newVal) {
			temp[item] = newVal;
		}

		this.addTempCard = function(card) {
			temp.cards.push(card);
		}

		this.getAction = function() {
			for (var action in actionSet) {
			  if (actionSet.hasOwnProperty(action) && actionSet[action]) {
			    return action;
			  }
			}
			return null;
		}

		this.cancelAction = function() {
			for (var action in actionSet) {
			  actionSet[action] = false;
			}
			confirmAction = false;
			for (var item in temp) {
				if (item != 'cards')
					temp[item] = null;
			}
			temp.cards = [];
		}

		this.setAction = function(action, newVal) {
			actionSet[action] = newVal;
		}

		this.checkConfirm = function() {
			return confirmAction;
		}

		this.setConfirm = function(newConfirm) {
			confirmAction = newConfirm;
		}
	});