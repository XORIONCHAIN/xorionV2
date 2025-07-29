// fetchTxInfo.js
import { ApiPromise, WsProvider } from '@polkadot/api';

const WS_ENDPOINT = 'ws://3.219.48.230:9944';
const TX_HASH = '0x685c5447be367905d849e4ed31eee346c7beb6ce166e3fd99973864f7510a8ad';

async function main() {
  const provider = new WsProvider(WS_ENDPOINT);
  const api = await ApiPromise.create({ provider });

  const latestHeader = await api.rpc.chain.getHeader();
  const latestBlock = latestHeader.number.toNumber();

  console.log(`🔍 Scanning latest 100 blocks (from ${latestBlock - 100} to ${latestBlock})...`);

  for (let i = latestBlock; i > latestBlock - 100; i--) {
    const blockHash = await api.rpc.chain.getBlockHash(i);
    const block = await api.rpc.chain.getBlock(blockHash);

    for (const [index, extrinsic] of block.block.extrinsics.entries()) {
      if (extrinsic.hash.toHex() === TX_HASH) {
        console.log(`✅ Found at block #${i}, extrinsic index ${index}`);
        console.log('Extrinsic:', extrinsic.toHuman());

        const allEvents = await api.query.system.events.at(blockHash);
        const relatedEvents = allEvents
          .filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index))
          .map(({ event }) => event.toHuman());

        console.log('Events:', relatedEvents);
        await api.disconnect();
        return;
      }
    }
  }

  console.log('❌ Transaction not found in last 100 blocks.');
  await api.disconnect();
}

main().catch(console.error);