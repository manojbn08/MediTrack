import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;
const subscriptions = new Map();

export function getWebSocketClient() {
  if (stompClient && stompClient.active) {
    return stompClient;
  }

  const apiUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:8080/api' : '/api');
  const baseUrl = apiUrl.startsWith('http') ? apiUrl.replace(/\/api\/?$/, '') : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');
  const socketUrl = `${baseUrl}/ws`;

  stompClient = new Client({
    webSocketFactory: () => {
      try {
        return new SockJS(socketUrl);
      } catch (e) {
        console.warn('[STOMP] SockJS init warning:', e);
        return null;
      }
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: () => {},
    onConnect: () => {
      console.log('[WEBSOCKET CONNECTED] STOMP session established on', socketUrl);
    },
    onStompError: (frame) => {
      console.warn('[WEBSOCKET STOMP ERROR]', frame?.headers?.message);
    },
    onWebSocketError: (err) => {
      // Graceful silence when backend is restarting
    },
  });

  try {
    stompClient.activate();
  } catch (err) {
    console.warn('[STOMP Activation]', err);
  }
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
