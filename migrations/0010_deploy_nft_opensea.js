const IyusdiNftOpenSea = artifacts.require("IyusdiNftOpenSea");
const IyusdiCollectionsV3 = artifacts.require("IyusdiCollectionsV3");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
      const proxy = '0xa5409ec958c83c3f309868babaca7c86dcb077c1';
      const uri = 'https://iyusdi.design/api/metadata/{id}';
      const contractUri = 'https://iyusdi.design/api/metadata/contractV3';
      const collections = await IyusdiCollectionsV3.deployed()
      const operator = collections.address;
      const nft = await deployer.deploy(IyusdiNftOpenSea, operator, addrs.curator, uri, 'Generative', 'GEN', contractUri, proxy);
      console.log(`IyusdiNftOpenSea: '${nft.address}',`);
      console.log(`Curator: '${addrs.curator}',`);
      console.log(`Operator: '${operator}',`);
      await collections.setNft(nft.address);
  });
}
