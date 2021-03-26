
const config = require('config');
const ethers = require('ethers');

const surrogethPort = config.surrogethPort;

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
        return "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
    }
    const privateKeysPath = config.network[network].privateKeysPath;
    const privateKeys = require("../" + privateKeysPath);
    // For mixer compatibility key are stored in array
    return privateKeys[0];
}

const getWallet = (network) => {
    return getNetworkInfo(network).wallet
}

const getTokenInfo = (network, token) => {
    if (network == "test"){
        if (token == "eth"){
            return {
                isETH: 1,
                feeWei: 0,
                decimals: 18,
            }
        }
    }
    if (config.network[network]){
        if (token.startsWith('0x')){
            for (const tokenName in config.network[network].token)
            {
                const tokenStruct = config.network[network].token[tokenName]
                if (tokenStruct.address == token){
                    const feeAmt = tokenStruct.feeAmt;
                    const decimals = tokenStruct.decimals;
                    const feeWei = ethers.utils.parseUnits(feeAmt.toString(), decimals)
                    return {
                        isETH: 0,
                        feeWei: feeWei,
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

            return {
                isETH: isETH,
                feeWei: feeWei,
                decimals: decimals,
            }
        }

    }
    throw "Network " + network + " Token " + token + " not supported"
}

module.exports = {
    surrogethPort,
    getNetworkInfo,
    getTokenInfo,
    getPrivateKey,
    getWallet,
    getValidRecipient,
}
