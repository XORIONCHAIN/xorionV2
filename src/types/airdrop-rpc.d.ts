import '@polkadot/api';

declare module '@polkadot/api' {
  interface RpcInterface {
    airdrop: {
      isEligibleForAirdrop: (accountId: string) => Promise<any>;
      getAirdropPoolBalance: (accountId: string) => Promise<any>;
      getCooldownRemaining: (accountId: string) => Promise<any>;
    };
  }
} 