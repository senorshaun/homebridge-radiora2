# homebridge-radiora2
Lutron RadioRA2 plugin for homebridge

## Features
* Auto detection of all devices
* Pico integration with press length configuration


## Installation
Install homebridge using
```
npm install -g homebridge
```
Install this plugin using
```
npm install -g homebridge-radiora2
```
Using your RadioRA2 software, create a new integration user (only needs read access).

## Configuration
There are two options for configuration this plugin. First, you can use the `Homebridge-UI` interface.
Enter your integration user and password, as well as the ip address of the main repeater. Save that, then open the interface again and click discover. This should pull all light switches/dimmers, fan controls/switches, keypads, thermostats, occupancy sensor, and visor control receivers from the main repeater. If will get the name and integration ID of those devices, and on some the serial number. You can then add in model numbers and serial numbers that may be missing should you want. Save that config and restart homebridge to get the control.

Alternatively, you can run an integration report in Lutron to get the ID numbers for your devices as needed. Then add the device entries either using the `Homebridge-UI` interface or manually to the config.json file. The integration username, password, repeater ip address, and the plugin name as realso required. 

## Configuration Sample

```
"platforms": [
  {
    "name": "RadioRA2",
    "repeater": "<IP_Address_of_Main_Repeater",
    "username": "<integration_username_you_created>",
    "password": "<integration_username_you_created>",
    "lights":[
      {
        "name": "Main Lights",
        "id": 14,
        "serial": "01afwd56", //optional
        "model": "RRD-6ND-LA", //optional
        "adjustable": true, //optional: default = false.
        "onvalue": 100, //optional: default = 100. value that the item will turn on to. ignored if adjustable is not set to true
        "exclude": false //optional: default = false. useful if you don't want something to show in homekit, but it gets auto-detected
      }
    ],
   "fans":[
     {
       "id": 18,
       "name": "Main Fan",
       "serial": "", //
       "model": "RRD-2ANF-LA", //
       "adjustable": true, //
       "onvalue": 25, //default = 75
       "exclude": false //
     }
    ],
    "keypads":[
      {
        "name": "Phantom Keypad",
        "id": 21,
        "serial": "", //
        "model": "", //
        "pico": true, //optional: default = false. This will configure the keypad (all buttons) to be stateless listener buttons. It will enable 3 homekit buttons per lutron button (single, double, long) that can then be configured in homekit to trigger actions when pressed
        "buttons":[
          {
            "name": "Night Light Levels",
            "id": 1,
            "led": 81,
            "longpressrepeat": true, //optional: default = false. ignored unless pico = true. the HomeKit button will be repeatedly pressed while the Lutron button is held. Useful for raise/lower actions in HomeKit
            "repeattime": 500, //optional: default = 500. ignored unless pico = true and longpressrepeat = true. The milliseconds used in between homekit button presses while the lutron button is being held
            "repeatmax": 100, //optional: default = 100. ignored unless pico = true and longpressrepeat = true. the number of times a homekit button will be pressed while a lutron button is held. useful for when a lutron button get stuck or there is a communication issue
            "clicktime": 500, //optional: default = 500. ignored unless pico = true. The millisecond listen to to determine if a lutron button press is a single press, double press, or long press
            "exclude": false //
          }
        ],
        "exclude": false //
      }
    ],
    "occupancysensors":[
      {
        "name": "Living Room Occupancy Sensor",
        "id": 6,
        "serial": "0266473A", //
        "model": "LRF2-OCR2B-P-WH", //
        "exlude": false //
      }
    ],
    "hvaccontrollers":[
      {
        "name": "Living Room Thermostat",
        "id": 36,
        "serial": "0266473A", //
        "model": "LR-HWLV-HVAC", //
        "heatOnly": true, //optional: default = false. Used for heat only situations (no cooling or auto)
        "exclude": false //
      }
    ],
        "visorcontrolreceivers":[
      {
        "name": "Garage Visor Control Receiver",
        "id": 22,
        "serial": "0266473A", //
        "model": "RR-VCRX-WH", //
        "buttons":[
          {
            "name": "Garage Lights 100",
            "id": 1,
            "led": 81, 
            "exclude": false //
          }
        ],
        "inputs":[
          {
            "name": "Garage Door Closed",
            "id": 3,
            "led": 83,
            "exclude": false //
          }
        ],
        "outputs":[
          {
            "name": "Garage Door Control",
            "id": 5,
            "exclude": false //
          }
        ],
        "exclude": false //
      }
    ]
  }
]
```

- platform: RadioRA2
- name: can be anything you want, its what will be displaced in the homekit logs
- repeater: the IP address of the main repeater
- username: the intergration username you created
- password: the integration password you created
- debug: optional parameter, will return details in log around response from the repeater.


## Roadmap
- Shades eventually
- Remote temp sensors to report their temperature (I'll need to get one of these to test)


## Credits
[djMax](https://github.com/djMax)/[homebridge-radiora](https://github.com/djMax/homebridge-radiora) for the inital telnet communication as well as [alistairg](https://github.com/alistairg)/[homebridge-lutron](https://github.com/alistairg/homebridge-lutron) for some additional functionality.
