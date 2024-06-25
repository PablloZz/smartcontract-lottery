import { ethers } from "hardhat";

async function enterRaffle() {
  const raffle = await ethers.getContractAt("Raffle", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
  const entranceFee = await raffle.getEntranceFee();
  await raffle.enterRaffle({ value: entranceFee });
}

enterRaffle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
