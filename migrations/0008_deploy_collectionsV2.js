const IyusdiNftV2 = artifacts.require("IyusdiNftV2");
const IyusdiCollectionsV2 = artifacts.require("IyusdiCollectionsV2");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    const protocolMintPercent = '100' // 1%
    const protocolBurnPercent = '100' // 1%
    const curatorMintPercent =  '300' // 3%
    const curatorBurnPercent =  '100' // 1%
    const collections = await deployer.deploy(IyusdiCollectionsV2, addrs.protocol, protocolMintPercent, protocolBurnPercent, curatorMintPercent, curatorBurnPercent);
    console.log(`IyusdiCollections: '${collections.address}',`);
    console.log(`Protocol: '${addrs.protocol}',`);
    const nft = await IyusdiNftV2.deployed()
    await collections.setNft(nft.address);
  });
}
