let Characteristic, Service;

module.exports = class Fan {

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
        this.onTimer = undefined;
    }

    setupListeners() {
        // Power
        this.accessory
            .getService(Service.Fan)
            .getCharacteristic(Characteristic.On)
            .on('set', this.setPower.bind(this));

        // Level Change
        if (this.config.adjustable) {
            this.accessory
                .getService(Service.Fan)
                .getCharacteristic(Characteristic.RotationSpeed)
                .on('set', this.setLevel.bind(this))
                .props.minStep = 25;
        }

        // Turned On
        this.radiora2.on("on", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Turned ON", this.config.name);
                // On
                this.accessory
                    .getService(Service.Fan)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(true);
            }
        }.bind(this));

        // Turned Off
        this.radiora2.on("off", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Turned OFF", this.config.name);
                // On
                this.accessory
                    .getService(Service.Fan)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(false);
            }
        }.bind(this));

        // Rotation Speed
        this.radiora2.on("level", function (integrationId, level) {
            // Is this for us?
            if ((integrationId == this.config.id) && (this.config.adjustable)) {
                this.log.debug("Rotation speed set to " + level + "%", this.config.name);
                // On first
                this.accessory
                    .getService(Service.Fan)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(true);
                // Rotation Speed
                this.accessory
                    .getService(Service.Fan)
                    .getCharacteristic(Characteristic.RotationSpeed)
                    .updateValue(level);
            }
        }.bind(this));

        // Request State
        this.radiora2.queryOutputState(this.config.id);

    }
        
    setLevel(level, callback) {
        setTimeout(function() {
            if (this.onTimer) {
                clearTimeout(this.onTimer);
                this.onTimer = undefined;
            }
            this.radiora2.setDimmer(this.config.id, level);
        }.bind(this),100);
        callback(null);
    }

    setPower(powerOn, callback) {
        if (powerOn) {
            this.onTimer = setTimeout(function() {
                var onValue = 100;
                if (this.config.adjustable) {
                    onValue = this.config.onvalue || 75;
                }
                this.radiora2.setDimmer(this.config.id, onValue);
                this.accessory
                    .getService(Service.Fan)
                    .getCharacteristic(Characteristic.RotationSpeed)
                    .updateValue(onValue);
            }.bind(this),250);

        }
        else {
            this.radiora2.setDimmer(this.config.id, 0)
        }
        callback(null);

    }
}
