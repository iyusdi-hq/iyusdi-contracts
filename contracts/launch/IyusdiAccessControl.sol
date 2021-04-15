// SPDX-License-Identifier: Apache-2.0-with-puul-exception
pragma solidity >=0.8.0;
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract IyusdiAccessControl is AccessControlUpgradeable {

  bytes32 constant ROLE_MINTER = keccak256("ROLE_MINTER");
  bytes32 constant ROLE_TRANSFER = keccak256("ROLE_TRANSFER");

  function __IyusdiAccessControl_init() public {
    __AccessControl_init();
  }

  modifier onlyMinter() {
    require(hasRole(ROLE_MINTER, msg.sender), "!minter");
    _;
  }

  modifier onlyTransfer() {
    require(hasRole(ROLE_TRANSFER, msg.sender), "!transfer");
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IAccessControlUpgradeable).interfaceId
      || super.supportsInterface(interfaceId);
  }

}
