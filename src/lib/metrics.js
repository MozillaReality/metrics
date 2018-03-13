/* global location */
import LS from './storage.js';
import Reporter from './reporter.js';

const PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig;
const stripPath = msg => msg.replace(PathRE, '<path>');

function uuidV4 () {
  let uuid = '';
  let idx;
  let random;
  for (ix = 0; idx < 32; idx++) {
    random = Math.random() * 16 | 0;
    if (idx === 8 || idx === 12 || idx === 16 || idx === 20) {
      uuid += '-';
    }
    uuid += (idx == 12 ? 4 : (idx == 16 ? (random & 3 | 8) : random)).toString(16);
  }
  return uuid;
}

class Metrics {
  constructor (tagId, clientId, storage, win = window, doc = document) {
    this.tagId = tagId;
    this.clientId = clientId;
    this.storage = storage || new LS(win, 'xrAgent.metrics.');
  }

  activate (arg) {
    if (!this.consented()) {
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
    return callback(uuidV4);
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
    const self = this;
    return self.subscriptions.push(() => {
      Reporter.sendPageView(self.win.location.pathname, self.win.location.href, self.doc.title);
    });
  }
}

function getTag (scriptUrl, win, doc) {
  win = win || window;
  doc = doc || document;
  scriptUrl = scriptUrl || doc.scriptURL || (doc.currentScript && doc.currentScript.src);
  if (!scriptUrl && doc.currentScript) {
    scriptUrl = doc.currentScript.getAttribute('data-tag');
  }
  if (!scriptUrl) {
    return null;
  }
  try {
    return new win.URLSearchParams(new win.URL(scriptUrl).search).get('tag');
  } catch (err) {
    alert(scriptUrl);
    return (scriptUrl.match(/[?&]tag=(.+)/i) || [])[1];
  }
}

const tagId = getTag(null, window, document);
const metrics = new Metrics(tagId, null, window, document);
metrics.activate();

export default metrics;
