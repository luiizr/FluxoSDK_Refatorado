(function () {
  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) {
      return prefix + '_' + window.crypto.randomUUID();
    }
    return prefix + '_' + Date.now();
  }

  function getCurrentScript() {
    return document.currentScript;
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

  function sendEvents(apiUrl, siteKey, sessionId, events) {
    return fetch(apiUrl.replace(/\/$/, '') + '/api/sdk/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteKey: siteKey,
        sessionId: sessionId,
        sentAt: new Date().toISOString(),
        events: events
      })
    });
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
    var apiUrl = script.dataset.apiUrl || window.location.origin;
    var sessionId = createId('sess');
    var pageId = createId('page');

    window.FluxoSDK = {
      siteKey: siteKey,
      apiUrl: apiUrl,
      sessionId: sessionId,
      pageId: pageId,
      startedAt: new Date().toISOString()
    };

    sendEvents(apiUrl, siteKey, sessionId, [
      buildBaseEvent('page_view', pageId),
      collectDomSummary(pageId)
    ]).catch(function (error) {
      console.error('FluxoSDK error:', error);
    });

    document.addEventListener('click', function (event) {
      var target = event.target;
      sendEvents(apiUrl, siteKey, sessionId, [
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
      ]).catch(function (error) {
        console.error('FluxoSDK click error:', error);
      });
    }, true);
  }

  startSdk();
})();
