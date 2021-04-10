const axios = require("axios");
const ethers = require("ethers");
const _ = require("lodash/core");

//const { registryABI } = require("./abi");

// TODO!
const DEFAULT_REGISTRY_ADDRESS = {};

// NOTE: We may want this to be an arg in the future
const DEFAULT_RELAYER_BATCH_SIZE = 10;

// As defined in the Registry.sol contract
const ALL_RELAYERS_TYPE = 0;
const LOCATOR_RELAYERS_TYPE = 1;

const getFeeRoute = locator => {
  return `${locator}/fee`;
};

const getSubmitTxRoute = locator => {
  return `${locator}/submit_tx`;
};

const getSubmitErc20TxRoute = locator => {
  return `${locator}/submit_erc20_tx`;
};

/**
 * Class representing a single surrogeth client. Maintains state about which relayers it's already tried to
 * communicate with.
 */
class SurrogethClient {
  constructor(
    provider,
    network = "kovan",
    registryAddress = DEFAULT_REGISTRY_ADDRESS[network],
    registryABI,
    protocol = "https",
    token = null
  ) {
    this.network = network;
    this.provider = provider;
    this.registryAddress = registryAddress;
    this.protocol = protocol;
    this.registryABI = registryABI;
    this.token = token;
  }

  /**
   * Set a relayer locator
   *
   * @param {locator} location of the wallet of type string.
   *
   */
  async setIPRelayerLocator(
      localtor,
  ){
      let locatorType = 'ip';
      const contract = new ethers.Contract(
        this.registryAddress,
        this.registryABI,
        this.provider
      );

      const tx = this.token ?
        await contract.setRelayerLocatorERC20(
          await this.provider.address,
          localtor,
          locatorType,
          this.token
        ):
        await contract.setRelayerLocator(
          await this.provider.address,
          localtor,
          locatorType
        );
      return await tx.wait()
  }

  /**
   * Get `numRelayers` relayers with locators from the contract. If < `numRelayers` in contract with locators,
   * return all relayers from contract
   *
   * @param {number} numRelayers - The number of relayers to return.
   * @param {Set<string>} allowedLocatorTypes - The locator types to include.
   *
   * @returns {Array<{locator: string, locatorType: string, burn: number, address: string}>} An array of
   * information objects corresponding to relayers
   */
  async getBroadcasters(
    numRelayers = 1,
    allowedLocatorTypes = new Set(["ip"])
  ) {
    const contract = new ethers.Contract(
      this.registryAddress,
      this.registryABI,
      this.provider
    );

    const addresses = [];
    const totalRelayers = this.token ?
        (await contract.relayersCountERC20(
          LOCATOR_RELAYERS_TYPE,
          this.token
        )).toNumber():
        (await contract.relayersCount(
          LOCATOR_RELAYERS_TYPE
        )).toNumber();
    console.log("totalRelayers", totalRelayers, "token", this.token)
    // TODO: batch these calls with multicall
    for (var relayerId = 0; relayerId < totalRelayers; relayerId++) {
      const relayerAddress = this.token ?
        await contract.relayerByIdxERC20(
          LOCATOR_RELAYERS_TYPE,
          relayerId,
          this.token
        ):
        await contract.relayerByIdx(
          LOCATOR_RELAYERS_TYPE,
          relayerId
        );
      addresses.push(relayerAddress);
    }

    // No registered relayers in the registry contract!
    if (addresses.length === 0) {
      return [];
    }
    //console.log("addresses", addresses)
    // Iterate backwards through addresses until we hit 'numRelayers' of an allowed locator type
    let toReturn = [];
    for (const address of addresses) {
      const {
          locator,
          locatorType
      } = await contract.relayerToLocator(
          address,
      );
      const {
          feeSum,
          feeCount
      } = this.token ?
        await contract.relayerToFeeAggERC20(
          this.token,
          address,
        ):
        await contract.relayerToFeeAgg(
          address
        );
      //console.log("info", address, locator, locatorType)
      if (allowedLocatorTypes.has(locatorType)) {
        toReturn.push({ locator, locatorType, address, feeSum, feeCount });
      }
    }

    return toReturn;
  }

  /**
   * Returns the avg fee seen in the fee registry. This is one heuristic a client could use to determine the
   * fee to broadcast on its tx.
   *
   * @returns {ethers.BigNumber|null} The average fee in Wei taken by a relayer in the registry
   */
  async getAvgFee() {
    const contract = new ethers.Contract(
      this.registryAddress,
      this.registryABI,
      this.provider
    );

    const totalRelayers = this.token ?
      (await contract.relayersCountERC20(
        ALL_RELAYERS_TYPE,
        this.token
      )).toNumber():
      totalRelayers = (await contract.relayersCount(
        ALL_RELAYERS_TYPE
      )).toNumber();

    // TODO: batch these calls with multicall
    let totalFeeSum = ethers.BigNumber.from(0);
    let totalFeeCount = ethers.BigNumber.from(0);
    for (var relayerId = 0; relayerId < totalRelayers; relayerId++) {
      const relayerAddress = this.token ?
        await contract.relayerByIdxERC20(
          ALL_RELAYERS_TYPE,
          relayerId,
          this.token
        ):
        await contract.relayerByIdx(
          ALL_RELAYERS_TYPE,
          relayerId
        );

      const {
          feeSum,
          feeCount
      } = this.token ?
        await forwarderRegistryERC20Contract.relayerToFeeAggERC20(
            this.token,
            relayerAddress
        ):
        await forwarderRegistryERC20Contract.relayerToFeeAgg(
          relayerAddress
        );
      console.log(`Fees: ${feeSum.toString()}, Count: ${feeCount.toString()}`);
      totalFeeSum = totalFeeSum.add(feeSum);
      totalFeeCount = totalFeeCount.add(feeCount);
    }

    if (totalFeeCount == 0) {
      return null;
    } else {
      return totalFeeSum.div(totalFeeCount);
    }
  }

  /**
   * Submit the specified transaction to the specified relayer.
   *
   * @param {{locator: string, locatorType: string}} relayer - The relayer whose fee to return, as specified
   * by a locator (i.e. IP address) and locatorType string (i.e. 'ip')
   * @param {{to: string, data: string, value: number}} tx - The transaction info to submit. 'to' is a hex string
   * representing the address to send to and 'data' is a hex string or an empty string representing the data
   * payload of the transaction
   *
   * @returns {string|null} The transaction hash of the submitted transaction
   */
  async submitTx(tx, relayer) {
    const { locator, locatorType } = relayer;
    const { to, data, value } = tx;

    if (locatorType !== "ip") {
      console.log(
        `Can't communicate with relayer at ${locator} of locatorType ${locatorType} because only IP supported right now.`
      );
      return null;
    }


    const resp = this.token ?
        await axios.post(
          `${this.protocol}://${getSubmitErc20TxRoute(locator)}`,
          {
            token: this.token,
            to,
            data,
            value,
            network: this.network
          }
        ):
        await axios.post(
          `${this.protocol}://${getSubmitTxRoute(locator)}`,
          {
            to,
            data,
            value,
            network: this.network
          }
        );

    if (resp.status !== 200) {
      console.log(`${resp.status} error submitting tx to relayer ${locator}`);
    }

    return resp.data.txHash;
  }

  /**
   * Submit the specified transaction to the specified relayer.
   *
   * @param tokenAddress: string - the address of the erc20 token used
   * @param {{locator: string, locatorType: string}} relayer - The relayer whose fee to return, as specified
   * by a locator (i.e. IP address) and locatorType string (i.e. 'ip')
   * @param {{to: string, data: string, value: number}} tx - The transaction info to submit. 'to' is a hex string
   * representing the address to send to and 'data' is a hex string or an empty string representing the data
   * payload of the transaction
   *
   * @returns {string|null} The transaction hash of the submitted transaction
   */
  async submitTxERC20(tx, relayer, token) {
    const { locator, locatorType } = relayer;
    const { to, data, value } = tx;

    if (locatorType !== "ip") {
      console.log(
        `Can't communicate with relayer at ${locator} of locatorType ${locatorType} because only IP supported right now.`
      );
      return null;
    }

    if (!token) {
      console.log(
        `Token address cannot be null.`
      );
      return null;
    }

    const resp = await axios.post(
      `${this.protocol}://${getSubmitErc20TxRoute(locator)}`,
      {
        token,
        to,
        data,
        value,
        network: this.network
      }
    );

    if (resp.status !== 200) {
      console.log(`${resp.status} error submitting tx to relayer ${locator}`);
    }

    return resp.data.txHash;
  }
}

module.exports = {
  SurrogethClient
};
