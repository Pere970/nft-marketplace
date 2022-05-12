//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
// security against transactions for multiple requests
import 'hardhat/console.sol';

contract Marketplace is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    // counter to track token IDs
    Counters.Counter private _tokenIds;
    // counter to track token sales on market
    Counters.Counter private _tokenSales;
    // counter to track how many sold tokens there are
    Counters.Counter private _tokensSold;

    uint public marketplaceFee;
    address public marketCurrency;

    constructor(uint _marketplaceFee, address _marketCurrency) {
        marketplaceFee = _marketplaceFee;
        marketCurrency = _marketCurrency;
    }

     struct MarketItem {
        uint itemId;
        address nftContract;
        uint256 tokenId;
        address author;
        address owner;
        address seller;
        uint royalties;
        uint256 price;
        bool sold;
     }

    struct MarketSale {
        uint256 id;
        uint256 price;
        address seller;
        address buyer;
        uint date;
    }

    mapping(uint256 => MarketItem) private marketItems;
    mapping(uint256 => MarketSale[]) private marketTransactions;

    event MarketItemCreated(uint256 itemId, address nftContract, uint256 tokenId, address author);
    event MarketItemListed(uint256 itemId, uint256 price, address seller, address nftContract, uint256 tokenId);
    event MarketItemSold(uint256 itemId, address seller, address buyer, uint256 price, uint256 date, address nftContract, uint256 tokenId);

    // Get marketplace's sell fee
    function getMarketplaceFee() public view returns (uint256) {
        return marketplaceFee;
    }

    // Get a specific marketplace's item information
    function getMarketItem(uint256 itemId) public view returns (MarketItem memory) {
        return marketItems[itemId];
    }

    function getMarketItemTransactions(uint256 itemId) public view returns (MarketSale[] memory) {
        return marketTransactions[itemId];
    }

    // Create a new item on the marketplace and optionally put it for sale
    function createMarketItem(
        address nftContract,
        uint tokenId,
        uint royalties,
        uint price
    ) public nonReentrant {
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "You don't own this NFT!");
        _tokenIds.increment();
        uint itemId = _tokenIds.current();

        marketItems[_tokenIds.current()] = MarketItem(itemId, nftContract, tokenId, msg.sender, msg.sender, msg.sender, royalties, price, true);
        emit MarketItemCreated(itemId, nftContract, tokenId, msg.sender);

        if (price > 0){
            listMarketItem(itemId, price);
        }
        
    }

    // List an owned item on the marketplace
    function listMarketItem(uint itemId, uint price) public {
        require(IERC721(marketItems[itemId].nftContract).ownerOf(marketItems[itemId].tokenId) == msg.sender, "You don't own this NFT!");
        require(marketItems[itemId].sold, "This item is currently for sale!");
        require(price > 0, "Price must be greater than 0!");

        IERC721(marketItems[itemId].nftContract).transferFrom(msg.sender, address(this), marketItems[itemId].tokenId);
        marketItems[itemId].sold = false;
        marketItems[itemId].owner = address(this);
        marketItems[itemId].price = price;

        if(marketTransactions[itemId].length > 0){
            _tokensSold.decrement();
        }

        emit MarketItemListed(itemId, price, msg.sender, marketItems[itemId].nftContract, marketItems[itemId].tokenId);
    }

       
    function sellMarketItem(uint itemId) public nonReentrant {
        require(IERC20(marketCurrency).balanceOf(msg.sender) >= marketItems[itemId].price, "You don't have enough funds!");
        require(IERC20(marketCurrency).allowance(msg.sender, address(this)) >= marketItems[itemId].price, "Marketplace is not allowed to use your funds, check the allowance!");
        require(!marketItems[itemId].sold, "This item is already sold!");
        address seller = marketItems[itemId].seller;
        //calculate deduction fees
        uint feeAmount = marketItems[itemId].price * marketplaceFee / 100;
        uint royaltiesAmount = marketItems[itemId].price * marketItems[itemId].royalties / 100;
        //transfer funds
        IERC20(marketCurrency).transferFrom(msg.sender, address(this), feeAmount);
        IERC20(marketCurrency).transferFrom(msg.sender, marketItems[itemId].author, royaltiesAmount);
        IERC20(marketCurrency).transferFrom(msg.sender, seller, marketItems[itemId].price - feeAmount - royaltiesAmount);
        //transfer NFT
        IERC721(marketItems[itemId].nftContract).transferFrom(address(this), msg.sender, marketItems[itemId].tokenId);

        //update marketItem
        marketItems[itemId].sold = true;
        marketItems[itemId].owner = msg.sender;
        marketItems[itemId].seller = msg.sender;
        marketItems[itemId].price = 0;
        
        //Create sale transaction
        _tokenSales.increment();
        marketTransactions[itemId].push(MarketSale(_tokenSales.current(), marketItems[itemId].price, seller, msg.sender, block.timestamp));

        _tokensSold.increment(); 

        emit MarketItemSold(itemId, seller, msg.sender, marketItems[itemId].price, block.timestamp, marketItems[itemId].nftContract, marketItems[itemId].tokenId);
    }

    // function to fetchMarketItems - minting, buying ans selling
    // return the number of unsold items

    function fetchMarketItems() public view returns(MarketItem[] memory) {
        uint itemCount = _tokenIds.current();
        uint unsoldItemCount = _tokenIds.current() - _tokensSold.current();
        uint currentIndex = 0;

        // looping over the number of items created (if number has not been sold populate the array)
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for(uint i = 0; i < itemCount; i++) {
            if(marketItems[i + 1].sold == false) {
                uint currentId = i + 1;
                MarketItem storage currentItem = marketItems[currentId];
                items[currentIndex] = currentItem; 
                currentIndex += 1;
            }
        } 
        return items; 
    }

        // return nfts that the user has purchased

        function fetchMyNFTs() public view returns (MarketItem[] memory) {
            uint itemCount = 0;
           
            for(uint i = 0; i < _tokenIds.current(); i++) {
                if(marketItems[i + 1].owner == msg.sender 
                || marketItems[i + 1].seller == msg.sender) {
                    itemCount++;
                }
            }

            // second loop to loop through the amount you have purchased with itemcount
            // check to see if the owner address is equal to msg.sender
            uint currentIndex = 0;
            MarketItem[] memory items = new MarketItem[](itemCount);
            for(uint i = 0; i < _tokenIds.current(); i++) {
                if(marketItems[i +1].owner == msg.sender
                || marketItems[i + 1].seller == msg.sender) {
                    uint currentId = marketItems[i + 1].itemId;
                    // current array
                    items[currentIndex] = marketItems[currentId];
                    currentIndex += 1;
                }
            }
            return items;
        }

        // function for returning an array of minted nfts
    function fetchItemsCreated() public view returns(MarketItem[] memory) {
        // instead of .owner it will be the .seller
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        for(uint i = 0; i < totalItemCount; i++) {
                if(marketItems[i + 1].seller == msg.sender) {
                    itemCount += 1;
                }
            }

            // second loop to loop through the amount you have purchased with itemcount
            // check to see if the owner address is equal to msg.sender

        MarketItem[] memory items = new MarketItem[](itemCount);
        for(uint i = 0; i < totalItemCount; i++) {
            if(marketItems[i +1].seller == msg.sender) {
                uint currentId = marketItems[i + 1].itemId;
                MarketItem storage currentItem = marketItems[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
}
