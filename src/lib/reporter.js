import Capabilities from './capabilities.js';
import LS from './storage.js';

import utils from './utils.js';

let ua = {
  config: {
    protocolVersion: '1',
    dataSource: 'web'
  }
};

const inDevMode = (win) => {
  return win.isSecureContext === false || (win.location.protocol === 'http:' && win.location.port);
};

const defaultOptions = {
  trackingId: '',
  baseTelemetryCollectionUrl: 'https://ssl.google-analytics.com/collect?'
};

class Reporter {
  constructor (opts, storage, win = window, doc = document, nav = navigator) {
    if (typeof opts === 'string') {
      this.opts = {trackingId: opts};
    } else {
      this.opts = Object.assign({}, this.opts, defaultOptions);
    }
    this.trackingId = this.opts.trackingId;
    if (!this.trackingId) {
      throw new Error('`trackingId` argument required for `Reporter` (e.g., `UA-XXXXXXXXX-Y`)');
    }
    this.baseTelemetryCollectionUrl = this.opts.baseTelemetryCollectionUrl;
    this.win = win || window;
    this.doc = doc || document;
    this.nav = nav || this.win.navigator || navigator || {};
    this.storage = storage || new LS(this.win, 'xrAgent.metrics.');
    this.consented = this.hasConsented();
  }

  setTrackingId (trackingId = null) {
    this.trackingId = trackingId;
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
    this.storage.remove([
      'clientId',
      'name',
      'version',
      'settings.consent'
    ]);
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
    if (this.commandCount === null) {
      this.commandCount = {};
    }
    let base = this.commandCount;
    if (base[commandName] === null) {
      base[commandName] = 0;
    }
    this.commandCount[commandName]++;
    const params = {
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

    this.trackingId = params.trackingId || this.trackingId || this.storage.get('trackingId');
    this.clientId = this.clientId || this.storage.get('clientId');

    this.documentPath = params.documentPath || params.uri || this.uri;
    this.p = params.p || this.p || this.documentPath;

    this.dh = params.host || params.dh || this.host;
    this.dt = params.title || params.dt || this.title;
    this.dr = params.referrer || params.dr || this.dr;
    this.uip = params.remoteAddr || params.uip || this.uip;

    this.xrAgentName = this.xrAgentName || this.storage.get('name');
    this.xrAgentVersion = this.xrAgentVersion || this.storage.get('version');

    if (!navigator.onLine) {
      return;
    }

    // Reference: https://github.com/peaksandpies/universal-analytics/blob/master/AcceptableParams.md
    params = Object.assign({}, params, {
      v: ua.config.protocolVersion,  // Protocol version.
      aip: 1,  // Anonymize IP.
      tid: this.trackingId,  // Tracking ID.
      ds: ua.config.dataSource,  // Data source.
      cid: this.clientId,  // Client ID.
      dp: this.uri,
      dh: this.dh,
      dt: this.dt,
      dr: this.dr,
      p: this.p,
      uip: this.remoteAddr,
      an: this.xrAgentName,  // App Name.
      av: this.xrAgentVersion  // App Version.
    });
    params = Object.assign({}, params, this.consentedParams());
    if (this.isTelemetryConsentChoice(params)) {
      return this.request(`${this.baseTelemetryCollectionUrl}${utils.querystring.stringify(params)}`);
    }
  }

  isTelemetryConsentChoice (params) {
    return params.t === 'event' && params.ec === 'setting' && params.ea === 'settings.consent';
  }

  request (url) {
    console.log('request', url);
    return utils.postBeacon(url);
  }

  consentedParams () {
    const capabilities = new Capabilities(this.win, this.doc, this.nav);
    const hardware = capabilities.hardwareFeatures;
    const browser = capabilities.browserFeatures;
    console.log(capabilities.browserFeatures);
    return {
      sr: hardware.screenResolution,
      vp: hardware.windowSize,
      dpr: hardware.devicePixelRatio,
      capvr: browser.webvr,
      capxr: browser.webxr,
      capgp: browser.gamepads,
      capaudio: browser.webaudio,
      capwasm: browser.wasm,
      capric: browser.requestIdleCallback,
      capwebgl: browser.webgl,
      capwebgl2: browser.webgl2,
      capworker: browser.worker,
      capsw: browser.serviceworker,
      caphc: hardware.workerPoolSize,
      capws: browser.websocket,
      capwebrtc: browser.webrtc,
      capendian: hardware.endianness,
      ua: browser.userAgent
    };
  }
}

export default Reporter;
