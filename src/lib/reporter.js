/* global localStorage, XMLHttpRequest */
let querystring = {};
function strictUriEncode (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);
}
function encode (value, opts) {
  if (opts.encode) {
    return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
  }
  return value;
}
querystring.stringify = (obj, opts) => {
  if (!obj) {
    return '';
  }

  const defaults = {
    encode: true,
    strict: true
  };

  opts = Object.assign({}, obj, defaults);

  if (opts.sort === false) {
    opts.sort = () => {};
  }

  const arrayFormatter = (key, value) => value === null ? encode(key, opts) : [
    encode(key, opts),
    '=',
    encode(value, opts)
  ].join('');

  return Object.keys(obj).sort(opts.sort).map(key => {
    const val = obj[key];

    if (val === undefined) {
      return '';
    }

    if (val === null) {
      return encode(key, opts);
    }

    if (Array.isArray(val)) {
      const result = [];

      val.slice().forEach(val2 => {
        if (val2 === undefined) {
          return;
        }

        result.push(arrayFormatter(key, val2, result.length));
      });

      return result.join('&');
    }

    return `${encode(key, opts)}=${encode(val, opts)}`;
  }).filter(x => {
    return x.length > 0;
  }).join('&');
};

const post = (url, data = null) => {
  if ('sendBeacon' in navigator) {
    return navigator.sendBeacon(url, data);
  }
  let xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  return xhr.send(data);
};

const inDevMode = () => {
  return window.isSecureContext === false || (window.location.protocol === 'http:' && window.location.port);
};

const getDevicePixelRatio = () => {
  return window.devicePixelRatio || 1;
};

const getWebGLCapabilities = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    /* eslint-disable no-undef */
    return (gl && gl instanceof WebGLRenderingContext) || false;
    /* eslint-enable no-undef */
  } catch (err) {
    return false;
  }
};

const getWebGL2Capabilities = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    /* eslint-disable no-undef */
    return (gl && gl instanceof WebGL2RenderingContext) || false;
    /* eslint-enable no-undef */
  } catch (err) {
    return false;
  }
};

const getUserAgent = () => {
  return navigator.userAgent;
};

const getEndianness = () => {
  if (!window.ArrayBuffer) {
    return 'Unknown';
  }
  const buffer = new ArrayBuffer(4);
  const intView = new Uint32Array(buffer);
  const byteView = new Uint8Array(buffer);
  intView[0] = 1;
  return byteView[0] === 1 ? 'little' : 'big';
};

const Reporter = ((() => {
  class Reporter {
    constructor (tagId = '') {
      if (!tagId) {
        throw new Error('`tagId` argument required for `Reporter` (e.g., `XXXXXX-YY`)');
      }
      this.tagId = tagId;
    }

    static setTagId (tagId = null) {
      this.tagId = tagId;
    }

    static saveConsent (consented = true) {
      if (!Reporter.consented()) {
        return false;
      }
      localStorage.setItem('xrAgent.metrics.settings.consent', consented ? 'true' : 'false');
      return true;
    }

    static removeConsent (consented = true) {
      if (!Reporter.consented()) {
        return false;
      }
      localStorage.removeItem('xrAgent.metrics.clientId');
      localStorage.removeItem('xrAgent.metrics.name');
      localStorage.removeItem('xrAgent.metrics.version');
      localStorage.removeItem('xrAgent.metrics.settings.consent');
      return true;
    }

    static consented () {
      if (!Reporter.consented()) {
        return false;
      }
      return localStorage.getItem('xrAgent.metrics.settings.consent') !== 'false';
    }

    static sendPageView (path, hostname, title, extraParams) {
      const params = {
        t: 'pageview',
        path,
        hostname,
        title,
        params: extraParams
      };
      return this.send(params);
    }

    static sendEvent (category, action, label, value) {
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

    static sendTiming (category, name, value) {
      const params = {
        t: 'timing',
        utc: category,
        utv: name,
        utt: value
      };
      return this.send(params);
    }

    static sendException (description) {
      const params = {
        t: 'exception',
        exd: description,
        exf: inDevMode() ? '0' : '1'
      };
      return this.send(params);
    }

    static sendCommand (commandName) {
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

    static send (params) {
      if (!Reporter.consented()) {
        return;
      }

      this.tagId = params.tagId || this.tagId || localStorage.getItem('xrAgent.metrics.tagId');
      this.clientId = this.clientId || localStorage.getItem('xrAgent.metrics.clientId');

      this.dp = params.dp || params.uri || this.uri;
      this.p = params.p || this.p || this.dp;

      this.dh = params.host || params.dh || this.host;
      this.dt = params.title || params.dt || this.title;
      this.dr = params.referrer || params.dr || this.dr;
      this.uip = params.remoteAddr || params.uip || this.uip;

      this.xrAgentName = this.xrAgentName || localStorage.getItem('xrAgent.metrics.name');
      this.xrAgentVersion = this.xrAgentVersion || localStorage.getItem('xrAgent.metrics.version');

      if (!navigator.onLine) {
        return;
      }

      params = Object.assign({}, params, {
        v: 1,
        aip: 1,
        tid: this.tagId,
        // cd: this.screenName,  // TODO: Add Screen Name.
        cid: this.clientId,
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
      params = Object.assign({}, params, Reporter.consentedParams());
      if (Reporter.isTelemetryConsentChoice(params)) {
        return Reporter.request(`https://ssl.google-analytics.com/collect?${querystring.stringify(params)}`);
      }
    }

    static isTelemetryConsentChoice (params) {
      return params.t === 'event' && params.ec === 'setting' && params.ea === 'xrAgent.metrics.settings.consent';
    }

    static request (url) {
      return post(url);
    }

    static consentedParams () {
      return {
        sr: `${window.screen.width}x${window.screen.height}`,
        vp: `${window.innerWidth}x${window.innerHeight}`,
        dpr: getDevicePixelRatio(),
        capvr: !!navigator.getVRDisplays,
        capxr: !!navigator.xr,
        capgp: !!window.Gamepad,
        capaudio: !!window.AudioContext || !!window.webkitAudioContext,
        capwasm: !!window.WebAssembly,
        capric: !!window.requestIdleCallback,
        capwebgl: getWebGLCapabilities(),
        capwebgl2: getWebGL2Capabilities(),
        capworker: !!window.Worker,
        capsw: !!navigator.serviceWorker,
        caphc: navigator.hardwareConcurrency || 0,
        capws: !!window.WebSocket || false,
        capwebrtc: (!!window.RTCPeerConnection && !!window.RTCDataChannelEvent) || false,
        capendian: getEndianness(),
        ua: getUserAgent()
      };
    }
  }

  return Reporter;
}))();

export default Reporter;
