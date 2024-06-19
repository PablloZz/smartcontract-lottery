import { ethers, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { type Contract } from "ethers";
import { type Raffle } from "../../typechain-types";
import { assert, expect } from "chai";

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", function () {
      let deployer = "";
      let raffle: Contract & Raffle;
      let entranceFee: bigint;

      beforeEach(async function () {
        deployer = (await ethers.getSigners())[0].address;
        raffle = (await ethers.getContractAt(
          "Raffle",
          "0xa62fA7D5Ca193EC3B5896397C99Cf435E96Ea213",
        )) as unknown as Raffle & Contract;

        entranceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it("Works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
          // Enter the raffle
          const startingTimestamp = await raffle.getLatestTimestamp();
          await new Promise<void>(async (resolve, reject) => {
            // Setup listener before we enter the raffle
            // Just in case the blockchain moves really fast
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerEndingBalance = await (
                  await ethers.getSigners()
                )[0].provider.getBalance(deployer);

                const endingTimestamp = await raffle.getLatestTimestamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner, deployer);
                assert.equal(String(raffleState), String(0));
                assert.equal(
                  String(winnerEndingBalance),
                  String(winnerStartingBalance + entranceFee),
                );

                assert(endingTimestamp > startingTimestamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });

            // Then entering the raffle
            const transaction = await raffle.enterRaffle({ value: entranceFee });
            await transaction.wait(1);
            const winnerStartingBalance = await (
              await ethers.getSigners()
            )[0].provider.getBalance(deployer);
          });
        });
      });
    });
