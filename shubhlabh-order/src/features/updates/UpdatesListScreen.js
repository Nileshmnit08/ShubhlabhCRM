import React from 'react';
import NotificationInboxScreen from '../notifications/NotificationInboxScreen';

/**
 * UpdatesListScreen (Legacy Route Alias)
 * 
 * Re-exports the canonical live NotificationInboxScreen to ensure all historical
 * navigation paths ('UpdatesList') display genuine CRM-published notices rather
 * than disconnected prototype mocks.
 */
export default function UpdatesListScreen(props) {
  return <NotificationInboxScreen {...props} />;
}
