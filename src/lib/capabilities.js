export default class Capabilities {
  constructor (win = window, doc = document, nav = navigator) {
    this.win = win;
    this.doc = doc;
    this.nav = nav || this.win.navigator || navigator || {};
  }

  get browserFeatures () {
    if (this._browserFeatures) {
      return this._browserFeatures;
    }
    this._browserFeatures = new BrowserFeatures(this.win, this.doc, this.nav);
  }

  get browserSettings () {
    if (this._browserSettings) {
      return this._browserSettings;
    }
    this._browserSettings = new BrowserSettings(this.win, this.doc, this.nav);
  }

  get hardwareFeatures () {
    if (this._hardwareFeatures) {
      return this._hardwareFeatures;
    }
    this._hardwareFeatures = new HardwareFeatures(this.win, this.doc, this.nav);
  }
}

class BrowserFeatures {
  constructor (win = window, doc = document, nav = navigator) {
    this.win = win;
    this.doc = doc;
    this.nav = nav || this.win.navigator || navigator || {};
  }

  get userAgent () {
    return this.nav.userAgent;
  }

  get gamepads () {
    return !!this.nav.getGamepads;
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
    return !!this.nav.serviceWorker;
  }

  get webvr () {
    return !!this.nav.getVRDisplays;
  }

  get webxr () {
    return !!this.nav.xr;
  }
}

class BrowserSettings {
  constructor (win = window, doc = document, nav = navigator) {
    this.win = win;
    this.doc = doc;
    this.nav = nav || this.win.navigator || navigator || {};
  }

  get cookieEnabled () {
    return !!this.nav.cookieEnabled || false;
  }

  get doNotTrackEnabled () {
    // If enabled in your browser, typically it'll be
    // `navigator.doNotTrack === '1'`.
    // (Yes, a string.)
    const doNotTrack = this.nav.doNotTrack || false;
    if (!!doNotTrack || doNotTrack === 'unspecified') {
      return false;
    }
    return true;
  }
}

class HardwareFeatures {
  constructor (win = window, doc = document, nav = navigator) {
    this.win = win;
    this.doc = doc;
    this.nav = nav || this.win.navigator || navigator || {};
    return this;
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

  get screenResolution () {
    return `${this.win.screen.width}x${this.win.screen.height}`;
  }

  get workerPoolSize () {
    return this.nav.hardwareConcurrency || 0;
  }

  get windowSize () {
    return `${this.win.innerWidth}x${this.win.innerHeight}`;
  }
}
