let Characteristic, Service;

module.exports = class TemperatureSensor {

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

        let BatteryService = this.accessory.getServiceByUUIDAndSubType(Service.BatteryService, 'Battery');
        if (!BatteryService) {
            BatteryService = this.accessory.addService(Service.BatteryService, 'Battery', 'Battery');
        }
        let batterySwitch = this.accessory.getServiceByUUIDAndSubType(Service.Switch, 'BatterySwitch');
        if (this.config.batterySwitch) {
            if (!batterySwitch) {
                batterySwitch = this.accessory.addService(Service.Switch, 'BatterySwitch', 'BatterySwitch');
            }
        } else if (batterySwitch) {
            this.accessory.removeService(batterySwitch);
        }
        this.accessory.getService(Service.TemperatureSensor).setPrimaryService();
        this.setupListeners();
        this.lastTemp;
        this.queryTimer;
    }

    setupListeners() {
        // Battery Status
        this.radiora2.on("batteryStatus", function (integrationId, buttonId, powerSource, status) {
            // Is this for us?
            if (integrationId == this.config.id) {
                clearTimeout(this.queryTimer);
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

        // temp
        this.radiora2.on("temp", function (integrationId, currentTemp) {
            // Is this for us?
            if (integrationId == this.config.id || integrationId == this.config.parentId) {
                this.lastTemp = currentTemp;
                if(this.accessory.getService(Service.TemperatureSensor).getCharacteristic(Characteristic.StatusActive).getValue() == 1) {
                    this.log.debug("Current Temperature - " + currentTemp, this.config.name);
                    this.accessory
                        .getService(Service.TemperatureSensor)
                        .getCharacteristic(Characteristic.CurrentTemperature)
                        .updateValue(currentTemp);
                }
            }
        }.bind(this));

        // Request State
        this.radiora2.queryTemperatureSensor(this.config.id);
        this.queryTimer = setTimeout(() => {
            this.setState(false,false,false);
        }, 5000);
        setInterval(function() {
            clearTimeout(this.queryTimer);
            this.radiora2.queryTemperatureSensor(this.config.id);
            this.queryTimer = setTimeout(() => {
                this.setState(false,false,false);
            }, 5000);
        }, 3600000);
    }

    setState(active, lowBattery, fault) {
        if (active == false) {
            this.log.warn("Offline", this.config.name);
            this.accessory
                .getService(Service.TemperatureSensor)
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(new Error("offline"));
        } else if (this.lastTemp) {
            this.accessory
                .getService(Service.TemperatureSensor)
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(this.lastTemp);
        }
        this.accessory
            .getService(Service.TemperatureSensor)
            .getCharacteristic(Characteristic.StatusActive)
            .updateValue(active);
        if (lowBattery) {
            this.log.info("Low Battery reported", this.config.name);
        }
        this.accessory
            .getService(Service.BatteryService)
            .getCharacteristic(Characteristic.StatusLowBattery)
            .updateValue(lowBattery);
        if (this.config.batterySwitch) {
            this.accessory
                .getServiceByUUIDAndSubType(Service.Switch, "BatterySwitch")
                .getCharacteristic(Characteristic.On)
                .updateValue(lowBattery);
        }
        if (lowBattery) {
            this.log.warn("Fault reported", this.config.name);
        }
        this.accessory
            .getService(Service.TemperatureSensor)
            .getCharacteristic(Characteristic.StatusFault)
            .updateValue(fault);
    }
}
