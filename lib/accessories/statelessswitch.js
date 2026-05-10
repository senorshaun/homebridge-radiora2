let Characteristic, Service, buttonArray;

module.exports = class KeypadButtonStateless {

    constructor(log, config, accessory, radiora2, homebridge) {
        Characteristic = homebridge.hap.Characteristic;
        Service = homebridge.hap.Service
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
        this.clickProcessor = {};
    }

    initializeButtons() {

        buttonArray.forEach(function(buttonConfig){
            if (!buttonConfig.disabled) {
                let label = ("Button " + buttonConfig.id).toString();
                let service = this.accessory.getServiceByUUIDAndSubType(Service.StatelessProgrammableSwitch, label);
                if (!service) {
                    let service = this.accessory.addService(Service.StatelessProgrammableSwitch, buttonConfig.name || label, label);
                    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({maxValue: 2});
                }
                this.accessory
                    .getServiceByUUIDAndSubType(Service.StatelessProgrammableSwitch, label)
                    .existsInConfig = true;
            }
        }.bind(this));

        this.accessory.services.forEach(function(accessoryService) {
            var thisButton = this.accessory.getServiceByUUIDAndSubType(Service.StatelessProgrammableSwitch, accessoryService.displayName);
            if (thisButton && thisButton.existsInConfig != true) {
                this.accessory.removeService(thisButton);
                this.log.info("Deleted removed keypad button", this.config.name);
            }
        }.bind(this));
    }

    setupListeners() {

        // Button action
        this.radiora2.on("buttonAction", function (integrationId, buttonId, action) {
            if (integrationId == this.config.id) {
                this.eventHandler({"button": buttonId, "action": action});
            }
        }.bind(this));
    }

    eventHandler(event) {
        let eventKey = `${event.button}`;
        if (!this.clickProcessor[eventKey]) {
            let buttonConfig = this.config.buttons.find(button => button.id == event.button);
            if (buttonConfig) {
                this.clickProcessor[eventKey] = new Click(event, buttonConfig.clicktime || 500, buttonConfig.repeattime || 500, this.log, buttonConfig.longpressrepeat || false, buttonConfig.repeatmax || 100, this.clickHandler.bind(this));
            }
        } else {
            this.clickProcessor[eventKey].click(event);
        }
    }
    clickHandler(event) {
        this.trigger(event.button, event.click);
    }

    trigger(buttonId, clickValue){
        const clickType = ['single', 'double', 'long'];
        // Debug
        this.log.debug("[Button #" + buttonId + "] " + clickType[clickValue] +  " pressed", this.config.name);
        // See if we can find a button characteristic that matches
        var service = this.accessory.getServiceByUUIDAndSubType(Service.StatelessProgrammableSwitch, "Button " + buttonId);
        if (service) {
            service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(clickValue);
        }
        else {
            this.log.debug("WARNING: Button #" + buttonId + " has no associated service!", this.config.name);
        }
    }

}

class Click {
    constructor(event, doubleClickTime, repeatTime, log, repeat, repeatMax, callback) {
        this.button = event.button;
        this.doubleClickTime = doubleClickTime;
        this.repeatTime = repeatTime;
        this.repeatMax = repeatMax;
        this.log = log;
        this.repeat = repeat;
        this.callback = callback;
        this.repeatCount = 0;
        this.click(event);
    }

    click(event) {
        switch (event.action) {
        case '3': // Down
            if (this.timer) {
                this._finished(true);
            } else {
                this._setTimer();
            }
            break;
        case '4': // Up
            if (this.timer) {
                this.ups++;
            }
            break;
        }
    }

    _setTimer(milliseconds = this.doubleClickTime) {
        this.timer = setTimeout(this._finished.bind(this), milliseconds);
        this.ups = 0;
    }

    _finished(doubleClick = false) {
        let event = {};
        event.button = this.button;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        if (doubleClick) {
            event.click = 1;
        } else if (this.ups == 0) {
            event.click = 2;
            if (this.repeat) {
                this.repeatCount++;
                if (this.repeatCount < this.repeatMax) {
                    this._setTimer(this.repeatTime);
                } else {
                    this.repeatCount = 0;
                }
            }
        } else {
            event.click = 0;
        }
        if (this.repeatCount == 0 || (this.repeatCount > 0 && event.click == 2)) {
            this.callback(event);
        } else {
            this.repeatCount = 0;
        }
    }
}
