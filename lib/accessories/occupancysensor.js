let Characteristic, Service;

module.exports = class OccupancySensor {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        Service = homebridge.hap.Service
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
        // Occupancy Change -> Occupied
        this.radiora2.on("groupOccupied", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("OCCUPIED", this.config.name);
                // Occupancy
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(true);
                // Active
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.StatusActive)
                    .updateValue(true);
                // Low Battery
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.StatusLowBattery)
                    .updateValue(false);
            }
        }.bind(this));

        // Occupancy Change -> Unoccupied
        this.radiora2.on("groupUnoccupied", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("UNOCCUPIED", this.config.name);
                // Occupancy
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(false);
                // Active
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.StatusActive)
                    .updateValue(true);
                // Low Battery
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.StatusLowBattery)
                    .updateValue(false);
            }
        }.bind(this));

        // Occupancy Change -> Unknown
        this.radiora2.on("groupUnknown", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("State UNKNOWN", this.config.name);
                // Occupancy
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(new Error("UNKNOWN"));
                // Active
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.StatusActive)
                    .updateValue(false);
                // Low Battery
                this.accessory
                    .getService(Service.OccupancySensor)
                    .getCharacteristic(Characteristic.StatusLowBattery)
                    .updateValue(true);
            }
        }.bind(this));

        // Request State
        this.radiora2.queryGroupState(this.config.id);
    }
}
