var events = require('events');
var util = require('util');
var net = require('net');

var RadioRa2 = function (host, username, password) {
    events.EventEmitter.call(this);
    var me = this;

    var readyForCommand = false;
    var loggedIn = false;
    var socket = null;
    var state = null;
    var commandQueue = [];
    var responderQueue = [];
    var onOffState = {};

    function sendUsername(prompt) {
        if (prompt != "login:") {
            me.emit('error', (new Error("Bad initial response /" + prompt + "/")));
            return;
        }
        socket.write(username + "\r\n");
        state = sendPassword;
    }

    function sendPassword(prompt) {
        if (prompt != "password:") {
            me.emit('error', (new Error("Bad login response /" + prompt + "/")));
            return;
        }
        state = incomingData;
        socket.write(password + "\r\n");
    }

    function incomingData(data) {

        // Get string
        var str = String(data), m;

        // Prompt for data?
        if (/^GNET>/.test(str)) {

            // Are we flagged logged in yet?
            if (!loggedIn) {
                loggedIn = true
                me.emit('loggedIn');
            }

            // Ready for more...
            readyForCommand = true;
            if (commandQueue.length) {
                var msg = commandQueue.shift();
				socket.write(msg);
                // console.log("SENT: " + msg);
                me.emit('sent', msg);
            }


        } else {

            // console.log("RAW DATA RECEIVED: " + data);

            // Split this into multiple lines
            var allData = data.split("\n");
            var firstCommand = allData.shift();
            var remainingCommands = allData.join("\n");

            // Process the first line
            var components = firstCommand.split(",");
            if (components[0] == "~OUTPUT") _processOutputResponse(components);
            if (components[0] == "~DEVICE") _processDeviceResponse(components);
            if (components[0] == "~GROUP") _processGroupResponse(components);

            // Any other data?
            if (remainingCommands.length > 0) {
                // console.log("Repeating with additional lines...");
                incomingData(remainingCommands);
                return;
            }

        }


    }

    function _processDeviceResponse(dataComponents) {

        var deviceId = dataComponents[1];


        // Button Press
        if ((dataComponents.length >= 4)) {

            var action = dataComponents[3];
            var buttonId = dataComponents[2];

            // Press
            if (action == 3) {
                me.emit("buttonPress", deviceId, buttonId);
            }
            // Release
            else if (action == 4) {
                me.emit("buttonReleased", deviceId, buttonId);
            }
			else if (action == 9) {
				if (dataComponents[4] == 0) {
					me.emit("keypadbuttonLEDOff", deviceId, buttonId);
				}
				else if (dataComponents[4] == 1) {
					me.emit("keypadbuttonLEDOn", deviceId, buttonId);
				}
            }
            // Unknown
            else {
                //console.log("Unexpected button action '" + action + "'");
            }

        }


    }

    function _processGroupResponse(dataComponents) {

        // Occupancy State (~GROUP,id,3,<state>)
        var groupId = dataComponents[1];
        var newState = dataComponents[3];

        // Occupied
        if (newState == 3) {
            me.emit("groupOccupied", groupId);
        }

        // Unoccupied
        else if (newState == 4) {
            me.emit("groupUnoccupied", groupId);
        }

        // Unknown
        else {
            me.emit("groupUnknown", groupId);
        }

    }

    function _processOutputResponse(dataComponents) {
		
        // Level (~OUTPUT,id,1,<level>)
        if ((dataComponents.length >= 3) && (dataComponents[2] == 1)) {

            var integrationId = dataComponents[1];
            var newLevel = dataComponents[3];
            var oldLevel = onOffState[integrationId];

            if (newLevel == 0) {
                if (newLevel != oldLevel) me.emit("off", integrationId);
            }
            else {
                if (newLevel != oldLevel) {
					if (oldLevel == 0) {
						me.emit("on", integrationId);
					}
                    me.emit("level", integrationId, newLevel);
                }
            }

            onOffState[integrationId] = newLevel;

        }

    }

    function messageReceived(message) {
        me.emit('messageReceived', message);
    }

    this.sendCommand = function (command) {
        if (!/\r\n$/.test(command)) {
            command += "\r\n";
        }
        if (readyForCommand) {
            readyForCommand = false;
            socket.write(command);
        } else {
            commandQueue.push(command);
        }
    };

    this.setDimmer = function (id, level, fade, delay, cb) {
		
        if (!cb) {
            cb = delay;
            delay = null;
        }
        if (!cb) {
            cb = fade;
            fade = null;
        }
        var result;
        result = function (msg) {
            if (msg.type == "status" && id == msg.id) {
                if (cb) {
                    cb(msg);
                }
                me.removeListener('messageReceived', result);
            }
        }
        me.on('messageReceived', result)
        var cmd = "#OUTPUT," + id + ",1," + level;
        if (fade) {
            cmd += "," + fade;
            if (delay) {
                cmd += "," + delay;
            }
        }
        me.sendCommand(cmd);
    };
	
	this.setDimmerOn = function (id, level, fade, delay, cb) {
		if (onOffState[id] == 0) {
			me.setDimmer(id, level, fade, delay, cb);
		}
    };

    this.setSwitch = function (id, on) {
        me.setDimmer(id, on ? 100 : 0);
    };

    this.queryOutput = function (id, cb) {
        var result;
        result = function (msg) {
            if (msg.type == "status" && id == msg.id) {
                if (cb) {
                    cb(msg);
                }
                me.removeListener('messageReceived', result);
            }
        }
        me.on('messageReceived', result)
        me.sendCommand("?OUTPUT," + id + ",1");
    };

    this.pressButton = function (id, btn) {
        me.sendCommand("#DEVICE," + id + "," + btn + ",3");
		me.sendCommand("#DEVICE," + id + "," + btn + ",4");
    };
	
	this.queryDeviceButtonState = function (id, btn) {
		me.sendCommand("?DEVICE," + id + "," + btn + ",9");
	};

    this.queryGroupState = function (groupId) {
        me.sendCommand("?GROUP," + groupId + ",3");
    };

    this.queryOutputState = function (deviceId) {
        me.sendCommand("?OUTPUT," + deviceId + ",1");
    };

    this.connect = function () {

        console.log("Connecting...");
        socket = net.connect(23, host);
        socket.on('data', function (data) {

            data = String(data).replace(/^\s+|\s+$/g, '');
            if (~data.indexOf("login")) sendUsername(data);
            if (~data.indexOf("password")) sendPassword(data);
            if ((data.indexOf("GNET") == 0) || (loggedIn)) incomingData(data);
        }).on('connect', function () {

        }).on('end', function () {

        }).on('close', function() {

            //console.log("Connection closed!");
            setTimeout(function() {
                //console.log("Attempting reconnection...");
                me.connect();
            },1000)

        }).on('error', function(error) {

            //console.log("Socket error - " + error);

        });
    }
}

util.inherits(RadioRa2, events.EventEmitter);
module.exports = RadioRa2;