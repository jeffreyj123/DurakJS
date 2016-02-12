var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var server = app.listen(port);
var http = require('http');
var io = require('C:/Users/Jeffrey/AppData/Roaming/npm/node_modules/socket.io').listen(server);
var socketList = [];
var Game = require("./game_objects.js");

app.get('/', function(req, res) {
  res.sendfile('./public/game.html');
});

app.use('/public', express.static(__dirname + '/public'));

var roomList = [];
var rooms = new Map();
var games = new Map();

roomList.push('starter room');
rooms.set('starter room', {users: [], players: 2, rules: null, deck: "Quick"});
games.set('starter room', new Game('Quick'));

io.on('connection', function(socket){
  // set game room to placeholder
  socket.gameRoom = null;

  // send room data
  socket.on('fetch games', function() {
    var roomsList = [];
    for (var room of rooms)
      roomsList.push(room);
    socket.emit('room list', roomsList);
  });

  // create a new room and associated game
  socket.on('create game', function(user, roomId, _players, _rules, _deck) {
    console.log('request sent');
    if (roomList.indexOf(roomId) == -1) {
      socket.username = user;
      socket.hasSurrendered = false;
      roomList.push(roomId);
      rooms.set(roomId, {users: [socket.username], players: _players, rules: _rules, deck: _deck});
      socket.join(roomId);
      socket.gameRoom = roomId;
      games.set(roomId, new Game(_deck));

      socket.emit('init game');
      socket.emit('chat message', '<span>Server:</span> Connected to Server. Welcome to the room!');
    } else
      socket.emit('create game', 'Room already created');
  });

  // add user to room
  socket.on('join game', function(user, roomId) {
    if (roomList.indexOf(roomId) != -1) {
      var room = rooms.get(roomId);
      socket.username = user;
      socket.hasSurrendered = false;

      if (room.users.indexOf(user) !== -1) {
        socket.emit('username');
        socket.emit('join game', false);
        return;
      }

      if (room.users.length < room.players) {
        socket.join(roomId);
        socket.gameRoom = roomId;
        room.users.push(socket.username);

        var game = games.get(roomId);
        if (game.players.size) {
          var toReplace = null;
          for (var player of game.players) {
            if (room.users.indexOf(player[0]) == -1) {
              toReplace = player[0];
              break;
            }
          }
          var players = games.get(roomId).round.players;
          var game = games.get(roomId);
          var oldPlayer = game.players.get(toReplace);
          game.players.set(user, oldPlayer);
          game.players.get(user).name = user;
          game.players.delete(toReplace);
          console.log('game players name', games.get(roomId).players.get(user).name);
          players[players.indexOf(toReplace)] = user;
          console.log('round players name', games.get(roomId).round.players);

          var players = [];
          for (var player of room.users) {
            players.push({name: player});
          }
          socket.emit('online update', players, room.players);

          socket.emit('init game');
          socket.emit('chat message', '<span>Server:</span> Connected to Server. Welcome to the room!');

          socket.emit('game', game.getGameInfo(), true);
          socket.broadcast.to(roomId).emit('replace user', toReplace, socket.username)
        } else {

          var players = [];
          for (var player of room.users) {
            players.push({name: player});
          }
          io.to(roomId).emit('online update', players, room.players);

          socket.emit('init game');
          socket.emit('chat message', '<span>Server:</span> Connected to Server. Welcome to the room!');

          if (room.users.length == room.players) {
            var game = games.get(roomId);
            game.initPlayers(players);
            io.to(roomId).emit('game', game.getGameInfo(), true);
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
      socket.emit('join game', 'Room not found');
    }
  });

  // initialize game on readystate
  socket.on('ready', function(init) {
    var game = games.get(socket.gameRoom);
    if (init)
      socket.emit('turn', game.round.attacker.name, game.round.defender.name, game.deck.numCards);
    else
      socket.emit('chat message', '<span>Server:</span> Game reloaded. If' +
                  ' further problems select hard reset below or rejoin');
  });

  // not implemented
	socket.on('spectate', function() {
    var game = games.get(socket.gameRoom);
    socket.emit('game', game.getGameInfo(), false);
  });

  // handle disconnections
  socket.on('disconnect', function(){
    if (socket.gameRoom == null) {
      return;
    }

    var room = rooms.get(socket.gameRoom);
    room.users.splice(room.users.indexOf(socket.username), 1);

    if (room.users.length) {
      // handle single game d/c
      io.to(socket.gameRoom).emit('chat message', '<span>Server:</span> ' + socket.username + ' has disconnected');
      io.to(socket.gameRoom).emit('disconnected', socket.username);
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

  /* game handlers */

  // swap trump
  socket.on('swap trump', function(cardName) {
    var game = games.get(socket.gameRoom);
    var player = game.players.get(socket.username);
    var card = game.findCards([cardName]).values().next().value;
    if (card.deck != player.hand)
      socket.emit('game', game.getGameInfo(), false);
    if (game.swapTrump(player, card))
      io.to(socket.gameRoom).emit('swap trump', socket.username, cardName);
    else
      socket.emit('cancel', 'swap', 'Swap failed');
  });

  // pass cards to new defender
  socket.on('pass', function(passCardsNames) {
    var game = games.get(socket.gameRoom);
    if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
      var passCards = game.findCards(passCardsNames);
      console.log(passCardsNames);
      console.log(passCards);
      if (game.round.pass(passCards)) {
        io.to(socket.gameRoom).emit('pass', socket.username, passCardsNames);
        io.to(socket.gameRoom).emit('turn', game.round.attacker.name, game.round.defender.name);
      } else
        socket.emit('cancel', 'pass', 'Can only pass on initial attack and' + 
          ' must be same rank as attack');
    } else
      socket.emit('cancel', 'pass', 'Not defender');
  });

  // defend attack
  socket.on('defend', function(defend, pairId) {
    var game = games.get(socket.gameRoom);
    if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
        var pair = game.round.pairs[pairId];
        console.log('pairs', game.round.pairs);
        console.log('pair', pair, 'pairId', pairId);
        var defendCard = game.findCards([defend]).values().next().value;
        if (pair.addDefend(defendCard)) {
          io.to(socket.gameRoom).emit('defend', socket.username, defend, pairId);
          if (game.round.defender.hasWon())
            io.to(socket.gameRoom).emit('end game', socket.username);
        } else
          socket.emit('cancel', 'defend', 'Card must be greater rank of same' + 
            ' suit, a trump, or a greater trump');
    } else
      socket.emit('cancel', 'defend', 'Not defender');
  });

  // initialize round attack
  socket.on('init attack', function(attackCards) {
    var game = games.get(socket.gameRoom);
    console.log('client sent', attackCards);
    var cards = game.findCards(attackCards), round = game.round;
    console.log(game.round.attacker.hand);
    if (socket.username == round.attacker.name) {
      if (round.initAttack(cards)) {
        io.to(socket.gameRoom).emit('attack', socket.username, attackCards, []);
        if (game.round.attacker.hasWon())
          io.to(socket.gameRoom).emit('end game', socket.username);
      }
      else
        socket.emit('cancel', 'attack', 'Cards must be of same rank');
    } else
      socket.emit('cancel', 'attack', 'Not attacker');
  });

  // attack from any attacker
  socket.on('attack', function(attackCards) {
    var game = games.get(socket.gameRoom);
    console.log(socket.username, 'attacked');
  	if (socket.username != game.round.defender.name) {
      if (socket.username == game.round.attacker.name) {
        var presentAttacks = [];
        for (var pair of game.round.pairs) {
          presentAttacks.push(pair.attack.name);

        }
      }
	  	var attack = game.findCards(attackCards);
	  	var success = [], fail = [];
      var player = game.players.get(socket.username);
	  	for (var card of attack) {
        console.log(card[1]);
	  		if (card[1].deck == player.hand && game.round.addPair(card[1], false)) {
	  			success.push(card[0]);
	  		} else {
	  			fail.push(card[0]);
	  		}
	  	}
	  	io.to(socket.gameRoom).emit('attack', socket.username, success, fail);
      if (player.hasWon())
        io.to(socket.gameRoom).emit('end game', socket.username);
	  } else
      socket.emit('cancel', 'attack', "Can't attack yourself");
  });

  // win round
  socket.on('win', function() {
    var game = games.get(socket.gameRoom);
  	if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
      if (game.round.win()) {
        io.to(socket.gameRoom).emit('discard');
        if (game.trump.numCards == 0)
          io.to(socket.gameRoom).emit('draw', game.round.newRound(true), true, game.deck.numCards);
        else
          io.to(socket.gameRoom).emit('draw', game.round.newRound(true), false, game.deck.numCards);
        io.to(socket.gameRoom).emit('turn', game.round.attacker.name, game.round.defender.name);
      } else {
        socket.emit('cancel', 'win', 'Not all pairs defended');
      }
  	} else 
      socket.emit('cancel', 'win', 'Not defender');
  });

  // surrender round
  socket.on('surrender', function() {
    var game = games.get(socket.gameRoom);
  	if (socket.username == game.round.defender.name && !socket.hasSurrendered) {
  		if (!game.round.checkWin()) {
        socket.hasSurrendered = true;
        io.to(socket.gameRoom).emit('dump phase', socket.username, 13000);
        setTimeout(function() {
          game.round.surrender();
          if (game.trump.numCards == 0)
            io.to(socket.gameRoom).emit('surrender', socket.username, game.round.newRound(false), true, game.deck.numCards);
          else
            io.to(socket.gameRoom).emit('surrender', socket.username, game.round.newRound(false), false, game.deck.numCards);
          io.to(socket.gameRoom).emit('turn', game.round.attacker.name, game.round.defender.name);
          socket.hasSurrendered = false;
        }, 15000);
        
  		} else
        socket.emit('cancel', 'surrender', "Don't sabotage yourself: press win");
    } else
      socket.emit('cancel', 'surrender', 'Not defender');
  });

  // win the game
  socket.on('end game', function() {
    var game = games.get(socket.gameRoom);
    if (game.players.get(socket.username).hasWon()) {
      io.to(socket.gameRoom).emit('end game', socket.username);
    }
    else
      socket.emit('game', getGameInfo(), false);
  });
});