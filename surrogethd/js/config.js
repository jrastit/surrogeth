require("dotenv").config();

const envVars = [
  "KOVAN_RPC_URL",
  "MAINNET_RPC_URL",
  "RELAYER_PRIVATE_KEY",
  "RELAYER_MIN_TX_PROFIT" // minimum profit per tx (in Wei) to consider submitting it
];

let e = {};
for (const envVar of envVars) {
  e[envVar] = process.env[envVar];
}

module.exports = e;