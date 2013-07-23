var Writable = require('stream').Writable;
var util = require('util');
var roi = require('./roi.js');

function SensorDecoder(group) {
	Writable.call(this);
	this._buf = null;
	this._mode = 'passive';
};

util.inherits(SensorDecoder, Writable);

SensorDecoder.prototype._write = function _write(buf, encoding, cb) {

	if (this._buf) {
		var len = this._buf.length + buf.length;
		buf = Buffer.concat([this._buf, buf], len);
	}

	while (buf.length >= roi.SENSOR_PKT_LEN) {
		var pkt = buf.slice(0, roi.SENSOR_PKT_LEN);

		var msg = roi.decode_sensors(pkt);
		this.emit('sense', msg);
	
		buf = buf.slice(roi.SENSOR_PKT_LEN);
	}

	if (buf.length > 0) {
		this._buf = buf;
	} else {
		this._buf = null;
	}
	cb();
};

module.exports = {
	SensorDecoder: SensorDecoder
}
