// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IyusdiToken is ERC20 {
  uint256 constant LAUNCH_FUND = 5_000_000 ether;
  uint256 constant FOUNDERS_FUND = 15_000_000 ether;
  uint256 constant COMMUNITY_FUND = 80_000_000 ether;

  constructor (string memory name, string memory symbol, address launchFund, address foundersFund, address communityFund ) ERC20(name, symbol) {
    _mint(launchFund, LAUNCH_FUND);
    _mint(foundersFund, FOUNDERS_FUND);
    _mint(communityFund, COMMUNITY_FUND);
  }

}
