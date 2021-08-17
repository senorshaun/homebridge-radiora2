let Characteristic, OccupancySensorService;

module.exports = class OccupancySensor {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        OccupancySensorService = homebridge.hap.Service.OccupancySensor;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
        this.accessory
            .getService(homebridge.hap.Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Model, this.config.model.toString() || "Occupancy Sensor")
            .setCharacteristic(Characteristic.SerialNumber, (this.config.serial || "Occ" + this.config.id).toString());
    this.accessory.updateReachability(true);
        this.setupListeners();
    }

    setupListeners() {

        // Avoid warnings
        this.radiora2.setMaxListeners(999);

        // Occupancy Change -> Occupied
        this.radiora2.on("groupOccupied", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Occupancy Sensor #" + this.config.id + " - '" + this.config.name + "' became OCCUPIED");
                // Occupancy
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(true);
                // Active
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.StatusActive)
                    .updateValue(true);
                // Low Battery
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.StatusLowBattery)
                    .updateValue(false);
                // Reachable
                this.accessory.updateReachability(true);
            }
        }.bind(this));

        // Occupancy Change -> Unoccupied
        this.radiora2.on("groupUnoccupied", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Occupancy Sensor #" + this.config.id + " - '" + this.config.name + "' became UNOCCUPIED");
                // Occupancy
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(false);
                // Active
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.StatusActive)
                    .updateValue(true);
                // Low Battery
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.StatusLowBattery)
                    .updateValue(false);
                // Reachable
                this.accessory.updateReachability(true);
            }
        }.bind(this));

        // Occupancy Change -> Unknown
        this.radiora2.on("groupUnknown", function (integrationId) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("Occupancy Sensor #" + this.config.id + " - '" + this.config.name + "' became UNKNOWN");
                // Occupancy
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(false);
                // Active
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.StatusActive)
                    .updateValue(false);
                // Low Battery
                this.accessory
                    .getService(OccupancySensorService)
                    .getCharacteristic(Characteristic.StatusLowBattery)
                    .updateValue(true);
                // Reachable
                this.accessory.updateReachability(false);
            }
        }.bind(this));
        // Request State
        this.radiora2.queryGroupState(this.config.id);
    }
}
