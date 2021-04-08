const ethers = require('ethers');

const {
    getWallet,
    getNetworkConfig,
    getTokenConfig,
    getTokenInfo,
    getBroadcasterInfo,
    surrogethIp,
    surrogethPort
} = require("../configSurrogeth");

// As defined in the ForwarderRegistryERC20.sol contract
const ALL_RELAYERS_TYPE = 0;
const LOCATOR_RELAYERS_TYPE = 1;

const ForwarderRegistryERC20 = require("../../resource/ForwarderRegistryERC20.json")

const isRegisteredBroadcaster = async (
    wallet,
    forwarderRegistryERC20,
    tokenAddress = null
) => {

    //get the number of relayer to check
    const totalRelayers = tokenAddress ?
        (await forwarderRegistryERC20.relayersCountERC20(
            LOCATOR_RELAYERS_TYPE,
            tokenAddress
        )).toNumber() :
        (await forwarderRegistryERC20.relayersCount(
          LOCATOR_RELAYERS_TYPE
        )).toNumber();

    //for each relayer check if it is the same address
    for (var relayerId = 0; relayerId < totalRelayers; relayerId++) {
        const relayerAddress = tokenAddress ?
            (await forwarderRegistryERC20.relayerByIdxERC20(
                LOCATOR_RELAYERS_TYPE,
                relayerId,
                tokenAddress
            )):
            (await forwarderRegistryERC20.relayerByIdx(
                LOCATOR_RELAYERS_TYPE,
                relayerId
            ));
        if (relayerAddress && relayerAddress.toLowerCase() == (await wallet.address).toLowerCase()){
            //if we found the relayer, check if the ip is ok
            const {locator, locatorType} = tokenAddress ?
                await forwarderRegistryERC20.relayerToLocatorERC20(
                    relayerAddress,
                    tokenAddress
                ):
                await forwarderRegistryERC20.relayerToLocator(
                    relayerAddress
                );
            if (locatorType == "ip" && locator == surrogethIp + ":" + surrogethPort){
              return true;
          }
      }
    }
    return false;
}

const registerBroadcasterToken = async (network, token, wallet, forwarderRegistryERC20) => {
    const {isETH, tokenAddress} = getTokenInfo(network, token)
    console.info("Registry " + network + " " + token + " start")
    if (!await isRegisteredBroadcaster(wallet, forwarderRegistryERC20, tokenAddress)){
        console.log("Registry " + network + " " + token + " need to register")
        const tx = isETH ?
            await forwarderRegistryERC20.setRelayerLocator(
                await wallet.address,
                surrogethIp + ":" + surrogethPort,
                'ip',
            ):
            await forwarderRegistryERC20.setRelayerLocatorERC20(
                await wallet.address,
                surrogethIp + ":" + surrogethPort,
                'ip',
                tokenAddress,
            );
        await tx.wait()
    }

    console.info("Registry " + network + " " + token + " ended")
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
        const tokenConfig = getTokenConfig(network)
        for (const token in tokenConfig ){
            await registerBroadcasterToken(network, token, wallet, forwarderRegistryERC20)
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
