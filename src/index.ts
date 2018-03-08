var Service, Characteristic;
import { scan, parseCredentials, NowPlayingInfo, AppleTV } from 'node-appletv';

export = function(homebridge: any) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-appletv', 'AppleTV', AppleTVProgrammableSwitch);
}

class AppleTVProgrammableSwitch {
  private services: Array<any>;
  private switchService: any;
  private playService: any;
  private pauseService: any;
  private stopService: any;

  private device: AppleTV;
  private isPlaying: boolean = false;
  private lastStateMessageAt: Date;
  private stopPoller: NodeJS.Timer;
  private isEnabled: boolean = false;

  constructor(private log: (string) => void, config: {}) {
    let credentials = parseCredentials(config['credentials']);
    let that = this;
    scan(credentials.uniqueIdentifier)
      .then(devices => {
        that.device = devices[0];
        return that.device.openConnection(credentials);
      })
      .then(device => {
        return device.requestPlaybackQueue()
          .then(message => {
            return device;
          });
      })
      .then(device => {
        that.device = device;
        device.observeState((error, info) => {
          if (!info) { return; }
          if (!that.isEnabled) {
            if (that.stopPoller != null) {
              clearInterval(that.stopPoller);
              that.stopPoller = null;
            }
            return;
          }
          that.lastStateMessageAt = new Date();
          let stateIsPlaying = info.playbackState == NowPlayingInfo.State.Playing;
          let stateIsPaused = info.playbackState == NowPlayingInfo.State.Paused;
          if (stateIsPlaying && !that.isPlaying) {
            that.triggerPlay();
            that.pollForStop(() => {
              that.triggerStop();
            });
          } else if (stateIsPaused && that.isPlaying) {
            that.triggerPause();
            that.pollForStop(() => {
              that.triggerStop();
            });
          }
        });
      })
      .catch(error => {
        that.log(error);
      });
  }

  identify(callback: () => void) {
    this.log('Identify requested!');
    callback();
  }

  getServices(): Array<any> {
    if (this.services != null) {
      return this.services;
    }

    let informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Apple')
      .setCharacteristic(Characteristic.Model, 'Apple TV')
      .setCharacteristic(Characteristic.SerialNumber, '00000000');

    this.switchService = new Service.Switch("Movie Mode", "Movie Mode");
    let that = this;
    this.switchService
      .getCharacteristic(Characteristic.On)
      .on('get', callback => {
        callback(that.isEnabled);
      })
      .on('set', (value, callback) => {
        that.isEnabled = value;
        callback();
      });

    this.playService = new Service.StatelessProgrammableSwitch("Play", "Play");
    this.playService
      .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
      .setProps({ maxValue: 0 });
    this.playService
      .getCharacteristic(Characteristic.ServiceLabelIndex)
      .setValue(1);

    this.pauseService = new Service.StatelessProgrammableSwitch("Pause", "Pause");
    this.pauseService
      .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
      .setProps({ maxValue: 0 });
    this.pauseService
      .getCharacteristic(Characteristic.ServiceLabelIndex)
      .setValue(2);

    this.stopService = new Service.StatelessProgrammableSwitch("Stop", "Stop");
    this.stopService
      .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
      .setProps({ maxValue: 0 });
    this.stopService
      .getCharacteristic(Characteristic.ServiceLabelIndex)
      .setValue(3);

    this.services = [
      informationService,
      this.switchService,
      this.playService,
      this.pauseService,
      this.stopService
    ];

    return this.services;
  }

  private pollForStop(callback: () => void) {
    if (this.stopPoller != null) { return; }
    let that = this;
    this.stopPoller = setInterval(() => {
      let diff = (new Date()).getTime() - that.lastStateMessageAt.getTime();
      if (diff > 3500) {
        callback();
        clearInterval(that.stopPoller);
        that.stopPoller = null;
      } else if (diff > 2000) {
        that.device
          .requestPlaybackQueue()
          .then(info => {
            that.lastStateMessageAt = new Date();
          })
          .catch(error => {
            that.log(error);
          });
      }
    }, 500);
  }

  private triggerPlay() {
    if (!this.isEnabled) { return; }
    this.log("Triggering Play Switch Event");
    this.isPlaying = true;
    // this.playService
    //   .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    //   .setValue(0);
  }

  private triggerPause() {
    if (!this.isEnabled) { return; }
    this.log("Triggering Pause Switch Event");
    this.isPlaying = false;
    // this.pauseService
    //   .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    //   .setValue(0);
  }

  private triggerStop() {
    if (!this.isEnabled) { return; }
    this.log("Triggering Stop Switch Event");
    this.isPlaying = false;
    // this.stopService
    //   .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    //   .setValue(0);
  }
}
