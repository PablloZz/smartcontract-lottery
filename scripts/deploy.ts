import { ignition, network } from "hardhat";
import VrfCoordinatorV2PlusModule from "../ignition/modules/Mocks";
import RaffleModule from "../ignition/modules/Raffle";
import { VRF_SUB_FUND_AMOUNT, developmentChains, networkConfig } from "../helper-hardhat.config";
import { verify } from "../utils/verify";
import { vars } from "hardhat/config";
import { updateFrontend } from "../utils/update-frontend";

async function main() {
  const { chainId } = network.config;
  const chainNetworkConfig = networkConfig[chainId!];
  let vrfCoordinatorV2PlusAddress: string;
  let subscriptionId: string = "";
  let vrfCoordinatorV2PlusMock;

  if (Number(chainId) === 31337) {
    vrfCoordinatorV2PlusMock = (await ignition.deploy(VrfCoordinatorV2PlusModule))
      .vrfCoordinatorV2PlusMock;

    vrfCoordinatorV2PlusAddress = await vrfCoordinatorV2PlusMock.getAddress();
    const transactionResponse = await vrfCoordinatorV2PlusMock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.logs[0].args[0].toString();
    await vrfCoordinatorV2PlusMock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  } else {
    vrfCoordinatorV2PlusAddress = chainNetworkConfig.vrfCoordinatorV2Plus;
    subscriptionId = chainNetworkConfig.subscriptionId;
  }

  const { raffle } = await ignition.deploy(RaffleModule, {
    parameters: {
      RaffleModule: { vrfCoordinatorV2PlusAddress, subscriptionId },
    },
  });

  const raffleAddress = await raffle.getAddress();

  if (Number(chainId) === 31337) {
    vrfCoordinatorV2PlusMock?.addConsumer(subscriptionId, raffleAddress);
  }

  if (!developmentChains.includes(network.name) && vars.get("ETHERSCAN_API_KEY")) {
    const { callbackGasLimit, entranceFee, gasLane, interval } = chainNetworkConfig;
    const contractArguments = [
      vrfCoordinatorV2PlusAddress,
      entranceFee,
      gasLane,
      subscriptionId,
      callbackGasLimit,
      interval,
    ];

    await verify(raffleAddress, contractArguments);
  }

  updateFrontend("Raffle", raffleAddress);
  console.log("------------------------------------");
}

main().catch(console.error);
