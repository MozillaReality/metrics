# WebXR Metrics

Help improve the [WebXR API](https://immersive-web.github.io/webxr/) and ecosystem by sending usage statistics, performance metrics, and JavaScript errors to the [Mozilla Mixed Reality](https://vr.mozilla.org/).


## Privacy Notice for Data Collection

To help improve the WebVR API and the WebVR Export assets, Mozilla automatically receives usage statistics, performance metrics, and JavaScript errors of end users, using [Google Analytics](https://analytics.google.com/analytics/web/). Data is collected in accordance with Mozilla's [data-collection policies](https://www.mozilla.org/privacy/websites/). [The **complete list of collected data**](METRICS.MD) includes metrics for counting the number of unique web-page sessions; time for web pages to load and time open; JavaScript error exceptions occurred on the page; number of times VR device is mounted and worn; number of times VR mode is enabled and time spent; and a unique browser identifier.

**Developers** can turn off this data collection by [modifying the configuration snippet that comes with the VR template](./docs/customization/disabling-telemetry.md).  

**End users** can turn off this data collection by [enabling `Do-Not-Track`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/DNT) in their browsers.


## Usage

To opt in to telemetry (i.e., collecting usage statistics, performance metrics, and catching errors)  it in your WebXR site, simply include this snippet of JavaScript code in your HTML (ideally, immediately before the `</head>` or before `</body>`):

```html
<script src="https://webxr.services/metrics.js" async defer></script>
```

Or this:

```html
<script>
  // Telemetry for collecting basic usage statistics, performance metrics, and catching errors.
  (function () {
    function injectMetrics () {
      if (injectMetrics.injected || !navigator.onLine) {
        return;
      }
      injectMetrics.injected = true;
      var refScript = document.querySelector('script');
      var script = document.createElement('script');
      script.src = 'https://webxr.services/metrics.js';
      script.async = true;
      script.crossorigin = 'anonymous';
      (refScript ? refScript.parentNode : document.head).insertBefore(script, ref);
    }
    injectMetrics();
    window.addEventListener('online', injectMetrics);
  })();
</script>
````

You can help improve the [WebXR](https://immersive-web.github.io/webxr/) API ecosystem and community by sending usage statistics, performance metrics, and JavaScript errors to the [Mozilla Mixed Reality](https://vr.mozilla.org/) team.



## Local development

First, clone this Git repo:

```sh
git clone git@github.com:MozillaReality/metrics.git mozillareality-metrics && cd mozillareality-metrics
```

To install the [Node.js](https://nodejs.org/en/download/) dependencies:

```sh
npm install
```

To start the local development server:

```sh
npm start
```


## Deployment

This project is automatically deployed to [GitHub Pages](https://webvr.services/metrics.js) when commits land on the `master` branch of this repository.


## License

Copyright 2017 - 2018 Mozilla Corporation.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
