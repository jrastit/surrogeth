beforeEach(() => {
  jest.mock("./engines");
});

describe("getFee", () => {
  test("computes the fee properly", async () => {
    const { getFee } = require("./eth");
    const {
      TEST_ETHERS_TX,
      TEST_NETWORK,
      TEST_TOKEN,
      TEST_GAS_ESTIMATE,
      TEST_GAS_PRICE
    } = require("./engines");

    const { to, data, value } = TEST_ETHERS_TX;
    const fee = await getFee(TEST_NETWORK, TEST_TOKEN, to, data, value);

    expect(fee.toNumber()).toBe(
      TEST_GAS_ESTIMATE * TEST_GAS_PRICE + 0
    );
  });
});

describe("sendTransaction", () => {
  test("signs and sends the specified transaction", async () => {
    const { sendTransaction } = require("./eth");
    const {
      TEST_ETHERS_TX,
      TEST_NETWORK,
      TEST_TX_HASH,
      TEST_BLOCK_NUM
    } = require("./engines");

    const { to, data, value } = TEST_ETHERS_TX;
    const { hash, blockNumber } = await sendTransaction(
      TEST_NETWORK,
      to,
      data,
      value
    );

    expect(hash).toBe(TEST_TX_HASH);
    expect(blockNumber).toBe(TEST_BLOCK_NUM);
  });
});
