//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

contract NFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    // Counter to track token IDs
    Counters.Counter private _tokenIds;

    // Address of the marketplace the NFT will interact with
    address public contractAddress; 

    event NFTMinted(address owner, uint256 tokenId, string uri);

    constructor(address marketplaceAddress, string memory collectionName, string memory tokenName) ERC721(collectionName, tokenName) {
        contractAddress = marketplaceAddress;
    }

    function mintNFT(string memory tokenURI) public returns(uint) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        // give the marketplace the approval to transact between users
        setApprovalForAll(contractAddress, true);
        emit NFTMinted(msg.sender, newItemId, tokenURI);
        return newItemId;
    }
}