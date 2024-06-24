import { ethers, network } from "hardhat";
import { type VRFCoordinatorV2_5Mock, type Raffle } from "typechain-types";

async function mockKeepers() {
  if (network.config.chainId === 31337 || network.config.chainId === 1337) {
    const raffle = (await ethers.getContractAt(
      "Raffle",
      "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    )) as Raffle;

    const checkData = ethers.keccak256(ethers.toUtf8Bytes(""));
    const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");

    if (upkeepNeeded) {
      const transactionResponse = await raffle.performUpkeep(checkData);
      const transactionReceipt = await transactionResponse.wait(1);
      const requestId = (transactionReceipt?.logs as any)[1].requestId;
      console.log(`Performed upkeep with RequestId: ${requestId}`);
      await mockVrf(requestId, raffle);
    } else {
      console.log("No upkeep needed");
    }
  }
}

async function mockVrf(requestId: number, raffle: Raffle) {
  console.log("We on a local network? Ok let's pretend...");
  const vrfCoordinatorV2Mock = (await ethers.getContractAt(
    "VRFCoordinatorV2_5Mock",
    "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  )) as VRFCoordinatorV2_5Mock;

  const raffleAddress = await raffle.getAddress();
  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffleAddress);
  console.log("Responded!");
  const recentWinner = await raffle.getRecentWinner();
  console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
