let Characteristic, Service, buttonArray;

module.exports = class KeypadButton {

    constructor(log, config, accessory, radiora2, homebridge) {
		Characteristic = homebridge.hap.Characteristic;
		Service = homebridge.hap.Service;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
		buttonArray = this.config.buttons || [];
		
        this.accessory
            .getService(Service.AccessoryInformation)
            	.setCharacteristic(Characteristic.Manufacturer, "Lutron")
            	.setCharacteristic(Characteristic.Model, this.config.model)
            	.setCharacteristic(Characteristic.SerialNumber, this.config.serial);
        this.initializeButtons();
        this.setupListeners();
    }

    initializeButtons() {

        buttonArray.forEach(function(buttonConfig){
        	if (!buttonConfig.disabled) {
	        	let label = (buttonConfig.name || "Button " + buttonConfig.id).toString();
	            let service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, label);
	            if (!service) {
	                let service = this.accessory.addService(Service.Switch, label, label);
	            }
	            this.accessory
	                .getServiceByUUIDAndSubType(Service.Switch, label)
	                .existsInConfig = true;
	        }        
        }.bind(this));

        this.accessory.services.forEach(function(accessoryService) {
            var thisButton = this.accessory.getServiceByUUIDAndSubType(Service.Switch, accessoryService.displayName);
            if (thisButton && thisButton.existsInConfig != true) {
                this.accessory.removeService(thisButton);
                this.log.info("Deleted removed keypad button", this.config.name);
            }
        }.bind(this));
    }


    setupListeners() {

		buttonArray.forEach(function(buttonConfig){
			var boundPressButton = this.pressButton.bind(this, buttonConfig.id);
			this.accessory
				.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name)
				.getCharacteristic(Characteristic.On)
				.on('set', boundPressButton);

			// Request State
			this.radiora2.queryDeviceButtonState(this.config.id, buttonConfig.led);
		}.bind(this));
		
        // LED On
        this.radiora2.on("keypadbuttonLEDOn", function (integrationId, buttonId) {
            if (integrationId == this.config.id) {
                // See if we can find a button characteristic that matches
                buttonArray.forEach(function(buttonConfig){
					if (buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("[" + buttonConfig.name + "] Pressed on", this.config.name);
						var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
						if (service) {
							service.getCharacteristic(Characteristic.On).updateValue(true);
						}
						else {
							this.log.debug("WARNING: Button #" + buttonId + " has no associated service!", this.config.name);
						}
					}
				}.bind(this));
            }
        }.bind(this));
		
		// LED Off
        this.radiora2.on("keypadbuttonLEDOff", function (integrationId, buttonId) {
            if (integrationId == this.config.id) {
                // See if we can find a button characteristic that matches
                buttonArray.forEach(function(buttonConfig){
					if (buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("[" + buttonConfig.name + "] Pressed off", this.config.name);
						var service = this.accessory.getServiceByUUIDAndSubType(Service.Switch, buttonConfig.name);
						if (service) {
							service.getCharacteristic(Characteristic.On).updateValue(false);
						}
						else {
							this.log.debug("WARNING: Button #" + buttonId + " has no associated service!", this.config.name);
						}
					}
				}.bind(this));
            }
        }.bind(this));
    }
	
	pressButton(buttonID, powerState, callback) {
		this.radiora2.pressButton(this.config.id, buttonID);
		callback(null);
	}
}
