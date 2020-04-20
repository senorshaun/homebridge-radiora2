# homebridge-radiora2
Lutron RadioRA2 plugin for homebridge
# Installation

1. Install homebridge using: npm install -g homebridge <br>
2. Install this plugin using npm install -g homebridge-radiora2
3. Using your RadioRA2 software, create a new integration user (only needs read access).
4. Run an integration report to get the ID numbers for your devices as needed.
5. Update your configuration file. See sample-config below for a sample.

# Configuration Sample

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
        "serial": "01afwd56"
        "model": "RRD-6ND-LA"
        "adjustable": true
      }
     ],
     "fans":[
       {
         "id": 18,
         "adjustable": true,
         "onvalue": 25
       }
      ],
      "keypads":[
        {
        "name": "Phantom Keypad",
        "id": 21,
        "buttons":[
          {
            "name": "Night Light Levels",
            "id": 1,
            "led": 81
          }
        ]
      }
    ]
  }
]
```

- platform: RadioRA2
- name: can be anything you want
- repeater: the IP address of the main repeater
- username: the intergration username you created
- password: the integration password you created
- debug: optional parameter, will return details in log around response from the repeater.

Accessory Types in array groups
  - lights
  - fans
  - occupancysensors
  - keypads

Each entry in the array groups have the following
  - name: (required) the name of the accessory
  - id: (required) the integration ID of that accessory
  - serial: (optional) for description, default: <id>
  - model: (optional) for description, default: <accessory type>

Lights and Fans
  - adjustable: (optional) boolean value to determine if it is a dimmer or switch, default false
  - onvalue: (optional) if the accessory is a dimmer, you can set the value that it turns on to when tapping on the tile, default: 100

Keypads
  - stateless: (optional) determines if these are  2 way buttons that will also trigger a lutron button press (false) or listen only buttons that will trigger a HomeKit action (true), default: false
  - buttons: (required) array group defining the buttons on the keypad exposed to HomeKit

Each button in the array has
  - name: (required) engraving name
  - id: (required) integration ID of that button
  - led: (required) the integration ID of that button used for statusing

# Roadmap
- Shades eventually


# Notes



# Credits
[djMax](https://github.com/djMax)/[homebridge-radiora](https://github.com/djMax/homebridge-radiora) for the inital telnet communication as well as [alistairg](https://github.com/alistairg)/[homebridge-lutron](https://github.com/alistairg/homebridge-lutron) for some additional functionality.
