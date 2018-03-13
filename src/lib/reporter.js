/* global XMLHttpRequest */
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

const inDevMode = (win) => {
  return win.isSecureContext === false || (win.location.protocol === 'http:' && win.location.port);
};

const getDevicePixelRatio = (win) => {
  return win.devicePixelRatio || 1;
};

const getWebGLCapabilities = (win, doc) => {
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    /* eslint-disable no-undef */
    return (gl && gl instanceof win.WebGLRenderingContext) || false;
    /* eslint-enable no-undef */
  } catch (err) {
    return false;
  }
};

const getWebGL2Capabilities = (win, doc) => {
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    /* eslint-disable no-undef */
    return (gl && gl instanceof win.WebGL2RenderingContext) || false;
    /* eslint-enable no-undef */
  } catch (err) {
    return false;
  }
};

const getUserAgent = (win) => {
  return win.navigator.userAgent;
};

const getEndianness = (win) => {
  if (!win.ArrayBuffer) {
    return 'Unknown';
  }
  const buffer = new win.ArrayBuffer(4);
  const intView = new win.Uint32Array(buffer);
  const byteView = new win.Uint8Array(buffer);
  intView[0] = 1;
  return byteView[0] === 1 ? 'little' : 'big';
};

const Reporter = ((() => {
  class Reporter {
    constructor (tagId = '', storage) {
      if (!tagId) {
        throw new Error('`tagId` argument required for `Reporter` (e.g., `XXXXXX-YY`)');
      }
      this.tagId = tagId;
      this.consented = this.hasConsented();
      this.storage = storage || new LS(win, 'xrAgent.metrics.');
    }

    setTagId (tagId = null) {
      this.tagId = tagId;
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

      this.tagId = params.tagId || this.tagId || this.storage.get('tagId');
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
      params = Object.assign({}, params, this.consentedParams());
      if (this.isTelemetryConsentChoice(params)) {
        return this.request(`https://ssl.google-analytics.com/collect?${querystring.stringify(params)}`);
      }
    }

    isTelemetryConsentChoice (params) {
      return params.t === 'event' && params.ec === 'setting' && params.ea === 'settings.consent';
    }

    request (url) {
      return post(url);
    }

    consentedParams () {
      return {
        sr: `${this.win.screen.width}x${this.win.screen.height}`,
        vp: `${this.win.innerWidth}x${this.win.innerHeight}`,
        dpr: getDevicePixelRatio(this.win),
        capvr: !!this.win.navigator.getVRDisplays,
        capxr: !!this.win.navigator.xr,
        capgp: !!this.win.Gamepad,
        capaudio: !!this.win.AudioContext || !!this.win.webkitAudioContext,
        capwasm: !!this.win.WebAssembly,
        capric: !!this.win.requestIdleCallback,
        capwebgl: getWebGLCapabilities(this.win),
        capwebgl2: getWebGL2Capabilities(this.win),
        capworker: !!this.win.Worker,
        capsw: !!this.win.navigator.serviceWorker,
        caphc: this.win.navigator.hardwareConcurrency || 0,
        capws: !!this.win.WebSocket || false,
        capwebrtc: (!!this.win.RTCPeerConnection && !!this.win.RTCDataChannelEvent) || false,
        capendian: getEndianness(this.win),
        ua: getUserAgent(this.win)
      };
    }
  }

  return Reporter;
}))();

export default Reporter;
