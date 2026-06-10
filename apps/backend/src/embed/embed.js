(function () {
  const scriptTag = document.currentScript;
  const backendUrl = scriptTag.getAttribute('data-backend') || 'http://localhost:3333';
  const siteKey = scriptTag.getAttribute('data-key');

  if (!siteKey) {
    console.error('FluxoSDK: Site Key não fornecida.');
    return;
  }

  // Carregar dependências via CDN de forma assíncrona
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  async function start() {
    try {
      await Promise.all([
        loadScript('https://cdn.socket.io/4.7.2/socket.io.min.js'),
        loadScript('https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js'),
      ]);

      let events = [];
      const sessionId =
        sessionStorage.getItem('fluxosdk_session_id') ||
        Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('fluxosdk_session_id', sessionId);

      let visitorId = localStorage.getItem('fluxosdk_visitor_id');
      if (!visitorId) {
        visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('fluxosdk_visitor_id', visitorId);
      }

      const socket = io(backendUrl);

      socket.on('connect', () => {
        console.log('FluxoSDK: Conectado ao servidor');
      });

      rrweb.record({
        emit(event) {
          events.push(event);
          // Enviar imediatamente se acumular muitos eventos
          if (events.length >= 100) {
            flush();
          }
        },
      });

      function flush() {
        if (events.length > 0 && socket.connected) {
          socket.emit('rrweb-batch', {
            siteKey,
            sessionId,
            visitorId,
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
            events: [...events],
            sentAt: new Date().toISOString(),
          });
          events = [];
        }
      }

      // Enviar a cada 5 segundos se houver dados
      setInterval(flush, 5000);

      // Enviar antes de fechar a página
      window.addEventListener('beforeunload', flush);

    } catch (err) {
      console.error('FluxoSDK: Erro ao inicializar', err);
    }
  }

  start();
})();
