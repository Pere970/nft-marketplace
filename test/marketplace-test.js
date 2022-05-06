const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");



describe("Marketplace", async function () {
  let accounts;
  let token;
  let marketplace;
  let nft;
  const LISTING_PRICE = ethers.utils.parseEther("100");
  const NFT_ROYALTIES = 5;
  const MARKETPLACE_FEE = 2;

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    const tokenContract = await ethers.getContractFactory('ERC20Token');
    token = await tokenContract.deploy("Test", "TEST", 1000000);
    await token.deployed();

    const marketContract = await ethers.getContractFactory('Marketplace');
    marketplace = await marketContract.deploy(MARKETPLACE_FEE, token.address);
    await marketplace.deployed();

    const nftContract = await ethers.getContractFactory('NFT');
    nft = await nftContract.deploy(marketplace.address, "MyNFT", "NFT");
    await nft.deployed();
    
  });

  it("Should mint and create one NFT on the marketplace", async function () {
    

    // test for minting
    let nftId = await nft.mintNFT('https-t1')
    let nftRC = await nftId.wait();

    let nftTokenId = nftRC.events.find(event => event.event === 'NFTMinted').args.tokenId
    await marketplace.createMarketItem(nft.address, nftTokenId, NFT_ROYALTIES, 0);
    let listedNFT = await marketplace.getMarketItem(1)
    
    assert(listedNFT != undefined)
    assert.equal(listedNFT.nftContract, nft.address)
    assert.equal(String(listedNFT.tokenId), String(nftTokenId))
    assert.equal(listedNFT.author, accounts[0].address)  
  });

  it("Should mint and list one NFT on the marketplace", async function () {
    // test for minting
    let nftId = await nft.mintNFT('https-t1')
    let nftRC = await nftId.wait();

    let nftTokenId = nftRC.events.find(event => event.event === 'NFTMinted').args.tokenId
    await marketplace.createMarketItem(nft.address, nftTokenId, NFT_ROYALTIES, LISTING_PRICE);
    let listedNFT = await marketplace.getMarketItem(1)
    
    assert(listedNFT != undefined)
    assert.equal(listedNFT.nftContract, nft.address)
    assert.equal(String(listedNFT.tokenId), String(nftTokenId))
    assert.equal(listedNFT.author, accounts[0].address) 
    assert.equal(String(listedNFT.price), String(LISTING_PRICE))
  });

  it("Should mint, list and buy one NFT on the marketplace", async function () {
    // test for minting
    let nftId = await nft.mintNFT('https-t1')
    let nftRC = await nftId.wait();

    let nftTokenId = nftRC.events.find(event => event.event === 'NFTMinted').args.tokenId
    await marketplace.createMarketItem(nft.address, nftTokenId, NFT_ROYALTIES, LISTING_PRICE);
    let listedNFT = await marketplace.getMarketItem(1)
    
    assert(listedNFT != undefined)
    assert.equal(listedNFT.nftContract, nft.address)
    assert.equal(String(listedNFT.tokenId), String(nftTokenId))
    assert.equal(listedNFT.author, accounts[0].address) 
    assert.equal(String(listedNFT.price), String(LISTING_PRICE))

    // test for buying
    await token.transfer(accounts[1].address, await token.balanceOf(accounts[0].address));
    await token.connect(accounts[1]).approve(marketplace.address, LISTING_PRICE);

    const initialAuthorBalance = await token.balanceOf(listedNFT.author);
    assert.equal(initialAuthorBalance, 0)
    const marketplaceInitialBalance = await token.balanceOf(marketplace.address);
    assert.equal(marketplaceInitialBalance, 0)
    
    const previousMarketTransactions = await marketplace.getMarketItemTransactions(listedNFT.itemId);
    assert.equal(previousMarketTransactions.length, 0)

    //Check marketItemSold Event
    const buyTx = await marketplace.connect(accounts[1]).sellMarketItem(1);
    const buyTxReceipt = await buyTx.wait();
    const marketItemSoldEvent = buyTxReceipt.events[buyTxReceipt.events.length - 1];
    assert.equal(marketItemSoldEvent.event, "MarketItemSold")
    assert.equal(marketItemSoldEvent.args.seller, accounts[0].address)
    assert.equal(marketItemSoldEvent.args.buyer, accounts[1].address)

    //Check if market transaction has been added to the item
    const currentMarketTransactions = await marketplace.getMarketItemTransactions(listedNFT.itemId);
    assert.equal(currentMarketTransactions.length, 1)
    
    const currentMarketplaceBalance = await token.balanceOf(marketplace.address)
    const currentAuthorBalance = await token.balanceOf(listedNFT.author)
    const marketplaceFee = (listedNFT.price * MARKETPLACE_FEE) / 100;
    const royaltiesFee = (listedNFT.price * NFT_ROYALTIES) / 100;
    const finalPriceWithDeductions = listedNFT.price - marketplaceFee - royaltiesFee;

    //check if the marketplace has received the fee funds
    assert.equal(String(currentMarketplaceBalance), String(marketplaceFee))

    //Check if the author has received the royalties fee
    assert.equal(String(currentAuthorBalance), String( finalPriceWithDeductions + royaltiesFee ))

    //Check if the NFT ownership has been updated properly
    assert.equal(await nft.ownerOf(listedNFT.tokenId), accounts[1].address)

    const updatedMarketItem = await marketplace.getMarketItem(1);
    assert.equal(updatedMarketItem.author, accounts[0].address)
    assert.equal(updatedMarketItem.owner, accounts[1].address)
    assert.equal(updatedMarketItem.price, 0)
  });
});