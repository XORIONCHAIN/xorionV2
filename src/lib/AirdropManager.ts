import { web3FromAddress } from '@polkadot/extension-dapp';

export class AirdropManager {
  constructor(api, account) {
    this.api = api;
    this.account = account;
  }

  async getAirdropStats() {
    try {
      // Check if API is connected before making queries
      if (!this.api.isConnected) {
        throw new Error('API is not connected');
      }

      const [totalAirdrops, airdropsThisBlock, airdropAmount, maxPerBlock, cooldownPeriod] = await Promise.all([
        this.api.query.airdrop.totalAirdrops(),
        this.api.query.airdrop.airdropsThisBlock(),
        this.api.consts.airdrop.airdropAmount,
        this.api.consts.airdrop.maxAirdropsPerBlock,
        this.api.consts.airdrop.cooldownPeriod
      ]);
      
      return {
        totalAirdrops: totalAirdrops.toString(),
        airdropsThisBlock: airdropsThisBlock.toString(),
        airdropAmount: airdropAmount.toString(),
        maxPerBlock: maxPerBlock.toString(),
        cooldownPeriod: cooldownPeriod.toString()
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  async checkEligibility() {
    try {
      if (!this.api.isConnected) {
        return { eligible: false, reason: 'API is not connected' };
      }

      // Get account info
      const accountInfo = await this.api.query.system.account(this.account.address);
      const userFree = accountInfo.data.free.toBn();
      
      // Check if user has minimum balance (example: 1 token)
      const minBalance = this.api.createType('Balance', '1000000000000'); // 1 token with 12 decimals
      
      if (userFree.lt(minBalance)) {
        return { 
          eligible: false, 
          reason: 'Insufficient balance. Minimum 1 XOR required.' 
        };
      }

      // Check if already claimed (if your pallet tracks this)
      try {
        const claimedStatus = await this.api.query.airdrop.claimedAccounts(this.account.address);
        if (claimedStatus.isSome) {
          return { 
            eligible: false, 
            claimed: true,
            reason: 'Airdrop already claimed' 
          };
        }
      } catch (e) {
        // If claimedAccounts doesn't exist, continue
        console.log('No claimed accounts tracking available');
      }

      // Check cooldown period
      try {
        const lastClaim = await this.api.query.airdrop.lastClaimBlock(this.account.address);
        const currentBlock = await this.api.query.system.number();
        const cooldownPeriod = this.api.consts.airdrop.cooldownPeriod;
        
        if (lastClaim.isSome) {
          const blocksSinceLastClaim = currentBlock.toBn().sub(lastClaim.unwrap().toBn());
          if (blocksSinceLastClaim.lt(cooldownPeriod.toBn())) {
            return { 
              eligible: false, 
              reason: `Cooldown period active. ${cooldownPeriod.toBn().sub(blocksSinceLastClaim).toString()} blocks remaining.` 
            };
          }
        }
      } catch (e) {
        // If cooldown tracking doesn't exist, continue
        console.log('No cooldown tracking available');
      }

      return { eligible: true };
      
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return { 
        eligible: false, 
        reason: `Eligibility check failed: ${error.message}` 
      };
    }
  }

  async claimAirdrop() {
    try {
      if (!this.api.isConnected) {
        throw new Error('API is not connected');
      }

      const injector = await web3FromAddress(this.account.address);
      
      return new Promise((resolve, reject) => {
        this.api.tx.airdrop
          .claimAirdrop()
          .signAndSend(this.account.address, { signer: injector.signer }, (result) => {
            console.log('Transaction status:', result.status.type);
            
            if (result.status.isInBlock) {
              console.log('Transaction in block:', result.status.asInBlock.toHex());
              
              // Debug: Log all events to see what we're getting
              console.log('All transaction events:', result.events.map(({ event }) => ({
                section: event.section,
                method: event.method,
                data: event.data.toHuman()
              })));
              
              let claimSuccess = false;
              let transactionFailed = false;
              
              result.events.forEach(({ event }) => {
                console.log(`Event: ${event.section}.${event.method}`, event.data.toHuman());
                
                if (event.section === 'airdrop' && event.method === 'AirdropClaimed') {
                  console.log('Airdrop claimed successfully!');
                  claimSuccess = true;
                } else if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
                  console.error('Transaction failed:', event.data.toHuman());
                  transactionFailed = true;
                } else if (event.section === 'system' && event.method === 'ExtrinsicSuccess') {
                  console.log('Extrinsic executed successfully');
                }
              });
              
              if (transactionFailed) {
                reject(new Error('Transaction failed'));
              } else if (claimSuccess) {
                resolve();
              }
              // If no specific airdrop event but extrinsic succeeded, still resolve
              else if (!transactionFailed) {
                console.log('Transaction completed without specific airdrop event');
                resolve();
              }
              
            } else if (result.status.isFinalized) {
              console.log('Transaction finalized');
              // Only resolve here if we haven't already resolved in isInBlock
              if (!result.events.some(({ event }) => event.section === 'system' && event.method === 'ExtrinsicFailed')) {
                resolve();
              }
            } else if (result.isError) {
              reject(new Error('Transaction failed'));
            }
          })
          .catch(reject);
      });
    } catch (error) {
      console.error('Error claiming airdrop:', error);
      throw error;
    }
  }

  // Add the missing subscribeToEvents method
  subscribeToEvents(callback) {
    return new Promise((resolve, reject) => {
      try {
        const unsubscribe = this.api.query.system.events((events) => {
          events.forEach((record) => {
            const { event } = record;
            if (event.section === 'airdrop') {
              callback({
                method: event.method,
                data: event.data.toHuman()
              });
            }
          });
        });
        
        resolve(unsubscribe);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Add connection status check method
  isConnected() {
    return this.api.isConnected;
  }

  // Add reconnection method
  async reconnect() {
    try {
      if (!this.api.isConnected) {
        await this.api.connect();
      }
    } catch (error) {
      console.error('Failed to reconnect:', error);
      throw error;
    }
  }
}
