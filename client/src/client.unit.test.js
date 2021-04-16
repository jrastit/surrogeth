const { SurrogethClient } = require("./client");

jest.mock("ethers");

describe("getBroadcasters", () => {
  test("returns an empty list if no candidates in contract", async () => {
    require("ethers").__setRelayers([1, 2, 3], [[100, 2], [150, 4], [50, 4]]);
    require("ethers").__setBroadcasters([], {});

    const client = new SurrogethClient();
    const relayers = await client.getBroadcasters();

    expect(relayers).toStrictEqual([]);
  });

  test("ignore locators that aren't allowed", async () => {
    require("ethers").__setRelayers([1, 2, 3], [[100, 2], [150, 4], [50, 4]]);
    require("ethers").__setBroadcasters([1, 2, 3], ["ip", "ip", "tor"]);

    const client = new SurrogethClient();

    let relayers = await client.getBroadcasters(1, new Set(["tor"]));
    expect(relayers.length).toEqual(1)
    expect(relayers[0].address).toEqual(3)
    expect(relayers[0].locator).toEqual("3")
    expect(relayers[0].locatorType).toEqual("tor")
    expect(relayers[0].feeCount.toNumber()).toEqual(4)
    expect(relayers[0].feeSum.toNumber()).toEqual(50)
  });

  test("returns an empty list if no relayers with the specified locator type", async () => {
    require("ethers").__setRelayers([1, 2, 3], [[100, 2], [150, 4], [50, 4]]);
    require("ethers").__setBroadcasters([1, 2, 3], ["ip", "ip", "ip"]);

    const client = new SurrogethClient();

    let relayers = await client.getBroadcasters(1, new Set(["tor"]));
    expect(relayers).toStrictEqual([]);
  });

  test("returns multiple relayers if more than 1 is asked for", async () => {
    require("ethers").__setRelayers([1, 2, 3], [[100, 2], [150, 4], [50, 4]]);
    require("ethers").__setBroadcasters([1, 2, 3], ["tor", "ip", "ip"]);

    const client = new SurrogethClient();

    let relayers = await client.getBroadcasters(2, new Set(["tor", "ip"]));
    expect(relayers.length).toEqual(3)
    expect(relayers[0].address).toEqual(1)
    expect(relayers[0].locator).toEqual("1")
    expect(relayers[0].locatorType).toEqual("tor")
    expect(relayers[0].feeCount.toNumber()).toEqual(2)
    expect(relayers[0].feeSum.toNumber()).toEqual(100)
    expect(relayers[1].address).toEqual(2)
    expect(relayers[1].locator).toEqual("2")
    expect(relayers[1].locatorType).toEqual("ip")
    expect(relayers[1].feeCount.toNumber()).toEqual(4)
    expect(relayers[1].feeSum.toNumber()).toEqual(150)
  });
});

describe("getAvgFee", () => {
  test("normal functioning w/multiple fees", async () => {
    require("ethers").__setRelayers([1, 2, 3], [[100, 2], [150, 4], [50, 4]]);

    const client = new SurrogethClient();

    let avgFee = await client.getAvgFee();
    expect(avgFee.toNumber()).toBe(30);
  });

  test("return null if no fees", async () => {
    require("ethers").__setRelayers([], []);

    const client = new SurrogethClient();

    let avgFee = await client.getAvgFee();
    expect(avgFee).toBe(null);
  });
});
