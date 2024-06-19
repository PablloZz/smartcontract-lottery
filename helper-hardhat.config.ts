import { ethers } from "ethers";

type NetworkConfigItem = {
  name: string;
  vrfCoordinatorV2Plus: string;
  entranceFee: bigint;
  gasLane: string;
  subscriptionId: string;
  callbackGasLimit: string;
  interval: string;
};

type NetworkConfigInfo = {
  [key: number]: NetworkConfigItem;
};

const networkConfig: NetworkConfigInfo = {
  31337: {
    name: "localhost",
    entranceFee: ethers.parseEther("0.01"),
    vrfCoordinatorV2Plus: "",
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subscriptionId: "",
    callbackGasLimit: "500000",
    interval: "30",
  },
  11155111: {
    name: "sepolia",
    entranceFee: ethers.parseEther("0.01"),
    vrfCoordinatorV2Plus: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subscriptionId: "17764036186583325586525437155678008358772205049493993790544528906682153407932",
    callbackGasLimit: "500000",
    interval: "30",
  },
};

const developmentChains = ["hardhat", "localhost"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
const VRF_SUB_FUND_AMOUNT = ethers.parseEther("25");

export { VERIFICATION_BLOCK_CONFIRMATIONS, VRF_SUB_FUND_AMOUNT, developmentChains, networkConfig };
