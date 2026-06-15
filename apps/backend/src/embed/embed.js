(function () {
  console.log('FluxoSDK: Iniciando carregamento robusto...');
  
  const scriptTag = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  
  const backendUrl = scriptTag.getAttribute('data-backend') || 'http://localhost:3000';
  const siteKey = scriptTag.getAttribute('data-key');

  if (!siteKey) {
    console.error('FluxoSDK: Site Key não fornecida.');
    return;
  }

  // --- Variáveis de Estado (Movidas para o topo para evitar ReferenceError) ---
  let events = [];
  const sessionId = sessionStorage.getItem('fluxosdk_session_id') || Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStorage.setItem('fluxosdk_session_id', sessionId);

  const visitorId = localStorage.getItem('fluxosdk_visitor_id') || (function() {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('fluxosdk_visitor_id', id);
    return id;
  })();

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      console.log(`FluxoSDK: Carregando ${src}...`);
      const s = document.createElement('script');
      s.src = src;
      s.type = 'text/javascript';
      s.async = true;
      s.crossOrigin = 'anonymous';
      
      s.onload = () => {
        console.log(`FluxoSDK: Sucesso ao carregar ${src}`);
        resolve();
      };
      
      s.onerror = () => {
        console.error(`FluxoSDK: Erro crítico ao carregar ${src}`);
        reject(new Error(`Falha no script: ${src}`));
      };
      
      document.head.appendChild(s);
    });
  };

  function flush(sock) {
    if (events.length > 0 && sock && sock.connected) {
      console.log(`FluxoSDK [3/5]: Enviando lote de ${events.length} eventos...`);
      sock.emit('rrweb-batch', {
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

  async function start() {
    try {
      await loadScript(`${backendUrl}/assets/socket.io.min.js`);
      await loadScript(`${backendUrl}/assets/rrweb.min.js`);

      await new Promise(r => setTimeout(r, 200));

      if (typeof io === 'undefined') throw new Error('Socket.io não disponível');
      if (typeof rrweb === 'undefined') throw new Error('rrweb não disponível');

      console.log('FluxoSDK: Dependências prontas. Iniciando socket...');

      const socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socket.on('connect', () => {
        console.log('FluxoSDK [1/5]: Conectado ao servidor');
      });

      console.log('FluxoSDK: Iniciando gravação rrweb...');
      rrweb.record({
        emit(event) {
          events.push(event);
          if (events.length === 1) {
             console.log('FluxoSDK [2/5]: Primeiro evento capturado e acumulando...');
          }
          if (events.length >= 100) {
            console.log('FluxoSDK [2/5]: Limite de 100 eventos atingido, forçando envio.');
            flush(socket);
          }
        },
      });

      setInterval(() => flush(socket), 5000);
      window.addEventListener('beforeunload', () => flush(socket));

    } catch (err) {
      console.error('FluxoSDK: Falha na inicialização:', err.message);
    }
  }

  start();
})();
