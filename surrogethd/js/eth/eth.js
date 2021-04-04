/**
 * Utilities for interacting with the real (not simulated) Ethereum network.
 */

const {
    getEthersProvider,
    getEthersWallet,
    getFeeWei,
} = require("./engines");

const ethers = require("ethers");

/**
 * @deprecated Gets the fee that this relayer will quote for the provided tx.
 */
const getFee = async (network, token, to, data, value) => {
  const wallet = getEthersWallet(network);

  const gasPrice = await wallet.getGasPrice();
  const gasEstimate = await wallet.estimateGas({
    to,
    data,
    value,
    from: wallet.address
  });

  // NOTE: May want to change to return a BigNumber
  const cost = gasPrice.mul(gasEstimate);
  const fee  = getFeeWei(network, token);
  return cost.add(fee);
};

const getGasLimit = async provider => {
  const blockNum = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNum);

  return block.gasLimit;
};

/**
 * Signs and sends the provided transaction to the given network. Currently assumes that any nonce-locking
 * happens in the calling function.
 */
const sendTransaction = async (network, to, data, value) => {
  const wallet = getEthersWallet(network);

  const nonce = await wallet.getTransactionCount("pending");
  const gasLimit = await getGasLimit(wallet.provider);
  const gasPrice = await wallet.getGasPrice();
  const unsignedTx = {
    to,
    value: ethers.utils.parseUnits(value.toString(), "wei"),
    data,
    nonce,
    gasLimit,
    gasPrice
  };

  //const signedTx = await wallet.signTransaction(unsignedTx);

  // Returns Promise<TransactionResponse>
  const txResponse = await wallet.sendTransaction(unsignedTx);
  return await txResponse.wait();
};

module.exports = {
  getFee,
  sendTransaction
};
