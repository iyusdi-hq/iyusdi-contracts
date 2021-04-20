const IyusdiNewsletters = artifacts.require("IyusdiNewsletters");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    const newsletterFee =       '50000000000000000' // .05 ether
    const subscriptionMinFee =  '25000000000000000' // .025 ether
    const subscriptionPercent = '1000'              // 10%
    const postFee             = '0'                 // 0
    const newsletters = await deployer.deploy(IyusdiNewsletters, newsletterFee, subscriptionMinFee, subscriptionPercent, postFee);
    console.log(`IyusdiNewsletters: '${newsletters.address}',`);
  });
}
