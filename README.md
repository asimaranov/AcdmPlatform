# ACDM Platform

This project contains contracts that build up an ecosystem. Project consists of tokens, staking, DAO and ACDMPlatform contracts. Tests with 100% coverage and usefull tasks

## Rinkeby addresses
- ItPubToken: `0x0a4dDa1b3Ba3B4cf6Cd3815cb5A357037e00AeE3`
- Uniswap ItPubEthLiquidityToken: `0xFB5D557c22BB80663E58D01a33066a00535ABF4c`
- ACDMToken: `0xcb1E49b86977FCB4bd8284D7A3007A53273d3E20`
- ACDMPlatform: `0x494136912E1C832a30ed38Af6C2e66084c6fDcFA`
- Staking: `0x04e6DFfdF50F5e50e5b4A9e5BC151ad30De7E109`
- DAO: `0x011cC3078B783248527Ff3e6b92fB390DfD5B4be`

## Rinkeby verifications
- ItPubToken: https://rinkeby.etherscan.io/address/0x0a4dDa1b3Ba3B4cf6Cd3815cb5A357037e00AeE3#code
- ACDMToken: https://rinkeby.etherscan.io/address/0xcb1E49b86977FCB4bd8284D7A3007A53273d3E20#code
- ACDMPlatform: https://rinkeby.etherscan.io/address/0x494136912E1C832a30ed38Af6C2e66084c6fDcFA#code
- Staking: https://rinkeby.etherscan.io/address/0x04e6DFfdF50F5e50e5b4A9e5BC151ad30De7E109#code
- DAO: https://rinkeby.etherscan.io/address/0x011cC3078B783248527Ff3e6b92fB390DfD5B4be#code


## How to deploy
```
npx hardhat run scripts/deploy.ts --network rinkeby 
```

## How to verify
- ItPubToken: `npx hardhat verify 0x0a4dDa1b3Ba3B4cf6Cd3815cb5A357037e00AeE3 --contract contracts/ItPubToken.sol:ItPubToken --network rinkeby`
- ItPubEthLiquidityToken: `npx hardhat verify 0xFB5D557c22BB80663E58D01a33066a00535ABF4c --network rinkeby`
- ACDMToken: `npx hardhat verify 0xcb1E49b86977FCB4bd8284D7A3007A53273d3E20 --network rinkeby`
- ACDMPlatform: `npx hardhat verify 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA 0x011cC3078B783248527Ff3e6b92fB390DfD5B4be 0xcb1E49b86977FCB4bd8284D7A3007A53273d3E20 0x0a4dDa1b3Ba3B4cf6Cd3815cb5A357037e00AeE3 259200 --network rinkeby`
- Staking: `npx hardhat verify 0x04e6DFfdF50F5e50e5b4A9e5BC151ad30De7E109 0xFB5D557c22BB80663E58D01a33066a00535ABF4c 0x0a4dDa1b3Ba3B4cf6Cd3815cb5A357037e00AeE3 --network rinkeby`
- DAO: `npx hardhat verify 0x011cC3078B783248527Ff3e6b92fB390DfD5B4be 0x04e6DFfdF50F5e50e5b4A9e5BC151ad30De7E109 0x2836eC28C32E232280F984d3980BA4e05d6BF68f 150000000000000000000 86400 --network rinkeby`


## How to stake ItPub eth liquidity tokens
```
npx hardhat stake --contract-addr 0x04e6DFfdF50F5e50e5b4A9e5BC151ad30De7E109 --token-addr 0xf1C80DE1bb14aC337808A83b0e56A53425D72B67 --token-amount 0.0000000001 --network rinkeby
```

## How to unstake
```
npx hardhat unstake --contract-addr 0x04e6DFfdF50F5e50e5b4A9e5BC151ad30De7E109 --network rinkeby
```

## How to claim
```
npx hardhat claim --contract-addr 0x04e6DFfdF50F5e50e5b4A9e5BC151ad30De7E109 --network rinkeby

```

## How to add proposal
```
npx hardhat addProposal --contract-addr 0x011cC3078B783248527Ff3e6b92fB390DfD5B4be --call-data 0xa9059cbb00000000000000000000000015d34aaf54267db7d7c367839aaf71a00a2c6a650000000000000000000000000000000000000000000000000de0b6b3a7640000 --recipient 0x9dBdFcdf8D713011B4E1C17900EA9F1bcf46B941 --description test --network ropsten

```

## How to vote
```
npx hardhat vote --contract-addr 0x011cC3078B783248527Ff3e6b92fB390DfD5B4be --proposal-id 0 --against false --network rinkeby

```

## How to finish proposal

```
npx hardhat finishProposal --contract-addr 0x011cC3078B783248527Ff3e6b92fB390DfD5B4be --proposal-id 0 --network rinkeby

```

## How to register on ACDM Platform

```
npx hardhat register --contract-addr 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA --referrer-id 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec --network rinkeby

```

## How to start sale round

```
npx hardhat startSaleRound --contract-addr 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA --network rinkeby

```

## How to buy ACDM in sale round

```
npx hardhat buyAcdm --contract-addr 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA --amount-to-buy 0.1 --network rinkeby

```

## How to start trade round

```
npx hardhat startTradeRound --contract-addr 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA --network rinkeby

```

## How to add order

```
npx hardhat addOrder --contract-addr 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA --token-amount 1.0 --eth-amount 0.00001 --network rinkeby

```


## How to remove order

```
npx hardhat removeOrder --contract-addr 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA --order-id 0 --network rinkeby

```

## How to redeem order

```
npx hardhat redeemOrder --contract-addr 0x494136912E1C832a30ed38Af6C2e66084c6fDcFA --order-id 0 --eth-amount 0.00001 --network rinkeby

```