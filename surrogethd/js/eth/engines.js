/**
 * Utilities for getting objects used in interacting with forked or real Ethereum.
 */

const ganache = require("ganache-core");
const ethers = require("ethers");
const Web3 = require("web3");

const {
    getNetworkInfo,
    getValidRecipient,
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

const getFeeWei = (network, token) => {
    const {feeWei} = getTokenInfo(network, token);
    return feeWei;
}

// NOTE: Creates a new provider/wallet on *each* invocation
const getEthersWallet = network => {
  return getNetworkInfo(network).wallet
};

/**
 * Determines if the specified recipient contract is allowed to receive relayed transactions from this node
 */
const isValidRecipient = (recipient, network) => {
  recipient = getValidRecipient(network)
  if (recipient && recipient.length && !recipient.includes(recipient)){
    return false;
  }
  return true;
};

module.exports = {
  createForkedWeb3,
  getEthersProvider,
  getEthersWallet,
  isValidRecipient,
  getFeeWei,
};
