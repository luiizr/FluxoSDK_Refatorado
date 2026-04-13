export type Site = {
  id: string;
  name: string;
  domain: string;
  active: boolean;
};

export type SiteKey = {
  id: string;
  siteId: string;
  publicKey: string;
  active: boolean;
};

export type BrowserSession = {
  id: string;
  siteKey: string;
  sessionId: string;
  startedAt: string;
  lastSeenAt: string;
};

export type PageVisit = {
  id: string;
  sessionId: string;
  pageId: string;
  url: string;
  path: string;
  title: string;
  enteredAt: string;
  leftAt?: string;
  durationMs?: number;
};

export type SdkEvent = {
  eventId: string;
  type: 'page_view' | 'click' | 'input_change' | 'route_change' | 'page_leave' | 'dom_summary';
  pageId: string;
  url: string;
  path: string;
  title: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type ReceiveSdkEventsPayload = {
  siteKey: string;
  sessionId: string;
  sentAt?: string;
  events: SdkEvent[];
};
