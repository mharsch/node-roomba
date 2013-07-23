var Roomba = require('../roomba.js').Roomba

var bot = new Roomba({
    sp: { path: '/dev/ttyAMA0', options: { baudrate: 57600 }},
    update_freq: 200
});

bot.once('ready', function () {
	console.log('spinning up');
	bot.send({ cmd: 'DRIVE', data: [500, -1] });
});

bot.on('sense', function (sensors) {
	if (sensors.bump.right || sensors.bump.left) {
		console.log('bump detected');
		// stop spinning
		bot.send({ cmd: 'DRIVE', data: [0, -1] });
	}
});
