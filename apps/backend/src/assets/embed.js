(function () {
  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) {
      return prefix + '_' + window.crypto.randomUUID();
    }
    return prefix + '_' + Date.now();
  }

  function getCurrentScript() {
    return document.currentScript || document.querySelector('script[data-site-key]');
  }

  function buildBaseEvent(type, pageId) {
    return {
      eventId: createId('evt'),
      type: type,
      pageId: pageId,
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      occurredAt: new Date().toISOString(),
      metadata: {}
    };
  }

  var eventQueue = [];
  var flushTimer = null;

  function pushEvents(apiUrl, siteKey, sessionId, events) {
    if (events.length === 0) return;
    var payload = events.slice();
    
    fetch(apiUrl.replace(/\/$/, '') + '/api/sdk/events', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteKey: siteKey,
        sessionId: sessionId,
        sentAt: new Date().toISOString(),
        events: payload
      }),
      keepalive: true
    }).catch(function (error) {
      console.error('FluxoSDK flush error:', error);
    });
  }

  function queueEvent(apiUrl, siteKey, sessionId, events) {
    eventQueue = eventQueue.concat(events);
    if (!flushTimer) {
      flushTimer = setTimeout(function() {
        pushEvents(apiUrl, siteKey, sessionId, eventQueue);
        eventQueue = [];
        flushTimer = null;
      }, 5000); // 5 seconds queue
    }
  }

  function handleExit(apiUrl, siteKey, sessionId) {
    if (eventQueue.length > 0) {
      pushEvents(apiUrl, siteKey, sessionId, eventQueue);
      eventQueue = [];
    }
  }

  function collectDomSummary(pageId) {
    return {
      eventId: createId('evt'),
      type: 'dom_summary',
      pageId: pageId,
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      occurredAt: new Date().toISOString(),
      metadata: {
        totalNodes: document.querySelectorAll('*').length,
        totalButtons: document.querySelectorAll('button').length,
        totalLinks: document.querySelectorAll('a').length,
        totalInputs: document.querySelectorAll('input').length,
        totalForms: document.querySelectorAll('form').length
      }
    };
  }

  function startSdk() {
    var script = getCurrentScript();
    if (!script) return;

    var siteKey = script.dataset.siteKey || '';
    if (!siteKey) {
        console.warn('FluxoSDK: Não foi enviada a data-site-key na tag do script da SDK.');
    }
    
    // Obter apiUrl preferencialmente do dataset, senao da origem do script
    var apiUrl = script.dataset.apiUrl || (script.src ? new URL(script.src).origin : window.location.origin);

    var sessionId = localStorage.getItem('fluxosdk_session_id');
    if (!sessionId) {
        sessionId = createId('sess');
        localStorage.setItem('fluxosdk_session_id', sessionId);
    }
    
    var pageId = createId('page');

    window.FluxoSDK = {
      siteKey: siteKey,
      apiUrl: apiUrl,
      sessionId: sessionId,
      pageId: pageId,
      startedAt: new Date().toISOString()
    };

    var pageStartTime = Date.now();

    function trackTimeOnPage(oldPageId) {
      if (!oldPageId) return;
      var duration = Math.floor((Date.now() - pageStartTime) / 1000);
      if (duration > 0) {
        queueEvent(apiUrl, siteKey, sessionId, [
          {
            eventId: createId('evt'),
            type: 'time_on_page',
            pageId: oldPageId,
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
            occurredAt: new Date().toISOString(),
            metadata: { duration: duration }
          }
        ]);
      }
    }

    queueEvent(apiUrl, siteKey, sessionId, [
      buildBaseEvent('page_view', pageId),
      collectDomSummary(pageId)
    ]);

    document.addEventListener('click', function (event) {
      var target = event.target;
      queueEvent(apiUrl, siteKey, sessionId, [
        {
          eventId: createId('evt'),
          type: 'click',
          pageId: pageId,
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          occurredAt: new Date().toISOString(),
          metadata: {
            tag: target && target.tagName ? target.tagName.toLowerCase() : null,
            id: target && target.id ? target.id : null,
            text: target && target.textContent ? String(target.textContent).trim().slice(0, 80) : null
          }
        }
      ]);
    }, true);

    document.addEventListener('submit', function (event) {
      var target = event.target;
      var inputs = target.querySelectorAll('input, select, textarea');
      var fieldNames = [];
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].name) fieldNames.push(inputs[i].name);
      }

      queueEvent(apiUrl, siteKey, sessionId, [
        {
          eventId: createId('evt'),
          type: 'form_submit',
          pageId: pageId,
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          occurredAt: new Date().toISOString(),
          metadata: {
            id: target && target.id ? target.id : null,
            action: target && target.action ? target.action : null,
            fields: fieldNames.join(', ')
          }
        }
      ]);
    }, true);

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    function handleRouteChanged() {
      setTimeout(function () {
        trackTimeOnPage(pageId); // tempo da página anterior
        pageId = createId('page'); // Nova página virtual
        window.FluxoSDK.pageId = pageId;
        pageStartTime = Date.now();
        
        queueEvent(apiUrl, siteKey, sessionId, [
          buildBaseEvent('route_change', pageId),
          collectDomSummary(pageId)
        ]);
      }, 50);
    }

    history.pushState = function () {
      originalPushState.apply(history, arguments);
      handleRouteChanged();
    };

    history.replaceState = function () {
      originalReplaceState.apply(history, arguments);
      handleRouteChanged();
    };

    window.addEventListener('popstate', function () {
      handleRouteChanged();
    });

    window.addEventListener('beforeunload', function () {
        trackTimeOnPage(pageId);
        handleExit(apiUrl, siteKey, sessionId);
    });
  }

  startSdk();
})();
