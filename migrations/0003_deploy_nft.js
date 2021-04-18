const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const IyusdiNft = artifacts.require("IyusdiNft");
const IyusdiNewsletters = artifacts.require("IyusdiNewsletters");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    const newsletters = await IyusdiNewsletters.deployed()
    const operator = newsletters.address; // '0x0000000000000000000000000000000000000000' for testing 000_TestIyusdiNft.js
    const uri = 'https://iyusdi.design/api/metadata/{id}';
    const nft = await deployProxy(IyusdiNft, [operator, addrs.curator, uri], { deployer });
    console.log(`IyusdiNft: '${nft.address}',`);
    await newsletters.setNft(nft.address);
  });
}
