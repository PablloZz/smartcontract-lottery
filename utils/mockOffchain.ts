import { type Contract, ethers } from "ethers";
import { type Raffle } from "typechain-types";

async function mockKeepers(raffle: Contract & Raffle) {
  const checkData = ethers.keccak256(ethers.toUtf8Bytes(""));
  console.log(checkData);
  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(checkData);

  if (upkeepNeeded) {
    const transactionResponse = await raffle.performUpkeep(checkData);
    const transactionReceipt = await transactionResponse.wait(1);
    const requestId)
    console.log(first)
  }
}

async function mockKeepers() {
  if (upkeepNeeded) {
    const tx = await raffle.performUpkeep(checkData);
    const txReceipt = await tx.wait(1);
    const requestId = txReceipt.events[1].args.requestId;
    console.log(`Performed upkeep with RequestId: ${requestId}`);
    if (network.config.chainId == 31337) {
      await mockVrf(requestId, raffle);
    }
  } else {
    console.log("No upkeep needed!");
  }
}

async function mockVrf(requestId, raffle) {
  console.log("We on a local network? Ok let's pretend...");
  const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address);
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
