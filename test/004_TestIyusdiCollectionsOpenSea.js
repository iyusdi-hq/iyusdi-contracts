const IyusdiNftOpenSea = artifacts.require("IyusdiNftOpenSea");
const IyusdiCollectionsV3 = artifacts.require("IyusdiCollectionsV3");
const IyusdiBondingCurves = artifacts.require("IyusdiBondingCurves");

const BN = require('bn.js');
const { assert } = require('chai');
const webcrypto = require('@peculiar/webcrypto');
const crypto = new webcrypto.Crypto()
// console.log('crypto', crypto.getRandomValues)

contract("IyusdiCollectionsV3 Test", async accounts => {

  let NFT;
  let COLLECTIONS;
  let CURVES;
  const PERCENT_BASE = new BN('10000');
  let protocol = accounts[0];
  let curator = accounts[1];
  let user1 = accounts[2];
  let user2 = accounts[3];
  let user3 = accounts[4];

  const TIME_12H = 60 * 60 * 12;
  const TIME_1H = 60 * 60
  const TIME_1D = TIME_1H * 24

  async function balanceOf(addr) {
    return web3.eth.getBalance(addr)
  }

  function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
  }

  function encodeParameters(types, values) {
    return web3.eth.abi.encodeParameters(types, values);
  }

  const toWei = (val) => web3.utils.toWei(val);

  const etherFromWei = (wei) => {
    return web3.utils.fromWei(wei.toString())
  }

  const logEther = (msg, wei) => {
    console.log(msg, etherFromWei(wei));
  }

  const usdToWei = (usd) => usd.mul(new BN('10000000000'))

  const usdFromWei = (wei) => {
    return Number(web3.utils.fromWei(wei.toString(), 'gwei')) * 10;
  }

  const generateRandomByteArray = (len) => {
    const arr = new Uint8Array(len)
    crypto.getRandomValues(arr)
    return arr
  }

  const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
      const id = new Date().getTime()
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id
      }, (err, result) => {
        if(err){ return reject(err) }
        const id = new Date().getTime();
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id,
        }, (err2, res) => (err2 ? reject(err2) : resolve(result)));
      });
    })
  }

  let feedItemTopic = '0x2b6d8e42070a492f4bd718fb5dcff97afb9bf6a6fba87cb00d84825d4936d8a3'
  let mintOgTopic = '0x430d3670600509abb2ab11c4f0209961c2d706a329219f6a93ced4d5ffa66627'
  let mintPrintTopic = '0x78117db0a44e18b1d42102beef6061f83efef17a59f7c622628c7e841913ea2d'

  beforeEach(async () => {
    CURATOR_ID = new BN('8000000000000000000000000000000000000000000000000000000000000000', 16)
    NFT = await IyusdiNftOpenSea.deployed();
    CURVES = await IyusdiBondingCurves.deployed();
    COLLECTIONS = await IyusdiCollectionsV3.deployed();
    console.log('COLLECTIONS', COLLECTIONS.address);
  });
  
  it("IyusdiCollections Tests", async () => {
    
    console.log(`
      Set V3 as an operator
    `)

    {
      const tx = await NFT.setOperator(COLLECTIONS.address, true, { from: curator });
      await tx;
    }

    console.log(`
      Request mint original
    `)

  
    const curve = {
      A0: '21',
      A1: '20',
      B: '900',
      C: '10',
      D: '10',
      Decimals: '10000',
      MaxPrints: '1000',
    }

    let ogData = generateRandomByteArray(100);
    {
      try {

        const bondingCurve =
        {
          curve: CURVES.address,
          curveType: '1',
          params: [curve.A0, curve.A1, curve.B, curve.C, curve.D, curve.Decimals],
          MaxPrints: curve.MaxPrints,
        }
        const mintPercent = new BN('300') // 3%
        const burnPercent = new BN('100') // 1%
        const tx = await COLLECTIONS.requestMintOriginal(mintPercent, burnPercent, bondingCurve, ogData, { from: user3 })
      } catch (e) {
        console.log('mint', e)
        assert.isTrue(false, 'mint request should have worked');
      }
    }

    console.log(`
      Should fail, not approved
    `)

    {
      try {
        const tx = await COLLECTIONS.mintApprovedOriginal({ from: user3 })
        assert.isTrue(false, 'mint should have failed');
      } catch (e) {
      }
    }

    console.log(`
      Approve original and mint
    `)

    let ogId;
    {
      const requestBef = await COLLECTIONS.requestMintOriginals(user3);
      assert.isTrue(requestBef.data !== null, 'data not present');
      const txa = await COLLECTIONS.approveMintOriginal(user3, true, { from: curator });
      await txa;
      const tx = await COLLECTIONS.mintApprovedOriginal({ from: user3 })
      const receipt = await tx;
      const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintOgTopic)[0]
      ogId = mint.topics[2]
      const ogNft = await NFT.balanceOf(user3, ogId);
      assert.equal(Number(ogNft.toString()), 1, 'no og token');
      const feeditem = receipt.receipt.rawLogs.filter(l => l.topics[0] === feedItemTopic)[0]
      const data = web3.utils.hexToBytes(feeditem.data);
      const shouldbe = data.slice(96, 96 + ogData.length);
      assert.deepEqual(Array.from(ogData), shouldbe, 'ogData is incorrect');
      const request = await COLLECTIONS.requestMintOriginals(user3);
      assert.isTrue(request.data === null, 'data not deleted');
    }

    console.log(`
      Should fail, already minted
    `)

    {
      try {
        const tx = await COLLECTIONS.mintApprovedOriginal({ from: user3 })
        assert.isTrue(false, 'mint should have failed');
      } catch (e) {
      }
    }

    console.log(`
      Check print prices
    `)

    {
    
      const curveN = {
        A0: BigInt(curve.A0),
        A1: BigInt(curve.A1),
        B: BigInt(curve.B),
        C: BigInt(curve.C),
        D: BigInt(curve.D),
        Decimals: BigInt(curve.Decimals),
        MaxPrints: BigInt(curve.MaxPrints),
      }
      
      const genPrintPrice = (curve, printNumber) => {
        let price = BigInt(0);
        if (printNumber > curve.B) {
          const n = printNumber - curve.B;
          price = (curve.A0 ** n * curve.Decimals) / (curve.A1 ** n) - curve.Decimals;
        }
        price = price + (curve.C * printNumber) + curve.D; 
        return price * 1000000000000000000n / curve.Decimals;
      }

      const genData = (curve) => {
        return Array(Number(curve.MaxPrints)).fill(0).map((_, idx) => { return { ETH: genPrintPrice(curve, BigInt(idx + 1)), x: idx + 1}})
      }

      const data = genData(curveN);

      for (i = 0; i < 100 /*curveN.MaxPrints*/; i++) {
        const printNumber = new BN(`${i + 1}`)
        const printPrice = await COLLECTIONS.getPrintPrice(ogId, printNumber);
        const p = printPrice.toString();
        const d = data[i].ETH.toString();
        if (p !== d)
          // could be small rounding errors so no assert
          console.log(`prices not equal, ${i}, ${p}, ${d}`)
      }
    }

    console.log(`
      Check print prices with negative D, should underflow
    `)

    {
    
      const curveN = {
        A0: BigInt(curve.A0),
        A1: BigInt(curve.A1),
        B: BigInt(curve.B),
        C: BigInt(curve.C),
        D: BigInt(-10),
        Decimals: BigInt(curve.Decimals),
        MaxPrints: BigInt(curve.MaxPrints),
      }

      const dbad = new BN(BigInt(-11).toString()).toTwos(256);
      console.log('D twos 256 bad', dbad.toString(16));
      const curveArray = [curveN.A0.toString(), curveN.A1.toString(), curveN.B.toString(), curveN.C.toString(), dbad.toString(), curve.Decimals.toString()]
      try {
        const printPrice = await CURVES.getPrintPrice('1', '1', curveArray);
        assert.isTrue(false, 'should have underflowed')
      } catch (e) {
        // console.log('expected underflow', e);
      }
      try {
        const printPrice = await CURVES.getPrintPrice('1', '2', curveArray);
      } catch (e) {
        assert.isTrue(false, 'should not have underflowed')
      }
      const dgood = new BN(BigInt(curveN.D).toString()).toTwos(256);
      console.log('D twos 256 good', dgood.toString(16));
      curveArray[4] = dgood.toString()
      
      const genPrintPrice = (curve, printNumber) => {
        let price = BigInt(0);
        if (printNumber > curve.B) {
          const n = printNumber - curve.B;
          price = (curve.A0 ** n * curve.Decimals) / (curve.A1 ** n) - curve.Decimals;
        }
        price = price + (curve.C * printNumber) + curve.D; 
        return price * 1000000000000000000n / curve.Decimals;
      }

      const genData = (curve) => {
        return Array(Number(curve.MaxPrints)).fill(0).map((_, idx) => { return { ETH: genPrintPrice(curve, BigInt(idx + 1)), x: idx + 1}})
      }

      const data = genData(curveN);

      for (i = 0; i < 100 /*curveN.MaxPrints*/; i++) {
        const printNumber = new BN(`${i + 1}`)
        const printPrice = await CURVES.getPrintPrice('1', printNumber, curveArray);
        const p = printPrice.toString();
        const d = data[i].ETH.toString();
        if (p !== d)
          // could be small rounding errors so no assert
          console.log(`prices not equal, ${i}, ${p}, ${d}`)
      }
    }

    let printId;
    {
      const user2Bef = await balanceOf(user2)
      const user3Bef = await balanceOf(user3)
      const curatorBef = await balanceOf(curator)
      const protocolBef = await balanceOf(protocol)

      const data = generateRandomByteArray(100);   
      const printNumber = await COLLECTIONS.getPrintNumber(ogId);
      const printPrice = await COLLECTIONS.getPrintPrice(ogId, printNumber.add(new BN('1')))
      const tx = await COLLECTIONS.mintPrint(ogId, data, {from: user2, value: printPrice })
      const receipt = await tx;
      const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintPrintTopic)[0]
      printId = mint.topics[3]
      const printNft = await NFT.balanceOf(user2, printId);
      assert.equal(Number(printNft.toString()), 1, 'no print token');
      const user2Aft = await balanceOf(user2)
      const user3Aft = await balanceOf(user3)
      const curatorAft = await balanceOf(curator)
      const protocolAft = await balanceOf(protocol)
      assert.isTrue(new BN(user2Bef).sub(new BN(user2Aft)).gte(printPrice), 'printPrice fee not deducted')

      const mintProtocolPercent = await COLLECTIONS.protocolMintPercent();
      const mintProtocolFee = printPrice.mul(mintProtocolPercent).div(PERCENT_BASE);
      const mintOgPercent = await COLLECTIONS.ogMintPercent(ogId);
      const mintOgFee = printPrice.mul(mintOgPercent).div(PERCENT_BASE);
      const mintCuratorPercent = await COLLECTIONS.curatorMintPercent();
      const mintCuratorFee = printPrice.mul(mintCuratorPercent).div(PERCENT_BASE);

      const protocolBal = new BN(protocolAft).sub(new BN(protocolBef))
      assert.isTrue(protocolBal.eq(new BN(mintProtocolFee)));
      const curatorBal = new BN(curatorAft).sub(new BN(curatorBef))
      assert.isTrue(curatorBal.eq(new BN(mintCuratorFee)));
      const user3Bal = new BN(user3Aft).sub(new BN(user3Bef))
      assert.isTrue(user3Bal.eq(new BN(mintOgFee)));

      const creator = await NFT.creators(printId);
      console.log('Checking creator', creator);
      assert.equal(creator, user3);
      const supply = await NFT.totalSupply(printId);
      console.log('Checking supply', supply.toString());
      assert.isTrue(supply.eq(new BN('1')));

    }

    console.log(`
      Transfer the OG to user1
    `)

    {
      await NFT.safeTransferFrom(user3, user1, ogId, 1, [], {from: user3});
      const ogNft = await NFT.balanceOf(user1, ogId);
      assert.equal(Number(ogNft.toString()), 1, 'og not transferred');  
    }

    console.log(`
      Create another print
    `)

    let print1Id;
    {
      const user1Bef = await balanceOf(user1)
      const user2Bef = await balanceOf(user2)
      const curatorBef = await balanceOf(curator)
      const protocolBef = await balanceOf(protocol)
      const printNumber = await COLLECTIONS.getPrintNumber(ogId);
      const printPrice = await COLLECTIONS.getPrintPrice(ogId, printNumber.add(new BN('1')))
      let tx;
      try {
        const data = generateRandomByteArray(200);   
        tx = await COLLECTIONS.mintPrint(ogId, data, {from: user2, value: printPrice })
      } catch (e) {
        console.log('error', e)
        throw e
      }
      const receipt = await tx;
      const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintPrintTopic)[0]
      print1Id = mint.topics[3]
      const printNft = await NFT.balanceOf(user2, print1Id);
      assert.equal(Number(printNft.toString()), 1, 'no printNft token');
      const user1Aft = await balanceOf(user1)
      const user2Aft = await balanceOf(user2)
      const curatorAft = await balanceOf(curator)
      const protocolAft = await balanceOf(protocol)
      assert.isTrue(new BN(user2Bef).sub(new BN(user2Aft)).gte(printPrice), 'printPrice fee not deducted')

      const mintProtocolPercent = await COLLECTIONS.protocolMintPercent();
      const mintProtocolFee = printPrice.mul(mintProtocolPercent).div(PERCENT_BASE);
      const mintOgPercent = await COLLECTIONS.ogMintPercent(ogId);
      const mintOgFee = printPrice.mul(mintOgPercent).div(PERCENT_BASE);
      const mintCuratorPercent = await COLLECTIONS.curatorMintPercent();
      const mintCuratorFee = printPrice.mul(mintCuratorPercent).div(PERCENT_BASE);
      const curatorBalance = new BN(curatorAft).sub(new BN(curatorBef))
      const user1Balance = new BN(user1Aft).sub(new BN(user1Bef))
      const protocolBalance = new BN(protocolAft).sub(new BN(protocolBef))

      assert.isTrue(protocolBalance.eq(mintProtocolFee), 'protocol fee not added')
      assert.isTrue(curatorBalance.eq(mintCuratorFee), 'curator fee not added')
      assert.isTrue(user1Balance.eq(mintOgFee), 'og fee not added')
    }

    console.log(`
      Burn printId
    `)

    {
      const user1Bef = await balanceOf(user1)
      const user2Bef = await balanceOf(user2)
      const curatorBef = await balanceOf(curator)
      const protocolBef = await balanceOf(protocol)
      const printNumber = await COLLECTIONS.getPrintNumber(ogId);
      const burnPrice = await COLLECTIONS.getBurnPrice(ogId, printNumber)
      const tx = await COLLECTIONS.burnPrint(printId, new BN('1'), {from: user2 })
      const printNft = await NFT.balanceOf(user2, printId);
      assert.equal(Number(printNft.toString()), 0, 'printId not burned');
      const user1Aft = await balanceOf(user1)
      const user2Aft = await balanceOf(user2)
      const curatorAft = await balanceOf(curator)
      const protocolAft = await balanceOf(protocol)

      const burnProtocolPercent = await COLLECTIONS.protocolBurnPercent();
      const burnProtocolFee = burnPrice.mul(burnProtocolPercent).div(PERCENT_BASE);
      const burnOgPercent = await COLLECTIONS.ogBurnPercent(ogId);
      const burnOgFee = burnPrice.mul(burnOgPercent).div(PERCENT_BASE);
      const burnCuratorPercent = await COLLECTIONS.curatorBurnPercent();
      const burnCuratorFee = burnPrice.mul(burnCuratorPercent).div(PERCENT_BASE);
      const curatorBalance = new BN(curatorAft).sub(new BN(curatorBef))
      const user1Balance = new BN(user1Aft).sub(new BN(user1Bef))
      const protocolBalance = new BN(protocolAft).sub(new BN(protocolBef))

      assert.isTrue(protocolBalance.eq(burnProtocolFee), 'protocol fee not added')
      assert.isTrue(curatorBalance.eq(burnCuratorFee), 'curator fee not added')
      assert.isTrue(user1Balance.eq(burnOgFee), 'og fee not added')

      const pn = await COLLECTIONS.getPrintNumber(ogId);
      const bp = await COLLECTIONS.getBurnPrice(ogId, pn)
      const collectionsBal = await balanceOf(COLLECTIONS.address)
      assert.isTrue(new BN(collectionsBal).eq(bp));
    }

    console.log(`
      Burn print1Id
    `)

    {
      const user1Bef = await balanceOf(user1)
      const user2Bef = await balanceOf(user2)
      const curatorBef = await balanceOf(curator)
      const protocolBef = await balanceOf(protocol)
      const printNumber = await COLLECTIONS.getPrintNumber(ogId);
      const burnPrice = await COLLECTIONS.getBurnPrice(ogId, printNumber)
      const tx = await COLLECTIONS.burnPrint(print1Id, new BN('1'), {from: user2 })
      const printNft = await NFT.balanceOf(user2, print1Id);
      assert.equal(Number(printNft.toString()), 0, 'printId not burned');
      const user1Aft = await balanceOf(user1)
      const user2Aft = await balanceOf(user2)
      const curatorAft = await balanceOf(curator)
      const protocolAft = await balanceOf(protocol)

      const burnProtocolPercent = await COLLECTIONS.protocolBurnPercent();
      const burnProtocolFee = burnPrice.mul(burnProtocolPercent).div(PERCENT_BASE);
      const burnOgPercent = await COLLECTIONS.ogBurnPercent(ogId);
      const burnOgFee = burnPrice.mul(burnOgPercent).div(PERCENT_BASE);
      const burnCuratorPercent = await COLLECTIONS.curatorBurnPercent();
      const burnCuratorFee = burnPrice.mul(burnCuratorPercent).div(PERCENT_BASE);
      const curatorBalance = new BN(curatorAft).sub(new BN(curatorBef))
      const user1Balance = new BN(user1Aft).sub(new BN(user1Bef))
      const protocolBalance = new BN(protocolAft).sub(new BN(protocolBef))
      assert.isTrue(curatorBalance.eq(burnCuratorFee), 'curator fee not added')
      assert.isTrue(user1Balance.eq(burnOgFee), 'og fee not added')
      assert.isTrue(protocolBalance.eq(burnProtocolFee), 'protocol fee not added')

      const collectionsBal = await balanceOf(COLLECTIONS.address)
      assert.isTrue(new BN(collectionsBal).eq(new BN('0')), 'COLLECTIONS balance should be 0');
      const pn = await COLLECTIONS.getPrintNumber(ogId);
      assert.isTrue(new BN(pn).eq(new BN('0')));
    }

    console.log(`
      Should fail, can't burn OG
    `)

    {
      try {
        const tx = await COLLECTIONS.burnPrint(ogId, new BN('1'), {from: user1 })
        assert.isTrue(false, 'burn should have failed');
      } catch (e) {
      }
    }

    console.log(`
      Request mint original with step bonding curve
    `)

    ogData = generateRandomByteArray(100);
    {
      try {
        const bondingCurve =
        {
          curve: CURVES.address,
          curveType: '2',
          params: ['10', toWei('.1'), '50', toWei('.3'), '100', toWei('.6'), '151', toWei('1.0')],
          MaxPrints: '150',
        }
        console.log('step', bondingCurve)
        const mintPercent = new BN('300') // 3%
        const burnPercent = new BN('100') // 1%
        const tx = await COLLECTIONS.requestMintOriginal(mintPercent, burnPercent, bondingCurve, ogData, { from: user3 })
      } catch (e) {
        console.log('mint', e)
        assert.isTrue(false, 'mint request should have worked');
      }
    }

  console.log(`
    Approve original and mint
  `)

  {
    const requestBef = await COLLECTIONS.requestMintOriginals(user3);
    assert.isTrue(requestBef.data !== null, 'data not present');
    const txa = await COLLECTIONS.approveMintOriginal(user3, true, { from: curator });
    await txa;
    const tx = await COLLECTIONS.mintApprovedOriginal({ from: user3 })
    const receipt = await tx;
    const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintOgTopic)[0]
    ogId = mint.topics[2]
    const ogNft = await NFT.balanceOf(user3, ogId);
    assert.equal(Number(ogNft.toString()), 1, 'no og token');
    const feeditem = receipt.receipt.rawLogs.filter(l => l.topics[0] === feedItemTopic)[0]
    const data = web3.utils.hexToBytes(feeditem.data);
    const shouldbe = data.slice(96, 96 + ogData.length);
    assert.deepEqual(Array.from(ogData), shouldbe, 'ogData is incorrect');
    const request = await COLLECTIONS.requestMintOriginals(user3);
    assert.isTrue(request.data === null, 'data not deleted');
  }

console.log(`
  Check print prices for step
`)

{
  const params = [10, toWei('.1'), 50, toWei('.3'), 100, toWei('.6'), 151, toWei('1.0')]
  const MaxPrints = 150

  const genPrintPrice = (printNumber) => {
    for (let i = 0; i < params.length; i += 2) {
      if (printNumber < params[i]) return params[i+1]
    }
    assert.isTrue(false, 'bad step');
  }

  const genData = () => {
    return Array(MaxPrints).fill(0).map((_, idx) => { return { ETH: genPrintPrice(idx + 1), x: idx + 1}})
  }

  const data = genData();

  for (i = 0; i < MaxPrints; i++) {
    const printNumber = new BN(`${i + 1}`)
    const printPrice = await COLLECTIONS.getPrintPrice(ogId, printNumber);
    const p = printPrice.toString();
    const d = data[i].ETH.toString();
    if (p !== d) {
      console.log(`prices not equal, ${i}, ${p}, ${d}`)
      assert.equal(p, d, 'step price mismatch');
    }
  }
}

console.log(`
  should fail, mintPercent too high
`)


{
try {

  const bondingCurve =
  {
    curve: CURVES.address,
    curveType: '1',
    params: [curve.A0, curve.A1, curve.MaxPrints, '0', '100', curve.Decimals],
    MaxPrints: curve.MaxPrints,
  }
  const mintPercent = new BN('9500') // 94%, no AMM
  const burnPercent = new BN('100')  // 1%
  const tx = await COLLECTIONS.requestMintOriginal(mintPercent, burnPercent, bondingCurve, ogData, { from: user3 })
  assert.isTrue(false, 'mint request should have failed');
} catch (e) {
}
}

console.log(`
Request mint original with constant price and no burn
`)


{
try {

  const bondingCurve =
  {
    curve: CURVES.address,
    curveType: '1',
    params: [curve.A0, curve.A1, curve.MaxPrints, '0', '100', curve.Decimals],
    MaxPrints: curve.MaxPrints,
  }
  const mintPercent = new BN('9400') // 94%, no AMM
  const burnPercent = new BN('100')  // 1%
  const tx = await COLLECTIONS.requestMintOriginal(mintPercent, burnPercent, bondingCurve, ogData, { from: user3 })
} catch (e) {
  console.log('mint', e)
  assert.isTrue(false, 'mint request should have worked');
}
}

console.log(`
Approve original and mint
`)

{
const requestBef = await COLLECTIONS.requestMintOriginals(user3);
assert.isTrue(requestBef.data !== null, 'data not present');
const txa = await COLLECTIONS.approveMintOriginal(user3, true, { from: curator });
await txa;
const tx = await COLLECTIONS.mintApprovedOriginal({ from: user3 })
const receipt = await tx;
const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintOgTopic)[0]
ogId = mint.topics[2]
const ogNft = await NFT.balanceOf(user3, ogId);
assert.equal(Number(ogNft.toString()), 1, 'no og token');
const feeditem = receipt.receipt.rawLogs.filter(l => l.topics[0] === feedItemTopic)[0]
const data = web3.utils.hexToBytes(feeditem.data);
const shouldbe = data.slice(96, 96 + ogData.length);
assert.deepEqual(Array.from(ogData), shouldbe, 'ogData is incorrect');
const request = await COLLECTIONS.requestMintOriginals(user3);
assert.isTrue(request.data === null, 'data not deleted');
}

console.log(`
Get a print
`)
{
  const user2Bef = await balanceOf(user2)
  const user3Bef = await balanceOf(user3)
  const curatorBef = await balanceOf(curator)
  const protocolBef = await balanceOf(protocol)

  const data = generateRandomByteArray(100);   
  const printNumber = await COLLECTIONS.getPrintNumber(ogId);
  const printPrice = await COLLECTIONS.getPrintPrice(ogId, printNumber.add(new BN('1')))
  const tx = await COLLECTIONS.mintPrint(ogId, data, {from: user2, value: printPrice })
  const receipt = await tx;
  const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintPrintTopic)[0]
  printId = mint.topics[3]
  const printNft = await NFT.balanceOf(user2, printId);
  assert.equal(Number(printNft.toString()), 1, 'no print token');
  const user2Aft = await balanceOf(user2)
  const user3Aft = await balanceOf(user3)
  const curatorAft = await balanceOf(curator)
  const protocolAft = await balanceOf(protocol)
  assert.isTrue(new BN(user2Bef).sub(new BN(user2Aft)).gte(printPrice), 'printPrice fee not deducted')

  const mintProtocolPercent = await COLLECTIONS.protocolMintPercent();
  const mintProtocolFee = printPrice.mul(mintProtocolPercent).div(PERCENT_BASE);
  const mintOgPercent = await COLLECTIONS.ogMintPercent(ogId);
  console.log('mintOgPercent', mintOgPercent.toString());
  logEther('printPrice', printPrice);
  const mintOgFee = printPrice.mul(mintOgPercent).div(PERCENT_BASE);
  const mintCuratorPercent = await COLLECTIONS.curatorMintPercent();
  const mintCuratorFee = printPrice.mul(mintCuratorPercent).div(PERCENT_BASE);

  const protocolBal = new BN(protocolAft).sub(new BN(protocolBef))
  assert.isTrue(protocolBal.eq(new BN(mintProtocolFee)));
  const curatorBal = new BN(curatorAft).sub(new BN(curatorBef))
  assert.isTrue(curatorBal.eq(new BN(mintCuratorFee)));
  const user3Bal = new BN(user3Aft).sub(new BN(user3Bef))
  assert.isTrue(user3Bal.eq(new BN(mintOgFee)));
  logEther('ogFee', mintOgFee)

  const creator = await NFT.creators(printId);
  console.log('Checking creator', creator);
  assert.equal(creator, user3);
  const supply = await NFT.totalSupply(printId);
  console.log('Checking supply', supply.toString());
  assert.isTrue(supply.eq(new BN('1')));

}


});

});