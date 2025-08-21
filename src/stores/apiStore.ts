import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Metadata } from "@polkadot/types";
import { TypeRegistry } from "@polkadot/types/create";
import { precompiledMetadata } from "../metadata";

export interface ApiState {
  api: ApiPromise | null;
  status: "disconnected" | "connecting" | "connected" | "degraded" | "error";
  lastError: string | null;
  latency: number | null;
  connectionAttempts: number;
  lastSuccessfulConnection: number | null;
  endpoint: string | null;
  lastConnected: Date | null;
}

interface ApiStore {
  // API STATE
  apiState: ApiState;
  api: ApiPromise | null;

  // ACTIONS
  setApiState: (state: Partial<ApiState>) => void;
  setApi: (api: ApiPromise | null) => void;

  // API MANAGEMENT
  connect: (endpoint?: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  verifyChainConnection: () => Promise<any | undefined>;
}

const ENDPOINTS = import.meta.env.VITE_POLKADOT_ENDPOINTS
  ? import.meta.env.VITE_POLKADOT_ENDPOINTS.split(",")
  : [
      "wss://node01.xorion.network",
      "wss://node02.xorion.network",
      "wss://node03.xorion.network",
      "wss://node04.xorion.network",
      "wss://node05.xorion.network",
      "wss://node06.xorion.network",
      "wss://node07.xorion.network",
    ];

// CONNECTION CONSTANTS
const MAX_RETRIES = 5;
const MAX_RETRY_DELAY = 30000;
const HEALTH_CHECK_INTERVAL = 30000;
const MAX_LATENCY = 5000;
const CACHE_TTL = 30000;

// GLOBAL CONNECTION VARIABLES
let currentApi: ApiPromise | null = null;
let currentProvider: WsProvider | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let retryDelay = 1000;
let eventListeners: Record<string, () => void> = {};

export const useApiStore = create<ApiStore>()(
  subscribeWithSelector((set, get) => ({
    // INITIAL STATE
    apiState: {
      api: null,
      status: "disconnected",
      lastError: null,
      latency: null,
      connectionAttempts: 0,
      lastSuccessfulConnection: null,
      endpoint: null,
      lastConnected: null,
    },
    api: null,

    // ACTIONS
    setApiState: (state: Partial<ApiState>) => {
      set((prev) => ({
        apiState: { ...prev.apiState, ...state },
      }));
    },

    setApi: (api: ApiPromise | null) => {
      set({ api });
      currentApi = api;
    },

    // API MANAGEMENT
    connect: async (endpoint?: string) => {
      const { setApiState, setApi } = get();

      if (currentApi) {
        console.log("🔌 Already connected, disconnecting first...");
        await get().disconnect();
      }

      const targetEndpoint = endpoint || ENDPOINTS[0];
      console.log(`🔗 Connecting to ${targetEndpoint}...`);

      setApiState({
        status: "connecting",
        endpoint: targetEndpoint,
        lastError: null,
        connectionAttempts: get().apiState.connectionAttempts + 1,
      });

      try {
        const provider = new WsProvider(targetEndpoint, false);
        currentProvider = provider;

        setupProviderListeners(provider, targetEndpoint);

        const api = await ApiPromise.create({
          provider,
          registry: new TypeRegistry(),
          metadata: new Metadata(new TypeRegistry(), precompiledMetadata),
        });

        setApi(api);
        setApiState({
          status: "connected",
          lastSuccessfulConnection: Date.now(),
          lastConnected: new Date(),
          connectionAttempts: 0,
        });

        setupHealthMonitoring();
        console.log("✅ Connected successfully");
      } catch (error: any) {
        console.error("❌ Connection failed:", error);
        setApiState({
          status: "error",
          lastError: error.message,
        });

        if (get().apiState.connectionAttempts < MAX_RETRIES) {
          scheduleReconnect();
        }
      }
    },

    disconnect: async () => {
      // Clean up real-time subscription
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
      }

      await cleanupConnection();

      set({
        apiState: {
          api: null,
          status: "disconnected",
          lastError: null,
          latency: null,
          connectionAttempts: 0,
          lastSuccessfulConnection: null,
          endpoint: null,
          lastConnected: null,
        },
        api: null,
      });
    },

    reconnect: async () => {
      const { endpoint } = get().apiState;
      await get().disconnect();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await get().connect(endpoint || undefined);
    },

    verifyChainConnection: async () => {
      const { api } = get();
      if (!api) return;

      try {
        const [chainName, chainType, nodeVersion] = await Promise.all([
          api.rpc.system.chain(),
          api.rpc.system.chainType(),
          api.rpc.system.version(),
        ]);

        console.log("🔍 Connected Chain Info:");
        console.log("Chain Name:", chainName.toString());
        console.log("Chain Type:", chainType.toString());
        console.log("Node Version:", nodeVersion.toString());

        return {
          chainName: chainName.toString(),
          chainType: chainType.toString(),
          nodeVersion: nodeVersion.toString(),
        };
      } catch (error) {
        console.error("Error verifying chain:", error);
        return undefined;
      }
    },
  }))
);

// Helper functions
async function cleanupConnection() {
  // Clear intervals
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clean up event listeners
  Object.values(eventListeners).forEach((cleanup) => cleanup());
  eventListeners = {};

  // Disconnect API
  if (currentApi) {
    try {
      await currentApi.disconnect();
    } catch (error) {
      console.warn("Error disconnecting API:", error);
    }
    currentApi = null;
  }

  // Disconnect provider
  if (currentProvider) {
    try {
      currentProvider.disconnect();
    } catch (error) {
      console.warn("Error disconnecting provider:", error);
    }
    currentProvider = null;
  }
}

function setupProviderListeners(provider: WsProvider, endpoint: string) {
  const { setApiState } = useApiStore.getState();

  const onConnected = () => {
    console.log(`🔗 WebSocket connected to ${endpoint}`);
    setApiState({ status: "connected", lastConnected: new Date() });
  };

  const onDisconnected = () => {
    console.log(`🔌 WebSocket disconnected from ${endpoint}`);
    setApiState({ status: "disconnected" });
    scheduleReconnect();
  };

  const onError = (error: any) => {
    console.error(`❌ WebSocket error on ${endpoint}:`, error);
    setApiState({ status: "error", lastError: error.message });
    scheduleReconnect();
  };

  provider.on("connected", onConnected);
  provider.on("disconnected", onDisconnected);
  provider.on("error", onError);
}

function setupHealthMonitoring() {
  if (healthCheckInterval) return;

  healthCheckInterval = setInterval(async () => {
    const { api, apiState, setApiState } = useApiStore.getState();

    if (
      !api ||
      (apiState.status !== "connected" && apiState.status !== "degraded")
    ) {
      return;
    }

    try {
      const start = Date.now();
      await api.rpc.system.chain();
      const latency = Date.now() - start;

      setApiState({ latency });

      if (latency > MAX_LATENCY) {
        if (apiState.status !== "degraded") {
          setApiState({ status: "degraded" });
        }
      } else if (latency <= MAX_LATENCY && apiState.status === "degraded") {
        setApiState({ status: "connected" });
      }
    } catch (error: any) {
      console.error("❌ Health check failed:", error);
      setApiState({ status: "error", lastError: error.message });
      scheduleReconnect();
    }
  }, HEALTH_CHECK_INTERVAL);
}

function scheduleReconnect() {
  if (reconnectTimeout) return;

  const { connectionAttempts } = useApiStore.getState().apiState;

  if (connectionAttempts >= MAX_RETRIES) {
    console.error("❌ Max connection attempts reached");
    return;
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    rotateEndpoint();
    useApiStore.getState().connect();
  }, retryDelay);

  // Exponential backoff
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
}

function rotateEndpoint() {
  // Simple endpoint rotation logic
  const currentEndpoint = useApiStore.getState().apiState.endpoint;
  const currentIndex = ENDPOINTS.indexOf(currentEndpoint || "");
  const nextIndex = (currentIndex + 1) % ENDPOINTS.length;
  console.log(`🔄 Rotating to endpoint: ${ENDPOINTS[nextIndex]}`);
}

// Auto-connect on store initialization
if (typeof window !== "undefined") {
  setTimeout(() => {
    useApiStore.getState().connect();
  }, 1000);
}

// Clean up on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
      realtimeSubscription = null;
    }
  });
}

// Global variable for real-time subscription (will be used by transaction store)
let realtimeSubscription: any = null;
export { realtimeSubscription };
