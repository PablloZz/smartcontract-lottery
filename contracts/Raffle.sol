// Raffle
// Enter the lottery (paying some amount)
// Pick a random winner (verifialy random)
// Winner to be selected every X minutes -> completely automate
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink Keepers)

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A sample Raffle Contract
 * @author Pavlo Zalutskiy
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements Chainlink VRF Version 2 Plus and Chainlink Automation
 */
contract Raffle is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
  /* Type Declarations */
  enum RaffleState {
    OPEN,
    CALCULATING
  } // uint256 0 = OPEN, 1 = CALCULATING

  /* State Variables */
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;
  bytes32 private immutable i_gasLane;
  uint256 private immutable i_subscriptionId;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;
  bool private constant ENABLE_NATIVE_PAYMENT = true;

  /* Lottery Variables */
  address private s_recentWinner;
  RaffleState private s_raffleState;
  uint256 private s_lastTimestamp;
  uint256 private immutable i_interval;

  /* Events */
  event RaffleEnter(address indexed player);
  event RequestedRaffleWinner(uint256 indexed requestId);
  event WinnerPicked(address indexed winner);

  /* Functions */
  constructor(
    address vrfCoordinatorV2Plus,
    uint256 entranceFee,
    bytes32 gasLane,
    uint256 subscriptionId,
    uint32 callbackGasLimit,
    uint256 interval
  ) VRFConsumerBaseV2Plus(vrfCoordinatorV2Plus) {
    i_entranceFee = entranceFee;
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    s_raffleState = RaffleState.OPEN;
    s_lastTimestamp = block.timestamp;
    i_interval = interval;
  }

  function enterRaffle() public payable {
    if (msg.value < i_entranceFee) revert Raffle__NotEnoughETHEntered();
    if (s_raffleState != RaffleState.OPEN) revert Raffle__NotOpen();

    s_players.push(payable(msg.sender));
    // Emit an event when we update a dynamic array or mapping
    // Name events with the function name reversed
    emit RaffleEnter(msg.sender);
  }

  /**
   * @dev This is the functin that the Chainlink Keeper nodes call.
   * They look for the "upkeepNeeded" to return true.
   * The following should be true in order to return true:
   * 1. Our time interval should have passed;
   * 2. The lottery should have at least 1 player, and have some ETH;
   * 3. Our subscription is funded with LINK;
   * 4. The lottery should be in an "open" state.
   */
  function checkUpkeep(
    bytes memory /* checkData */
  ) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
    bool isOpen = (s_raffleState == RaffleState.OPEN);
    bool timePassed = ((block.timestamp - s_lastTimestamp) > i_interval);
    bool hasPlayers = (s_players.length > 0);
    bool hasBalance = (address(this).balance > 0);
    upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
  }

  function performUpkeep(bytes calldata /* performData */) external override {
    // Request the random number
    (bool upkeepNeeded, ) = checkUpkeep("");

    if (!upkeepNeeded) {
      revert Raffle__UpkeepNotNeeded(
        address(this).balance,
        s_players.length,
        uint256(s_raffleState)
      );
    }

    s_raffleState = RaffleState.CALCULATING;
    uint256 requestId = s_vrfCoordinator.requestRandomWords(
      VRFV2PlusClient.RandomWordsRequest({
        keyHash: i_gasLane,
        subId: i_subscriptionId,
        requestConfirmations: REQUEST_CONFIRMATIONS,
        callbackGasLimit: i_callbackGasLimit,
        numWords: NUM_WORDS,
        extraArgs: VRFV2PlusClient._argsToBytes(
          VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
        )
      })
    );

    // This is redundant!!!
    emit RequestedRaffleWinner(requestId);
  }

  function fulfillRandomWords(
    uint256 /* requestId */,
    uint256[] calldata randomWords
  ) internal override {
    uint256 indexOfWinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfWinner];
    s_recentWinner = recentWinner;
    s_raffleState = RaffleState.OPEN;
    s_players = new address payable[](0);
    s_lastTimestamp = block.timestamp;
    (bool success, ) = recentWinner.call{value: address(this).balance}("");

    if (!success) revert Raffle__TransferFailed();

    emit WinnerPicked(recentWinner);
  }

  /* View / Pure Functions */

  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getRecentWinner() public view returns (address) {
    return s_recentWinner;
  }

  function getRaffleState() public view returns (RaffleState) {
    return s_raffleState;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getLatestTimestamp() public view returns (uint256) {
    return s_lastTimestamp;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getNumWords() public pure returns (uint256) {
    return NUM_WORDS;
  }

  function getRequestConfirmations() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }
}
