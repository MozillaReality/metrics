/* global location */
import LS from './storage.js';
import Reporter from './reporter.js';

const PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig;
const stripPath = msg => msg.replace(PathRE, '<path>');

/**
 * Generates a random UUID (version 4), compliant with RFC4122 (https://www.ietf.org/rfc/rfc4122.txt).
 *
 * Source adapted from https://gist.github.com/jcxplorer/823878
 */
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
  constructor (tagId, clientId, storage, reporter, win = window, doc = document) {
    this.tagId = tagId;
    this.clientId = clientId;
    this.win = win || window;
    this.doc = doc || document;
    this.storage = storage || new LS(this.win, 'xrAgent.metrics.');
    this.reporter = reporter || new Reporter(this.tagId, this.storage, this.win, this.doc);
  }

  activate (arg = {}) {
    if (!this.reporter.hasConsented()) {
      return false;
    }
    this.subscriptions = [];
    let sessionLength = arg.sessionLength || Date.now();
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
      sendEvent: this.reporter.sendEvent.bind(this.reporter),
      sendTiming: this.reporter.sendTiming.bind(this.reporter),
      sendException: this.reporter.sendException.bind(this.reporter)
    };
  }

  begin (sessionLength) {
    this.sessionStart = Date.now();
    if (sessionLength) {
      this.reporter.sendEvent('window', 'ended', null, sessionLength);
    }
    this.reporter.sendEvent('window', 'started');
    this.watchExceptions();
    this.watchPageView();
  }

  ensureClientId (callback) {
    const self = this;
    if (self.storage.get('clientId')) {
      return callback();
    }
    return self.createClientId(clientId => {
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

  getTid () {
    if (this.tagId) {
      return this.tagId;
    }
    this.tagId = this.storage.get('tid');
    return this.tagId;
  }

  setTid (tagId) {
    this.tagId = this.storage.set('tid', tagId);
    return tagId;
  }

  watchExceptions () {
    return this.subscriptions.push(() => {
      window.addEventListener('error', evt => {
        let errMsg = evt;
        if (typeof evt !== 'string') {
          errMsg = evt.message;
        }
        errMsg = (stripPath(errMsg) || 'Unknown').replace('Uncaught ', '').slice(0, 150);
        return self.reporter.sendException(errMsg);
      });
    });
  }

  watchPageView () {
    const self = this;
    return self.subscriptions.push(() => {
      self.reporter.sendPageView(self.win.location.pathname, self.win.location.href, self.doc.title);
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
    const qs = new win.URLSearchParams(new win.URL(scriptUrl).search);
    return qs.get('tag');
  } catch (err) {
    return (scriptUrl.match(/[?&]tag=(.+)/i) || [])[1];
  }
}

const tagId = getTag(null, window, document);
const reporter = new Reporter(tagId, null, window, document);
const metrics = new Metrics(tagId, null, null, reporter, window, document);
metrics.activate();

export default metrics;
