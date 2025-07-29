import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { FiDroplet, FiRefreshCw, FiInfo, FiZap, FiCopy, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { useWallet } from './WalletConnection';

class AirdropManager {
  api;
  account;
  constructor(api, account) {
    this.api = api;
    this.account = account;
  }

  async getAirdropStats() {
    try {
      const [totalAirdrops, airdropsThisBlock, airdropAmount, maxPerBlock] = await Promise.all([
        this.api.query.airdrop.totalAirdrops(),
        this.api.query.airdrop.airdropsThisBlock(),
        this.api.consts.airdrop.airdropAmount,
        this.api.consts.airdrop.maxAirdropsPerBlock
      ]);
      return {
        totalAirdrops: totalAirdrops.toString(),
        airdropsThisBlock: airdropsThisBlock.toString(),
        airdropAmount: airdropAmount.toString(),
        maxPerBlock: maxPerBlock.toString()
      };
    } catch (e) {
      return null;
    }
  }

  async claimAirdrop() {
    const injector = await web3FromAddress(this.account.address);
    return new Promise<void>((resolve, reject) => {
      this.api.tx.airdrop
        .claimAirdrop()
        .signAndSend(this.account.address, { signer: injector.signer, nonce: -1 }, (result) => {
          if (result.status.isInBlock) {
            let errored = false;
            result.events.forEach(({ event }) => {
              if (event.section === 'system' && event.method === 'ExtrinsicFailed') errored = true;
            });
            errored ? reject(new Error('Failed to claim (already claimed or error)')) : resolve();
          }
        })
        .catch(reject);
    });
  }
}

export default function AirdropPanel() {
  const [api, setApi] = useState(null);
  const [manager, setManager] = useState(null);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('connecting'); // or 'ready', 'error'
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const { selectedAccount } = useWallet();

  // Only connect to API if user has selected an account
  useEffect(() => {
    let unmounted = false;
    if (!selectedAccount) {
      setStatus('error');
      setError('Please connect your wallet first.');
      return;
    }
    (async (): Promise<void> => {
      setStatus('connecting');
      try {
        const wsUrl = import.meta.env.VITE_XORION_WS || 'wss://ws-proxy-latest-jds3.onrender.com';
        const _api = await ApiPromise.create({ provider: new WsProvider(wsUrl) });
        await _api.isReady;
        if (unmounted) return;
        setApi(_api);
        setStatus('ready');
      } catch (e) {
        setError('Failed to connect.');
        setStatus('error');
      }
    })();
    return () => { unmounted = true; };
  }, [selectedAccount]);

  // Set up manager and update stats
  useEffect(() => {
    if (api && selectedAccount) {
      const m = new AirdropManager(api, selectedAccount);
      setManager(m);
      (async () => {
        setLoading(true);
        setStats(await m.getAirdropStats());
        setLoading(false);
      })();
    }
  }, [api, selectedAccount]);

  // Airdrop events subscription – can skip for now for simplicity.

  function formatTokens(amt) {
    if (!amt) return "--";
    return (parseFloat(amt) / 1e18).toFixed(4);
  }
  function formatNumber(n) {
    n = +n;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  async function handleClaim() {
    setClaiming(true);
    setError('');
    setMsg('');
    try {
      await manager.claimAirdrop();
      setMsg('Airdrop claimed successfully!');
      setStats(await manager.getAirdropStats());
    } catch (err) {
      setError("You may have already claimed this airdrop or the claim failed.");
    }
    setClaiming(false);
  }

  function handleCopy() {
    if (selectedAccount) {
      navigator.clipboard.writeText(selectedAccount.address);
      setMsg('Copied address!');
      setTimeout(() => setMsg(''), 1500);
    }
  }

  return (
    <div className="max-w-xl mx-auto shadow-2xl rounded-2xl flex flex-col bg-gradient-to-br from-[#2e2257] via-[#1e284b] to-[#ff9100]/30 p-6 mt-12 items-stretch">
    <div className="mb-6 flex items-center gap-3">
      <FiDroplet size={32} className="text-pink-300 drop-shadow" />
      <h2 className="text-2xl font-bold text-[#f0e6ff] tracking-tight">Airdrop Claim Panel</h2>
    </div>
    {status === 'error' && (
      <div className="bg-red-700/80 text-pink-100 px-3 py-2 mb-4 rounded flex items-center gap-2 border border-red-300/30">
        <FiAlertCircle /> {error}
      </div>
    )}
    {/* Account Selection */}
    <label className="text-sm text-purple-200 mb-2 font-semibold">Account</label>
    <div className="flex mb-4 gap-2">
      <select
        value={selectedAccount ? selectedAccount.address : ''}
        disabled={true}
        className="rounded px-3 py-2 border border-[#5a48a9] text-base font-mono text-[#efeaff] bg-[#271e3e] w-full focus:outline-none focus:border-[#ff7bcd] shadow-sm"
      >
        {selectedAccount && (
          <option value={selectedAccount.address}>{selectedAccount.meta.name || selectedAccount.address}</option>
        )}
      </select>
      <button
        disabled={!selectedAccount}
        aria-label="copy address"
        title="Copy address"
        className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 hover:from-pink-300 hover:to-orange-400 rounded shadow-sm px-2 border border-[#ffd6fa]/40"
        tabIndex={-1}
        onClick={handleCopy}
      >
        <FiCopy className="text-white" size={22} />
      </button>
    </div>
  
    {/* Airdrop Stats */}
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="bg-gradient-to-b from-purple-600/20 via-cyan-800/10 to-orange-300/10 p-4 rounded flex flex-col items-center border border-blue-300/30 shadow-sm">
        <span className="text-xs text-[#7cb8ff] font-medium mb-1">Total Airdrops</span>
        <span className="text-lg font-bold text-[#57d6ff]">{stats ? formatNumber(stats.totalAirdrops) : "--"}</span>
      </div>
      <div className="bg-gradient-to-t from-pink-600/20 via-blue-500/10 to-orange-200/10 p-4 rounded flex flex-col items-center border border-pink-200/30 shadow-sm">
        <span className="text-xs text-pink-300 font-medium mb-1">Airdrop Amount</span>
        <span className="text-lg font-bold text-[#ffb1ec]">{stats ? formatTokens(stats.airdropAmount) : "--"} XOR</span>
      </div>
    </div>
    <div className="flex items-center justify-center mb-6">
      <FiZap className="text-[#b39aff] mr-2" size={22} />
      <span className="text-[#f6d9ff] drop-shadow font-semibold">No eligibility check. Click claim and receive instantly.</span>
    </div>
    <button
      className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-base font-semibold shadow-md transition
        ${claiming
          ? "bg-gradient-to-r from-pink-200 via-purple-300 to-blue-200 text-blue-900 cursor-wait"
          : "bg-gradient-to-r from-[#862aaf] via-[#0865b4] to-[#ff5e62] text-white hover:from-[#ff79b0] hover:to-[#ff9100]"
        }`}
      style={{ fontWeight: 700, letterSpacing: 0.5 }}
      onClick={handleClaim}
      disabled={claiming || !manager}
    >
      {claiming ? (
        <>
          <FiRefreshCw className="animate-spin" size={20} />
          Claiming...
        </>
      ) : (
        <>
          <FiDroplet size={20} />
          Claim Airdrop Now
        </>
      )}
    </button>
    {msg && !error && (
      <div className="flex items-center mt-4 text-orange-300 font-semibold">
        <FiCheckCircle className="mr-1" /> {msg}
      </div>
    )}
    {error && (
      <div className="flex items-center mt-4 text-pink-400 font-semibold">
        <FiAlertCircle className="mr-1" /> {error}
      </div>
    )}
  </div>
  );
}