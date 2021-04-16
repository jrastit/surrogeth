const ethers = jest.genMockFromModule("ethers");

class BigNumber {

    constructor(_value){
        this.value = _value
    }

    add(_value){
        return new BigNumber(this.value + _value.toNumber())
    }

    div(_value){
        return new BigNumber(this.value / _value.toNumber())
    }

    eq(_value){
        return this.value == _value
    }

    toString(){
        return this.value.toString()
    }

    toNumber(){
        return this.value
    }

}

ethers.BigNumber = {
    from (_value) {
        return new BigNumber(_value)
    }
}

// Allows tests to set the broadcasters found in the mocked out registry contract
let broadcasters = [];
let broadcasterToLocator = {};
function __setBroadcasters(_broadcasters, _locatorTypes) {
  broadcasters = _broadcasters;

  broadcasterToLocator = {};
  for (const i in broadcasters) {
    const broadcaster = broadcasters[i];
    broadcasterToLocator[broadcaster] = {
      locator: String(broadcaster),
      locatorType: _locatorTypes[i]
    };
  }
}

let relayers = [];
let relayerToFeeAgg = {};
function __setRelayers(_relayers, _feeAggs) {
  relayers = _relayers;

  relayerToFeeAgg = {};
  for (const i in relayers) {
    const relayer = relayers[i];
    relayerToFeeAgg[relayer] = {
      feeSum: ethers.BigNumber.from(_feeAggs[i][0]) ,
      feeCount: ethers.BigNumber.from(_feeAggs[i][1])
    };
  }
}

class Contract {
  constructor(address, abi, provider) {}

  async relayersCount(type) {
    if (type == 1) {
      return ethers.BigNumber.from(broadcasters.length)
    } else {
      return ethers.BigNumber.from(relayers.length)
    }
  }

  async relayerByIdx(type, idx) {
    if (type == 1) {
      return broadcasters[idx];
    } else {
      return relayers[idx];
    }
  }

  async relayerToLocator(address) {
    return broadcasterToLocator[address];
  }

  async relayerToFeeAggERC20(tokenAddress, address) {
    return relayerToFeeAgg[address];
  }

  async relayerToFeeAgg(address) {
    return relayerToFeeAgg[address];
  }
}

ethers.__setBroadcasters = __setBroadcasters;
ethers.__setRelayers = __setRelayers;
ethers.Contract = Contract;

module.exports = ethers;
