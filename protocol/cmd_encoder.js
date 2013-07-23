var Readable = require('stream').Readable;
var util = require('util');
var roi = require('./roi.js');

function CommandEncoder() {
	Readable.call(this);
	this._outbox = [];
};

util.inherits(CommandEncoder, Readable);

CommandEncoder.prototype.send = function (cmd) {
	// cmd is an object describing the ROI command to be sent
	this._outbox.push(roi.encode_cmd(cmd));
	this.read(0);
};

CommandEncoder.prototype._read = function (n) {
	if (this._outbox.length == 0) {
		this.push('');
	}

	while (this._outbox.length > 0) {
		var chunk = this._outbox.shift();
		if (!this.push(chunk))
			break;
	}
};

module.exports = {
	CommandEncoder: CommandEncoder
}
