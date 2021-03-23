
const ethers = require('ethers');

describe("config file", () => {
    test("test config value", async () => {
        console.log("NODE_ENV", process.env.NODE_ENV)
        const {
            surrogethPort,
            getNetworkInfo,
            getTokenInfo,
        } = require("../js/configSurrogeth");

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
