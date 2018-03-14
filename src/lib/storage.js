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

export default LS;
