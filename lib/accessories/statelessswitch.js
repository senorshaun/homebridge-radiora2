let Characteristic, KeypadButtonStatelessSwitchService;

module.exports = class KeypadButtonStateless {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        KeypadButtonStatelessSwitchService = homebridge.hap.Service.StatelessProgrammableSwitch;
        this.accessory = accessory;
        this.log = log;
        this.radiora2 = radiora2;
        this.config = config;
        this.accessory
            .getService(homebridge.hap.Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Model, this.config.model.toString() || "Keypad")
            .setCharacteristic(Characteristic.SerialNumber, ("Keypad" + this.config.id).toString());
        this.accessory.updateReachability(true);
        this.setupListeners();
    }

    setupListeners() {

        // Button Pressed
        this.radiora2.on("buttonPress", function (integrationId, buttonId) {
            if (integrationId == this.config.id) {
                // Debug
                this.log.debug("Keypad '" + this.config.name + "' button #" + buttonId + " PRESSED");
                // See if we can find a button characteristic that matches
                var buttonService = this.accessory.getServiceByUUIDAndSubType(KeypadButtonStatelessSwitchService, "Button " + buttonId);
                if (buttonService) {
                    buttonService.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                        .updateValue(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
                }
                else {
                    this.log.debug("WARNING: Button #" + buttonId + " has no associated service!");
                }
            }
        }.bind(this));
    }
}