let Characteristic, WindowCoveringService;

module.exports = class WindowCovering {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        WindowCoveringService = homebridge.hap.Service.WindowCovering;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
        
        this.accessory
            .getService(homebridge.hap.Service.AccessoryInformation)
                .setCharacteristic(Characteristic.Manufacturer, "Lutron")
                .setCharacteristic(Characteristic.Model, this.config.model)
                .setCharacteristic(Characteristic.SerialNumber, this.config.serial);
        this.setupListeners();
    }

    setupListeners() {
        
        // Avoid warnings
        this.radiora2.setMaxListeners(999);

        // Target Position
        this.accessory
            .getService(WindowCoveringService)
            .getCharacteristic(Characteristic.TargetPosition)
            .on('set', this.setTargetPosition.bind(this));

        // Hold Position
        this.accessory
            .getService(WindowCoveringService)
            .getCharacteristic(Characteristic.HoldPosition)
            .on('set', this.setHoldPosition.bind(this));

        // Tilt
        if (this.config.blind) {
            // Vertical
            if (this.config.tilt == "vertical") {
                currentTiltAngleCharacteristic = Characteristic.currentVerticleTiltAngle;
                this.accessory
                    .getService(WindowCoveringService)
                    .getCharacteristic(Characteristic.targetVerticalTiltAngle)
                    .on('set', this.setTargetVerticalTilt.bind(this));
            } else {
                currentTiltAngleCharacteristic = Characteristic.currentHorizontalTiltAngle;
                this.accessory
                    .getService(WindowCoveringService)
                    .getCharacteristic(Characteristic.targetHorizontalTiltAngle)
                    .on('set', this.setTargetHorizontalTilt.bind(this));

            }
        }

        // Opened
        this.radiora2.on("on", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Accessory '" + this.config.name + "' opened");
                this.accessory
                    .getService(WindowCoveringService)
                    .getCharacteristic(Characteristic.CurrentPosition)
                    .updateValue(100);
            }
        }.bind(this));

        // Closed
        this.radiora2.on("off", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Accessory '" + this.config.name + "' closed");
                this.accessory
                    .getService(WindowCoveringService)
                    .getCharacteristic(Characteristic.CurrentPosition)
                    .updateValue(0);
            }
        }.bind(this));

        // Level
        this.radiora2.on("level", function (integrationId, level) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Accessory '" + this.config.name + "' set to " + level + "%");
                this.accessory
                    .getService(WindowCoveringService)
                    .getCharacteristic(Characteristic.CurrentPosition)
                    .updateValue(level);
            }
        }.bind(this));

        // tilt
        this.radiora2.on("tilt", function (integrationId, level) {
            // Is this for us?
            if (integrationId == this.config.id) {
                if (this.config.blind) {
                    this.log.debug("Accessory '" + this.config.name + "' tilt set to " + level + "%");
                    this.accessory
                        .getService(WindowCoveringService)
                        .getCharacteristic(currentTiltAngleCharacteristic)
                        .updateValue((level * 1.8) - 90);
                }
            }
        }.bind(this));

        // done moving
        this.radiora2.on("moving", function (integrationId, state) {
            // Is this for us?
            if (integrationId == this.config.id) {
                if (this.config.blind) {
                    this.log.debug("Accessory '" + this.config.name + "' finished moving");
                    if (state == 0) {
                        positionState = Characteristic.PositionState.INCREASING;
                    } else if (state == 1) {
                        positionState = Characteristic.PositionState.DECREASING;
                    } else if (state == 2) {
                        positionState = Characteristic.PositionState.STOPPED;
                    }
                    this.accessory
                        .getService(WindowCoveringService)
                        .setCharacteristic(Characteristic.PositionState, positionState);
                }
            }
        }.bind(this));

        this.accessory
            .getService(WindowCoveringService)
            .setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);

        // Request State
        this.radiora2.queryOutputState(this.config.id);
        if (this.config.blind) {
            this.radiora2.queryOutputTilt(this.config.id);
        }
    }
        
    setTargetPosition(level, callback) {
        setTimeout(function() {
            this.radiora2.setDimmer(this.config.id, level);
        }.bind(this),100);
        callback(null);
    }

    setHoldPosition(level, callback) {
        setTimeout(function() {
            if (this.config.blind) {
                this.radiora2.stopLift(this.config.id);
                this.radiora2.stopTilt(this.config.id);
            } else {
                this.radiora2.stopMoving(this.config.id);
            }
        }.bind(this),100);
        callback(null);
    }

    setTargetHorizontalTilt(level, callback) {
        setTimeout(function() {
            this.radiora2.setTilt(this.config.id, (level + 90) / 1.8, false);
        }.bind(this),100);
        callback(null);
    }

    setTargetVerticalTilt(level, callback) {
        setTimeout(function() {
            this.radiora2.setTilt(this.config.id, (level + 90) / 1.8, true);
        }.bind(this),100);
        callback(null);
    }

}
