// No central event-name registry exists on the backend — the event
// string itself is a literal at each call site inside each domain's own
// service.js. This file is where that fragmentation stops being every
// app's individual problem. Each entry below must be confirmed against
// the literal string in the corresponding backend service.js before use.
// Do not add an entry from a plausible-sounding resource-name guess —
// an unconfirmed name fails silently (no error, the handler just never
// fires).

export const SOCKET_EVENTS = {
  BOOKING_CREATED: 'booking:created',
  BOOKING_UPDATED: 'booking:updated',
  // Confirmed against rooms.service.js#updateRoomStatus's literal emit —
  // note it's status_changed (underscore), not the more tempting-looking
  // status:updated. A previous guess at this name in rooms/page.tsx used
  // the wrong one and the handler simply never fired, silently, exactly
  // as the warning above predicts.
  ROOM_STATUS_CHANGED: 'room:status_changed',
  // Confirmed against messaging.service.js — emitted to staff on customer
  // inbound (emitToProperty) and to the customer on staff in_app reply
  // (emitToUser), same event name and payload shape both directions.
  MESSAGING_NEW_MESSAGE: 'messaging:new_message',
  // Additional confirmed events are added here per-portal, in the phase
  // that needs them, each individually verified.
} as const;
export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
