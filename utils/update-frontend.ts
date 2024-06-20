import { ethers, network } from "hardhat";
import { vars } from "hardhat/config";
import fs from "node:fs";

const FRONTEND_ADDRESSES_FILE_PATH =
  "../hardhat-smartcontract-lottery-frontend/src/constants/contractAddress.json";
const FRONTEND_ABI_FILE_PATH = "../hardhat-smartcontract-lottery-frontend/src/constants/abi.json";

async function updateFrontend(contractName: string, address: string) {
  if (vars.get("UPDATE_FRONTEND")) {
    console.log("Updating front end...");
    updateContractAddresses(address);
    updateAbi(contractName, address);
  }
}

async function updateAbi(contractName: string, address: string) {
  const raffle = await ethers.getContractAt(contractName, address);
  fs.writeFileSync(FRONTEND_ABI_FILE_PATH, raffle.interface.formatJson());
}

async function updateContractAddresses(address: string) {
  const chainId = String(network.config.chainId);
  const currentAddresses = JSON.parse(fs.readFileSync(FRONTEND_ADDRESSES_FILE_PATH, "utf8"));

  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(address)) {
      currentAddresses[chainId].push(address);
    }
  } else {
    currentAddresses[chainId] = [address];
  }

  fs.writeFileSync(FRONTEND_ADDRESSES_FILE_PATH, JSON.stringify(currentAddresses));
}

export { updateFrontend };
