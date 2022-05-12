import  {React, Component, useState, useEffect } from "react";
import { Card, Button, Header, Image } from 'semantic-ui-react';
import Layout from '../components/Layout';
import { Link } from '../routes';
import { ethers } from 'ethers';
import axios from 'axios';
import Web3Modal from 'web3modal';

import { nftAddress, marketplaceAddress, erc20TokenAddress } from '../mumbai.config';

import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import ERC20Token from '../artifacts/contracts/ERC20Token.sol/ERC20Token.json';
import Marketplace from '../artifacts/contracts/Marketplace.sol/Marketplace.json';

export default function MyNFTs() {
    const [nfts, setNFTs] = useState([]);
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    
    async function getMyNFTs(){
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()
        const nftContract = new ethers.Contract(nftAddress, NFT.abi, signer)
        const marketContract = new ethers.Contract(marketplaceAddress, Marketplace.abi, signer)
        const erc20Contract = new ethers.Contract(erc20TokenAddress, ERC20Token.abi, signer)
        const data = await marketContract.fetchMyNFTs()
        const nfts = await Promise.all(data.map(async i => {
        const tokenUri = await nftContract.tokenURI(i.tokenId)
        // we want get the token metadata - json 
        const meta = await axios.get(tokenUri)
        let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
        let currencySymbol = await erc20Contract.symbol()
        setTokenSymbol(currencySymbol)
        let item = {
            price,
            curency: tokenSymbol,
            tokenId: i.tokenId.toNumber(),
            seller: i.seller,
            owner: i.owner,
            image: meta.data.image, 
            name: meta.data.name,
            description: meta.data.description,
            sold: i.sold
        }
        return item
        }))
        setNFTs(nfts)
      }


    useEffect(()=> {
        getMyNFTs()
      }, [])

    function renderNFTs() {
        if(nfts.length > 0){
            const items = nfts.map(i =>{

                const button = i.sold ? '' : 
                <Button
                    content="Buy NFT"
                    fluid="true"
                    icon="dollar sign"
                    loading={loading}
                    onClick= {async () => await buyNft(i.itemId, i.price)}
                    primary
                />

                return {
                    header: i.name,
                    description: i.description,
                    extra: (<div>
                        <p>Price: {i.price} {tokenSymbol}</p>
                        {button}
                    </div>),
                    image: (<Image src={i.image} centered="true" />)
                }
            });
            return <Card.Group items={items} />;
        }
        return <Header textAlign="center" size="huge">No NFTs for sale!</Header>;
    }
    
    return (
        <Layout>
            {  renderNFTs()  }
        </Layout>
    );
    
};
