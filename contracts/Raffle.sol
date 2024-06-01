// Raffle
// Enter the lottery (paying some amount)
// Pick a random winner (verifialy random)
// Winner to be selected every X minutes -> completely automate
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink Keepers)

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";

error Raffle__NotEnoughETHEntered();

contract Raffle is VRFConsumerBaseV2Plus {
  /* State Variables */
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;

  /* Events */
  event RaffleEnter(address indexed player);

  constructor(
    address vrfCoordinatorV2Plus,
    uint256 entranceFee
  ) VRFConsumerBaseV2Plus(vrfCoordinatorV2Plus) {
    i_entranceFee = entranceFee;
  }

  function enterRaffle() public payable {
    if (msg.value < i_entranceFee) revert Raffle__NotEnoughETHEntered();

    s_players.push(payable(msg.sender));
    // Emit an event when we update a dynamic array or mapping
    // Name events with the function name reversed
    emit RaffleEnter(msg.sender);
  }

  function requestRandomWinner() external {
    // Request the random number
    // Once we get it, do something with it
    // 2 transaction process
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] calldata randomWords
  ) internal override {}

  /* View / Pure Functions */
  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getPlayers(uint256 index) public view returns (address) {
    return s_players[index];
  }
}
