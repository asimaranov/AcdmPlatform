# ACDM Platform

This project contains contracts that build up an ecosystem. Project consists of tokens, staking, DAO and ACDMPlatform contracts. Tests with 100% coverage and usefull tasks

## Rinkeby addresses
- ItPubToken: `0x7b67956bF4Df7d9BfdC4E82c2b59Df4B8bB7408D`
- Uniswap ItPubEthLiquidityToken: `0x9FB308d501ef105520268F4Ccd9272D1453965Cb`
- ACDMToken: `0x47DeCac15d7f8453bB86CA51167E093132BF053E`
- ACDMPlatform: `0x48720871e91Cc4Df11747CB3b64F58A25E16d10c`
- Staking: `0xfD99136A6131704e5ebF947e4A94b32EB36Db424`
- DAO: `0x2b4fB06736553AA99C0ff3f0892d842529544D62`

## Rinkeby verifications
- ItPubToken: https://rinkeby.etherscan.io/address/0x7b67956bF4Df7d9BfdC4E82c2b59Df4B8bB7408D#code
- ACDMToken: https://rinkeby.etherscan.io/address/0x47DeCac15d7f8453bB86CA51167E093132BF053E#code
- ACDMPlatform: https://rinkeby.etherscan.io/address/0x48720871e91Cc4Df11747CB3b64F58A25E16d10c#code
- Staking: https://rinkeby.etherscan.io/address/0xfD99136A6131704e5ebF947e4A94b32EB36Db424#code
- DAO: https://rinkeby.etherscan.io/address/0x2b4fB06736553AA99C0ff3f0892d842529544D62#code


## How to deploy
```
npx hardhat run scripts/deploy.ts --network rinkeby 
```

## How to verify
- ItPubToken: `npx hardhat verify 0x7b67956bF4Df7d9BfdC4E82c2b59Df4B8bB7408D --contract contracts/ItPubToken.sol:ItPubToken --network rinkeby`
- ItPubEthLiquidityToken: `npx hardhat verify 0x9FB308d501ef105520268F4Ccd9272D1453965Cb --network rinkeby`
- ACDMToken: `npx hardhat verify 0x47DeCac15d7f8453bB86CA51167E093132BF053E --network rinkeby`
- ACDMPlatform: `npx hardhat verify 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c 0x47DeCac15d7f8453bB86CA51167E093132BF053E 0x7b67956bF4Df7d9BfdC4E82c2b59Df4B8bB7408D 259200 --network rinkeby`
- Staking: `npx hardhat verify 0xfD99136A6131704e5ebF947e4A94b32EB36Db424 0x9FB308d501ef105520268F4Ccd9272D1453965Cb 0x7b67956bF4Df7d9BfdC4E82c2b59Df4B8bB7408D --network rinkeby`
- DAO: `npx hardhat verify 0x2b4fB06736553AA99C0ff3f0892d842529544D62 0xfD99136A6131704e5ebF947e4A94b32EB36Db424 0x2836eC28C32E232280F984d3980BA4e05d6BF68f 150000000000000000000 86400 --network rinkeby`


## How to stake ItPub eth liquidity tokens
```
npx hardhat stake --contract-addr 0xfD99136A6131704e5ebF947e4A94b32EB36Db424 --token-addr 0xf1C80DE1bb14aC337808A83b0e56A53425D72B67 --token-amount 0.0000000001 --network rinkeby
```

## How to unstake
```
npx hardhat unstake --contract-addr 0xfD99136A6131704e5ebF947e4A94b32EB36Db424 --network rinkeby
```

## How to claim
```
npx hardhat claim --contract-addr 0xfD99136A6131704e5ebF947e4A94b32EB36Db424 --network rinkeby

```

## How to add proposal
```
npx hardhat addProposal --contract-addr 0x2b4fB06736553AA99C0ff3f0892d842529544D62 --call-data 0xa9059cbb00000000000000000000000015d34aaf54267db7d7c367839aaf71a00a2c6a650000000000000000000000000000000000000000000000000de0b6b3a7640000 --recipient 0x9dBdFcdf8D713011B4E1C17900EA9F1bcf46B941 --description test --network ropsten

```

## How to vote
```
npx hardhat vote --contract-addr 0x2b4fB06736553AA99C0ff3f0892d842529544D62 --proposal-id 0 --against false --network rinkeby

```

## How to finish proposal

```
npx hardhat finishProposal --contract-addr 0x2b4fB06736553AA99C0ff3f0892d842529544D62 --proposal-id 0 --network rinkeby

```

## How to register on ACDM Platform

```
npx hardhat register --contract-addr 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c --referrer-id 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec --network rinkeby

```

## How to start sale round

```
npx hardhat startSaleRound --contract-addr 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c --network rinkeby

```

## How to buy ACDM in sale round

```
npx hardhat buyAcdm --contract-addr 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c --amount-to-buy 0.1 --network rinkeby

```

## How to start trade round

```
npx hardhat startTradeRound --contract-addr 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c --network rinkeby

```

## How to add order

```
npx hardhat addOrder --contract-addr 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c --token-amount 1.0 --eth-amount 0.00001 --network rinkeby

```


## How to remove order

```
npx hardhat removeOrder --contract-addr 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c --order-id 0 --network rinkeby

```

## How to redeem order

```
npx hardhat redeemOrder --contract-addr 0x48720871e91Cc4Df11747CB3b64F58A25E16d10c --order-id 0 --eth-amount 0.00001 --network rinkeby

```