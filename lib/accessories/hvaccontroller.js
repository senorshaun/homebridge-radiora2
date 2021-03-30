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
            .setCharacteristic(Characteristic.Model, this.config.model || "HVAC Controller")
            .setCharacteristic(Characteristic.SerialNumber, this.config.serial || this.config.id);
        this.setupListeners();
        this.accessory.updateReachability(true);
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
                if (sph != 255 && sph != 0){
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
                if (spc != 255 && spc != 0){
		    if (spc > 25) {spc == 25;}
                    this.log.debug("HVAC Controller '" + this.config.name + "' cooling setpoint - " + sph);
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

        // Single Setpoint
        this.radiora2.on("singlesetpoint",function (integrationId, sp) {
            // Is this for us?
            if (integrationId == this.config.id) {
		if (sp < 10) {sp == 10;}
                if (sp > 38) {sp == 38;}
                this.log.debug("HVAC Controller '" + this.config.name + "' target setpoint - " + sp);
                this.accessory
                    .getService(ThermostatService)
                    .getCharacteristic(Characteristic.TargetTemperature)
                    .updateValue(sp);
            }
        }.bind(this));

        // Mode
        this.radiora2.on("mode", function (integrationId, mode) {
            // Is this for us?
            if (integrationId == this.config.id) {
		if (mode == 5){
                    mode = 2;
                }
                this.log.debug("HVAC Controller '" + this.config.name + "' set to " + mode - 1);
                this.accessory
                    .getService(ThermostatService)
                    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
                    .updateValue(mode - 1);
            }
        }.bind(this));

        // State
        this.radiora2.on("state", function (integrationId, state) {
            // Is this for us?
            if (integrationId == this.config.id) {

                if(state == 0,5,8){
                    this.log.debug("HVAC Controller '" + this.config.name + "' currently off");
                    var currentstate = 0
                }
                else if(state == 1,2,3,4,9){
                    this.log.debug("HVAC Controller '" + this.config.name + "' currently heating");
                    var currentstate = 1
                }
                else if(state == 6,7,10){
                    this.log.debug("HVAC Controller '" + this.config.name + "' currently cooling");
                    var currentstate = 2
                }
                this.accessory
                    .getService(ThermostatService)
                    .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                    .updateValue(currentstate);
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
        this.radiora2.setHVACSingleSetpoint(this.config.id,sp,0.0);
        callback(null);
    }

    setCoolingThresholdTemperature(spc, callback) {
        if (this.accessory.getService(ThermostatService).getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 4) {
            var sph = 255;
        } else {
            var sph = spc;
        }
        this.radiora2.setHVACSetpoints(this.config.id, sph, spc);
        this.setTargetTemperature(spc);
        callback(null);
    }

    setHeatingThresholdTemperature(sph, callback) {
        if (this.accessory.getService(ThermostatService).getCharacteristic(Characteristic.TargetHeatingCoolingState).value == 4) {
            var spc = 255;
        } else {
            var spc = sph;
        }
        this.radiora2.setHVACSetpoints(this.config.id, sph, spc);
        this.setTargetTemperature(sph);
        callback(null);
    }
}
