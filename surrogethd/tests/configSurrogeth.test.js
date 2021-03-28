
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

        expect(surrogethPort).toMatch("8123")
        const networkInfoGanache = getNetworkInfo("ganache")
        const walletGanache = networkInfoGanache.wallet
        const balanceGanache = await walletGanache.getBalance()
        console.log("Balance Ganache:", walletGanache.address, ethers.utils.formatUnits(balanceGanache, 18), "ETH")
        expect(balanceGanache.gt(0)).toBeTruthy()

        const networkInfoKovan = getNetworkInfo("kovan")
        const walletKovan = networkInfoKovan.wallet
        const balanceKovan = await walletKovan.getBalance()
        console.log("Balance Kovan:", walletKovan.address, ethers.utils.formatUnits(balanceKovan, 18), "ETH")
        testToken("0x6fB66Fe3a00aFF2fD0a373223592D9Ebe21913eF")
        testToken("0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa")
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
