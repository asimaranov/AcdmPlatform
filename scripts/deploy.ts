import { ethers } from "hardhat";

async function main() {

  const [owner] = await ethers.getSigners();

  const ItPubTokenFactory = await ethers.getContractFactory("ItPubToken");
  const ItPubToken = await ItPubTokenFactory.deploy();

  const ACDMTokenFactory = await ethers.getContractFactory("ACDMToken");
  const ACDMToken = await ACDMTokenFactory.deploy();

  const AddLiquidityFactory = await ethers.getContractFactory("AddLiquidity");
  const AddLiquidity = await AddLiquidityFactory.deploy();

  const roundTime = 3 * 60 * 60 * 24;


  let amountEth = ethers.utils.parseEther("0.00001");
  let amountToken = ethers.utils.parseEther("1.0");

  await ItPubToken.approve(AddLiquidity.address, amountToken);

  const addLiquidityTransaction = await AddLiquidity.addLiquidityEth(
    ItPubToken.address, amountToken, {
      value: amountEth
  });

  const rc = await addLiquidityTransaction.wait();

  const [lpTokenAddress] = rc.events!.find(event => event.event === 'LPTokenAddress')!.args!;

  const StakingFactory = await ethers.getContractFactory("Staking");
  const Staking = await StakingFactory.deploy(lpTokenAddress, ItPubToken.address);

  const DAOFactory = await ethers.getContractFactory("DAO");

  const chairPerson = owner;
  const miminumQuorum = ethers.utils.parseEther("150.0");

  const debatingPeriodDuration = 24 * 60 * 60;

  const DAO = await DAOFactory.deploy(Staking.address, chairPerson.address, miminumQuorum, debatingPeriodDuration);

  const ACDMPlatformFactory = await ethers.getContractFactory("ACDMPlatform");
  const ACDMPlatform = await ACDMPlatformFactory.deploy(DAO.address, ACDMToken.address, ItPubToken.address, roundTime);


  await Staking.setDAO(DAO.address);
  await ACDMToken.setOwner(ACDMPlatform.address);
  
  console.log(`ItPubToken address: ${ItPubToken.address}, ItPubEthLiquidityToken address: ${lpTokenAddress}, ACDMToken address: ${ACDMToken.address}, Acdm platform address: ${ACDMPlatform.address}, Staking address: ${Staking.address}, DAO address: ${DAO.address}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
