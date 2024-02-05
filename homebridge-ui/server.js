const {
  HomebridgePluginUiServer
} = require('@homebridge/plugin-ui-utils');
const axios = require('axios');
var parseStringPromise = require('xml2js').parseStringPromise;

class UiServer extends HomebridgePluginUiServer {
  constructor() {
    // super must be called first
    super();

    this.lights = [];
    this.fans = [];
    this.keypads = [];
    this.occupancysensors = [];
    this.hvaccontrollers = [];
    this.temperaturesensors = [];
    this.visorcontrolreceivers = [];
    this.windowcoverings = [];
    //this.ccos = [];
    this.onRequest('/get-all-devices', this.getAllDevices.bind(this));
    // this.ready() must be called to let the UI know you are ready to accept api calls
    this.ready();
  }
  
  async processAreas(areas) {
    if(areas.hasOwnProperty("Area")) {
      await Promise.all(areas.Area.map(area => this.processArea(area)));
    }
  }
  async processArea(area) {
    if (area.hasOwnProperty("Areas")) {
      await Promise.all(area.Areas.map(areas => this.processAreas(areas)));
    }
    if (area.hasOwnProperty("$")) {
      if (area.hasOwnProperty("Outputs")) {
        await Promise.all(area.Outputs.map(outputs => this.processOutputs(outputs, area.$)));
      }
      if (area.hasOwnProperty("DeviceGroups")) {
        await Promise.all(area.DeviceGroups.map(deviceGroups => this.processDeviceGroups(deviceGroups, area.$)));
      }
      if (area.hasOwnProperty("HVACS")) {
        await Promise.all(area.HVACS.map(hvacs => this.processHVACS(hvacs)));
      }
    }
  }

  async processOutputs(outputs, areaInfo) {
    if (outputs.hasOwnProperty("Output")) {
      await Promise.all(outputs.Output.map(output => this.processOutput(output, areaInfo)));
    }
  }

  processOutput(output, areaInfo) {
    if (output.hasOwnProperty("$")) {
      let thing = {
        name : areaInfo.Name + " " + output.$.Name,
        id : Number(output.$.IntegrationID)
      };
      switch(output.$.OutputType) {
        case 'NON_DIM':
        case 'NON_DIM_INC':
        case 'NON_DIM_ELV':
        case 'RELAY_LIGHTING':
          this.lights.push(thing);
          break;

        case 'INC':
        case 'MLV':
        case 'ELV':
        case 'ECO_SYSTEM_FLUORESCENT':
        case 'FLUORESCENT_DB':
        case 'AUTO_DETECT':
          thing.adjustable = true;
          this.lights.push(thing);
          break;

        case 'CEILING_FAN_TYPE':
          thing.adjustable = true;
          this.fans.push(thing);
          break;

        case 'HVAC':
          this.hvaccontrollers.push(thing);
          break;


        case 'SYSTEM_SHADE':
        case 'MOTOR':
          this.windowcoverings.push(thing);
          break;

        case 'SHEER_BLIND':
          thing.blind = true;
          thing.tilt = "horizontal";
          this.windowcoverings.push(thing);
          break;

        case 'VENETIAN_BLIND':
          thing.blind = true;
          thing.tilt = "vertical";
          this.windowcoverings.push(thing);
          break;

        //To do: Allow discovery once device types are supported in plugin
        /*
        case 'CCO_PULSED':
          thing.pulsed = true;
          this.ccos.push(thing);
          break;

        case 'CCO_MAINTAINED':
          thing.pulsed = false;
          this.ccos.push(thing);
          break;
        */
      }
    }
    Promise.resolve;
  }

  async processDeviceGroups(deviceGroups, areaInfo) {
    if (deviceGroups.hasOwnProperty("DeviceGroup")) {
      await Promise.all(deviceGroups.DeviceGroup.map(deviceGroup => this.processDeviceGroup(deviceGroup, areaInfo)));
    }
    if (deviceGroups.hasOwnProperty("Device")) {
      await Promise.all(deviceGroups.Device.map(device => this.processDevice(device, areaInfo)));
    }
  }

  async processDeviceGroup(deviceGroup, areaInfo) {
    if (deviceGroup.hasOwnProperty("Devices")) {
      await Promise.all(deviceGroup.Devices.map(devices => this.processDevices(devices, areaInfo)));
    }
  }

  async processDevices(devices, areaInfo) {
    if (devices.hasOwnProperty("Device")) {
      await Promise.all(devices.Device.map(device => this.processDevice(device, areaInfo)));
    }
  }

  async processDevice(device, areaInfo) {
    if (device.hasOwnProperty("Device")) {
       await Promise.all(device.Device.map(device => this.processDevice(device, areaInfo)));
    }
    if (device.hasOwnProperty("$")) {
      let thing = {
        name : areaInfo.Name + " " + device.$.Name,
        id : Number(device.$.IntegrationID)
      };
      if (device.$.hasOwnProperty("SerialNumber")) {
        thing.serial = String(device.$.SerialNumber);
      }

      switch (device.$.DeviceType) {
        case 'MOTION_SENSOR':
          thing.id = Number(areaInfo.IntegrationID);
          thing.name = areaInfo.Name + " Occupancy Sensor";
          this.occupancysensors.push(thing);
          break;

        case 'SEETOUCH_KEYPAD':
        case 'HYBRID_SEETOUCH_KEYPAD':
        case 'INTERNATIONAL_SEETOUCH_KEYPAD':
        case 'SEETOUCH_TABLETOP_KEYPAD':
        case 'MAIN_REPEATER':
        case 'GRAFIK_EYE_QS':
          await Promise.all(device.Components.map(components => this.processComponents(components, thing, device.$.DeviceType)));
          this.keypads.push(thing);
          break;

        case 'VISOR_CONTROL_RECEIVER':
          await Promise.all(device.Components.map(components => this.processComponents(components, thing, device.$.DeviceType)));
          this.visorcontrolreceivers.push(thing);
          break;

        case 'TEMPERATURE_SENSOR':
          thing.tempSensor = true;
          this.temperaturesensors.push(thing);
          break;
        
      }
    }
    Promise.resolve;
  }

  async processComponents(components, thing, deviceType) {
    if (components.hasOwnProperty("Component")) {
      await Promise.all(components.Component.map(component => this.processComponent(component, thing, deviceType)));
    }
  }

  async processComponent(component, thing, deviceType) {
    if (component.hasOwnProperty("$")) {
      switch (component.$.ComponentType) {
        case 'BUTTON':
          await Promise.all(component.Button.map(button => this.processButton(button, component.$, thing, deviceType)));
          break;
      }
    }
  }

  processButton(button, componentInfo, thing, deviceType) {
    if (button.hasOwnProperty("$")) {
      if (button.$.hasOwnProperty("Engraving")){
        var ledOffset = 80;
        if (deviceType === 'MAIN_REPEATER') {
          ledOffset = 100;
        }
        if (!thing.hasOwnProperty("buttons")) {
          thing.buttons = [];
        }
        thing.buttons.push({
          name : button.$.Engraving,
          id : Number(componentInfo.ComponentNumber),
          led : Number(Number(componentInfo.ComponentNumber) + ledOffset)
        });
      }
    }
    Promise.resolve;
  }

  async processHVACS(hvacs) {
    if(hvacs.hasOwnProperty("hvac")) {
      await Promise.all(hvacs.HVAC.map(hvac => this.processHVAC(hvac)));
    }
  }

  processHVAC(hvac) {
    if (hvac.hasOwnProperty("$")) {
      if (!hvac.$.AvailableOperatingModes.includes("Cool")) {
        this.hvaccontrollers.find(hvaccontroller => {hvaccontroller.id === hvac.IntegrationID}).heatOnly = true;
      }
    }
    Promise.resolve;
  }

  async getAllDevices(params) {

    // try to fetch the xml
    const response = await axios.get("http://" + params.repeater + "/DbXmlInfo.xml");
    if (response.status == 200) {
      const result = await parseStringPromise(response.data);
      await Promise.all(result.Project.Areas.map(areas => this.processAreas(areas)));

      return {
        success: true,
        lights: this.lights,
        fans: this.fans,
        keypads: this.keypads,
        occupancysensors: this.occupancysensors,
        hvaccontrollers: this.hvaccontrollers,
        temperaturesensors: this.temperaturesensors,
        visorcontrolreceivers: this.visorcontrolreceivers,
        windowcoverings: this.windowcoverings
      }

    } else {
      return {
        success: false,
        error: '! Unable to discover devices'
      }
    }
  }
}

// start the instance of the class
(() => {
  return new UiServer;
})();