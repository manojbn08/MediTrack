import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;
const subscriptions = new Map();

export function getWebSocketClient() {
  if (stompClient && stompClient.active) {
    return stompClient;
  }

  const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080') + '/ws';

  stompClient = new Client({
    webSocketFactory: () => new SockJS(socketUrl),
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: (str) => {
      // In development, uncomment for verbose logging
      // console.log('[STOMP]', str);
    },
    onConnect: () => {
      console.log('[WEBSOCKET CONNECTED] STOMP session established on', socketUrl);
    },
    onStompError: (frame) => {
      console.error('[WEBSOCKET ERROR]', frame.headers['message'], frame.body);
    },
  });

  stompClient.activate();
  return stompClient;
}

export function subscribeToTopic(destination, callback) {
  const client = getWebSocketClient();

  const doSubscribe = () => {
    if (client.connected) {
      const sub = client.subscribe(destination, (message) => {
        try {
          const payload = JSON.parse(message.body);
          callback(payload);
        } catch (e) {
          callback(message.body);
        }
      });
      subscriptions.set(destination, sub);
    } else {
      setTimeout(doSubscribe, 500);
    }
  };

  doSubscribe();

  return () => {
    if (subscriptions.has(destination)) {
      subscriptions.get(destination).unsubscribe();
      subscriptions.delete(destination);
    }
  };
}

export function disconnectWebSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}
