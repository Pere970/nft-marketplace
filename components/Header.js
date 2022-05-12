import { React, useEffect, useState } from "react";
import { Menu } from "semantic-ui-react";
import { Link } from '../routes';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import { erc20TokenAddress } from '../mumbai.config';
import ERC20Token from '../artifacts/contracts/ERC20Token.sol/ERC20Token.json';



export default () => {
    const [accountBalance, setAccountBalance] = useState(0);
    const [tokenSymbol, setTokenSymbol] = useState('');
    

    useEffect(()=> {
        getCurrentBalance()
        getTokenSymbol()
      }, [])

      async function getTokenSymbol() {
        const provider = new ethers.providers.JsonRpcProvider("https://polygon-mumbai.infura.io/v3/{yourprojectID}")
        const erc20Contract = new ethers.Contract(erc20TokenAddress, ERC20Token.abi, provider)
        const tokenSymbol = await erc20Contract.symbol();
        setTokenSymbol(tokenSymbol);
    }


      async function getCurrentBalance() {
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()
        const contract = new ethers.Contract(erc20TokenAddress, ERC20Token.abi, signer)
        const userBalance = await contract.balanceOf(provider.provider.selectedAddress);
        setAccountBalance(ethers.utils.formatUnits(userBalance.toString(), 'ether'));
        const tokenSymbol = await contract.symbol();
        setTokenSymbol(tokenSymbol);
    }

    return (
        <Menu style={{ marginTop: '10px' }}>
            <Link route='/'>
                <a className="item">
                    NFT Marketplace
                </a>
            </Link>


            <Menu.Menu position="right">
                <Link route='/mint'>
                    <a className="item">
                        Mint new NFT!
                    </a>
                </Link>

                <Link route='/useritems'>
                    <a className="item">
                        My NFTs
                    </a>
                </Link>

                <div className="header item">
                    Balance: { accountBalance } { tokenSymbol }
                </div>
                
            </Menu.Menu>
        </Menu>
    );
};