# homebridge-harmony-api

> A [homebridge](https://github.com/nfarina/homebridge) plugin for controlling individual Harmony Hub devices via [harmony-api](https://github.com/maddox/harmony-api).

[![npm version](https://badge.fury.io/js/homebridge-harmony-api.svg)](https://badge.fury.io/js/homebridge-harmony-api)
[![License][license-image]][license-url]

`homebridge-harmony-api` currently supports `Switch`, `Fan`, and `Speaker` accessory types.

## Installation

This guide assumes that you already have a running [`harmony-api`](https://github.com/maddox/harmony-api) server.

```
# Install homebridge
$ npm install -g homebridge

# Install plugin
$ npm install -g homebridge-harmony-api
```

or add `homebridge-harmony-api` to your `install.sh` file.

## Configuration

Configuration is as simple as adding a new `accessories` object for each device you'd like to control. Below is an example for an IR controlled air conditioner that I've taught my Harmony Hub to control. For more examples, see [config.example.json](config.example.json).

```json
{
  "accessory": "HarmonyDevice",
  "name": "Living Room Air Conditioner",
  "service": "Fan",
  "host": "localhost",
  "port": 8282,
  "hub_slug": "living-room",
  "device_slug": "air-conditioner",
  "commands": {
    "on": "power-toggle",
    "off": "power-toggle",
    "rotation_speed": {
      // the keys here correspond to the rotation speed percentage,
      // the values are the corresponding command to send
      "33": "low",
      "67": "med",
      "100": "high"
    }
  }
}
```

## Caveats

`harmony-api` currently conflicts with the [`homebridge-harmonyhub`](https://github.com/KraigM/homebridge-harmonyhub) plugin. You won't be able to run them on the same host because they bind to the same port to discover harmony hubs on your network. My personal workaround for this is to link my Harmony Activities to HomeKit via my SmartThings hub and then using the [`homebridge-smartthings`](https://github.com/pdlove/homebridge-smartthings) plugin. In the future I'd like to add support for harmony activities to this plugin.

## TODO

* Add support for harmony hub activities
* Investigate adding support for more HomeKit services and characteristics

## Meta

You can find me on Twitter [@edc1591](https://twitter.com/edc1591)

[Hire me!](http://edc.me)

Distributed under the MIT license. See ``LICENSE`` for more information.

[license-image]: https://img.shields.io/badge/License-MIT-blue.svg
[license-url]: LICENSE