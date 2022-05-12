import  {React, useState } from "react";
import { Button,  Form, Input, Message } from 'semantic-ui-react';
import Layout from '../components/Layout';
import { Link } from '../routes';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import {create as ipfsHttpClient} from 'ipfs-http-client'
import {useRouter} from 'next/router'
import { InputFile } from 'semantic-ui-react-input-file'

import { nftAddress, marketplaceAddress } from '../mumbai.config';

import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import Marketplace from '../artifacts/contracts/Marketplace.sol/Marketplace.json';
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

export default function MintNftPage() {
    const [fileUrl, setFileUrl] = useState(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState(0)
    const [royalties, setRoyalties] = useState(0)
    const [errorMessage, setErrorMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [filename, setFilename] = useState('')
    const router = useRouter()

    async function onChange(e) {
        const file = e.target.files[0]
        setFilename(file.name)
        try {
        const added = await client.add(
            file, {
                progress: (prog) => console.log(`received: ${prog}`)
            })
        const url = `https://ipfs.infura.io/ipfs/${added.path}`
        setFileUrl(url)
        } catch (error) {
            console.log('Error uploading file:', error)
        }
    }

    async function createNFT() {
        if(!name || !description || !fileUrl || !royalties) return 
        // upload to IPFS
        setLoading(true)
        const data = JSON.stringify({
            name, description, image: fileUrl
        })
        try {
            const added = await client.add(data)
            const url = `https://ipfs.infura.io/ipfs/${added.path}`
            // create NFT
            const web3Modal = new Web3Modal()
            const connection = await web3Modal.connect()
            const provider = new ethers.providers.Web3Provider(connection)
            const signer = provider.getSigner()

            // we want to create the token
            let contract = new ethers.Contract(nftAddress, NFT.abi, signer)
            let transaction = await contract.mintNFT(url)
            let tx = await transaction.wait()
            let event = tx.events[0]
            let value = event.args[2]
            let tokenId = value.toNumber()

            // create MarketplaceItem
            contract = new ethers.Contract(marketplaceAddress, Marketplace.abi, signer)
            transaction = await contract.createMarketItem(nftAddress, tokenId, royalties, ethers.utils.parseUnits(String(price), 'ether'))
            await transaction.wait()
            setLoading(false)
            router.push('./')

            } catch (error) {
                console.log('Error uploading file:', error)
            }
    }

    return(
        <Layout>
            <Link route="/">
                <a>Home</a>
            </Link>
            <h3>Mint a new NFT</h3>
            <Form onSubmit={createNFT} error={!!errorMessage}>
                <Form.Field>
                    <label>Name</label>
                    <Input 
                        value={name}
                        onChange={event => setName(event.target.value)}
                    />
                </Form.Field>
                <Form.Field>
                    <label>Description</label>
                    <Input 
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                    />
                </Form.Field>
                <Form.Field>
                    <label>Price (leave to 0 if you don't want the NFT to get listed)</label>
                    <Input 
                        value={price}
                        onChange={event => setPrice(event.target.value)}
                    />
                </Form.Field>
                <Form.Field>
                    <label>Royalties (in %)</label>
                    <Input 
                        value={royalties}
                        onChange={event => setRoyalties(event.target.value)}
                    />
                </Form.Field>
                <Form.Field>
                    <label>Image</label>
                    <InputFile
                        button={{ value: 'Select Image' }}
                        input={{
                            id: 'input-control-id',
                            onChange: e => onChange(e)
                        }}
                    />
                    <br></br>
                    <br></br>
                    <label>Selected: {filename}</label>
                </Form.Field>

                <Message error header="Oops!" content={errorMessage} />
                {<Button floated="right" primary loading={loading}>Mint!</Button>}
            </Form>
        </Layout>
    );


}