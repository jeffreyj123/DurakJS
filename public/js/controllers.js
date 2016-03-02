"use strict";

angular.module('durakApp.controllers', ['durakApp.services']).
	controller('socketController', ['$scope', 'socket', 'room', 'chat', 'game',
		'actions', function($scope, socket, room, chat, game, actions) {
		function setRooms(roomsList) {
			room.setRooms(roomsList);
			console.log(room.getRooms());
		}

		socket.on('room list', function(rooms) {
			$('#no-room').remove();
			console.log('rooms', rooms);
			if (rooms.length == 0) {
				$('#rooms-container').append('<div id="no-room" style="text-align:center">No rooms available</div>');
			} else {
				var roomsList = [];
				for (var room of rooms) {
					var roomData = room[1];
					roomData.name = room[0];
					roomsList.push(roomData);
				}
				console.log('setting rooms');
				setRooms(roomsList);
			}
		});

		socket.on('username', function() {
			setupDialog('name-field');
		});

		socket.on('setup game', function(option) {
			setupDialog(option);
		});

		function startGame() {
			game.startGame();
		}

		$scope.checkStart = game.checkStart();

		$scope.$watch(game.checkStart, function(hasStarted) {
			$scope.checkStart = hasStarted;
		});

		socket.on('init game', function() {
			startGame();
		});

		socket.on('online update', function(players) {
			room.setUsers(players);
		});

		function setUnicode(card) {
			switch (card.suit) {
				case 'Clubs':
					card.unicode = "♣";
					break;
				case 'Spades':
					card.unicode = "♠";
					break;
				case 'Hearts':
					card.unicode = "♥";
					break;
				case 'Diamonds':
					card.unicode = "♦";
					break;
				default:
					break;
			}
		}

		// should be received after every accepted action
		socket.on('game info', function(gameInfo, init) {
			console.log('game received');
			console.log(gameInfo);
			for (var card of gameInfo.playerHand.cards.concat([gameInfo.trump])) {
				setUnicode(card);
			}

			for (var pair of gameInfo.pairs) {
				setUnicode(pair.attack);
				if (pair.defend) {
					setUnicode(pair.defend);
				}
			}
			game.setGame(gameInfo);

			if (!init) {
				myMessage('<span>Server:</span> Querying server for game...');
				showDialog('Reloading game from server...');
			}

			socket.emit('ready', init);
		});

		var ctrl = this;
		socket.on('defend', function() {
			ctrl.checkWinGame();
		});

		socket.on('attack', function(failed) {
			if (failed.length != 0) {
				console.log(failed);
				showDialog('Cannot attack with these. Clearing in 2 seconds.');
				setTimeout(function() {
					tempWithdraw();
				}, 2000);
			}
		});

		socket.on('dump phase', function(defender, time) {
			showDumpTimer(time);
			if (room.getUsername() == defender) {
				showDialog('You have surrendered. Other players will now attack with ' +
					'any cards on the field');
				return;
			}
			showDialog(defender + ' has surrendered. Attack them with any cards on the ' +
				'field and they must take it.');
		});

		socket.on('turn', function(attacker, defender) {
			if (game.getWinner()) {
				superWinAnimation(game.getWinner());
				return;
			}
			game.setAttacker(attacker);
			game.setDefender(defender);
			showAttacker(room.getUsername() == attacker);
			showDefender(room.getUsername() == defender);
		});

		socket.on('cancel', function(command, message) {
			switch (command) {
				case "attack":
				case "defend":
				case "surrender":
				case "win":
				case "pass":
				case "swap trump":
				default:
					tempWithdraw();
					defendCard = null;
					endSelection();
					break;
			}
			if (typeof(message) != 'undefined')
				showDialog(message);
		});

		socket.on('end game', function(winner) {
			superWinAnimation(winner);
		});

		function myMessage(message) {
		  $('#messages').append($('<li>').html(message));
		  $('#messages').animate({
		  scrollTop: $('#messages').eq(0).scrollHeight}, 2000);
		  //chatAudio.play();
		}

		$scope.$watch(chat.getMessage, function(message) {
		  myMessage('<span>Me:</span> ' + message);
		  socket.emit('chat message', message);
		  $('#message').val('');
		});

		$('#chat-form').submit(function() {

		  return false;
		});

		socket.on('chat message', function(message){
		  myMessage(message);
		});

		$scope.fetchRooms = function() {
			console.log('fetching');
			socket.emit('fetch rooms');
		}

		$scope.setupSubmit = function() {
			var username = $('#username').val();
			var roomName = $('#room-name').val();
			var players = parseInt($('#num-players').val(), 10);
			var rules = $('#rules-options').val();
			var deck = $('#deck-options').val();
			var canSubmit = true;
			// checks
			if (username == '' || username == 'null') {
				canSubmit = false;
				$('#username').addClass('error');
			} else if ($('#name-field').is(':visible')) {
				$('#name-field').hide();
			}

			if (roomName == '' || roomName == 'null') {
				canSubmit = false;
				$('#room-field').addClass('error');
			}

			if (canSubmit) {
				room.setUsername(username);

				if ($('#num-players').is(':visible')) {
					socket.emit('create room', [username, roomName, players, rules, deck]);
				} else {
					socket.emit('join room', [username, roomName]);
					console.log('username', username, 'room name', roomName);
				}
			}
		}

		this.getCardNames = function(array) {
			return array.map(function(card) {return card.name});
		}

		this.sendDefend = function() {
			if (actions.getTempItem('defend') && actions.getTempItem('pairId') != null) {
				socket.emit('defend', [actions.getTempItem('defend'), actions.getTempItem('pairId')]);
				clearDialog();
			} else {
				showDialog('Need to select pair and card to defend with.');
			}
		}

		this.sendAttack = function() {
			if (!actions.getTempItem('cards').length)
				return;
			if (!game.getGameItem('pairs').length)
				socket.emit('init attack', this.getCardNames(actions.getTempItem('cards')));
			else
				socket.emit('attack', this.getCardNames(actions.getTempItem('cards')));

			clearDialog();
		}

		this.sendPass = function() {
			socket.emit('pass', this.getCardNames(actions.getTempItem('cards')));
			clearDialog();
		}

		this.sendWin = function() {
			showDialog('Waiting five seconds...')
			showDumpTimer(4000);
			setTimeout(function() {
				socket.emit('win');
			}, 5000);
		}

		this.sendSurrender = function() {
			socket.emit('surrender');
		}

		this.sendSwap = function() {
			socket.emit('swap trump', actions.getTempItem('swap'));
			clearDialog();
		}

		this.checkWinGame = function() {
			if (!game.getGameItem('playerHand').cards.length)
				socket.emit('end game');
		}

		$scope.$watch(actions.checkConfirm, function(confirmed) {
			if (confirmed) {
				var action = actions.getAction();
				if (!action)
					return;

				switch(action) {
					case 'swap':
						ctrl.sendSwap();
						break;
					case 'attack':
						ctrl.sendAttack();
						break;
					case 'defend':
						ctrl.sendDefend();
						break;
					case 'pass':
						ctrl.sendPass();
						break;
					case 'win':
						ctrl.sendWin();
						break;
					case 'surrender':
						ctrl.sendSurrender();
						break;
					case 'winGame':
						ctrl.checkWinGame();
						break;
					default:
				}
				actions.cancelAction();
			}
		});
	}]).
	controller('gameController', ['$scope', 'game', 'actions', 'room', function($scope, game, actions, room) {
		this.cards = [];
		$scope.game = game.getGame();
		$scope.pairs = $scope.game.pairs;
		this.initAction = false;

		$scope.checkInitAction = function() {
			return this.initAction;
		}

		$scope.$watch(game.getTrump, function(trump) {
			if (trump == null)
				return;
			if (trump.name) {
				if ($('#trump-container .cards')) {
					$('#swap').hide();
				}
			}
			else {
				var suitUnicode = "";
				switch (trumpSuit) {
					case 'Clubs':
						suitUnicode = "♣";
						break;
					case 'Spades':
						suitUnicode = "♠";
						break;
					case 'Hearts':
						suitUnicode = "♥";
						break;
					case 'Diamonds':
						suitUnicode = "♦";
						break;
					default:
						break;
				}
				$('#trump-container').append('<div class="trump ' + trump.suit.toLowerCase() + '">' + suitUnicode + '</div>');
			}
		});

		var ctrl = this;
		$scope.$watch(game.getGame, function(newGame) {
			$scope.game = newGame;
			setTimeout(function() {
				$scope.pairs = newGame.pairs;
			}, 500)
			if ($scope.game.playerHand.cards) {
				if (!ctrl.initTicks) {
					ctrl.getTicks();
					ctrl.focusTick(0);
					ctrl.initTicks = true;
				}
			}
		});

		$scope.getTemps = function() {
			return actions.getTempItem('cards');
		}

		this.setGame = function(game) {
			game.setGame(game);
		}

		$scope.findDefend = function(card) {
			if (actions.getAction() != 'defend' || !actions.getTempItem('pair')) {
				return '';
			}
			var attack = actions.getTempItem('pair').attack;
			var trumpSuit = $scope.game.trump.suit;

			if (card.suit == trumpSuit && attack.suit != trumpSuit) {
				return 'defend-card';
			}

			if (attack.suit == trumpSuit && card.suit == trumpSuit) {
				if (checkRank(attack.rank, card.rank)) {
					return 'defend-card';
				}
				return;
			}

			if (attack.suit == card.suit && checkRank(attack.rank, card.rank)) {
				return 'defend-card';
			}
			return '';
		}

		$scope.addTemp = function(card) {
			var action = actions.getAction();
			console.log(action, card.name, 'initAction', this.initAction);
			switch (action) {
				case "defend":
					actions.setTempItem('defend', card.name);
					showDialog('Defend ' + actions.getTempItem('pair').attack.name + ' with ' + card.name + '? Select confirm or cancel');
					break;
				case "swap":
					actions.setTempItem('swap', card.name);
					showDialog('Swap ' + card.name + ' for trump card? Select confirm or cancel');
					break;
				default:
					if (actions.getTempItem('cards').indexOf(card) == -1)
						actions.addTempCard(card);
					console.log(actions.getTempItem('cards'));
			}
		}

		$scope.setPair = function(pair) {
			actions.setTempItem('pair', pair);
			actions.setTempItem('pairId', pair.id);
		}

		$scope.confirmAction = function() {
			actions.setConfirm(true);
			clearDialog();
			this.initAction = false;
		}

		$scope.cancelAction = function() {
			actions.cancelAction();
			clearDialog();
			this.initAction = false;
		}

		$scope.initDefend = function() {
			if (!$('.pair').length) {
				showDialog('No cards to defend against');
				return;
			}
			showDialog('Click on pair to defend against, then click on card to defend with');
			actions.setAction('defend', true);
			this.initAction = true;
		}

		$scope.initPass = function() {
			showDialog('Click cards to pass with, then select confirm or cancel');
			actions.setAction('pass', true);
			this.initAction = true;
		}

		$scope.initAttack = function() {
			showDialog('Click cards to attack with, then select confirm or cancel');
			actions.setAction('attack', true);
			this.initAction = true;
		}

		$scope.initWin = function() {
			showDialog('Select confirm or cancel');
			actions.setAction('win', true);
			this.initAction = true;
		}

		$scope.initSurrender = function() {
			showDialog('Select confirm or cancel');
			actions.setAction('surrender', true);
			this.initAction = true;
		}

		$scope.initSwap = function() {
			showDialog('Click card to swap for the trump, then select confirm or cancel');
			actions.setAction('swap', true);
			this.initAction = true;
		}

		$scope.isAttDef = function(username) {
			if (game.isAttacker(username))
				return 'attacker';
			if (game.isDefender(username))
				return 'defender';
			return '';
		}

		this.range = 0;
		this.tick = 1;
		this.ticks = 1;
		this.initTicks = false;
		$scope.tickArray = [];

		this.getTicks = function() {
			this.range = Math.ceil($('#player-container').width() / 211);
			if (this.range)
				this.ticks = Math.ceil(game.getGameItem('playerHand').cards.length / this.range);
			else {
				this.ticks = 1;
				this.range = 1;
			}
			while ($scope.tickArray.length > this.ticks) {
				$scope.tickArray.pop();
			}
			while ($scope.tickArray.length < this.ticks) {
				$scope.tickArray.push(null);
			}
			if (this.tick > this.ticks) {
				this.focusTick(0)
			}
			return $scope.tickArray;
		}

		this.focusTick = function(index) {
			this.tick = ++index;
		}

		$(window).scroll(function(){
			var leftVal = $(this).scrollLeft() + 255;
			if (leftVal + $('#player-container').width() > $('#content').width())
				leftVal = $('#content').width() - $('#player-container').width() + 255;
			if (leftVal > 0) {
		    $('#player-container').css({'left': leftVal});
		    ctrl.getTicks();
		    ctrl.focusTick(ctrl.tick - 1);
			} 

			if ($(this).scrollLeft() > 25)
				$('#sidebar').hide();
			else
				$('#sidebar').show();
		});

		$scope.getTick = function(index) {
			if (++index == ctrl.tick) {
				return '●';
			}
			return '○';
		}

		$scope.leftShift = function() {
			if (!(--ctrl.tick))
				ctrl.tick = ctrl.ticks;
		}

		$scope.rightShift = function() {
			ctrl.tick = ++ctrl.tick % ctrl.ticks;
			if (!ctrl.tick)
				ctrl.tick = ctrl.ticks;
		}

		this.showCard = function(index) {
			index++;
			var checkLower = true;
			if (this.tick - 1)
				checkLower = (this.tick - 1) * this.range < index;
			return checkLower && this.tick * this.range >= index;
		}
	}]).
	controller('roomController', ['$scope', 'room', function($scope, room) {
		$scope.username = room.getUsername();
		$scope.room = room.getRoom();
		$scope.rooms= room.getRooms();

		$scope.$watch(room.getUsername, function(newUser) {
			$scope.username = newUser;
		});

		$scope.$watch(room.getRoom, function(newRoom) {
			$scope.room = newRoom;
		});

		$scope.$watch(room.getRooms, function(rooms) {
			$scope.rooms = rooms;
		});

		this.setRoom = function(room) {
			room.setRoom(room);
		}
	}]).
	controller('chatController', ['$scope', 'chat', function($scope, chat) {
		$scope.sendMessage = function() {
			if ($scope.text) {
				chat.setMessage($scope.text);
				$scope.text = '';
			}
		}
	}]);