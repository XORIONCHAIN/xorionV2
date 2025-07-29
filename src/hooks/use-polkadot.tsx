import { ApiPromise, WsProvider } from '@polkadot/api';
import { useState, useEffect } from 'react';

interface ConnectionState {
  api: ApiPromise | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'degraded' | 'error';
  lastError: string | null;
  latency: number | null;
  connectionAttempts: number;
  lastSuccessfulConnection: number | null;
  endpoint: string | null;
}

class PersistentPolkadotApi {
  private static instance: PersistentPolkadotApi;
  private api: ApiPromise | null = null;
  private provider: WsProvider | null = null;
  private state: ConnectionState = {
    api: null,
    status: 'disconnected',
    lastError: null,
    latency: null,
    connectionAttempts: 0,
    lastSuccessfulConnection: null,
    endpoint: null
  };
  private listeners: Array<(state: ConnectionState) => void> = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private endpoints: string[];
  private currentEndpointIndex = 0;
  private connectionTimeout = 30000; // 30 seconds
  private maxRetries = 5;
  private retryDelay = 2000;
  private maxLatency = 1000; // 1 second

  private constructor(endpoints: string[] = (
    import.meta.env.VITE_POLKADOT_ENDPOINTS
      ? import.meta.env.VITE_POLKADOT_ENDPOINTS.split(',')
      : [
          'wss://rpc.polkadot.io',
          'wss://polkadot.api.onfinality.io/public-ws',
          'wss://polkadot-rpc.dwellir.com'
        ]
  )) {
    this.endpoints = endpoints;
    this.setupHealthMonitoring();
    this.connect();
  }

  static getInstance(endpoints?: string[]): PersistentPolkadotApi {
    if (!PersistentPolkadotApi.instance) {
      PersistentPolkadotApi.instance = new PersistentPolkadotApi(endpoints);
    }
    return PersistentPolkadotApi.instance;
  }

  private updateState(updates: Partial<ConnectionState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private async connect() {
    if (this.state.status === 'connecting') return;

    this.updateState({
      status: 'connecting',
      connectionAttempts: this.state.connectionAttempts + 1
    });

    try {
      // Clean up previous connection
      await this.disconnect();

      const endpoint = this.endpoints[this.currentEndpointIndex];
      this.updateState({ endpoint });

      this.provider = new WsProvider(endpoint, this.connectionTimeout);
      
      // Setup provider event handlers
      this.provider.on('connected', () => this.handleConnected());
      this.provider.on('disconnected', () => this.handleDisconnected());
      this.provider.on('error', (error: Error) => this.handleError(error));

      this.api = await ApiPromise.create({
        provider: this.provider,
        throwOnConnect: false,
        noInitWarn: true,
        initWasm: false
      });

      // Setup API event handlers
      this.api.on('connected', () => this.handleConnected());
      this.api.on('disconnected', () => this.handleDisconnected());
      this.api.on('error', (error: Error) => this.handleError(error));

      await this.api.isReady;
      
      // Verify connection with a simple RPC call
      await this.api.rpc.system.chain();
      
      this.updateState({
        status: 'connected',
        api: this.api,
        lastError: null,
        lastSuccessfulConnection: Date.now()
      });

    } catch (error) {
      this.handleError(error as Error);
      this.rotateEndpoint();
      this.scheduleReconnect();
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.api) {
        // Remove event listeners with their handlers
        this.api.off('connected', this.handleConnected);
        this.api.off('disconnected', this.handleDisconnected);
        this.api.off('error', this.handleError);
        await this.api.disconnect();
      }
      
      if (this.provider) {
        // WsProvider doesn't have off method, just disconnect
        this.provider.disconnect();
      }
    } catch (error) {
      console.error('Disconnection error:', error);
    } finally {
      this.api = null;
      this.provider = null;
    }
  }

  private handleConnected() {
    if (this.state.status !== 'connected') {
      this.updateState({
        status: 'connected',
        lastError: null,
        lastSuccessfulConnection: Date.now()
      });
    }
  }

  private handleDisconnected() {
    if (this.state.status !== 'disconnected') {
      this.updateState({ status: 'disconnected' });
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error) {
    this.updateState({
      status: 'error',
      lastError: error.message
    });
    this.scheduleReconnect();
  }

  private rotateEndpoint() {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
  }

  private scheduleReconnect() {
    if (this.state.connectionAttempts >= this.maxRetries) {
      this.updateState({
        status: 'error',
        lastError: 'Max connection attempts reached'
      });
      return;
    }

    setTimeout(() => {
      this.connect();
    }, this.retryDelay);

    // Exponential backoff
    this.retryDelay = Math.min(this.retryDelay * 2, 30000);
  }

  private setupHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      if ((this.state.status !== 'connected' && this.state.status !== 'degraded') || !this.api) return;

      try {
        const start = Date.now();
        await this.api.rpc.system.chain();
        const latency = Date.now() - start;

        this.updateState({ latency });

        if (latency > this.maxLatency) {
          if (this.state.status !== 'degraded') {
            this.updateState({ status: 'degraded' });
          }
        } else if (latency <= this.maxLatency && this.state.status === 'degraded') {
          this.updateState({ status: 'connected' });
        }
      } catch (error) {
        this.handleError(error as Error);
      }
    }, 15000); // Check every 15 seconds
  }

  async getApi(): Promise<ApiPromise> {
    if (this.api && this.state.status === 'connected') {
      return this.api;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Connection timeout'));
      }, 45000);

      const unsubscribe = this.subscribe((state) => {
        if (state.api && state.status === 'connected') {
          clearTimeout(timeout);
          unsubscribe();
          resolve(state.api);
        } else if (state.status === 'error' && state.connectionAttempts >= this.maxRetries) {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error(state.lastError || 'Connection failed'));
        }
      });
    });
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.disconnect();
    this.listeners = [];
  }
}

// Create singleton instance
const createApiManager = () => PersistentPolkadotApi.getInstance();

// Export the state interface for TypeScript
export type ApiState = ConnectionState;

// React hook for easy usage in components
export function usePolkadot() {
  const [state, setState] = useState<ConnectionState>(() => {
    const manager = createApiManager();
    return manager.getState();
  });

  useEffect(() => {
    const manager = createApiManager();
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    api: state.api,
    isConnected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    isError: state.status === 'error',
    isDegraded: state.status === 'degraded',
    connect: () => createApiManager().getApi(),
    disconnect: () => createApiManager().destroy()
  };
}

// Helper function for simple usage
export async function getPersistentApi(): Promise<ApiPromise> {
  return createApiManager().getApi();
}

// Export manager getter for components that need direct access
export const getApiManager = () => createApiManager();