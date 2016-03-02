module.exports = function(socket) {
  function getClients(roomId) {
    var res = [],
        room = GLOBAL.io.sockets.adapter.rooms[roomId].sockets;
    if (room) {
      for (var id in room) {
        res.push(GLOBAL.io.sockets.adapter.nsp.connected[id]);
      }
    }
    return res;
  }

	function getInfo(info, username) {
    var newInfo = {};
		var players = [];
		for (var player of info.players) {
			if (username !== player.name) {
				players.push({name: player.name, cards: Array.apply(null, {length: player.cards.length}).map(Number.call, Number)});
			} else {
				newInfo.playerHand = player;
			}
		}
		newInfo.players = players;
		newInfo.deck = info.deck.length;
		newInfo.discards = info.discards.length;
    newInfo.trump = info.trump;
    newInfo.pairs = info.pairs;
		return newInfo;
	}

	function sendGameInfo(gameRoom) {
    var info = GLOBAL.games.get(gameRoom).getGameInfo();
		for (var socket of getClients(gameRoom)) {
			socket.emit('game info', getInfo(info, socket.username), true);
		}
	};

  socket.gameRoom = null;

  // send room data
  socket.on('fetch rooms', function() {
  	console.log('received fetch');
    var roomsList = [];
    for (var room of GLOBAL.rooms)
      roomsList.push(room);
  	console.log('rooms', roomsList);
    socket.emit('room list', roomsList);
  });

  // create a new room and associated game
  socket.on('create room', function(data) {
    var user = data[0], roomId = data[1], _players = data[2], _rules = data[3], _deck = data[4];
    console.log('create room request received');
    if (roomList.indexOf(roomId) == -1) {
      socket.username = user;
      socket.hasSurrendered = false;
      GLOBAL.roomList.push(roomId);
      GLOBAL.rooms.set(roomId, {users: [socket.username], players: _players, rules: _rules, deck: _deck});
      socket.join(roomId);
      socket.gameRoom = roomId;
      GLOBAL.games.set(roomId, new Durak(6, _deck));

      socket.emit('init game');
      socket.emit('chat message', '<span>Server:</span> Connected to Server. Welcome to the room!');
    } else
      socket.emit('create room', 'Room already created');
  });

  // add user to room
  socket.on('join room', function(data) {
  	var user = data[0], roomId = data[1];
    if (GLOBAL.roomList.indexOf(roomId) != -1) {
      var room = GLOBAL.rooms.get(roomId);
      socket.username = user;
      socket.hasSurrendered = false;

      if (room.users.indexOf(user) !== -1) {
        socket.emit('username');
        socket.emit('join room', false);
        return;
      }

      if (room.users.length < room.players) {
        socket.join(roomId);
        socket.gameRoom = roomId;
        room.users.push(socket.username);

        var game = GLOBAL.games.get(roomId);
        if (game.players.size) {
          var toReplace = null;
          for (var player of game.players) {
            if (room.users.indexOf(player[0]) == -1) {
              toReplace = player[0];
              break;
            }
          }
          var players = GLOBAL.games.get(roomId).round.players;
          var game = GLOBAL.games.get(roomId);
          var oldPlayer = game.players.get(toReplace);
          oldPlayer.name = user;
          game.players.addItem(user, oldPlayer);
          game.players.removeItem(toReplace);
          console.log('game players name', GLOBAL.games.get(roomId).players.getItem(user).name);
          players[players.indexOf(toReplace)] = user;
          console.log('round players name', GLOBAL.games.get(roomId).round.players);

          var players = [];
          for (var player of room.users) {
            players.push({name: player});
          }
          socket.emit('online update', players);

          socket.emit('init game');
          socket.emit('chat message', '<span>Server:</span> Connected to Server. Welcome to the room!');

          socket.emit('game info', getInfo(game.getGameInfo(), socket.username), true);
        } else {

          var players = [];
          for (var player of room.users) {
            players.push({name: player});
          }
          GLOBAL.io.to(roomId).emit('online update', players);

          socket.emit('init game');
          socket.emit('chat message', '<span>Server:</span> Connected to Server. Welcome to the room!');
          socket.broadcast.to(socket.gameRoom).emit('chat message', '<span>Server:</span> ' + socket.username + ' has connected');

          if (room.users.length == room.players) {
            var game = GLOBAL.games.get(roomId);
            game.initPlayers(room.users);
            sendGameInfo(socket.gameRoom);
          }
        }
      }
      else {
        console.log('full room');
        socket.emit('join game', 'Room is full');
      }
    }
    else {
      console.log('join failed');
      console.log('room', roomId, 'roomList', GLOBAL.roomList);
      socket.emit('join game', 'Room not found');
    }
  });

  // not implemented
	socket.on('spectate', function() {
    var game = GLOBAL.games.get(socket.gameRoom);
    socket.emit('game', game.getGameInfo(), false);
  });

  // handle disconnections
  socket.on('disconnect', function(){
    if (socket.gameRoom == null) {
      return;
    }

    var room = GLOBAL.rooms.get(socket.gameRoom);
    room.users.splice(room.users.indexOf(socket.username), 1);

    if (room.users.length) {
      // handle single game d/c
      GLOBAL.io.to(socket.gameRoom).emit('chat message', '<span>Server:</span> ' + socket.username + ' has disconnected');
      GLOBAL.io.to(socket.gameRoom).emit('disconnected', socket.username);
    } else {
      rooms.delete(socket.gameRoom);
      roomList.splice(roomList.indexOf(socket.gameRoom), 1);
      games.delete(socket.gameRoom);
    }
  });

  // handle room chat
	socket.on('chat message', function(msg){
    socket.broadcast.to(socket.gameRoom).emit('chat message', '<span>' + socket.username + ':</span> ' + msg);
  });

  // all below must be added to another game module

  // initialize game on readystate
  socket.on('ready', function(init) {
    var game = GLOBAL.games.get(socket.gameRoom);
    if (init)
      socket.emit('turn', game.round.attacker.name, game.round.defender.name, game.deck.numItems);
    else
      socket.emit('chat message', '<span>Server:</span> Game reloaded. If' +
                  ' further problems please reload the page');
  });

  socket.on('swap trump', function(cardName) {
    console.log(cardName);
    var game = GLOBAL.games.get(socket.gameRoom);
    var player = game.players.getItem(socket.username);
    var card = game.findItems([cardName], [player]).top();
    if (!card)
      socket.emit('game info', getInfo(game.getGameInfo(), socket.username));
    else if (game.swapTrump(player, card)) {
      sendGameInfo(socket.gameRoom);
		}
    else
      socket.emit('cancel', 'swap', 'Swap failed');
  });

  // pass cards to new defender
  socket.on('pass', function(passCardsNames) {
    var game = GLOBAL.games.get(socket.gameRoom);
    if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
      var passCards = game.findItems(passCardsNames, [game.players.getItem(socket.username)]);
      console.log(passCardsNames);
      console.log(passCards);
      if (game.round.pass(passCards)) {
      	sendGameInfo(socket.gameRoom);
        GLOBAL.io.to(socket.gameRoom).emit('turn', game.round.attacker.name, game.round.defender.name);
      } else
        socket.emit('cancel', 'pass', 'Can only pass on initial attack and' + 
          ' must be same rank as attack');
    } else
      socket.emit('cancel', 'pass', 'Not defender');
  });

  // defend attack
  socket.on('defend', function(data) {
    console.log('defend client sent', data);
    var defend = data[0], pairId = data[1];
    var game = GLOBAL.games.get(socket.gameRoom);
    if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
        var pair = game.round.pairs[pairId];
        console.log('pairs', game.round.pairs);
        console.log('pair', pair, 'pairId', pairId);
        var defendCard = game.findItems([defend], [game.round.defender]).top();
        if (defendCard && pair.addDefend(defendCard)) {
          socket.emit('defend');
          sendGameInfo(socket.gameRoom);
          if (game.hasWon(game.round.defender)) // has
            GLOBAL.io.to(socket.gameRoom).emit('end game', socket.username);
        } else
          socket.emit('cancel', 'defend', 'Card must be greater rank of same' + 
            ' suit, a trump, or a greater trump');
    } else
      socket.emit('cancel', 'defend', 'Not defender');
  });

  // initialize round attack
  socket.on('init attack', function(attackCards) {
    var game = GLOBAL.games.get(socket.gameRoom);
    console.log('client sent', attackCards);
    var cards = game.findItems(attackCards, [game.round.attacker]), round = game.round;
    console.log(round.attacker);
    if (socket.username == round.attacker.name) {
      if (round.initAttack(cards)) {
      	sendGameInfo(socket.gameRoom);
        if (game.hasWon(round.attacker))
          GLOBAL.io.to(socket.gameRoom).emit('end game', socket.username);
      }
      else
        socket.emit('cancel', 'attack', 'Cards must be of same rank');
    } else
      socket.emit('cancel', 'attack', 'Not attacker');
  });

  // attack from any attacker
  socket.on('attack', function(attackCards) {
    var game = GLOBAL.games.get(socket.gameRoom);
    console.log(socket.username, 'attacked');
  	if (socket.username != game.round.defender.name) {
      if (socket.username == game.round.attacker.name) {
        var presentAttacks = [];
        for (var pair of game.round.pairs) {
          presentAttacks.push(pair.getAttack().name);
        }
      }
      var player = game.players.getItem(socket.username);
	  	var attack = game.findItems(attackCards, [player]);
	  	var success = [], fail = [];
	  	for (var card of attack) {
        	console.log(card);
	  		if (card.container == player && game.round.addPair(card, false)) {
	  			success.push(card.name);
	  		} else {
	  			fail.push(card.name);
	  		}
	  	}
	  	socket.emit('attack', fail);
      if (success) {
        sendGameInfo(socket.gameRoom);
      }
      if (game.hasWon(player))
        GLOBAL.io.to(socket.gameRoom).emit('end game', socket.username);
	  } else
      socket.emit('cancel', 'attack', "Can't attack yourself");
  });

  // win round
  socket.on('win', function() {
    var game = GLOBAL.games.get(socket.gameRoom);
  	if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
      if (game.round.win()) {
        GLOBAL.io.to(socket.gameRoom).emit('discard');
        game.round.newRound(true);
        sendGameInfo(socket.gameRoom);
        GLOBAL.io.to(socket.gameRoom).emit('turn', game.round.attacker.name, game.round.defender.name);
      } else {
        socket.emit('cancel', 'win', 'Not all pairs defended');
      }
  	} else 
      socket.emit('cancel', 'win', 'Not defender');
  });

  // surrender round
  socket.on('surrender', function() {
    var game = GLOBAL.games.get(socket.gameRoom);
  	if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
  		if (!game.round.checkWin()) {
        socket.hasSurrendered = true;
        GLOBAL.io.to(socket.gameRoom).emit('dump phase', socket.username, 13000);
        setTimeout(function() {
          game.round.surrender();
          game.round.newRound(false);
          sendGameInfo(socket.gameRoom);
          GLOBAL.io.to(socket.gameRoom).emit('turn', game.round.attacker.name, game.round.defender.name, game.deck.numCards);
          socket.hasSurrendered = false;
        }, 15000);
        
  		} else
        socket.emit('cancel', 'surrender', "Don't sabotage yourself: press win");
    } else
      socket.emit('cancel', 'surrender', 'Not defender');
  });

  // win the game
  socket.on('end game', function() {
    var game = GLOBAL.games.get(socket.gameRoom);
    if (game.hasWon(game.players.getItem(socket.username))) {
      GLOBAL.io.to(socket.gameRoom).emit('end game', socket.username);
    }
    else
      socket.emit('game info', getInfo(game.getGameInfo(), socket.username), false);
  });
}