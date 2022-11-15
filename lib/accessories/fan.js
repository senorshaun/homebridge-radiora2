let Characteristic, FanService;

module.exports = class Fan {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        FanService = homebridge.hap.Service.Fan;
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
        this.accessory.updateReachability(true);
    }

    setupListeners() {
        
        // Avoid warnings
        this.radiora2.setMaxListeners(999);

        // Power
        this.accessory
            .getService(FanService)
            .getCharacteristic(Characteristic.On)
            .on('set', this.setPower.bind(this));

        // Level Change
        if (this.config.adjustable) {
            this.accessory
                .getService(FanService)
                .getCharacteristic(Characteristic.RotationSpeed)
                .on('set', this.setLevel.bind(this))
                .props.minStep = 25;
        }

        // Turned On
        this.radiora2.on("on", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Accessory '" + this.config.name + "' turned ON");
                // On
                this.accessory
                    .getService(FanService)
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
                    .getService(FanService)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(false);
            }
        }.bind(this));

        // Rotation Speed
        this.radiora2.on("level", function (integrationId, level) {
            // Is this for us?
            if ((integrationId == this.config.id) && (this.config.adjustable)) {
                this.log.debug("Accessory '" + this.config.name + "' rotation speed set to " + level + "%");
                // On first
                this.accessory
                    .getService(FanService)
                    .getCharacteristic(Characteristic.On)
                    .updateValue(true);
                // Rotation Speed
                this.accessory
                    .getService(FanService)
                    .getCharacteristic(Characteristic.RotationSpeed)
                    .updateValue(level);

            }
        }.bind(this));

        // Request State
        this.radiora2.queryOutputState(this.config.id);

    }
        
    setLevel(level, callback) {
        //console.log("SPEED: " + rotationSpeed + "%");
        setTimeout(function() {
            this.radiora2.setDimmer(this.config.id, level);
        }.bind(this),100);
        callback(null);
    }

    setPower(powerOn, callback) {
        //console.log("POWER: " + (powerOn ? "On" : "Off"));
        if (powerOn) {
            var onValue = 100;
            if (this.config.adjustable) {
                onValue = this.config.onvalue || 75;
            }
            this.radiora2.setDimmer(this.config.id, onValue);
            this.accessory
                    .getService(FanService)
                    .getCharacteristic(Characteristic.RotationSpeed)
                    .updateValue(onValue);
        }
        else {
            this.radiora2.setDimmer(this.config.id, 0)
        }
        callback(null);

    }
}
