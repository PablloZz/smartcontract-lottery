import { ethers, ignition, network } from "hardhat";
import { VRF_SUB_FUND_AMOUNT, developmentChains, networkConfig } from "../../helper-hardhat.config";
import RaffleModule from "../../ignition/modules/Raffle";
import VrfCoordinatorV2PlusModule from "../../ignition/modules/Mocks";
import { type Contract } from "ethers";
import { type VRFCoordinatorV2_5Mock, type Raffle } from "../../typechain-types";
import { assert, expect } from "chai";

Number(network.config.chainId) !== 31337
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      const chainNetworkConfig = networkConfig[network.config.chainId!];
      let deployer: string;
      let entranceFee: bigint;
      let interval: bigint;
      let vrfCoordinatorV2PlusMock: VRFCoordinatorV2_5Mock & Contract;
      let raffle: Contract & Raffle;
      let subscriptionId: string = "";

      beforeEach(async function () {
        deployer = (await ethers.getSigners())[0].address;
        vrfCoordinatorV2PlusMock = (await ignition.deploy(VrfCoordinatorV2PlusModule))
          .vrfCoordinatorV2PlusMock as unknown as VRFCoordinatorV2_5Mock & Contract;

        const vrfCoordinatorV2PlusAddress = await vrfCoordinatorV2PlusMock.getAddress();
        const transactionResponse = await vrfCoordinatorV2PlusMock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = (transactionReceipt as any).logs[0].args[0];
        await vrfCoordinatorV2PlusMock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);

        raffle = (
          await ignition.deploy(RaffleModule, {
            parameters: {
              RaffleModule: {
                vrfCoordinatorV2PlusAddress,
                subscriptionId: subscriptionId.toString(),
              },
            },
          })
        ).raffle as unknown as Raffle & Contract;

        const raffleAddress = await raffle.getAddress();
        entranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
        vrfCoordinatorV2PlusMock.addConsumer(subscriptionId, raffleAddress);
      });

      describe("constructor", function () {
        it("Initializes the raffle correctly", async function () {
          // Ideally we make our tests have just 1 assert per "it"
          const raffleState = await raffle.getRaffleState();
          const interval = await raffle.getInterval();
          const entranceFee = await raffle.getEntranceFee();
          assert.equal(raffleState.toString(), "0");
          assert.equal(interval.toString(), chainNetworkConfig.interval);
          assert.equal(entranceFee.toString(), chainNetworkConfig.entranceFee.toString());
        });
      });

      describe("enterRaffle", function () {
        it("Reverts when you don't pay enough", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
            raffle,
            "Raffle__NotEnoughETHEntered",
          );
        });

        it("Records players when they enter", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });

        it("Emits event on enter", async function () {
          await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(raffle, "RaffleEnter");
        });

        it("Doesn't allow entrance when raffle is calculating", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
          await network.provider.send("evm_mine", []);
          // We pretend to be a Chainlink Keeper
          await raffle.performUpkeep("0x");
          await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWithCustomError(
            raffle,
            "Raffle__NotOpen",
          );
        });
      });

      describe("checkUpkeep", function () {
        it("Returns false if people haven't sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });

        it("Returns false if raffle isn't open", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x");
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });

        it("Returns false if enough time hasn't passed", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [Number(interval) - 2]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });

        it("Returns true if enough time has passed, has players, eth, and is open", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("It can only run if checkUpkeep is true", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep("0x");
          assert(tx);
        });

        it("Reverts when checkUpkeep is false", async function () {
          await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
            raffle,
            "Raffle__UpkeepNotNeeded",
          );
        });

        it("Updates the raffle state, emits an event, and calls the vrf coordinator", async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
          await network.provider.send("evm_mine", []);
          const transactionResponse = await raffle.performUpkeep("0x");
          const transactionReceipt = await transactionResponse.wait(1);
          const requestId = (transactionReceipt as any).logs[1].args[0];
          const raffleState = await raffle.getRaffleState();
          assert(Number(requestId) > 0);
          assert(String(raffleState) === "1");
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
          await network.provider.send("evm_mine", []);
        });

        it("Can only be called after performUpkeep", async function () {
          const raffleAddress = await raffle.getAddress();
          await expect(
            vrfCoordinatorV2PlusMock.fulfillRandomWords(0, raffleAddress),
          ).to.be.revertedWithCustomError(vrfCoordinatorV2PlusMock, "InvalidRequest");
          await expect(
            vrfCoordinatorV2PlusMock.fulfillRandomWords(1, raffleAddress),
          ).to.be.revertedWithCustomError(vrfCoordinatorV2PlusMock, "InvalidRequest");
        });

        it("Picks a winner, resets the lottery, and sends money", async function () {
          const additionalEntrants = 3;
          const startingAccountIndex = 1;
          const accounts = await ethers.getSigners();
          for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
            const accountConnectedRaffle = raffle.connect(accounts[i]) as unknown as Raffle &
              Contract;

            await accountConnectedRaffle.enterRaffle({ value: entranceFee });
          }

          const startingTimestamp = await raffle.getLatestTimestamp();
          // performUpkeep (mock being Chainlink Keepers)
          // fulfillRandomWords (mock being the Chainlink VRF)
          // We will have to wait for the fulfillRandomWords to be called
          await new Promise<void>(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const endingTimestamp = await raffle.getLatestTimestamp();
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                const winnerEndingBalance = await accounts[1].provider.getBalance(accounts[1]);
                assert.equal(String(numberOfPlayers), "0");
                assert.equal(String(raffleState), "0");
                assert(endingTimestamp > startingTimestamp);

                assert.equal(
                  String(winnerEndingBalance),
                  String(
                    winnerStartingBalance + entranceFee * BigInt(additionalEntrants) + entranceFee,
                  ),
                );
              } catch (error) {
                reject(error);
              }
              resolve();
            });

            // Setting up the listener
            // Below, we will fire the event, and the listener will pick it up, and resolve
            const transactionResponse = await raffle.performUpkeep("0x");
            const transactionReceipt = await transactionResponse.wait(1);
            const raffleAddress = await raffle.getAddress();
            const winnerStartingBalance = await accounts[1].provider.getBalance(
              accounts[1].address,
            );

            await vrfCoordinatorV2PlusMock.fulfillRandomWords(
              (transactionReceipt as any).logs[1].args.requestId,
              raffleAddress,
            );
          });
        });
      });
    });
