'use strict';

let RadioRa2 = require('./lib/radiora2');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
let FanAccessory = require('./lib/accessories/fan');
let LightbulbAccessory = require('./lib/accessories/lightbulb');
let OccupancySensorAccessory = require('./lib/accessories/occupancysensor');
let KeypadButtonStatelessAccessory = require('./lib/accessories/statelessswitch');
let KeypadButtonAccessory = require('./lib/accessories/keypadbutton');

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
            .setCharacteristic(Characteristic.SerialNumber, fanConfig.serial || fanConfig.id);

        let fanService = accessory.addService(Service.Fan, accessoryName);

        this.accessories[accessory.UUID] = new FanAccessory(this.log, fanConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }
	
	addLightAccessory(accessoryUUID, lightConfig) {

        let accessoryName = lightConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, lightConfig || lightConfig.id);

        let lightBulbService = accessory.addService(Service.Lightbulb, accessoryName);
        if (lightConfig.adjustable) {
            lightBulbService.addCharacteristic(Characteristic.Brightness);
        }

        this.accessories[accessory.UUID] = new LightbulbAccessory(this.log, lightConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }

    addOccupancyAccessory(accessoryUUID, groupConfig) {

        let accessoryName = groupConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
			.setCharacteristic(Characteristic.SerialNumber, groupConfig || groupConfig.id);

        let occupancyService = accessory.addService(Service.OccupancySensor, accessoryName)
        occupancyService.addOptionalCharacteristic(Characteristic.StatusActive);

        this.accessories[accessory.UUID] = new OccupancySensorAccessory(this.log, groupConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }

    addKeypadButtonStatelessAccessory(accessoryUUID, keypadConfig) {

        let accessoryName = keypadConfig.name;
        let accessory = new PlatformAccessory(accessoryName, accessoryUUID);

        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Lutron")
            .setCharacteristic(Characteristic.SerialNumber, keypadConfig.id);
		
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
            .setCharacteristic(Characteristic.SerialNumber, keypadConfig.id);
		
		let buttonArray = keypadConfig.buttons || [];
		buttonArray.forEach(function(buttonConfig) {
			let buttonService = accessory.addService(Service.Switch, buttonConfig.name, buttonConfig.name);
		}.bind(this));

        this.accessories[accessory.UUID] = new KeypadButtonAccessory(this.log, keypadConfig, accessory, this.radiora2, Homebridge);
        this.api.registerPlatformAccessories("homebridge-radiora2", "RadioRA2", [accessory]);

    }
	
    configureAccessory(accessory) {
        this.accessories[accessory.UUID] = accessory;
    }

    setupListeners() {

        this.log("Attempting connection to " + this.config.repeater + "...");
        this.radiora2 = new RadioRa2(this.config.repeater, this.config.username, this.config.password);
        this.radiora2.on("messageReceived", function(data) {
            this.log("LUTRON >>> " + data);
        }.bind(this));
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
            // Groups
            let groupsArray = this.config.groups || [];
            groupsArray.forEach(function (groupConfig) {
                if ((groupConfig.id) && (groupConfig.name)) {
                    var uuid = UUIDGen.generate("group:" + groupConfig.id);
                    let groupAccessory = this.accessories[uuid];
                    if (!groupAccessory) {
                        this.addOccupancyAccessory(uuid, groupConfig);
                    }
                    else {
                        this.accessories[uuid] = new OccupancySensorAccessory(this.log, groupConfig, (groupAccessory instanceof OccupancySensorAccessory ? groupAccessory.accessory : groupAccessory), this.radiora2, Homebridge);
                    }
                    this.accessories[uuid].existsInConfig = true;
                    this.log("Loaded group '" + groupConfig.name + "'");
                }
                else {
                    this.log.warn("Invalid Group in config. Not loading it.");
                }
            }.bind(this));
            this.log("Loaded " + groupsArray.length + " group(s)");

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
    }
}