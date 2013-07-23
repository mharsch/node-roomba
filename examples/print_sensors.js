var Roomba = require('../roomba.js').Roomba
var util = require('util');

var bot = new Roomba({
    sp: { path: '/dev/ttyAMA0', options: { baudrate: 57600 }},
    update_freq: 2000 // poll sensors every 2 seconds
});

bot.once('ready', function () {
	bot.on('sense', function (msg) {
		console.log('sensor data: ' + util.inspect(msg));
	});
});
