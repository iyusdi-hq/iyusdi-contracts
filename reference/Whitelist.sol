// SPDX-License-Identifier: Apache-2.0-with-iyusdi-clause
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import './IyusdiAccessControl.sol';

contract Whitelist is IyusdiAccessControl {
  using Address for address;

  bool _startWhitelist;
  mapping (address => bool) _whitelist;
  mapping (address => bool) _blacklist;

  /**
    * @dev See {IERC165-supportsInterface}.
    */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IAccessControlUpgradeable).interfaceId
      || super.supportsInterface(interfaceId);
  }

  function __Whitelist_init() public {
    __IyusdiAccessControl_init();
  }

  modifier onlyWhitelist() {
    require(!_blacklist[msg.sender] && (!_startWhitelist || !Address.isContract(msg.sender) || _whitelist[msg.sender]), "!whitelist");
    _;
  }

  function stopWhitelist() onlyAdmin external {
    _startWhitelist = false;
  }

  function startWhitelist() onlyAdmin external {
    _startWhitelist = true;
  }

  function addWhitelist(address c) onlyAdmin external {
    _addWhitelist(c);
  }

  function _addWhitelist(address c) internal {
    require(c != address(0), '!contract');
    _whitelist[c] = true;
  }

  function removeWhitelist(address c) onlyAdmin external {
    _removeWhitelist(c);
  }
  
  function _removeWhitelist(address c) internal {
    require(c != address(0), '!contract');
    _whitelist[c] = false;
  }

  function _isWhitelisted(address c) internal view returns (bool){
    require(c != address(0), '!contract');
    return _whitelist[c];
  }
  
  function addBlacklist(address c) onlyAdmin external {
    _addBlacklist(c);
  }
  
  function _addBlacklist(address c) internal {
    require(c != address(0), '!contract');
    _blacklist[c] = true;
  }
  
  function removeBlacklist(address c) onlyAdmin external {
    _removeWhitelist(c);
  }

  function _removeBlacklist(address c) internal {
    require(c != address(0), '!contract');
    _blacklist[c] = false;
  }

  function _isBlacklisted(address c) internal view returns (bool) {
    require(c != address(0), '!contract');
    return _blacklist[c];
  }
  
}
