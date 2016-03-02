/* Dom Manipulation Helper functions */

function showDefender(isDefender) {
	if (isDefender) {
		$('.defend-option').show();
		$('.attack-option').hide();
		showDialog('You are defending');
	} else {
		$('.defend-option').hide();
		$('.attack-option').show();
	}
}

function showAttacker(isAttacker) {
	if (isAttacker) {
		showDialog('You are attacking');
	}
}

function chooseDefend() { // add to game controller
	defendCard = pairFocus % $('.pair').length;
	if (defendCard < 0)
		defendCard += $('.pair').length;
	defendId = $('.pair').eq(defendCard).children().first().attr('id');
	showDialog('Select card to defend with (left, right arrows) then press enter', 'Backspace to cancel');
	findDefend();
	selectCard();
}

function checkRank(rank1, rank2) {
	var ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
	return ranks.indexOf(rank1) < ranks.indexOf(rank2);
}

function showDialog() {
	clearDialog();
	for (var mess of arguments)
		$('#dialogMess').append('<span>' + mess + '</span>');
}

function clearDialog() {
	$('#dialogMess').html('');
}

function superWinAnimation(winner) { // all dependencies on username should be within controller
	// make something fun
	// probably want to make a modal dialog that allows play again options
	alert(winner + ' has won!');
	if (username == winner)
		showDialog('Winner winner, chicken dinner');
	else
		showDialog(winner + ' has won!!!!!! You lose!!!!');
}

function showDumpTimer(time) {
	$('#timer').text(time / 1000);
	$('#timer').show();
	if (time <= 0) {
		$('#timer').hide();
		setTimeout(function() {
			$('#timer').text(15);
		}, 1000)
		return;	
	}
	setTimeout(function() {
		showDumpTimer(time - 1000);
	}
	, 1000);
}

function setupGame(create) {
	if (!create) {
		$('.create').hide();
		$('#room-name').val($('.selected .name').eq(0).text());
	}
	$('#connect-container').hide();
	$('#setup-container').show();
}

function setupDialog(option) {
	if (typeof(option) !== 'undefined') {
		$('#setup-form li').hide();
		$('#' + option).show();
	}
}