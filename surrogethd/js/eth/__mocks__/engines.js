const ethers = require("ethers");

const { relayerAccount } = require("../../utils");

const SIGNED = "0x123";
const INIT_RELAYER_BALANCE = 10000;
const GAS_LIMIT = 100;
const TEST_NETWORK = "test";

const TEST_WEB3_TX = {
  to: "0x0000000000000000000000000000000000000001",
  data: "",
  value: "300",
  gas: GAS_LIMIT
};

const createForkedWeb3 = network => {
  expect(network).toBe(TEST_NETWORK);

  let relayerAddress = relayerAccount.address;

  let balances = {};
  balances[relayerAddress] = INIT_RELAYER_BALANCE;

  let ret = { eth: { accounts: {} } };
  ret.eth.getBalance = address => {
    if (address in balances) {
      return balances[address];
    } else {
      return 0;
    }
  };
  ret.eth.accounts.signTransaction = (tx, privateKey) => {
    expect(tx).toStrictEqual(TEST_WEB3_TX);
    expect(privateKey).toBe(relayerAccount.privateKey);

    return { rawTransaction: SIGNED };
  };
  ret.eth.sendSignedTransaction = signedTx => {
    expect(signedTx).toBe(SIGNED);

    const { to, value } = TEST_WEB3_TX;

    balances[relayerAddress] -= value;
    if (!(to in balances)) {
      balances[to] = 0;
    }
    balances[to] += value;
  };
  ret.eth.getBlock = b => {
    expect(b).toBe("latest");

    return { gasLimit: GAS_LIMIT };
  };

  return ret;
};



const TEST_GAS_PRICE = 1000;
const TEST_GAS_ESTIMATE = 32;
const TEST_ETHERS_TX = {
  to: "0x0000000000000000000000000000000000000001",
  data: "",
  value: ethers.utils.parseUnits("300", "wei"),
  from: relayerAccount.address
};
const NONCE = 2;
const TEST_BLOCK_NUM = 23;
const TEST_TX_HASH = "0x234";

const getEthersProvider = network => {
  expect(network).toBe(TEST_NETWORK);

  return {
    getGasPrice: () => ethers.BigNumber.from(TEST_GAS_PRICE),

    estimateGas: tx => {
      expect(tx).toStrictEqual(TEST_ETHERS_TX);

      return ethers.BigNumber.from(TEST_GAS_ESTIMATE);
    },

    getTransactionCount: (address, status) => {
      expect(address).toBe(relayerAccount.address);
      expect(status).toBe("pending");

      return NONCE;
    },

    getBlockNumber: () => TEST_BLOCK_NUM,

    getBlock: blockNum => {
      expect(blockNum).toBe(TEST_BLOCK_NUM);
      return { gasLimit: GAS_LIMIT };
    },

    sendTransaction: signedTx => {
      expect(signedTx).toStrictEqual(TEST_WEB3_TX);

      return {
        hash: TEST_TX_HASH,
        blockNumber: TEST_BLOCK_NUM
      };
    }
  };
};

const ETHERS_FULL_TX = Object.assign({}, TEST_ETHERS_TX, {
  nonce: NONCE,
  gasLimit: GAS_LIMIT,
  gasPrice: ethers.BigNumber.from(TEST_GAS_PRICE)
});
delete ETHERS_FULL_TX.from;

const getEthersWallet = network => {
  expect(network).toBe(TEST_NETWORK);

  return {
    getGasPrice: () => ethers.BigNumber.from(TEST_GAS_PRICE),

    estimateGas: tx => {
      expect(tx).toStrictEqual(TEST_ETHERS_TX);

      return ethers.BigNumber.from(TEST_GAS_ESTIMATE);
    },

    getTransactionCount: (status) => {
      expect(status).toBe("pending");

      return NONCE;
    },

    sendTransaction: signedTx => {
      expect(signedTx.to).toMatch("0x0000000000000000000000000000000000000001");

      return {
        hash: TEST_TX_HASH,
        blockNumber: TEST_BLOCK_NUM
      };
    },

    signTransaction: tx => {
      expect(tx).toStrictEqual(ETHERS_FULL_TX);

      return SIGNED;
  },

    address: relayerAccount.address,

    provider: getEthersProvider(network),
  };
};

const isValidRecipient = (recipient, network) => {
  expect(network).toBe(TEST_NETWORK);
  return recipient === TEST_ETHERS_TX.to || recipient === TEST_WEB3_TX.to;
};

module.exports = {
  createForkedWeb3,
  getEthersProvider,
  getEthersWallet,
  isValidRecipient,
  TEST_WEB3_TX,
  TEST_ETHERS_TX,
  TEST_NETWORK,
  TEST_GAS_ESTIMATE,
  TEST_GAS_PRICE,
  TEST_TX_HASH,
  TEST_BLOCK_NUM
};
