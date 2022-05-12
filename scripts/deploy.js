// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const tokenContract = await hre.ethers.getContractFactory('ERC20Token');
  token = await tokenContract.deploy("Test Coins", "COIN", 1000000);
  await token.deployed();
  console.log("Token deployed at " + token.address);

  const marketContract = await hre.ethers.getContractFactory('Marketplace');
  marketplace = await marketContract.deploy(2, token.address);
  await marketplace.deployed();
  console.log("Marketplace deployed at " + marketplace.address);

  const nftContract = await hre.ethers.getContractFactory('NFT');
  nft = await nftContract.deploy(marketplace.address, "NFTs", "PERENFT");
  await nft.deployed();
  console.log("NFT deployed at " + nft.address);
  
  let config = `
  export const marketplaceAddress = '${marketplace.address}'
  export const nftAddress = '${nft.address}'
  export const erc20TokenAddress = '${token.address}'`

  let data = JSON.stringify(config)
  fs.writeFileSync(`${hre.network.name}.config.js`, JSON.parse(data))
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
