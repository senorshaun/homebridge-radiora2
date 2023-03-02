"use strict";
class Logger {
    constructor(log, debugMode = false, rawMode = false) {
        this.log = log;
        this.debugMode = debugMode || process.argv.includes('-D') || process.argv.includes('--debug');
        this.rawMode = rawMode;
    }
    formatMessage(message, device) {
        let formatted = '';
        if (device) {
            formatted += '[' + device + '] ';
        }
        formatted += message;
        return formatted;
    }
    info(message, device) {
        this.log.info(this.formatMessage(message, device));
    }
    warn(message, device) {
        this.log.warn(this.formatMessage(message, device));
    }
    error(message, device) {
        this.log.error(this.formatMessage(message, device));
    }
    debug(message, device, alwaysLog = false) {
        if (this.debugMode) {
            this.log.info(this.formatMessage(message, device));
        }
        else if (alwaysLog) {
            this.info(message, device);
        } else {
            this.log.debug(this.formatMessage(message, device));
        }
    }
    raw(message, device, alwaysLog = false) {
        if (this.rawMode) {
            this.log.info(this.formatMessage(message, device));
        }
        else if (alwaysLog) {
            this.info(message, device);
        } else {
            this.log.debug(this.formatMessage(message, device));
        }
    }
}
exports.Logger = Logger;