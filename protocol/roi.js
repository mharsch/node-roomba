var assert = require('assert');

var commands = {
	// CMD: [OPCODE, MAX_LEN]
	START: [0x80, 1],
	BAUD: [0x81, 2],
	CONTROL: [0x82, 1],
	SAFE: [0x83, 1],
	FULL: [0x84, 1],
	POWER: [0x85, 1],
	SPOT: [0x86, 1],
	CLEAN: [0x87, 1],
	MAX: [0x88, 1],
	DRIVE: [0x89, 5],
	MOTORS: [0x8A, 2],
	LEDS: [0x8B, 4],
	SONG: [0x8C, 35],
	PLAY: [0x8D, 2],
	SENSORS: [0x8E, 2],
	DOCK: [0x8F, 1]
}

// naive implementation assuming all sensor groups are requested every time
SENSOR_PKT_LEN = 26;

var masks = {
	bump_wheeldrop: {
		BUMP_RIGHT: 0x01,
		BUMP_LEFT: 0x02,
		WHEELDROP_RIGHT: 0x04,
		WHEELDROP_LEFT: 0x08,
		WHEELDROP_CASTER: 0x10
	},
	motor_overcurrent: {
		SIDEBRUSH: 0x01,
		VACUUM: 0x02,
		MAINBRUSH: 0x04,
		DRIVE_RIGHT: 0x08,
		DRIVE_LEFT: 0x10
	},
	buttons: {
		MAX: 0x01,
		CLEAN: 0x02,
		SPOT: 0x04,
		POWER: 0x08
	}
}

function encode_cmd(obj) {
	// takes an object and returns a Buffer.
	// obj contains 'cmd' and 'data'
	// where 'cmd' matches one of 'commands' keys and
	// 'data' is an array of (Number) arguments

	// add check that obj.cmd is a key of commands

	var opcode = commands[obj.cmd][0];
	var maxlen = commands[obj.cmd][1];
	var data = obj.data || [];
	var buf = new Buffer(maxlen);
	var pos = 0;

	buf.writeUInt8(opcode, pos); pos += 1;

	switch (obj.cmd) {
	case ('START'):
	case ('CONTROL'):
	case ('SAFE'):
	case ('FULL'):
	case ('POWER'):
	case ('SPOT'):
	case ('CLEAN'):
	case ('MAX'):
	case ('DOCK'):
		break;
	case ('BAUD'):
		assert(0 <= data[0] <= 11, 'baud code within range');
		buf.writeUInt8(data[0], pos); pos += 1;
		break;
	case ('DRIVE'):
		var velocity = data[0];
		assert(-500 <= velocity <= 500,
		    'velocity within range');

		var direction = data[1];
		assert((-2000 <= direction <= 2000) || // turn on a radius
		    (direction == 32786), // straight
		    'direction value is valid');
		// direction == 1 means spin counter-clockwise
		// direction == -1 means spin clockwise

		buf.writeInt16BE(velocity, pos); pos += 2;

		if (direction == 32768) {
			buf.writeUInt16BE(direction, pos); pos += 2;
		} else {
			buf.writeInt16BE(direction, pos); pos += 2;
		}
		break;
	case ('MOTORS'):
		// data[0] - data[2] are side brush, vacuum, and main brush
		// respectively where falsy indicates 'off' and
		// truthy indicates 'on'

		var motor_byte = 0x00;
		if (data[0]) motor_byte |= 0x01;
		if (data[1]) motor_byte |= 0x02;
		if (data[2]) motor_byte |= 0x04;

		buf.writeUInt8(motor_byte, pos); pos += 1;
		break;
	case ('LEDS'):
		// data[0] through data[5] are 0 or 1 for led on/off
		// dirt detect(0), max(1), clean(2), spot(3), status_red(4),
		// status_green(5)

		var led_byte = 0x00;
		if (data[0]) led_byte |= 0x01;
		if (data[1]) led_byte |= 0x02;
		if (data[2]) led_byte |= 0x04;
		if (data[3]) led_byte |= 0x08;
		if (data[4]) led_byte |= 0x10;
		if (data[5]) led_byte |= 0x20;

		// data[6] and data[7] are power led color and intensity
		// respectively

		var power_color = data[6];
		var power_intensity = data[7];
		assert(0 <= power_color <= 255, 'power color within range');
		assert(0 <= power_intensity <= 255, 'power not too intense');

		buf.writeUInt8(led_byte, pos); pos += 1;
		buf.writeUInt8(power_color, pos); pos += 1;
		buf.writeUInt8(power_intensity, pos); pos += 1;
		break;
	case ('SONG'):
		assert(0 <= data[0] <= 15, 'song code within range');
		buf.writeUInt8(data[0], pos); pos += 1;

		assert(data.length <= 34, 'song not too long');
		for (var i = 1; i < data.length; i++) {
			buf.writeUInt8(data[i], pos); pos += 1;
		}

		if (pos < maxlen)
			buf = buf.slice(0, pos);
		break;
	case ('PLAY'):
		assert(0 <= data[0] <= 15, 'song code within range');
		buf.writeUInt8(data[0], pos); pos += 1;
		break;
	case ('SENSORS'):
		// data[0] is 0 through 3 where:
		// 0: All sensors
		// 1: Physical sensors
		// 2: Buttons and internal sensors
		// 3: Power sensors

		assert (0 <= data[0] <= 3, 'sensor group within range');
		buf.writeUInt8(data[0], pos); pos += 1;
		break;
	default:
	}
	assert(buf.length <= maxlen, 'buffer is within range');
	return (buf);
};

function decode_sensors(buf) {
	assert(buf.length == SENSOR_PKT_LEN, 'sensor packet is complete');

	var msg = {};
	var pos = 0;
	var byte = 0x00;
	var mask = {};

	// bumper sensors
	msg.bump = {};
	byte = buf.readUInt8(pos++);
	mask = masks.bump_wheeldrop;
	
	if (byte & mask.BUMP_RIGHT)
		msg.bump.right = true;

	if (byte & mask.BUMP_LEFT)
		msg.bump.left = true;

	// wheeldrop sensors
	msg.wheeldrop = {};
	if (byte & mask.WHEELDROP_RIGHT)
		msg.wheeldrop.right= true;

	if (byte & mask.WHEELDROP_LEFT)
		msg.wheeldrop.left = true;

	if (byte & mask.WHEELDROP_CASTER)
		msg.wheeldrop.caster = true;

	// wall sensor
	msg.wall = false;
	byte = buf.readUInt8(pos++);
	if (byte == 1)
		msg.wall = true;

	// cliff sensors
	msg.cliff = {};
	for (var i = 0; i < 4; i++) {
		if (buf.readUInt8(pos++) == 1) {
			msg.cliff[i] = true;
		} else {
			msg.cliff[i] = false;
		}
	}

	// virtual wall sensor
	msg.virtual_wall = false;
	byte = buf.readUInt8(pos++);
	if (byte == 1)
		msg.virtual_wall = true;

	// motor overcurrent sensors
	msg.overcurrent = {};
	byte = buf.readUInt8(pos++);
	mask = masks.motor_overcurrent;
	
	if (byte & mask.SIDEBRUSH)
		msg.overcurrent.side_brush = true;

	if (byte & mask.VACUUM)
		msg.overcurrent.vacuum = true;

	if (byte & mask.MAINBRUSH)
		msg.overcurrent.main_brush = true;

	if (byte & mask.DRIVE_RIGHT)
		msg.overcurrent.drive_right = true;

	if (byte & mask.DRIVE_LEFT)
		msg.overcurrent.drive_left = true;

	// dirt detectors
	msg.dirt = {};
	msg.dirt.left = buf.readUInt8(pos++);
	msg.dirt.right = buf.readUInt8(pos++);

	// remote control command receiver
	msg.remote = buf.readUInt8(pos++);

	// button press detectors
	msg.buttons = {};
	byte = buf.readUInt8(pos++);
	mask = masks.buttons;

	if (byte & mask.MAX)
		msg.buttons.max = true;

	if (byte & mask.CLEAN)
		msg.buttons.clean = true;

	if (byte & mask.SPOT)
		msg.buttons.spot = true;

	if (byte & mask.POWER)
		msg.buttons.power = true;

	// distance traveled
	msg.distance = buf.readInt16BE(pos); pos += 2;

	// angle turned
	msg.angle = buf.readInt16BE(pos); pos += 2;

	// charging state
	msg.battery = {}
	msg.battery.charging_state = buf.readUInt8(pos++);

	// voltage measurement
	msg.battery.voltage = buf.readUInt16BE(pos); pos += 2;

	// current measurement
	msg.battery.current = buf.readInt16BE(pos); pos += 2;

	// temperature sensor
	msg.battery.temp = buf.readInt8(pos++);

	// charge level
	msg.battery.level = buf.readUInt16BE(pos); pos += 2;

	// charge capacity
	msg.battery.capacity = buf.readUInt16BE(pos); pos += 2;

	assert(pos == buf.length, 'we consumed the entire sensor pkt');

	return (msg);
};

module.exports = {
	encode_cmd: encode_cmd,
	decode_sensors: decode_sensors,
	SENSOR_PKT_LEN: SENSOR_PKT_LEN
}
