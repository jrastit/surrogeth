const config = require('config');
const Accounts = require("web3-eth-accounts");
const accounts = new Accounts();

const {
  SURROGETH_PRIVATE_KEY,
  KOVAN_ALLOWED_RECIPIENTS,
  MAINNET_ALLOWED_RECIPIENTS
} = require("./configEnv");

const relayerAccount = {
  privateKey: SURROGETH_PRIVATE_KEY,
  address: accounts.privateKeyToAccount(SURROGETH_PRIVATE_KEY).address
};

const hexStrRE = /^0x[0-9A-Fa-f]+$/;

const isHexStr = s => {
  return s.length % 2 == 0 && hexStrRE.test(s);
};

const isAddressStr = s => {
  console.log("Address", s)
  return s.length == 42 && hexStrRE.test(s);
};

const isTxDataStr = s => {
  return s === "" || isHexStr(s);
};

const isNetworkStr = s => {
  if (s == "test"){
      return true;
  }
  if (config.network && config.network.get(s)){
      return true;
  }
  return false;
};

module.exports = {
  isTxDataStr,
  isAddressStr,
  isNetworkStr,
  relayerAccount
};
