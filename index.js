'use strict';

let RadioRa2 = require('./lib/radiora2');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const logger = require("./lib/logger");
let FanAccessory = require('./lib/accessories/fan');
let LightbulbAccessory = require('./lib/accessories/lightbulb');
let OccupancySensorAccessory = require('./lib/accessories/occupancysensor');
let KeypadButtonStatelessAccessory = require('./lib/accessories/statelessswitch');
let KeypadButtonAccessory = require('./lib/accessories/keypadbutton');
let VisorControlReceiverAccessory = require('./lib/accessories/visorcontrolreceiver')
let ThermostatAccessory = require('./lib/accessories/hvaccontroller');
let WindowCoveringAccessory = require('./lib/accessories/windowcovering');
let TemperatureSensorAccessory = require('./lib/accessories/temperaturesensor');

let Homebridge, Accessory, PlatformAccessory, Characteristic, Service, UUIDGen;

module.exports = function (homebridge) {
    Homebridge = homebridge;
    Accessory = homebridge.hap.Accessory;
    PlatformAccessory = homebridge.platformAccessory;
    Characteristic = homebridge.hap.Characteristic;
    Service = homebridge.hap.Service;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform('homebridge-radiora2', 'RadioRA2', RadioRA2Platform, true);
};
    
function addDefaultValues(deviceConfig, deviceType) {
    deviceConfig.name   = (deviceConfig.name   || deviceType + " " + deviceConfig.id).toString();
    deviceConfig.model  = (deviceConfig.model  || "RadioRa2-" + deviceType).toString();
    deviceConfig.serial = (deviceConfig.serial || deviceType + deviceConfig.id).toString();
    return deviceConfig
}


class RadioRA2Platform {

    constructor(log, config, api) {


        if ((!config) || (!(config.host || config.repeater)) || (!config.username) || (!config.password)) {
            log.warn("Ignoring Lutron RadioRa2 Platform setup because it is not configured");
            this.disabled = true;
            return;
        }

        this.config = config;
        this.api = api;
        this.accessories = {};
        this.log = new logger.Logger(log, this.config.debug);

        this.setupListeners();
    }

    configureAccessory(accessory) {
        this.accessories[accessory.UUID] = accessory;
    }

    setupListeners() {
        
        let repeaterAddress = this.config.repeater || this.config.hosts;
        this.log.info("Attempting connection to " + repeaterAddress + "...");
        this.radiora2 = new RadioRa2(repeaterAddress, this.config.username, this.config.password, this.log);
        this.radiora2.connect();

        this.radiora2.on("loggedIn", function () {

            this.log.info("Logged in to RadioRA2 Main Repeater at " + repeaterAddress);

            //////////////////////////
            // Fans
            let deviceType = "fan";
            let deviceArray = this.config.fans || [];
            deviceArray.forEach(function (deviceConfig) {
                if (!deviceConfig.disabled) {
                    if (deviceConfig.id) {
                        deviceConfig = addDefaultValues(deviceConfig, deviceType);
                        var uuid = UUIDGen.generate(deviceType + ":" + deviceConfig.id);
                        let deviceAccessory = this.accessories[uuid];
                        if (!deviceAccessory) {
                            let accessory = new PlatformAccessory(deviceConfig.name, uuid);
                            let deviceService = accessory.addService(Service.Fan, deviceConfig.name);
                            this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);
                            deviceAccessory = accessory;
                        }
                        this.accessories[uuid] = new FanAccessory(this.log, deviceConfig, (deviceAccessory instanceof FanAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        this.accessories[uuid].existsInConfig = true;
                        this.log.debug("Loaded " + deviceType + " '" + deviceConfig.name + "'");
                    }
                    else {
                        this.log.warn("Invalid " + deviceType + " in config. Not loading it.");
                    }
                }
            }.bind(this));
            this.log.info("Loaded " + deviceArray.length + " " + deviceType + "(s)");

            //////////////////////////
            // Lights
            deviceType = "light";
            deviceArray = this.config.lights || [];
            deviceArray.forEach(function (deviceConfig) {
                if (!deviceConfig.disabled) {
                    if (deviceConfig.id) {
                        deviceConfig = addDefaultValues(deviceConfig, deviceType);
                        var uuid = UUIDGen.generate(deviceType + ":" + deviceConfig.id);
                        let deviceAccessory = this.accessories[uuid];
                        if (!deviceAccessory) {
                            let accessory = new PlatformAccessory(deviceConfig.name, uuid);
                            let deviceService = accessory.addService(Service.Lightbulb, deviceConfig.name);
                            if (deviceConfig.adjustable) {
                                deviceService.addCharacteristic(Characteristic.Brightness);
                            }
                            this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);
                            deviceAccessory = accessory;
                        }
                        this.accessories[uuid] = new LightbulbAccessory(this.log, deviceConfig, (deviceAccessory instanceof LightbulbAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        this.accessories[uuid].existsInConfig = true;
                        this.log.debug("Loaded " + deviceType + " '" + deviceConfig.name + "'");
                    }
                    else {
                        this.log.warn("Invalid " + deviceType + " in config. Not loading it.");
                    }
                }
            }.bind(this));
            this.log.info("Loaded " + deviceArray.length + " " + deviceType + "(s)");

            //////////////////////////
            // Occupancy Sensors
            deviceType = "occupancy sensor";
            deviceArray = this.config.occupancysensors || [];
            deviceArray.forEach(function (deviceConfig) {
                if (!deviceConfig.disabled) {
                    if (deviceConfig.id) {
                        deviceConfig = addDefaultValues(deviceConfig, deviceType);
                        var uuid = UUIDGen.generate(deviceType + ":" + deviceConfig.id);
                        let deviceAccessory = this.accessories[uuid];
                        if (!deviceAccessory) {
                            let accessory = new PlatformAccessory(deviceConfig.name, uuid);
                            let deviceService = accessory.addService(Service.OccupancySensor, deviceConfig.name)
                            deviceService.addOptionalCharacteristic(Characteristic.StatusActive);
                            this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);
                            deviceAccessory = accessory;
                        }
                        this.accessories[uuid] = new OccupancySensorAccessory(this.log, deviceConfig, (deviceAccessory instanceof OccupancySensorAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        this.accessories[uuid].existsInConfig = true;
                        this.log.debug("Loaded " + deviceType + " '" + deviceConfig.name + "'");
                    }
                    else {
                        this.log.warn("Invalid " + deviceType + " in config. Not loading it.");
                    }
                }
            }.bind(this));
            this.log.info("Loaded " + deviceArray.length + " " + deviceType + "(s)");

            //////////////////////////
            // Keypads
            deviceType = "keypad";
            deviceArray = this.config.keypads || [];
            deviceArray.forEach(function (deviceConfig) {
                if (!deviceConfig.disabled) {
                    if (deviceConfig.id) {
                        deviceConfig = addDefaultValues(deviceConfig, deviceType);
                        var uuid = UUIDGen.generate(deviceType + ":" + deviceConfig.id);
                        let deviceAccessory = this.accessories[uuid];
                        if (!deviceAccessory) {
                            let accessory = new PlatformAccessory(deviceConfig.name, uuid);
                            this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);
                            deviceAccessory = accessory;
                        }
                        if (deviceConfig.stateless) {
                            this.accessories[uuid] = new KeypadButtonStatelessAccessory(this.log, deviceConfig, (deviceAccessory instanceof KeypadButtonStatelessAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        } else {
                            this.accessories[uuid] = new KeypadButtonAccessory(this.log, deviceConfig, (deviceAccessory instanceof KeypadButtonStatelessAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        }
                        this.accessories[uuid].existsInConfig = true;
                        this.log.debug("Loaded " + deviceType + " '" + deviceConfig.name + "'");
                    }
                    else {
                        this.log.warn("Invalid " + deviceType + " in config. Not loading it.");
                    }
                }
            }.bind(this));
            this.log.info("Loaded " + deviceArray.length + " " + deviceType + "(s)");

            //////////////////////////
            // Visor Control Receivers
            deviceType = "visor control reciever";
            deviceArray = this.config.visorcontrolreceivers || [];
            deviceArray.forEach(function (deviceConfig) {
                if (!deviceConfig.disabled) {
                    if (deviceConfig.id) {
                        deviceConfig = addDefaultValues(deviceConfig, deviceType);
                        var uuid = UUIDGen.generate(deviceType + ":" + deviceConfig.id);
                        let deviceAccessory = this.accessories[uuid];
                        if (!deviceAccessory) {
                            let accessory = new PlatformAccessory(deviceConfig.name, uuid);
                            this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);
                            deviceAccessory = accessory;
                        }
                        this.accessories[uuid] = new VisorControlReceiverAccessory(this.log, deviceConfig, (deviceAccessory instanceof VisorControlReceiverAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        this.accessories[uuid].existsInConfig = true;
                        this.log.debug("Loaded " + deviceType + " '" + deviceConfig.name + "'");
                    }
                    else {
                        this.log.warn("Invalid " + deviceType + " in config. Not loading it.");
                    }
                }
            }.bind(this));
            this.log.info("Loaded " + deviceArray.length + " " + deviceType + "(s)");

            //////////////////////////
            // HVAC Controllers
            deviceType = "hvac controller";
            deviceArray = this.config.hvaccontrollers || [];
            deviceArray.forEach(function (deviceConfig) {
                if (!deviceConfig.disabled) {
                    if (deviceConfig.id) {
                        deviceConfig = addDefaultValues(deviceConfig, deviceType);
                        var uuid = UUIDGen.generate(deviceType + ":" + deviceConfig.id);
                        let deviceAccessory = this.accessories[uuid];
                        if (!deviceAccessory) {
                            let accessory = new PlatformAccessory(deviceConfig.name, uuid);
                            let deviceService = accessory.addService(Service.Thermostat, deviceConfig.name);
                            this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);
                            deviceAccessory = accessory;
                        }
                        this.accessories[uuid] = new ThermostatAccessory(this.log, deviceConfig, (deviceAccessory instanceof ThermostatAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        this.accessories[uuid].existsInConfig = true;
                        // Temperature Sensors
                        deviceAccessory.sensors = [];
                        let subdeviceType = "tempurature sensor";
                        let subdeviceArray = deviceConfig.sensors || [];
                        let that = this;
                        subdeviceArray.forEach(function (subdeviceConfig) {
                            if (!subdeviceConfig.disabled) {
                                if (subdeviceConfig.id) {
                                    subdeviceConfig = addDefaultValues(subdeviceConfig, subdeviceType);
                                    var subuuid = UUIDGen.generate(subdeviceType + ":" + subdeviceConfig.id);
                                    let subdeviceAccessory = that.accessories[subuuid];
                                    if (!subdeviceAccessory) {
                                        let subaccessory = new PlatformAccessory(subdeviceConfig.name, subuuid);
                                        let subdeviceService = subaccessory.addService(Service.TemperatureSensor, subdeviceConfig.name);
                                        that.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [subaccessory]);
                                        subdeviceAccessory = subaccessory;
                                    }
                                    deviceAccessory.sensors[subuuid]  = new TemperatureSensorAccessory(that.log, subdeviceConfig, (subdeviceAccessory instanceof TemperatureSensorAccessory ? subdeviceAccessory.accessory : subdeviceAccessory), that.radiora2, Homebridge);
                                    that.accessories[subuuid] = deviceAccessory.sensors[subuuid];
                                    that.accessories[subuuid].existsInConfig = true;
                                    that.log.debug("Loaded " + subdeviceType + " '" + subdeviceConfig.name + "'");
                                }
                                else {
                                    that.log.warn("Invalid " + subdeviceType + " in config. Not loading it.");
                                }
                            }
                        });
                        
                        this.log.debug("Loaded " + deviceType + " '" + deviceConfig.name + "'");
                    }
                    else {
                        this.log.warn("Invalid " + deviceType + " in config. Not loading it.");
                    }
                }
            }.bind(this));
            this.log.info("Loaded " + deviceArray.length + " " + deviceType + "(s)");

            //////////////////////////
            // Window Coverings
            deviceType = "window covering";
            deviceArray = this.config.windowcoverings || [];
            deviceArray.forEach(function (deviceConfig) {
                if (!deviceConfig.disabled) {
                    if (deviceConfig.id) {
                        deviceConfig = addDefaultValues(deviceConfig, deviceType);
                        var uuid = UUIDGen.generate(deviceType + ":" + deviceConfig.id);
                        let deviceAccessory = this.accessories[uuid];
                        if (!deviceAccessory) {
                            let accessory = new PlatformAccessory(deviceConfig.name, uuid);
                            let deviceService = accessory.addService(Service.WindowCovering, deviceConfig.name);
                            this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);
                            deviceAccessory = accessory;
                        }
                        this.accessories[uuid] = new WindowCoveringAccessory(this.log, deviceConfig, (deviceAccessory instanceof WindowCoveringAccessory ? deviceAccessory.accessory : deviceAccessory), this.radiora2, Homebridge);
                        this.accessories[uuid].existsInConfig = true;
                        this.log.debug("Loaded " + deviceType + " '" + deviceConfig.name + "'");
                    }
                    else {
                        this.log.warn("Invalid " + deviceType + " in config. Not loading it.");
                    }
                }
            }.bind(this));
            this.log.info("Loaded " + deviceArray.length + " " + deviceType + "(s)");

            //////////////////////////
            // Remove Deleted
            // Iterate over all accessories in the dictionary, and anything without the flag needs to be removed
            Object.keys(this.accessories).forEach(function(accessoryUuid) {
                var thisAccessory = this.accessories[accessoryUuid];
                if (thisAccessory.existsInConfig !== true) {
                    this.api.unregisterPlatformAccessories(undefined, undefined, [thisAccessory]);
                    this.log.info("Deleted removed accessory");
                }
            }.bind(this));
            
        }.bind(this));
        
        //Disconnect cleaning when homebridge is shutting down
        process.on("SIGINT", function() {this.radiora2.disconnect()}.bind(this));
        process.on("SIGTERM", function() {this.radiora2.disconnect()}.bind(this));

    }
}
