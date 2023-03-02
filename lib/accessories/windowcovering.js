let Characteristic, Service;

module.exports = class WindowCovering {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        Service = homebridge.hap.Service;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
        
        this.accessory
            .getService(Service.AccessoryInformation)
                .setCharacteristic(Characteristic.Manufacturer, "Lutron")
                .setCharacteristic(Characteristic.Model, this.config.model)
                .setCharacteristic(Characteristic.SerialNumber, this.config.serial);
        this.setupListeners();
        this.movementTimer;
    }

    setupListeners() {
        // Target Position
        this.accessory
            .getService(Service.WindowCovering)
            .getCharacteristic(Characteristic.TargetPosition)
            .on('set', this.setTargetPosition.bind(this));

        // Hold Position
        this.accessory
            .getService(Service.WindowCovering)
            .getCharacteristic(Characteristic.HoldPosition)
            .on('set', this.setHoldPosition.bind(this));

        // Tilt
        if (this.config.blind) {
            // Vertical
            if (this.config.tilt == "vertical") {
                currentTiltAngleCharacteristic = Characteristic.currentVerticleTiltAngle;
                this.accessory
                    .getService(Service.WindowCovering)
                    .getCharacteristic(Characteristic.targetVerticalTiltAngle)
                    .on('set', this.setTargetVerticalTilt.bind(this));
            } else {
                currentTiltAngleCharacteristic = Characteristic.currentHorizontalTiltAngle;
                this.accessory
                    .getService(Service.WindowCovering)
                    .getCharacteristic(Characteristic.targetHorizontalTiltAngle)
                    .on('set', this.setTargetHorizontalTilt.bind(this));

            }
        }

        // Closed
        this.radiora2.on("off", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Closed", this.config.name);
                this.accessory
                    .getService(Service.WindowCovering)
                    .getCharacteristic(Characteristic.TargetPosition)
                    .updateValue(0);
                if (this.movementTimer) {
                    clearTimeout(this.movementTimer);
                }
                this.movementTimer = setTimeout(() => {
                    this.accessory
                        .getService(Service.WindowCovering)
                        .getCharacteristic(Characteristic.CurrentPosition)
                        .updateValue(0);
                }, 1000);
                
            }
        }.bind(this));

        // Level
        this.radiora2.on("level", function (integrationId, level) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Set to " + level + "%", this.config.name);
                this.accessory
                    .getService(Service.WindowCovering)
                    .getCharacteristic(Characteristic.TargetPosition)
                    .updateValue(level);
                if (this.movementTimer) {
                    clearTimeout(this.movementTimer);
                }
                this.movementTimer = setTimeout(() => {
                    this.accessory
                        .getService(Service.WindowCovering)
                        .getCharacteristic(Characteristic.CurrentPosition)
                        .updateValue(level);
                }, 1000);
            }
        }.bind(this));

        // tilt
        this.radiora2.on("tilt", function (integrationId, level) {
            // Is this for us?
            if (integrationId == this.config.id) {
                if (this.config.blind) {
                    this.log.debug("Tilt set to " + level + "%", this.config.name);
                    this.accessory
                        .getService(Service.WindowCovering)
                        .getCharacteristic(currentTiltAngleCharacteristic)
                        .updateValue((level * 1.8) - 90);
                }
            }
        }.bind(this));

        // done moving
        this.radiora2.on("moving", function (integrationId, state) {
            // Is this for us?
            if (integrationId == this.config.id) {
                if (this.movementTimer) {
                    clearTimeout(this.movementTimer);
                }
                if (state == 0) {
                    this.log.debug("Moving up", this.config.name);
                    this.accessory
                        .getService(Service.WindowCovering)
                        .getCharacteristic(Characteristic.PositionState)
                        .updateValue(Characteristic.PositionState.INCREASING);
                } else if (state == 1) {
                    this.log.debug("Moving down", this.config.name);
                    this.accessory
                        .getService(Service.WindowCovering)
                        .getCharacteristic(Characteristic.PositionState)
                        .updateValue(Characteristic.PositionState.DECREASING);
                } else if (state == 2) {
                    this.log.debug("Finished moving", this.config.name);
                    this.accessory
                        .getService(Service.WindowCovering)
                        .getCharacteristic(Characteristic.PositionState)
                        .updateValue(Characteristic.PositionState.STOPPED);
                    this.accessory
                        .getService(Service.WindowCovering)
                        .getCharacteristic(Characteristic.CurrentPosition)
                        .updateValue(this.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition).value);
                }
            }
        }.bind(this));

        this.accessory
            .getService(Service.WindowCovering)
            .getCharacteristic(Characteristic.PositionState)
            .updateValue(Characteristic.PositionState.STOPPED);

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
