const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const IyusdiNft = artifacts.require("IyusdiNft");
const IyusdiNewsletters = artifacts.require("IyusdiNewsletters");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    const newsletterFee =       '50000000000000000' // .05 ether
    const subscriptionMinFee =  '25000000000000000' // .025 ether
    const subscriptionPercent = '1000'              // 10%
    const postFee             = '0'                 // 0
    const newsletters = await deployProxy(IyusdiNewsletters, [newsletterFee, subscriptionMinFee, subscriptionPercent, postFee], { deployer });
    console.log(`IyusdiNewsletters: '${newsletters.address}',`);

    const operator = newsletters.address; // '0x0000000000000000000000000000000000000000' for testing 000_TestIyusdiNft.js
    const uri = 'https://iyusdi.design/api/metadata/{id}';
    const nft = await deployProxy(IyusdiNft, [operator, addrs.curator, uri], { deployer });
    console.log(`IyusdiNft: '${nft.address}',`);
    await newsletters.setNft(nft.address);
  });
}
