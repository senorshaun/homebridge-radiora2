var events = require('events');
var util = require('util');
var net = require('net');

var RadioRa2 = function (host, username, password, log) {
    events.EventEmitter.call(this);
    var me = this;
    var readyForCommand = false;
    var loggedIn = false;
    var socket = null;
    var state = null;
    var commandQueue = [];
    var responderQueue = [];
    var onOffState = {};
    var terminating = false;

    this.connect = function () {

        log.info("Connecting...");
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
                //this.log.info("Connection closed!");
                setTimeout(function() {
                    //this.log.info("Attempting reconnection...");
                    me.connect();
                },1000)
            }
        }).on('error', function(error) {
            //this.log.info("Socket error - " + error);
        });
    };

    this.disconnect = function () {

        log.info("Disconnecting");
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
            log.debug(command);
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
            log.debug(firstCommand);
            var components = firstCommand.split(",");
            if (components[0] == "~DEVICE") _processDeviceResponse(components);
            if (components[0] == "~GROUP") _processGroupResponse(components);
            if (components[0] == "~HVAC") _processHVACResponse(components);
            if (components[0] == "~OUTPUT") _processOutputResponse(components);

            // Any other data?
            if (remainingCommands.length > 0) {
                incomingData(remainingCommands);
                return;
            }
        }
    }

    function _processDeviceResponse(dataComponents) {

        var deviceId = dataComponents[1];


        // Button Press
        if (dataComponents.length >= 4) {

            var action = dataComponents[3];
            var buttonId = dataComponents[2];

            // Press or release
            if (action == 3 || action == 4) {
                me.emit("buttonAction", deviceId, buttonId, action);
            }
            // LED change
            else if (action == 9) {
                if (dataComponents[4] == 0) {
                    me.emit("keypadbuttonLEDOff", deviceId, buttonId);
                }
                else if (dataComponents[4] == 1) {
                    me.emit("keypadbuttonLEDOn", deviceId, buttonId);
                }
            }
            // battery status
            else if (action == 22 && dataComponents.length >= 7) {
                me.emit("batteryStatus", deviceId, buttonId, dataComponents[5], dataComponents[6]);
            }
            // Unknown
            else {
                log.debug("Unexpected device response '" + dataComponents + "'");
            }
        }
    }

    this.queryTemperatureSensor = function (id) {
        me.sendCommand("?DEVICE," + id + ",1,22");
    };

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
                log.debug("Unexpected HVAC response '" + dataComponents + "'");
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
            log.debug("Unexpected group response '" + dataComponents + "'");
        }
    }

    this.queryGroupState = function (groupId) {
        me.sendCommand("?GROUP," + groupId + ",3");
    };

    function _processOutputResponse(dataComponents) {
        
        // Level (~OUTPUT,<id>,<action>,<level>)
        if (dataComponents.length >= 3 && (dataComponents[2] == 1 || dataComponents[2] == 9 || dataComponents[2] == 10 || dataComponents[2] == 32)) {
            if (dataComponents[2] == 10) {
                _processOutputResponse([dataComponents[0],dataComponents[1],1,dataComponents[3]]);
                _processOutputResponse([dataComponents[0],dataComponents[1],9,dataComponents[4]]);
            } else {
                var integrationId = dataComponents[1];
                var newLevel = dataComponents[3];
                var oldLevel = onOffState[integrationId + "." + dataComponents[2]];
                if (dataComponents[2] == 1) {
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
                } else if (dataComponents[2] == 9) {
                    if (newLevel != oldLevel) me.emit("tilt", integrationId, newLevel);
                } else if (dataComponents[2] == 32) {
                    me.emit("moving", integrationId, dataComponents[3]);
                }
                onOffState[integrationId + "." + dataComponents[2]] = newLevel;
            }
        }
    }
    
    this.queryOutputState = function (deviceId) {
        me.sendCommand("?OUTPUT," + deviceId + ",1");
    };

    this.queryOutputTilt = function (deviceId) {
        me.sendCommand("?OUTPUT," + deviceId + ",9");
    };

    this.setOutput = function (id, action, level, fade, delay, cb) {
        if (typeof cb == 'undefined') {
            cb = delay;
            delay = null;
        }
        if (typeof cb == 'undefined') {
            cb = fade;
            fade = null;
        }
        var result;
        result = function (msg) {
            if (msg.type == "status" && id == msg.id) {
                if (typeof !cb == 'undefined') {
                    cb(msg);
                }
                me.removeListener('messageReceived', result);
            }
        }
        me.on('messageReceived', result)
        var cmd = "#OUTPUT," + id + "," + action;
        if(typeof level !== 'undefined') {
            cmd += "," + level;
            if (typeof fade !== 'undefined') {
                cmd += "," + fade;
                if (typeof delay !== 'undefined') {
                    cmd += "," + delay;
                }
            }
        }
        me.sendCommand(cmd);
    };

    this.setDimmer = function (id, level, fade, delay, cb) {
        me.setOutput(id, 1, level, fade, delay, cb);
    };

    this.setSwitch = function (id, on) {
        me.setOutput(id, 1, on ? 100 : 0);
    };

    this.stopMoving = function (id) {
        me.setOutput(id, 4);
    };

    this.stopLift = function (id) {
        me.setOutput(id, 16);
    };

    this.stopTilt = function (id) {
        me.setOutput(id, 13);
    };

    this.setTilt = function (id, level, vertical, fade, delay, cb) {
        me.setOutput(id, 9, level, fade, delay, cb);
    };


}

util.inherits(RadioRa2, events.EventEmitter);
module.exports = RadioRa2;
