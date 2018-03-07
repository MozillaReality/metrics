/* global localStorage, location */
import * as uuid from 'node-uuid';

import Reporter from './reporter.js';

const PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig;
const stripPath = msg => msg.replace(PathRE, '<path>');

class Metrics {
  static constructor (tagId, clientId) {
    this.tagId = tagId;
    this.clientId = clientId;
  }

  static activate (arg) {
    if (!Reporter.consented()) {
      return false;
    }
    this.subscriptions = [];
    let sessionLength = arg.sessionLength;
    return this.ensureClientId(((_this => () => _this.begin(sessionLength)))(this));
  }

  deactivate () {
    delete this.subscriptions;
    this.subscriptions = [];
  }

  serialize () {
    return {
      sessionLength: Date.now() - this.sessionStart
    };
  }

  provideReporter () {
    return {
      sendEvent: Reporter.sendEvent.bind(Reporter),
      sendTiming: Reporter.sendTiming.bind(Reporter),
      sendException: Reporter.sendException.bind(Reporter)
    };
  }

  begin (sessionLength) {
    this.sessionStart = Date.now();
    if (sessionLength) {
      Reporter.sendEvent('window', 'ended', null, sessionLength);
    }
    Reporter.sendEvent('window', 'started');
    this.watchExceptions();
    this.watchPageView();
    this.watchEvents();
    this.watchPerfTimings();
  }

  ensureClientId (callback) {
    if (localStorage.getItem('xrAgent.metrics.clientId')) {
      return callback();
    }
    return this.createClientId(clientId => {
      localStorage.setItem('xrAgent.metrics.clientId', clientId);
      return callback();
    });
  }

  createClientId (callback) {
    if (this.clientId) {
      return callback(this.clientId);
    }
    return callback(uuid.v4);
  }

  getClientId () {
    return localStorage.getItem('xrAgent.metrics.clientId');
  }

  getTagId () {
    if (this.tagId) {
      return this.tagId;
    }
    this.tagId = localStorage.getItem('xrAgent.metrics.tagId');
    return this.tagId;
  }

  setTagId (tagId) {
    this.tagId = localStorage.setItem('xrAgent.metrics.tagId', tagId);
    return tagId;
  }

  watchExceptions () {
    return this.subscriptions.push(() => {
      window.addEventListener('error', event => {
        let errorMessage = event;
        if (typeof event !== 'string') {
          errorMessage = event.message;
        }
        errorMessage = (stripPath(errorMessage) || 'Unknown').replace('Uncaught ', '').slice(0, 150);
        return Reporter.sendException(errorMessage);
      });
    });
  }

  watchPageView () {
    return this.subscriptions.push(() => {
      Reporter.sendPageView(location.pathname, location.href, document.title);
    });
  }

  watchEvents () {
    return this.subscriptions.push(() => {
      // TODO: Call `Reporter.sendCommand(event.type)` for each whitelisted event (e.g., `vrdisplay*` in WebVR v1.1).
      // READ:
      //   - https://github.com/cvan/webxr-agent/blob/fe94ff57a0a2a90fe1d48cb7b3dba5a1105909db/public/telemetry.js#L129-L159
    });
  }

  watchTimings () {
    return this.subscriptions.push(() => {
      // TODO: Measure load times for `LoaderParsing`, `LoaderParsingStart`, `LoadingStart`.
      // READ:
      //   - https://github.com/mozilla/unity-webvr-export/pull/189/files
      //     - https://github.com/delapuente/unity-webvr-export/blob/fd5b1fb9/Assets/WebGLTemplates/WebVR/index.html#L14-L29
      //     - https://github.com/delapuente/unity-webvr-export/blob/fd5b1fb9/Assets/WebGLTemplates/WebVR/webvr.js#L40
    });
  }
}

const tagId = getTag();
const metrics = new Metrics(tagId);
metrics.activate();

function getTag (scriptUrl) {
  if (document.currentScript) {
    return document.currentScript.getAttribute('data-tag');
  }
  scriptUrl = scriptUrl || document.scriptURL || (document.currentScript && document.currentScript.src);
  if (!scriptUrl) {
    return null;
  }
  try {
    return new window.URLSearchParams(new window.URL(scriptUrl).search).get('tag');
  } catch (err) {
    return (scriptUrl.match(/[?&]tag=(.+)/i) || [])[1];
  }
}

export default metrics;
