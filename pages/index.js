import  {React, Component, useState, useEffect } from "react";
import { Card, Button, Header, Image } from 'semantic-ui-react';
import Layout from '../components/Layout';
import { ethers } from 'ethers';
import axios from 'axios';
import Web3Modal from 'web3modal';

import { nftAddress, marketplaceAddress, erc20TokenAddress } from '../mumbai.config';

import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import ERC20Token from '../artifacts/contracts/ERC20Token.sol/ERC20Token.json';
import Marketplace from '../artifacts/contracts/Marketplace.sol/Marketplace.json';

export default function MarketplaceIndex() {
    const [nfts, setNFTs] = useState([]);
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    
    async function getMarketplaceNFTs(){
        const provider = new ethers.providers.JsonRpcProvider("https://polygon-mumbai.infura.io/v3/{infuraProjectId}")
        const nftContract = new ethers.Contract(nftAddress, NFT.abi, provider)
        const marketContract = new ethers.Contract(marketplaceAddress, Marketplace.abi, provider)
        const erc20Contract = new ethers.Contract(erc20TokenAddress, ERC20Token.abi, provider)
        const data = await marketContract.fetchMarketItems()
        if(data.filter(x => x.tokenId > 0).length > 0){
            const nfts = await Promise.all(data.map(async i => {
                const tokenUri = await nftContract.tokenURI(i.tokenId)
                // we want get the token metadata - json 
                const meta = await axios.get(tokenUri)
                let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
                let currencySymbol = await erc20Contract.symbol()
                setTokenSymbol(currencySymbol)
                let item = {
                    itemId: i.itemId,
                    price,
                    curency: tokenSymbol,
                    tokenId: i.tokenId.toNumber(),
                    seller: i.seller,
                    owner: i.owner,
                    image: meta.data.image, 
                    name: meta.data.name,
                    description: meta.data.description
                }
                return item
            }))
                setNFTs(nfts)
        }
      }

      async function buyNft(itemId, price){
        setLoading(true)
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()
        const marketContract = new ethers.Contract(marketplaceAddress, Marketplace.abi, signer)
        const erc20Contract = new ethers.Contract(erc20TokenAddress, ERC20Token.abi, signer)
        const marketAllowance = await erc20Contract.allowance(provider.provider.selectedAddress, marketplaceAddress)
        if(marketAllowance.lt(ethers.utils.parseUnits(String(price), 'ether'))){
            //We must approve tokens to marketplace contract
            const tx = await erc20Contract.approve(marketplaceAddress, await erc20Contract.totalSupply())
            await tx.wait()
        }
        const tx = await marketContract.sellMarketItem(itemId)
        await tx.wait()
        setLoading(false)
        router.push('./')
      }


    useEffect(()=> {
        getMarketplaceNFTs()
      }, [])

      function renderNFTs() {
        if(nfts.length > 0){
            const items = nfts.map(i =>{
                return {
                    header: i.name,
                    description: i.description,
                    extra: (
                    <div>
                        <p>Price: {i.price} {tokenSymbol}</p>
                        <Button
                            content="Buy NFT"
                            fluid="true"
                            icon="dollar sign"
                            loading={loading}
                            onClick= {async () => await buyNft(i.itemId, i.price)}
                            primary
                        />
                    </div>),
                    image: (<Image  src={i.image} centered="true" />)
                }
            });
            return <Card.Group items={items} />;
        }
        return <Header textAlign="center" size="huge">No NFTs for sale!</Header>;
    }
    
    return (
        <Layout>
            <div>
                {  renderNFTs()  }
            </div>
        </Layout>
    );
    
};
