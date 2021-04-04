
const ethers = require('ethers');

const {
    surrogethPort,
    getNetworkInfo,
    getTokenInfo,
} = require("../js/configSurrogeth");

const testToken = (token) => {
    const {
        isETH,
        feeWei,
        decimals,
    } = getTokenInfo("kovan", token)
    expect(feeWei.gt(0)).toBeTruthy()
}

describe("config file", () => {
    test("test config value", async () => {
        console.log("NODE_ENV", process.env.NODE_ENV)

        expect(surrogethPort).toBe(8123)
        const networkInfoGanache = getNetworkInfo("ganache")
        const walletGanache = networkInfoGanache.wallet
        const balanceGanache = await walletGanache.getBalance()
        console.log("Balance Ganache:", walletGanache.address, ethers.utils.formatUnits(balanceGanache, 18), "ETH")
        expect(balanceGanache.gt(0)).toBeTruthy()

        /*
        console.log(getNetworkInfo("ganache"))
        console.log(getNetworkInfo("kovan"))
        console.log(getTokenInfo("ganache", "eth"))
        console.log(getTokenInfo("ganache", "tkn"))
        console.log(getTokenInfo("kovan", "eth"))
        console.log(getTokenInfo("kovan", "tkn"))
        console.log(getTokenInfo("kovan", "dai"))
        */
    });
    test("test mock test", async () => {

    });
  });
