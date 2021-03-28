const express = require("express");
const cors = require("cors");
const ethers = require('ethers')
const { check, validationResult } = require("express-validator");

const AsyncLock = require("async-lock");

// Configure console logging statements
require("console-stamp")(console);

const {
  relayerAccount,
  isTxDataStr,
  isAddressStr,
  isNetworkStr
} = require("./utils");
const { isValidRecipient } = require("./eth/engines");
const {
  SURROGETH_ERC20_MIN_TX_PROFIT,
  SURROGETH_FEE,
  SURROGETH_MIN_TX_PROFIT
} = require("./configEnv");
const {
    getTokenInfo,
} = require("./configSurrogeth")

const { simulateTx, simulateERC20Tx } = require("./eth/simulationEth");
const { sendTransaction } = require("./eth/eth");

const lock = new AsyncLock();
const nonceKey = `nonce_${relayerAccount.address}`;

const app = express();

// enable CORS
app.use(cors());
app.options("*", cors());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(express.json());

app.get("/address", (req, res) => {
  console.info("Serving address request");
  res.json({ address: relayerAccount.address });
});

app.get("/fee", async (req, res) => {
  console.info("Serving fee request");
  res.json({ fee: SURROGETH_FEE });
});

app.post(
  "/submit_tx",
  [
    check("to").custom(isAddressStr),
    check("data").custom(isTxDataStr),
    check("value").isInt(),
    check("network").custom(isNetworkStr)
  ],
  async (req, res) => {
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.info("Invalid parameters on tx submission request");
        return res.status(422).json({ errors: errors.array() });
      }
      const { to, data, value, network } = req.body;

      console.info(
        `Serving tx submission request: to: ${to}, value: ${value}, network: ${network}`
      );

      if (!isValidRecipient(to, network)) {
        console.log("Transaction rejected, invalid receiver " + to);
        return res
          .status(403)
          .json({ msg: `I don't send transactions to ${to}` });
      }


      const {isETH, feeWei} = getTokenInfo(network, "eth");
      // simulate the transaction
      const profit = ethers.BigNumber.from(
          (await simulateTx(network, to, data, value)).toString()
      );
      console.log("Estimated Profit : ",
        ethers.utils.formatEther(profit),
        "/",
        ethers.utils.formatEther(feeWei),
        profit.lt(feeWei) ? "profit too low!" : "ok",
      );


      // only check whether the profit is sufficient if SURROGETH_MIN_TX_PROFIT
      // is set to a positive value
      if (feeWei > 0 && profit.lt(feeWei)) {
        console.log("Transaction rejected, fee too low");
        return res.status(403).json({
          msg: `Fee too low! Try increasing the fee by ${ethers.utils.formatEther(feeWei.sub(profit))} ETH`
        });
      }

      // TODO: Push nonce locking down to submission method and unit test it
      const { blockNumber, hash } = await lock.acquire(nonceKey, async () => {
        return sendTransaction(network, to, data, value);
      });

      res.json({
        block: blockNumber,
        txHash: hash
      });
    }catch(error){
      throw error;
      return res
        .status(499)
        .json({ msg: error.toString()});
    }
  }
);

app.post(
  "/submit_erc20_tx",
  [
    check("token").custom(isAddressStr),
    check("to").custom(isAddressStr),
    check("data").custom(isTxDataStr),
    check("value").isInt(),
    check("network").custom(isNetworkStr)
  ],
  async (req, res) => {
    try{
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.info("Invalid parameters on tx submission request");
        return res.status(422).json({ errors: errors.array() });
      }
      const { token, to, data, value, network } = req.body;

      console.info(
        `Serving ERC20 tx submission request: token: ${token}, to: ${to}, value: ${value}, network: ${network}`
      );

      if (!isValidRecipient(to, network)) {
        return res
          .status(403)
          .json({ msg: `I don't send transactions to ${to}` });
      }

      try{
          const {isETH, feeWei, decimals} = getTokenInfo(network, token);

          // simulate the transaction
          const profit = ethers.BigNumber.from(
              (await simulateERC20Tx(network, token, to, data, value)).toString()
          );
          console.log("Estimated Profit : ",
            ethers.utils.formatUnits(profit, decimals),
            "/",
            ethers.utils.formatUnits(feeWei, decimals),
            profit.lt(feeWei) ? "profit too low!" : "ok",
          );

          // only check whether the profit is sufficient if SURROGETH_MIN_TX_PROFIT
          // is set to a positive value
          if (feeWei > 0 && profit.lt(feeWei)) {
            console.log("Transaction rejected, fee too low");
            return res.status(403).json({
              msg: `Fee too low! Try increasing the fee by ${ethers.utils.formatEther(feeWei.sub(profit))} ETH`
            });
          }
      }catch(err){
          return res.status(422).json({ msg: err.toString() });
      }

      // TODO: Push nonce locking down to submission method and unit test it
      const { blockNumber, hash } = await lock.acquire(nonceKey, async () => {
        return sendTransaction(network, to, data, value);
      });

      res.json({
        block: blockNumber,
        txHash: hash
      });
    }catch(error){
      throw error;
      return res
        .status(499)
        .json({ msg: error.toString()});
    }
  }
);

module.exports = app;
