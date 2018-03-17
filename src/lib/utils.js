/* global XMLHttpRequest */
const postBeacon = (url, data = null, nav) => {
  nav = nav || win.navigator;
  if ('sendBeacon' in nav) {
    return nav.sendBeacon(url, data);
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
  querystring,
  postBeacon,
};
