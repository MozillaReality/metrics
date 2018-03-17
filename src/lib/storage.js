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

  remove (key) {
    if (Array.isArray(key)) {
      return key.map(name => this.remove(name));
    }
    try {
      delete this.storage[this.prefix + key];
    } catch (err) {
      return null;
    }
  }

  delete (key) {
    return this.remove(key);
  }

  clear (key) {
    try {
      delete this.storage;
    } catch (err) {
      return null;
    }
    this.storage = {};
  }
}

export default LS;
