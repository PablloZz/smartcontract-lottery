import "@nomiclabs/hardhat-waffle";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "tsconfig-paths/register";
import "dotenv/config";
import { type HardhatUserConfig } from "hardhat/types";

/** @type import('hardhat/config').HardhatUserConfig */
const config: HardhatUserConfig = {
  solidity: "0.8.24",
};

export default config;
