import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { AirdropManager } from '../lib/AirdropManager';

export const useAirdrop = () => {
  const [state, setState] = useState({
    api: null,
    accounts: [],
    selectedAccount: null,
    airdropManager: null,
    stats: null,
    eligibility: null,
    events: [],
    isLoading: false,
    isConnecting: false,
    error: null
  });

  const eventUnsubscribeRef = useRef(null);

  // Initialize API and wallet connection
  const connect = useCallback(async (wsUrl = import.meta.env.VITE_XORION_WS || 'wss://ws-proxy-latest-jds3.onrender.com') => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Enable wallet extension
      const extensions = await web3Enable('Airdrop DApp');
      if (extensions.length === 0) {
        throw new Error('No wallet extension found');
      }

      // Connect to node
      const wsProvider = new WsProvider(wsUrl);
      const api = await ApiPromise.create({ provider: wsProvider });
      await api.isReady;

      // Get accounts
      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }

      setState(prev => ({
        ...prev,
        api,
        accounts,
        selectedAccount: accounts[0], // Auto-select first account
        isConnecting: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, []);

  // Select an account
  const selectAccount = useCallback((account) => {
    setState(prev => ({ ...prev, selectedAccount: account }));
  }, []);

  // Create airdrop manager when API and account are ready
  useEffect(() => {
    if (state.api && state.selectedAccount) {
      const manager = new AirdropManager(state.api, state.selectedAccount);
      setState(prev => ({ ...prev, airdropManager: manager }));
    }
  }, [state.api, state.selectedAccount]);

  // Subscribe to events when airdrop manager is ready
  useEffect(() => {
    if (state.airdropManager) {
      const subscribeToEvents = async () => {
        try {
          const unsubscribe = await state.airdropManager.subscribeToEvents((event) => {
            setState(prev => ({
              ...prev,
              events: [event, ...prev.events.slice(0, 9)] // Keep last 10 events
            }));
          });
          eventUnsubscribeRef.current = unsubscribe;
        } catch (error) {
          console.error('Failed to subscribe to events:', error);
        }
      };

      subscribeToEvents();

      // Cleanup on unmount or when manager changes
      return () => {
        if (eventUnsubscribeRef.current) {
          eventUnsubscribeRef.current();
          eventUnsubscribeRef.current = null;
        }
      };
    }
  }, [state.airdropManager]);

  // Refresh airdrop statistics
  const refreshStats = useCallback(async () => {
    if (!state.airdropManager) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const stats = await state.airdropManager.getAirdropStats();
      setState(prev => ({ ...prev, stats, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get stats'
      }));
    }
  }, [state.airdropManager]);

  // Check eligibility
  const checkEligibility = useCallback(async () => {
    if (!state.airdropManager) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const eligibility = await state.airdropManager.checkEligibility();
      setState(prev => ({ ...prev, eligibility, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check eligibility'
      }));
    }
  }, [state.airdropManager]);

  // Claim airdrop
  const claimAirdrop = useCallback(async () => {
    if (!state.airdropManager || !state.eligibility?.eligible) {
      setState(prev => ({ ...prev, error: 'Not eligible to claim airdrop' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await state.airdropManager.claimAirdrop();
      
      // Refresh stats and eligibility after claiming
      await Promise.all([refreshStats(), checkEligibility()]);
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to claim airdrop'
      }));
    }
  }, [state.airdropManager, state.eligibility, refreshStats, checkEligibility]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventUnsubscribeRef.current) {
        eventUnsubscribeRef.current();
      }
      if (state.api) {
        state.api.disconnect();
      }
    };
  }, []);

  // Auto-refresh stats when manager is ready
  useEffect(() => {
    if (state.airdropManager) {
      refreshStats();
      checkEligibility();
    }
  }, [state.airdropManager, refreshStats, checkEligibility]);

  return {
    ...state,
    connect,
    selectAccount,
    refreshStats,
    checkEligibility,
    claimAirdrop,
    clearError
  };
};
