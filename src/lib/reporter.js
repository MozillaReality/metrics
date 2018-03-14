/* global XMLHttpRequest */
import LS from './storage.js';

import { Capbilities, postBeacon, querystring } from './utils.js';

const inDevMode = (win) => {
  return win.isSecureContext === false || (win.location.protocol === 'http:' && win.location.port);
};

class Reporter {
  constructor (tid = '', storage, win = window, doc = document) {
    if (!tid) {
      throw new Error('`tid` argument required for `Reporter` (e.g., `XXXXXX-YY`)');
    }
    this.tid = tid;
    this.win = win || window;
    this.doc = doc || document;
    this.storage = storage || new LS(this.win, 'xrAgent.metrics.');
    this.consented = this.hasConsented();
  }

  settid (tid = null) {
    this.tid = tid;
  }

  saveConsent (consented = true) {
    if (this.hasConsented()) {
      return false;
    }
    this.storage.set('settings.consent', consented ? 'true' : 'false');
    return true;
  }

  removeConsent (consented = true) {
    if (!this.hasConsented()) {
      return false;
    }
    this.storage.remove('clientId');
    this.storage.remove('name');
    this.storage.remove('version');
    this.storage.remove('settings.consent');
    return true;
  }

  hasConsented () {
    if (this.consented === true) {
      return true;
    }
    return this.storage.get('settings.consent') !== 'false';
  }

  sendPageView (path, hostname, title, extraParams) {
    const params = {
      t: 'pageview',
      path,
      hostname,
      title,
      params: extraParams
    };
    return this.send(params);
  }

  sendEvent (category, action, label, value) {
    const params = {
      t: 'event',
      ec: category,
      ea: action
    };
    if (label !== null) {
      params.el = label;
    }
    if (value !== null) {
      params.ev = value;
    }
    return this.send(params);
  }

  sendTiming (category, name, value) {
    const params = {
      t: 'timing',
      utc: category,
      utv: name,
      utt: value
    };
    return this.send(params);
  }

  sendException (description) {
    const params = {
      t: 'exception',
      exd: description,
      exf: inDevMode(this.win) ? '0' : '1'
    };
    return this.send(params);
  }

  sendCommand (commandName) {
    let base;
    let params;
    if (this.commandCount === null) {
      this.commandCount = {};
    }
    if ((base = this.commandCount)[commandName] === null) {
      base[commandName] = 0;
    }
    this.commandCount[commandName]++;
    params = {
      t: 'event',
      ec: 'command',
      ea: commandName.split(':')[0],
      el: commandName,
      ev: this.commandCount[commandName]
    };
    return this.send(params);
  }

  send (params) {
    if (!this.hasConsented()) {
      return;
    }

    this.tid = params.tid || this.tid || this.storage.get('tid');
    this.clientId = this.clientId || this.storage.get('clientId');

    this.dp = params.dp || params.uri || this.uri;
    this.p = params.p || this.p || this.dp;

    this.dh = params.host || params.dh || this.host;
    this.dt = params.title || params.dt || this.title;
    this.dr = params.referrer || params.dr || this.dr;
    this.uip = params.remoteAddr || params.uip || this.uip;

    this.xrAgentName = this.xrAgentName || this.storage.get('name');
    this.xrAgentVersion = this.xrAgentVersion || this.storage.get('version');

    if (!navigator.onLine) {
      return;
    }

    params = Object.assign({}, params, {
      v: '1',  // Protocol version.
      aip: 1,  // Anonymize IP.
      tid: this.tid,  // Tracking ID.
      ds: 'web',  // Data source.
      // cd: this.screenName,  // TODO: Add Screen Name.
      cid: this.clientId,  // Client ID.
      dp: this.uri,
      dh: this.dh,
      dt: this.dt,
      dr: this.dr,
      p: this.p,
      uip: this.remoteAddr,
      an: this.xrAgentName,  // App Name.
      av: this.xrAgentVersion,  // App Version.
      aiid: ''  // TODO: Add App Installer ID.
    });
    params = Object.assign({}, params, this.consentedParams());
    if (this.isTelemetryConsentChoice(params)) {
      return this.request(`https://ssl.google-analytics.com/collect?${querystring.stringify(params)}`);
    }
  }

  isTelemetryConsentChoice (params) {
    return params.t === 'event' && params.ec === 'setting' && params.ea === 'settings.consent';
  }

  request (url) {
    return postBeacon(url);
  }

  consentedParams () {
    const capabilities = new Capabilities(this.win);
    return {
      sr: capabilities.hardwareFeatures.screenSize,
      vp: capabilities.hardwareFeatures.windowSize,
      dpr: capabilities.hardwareFeatures.devicePixelRatio,
      capvr: capabilities.browserFeatures.webvr,
      capxr: capabilities.browserFeatures.webxr
      capgp: capabilities.browserFeatures.gamepads,
      capaudio: capabilities.browserFeatures.webaudio,
      capwasm: capabilities.browserFeatures.wasm,
      capric: capabilities.browserFeatures.requestIdleCallback,
      capwebgl: capabilities.browserFeatures.webgl,
      capwebgl2: capabilities.browserFeatures.webgl2,
      capworker: capabilities.browserFeatures.worker,
      capsw: capabilities.browserFeatures.serviceworker,
      caphc: capabilities.hardwareFeatures.workerPoolSize,
      capws: capabilities.browserFeatures.websocket,
      capwebrtc: capabilities.browserFeatures.webrtc,
      capendian: capabilities.hardwareFeatures.endianness,
      ua: this.win.navigator.userAgent
    };
  }
}

export default Reporter;
