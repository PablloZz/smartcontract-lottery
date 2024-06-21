import { ethers, network } from "hardhat";
import { type VRFCoordinatorV2_5Mock, type Raffle } from "typechain-types";

async function mockKeepers() {
  if (network.config.chainId === 31337) {
    const raffle = (await ethers.getContractAt(
      "Raffle",
      "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
    )) as Raffle;

    const checkData = ethers.keccak256(ethers.toUtf8Bytes(""));
    const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(checkData);

    if (upkeepNeeded) {
      const transactionResponse = await raffle.performUpkeep(checkData);
      const transactionReceipt = await transactionResponse.wait(1);
      const requestId = (transactionReceipt?.logs as any)[1].requestId;
      console.log(`Performed upkeep with RequestId: ${requestId}`);
      await mockVrf(requestId, raffle);
    } else {
      console.log("NO upkeep needed");
    }
  }
}

async function mockVrf(requestId: number, raffle: Raffle) {
  console.log("We on a local network? Ok let's pretend...");
  const vrfCoordinatorV2Mock = (await ethers.getContractAt(
    "VRFCoordinatorV2_5Mock",
    "0x0165878A594ca255338adfa4d48449f69242Eb8F",
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
