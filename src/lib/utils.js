class Capabilities {
  constructor (win = window, doc = document) {
    this.win = win;
    this.win.navigator = this.win.navigator || {};
    this.doc = doc;
  }

  get browserFeatures () {
    if (this._browserFeatures) {
      return this._browserFeatures;
    }
    this._browserFeatures = new BrowserFeatures();
  }

  get browserSettings () {
    if (this._browserSettings) {
      return this._browserSettings;
    }
    this._browserSettings = new BrowserSettings();
  }

  get hardwareFeatures () {
    if (this._hardwareFeatures) {
      return this._hardwareFeatures;
    }
    this._hardwareFeatures = new HardwareFeatures();
  }
}

class BrowserFeatures {
  constructor (win = window, doc = document) {
    this.win = win;
    this.win.navigator = this.win.navigator || {};
    this.doc = doc;
  }

  get userAgent () {
    return this.win.navigator.userAgent;
  }

  get gamepads () {
    return !!this.win.navigator.getGamepads;
  }

  get webaudio () {
    return !!this.win.AudioContext || !!this.win.webkitAudioContext;
  }

  get wasm () {
    return !!this.win.WebAssembly;
  }

  get requestIdleCallback () {
    return !!this.win.requestIdleCallback;
  }

  get webgl () {
    try {
      const canvas = this.doc.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof this.win.WebGLRenderingContext) {
        return true;
      }
    } catch (err) {
    }
    return false;
  }

  get webgl2 () {
    try {
      const canvas = this.doc.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (gl && gl instanceof this.win.WebGL2RenderingContext) {
        return true;
      }
    } catch (err) {
    }
    return false;
  }

  get webrtc () {
    return !!this.win.RTCPeerConnection && !!this.win.RTCDataChannelEvent;
  }

  get websocket () {
    return !!this.win.WebSocket;
  }

  get webworker () {
    return !!this.win.Worker;
  }

  get serviceworker () {
    return !!this.win.navigator.serviceWorker;
  }

  get webvr () {
    return !!this.win.navigator.getVRDisplays;
  }

  get webxr () {
    return !!this.win.navigator.xr;
  }
}

class BrowserSettings {
  constructor (win = window, doc = document) {
    this.win = win;
    this.win.navigator = this.win.navigator || {};
    this.doc = doc;
  }

  get cookieEnabled () {
    return !!navigator.cookieEnabled || false;
  }

  get doNotTrackEnabled () {
    const doNotTrack = navigator.doNotTrack || false;
  	if (!!doNotTrack || doNotTrack === 'unspecified') {
  		return false;
  	}
  	return true;
  }
}

class HardwareFeatures {
  constructor (win = window, doc = document) {
    this.win = win;
    this.win.navigator = this.win.navigator || {};
    this.doc = doc;
  }

  get devicePixelRatio () {
    return this.win.devicePixelRatio || 1;
  }

  get endianness () {
    if (!this.win.ArrayBuffer) {
      return 'Unknown';
    }
    const buffer = new this.win.ArrayBuffer(4);
    const intView = new this.win.Uint32Array(buffer);
    const byteView = new this.win.Uint8Array(buffer);
    intView[0] = 1;
    return byteView[0] === 1 ? 'little' : 'big';
  }

  get screenSize () {
    return `${this.win.screen.width}x${this.win.screen.height}`;
  }

  get workerPoolSize () {
    return this.win.navigator.hardwareConcurrency || 0;
  }

  get windowSize () {
    return `${this.win.innerWidth}x${this.win.innerHeight}`;
  }
}

const postBeacon = (url, data = null) => {
  if ('sendBeacon' in navigator) {
    return navigator.sendBeacon(url, data);
  }
  let xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  return xhr.send(data);
};

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

export default {
  Capabilities,
  querystring
};
