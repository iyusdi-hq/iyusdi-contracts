const IyusdiNftV2 = artifacts.require("IyusdiNftV2");
const IyusdiCollections = artifacts.require("IyusdiCollections");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
      const uri = 'https://iyusdi.design/api/metadata/{id}';
      const collections = await IyusdiCollections.deployed()
      const operator = collections.address;
      const nft = await deployer.deploy(IyusdiNftV2, operator, addrs.curator, uri);
      console.log(`IyusdiNftV2: '${nft.address}',`);
      console.log(`Curator: '${addrs.curator}',`);
      console.log(`Operator: '${operator}',`);
      await collections.setNft(nft.address);
  });
}
