'use strict';

let RadioRa2 = require('./lib/radiora2');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
let FanAccessory = require('./lib/accessories/fan');
let LightbulbAccessory = require('./lib/accessories/lightbulb');
let OccupancySensorAccessory = require('./lib/accessories/occupancysensor');
let KeypadButtonStatelessAccessory = require('./lib/accessories/statelessswitch');
let KeypadButtonAccessory = require('./lib/accessories/keypadbutton');
let VisorControlReceiverAccessory = require('./lib/accessories/visorcontrolreceiver')
let ThermostatAccessory = require('./lib/accessories/hvaccontroller');

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

class RadioRA2Platform {

    constructor(log, config, api) {


        if ((!config) || (!config.repeater) || (!config.username) || (!config.password)) {
            log.warn("Ignoring Lutron RadioRa2 Platform setup because it is not configured");
            this.disabled = true;
            return;
        }

        this.config = config;
        this.api = api;
        this.accessories = {};
        this.log = log;

        this.setupListeners();
    }

    addFanAccessory(accessoryUUID, fanConfig) {

        let accessoryName = fanConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, (fanConfig.serial|| "Fan" + fanConfig.id).toString());

        let fanService = accessory.addService(Service.Fan, accessoryName);

        this.accessories[accessory.UUID] = new FanAccessory(this.log, fanConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }
    
    addLightAccessory(accessoryUUID, lightConfig) {

        let accessoryName = lightConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, (lightConfig.serial || "Light" + lightConfig.id).toString());

        let lightBulbService = accessory.addService(Service.Lightbulb, accessoryName);
        if (lightConfig.adjustable) {
            lightBulbService.addCharacteristic(Characteristic.Brightness);
        }

        this.accessories[accessory.UUID] = new LightbulbAccessory(this.log, lightConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }

    addOccupancyAccessory(accessoryUUID, occupancySensorConfig) {

        let accessoryName = occupancySensorConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, (occupancySensorConfig.serial || "Occ" + occupancySensorConfig.id).toString());

        let occupancyService = accessory.addService(Service.OccupancySensor, accessoryName)
        occupancyService.addOptionalCharacteristic(Characteristic.StatusActive);

        this.accessories[accessory.UUID] = new OccupancySensorAccessory(this.log, occupancySensorConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }

    addKeypadButtonStatelessAccessory(accessoryUUID, keypadConfig) {

        let accessoryName = keypadConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, (keypadConfig.serial || "Keypad" + keypadConfig.id).toString());
        
        let buttonArray = keypadConfig.buttons || [];
        buttonArray.forEach(function(buttonConfig) {
            let buttonService = accessory.addService(Service.StatelessProgrammableSwitch, "Button " + buttonConfig.id, "Button " + buttonConfig.id);
            let switchEventCharacteristic = buttonService.getCharacteristic(Characteristic.ProgrammableSwitchEvent);
            switchEventCharacteristic.setProps({
                format: Characteristic.Formats.UINT8,
                maxValue: 2,
                minValue: 0,
                validValues: [0],
                perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
            });
            buttonService.getCharacteristic(Characteristic.ServiceLabelIndex).updateValue(buttonConfig.id);
            buttonService.getCharacteristic(Characteristic.Name).updateValue(buttonConfig.name);
        }.bind(this));

        this.accessories[accessory.UUID] = new KeypadButtonStatelessAccessory(this.log, keypadConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }

    addKeypadButtonAccessory(accessoryUUID, keypadConfig) {

        let accessoryName = keypadConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, (keypadConfig.serial || "Keypad" + keypadConfig.id).toString());
        
        let buttonArray = keypadConfig.buttons || [];
        buttonArray.forEach(function(buttonConfig) {
            let buttonService = accessory.addService(Service.Switch, buttonConfig.name, buttonConfig.name);
        }.bind(this));

        this.accessories[accessory.UUID] = new KeypadButtonAccessory(this.log, keypadConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }

    addVisorControlReceiverAccessory(accessoryUUID, visorControlConfig) {

        let accessoryName = visorControlConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, (visorControlConfig.serial || "VCR" + visorControlConfig.id).toString());
        
        let inputArray = visorControlConfig.inputs || [];
        inputArray.forEach(function(buttonConfig) {
            let buttonService = accessory.addService(Service.Switch, buttonConfig.name, buttonConfig.name);
        }.bind(this));
        let outputArray = visorControlConfig.outputs || [];
        outputArray.forEach(function(buttonConfig) {
            let buttonService = accessory.addService(Service.Switch, buttonConfig.name, buttonConfig.name);
        }.bind(this));
        let buttonArray = visorControlConfig.buttons || [];
        buttonArray.forEach(function(buttonConfig) {
            let buttonService = accessory.addService(Service.Switch, buttonConfig.name, buttonConfig.name);
        }.bind(this));

        this.accessories[accessory.UUID] = new VisorControlReceiverAccessory(this.log, visorControlConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }

    addThermostatAccessory(accessoryUUID, hvacControllerConfig) {

        let accessoryName = hvacControllerConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, (hvacControllerConfig.serial || "HVAC" + hvacControllerConfig.id).toString());

        let hvacControllerService = accessory.addService(Service.Thermostat, accessoryName);

        this.accessories[accessory.UUID] = new ThermostatAccessory(this.log, hvacControllerConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }
    
    configureAccessory(accessory) {
        this.accessories[accessory.UUID] = accessory;
    }

    setupListeners() {

        this.log("Attempting connection to " + this.config.repeater + "...");
        this.radiora2 = new RadioRa2(this.config.repeater, this.config.username, this.config.password, this.log);
        this.radiora2.connect();

        this.radiora2.on("loggedIn", function () {

            this.log("Connected to Lutron!");

            //////////////////////////
            // Fans
            let fansArray = this.config.fans || [];
            fansArray.forEach(function (fanConfig) {
                if ((fanConfig.id) && (fanConfig.name)) {
                    var uuid = UUIDGen.generate("light:" + fanConfig.id);
                    let fanAccessory = this.accessories[uuid];
                    if (!fanAccessory) {
                        this.addFanAccessory(uuid, fanConfig);
                    }
                    else {
                        this.accessories[uuid] = new FanAccessory(this.log, fanConfig, (fanAccessory instanceof FanAccessory ? fanAccessory.accessory : fanAccessory), this.radiora2, Homebridge);
                    }
                    this.accessories[uuid].existsInConfig = true;
                    this.log("Loaded fan '" + fanConfig.name + "'");
                }
                else {
                    this.log.warn("Invalid fan in config. Not loading it.");
                }
            }.bind(this));
            this.log("Loaded " + fansArray.length + " fan(s)");

            //////////////////////////
            // Lights
            let lightsArray = this.config.lights || [];
            lightsArray.forEach(function (lightConfig) {
                if ((lightConfig.id) && (lightConfig.name)) {
                    var uuid = UUIDGen.generate("light:" + lightConfig.id);
                    let lightAccessory = this.accessories[uuid];
                    if (!lightAccessory) {
                        this.addLightAccessory(uuid, lightConfig);
                    }
                    else {
                        this.accessories[uuid] = new LightbulbAccessory(this.log, lightConfig, (lightAccessory instanceof LightbulbAccessory ? lightAccessory.accessory : lightAccessory), this.radiora2, Homebridge);
                    }
                    this.accessories[uuid].existsInConfig = true;
                    this.log("Loaded light '" + lightConfig.name + "'");
                }
                else {
                    this.log.warn("Invalid Light in config. Not loading it.");
                }
            }.bind(this));
            this.log("Loaded " + lightsArray.length + " light(s)");

            //////////////////////////
            // Occupancy Sensors
            let occupancySensorsArray = this.config.occupancysensors || [];
            occupancySensorsArray.forEach(function (occupancySensorConfig) {
                if ((occupancySensorConfig.id) && (occupancySensorConfig.name)) {
                    var uuid = UUIDGen.generate("group:" + occupancySensorConfig.id);
                    let occupancySensorAccessory = this.accessories[uuid];
                    if (!occupancySensorAccessory) {
                        this.addOccupancyAccessory(uuid, occupancySensorConfig);
                    }
                    else {
                        this.accessories[uuid] = new OccupancySensorAccessory(this.log, occupancySensorConfig, (occupancySensorAccessory instanceof OccupancySensorAccessory ? occupancySensorAccessory.accessory : occupancySensorAccessory), this.radiora2, Homebridge);
                    }
                    this.accessories[uuid].existsInConfig = true;
                    this.log("Loaded occupancy sensor '" + occupancySensorConfig.name + "'");
                }
                else {
                    this.log.warn("Invalid occupancy sensor in config. Not loading it.");
                }
            }.bind(this));
            this.log("Loaded " + occupancySensorsArray.length + " occupancy sensor(s)");

            //////////////////////////
            // Keypads
            let keypadsArray = this.config.keypads || [];
            keypadsArray.forEach(function (keypadConfig) {
                if ((keypadConfig.id) && (keypadConfig.name)) {
                    var uuid = UUIDGen.generate("keypad:" + keypadConfig.id);
                    let keypadAccessory = this.accessories[uuid];
                    if (!keypadAccessory) {
                        if (keypadConfig.stateless) {
                            this.addKeypadButtonStatelessAccessory(uuid, keypadConfig);
                        }
                        else {
                            this.addKeypadButtonAccessory(uuid, keypadConfig);
                        }
                    }
                    else {
                        if (keypadConfig.stateless) {
                            this.accessories[uuid] = new KeypadButtonStatelessAccessory(this.log, keypadConfig, (keypadAccessory instanceof KeypadButtonStatelessAccessory ? keypadAccessory.accessory : keypadAccessory), this.radiora2, Homebridge);
                        }
                        else {
                            this.accessories[uuid] = new KeypadButtonAccessory(this.log, keypadConfig, (keypadAccessory instanceof KeypadButtonAccessory ? keypadAccessory.accessory : keypadAccessory), this.radiora2, Homebridge);
                        }
                    }
                    this.accessories[uuid].existsInConfig = true;
                    this.log("Loaded keypad '" + keypadConfig.name + "'");
                }
                else {
                    this.log.warn("Invalid Keypad in config. Not loading it.");
                }
            }.bind(this));
            this.log("Loaded " + keypadsArray.length + " keypad(s)");

            //////////////////////////
            // Visor Control Receivers
            let visorControlReceiversArray = this.config.visorcontrolreceivers || [];
            visorControlReceiversArray.forEach(function (visorControlReceiverConfig) {
                if ((visorControlReceiverConfig.id) && (visorControlReceiverConfig.name)) {
                    var uuid = UUIDGen.generate("visorcontrolreceiver:" + visorControlReceiverConfig.id);
                    let visorControlReceiverAccessory = this.accessories[uuid];
                    if (!visorControlReceiverAccessory) {
                        this.addVisorControlReceiverAccessory(uuid, visorControlReceiverConfig);
                    }
                    else {
                        this.accessories[uuid] = new VisorControlReceiverAccessory(this.log, visorControlReceiverConfig, (visorControlReceiverAccessory instanceof VisorControlReceiverAccessory ? visorControlReceiverAccessory.accessory : visorControlReceiverAccessory), this.radiora2, Homebridge);
                    }
                    this.accessories[uuid].existsInConfig = true;
                    this.log("Loaded visor control receiver '" + visorControlReceiverConfig.name + "'");
                }
                else {
                    this.log.warn("Invalid visor control receiver in config. Not loading it.");
                }
            }.bind(this));
            this.log("Loaded " + visorControlReceiversArray.length + " visor control receiver(s)");

            //////////////////////////
            // HVAC Controllers
            let hvacControllersArray = this.config.hvaccontrollers || [];
            hvacControllersArray.forEach(function (hvacControllerConfig) {
                if ((hvacControllerConfig.id) && (hvacControllerConfig.name)) {
                    var uuid = UUIDGen.generate("hvacController:" + hvacControllerConfig.id);
                    let hvacControllerAccessory = this.accessories[uuid];
                    if (!hvacControllerAccessory) {
                        this.addThermostatAccessory(uuid, hvacControllerConfig);
                    }
                    else {
                        this.accessories[uuid] = new ThermostatAccessory(this.log, hvacControllerConfig, (hvacControllerAccessory instanceof ThermostatAccessory ? hvacControllerAccessory.accessory : hvacControllerAccessory), this.radiora2, Homebridge);
                    }
                    this.accessories[uuid].existsInConfig = true;
                    this.log("Loaded HVAC controller '" + hvacControllerConfig.name + "'");
                }
                else {
                    this.log.warn("Invalid HVAC controller in config. Not loading it.");
                }
            }.bind(this));
            this.log("Loaded " + hvacControllersArray.length + " HVAC controller(s)");

            //////////////////////////
            // Remove Deleted
            // Iterate over all accessories in the dictionary, and anything without the flag needs to be removed
            Object.keys(this.accessories).forEach(function(accessoryUuid) {
                var thisAccessory = this.accessories[accessoryUuid];
                if (thisAccessory.existsInConfig !== true) {
                    this.api.unregisterPlatformAccessories(undefined, undefined, [thisAccessory]);
                    this.log("Deleted removed accessory");
                }
            }.bind(this));

        }.bind(this));
        
        //Disconnect cleaning when homebridge is shutting down
        process.on("SIGINT", function() {this.radiora2.disconnect()}.bind(this));
        process.on("SIGTERM", function() {this.radiora2.disconnect()}.bind(this));

    }
}
