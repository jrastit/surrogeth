/**
 * Utilities for getting objects used in interacting with forked or real Ethereum.
 */

const ganache = require("ganache-core");
const ethers = require("ethers");
const Web3 = require("web3");

const {
  SURROGETH_PRIVATE_KEY,
  KOVAN_ALLOWED_RECIPIENTS,
  MAINNET_ALLOWED_RECIPIENTS
} = require("../configEnv");

const {
    getNetworkInfo,
} = require("../configSurrogeth")

/**
 * Create a forked version of web3 using the provided rpcUrl
 */
const createForkedWeb3 = network => {
  const rpcUrl = getNetworkInfo(network).chainUrl;
  return new Web3(
    ganache.provider({
      fork: rpcUrl
    })
  );
};

// NOTE: Creates a new provider on *each* invocation
const getEthersProvider = network => {
  return getNetworkInfo(network).wallet.provider
};

// NOTE: Creates a new provider/wallet on *each* invocation
const getEthersWallet = network => {
  return getNetworkInfo(network).wallet
};

/**
 * Determines if the specified recipient contract is allowed to receive relayed transactions from this node
 */
const isValidRecipient = (recipient, network) => {
  if (network === "kovan") {
    return (
      KOVAN_ALLOWED_RECIPIENTS.length === 0 ||
      KOVAN_ALLOWED_RECIPIENTS.includes(recipient)
    );
  } else if (network === "MAINNET") {
    return (
      MAINNET_ALLOWED_RECIPIENTS.length === 0 ||
      MAINNET_ALLOWED_RECIPIENTS.includes(recipient)
    );
} else if (network === "ganache") {
    return true;
  } else {
    throw `Network ${network} not recognized!`;
  }
};

module.exports = {
  createForkedWeb3,
  getEthersProvider,
  getEthersWallet,
  isValidRecipient
};
