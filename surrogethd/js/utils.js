const config = require('config');

const hexStrRE = /^0x[0-9A-Fa-f]+$/;

const isHexStr = s => {
  return s.length % 2 == 0 && hexStrRE.test(s);
};

const isAddressStr = s => {
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
  isNetworkStr
};
