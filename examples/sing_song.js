var Roomba = require('../roomba.js').Roomba

var bot = new Roomba({
    sp: { path: '/dev/ttyAMA0', options: { baudrate: 57600 }}
});

bot.once('ready', function () {
	bot.send({ cmd: 'SONG', data:
	    [ 1, 6, 62, 30, 64, 30, 65, 160, 64, 50, 60, 50, 53, 120] });
	bot.send({ cmd: 'PLAY', data: [1] });
});
