// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Ownable.sol";
import "./utils/Console.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract LGE is Ownable {
  using SafeMath for uint256;
  using Address for address;
  using SafeERC20 for IERC20;

  event LPTokenClaimed(address dst, address token, uint value);
  event LiquidityAdded(address indexed dst, address token, uint value);

  uint256 constant FUND_BASE = 10000;
  uint256 constant MIN_FUND_PCT = 1000;
  uint256 constant MAX_FUND_PCT = 5000;
  uint256 constant MIN_LGE_LENGTH = 2 hours;
  uint256 constant MAX_LGE_LENGTH = 14 days;
  uint256 constant MIN_TOKEN_PER_ETH = 1;
  uint256 constant MIN_MIN_ETH = 1 ether / 10;
  uint256 constant MAX_MIN_ETH = 2 ether;
  uint256 constant MIN_MAX_ETH = 10 ether;
  uint256 constant MAX_MAX_ETH = 2000 ether;
  uint256 constant MIN_CAP = 500 ether;
  uint256 constant MAX_CAP = 50_000 ether;
  uint256 constant PRECISION = 1e18;

  struct LGEToken {
    address owner;
    address fund;
    address token;
    uint256 fundFee;
    uint256 fundPctLiq;
    uint256 minEth;
    uint256 maxEth;
    uint256 cap;
    uint256 tokenPerEth;
    uint256 lgeLength;
    uint245 contractStartTimestamp;
    bool LGEFinished;
    uint256 LPperETHUnit;
    uint256 totalLPTokensMinted;
    uint256 totalETHContributed;
    bool LPGenerationCompleted;
    mapping (address => uint) ethContributed;
    mapping (uint256 => LGEToken)
    IUniswapV2Pair IPAIR;
    uint256 airdropTotal;
    mapping (address => uint256) registeredAirdrop;
    mapping (address => uint256) confirmedAirdrop;
  }

  IWETH Iweth;
  IUniswapV2Factory uniswapFactory;
  IUniswapV2Router02 uniswapRouterV2;
  mapping (address => LGEToken) lges;

  constructor(address owner) public Ownable(owner) {
    uniswapFactory = IUniswapV2Factory(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);
    uniswapRouterV2 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    address WETH = uniswapRouterV2.WETH();
    Iweth = IWETH(WETH);
  }

  function _hasLge(address token) internal returns (LGEToken storage lge) {
    LGEToken storage lge = lges[token];
    require(lge.fund != address(0) && lge.token == token, '!lge');
  }

  function _hasLgeOwner(address token) internal returns (LGEToken storage lge) {
    LGEToken storage lge = lges[token];
    require(lge.owner == msg.sender && lge.fund != address(0) && lge.token == token, '!lge');
  }

  function createLGE(address token, address fund) onlyOwner external {
    require(fund != address(0) && token != address(0), '!fund|!token');
    LGEToken storage lge = lges[token];
    require(lge.token == address(0), 'lge exists');
    lg.fund = fund;
    lg.token = token;
    lg.owner = mgs.sender;
  }

  function registerAirdrop(address token, uint256 total) external {
    LGEToken storage lge = _hasLGE(token);
    uint256 current = lge.registeredAirdrop[msg.sender];
    lge.registeredAirdrop[msg.sender] = total;
    lge.airdropTotal = lge.airdropTotal - current + total;
  }

  function setMinEth(address token, uint256 _minEth) external {
    require(_minEth >= MIN_MIN_ETH && _minEth <= MAX_MIN_ETH);
    LGEToken storage lge = _hasLGEOwner(token);
    lge.minEth = _minEth;
  }

  function setMaxEth(address token, uint256 _maxEth) external {
    require(_maxEth >= MIN_MAX_ETH && _maxEth <= MAX_MAX_ETH);
    LGEToken storage lge = _hasLGEOwner(token);
    lge.maxEth = _maxEth;
  }

  function setCap(address token, uint256 _cap) external {
    require(_cap >= MIN_CAP && _cap <= MAX_CAP);
    LGEToken storage lge = _hasLGEOwner(token);
    lge.cap = _cap;
  }

  function setFundPctLiq(address token, uint256 _fundPctLiq) external {
    require(_fundPctLiq == 0 || (_fundPctLiq >= MIN_FUND_PCT && _fundPctLiq <= MAX_FUND_PCT));
    LGEToken storage lge = _hasLGEOwner(token);
    fundPctLiq = _fundPctLiq;
  }

  function setTokenPerEth(address token, uint256 _tokenPerEth) external {
    require(_tokenPerEth >= MIN_TOKEN_PER_ETH, '!tokenPerEth');
    LGEToken storage lge = _hasLGEOwner(token);
    tokenPerEth = _tokenPerEth;
  }

  function setLGELength(address token, uint256 _lgeLength) external {
    require(_lgeLength >= MIN_LGE_LENGTH && _lgeLength <= MAX_LGE_LENGTH, '!lgeLength');
    LGEToken storage lge = _hasLGEOwner(token);
    lgeLength = _lgeLength;
  }

  function startLGE(address token, address token) external {
    LGEToken storage lge = _hasLGEOwner(token);
    token.contractStartTimestamp = block.timestamp;
  }

  function setLGEFinished(address token) external {
    LGEToken storage lge = _hasLGEOwner(token);
    lge.LGEFinished = true;
  }

  function lgeInProgress() public view returns (bool) {
    LGEToken storage lge = _hasLGE(token);
    if (lge.contractStartTimestamp == 0 || lge.LGEFinished) {
        return false;
    }
    return lge.contractStartTimestamp.add(lgeLength) > block.timestamp;
  }

  function emergencyRescueEth(address token, address to) external {
    require(to != address(0), '!to');
    LGEToken storage lge = _hasLGEOwner(token);
    require(block.timestamp >= lge.contractStartTimestamp.add(lgeLength).add(2 days), 'must be 2 days after end of lge');
    (bool success, ) = to.call.value(lge.totalETHContributed + lge.fundFee)("");
    require(success, "Transfer failed.");
  }

  function generateLPTokens(address token) external {
    require(lgeInProgress() == false, "LGE still in progress");
    LGEToken storage lge = _hasLGEOwner(token);
    require(lge.LPGenerationCompleted == false, "LP tokens already generated");
    uint256 total = lge.totalETHContributed; // gas

    // create pair
    address _pair = uniswapFactory.getPair(address(Iweth), token);
    if (_pair == address(0)) {
      _pair = uniswapFactory.createPair(address(Iweth), token);
    }
    IPAIR = IUniswapV2Pair(_pair);

    //Wrap eth
    Iweth.deposit{ value: total }();
    require(IERC20(address(Iweth)).balanceOf(address(this)) == total, '!weth');
    Iweth.transfer(address(IPAIR), total);

    uint256 tokenBalance = IERC20(token).balanceOf(address(this));
    IERC20(token).safeTransfer(address(IPAIR), tokenBalance);
    IPAIR.mint(address(this));
    lge.totalLPTokensMinted = IPAIR.balanceOf(address(this));
    require(lge.totalLPTokensMinted != 0 , "LP creation failed");
    (bool success, ) = lge.fund.call.value(lge.fundFee)("");
    require(success, "Transfer failed.");
    // Calculate LP tokens per eth
    lge.LPperETHUnit = lge.totalLPTokensMinted.mul(PRECISION).div(total);
    require(lge.LPperETHUnit != 0 , "LP creation failed");
    lge.LPGenerationCompleted = true;
  }

  receive() external payable {
    require(lgeInProgress(), "!LGE in progress");
    _addLiquidity();
  }

  function addLiquidity() public payable {
    require(lgeInProgress(), "!LGE in progress");
    _addLiquidity();
  }

  function _addLiquidity(address token) internal {
    LGEToken storage lge = _hasLGE(token);
    require(msg.value >= lge.minEth, '!minEth');
    uint256 fee = msg.value.mul(lge.fundPctLiq).div(FUND_BASE);
    lge.fundFee = lge.fundFee.add(fee);
    uint256 contrib = msg.value.sub(fee, '!fee');
    lge.ethContributed[msg.sender] += contrib;
    require(lge.ethContributed[msg.sender] <= lge.maxEth);
    lge.totalETHContributed = lge.totalETHContributed.add(contrib);
    require(lge.totalETHContributed <= lge.cap, '!cap');
    uint256 amount = contrib * tokenPerEth;
    if (amount > 0) {
      IERC20(token).safeTransferFrom(lge.fund, address(this), amount);
    }
    emit LiquidityAdded(msg.sender, token, msg.value);
  }

  function claimLPTokens(address token) public {
    LGEToken storage lge = _hasLGE(token);
    require(lge.LPGenerationCompleted, "!LP generated");
    uint256 airdrop = lge.registeredAirdrop[msg.sender]; //gas
    lge.registeredAirdrop[msg.sender] = 0;
    uint256 contributed = lge.ethContributed[msg.sender]; // gas
    lge.ethContributed[msg.sender] = 0;
    require(contributed > 0 , "Nothing to claim, move along");
    uint256 fee = airdrop.mul(lge.fundPctLiq).div(FUND_BASE);
    if (contributed >= airdrop - fee) {
      lge.confirmedAirdrop[msg.sender] = contributed;
    }
    uint256 amountLPToTransfer = contributed.mul(lge.LPperETHUnit).div(PRECISION);
    lge.IPAIR.transfer(msg.sender, amountLPToTransfer);
    emit LPTokenClaimed(msg.sender, token, amountLPToTransfer);
  }

}
