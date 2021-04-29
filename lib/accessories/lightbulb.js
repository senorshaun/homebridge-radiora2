let Characteristic, LightbulbService;

module.exports = class Lightbulb {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        LightbulbService = homebridge.hap.Service.Lightbulb;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
        this.accessory
            .getService(homebridge.hap.Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Model, this.config.model.toString() || "Light")
            .setCharacteristic(Characteristic.SerialNumber, this.config.serial.toString() || this.config.id.toString());
        this.setupListeners();
        this.accessory.updateReachability(true);
    }

    setupListeners() {
        
        // Avoid warnings
        this.radiora2.setMaxListeners(999);

        // Power
        this.accessory
            .getService(LightbulbService)
            .getCharacteristic(Characteristic.On)
            .on('set', this.setPower.bind(this));

        // Level Change
        if (this.config.adjustable) {
            this.accessory
                .getService(LightbulbService)
                .getCharacteristic(Characteristic.Brightness)
                .on('set', this.setLevel.bind(this));
        }

        // Turned On
        this.radiora2.on("on", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Accessory '" + this.config.name + "' turned ON");
                // On
                this.accessory
                    .getService(LightbulbService)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(true);
            }
        }.bind(this));

        // Turned Off
        this.radiora2.on("off", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Accessory '" + this.config.name + "' turned OFF");
                // On
                this.accessory
                    .getService(LightbulbService)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(false);
            }
        }.bind(this));

        // Level
        this.radiora2.on("level", function (integrationId, level) {
            // Is this for us?
            if ((integrationId == this.config.id) && (this.config.adjustable)) {
                this.log.debug("Accessory '" + this.config.name + "' brightness set to " + level + "%");
                // Brightness
                this.accessory
                    .getService(LightbulbService)
                    .getCharacteristic(Characteristic.Brightness)
                    .updateValue(level);
            }
        }.bind(this));
        
        // Request State
        this.radiora2.queryOutputState(this.config.id);

    }
        
    setLevel(level, callback) {
        //console.log("BRIGHTNESS: " + level + "%");
        setTimeout(function() {
            this.radiora2.setDimmer(this.config.id, level);
        }.bind(this),100)
        callback(null);
    }

    setPower(powerOn, callback) {
        //console.log("POWER: " + (powerOn ? "On" : "Off"));
        if (powerOn){
            var onValue = 100;
            if (this.config.adjustable) {
                onValue = this.config.onvalue || 100;
            }
            this.radiora2.setDimmer(this.config.id, onValue);
            this.accessory
                    .getService(LightbulbService)
                    .getCharacteristic(Characteristic.Brightness)
                    .updateValue(onValue);
        }
        else {
            this.radiora2.setDimmer(this.config.id, 0)
        }
        callback(null);
    }
}