var Roomba = require('../roomba.js').Roomba

var bot = new Roomba({
    sp: { path: '/dev/ttyAMA0', options: { baudrate: 57600 }}
});

bot.once('ready', function () {
	console.log('spinning up');
	bot.send({ cmd: 'DRIVE', data: [500, -1] });
	setTimeout(function () {
		console.log('stopping spin');
		bot.send({ cmd: 'DRIVE', data: [0, -1] });
	}, 2000);
});
