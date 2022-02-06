let Characteristic, KeypadButtonSwitchService, buttonArray;

module.exports = class KeypadButton {

    constructor(log, config, accessory, radiora2, homebridge) {
		Characteristic = homebridge.hap.Characteristic;
		KeypadButtonSwitchService = homebridge.hap.Service.Switch;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
		buttonArray = this.config.buttons || [];
        this.accessory
            .getService(homebridge.hap.Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Model, this.config.model)
            .setCharacteristic(Characteristic.SerialNumber, this.config.serial);
	this.accessory.updateReachability(true);
        this.setupListeners();
    }

    setupListeners() {

		buttonArray.forEach(function(buttonConfig){
			var boundPressButton = this.pressButton.bind(this, buttonConfig.id);
			let buttonService = this.accessory.getServiceByUUIDAndSubType(KeypadButtonSwitchService, buttonConfig.name);
			if (!buttonService) {
				let buttonService = this.accessory.addService(KeypadButtonSwitchService, buttonConfig.name, buttonConfig.name);
			}
			this.accessory
				.getServiceByUUIDAndSubType(KeypadButtonSwitchService, buttonConfig.name)
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
					if(buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("Keypad '" + this.config.name + "' button '" + buttonConfig.name + "' pressed on");
						var keypadSwitchService = this.accessory.getServiceByUUIDAndSubType(KeypadButtonSwitchService, buttonConfig.name);
						if (keypadSwitchService) {
							keypadSwitchService.getCharacteristic(Characteristic.On)
								.updateValue(true);
						}
						else {
							this.log.debug("WARNING: Button #" + buttonId + " has no associated service!");
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
					if(buttonId == buttonConfig.led || buttonId == buttonConfig.id){
						// Debug
						this.log.debug("Keypad '" + this.config.name + "' button '" + buttonConfig.name + "' pressed off");
						var keypadSwitchService = this.accessory.getServiceByUUIDAndSubType(KeypadButtonSwitchService, buttonConfig.name);
						if (keypadSwitchService) {
							keypadSwitchService.getCharacteristic(Characteristic.On)
								.updateValue(false);
						}
						else {
							this.log.debug("WARNING: Button #" + buttonId + " has no associated service!");
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
