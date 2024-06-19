import { ethers } from "hardhat";

async function enterRaffle() {
  const raffle = await ethers.getContractAt("Raffle", "0xa62fA7D5Ca193EC3B5896397C99Cf435E96Ea213");
  const entranceFee = await raffle.getEntranceFee();
  await raffle.enterRaffle({ value: entranceFee });
}

enterRaffle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
