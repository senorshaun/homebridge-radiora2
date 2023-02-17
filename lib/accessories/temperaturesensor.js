let Characteristic, TemperatureSensorService;

module.exports = class TemperatureSensor {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        TemperatureSensorService = homebridge.hap.Service.TemperatureSensor;
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

        // Battery Status
        this.radiora2.on("batteryStatus", function (integrationId, buttonId, powerSource, status) {
            // Is this for us?
            if (integrationId == this.config.id) {
                if (powerSource == 1) {
                    if (status == 1) {
                        this.setState(true, false, false);
                    } else if (status == 2) {
                        this.setState(true, true, false);
                    } else if (status == 3) {
                        this.setState(false, false, false);
                    } else if (status == 4) {
                        this.setState(false, false, true);
                    }
                } else {
                    if (status == 0) {
                        this.setState(true, false, false);
                    } else if (status == 3) {
                        this.setState(false, false, false);
                    } else if (status == 4) {
                        this.setState(false, false, true);
                    }
                }
            }
        }.bind(this));

        // Request State
        this.radiora2.queryTemperatureSensor(this.config.id);

    }

    setState(active, lowBattery, fault) {
        this.accessory
            .getService(TemperatureSensorService)
            .getCharacteristic(Characteristic.statusActive)
            .updateValue(active);
        this.accessory
            .getService(TemperatureSensorService)
            .getCharacteristic(Characteristic.StatusLowBattery)
            .updateValue(lowBattery);
        this.accessory
            .getService(TemperatureSensorService)
            .getCharacteristic(Characteristic.statusFault)
            .updateValue(fault);
    }
}
