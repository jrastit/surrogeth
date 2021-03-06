const express = require("express");
const cors = require("cors");
const ethers = require('ethers')
const { check, validationResult } = require("express-validator");

const AsyncLock = require("async-lock");

// Configure console logging statements
require("console-stamp")(console);

const {
  isTxDataStr,
  isAddressStr,
  isNetworkStr
} = require("./utils");
const {
    isValidRecipient,
    getEthersWallet,
 } = require("./eth/engines");

const {
  getTokenInfo,
  getAllAddress,
  getAllFee,
} = require("./configSurrogeth")

const { simulateTx, simulateERC20Tx } = require("./eth/simulationEth");
const { sendTransaction } = require("./eth/eth");

const lock = new AsyncLock();

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
  //TODO aswer all addresses
  res.json(getAllAddress());
});

app.get("/fee", async (req, res) => {
  console.info("Serving fee request");
  //Todo answer fee for each network and token
  res.json(getAllFee());
});

app.post(
  "/fee_token",
  [
    check("token").custom(isAddressStr),
    check("network").custom(isNetworkStr)
  ],
  async (req, res) => {
    const { token, network } = req.body;
    const {feeWei} = getTokenInfo(network, token);
    res.json({
      fee: feeWei.toString()
    });
  }
);

app.post(
  "/fee_eth",
  [
    check("txGas").isInt(),
    check("network").custom(isNetworkStr)
  ],
  async (req, res) => {
    const { txGas, network } = req.body;
    const {feeWei, decimals} = getTokenInfo(network, 'eth');
    if (txGas){
        const wallet = getEthersWallet(network);
        const gasPrice = await wallet.getGasPrice();
        res.json({
          fee: feeWei.add(gasPrice.mul(ethers.BigNumber.from(txGas))).toString()
        });
        console.log(network,
            "gasPrice",
            gasPrice.toString())
    }else{
        res.json({
          fee: feeWei.toString()
        });
    }
  }
);

const submitTx = async (
    req,
    res,
) => {
    try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          console.info("Invalid parameters on tx submission request");
          return res.status(422).json({ errors: errors.array() });
        }
        const { token, to, data, value, network } = req.body;

        if (token){
            console.info(
              `Serving ERC20 tx submission request: token: ${token}, to: ${to}, value: ${value}, network: ${network}`
            );
        }else{
            console.info(
              `Serving tx submission request: to: ${to}, value: ${value}, network: ${network}`
            );
        }

        if (!isValidRecipient(to, network)) {
          console.log("Transaction rejected, invalid receiver " + to);
          return res
            .status(403)
            .json({ msg: `I don't send transactions to ${to}` });
        }

        const {
            isETH,
            feeWei,
            decimals
        } = getTokenInfo(network, token ? token : 'eth');

        try{

            // simulate the transaction
            const profit = ethers.BigNumber.from(
                (token?
                    (await simulateERC20Tx(network, token, to, data, value)):
                    (await simulateTx(network, to, data, value))
                ).toString()
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
                msg: `Fee too low! Try increasing the fee by ${ethers.utils.formatUnits(feeWei.sub(profit), decimals)}`
              });
            }
        }catch(err){
            return res.status(422).json({ msg: err.toString() });
        }

        // TODO: Push nonce locking down to submission method and unit test it
        const { blockNumber, transactionHash, gasUsed, gasPrice} = await lock.acquire("nonce_" + network, async () => {
          return sendTransaction(network, to, data, value);
        });

        console.log("transaction processed", transactionHash, "gasUsed", gasUsed.toString(), "fee",  ethers.utils.formatUnits(gasUsed.mul(gasPrice), decimals))

        res.json({
          block: blockNumber,
          txHash: transactionHash
        });

    }catch(error){
      console.log("Transaction error " + error.toString())
      return res
        .status(499)
        .json({ msg: error.toString()});
    }
}

app.post(
  "/submit_tx",
  [
    check("to").custom(isAddressStr),
    check("data").custom(isTxDataStr),
    check("value").isInt(),
    check("network").custom(isNetworkStr)
  ],
  async (req, res) => {
    await submitTx(req, res)
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
    await submitTx(req, res)
  }
);

module.exports = app;
