var events = require('events');
var util = require('util');
var net = require('net');

var RadioRa2 = function (host, username, password, log) {
    events.EventEmitter.call(this);
    var me = this;
    this.log = log;
    var readyForCommand = false;
    var loggedIn = false;
    var socket = null;
    var state = null;
    var commandQueue = [];
    var responderQueue = [];
    var onOffState = {};
    var terminating = false;

    this.connect = function () {

        this.log("Connecting...");
        socket = net.connect(23, host);
        socket.on('data', function (data) {

            data = String(data).replace(/^\s+|\s+$/g, '');
            if (~data.indexOf("login")) sendUsername(data);
            if (~data.indexOf("password")) sendPassword(data);
            if ((data.indexOf("GNET") == 0) || (data.indexOf("QNET") == 0)  || (loggedIn)) incomingData(data);
        }).on('connect', function () {

        }).on('end', function () {

        }).on('close', function() {
            if (terminating != true){
                //this.log("Connection closed!");
                setTimeout(function() {
                    //this.log("Attempting reconnection...");
                    me.connect();
                },1000)
            }
        }).on('error', function(error) {
            //this.log("Socket error - " + error);
        });
    };

    this.disconnect = function () {

        this.log("Disconnecting");
        terminating = true;
        me.sendCommand("\x1D");
    };

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

    async function incomingData(data) {

        // Get string
        var str = String(data), m;

        // Prompt for data?
        if ((/^GNET>/.test(str)) || (/^QNET>/.test(str))) {

            // Are we flagged logged in yet?
            if (!loggedIn) {
                loggedIn = true
                me.emit('loggedIn');
            }

            // Send if we have it, ready if not
            if (commandQueue.length) {
                readyForCommand = false;
                var msg = commandQueue.shift();
                await new Promise(resolve => setTimeout(resolve, 500));
                socket.write(msg);

                //me.emit('sent', msg);
            } else {
                readyForCommand = true;
            }
        } else {

            // Split this into multiple lines
            var allData = data.split("\n");
            var firstCommand = allData.shift();
            var remainingCommands = allData.join("\n");

            // Process the first line
            var components = firstCommand.split(",");
            if (components[0] == "~DEVICE") _processDeviceResponse(components);
            if (components[0] == "~GROUP") _processGroupResponse(components);
            if (components[0] == "~HVAC") _processHVACResponse(components);
            if (components[0] == "~OUTPUT") _processOutputResponse(components);

            // Any other data?
            if (remainingCommands.length > 0) {
                // this.log("Repeating with additional lines...");
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
                //this.log("Unexpected button action '" + action + "'");
            }
        }
    }

    this.queryDeviceButtonState = function (id, btn) {
        me.sendCommand("?DEVICE," + id + "," + btn + ",9");
    };

    this.pressButton = function (id, btn) {
        me.sendCommand("#DEVICE," + id + "," + btn + ",3");
        me.sendCommand("#DEVICE," + id + "," + btn + ",4");
    };

    function _processHVACResponse(dataComponents) {

        // ~HVAC,id,action,parameters
        if ((dataComponents.length >= 3)) {
            var deviceId = dataComponents[1];
            var action = dataComponents[2];
            var parameter = dataComponents[3];

            // temp
            if (action == 15) {
                me.emit("temp", deviceId, parameter);
            }
            // current setpoints
            else if (action == 16) {
                me.emit("setpoints", deviceId, dataComponents[3], dataComponents[4]);
            }
            // mode
            else if (action == 3) {
                me.emit("mode", deviceId, parameter);
            }
            // state
            else if (action == 14) {
                me.emit("state", deviceId, parameter);
            }
            // Unknown
            else {
                //this.log("Unexpected button action '" + action + "'");
            }
        }
    }

    this.setHVACSetpoints = function (id, sph, spc){
        me.sendCommand("#HVAC," + id + ",16," + sph + "," + spc);
    };

    this.setHVACMode = function (id, mode) {
        me.sendCommand("#HVAC," + id + ",3," + mode);
    };
    
    this.queryHVACController = function (id) {
        me.sendCommand("?HVAC," + id + ",15");
        me.sendCommand("?HVAC," + id + ",16");
        me.sendCommand("?HVAC," + id + ",3");
        me.sendCommand("?HVAC," + id + ",14");
    };

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

    this.queryGroupState = function (groupId) {
        me.sendCommand("?GROUP," + groupId + ",3");
    };

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
    
    this.queryOutputState = function (deviceId) {
        me.sendCommand("?OUTPUT," + deviceId + ",1");
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

    this.setDimmerOn = function (id, level, fade, delay, cb) {
        if (onOffState[id] == 0) {
            me.setDimmer(id, level, fade, delay, cb);
        }
    };

    this.setSwitch = function (id, on) {
        me.setDimmer(id, on ? 100 : 0);
    };
}

util.inherits(RadioRa2, events.EventEmitter);
module.exports = RadioRa2;
