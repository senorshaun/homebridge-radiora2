let Characteristic, Service, inputArray, outputArray, buttonArray;

module.exports = class VisorControlReceiver {

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
        buttonArray = this.config.buttons || [];
		inputArray = this.config.inputs || [];
		outputArray = this.config.outputs || [];
        this.initializeControls(buttonArray, 'Button');
        this.initializeControls(inputArray, 'Input');
        this.initializeControls(outputArray, 'Output');
        this.setupListeners();
    }

    initializeControls(controlArray, initType) {

        controlArray.forEach(function(controlConfig){
        	let label = (controlConfig.name || initType + " " + controlConfig.id).toString();
            let controlService = this.accessory.getServiceByUUIDAndSubType(Service.Switch, label);
            if (!controlService) {
                let controlService = this.accessory.addService(Service.Switch, label, label);
            }
            this.accessory
                .getServiceByUUIDAndSubType(Service.Switch, label)
                .existsInConfig = true;
        }.bind(this));

        this.accessory.services.forEach(function(accessoryService) {
            var thisControl = this.accessory.getServiceByUUIDAndSubType(Service.Switch, accessoryService.displayName);
            if (thisControl && thisControl.existsInConfig != true) {
                this.accessory.removeService(thisControl);
                this.log.info("Deleted removed visor control receiver " + initType, this.config.name);
            }
        }.bind(this));
    }

    setupListeners() {

		inputArray.forEach(function(buttonConfig){
			var boundPressButton = this.pressButton.bind(this, buttonConfig.id);
			this.accessory
				.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name)
				.getCharacteristic(Characteristic.On)
				.on('set', boundPressButton);
		}.bind(this));
		outputArray.forEach(function(buttonConfig){
			this.accessory
				.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name)
				.getCharacteristic(Characteristic.On)
				.on('set', this.setOutput.bind(this, buttonConfig.id));
			// Request State
			this.radiora2.queryOutputState(buttonConfig.id);
		}.bind(this));
		buttonArray.forEach(function(buttonConfig){
			var boundPressButton = this.pressButton.bind(this, buttonConfig.id);
			this.accessory
				.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name)
				.getCharacteristic(Characteristic.On)
				.on('set', boundPressButton);
			// Request State
			this.radiora2.queryDeviceButtonState(this.config.id, buttonConfig.led || (buttonConfig.id + 80));
		}.bind(this));
		
        // LED On
        this.radiora2.on("keypadbuttonLEDOn", function (integrationId, buttonId) {
            if (integrationId == this.config.id) {
                // See if we can find a button characteristic that matches
                inputArray.forEach(function(buttonConfig){
					if(buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("[Input " + buttonConfig.name + "] Turned on", this.config.name);
						var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
						if (service) {
							service.getCharacteristic(Characteristic.On).updateValue(true);
						}
					}
				}.bind(this));
				buttonArray.forEach(function(buttonConfig){
					if(buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("[Button " + buttonConfig.name + "] Pressed On", this.config.name);
						var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
						if (service) {
							service.getCharacteristic(Characteristic.On).updateValue(true);
						}
					}
				}.bind(this));
            }
        }.bind(this));
		
		// LED Off
        this.radiora2.on("keypadbuttonLEDOff", function (integrationId, buttonId) {
            if (integrationId == this.config.id) {
                // See if we can find a button characteristic that matches
                inputArray.forEach(function(buttonConfig){
					if(buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("[Input " + buttonConfig.name + "] Turned off", this.config.name);
						var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
						if (service) {
							service.getCharacteristic(Characteristic.On).updateValue(false);
						}
					}
				}.bind(this));
				buttonArray.forEach(function(buttonConfig){
					if(buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("[Button " + buttonConfig.name + "] Pressed off", this.config.name);
						var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
						if (service) {
							service.getCharacteristic(Characteristic.On).updateValue(false);
						}
					}
				}.bind(this));
            }
        }.bind(this));

        // Output off
        this.radiora2.on("on", function (integrationId) {
        	// See if we can find a button characteristic that matches
            outputArray.forEach(function(buttonConfig){
				if(integrationId == buttonConfig.id){
					var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
					if (service) {
						this.log.debug("[Output " + buttonConfig.name + "] Turned on", this.config.name);
						service.getCharacteristic(Characteristic.On).updateValue(true);
					}
				}
			}.bind(this));
        }.bind(this));

        // Output off
        this.radiora2.on("off", function (integrationId) {
        	// See if we can find a button characteristic that matches
            outputArray.forEach(function(buttonConfig){
				if(integrationId == buttonConfig.id){
					var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
					if (service) {
						this.log.debug("[Output " + buttonConfig.name + "] Turned off", this.config.name);
						service.getCharacteristic(Characteristic.On).updateValue(false);
					}
				}
			}.bind(this));
        }.bind(this));
    }
	
	pressButton(buttonID, powerState, callback) {
		this.radiora2.pressButton(this.config.id, buttonID);
	}

	setOutput(buttonID, outputState, callback) {
        this.radiora2.setSwitch(buttonID, outputState);
        callback(null);
     }
}
