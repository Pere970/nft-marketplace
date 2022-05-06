const { expect, assert } = require("chai");
const { ethers } = require("hardhat");



describe("Marketplace", async function () {
 
  it("Should mint and list one NFT", async function () {
    const accounts = await ethers.provider.listAccounts();


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

    // test for minting
    let nftId = await nft.mintNFT('https-t1')
    let nftRC = await nftId.wait();

    let nftTokenId = nftRC.events.find(event => event.event === 'NFTMinted').args.tokenId
    await market.createMarketItem(nftAddress, nftTokenId, 5, 0);
    let listedNFT = await market.getMarketItem(1)
    
    assert(listedNFT != undefined)
    assert.equal(listedNFT.nftContract, nftAddress)
    assert(listedNFT.tokenId == nftTokenId)
    assert.equal(listedNFT.author, accounts[0])  
  });
});