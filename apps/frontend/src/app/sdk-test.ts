type SdkEvent = {
  eventId: string;
  type: 'page_view' | 'click';
  pageId: string;
  url: string;
  path: string;
  title: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

type StartSdkConfig = {
  siteKey: string;
  apiUrl: string;
  debug?: boolean;
};

declare global {
  interface Window {
    FluxoSDK?: {
      start: (config: StartSdkConfig) => void;
      trackClick: (label?: string) => Promise<void>;
      getStatus: () => Record<string, unknown>;
    };
  }
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

export function registerSdkOnWindow() {
  let started = false;
  let siteKey = '';
  let apiUrl = '';
  const sessionId = createId('sess');
  const pageId = createId('page');
  let lastSendAt: string | null = null;

  async function sendEvents(events: SdkEvent[]) {
    const payload = {
      siteKey,
      sessionId,
      sentAt: new Date().toISOString(),
      events,
    };

    const response = await fetch(`${apiUrl}/api/sdk/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar eventos do SDK');
    }

    lastSendAt = new Date().toISOString();
    return response.json();
  }

  window.FluxoSDK = {
    start(config: StartSdkConfig) {
      if (started) return;

      siteKey = config.siteKey;
      apiUrl = config.apiUrl;
      started = true;

      void sendEvents([
        {
          eventId: createId('evt'),
          type: 'page_view',
          pageId,
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          occurredAt: new Date().toISOString(),
          metadata: {
            debug: config.debug ?? false,
          },
        },
      ]);
    },

    async trackClick(label?: string) {
      if (!started) {
        throw new Error('SDK ainda não foi iniciado');
      }

      return sendEvents([
        {
          eventId: createId('evt'),
          type: 'click',
          pageId,
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          occurredAt: new Date().toISOString(),
          metadata: {
            label: label ?? 'manual-click',
          },
        },
      ]);
    },

    getStatus() {
      return {
        started,
        siteKey,
        apiUrl,
        sessionId,
        pageId,
        lastSendAt,
      };
    },
  };
}
