var request = require('request');

let Service, Characteristic, TargetDoorState, CurrentDoorState;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  TargetDoorState = Characteristic.TargetDoorState;
  CurrentDoorState = Characteristic.CurrentDoorState;
  homebridge.registerAccessory('homebridge-sonoff-garage-opener', 'Sonoff Garage Door Opener', GarageDoorOpener);
};

class GarageDoorOpener {
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.ip = config.ip;
    this.openCloseTime = config.openCloseTime || 0;
    this.openingTime = config.openingTime || this.openCloseTime;
    this.closureTime = config.closureTime || this.openingTime;
    this.doorRelayPin = config.doorRelayPin;
    this.timeBeforeClosure = config.timeBeforeClosure || 0;

    this.currentDoorState = CurrentDoorState.CLOSED;
    this.targetDoorState = TargetDoorState.CLOSED;
  }

  identify(callback) {
    this.log('Identify requested!');
    callback(null);
  }
  //Pulse,15,1,1000
  openCloseGarage(callback) {

    request.get({
      url: 'http://' + this.ip + '/cm?cmnd=Power' + this.doorRelayPin + ',1,500' /*+ (cmd || 'Signal')*/,
      timeout: 120000
    }, (error, response, body) => {
      this.log.debug('openCloseGarage',response.statusCode,body);
      if (!error && response.statusCode == 200) {
        //this.log.debug('Response: %s', body);
        callback();
      }

      //this.log.debug('Error setting door state. (%s)', error);
    });

  }

  getServices() {
    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Dualbit')
      .setCharacteristic(Characteristic.Model, 'Sonoff Garage Door Opener')
      .setCharacteristic(Characteristic.SerialNumber, '0xl33t');

    this.service = new Service.GarageDoorOpener(this.name, this.name);
    this.service.setCharacteristic(TargetDoorState, TargetDoorState.CLOSED);
    this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSED);

    this.service.getCharacteristic(TargetDoorState)
      .on('get', (callback) => {
        callback(null, this.targetDoorState);
      })
      .on('set', (value, callback) => {
        this.targetDoorState = value;
        clearTimeout(this.timerBeforeClosure);
        if (this.targetDoorState === TargetDoorState.OPEN) {
          // want to open
          if (this.currentDoorState === CurrentDoorState.CLOSED) {
            this.openCloseGarage(() =>
              this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPENING));
          } else if (this.currentDoorState === CurrentDoorState.OPENING) {
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
            this.openCloseGarage(() =>
              this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPENING));
          } else if (this.currentDoorState === CurrentDoorState.OPEN) {
            // Do nothing
          }
        } else if (this.targetDoorState === TargetDoorState.CLOSED) {
          if (this.currentDoorState === CurrentDoorState.CLOSED) {
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.OPENING) {
            this.openCloseGarage(() =>
              this.openCloseGarage(() =>
                this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSING)));
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.OPEN) {
            this.openCloseGarage(() =>
              this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSING));
          }
        }
        callback();
      });

    this.service.getCharacteristic(CurrentDoorState)
      .on('get', (callback) => {
        callback(null, this.currentDoorState);
      })
      .on('set', (value, callback) => {
        this.currentDoorState = value;
        this.log('current status: ', this.doorStateToString(this.currentDoorState));
        if (this.currentDoorState === CurrentDoorState.OPENING) {
          clearTimeout(this.openCloseTimer);
          this.doorOpenStartTime = new Date();
          const timeSinceDoorStartedClosing = new Date() - this.doorCloseStartTime;
          let openingTimer = this.openCloseTime != 0 ? this.openCloseTime : this.openingTime;
          let stateChangeTimer = openingTimer;
          if (timeSinceDoorStartedClosing < openingTimer) {
            stateChangeTimer = timeSinceDoorStartedClosing;
          }
          this.openCloseTimer = setTimeout(() => {
            this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPEN);
          }, stateChangeTimer);
        } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
          clearTimeout(this.openCloseTimer);
          this.doorCloseStartTime = new Date();
          const timeSinceDoorStartedOpening = new Date() - this.doorOpenStartTime;
          let closureTimer = this.openCloseTime != 0 ? this.openCloseTime : this.closureTime;
          let stateChangeTimer = closureTimer;
          if (timeSinceDoorStartedOpening < closureTimer) {
            stateChangeTimer = timeSinceDoorStartedOpening;
          }
          this.openCloseTimer = setTimeout(() => {
            this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSED);
          }, stateChangeTimer);
        } else if (this.currentDoorState === CurrentDoorState.OPEN) {
          if (this.timeBeforeClosure != 0) {
            this.log.debug('AUTOCLOSING in ' + this.timeBeforeClosure / 1000 + ' SECONDS');
            this.timerBeforeClosure = setTimeout(() => {
              this.targetDoorState = TargetDoorState.CLOSED;
              this.openCloseGarage(() =>
                this.service.setCharacteristic(TargetDoorState, TargetDoorState.CLOSED));
            }, this.timeBeforeClosure);
          } else {
            this.service.setCharacteristic(TargetDoorState, TargetDoorState.CLOSED);
          }
        }
        callback();
      });

    this.service
      .getCharacteristic(Characteristic.Name)
      .on('get', callback => {
        callback(null, this.name);
      });

    return [informationService, this.service];
  }

  doorStateToString(state) {
    switch (state) {
    case CurrentDoorState.OPEN:
      return 'OPEN';
    case CurrentDoorState.CLOSED:
      return 'CLOSED';
    case CurrentDoorState.STOPPED:
      return 'STOPPED';
    case CurrentDoorState.OPENING:
      return 'OPENING';
    case CurrentDoorState.CLOSING:
      return 'CLOSING';
    default:
      return 'UNKNOWN';
    }
  }

}
