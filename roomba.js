var util = require('util');
var s2 = require('s2serial');
var EventEmitter = require('events').EventEmitter;
var CommandEncoder = require('./protocol/cmd_encoder.js').CommandEncoder;
var SensorDecoder = require('./protocol/sensor_decoder.js').SensorDecoder;

function Roomba(conf) {
	var self = this;
	EventEmitter.call(this);

	this._sp = new s2.S2Serial(conf.sp.path, conf.sp.options);
	this._encoder = new CommandEncoder();
	this._decoder = new SensorDecoder();

	this._sp.once('open', function () {
		self._encoder.pipe(self._sp);
		self._sp.pipe(self._decoder);

		// put roomba into SAFE state
		self._encoder.send({ cmd: 'START', data: [] });
		setTimeout(function () {
			self._encoder.send({ cmd: 'CONTROL', data: [] });
			self.emit('ready');
		}, 20);

		setInterval(function () {
			self._encoder.send({ cmd: 'SENSORS', data: [0] });
		}, conf.update_freq || 1000);
	});

	this._decoder.on('sense', function (msg) {
		self.emit('sense', msg);
	});
};

util.inherits(Roomba, EventEmitter);

Roomba.prototype.send = function send(obj) {
	this._encoder.send(obj);
};

module.exports = {
	Roomba: Roomba
}
