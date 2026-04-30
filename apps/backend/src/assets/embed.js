(function () {
  var VERSION = '0.2.0';
  var MAX_TEXT_LENGTH = 80;
  var DEFAULT_FLUSH_MS = 5000;
  var DEFAULT_BATCH_SIZE = 20;
  var STORAGE_PREFIX = 'fluxosdk';

  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) {
      return prefix + '_' + window.crypto.randomUUID();
    }
    return prefix + '_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function getCurrentScript() {
    return document.currentScript || document.querySelector('script[data-site-key]');
  }

  function clampNumber(value, fallback, min, max) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  }

  function readStorage(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (_error) {
      // Storage can be blocked by browser privacy settings.
    }
  }

  function storageKey(kind, siteKey) {
    return STORAGE_PREFIX + '_' + kind + '_' + siteKey;
  }

  function getOrCreateStoredId(storage, key, prefix) {
    var value = readStorage(storage, key);
    if (!value) {
      value = createId(prefix);
      writeStorage(storage, key, value);
    }
    return value;
  }

  function sanitizeText(value, maxLength) {
    if (!value) return '';
    return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength || MAX_TEXT_LENGTH);
  }

  function sanitizePart(value) {
    return sanitizeText(value, 48).replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function closestElement(target, selector) {
    var node = target && target.nodeType === 1 ? target : target && target.parentElement;
    while (node && node !== document) {
      if (node.matches && node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function buildSelector(element) {
    if (!element || !element.tagName) return 'unknown';

    var tag = element.tagName.toLowerCase();
    var fluxoId = element.getAttribute('data-fluxo-id') || element.getAttribute('data-analytics-id');
    if (fluxoId) return tag + '[data-fluxo-id="' + sanitizePart(fluxoId) + '"]';

    if (element.id) return tag + '#' + sanitizePart(element.id);
    if (element.name) return tag + '[name="' + sanitizePart(element.name) + '"]';

    var testId = element.getAttribute('data-testid') || element.getAttribute('data-test');
    if (testId) return tag + '[data-testid="' + sanitizePart(testId) + '"]';

    var aria = element.getAttribute('aria-label');
    if (aria) return tag + '[aria-label="' + sanitizePart(aria) + '"]';

    if (element.classList && element.classList.length) {
      var classes = Array.prototype.slice.call(element.classList, 0, 2).map(sanitizePart).filter(Boolean);
      if (classes.length) return tag + '.' + classes.join('.');
    }

    return tag;
  }

  function elementMetadata(target) {
    var element = closestElement(target, 'a,button,input,select,textarea,label,[role="button"],[data-fluxo-track],[data-fluxo-id]') || target;
    var href = element && element.href ? element.href : '';

    return {
      selector: buildSelector(element),
      tag: element && element.tagName ? element.tagName.toLowerCase() : 'unknown',
      id: element && element.id ? sanitizeText(element.id, 48) : '',
      name: element && element.name ? sanitizeText(element.name, 48) : '',
      text: sanitizeText(element && element.textContent ? element.textContent : element && element.value ? element.value : '', MAX_TEXT_LENGTH),
      href: href ? href.split('#')[0].slice(0, 180) : '',
      role: element && element.getAttribute ? sanitizeText(element.getAttribute('role'), 32) : '',
      disabled: Boolean(element && element.disabled),
    };
  }

  function parseUtm() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ['source', 'medium', 'campaign', 'term', 'content'].forEach(function (key) {
      var value = params.get('utm_' + key);
      if (value) utm[key] = sanitizeText(value, 120);
    });
    return utm;
  }

  function getReferrerHost() {
    if (!document.referrer) return '';
    try {
      return new URL(document.referrer).host;
    } catch (_error) {
      return '';
    }
  }

  function getDeviceType() {
    var width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  function getBrowser() {
    var ua = navigator.userAgent || '';
    if (ua.indexOf('Edg/') >= 0) return 'Edge';
    if (ua.indexOf('Chrome/') >= 0) return 'Chrome';
    if (ua.indexOf('Firefox/') >= 0) return 'Firefox';
    if (ua.indexOf('Safari/') >= 0) return 'Safari';
    return 'Other';
  }

  function getOs() {
    var ua = navigator.userAgent || '';
    if (ua.indexOf('Windows') >= 0) return 'Windows';
    if (ua.indexOf('Mac OS') >= 0) return 'macOS';
    if (ua.indexOf('Android') >= 0) return 'Android';
    if (ua.indexOf('iPhone') >= 0 || ua.indexOf('iPad') >= 0) return 'iOS';
    if (ua.indexOf('Linux') >= 0) return 'Linux';
    return 'Other';
  }

  function getContext() {
    return {
      sdkVersion: VERSION,
      referrer: document.referrer || '',
      referrerHost: getReferrerHost(),
      language: navigator.language || '',
      timezone: window.Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      deviceType: getDeviceType(),
      browser: getBrowser(),
      os: getOs(),
      viewport: {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0,
      },
      screen: {
        width: window.screen ? window.screen.width : 0,
        height: window.screen ? window.screen.height : 0,
      },
      utm: parseUtm(),
    };
  }

  function getPageSnapshot(pageId) {
    return {
      id: pageId || createId('page'),
      url: window.location.href,
      path: window.location.pathname || '/',
      title: document.title || '',
      startedAt: Date.now(),
      maxScrollDepth: 0,
      scrollThresholds: {},
      forms: {},
    };
  }

  function startSdk() {
    var script = getCurrentScript();
    if (!script) return;

    var siteKey = script.dataset.siteKey || '';
    if (!siteKey) return;

    var sampleRate = clampNumber(script.dataset.sampleRate, 1, 0, 1);
    if (sampleRate < 1 && Math.random() > sampleRate) return;

    var apiUrl = script.dataset.apiUrl || (script.src ? new URL(script.src).origin : window.location.origin);
    var flushMs = clampNumber(script.dataset.flushMs, DEFAULT_FLUSH_MS, 1000, 30000);
    var batchSize = clampNumber(script.dataset.batchSize, DEFAULT_BATCH_SIZE, 5, 100);
    var debug = script.dataset.debug === 'true';
    var trackApiErrors = script.dataset.trackApiErrors === 'true';

    var visitorId = getOrCreateStoredId(window.localStorage, storageKey('visitor_id', siteKey), 'vis');
    var sessionId = getOrCreateStoredId(window.sessionStorage, storageKey('session_id', siteKey), 'sess');
    var userIdentifier = readStorage(window.localStorage, storageKey('user_identifier', siteKey)) || '';
    var page = getPageSnapshot();
    var eventQueue = [];
    var flushTimer = null;
    var clickHistory = [];
    var lastRageClickBySelector = {};
    var activeScrollHandler = null;

    function logDebug() {
      if (!debug || !window.console) return;
      console.log.apply(console, arguments);
    }

    function buildEvent(type, metadata, name, pageOverride) {
      var currentPage = pageOverride || page;
      return {
        eventId: createId('evt'),
        type: type,
        name: name || undefined,
        pageId: currentPage.id,
        url: currentPage.url,
        path: currentPage.path,
        title: currentPage.title,
        occurredAt: new Date().toISOString(),
        metadata: metadata || {},
      };
    }

    function pushEvents(events, preferBeacon) {
      if (!events.length) return;

      var payload = JSON.stringify({
        siteKey: siteKey,
        visitorId: visitorId,
        sessionId: sessionId,
        userIdentifier: userIdentifier || undefined,
        sentAt: new Date().toISOString(),
        context: getContext(),
        events: events,
      });

      var endpoint = apiUrl.replace(/\/$/, '') + '/api/sdk/events';

      if (preferBeacon && navigator.sendBeacon) {
        try {
          var blob = new Blob([payload], { type: 'application/json' });
          if (navigator.sendBeacon(endpoint, blob)) return;
        } catch (_error) {
          // Fall back to fetch.
        }
      }

      if (!window.fetch) return;

      fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: preferBeacon,
      }).catch(function (error) {
        logDebug('FluxoSDK flush error:', error);
      });
    }

    function flush(preferBeacon) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      if (!eventQueue.length) return;

      var payload = eventQueue.splice(0, batchSize);
      pushEvents(payload, Boolean(preferBeacon));

      if (eventQueue.length) {
        flushTimer = setTimeout(function () {
          flush(false);
        }, 250);
      }
    }

    function queueEvent(event, options) {
      eventQueue.push(event);

      if (eventQueue.length >= batchSize) {
        flush(false);
        return;
      }

      if (!flushTimer) {
        flushTimer = setTimeout(function () {
          flush(false);
        }, flushMs);
      }

      if (options && options.flush) {
        flush(Boolean(options.beacon));
      }
    }

    function startPage(eventType) {
      page = getPageSnapshot();
      queueEvent(buildEvent(eventType || 'page_view', {
        referrer: document.referrer || '',
        utm: parseUtm(),
      }));
      scheduleScrollCheck();
    }

    function trackPageLeave(reason, preferBeacon) {
      var oldPage = page;
      if (!oldPage) return;
      if (oldPage.leftSent) return;
      oldPage.leftSent = true;

      trackFormAbandons(oldPage);

      queueEvent(buildEvent('page_leave', {
        reason: reason || 'leave',
        durationMs: Math.max(Date.now() - oldPage.startedAt, 0),
        maxScrollDepth: oldPage.maxScrollDepth || 0,
      }, undefined, oldPage), { beacon: preferBeacon });
    }

    function isLikelyActionable(target) {
      var element = closestElement(target, 'a,button,input,select,textarea,label,[role="button"],[onclick],[data-fluxo-track]');
      if (!element) return false;
      if (element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
      return true;
    }

    function trackClick(event) {
      var metadata = elementMetadata(event.target);
      queueEvent(buildEvent('click', metadata));

      var now = Date.now();
      clickHistory = clickHistory.filter(function (item) {
        return now - item.at < 2000;
      });
      clickHistory.push({ selector: metadata.selector, at: now });

      var sameTargetClicks = clickHistory.filter(function (item) {
        return item.selector === metadata.selector;
      }).length;

      if (sameTargetClicks >= 3 && now - (lastRageClickBySelector[metadata.selector] || 0) > 2500) {
        lastRageClickBySelector[metadata.selector] = now;
        queueEvent(buildEvent('rage_click', {
          selector: metadata.selector,
          text: metadata.text,
          tag: metadata.tag,
          clickCount: sameTargetClicks,
          windowMs: 2000,
        }));
      }

      if (!isLikelyActionable(event.target)) {
        var pageIdAtClick = page.id;
        var urlAtClick = page.url;
        setTimeout(function () {
          if (page.id === pageIdAtClick && page.url === urlAtClick) {
            queueEvent(buildEvent('dead_click', {
              selector: metadata.selector,
              text: metadata.text,
              tag: metadata.tag,
            }));
          }
        }, 700);
      }
    }

    function getFormKey(form) {
      return buildSelector(form) + '::' + page.id;
    }

    function collectFormMetadata(form) {
      var fields = form.querySelectorAll('input, select, textarea');
      var names = [];
      for (var i = 0; i < fields.length; i += 1) {
        var field = fields[i];
        if (field.name) names.push(sanitizeText(field.name, 48));
      }

      return {
        formId: form.id || form.getAttribute('name') || buildSelector(form),
        selector: buildSelector(form),
        action: form.action ? form.action.split('?')[0].slice(0, 180) : '',
        method: form.method || 'get',
        fieldCount: fields.length,
        fieldNames: names.slice(0, 20),
      };
    }

    function trackFormStart(event) {
      var form = closestElement(event.target, 'form');
      if (!form) return;

      var key = getFormKey(form);
      if (page.forms[key]) return;

      page.forms[key] = {
        started: true,
        submitted: false,
        metadata: collectFormMetadata(form),
      };

      queueEvent(buildEvent('form_start', page.forms[key].metadata));
    }

    function trackFormSubmit(event) {
      var form = closestElement(event.target, 'form');
      if (!form) return;

      var key = getFormKey(form);
      var metadata = collectFormMetadata(form);
      page.forms[key] = {
        started: true,
        submitted: true,
        metadata: metadata,
      };

      queueEvent(buildEvent('form_submit', metadata));
    }

    function trackFormAbandons(pageSnapshot) {
      var forms = pageSnapshot.forms || {};
      Object.keys(forms).forEach(function (key) {
        var formState = forms[key];
        if (formState.started && !formState.submitted) {
          queueEvent(buildEvent('form_abandon', formState.metadata, undefined, pageSnapshot));
          formState.submitted = true;
        }
      });
    }

    function computeScrollDepth() {
      var doc = document.documentElement;
      var body = document.body;
      var height = Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        doc ? doc.clientHeight : 0,
        doc ? doc.scrollHeight : 0,
        doc ? doc.offsetHeight : 0
      );
      var viewportBottom = (window.scrollY || window.pageYOffset || 0) + (window.innerHeight || 0);
      if (!height) return 0;
      return Math.min(Math.round((viewportBottom / height) * 100), 100);
    }

    function scheduleScrollCheck() {
      var scheduled = false;

      function onScroll() {
        if (scheduled) return;
        scheduled = true;
        var frame = window.requestAnimationFrame || function (callback) { return setTimeout(callback, 16); };
        frame(function () {
          scheduled = false;
          var depth = computeScrollDepth();
          page.maxScrollDepth = Math.max(page.maxScrollDepth || 0, depth);

          [25, 50, 75, 90, 100].forEach(function (threshold) {
            if (depth >= threshold && !page.scrollThresholds[threshold]) {
              page.scrollThresholds[threshold] = true;
              queueEvent(buildEvent('scroll_depth', {
                depth: threshold,
                maxScrollDepth: depth,
              }));
            }
          });
        });
      }

      if (activeScrollHandler) {
        window.removeEventListener('scroll', activeScrollHandler);
      }
      activeScrollHandler = onScroll;
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    function sendNavigationPerformance() {
      if (!window.performance) return;

      var entries = performance.getEntriesByType ? performance.getEntriesByType('navigation') : [];
      var nav = entries && entries[0];
      if (nav) {
        queueEvent(buildEvent('performance', {
          name: 'navigation',
          ttfb: Math.round(nav.responseStart),
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          load: Math.round(nav.loadEventEnd),
          transferSize: nav.transferSize || 0,
        }));
      } else if (performance.timing) {
        var timing = performance.timing;
        queueEvent(buildEvent('performance', {
          name: 'navigation',
          ttfb: Math.max(timing.responseStart - timing.navigationStart, 0),
          domContentLoaded: Math.max(timing.domContentLoadedEventEnd - timing.navigationStart, 0),
          load: Math.max(timing.loadEventEnd - timing.navigationStart, 0),
        }));
      }
    }

    function trackWebVital(name, value, extra) {
      if (!Number.isFinite(value)) return;
      queueEvent(buildEvent('web_vital', Object.assign({
        name: name,
        value: Math.round(value * 100) / 100,
      }, extra || {})));
    }

    function observeWebVitals() {
      if (!window.PerformanceObserver) return;

      try {
        new PerformanceObserver(function (list) {
          list.getEntries().forEach(function (entry) {
            if (entry.name === 'first-contentful-paint') {
              trackWebVital('fcp', entry.startTime);
            }
          });
        }).observe({ type: 'paint', buffered: true });
      } catch (_error) {
        // Unsupported observer type.
      }

      var lcp = 0;
      try {
        new PerformanceObserver(function (list) {
          var entries = list.getEntries();
          var last = entries[entries.length - 1];
          if (last) lcp = last.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (_error) {
        // Unsupported observer type.
      }

      var cls = 0;
      var vitalsSent = false;
      try {
        new PerformanceObserver(function (list) {
          list.getEntries().forEach(function (entry) {
            if (!entry.hadRecentInput) cls += entry.value || 0;
          });
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (_error) {
        // Unsupported observer type.
      }

      var inp = 0;
      try {
        new PerformanceObserver(function (list) {
          list.getEntries().forEach(function (entry) {
            inp = Math.max(inp, entry.duration || 0);
          });
        }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
      } catch (_error) {
        // Unsupported observer type.
      }

      function flushVitals() {
        if (vitalsSent) return;
        vitalsSent = true;
        if (lcp) trackWebVital('lcp', lcp);
        if (cls) trackWebVital('cls', cls);
        if (inp) trackWebVital('inp', inp);
        flush(true);
      }

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushVitals();
      });
      window.addEventListener('pagehide', flushVitals);
    }

    function trackRuntimeError(event) {
      var target = event.target || event.srcElement;
      if (target && target !== window && target.tagName) {
        queueEvent(buildEvent('resource_error', {
          tag: target.tagName.toLowerCase(),
          source: target.src || target.href || '',
        }));
        return;
      }

      queueEvent(buildEvent('js_error', {
        message: sanitizeText(event.message || 'Script error', 200),
        source: event.filename || '',
        line: event.lineno || 0,
        column: event.colno || 0,
      }));
    }

    function trackUnhandledRejection(event) {
      var reason = event.reason || {};
      queueEvent(buildEvent('js_error', {
        message: sanitizeText(reason.message || reason.toString && reason.toString() || 'Unhandled promise rejection', 200),
        source: 'unhandledrejection',
      }));
    }

    function trackApiError(details) {
      if (!details || String(details.url || '').indexOf('/api/sdk/events') >= 0) return;
      queueEvent(buildEvent('api_error', {
        url: sanitizeText(details.url || '', 180),
        status: details.status || 0,
        method: details.method || 'GET',
        durationMs: details.durationMs || 0,
        message: sanitizeText(details.message || '', 160),
      }));
    }

    function patchFetchForApiErrors() {
      if (!trackApiErrors || !window.fetch) return;
      var originalFetch = window.fetch;

      window.fetch = function () {
        var startedAt = Date.now();
        var input = arguments[0];
        var init = arguments[1] || {};
        var url = typeof input === 'string' ? input : input && input.url ? input.url : '';
        var method = init.method || input && input.method || 'GET';

        return originalFetch.apply(this, arguments).then(function (response) {
          if (!response.ok) {
            trackApiError({
              url: response.url || url,
              status: response.status,
              method: method,
              durationMs: Date.now() - startedAt,
            });
          }
          return response;
        }, function (error) {
          trackApiError({
            url: url,
            status: 0,
            method: method,
            durationMs: Date.now() - startedAt,
            message: error && error.message ? error.message : 'Network error',
          });
          throw error;
        });
      };
    }

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    function handleRouteChanged() {
      trackPageLeave('route_change', false);
      setTimeout(function () {
        startPage('route_change');
      }, 50);
    }

    history.pushState = function () {
      var result = originalPushState.apply(history, arguments);
      handleRouteChanged();
      return result;
    };

    history.replaceState = function () {
      var result = originalReplaceState.apply(history, arguments);
      handleRouteChanged();
      return result;
    };

    window.addEventListener('popstate', handleRouteChanged);
    document.addEventListener('click', trackClick, true);
    document.addEventListener('focusin', trackFormStart, true);
    document.addEventListener('submit', trackFormSubmit, true);
    window.addEventListener('error', trackRuntimeError, true);
    window.addEventListener('unhandledrejection', trackUnhandledRejection);
    window.addEventListener('beforeunload', function () {
      trackPageLeave('unload', true);
      flush(true);
    });
    window.addEventListener('pagehide', function () {
      trackPageLeave('pagehide', true);
      flush(true);
    });

    window.FluxoSDK = {
      version: VERSION,
      siteKey: siteKey,
      apiUrl: apiUrl,
      visitorId: visitorId,
      sessionId: sessionId,
      getStatus: function () {
        return {
          siteKey: siteKey,
          visitorId: visitorId,
          sessionId: sessionId,
          pageId: page.id,
          queuedEvents: eventQueue.length,
        };
      },
      identify: function (id, traits) {
        userIdentifier = sanitizeText(id, 160);
        writeStorage(window.localStorage, storageKey('user_identifier', siteKey), userIdentifier);
        queueEvent(buildEvent('identify', {
          userId: userIdentifier,
          traits: traits && typeof traits === 'object' ? traits : {},
        }), { flush: true });
      },
      track: function (name, metadata) {
        queueEvent(buildEvent('custom', metadata && typeof metadata === 'object' ? metadata : {}, sanitizeText(name, 120)));
      },
      trackError: function (error, metadata) {
        queueEvent(buildEvent('js_error', Object.assign({
          message: sanitizeText(error && error.message ? error.message : String(error || 'Custom error'), 200),
          source: 'manual',
        }, metadata && typeof metadata === 'object' ? metadata : {})));
      },
      trackApiError: trackApiError,
      flush: function () {
        flush(false);
      },
    };

    startPage('page_view');
    observeWebVitals();
    patchFetchForApiErrors();

    if (document.readyState === 'complete') {
      setTimeout(sendNavigationPerformance, 0);
    } else {
      window.addEventListener('load', function () {
        setTimeout(sendNavigationPerformance, 0);
      });
    }
  }

  startSdk();
})();
