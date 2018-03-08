"use strict";
var Service, Characteristic;
const node_appletv_1 = require("node-appletv");
class AppleTVProgrammableSwitch {
    constructor(log, config) {
        this.log = log;
        this.isPlaying = false;
        this.isEnabled = false;
        let credentials = node_appletv_1.parseCredentials(config['credentials']);
        let that = this;
        node_appletv_1.scan(credentials.uniqueIdentifier)
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
                if (!info) {
                    return;
                }
                if (!that.isEnabled) {
                    if (that.stopPoller != null) {
                        clearInterval(that.stopPoller);
                        that.stopPoller = null;
                    }
                    return;
                }
                that.lastStateMessageAt = new Date();
                let stateIsPlaying = info.playbackState == node_appletv_1.NowPlayingInfo.State.Playing;
                let stateIsPaused = info.playbackState == node_appletv_1.NowPlayingInfo.State.Paused;
                if (stateIsPlaying && !that.isPlaying) {
                    that.triggerPlay();
                    that.pollForStop(() => {
                        that.triggerStop();
                    });
                }
                else if (stateIsPaused && that.isPlaying) {
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
    identify(callback) {
        this.log('Identify requested!');
        callback();
    }
    getServices() {
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
    pollForStop(callback) {
        if (this.stopPoller != null) {
            return;
        }
        let that = this;
        this.stopPoller = setInterval(() => {
            let diff = (new Date()).getTime() - that.lastStateMessageAt.getTime();
            if (diff > 3500) {
                callback();
                clearInterval(that.stopPoller);
                that.stopPoller = null;
            }
            else if (diff > 2000) {
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
    triggerPlay() {
        if (!this.isEnabled) {
            return;
        }
        this.log("Triggering Play Switch Event");
        this.isPlaying = true;
        // this.playService
        //   .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
        //   .setValue(0);
    }
    triggerPause() {
        if (!this.isEnabled) {
            return;
        }
        this.log("Triggering Pause Switch Event");
        this.isPlaying = false;
        // this.pauseService
        //   .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
        //   .setValue(0);
    }
    triggerStop() {
        if (!this.isEnabled) {
            return;
        }
        this.log("Triggering Stop Switch Event");
        this.isPlaying = false;
        // this.stopService
        //   .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
        //   .setValue(0);
    }
}
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-appletv', 'AppleTV', AppleTVProgrammableSwitch);
};
