import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { type IgnitionModuleResult } from "@nomicfoundation/ignition-core";
import { network } from "hardhat";
import { networkConfig } from "../../helper-hardhat.config";

export default buildModule<"RaffleModule", "Raffle", IgnitionModuleResult<"Raffle">>(
  "RaffleModule",
  (m) => {
    const deployer = m.getAccount(0);
    const vrfCoordinatorV2PlusAddress = m.getParameter("vrfCoordinatorV2PlusAddress");
    const subscriptionId = m.getParameter("subscriptionId");
    const { entranceFee, gasLane, callbackGasLimit, interval } =
      networkConfig[network.config.chainId!];
      
    const args = [
      vrfCoordinatorV2PlusAddress,
      entranceFee,
      gasLane,
      subscriptionId,
      callbackGasLimit,
      interval,
    ];

    const raffle = m.contract("Raffle", args, { from: deployer });
    console.log("Raffle Deployed!");
    console.log("------------------------------------");

    return { raffle };
  },
);
