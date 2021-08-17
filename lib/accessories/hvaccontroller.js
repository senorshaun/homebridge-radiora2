let Characteristic, ThermostatService;

module.exports = class HVACController {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        ThermostatService = homebridge.hap.Service.Thermostat;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
        this.accessory
            .getService(homebridge.hap.Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Model, this.config.model.toString() || "HVAC Controller")
            .setCharacteristic(Characteristic.SerialNumber, (this.config.serial || "HVAC" + this.config.id).toString());
        if (this.config.heatOnly) {
            this.accessory
                .getService(ThermostatService)
                .getCharacteristic(Characteristic.TargetHeatingCoolingState)
                .setProps({
                    validValues: [0, 1]
                });
        }
        this.accessory.updateReachability(true);

        this.setupListeners();


    }

    setupListeners() {
        
        // Avoid warnings
        this.radiora2.setMaxListeners(999);


        this.accessory
            .getService(ThermostatService)
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('set', this.setTargetHeatingCooling.bind(this));

        this.accessory
           .getService(ThermostatService)
           .getCharacteristic(Characteristic.TargetTemperature)
           .on('set', this.setTargetTemperature.bind(this));

        this.accessory
            .getService(ThermostatService)
            .getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .on('set', this.setCoolingThresholdTemperature.bind(this));

        this.accessory
            .getService(ThermostatService)
            .getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .on('set', this.setHeatingThresholdTemperature.bind(this));

        // temp
        this.radiora2.on("temp", function (integrationId, currentTemp) {
            // Is this for us?
            if (integrationId == this.config.id) {
                this.log.debug("HVAC Controller '" + this.config.name + "' - " + currentTemp);
                // On
                this.accessory
                    .getService(ThermostatService)
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .updateValue(currentTemp);
            }
        }.bind(this));

        // Setpoints
        this.radiora2.on("setpoints", function (integrationId, sph, spc) {
            // Is this for us?
            if (integrationId == this.config.id) {
                // if heat changed
                if (sph != "255" && sph != "0"){
                    if (sph > 25) {sph == 25;}
                    this.log.debug("HVAC Controller '" + this.config.name + "' heating setpoint - " + sph);
                    this.accessory
                        .getService(ThermostatService)
                        .getCharacteristic(Characteristic.HeatingThresholdTemperature)
                        .updateValue(sph);
                    if (this.accessory.getService(ThermostatService).getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 1) {
                        this.accessory
                            .getService(ThermostatService)
                            .getCharacteristic(Characteristic.TargetTemperature)
                            .updateValue(sph);
                    }
                }
                // if cool changed
                if (spc != "255" && spc != "0"){
                    if (spc < 10) {spc == 10;}
                    this.log.debug("HVAC Controller '" + this.config.name + "' cooling setpoint - " + spc);
                    this.accessory
                        .getService(ThermostatService)
                        .getCharacteristic(Characteristic.CoolingThresholdTemperature)
                        .updateValue(spc);
                    if (this.accessory.getService(ThermostatService).getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 2) {
                        this.accessory
                            .getService(ThermostatService)
                            .getCharacteristic(Characteristic.TargetTemperature)
                            .updateValue(spc);
                    }
                }
            }
        }.bind(this));

        // Mode
        this.radiora2.on("mode", function (integrationId, mode) {
            // Is this for us?
            if (integrationId == this.config.id) {
                if (mode == "5"){
                    mode = 2;
                }
                var cleanmode = mode - 1;
                this.log.debug("HVAC Controller '" + this.config.name + "' set to " + cleanmode);
                this.accessory
                    .getService(ThermostatService)
                    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
                    .updateValue(cleanmode);
            }
        }.bind(this));

        // State
        this.radiora2.on("state", function (integrationId, state) {
            // Is this for us?
            if (integrationId == this.config.id) {
                if(["0","5","8"].indexOf(state) > -1) {
                    this.log.debug("HVAC Controller '" + this.config.name + "' currently off");
                    this.accessory
                        .getService(ThermostatService)
                        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                        .updateValue(0);
                } else if(["1","2","3","4","5","9"].indexOf(state) > -1) {
                    this.log.debug("HVAC Controller '" + this.config.name + "' currently heating");
                    this.accessory
                        .getService(ThermostatService)
                        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                        .updateValue(1);
                } else if (["6","7","10"].indexOf(state) > -1) {
                    this.log.debug("HVAC Controller '" + this.config.name + "' currently cooling");
                    this.accessory
                        .getService(ThermostatService)
                        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                        .updateValue(2);
                }
            }
        }.bind(this));

        // Request State
        this.radiora2.queryHVACController(this.config.id);

    }

    setTargetHeatingCooling(mode, callback) {
        this.radiora2.setHVACMode(this.config.id, mode + 1);
        callback(null);
    }

    setTargetTemperature(sp, callback) {
        if (this.accessory.getService(ThermostatService).getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 1) {
                this.radiora2.setHVACSetpoints(this.config.id, sp, sp + 2.2);
        } else if (this.accessory.getService(ThermostatService).getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 2) {
            this.radiora2.setHVACSetpoints(this.config.id, sp - 2.2, sp);
        }
        callback(null);
    }

    setCoolingThresholdTemperature(sp, callback) {
        this.radiora2.setHVACSetpoints(this.config.id, 255, sp);
        callback(null);
    }

    setHeatingThresholdTemperature(sp, callback) {
        this.radiora2.setHVACSetpoints(this.config.id, sp, 255);
        callback(null);
    }
}