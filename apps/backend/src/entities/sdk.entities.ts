export type Site = {
  id: string;
  userId?: string | null;
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
  visitorId?: string | null;
  sessionId: string;
  userIdentifier?: string | null;
  startedAt: string;
  lastSeenAt: string;
  context?: Record<string, unknown>;
};

export type PageVisit = {
  id: string;
  siteKey: string;
  visitorId?: string | null;
  sessionId: string;
  pageId: string;
  url: string;
  path: string;
  title: string;
  enteredAt: string;
  leftAt?: string;
  durationMs?: number;
  maxScrollDepth?: number;
};

export type SdkEventType =
  | 'page_view'
  | 'route_change'
  | 'page_leave'
  | 'click'
  | 'dead_click'
  | 'rage_click'
  | 'form_start'
  | 'form_submit'
  | 'form_abandon'
  | 'field_error'
  | 'scroll_depth'
  | 'web_vital'
  | 'performance'
  | 'js_error'
  | 'resource_error'
  | 'api_error'
  | 'custom'
  | 'identify';

export type SdkEvent = {
  eventId: string;
  type: SdkEventType | string;
  name?: string;
  pageId: string;
  url: string;
  path: string;
  title: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export type ReceiveSdkEventsPayload = {
  siteKey: string;
  visitorId?: string;
  sessionId: string;
  userIdentifier?: string;
  sentAt?: string;
  context?: Record<string, unknown>;
  events: SdkEvent[];
};
