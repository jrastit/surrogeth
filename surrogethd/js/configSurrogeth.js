
const config = require('config');
const ethers = require('ethers');

const surrogethPort = config.surrogethPort;
const surrogethIp = config.surrogethIp;

const getValidRecipient = (network) => {
    const validRecipient = config.network[network].validRecipient;
    return validRecipient;
}

const getNetworkInfo = (network) => {
    if (network == "test"){
        const { getEthersProvider, getEthersWallet } = require("./eth/engines");
        return {
            wallet: getEthersWallet(network),
            chainUrl: null,
            chainId: null,
        }
    }

    const chainUrl = config.network[network].url;
    const chainId = config.network[network].chainId;

    const privateKey = getPrivateKey(network);

    const provider = new ethers.providers.JsonRpcProvider(
        chainUrl,
        chainId,
    )

    const wallet = new ethers.Wallet(
        privateKey,
        provider,
    )

    return {
        wallet,
        chainUrl,
        chainId,
    }
}

const getPrivateKey = (network) => {
    if (network == "test"){
        return "0x8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5";
    }
    const privateKeysPath = config.network[network].privateKeysPath;
    const privateKeys = require("../" + privateKeysPath);
    // For mixer compatibility key are stored in array
    return privateKeys[0];
}

const getWallet = (network) => {
    return getNetworkInfo(network).wallet
}

const getNetworkConfig = () => {
    return config.network
}

const getBroadcasterInfo = (network) => {
    const forwarderRegistryERC20Address = config.network[network].ForwarderRegistryERC20;
    return {
        forwarderRegistryERC20Address,
    }
}

const getAllAddress = () => {
    address = {}
    for (const network in config.network){
        address[network] = getWallet(network).address;
    }
    return address
}

const getAllFee = () => {
    fee = {}
    for (const network in config.network){
        fee[network] = {}
        for (const token in config.network[network].token){
            const {feeWei, tokenAddress} = getTokenInfo(network, token)
            fee[network][token] = {feeWei: feeWei.toString()}
            if (tokenAddress){
                fee[network][token]["address"] = tokenAddress
            }
        }
    }
    return fee
}

const getTokenInfo = (network, token) => {
    if (network == "test"){
        if (token == "eth"){
            return {
                isETH: 1,
                feeWei: ethers.BigNumber.from(0),
                decimals: 18,
            }
        }
    }
    if (config.network[network]){
        if (token.startsWith('0x')){
            for (const tokenName in config.network[network].token)
            {
                const tokenStruct = config.network[network].token[tokenName]
                if (tokenStruct.address && tokenStruct.address.toLowerCase() == token.toLowerCase()){
                    const feeAmt = tokenStruct.feeAmt;
                    const decimals = tokenStruct.decimals;
                    const feeWei = ethers.utils.parseUnits(feeAmt.toString(), decimals)
                    return {
                        isETH: 0,
                        feeWei: feeWei,
                        tokenAddress: tokenStruct.address,
                        decimals: decimals,
                    }
                }
            }
        }else if(config.network[network].token[token]){
            let isETH = 0;
            let decimals = config.network[network].token[token].decimals;
            if (!decimals){
                decimals = 18;
                isETH = 1;
            }
            const feeAmt = config.network[network].token[token].feeAmt;

            const feeWei = ethers.utils.parseUnits(feeAmt.toString(), decimals)

            const tokenAddress = config.network[network].token[token].address;

            return {
                isETH: isETH,
                feeWei: feeWei,
                tokenAddress: tokenAddress,
                decimals: decimals,
            }
        }

    }
    throw "Network " + network + " Token " + token + " not supported"
}

module.exports = {
    surrogethIp,
    surrogethPort,
    getNetworkInfo,
    getTokenInfo,
    getPrivateKey,
    getWallet,
    getValidRecipient,
    getNetworkConfig,
    getBroadcasterInfo,
    getAllAddress,
    getAllFee,
}
