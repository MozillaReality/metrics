/* global location */
import * as uuid from 'node-uuid';

import Reporter from './reporter.js';

const PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig;
const stripPath = msg => msg.replace(PathRE, '<path>');

class LS {
  constructor (win = window, prefix = '') {
    try {
      this.storage = win.localStorage;
    } catch (err) {
      this.storage = {};
    }
    this.prefix = prefix || '';
  }

  get (key) {
    try {
      return this.storage[this.prefix + key];
    } catch (err) {
      return null;
    }
  }

  set (key, value) {
    try {
      this.storage[this.prefix + key] = value;
      return value;
    } catch (err) {
      return null;
    }
  }

  delete (key) {
    try {
      delete this.storage[this.prefix + key];
    } catch (err) {
      return null;
    }
  }

  clear (key) {
    try {
      delete this.storage;
    } catch (err) {
      return null;
    }
  }
}

class Metrics {
  static constructor (tagId, clientId, storage, win = window) {
    this.tagId = tagId;
    this.clientId = clientId;
    this.storage = storage || new LS(win, 'xrAgent.metrics.');
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
  }

  ensureClientId (callback) {
    const self = this;
    if (self.storage.get('clientId')) {
      return callback();
    }
    return this.createClientId(clientId => {
      self.storage.set('clientId', clientId);
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
    return this.storage.get('clientId');
  }

  getTagId () {
    if (this.tagId) {
      return this.tagId;
    }
    this.tagId = this.storage.get('tagId');
    return this.tagId;
  }

  setTagId (tagId) {
    this.tagId = this.storage.set('tagId', tagId);
    return tagId;
  }

  watchExceptions () {
    return this.subscriptions.push(() => {
      window.addEventListener('error', event => {
        let errMsg = event;
        if (typeof event !== 'string') {
          errMsg = event.message;
        }
        errMsg = (stripPath(errMsg) || 'Unknown').replace('Uncaught ', '').slice(0, 150);
        return Reporter.sendException(errMsg);
      });
    });
  }

  watchPageView () {
    return this.subscriptions.push(() => {
      Reporter.sendPageView(location.pathname, location.href, document.title);
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
