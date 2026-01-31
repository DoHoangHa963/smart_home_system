import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Kiểm tra xem có đang chạy trên thiết bị di động thật hay không (loại trừ DevTools)
const isRealMobile = () => {
    const ua = navigator.userAgent;
    const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const hasMobileInUA = mobilePattern.test(ua);
    const isSmallScreen = window.innerWidth < 768;
    return hasMobileInUA && isSmallScreen;
};

// Xác định WebSocket URL (tương tự logic trong api.ts)
const getWebSocketURL = () => {
    const envURL = import.meta.env.VITE_API_URL;
    const isMobile = isRealMobile();

    if (isMobile) {
        // TRÊN MOBILE: Dùng IP từ env hoặc IP mặc định
        if (envURL && !envURL.includes('localhost') && !envURL.includes('127.0.0.1')) {
            return envURL.replace('/api/v1', '/api/ws');
        }
        if (envURL?.includes('localhost')) {
            return envURL.replace('localhost', '192.168.0.199').replace('/api/v1', '/api/ws');
        }
        return 'http://192.168.0.199:8080/api/ws';
    }

    // TRÊN DESKTOP: Luôn ưu tiên localhost
    if (envURL && (envURL.includes('localhost') || envURL.includes('127.0.0.1'))) {
        return envURL.replace('/api/v1', '/api/ws');
    }

    // Desktop default: LUÔN dùng localhost
    return 'http://localhost:8080/api/ws';
};

const WS_URL = getWebSocketURL();
console.log('✅ WebSocket URL:', WS_URL);
const DEBUG = true;

interface PendingSubscription {
    topic: string;
    callback: (message: any) => void;
}

class WebSocketService {
    private client: Client;
    private subscriptions: Map<string, StompSubscription> = new Map();
    private pendingSubscriptions: PendingSubscription[] = [];
    private isConnected: boolean = false;

    constructor() {
        this.client = new Client({
            // Use SockJS for better compatibility (handles fallback automatically)
            webSocketFactory: () => new SockJS(WS_URL),
            debug: (str) => {
                if (DEBUG) console.log('[STOMP]: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = (frame) => {
            console.log('[STOMP] ✅ Connected successfully');
            this.isConnected = true;

            // Process pending subscriptions
            if (this.pendingSubscriptions.length > 0) {
                console.log(`[STOMP] Processing ${this.pendingSubscriptions.length} pending subscriptions`);
                this.pendingSubscriptions.forEach(({ topic, callback }) => {
                    this.doSubscribe(topic, callback);
                });
                this.pendingSubscriptions = [];
            }
        };

        this.client.onDisconnect = () => {
            console.log('[STOMP] ⚠️ Disconnected');
            this.isConnected = false;
        };

        this.client.onStompError = (frame) => {
            console.error('[STOMP] ❌ Broker reported error: ' + frame.headers['message']);
            console.error('[STOMP] Additional details: ' + frame.body);
        };

        this.client.onWebSocketClose = () => {
            console.log('[STOMP] WebSocket closed, will attempt reconnect...');
            this.isConnected = false;
        };
    }

    public activate() {
        if (!this.client.active) {
            console.log('[STOMP] Activating WebSocket connection...');
            this.client.activate();
        }
    }

    public deactivate() {
        if (this.client.active) {
            console.log('[STOMP] Deactivating WebSocket connection...');
            this.client.deactivate();
        }
    }

    private doSubscribe(topic: string, callback: (message: any) => void): string {
        try {
            const subscription = this.client.subscribe(topic, (message) => {
                try {
                    const parsedBody = JSON.parse(message.body);
                    callback(parsedBody);
                } catch (e) {
                    // Fallback for non-JSON payload
                    callback(message.body);
                }
            });

            this.subscriptions.set(topic, subscription);
            console.log(`[STOMP] ✅ Subscribed to: ${topic}`);
            return topic;
        } catch (error) {
            console.error('[STOMP] ❌ Failed to subscribe to ' + topic, error);
            return '';
        }
    }

    public subscribe(topic: string, callback: (message: any) => void): string {
        // Ensure client is active
        this.activate();

        // If already connected, subscribe immediately
        if (this.isConnected && this.client.connected) {
            return this.doSubscribe(topic, callback);
        }

        // Otherwise, queue for later
        console.log(`[STOMP] ⏳ Queueing subscription for ${topic} (not connected yet)`);
        this.pendingSubscriptions.push({ topic, callback });
        return topic;
    }

    public unsubscribe(subId: string) {
        const subscription = this.subscriptions.get(subId);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(subId);
            console.log(`[STOMP] ✅ Unsubscribed from: ${subId}`);
        }
    }

    // Helper to get raw client if needed
    public getClient() {
        return this.client;
    }
}

export const webSocketService = new WebSocketService();
