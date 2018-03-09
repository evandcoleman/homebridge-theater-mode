"use strict";
var Service, Characteristic;
var node_appletv_1 = require("node-appletv");
var AppleTVProgrammableSwitch = /** @class */ (function () {
    function AppleTVProgrammableSwitch(log, config) {
        this.log = log;
        this.playbackState = AppleTVProgrammableSwitch.PlaybackState.Stopped;
        this.isEnabled = false;
        var credentials = node_appletv_1.parseCredentials(config['credentials']);
        var that = this;
        node_appletv_1.scan(credentials.uniqueIdentifier)
            .then(function (devices) {
            that.device = devices[0];
            return that.device.openConnection(credentials);
        })
            .then(function (device) {
            return device.requestPlaybackQueue()
                .then(function (message) {
                return device;
            });
        })
            .then(function (device) {
            that.device = device;
            device.observeState(function (error, info) {
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
                var stateIsPlaying = info.playbackState == node_appletv_1.NowPlayingInfo.State.Playing;
                var stateIsPaused = info.playbackState == node_appletv_1.NowPlayingInfo.State.Paused;
                if (stateIsPlaying && !that.isPlaying()) {
                    that.triggerPlay();
                    that.pollForStop(function () {
                        that.triggerStop();
                    });
                }
                else if (stateIsPaused && that.isPlaying()) {
                    that.triggerPause();
                    that.pollForStop(function () {
                        that.triggerStop();
                    });
                }
                else if (Object.keys(info.message.supportedCommands).length == 0 && !that.isStopped()) {
                    clearInterval(that.stopPoller);
                    that.stopPoller = null;
                    that.triggerStop();
                }
            });
        })
            .catch(function (error) {
            that.log(error);
        });
    }
    AppleTVProgrammableSwitch.prototype.isPlaying = function () {
        return this.playbackState == AppleTVProgrammableSwitch.PlaybackState.Playing;
    };
    AppleTVProgrammableSwitch.prototype.isPaused = function () {
        return this.playbackState == AppleTVProgrammableSwitch.PlaybackState.Paused;
    };
    AppleTVProgrammableSwitch.prototype.isStopped = function () {
        return this.playbackState == AppleTVProgrammableSwitch.PlaybackState.Stopped;
    };
    AppleTVProgrammableSwitch.prototype.identify = function (callback) {
        this.log('Identify requested!');
        callback();
    };
    AppleTVProgrammableSwitch.prototype.getServices = function () {
        if (this.services != null) {
            return this.services;
        }
        var informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Apple')
            .setCharacteristic(Characteristic.Model, 'Apple TV')
            .setCharacteristic(Characteristic.SerialNumber, '00000000');
        this.switchService = new Service.Switch("Movie Mode", "Movie Mode");
        var that = this;
        this.switchService
            .getCharacteristic(Characteristic.On)
            .on('get', function (callback) {
            callback(that.isEnabled);
        })
            .on('set', function (value, callback) {
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
    };
    AppleTVProgrammableSwitch.prototype.pollForStop = function (callback) {
        if (this.stopPoller != null) {
            return;
        }
        var that = this;
        this.stopPoller = setInterval(function () {
            var diff = (new Date()).getTime() - that.lastStateMessageAt.getTime();
            if (diff > 3500) {
                callback();
                clearInterval(that.stopPoller);
                that.stopPoller = null;
            }
            else if (diff > 2000) {
                that.device
                    .requestPlaybackQueue()
                    .then(function (info) {
                    that.lastStateMessageAt = new Date();
                })
                    .catch(function (error) {
                    that.log(error);
                });
            }
        }, 500);
    };
    AppleTVProgrammableSwitch.prototype.triggerPlay = function () {
        if (!this.isEnabled) {
            return;
        }
        this.log("Triggering Play Switch Event");
        this.playbackState = AppleTVProgrammableSwitch.PlaybackState.Playing;
        this.playService
            .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
            .setValue(0);
    };
    AppleTVProgrammableSwitch.prototype.triggerPause = function () {
        if (!this.isEnabled) {
            return;
        }
        this.log("Triggering Pause Switch Event");
        this.playbackState = AppleTVProgrammableSwitch.PlaybackState.Paused;
        this.pauseService
            .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
            .setValue(0);
    };
    AppleTVProgrammableSwitch.prototype.triggerStop = function () {
        if (!this.isEnabled) {
            return;
        }
        this.log("Triggering Stop Switch Event");
        this.playbackState = AppleTVProgrammableSwitch.PlaybackState.Stopped;
        this.stopService
            .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
            .setValue(0);
    };
    return AppleTVProgrammableSwitch;
}());
(function (AppleTVProgrammableSwitch) {
    var PlaybackState;
    (function (PlaybackState) {
        PlaybackState["Playing"] = "playing";
        PlaybackState["Paused"] = "paused";
        PlaybackState["Stopped"] = "stopped";
    })(PlaybackState = AppleTVProgrammableSwitch.PlaybackState || (AppleTVProgrammableSwitch.PlaybackState = {}));
})(AppleTVProgrammableSwitch || (AppleTVProgrammableSwitch = {}));
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-appletv', 'AppleTV', AppleTVProgrammableSwitch);
};
