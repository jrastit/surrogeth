# surrogeth-client

surrogeth-client is a lightweight JavaScript library used for interacting with the surrogeth system. It's designed to be easy for mixers or wallets to integrate quickly.

## Installation

```
npm install surrogeth-client
```

## Usage

```javascript
import { SurrogethClient } from "surrogeth-client";

const client = new SurrogethClient(
  ethersJsProvider,
  network, // "KOVAN" || "MAINNET"
  reputationContractAddress // defaults to current deployment on specified network
);

const relayers = await client.getRelayers(
  1,
  new Set([]), // don't ignore any addresses
  new Set(["ip"]) // only return relayers with an IP address
);

if (relayers.length > 0) {
  const fee = await client.getRelayerFee(relayers[0]);

  // ... construct transaction using fee -> tx: {to, data, value}

  const txHash = await client.submitTx(tx, relayers[0]);
}
```