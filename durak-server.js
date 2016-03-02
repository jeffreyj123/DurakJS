var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var server = app.listen(port);
var http = require('http');
GLOBAL.io = require('C:/Users/Jeffrey/AppData/Roaming/npm/node_modules/socket.io').listen(server);
GLOBAL.Durak = require("./Game_Objects/Durak.js");

app.get('/', function(req, res) {
  res.sendfile('./durak-rooms.html');
});

app.use('/public', express.static(__dirname + '/public'));

GLOBAL.roomList = [];
GLOBAL.rooms = new Map();
GLOBAL.games = new Map();

GLOBAL.roomList.push('starter room');
GLOBAL.rooms.set('starter room', {users: [], players: 2, rules: null, deck: "Quick"});
GLOBAL.games.set('starter room', new Durak(6, 'Quick'));

GLOBAL.io.sockets.on('connection', require('./routes/socket'));