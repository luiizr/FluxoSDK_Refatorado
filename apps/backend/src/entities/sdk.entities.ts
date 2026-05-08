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
  | 'navigation'
  | 'page_leave'
  | 'click'
  | 'dead_click'
  | 'rage_click'
  | 'form_start'
  | 'form_submit'
  | 'form_abandon'
  | 'field_error'
  | 'form_error'
  | 'input_focus'
  | 'input_blur'
  | 'scroll_depth'
  | 'web_vital'
  | 'performance'
  | 'js_error'
  | 'resource_error'
  | 'api_error'
  | 'custom'
  | 'identify';

export type SdkEventElement = {
  selector?: string;
  text?: string;
  tag?: string;
};

export type SdkEvent = {
  eventId?: string;
  event_id?: string;
  type: SdkEventType | string;
  event_type?: SdkEventType | string;
  name?: string;
  pageId?: string;
  page_id?: string;
  url: string;
  path: string;
  title?: string;
  occurredAt?: string;
  occurred_at?: string;
  element?: SdkEventElement;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export type ReceiveSdkEventsPayload = {
  siteKey?: string;
  site_key?: string;
  visitorId?: string;
  visitor_id?: string;
  sessionId?: string;
  session_id?: string;
  userIdentifier?: string;
  user_identifier?: string;
  sentAt?: string;
  sent_at?: string;
  context?: Record<string, unknown>;
  events: SdkEvent[];
};
