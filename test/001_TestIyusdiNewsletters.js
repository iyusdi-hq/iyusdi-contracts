const IyusdiNft = artifacts.require("IyusdiNft");
const IyusdiNewsletters = artifacts.require("IyusdiNewsletters");

const BN = require('bn.js');
const { assert } = require('chai');

contract("IyusdiNft Test", async accounts => {

  let NFT;
  let NEWSLETTERS;
  let curator = accounts[0];
  let user1 = accounts[1];
  let user2 = accounts[2];

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

  let feedItemTopic = '0x9ff2fa65748ddcedc4a09368c01a9be38c97b6ff368770a6cddabe1602a4c588'
  let mintOgTopic = '0x2e92808eb6a505e86ea06fd249045e6f64ca1eded93fd102ae273a11d7977cca'
  let mintPrintTopic = '0x78117db0a44e18b1d42102beef6061f83efef17a59f7c622628c7e841913ea2d'

  beforeEach(async () => {
    CURATOR_ID = new BN('8000000000000000000000000000000000000000000000000000000000000000', 16)
    NFT = await IyusdiNft.deployed();
    NEWSLETTERS = await IyusdiNewsletters.deployed();
    console.log('NEWSLETTERS', NEWSLETTERS.address);
  });
  
  const subscriptionMinFee = new BN('25000000000000000') // .025 ether
  const newsletterFee = new BN('50000000000000000') // .05 ether

  it("IyusdiNewsletter Tests", async () => {
    
    console.log(`
      Make a newsletter
    `)


    let ogId;
    let subscriptionFee = new BN('100000000000000000') // .1 ether
    {
      const user1Bef = await balanceOf(user1)
      const curatorBef = await balanceOf(curator)
      const ipfsHash = 'ipfshash'
      const tx = await NEWSLETTERS.createNewsletter(subscriptionFee, ipfsHash, { from: user1, value: newsletterFee })
      const receipt = await tx;
      const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintOgTopic)[0]
      ogId = mint.topics[2]
      const ogNft = await NFT.balanceOf(user1, ogId);
      assert.equal(Number(ogNft.toString()), 1, 'no newsletter token');
      const user1Aft = await balanceOf(user1)
      const curatorAft = await balanceOf(curator)
      assert.isTrue(new BN(user1Bef).sub(new BN(user1Aft)).gte(newsletterFee), 'fee not deducted')
      assert.isTrue(new BN(curatorAft).sub(new BN(curatorBef)).eq(newsletterFee), 'fee not added')
    }

    console.log(`
      Subscribe to newsletter
    `)

    let printId;
    {
      const user1Bef = await balanceOf(user1)
      const user2Bef = await balanceOf(user2)
      const curatorBef = await balanceOf(curator)
      const ipfsHash = 'ipfshash'
      const tx = await NEWSLETTERS.createSubscription(ogId, ipfsHash, {from: user2, value: subscriptionFee })
      const receipt = await tx;
      const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintPrintTopic)[0]
      printId = mint.topics[3]
      const printNft = await NFT.balanceOf(user2, printId);
      assert.equal(Number(printNft.toString()), 1, 'no subscription token');
      const user1Aft = await balanceOf(user1)
      const user2Aft = await balanceOf(user2)
      const curatorAft = await balanceOf(curator)
      assert.isTrue(new BN(user2Bef).sub(new BN(user2Aft)).gte(subscriptionFee), 'subscription fee not deducted')
      assert.isTrue(new BN(curatorAft).sub(new BN(curatorBef)).eq(subscriptionMinFee), 'curtor fee not added')
      assert.isTrue(new BN(user1Aft).sub(new BN(user1Bef)).eq(subscriptionFee.sub(subscriptionMinFee)), 'subscription fee not added')
    }

    console.log(`
      Post to newsletter
    `)

    {
      const ipfsHash = 'ipfshash-post'
      const tx = await NEWSLETTERS.post(ogId, 0, ipfsHash, { from: user1})
      const receipt = await tx;
      // console.log('postReceipt', receipt.receipt.rawLogs)
      assert.isTrue(true, 'should be true')
    }

    console.log(`
      Another newsletter with different pricing
    `)

    subscriptionFee = new BN('1000000000000000000') // 1 ether
    {
      const user1Bef = await balanceOf(user1)
      const curatorBef = await balanceOf(curator)
      const ipfsHash = 'ipfshash'
      const tx = await NEWSLETTERS.createNewsletter(subscriptionFee, ipfsHash, { from: user1, value: newsletterFee })
      const receipt = await tx;
      const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintOgTopic)[0]
      ogId = mint.topics[2]
      const ogNft = await NFT.balanceOf(user1, ogId);
      assert.equal(Number(ogNft.toString()), 1, 'no newsletter token');
      const user1Aft = await balanceOf(user1)
      const curatorAft = await balanceOf(curator)
      assert.isTrue(new BN(user1Bef).sub(new BN(user1Aft)).gte(newsletterFee), 'newsletter fee not deducted')
      assert.isTrue(new BN(curatorAft).sub(new BN(curatorBef)).eq(newsletterFee), 'newsletter fee not added')
    }
    console.log(`
      Subscribe to new newsletter
    `)

    {
      const user1Bef = await balanceOf(user1)
      const user2Bef = await balanceOf(user2)
      const curatorBef = await balanceOf(curator)
      const ipfsHash = 'ipfshash'
      const tx = await NEWSLETTERS.createSubscription(ogId, ipfsHash, {from: user2, value: subscriptionFee })
      const receipt = await tx;
      const mint = receipt.receipt.rawLogs.filter(l => l.topics[0] === mintPrintTopic)[0]
      printId = mint.topics[3]
      const printNft = await NFT.balanceOf(user2, printId);
      assert.equal(Number(printNft.toString()), 1, 'no subscription token');
      const user1Aft = await balanceOf(user1)
      const user2Aft = await balanceOf(user2)
      const curatorAft = await balanceOf(curator)
      const subscriptionPercent = new BN('100000000000000000') // .1 either
      assert.isTrue(new BN(user2Bef).sub(new BN(user2Aft)).gte(subscriptionFee), 'subscription fee not deducted')
      assert.isTrue(new BN(curatorAft).sub(new BN(curatorBef)).eq(subscriptionPercent), 'curtor fee not added')
      assert.isTrue(new BN(user1Aft).sub(new BN(user1Bef)).eq(subscriptionFee.sub(subscriptionPercent)), 'subscription fee not added')
    }


  });

});