const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  it("Should mint and trade NFTs", async function () {
    const tokenContract = await ethers.getContractFactory('ERC20Token');
    const token = await tokenContract.deploy("Test", "TEST", 1000000);
    await token.deployed();
    const tokenAddress = token.address;

    const marketContract = await ethers.getContractFactory('Marketplace');
    const market = await marketContract.deploy(2, tokenAddress);
    await market.deployed();
    const marketAddress = market.address;

    const nftContract = await ethers.getContractFactory('NFT');
    const nft = await nftContract.deploy(marketAddress, "MyNFT", "NFT");
    await nft.deployed();
    const nftAddress = nft.address;
  });
});
