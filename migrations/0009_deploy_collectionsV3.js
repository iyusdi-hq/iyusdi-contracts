const IyusdiCollectionsV3 = artifacts.require("IyusdiCollectionsV3");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    const protocolMintPercent = '200' // 2%
    const protocolBurnPercent = '100' // 1%
    const curatorMintPercent =  '400' // 4%
    const curatorBurnPercent =  '100' // 1%
    const collections = await deployer.deploy(IyusdiCollectionsV3, addrs.protocol, protocolMintPercent, protocolBurnPercent, curatorMintPercent, curatorBurnPercent);
    console.log(`IyusdiCollectionsV3: '${collections.address}',`);
    console.log(`Protocol: '${addrs.protocol}',`);
  });
}
