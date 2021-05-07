const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const IyusdiNftV2 = artifacts.require("IyusdiNftV2");

const BN = require('bn.js');
const { assert } = require('chai');
const webcrypto = require('@peculiar/webcrypto');
const crypto = new webcrypto.Crypto()

contract("IyusdiNftV2 Test", async accounts => {

  let NFT;
  let curator = accounts[0];
  let user1 = accounts[1];
  let user2 = accounts[2];

  const TIME_12H = 60 * 60 * 12;
  const TIME_1H = 60 * 60
  const TIME_1D = TIME_1H * 24

  const generateRandomByteArray = (len) => {
    const arr = new Uint8Array(len)
    crypto.getRandomValues(arr)
    return arr
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

  beforeEach(async () => {
    CURATOR_ID = new BN('8000000000000000000000000000000000000000000000000000000000000000', 16)
    NFT = await IyusdiNftV2.deployed();
    console.log('NFT', NFT.address);
  });
  
  it("IyusdiNft Tests", async () => {
    
    console.log(`
      Check curator 
    `)

    const curatorNft = await NFT.balanceOf(curator, CURATOR_ID);
    assert.equal(Number(curatorNft.toString()), 1, 'no curator token');

    console.log(`
      Make an original
    `)

    let ogId;
    {
      const data = generateRandomByteArray(50)
      const tx = await NFT.mintOriginal(user1, user1, data, { from: curator})
      const receipt = await tx;
      const mint = receipt.logs.filter(l => l.event === 'OriginalMinted')[0]
      ogId = mint.args.id;
      const ogNft = await NFT.balanceOf(user1, ogId);
      assert.equal(Number(ogNft.toString()), 1, 'no og token');
      assert.equal(mint.args.owner, user1, 'invalid user');
      assert.equal(mint.args.creator, user1, 'invalid creator');
      const feedItem = receipt.logs.filter(l => l.event === 'FeedItem')[0]
      assert.equal(feedItem.args.ipfsHash, ipfsHash, '!ipfsHash')
    }

    console.log(`
      Mint a print
    `)

    let printId;
    {
      const data = generateRandomByteArray(50)
      const tx = await NFT.mintPrint(ogId, user2, data, { from: user1})
      const receipt = await tx;
      const mint = receipt.logs.filter(l => l.event === 'PrintMinted')[0]
      printId = mint.args.id;
      const prints = await NFT.balanceOf(user2, printId);
      assert.equal(Number(prints.toString()), 1, 'no print token');
      assert.equal(mint.args.owner, user2, '!printOwner');
      assert.isTrue(mint.args.og.eq(ogId), 'invalid ogId');
      const feedItem = receipt.logs.filter(l => l.event === 'FeedItem')[0]
      assert.equal(feedItem.args.ipfsHash, ipfsHash, '!ipfsHash')
    }

    console.log(`
      Post to og
    `)

    {
      const data = generateRandomByteArray(50)
      const tx = await NFT.post(ogId, 0, data, { from: user1})
      const receipt = await tx;
      const feedItem = receipt.logs.filter(l => l.event === 'FeedItem')[0]
      assert.equal(feedItem.args.ipfsHash, ipfsHash, '!ipfsHash')
      assert.isTrue(feedItem.args.id.eq(ogId), '!ogId')
    }

    console.log(`
      Post to print
    `)

    {
      const data = generateRandomByteArray(50)
      const tx = await NFT.post(printId, 0, data, { from: user1})
      const receipt = await tx;
      const feedItem = receipt.logs.filter(l => l.event === 'FeedItem')[0]
      assert.equal(feedItem.args.ipfsHash, ipfsHash, '!ipfsHash')
      assert.isTrue(feedItem.args.id.eq(printId), '!printId')
    }

    console.log(`
      Post to print - fail from wrong user
    `)

    {
      try {
        const data = generateRandomByteArray(50)
        const tx = await NFT.post(printId, 0, data, { from: user2})
        assert.isTrue(false, 'post to print from user should have failed')
      } catch (e) {
      }
    }
  });

});
