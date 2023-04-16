# Homebridge Tasmota Garage Door Opener

This is a [homebridge](https://github.com/nfarina/homebridge) plugin to connect with a Sonoff Relay Board with Tasmota firmware into a Garage Door Opener via the Home app on iOS using Homekit.

![](sonoff-garage-opener.gif)

I created this because there wasn't another plugin for Sonoff-4CH Pro with Tasmota with the Garage Door interface/features.

Features are:

- Can set autoclosing timer
- Can set opening and closure timers different from each other
- Can set also 0 as openCloseTime, useful for doors or gates with locks that can be open but not closed again
- Can choose the relay to trigger (mapping done in index.js, don’t know if they are the same for every Sonoff)


Just add the following config to your homebridge config file located at this (default) path `~/.homebridge/config.json`.

```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:50",
    "port": 51826,
    "pin": "031-45-154"
  },

  "description": "",

  "accessories": [
    {
      "accessory": "Sonoff Garage Door Opener",
      "name": "Pi Garage Opener",
      "ip": "192.168.2.75",
      "password": "yourpassword",
      "doorRelayPin": 4,
      "openCloseTime": 30000,
      "openingTime": 27000,
      "closureTime": 30000,
      "timeBeforeClosure": 10000
    }
  ],

  "platforms": [
  ]
}
```

openingTime and closureTime should be used only if opening and closure times are different.

Also a openCloseTime = 0 can be set for these doors/gates that have just a lock to open. The advantage of using this instead of a common switch is that Apple requires all security Homekit devices to ask for passcode / TouchID / FaceID before triggering this kind of devices.
No more wrong taps on the door unlock!

CREDITS for original plugin that I used as a template goes to @ankurp. Thank you man!
