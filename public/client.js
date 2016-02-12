/*connection*/
$('#setup-form').submit(function() {
	username = $('#username').val();
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

	if (canSubmit && $('#num-players').is(':visible')) {
		console.log(roomName, players, rules, deck);
		socket.emit('create game', username, roomName, players, rules, deck);
	} else {
		if (canSubmit) {
			socket.emit('join game', username, roomName);
		}
	}
	return false;
});

$('#rooms-container').on('click', '.room', function() {
	$(this).addClass('selected');
});

socket.on('spectate', function() {
	$('#actions-container').hide();
	$('#player-container').hide();
	// make spectate more interesting?
});

socket.on('replace user', function(toReplace, replacement) {
	replaceUser(toReplace, replacement);
});

socket.on('online update', function(players, numPlayers) {
	$('#players-container').hide();
	for (var player of players) {
    	var name = player.name;
    	if (username != name && $('#' + name).length == 0)
	    	$('#players-container').append('<div class="player"><span class="player-name" id="name-' + name + '">' + name + '</span> <span class="num-cards" id="num-' + name + '">0</span><div class="player-hand" id="' + name + '"></div></div>');
  	}
  	$('#players-container').show();
/*  	$('#num-players').text(numPlayers - players.length);
  	$('#total-players').text(numPlayers);
  	if (players.length == numPlayers) {
  		$('#content').show();
  	}*/
});

/*Chat stuff*/

var chatAudio = document.createElement('audio');
/*chatAudio.setAttribute('src', 'DING.wav');*/

function myMessage(message) {
  $('#messages').append($('<li>').html(message));
  $('#messages').animate({
  scrollTop: $('#messages').get(0).scrollHeight}, 2000);
  //chatAudio.play();
}

$('#chat-form').submit(function() {
  myMessage('<span>Me:</span> ' + $('#message').val());
  socket.emit('chat message', $('#message').val());
  $('#message').val('');
  return false;
});

socket.on('chat message', function(message){
  myMessage(message);
});

/*game updates*/

socket.on('game', function(gameInfo, init) {
	if (!init) {
		myMessage('<span>Server:</span> Querying server for game...');
		showDialog('Reloading game from server...');
	}

	$('.player-hand').children().remove();

	for (var player of gameInfo.players) {
		drawCards(player.name, player.cards);
	}

	console.log(gameInfo.trump);

	$('#trump-container .cards').hide();
	$('#' + gameInfo.trump).appendTo('#trump-container');
	trumpSuit = gameInfo.trump.split('-')[2];

	setTimeout(function() {
		focusCard(0);
		$('.focus').removeClass('focus');
	}, 1000);

	socket.emit('ready', init);

/*	for (var cardName of gameInfo.deck) {
		$('#' + cardName).appendTo('#cards-container');
	}

	for (var cardName of gameInfo.discards) {
		$('#' + cardName).appendTo('#cards-container');
	}*/
});

socket.on('swap trump', function(player, card) {
	if (username == player)
		$('#trump-container .cards').appendTo('#player-container');
	else
		$('#trump-container .cards').appendTo('#cards-container');
	$('#' + card).appendTo('#trump-container');
	$('#swap').hide();
});

socket.on('pass', function(oldDefender, cards) {
	for (var card of cards) {
		removePlayerCard(oldDefender);
		attackPair(card, $('.pair').length);		
	}
});

socket.on('defend', function(defender, card, pairId) {
	checkWinGame();
	removePlayerCard(defender);
	defendPair(card, pairId);
});

socket.on('init attack', function(attacker, cards) {
	for (var card of cards) {
		removePlayerCard(attacker);
		if (username != attacker)
			attackPair(card, $('.pair').length);
	}
});

socket.on('attack', function(attacker, succeeded, failed) {
	for (var card of succeeded) {
		removePlayerCard(attacker);
		if (username != attacker)
			attackPair(card, $('.pair').length);
	}
	if (failed.length != 0 && username == attacker) {
		console.log(failed);
		showDialog('Cannot attack with these. Clearing in 2 seconds.');
		setTimeout(function() {
			tempWithdraw();
		}, 2000);
	}
});

socket.on('surrender', function(defender, drawnCards, hasNoTrump, deckCards) {
	clearDialog();
	setDeckCards(deckCards);
	discardPairs(false, defender);
	for (var card of drawnCards) {
		drawCards(card[0], card[1]);
	}
	if (hasNoTrump && $('#trump-container .cards').length == 0) {
		var suitAscii = "";
		switch (trumpSuit) {
			case 'Clubs':
				suitAscii = "&#9827";
				break;
			case 'Spades':
				suitAscii = "&#9824";
				break;
			case 'Hearts':
				suitAscii = "&#9829";
				break;
			case 'Diamonds':
				suitAscii = "&#9830";
				break;
			default:
				break;
		}
		$('#trump-container').append('<div class="trump ' + trumpSuit.toLowerCase() + '">' + suitAscii + '</div>');
	}
	focusCard(0);
});

socket.on('dump phase', function(defender, time) {
	showDumpTimer(time);
	if (username == defender) {
		showDialog('You have surrendered. Other players will now attack with ' +
			'any cards on the field');
		return;
	}
	showDialog(defender + ' has surrendered. Attack them with any cards on the ' +
		'field and they must take it.');
});

socket.on('draw', function(drawnCards, hasNoTrump, deckCards) {
	setDeckCards(deckCards);
	console.log(drawnCards);
	for (var card of drawnCards) {
		drawCards(card[0], card[1]);
	}
	$('.pair').remove();
	if (hasNoTrump && $('#trump-container .cards').length == 0) {
		var suitAscii = "";
		switch (trumpSuit) {
			case 'Clubs':
				suitAscii = "&#9827";
				break;
			case 'Spades':
				suitAscii = "&#9824";
				break;
			case 'Hearts':
				suitAscii = "&#9829";
				break;
			case 'Diamonds':
				suitAscii = "&#9830";
				break;
			default:
				break;
		}
		$('#trump-container').append('<div class="trump ' + trumpSuit.toLowerCase() + '">' + suitAscii + '</div>');
	}
	focusCard(0);
});

socket.on('discard', function() {
	discardPairs(true);
});

socket.on('turn', function(attacker, defender, deckCards) {
	if (typeof(deckCards) !== 'undefined')
		setDeckCards(deckCards);
	showAttacker(attacker);
	showDefender(defender);
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