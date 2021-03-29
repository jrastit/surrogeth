const ethers = require('ethers');

const { getWallet, getNetworkConfig, getBroadcasterInfo, surrogethIp, surrogethPort} = require("../configSurrogeth");

// As defined in the ForwarderRegistryERC20.sol contract
const ALL_RELAYERS_TYPE = 0;
const LOCATOR_RELAYERS_TYPE = 1;

const ForwarderRegistryERC20 = require("../../resource/ForwarderRegistryERC20.json")

const isRegisteredBroadcaster = async (wallet, forwarderRegistryERC20) => {

    //get the number of relayer to check
    const totalRelayers = (await forwarderRegistryERC20.relayersCount(
      LOCATOR_RELAYERS_TYPE
    )).toNumber();


    //for each relayer check if it is the same address
    for (var relayerId = 0; relayerId < totalRelayers; relayerId++) {
      const relayerAddress = await forwarderRegistryERC20.relayerByIdx(
        LOCATOR_RELAYERS_TYPE,
        relayerId
      );
      if (relayerAddress && relayerAddress.toLowerCase() == (await wallet.address).toLowerCase()){
          //if we found the relayer, check if the ip is ok
          const { locator, locatorType } = await forwarderRegistryERC20.relayerToLocator(relayerAddress);
          if (locatorType == "ip" && locator == surrogethIp + ":" + surrogethPort){
              return true;
          }
      }
    }
    return false;
}

const registerBroadcaster = async (network) => {

    const {
        forwarderRegistryERC20Address,
    } = getBroadcasterInfo(network)

    if (surrogethIp && surrogethPort && forwarderRegistryERC20Address){

        console.info("Registry " + network + " start")

        const wallet = getWallet(network)

        const forwarderRegistryERC20 = new ethers.Contract(
          forwarderRegistryERC20Address,
          ForwarderRegistryERC20.abi,
          wallet
        );
        if (!await isRegisteredBroadcaster(wallet, forwarderRegistryERC20)){
            console.log("Registry " + network + " need to register")
            const tx = await forwarderRegistryERC20.setRelayerLocator(await wallet.address, surrogethIp + ":" + surrogethPort, 'ip')
            await tx.wait()
        }

        console.info("Registry " + network + " ended")
    }

}

const registerAllBroadcaster = async () => {
    console.log("Registry start " + surrogethIp + ":" + surrogethPort)
    const networkConfig = getNetworkConfig()
    for (const network in networkConfig ){
        await registerBroadcaster(network)
    }
}

module.exports = {
    registerAllBroadcaster,
    registerBroadcaster,
    isRegisteredBroadcaster,
}
