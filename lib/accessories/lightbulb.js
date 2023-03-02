let Characteristic, Service;

module.exports = class Lightbulb {

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
    }

    setupListeners() {
        // Power
        this.accessory
            .getService(Service.Lightbulb)
            .getCharacteristic(Characteristic.On)
            .on('set', this.setPower.bind(this));

        // Level Change
        if (this.config.adjustable) {
            this.accessory
                .getService(Service.Lightbulb)
                .getCharacteristic(Characteristic.Brightness)
                .on('set', this.setLevel.bind(this));
        }

        // Turned On
        this.radiora2.on("on", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Turned ON", this.config.name);
                // On
                this.accessory
                    .getService(Service.Lightbulb)
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
                    .getService(Service.Lightbulb)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(false);
            }
        }.bind(this));

        // Level
        this.radiora2.on("level", function (integrationId, level) {
            // Is this for us?
            if ((integrationId == this.config.id) && (this.config.adjustable)) {
                this.log.debug("Brightness set to " + level + "%", this.config.name);
                // Brightness
                this.accessory
                    .getService(Service.Lightbulb)
                    .getCharacteristic(Characteristic.Brightness)
                    .updateValue(level);
            }
        }.bind(this));
        
        // Request State
        this.radiora2.queryOutputState(this.config.id);

    }
        
    setLevel(level, callback) {
        setTimeout(function() {
            this.radiora2.setDimmer(this.config.id, level);
        }.bind(this),100)
        callback(null);
    }

    setPower(powerOn, callback) {
        if (powerOn){
            var onValue = 100;
            if (this.config.adjustable) {
                onValue = this.config.onvalue || 100;
            }
            this.radiora2.setDimmer(this.config.id, onValue);
            this.accessory
                .getService(Service.Lightbulb)
                .getCharacteristic(Characteristic.Brightness)
                .updateValue(onValue);
        }
        else {
            this.radiora2.setDimmer(this.config.id, 0)
        }
        callback(null);
    }
}
